<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\StoreOrderRequest;
use App\Http\Resources\Order\OrderResource;
use App\Http\Resources\Order\OrderCollection;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orderService
    ) {}

    /**
     * GET /api/v1/orders
     * Riwayat transaksi dengan filter
     */
    public function index(Request $request): JsonResponse
    {
        $orders = $this->orderService->paginate(
            storeId: $request->user()->store_id,
            filters: $request->only([
                'search',
                'status',
                'payment_method',
                'date_from',
                'date_to',
                'user_id',
                'shift_id',
            ]),
            perPage: (int) $request->get('per_page', 10),
        );

        return response()->json(new OrderCollection($orders));
    }

    /**
     * GET /api/v1/orders/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $order = $this->orderService->findOrFail($id, $request->user()->store_id);

        return response()->json([
            'order' => new OrderResource(
                $order->load(['items', 'payments', 'discounts', 'customer', 'user'])
            ),
        ]);
    }

    /**
     * POST /api/v1/orders
     * Proses transaksi baru — inti dari aplikasi POS
     */
    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = $this->orderService->createTransaction(
            cashier: $request->user(),
            data: $request->validated(),
        );

        return response()->json([
            'message' => 'Transaksi berhasil.',
            'order'   => new OrderResource(
                $order->load(['items', 'payments', 'discounts', 'customer'])
            ),
        ], 201);
    }

    /**
     * POST /api/v1/orders/{id}/cancel
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $order = $this->orderService->cancel(
            id: $id,
            storeId: $request->user()->store_id,
            userId: $request->user()->id,
            reason: $request->reason,
        );

        return response()->json([
            'message' => 'Transaksi berhasil dibatalkan.',
            'order'   => new OrderResource($order),
        ]);
    }

    /**
     * POST /api/v1/orders/{id}/refund
     */
    public function refund(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'reason' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:1'],
        ]);

        $order = $this->orderService->refund(
            id: $id,
            storeId: $request->user()->store_id,
            userId: $request->user()->id,
            reason: $request->reason,
            amount: $request->amount,
        );

        return response()->json([
            'message' => 'Refund berhasil diproses.',
            'order'   => new OrderResource($order),
        ]);
    }

    /**
     * GET /api/v1/orders/{id}/receipt
     * Generate data struk untuk print / WhatsApp
     */
    public function receipt(Request $request, string $id): JsonResponse
    {
        $receipt = $this->orderService->generateReceipt(
            id: $id,
            storeId: $request->user()->store_id,
        );

        return response()->json(['receipt' => $receipt]);
    }
}
