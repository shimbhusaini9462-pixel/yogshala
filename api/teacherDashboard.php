<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
header('Content-Type: application/json');
if (($_SESSION['role'] ?? '') !== 'teacher' || empty($_SESSION['user_id'])) {
    http_response_code(401); echo json_encode(['success'=>false,'message'=>'Unauthorized']); exit;
}
require_once __DIR__ . '/../config.php';
try {
    $id = $_SESSION['user_id'];
    $q=$pdo->prepare('SELECT name,email FROM teachers WHERE id=?'); $q->execute([$id]);
    $profile=$q->fetch(PDO::FETCH_ASSOC);
    $q=$pdo->prepare('SELECT b.id,b.name,COUNT(DISTINCT sb.student_id) AS total_clients FROM batches b LEFT JOIN students_batches sb ON sb.batch_id=b.id WHERE b.teacher_id=? GROUP BY b.id,b.name'); $q->execute([$id]); $batches=$q->fetchAll(PDO::FETCH_ASSOC);
    $q=$pdo->prepare('SELECT DISTINCT s.id,s.name,s.email,s.subscription_status,sb.batch_id FROM students s JOIN students_batches sb ON sb.student_id=s.id JOIN batches b ON b.id=sb.batch_id WHERE b.teacher_id=?'); $q->execute([$id]); $clients=$q->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success'=>true,'profile'=>$profile,'batches'=>$batches,'clients'=>$clients]);
} catch(Throwable $e) { http_response_code(500); echo json_encode(['success'=>false,'message'=>'Unable to load dashboard. Please retry.']); }
