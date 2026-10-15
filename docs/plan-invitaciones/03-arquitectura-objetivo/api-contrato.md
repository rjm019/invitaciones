# Contrato de la API (v1)

- **Base URL:** `{API_URL}/api`.
- **Respuestas:** JSON (Laravel API Resources).
- **Errores de validación:** `422` con `{ message, errors }`.
- **Autenticación:**
  - **Panel del dueño:** `clave_panel` (en `ajustes.csv`, o en el Excel en el formato anterior) → token cifrado que se manda como `Authorization: Bearer` (ver "Panel del dueño" abajo). Sanctum y Breeze se retiraron el 13-oct.
  - **Gestor:** cada persona con su usuario y su clave → token cifrado con alcance `manager` y su usuario; `GESTOR_CLAVE` enciende el gestor y crea la primera cuenta (ver "Gestor" abajo).
  - **Público:** sin login; el **token** de la URL es la credencial.
- **Almacenamiento:** sin base de datos. El evento sale de `eventos/<slug>/invitacion.csv` (o, en el formato anterior, de `layout.xlsx`); invitaciones, respuestas, aperturas y ajustes se guardan en CSV en esa carpeta (ver `eventos/README.md`). Una plantilla (`plantilla=SI`) responde 404 en todo lo público y no tiene panel.

---

## Página de la invitación (no es API)

`GET /e/{slug}` y `GET /i/{token}` responden la invitación compilada (`app.html`) con los mismos datos que darían `GET /public/events/{slug}` o `GET /public/invitations/{token}` dentro de `<script>window.__BOOT__={kind, key, data}</script>`. `GET /panel/{slug}` trae `{ brand }`, lo mismo que `GET /admin/events/{slug}/brand`. El JSON va escapado contra `</script>`. En `/i/` se registra la apertura, igual que en la API. Con `Cache-Control: no-cache, private`. Cualquier otra ruta que no sea `/api` ni `/media` da la página sin datos.

## Público

### `GET /public/invitations/{token}`

Devuelve el evento y la invitación (para cuántas personas es y quiénes ya están). Registra la apertura en `aperturas.csv`.

`event` es el mismo objeto que `GET /public/events/{slug}` (el config completo, plano: ver `web/src/types/event.ts`).

```json
{
  "event": { "slug": "xv-demo", "theme": "jardin-azul", "rsvp": { "mode": "token", "deadline": "2026-11-06", "open": true }, "sections": ["…"] },
  "invitation": {
    "label": "Familia Pérez",
    "passes": 3,
    "guests": [
      { "slot": 1, "full_name": "Ana Pérez", "attending": true, "responded_at": "2026-10-13T12:00:00-06:00" }
    ],
    "remaining": 2,
    "open": true,
    "closed_message": null,
    "deadline": "2026-11-06",
    "dedication": { "name": "Ana Pérez", "message": "¡Felicidades!", "sent_at": "2026-10-13T12:00:00-06:00" }
  }
}
```

`dedication` es `null` mientras ese enlace no deje su dedicatoria.

**Errores:** `404` si el token no existe o el evento no está publicado.

### `POST /public/invitations/{token}/rsvp`

**Throttle:** 10/min por IP e invitación. Registra **solo nombres nuevos** en los lugares libres; los ya registrados nunca cambian.

```json
{ "attending": true, "guests": [ { "full_name": "Luis Pérez" } ] }
```

**Validación (en el servidor):**

- `attending`: requerido, booleano (aplica a los nombres de este envío).
- `guests`: arreglo `min:1`, `max:{passes}`; `guests.*.full_name` requerido, máximo 120.
- Un nombre que ya está en la invitación se ignora (reenviar no duplica).
- Más nombres nuevos que lugares libres → `422` "Solo queda 1 lugar en tu invitación." / "Tu invitación ya está completa."
- Después de la fecha límite (fin del día, zona del evento) → `409` "Las confirmaciones cerraron el 6 de noviembre."

**Respuesta `200`:** `{ "invitation": … }` con la misma forma, ya actualizada.

### `POST /public/invitations/{token}/dedication`

**Throttle:** 5/min por IP e invitación. **Una dedicatoria por enlace**; ya guardada, no cambia. No depende de la fecha límite.

```json
{ "name": "Ana Pérez", "message": "¡Muchas felicidades!\nTe queremos." }
```

**Validación (en el servidor):** `name` requerido, máximo 80 (en una línea); `message` requerido, máximo 600 (conserva renglones, máximo una línea en blanco seguida). Si después de limpiar caracteres de control queda vacío → `422`. Si el enlace ya dejó una → `409` "Ya enviaste tu dedicatoria. ¡Gracias!". Se guarda en `dedicatorias.csv`, protegida contra fórmulas de Excel.

**Respuesta `200`:** `{ "invitation": … }` con `dedication` ya lleno.

### `GET /public/events/{slug}` (modo abierto, sin pases)

Devuelve solo `event`. Si `config.rsvp.mode = "open"`, también existe `POST /public/events/{slug}/rsvp` con `{ family_name, guests[], song, message }`, protegido con throttle y honeypot.

### `GET /public/events/{slug}/weather`

Clima del día del evento en la ciudad del salón (Open-Meteo, con caché en el servidor). Throttle 60/min.

```json
{
  "weather": {
    "kind": "typical",
    "date": "2026-11-28",
    "place": "Pachuca, Hidalgo",
    "day": { "code": 3, "max": 20.6, "min": 7.9, "rain_chance": 4 },
    "hours": [ { "time": "17:00", "temp": 16.8, "code": null, "rain_chance": null, "is_day": true } ],
    "years": [2016, 2025],
    "updated_at": "2026-10-13T13:10:34-06:00",
    "forecast_from": "2026-11-13"
  }
}
```

- `kind`: `forecast` desde 16 días antes (se pide de nuevo cada 30 min); antes, `typical`: la misma fecha ±3 días en los últimos 10 años (se guarda 30 días). En `typical`, `rain_chance` es el % de días con lluvia (≥ 1 mm).
- `hours`: inicio de la fiesta y cada 2 h, hasta 6 h después (sin pasar de medianoche).
- `weather: null` si el evento ya pasó o Open-Meteo falló sin una respuesta guardada para esa fecha.
- Ubicación: `clima_coordenadas` → coordenadas dentro de `salon_maps` → `salon_ciudad` buscada en Open-Meteo.
- `404` si el evento no existe o no está publicado.

### `GET /public/invitations/{token}/pass.pdf` (fase 5)

PDF con el nombre de la familia, los asistentes y un QR (que contiene el token).

**Disponibilidad:**

- Solo cuando `status = confirmed`.
- Desde el día en que se abre el registro (configurable).

---

## Panel del dueño (sin base de datos)

Se entra con `clave_panel` (mínimo 8 caracteres): en `ajustes.csv`, donde la pone el gestor, o en el layout (`evento → clave_panel`) en el formato anterior. La sesión es un token cifrado con `APP_KEY` (12 h; deja de servir si la clave cambia) que se manda como `Authorization: Bearer`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/admin/events/{slug}/brand` | Sin sesión, para la entrada: `{ brand: { title, theme, palette, fonts } }`. `title` es `titulo_panel` del layout o, en unos XV, "XV de {festejada_corto}". Sin fotos ni datos del evento. `404` evento desconocido · throttle 60/min |
| POST | `/admin/events/{slug}/session` | `{ password }` → `{ token, expires_at }`. `422` clave incorrecta · `403` evento sin clave · throttle 5/min |
| GET | `/admin/events/{slug}` | `{ version, brand: { title, theme, palette, fonts, subtitle, celebrant, starts_at, timezone, venue: { name, city }, assets, card: { background, phrase, text } }, event, rsvp: { deadline, open, changes_used, changes_left, max_changes }, summary: { invitations, seats, attending, declined, empty }, invitations: [{ id, label, passes, url, message, whatsapp_url, guests: [{ slot, full_name, attending, table, responded_at }], opens, created_at }], dedications: [{ invitation, label, name, message, sent_at }], max_passes }` (dedicatorias: la más reciente primero). `message` es el texto de `mensaje_whatsapp` ya armado; el panel lo manda sin el enlace junto al PDF de la invitación. `brand.card` sale de `tarjeta_fondo`, `tarjeta_frase` y `tarjeta_texto` del layout (`null` si no están) |
| POST | `/admin/events/{slug}/invitations` | `{ passes: 1…30, label? }` → `201 { invitation }` |
| PUT | `/admin/events/{slug}/deadline` | `{ deadline: AAAA-MM-DD }` → `{ rsvp }`. Entre hoy y el día del evento; **máximo 3 cambios** (`409` después) |
| GET | `/admin/events/{slug}/version` | `{ version }`: huella de los archivos del evento. El panel la consulta cada 5 s y recarga solo si cambió (en vivo sin base de datos) |
| PUT | `/admin/events/{slug}/tables` | `{ assignments: [{ invitation, slot, table: 1…999 \| null }] }` → el panel actualizado. Todo o nada; `422` si el lugar está vacío o la persona no asistirá |

Sin sesión válida: `401` "Tu sesión terminó. Entra de nuevo."

## Gestor (`/api/manager`)

Cada persona entra con su usuario y su clave (`eventos/_gestor/usuarios.csv`, solo el hash). `GESTOR_CLAVE` (16 caracteres o más) enciende el gestor —sin ella, todo responde `403`— y sirve para crear la primera cuenta; después ya no entra. La sesión es un token cifrado con alcance `manager` y el usuario (12 h) que se manda como `Authorization: Bearer`; deja de servir si esa persona cambia su clave o pierde el acceso, y si cambia `GESTOR_CLAVE`. Un token del panel no sirve aquí. Todo lo de abajo, salvo la sesión, lleva `throttle:240,1` (el editor guarda solo mientras se escribe). Lo que se publica, crea o cambia en los ajustes queda anotado con el `usuario` y el `nombre` de quien lo hizo.

Lo que viaja es el **diseño**: `{ event, colors, fonts, texts, page, sections: [{ id, fields, items }] }`, las filas de `invitacion.csv` agrupadas. La **versión** es la huella del archivo: `b-…` el borrador, `p-…` lo publicado, `a-…` un evento todavía en el formato anterior.

| Método | Ruta | Cuerpo → respuesta |
|---|---|---|
| GET | `/manager/session` | `{ enabled, setup }`: si el gestor está encendido y si falta crear la primera cuenta · throttle 60/min |
| POST | `/manager/session` | `{ username, password }` → `{ token, expires_at, user }` · `422` usuario o clave incorrectos (el mismo mensaje si el usuario no existe) · `403` sin `GESTOR_CLAVE`, o cuenta sin acceso (solo si la clave era correcta) · throttle 5/min por IP |
| POST | `/manager/setup` | `{ master_password, name, username, password }` → `201 { token, expires_at, user }`: la primera cuenta, que administra · `409` si ya hay cuentas · `422` clave maestra incorrecta o datos inválidos · throttle 5/min por IP |
| GET | `/manager/me` | `{ user }` · `user` = `{ username, name, role: admin\|editor, active, must_change_password, created_at, last_login_at }` (nunca la clave) |
| PUT | `/manager/me/password` | `{ current_password, password }` (10–128 caracteres, distinta de la actual y del usuario) → `{ token, expires_at, user }`: las sesiones anteriores de esa persona dejan de servir · `422` · throttle 5/min por persona |
| GET | `/manager/users` | Solo *admin* (`403` si no): `{ users }` |
| POST | `/manager/users` | Solo *admin*: `{ name, username, role }` → `201 { user, password }` (clave temporal; se ve esta vez y la persona la cambia al entrar) · `409` usuario repetido · `422` |
| PUT | `/manager/users/{username}` | Solo *admin*: `{ name?, role?, active?, reset_password? }` → `{ user, password? }` · `404` · `422` si te quitas el acceso o el rol a ti, pides tu propia clave temporal o no quedaría nadie activo que administre |
| GET | `/manager/catalog` | `{ catalog }`: tipos de sección (campos, lista, adornos, bloques de texto, `hidden_without`), grupos de `evento`, colores, fuentes, efectos, límites |
| GET | `/manager/events` | `{ events: [{ slug, title, type, celebrant, starts_at, published, template, format: design\|legacy, has_draft, pending, updated_at, last_publish: null\|{ published_at, origin, by: null\|{ username, name } }, cover: { theme, colors, font }, counts: { invitations, guests, attending } }] }` |
| POST | `/manager/events` | `{ slug, source: blank\|event, from?, template?, event? }` → `201 { slug, panel_password }` (clave nueva; `null` en plantillas) · `409` ya existe · `422` slug inválido o reservado (`vista-previa`, `gestor`, `api`, `media`, `nuevo`). Copia el diseño y `media/` (sin `originales/`); nunca los CSV del sistema, `respaldos/` ni `borrador/`. Nace con `publicado=NO` |
| GET | `/manager/events/{slug}/design` | `{ slug, design, version, source: draft\|live\|legacy, has_draft, pending, changes, config, issues, brand, settings, warnings, conversion: null\|{ identical, differences, errors } }`. Un evento en el formato anterior llega convertido (todavía sin escribir nada) |
| PUT | `/manager/events/{slug}/draft` | `{ design, version }` → `{ version, has_draft, pending, changes, config, issues, brand }`. La `config` se arma en modo tolerante (con errores, igual responde). `409 { message, version, design }` si alguien guardó antes · `422` si el diseño pasa de los límites |
| DELETE | `/manager/events/{slug}/draft` | Descarta el borrador → lo mismo que `GET design` |
| POST | `/manager/events/{slug}/publish` | `{ version, replace_owner_deadline? }` → `{ published_at, migrated, version }` · `422 { issues }` si hay errores · `409` versión vieja. Respalda lo publicado, escribe atómico, borra el borrador y anota en `respaldos/publicaciones.csv`. Con `replace_owner_deadline`, quita la fecha que movió el cliente |
| PUT | `/manager/events/{slug}/settings` | `{ panel_password?, published? }` → `{ settings }`. Aplica al instante; el historial anota "(cambiada)", nunca la clave |
| GET | `/manager/events/{slug}/history` | `{ current: null\|{ published_at, origin, by }, versions: [{ id, published_at, origin, by, replaced_at, bytes }] }` (las últimas 50). `current` es la que ven los invitados; en cada versión de antes, `published_at`/`origin`/`by` salen de la bitácora (`null` si no hay registro) y `replaced_at` es cuándo dejó de verse. `origin`: `borrador`, `formato anterior`, `nueva` o `copia de <slug>` |
| POST | `/manager/events/{slug}/history/{id}/restore` | Esa versión pasa al borrador → lo mismo que `GET design` |
| GET | `/manager/events/{slug}/media` | `{ files: [{ name, url, kind, bytes, width, height, modified, used_in }], total_bytes }` |
| POST | `/manager/events/{slug}/media` | `multipart: file, purpose?: fondo\|foto\|adorno, trim?` → `201 { file }`. Imágenes jpg, png, webp o gif (≤ 15 MB, revisadas con `finfo`; nunca SVG ni HTML) → WebP con nombre único (`nombre-3f9a.webp`); audio mp3 o m4a (≤ 20 MB) |
| DELETE | `/manager/events/{slug}/media/{file}` | `204` · `409 { used_in }` si la invitación (publicada o borrador) lo usa |
| GET | `/manager/events/{slug}/export?format=csv\|xlsx\|zip` | El archivo (`invitacion-<slug>.<formato>`). El zip lleva `invitacion.csv` y `media/`. Nunca la clave |
| POST | `/manager/events/{slug}/import` | `multipart: file` (csv, xlsx —también del formato anterior— o zip) → lo mismo que `GET design` + `import: { warnings, media }`. Queda en el borrador. Revisa zip-slip, tamaño (200 MB) y cantidad de archivos (300) |

Sin sesión válida: `401` "Tu sesión terminó. Entra de nuevo."

## CORS (`.env`)

```dotenv
APP_URL=https://api.tudominio.com
FRONTEND_URL=https://invitaciones.tudominio.com
```

`config/cors.php`: `allowed_origins => [env('FRONTEND_URL')]` y `paths => ['api/*']`, sin cookies (`supports_credentials = false`): todo va con tokens.
