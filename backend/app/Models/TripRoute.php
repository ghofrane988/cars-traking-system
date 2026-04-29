<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TripRoute extends Model
{
    use HasFactory;

    protected $fillable = [
        'reservation_id',
        'vehicle_id',
        'start_lat',
        'start_lng',
        'start_address',
        'end_lat',
        'end_lng',
        'end_address',
        'estimated_distance',
        'actual_distance',
        'estimated_duration',
        'started_at',
        'completed_at',
        'status',
    ];

    protected $casts = [
        'start_lat' => 'decimal:7',
        'start_lng' => 'decimal:7',
        'end_lat' => 'decimal:7',
        'end_lng' => 'decimal:7',
        'estimated_distance' => 'decimal:2',
        'actual_distance' => 'decimal:2',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function reservation()
    {
        return $this->belongsTo(Reservation::class);
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }
}
