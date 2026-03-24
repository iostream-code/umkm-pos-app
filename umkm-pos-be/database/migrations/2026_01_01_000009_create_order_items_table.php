<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignUuid('product_id')->nullable()->constrained('products')->nullOnDelete();

            // Snapshot data produk saat transaksi — PENTING!
            // Produk bisa berubah harga/nama setelahnya, tapi record transaksi tetap akurat
            $table->string('product_name')->comment('Snapshot nama produk saat transaksi');
            $table->string('product_sku')->nullable()->comment('Snapshot SKU');
            $table->decimal('price', 15, 2)->comment('Harga jual saat transaksi');
            $table->decimal('cost_price', 15, 2)->default(0)->comment('HPP saat transaksi');
            $table->integer('quantity');
            $table->decimal('discount_amount', 15, 2)->default(0)->comment('Diskon per item');
            $table->decimal('subtotal', 15, 2)->comment('(price - discount) * quantity');
            $table->timestamps();

            $table->index('order_id');
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
