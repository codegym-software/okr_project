<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id('notification_id');
            $table->string('message', 255);
            $table->string('type', 255)->nullable();
            $table->boolean('is_read')->default(false);
            $table->foreignId('user_id');
            $table->foreignId('cycle_id');
            $table->timestamps();
            
            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
            $table->foreign('cycle_id')->references('cycle_id')->on('cycles')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};