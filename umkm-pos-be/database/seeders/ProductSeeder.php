<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $store = Store::first();

        // Ambil kategori berdasarkan slug
        $catMakananBerat = Category::where('slug', 'makanan-berat')->first();
        $catMakanan      = Category::where('slug', 'makanan-ringan')->first();
        $catMinuman      = Category::where('slug', 'minuman')->first();

        // --- MAKANAN BERAT ---
        $makananBerat = [
            [
                'name' => 'Nasi Goreng Spesial',
                'sku' => 'FB-NGS-001',
                'price' => 25000,
                'cost' => 15000,
                'unit' => 'porsi'
            ],
            [
                'name' => 'Mie Goreng Jawa',
                'sku' => 'FB-MGJ-002',
                'price' => 22000,
                'cost' => 12000,
                'unit' => 'porsi'
            ],
            [
                'name' => 'Ayam Bakar Madu',
                'sku' => 'FB-ABM-003',
                'price' => 35000,
                'cost' => 20000,
                'unit' => 'porsi'
            ],
        ];

        foreach ($makananBerat as $item) {
            $this->createProduct($store->id, $catMakananBerat->id, $item);
        }

        // --- KUE / CEMILAN ---
        $kue = [
            [
                'name' => 'Brownies Cokelat',
                'sku' => 'SN-BRW-001',
                'price' => 15000,
                'cost' => 8000,
                'unit' => 'potong'
            ],
            [
                'name' => 'Risoles Ayam',
                'sku' => 'SN-RIS-002',
                'price' => 5000,
                'cost' => 2500,
                'unit' => 'pcs'
            ],
            [
                'name' => 'Klepon Pandan',
                'sku' => 'SN-KLP-003',
                'price' => 10000,
                'cost' => 5000,
                'unit' => 'porsi'
            ],
        ];

        foreach ($kue as $item) {
            $this->createProduct($store->id, $catMakanan->id, $item);
        }

        // --- MINUMAN ---
        $minuman = [
            [
                'name' => 'Es Teh Manis',
                'sku' => 'DR-ETM-001',
                'price' => 5000,
                'cost' => 1500,
                'unit' => 'gelas'
            ],
            [
                'name' => 'Jus Alpukat',
                'sku' => 'DR-JAL-002',
                'price' => 18000,
                'cost' => 9000,
                'unit' => 'gelas'
            ],
            [
                'name' => 'Kopi Susu Gula Aren',
                'sku' => 'DR-KSG-003',
                'price' => 22000,
                'cost' => 10000,
                'unit' => 'cup'
            ],
        ];

        foreach ($minuman as $item) {
            $this->createProduct($store->id, $catMinuman->id, $item);
        }
    }

    /**
     * Helper function untuk membuat produk agar kode lebih bersih
     */
    private function createProduct($storeId, $categoryId, $data)
    {
        Product::create([
            'id'          => (string) Str::uuid(),
            'store_id'    => $storeId,
            'category_id' => $categoryId,
            'name'        => $data['name'],
            'sku'         => $data['sku'],
            'barcode'     => null,
            'description' => 'Menu lezat ' . $data['name'] . ' dari SmartPOS.',
            'price'       => $data['price'],
            'cost_price'  => $data['cost'],
            'stock'       => 100,
            'min_stock'   => 10,
            'unit'        => $data['unit'],
            'track_stock' => true,
            'is_active'   => true,
        ]);
    }
}
