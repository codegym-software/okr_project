<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. TẠO BẢNG CHÍNH - KHÔNG thêm FK constraint ngay
        Schema::create('objectives', function (Blueprint $table) {
            $table->bigIncrements('objective_id'); // ✅ Custom primary key
            $table->string('obj_title', 255)->nullable();
            $table->string('level', 255)->nullable();
            $table->text('description')->nullable();
            $table->string('status', 255)->nullable();
            $table->decimal('progress_percent', 5, 2)->default(0.00);
            
            // ✅ Foreign keys - CHỈ tạo column, KHÔNG constraint
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->unsignedBigInteger('cycle_id')->nullable()->index();
            $table->unsignedBigInteger('department_id')->nullable()->index();
            
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });

        // 2. THÊM FOREIGN KEY CONSTRAINTS SAU
        Schema::table('objectives', function (Blueprint $table) {
            // ✅ Reference ĐÚNG tên cột primary key
            $table->foreign('user_id')
                  ->references('user_id')  // ✅ KHÔNG phải 'id'
                  ->on('users')
                  ->onDelete('cascade');
                  
            $table->foreign('cycle_id')
                  ->references('cycle_id') 
                  ->on('cycles')
                  ->onDelete('cascade');
                  
            $table->foreign('department_id')
                  ->references('department_id')
                  ->on('departments')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('objectives');
    }
};