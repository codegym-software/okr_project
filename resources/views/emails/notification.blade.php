<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông báo OKR</title>
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
            font-size: 18px;
            color: #1f2937;
        }
        .content {
            margin-bottom: 30px;
        }
        .notification-box {
            background-color: #f0f9ff;
            border-left: 4px solid #2563eb;
            border-radius: 0 8px 8px 0;
            padding: 20px;
            margin: 20px 0;
        }
        .notification-type {
            font-size: 12px;
            font-weight: 600;
            color: #2563eb;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        .notification-message {
            font-size: 16px;
            color: #1f2937;
            line-height: 1.5;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: white !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .button-container {
            text-align: center;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6b7280;
            font-size: 13px;
        }
        .footer a {
            color: #2563eb;
            text-decoration: none;
        }
        .icon-kr {
            color: #10b981;
        }
        .icon-link {
            color: #f59e0b;
        }
        .icon-checkin {
            color: #8b5cf6;
        }
        .icon-reminder {
            color: #ef4444;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎯 Hệ thống OKR</div>
            <div class="title">Thông báo mới</div>
        </div>

        <div class="content">
            <p>Xin chào <strong>{{ $recipientName }}</strong>,</p>
            
            <p>Bạn có thông báo mới từ hệ thống OKR:</p>

            <div class="notification-box">
                <div class="notification-type">
                    @switch($notificationType)
                        @case('kr_assigned')
                        @case('kr_assignment')
                            <span class="icon-kr">📋</span> Giao Key Result
                            @break
                        @case('okr_link')
                        @case('link_request')
                            <span class="icon-link">🔗</span> Yêu cầu liên kết
                            @break
                        @case('link_approved')
                            <span class="icon-link">✅</span> Liên kết được duyệt
                            @break
                        @case('link_rejected')
                            <span class="icon-link">❌</span> Liên kết bị từ chối
                            @break
                        @case('check_in')
                            <span class="icon-checkin">📊</span> Check-in
                            @break
                        @case('reminder')
                            <span class="icon-reminder">⏰</span> Nhắc nhở
                            @break
                        @default
                            <span>📌</span> Thông báo
                    @endswitch
                </div>
                <div class="notification-message">
                    {{ $notificationMessage }}
                </div>
            </div>

            @if($actionUrl)
            <div class="button-container">
                <a href="{{ $actionUrl }}" class="button">{{ $actionText ?? 'Xem chi tiết' }}</a>
            </div>
            @endif
        </div>

        <div class="footer">
            <p>Email này được gửi tự động từ Hệ thống OKR</p>
            <p>
                <a href="{{ config('app.url') }}">Truy cập hệ thống</a>
            </p>
        </div>
    </div>
</body>
</html>

