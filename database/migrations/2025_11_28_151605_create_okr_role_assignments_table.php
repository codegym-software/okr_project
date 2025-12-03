<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('okr_role_assignments', function (Blueprint $table) {
            $table->id('assignment_id');
            $table->foreignId('user_id');
            $table->foreignId('role_id');
            $table->foreignId('objective_id')->nullable();
            $table->string('kr_id', 36)->nullable();
            $table->foreignId('department_id')->nullable();
            $table->timestamps();
            
            $table->index('user_id');
            $table->index('role_id');
            
            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
            $table->foreign('role_id')->references('role_id')->on('roles')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('okr_role_assignments');
    }
};