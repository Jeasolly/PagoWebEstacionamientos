<?php
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

echo "PHP Version: " . PHP_VERSION . "\n\n";

// Versión mínima recomendada 
$min = '8.1.0';
echo "Min recommended: $min\n";
echo "Meets minimum? " . (version_compare(PHP_VERSION, $min, '>=') ? "YES" : "NO") . "\n\n";

$required = [
  'curl',
  'json',
  'openssl',
  'mbstring',
  'fileinfo',
];

echo "Required extensions:\n";
foreach ($required as $ext) {
  echo "- $ext: " . (extension_loaded($ext) ? "OK" : "MISSING") . "\n";
}

echo "\nDisabled functions (if any):\n";
$disabled = ini_get('disable_functions') ?: '';
echo ($disabled ? $disabled : "(none)") . "\n";

echo "\nKey ini values:\n";
echo "memory_limit=" . ini_get('memory_limit') . "\n";
echo "upload_max_filesize=" . ini_get('upload_max_filesize') . "\n";
echo "post_max_size=" . ini_get('post_max_size') . "\n";
echo "max_execution_time=" . ini_get('max_execution_time') . "\n";
