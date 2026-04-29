<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateNotificationsTable extends Migration
{
    public function up()
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();

            // relation
            $table->foreignId('employee_id')
                  ->constrained('employees')
                  ->cascadeOnDelete();

            // content
            $table->string('message');
            $table->string('link')->nullable();

            // state
            $table->boolean('is_read')->default(false);

            $table->timestamps();

            // performance index
            $table->index(['employee_id', 'is_read']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('notifications');
    }
}