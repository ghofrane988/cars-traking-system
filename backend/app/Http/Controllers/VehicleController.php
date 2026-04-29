<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        return response()->json(Vehicle::all(), 200);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
    //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
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
            'vignette_date' => 'nullable|date'
        ]);

        $vehicle = Vehicle::create($validated);

        return response()->json($vehicle, 201);
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\Vehicle  $vehicle
     * @return \Illuminate\Http\Response
     */
    public function show(Vehicle $vehicle)
    {
        return response()->json($vehicle, 200);
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \App\Models\Vehicle  $vehicle
     * @return \Illuminate\Http\Response
     */
    public function edit(Vehicle $vehicle)
    {
    //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Vehicle  $vehicle
     * @return \Illuminate\Http\Response
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
            'vignette_date' => 'nullable|date'
        ];

        $validated = $request->validate($rules);

        $user = auth()->user();
        // 🔒 If user is responsable, they can ONLY update administrative dates
        if ($user && $user->role === 'responsable' && !$user->hasRole('admin')) {
            $allowedFields = ['assurance_date', 'visite_technique_date', 'vignette_date'];
            $validated = array_intersect_key($validated, array_flip($allowedFields));
        }

        $vehicle->update($validated);

        return response()->json($vehicle, 200);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Vehicle  $vehicle
     * @return \Illuminate\Http\Response
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
            'date_fin' => 'required|date|after_or_equal:date_debut'
        ]);

        $start = $request->date_debut;
        $end = $request->date_fin;

        // A vehicle is available if it is NOT "En maintenance" AND there are no 
        // overlapping approved or in_progress reservations for that period.
        $vehicles = Vehicle::where('statut', '!=', 'En maintenance')
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
        })->get();

        return response()->json($vehicles, 200);
    }
}