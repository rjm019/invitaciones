# Despliegue (Fly.io)

**En producción desde el 13-oct-2026:** https://invitaciones-jiro.fly.dev. El primer evento es `/e/nat`, con su panel en `/panel/nat`.

Se eligió Fly.io porque es barato y tiene disco persistente. La app guarda todo en CSV, así que necesita un disco que sobreviva a reinicios y un solo servidor escribiendo. Los planes gratis de Koyeb y Render borran el disco y Cloud Run no tiene candados de archivo; la comparación está en `09-avance.md`.

## Cómo está armado

| Pieza | Valor |
|---|---|
| Cuenta | `tu cuenta personal` (organización *personal*) |
| App | `invitaciones-jiro`, región `dfw` (Dallas) |
| Servidor | 1 máquina `shared-cpu-1x`, 256 MB + 256 MB de swap. Se **apaga sin visitas** y despierta con la siguiente; la primera visita tarda ~5 s |
| Disco | Volumen `eventos` de 1 GB, cifrado, montado en `/data` |
| Datos | `/data/eventos/<slug>/` (layout, media y los CSV que escribe la app) y `/data/cache/` (clima y límites de envíos) |
| Secreto | `APP_KEY` (`fly secrets`). Si cambia, se cierran las sesiones del panel |
| Costo | ~2–3 USD/mes (máquina por uso + disco 0.15 USD/GB) |

**Imagen** (`Dockerfile` de la raíz):

- Se arma en dos etapas: primero se compila la invitación (Vue, con `VITE_API_URL` vacío) y luego va con Laravel sobre `php:8.3-apache`.
- Apache sirve los archivos de `public/`. Cualquier ruta que no sea `/api` ni `/media` responde `public/app.html`, que es la invitación compilada, y el router de Vue decide qué mostrar.
- `.dockerignore` deja fuera `eventos/`, `docs/`, `recepcion/`, los `.env` y lo de la boda original en `web/public` (fotos reales y una canción con derechos).
- `deploy/` trae la configuración de Apache (8 procesos como máximo), la de PHP y el arranque. El arranque crea las carpetas del disco y cachea la configuración de Laravel.

**Variables** (`[env]` de `fly.toml`):

- `APP_ENV=production`, `APP_DEBUG=false`, `LOG_CHANNEL=stderr`.
- `EVENTOS_PATH=/data/eventos` y `CACHE_FILE_PATH=/data/cache`.
- `APP_URL` y `FRONTEND_URL` = la URL pública. Los enlaces que genera el panel salen de `FRONTEND_URL`.
- Laravel confía en el proxy de Fly (`trustProxies`), así que las URLs de media salen con `https`. No hay base de datos: la caché y la sesión usan archivos.

## Comandos

```bash
fly auth login                         # una vez, con la cuenta de Fly
fly deploy --ha=false                  # publicar el código (un solo servidor: el disco es de uno)
deploy/subir-evento.sh nat         # subir o actualizar layout y media de un evento
fly logs                               # ver lo que pasa
fly ssh console                        # entrar al servidor
fly ssh sftp get /data/eventos/nat/respuestas.csv respuestas.csv   # bajar las respuestas
fly volumes snapshots list <id-del-volumen>                            # respaldos del disco
```

`deploy/subir-evento.sh <slug>` manda solo lo que editas tú: el layout (`layout.xlsx` o sus CSV) y `media/`, sin `media/originales`. **Nunca pisa** lo que escribe la app en producción: invitaciones, respuestas, dedicatorias, aperturas y ajustes.

## Respaldos

- Fly hace una copia (snapshot) diaria del volumen y la guarda unos días.
- La API guarda una copia del día de cada CSV antes de cambiarlo (`respaldos/`), pero en el mismo disco.
- Antes y después del evento, baja `respuestas.csv`, `dedicatorias.csv` e `invitaciones.csv` con `fly ssh sftp get`.

## Pendiente

- Vista previa de WhatsApp (Open Graph). Como Laravel ya sirve `app.html`, se puede inyectar el título y la imagen de cada evento ahí.
- Dominio propio (opcional): `fly certs add <dominio>`, y luego cambiar `APP_URL` y `FRONTEND_URL`.
- CI con las pruebas antes de cada `fly deploy`.
- Decidir si se deja una máquina siempre encendida (`min_machines_running = 1`, ~2 USD/mes más) para quitar los ~5 s de la primera visita.

## Checklist de cada publicación

- [ ] `docker compose exec api php artisan test`, `docker compose exec web npm run test` y `docker compose exec web npm run build` en verde.
- [ ] `fly deploy --ha=false`.
- [ ] Abrir `/up`, `/e/<slug>` y `/panel/<slug>`. Confirmar con una invitación de prueba y borrarla del CSV si hace falta.
- [ ] `fly logs` sin errores.
