<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vehicle;
use App\Models\Reservation;
use App\Models\Maintenance;
use Carbon\Carbon;

class DashboardSeeder extends Seeder
{
    public function run()
    {
        // 🚗 Vehicles
        Vehicle::factory()->count(20)->create();

        // 📝 Reservations
        foreach (Vehicle::all() as $vehicle) {
            for ($i = 1; $i <= rand(2,5); $i++) {
                Reservation::create([
                    'vehicle_id' => $vehicle->id,
                    'employee_id' => rand(1,5),
                    'date_debut' => Carbon::now()->subDays(rand(1,90)),
                    'date_fin' => Carbon::now()->subDays(rand(0,89)),
                    'mission' => 'Mission '.$i,
                    'status' => 'approved'
                ]);
            }
        }

        // 🛠 Maintenances
        foreach (Vehicle::inRandomOrder()->take(5)->get() as $vehicle) {
            Maintenance::create([
                'vehicle_id' => $vehicle->id,
                'type' => 'Révision',
                'description' => 'Maintenance régulière',
                'cost' => rand(50, 300),
                'return_date' => Carbon::now()->addDays(rand(1,7))
            ]);

            $vehicle->statut = 'en maintenance';
            $vehicle->save();
        }
    }
}
