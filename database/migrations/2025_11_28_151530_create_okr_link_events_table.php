<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('okr_link_events', function (Blueprint $table) {
            $table->id('event_id');
            $table->foreignId('link_id');
            $table->string('action', 50);
            $table->foreignId('actor_id');
            $table->text('note')->nullable();
            $table->timestamps();
            
            $table->foreign('link_id')->references('link_id')->on('okr_links')->cascadeOnDelete();
            $table->foreign('actor_id')->references('user_id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('okr_link_events');
    }
};