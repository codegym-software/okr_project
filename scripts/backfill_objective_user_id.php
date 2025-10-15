<?php

/**
 * Script để backfill user_id cho các objectives có user_id = NULL
 * Gán user_id của tài khoản hiện tại (hoặc admin đầu tiên)
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Objective;
use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "=== Backfill Objective user_id ===\n\n";

try {
    // Tìm tất cả objectives có user_id = NULL
    $objectivesWithoutUser = Objective::whereNull('user_id')->get();
    
    echo "Found {$objectivesWithoutUser->count()} objectives without user_id\n\n";
    
    if ($objectivesWithoutUser->isEmpty()) {
        echo "No objectives to update. All objectives already have user_id.\n";
        exit(0);
    }
    
    // Lấy user hiện tại hoặc admin đầu tiên
    $defaultUser = User::whereHas('role', function($query) {
        $query->where('role_name', 'admin');
    })->first();
    
    if (!$defaultUser) {
        // Nếu không có admin, lấy user đầu tiên
        $defaultUser = User::first();
    }
    
    if (!$defaultUser) {
        echo "ERROR: No users found in database. Please create a user first.\n";
        exit(1);
    }
    
    echo "Default user selected: {$defaultUser->email} (ID: {$defaultUser->user_id})\n";
    echo "Role: " . ($defaultUser->role ? $defaultUser->role->role_name : 'N/A') . "\n\n";
    
    // Hỏi xác nhận
    echo "This will update {$objectivesWithoutUser->count()} objectives.\n";
    echo "Do you want to continue? (yes/no): ";
    $handle = fopen("php://stdin", "r");
    $line = trim(fgets($handle));
    fclose($handle);
    
    if (strtolower($line) !== 'yes') {
        echo "Aborted.\n";
        exit(0);
    }
    
    echo "\nUpdating objectives...\n\n";
    
    $updated = 0;
    
    DB::transaction(function() use ($objectivesWithoutUser, $defaultUser, &$updated) {
        foreach ($objectivesWithoutUser as $objective) {
            // Gán user_id
            $objective->user_id = $defaultUser->user_id;
            $objective->save();
            
            $updated++;
            echo "✓ Updated Objective #{$objective->objective_id}: {$objective->obj_title}\n";
        }
    });
    
    echo "\n=== Summary ===\n";
    echo "Total objectives updated: {$updated}\n";
    echo "Assigned to user: {$defaultUser->email}\n";
    echo "\nDone!\n";
    
} catch (\Exception $e) {
    echo "\nERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

