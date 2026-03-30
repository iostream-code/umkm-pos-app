<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('opening_cash', 15, 2)->default(0)->comment('Modal awal shift');
            $table->decimal('closing_cash', 15, 2)->nullable()->comment('Uang aktual saat tutup');
            $table->decimal('expected_cash', 15, 2)->nullable()->comment('Uang yang seharusnya ada');
            $table->decimal('total_sales', 15, 2)->default(0);
            $table->decimal('total_cash_sales', 15, 2)->default(0);
            $table->decimal('total_non_cash_sales', 15, 2)->default(0);
            $table->integer('total_transactions')->default(0);
            $table->string('status')->default('open')->comment('open | closed');
            $table->text('notes')->nullable()->comment('Catatan kasir saat tutup shift');
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'status']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shifts');
    }
};
