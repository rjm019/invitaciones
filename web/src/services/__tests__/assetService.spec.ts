import { describe, expect, it } from 'vitest'
import { createAssetResolver } from '../assetService'

describe('createAssetResolver', () => {
  const resolve = createAssetResolver(
    { 'toile.webp': 'http://api/media/nat/toile.webp' },
    { 'toile.webp': '/tema/toile.webp', 'laurel.webp': '/tema/laurel.webp' },
  )

  it('la media del evento gana sobre los assets del tema', () => {
    expect(resolve('toile.webp')).toBe('http://api/media/nat/toile.webp')
    expect(resolve('laurel.webp')).toBe('/tema/laurel.webp')
  })

  it('una URL pasa tal cual y un archivo que no existe da null (nunca imagen rota)', () => {
    expect(resolve('https://cdn.test/x.webp')).toBe('https://cdn.test/x.webp')
    expect(resolve('no-existe.webp')).toBeNull()
    expect(resolve('')).toBeNull()
    expect(resolve(undefined)).toBeNull()
  })
})
