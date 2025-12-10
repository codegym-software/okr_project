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
        // We include both 'person' level and any OKR explicitly assigned to the user
        $myOkrs = Objective::where('user_id', $user->user_id)
            ->whereNull('archived_at')
            ->with([
                'keyResults', 
                'sourceLinks.targetObjective', 
                'sourceLinks.targetObjective.department'
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        // 2. Department OKRs
        // Filter by department_id AND level 'unit'
        // This ensures we get Department OKRs even if they are assigned to a user (Manager)
        $deptOkrs = [];
        if ($user->department_id) {
            $deptOkrs = Objective::where('department_id', $user->department_id)
                ->where('level', 'unit') // Specifically look for Unit/Department level OKRs
                ->whereNull('archived_at')
                ->with('keyResults')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();
        }

        // 3. Company OKRs
        $companyOkrs = Objective::where('level', 'company')
            ->whereNull('archived_at')
            ->with('keyResults')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'user' => $user,
            'myOkrs' => $myOkrs,
            'deptOkrs' => $deptOkrs,
            'companyOkrs' => $companyOkrs,
        ]);
    }
}
