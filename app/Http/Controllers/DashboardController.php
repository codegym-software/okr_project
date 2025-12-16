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

        $myOkrs = Objective::where('user_id', $user->user_id)
            ->where('level', 'person')
            ->whereNull('archived_at')
            ->with([
                'keyResults.childObjectives', 
                'sourceLinks.targetObjective', 
                'sourceLinks.targetObjective.department',
                'cycle', 
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        $deptOkrs = [];
        $isCeoOrAdmin = $user->role && in_array(strtolower($user->role->role_name), ['admin', 'ceo']);

        if ($isCeoOrAdmin) {
            $deptOkrs = Objective::where('level', 'unit')
                ->whereNull('archived_at')
                ->with([
                    'keyResults.childObjectives.sourceObjective', 
                    'sourceLinks.targetObjective',
                    'department',
                    'childObjectives'
                ])
                ->orderBy('created_at', 'desc')
                ->limit(50)
                ->get();
        } elseif ($user->department_id) {
            $deptOkrs = Objective::where('department_id', $user->department_id)
                ->where('level', 'unit')
                ->whereNull('archived_at')
                ->with([
                    'keyResults.childObjectives.sourceObjective', 
                    'sourceLinks.targetObjective',
                    'childObjectives'
                ])
                ->orderBy('created_at', 'desc')
                ->limit(20)
                ->get();
        }

        $companyOkrs = [];
        
        if ($isCeoOrAdmin) {
            $companyOkrs = Objective::where('level', 'company')
                ->whereNull('archived_at')
                ->with([
                    'keyResults.childObjectives.sourceObjective', 
                    'childObjectives'
                ])
                ->orderBy('created_at', 'desc')
                ->get();
        } elseif (!empty($deptOkrs) && $deptOkrs->count() > 0) {
            $deptObjIds = $deptOkrs->pluck('objective_id')->toArray();

            $companyOkrs = Objective::where('level', 'company')
                ->whereHas('targetLinks', function($query) use ($deptObjIds) {
                    $query->whereIn('source_objective_id', $deptObjIds)
                          ->where('is_active', true)
                          ->where('status', 'approved');
                })
                ->whereNull('archived_at')
                ->with([
                    'keyResults.childObjectives.sourceObjective', 
                    'childObjectives'
                ])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        $allCompanyOkrs = Objective::where('level', 'company')
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

                // Skip risk evaluation for KRs that have never been checked-in
                $lastCheckIn = CheckIn::where('kr_id', $kr->kr_id)->latest()->first();
                if (!$lastCheckIn) {
                    continue;
                }

                $isRisk = false;

                if ($timeRatio > 0.5 && $krProgress < 30) {
                    $isRisk = true;
                }

                if ($krProgress < 50 && $daysLeft < 21) {
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
                    if ($timeRatio > 0.5 && $krProgress < 30) {
                        $isRisk = true;
                    }
                    if ($krProgress < 50 && $daysLeft < 21) {
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
}
