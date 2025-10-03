# Hướng dẫn tạo Admin trong AWS Cognito

## Bước 1: Truy cập AWS Console

1. Đăng nhập vào AWS Console
2. Tìm và mở **Amazon Cognito**

## Bước 2: Tìm User Pool

1. Chọn **User pools**
2. Tìm User Pool của dự án OKR
3. Click vào User Pool

## Bước 3: Tạo User Admin

1. Trong User Pool, chọn tab **Users**
2. Click **Create user**
3. Điền thông tin:
    - **Username**: `admin@okr.com`
    - **Email**: `admin@okr.com`
    - **Temporary password**: `Admin123!` (đáp ứng yêu cầu: uppercase, lowercase, số, ký tự đặc biệt)
    - **Mark email as verified**: ✅ Check

## Bước 4: Xác nhận tạo user

1. Click **Create user**
2. User sẽ được tạo với trạng thái **FORCE_CHANGE_PASSWORD**

## Bước 5: Đăng nhập lần đầu

1. Truy cập: `http://localhost:8000/login`
2. Đăng nhập với:
    - Email: `admin@okr.com`
    - Password: `Admin123!`
3. Hệ thống sẽ yêu cầu đổi mật khẩu
4. Đặt mật khẩu mới (phải đáp ứng yêu cầu Cognito)

## Bước 6: Kiểm tra quyền Admin

1. Sau khi đăng nhập, kiểm tra sidebar có mục "Users"
2. Truy cập `/users` để quản lý người dùng
3. Kiểm tra role trong database: `role_id = 1` (Admin)

## Lưu ý:

-   Password phải có ít nhất: 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt
-   User đã được tạo trong database với role Admin
-   Chỉ cần tạo user trong AWS Cognito là có thể đăng nhập
-   Tất cả user đăng ký mới sẽ có role Member mặc định

## Troubleshooting:

-   Nếu không thấy mục "Users": Kiểm tra role_id trong database
-   Nếu không đăng nhập được: Kiểm tra user đã được tạo trong Cognito
-   Nếu lỗi password: Đảm bảo password đáp ứng yêu cầu Cognito
