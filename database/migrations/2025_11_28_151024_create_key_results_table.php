<?php
// 2025_11_28_XXXXXX_create_key_results_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('key_results', function (Blueprint $table) {
            $table->bigIncrements('kr_id');
            $table->string('kr_title', 255);
            $table->double('target_value', 15, 2)->default(0);
            $table->double('current_value', 15, 2)->default(0);
            $table->string('unit', 255)->nullable();
            $table->string('status', 255)->nullable();
            $table->integer('weight')->default(0);
            $table->decimal('progress_percent', 6, 2)->default(0.00);
            $table->timestamp('archived_at')->nullable();
            $table->boolean('is_archived')->default(false);
            
            // Foreign key columns
            $table->unsignedBigInteger('objective_id');
            $table->unsignedBigInteger('cycle_id');
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->unsignedBigInteger('assigned_to')->nullable()->index();
            $table->unsignedBigInteger('department_id')->nullable()->index();
            
            $table->timestamps();
        });

        // Foreign key constraints
        Schema::table('key_results', function (Blueprint $table) {
            $table->foreign('objective_id')->references('objective_id')->on('objectives')->onDelete('cascade');
            $table->foreign('cycle_id')->references('cycle_id')->on('cycles')->onDelete('cascade');
            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('assigned_to')->references('user_id')->on('users')->nullOnDelete();
            $table->foreign('department_id')->references('department_id')->on('departments')->nullOnDelete();
        });
    }
};