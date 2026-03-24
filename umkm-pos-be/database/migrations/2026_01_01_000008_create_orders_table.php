<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->comment('Kasir yang memproses');
            $table->foreignUuid('shift_id')->nullable()->constrained('shifts')->nullOnDelete();
            $table->foreignUuid('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('order_number', 50)->comment('Nomor invoice: INV-20260101-0001');
            $table->string('status')->default('completed')
                ->comment('pending | completed | cancelled | refunded');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_percentage', 5, 2)->default(0)->comment('Persentase pajak (misal: 11)');
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->string('payment_method')->default('cash')
                ->comment('cash | qris | card | transfer | mixed');
            $table->decimal('amount_paid', 15, 2)->default(0);
            $table->decimal('change_amount', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['store_id', 'order_number']);
            $table->index(['store_id', 'status']);
            $table->index(['store_id', 'created_at']); // Untuk laporan per tanggal
            $table->index(['user_id', 'created_at']);
            $table->index('shift_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
