<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mời tham gia hệ thống {{ $appName }}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .title {
            font-size: 20px;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-item {
            margin-bottom: 10px;
        }
        .label {
            font-weight: bold;
            color: #374151;
        }
        .value {
            color: #6b7280;
        }
        .credentials {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        .credentials-title {
            font-weight: bold;
            color: #92400e;
            margin-bottom: 10px;
        }
        .credential-item {
            margin-bottom: 8px;
        }
        .password {
            font-family: 'Courier New', monospace;
            background-color: #1f2937;
            color: #f9fafb;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            letter-spacing: 1px;
        }
        .steps {
            background-color: #ecfdf5;
            border: 1px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .steps-title {
            font-weight: bold;
            color: #065f46;
            margin-bottom: 15px;
        }
        .step {
            margin-bottom: 10px;
            padding-left: 20px;
            position: relative;
        }
        .step::before {
            content: counter(step-counter);
            counter-increment: step-counter;
            position: absolute;
            left: 0;
            top: 0;
            background-color: #10b981;
            color: white;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            font-size: 12px;
            text-align: center;
            line-height: 16px;
        }
        .steps {
            counter-reset: step-counter;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .warning {
            background-color: #fef2f2;
            border: 1px solid #f87171;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        .warning-title {
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 10px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">{{ $appName }}</div>
            <div class="title">Mời tham gia hệ thống</div>
        </div>

        <div class="content">
            <p>Xin chào <strong>{{ $user->full_name }}</strong>,</p>
            
            <p>Bạn đã được mời tham gia hệ thống <strong>{{ $appName }}</strong> với vai trò <strong>{{ ucfirst($user->role->role_name ?? 'Member') }}</strong>.</p>

            <div class="info-box">
                <div class="info-item">
                    <span class="label">Email:</span>
                    <span class="value">{{ $user->email }}</span>
                </div>
                <div class="info-item">
                    <span class="label">Vai trò:</span>
                    <span class="value">{{ ucfirst($user->role->role_name ?? 'Member') }}</span>
                </div>
                @if($user->department)
                <div class="info-item">
                    <span class="label">Phòng ban:</span>
                    <span class="value">{{ $user->department->d_name }}</span>
                </div>
                @endif
            </div>

            <div class="credentials">
                <div class="credentials-title">🔐 Thông tin đăng nhập:</div>
                <div class="credential-item">
                    <span class="label">Email:</span> {{ $user->email }}
                </div>
                <div class="credential-item">
                    <span class="label">Mật khẩu tạm thời:</span>
                    <div class="password">{{ $temporaryPassword }}</div>
                </div>
            </div>

            <div class="steps">
                <div class="steps-title">📋 Hướng dẫn đăng nhập:</div>
                <div class="step">Truy cập vào hệ thống bằng link bên dưới</div>
                <div class="step">Đăng nhập với email và mật khẩu tạm thời</div>
                <div class="step">Hệ thống sẽ yêu cầu bạn đổi mật khẩu mới</div>
                <div class="step">Hoàn tất thiết lập profile cá nhân</div>
            </div>

            <div style="text-align: center;">
                <a href="{{ $loginUrl }}" class="button">🚀 Đăng nhập ngay</a>
            </div>

            <div class="warning">
                <div class="warning-title">⚠️ Lưu ý quan trọng:</div>
                <ul>
                    <li>Mật khẩu tạm thời có thời hạn sử dụng 7 ngày</li>
                    <li>Bạn sẽ được yêu cầu đổi mật khẩu ngay khi đăng nhập lần đầu</li>
                    <li>Hãy đảm bảo mật khẩu mới đáp ứng yêu cầu bảo mật</li>
                    <li>Nếu có vấn đề, vui lòng liên hệ Admin</li>
                </ul>
            </div>

            <p>Chào mừng bạn đến với {{ $appName }}! Chúng tôi rất vui được chào đón bạn tham gia đội ngũ.</p>
        </div>

        <div class="footer">
            <p>Email này được gửi tự động từ hệ thống {{ $appName }}</p>
            <p>Nếu bạn không mong muốn nhận email này, vui lòng liên hệ Admin</p>
        </div>
    </div>
</body>
</html>
