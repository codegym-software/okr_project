<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class LocalUserSeeder extends Seeder
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

        // Tạo admin với mật khẩu cố định
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@okr.local'],
            [
                'full_name' => 'Local Administrator',
                'email' => 'admin@okr.local',
                'password_hash' => Hash::make('Admin123!@#'),
                'job_title' => 'System Admin',
                'role_id' => $adminRole->role_id,
                'sub' => 'local-admin-' . time(),
                'status' => 'active',
            ]
        );

        // Tạo member với mật khẩu cố định
        $memberUser = User::firstOrCreate(
            ['email' => 'member@okr.local'],
            [
                'full_name' => 'Local Member',
                'email' => 'member@okr.local',
                'password_hash' => Hash::make('Member123!@#'),
                'job_title' => 'Developer',
                'role_id' => $memberRole->role_id,
                'sub' => 'local-member-' . time(),
                'status' => 'active',
            ]
        );

        // Tạo manager với mật khẩu cố định
        $managerUser = User::firstOrCreate(
            ['email' => 'manager@okr.local'],
            [
                'full_name' => 'Local Manager',
                'email' => 'manager@okr.local',
                'password_hash' => Hash::make('Manager123!@#'),
                'job_title' => 'Project Manager',
                'role_id' => $managerRole->role_id,
                'sub' => 'local-manager-' . time(),
                'status' => 'active',
            ]
        );

        $this->command->info("✅ Tài khoản local đã được tạo:");
        $this->command->info("   Admin: admin@okr.local / Admin123!@#");
        $this->command->info("   Manager: manager@okr.local / Manager123!@#");
        $this->command->info("   Member: member@okr.local / Member123!@#");
    }
}
