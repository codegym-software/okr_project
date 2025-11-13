FROM php:8.2-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libzip-dev \
    libsqlite3-dev \
    && docker-php-ext-install pdo_mysql pdo_sqlite mbstring exif pcntl bcmath gd zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy composer files first
COPY composer.json composer.lock ./

# Install dependencies
RUN composer install --no-dev --optimize-autoloader

# Copy application files
COPY . .

# Set permissions
RUN chmod -R 755 /var/www/storage \
    && chmod -R 755 /var/www/bootstrap/cache

# Wait for MySQL to be ready
RUN echo "#!/bin/bash\nwhile ! mysqladmin ping -h mysql -u root -ppassword --silent; do sleep 1; done\necho 'MySQL is ready!'" > /wait-for-mysql.sh && chmod +x /wait-for-mysql.sh

# Expose port
EXPOSE 8000

# Start Laravel development server
CMD ["/wait-for-mysql.sh", "&&", "php", "artisan", "migrate:fresh", "--seed", "&&", "php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]