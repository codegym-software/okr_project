<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Objective;
use App\Models\KeyResult;
use App\Models\Department;
use App\Models\Cycle;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ReportController extends Controller
{
    /**
     * Hiển thị trang báo cáo
     */
    public function index()
    {
        return view('app');
    }

    /**
     * Company overview report with optional cycle filter.
     */
    public function companyOverview(Request $request)
    {
        $cycleId = $request->query('cycle_id');

        // Base query: all objectives, filtered by cycle if provided
        $objectivesQuery = Objective::query()
            ->select(['objective_id','department_id','cycle_id','progress_percent'])
            ->when($cycleId, fn ($q) => $q->where('cycle_id', $cycleId));

        $objectives = $objectivesQuery->get();

        // Fallback: if objective progress is null, compute from KRs on demand
        $objectiveProgress = $objectives->map(function ($obj) {
            $progress = $obj->progress_percent;
            if ($progress === null || (float) $progress === 0.0) {
                // Fallback an toàn: tính bằng PHP để tránh khác biệt SQL/nullable
                $krs = DB::table('key_results')
                    ->select(['progress_percent','current_value','target_value'])
                    ->where('objective_id', $obj->objective_id)
                    ->get();
                if ($krs->count() === 0) {
                    $progress = 0.0;
                } else {
                    $sum = 0.0;
                    foreach ($krs as $kr) {
                        if ($kr->progress_percent !== null) {
                            $sum += (float) $kr->progress_percent;
                        } elseif (!empty($kr->target_value) && (float) $kr->target_value > 0) {
                            $sum += max(0.0, min(100.0, ((float) $kr->current_value / (float) $kr->target_value) * 100.0));
                        } else {
                            $sum += 0.0;
                        }
                    }
                    $progress = $sum / $krs->count();
                }
            }
            return [
                'objective_id' => $obj->objective_id,
                'department_id' => $obj->department_id,
                'progress' => (float) round($progress, 2),
            ];
        });

        $totalCount = max(1, $objectiveProgress->count());
        $overall = round($objectiveProgress->avg('progress') ?? 0, 2);

        // Status distribution thresholds
        $onTrackCount = $objectiveProgress->where('progress', '>=', 70)->count();
        $atRiskCount = $objectiveProgress->where('progress', '>=', 40)->where('progress', '<', 70)->count();
        $offTrackCount = $objectiveProgress->where('progress', '<', 40)->count();

        $status = [
            'onTrack' => round($onTrackCount * 100 / $totalCount, 2),
            'atRisk' => round($atRiskCount * 100 / $totalCount, 2),
            'offTrack' => round($offTrackCount * 100 / $totalCount, 2),
        ];
        $statusCounts = [
            'onTrack' => $onTrackCount,
            'atRisk' => $atRiskCount,
            'offTrack' => $offTrackCount,
        ];

        // Department averages
        $byDept = $objectiveProgress
            ->groupBy('department_id')
            ->map(function ($items, $deptId) {
                $avg = round($items->avg('progress') ?? 0, 2);
                return [
                    'departmentId' => $deptId ? (int) $deptId : null,
                    'averageProgress' => $avg,
                ];
            })
            ->values()
            ->all();

        // Attach department names
        $deptIds = collect($byDept)->pluck('departmentId')->filter()->all();
        $deptNames = Department::whereIn('department_id', $deptIds)
            ->pluck('d_name', 'department_id');
        foreach ($byDept as &$row) {
            $row['departmentName'] = $row['departmentId'] ? ($deptNames[$row['departmentId']] ?? 'N/A') : 'Công ty';
        }

        $cycleName = null;
        if ($cycleId) {
            $cycleName = optional(Cycle::find($cycleId))->cycle_name;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'overallProgress' => $overall,
                'statusDistribution' => $status,
                'departments' => $byDept,
                'statusCounts' => $statusCounts,
            ],
            'meta' => [
                'cycleId' => $cycleId ? (int) $cycleId : null,
                'cycleName' => $cycleName,
                'totalObjectives' => $objectiveProgress->count(),
                'computedAt' => now()->toISOString(),
            ],
        ]);
    }

    /**
     * API: Lấy dữ liệu báo cáo nhóm của tôi
     */
    public function getMyTeamReport(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Người dùng chưa đăng nhập'
                ], 401);
            }

            // Lấy cycle_id từ request (nếu có)
            $cycleId = $request->query('cycle_id');

            // Lấy department của manager
            $managerDepartment = Department::where('department_id', $user->department_id)->first();
            
            if (!$managerDepartment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không thuộc nhóm nào'
                ], 404);
            }

            // Build query để lấy tất cả OKR trong nhóm (load check-ins để có progress mới nhất)
            $objectivesQuery = Objective::with([
                'keyResults.checkIns' => function($query) {
                    $query->latest()->limit(1); // Chỉ lấy check-in gần nhất
                },
                'user', 
                'department', 
                'cycle'
            ])
                ->where(function($query) use ($managerDepartment, $cycleId) {
                    // OKR cấp nhóm/phòng ban (của team này)
                    $query->where(function($q1) use ($managerDepartment) {
                        $q1->where('department_id', $managerDepartment->department_id)
                          ->whereIn('level', ['team', 'unit']);
                    });
                    
                    // OKR do các thành viên trong team tạo
                    $query->orWhere(function($q2) use ($managerDepartment) {
                        $q2->whereIn('user_id', function($subQuery) use ($managerDepartment) {
                            $subQuery->select('user_id')
                                ->from('users')
                                ->where('department_id', $managerDepartment->department_id);
                        });
                    });
                });

            // Filter theo cycle nếu có
            if ($cycleId) {
                $objectivesQuery->where('cycle_id', $cycleId);
            }

            $objectives = $objectivesQuery->get();

            // Lấy danh sách thành viên trong team
            $teamMembers = User::where('department_id', $managerDepartment->department_id)->get();

            // Tính toán dữ liệu báo cáo
            $reportData = $this->calculateReportData($objectives, $teamMembers, $managerDepartment, $cycleId);

            return response()->json([
                'success' => true,
                'data' => $reportData,
                'department_name' => $managerDepartment->d_name
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy dữ liệu báo cáo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Tính toán dữ liệu báo cáo
     */
    private function calculateReportData($objectives, $teamMembers, $managerDepartment, $cycleId)
    {
        // 1. Tính tỷ lệ hoàn thành trung bình của team (bao gồm OKR cá nhân và OKR nhóm)
        // Tính progress của tất cả Key Results của thành viên trong nhóm
        // Load check-ins mới nhất để đảm bảo dữ liệu chính xác
        $teamMemberIds = $teamMembers->pluck('user_id');
        $allMemberKeyResults = KeyResult::whereIn('user_id', $teamMemberIds)
            ->with(['objective', 'latestCheckIn'])
            ->get()
            ->filter(function($kr) use ($cycleId) {
                if ($cycleId) {
                    return $kr->objective && $kr->objective->cycle_id == $cycleId;
                }
                return true;
            })
            ->map(function($kr) {
                // Ưu tiên sử dụng check-in mới nhất nếu có
                if ($kr->latestCheckIn) {
                    $kr->progress_percent = $kr->latestCheckIn->progress_percent;
                }
                return $kr;
            });

        // Tính progress trung bình của tất cả Key Results
        $teamAverageCompletion = $allMemberKeyResults->count() > 0
            ? round($allMemberKeyResults->avg('progress_percent'), 2)
            : 0;

        // 2. Danh sách OKR cấp nhóm/đơn vị với tiến độ
        $teamOKRs = [];
        foreach ($objectives as $objective) {
            // Lấy tất cả OKR không phải personal (team, unit)
            if (in_array($objective->level, ['team', 'unit'])) {
                // Lấy các Key Results thuộc Objective này và load check-ins mới nhất
                $objectiveKeyResults = KeyResult::where('objective_id', $objective->objective_id)
                    ->with(['latestCheckIn'])
                    ->get()
                    ->map(function($kr) {
                        // Ưu tiên sử dụng check-in mới nhất nếu có
                        if ($kr->latestCheckIn) {
                            $kr->progress_percent = $kr->latestCheckIn->progress_percent;
                        } else {
                            // Nếu không có check-in, tính từ current_value và target_value
                            if ($kr->target_value > 0) {
                                $kr->progress_percent = min(100, max(0, ($kr->current_value / $kr->target_value) * 100));
                            } else {
                                $kr->progress_percent = 0;
                            }
                        }
                        return $kr;
                    });

                $totalKR = $objectiveKeyResults->count();
                $completedKR = $objectiveKeyResults->filter(function($kr) {
                    return ($kr->progress_percent ?? 0) >= 100;
                })->count();

                // Tính tiến độ dựa trên các Key Results thuộc Objective này (từ check-in)
                $teamProgress = $totalKR > 0
                    ? round($objectiveKeyResults->avg('progress_percent'), 2)
                    : 0;

                $teamOKRs[] = [
                    'objective_id' => $objective->objective_id,
                    'obj_title' => $objective->obj_title,
                    'description' => $objective->description,
                    'status' => $objective->status,
                    'level' => $objective->level,
                    'progress' => $teamProgress,
                    'creator_name' => $objective->user ? $objective->user->full_name : null,
                    'creator_email' => $objective->user ? $objective->user->email : null,
                    'key_results_count' => $totalKR,
                    'completed_kr_count' => $completedKR,
                ];
            }
        }

        // 3. Danh sách thành viên với tỷ lệ hoàn thành OKR cá nhân
        $membersData = [];
        foreach ($teamMembers as $member) {
            // Lấy tất cả OKR do thành viên này tạo
            $personalOKRs = $objectives->where('user_id', $member->user_id);

            // Lấy tất cả Key Results do thành viên này tạo (từ database, filter theo cycle)
            // Load check-ins mới nhất để đảm bảo dữ liệu chính xác
            $allKeyResults = KeyResult::where('user_id', $member->user_id)
                ->with(['objective', 'latestCheckIn'])
                ->get()
                ->filter(function($kr) use ($cycleId) {
                    if ($cycleId) {
                        return $kr->objective && $kr->objective->cycle_id == $cycleId;
                    }
                    return true;
                })
                ->map(function($kr) {
                    // Ưu tiên sử dụng check-in mới nhất nếu có
                    if ($kr->latestCheckIn) {
                        $kr->progress_percent = $kr->latestCheckIn->progress_percent;
                    }
                    return $kr;
                });

            $totalKeyResults = $allKeyResults->count();
            $completedKeyResults = $allKeyResults->filter(function($kr) {
                return ($kr->progress_percent ?? 0) >= 100;
            })->count();

            // Tỷ lệ hoàn thành = trung bình progress của tất cả Key Results
            $averageCompletion = $totalKeyResults > 0 
                ? round($allKeyResults->avg('progress_percent'), 2) 
                : 0;

            $membersData[] = [
                'user_id' => $member->user_id,
                'full_name' => $member->full_name,
                'email' => $member->email,
                'average_completion' => $averageCompletion,
                'personal_okr_count' => $personalOKRs->count(),
                'completed_okr_count' => $completedKeyResults,
                'total_kr_count' => $totalKeyResults,
            ];
        }

        return [
            'team_average_completion' => $teamAverageCompletion,
            'total_okr_count' => $objectives->count(),
            'team_okrs' => $teamOKRs,
            'members' => $membersData,
        ];
    }

    /**
     * API: Lấy danh sách cycles
     */
    public function getCycles()
    {
        try {
            $cycles = Cycle::where('status', 'active')
                ->orderBy('start_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $cycles
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy danh sách cycles: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * API: Lấy dữ liệu xu hướng tiến độ nhóm theo thời gian
     */
    public function getTeamProgressTrend(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Người dùng chưa đăng nhập'
                ], 401);
            }

            $cycleId = $request->query('cycle_id');
            
            if (!$cycleId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng chọn chu kỳ'
                ], 400);
            }

            // Lấy department của manager
            $managerDepartment = Department::where('department_id', $user->department_id)->first();
            
            if (!$managerDepartment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không thuộc nhóm nào'
                ], 404);
            }

            // Lấy danh sách thành viên trong team
            $teamMemberIds = User::where('department_id', $managerDepartment->department_id)
                ->pluck('user_id');

            // Lấy tất cả Key Results của team trong cycle này
            $keyResults = \App\Models\KeyResult::whereIn('user_id', $teamMemberIds)
                ->whereHas('objective', function($query) use ($cycleId) {
                    $query->where('cycle_id', $cycleId);
                })
                ->with(['checkIns' => function($query) {
                    $query->orderBy('created_at', 'asc');
                }])
                ->get();

            // Nhóm check-ins theo ngày và tính tỷ lệ hoàn thành trung bình tại mỗi thời điểm
            $trendData = [];
            $checkInsByDate = [];

            // Thu thập tất cả check-ins với progress của Key Results tại thời điểm đó
            foreach ($keyResults as $kr) {
                foreach ($kr->checkIns as $checkIn) {
                    $dateKey = \Carbon\Carbon::parse($checkIn->created_at)->format('Y-m-d');
                    $dateLabel = \Carbon\Carbon::parse($checkIn->created_at)->format('d/m/Y');
                    
                    if (!isset($checkInsByDate[$dateKey])) {
                        $checkInsByDate[$dateKey] = [
                            'label' => $dateLabel,
                            'values' => [],
                            'date' => $checkIn->created_at
                        ];
                    }
                    $checkInsByDate[$dateKey]['values'][] = floatval($checkIn->progress_percent ?? 0);
                }
            }

            // Tính tỷ lệ trung bình cho mỗi ngày
            foreach ($checkInsByDate as $dateKey => $dateData) {
                $averageProgress = count($dateData['values']) > 0 
                    ? round(array_sum($dateData['values']) / count($dateData['values']), 2)
                    : 0;
                
                $trendData[] = [
                    'label' => $dateData['label'],
                    'value' => $averageProgress,
                    'date' => $dateData['date']
                ];
            }

            // Sắp xếp theo ngày
            usort($trendData, function($a, $b) {
                return strtotime($a['date']) - strtotime($b['date']);
            });

            // Nếu có quá nhiều điểm, nhóm lại theo tuần để hiển thị rõ hơn (tối đa 12 điểm)
            if (count($trendData) > 12) {
                // Nhóm lại theo tuần
                $groupedByWeek = [];
                
                foreach ($trendData as $item) {
                    $weekKey = \Carbon\Carbon::parse($item['date'])->format('Y-W');
                    if (!isset($groupedByWeek[$weekKey])) {
                        $groupedByWeek[$weekKey] = [
                            'label' => 'Tuần ' . \Carbon\Carbon::parse($item['date'])->format('W/Y'),
                            'values' => [],
                            'date' => $item['date']
                        ];
                    }
                    $groupedByWeek[$weekKey]['values'][] = $item['value'];
                }

                $trendData = [];
                foreach ($groupedByWeek as $weekData) {
                    $averageProgress = count($weekData['values']) > 0 
                        ? round(array_sum($weekData['values']) / count($weekData['values']), 2)
                        : 0;
                    $trendData[] = [
                        'label' => $weekData['label'],
                        'value' => $averageProgress,
                        'date' => $weekData['date']
                    ];
                }

                // Sắp xếp lại theo ngày
                usort($trendData, function($a, $b) {
                    return strtotime($a['date']) - strtotime($b['date']);
                });

                // Lấy 12 điểm gần nhất
                $trendData = array_slice($trendData, -12);
            }

            return response()->json([
                'success' => true,
                'data' => $trendData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy dữ liệu xu hướng: ' . $e->getMessage()
            ], 500);
        }
    }
}
