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
        Schema::create('key_results', function (Blueprint $table) {
            $table->id('kr_id');
            $table->unsignedBigInteger('obj_id')->nullable();
            $table->string('kr_title', 500)->notNullable();
            $table->text('kr_desc')->nullable();
            $table->string('metric_type', 50)->nullable();
            $table->decimal('target_value', 10, 2)->nullable();
            $table->string('unit', 50)->nullable();
            $table->decimal('current_value', 10, 2)->default(0);
            $table->string('status', 50)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('obj_id')->references('obj_id')->on('objectives')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('key_results');
    }
};