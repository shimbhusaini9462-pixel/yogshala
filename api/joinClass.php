<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
require_once '../config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'student') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['success'=>false,'message'=>'POST required.']); exit; }
$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data) || empty($_SESSION['portal_token']) || !hash_equals($_SESSION['portal_token'], $data['token'] ?? '')) { http_response_code(403); echo json_encode(['success'=>false,'message'=>'Refresh and try again.']); exit; }

if (!isset($data['live_class_id']) || !filter_var($data['live_class_id'],FILTER_VALIDATE_INT,['options'=>['min_range'=>1]])) {
    echo json_encode(['success' => false, 'message' => 'Live class ID is required.']);
    exit;
}

$live_class_id = $data['live_class_id'];
$student_id = $_SESSION['user_id'];

try {
    // 1. Check student's subscription status
    $stmt_sub = $pdo->prepare("SELECT subscription_status FROM students WHERE id = :student_id");
    $stmt_sub->bindParam(':student_id', $student_id, PDO::PARAM_INT);
    $stmt_sub->execute();
    $student_sub = $stmt_sub->fetch(PDO::FETCH_ASSOC);

    $paid=$pdo->prepare('SELECT MAX(expiry_date) FROM payments WHERE student_id=?'); $paid->execute([$student_id]); $expiry=$paid->fetchColumn();
    if (!$student_sub || $student_sub['subscription_status'] === 'expired' || !$expiry || $expiry < date('Y-m-d')) {
        echo json_encode(['success' => false, 'message' => 'Your subscription has expired. Please renew to join this class.']);
        exit;
    }

    // 2. Check if the class is live
    $stmt = $pdo->prepare("SELECT lc.status, lc.room_name FROM live_classes lc JOIN schedules sch ON sch.id=lc.schedule_id JOIN students_batches sb ON sb.batch_id=sch.batch_id WHERE lc.id = :live_class_id AND sb.student_id = :student_id");
    $stmt->bindParam(':live_class_id', $live_class_id, PDO::PARAM_INT);
    $stmt->bindParam(':student_id', $student_id, PDO::PARAM_INT);
    $stmt->execute();
    $class = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$class) {
        echo json_encode(['success' => false, 'message' => 'Class not found.']);
        exit;
    }

    if ($class['status'] !== 'live') {
        $message = 'Class has not started yet.';
        if ($class['status'] === 'ended') {
            $message = "Today's class has ended.";
        } elseif ($class['status']==='cancelled') {
            $message = 'This class has been cancelled.';
        }
        echo json_encode(['success' => false, 'message' => $message, 'status' => $class['status']]);
        exit;
    }

    // 3. Record attendance (if not already recorded)
    $stmt_check = $pdo->prepare("SELECT id FROM attendance WHERE student_id = :student_id AND live_class_id = :live_class_id");
    $stmt_check->bindParam(':student_id', $student_id, PDO::PARAM_INT);
    $stmt_check->bindParam(':live_class_id', $live_class_id, PDO::PARAM_INT);
    $stmt_check->execute();

    if ($stmt_check->rowCount() === 0) {
        $stmt_insert = $pdo->prepare("
            INSERT INTO attendance (student_id, live_class_id, join_time)
            VALUES (:student_id, :live_class_id, CURRENT_TIMESTAMP)
        ");
        $stmt_insert->bindParam(':student_id', $student_id, PDO::PARAM_INT);
        $stmt_insert->bindParam(':live_class_id', $live_class_id, PDO::PARAM_INT);
        $stmt_insert->execute();
    }

    // 4. Return Jitsi room name
    echo json_encode([
        'success' => true,
        'message' => 'Joining class...',
        'room_name' => $class['room_name'],
        'jitsi_server' => JITSI_SERVER,
        'room_url' => jitsiRoomUrl($class['room_name']),
        'attendance_basis' => 'join_link_opened'
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Unable to complete the request. Please try again.']);
}
?>
