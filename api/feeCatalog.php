<?php
require_once __DIR__.'/fee-calculator.php';
header('Content-Type: application/javascript; charset=UTF-8');
header('Cache-Control: no-cache');
echo 'window.yogshalaFeeCatalog = '.json_encode(feeCatalog(),JSON_UNESCAPED_UNICODE|JSON_HEX_TAG|JSON_HEX_AMP).';';
