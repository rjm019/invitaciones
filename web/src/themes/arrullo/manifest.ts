import type { ThemeManifest } from '../types'

/**
 * Tema "Arrullo · baby shower": acuarela suave de cuarto de bebé. La página es de un rubor
 * pálido; encima, los paneles se turnan entre papel crema, rubor, papel y salvia clara, con
 * letra café dorado. Caligrafía (Imperial Script) para el nombre y los títulos, Allura para
 * la manuscrita sencilla, Cormorant Infant para el texto y Nunito en los botones.
 *
 * Paleta, letras, paneles que se turnan y globos sueltos, con los detalles de toda la página
 * (estampado de rayas, orilla de holán, botón de lazo, esquinas de ramitas, papel de acuarela).
 * Efectos de cada sección: listones, globos, nubes, moño, burbujas, margaritas, móvil y gansito;
 * los diseños llegan en las etapas siguientes. Todo es global: cualquier tema puede usar los adornos de
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
  // Detalles de toda la página: holán fruncido, botón de lazo, esquinas de ramitas, papel de
  // acuarela y rayas de tela (el vichy se pide por sección en el CSV: `estampado`).
  edges: { default: 'ruffle' },
  buttons: 'bow',
  corners: 'sprigs',
  texture: 'watercolor',
  pattern: 'stripes',
  // Globos sueltos que cruzan la pantalla a destiempo.
  flights: [
    { file: 'globo.svg', size: '1.6rem', direction: 'ltr', duration: 30, delay: 6 },
    { file: 'globo.svg', size: '1.2rem', direction: 'rtl', duration: 38, delay: 20, flip: true },
    { file: 'globo.svg', size: '1.4rem', direction: 'ltr', duration: 46, delay: 33 },
  ],
  // Papel, rubor, papel y salvia clara se turnan; la letra de cada uno la ajusta theme.css.
  panels: [{ color: 'paper' }, { color: 'rubor' }, { color: 'paper' }, { color: 'salvia-clara' }],
  sections: {
    'hero-envelope': { panel: false, variant: 'lazo', effects: ['reveal', 'ribbon-curls', 'balloons'] },
    'music-player': { variant: 'movil', effects: ['clouds'] },
    blessing: { desktop: 'half', effects: ['reveal', 'bow-tie'] },
    story: { effects: ['reveal', 'bow-tie'] },
    'save-the-date': { desktop: 'half', effects: ['reveal', 'bubbles'] },
    location: { desktop: 'half', effects: ['reveal', 'daisies'] },
    countdown: { effects: ['reveal', 'crib-mobile'] },
    itinerary: { desktop: 'half', effects: ['timeline-fill', 'goose-walk'] },
    'dress-code': { desktop: 'half', effects: ['reveal'] },
    hotels: { effects: ['reveal', 'bow-tie'] },
    gallery: { desktop: 'half', effects: ['reveal'] },
    gifts: { desktop: 'half', effects: ['reveal'] },
    faq: { desktop: 'half', effects: ['reveal'] },
    trivia: { effects: ['reveal'] },
    rsvp: { desktop: 'half', effects: ['reveal'] },
    dedications: { effects: ['reveal'] },
    'guest-album': { effects: ['reveal', 'bow-tie'] },
    closing: { effects: ['reveal', 'ribbon-curls'] },
    quote: { desktop: 'half', effects: ['reveal'] },
    'photo-arch': { desktop: 'half', effects: ['reveal'] },
    'no-kids': { effects: ['reveal', 'bow-tie'] },
    weather: { effects: ['reveal', 'bow-tie'] },
    spotify: { effects: ['reveal', 'bow-tie'] },
    'envelope-rain': { effects: ['reveal', 'bow-tie'] },
    video: { effects: ['reveal', 'bow-tie'] },
    'social-post': { effects: ['reveal', 'bow-tie'] },
    layer: { panel: false },
  },
}

export default theme
