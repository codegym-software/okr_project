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
        Schema::create('check_ins', function (Blueprint $table) {
            $table->id('check_in_id');
            $table->unsignedBigInteger('kr_id');
            $table->unsignedBigInteger('user_id');
            $table->decimal('progress_value', 8, 2); // Giá trị tiến độ (có thể là % hoặc số lượng)
            $table->decimal('progress_percent', 5, 2); // Phần trăm tiến độ (0-100%)
            $table->text('notes')->nullable(); // Ghi chú khi check-in
            $table->enum('check_in_type', ['percentage', 'quantity'])->default('percentage'); // Loại check-in
            $table->boolean('is_completed')->default(false); // Đánh dấu hoàn thành
            $table->timestamps();

            // Foreign keys
            $table->foreign('kr_id')->references('kr_id')->on('key_results')->onDelete('cascade');
            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
            
            // Indexes
            $table->index(['kr_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('check_ins');
    }
};
