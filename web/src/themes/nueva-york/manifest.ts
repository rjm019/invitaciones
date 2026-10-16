import { TITLE_SPARKLES } from '../_shared/sprites'
import type { ThemeManifest } from '../types'

/**
 * Tema "Nueva York": una noche en Manhattan, elegante y moderna. Negro, blanco perla y
 * plata; líneas art déco (los arcos del Chrysler, los escalonados del Empire State) y
 * brillo: reflectores, luces de la ciudad, escarcha y un reflejo que cruza las letras
 * plateadas. Sin fotos: el horizonte, el sobre y los adornos son dibujos (./assets y
 * src/effects/assets); cada invitación puede subir sus propias fotos de la ciudad y los
 * efectos las mueven igual (panorámica, acercamiento, profundidad).
 *
 * Todo sale de la paleta: si la invitación cambia sus colores, el horizonte, los haces y
 * los brillos los siguen.
 */
const theme: ThemeManifest = {
  id: 'nueva-york',
  label: 'Nueva York',
  dark: true,
  fonts: {
    script: { family: 'Great Vibes' },
    'script-mono': { family: 'Bodoni Moda', weights: [400, 500] },
    serif: { family: 'Jost', weights: [300, 400, 500] },
    caps: { family: 'Jost', weights: [400, 500] },
    display: { family: 'Bodoni Moda', weights: [400, 500, 600] },
    button: { family: 'Jost', weights: [500, 600] },
    engraved: { family: 'Bodoni Moda', weights: [400, 500] },
  },
  page: { image: 'noche.svg', color: 'bg' },
  // En pantallas anchas, estrellitas plateadas en los márgenes.
  floating: [
    { file: 'estrella.svg', top: '12%', side: 'left', size: '1rem' },
    { file: 'estrella.svg', top: '31%', side: 'right', size: '1.4rem' },
    { file: 'estrella.svg', top: '52%', side: 'left', size: '1.25rem' },
    { file: 'estrella.svg', top: '74%', side: 'right', size: '0.9rem' },
  ],
  // Como las mariposas de NAT, pero lluvia de confeti plateado: pocos pedacitos a la vez.
  confetti: { count: 14 },
  // Lo que pone por defecto en los detalles que la invitación también puede elegir (Página):
  // las franjas grises las corta la ciudad y el papel asoma por una hoja rasgada; títulos
  // con brillo de metal y paneles con esquinas escalonadas.
  edges: { default: 'city', paper: 'torn' },
  metallic: true,
  corners: 'deco',
  panels: [{ color: 'panel' }, { color: 'panel-alt' }, { color: 'panel-warm' }],
  sections: {
    // La portada: el sobre perla sobre la noche, con reflectores detrás, la ciudad al pie
    // y escarcha cayendo.
    'hero-envelope': {
      panel: false,
      // Un elevador art déco: al tocar, la aguja recorre los pisos y se abren las puertas.
      // (El sobre y el lacre siguen siendo los de la imagen para WhatsApp.)
      variant: 'elevador',
      effects: ['searchlights', 'skyline', 'glitter', 'sheen'],
      decor: {
        door: 'puerta.svg',
        envelope: 'sobre.svg',
        card: 'tarjeta.svg',
        crown: 'corona.svg',
        seal: 'lacre.svg',
      },
    },
    // Un tocadiscos: el disco gira mientras suena y el brazo baja sobre él.
    'music-player': { variant: 'vinilo', effects: ['reveal', 'city-lights'] },
    // El programa de mano de un estreno: la franja, el mensaje y el "reparto".
    // Sobre papel (franja blanca, con la hoja rasgada si las secciones van difuminadas).
    blessing: {
      variant: 'programa',
      background: { color: 'paper' },
      effects: ['reveal', 'sheen'],
      decor: { divider: 'divisor.svg' },
    },
    // Un boleto plateado de Broadway y la semana del evento; alrededor del título,
    // estrellitas finas que titilan cada una a su ritmo.
    'save-the-date': {
      desktop: 'half',
      variant: 'boleto',
      effects: ['reveal', 'sheen'],
      decor: { glitter: 'destellos-titulo.svg' },
      sprites: { glitter: TITLE_SPARKLES },
    },
    // La foto en la punta escalonada de un rascacielos, con la ciudad detrás.
    'photo-arch': {
      desktop: 'half',
      variant: 'ventana',
      effects: ['reveal', 'parallax', 'city-lights'],
      decor: { frame: 'marco.svg', stars: 'destellos-titulo.svg' },
      sprites: { stars: TITLE_SPARKLES },
    },
    // Un letrero de estación del metro; la foto, en un marco de mosaico.
    location: {
      desktop: 'half',
      // Franja gris: con secciones difuminadas, la ciudad la corta arriba y abajo.
      background: { color: 'frame' },
      variant: 'metro',
      effects: ['reveal', 'shine', 'ken-burns', 'skyline'],
    },
    // Un letrero de neón de Times Square que parpadea y se enciende.
    quote: {
      desktop: 'half',
      variant: 'neon',
      effects: ['reveal', 'city-lights'],
      decor: { divider: 'divisor.svg' },
    },
    // Una línea del metro que baja por un poste con farol: cada momento, su estación y su
    // letrero de calle. Al pie, la Estatua de la Libertad y el puente de Brooklyn.
    itinerary: {
      desktop: 'half',
      background: { color: 'paper' },
      variant: 'avenida',
      effects: ['reveal', 'timeline-fill', 'cascade'],
      decor: { statue: 'estatua.svg', bridge: 'puente.svg' },
    },
    // Dos escaparates de la Quinta Avenida, con sus toldos y la luz encendida.
    'dress-code': {
      desktop: 'half',
      variant: 'vitrinas',
      effects: ['reveal', 'cascade', 'sheen'],
      decor: { woman: 'vestido.svg', man: 'traje.svg' },
    },
    // El tablero de llegadas de Grand Central: cada dígito cae al cambiar.
    countdown: {
      desktop: 'half',
      background: { color: 'paper' },
      variant: 'tablero',
      effects: ['reveal', 'cascade'],
      decor: { crown: 'corona.svg' },
    },
    // El cordón de terciopelo de la entrada de un club, con su letrero.
    'no-kids': { variant: 'cordon', effects: ['reveal'], decor: { bow: 'lazo.svg' } },
    // Colgantes de puerta de hotel que se mecen.
    hotels: {
      variant: 'colgantes',
      effects: ['reveal', 'cascade', 'shine'],
      decor: { divider: 'divisor.svg' },
    },
    weather: { desktop: 'half', effects: ['reveal', 'cascade'] },
    spotify: { desktop: 'half', effects: ['reveal', 'city-lights'] },
    // Bolsas de compras de la Quinta Avenida y un sobre déco para la lluvia de sobres.
    gifts: {
      background: { color: 'frame' },
      variant: 'bolsas',
      effects: ['reveal', 'cascade', 'shine'],
    },
    // Un pase VIP colgado de su cinta (piel del tema sobre la confirmación de siempre).
    rsvp: {
      desktop: 'half',
      background: { color: 'paper' },
      variant: 'pase',
      effects: ['reveal', 'shine', 'glitter'],
    },
    // El cierre: la ciudad otra vez, para despedirse como empezó.
    // La marquesina de un teatro de Broadway, con sus focos encendiéndose por turnos.
    closing: {
      variant: 'marquesina',
      effects: ['reveal', 'skyline', 'glitter', 'sheen'],
      decor: { crown: 'corona.svg' },
    },
    // Una postal de correo aéreo con su timbre de la Estatua de la Libertad.
    dedications: { variant: 'postal', effects: ['reveal'], decor: { divider: 'divisor.svg' } },
  },
}

export default theme
