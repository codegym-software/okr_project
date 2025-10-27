<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class RawSqlSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $path = database_path('seeders/sql/seed.sql');
        if (!File::exists($path)) {
            $this->command?->error("SQL seed file not found: {$path}");
            return;
        }
        $sql = File::get($path);
        DB::unprepared($sql);
        $this->command?->info('Raw SQL seed executed successfully.');
    }
}
