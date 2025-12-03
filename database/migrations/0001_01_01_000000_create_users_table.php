<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->bigIncrements('user_id'); // ✅ Sử dụng bigIncrements thay vì id()
            $table->string('sub', 255)->nullable()->unique();
            $table->string('email')->unique();
            $table->string('password', 255)->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('remember_token', 100)->nullable();
            $table->string('full_name', 255)->nullable();
            $table->string('avatar_url', 255)->nullable();
            
            // ✅ Foreign Keys - Reference đúng tên cột
            $table->unsignedBigInteger('department_id')->nullable()->index();
            $table->unsignedBigInteger('role_id')->nullable()->index();
            
            $table->string('status', 255)->default('active');
            $table->boolean('is_invited')->default(false);
            $table->timestamp('invited_at')->nullable();
            $table->string('google_id', 225)->nullable();
            $table->timestamps();
        });

        // ✅ Thêm Foreign Key Constraints SAU khi tạo bảng
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('department_id')->references('department_id')->on('departments')->nullOnDelete();
            $table->foreign('role_id')->references('role_id')->on('roles')->nullOnDelete();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
