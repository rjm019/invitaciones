#!/bin/sh
# Arranque en Fly: la carpeta de eventos en el disco persistente (/data) y la
# configuración de Laravel cacheada con las variables de este entorno.
set -e

EVENTOS_PATH="${EVENTOS_PATH:-/data/eventos}"
mkdir -p "$EVENTOS_PATH"
chown -R www-data:www-data "$EVENTOS_PATH"
# Caché (clima, límites de envíos) en el disco: sobrevive a que la máquina se apague.
if [ -n "${CACHE_FILE_PATH:-}" ]; then
  mkdir -p "$CACHE_FILE_PATH"
  chown -R www-data:www-data "$CACHE_FILE_PATH"
fi

cd /var/www/api
php artisan config:cache
php artisan route:cache
php artisan view:cache
chown -R www-data:www-data storage bootstrap/cache

exec "$@"
