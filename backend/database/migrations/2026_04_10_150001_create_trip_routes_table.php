<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trip_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained('reservations')->onDelete('cascade');
            $table->foreignId('vehicle_id')->constrained('vehicles')->onDelete('cascade');
            $table->decimal('start_lat', 10, 7);
            $table->decimal('start_lng', 10, 7);
            $table->string('start_address')->nullable();
            $table->decimal('end_lat', 10, 7);
            $table->decimal('end_lng', 10, 7);
            $table->string('end_address')->nullable();
            $table->decimal('estimated_distance', 8, 2); // km estimé
            $table->decimal('actual_distance', 8, 2)->nullable(); // km réel
            $table->integer('estimated_duration')->nullable(); // minutes
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->enum('status', ['planned', 'active', 'completed', 'cancelled'])->default('planned');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_routes');
    }
};
