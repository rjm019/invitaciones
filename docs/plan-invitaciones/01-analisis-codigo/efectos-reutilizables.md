# Inventario de efectos — qué existe, cómo funciona y cómo reutilizarlo

Fuentes:

- **A** = `boda-invitacion/src/components/invitation.vue` (repo).
- **B** = invitación NY que armamos en Canva.
- **C** = diseño "NAT".

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

## Piezas de diseño reutilizables (lo que hay hoy, 16-oct-2026)

La tabla de arriba es el inventario del código original (12-oct). Esto es lo que existe hoy.

**Cómo se usan:**
- Todo sirve **en cualquier tema** y toma los colores de su paleta (solo tokens).
- Se enciende desde el gestor o desde `invitacion.csv`, sin tocar código (`eventos/README.md`).
- El tema pone sus valores por defecto en su `manifest.ts`; lo que diga la invitación gana.
- Para agregar una pieza nueva: `../03-arquitectura-objetivo/frontend.md` §6.

### 1. Efectos por sección

Van en `efectos`, separados por espacio; en el gestor, *Diseño → Animaciones*. `ninguno` apaga los que trae el tema. `SectionShell` pone la clase `fx-<efecto>` y pinta las capas.

| En el CSV | Qué hace | Dónde vive |
|---|---|---|
| `aparecer` | La sección entra suave al llegar a ella | `SectionShell` |
| `parallax` | La foto se mueve un poco más lento que la página | `useParallax` (foto en arco, `ventana`) |
| `flotar` · `brillo` | Los adornos se mecen · un destello cruza los botones | `effects.css` |
| `linea` | La línea del itinerario se llena al bajar | `useTimelineProgress` (itinerario, `avenida`) |
| `escribir` | El texto aparece letra por letra | `TypewriterText` (frase, ubicación, `neon`, `metro`) |
| `destellos` · `cascada` · `acercamiento` | Estrellitas que titilan · los elementos entran uno tras otro · la foto se acerca despacio | `SectionShell` + `effects.css` |
| `cambio_de_color` (`colores`) | El fondo pasa por los tonos del tema | `SectionShell` (capas que solo cambian de opacidad) |
| `horizonte` (`ciudad`) | Manhattan al pie, en tres capas que avanzan, con ventanas que se encienden | `SectionAmbience` + máscaras `effects/assets/horizonte-*.svg` (`--fx-skyline-*` para otros colores) |
| `reflectores` · `luces` · `escarcha` (`brillitos`) | Haces de luz que barren el cielo · luces desenfocadas · brillitos que caen | `SectionAmbience` (posiciones en `effectsService`) |
| `reflejo` | Una luz cruza de vez en cuando y aviva solo lo claro | `SectionShell` (`.section__sheen`, `color-dodge`) |
| `panoramica` (`paneo`) | La imagen de fondo se desliza de lado a lado | `effects.css` |
| `bola_disco` (`disco`) | Bolas de espejos en 3D que giran, con rayos, destellos y reflejos | `SectionAmbience` + `discoBalls`, `discoTiles`, `discoRays` y `discoSpots` (`effectsService`) |
| `luces_disco` (`reflejos_disco`) | Solo los reflejos: puntos de luz que cruzan la sección | `SectionAmbience` + `discoSpots` |
| `difuminar` (`integrar`, `sin_cortes`) | La sección deja de ser tarjeta y se funde con sus vecinas (ver §3) | `SectionShell` + `withEdges` (`sectionService`) |

### 2. De toda la página (bloque `pagina`; en el gestor, *Estilo → Página*)

| Campo | Valores | Qué hace | Dónde vive | Lo pone el tema con |
|---|---|---|---|---|
| `difuminar` | `SI` | Secciones difuminadas en toda la invitación | `resolveSections` (le pone `blend` a todas) | su plantilla (`pagina,,difuminar,SI`) |
| `orilla` | `degradado`, `hoja`, `ciudad`, `ola`, `feston`, `recta` | La forma de las orillas de las franjas; cada sección puede cambiar la suya con su `orilla` | `SectionShell` (`.section--edge-*`) + máscaras `effects/assets/{hoja,borde,ola,feston}-*.svg` | `edges: { default, <color> }` (Nueva York: ciudad, y hoja en el papel) |
| `botones` | `degradado`, `solido`, `contorno`, `deco`, `boleto`, `neon`, `texto` | El estilo de todos los botones (clase `inv-btn`); sin estilo, cada uno se ve como siempre | `effects/buttons.css` (variables `--btn-*`) | `buttons` |
| `confeti` | `SI`/`NO` | Papel metálico que cae por toda la página (se apaga con `decoracion`) | `FoilConfetti` + `foilConfetti` (`effectsService`) | `confetti: { count }` |
| `metalico` | `SI`/`NO` | Títulos, nombres, fecha y números con brillo de metal, desde el color de cada texto | `effects/options.css` (`data-metal`) | `metallic` |
| `esquinas` | `deco`, `ninguna` | Esquinas escalonadas art déco en los paneles, el clima y la playlist | `effects/options.css` (`data-corners`, tokens `--deco-corner-*`) | `corners` |
| `decoracion` | `SI`/`NO` | Lo que cruza la pantalla: mariposas (`flights`) o confeti | `ButterflyFlight`, `FoilConfetti` | `flights`, `confetti` |

### 3. Secciones difuminadas, por dentro

- **Sin fondo:** la sección va directo sobre el papel de la página.
- **Con fondo, es una franja:** el color o la imagen van en `.section__sheet`, con una máscara de tres capas (orilla de arriba, cuerpo, orilla de abajo).
- **Variables de cada orilla:** `--blend-top`, `--blend-bottom` y `--blend-edge`. `--blend-shift` mueve la máscara para que dos orillas seguidas no se vean iguales.
- **Hoja rasgada:** suma la fibra (`--blend-rim`) y la sombra (`--blend-shade`) de la hoja.
- **El papel:** el color `papel` (`--color-paper`) lleva grano (`themes/_shared/assets/grano.svg`). La tinta de una franja la cambia el tema con `.section--bg-<color>` (Nueva York: el papel en tinta).
- **Piezas oscuras sobre papel:** `.page-palette` recupera la paleta de la página (`--root-*`).

### 4. Diseños de sección (`variante`; en el gestor, *Diseño → Diseño*)

Nacieron para Nueva York, pero cualquier tema los usa con sus colores y letras. `clasica` vuelve al diseño de siempre. Están en `components/sectionVariants.ts` → `components/sections/variants/`; el pase y la postal son solo piel CSS (`variants/skins.css`).

| Sección | Diseño | Idea |
|---|---|---|
| portada | `elevador` | Puertas art déco; al tocar, la aguja recorre los pisos y se abren |
| música | `vinilo` | Tocadiscos que gira mientras suena |
| bendición | `programa` | Programa de mano de Broadway, con el "reparto" |
| fecha | `boleto` | Boleto plateado con talón y la semana del evento |
| foto | `ventana` | La punta escalonada de un rascacielos, con la ciudad detrás |
| ubicación | `metro` | Letrero de estación; la foto en marco de plata |
| frase | `neon` | Letrero de neón que parpadea y se enciende |
| itinerario | `avenida` | Línea del metro en un poste con farol y letreros de calle; al pie, la Estatua y el puente |
| vestimenta | `vitrinas` | Escaparates de la Quinta Avenida |
| sin niños | `cordon` | Cordón de terciopelo |
| cuenta regresiva | `tablero` | Paletas de Grand Central que caen (`FlapDigit`) |
| hospedaje | `colgantes` | Colgantes de puerta de hotel |
| mesa de regalos | `bolsas` | Bolsas de compras y un sobre déco |
| confirmación | `pase` | Pase VIP con su cinta (piel CSS) |
| dedicatoria | `postal` | Correo aéreo con timbre de la Estatua (piel CSS) |
| cierre | `marquesina` | Marquesina de Broadway con focos que corren |

### 5. Adornos, íconos y otras piezas

- **Adornos compartidos** (`themes/_shared/assets/`: `puerta`, `estatua`, `puente`, `destellos-titulo`, `grano`):
  - Cualquier tema los encuentra por nombre: `themeAssets` los mezcla debajo de los suyos.
  - Cada diseño los usa si su tema no trae los propios (`decorOr`), y la invitación los cambia o los quita con `imagen_<adorno>`.
- **Destellos de título:** `TITLE_SPARKLES` (`themes/_shared/sprites.ts`), animados por `SpriteDecor`. Cada estrella titila sola; el color va en `--glint-tint`.
- **Íconos del itinerario:** los de Font Awesome y los propios de `assets/icons/` (Estatua de la Libertad, puente de Brooklyn, Empire State, bola disco), en `AppIcon`.
- **Ahorro:** las secciones lejos de la pantalla llevan `.is-idle`, que pausa sus animaciones y quita su ambiente (`SectionShell` + `useInView`).

## Reglas para todos los efectos

1. **Sin selectores globales:** solo refs del componente.
2. **Limpiar en `onBeforeUnmount`** todo listener, observer, intervalo y audio.
3. **Animar solo `transform` y `opacity`**, para mantener 60 fps en gama media.
4. **`@media (prefers-reduced-motion: reduce)`** desactiva los movimientos decorativos.
5. **Configuración por props o por tema**, nunca valores fijos.
6. **Cada composable con su prueba en Vitest** (countdown, calendar y timeline al menos).
