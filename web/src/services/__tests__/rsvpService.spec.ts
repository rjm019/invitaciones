import { describe, expect, it } from 'vitest'
import {
  choiceLabels,
  inputErrors,
  joinNames,
  passesLabel,
  slotsOf,
  toPayload,
  validateNewGuests,
} from '../rsvpService'
import type { Invitation } from '@/types/invitation'

const invitation = (over: Partial<Invitation> = {}): Invitation => ({
  label: 'Familia Prueba',
  passes: 3,
  guests: [],
  remaining: 3,
  open: true,
  closed_message: null,
  deadline: '2026-11-06',
  dedication: null,
  ...over,
})
const ana = {
  slot: 1,
  full_name: 'Ana Prueba',
  attending: true,
  responded_at: '2026-10-13T12:00:00-06:00',
}

describe('rsvpService', () => {
  it('un renglón por invitado; los nombres ya enviados quedan en su lugar', () => {
    expect(slotsOf(invitation()).map((s) => s.guest)).toEqual([null, null, null])
    const slots = slotsOf(invitation({ guests: [ana], remaining: 2 }))
    expect(slots.map((s) => [s.slot, s.guest?.full_name ?? null])).toEqual([
      [1, 'Ana Prueba'],
      [2, null],
      [3, null],
    ])
  })

  it('textos del pase y de las opciones (singular o plural)', () => {
    expect(passesLabel(1)).toBe('Pase para 1 invitado')
    expect(passesLabel(3)).toBe('Pase para 3 invitados')
    expect(choiceLabels(1)).toEqual({ yes: 'Asistiré', no: 'Lo siento, no asistiré' })
    expect(choiceLabels(2).yes).toBe('Asistiremos')
  })

  it('valida en español antes de enviar', () => {
    expect(validateNewGuests({ 2: '', 3: ' ' }, null)).toEqual({
      guests: 'Escribe al menos un nombre.',
      attending: 'Dinos si podrás asistir.',
    })
    expect(validateNewGuests({ 2: 'x'.repeat(121) }, true)).toEqual({
      'guests.2': 'El nombre es muy largo (máximo 120 letras).',
    })
    // Un nombre que ya está (o repetido en el mismo envío) se avisa en su lugar.
    expect(validateNewGuests({ 2: ' ana  PRUEBA', 3: 'Luis' }, true, ['Ana Prueba'])).toEqual({
      'guests.2': 'Ese nombre ya está en tu invitación.',
    })
    expect(validateNewGuests({ 2: 'Luis', 3: 'luis' }, true)).toEqual({
      'guests.3': 'Ese nombre ya está en tu invitación.',
    })
    expect(validateNewGuests({ 2: 'Luis' }, false)).toEqual({})
  })

  it('manda solo los lugares con nombre y recuerda de qué lugar salió cada uno', () => {
    expect(toPayload({ 3: ' Eva  Prueba ', 2: '', 1: 'Ana' }, true)).toEqual({
      payload: { attending: true, guests: [{ full_name: 'Ana' }, { full_name: 'Eva Prueba' }] },
      slots: [1, 3],
    })
  })

  it('los errores del servidor caen en el lugar correcto', () => {
    expect(
      inputErrors({ 'guests.1.full_name': ['Falta…'], guests: ['Solo queda 1 lugar.'] }, [2, 3]),
    ).toEqual({
      'guests.3': 'Falta…',
      guests: 'Solo queda 1 lugar.',
    })
    expect(inputErrors([], [1])).toEqual({})
  })

  it('une nombres como se dice en español', () => {
    expect(joinNames(['Ana'])).toBe('Ana')
    expect(joinNames(['Ana', 'Luis'])).toBe('Ana y Luis')
    expect(joinNames(['Ana', 'Luis', 'Eva'])).toBe('Ana, Luis y Eva')
  })
})
