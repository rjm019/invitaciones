import { describe, expect, it } from 'vitest'
import { createScrollGuard, HOLD_MS } from '../scrollGuardService'

describe('createScrollGuard', () => {
  it('sin aviso, la página se mueve libre', () => {
    const guard = createScrollGuard()
    expect(guard.restoreTo(100, 4000)).toBeNull()
  })

  it('después del aviso, lo que mueva la página se regresa a donde estaba', () => {
    const guard = createScrollGuard()
    guard.hold(1000, 250)
    expect(guard.restoreTo(1060, 260)).toBe(250)
    expect(guard.restoreTo(1500, 4400)).toBe(250)
    expect(guard.restoreTo(1510, 250)).toBeNull() // ya regresó
  })

  it('si el invitado toca o gira la rueda, manda él', () => {
    const guard = createScrollGuard()
    guard.hold(1000, 250)
    guard.release()
    expect(guard.restoreTo(1100, 900)).toBeNull()
  })

  it('pasado el tiempo de protección, la página vuelve a moverse libre', () => {
    const guard = createScrollGuard()
    guard.hold(1000, 250)
    expect(guard.restoreTo(1000 + HOLD_MS + 1, 900)).toBeNull()
    expect(guard.restoreTo(1000 + HOLD_MS + 50, 1200)).toBeNull()
  })
})
