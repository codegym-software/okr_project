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
        Schema::create('objectives', function (Blueprint $table) {
            $table->id('obj_id');
            $table->string('obj_title', 500)->notNullable();
            $table->text('obj_desc')->nullable();
            $table->unsignedBigInteger('owner_id')->nullable();
            $table->unsignedBigInteger('team_id')->nullable();
            $table->unsignedBigInteger('cycle_id')->nullable();
            $table->string('status', 50)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('owner_id')->references('user_id')->on('users');
            $table->foreign('team_id')->references('team_id')->on('teams');
            $table->foreign('cycle_id')->references('cycle_id')->on('okr_cycles');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('objectives');
    }
};