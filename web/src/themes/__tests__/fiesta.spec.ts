import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { sectionVariants, skinVariants } from '@/components/sectionVariants'
import { listThemes, loadTheme, themeAssets } from '../index'

// Vitest no devuelve el CSS por `?raw`: se lee el archivo tal cual.
const skins = readFileSync(
  resolve(process.cwd(), 'src/components/sections/variants/skins.css'),
  'utf8',
)

describe('tema fiesta', () => {
  it('se registra solo y sus adornos existen (propios o compartidos)', async () => {
    expect(listThemes()).toContain('fiesta')
    const manifest = await loadTheme('fiesta')
    expect(manifest?.label).toBe('Fiesta mexicana')
    expect(manifest?.panels?.map((p) => p.color)).toEqual(['paper', 'rosa', 'talavera', 'nopal'])
    const assets = themeAssets('fiesta')
    for (const section of Object.values(manifest!.sections)) {
      for (const file of Object.values(section.decor ?? {})) {
        expect(assets[file], file).toBeTruthy()
      }
    }
    for (const flight of manifest!.flights ?? []) {
      expect(assets[flight.file], flight.file).toBeTruthy()
    }
  })

  it('cada diseño del tema está registrado (componente o piel de CSS)', async () => {
    const manifest = await loadTheme('fiesta')
    for (const [type, section] of Object.entries(manifest!.sections)) {
      const variant = section.variant
      if (!variant) continue
      const component = sectionVariants[type]?.[variant]
      const skin = skinVariants[type]?.includes(variant)
      expect(component || skin, `${type}:${variant}`).toBeTruthy()
      if (component) expect(component, `${type}:${variant}`).toBeTypeOf('function')
      // Una piel solo existe si su regla está en skins.css.
      if (skin) expect(skins, `${type}:${variant}`).toContain(`.section--${type}--${variant}`)
    }
  })

  it('enciende las opciones de página y los efectos nuevos de la fiesta', async () => {
    const manifest = await loadTheme('fiesta')
    expect(manifest?.edges).toEqual({ default: 'picado' })
    expect(manifest?.buttons).toBe('talavera')
    expect(manifest?.corners).toBe('flowers')
    expect(manifest?.texture).toBe('amate')
    const effects = (type: string) => manifest!.sections[type].effects
    expect(effects('hero-envelope')).toEqual(['papel-picado', 'marigold'])
    expect(effects('music-player')).toEqual(['music-notes'])
    expect(effects('blessing')).toEqual(['heartbeat'])
    expect(effects('save-the-date')).toEqual(['tile-flip'])
    expect(effects('countdown')).toEqual(['papel-picado'])
    expect(effects('location')).toEqual(['bloom'])
    expect(effects('itinerary')).toEqual(['timeline-fill'])
    expect(effects('dress-code')).toEqual(['sarape-drift'])
    expect(effects('gallery')).toEqual(['bloom'])
    expect(effects('gifts')).toEqual(['marigold'])
    expect(effects('rsvp')).toEqual(['bloom'])
    expect(effects('closing')).toEqual(['papel-picado', 'music-notes'])
    const css = readFileSync(resolve(process.cwd(), 'src/effects/fiesta.css'), 'utf8')
    for (const cls of ['.fab-flag', '.fab-marigold', '.fab-bloom', '.fab-heart', '.fab-note', '.fab-sarape', '.fab-tile']) {
      expect(css, cls).toContain(cls)
    }
  })

  it('los adornos nuevos son compartidos: cualquier tema los encuentra', () => {
    const assets = themeAssets('fiesta')
    for (const file of [
      'papel-picado.svg', 'azulejo-1.svg', 'azulejo-2.svg', 'azulejo-3.svg', 'azulejo-4.svg',
      'corazon-sagrado.svg', 'gerbera.svg', 'cempasuchil.svg', 'nopal.svg', 'saguaro.svg',
      'monarca.svg', 'mariachis.svg', 'sarape.svg', 'hojalata.svg', 'pinata.svg',
    ]) {
      expect(assets[file], file).toBeTruthy()
    }
    expect(themeAssets('marfil')['mariachis.svg']).toBeTruthy()
  })
})
