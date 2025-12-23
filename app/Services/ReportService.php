<?php

namespace App\Services;

use App\Models\CheckIn;
use App\Models\Cycle;
use App\Models\KeyResult;
use App\Models\Objective;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportService
{
    /**
     * Tính toán báo cáo hiệu suất team chi tiết.
     */
    public function getTeamPerformance(int $departmentId, int $cycleId): array
    {
        // 0. Tính toán % thời gian trôi qua của chu kỳ
        $cycle = Cycle::find($cycleId);
        $expectedProgress = 0;
        if ($cycle) {
            $now = now();
            if ($now < $cycle->start_date) {
                $expectedProgress = 0;
            } elseif ($now > $cycle->end_date) {
                $expectedProgress = 100;
            } else {
                $totalDays = $cycle->start_date->diffInDays($cycle->end_date) ?: 1;
                $daysElapsed = $cycle->start_date->diffInDays($now);
                $expectedProgress = ($daysElapsed / $totalDays) * 100;
            }
        }

        // 1. Lấy tất cả Objectives của team trong cycle này
        $objectives = Objective::query()
            ->where('department_id', $departmentId)
            ->where('cycle_id', $cycleId)
            ->whereNull('archived_at')
            ->with([
                'keyResults.checkIns' => function ($query) {
                    $query->orderByDesc('created_at')->limit(2);
                },
                'sourceLinks.targetObjective'
            ])
            ->get();

        // 2. Tính toán chỉ số từng Objective
        $objectiveStats = $objectives->map(function ($obj) use ($expectedProgress) {
            return $this->calculateObjectiveStats($obj, $expectedProgress);
        });

        // 3. Tính toán chỉ số toàn Team
        $teamAverage = $objectiveStats->isEmpty() ? 0.0 : round($objectiveStats->avg('progress'), 1);
        
        // --- RESTRUCTURE TO HIERARCHY (TREE VIEW) ---
        $unitObjs = [];
        $personalObjs = [];
        
        foreach ($objectiveStats as $obj) {
            $obj['children'] = [];
            if (strtolower($obj['level'] ?? '') === 'unit') {
                $unitObjs[$obj['objective_id']] = $obj;
            } else {
                $personalObjs[] = $obj;
            }
        }

        $unlinkedObjs = [];

        foreach ($personalObjs as $pObj) {
            $parentId = null;
            // Look up parent in original collection to find link
            $originalModel = $objectives->firstWhere('objective_id', $pObj['objective_id']);
            if ($originalModel) {
                $parentLink = $originalModel->sourceLinks->first(function($link) {
                    return $link->status === 'approved' && $link->target_type === 'objective' && 
                           $link->targetObjective && strtolower($link->targetObjective->level) === 'unit';
                });
                if ($parentLink) {
                    $parentId = $parentLink->target_objective_id;
                }
            }

            if ($parentId && isset($unitObjs[$parentId])) {
                $unitObjs[$parentId]['children'][] = $pObj;
            } else {
                $unlinkedObjs[] = $pObj;
            }
        }

        $teamOkrs = array_merge(array_values($unitObjs), $unlinkedObjs);

        // 4. Lấy danh sách thành viên (MOVE UP HERE)
        $members = User::query()
            ->where('department_id', $departmentId)
            ->with('role')
            ->get(['user_id', 'full_name', 'email', 'avatar_url', 'role_id']); 
        
        $memberIds = $members->pluck('user_id');

        // --- NEW: PROCESS COMPLIANCE METRICS ---
        $now = now();
        $startOfWeek = $now->copy()->startOfWeek(Carbon::MONDAY);

        // A. Dept Check-in Rate
        $totalComplianceItems = 0;
        $checkedInItems = 0;
        $missedItems = 0;

        foreach ($objectives as $obj) {
            if (($obj->status ?? '') === 'draft') continue;
            if (strtolower($obj->level ?? '') !== 'unit') continue;

            // 1. Direct Key Results
            $activeKrs = $obj->keyResults->filter(function($kr) {
                return ($kr->progress_percent ?? 0) < 100 && $kr->archived_at === null;
            });

            foreach ($activeKrs as $kr) {
                $totalComplianceItems++;
                $lastCheckin = $kr->checkIns->first();
                $lastCheckinDate = $lastCheckin ? $lastCheckin->created_at : null;
                
                $isCheckedIn = $lastCheckinDate && $lastCheckinDate->gte($startOfWeek);
                
                if ($isCheckedIn) {
                    $checkedInItems++;
                } else {
                    $created = $kr->created_at ?: $obj->created_at;
                    if ($created->lt($startOfWeek)) {
                        $missedItems++;
                    }
                }
            }

            // 2. Linked Child Objectives
            $childObjectives = Objective::whereHas('sourceLinks', function($q) use ($obj) {
                $q->where('target_objective_id', $obj->objective_id)
                  ->where('status', 'approved');
            })->whereNull('archived_at')->get();

            foreach ($childObjectives as $child) {
                if (($child->progress_percent ?? 0) >= 100) continue; 

                $totalComplianceItems++;
                $lastChildCheckin = CheckIn::whereHas('keyResult', function($q) use ($child) {
                    $q->where('objective_id', $child->objective_id);
                })->orderByDesc('created_at')->value('created_at');
                
                $lastCheckinDate = $lastChildCheckin ? Carbon::parse($lastChildCheckin) : null;
                $isCheckedIn = $lastCheckinDate && $lastCheckinDate->gte($startOfWeek);
                
                if ($isCheckedIn) {
                    $checkedInItems++;
                } else {
                    if ($child->created_at->lt($startOfWeek)) {
                        $missedItems++;
                    }
                }
            }
        }

        $deptCheckinRate = $totalComplianceItems > 0 ? round(($checkedInItems / $totalComplianceItems) * 100, 1) : 0;
        $missedCheckinsCount = $missedItems;

        // B. Alignment Rate (Unit -> Company)
        $unitObjsCount = $objectives->filter(fn($o) => strtolower($o->level ?? '') === 'unit')->count();
        $linkedUnitObjsCount = $objectives->filter(function($obj) {
            return strtolower($obj->level ?? '') === 'unit' && $obj->sourceLinks->contains(function($link) {
                return $link->targetObjective && strtolower($link->targetObjective->level ?? '') === 'company';
            });
        })->count();
        $alignmentRate = $unitObjsCount > 0 ? round(($linkedUnitObjsCount / $unitObjsCount) * 100, 1) : 0;

        // C. Internal Alignment Rate (Personal -> Unit)
        $personalObjs = $objectives->filter(fn($o) => strtolower($o->level ?? '') === 'person');
        $totalPersonalObjs = $personalObjs->count();
        $linkedPersonalObjs = $personalObjs->filter(function($obj) {
            return $obj->sourceLinks->contains(function($link) {
                return $link->targetObjective && strtolower($link->targetObjective->level ?? '') === 'unit';
            });
        })->count();
        $internalAlignmentRate = $totalPersonalObjs > 0 ? round(($linkedPersonalObjs / $totalPersonalObjs) * 100, 1) : 0;

        // D. Members without Check-in
        $recentCheckinUserIds = CheckIn::where('created_at', '>=', $startOfWeek)
            ->whereIn('user_id', $memberIds)
            ->pluck('user_id')
            ->unique()
            ->toArray();
        $membersWithoutCheckinCount = $memberIds->count() - count($recentCheckinUserIds);
        // ----------------------------------------

        // 5. Member Stats
        $allKrs = KeyResult::query()
            ->where('cycle_id', $cycleId)
            ->whereNull('archived_at')
            ->where(function($q) use ($memberIds) {
                $q->whereIn('user_id', $memberIds)
                  ->orWhereIn('assigned_to', $memberIds);
            })
            ->get();

        // Optimization: Fetch checkins
        $krIds = $allKrs->pluck('kr_id')->toArray();
        if (!empty($krIds)) {
            $placeholders = implode(',', $krIds);
            $rawQuery = "SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY kr_id ORDER BY created_at DESC) as rn FROM check_ins WHERE kr_id IN ($placeholders)) as ranked WHERE rn <= 2";
            try {
                $checkIns = DB::select($rawQuery);
                $checkInsGrouped = collect($checkIns)->groupBy('kr_id');
                foreach ($allKrs as $kr) {
                    $krData = $checkInsGrouped->get($kr->kr_id) ?? collect();
                    $kr->setRelation('checkIns', CheckIn::hydrate($krData->toArray()));
                }
            } catch (\Exception $e) {
                $allKrs->load(['checkIns' => function($q) { $q->orderByDesc('created_at'); }]);
            }
        }

        $latestCheckIns = CheckIn::whereIn('user_id', $memberIds)
            ->whereHas('keyResult', function($q) use ($cycleId) {
                $q->where('cycle_id', $cycleId);
            })
            ->select('check_in_id', 'user_id', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get()->unique('user_id');

        $memberStats = $members->map(function ($member) use ($allKrs, $latestCheckIns, $departmentId, $cycleId, $expectedProgress) {
            $myKrs = $allKrs->filter(function($kr) use ($member) {
                return $kr->user_id === $member->user_id || $kr->assigned_to === $member->user_id;
            });
            $myLastCheckIn = $latestCheckIns->firstWhere('user_id', $member->user_id);
            return $this->calculateMemberStats($member, $myKrs, $myLastCheckIn, $expectedProgress);
        })->sortBy(function($member) {
             $rolePriority = 99;
             $roleName = strtolower($member['role']);
             if (str_contains($roleName, 'admin') || str_contains($roleName, 'ceo')) $rolePriority = 1;
             elseif (str_contains($roleName, 'manager') || str_contains($roleName, 'trưởng')) $rolePriority = 2;
             elseif (str_contains($roleName, 'lead')) $rolePriority = 3;
             else $rolePriority = 4;
             return sprintf('%02d-%06.2f', $rolePriority, 100 - $member['average_completion']);
        })->values();

        return [
            'team_average_completion' => $teamAverage,
            'total_okr_count' => $objectiveStats->count(),
            'team_okrs' => $teamOkrs,
            'members' => $memberStats,
            'expected_progress' => round($expectedProgress, 1),
            'checkin_compliance_rate' => $deptCheckinRate,
            'missed_checkins_count' => $missedCheckinsCount,
            'alignment_rate' => $alignmentRate,
            'internal_alignment_rate' => $internalAlignmentRate,
            'members_without_checkin_count' => $membersWithoutCheckinCount,
        ];
    }

    private function calculateObjectiveStats(Objective $objective, float $expectedProgress): array
    {
        $krs = $objective->keyResults;
        
        // Eager load child objectives
        $childObjectives = Objective::whereHas('sourceLinks', function($q) use ($objective) {
            $q->where('target_objective_id', $objective->objective_id)
              ->where('status', 'approved');
        })->get();

        $parentLink = $objective->sourceLinks->first(function($link) {
            return $link->status === 'approved' && $link->target_type === 'objective';
        });
        $parentObjectiveTitle = $parentLink && $parentLink->targetObjective 
            ? $parentLink->targetObjective->obj_title 
            : null;

        $totalItemsCount = $krs->count() + $childObjectives->count();
        
        $lastCheckinDate = null;
        $lastKrCheckin = $krs->map(fn($kr) => $kr->checkIns->first()?->created_at)->filter()->max();
        $lastChildUpdate = $childObjectives->max('updated_at');
        
        if ($lastKrCheckin && $lastChildUpdate) {
            $lastCheckinDate = $lastKrCheckin > $lastChildUpdate ? $lastKrCheckin : $lastChildUpdate;
        } elseif ($lastKrCheckin) {
            $lastCheckinDate = $lastKrCheckin;
        } else {
            $lastCheckinDate = $lastChildUpdate;
        }

        $daysOverdue = 0;
        if ($lastCheckinDate) {
            $daysOverdue = Carbon::parse($lastCheckinDate)->diffInDays(now());
        } else {
            $daysOverdue = Carbon::parse($objective->created_at)->diffInDays(now());
        }

        $createdAt = Carbon::parse($objective->created_at);
        $weeksElapsed = $createdAt->diffInWeeks(now()) ?: 1;
        $weeksWithCheckin = CheckIn::whereIn('kr_id', $krs->pluck('kr_id'))
            ->distinct()
            ->count(DB::raw("YEARWEEK(created_at, 1)"));
        $personalCheckinRate = round(min(100, ($weeksWithCheckin / $weeksElapsed) * 100), 1);

        // Prepare Detailed KR List
        $krDetails = $krs->map(function($kr) use ($expectedProgress) {
            $latestCheckIn = $kr->checkIns->first();
            $progress = $latestCheckIn ? $latestCheckIn->progress_percent : $kr->progress_percent;
            if ($progress === null && $kr->target_value > 0) {
                $progress = ($kr->current_value / $kr->target_value) * 100;
            }
            $progress = min(100, max(0, (float) $progress));
            
            $lastDate = $latestCheckIn ? $latestCheckIn->created_at : $kr->created_at;
            
            return [
                'id' => $kr->kr_id,
                'title' => $kr->kr_title,
                'progress' => $progress,
                'owner_id' => $kr->user_id, 
                'status' => $this->determineTimeBasedStatus($progress, $expectedProgress),
                'last_checkin_date' => $lastDate ? $lastDate->toIsoString() : null,
                'days_overdue' => $lastDate ? $lastDate->diffInDays(now()) : 0,
                'type' => 'kr'
            ];
        })->values();

        // **KEY CHANGE HERE**: Process Child Objectives to include their KRs
        $childObjectives->each(function($child) use ($expectedProgress) {
            // Must eager load KRs for children manually here
            $child->load(['keyResults.checkIns' => function ($query) {
                $query->orderByDesc('created_at')->limit(1);
            }]);

            $child->key_results = $child->keyResults->map(function($kr) use ($expectedProgress) {
                $latestCheckIn = $kr->checkIns->first();
                $progress = $latestCheckIn ? $latestCheckIn->progress_percent : $kr->progress_percent;
                if ($progress === null && $kr->target_value > 0) {
                    $progress = ($kr->current_value / $kr->target_value) * 100;
                }
                $progress = min(100, max(0, (float) $progress));
                $lastDate = $latestCheckIn ? $latestCheckIn->created_at : $kr->created_at;
                
                return [
                    'id' => $kr->kr_id,
                    'title' => $kr->kr_title,
                    'progress' => $progress,
                    'owner_id' => $kr->user_id,
                    'status' => $this->determineTimeBasedStatus($progress, $expectedProgress),
                    'last_checkin_date' => $lastDate ? $lastDate->toIsoString() : null,
                    'days_overdue' => $lastDate ? $lastDate->diffInDays(now()) : 0,
                    'type' => 'kr'
                ];
            })->values();
        });

        if ($totalItemsCount === 0) {
            $progress = (float) ($objective->progress_percent ?? 0);
            return [
                'objective_id' => $objective->objective_id,
                'obj_title' => $objective->obj_title,
                'description' => $objective->description,
                'level' => strtolower($objective->level ?? 'personal'),
                'user_id' => $objective->user_id,
                'progress' => $progress,
                'key_results_count' => 0,
                'completed_kr_count' => 0,
                'status' => ($objective->status === 'draft') ? 'draft' : $this->determineTimeBasedStatus($progress, $expectedProgress),
                'last_updated' => $objective->updated_at,
                'parent_objective_title' => $parentObjectiveTitle,
                'created_at' => $objective->created_at->toIsoString(),
                'last_checkin_date' => $lastCheckinDate ? Carbon::parse($lastCheckinDate)->toIsoString() : null,
                'days_overdue' => (int) $daysOverdue,
                'personal_checkin_rate' => $personalCheckinRate,
                'key_results' => $krDetails,
            ];
        }

        $krProgressSum = $krs->sum(function ($kr) {
            $latestCheckIn = $kr->checkIns->first();
            $progress = $latestCheckIn ? $latestCheckIn->progress_percent : $kr->progress_percent;
            if ($progress === null && $kr->target_value > 0) {
                $progress = ($kr->current_value / $kr->target_value) * 100;
            }
            return min(100, max(0, (float) $progress));
        });

        $childObjProgressSum = $childObjectives->sum(function ($child) {
            return min(100, max(0, (float) ($child->progress_percent ?? 0)));
        });

        $avgProgress = round(($krProgressSum + $childObjProgressSum) / $totalItemsCount, 1);
        
        $completedKrs = $krs->filter(fn($kr) => $kr->progress_percent >= 100)->count();
        $completedChildObjs = $childObjectives->filter(fn($obj) => $obj->progress_percent >= 100)->count();

        return [
            'objective_id' => $objective->objective_id,
            'obj_title' => $objective->obj_title,
            'description' => $objective->description,
            'level' => strtolower($objective->level ?? 'personal'),
            'user_id' => $objective->user_id,
            'progress' => $avgProgress,
            'key_results_count' => $totalItemsCount,
            'completed_kr_count' => $completedKrs + $completedChildObjs,
            'status' => ($objective->status === 'draft') ? 'draft' : $this->determineTimeBasedStatus($avgProgress, $expectedProgress),
            'last_updated' => $objective->updated_at,
            'parent_objective_title' => $parentObjectiveTitle,
            'created_at' => $objective->created_at->toIsoString(),
            'last_checkin_date' => $lastCheckinDate ? Carbon::parse($lastCheckinDate)->toIsoString() : null,
            'days_overdue' => (int) $daysOverdue,
            'personal_checkin_rate' => $personalCheckinRate,
            'key_results' => $krDetails,
        ];
    }

    private function calculateMemberStats(User $member, Collection $userKrs, ?CheckIn $lastCheckIn, float $expectedProgress): array
    {
        $totalKrsCount = $userKrs->count();
        $avgProgress = 0.0;
        $completedKrCount = 0;

        if ($totalKrsCount > 0) {
            $totalProgress = $userKrs->sum(function($kr) {
                $progress = $kr->progress_percent;
                if ($progress === null && $kr->checkIns->isNotEmpty()) {
                     $progress = $kr->checkIns->first()->progress_percent;
                }
                if (($progress === null || $progress == 0) && $kr->target_value > 0) {
                    $progress = ($kr->current_value / $kr->target_value) * 100;
                }
                return min(100, max(0, (float) $progress));
            });

            $avgProgress = round($totalProgress / $totalKrsCount, 1);
            $completedKrCount = $userKrs->filter(fn($kr) => $kr->progress_percent >= 100 || ($kr->target_value > 0 && $kr->current_value >= $kr->target_value))->count();
        }

        $lastCheckInDate = $lastCheckIn ? $lastCheckIn->created_at : null;

        $confidenceTrend = 'stable';
        $totalConfidenceDelta = 0;
        $checkInCount = 0;
        foreach ($userKrs as $kr) {
            if ($kr->checkIns->count() >= 2) {
                $latest = $kr->checkIns->first();
                $previous = $kr->checkIns->get(1);
                if (isset($latest->confidence_level, $previous->confidence_level)) {
                     $totalConfidenceDelta += ($latest->confidence_level - $previous->confidence_level);
                     $checkInCount++;
                }
            }
        }
        if ($checkInCount > 0) {
            if ($totalConfidenceDelta > 0) $confidenceTrend = 'increasing';
            elseif ($totalConfidenceDelta < 0) $confidenceTrend = 'decreasing';
        }

        $checkinStatus = 'no_data';
        if ($lastCheckInDate) {
            $daysSince = now()->diffInDays($lastCheckInDate);
            if ($daysSince <= 7) $checkinStatus = 'good';
            elseif ($daysSince <= 14) $checkinStatus = 'warning';
            else $checkinStatus = 'late';
        }
        
        $startOfWeek = now()->startOfWeek(Carbon::MONDAY);
        $activeUserKrs = $userKrs->filter(function($kr) {
            return ($kr->progress_percent ?? 0) < 100 && $kr->archived_at === null;
        });
        
        $totalActive = $activeUserKrs->count();
        $checkedInCount = 0;
        
        if ($totalActive > 0) {
            $checkedInCount = $activeUserKrs->filter(function($kr) use ($startOfWeek) {
                $last = $kr->checkIns->first();
                return $last && $last->created_at->gte($startOfWeek);
            })->count();
            $checkinScore = round(($checkedInCount / $totalActive) * 100, 1);
        } else {
            $checkinScore = 100; 
        }

        return [
            'user_id' => $member->user_id,
            'full_name' => $member->full_name,
            'email' => $member->email,
            'avatar' => $member->avatar_url ?? null,
            'role' => $member->role->role_name ?? 'Thành viên',
            'completed_okr_count' => 0,
            'average_completion' => $avgProgress,
            'total_kr_contributed' => (int) $totalKrsCount,
            'completed_kr_count' => (int) $completedKrCount,
            'last_checkin' => $lastCheckInDate ? $lastCheckInDate->diffForHumans() : null,
            'last_checkin_date' => $lastCheckInDate ? $lastCheckInDate->format('Y-m-d') : null,
            'checkin_status' => $checkinStatus,
            'confidence_trend' => $confidenceTrend,
            'status' => $this->determineTimeBasedStatus($avgProgress, $expectedProgress),
            'checkin_compliance_score' => $checkinScore,
        ];
    }

    private function determineTimeBasedStatus(float $actual, float $expected): string
    {
        if ($actual >= 100) return 'completed';
        if ($expected == 0) return $actual > 0 ? 'on_track' : 'pending';
        $delta = $actual - $expected;
        if ($delta >= 0) return 'on_track'; 
        if ($delta >= -10) return 'at_risk';
        return 'behind';
    }

    /**
     * Calculate ideal progress based on cycle timeframe.
     */
    public function getIdealProgress($startDate, $endDate): float
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);
        $now = Carbon::now();

        if ($now->isBefore($start)) return 0.0;
        if ($now->isAfter($end)) return 100.0;

        $totalDuration = $end->diffInDays($start);
        if ($totalDuration <= 0) return 100.0;

        $elapsedDuration = $now->diffInDays($start);
        
        return round(($elapsedDuration / $totalDuration) * 100, 2);
    }

    /**
     * Get health status string based on actual vs ideal progress.
     */
    public function getHealthStatus(float $actualProgress, float $idealProgress): string
    {
        if ($actualProgress >= $idealProgress - 10) {
            return 'on_track'; // Green
        }
        if ($actualProgress < $idealProgress - 20) {
            return 'off_track'; // Red
        }
        return 'at_risk'; // Yellow
    }
}