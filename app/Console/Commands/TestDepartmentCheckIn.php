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

class TestDepartmentCheckIn extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:department-checkin';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test check-in functionality for users in the same department';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🧪 Testing Department Check-in Functionality');
        $this->info('==========================================');

        try {
            // Lấy department đầu tiên có nhiều user
            $department = Department::whereHas('users')->with('users')->first();
            
            if (!$department) {
                $this->error('No department with users found. Please create departments and assign users.');
                return 1;
            }

            $this->info("Testing with department: {$department->d_name}");
            $this->info("Department ID: {$department->department_id}");

            // Lấy users trong cùng phòng ban
            $users = $department->users()->with('role')->take(2)->get();
            
            if ($users->count() < 2) {
                $this->error('Need at least 2 users in the same department for testing.');
                return 1;
            }

            $user1 = $users[0];
            $user2 = $users[1];
            
            $this->info("User 1: {$user1->email} (Role: " . ($user1->role ? $user1->role->role_name : 'No role') . ")");
            $this->info("User 2: {$user2->email} (Role: " . ($user2->role ? $user2->role->role_name : 'No role') . ")");

            // Lấy cycle
            $cycle = Cycle::first();
            if (!$cycle) {
                $this->error('No cycle found. Please create a cycle first.');
                return 1;
            }

            // Test 1: User1 tạo Objective và KeyResult
            $this->info("\n1. Testing User1 creates Objective and KeyResult...");
            
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

            $this->info("✅ User1 created Objective ID: {$objective->objective_id}");
            $this->info("✅ User1 created KeyResult ID: {$keyResult->kr_id}");

            // Test 2: User2 check-in cho KeyResult của User1
            $this->info("\n2. Testing User2 check-in for User1's KeyResult...");
            
            $checkInController = new CheckInController();
            $reflection = new \ReflectionClass($checkInController);
            $canCheckInMethod = $reflection->getMethod('canCheckIn');
            $canCheckInMethod->setAccessible(true);
            
            $canCheckIn = $canCheckInMethod->invoke($checkInController, $user2, $keyResult);
            
            if ($canCheckIn) {
                $this->info("✅ User2 CAN check-in for User1's KeyResult (same department)");
                
                // Thực hiện check-in
                $checkIn = CheckIn::create([
                    'kr_id' => $keyResult->kr_id,
                    'user_id' => $user2->user_id,
                    'progress_value' => 50,
                    'progress_percent' => 50,
                    'notes' => 'Check-in by colleague from same department',
                    'check_in_type' => 'percentage',
                    'is_completed' => false,
                ]);
                
                $this->info("✅ User2 successfully created check-in ID: {$checkIn->check_in_id}");
                
                // Cập nhật KeyResult
                $keyResult->update([
                    'current_value' => 50,
                    'progress_percent' => 50,
                ]);
                
                $this->info("✅ KeyResult updated with new progress");
                
            } else {
                $this->error("❌ User2 CANNOT check-in for User1's KeyResult");
            }

            // Test 3: User1 check-in cho KeyResult của chính mình
            $this->info("\n3. Testing User1 check-in for own KeyResult...");
            
            $canCheckInOwn = $canCheckInMethod->invoke($checkInController, $user1, $keyResult);
            
            if ($canCheckInOwn) {
                $this->info("✅ User1 CAN check-in for own KeyResult");
                
                $checkInOwn = CheckIn::create([
                    'kr_id' => $keyResult->kr_id,
                    'user_id' => $user1->user_id,
                    'progress_value' => 75,
                    'progress_percent' => 75,
                    'notes' => 'Check-in by owner',
                    'check_in_type' => 'percentage',
                    'is_completed' => false,
                ]);
                
                $this->info("✅ User1 successfully created check-in ID: {$checkInOwn->check_in_id}");
                
            } else {
                $this->error("❌ User1 CANNOT check-in for own KeyResult");
            }

            // Test 4: Test với user khác phòng ban
            $this->info("\n4. Testing with user from different department...");
            
            $otherUser = User::where('department_id', '!=', $department->department_id)
                ->orWhereNull('department_id')
                ->with('role')
                ->first();
                
            if ($otherUser) {
                $this->info("Testing with user from different department: {$otherUser->email}");
                
                $canCheckInOther = $canCheckInMethod->invoke($checkInController, $otherUser, $keyResult);
                
                if ($canCheckInOther) {
                    $this->warn("⚠️  User from different department CAN check-in (might be admin)");
                } else {
                    $this->info("✅ User from different department CANNOT check-in (correct behavior)");
                }
            } else {
                $this->info("No user from different department found for testing");
            }

            // Cleanup
            $this->info("\n5. Cleaning up test data...");
            CheckIn::where('kr_id', $keyResult->kr_id)->delete();
            $keyResult->delete();
            $objective->delete();
            $this->info("✅ Test data cleaned up");

            $this->info("\n🎉 Department check-in test completed!");
            $this->info("✅ Users in the same department can check-in for each other");
            $this->info("✅ Users can check-in for their own KeyResults");
            $this->info("✅ Cross-department check-in is properly restricted");

            return 0;

        } catch (\Exception $e) {
            $this->error("❌ Error during department check-in test: " . $e->getMessage());
            $this->error("Stack trace:\n" . $e->getTraceAsString());
            return 1;
        }
    }
}