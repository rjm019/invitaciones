import { describe, expect, it } from 'vitest'
import {
  colorValue,
  eventTexts,
  needsServer,
  previewPatch,
  sectionCanvas,
  sectionColors,
  sectionTextStyles,
} from '../previewPatchService'
import type { Catalog, Design, DesignSection } from '@/types/design'

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

describe('previewPatchService', () => {
  it('da lo mismo que el servidor para paleta, fuentes, colores y textos', () => {
    const patch = previewPatch(catalog, design)

    expect(patch.palette).toEqual({ primary: '#96792C', accent: '#2F4A7A', lino: '#F0EDE8' })
    expect(patch.fonts).toEqual({ script: 'Great Vibes' })
    expect(patch.sections?.itinerario).toMatchObject({
      colors: undefined,
      text_styles: { title: { font: 'Playfair Display', color: 'accent' }, time: { size: 1.2 } },
    })
    expect(patch.sections?.vestimenta).toMatchObject({
      colors: { text: '#FFFFFF' },
      text_styles: { title: { color: 'accent' } },
    })
    // Las secciones ocultas no se publican: tampoco van en el cambio.
    expect(patch.sections).not.toHaveProperty('confirmacion')
    expect(patch.extra_fonts).toEqual(['Playfair Display'])
  })

  it('los textos de cada sección pasan como los deja el servidor (trim; vacío o "0", sin texto)', () => {
    const patch = previewPatch(catalog, {
      ...design,
      sections: [
        {
          id: 'frase',
          fields: {
            titulo: '  Nuestra frase \n',
            subtitulo: '0',
            texto: 'Hola\nmundo',
            boton: '   ',
          },
          items: [],
        },
        // Un espacio duro no lo quita PHP: tampoco aquí.
        { id: 'cierre', fields: { titulo: 'Gracias\u00a0' }, items: [] },
      ],
    })
    expect(patch.sections?.frase).toMatchObject({
      title: 'Nuestra frase',
      subtitle: undefined,
      text: 'Hola\nmundo',
      button: undefined,
    })
    expect(patch.sections?.cierre?.title).toBe('Gracias\u00a0')
  })

  it('del evento, el título, los nombres y el salón como en InvitationConfigBuilder', () => {
    expect(
      eventTexts({
        festejada: ' Ana Sofía ',
        titulo: 'XV de Ana',
        salon: 'Jardín',
        salon_ciudad: '',
      }),
    ).toEqual({
      title: 'XV de Ana',
      subtitle: '',
      celebrant: { full_name: 'Ana Sofía', short_name: 'Ana Sofía' },
      venue: { name: 'Jardín', display_name: 'Jardín', city: '', address: '' },
    })
    expect(
      eventTexts({
        festejada: 'Ana',
        festejada_corto: 'Anita',
        pareja: 'Luis',
        salon_nombre_visible: 'El Jardín',
      }),
    ).toMatchObject({
      celebrant: { full_name: 'Ana', short_name: 'Anita', partner_name: 'Luis' },
      venue: { name: '', display_name: 'El Jardín' },
    })
  })

  it('sabe qué cambios necesita la vista previa del servidor y cuáles ya muestra sola', () => {
    const base: Design = {
      event: { tema: 'jardin-azul', festejada: 'Ana', inicia: '2026-11-28 17:00' },
      colors: { primario: '#96792C' },
      fonts: {},
      texts: {},
      page: { fondo: 'papel.webp' },
      sections: [
        { id: 'itinerario', fields: { titulo: 'Itinerario' }, items: [{ actividad: 'Recepción' }] },
        { id: 'clima', fields: {}, items: [] },
      ],
    }
    const change = (fn: (d: Design) => void): boolean => {
      const next = JSON.parse(JSON.stringify(base)) as Design
      fn(next)
      return needsServer(base, next)
    }
    // Ya se ven al instante: estilo y textos tal cual.
    expect(change((d) => (d.colors.primario = '#C2185B'))).toBe(false)
    expect(change((d) => (d.texts.titulo_fuente = 'Great Vibes'))).toBe(false)
    expect(change((d) => (d.sections[0].fields.titulo = 'Programa'))).toBe(false)
    expect(change((d) => (d.sections[0].fields.titulo_tamano = '130'))).toBe(false)
    expect(change((d) => (d.sections[0].fields.color_texto = '#FFFFFF'))).toBe(false)
    expect(change((d) => (d.event.festejada = 'Ana Sofía'))).toBe(false)
    expect(change((d) => (d.event.mensaje_whatsapp = 'Hola {familia}'))).toBe(false)
    // Necesitan al servidor.
    expect(change((d) => (d.sections[0].items[0].actividad = 'Vals'))).toBe(true)
    expect(change((d) => (d.sections[0].fields.color_fondo = '#FFFFFF'))).toBe(true)
    expect(change((d) => (d.sections[1].fields.visible = 'NO'))).toBe(true)
    expect(change((d) => d.sections.reverse())).toBe(true)
    expect(change((d) => d.sections.push({ id: 'frase', fields: {}, items: [] }))).toBe(true)
    expect(change((d) => (d.event.inicia = '2026-11-29 17:00'))).toBe(true)
    expect(change((d) => (d.page.fondo = 'otro.webp'))).toBe(true)
    // Una mezcla necesita al servidor.
    expect(
      change((d) => {
        d.colors.primario = '#C2185B'
        d.event.tema = 'otro'
      }),
    ).toBe(true)
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

  it('el lienzo sale como en InvitationConfigBuilder (mismos datos que su prueba)', () => {
    const section: DesignSection = {
      id: 'fecha',
      fields: {},
      items: [],
      canvas: [
        {
          objetivo: 'texto:title:0',
          x: '12,5',
          y: '-3',
          rotacion: '-15',
          escala: '1.2',
          voltear_h: 'SI',
          oculto: 'NO',
          capa: '2',
          e_x: '40',
          e_oculto: 'SI',
        },
        {
          tipo: 'texto',
          texto: 'Hola',
          letra: 'Great Vibes',
          tamano: '6',
          alineacion: 'centro',
          color: '#abcdef',
          ancho: '50',
          opacidad: '80',
        },
        { tipo: 'imagen', imagen: 'salon.webp', radio: '10', borde: '2' },
        { tipo: 'forma', forma: 'circulo', color: 'acento' },
      ],
    }
    const canvas = sectionCanvas(catalog, section)

    expect(canvas[0]).toEqual({
      id: 'lienzo-1',
      target: 'texto:title:0',
      x: 12.5,
      y: -3,
      rotation: -15,
      scale: 1.2,
      flip_h: true,
      hidden: false,
      layer: 2,
      desktop: { x: 40, hidden: true },
    })
    expect(canvas[1]).toEqual({
      id: 'lienzo-2',
      kind: 'text',
      text: 'Hola',
      font: 'Great Vibes',
      size: 6,
      align: 'center',
      color: '#ABCDEF',
      width: 50,
      opacity: 80,
    })
    expect(canvas[2]).toEqual({
      id: 'lienzo-3',
      kind: 'image',
      image: 'salon.webp',
      radius: 10,
      border: 2,
    })
    expect(canvas[3]).toMatchObject({ kind: 'shape', shape: 'circle', color: 'accent' })
  })

  it('el alto, la escala vertical y eliminado salen como en InvitationConfigBuilder (mismos datos que su prueba)', () => {
    const canvas = sectionCanvas(catalog, {
      id: 'fecha',
      fields: {},
      items: [],
      canvas: [
        { tipo: 'imagen', imagen: 'salon.webp', ancho: '40', alto: '25,5', e_alto: '30' },
        { objetivo: 'texto:title:0', escala: '1.5', escala_y: '0.8', e_escala_y: '1', eliminado: 'NO', e_eliminado: 'SI' },
        { objetivo: 'imagen:0', eliminado: 'SI' },
      ],
    })
    expect(canvas[0]).toMatchObject({ height: 25.5, desktop: { height: 30 } })
    expect(canvas[1]).toMatchObject({ scale_y: 0.8, removed: false, desktop: { scale_y: 1, removed: true } })
    expect(canvas[2]).toMatchObject({ removed: true })
    const bad = sectionCanvas(catalog, {
      id: 'fecha',
      fields: {},
      items: [],
      canvas: [{ objetivo: 'texto:title:0', alto: '700', escala_y: '9', eliminado: 'quizá' }],
    })
    expect(bad).toEqual([{ id: 'lienzo-1', target: 'texto:title:0' }])
  })

  it('un valor del lienzo fuera de rango se omite y el elemento sin objetivo ni tipo no pasa', () => {
    const canvas = sectionCanvas(catalog, {
      id: 'fecha',
      fields: {},
      items: [],
      canvas: [
        {
          objetivo: 'texto:title:0',
          x: '500',
          escala: '0',
          opacidad: '101',
          rotacion: '400',
          voltear_h: 'tal vez',
          capa: '1.5',
          e_ancho: '0',
        },
        { objetivo: 'cualquiera' },
        { x: '5' },
        { tipo: 'texto' },
        { tipo: 'forma', forma: 'estrella' },
      ],
    })

    expect(canvas).toEqual([{ id: 'lienzo-1', target: 'texto:title:0' }])
  })

  it('sin filas de lienzo la sección no lleva lienzo en el parche', () => {
    expect(previewPatch(catalog, design).sections?.itinerario.canvas).toBeUndefined()
  })

  it('mover, girar o escalar un elemento ya se ve al instante; cambiar una imagen necesita al servidor', () => {
    const base: Design = {
      event: { tema: 'jardin-azul' },
      colors: {},
      fonts: {},
      texts: {},
      page: {},
      sections: [
        {
          id: 'itinerario',
          fields: {},
          items: [],
          canvas: [
            { objetivo: 'texto:title:0', x: '10' },
            { tipo: 'imagen', imagen: 'a.webp' },
          ],
        },
      ],
    }
    const change = (fn: (d: Design) => void): boolean => {
      const next = JSON.parse(JSON.stringify(base)) as Design
      fn(next)
      return needsServer(base, next)
    }
    expect(change((d) => (d.sections[0].canvas![0].x = '55'))).toBe(false)
    expect(change((d) => (d.sections[0].canvas![0].rotacion = '20'))).toBe(false)
    expect(change((d) => d.sections[0].canvas!.push({ tipo: 'forma', forma: 'linea' }))).toBe(false)
    expect(change((d) => (d.sections[0].canvas![1].imagen = 'b.webp'))).toBe(true)
    expect(change((d) => d.sections[0].canvas!.push({ tipo: 'imagen', imagen: 'c.webp' }))).toBe(
      true,
    )
  })
})
