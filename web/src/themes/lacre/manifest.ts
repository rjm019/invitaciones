import type { ThemeManifest } from '../types'

/**
 * Tema "Lacre": papelería fina de boda. Un sobre olivo con forro de damasco y lacre dorado
 * con el monograma; adentro, una tarjeta marfil con las esquinas recortadas y un filete
 * borgoña. La página es de piedra beige y las secciones se turnan entre papel marfil (de
 * algodón, con su fibra), paneles de lino olivo, una banda borgoña (la cuenta regresiva) y
 * secciones que son solo tipografía sobre la piedra. Serif fina en mayúsculas espaciadas
 * para los nombres; caligrafía solo para el "&" y el monograma.
 *
 * La sobriedad manda: los adornos (filigrana, damasco, iglesia y hacienda de línea) van en
 * puntos elegidos, la silueta con muescas solo en tres piezas (la tarjeta de la portada, la
 * fecha y la tarjeta de respuesta) y cada sección lleva a lo más un efecto sutil.
 *
 * Todo es global: los diseños de sección (variants/), los adornos (_shared/assets), la
 * silueta, el filete, la textura, el relieve y los botones finos los puede pedir cualquier
 * tema. Este solo les pone valor.
 */
const theme: ThemeManifest = {
  id: 'lacre',
  label: 'Lacre',
  fonts: {
    script: { family: 'Pinyon Script' },
    'script-mono': { family: 'Cormorant Garamond', weights: [400, 500, 600] },
    serif: { family: 'Cormorant Garamond', weights: [400, 500, 600] },
    caps: { family: 'Cormorant Garamond', weights: [500, 600, 700] },
    display: { family: 'Forum' },
    button: { family: 'Cormorant Garamond', weights: [600, 700] },
    engraved: { family: 'Cormorant Garamond', weights: [400, 500] },
  },
  // La piedra beige: manchas suaves, quieta detrás de todo.
  page: { image: 'piedra.svg', color: 'bg' },
  // La banda borgoña llega a las orillas con corte recto.
  edges: { default: 'straight' },
  buttons: 'fine',
  texture: 'cotton',
  relief: true,
  // Sin rotación: cada sección dice su fondo (papel, lino olivo, banda o piedra).
  panels: [{ color: 'paper' }],
  sections: {
    'hero-envelope': {
      panel: false,
      variant: 'sobre-lacre',
      effects: ['typewriter-title', 'stamp', 'calligraphy'],
    },
    'music-player': { panel: false, variant: 'lacre', effects: ['reveal', 'gold-leaf'] },
    blessing: {
      variant: 'editorial',
      background: { color: 'paper' },
      effects: ['paper-in', 'ink-dry'],
      decor: { divider: 'filigrana.svg' },
    },
    story: { panel: false, variant: 'cronologia', effects: ['reveal'] },
    'save-the-date': {
      panel: false,
      desktop: 'half',
      variant: 'editorial',
      effects: ['paper-in', 'stamp'],
    },
    location: {
      desktop: 'half',
      variant: 'papeleria',
      background: { color: 'olivo' },
      effects: ['reveal', 'living-drawing'],
      decor: { estate: 'hacienda.svg', church: 'iglesia.svg' },
    },
    countdown: {
      variant: 'banda',
      background: { color: 'borgona' },
      effects: ['blend', 'reveal', 'typewriter-title'],
    },
    itinerary: { panel: false, desktop: 'half', variant: 'sello', effects: ['timeline-fill'] },
    'dress-code': {
      desktop: 'half',
      variant: 'editorial',
      background: { color: 'paper' },
      effects: ['reveal-tilt', 'ink-dry'],
    },
    hotels: {
      variant: 'papeleria',
      background: { color: 'olivo' },
      effects: ['cascade'],
    },
    gallery: { panel: false, variant: 'editorial', effects: ['reveal', 'calligraphy'] },
    gifts: { panel: false, desktop: 'half', variant: 'volteo', effects: ['paper-in'] },
    faq: {
      desktop: 'half',
      variant: 'editorial',
      background: { color: 'paper' },
      effects: ['reveal', 'letterpress'],
      decor: { divider: 'filigrana.svg' },
    },
    trivia: {
      variant: 'papeleria',
      background: { color: 'olivo' },
      effects: ['reveal-zoom', 'letterpress'],
    },
    rsvp: { panel: false, desktop: 'half', variant: 'tarjeta-rsvp', effects: ['paper-in', 'letterpress'] },
    dedications: {
      panel: false,
      desktop: 'half',
      variant: 'muro',
      effects: ['ink'],
      decor: { divider: 'filigrana.svg' },
    },
    'guest-album': { panel: false, variant: 'papeleria', effects: ['reveal', 'letterpress'] },
    closing: { panel: false, variant: 'lacre', effects: ['raking-light', 'gold-leaf'] },
    // Las que el tema no usa en su boda de ejemplo también se ven de papel.
    quote: { panel: false, effects: ['ink'], decor: { divider: 'filigrana.svg' } },
    'photo-arch': { background: { color: 'paper' }, effects: ['reveal'] },
    'no-kids': { background: { color: 'paper' }, effects: ['reveal'] },
    weather: { background: { color: 'paper' }, effects: ['reveal'] },
    spotify: { background: { color: 'paper' }, effects: ['reveal'] },
    'envelope-rain': { background: { color: 'paper' }, effects: ['reveal'] },
    video: { background: { color: 'paper' }, effects: ['reveal'] },
    'social-post': { background: { color: 'paper' }, effects: ['reveal'] },
    layer: { panel: false, effects: ['ink-dry'] },
  },
}

export default theme
