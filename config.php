<?php
date_default_timezone_set('Asia/Kolkata');
if (PHP_SAPI !== 'cli' && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['HTTP_ORIGIN'])) {
    $origin=parse_url($_SERVER['HTTP_ORIGIN']);
    $host=($origin['host'] ?? '') . (isset($origin['port']) ? ':' . $origin['port'] : '');
    if ($host !== ($_SERVER['HTTP_HOST'] ?? '')) { http_response_code(403); header('Content-Type: application/json'); echo json_encode(['success'=>false,'message'=>'Invalid request origin.']); exit; }
}
$videoFile=__DIR__.'/database/video-config.json';
$videoSettings=is_file($videoFile)?json_decode(file_get_contents($videoFile),true):null;
$videoServer=$videoSettings['server'] ?? 'meet.jit.si';
if (!is_string($videoServer) || !preg_match('/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/iD',$videoServer)) throw new RuntimeException('Invalid video server configuration.');
define('JITSI_SERVER', $videoServer);
function jitsiRoomUrl($room) {
    if (!is_string($room) || !preg_match('/^[a-zA-Z0-9_-]{1,200}$/D',$room)) throw new InvalidArgumentException('Invalid meeting room.');
    return 'https://' . JITSI_SERVER . '/' . rawurlencode($room);
}
function accountEmailAvailable($email,$role=null,$id=0) {
    global $pdo;
    $q=$pdo->prepare('SELECT account_role,user_id FROM account_emails WHERE email=?');
    $q->execute([strtolower(trim($email))]);$owner=$q->fetch();
    return !$owner || ($owner['account_role']===$role && (int)$owner['user_id']===(int)$id);
}
try {
    $pdo = new PDO('mysql:host=' . (getenv('DB_HOST') ?: '127.0.0.1') . ';port=' . (getenv('DB_PORT') ?: '3306') . ';dbname=' . (getenv('DB_NAME') ?: 'yogshala_local') . ';charset=utf8mb4', getenv('DB_USER') ?: 'root', getenv('DB_PASSWORD') ?: '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]);
    $pdo->exec("SET time_zone = '+05:30'");
    // Password changes invalidate older authenticated sessions on every account API.
    if (isset($_SESSION['user_id'], $_SESSION['role'])) {
        $sessionTables=['student'=>'students','teacher'=>'teachers','admin'=>'admins'];
        $sessionTable=$sessionTables[$_SESSION['role']] ?? null;
        $check=$sessionTable ? $pdo->prepare('SELECT password FROM '.$sessionTable.' WHERE id=?') : null;
        if ($check) $check->execute([$_SESSION['user_id']]);
        $currentPassword=$check ? $check->fetchColumn() : false;
        if (!$currentPassword || !isset($_SESSION['password_stamp']) || !hash_equals($_SESSION['password_stamp'],hash('sha256',$currentPassword))) {
            session_unset();session_destroy();
            http_response_code(401);header('Content-Type: application/json');
            echo json_encode(['success'=>false,'message'=>'Your password changed. Please log in again.']);exit;
        }
    }
} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Database unavailable. Start the website with start-local.ps1.']);
    exit;
}
