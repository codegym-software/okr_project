<?php

require __DIR__ . '/../vendor/autoload.php';

use Illuminate\Support\Facades\DB;

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Starting backfill of user_id for key_results...\n\n";

try {
    // Lấy tất cả key results chưa có user_id
    $keyResults = DB::table('key_results')
        ->whereNull('user_id')
        ->get();

    echo "Found " . $keyResults->count() . " key results without user_id\n\n";

    $updated = 0;
    $skipped = 0;

    foreach ($keyResults as $kr) {
        // Lấy objective của key result này
        $objective = DB::table('objectives')
            ->where('objective_id', $kr->objective_id)
            ->first();

        if ($objective && $objective->user_id) {
            // Cập nhật user_id của key result bằng user_id của objective
            DB::table('key_results')
                ->where('kr_id', $kr->kr_id)
                ->update(['user_id' => $objective->user_id]);
            
            echo "✓ Updated KR #{$kr->kr_id} ({$kr->kr_title}) with user_id: {$objective->user_id}\n";
            $updated++;
        } else {
            echo "✗ Skipped KR #{$kr->kr_id} ({$kr->kr_title}) - objective has no user_id\n";
            $skipped++;
        }
    }

    echo "\n=== Summary ===\n";
    echo "Total key results: " . $keyResults->count() . "\n";
    echo "Updated: {$updated}\n";
    echo "Skipped: {$skipped}\n";
    echo "\nBackfill completed successfully!\n";

} catch (\Exception $e) {
    echo "\n❌ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}

