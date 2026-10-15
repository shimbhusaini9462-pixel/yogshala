<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
require_once '../config.php';

header('Content-Type: application/json');

// Set up error logging to a local file
ini_set('log_errors', 1);
ini_set('error_log', 'login_errors.log');
error_reporting(0); // Turn off error display to the user

$data = json_decode(file_get_contents('php://input'), true);
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !is_array($data)) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Invalid request.']); exit; }

if (!isset($data['email']) || !isset($data['password']) || !isset($data['role'])) {
    echo json_encode(['success' => false, 'message' => 'Email, password, and role are required.']);
    exit;
}

if (!is_string($data['email']) || !is_string($data['password']) || !is_string($data['role'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Enter a valid email or username, password and role.']);
    exit;
}

$email = trim($data['email']);
$password = $data['password'];
$role = $data['role'];
if ($email === '' || strlen($email) > 100 || $password === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email or username and password are required.']);
    exit;
}

$table_map = [
    'admin' => 'admins',
    'teacher' => 'teachers',
    'student' => 'students'
];

if (!array_key_exists($role, $table_map)) {
    echo json_encode(['success' => false, 'message' => 'Invalid role specified.']);
    exit;
}

$table_name = $table_map[$role];
$column_name = ($role === 'admin') ? 'username' : 'email';

try {
    $stmt = $pdo->prepare("SELECT * FROM `$table_name` WHERE `$column_name` = :email");
    $stmt->bindParam(':email', $email, PDO::PARAM_STR);
    $stmt->execute();

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($password, $user['password'])) {
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role'] = $role;
        $_SESSION['password_stamp'] = hash('sha256', $user['password']);
        echo json_encode(['success' => true, 'message' => 'Login successful.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials.']);
    }
} catch (PDOException $e) {
    // Log the detailed error for the developer
    error_log('Login PDOException: ' . $e->getMessage());
    // Show a generic error to the user
    echo json_encode(['success' => false, 'message' => 'An internal server error occurred. Please try again later.']);
}
?>
