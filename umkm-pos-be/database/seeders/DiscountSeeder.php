<?php

namespace Database\Seeders;

use App\Models\Discount;
use App\Models\Store;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DiscountSeeder extends Seeder
{
    public function run(): void
    {
        $storeId = Store::first()->id;

        Discount::create([
            'id'           => (string) Str::uuid(),
            'store_id'     => $storeId,
            'name'         => 'Promo Grand Opening',
            'code'         => 'MEMBERBARU',
            'type'         => 'percentage',
            'value'        => 10,
            'min_purchase' => 50000,
            'max_discount' => 10000,
            'is_active'    => true,
            'starts_at'    => now(),
            'expires_at'   => now()->addMonths(1),
        ]);
    }
}
