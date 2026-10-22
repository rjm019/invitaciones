import type { GalleryPhoto } from '@/types/event'

/** Qué hace un gesto sobre el visor de fotos. */
export type SwipeAction = 'next' | 'prev' | 'close' | null

/** Lo mínimo que se tiene que mover un dedo para que cuente como deslizar (px). */
export const SWIPE_MIN = 48

/** Índice de la foto vecina, dando la vuelta en los extremos. */
export function stepIndex(index: number, step: 1 | -1, count: number): number {
  if (count <= 0) return 0
  return (index + step + count) % count
}

/**
 * Un gesto del visor: hacia la izquierda pasa a la siguiente, hacia la derecha a la
 * anterior y hacia abajo lo cierra. Lo corto o lo diagonal no hace nada, para no robarle el
 * toque a quien solo quería ver la foto.
 */
export function swipeAction(dx: number, dy: number, min: number = SWIPE_MIN): SwipeAction {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (Math.max(ax, ay) < min) return null
  if (ay > ax) return dy > 0 ? 'close' : null
  return dx < 0 ? 'next' : 'prev'
}

/** A partir de esta proporción (ancho / alto) una foto se acomoda a todo el ancho. */
export const WIDE_RATIO = 1.15

export interface GalleryItem {
  src: string
  caption: string
  /** Ancho / alto: la de la foto o, si no se sabe, la que le toca por su lugar. */
  ratio: number
  /** Horizontal: va a todo el ancho. */
  wide: boolean
}

/**
 * Las fotos de una galería, listas para pintar: su URL, su forma y si van a lo ancho. Sin
 * medidas (una URL de fuera), una de cada tres va a lo ancho; una foto sola, siempre.
 */
export function galleryItems(
  photos: GalleryPhoto[] | undefined,
  resolve: (file: string) => string | null,
): GalleryItem[] {
  const list = photos ?? []
  return list.flatMap((p, i) => {
    const src = resolve(p.photo)
    if (!src) return []
    const known = p.width && p.height ? p.width / p.height : null
    const wide = list.length === 1 || (known === null ? i % 3 === 0 : known >= WIDE_RATIO)
    return [{ src, caption: p.caption, wide, ratio: known ?? (wide ? 4 / 3 : 3 / 4) }]
  })
}
