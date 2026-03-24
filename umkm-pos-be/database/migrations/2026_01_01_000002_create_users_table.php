<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Buat enum type untuk role user
        DB::statement("CREATE TYPE user_role AS ENUM ('owner', 'manager', 'cashier')");

        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('phone', 20)->nullable();
            $table->string('avatar')->nullable();
            $table->string('role')->default('cashier')->comment('owner | manager | cashier');
            $table->boolean('is_active')->default(true);
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['store_id', 'role']);
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
        DB::statement('DROP TYPE IF EXISTS user_role');
    }
};
