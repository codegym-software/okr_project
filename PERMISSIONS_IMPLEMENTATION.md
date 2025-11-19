# Hướng dẫn sử dụng Permissions trong hệ thống

## Tổng quan

Hệ thống đã được tích hợp permission management với các tính năng:
- ✅ Backend: Methods để check permissions trong User model
- ✅ API: Endpoint để lấy permissions của user hiện tại
- ✅ Frontend: Utilities và hooks để check permissions
- ✅ Sidebar: Tự động ẩn/hiện menu items dựa trên permissions

## Cách sử dụng trong Frontend

### 1. Sử dụng Hook trong Components

```javascript
import { usePermissionsHook } from "../utils/usePermissions";

function MyComponent() {
    const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissionsHook();

    // Check một permission
    const canCreate = hasPermission('company-okrs.manage');
    const canView = hasPermission('company-okrs.index');

    return (
        <div>
            {canCreate && (
                <button onClick={handleCreate}>
                    Tạo OKR công ty
                </button>
            )}
            
            <button 
                onClick={handleEdit}
                disabled={!canCreate}
                className={!canCreate ? "opacity-50 cursor-not-allowed" : ""}
            >
                Sửa OKR
            </button>
        </div>
    );
}
```

### 2. Sử dụng trực tiếp từ Context

```javascript
import { usePermissions } from "../layouts/DashboardLayout";

function MyComponent() {
    const permissions = usePermissions();
    const canCreate = permissions.includes('company-okrs.manage');

    return (
        <button disabled={!canCreate}>
            Tạo OKR
        </button>
    );
}
```

### 3. Disable buttons nếu không có quyền

```javascript
const { hasPermission } = usePermissionsHook();

<button
    onClick={handleAction}
    disabled={!hasPermission('company-okrs.manage')}
    className={!hasPermission('company-okrs.manage') 
        ? "opacity-50 cursor-not-allowed" 
        : "hover:bg-blue-600"
    }
    title={!hasPermission('company-okrs.manage') 
        ? "Bạn không có quyền thực hiện hành động này" 
        : ""
    }
>
    Tạo OKR công ty
</button>
```

## Danh sách Permission Keys

### Quản lý Người dùng
- `users.index` - Xem danh sách người dùng
- `users.show` - Xem chi tiết người dùng
- `users.update` - Cập nhật thông tin người dùng
- `users.updateStatus` - Cập nhật trạng thái người dùng
- `users.destroy` - Xóa người dùng
- `admin.invite-user` - Mời người dùng mới
- `admin.invitations` - Xem danh sách lời mời

### Quản lý Chu kỳ OKR
- `cycles.index` - Xem danh sách chu kỳ
- `cycles.manage` - Tạo/Sửa/Xóa chu kỳ
- `cycles.close` - Đóng chu kỳ

### Quản lý Phòng ban
- `departments.index` - Xem danh sách phòng ban
- `departments.manage` - Tạo/Sửa/Xóa phòng ban
- `departments.assign-users` - Phân công người dùng vào phòng ban

### Quản lý OKR Cá nhân
- `my-objectives.index` - Xem danh sách OKRs cá nhân
- `my-objectives.manage` - Tạo/Sửa/Xóa OKR cá nhân
- `my-objectives.details` - Xem chi tiết OKR cá nhân
- `my-objectives.archive` - Lưu trữ/Gỡ lưu trữ OKR cá nhân

### Quản lý OKR Phòng ban
- `department-okrs.index` - Xem danh sách OKRs phòng ban
- `department-okrs.manage` - Tạo/Sửa/Xóa OKRs phòng ban
- `department-okrs.details` - Xem chi tiết OKR phòng ban
- `department-okrs.archive` - Lưu trữ/Gỡ lưu trữ OKRs phòng ban

### Quản lý OKR Công ty
- `company-okrs.index` - Xem danh sách OKRs công ty
- `company-okrs.manage` - Tạo/Sửa/Xóa OKRs công ty
- `company-okrs.details` - Xem chi tiết OKR công ty
- `company-okrs.archive` - Lưu trữ/Gỡ lưu trữ OKRs công ty

### Check-in và Theo dõi Tiến độ
- `check-in.create` - Tạo check-in cho Key Result
- `check-in.history` - Xem lịch sử check-in
- `check-in.destroy` - Xóa check-in

### Báo cáo
- `reports.team` - Xem báo cáo OKRs đội nhóm
- `reports.company` - Xem báo cáo OKRs công ty
- `reports.export-csv` - Xuất CSV báo cáo OKR công ty

### Liên kết OKR
- `links.send-request` - Gửi yêu cầu liên kết giữa các OKR
- `links.accept-request` - Chấp nhận yêu cầu liên kết giữa các OKR
- `links.index` - Xem danh sách liên kết OKR

### Phân công OKR
- `okr-assignments.assign` - Phân công OKR cho người dùng
- `okr-assignments.destroy` - Xóa phân công

## Cách sử dụng trong Backend (Controllers)

```php
use Illuminate\Support\Facades\Auth;

public function store(Request $request)
{
    $user = Auth::user();
    
    // Check permission
    if (!$user->hasPermission('company-okrs.manage')) {
        return response()->json([
            'success' => false,
            'message' => 'Bạn không có quyền tạo OKR công ty'
        ], 403);
    }
    
    // Continue with logic...
}
```

## Lưu ý quan trọng

1. **Sidebar tự động ẩn/hiện**: Menu items trong sidebar đã được cập nhật để tự động ẩn/hiện dựa trên permissions
2. **Permissions được cache**: Permissions được cache trong frontend để tránh gọi API nhiều lần
3. **Context Provider**: Permissions được share qua Context, có thể sử dụng trong bất kỳ component nào bên trong DashboardLayout
4. **Kiểm tra kỹ**: Luôn kiểm tra permission cả ở frontend (UX) và backend (Security)

