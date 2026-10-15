<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
require_once '../config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$user_role = $_SESSION['role'];
$user_id = $_SESSION['user_id'];
$student_id_to_check = $user_id; // Default to the logged-in user

// If admin, they can check any student's status by providing a student_id
if ($user_role === 'admin' && isset($_GET['student_id'])) {
    $student_id_to_check = $_GET['student_id'];
} elseif ($user_role !== 'student' && $user_role !== 'admin') {
    echo json_encode(['success' => false, 'message' => 'Insufficient permissions.']);
    exit;
}

try {
    // Fetch student's subscription and payment history
    $stmt_student = $pdo->prepare("
        SELECT name, email, subscription_status
        FROM students
        WHERE id = :student_id
    ");
    $stmt_student->bindParam(':student_id', $student_id_to_check, PDO::PARAM_INT);
    $stmt_student->execute();
    $student_info = $stmt_student->fetch(PDO::FETCH_ASSOC);

    if (!$student_info) {
        echo json_encode(['success' => false, 'message' => 'Student not found.']);
        exit;
    }

    $stmt_payments = $pdo->prepare("
        SELECT amount, payment_date, expiry_date
        FROM payments
        WHERE student_id = :student_id
        ORDER BY payment_date DESC
    ");
    $stmt_payments->bindParam(':student_id', $student_id_to_check, PDO::PARAM_INT);
    $stmt_payments->execute();
    $payment_history = $stmt_payments->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'student_info' => $student_info,
        'payment_history' => $payment_history
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Unable to complete the request. Please try again.']);
}
?>