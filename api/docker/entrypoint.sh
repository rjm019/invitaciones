#!/bin/sh
# Deja la API lista en el primer arranque y en cada reinicio:
# .env, dependencias y llave de la app. No hay base de datos: el estado vive en CSV.
set -e

cd /var/www/api

[ -f .env ] || cp .env.example .env

if [ ! -f vendor/autoload.php ]; then
  composer install --no-interaction --prefer-dist
fi

if ! grep -q '^APP_KEY=base64:' .env; then
  php artisan key:generate --force
fi

exec "$@"
