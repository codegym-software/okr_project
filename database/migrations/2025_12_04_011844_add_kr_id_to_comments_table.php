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
        Schema::table('comments', function (Blueprint $table) {
            $table->foreignId('objective_id')->nullable()->change();
            $table->foreignId('kr_id')->nullable()->after('objective_id')->constrained('key_results', 'kr_id')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            $table->dropForeign(['kr_id']);
            $table->dropColumn('kr_id');
            $table->foreignId('objective_id')->nullable(false)->change();
        });
    }
};
