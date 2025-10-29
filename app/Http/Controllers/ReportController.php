<?php

namespace App\Http\Controllers;

use App\Models\Objective;
use App\Models\Department;
use App\Models\Cycle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
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
}


