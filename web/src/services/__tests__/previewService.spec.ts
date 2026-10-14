import { describe, expect, it } from 'vitest'
import {
  applyStylePatch,
  previewInvitation,
  previewRespond,
  previewWeather,
} from '../previewService'
import type { EventConfig } from '@/types/event'

const config = {
  slug: 'nueva',
  palette: { primary: '#96792C' },
  fonts: { script: 'Pinyon Script' },
  rsvp: { mode: 'token', deadline: '2026-11-06', open: true },
  starts_at: '2026-11-28T17:00:00-06:00',
  venue: { city: 'Pachuca, Hidalgo', display_name: 'Salón' },
  sections: [
    {
      type: 'itinerary',
      key: 'itinerario',
      effects: [],
      visible: true,
      colors: { text: '#111111' },
    },
    { type: 'closing', key: 'cierre', effects: [], visible: true },
  ],
} as unknown as EventConfig

describe('previewService', () => {
  it('un cambio de estilo se aplica sin esperar al servidor (y sin tocar lo demás)', () => {
    const next = applyStylePatch(config, {
      palette: { primary: '#C2185B' },
      extra_fonts: ['Great Vibes'],
      sections: { itinerario: { text_styles: { title: { color: 'accent' } } } },
    })
    expect(next.palette).toEqual({ primary: '#C2185B' })
    expect(next.fonts).toBe(config.fonts)
    expect(next.extra_fonts).toEqual(['Great Vibes'])
    // Los colores y estilos de la sección se reemplazan (aquí ya no trae colores).
    expect(next.sections[0]).toMatchObject({
      key: 'itinerario',
      text_styles: { title: { color: 'accent' } },
    })
    expect(next.sections[0].colors).toBeUndefined()
    expect(next.sections[1]).toBe(config.sections[1])
    expect(config.palette).toEqual({ primary: '#96792C' })
  })

  it('la invitación de ejemplo confirma sin pasarse de sus lugares', () => {
    const invitation = previewInvitation(config)
    expect(invitation).toMatchObject({
      label: 'Familia Ejemplo',
      passes: 4,
      remaining: 4,
      open: true,
    })

    const answered = previewRespond(
      invitation,
      { attending: true, guests: [1, 2, 3, 4, 5].map((n) => ({ full_name: ` Persona ${n} ` })) },
      new Date('2026-10-14T12:00:00Z'),
    )
    expect(answered.guests.map((g) => g.full_name)).toEqual([
      'Persona 1',
      'Persona 2',
      'Persona 3',
      'Persona 4',
    ])
    expect(answered.remaining).toBe(0)
  })

  it('el clima de ejemplo usa la ciudad y la hora del evento', () => {
    const weather = previewWeather(config)
    expect(weather).toMatchObject({
      kind: 'typical',
      date: '2026-11-28',
      place: 'Pachuca, Hidalgo',
    })
    expect(weather?.hours.map((h) => h.time)).toEqual(['17:00', '19:00', '21:00', '23:00'])
    expect(previewWeather({ ...config, starts_at: null })).toBeNull()
  })
})
