<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Notification;

class NotificationController extends Controller
{
    // 📌 GET /api/notifications/{employee_id}
    public function getEmployeeNotifications($employee_id)
    {
        $notifications = Notification::where('employee_id', $employee_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($notifications);
    }

    // 📌 GET /api/notifications/me
    public function getMyNotifications(Request $request)
    {
        $notifications = Notification::where('employee_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($notifications);
    }
    public function markAsRead($id)
    {
        $notification = Notification::findOrFail($id);
        $user = auth()->user();

        // Admin can mark any notification; others only their own
        if (!$user->hasRole('admin') && $notification->employee_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $notification->is_read = true;
        $notification->save();

        return response()->json(['message' => 'Notification marked as read']);
    }
}