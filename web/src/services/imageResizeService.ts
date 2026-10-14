/**
 * Antes de subir una foto: si es muy grande, se reduce en el navegador. Así sube rápido
 * desde el celular, llega derecha (el navegador aplica la rotación de la cámara) y el
 * servidor no se queda sin memoria. Una foto HEIC del iPhone sale como JPEG.
 */
export const MAX_SIDE = 2400

/** Hasta este peso (con medidas razonables) se sube tal cual. */
export const MAX_DIRECT_BYTES = 3 * 1024 * 1024

export function targetSize(
  width: number,
  height: number,
  max = MAX_SIDE,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** Foto del iPhone (HEIC). Algunos navegadores no le ponen tipo: se ve también la extensión. */
export function isHeic(file: { type: string; name?: string }): boolean {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name ?? '')
}

/** ¿Hay que pasarla por el navegador antes de subirla? */
export function needsResize(
  file: { size: number; type: string; name?: string },
  width: number,
  height: number,
): boolean {
  if (isHeic(file)) return true
  return Math.max(width, height) > MAX_SIDE || file.size > MAX_DIRECT_BYTES
}

/** PNG y WebP pueden traer transparencia (adornos de Canva): se quedan en PNG; lo demás, JPEG. */
export function outputType(inputType: string): 'image/png' | 'image/jpeg' {
  return /png|webp|gif/i.test(inputType) ? 'image/png' : 'image/jpeg'
}

/** "Foto del salón.HEIC" → "Foto del salón.jpg" */
export function outputName(name: string, type: 'image/png' | 'image/jpeg'): string {
  const base = name.replace(/\.[^.]+$/, '') || 'imagen'
  return `${base}.${type === 'image/png' ? 'png' : 'jpg'}`
}
