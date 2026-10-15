<?php
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','use_strict_mode'=>true]);
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';
function reply($data, $status = 200) { http_response_code($status); echo json_encode($data); exit; }
$action = $_GET['action'] ?? 'session';
$role = $_SESSION['role'] ?? '';
$id = (int)($_SESSION['user_id'] ?? 0);
$tables = ['student' => 'students', 'teacher' => 'teachers', 'admin' => 'admins'];
if (!$id || !isset($tables[$role])) reply(['success' => false, 'message' => 'Please log in.'], 401);
$q = $pdo->prepare('SELECT * FROM ' . $tables[$role] . ' WHERE id=?'); $q->execute([$id]); $user = $q->fetch();
if (!$user) reply(['success' => false, 'message' => 'Account unavailable.'], 401);
$_SESSION['portal_token'] = $_SESSION['portal_token'] ?? bin2hex(random_bytes(32));
if ($action === 'session') reply(['success' => true, 'user' => ['id' => $id, 'name' => $user['name'] ?? $user['username'], 'role' => $role], 'token' => $_SESSION['portal_token']]);
try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        if (!hash_equals($_SESSION['portal_token'], $data['token'] ?? '')) reply(['success' => false, 'message' => 'Refresh and try again.'], 403);
        if ($action==='profile' && in_array($role,['student','teacher'],true)) {
            $name=trim($data['name'] ?? ''); $email=trim($data['email'] ?? '');
            if (!$name || strlen($name)>100 || strlen($email)>100 || !filter_var($email,FILTER_VALIDATE_EMAIL)) reply(['success'=>false,'message'=>'Enter your name and a valid email.'],400);
            if (!accountEmailAvailable($email,$role,$id)) reply(['success'=>false,'message'=>'This email already belongs to another account.'],409);
            $pdo->prepare('UPDATE '.$tables[$role].' SET name=?,email=? WHERE id=?')->execute([$name,$email,$id]);
            reply(['success'=>true,'message'=>'Profile updated.']);
        }
        if (in_array($action,['reschedule','cancel_class'],true) && in_array($role,['admin','teacher'],true)) {
            $classId=(int)($data['live_class_id'] ?? 0);
            $pdo->beginTransaction();
            $q=$pdo->prepare('SELECT lc.status,lc.schedule_id,b.teacher_id FROM live_classes lc JOIN schedules s ON s.id=lc.schedule_id JOIN batches b ON b.id=s.batch_id WHERE lc.id=? FOR UPDATE'); $q->execute([$classId]); $class=$q->fetch();
            if (!$class || ($role==='teacher' && (int)$class['teacher_id']!==$id)) { $pdo->rollBack(); reply(['success'=>false,'message'=>'Class access denied.'],403); }
            if ($class['status']!=='upcoming') { $pdo->rollBack(); reply(['success'=>false,'message'=>'Only upcoming classes can be changed or cancelled.'],400); }
            if ($action==='cancel_class') $pdo->prepare("UPDATE live_classes SET status='cancelled' WHERE id=?")->execute([$classId]);
            else {
                $date=$data['date'] ?? ''; $time=$data['time'] ?? ''; $duration=(int)($data['duration'] ?? 0); $parsed=DateTime::createFromFormat('!Y-m-d H:i',"$date $time");
                if (!$parsed || $parsed->format('Y-m-d H:i')!=="$date $time" || $parsed<new DateTime() || $duration<10 || $duration>240) { $pdo->rollBack(); reply(['success'=>false,'message'=>'Choose a future time and duration of 10–240 minutes.'],400); }
                $pdo->prepare('UPDATE schedules SET class_date=?,class_time=?,duration=? WHERE id=?')->execute([$date,$time,$duration,$class['schedule_id']]);
            }
            $pdo->commit();reply(['success'=>true,'message'=>$action==='cancel_class' ? 'Class cancelled.' : 'Schedule updated.']);
        }
        if ($action === 'recording' && in_array($role, ['teacher','admin'],true)) {
            $batch=(int)($data['batch_id'] ?? 0); $title=trim($data['title'] ?? ''); $url=trim($data['url'] ?? '');
            if (!$batch || !$title || strlen($title)>200 || strlen($url)>2000 || !filter_var($url,FILTER_VALIDATE_URL) || parse_url($url,PHP_URL_SCHEME)!=='https') reply(['success'=>false,'message'=>'Choose a batch, enter a title and a valid HTTPS recording link.'],400);
            $q=$pdo->prepare('SELECT teacher_id FROM batches WHERE id=?'); $q->execute([$batch]); $owner=$q->fetchColumn();
            if ($owner===false || ($role==='teacher' && (int)$owner!==$id)) reply(['success'=>false,'message'=>'Batch access denied.'],403);
            $pdo->prepare('INSERT INTO recordings(batch_id,title,url) VALUES(?,?,?)')->execute([$batch,$title,$url]);
            reply(['success'=>true,'message'=>'Recording saved.']);
        }
        if ($role !== 'admin') reply(['success' => false, 'message' => 'Admin access required.'], 403);
        if ($action === 'waiting_video') {
            $url=$data['url'] ?? null;
            if (!is_string($url) || strlen($url)>2000 || ($url!=='' && (!filter_var($url,FILTER_VALIDATE_URL) || parse_url($url,PHP_URL_SCHEME)!=='https' || !preg_match('/\.(mp4|webm)$/i',parse_url($url,PHP_URL_PATH) ?? '')))) reply(['success'=>false,'message'=>'Enter a direct HTTPS MP4/WebM video URL, or leave it empty to remove the video.'],400);
            $pdo->prepare('INSERT INTO portal_settings(setting_key,setting_value) VALUES(?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)')->execute(['waiting_video',trim($url)]);
            reply(['success'=>true,'message'=>'Waiting video updated.']);
        }
        if ($action === 'admin_recovery_email') {
            $email=$data['email'] ?? null;$current=$data['current_password'] ?? null;
            if (!is_string($email) || strlen($email)>100 || !filter_var($email,FILTER_VALIDATE_EMAIL) || !is_string($current) || !password_verify($current,$user['password'])) reply(['success'=>false,'message'=>'Enter a valid recovery email and your current admin password.'],400);
            if (!accountEmailAvailable($email,'admin',$id)) reply(['success'=>false,'message'=>'This email already belongs to another account.'],409);
            $pdo->prepare('UPDATE admins SET recovery_email=? WHERE id=?')->execute([trim($email),$id]);
            reply(['success'=>true,'message'=>'Admin recovery email saved.']);
        }
        if ($action === 'reset_teacher_password') {
            $target=filter_var($data['teacher_id'] ?? null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
            $password=$data['password'] ?? null;
            if (!$target || !is_string($password) || strlen($password)<8 || strlen($password)>72 || ($data['verified'] ?? '')!=='yes') {
                reply(['success'=>false,'message'=>'Choose a teacher, verify their identity and enter a password of 8–72 characters.'],400);
            }
            $q=$pdo->prepare('SELECT id FROM teachers WHERE id=?');$q->execute([$target]);
            if (!$q->fetch()) reply(['success'=>false,'message'=>'Teacher not found.'],404);
            $pdo->prepare('UPDATE teachers SET password=? WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),$target]);
            reply(['success'=>true,'message'=>'Teacher password reset. Share it privately with the verified teacher.']);
        }
        if ($action === 'update_teacher' || $action === 'update_student') {
            $target=(int)($data['id'] ?? 0); $name=trim($data['name'] ?? ''); $email=trim($data['email'] ?? '');
            if (!$target || !$name || strlen($name)>100 || strlen($email)>100 || !filter_var($email,FILTER_VALIDATE_EMAIL)) reply(['success'=>false,'message'=>'Choose an account and enter a name and valid email.'],400);
            $table=$action==='update_teacher' ? 'teachers' : 'students';
            if (!accountEmailAvailable($email,$action==='update_teacher'?'teacher':'student',$target)) reply(['success'=>false,'message'=>'This email already belongs to another account.'],409);
            $q=$pdo->prepare("SELECT id FROM $table WHERE id=?"); $q->execute([$target]);
            if (!$q->fetch()) reply(['success'=>false,'message'=>'Account not found.'],404);
            $pdo->prepare("UPDATE $table SET name=?,email=? WHERE id=?")->execute([$name,$email,$target]);
        } elseif ($action === 'update_batch') {
            $target=(int)($data['id'] ?? 0); $name=trim($data['name'] ?? ''); $teacher=(int)($data['teacher_id'] ?? 0);
            if (!$target || !$name || strlen($name)>100 || !$teacher) reply(['success'=>false,'message'=>'Choose a batch, enter its name and select a teacher.'],400);
            $q=$pdo->prepare('SELECT id FROM batches WHERE id=?'); $q->execute([$target]);
            if (!$q->fetch()) reply(['success'=>false,'message'=>'Batch not found.'],404);
            $pdo->prepare('UPDATE batches SET name=?,teacher_id=? WHERE id=?')->execute([$name,$teacher,$target]);
        } elseif ($action === 'membership') {
            $target=(int)($data['student_id'] ?? 0); $status=$data['status'] ?? '';
            if (!$target || !in_array($status,['active','expired'],true)) reply(['success'=>false,'message'=>'Choose a student and membership status.'],400);
            $q=$pdo->prepare('SELECT id FROM students WHERE id=?'); $q->execute([$target]);
            if (!$q->fetch()) reply(['success'=>false,'message'=>'Student not found.'],404);
            if ($status==='active') {
                $q=$pdo->prepare('SELECT MAX(expiry_date) FROM payments WHERE student_id=?'); $q->execute([$target]); $expiry=$q->fetchColumn();
                if (!$expiry || $expiry<date('Y-m-d')) reply(['success'=>false,'message'=>'Record a current payment before activating membership.'],400);
            }
            $pdo->prepare('UPDATE students SET subscription_status=? WHERE id=?')->execute([$status,$target]);
        } elseif ($action === 'unassign') {
            $student=(int)($data['student_id'] ?? 0); $batch=(int)($data['batch_id'] ?? 0);
            if (!$student || !$batch) reply(['success'=>false,'message'=>'Choose a student and batch.'],400);
            $pdo->prepare('DELETE FROM students_batches WHERE student_id=? AND batch_id=?')->execute([$student,$batch]);
        } elseif ($action === 'teacher' || $action==='student') {
            $name = trim($data['name'] ?? ''); $email = trim($data['email'] ?? ''); $password = $data['password'] ?? '';
            if (!$name || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) reply(['success' => false, 'message' => 'Enter a name, valid email and password of at least 8 characters.'], 400);
            $table=$action==='teacher' ? 'teachers' : 'students';
            if (strlen($email)>100 || !accountEmailAvailable($email)) reply(['success'=>false,'message'=>'This email is already registered or is too long.'],409);
            $pdo->prepare("INSERT INTO $table(name,email,password) VALUES(?,?,?)")->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
        } elseif ($action === 'batch') {
            $name = trim($data['name'] ?? ''); $teacher = (int)($data['teacher_id'] ?? 0);
            if (!$name || !$teacher) reply(['success' => false, 'message' => 'Enter a batch name and choose a teacher.'], 400);
            $pdo->prepare('INSERT INTO batches(name,teacher_id) VALUES(?,?)')->execute([$name, $teacher]);
        } elseif ($action === 'enroll') {
            $student = (int)($data['student_id'] ?? 0); $batch = (int)($data['batch_id'] ?? 0);
            if (!$student || !$batch) reply(['success' => false, 'message' => 'Choose a student and batch.'], 400);
            $pdo->prepare('INSERT IGNORE INTO students_batches(student_id,batch_id) VALUES(?,?)')->execute([$student, $batch]);
        } elseif ($action === 'schedule') {
            $batch = (int)($data['batch_id'] ?? 0); $date = $data['date'] ?? ''; $time = $data['time'] ?? ''; $duration = (int)($data['duration'] ?? 0);
            $parsed = DateTime::createFromFormat('!Y-m-d H:i', "$date $time");
            if (!$batch || !$parsed || $parsed->format('Y-m-d H:i') !== "$date $time" || $parsed < new DateTime() || $duration < 10 || $duration > 240) reply(['success' => false, 'message' => 'Choose a future class time and duration of 10–240 minutes.'], 400);
            $pdo->beginTransaction();
            $pdo->prepare('INSERT INTO schedules(batch_id,class_date,class_time,duration) VALUES(?,?,?,?)')->execute([$batch, $date, $time, $duration]);
            $schedule = $pdo->lastInsertId();
            $pdo->prepare('INSERT INTO live_classes(schedule_id,room_name) VALUES(?,?)')->execute([$schedule, 'yogshala-' . bin2hex(random_bytes(16))]);
            $pdo->commit();
        } elseif ($action === 'payment') {
            $student = (int)($data['student_id'] ?? 0); $amount = $data['amount'] ?? ''; $expiry = $data['expiry'] ?? '';
            $parsed = DateTime::createFromFormat('!Y-m-d', $expiry);
            if (!$student || !is_numeric($amount) || $amount <= 0 || !$parsed || $parsed->format('Y-m-d') !== $expiry || $expiry < date('Y-m-d')) reply(['success' => false, 'message' => 'Enter a student, positive amount and valid expiry date.'], 400);
            $pdo->beginTransaction();
            $pdo->prepare('INSERT INTO payments(student_id,amount,expiry_date) VALUES(?,?,?)')->execute([$student, $amount, $expiry]);
            $pdo->prepare("UPDATE students SET subscription_status='active' WHERE id=?")->execute([$student]); $pdo->commit();
        } else reply(['success' => false, 'message' => 'Unknown action.'], 400);
        reply(['success' => true, 'message' => 'Saved successfully.']);
    }
    if ($action !== 'dashboard') reply(['success' => false, 'message' => 'Unknown action.'], 400);
    $waitingVideo=$pdo->query("SELECT setting_value FROM portal_settings WHERE setting_key='waiting_video'")->fetchColumn();
    if (isset($_GET['view']) && $_GET['view'] !== $role) {
        reply(['success' => false, 'message' => 'Log in with the correct account for this dashboard.'], 403);
    }
    $result = ['success' => true, 'profile'=>['name'=>$user['name'] ?? $user['username'],'email'=>$user['email'] ?? '']];
    if ($role === 'admin') {
        foreach (['teachers' => 'SELECT id,name,email FROM teachers', 'students' => "SELECT s.id,s.name,s.email,CASE WHEN s.subscription_status='active' AND (SELECT MAX(p.expiry_date) FROM payments p WHERE p.student_id=s.id)>=CURDATE() THEN 'active' ELSE 'expired' END AS subscription_status,(SELECT MAX(p.expiry_date) FROM payments p WHERE p.student_id=s.id) AS expiry FROM students s", 'batches' => 'SELECT b.id,b.name,b.teacher_id,t.name AS teacher FROM batches b LEFT JOIN teachers t ON t.id=b.teacher_id', 'enquiries' => 'SELECT * FROM enquiries ORDER BY id DESC LIMIT 100', 'payments' => 'SELECT s.name AS student_name,s.email,p.amount,p.payment_date,p.expiry_date FROM payments p JOIN students s ON s.id=p.student_id ORDER BY p.payment_date DESC,p.id DESC', 'enrollments' => 'SELECT s.id AS student_id,s.name AS student_name,b.id AS batch_id,b.name AS batch_name FROM students_batches sb JOIN students s ON s.id=sb.student_id JOIN batches b ON b.id=sb.batch_id ORDER BY b.name,s.name'] as $key => $sql) $result[$key] = $pdo->query($sql)->fetchAll();
    } elseif ($role === 'teacher') {
        $q=$pdo->prepare('SELECT id,name FROM batches WHERE teacher_id=?'); $q->execute([$id]); $result['batches']=$q->fetchAll();
        $q=$pdo->prepare('SELECT DISTINCT s.name,s.email,b.name AS batch_name FROM students s JOIN students_batches sb ON sb.student_id=s.id JOIN batches b ON b.id=sb.batch_id WHERE b.teacher_id=?'); $q->execute([$id]); $result['students']=$q->fetchAll();
    } elseif ($role === 'student') {
        $q=$pdo->prepare('SELECT b.name,t.name AS teacher_name FROM students_batches sb JOIN batches b ON b.id=sb.batch_id LEFT JOIN teachers t ON t.id=b.teacher_id WHERE sb.student_id=?'); $q->execute([$id]); $result['batches']=$q->fetchAll();
        $q=$pdo->prepare('SELECT b.name AS batch_name,s.class_date,s.class_time,a.join_time,a.leave_time,a.duration FROM attendance a JOIN live_classes lc ON lc.id=a.live_class_id JOIN schedules s ON s.id=lc.schedule_id JOIN batches b ON b.id=s.batch_id WHERE a.student_id=? ORDER BY a.join_time DESC'); $q->execute([$id]); $result['attendance']=$q->fetchAll();
        $q=$pdo->prepare('SELECT amount,payment_date,expiry_date FROM payments WHERE student_id=? ORDER BY payment_date DESC'); $q->execute([$id]); $result['payments']=$q->fetchAll();
        $q=$pdo->prepare('SELECT MAX(expiry_date) FROM payments WHERE student_id=?'); $q->execute([$id]); $expiry=$q->fetchColumn();
        $result['membership'] = $user['subscription_status'] === 'active' && $expiry && $expiry >= date('Y-m-d') ? 'active' : 'expired';
        $result['expiry'] = $expiry ?: null;
    }
    $sql='SELECT lc.id AS live_class_id,lc.status,lc.room_name,b.name AS batch_name,s.class_date,s.class_time,s.duration FROM live_classes lc JOIN schedules s ON s.id=lc.schedule_id JOIN batches b ON b.id=s.batch_id WHERE (s.class_date>=DATE_SUB(CURDATE(),INTERVAL 90 DAY) OR lc.status=\'live\')';
    $args=[];
    if ($role === 'teacher') { $sql.=' AND b.teacher_id=?'; $args=[$id]; }
    if ($role === 'student') { $sql.=' AND EXISTS(SELECT 1 FROM students_batches sb WHERE sb.batch_id=b.id AND sb.student_id=?)'; $args=[$id]; }
    $q=$pdo->prepare($sql.' ORDER BY s.class_date,s.class_time'); $q->execute($args); $result['classes']=$q->fetchAll();
    foreach ($result['classes'] as &$class) {
        if ($role==='student') unset($class['room_name']);
        else $class['room_url']=jitsiRoomUrl($class['room_name']);
    }
    unset($class);
    $sql='SELECT r.title,r.url,b.name AS batch_name,r.created_at FROM recordings r JOIN batches b ON b.id=r.batch_id'; $args=[];
    if ($role==='teacher') { $sql.=' WHERE b.teacher_id=?'; $args=[$id]; }
    if ($role==='student') { $sql.=' WHERE EXISTS(SELECT 1 FROM students_batches sb WHERE sb.batch_id=b.id AND sb.student_id=?)'; $args=[$id]; }
    if ($role!=='student' || $result['membership']==='active') { $q=$pdo->prepare($sql.' ORDER BY r.id DESC'); $q->execute($args); $result['recordings']=$q->fetchAll(); }
    else $result['recordings']=[];
    $result['waiting_video']=$waitingVideo ?: null;
    reply($result);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack(); error_log($e->getMessage());
    reply(['success' => false, 'message' => 'Unable to save or load data. Check for duplicate email or invalid selections.'], 400);
}
