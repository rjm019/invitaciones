# Despliegue

> **Pendiente de ajustar (13-oct-2026):** esta guía asume MySQL y Sanctum. Hoy no hay base de datos y el panel no usa cookies: la API necesita un disco persistente para `eventos/`, y el respaldo es de esa carpeta. Ver `../09-avance.md`.

## Opción recomendada (aprovecha que también administras servidores)

| Pieza | Dónde | Notas |
|---|---|---|
| Frontend (SPA) | **Netlify** o **Vercel** (gratis) | Build `npm run build`, carpeta `dist/`; regla de *rewrite* `/* → /index.html 200` |
| API Laravel | **VPS** (DigitalOcean, Hetzner o Contabo) con Nginx + PHP-FPM 8.2 + MySQL 8; o Laravel Forge o Ploi encima del VPS | También sirve `/i/{token}` con las OG tags (fase 7) |
| Archivos | `storage/app/public` + `php artisan storage:link` | Más adelante: Cloudflare R2 o S3 |
| DNS | `invitaciones.tudominio.com` → Netlify/Vercel; `api.tudominio.com` → VPS | El mismo dominio raíz facilita las cookies de Sanctum |
| HTTPS | Let's Encrypt (Certbot) en el VPS; automático en Netlify/Vercel | — |

### Alternativa "todo en uno"

Servir el build de Vue desde Laravel (`public/app/`), con una ruta *catch-all*. Así hay un solo servidor, sin problemas de CORS, y las OG tags son más sencillas.

## Variables de entorno

### API (`api-invitation/.env` en producción)

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.tudominio.com
FRONTEND_URL=https://invitaciones.tudominio.com
SANCTUM_STATEFUL_DOMAINS=invitaciones.tudominio.com
SESSION_DOMAIN=.tudominio.com
SESSION_SECURE_COOKIE=true
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=invitaciones
DB_USERNAME=invitaciones
DB_PASSWORD=********
FILESYSTEM_DISK=public
```

### Web (variables en Netlify/Vercel)

```dotenv
VITE_API_URL=https://api.tudominio.com
```

## Pasos en el VPS (resumen)

```bash
# como usuario deploy
git clone git@github.com:rjm019/invitaciones.git && cd invitaciones/api-invitation
composer install --no-dev --optimize-autoloader
cp .env.example .env   # editar valores de producción
php artisan key:generate
php artisan migrate --force
php artisan storage:link
php artisan config:cache && php artisan route:cache && php artisan view:cache
# Nginx: root → api-invitation/public ; PHP-FPM 8.2 ; client_max_body_size 10M (subida de audio)
# Cron: * * * * * php /ruta/artisan schedule:run   (respaldos y archivado)
```

## Netlify (`boda-invitacion/netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "dist"
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
[[headers]]
  for = "/*"
  [headers.values]
    X-Robots-Tag = "noindex, nofollow"
```

## Checklist de despliegue

- [ ] `APP_DEBUG=false`.
- [ ] CORS y Sanctum apuntan solo al dominio real.
- [ ] HTTPS en ambos dominios.
- [ ] `storage:link` creado y permisos 775 en `storage/` y `bootstrap/cache`.
- [ ] Respaldo diario de la BD probado (restaurar en local una vez).
- [ ] Smoke test de la fase 7 superado.
