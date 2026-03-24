<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Store;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        // Mengambil ID store yang sudah dibuat di StoreSeeder
        $storeId = Store::first()->id;

        // Customer 1: Umum
        Customer::create([
            'id'                  => (string) Str::uuid(),
            'store_id'            => $storeId,
            'name'                => 'Budi Santoso',
            'phone'               => '081234567890',
            'email'               => 'budi@example.com',
            'address'             => 'Jl. Mawar No. 12, Jakarta',
            'birth_date'          => '1990-05-15',
            'total_transactions'  => 5,
            'total_spent'         => 750000.00,
            'loyalty_points'      => 75.00,
            'last_transaction_at' => now()->subDays(2),
        ]);

        // Customer 2: Pelanggan Setia
        Customer::create([
            'id'                  => (string) Str::uuid(),
            'store_id'            => $storeId,
            'name'                => 'Siti Aminah',
            'phone'               => '085712345678',
            'email'               => 'siti@example.com',
            'address'             => 'Komp. Melati Blok C/10, Bandung',
            'birth_date'          => '1985-11-20',
            'total_transactions'  => 12,
            'total_spent'         => 2500000.00,
            'loyalty_points'      => 250.00,
            'last_transaction_at' => now()->subHours(5),
        ]);

        // Customer 3: Baru
        Customer::create([
            'id'                  => (string) Str::uuid(),
            'store_id'            => $storeId,
            'name'                => 'Andi Wijaya',
            'phone'               => '081399887766',
            'email'               => 'andi@example.com',
            'address'             => 'Apartemen Green View Lt. 5',
            'birth_date'          => '1995-02-10',
            'total_transactions'  => 0,
            'total_spent'         => 0,
            'loyalty_points'      => 0,
            'last_transaction_at' => null,
        ]);
    }
}
