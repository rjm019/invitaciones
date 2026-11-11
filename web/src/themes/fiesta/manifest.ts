import type { ThemeManifest } from '../types'

/**
 * Tema "Fiesta mexicana": boda colorida de arte popular. La página es de un rosa mexicano
 * terroso; encima, los paneles se turnan entre papel crema, rosa, cobalto de talavera y verde
 * nopal, con letra tinta sobre el crema y crema sobre los demás. Letras de cartel (Yeseva
 * One y Fraunces) y caligrafía (Sacramento) solo para firmas y el "&".
 *
 * Esta es la base: paleta, letras, paneles que se turnan, monarcas en vuelo y confeti.
 * Los diseños propios de cada sección, las orillas, los botones y los efectos llegan en
 * las etapas siguientes. Todo es global: cualquier tema puede usar los adornos de
 * `_shared/assets` (papel picado, azulejos, gerbera, mariachis, sarape, piñata…).
 */
const theme: ThemeManifest = {
  id: 'fiesta',
  label: 'Fiesta mexicana',
  fonts: {
    script: { family: 'Sacramento' },
    'script-mono': { family: 'Fraunces', weights: [400, 500, 600] },
    serif: { family: 'Fraunces', weights: [400, 500, 600] },
    caps: { family: 'Josefin Sans', weights: [400, 600, 700] },
    display: { family: 'Yeseva One' },
    button: { family: 'Josefin Sans', weights: [400, 600, 700] },
    engraved: { family: 'Josefin Sans', weights: [400, 600, 700] },
  },
  page: { color: 'bg' },
  // Monarcas que cruzan la pantalla a destiempo.
  flights: [
    { file: 'monarca.svg', size: '2rem', direction: 'ltr', duration: 28, delay: 5 },
    { file: 'monarca.svg', size: '1.5rem', direction: 'rtl', duration: 36, delay: 19, flip: true },
  ],
  confetti: { count: 14 },
  // Crema, rosa, cobalto y nopal se turnan; la letra de cada uno la ajusta theme.css.
  panels: [{ color: 'paper' }, { color: 'rosa' }, { color: 'talavera' }, { color: 'nopal' }],
  sections: {
    'hero-envelope': { panel: false, effects: ['reveal'] },
    'music-player': { effects: ['reveal'] },
    blessing: { effects: ['reveal'] },
    story: { effects: ['reveal'] },
    'save-the-date': { desktop: 'half', effects: ['reveal'] },
    location: { desktop: 'half', effects: ['reveal'] },
    countdown: { effects: ['reveal', 'cascade'] },
    itinerary: { desktop: 'half', effects: ['timeline-fill'] },
    'dress-code': { desktop: 'half', effects: ['reveal'] },
    hotels: { effects: ['cascade'] },
    gallery: { effects: ['reveal'] },
    gifts: { desktop: 'half', effects: ['reveal'] },
    faq: { desktop: 'half', effects: ['reveal'] },
    trivia: { effects: ['reveal-zoom'] },
    rsvp: { desktop: 'half', effects: ['reveal'] },
    dedications: { desktop: 'half', effects: ['reveal'] },
    'guest-album': { effects: ['reveal'] },
    closing: { effects: ['reveal'] },
    quote: { effects: ['reveal'] },
    'photo-arch': { effects: ['reveal'] },
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
