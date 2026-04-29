<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run()
    {
        // ROLES
        $admin = Role::firstOrCreate(['name' => 'admin']);
        $responsable = Role::firstOrCreate(['name' => 'responsable']);
        $employee = Role::firstOrCreate(['name' => 'employee']);

        // PERMISSIONS
        $permissions = [
            'vehicle.create',
            'vehicle.update',
            'vehicle.delete',
            'vehicle.view',
            'employee.view',

            'reservation.create',
            'reservation.view',
            'reservation.view.own',
            'reservation.approve',
            'reservation.reject',
            'reservation.return',
            'reservation.update.own',
            'reservation.delete.own',

            'dashboard.view',
            'dashboard.view.own',
            'gps.track',

            'maintenance.view',
            'maintenance.create',

            'notification.view',
            'notification.update',
            'notification.view.own',
            'notification.update.own',
            'settings.manage',
        ];

        $perm = [];

        foreach ($permissions as $p) {
            $perm[$p] = Permission::firstOrCreate(['name' => $p]);
        }

        // ADMIN FULL ACCESS
        $admin->permissions()->sync(array_values(array_map(fn($p) => $p->id, $perm)));

        // RESPONSABLE
        $responsable->permissions()->sync([
            // Vehicles: view + update (status)
            $perm['vehicle.view']->id,
            $perm['vehicle.update']->id,

            // Reservations: view, approve/reject, mark return
            $perm['reservation.view']->id,
            $perm['reservation.approve']->id,
            $perm['reservation.reject']->id,
            $perm['reservation.return']->id,

            // Dashboard
            $perm['dashboard.view']->id,
            $perm['dashboard.view.own']->id,

            // GPS (read-only)
            $perm['gps.track']->id,

            // Maintenance: view + create requests
            $perm['maintenance.view']->id,
            $perm['maintenance.create']->id,

            // Notifications: view + mark as read
            $perm['notification.view']->id,
            $perm['notification.update']->id,
            $perm['notification.view.own']->id,
            $perm['notification.update.own']->id,
            $perm['employee.view']->id,
        ]);

        // EMPLOYEE
        $employee->permissions()->sync([
            $perm['reservation.create']->id,
            $perm['vehicle.view']->id,
            // own reservation actions
            $perm['reservation.view.own']->id,
            $perm['reservation.update.own']->id,
            $perm['reservation.delete.own']->id,
            // own notifications
            $perm['notification.view.own']->id,
            $perm['notification.update.own']->id,
            // own dashboard
            $perm['dashboard.view.own']->id,
        ]);
    }
}