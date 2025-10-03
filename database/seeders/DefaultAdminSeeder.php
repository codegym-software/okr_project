<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class DefaultAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Tạo role Admin nếu chưa có
        $adminRole = Role::firstOrCreate(
            ['role_name' => 'Admin'],
            ['description' => 'Quản trị viên hệ thống']
        );

        // Tạo role Member nếu chưa có
        $memberRole = Role::firstOrCreate(
            ['role_name' => 'Member'],
            ['description' => 'Thành viên']
        );

        // Tạo role Manager nếu chưa có
        $managerRole = Role::firstOrCreate(
            ['role_name' => 'Manager'],
            ['description' => 'Quản lý phòng ban/dự án']
        );

        // Chỉ tạo admin với email okr.admin@company.com
        $adminUser = User::firstOrCreate(
            ['email' => 'okr.admin@company.com'],
            [
                'full_name' => 'System Administrator',
                'email' => 'okr.admin@company.com',
                'job_title' => 'System Admin',
                'role_id' => $adminRole->role_id,
                'sub' => 'admin-' . time(), // Unique sub for admin
            ]
        );

        // Tạo Member cho anh249205@gmail.com
        $memberUser = User::firstOrCreate(
            ['email' => 'anh249205@gmail.com'],
            [
                'full_name' => 'Nguyễn Đình Tuấn Anh',
                'email' => 'anh249205@gmail.com',
                'job_title' => 'Trader',
                'role_id' => $memberRole->role_id,
                'sub' => 'member-' . time(), // Unique sub for member
            ]
        );

        // Đảm bảo admin có role Admin
        if (!$adminUser->role_id || $adminUser->role_id !== $adminRole->role_id) {
            $adminUser->role_id = $adminRole->role_id;
            $adminUser->save();
        }

        // Đảm bảo member có role Member
        if (!$memberUser->role_id || $memberUser->role_id !== $memberRole->role_id) {
            $memberUser->role_id = $memberRole->role_id;
            $memberUser->save();
        }

        $this->command->info("✅ Tài khoản admin:");
        $this->command->info("   Email: okr.admin@company.com");
        $this->command->info("   Role: Admin");
        $this->command->info("   User ID: {$adminUser->user_id}");
        $this->command->info("   ⚠️  Cần tạo user trong AWS Cognito với email này");
        $this->command->info("   📝 Password phải có: uppercase, lowercase, số, ký tự đặc biệt");

        $this->command->info("✅ Member:");
        $this->command->info("   Email: anh249205@gmail.com");
        $this->command->info("   Role: Member");
        $this->command->info("   User ID: {$memberUser->user_id}");

        $this->command->info("✅ Quyền hạn:");
        $this->command->info("   - Admin: Truy cập Users, có thể chỉ định vai trò cho mọi người");
        $this->command->info("   - Manager: Tạo OKR cấp công ty/phòng ban, không truy cập Users");
        $this->command->info("   - Member: Chỉ tạo OKR cá nhân");
    }
}
