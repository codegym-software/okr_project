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
            if ($progress === null) {
                $krAvg = DB::table('key_results')
                    ->where('objective_id', $obj->objective_id)
                    ->avg('progress_percent');
                $progress = $krAvg !== null ? (float) $krAvg : 0.0;
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
        $onTrack = $objectiveProgress->where('progress', '>=', 70)->count();
        $atRisk = $objectiveProgress->where('progress', '>=', 40)->where('progress', '<', 70)->count();
        $offTrack = $objectiveProgress->where('progress', '<', 40)->count();

        $status = [
            'onTrack' => round($onTrack * 100 / $totalCount, 2),
            'atRisk' => round($atRisk * 100 / $totalCount, 2),
            'offTrack' => round($offTrack * 100 / $totalCount, 2),
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
            ->pluck('dept_name', 'department_id');
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
            ],
            'meta' => [
                'cycleId' => $cycleId ? (int) $cycleId : null,
                'cycleName' => $cycleName,
                'computedAt' => now()->toISOString(),
            ],
        ]);
    }
}


