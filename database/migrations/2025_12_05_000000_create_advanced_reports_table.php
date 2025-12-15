<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('advanced_reports')) {
            Schema::create('advanced_reports', function (Blueprint $table) {
                $table->id('report_id');
                $table->string('report_type'); // 'team', 'manager', 'company'
                $table->string('report_name')->nullable();
                $table->json('snapshot_data'); // Dữ liệu báo cáo tại thời điểm tạo
                
                $table->unsignedBigInteger('user_id'); // Người tạo
                $table->unsignedBigInteger('cycle_id')->nullable();
                $table->integer('department_id')->nullable();
                
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('advanced_reports');
    }
};
