import { describe, expect, it } from 'vitest'
import { sectionVariants } from '@/components/sectionVariants'
import { listThemes, loadTheme, themeAssets } from '../index'

describe('tema encaje', () => {
  it('se registra solo y sus adornos existen (propios o compartidos)', async () => {
    expect(listThemes()).toContain('encaje')
    const manifest = await loadTheme('encaje')
    expect(manifest?.texture).toBe('velvet')
    expect(manifest?.edges?.default).toBe('lace')
    expect(manifest?.buttons).toBe('ribbon')
    expect(manifest?.corners).toBe('lace')
    const assets = themeAssets('encaje')
    for (const section of Object.values(manifest!.sections)) {
      for (const file of Object.values(section.decor ?? {})) {
        expect(assets[file], file).toBeTruthy()
      }
    }
  })

  it('la portada usa el telón, que está registrado como diseño', async () => {
    const manifest = await loadTheme('encaje')
    expect(manifest?.sections['hero-envelope'].variant).toBe('telon')
    expect(sectionVariants['hero-envelope'].telon).toBeTypeOf('function')
  })
})
