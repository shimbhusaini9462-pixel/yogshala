<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
header('Content-Type: application/json');
header('Cache-Control: no-store');
require_once __DIR__.'/../config.php';
require_once __DIR__.'/fee-calculator.php';
function paymentReply($data,$status=200) { http_response_code($status); echo json_encode($data); exit; }
if (($_SESSION['role'] ?? '')!=='student' || empty($_SESSION['user_id'])) paymentReply(['success'=>false,'message'=>'Please log in as a student.'],401);
$id=(int)$_SESSION['user_id'];
$action=$_GET['action'] ?? 'plans';
$catalog=feeCatalog();
$plans=[];
foreach ($catalog['online']['plans'] as $index=>$plan) $plans[]=['id'=>$index,'name'=>$plan['course'],'months'=>$plan['months'],'amount'=>(int)round($catalog['packages']['onlinePlan']['Indian'][$plan['course']]*100)];
if ($action==='plans' && $_SERVER['REQUEST_METHOD']==='GET') paymentReply(['success'=>true,'plans'=>$plans]);
if ($_SERVER['REQUEST_METHOD']!=='POST') paymentReply(['success'=>false,'message'=>'POST required.'],405);
$data=json_decode(file_get_contents('php://input'),true);
if (!is_array($data) || !is_string($data['token'] ?? null) || empty($_SESSION['portal_token']) || !hash_equals($_SESSION['portal_token'],$data['token'])) paymentReply(['success'=>false,'message'=>'Refresh and try again.'],403);
$localConfigPath=__DIR__.'/../database/razorpay-config.php';
$localConfig=is_file($localConfigPath) ? require $localConfigPath : [];
$key=getenv('RAZORPAY_KEY_ID') ?: ($localConfig['key_id'] ?? 'rzp_test_TuqJfT2q6hzLES');
$secret=getenv('RAZORPAY_KEY_SECRET') ?: ($localConfig['key_secret'] ?? '');
if (!$key || !$secret) paymentReply(['success'=>false,'message'=>'Online payment is not configured yet. Please contact Yogshala.'],503);
function razorpayRequest($path,$body=null) {
    global $key,$secret;
    if (!function_exists('curl_init')) throw new RuntimeException('PHP cURL is required.');
    $ch=curl_init('https://api.razorpay.com/v1/'.$path);
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_USERPWD=>$key.':'.$secret,CURLOPT_TIMEOUT=>25,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_HTTPHEADER=>['Content-Type: application/json']]);
    if ($body!==null) curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode($body)]);
    $raw=curl_exec($ch); $status=curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);
    $result=is_string($raw)?json_decode($raw,true):null;
    if ($status<200 || $status>=300 || !is_array($result)) throw new RuntimeException('Payment provider unavailable.');
    return $result;
}
try {
    if ($action==='create') {
        $planId=$data['plan'] ?? null;
        if (!is_int($planId) || !isset($plans[$planId])) paymentReply(['success'=>false,'message'=>'Select a valid plan.'],400);
        $plan=$plans[$planId];
        $order=razorpayRequest('orders',['amount'=>$plan['amount'],'currency'=>'INR','receipt'=>'ys_'.$id.'_'.bin2hex(random_bytes(8))]);
        $pdo->prepare('INSERT INTO razorpay_orders(order_id,student_id,amount,months) VALUES(?,?,?,?)')->execute([$order['id'],$id,$plan['amount'],$plan['months']]);
        $q=$pdo->prepare('SELECT name,email FROM students WHERE id=?');$q->execute([$id]);
        paymentReply(['success'=>true,'key'=>$key,'order_id'=>$order['id'],'amount'=>$plan['amount'],'currency'=>'INR','description'=>$plan['name'],'prefill'=>$q->fetch()]);
    }
    if ($action!=='verify') paymentReply(['success'=>false,'message'=>'Unknown action.'],400);
    foreach (['razorpay_order_id','razorpay_payment_id','razorpay_signature'] as $field) if (!is_string($data[$field] ?? null) || strlen($data[$field])>128) paymentReply(['success'=>false,'message'=>'Invalid payment response.'],400);
    $q=$pdo->prepare('SELECT * FROM razorpay_orders WHERE order_id=? AND student_id=?');$q->execute([$data['razorpay_order_id'],$id]);$order=$q->fetch();
    if (!$order || !hash_equals(hash_hmac('sha256',$order['order_id'].'|'.$data['razorpay_payment_id'],$secret),$data['razorpay_signature'])) paymentReply(['success'=>false,'message'=>'Payment verification failed.'],400);
    $payment=razorpayRequest('payments/'.rawurlencode($data['razorpay_payment_id']));
    if (($payment['status'] ?? '')!=='captured' || ($payment['order_id'] ?? '')!==$order['order_id'] || (int)($payment['amount'] ?? 0)!==(int)$order['amount'] || ($payment['currency'] ?? '')!=='INR') paymentReply(['success'=>false,'message'=>'Payment capture is pending. Use Check payment again shortly.'],409);
    $pdo->beginTransaction();
    // Lock the student to serialize renewals across separate orders as well.
    $q=$pdo->prepare('SELECT id FROM students WHERE id=? FOR UPDATE');$q->execute([$id]);
    $q=$pdo->prepare('SELECT payment_id FROM razorpay_orders WHERE order_id=? FOR UPDATE');$q->execute([$order['order_id']]);
    if (!$q->fetchColumn()) {
        $q=$pdo->prepare('SELECT MAX(expiry_date) FROM payments WHERE student_id=?');$q->execute([$id]);$previous=$q->fetchColumn();
        $start=max(date('Y-m-d'),$previous ?: date('Y-m-d'));
        $date=new DateTimeImmutable($start);
        $target=$date->modify('first day of this month')->modify('+'.(int)$order['months'].' months');
        $expiry=$target->setDate((int)$target->format('Y'),(int)$target->format('m'),min((int)$date->format('d'),(int)$target->format('t')))->format('Y-m-d');
        $pdo->prepare('INSERT INTO payments(student_id,amount,expiry_date) VALUES(?,?,?)')->execute([$id,$order['amount']/100,$expiry]);
        $pdo->prepare("UPDATE students SET subscription_status='active' WHERE id=?")->execute([$id]);
        $pdo->prepare('UPDATE razorpay_orders SET payment_id=? WHERE order_id=?')->execute([$data['razorpay_payment_id'],$order['order_id']]);
    }
    $pdo->commit();
    paymentReply(['success'=>true,'message'=>'Payment verified. Your membership is active.']);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Razorpay: '.$e->getMessage());
    paymentReply(['success'=>false,'message'=>'Unable to confirm payment. If money was debited, use Check payment again; do not pay again.'],502);
}
