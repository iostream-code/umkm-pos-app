<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StoreController extends Controller
{
    /**
     * GET /api/v1/store
     * Detail toko milik user yang sedang login
     */
    public function show(Request $request): JsonResponse
    {
        $store = Store::findOrFail($request->user()->store_id);

        return response()->json([
            'store' => [
                'id'             => $store->id,
                'name'           => $store->name,
                'address'        => $store->address,
                'phone'          => $store->phone,
                'email'          => $store->email,
                'tax_number'     => $store->tax_number,
                'logo'           => $store->logo ? asset('storage/' . $store->logo) : null,
                'currency'       => $store->currency,
                'timezone'       => $store->timezone,
                'receipt_footer' => $store->receipt_footer,
                'is_active'      => $store->is_active,
                'created_at'     => $store->created_at->format('Y-m-d'),
            ],
        ]);
    }

    /**
     * PUT /api/v1/store
     * Update pengaturan toko
     */
    public function update(Request $request): JsonResponse
    {
        $store = Store::findOrFail($request->user()->store_id);

        $validated = $request->validate([
            'name'           => ['sometimes', 'string', 'max:150'],
            'address'        => ['nullable', 'string'],
            'phone'          => ['nullable', 'string', 'max:20'],
            'email'          => ['nullable', 'email'],
            'tax_number'     => ['nullable', 'string', 'max:50'],
            'logo'           => ['nullable', 'image', 'max:2048', 'mimes:jpg,jpeg,png,webp'],
            'currency'       => ['sometimes', 'string', 'size:3'],
            'timezone'       => ['sometimes', 'string', 'timezone'],
            'receipt_footer' => ['nullable', 'string', 'max:255'],
        ]);

        if ($request->hasFile('logo')) {
            // Hapus logo lama
            if ($store->logo) {
                Storage::disk('public')->delete($store->logo);
            }
            $validated['logo'] = $request->file('logo')->store('stores/logos', 'public');
        }

        $store->update($validated);

        return response()->json([
            'message' => 'Pengaturan toko berhasil disimpan.',
            'store'   => $store->fresh(),
        ]);
    }
}
