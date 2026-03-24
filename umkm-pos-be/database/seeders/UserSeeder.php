<?php

namespace Database\Seeders;

use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ambil Store Utama secara spesifik
        $utama = Store::where('name', 'SmartPOS Utama')->first();

        if ($utama) {
            // --- AKUN DEMO KHUSUS STORE UTAMA ---

            // Owner Demo
            User::create([
                'id'        => (string) Str::uuid(),
                'store_id'  => $utama->id,
                'name'      => 'Owner Demo',
                'email'     => 'owner@demo.com',
                'password'  => Hash::make('password'),
                'role'      => 'owner',
                'is_active' => true,
            ]);

            // Manager Demo
            User::create([
                'id'        => (string) Str::uuid(),
                'store_id'  => $utama->id,
                'name'      => 'Manager Demo',
                'email'     => 'manager@demo.com',
                'password'  => Hash::make('password'),
                'role'      => 'manager',
                'is_active' => true,
            ]);

            // Kasir Demo
            User::create([
                'id'        => (string) Str::uuid(),
                'store_id'  => $utama->id,
                'name'      => 'Kasir Demo',
                'email'     => 'kasir@demo.com',
                'password'  => Hash::make('password'),
                'role'      => 'cashier',
                'is_active' => true,
            ]);
        }

        // 2. LOGIKA OTOMATIS UNTUK SEMUA TOKO (Termasuk Utama, Surabaya, dll)
        // Ini agar setiap toko tetap punya user operasionalnya sendiri
        $stores = Store::all();

        foreach ($stores as $store) {
            $slug = Str::slug(str_replace('SmartPOS', '', $store->name));
            if (empty($slug)) $slug = 'utama';

            // Buat Owner (Otomatis)
            User::create([
                'id'        => (string) Str::uuid(),
                'store_id'  => $store->id,
                'name'      => "Owner $store->name",
                'email'     => "owner.$slug@smartpos.com",
                'password'  => Hash::make('password'),
                'role'      => 'owner',
                'is_active' => true,
            ]);

            // Buat Manager (Otomatis)
            User::create([
                'id'        => (string) Str::uuid(),
                'store_id'  => $store->id,
                'name'      => "Manager $store->name",
                'email'     => "manager.$slug@smartpos.com",
                'password'  => Hash::make('password'),
                'role'      => 'manager',
                'is_active' => true,
            ]);

            // Buat 2 Kasir (Otomatis)
            for ($i = 1; $i <= 2; $i++) {
                User::create([
                    'id'        => (string) Str::uuid(),
                    'store_id'  => $store->id,
                    'name'      => "Kasir $i $store->name",
                    'email'     => "kasir$i.$slug@smartpos.com",
                    'password'  => Hash::make('password'),
                    'role'      => 'cashier',
                    'is_active' => true,
                ]);
            }
        }
    }
}
