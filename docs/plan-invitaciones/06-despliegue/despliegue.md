# Despliegue (Fly.io)

**En producción desde el 13-oct-2026:** https://invitaciones-jiro.fly.dev. El primer evento es `/e/nat`, con su panel en `/panel/nat`.

Se eligió Fly.io porque es barato y tiene disco persistente. La app guarda todo en CSV, así que necesita un disco que sobreviva a reinicios y un solo servidor escribiendo. Los planes gratis de Koyeb y Render borran el disco y Cloud Run no tiene candados de archivo; la comparación está en `09-avance.md`.

## Cómo está armado

| Pieza | Valor |
|---|---|
| Cuenta | `rchard14k@gmail.com` (organización *personal*) |
| App | `invitaciones-jiro`, región `dfw` (Dallas) |
| Servidor | 1 máquina `shared-cpu-1x`, 512 MB, sin swap. Sin visitas se **suspende** (guarda su memoria) y despierta en unos cientos de ms; si Fly no puede reanudarla, arranca de cero (~5 s) |
| Disco | Volumen `eventos` de 1 GB, cifrado, montado en `/data` |
| Datos | `/data/eventos/<slug>/` (layout, media y los CSV que escribe la app) y `/data/cache/` (clima y límites de envíos) |
| Secretos | `APP_KEY` (`fly secrets`). Si cambia, se cierran las sesiones del panel y del gestor. `GESTOR_CLAVE` (16 caracteres o más): la clave maestra de `/gestor`; sin ella el gestor no abre (todavía no está puesta: ver "Gestor: primera publicación") |
| Costo | ~2–3 USD/mes (máquina por uso + disco 0.15 USD/GB) |

**Imagen** (`Dockerfile` de la raíz):

- Se arma en dos etapas: primero se compila la invitación (Vue, con `VITE_API_URL` vacío) y luego va con Laravel sobre `php:8.3-apache`.
- Apache sirve los archivos de `public/` con `KeepAlive Off` (con prefork, cada conexión abierta del proxy ocupaba un proceso y las demás hacían fila).
- Cualquier ruta que no sea `/api` ni `/media` responde `public/app.html`, que es la invitación compilada (`SpaController`). En `/e/{slug}` y `/i/{token}`, la página ya lleva los datos en `window.__BOOT__`, así la invitación no espera otra petición.
- `.dockerignore` deja fuera `eventos/`, `docs/`, `recepcion/`, los `.env` y lo de la boda original en `web/public` (fotos reales y una canción con derechos).
- `deploy/` trae la configuración de Apache (12 procesos como máximo), la de PHP y el arranque. El arranque crea las carpetas del disco y cachea la configuración de Laravel.
- PHP acepta subidas de hasta 60 MB (`upload_max_filesize=60M`, `post_max_size=64M`) para el audio y los zip del gestor; cada imagen se limita en la app (15 MB y un máximo de megapíxeles, con `memory_limit` alto solo mientras se convierte a WebP).
- En `/gestor*` la página lleva `X-Robots-Tag: noindex` y `Content-Security-Policy: frame-ancestors 'self'` (la vista previa es un iframe del mismo sitio).

**Variables** (`[env]` de `fly.toml`):

- `APP_ENV=production`, `APP_DEBUG=false`, `LOG_CHANNEL=stderr`.
- `EVENTOS_PATH=/data/eventos` y `CACHE_FILE_PATH=/data/cache`.
- `APP_URL` y `FRONTEND_URL` = la URL pública. Los enlaces que genera el panel salen de `FRONTEND_URL`.
- Laravel confía en el proxy de Fly (`trustProxies`), así que las URLs de media salen con `https`. No hay base de datos: la caché y la sesión usan archivos.

## Comandos

```bash
fly auth login                         # una vez, con la cuenta de Fly
fly deploy --ha=false                  # publicar el código (un solo servidor: el disco es de uno)
deploy/subir-evento.sh nat             # subir o actualizar media/ (y el layout, si sigue en el formato anterior)
deploy/subir-evento.sh nat --forzar    # además reemplaza invitacion.csv en el servidor (respalda antes la de allá)
deploy/bajar-evento.sh nat             # traer todo el evento del servidor a eventos/nat-servidor-<fecha>/
fly logs                               # ver lo que pasa
fly ssh console                        # entrar al servidor
fly ssh sftp get /data/eventos/nat/respuestas.csv respuestas.csv   # bajar las respuestas
fly volumes snapshots list <id-del-volumen>                            # respaldos del disco
```

`deploy/subir-evento.sh <slug>` manda `media/` (sin `media/originales`) y, si el evento sigue en el formato anterior, su layout (`layout.xlsx` o sus CSV). **Nunca pisa** lo que escribe la app en producción: invitaciones, respuestas, dedicatorias, aperturas, ajustes, respaldos ni el borrador del gestor.

- `invitacion.csv` solo se sube con `--forzar`: en producción la edita el gestor. Antes de reemplazarla, guarda la del servidor en `respaldos/invitacion-subida-AAAAMMDD-HHMMSS.csv`. Si allá hay un borrador sin publicar, lo avisa (sigue ahí).
- `deploy/bajar-evento.sh <slug> [carpeta]` trae todo lo del servidor a una carpeta **nueva** (por defecto `eventos/<slug>-servidor-AAAAMMDD-HHMM/`); nunca pisa la local.
- Los dos se probaron con un `fly` simulado (el servidor en una carpeta temporal), no contra Fly.

## Respaldos

- Fly hace una copia (snapshot) diaria del volumen y la guarda unos días.
- La API guarda una copia del día de cada CSV antes de cambiarlo (`respaldos/`), pero en el mismo disco.
- Antes y después del evento, baja el evento completo con `deploy/bajar-evento.sh <slug>` (o solo `respuestas.csv`, `dedicatorias.csv` e `invitaciones.csv` con `fly ssh sftp get`).
- Cada publicación del gestor guarda la versión anterior en `respaldos/` (las últimas 50) y se puede restaurar desde su historial.

## Pendiente

- **Una sola vez, antes del próximo `subir-evento.sh`:** el evento cambió de carpeta (`nat`). En el disco de Fly hay que moverla con `fly ssh console -C "mv /data/eventos/<nombre-anterior> /data/eventos/nat"`; si no, `subir-evento.sh nat` crearía una carpeta nueva sin las invitaciones ni las respuestas.

- Vista previa de WhatsApp (Open Graph). Como Laravel ya sirve `app.html`, se puede inyectar el título y la imagen de cada evento ahí.
- Dominio propio (opcional): `fly certs add <dominio>`, y luego cambiar `APP_URL` y `FRONTEND_URL`.
- CI con las pruebas antes de cada `fly deploy`.
- Confirmar con `fly machine status` que la máquina queda `suspended` (no `stopped`) después de unos minutos sin visitas. Si no, la otra salida es dejar una encendida (`min_machines_running = 1`, ~3 USD/mes).

## Gestor: primera publicación (runbook)

**Solo cuando lo pidas.** Hasta entonces producción sigue como está: NAT con su Excel y sin `/gestor`. Conviene hacerlo fuera de horas pico.

0. **Antes:** lo pendiente de `09-avance.md` → "Qué falta": renombrar la carpeta en el disco (`mv … /data/eventos/nat`) y subir el Excel de NAT con lo último (`deploy/subir-evento.sh nat`). La migración del paso 6 parte del Excel que hay **en el servidor**.
1. **La clave maestra:** `fly secrets set GESTOR_CLAVE='<16 caracteres o más>'`. Reinicia la máquina unos segundos. La eliges tú; no se escribe en ningún archivo.
2. **El código:** merge de `feature/gestor-plantillas` a `main` y `fly deploy --ha=false`. NAT sigue funcionando con su Excel: un evento sin `invitacion.csv` se lee como antes.
3. **Respaldo:** `deploy/bajar-evento.sh nat` (copia completa en tu Mac).
4. **Ensayo:** en `https://invitaciones-jiro.fly.dev/gestor`, "Nueva invitación" → "Copiar /e/nat" como `nat-ensayo`. Cambia algo, publica y revisa la vista previa y el historial. Después bórrala: `fly ssh console -C "rm -rf /data/eventos/nat-ensayo"`.
5. **Revisar la migración:** `fly ssh console -C "sh -c 'cd /var/www/api && php artisan invitacion:migrar nat --probar'"`. Debe decir que la invitación queda **idéntica**. Si muestra diferencias, para aquí.
6. **Migrar:** `fly ssh console -C "sh -c 'cd /var/www/api && php artisan invitacion:migrar nat && chown -R www-data:www-data /data/eventos/nat'"`. Escribe `invitacion.csv`, pasa `clave_panel` y `publicado` a `ajustes.csv` y copia el Excel a `respaldos/formato-anterior-<fecha>/`. No toca invitaciones ni respuestas.
7. **Revisar:** `/e/nat`, una `/i/<token>` que ya hayas mandado, `/panel/nat` (la misma clave de siempre) y `/gestor` (NAT ya sin "Formato anterior").

**Si algo sale mal:** borra `/data/eventos/nat/invitacion.csv` y quita `clave_panel` y `publicado` de `/data/eventos/nat/ajustes.csv` (o restaura el `ajustes-<fecha>.csv` de `respaldos/`). El Excel sigue en su lugar, así que NAT vuelve a leerse como antes.

**Después:** los cambios de NAT se hacen en el gestor (o con `--forzar`, sabiendo que reemplaza lo de allá). `deploy/subir-evento.sh nat` sigue sirviendo para subir media.

## Checklist de cada publicación

- [ ] `docker compose exec api php artisan test`, `docker compose exec web npm run test` y `docker compose exec web npm run build` en verde.
- [ ] `fly deploy --ha=false`.
- [ ] Abrir `/up`, `/e/<slug>`, `/panel/<slug>` y `/gestor`. Confirmar con una invitación de prueba y borrarla del CSV si hace falta.
- [ ] `fly logs` sin errores.
