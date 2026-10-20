import { describe, expect, it } from 'vitest'
import { MIN_PASSWORD } from '../managerAccountService'
import {
  accountPasswordProblem,
  generatePassword,
  hasSpaces,
  PANEL_PASSWORD_MAX,
  PANEL_PASSWORD_MIN,
  panelPasswordProblem,
  stripSpaces,
} from '../passwordService'

describe('passwordService', () => {
  it('acepta de 8 a 64 caracteres imprimibles, sin espacios', () => {
    expect(panelPasswordProblem('clave-2026')).toBeNull()
    expect(panelPasswordProblem('a'.repeat(PANEL_PASSWORD_MIN))).toBeNull()
    expect(panelPasswordProblem('a'.repeat(PANEL_PASSWORD_MAX))).toBeNull()
  })

  it('explica qué corregir', () => {
    expect(panelPasswordProblem('corta')).toContain(String(PANEL_PASSWORD_MIN))
    expect(panelPasswordProblem('a'.repeat(PANEL_PASSWORD_MAX + 1))).toContain(
      String(PANEL_PASSWORD_MAX),
    )
    expect(panelPasswordProblem('clave con espacio')).toMatch(/espacios/)
    expect(panelPasswordProblem('clave-ñx')).toMatch(/acentos/)
  })

  it('quita cualquier espacio, también los que no se ven', () => {
    expect(stripSpaces(' abcd efgh\tjkmn\n')).toBe('abcdefghjkmn')
    // El espacio duro (U+00A0) llega al copiar de WhatsApp o de una página.
    expect(stripSpaces('abcd efgh')).toBe('abcdefgh')
    expect(hasSpaces('abcd efgh')).toBe(true)
    expect(hasSpaces('abcd-efgh')).toBe(false)
  })

  it('las cuentas del gestor: largo, sin espacios y distinta del usuario', () => {
    expect(accountPasswordProblem('la-de-ana-2026', 'ana')).toBeNull()
    expect(accountPasswordProblem('corta')).toContain(String(MIN_PASSWORD))
    expect(accountPasswordProblem('mi clave de ana')).toMatch(/espacios/)
    expect(accountPasswordProblem('ana@correo.com', 'ana@correo.com')).toMatch(/usuario/)
  })

  it('genera claves legibles, sin espacios, que sirven para el panel y para las cuentas', () => {
    // Cada valor de 32 bits cae en la primera letra del alfabeto: "aaaa-aaaa-aaaa".
    expect(generatePassword((values) => values.fill(0))).toBe('aaaa-aaaa-aaaa')
    expect(generatePassword((values) => values.fill(1))).toBe('bbbb-bbbb-bbbb')
    for (let i = 0; i < 20; i++) {
      const password = generatePassword()
      expect(password).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/)
      expect(panelPasswordProblem(password)).toBeNull()
      expect(accountPasswordProblem(password)).toBeNull()
    }
  })
})
