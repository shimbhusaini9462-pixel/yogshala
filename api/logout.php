<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
header('Content-Type: application/json');
$data=json_decode(file_get_contents('php://input'),true) ?: [];
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_SESSION['portal_token']) || !hash_equals($_SESSION['portal_token'],$data['token'] ?? '')) { http_response_code(403); echo json_encode(['success'=>false,'message'=>'Refresh and try again.']); exit; }
session_unset();
session_destroy();

header('Content-Type: application/json');
echo json_encode(['success' => true, 'message' => 'Logout successful.']);
?>