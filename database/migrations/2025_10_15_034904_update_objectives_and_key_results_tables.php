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
        //
         // Cập nhật bảng objectives
        Schema::table('objectives', function (Blueprint $table) {
            // Bỏ khóa ngoại cũ của user_id (nếu có)
            // $table->dropForeign(['user_id']);

            // Thêm cột owner_id mới, liên kết với users
            $table->unsignedBigInteger('owner_id')->nullable();

            $table->foreign('owner_id')
                  ->references('user_id')
                  ->on('users')
                  ->onDelete('cascade');
        });

        // Cập nhật bảng key_results
        Schema::table('key_results', function (Blueprint $table) {
            // Thêm user_id mới có thể null
            $table->unsignedBigInteger('user_id')->nullable()->after('objective_id');

            
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
        // Hoàn tác lại nếu rollback
        Schema::table('objectives', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropColumn('owner_id');

            // Nếu cần khôi phục lại khóa ngoại user_id
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
        });

        Schema::table('key_results', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
    }
};
