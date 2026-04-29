<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateVehiclesTable extends Migration
{
    public function up()
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();

            $table->string('marque');
            $table->string('modele');
            $table->string('matricule')->unique();
            $table->year('annee');

            // KM tracking
            $table->integer('km')->default(0);
            $table->integer('last_maintenance_km')->default(0);
            $table->integer('next_maintenance_km')->default(10000);

            // Statut
            $table->enum('statut', ['Disponible', 'En maintenance', 'Affecté'])
                  ->default('Disponible');

            // GPS
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();

            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('vehicles');
    }
}