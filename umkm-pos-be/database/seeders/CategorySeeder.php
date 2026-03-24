<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Store;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $storeId = Store::first()->id;

        $food = Category::create([
            'id'         => (string) Str::uuid(),
            'store_id'   => $storeId,
            'name'       => 'Makanan Ringan',
            'slug'       => 'makanan-ringan',
            'color'      => '#FF5733',
            'sort_order' => 1,
        ]);

        Category::create([
            'id'         => (string) Str::uuid(),
            'store_id'   => $storeId,
            'parent_id'  => $food->id,
            'name'       => 'Makanan Berat',
            'slug'       => 'makanan-berat',
            'color'      => '#C70039',
            'sort_order' => 1,
        ]);

        Category::create([
            'id'         => (string) Str::uuid(),
            'store_id'   => $storeId,
            'name'       => 'Minuman',
            'slug'       => 'minuman',
            'color'      => '#33C1FF',
            'sort_order' => 2,
        ]);
    }
}
