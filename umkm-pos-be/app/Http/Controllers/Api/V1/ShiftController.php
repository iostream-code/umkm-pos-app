<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    /**
     * GET /api/v1/shifts/active
     * Cek apakah kasir sedang dalam shift aktif
     */
    public function active(Request $request): JsonResponse
    {
        $shift = Shift::where('store_id', $request->user()->store_id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        return response()->json([
            'shift'    => $shift,
            'is_open'  => (bool) $shift,
        ]);
    }

    /**
     * POST /api/v1/shifts/open
     * Buka shift baru
     */
    public function open(Request $request): JsonResponse
    {
        $request->validate([
            'opening_cash' => ['required', 'numeric', 'min:0'],
        ]);

        // Cek apakah sudah ada shift aktif
        $existing = Shift::where('store_id', $request->user()->store_id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->exists();

        if ($existing) {
            return response()->json([
                'message' => 'Anda masih memiliki shift yang belum ditutup.',
            ], 422);
        }

        $shift = Shift::create([
            'store_id'     => $request->user()->store_id,
            'user_id'      => $request->user()->id,
            'opening_cash' => $request->opening_cash,
            'status'       => 'open',
            'opened_at'    => now(),
        ]);

        return response()->json([
            'message' => 'Shift berhasil dibuka.',
            'shift'   => $shift,
        ], 201);
    }

    /**
     * POST /api/v1/shifts/{id}/close
     * Tutup shift & rekap penjualan
     */
    public function close(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'closing_cash' => ['required', 'numeric', 'min:0'],
            'notes'        => ['nullable', 'string', 'max:500'],
        ]);

        $shift = Shift::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->firstOrFail();

        // Hitung total penjualan selama shift ini
        $salesData = Order::where('shift_id', $shift->id)
            ->where('status', 'completed')
            ->selectRaw('
                COUNT(*) as total_transactions,
                COALESCE(SUM(total), 0) as total_sales,
                COALESCE(SUM(CASE WHEN payment_method = \'cash\' THEN total ELSE 0 END), 0) as total_cash_sales,
                COALESCE(SUM(CASE WHEN payment_method != \'cash\' THEN total ELSE 0 END), 0) as total_non_cash_sales
            ')
            ->first();

        $expectedCash = $shift->opening_cash + $salesData->total_cash_sales;

        $shift->update([
            'closing_cash'         => $request->closing_cash,
            'expected_cash'        => $expectedCash,
            'total_sales'          => $salesData->total_sales,
            'total_cash_sales'     => $salesData->total_cash_sales,
            'total_non_cash_sales' => $salesData->total_non_cash_sales,
            'total_transactions'   => $salesData->total_transactions,
            'status'               => 'closed',
            'closed_at'            => now(),
            'notes'                => $request->notes,
        ]);

        return response()->json([
            'message'       => 'Shift berhasil ditutup.',
            'shift'         => $shift->fresh(),
            'summary'       => [
                'total_sales'        => (float) $salesData->total_sales,
                'total_transactions' => (int) $salesData->total_transactions,
                'expected_cash'      => (float) $expectedCash,
                'actual_cash'        => (float) $request->closing_cash,
                'difference'         => round($request->closing_cash - $expectedCash, 2),
            ],
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $shifts = Shift::where('store_id', $request->user()->store_id)
            ->with('user:id,name')
            ->latest('opened_at')
            ->paginate(15);

        return response()->json($shifts);
    }
}
