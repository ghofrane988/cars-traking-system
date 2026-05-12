<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckFirstLogin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        // Si l'utilisateur est connecté et qu'il est à son premier login
        if ($user && $user->is_first_login) {
            // Autoriser uniquement les requêtes pour changer le mot de passe, se déconnecter ou récupérer ses infos
            $allowedRoutes = [
                'api/first-login-pass',
                'api/user',
                'api/logout' // Au cas où vous ajoutez une route de déconnexion plus tard
            ];

            if (!$request->is(...$allowedRoutes)) {
                return response()->json([
                    'message' => 'Veuillez changer votre mot de passe pour continuer.',
                    'requires_password_change' => true
                ], 403);
            }
        }

        return $next($request);
    }
}
