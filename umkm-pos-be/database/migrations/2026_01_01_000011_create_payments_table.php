<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('method');
            $table->decimal('amount', 15, 2);
            $table->string('reference')->nullable();
            $table->string('status')->default('paid');
            $table->jsonb('metadata')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index('order_id');
            $table->index(['method', 'status']);
            $table->index('metadata', 'payments_metadata_gin', 'gin');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
