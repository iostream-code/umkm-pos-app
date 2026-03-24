<?php

namespace Database\Seeders;

use App\Models\Store;
use App\Models\User;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Shift;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderDiscount;
use App\Models\Discount;
use App\Models\Payment;
use App\Models\StockMovement;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Carbon\Carbon;

class OrderSeeder extends Seeder
{
    public function run(): void
    {
        $store    = Store::where('name', 'SmartPOS Utama')->first();
        $user     = User::where('email', 'kasir@demo.com')->first();
        $customer = Customer::where('store_id', $store->id)->first();
        $products = Product::where('store_id', $store->id)->take(5)->get();

        if (!$store || !$user || $products->isEmpty()) {
            return;
        }

        // ── 1. Buat Diskon Sampel ─────────────────────────────────
        $discount = Discount::updateOrCreate(
            ['code' => 'PROMOHEBOH', 'store_id' => $store->id],
            [
                'id'         => (string) Str::uuid(),
                'name'       => 'Diskon Promo Heboh',
                'type'       => 'percentage',
                'value'      => 10,
                'is_active'  => true,
                'starts_at'  => now()->subDays(10),
                'expires_at' => now()->addDays(10),
            ]
        );

        // ── 2. Buat Shift (satu shift mencakup semua transaksi) ───
        $shift = Shift::create([
            'id'           => (string) Str::uuid(),
            'store_id'     => $store->id,
            'user_id'      => $user->id,
            'opening_cash' => 500000,
            'status'       => 'open',
            'opened_at'    => now()->subDays(7),
        ]);

        // ── 3. Data transaksi per hari (7 hari terakhir) ──────────
        //   Setiap elemen = [ daysAgo, hour, productIndexes[], method, pakai diskon? ]
        $schedule = [
            // 7 hari lalu
            [7, 10, [0, 1],    'cash',  false],
            [7, 14, [2, 3],    'debit', false],

            // 6 hari lalu
            [6, 9,  [1, 4],    'cash',  false],
            [6, 16, [0, 2],    'debit', false],
            [6, 19, [3],       'cash',  false],

            // 5 hari lalu
            [5, 11, [0, 3],    'cash',  false],
            [5, 15, [1, 2],    'debit', false],

            // 4 hari lalu
            [4, 10, [2, 4],    'cash',  false],
            [4, 13, [0, 1],    'debit', false],
            [4, 17, [3, 4],    'cash',  true],   // pakai diskon

            // 3 hari lalu
            [3, 9,  [0, 2],    'cash',  false],
            [3, 12, [1, 3],    'debit', false],
            [3, 15, [4],       'cash',  false],
            [3, 18, [0, 1, 2], 'debit', false],

            // 2 hari lalu (kemarin-kemarin)
            [2, 10, [1, 4],    'cash',  false],
            [2, 14, [0, 3],    'debit', true],   // pakai diskon
            [2, 17, [2],       'cash',  false],

            // 1 hari lalu (kemarin)
            [1, 9,  [0, 2],    'cash',  false],
            [1, 13, [1, 3],    'debit', false],
            [1, 16, [0, 4],    'cash',  false],
            [1, 20, [2, 3],    'debit', false],

            // Hari ini
            [0, 8,  [1, 2],    'cash',  false],
            [0, 11, [0, 3],    'debit', false],
            [0, 14, [0, 1, 4], 'cash',  true],   // pakai diskon
        ];

        foreach ($schedule as [$daysAgo, $hour, $productIndexes, $method, $useDiscount]) {
            $date          = Carbon::now()->subDays($daysAgo)->setHour($hour)->setMinute(rand(0, 59))->setSecond(0);
            $selectedProds = collect($productIndexes)->map(fn($i) => $products[$i])->filter()->values();

            if ($selectedProds->isEmpty()) {
                continue;
            }

            $this->createCompleteOrder(
                $store,
                $user,
                $shift,
                $customer,
                $selectedProds->all(),
                $method,
                $date,
                $useDiscount ? $discount : null
            );
        }
    }

    // ── Helper: buat satu transaksi lengkap ───────────────────────
    private function createCompleteOrder(
        $store,
        $user,
        $shift,
        $customer,
        array $items,
        string $method,
        Carbon $date,
        $discount = null
    ): void {
        $subtotal = 0;
        $orderId  = (string) Str::uuid();

        foreach ($items as $product) {
            $subtotal += $product->price * 1;
        }

        $discountAmount = $discount ? $subtotal * ($discount->value / 100) : 0;
        $taxAmount      = ($subtotal - $discountAmount) * 0.11;
        $total          = ($subtotal - $discountAmount) + $taxAmount;

        // Nomor invoice unik per hari
        $count       = Order::whereDate('created_at', $date)->where('store_id', $store->id)->count() + 1;
        $orderNumber = 'INV-' . $date->format('Ymd') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

        // 1. Order
        $order = Order::create([
            'id'             => $orderId,
            'store_id'       => $store->id,
            'user_id'        => $user->id,
            'shift_id'       => $shift->id,
            'customer_id'    => $customer->id,
            'order_number'   => $orderNumber,
            'status'         => 'completed',
            'subtotal'       => $subtotal,
            'discount_amount' => $discountAmount,
            'tax_percentage' => 11,
            'tax_amount'     => $taxAmount,
            'total'          => $total,
            'payment_method' => $method,
            'amount_paid'    => $total,
            'change_amount'  => 0,
            'created_at'     => $date,
        ]);

        // 2. Order Items & Stock Movement
        foreach ($items as $product) {
            OrderItem::create([
                'id'              => (string) Str::uuid(),
                'order_id'        => $orderId,
                'product_id'      => $product->id,
                'product_name'    => $product->name,
                'product_sku'     => $product->sku,
                'price'           => $product->price,
                'cost_price'      => $product->cost_price,
                'quantity'        => 1,
                'discount_amount' => 0,
                'subtotal'        => $product->price,
            ]);

            StockMovement::create([
                'id'             => (string) Str::uuid(),
                'product_id'     => $product->id,
                'store_id'       => $store->id,
                'user_id'        => $user->id,
                'type'           => 'out',
                'quantity'       => 1,
                'stock_before'   => $product->stock,
                'stock_after'    => $product->stock - 1,
                'notes'          => 'Penjualan ' . $order->order_number,
                'reference_id'   => $orderId,
                'reference_type' => Order::class,
            ]);

            $product->decrement('stock', 1);
        }

        // 3. Order Discount (jika ada)
        if ($discount) {
            OrderDiscount::create([
                'id'              => (string) Str::uuid(),
                'order_id'        => $orderId,
                'discount_id'     => $discount->id,
                'discount_name'   => $discount->name,
                'discount_code'   => $discount->code,
                'discount_type'   => $discount->type,
                'discount_value'  => $discount->value,
                'discount_amount' => $discountAmount,
            ]);
        }

        // 4. Payment
        Payment::create([
            'id'       => (string) Str::uuid(),
            'order_id' => $orderId,
            'method'   => $method,
            'amount'   => $total,
            'status'   => 'completed',
            'paid_at'  => $date,
        ]);
    }
}
