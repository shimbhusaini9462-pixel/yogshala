<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
header('Content-Type: application/json');
header('Cache-Control: no-store');
require_once __DIR__.'/../config.php';
require_once __DIR__.'/fee-calculator.php';
function manualReply($body,$status=200) {http_response_code($status);echo json_encode($body);exit;}
$role=$_SESSION['role'] ?? '';$id=(int)($_SESSION['user_id'] ?? 0);
if (!$id || !in_array($role,['admin','student'],true)) manualReply(['success'=>false,'message'=>'Please log in as a student or admin.'],401);
$action=$_GET['action'] ?? 'list';
$plans=[];$catalog=feeCatalog();
foreach($catalog['online']['plans'] as $n=>$plan) $plans[]=['id'=>$n,'name'=>$plan['course'],'months'=>$plan['months'],'amount'=>(int)round($catalog['packages']['onlinePlan']['Indian'][$plan['course']]*100)];
try {
    if ($_SERVER['REQUEST_METHOD']==='GET' && $action==='list') {
        $sql='SELECT m.id,m.student_id,m.plan_name,m.amount,m.transaction_id,m.proof_file,m.status,m.review_note,m.created_at,s.name AS student_name,s.email FROM manual_payments m JOIN students s ON s.id=m.student_id';
        $q=$pdo->prepare($sql.($role==='student'?' WHERE m.student_id=?':'').' ORDER BY m.id DESC LIMIT 100');$q->execute($role==='student'?[$id]:[]);
        manualReply(['success'=>true,'plans'=>$plans,'requests'=>$q->fetchAll(),'qr'=>'QR code.jpeg']);
    }
    if ($_SERVER['REQUEST_METHOD']!=='POST') manualReply(['success'=>false,'message'=>'POST required.'],405);
    $data=str_contains($_SERVER['CONTENT_TYPE'] ?? '','multipart/form-data')?$_POST:(json_decode(file_get_contents('php://input'),true) ?: []);
    if (!is_string($data['token'] ?? null) || empty($_SESSION['portal_token']) || !hash_equals($_SESSION['portal_token'],$data['token'])) manualReply(['success'=>false,'message'=>'Refresh and try again.'],403);
    if ($action==='submit' && $role==='student') {
        $planId=filter_var($data['plan'] ?? null,FILTER_VALIDATE_INT);
        $txn=is_string($data['transaction_id'] ?? null)?strtoupper(trim($data['transaction_id'])):'';
        if ($planId===false || !isset($plans[$planId]) || !preg_match('/^[A-Z0-9]{10,40}$/D',$txn)) manualReply(['success'=>false,'message'=>'Choose a plan and enter the 10-40 character UPI transaction reference / UTR.'],400);
        $upload=$_FILES['proof'] ?? null;
        if (!$upload || $upload['error']!==UPLOAD_ERR_OK || $upload['size']>2*1024*1024 || !is_uploaded_file($upload['tmp_name'])) manualReply(['success'=>false,'message'=>'Upload a JPG, PNG or WebP screenshot, maximum 2 MB.'],400);
        $mime=(new finfo(FILEINFO_MIME_TYPE))->file($upload['tmp_name']);$extensions=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
        $size=@getimagesize($upload['tmp_name']);
        if (!isset($extensions[$mime]) || !$size || $size[0]>12000 || $size[1]>12000) manualReply(['success'=>false,'message'=>'Upload a valid JPG, PNG or WebP image.'],400);
        $pdo->beginTransaction();
        $q=$pdo->prepare('SELECT id FROM students WHERE id=? FOR UPDATE');$q->execute([$id]);
        if (!$q->fetch()) {$pdo->rollBack();manualReply(['success'=>false,'message'=>'Student account unavailable.'],401);}
        $q=$pdo->prepare("SELECT id FROM manual_payments WHERE student_id=? AND status='pending'");$q->execute([$id]);
        if ($q->fetch()) {$pdo->rollBack();manualReply(['success'=>false,'message'=>'Your payment is already awaiting review. Do not pay again.'],409);}
        $dir=__DIR__.'/../uploads/payment-proofs';
        if (!is_dir($dir) && !mkdir($dir,0700,true)) throw new RuntimeException('Proof storage unavailable.');
        $file=bin2hex(random_bytes(16)).'.'.$extensions[$mime];$plan=$plans[$planId];
        if (!move_uploaded_file($upload['tmp_name'],$dir.'/'.$file)) throw new RuntimeException('Proof upload failed.');
        try {$pdo->prepare('INSERT INTO manual_payments(student_id,plan_name,amount,months,transaction_id,proof_file) VALUES(?,?,?,?,?,?)')->execute([$id,$plan['name'],$plan['amount'],$plan['months'],$txn,$file]);}
        catch(Throwable $e) {unlink($dir.'/'.$file);throw $e;}
        $pdo->commit();
        manualReply(['success'=>true,'message'=>'Payment proof submitted. Membership will activate after admin verification. Do not pay again while review is pending.']);
    }
    if ($action==='review' && $role==='admin') {
        $requestId=filter_var($data['id'] ?? null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);$decision=$data['decision'] ?? '';
        $note=is_string($data['note'] ?? null)?trim($data['note']):'';
        if (!$requestId || !in_array($decision,['approved','rejected'],true) || strlen($note)>500 || ($decision==='approved' && ($data['checked'] ?? '')!=='yes') || ($decision==='rejected' && !$note)) manualReply(['success'=>false,'message'=>'Confirm the bank transaction before approval, or give a reason for rejection.'],400);
        $pdo->beginTransaction();
        // Lock the student first, matching online renewals, then the request.
        $q=$pdo->prepare('SELECT student_id FROM manual_payments WHERE id=?');$q->execute([$requestId]);$student=$q->fetchColumn();
        if (!$student) {$pdo->rollBack();manualReply(['success'=>false,'message'=>'Payment request not found.'],404);}
        $q=$pdo->prepare('SELECT id FROM students WHERE id=? FOR UPDATE');$q->execute([$student]);
        $q=$pdo->prepare('SELECT * FROM manual_payments WHERE id=? FOR UPDATE');$q->execute([$requestId]);$request=$q->fetch();
        if ($request['status']!=='pending') {$pdo->rollBack();manualReply(['success'=>false,'message'=>'This request has already been reviewed.'],409);}
        if ($decision==='approved') {
            $q=$pdo->prepare('SELECT MAX(expiry_date) FROM payments WHERE student_id=?');$q->execute([$student]);
            $date=new DateTimeImmutable(max(date('Y-m-d'),$q->fetchColumn() ?: date('Y-m-d')));
            $target=$date->modify('first day of this month')->modify('+'.(int)$request['months'].' months');
            $expiry=$target->setDate((int)$target->format('Y'),(int)$target->format('m'),min((int)$date->format('d'),(int)$target->format('t')))->format('Y-m-d');
            $pdo->prepare('INSERT INTO payments(student_id,amount,expiry_date) VALUES(?,?,?)')->execute([$student,$request['amount']/100,$expiry]);
            $pdo->prepare("UPDATE students SET subscription_status='active' WHERE id=?")->execute([$student]);
        }
        $pdo->prepare('UPDATE manual_payments SET status=?,review_note=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$decision,$note,$id,$requestId]);
        $pdo->commit();manualReply(['success'=>true,'message'=>$decision==='approved'?'Payment approved. Membership activated.':'Payment request rejected with your note.']);
    }
    manualReply(['success'=>false,'message'=>'Action not allowed.'],403);
} catch(Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Manual payment: '.$e->getMessage());
    $duplicate=$e instanceof PDOException && in_array($e->getCode(),['23000','23505'],true);
    manualReply(['success'=>false,'message'=>$duplicate?'This transaction reference has already been submitted. Contact Yogshala if you need help.':'Unable to process the payment request. Try refreshing or contact Yogshala; do not pay again.'],$duplicate?409:503);
}
