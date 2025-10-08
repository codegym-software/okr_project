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
        Schema::table('objectives', function (Blueprint $table) {
            $table->index('cycle_id', 'idx_objectives_cycle');
        });

        Schema::table('key_results', function (Blueprint $table) {
            $table->index('obj_id', 'idx_key_results_objective');
        });

        Schema::table('check_ins', function (Blueprint $table) {
            $table->index('kr_id', 'idx_check_ins_key_result');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('objectives', function (Blueprint $table) {
            $table->dropIndex('idx_objectives_cycle');
        });

        Schema::table('key_results', function (Blueprint $table) {
            $table->dropIndex('idx_key_results_objective');
        });

        Schema::table('check_ins', function (Blueprint $table) {
            $table->dropIndex('idx_check_ins_key_result');
        });
    }
};