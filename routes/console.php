<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Tasks - Lịch chạy tự động
|--------------------------------------------------------------------------
*/

// Nhắc nhở check-in đầu tuần (Thứ 2 lúc 9h sáng)
// Gửi cho những KR chưa check-in trong 7 ngày
Schedule::command('okr:send-checkin-reminders --days=7')
    ->weeklyOn(1, '09:00') // Thứ 2
    ->timezone('Asia/Ho_Chi_Minh')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/checkin-reminders.log'));

// Nhắc nhở lần 2 giữa tuần (Thứ 5 lúc 9h sáng)
// Cho những ai vẫn chưa check-in sau lần nhắc thứ 2
Schedule::command('okr:send-checkin-reminders --days=3')
    ->weeklyOn(4, '09:00') // Thứ 5
    ->timezone('Asia/Ho_Chi_Minh')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/checkin-reminders.log'));

// Tự động snapshot dữ liệu báo cáo tuần (Chạy mỗi giờ để backfill nếu server bị tắt)
// Chỉ tính toán và lưu những tuần chưa có dữ liệu
Schedule::command('reports:sync-weekly')
    ->hourly()
    ->timezone('Asia/Ho_Chi_Minh')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/weekly-stats.log'));
