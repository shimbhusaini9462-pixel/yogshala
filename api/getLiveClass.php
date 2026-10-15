<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
require_once '../config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'student') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$student_id = $_SESSION['user_id'];

try {
    // Check student's subscription status
    $stmt = $pdo->prepare("SELECT subscription_status FROM students WHERE id = :student_id");
    $stmt->bindParam(':student_id', $student_id, PDO::PARAM_INT);
    $stmt->execute();
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    $paid=$pdo->prepare('SELECT MAX(expiry_date) FROM payments WHERE student_id=?'); $paid->execute([$student_id]); $expiry=$paid->fetchColumn();
    if (!$student || $student['subscription_status'] === 'expired' || !$expiry || $expiry < date('Y-m-d')) {
        echo json_encode(['success' => false, 'message' => 'Your subscription has expired. Please renew to join this class.']);
        exit;
    }

    // Get today's live class for the student's batch
    $stmt = $pdo->prepare("
        SELECT lc.id AS live_class_id, t.name AS teacher_name, b.name AS batch_name, s.class_time, s.duration, lc.status
        FROM live_classes lc
        JOIN schedules s ON lc.schedule_id = s.id
        JOIN batches b ON s.batch_id = b.id
        JOIN teachers t ON b.teacher_id = t.id
        WHERE s.class_date = CURDATE() AND lc.status IN ('upcoming','live') AND s.batch_id IN (SELECT batch_id FROM students_batches WHERE student_id = :student_id)
        ORDER BY (lc.status='live') DESC, s.class_time
        LIMIT 1
    ");
    $stmt->bindParam(':student_id', $student_id, PDO::PARAM_INT);
    $stmt->execute();

    $live_class = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($live_class) {
        echo json_encode(['success' => true, 'data' => $live_class]);
    } else {
        echo json_encode(['success' => false, 'message' => "No live class scheduled for you today."]);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Unable to complete the request. Please try again.']);
}
?>
