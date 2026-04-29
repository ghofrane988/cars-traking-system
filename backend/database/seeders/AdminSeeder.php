<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Employee;
use Illuminate\Support\Facades\Hash;
use App\Models\Role;


class AdminSeeder extends Seeder
{
    public function run()
{
    $adminRole = Role::firstOrCreate(['name' => 'admin']);

    $admin = Employee::firstOrCreate([
        'email' => 'admin@system.com'
    ], [
        'nom' => 'Admin',
        'password' => Hash::make('123456'),
        'tel' => '00000000',
    ]);

    $admin->roles()->sync([$adminRole->id]);
}
}