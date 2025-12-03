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
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('department_id', 'users_department_id_foreign_v2')->references('department_id')->on('departments')->nullOnDelete();
            $table->foreign('role_id', 'users_role_id_foreign_v2')->references('role_id')->on('roles')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign('users_department_id_foreign_v2');
            $table->dropForeign('users_role_id_foreign_v2');
        });
    }
};
