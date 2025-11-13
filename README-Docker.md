# OKR Project - Docker Setup với MySQL

## Cách chạy với Docker

### 1. Yêu cầu
- Docker Desktop đã cài đặt và chạy
- Git (để clone code)

### 2. Chạy ứng dụng
```bash
# Clone code (nếu chưa có)
git clone <repository-url>
cd OKR_Project_main

# Chạy với Docker Compose (tự động setup database)
docker-compose up --build

# Hoặc chạy background
docker-compose up -d --build
```

### 3. Truy cập ứng dụng
- **Laravel App**: http://localhost:8000
- **MySQL**: localhost:3306

### 4. Database tự động setup
- MySQL container tự động tạo database `okr_project`
- Laravel tự động chạy migrations và seeders
- Dữ liệu mẫu đã sẵn sàng để test

### 5. Cấu hình .env cho Docker (tự động)
```env
APP_NAME=Laravel
APP_ENV=local
APP_KEY=base64:your-key-here
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database - MySQL (tự động)
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=okr_project
DB_USERNAME=okr_user
DB_PASSWORD=okr_password

# Cache & Session
CACHE_STORE=file
SESSION_DRIVER=file

# AWS Cognito
AWS_COGNITO_DOMAIN=https://ap-southeast-2rqig6bh9c.auth.ap-southeast-2.amazoncognito.com
AWS_COGNITO_CLIENT_ID=3ar8acocnqav49qof9qetdj2dj
AWS_COGNITO_CLIENT_SECRET=your-secret
COGNITO_REDIRECT_URI=http://localhost:8000/auth/callback
```

### 6. Các lệnh hữu ích
```bash
# Xem logs
docker-compose logs -f

# Dừng containers
docker-compose down

# Xóa volumes (reset database)
docker-compose down -v

# Rebuild containers
docker-compose up --build --force-recreate

# Vào container để debug
docker-compose exec app bash
```

### 7. Troubleshooting
- **Port 8000 bị chiếm**: Thay đổi port trong docker-compose.yml
- **Permission denied**: Chạy `chmod -R 755 storage bootstrap/cache`
- **Database connection**: Kiểm tra .env và restart containers

### 8. Tính năng My OKR
Sau khi setup xong:
1. Truy cập http://localhost:8000
2. Đăng nhập qua Cognito
3. Vào "My OKR" để xem danh sách OKR cá nhân
4. Test các tính năng lọc, sắp xếp, thông báo
