<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware untuk proteksi route berdasarkan role.
 * Penggunaan di routes: ->middleware('role:owner,manager')
 */
class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, $roles)) {
            return response()->json([
                'message' => 'Akses ditolak. Anda tidak memiliki hak untuk aksi ini.',
                'error'   => 'FORBIDDEN',
            ], 403);
        }

        return $next($request);
    }
}
