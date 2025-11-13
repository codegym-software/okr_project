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
        Schema::table('key_results', function (Blueprint $table) {
            // Thêm cột assigned_to, rõ ràng trỏ đến users(user_id)
            $table->foreignId('assigned_to')
                  ->nullable()
                  ->after('user_id')
                  ->constrained('users', 'user_id')  // RÕ RÀNG: trỏ đến cột user_id
                  ->onDelete('set null');

            // Index để tối ưu truy vấn
            $table->index('assigned_to', 'idx_key_results_assigned_to');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('key_results', function (Blueprint $table) {
            // Xóa foreign key trước (phải đúng tên)
            $table->dropForeign(['assigned_to']);

            // Xóa index
            $table->dropIndex('idx_key_results_assigned_to');

            // Xóa cột
            $table->dropColumn('assigned_to');
        });
    }
};