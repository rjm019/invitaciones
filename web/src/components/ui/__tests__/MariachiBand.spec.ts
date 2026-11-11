import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MariachiBand from '../MariachiBand.vue'

describe('MariachiBand', () => {
  it('trae los tres músicos con sus piezas móviles y sin ids repetibles', () => {
    const w = mount(MariachiBand, { props: { playing: false } })
    expect(w.findAll('.musico')).toHaveLength(3)
    expect(w.findAll('.cabeza')).toHaveLength(3)
    expect(w.findAll('.brazo').length).toBeGreaterThanOrEqual(2)
    expect(w.find('.fuelle').exists()).toBe(true)
    expect(w.find('[id^="musico"]').exists()).toBe(false)
  })

  it('toca solo con playing y el tamaño chico fija su clase', () => {
    expect(mount(MariachiBand, { props: { playing: false } }).find('.mb').classes()).not.toContain('is-playing')
    const w = mount(MariachiBand, { props: { playing: true, size: 'sm' } })
    expect(w.find('.mb').classes()).toEqual(expect.arrayContaining(['is-playing', 'mb--sm']))
  })

  it('las notas salen de tres instrumentos', () => {
    const w = mount(MariachiBand, { props: { playing: true } })
    const origins = new Set(w.findAll('.mb__note').map((n) => (n.attributes('style') ?? '').split(';')[0]))
    expect(origins.size).toBe(3)
  })
})
