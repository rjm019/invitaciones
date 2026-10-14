import { describe, expect, it } from 'vitest'
import { colorValue, sectionColors, sectionTextStyles, stylePatch } from '../stylePatchService'
import type { Catalog, Design } from '@/types/design'

const catalog = {
  colors: [
    { key: 'fondo', token: 'bg' },
    { key: 'texto', token: 'text' },
    { key: 'primario', token: 'primary' },
    { key: 'acento', token: 'accent' },
    { key: 'acento_fuerte', token: 'accent-strong' },
  ],
  fonts: [
    { key: 'script', role: 'script' },
    { key: 'script_mono', role: 'script-mono' },
  ],
  texts: [
    { key: 'titulo', block: 'title' },
    { key: 'subtitulo', block: 'subtitle' },
    { key: 'texto', block: 'text' },
    { key: 'boton', block: 'button' },
  ],
  text_size: { min: 50, max: 250 },
  sections: [
    {
      id: 'itinerario',
      texts: [
        { key: 'titulo', block: 'title' },
        { key: 'hora', block: 'time' },
        { key: 'actividad', block: 'activity' },
      ],
    },
    {
      id: 'vestimenta',
      texts: [
        { key: 'titulo', block: 'title' },
        { key: 'subtitulo', block: 'subtitle' },
        { key: 'texto', block: 'text' },
      ],
    },
  ],
} as unknown as Catalog

// Los mismos datos que tests/Fixtures/eventos/nueva (api): el resultado debe ser el que da
// InvitationConfigBuilder (ver InvitationConfigBuilderTest).
const design: Design = {
  event: {},
  colors: { primario: '#96792c', acento: '#2F4A7A', lino: '#F0EDE8', mal: 'dorado' },
  fonts: { script: 'Great Vibes', script_mono: 'mala"fuente' },
  texts: { titulo_color: 'acento' },
  page: {},
  sections: [
    {
      id: 'itinerario',
      fields: { titulo_fuente: 'Playfair Display', hora_tamano: '120' },
      items: [],
    },
    { id: 'vestimenta', fields: { color_fondo: 'marco', color_texto: '#ffffff' }, items: [] },
    { id: 'confirmacion', fields: { visible: 'NO', titulo_color: '#000000' }, items: [] },
  ],
}

describe('stylePatchService', () => {
  it('da lo mismo que el servidor para paleta, fuentes, colores y textos', () => {
    const patch = stylePatch(catalog, design)

    expect(patch.palette).toEqual({ primary: '#96792C', accent: '#2F4A7A', lino: '#F0EDE8' })
    expect(patch.fonts).toEqual({ script: 'Great Vibes' })
    expect(patch.sections?.itinerario).toEqual({
      colors: undefined,
      text_styles: { title: { font: 'Playfair Display', color: 'accent' }, time: { size: 1.2 } },
    })
    expect(patch.sections?.vestimenta).toEqual({
      colors: { text: '#FFFFFF' },
      text_styles: { title: { color: 'accent' } },
    })
    // Las secciones ocultas no se publican: tampoco van en el cambio.
    expect(patch.sections).not.toHaveProperty('confirmacion')
    expect(patch.extra_fonts).toEqual(['Playfair Display'])
  })

  it('un nombre de la paleta se vuelve su token; lo inválido no pasa', () => {
    expect(colorValue(catalog, 'acento_fuerte')).toBe('accent-strong')
    expect(colorValue(catalog, '#abc')).toBe('#ABC')
    expect(colorValue(catalog, '#12')).toBeNull()
    expect(colorValue(catalog, 'url(x)')).toBeNull()
    expect(
      sectionColors(catalog, { id: 'x', fields: { color_panel_alt: '#FFFFFF' }, items: [] }),
    ).toEqual({ 'panel-alt': '#FFFFFF' })
  })

  it('el tamaño va de 50 a 250 %', () => {
    const styles = sectionTextStyles(
      catalog,
      { id: 'itinerario', fields: { titulo_tamano: '400', hora_tamano: '80%' }, items: [] },
      {},
    )
    expect(styles).toEqual({ time: { size: 0.8 } })
  })
})
