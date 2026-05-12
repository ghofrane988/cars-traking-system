<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddRequestedVehicleTypeToReservationsTable extends Migration
{
    public function up()
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->enum('requested_vehicle_type', ['passenger', 'commercial', 'mixed'])
                  ->nullable()
                  ->after('destination');
        });
    }

    public function down()
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn('requested_vehicle_type');
        });
    }
}
