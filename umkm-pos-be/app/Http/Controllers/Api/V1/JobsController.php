<?php

namespace App\Jobs;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Job: kirim struk ke WhatsApp / email pelanggan (async).
 * Berjalan di queue 'receipts' agar tidak memblokir response POS.
 */
class SendReceiptJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 30;

    public function __construct(public readonly string $orderId)
    {
        $this->onQueue('receipts');
    }

    public function handle(): void
    {
        $order = Order::with(['items', 'store', 'customer', 'user'])->find($this->orderId);

        if (! $order) return;

        // TODO: Integrasi WhatsApp API (Fonnte, Wablas, dll)
        // atau email via Laravel Notification
        if ($order->customer?->email) {
            // Mail::to($order->customer->email)->send(new ReceiptMail($order));
        }
    }
}


// ===================== app/Jobs/SyncToAnalyticsJob.php =====================
namespace App\Jobs;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

/**
 * Job: sync data transaksi ke Python Analytics Service.
 * Berjalan di queue 'analytics' secara terpisah.
 */
class SyncToAnalyticsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 5;
    public int $timeout = 60;
    public int $backoff = 30; // Retry setelah 30 detik

    public function __construct(public readonly string $orderId)
    {
        $this->onQueue('analytics');
    }

    public function handle(): void
    {
        $order = Order::with('items')->find($this->orderId);

        if (! $order) return;

        // Kirim ke Python/Django Analytics Service
        Http::timeout(20)
            ->withToken(config('services.analytics.token'))
            ->post(config('services.analytics.url') . '/api/orders/sync', [
                'order_id'   => $order->id,
                'store_id'   => $order->store_id,
                'total'      => $order->total,
                'items'      => $order->items->map(fn($i) => [
                    'product_id'   => $i->product_id,
                    'product_name' => $i->product_name,
                    'quantity'     => $i->quantity,
                    'subtotal'     => $i->subtotal,
                    'cost'         => $i->cost_price * $i->quantity,
                ]),
                'created_at' => $order->created_at->toIso8601String(),
            ]);
    }
}


// ===================== app/Events/OrderCompleted.php =====================
namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Event: broadcast ke dashboard real-time via Laravel Reverb (WebSocket).
 * React dashboard mendengarkan channel ini untuk update live.
 */
class OrderCompleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Order $order) {}

    public function broadcastOn(): array
    {
        return [
            new Channel("store.{$this->order->store_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'order.completed';
    }

    public function broadcastWith(): array
    {
        return [
            'order_id'     => $this->order->id,
            'order_number' => $this->order->order_number,
            'total'        => $this->order->total,
            'created_at'   => $this->order->created_at->toIso8601String(),
        ];
    }
}
