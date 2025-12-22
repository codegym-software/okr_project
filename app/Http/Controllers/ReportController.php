<?php

namespace App\Http\Controllers;

use App\Models\Objective;
use App\Models\Department;
use App\Models\Cycle;
use App\Models\CheckIn;
use App\Models\KeyResult;
use App\Models\User;
use App\Models\OkrLink;
use App\Models\ReportSnapshot;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\Browsershot\Browsershot;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Carbon\Carbon;

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
            'department_id' => $department->department_id,
            'department_name' => $department->d_name,
            'cycle' => [
                'cycle_id' => $cycle->cycle_id,
                'cycle_name' => $cycle->cycle_name,
            ],
            'data' => $reportData,
        ]);
    }

    /**
     * Biểu đồ xu hướng tiến độ tích lũy của nhóm theo tuần.
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

        // 1. Lấy dữ liệu từ bảng Snapshot
        $snapshots = DB::table('report_snapshots_weekly')
            ->where('department_id', $user->department_id)
            ->where('cycle_id', $cycle->cycle_id)
            ->orderBy('year')
            ->orderBy('week_number')
            ->get();

        $trendData = [];
        foreach ($snapshots as $snap) {
            $weekEnd = \Carbon\Carbon::parse($snap->week_end_date);
            $trendData[] = [
                'date' => $weekEnd->format('d/m'),
                'full_date' => $snap->week_end_date,
                'avg_progress' => (float) $snap->avg_progress,
                'okr_count' => (int) $snap->okr_count,
                'week_label' => 'Tuần ' . $snap->week_number,
                'source' => 'snapshot'
            ];
        }

        // 2. Đánh lại nhãn tuần tự (Tuần 1, Tuần 2, ...) bắt đầu từ đầu chu kỳ
        $finalData = [];
        foreach ($trendData as $index => $item) {
            $item['week_name'] = "Tuần " . ($index + 1);
            $finalData[] = $item;
        }

        return response()->json([
            'success' => true,
            'department_name' => optional($user->department)->d_name,
            'cycle' => [
                'cycle_id' => $cycle->cycle_id,
                'cycle_name' => $cycle->cycle_name,
            ],
            'data' => $finalData,
        ]);
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
                // Công thức: O = trung bình cộng của tiến độ KR trực tiếp
                // Chỉ tính từ KeyResults trực tiếp, không archived
                $krs = DB::table('key_results')
                    ->select(['progress_percent'])
                    ->where('objective_id', $obj->objective_id)
                    ->whereNull('archived_at') // Chỉ tính KR chưa archived
                    ->get();
                    
                if ($krs->isEmpty()) {
                    $progress = 0.0;
                } else {
                    $progressList = [];
                    foreach ($krs as $kr) {
                        if ($kr->progress_percent !== null) {
                            $progressList[] = (float) $kr->progress_percent;
                        }
                    }
                    
                    if (empty($progressList)) {
                        $progress = 0.0;
                    } else {
                        $progress = array_sum($progressList) / count($progressList);
                    }
                }
            }
            return [
                'objective_id' => (int) $obj->objective_id,
                'department_id' => $obj->department_id ? (int) $obj->department_id : null,
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
     * Main endpoint for the new Company Statistical Report.
     * Dispatches to different methods based on the requested tab.
     */
        public function companyOkrReport(Request $request)
        {
            $cycle = $this->resolveCycle($request->integer('cycle_id'));
            if (!$cycle) {
                return response()->json(['success' => false, 'message' => 'Không tìm thấy chu kỳ phù hợp.'], 404);
            }
    
            // --- Filters ---
            $departmentId = $request->integer('department_id');
            $level = $request->input('level');
            $dateRange = [
                'start' => $request->input('start_date'),
                'end' => $request->input('end_date'),
            ];
    
            $meta = [
                'cycleId' => $cycle->cycle_id,
                'cycleName' => $cycle->cycle_name,
                'computedAt' => now()->toISOString(),
                'filters' => [
                    'department_id' => $departmentId,
                    'level' => $level,
                    'date_range' => $dateRange,
                ]
            ];
    
            try {
                // Fetch data for all three tabs, passing filters explicitly
                $performanceData = $this->_getPerformanceReportData($cycle, $departmentId, $level, $dateRange);
                $processData = $this->_getProcessReportData($cycle, $departmentId, $level, $dateRange);
                $qualityData = $this->_getQualityReportData($cycle, $departmentId, $level, $dateRange);
    
                // Combine all tab data into a single structure
                $combinedData = [
                    'performance' => $performanceData,
                    'process' => $processData,
                    'quality' => $qualityData,
                ];
                
                return response()->json([
                    'success' => true,
                    'data' => $combinedData,
                    'meta' => $meta,
                ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    
            } catch (\Exception $e) {
                \Log::error('Company OKR Report Failed', [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'An unexpected error occurred while generating the report.',
                    'error' => config('app.debug') ? $e->getMessage() : 'Internal Server Error',
                ], 500);
            }
        }
    /**
     * Gathers data for the "Quality & Structure" tab.
     */
    private function _getQualityReportData(Cycle $cycle, ?int $departmentId, ?string $level, ?array $dateRange = null)
    {
        try {
            $allObjectivesInCycleQuery = Objective::where('cycle_id', $cycle->cycle_id)
                ->whereNull('archived_at')
                ->when($departmentId, fn($q) => $q->where('department_id', $departmentId))
                ->when($level, fn($q) => $q->where('level', $level));
            
            $allObjectivesInCycle = $allObjectivesInCycleQuery->with('department')->get();
            $allObjectiveIds = $allObjectivesInCycle->pluck('objective_id');
            $allKrsInCycle = KeyResult::whereIn('objective_id', $allObjectiveIds)->whereNull('archived_at')->get();

            // --- STAT CARDS ---
            $totalKrsCount = $allKrsInCycle->count();
            $outcomeKrsCount = $allKrsInCycle->where('type', 'outcome')->count();
            $outcomeKrRate = $totalKrsCount > 0 ? ($outcomeKrsCount / $totalKrsCount) * 100 : 0;

            $totalObjectivesCount = $allObjectivesInCycle->count();
            $aspirationalObjectivesCount = $allObjectivesInCycle->where('is_aspirational', true)->count();
            $aspirationalRate = $totalObjectivesCount > 0 ? ($aspirationalObjectivesCount / $totalObjectivesCount) * 100 : 0;

            $avgKrsPerObjective = $totalObjectivesCount > 0 ? ($totalKrsCount / $totalObjectivesCount) : 0;

            // --- CHARTS ---
            $strategicTagDistribution = $allObjectivesInCycle
                ->flatMap(fn($obj) => $obj->tags ?? [])
                ->filter()
                ->groupBy(fn($tag) => $tag)
                ->map->count();

            $krTypeDistribution = $allKrsInCycle
                ->groupBy('type')
                ->map->count();

            // --- TABLE ---
            $qualityTableData = $allObjectivesInCycle->map(function ($objective) use ($allKrsInCycle, $cycle) {
                $objectiveKrs = $allKrsInCycle->where('objective_id', $objective->objective_id);
                $krCount = $objectiveKrs->count();
                $idealProgress = $this->reportService->getIdealProgress($cycle->start_date, $cycle->end_date);

                return [
                    'objective_id' => $objective->objective_id,
                    'objective_name' => $objective->obj_title,
                    'department_name' => optional($objective->department)->d_name ?? 'N/A',
                    'kr_type_distribution' => [
                        'outcome' => $objectiveKrs->where('type', 'outcome')->count(),
                        'activity' => $objectiveKrs->where('type', 'activity')->count(),
                    ],
                    'is_aspirational' => (bool) $objective->is_aspirational,
                    'kr_count' => $krCount,
                    'strategic_tags' => $objective->tags ?? [],
                    'progress' => $this->clampProgress((float) $objective->progress_percent),
                    'health_status' => $this->reportService->getHealthStatus((float) $objective->progress_percent, $idealProgress),
                    'structural_issues' => $this->_getObjectiveStructuralIssues($krCount),
                ];
            })->sortByDesc(fn($item) => $item['structural_issues'] ? 1 : 0)->values();
            
            return [
                'statCards' => [
                    'outcome_kr_rate' => round($outcomeKrRate, 2),
                    'aspirational_rate' => round($aspirationalRate, 2),
                    'avg_krs_per_objective' => round($avgKrsPerObjective, 2),
                ],
                'charts' => [
                    'strategic_tag_distribution' => $strategicTagDistribution->toArray(),
                    'kr_type_distribution' => $krTypeDistribution->toArray(),
                ],
                'table' => $qualityTableData->toArray(),
            ];
        } catch (\Exception $e) {
            \Log::error('!!! FAILED in _getQualityReportData: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Helper to determine structural issues for an objective based on KR count.
     */
    private function _getObjectiveStructuralIssues(int $krCount): ?string
    {
        if ($krCount === 0) {
            return 'No KRs defined';
        }
        if ($krCount < 2) {
            return 'Too few KRs (<2)';
        }
        if ($krCount > 5) {
            return 'Too many KRs (>5)';
        }
        return null; // No structural issues based on KR count
    }

    /**
     * Gathers data for the "Process Compliance" tab.
     */
    private function _getProcessReportData(Cycle $cycle, ?int $departmentId, ?string $level, ?array $dateRange)
    {
        try {
            $allObjectivesInCycleQuery = Objective::where('cycle_id', $cycle->cycle_id)
                ->whereNull('archived_at')
                ->when($departmentId, fn($q) => $q->where('department_id', $departmentId))
                ->when($level, fn($q) => $q->where('level', $level));

            $allKrsInCycleQuery = KeyResult::whereIn('objective_id', $allObjectivesInCycleQuery->clone()->pluck('objective_id'))->whereNull('archived_at');

            // --- STAT CARDS ---
            $totalKrsCount = $allKrsInCycleQuery->clone()->count();
            $krsWithCheckinCount = $allKrsInCycleQuery->clone()->whereHas('checkIns')->count();
            $checkinRate = $totalKrsCount > 0 ? ($krsWithCheckinCount / $totalKrsCount) * 100 : 0;

            $totalNonCompanyObjectivesQuery = $allObjectivesInCycleQuery->clone()->where('level', '!=', 'company');
            $totalNonCompanyObjectivesCount = $totalNonCompanyObjectivesQuery->count();
            
            $alignedObjectivesCount = OkrLink::whereIn('source_objective_id', $totalNonCompanyObjectivesQuery->pluck('objective_id'))
                ->distinct('source_objective_id')
                ->count();
            
            $alignmentRate = $totalNonCompanyObjectivesCount > 0 ? ($alignedObjectivesCount / $totalNonCompanyObjectivesCount) * 100 : 0;
            
            $totalObjectivesCount = $allObjectivesInCycleQuery->clone()->count();
            $objectivesWithKrsCount = $allObjectivesInCycleQuery->clone()->whereHas('keyResults')->count();
            $setupCompletionRate = $totalObjectivesCount > 0 ? ($objectivesWithKrsCount / $totalObjectivesCount) * 100 : 0;
            
            $totalCheckinsCount = CheckIn::whereIn('kr_id', $allKrsInCycleQuery->clone()->pluck('kr_id'))->count();
            $uniqueUsersWithKrsCount = $allKrsInCycleQuery->clone()->select('user_id')->whereNotNull('user_id')->distinct()->count();
            $avgCheckinsPerUser = $uniqueUsersWithKrsCount > 0 ? $totalCheckinsCount / $uniqueUsersWithKrsCount : 0;

            // --- CHARTS ---
            $departmentsQuery = Department::query();
            if ($departmentId) {
                $departmentsQuery->where('department_id', $departmentId);
            }
            $departments = $departmentsQuery->with(['objectives' => fn($q) => $q->where('cycle_id', $cycle->cycle_id)])->get();
            
            $checkinComplianceByDept = $departments->map(function ($dept) {
                $deptObjectiveIds = $dept->objectives->pluck('objective_id');
                if ($deptObjectiveIds->isEmpty()) return null;

                $totalKrs = KeyResult::whereIn('objective_id', $deptObjectiveIds)->whereNull('archived_at')->count();
                if ($totalKrs === 0) return null;

                $krsWithCheckins = KeyResult::whereIn('objective_id', $deptObjectiveIds)->whereNull('archived_at')->whereHas('checkIns')->count();
                
                return [
                    'department_name' => $dept->d_name,
                    'compliance_rate' => round(($krsWithCheckins / $totalKrs) * 100, 2),
                ];
            })->filter()->sortByDesc('compliance_rate')->values();

            $allObjectives = $allObjectivesInCycleQuery->clone()->get(['status']);
            $idealProgress = $this->reportService->getIdealProgress($cycle->start_date, $cycle->end_date); // Re-add this line
            $healthStatusCounts = [
                'completed' => 0,
                'on_track' => 0,
                'at_risk' => 0,
                'behind' => 0,
            ];

            foreach ($allObjectives as $objective) {
                $status = $objective->status;
                if (isset($healthStatusCounts[$status])) {
                    $healthStatusCounts[$status]++;
                }
            }

            // 3. Chart: Process Compliance (Check-in) Trend (New logic for line chart)
            $processComplianceTrendData = [];

            // Get all KRs within the cycle and filters
            $krsInScope = KeyResult::whereIn('objective_id', $allObjectivesInCycleQuery->clone()->pluck('objective_id'))
                                    ->whereNull('archived_at')
                                    ->pluck('kr_id');
            
            // Total active KRs for the ideal line (assuming each KR should be checked weekly)
            $totalKrsForIdeal = $krsInScope->count();

            // Get all check-ins for these KRs within the cycle and date range
            $allCheckInsForTrend = CheckIn::whereIn('kr_id', $krsInScope);
            if (!empty($dateRange['start']) && !empty($dateRange['end'])) {
                $allCheckInsForTrend->whereBetween('created_at', [Carbon::parse($dateRange['start'])->startOfDay(), Carbon::parse($dateRange['end'])->endOfDay()]);
            }
            $allCheckInsForTrend = $allCheckInsForTrend->get();

            // Group all check-ins by week
            $weeklyCheckinCounts = $allCheckInsForTrend
                ->groupBy(fn($checkin) => Carbon::parse($checkin->created_at)->format('Y-W'))
                ->map(fn($group) => $group->count())
                ->sortKeys();
            
            // Determine the start and end week for the trend
            $trendStartDate = !empty($dateRange['start']) ? Carbon::parse($dateRange['start']) : Carbon::parse($cycle->start_date);
            $trendEndDate = !empty($dateRange['end']) ? Carbon::parse($dateRange['end']) : Carbon::parse($cycle->end_date);
            
            // Generate data points for each week in the range
            $currentWeek = $trendStartDate->copy()->startOfWeek();
            while ($currentWeek->lte($trendEndDate)) {
                $weekBucket = $currentWeek->format('Y-W');
                $processComplianceTrendData[] = [
                    'bucket' => $weekBucket,
                    'week_label' => 'Tuần ' . $currentWeek->weekOfYear,
                    'actual_checkins' => $weeklyCheckinCounts[$weekBucket] ?? 0,
                    'ideal_checkins' => $totalKrsForIdeal, // Simple ideal: all KRs should have 1 checkin per week
                ];
                $currentWeek->addWeek();
            }

            // --- TABLE ---
            $latestCheckins = CheckIn::select('kr_id', DB::raw('MAX(created_at) as last_checkin_date'))
                ->whereIn('kr_id', $allKrsInCycleQuery->clone()->pluck('kr_id'))
                ->groupBy('kr_id')
                ->get()
                ->keyBy('kr_id');

            $okrsForTable = $allObjectivesInCycleQuery->with(['keyResults', 'department', 'user'])->get();

            $processTableData = $okrsForTable->map(function ($objective) use ($latestCheckins, $idealProgress) {
                $objectiveKrs = $objective->keyResults;
                $totalKrs = $objectiveKrs->count();
                $krsWithCheckins = $objectiveKrs->filter(fn($kr) => $kr->checkIns->isNotEmpty())->count();
                $periodicCheckinRate = $totalKrs > 0 ? ($krsWithCheckins / $totalKrs) * 100 : 0;
                
                $lastCheckinDate = null;
                foreach ($objective->keyResults as $kr) {
                    if (isset($latestCheckins[$kr->kr_id])) {
                        $krLastCheckin = Carbon::parse($latestCheckins[$kr->kr_id]->last_checkin_date);
                        if (!$lastCheckinDate || $krLastCheckin->isAfter($lastCheckinDate)) {
                            $lastCheckinDate = $krLastCheckin;
                        }
                    }
                }

                return [
                    'objective_id' => $objective->objective_id,
                    'objective_name' => $objective->obj_title,
                    'department_name' => optional($objective->department)->d_name ?? 'Công ty',
                    'owner_name' => optional($objective->user)->full_name ?? 'N/A',
                    'health_status' => $this->reportService->getHealthStatus((float) $objective->progress_percent, $idealProgress),
                    'last_checkin_date' => $lastCheckinDate ? $lastCheckinDate->toDateString() : null,
                    'days_overdue' => $lastCheckinDate ? (int) floor($lastCheckinDate->diffInDays(now(), false)) : null,
                    'periodic_checkin_rate' => round($periodicCheckinRate, 2),
                ];
            })->sortBy('days_overdue', SORT_REGULAR, true)->values();


            return [
                'statCards' => [
                    'check_in_rate' => round($checkinRate, 2),
                    'alignment_rate' => round($alignmentRate, 2),
                    'setup_completion_rate' => round($setupCompletionRate, 2),
                    'avg_checkins_per_user' => round($avgCheckinsPerUser, 1),
                ],
                'charts' => [
                    'checkin_compliance_by_dept' => $checkinComplianceByDept->toArray(),
                    'health_status_distribution' => $healthStatusCounts,
                    'process_compliance_trend' => $processComplianceTrendData,
                ],
                'table' => $processTableData->toArray(),
            ];
        } catch (\Exception $e) {
            \Log::error('!!! FAILED in _getProcessReportData: ' . $e->getMessage());
            throw $e;
        }
    }


    /**
     * Gathers data for the "Performance" tab.
     */
    private function _getPerformanceReportData(Cycle $cycle, ?int $departmentId, ?string $level, ?array $dateRange)
    {
        // Base query for all objectives in the cycle, already filtered by cycle
        $baseObjectivesQuery = Objective::query()
            ->with(['department:department_id,d_name', 'user:user_id,full_name'])
            ->where('cycle_id', $cycle->cycle_id)
            ->whereNull('archived_at');

        // Apply filters to a clone for department-specific/level-specific calculations
        $filteredObjectivesQuery = $baseObjectivesQuery->clone()
            ->when($departmentId, fn($q) => $q->where('department_id', $departmentId))
            ->when($level, fn($q) => $q->where('level', $level));
        
        $filteredObjectives = $filteredObjectivesQuery->get();

        // Get all company-level objectives for the given cycle (always needed for context)
        $companyObjectives = $baseObjectivesQuery->clone()->where('level', 'company')->get();
        $allObjectivesInCycle = $baseObjectivesQuery->clone()->get();

        // If no data at all, return empty
        if ($allObjectivesInCycle->isEmpty()) {
             return [
                'statCards' => ['avg_company_progress' => 0, 'completed_company_rate' => 0, 'avg_confidence_score' => 0],
                'charts' => ['progress_over_time' => [], 'performance_by_department' => []],
                'table' => [],
            ];
        }

        // 2. Calculate Stat Cards
        $statCardObjectives = ($departmentId || $level) 
            ? $filteredObjectives 
            : ($companyObjectives->isNotEmpty() ? $companyObjectives : $allObjectivesInCycle);

        $avgProgress = (float) $statCardObjectives->avg('progress_percent');
        $completedCount = $statCardObjectives->where('progress_percent', '>=', 70)->count();
        $totalObjectives = $statCardObjectives->count();
        $completedRate = $totalObjectives > 0 ? ($completedCount / $totalObjectives) * 100 : 0;
        
        $statCardObjectiveIds = $statCardObjectives->pluck('objective_id');
        $avgConfidenceScore = 0;
        if($statCardObjectiveIds->isNotEmpty()) {
            $latestCheckInIdsSub = DB::table('check_ins as ci')
                ->select(DB::raw('MAX(ci.check_in_id) as max_id'))
                ->join('key_results as kr', 'ci.kr_id', '=', 'kr.kr_id')
                ->whereIn('kr.objective_id', $statCardObjectiveIds)
                ->whereNotNull('ci.confidence_score')
                ->groupBy('ci.kr_id');
            
            if ($latestCheckInIdsSub->count() > 0) {
                 $avgConfidenceScore = DB::table('check_ins')
                    ->whereIn('check_in_id', $latestCheckInIdsSub)
                    ->avg('confidence_score');
            }
        }

        // 3. Chart Data
        $objectiveIdsForTrend = $companyObjectives->isNotEmpty() ? $companyObjectives->pluck('objective_id') : $allObjectivesInCycle->pluck('objective_id');
        $progressOverTime = $this->_getCompanyProgressTrend($cycle, $objectiveIdsForTrend, $dateRange);
        
        $departmentPerformanceQuery = $allObjectivesInCycle
            ->where('department_id', '!=', null);

        if ($departmentId) {
            $departmentPerformanceQuery = $departmentPerformanceQuery->where('department_id', $departmentId);
        }

        $departmentPerformance = $departmentPerformanceQuery
            ->groupBy('department_id')
            ->map(function ($objectivesInDept, $deptId) {
                $department = $objectivesInDept->first()->department;
                return [
                    'department_id' => $deptId,
                    'department_name' => $department ? $department->d_name : 'N/A',
                    'average_progress' => (float) $objectivesInDept->avg('progress_percent'),
                ];
            })
            ->sortByDesc('average_progress')
            ->values();

        // 4. Table Data
        $tableData = [];
        if ($companyObjectives->isNotEmpty()) {
            $companyObjectiveIds = $companyObjectives->pluck('objective_id');
            $links = OkrLink::whereIn('target_objective_id', $companyObjectiveIds)->get();
            $alignedObjectiveIdsQuery = $links->pluck('source_objective_id');
            $alignedObjectivesQuery = $allObjectivesInCycle->whereIn('objective_id', $alignedObjectiveIdsQuery);

            if ($departmentId) {
                $alignedObjectivesQuery = $alignedObjectivesQuery->where('department_id', $departmentId);
            }
            if ($level) {
                $alignedObjectivesQuery = $alignedObjectivesQuery->where('level', $level);
            }

            $alignedObjectivesByParent = $alignedObjectivesQuery->keyBy('objective_id');
            $childrenByParentId = $links->groupBy('target_objective_id');
            
            $allTableObjectiveIds = $companyObjectiveIds->merge($alignedObjectivesQuery->pluck('objective_id'));
            $allConfidenceScores = collect();
            
            if ($allTableObjectiveIds->isNotEmpty()) {
                $latestCheckinIdsForTable = DB::table('check_ins as ci')
                    ->select(DB::raw('MAX(ci.check_in_id) as max_id'))
                    ->join('key_results as kr', 'ci.kr_id', '=', 'kr.kr_id')
                    ->whereIn('kr.objective_id', $allTableObjectiveIds)
                    ->whereNotNull('ci.confidence_score')
                    ->groupBy('kr.objective_id');

                if ($latestCheckinIdsForTable->count() > 0) {
                    $allConfidenceScores = DB::table('check_ins as ci')
                        ->join('key_results as kr', 'ci.kr_id', '=', 'kr.kr_id')
                        ->whereIn('ci.check_in_id', $latestCheckinIdsForTable)
                        ->select('kr.objective_id', 'ci.confidence_score')
                        ->get()
                        ->keyBy('objective_id');
                }
            }

            $tableData = $companyObjectives->map(function ($companyO) use ($childrenByParentId, $alignedObjectivesByParent, $allConfidenceScores, $cycle, $departmentId, $level) {
                $childLinks = $childrenByParentId->get($companyO->objective_id, collect());
                $children = $childLinks->map(function($link) use ($alignedObjectivesByParent, $allConfidenceScores, $cycle, $companyO) {
                    $childObjective = $alignedObjectivesByParent->get($link->source_objective_id);
                    if ($childObjective) {
                        return $this->_formatObjectiveForTable($childObjective, $allConfidenceScores, $cycle, $companyO);
                    }
                    return null;
                })->filter()->values();

                if (($departmentId || $level) && $children->isEmpty()) {
                    return null;
                }

                return array_merge(
                    $this->_formatObjectiveForTable($companyO, $allConfidenceScores, $cycle),
                    ['children' => $children->toArray()]
                );
            })->filter()->values();
        }

        return [
            'statCards' => [
                'avg_company_progress' => $this->clampProgress($avgProgress),
                'completed_company_rate' => round($completedRate, 2),
                'avg_confidence_score' => $avgConfidenceScore ? round($avgConfidenceScore, 1) : 0,
            ],
            'charts' => [
                'progress_over_time' => $progressOverTime,
                'performance_by_department' => $departmentPerformance->toArray(),
            ],
            'table' => $tableData->toArray(),
        ];
    }

    /**
     * Helper to format a single objective for the performance table response.
     */
    private function _formatObjectiveForTable(Objective $objective, $confidenceScores, Cycle $cycle, ?Objective $parent = null): array
    {
        $progress = (float) $objective->progress_percent;
        $idealProgress = $this->reportService->getIdealProgress($cycle->start_date, $cycle->end_date);
        
        $healthStatus = 'on_track'; // Green
        if ($progress < $idealProgress - 20) {
            $healthStatus = 'off_track'; // Red
        } elseif ($progress < $idealProgress - 10) {
            $healthStatus = 'at_risk'; // Yellow
        }

        return [
            'objective_id' => $objective->objective_id,
            'objective_name' => $objective->obj_title,
            'level' => $objective->level,
            'department_name' => $objective->department->d_name ?? 'Công ty',
            'owner_name' => $objective->user->full_name ?? 'N/A',
            'progress' => $this->clampProgress($progress),
            'health_status' => $healthStatus,
            'confidence_score' => $confidenceScores->get($objective->objective_id)->confidence_score ?? null,
            'parent_objective_id' => $parent ? $parent->objective_id : null,
            'parent_objective_name' => $parent ? $parent->obj_title : null,
        ];
    }
    
    /**
     * Gets the weekly progress trend for company-level objectives.
     */
    private function _getCompanyProgressTrend(Cycle $cycle, $companyObjectiveIds, array $dateRange)
    {
        if ($companyObjectiveIds->isEmpty()) {
            return [];
        }

        $krsUnderCompanyObjectives = KeyResult::whereIn('objective_id', $companyObjectiveIds)->pluck('kr_id');
        
        if ($krsUnderCompanyObjectives->isEmpty()) {
            return [];
        }

        $trendQuery = CheckIn::query()
            ->select([
                DB::raw("DATE_FORMAT(check_ins.created_at, '%Y-%u') as bucket"), // Group by week
                DB::raw('AVG(check_ins.progress_percent) as avg_progress'),
            ])
            ->join('key_results as kr', 'check_ins.kr_id', '=', 'kr.kr_id') // Join to access cycle_id
            ->whereIn('check_ins.kr_id', $krsUnderCompanyObjectives)
            ->where('kr.cycle_id', $cycle->cycle_id) // Filter by cycle_id on key_results
            ->whereNotNull('check_ins.progress_percent');

        if (!empty($dateRange['start']) && !empty($dateRange['end'])) {
            $trendQuery->whereBetween('created_at', [Carbon::parse($dateRange['start'])->startOfDay(), Carbon::parse($dateRange['end'])->endOfDay()]);
        }

        $trend = $trendQuery->groupBy('bucket')->orderBy('bucket')->get();
            
        // Also get ideal progress for each week
        $startDate = !empty($dateRange['start']) ? Carbon::parse($dateRange['start']) : Carbon::parse($cycle->start_date);
        $endDate = !empty($dateRange['end']) ? Carbon::parse($dateRange['end']) : Carbon::parse($cycle->end_date);
        
        // Ensure start date is not after end date for calculation
        if ($startDate->gt($endDate)) {
            return []; // Return empty if the date range is invalid
        }
        
        $cycleDurationInDays = $startDate->diffInDays($endDate);
        if ($cycleDurationInDays <= 0) $cycleDurationInDays = 1;

        $idealTrend = [];
        $currentDate = $startDate->copy();
        while($currentDate->lessThanOrEqualTo($endDate)) {
            $weekBucket = $currentDate->format('Y-W');
            $daysIntoCycle = $startDate->diffInDays($currentDate);
            $ideal = min(100, ($daysIntoCycle / $cycleDurationInDays) * 100);
            $idealTrend[$weekBucket] = round($ideal, 2);
            $currentDate->addWeek();
        }
        
        $actualTrend = $trend->keyBy('bucket');

        $combinedTrend = [];
        foreach($idealTrend as $bucket => $ideal) {
             $combinedTrend[] = [
                'bucket' => $bucket,
                'avg_progress' => $this->clampProgress($actualTrend[$bucket]->avg_progress ?? 0),
                'ideal_progress' => $ideal,
            ];
        }

        return $combinedTrend;
    }


    /**
     * Export CSV for OKR company report (Excel-friendly).
     */
    public function exportCompanyOkrCsv(Request $request): StreamedResponse
    {
        $tab = $request->input('tab', 'performance');
        $cycle = $this->resolveCycle($request->integer('cycle_id'));
        if (!$cycle) {
            // Handle error case where cycle is not found
        }
        
        // --- Filters ---
        $departmentId = $request->integer('department_id');
        $level = $request->input('level');
        $dateRange = [
            'start' => $request->input('start_date'),
            'end' => $request->input('end_date'),
        ];

        $data = [];
        if ($cycle) {
            switch ($tab) {
                case 'performance':
                    $data = $this->_getPerformanceReportData($cycle, $departmentId, $level, $dateRange);
                    break;
                case 'process':
                    $data = $this->_getProcessReportData($cycle, $departmentId, $level, $dateRange);
                    break;
                case 'quality':
                    $data = $this->_getQualityReportData($cycle, $departmentId, $level, $dateRange);
                    break;
            }
        }

        $tableData = $data['table'] ?? [];
        $rows = [];

        // Define headers and format rows based on the tab
        switch ($tab) {
            case 'performance':
                $rows[] = ['Tên Mục tiêu (O/KR)', 'Cấp độ', 'Phòng ban/Đơn vị', 'Tiến độ (%)', 'Tình trạng (Health)', 'Điểm Tự tin', 'Liên kết với O Cấp trên'];
                foreach ($tableData as $parent) {
                    $rows[] = [
                        $parent['objective_name'], $parent['level'], $parent['department_name'], $parent['progress'], 
                        $parent['health_status'], $parent['confidence_score'], $parent['parent_objective_name']
                    ];
                    if (!empty($parent['children'])) {
                        foreach($parent['children'] as $child) {
                            $rows[] = [
                                '  -- ' . $child['objective_name'], // Indent child
                                $child['level'], $child['department_name'], $child['progress'], $child['health_status'], 
                                $child['confidence_score'], $child['parent_objective_name']
                            ];
                        }
                    }
                }
                break;

            case 'process':
                $rows[] = ['Tên Mục tiêu (O/KR)', 'Phòng ban/Đơn vị', 'Người Sở hữu Chính', 'Tình trạng (Health)', 'Check-in Gần nhất', 'Quá hạn Check-in (Ngày)', 'Tỷ lệ Check-in Định kỳ (%)'];
                foreach ($tableData as $row) {
                    $rows[] = [
                        $row['objective_name'], $row['department_name'], $row['owner_name'], $row['health_status'],
                        $row['last_checkin_date'], $row['days_overdue'], $row['periodic_checkin_rate'] . '%'
                    ];
                }
                break;

            case 'quality':
                $rows[] = ['Tên Mục tiêu (O/KR)', 'Phòng ban/Đơn vị', 'Loại KR (Kết quả/Hoạt động)', 'Tham vọng', 'Số lượng KR', 'Thẻ Chiến lược', 'Tiến độ (%)', 'Vấn đề Cấu trúc'];
                foreach ($tableData as $row) {
                     $krDist = "Kết quả: {$row['kr_type_distribution']['outcome']}, Hoạt động: {$row['kr_type_distribution']['activity']}";
                    $rows[] = [
                        $row['objective_name'], $row['department_name'], $krDist,
                        $row['is_aspirational'] ? 'Yes' : 'No', $row['kr_count'], implode(', ', $row['strategic_tags']),
                        $row['progress'] . '%', $row['structural_issues']
                    ];
                }
                break;
            
            default:
                $rows[] = ['Invalid tab specified for export.'];
                break;
        }

        $callback = function () use ($rows) {
            $handle = fopen('php://output', 'w');
            // Add UTF-8 BOM for Excel compatibility
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        };

        $filename = 'okr_report_' . $tab . '_' . now()->format('Ymd_His') . '.csv';
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
        // Note: The view 'reports.company-okr-pdf' needs to be updated for the new data structure
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
            ->with(['assignedUser.role', 'assignedUser.department', 'assignee'])
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

        $cycle = $this->resolveCycle($cycleId);
        if (!$cycle) {
            return response()->json(['success' => false, 'message' => 'Không thể xác định chu kỳ cho snapshot.'], 422);
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
            } elseif ($reportType === 'company') {
                // Lấy tất cả filter params từ request gốc
                $departmentId = $request->integer('department_id');
                $level = $request->input('level');
                $dateRange = [
                    'start' => $request->input('start_date'),
                    'end' => $request->input('end_date'),
                ];

                // Lấy dữ liệu từ cả 3 tab, truyền filter một cách tường minh
                $performanceData = $this->_getPerformanceReportData($cycle, $departmentId, $level, $dateRange);
                $processData = $this->_getProcessReportData($cycle, $departmentId, $level, $dateRange);
                $qualityData = $this->_getQualityReportData($cycle, $departmentId, $level, $dateRange);

                // Gộp dữ liệu của cả 3 tab vào một cấu trúc duy nhất
                $combinedData = [
                    'performance' => $performanceData,
                    'process' => $processData,
                    'quality' => $qualityData,
                ];
                
                // Tạo cấu trúc snapshot_data cuối cùng
                $snapshotData = [
                    'success' => true,
                    'data' => $combinedData,
                    'meta' => [
                        'cycleId' => $cycle->cycle_id,
                        'cycleName' => $cycle->cycle_name,
                        'computedAt' => now()->toISOString(),
                        'filters' => [
                            'department_id' => $departmentId,
                            'level' => $level,
                            'date_range' => $dateRange,
                        ]
                    ]
                ];
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

            // Thêm metadata vào snapshot_data
            $snapshotData['meta']['report_type'] = $reportType;
            $snapshotData['meta']['notes'] = $notes;
             if ($reportType === 'company') {
                $snapshotData['meta']['department_id'] = null;
            } else {
                $snapshotData['meta']['department_id'] = $departmentId ?: $user->department_id;
            }


            // Tạo báo cáo snapshot
            try {
                $report = ReportSnapshot::create([
                    'title' => $reportName ?: $this->generateDefaultReportName($reportType, $cycleId),
                    'data_snapshot' => $snapshotData,
                    'created_by' => $user->user_id,
                    'cycle_id' => $cycleId,
                    'cycle_name' => $cycle->cycle_name,
                    'snapshotted_at' => now(),
                ]);
            } catch (\Illuminate\Database\QueryException $e) {
                \Log::error('Database error creating report snapshot: ' . $e->getMessage(), [
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
                    'report_id' => $report->id, // Use the default 'id' primary key
                    'report_name' => $report->title,
                    'report_type' => $reportType,
                    'created_at' => $report->snapshotted_at->toISOString(),
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
        $departmentId = $request->input('department_id') ? (int)$request->input('department_id') : null; // Get department_id from request
        $limit = $request->input('limit') ? (int)$request->input('limit') : 50;

        $query = ReportSnapshot::query()
            ->with(['creator', 'cycle'])
            ->orderByDesc('snapshotted_at');

        // Lọc theo loại báo cáo, giờ được lưu trong cột JSON
        if ($reportType && in_array($reportType, ['team', 'manager', 'company'], true)) {
            $query->where('data_snapshot->meta->report_type', $reportType);
        }

        // Lọc theo chu kỳ
        if ($cycleId) {
            $query->where('cycle_id', $cycleId);
        }
        
        // Thêm lọc theo department_id nếu report_type là 'team' và department_id được cung cấp
        if ($reportType === 'team' && $departmentId) {
            $query->where('data_snapshot->meta->department_id', $departmentId);
        }
        // Note: Access control logic might need adjustment depending on the final requirements.
        // For now, we allow broader access as the previous logic was commented out.

        $reports = $query->limit($limit)->get();

        return response()->json([
            'success' => true,
            'data' => $reports->map(function ($report) {
                // Eagerly load department if department_id exists in meta
                $departmentId = $report->data_snapshot['meta']['department_id'] ?? null;
                $department = $departmentId ? Department::find($departmentId) : null;

                return [
                    'report_id' => $report->id,
                    'report_type' => $report->data_snapshot['meta']['report_type'] ?? null,
                    'report_name' => $report->title,
                    'created_at' => $report->snapshotted_at->toISOString(),
                    'created_at_formatted' => $report->snapshotted_at->format('d/m/Y H:i'),
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
                    'department' => $department ? [
                        'department_id' => $department->department_id,
                        'department_name' => $department->d_name,
                    ] : null,
                    'notes' => $report->data_snapshot['meta']['notes'] ?? null,
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
        
        \Log::info("Fetching report snapshot: ID = $reportId, User = {$user->user_id}");

        $report = ReportSnapshot::with(['creator', 'cycle'])->find($reportId);
        
        if (!$report) {
            \Log::warning("Report snapshot not found: ID = $reportId");
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy báo cáo.',
            ], 404);
        }

        // Note: Access control logic might need adjustment.
        // The original logic was commented out, maintaining that for now.
        $departmentId = $report->data_snapshot['meta']['department_id'] ?? null;
        $department = $departmentId ? Department::find($departmentId) : null;

        return response()->json([
            'success' => true,
            'data' => [
                'report_id' => $report->id,
                'report_type' => $report->data_snapshot['meta']['report_type'] ?? null,
                'report_name' => $report->title,
                'snapshot_data' => $report->data_snapshot,
                'created_at' => $report->snapshotted_at->toISOString(),
                'created_at_formatted' => $report->snapshotted_at->format('d/m/Y H:i'),
                'creator' => [
                    'user_id' => $report->creator->user_id ?? null,
                    'full_name' => $report->creator->full_name ?? 'N/A',
                    'email' => $report->creator->email ?? null,
                ],
                'cycle' => $report->cycle ? [
                    'cycle_id' => $report->cycle->cycle_id,
                    'cycle_name' => $report->cycle->cycle_name,
                ] : null,
                'department' => $department ? [
                    'department_id' => $department->department_id,
                    'department_name' => $department->d_name,
                ] : null,
                'notes' => $report->data_snapshot['meta']['notes'] ?? null,
            ],
        ]);
    }

    /**
     * Xóa một báo cáo snapshot
     */
    public function deleteReport(Request $request, int $reportId)
    {
        $user = $request->user();
        
        $report = ReportSnapshot::find($reportId);
        
        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy báo cáo.',
            ], 404);
        }

        // Chỉ người tạo, admin hoặc CEO mới được xóa
        if ($report->created_by !== $user->user_id && !$user->is_admin && strtolower($user->role->role_name ?? '') !== 'ceo') {
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

    /**
     * Gửi nhắc nhở check-in cho thành viên
     */
    public function remindMember(Request $request)
    {
        $user = $request->user();
        $memberId = $request->input('member_id');
        $cycleId = $request->input('cycle_id');

        if (!$memberId) {
             return response()->json(['success' => false, 'message' => 'Thiếu thông tin thành viên'], 400);
        }

        // Ensure cycle_id is present as it is required by the notifications table
        if (!$cycleId) {
            $currentCycle = $this->resolveCycle();
            if ($currentCycle) {
                $cycleId = $currentCycle->cycle_id;
            }
        }

        if (!$cycleId) {
            return response()->json(['success' => false, 'message' => 'Không xác định được chu kỳ để tạo thông báo'], 400);
        }

        $targetUser = User::find($memberId);
        if (!$targetUser) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy thành viên'], 404);
        }

        // Basic check: same department
        if ($user->department_id !== $targetUser->department_id && !$user->is_admin) {
             return response()->json(['success' => false, 'message' => 'Thành viên không thuộc đội nhóm của bạn'], 403);
        }

        // Gửi noti - Service sẽ lưu vào bảng notifications
        \App\Services\NotificationService::send(
            $targetUser->user_id,
            "Quản lý {$user->full_name} nhắc bạn cập nhật tiến độ OKR.",
            'reminder',
            (int) $cycleId,
            '/my-objectives', // Action URL
            'Check-in ngay'
        );

        return response()->json(['success' => true, 'message' => 'Đã gửi nhắc nhở thành công']);
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
     * Resolve cycle from ID or current
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
}
