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
        Schema::create('check_ins', function (Blueprint $table) {
            $table->id('check_in_id');
            $table->unsignedBigInteger('kr_id')->nullable();
            $table->date('check_in_date')->notNullable();
            $table->decimal('new_value', 10, 2)->nullable();
            $table->integer('confidence_score')->nullable();
            $table->text('comment')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('kr_id')->references('kr_id')->on('key_results')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('check_ins');
    }
};