# Producción (Fly.io): un solo contenedor con la API (Laravel + Apache) y la invitación ya
# compilada (Vue). Los eventos NO van en la imagen: viven en el disco /data/eventos.
# Desarrollo: docker-compose.yml (no usa este archivo).

# 1) La invitación (SPA). VITE_API_URL vacío: pide /api y /media a su mismo dominio.
FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
ENV VITE_API_URL=
RUN npx vite build

# 2) La API con Apache
FROM php:8.3-apache

COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/
# exif: endereza las fotos del celular al subirlas en el gestor.
RUN install-php-extensions intl zip gd opcache exif
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN a2enmod rewrite headers \
 && mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY deploy/php.ini $PHP_INI_DIR/conf.d/zz-invitaciones.ini
COPY deploy/apache-site.conf /etc/apache2/sites-available/000-default.conf
COPY deploy/apache-mpm.conf /etc/apache2/mods-available/mpm_prefork.conf
RUN echo 'Listen 8080' > /etc/apache2/ports.conf \
 && echo 'ServerName localhost' > /etc/apache2/conf-available/servername.conf \
 && a2enconf servername

WORKDIR /var/www/api
COPY api/composer.json api/composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts --no-autoloader
COPY api/ ./
RUN composer dump-autoload --optimize --no-dev \
 && php artisan package:discover --ansi \
 && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
 && chown -R www-data:www-data storage bootstrap/cache

# La invitación compilada junto a index.php: Apache sirve sus archivos y Laravel
# responde app.html en cualquier ruta que no sea /api ni /media (ver routes/web.php).
COPY --from=web /web/dist/ public/
RUN mv public/index.html public/app.html

COPY deploy/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["entrypoint.sh"]
CMD ["apache2-foreground"]
