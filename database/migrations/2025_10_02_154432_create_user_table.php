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
        Schema::create('users', function (Blueprint $table) {
            $table->id('user_id');
            $table->string('user_name', 255)->notNullable();
            $table->string('email', 255)->notNullable()->unique();
            $table->string('role', 50)->nullable();
            $table->unsignedBigInteger('team_id')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('team_id')->references('team_id')->on('teams');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};