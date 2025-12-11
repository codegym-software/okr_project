FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk update && apk add --no-cache \
    git \
    curl \
    libpng-dev \
    oniguruma-dev \
    libxml2-dev \
    zip \
    unzip \
    libzip-dev \
    sqlite-dev \
    mysql-client \
    nodejs \
    npm \
    # Cài đặt extension PHP sau khi các dev-libs đã được cài đặt
    && docker-php-ext-install pdo_mysql pdo_sqlite mbstring exif pcntl bcmath gd zip

# Install Nginx
RUN apk add --no-cache nginx

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy Nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf

# Copy all application files first

COPY . .



# Remove .env file if it exists (ensure Render env vars are used)

RUN rm -f .env



# Clean npm cache and reinstall dependencies

RUN rm -rf node_modules package-lock.json

RUN npm install

RUN npm run build



# Install composer dependencies

RUN composer install --no-dev --optimize-autoloader



# Clear and cache Laravel config/views/routes

RUN CACHE_STORE=array SESSION_DRIVER=array QUEUE_CONNECTION=sync php artisan config:clear

RUN CACHE_STORE=array SESSION_DRIVER=array QUEUE_CONNECTION=sync php artisan cache:clear

RUN CACHE_STORE=array SESSION_DRIVER=array QUEUE_CONNECTION=sync php artisan view:clear

RUN CACHE_STORE=array SESSION_DRIVER=array QUEUE_CONNECTION=sync php artisan route:clear

RUN CACHE_STORE=array SESSION_DRIVER=array QUEUE_CONNECTION=sync php artisan config:cache

RUN CACHE_STORE=array SESSION_DRIVER=array QUEUE_CONNECTION=sync php artisan event:cache



# Set permissions

RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

RUN chmod -R 777 /var/www/storage /var/www/bootstrap/cache



# THÊM: Tạo thư mục tạm cho Nginx và cấp quyền

RUN mkdir -p /tmp/nginx_client_body /tmp/nginx_proxy /tmp/nginx_fastcgi /tmp/nginx_uwsgi /tmp/nginx_scgi \

    && chown -R www-data:www-data /tmp/nginx_client_body /tmp/nginx_proxy /tmp/nginx_fastcgi /tmp/nginx_uwsgi /tmp/nginx_scgi



# Switch to www-data user

USER www-data



# Run migrations first, then start services

CMD ["sh", "-c", "php artisan config:clear && php artisan migrate --force --no-interaction && php-fpm -D && nginx -g 'daemon off; pid /tmp/nginx.pid;'" ]
