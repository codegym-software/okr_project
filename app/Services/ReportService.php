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
            ->with(['keyResults.checkIns' => function ($query) {
                $query->orderByDesc('created_at')->limit(2);
            }])
            ->get();

        // 2. Tính toán chỉ số từng Objective (có so sánh với expectedProgress)
        $objectiveStats = $objectives->map(function ($obj) use ($expectedProgress) {
            return $this->calculateObjectiveStats($obj, $expectedProgress);
        });

        // 3. Tính toán chỉ số toàn Team
        $teamAverage = $objectiveStats->isEmpty() ? 0.0 : round($objectiveStats->avg('progress'), 1);
        
        // Lấy tất cả OKRs thuộc phòng ban này để hiển thị, không lọc theo level nữa
        $teamOkrs = $objectiveStats->values();

        // 4. Tính toán hiệu suất từng thành viên
        $members = User::query()
            ->where('department_id', $departmentId)
            ->with('role')
            ->get(['user_id', 'full_name', 'email', 'avatar_url', 'role_id']); 

        $memberStats = $members->map(function ($member) use ($objectiveStats, $departmentId, $cycleId, $expectedProgress) {
            return $this->calculateMemberStats($member, $departmentId, $cycleId, $expectedProgress);
        })->sortBy(function($member) {
             // Logic sort: Ưu tiên role_id nhỏ (thường là Manager/Admin)
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
        ];
    }

    /**
     * Tính toán chi tiết cho 1 Objective
     */
    private function calculateObjectiveStats(Objective $objective, float $expectedProgress): array
    {
        $krs = $objective->keyResults;
        
        // Lấy các Objective con (Linked Objectives) đã approved
        // Objective con là SOURCE trong bảng okr_links, trỏ tới Objective cha là TARGET ($objective)
        $childObjectives = Objective::whereHas('sourceLinks', function($q) use ($objective) {
            $q->where('target_objective_id', $objective->objective_id)
              ->where('status', 'approved');
        })->get();

        $totalItemsCount = $krs->count() + $childObjectives->count();
        
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
                'status' => $this->determineTimeBasedStatus($progress, $expectedProgress),
                'last_updated' => $objective->updated_at,
            ];
        }

        // Tính progress từ KRs
        $krProgressSum = $krs->sum(function ($kr) {
            $latestCheckIn = $kr->checkIns->first();
            $progress = $latestCheckIn ? $latestCheckIn->progress_percent : $kr->progress_percent;
            
            if ($progress === null && $kr->target_value > 0) {
                $progress = ($kr->current_value / $kr->target_value) * 100;
            }
            return min(100, max(0, (float) $progress));
        });

        // Tính progress từ Child Objectives
        $childObjProgressSum = $childObjectives->sum(function ($child) {
            return min(100, max(0, (float) ($child->progress_percent ?? 0)));
        });

        // Tổng hợp
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
            'key_results_count' => $totalItemsCount, // Gộp cả Obj con vào số lượng KR hiển thị
            'completed_kr_count' => $completedKrs + $completedChildObjs,
            'status' => $this->determineTimeBasedStatus($avgProgress, $expectedProgress),
            'last_updated' => $objective->updated_at,
        ];
    }

    /**
     * Tính toán chỉ số chi tiết cho 1 Member
     */
    private function calculateMemberStats(User $member, int $departmentId, int $cycleId, float $expectedProgress): array
    {
        // 1. Lấy các KR mà user này liên quan (Owner hoặc Assigned) trong cycle hiện tại
        $userKrs = KeyResult::query()
            ->where('cycle_id', $cycleId)
            ->where(function($q) use ($member) {
                $q->where('user_id', $member->user_id)
                  ->orWhere('assigned_to', $member->user_id);
            })
            ->with(['checkIns' => function($q) {
                $q->orderByDesc('created_at')->limit(2);
            }])
            ->get();

        // 2. Tính tiến độ trung bình dựa trên KRs
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

        // 3. Phân tích Check-in (Velocity & Trend)
        // 3a. Lấy ngày check-in cuối cùng (Chỉ lấy check-in thuộc cycle hiện tại)
        $lastCheckIn = CheckIn::where('user_id', $member->user_id)
            ->whereHas('keyResult', function($q) use ($cycleId) {
                $q->where('cycle_id', $cycleId);
            })
            ->latest('created_at')
            ->first();
        
        $lastCheckInDate = $lastCheckIn ? $lastCheckIn->created_at : null;

        // 3b. Tính Confidence Trend
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

        // Checkin Status Logic...
        $checkinStatus = 'no_data';
        if ($lastCheckInDate) {
            $daysSince = now()->diffInDays($lastCheckInDate);
            if ($daysSince <= 7) $checkinStatus = 'good';
            elseif ($daysSince <= 14) $checkinStatus = 'warning';
            else $checkinStatus = 'late';
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
        ];
    }

    /**
     * Xác định trạng thái dựa trên so sánh Tiến độ thực tế vs Thời gian trôi qua
     */
    private function determineTimeBasedStatus(float $actual, float $expected): string
    {
        if ($actual >= 100) return 'completed';
        
        // Nếu chu kỳ chưa bắt đầu (expected = 0)
        if ($expected == 0) return $actual > 0 ? 'on_track' : 'pending';

        $delta = $actual - $expected;

        if ($delta >= 0) {
            return 'on_track'; // Tiến độ >= Thời gian -> Tốt
        }
        
        // Nếu chậm hơn thời gian
        if ($delta >= -10) {
            return 'at_risk'; // Chậm một chút (dưới 10%) -> Rủi ro
        }

        return 'behind'; // Chậm nhiều (hơn 10%) -> Chậm trễ
    }
}