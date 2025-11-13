<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('customer_fields', function (Blueprint $table) {
            $table->id('field_id');
            $table->string('cf_name');
            $table->string('type');
            $table->integer('entity_id');
            $table->foreignId('user_id')->constrained('users','user_id')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('customer_fields');
    }
};
