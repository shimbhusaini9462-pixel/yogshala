<?php
// Shared registry prevents one email from being assigned to multiple account roles.
if (PHP_SAPI!=='cli') {http_response_code(404);exit;}
$pdo->exec("CREATE TABLE IF NOT EXISTS account_emails (email VARCHAR(100) PRIMARY KEY, account_role VARCHAR(10) NOT NULL, user_id INT NOT NULL, UNIQUE KEY role_user(account_role,user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$existingTriggers=$pdo->query('SHOW TRIGGERS')->fetchAll(PDO::FETCH_ASSOC);
$triggerNames=array_column($existingTriggers,'Trigger');
foreach (['students'=>['student','email'],'teachers'=>['teacher','email'],'admins'=>['admin','recovery_email']] as $table=>[$accountRole,$column]) {
    $pdo->exec("INSERT INTO account_emails(email,account_role,user_id) SELECT LOWER(TRIM($column)),'$accountRole',id FROM $table WHERE $column IS NOT NULL AND TRIM($column)<>'' ON DUPLICATE KEY UPDATE email=IF(account_role=VALUES(account_role) AND user_id=VALUES(user_id),VALUES(email),NULL)");
    foreach (['INSERT','UPDATE','DELETE'] as $event) {
        $trigger='email_identity_'.$table.'_'.strtolower($event);
        if (in_array($trigger,$triggerNames,true))continue;
        $delete="DELETE FROM account_emails WHERE account_role='$accountRole' AND user_id=OLD.id;";
        $insert="IF NEW.$column IS NOT NULL AND TRIM(NEW.$column)<>'' THEN INSERT INTO account_emails(email,account_role,user_id) VALUES(LOWER(TRIM(NEW.$column)),'$accountRole',NEW.id); END IF;";
        $body=$event==='INSERT'?$insert:($event==='DELETE'?$delete:"IF NOT (OLD.$column <=> NEW.$column) THEN $delete $insert END IF;");
        $pdo->exec("CREATE TRIGGER $trigger AFTER $event ON $table FOR EACH ROW BEGIN $body END");
    }
}
