import { describe, expect, it } from 'vitest'
import { isHeic, needsResize, outputName, outputType, targetSize } from '../imageResizeService'

describe('imageResizeService', () => {
  it('reduce el lado más largo a 2400 px sin deformar', () => {
    expect(targetSize(4032, 3024)).toEqual({ width: 2400, height: 1800 })
    expect(targetSize(3024, 4032)).toEqual({ width: 1800, height: 2400 })
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('pasa por el navegador las fotos grandes o HEIC; las chicas suben tal cual', () => {
    expect(needsResize({ size: 5_000_000, type: 'image/jpeg' }, 2000, 1500)).toBe(true)
    expect(needsResize({ size: 500_000, type: 'image/jpeg' }, 4000, 3000)).toBe(true)
    expect(needsResize({ size: 500_000, type: 'image/heic' }, 1000, 800)).toBe(true)
    expect(needsResize({ size: 500_000, type: 'image/png' }, 1000, 800)).toBe(false)
  })

  it('reconoce una HEIC aunque el navegador no le ponga tipo', () => {
    expect(isHeic({ type: 'image/heif' })).toBe(true)
    expect(isHeic({ type: '', name: 'IMG_0012.HEIC' })).toBe(true)
    expect(isHeic({ type: 'image/jpeg', name: 'foto.jpg' })).toBe(false)
    expect(needsResize({ size: 500_000, type: '', name: 'IMG_0012.heic' }, 1000, 800)).toBe(true)
  })

  it('la transparencia se conserva (PNG); lo demás va en JPEG', () => {
    expect(outputType('image/png')).toBe('image/png')
    expect(outputType('image/webp')).toBe('image/png')
    expect(outputType('image/heic')).toBe('image/jpeg')
    expect(outputName('Foto del salón.HEIC', 'image/jpeg')).toBe('Foto del salón.jpg')
  })
})
