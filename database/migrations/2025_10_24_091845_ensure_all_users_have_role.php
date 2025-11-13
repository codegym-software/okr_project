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
        // Đảm bảo tất cả user có role
        $defaultRole = DB::table('roles')->where('role_name', 'member')->first();
        
        if ($defaultRole) {
            // Cập nhật tất cả user không có role_id
            DB::table('users')
                ->whereNull('role_id')
                ->update(['role_id' => $defaultRole->role_id]);
        }
        
        // Đảm bảo tất cả user có department_id (có thể null)
        // Không cần làm gì vì department_id đã nullable
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Không cần rollback vì đây là data fix
    }
};