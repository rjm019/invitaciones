import type { ThemeManifest } from '../types'

/**
 * Tema "jardín azul" (clon del diseño NAT de Canva): acuarela azul, oro y papel.
 * Las decoraciones se nombran por archivo; se buscan primero en eventos/<slug>/media
 * y luego en ./assets. Si falta alguna, la sección se ve igual con su respaldo en CSS.
 *
 * En escritorio, las secciones "half" van en pares (fecha | foto, ubicación | frase,
 * itinerario | vestimenta, cuenta regresiva | confirmación); el layout puede cambiarlo
 * con la columna "escritorio".
 */
const theme: ThemeManifest = {
  id: 'jardin-azul',
  label: 'Jardín azul',
  fonts: {
    script: { family: 'Pinyon Script' },
    'script-mono': { family: 'Sacramento' },
    serif: { family: 'EB Garamond', weights: [400, 500, 600] },
    caps: { family: 'Marcellus' },
    display: { family: 'Playfair Display', weights: [400, 700] },
    button: { family: 'Cormorant Garamond', weights: [600, 700] },
    // Mayúsculas finas de la imagen para WhatsApp ("MIS XV AÑOS", "NAT"), como el diseño.
    engraved: { family: 'Cormorant Garamond', weights: [400, 500] },
  },
  page: { image: 'papel.webp', color: 'bg' },
  floating: [
    { file: 'mariposa.webp', top: '16%', side: 'right', size: '1.5rem' },
    { file: 'mariposa.webp', top: '43%', side: 'left', size: '1.25rem', flip: true },
    { file: 'mariposa.webp', top: '71%', side: 'right', size: '1.35rem' },
  ],
  // Una mariposa cruza la pantalla cada tanto (a destiempo, para que no vuelen juntas).
  flights: [
    { file: 'mariposa.webp', size: '1.7rem', direction: 'ltr', duration: 26, delay: 4 },
    {
      file: 'mariposa.webp',
      size: '1.35rem',
      direction: 'rtl',
      duration: 34,
      delay: 17,
      flip: true,
    },
  ],
  // Cada sección es un panel; las que no traen fondo se turnan estos tres.
  panels: [{ color: 'panel' }, { color: 'panel-alt' }, { color: 'panel-warm' }],
  sections: {
    // La capa de imagen es una ventana a una foto quieta: sin panel encima.
    layer: { panel: false },
    // La portada no es panel: el sobre va directo sobre el papel.
    'hero-envelope': {
      panel: false,
      effects: ['float', 'sparkle'],
      decor: {
        envelope: 'sobre.webp',
        card: 'tarjeta.webp',
        flowers: 'rosas-azules.webp',
        crown: 'corona.webp',
        butterflies: 'mariposas.webp',
        seal: 'lacre.webp',
      },
    },
    'music-player': { effects: ['reveal'] },
    blessing: {
      background: { image: 'toile.webp', fit: 'tile' },
      effects: ['reveal'],
      decor: {
        arch: 'arco-lino.webp',
        leaves: 'hojas-oro.webp',
        divider: 'divisor-oro.webp',
        bow: 'lazo.webp',
      },
    },
    // Sin el brillo dorado detrás de "Save the date" (pedido del 13-oct).
    'save-the-date': { desktop: 'half', effects: ['reveal', 'sparkle'] },
    'photo-arch': {
      desktop: 'half',
      effects: ['parallax', 'sparkle'],
      decor: {
        frame: 'arco-oro.webp',
        stars: 'estrellas-oro.webp',
        butterflies: 'mariposas-oro.webp',
      },
      // Figuras medidas sobre los archivos del tema (724×800 y 764×800): cada mariposa
      // aletea sola y sobre cada estrella titila un destello.
      sprites: {
        butterflies: {
          ratio: 724 / 800,
          parts: [
            { x: 1.7, y: 70, w: 35.4, h: 30 },
            { x: 0, y: 44, w: 27.1, h: 23.5 },
            { x: 11, y: 18.5, w: 22.1, h: 20 },
            { x: 26.5, y: 0, w: 18.2, h: 15.5 },
            { x: 55.8, y: 0, w: 11.6, h: 11 },
            { x: 78.5, y: 5, w: 12.7, h: 11 },
            { x: 92.3, y: 15, w: 7.7, h: 9.5 },
          ],
        },
        stars: {
          ratio: 764 / 800,
          glints: [
            { x: 34, y: 29.5, w: 49.2, h: 44.5 },
            { x: 17.3, y: 57.5, w: 30.9, h: 30 },
            { x: 72.8, y: 66.5, w: 16.2, h: 15.5 },
            { x: 66, y: 26.5, w: 18.3, h: 11.5 },
            { x: 3.7, y: 76, w: 10.5, h: 9.5 },
            { x: 33, y: 28, w: 8.9, h: 8.5 },
            { x: 82.7, y: 11, w: 6.8, h: 7 },
            { x: 86.4, y: 44.5, w: 5.8, h: 6 },
            { x: 40.3, y: 21, w: 6.3, h: 5.5 },
            { x: 15.7, y: 46, w: 5.8, h: 6 },
            { x: 66.5, y: 79.5, w: 5.2, h: 5 },
          ],
        },
      },
    },
    location: { desktop: 'half', effects: ['reveal', 'shine', 'ken-burns', 'typewriter'] },
    quote: { desktop: 'half', effects: ['typewriter'], decor: { divider: 'laurel.webp' } },
    itinerary: {
      desktop: 'half',
      // Panel perla (más blanco que la crema que le tocaba); las demás no cambian de fondo.
      panelColor: 'panel-pearl',
      variant: 'zigzag',
      effects: ['reveal', 'timeline-fill', 'cascade'],
      decor: { frame: 'marco-azul.webp' },
    },
    'dress-code': {
      desktop: 'half',
      background: { color: 'frame' },
      // El fondo azul pasa por cielo y dorado (cambio de color).
      effects: ['reveal', 'color-shift'],
      decor: { seal: 'lacre.webp', card: 'tarjeta.webp', woman: 'mujer.webp', man: 'hombre.webp' },
    },
    countdown: {
      desktop: 'half',
      effects: ['reveal', 'sparkle', 'cascade'],
      decor: { crown: 'corona.webp', butterfly: 'mariposa.webp' },
    },
    'no-kids': { effects: ['reveal'], decor: { bow: 'lazo.webp' } },
    // Hospedaje: tarjetas de papel con el divisor dorado; en escritorio, toda la fila.
    hotels: {
      effects: ['reveal', 'cascade', 'shine', 'float', 'sparkle', 'ken-burns'],
      decor: { card: 'tarjeta.webp', divider: 'divisor-oro.webp' },
    },
    // Clima y playlist: pareja en escritorio (qué ponerse y qué va a sonar).
    weather: { desktop: 'half', effects: ['reveal', 'cascade'] },
    spotify: { desktop: 'half', effects: ['reveal'] },
    rsvp: {
      desktop: 'half',
      effects: ['reveal'],
      decor: { card: 'ovalo-lino.webp', flowers: 'rosas-azules.webp' },
    },
    // Rosas azules en dos esquinas, como en la portada y la confirmación.
    closing: { effects: ['reveal', 'sparkle'], decor: { flowers: 'rosas-azules.webp' } },
    // Una dedicatoria por enlace; arriba, el adorno dorado (como en la referencia).
    dedications: { effects: ['reveal'], decor: { divider: 'divisor-oro.webp' } },
  },
}

export default theme
