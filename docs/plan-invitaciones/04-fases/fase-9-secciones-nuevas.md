# Fase 9 — Secciones nuevas

**Objetivo:** las secciones que hoy se dan por hechas en bodas y XV (ceremonia y recepción por separado, mesa de regalos y lluvia de sobres, galería, video, publicaciones de redes, álbum de los invitados) y dos ideas propias (trivia e itinerario en vivo), pensadas para lo que aguanta Fly (512 MB, disco de 1 GB, sin cron).
**Planeada:** 15-oct-2026. **Orden:** después del paso 2 de la fase 10 (landing y demos); ver "Orden de trabajo total" en `fase-10-landing-y-demos.md`.

> Casillas: `[x]` hecho · `[ ]` pendiente.

## Avance

- [ ] 1. Ubicación (ceremonia, recepción o ambas) · Itinerario en vivo · ~~Mesa de regalos y lluvia de sobres~~ (hecha el 16-oct, ver §2)
- [ ] 2. Galería (con miniaturas)
- [ ] 3. Video · Publicación de redes
- [ ] 4. Trivia
- [ ] 5. Álbum de los invitados (ciclo de 5 a 20 días)

## Contexto

El catálogo del gestor (`api/app/Services/Design/Catalog.php`, `SECTIONS`) tenía 17 tipos el 15-oct (18 desde el 16-oct, con `mesa_regalos`): portada, música, bendición, fecha, foto (una sola, en arco), ubicación, frase, itinerario, vestimenta, solo adultos, clima, hospedaje, playlist, cuenta regresiva, confirmación, dedicatoria y cierre. Le faltan piezas que hoy se dan por hechas en bodas y XV:
- mesa de regalos con lluvia de sobres (imagen 1);
- galería;
- video;
- publicaciones de redes;
- álbum que llenan los invitados;
- separar ceremonia y recepción, cada una con su "Agregar al calendario" (imagen 2).

El usuario además eligió dos ideas nuevas: **Trivia de la festejada** e **Itinerario en vivo**.

**Decisiones del usuario (15-oct):**
- Álbum: **2 fotos por invitación (enlace)**; se suben **desde el día del evento**.
- El dueño elige las fotos en el panel. La invitación sigue visible **de 5 a 20 días (lo define el gestor; 5 por defecto) contados desde el día siguiente al evento**, con el álbum y la descarga en .zip desde el panel.
- Al cerrar, las fotos no elegidas ya se habrán borrado y el **álbum entero se borra**. La invitación se inhabilita, pero **el panel y los CSV se quedan**.
- Video: **YouTube, archivo propio (disco), Instagram o Facebook**. Además, una sección para mostrar una **publicación** de esas redes.

**Lo que ya hay y se reutiliza:**
- Para agregar un tipo de sección: `Catalog` + componente con `data-text` y `var(--t-<bloque>-…)` + línea en `sectionRegistry` (regla 10; `frontend.md` §6).
- `ImageOptimizer::toWebp`: GD → WebP, derecha por EXIF, máx. 16 MP, `ensureMemory` sube la memoria a 256 MB solo mientras procesa.
- `web/src/services/imageResizeService.ts`: reduce la foto en el navegador antes de subirla (HEIC → JPEG).
- `MediaLibrary`, `calendarService.ts`, `audioService.ts` (pausar la música), `CsvFile` (atómico + flock + respaldo).
- `PanelService::version` + `usePolling` (en vivo sin BD).
- El patrón "uno por enlace, revisado dentro del candado" de `DedicationStore`.
- El borrado con archivo de eliminados (commit `2d13067`).

### El stack de Fly: límites y ventajas

| Fly | Cómo pesa en el diseño |
|---|---|
| 1 máquina `shared-cpu-1x`, **512 MB**, sin swap | Ni video ni fotos enormes se procesan en el servidor. Las fotos se reducen **en el celular**; el servidor solo re-codifica una imagen ya chica. Las subidas llevan throttle para que no se junten varias decodificaciones (256 MB cada una). |
| Disco de **1 GB** (ampliable con `fly volumes extend`, 0.15 USD/GB) | MP4 propio con tope (40 MB) y sin re-codificar. Álbum con tope por evento. El álbum se borra al cerrar (5–20 días): el disco se recupera solo. |
| Se suspende sin visitas, y solo una máquina puede montar el volumen | No hay cron ni colas. La limpieza del álbum es **perezosa**: se hace en la primera petición después del cierre, bajo candado e idempotente. Además hay un comando `album:cerrar` para correrlo a mano. |
| Apache entrega `/media` sin PHP (soporta `Range`) | Las fotos aprobadas y los MP4 se sirven sin PHP y el video se puede adelantar. Las fotos pendientes quedan fuera de la carpeta pública. |
| Sin BD; "en vivo" por huella cada 5 s | Fotos, trivia y canciones son CSV por evento; el panel se actualiza con el mismo `version()`. |

---

## 1. Ubicación: ceremonia, recepción o ambas (lo elige el gestor)

- `ubicacion` pasa a ser **`repeatable`**. Puede ser una sección con varios lugares o una sección por lugar en distintas partes de la invitación.
- Cada lugar lleva el campo **`tipo`** (select): Ceremonia religiosa · Ceremonia civil · Recepción · Ceremonia y recepción · Otro. Pone la etiqueta y el ícono por defecto; `etiqueta` sigue funcionando y gana si se escribe.
- Cada lugar tiene **Ver ubicación** (ya existe) y **Agregar al calendario** (nuevo, con la hora y el lugar de ese punto; reutiliza `calendarService.ts`). Se enciende con `calendario` (SI/NO) en la sección.
- Nuevo campo de sección `acomodo`: `lado a lado` (imagen 2; en el celular se apilan) · `uno debajo del otro`.
- Sin `tipo`, se ve igual que hoy (NAT no cambia).

## 2. Mesa de regalos y lluvia de sobres (`mesa_regalos`, tipo `gifts`)

> **Hecho (16-oct):** como se describe abajo. Los campos de la lluvia de sobres son `sobres_titulo`, `sobres_texto`, `banco`, `cuenta`, `titular`, `sobre_fisico` y `solo_con_enlace` (encendido si no se escribe). El filtro está en `GiftPrivacy` (lo usan `EventController` y la página precargada `/e/`); la vista previa del gestor lo imita en *Enlace general*. La tienda no lleva logotipo: un monograma con su inicial. En Nueva York, la variante `bolsas` (bolsas de la Quinta Avenida y un sobre déco). Pruebas: `EventGiftsTest`, `giftService.spec.ts`.

- **Tiendas** (lista, máx. 8):
  - `tienda` (select con ícono: Amazon, Liverpool, Palacio de Hierro, Sears, Costco, Otra);
  - `nombre`;
  - `nota` ("Ver lista de deseos");
  - `enlace` (https);
  - `numero_evento` (número de mesa de Liverpool, con botón de copiar).
- **Lluvia de sobres** (opcional):
  - `banco`;
  - `cuenta` (CLABE o tarjeta, agrupada de 4 en 4, con botón **Copiar**);
  - `titular`;
  - `texto`;
  - `sobre_fisico` (aviso: "También habrá caja para sobres en el salón").
- **`solo_con_enlace`** (SI por defecto): el servidor quita los datos bancarios del `config` de la invitación general `/e/<slug>`. Solo los ven las invitaciones personales `/i/<token>`. El filtro va en el builder y el controlador, nunca en la web.
- Diseño como la imagen 1: tarjetas con ícono, título en mayúsculas espaciadas y botón "IR", todo con tokens del tema.

## 3. Galería (`galeria`, tipo `gallery`)

- Lista de fotos (máx. 24) de la biblioteca de media, con `pie` opcional. `acomodo`: cuadrícula · carrusel · mosaico.
- **Visor** a pantalla completa:
  - deslizar entre fotos;
  - cerrar con Esc o deslizando hacia abajo;
  - el foco queda atrapado mientras está abierto y se devuelve al cerrar;
  - solo anima `transform` y `opacity`, y respeta `prefers-reduced-motion`.
- El álbum (§6) también lo usa.
- **Miniaturas:** `MediaLibrary` genera además `<nombre>-480.webp` al subir y la sección usa `srcset` (480/920). Para las fotos que ya existen, `media:optimizar` las genera.

## 4. Video (`video`, tipo `video`)

- `fuente`:
  - **YouTube** (`youtube-nocookie.com`, también Shorts);
  - **Archivo propio** (MP4 H.264, máx. **40 MB**, sin re-codificar; lo sirve Apache con `Range`);
  - **Instagram** (reel o video);
  - **Facebook** (video).
- **Fachada:** se ve una portada (`poster`, imagen de la biblioteca; en YouTube, la miniatura pública) con botón de play. El reproductor o el script de la red **se carga solo al tocar**: abrir la invitación no pesa ni carga rastreadores de Meta. Al reproducir, la música de la invitación se pausa (`audioService`).
- `formato`: horizontal 16:9 · vertical 9:16.
- El servidor valida la URL (solo esos dominios, `https`) y saca el id. La subida del MP4 pasa por `MediaLibrary` (`finfo`: `video/mp4`). Agregar `mp4` al `AliasMatch` de `deploy/apache-site.conf`.

## 5. Publicación de redes (`publicacion`, tipo `social-post`, repetible)

- Una publicación de **Instagram, Facebook o YouTube** (post, reel o comunidad) por sección: `red`, `enlace`, `texto` opcional ("Síguenos en…") y `poster` opcional.
- Usa la misma fachada que el video. Al tocar, se carga el embed oficial: el `blockquote` + `embed.js` en Instagram y el iframe del plugin en Facebook. Si la red lo bloquea, aparece un botón "Ver en Instagram".
- Se comparte el servicio de URLs con §4 (`socialEmbedService.ts`, con pruebas) y su validación en PHP.

## 6. Álbum de los invitados (`album`, tipo `guest-album`)

**Calendario** (zona horaria del evento; `albumWindow()` en PHP y su espejo en TS para la interfaz):

| Momento | Qué pasa |
|---|---|
| Antes del día del evento | La sección dice "El día de la fiesta podrás subir tus fotos aquí". |
| Desde las 00:00 del día del evento | En `/i/<token>`: "Sube tus fotos (te quedan 2)". |
| Día siguiente al evento → N días (`album_dias`, 5–20, campo de la sección en el gestor; el servidor lo acota) | Se sigue pudiendo subir. El dueño elige en el panel. La invitación muestra el álbum (solo las elegidas). El panel descarga el .zip. |
| Al terminar el día N | Se borra el álbum completo. `/e` y `/i` muestran "Este evento ya terminó. ¡Gracias por acompañarnos!". El panel y los CSV se quedan (respuestas, mesas, dedicatorias, `album.csv` como bitácora). |

**Subida** (solo desde `/i/<token>`):
- Máximo **2 por invitación**, revisado dentro del `flock` como en `DedicationStore`. Si el dueño rechaza una foto, ese lugar se libera.
- **Paso 1, en el celular:** `imageResizeService` la reduce a **1600 px** de lado mayor, JPEG 0.85 (HEIC → JPEG; la rotación ya viene aplicada). Una foto de 4 MB queda en ~350 KB y sube rápido con datos móviles.
- **Paso 2, en el servidor:** `ImageOptimizer::toWebp` a **1600 px, calidad 80** (~180–260 KB, escalado bicúbico) más una **miniatura de 480 px, q 72** (~30 KB).
  - Re-codificar **borra el EXIF** (GPS y modelo del teléfono).
  - Se rechaza (sin procesarla) una foto de más de 8 MB o de más de 4096 px.
  - AVIF queda descartado: GD lo codifica lento y con mucha memoria en `shared-cpu-1x`.
- Throttle: 6 subidas por minuto por IP y token. Cada petición lleva una sola foto.

**Espacio:** 200 invitaciones × 2 × ~290 KB ≈ **116 MB** en el peor caso, y se libera al cerrar. Tope por evento: `album_max_mb`, 300 por defecto. Al llegar al tope, el servidor responde `507` con un mensaje amable, y el panel avisa al 80 %.

**Almacenamiento:**
- `eventos/<slug>/album/` queda fuera de `/media`; Apache no lo sirve.
- Las **elegidas** se copian a `eventos/<slug>/media/album/`. Apache las sirve directo (nuevo `AliasMatch` para `media/album/`).
- `album.csv`: `id, invitacion, para, archivo, ancho, alto, estado (pendiente|elegida|rechazada), subida, decidida`.

**Panel, pestaña "Álbum":**
- cuadrícula de pendientes y elegidas;
- **Elegir** y **Quitar** (de una en una o varias a la vez);
- **Rechazar** borra el archivo al instante (ahorra espacio);
- **Descargar álbum (.zip)**: las elegidas, armado al vuelo con `ZipArchive` (ya instalado) y enviado en streaming;
- un contador de "Se borra el <fecha>", el espacio usado y el tope.

**Cierre:** `AlbumService::closeIfDue($slug)` corre al inicio de cada petición pública o del panel de ese evento. Hace una comprobación barata de la fecha; solo si ya pasó, borra el álbum bajo candado y anota en `album.csv`. Lo mismo con `php artisan album:cerrar <slug>`. `InvitationService::find` y `EventController` responden `410` con el mensaje de "ya terminó", y la web muestra esa pantalla con los colores del evento.

## 7. Trivia de la festejada (`trivia`, tipo `trivia`)

- El gestor arma hasta **10 preguntas**, cada una con 2 a 4 opciones; `correcta` es el número de la opción. También se configuran `titulo`, `texto` y `cierra` (por defecto, el inicio del evento).
- **La respuesta correcta nunca va en el `config` público**: el builder la quita y el servidor califica.
- Cada invitación responde **una vez** con un nombre. `trivia.csv` guarda: `invitacion, para, nombre, respuestas, aciertos, segundos, fecha`. Los segundos se miden en el servidor, desde que se abre la trivia hasta que se envía.
- Al enviar, el invitado ve sus aciertos ("7 de 10") y no las respuestas correctas.
- **Panel, pestaña "Trivia":** ranking por aciertos y, en empate, por menos tiempo, para premiar en la fiesta. Se puede descargar en CSV.
- `POST /public/invitations/{token}/trivia/start` y `/trivia`, con throttle; `409` si ya respondió y `409` si ya cerró.

## 8. Itinerario en vivo (campo `en_vivo` en `itinerario`)

- El día del evento (en su zona horaria), el itinerario resalta el momento actual: **"Ahora: Vals"** con un pulso suave de `opacity`, más **"Sigue: Cena · 22:00"**. Los momentos pasados se atenúan.
- Contempla fiestas que cruzan la medianoche: una hora menor que la anterior se toma como del día siguiente.
- Lógica pura en `liveItineraryService.ts` (con pruebas: antes, durante, después y cruzando la medianoche). Un composable la refresca cada 30 s y limpia el intervalo en `onBeforeUnmount`. No usa servidor ni disco.

---

## Orden de trabajo (cada paso se puede publicar por separado)

1. **Ubicación** (§1), **Itinerario en vivo** (§8) y **Mesa de regalos** (§2): solo `config`, bajo riesgo.
2. **Galería** (§3), con miniaturas en `MediaLibrary`.
3. **Video** (§4) y **Publicación de redes** (§5), con un servicio de URLs compartido.
4. **Trivia** (§7).
5. **Álbum** (§6): subida, ciclo de 5 días, panel, zip y Apache.

**Por cada tipo nuevo:**
- entrada en `Catalog::SECTIONS`;
- lectura en `InvitationConfigBuilder`;
- componente en `web/src/components/sections/` (`SectionShell`, tokens, `data-text`, duraciones con `--motion-scale`);
- línea en `sectionRegistry`;
- su diseño en cada tema que tenga diseño propio (hoy `nueva-york`): una variante en `components/sections/variants/`, su línea en `sectionVariants.ts`, la opción en su `variante` y `sections[tipo].variant` en el manifiesto (ver `frontend.md` §6). Botones con `inv-btn` y `var(--btn-*, …)`;
- `evento.schema.json` y `web/src/types/`;
- prueba del builder (PHPUnit) y del servicio o componente (Vitest).

Los endpoints nuevos (álbum, trivia) llevan prueba Feature, mensajes en español y throttle. La documentación (`eventos/README.md`, `modelo-datos.md`, `api-contrato.md`, `09-avance.md`, fase y `CLAUDE.md`) se actualiza al cerrar cada paso.

**Archivos clave:**
- `api/app/Services/Design/{Catalog,InvitationConfigBuilder}.php`
- `api/app/Services/Media/{MediaLibrary,ImageOptimizer}.php`
- nuevos: `api/app/Services/Album/AlbumService.php` y `api/app/Services/Invitations/TriviaStore.php`
- `api/app/Services/Panel/PanelService.php`, `api/routes/api.php`, `deploy/apache-site.conf`
- `web/src/components/sections/*`
- `web/src/services/{imageResizeService,calendarService,audioService}.ts`
- nuevos: `socialEmbedService.ts` y `liveItineraryService.ts`
- `web/src/pages/PanelPage.vue` y nuevos componentes en `components/panel/`

## Verificación

- `php artisan test` y `pint`; `npm run test`, `lint` y `build` (todo en Docker).
- **Álbum:**
  - subir desde `/i/<token>` en un celular real (`http://<ip>:5173`) una foto HEIC de 12 MP;
  - comprobar ~1600 px, < 300 KB y sin EXIF (`exiftool`);
  - la tercera foto se rechaza con `422`;
  - pico de memoria (`memory_get_peak_usage` en el log) < 200 MB;
  - con `CarbonImmutable::setTestNow`, probar antes del evento (no deja subir), el día (sí deja), el último día de la ventana (zip disponible), el día siguiente (`410`, álbum borrado, panel intacto) y `album_dias` fuera de 5–20 (se acota).
- **Mesa de regalos:** la CLABE no aparece en `GET /api/public/events/<slug>` y sí en `/api/public/invitations/<token>`. *Hecho (16-oct): `EventGiftsTest`, que también revisa la página precargada `/e/`.*
- **Trivia:** `correcta` no aparece en ningún JSON público; responder dos veces da `409`.
- **Video y publicación:** abrir la invitación no hace ninguna petición a youtube.com ni a instagram.com hasta tocar play (pestaña de red en Chromium sin interfaz).
- Capturas a 400 px y 1280 px de cada sección (Chromium sin interfaz, como en la prueba del panel).
- `checklist-qa.md` antes de publicar en Fly; `fly deploy --ha=false` solo cuando el usuario lo pida.
