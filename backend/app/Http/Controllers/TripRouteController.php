<?php

namespace App\Http\Controllers;

use App\Models\TripRoute;
use Illuminate\Http\Request;

class TripRouteController extends Controller
{
    public function index()
    {
        return response()->json(TripRoute::with(['reservation', 'vehicle'])->get(), 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'reservation_id' => 'required|exists:reservations,id',
            'vehicle_id' => 'required|exists:vehicles,id',
            'start_lat' => 'required|numeric',
            'start_lng' => 'required|numeric',
            'start_address' => 'nullable|string',
            'end_lat' => 'required|numeric',
            'end_lng' => 'required|numeric',
            'end_address' => 'nullable|string',
            'estimated_distance' => 'required|numeric',
            'estimated_duration' => 'nullable|integer',
        ]);

        $validated['status'] = 'planned';

        $tripRoute = TripRoute::create($validated);

        return response()->json($tripRoute->load(['reservation', 'vehicle']), 201);
    }

    public function show(TripRoute $tripRoute)
    {
        return response()->json($tripRoute->load(['reservation', 'vehicle']), 200);
    }

    public function update(Request $request, TripRoute $tripRoute)
    {
        $validated = $request->validate([
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'estimated_distance' => 'sometimes|required|numeric',
            'actual_distance' => 'nullable|numeric',
            'status' => 'sometimes|required|in:planned,active,completed,cancelled',
            'started_at' => 'nullable|date',
            'completed_at' => 'nullable|date',
        ]);

        $tripRoute->update($validated);

        return response()->json($tripRoute->load(['reservation', 'vehicle']), 200);
    }

    public function destroy(TripRoute $tripRoute)
    {
        $tripRoute->delete();
        return response()->json(null, 204);
    }

    public function startTrip(TripRoute $tripRoute)
    {
        $tripRoute->update([
            'status' => 'active',
            'started_at' => now()
        ]);

        return response()->json($tripRoute->load(['reservation', 'vehicle']), 200);
    }

    public function completeTrip(TripRoute $tripRoute)
    {
        $tripRoute->update([
            'status' => 'completed',
            'completed_at' => now()
        ]);

        return response()->json($tripRoute->load(['reservation', 'vehicle']), 200);
    }
}
