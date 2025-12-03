<?php

namespace App\Console\Commands;

use App\Models\KeyResult;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendCheckInReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'okr:send-checkin-reminders {--days=7 : Số ngày kể từ lần check-in cuối}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Gửi email nhắc nhở check-in OKR cho những user chưa check-in trong tuần';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $days = (int) $this->option('days');
        $now = Carbon::now();
        $cutoffDate = $now->copy()->subDays($days);

        $this->info("🔔 Đang tìm Key Results chưa check-in trong {$days} ngày...");

        // Lấy tất cả Key Results đang active, chưa hoàn thành
        $keyResults = KeyResult::with(['objective.user', 'objective.cycle', 'assignedUser', 'checkIns' => function ($q) {
                $q->latest('created_at')->limit(1);
            }])
            ->where('status', '!=', 'completed')
            ->whereNull('archived_at')
            ->whereHas('objective', function ($q) {
                $q->whereNull('archived_at');
            })
            ->whereHas('objective.cycle', function ($q) {
                $q->where('status', 'active');
            })
            ->get();

        $this->info("📋 Tìm thấy {$keyResults->count()} Key Results đang hoạt động");

        // Nhóm theo user để gửi 1 email tổng hợp
        $userReminders = [];

        foreach ($keyResults as $kr) {
            // Xác định người cần nhận nhắc nhở (người được giao hoặc chủ objective)
            $targetUser = $kr->assignedUser ?? $kr->objective->user ?? null;
            
            if (!$targetUser || !$targetUser->email) {
                continue;
            }

            // Kiểm tra lần check-in cuối
            $latestCheckIn = $kr->checkIns->first();
            $needsReminder = false;
            $daysSince = 0;

            if ($latestCheckIn) {
                $lastCheckInDate = Carbon::parse($latestCheckIn->created_at);
                if ($lastCheckInDate->lt($cutoffDate)) {
                    $needsReminder = true;
                    $daysSince = $now->diffInDays($lastCheckInDate);
                }
            } else {
                // Chưa check-in lần nào
                $needsReminder = true;
                $daysSince = $now->diffInDays(Carbon::parse($kr->created_at));
            }

            if ($needsReminder) {
                $userId = $targetUser->user_id;
                
                if (!isset($userReminders[$userId])) {
                    $userReminders[$userId] = [
                        'user' => $targetUser,
                        'key_results' => [],
                    ];
                }

                $userReminders[$userId]['key_results'][] = [
                    'kr_title' => $kr->kr_title,
                    'objective_title' => $kr->objective->obj_title ?? 'N/A',
                    'progress_percent' => $kr->progress_percent ?? 0,
                    'days_since' => $daysSince,
                ];
            }
        }

        $this->info("👥 Có " . count($userReminders) . " người dùng cần nhắc nhở");

        // Gửi thông báo cho từng user
        $sentCount = 0;
        foreach ($userReminders as $userId => $data) {
            $user = $data['user'];
            $krs = $data['key_results'];
            $krCount = count($krs);

            // Tạo message tổng hợp
            $krTitles = array_slice(array_column($krs, 'kr_title'), 0, 3);
            $krList = implode(', ', $krTitles);
            if ($krCount > 3) {
                $krList .= " và " . ($krCount - 3) . " KR khác";
            }

            $message = "⏰ Nhắc nhở: Bạn có {$krCount} Key Result chưa check-in: {$krList}. Hãy cập nhật tiến độ ngay!";

            // Gửi thông báo (cả email + in-app)
            NotificationService::send(
                $userId,
                $message,
                'reminder',
                null,
                null,
                'Check-in ngay'
            );

            $this->line("  ✅ Đã gửi nhắc nhở cho {$user->full_name} ({$user->email}) - {$krCount} KRs");
            $sentCount++;
        }

        $this->info("🎉 Hoàn thành! Đã gửi {$sentCount} email nhắc nhở.");

        Log::info('Check-in reminders sent', [
            'total_users' => $sentCount,
            'days_threshold' => $days,
        ]);

        return Command::SUCCESS;
    }
}

