<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Objective;
use App\Models\KeyResult;
use App\Models\CheckIn;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        return view('app');
    }

    public function getData(Request $request)
    {
        $user = auth()->user()->load('role');

        // Allow overriding current date for testing (pass ?date=YYYY-MM-DD)
        $dateParam = $request->input('date');
        try {
            $now = $dateParam ? Carbon::parse($dateParam) : Carbon::now();
        } catch (\Exception $e) {
            $now = Carbon::now();
        }

        // Lấy cycle hiện tại dựa trên thời gian (ngày hiện tại nằm trong cycle)
        $currentCycle = \App\Models\Cycle::whereRaw('DATE(start_date) <= ?', [$now->toDateString()])
            ->whereRaw('DATE(end_date) >= ?', [$now->toDateString()])
            ->first();

        if (!$currentCycle) {
            // Nếu không có cycle hiện tại, trả về dữ liệu trống
            return response()->json([
                'user' => $user,
                'myOkrs' => [],
                'deptOkrs' => [],
                'companyOkrs' => [],
                'companyGlobalAvg' => 0,
                'riskKrs' => [],
                'overdueKrs' => [],
                'weeklySummary' => [
                    'checkedIn' => '0',
                    'needCheckIn' => 0,
                    'confidence' => 0,
                    'risks' => 0,
                ],
            ]);
        }

        // Check if user has objectives in the current cycle
        $hasObjectivesInCurrentCycle = \App\Models\Objective::where('cycle_id', $currentCycle->cycle_id)
            ->where('user_id', $user->user_id)
            ->whereNull('archived_at')
            ->exists();

        if (!$hasObjectivesInCurrentCycle) {
            // Nếu không có objectives trong cycle hiện tại, trả về dữ liệu trống
            return response()->json([
                'user' => $user,
                'myOkrs' => [],
                'deptOkrs' => [],
                'companyOkrs' => [],
                'companyGlobalAvg' => 0,
                'riskKrs' => [],
                'overdueKrs' => [],
                'weeklySummary' => [
                    'checkedIn' => '0',
                    'needCheckIn' => 0,
                    'confidence' => 0,
                    'risks' => 0,
                ],
            ]);
        }

        $myOkrs = Objective::where('user_id', $user->user_id)
            ->where('cycle_id', $currentCycle->cycle_id)
            ->where('level', 'person')
            ->whereNull('archived_at')
            ->with([
                'keyResults' => function($query) {
                    $query->whereNull('archived_at')->with('childObjectives');
                }, 
                'sourceLinks.targetObjective', 
                'sourceLinks.targetObjective.department',
                'cycle', 
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        $deptOkrs = [];
        $isCeoOrAdmin = $user->role && in_array(strtolower($user->role->role_name), ['admin', 'ceo']);

        if ($isCeoOrAdmin) {
            $deptOkrs = Objective::where('cycle_id', $currentCycle->cycle_id)
                ->where('level', 'unit')
                ->whereNull('archived_at')
                ->with([
                    'keyResults' => function($query) {
                        $query->whereNull('archived_at')->with('childObjectives.sourceObjective');
                    }, 
                    'sourceLinks.targetObjective',
                    'department',
                    'childObjectives'
                ])
                ->orderBy('created_at', 'desc')
                ->limit(50)
                ->get();
        } elseif ($user->department_id) {
            $deptOkrs = Objective::where('cycle_id', $currentCycle->cycle_id)
                ->where('department_id', $user->department_id)
                ->where('level', 'unit')
                ->whereNull('archived_at')
                ->with([
                    'keyResults' => function($query) {
                        $query->whereNull('archived_at')->with('childObjectives.sourceObjective');
                    }, 
                    'sourceLinks.targetObjective',
                    'childObjectives'
                ])
                ->orderBy('created_at', 'desc')
                ->limit(20)
                ->get();
        }

        $companyOkrs = [];
        
        if ($isCeoOrAdmin) {
            $companyOkrs = Objective::where('cycle_id', $currentCycle->cycle_id)
                ->where('level', 'company')
                ->whereNull('archived_at')
                ->with([
                    'keyResults' => function($query) {
                        $query->whereNull('archived_at')->with('childObjectives.sourceObjective');
                    }, 
                    'childObjectives'
                ])
                ->orderBy('created_at', 'desc')
                ->get();
        } elseif (!empty($deptOkrs) && $deptOkrs->count() > 0) {
            $deptObjIds = $deptOkrs->pluck('objective_id')->toArray();

            $companyOkrs = Objective::where('cycle_id', $currentCycle->cycle_id)
                ->where('level', 'company')
                ->whereHas('targetLinks', function($query) use ($deptObjIds) {
                    $query->whereIn('source_objective_id', $deptObjIds)
                          ->where('is_active', true)
                          ->where('status', 'approved');
                })
                ->whereNull('archived_at')
                ->with([
                    'keyResults' => function($query) {
                        $query->whereNull('archived_at')->with('childObjectives.sourceObjective');
                    }, 
                    'childObjectives'
                ])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        $allCompanyOkrs = Objective::where('cycle_id', $currentCycle->cycle_id)
            ->where('level', 'company')
            ->whereNull('archived_at')
            ->get();
            
        $totalProgress = 0;
        $count = 0;
        
        foreach ($allCompanyOkrs as $okr) {
            $val = $okr->calculated_progress ?? $okr->progress_percent ?? 0;
            $totalProgress += (float)$val;
            $count++;
        }
        
        $companyGlobalAvg = $count > 0 ? round($totalProgress / $count, 1) : 0;

        $riskKrs = [];
        $overdueKrs = [];
        foreach ($myOkrs as $okr) {
            $cycle = $okr->cycle;
            $start = $cycle ? Carbon::parse($cycle->start_date) : $now->startOfYear();
            $end = $cycle ? Carbon::parse($cycle->end_date) : $now->endOfYear();

            if ($end->lte($now)) continue; 

            $totalDays = $start->diffInDays($end);
            $elapsedDays = $start->diffInDays($now);
            $timeRatio = $totalDays > 0 ? $elapsedDays / $totalDays : 0;
            $daysLeft = $now->diffInDays($end, false); 

            foreach ($okr->keyResults as $kr) {
                $krProgress = $kr->calculated_progress ?? $kr->progress_percent ?? 0;

                // Skip risk evaluation for KRs that have never been checked-in
                $lastCheckIn = CheckIn::where('kr_id', $kr->kr_id)->latest()->first();
                if (!$lastCheckIn) {
                    continue;
                }

                $isRisk = false;

                if ($krProgress < 50) {
                    $isRisk = true;
                }

                if ($isRisk) {
                    $riskKrs[] = [
                        'kr_id' => $kr->kr_id,
                        'kr_title' => $kr->kr_title,
                        'progress_percent' => $krProgress,
                        'objective_id' => $okr->objective_id,
                        'deadline' => $end->toDateString(),
                    ];

                    // Include in overdue list regardless of creation age once the KR has at least one check-in
                    $overdueKrs[] = [
                        'kr_id' => $kr->kr_id,
                        'kr_title' => $kr->kr_title,
                        'progress_percent' => $krProgress,
                        'objective_id' => $okr->objective_id,
                        'deadline' => $end->toDateString(),
                    ];
                }
            }
        }

        $weekStart = Carbon::now()->startOfWeek();
        $weekEnd = Carbon::now()->endOfWeek();

        $myKrIds = collect($myOkrs)->pluck('keyResults')->flatten()->pluck('kr_id')->unique()->toArray();

        $checkedInKrs = CheckIn::where('user_id', $user->user_id)
            ->whereIn('kr_id', $myKrIds)
            ->whereBetween('created_at', [$weekStart, $weekEnd])
            ->distinct('kr_id')
            ->count('kr_id');

        $totalActiveKrs = 0;
        $needCheckIn = 0;
        $totalConfidence = 0;
        $confidenceCount = 0;
        $totalRisks = 0;

        foreach ($myOkrs as $okr) {
            $cycle = $okr->cycle;
            $now = Carbon::now();
            $start = $cycle ? Carbon::parse($cycle->start_date) : $now->startOfYear();
            $end = $cycle ? Carbon::parse($cycle->end_date) : $now->endOfYear();

            if ($end->lte($now)) continue; 

            $totalDays = $start->diffInDays($end);
            $elapsedDays = $start->diffInDays($now);
            $timeRatio = $totalDays > 0 ? $elapsedDays / $totalDays : 0;
            $daysLeft = $now->diffInDays($end, false); 

            foreach ($okr->keyResults as $kr) {
                $krProgress = $kr->calculated_progress ?? $kr->progress_percent ?? 0;
                
                if ($krProgress < 100) {
                    $totalActiveKrs++;
                }
                
                if (!$kr->childObjectives || $kr->childObjectives->isEmpty()) {
                    $lastCheckIn = CheckIn::where('kr_id', $kr->kr_id)->latest()->first();
                    $isOverdue = !$lastCheckIn || $lastCheckIn->created_at < Carbon::now()->subDays(7);
                    if ($krProgress < 100 && $isOverdue) {
                        $needCheckIn++;
                    }
                }

                $lastCheckIn = CheckIn::where('kr_id', $kr->kr_id)->latest()->first();
                $confidence = $lastCheckIn ? $lastCheckIn->progress_percent : 100;
                $totalConfidence += $confidence;
                $confidenceCount++;

                // Only evaluate risk for KRs that have at least one check-in
                $isRisk = false;
                if ($lastCheckIn) {
                    if ($krProgress < 50) {
                        $isRisk = true;
                    }
                }
                if ($isRisk) {
                    $totalRisks++;
                }
            }
        }

        $checkedInDisplay = $totalActiveKrs > 0 ? "$checkedInKrs/$totalActiveKrs" : "0";
        $confidence = $confidenceCount > 0 ? round($totalConfidence / $confidenceCount, 1) : 0;

        $weeklySummary = [
            'checkedIn' => $checkedInDisplay,
            'needCheckIn' => $needCheckIn,
            'confidence' => $confidence,
            'risks' => $totalRisks,
        ];

        return response()->json([
            'user' => $user,
            'myOkrs' => $myOkrs,
            'deptOkrs' => $deptOkrs,
            'companyOkrs' => $companyOkrs,
            'companyGlobalAvg' => $companyGlobalAvg,
            'riskKrs' => $riskKrs,
            'overdueKrs' => $overdueKrs,
            'weeklySummary' => $weeklySummary,
        ]);
    }

    public function getProgressChartData(Request $request)
    {
        $user = auth()->user();

        $dateParam = $request->input('date');
        try {
            $now = $dateParam ? Carbon::parse($dateParam) : Carbon::now();
        } catch (\Exception $e) {
            $now = Carbon::now();
        }

        $cycle = \App\Models\Cycle::whereRaw('DATE(start_date) <= ?', [$now->toDateString()])
            ->whereRaw('DATE(end_date) >= ?', [$now->toDateString()])
            ->first();

        if (!$cycle) {
            return response()->json([
                'weeks' => [],
                'actual' => [],
                'target' => [],
                'department' => [],
                'isBehind' => false,
                'currentProgress' => 0,
                'targetProgress' => 0,
                'cycle' => [
                    'name' => 'N/A',
                    'start' => null,
                    'end' => null,
                    'objectivesCount' => 0
                ]
            ]);
        }

        $hasObjectivesInCurrentCycle = \App\Models\Objective::where('cycle_id', $cycle->cycle_id)
            ->where('user_id', $user->user_id)
            ->whereNull('archived_at')
            ->exists();

        if (!$hasObjectivesInCurrentCycle) {
            return response()->json([
                'weeks' => [],
                'actual' => [],
                'target' => [],
                'department' => [],
                'isBehind' => false,
                'currentProgress' => 0,
                'targetProgress' => 0,
                'cycle' => [
                    'name' => $cycle->cycle_name ?? 'N/A',
                    'start' => $cycle->start_date ?? null,
                    'end' => $cycle->end_date ?? null,
                    'objectivesCount' => 0
                ]
            ]);
        }

        $objectives = \App\Models\Objective::where('cycle_id', $cycle->cycle_id)
            ->where('user_id', $user->user_id)
            ->whereNull('archived_at')
            ->with(['keyResults.checkIns', 'department'])
            ->get();

        if ($objectives->isEmpty()) {
            return response()->json([
                'weeks' => [],
                'actual' => [],
                'target' => [],
                'department' => [],
                'isBehind' => false,
                'currentProgress' => 0,
                'targetProgress' => 0,
                'cycle' => [
                    'name' => $cycle->cycle_name ?? 'N/A',
                    'start' => $cycle->start_date ?? null,
                    'end' => $cycle->end_date ?? null,
                    'objectivesCount' => 0
                ]
            ]);
        }

        $firstObjectiveCreated = $objectives->min('created_at');
        $cycleStart = Carbon::parse($cycle->start_date);
        $cycleEnd = Carbon::parse($cycle->end_date);
        $now = Carbon::now();

        // Tìm check-in đầu tiên
        $firstCheckInDate = null;
        foreach ($objectives as $obj) {
            foreach ($obj->keyResults as $kr) {
                if ($kr->checkIns->isNotEmpty()) {
                    $krFirstCheckIn = $kr->checkIns->min('created_at');
                    if (!$firstCheckInDate || $krFirstCheckIn < $firstCheckInDate) {
                        $firstCheckInDate = $krFirstCheckIn;
                    }
                }
            }
        }

        // Sử dụng ngày bắt đầu cycle
        $effectiveStartDate = $cycleStart;
        $chartStartDate = $effectiveStartDate->startOfWeek();

        // Tạo danh sách tuần từ tuần đầu tiên của cycle đến hiện tại
        $weeks = [];
        $currentWeek = $chartStartDate->copy();

        while ($currentWeek->lte($now)) {
            $weekEnd = $currentWeek->copy()->endOfWeek();
            $weeks[] = [
                'start' => $currentWeek->toDateString(),
                'end' => $weekEnd->toDateString(),
                'label' => 'Tuần ' . (count($weeks) + 1) . ' (' . $currentWeek->format('d/m') . ' - ' . $weekEnd->format('d/m') . ')'
            ];
            $currentWeek = $currentWeek->addWeek();
        }

        // Thu thập dữ liệu actual progress theo tuần
        $actualData = [];
        $departmentData = [];
        $totalObjectives = $objectives->count();
        $totalKrs = $objectives->sum(function($obj) {
            return $obj->keyResults->count();
        });

        // Thu thập tất cả check-ins của user
        $allCheckIns = collect();
        $krMap = collect();
        foreach ($objectives as $obj) {
            foreach ($obj->keyResults as $kr) {
                $allCheckIns = $allCheckIns->merge($kr->checkIns);
                $krMap[$kr->kr_id] = $kr;
            }
        }

        // Tính actual progress cho mỗi tuần (lấy check-in mới nhất cho mỗi key result tích lũy đến tuần đó, sau đó trung bình)
        $actualData = [];
        $previousActualProgress = 0;
        foreach ($weeks as $week) {
            $weekStart = Carbon::parse($week['start']);
            $weekEnd = Carbon::parse($week['end']);
            $cumulativeCheckIns = $allCheckIns->filter(function($checkIn) use ($chartStartDate, $weekEnd) {
                $date = Carbon::parse($checkIn->created_at);
                return $date->between($chartStartDate, $weekEnd);
            });
            // Nhóm check-ins theo kr_id và lấy check-in mới nhất cho mỗi KR
            $latestPerKr = [];
            foreach ($cumulativeCheckIns->groupBy('kr_id') as $krId => $krCheckIns) {
                $kr = $krMap[$krId] ?? null;
                if (!$kr || ($kr->archived_at && Carbon::parse($kr->archived_at)->lte($weekEnd))) {
                    continue; // Skip if KR is archived before or at weekEnd
                }
                $latestCheckIn = $krCheckIns->sortByDesc('created_at')->first();
                if ($latestCheckIn) {
                    $latestPerKr[] = $latestCheckIn->progress_percent;
                }
            }
            // Trung bình progress của các KR
            if (count($latestPerKr) > 0) {
                $progress = array_sum($latestPerKr) / count($latestPerKr);
            } else {
                $progress = $previousActualProgress;
            }
            $actualData[] = round($progress, 1);
            $previousActualProgress = $progress;
        }

        // Tính department progress cho mỗi tuần (lấy check-in mới nhất cho mỗi key result department tích lũy đến tuần đó, sau đó trung bình)
        $departmentData = [];
        $previousDeptProgress = 0;
        foreach ($weeks as $week) {
            $weekStart = Carbon::parse($week['start']);
            $weekEnd = Carbon::parse($week['end']);
            $cumulativeDeptCheckIns = collect();
            $deptObjectives = $objectives->whereNotNull('department_id');
            if ($deptObjectives->count() > 0) {
                foreach ($deptObjectives as $obj) {
                    foreach ($obj->keyResults as $kr) {
                        $krCheckIns = $kr->checkIns->filter(function($checkIn) use ($chartStartDate, $weekEnd) {
                            return Carbon::parse($checkIn->created_at)->between($chartStartDate, $weekEnd);
                        });
                        $cumulativeDeptCheckIns = $cumulativeDeptCheckIns->merge($krCheckIns);
                    }
                }
            }
            // Nhóm check-ins theo kr_id và lấy check-in mới nhất cho mỗi KR
            $latestPerDeptKr = [];
            foreach ($cumulativeDeptCheckIns->groupBy('kr_id') as $krId => $krCheckIns) {
                $kr = $krMap[$krId] ?? null;
                if (!$kr || ($kr->archived_at && Carbon::parse($kr->archived_at)->lte($weekEnd))) {
                    continue; // Skip if KR is archived before or at weekEnd
                }
                $latestCheckIn = $krCheckIns->sortByDesc('created_at')->first();
                if ($latestCheckIn) {
                    $latestPerDeptKr[] = $latestCheckIn->progress_percent;
                }
            }
            // Trung bình progress của các KR department
            if (count($latestPerDeptKr) > 0) {
                $deptProgress = array_sum($latestPerDeptKr) / count($latestPerDeptKr);
            } else {
                $deptProgress = $previousDeptProgress;
            }
            $departmentData[] = round($deptProgress, 1);
            $previousDeptProgress = $deptProgress;
        }

        // Tính target progress (linear từ 0% đến 100% qua toàn bộ cycle)
        $targetData = [];
        $totalDays = $cycleStart->diffInDays($cycleEnd);
        $elapsedDaysFromStart = $chartStartDate->diffInDays($cycleStart);

        foreach ($weeks as $index => $week) {
            $weekStart = Carbon::parse($week['start']);
            $daysFromCycleStart = $cycleStart->diffInDays($weekStart);
            $targetProgress = $totalDays > 0 ? min(100, max(0, ($daysFromCycleStart / $totalDays) * 100)) : 0;
            $targetData[] = round($targetProgress, 1);
        }

        // Kiểm tra cảnh báo: nếu actual < target trong tuần gần nhất
        $latestActual = end($actualData);
        $latestTarget = end($targetData);
        $isBehind = $latestActual < $latestTarget;

        return response()->json([
            'weeks' => array_column($weeks, 'label'),
            'actual' => $actualData,
            'target' => $targetData,
            'department' => $departmentData,
            'isBehind' => $isBehind,
            'currentProgress' => $latestActual,
            'targetProgress' => $latestTarget,
            'cycle' => [
                'name' => $cycle->cycle_name,
                'start' => $cycle->start_date,
                'end' => $cycle->end_date,
                'objectivesCount' => $totalKrs
            ]
        ]);
    }
}