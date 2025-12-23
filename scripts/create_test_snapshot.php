<?php

// Load Laravel app
require __DIR__ . '/../bootstrap/app.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\ReportSnapshot;
use App\Models\Cycle;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// Get first cycle and admin user
$cycle = Cycle::first();
$user = User::first();

if (!$cycle || !$user) {
    echo "❌ Không tìm thấy Cycle hoặc User\n";
    exit(1);
}

echo "📦 Tạo snapshot test...\n";
echo "   Cycle: " . $cycle->cycle_name . "\n";
echo "   User: " . $user->email . "\n\n";

// Create a test snapshot
$snapshot = ReportSnapshot::create([
    'cycle_id' => $cycle->cycle_id,
    'created_by' => $user->user_id,
    'title' => 'Báo cáo OKR ' . now()->format('d/m/Y H:i'),
    'data_snapshot' => json_encode([
        'overall' => [
            'totalObjectives' => 2,
            'averageProgress' => 37.5,
            'statusCounts' => [
                'onTrack' => 1,
                'atRisk' => 0,
                'offTrack' => 1,
            ]
        ],
        'snapshot_time' => now(),
    ]),
    'snapshotted_at' => now(),
]);

echo "✅ Snapshot đã tạo thành công!\n";
echo "   ID: " . $snapshot->id . "\n";
echo "   Title: " . $snapshot->title . "\n";
echo "   Created at: " . $snapshot->created_at . "\n\n";

// List all snapshots
echo "📊 Danh sách tất cả snapshots:\n";
$snapshots = ReportSnapshot::all();
foreach ($snapshots as $snap) {
    echo "   - ID: " . $snap->id . " | " . $snap->title . " | " . $snap->created_at . "\n";
}

echo "\n✨ Test xong! Dữ liệu snapshot đã được lưu.\n";
