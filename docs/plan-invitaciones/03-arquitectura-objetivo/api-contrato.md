# Contrato de la API (v1)

- **Base URL:** `{API_URL}/api`.
- **Respuestas:** JSON (Laravel API Resources).
- **Errores de validación:** `422` con `{ message, errors }`.
- **Autenticación:**
  - **Panel del dueño:** `clave_panel` del Excel → token cifrado que se manda como `Authorization: Bearer` (ver "Panel del dueño" abajo). Sanctum y Breeze se retiraron el 13-oct.
  - **Público:** sin login; el **token** de la URL es la credencial.
- **Almacenamiento:** sin base de datos. El evento sale de `eventos/<slug>/layout.xlsx` (o sus CSV); invitaciones, respuestas, aperturas y ajustes se guardan en CSV en esa carpeta (ver `eventos/README.md`).

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

Se entra con la clave del layout (`evento → clave_panel`, mínimo 8 caracteres). La sesión es un token cifrado con `APP_KEY` (12 h; deja de servir si la clave cambia) que se manda como `Authorization: Bearer`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/admin/events/{slug}/brand` | Sin sesión, para la entrada: `{ brand: { title, theme, palette, fonts } }`. `title` es `titulo_panel` del layout o, en unos XV, "XV de {festejada_corto}". Sin fotos ni datos del evento. `404` evento desconocido · throttle 60/min |
| POST | `/admin/events/{slug}/session` | `{ password }` → `{ token, expires_at }`. `422` clave incorrecta · `403` evento sin clave · throttle 5/min |
| GET | `/admin/events/{slug}` | `{ version, brand: { title, theme, palette, fonts, subtitle, celebrant, starts_at, timezone, venue: { name, city }, assets, card: { background, phrase, text } }, event, rsvp: { deadline, open, changes_used, changes_left, max_changes }, summary: { invitations, seats, attending, declined, empty }, invitations: [{ id, label, passes, url, message, whatsapp_url, guests: [{ slot, full_name, attending, table, responded_at }], opens, created_at }], dedications: [{ invitation, label, name, message, sent_at }], max_passes }` (dedicatorias: la más reciente primero). `message` es el texto de `mensaje_whatsapp` ya armado; el panel lo manda sin el enlace junto al PDF de la invitación. `brand.card` sale de `tarjeta_fondo`, `tarjeta_frase` y `tarjeta_texto` del layout (`null` si no están) |
| POST | `/admin/events/{slug}/invitations` | `{ passes: 1…30, label? }` → `201 { invitation }` |
| PUT | `/admin/events/{slug}/deadline` | `{ deadline: AAAA-MM-DD }` → `{ rsvp }`. Entre hoy y el día del evento; **máximo 3 cambios** (`409` después) |
| GET | `/admin/events/{slug}/version` | `{ version }`: huella de los archivos del evento. El panel la consulta cada 5 s y recarga solo si cambió (en vivo sin base de datos) |
| PUT | `/admin/events/{slug}/tables` | `{ assignments: [{ invitation, slot, table: 1…999 \| null }] }` → el panel actualizado. Todo o nada; `422` si el lugar está vacío o la persona no asistirá |

Sin sesión válida: `401` "Tu sesión terminó. Escribe la clave de nuevo."

## CORS (`.env`)

```dotenv
APP_URL=https://api.tudominio.com
FRONTEND_URL=https://invitaciones.tudominio.com
```

`config/cors.php`: `allowed_origins => [env('FRONTEND_URL')]` y `paths => ['api/*']`, sin cookies (`supports_credentials = false`): todo va con tokens.
