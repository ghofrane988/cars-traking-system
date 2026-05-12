<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        $vehicles = Vehicle::all();
        $vehicles->each(function ($vehicle) {
            $vehicle->updateEffectiveStatus();
            $vehicle->refresh();
        });
        return response()->json($vehicles, 200);
    }


    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'marque' => 'required|string|max:255',
            'modele' => 'required|string|max:255',
            'matricule' => 'required|string|max:255|unique:vehicles,matricule',
            'annee' => 'nullable|integer',
            'statut' => 'nullable|string',
            'consommation' => 'nullable|string',
            'assurance_date' => 'nullable|date',
            'visite_technique_date' => 'nullable|date',
            'vignette_date' => 'nullable|date',
            'maintenance_start_date' => 'nullable|date',
            'maintenance_end_date' => 'nullable|date'
        ]);

        $vehicle = Vehicle::create($validated);

        return response()->json($vehicle, 201);
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\Vehicle  $vehicle
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(Vehicle $vehicle)
    {
        return response()->json($vehicle, 200);
    }


    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Vehicle  $vehicle
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, Vehicle $vehicle)
    {
        $rules = [
            'marque' => 'sometimes|required|string|max:255',
            'modele' => 'sometimes|required|string|max:255',
            'matricule' => 'sometimes|required|string|max:255|unique:vehicles,matricule,' . $vehicle->id,
            'annee' => 'nullable|integer',
            'statut' => 'nullable|string',
            'consommation' => 'nullable|string',
            'assurance_date' => 'nullable|date',
            'visite_technique_date' => 'nullable|date',
            'vignette_date' => 'nullable|date',
            'maintenance_start_date' => 'nullable|date',
            'maintenance_end_date' => 'nullable|date'
        ];

        $validated = $request->validate($rules);

        // If admin sets maintenance with a future start date, keep current status
        // The updateEffectiveStatus() model method will flip it automatically on that date
        // If maintenance is scheduled in the FUTURE (after now), keep current status
        // updateEffectiveStatus() or the scheduler will flip it automatically at that time
        if (
            isset($validated['statut']) && $validated['statut'] === 'En maintenance'
            && isset($validated['maintenance_start_date'])
            && \Carbon\Carbon::parse($validated['maintenance_start_date'])->gt(now())
        ) {
            unset($validated['statut']);
        }

        // Auto-set maintenance_end_date when leaving "En maintenance" status
        if (isset($validated['statut']) && $vehicle->statut === 'En maintenance' && $validated['statut'] !== 'En maintenance') {
            $validated['maintenance_end_date'] = now()->toDateTimeString();
        }

        $user = auth()->user();
        // 🔒 If user is responsable, they can ONLY update administrative dates
        if ($user && $user->role === 'responsable' && !$user->hasRole('admin')) {
            $allowedFields = ['assurance_date', 'visite_technique_date', 'vignette_date', 'maintenance_start_date', 'maintenance_end_date'];
            $validated = array_intersect_key($validated, array_flip($allowedFields));
        }

        $vehicle->update($validated);

        // Trigger automatic status change if maintenance_start_date has been reached
        $vehicle->updateEffectiveStatus();
        $vehicle->refresh();

        return response()->json($vehicle, 200);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Vehicle  $vehicle
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(Vehicle $vehicle)
    {
        $vehicle->delete();

        return response()->json(null, 204);
    }

    // 🔍 Get vehicles available for a specific time range
    public function getAvailableForPeriod(Request $request)
    {
        $request->validate([
            'date_debut' => 'required|date',
            'date_fin' => 'required|date|after_or_equal:date_debut',
            'car_type' => 'nullable|in:passenger,commercial,mixed'
        ]);

        $start = $request->date_debut;
        $end = $request->date_fin;

        // A vehicle is available if it is NOT "En maintenance" (including scheduled ones)
        // AND there are no overlapping approved or in_progress reservations for that period.
        $query = Vehicle::notInEffectiveMaintenance()
            ->whereDoesntHave('reservations', function ($query) use ($start, $end) {
            $query->whereIn('status', ['approved', 'in_progress'])
                ->where(function ($q) use ($start, $end) {
                // Overlap logic: (res_start < requested_end) AND (res_end > requested_start)
                $q->where('date_debut', '<', $end)
                    ->where(function ($sub) use ($start) {
                    $sub->where('date_fin', '>', $start)
                        ->orWhereNull('date_fin');
                }
                );
            }
            );
        });

        // 🚗 Filter by requested vehicle type if provided
        if ($request->has('car_type') && $request->car_type) {
            $query->where('car_type', $request->car_type);
        }

        $vehicles = $query->get();

        return response()->json($vehicles, 200);
    }
}