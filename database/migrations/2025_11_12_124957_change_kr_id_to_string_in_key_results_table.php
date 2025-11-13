<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Kiểm tra xem cột kr_id có phải là bigint không
        $columnType = DB::select("SHOW COLUMNS FROM key_results WHERE Field = 'kr_id'");
        
        if (!empty($columnType) && strpos($columnType[0]->Type, 'bigint') !== false) {
            // Xóa tất cả foreign keys liên quan đến kr_id bằng cách lấy tên constraint từ database
            $tables = ['check_ins', 'comments', 'okr_links', 'okr_role_assignments'];
            
            foreach ($tables as $tableName) {
                if (Schema::hasTable($tableName)) {
                    $constraints = DB::select("
                        SELECT CONSTRAINT_NAME 
                        FROM information_schema.KEY_COLUMN_USAGE 
                        WHERE TABLE_SCHEMA = DATABASE() 
                        AND TABLE_NAME = ? 
                        AND REFERENCED_TABLE_NAME = 'key_results'
                        AND REFERENCED_COLUMN_NAME = 'kr_id'
                    ", [$tableName]);
                    
                    foreach ($constraints as $constraint) {
                        try {
                            DB::statement("ALTER TABLE `{$tableName}` DROP FOREIGN KEY `{$constraint->CONSTRAINT_NAME}`");
                        } catch (\Exception $e) {
                            // Bỏ qua nếu không xóa được
                        }
                    }
                }
            }
            
            // Đổi kr_id từ bigint sang string (varchar 36 cho UUID) trong key_results
            DB::statement('ALTER TABLE key_results MODIFY COLUMN kr_id VARCHAR(36) NOT NULL');
            
            // Đổi kr_id trong các bảng liên quan từ bigint sang string
            if (Schema::hasTable('check_ins')) {
                DB::statement('ALTER TABLE check_ins MODIFY COLUMN kr_id VARCHAR(36) NOT NULL');
            }
            
            if (Schema::hasTable('comments')) {
                DB::statement('ALTER TABLE comments MODIFY COLUMN kr_id VARCHAR(36) NOT NULL');
            }
            
            if (Schema::hasTable('okr_links')) {
                // Set NULL cho dữ liệu không hợp lệ trước khi đổi kiểu (vì MySQL không cho DELETE với subquery)
                $validKrIds = DB::table('key_results')->pluck('kr_id')->toArray();
                if (!empty($validKrIds)) {
                    DB::table('okr_links')
                        ->whereNotNull('source_kr_id')
                        ->whereNotIn('source_kr_id', $validKrIds)
                        ->update(['source_kr_id' => null]);
                    
                    DB::table('okr_links')
                        ->whereNotNull('target_kr_id')
                        ->whereNotIn('target_kr_id', $validKrIds)
                        ->update(['target_kr_id' => null]);
                } else {
                    // Nếu không có key_results nào, set tất cả về null
                    DB::table('okr_links')->update(['source_kr_id' => null, 'target_kr_id' => null]);
                }
                
                DB::statement('ALTER TABLE okr_links MODIFY COLUMN source_kr_id VARCHAR(36) NULL');
                DB::statement('ALTER TABLE okr_links MODIFY COLUMN target_kr_id VARCHAR(36) NULL');
            }
            
            if (Schema::hasTable('okr_role_assignments')) {
                // Set NULL cho dữ liệu không hợp lệ
                $validKrIds = DB::table('key_results')->pluck('kr_id')->toArray();
                if (!empty($validKrIds)) {
                    DB::table('okr_role_assignments')
                        ->whereNotNull('kr_id')
                        ->whereNotIn('kr_id', $validKrIds)
                        ->update(['kr_id' => null]);
                } else {
                    DB::table('okr_role_assignments')->update(['kr_id' => null]);
                }
                
                DB::statement('ALTER TABLE okr_role_assignments MODIFY COLUMN kr_id VARCHAR(36) NULL');
            }
            
            // Thêm lại foreign keys
            if (Schema::hasTable('check_ins')) {
                Schema::table('check_ins', function (Blueprint $table) {
                    $table->foreign('kr_id')->references('kr_id')->on('key_results')->onDelete('cascade');
                });
            }
            
            if (Schema::hasTable('comments')) {
                Schema::table('comments', function (Blueprint $table) {
                    $table->foreign('kr_id')->references('kr_id')->on('key_results')->onDelete('cascade');
                });
            }
            
            if (Schema::hasTable('okr_links')) {
                Schema::table('okr_links', function (Blueprint $table) {
                    $table->foreign('source_kr_id')->references('kr_id')->on('key_results')->onDelete('cascade');
                    $table->foreign('target_kr_id')->references('kr_id')->on('key_results')->onDelete('cascade');
                });
            }
            
            if (Schema::hasTable('okr_role_assignments')) {
                Schema::table('okr_role_assignments', function (Blueprint $table) {
                    $table->foreign('kr_id')->references('kr_id')->on('key_results')->onDelete('cascade');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Xóa foreign key từ check_ins
        Schema::table('check_ins', function (Blueprint $table) {
            $table->dropForeign(['kr_id']);
        });
        
        // Đổi kr_id từ string về bigint
        DB::statement('ALTER TABLE key_results MODIFY COLUMN kr_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
        DB::statement('ALTER TABLE check_ins MODIFY COLUMN kr_id BIGINT UNSIGNED NOT NULL');
        
        // Thêm lại foreign key
        Schema::table('check_ins', function (Blueprint $table) {
            $table->foreign('kr_id')->references('kr_id')->on('key_results')->onDelete('cascade');
        });
    }
};
