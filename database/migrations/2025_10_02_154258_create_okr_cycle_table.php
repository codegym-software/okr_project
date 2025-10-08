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
        Schema::create('okr_cycles', function (Blueprint $table) {
            $table->id('cycle_id');
            $table->string('cycle_name', 255)->notNullable();
            $table->date('start_date')->notNullable();
            $table->date('end_date')->notNullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('okr_cycles');
    }
};