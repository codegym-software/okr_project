<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id('department_id');
            $table->string('d_name');
            $table->text('d_description')->nullable();
            $table->string('type')->nullable(); // 'phòng ban' or 'đội nhóm'
            $table->unsignedBigInteger('parent_department_id')->nullable(); // For sub-teams
            $table->timestamps();

            // Foreign key for parent department
            $table->foreign('parent_department_id')
                ->references('department_id')
                ->on('departments')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};