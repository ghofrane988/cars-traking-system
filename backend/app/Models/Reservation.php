<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'employee_id',
        'date_debut',
        'date_fin',
        'mission',
        'destination',
        'requested_vehicle_type',
        'status',
        'start_lat',
        'start_lng',
        'end_lat',
        'end_lng',
        'estimated_distance',
        'estimated_duration',
        'km_debut',
        'km_fin',
    ];

    protected $casts = [
        'date_debut' => 'datetime',
        'date_fin' => 'datetime',
    ];

    // 🔥 Default value
    protected $attributes = [
        'status' => 'pending',
    ];

    // =========================
    // Relations
    // =========================

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function tripRoute()
    {
        return $this->hasOne(TripRoute::class);
    }

    // =========================
    // 🔥 Scopes (pro level)
    // =========================

    // reservations approuvées
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    // reservations en attente
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    // reservations refusées
    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }
}