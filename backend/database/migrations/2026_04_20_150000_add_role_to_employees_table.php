<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class AddRoleToEmployeesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('employees', function (Blueprint $table) {
            // nullable to avoid breaking existing installs; we'll populate from pivot if possible
            $table->string('role')->nullable()->after('email');
        });

        // try to populate the role column from the pivot table if it exists
        if (Schema::hasTable('employee_role') && Schema::hasTable('roles')) {
            $mappings = DB::table('employee_role')->get();
            foreach ($mappings as $map) {
                $roleName = DB::table('roles')->where('id', $map->role_id)->value('name');
                if ($roleName) {
                    DB::table('employees')->where('id', $map->employee_id)->update(['role' => $roleName]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
}
