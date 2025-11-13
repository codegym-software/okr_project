<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('key_results', function (Blueprint $table) {
            $table->id('kr_id');
            $table->string('kr_title');
            $table->double('target_value')->default(0);
            $table->double('current_value')->default(0);
            $table->string('unit')->nullable();
            $table->string('status')->nullable();
            $table->integer('weight')->default(0);
            $table->decimal('progress_percent', 5, 2)->default(0);
            $table->foreignId('objective_id')->constrained('objectives','objective_id')->cascadeOnDelete();
            $table->foreignId('cycle_id')->constrained('cycles','cycle_id')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('key_results');
    }
};
