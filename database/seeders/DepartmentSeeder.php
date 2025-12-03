<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create main departments (phòng ban)
        $it = Department::create([
            'd_name' => 'IT Department',
            'd_description' => 'Information Technology Department',
            'type' => 'phòng ban',
            'parent_department_id' => null,
        ]);

        $hr = Department::create([
            'd_name' => 'HR Department',
            'd_description' => 'Human Resources Department',
            'type' => 'phòng ban',
            'parent_department_id' => null,
        ]);

        $sales = Department::create([
            'd_name' => 'Sales Department',
            'd_description' => 'Sales and Business Development',
            'type' => 'phòng ban',
            'parent_department_id' => null,
        ]);

        $marketing = Department::create([
            'd_name' => 'Marketing Department',
            'd_description' => 'Marketing and Communications',
            'type' => 'phòng ban',
            'parent_department_id' => null,
        ]);

        // Create sub-teams (đội nhóm) under IT
        Department::create([
            'd_name' => 'Backend Team',
            'd_description' => 'Backend Development Team',
            'type' => 'đội nhóm',
            'parent_department_id' => $it->department_id,
        ]);

        Department::create([
            'd_name' => 'Frontend Team',
            'd_description' => 'Frontend Development Team',
            'type' => 'đội nhóm',
            'parent_department_id' => $it->department_id,
        ]);

        Department::create([
            'd_name' => 'DevOps Team',
            'd_description' => 'DevOps and Infrastructure Team',
            'type' => 'đội nhóm',
            'parent_department_id' => $it->department_id,
        ]);

        // Create sub-teams under Sales
        Department::create([
            'd_name' => 'Enterprise Sales',
            'd_description' => 'Enterprise Sales Team',
            'type' => 'đội nhóm',
            'parent_department_id' => $sales->department_id,
        ]);

        Department::create([
            'd_name' => 'SME Sales',
            'd_description' => 'SME Sales Team',
            'type' => 'đội nhóm',
            'parent_department_id' => $sales->department_id,
        ]);

        // Create sub-teams under Marketing
        Department::create([
            'd_name' => 'Content Marketing',
            'd_description' => 'Content Marketing Team',
            'type' => 'đội nhóm',
            'parent_department_id' => $marketing->department_id,
        ]);

        Department::create([
            'd_name' => 'Digital Marketing',
            'd_description' => 'Digital Marketing and Social Media Team',
            'type' => 'đội nhóm',
            'parent_department_id' => $marketing->department_id,
        ]);

        // Create sub-teams under HR
        Department::create([
            'd_name' => 'Recruitment Team',
            'd_description' => 'Recruitment and Talent Acquisition',
            'type' => 'đội nhóm',
            'parent_department_id' => $hr->department_id,
        ]);

        Department::create([
            'd_name' => 'HR Operations',
            'd_description' => 'HR Operations and Administration',
            'type' => 'đội nhóm',
            'parent_department_id' => $hr->department_id,
        ]);
    }
}
