<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignUuid('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name');
            $table->string('sku', 100)->nullable()->comment('Stock Keeping Unit');
            $table->string('barcode', 100)->nullable()->comment('Kode barcode produk');
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->decimal('price', 15, 2)->comment('Harga jual');
            $table->decimal('cost_price', 15, 2)->default(0)->comment('Harga modal/HPP');
            $table->integer('stock')->default(0);
            $table->integer('min_stock')->default(5)->comment('Minimum stok sebelum alert');
            $table->string('unit', 30)->default('pcs')->comment('Satuan: pcs, kg, liter, dll');
            $table->boolean('track_stock')->default(true)->comment('Apakah stok dilacak');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['store_id', 'sku']);
            $table->unique(['store_id', 'barcode']);
            $table->index(['store_id', 'category_id']);
            $table->index(['store_id', 'is_active']);
            $table->index('name'); // Untuk pencarian produk cepat di POS
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
