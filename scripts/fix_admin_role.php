<?php
// Bootstrap Laravel application context so we can use Eloquent models

define('LARAVEL_START', microtime(true));

$app = require __DIR__ . '/../bootstrap/app.php';

// Bootstrap Console Kernel
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Do the role fix
try {
    $adminRoleId = \App\Models\Role::where('role_name', 'Admin')->value('role_id');
    if (!$adminRoleId) {
        throw new RuntimeException('Admin role not found');
    }

    $affected = \App\Models\User::where('email', 'okr.admin@company.com')
        ->update([
            'role_id' => $adminRoleId,
            'status' => 'active',
        ]);

    // Clear users cache to reflect immediately on admin page
    \Cache::forget('users_list');

    echo "Updated okr.admin@company.com to Admin role. Rows affected: {$affected}\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Error: ' . $e->getMessage() . "\n");
    exit(1);
}



