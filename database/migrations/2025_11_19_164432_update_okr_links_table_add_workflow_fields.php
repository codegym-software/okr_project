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
        Schema::table('okr_links', function (Blueprint $table) {
            if (Schema::hasColumn('okr_links', 'status')) {
                $table->index('status', 'okr_links_status_idx');
            }

            if (Schema::hasColumn('okr_links', 'target_owner_id')) {
                $table->index('target_owner_id', 'okr_links_target_owner_idx');
            }

            if (Schema::hasColumn('okr_links', 'requested_by')) {
                $table->index('requested_by', 'okr_links_requested_by_idx');
            }
        });

        if (!Schema::hasTable('okr_link_events')) {
            Schema::create('okr_link_events', function (Blueprint $table) {
                $table->id('event_id');
                $table->unsignedBigInteger('link_id');
                $table->string('action', 50);
                $table->unsignedBigInteger('actor_id');
                $table->text('note')->nullable();
                $table->timestamps();

                $table->foreign('link_id')->references('link_id')->on('okr_links')->cascadeOnDelete();
                $table->foreign('actor_id')->references('user_id')->on('users')->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('okr_link_events')) {
            Schema::dropIfExists('okr_link_events');
        }

        Schema::table('okr_links', function (Blueprint $table) {
            $table->dropIndex('okr_links_status_idx');
            $table->dropIndex('okr_links_target_owner_idx');
            $table->dropIndex('okr_links_requested_by_idx');
        });
    }
};
