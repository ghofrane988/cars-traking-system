<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Controllers
use App\Http\Controllers\VehicleController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\MaintenanceController;
use App\Http\Controllers\GpsLocationController;
use App\Http\Controllers\TripRouteController;
use App\Http\Controllers\CompanySettingController;
use App\Models\Role;

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
*/

Route::post('/login', [EmployeeController::class, 'login']);
Route::post('/forgot-password', [EmployeeController::class, 'forgotPassword']);
Route::post('/reset-password', [EmployeeController::class, 'resetPassword']);

// Public route for mobile app GPS tracking
Route::post('/mobile/gps-locations', [GpsLocationController::class, 'store']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/first-login-pass', [EmployeeController::class, 'setFirstLoginPassword']);

    Route::get('/user', fn($r) => $r->user());
     Route::get('/employees', [EmployeeController::class, 'index']);
    Route::post('/employees', [EmployeeController::class, 'store']);
    Route::get('/employees/{employee}', [EmployeeController::class, 'show']);
    Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
    Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);
    // 🚗 VEHICLES
    Route::middleware('permission:vehicle.view')->group(function () {
        Route::get('/vehicles', [VehicleController::class, 'index']);
        Route::get('/vehicles-available', [VehicleController::class, 'getAvailableForPeriod']);
        Route::get('/vehicles/{vehicle}', [VehicleController::class, 'show']);
    });

    Route::middleware('permission:vehicle.create')->group(function () {
        Route::post('/vehicles', [VehicleController::class, 'store']);
    });

    Route::middleware('permission:vehicle.update')->group(function () {
        Route::put('/vehicles/{vehicle}', [VehicleController::class, 'update']);
    });

    Route::middleware('permission:vehicle.delete')->group(function () {
        Route::delete('/vehicles/{vehicle}', [VehicleController::class, 'destroy']);
    });

    // 📅 RESERVATIONS
    Route::get('/reservations/calendar', [ReservationController::class, 'calendar']);
    Route::middleware('permission:reservation.create')->group(function () {
        Route::post('/reservations', [ReservationController::class, 'store']);
    });

    // Allow viewing/listing reservations (Controller restricts to own data if not admin)
    Route::get('/reservations', [ReservationController::class, 'index']);
    Route::get('/reservations/{reservation}', [ReservationController::class, 'show']);
    Route::put('/reservations/{reservation}', [ReservationController::class, 'update']);
    Route::delete('/reservations/{reservation}', [ReservationController::class, 'destroy']);

    // Add route for returning a vehicle / completing trip
    Route::post('/reservations/{id}/return', [ReservationController::class, 'returnVehicle']);
    Route::post('/reservations/{id}/cancel', [ReservationController::class, 'cancel']);

    Route::middleware('permission:reservation.approve')->group(function () {
        Route::post('/reservations/{id}/approve', [ReservationController::class, 'approve']);
        Route::post('/reservations/{id}/reject', [ReservationController::class, 'reject']);
    });

    // 📊 DASHBOARD
    Route::middleware('permission:dashboard.view')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);
    });

    // Employee personal dashboard (own)
    Route::middleware('permission:dashboard.view.own')->group(function () {
        Route::get('/dashboard/employee/{employeeId}', [DashboardController::class, 'employeeDashboard']);
    });

    // 📍 GPS
    Route::post('/gps-locations/calculate-route', [GpsLocationController::class, 'calculateRoute']);
    Route::middleware('permission:gps.track')->group(function () {
        Route::get('/gps-locations/vehicle/{id}/current', [GpsLocationController::class, 'getCurrentPosition']);
        Route::get('/gps-locations/reservation/{reservationId}', [GpsLocationController::class, 'getByReservation']);
        Route::get('/gps-locations/reservation/{reservationId}/compare', [GpsLocationController::class, 'compareDistance']);
        Route::get('/gps-locations/trip/{reservationId}/stats', [GpsLocationController::class, 'getTripStats']);
        Route::post('/gps-locations/set-simulation-target', [GpsLocationController::class, 'setSimulationTarget']);
        Route::apiResource('gps-locations', GpsLocationController::class);
    });

    // � MAINTENANCES
    Route::middleware('permission:maintenance.view')->group(function () {
        Route::get('/maintenances', [MaintenanceController::class, 'index']);
        Route::get('/maintenances/{maintenance}', [MaintenanceController::class, 'show']);
    });

    Route::middleware('permission:maintenance.create')->group(function () {
        Route::post('/maintenances', [MaintenanceController::class, 'store']);
    });

    Route::middleware('permission:maintenance.update')->group(function () {
        Route::put('/maintenances/{maintenance}', [MaintenanceController::class, 'update']);
        Route::put('/maintenances/{id}/back-to-service', [MaintenanceController::class, 'backToService']);
    });

    Route::middleware('permission:maintenance.delete')->group(function () {
        Route::delete('/maintenances/{maintenance}', [MaintenanceController::class, 'destroy']);
    });

    // �👤 COMMON
    Route::post('/change-password', [EmployeeController::class, 'changePassword']);

    // 🔐 ROLES (used by frontend to populate role select) - admin only
    Route::get('/roles', function () {
        $user = auth()->user();
        if (!$user || !$user->hasRole('admin')) {
            return response()->json(['message' => 'Access denied'], 403);
        }

        return response()->json(Role::select('id', 'name')->get(), 200);
    });

    // 🔔 NOTIFICATIONS
    Route::middleware('permission:notification.view.own')->group(function () {
        Route::get('/notifications/me', [NotificationController::class, 'getMyNotifications']);
    });

    // Get notifications for a specific employee
    Route::middleware('permission:notification.view')->group(function () {
        Route::get('/notifications/{employeeId}', [NotificationController::class, 'getEmployeeNotifications']);
    });

    // Mark a notification as read
    Route::middleware('permission:notification.update')->group(function () {
        Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    });

    // 🏢 COMPANY SETTINGS
    Route::get('/company-settings', [CompanySettingController::class, 'getSettings']);
    Route::middleware('permission:settings.manage')->group(function () {
        Route::put('/company-settings', [CompanySettingController::class, 'updateSettings']);
    });
});