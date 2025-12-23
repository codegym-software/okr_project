<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class RecalculateOkrProgress extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'okr:recalculate-progress';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculates the progress of all OKRs based on their check-ins.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting OKR progress recalculation...');
        
        Artisan::call('app:recalculate-progress');
        
        $this->info('OKR progress recalculation finished.');
        
        return 0;
    }
}
