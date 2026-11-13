<?php
// CLI only: copy the existing local MySQL database into an EMPTY Supabase schema.
if (PHP_SAPI!=='cli') {http_response_code(404);exit;}
require_once __DIR__.'/connection.php';
if (databaseDriver()!=='pgsql') throw new RuntimeException('Set DATABASE_URL in .env first.');
$target=connectDatabase();
$source=new PDO('mysql:host='.(getenv('MYSQL_SOURCE_HOST') ?: '127.0.0.1').';port='.(getenv('MYSQL_SOURCE_PORT') ?: '3306').';dbname='.(getenv('MYSQL_SOURCE_NAME') ?: 'yogshala_local').';charset=utf8mb4',getenv('MYSQL_SOURCE_USER') ?: 'root',getenv('MYSQL_SOURCE_PASSWORD') ?: '',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::MYSQL_ATTR_USE_BUFFERED_QUERY=>false]);
$tables=['admins','teachers','students','batches','students_batches','schedules','live_classes','attendance','payments','enquiries','recordings','razorpay_orders','razorpay_enquiry_orders','portal_settings','password_resets'];
try {
    $source->exec("SET time_zone = '+05:30'");
    $source->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    $source->beginTransaction();
    $target->beginTransaction();
    $target->exec(file_get_contents(__DIR__.'/supabase-schema.sql'));
    // Block concurrent target writes while checking emptiness and copying.
    $target->exec('LOCK TABLE '.implode(',',$tables).',account_emails IN ACCESS EXCLUSIVE MODE');
    foreach (array_merge($tables,['account_emails']) as $table) {
        if ($target->query('SELECT COUNT(*) FROM '.$table)->fetchColumn()) throw new RuntimeException('Target must be empty; refusing to overwrite existing '.$table.' records.');
    }
    foreach ($tables as $table) {
        $rows=$source->query('SELECT * FROM '.$table);$count=0;$insert=null;
        while ($row=$rows->fetch()) {
            if (!$insert) {
                $columns=array_keys($row);
                foreach ($columns as $column) if (!preg_match('/^[a-z_]+$/D',$column)) throw new RuntimeException('Unexpected source column.');
                $insert=$target->prepare('INSERT INTO '.$table.'('.implode(',',$columns).') VALUES('.implode(',',array_fill(0,count($columns),'?')).')');
            }
            $insert->execute(array_values($row));$count++;
        }
        $rows->closeCursor();
        if (!in_array($table,['razorpay_orders','razorpay_enquiry_orders','portal_settings'],true)) {
            $target->query("SELECT setval(pg_get_serial_sequence('$table','id'),COALESCE(MAX(id),1),COUNT(*)>0) FROM $table");
        }
        echo "$table: $count copied\n";
    }
    $target->commit();$source->rollBack();
    echo "Migration complete. Existing passwords, IDs and payment records preserved.\n";
} catch (Throwable $error) {
    if ($target->inTransaction()) $target->rollBack();
    if ($source->inTransaction()) $source->rollBack();
    fwrite(STDERR,"Migration stopped; target row changes rolled back. ".$error->getMessage()."\n");
    exit(1);
}
