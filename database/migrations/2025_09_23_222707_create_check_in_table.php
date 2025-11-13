<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('check_in', function (Blueprint $table) {
            $table->id('checkin_id');
            $table->double('completion_rate')->default(0);
            $table->text('note')->nullable();
            $table->foreignId('user_id')->constrained('users','user_id')->cascadeOnDelete();
            $table->foreignId('objective_id')->constrained('objectives','objective_id')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('check_in');
    }
};
