<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('check_ins', function (Blueprint $table) {
            $table->id('check_in_id');
            $table->string('kr_id', 36);
            $table->foreignId('user_id');
            $table->decimal('progress_value', 15, 2);
            $table->decimal('progress_percent', 5, 2);
            $table->text('notes')->nullable();
            $table->enum('check_in_type', ['percentage', 'quantity'])->default('percentage');
            $table->boolean('is_completed')->default(false);
            $table->timestamps();
            
            $table->index(['kr_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            
            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('check_ins');
    }
};