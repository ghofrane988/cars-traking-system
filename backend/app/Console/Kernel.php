<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use App\Models\Vehicle;


class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        // $schedule->command('inspire')->hourly();

        // Vérifie chaque minute les maintenances et réservations à activer/désactiver
        $schedule->call(function () {
            // ── Véhicules avec maintenance planifiée à démarrer ──
            Vehicle::whereNotNull('maintenance_start_date')
                ->where('maintenance_start_date', '<=', now())
                ->where('statut', '!=', 'En maintenance')
                ->each(function ($vehicle) {
                    $vehicle->updateEffectiveStatus();
                });

            // ── Véhicules avec réservation approuvée à démarrer ou terminer ──
            Vehicle::whereHas('reservations', function ($query) {
                $query->whereIn('status', ['approved', 'in_progress'])
                      ->where('date_debut', '<=', now());
            })
            ->where('statut', '!=', 'En maintenance')
            ->each(function ($vehicle) {
                $vehicle->updateEffectiveStatus();
            });
        })->everyMinute();

        // Optionnel : Log pour debug
        $schedule->call(function () {
            \Log::info('Maintenance scheduler executed at ' . now());
        })->dailyAt('00:02');
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
