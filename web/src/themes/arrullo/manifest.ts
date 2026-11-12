import type { ThemeManifest } from '../types'

/**
 * Tema "Arrullo · baby shower": acuarela suave de cuarto de bebé. La página es de un rubor
 * pálido con rayas; encima, todas las secciones son el mismo panel de papel crema (con vichy
 * rosa arriba y la guirnalda de moño), con letra café dorado. Caligrafía (Imperial Script) para el nombre y los títulos, Allura para
 * la manuscrita sencilla, Cormorant Infant para el texto y Nunito en los botones.
 *
 * Paleta, letras, panel único y globos sueltos, con los detalles de toda la página
 * (estampado de rayas, orilla de holán, botón de lazo, papel de acuarela).
 * Efectos de cada sección: listones, globos, nubes, moño, burbujas, margaritas, móvil y gansito,
 * y cosas de bebé a los costados (`baby-icons`) o en hilera al pie (`baby-strip`);
 * los diseños (portada, música, bendición, frase, fecha, cuenta regresiva, foto, galería, ubicación e itinerario) ya están; el resto llega en las etapas siguientes. Todo es global: cualquier tema puede usar los adornos de
 * `_shared/assets` (moño, carriola, gansito, globo, margarita, ramita, nube, luna, cubo,
 * caja de regalo, pinza y ropita).
 */
const theme: ThemeManifest = {
  id: 'arrullo',
  label: 'Arrullo · baby shower',
  fonts: {
    script: { family: 'Imperial Script' },
    'script-mono': { family: 'Allura' },
    serif: { family: 'Cormorant Infant', weights: [400, 500, 600] },
    caps: { family: 'Cormorant Infant', weights: [500, 600, 700] },
    display: { family: 'Imperial Script' },
    button: { family: 'Nunito', weights: [400, 600, 700] },
    engraved: { family: 'Cormorant Infant', weights: [500, 600, 700] },
  },
  page: { color: 'bg' },
  // Detalles de toda la página: holán fruncido, botón de lazo, papel de
  // acuarela y rayas de tela (el vichy se pide por sección en el CSV: `estampado`).
  edges: { default: 'ruffle' },
  buttons: 'bow',
  corners: 'none',
  texture: 'watercolor',
  pattern: 'stripes',
  // Globos sueltos que cruzan la pantalla a destiempo.
  flights: [
    { file: 'globo.svg', size: '1.6rem', direction: 'ltr', duration: 30, delay: 6 },
    { file: 'globo.svg', size: '1.2rem', direction: 'rtl', duration: 38, delay: 20, flip: true },
    { file: 'globo.svg', size: '1.4rem', direction: 'ltr', duration: 46, delay: 33 },
  ],
  // Un solo panel de papel crema para todas las secciones (las rayas quedan detrás, en la página)
  // y el mismo remate arriba: vichy rosa que se desvanece y la guirnalda de moño.
  panels: [{ color: 'paper' }],
  sectionPattern: 'gingham-top',
  // Cada sección: su entrada (se alternan), el título que se traza (caligrafía donde el diseño
  // usa FxText; si no, tinta), la guirnalda que siempre se mece, un ambiente distinto al de sus
  // vecinas y el brillo de los botones.
  sections: {
    'hero-envelope': { panel: false, variant: 'lazo', effects: ['reveal', 'ribbon-curls', 'balloons', 'shine'] },
    'music-player': {
      variant: 'movil',
      effects: ['reveal-zoom', 'calligraphy', 'clouds', 'baby-strip', 'garland', 'shine'],
    },
    blessing: {
      desktop: 'half',
      variant: 'medallon',
      effects: ['reveal-slide', 'calligraphy', 'stork-flight', 'garland', 'shine'],
    },
    story: { effects: ['reveal-tilt', 'ink', 'baby-icons', 'garland', 'shine'] },
    'save-the-date': {
      desktop: 'half',
      variant: 'globos',
      effects: ['cascade', 'ink', 'sparkle', 'garland', 'shine'],
    },
    location: {
      desktop: 'half',
      variant: 'caminito',
      effects: ['reveal-tilt', 'ink', 'daisies', 'garland', 'shine'],
    },
    countdown: {
      variant: 'cubos',
      effects: ['reveal-zoom', 'ink', 'garland', 'shine'],
    },
    itinerary: {
      desktop: 'half',
      variant: 'ropita',
      effects: ['cascade', 'timeline-fill', 'ink', 'goose-walk', 'garland', 'shine'],
    },
    'dress-code': {
      desktop: 'half',
      variant: 'lazos',
      effects: ['reveal-slide', 'ink', 'ribbon-curls', 'baby-icons', 'garland', 'shine'],
    },
    hotels: { effects: ['reveal-zoom', 'ink', 'baby-icons', 'garland', 'shine'] },
    gallery: {
      desktop: 'half',
      variant: 'medallones',
      effects: ['reveal-zoom', 'ink', 'sparkle', 'garland', 'shine'],
    },
    gifts: {
      desktop: 'half',
      variant: 'cajas',
      effects: ['reveal-tilt', 'ink', 'stork-flight', 'baby-strip', 'garland', 'shine'],
    },
    faq: { desktop: 'half', effects: ['reveal-slide', 'ink', 'baby-icons', 'garland', 'shine'] },
    trivia: { variant: 'juego', effects: ['reveal-slide', 'ink', 'goose-walk', 'garland', 'shine'] },
    rsvp: {
      desktop: 'half',
      variant: 'vichy',
      effects: ['cascade', 'ink', 'baby-strip', 'garland', 'shine'],
    },
    dedications: {
      variant: 'deseos',
      effects: ['reveal-zoom', 'ink', 'bubbles', 'baby-icons', 'garland', 'shine'],
    },
    'guest-album': { effects: ['reveal-tilt', 'ink', 'baby-icons', 'garland', 'shine'] },
    closing: {
      variant: 'paseo',
      effects: ['reveal-tilt', 'ink', 'stork-flight', 'ribbon-curls', 'garland', 'shine'],
    },
    quote: {
      desktop: 'half',
      variant: 'nube',
      effects: ['reveal-tilt', 'ink', 'sparkle', 'clouds', 'baby-icons', 'garland', 'shine'],
    },
    'photo-arch': {
      desktop: 'half',
      variant: 'retrato',
      effects: ['reveal-slide', 'ink', 'bubbles', 'garland', 'shine'],
    },
    'no-kids': { effects: ['reveal-zoom', 'ink', 'baby-icons', 'garland', 'shine'] },
    weather: { effects: ['reveal-slide', 'ink', 'baby-icons', 'garland', 'shine'] },
    spotify: { effects: ['reveal-tilt', 'ink', 'baby-icons', 'garland', 'shine'] },
    'envelope-rain': { effects: ['reveal-zoom', 'ink', 'baby-icons', 'garland', 'shine'] },
    video: { effects: ['reveal-slide', 'ink', 'baby-icons', 'garland', 'shine'] },
    'social-post': { effects: ['reveal-tilt', 'ink', 'baby-icons', 'garland', 'shine'] },
    layer: { panel: false },
  },
}

export default theme
