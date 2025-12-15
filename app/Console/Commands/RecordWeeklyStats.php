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
     * Logic: Tính trung bình cộng tiến độ của các OBJECTIVE cấp Unit (giống logic hiển thị trên UI)
     */
    private function calculateStatsForWeek($departmentId, $cycleId, Carbon $snapshotDate)
    {
        // 1. Lấy danh sách Objective cấp Unit của phòng ban
        $objectives = \App\Models\Objective::where('department_id', $departmentId)
            ->where('cycle_id', $cycleId)
            ->where('level', 'unit') // Chỉ tính cấp phòng ban
            ->whereNull('archived_at')
            ->with(['keyResults' => function($q) {
                $q->whereNull('archived_at');
            }])
            ->get();

        if ($objectives->isEmpty()) {
            return ['avg_progress' => 0, 'okr_count' => 0];
        }

        $totalObjectiveProgress = 0;
        $objectiveCount = $objectives->count();

        foreach ($objectives as $obj) {
            $krs = $obj->keyResults;
            if ($krs->isEmpty()) {
                // Nếu Objective không có KR, tiến độ mặc định là 0 (hoặc lấy progress_percent cũ nếu muốn, nhưng ở đây tính strict)
                $totalObjectiveProgress += 0;
                continue;
            }

            $krProgressSum = 0;
            $krCount = $krs->count();

            foreach ($krs as $kr) {
                // Tìm check-in mới nhất của KR tính đến thời điểm snapshotDate
                $lastCheckIn = CheckIn::where('kr_id', $kr->kr_id)
                    ->where('created_at', '<=', $snapshotDate)
                    ->orderByDesc('created_at')
                    ->first();

                if ($lastCheckIn) {
                    $krProgressSum += $lastCheckIn->progress_percent;
                } else {
                    $krProgressSum += 0;
                }
            }

            // Tiến độ của 1 Objective = TB cộng các KR của nó
            $objProgress = $krCount > 0 ? ($krProgressSum / $krCount) : 0;
            $totalObjectiveProgress += $objProgress;
        }

        // Tiến độ phòng ban = TB cộng các Objective
        $deptAvg = $objectiveCount > 0 ? round($totalObjectiveProgress / $objectiveCount, 2) : 0;

        return [
            'avg_progress' => $deptAvg,
            'okr_count' => $objectiveCount
        ];
    }
}