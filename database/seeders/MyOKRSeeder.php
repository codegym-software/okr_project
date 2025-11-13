<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Cycle;
use App\Models\Objective;
use App\Models\KeyResult;
use App\Models\User;
use Carbon\Carbon;

class MyOKRSeeder extends Seeder
{
    public function run()
    {
        // Tạo cycle cho quý hiện tại
        $cycle = Cycle::create([
            'cycle_name' => 'Q4 2025',
            'start_date' => now()->startOfQuarter(),
            'end_date' => now()->endOfQuarter(),
            'status' => 'active',
            'description' => 'Chu kỳ Q4 2025'
        ]);

        // Lấy user hiện tại (khanhnguyen)
        $user = User::where('email', 'khanh.nguyen@software.codegym.vn')->first();
        
        if (!$user) {
            // Fallback: lấy user đầu tiên có department_id
            $user = User::whereNotNull('department_id')->first();
            
            if (!$user) {
                echo "Error: No user found with department_id!\n";
                return;
            }
        }
        
        echo "Creating objectives for user: {$user->email} (ID: {$user->user_id})\n";

        // Tạo objectives mẫu
        $objectives = [
            [
                'obj_title' => 'Nâng cao kỹ năng lập trình Laravel',
                'description' => 'Phát triển kỹ năng backend với Laravel framework để trở thành full-stack developer',
                'level' => 'personal',
                'status' => 'in_progress',
                'progress_percent' => 75,
                'key_results' => [
                    [
                        'kr_title' => 'Hoàn thành 3 khóa học Laravel online',
                        'target_value' => 100,
                        'current_value' => 75,
                        'unit' => '%',
                        'status' => 'in_progress',
                        'weight' => 30,
                        'progress_percent' => 75
                    ],
                    [
                        'kr_title' => 'Xây dựng 2 dự án Laravel thực tế',
                        'target_value' => 2,
                        'current_value' => 1,
                        'unit' => 'dự án',
                        'status' => 'in_progress',
                        'weight' => 40,
                        'progress_percent' => 50
                    ],
                    [
                        'kr_title' => 'Đạt điểm 8/10 trong bài test Laravel',
                        'target_value' => 8,
                        'current_value' => 6,
                        'unit' => 'điểm',
                        'status' => 'in_progress',
                        'weight' => 30,
                        'progress_percent' => 75
                    ]
                ]
            ],
            [
                'obj_title' => 'Hoàn thiện dự án OKR Management System',
                'description' => 'Xây dựng hệ thống quản lý OKR hoàn chỉnh với đầy đủ tính năng',
                'level' => 'personal',
                'status' => 'in_progress',
                'progress_percent' => 60,
                'key_results' => [
                    [
                        'kr_title' => 'Hoàn thành 80% tính năng cơ bản',
                        'target_value' => 80,
                        'current_value' => 60,
                        'unit' => '%',
                        'status' => 'in_progress',
                        'weight' => 35,
                        'progress_percent' => 75
                    ],
                    [
                        'kr_title' => 'Tạo 5 trang giao diện responsive',
                        'target_value' => 5,
                        'current_value' => 3,
                        'unit' => 'trang',
                        'status' => 'in_progress',
                        'weight' => 25,
                        'progress_percent' => 60
                    ],
                    [
                        'kr_title' => 'Viết 20 test cases',
                        'target_value' => 20,
                        'current_value' => 15,
                        'unit' => 'test',
                        'status' => 'in_progress',
                        'weight' => 25,
                        'progress_percent' => 75
                    ],
                    [
                        'kr_title' => 'Deploy lên production server',
                        'target_value' => 1,
                        'current_value' => 0,
                        'unit' => 'lần',
                        'status' => 'not_started',
                        'weight' => 15,
                        'progress_percent' => 0
                    ]
                ]
            ],
            [
                'obj_title' => 'Nâng cao kỹ năng tiếng Anh giao tiếp',
                'description' => 'Cải thiện khả năng giao tiếp tiếng Anh để làm việc với team quốc tế',
                'level' => 'personal',
                'status' => 'in_progress',
                'progress_percent' => 82,
                'key_results' => [
                    [
                        'kr_title' => 'Học 50 từ vựng mới mỗi tuần',
                        'target_value' => 50,
                        'current_value' => 45,
                        'unit' => 'từ',
                        'status' => 'in_progress',
                        'weight' => 30,
                        'progress_percent' => 90
                    ],
                    [
                        'kr_title' => 'Tham gia 10 buổi conversation club',
                        'target_value' => 10,
                        'current_value' => 7,
                        'unit' => 'buổi',
                        'status' => 'in_progress',
                        'weight' => 35,
                        'progress_percent' => 70
                    ],
                    [
                        'kr_title' => 'Đạt điểm 7.0 IELTS Speaking',
                        'target_value' => 7.0,
                        'current_value' => 6.0,
                        'unit' => 'điểm',
                        'status' => 'in_progress',
                        'weight' => 35,
                        'progress_percent' => 86
                    ]
                ]
            ]
        ];

        foreach ($objectives as $objData) {
            $objective = Objective::create([
                'obj_title' => $objData['obj_title'],
                'description' => $objData['description'],
                'level' => $objData['level'],
                'status' => $objData['status'],
                'progress_percent' => $objData['progress_percent'],
                'user_id' => $user->user_id,
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $user->department_id, // Thêm department_id
            ]);

            foreach ($objData['key_results'] as $krData) {
                KeyResult::create([
                    'kr_title' => $krData['kr_title'],
                    'target_value' => $krData['target_value'],
                    'current_value' => $krData['current_value'],
                    'unit' => $krData['unit'],
                    'status' => $krData['status'],
                    'weight' => $krData['weight'],
                    'progress_percent' => $krData['progress_percent'],
                    'objective_id' => $objective->objective_id,
                    'cycle_id' => $cycle->cycle_id,
                ]);
            }
        }

        echo "Sample data created successfully!\n";
        echo "Cycle: {$cycle->cycle_name}\n";
        echo "User: {$user->email}\n";
        echo "Objectives: " . Objective::where('user_id', $user->user_id)->count() . "\n";
    }
}
