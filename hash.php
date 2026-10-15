<?php
// New password
$newPassword = 'yogshala123';

// Generate a bcrypt hash of the new password
$hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);

// Output the hashed password
echo "<h1>Hashed Password</h1>";
echo "<p>Copy this hash to update your database:</p>";
echo "<pre>" . htmlspecialchars($hashedPassword) . "</pre>";
?>
