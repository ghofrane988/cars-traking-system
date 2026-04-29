<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleMiddleware
{
    public function handle($request, Closure $next, $permission)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }


        // Load roles and permissions relation for the user
        $user->loadMissing('roles.permissions');

        // SUPER ADMIN BYPASS: if user has role 'admin' allow everything
        if ($user->hasRole('admin')) {
            return $next($request);
        }

        // CHECK PERMISSION
        if (!$user->hasPermission($permission)) {
            return response()->json([
                'message' => 'Access denied',
                'required_permission' => $permission
            ], 403);
        }

        return $next($request);
    }
}