<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use Illuminate\Http\Request;

class CompanySettingController extends Controller
{
    /**
     * Get company settings 
     */
    public function getSettings()
    {
        $settings = CompanySetting::first();
        if (!$settings) {
            // Return default values if none set
            return response()->json([
                'parking_lat' => 36.8065,
                'parking_lng' => 10.1815,
                'parking_address' => 'Tunis, Tunisie'
            ]);
        }
        return response()->json($settings);
    }

    /**
     * Update company settings
     */
    public function updateSettings(Request $request)
    {
        $request->validate([
            'parking_lat' => 'required|numeric',
            'parking_lng' => 'required|numeric',
            'parking_address' => 'nullable|string'
        ]);

        $settings = CompanySetting::first();
        if (!$settings) {
            $settings = new CompanySetting();
        }

        $settings->parking_lat = $request->parking_lat;
        $settings->parking_lng = $request->parking_lng;
        $settings->parking_address = $request->parking_address;
        $settings->save();

        return response()->json($settings);
    }
}