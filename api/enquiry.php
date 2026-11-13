<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
header('Content-Type: application/json');
header('Cache-Control: no-store');
require_once __DIR__ . '/../config.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['success'=>false]); exit; }
$data=str_contains($_SERVER['CONTENT_TYPE'] ?? '','multipart/form-data')?$_POST:(json_decode(file_get_contents('php://input'),true) ?: []);
if (($_GET['action'] ?? '')==='verify') {
    // Existing payment records can still be verified; new enquiries never charge.
    require_once __DIR__.'/enquiry-payment.php';
    try { verifyEnquiryPayment($pdo,$data); }
    catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('Enquiry payment: '.$e->getMessage());http_response_code(502);
        echo json_encode(['success'=>false,'message'=>'Unable to confirm payment. Use Check payment again if money was debited.']);
    }
    exit;
}
if (($data['kind'] ?? '')==='contact') {
    foreach (['name','phone','message'] as $key) if (!isset($data[$key]) || !is_string($data[$key]) || !trim($data[$key])) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Enter your name, phone and message.']); exit; }
    $name=trim($data['name']); $phone=trim($data['phone']); $email=trim($data['email'] ?? '');
    if (strlen($name)>200 || strlen($data['message'])>5000 || strlen($data['subject'] ?? '')>200 || !preg_match('/^[+\d ()-]{7,25}$/D',$phone) || ($email!=='' && !filter_var($email,FILTER_VALIDATE_EMAIL))) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Check your contact details and message length.']); exit; }
    try {
        $pdo->prepare('INSERT INTO enquiries(name,phone,email,details) VALUES(?,?,?,?)')->execute([$name,$phone,$email,json_encode($data,JSON_UNESCAPED_UNICODE)]);
        echo json_encode(['success'=>true,'message'=>'Message saved.','id'=>(int)databaseInsertId($pdo,'enquiries')]);
    } catch(Throwable $e) { error_log($e->getMessage()); http_response_code(500); echo json_encode(['success'=>false,'message'=>'Unable to save message. Please try again.']); }
    exit;
}
foreach (['name','phone','state','city','email','course','mode','clientType'] as $key) {
    if (!isset($data[$key]) || !is_string($data[$key]) || !trim($data[$key]) || strlen($data[$key])>200) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Please complete all fields.']); exit; }
    $data[$key]=trim($data[$key]);
}
if (!filter_var($data['email'],FILTER_VALIDATE_EMAIL) || !preg_match('/^[+\d ()-]{7,25}$/D',$data['phone'])) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Enter a valid email and phone number.']); exit; }
require_once __DIR__.'/fee-calculator.php';
try {
    $quote=calculateEnquiryFee($data);
    // Keep only enquiry fields. Client payment claims never confer paid status.
    $fields=['name','phone','state','city','email','course','mode','clientType','packageType','participants'];
    $data=array_merge(array_intersect_key($data,array_flip($fields)),$quote);
    $data['paymentStatus']='Not collected';
    $data['enquiryStatus']='New enquiry';
} catch (InvalidArgumentException $e) { http_response_code(400); echo json_encode(['success'=>false,'message'=>$e->getMessage()]); exit; }
try {
    $pdo->prepare('INSERT INTO enquiries(name,phone,email,details) VALUES(?,?,?,?)')->execute([$data['name'],$data['phone'],$data['email'],json_encode($data,JSON_UNESCAPED_UNICODE)]);
    $id=(int)databaseInsertId($pdo,'enquiries');
    echo json_encode(['success'=>true,'id'=>$id,'message'=>'Your enquiry has been sent. Yogshala will contact you to confirm class availability.']);
} catch(Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Class enquiry: '.$e->getMessage());http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Unable to save your enquiry. Please try again or contact Yogshala.']);
}
