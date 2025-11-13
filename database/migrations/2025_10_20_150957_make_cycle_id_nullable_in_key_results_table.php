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
            // Drop foreign key constraint
            $table->dropForeign(['cycle_id']);
            
            // Make cycle_id nullable
            $table->foreignId('cycle_id')->nullable()->change();
            
            // Add back foreign key constraint with nullable
            $table->foreign('cycle_id')
                  ->references('cycle_id')
                  ->on('cycles')
                  ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('key_results', function (Blueprint $table) {
            // Drop foreign key constraint
            $table->dropForeign(['cycle_id']);
            
            // Make cycle_id not nullable
            $table->foreignId('cycle_id')->nullable(false)->change();
            
            // Add back foreign key constraint with cascade delete
            $table->foreign('cycle_id')
                  ->references('cycle_id')
                  ->on('cycles')
                  ->cascadeOnDelete();
        });
    }
};
