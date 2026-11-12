import type { ThemeManifest } from '../types'

/**
 * Tema "Arrullo · baby shower": acuarela suave de cuarto de bebé. La página es de un rubor
 * pálido; encima, los paneles se turnan entre papel crema, rubor, papel y salvia clara, con
 * letra café dorado. Caligrafía (Imperial Script) para el nombre y los títulos, Allura para
 * la manuscrita sencilla, Cormorant Infant para el texto y Nunito en los botones.
 *
 * Esta es la base: paleta, letras, paneles que se turnan y globos sueltos. Todo lo propio del
 * tema (estampado de rayas y vichy, orilla de holán, botón de lazo, esquinas de ramitas, papel
 * de acuarela, efectos y diseños de cada sección) llega en las etapas siguientes; mientras
 * tanto solo usa lo que ya existe. Todo es global: cualquier tema puede usar los adornos de
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
  // Detalles de toda la página (valores que ya existen; los propios llegan en la etapa 2).
  edges: { default: 'scallop' },
  buttons: 'solid',
  corners: 'none',
  texture: 'paper',
  // Globos sueltos que cruzan la pantalla a destiempo.
  flights: [
    { file: 'globo.svg', size: '1.6rem', direction: 'ltr', duration: 30, delay: 6 },
    { file: 'globo.svg', size: '1.2rem', direction: 'rtl', duration: 38, delay: 20, flip: true },
    { file: 'globo.svg', size: '1.4rem', direction: 'ltr', duration: 46, delay: 33 },
  ],
  // Papel, rubor, papel y salvia clara se turnan; la letra de cada uno la ajusta theme.css.
  panels: [{ color: 'paper' }, { color: 'rubor' }, { color: 'paper' }, { color: 'salvia-clara' }],
  sections: {
    'hero-envelope': { panel: false, effects: ['reveal'] },
    'music-player': { effects: [] },
    blessing: { desktop: 'half', effects: ['reveal'] },
    story: { effects: ['reveal'] },
    'save-the-date': { desktop: 'half', effects: ['reveal'] },
    location: { desktop: 'half', effects: ['reveal'] },
    countdown: { effects: ['reveal'] },
    itinerary: { desktop: 'half', effects: ['timeline-fill'] },
    'dress-code': { desktop: 'half', effects: ['reveal'] },
    hotels: { effects: ['reveal'] },
    gallery: { desktop: 'half', effects: ['reveal'] },
    gifts: { desktop: 'half', effects: ['reveal'] },
    faq: { desktop: 'half', effects: ['reveal'] },
    trivia: { effects: ['reveal'] },
    rsvp: { desktop: 'half', effects: ['reveal'] },
    dedications: { effects: ['reveal'] },
    'guest-album': { effects: ['reveal'] },
    closing: { effects: ['reveal'] },
    quote: { desktop: 'half', effects: ['reveal'] },
    'photo-arch': { desktop: 'half', effects: ['reveal'] },
    'no-kids': { effects: ['reveal'] },
    weather: { effects: ['reveal'] },
    spotify: { effects: ['reveal'] },
    'envelope-rain': { effects: ['reveal'] },
    video: { effects: ['reveal'] },
    'social-post': { effects: ['reveal'] },
    layer: { panel: false },
  },
}

export default theme
