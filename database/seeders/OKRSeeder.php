<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Objective;
use App\Models\KeyResult;
use Carbon\Carbon;

class OKRSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = Carbon::now();
        $quarter = $now->quarter;
        $year = $now->year;
        
        // Tạo Objectives cho quý hiện tại
        $objectives = [
            [
                'title' => 'Nâng cao kỹ năng lập trình Laravel',
                'description' => 'Phát triển kỹ năng backend với Laravel framework để trở thành full-stack developer',
                'user_id' => 1,
                'created_at' => $now->copy()->subDays(15),
            ],
            [
                'title' => 'Hoàn thiện dự án OKR Management System',
                'description' => 'Xây dựng hệ thống quản lý OKR hoàn chỉnh với đầy đủ tính năng',
                'user_id' => 1,
                'created_at' => $now->copy()->subDays(10),
            ],
            [
                'title' => 'Nâng cao kỹ năng tiếng Anh giao tiếp',
                'description' => 'Cải thiện khả năng giao tiếp tiếng Anh để làm việc với team quốc tế',
                'user_id' => 1,
                'created_at' => $now->copy()->subDays(5),
            ],
            [
                'title' => 'Phát triển kỹ năng leadership',
                'description' => 'Học hỏi và áp dụng các kỹ năng lãnh đạo trong công việc',
                'user_id' => 1,
                'created_at' => $now->copy()->subDays(3),
            ]
        ];

        foreach ($objectives as $objectiveData) {
            $objective = Objective::create($objectiveData);
            
            // Tạo Key Results cho mỗi Objective
            $keyResultsData = [];
            
            switch ($objective->title) {
                case 'Nâng cao kỹ năng lập trình Laravel':
                    $keyResultsData = [
                        [
                            'title' => 'Hoàn thành 3 khóa học Laravel online',
                            'target_value' => 100,
                            'current_value' => 75,
                            'progress' => 75,
                            'unit' => '%'
                        ],
                        [
                            'title' => 'Xây dựng 2 dự án Laravel thực tế',
                            'target_value' => 2,
                            'current_value' => 1,
                            'progress' => 50,
                            'unit' => 'dự án'
                        ],
                        [
                            'title' => 'Đạt điểm 8/10 trong bài test Laravel',
                            'target_value' => 8,
                            'current_value' => 6,
                            'progress' => 75,
                            'unit' => 'điểm'
                        ]
                    ];
                    break;
                    
                case 'Hoàn thiện dự án OKR Management System':
                    $keyResultsData = [
                        [
                            'title' => 'Hoàn thành 80% tính năng cơ bản',
                            'target_value' => 80,
                            'current_value' => 60,
                            'progress' => 75,
                            'unit' => '%'
                        ],
                        [
                            'title' => 'Tạo 5 trang giao diện responsive',
                            'target_value' => 5,
                            'current_value' => 3,
                            'progress' => 60,
                            'unit' => 'trang'
                        ],
                        [
                            'title' => 'Viết 20 test cases',
                            'target_value' => 20,
                            'current_value' => 15,
                            'progress' => 75,
                            'unit' => 'test'
                        ],
                        [
                            'title' => 'Deploy lên production server',
                            'target_value' => 1,
                            'current_value' => 0,
                            'progress' => 0,
                            'unit' => 'lần'
                        ]
                    ];
                    break;
                    
                case 'Nâng cao kỹ năng tiếng Anh giao tiếp':
                    $keyResultsData = [
                        [
                            'title' => 'Học 50 từ vựng mới mỗi tuần',
                            'target_value' => 50,
                            'current_value' => 45,
                            'progress' => 90,
                            'unit' => 'từ'
                        ],
                        [
                            'title' => 'Tham gia 10 buổi conversation club',
                            'target_value' => 10,
                            'current_value' => 7,
                            'progress' => 70,
                            'unit' => 'buổi'
                        ],
                        [
                            'title' => 'Đạt điểm 7.0 IELTS Speaking',
                            'target_value' => 7.0,
                            'current_value' => 6.0,
                            'progress' => 86,
                            'unit' => 'điểm'
                        ]
                    ];
                    break;
                    
                case 'Phát triển kỹ năng leadership':
                    $keyResultsData = [
                        [
                            'title' => 'Đọc 3 cuốn sách về leadership',
                            'target_value' => 3,
                            'current_value' => 1,
                            'progress' => 33,
                            'unit' => 'cuốn'
                        ],
                        [
                            'title' => 'Dẫn dắt 2 dự án team',
                            'target_value' => 2,
                            'current_value' => 0,
                            'progress' => 0,
                            'unit' => 'dự án'
                        ],
                        [
                            'title' => 'Tham gia 5 workshop về management',
                            'target_value' => 5,
                            'current_value' => 2,
                            'progress' => 40,
                            'unit' => 'workshop'
                        ]
                    ];
                    break;
            }
            
            foreach ($keyResultsData as $krData) {
                KeyResult::create([
                    'objective_id' => $objective->id,
                    'title' => $krData['title'],
                    'target_value' => $krData['target_value'],
                    'current_value' => $krData['current_value'],
                    'progress' => $krData['progress'],
                    'unit' => $krData['unit'],
                    'created_at' => $objective->created_at->copy()->addMinutes(rand(1, 60))
                ]);
            }
        }
    }
}
