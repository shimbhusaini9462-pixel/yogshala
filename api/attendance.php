<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
require_once '../config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || !in_array($_SESSION['role'], ['teacher', 'admin'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

if (!isset($_GET['live_class_id'])) {
    echo json_encode(['success' => false, 'message' => 'Live class ID is required.']);
    exit;
}

$live_class_id = $_GET['live_class_id'];
$user_role = $_SESSION['role'];
$user_id = $_SESSION['user_id'];

try {
    // If the user is a teacher, verify they are authorized to see the attendance for this class.
    if ($user_role === 'teacher') {
        $stmt_auth = $pdo->prepare("
            SELECT b.teacher_id
            FROM live_classes lc
            JOIN schedules s ON lc.schedule_id = s.id
            JOIN batches b ON s.batch_id = b.id
            WHERE lc.id = :live_class_id
        ");
        $stmt_auth->bindParam(':live_class_id', $live_class_id, PDO::PARAM_INT);
        $stmt_auth->execute();
        $class_info = $stmt_auth->fetch(PDO::FETCH_ASSOC);

        if (!$class_info || $class_info['teacher_id'] != $user_id) {
            echo json_encode(['success' => false, 'message' => 'You are not authorized to view attendance for this class.']);
            exit;
        }
    }

    // Fetch attendance records
    $stmt = $pdo->prepare("
        SELECT
            s.name AS student_name,
            s.email AS student_email,
            a.join_time,
            a.leave_time,
            a.duration
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE a.live_class_id = :live_class_id
        ORDER BY s.name
    ");
    $stmt->bindParam(':live_class_id', $live_class_id, PDO::PARAM_INT);
    $stmt->execute();

    $attendance_list = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch student count
    $student_count = count($attendance_list);

    echo json_encode([
        'success' => true,
        'student_count' => $student_count,
        'attendance' => $attendance_list
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Unable to complete the request. Please try again.']);
}
?>