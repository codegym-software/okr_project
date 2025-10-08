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
        Schema::table('okr_cycles', function (Blueprint $table) {
            $table->string('cycle_name', 255)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->string('team_name', 255)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->text('team_desc')->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('user_name', 255)->nullable()->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->string('email', 255)->nullable()->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->string('role', 50)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
        });

        Schema::table('objectives', function (Blueprint $table) {
            $table->string('obj_title', 500)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->text('obj_desc')->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->string('status', 50)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
        });

        Schema::table('key_results', function (Blueprint $table) {
            $table->string('kr_title', 500)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->text('kr_desc')->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->string('metric_type', 50)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->string('unit', 50)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->string('status', 50)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
        });

        Schema::table('check_ins', function (Blueprint $table) {
            $table->text('comment')->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('okr_cycles', function (Blueprint $table) {
            $table->string('cycle_name', 100)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->string('team_name', 100)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->text('team_desc')->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('user_name', 100)->nullable()->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->string('email', 100)->nullable()->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->string('role', 20)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
        });

        Schema::table('objectives', function (Blueprint $table) {
            $table->string('obj_title', 255)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->text('obj_desc')->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->string('status', 20)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
        });

        Schema::table('key_results', function (Blueprint $table) {
            $table->string('kr_title', 255)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->text('kr_desc')->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->string('metric_type', 20)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->string('unit', 20)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
            $table->string('status', 20)->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
        });

        Schema::table('check_ins', function (Blueprint $table) {
            $table->text('comment')->charset('utf8mb4')->collation('utf8mb4_unicode_ci')->change();
        });
    }
};
