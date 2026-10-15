<?php
$path=rawurldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if ($path === '/robots.txt') {
    header('Content-Type: text/plain; charset=UTF-8');
    readfile(__DIR__.'/robots.txt');
    return true;
}
if (preg_match('~(?:^|/)(?:\.|database|uploads|tests|config\.php|hash\.php|router\.php|start-local\.ps1|server\.js|package\.json|.*\.(?:sql|log|patch|txt|ps1|cmd|bat))~i',$path)) { http_response_code(404); exit('Not found'); }
if ($path === '/') { readfile(__DIR__.'/index.html'); return true; }
return false;
