<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'role_name' => 'Admin',
                'description' => 'Quản trị viên hệ thống',
            ],
            [
                'role_name' => 'Manager',
                'description' => 'Quản lý phòng ban',
            ],
            [
                'role_name' => 'Member',
                'description' => 'Thành viên',
            ],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(
                ['role_name' => $role['role_name']],
                $role
            );
        }
    }
}
