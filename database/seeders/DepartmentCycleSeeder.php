<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Department;
use App\Models\Cycle;
use App\Models\User;
use Carbon\Carbon;

class DepartmentCycleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Tạo departments
        $departments = [
            [
                'd_name' => 'Phòng Kỹ thuật',
                'd_description' => 'Phòng ban phụ trách phát triển sản phẩm và công nghệ'
            ],
            [
                'd_name' => 'Phòng Marketing',
                'd_description' => 'Phòng ban phụ trách marketing và truyền thông'
            ],
            [
                'd_name' => 'Phòng Kinh doanh',
                'd_description' => 'Phòng ban phụ trách bán hàng và phát triển khách hàng'
            ],
            [
                'd_name' => 'Phòng Nhân sự',
                'd_description' => 'Phòng ban phụ trách quản lý nhân sự và đào tạo'
            ]
        ];

        foreach ($departments as $deptData) {
            Department::firstOrCreate(
                ['d_name' => $deptData['d_name']],
                $deptData
            );
        }

        // Tạo cycles
        $currentYear = Carbon::now()->year;
        $cycles = [
            [
                'cycle_name' => "Q1 {$currentYear}",
                'start_date' => Carbon::create($currentYear, 1, 1),
                'end_date' => Carbon::create($currentYear, 3, 31),
                'status' => 'active',
                'description' => "Chu kỳ Quý 1 năm {$currentYear}"
            ],
            [
                'cycle_name' => "Q2 {$currentYear}",
                'start_date' => Carbon::create($currentYear, 4, 1),
                'end_date' => Carbon::create($currentYear, 6, 30),
                'status' => 'active',
                'description' => "Chu kỳ Quý 2 năm {$currentYear}"
            ],
            [
                'cycle_name' => "Q3 {$currentYear}",
                'start_date' => Carbon::create($currentYear, 7, 1),
                'end_date' => Carbon::create($currentYear, 9, 30),
                'status' => 'active',
                'description' => "Chu kỳ Quý 3 năm {$currentYear}"
            ],
            [
                'cycle_name' => "Q4 {$currentYear}",
                'start_date' => Carbon::create($currentYear, 10, 1),
                'end_date' => Carbon::create($currentYear, 12, 31),
                'status' => 'active',
                'description' => "Chu kỳ Quý 4 năm {$currentYear}"
            ]
        ];

        foreach ($cycles as $cycleData) {
            Cycle::firstOrCreate(
                ['cycle_name' => $cycleData['cycle_name']],
                $cycleData
            );
        }

        // Gán department cho Manager
        $manager = User::where('email', 'manager@okr.local')->first();
        if ($manager) {
            $techDept = Department::where('d_name', 'Phòng Kỹ thuật')->first();
            if ($techDept) {
                $manager->department_id = $techDept->department_id;
                $manager->save();
            }
        }

        $this->command->info("✅ Departments và Cycles đã được tạo:");
        $this->command->info("   - 4 phòng ban");
        $this->command->info("   - 4 chu kỳ quý");
        $this->command->info("   - Manager được gán vào Phòng Kỹ thuật");
    }
}
