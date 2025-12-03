// database/migrations/2025_12_02_000001_create_report_snapshots_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('report_snapshots', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('cycle_id');
            $table->string('cycle_name')->nullable(); // Denormalized for easy reading
            $table->unsignedBigInteger('created_by');
            $table->string('title');
            $table->longText('data_snapshot');
            $table->timestamp('snapshotted_at')->useCurrent();
            $table->timestamps();

            $table->index(['cycle_id', 'created_at']);
            
            // Foreign Keys
            $table->foreign('cycle_id')->references('cycle_id')->on('cycles')->onDelete('cascade');
            $table->foreign('created_by')->references('user_id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_snapshots');
    }
};