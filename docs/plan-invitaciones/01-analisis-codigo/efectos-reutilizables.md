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
| `aparecer_zoom` · `aparecer_deslizar` · `aparecer_giro` | Otras formas de aparecer: crece, entra de un costado (alterna) o se levanta como tarjeta | `SectionShell` (`REVEALS`) + `effects.css` (`.fx-reveal-zoom/-slide/-tilt`) |
| sección `capa` | Fotos quietas que se ven por debajo mientras la página pasa por encima; cada foto es otra capa | `LayerSection` (ventanas) + `SectionShell` (`section.layers`: una franja recortada por foto con la foto `position: fixed`) |
| galería `carrusel` · `diapositivas` | Fotos que se deslizan de lado (imán por foto) · que se cambian solas como un gif | `GalleryCarousel` · `GallerySlideshow` (+ `galleryItems` en `galleryService`) |
| `iconos` | Dibujos de línea de la ciudad (Estatua, taxi, Empire State, pretzel, puente, café, manzana…) a los costados, que se mecen | `SectionAmbience` + `cityIcons` (`effectsService`) + máscaras `effects/assets/ciudad/*.svg` (`--fx-icons-color`) |
| `taxi` | Taxis que cruzan la sección por el pie, uno hacia cada lado | `SectionAmbience` + `taxis` (`--fx-taxi-color`) |
| `franja_ciudad` | Hilera de esos dibujos en la orilla de arriba | `SectionAmbience` (`.fx-strip`) |
| `luces_disco` (`reflejos_disco`) | Solo los reflejos: puntos de luz que cruzan la sección | `SectionAmbience` + `discoSpots` |
| `difuminar` (`integrar`, `sin_cortes`) | La sección deja de ser tarjeta y se funde con sus vecinas (ver §3) | `SectionShell` + `withEdges` (`sectionService`) |

### 2. De toda la página (bloque `pagina`; en el gestor, *Estilo → Página*)

| Campo | Valores | Qué hace | Dónde vive | Lo pone el tema con |
|---|---|---|---|---|
| `difuminar` | `SI` | Secciones difuminadas en toda la invitación | `resolveSections` (le pone `blend` a todas) | su plantilla (`pagina,,difuminar,SI`) |
| `orilla` | `degradado`, `hoja`, `ciudad`, `ola`, `feston`, `recta` | La forma de las orillas de las franjas; cada sección puede cambiar la suya con su `orilla` | `SectionShell` (`.section--edge-*`) + máscaras `effects/assets/{hoja,borde,ola,feston}-*.svg` | `edges: { default, <color> }` (Nueva York: ciudad, y hoja en el papel) |
| `botones` | `degradado`, `solido`, `contorno`, `deco`, `boleto`, `neon`, `texto` | El estilo de todos los botones (clase `inv-btn`); sin estilo, cada uno se ve como siempre | `effects/buttons.css` (variables `--btn-*`) | `buttons` |
| `confeti` | `SI`/`NO` | Papel metálico que cae por toda la página (se apaga con `decoracion`) | `FoilConfetti` + `foilConfetti` (`effectsService`) | `confetti: { count }` |
| `metalico` | `SI`/`NO` | Títulos, nombres, fecha y números con brillo de metal, desde el color de cada texto. El degradado se pinta solo dentro de la caja del texto, así que cada uno lleva relleno y margen negativo (`--glyph-x`, `--glyph-y`) para que no se corten los floreos de las letras cursivas; un título con margen o relleno propio lo repite bajo `.invitation[data-metal]` (ver `.ny-date__title`, `.ny-itin__title`, skin `postal` de dedicatorias) | `effects/options.css` (`data-metal`) | `metallic` |
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

## Tema `encaje` (boda en salvia, encaje y telas): piezas nuevas

Todo es global: el tema `encaje` solo les pone valor en su manifest.

**Opciones de página** (`Catalog::PAGE`, `InvitationConfigBuilder::page()`, `designAttrs`):

| Opción | Valores nuevos | Dónde vive |
|---|---|---|
| `orilla` (página y sección) | `encaje` (`lace`) | `effects/assets/encaje-arriba.svg` y `encaje-abajo.svg` (repiten sin costura); `.section--edge-lace` en `SectionShell.vue` |
| `esquinas` | `encaje` (`lace`) | `effects/assets/encaje-esquina-{tl,tr,bl,br}.svg`; reglas en `effects/options.css` |
| `botones` | `liston` (`ribbon`) | `effects/buttons.css`: cinta de satén con puntas en V |
| `textura` | `terciopelo`, `satin`, `gasa`, `lino`, `papel`, `piedra`, `algodon`, `ninguna` | `effects/options.css` (`data-texture`); mosaicos neutros en `effects/assets/textura-*.svg` |

**Efecto `velo`** (`fx-veil`): tul marfil que ondea sobre la sección (solo `::after`, transform y opacity).

**Adornos compartidos** (`themes/_shared/assets/`): `cortinaje` (guirnalda de gasa con hilo de perlas), `pliegues` (luz y sombra de una cortina, neutro), `perlas` (divisor), `alcatraz`, `tela-pie` (tela arrugada), `encaje` (carpeta o doily). Ranuras nuevas: `paisaje`, `cortinaje`, `telon`, `pliegues`, `tela`, `alcatraz`, `encaje`.

**Diseños de sección nuevos**

| Sección | Variante | Componente |
|---|---|---|
| portada | `telon` | `HeroCurtain.vue`: telón de terciopelo en dos mitades que se recogen y descubren un paisaje (`paisaje` o la `imagen` de la portada) |
| portada | `encaje` | El sobre de siempre con el sobre, la tarjeta y el lacre del tema `encaje` |
| fecha | `calendario` | `SaveTheDateEnvelope.vue`: mes en tarjeta dentro de un sobre, día en corazón |
| foto | `camafeo` | `PhotoCameo.vue`: óvalo sobre carpeta de encaje |
| vestimenta | `muestrario` | `DressCodeSwatches.vue`: retazos de tela con borde de tijera de picos (colores sugeridos o `--color-pastel-*`) |
| mesa de regalos | `etiqueta` | `GiftsTags.vue`: etiquetas de papel rasgado con perforaciones y perla o moño |
| cuenta regresiva | `corazon` | `CountdownHeart.vue`: doily recortado en corazón con los números |
| cierre | `bordado` | `ClosingEmbroidery.vue`: tela arrugada al pie, alcatraces y firma (bloque `firma`) |

### Tema `encaje`, etapa 6b-2: grabado, bastidores, tarjetas y óvalos de encaje

Todos globales: cualquier tema los usa con `variante` y sus propios colores; `encaje` los pone en su manifest.

| Sección | Variante | Pieza |
|---|---|---|
| itinerario | `grabado` | `ItineraryEngraving.vue`: hilo vertical con un medallón por momento (hora a un lado, actividad al otro). El dibujo de línea (copa, anillos, plato, pastel, música, iglesia, cámara, corazón, flor) sale de `services/engravedIconService.ts`: primero por el `icono` del editor (`champagne-glasses`, `ring`, `utensils`, `cake-candles`…) y, si no, por las palabras de la actividad. Soporta `en_vivo` (`useLiveItinerary` + `LiveItineraryBanner`) y la línea que se llena (`timeline-fill`). Ranura `divisor` (perlas) |
| ubicación | `grabado` | `LocationEngraving.vue`: lámina de panel oliva (`page-palette`) con la hacienda dibujada a línea (ranura `hacienda`, adorno compartido `hacienda.svg`, pintado con máscara en el color de la tinta), etiqueta, nombre, hora y dirección; "Ver ubicación" y "Agregar al calendario" por lugar. Mismas props que `metro`: `acomodo` (lado a lado/apilado), `calendario` y el `tipo` de cada lugar |
| galería | `bastidor` | `GalleryHoops.vue`: cada foto en un aro de bordado (madera clara con tornillo, tela de lino y puntada discontinua), una de cada tres a todo el ancho. Usa `galleryItems` (miniaturas con `srcset`) y el `PhotoViewer` |
| trivia | `tarjetas` | Piel en `skins.css` sobre `TriviaSection` (mismo comportamiento y mismo servicio): tarjeta de papel con puntada y carpeta de encaje que asoma arriba; tinta y papel de `--color-on-button` y `--color-paper` |
| video, publicación | `encaje` | Piel en `skins.css` sobre `SocialPlayer`: marco ovalado con aro de perlas y puntadas. La fachada no cambia: sigue sin cargar nada de terceros hasta tocar play |

- Las pieles no se descargan: se registran en `skinVariants` (`sectionVariants.ts`) y el spec del tema comprueba que su regla exista en `skins.css`.
- **Adorno nuevo compartido:** `hacienda` (`themes/_shared/assets/hacienda.svg`, ranura `estate`).
- **Enlace de la vestimenta:** `muestrario` ya no busca en Google; su botón ("Ver ejemplos", o el `boton` de la sección) lleva al campo `enlace` de la sección (https validado por el servidor, `section.link`). Sin enlace no hay botón.
- **Plantilla:** `deploy/plantillas/encaje/invitacion.csv` (boda con todas las secciones y variantes, datos neutros; galería, video y publicación quedan ocultas hasta poner sus fotos o enlaces).


## Tema `encaje`: sobre central y efectos de tela y encaje

Todo global: cualquier tema los pide por nombre en `efectos` (o en su manifest, `sections[tipo].effects`) y los pinta con sus colores. Un efecto nuevo = entrada en `Catalog::EFFECTS` (nombre CSV, ayuda en español) + el id en `EffectName` (`types/event.ts`) + su pintura. Las capas con nodos van en `components/ui/FabricAmbience.vue` (cuyos números salen de funciones con semilla en `services/effectsService.ts`, con prueba) y su CSS en `effects/fabric.css`; los que son solo CSS cuelgan de la clase `fx-<id>` de la sección. Todas las capas llevan `.ambience`, así que se pausan y se ocultan con `.is-idle`. `SectionShell` le avisa a `FabricAmbience` (`entered`) la primera vez que se ve la sección, para las entradas (luz que se enciende, hilos que caen, encaje que se dibuja).

**Portada `sobre-central`** (`variante` de la portada; `HeroCenterEnvelope.vue`): sobre marfil cerrado con una costura de lado a lado, perla (o el lacre de la ranura `lacre`) al centro y una tira de encaje en la costura. Al tocar: la perla salta, la mitad de arriba se levanta sobre la costura (bisagra en el centro, `rotateX` con perspectiva hasta quedar de canto), la tarjeta sube desde adentro con una luz detrás y la mitad de abajo baja y se desvanece. Ranuras: `tarjeta`, `lacre` y la nueva `papel` (`imagen_papel`, textura del papel de las dos mitades). Mismas reglas de las otras portadas: sin scroll mientras está cerrada, música al tocar, "menos movimiento" la deja abierta, `motionTime`/`--motion-scale`, y nada de lo que anima sale de transform y opacity.

| CSV (`efectos`) | Id | Qué hace | Luce en |
|---|---|---|---|
| `encaje_giratorio` | `lace-spin` | carpetas de encaje que giran muy lento en dos esquinas, detrás del contenido | bendición, paneles oscuros |
| `encaje_ondulante` | `lace-wave` | las orillas de encaje de arriba y abajo se mecen como tela con brisa | foto, trivia, vestimenta |
| `encaje_dibujado` | `lace-draw` | una flor de encaje se arma trazo a trazo (aros, pétalos, puntadas) al llegar a la sección | ubicación, cierre |
| `foco` | `spotlight` | luz de escenario: los bordes se oscurecen y un haz cae sobre el centro al llegar | frase, spotify, video |
| `foco_viaja` | `spotlight-travel` | el mismo foco, que recorre la sección de lado a lado | música, galería |
| `perlas_destello` | `pearl-glint` | un collar de perlas al borde con un destello que lo recorre perla por perla | fecha, mesa de regalos |
| `satin_brillo` | `satin-sweep` | un barrido de brillo de satén cruza el fondo | itinerario, música |
| `cortinaje_mece` | `drape-sway` | guirnaldas de gasa con perlas (adorno `cortinaje`) arriba, que se balancean | hospedaje, portadas |
| `perlas_cuelgan` | `pearl-strands` | siete hilos de perlas caen al entrar y se balancean | cuenta regresiva |
| `petalos` | `petals` | una docena de pétalos blancos caen muy despacio, meciéndose | lluvia de sobres, asistencia, cierre |
| `polvo_luz` | `light-dust` | motas de luz nítidas (sin desenfoque) que suben y se encienden | portada, sin niños, dedicatorias |
| `tul_respira` | `tulle-breathe` | velos de tul en las orillas que respiran (distinto a `velo`, que cruza la sección) | clima |
| `bordado_aparece` | `stitch-in` | el título aparece de a poco y debajo se cose una línea de puntadas, una tras otra | bendición, fecha, frase |
| `respira` | `breathe` | el panel crece y se encoge apenas (propiedad `scale`, que no estorba al resto) | foto, asistencia |

Alias: `polvo`/`luciernagas` → `polvo_luz`, `bordado` → `bordado_aparece`, `saten` → `satin_brillo`, `foco_escenario` → `foco`. Con "menos movimiento": el encaje, el collar, el satén y el cortinaje quedan quietos, la luz y el dibujo ya encendidos, y los pétalos y destellos no se pintan.

- **Adornos nuevos:** ninguno en archivo; la flor que se dibuja es SVG en línea (data de `laceStrokes()`), el resto reusa `encaje.svg`, `cortinaje.svg` y `encaje-arriba/abajo.svg`.
- **Nota sobre "dibujado":** no usa `stroke-dashoffset` (repinta) sino trazos que aparecen escalonados con opacity + scale, para respetar la regla de solo transform y opacity.
- **Prueba:** `effectsService.spec.ts` (funciones), `SectionShell.spec.ts` (capas, orden y velocidad), `HeroCenterEnvelope.spec.ts`, `encaje.spec.ts` y `CatalogTest`/`EventEffectsTest` (nombres en español).


## Papelería fina: monograma, lacre, silueta, filete, texturas y relieve

Piezas globales (etapa A del tema `lacre`): ninguna cambia lo que ya se ve; se encienden por opción de `pagina` o de sección, o se usan desde una variante.

| Pieza | Dónde | Cómo se usa |
|---|---|---|
| Monograma | `components/ui/Monogram.vue`, `services/monogramService.ts`, `composables/useMonogram.ts` | `<Monogram initials="I M" ampersand size="8rem" />`. Sin `initials`, usa `celebrant.monogram` (`evento,,monograma`) o las deriva del nombre corto ("Isabella & Mateo" → I M; un nombre + `pareja`; un nombre → su inicial). Dos letras se entrelazan (la segunda recorta a la primera con `--monogram-gap` y la primera vuelve a cruzar por arriba). Tokens: `--monogram-color` (si no `--color-primary`), `--monogram-font` (si no `--font-serif`), `--monogram-amp-font` (si no `--font-script`), `--monogram-gap` (color del papel). Decorativo (`aria-hidden`); con `:decorative="false"` es `role="img"` |
| Lacre | `components/ui/WaxSeal.vue` | `<WaxSeal initials="I M" shape="round\|oval" tone="gold\|burgundy" size="5rem" seed="portada" />`. Orilla irregular repetible por `seed` (`waxEdgePath`), anillo en alto y monograma en bajorrelieve (capas de luz, sombra y cara; sin filtros). Tokens: `--seal-gold` (si no `--color-oro`, #b08d57), `--seal-burgundy` (si no `--color-borgona`, #6e1f2c), `--seal-light`, `--seal-dark`, `--seal-font`. La ranura `lacre` (imagen) sigue igual: `WaxSeal` se usa donde la variante lo pida |
| Silueta | `pagina,,silueta` / `<sección>,,silueta` = `muesca`\|`ninguna` | `data-silhouette` en `.invitation` y en la tarjeta (`SectionShell`); máscara de cuatro cuartos en `effects/options.css` (el recorte se lleva la sombra del panel; solo paneles). Radio: `--notch-size` (1.1rem). Clase utilitaria `.paper-notched` para piezas internas de una variante (recorta, no pinta fondo) |
| Filete | `pagina,,filete` / `<sección>,,filete` = `borgona`\|`oro`\|`ninguno` | Línea fina a `--fillet-inset` (0.5rem) del borde, que sigue las muescas (cuatro arcos y cuatro rectas) o es un marco simple si la tarjeta es recta. Color: `--color-borgona` / `--color-oro` de la paleta. En una pieza interna: `class="paper-notched" data-fillet="borgona"`. Con otro `--notch-size`, ajustar `--notch-a` = sqrt((n+d)² − d²) − d |
| Texturas | `pagina,,textura` = `piedra`, `algodon` (además de `lino`…) | Mosaicos neutros `effects/assets/textura-piedra.svg` y `textura-algodon.svg`; piedra cae a `--color-stone` (#d8cfc0) y algodón a `--color-cotton` (#f5f0e6) si la sección no trae color |
| Relieve | `pagina,,relieve` = `SI`\|`NO` | `data-relief` en `.invitation`: letterpress estático (`text-shadow` de luz y sombra, `--relief-light`/`--relief-dark`) en `title`, `name` y `date`; no aplica con `metalico` |

Datos nuevos de secciones (en `eventos/README.md`): `hospedaje` (`distancia`, `precio`, `reserva`), `vestimenta` (`restricciones`, `referencias`), secciones `historia` (`story`) e `informacion` (`faq`, acordeón accesible) y `dedicatoria` con `muro`. El tema pone sus valores en el manifest (`silhouette`, `fillet`, `relief`, `texture`).


## Tema `lacre`: diseños de papelería fina y tres efectos

Todo global; el tema solo lo pide en su manifest. Componentes en `components/sections/variants/` (o pieles en `skins.css`), registrados en `sectionVariants.ts`.

| Sección | Variante | Pieza |
|---|---|---|
| portada | `sobre-lacre` | `HeroSealedEnvelope.vue`: sobre apaisado (k·W × 0.66·k·W; k = 1 en celular y 1.3 en pantallas anchas, por container query) sobre un escenario del tamaño de la tarjeta (W × 1.4 W). Fases `closed → opening → presenting → open`. **Sin 3D compartido** (así nada queda flotando): la solapa son dos piezas planas con su propia `perspective()`: la de afuera gira 0→90° (de canto) y la de adentro, parada detrás de la tarjeta, −90→0°. La tarjeta viaja a escala 0.39·k dentro del sobre, sube detrás de la bolsa y, en `presenting`, pasa al frente (orden del DOM + `z-index` por clase, no animado) y crece mientras el sobre baja y se desvanece; en `open` el sobre ya no está en el DOM y la tarjeta se acomoda con un FLIP (`--lh-settle`, solo transform). Candado de scroll estricto mientras abre. Damasco en relieve: el mismo dibujo como máscara tres veces (sombra, luz y cara). Todo lo de la tarjeta en `cqi` de la tarjeta |
| música | `lacre` | `MusicSeal.vue`: el lacre es el botón (`WaxSeal icon="play"\|"pause"`: el signo hundido como el monograma); sonando, el lacre late (`ms-beat`, scale) y un anillo de puntos gira; en pausa, brillo de pan de oro. El reproductor de Spotify queda presente pero invisible |
| bendición | `editorial` | `BlessingEditorial.vue` (lee `useEvent().sections` para no repetir a los papás) |
| historia | `editorial` | `StoryEditorial.vue` |
| historia | `cronologia` | `StoryTimeline.vue`: pestañas WAI-ARIA (`role=tablist/tab/tabpanel`, flechas, Inicio y Fin con `tabsService.tabTarget`) y deslizar con `swipeStep`. Todas las tarjetas viven en la misma celda del grid (el alto no salta); la activa entra con `translateX` + `rotate` + `opacity` y las demás quedan `visibility: hidden` e `inert`. El lacre del hilo es un `WaxSeal` cuyo contenedor mide lo que el hilo: `translateX((i + .5) / n · 100 %)` lo lleva al año sin medir nada |
| fecha | `editorial` | `SaveTheDateEditorial.vue` (pieza interna `paper-notched` con `data-fillet`; la sombra va en el contenedor porque la máscara la recortaría) |
| ubicación | `papeleria` | `LocationStationery.vue` (tinta de la página, `--root-text`, aunque el panel sea oscuro). Con `dibujo_vivo` pinta `components/ui/LivingLandmark.vue` en lugar de la máscara (solo si el dibujo es el compartido) |
| cuenta regresiva | `banda` | `CountdownBand.vue` (con `difuminar` y orilla recta es una franja de lado a lado) |
| itinerario | `minuto` | `ItineraryMinute.vue` |
| itinerario | `sello` | `ItinerarySeal.vue`: `useTimelineProgress` (el de `avenida`/`grabado`) da `fill` y `active`; el lacre va en un contenedor del alto de la lista, así `translateY(fill · 100 %)` lo baja por el hilo. Cada dibujo (`momentDrawing` de `engravedIconService`: suma `pareja`, `luna` y `auto` sin cambiar `engravedIcon`) se traza por partes (`> *` con retrasos) al encenderse su momento |
| vestimenta | `editorial` | `DressCodeEditorial.vue` |
| hospedaje | `papeleria` | `HotelsStationery.vue` |
| galería | `editorial` | `GalleryEditorial.vue` |
| mesa de regalos | `sobre` | `GiftsEnvelope.vue` |
| mesa de regalos | `volteo` | `GiftsFlip.vue`: `perspective` + `preserve-3d` + `rotateY(180deg)` y `backface-visibility: hidden`; la cara que no se ve queda `inert`, el frente es un `button` con `aria-pressed` que cubre la tarjeta y el foco pasa a la cara visible. Con menos movimiento, fundido. Respeta `hidden` de GiftPrivacy |
| confirmación | `tarjeta-rsvp` | `RsvpReplyCard.vue`: envuelve a `RsvpSection` (misma lógica) |
| álbum | `papeleria` | `AlbumStationery.vue`: envuelve a `AlbumSection` |
| cierre | `lacre` | `ClosingSeal.vue` |
| información, dedicatorias, trivia | `editorial`, `muro`, `papeleria` | Pieles en `skins.css` |

| CSV (`efectos`) | Id | Qué hace |
|---|---|---|
| `tinta` | `ink` | el título pasa de transparente a firme con un desplazamiento mínimo (solo avisa cuándo se ve la sección) |
| `luz_rasante` | `raking-light` | `SectionShell` pinta `.section__raking`; un haz cálido cruza cada ~11 s con `mix-blend-mode: soft-light` |
| `papel_entra` | `paper-in` | la sección entra desde abajo, apenas girada, como sacada de un sobre |
| `dibujo_vivo` | `living-drawing` | `LivingLandmark.vue`: los mismos trazos de `iglesia.svg`/`hacienda.svg` en línea, agrupados; al entrar cada grupo aparece con opacity + scale (la técnica de `encaje_dibujado`) y luego se mecen campanas y árboles (`rotate` con `transform-origin` en unidades del dibujo), vuelan y aletean aves, giran los rayos del sol y se encienden ventanas y rosetón (opacity). Los ciclos se pausan fuera de pantalla (`useInView` sin `once`); con menos movimiento, dibujo completo y quieto |

Con "menos movimiento": el título ya firme, sin luz y sin entrada. CSS en `effects/paper.css`. Adornos nuevos compartidos: `iglesia`, `filigrana`, `damasco`, `piedra`, `camara`. Botón `fino` en `effects/buttons.css`. Ayudas puras en `services/stationeryService.ts` (nombres de la pareja, papás y padrinos, fecha impresa, romanos).

### Efectos de texto (`FxText`) y piezas del lacre

`components/ui/FxText.vue` va dentro de un título (hereda su letra) y pinta el efecto de texto de la sección (`services/textEffectService.ts` elige uno: `textEffect(effects, allow?)`; CSS en `effects/text.css`). El texto real siempre está: los efectos por letra llevan el texto completo en `.fxt__read` (solo lector de pantalla) y las letras `aria-hidden`; con "menos movimiento" FxText ni parte el texto. Arranca con la sección (`.fx-reveal-target.is-visible`, `SectionShell` los cuenta como `REVEALS_QUIET`) o con `active` (`data-play="wait|go"`, la portada). Solo transform y opacity, con `--motion-scale` (los retrasos por letra son `calc(var(--i) * var(--fxt-step) * var(--motion-scale))`; sin `steps()`, que con tiempos cortos deja letras en su primer cuadro).

| CSV (`efectos`) | Id | Técnica |
|---|---|---|
| `maquina_escribir` | `typewriter-title` | opacity escalonada por letra; el cursor es el `::after` de cada letra, visible solo mientras es la última escrita (parpadea al final) |
| `sello_estampado` | `stamp` | cada letra cae grande y girada y rebota a su lugar |
| `tinta_seca` | `ink-dry` | la letra aparece con una copia encima en el acento (`::before` con `attr(data-c)`) que se desvanece |
| `caligrafia` | `calligraphy` | ventana que avanza (`translateX(-101% → 0)`) con su contenido retrocediendo lo mismo: el texto se descubre de izquierda a derecha sin animar máscaras ni `clip-path` |
| `pan_de_oro` | `gold-leaf` | la misma técnica con una banda (35 % del ancho, orillas suaves por máscara fija) que cruza el texto con su copia en oro claro; en `WaxSeal`, una banda recortada a la orilla del lacre (`shine` o `.fx-gold-leaf`) |
| `letterpress` | `letterpress` | el título baja apenas y se asienta (scale + translate); solo CSS sobre `[data-text='title']`, sirve en cualquier sección |

Otras piezas: `WaxSeal` con `icon` (play/pausa hundidos) y `shine`; `useScrollLock(locked, { strict: true })` (además del overflow, impide `touchmove` y las teclas de desplazamiento; los candados se cuentan, así un visor cerrado no suelta el del sobre); el mini-reproductor como lacre borgoña en `themes/lacre/theme.css`; `capa` con velo cálido y letra marfil en el tema.
