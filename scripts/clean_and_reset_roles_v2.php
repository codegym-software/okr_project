<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧹 Làm sạch và reset roles theo cấu trúc trong ảnh...\n\n";

// 1. Tắt foreign key checks
echo "🔧 Tắt foreign key checks...\n";
DB::statement('SET FOREIGN_KEY_CHECKS=0;');

// 2. Xóa tất cả users
echo "🗑️  Xóa tất cả users...\n";
User::truncate();

// 3. Xóa tất cả roles
echo "🗑️  Xóa tất cả roles...\n";
Role::truncate();

// 4. Bật lại foreign key checks
echo "🔧 Bật lại foreign key checks...\n";
DB::statement('SET FOREIGN_KEY_CHECKS=1;');

// 5. Tạo lại 5 roles theo đúng cấu trúc trong ảnh
echo "➕ Tạo lại 5 roles theo cấu trúc trong ảnh...\n";

$roles = [
    [
        'role_name' => 'admin',
        'description' => 'Quản trị viên hệ thống',
        'level' => 'company',
        'allowed_levels' => json_encode(['company', 'unit', 'team', 'person']),
    ],
    [
        'role_name' => 'manager',
        'description' => 'Quản lý cấp đơn vị',
        'level' => 'unit',
        'allowed_levels' => json_encode(['unit', 'team', 'person']),
    ],
    [
        'role_name' => 'manager',
        'description' => 'Quản lý cấp đội nhóm',
        'level' => 'team',
        'allowed_levels' => json_encode(['team', 'person']),
    ],
    [
        'role_name' => 'member',
        'description' => 'Thành viên cấp đơn vị',
        'level' => 'unit',
        'allowed_levels' => json_encode(['person']),
    ],
    [
        'role_name' => 'member',
        'description' => 'Thành viên cấp nhóm',
        'level' => 'team',
        'allowed_levels' => json_encode(['person']),
    ],
];

foreach ($roles as $roleData) {
    Role::create($roleData);
}

// 6. Tạo lại user admin
echo "👤 Tạo lại user admin...\n";
$adminRole = Role::find(1); // admin role

$adminUser = User::create([
    'email' => 'okr.admin@company.com',
    'full_name' => 'System Administrator',
    'role_id' => $adminRole->role_id,
    'sub' => 'admin-' . time(),
    'status' => 'active',
    'is_invited' => false,
]);

// 7. Tạo user member
echo "👤 Tạo user member...\n";
$memberRole = Role::where('role_name', 'member')
                 ->where('level', 'unit')
                 ->first();

$memberUser = User::create([
    'email' => 'anh249205@gmail.com',
    'full_name' => 'Nguyễn Đình Tuấn Anh',
    'role_id' => $memberRole->role_id,
    'sub' => 'member-' . time(),
    'status' => 'active',
    'is_invited' => false,
]);

echo "\n✅ Hoàn thành! Kiểm tra kết quả:\n\n";

// Hiển thị kết quả
$allRoles = Role::orderBy('role_id')->get();
echo "📋 Danh sách roles (5 roles):\n";
echo str_repeat("-", 80) . "\n";
printf("%-8s %-12s %-30s %-12s %-20s\n", "ID", "Role Name", "Description", "Level", "Allowed Levels");
echo str_repeat("-", 80) . "\n";

foreach ($allRoles as $role) {
    $allowedLevels = $role->allowed_levels ? json_decode($role->allowed_levels, true) : [];
    $allowedLevelsStr = is_array($allowedLevels) ? implode(', ', $allowedLevels) : 'N/A';

    printf("%-8s %-12s %-30s %-12s %-20s\n",
        $role->role_id,
        $role->role_name,
        $role->description,
        $role->level,
        $allowedLevelsStr
    );
}

echo str_repeat("-", 80) . "\n\n";

echo "👤 User admin:\n";
echo "   - Email: {$adminUser->email}\n";
echo "   - Role ID: {$adminUser->role_id} (admin)\n";
echo "   - isAdmin(): " . ($adminUser->isAdmin() ? "✅ TRUE" : "❌ FALSE") . "\n";

echo "\n🎉 Database đã được reset và khớp hoàn toàn với ảnh của bạn!\n";
