# Fase 0 — Preparación del repo y del entorno

**Objetivo:** dejar el repo seguro, ordenado y corriendo en local antes de tocar la lógica.
**Duración estimada:** 0.5 día.

> **Estado (13-oct-2026): hecha, salvo el repo privado (acción tuya).** Cambió: monorepo con `api/`, `web/` y `recepcion/`, y todo en Docker en lugar de instalar PHP, MySQL y Node. Detalle en `../09-avance.md`.
> Casillas: `[x]` hecho · `[x] ~~…~~ Cambió:` resuelto de otra forma · `[ ]` pendiente.

## Tareas

- [ ] **Privacidad del repo:** cambiar `rjm019/invitaciones` a **privado** (GitHub → Settings → Danger Zone → Change visibility), o sustituir fotos y nombres reales por datos de ejemplo. *Pendiente, y es acción tuya. Mientras, los datos reales están fuera de git y no se ha hecho ningún push.*
- [x] Crear la rama `refactor/motor-invitaciones` a partir de `main`.
- [x] Copiar esta carpeta `plan-invitaciones/` a `docs/plan-invitaciones/` en la raíz del repo.
- [x] Copiar `plan-invitaciones/CLAUDE.md` a la **raíz** del repo, para que Claude Code en VS Code lo lea automáticamente.
- [x] Agregar a `.gitignore` de la raíz. *También se ignoran `eventos/*`, `recepcion/ejemplos/`, `recepcion/prototipo/` y `recepcion/data/`:*
  ```gitignore
  docs/plan-invitaciones/02-diseno-nat/privado/
  **/.env
  **/node_modules/
  **/vendor/
  api-invitation/storage/app/public/eventos/
  ```
- [x] Verificar que `.env` **no** esté en el historial: `git log --all -- '*.env'`. *No hay ninguno.*
- [x] ~~**Backend:** `composer install`, `.env`, BD `api_invitation` en MySQL local, `migrate`, `php artisan serve`.~~ **Cambió:** contenedor `api` en Docker (puerto 8010) y **sin base de datos**.
- [x] ~~**Frontend:** `npm install` y `npm run dev` en la máquina.~~ **Cambió:** contenedor `web` en Docker (puerto 5173).
- [ ] Extensiones de VS Code recomendadas, en `.vscode/extensions.json` de la raíz. *No se creó; es opcional.*
  - `Vue.volar`
  - `bmewburn.vscode-intelephense-client`
  - `open-southeners.laravel-pint`
  - `dbaeumer.vscode-eslint`
  - `esbenp.prettier-vscode`
  - `mikestead.dotenv`
- [x] Opcional: renombrar las carpetas a `api/` y `web/`. Si se hace, actualizar todas las rutas de este plan. *Hecho; el buscador quedó en `recepcion/`.*

## Criterios de aceptación

- `php artisan serve` y `npm run dev` arrancan sin errores (aunque las rutas de invitados sigan rotas: eso se arregla en la fase 1). *Hoy: `docker compose up -d --build`.*
- El repo es privado, o ya no contiene datos personales.
- `CLAUDE.md` está en la raíz.

## Prompt sugerido para Claude Code (VS Code)

> Lee `CLAUDE.md` y `docs/plan-invitaciones/04-fases/fase-0-preparacion.md`. Ejecuta las tareas que se puedan automatizar (gitignore, extensions.json, verificación de .env en el historial) y dime cuáles requieren acción manual mía.
