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

  it('cada diseño del tema está registrado (componente o piel de CSS)', async () => {
    const manifest = await loadTheme('encaje')
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

  it('trae los diseños de la etapa 6b-2 (grabado, bastidor, tarjetas y encaje)', async () => {
    const manifest = await loadTheme('encaje')
    const variants = Object.fromEntries(
      Object.entries(manifest!.sections).map(([type, s]) => [type, s.variant]),
    )
    expect(variants).toMatchObject({
      itinerary: 'grabado',
      location: 'grabado',
      gallery: 'bastidor',
      trivia: 'tarjetas',
      video: 'encaje',
      'social-post': 'encaje',
    })
    expect(sectionVariants.itinerary.grabado).toBeTypeOf('function')
    expect(sectionVariants.location.grabado).toBeTypeOf('function')
    expect(sectionVariants.gallery.bastidor).toBeTypeOf('function')
    // La hacienda es un adorno compartido: cualquier tema la encuentra.
    expect(themeAssets('marfil')['hacienda.svg']).toBeTruthy()
  })

  it('el sobre central es una portada registrada que el tema puede pedir', () => {
    expect(sectionVariants['hero-envelope']['sobre-central']).toBeTypeOf('function')
  })

  it('los efectos de tela y encaje del tema existen en el catálogo de la web', async () => {
    const manifest = await loadTheme('encaje')
    const used = new Set(Object.values(manifest!.sections).flatMap((s) => s.effects ?? []))
    for (const effect of [
      'lace-spin', 'lace-wave', 'lace-draw', 'spotlight', 'spotlight-travel', 'pearl-glint',
      'satin-sweep', 'drape-sway', 'pearl-strands', 'petals', 'light-dust', 'tulle-breathe',
      'stitch-in', 'breathe',
    ]) {
      expect(used.has(effect), effect).toBe(true)
    }
    // Y cada capa tiene su regla de CSS.
    const css = readFileSync(resolve(process.cwd(), 'src/effects/fabric.css'), 'utf8')
    for (const cls of ['.fab-doily', '.fab-lace', '.fab-draw', '.fab-beam', '.fab-pearl', '.fab-satin', '.fab-drape', '.fab-strand', '.fab-petal', '.fab-mote', '.fab-tulle', '.fx-stitch-in', '.fx-breathe']) {
      expect(css, cls).toContain(cls)
    }
  })
})
