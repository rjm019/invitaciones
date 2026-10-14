# Invitaciones

Motor de invitaciones digitales (XV años, bodas, etc.) y sistema de recepción de invitados.

| App | Carpeta | Stack | URL local |
|---|---|---|---|
| API | `api/` | Laravel 13 · PHP 8.3 · sin BD (layouts CSV) | http://localhost:8010 |
| Invitación | `web/` | Vue 3 · Vite · TypeScript | http://localhost:5173 |
| Recepción (buscador) | `recepcion/` | JS plano, sin build, funciona sin internet | http://localhost:8090 |

Las tres apps son independientes: ninguna llama a otra en tiempo de ejecución.

## Arranque

Solo necesitas Docker.

```bash
docker compose up -d --build
```

El primer arranque de la API instala dependencias, crea `api/.env` y genera la llave (≈1–2 min). No hay base de datos: todo el estado vive en archivos CSV. Si los puertos chocan con otro proyecto: `API_PORT=8011 WEB_PORT=5174 RECEPCION_PORT=8091 docker compose up -d`.

## Probar en un celular

Con el celular en la misma red Wi-Fi que la Mac, abre `http://<ip-de-la-mac>:5173/e/<slug>` (la IP sale con `ipconfig getifaddr en0`). La web reenvía `/api` y `/media` a la API (`VITE_API_PROXY`), así que no hace falta configurar nada más. Para probar toques en reproductores incrustados (Spotify), usa un celular real: el modo "Mobile" de las herramientas de Chrome convierte el mouse en toques que no llegan bien a esos iframes.

El servidor de desarrollo (5173) recarga la página cada vez que cambia un archivo o se reconecta (por ejemplo, al desbloquear el celular). Para revisar sin eso, usa la **vista previa**, que es la versión de producción:

```bash
docker compose --profile vista-previa up -d preview   # http://<ip-de-la-mac>:4173/e/<slug>
docker compose restart preview                        # después de cada cambio (vuelve a construir)
```

## Producción

Publicado en Fly.io: https://invitaciones-jiro.fly.dev (por ejemplo `/e/nat` y `/panel/nat`). Un solo contenedor (`Dockerfile` de la raíz) con la API y la invitación, y un disco para `eventos/`. Detalle: `docs/plan-invitaciones/06-despliegue/despliegue.md`.

```bash
fly deploy --ha=false              # publicar el código
deploy/subir-evento.sh <slug>      # subir layout y media de un evento (no pisa respuestas)
```

## Pruebas

```bash
docker compose exec api php artisan test
docker compose exec web npm run test
docker run --rm -v "$PWD/recepcion":/app -w /app node:20-alpine node tests/importador.test.js
```

## Documentación

- Plan y arquitectura: `docs/plan-invitaciones/` (avance: `docs/plan-invitaciones/09-avance.md`)
- Formato de los eventos y uso del panel: `eventos/README.md`
- Guía para Claude Code: `CLAUDE.md`

Los datos reales de personas nunca se versionan (ver `.gitignore`).
