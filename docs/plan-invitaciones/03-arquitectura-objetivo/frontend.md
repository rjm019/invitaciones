# Frontend — componentes, composables y temas

> **Actualizado el 14-oct-2026.** Las rutas y los composables de abajo son los que existen hoy. La sección 4 (manifiesto) y `evento.schema.json` todavía describen la forma original del `config`: la forma real está en `web/src/types/event.ts` y la arma `api/app/Services/Design/InvitationConfigBuilder.php` desde `invitacion.csv` (o, en el formato anterior, `EventConfigBuilder` desde el Excel). El gestor está en la sección 6.

## 1. Rutas

| Ruta | Página | Notas |
|---|---|---|
| `/i/:token` | `InvitationPage` | Invitación personal: un campo de nombre por invitado |
| `/e/:slug` | `EventPage` | Invitación general (sin pases; botón de WhatsApp o sin confirmación) |
| `/panel/:slug` | `PanelPage` | Panel del dueño; pide la `clave_panel` |
| `/gestor` | `ManagerPage` | Gestor: entrada con usuario y clave (la primera cuenta, con la clave maestra), invitaciones y plantillas (carga aparte) |
| `/gestor/:slug` | `ManagerEditorPage` | El editor de una invitación |
| `/gestor/vista-previa` | `ManagerPreviewPage` | La invitación dentro del editor (va en un iframe; `vista-previa` es un slug reservado) |
| `/legacy/boda` | `legacy/BodaLegacy.vue` | Solo en desarrollo: referencia para el tema `boda-salvia` |
| `/:pathMatch(.*)*` | `NotFoundPage` | — |

Las rutas viejas `/invitacion/:familyName/:maxGuests` caen en `NotFoundPage` con el mensaje "Este enlace cambió. Pide el nuevo a los anfitriones."

## 2. Servicios y composables

La lógica vive en `services/` (TS puro, sin Vue ni DOM global, con pruebas en Vitest). Los composables solo la envuelven y limpian todo en `onBeforeUnmount`.

| Servicio | Qué hace |
|---|---|
| `http` | axios con `VITE_API_URL + '/api'` y errores en español (`ApiError`) |
| `eventService` · `invitationService` | `GET` del evento y de la invitación; envío del RSVP |
| `rsvpService` | Lugares del formulario, validación de nombres nuevos, textos ("Pase para 3 invitados", "Asistiré / Asistiremos") |
| `dedicationService` | Limpieza y validación de la dedicatoria (nombre ≤ 80, mensaje ≤ 600) y errores 422 por campo |
| `bootService` · `preloadService` | Datos que el servidor ya puso en la página (`window.__BOOT__`, una sola vez); qué imágenes y fuentes esperar antes de mostrar la invitación |
| `scrollGuardService` | Regla para dejar la página quieta cuando algo ajeno la mueve (Spotify al cambiar de canción) |
| `panelService` | Llamadas del panel (con `getBrand` para la entrada), más filtros y conteos de invitaciones, invitados y mesas |
| `shareCardService` · `cardPdfService` | La invitación para WhatsApp (2:3): textos y dibujo en un lienzo sobre el fondo del evento (`brand.card.background`, con el sobre al centro; si no hay, el papel del tema y el lacre). Arriba "MIS XV AÑOS" y el nombre en letra fina (rol `engraved`). En el sobre, para quién es (un nombre largo en dos renglones, `addressLines`) y los pases; abajo, las frases opcionales, la fecha y el QR, sin el enlace escrito. El QR lo dibuja `drawQr` con los módulos de `qrcode` (corrección Q): puntos y esquinas redondeadas en el azul de la invitación, sobre un halo claro. Es el que leerá la recepción. Y el PDF de una página con un enlace oculto que la cubre toda (escrito a mano, sin librerías) |
| `themeService` · `sectionService` · `assetService` · `backgroundService` | Tema y paleta, mezcla de secciones (tema + Excel), fondos de los paneles que se turnan (`withPanels`), archivos de `media/`, estilos de fondo |
| `countdownService` · `calendarService` · `dateFormatService` | Cuenta regresiva con offset, mes del calendario y "Agregar a mi calendario", fechas en es-MX |
| `audioService` · `spotifyPlayerService` · `effectsService` | Reproductor compartido (`MusicPlayer` y `MiniPlayer`) con MP3 o con la playlist de Spotify (API oficial del reproductor), efectos por nombre |
| `spotifyService` · `weatherService` | Enlace de Spotify → reproductor (tema oscuro, español); clima del evento (textos, íconos, consejos, cuándo renovar) |
| `managerService` | Llamadas del gestor (`/api/manager`): sesión, primera cuenta, mi clave, personas, catálogo, eventos, diseño, borrador, publicar, historial, ajustes, media, descargar e importar |
| `managerAccountService` | Cuentas del gestor sin servidor: el usuario que se propone para una persona nueva, el mensaje con su acceso, sus iniciales y "Ana la publicó" |
| `designService` · `designHistoryService` | Operaciones inmutables sobre el diseño (campos, elementos, secciones: agregar, duplicar, mover, ocultar, quitar) y deshacer/rehacer (50 pasos; lo escrito seguido en un campo cuenta como uno) |
| `previewPatchService` | Diseño → lo que la vista previa muestra al instante (paleta, fuentes, colores y estilos de texto por sección, y los textos que pasan tal cual: títulos, subtítulos, textos y botones de cada sección; título, nombres y salón del evento), con el mismo mapeo que el servidor; y `needsServer`: si lo que falta guardar necesita al servidor para verse |
| `previewProtocol` · `previewService` | Mensajes entre el editor y su iframe (con su validación) y lo que la vista previa simula: aplicar el parche, invitación de ejemplo de 4 lugares, respuesta del RSVP y clima de ejemplo |
| `colorService` · `fontCatalog` · `imageResizeService` | Hex ↔ HSV, contraste WCAG, paletas sugeridas y "crear desde mi color"; letras sugeridas y combinaciones; reducir fotos en el navegador (2400 px, HEIC) |

| Composable | Qué hace |
|---|---|
| `useEvent` | `provide/inject` del evento |
| `useInvitation` | Carga, envío del RSVP y de la dedicatoria, con sus estados |
| `useAssetsReady` | true cuando cargaron el papel, la portada y las fuentes (máximo 5 s); hasta entonces `PageLoader` |
| `useSteadyScroll` | Deja la vista donde está cuando Spotify cambia de canción (solo escucha; el invitado manda) |
| `usePanel` | Sesión (en `sessionStorage`), marca (`brand`), lista, crear enlace, fecha límite, mesas y revisión de versión |
| `usePanelTheme` | Pone en el panel el tema, la paleta y las fuentes de su invitación; los quita al salir |
| `useShareCard` | Arma la imagen y el PDF (fuentes, imágenes del tema y QR con `qrcode`) y los manda: menú de compartir o descarga + WhatsApp |
| `usePolling` | Repite una tarea cada N ms solo con la pestaña visible; nunca se encima |
| `useMusic` | Estado reactivo del reproductor (MP3 o Spotify) y carga de la API de Spotify |
| `useWeather` | Pide el clima al acercarse a la sección y renueva el pronóstico cada 15 min |
| `useEmbedFocus` | Avisa cuando se toca un iframe (pausar el MP3 al tocar la playlist) |
| `useCountdown` · `useTimelineProgress` | Cuenta regresiva y línea del itinerario |
| `useInView` · `useParallax` · `useScrollLock` · `useReducedMotion` | Efectos y accesibilidad |
| `useClipboard` | Copiar con `navigator.clipboard` |
| `useManagerSession` | Sesión del gestor: quién entró y su token (en `localStorage`, 12 h), compartida por el inicio, el editor y las otras pestañas (evento `storage`); con clave temporal todavía no está "adentro" (`mustChangePassword`); con 401 sale con el aviso. Mis datos al día llegan con la lista de invitaciones (`setUser`) |
| `useManagerPeople` | Las personas del gestor, una lista para toda la página: "Datos generales" la pide una vez; "Personas del gestor" la refresca al abrirse y la deja al día con lo que agrega o cambia |
| `useDesignEditor` | El editor de una invitación: diseño con deshacer, autoguardado con dos ritmos (400 ms / 2 s si la vista previa necesita al servidor; 1 s / 5 s si ya lo muestra sola; al ocultar la pestaña, ya; una petición a la vez), 409, publicar (sin volver a pedir el diseño), descartar, restaurar, importar. El catálogo se pide una vez por página |
| `useEditorContext` | `provide/inject` de lo que comparten los paneles del editor (diseño, catálogo, config, marca, selección, biblioteca) |
| `usePreviewHost` · `usePreview` | El editor del lado de su iframe (manda config, parche y selección; escucha toques); la invitación sabe que está en vista previa (sobre abierto, sin sonido) |
| `useMediaLibrary` · `useDragSort` · `useToasts` · `useFontSamples` | Biblioteca con subidas y avance; reordenar con arrastre o Alt + flechas; avisos; muestras de letras de Google Fonts |

## 3. Contrato de cada sección

**Velocidad de los efectos:** `--motion-scale` (tokens) multiplica todas las duraciones y retrasos. En CSS: `calc(0.8s * var(--motion-scale))`; en estilos en línea: `motionTime(segundos)` (`effectsService`); en temporizadores: `ms * motionScale()` (`composables/useMotionScale`).

**Carga:** la invitación no se muestra a medias. `InvitationRenderer` monta solo la portada mientras `useAssetsReady` espera sus imágenes y las fuentes, con `PageLoader` encima. Luego aparece completa y el resto de las secciones se monta en el cuadro siguiente. Secciones, íconos y las páginas de evento e invitación van en el archivo principal; solo el panel se carga aparte.

**Paneles:** `SectionShell` pinta cada sección como panel (fondo, `--panel-radius`, `--panel-shadow`, `--panel-border`); entre panel y panel va `--section-gap` (16 px en celular, 24 px en escritorio). Una sección con `panel: false` en el manifiesto (la portada) va sin panel y sin relleno vertical. Las que no traen fondo toman el siguiente de `manifest.panels`. Con `panelColor` en el manifiesto (el itinerario de `jardin-azul` usa `panel-pearl`), la sección gasta su turno pero se pinta de su color, así las demás no se recorren. El color de un panel puede ser un degradado: `SectionShell` lo pinta con `background`.

Cada componente en `components/sections/`:

- **Recibe solo props** con su porción del config (por ejemplo, `Itinerary` recibe `items: ItineraryItem[]`) y `variant?: string`.
- **No usa colores ni fuentes fijos:** solo `var(--…)`.
- **Expone slots de decoración** (`#decor-top`, `#decor-bottom`) para que el tema inyecte flores, lazos o marcos.
- **Tiene `id`** para anclas (`#rsvp`, `#ubicacion`…).
- **Respeta `prefers-reduced-motion`.**

`InvitationPage` recorre `config.sections` y por cada clave hace:

```vue
<component :is="sectionRegistry[key]" v-bind="propsFor(key)" :variant="theme.variants[key]">
  <template #decor-top><ThemeDecor :section="key" position="top" /></template>
</component>
```

## 4. Temas

Cada tema vive en `src/themes/<id>/`:

```
theme.css        # :root[data-theme="<id>"] { …tokens… } + overrides por sección
manifest.ts      # fuentes, variantes, decoraciones por sección, iconos personalizados
assets/          # WebP/PNG/SVG optimizados (solo decorativos; nunca fotos de personas)
```

### Tokens obligatorios

| Token | jardin-azul (NAT) | new-york-noir (NY) | boda-salvia (repo actual) |
|---|---|---|---|
| `--color-bg` | `#F3F1EC` + textura papel | `#000000` | `#E3ECDE` |
| `--color-text` | `#523C0B` | `#E6E6E6` | `#476D68` |
| `--color-primary` | `#96792C` (oro) | `#C0C0C0` (plata) | `#B19292` (rosa viejo) |
| `--color-primary-strong` | `#C0902C` | `#FFFFFF` | `#3B5958` |
| `--color-accent` | `#8CC0E8` (azul) | `#808080` (gris) | `#B76E79` |
| `--color-surface` | `#F6F6F6` | `#111111` | `#FFFFFF` |
| `--color-frame` | `#ABC1D9` | `#2A2A2A` | `#B19292` |
| `--font-script` | Pinyon Script | Playfair Display Italic | Dancing Script |
| `--font-script-mono` | Sacramento | Playfair Display | Dancing Script |
| `--font-serif` | EB Garamond | Playfair Display | Times New Roman → EB Garamond |
| `--font-display` | Marcellus | Archivo Black (o similar a "Heading Now") | Playfair Display |
| `--texture-bg` | `url(./assets/papel.webp)` | `none` | `none` |
| Filtro de imágenes | — | `grayscale(1)` | — |

### Manifiesto (ejemplo, `jardin-azul`)

```ts
export default {
  id: 'jardin-azul',
  fonts: ['Pinyon Script', 'Sacramento', 'EB Garamond:400,600', 'Marcellus', 'Playfair Display:400'],
  defaultSections: ['hero-envelope','music-player','blessing','save-the-date','photo-arch','location','quote','itinerary','dress-code','countdown','rsvp','closing'],
  variants: { hero: 'envelope', musicPlayer: 'gold-controls', itinerary: 'zigzag-center-line', calendar: 'grid-gold' },
  decor: {
    hero:      { envelope: 'sobre.webp', card: 'tarjeta.webp', flowers: 'rosas-azules.webp', butterflies: 'mariposas.webp', crown: 'corona.svg' },
    blessing:  { background: 'toile.webp', frame: 'arco-lino.webp', bow: 'lazo.webp', divider: 'divisor-oro.svg' },
    saveTheDate: { glitter: 'brillo-oro.webp', heart: 'corazon.svg' },
    photoArch: { frame: 'arco-oro.webp', sparkles: 'destellos.svg', butterflies: 'mariposas-oro.webp' },
    quote:     { divider: 'laurel.webp' },
    itinerary: { frame: 'marco-azul.webp' },
    dressCode: { seal: 'lacre.webp', card: 'tarjeta.webp', figures: ['mujer.webp','hombre.webp'] },
    countdown: { divider: 'corona-divisor.svg' },
    rsvp:      { card: 'ovalo-lino.webp', flowers: 'rosas-azules.webp' }
  },
  icons: { crown: 'corona.svg', disco: 'bola-disco.webp', 'champagne-glasses': 'copas.webp' }, // fallback: Font Awesome
  motion: { floatingDecor: true, envelopeIntro: true, reveal: true }
}
```

## 5. Rendimiento (presupuesto)

| Métrica | Objetivo |
|---|---|
| JS inicial (gzip) | < 120 KB (temas y admin con carga diferida) |
| LCP en móvil 4G | < 2.5 s |
| Imágenes | WebP/AVIF, `srcset` 1x/2x, `loading="lazy"` desde la sección 3 |
| Fuentes | Google Fonts con `display=swap` y solo los pesos usados, o fuentes propias con `preload` |
| Audio | ≤ 3 MB (ideal ≈2 MB a 96 kbps), `preload="none"`; se carga al abrir el sobre |

## 6. Gestor (`/gestor`)

Va en su propio pedazo del build (rutas perezosas): la invitación pública no carga nada del gestor. Los estilos del gestor usan sus propios tokens (`--g-*`, `components/manager/manager.css`), independientes del tema de la invitación.

**Una sola fuente de la `config`:** la arma el servidor (`InvitationConfigBuilder`), para la invitación y para la vista previa. No hay un segundo builder en TypeScript. Para que se sienta en vivo, la vista previa combina dos caminos:

1. **Al instante:** paleta, colores por sección, color y tamaño de cada texto, y los textos que pasan tal cual (títulos, subtítulos, textos y botones de cada sección; título, nombres y salón del evento). El editor calcula un parche (`previewPatchService`, con el mismo mapeo español → contrato que el servidor, incluido el `trim` de PHP) y el iframe lo aplica encima de la config que tiene, una vez por cuadro.
2. **En ~0.5 s:** todo lo demás, incluidas las letras (hay que cargarlas). El autoguardado manda el borrador y el servidor responde la config en modo tolerante (`{config, issues}`), aunque haya errores.

**Autoguardado con dos ritmos** (`useDesignEditor`): si lo que falta guardar necesita al servidor para verse (listas, imágenes, secciones, fechas, música…), se guarda 400 ms después de la última tecla (2 s como máximo escribiendo sin parar); si la vista previa ya lo muestra sola (`needsServer` = no), con calma: 1 s después (5 s como máximo). Al ocultar la pestaña se guarda en ese momento; publicar, salir y ⌘S guardan antes, como siempre. El catálogo se pide una vez por página, la lista de personas una vez (`useManagerPeople`) y publicar responde con el editor ya al día.

**Mensajes con el iframe** (`previewProtocol.ts`, canal `invitaciones-vista-previa`; cada lado revisa el origen y la ventana):

- Editor → vista previa: `config` (con la vista: sobre abierto o cerrado, invitado general o de ejemplo, sonido, elegir o probar, etiquetas), `display`, `patch`, `select` y `replay`.
- Vista previa → editor: `ready`, `rendered` (qué secciones sí se pintaron, para la pista "no se ve"), `hover`, `pick` (`{key, block}`: la sección y el texto tocados, por `data-section-key` y `data-text`) y `tokens` (colores y letras ya calculados, para el selector de color y la tarjeta para WhatsApp).

**Cuentas:** `ManagerLogin` decide qué mostrar: gestor apagado, "Crea la primera cuenta" (con la clave maestra), entrar con usuario y clave, o "Elige tu clave" si se entró con una temporal. En el inicio, `AccountMenu` (cambiar mi clave con `PasswordDialog`, y si administra, `PeopleDialog`: agregar con clave temporal y el mensaje listo para mandar, rol, clave temporal nueva, quitar o devolver el acceso). El historial y las tarjetas dicen quién publicó. En "Datos generales", "Quién la edita": quien administra marca a las personas que la ven; quien edita ve quiénes la editan (quien edita solo recibe sus invitaciones y las plantillas).

**El sobre en la vista previa:** en el gestor ("Ver como invitado") `HeroEnvelopeSection` lo muestra cerrado aunque la persona tenga "reducir movimiento", y lo abre sin animación; a un invitado con esa opción le sigue llegando abierto.

**Componentes** (`components/manager/`): `EditorTopBar`, `SectionList`, `PreviewFrame`, `SectionInspector` (con `FieldInput`, `ItemListEditor`, `SectionDesign` y `TextStyleControl`), `StylePanel` (con `ColorField`/`ColorPicker` y `FontPicker`), `GeneralPanel` (con `SharePreview`), y los diálogos `AddSectionDialog`, `MediaLibraryDialog`, `PublishDialog`, `HistoryDialog`, `TransferDialog`, `ConflictDialog`, `NewEventDialog`. Base: `GDialog`, `GPopover`, `ToastHost`, `ManagerIcon`.

**Pantallas:** tres columnas en escritorio (secciones · vista previa · inspector); de 768 a 1199 px las secciones van en un cajón; en celular, pestañas abajo (Secciones · Editar · Ver).

### Cómo agregar un tipo de sección

1. **Catálogo (API):** una entrada en `Catalog::SECTIONS` (`api/app/Services/Design/Catalog.php`): nombre en el CSV, `type` del contrato, etiqueta, ícono, descripción, campos propios, lista (si tiene elementos), `linked` (campos de `evento` que se editan ahí), adornos (`slots`), bloques de texto propios (`texts`), si se repite y `hidden_without` (la pista cuando no se ve). Los campos comunes (textos, fondo, efectos, colores, estilos de texto) vienen solos. El gestor arma su inspector y su lugar en "Agregar" con esto.
2. **Datos (API):** solo si la sección tiene lista o datos propios, agrégalos en `InvitationConfigBuilder` (como `family`, `itinerary` u `hotels`), con su validación y sus `issues`.
3. **Componente (web):** `components/sections/<Nombre>Section.vue`, con sus datos por props y solo tokens del tema. Cada texto lleva `data-text="<bloque>"` y sus reglas usan `var(--t-<bloque>-font, …)`, `var(--t-<bloque>-color, …)` y `calc(… * var(--t-<bloque>-size, 1))`, con el valor del tema como respaldo. Una línea en `sectionRegistry.ts`.
4. **Tema:** lo que trae por defecto en el manifiesto (`sections['<type>']`: variante, adornos, efectos, panel) y su CSS.
5. **Pruebas:** `CatalogTest` (cada adorno y bloque existe), el builder y la sección en el gestor (agregarla, tocar sus textos, ocultarla).
