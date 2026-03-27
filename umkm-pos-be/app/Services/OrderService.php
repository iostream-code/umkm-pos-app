<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderDiscount;
use App\Models\Payment;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Customer;
use App\Models\User;
use App\Jobs\SendReceiptJob;
use App\Jobs\SyncToAnalyticsJob;
use App\Events\OrderCompleted;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class OrderService
{
    /**
     * Buat transaksi baru — operasi paling kritis di POS.
     * Seluruh proses dibungkus dalam DB transaction untuk menjamin atomicity.
     */
    public function createTransaction(User $cashier, array $data): Order
    {
        return DB::transaction(function () use ($cashier, $data) {

            // 1. Hitung ulang total di server (jangan percaya angka dari client)
            $items     = $this->validateAndBuildItems($data['items'], $cashier->store_id);
            $subtotal  = $items->sum('subtotal');

            // 2. Terapkan diskon jika ada
            $discountAmount = 0;
            $discountData   = [];
            if (! empty($data['discount_code'])) {
                [$discountAmount, $discountData] = $this->applyDiscount(
                    $data['discount_code'],
                    $subtotal,
                    $cashier->store_id
                );
            }

            // 3. Hitung pajak
            $taxPercentage = $data['tax_percentage'] ?? 0;
            $taxAmount     = ($subtotal - $discountAmount) * ($taxPercentage / 100);
            $total         = $subtotal - $discountAmount + $taxAmount;

            // 4. Buat order
            $order = Order::create([
                'store_id'        => $cashier->store_id,
                'user_id'         => $cashier->id,
                'shift_id'        => $data['shift_id'] ?? null,
                'customer_id'     => $data['customer_id'] ?? null,
                'status'          => 'completed',
                'subtotal'        => $subtotal,
                'discount_amount' => $discountAmount,
                'tax_percentage'  => $taxPercentage,
                'tax_amount'      => $taxAmount,
                'total'           => $total,
                'payment_method'  => $data['payment_method'],
                'amount_paid'     => $data['amount_paid'],
                'change_amount'   => max(0, $data['amount_paid'] - $total),
                'notes'           => $data['notes'] ?? null,
            ]);

            // 5. Simpan item & kurangi stok (dengan row-level lock)
            foreach ($items as $item) {
                $order->items()->create($item);

                // Update stok dengan lock untuk mencegah race condition
                $product = Product::lockForUpdate()->find($item['product_id']);
                if ($product->track_stock) {
                    $stockBefore = $product->stock;
                    $product->decrement('stock', $item['quantity']);

                    StockMovement::create([
                        'product_id'     => $product->id,
                        'store_id'       => $cashier->store_id,
                        'user_id'        => $cashier->id,
                        'type'           => 'sale',
                        'quantity'       => -$item['quantity'],
                        'stock_before'   => $stockBefore,
                        'stock_after'    => $stockBefore - $item['quantity'],
                        'reference_id'   => $order->id,
                        'reference_type' => Order::class,
                    ]);
                }
            }

            // 6. Simpan diskon
            if ($discountData) {
                $order->discounts()->create($discountData + ['discount_amount' => $discountAmount]);
                // Tambah usage count
                if (isset($discountData['discount_id'])) {
                    \App\Models\Discount::where('id', $discountData['discount_id'])
                        ->increment('used_count');
                }
            }

            // 7. Simpan pembayaran
            $order->payments()->create([
                'method'   => $data['payment_method'],
                'amount'   => $data['amount_paid'],
                'status'   => 'paid',
                'paid_at'  => now(),
                'metadata' => $data['payment_metadata'] ?? null,
            ]);

            // 8. Update statistik pelanggan
            if (! empty($data['customer_id'])) {
                Customer::where('id', $data['customer_id'])->update([
                    'total_transactions'    => DB::raw('total_transactions + 1'),
                    'total_spent'           => DB::raw("total_spent + {$total}"),
                    'last_transaction_at'   => now(),
                ]);
            }

            // 9. Dispatch jobs (async — tidak mengganggu response time)
            SendReceiptJob::dispatch($order->id);
            SyncToAnalyticsJob::dispatch($order->id);

            // 10. Fire event (untuk WebSocket real-time dashboard)
            event(new OrderCompleted($order));

            return $order;
        });
    }

    /**
     * Validasi setiap item: cek ketersediaan produk & stok.
     * Hitung subtotal berdasarkan harga server, bukan client.
     */
    private function validateAndBuildItems(array $rawItems, string $storeId): \Illuminate\Support\Collection
    {
        $productIds = collect($rawItems)->pluck('product_id');

        $products = Product::whereIn('id', $productIds)
            ->where('store_id', $storeId)
            ->where('is_active', true)
            ->get()
            ->keyBy('id');

        $items = collect();

        foreach ($rawItems as $raw) {
            $product = $products->get($raw['product_id'])
                ?? throw new NotFoundHttpException("Produk {$raw['product_id']} tidak ditemukan.");

            if ($product->track_stock && $product->stock < $raw['quantity']) {
                throw new UnprocessableEntityHttpException(
                    "Stok {$product->name} tidak mencukupi. Tersedia: {$product->stock}."
                );
            }

            $items->push([
                'product_id'   => $product->id,
                'product_name' => $product->name,
                'product_sku'  => $product->sku,
                'price'        => $product->price,         // harga dari DB, bukan client!
                'cost_price'   => $product->cost_price,
                'quantity'     => $raw['quantity'],
                'discount_amount' => 0,
                'subtotal'     => $product->price * $raw['quantity'],
            ]);
        }

        return $items;
    }

    /**
     * Validasi & hitung diskon.
     */
    private function applyDiscount(string $code, float $subtotal, string $storeId): array
    {
        $discount = \App\Models\Discount::where('code', $code)
            ->where('store_id', $storeId)
            ->where('is_active', true)
            ->where(fn($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->where(fn($q) => $q->whereNull('usage_limit')->orWhereColumn('used_count', '<', 'usage_limit'))
            ->first();

        if (! $discount) {
            throw new UnprocessableEntityHttpException('Kode diskon tidak valid atau sudah kadaluarsa.');
        }

        if ($subtotal < $discount->min_purchase) {
            throw new UnprocessableEntityHttpException(
                "Minimum pembelian untuk diskon ini adalah Rp " . number_format($discount->min_purchase, 0, ',', '.')
            );
        }

        $amount = $discount->type === 'percentage'
            ? $subtotal * ($discount->value / 100)
            : $discount->value;

        if ($discount->max_discount) {
            $amount = min($amount, $discount->max_discount);
        }

        return [
            round($amount, 2),
            [
                'discount_id'    => $discount->id,
                'discount_name'  => $discount->name,
                'discount_code'  => $discount->code,
                'discount_type'  => $discount->type,
                'discount_value' => $discount->value,
            ],
        ];
    }

    public function cancel(string $id, string $storeId, string $userId, string $reason): Order
    {
        return DB::transaction(function () use ($id, $storeId, $userId, $reason) {
            $order = $this->findOrFail($id, $storeId);

            if ($order->status !== 'completed') {
                throw new UnprocessableEntityHttpException('Hanya transaksi completed yang bisa dibatalkan.');
            }

            $order->update([
                'status'        => 'cancelled',
                'cancelled_at'  => now(),
                'cancel_reason' => $reason,
            ]);

            // Kembalikan stok
            foreach ($order->items as $item) {
                if ($item->product && $item->product->track_stock) {
                    $stockBefore = $item->product->stock;
                    $item->product->increment('stock', $item->quantity);

                    StockMovement::create([
                        'product_id'     => $item->product_id,
                        'store_id'       => $storeId,
                        'user_id'        => $userId,
                        'type'           => 'return',
                        'quantity'       => $item->quantity,
                        'stock_before'   => $stockBefore,
                        'stock_after'    => $stockBefore + $item->quantity,
                        'notes'          => "Pembatalan order {$order->order_number}",
                        'reference_id'   => $order->id,
                        'reference_type' => Order::class,
                    ]);
                }
            }

            return $order->fresh();
        });
    }

    public function generateReceipt(string $id, string $storeId): array
    {
        $order = $this->findOrFail($id, $storeId);
        $order->load(['items', 'payments', 'discounts', 'customer', 'store', 'user']);

        return [
            'store'          => [
                'name'    => $order->store->name,
                'address' => $order->store->address,
                'phone'   => $order->store->phone,
                'footer'  => $order->store->receipt_footer,
            ],
            'order_number'   => $order->order_number,
            'date'           => $order->created_at->format('d/m/Y H:i'),
            'cashier'        => $order->user->name,
            'customer'       => $order->customer?->name ?? 'Umum',
            'items'          => $order->items->map(fn($i) => [
                'name'     => $i->product_name,
                'qty'      => $i->quantity,
                'price'    => $i->price,
                'subtotal' => $i->subtotal,
            ]),
            'subtotal'       => $order->subtotal,
            'discount'       => $order->discount_amount,
            'tax'            => $order->tax_amount,
            'total'          => $order->total,
            'amount_paid'    => $order->amount_paid,
            'change'         => $order->change_amount,
            'payment_method' => $order->payment_method,
        ];
    }

    public function paginate(string $storeId, array $filters, int $perPage): LengthAwarePaginator
    {
        $query = Order::where('store_id', $storeId)
            ->with(['user:id,name', 'customer:id,name'])
            ->latest();

        if (! empty($filters['search'])) {
            $query->where('order_number', 'ilike', "%{$filters['search']}%");
        }

        foreach (['status', 'payment_method', 'user_id', 'shift_id'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $query->paginate($perPage);
    }

    public function findOrFail(string $id, string $storeId): Order
    {
        return Order::where('id', $id)
            ->where('store_id', $storeId)
            ->firstOrFail();
    }

    public function refund(string $id, string $storeId, string $userId, string $reason, float $amount): Order
    {
        $order = $this->findOrFail($id, $storeId);

        if ($order->status !== 'completed') {
            throw new UnprocessableEntityHttpException('Hanya transaksi completed yang bisa direfund.');
        }

        $order->update(['status' => 'refunded']);

        $order->payments()->create([
            'method'   => $order->payment_method,
            'amount'   => -$amount,
            'status'   => 'refunded',
            'paid_at'  => now(),
            'metadata' => ['reason' => $reason, 'refunded_by' => $userId],
        ]);

        return $order->fresh();
    }
}
