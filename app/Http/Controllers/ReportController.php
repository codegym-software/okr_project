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
use Illuminate\Support\Facades\URL;
use Spatie\Browsershot\Browsershot;
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

    /**
     * Export PDF for OKR company report (image-based PDF like Canva)
     */
    public function exportCompanyOkrPdf(Request $request)
    {
        $cycleId = $request->integer('cycle_id');
        $departmentId = $request->integer('department_id');
        $status = $request->string('status');
        $ownerId = $request->integer('owner_id');

        // Get report data
        $response = $this->companyOkrReport($request);
        $payload = $response->getData(true);
        
        // Get cycle info
        $cycle = $cycleId ? Cycle::find($cycleId) : null;
        $cycleName = $cycle ? $cycle->cycle_name : 'Tất cả chu kỳ';

        // Generate HTML for PDF
        $html = view('reports.company-okr-pdf', [
            'data' => $payload['data'],
            'cycleName' => $cycleName,
            'generatedAt' => now()->format('d/m/Y H:i'),
        ])->render();

        try {
            // Generate PDF as image-based using browsershot
            $browsershot = Browsershot::html($html)
                ->format('A4')
                ->margins(10, 10, 10, 10, 'mm')
                ->showBackground()
                ->waitUntilNetworkIdle()
                ->timeout(120);
            
            // Set node binary path (Windows)
            $nodePath = 'E:\\node\\node.exe';
            if (file_exists($nodePath)) {
                $browsershot->setNodeBinary($nodePath);
            }
            
            // Set npm binary path (Windows)
            $npmPath = 'E:\\node\\npm.cmd';
            if (file_exists($npmPath)) {
                $browsershot->setNpmBinary($npmPath);
            }
            
            $pdf = $browsershot->pdf();

            $filename = 'bao_cao_okr_' . now()->format('Ymd_His') . '.pdf';
            
            return response($pdf, 200)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
        } catch (\Exception $e) {
            // Log detailed error
            \Log::error('PDF generation failed', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            
            // Return JSON error for API calls (always return JSON for API endpoints)
            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo PDF. Lỗi: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getMessage() : 'Lỗi khi tạo PDF. Vui lòng thử lại sau.',
                'trace' => config('app.debug') ? $e->getTraceAsString() : null,
            ], 500);
            
            // Fallback to HTML if browsershot fails
            return response($html)
                ->header('Content-Type', 'text/html; charset=UTF-8')
                ->header('Content-Disposition', 'inline; filename="bao_cao_okr_' . now()->format('Ymd_His') . '.html"');
        }
    }

    /**
     * Lấy OKR chi tiết theo từng phòng ban cho báo cáo cuối kỳ
     */
    public function getOkrsByDepartment(Request $request)
    {
        $cycleId = $request->integer('cycle_id');
        $departmentId = $request->integer('department_id');

        $objectivesQuery = Objective::query()
            ->with(['cycle', 'department', 'user'])
            ->when($cycleId, fn($q) => $q->where('cycle_id', $cycleId))
            ->when($departmentId, fn($q) => $q->where('department_id', $departmentId))
            ->whereIn('level', ['company', 'unit']);

        $objectives = $objectivesQuery->get();

        // Load key results
        $objectiveIds = $objectives->pluck('objective_id');
        $keyResults = KeyResult::whereIn('objective_id', $objectiveIds)
            ->whereNull('archived_at')
            ->with(['assignedUser', 'assignee'])
            ->get()
            ->groupBy('objective_id');

        // Group by department
        $okrsByDepartment = $objectives->groupBy('department_id')->map(function($deptObjectives, $deptId) use ($keyResults) {
            return $deptObjectives->map(function($obj) use ($keyResults) {
                $krs = $keyResults->get($obj->objective_id, collect());
                
                // Tính tiến độ trung bình
                $totalProgress = 0;
                $krCount = $krs->count();
                
                foreach ($krs as $kr) {
                    $progress = $kr->progress_percent ?? 0;
                    if ($kr->target_value && $kr->target_value > 0) {
                        $calculatedProgress = ($kr->current_value / $kr->target_value) * 100;
                        $progress = $kr->progress_percent ?? min(100, max(0, $calculatedProgress));
                    }
                    $totalProgress += $progress;
                }
                
                $avgProgress = $krCount > 0 ? round($totalProgress / $krCount, 2) : 0;
                
                // Xác định trạng thái
                $overallStatus = 'not_started';
                if ($avgProgress >= 100) {
                    $overallStatus = 'completed';
                } elseif ($avgProgress >= 70) {
                    $overallStatus = 'in_progress';
                } elseif ($avgProgress >= 40) {
                    $overallStatus = 'at_risk';
                } else {
                    $overallStatus = 'at_risk';
                }

                return [
                    'objective_id' => $obj->objective_id,
                    'objective_title' => $obj->obj_title,
                    'objective_description' => $obj->description,
                    'owner_name' => $obj->user->full_name ?? 'N/A',
                    'cycle_name' => $obj->cycle->cycle_name ?? 'N/A',
                    'overall_progress' => $avgProgress,
                    'overall_status' => $overallStatus,
                    'key_results' => $krs->map(function($kr) {
                        $krProgress = $kr->progress_percent ?? 0;
                        if ($kr->target_value && $kr->target_value > 0) {
                            $calculatedProgress = ($kr->current_value / $kr->target_value) * 100;
                            $krProgress = $kr->progress_percent ?? min(100, max(0, $calculatedProgress));
                        }
                        
                        $assigneeUser = $kr->assignedUser ?? $kr->assignee ?? null;
                        
                        return [
                            'kr_id' => $kr->kr_id,
                            'kr_title' => $kr->kr_title,
                            'current_value' => $kr->current_value ?? 0,
                            'target_value' => $kr->target_value,
                            'progress_percent' => round($krProgress, 2),
                            'unit' => $kr->unit,
                            'assignee' => $assigneeUser ? [
                                'user_id' => $assigneeUser->user_id,
                                'full_name' => $assigneeUser->full_name,
                            ] : null,
                        ];
                    })->values(),
                ];
            })->values();
        });

        // Format response
        $result = [];
        foreach ($okrsByDepartment as $deptId => $okrs) {
            $dept = Department::find($deptId);
            $result[] = [
                'department_id' => $deptId,
                'department_name' => $dept ? $dept->d_name : 'N/A',
                'okrs' => $okrs,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Tạo snapshot báo cáo từ dữ liệu hiện tại
     */
    public function createSnapshot(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Người dùng chưa đăng nhập.',
            ], 401);
        }

        $reportType = $request->input('report_type'); // 'team', 'manager', 'company'
        $cycleId = $request->input('cycle_id') ? (int)$request->input('cycle_id') : null;
        $departmentId = $request->input('department_id') ? (int)$request->input('department_id') : null;
        $reportName = $request->input('report_name') ?? '';
        $notes = $request->input('notes') ?? '';

        // Validate report type
        if (!in_array($reportType, ['team', 'manager', 'company'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Loại báo cáo không hợp lệ.',
            ], 422);
        }

        // Validate cycle_id
        if (!$cycleId) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng chọn chu kỳ.',
            ], 422);
        }

        // Lấy dữ liệu báo cáo hiện tại dựa trên loại
        $snapshotData = null;
        
        try {
            if ($reportType === 'team') {
                // Báo cáo nhóm
                $tempRequest = new Request(['cycle_id' => $cycleId]);
                $tempRequest->setUserResolver(fn() => $user);
                $response = $this->getMyTeamReport($tempRequest);
                $snapshotData = $response->getData(true);
            } elseif ($reportType === 'manager') {
                // Báo cáo phòng ban (Manager)
                $tempRequest = new Request([
                    'cycle_id' => $cycleId,
                    'member_id' => $request->input('member_id'),
                    'status' => $request->input('status'),
                    'objective_id' => $request->input('objective_id'),
                ]);
                $tempRequest->setUserResolver(fn() => $user);
                // Gọi API manager report
                $snapshotData = $this->getManagerReportData($tempRequest);
            } elseif ($reportType === 'company') {
                // Báo cáo công ty
                $tempRequest = new Request([
                    'cycle_id' => $cycleId,
                    'department_id' => $departmentId,
                    'status' => $request->input('status'),
                    'owner_id' => $request->input('owner_id'),
                ]);
                $tempRequest->setUserResolver(fn() => $user);
                $response = $this->companyOkrReport($tempRequest);
                $snapshotData = $response->getData(true);
            }

            if (!$snapshotData || !isset($snapshotData['success']) || !$snapshotData['success']) {
                \Log::error('Invalid snapshot data', [
                    'report_type' => $reportType,
                    'snapshot_data' => $snapshotData,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể tạo snapshot. Dữ liệu báo cáo không hợp lệ: ' . ($snapshotData['message'] ?? 'Unknown error'),
                ], 422);
            }

            // Tạo báo cáo snapshot
            try {
                $report = Report::create([
                    'report_type' => $reportType,
                    'report_name' => $reportName ?: $this->generateDefaultReportName($reportType, $cycleId),
                    'snapshot_data' => $snapshotData,
                    'user_id' => $user->user_id,
                    'cycle_id' => $cycleId,
                    'department_id' => $departmentId ?: null,
                    'notes' => $notes ?: null,
                ]);
            } catch (\Illuminate\Database\QueryException $e) {
                \Log::error('Database error creating report: ' . $e->getMessage(), [
                    'sql' => $e->getSql(),
                    'bindings' => $e->getBindings(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Lỗi database khi tạo báo cáo. Có thể bảng chưa được tạo. Vui lòng chạy migration.',
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo snapshot báo cáo thành công.',
                'data' => [
                    'report_id' => $report->report_id,
                    'report_name' => $report->report_name,
                    'report_type' => $report->report_type,
                    'created_at' => $report->created_at->toISOString(),
                    'creator' => [
                        'user_id' => $user->user_id,
                        'full_name' => $user->full_name,
                        'email' => $user->email,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Error creating snapshot: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'report_type' => $reportType,
                'cycle_id' => $cycleId,
                'user_id' => $user->user_id ?? null,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tạo snapshot: ' . $e->getMessage(),
                'debug' => config('app.debug') ? $e->getTraceAsString() : null,
            ], 500);
        }
    }

    /**
     * Lấy dữ liệu báo cáo Manager (helper method)
     */
    protected function getManagerReportData(Request $request)
    {
        try {
            // Gọi ReportManagerController để lấy dữ liệu
            $managerController = new \App\Http\Controllers\ReportManagerController();
            
            // Đảm bảo request có user resolver - luôn set lại để đảm bảo
            $user = auth()->user();
            $request->setUserResolver(fn() => $user);
            
            $response = $managerController->getTeamOkrs($request);
            $data = $response->getData(true);
            
            // Trả về structure tương thích
            return $data;
        } catch (\Exception $e) {
            \Log::error('Error getting manager report data: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return [
                'success' => false,
                'message' => 'Lỗi khi lấy dữ liệu báo cáo: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Tạo tên báo cáo mặc định
     */
    protected function generateDefaultReportName(string $type, ?int $cycleId): string
    {
        $typeNames = [
            'team' => 'Báo cáo nhóm',
            'manager' => 'Báo cáo phòng ban',
            'company' => 'Báo cáo công ty',
        ];
        
        $baseName = $typeNames[$type] ?? 'Báo cáo';
        
        if ($cycleId) {
            $cycle = Cycle::find($cycleId);
            if ($cycle) {
                return $baseName . ' - ' . $cycle->cycle_name;
            }
        }
        
        return $baseName . ' - ' . now()->format('d/m/Y H:i');
    }

    /**
     * Lấy danh sách báo cáo đã tạo (timeline)
     */
    public function getReportsList(Request $request)
    {
        $user = $request->user();
        $reportType = $request->input('report_type');
        $cycleId = $request->input('cycle_id') ? (int)$request->input('cycle_id') : null;
        $limit = $request->input('limit') ? (int)$request->input('limit') : 50;

        $query = Report::query()
            ->with(['creator', 'cycle', 'department'])
            ->orderByDesc('created_at');

        // Lọc theo loại báo cáo
        if ($reportType && in_array($reportType, ['team', 'manager', 'company'], true)) {
            $query->where('report_type', $reportType);
        }

        // Lọc theo chu kỳ
        if ($cycleId) {
            $query->where('cycle_id', $cycleId);
        }

        // Nếu không phải admin/CEO, chỉ xem báo cáo của mình hoặc phòng ban mình
        if (!$user->is_admin && strtolower($user->role->role_name ?? '') !== 'ceo') {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->user_id)
                  ->orWhere('department_id', $user->department_id);
            });
        }

        $reports = $query->limit($limit)->get();

        return response()->json([
            'success' => true,
            'data' => $reports->map(function ($report) {
                return [
                    'report_id' => $report->report_id,
                    'report_type' => $report->report_type,
                    'report_name' => $report->report_name,
                    'created_at' => $report->created_at->toISOString(),
                    'created_at_formatted' => $report->created_at->format('d/m/Y H:i'),
                    'creator' => [
                        'user_id' => $report->creator->user_id ?? null,
                        'full_name' => $report->creator->full_name ?? 'N/A',
                        'email' => $report->creator->email ?? null,
                    ],
                    'cycle' => $report->cycle ? [
                        'cycle_id' => $report->cycle->cycle_id,
                        'cycle_name' => $report->cycle->cycle_name,
                        'start_date' => $report->cycle->start_date,
                        'end_date' => $report->cycle->end_date,
                    ] : null,
                    'department' => $report->department ? [
                        'department_id' => $report->department->department_id,
                        'department_name' => $report->department->d_name,
                    ] : null,
                    'notes' => $report->notes,
                ];
            }),
        ]);
    }

    /**
     * Xem chi tiết một báo cáo snapshot
     */
    public function getReportSnapshot(Request $request, int $reportId)
    {
        $user = $request->user();
        
        $report = Report::with(['creator', 'cycle', 'department'])->find($reportId);
        
        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy báo cáo.',
            ], 404);
        }

        // Kiểm tra quyền xem
        if (!$user->is_admin && strtolower($user->role->role_name ?? '') !== 'ceo') {
            if ($report->user_id !== $user->user_id && $report->department_id !== $user->department_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền xem báo cáo này.',
                ], 403);
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'report_id' => $report->report_id,
                'report_type' => $report->report_type,
                'report_name' => $report->report_name,
                'snapshot_data' => $report->snapshot_data,
                'created_at' => $report->created_at->toISOString(),
                'created_at_formatted' => $report->created_at->format('d/m/Y H:i'),
                'creator' => [
                    'user_id' => $report->creator->user_id ?? null,
                    'full_name' => $report->creator->full_name ?? 'N/A',
                    'email' => $report->creator->email ?? null,
                ],
                'cycle' => $report->cycle ? [
                    'cycle_id' => $report->cycle->cycle_id,
                    'cycle_name' => $report->cycle->cycle_name,
                ] : null,
                'department' => $report->department ? [
                    'department_id' => $report->department->department_id,
                    'department_name' => $report->department->d_name,
                ] : null,
                'notes' => $report->notes,
            ],
        ]);
    }

    /**
     * Xóa một báo cáo snapshot
     */
    public function deleteReport(Request $request, int $reportId)
    {
        $user = $request->user();
        
        $report = Report::find($reportId);
        
        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy báo cáo.',
            ], 404);
        }

        // Chỉ người tạo, admin hoặc CEO mới được xóa
        if ($report->user_id !== $user->user_id && !$user->is_admin && strtolower($user->role->role_name ?? '') !== 'ceo') {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa báo cáo này.',
            ], 403);
        }

        $report->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa báo cáo thành công.',
        ]);
    }
}


