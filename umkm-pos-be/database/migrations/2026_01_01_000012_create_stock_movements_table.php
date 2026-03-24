<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users');

            // Tipe mutasi stok
            $table->string('type')->comment('in | out | adjustment | sale | return | damage');

            $table->integer('quantity')->comment('Nilai positif = masuk, negatif = keluar');
            $table->integer('stock_before')->comment('Stok sebelum mutasi');
            $table->integer('stock_after')->comment('Stok setelah mutasi');

            $table->text('notes')->nullable();

            // Polymorphic reference — bisa ke Order, PurchaseOrder, ManualAdjustment, dll
            $table->uuid('reference_id')->nullable();
            $table->string('reference_type')->nullable()->comment('App\\Models\\Order, dll');

            $table->timestamps();

            $table->index(['product_id', 'created_at']);
            $table->index(['store_id', 'type']);
            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
