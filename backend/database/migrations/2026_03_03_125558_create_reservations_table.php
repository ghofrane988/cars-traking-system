<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateReservationsTable extends Migration
{
    public function up()
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();

            // Relations
            $table->foreignId('vehicle_id')
                  ->nullable()
                  ->constrained('vehicles')
                  ->nullOnDelete();

            $table->foreignId('employee_id')
                  ->constrained('employees')
                  ->cascadeOnDelete();

            // Dates
            $table->dateTime('date_debut');
            $table->dateTime('date_fin')->nullable();

            // KM
            $table->integer('km_debut')->nullable();
            $table->integer('km_fin')->nullable();

            // Infos mission
            $table->string('mission');
            $table->string('destination')->nullable();

            // Status (mriguel)
            $table->enum('status', ['pending', 'approved', 'rejected', 'completed'])
                  ->default('pending');

            // GPS
            $table->decimal('start_lat', 10, 8)->nullable();
            $table->decimal('start_lng', 11, 8)->nullable();
            $table->decimal('end_lat', 10, 8)->nullable();
            $table->decimal('end_lng', 11, 8)->nullable();

            // Estimation
            $table->decimal('estimated_distance', 10, 2)->nullable();
            $table->integer('estimated_duration')->nullable();

            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('reservations');
    }
}