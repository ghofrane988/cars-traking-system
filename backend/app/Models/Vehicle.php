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
        'car_type',
        'latitude',
        'longitude',
        'km',
        'last_maintenance_km',
        'next_maintenance_km',
        'consommation',
        'assurance_date',
        'visite_technique_date',
        'vignette_date',
        'maintenance_start_date',
        'maintenance_end_date'
    ];

    protected $casts = [
        'latitude'               => 'decimal:7',
        'longitude'              => 'decimal:7',
        'km'                     => 'integer',
        'last_maintenance_km'    => 'integer',
        'next_maintenance_km'    => 'integer',
        'maintenance_start_date' => 'datetime',
        'maintenance_end_date'   => 'datetime',
    ];

    protected $appends = ['next_reservation_date'];

    /**
     * Prochaine réservation approuvée future (pour badge dans le frontend)
     */
    public function getNextReservationDateAttribute(): ?string
    {
        $next = $this->reservations()
            ->whereIn('status', ['approved', 'in_progress'])
            ->where('date_debut', '>', now())
            ->orderBy('date_debut')
            ->first();

        return $next ? $next->date_debut->toDateTimeString() : null;
    }

    // ─────────────────────────────────────────────────────────────
    // Démarre la maintenance automatiquement quand l'heure est venue
    // ─────────────────────────────────────────────────────────────
    public function updateEffectiveStatus(): void
    {
        $now = now();
        \Log::info('[Vehicle #' . $this->id . '] updateEffectiveStatus() called', [
            'maintenance_start_date' => $this->maintenance_start_date?->toDateTimeString(),
            'maintenance_end_date'   => $this->maintenance_end_date?->toDateTimeString(),
            'now'                    => $now->toDateTimeString(),
            'timezone'               => config('app.timezone'),
            'statut'                 => $this->statut,
        ]);

        // ── 1. Démarrage automatique de la maintenance ──────────
        // Démarrer si date de début atteinte et pas déjà en maintenance
        if (
            $this->maintenance_start_date !== null
            && $this->maintenance_start_date->lte($now)
            && $this->statut !== 'En maintenance'
        ) {
            $this->statut = 'En maintenance';
            $this->saveQuietly();

            \Log::info('[Vehicle #' . $this->id . '] → statut changé en "En maintenance"');
        } else {
            \Log::info('[Vehicle #' . $this->id . '] → pas de changement', [
                'has_start'  => $this->maintenance_start_date !== null,
                'start_lte'  => $this->maintenance_start_date?->lte($now),
                'not_maint'  => $this->statut !== 'En maintenance',
            ]);
        }

        // ── 2. Fin automatique de la maintenance ────────────────
        // FIX : on exige que maintenance_end_date soit dans le passé ET que
        // ce soit une clôture "définitive" (on ne reset que si end_date < now() - 1 min)
        // pour éviter le reset immédiat lors de la mise à jour du controller.
        if (
            $this->maintenance_end_date !== null
            && $this->maintenance_end_date->lt(now()->subMinute()) // passé d'au moins 1 minute
            && $this->statut === 'En maintenance'
        ) {
            $this->statut                  = 'Disponible';
            $this->maintenance_start_date  = null;
            $this->maintenance_end_date    = null;
            $this->saveQuietly();

            \Log::info('[Vehicle #' . $this->id . '] → statut changé en "Disponible" (maintenance terminée)');
        }

        // ── 3. Démarrage automatique d'une réservation approuvée ──────────
        // Si pas en maintenance, vérifier s'il y a une réservation approuvée active
        if ($this->statut !== 'En maintenance') {
            $activeReservation = $this->reservations()
                ->whereIn('status', ['approved', 'in_progress'])
                ->where('date_debut', '<=', $now)
                ->where(function ($q) use ($now) {
                    $q->whereNull('date_fin')
                      ->orWhere('date_fin', '>=', $now);
                })
                ->first();

            \Log::info('[Vehicle #' . $this->id . '] Réservation check', [
                'active_reservation_id' => $activeReservation?->id,
                'current_statut'        => $this->statut,
            ]);

            if ($activeReservation && $this->statut !== 'Affecté') {
                $this->statut = 'Affecté';
                $this->saveQuietly();

                \Log::info('[Vehicle #' . $this->id . '] → statut changé en "Affecté" (réservation #' . $activeReservation->id . ' démarrée)');
            }
        }

        // ── 4. Fin automatique d'une réservation ────────────────
        // Si Affecté mais qu'aucune réservation n'est plus active → Disponible
        if ($this->statut === 'Affecté') {
            $stillActive = $this->reservations()
                ->whereIn('status', ['approved', 'in_progress'])
                ->where('date_debut', '<=', $now)
                ->where(function ($q) use ($now) {
                    $q->whereNull('date_fin')
                      ->orWhere('date_fin', '>=', $now);
                })
                ->exists();

            \Log::info('[Vehicle #' . $this->id . '] Fin réservation check', [
                'still_active' => $stillActive,
            ]);

            if (!$stillActive) {
                $this->statut = 'Disponible';
                $this->saveQuietly();

                \Log::info('[Vehicle #' . $this->id . '] → statut changé en "Disponible" (réservation terminée)');
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Scope : exclut les véhicules effectivement en maintenance
    // (active ou planifiée et démarrée)
    // ─────────────────────────────────────────────────────────────
    public function scopeNotInEffectiveMaintenance($query)
    {
        return $query->where(function ($q) {

            // Cas 1 : pas de maintenance planifiée du tout
            $q->whereNull('maintenance_start_date')

              // Cas 2 : maintenance planifiée mais pas encore commencée
              ->orWhere('maintenance_start_date', '>', now())

              // FIX : Cas 3 : maintenance_end_date dans le PASSÉ seulement
              // (maintenance terminée), pas dans le futur
              ->orWhere(function ($sub) {
                  $sub->whereNotNull('maintenance_end_date')
                      ->where('maintenance_end_date', '<', now());
              });
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Relations
    // ─────────────────────────────────────────────────────────────
    public function maintenances()
    {
        return $this->hasMany(Maintenance::class);
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }
}