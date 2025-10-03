<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('objectives', function (Blueprint $table) {
            $table->id('objective_id');
            $table->string('obj_title')->nullable()->charset('utf8mb4')->collation('utf8mb4_unicode_ci');
            $table->string('level')->nullable()->charset('utf8mb4')->collation('utf8mb4_unicode_ci');
            $table->string('description')->nullable()->charset('utf8mb4')->collation('utf8mb4_unicode_ci');
            $table->string('status')->nullable()->charset('utf8mb4')->collation('utf8mb4_unicode_ci');
            $table->decimal('progress_percent', 5, 2)->nullable()->default(0);
            $table->foreignId('user_id')->nullable()->constrained('users','user_id')->cascadeOnDelete();
            $table->foreignId('cycle_id')->nullable()->constrained('cycles','cycle_id')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('objectives');
    }
};
