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
        // Bước 1: Backfill các objectives có user_id NULL với admin đầu tiên
        $firstAdmin = DB::table('users')
            ->join('roles', 'users.role_id', '=', 'roles.role_id')
            ->where('roles.role_name', 'admin')
            ->select('users.user_id')
            ->first();
        
        if (!$firstAdmin) {
            // Nếu không có admin, lấy user đầu tiên
            $firstAdmin = DB::table('users')->select('user_id')->first();
        }
        
        if ($firstAdmin) {
            DB::table('objectives')
                ->whereNull('user_id')
                ->update(['user_id' => $firstAdmin->user_id]);
        }
        
        // Bước 2: Make user_id NOT NULL
        Schema::table('objectives', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('objectives', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });
    }
};
