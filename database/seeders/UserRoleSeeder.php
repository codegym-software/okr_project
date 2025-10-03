<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;

class UserRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Lấy role Admin
        $adminRole = Role::where('role_name', 'Admin')->first();

        if (!$adminRole) {
            $this->command->error('Role Admin không tồn tại. Vui lòng chạy RoleSeeder trước.');
            return;
        }

        // Gán role Admin cho user đầu tiên (hoặc user hiện tại)
        $user = User::first();

        if ($user) {
            $user->role_id = $adminRole->role_id;
            $user->save();

            $this->command->info("Đã gán role Admin cho user: {$user->full_name} ({$user->email})");
        } else {
            $this->command->error('Không tìm thấy user nào trong hệ thống.');
        }
    }
}
