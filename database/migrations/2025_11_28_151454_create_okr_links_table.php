<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('okr_links', function (Blueprint $table) {
            $table->id('link_id');
            $table->foreignId('source_objective_id')->nullable();
            $table->foreignId('source_kr_id')->nullable();
            $table->enum('source_type', ['objective', 'kr'])->default('objective');
            $table->foreignId('target_objective_id')->nullable();
            $table->foreignId('target_kr_id')->nullable();
            $table->enum('target_type', ['objective', 'kr'])->default('kr');
            $table->string('request_note', 255)->nullable();
            $table->string('decision_note', 255)->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'needs_changes', 'cancelled'])->default('pending');
            $table->foreignId('requested_by')->nullable()->index();
            $table->foreignId('target_owner_id')->nullable()->index();
            $table->foreignId('approved_by')->nullable()->index();
            $table->timestamp('ownership_transferred_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->boolean('is_active')->default(true);
            
            $table->timestamps();
            
            // Foreign Key Constraints
            $table->foreign('requested_by')->references('user_id')->on('users')->nullOnDelete();
            $table->foreign('target_owner_id')->references('user_id')->on('users')->nullOnDelete();
            $table->foreign('approved_by')->references('user_id')->on('users')->nullOnDelete();
            
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('okr_links');
    }
};