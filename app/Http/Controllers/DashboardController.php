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
        // Fetch ALL Unit OKRs for the user's department
        $deptOkrs = [];
        if ($user->department_id) {
            $deptOkrs = Objective::where('department_id', $user->department_id)
                ->where('level', 'unit')
                ->whereNull('archived_at')
                ->with('keyResults')
                ->orderBy('created_at', 'desc')
                ->limit(20) // Increased limit to ensure we capture enough dept objectives
                ->get();
        }

        // 3. Company OKRs (Department Aligned)
        // Show Company OKRs that the User's DEPARTMENT is linked to.
        // Logic: Find links where Source is one of the Dept OKRs, and Target is Company Level.
        
        $companyOkrs = [];
        if (!empty($deptOkrs) && $deptOkrs->count() > 0) {
            $deptObjIds = $deptOkrs->pluck('objective_id')->toArray();

            // Find links where Source IN (Dept OKRs) AND Target Level = 'company'
            // We use whereHas to filter links that actually point to a company objective
            $companyOkrs = Objective::where('level', 'company')
                ->whereHas('targetLinks', function($query) use ($deptObjIds) {
                    $query->whereIn('source_objective_id', $deptObjIds)
                          ->where('is_active', true)
                          ->where('status', 'approved'); // Assuming we have Model constants, but raw string is safer here if not imported
                })
                ->whereNull('archived_at')
                ->with('keyResults')
                ->orderBy('created_at', 'desc')
                ->get();
        }

        // If no department or no links found, companyOkrs remains empty, 
        // effectively showing "No aligned company OKRs" which is correct per user request.

        return response()->json([
            'user' => $user,
            'myOkrs' => $myOkrs,
            'deptOkrs' => $deptOkrs,
            'companyOkrs' => $companyOkrs,
        ]);
    }
}
