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
        $user = auth()->user();

        // 1. My OKRs (Active)
        // OKRs owned by user
        // STRICTLY filter by 'person' level as requested
        $myOkrs = Objective::where('user_id', $user->user_id)
            ->where('level', 'person')
            ->whereNull('archived_at')
            ->with([
                'keyResults', 
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
                    'keyResults',
                    'sourceLinks.targetObjective', // Eager load parent objective for alignment display
                    'department' // Load department info to show which dept it belongs to
                ])
                ->orderBy('created_at', 'desc')
                ->limit(50) // Limit to prevent overload, maybe pagination later
                ->get();
        } elseif ($user->department_id) {
            // Normal User: View ONLY their Department's Unit OKRs
            $deptOkrs = Objective::where('department_id', $user->department_id)
                ->where('level', 'unit')
                ->whereNull('archived_at')
                ->with([
                    'keyResults',
                    'sourceLinks.targetObjective'
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
                ->with('keyResults')
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
                ->with('keyResults')
                ->orderBy('created_at', 'desc')
                ->get();
        }

        // If no department or no links found for normal user, companyOkrs remains empty.

        return response()->json([
            'user' => $user,
            'myOkrs' => $myOkrs,
            'deptOkrs' => $deptOkrs,
            'companyOkrs' => $companyOkrs,
        ]);
    }
}
