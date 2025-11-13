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
        // Kiểm tra xem cột user_id đã tồn tại chưa
        if (!Schema::hasColumn('key_results', 'user_id')) {
            Schema::table('key_results', function (Blueprint $table) {
                $table->foreignId('user_id')
                    ->nullable()
                    ->after('cycle_id')
                    ->constrained('users', 'user_id')
                    ->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Chỉ xóa cột nếu nó tồn tại
        if (Schema::hasColumn('key_results', 'user_id')) {
            Schema::table('key_results', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            });
        }
    }
};
