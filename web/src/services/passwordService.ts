import { MIN_PASSWORD } from './managerAccountService'

/**
 * Las claves del gestor: la del panel del cliente ("Datos generales") y las de las cuentas
 * (la propia y la que quien administra le pone a otra persona). Ninguna lleva espacios; las
 * reglas son las mismas que valida el servidor (`EventController::settings` y
 * `ManagerUsers::checkPassword`) y se revisan aquí antes de guardar para no perder lo escrito
 * cuando el servidor la rechaza.
 */

export const PANEL_PASSWORD_MIN = 8
export const PANEL_PASSWORD_MAX = 64
export const ACCOUNT_PASSWORD_MAX = 128

/** Imprimibles ASCII sin espacio: letras, números y símbolos. */
export const PANEL_PASSWORD_PATTERN = /^[\x21-\x7E]+$/

/** Cualquier espacio (también el que no se ve, como el que trae lo copiado de WhatsApp). */
const SPACES = /\s/g

/** La clave sin espacios: así se queda lo que se escribe o se pega en un campo de clave. */
export function stripSpaces(value: string): string {
  return value.replace(SPACES, '')
}

export function hasSpaces(value: string): boolean {
  return /\s/.test(value)
}

/** null si sirve; si no, el mensaje para la persona. */
export function panelPasswordProblem(value: string): string | null {
  if (value.length < PANEL_PASSWORD_MIN) {
    return `La clave lleva al menos ${PANEL_PASSWORD_MIN} caracteres.`
  }
  if (value.length > PANEL_PASSWORD_MAX) {
    return `La clave lleva cuando mucho ${PANEL_PASSWORD_MAX} caracteres.`
  }
  if (!PANEL_PASSWORD_PATTERN.test(value)) {
    return 'La clave no lleva espacios ni acentos: solo letras, números y símbolos.'
  }

  return null
}

/** La de una cuenta del gestor: de 10 a 128 caracteres, sin espacios y distinta del usuario. */
export function accountPasswordProblem(value: string, username = ''): string | null {
  if (value.length < MIN_PASSWORD) return `La clave lleva al menos ${MIN_PASSWORD} caracteres.`
  if (value.length > ACCOUNT_PASSWORD_MAX) {
    return `La clave lleva cuando mucho ${ACCOUNT_PASSWORD_MAX} caracteres.`
  }
  if (hasSpaces(value)) return 'La clave no lleva espacios.'
  if (username && value.trim().toLowerCase() === username.toLowerCase()) {
    return 'La clave no puede ser igual al usuario.'
  }

  return null
}

/**
 * Clave legible como la que da el servidor (`DesignFactory::password`): "abcd-efgh-jkmn",
 * sin espacios ni letras que se confunden. Sirve para el panel y para las cuentas.
 */
export function generatePassword(
  random: (values: Uint32Array) => void = (values) => crypto.getRandomValues(values),
): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  const values = new Uint32Array(12)
  random(values)
  const chars = [...values].map((n) => alphabet[n % alphabet.length])

  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8).join('')}`
}
