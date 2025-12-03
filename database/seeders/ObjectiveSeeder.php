<?php

namespace Database\Seeders;

use App\Models\Objective;
use App\Models\KeyResult;
use App\Models\Cycle;
use App\Models\Department;
use App\Models\User;
use App\Models\CheckIn;
use Illuminate\Database\Seeder;

class ObjectiveSeeder extends Seeder
{
    public function run(): void
    {
        $cycle = Cycle::where('cycle_name', 'OKR Q4 2025')->first();
        $admin = User::first();
        $itDept = Department::where('d_name', 'IT Department')->first();
        $backendTeam = Department::where('d_name', 'Backend Team')->first();
        $frontendTeam = Department::where('d_name', 'Frontend Team')->first();
        $salesDept = Department::where('d_name', 'Sales Department')->first();

        if (!$cycle || !$admin) return;

        // IT Department - Company Level OKRs
        if ($itDept) {
            $obj1 = Objective::create([
                'obj_title' => 'Improve System Performance & Reliability',
                'description' => 'Enhance platform stability and user experience through infrastructure optimization',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $itDept->department_id,
                'user_id' => $admin->user_id,
                'status' => 'on_track',
                'progress_percent' => 60,
                'level' => 'company',
            ]);

            // Key Results for Objective 1
            KeyResult::create([
                'objective_id' => $obj1->objective_id,
                'kr_title' => 'Reduce API response time to <200ms',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $itDept->department_id,
                'user_id' => $admin->user_id,
                'target_value' => 200,
                'current_value' => 320,
                'unit' => 'ms',
                'status' => 'at_risk',
                'progress_percent' => 65,
            ]);

            KeyResult::create([
                'objective_id' => $obj1->objective_id,
                'kr_title' => 'Achieve 99.9% uptime',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $itDept->department_id,
                'user_id' => $admin->user_id,
                'target_value' => 99.9,
                'current_value' => 99.8,
                'unit' => '%',
                'status' => 'on_track',
                'progress_percent' => 99,
            ]);
        }

        // Backend Team - Department Level OKRs
        if ($backendTeam) {
            $obj2 = Objective::create([
                'obj_title' => 'Complete API Refactoring',
                'description' => 'Modernize REST API with better structure and documentation',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $backendTeam->department_id,
                'user_id' => $admin->user_id,
                'status' => 'on_track',
                'progress_percent' => 75,
                'level' => 'department',
            ]);

            KeyResult::create([
                'objective_id' => $obj2->objective_id,
                'kr_title' => 'Refactor 80% of API endpoints',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $backendTeam->department_id,
                'user_id' => $admin->user_id,
                'target_value' => 80,
                'current_value' => 75,
                'unit' => '%',
                'status' => 'on_track',
                'progress_percent' => 75,
            ]);
        }

        // Frontend Team - Department Level OKRs
        if ($frontendTeam) {
            $obj3 = Objective::create([
                'obj_title' => 'Improve User Interface & Experience',
                'description' => 'Redesign dashboard with modern components',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $frontendTeam->department_id,
                'user_id' => $admin->user_id,
                'status' => 'off_track',
                'progress_percent' => 40,
                'level' => 'department',
            ]);

            KeyResult::create([
                'objective_id' => $obj3->objective_id,
                'kr_title' => 'Complete redesign of 5 core pages',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $frontendTeam->department_id,
                'user_id' => $admin->user_id,
                'target_value' => 5,
                'current_value' => 2,
                'unit' => 'pages',
                'status' => 'off_track',
                'progress_percent' => 40,
            ]);

            KeyResult::create([
                'objective_id' => $obj3->objective_id,
                'kr_title' => 'Achieve 90% accessibility score',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $frontendTeam->department_id,
                'user_id' => $admin->user_id,
                'target_value' => 90,
                'current_value' => 75,
                'unit' => '%',
                'status' => 'at_risk',
                'progress_percent' => 75,
            ]);
        }

        // Sales Department - Company Level OKRs
        if ($salesDept) {
            $obj4 = Objective::create([
                'obj_title' => 'Increase Revenue by 40%',
                'description' => 'Grow annual recurring revenue through new customer acquisition',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $salesDept->department_id,
                'user_id' => $admin->user_id,
                'status' => 'on_track',
                'progress_percent' => 55,
                'level' => 'company',
            ]);

            KeyResult::create([
                'objective_id' => $obj4->objective_id,
                'kr_title' => 'Acquire 50 new enterprise customers',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $salesDept->department_id,
                'user_id' => $admin->user_id,
                'target_value' => 50,
                'current_value' => 28,
                'unit' => 'customers',
                'status' => 'on_track',
                'progress_percent' => 56,
            ]);

            KeyResult::create([
                'objective_id' => $obj4->objective_id,
                'kr_title' => 'Grow SME customer base to 200',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $salesDept->department_id,
                'user_id' => $admin->user_id,
                'target_value' => 200,
                'current_value' => 85,
                'unit' => 'customers',
                'status' => 'on_track',
                'progress_percent' => 42,
            ]);
        }

        // Personal OKRs for Admin User
        $obj5 = Objective::create([
            'obj_title' => 'Build OKR Culture & Alignment',
            'description' => 'Help team members develop strong OKRs aligned with company goals',
            'cycle_id' => $cycle->cycle_id,
            'department_id' => null, // Personal
            'user_id' => $admin->user_id,
            'status' => 'on_track',
            'progress_percent' => 50,
            'level' => 'personal',
        ]);

        KeyResult::create([
            'objective_id' => $obj5->objective_id,
            'kr_title' => 'All teams complete their OKRs',
            'cycle_id' => $cycle->cycle_id,
            'department_id' => null,
            'user_id' => $admin->user_id,
            'target_value' => 100,
            'current_value' => 50,
            'unit' => '%',
            'status' => 'on_track',
            'progress_percent' => 50,
        ]);
    }
}
