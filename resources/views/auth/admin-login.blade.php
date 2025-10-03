<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đăng nhập Admin - OKR System</title>
    <style>
        body {
            font-family: 'Inter', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
        }
        .login-title {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            font-size: 24px;
            font-weight: 600;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
        }
        .form-group input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            box-sizing: border-box;
        }
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .login-btn {
            width: 100%;
            padding: 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        .login-btn:hover {
            background: #5a67d8;
        }
        .error-message {
            background: #fee2e2;
            color: #991b1b;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #fecaca;
        }
        .admin-info {
            background: #f0f9ff;
            color: #0369a1;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #bae6fd;
            font-size: 14px;
        }
        .back-link {
            text-align: center;
            margin-top: 20px;
        }
        .back-link a {
            color: #667eea;
            text-decoration: none;
        }
        .back-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1 class="login-title">Đăng nhập Admin</h1>

        <div class="admin-info">
            <strong>Tài khoản Admin mặc định:</strong><br>
            Email: okr.admin@company.com<br>
            ⚠️ Cần tạo user trong AWS Cognito<br>
            📝 Password phải có: uppercase, lowercase, số, ký tự đặc biệt
        </div>

        @if ($errors->any())
            <div class="error-message">
                @foreach ($errors->all() as $error)
                    {{ $error }}
                @endforeach
            </div>
        @endif

        <div style="text-align: center; margin: 20px 0;">
            <a href="{{ route('login') }}" class="login-btn" style="display: inline-block; text-decoration: none; color: white;">
                Đăng nhập qua AWS Cognito
            </a>
        </div>

        <div style="text-align: center; color: #666; font-size: 14px;">
            <p>Admin cần đăng nhập qua AWS Cognito với email: <strong>okr.admin@company.com</strong></p>
            <p>Đảm bảo user đã được tạo trong AWS Cognito User Pool</p>
        </div>

        <div class="back-link">
            <a href="{{ route('landingpage') }}">← Quay lại trang chủ</a>
        </div>
    </div>
</body>
</html>
