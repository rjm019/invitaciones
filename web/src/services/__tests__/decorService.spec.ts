import { describe, expect, it } from 'vitest'
import { decorOr } from '../decorService'

describe('decorOr', () => {
  it('la ranura de la sección o del tema gana; sin ella, el adorno compartido', () => {
    expect(decorOr({ door: '/tema/puerta.svg' }, 'door', '/comun/puerta.svg')).toBe(
      '/tema/puerta.svg',
    )
    expect(decorOr({}, 'door', '/comun/puerta.svg')).toBe('/comun/puerta.svg')
  })

  it('si la invitación lo quitó (null), no se pone el compartido', () => {
    expect(decorOr({ door: null }, 'door', '/comun/puerta.svg')).toBeNull()
  })
})
