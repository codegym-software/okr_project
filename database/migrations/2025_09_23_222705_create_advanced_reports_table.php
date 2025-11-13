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
            $table->string('report_type');
            $table->date('data')->nullable();
            $table->foreignId('user_id')->constrained('users','user_id')->cascadeOnDelete();
            $table->foreignId('cycle_id')->constrained('cycles','cycle_id')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('advanced_reports');
    }
};
