# Avance y cambios contra el plan

**Actualizado:** 15-oct-2026. **Ramas:** `main` (el motor, en `origin/main` desde `d2915da`) y `feature/gestor-plantillas` (el gestor y el formato nuevo, sin push ni merge: espera tu revisión).

Este archivo dice **qué se hizo, qué cambió contra el plan original y qué falta**. Las fases de `04-fases/` tienen sus casillas marcadas con la misma información. Las dudas abiertas están en `08-decisiones-pendientes.md`.

## Resumen

La invitación de Nat y su panel ya están **publicados en Fly.io**. Tras renombrar la carpeta en producción (ver "Qué falta"), las direcciones son https://invitaciones-jiro.fly.dev/e/nat y `/panel/nat`. Faltan publicar lo último y responder las preguntas abiertas antes de mandar los enlaces. El RSVP cierra el 6-nov-2026.

El cambio más grande contra el plan: **no hay base de datos**. Todo vive en archivos por evento (`eventos/<slug>/`): el diseño y el contenido en `invitacion.csv` (antes, un Excel `layout.xlsx`), y las invitaciones, respuestas y ajustes en CSV que escribe la API.

**Nuevo (14-oct, rama `feature/gestor-plantillas`):** el **gestor** (`/gestor`), un editor visual para armar invitaciones y plantillas con la invitación a la vista, con una cuenta por persona, y el formato `invitacion.csv`, que reemplaza a `layout.xlsx`. NAT local ya está migrado; producción sigue igual hasta que corras el runbook. Detalle en `04-fases/fase-8-gestor-de-plantillas.md`. El 15-oct, el gestor pasó a darle al servidor dos tercios menos de trabajo (−66 %) con la mitad de las peticiones, y los textos se ven al instante en la vista previa.

**Nuevo (15-oct, rama `feature/landing-y-secciones`):** plan de las fases 9 (secciones nuevas) y 10 (landing con cotización y 3 demos). Hecho el paso 1 de la fase 10: la landing en `/` (inicio, boda, XV años, graduación y aviso de privacidad; SEO/AEO con JSON-LD, `sitemap.xml` y `llms.txt`) y las cotizaciones (formulario → `eventos/_gestor/cotizaciones.csv`, aviso por correo y la ventana "Cotizaciones" del gestor). Sin publicar: anuncia secciones y demos que todavía no existen.

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
- **Panel:** login con la clave del layout, más los endpoints para la lista, la versión, generar y eliminar enlaces, la fecha límite y las mesas. Eliminar (15-oct) borra también sus invitados y su dedicatoria; quedan en `respuestas-eliminadas.csv` y `dedicatorias-eliminadas.csv`. Ver `03-arquitectura-objetivo/api-contrato.md`.
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

### Tema `jardin-azul` (NAT)

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
- **Contenido real** del Canva en `eventos/nat/` (privado): textos, 26 ilustraciones y la foto.
- Verificado en capturas a 390×844 (celular) y 1440×900 (escritorio).
- **Música:** suena al abrir el sobre. La playlist de Spotify es opcional, como reproductor incrustado.

### Clima, playlist y música desde Spotify

- **Sección `clima`:** el clima del día del evento en la ciudad del salón, con datos de Open-Meteo.
  - Mientras faltan más de 16 días, muestra el clima típico de esa fecha (promedio de 10 años). Para NAT da 21°/8°, y 17° a las 5 pm que bajan a 11° a las 11 pm.
  - Desde 16 días antes (para NAT, el 13-nov), muestra el pronóstico real. El servidor lo renueva cada 30 min y la página cada 15 min mientras está abierta, con "Actualizado hace X min".
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
- Probado en el navegador con `nat-prueba`: confeti al abrir (36 piezas que se quitan solas), mariposa en vuelo, destellos en 4 secciones y cascada completa.

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
  - El evento real `nat` responde, ya con las secciones nuevas.
  - El panel pide su clave y ya hay un enlace generado.
  - Las fotos llegan por `https` y el servidor despierta en ~5 s después de estar apagado.
- **Clima en producción:** Open-Meteo respondía 429 ("demasiadas a la vez") porque la API pedía los 10 años en paralelo desde la IP compartida de Fly. Ahora los pide de uno en uno, con reintentos (800/1600/3200 ms), y la caché vive en el disco para sobrevivir a que la máquina se apague. **Corregido en el código; falta `fly deploy`.**
- **Música:** el evento real tenía `musica_fuente` = archivo, pero no había MP3 ni enlace de Spotify, así que el sobre abría sin música. Después se puso la canción de Spotify (ver "Canción del evento").

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

- En el Excel real (`eventos/nat/layout.xlsx`): `spotify` = la canción (`open.spotify.com/track/5y2ijHECwFYWqcAHKTZgzD`, sin los parámetros de rastreo) y `musica_fuente` = `spotify`.
- Solo cambió la pestaña `evento` (comparado con el respaldo `respaldos/layout-20261014-002333.xlsx`).
- **Falta subirlo:** `deploy/subir-evento.sh nat`.
- Ojo: quien no tiene sesión de Spotify en ese navegador oye **30 s** de la canción. Siendo una sola canción, después se detiene. Para la canción completa en todos lados haría falta el MP3 (pregunta 3).
- **¿Se puede completa desde Spotify?** Para todos, no. Spotify da la canción completa solo a quien tiene sesión en ese navegador, y el navegador de WhatsApp casi nunca la tiene. El reproductor ya trae el permiso que pide Spotify (`encrypted-media`). El Web Playback SDK pide una cuenta Premium por invitado. La salida es el MP3, que ya funciona sin cambios de código (pregunta 3).

### Ajustes de diseño y canción en MP3 (13-oct, noche)

Pedidos sobre capturas del celular:

- **Itinerario perla:** el panel del itinerario ya no es crema. Ahora es blanco con reflejos muy suaves de champaña, rosa y cielo (`--color-panel-pearl`, un degradado).
  - El tema lo pide con `panelColor` en el manifiesto. La sección gasta su turno en la rotación de `panels`, así ninguna otra cambia de fondo (verificado sección por sección).
  - `SectionShell` pinta el panel con `background` (antes `background-color`) para aceptar degradados.
- **"¡Te esperamos!" con rosas azules** (`rosas-azules.webp`, las de la portada y la confirmación):
  - Van dos ramos, uno arriba a la derecha y otro abajo a la izquierda. La esquina de abajo a la derecha queda libre para el botón flotante de la música.
  - En escritorio llegan a las esquinas del panel.
- **Estrellitas al abrir el sobre:** en lugar de pétalos y confeti, 44 estrellas doradas de cuatro puntas salen del sobre, suben y caen destellando. Solo se animan transform, opacity y scale (`starBurst` y `celebrate('stars')`). Al confirmar y al dejar una dedicatoria sigue el confeti.
- **"NAT" en la foto:** el `titulo` de la fila `foto` del Excel va en la esquina de arriba a la izquierda, en la letra de "NOVIEMBRE". En el Excel real, `titulo` = `NAT`.
- **"Save the date" sin brillos:** el tema ya no pone `brillo-oro.webp` detrás de la frase.
- **Canción completa en MP3:**
  - Es "Risk It All" de Bruno Mars, la misma de Spotify, en `eventos/nat/media/cancion.mp3` (privado, fuera de git).
  - El archivo descargado traía 5.4 s casi en silencio al inicio y 5 s al final. Se recortaron sin volver a comprimir y se le quitaron la portada y los datos del video: queda en 3:20 y 3.2 MB a 128 kbps.
  - Se descarga hasta que se abre el sobre, así que no frena la portada. El servidor lo manda por partes (206), como pide el iPhone.
  - En el Excel: `musica_fuente` = `archivo` y `musica_audio` = `cancion.mp3`. El enlace de Spotify sigue en la sección `playlist`. Respaldo: `respaldos/layout-20261014-010634.xlsx`.
  - Verificado: al abrir el sobre suena y el reproductor marca 3:20.
- **Lint:** ESLint ya no revisa `web/.vite/` (el caché de Vite; daba 73 errores que no eran nuestros).

**Falta publicarlo:** `fly deploy --ha=false` (código) y `deploy/subir-evento.sh nat` (Excel y MP3).

### Hospedaje, "Nat" en todo, panel con los colores de la invitación y envío en PDF (13-oct, noche)

- **Sección `hospedaje`** (`hotels`; alias `hoteles`), con la pestaña `hoteles` del Excel (`nombre`, `nota`, `direccion`, `maps`, `telefono`, `foto`).
  - Cada hotel va en una tarjeta de papel (`tarjeta.webp`) con el divisor dorado, su nota, su dirección, "Ver en Maps" y "Llamar". La foto es opcional.
  - En escritorio, las tarjetas van lado a lado.
  - Efectos: aparecer, cascada (las tarjetas entran una tras otra), brillo en los botones, flotar (ícono), destellos y acercamiento (si hay fotos).
  - Sin hoteles, la sección no aparece.
  - La API rechaza un `maps` que no sea `https://…` (va en un botón).
  - Referencias: plantillas de boda de Framer (Miren, Wedded: foto, nombre, texto corto y botón a Maps) y la sección "Recomendación de hospedaje" de la boda original.
- **Hoteles de Nat** (sección 9.55, después del clima):
  - **Luxury Hotel Boutique**: "A unos pasos del salón" (230 m).
  - **Camino Real Pachuca**: "A unos 10 min en auto".
  - **Gamma Pachuca**: "A unos 8 min en auto".
  - Dirección y teléfono salieron de sus fichas de Google Maps. Los tiempos en auto salieron de OSRM (5 y 7 min sin tráfico, redondeados hacia arriba).
- **"Nat" en todo:** el nombre largo anterior desapareció del repo, del Excel y de las direcciones.
  - Las carpetas cambiaron: `eventos/nat`, `eventos/nat-prueba` y `docs/plan-invitaciones/02-diseno-nat`.
  - `festejada` = `Nat`.
  - Los enlaces `/i/<token>` siguen sirviendo: el token busca su evento en todas las carpetas.
  - Siguen con el nombre viejo: el historial de git y los respaldos viejos del Excel. La clave del panel ya la cambiaste tú (pregunta 26).
- **Panel con los colores de la invitación:**
  - La entrada y el panel cargan el tema, la paleta y las fuentes del evento (`usePanelTheme`). El azul es lo principal (`--color-accent-strong`, en el Excel `acento_fuerte`); el oro es el adorno.
  - El título va grande en letra de pluma: "XV de Nat" (`titulo_panel` del Excel o "XV de {festejada_corto}").
  - La entrada recibe sus colores en la misma página (`window.__BOOT__`) o por `GET /admin/events/{slug}/brand`, sin fotos ni datos del evento.
  - El resumen dice "Invitados" (antes "Lugares") y "Pendientes" (antes "Sin llenar").
- **Invitaciones generadas, limpia:**
  - La lista se despliega al tocarla (cerrada al entrar) y no muestra URLs.
  - Cada invitación tiene "Enviar" y, discretos, "copiar link" y "ver link".
  - Al generar una, la lista se abre y la nueva queda marcada.
- **Enviar = PDF con la invitación:**
  - Se arma en el navegador con el tema: papel, tarjeta, rosas, corona, "mis xv años", "Nat", para quién es, cuántos invitados, fecha, salón y un QR.
  - El enlace **no se ve**. Va oculto en el PDF, que se abre al tocar cualquier parte, y en el QR, con la leyenda "Toca o escanea para abrir tu invitación".
  - El PDF se escribe a mano (`cardPdfService`, una página de 540×675 pt con un enlace que la cubre). Se validó con `qpdf --check` (sin errores) y `pdfinfo` (una página, el enlace y el título con acentos). Pesa ~245 KB.
  - En el celular, "Enviar por WhatsApp" abre el menú de compartir con el PDF y el mensaje sin el enlace. En la computadora descarga el PDF y abre WhatsApp con el mensaje para adjuntarlo. También se descarga la imagen sola (JPG).
  - QR con `qrcode` 1.5.4 (MIT), solo en el archivo del panel; la invitación no pesa más.
- Pruebas: API 77 y web 171 en verde; lint y build limpios. Verificado en el navegador: entrada, panel, lista, "ver link" y la ventana de envío en celular y escritorio.

### La imagen para WhatsApp como tu diseño, "Ubicación" letra por letra, fotos de hoteles y dependencias (13-oct, noche)

- **Imagen y PDF para WhatsApp con el diseño de NAT.pdf** (tu referencia de Canva):
  - Fondo: el mármol azul con estrellas y el sobre con el lacre "N", sacado del PDF sin los textos (`tarjeta-fondo.webp`, en `media/`, privado).
  - Arriba, "MIS XV AÑOS" y "NAT" en dorado entre dos estrellas con línea.
  - En el sobre, como si estuviera rotulado: "PARA", el nombre de la invitación en letra de pluma y, debajo del lacre, "3 invitados". Un nombre largo se parte en dos renglones parejos. Sin nombre dice "Tu invitación".
  - Abajo: "Celebremos juntos", "ESTA ETAPA TAN ESPECIAL", la fecha y el QR con "Toca o escanea para abrir tu invitación".
  - Ahora es de 2:3 (1080×1620; el PDF, de 540×810 pt). Pesa ~360 KB.
  - Del Excel (pestaña `evento`): `tarjeta_fondo`, `tarjeta_frase` y `tarjeta_texto`. Sin `tarjeta_fondo`, usa el papel del tema con un recuadro claro y el lacre.
  - Los números de pases van en cursiva: en las mayúsculas del tema (Marcellus) el "1" parece una "I".
- **El QR es el de la recepción:** el lector de la puerta leerá ese mismo QR (D9). Comprobado con `zbarimg`: el QR de la imagen y el del PDF (aun a 72 ppp) dan exactamente el enlace `/i/{token}` de la invitación.
- **"Ubicación" se escribe letra por letra:** la fila del Excel decía `aparecer brillo` y eso reemplazaba los efectos del tema. Se agregó `escribir` y se alargó a 1 s. Medido: 0 de 9 letras antes de llegar, 5 a los 350 ms y todas al segundo; el lector de pantalla lee "Ubicación" completo.
- **Hospedaje solo como mención:** título "Recomendación de hospedaje", sin subtítulo ni el texto de introducción. Fotos de los tres hoteles: Camino Real y Gamma (fachadas de sus sitios oficiales) y Luxury (la que mandaste), en WebP de 920 px.
- **Dependencias:** `npm audit fix` y `npm update` sin cambiar de versión mayor; de 24 avisos a 9, y 0 en lo que se publica. Los 9 son de pruebas y lint y piden versión mayor (pregunta 34). `composer audit`: sin avisos.
- Excel: antes de escribir se respaldó en `respaldos/`, y se comparó celda por celda con el original. Solo cambió lo de arriba; la clave del panel quedó como la dejaste.
- Pruebas: API 78 y web 175 en verde; lint, type-check y build limpios.

### Panel más discreto, imagen para WhatsApp más limpia y sobre sin texto asomado (13-oct, noche)

- **Resumen del panel:** ya no son 5 tarjetas grandes (en el celular ocupaban casi toda la primera pantalla). Ahora es una franja delgada: número arriba y etiqueta chica abajo, separados por líneas finas. En el celular cabe en un renglón (~50 px de alto).
- **Imagen y PDF para WhatsApp, más sutiles:**
  - "MIS XV AÑOS" y "NAT" en letra fina: Cormorant Garamond (rol de fuente nuevo `engraved`; se probaron Marcellus, Cinzel, Italiana y Forum sobre el fondo real). Dorado más suave y estrellas con líneas más finas.
  - Abajo, menos ruido: solo la estrella, la fecha en dorado y el QR. Se quitaron "Celebremos juntos" y "esta etapa tan especial" (en el Excel, `tarjeta_frase` y `tarjeta_texto` quedaron vacías; si se llenan, vuelven a salir).
  - **QR integrado:** puntos redondos y esquinas redondeadas en el azul de la invitación (`acento_fuerte`), sobre un halo blanco que se desvanece en el mármol, sin recuadro blanco. Lo dibuja `drawQr` con los módulos de la librería `qrcode`, con corrección "Q" (aguanta 25 % de daño).
  - Comprobado con `zbarimg`: el QR da exactamente el enlace de la invitación en la imagen y en el PDF, incluso con el PDF a 36 ppp (más chico que una miniatura en el celular).
- **Sobre de la portada:** bajo la orilla del sobre cerrado se asomaba una línea con la parte de arriba de las letras del salón (la tarjeta guardada). La orilla del papel es semitransparente y el recorte quedaba justo en el borde. Ahora la tarjeta tiene su propio recorte, un poco arriba de la orilla (`.hero__slot`, detrás de la bolsa, así que no se ve), y el sobre ya no se recorta: conserva su orilla suave. Al abrir, la tarjeta sale completa.
- **Fly:** se queda como está, la máquina se suspende y despierta sola (pregunta 23).
- Pruebas web: 177 en verde; lint y build limpios.

### Gestor de plantillas y formato `invitacion.csv` (14-oct, rama `feature/gestor-plantillas`)

- **Formato nuevo:** toda la invitación en `invitacion.csv` (`seccion, elemento, campo, valor`): bloques `evento`, `colores`, `fuentes`, `textos` y `pagina`, y una sección por bloque en su orden. Lo explica `eventos/README.md`.
  - `clave_panel`, `publicado` y `plantilla` pasan a `ajustes.csv`: aplican al instante y nunca viajan con el diseño.
  - El borrador vive en `borrador/invitacion.csv`; cada publicación respalda la anterior (últimas 50) y queda en `respaldos/publicaciones.csv`.
  - Un evento sin `invitacion.csv` se sigue leyendo del Excel, sin cambios (camino congelado).
- **Migración verificada:** `invitacion:migrar` arma la invitación de las dos formas y solo escribe si salen idénticas. **NAT local migrado** (capturas a 390 y 1440 px iguales; los CSV del sistema con el mismo hash).
- **Letra, color y tamaño por texto:** cada bloque (título, subtítulo, texto, botón y los propios: horas, nombres, números…) con `<bloque>_fuente`, `_color` y `_tamano`; `textos` los pone para toda la invitación.
- **Por sección:** colores propios (`color_<token>`) y cambiar o quitar cada adorno del tema (`imagen_<adorno>`).
- **Gestor** (`/gestor`):
  - Inicio con invitaciones y plantillas; nueva invitación en blanco, desde plantilla o copia (sin enlaces, respuestas ni clave).
  - Editor: secciones (arrastrar, ocultar, agregar), la invitación de verdad en celular o computadora (tocar un texto abre su estilo), inspector armado desde el catálogo, Estilo (paletas, selector de color, letras), Datos generales (con la tarjeta para WhatsApp en vivo).
  - Colores y tamaños cambian **al instante**; lo demás en ~0.5 s. Autoguardado, deshacer, publicar con lista de cambios, historial, conflicto entre ventanas.
  - Biblioteca de imágenes y audio (WebP con transparencia, recorte de Canva, "en uso"); descargar e importar csv, Excel o zip.
- **Una cuenta por persona** (pregunta 39): cada quien entra con su usuario y su clave (`eventos/_gestor/usuarios.csv`, solo el hash).
  - La primera cuenta se crea en `/gestor` con la clave maestra `GESTOR_CLAVE`; después la maestra ya no entra (solo enciende el gestor).
  - Quien *administra* agrega personas (con una clave temporal que se ve una vez, y el mensaje listo para mandarlo), cambia su rol y les da o quita el acceso. Quien llega con clave temporal elige la suya al entrar. Cada quien cambia su clave desde su menú.
  - El historial dice quién publicó cada versión ("Beto la publicó el 14 oct…") y la tarjeta del inicio, quién publicó la última vez. `publicaciones.csv` y `ajustes-historial.csv` guardan `usuario` y `nombre` (el dueño aparece como `panel`; los comandos, como `terminal`).
  - Si alguien se queda fuera: `php artisan gestor:usuario <usuario> --clave-nueva` da una clave temporal desde la terminal.
  - **Cada quien las suyas** (pregunta 40, D17): quien *edita* ve solo las invitaciones que creó o le asignan (`ajustes.csv` → `personas_gestor`); quien *administra* ve todas y las asigna en "Datos generales" → "Quién la edita". Las plantillas son de todos.
- **El sobre en la vista previa** (pregunta 38): con "reducir movimiento" encendido, "Ver como invitado" igual muestra el sobre cerrado y abre sin animación (solo en el gestor; a los invitados no les cambia).
- **Favicon propio:** el sobre del gestor (índigo, con un corazón de lacre) en lugar del logo de Vue, en la invitación, el panel y el gestor (`favicon.svg`, `favicon.ico` de 16/32/48 y el ícono de iPhone).
- **Desde la terminal:** `invitacion:validar`, `invitacion:exportar`, `invitacion:importar`, `invitacion:migrar` y `gestor:usuario`.
- **Producción:** `deploy/subir-evento.sh` ya no sube `invitacion.csv` sin `--forzar` (allá la edita el gestor); `deploy/bajar-evento.sh` trae un evento del servidor.
- **Pruebas:** API 171 (1148 aserciones); web 266, más lint, type-check y build en verde. (Con la etapa del 15-oct: API 178 y web 280.)

### El gestor le pide menos al servidor (15-oct, rama `feature/gestor-plantillas`)

Pedido: "que sea un 40 % más eficiente, más que nada por la demanda en el servidor". Nada de lo que hace el gestor cambió; lo único que se nota es que los textos ahora se ven al instante en la vista previa.

- **Menos peticiones:**
  - Lo que la vista previa ya muestra sola (colores, letras, tamaños y los textos que pasan tal cual: títulos, subtítulos, textos, botones, nombres y salón) se guarda con calma: 1 s después de dejar de escribir, o cada 5 s si se escribe sin parar.
  - Lo demás se guarda a los 400 ms, como antes.
  - El catálogo, las personas y mis datos ya no se piden dos veces, y publicar no vuelve a pedir el diseño.
- **Cada petición cuesta menos:** guardar o abrir lee cada archivo una vez (antes, el borrador hasta 5 veces por guardado).
- **Producción** (en `deploy/`, sale con el próximo deploy):
  - Apache entrega las fotos sin pasar por PHP; también ayuda a la invitación pública.
  - Las páginas ya no abren sesión ni mandan cookies que nadie usaba.
- **Medido** con la imagen de producción (1 CPU, 512 MB) y una sesión de edición guionada, mediana de 3 corridas:

  | | Antes | Después | Cambio |
  |---|---|---|---|
  | Peticiones a PHP con caché | 58 | 28 | −52 % |
  | Peticiones a PHP la primera vez | 89 | 28 | −69 % |
  | Trabajo del servidor por sesión, con caché | 520 ms | 177 ms | −66 % |
  | Trabajo del servidor por sesión, primera vez | 640 ms | 193 ms | −70 % |

  El detalle y cómo se midió está en `04-fases/fase-8-gestor-de-plantillas.md` → H.

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

- **Acceso:** solo con `clave_panel` (mínimo 8 caracteres). En el formato nuevo vive en `ajustes.csv` y la genera el gestor; en el anterior, en la pestaña `evento` del Excel.
  - La sesión dura 12 h y se cierra si cambias la clave.
  - La clave nunca sale en la invitación pública (hay prueba de eso).
- **Generar enlace:** se escribe para cuántos invitados es (1 a 30) y, opcionalmente, el nombre que va en el sobre. Queda lista para "Enviar" (PDF con la invitación).
- **Pestaña Invitaciones:** todos los enlaces (lista desplegable, sin URLs a la vista), para cuántos es cada uno, quiénes confirmaron, cuántas veces se abrió y "Mesa para todos".
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
| Assets del tema en `web/src/themes/jardin-azul/assets/` | Ilustraciones y fotos del evento en `eventos/nat/media/` (privado); el tema trae solo tokens y respaldos en CSS | No versionar material del cliente en un repo público |
| Evento demo `xv-demo` con seeder | Datos ficticios en `api/tests/Fixtures/eventos/` y una copia privada `eventos/nat-prueba` para probar a mano | Sin base de datos no hay seeders |
| Tema `boda-salvia` en la fase 3 | Pospuesto; `web/src/legacy/BodaLegacy.vue` queda de referencia (solo en desarrollo, en `/legacy/boda`) | Prioridad: NAT |
| Rutas `/admin/...` | `/panel/<slug>` | Un panel por evento |
| VPS + Netlify, o Railway/Render (D3) | Fly.io: un contenedor con API e invitación, y un disco para los CSV | Decisión tuya (13-oct): lo más barato con disco persistente |
| Música: MP3 y una playlist de Spotify aparte (fase 6) | Dos fuentes a elegir; con Spotify, la playlist suena al abrir el sobre y los controles dorados la manejan | Decisión tuya (13-oct) |
| Sin clima | Sección `clima`: clima típico y luego pronóstico real, que se actualiza solo | Decisión tuya (13-oct) |
| Efectos de la fase 6 (revisar los existentes) | Efectos nuevos: destellos, cascada, acercamiento, cambio de color, mariposas en vuelo, confeti, música viva | Decisión tuya: que la invitación se vea más viva (13-oct) |
| Secciones una tras otra sobre el papel | Paneles con su propio fondo y el mismo espacio entre todos | Decisión tuya (13-oct) |
| Mensaje para la festejada dentro del RSVP | Sección aparte de dedicatorias, una por enlace, que el dueño lee en el panel | Decisión tuya (13-oct, imagen de referencia) |
| Sin aviso de "sin niños" | Sección `sin_ninos` | Decisión tuya (13-oct) |
| Editar `layout.xlsx` a mano (fase 5 dejó "editor con vista previa" para después) | Gestor visual con vista previa en vivo, borrador y publicar | Decisión tuya (14-oct) |
| `layout.xlsx` con 9 pestañas | `invitacion.csv`: una hoja de 4 columnas; se descarga e importa como csv, Excel o zip | Decisión tuya (14-oct): mucho más simple, sin perder el Excel |
| Clave del panel y "publicado" en el Excel | En `ajustes.csv`, al instante y fuera del diseño | Que copiar o exportar una invitación nunca lleve la clave |
| Letras y colores solo para toda la invitación | Letra, color y tamaño por bloque de texto y colores por sección | Decisión tuya (14-oct) |
| Una clave maestra para entrar al gestor (D12) | Una cuenta por persona, con rol, clave temporal y quién publicó qué | Decisión tuya (14-oct, pregunta 39) |
| Todos ven todas las invitaciones del gestor | Quien edita ve las suyas; quien administra ve y asigna todas (D17) | Decisión tuya (14-oct, pregunta 40) |
| Autoguardado a los 400 ms para todo (plan del gestor) | Dos ritmos: 400 ms si la vista previa necesita al servidor; 1 s (máximo 5 s) si ya lo muestra sola, con los textos al instante | Pedido tuyo (15-oct): menos demanda en el servidor |
| Fotos y audio servidos por Laravel | Los entrega Apache directo del disco (Laravel solo en desarrollo) | Mismo pedido |

## Qué falta

### Antes de mandar los enlaces (RSVP cierra el 6-nov-2026)

1. Responder las preguntas abiertas de `08-decisiones-pendientes.md`. Hay pendientes la hora del evento, el texto de WhatsApp, el número de WhatsApp y el cierre.
2. **Repo** (D1): sigue público. Los commits del 13-oct ya están en `origin/main` (los subiste con `gh`). Falta que revoques el token viejo de GitHub (pregunta 24).
3. **Publicación** (fase 7): ya está en Fly.io. Faltan, **en este orden**:
   1. Renombrar la carpeta en el disco de Fly, que guarda las invitaciones y respuestas ya hechas: `fly ssh console -C "mv /data/eventos/<nombre-anterior> /data/eventos/nat"`. Va antes de subir el evento: si no, `subir-evento.sh nat` crearía una carpeta nueva vacía.
   2. `fly deploy --ha=false`: clima, carga optimizada, suspend, ajustes de diseño, hospedaje, panel nuevo y la imagen para WhatsApp con tu diseño.
   3. `deploy/subir-evento.sh nat`: Excel con canción, hoteles, "Nat", la clave nueva del panel y lo de la imagen; el MP3, las fotos de los hoteles y el fondo de la imagen.
   4. Abrir `/e/nat`, `/panel/nat` y una invitación que ya hayas generado (`/i/…`, el enlace sigue igual).
   - Vista previa de WhatsApp (Open Graph). Laravel ya sirve `app.html`, así que se puede inyectar ahí.
   - CI con las pruebas.
   - Decidir si dejar una máquina siempre encendida (quita los ~5 s de la primera visita).
   - Dominio propio, si se quiere.
4. QA en celulares reales con `05-calidad/checklist-qa.md`: audio en iPhone, Lighthouse y mandar un PDF de prueba por WhatsApp (iPhone y Android) para confirmar que al tocarlo abre la invitación.

### Gestor (rama `feature/gestor-plantillas`)

1. **Publicado (15-oct):** merge a `main` (local; falta el push a GitHub) y `fly deploy` con tu `GESTOR_CLAVE` (release v6). La clave nueva del panel de NAT se subió con su Excel.
2. **Resto del runbook** (`06-despliegue/despliegue.md` → "Gestor: primera publicación"): crear tu cuenta en `/gestor`, respaldo, y pasar NAT al formato nuevo (al publicarla desde el gestor, por ejemplo con la playlist "Xv Nat").
3. **Etapa F, después del 28-nov:** quitar el camino del Excel y `layout:xlsx`; pasar las fixtures al formato nuevo.

### Después del evento real o cuando se decida

- Pases PDF con QR y check-in en la puerta (D9). El lector lee el QR de la invitación que ya se mandó por WhatsApp (no hay QR aparte).
- Que el buscador de recepción lea `respuestas.csv` (nombres y mesa) y que su backend pase a Laravel.
- Borrar un enlace o cambiar sus invitados (pregunta abierta).
- Tema `boda-salvia`.
- Media Session (título de la canción en la pantalla de bloqueo, solo con MP3) y medición de FPS en un Android de gama media.
- Probar Spotify en un iPhone y un Android reales: si el play al abrir el sobre pasa o pide tocar ▶, y que la vista ya no salte al cambiar de canción.
- Actualizar `evento.schema.json` y `frontend.md §4`, que describen la forma original del config. Hoy la forma real está en `web/src/types/event.ts` y la arma `EventConfigBuilder`.
