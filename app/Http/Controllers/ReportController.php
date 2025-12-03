<?php

namespace App\Http\Controllers;

use App\Models\Objective;
use App\Models\Department;
use App\Models\Cycle;
use App\Models\CheckIn;
use App\Models\KeyResult;
use App\Models\User;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    protected $reportService;

    public function __construct(ReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /**
     * Trang báo cáo cho quản lý (render React app).
     */
    public function index()
    {
        return view('app');
    }

    /**
     * Lấy danh sách chu kỳ (ưu tiên chu kỳ hiện tại nếu có).
     */
    public function getCycles(Request $request)
    {
        $cycles = Cycle::query()
            ->orderByDesc('start_date')
            ->get(['cycle_id', 'cycle_name', 'start_date', 'end_date', 'status']);

        $defaultCycle = $this->resolveCycle($request->integer('cycle_id'));

        return response()->json([
            'success' => true,
            'data' => $cycles,
            'meta' => [
                'default_cycle_id' => $defaultCycle?->cycle_id,
                'default_cycle_name' => $defaultCycle?->cycle_name,
            ],
        ]);
    }

    /**
     * Báo cáo "Nhóm của tôi" cho Manager/Admin.
     */
    public function getMyTeamReport(Request $request)
    {
        /** @var User $user */
        $user = $request->user();
        $department = $user?->department;
        
        if (!$department) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được gán vào phòng ban/đội nhóm nên không thể xem báo cáo.',
            ], 422);
        }

        $cycle = $this->resolveCycle($request->integer('cycle_id'));
        if (!$cycle) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy chu kỳ phù hợp.',
            ], 404);
        }

        // Sử dụng Service để tính toán dữ liệu
        $reportData = $this->reportService->getTeamPerformance(
            $department->department_id, 
            $cycle->cycle_id
        );

        return response()->json([
            'success' => true,
            'department_name' => $department->d_name,
            'cycle' => [
                'cycle_id' => $cycle->cycle_id,
                'cycle_name' => $cycle->cycle_name,
            ],
            'data' => $reportData,
        ]);
    }

    /**
     * Biểu đồ xu hướng tiến độ của nhóm theo tuần.
     */
    public function getTeamProgressTrend(Request $request)
    {
        /** @var User $user */
        $user = $request->user();
        if (!$user?->department_id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa được gán phòng ban/đội nhóm.',
            ], 422);
        }

        $cycle = $this->resolveCycle($request->integer('cycle_id'));
        if (!$cycle) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy chu kỳ phù hợp.',
            ], 404);
        }

        $trend = CheckIn::query()
            ->select([
                DB::raw("DATE_FORMAT(check_ins.created_at, '%Y-%u') as bucket"),
                DB::raw('AVG(check_ins.progress_percent) as avg_progress'),
            ])
            ->join('key_results as kr', 'kr.kr_id', '=', 'check_ins.kr_id')
            ->join('objectives as obj', 'obj.objective_id', '=', 'kr.objective_id')
            ->where('obj.department_id', $user->department_id)
            ->where('obj.cycle_id', $cycle->cycle_id)
            ->whereNotNull('check_ins.progress_percent')
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(fn ($row) => [
                'bucket' => $row->bucket,
                'avg_progress' => $this->clampProgress((float) $row->avg_progress),
            ]);

        return response()->json([
            'success' => true,
            'department_name' => optional($user->department)->d_name,
            'cycle' => [
                'cycle_id' => $cycle->cycle_id,
                'cycle_name' => $cycle->cycle_name,
            ],
            'data' => $trend,
        ]);
    }

    /**
     * Chọn chu kỳ ưu tiên: tham số -> hiện tại -> gần nhất.
     */
    protected function resolveCycle(?int $cycleId = null): ?Cycle
    {
        if ($cycleId) {
            return Cycle::find($cycleId);
        }

        $now = now();
        $current = Cycle::where('start_date', '<=', $now)
            ->where('end_date', '>=', $now)
            ->orderByDesc('start_date')
            ->first();

        if ($current) {
            return $current;
        }

        return Cycle::orderByDesc('start_date')->first();
    }

    /**
     * Chuẩn hóa tiến độ về 0 - 100 với 2 chữ số thập phân.
     */
    protected function clampProgress(?float $value): float
    {
        if ($value === null || !is_finite($value)) {
            return 0.0;
        }

        return (float) round(max(0, min(100, $value)), 2);
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
     * Enhanced OKR company report with filters and trend/risk breakdowns.
     */
    public function companyOkrReport(Request $request)
    {
        $cycleId = $request->integer('cycle_id');
        $departmentId = $request->integer('department_id');
        $status = $request->string('status')->toString(); // on_track | at_risk | off_track
        $ownerId = $request->integer('owner_id');

        // Determine current cycle if missing
        if (!$cycleId) {
            $now = now();
            $currentCycle = Cycle::where('start_date', '<=', $now)
                ->where('end_date', '>=', $now)
                ->first();
            if ($currentCycle) {
                $cycleId = (int) $currentCycle->cycle_id;
            }
        }

        // Base objectives with optional filters
        $objectivesQuery = Objective::query()
            ->select(['objective_id','obj_title','department_id','cycle_id','progress_percent','user_id'])
            ->when($cycleId, fn ($q) => $q->where('cycle_id', $cycleId))
            ->when($departmentId, fn ($q) => $q->where('department_id', $departmentId))
            ->when($ownerId, fn ($q) => $q->where('user_id', $ownerId));

        $objectives = $objectivesQuery->get();

        // Compute progress per objective from live KRs (real-time)
        $objectiveIds = $objectives->pluck('objective_id');
        $krAgg = DB::table('key_results')
            ->select('objective_id',
                DB::raw('AVG(CASE WHEN progress_percent IS NOT NULL THEN progress_percent ELSE CASE WHEN target_value IS NOT NULL AND target_value > 0 THEN LEAST(100, GREATEST(0, (current_value/target_value)*100)) ELSE 0 END END) as avg_progress')
            )
            ->whereIn('objective_id', $objectiveIds)
            ->groupBy('objective_id')
            ->pluck('avg_progress', 'objective_id');

        $objectiveProgress = $objectives->map(function ($obj) use ($krAgg) {
            $avgFromKrs = $krAgg[$obj->objective_id] ?? null;
            $progress = $avgFromKrs !== null ? (float) $avgFromKrs : (float) ($obj->progress_percent ?? 0.0);
            $computedStatus = $progress >= 70 ? 'on_track' : ($progress >= 40 ? 'at_risk' : 'off_track');
            return [
                'objective_id' => (int) $obj->objective_id,
                'objective_title' => (string) ($obj->obj_title ?? ''),
                'department_id' => $obj->department_id ? (int) $obj->department_id : null,
                'user_id' => $obj->user_id ? (int) $obj->user_id : null,
                'progress' => (float) round((float) $progress, 2),
                'status' => $computedStatus,
            ];
        });

        // Filter by computed status if requested
        if (in_array($status, ['on_track','at_risk','off_track'], true)) {
            $objectiveProgress = $objectiveProgress->where('status', $status)->values();
        }

        $totalObjectives = $objectiveProgress->count();
        $overall = (float) round($objectiveProgress->avg('progress') ?? 0, 2);

        $onTrackCount = $objectiveProgress->where('status', 'on_track')->count();
        $atRiskCount = $objectiveProgress->where('status', 'at_risk')->count();
        $offTrackCount = $objectiveProgress->where('status', 'off_track')->count();

        $statusDistribution = [
            'onTrack' => $totalObjectives ? round($onTrackCount * 100 / $totalObjectives, 2) : 0,
            'atRisk' => $totalObjectives ? round($atRiskCount * 100 / $totalObjectives, 2) : 0,
            'offTrack' => $totalObjectives ? round($offTrackCount * 100 / $totalObjectives, 2) : 0,
        ];
        $statusCounts = [
            'onTrack' => $onTrackCount,
            'atRisk' => $atRiskCount,
            'offTrack' => $offTrackCount,
        ];

        // Department details with trend vs previous cycle
        $deptGrouped = $objectiveProgress->groupBy('department_id');
        $deptIds = $deptGrouped->keys()->filter()->values();
        $allDeptRecords = Department::whereIn('department_id', $deptIds)
            ->get(['department_id','d_name','type','parent_department_id']);
        $deptNames = $allDeptRecords->pluck('d_name', 'department_id');

        // Previous cycle for trend
        $prevCycleAvgByDept = [];
        if ($cycleId) {
            $currentCycle = Cycle::find($cycleId);
            if ($currentCycle) {
                $prevCycle = Cycle::where('end_date', '<', $currentCycle->start_date)
                    ->orderBy('end_date', 'desc')
                    ->first();
                if ($prevCycle) {
                    $prevObjs = Objective::query()
                        ->select(['objective_id','department_id','progress_percent'])
                        ->where('cycle_id', $prevCycle->cycle_id)
                        ->when($departmentId, fn ($q) => $q->where('department_id', $departmentId))
                        ->get();
                    $tmp = $prevObjs->map(function ($obj) {
                        $p = $obj->progress_percent;
                        if ($p === null) $p = 0.0;
                        return [
                            'department_id' => $obj->department_id ? (int) $obj->department_id : null,
                            'progress' => (float) $p,
                        ];
                    })->groupBy('department_id');
                    foreach ($tmp as $deptIdKey => $items) {
                        $prevCycleAvgByDept[(int) $deptIdKey] = round(collect($items)->avg('progress') ?? 0, 2);
                    }
                }
            }
        }

        $departments = [];
        $departmentsHierarchy = [];

        // Build top-level and teams metrics
        $deptInfoById = $allDeptRecords->keyBy('department_id');
        $topLevelAgg = [];
        $teamsAgg = [];
        foreach ($deptGrouped as $deptIdKey => $items) {
            $deptIdInt = $deptIdKey ? (int) $deptIdKey : null;
            $avg = (float) round(collect($items)->avg('progress') ?? 0, 2);
            $count = collect($items)->count();
            $on = collect($items)->where('status','on_track')->count();
            $risk = collect($items)->where('status','at_risk')->count();
            $off = collect($items)->where('status','off_track')->count();
            $prevAvg = $deptIdInt && isset($prevCycleAvgByDept[$deptIdInt]) ? (float) $prevCycleAvgByDept[$deptIdInt] : null;
            $trendDelta = $prevAvg !== null ? round($avg - $prevAvg, 2) : null;

            $row = [
                'departmentId' => $deptIdInt,
                'departmentName' => $deptIdInt ? ($deptNames[$deptIdInt] ?? 'N/A') : 'Công ty',
                'count' => $count,
                'averageProgress' => $avg,
                'onTrack' => $on,
                'atRisk' => $risk,
                'offTrack' => $off,
                'onTrackPct' => $count ? round($on * 100 / $count, 2) : 0,
                'atRiskPct' => $count ? round($risk * 100 / $count, 2) : 0,
                'offTrackPct' => $count ? round($off * 100 / $count, 2) : 0,
                'trendDelta' => $trendDelta,
            ];
            $departments[] = $row;

            // Hierarchy aggregation
            $deptRec = $deptInfoById->get($deptIdInt);
            $parentId = $deptRec && $deptRec->parent_department_id ? (int) $deptRec->parent_department_id : null;
            $isTeam = $deptRec && $deptRec->type === 'đội nhóm' && $parentId;
            $topKey = $isTeam ? $parentId : $deptIdInt;
            if (!isset($topLevelAgg[$topKey])) {
                $topLevelAgg[$topKey] = [
                    'departmentId' => $topKey,
                    'departmentName' => $topKey ? ($deptNames[$topKey] ?? 'N/A') : 'Công ty',
                    'count' => 0,'averageProgressSum' => 0,'averageProgressDen' => 0,
                    'onTrack' => 0,'atRisk' => 0,'offTrack' => 0,
                    'trendDeltaSum' => 0,'trendDeltaDen' => 0,
                    'children' => [],
                ];
            }
            // Add to top-level agg
            $top = &$topLevelAgg[$topKey];
            $top['count'] += $count;
            $top['onTrack'] += $on; $top['atRisk'] += $risk; $top['offTrack'] += $off;
            $top['averageProgressSum'] += $avg; $top['averageProgressDen'] += 1;
            if ($trendDelta !== null) { $top['trendDeltaSum'] += $trendDelta; $top['trendDeltaDen'] += 1; }

            if ($isTeam) {
                $top['children'][] = $row + ['teamId' => $deptIdInt, 'teamName' => $row['departmentName']];
            }
            unset($top);
        }

        // Normalize top-level averages
        foreach ($topLevelAgg as $k => $agg) {
            $avgProg = $agg['averageProgressDen'] ? round($agg['averageProgressSum'] / $agg['averageProgressDen'], 2) : 0.0;
            $trendDelta = $agg['trendDeltaDen'] ? round($agg['trendDeltaSum'] / $agg['trendDeltaDen'], 2) : null;
            $count = max(1, (int) $agg['count']);
            $departmentsHierarchy[] = [
                'departmentId' => $agg['departmentId'],
                'departmentName' => $agg['departmentName'],
                'count' => (int) $agg['count'],
                'averageProgress' => $avgProg,
                'onTrack' => (int) $agg['onTrack'],
                'atRisk' => (int) $agg['atRisk'],
                'offTrack' => (int) $agg['offTrack'],
                'onTrackPct' => round($agg['onTrack'] * 100 / $count, 2),
                'atRiskPct' => round($agg['atRisk'] * 100 / $count, 2),
                'offTrackPct' => round($agg['offTrack'] * 100 / $count, 2),
                'trendDelta' => $trendDelta,
                'children' => array_map(function ($child) {
                    return [
                        'departmentId' => $child['departmentId'],
                        'departmentName' => $child['departmentName'],
                        'count' => $child['count'],
                        'averageProgress' => $child['averageProgress'],
                        'onTrack' => $child['onTrack'],
                        'atRisk' => $child['atRisk'],
                        'offTrack' => $child['offTrack'],
                        'onTrackPct' => $child['onTrackPct'],
                        'atRiskPct' => $child['atRiskPct'],
                        'offTrackPct' => $child['offTrackPct'],
                        'trendDelta' => $child['trendDelta'],
                    ];
                }, $agg['children']),
            ];
        }
        foreach ($deptGrouped as $deptIdKey => $items) {
            $deptIdInt = $deptIdKey ? (int) $deptIdKey : null;
            $avg = (float) round(collect($items)->avg('progress') ?? 0, 2);
            $count = collect($items)->count();
            $on = collect($items)->where('status','on_track')->count();
            $risk = collect($items)->where('status','at_risk')->count();
            $off = collect($items)->where('status','off_track')->count();
            $prevAvg = $deptIdInt && isset($prevCycleAvgByDept[$deptIdInt]) ? (float) $prevCycleAvgByDept[$deptIdInt] : null;
            $trendDelta = $prevAvg !== null ? round($avg - $prevAvg, 2) : null;
            $departments[] = [
                'departmentId' => $deptIdInt,
                'departmentName' => $deptIdInt ? ($deptNames[$deptIdInt] ?? 'N/A') : 'Công ty',
                'count' => $count,
                'averageProgress' => $avg,
                'onTrack' => $on,
                'atRisk' => $risk,
                'offTrack' => $off,
                'onTrackPct' => $count ? round($on * 100 / $count, 2) : 0,
                'atRiskPct' => $count ? round($risk * 100 / $count, 2) : 0,
                'offTrackPct' => $count ? round($off * 100 / $count, 2) : 0,
                'trendDelta' => $trendDelta,
            ];
        }

        // Trend over time: weekly average progress_percent from check_ins grouped by KR of filtered objectives
        $trend = [];
        if ($cycleId) {
            $krIds = DB::table('key_results as kr')
                ->join('objectives as obj', 'obj.objective_id', '=', 'kr.objective_id')
                ->when($departmentId, fn ($q) => $q->where('obj.department_id', $departmentId))
                ->when($ownerId, fn ($q) => $q->where('obj.user_id', $ownerId))
                ->where('obj.cycle_id', $cycleId)
                ->pluck('kr.kr_id');
            if ($krIds->count() > 0) {
                $checkIns = CheckIn::query()
                    ->select(DB::raw("DATE_FORMAT(created_at, '%Y-%u') as year_week"), DB::raw('AVG(progress_percent) as avg_progress'))
                    ->whereIn('kr_id', $krIds)
                    ->groupBy('year_week')
                    ->orderBy('year_week')
                    ->get();
                $trend = $checkIns->map(fn ($r) => [
                    'bucket' => $r->year_week,
                    'avgProgress' => (float) round((float) $r->avg_progress, 2),
                ])->all();
            }
        }

        // Risk section: objectives with low progress
        $riskObjectives = $objectiveProgress
            ->filter(fn ($o) => $o['status'] === 'at_risk' || $o['status'] === 'off_track' || $o['progress'] < 50)
            ->sortBy('progress')
            ->take(5)
            ->values()
            ->all();

        $json = response()->json([
            'success' => true,
            'data' => [
                'overall' => [
                    'totalObjectives' => $totalObjectives,
                    'averageProgress' => $overall,
                    'statusCounts' => $statusCounts,
                    'statusDistribution' => $statusDistribution,
                ],
                'departments' => $departments,
                'departmentsHierarchy' => $departmentsHierarchy,
                'trend' => $trend,
                'risks' => $riskObjectives,
            ],
            'meta' => [
                'cycleId' => $cycleId,
                'departmentId' => $departmentId,
                'ownerId' => $ownerId,
                'status' => $status ?: null,
                'computedAt' => now()->toISOString(),
            ],
        ]);
        return $json->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    /**
     * Export CSV for OKR company report (Excel-friendly).
     */
    public function exportCompanyOkrCsv(Request $request): StreamedResponse
    {
        $response = $this->companyOkrReport($request);
        $payload = $response->getData(true);
        $rows = [];
        $rows[] = ['Department','Count','Avg Progress','On Track','At Risk','Off Track','On%','At%','Off%','Trend Δ'];
        foreach ($payload['data']['departments'] as $d) {
            $rows[] = [
                $d['departmentName'],
                $d['count'],
                $d['averageProgress'],
                $d['onTrack'],
                $d['atRisk'],
                $d['offTrack'],
                $d['onTrackPct'],
                $d['atRiskPct'],
                $d['offTrackPct'],
                $d['trendDelta'] ?? '',
            ];
        }

        $callback = function () use ($rows) {
            $handle = fopen('php://output', 'w');
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        };

        $filename = 'okr_company_report_' . now()->format('Ymd_His') . '.csv';
        return response()->streamDownload($callback, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}


