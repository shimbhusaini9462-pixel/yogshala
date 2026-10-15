<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
require_once __DIR__.'/../config.php';
if (($_SESSION['role'] ?? '') !== 'teacher' || empty($_SESSION['user_id'])) {
    http_response_code(401); header('Content-Type: application/json'); echo json_encode(['success'=>false,'message'=>'Unauthorized']); exit;
}
$dir = __DIR__ . '/../uploads/teacher-notes/' . (int)$_SESSION['user_id'];
header('Content-Type: application/json');
function failNote($message) { http_response_code(400); echo json_encode(['success'=>false,'message'=>$message]); exit; }
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($_SESSION['notes_token'] ?? '', $_POST['token'] ?? '') || empty($_SESSION['notes_token'])) failNote('Session expired. Refresh and try again.');
    $file=$_FILES['note'] ?? null;
    if (!$file || $file['error'] !== UPLOAD_ERR_OK) failNote('Choose a valid file within the server upload limit.');
    if ($file['size'] > 2*1024*1024) failNote('Maximum file size is 2 MB.');
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $types=['application/pdf'=>'pdf','image/jpeg'=>'jpg','image/png'=>'png','text/plain'=>'txt'];
    if (!isset($types[$mime])) failNote('Use a PDF, JPG, PNG or plain text file.');
    if (!is_dir($dir) && !mkdir($dir,0700,true)) failNote('Unable to create notes storage.');
    $name=bin2hex(random_bytes(16)).'.'.$types[$mime];
    if (!move_uploaded_file($file['tmp_name'],$dir.'/'.$name)) failNote('Upload failed. Please retry.');
    echo json_encode(['success'=>true,'message'=>'Note uploaded successfully.']); exit;
}
if (isset($_GET['file'])) {
    $name=$_GET['file'];
    if (!preg_match('/^[a-f0-9]{32}\.(pdf|jpg|png|txt)$/D',$name) || !is_file($dir.'/'.$name)) failNote('File not found.');
    header('Content-Type: application/octet-stream'); header('X-Content-Type-Options: nosniff'); header('Content-Disposition: attachment; filename="note-'. $name .'"'); readfile($dir.'/'.$name); exit;
}
$_SESSION['notes_token'] = $_SESSION['notes_token'] ?? bin2hex(random_bytes(32));
$files=[];
foreach (glob($dir.'/*') ?: [] as $path) $files[]=['file'=>basename($path),'date'=>date('Y-m-d H:i',filemtime($path))];
echo json_encode(['success'=>true,'token'=>$_SESSION['notes_token'],'files'=>array_reverse($files)]);
