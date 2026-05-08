<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use App\Models\Notification;
use App\Models\Employee;
use App\Models\CompanySetting;
use App\Models\TripRoute;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ReservationController extends Controller
{
    // 📌 GET /api/reservations - with optional search/filter
    public function index(Request $request)
    {
        $query = Reservation::with('vehicle', 'employee', 'tripRoute');

        // 🔍 Search by mission (partial match)
        if ($request->has('mission') && $request->mission) {
            $query->where('mission', 'like', '%' . $request->mission . '%');
        }

        // 🔍 Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // 🔐 Security: Enforce employee_id filter if the user is NOT an admin
        $user = auth()->user();
        if ($user && !$user->hasRole('admin') && !$user->hasRole('responsable')) {
            // Force the query to ONLY show this employee's reservations, 
            // completely ignoring any malicious employee_id they might have sent
            $query->where('employee_id', $user->id);
        }
        else {
            // User is admin, allow them to filter by employee_id if they want
            if ($request->has('employee_id') && $request->employee_id) {
                $query->where('employee_id', $request->employee_id);
            }
        }

        // 🔍 Filter by vehicle
        if ($request->has('vehicle_id') && $request->vehicle_id) {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        // 🔍 Filter by date range
        if ($request->has('date_debut') && $request->date_debut) {
            $query->where('date_debut', '>=', $request->date_debut);
        }
        if ($request->has('date_fin') && $request->date_fin) {
            $query->where('date_fin', '<=', $request->date_fin);
        }

        // 🔍 Global search (searches in mission, vehicle info, employee name)
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('mission', 'like', '%' . $search . '%')
                    ->orWhereHas('vehicle', function ($vq) use ($search) {
                    $vq->where('marque', 'like', '%' . $search . '%')
                        ->orWhere('modele', 'like', '%' . $search . '%')
                        ->orWhere('matricule', 'like', '%' . $search . '%');
                }
                )
                    ->orWhereHas('employee', function ($eq) use ($search) {
                    $eq->where('nom', 'like', '%' . $search . '%')
                        ->orWhere('email', 'like', '%' . $search . '%');
                }
                );
            });
        }

        $reservations = $query->orderBy('created_at', 'desc')->get();
        return response()->json($reservations);
    }

    // 📌 POST /api/reservations (Employee)
    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'vehicle_id' => 'nullable|exists:vehicles,id',
            'date_debut' => 'required|date',
            'date_fin' => 'nullable|date|after_or_equal:date_debut',
            'mission' => 'required|string',
            'destination' => 'nullable|string',
            'requested_vehicle_type' => 'nullable|in:passenger,commercial,mixed',
            'start_lat' => 'nullable|numeric|between:-90,90',
            'start_lng' => 'nullable|numeric|between:-180,180',
            'end_lat' => 'nullable|numeric|between:-90,90',
            'end_lng' => 'nullable|numeric|between:-180,180',
            'estimated_distance' => 'nullable|numeric|min:0',
            'estimated_duration' => 'nullable|integer|min:0',
        ]);

        $startLat = $request->start_lat;
        $startLng = $request->start_lng;

        // 🏢 Default to Company Parking if not provided
        if (!$startLat || !$startLng) {
            $settings = CompanySetting::first();
            if ($settings) {
                $startLat = $settings->parking_lat;
                $startLng = $settings->parking_lng;
            }
            else {
                // Fallback to Tunis default if nothing set
                $startLat = 36.8065;
                $startLng = 10.1815;
            }
        }

        $reservation = Reservation::create([
            'employee_id' => $request->employee_id,
            'vehicle_id' => $request->vehicle_id,
            'date_debut' => $request->date_debut,
            'date_fin' => $request->date_fin,
            'mission' => $request->mission,
            'destination' => $request->destination,
            'requested_vehicle_type' => $request->requested_vehicle_type,
            'start_lat' => $startLat,
            'start_lng' => $startLng,
            'end_lat' => $request->end_lat,
            'end_lng' => $request->end_lng,
            'estimated_distance' => $request->estimated_distance,
            'estimated_duration' => $request->estimated_duration,
            'status' => 'pending',
        ]);

        // 🔔 Notification pour tous les admins et responsables
        $employee = Employee::find($request->employee_id);
        $managers = Employee::whereIn('role', ['admin', 'responsable'])->get();

        foreach ($managers as $manager) {
            Notification::create([
                'employee_id' => $manager->id,
                'message' => '📋 Nouvelle demande de ' . $employee->nom . ' : ' . $request->mission,
                'link' => '/reservations'
            ]);
        }

        return response()->json($reservation->load('vehicle', 'employee'), 201);
    }

    // 📌 GET /api/reservations/{id}
    public function show(Reservation $reservation)
    {
        $reservation->load('vehicle', 'employee');
        return response()->json($reservation);
    }

    // 📌 PUT /api/reservations/{id}
    public function update(Request $request, Reservation $reservation)
    {
        $user = auth()->user();

        // 🔐 Security: Only owner or admin/responsable
        if ($user->id !== $reservation->employee_id && !$user->hasRole('admin') && !$user->hasRole('responsable')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // 🛡️ Business Rule: Only PENDING reservations can be modified
        if ($reservation->status !== 'pending') {
            return response()->json(['message' => 'Seules les réservations en attente peuvent être modifiées.'], 400);
        }

        $request->validate([
            'date_debut' => 'sometimes|required|date',
            'date_fin' => 'sometimes|nullable|date|after_or_equal:date_debut',
            'mission' => 'sometimes|required|string',
            'destination' => 'sometimes|nullable|string',
            'start_lat' => 'sometimes|numeric',
            'start_lng' => 'sometimes|numeric',
            'end_lat' => 'sometimes|numeric',
            'end_lng' => 'sometimes|numeric',
            'estimated_distance' => 'sometimes|numeric',
            'estimated_duration' => 'sometimes|numeric',
        ]);

        // 🔥 Update permitted fields
        $reservation->update($request->only([
            'date_debut',
            'date_fin',
            'mission',
            'destination',
            'start_lat',
            'start_lng',
            'end_lat',
            'end_lng',
            'estimated_distance',
            'estimated_duration'
        ]));

        return response()->json($reservation);
    }

    // 📌 DELETE /api/reservations/{id}
    public function destroy(Reservation $reservation)
    {
        $user = auth()->user();
        if (!$user || !$user->hasRole('admin')) {
            return response()->json(['message' => 'Seul l\'administrateur peut supprimer une réservation.'], 403);
        }
        $reservation->delete();
        return response()->json(null, 204);
    }

    // ==============================
    // 🔥 ADMIN ACTIONS
    // ==============================

    // ✅ APPROVE + affect vehicle + auto update status
    public function approve(Request $request, $id)
    {
        Log::info('APPROVE METHOD CALLED for reservation ' . $id);

        $reservation = Reservation::findOrFail($id);
        $vehicle_id = $request->vehicle_id;
        $start = $reservation->date_debut;
        $end = $reservation->date_fin;

        Log::info('Approving reservation ' . $id . ' with vehicle ' . $vehicle_id);
        Log::info('Current status: ' . $reservation->status);

        // 🔍 Check for conflicts if date_fin exists
        if ($end !== null) {
            $exists = Reservation::where('vehicle_id', $vehicle_id)
                ->where('id', '!=', $id)
                ->whereNotIn('status', ['rejected', 'cancelled'])
                ->where(function ($query) use ($start, $end) {
                $query->where('date_debut', '<=', $end)
                    ->where('date_fin', '>=', $start);
            })
                ->exists();

            if ($exists) {
                Log::info('CONFLICT: Vehicle ' . $vehicle_id . ' already reserved between ' . $start . ' and ' . $end);
                return response()->json([
                    'error' => 'Vehicle already reserved in this period'
                ], 400);
            }
            Log::info('No conflict found for vehicle ' . $vehicle_id);
        }
        else {
            Log::info('No date_fin set, skipping conflict check');
        }

        // ✅ handle re-assignment: release old vehicle if it changes
        $oldVehicle = $reservation->vehicle;
        if ($oldVehicle && $oldVehicle->id != $vehicle_id) {
            if ($oldVehicle->statut === 'Affecté') {
                $oldVehicle->statut = 'Disponible';
                $oldVehicle->save();
                Log::info('Old vehicle ' . $oldVehicle->id . ' released (set to Disponible)');
            }
        }

        // ✅ approve reservation
        $reservation->vehicle_id = $vehicle_id;
        $reservation->status = 'approved';
        $reservation->save();

        Log::info('Reservation ' . $id . ' approved/updated! New status: ' . $reservation->fresh()->status);

        // �️ Auto-create TripRoute for GPS tracking
        TripRoute::updateOrCreate(
            ['reservation_id' => $reservation->id],
            [
                'vehicle_id' => $vehicle_id,
                'start_lat' => $reservation->start_lat,
                'start_lng' => $reservation->start_lng,
                'end_lat' => $reservation->end_lat,
                'end_lng' => $reservation->end_lng,
                'estimated_distance' => $reservation->estimated_distance,
                'estimated_duration' => $reservation->estimated_duration,
                'status' => 'planned',
            ]
        );
        Log::info('TripRoute created/updated for reservation ' . $id);

        // � Auto Update New Vehicle Status
        $newVehicle = \App\Models\Vehicle::find($vehicle_id);
        if ($newVehicle) {
            // Si la réservation commence maintenant ou dans le passé → Affecté immédiatement
            // Si la réservation est future → garder Disponible, le scheduler s'en occupera
            if ($reservation->date_debut->lte(now())) {
                $newVehicle->statut = 'Affecté';
                Log::info('New vehicle ' . $vehicle_id . ' status updated to Affecté (reservation starts now or past)');
            } else {
                Log::info('New vehicle ' . $vehicle_id . ' kept Disponible (reservation starts at ' . $reservation->date_debut . ')');
            }
            $newVehicle->save();
        }

        // 🔔 Create notification for employee with vehicle details
        $vehicleInfo = $newVehicle ? ($newVehicle->marque . ' ' . $newVehicle->modele . ' (' . $newVehicle->matricule . ')') : 'Non assigné';
        Notification::create([
            'employee_id' => $reservation->employee_id,
            'message' => '✅ Votre réservation a été mise à jour ! Nouveau véhicule assigné: ' . $vehicleInfo,
            'link' => '/reservations'
        ]);

        return response()->json([
            'message' => 'Reservation approved successfully & vehicle assigned',
            'reservation' => $reservation->load('vehicle', 'employee')
        ]);
    }

    // ❌ REJECT + release vehicle if needed
    public function reject(Request $request, $id)
    {
        $reservation = Reservation::findOrFail($id);

        $reservation->status = 'rejected';
        $reservation->cancellation_reason = $request->reason;
        $reservation->save();

        // 🔄 Release vehicle if it was assigned
        if ($reservation->vehicle) {
            $vehicle = $reservation->vehicle;
            // فقط إذا كانت السيارة كانت Affecté لهذه الحجز
            if ($vehicle->statut === 'Affecté') {
                $vehicle->statut = 'Disponible';
                $vehicle->save();
            }
        }

        // 🔔 Create notification
        $reasonMsg = $request->reason ? (' Raison: ' . $request->reason) : '';
        Notification::create([
            'employee_id' => $reservation->employee_id,
            'message' => 'Votre réservation a été refusée ❌.' . $reasonMsg
        ]);

        return response()->json([
            'message' => 'Reservation rejected & vehicle released'
        ]);
    }

    // 🔹 GET /api/reservations/calendar
    public function calendar()
    {
        $user = auth()->user();
        $query = Reservation::with(['vehicle', 'employee']);

        // Filter for employees to see only their own reservations
        if (!$user->hasRole('admin') && !$user->hasRole('responsable')) {
            $query->where('employee_id', $user->id);
        }
        $reservations = $query->get();

        $events = $reservations->map(function ($res) {
            $colors = $this->getStatusColors($res->status);

            // Use copy() to avoid mutating the original date_debut object
            $startTime = $res->date_debut;
            $endTime = $res->date_fin ?: $res->date_debut->copy()->addHours(2);

            return [
            'id' => $res->id,
            'title' => ($res->vehicle ? $res->vehicle->marque : 'En attente') . ' - ' . $res->employee->nom,
            'start' => $startTime->toIso8601String(),
            'end' => $endTime->toIso8601String(),
            'status' => $res->status,
            'mission' => $res->mission,
            'employee' => $res->employee->nom,
            'vehicle' => $res->vehicle ? ($res->vehicle->marque . ' ' . $res->vehicle->modele) : 'Non assigné',
            'backgroundColor' => $colors['bg'],
            'borderColor' => $colors['border'],
            'textColor' => $colors['text']
            ];
        });

        return response()->json($events);
    }

    private function getStatusColors($status)
    {
        switch ($status) {
            case 'pending':
                return ['bg' => '#fef3c7', 'border' => '#fbbf24', 'text' => '#b45309']; // Soft Amber
            case 'approved':
                return ['bg' => '#dcfce7', 'border' => '#4ade80', 'text' => '#15803d']; // Soft Emerald
            case 'in_progress':
                return ['bg' => '#e0f2fe', 'border' => '#38bdf8', 'text' => '#0369a1']; // Soft Sky Blue
            case 'completed':
                return ['bg' => '#e2e8f0', 'border' => '#94a3b8', 'text' => '#475569']; // Soft Slate (Visible)
            case 'cancelled':
                return ['bg' => '#fdf2f8', 'border' => '#f472b6', 'text' => '#be185d']; // Soft Pink
            case 'rejected':
                return ['bg' => '#f5f3ff', 'border' => '#a78bfa', 'text' => '#5b21b6']; // Soft Purple
            default:
                return ['bg' => '#f3f4f6', 'border' => '#d1d5db', 'text' => '#374151'];
        }
    }

    // ▶️ START MISSION - employee starts the trip
    public function startMission(Request $request, $id)
    {
        $request->validate([
            'km_debut' => 'nullable|integer|min:0',
        ]);

        $reservation = Reservation::findOrFail($id);

        // 🔒 Only owner or admin can start
        $user = auth()->user();
        if ($user->id !== $reservation->employee_id && !$user->hasRole('admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Only approved reservations can be started
        if ($reservation->status !== 'approved') {
            return response()->json([
                'message' => 'Reservation must be approved before starting'
            ], 400);
        }

        // Update km_debut if provided
        if ($request->has('km_debut') && $request->km_debut !== null) {
            $reservation->km_debut = $request->km_debut;
        }

        $reservation->status = 'in_progress';
        $reservation->save();

        // Update TripRoute to active
        $tripRoute = TripRoute::where('reservation_id', $reservation->id)->first();
        if ($tripRoute) {
            $tripRoute->update([
                'status' => 'active',
                'started_at' => now(),
            ]);
        }

        // Ensure vehicle is marked as Affecté
        if ($reservation->vehicle) {
            $vehicle = $reservation->vehicle;
            $vehicle->statut = 'Affecté';
            $vehicle->save();
        }

        return response()->json([
            'message' => 'Mission started successfully',
            'reservation' => $reservation->load('vehicle', 'employee')
        ]);
    }

    // 🔄 RETURN VEHICLE - employee returns vehicle after use
    public function returnVehicle(Request $request, $id)
    {
        $request->validate([
            'km_fin' => 'nullable|integer|min:0',
        ]);

        $reservation = Reservation::findOrFail($id);

        // Update km_fin if provided (GPS calculated)
        if ($request->has('km_fin') && $request->km_fin !== null) {
            $reservation->km_fin = $request->km_fin;
        }

        // Mark reservation as completed
        $reservation->status = 'completed';
        $reservation->date_fin = now();
        $reservation->save();

        // 🗺️ Complete TripRoute
        $tripRoute = TripRoute::where('reservation_id', $reservation->id)->first();
        if ($tripRoute) {
            // Calculate actual distance: prefer GPS cumulative, fallback to km_fin - km_debut
            $actualDistance = null;
            $latestGps = \App\Models\GpsLocation::where('reservation_id', $reservation->id)
                ->orderByDesc('recorded_at')
                ->first();
            if ($latestGps && $latestGps->distance_cumulative > 0) {
                $actualDistance = $latestGps->distance_cumulative;
            } elseif ($reservation->km_debut !== null && $reservation->km_fin !== null) {
                $actualDistance = $reservation->km_fin - $reservation->km_debut;
            }

            $tripRoute->update([
                'status' => 'completed',
                'completed_at' => now(),
                'actual_distance' => $actualDistance,
            ]);
            Log::info('TripRoute completed for reservation ' . $id . ' with actual_distance: ' . $actualDistance);
        }

        // Release vehicle - change status to Disponible
        if ($reservation->vehicle) {
            $vehicle = $reservation->vehicle;
            $vehicle->statut = 'Disponible';
            $vehicle->save();
        }

        // 🔔 Notify all admins & responsabes about vehicle return
        $managers = Employee::whereIn('role', ['admin', 'responsable'])->get();
        foreach ($managers as $manager) {
            Notification::create([
                'employee_id' => $manager->id,
                'message' => '🚗 Véhicule ' . $reservation->vehicle->marque . ' ' . $reservation->vehicle->modele . ' retourné par ' . $reservation->employee->nom,
                'link' => '/reservations'
            ]);
        }

        return response()->json([
            'message' => 'Vehicle returned successfully',
            'reservation' => $reservation->load('vehicle', 'employee')
        ]);
    }

    public function cancel(Request $request, $id)
    {
        $reservation = Reservation::findOrFail($id);
        $user = auth()->user();

        // 🔐 Security: Only the owner or admin can cancel
        if ($user->id !== $reservation->employee_id && !$user->hasRole('admin') && !$user->hasRole('responsable')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Prevent cancelling if already completed or rejected
        if (in_array($reservation->status, ['completed', 'rejected', 'cancelled'])) {
            return response()->json(['message' => 'Cannot cancel a reservation in this state'], 400);
        }

        // Rule: If approved or in_progress, it cannot be cancelled if it has already started
        if (in_array($reservation->status, ['approved', 'in_progress']) && now()->greaterThan($reservation->date_debut)) {
            return response()->json(['message' => 'La réservation a déjà commencé et ne peut plus être annulée.'], 400);
        }

        $reservation->status = 'cancelled';
        $reservation->cancellation_reason = $request->reason;
        $reservation->save();

        // 🔄 Release vehicle if it was assigned
        if ($reservation->vehicle) {
            $vehicle = $reservation->vehicle;
            if ($vehicle->statut === 'Affecté') {
                $vehicle->statut = 'Disponible';
                $vehicle->save();
            }
        }

        // 🔔 Notify all admins & responsables about cancellation
        $reasonMsg = $request->reason ? (' Raison: ' . $request->reason) : '';
        $managers = Employee::whereIn('role', ['admin', 'responsable'])->get();
        foreach ($managers as $manager) {
            Notification::create([
                'employee_id' => $manager->id,
                'message' => '🚫 Réservation annulée par ' . $reservation->employee->nom . ' (' . $reservation->mission . ').' . $reasonMsg,
                'link' => '/reservations'
            ]);
        }

        return response()->json([
            'message' => 'Reservation cancelled successfully',
            'reservation' => $reservation->load('vehicle', 'employee')
        ]);
    }
}