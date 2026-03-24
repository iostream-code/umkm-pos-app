<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Discount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DiscountController extends Controller
{
    /**
     * GET /api/v1/discounts
     */
    public function index(Request $request): JsonResponse
    {
        $discounts = Discount::where('store_id', $request->user()->store_id)
            ->when($request->is_active, fn($q) => $q->where('is_active', true))
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 15));

        return response()->json($discounts);
    }

    /**
     * POST /api/v1/discounts
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'         => ['required', 'string', 'max:100'],
            'code'         => [
                'nullable', 'string', 'max:50', 'alpha_dash',
                Rule::unique('discounts')->where('store_id', $request->user()->store_id),
            ],
            'type'         => ['required', 'string', 'in:percentage,fixed'],
            'value'        => ['required', 'numeric', 'min:0.01'],
            'min_purchase' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit'  => ['nullable', 'integer', 'min:1'],
            'is_active'    => ['boolean'],
            'starts_at'    => ['nullable', 'date'],
            'expires_at'   => ['nullable', 'date', 'after:starts_at'],
        ]);

        // Validasi: diskon persentase max 100
        if ($validated['type'] === 'percentage' && $validated['value'] > 100) {
            return response()->json([
                'message' => 'Nilai diskon persentase tidak boleh lebih dari 100.',
                'errors'  => ['value' => ['Maksimal 100%.']],
            ], 422);
        }

        $discount = Discount::create([
            ...$validated,
            'store_id' => $request->user()->store_id,
            'code'     => isset($validated['code'])
                            ? strtoupper($validated['code'])
                            : null,
        ]);

        return response()->json([
            'message'  => 'Diskon berhasil ditambahkan.',
            'discount' => $discount,
        ], 201);
    }

    /**
     * GET /api/v1/discounts/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $discount = Discount::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->firstOrFail();

        return response()->json(['discount' => $discount]);
    }

    /**
     * PUT /api/v1/discounts/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $discount = Discount::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->firstOrFail();

        $validated = $request->validate([
            'name'         => ['sometimes', 'string', 'max:100'],
            'code'         => [
                'nullable', 'string', 'max:50', 'alpha_dash',
                Rule::unique('discounts')
                    ->where('store_id', $request->user()->store_id)
                    ->ignore($id),
            ],
            'type'         => ['sometimes', 'string', 'in:percentage,fixed'],
            'value'        => ['sometimes', 'numeric', 'min:0.01'],
            'min_purchase' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit'  => ['nullable', 'integer', 'min:1'],
            'is_active'    => ['boolean'],
            'starts_at'    => ['nullable', 'date'],
            'expires_at'   => ['nullable', 'date'],
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $discount->update($validated);

        return response()->json([
            'message'  => 'Diskon berhasil diperbarui.',
            'discount' => $discount->fresh(),
        ]);
    }

    /**
     * DELETE /api/v1/discounts/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $discount = Discount::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->firstOrFail();

        $discount->delete();

        return response()->json(['message' => 'Diskon berhasil dihapus.']);
    }

    /**
     * POST /api/v1/discounts/validate
     * Endpoint khusus untuk validasi kode voucher dari halaman kasir
     * sebelum transaksi diproses
     */
    public function validate(Request $request): JsonResponse
    {
        $request->validate([
            'code'      => ['required', 'string'],
            'subtotal'  => ['required', 'numeric', 'min:0'],
        ]);

        $discount = Discount::where('code', strtoupper($request->code))
            ->where('store_id', $request->user()->store_id)
            ->where('is_active', true)
            ->where(fn($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->where(fn($q) => $q->whereNull('usage_limit')->orWhereColumn('used_count', '<', 'usage_limit'))
            ->first();

        if (! $discount) {
            return response()->json([
                'valid'   => false,
                'message' => 'Kode diskon tidak valid atau sudah kadaluarsa.',
            ], 422);
        }

        if ($request->subtotal < $discount->min_purchase) {
            return response()->json([
                'valid'   => false,
                'message' => 'Minimum pembelian Rp ' . number_format($discount->min_purchase, 0, ',', '.'),
            ], 422);
        }

        // Hitung nominal potongan
        $amount = $discount->type === 'percentage'
            ? $request->subtotal * ($discount->value / 100)
            : $discount->value;

        if ($discount->max_discount) {
            $amount = min($amount, $discount->max_discount);
        }

        return response()->json([
            'valid'           => true,
            'discount_id'     => $discount->id,
            'name'            => $discount->name,
            'type'            => $discount->type,
            'value'           => (float) $discount->value,
            'discount_amount' => round($amount, 2),
        ]);
    }
}
