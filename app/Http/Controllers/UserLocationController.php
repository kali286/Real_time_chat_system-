<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserLocationController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat'       => ['required', 'numeric', 'between:-90,90'],
            'lng'       => ['required', 'numeric', 'between:-180,180'],
            'speed_kmh' => ['nullable', 'numeric', 'min:0'],
        ]);

        $user = $request->user();
        $user->last_lat = $data['lat'];
        $user->last_lng = $data['lng'];
        $user->last_location_at = now();
        $user->last_speed_kmh = $data['speed_kmh'] ?? null;
        $user->save();

        return response()->json([
            'success' => true,
        ]);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        if ($user->last_lat === null || $user->last_lng === null || $user->last_location_at === null) {
            return response()->json([
                'success'      => true,
                'has_location' => false,
            ]);
        }

        $viewer     = $request->user();
        $viewerLat  = $request->input('viewer_lat');
        $viewerLng  = $request->input('viewer_lng');

        $distanceM     = null;
        $distanceLabel = null;

        // Primary: use live viewer coordinates if provided
        if (is_numeric($viewerLat) && is_numeric($viewerLng)) {
            $distanceM = $this->haversineDistanceMeters(
                (float) $viewerLat,
                (float) $viewerLng,
                (float) $user->last_lat,
                (float) $user->last_lng,
            );
        }
        // Fallback: use viewer's last saved location if both users have shared
        elseif ($viewer && $viewer->last_lat !== null && $viewer->last_lng !== null) {
            $distanceM = $this->haversineDistanceMeters(
                (float) $viewer->last_lat,
                (float) $viewer->last_lng,
                (float) $user->last_lat,
                (float) $user->last_lng,
            );
        }

        if ($distanceM !== null) {
            if ($distanceM < 10) {
                $distanceLabel = 'Same place';
            } elseif ($distanceM < 1000) {
                $distanceLabel = round($distanceM) . 'm away';
            } else {
                $distanceLabel = number_format($distanceM / 1000, 1) . 'km away';
            }
        }

        $timeAgo = $user->last_location_at->diffForHumans();

        $speed = $user->last_speed_kmh;
        $speedText = $speed !== null ? round($speed) . ' km/h' : null;

        $movement = null;
        if ($speed !== null) {
            if ($speed < 1) {
                $movement = 'stationary';
            } elseif ($speed < 7) {
                $movement = 'walking';
            } elseif ($speed < 25) {
                $movement = 'cycling';
            } elseif ($speed < 80) {
                $movement = 'driving';
            } else {
                $movement = 'moving fast (likely by bus/car)';
            }
        }

        $movementText = null;
        if ($movement && $speedText) {
            $movementText = $movement . ' at ' . $speedText;
        } elseif ($speedText) {
            $movementText = 'moving at ' . $speedText;
        }

        return response()->json([
            'success'          => true,
            'has_location'     => true,
            'user_id'          => $user->id,
            'last_lat'         => (float) $user->last_lat,
            'last_lng'         => (float) $user->last_lng,
            'last_speed_kmh'   => $speed !== null ? (float) $speed : null,
            'last_location_at' => $user->last_location_at->toIso8601String(),
            'distance_m'       => $distanceM,
            'distance_label'   => $distanceLabel,
            'time_ago'         => $timeAgo,
            'movement_text'    => $movementText,
        ]);
    }

    private function haversineDistanceMeters(
        float $lat1,
        float $lng1,
        float $lat2,
        float $lng2,
    ): float {
        $earthRadius = 6371000; // meters

        $latFrom = deg2rad($lat1);
        $latTo   = deg2rad($lat2);
        $lonFrom = deg2rad($lng1);
        $lonTo   = deg2rad($lng2);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $angle = 2 * asin(sqrt(
            pow(sin($latDelta / 2), 2) +
            cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)
        ));

        return $earthRadius * $angle;
    }
}