<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Models\Reservation;
use App\Models\Maintenance;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get admin dashboard statistics
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        $now = Carbon::now();
        $currentYear = $now->year;
        $currentMonth = $now->month;

        // Vehicle statistics
        $vehicleStats = [
            'total' => Vehicle::count(),
            'disponible' => Vehicle::where('statut', 'Disponible')->count(),
            'reserve' => Vehicle::where('statut', 'Affecté')->count(),
            'maintenance' => Vehicle::where('statut', 'En maintenance')->count(),
            'panne' => Vehicle::where('statut', 'En panne')->count(),
        ];

        // Reservation statistics
        $reservationStats = [
            'total' => Reservation::count(),
            'pending' => Reservation::where('status', 'pending')->count(),
            'approved' => Reservation::where('status', 'approved')->count(),
            'rejected' => Reservation::where('status', 'rejected')->count(),
            'this_month' => Reservation::whereMonth('created_at', $currentMonth)
            ->whereYear('created_at', $currentYear)
            ->count(),
        ];

        // Monthly reservation stats for chart
        $reservationsByMonth = Reservation::select(
            DB::raw('MONTH(created_at) as month'),
            DB::raw('COUNT(*) as count')
        )
            ->whereYear('created_at', $currentYear)
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
            return [
            'month' => Carbon::create()->month($item->month)->format('F'),
            'count' => $item->count
            ];
        });

        // Monthly maintenance stats for chart
        $maintenancesByMonth = Maintenance::select(
            DB::raw('MONTH(created_at) as month'),
            DB::raw('COUNT(*) as count')
        )
            ->whereYear('created_at', $currentYear)
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
            return [
            'month' => Carbon::create()->month($item->month)->format('F'),
            'count' => $item->count
            ];
        });

        // Top 5 most used vehicles
        $topVehicles = Vehicle::select('vehicles.id', 'vehicles.marque', 'vehicles.modele', 'vehicles.matricule', DB::raw('COUNT(reservations.id) as reservation_count'))
            ->leftJoin('reservations', 'vehicles.id', '=', 'reservations.vehicle_id')
            ->where('reservations.status', 'approved')
            ->groupBy('vehicles.id', 'vehicles.marque', 'vehicles.modele', 'vehicles.matricule')
            ->orderByDesc('reservation_count')
            ->limit(10)
            ->get();

        // Recent pending reservations for alerts
        $pendingReservations = Reservation::with(['employee', 'vehicle'])
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        // Total employees
        $employeeStats = [
            'total' => Employee::count(),
            'admins' => Employee::where('role', 'admin')->count(),
            'employes' => Employee::where('role', 'employé')->count(),
        ];

        // Maintenance costs this month
        $maintenanceCosts = Maintenance::whereMonth('created_at', $currentMonth)
            ->whereYear('created_at', $currentYear)
            ->sum('cost');

        // 🚨 Maintenance alerts - vehicles close to next maintenance
        $maintenanceAlerts = Vehicle::whereRaw('km + 500 >= next_maintenance_km')
            ->where('statut', '!=', 'En maintenance')
            ->select('id', 'marque', 'modele', 'matricule', 'km', 'next_maintenance_km')
            ->get()
            ->map(function ($vehicle) {
            $vehicle->km_remaining = $vehicle->next_maintenance_km - $vehicle->km;
            return $vehicle;
        });

        // 🔧 Vehicles currently in maintenance
        $inMaintenance = Vehicle::where('statut', 'En maintenance')
            ->with(['maintenances' => function ($query) {
            $query->latest()->first();
        }])
            ->select('id', 'marque', 'modele', 'matricule', 'statut')
            ->get();

        return response()->json([
            'vehicles' => $vehicleStats,
            'reservations' => $reservationStats,
            'employees' => $employeeStats,
            'charts' => [
                'reservations_by_month' => $reservationsByMonth,
                'maintenances_by_month' => $maintenancesByMonth,
            ],
            'top_vehicles' => $topVehicles,
            'pending_reservations' => $pendingReservations,
            'maintenance_costs_this_month' => $maintenanceCosts,
            'maintenance_alerts' => $maintenanceAlerts,
            'in_maintenance' => $inMaintenance,
        ]);
    }

    /**
     * Get employee dashboard statistics
     *
     * @param int $employeeId
     * @return \Illuminate\Http\Response
     */
    public function employeeDashboard($employeeId)
    {
        $now = Carbon::now();
        $currentMonth = $now->month;
        $currentYear = $now->year;

        // Employee's reservation stats
        $myReservations = [
            'total' => Reservation::where('employee_id', $employeeId)->count(),
            'pending' => Reservation::where('employee_id', $employeeId)
            ->where('status', 'pending')
            ->count(),
            'approved' => Reservation::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->count(),
            'rejected' => Reservation::where('employee_id', $employeeId)
            ->where('status', 'rejected')
            ->count(),
            'this_month' => Reservation::where('employee_id', $employeeId)
            ->whereMonth('created_at', $currentMonth)
            ->whereYear('created_at', $currentYear)
            ->count(),
        ];

        // Current active reservation (if any) - approved and not yet completed
        $activeReservation = Reservation::with('vehicle')
            ->where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->where(function ($query) use ($now) {
            $query->whereNull('date_fin')
                ->orWhere('date_fin', '>=', $now);
        })
            ->first();

        // Recent reservations
        $recentReservations = Reservation::with('vehicle')
            ->where('employee_id', $employeeId)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        return response()->json([
            'my_reservations' => $myReservations,
            'active_reservation' => $activeReservation,
            'recent_reservations' => $recentReservations,
        ]);
    }
}