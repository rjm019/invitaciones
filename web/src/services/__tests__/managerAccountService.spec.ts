import { describe, expect, it } from 'vitest'
import {
  accessMessage,
  initials,
  publishedBy,
  suggestUsername,
  USERNAME_PATTERN,
} from '../managerAccountService'

describe('managerAccountService', () => {
  it('propone el usuario con el primer nombre, sin acentos, y no repite', () => {
    expect(suggestUsername('Ana María López')).toBe('ana')
    expect(suggestUsername('  Íñigo   Peña ')).toBe('inigo')
    expect(suggestUsername('Ana María', ['ana'])).toBe('ana.m')
    expect(suggestUsername('Ana María', ['ana', 'ana.m'])).toBe('ana2')
    expect(suggestUsername('Ana', ['ANA', 'ana2'])).toBe('ana3')
    // Muy corto para un usuario: se completa.
    expect(suggestUsername('Bo')).toBe('bo0')
    expect(suggestUsername('Bo', ['bo0'])).toBe('bo02')
    expect(suggestUsername('')).toBe('')
    for (const u of ['ana', 'ana.m', 'ana2', 'inigo', 'bo0'])
      expect(USERNAME_PATTERN.test(u)).toBe(true)
  })

  it('arma el mensaje con el acceso de la persona', () => {
    const message = accessMessage('https://ejemplo.mx/gestor', 'ana', 'k7m2-p9qa-x4tb')
    expect(message).toContain('https://ejemplo.mx/gestor')
    expect(message).toContain('Usuario: ana')
    expect(message).toContain('Clave temporal: k7m2-p9qa-x4tb')
  })

  it('saca las iniciales y dice qué hizo quien dejó cada versión', () => {
    expect(initials('Ana López García')).toBe('AL')
    expect(initials('beto')).toBe('B')
    expect(publishedBy('borrador', 'Ana')).toBe('Ana la publicó')
    expect(publishedBy('nueva', 'Ana')).toBe('Ana la creó')
    expect(publishedBy('copia de nat', 'Beto')).toBe('Beto la copió de /e/nat')
    expect(publishedBy('formato anterior', 'Terminal')).toBe(
      'Terminal la pasó del formato anterior',
    )
    expect(publishedBy(null, null)).toBe('Alguien la publicó')
  })
})
