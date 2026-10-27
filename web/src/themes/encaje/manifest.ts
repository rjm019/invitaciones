import type { ThemeManifest } from '../types'

/**
 * Tema "Encaje": una boda en salvia y marfil, de papelería de lujo y telas. Paneles de
 * terciopelo oliva con brillo en las crestas, franjas de papel marfil con la orilla de
 * encaje, esquinas de encaje, botones de listón de satén y títulos en letra de pluma con
 * floreo. La portada es un telón de terciopelo que se abre y descubre un paisaje pintado
 * (la ranura "paisaje" lo cambia por una pintura real); la variante `encaje` de la portada
 * es el sobre marfil con solapa de encaje, una perla y el lacre oliva (diseño alterno).
 *
 * Todas las piezas son opciones globales (textura, orilla, esquinas, botones, cortinaje,
 * perlas…): el tema solo les pone valor. Los colores salen de la paleta. Los efectos de tela y
 * encaje (foco, perlas, pétalos, tul, encaje que gira o se dibuja…) son opciones globales de
 * cada sección (components/ui/FabricAmbience.vue y effects/fabric.css). El sobre central
 * (variante `sobre-central` de la portada) queda como diseño alterno.
 */
const theme: ThemeManifest = {
  id: 'encaje',
  label: 'Encaje',
  dark: true,
  fonts: {
    script: { family: 'Pinyon Script' },
    'script-mono': { family: 'Cormorant Garamond', weights: [400, 500, 600] },
    serif: { family: 'Cormorant Garamond', weights: [400, 500, 600] },
    caps: { family: 'Cormorant Garamond', weights: [500, 600] },
    display: { family: 'Pinyon Script' },
    button: { family: 'Cormorant Garamond', weights: [600, 700] },
    engraved: { family: 'Cormorant Garamond', weights: [400, 500] },
  },
  page: { color: 'bg' },
  edges: { default: 'lace', paper: 'lace' },
  buttons: 'ribbon',
  corners: 'lace',
  texture: 'velvet',
  panels: [{ color: 'panel' }, { color: 'panel-alt' }, { color: 'panel-warm' }],
  sections: {
    layer: { panel: false },
    // El telón de terciopelo; el sobre de encaje queda como diseño alterno (variante "encaje").
    'hero-envelope': {
      panel: false,
      variant: 'telon',
      effects: ['float', 'light-dust'],
      decor: {
        envelope: 'sobre.svg',
        card: 'tarjeta.svg',
        seal: 'lacre.svg',
        landscape: 'paisaje.svg',
        valance: 'cortinaje.svg',
        folds: 'pliegues.svg',
        cloth: 'tela-pie.svg',
        lily: 'alcatraz.svg',
      },
    },
    'music-player': { effects: ['reveal', 'spotlight-travel'] },
    blessing: { effects: ['reveal', 'veil', 'stitch-in', 'lace-spin'], decor: { divider: 'perlas.svg' } },
    'save-the-date': { desktop: 'half', variant: 'calendario', effects: ['reveal', 'pearl-glint', 'stitch-in'] },
    'photo-arch': {
      desktop: 'half',
      variant: 'camafeo',
      effects: ['reveal', 'lace-wave', 'breathe'],
      decor: { lace: 'encaje.svg' },
    },
    location: {
      desktop: 'half',
      background: { color: 'paper' },
      variant: 'grabado',
      effects: ['reveal', 'lace-draw'],
      decor: { estate: 'hacienda.svg' },
    },
    quote: { desktop: 'half', effects: ['reveal', 'spotlight', 'stitch-in'], decor: { divider: 'perlas.svg' } },
    itinerary: {
      desktop: 'half',
      variant: 'grabado',
      effects: ['reveal', 'timeline-fill', 'cascade', 'satin-sweep'],
      decor: { divider: 'perlas.svg' },
    },
    'dress-code': {
      desktop: 'half',
      background: { color: 'paper' },
      variant: 'muestrario',
      effects: ['reveal', 'cascade', 'lace-wave'],
    },
    countdown: {
      desktop: 'half',
      variant: 'corazon',
      effects: ['reveal', 'cascade', 'pearl-strands'],
      decor: { lace: 'encaje.svg' },
    },
    'no-kids': { effects: ['reveal', 'light-dust'] },
    'envelope-rain': { effects: ['reveal', 'petals'] },
    gallery: { variant: 'bastidor', effects: ['reveal', 'cascade', 'spotlight-travel'] },
    hotels: { effects: ['reveal', 'cascade', 'drape-sway'], decor: { divider: 'perlas.svg' } },
    weather: { desktop: 'half', effects: ['reveal', 'tulle-breathe'] },
    spotify: { desktop: 'half', effects: ['reveal', 'spotlight'] },
    gifts: {
      variant: 'etiqueta',
      effects: ['reveal', 'cascade', 'pearl-glint'],
      decor: { divider: 'perlas.svg' },
    },
    rsvp: { desktop: 'half', effects: ['reveal', 'breathe', 'petals'] },
    closing: {
      variant: 'bordado',
      effects: ['reveal', 'veil', 'petals', 'light-dust'],
      decor: { cloth: 'tela-pie.svg', lily: 'alcatraz.svg' },
    },
    trivia: { variant: 'tarjetas', effects: ['reveal', 'lace-wave'], decor: { divider: 'perlas.svg' } },
    video: { variant: 'encaje', effects: ['reveal', 'spotlight'], decor: { divider: 'perlas.svg' } },
    'social-post': { variant: 'encaje', effects: ['reveal', 'breathe'], decor: { divider: 'perlas.svg' } },
    dedications: { effects: ['reveal', 'stitch-in', 'light-dust'], decor: { divider: 'perlas.svg' } },
  },
}

export default theme
