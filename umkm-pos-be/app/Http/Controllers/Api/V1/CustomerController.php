<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    /**
     * GET /api/v1/customers
     * Query params: search, per_page
     */
    public function index(Request $request): JsonResponse
    {
        $customers = Customer::where('store_id', $request->user()->store_id)
            ->when($request->search, fn($q) =>
                $q->where(function ($query) use ($request) {
                    $query->where('name', 'ilike', "%{$request->search}%")
                          ->orWhere('phone', 'ilike', "%{$request->search}%")
                          ->orWhere('email', 'ilike', "%{$request->search}%");
                })
            )
            ->orderBy('name')
            ->paginate($request->get('per_page', 20));

        return response()->json($customers);
    }

    /**
     * POST /api/v1/customers
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:100'],
            'phone'      => ['nullable', 'string', 'max:20'],
            'email'      => ['nullable', 'email', 'max:100'],
            'address'    => ['nullable', 'string'],
            'birth_date' => ['nullable', 'date', 'before:today'],
        ]);

        $customer = Customer::create([
            ...$validated,
            'store_id' => $request->user()->store_id,
        ]);

        return response()->json([
            'message'  => 'Pelanggan berhasil ditambahkan.',
            'customer' => $customer,
        ], 201);
    }

    /**
     * GET /api/v1/customers/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $customer = Customer::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->firstOrFail();

        return response()->json(['customer' => $customer]);
    }

    /**
     * PUT /api/v1/customers/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $customer = Customer::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->firstOrFail();

        $validated = $request->validate([
            'name'       => ['sometimes', 'string', 'max:100'],
            'phone'      => ['nullable', 'string', 'max:20'],
            'email'      => ['nullable', 'email', 'max:100'],
            'address'    => ['nullable', 'string'],
            'birth_date' => ['nullable', 'date', 'before:today'],
        ]);

        $customer->update($validated);

        return response()->json([
            'message'  => 'Data pelanggan berhasil diperbarui.',
            'customer' => $customer->fresh(),
        ]);
    }

    /**
     * DELETE /api/v1/customers/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $customer = Customer::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->firstOrFail();

        $customer->delete();

        return response()->json(['message' => 'Pelanggan berhasil dihapus.']);
    }

    /**
     * GET /api/v1/customers/{id}/orders
     * Riwayat transaksi pelanggan
     */
    public function orders(Request $request, string $id): JsonResponse
    {
        $customer = Customer::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->firstOrFail();

        $orders = Order::where('customer_id', $customer->id)
            ->where('status', 'completed')
            ->with('items:id,order_id,product_name,quantity,subtotal')
            ->latest()
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'customer' => [
                'id'                  => $customer->id,
                'name'                => $customer->name,
                'total_transactions'  => $customer->total_transactions,
                'total_spent'         => (float) $customer->total_spent,
                'loyalty_points'      => (float) $customer->loyalty_points,
                'last_transaction_at' => $customer->last_transaction_at?->diffForHumans(),
            ],
            'orders' => $orders,
        ]);
    }
}
