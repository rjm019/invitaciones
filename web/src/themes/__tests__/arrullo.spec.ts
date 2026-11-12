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
const themeCss = readFileSync(resolve(process.cwd(), 'src/themes/arrullo/theme.css'), 'utf8')

describe('tema arrullo', () => {
  it('se registra solo y sus adornos existen (propios o compartidos)', async () => {
    expect(listThemes()).toContain('arrullo')
    const manifest = await loadTheme('arrullo')
    expect(manifest?.label).toBe('Arrullo · baby shower')
    expect(manifest?.panels?.map((p) => p.color)).toEqual(['paper', 'rubor', 'paper', 'salvia-clara'])
    const assets = themeAssets('arrullo')
    for (const section of Object.values(manifest!.sections)) {
      for (const file of Object.values(section.decor ?? {})) {
        expect(assets[file], file).toBeTruthy()
      }
    }
    expect(manifest?.flights?.length).toBeGreaterThan(0)
    for (const flight of manifest!.flights ?? []) {
      expect(assets[flight.file], flight.file).toBeTruthy()
    }
  })

  it('elige los detalles propios de toda la página', async () => {
    const manifest = await loadTheme('arrullo')
    expect(manifest?.edges).toEqual({ default: 'ruffle' })
    expect(manifest?.buttons).toBe('bow')
    expect(manifest?.corners).toBe('sprigs')
    expect(manifest?.texture).toBe('watercolor')
    expect(manifest?.pattern).toBe('stripes')
  })

  it('pone los efectos de baby shower en cada sección', async () => {
    const manifest = await loadTheme('arrullo')
    const effects = (type: string) => manifest!.sections[type].effects
    expect(effects('hero-envelope')).toEqual(['reveal', 'ribbon-curls', 'balloons'])
    expect(effects('music-player')).toEqual(['clouds'])
    expect(effects('blessing')).toEqual(['reveal'])
    expect(effects('save-the-date')).toEqual(['reveal'])
    expect(effects('dedications')).toEqual(['reveal', 'bubbles'])
    expect(effects('location')).toEqual(['reveal', 'daisies'])
    expect(effects('itinerary')).toEqual(['timeline-fill', 'goose-walk'])
    expect(effects('countdown')).toEqual(['reveal', 'crib-mobile'])
    expect(effects('closing')).toEqual(['reveal', 'ribbon-curls'])
    for (const type of ['hotels', 'weather', 'video', 'social-post']) {
      expect(effects(type), type).toEqual(['reveal', 'bow-tie'])
    }
    const css = readFileSync(resolve(process.cwd(), 'src/effects/arrullo.css'), 'utf8')
    for (const cls of [
      '.fab-balloon', '.fab-curl', '.fab-bowtie', '.fab-cloud', '.fab-mobile', '.fab-daisy',
      '.fab-bubble', '.fab-goose', '.fab-garland', '.fab-stork', '.fx-garland', '.fx-stork-flight',
    ]) {
      expect(css, cls).toContain(cls)
    }
  })

  it('cada diseño declarado está registrado (componente o piel de CSS)', async () => {
    const manifest = await loadTheme('arrullo')
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

  it('la portada y la música llevan sus diseños propios', async () => {
    const manifest = await loadTheme('arrullo')
    expect(manifest?.sections['hero-envelope'].variant).toBe('lazo')
    expect(manifest?.sections['music-player'].variant).toBe('movil')
    expect(sectionVariants['hero-envelope'].lazo).toBeTypeOf('function')
    expect(sectionVariants['music-player'].movil).toBeTypeOf('function')
  })

  it('la bendición, la frase, la fecha y la cuenta regresiva llevan sus diseños propios', async () => {
    const manifest = await loadTheme('arrullo')
    const expected = {
      blessing: 'medallon',
      quote: 'nube',
      'save-the-date': 'globos',
      countdown: 'cubos',
    }
    for (const [type, variant] of Object.entries(expected)) {
      expect(manifest?.sections[type].variant, type).toBe(variant)
      expect(sectionVariants[type][variant], type).toBeTypeOf('function')
    }
    // conservan los efectos que ya tenían
    expect(manifest?.sections.blessing.effects).toEqual(['reveal'])
    expect(manifest?.sections['save-the-date'].effects).toEqual(['reveal'])
    expect(manifest?.sections.countdown.effects).toEqual(['reveal', 'crib-mobile'])
  })

  it('la foto, la galería, la ubicación y el itinerario llevan sus diseños propios', async () => {
    const manifest = await loadTheme('arrullo')
    const expected = {
      'photo-arch': 'retrato',
      gallery: 'medallones',
      location: 'caminito',
      itinerary: 'ropita',
    }
    for (const [type, variant] of Object.entries(expected)) {
      expect(manifest?.sections[type].variant, type).toBe(variant)
      expect(sectionVariants[type][variant], type).toBeTypeOf('function')
    }
    expect(manifest?.sections.location.effects).toEqual(['reveal', 'daisies'])
    expect(manifest?.sections.itinerary.effects).toEqual(['timeline-fill', 'goose-walk'])
  })

  it('define los tokens de color de los paneles que se turnan', () => {
    for (const token of [
      '--color-rubor', '--color-salvia', '--color-salvia-clara', '--color-oro',
      '--color-durazno', '--color-cielo', '--color-mantequilla',
    ]) {
      expect(themeCss, token).toContain(`${token}:`)
    }
    for (const bg of ['paper', 'rubor', 'salvia-clara']) {
      expect(themeCss, bg).toContain(`.section--bg-${bg}`)
    }
  })

  it('los adornos nuevos son compartidos: cualquier tema los encuentra', () => {
    const assets = themeAssets('marfil')
    for (const file of [
      'mono.svg', 'mono-linea.svg', 'carriola.svg', 'gansito.svg', 'globo.svg', 'margarita.svg',
      'ramita.svg', 'nube.svg', 'luna.svg', 'cubo.svg', 'caja-regalo.svg', 'pinza.svg',
      'ropita-1.svg', 'ropita-2.svg', 'ropita-3.svg', 'ropita-4.svg', 'ropita-5.svg',
    ]) {
      expect(assets[file], file).toBeTruthy()
    }
    expect(themeAssets('arrullo')['carriola.svg']).toBeTruthy()
  })
})
