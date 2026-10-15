<?php
require_once '../config.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid registration request.']);
    exit;
}

// Basic validation
if (!isset($data['name']) || !isset($data['email']) || !isset($data['password']) || !isset($data['role'])) {
    echo json_encode(['success' => false, 'message' => 'All fields are required.']);
    exit;
}
foreach (['name', 'email', 'password', 'role'] as $field) {
    if (!is_string($data[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Enter a valid name, email and password.']);
        exit;
    }
}
$data['email'] = trim($data['email']);
if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid email format.']);
    exit;
}
if (strlen($data['password']) < 8) {
    echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long.']);
    exit;
}


$name = trim($data['name']);
if ($name === '' || strlen($name)>100 || strlen($data['email'])>100) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Enter a name and valid email.']); exit; }
$email = $data['email'];
$password = password_hash($data['password'], PASSWORD_DEFAULT);
$role = $data['role'];

// For now, only student signup is supported via this API
if ($role !== 'student') {
     echo json_encode(['success' => false, 'message' => 'Only student signup is supported.']);
    exit;
}

try {
    if (!accountEmailAvailable($email)) {
        http_response_code(409);
        echo json_encode(['success'=>false,'message'=>'This email is already registered. Use its existing account to log in.']);exit;
    }
    // Check if email already exists
    $stmt_check = $pdo->prepare("SELECT id FROM students WHERE email = :email");
    $stmt_check->bindParam(':email', $email, PDO::PARAM_STR);
    $stmt_check->execute();

    if ($stmt_check->rowCount() > 0) {
        echo json_encode(['success' => false, 'message' => 'An account with this email already exists.']);
        exit;
    }

    // Insert new student
    $stmt_insert = $pdo->prepare("INSERT INTO students (name, email, password) VALUES (:name, :email, :password)");
    $stmt_insert->bindParam(':name', $name, PDO::PARAM_STR);
    $stmt_insert->bindParam(':email', $email, PDO::PARAM_STR);
    $stmt_insert->bindParam(':password', $password, PDO::PARAM_STR);

    if ($stmt_insert->execute()) {
        echo json_encode(['success' => true, 'message' => 'Signup successful!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Signup failed. Please try again.']);
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Unable to create account. Please check your details and try again.']);
}
?>
