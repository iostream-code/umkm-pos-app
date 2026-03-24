<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->uuid('parent_id')->nullable()->comment('Untuk sub-kategori');
            $table->string('name');
            $table->string('slug');
            $table->string('color', 7)->nullable()->comment('Hex color untuk UI POS');
            $table->string('icon', 50)->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['store_id', 'slug']);
            $table->index(['store_id', 'parent_id']);

            // Self-referencing FK (nullable, jadi tidak pakai constrained())
            // $table->foreign('parent_id')->references('id')->on('categories')->nullOnDelete();
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->foreign('parent_id')
                ->references('id')
                ->on('categories')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
