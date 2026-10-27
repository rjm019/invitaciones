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
 * perlas…): el tema solo les pone valor. Los colores salen de la paleta.
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
      effects: ['float'],
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
    'music-player': { effects: ['reveal'] },
    blessing: { effects: ['reveal', 'veil'], decor: { divider: 'perlas.svg' } },
    'save-the-date': { desktop: 'half', variant: 'calendario', effects: ['reveal'] },
    'photo-arch': {
      desktop: 'half',
      variant: 'camafeo',
      effects: ['reveal'],
      decor: { lace: 'encaje.svg' },
    },
    location: {
      desktop: 'half',
      background: { color: 'paper' },
      variant: 'grabado',
      effects: ['reveal'],
      decor: { estate: 'hacienda.svg' },
    },
    quote: { desktop: 'half', effects: ['reveal'], decor: { divider: 'perlas.svg' } },
    itinerary: {
      desktop: 'half',
      variant: 'grabado',
      effects: ['reveal', 'timeline-fill', 'cascade'],
      decor: { divider: 'perlas.svg' },
    },
    'dress-code': {
      desktop: 'half',
      background: { color: 'paper' },
      variant: 'muestrario',
      effects: ['reveal', 'cascade'],
    },
    countdown: {
      desktop: 'half',
      variant: 'corazon',
      effects: ['reveal', 'cascade'],
      decor: { lace: 'encaje.svg' },
    },
    'no-kids': { effects: ['reveal'] },
    'envelope-rain': { effects: ['reveal'] },
    gallery: { variant: 'bastidor', effects: ['reveal', 'cascade'] },
    hotels: { effects: ['reveal', 'cascade'], decor: { divider: 'perlas.svg' } },
    weather: { desktop: 'half', effects: ['reveal'] },
    spotify: { desktop: 'half', effects: ['reveal'] },
    gifts: {
      variant: 'etiqueta',
      effects: ['reveal', 'cascade'],
      decor: { divider: 'perlas.svg' },
    },
    rsvp: { desktop: 'half', effects: ['reveal'] },
    closing: {
      variant: 'bordado',
      effects: ['reveal', 'veil'],
      decor: { cloth: 'tela-pie.svg', lily: 'alcatraz.svg' },
    },
    trivia: { variant: 'tarjetas', effects: ['reveal'], decor: { divider: 'perlas.svg' } },
    video: { variant: 'encaje', effects: ['reveal'], decor: { divider: 'perlas.svg' } },
    'social-post': { variant: 'encaje', effects: ['reveal'], decor: { divider: 'perlas.svg' } },
    dedications: { effects: ['reveal'], decor: { divider: 'perlas.svg' } },
  },
}

export default theme
