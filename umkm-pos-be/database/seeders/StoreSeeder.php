<?php

namespace Database\Seeders;

use App\Models\Store;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class StoreSeeder extends Seeder
{
    public function run(): void
    {
        $stores = [
            [
                'name'    => 'SmartPOS Utama',
                'address' => 'Jl. Teknologi No. 101, Jakarta',
                'phone'   => '02112345678',
                'email'   => 'utama@smartpos.com',
                'city'    => 'Surabaya'
            ],
            [
                'name'    => 'SmartPOS Surabaya',
                'address' => 'Jl. Gubeng No. 50, Surabaya',
                'phone'   => '03187654321',
                'email'   => 'surabaya@smartpos.com',
                'city'    => 'Surabaya'
            ],
            [
                'name'    => 'SmartPOS Jakarta Barat',
                'address' => 'Jl. Puri Indah No. 10, Jakarta',
                'phone'   => '02199887766',
                'email'   => 'jakbar@smartpos.com',
                'city'    => 'Jakarta'
            ],
        ];

        foreach ($stores as $store) {
            Store::create([
                'id'             => (string) Str::uuid(),
                'name'           => $store['name'],
                'address'        => $store['address'],
                'phone'          => $store['phone'],
                'email'          => $store['email'],
                'tax_number'     => '12.345.678.9-0' . rand(10, 99) . '.000',
                'currency'       => 'IDR',
                'timezone'       => 'Asia/Jakarta',
                'receipt_footer' => 'Terima kasih telah berbelanja di ' . $store['name'] . '!',
                'is_active'      => true,
            ]);
        }
    }
}
