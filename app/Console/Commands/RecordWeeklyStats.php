<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Cycle;
use App\Models\Department;
use App\Models\KeyResult;
use App\Models\CheckIn;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class RecordWeeklyStats extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reports:sync-weekly';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Tính toán và lưu trữ snapshot hàng tuần cho các phòng ban (Tự động điền dữ liệu cũ nếu thiếu)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Bắt đầu đồng bộ dữ liệu báo cáo tuần...');

        // 1. Lấy các chu kỳ đang active hoặc vừa kết thúc (trong vòng 1 tháng để chốt sổ)
        $cycles = Cycle::where('status', 'active')
            ->orWhere(function($q) {
                $q->where('status', 'inactive')
                  ->where('end_date', '>=', Carbon::now()->subMonth());
            })
            ->get();

        if ($cycles->isEmpty()) {
            $this->info('Không có chu kỳ nào cần xử lý.');
            return;
        }

        $departments = Department::all();
        $now = Carbon::now();

        foreach ($cycles as $cycle) {
            $this->info("Đang xử lý chu kỳ: {$cycle->cycle_name}");
            
            $startDate = Carbon::parse($cycle->start_date);
            $endDate = Carbon::parse($cycle->end_date);
            
            // Giới hạn thời gian xét đến hiện tại (nếu chu kỳ chưa kết thúc)
            $limitDate = $endDate->lessThan($now) ? $endDate : $now;

            foreach ($departments as $dept) {
                // $this->line("  - Phòng ban: {$dept->d_name}");

                // Duyệt qua từng tuần từ đầu chu kỳ đến hiện tại
                $weekIterator = $startDate->copy()->endOfWeek(); // Chủ nhật đầu tiên

                while ($weekIterator->lessThanOrEqualTo($limitDate)) {
                    $year = $weekIterator->year;
                    $weekNumber = $weekIterator->weekOfYear;
                    
                    // Kiểm tra xem đã có snapshot chưa
                    $exists = DB::table('report_snapshots_weekly')
                        ->where('department_id', $dept->department_id)
                        ->where('cycle_id', $cycle->cycle_id)
                        ->where('week_number', $weekNumber)
                        ->where('year', $year)
                        ->exists();

                    if (!$exists) {
                        $this->warn("    > Thiếu dữ liệu Tuần {$weekNumber}/{$year}. Đang tính toán...");
                        
                        // TÍNH TOÁN (Logic Replay)
                        $stats = $this->calculateStatsForWeek($dept->department_id, $cycle->cycle_id, $weekIterator);
                        
                        // LƯU VÀO DB
                        DB::table('report_snapshots_weekly')->insert([
                            'department_id' => $dept->department_id,
                            'cycle_id' => $cycle->cycle_id,
                            'week_number' => $weekNumber,
                            'year' => $year,
                            'week_start_date' => $weekIterator->copy()->startOfWeek()->format('Y-m-d'),
                            'week_end_date' => $weekIterator->format('Y-m-d'),
                            'avg_progress' => $stats['avg_progress'],
                            'okr_count' => $stats['okr_count'],
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }

                    $weekIterator->addWeek();
                }
            }
        }

        $this->info('Hoàn tất đồng bộ.');
    }

    /**
     * Tính toán chỉ số của phòng ban tại thời điểm quá khứ (snapshotDate)
     * Logic: Tính trung bình cộng tiến độ của các OBJECTIVE cấp Unit
     */
    private function calculateStatsForWeek($departmentId, $cycleId, Carbon $snapshotDate)
    {
        // 1. Lấy danh sách Objective cấp Unit của phòng ban tồn tại tại thời điểm đó
        $objectives = \App\Models\Objective::where('department_id', $departmentId)
            ->where('cycle_id', $cycleId)
            ->where('level', 'unit') // Chỉ tính cấp phòng ban
            ->where('created_at', '<=', $snapshotDate) // Phải được tạo trước thời điểm snapshot
            ->where(function($q) use ($snapshotDate) {
                $q->whereNull('archived_at')
                  ->orWhere('archived_at', '>', $snapshotDate); // Chưa bị lưu trữ TẠI THỜI ĐIỂM ĐÓ
            })
            ->get();

        if ($objectives->isEmpty()) {
            return ['avg_progress' => 0, 'okr_count' => 0];
        }

        $totalObjectiveProgress = 0;
        $objectiveCount = $objectives->count();

        foreach ($objectives as $obj) {
            $totalObjectiveProgress += $this->calculateSingleObjectiveProgress($obj->objective_id, $snapshotDate);
        }

        // Tiến độ phòng ban = TB cộng các Objective
        $deptAvg = $objectiveCount > 0 ? round($totalObjectiveProgress / $objectiveCount, 2) : 0;

        return [
            'avg_progress' => $deptAvg,
            'okr_count' => $objectiveCount
        ];
    }

    /**
     * Helper: Tính tiến độ của 1 Objective tại thời điểm quá khứ
     * Bao gồm: Key Results trực tiếp + Child Objectives (liên kết)
     */
    private function calculateSingleObjectiveProgress($objectiveId, Carbon $snapshotDate, $depth = 0)
    {
        if ($depth > 5) return 0; // Tránh đệ quy quá sâu

        $progressValues = [];

        // A. Key Results trực tiếp
        // Logic: Có tồn tại và chưa bị lưu trữ TẠI THỜI ĐIỂM ĐÓ
        $krs = KeyResult::where('objective_id', $objectiveId)
            ->where('created_at', '<=', $snapshotDate)
            ->where(function($q) use ($snapshotDate) {
                $q->whereNull('archived_at')
                  ->orWhere('archived_at', '>', $snapshotDate);
            })
            ->get();

        foreach ($krs as $kr) {
            // Tìm check-in mới nhất của KR tính đến thời điểm snapshotDate
            $lastCheckIn = CheckIn::where('kr_id', $kr->kr_id)
                ->where('created_at', '<=', $snapshotDate)
                ->orderByDesc('created_at')
                ->first();

            $progressValues[] = $lastCheckIn ? (float) $lastCheckIn->progress_percent : 0;
        }

        // B. Child Objectives (Liên kết từ dưới lên)
        // Tìm các link mà Objective này là TARGET (Obj con trỏ vào Obj này)
        $childLinks = \App\Models\OkrLink::where('target_objective_id', $objectiveId)
            ->where('target_type', 'objective') // Chỉ tính liên kết Obj -> Obj
            ->where('source_type', 'objective')
            ->where('status', 'approved')
            ->where('created_at', '<=', $snapshotDate)
            ->get();

        foreach ($childLinks as $link) {
            // Kiểm tra Objective con (active TẠI THỜI ĐIỂM ĐÓ)
            $childObj = \App\Models\Objective::find($link->source_objective_id);
            if ($childObj && 
                $childObj->created_at <= $snapshotDate && 
                ($childObj->archived_at == null || $childObj->archived_at > $snapshotDate)
            ) {
                 // Đệ quy tính tiến độ của Objective con
                 $progressValues[] = $this->calculateSingleObjectiveProgress($childObj->objective_id, $snapshotDate, $depth + 1);
            }
        }

        if (empty($progressValues)) {
            return 0;
        }

        // Trung bình cộng (Average)
        return array_sum($progressValues) / count($progressValues);
    }
}