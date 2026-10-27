/**
 * Íconos de grabado: dibujos de línea (copa, anillos, plato, pastel…) para el itinerario
 * `grabado`. Lógica pura, sin Vue ni DOM: elige el dibujo de un momento por el nombre de su
 * ícono (los de Font Awesome del editor) o, si no trae, por las palabras de su actividad.
 * Cada dibujo es el interior de un <svg viewBox="0 0 48 48"> con trazo (fill none), así que
 * toma el color del texto. Son constantes del código: nunca llevan datos del evento.
 */

export type EngravedIconKey =
  'copa' | 'anillos' | 'plato' | 'pastel' | 'musica' | 'iglesia' | 'camara' | 'corazon' | 'flor'

export const ENGRAVED_ICONS: Record<EngravedIconKey, string> = {
  copa:
    '<g transform="translate(17 25) rotate(-14)"><path d="M-5-15H5V-1a5 5 0 0 1-10 0Z"/><path d="M0 4V16M-6 17H6"/><path d="M-5-8H5" stroke-width="0.9"/></g>' +
    '<g transform="translate(31 25) rotate(14)"><path d="M-5-15H5V-1a5 5 0 0 1-10 0Z"/><path d="M0 4V16M-6 17H6"/><path d="M-5-8H5" stroke-width="0.9"/></g>' +
    '<path d="M24 8v3M21.5 5.5l1.5 2M26.5 5.5l-1.5 2" stroke-width="1"/>',
  anillos:
    '<circle cx="17" cy="29" r="10"/><circle cx="31" cy="29" r="10"/>' +
    '<path d="M13 15l4-6 4 6-4 5Z"/><path d="M13 15h8" stroke-width="0.9"/><path d="M36 9l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" stroke-width="0.9"/>',
  plato:
    '<circle cx="24" cy="26" r="11"/><circle cx="24" cy="26" r="7" stroke-width="0.9"/>' +
    '<path d="M5 8v8a3 3 0 0 0 6 0V8M8 8v10M8 19v21"/><path d="M43 8c-4 3-4 12-1 18v14"/>',
  pastel:
    '<path d="M7 41h34M9 41V31h30v10"/><path d="M13 31V23h22v8"/><path d="M18 23v-7h12v7"/>' +
    '<path d="M9 31q3.8 4 7.5 0t7.5 0t7.5 0t7.5 0" stroke-width="0.9"/><path d="M24 16v-6"/>' +
    '<path d="M24 3c2.6 2.4 2.6 5 0 7c-2.6-2-2.6-4.6 0-7Z"/>',
  musica:
    '<ellipse cx="13" cy="35" rx="5.5" ry="4" transform="rotate(-18 13 35)"/>' +
    '<ellipse cx="32" cy="31" rx="5.5" ry="4" transform="rotate(-18 32 31)"/>' +
    '<path d="M18 34V12L37 7v23"/><path d="M18 19l19-5" stroke-width="2"/>',
  iglesia:
    '<path d="M9 41V25L24 14l15 11v16Z"/><path d="M19 41v-9a5 5 0 0 1 10 0v9"/>' +
    '<path d="M24 14V4M20 8h8"/><circle cx="24" cy="23" r="2.6"/><path d="M5 41h38"/>',
  camara:
    '<path d="M6 16h8l3-5h14l3 5h8v22H6Z"/><circle cx="24" cy="27" r="7"/><circle cx="24" cy="27" r="3" stroke-width="0.9"/>' +
    '<path d="M36 21h3" stroke-width="1.2"/>',
  corazon:
    '<path d="M24 39C10 29 7 19 13 13.5C17.5 9.5 23 11.5 24 17C25 11.5 30.5 9.5 35 13.5C41 19 38 29 24 39Z"/>' +
    '<path d="M16 17c1-2 3-2.600 4.500-1.800" stroke-width="0.9"/>',
  flor:
    '<g transform="translate(24 19)"><ellipse rx="4" ry="8" cy="-6"/><ellipse rx="4" ry="8" cy="-6" transform="rotate(72)"/><ellipse rx="4" ry="8" cy="-6" transform="rotate(144)"/><ellipse rx="4" ry="8" cy="-6" transform="rotate(216)"/><ellipse rx="4" ry="8" cy="-6" transform="rotate(288)"/><circle r="2.500"/></g>' +
    '<path d="M24 28v15"/><path d="M24 38c-6-1-9-4-10-8c6 0 9 3 10 8Z"/>',
}

/** Nombres de Font Awesome (los del editor) → dibujo de grabado. */
const BY_ICON: Record<string, EngravedIconKey> = {
  'champagne-glasses': 'copa',
  'glass-cheers': 'copa',
  'martini-glass': 'copa',
  'martini-glass-citrus': 'copa',
  'wine-glass': 'copa',
  'wine-glass-empty': 'copa',
  'wine-bottle': 'copa',
  ring: 'anillos',
  rings: 'anillos',
  gem: 'anillos',
  'hands-holding-circle': 'anillos',
  utensils: 'plato',
  'bowl-food': 'plato',
  'plate-wheat': 'plato',
  burger: 'plato',
  'cake-candles': 'pastel',
  'birthday-cake': 'pastel',
  cake: 'pastel',
  cookie: 'pastel',
  music: 'musica',
  guitar: 'musica',
  'record-vinyl': 'musica',
  'compact-disc': 'musica',
  'disco-ball': 'musica',
  microphone: 'musica',
  church: 'iglesia',
  'place-of-worship': 'iglesia',
  cross: 'iglesia',
  'hands-praying': 'iglesia',
  camera: 'camara',
  'camera-retro': 'camara',
  images: 'camara',
  heart: 'corazon',
  'heart-pulse': 'corazon',
  'hand-holding-heart': 'corazon',
  spa: 'flor',
  leaf: 'flor',
  seedling: 'flor',
  fan: 'flor',
}

/** Palabras de la actividad → dibujo, en orden: la primera que coincide gana. */
const BY_WORD: [RegExp, EngravedIconKey][] = [
  [/anillo|civil|promesa|votos|boda/, 'anillos'],
  [/brindis|copa|coctel|cocktail|recepcion|bienvenida|champ/, 'copa'],
  [/cena|comida|banquete|buffet|plato|desayuno|brunch/, 'plato'],
  [/pastel|torta|cake/, 'pastel'],
  [/baile|vals|fiesta|musica|banda|dj|show|karaoke/, 'musica'],
  [/misa|iglesia|ceremonia|religios|templo|capilla/, 'iglesia'],
  [/foto|camara|sesion|album/, 'camara'],
  [/ramo|flor|jardin|liga/, 'flor'],
]

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * El dibujo de un momento del itinerario: primero por su ícono, luego por las palabras de su
 * actividad y, si nada coincide, el corazón.
 */
export function engravedIcon(icon: string | undefined | null, label = ''): EngravedIconKey {
  const byIcon = icon ? BY_ICON[icon.trim().toLowerCase()] : undefined
  if (byIcon) return byIcon
  const words = plain(label)
  for (const [pattern, key] of BY_WORD) {
    if (pattern.test(words)) return key
  }
  return 'corazon'
}
