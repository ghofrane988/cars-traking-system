<?php

namespace App\Http\Controllers;

use App\Models\GpsLocation;
use App\Models\TripRoute;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GpsLocationController extends Controller
{
    /**
     * Get all GPS locations
     */
    public function index()
    {
        return response()->json(GpsLocation::with('vehicle')->latest()->get(), 200);
    }

    /**
     * Store new GPS location from vehicle
     */
    public function store(Request $request)
    {
        $vehicleId = $request->vehicle_id;
        
        // 🔄 MAGIC SIMULATION LINK: If mobile sends 'auto', we get the ID selected in Angular
        if ($vehicleId === 'auto') {
            $vehicleId = \Illuminate\Support\Facades\Cache::get('active_simulation_vehicle_id');
            if (!$vehicleId) {
                return response()->json(['error' => 'Aucune mission sélectionnée dans le tableau de bord pour la simulation'], 400);
            }
            $request->merge(['vehicle_id' => $vehicleId]);
        }

        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'reservation_id' => 'nullable|exists:reservations,id',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'speed' => 'nullable|numeric|min:0',
            'recorded_at' => 'required|date'
        ]);

        // Calculate cumulative distance from last point
        $lastLocation = GpsLocation::where('vehicle_id', $validated['vehicle_id'])
            ->latest('recorded_at')
            ->first();

        $distanceCumulative = 0;
        if ($lastLocation) {
            $distanceCumulative = $lastLocation->distance_cumulative + $this->calculateDistance(
                $lastLocation->latitude,
                $lastLocation->longitude,
                $validated['latitude'],
                $validated['longitude']
            );
        }

        $validated['distance_cumulative'] = round($distanceCumulative, 2);

        $gps = GpsLocation::create($validated);

        // Check for distance alert
        $this->checkDistanceAlert($gps);

        // Broadcast the new GPS location (Catch errors if WebSockets server is down)
        try {
            broadcast(new \App\Events\GpsLocationUpdated($gps));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("WebSocket Broadcast failed: " . $e->getMessage());
        }

        return response()->json($gps, 201);
    }

    /**
     * Calculate distance between two points using Haversine formula
     */
    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371; // km

        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);

        $a = sin($latDelta / 2) * sin($latDelta / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($lonDelta / 2) * sin($lonDelta / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Check if actual distance exceeds estimated and send alert
     */
    private function checkDistanceAlert(GpsLocation $gps)
    {
        if (!$gps->reservation_id) return;

        $tripRoute = TripRoute::where('reservation_id', $gps->reservation_id)
            ->where('status', 'active')
            ->first();

        if (!$tripRoute) return;

        $estimatedDistance = $tripRoute->estimated_distance;
        $actualDistance = $gps->distance_cumulative;

        // Alert if exceeds 20% of estimated
        if ($estimatedDistance > 0 && $actualDistance > ($estimatedDistance * 1.2)) {
            // Update trip route with actual distance
            $tripRoute->update(['actual_distance' => $actualDistance]);

            // TODO: Send notification to admin (Phase 5)
            Log::info("ALERT: Distance exceeded for reservation {$gps->reservation_id}. Estimated: {$estimatedDistance}km, Actual: {$actualDistance}km");
        }
    }

    /**
     * Calculate route between two points using OSRM
     */
    public function calculateRoute(Request $request)
    {
        $validated = $request->validate([
            'start_lat' => 'required|numeric|between:-90,90',
            'start_lng' => 'required|numeric|between:-180,180',
            'end_lat' => 'required|numeric|between:-90,90',
            'end_lng' => 'required|numeric|between:-180,180',
        ]);

        try {
            // Using OSRM demo server (for production, use your own OSRM instance)
            $url = "http://router.project-osrm.org/route/v1/driving/{$validated['start_lng']},{$validated['start_lat']};{$validated['end_lng']},{$validated['end_lat']}?overview=full&geometries=geojson";

            $response = Http::timeout(10)->get($url);

            if ($response->successful()) {
                $data = $response->json();

                if (isset($data['routes'][0])) {
                    $route = $data['routes'][0];

                    return response()->json([
                        'distance_km' => round($route['distance'] / 1000, 2),
                        'duration_min' => round($route['duration'] / 60, 0),
                        'geometry' => $route['geometry'],
                        'waypoints' => $data['waypoints'] ?? null
                    ]);
                }
            }

            // Fallback: use Haversine if OSRM fails
            $distance = $this->calculateDistance(
                $validated['start_lat'],
                $validated['start_lng'],
                $validated['end_lat'],
                $validated['end_lng']
            );

            return response()->json([
                'distance_km' => round($distance, 2),
                'duration_min' => round(($distance / 60) * 60, 0), // Assuming 60km/h avg
                'geometry' => null,
                'waypoints' => null,
                'note' => 'OSRM unavailable, using straight-line distance'
            ]);

        } catch (\Exception $e) {
            Log::error('OSRM Error: ' . $e->getMessage());

            // Fallback
            $distance = $this->calculateDistance(
                $validated['start_lat'],
                $validated['start_lng'],
                $validated['end_lat'],
                $validated['end_lng']
            );

            return response()->json([
                'distance_km' => round($distance, 2),
                'duration_min' => round(($distance / 60) * 60, 0),
                'geometry' => null,
                'note' => 'OSRM error, using straight-line distance'
            ]);
        }
    }

    /**
     * Get GPS locations by reservation (trip history)
     */
    public function getByReservation($reservationId)
    {
        $locations = GpsLocation::where('reservation_id', $reservationId)
            ->orderBy('recorded_at', 'asc')
            ->get();

        return response()->json($locations, 200);
    }

    /**
     * Get real-time current position of a vehicle
     */
    public function getCurrentPosition($vehicleId)
    {
        $position = GpsLocation::where('vehicle_id', $vehicleId)
            ->orderBy('recorded_at', 'desc')
            ->first();

        if (!$position) {
            return response()->json([
                'error' => 'No GPS data available for this vehicle'
            ], 404);
        }

        // Get reservation details if linked
        $reservation = null;
        if ($position->reservation_id) {
            $reservation = Reservation::with('employee')->find($position->reservation_id);
        }

        return response()->json([
            'vehicle_id' => (int) $vehicleId,
            'position' => [
                'latitude' => (float) $position->latitude,
                'longitude' => (float) $position->longitude,
                'speed' => (float) $position->speed,
                'distance_cumulative' => (float) $position->distance_cumulative,
                'recorded_at' => $position->recorded_at,
            ],
            'reservation' => $reservation ? [
                'id' => $reservation->id,
                'employee' => $reservation->employee->nom ?? 'Unknown',
                'mission' => $reservation->mission,
                'estimated_distance' => (float) $reservation->estimated_distance,
            ] : null,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Compare actual vs estimated distance
     */
    public function compareDistance($reservationId)
    {
        $reservation = Reservation::findOrFail($reservationId);
        
        // Get latest GPS position for this reservation
        $latestPosition = GpsLocation::where('reservation_id', $reservationId)
            ->orderBy('recorded_at', 'desc')
            ->first();

        if (!$latestPosition) {
            return response()->json([
                'error' => 'No GPS tracking data available'
            ], 404);
        }

        $estimated = (float) ($reservation->estimated_distance ?? 0);
        $actual = (float) $latestPosition->distance_cumulative;
        
        $difference = $actual - $estimated;
        $percentageDiff = $estimated > 0 ? (($difference / $estimated) * 100) : 0;
        
        $alert = null;
        $threshold = 20; // 20% threshold
        
        if ($percentageDiff > $threshold) {
            $alert = [
                'type' => 'distance_exceeded',
                'severity' => 'warning',
                'message' => sprintf(
                    '⚠️ Distance dépassée de %.1f%% (%.1f km sur %.1f km estimés)',
                    $percentageDiff,
                    $actual,
                    $estimated
                ),
                'threshold_percent' => $threshold,
                'exceeded_by_percent' => round($percentageDiff - $threshold, 1),
            ];
        } elseif ($percentageDiff < -$threshold) {
            $alert = [
                'type' => 'distance_under',
                'severity' => 'info',
                'message' => sprintf(
                    'ℹ️ Distance parcourue inférieure de %.1f%% à l\'estimation',
                    abs($percentageDiff)
                ),
            ];
        }

        return response()->json([
            'reservation_id' => (int) $reservationId,
            'estimated_distance_km' => round($estimated, 2),
            'actual_distance_km' => round($actual, 2),
            'difference_km' => round($difference, 2),
            'percentage_difference' => round($percentageDiff, 1),
            'is_exceeded' => $percentageDiff > $threshold,
            'alert' => $alert,
            'last_update' => $latestPosition->recorded_at,
        ]);
    }

    /**
     * Get latest position for all vehicles or specific vehicle
     */
    public function getLatestPosition(Request $request)
    {
        $vehicleId = $request->query('vehicle_id');

        $query = GpsLocation::with('vehicle');

        if ($vehicleId) {
            $query->where('vehicle_id', $vehicleId);
        }

        $positions = $query->latest('recorded_at')
            ->get()
            ->unique('vehicle_id')
            ->values();

        return response()->json($positions, 200);
    }

    /**
     * Get trip statistics
     */
    public function getTripStats($reservationId)
    {
        $locations = GpsLocation::where('reservation_id', $reservationId)
            ->orderBy('recorded_at', 'asc')
            ->get();

        if ($locations->isEmpty()) {
            return response()->json(['error' => 'No GPS data found'], 404);
        }

        $tripRoute = TripRoute::where('reservation_id', $reservationId)->first();

        $totalDistance = $locations->last()->distance_cumulative ?? 0;
        $avgSpeed = $locations->avg('speed') ?? 0;
        $maxSpeed = $locations->max('speed') ?? 0;
        $startTime = $locations->first()->recorded_at;
        $endTime = $locations->last()->recorded_at;
        $duration = $startTime && $endTime ? $startTime->diffInMinutes($endTime) : 0;

        return response()->json([
            'total_distance_km' => round($totalDistance, 2),
            'estimated_distance_km' => $tripRoute?->estimated_distance ?? 0,
            'distance_difference_km' => round($totalDistance - ($tripRoute?->estimated_distance ?? 0), 2),
            'avg_speed_kmh' => round($avgSpeed, 1),
            'max_speed_kmh' => round($maxSpeed, 1),
            'duration_min' => $duration,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'point_count' => $locations->count()
        ], 200);
    }

    public function show(GpsLocation $gpsLocation)
    {
        return response()->json($gpsLocation->load(['vehicle', 'reservation']), 200);
    }

    public function destroy(GpsLocation $gpsLocation)
    {
        $gpsLocation->delete();
        return response()->json(null, 204);
    }

    // 🔗 API to sync the Angular frontend selection with the Mobile app
    public function setSimulationTarget(Request $request)
    {
        $request->validate([
            'vehicle_id' => 'required|integer'
        ]);

        \Illuminate\Support\Facades\Cache::put('active_simulation_vehicle_id', $request->vehicle_id, 7200); // 2 hours

        return response()->json([
            'message' => 'Simulation target successfully updated',
            'vehicle_id' => $request->vehicle_id
        ]);
    }
}