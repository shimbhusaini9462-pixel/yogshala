<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
require_once __DIR__.'/../config.php';
if (($_SESSION['role'] ?? '')!=='admin' || empty($_SESSION['user_id'])) {http_response_code(403);exit;}
$file=$_GET['file'] ?? '';
if (!is_string($file) || !preg_match('/^[a-f0-9]{32}\.(jpg|png|webp)$/D',$file)) {http_response_code(404);exit;}
$path=__DIR__.'/../uploads/payment-proofs/'.$file;
if (!is_file($path)) {http_response_code(404);exit;}
header('Content-Type: '.(new finfo(FILEINFO_MIME_TYPE))->file($path));header('X-Content-Type-Options: nosniff');header('Cache-Control: private, no-store');header('Content-Disposition: inline; filename="payment-proof.'.pathinfo($file,PATHINFO_EXTENSION).'"');readfile($path);
