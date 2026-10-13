# Fase 1 — Reparar y rediseñar el backend (Laravel)

**Objetivo:** API segura por token, con eventos, estado de RSVP y pruebas.
**Duración estimada:** 1.5–2 días.
**Referencias:** `../03-arquitectura-objetivo/modelo-datos.md`, `api-contrato.md`, `../01-analisis-codigo/bugs-y-riesgos.md` (#1, 2, 6, 7, 8, 10, 11, 12, 26).

> **Estado (13-oct-2026): hecha, sin base de datos.** Por tu decisión del 13-oct, MySQL, Eloquent, las migraciones, Breeze y Sanctum se cambiaron por Excel y CSV por evento (`eventos/<slug>/`). La API también subió a Laravel 13. Los bloques 1.2 y 1.4 se resolvieron de otra forma; abajo se dice cómo. Detalle en `../09-avance.md`.
> Casillas: `[x]` hecho · `[x] ~~…~~ Cambió:` resuelto de otra forma · `[ ]` pendiente.

## 1.1 Arreglos inmediatos (lo deja funcionando como está hoy)

- [x] `GuestController.php`: eliminar el `index()` duplicado (líneas 36–40). Verificar con `php -l`. *Después, el controlador entero se retiró.*
- [x] `routes/api.php`: eliminar la ruta `/guests` → `listAll`.
- [x] Ejecutar `php artisan route:list` sin errores.

## 1.2 Modelo nuevo

- [x] ~~`RsvpStatus` (`pending`, `confirmed`, `declined`).~~ **Cambió:** cada persona tiene su renglón en `respuestas.csv` con `asistira` (SI/NO); los lugares vacíos son los pendientes.
- [x] ~~Migración `create_events_table`.~~ **Cambió:** el evento es `eventos/<slug>/layout.xlsx` (o sus CSV), que leen `LayoutReader` y `EventConfigBuilder`.
- [x] ~~Migración `add_event_and_rsvp_fields_to_invitations_table`.~~ **Cambió:** `invitaciones.csv` (`id, token, invitados, para, creada`) y `aperturas.csv`.
- [x] ~~Migración `alter_guests_table`.~~ **Cambió:** `respuestas.csv` (`invitacion, para, lugar, nombre, asistira, respondida, mesa`).
- [x] ~~Modelos `Event`, `Invitation` y `Guest`.~~ **Cambió:** `EventRepository`, `InvitationStore`, `ResponseStore` y `EventSettings`, encima de `CsvFile` (flock, tmp + rename, respaldo del día e historial).
- [x] Generador de tokens: `Str::random(12)` y reintento si choca con un token existente. *Está en `InvitationStore`; es único entre todos los eventos.*
- [x] `config/app.php`: `'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173')`.

## 1.3 Endpoints públicos

- [x] `Public/InvitationController@show($token)`: evento + invitación (`label`, `passes`, `guests`, `remaining`, `open`, `deadline`). Cada apertura se registra en `aperturas.csv`.
- [x] `Public/RsvpController@store($token)`. **Cambió la regla** a pedido tuyo:
  - Solo registra **nombres nuevos** en los lugares libres; los ya enviados nunca cambian.
  - El cupo se revisa dentro del `flock`.
  - Reenviar un nombre no lo duplica.
  - `attending` aplica a los nombres de ese envío.
  - Ya no pide `song` ni `message` (pregunta abierta 13).
- [x] Validación en el servidor, con mensajes en español; después de la fecha límite responde `409`.
- [x] `Public/EventController@show($slug)` para la invitación general (`/e/<slug>`).
- [x] Rate limiting: `rsvp` 10/min por IP y token. *El login del panel también tiene throttle: 5/min.*

## 1.4 Endpoints admin

- [x] ~~`auth:sanctum` y `Admin/EventController` (CRUD + `media`).~~ **Cambió:** el evento se edita en su Excel. El panel entra con `clave_panel` (token cifrado, 12 h) por `POST /admin/events/{slug}/session`.
- [x] ~~`Admin/InvitationController` (lista, alta, edición, borrado, `regenerate-token`).~~ **Cambió:** `PanelController` tiene la lista, `POST …/invitations` (por número de invitados), la fecha límite (`PUT …/deadline`, hasta 3 cambios), `PUT …/tables` (mesas) y `GET …/version` (en vivo). *Borrar o editar un enlace es la pregunta abierta 12.*
- [x] ~~`Admin/ImportController` (CSV de familias).~~ **Cambió:** los enlaces se generan en el panel; no se importan familias.
- [x] `Admin/ResponseController@csv`: hecho de otra forma. Los CSV que escribe la API ya son la exportación, y `invitaciones:resumen` arma `resumen.csv`.
- [x] ~~Políticas: un usuario solo ve sus eventos (`EventPolicy`).~~ **Cambió:** cada sesión del panel solo sirve para su evento. Hay prueba de eso.
- [x] `config/cors.php` y `.env`: `FRONTEND_URL`. *Sin `SANCTUM_STATEFUL_DOMAINS`: ya no hay cookies.*

## 1.5 Seeders y pruebas

- [x] ~~`DemoEventSeeder`.~~ **Cambió:** datos ficticios en `api/tests/Fixtures/eventos/` (`prueba`, `borrador`, `roto`).
- [x] Pruebas Feature (36 en verde):
  - `PublicInvitationTest`: token válido → 200; token inválido o mal formado → 404; evento no publicado → 404; registra aperturas.
  - `RsvpTest`:
    - Llenar por partes.
    - Los nombres anteriores no cambian.
    - Reenviar no duplica.
    - Más nombres que lugares libres → 422.
    - Mensajes en español.
    - Después de la fecha límite → 409.
    - Fórmulas de Excel neutralizadas.
    - Throttle → 429.
  - `AdminPanelTest`, en lugar de `AdminInvitationTest`:
    - Login.
    - Throttle.
    - La sesión no sirve para otro evento.
    - Generar enlaces.
    - Fecha límite: 3 cambios y después 409.
    - Versión.
    - Mesas.
    - La clave nunca sale en la invitación pública.
  - `PublicEventTest`, `InvitationSummaryTest` y `OptimizeMediaTest`.
- [x] `./vendor/bin/pint` sin cambios pendientes.

## Criterios de aceptación

- `php artisan test` en verde. *Hecho: 36 pruebas.*
- `GET /api/invitations` (ruta vieja) **ya no existe** o requiere auth. *Hecho: ya no existe.*
- Con Postman o Thunder Client: crear un evento, crear una invitación y confirmar con su token, siguiendo `api-contrato.md`. *Probado de punta a punta en el navegador con `eventos/natasha-prueba`.*

## Prompt sugerido para Claude Code

> Implementa la fase 1 siguiendo `docs/plan-invitaciones/04-fases/fase-1-reparar-backend.md` y los contratos de `03-arquitectura-objetivo/`. Trabaja en orden 1.1 → 1.5, corre `php artisan test` al final de cada bloque y muéstrame un resumen de los archivos tocados.
