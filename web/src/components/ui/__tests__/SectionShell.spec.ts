import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { computed, defineComponent, h } from 'vue'
import { provideEvent } from '@/composables/useEvent'
import type { EventConfig, ResolvedSection } from '@/types/event'
import SectionShell from '../SectionShell.vue'

function render(section: Partial<ResolvedSection>) {
  return mount(
    defineComponent({
      setup() {
        provideEvent({
          event: computed(() => ({}) as EventConfig),
          resolveAsset: computed(() => (path?: string | null) => path ?? null),
        })
        return () =>
          h(
            SectionShell,
            {
              section: {
                id: 'closing',
                type: 'closing',
                effects: [],
                visible: true,
                desktop: 'full',
                panel: true,
                decor: {},
                ...section,
              } as ResolvedSection,
            },
            () => h('p', 'contenido'),
          )
      },
    }),
  )
}

describe('SectionShell: efectos de ambiente (Nueva York)', () => {
  it('pinta el horizonte en tres capas, los reflectores, las luces, la escarcha y el reflejo', () => {
    const wrapper = render({
      effects: ['skyline', 'searchlights', 'city-lights', 'glitter', 'sheen'],
    })
    expect(wrapper.find('section').classes()).toContain('fx-skyline')
    expect(wrapper.findAll('.fx-skyline-layer')).toHaveLength(3)
    // Ventanas: dos juegos en la capa de en medio y uno en la de enfrente.
    expect(wrapper.findAll('.fx-skyline-windows')).toHaveLength(3)
    expect(wrapper.findAll('.fx-beam')).toHaveLength(2)
    expect(wrapper.findAll('.fx-bokeh')).toHaveLength(12)
    expect(wrapper.findAll('.fx-speck').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.section__sheen')).toHaveLength(1)
    // El reflejo va encima del contenido; el ambiente, debajo.
    const children = [...wrapper.find('section').element.children].map((el) => el.className)
    const at = (name: string) => children.findIndex((c) => c.split(' ').includes(name))
    expect(at('ambience')).toBeLessThan(at('section__content'))
    expect(at('section__content')).toBeLessThan(at('section__sheen'))
  })

  it('cada capa del horizonte avanza a su ritmo y pasa por la velocidad de la invitación', () => {
    const layers = render({ effects: ['skyline'] }).findAll('.fx-skyline-layer')
    const durations = layers.map((l) => l.attributes('style'))
    expect(new Set(durations).size).toBe(3)
    expect(durations.every((d) => d?.includes('var(--motion-scale)'))).toBe(true)
  })

  it('sin panel (la portada) el ambiente llega a la orilla de la pantalla', () => {
    const hero = render({
      id: 'hero-envelope',
      type: 'hero-envelope',
      panel: false,
      effects: ['skyline'],
    })
    expect(hero.find('.ambience').classes()).toContain('ambience--bleed')
    expect(
      render({ effects: ['skyline'] })
        .find('.ambience')
        .classes(),
    ).not.toContain('ambience--bleed')
  })

  it('sin esos efectos no agrega capas', () => {
    const wrapper = render({ effects: ['reveal'] })
    expect(wrapper.find('.ambience').exists()).toBe(false)
    expect(wrapper.find('.section__sheen').exists()).toBe(false)
  })
})

describe('SectionShell: secciones difuminadas y bola disco', () => {
  it('difuminada no es panel: con color de fondo es una franja con su hoja y sus orillas', () => {
    const wrapper = render({ effects: ['blend'], background: { color: 'paper' } })
    const section = wrapper.find('section')
    expect(section.classes()).toEqual(
      expect.arrayContaining(['section--blend', 'section--bg-paper', 'section--has-bg']),
    )
    expect(section.classes()).not.toContain('section--panel')
    // El color va en su capa (para fundir las orillas), no en la sección.
    expect(wrapper.find('.section__sheet .section__fill').exists()).toBe(true)
    expect(wrapper.findAll('.section__sheet .section__edge')).toHaveLength(2)
    // Cada franja corta su orilla en otro punto: el corrimiento sale de su id.
    expect(section.attributes('style')).toMatch(/--blend-shift: \d+px/)
  })

  it('la orilla elegida pone su clase (y la hoja rasgada, su fibra y su sombra)', () => {
    const torn = render({ effects: ['blend'], background: { color: 'paper' }, edge: 'torn' })
    expect(torn.find('section').classes()).toContain('section--edge-torn')
    const city = render({ effects: ['blend'], background: { color: 'frame' }, edge: 'city' })
    expect(city.find('section').classes()).toContain('section--edge-city')
    // Sin difuminar, la orilla no aplica.
    expect(render({ edge: 'city' }).find('section').classes()).not.toContain('section--edge-city')
  })

  it('difuminada sin fondo no pinta hoja; sin "blend", el panel de siempre', () => {
    expect(
      render({ effects: ['blend'] })
        .find('.section__sheet')
        .exists(),
    ).toBe(false)
    const panel = render({ background: { color: 'paper' } })
    expect(panel.find('section').classes()).toContain('section--panel')
    expect(panel.find('.section__sheet').exists()).toBe(false)
  })

  it('la bola disco cuelga sus bolas de espejos (con espejos, rayos y destellos) y sus reflejos', () => {
    const wrapper = render({ effects: ['disco-ball'] })
    expect(wrapper.findAll('.fx-disco')).toHaveLength(2)
    expect(wrapper.findAll('.fx-disco').at(0)!.findAll('.fx-disco__tile').length).toBeGreaterThan(
      100,
    )
    expect(wrapper.findAll('.fx-disco__glint')).toHaveLength(6)
    expect(wrapper.findAll('.fx-disco-spot')).toHaveLength(26)
    // Solo los reflejos, sin bola.
    const lights = render({ effects: ['disco-lights'] })
    expect(lights.findAll('.fx-disco')).toHaveLength(0)
    expect(lights.findAll('.fx-disco-spot')).toHaveLength(20)
  })
})

describe('SectionShell: capas de imagen', () => {
  it('pinta una franja por foto, del mismo alto, con la foto quieta, y quita el relleno', () => {
    const wrapper = render({ type: 'layer', panel: false, layers: ['a.webp', 'b.webp', 'c.webp'] })
    const layers = wrapper.findAll('.section__layer')
    expect(layers).toHaveLength(3)
    expect(layers[1].attributes('style')).toContain('top: 33.3')
    expect(layers[1].find('.section__layer-photo').attributes('style')).toContain('b.webp')
    expect(wrapper.find('section').classes()).toContain('section--has-layers')
    // Las capas van fuera del contenido (que es contenedor y no dejaría la foto quieta).
    expect(wrapper.find('.section__content .section__layers').exists()).toBe(false)
  })

  it('sin fotos no hay capas', () => {
    const wrapper = render({ type: 'layer', panel: false })
    expect(wrapper.find('.section__layers').exists()).toBe(false)
    expect(wrapper.find('section').classes()).not.toContain('section--has-layers')
  })
})

describe('SectionShell: efectos de tela y encaje', () => {
  const ALL = [
    'lace-spin',
    'lace-wave',
    'lace-draw',
    'spotlight',
    'pearl-glint',
    'satin-sweep',
    'drape-sway',
    'pearl-strands',
    'petals',
    'light-dust',
    'tulle-breathe',
  ]

  it('pinta cada capa detrás del contenido y la marca como ambiente', () => {
    const wrapper = render({ effects: ALL })
    expect(wrapper.findAll('.fab-doily')).toHaveLength(2)
    expect(wrapper.findAll('.fab-lace')).toHaveLength(2)
    expect(wrapper.findAll('.fab-draw')).toHaveLength(2)
    expect(wrapper.findAll('.fab-dim')).toHaveLength(1)
    expect(wrapper.findAll('.fab-beam')).toHaveLength(1)
    expect(wrapper.findAll('.fab-pearl')).toHaveLength(15)
    expect(wrapper.findAll('.fab-satin')).toHaveLength(2)
    expect(wrapper.findAll('.fab-drape')).toHaveLength(2)
    expect(wrapper.findAll('.fab-strand')).toHaveLength(7)
    expect(wrapper.findAll('.fab-petal')).toHaveLength(12)
    expect(wrapper.findAll('.fab-mote')).toHaveLength(22)
    expect(wrapper.findAll('.fab-tulle')).toHaveLength(4)
    const children = [...wrapper.find('section').element.children].map((el) => el.className)
    const content = children.findIndex((c) => c.split(' ').includes('section__content'))
    const layers = children.flatMap((c, i) => (c.split(' ').includes('fab') ? [i] : []))
    expect(layers.length).toBeGreaterThan(0)
    expect(Math.max(...layers)).toBeLessThan(content)
    // Son del grupo "ambiente": se pausan y se ocultan lejos de la pantalla.
    expect(wrapper.findAll('.ambience.fab').length).toBe(layers.length)
  })

  it('el foco que viaja reemplaza al fijo y comparte la viñeta', () => {
    const wrapper = render({ effects: ['spotlight', 'spotlight-travel'] })
    expect(wrapper.findAll('.fab--spot')).toHaveLength(1)
    expect(wrapper.find('.fab--spot').classes()).toContain('fab--spot-travel')
  })

  it('bordado y respira son solo CSS: ninguna capa; el bordado pide saber cuándo se ve', () => {
    const wrapper = render({ effects: ['stitch-in', 'breathe'] })
    expect(wrapper.find('.fab').exists()).toBe(false)
    expect(wrapper.find('section').classes()).toEqual(
      expect.arrayContaining(['fx-stitch-in', 'fx-breathe']),
    )
    // El bloque no se desvanece por el bordado (solo el título).
    expect(wrapper.find('.section__content').classes()).toContain('is-cascade-only')
    expect(wrapper.find('.section__content').classes()).toContain('fx-reveal-target')
  })

  it('toda duración y retraso pasa por la velocidad de la invitación', () => {
    const wrapper = render({ effects: ['petals', 'light-dust', 'pearl-strands', 'lace-spin'] })
    for (const sel of ['.fab-petal', '.fab-mote', '.fab-doily']) {
      expect(wrapper.find(sel).attributes('style')).toContain('--motion-scale')
    }
    expect(wrapper.find('.fab-strand').attributes('style')).toContain('--motion-scale')
  })
})

describe('SectionShell: silueta y filete de la tarjeta', () => {
  it('marca la silueta y el filete de la sección para que el CSS los pinte', () => {
    const section = render({ silhouette: 'notch', fillet: 'burgundy' }).find('section')
    expect(section.attributes('data-silhouette')).toBe('notch')
    expect(section.attributes('data-fillet')).toBe('burgundy')
  })

  it('sin ellos no marca nada (la tarjeta se ve como siempre)', () => {
    const section = render({}).find('section')
    expect(section.attributes('data-silhouette')).toBeUndefined()
    expect(section.attributes('data-fillet')).toBeUndefined()
  })
})

describe('SectionShell: lienzo', () => {
  it('sin lienzo no monta nada y no recorta', () => {
    const wrapper = render({})
    expect(wrapper.find('[data-canvas-layer]').exists()).toBe(false)
    expect(wrapper.find('section').classes()).not.toContain('section--canvas')
  })

  it('con elementos libres monta la capa dentro del contenido y recorta en la orilla', () => {
    const wrapper = render({
      canvas: [
        { id: 'lienzo-1', kind: 'text', text: 'Hola', x: 10 },
        { id: 'lienzo-2', target: 'texto:title:0', y: 4 },
      ],
    })
    expect(wrapper.find('section').classes()).toContain('section--canvas')
    expect(wrapper.find('.section__content [data-canvas-layer] .canvas-el').text()).toBe('Hola')
  })

  it('un lienzo que solo acomoda lo existente también recorta, sin capa', () => {
    const wrapper = render({ canvas: [{ id: 'lienzo-1', target: 'imagen:0', x: 2 }] })
    expect(wrapper.find('section').classes()).toContain('section--canvas')
    expect(wrapper.find('[data-canvas-layer]').exists()).toBe(false)
  })
})
