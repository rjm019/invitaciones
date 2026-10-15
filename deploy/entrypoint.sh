#!/bin/sh
# Arranque en Fly: la carpeta de eventos en el disco persistente (/data) y la
# configuración de Laravel cacheada con las variables de este entorno.
set -e

EVENTOS_PATH="${EVENTOS_PATH:-/data/eventos}"
# Apache también la usa: entrega la media directo de ahí (apache-site.conf).
export EVENTOS_PATH
mkdir -p "$EVENTOS_PATH"
chown -R www-data:www-data "$EVENTOS_PATH"
# Caché (clima, límites de envíos) en el disco: sobrevive a que la máquina se apague.
if [ -n "${CACHE_FILE_PATH:-}" ]; then
  mkdir -p "$CACHE_FILE_PATH"
  chown -R www-data:www-data "$CACHE_FILE_PATH"
fi

cd /var/www/api
# Configuración, rutas, vistas y eventos en caché: cada petición arranca con menos trabajo.
php artisan optimize
chown -R www-data:www-data storage bootstrap/cache

exec "$@"
