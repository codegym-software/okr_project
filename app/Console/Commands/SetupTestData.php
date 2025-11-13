<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Department;
use App\Models\Role;

class SetupTestData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'setup:test-data';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Setup test data for department check-in testing';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔧 Setting up test data for department check-in...');

        try {
            // Lấy department đầu tiên
            $department = Department::first();
            if (!$department) {
                $this->error('No department found. Please create departments first.');
                return 1;
            }

            $this->info("Using department: {$department->d_name} (ID: {$department->department_id})");

            // Lấy role member
            $memberRole = Role::where('role_name', 'member')->first();
            if (!$memberRole) {
                $this->error('Member role not found. Please create roles first.');
                return 1;
            }

            // Kiểm tra users hiện có trong department
            $existingUsers = User::where('department_id', $department->department_id)->count();
            $this->info("Existing users in department: {$existingUsers}");

            // Tạo thêm users nếu cần
            $usersToCreate = max(0, 2 - $existingUsers);
            
            if ($usersToCreate > 0) {
                $this->info("Creating {$usersToCreate} additional users...");
                
                for ($i = 1; $i <= $usersToCreate; $i++) {
                    $user = User::create([
                        'email' => "test.user{$i}@company.com",
                        'full_name' => "Test User {$i}",
                        'department_id' => $department->department_id,
                        'role_id' => $memberRole->role_id,
                    ]);
                    
                    $this->info("Created user: {$user->email}");
                }
            }

            // Hiển thị tất cả users trong department
            $users = User::where('department_id', $department->department_id)->with('role')->get();
            $this->info("\nUsers in department:");
            foreach ($users as $user) {
                $roleName = $user->role ? $user->role->role_name : 'No role';
                $this->info("- {$user->email} (Role: {$roleName})");
            }

            $this->info("\n✅ Test data setup completed!");
            $this->info("You can now run: php artisan test:department-checkin");

            return 0;

        } catch (\Exception $e) {
            $this->error("❌ Error setting up test data: " . $e->getMessage());
            return 1;
        }
    }
}