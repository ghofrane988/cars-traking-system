<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateGpsLocationsTable extends Migration
{
    public function up()
    {
        Schema::create('gps_locations', function (Blueprint $table) {
            $table->id();

            // Relations
            $table->foreignId('vehicle_id')
                  ->nullable()
                  ->constrained('vehicles')
                  ->cascadeOnDelete();

            $table->foreignId('reservation_id')
                  ->nullable()
                  ->constrained('reservations')
                  ->nullOnDelete();

            // GPS coordinates
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);

            // Tracking data
            $table->decimal('speed', 5, 2)->nullable(); // km/h
            $table->decimal('distance_cumulative', 10, 2)->default(0);

            // Time of record (important pour GPS realtime)
            $table->timestamp('recorded_at');

            $table->timestamps();

            // Index for performance (VERY important)
            $table->index(['vehicle_id', 'recorded_at']);
            $table->index('reservation_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('gps_locations');
    }
}