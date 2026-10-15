<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
require_once __DIR__.'/../config.php';
header('Content-Type: application/json');
function recoveryReply($message,$status=200,$success=true) { http_response_code($status);echo json_encode(['success'=>$success,'message'=>$message]);exit; }
if ($_SERVER['REQUEST_METHOD']!=='POST') recoveryReply('POST required.',405,false);
$data=json_decode(file_get_contents('php://input'),true);
if (!is_array($data)) recoveryReply('Invalid request.',400,false);
$action=$data['action'] ?? 'request';
if ($action==='reset') {
    $token=$data['reset_token'] ?? null;$password=$data['password'] ?? null;
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D',$token) || !is_string($password) || strlen($password)<8 || strlen($password)>72) recoveryReply('Enter a valid reset link and a password of 8–72 characters.',400,false);
    $pdo->beginTransaction();
    $q=$pdo->prepare('SELECT * FROM password_resets WHERE token_hash=? AND expires_at>NOW() FOR UPDATE');$q->execute([hash('sha256',$token)]);$reset=$q->fetch();
    if (!$reset || !in_array($reset['role'],['student','admin'],true)) { $pdo->rollBack();recoveryReply('This link expired or was already used. Request a new one.',400,false); }
    $table=$reset['role']==='student'?'students':'admins';
    $q=$pdo->prepare('SELECT password FROM '.$table.' WHERE id=? FOR UPDATE');$q->execute([$reset['user_id']]);$old=$q->fetchColumn();
    if (!$old || !hash_equals($reset['password_stamp'],hash('sha256',$old))) { $pdo->rollBack();recoveryReply('This link is no longer valid. Request a new one.',400,false); }
    $pdo->prepare('UPDATE '.$table.' SET password=? WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),$reset['user_id']]);
    $pdo->prepare('DELETE FROM password_resets WHERE role=? AND user_id=?')->execute([$reset['role'],$reset['user_id']]);
    $pdo->commit();session_unset();session_destroy();
    recoveryReply('Password updated. Log in with your new password.');
}
if ($action!=='request' || !is_string($data['role'] ?? null) || !in_array($data['role'],['student','admin'],true) || !is_string($data['account'] ?? null)) recoveryReply('Teacher password recovery is handled by the admin.',400,false);
$role=$data['role'];$account=trim($data['account']);
if (!$account || strlen($account)>100 || ($role==='student' && !filter_var($account,FILTER_VALIDATE_EMAIL))) recoveryReply('Enter your registered email or admin username.',400,false);
$settingsFile=__DIR__.'/../database/recovery-config.json';
$settings=is_file($settingsFile)?json_decode(file_get_contents($settingsFile),true):null;
$gmail=($settings['transport'] ?? '')==='gmail';
if (empty($settings['site_url']) || ($gmail ? (empty($settings['gmail_user']) || empty($settings['gmail_app_password'])) : (empty($settings['resend_api_key']) || empty($settings['from'])))) recoveryReply('Password reset email is not configured yet. Contact Yogshala for help.',503,false);
if (!$gmail && !function_exists('curl_init')) recoveryReply('Password recovery setup needs the PHP cURL extension.',503,false);
$site=rtrim($settings['site_url'],'/');$parts=parse_url($site);
if (!$parts || !isset($parts['host']) || !in_array($parts['scheme'] ?? '',['https','http'],true) || (($parts['scheme'] ?? '')==='http' && !in_array($parts['host'],['127.0.0.1','localhost'],true))) recoveryReply('Password recovery setup needs attention.',503,false);
if (isset($_SESSION['recovery_requested_at']) && time()-$_SESSION['recovery_requested_at']<60) recoveryReply('Please wait a minute before requesting another link.',429,false);
$_SESSION['recovery_requested_at']=time();
$sql=$role==='student'?'SELECT id,email,password FROM students WHERE email=?':'SELECT id,recovery_email AS email,password FROM admins WHERE username=?';
$q=$pdo->prepare($sql);$q->execute([$account]);$user=$q->fetch();
$generic='If the account has a recovery email, a reset link will be sent. Check your inbox and spam folder.';
if (!$user || !$user['email']) recoveryReply($generic);
$q=$pdo->prepare('SELECT id FROM password_resets WHERE role=? AND user_id=? AND created_at>DATE_SUB(NOW(),INTERVAL 1 MINUTE)');$q->execute([$role,$user['id']]);
if ($q->fetch()) recoveryReply($generic);
$token=bin2hex(random_bytes(32));$hash=hash('sha256',$token);
$pdo->prepare('DELETE FROM password_resets WHERE expires_at<NOW()')->execute();
$pdo->prepare('INSERT INTO password_resets(role,user_id,token_hash,password_stamp,expires_at) VALUES(?,?,?,?,DATE_ADD(NOW(),INTERVAL 30 MINUTE))')->execute([$role,$user['id'],$hash,hash('sha256',$user['password'])]);
$link=$site.'/'.$role.'-dashboard.html?reset_token='.$token;
if ($gmail) {
    $node=getenv('NODE_BINARY') ?: (PHP_OS_FAMILY==='Windows' ? 'C:/Program Files/nodejs/node.exe' : 'node');
    $process=proc_open([$node,__DIR__.'/../scripts/send-recovery-email.cjs'],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes,__DIR__.'/..');
    $response=false;$status=500;
    if (is_resource($process)) {
        fwrite($pipes[0],json_encode(['to'=>$user['email'],'subject'=>'Reset your Yogshala password','text'=>"Reset your password using this link (valid for 30 minutes):\n$link\n\nIf you did not request this, ignore this email."]));fclose($pipes[0]);
        $output=stream_get_contents($pipes[1]);fclose($pipes[1]);stream_get_contents($pipes[2]);fclose($pipes[2]);
        if (proc_close($process)===0 && $output==='sent') {$response=true;$status=200;}
    }
} else {
$ch=curl_init('https://api.resend.com/emails');
curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>15,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$settings['resend_api_key'],'Content-Type: application/json'],CURLOPT_POSTFIELDS=>json_encode(['from'=>$settings['from'],'to'=>[$user['email']],'subject'=>'Reset your Yogshala password','text'=>"Reset your password using this link (valid for 30 minutes):\n$link\n\nIf you did not request this, ignore this email."])]);
$response=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
}
if ($response===false || $status<200 || $status>=300) {
    $pdo->prepare('DELETE FROM password_resets WHERE token_hash=?')->execute([$hash]);
    error_log('Password reset email delivery failed.');
}
recoveryReply($generic);
