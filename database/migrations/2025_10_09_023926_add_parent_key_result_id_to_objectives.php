<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('objectives', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_key_result_id')->nullable()->after('parent_objective_id');
            $table->foreign('parent_key_result_id')->references('kr_id')->on('key_results')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('objectives', function (Blueprint $table) {
            $table->dropForeign(['parent_key_result_id']);
            $table->dropColumn('parent_key_result_id');
        });
    }
};