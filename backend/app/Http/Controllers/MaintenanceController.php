<?php

namespace App\Http\Controllers;

use App\Models\Maintenance;
use Illuminate\Http\Request;

class MaintenanceController extends Controller
{
    // 📌 GET /api/maintenances
    public function index()
    {
        return response()->json(Maintenance::with('vehicle')->get(), 200);
    }

    // 📌 POST /api/maintenances
    public function store(Request $request)
    {
        $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'type' => 'required|string',
            'description' => 'nullable|string',
            'cost' => 'required|numeric',
            'return_date' => 'nullable|date'
        ]);

        // 🔹 create maintenance
        $maintenance = Maintenance::create($request->all());

        // 🔄 Auto Update Vehicle Status
        $vehicle = $maintenance->vehicle;
        $vehicle->statut = 'en maintenance';
        $vehicle->save();

        return response()->json([
            'message' => 'Maintenance recorded & vehicle status updated',
            'maintenance' => $maintenance
        ], 201);
    }

    // 📌 GET /api/maintenances/{id}
    public function show(Maintenance $maintenance)
    {
        return response()->json($maintenance->load('vehicle'), 200);
    }

    // 📌 PUT /api/maintenances/{id}
    public function update(Request $request, Maintenance $maintenance)
    {
        $request->validate([
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'type' => 'sometimes|required|string',
            'description' => 'sometimes|required|string',
            'cost' => 'nullable|numeric',
            'return_date' => 'nullable|date'
        ]);

        $maintenance->update($request->all());

        return response()->json($maintenance, 200);
    }

    // 📌 DELETE /api/maintenances/{id}
    public function destroy(Maintenance $maintenance)
    {
        $maintenance->delete();

        // 🔹 Optionally: release vehicle if needed
        $vehicle = $maintenance->vehicle;
        if ($vehicle && $vehicle->statut === 'en maintenance') {
            $vehicle->statut = 'disponible';
            $vehicle->save();
        }

        return response()->json(null, 204);
    }

    // 🔹 PUT /api/maintenances/{id}/back-to-service
    public function backToService($id)
    {
        $maintenance = Maintenance::findOrFail($id);
        $vehicle = $maintenance->vehicle;

        $vehicle->statut = 'disponible';
        $vehicle->save();

        return response()->json([
            'message' => 'Vehicle is now available',
            'vehicle' => $vehicle
        ]);
    }
}