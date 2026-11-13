<?php
// Included by enquiry.php; credentials and payment status stay server-side.
function enquiryGateway() {
    $path=__DIR__.'/../database/razorpay-config.php';
    $local=is_file($path) ? require $path : [];
    $key=getenv('RAZORPAY_KEY_ID') ?: ($local['key_id'] ?? '');
    $secret=getenv('RAZORPAY_KEY_SECRET') ?: ($local['key_secret'] ?? '');
    if (!$key || !$secret) throw new RuntimeException('Payment is not configured.');
    return [$key,$secret];
}
function enquiryGatewayRequest($path,$body=null) {
    [$key,$secret]=enquiryGateway();
    $ch=curl_init('https://api.razorpay.com/v1/'.$path);
    curl_setopt_array($ch,[CURLOPT_USERPWD=>$key.':'.$secret,CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>25,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_HTTPHEADER=>['Content-Type: application/json']]);
    if ($body!==null) curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode($body)]);
    $raw=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
    $result=is_string($raw)?json_decode($raw,true):null;
    if ($status<200 || $status>=300 || !is_array($result)) throw new RuntimeException('Razorpay request failed.');
    return $result;
}
function verifyEnquiryPayment($pdo,$data) {
    foreach (['razorpay_order_id','razorpay_payment_id','razorpay_signature'] as $field) {
        if (!is_string($data[$field] ?? null) || strlen($data[$field])>128) {http_response_code(400);echo json_encode(['success'=>false,'message'=>'Invalid payment response.']);return;}
    }
    $owner=hash('sha256',$_SESSION['enquiry_payment_owner'] ?? '');
    $q=$pdo->prepare('SELECT * FROM razorpay_enquiry_orders WHERE order_id=? AND owner_hash=?');
    $q->execute([$data['razorpay_order_id'],$owner]);$order=$q->fetch();
    [, $secret]=enquiryGateway();
    if (!$order || !hash_equals(hash_hmac('sha256',$order['order_id'].'|'.$data['razorpay_payment_id'],$secret),$data['razorpay_signature'])) {http_response_code(400);echo json_encode(['success'=>false,'message'=>'Payment verification failed.']);return;}
    $payment=enquiryGatewayRequest('payments/'.rawurlencode($data['razorpay_payment_id']));
    if (($payment['status'] ?? '')!=='captured' || ($payment['order_id'] ?? '')!==$order['order_id'] || (int)($payment['amount'] ?? 0)!==(int)$order['amount'] || ($payment['currency'] ?? '')!==$order['currency']) {http_response_code(409);echo json_encode(['success'=>false,'message'=>'Payment confirmation is pending. Use Check payment again; do not pay again.']);return;}
    $pdo->beginTransaction();
    $q=$pdo->prepare('SELECT * FROM razorpay_enquiry_orders WHERE order_id=? FOR UPDATE');$q->execute([$order['order_id']]);$locked=$q->fetch();
    $q=$pdo->prepare('SELECT details FROM enquiries WHERE id=? FOR UPDATE');$q->execute([$order['enquiry_id']]);$details=json_decode($q->fetchColumn(),true,512,JSON_THROW_ON_ERROR);
    if (!$locked['payment_id']) {
        $details['paymentStatus']='Paid - verified by Razorpay';$details['razorpayPaymentId']=$data['razorpay_payment_id'];
        $pdo->prepare('UPDATE enquiries SET details=? WHERE id=?')->execute([json_encode($details,JSON_UNESCAPED_UNICODE),$order['enquiry_id']]);
        $pdo->prepare('UPDATE razorpay_enquiry_orders SET payment_id=? WHERE order_id=?')->execute([$data['razorpay_payment_id'],$order['order_id']]);
    }
    $pdo->commit();
    echo json_encode(['success'=>true,'id'=>(int)$order['enquiry_id'],'message'=>'Payment verified. Yogshala will confirm your batch and booking.']);
}
