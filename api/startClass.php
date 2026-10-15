<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
require_once '../config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
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
$teacher_id = $_SESSION['user_id'];

try {
    // 1. Verify that the teacher is assigned to the batch for this live class
    $stmt = $pdo->prepare("
        SELECT b.teacher_id, lc.room_name
        FROM live_classes lc
        JOIN schedules s ON lc.schedule_id = s.id
        JOIN batches b ON s.batch_id = b.id
        WHERE lc.id = :live_class_id
    ");
    $stmt->bindParam(':live_class_id', $live_class_id, PDO::PARAM_INT);
    $stmt->execute();
    $class_info = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$class_info || $class_info['teacher_id'] != $teacher_id) {
        echo json_encode(['success' => false, 'message' => 'You are not authorized to start this class.']);
        exit;
    }

    // 2. Update the live class status
    $stmt = $pdo->prepare("
        UPDATE live_classes
        SET status = 'live', start_time = CURRENT_TIMESTAMP
        WHERE id = :live_class_id AND status = 'upcoming'
    ");
    $stmt->bindParam(':live_class_id', $live_class_id, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Class marked live. Students can now open the meeting.', 'room_url'=>jitsiRoomUrl($class_info['room_name']), 'jitsi_server'=>JITSI_SERVER]);
    } else {
        // Check current status to provide a more specific message
        $stmt_check = $pdo->prepare("SELECT status FROM live_classes WHERE id = :live_class_id");
        $stmt_check->bindParam(':live_class_id', $live_class_id, PDO::PARAM_INT);
        $stmt_check->execute();
        $current_status = $stmt_check->fetchColumn();

        if ($current_status === 'live') {
            echo json_encode(['success' => false, 'message' => 'Class is already live.']);
        } elseif ($current_status === 'ended') {
            echo json_encode(['success' => false, 'message' => 'Cannot start a class that has already ended.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to start class. It might not be in the upcoming state or does not exist.']);
        }
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Unable to complete the request. Please try again.']);
}
?>
