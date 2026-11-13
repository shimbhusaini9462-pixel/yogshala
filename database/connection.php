<?php
// This file is server-only. API keys are not PostgreSQL credentials.
function loadDatabaseEnvironment(): void {
    $file=dirname(__DIR__).'/.env';
    if (!is_file($file)) return;
    foreach (file($file, FILE_IGNORE_NEW_LINES) as $line) {
        $line=trim($line);
        if ($line==='' || $line[0]==='#' || !str_contains($line,'=')) continue;
        [$name,$value]=explode('=',$line,2);
        $name=trim($name); $value=trim($value);
        if (!preg_match('/^[A-Z_][A-Z0-9_]*$/D',$name) || getenv($name)!==false) continue;
        if (strlen($value)>=2 && (($value[0]==='"' && str_ends_with($value,'"')) || ($value[0]==="'" && str_ends_with($value,"'")))) $value=substr($value,1,-1);
        putenv($name.'='.$value);
    }
}
loadDatabaseEnvironment();
function databaseDriver(): string {
    return getenv('DATABASE_URL') ? 'pgsql' : (getenv('DB_DRIVER') ?: 'mysql');
}
function connectDatabase(bool $selectDatabase=true): PDO {
    $driver=databaseDriver();
    $options=[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false];
    if ($driver==='pgsql') {
        if (!in_array('pgsql',PDO::getAvailableDrivers(),true)) throw new RuntimeException('Enable extension=pdo_pgsql in PHP php.ini.');
        $url=parse_url(getenv('DATABASE_URL') ?: '');
        if (!$url || !in_array($url['scheme'] ?? '',['postgres','postgresql'],true) || empty($url['host']) || !isset($url['user'],$url['pass'])) throw new RuntimeException('Set DATABASE_URL to your Supabase Session pooler connection URI in .env.');
        parse_str($url['query'] ?? '',$query);
        $ssl=$query['sslmode'] ?? 'require';
        if (!in_array($ssl,['require','verify-ca','verify-full'],true)) throw new RuntimeException('PostgreSQL requires SSL.');
        $name=rawurldecode(ltrim($url['path'] ?? '/postgres','/'));
        foreach ([$url['host'],$name] as $part) if (!preg_match('/^[a-zA-Z0-9_.-]+$/D',$part)) throw new RuntimeException('Invalid PostgreSQL host or database name.');
        $dsn='pgsql:host='.$url['host'].';port='.($url['port'] ?? 5432).';dbname='.$name.';sslmode='.$ssl.';connect_timeout=10';
        $pdo=new PDO($dsn,rawurldecode($url['user']),rawurldecode($url['pass']),$options);
        $pdo->exec("SET TIME ZONE 'Asia/Kolkata'");
        $pdo->exec('SET search_path TO public');
        return $pdo;
    }
    if ($driver!=='mysql') throw new RuntimeException('Unsupported DB_DRIVER.');
    $dsn='mysql:host='.(getenv('DB_HOST') ?: '127.0.0.1').';port='.(getenv('DB_PORT') ?: '3306').($selectDatabase ? ';dbname='.(getenv('DB_NAME') ?: 'yogshala_local') : '').';charset=utf8mb4';
    $pdo=new PDO($dsn,getenv('DB_USER') ?: 'root',getenv('DB_PASSWORD') ?: '',$options);
    $pdo->exec("SET time_zone = '+05:30'");
    return $pdo;
}
function databaseSql(PDO $pdo,string $mysql,string $postgres): string {
    return $pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='pgsql' ? $postgres : $mysql;
}
function databaseInsertId(PDO $pdo,string $table): string {
    if (!in_array($table,['schedules','enquiries','live_classes'],true)) throw new InvalidArgumentException('Unsupported identity table.');
    return $pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='pgsql' ? $pdo->lastInsertId($table.'_id_seq') : $pdo->lastInsertId();
}
