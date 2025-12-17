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
        Schema::create('report_snapshots_weekly', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('cycle_id');
            $table->unsignedBigInteger('department_id');
            $table->integer('week_number'); // Tuần thứ mấy trong năm
            $table->integer('year');        // Năm
            $table->date('week_start_date');
            $table->date('week_end_date'); // Ngày chủ nhật của tuần đó
            $table->decimal('avg_progress', 5, 2)->default(0); // Tiến độ trung bình tại thời điểm đó
            $table->integer('okr_count')->default(0); // Số lượng OKR tại thời điểm đó
            $table->timestamps();

            // Index để query nhanh
            $table->index(['cycle_id', 'department_id']);
            $table->unique(['department_id', 'cycle_id', 'week_number', 'year'], 'dept_cycle_week_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_snapshots_weekly');
    }
};