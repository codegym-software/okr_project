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
        Schema::table('okr_links', function (Blueprint $table) {
            // Thêm khóa ngoại cho source_objective_id
            $table->foreign('source_objective_id')
                  ->references('objective_id')
                  ->on('objectives')
                  ->onDelete('cascade');

            // Thêm khóa ngoại cho source_kr_id
            $table->foreign('source_kr_id')
                  ->references('kr_id')
                  ->on('key_results')
                  ->onDelete('cascade');

            // Thêm khóa ngoại cho target_objective_id
            $table->foreign('target_objective_id')
                  ->references('objective_id')
                  ->on('objectives')
                  ->onDelete('cascade');

            // Thêm khóa ngoại cho target_kr_id
            $table->foreign('target_kr_id')
                  ->references('kr_id')
                  ->on('key_results')
                  ->onDelete('cascade');
        });

        Schema::table('okr_role_assignments', function (Blueprint $table) {
            // Thêm khóa ngoại cho user_id
            $table->foreign('user_id')
                  ->references('user_id')
                  ->on('users')
                  ->onDelete('cascade');

            // Thêm khóa ngoại cho role_id
            $table->foreign('role_id')
                  ->references('role_id')
                  ->on('roles')
                  ->onDelete('cascade');

            // Thêm khóa ngoại cho objective_id
            $table->foreign('objective_id')
                  ->references('objective_id')
                  ->on('objectives')
                  ->onDelete('cascade');

            // Thêm khóa ngoại cho kr_id
            $table->foreign('kr_id')
                  ->references('kr_id')
                  ->on('key_results')
                  ->onDelete('cascade');

            // Thêm khóa ngoại cho department_id
            $table->foreign('department_id')
                  ->references('department_id')
                  ->on('departments')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('okr_links', function (Blueprint $table) {
            $table->dropForeign(['source_objective_id']);
            $table->dropForeign(['source_kr_id']);
            $table->dropForeign(['target_objective_id']);
            $table->dropForeign(['target_kr_id']);
        });

        Schema::table('okr_role_assignments', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['role_id']);
            $table->dropForeign(['objective_id']);
            $table->dropForeign(['kr_id']);
            $table->dropForeign(['department_id']);
        });
    }
};