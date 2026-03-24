<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)
            ->where('is_active', true)
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        // Hapus token lama jika ada (single session per user)
        $user->tokens()->delete();

        $token = $user->createToken('smartpos-token', ['*'], now()->addHours(8))->plainTextToken;

        // Update last login
        $user->update(['last_login_at' => now()]);

        // Catat aktivitas
        ActivityLog::create([
            'user_id'     => $user->id,
            'store_id'    => $user->store_id,
            'action'      => 'login',
            'description' => "User {$user->name} login",
            'ip_address'  => $request->ip(),
            'user_agent'  => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Login berhasil.',
            'token'   => $token,
            'user'    => new UserResource($user->load('store')),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        ActivityLog::create([
            'user_id'     => $request->user()->id,
            'store_id'    => $request->user()->store_id,
            'action'      => 'logout',
            'description' => "User {$request->user()->name} logout",
            'ip_address'  => $request->ip(),
        ]);

        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logout berhasil.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()->load('store')),
        ]);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Password lama tidak sesuai.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->new_password)]);
        $user->tokens()->delete(); // Logout semua sesi

        return response()->json(['message' => 'Password berhasil diubah. Silakan login kembali.']);
    }
}
