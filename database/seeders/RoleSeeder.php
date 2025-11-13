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
                'role_name' => 'admin',
                'description' => 'Quản trị viên hệ thống',
                'level' => 'company',
                'allowed_levels' => json_encode(['company', 'unit', 'team', 'person']),
            ],
            [
                'role_name' => 'manager',
                'description' => 'Quản lý cấp đơn vị',
                'level' => 'unit',
                'allowed_levels' => json_encode(['unit', 'team', 'person']),
            ],
            [
                'role_name' => 'manager',
                'description' => 'Quản lý cấp đội nhóm',
                'level' => 'team',
                'allowed_levels' => json_encode(['team', 'person']),
            ],
            [
                'role_name' => 'member',
                'description' => 'Thành viên cấp đơn vị',
                'level' => 'unit',
                'allowed_levels' => json_encode(['person']),
            ],
            [
                'role_name' => 'member',
                'description' => 'Thành viên cấp nhóm',
                'level' => 'team',
                'allowed_levels' => json_encode(['person']),
            ],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(
                [
                    'role_name' => $role['role_name'],
                    'level' => $role['level']
                ],
                $role
            );
        }
    }
}
