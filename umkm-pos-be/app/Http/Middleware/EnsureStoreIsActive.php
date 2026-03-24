<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Pastikan toko masih aktif sebelum setiap request.
 */
class EnsureStoreIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->store && ! $user->store->is_active) {
            return response()->json([
                'message' => 'Toko Anda sedang tidak aktif. Hubungi administrator.',
                'error'   => 'STORE_INACTIVE',
            ], 403);
        }

        return $next($request);
    }
}
