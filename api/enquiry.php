<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['success'=>false]); exit; }
$data=str_contains($_SERVER['CONTENT_TYPE'] ?? '','multipart/form-data')?$_POST:(json_decode(file_get_contents('php://input'),true) ?: []);
if (($data['kind'] ?? '')==='contact') {
    foreach (['name','phone','message'] as $key) if (!isset($data[$key]) || !is_string($data[$key]) || !trim($data[$key])) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Enter your name, phone and message.']); exit; }
    $name=trim($data['name']); $phone=trim($data['phone']); $email=trim($data['email'] ?? '');
    if (strlen($name)>200 || strlen($data['message'])>5000 || strlen($data['subject'] ?? '')>200 || !preg_match('/^[+\d ()-]{7,25}$/D',$phone) || ($email!=='' && !filter_var($email,FILTER_VALIDATE_EMAIL))) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Check your contact details and message length.']); exit; }
    try {
        $pdo->prepare('INSERT INTO enquiries(name,phone,email,details) VALUES(?,?,?,?)')->execute([$name,$phone,$email,json_encode($data,JSON_UNESCAPED_UNICODE)]);
        echo json_encode(['success'=>true,'message'=>'Message saved.','id'=>(int)$pdo->lastInsertId()]);
    } catch(Throwable $e) { error_log($e->getMessage()); http_response_code(500); echo json_encode(['success'=>false,'message'=>'Unable to save message. Please try again.']); }
    exit;
}
foreach (['name','phone','state','city','email','course','mode','paymentMethod','clientType'] as $key) {
    if (!isset($data[$key]) || !is_string($data[$key]) || !trim($data[$key]) || strlen($data[$key])>200) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Please complete all fields.']); exit; }
    $data[$key]=trim($data[$key]);
}
if (!filter_var($data['email'],FILTER_VALIDATE_EMAIL) || !preg_match('/^[+\d ()-]{7,25}$/D',$data['phone'])) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Enter a valid email and phone number.']); exit; }
try {
    if (!in_array($data['paymentMethod'],['Cash','Offline','UPI','Bank Transfer','International Bank Transfer','PayPal'],true)) throw new RuntimeException('Invalid payment method.');
    unset($data['paymentProof'],$data['paymentStatus']);
    $data['paymentStatus']=$data['paymentMethod'].' selected - payment pending';
    if (!in_array($data['paymentMethod'],['Cash','Offline'],true)) {
        $file=$_FILES['paymentProof'] ?? null;
        if (!$file || $file['error']!==UPLOAD_ERR_OK || $file['size']>2*1024*1024) {http_response_code(400);echo json_encode(['success'=>false,'message'=>'Attach a payment screenshot up to 2 MB.']);exit;}
        $mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);$types=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
        if (!isset($types[$mime]) || !getimagesize($file['tmp_name'])) {http_response_code(400);echo json_encode(['success'=>false,'message'=>'Use a valid JPG, PNG or WebP screenshot.']);exit;}
        $dir=__DIR__.'/../uploads/payment-proofs';if (!is_dir($dir) && !mkdir($dir,0700,true))throw new RuntimeException('Storage unavailable.');
        $proofName=bin2hex(random_bytes(16)).'.'.$types[$mime];$proofPath=$dir.'/'.$proofName;
        if (!move_uploaded_file($file['tmp_name'],$proofPath))throw new RuntimeException('Upload failed.');
        $data['paymentProof']=$proofName;$data['paymentStatus']='Screenshot submitted - verification pending';
    }
    $pdo->prepare('INSERT INTO enquiries(name,phone,email,details) VALUES(?,?,?,?)')->execute([$data['name'],$data['phone'],$data['email'],json_encode($data,JSON_UNESCAPED_UNICODE)]);
    echo json_encode(['success'=>true,'message'=>'Enquiry saved.','id'=>(int)$pdo->lastInsertId()]);
} catch(Throwable $e) { if(isset($proofPath) && is_file($proofPath))unlink($proofPath);error_log($e->getMessage()); http_response_code(500); echo json_encode(['success'=>false,'message'=>'Unable to save enquiry. Please try again.']); }
