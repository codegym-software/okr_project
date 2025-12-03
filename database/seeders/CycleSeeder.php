<?php

namespace Database\Seeders;

use App\Models\Cycle;
use App\Models\Objective;
use App\Models\KeyResult;
use App\Models\CheckIn;
use Illuminate\Database\Seeder;

class CycleSeeder extends Seeder
{
    public function run(): void
    {
        // Create cycles
        $q4_2025 = Cycle::create([
            'cycle_name' => 'OKR Q4 2025',
            'start_date' => '2025-10-01',
            'end_date' => '2025-12-31',
            'status' => 'active',
        ]);

        $q1_2026 = Cycle::create([
            'cycle_name' => 'OKR Q1 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-03-31',
            'status' => 'planning',
        ]);
    }
}
