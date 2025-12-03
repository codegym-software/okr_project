<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('advanced_reports', function (Blueprint $table) {
            $table->id('report_id');
            $table->string('report_type'); // 'team', 'manager', 'company'
            $table->string('report_name')->nullable(); // Tên báo cáo (tùy chọn)
            $table->json('snapshot_data'); // Dữ liệu snapshot của báo cáo
            $table->foreignId('user_id')->constrained('users','user_id')->cascadeOnDelete(); // Người tạo
            $table->foreignId('cycle_id')->nullable()->constrained('cycles','cycle_id')->nullOnDelete();
            $table->integer('department_id')->nullable(); // Phòng ban (nếu có)
            $table->text('notes')->nullable(); // Ghi chú của người tạo
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('advanced_reports');
    }
};
