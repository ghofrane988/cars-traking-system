<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\Employee::firstOrCreate(['email' => 'test@example.com'], [
    'nom' => 'Test User',
    'password' => bcrypt('password'),
    'role' => 'admin',
    'tel' => '12345678',
    'is_first_login' => true
]);

$token = $user->createToken('test')->plainTextToken;
echo "Token: $token\n";
