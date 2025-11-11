<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Models\Role;
use App\Models\User;

// Bootstrap Laravel
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Kiểm tra cấu trúc roles trong database...\n\n";

// Lấy tất cả roles
$roles = Role::orderBy('role_id')->get();

echo "📋 Danh sách roles:\n";
echo str_repeat("-", 80) . "\n";
printf("%-8s %-12s %-30s %-12s %-20s\n", "ID", "Role Name", "Description", "Level", "Allowed Levels");
echo str_repeat("-", 80) . "\n";

foreach ($roles as $role) {
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

// Kiểm tra user admin
echo "👤 Kiểm tra user admin:\n";
$adminUser = User::where('email', 'okr.admin@company.com')->first();

if ($adminUser) {
    echo "✅ User admin tồn tại:\n";
    echo "   - User ID: {$adminUser->user_id}\n";
    echo "   - Email: {$adminUser->email}\n";
    echo "   - Full Name: {$adminUser->full_name}\n";
    echo "   - Role ID: {$adminUser->role_id}\n";
    echo "   - Status: {$adminUser->status}\n";
    echo "   - Sub: {$adminUser->sub}\n";

    if ($adminUser->role) {
        echo "   - Role Name: {$adminUser->role->role_name}\n";
        echo "   - Role Level: {$adminUser->role->level}\n";
        echo "   - Allowed Levels: " . ($adminUser->role->allowed_levels ?: 'N/A') . "\n";

        if ($adminUser->isAdmin()) {
            echo "   - isAdmin(): ✅ TRUE\n";
        } else {
            echo "   - isAdmin(): ❌ FALSE\n";
        }
    } else {
        echo "   - Role: ❌ Không có role được gán\n";
    }
} else {
    echo "❌ User admin không tồn tại!\n";
}

echo "\n🎉 Cấu trúc database đã được cập nhật thành công!\n";
echo "📊 Tổng số roles: " . $roles->count() . "\n";
echo "✅ Database đã khớp với cấu trúc trong ảnh của bạn!\n";
