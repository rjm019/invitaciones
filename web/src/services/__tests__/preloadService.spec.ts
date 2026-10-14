import { describe, expect, it } from 'vitest'
import { criticalImages, fontFamilies } from '../preloadService'

describe('preloadService', () => {
  it('lo primero que se ve: el papel y las decoraciones de la portada, sin repetir ni faltantes', () => {
    const hero = {
      decor: {
        envelope: '/m/sobre.webp',
        card: '/m/tarjeta.webp',
        seal: null,
        flowers: '/m/sobre.webp',
      },
    }
    expect(criticalImages(hero, ['/m/papel.webp', null, undefined])).toEqual([
      '/m/papel.webp',
      '/m/sobre.webp',
      '/m/tarjeta.webp',
    ])
    expect(criticalImages(undefined)).toEqual([])
  })

  it('las fuentes del tema, una vez cada familia', () => {
    expect(
      fontFamilies({
        script: { family: 'Pinyon Script' },
        serif: { family: 'EB Garamond', weights: [400, 600] },
        display: { family: 'EB Garamond' },
      }),
    ).toEqual(['Pinyon Script', 'EB Garamond'])
  })
})
