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
            if (Schema::hasColumn('okr_links', 'source_objective_id')) {
                $table->unsignedBigInteger('source_objective_id')->nullable()->change();
            }

            if (Schema::hasColumn('okr_links', 'source_kr_id')) {
                $table->unsignedBigInteger('source_kr_id')->nullable()->change();
            }

            if (Schema::hasColumn('okr_links', 'target_objective_id')) {
                $table->unsignedBigInteger('target_objective_id')->nullable()->change();
            }

            if (Schema::hasColumn('okr_links', 'target_kr_id')) {
                $table->unsignedBigInteger('target_kr_id')->nullable()->change();
            }

            if (!Schema::hasColumn('okr_links', 'source_type')) {
                $table->string('source_type', 20)->default('objective')->after('source_kr_id');
            }

            if (!Schema::hasColumn('okr_links', 'target_type')) {
                $table->string('target_type', 20)->default('kr')->after('target_kr_id');
            }

            if (!Schema::hasColumn('okr_links', 'status')) {
                $table->enum('status', ['pending', 'approved', 'rejected', 'needs_changes', 'cancelled'])
                    ->default('pending')
                    ->after('description');
            }

            if (!Schema::hasColumn('okr_links', 'requested_by')) {
                $table->foreignId('requested_by')
                    ->nullable()
                    ->after('status')
                    ->constrained('users', 'user_id')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('okr_links', 'target_owner_id')) {
                $table->foreignId('target_owner_id')
                    ->nullable()
                    ->after('requested_by')
                    ->constrained('users', 'user_id')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('okr_links', 'approved_by')) {
                $table->foreignId('approved_by')
                    ->nullable()
                    ->after('target_owner_id')
                    ->constrained('users', 'user_id')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('okr_links', 'request_note')) {
                $table->string('request_note', 255)->nullable()->after('description');
            }

            if (!Schema::hasColumn('okr_links', 'decision_note')) {
                $table->string('decision_note', 255)->nullable()->after('request_note');
            }

            if (!Schema::hasColumn('okr_links', 'ownership_transferred_at')) {
                $table->timestamp('ownership_transferred_at')->nullable()->after('approved_by');
            }

            if (!Schema::hasColumn('okr_links', 'revoked_at')) {
                $table->timestamp('revoked_at')->nullable()->after('ownership_transferred_at');
            }

            if (!Schema::hasColumn('okr_links', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('revoked_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('okr_links', function (Blueprint $table) {
            if (Schema::hasColumn('okr_links', 'is_active')) {
                $table->dropColumn('is_active');
            }

            if (Schema::hasColumn('okr_links', 'revoked_at')) {
                $table->dropColumn('revoked_at');
            }

            if (Schema::hasColumn('okr_links', 'ownership_transferred_at')) {
                $table->dropColumn('ownership_transferred_at');
            }

            if (Schema::hasColumn('okr_links', 'decision_note')) {
                $table->dropColumn('decision_note');
            }

            if (Schema::hasColumn('okr_links', 'request_note')) {
                $table->dropColumn('request_note');
            }

            if (Schema::hasColumn('okr_links', 'approved_by')) {
                $table->dropForeign(['approved_by']);
                $table->dropColumn('approved_by');
            }

            if (Schema::hasColumn('okr_links', 'target_owner_id')) {
                $table->dropForeign(['target_owner_id']);
                $table->dropColumn('target_owner_id');
            }

            if (Schema::hasColumn('okr_links', 'requested_by')) {
                $table->dropForeign(['requested_by']);
                $table->dropColumn('requested_by');
            }

            if (Schema::hasColumn('okr_links', 'status')) {
                $table->dropColumn('status');
            }

            if (Schema::hasColumn('okr_links', 'target_type')) {
                $table->dropColumn('target_type');
            }

            if (Schema::hasColumn('okr_links', 'source_type')) {
                $table->dropColumn('source_type');
            }
        });

        Schema::table('okr_links', function (Blueprint $table) {
            if (Schema::hasColumn('okr_links', 'source_objective_id')) {
                $table->unsignedBigInteger('source_objective_id')->nullable(false)->change();
            }
            if (Schema::hasColumn('okr_links', 'source_kr_id')) {
                $table->unsignedBigInteger('source_kr_id')->nullable(false)->change();
            }
            if (Schema::hasColumn('okr_links', 'target_objective_id')) {
                $table->unsignedBigInteger('target_objective_id')->nullable(false)->change();
            }
            if (Schema::hasColumn('okr_links', 'target_kr_id')) {
                $table->unsignedBigInteger('target_kr_id')->nullable(false)->change();
            }
        });
    }
};
