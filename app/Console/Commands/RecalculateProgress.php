<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\KeyResult;
use App\Models\CheckIn;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RecalculateProgress extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:recalculate-progress {--kr_id=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculate progress for Key Results based on the latest check-in. Propagates changes to parent Objectives.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $krId = $this->option('kr_id');

        if ($krId) {
            $keyResults = KeyResult::where('kr_id', $krId)->get();
            if ($keyResults->isEmpty()) {
                $this->error("Key Result with ID '{$krId}' not found.");
                return 1;
            }
        } else {
            $this->info('Fetching all Key Results to recalculate progress...');
            $keyResults = KeyResult::all();
        }

        $this->info("Found {$keyResults->count()} Key Result(s) to process.");
        $bar = $this->output->createProgressBar($keyResults->count());
        $bar->start();

        foreach ($keyResults as $keyResult) {
            try {
                DB::transaction(function () use ($keyResult) {
                    // Find the latest check-in for this KR
                    $latestCheckIn = $keyResult->checkIns()->latest('created_at')->first();

                    if ($latestCheckIn) {
                        // If a check-in exists, update the KR with its data
                        $progressValue = $latestCheckIn->progress_value;
                        $calculatedPercent = $latestCheckIn->progress_percent;
                        
                        $newStatus = $keyResult->status;
                         if ($calculatedPercent >= 100) {
                            $newStatus = 'completed';
                        } elseif ($newStatus === 'not_start') {
                            $newStatus = 'on_track';
                        }

                        $keyResult->update([
                            'current_value' => $progressValue,
                            'progress_percent' => $calculatedPercent,
                            'status' => $newStatus,
                        ]);

                    } else {
                        // If no check-ins exist, reset progress to 0
                        $keyResult->update([
                            'current_value' => 0,
                            'progress_percent' => 0,
                            'status' => 'not_start', // Or 'active', depending on desired initial state
                        ]);
                    }

                    // IMPORTANT: Trigger the update propagation to the parent Objective
                    $keyResult->updateProgress();
                });

            } catch (
Exception $e) {
                $this->error("\nFailed to process Key Result ID {$keyResult->kr_id}: " . $e->getMessage());
                Log::error("Error recalculating progress for KR {$keyResult->kr_id}", ['error' => $e]);
            }
            $bar->advance();
        }

        $bar->finish();
        $this->info("\n\nProgress recalculation complete.");

        return 0;
    }
}
