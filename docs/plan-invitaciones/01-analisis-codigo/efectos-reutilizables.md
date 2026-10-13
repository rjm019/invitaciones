# Inventario de efectos — qué existe, cómo funciona y cómo reutilizarlo

Fuentes:

- **A** = `boda-invitacion/src/components/invitation.vue` (repo).
- **B** = invitación NY que armamos en Canva.
- **C** = diseño "NATASHA".

Cada efecto se convierte en un **composable** o **componente** genérico, configurable por tema.

| # | Efecto | Origen | Implementación actual | Problemas | Versión reutilizable |
|---|---|---|---|---|---|
| E1 | Reproductor de audio (play/pausa, barra con seek, tiempo, "Reproduce y desliza hacia abajo") | A | `<audio ref>` + métodos `togglePlay`, `updateProgress`, `seekAudio`, `setDuration`, `formatTime`; intenta `audio.play()` en `mounted` | El autoplay falla sin interacción (lo maneja con `catch`, pero `isPlaying` queda desincronizado); 9.4 MB | `useAudioPlayer(src)` (estado reactivo `isPlaying`, `progress`, `currentTime`, `duration`, `toggle()`, `seek()`) + `MusicPlayer.vue` (skin por tema: controles estilo "DALE PLAY" de C) + `MiniPlayer.vue` fijo |
| E2 | Cuenta regresiva días/horas/min/seg | A, C (iframe) | `setInterval` cada 1 s con fecha fija | Intervalo sin limpiar; fecha fija; sin zona horaria. En C el widget externo apunta a otra fecha | `useCountdown(startsAt, timezone)` que devuelve `{days,hours,minutes,seconds,isOver}` y limpia en unmount + `Countdown.vue` |
| E3 | Línea de itinerario que se llena con el scroll y círculos que se activan | A | `updateTimeline` con throttle 100 ms, `querySelectorAll` global, calcula `height` de `.timeline-line` y la clase `.circle.active` | Selectores globales; mide en cada scroll | `useTimelineProgress(containerRef, itemRefs)` con IntersectionObserver + rAF; CSS `transform: scaleY()` en lugar de `height` (más fluido) |
| E4 | Fondo fijo que cambia (fecha → dress code) | A | Secciones `position: fixed` 100vh con `v-if` según `scrollY > 2300` | Punto fijo en px; `position: fixed` + `background-attachment: fixed` tiene fallos en iOS | `StickyBackdrop.vue`: capas `position: sticky` y un IntersectionObserver por sección; cambio con fade de 400 ms |
| E5 | Scroll "lento" | A | `wheel` + `preventDefault` + `scrollBy(delta*0.6)` | Rompe trackpads y la accesibilidad | **Eliminar**. Opcional: Lenis con `prefers-reduced-motion` respetado |
| E6 | Tarjetas de ubicación con foto y botón GPS | A, C | HTML fijo con `<a href=maps>` | Datos fijos | `Location.vue` con lista `locations[]` y botón dorado con *shine* (C) |
| E7 | Hoteles recomendados | A | Tarjetas fijas | Datos fijos | `Hotels.vue` opcional (`hotels[]`) |
| E8 | Confirmación con pases por familia | A | `RegisterGuests.vue` con N inputs | Rutas rotas y validación débil | `RsvpForm.vue` (sí/no, nombres ≤ pases, canción, mensaje) + API por token |
| E9 | Generador de links por familia | A | `GenerateLink.vue` sin login | Público; link inseguro | Panel admin con login: alta individual, **importar CSV**, copiar link o mensaje de WhatsApp, QR |
| E10 | Spotify embebido | B | App "Embed" de Canva (playlist falló; las canciones sueltas sí funcionaron) | Limitación de Canva | `SpotifyEmbed.vue` con iframe directo `open.spotify.com/embed/{playlist|track}/{id}` |
| E11 | Pregunta "¿qué canción no puede faltar?" en el RSVP | B | Pregunta del formulario de Canva | — | Campo `song` en RSVP y lista en el panel admin |
| E12 | Botón que salta a la sección de confirmación | B | Enlace a "Sección 7" en Canva | — | `scrollIntoView({behavior:'smooth'})` hacia `#rsvp` |
| E13 | Imágenes a escala de grises | B | Ajuste de saturación −100 en Canva | — | Clase utilitaria `.is-mono { filter: grayscale(1) contrast(1.05) }` por tema |
| E14 | Sobre que se abre | **Nuevo** (sugerido por C) | — | — | `HeroEnvelope.vue`: solapa con `rotateX`, la tarjeta sube; ese toque inicia el audio (resuelve el autoplay) |
| E15 | Calendario generado con el día marcado | **Nuevo** (C lo tiene como imagen) | — | — | `useCalendar(date)` + `MonthCalendar.vue`; corazón SVG con `stroke-dashoffset` |
| E16 | Aparición de secciones al hacer scroll | **Nuevo** | — | — | Directiva `v-reveal` (IntersectionObserver, `opacity`/`translateY`, `prefers-reduced-motion`) |
| E17 | Mariposas y destellos flotantes | **Nuevo** (C los tiene estáticos) | — | — | `FloatingDecor.vue` con keyframes `float` (6–9 s) y `twinkle` (2.4 s) |
| E18 | Foto "pop-out" con parallax leve | **Nuevo** (C, sección foto) | — | — | `PhotoArch.vue`: la foto (PNG sin fondo) sobresale del marco; `translateY` proporcional al scroll (máx. 24 px) |

## Reglas para todos los efectos

1. **Sin selectores globales:** solo refs del componente.
2. **Limpiar en `onBeforeUnmount`** todo listener, observer, intervalo y audio.
3. **Animar solo `transform` y `opacity`**, para mantener 60 fps en gama media.
4. **`@media (prefers-reduced-motion: reduce)`** desactiva los movimientos decorativos.
5. **Configuración por props o por tema**, nunca valores fijos.
6. **Cada composable con su prueba en Vitest** (countdown, calendar y timeline al menos).
