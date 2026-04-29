<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Role;

class Employee extends Authenticatable
{
    use HasFactory, HasApiTokens;

    // =========================
    // MASS ASSIGNMENT
    // =========================
    protected $fillable = [
        'nom',
        'email',
        'role',
        'password',
        'tel',
        'is_first_login'
    ];

    // =========================
    // RELATIONS
    // =========================
    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }

    // =========================
    // ROLE CHECK
    // =========================
    public function hasRole($role)
    {
        return $this->roles()
            ->where('name', $role)
            ->exists();
    }

    // =========================
    // PERMISSION CHECK
    // =========================
    public function hasPermission($permission)
    {
        return $this->roles
            ->load('permissions')
            ->pluck('permissions')
            ->flatten()
            ->pluck('name')
            ->contains($permission);
    }
}