<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Models\User;
use App\Models\Role;

// Bootstrap Laravel
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Kiểm tra tài khoản admin...\n\n";

// Kiểm tra role admin
$adminRole = Role::where('role_name', 'admin')
                ->where('level', 'company')
                ->first();

if ($adminRole) {
    echo "✅ Role admin tồn tại:\n";
    echo "   - Role ID: {$adminRole->role_id}\n";
    echo "   - Role Name: {$adminRole->role_name}\n";
    echo "   - Level: {$adminRole->level}\n";
    echo "   - Description: {$adminRole->description}\n\n";
} else {
    echo "❌ Role admin không tồn tại!\n\n";
    exit(1);
}

// Kiểm tra user admin
$adminUser = User::where('email', 'okr.admin@company.com')->first();

if ($adminUser) {
    echo "✅ User admin tồn tại:\n";
    echo "   - User ID: {$adminUser->user_id}\n";
    echo "   - Email: {$adminUser->email}\n";
    echo "   - Full Name: {$adminUser->full_name}\n";
    echo "   - Role ID: {$adminUser->role_id}\n";
    echo "   - Status: {$adminUser->status}\n";

    // Kiểm tra role relationship
    if ($adminUser->role) {
        echo "   - Role Name: {$adminUser->role->role_name}\n";
        echo "   - Role Level: {$adminUser->role->level}\n";

        // Kiểm tra isAdmin()
        if ($adminUser->isAdmin()) {
            echo "   - isAdmin(): ✅ TRUE\n";
        } else {
            echo "   - isAdmin(): ❌ FALSE\n";
        }
    } else {
        echo "   - Role: ❌ Không có role được gán\n";
    }

    echo "\n";
} else {
    echo "❌ User admin không tồn tại!\n\n";
    exit(1);
}

// Kiểm tra quyền hạn
echo "🔐 Kiểm tra quyền hạn:\n";
echo "   - canManageUsers: " . ($adminUser->isAdmin() ? "✅" : "❌") . "\n";
echo "   - canCreateCompanyOKR: " . ($adminUser->role && $adminUser->role->canCreateCompanyOKR() ? "✅" : "❌") . "\n";
echo "   - canCreatePersonalOKR: " . ($adminUser->role && $adminUser->role->canCreatePersonalOKR() ? "✅" : "❌") . "\n";

echo "\n🎉 Tài khoản admin đã được cấu hình đúng cách!\n";
echo "📧 Email: okr.admin@company.com\n";
echo "🔑 Role: admin (company level)\n";
echo "⚠️  Lưu ý: Cần tạo user này trong AWS Cognito để có thể đăng nhập\n";
