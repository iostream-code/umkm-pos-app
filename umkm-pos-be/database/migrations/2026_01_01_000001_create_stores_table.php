<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->text('address')->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('email')->nullable();
            $table->string('tax_number', 50)->nullable()->comment('NPWP toko');
            $table->string('logo')->nullable()->comment('Path logo toko');
            $table->char('currency', 3)->default('IDR');
            $table->string('timezone', 50)->default('Asia/Jakarta');
            $table->string('receipt_footer')->nullable()->comment('Pesan footer struk');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stores');
    }
};
