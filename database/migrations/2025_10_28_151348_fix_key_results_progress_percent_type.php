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
        // Sửa progress_percent để có thể chứa giá trị 100
        Schema::table('key_results', function (Blueprint $table) {
            $table->decimal('progress_percent', 6, 2)->default(0)->change(); // Tăng từ 5,2 lên 6,2 để chứa 100.00
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('key_results', function (Blueprint $table) {
            $table->decimal('progress_percent', 5, 2)->default(0)->change();
        });
    }
};
