<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
require_once '../config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$teacher_id = $_SESSION['user_id'];

try {
    $stmt = $pdo->prepare("
        SELECT
            s.id AS schedule_id,
            b.name AS batch_name,
            s.class_date,
            s.class_time,
            s.duration,
            lc.id AS live_class_id,
            lc.status,
            lc.room_name
        FROM schedules s
        JOIN batches b ON s.batch_id = b.id
        LEFT JOIN live_classes lc ON s.id = lc.schedule_id
        WHERE b.teacher_id = :teacher_id AND (s.class_date >= CURDATE() OR lc.status = 'live')
        ORDER BY s.class_date, s.class_time
    ");
    $stmt->bindParam(':teacher_id', $teacher_id, PDO::PARAM_INT);
    $stmt->execute();

    $schedule = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // If a live class doesn't exist for a schedule, create one
    foreach ($schedule as &$class) {
        if (empty($class['live_class_id'])) {
            $room_name = 'yogshala-' . uniqid() . '-' . $class['schedule_id'];
            $insert_stmt = $pdo->prepare("
                INSERT INTO live_classes (schedule_id, room_name, status)
                VALUES (:schedule_id, :room_name, 'upcoming')
            ");
            $insert_stmt->bindParam(':schedule_id', $class['schedule_id'], PDO::PARAM_INT);
            $insert_stmt->bindParam(':room_name', $room_name, PDO::PARAM_STR);
            $insert_stmt->execute();

            $class['live_class_id'] = $pdo->lastInsertId();
            $class['status'] = 'upcoming';
            $class['room_name'] = $room_name;
        }
    }


    echo json_encode(['success' => true, 'data' => $schedule]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Unable to complete the request. Please try again.']);
}
?>