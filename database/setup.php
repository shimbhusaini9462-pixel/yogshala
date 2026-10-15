<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$pdo=new PDO('mysql:host=127.0.0.1;port=3306;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$pdo->exec(file_get_contents(__DIR__.'/database.sql'));
$pdo->exec("CREATE TABLE IF NOT EXISTS portal_settings (setting_key VARCHAR(60) PRIMARY KEY, setting_value TEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$column=$pdo->query("SHOW COLUMNS FROM admins LIKE 'recovery_email'")->fetch();
if (!$column) $pdo->exec('ALTER TABLE admins ADD COLUMN recovery_email VARCHAR(100) DEFAULT NULL');
require __DIR__.'/email-identity.php';
$pdo->exec("CREATE TABLE IF NOT EXISTS password_resets (id INT AUTO_INCREMENT PRIMARY KEY, role VARCHAR(10) NOT NULL, user_id INT NOT NULL, token_hash CHAR(64) NOT NULL UNIQUE, password_stamp CHAR(64) NOT NULL, expires_at DATETIME NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX account_lookup(role,user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$status=$pdo->query("SHOW COLUMNS FROM live_classes LIKE 'status'")->fetch(PDO::FETCH_ASSOC);
if (!str_contains($status['Type'], 'cancelled')) $pdo->exec("ALTER TABLE live_classes MODIFY status ENUM('upcoming','live','ended','cancelled') NOT NULL DEFAULT 'upcoming'");
$q=$pdo->query('SELECT COUNT(*) FROM admins');
if (!$q->fetchColumn()) {
    $password=bin2hex(random_bytes(8));
    $pdo->prepare('INSERT INTO admins(username,password) VALUES(?,?)')->execute(['admin',password_hash($password,PASSWORD_DEFAULT)]);
    $path=__DIR__.'/local-admin.txt';
    file_put_contents($path,"Local admin username: admin\nPassword: $password\n");
    echo "Admin login saved in database/local-admin.txt\n";
}
echo "Database ready.\n";
