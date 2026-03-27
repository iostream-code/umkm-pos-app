<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\AnalyticsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Job: sync data transaksi ke Python Analytics Service.
 * Dijalankan async setelah setiap transaksi selesai di OrderService.
 */
class SyncToAnalyticsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int   $tries   = 5;
    public int   $timeout = 60;
    public array $backoff = [30, 60, 120, 300, 600];

    public function __construct(
        public readonly string $orderId
    ) {
        $this->onQueue('analytics');
    }

    public function handle(AnalyticsService $analytics): void
    {
        $order = Order::with('items')->find($this->orderId);

        if (! $order) {
            Log::warning("SyncToAnalyticsJob: order {$this->orderId} tidak ditemukan.");
            return;
        }

        $payload = [
            'order_id'       => $order->id,
            'store_id'       => $order->store_id,
            'status'         => $order->status,
            'subtotal'       => (float) $order->subtotal,
            'discount'       => (float) $order->discount_amount,
            'tax'            => (float) $order->tax_amount,
            'total'          => (float) $order->total,
            'payment_method' => $order->payment_method,
            'items'          => $order->items->map(fn($i) => [
                'product_id'   => $i->product_id,
                'product_name' => $i->product_name,
                'quantity'     => $i->quantity,
                'price'        => (float) $i->price,
                'cost_price'   => (float) $i->cost_price,
                'subtotal'     => (float) $i->subtotal,
            ])->toArray(),
            'created_at' => $order->created_at->toIso8601String(),
        ];

        $success = $analytics->syncOrder($payload);

        if (! $success) {
            // Lempar exception agar queue menjalankan retry
            throw new \RuntimeException("Analytics sync gagal untuk order {$this->orderId}");
        }

        Log::info("Order {$order->order_number} berhasil disync ke analytics.");
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("SyncToAnalyticsJob final failure untuk order {$this->orderId}: {$exception->getMessage()}");
    }
}
