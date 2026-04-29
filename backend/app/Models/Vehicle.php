<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vehicle extends Model
{
    use HasFactory;
    protected $fillable = [
        'marque',
        'modele',
        'matricule',
        'annee',
        'statut',
        'latitude',
        'longitude',
        'km',
        'last_maintenance_km',
        'next_maintenance_km',
        'consommation',
        'assurance_date',
        'visite_technique_date',
        'vignette_date'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'km' => 'integer',
        'last_maintenance_km' => 'integer',
        'next_maintenance_km' => 'integer',
    ];

    public function maintenances()
    {
        return $this->hasMany(Maintenance::class);
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }
}