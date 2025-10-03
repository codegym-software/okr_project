@extends('layouts.app')

@section('content')
<style>
    body {
        background: #f7fafc;
        font-family: 'Inter', Arial, sans-serif;
    }
    .main-container {
        max-width: 900px; 
        margin: 40px auto;
        padding: 0 32px;
        position: relative;
    }
    .profile-card, .form-section {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 1px 4px 0 rgba(0,0,0,0.06);
        border: 1px solid #e5e7eb;
        padding: 32px 28px;
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center; 
    }
    .section-title {
        font-size: 1.5rem;
        font-weight: 600;
        color: #22223b;
        margin-bottom: 24px;
        text-align: center;
    }
    .profile-info {
        text-align: center;
        margin-bottom: 24px;
    }
    .profile-info .avatar {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        margin: 0 auto 16px auto;
        object-fit: cover;
        background: #2563eb;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.2rem;
        color: #fff;
    }
    form {
        width: 100%;
        max-width: 400px;
        margin: 0 auto;
    }
    form label {
        font-size: 1rem;
        font-weight: 500;
        color: #374151;
        margin-bottom: 6px;
        display: block;
    }
    form input[type="text"],
    form input[type="email"],
    form input[type="password"],
    form input[type="file"] {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 1rem;
        margin-bottom: 18px;
        transition: border 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
    }
    form input:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 2px #bfdbfe;
    }
    .form-actions {
        display: flex;
        justify-content: center;
        margin-top: 24px;
    }
    .btn-primary {
        background: #2563eb;
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 10px 24px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        gap: 8px;
        min-width: 140px;
    }
    .btn-primary:hover {
        background: #1d4ed8;
    }
    .file-note {
        color: #6b7280;
        font-size: 0.95rem;
        margin-left: 10px;
    }

    /* Tabs ngang */
    .tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 0; /* đưa sát card */
        justify-content: center;
        margin-bottom: 30px;
    }
    .tab-button {
        background: #e5e7eb;
        color: #374151;
        border: none;
        border-radius: 6px 6px 0 0;
        padding: 10px 20px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
    }
    .tab-button.active {
        background: #2563eb;
        color: #fff;
    }
    .tab-content {
        display: none;
        width: 100%;
    }
    .tab-content.active {
        display: block;
    }

    /* Thông báo */
    .alert {
        width: 100%;
        max-width: 500px;
        margin: 0 auto 20px auto;
        padding: 12px 16px;
        border-radius: 6px;
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .alert-success {
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        color: #065f46;
    }
    .alert-error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #b91c1c;
    }
    .password-policy {
        display: block;
        font-size: 0.85rem;
        color: #6b7280;
        margin-top: -12px; 
        margin-bottom: 16px;
    }
</style>

<div class="main-container">
    <!-- Tabs nằm trên cùng -->
    <div class="tabs">
        <button class="tab-button {{ (!$errors->any() && !session('password_success')) ? 'active' : '' }}" onclick="openTab(event, 'tab1')">Cập nhật thông tin</button>
        <button class="tab-button {{ ($errors->any() || session('password_success')) ? 'active' : '' }}" onclick="openTab(event, 'tab2')">Đổi mật khẩu</button>
    </div>

    <!-- Nội dung -->
    <div class="tab-content {{ (!$errors->any() && !session('password_success')) ? 'active' : '' }}" id="tab1">
        <div class="profile-card">
            @if(session('success'))
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    <span>{{ session('success') }}</span>
                </div>
            @endif
            <h2 class="section-title">Hồ sơ cá nhân</h2>
            <div class="profile-info">
                @if($user->avatar_url)
                    <img src="{{$user->avatar_url }}" alt="Avatar" style="width:96px; height:96px; border-radius:50%; object-fit:cover; margin:0 auto;">
                @elseif($user)
                    <div class="avatar">
                        {{ substr($user->full_name ?? optional($user)->email, 0, 1) }}
                    </div>
                @else
                    <div class="avatar">?</div>
                @endif
                <h3>{{$user->full_name ?? 'Chưa cập nhật' }}</h3>
                <p>{{ $user->email ?? 'Không có email' }}</p>
            </div>
            <form action="{{ route('profile.update') }}" method="POST" enctype="multipart/form-data">
                @csrf
                <label for="full_name">Họ và tên</label>
                <input type="text" id="full_name" name="full_name" value="{{ old('full_name', $user->full_name) }}" required>
                <label for="avatar">Ảnh đại diện</label>
                <input type="file" id="avatar" name="avatar" accept="image/*">
                <span class="file-note">JPG, PNG, GIF tối đa 2MB</span>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Cập nhật</button>
                </div>
            </form>
        </div>
    </div>

    <div class="tab-content {{ ($errors->any() || session('password_success')) ? 'active' : '' }}" id="tab2">
        <div class="form-section">
            @if ($errors->any())
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>{{ $errors->first() }}</span>
                </div>
            @endif
            @if(session('password_success'))
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    <span>{{ session('password_success') }}</span>
                </div>
            @endif
            <h2 class="section-title">Đổi mật khẩu</h2>
            <form action="{{ route('change.password') }}" method="POST">
                @csrf
                <label for="old_password">Mật khẩu cũ</label>
                <input type="password" id="old_password" name="old_password" required>
                <label for="new_password">Mật khẩu mới</label>
                <input type="password" id="new_password" name="new_password" required>
                <small class="password-policy">*Mật khẩu phải có ít nhất 8 ký tự, chứa số, chữ hoa, chữ thường và ký tự đặc biệt.</small>
                <label for="new_password_confirmation">Xác nhận mật khẩu mới</label>
                <input type="password" id="new_password_confirmation" name="new_password_confirmation" required>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Đổi mật khẩu</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
    function openTab(event, tabId) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');
        event.target.classList.add('active');
    }
</script>
@endsection
