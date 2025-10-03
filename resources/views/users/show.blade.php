@extends('layouts.app')

@section('title', 'Chi tiết người dùng')

@php
    use App\Helpers\DateTimeHelper;
@endphp

@section('content')
<style>
    .user-detail-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
        background: white;
        border-radius: 15px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        transform: translateX(350px);
        min-height: 70vh;
    }

    .user-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px;
        border-radius: 15px 15px 0 0;
        margin: -20px -20px 30px -20px;
        display: flex;
        align-items: center;
        gap: 20px;
    }

    .user-avatar-large {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        object-fit: cover;
        border: 4px solid rgba(255,255,255,0.3);
        flex-shrink: 0;
    }

    .user-avatar-placeholder {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 36px;
        border: 4px solid rgba(255,255,255,0.3);
        flex-shrink: 0;
    }

    .user-basic-info h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
    }

    .user-basic-info p {
        margin: 5px 0 0 0;
        font-size: 16px;
        opacity: 0.9;
    }

    .back-button {
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 10px 20px;
        border-radius: 25px;
        text-decoration: none;
        font-weight: 500;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        margin-left: auto;
    }

    .back-button:hover {
        background: rgba(255,255,255,0.3);
        color: white;
        text-decoration: none;
    }

    .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
    }

    .info-card {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 10px;
        border-left: 4px solid #667eea;
    }

    .info-card h3 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 18px;
        font-weight: 600;
    }

    .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #e9ecef;
    }

    .info-item:last-child {
        border-bottom: none;
    }

    .info-label {
        font-weight: 500;
        color: #666;
        min-width: 120px;
    }

    .info-value {
        color: #333;
        font-weight: 400;
        text-align: right;
        flex: 1;
    }

    .status-badge {
        padding: 4px 12px;
        border-radius: 15px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .status-active {
        background-color: #d4edda;
        color: #155724;
    }

    .status-inactive {
        background-color: #f8d7da;
        color: #721c24;
    }

    .role-badge {
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .role-admin {
        background-color: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
    }

    .role-manager {
        background-color: #d1ecf1;
        color: #0c5460;
        border: 1px solid #bee5eb;
    }

    .role-member {
        background-color: #e2e3e5;
        color: #383d41;
        border: 1px solid #d6d8db;
    }

    .timeline {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 10px;
        margin-top: 20px;
    }

    .timeline h3 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 18px;
        font-weight: 600;
    }

    .timeline-item {
        display: flex;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid #e9ecef;
    }

    .timeline-item:last-child {
        border-bottom: none;
    }

    .timeline-icon {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #667eea;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        margin-right: 15px;
        flex-shrink: 0;
    }

    .timeline-content {
        flex: 1;
    }

    .timeline-title {
        font-weight: 500;
        color: #333;
        margin-bottom: 2px;
    }

    .timeline-date {
        font-size: 12px;
        color: #666;
    }

    .empty-state {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 20px;
    }
</style>

<div class="user-detail-container">
    <!-- Header -->
    <div class="user-header">
        @if($user->avatar_url && Storage::disk('public')->exists($user->avatar_url))
            <img src="{{ Storage::url($user->avatar_url) }}?v={{ $user->updated_at?->timestamp ?? time() }}"
                 alt="Avatar" class="user-avatar-large">
        @else
            <div class="user-avatar-placeholder">
                {{ substr($user->full_name ?? $user->email, 0, 1) }}
            </div>
        @endif

        <div class="user-basic-info">
            <h1>{{ $user->full_name ?? 'Chưa cập nhật' }}</h1>
            <p>{{ $user->email }}</p>
            <p>ID: {{ $user->user_id }}</p>
        </div>

        <a href="{{ route('users.index') }}" class="back-button">
            ← Quay lại
        </a>
    </div>

    <!-- Thông tin chi tiết -->
    <div class="info-grid">
        <!-- Thông tin cá nhân -->
        <div class="info-card">
            <h3>📋 Thông tin cá nhân</h3>
            <div class="info-item">
                <span class="info-label">Họ tên:</span>
                <span class="info-value">{{ $user->full_name ?? 'Chưa cập nhật' }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Email:</span>
                <span class="info-value">{{ $user->email }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Số điện thoại:</span>
                <span class="info-value">{{ $user->phone ?? 'Chưa cập nhật' }}</span>
            </div>
        </div>

        <!-- Thông tin hệ thống -->
        <div class="info-card">
            <h3>⚙️ Thông tin hệ thống</h3>
            <div class="info-item">
                <span class="info-label">Vai trò:</span>
                <span class="info-value">
                    @if($user->role)
                        <span class="role-badge role-{{ strtolower($user->role->role_name) }}">
                            {{ $user->role->role_name }}
                        </span>
                    @else
                        Chưa có vai trò
                    @endif
                </span>
            </div>
            <div class="info-item">
                <span class="info-label">Trạng thái:</span>
                <span class="info-value">
                    <span class="status-badge status-{{ $user->status ?? 'active' }}">
                        {{ $user->status === 'inactive' ? 'Vô hiệu hóa' : 'Kích hoạt' }}
                    </span>
                </span>
            </div>
            <div class="info-item">
                <span class="info-label">Phòng ban:</span>
                <span class="info-value">{{ $user->department->department_name ?? 'Chưa phân công' }}</span>
            </div>
        </div>

        <!-- Thông tin AWS Cognito -->
        <div class="info-card">
            <h3>🔐 Thông tin xác thực</h3>
            <div class="info-item">
                <span class="info-label">Cognito Sub:</span>
                <span class="info-value">{{ $user->sub ?? 'Chưa có' }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Google ID:</span>
                <span class="info-value">{{ $user->google_id ?? 'Chưa có' }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Đăng nhập lần cuối:</span>
                <span class="info-value">{{ DateTimeHelper::formatVietnam($user->updated_at) }}</span>
            </div>
        </div>

        <!-- Thông tin thời gian -->
        <div class="info-card">
            <h3>📅 Thời gian</h3>
            <div class="info-item">
                <span class="info-label">Tạo tài khoản:</span>
                <span class="info-value">{{ DateTimeHelper::formatVietnam($user->created_at) }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Cập nhật lần cuối:</span>
                <span class="info-value">{{ DateTimeHelper::formatVietnam($user->updated_at) }}</span>
            </div>
        </div>
    </div>

    <!-- Timeline hoạt động -->
    <div class="timeline">
        <h3>📈 Hoạt động gần đây</h3>

        @if($user->created_at)
        <div class="timeline-item">
            <div class="timeline-icon">👤</div>
            <div class="timeline-content">
                <div class="timeline-title">Tài khoản được tạo</div>
                <div class="timeline-date">{{ DateTimeHelper::formatVietnam($user->created_at) }}</div>
            </div>
        </div>
        @endif

        @if($user->updated_at && $user->updated_at->ne($user->created_at))
        <div class="timeline-item">
            <div class="timeline-icon">✏️</div>
            <div class="timeline-content">
                <div class="timeline-title">Thông tin được cập nhật</div>
                <div class="timeline-date">{{ DateTimeHelper::formatVietnam($user->updated_at) }}</div>
            </div>
        </div>
        @endif

        @if($user->role)
        <div class="timeline-item">
            <div class="timeline-icon">🎭</div>
            <div class="timeline-content">
                <div class="timeline-title">Được gán vai trò {{ $user->role->role_name }}</div>
                <div class="timeline-date">Thông tin hệ thống</div>
            </div>
        </div>
        @endif

        @if(!$user->created_at && !$user->updated_at)
        <div class="empty-state">
            Chưa có hoạt động nào được ghi nhận
        </div>
        @endif
    </div>
</div>
@endsection
