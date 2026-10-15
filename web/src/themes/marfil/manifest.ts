import type { ThemeManifest } from '../types'

/**
 * Tema "marfil": sobrio y minimalista, para las muestras de la landing y para quien quiera
 * algo neutro. Sin fotos: los adornos son dibujos de línea fina (./assets, hechos para este
 * tema) y donde falta uno, la sección usa su respaldo en CSS. La paleta cambia por
 * invitación (boda en champaña, XV en rosa palo, graduación en azul noche).
 */
const theme: ThemeManifest = {
  id: 'marfil',
  label: 'Marfil',
  fonts: {
    script: { family: 'Pinyon Script' },
    'script-mono': { family: 'Cormorant Garamond', weights: [400, 500] },
    serif: { family: 'EB Garamond', weights: [400, 500, 600] },
    caps: { family: 'Cormorant Garamond', weights: [500, 600] },
    display: { family: 'Cormorant Garamond', weights: [400, 500] },
    button: { family: 'Cormorant Garamond', weights: [600, 700] },
    engraved: { family: 'Cormorant Garamond', weights: [400, 500] },
  },
  page: { color: 'bg' },
  panels: [{ color: 'panel' }, { color: 'panel-alt' }, { color: 'panel-warm' }],
  sections: {
    'hero-envelope': {
      panel: false,
      effects: ['float'],
      // Sin ramas en la portada: el sobre y el sello solos, y el nombre limpio.
      decor: { envelope: 'sobre.svg', card: 'tarjeta.svg', seal: 'lacre.svg' },
    },
    'music-player': { effects: ['reveal'] },
    blessing: { effects: ['reveal'], decor: { divider: 'divisor.svg' } },
    'save-the-date': { desktop: 'half', effects: ['reveal'] },
    'photo-arch': {
      desktop: 'half',
      effects: ['reveal', 'parallax'],
      decor: { stars: 'destellos.svg' },
    },
    location: { desktop: 'half', effects: ['reveal', 'shine'] },
    quote: { desktop: 'half', effects: ['typewriter'], decor: { divider: 'divisor.svg' } },
    itinerary: {
      desktop: 'half',
      panelColor: 'panel-pearl',
      variant: 'lista',
      effects: ['reveal', 'timeline-fill', 'cascade'],
    },
    'dress-code': {
      desktop: 'half',
      effects: ['reveal'],
      decor: { woman: 'vestido.svg', man: 'traje.svg' },
    },
    countdown: { desktop: 'half', effects: ['reveal', 'cascade'] },
    'no-kids': { effects: ['reveal'], decor: { bow: 'lazo.svg' } },
    hotels: { effects: ['reveal', 'cascade'], decor: { divider: 'divisor.svg' } },
    weather: { desktop: 'half', effects: ['reveal', 'cascade'] },
    spotify: { desktop: 'half', effects: ['reveal'] },
    rsvp: { desktop: 'half', effects: ['reveal'], decor: { flowers: 'ramas.svg' } },
    closing: { effects: ['reveal'], decor: { flowers: 'ramas.svg' } },
    dedications: { effects: ['reveal'], decor: { divider: 'divisor.svg' } },
  },
}

export default theme
