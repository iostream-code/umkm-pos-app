<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('name');
            $table->string('phone', 20)->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->date('birth_date')->nullable()->comment('Untuk promo ulang tahun');
            $table->integer('total_transactions')->default(0);
            $table->decimal('total_spent', 15, 2)->default(0);
            $table->decimal('loyalty_points', 10, 2)->default(0)->comment('Poin reward pelanggan');
            $table->timestamp('last_transaction_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['store_id', 'phone']);
            $table->index(['store_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
