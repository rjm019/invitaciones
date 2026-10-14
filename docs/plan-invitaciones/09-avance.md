# Avance y cambios contra el plan

**Actualizado:** 13-oct-2026. **Rama:** `main` (el motor ya está en `origin/main` desde el commit `d2915da`).

Este archivo dice **qué se hizo, qué cambió contra el plan original y qué falta**. Las fases de `04-fases/` tienen sus casillas marcadas con la misma información. Las dudas abiertas están en `08-decisiones-pendientes.md`.

## Resumen

La invitación de NATASHA y su panel ya están **publicados en Fly.io**: https://invitaciones-jiro.fly.dev/e/natasha (panel en `/panel/natasha`). Faltan la vista previa de WhatsApp, la música del evento y responder las preguntas abiertas antes de mandar los enlaces. El RSVP cierra el 6-nov-2026.

El cambio más grande contra el plan: **no hay base de datos**. Todo vive en archivos por evento (`eventos/<slug>/`): el diseño y el contenido en un Excel (`layout.xlsx`), y las invitaciones, respuestas y ajustes en CSV que escribe la API.

## Qué está hecho

### Repo y entorno

- Monorepo en `~/Documents/buscador-invitados` con `api/`, `web/`, `recepcion/` (el buscador) y `docs/plan-invitaciones/`.
- Todo corre en Docker: `docker compose up -d --build`. API en el 8010, web en el 5173 y recepción en el 8090. No hay contenedor de base de datos.
- `.gitignore` deja fuera los datos reales: `eventos/*`, `privado/`, `recepcion/ejemplos/`, `recepcion/prototipo/` y `.env`.
- Laravel subió de 11 a **13** (PHPUnit 12). Breeze, Sanctum, Eloquent y las migraciones se retiraron.
- Web con Vitest, ESLint y Prettier. El build corre en Linux, dentro del contenedor.
- **Prueba en celular real:** la web reenvía `/api` y `/media` a la API (`VITE_API_PROXY`). La invitación se abre desde cualquier aparato de la red en `http://<ip-de-la-mac>:5173` y las imágenes se piden a esa misma dirección.

### API sin base de datos

- **Lectura del evento:** `LayoutReader` abre `layout.xlsx` o sus CSV. `EventConfigBuilder` los convierte en el `config` que usa la web. Si algo del Excel está mal, responde la lista de errores en español (pestaña y fila).
- **Escritura segura:** `CsvFile` escribe CSV que Excel abre bien (UTF-8 con BOM, CRLF).
  - Cada escritura es atómica (tmp + rename) y usa `flock`.
  - Antes de sobrescribir guarda un respaldo del día y agrega el cambio al historial.
  - Neutraliza fórmulas, para que nadie pueda inyectarle una a Excel desde un nombre.
- **Endpoints públicos:**
  - `GET /public/events/{slug}`
  - `GET /public/invitations/{token}`
  - `POST /public/invitations/{token}/rsvp`, con throttle de 10/min
  - `GET /public/events/{slug}/weather` (clima, con caché)
  - `GET /media/{slug}/{archivo}`
- **Panel:** login con la clave del layout, más los endpoints para la lista, la versión, generar enlaces, la fecha límite y las mesas. Ver `03-arquitectura-objetivo/api-contrato.md`.
- **Comandos:**
  - `invitaciones:resumen`: totales y `resumen.csv`.
  - `layout:xlsx`: arma el Excel desde los CSV.
  - `media:optimizar`: pasa los originales a WebP, con las opciones `--recortar` y `--sin-sombra`.
- **Pruebas:** 52 pruebas Feature en verde y Pint sin cambios pendientes.

### Motor de la invitación (web)

- **Servicios** en TS puro, cada uno con su prueba: tema, secciones, assets, fondos, cuenta regresiva, calendario, fechas, audio, efectos, invitación, RSVP y panel.
- **Composables** que limpian todo al desmontarse: `useMusic`, `useInView`, `useParallax`, `useScrollLock`, `usePanel`, `usePolling`, `useClipboard` y otros.
- **Armado de la página:** `InvitationRenderer` + `sectionRegistry` (cada sección se carga solo si se usa). `SectionShell` es el único que pinta fondos, overlays y efectos.
- **Personalización desde el Excel, sin tocar código:** paleta, fuentes, orden y visibilidad de las secciones, fondos y efectos por sección.
  - Efectos disponibles: `aparecer`, `parallax`, `flotar`, `brillo`, `linea` y `escribir`.
  - Todos se apagan con `prefers-reduced-motion`.
- **Diseño:** celular primero. En pantallas de 1024 px o más, las secciones marcadas como `mitad` van en pares, lado a lado (columna `escritorio`).
- **Pruebas:** 118 de Vitest; lint, type-check y build en verde.

### Tema `jardin-azul` (NATASHA)

- **Las 12 secciones del Canva:**
  1. Sobre que se abre
  2. Reproductor
  3. Bendición
  4. Fecha con calendario
  5. Foto en arco
  6. Ubicación, con "Agregar a mi calendario"
  7. Frase
  8. Itinerario con línea que se llena
  9. Vestimenta
  10. Cuenta regresiva
  11. Confirmación
  12. Cierre

  Además, mariposas flotantes y un mini reproductor fijo.
- **Contenido real** del Canva en `eventos/natasha/` (privado): textos, 26 ilustraciones y la foto.
- Verificado en capturas a 390×844 (celular) y 1440×900 (escritorio).
- **Música:** suena al abrir el sobre. La playlist de Spotify es opcional, como reproductor incrustado.

### Clima, playlist y música desde Spotify

- **Sección `clima`:** el clima del día del evento en la ciudad del salón, con datos de Open-Meteo.
  - Mientras faltan más de 16 días, muestra el clima típico de esa fecha (promedio de 10 años). Para NATASHA da 21°/8°, y 17° a las 5 pm que bajan a 11° a las 11 pm.
  - Desde 16 días antes (para NATASHA, el 13-nov), muestra el pronóstico real. El servidor lo renueva cada 30 min y la página cada 15 min mientras está abierta, con "Actualizado hace X min".
  - Trae la temperatura en las horas de la fiesta y un consejo (abrigo, paraguas).
  - Si Open-Meteo falla, muestra lo último que obtuvo. Se quita sola un día después del evento.
- **Sección `playlist`:** el reproductor de Spotify con la lista de canciones, como en la imagen de referencia, en español ("Guardar en Spotify", "Muestra"). Mide 560 px (se ven unas 7 canciones; el resto se recorre dentro), con variantes `lista` (352) y `compacta` (152). Verificado en el navegador: play, pausa y recorrer la lista funcionan. Si la sección se vuelve a montar, el reproductor se muda solo.
- **Música desde Spotify** (`musica_fuente`): con `spotify`, al abrir el sobre suena la playlist, sin MP3. Los controles dorados y el botón flotante la manejan (play/pausa y ±10 s). Probado en el navegador: empezó a sonar sola al abrir el sobre.
  - Con MP3 (`archivo`), la playlist es un reproductor aparte, y al tocarla se pausa la canción de la invitación.
  - Límites de Spotify: sin sesión se oyen muestras de 30 s. Al terminar cada muestra, Spotify pasa sola a la siguiente canción y pone encima de la lista su aviso "Escucha estas y millones de canciones más… Obtener Spotify". Se cierra con su X, pero vuelve con cada canción (comprobado en el navegador). No se puede quitar desde la invitación: es contenido de Spotify. En iPhone puede pedir tocar ▶ (la invitación lo avisa a los 6 s).
  - La sesión que cuenta es la de cada invitado en su navegador; una cuenta nuestra no la puede abrir por ellos. La salida para que la lista se vea siempre limpia es dibujarla nosotros con la API de Spotify (pregunta abierta 3).

### Efectos para que la invitación se vea más viva

- **Por sección, desde el Excel** (columna `efectos`; el tema `jardin-azul` ya los trae por defecto):
  - `destellos`: estrellitas doradas que titilan, sobre todo a las orillas.
  - `cascada`: los elementos entran uno tras otro (horas del itinerario, números del contador, horas del clima).
  - `acercamiento`: la foto del salón se acerca muy despacio.
- **Del tema, sin configurar nada:**
  - Mariposas que cruzan la pantalla de vez en cuando, también en el celular.
  - Pétalos y confeti al abrir el sobre y al confirmar asistencia.
  - El corazón late y un ecualizador dorado se mueve mientras suena la música; el botón flotante echa ondas.
  - El segundero de la cuenta regresiva late.
- **Foto en arco:** cada una de las 7 mariposas doradas aletea y se mece a su ritmo, y sobre cada estrella titila un destello. Las figuras están medidas en el tema (`sprites` del manifiesto) y las anima `SpriteDecor`.
- Todo anima solo transform y opacity, no estorba los toques y se apaga con "reducir movimiento".
- Probado en el navegador con `natasha-prueba`: confeti al abrir (36 piezas que se quitan solas), mariposa en vuelo, destellos en 4 secciones y cascada completa.

### Secciones como paneles, con el mismo espacio entre todas

- Cada sección es un **panel** con su propio fondo, esquinas redondeadas, sombra suave y una línea dorada fina por dentro. La portada (el sobre) va directo sobre el papel.
- **Mismo espacio entre todas:** 16 px en el celular y 24 px en escritorio (`--section-gap`). Se midió en el navegador sección por sección, incluido el sobre abierto → "Dale play".
- **Al abrir el sobre**, la portada deja de ocupar toda la pantalla: la tarjeta se queda donde está y "Dale play" sube a la misma distancia que las demás.
- **Fondos:** las secciones sin fondo propio se turnan los del tema (papel blanco, cielo y crema; `panels` del manifiesto), así nunca quedan dos iguales seguidas, aunque el Excel oculte o reordene secciones. El fondo del Excel (`fondo`, `color_fondo`) sigue mandando.
- En escritorio, las secciones en pares quedan con la misma altura y el mismo espacio entre columnas.

### Dedicatorias y "sin niños"

- **Sección `dedicatoria`** (al final, antes de "¡Te esperamos!"): nombre y mensaje, **una por enlace**.
  - Ya enviada, se ve fija con un agradecimiento (también al volver a abrir el enlace) y salen pétalos.
  - La API rechaza la segunda (409) dentro del candado, así dos envíos al mismo tiempo no dejan dos. No depende de la fecha límite.
  - Se guardan en `dedicatorias.csv` (una fila por invitación, protegido contra fórmulas de Excel).
  - En la invitación general (`/e/`) el formulario se ve igual, pero al enviar pide abrir el enlace personal.
  - **Panel:** pestaña "Dedicatorias" con buscador, la más reciente primero.
- **Sección `sin_ninos`:** título, etiqueta ("Solo adultos") y mensaje, todo desde el Excel.
- **Efecto `cambio_de_color`** (o `colores`): el fondo de la sección pasa despacio por cielo y champaña. Lo trae el Dress Code.
  - En el Dress Code, además, la tarjeta va y viene a una versión **negra con solo los textos en blanco** (sin sello ni figuras), al mismo ritmo de 12 s. Va en pasos para que los textos nunca se encimen: se van los del papel, el papel se pone negro y aparecen los blancos; de regreso, igual. Verificado cuadro por cuadro.

### Ajustes del 13-oct (noche)

- Textos del sobre más grandes: "mis xv años" y el salón (≈ 31 y 24 px a 390 px de ancho).
- "Agregar a mi calendario" pasó de Ubicación a "Save the date", como botón.
- **Todos los efectos 10 % más lentos**, con una sola perilla: `--motion-scale: 1.1` en `themes/tokens.css` multiplica cada duración y retraso (CSS, estilos en línea con `motionTime()` y temporizadores con `motionScale()`). Medido en el navegador: aparecer 0.88 s, cambio de color 13.2 s, tarjeta del sobre 1.65 s, confeti, mariposas y destellos ×1.1.
- El título "Ubicación" se escribe letra por letra, como la frase (efecto `escribir`; ahora es un componente compartido, `TypewriterText`).
- **Spotify ya no arrastra la página:** al pasar a otra canción, el reproductor de Spotify movía su lista y el navegador llevaba toda la página hasta él (medido: de arriba a la sección de Spotify en 1 s). Ahora, cuando Spotify avisa que cambió la canción, la vista se queda donde está el invitado (`useSteadyScroll`). Si el invitado toca o mueve la página, manda él. Verificado: la página se movió 2 px y regresó.
- **Recargas solas:** venían del servidor de desarrollo, que refresca la página al guardar un archivo o al reconectarse (por ejemplo, cuando el celular se bloquea). La invitación publicada no lo hace. Para revisar en el celular sin eso: la **vista previa** (`docker compose --profile vista-previa up -d preview`, puerto 4173), que es la versión de producción.

### Publicado en Fly.io (13-oct)

- **Dónde:** https://invitaciones-jiro.fly.dev, cuenta `rchard14k@gmail.com`, región Dallas. Detalle y comandos en `06-despliegue/despliegue.md`.
- **Por qué Fly:** ~2–3 USD/mes con disco persistente. Los planes gratis de Koyeb y Render no tienen disco (se perderían las respuestas en cada reinicio) y Cloud Run no tiene candados de archivo.
- **Cómo:**
  - Un solo contenedor: Apache + Laravel + la invitación compilada (`Dockerfile` de la raíz). Laravel responde `app.html` en toda ruta que no sea `/api` ni `/media`, así todo vive en un solo dominio, sin CORS.
  - Los eventos van en el volumen `eventos` (`/data/eventos`, 1 GB, cifrado), igual que la caché del clima (`/data/cache`).
  - `deploy/subir-evento.sh <slug>` sube layout y media sin pisar lo que escribe la app.
- **Ajustes para producción:**
  - Caché, sesión y cola usan archivos por defecto (Laravel traía `database`, y sin `.env` fallaba el límite de envíos).
  - `trustProxies` para que las fotos salgan con `https`.
  - La imagen no lleva datos reales ni lo de la boda original (`.dockerignore`).
- **Revisión del 13-oct (noche), ya publicado:**
  - El evento real `natasha` responde, ya con las secciones nuevas.
  - El panel pide su clave y ya hay un enlace generado.
  - Las fotos llegan por `https` y el servidor despierta en ~5 s después de estar apagado.
- **Clima en producción:** Open-Meteo respondía 429 ("demasiadas a la vez") porque la API pedía los 10 años en paralelo desde la IP compartida de Fly. Ahora los pide de uno en uno, con reintentos (800/1600/3200 ms), y la caché vive en el disco para sobrevivir a que la máquina se apague. **Corregido en el código; falta `fly deploy`.**
- **Música:** el evento real tiene `musica_fuente` = archivo, pero no hay MP3 ni enlace de Spotify, así que el sobre abre sin música (pregunta 3).

### La invitación aparece completa y carga en menos pasos (13-oct, noche)

**Problema en producción:** la invitación se armaba frente al invitado. Primero aparecían papel, texto con letra genérica y la tarjeta sin textura, y segundos después llegaban el sobre y las fuentes.

**Causas, medidas** con un celular simulado (4G de 10 Mbps y CPU 4× más lenta):

- **90 peticiones en cadena:** código → datos del evento (a los 3.1 s) → una petición por sección y por ícono → imágenes y fuentes (desde 3.6–4.1 s).
- **Apache con 8 procesos y keep-alive:** las conexiones abiertas del proxy de Fly ocupaban procesos, y archivos de 1 KB tardaban 1–5 s en llegar.

**Arreglos:**

- **Pantalla de espera** (`PageLoader`) hasta que cargan el papel, las imágenes de la portada y las fuentes del tema (`useAssetsReady`, máximo 5 s). Luego la invitación aparece completa con un fundido. El resto de las secciones, con Spotify, se monta en el cuadro siguiente.
- **Datos dentro de la página:** Laravel (`SpaController`) mete el evento, o el evento y la invitación, en `window.__BOOT__` dentro de `app.html`, con JSON escapado contra `</script>`. La web los toma una vez (`bootService`) y el tema empieza a cargar desde `main.ts`. En `/i/` la apertura se cuenta igual, una vez.
- **Un solo archivo:** las secciones, los íconos y las páginas de evento e invitación van en el archivo principal. El panel sigue aparte.
- **Apache:** `KeepAlive Off` y 12 procesos.
- **Fly:** `auto_stop_machines = "suspend"` (despierta en unos cientos de ms en vez de ~5 s), 512 MB y sin swap, que suspend no admite.

**Resultado** con la imagen de producción en local, mismo celular simulado:

- 39 peticiones.
- Las imágenes del sobre empiezan a los 0.57 s y las fuentes a los 0.84 s.
- La portada queda completa en ~1.3 s y Spotify carga después, a los 1.7 s.
- En ningún cuadro se ve la invitación a medias.

Verificado:

- Al abrir el sobre suena la canción.
- `/e/` y `/i/` no llaman a la API.
- `/i/` cuenta una apertura.
- El panel carga.

**Falta `fly deploy`**, porque el permiso para publicar desde aquí fue denegado.

### Canción del evento (13-oct)

- En el Excel real (`eventos/natasha/layout.xlsx`): `spotify` = la canción (`open.spotify.com/track/5y2ijHECwFYWqcAHKTZgzD`, sin los parámetros de rastreo) y `musica_fuente` = `spotify`.
- Solo cambió la pestaña `evento` (comparado con el respaldo `respaldos/layout-20261014-002333.xlsx`).
- **Falta subirlo:** `deploy/subir-evento.sh natasha`.
- Ojo: quien no tiene sesión de Spotify en ese navegador oye **30 s** de la canción. Siendo una sola canción, después se detiene. Para la canción completa en todos lados haría falta el MP3 (pregunta 3).

### Invitación personal y confirmación

- Cada enlace (`/i/<token>`) muestra la misma invitación. Lo que cambia es el formulario: **un campo de nombre por invitado**, con "Asistiré / Lo siento, no asistiré".
- **Llenado por partes:**
  - Los nombres enviados quedan fijos y los campos vacíos siguen libres.
  - Reenviar un nombre no lo duplica.
  - El cupo se revisa dentro del candado, así que dos envíos al mismo tiempo no pueden pasarse de lugares.
- **Fecha límite:** al pasar, solo cuentan los nombres enviados; los campos vacíos se deshabilitan y la API rechaza envíos.
- Cada apertura queda registrada en `aperturas.csv`.
- Los enlaces viejos (`/invitacion/Familia/4`) muestran "Este enlace cambió".

### Panel del dueño (`/panel/<slug>`)

- **Acceso:** solo con `clave_panel`, que va en la pestaña `evento` del Excel (mínimo 8 caracteres).
  - La sesión dura 12 h y se cierra si cambias la clave.
  - La clave nunca sale en la invitación pública (hay prueba de eso).
- **Generar enlace:** se escribe para cuántos invitados es (1 a 30) y, opcionalmente, el nombre que va en el sobre. Se puede copiar o mandar por WhatsApp.
- **Pestaña Invitaciones:** todos los enlaces, para cuántos es cada uno, quiénes confirmaron, cuántas veces se abrió y "Mesa para todos".
- **Pestaña Invitados:** todas las personas, con filtros (asistirán, no asistirán, sin mesa, lugares libres), búsqueda y **mesa por persona** (1 a 999). La mesa se guarda en `respuestas.csv`, lista para el buscador.
- **En vivo:** revisa cada 5 s si algo cambió y se actualiza sin recargar. Se pausa mientras la pestaña está oculta.
- **Fecha límite:** se puede cambiar hasta 3 veces (`ajustes.csv`). El Excel no se toca.

## Cambios contra el plan original

| Plan original (12-oct) | Lo que se hizo | Por qué |
|---|---|---|
| Laravel 11 + MySQL, Eloquent y migraciones | Laravel 13 **sin base de datos**: Excel y CSV por evento | Decisión tuya (13-oct): igual que el buscador, todo se abre en Excel |
| `config` del evento en una columna JSON, cargado con seeder o `evento:importar` | `eventos/<slug>/layout.xlsx`, con una pestaña por tema | Mismo motivo |
| Carpetas `api-invitation/` y `boda-invitacion/` (D2) | `api/`, `web/` y `recepcion/` en un solo monorepo con el buscador | Decisión tuya |
| PHP, MySQL y Node instalados en la máquina | Todo en Docker | Decisión tuya |
| Panel con login (Breeze + Sanctum), multiusuario | Panel por evento con la clave del Excel, un solo dueño | Decisión tuya: acceso único al panel |
| Familias con pases, importadas de un CSV (`familia, pases, teléfono`) | Enlaces generados en el panel por número de invitados, con nombre opcional en el sobre | Decisión tuya |
| RSVP por familia (confirmar o declinar todo; se podía modificar) con canción y mensaje | Un campo por persona; los nombres quedan fijos; se llena por partes; sin canción ni mensaje (pregunta abierta) | Decisión tuya (imagen "ESTÁS INVITADO") |
| Fecha límite fija | Cambiable hasta 3 veces desde el panel | Decisión tuya |
| Panel con tablas que se recargan | En vivo, con lista de invitados y mesas | Decisión tuya |
| Diseño solo para celular (460 px) | Celular primero, más una versión horizontal para escritorio | Decisión tuya |
| Assets del tema en `web/src/themes/jardin-azul/assets/` | Ilustraciones y fotos del evento en `eventos/natasha/media/` (privado); el tema trae solo tokens y respaldos en CSS | No versionar material del cliente en un repo público |
| Evento demo `xv-demo` con seeder | Datos ficticios en `api/tests/Fixtures/eventos/` y una copia privada `eventos/natasha-prueba` para probar a mano | Sin base de datos no hay seeders |
| Tema `boda-salvia` en la fase 3 | Pospuesto; `web/src/legacy/BodaLegacy.vue` queda de referencia (solo en desarrollo, en `/legacy/boda`) | Prioridad: NATASHA |
| Rutas `/admin/...` | `/panel/<slug>` | Un panel por evento |
| VPS + Netlify, o Railway/Render (D3) | Fly.io: un contenedor con API e invitación, y un disco para los CSV | Decisión tuya (13-oct): lo más barato con disco persistente |
| Música: MP3 y una playlist de Spotify aparte (fase 6) | Dos fuentes a elegir; con Spotify, la playlist suena al abrir el sobre y los controles dorados la manejan | Decisión tuya (13-oct) |
| Sin clima | Sección `clima`: clima típico y luego pronóstico real, que se actualiza solo | Decisión tuya (13-oct) |
| Efectos de la fase 6 (revisar los existentes) | Efectos nuevos: destellos, cascada, acercamiento, cambio de color, mariposas en vuelo, confeti, música viva | Decisión tuya: que la invitación se vea más viva (13-oct) |
| Secciones una tras otra sobre el papel | Paneles con su propio fondo y el mismo espacio entre todos | Decisión tuya (13-oct) |
| Mensaje para la festejada dentro del RSVP | Sección aparte de dedicatorias, una por enlace, que el dueño lee en el panel | Decisión tuya (13-oct, imagen de referencia) |
| Sin aviso de "sin niños" | Sección `sin_ninos` | Decisión tuya (13-oct) |

## Qué falta

### Antes de mandar los enlaces (RSVP cierra el 6-nov-2026)

1. Responder las preguntas abiertas de `08-decisiones-pendientes.md`. Hay pendientes la hora del evento, la música, el texto de WhatsApp, el número de WhatsApp y el cierre.
2. Agregar `clave_panel` al Excel real de NATASHA (la eliges tú).
3. **Repo privado** (D1) antes de cualquier push. Hacer los commits cuando lo pidas.
4. **Publicación** (fase 7): ya está en Fly.io. Faltan:
   - `fly deploy --ha=false` (clima, carga optimizada y suspend) y `deploy/subir-evento.sh natasha` (la canción).
   - Vista previa de WhatsApp (Open Graph). Laravel ya sirve `app.html`, así que se puede inyectar ahí.
   - CI con las pruebas.
   - Decidir si dejar una máquina siempre encendida (quita los ~5 s de la primera visita).
   - Dominio propio, si se quiere.
5. QA en celulares reales con `05-calidad/checklist-qa.md`: audio en iPhone y Lighthouse.

### Después del evento real o cuando se decida

- Pases PDF con QR y check-in en la puerta (D9).
- Que el buscador de recepción lea `respuestas.csv` (nombres y mesa) y que su backend pase a Laravel.
- Borrar un enlace o cambiar sus invitados (pregunta abierta).
- Tema `boda-salvia`.
- Media Session (título de la canción en la pantalla de bloqueo, solo con MP3) y medición de FPS en un Android de gama media.
- Probar Spotify en un iPhone y un Android reales: si el play al abrir el sobre pasa o pide tocar ▶, y que la vista ya no salte al cambiar de canción.
- Actualizar `evento.schema.json` y `frontend.md §4`, que describen la forma original del config. Hoy la forma real está en `web/src/types/event.ts` y la arma `EventConfigBuilder`.
