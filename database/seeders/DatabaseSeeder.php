<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,        // Tạo các roles trước
            DefaultAdminSeeder::class, // Tạo admin user sau
            DepartmentSeeder::class,   // Tạo departments và sub-teams
            CycleSeeder::class,        // Tạo chu kỳ OKR
            ObjectiveSeeder::class,    // Tạo objectives và key results
        ]);
    }
}
