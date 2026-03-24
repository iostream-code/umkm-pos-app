<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * GET /api/v1/users
     * Daftar karyawan toko
     */
    public function index(Request $request): JsonResponse
    {
        $users = User::where('store_id', $request->user()->store_id)
            ->when($request->search, fn($q) =>
                $q->where('name', 'ilike', "%{$request->search}%")
                  ->orWhere('email', 'ilike', "%{$request->search}%")
            )
            ->when($request->role, fn($q) => $q->where('role', $request->role))
            ->orderBy('name')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'data' => UserResource::collection($users->items()),
            'meta' => [
                'current_page' => $users->currentPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
                'last_page'    => $users->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/v1/users
     * Tambah karyawan baru
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:100'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'phone'    => ['nullable', 'string', 'max:20'],
            'role'     => ['required', 'string', 'in:manager,cashier'],
            // Owner tidak bisa membuat user role owner lainnya
        ]);

        // Hanya owner yang bisa membuat manager
        if ($validated['role'] === 'manager' && ! $request->user()->isOwner()) {
            return response()->json([
                'message' => 'Hanya owner yang bisa menambahkan manager.',
            ], 403);
        }

        $user = User::create([
            ...$validated,
            'store_id' => $request->user()->store_id,
            'password' => Hash::make($validated['password']),
        ]);

        ActivityLog::create([
            'user_id'     => $request->user()->id,
            'store_id'    => $request->user()->store_id,
            'action'      => 'created',
            'model_type'  => User::class,
            'model_id'    => $user->id,
            'description' => "Menambahkan karyawan baru: {$user->name} ({$user->role})",
        ]);

        return response()->json([
            'message' => 'Karyawan berhasil ditambahkan.',
            'user'    => new UserResource($user),
        ], 201);
    }

    /**
     * GET /api/v1/users/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->firstOrFail();

        return response()->json(['user' => new UserResource($user)]);
    }

    /**
     * PUT /api/v1/users/{id}
     * Edit data karyawan
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->firstOrFail();

        // Tidak boleh edit diri sendiri via endpoint ini
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Gunakan endpoint /auth/password untuk mengubah data Anda sendiri.',
            ], 422);
        }

        $validated = $request->validate([
            'name'      => ['sometimes', 'string', 'max:100'],
            'email'     => [
                'sometimes', 'email',
                Rule::unique('users')->ignore($user->id),
            ],
            'phone'     => ['nullable', 'string', 'max:20'],
            'role'      => ['sometimes', 'string', 'in:manager,cashier'],
            'is_active' => ['boolean'],
            'password'  => ['nullable', 'string', 'min:8'],
        ]);

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
            // Logout semua sesi user ini
            $user->tokens()->delete();
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'Data karyawan berhasil diperbarui.',
            'user'    => new UserResource($user->fresh()),
        ]);
    }

    /**
     * DELETE /api/v1/users/{id}
     * Nonaktifkan karyawan (soft delete)
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->firstOrFail();

        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Anda tidak bisa menghapus akun Anda sendiri.',
            ], 422);
        }

        if ($user->isOwner()) {
            return response()->json([
                'message' => 'Akun owner tidak bisa dihapus.',
            ], 422);
        }

        // Revoke semua token aktif
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Karyawan berhasil dihapus.']);
    }
}
