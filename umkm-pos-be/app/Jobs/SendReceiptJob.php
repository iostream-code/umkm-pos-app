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
