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

        // ── 1. Véhicules actifs aujourd'hui ──
        $activeToday = Vehicle::where(function ($q) use ($now) {
            $q->where('statut', 'En maintenance')
              ->orWhere(function ($sub) use ($now) {
                  $sub->where('statut', 'Affecté')
                      ->whereHas('reservations', function ($r) use ($now) {
                          $r->whereIn('status', ['approved', 'in_progress'])
                            ->where('date_debut', '<=', $now)
                            ->where(function ($d) use ($now) {
                                $d->whereNull('date_fin')
                                  ->orWhere('date_fin', '>=', $now);
                            });
                      });
              });
        })->select('id', 'marque', 'modele', 'matricule', 'statut')->get();

        // ── 2. Maintenances cette semaine ──
        $weekStart = $now->copy()->startOfWeek();
        $weekEnd = $now->copy()->endOfWeek();
        $maintenancesThisWeek = Vehicle::whereNotNull('maintenance_start_date')
            ->whereBetween('maintenance_start_date', [$weekStart, $weekEnd])
            ->select('id', 'marque', 'modele', 'matricule', 'maintenance_start_date', 'maintenance_end_date')
            ->get();

        // ── 3. Réservations 7 derniers jours ──
        $last7Days = collect(range(0, 6))->map(function ($i) use ($now) {
            $day = $now->copy()->subDays($i)->startOfDay();
            $count = Reservation::whereDate('created_at', $day)->count();
            return [
                'day' => $day->format('D'),
                'full_date' => $day->format('Y-m-d'),
                'count' => $count,
            ];
        })->reverse()->values();

        // ── 4. Réservations semaine précédente ──
        $prev7Days = collect(range(7, 13))->map(function ($i) use ($now) {
            $day = $now->copy()->subDays($i)->startOfDay();
            $count = Reservation::whereDate('created_at', $day)->count();
            return [
                'day' => $day->format('D'),
                'full_date' => $day->format('Y-m-d'),
                'count' => $count,
            ];
        })->reverse()->values();

        // ── 5. Assurance expirant dans 30j ──
        $insuranceExpiring = Vehicle::whereNotNull('assurance_date')
            ->where('assurance_date', '<=', $now->copy()->addDays(30))
            ->select('id', 'marque', 'modele', 'matricule', 'assurance_date')
            ->orderBy('assurance_date')
            ->get()
            ->map(function ($v) use ($now) {
                $daysLeft = $now->diffInDays($v->assurance_date, false);
                $v->days_until_expiry = $daysLeft;
                $v->is_expired = $daysLeft < 0;
                return $v;
            });

        // ── 6. Dates réservations approuvées (calendrier) ──
        $approvedReservationsDates = Reservation::whereIn('status', ['approved', 'in_progress'])
            ->whereNotNull('date_debut')
            ->select('id', 'date_debut', 'date_fin', 'mission', 'status')
            ->get()
            ->map(function ($r) {
                return [
                    'id' => $r->id,
                    'date' => $r->date_debut->format('Y-m-d'),
                    'date_fin' => $r->date_fin ? $r->date_fin->format('Y-m-d') : null,
                    'mission' => $r->mission,
                    'status' => $r->status,
                ];
            });

        // ── 7. Heatmap destinations ──
        $destinationHeatmap = Reservation::whereIn('status', ['approved', 'in_progress', 'completed'])
            ->whereNotNull('destination')
            ->select('destination', DB::raw('COUNT(*) as count'), 'end_lat', 'end_lng')
            ->groupBy('destination', 'end_lat', 'end_lng')
            ->orderByDesc('count')
            ->limit(15)
            ->get();

        return response()->json([
            'vehicles' => $vehicleStats,
            'reservations' => $reservationStats,
            'employees' => $employeeStats,
            'charts' => [
                'reservations_by_month' => $reservationsByMonth,
                'maintenances_by_month' => $maintenancesByMonth,
                'reservations_last_7_days' => $last7Days,
                'reservations_previous_7_days' => $prev7Days,
            ],
            'top_vehicles' => $topVehicles,
            'pending_reservations' => $pendingReservations,
            'maintenance_costs_this_month' => $maintenanceCosts,
            'maintenance_alerts' => $maintenanceAlerts,
            'in_maintenance' => $inMaintenance,
            'active_today' => [
                'count' => $activeToday->count(),
                'list' => $activeToday,
            ],
            'maintenances_this_week' => [
                'count' => $maintenancesThisWeek->count(),
                'list' => $maintenancesThisWeek,
            ],
            'insurance_expiring' => $insuranceExpiring,
            'approved_reservations_dates' => $approvedReservationsDates,
            'destination_heatmap' => $destinationHeatmap,
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

        // Current active reservation (if any) - in_progress OR approved with today's date
        $today = $now->copy()->startOfDay();
        $activeReservation = Reservation::with('vehicle')
            ->where('employee_id', $employeeId)
            ->where(function ($query) use ($today, $now) {
                // Truly in progress
                $query->where('status', 'in_progress')
                      // Or approved and started today
                      ->orWhere(function ($sub) use ($today, $now) {
                          $sub->where('status', 'approved')
                              ->whereDate('date_debut', '<=', $now)
                              ->where(function ($d) use ($now) {
                                  $d->whereNull('date_fin')
                                    ->orWhere('date_fin', '>=', $now);
                              });
                      });
            })
            ->first();

        // Future planned reservations (approved, date in future)
        $plannedReservations = Reservation::with('vehicle')
            ->where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->whereDate('date_debut', '>', $now)
            ->orderBy('date_debut', 'asc')
            ->limit(5)
            ->get();

        // Recent reservations (history)
        $recentReservations = Reservation::with('vehicle')
            ->where('employee_id', $employeeId)
            ->whereIn('status', ['completed', 'rejected', 'cancelled'])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        return response()->json([
            'my_reservations' => $myReservations,
            'active_reservation' => $activeReservation,
            'planned_reservations' => $plannedReservations,
            'recent_reservations' => $recentReservations,
        ]);
    }
}