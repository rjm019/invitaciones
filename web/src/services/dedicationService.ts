import type { DedicationPayload } from '@/types/invitation'

/**
 * Formulario de dedicatorias, sin Vue. Repite las reglas del servidor solo para avisar
 * antes de enviar: la última palabra (y el "una por enlace") la tiene la API.
 */

export const MAX_DEDICATION_NAME = 80
export const MAX_DEDICATION_MESSAGE = 600

/** Errores por campo: name o message. */
export type DedicationErrors = Partial<Record<keyof DedicationPayload, string>>

/** Nombre en una línea; texto con sus renglones (máximo una línea en blanco seguida). */
export function toDedicationPayload(name: string, message: string): DedicationPayload {
  return {
    name: name.trim().replace(/\s+/g, ' '),
    message: message
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  }
}

export function validateDedication(payload: DedicationPayload): DedicationErrors {
  const errors: DedicationErrors = {}
  if (!payload.name) errors.name = 'Escribe tu nombre.'
  else if (payload.name.length > MAX_DEDICATION_NAME)
    errors.name = `Tu nombre es muy largo (máximo ${MAX_DEDICATION_NAME} letras).`
  if (!payload.message) errors.message = 'Escribe tu dedicatoria.'
  else if (payload.message.length > MAX_DEDICATION_MESSAGE)
    errors.message = `Tu dedicatoria es muy larga (máximo ${MAX_DEDICATION_MESSAGE} letras).`
  return errors
}

/** Errores 422 de Laravel ({ name: ['…'] }) → un mensaje por campo. */
export function dedicationErrors(errors: Record<string, string[]> | string[]): DedicationErrors {
  if (Array.isArray(errors)) return {}
  const out: DedicationErrors = {}
  if (errors.name?.[0]) out.name = errors.name[0]
  if (errors.message?.[0]) out.message = errors.message[0]
  return out
}
