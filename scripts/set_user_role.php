<?php
// Quick one-off script to set a user's role by email

use Illuminate\Contracts\Console\Kernel;
use App\Models\User;
use App\Models\Role;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';

/** @var Kernel $kernel */
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$email = $argv[1] ?? null;
$roleName = $argv[2] ?? null;

if (!$email || !$roleName) {
    fwrite(STDERR, "Usage: php scripts/set_user_role.php <email> <RoleName>\n");
    exit(1);
}

$role = Role::where('role_name', $roleName)->first();
if (!$role) {
    fwrite(STDERR, "Role not found: {$roleName}\n");
    exit(1);
}

$user = User::where('email', $email)->first();
if (!$user) {
    fwrite(STDERR, "User not found: {$email}\n");
    exit(1);
}

$user->role_id = $role->role_id;
$user->save();

echo "Updated {$email} to role {$roleName} (role_id={$role->role_id}), user_id={$user->user_id}\n";


