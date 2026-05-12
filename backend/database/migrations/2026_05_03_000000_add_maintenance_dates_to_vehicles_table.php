<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {

            $table->dateTime('maintenance_start_date')->nullable();

            $table->dateTime('maintenance_end_date')->nullable();

        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {

            $table->dropColumn([
                'maintenance_start_date',
                'maintenance_end_date'
            ]);

        });
    }
};