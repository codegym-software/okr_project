<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Objective;

class DashboardController extends Controller
{
    public function index()
    {
        return view('app');
    }

    public function getData(Request $request)
    {
        // Eager load role to ensure we can check permissions in frontend
        $user = auth()->user()->load('role');

        // 1. My OKRs (Active)
        // OKRs owned by user
        // STRICTLY filter by 'person' level as requested
        $myOkrs = Objective::where('user_id', $user->user_id)
            ->where('level', 'person')
            ->whereNull('archived_at')
            ->with([
                'keyResults.childObjectives', // Load this to check if KR is a container (has links)
                'sourceLinks.targetObjective', 
                'sourceLinks.targetObjective.department'
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        // 2. Department OKRs
        $deptOkrs = [];
        $isCeoOrAdmin = $user->role && in_array(strtolower($user->role->role_name), ['admin', 'ceo']);

        if ($isCeoOrAdmin) {
            // CEO/Admin: View ALL Unit OKRs from ALL Departments
            $deptOkrs = Objective::where('level', 'unit')
                ->whereNull('archived_at')
                ->with([
                    'keyResults.childObjectives.sourceObjective', // Load deep for KR auto-calculation
                    'sourceLinks.targetObjective',
                    'department',
                    'childObjectives'
                ])
                ->orderBy('created_at', 'desc')
                ->limit(50)
                ->get();
        } elseif ($user->department_id) {
            // Normal User: View ONLY their Department's Unit OKRs
            $deptOkrs = Objective::where('department_id', $user->department_id)
                ->where('level', 'unit')
                ->whereNull('archived_at')
                ->with([
                    'keyResults.childObjectives.sourceObjective', // Load deep
                    'sourceLinks.targetObjective',
                    'childObjectives'
                ])
                ->orderBy('created_at', 'desc')
                ->limit(20)
                ->get();
        }

        // 3. Company OKRs
        $companyOkrs = [];
        
        if ($isCeoOrAdmin) {
            // CEO/Admin: View ALL Company OKRs
            $companyOkrs = Objective::where('level', 'company')
                ->whereNull('archived_at')
                ->with([
                    'keyResults.childObjectives.sourceObjective', // Load deep
                    'childObjectives'
                ])
                ->orderBy('created_at', 'desc')
                ->get();
        } elseif (!empty($deptOkrs) && $deptOkrs->count() > 0) {
            // Normal User: View Aligned Company OKRs only
            $deptObjIds = $deptOkrs->pluck('objective_id')->toArray();

            $companyOkrs = Objective::where('level', 'company')
                ->whereHas('targetLinks', function($query) use ($deptObjIds) {
                    $query->whereIn('source_objective_id', $deptObjIds)
                          ->where('is_active', true)
                          ->where('status', 'approved');
                })
                ->whereNull('archived_at')
                ->with([
                    'keyResults.childObjectives.sourceObjective', // Load deep
                    'childObjectives'
                ])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        // Calculate Company-wide Average Progress (Global)
        // This is separate from the 'companyOkrs' list which might be filtered for alignment
        // We get ALL company objectives to calculate the true average
        $allCompanyOkrs = Objective::where('level', 'company')
            ->whereNull('archived_at')
            ->get();
            
        $totalProgress = 0;
        $count = 0;
        
        foreach ($allCompanyOkrs as $okr) {
            // Force calculation or use accessor
            $val = $okr->calculated_progress ?? $okr->progress_percent ?? 0;
            $totalProgress += (float)$val;
            $count++;
        }
        
        $companyGlobalAvg = $count > 0 ? round($totalProgress / $count, 1) : 0;

        return response()->json([
            'user' => $user,
            'myOkrs' => $myOkrs,
            'deptOkrs' => $deptOkrs,
            'companyOkrs' => $companyOkrs,
            'companyGlobalAvg' => $companyGlobalAvg // New field
        ]);
    }
}
