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
            if (!Schema::hasColumn('key_results', 'is_archived')) {
                $table->boolean('is_archived')->default(false);
            }
            // archived_at was already added in migration 2025_11_05_095042
            // So we don't need to add it again
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('key_results', function (Blueprint $table) {
            if (Schema::hasColumn('key_results', 'is_archived')) {
                $table->dropColumn('is_archived');
            }
            // archived_at should be dropped by its own migration (2025_11_05_095042)
        });
    }
};