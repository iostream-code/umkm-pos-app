<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('action')->comment('created | updated | deleted | login | logout, dll');
            $table->string('model_type')->nullable()->comment('Nama model yang diubah');
            $table->uuid('model_id')->nullable()->comment('ID record yang diubah');
            $table->string('description')->nullable()->comment('Deskripsi singkat aksi');

            // jsonb: Audit trail — menyimpan data lama dan baru
            $table->jsonb('old_values')->nullable()->comment('Data sebelum perubahan');
            $table->jsonb('new_values')->nullable()->comment('Data setelah perubahan');

            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();

            // Standard Indexes
            $table->index(['store_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['model_type', 'model_id']);

            // Built-in GIN indexes for PostgreSQL
            $table->index('old_values', 'activity_logs_old_values_gin', 'gin');
            $table->index('new_values', 'activity_logs_new_values_gin', 'gin');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
