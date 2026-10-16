# Bugs y riesgos — priorizados

Severidad: **S1** rompe el producto · **S2** seguridad/datos · **S3** lógica/calidad · **S4** detalle.

> **Estado (13-oct-2026):**
> - **Resueltos (22):** 1–3, 5–8, 10–20, 22, 24–26. Los de la boda vieja (#3, #13–#15, #19 y #20) se resolvieron porque ese código se reemplazó: queda solo como referencia en `web/src/legacy/BodaLegacy.vue`, en desarrollo. Los de base de datos (#11 y #26) ya no aplican: no hay base de datos y las respuestas van en CSV, una fila por persona.
> - **Pendientes (4):**
>   - **#4:** pases en PDF (fase 5).
>   - **#9:** el repo sigue público, y `web/public/` todavía tiene las fotos reales de la boda original (`novios.jpeg`, `salon.jpeg`…) y `audio.mp3`.
>   - **#21:** `audio.mp3` pesa 9.4 MB. El MP3 de NAT irá en `eventos/nat/media/`.
>   - **#23:** imágenes JPEG de la boda sin optimizar. Las de NAT ya son WebP (`media:optimizar`).
>
>   #9, #21 y #23 se cierran con la pregunta abierta 16 (quitar esos archivos del repo).
>
> **16-oct-2026, en el gestor:** #27 y #28 resueltos; #29 sin reproducir, con tres medidas, en espera de tu confirmación (pregunta 46).

| # | Sev | Archivo:línea | Problema | Corrección propuesta | Fase |
|---|---|---|---|---|---|
| 1 | S1 | `api-invitation/app/Http/Controllers/GuestController.php:11` y `:36` | `index()` está declarado **dos veces** → `PHP Fatal error: Cannot redeclare` (verificado con `php -l`). Todas las rutas de `GuestController` dan 500 | Eliminar el duplicado | 1 |
| 2 | S1 | `api-invitation/routes/api.php:13` | `GET /guests` apunta a `listAll()`, que no existe | Eliminar la ruta o moverla al panel admin como `GuestController@all` con auth | 1 |
| 3 | S1 | `boda-invitacion/src/components/RegisterGuests.vue:81` | Llama `GET /invitations/{id}/can-generate`, que no existe en la API | Reemplazar por los datos que devuelve `GET /api/public/invitations/{token}` (`passes`, `status`, `guests`) | 1–2 |
| 4 | S1 | `boda-invitacion/src/components/RegisterGuests.vue:148` | Abre `/invitations/{id}/guests/pdf`, que no existe | Implementar pases en PDF (fase 5) o quitar la llamada | 5 |
| 5 | S1 | `boda-invitacion/src/router/index.ts:14` | Importa `Invitation.vue`, pero el archivo es `invitation.vue`. En Linux (CI, Netlify, Vercel) **el build falla** | Renombrar el archivo a `InvitationPage.vue` (PascalCase) y actualizar el import | 2 |
| 6 | S2 | `api-invitation/app/Http/Controllers/InvitationController.php:24-28` + router | El link expone **familia y número de pases** (`/invitacion/Perez/4`). Basta cambiar el 4 por un 8 | Usar `token` aleatorio (`Str::random(12)`, único); ruta `/i/:token` | 1 |
| 7 | S2 | `api-invitation/routes/api.php:8-13` | Sin auth: cualquiera lista **todas** las familias, crea invitaciones y lee invitados | Rutas públicas solo por token; el resto con `auth:sanctum` y `throttle` | 1 |
| 8 | S2 | `invitation.vue:465`, `RegisterGuests.vue:64,114` | El frontend descarga **la lista completa** de invitaciones para buscar una | `GET /api/public/invitations/{token}` devuelve solo esa invitación | 1–2 |
| 9 | S2 | Repo público | Fotos y nombres reales (padres, padrinos, novios) y un `audio.mp3` posiblemente con derechos de autor | Hacer el repo **privado** o sustituir por datos de ejemplo; contenido real fuera de git | 0 |
| 10 | S3 | `GuestController.php:19-33` | `max:` valida **por envío**: dos envíos rebasan los pases. Sin transacción | En una transacción: borrar los invitados previos y reinsertar (idempotente), validando `count <= passes` en el servidor | 1 |
| 11 | S3 | Modelo de datos | No hay estado de respuesta (confirmó, no asiste, pendiente) ni `responded_at` | Agregar columnas `status`, `responded_at`, `song`, `message` a `invitations` | 1 |
| 12 | S3 | `InvitationController.php:25`, `cors.php:23-24`, `GenerateLink.vue:78`, `invitation.vue:465`, `RegisterGuests.vue:64,81,114,131,148` | URLs fijas `127.0.0.1:8000` y `localhost:5173` | `config('app.frontend_url')` (`FRONTEND_URL`) y `import.meta.env.VITE_API_URL` con un cliente axios único (`src/api/http.ts`) | 1–2 |
| 13 | S3 | `invitation.vue` (1293 líneas) | Contenido de la boda fijo en el componente (nombres, fechas, ubicaciones, hoteles) | Partir en componentes de sección y alimentarlos con la configuración del evento (fase 3) | 3 |
| 14 | S3 | `invitation.vue:431` | Fecha del countdown fija (`2025-02-22T16:00:00`), sin zona horaria | `useCountdown(event.starts_at, event.timezone)` | 3 |
| 15 | S3 | `invitation.vue` (sección confirmación) | Pide confirmar "antes del 12 AGOSTO 2024" para una boda del 22-feb-2025 (inconsistente); la recepción dice "Iglesia Ejemplo" | Fechas y textos salen de la configuración, con validación `rsvp_deadline < starts_at` | 3 |
| 16 | S3 | `invitation.vue:346` | `beforeDestroy` es de Vue 2 → en Vue 3 **nunca se ejecuta**: los listeners de scroll y wheel quedan vivos | `onBeforeUnmount` (o `beforeUnmount`) | 2 |
| 17 | S3 | `invitation.vue:432` | `setInterval` del countdown nunca se limpia | Guardar el id y hacer `clearInterval` en unmount (dentro de `useCountdown`) | 2 |
| 18 | S3 | `invitation.vue:342,423` | `slowScroll` hace `preventDefault()` del wheel y reimplementa el scroll: se siente mal con trackpad y afecta la accesibilidad | Eliminarlo. Si se quiere suavidad: `scroll-behavior: smooth` o Lenis, opcional y respetando reduced-motion | 2 |
| 19 | S3 | `invitation.vue:354` | `switchPoint = 2300` px fijo para cambiar fecha → dress code: depende del alto del dispositivo | `IntersectionObserver` sobre la sección | 3 |
| 20 | S3 | `invitation.vue` (`updateTimeline`) | `document.querySelectorAll` global en cada scroll | Refs del componente + IntersectionObserver (`useTimelineProgress`) | 3 |
| 21 | S4 | `public/audio.mp3` (9.4 MB) | Demasiado pesado para datos móviles | Recodificar a 96–128 kbps con `ffmpeg` y recortar a ~3 min (≤ 3 MB; ideal ≈2 MB) | 6 |
| 22 | S4 | `GenerateLink.vue:96` | `document.execCommand('copy')` está obsoleto | `navigator.clipboard.writeText` | 5 |
| 23 | S4 | `public/` | Imágenes JPEG sin optimizar y nombres con espacios (`WhatsApp Image … .jpeg`, `fecha (2).jpeg`) | WebP/AVIF, `srcset`, nombres en kebab-case | 6 |
| 24 | S4 | Frontend | Restos del scaffold de Vite (`TheWelcome`, `icons/*`, `HomeView`, `AboutView`) | Eliminar | 2 |
| 25 | S4 | Ambos | Sin pruebas del dominio y sin linters configurados (Pint está instalado pero no se usa) | PHPUnit feature tests, Vitest para composables, Pint y ESLint/Prettier | 1–7 |
| 26 | S4 | Migraciones | Clases con nombre (`class CreateGuestsTable extends Migration`) en Laravel 11 (funciona, pero el estilo actual es anónimo); no hay índices adicionales | Migraciones nuevas en estilo anónimo; índice único en `token` | 1 |

### Encontrados en el gestor (16-oct-2026)

| # | Sev | Archivo:línea | Problema | Corrección | Estado |
|---|---|---|---|---|---|
| 27 | S1 | `web/src/services/previewProtocol.ts:119-127` | Una invitación nueva, en blanco, se quedaba en "Cargando la vista previa…": PHP manda la paleta y las letras vacías como `[]` (no `{}`) y la vista previa rechazaba esa config | `isMap` acepta la lista vacía y `normalizeConfig` la convierte en `{}` antes de pintar (prueba en `previewProtocol.spec.ts`) | Resuelto |
| 28 | S3 | `web/src/components/manager/GPopover.vue:26`, `:84` | El menú ⋯ de una tarjeta del inicio no salía con el puntero encima: la tarjeta se levanta con `transform`, y eso vuelve relativo a ella el `position: fixed` del menú (quedaba recortado; salía al alejar el puntero) | El menú se pinta fuera de la tarjeta (`Teleport` al diálogo o a `.mgr`) | Resuelto |
| 29 | S3 | `web/src/pages/ManagerPreviewPage.vue:295`, `web/src/themes/tokens.css:96`, `web/src/components/ui/SectionShell.vue:57` | La vista previa se quedaba en blanco de la mitad para abajo después de elegir una sección (hospedaje, playlist). No se reprodujo en Chromium sin interfaz | Tres medidas: en modo *Elegir*, el iframe de Spotify no recibe el toque; el fondo de la página es el del tema (no blanco); las secciones lejos de la pantalla pausan sus efectos (`.is-idle`) | Por confirmar (pregunta 46) |

## Riesgos del proyecto (no son bugs)

- **Privacidad:** las invitaciones contienen datos y **fotos de menores** (XV años). Nunca deben ir a repos públicos ni a URLs indexables. Usa `noindex` y tokens no adivinables.
- **Derechos de autor:**
  - **Canciones:** usa archivos que el cliente provea o enlaces de Spotify/YouTube; nunca subas audios con derechos a un repo público.
  - **Ilustraciones de Canva:** su licencia permite usarlas dentro de diseños, pero no siempre exportarlas sueltas para reutilizarlas fuera de Canva. Revisa la licencia de cada elemento antes de usarlo en código; si no queda claro, usa ilustraciones con licencia propia (Creative Market, Freepik Premium, Envato) o hechas a medida.
- **Autoplay:** iOS y Chrome bloquean el audio sin una interacción previa. Por eso se diseña el "sobre" que se toca para abrir.
- **Zona horaria:** el countdown y las fechas deben calcularse en `America/Mexico_City`, no en la del navegador del invitado.
