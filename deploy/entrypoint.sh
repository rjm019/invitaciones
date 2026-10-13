#!/bin/sh
# Arranque en Fly: la carpeta de eventos en el disco persistente (/data) y la
# configuración de Laravel cacheada con las variables de este entorno.
set -e

EVENTOS_PATH="${EVENTOS_PATH:-/data/eventos}"
mkdir -p "$EVENTOS_PATH"
chown -R www-data:www-data "$EVENTOS_PATH"

cd /var/www/api
php artisan config:cache
php artisan route:cache
php artisan view:cache
chown -R www-data:www-data storage bootstrap/cache

exec "$@"
