# Fase 6 — Música, Spotify y pulido de efectos

**Objetivo:** que la experiencia sensorial (música y movimiento) sea fluida, ligera y accesible.
**Duración estimada:** 1 día.

> **Estado (13-oct-2026): casi toda hecha, y con más de lo planeado.** La música puede salir de un MP3 **o de la playlist de Spotify**: con Spotify, la playlist suena al abrir el sobre. También se agregó la sección **clima**. Faltan la música real (pregunta abierta 3), Media Session y la medición de FPS en un Android. Detalle en `../09-avance.md`.
> Casillas: `[x]` hecho · `[x] ~~…~~ Cambió:` resuelto de otra forma · `[ ]` pendiente.

## Música

- [ ] Recodificar el audio. *Pendiente: falta el MP3 del evento. Hoy hay un tono de prueba en la copia `nat-prueba`.* Este comando recorta a 3 min con fade de entrada y salida, y queda en ≈2.8 MB; con `-b:a 96k` baja a ≈2 MB:
  ```bash
  ffmpeg -i original.mp3 -ac 2 -b:a 128k -t 180 -af "afade=t=in:d=2,afade=t=out:st=176:d=4" cancion.mp3
  ```
- [x] El audio no se descarga al cargar la página: `audioService` lo crea al abrir el sobre.
- [ ] Media Session API: título y artista en la pantalla de bloqueo del celular.
- [x] ~~Pausar el audio cuando se abre el formulario de RSVP.~~ *Ya no aplica: el formulario va en línea, no en un modal.*
- [x] Usar **solo** canciones que el cliente provea, o enlaces de Spotify/YouTube. No versionar mp3 con derechos. *El MP3 va en `eventos/<slug>/media/`, fuera de git. Ojo: `web/public/audio.mp3`, de la boda original, sigue en el repo (pregunta abierta 16).*

## Spotify

- [x] Reproductor incrustado de Spotify: acepta el enlace de Compartir (con `/intl-es/` y `?si=`) o el URI de la app. Usa tema oscuro y textos en español (`es-419`).
- [x] Sección `playlist` (`SpotifySection`) con la lista de canciones: `completa` (560 px, por defecto), `lista` (352) o `compacta` (152), más "Abrir en Spotify". Sin la sección, el reproductor compacto va debajo de `MusicPlayer`.
- [x] **Agregado:** `musica_fuente = spotify`. La canción que inicia el sobre sale de la playlist, con la API oficial del reproductor (`spotifyPlayerService`). Los controles dorados y el mini-reproductor la manejan.
  - Spotify no permite repetir desde fuera de su reproductor, así que el botón de repetir queda apagado.
  - Si el navegador bloquea el play (iPhone), a los 6 s la invitación pide tocar ▶.
- [x] **Agregado:** con MP3, tocar la playlist pausa la canción de la invitación (`useEmbedFocus`): no suenan dos a la vez.
- [x] Nota: el embed reproduce fragmentos de 30 s si el usuario no tiene sesión en Spotify, y al terminar cada uno muestra su aviso "Obtener Spotify" encima de la lista (se cierra con su X, vuelve en la siguiente canción).
- [x] **Agregado:** al cambiar de canción, Spotify movía su lista y arrastraba la página hasta el reproductor. Ahora la vista se queda donde está el invitado (`useSteadyScroll`, a partir del aviso de canción nueva).
- [ ] Lista propia leída con la API de Spotify (sin aviso), si se decide (pregunta abierta 3).

## Clima (agregado)

- [x] Sección `clima`: clima típico de la fecha (10 años) hasta 16 días antes; después, el pronóstico real, que se renueva solo. Muestra las horas de la fiesta y un consejo. Datos de Open-Meteo, con caché en la API (`WeatherService`, `GET /public/events/{slug}/weather`).
- [ ] Confirmar la licencia de Open-Meteo si el uso es comercial (pregunta abierta 18).

## Efectos

- [x] Revisar que **todas** las animaciones usen `transform` y `opacity`. *Las excepciones son el cambio de color del ícono activo del itinerario, también en la estación encendida del diseño `avenida` (revisado de nuevo el 16-oct en todos los diseños y efectos).*
- [x] `prefers-reduced-motion` desactiva FloatingDecor, parallax, shine y la animación del sobre (se muestra abierto).
- [ ] Probar FPS con Chrome DevTools → Performance, en el perfil "Mid-tier mobile" (CPU 4× más lenta).
- [ ] Desactivar el parallax en iOS si hay jank. *Depende de la prueba en un iPhone.*
- [x] `MiniPlayer` y controles con teclado: foco visible y `aria-pressed`.
- [x] **Agregado (13-oct):** mariposas doradas que aletean una por una y estrellas con destellos en la foto en arco (`SpriteDecor`).
- [x] **Agregado (13-oct, noche):** secciones como paneles con su propio fondo y el mismo espacio entre todas (`--section-gap`); la portada se ajusta al abrir el sobre. Efecto `cambio_de_color` (o `colores`), con capas de color que solo cambian de opacidad; lo trae el Dress Code, cuya tarjeta además va y viene a negro con los textos en blanco.
- [x] **Agregado (13-oct):** efectos `destellos`, `cascada` y `acercamiento` por sección. El tema suma mariposas en vuelo, pétalos y confeti (al abrir el sobre y al confirmar), el corazón y el ecualizador del reproductor, ondas en el mini-reproductor y el segundero que late. Todo con transform y opacity, y apagado con `prefers-reduced-motion`.
- [x] **Agregado (15 y 16-oct, tema Nueva York, para cualquier tema):**
  - Efectos: `horizonte`, `reflectores`, `luces`, `escarcha`, `reflejo`, `panoramica`, `bola_disco` (bolas de espejos en 3D que giran con un solo transform) y `luces_disco`.
  - Confeti plateado de la página y `difuminar` (secciones sin cortes).
  - Las secciones lejos de la pantalla pausan sus animaciones (`.is-idle`).
  - Con "reducir movimiento" todo se queda quieto. Catálogo completo en `../01-analisis-codigo/efectos-reutilizables.md`.
- [ ] Medir los efectos de Nueva York en celulares reales (elevador, bolas disco, reflectores, escarcha, confeti, tablero). Va con la medición de FPS de arriba.

## Criterios de aceptación

- Audio menor de 3 MB y que suena en iOS Safari y Chrome Android después de abrir el sobre. *Pendiente: falta el MP3 y la prueba en celulares.*
- 60 fps en el scroll del itinerario en un Android de gama media. *Pendiente.*
- La playlist de Spotify se ve dentro de la invitación (lo que en Canva no fue posible). *Hecho (falta la playlist real).*
