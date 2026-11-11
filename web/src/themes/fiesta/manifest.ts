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
  // Detalles de toda la página: orilla de papel picado, botones de azulejo, ramitos y papel amate.
  edges: { default: 'picado' },
  buttons: 'talavera',
  corners: 'flowers',
  texture: 'amate',
  // Monarcas que cruzan la pantalla a destiempo.
  flights: [
    { file: 'monarca.svg', size: '2rem', direction: 'ltr', duration: 28, delay: 5 },
    { file: 'monarca.svg', size: '1.5rem', direction: 'rtl', duration: 36, delay: 19, flip: true },
  ],
  confetti: { count: 14 },
  // Crema, rosa, cobalto y nopal se turnan; la letra de cada uno la ajusta theme.css.
  panels: [{ color: 'paper' }, { color: 'rosa' }, { color: 'talavera' }, { color: 'nopal' }],
  sections: {
    'hero-envelope': { panel: false, variant: 'papel-picado', effects: ['papel-picado', 'marigold'] },
    'music-player': { variant: 'mariachi', effects: ['music-notes'] },
    blessing: { variant: 'retablo', effects: ['heartbeat'] },
    story: { effects: ['reveal', 'bloom'] },
    'save-the-date': { desktop: 'half', variant: 'loteria', effects: ['tile-flip'] },
    location: { desktop: 'half', effects: ['bloom'] },
    countdown: { variant: 'azulejos', effects: ['papel-picado'] },
    itinerary: { desktop: 'half', effects: ['timeline-fill'] },
    'dress-code': { desktop: 'half', effects: ['sarape-drift'] },
    hotels: { effects: ['cascade'] },
    gallery: { effects: ['bloom'] },
    gifts: { desktop: 'half', effects: ['marigold'] },
    faq: { desktop: 'half', effects: ['reveal', 'bloom'] },
    trivia: { effects: ['reveal-zoom'] },
    rsvp: { desktop: 'half', effects: ['bloom'] },
    dedications: { desktop: 'half', effects: ['reveal', 'bloom'] },
    'guest-album': { effects: ['reveal', 'bloom'] },
    closing: { effects: ['papel-picado', 'music-notes'] },
    quote: { variant: 'picado', effects: ['reveal', 'bloom'] },
    'photo-arch': { variant: 'nicho', effects: ['reveal', 'bloom'] },
    'no-kids': { effects: ['reveal', 'bloom'] },
    weather: { effects: ['reveal', 'bloom'] },
    spotify: { effects: ['reveal', 'bloom'] },
    'envelope-rain': { effects: ['reveal', 'bloom'] },
    video: { effects: ['reveal', 'bloom'] },
    'social-post': { effects: ['reveal', 'bloom'] },
    layer: { panel: false },
  },
}

export default theme
