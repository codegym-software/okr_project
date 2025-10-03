@extends('layouts.app')

@section('content')
<style>
    .users-container {
        background-color: var(--bg-secondary);
        color: var(--text-secondary);
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .users-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding: 0 20px;
    }

    .users-title h1 {
        font-size: 36px;
        font-weight: bold;
        color: var(--text-secondary);
        margin: 0;
    }

    .search-filter-container {
        display: flex;
        gap: 20px;
        margin-bottom: 20px;
        padding: 0 20px;
        flex-wrap: wrap;
    }

    .search-box {
        flex: 1;
        min-width: 300px;
    }

    .search-box input {
        width: 100%;
        padding: 10px 15px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        background-color: white;
    }

    .filter-box {
        display: flex;
        gap: 15px;
        align-items: center;
        flex-wrap: wrap;
    }

    .filter-select {
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background-color: white;
        font-size: 14px;
    }

    .status-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        display: inline-block;
        margin: 0 auto;
    }

    .status-active {
        background-color: #d1fae5;
        color: #065f46;
    }

    .status-inactive {
        background-color: #fee2e2;
        color: #991b1b;
    }

    .role-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
    }

    .role-admin {
        background-color: #dc2626;
        color: white;
    }

    .role-manager {
        background-color: #ea580c;
        color: white;
    }

    .role-member {
        background-color: #059669;
        color: white;
    }

    .role-none {
        background-color: #6b7280;
        color: white;
    }

    .user-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #e5e7eb;
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 12px;
        justify-content: center;
    }

    .user-details h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-secondary);
    }

    .user-details p {
        margin: 0;
        font-size: 0.875rem;
        color: #6b7280;
    }

    .action-buttons {
        display: flex;
        gap: 8px;
    }

    .btn-edit {
        background-color: #eab308;
        color: var(--text-secondary);
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 0.875rem;
        text-decoration: none;
        transition: background-color 0.2s;
    }

    .btn-edit:hover {
        background-color: #ca8a04;
        color: var(--text-secondary);
    }

    .btn-delete {
        background-color: var(--btn-secondary);
        color: var(--btn-text-secondary);
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 0.875rem;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .btn-delete:hover {
        background-color: var(--btn-hover-secondary);
    }

    .no-users {
        text-align: center;
        padding: 40px;
        color: #6b7280;
    }

    .alert {
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 20px;
    }

    .alert-success {
        background-color: #d1fae5;
        color: #065f46;
        border: 1px solid #a7f3d0;
    }

    .alert-error {
        background-color: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
    }

    .role-dropdown {
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background-color: white;
        font-size: 14px;
        cursor: pointer;
        min-width: 120px;
        margin: 0 auto;
        display: block;
    }

    .role-dropdown:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .table-custom td {
        text-align: center;
        vertical-align: middle;
    }

    .table-custom th {
        text-align: center;
    }

    .user-info {
        justify-content: center;
    }

    .user-avatar {
        flex-shrink: 0;
    }

    .user-details {
        text-align: left;
        flex: 1;
    }

    .action-buttons {
        justify-content: center;
    }

    .status-dropdown {
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background-color: white;
        font-size: 14px;
        cursor: pointer;
        min-width: 120px;
        margin: 0 auto;
        display: block;
        transition: all 0.3s ease;
        text-align: center;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        background-image: none;
    }

    .status-dropdown.status-active {
        background-color: #d1fae5;
        color: #065f46;
        border: none;
        border-radius: 12px;
        padding: 4px 8px;
        font-size: 0.75rem;
        font-weight: 600;
        min-width: auto;
        width: auto;
        display: inline-block;
        text-transform: uppercase;
    }

    .status-dropdown.status-inactive {
        background-color: #fee2e2;
        color: #991b1b;
        border: none;
        border-radius: 12px;
        padding: 4px 8px;
        font-size: 0.75rem;
        font-weight: 600;
        min-width: auto;
        width: auto;
        display: inline-block;
        text-transform: uppercase;
    }
</style>

<div class="users-container">
    <div class="users-title">
        <h1>Quản lý người dùng</h1>
    </div>

    <!-- Search và Filter -->
    <div class="search-filter-container">
        <div class="search-box">
            <input type="text" id="searchInput" placeholder="Tìm kiếm theo tên hoặc email..." onkeyup="filterUsers()">
        </div>
        <div class="filter-box">
            <select id="roleFilter" class="filter-select" onchange="filterUsers()">
                <option value="">Tất cả vai trò</option>
                <option value="Manager">Manager</option>
                <option value="Member">Member</option>
            </select>
            <select id="statusFilter" class="filter-select" onchange="filterUsers()">
                <option value="">Tất cả trạng thái</option>
                <option value="active">Kích hoạt</option>
                <option value="inactive">Vô hiệu hóa</option>
            </select>
        </div>
    </div>

    @if(session('success'))
        <div class="alert alert-success">
            {{ session('success') }}
        </div>
    @endif

    @if(session('error'))
        <div class="alert alert-error">
            {{ session('error') }}
        </div>
    @endif

    @if($users->count() > 0)
        <div class="table-responsive">
            <table class="table-custom w-full">
                <thead>
                        <tr>
                            <th class="text-left p-4">Người dùng</th>
                            <th class="text-left p-4">Email</th>
                            <th class="text-left p-4">Vai trò</th>
                            <th class="text-left p-4">Trạng thái</th>
                            <th class="text-left p-4">Hành động</th>
                        </tr>
                </thead>
                <tbody id="usersTableBody">
                    @foreach($users as $user)
                        <tr class="user-row"
                            data-name="{{ strtolower($user->full_name ?? '') }}"
                            data-email="{{ strtolower($user->email) }}"
                            data-role="{{ $user->role ? strtolower($user->role->role_name) : '' }}"
                            data-status="active">
                            <td class="p-4">
                                <div class="user-info">
                                    @if($user->avatar_url && Storage::disk('public')->exists($user->avatar_url))
                                        <img src="{{ Storage::url($user->avatar_url) }}" alt="Avatar" class="user-avatar">
                                    @else
                                        <div class="user-avatar" style="background-color: var(--bg-primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                                            {{ substr($user->full_name ?? $user->email, 0, 1) }}
                                        </div>
                                    @endif
                                    <div class="user-details">
                                        <h3>{{ $user->full_name ?? 'Chưa cập nhật' }}</h3>
                                        <p>ID: {{ $user->user_id }}</p>
                                    </div>
                                </div>
                            </td>
                            <td class="p-4">{{ $user->email }}</td>
                            <td class="p-4">
                                @php
                                    $roles = \App\Models\Role::all();
                                    $isDisabled = $user->user_id === Auth::id() && !Auth::user()->isAdmin();
                                    $isAdmin = $user->isAdmin();
                                @endphp

                                @if($isAdmin)
                                    <!-- Hiển thị cố định cho Admin -->
                                    <span class="role-badge role-admin" style="padding: 6px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background-color: white; color: black; border: 1px solid #d1d5db; display: inline-block; margin: 0 auto;">
                                        Admin
                                    </span>
                                @else
                                    <!-- Dropdown chỉ cho phép Manager/Member -->
                                    @php
                                        $managerRoleId = \App\Models\Role::where('role_name', 'Manager')->value('role_id');
                                        $memberRoleId = \App\Models\Role::where('role_name', 'Member')->value('role_id');
                                    @endphp
                                    <select class="role-dropdown"
                                            data-user-id="{{ $user->user_id }}"
                                            onchange="updateRole({{ $user->user_id }}, this.value)"
                                            {{ $isDisabled ? 'disabled' : '' }}>
                                        <option value="{{ $managerRoleId }}" {{ $user->role_id == $managerRoleId ? 'selected' : '' }}>MANAGER</option>
                                        <option value="{{ $memberRoleId }}" {{ $user->role_id == $memberRoleId ? 'selected' : '' }}>MEMBER</option>
                                    </select>
                                @endif
                            </td>
                            <td class="p-4">
                                @php
                                    $userStatus = $user->status ?? 'active'; // Mặc định là active
                                    $isAdmin = $user->isAdmin();
                                @endphp

                                @if($isAdmin)
                                    <!-- Hiển thị cố định cho Admin -->
                                    <span class="status-badge status-active" style="display: inline-block; margin: 0 auto;">
                                        Kích hoạt
                                    </span>
                                @else
                                    <!-- Dropdown cho các user khác -->
                                    <select class="status-dropdown status-{{ $userStatus }}"
                                            data-user-id="{{ $user->user_id }}"
                                            onchange="updateStatus({{ $user->user_id }}, this.value)">
                                        <option value="active" {{ $userStatus === 'active' ? 'selected' : '' }}>
                                            KÍCH HOẠT
                                        </option>
                                        <option value="inactive" {{ $userStatus === 'inactive' ? 'selected' : '' }}>
                                            VÔ HIỆU HÓA
                                        </option>
                                    </select>
                                @endif
                                </td>
                                <td class="p-4">
                                    <div class="action-buttons" style="display: flex; justify-content: center;">
                                        <button onclick="viewUserDetail({{ $user->user_id }})" style="
                                            background-color: transparent;
                                            color: #333;
                                            border: 1px solid #ccc;
                                            padding: 6px 12px;
                                            border-radius: 4px;
                                            cursor: pointer;
                                            font-size: 12px;
                                            font-weight: 500;
                                            transition: all 0.3s ease;
                                        " onmouseover="this.style.backgroundColor='#f0f0f0'; this.style.borderColor='#999';"
                                           onmouseout="this.style.backgroundColor='transparent'; this.style.borderColor='#ccc';">
                                            Xem chi tiết
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        @endforeach
                </tbody>
            </table>
            <div id="noResults" style="display:none; text-align:center; padding:24px; color:#6b7280; background:#f9fafb; border:1px dashed #e5e7eb; border-radius:8px; margin-top:12px;">
                Không có kết quả phù hợp
            </div>
        </div>
        <div id="noResults" style="display:none; text-align:center; padding:24px; color:#6b7280; background:#f9fafb; border:1px dashed #e5e7eb; border-radius:8px;">
  Không có kết quả phù hợp
    <!-- Loading overlay -->
    <div id="globalLoading" class="loading-overlay" style="display:none; position:fixed; inset:0; background:rgba(255,255,255,0.6); align-items:center; justify-content:center; z-index:9999;">
        <div class="loading-box" style="background:#ffffff; border:1px solid #e5e7eb; border-radius:10px; padding:14px 18px; box-shadow:0 4px 10px rgba(0,0,0,0.08); color:#374151; font-weight:600; display:flex; gap:10px; align-items:center;">
            <div class="spinner" style="width:18px; height:18px; border:2px solid #93c5fd; border-top-color:#2563eb; border-radius:50%; animation:spin 0.9s linear infinite;"></div>
            <span>Đang cập nhật...</span>
        </div>
    </div>
</div>
    @else
        <div class="no-users">
            <h3>Chưa có người dùng nào</h3>
            <p>Hãy thêm người dùng vào hệ thống.</p>
        </div>
    @endif
</div>

<script>
// Tìm kiếm và lọc người dùng
function filterUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value.toLowerCase();
    const rows = document.querySelectorAll('.user-row');

    let visibleCount = 0;

    rows.forEach(row => {
        const name = row.dataset.name;
        const email = row.dataset.email;
        const role = row.dataset.role;
        const status = row.dataset.status;

        const matchesSearch = name.includes(searchTerm) || email.includes(searchTerm);
        const matchesRole = !roleFilter || role === roleFilter;
        const matchesStatus = !statusFilter || status === statusFilter;

        if (matchesSearch && matchesRole && matchesStatus) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    const noResults = document.getElementById('noResults');
    if (noResults) {
        noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }
}

// Cập nhật trạng thái người dùng
function updateStatus(userId, status) {
    console.log('Updating user status', userId, 'to', status);

    // Cập nhật class của dropdown ngay lập tức
    const dropdown = document.querySelector(`select[data-user-id="${userId}"]`);
    if (dropdown) {
        // Xóa class cũ
        dropdown.classList.remove('status-active', 'status-inactive');
        // Thêm class mới
        dropdown.classList.add(`status-${status}`);
        // Disable trong lúc gửi
        dropdown.disabled = true;
    }

    // Hiển thị overlay loading
    const overlay = document.getElementById('globalLoading');
    if (overlay) overlay.style.display = 'flex';

    // Tạo form để submit
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `/users/${userId}/status`;

    // Thêm CSRF token
    const csrfToken = document.createElement('input');
    csrfToken.type = 'hidden';
    csrfToken.name = '_token';
    csrfToken.value = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    form.appendChild(csrfToken);

    // Thêm method override
    const methodOverride = document.createElement('input');
    methodOverride.type = 'hidden';
    methodOverride.name = '_method';
    methodOverride.value = 'PUT';
    form.appendChild(methodOverride);

    // Thêm status
    const statusInput = document.createElement('input');
    statusInput.type = 'hidden';
    statusInput.name = 'status';
    statusInput.value = status;
    form.appendChild(statusInput);

    // Submit form
    document.body.appendChild(form);
    form.submit();
}

// Cập nhật vai trò
function updateRole(userId, roleId) {
    console.log('Updating user', userId, 'to role', roleId);

    if (!roleId) {
        console.log('No role selected');
        return;
    }

    // Disable dropdown trong lúc gửi
    const roleSelect = document.querySelector(`select.role-dropdown[data-user-id="${userId}"]`);
    if (roleSelect) {
        roleSelect.disabled = true;
    }

    // Hiển thị overlay loading
    const overlay = document.getElementById('globalLoading');
    if (overlay) overlay.style.display = 'flex';

    // Tạo form để submit
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `/users/${userId}`;

    // Thêm CSRF token
    const csrfToken = document.createElement('input');
    csrfToken.type = 'hidden';
    csrfToken.name = '_token';
    csrfToken.value = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    form.appendChild(csrfToken);

    // Thêm method override
    const methodOverride = document.createElement('input');
    methodOverride.type = 'hidden';
    methodOverride.name = '_method';
    methodOverride.value = 'PUT';
    form.appendChild(methodOverride);

    // Thêm role_id
    const roleInput = document.createElement('input');
    roleInput.type = 'hidden';
    roleInput.name = 'role_id';
    roleInput.value = roleId;
    form.appendChild(roleInput);

    // Submit form
    document.body.appendChild(form);
    form.submit();
}

// Fallback cho event listener
document.addEventListener('DOMContentLoaded', function() {
    const roleDropdowns = document.querySelectorAll('.role-dropdown');
    const statusDropdowns = document.querySelectorAll('.status-dropdown');

    roleDropdowns.forEach(dropdown => {
        dropdown.addEventListener('change', function() {
            if (this.value) {
                updateRole(this.dataset.userId, this.value);
            }
        });
    });

    statusDropdowns.forEach(dropdown => {
        // Khởi tạo class dựa trên giá trị hiện tại
        const currentValue = dropdown.value;
        dropdown.classList.remove('status-active', 'status-inactive');
        dropdown.classList.add(`status-${currentValue}`);

        dropdown.addEventListener('change', function() {
            updateStatus(this.dataset.userId, this.value);
        });
    });
});

// Xem chi tiết người dùng
function viewUserDetail(userId) {
    window.location.href = `/users/${userId}/detail`;
}
</script>
@endsection
