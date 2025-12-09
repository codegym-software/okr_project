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
    default-mysql-client \
    nodejs \
    npm \
    && docker-php-ext-install pdo_mysql pdo_sqlite mbstring exif pcntl bcmath gd zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy all application files first
COPY . .

# Install composer dependencies
RUN composer install --no-dev --optimize-autoloader

# Install npm dependencies and build assets
RUN rm -rf node_modules package-lock.json && npm install && npm run build

# Set permissions
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache && chmod -R 777 /var/www/storage /var/www/bootstrap/cache

# Expose port
EXPOSE 8000

USER www-data

# Start Laravel development server
CMD ["sh", "-c", "php artisan migrate:fresh --seed && php artisan config:clear && rm -rf bootstrap/cache/* && php artisan serve --host=0.0.0.0 --port=8000"]