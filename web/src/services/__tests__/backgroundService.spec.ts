import { describe, expect, it } from 'vitest'
import { createAssetResolver } from '../assetService'
import { backgroundVars, colorValue } from '../backgroundService'

const resolve = createAssetResolver({ 'toile.webp': 'http://api/media/x/toile.webp' })

describe('backgroundVars', () => {
  it('imagen, color y overlay como variables CSS', () => {
    expect(backgroundVars({ image: 'toile.webp', color: 'lino', overlay: 0.2 }, resolve)).toEqual({
      '--section-bg-color': 'var(--color-lino)',
      '--section-bg-image': 'url("http://api/media/x/toile.webp")',
      '--section-overlay': '0.2',
    })
  })

  it('si la imagen no existe solo queda el color', () => {
    expect(backgroundVars({ image: 'no-existe.webp', color: '#F0EDE8' }, resolve)).toEqual({
      '--section-bg-color': '#F0EDE8',
    })
  })

  it('el mosaico repite el estampado a su tamaño; sin imagen no hace nada', () => {
    expect(backgroundVars({ image: 'toile.webp', fit: 'tile' }, resolve)).toMatchObject({
      '--section-bg-size': 'var(--bg-tile-size) auto',
      '--section-bg-repeat': 'repeat',
    })
    expect(backgroundVars({ image: 'no-existe.webp', fit: 'tile' }, resolve)).toEqual({})
  })

  it('sirve también para el fondo de toda la página', () => {
    expect(backgroundVars({ color: 'bg' }, resolve, '--page')).toEqual({
      '--page-bg-color': 'var(--color-bg)',
    })
    expect(backgroundVars(undefined, resolve)).toEqual({})
  })

  it('colorValue no deja pasar texto que no sea hex o token', () => {
    expect(colorValue('url(x)')).toBeNull()
    expect(colorValue('primary-strong')).toBe('var(--color-primary-strong)')
  })
})
