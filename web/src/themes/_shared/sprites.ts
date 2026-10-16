import type { DecorSprite } from '@/types/event'

/**
 * Dónde está cada estrellita de `assets/destellos-titulo.svg` (400×160, en % de la imagen):
 * así cada una titila por su cuenta (SpriteDecor, modo "twinkle").
 */
export const TITLE_SPARKLES: DecorSprite = {
  ratio: 400 / 160,
  glints: [
    { x: 8.2, y: 25.6, w: 4.5, h: 11.2 },
    { x: 3.9, y: 59.7, w: 2.2, h: 5.6 },
    { x: 18.6, y: 72.8, w: 2.8, h: 6.9 },
    { x: 29.5, y: 11.2, w: 2.0, h: 5.0 },
    { x: 87.8, y: 19.4, w: 3.5, h: 8.8 },
    { x: 94.9, y: 54.7, w: 2.2, h: 5.6 },
    { x: 79.0, y: 66.2, w: 5.0, h: 12.5 },
    { x: 64.5, y: 88.6, w: 2.1, h: 5.2 },
    { x: 56.8, y: 6.9, w: 2.5, h: 6.2 },
  ],
}
