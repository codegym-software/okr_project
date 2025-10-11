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
        
        Schema::table('roles', function (Blueprint $table) {
            $table->string('level', 50)->nullable()->charset('utf8mb4')->collation('utf8mb4_unicode_ci');
        });

        Schema::table('departments', function (Blueprint $table) {
            // $table->string('type', 50)->nullable()->charset('utf8mb4')->collation('utf8mb4_unicode_ci');
            $table->bigInteger('parent_department_id')->unsigned()->nullable();
            // Nếu cần, thêm khóa ngoại tự tham chiếu
            $table->foreign('parent_department_id')->references('parent_department_id')->on('departments')->onDelete('set null');
        });

        Schema::table('key_results', function (Blueprint $table) {
            $table->bigInteger('department_id')->unsigned()->nullable();
            $table->foreign('department_id')->references('department_id')->on('departments')->onDelete('set null');
        });

        Schema::create('okr_links', function (Blueprint $table) {
            $table->bigIncrements('link_id'); // Primary key, auto increment
            $table->bigInteger('source_objective_id')->unsigned(); // Unsigned big integer
            $table->bigInteger('source_kr_id')->unsigned(); // Unsigned big integer
            $table->bigInteger('target_objective_id')->unsigned(); // Unsigned big integer
            $table->bigInteger('target_kr_id')->unsigned(); // Unsigned big integer
            $table->timestamp('created_at')->useCurrent(); // Default current timestamp
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate(); // Default current timestamp, update on change
            $table->string('description', 255)->nullable()->charset('utf8mb4')->collation('utf8mb4_unicode_ci'); // Support Vietnamese

            // Thêm ràng buộc CHECK
            //$table->check('((source_objective_id IS NOT NULL OR source_kr_id IS NOT NULL) AND (target_objective_id IS NOT NULL OR target_kr_id IS NOT NULL))');

            // Thiết lập index hoặc khóa ngoại nếu cần (tùy thuộc vào yêu cầu cụ thể)
            $table->primary('link_id');
        });

        Schema::create('okr_role_assignments', function (Blueprint $table) {
            $table->bigIncrements('assignment_id'); // Primary key, auto increment
            $table->bigInteger('user_id')->unsigned(); // Unsigned big integer
            $table->bigInteger('role_id')->unsigned(); // Unsigned big integer
            $table->bigInteger('objective_id')->unsigned()->nullable(); // Unsigned big integer, nullable
            $table->bigInteger('kr_id')->unsigned()->nullable(); // Unsigned big integer, nullable
            $table->bigInteger('department_id')->unsigned()->nullable(); // Unsigned big integer, nullable
            $table->timestamp('created_at')->useCurrent(); // Default current timestamp
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate(); // Default current timestamp, update on change

            // Thêm ràng buộc CHECK
            // $table->check('((objective_id IS NOT NULL AND kr_id IS NULL AND department_id IS NULL) OR 
            //               (objective_id IS NULL AND kr_id IS NOT NULL AND department_id IS NULL) OR 
            //               (objective_id IS NULL AND kr_id IS NULL AND department_id IS NOT NULL))');

            $table->primary('assignment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
        // Schema::table('roles', function (Blueprint $table) {
        //     $table->dropColumn('level');
        // });

        Schema::table('departments', function (Blueprint $table) {
            // $table->dropColumn('type');
            $table->dropColumn('parent_department_id');
        });

        Schema::table('key_results', function (Blueprint $table) {
            $table->dropColumn('department_id');
        });

        Schema::dropIfExists('okr_links');
        Schema::dropIfExists('okr_role_assignments');
    }
};
