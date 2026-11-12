import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PartyGoose from '../PartyGoose.vue'

describe('PartyGoose', () => {
  it('trae cuerpo, cabeza con gorro, moño y dos patas, y es decorativo', () => {
    const w = mount(PartyGoose)
    expect(w.attributes('aria-hidden')).toBe('true')
    expect(w.find('.pg__torso').exists()).toBe(true)
    expect(w.find('.pg__head').exists()).toBe(true)
    expect(w.find('.pg__bow').exists()).toBe(true)
    expect(w.findAll('.pg__leg')).toHaveLength(2)
  })

  it('walking y flip ponen sus clases de estado', () => {
    expect(mount(PartyGoose).find('.pg').classes()).not.toContain('is-walking')
    const w = mount(PartyGoose, { props: { walking: true, flip: true } })
    expect(w.find('.pg').classes()).toEqual(expect.arrayContaining(['is-walking', 'pg--flip']))
  })

  it('balloons pone de 0 a 3 globos y acota lo que se salga', () => {
    expect(mount(PartyGoose).findAll('.pg__balloon')).toHaveLength(0)
    expect(mount(PartyGoose, { props: { balloons: 2 } }).findAll('.pg__balloon')).toHaveLength(2)
    expect(mount(PartyGoose, { props: { balloons: 9 } }).findAll('.pg__balloon')).toHaveLength(3)
    expect(mount(PartyGoose, { props: { balloons: -1 } }).findAll('.pg__balloon')).toHaveLength(0)
  })
})
