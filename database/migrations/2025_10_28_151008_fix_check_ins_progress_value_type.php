<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Sửa progress_value để có thể chứa giá trị lớn hơn
        Schema::table('check_ins', function (Blueprint $table) {
            $table->decimal('progress_value', 15, 2)->change(); // Tăng độ rộng để chứa số lớn
        });

        // Sửa progress_percent nếu cần
        try {
            Schema::table('check_ins', function (Blueprint $table) {
                $table->decimal('progress_percent', 5, 2)->change(); // 0-100.00%
            });
        } catch (\Exception $e) {
            // Nếu column đã đúng thì bỏ qua
            if (strpos($e->getMessage(), 'Unknown column') === false) {
                throw $e;
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('check_ins', function (Blueprint $table) {
            $table->decimal('progress_value', 8, 2)->change();
        });
    }
};
