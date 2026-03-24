<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discounts', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 50)->nullable()->comment('Kode voucher, null = otomatis');
            $table->string('type')->default('percentage')->comment('percentage | fixed');
            $table->decimal('value', 15, 2)->comment('Nilai diskon (% atau nominal)');
            $table->decimal('min_purchase', 15, 2)->default(0)->comment('Minimum pembelian');
            $table->decimal('max_discount', 15, 2)->nullable()->comment('Maksimum potongan (untuk %)');
            $table->integer('usage_limit')->nullable()->comment('Null = tidak terbatas');
            $table->integer('used_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['store_id', 'code']);
            $table->index(['store_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discounts');
    }
};
