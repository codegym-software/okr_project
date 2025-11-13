<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Objective;
use App\Models\KeyResult;
use App\Models\Cycle;
use App\Models\Department;
use App\Models\CheckIn;
use App\Http\Controllers\CheckInController;
use Illuminate\Support\Facades\DB;

class TestFullFunctionality extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:full-functionality';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test all OKR functionality to ensure everything works after setup';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🧪 OKR Full Functionality Test');
        $this->info('==============================');

        $tests = [
            'Database Connection' => [$this, 'testDatabaseConnection'],
            'User Roles' => [$this, 'testUserRoles'],
            'Objective Creation' => [$this, 'testObjectiveCreation'],
            'KeyResult Creation' => [$this, 'testKeyResultCreation'],
            'Check-in Functionality' => [$this, 'testCheckInFunctionality'],
            'Department Check-in' => [$this, 'testDepartmentCheckIn'],
            'Permission System' => [$this, 'testPermissionSystem'],
            'Data Integrity' => [$this, 'testDataIntegrity'],
        ];

        $passed = 0;
        $total = count($tests);

        foreach ($tests as $testName => $testMethod) {
            $this->info("\n🔍 Testing: {$testName}");
            try {
                $result = $testMethod();
                if ($result) {
                    $this->info("✅ {$testName}: PASSED");
                    $passed++;
                } else {
                    $this->error("❌ {$testName}: FAILED");
                }
            } catch (\Exception $e) {
                $this->error("❌ {$testName}: ERROR - " . $e->getMessage());
            }
        }

        $this->info("\n📊 Test Results");
        $this->info("===============");
        $this->info("Passed: {$passed}/{$total}");
        
        if ($passed === $total) {
            $this->info("🎉 All tests passed! OKR system is ready to use.");
            $this->info("✅ Users can create Objectives and KeyResults");
            $this->info("✅ Check-in functionality works properly");
            $this->info("✅ Same department users can check-in for each other");
            return 0;
        } else {
            $this->error("⚠️  Some tests failed. Please check the issues above.");
            return 1;
        }
    }

    private function testDatabaseConnection()
    {
        try {
            $userCount = User::count();
            $this->info("   Database connected. Found {$userCount} users.");
            return true;
        } catch (\Exception $e) {
            $this->error("   Database connection failed: " . $e->getMessage());
            return false;
        }
    }

    private function testUserRoles()
    {
        $usersWithoutRole = User::whereNull('role_id')->count();
        if ($usersWithoutRole > 0) {
            $this->error("   Found {$usersWithoutRole} users without roles");
            return false;
        }
        
        $this->info("   All users have roles assigned");
        return true;
    }

    private function testObjectiveCreation()
    {
        $user = User::with('role')->first();
        $cycle = Cycle::first();
        
        if (!$user || !$cycle) {
            $this->error("   Missing required data (user or cycle)");
            return false;
        }

        try {
            $objective = Objective::create([
                'obj_title' => 'Test Objective ' . time(),
                'description' => 'Test objective for functionality test',
                'level' => 'person',
                'status' => 'draft',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => null,
                'user_id' => $user->user_id,
            ]);

            $this->info("   Created objective ID: {$objective->objective_id}");
            
            // Cleanup
            $objective->delete();
            return true;
        } catch (\Exception $e) {
            $this->error("   Objective creation failed: " . $e->getMessage());
            return false;
        }
    }

    private function testKeyResultCreation()
    {
        $user = User::with('role')->first();
        $cycle = Cycle::first();
        
        if (!$user || !$cycle) {
            $this->error("   Missing required data (user or cycle)");
            return false;
        }

        try {
            // Create objective first
            $objective = Objective::create([
                'obj_title' => 'Test Objective for KR ' . time(),
                'description' => 'Test objective for KR test',
                'level' => 'person',
                'status' => 'draft',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => null,
                'user_id' => $user->user_id,
            ]);

            // Create key result
            $keyResult = KeyResult::create([
                'kr_title' => 'Test KeyResult ' . time(),
                'target_value' => 100,
                'current_value' => 0,
                'unit' => 'number',
                'status' => 'draft',
                'progress_percent' => 0,
                'objective_id' => $objective->objective_id,
                'cycle_id' => $cycle->cycle_id,
                'department_id' => null,
                'user_id' => $user->user_id,
            ]);

            $this->info("   Created key result ID: {$keyResult->kr_id}");
            
            // Cleanup
            $keyResult->delete();
            $objective->delete();
            return true;
        } catch (\Exception $e) {
            $this->error("   KeyResult creation failed: " . $e->getMessage());
            return false;
        }
    }

    private function testCheckInFunctionality()
    {
        $user = User::with('role')->first();
        $cycle = Cycle::first();
        
        if (!$user || !$cycle) {
            $this->error("   Missing required data (user or cycle)");
            return false;
        }

        try {
            // Create objective and key result
            $objective = Objective::create([
                'obj_title' => 'Test Objective for CheckIn ' . time(),
                'description' => 'Test objective for check-in test',
                'level' => 'person',
                'status' => 'draft',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => null,
                'user_id' => $user->user_id,
            ]);

            $keyResult = KeyResult::create([
                'kr_title' => 'Test KeyResult for CheckIn ' . time(),
                'target_value' => 100,
                'current_value' => 0,
                'unit' => 'number',
                'status' => 'draft',
                'progress_percent' => 0,
                'objective_id' => $objective->objective_id,
                'cycle_id' => $cycle->cycle_id,
                'department_id' => null,
                'user_id' => $user->user_id,
            ]);

            // Create check-in
            $checkIn = CheckIn::create([
                'kr_id' => $keyResult->kr_id,
                'user_id' => $user->user_id,
                'progress_value' => 50,
                'progress_percent' => 50,
                'notes' => 'Test check-in',
                'check_in_type' => 'percentage',
                'is_completed' => false,
            ]);

            $this->info("   Created check-in ID: {$checkIn->check_in_id}");
            
            // Cleanup
            $checkIn->delete();
            $keyResult->delete();
            $objective->delete();
            return true;
        } catch (\Exception $e) {
            $this->error("   Check-in creation failed: " . $e->getMessage());
            return false;
        }
    }

    private function testDepartmentCheckIn()
    {
        try {
            // Setup test data first
            $this->call('setup:test-data');
            
            // Get department with users
            $department = Department::whereHas('users')->with('users')->first();
            if (!$department) {
                $this->error("   No department with users found");
                return false;
            }

            $users = $department->users()->with('role')->take(2)->get();
            if ($users->count() < 2) {
                $this->error("   Need at least 2 users in same department");
                return false;
            }

            $user1 = $users[0];
            $user2 = $users[1];
            $cycle = Cycle::first();

            // Create objective and key result
            $objective = Objective::create([
                'obj_title' => 'Test Department Objective ' . time(),
                'description' => 'Test objective for department check-in',
                'level' => 'unit',
                'status' => 'draft',
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $department->department_id,
                'user_id' => $user1->user_id,
            ]);

            $keyResult = KeyResult::create([
                'kr_title' => 'Test Department KeyResult ' . time(),
                'target_value' => 100,
                'current_value' => 0,
                'unit' => 'number',
                'status' => 'draft',
                'progress_percent' => 0,
                'objective_id' => $objective->objective_id,
                'cycle_id' => $cycle->cycle_id,
                'department_id' => $department->department_id,
                'user_id' => $user1->user_id,
            ]);

            // Test check-in permission
            $checkInController = new CheckInController();
            $reflection = new \ReflectionClass($checkInController);
            $canCheckInMethod = $reflection->getMethod('canCheckIn');
            $canCheckInMethod->setAccessible(true);
            
            $canCheckIn = $canCheckInMethod->invoke($checkInController, $user2, $keyResult);
            
            if ($canCheckIn) {
                $this->info("   Users in same department can check-in for each other");
                
                // Cleanup
                $keyResult->delete();
                $objective->delete();
                return true;
            } else {
                $this->error("   Users in same department cannot check-in for each other");
                return false;
            }
        } catch (\Exception $e) {
            $this->error("   Department check-in test failed: " . $e->getMessage());
            return false;
        }
    }

    private function testPermissionSystem()
    {
        $users = User::with('role')->take(3)->get();
        
        if ($users->count() < 1) {
            $this->error("   Not enough users to test permissions");
            return false;
        }

        try {
            foreach ($users as $user) {
                $roleName = $user->role ? $user->role->role_name : 'No role';
                $this->info("   User {$user->email} has role: {$roleName}");
                
                // Test basic permission methods
                if ($user->role) {
                    $isAdmin = $user->isAdmin();
                    $isManager = $user->isManager();
                    $isMember = $user->isMember();
                    
                    $this->info("     - Admin: " . ($isAdmin ? 'Yes' : 'No'));
                    $this->info("     - Manager: " . ($isManager ? 'Yes' : 'No'));
                    $this->info("     - Member: " . ($isMember ? 'Yes' : 'No'));
                }
            }
            
            return true;
        } catch (\Exception $e) {
            $this->error("   Permission system test failed: " . $e->getMessage());
            return false;
        }
    }

    private function testDataIntegrity()
    {
        try {
            // Check for invalid progress_percent
            $invalidProgress = KeyResult::where('progress_percent', '<', 0)
                ->orWhere('progress_percent', '>', 100)
                ->count();

            if ($invalidProgress > 0) {
                $this->error("   Found {$invalidProgress} key results with invalid progress_percent");
                return false;
            }

            // Check for negative current_value
            $negativeCurrentValue = KeyResult::where('current_value', '<', 0)->count();
            
            if ($negativeCurrentValue > 0) {
                $this->error("   Found {$negativeCurrentValue} key results with negative current_value");
                return false;
            }

            // Check for orphaned records
            $orphanedObjectives = Objective::whereNotNull('user_id')
                ->whereNotExists(function($query) {
                    $query->select(DB::raw(1))
                        ->from('users')
                        ->whereColumn('users.user_id', 'objectives.user_id');
                })
                ->count();

            if ($orphanedObjectives > 0) {
                $this->error("   Found {$orphanedObjectives} orphaned objectives");
                return false;
            }

            $this->info("   All data integrity checks passed");
            return true;
        } catch (\Exception $e) {
            $this->error("   Data integrity test failed: " . $e->getMessage());
            return false;
        }
    }
}
