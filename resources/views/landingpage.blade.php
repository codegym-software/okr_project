<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>OKRun - Phần mềm OKR Chuyên nghiệp</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #1e293b;
            line-height: 1.6;
        }

        /* Header */
        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            z-index: 1000;
            transition: all 0.3s ease;
        }

        .header.scrolled {
            background: rgba(255, 255, 255, 0.98);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        .navbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 80px;
        }

        .logo {
            font-size: 2rem;
            font-weight: 800;
            color: #2563eb;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .logo i {
            font-size: 2.5rem;
            background: linear-gradient(135deg, #2563eb, #7c3aed);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .nav-menu {
            display: flex;
            list-style: none;
            gap: 3rem;
            margin: 0;
        }

        .nav-menu a {
            color: #374151;
            text-decoration: none;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            position: relative;
            padding: 0.5rem 0;
        }

        .nav-menu a:hover {
            color: #2563eb;
            transform: translateY(-2px);
        }

        .nav-menu a::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 0;
            height: 3px;
            background: linear-gradient(90deg, #2563eb, #7c3aed);
            border-radius: 2px;
            transition: width 0.3s ease;
        }

        .nav-menu a:hover::after {
            width: 100%;
        }

        /* Main Content - Centered */
        .main-content {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 100px 2rem 2rem;
        }

        .hero-container {
            max-width: 1100px;
            width: 100%;
            text-align: center;
        }

        .hero-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(30px);
            border-radius: 32px;
            padding: 5rem 4rem;
            box-shadow:
                0 25px 50px -12px rgba(0, 0, 0, 0.25),
                0 0 0 1px rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            position: relative;
            overflow: hidden;
        }

        .hero-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: linear-gradient(90deg, #2563eb, #7c3aed, #059669, #dc2626);
            border-radius: 32px 32px 0 0;
        }

        .hero-card::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, transparent 70%);
            animation: float 6s ease-in-out infinite;
            pointer-events: none;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
        }

        .hero-title {
            font-size: 3.5rem;
            font-weight: 800;
            color: #1e293b;
            margin-bottom: 2rem;
            line-height: 1.1;
            position: relative;
            z-index: 2;
        }

        .hero-subtitle {
            font-size: 1.5rem;
            color: #64748b;
            margin-bottom: 2.5rem;
            font-weight: 500;
            position: relative;
            z-index: 2;
        }

        .hero-description {
            font-size: 1.2rem;
            color: #64748b;
            line-height: 1.8;
            margin-bottom: 4rem;
            text-align: justify;
            max-width: 900px;
            margin-left: auto;
            margin-right: auto;
            position: relative;
            z-index: 2;
        }

        .cta-buttons {
            display: flex;
            gap: 2rem;
            justify-content: center;
            flex-wrap: wrap;
            position: relative;
            z-index: 2;
        }

        .btn {
            padding: 1.25rem 3rem;
            border-radius: 16px;
            font-weight: 700;
            font-size: 1.2rem;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.75rem;
            transition: all 0.4s ease;
            border: none;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.6s ease;
        }

        .btn:hover::before {
            left: 100%;
        }

        .btn-primary {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: white;
            box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3);
        }

        .btn-primary:hover {
            transform: translateY(-4px) scale(1.05);
            box-shadow: 0 20px 40px rgba(37, 99, 235, 0.4);
            color: white;
        }

        .btn-secondary {
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            color: white;
            box-shadow: 0 10px 25px rgba(220, 38, 38, 0.3);
        }

        .btn-secondary:hover {
            transform: translateY(-4px) scale(1.05);
            box-shadow: 0 20px 40px rgba(220, 38, 38, 0.4);
            color: white;
        }

        /* Features Section */
        .features {
            margin-top: 6rem;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 3rem;
        }

        .feature-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 3rem 2rem;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.3);
            transition: all 0.4s ease;
            position: relative;
            overflow: hidden;
        }

        .feature-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #2563eb, #7c3aed);
            transform: scaleX(0);
            transition: transform 0.3s ease;
        }

        .feature-card:hover::before {
            transform: scaleX(1);
        }

        .feature-card:hover {
            transform: translateY(-10px) scale(1.02);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
        }

        .feature-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #2563eb, #7c3aed);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 2rem;
            color: white;
            font-size: 2rem;
            box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3);
            transition: all 0.3s ease;
        }

        .feature-card:hover .feature-icon {
            transform: scale(1.1) rotate(5deg);
            box-shadow: 0 15px 35px rgba(37, 99, 235, 0.4);
        }

        .feature-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 1rem;
        }

        .feature-description {
            color: #64748b;
            font-size: 1.1rem;
            line-height: 1.6;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .nav-menu {
                display: none;
            }

            .hero-title {
                font-size: 2.5rem;
            }

            .hero-card {
                padding: 3rem 2rem;
                margin: 0 1rem;
            }

            .cta-buttons {
                flex-direction: column;
                align-items: center;
            }

            .btn {
                width: 100%;
                max-width: 350px;
                justify-content: center;
            }

            .hero-description {
                text-align: left;
                font-size: 1.1rem;
            }

            .features {
                grid-template-columns: 1fr;
                gap: 2rem;
                margin-top: 4rem;
            }
        }

        @media (max-width: 480px) {
            .hero-title {
                font-size: 2rem;
            }

            .hero-card {
                padding: 2rem 1.5rem;
            }

            .btn {
                padding: 1rem 2rem;
                font-size: 1.1rem;
            }
        }

        /* Animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .hero-card {
            animation: fadeInUp 1s ease-out;
        }

        .feature-card {
            animation: fadeInUp 1s ease-out;
        }

        .feature-card:nth-child(2) {
            animation-delay: 0.2s;
        }

        .feature-card:nth-child(3) {
            animation-delay: 0.4s;
        }

        /* Loading Animation */
        .loading {
            opacity: 0;
            transition: opacity 0.5s ease;
        }

        .loaded {
            opacity: 1;
        }
    </style>
</head>
<body class="loading">
    <!-- Header -->
    <header class="header" id="header">
        <div class="nav-container">
            <nav class="navbar">
                <a href="{{ route('landingpage') }}" class="logo">
                    <i class="fas fa-bullseye"></i>
                    OKRun
                </a>
                <ul class="nav-menu">
                    <li><a href="{{ route('landingpage') }}">Trang chủ</a></li>
                    <li><a href="#features">Tính năng</a></li>
                    <li><a href="#contact">Liên hệ</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
        <div class="hero-container">
            <div class="hero-card">
                <h1 class="hero-title">
                    Phần mềm OKR - Đột phá Quản trị Mục tiêu
                </h1>
                <p class="hero-subtitle">
                    Tăng hiệu suất đội nhóm, theo dõi tiến độ dễ dàng và đạt mục tiêu nhanh chóng!
                </p>
                <p class="hero-description">
                    Trong bối cảnh môi trường kinh doanh toàn cầu ngày càng phức tạp và cạnh tranh, việc thiết lập, theo dõi và hoàn thành các mục tiêu chiến lược là yếu tố sống còn để đảm bảo sự phát triển bền vững của doanh nghiệp. Phần mềm OKR (Objectives and Key Results) đã và đang trở thành công cụ quản trị mục tiêu hàng đầu, được các tập đoàn lớn như Google, Intel, Amazon, LinkedIn và Twitter sử dụng để định hướng chiến lược, nâng cao hiệu suất và thúc đẩy sự phối hợp giữa các phòng ban.
                </p>
                <div class="cta-buttons">
                    <a href="{{ route('auth.signup') }}" class="btn btn-primary">
                        <i class="fas fa-rocket"></i>
                        Dùng thử miễn phí
                    </a>
                    <a href="#" class="btn btn-secondary">
                        <i class="fas fa-user-plus"></i>
                        Đăng ký
                    </a>
                </div>
            </div>

            <!-- Features Section -->
            <div class="features" id="features">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3 class="feature-title">Theo dõi tiến độ</h3>
                    <p class="feature-description">
                        Theo dõi và đánh giá tiến độ mục tiêu theo thời gian thực với giao diện trực quan và báo cáo chi tiết
                    </p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <h3 class="feature-title">Quản lý đội nhóm</h3>
                    <p class="feature-description">
                        Phối hợp hiệu quả giữa các phòng ban và cá nhân trong tổ chức với công cụ cộng tác mạnh mẽ
                    </p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-target"></i>
                    </div>
                    <h3 class="feature-title">Đặt mục tiêu thông minh</h3>
                    <p class="feature-description">
                        Thiết lập mục tiêu SMART và theo dõi kết quả chính một cách khoa học với AI hỗ trợ
                    </p>
                </div>
            </div>
        </div>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Loading animation
        window.addEventListener('load', function() {
            document.body.classList.remove('loading');
            document.body.classList.add('loaded');
        });

        // Header scroll effect
        window.addEventListener('scroll', function() {
            const header = document.getElementById('header');
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Add parallax effect to hero card
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const heroCard = document.querySelector('.hero-card');
            if (heroCard) {
                heroCard.style.transform = `translateY(${scrolled * 0.1}px)`;
            }
        });
    </script>
</body>
</html>
