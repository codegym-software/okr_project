<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('ai_recommendations', function (Blueprint $table) {
            $table->id('rec_id');
            $table->string('suggestion')->nullable();
            $table->decimal('score', 5, 2)->default(0);
            $table->foreignId('user_id')->constrained('users','user_id')->cascadeOnDelete();
            $table->foreignId('objective_id')->constrained('objectives','objective_id')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('ai_recommendations');
    }
};
