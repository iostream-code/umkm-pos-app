<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_discounts', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignUuid('discount_id')->nullable()->constrained('discounts')->nullOnDelete();
            $table->string('discount_name')->comment('Snapshot nama diskon');
            $table->string('discount_code')->nullable()->comment('Snapshot kode voucher');
            $table->string('discount_type')->comment('percentage | fixed');
            $table->decimal('discount_value', 15, 2)->comment('Snapshot nilai diskon');
            $table->decimal('discount_amount', 15, 2)->comment('Nominal potongan aktual');
            $table->timestamps();

            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_discounts');
    }
};
