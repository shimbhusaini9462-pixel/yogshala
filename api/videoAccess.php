<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
require_once __DIR__.'/../config.php';
header('Content-Type: application/json');header('Cache-Control: no-store');
function videoReply($message,$status){http_response_code($status);echo json_encode(['success'=>false,'message'=>$message]);exit;}
$role=$_SESSION['role'] ?? '';$id=(int)($_SESSION['user_id'] ?? 0);
if (!$id || !in_array($role,['student','teacher','admin'],true))videoReply('Log in to join your class.',401);
$data=json_decode(file_get_contents('php://input'),true);
if ($_SERVER['REQUEST_METHOD']!=='POST' || !is_array($data) || !is_string($data['token'] ?? null) || empty($_SESSION['portal_token']) || !hash_equals($_SESSION['portal_token'],$data['token']))videoReply('Refresh your dashboard and try again.',403);
$classId=filter_var($data['class_id'] ?? null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
if (!$classId)videoReply('Choose a valid class.',400);
$q=$pdo->prepare('SELECT lc.room_name,lc.status,b.teacher_id,b.id AS batch_id FROM live_classes lc JOIN schedules s ON s.id=lc.schedule_id JOIN batches b ON b.id=s.batch_id WHERE lc.id=?');$q->execute([$classId]);$class=$q->fetch();
if (!$class || $class['status']!=='live')videoReply('This class is not live. Refresh your dashboard.',403);
if ($role==='teacher' && (int)$class['teacher_id']!==$id)videoReply('This class is not assigned to you.',403);
if ($role==='student'){
    $q=$pdo->prepare("SELECT s.id FROM students s JOIN students_batches sb ON sb.student_id=s.id WHERE s.id=? AND sb.batch_id=? AND s.subscription_status='active' AND (SELECT MAX(expiry_date) FROM payments WHERE student_id=s.id)>=CURDATE()");$q->execute([$id,$class['batch_id']]);
    if (!$q->fetch())videoReply('An active membership and assigned batch are required.',403);
}
$jwt=null;
if (JITSI_SERVER!=='meet.jit.si'){
    if (!is_array($videoSettings) || !is_string($videoSettings['app_secret'] ?? null) || strlen($videoSettings['app_secret'])<32 || empty($videoSettings['app_id']))videoReply('Private video server is not fully configured.',503);
    $tables=['student'=>'students','teacher'=>'teachers','admin'=>'admins'];
    $q=$pdo->prepare('SELECT * FROM '.$tables[$role].' WHERE id=?');$q->execute([$id]);$user=$q->fetch();
    $encode=fn($value)=>rtrim(strtr(base64_encode(json_encode($value,JSON_UNESCAPED_SLASHES)),'+/','-_'),'=');
    $claims=['iss'=>$videoSettings['app_id'],'aud'=>$videoSettings['app_id'],'sub'=>$videoSettings['token_subject'] ?? 'meet.jitsi','room'=>$class['room_name'],'iat'=>time(),'nbf'=>time()-30,'exp'=>time()+1200,'context'=>['user'=>['id'=>$role.'-'.$id,'name'=>$user['name'] ?? $user['username'],'moderator'=>$role!=='student']]];
    $unsigned=$encode(['alg'=>'HS256','typ'=>'JWT']).'.'.$encode($claims);
    $jwt=$unsigned.'.'.rtrim(strtr(base64_encode(hash_hmac('sha256',$unsigned,$videoSettings['app_secret'],true)),'+/','-_'),'=');
}
echo json_encode(['success'=>true,'server'=>JITSI_SERVER,'room_url'=>jitsiRoomUrl($class['room_name']),'jwt'=>$jwt,'private_server'=>JITSI_SERVER!=='meet.jit.si']);
