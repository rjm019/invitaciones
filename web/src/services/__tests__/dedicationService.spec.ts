import { describe, expect, it } from 'vitest'
import {
  MAX_DEDICATION_MESSAGE,
  MAX_DEDICATION_NAME,
  dedicationErrors,
  toDedicationPayload,
  validateDedication,
} from '../dedicationService'

describe('dedicationService', () => {
  it('limpia el nombre a una línea y deja los renglones del texto', () => {
    expect(
      toDedicationPayload('  Ana   Prueba ', ' ¡Felicidades!\r\n\r\n\r\n\r\nTe   queremos. '),
    ).toEqual({
      name: 'Ana Prueba',
      message: '¡Felicidades!\n\nTe queremos.',
    })
  })

  it('pide nombre y dedicatoria, con su largo máximo', () => {
    expect(validateDedication({ name: '', message: '' })).toEqual({
      name: 'Escribe tu nombre.',
      message: 'Escribe tu dedicatoria.',
    })
    expect(
      validateDedication({
        name: 'a'.repeat(MAX_DEDICATION_NAME + 1),
        message: 'b'.repeat(MAX_DEDICATION_MESSAGE + 1),
      }),
    ).toEqual({
      name: 'Tu nombre es muy largo (máximo 80 letras).',
      message: 'Tu dedicatoria es muy larga (máximo 600 letras).',
    })
    expect(validateDedication({ name: 'Ana', message: 'Hola' })).toEqual({})
  })

  it('los errores 422 del servidor quedan en su campo', () => {
    expect(dedicationErrors({ message: ['Escribe tu dedicatoria.'] })).toEqual({
      message: 'Escribe tu dedicatoria.',
    })
    expect(dedicationErrors([])).toEqual({})
  })
})
