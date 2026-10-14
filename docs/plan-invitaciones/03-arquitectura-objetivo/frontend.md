# Frontend — componentes, composables y temas

> **Actualizado el 13-oct-2026.** Las rutas y los composables de abajo son los que existen hoy. La sección 4 (manifiesto) y `evento.schema.json` todavía describen la forma original del `config`: la forma real está en `web/src/types/event.ts` y la arma `api/app/Services/Layout/EventConfigBuilder.php` desde el Excel.

## 1. Rutas

| Ruta | Página | Notas |
|---|---|---|
| `/i/:token` | `InvitationPage` | Invitación personal: un campo de nombre por invitado |
| `/e/:slug` | `EventPage` | Invitación general (sin pases; botón de WhatsApp o sin confirmación) |
| `/panel/:slug` | `PanelPage` | Panel del dueño; pide la `clave_panel` del Excel |
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
| `panelService` | Llamadas del panel, más filtros y conteos de invitaciones, invitados y mesas |
| `themeService` · `sectionService` · `assetService` · `backgroundService` | Tema y paleta, mezcla de secciones (tema + Excel), fondos de los paneles que se turnan (`withPanels`), archivos de `media/`, estilos de fondo |
| `countdownService` · `calendarService` · `dateFormatService` | Cuenta regresiva con offset, mes del calendario y "Agregar a mi calendario", fechas en es-MX |
| `audioService` · `spotifyPlayerService` · `effectsService` | Reproductor compartido (`MusicPlayer` y `MiniPlayer`) con MP3 o con la playlist de Spotify (API oficial del reproductor), efectos por nombre |
| `spotifyService` · `weatherService` | Enlace de Spotify → reproductor (tema oscuro, español); clima del evento (textos, íconos, consejos, cuándo renovar) |

| Composable | Qué hace |
|---|---|
| `useEvent` | `provide/inject` del evento |
| `useInvitation` | Carga, envío del RSVP y de la dedicatoria, con sus estados |
| `useAssetsReady` | true cuando cargaron el papel, la portada y las fuentes (máximo 5 s); hasta entonces `PageLoader` |
| `useSteadyScroll` | Deja la vista donde está cuando Spotify cambia de canción (solo escucha; el invitado manda) |
| `usePanel` | Sesión (en `sessionStorage`), lista, crear enlace, fecha límite, mesas y revisión de versión |
| `usePolling` | Repite una tarea cada N ms solo con la pestaña visible; nunca se encima |
| `useMusic` | Estado reactivo del reproductor (MP3 o Spotify) y carga de la API de Spotify |
| `useWeather` | Pide el clima al acercarse a la sección y renueva el pronóstico cada 15 min |
| `useEmbedFocus` | Avisa cuando se toca un iframe (pausar el MP3 al tocar la playlist) |
| `useCountdown` · `useTimelineProgress` | Cuenta regresiva y línea del itinerario |
| `useInView` · `useParallax` · `useScrollLock` · `useReducedMotion` | Efectos y accesibilidad |
| `useClipboard` | Copiar con `navigator.clipboard` |

## 3. Contrato de cada sección

**Velocidad de los efectos:** `--motion-scale` (tokens) multiplica todas las duraciones y retrasos. En CSS: `calc(0.8s * var(--motion-scale))`; en estilos en línea: `motionTime(segundos)` (`effectsService`); en temporizadores: `ms * motionScale()` (`composables/useMotionScale`).

**Carga:** la invitación no se muestra a medias. `InvitationRenderer` monta solo la portada mientras `useAssetsReady` espera sus imágenes y las fuentes, con `PageLoader` encima. Luego aparece completa y el resto de las secciones se monta en el cuadro siguiente. Secciones, íconos y las páginas de evento e invitación van en el archivo principal; solo el panel se carga aparte.

**Paneles:** `SectionShell` pinta cada sección como panel (fondo, `--panel-radius`, `--panel-shadow`, `--panel-border`); entre panel y panel va `--section-gap` (16 px en celular, 24 px en escritorio). Una sección con `panel: false` en el manifiesto (la portada) va sin panel y sin relleno vertical. Las que no traen fondo toman el siguiente de `manifest.panels`.

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

| Token | jardin-azul (NATASHA) | new-york-noir (NY) | boda-salvia (repo actual) |
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
