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
        Schema::create('teams', function (Blueprint $table) {
            $table->id('team_id');
            $table->string('team_name', 255)->notNullable();
            $table->unsignedBigInteger('parent_team_id')->nullable();
            $table->text('team_desc')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('parent_team_id')->references('team_id')->on('teams');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teams');
    }
};