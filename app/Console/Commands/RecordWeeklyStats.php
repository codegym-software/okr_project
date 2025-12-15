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
     */
    private function calculateStatsForWeek($departmentId, $cycleId, Carbon $snapshotDate)
    {
        // 1. Lấy các KR thuộc về phòng ban trong chu kỳ này
        $krIds = KeyResult::whereHas('objective', function($q) use ($departmentId, $cycleId) {
            $q->where('department_id', $departmentId)
              ->where('cycle_id', $cycleId)
              ->whereNull('archived_at');
        })->pluck('kr_id');

        if ($krIds->isEmpty()) {
            return ['avg_progress' => 0, 'okr_count' => 0];
        }

        // 2. Với mỗi KR, tìm check-in mới nhất TÍNH ĐẾN thời điểm snapshotDate
        $totalProgress = 0;
        $count = $krIds->count();

        foreach ($krIds as $krId) {
            $lastCheckIn = CheckIn::where('kr_id', $krId)
                ->where('created_at', '<=', $snapshotDate) // Quan trọng: Chỉ lấy dữ liệu quá khứ
                ->orderByDesc('created_at')
                ->first();

            if ($lastCheckIn) {
                $totalProgress += $lastCheckIn->progress_percent;
            } else {
                // Nếu chưa có check-in nào tính đến lúc đó -> 0%
                $totalProgress += 0;
            }
        }

        $avg = $count > 0 ? round($totalProgress / $count, 2) : 0;

        return [
            'avg_progress' => $avg,
            'okr_count' => $count
        ];
    }
}