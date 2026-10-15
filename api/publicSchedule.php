<?php
header('Content-Type: application/json');
require_once __DIR__.'/../config.php';
try {
    $rows=$pdo->query("SELECT b.name AS class_name,t.name AS instructor,s.class_date,s.class_time,s.duration FROM schedules s JOIN batches b ON b.id=s.batch_id JOIN live_classes lc ON lc.schedule_id=s.id LEFT JOIN teachers t ON t.id=b.teacher_id WHERE TIMESTAMP(s.class_date,s.class_time)>=NOW() AND lc.status='upcoming' ORDER BY s.class_date,s.class_time LIMIT 20")->fetchAll();
    echo json_encode(['success'=>true,'classes'=>$rows]);
} catch(Throwable $e) { http_response_code(500); echo json_encode(['success'=>false,'message'=>'Schedule unavailable.']); }
