# API Laravel para desarrollo. El código se monta como volumen (ver docker-compose.yml),
# así que la imagen solo trae PHP, sus extensiones y Composer.
FROM php:8.3-cli-alpine

COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/
# gd convierte las imágenes a WebP; exif endereza las fotos del celular; intl y zip los
# pide Laravel/Composer (zip también arma y lee los paquetes de invitación).
RUN install-php-extensions intl zip gd pcntl exif

# Límites de subida del gestor (igual que deploy/php.ini en producción).
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-invitaciones.ini

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/api

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["entrypoint.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
