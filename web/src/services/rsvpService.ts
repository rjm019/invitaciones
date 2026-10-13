import type { Invitation, InvitationGuest, RsvpPayload } from '@/types/invitation'

/**
 * Lógica del formulario por lugares, sin Vue. Las validaciones repiten las del servidor
 * solo para avisar antes de enviar: la última palabra la tiene la API.
 */

export const MAX_NAME = 120

/** Errores por campo: attending, guests o guests.<lugar>. */
export type RsvpErrors = Record<string, string>

export interface GuestSlot {
  slot: number
  /** El nombre ya registrado (fijo), o null si el lugar está libre. */
  guest: InvitationGuest | null
}

/** Un renglón por lugar (1…N), con su nombre si ya se envió. */
export function slotsOf(invitation: Invitation): GuestSlot[] {
  const bySlot = new Map(invitation.guests.map((g) => [g.slot, g]))
  return Array.from({ length: invitation.passes }, (_, i) => ({
    slot: i + 1,
    guest: bySlot.get(i + 1) ?? null,
  }))
}

/** "Pase para 1 invitado" / "Pase para 3 invitados". */
export function passesLabel(passes: number): string {
  return passes === 1 ? 'Pase para 1 invitado' : `Pase para ${passes} invitados`
}

/** Las opciones hablan en plural si se están mandando varios nombres. */
export function choiceLabels(names: number): { yes: string; no: string } {
  return names > 1
    ? { yes: 'Asistiremos', no: 'Lo sentimos, no asistiremos' }
    : { yes: 'Asistiré', no: 'Lo siento, no asistiré' }
}

const normalize = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')

/**
 * @param names lugar → lo escrito en ese lugar libre
 * @param registered nombres ya registrados (para avisar si se repite uno)
 */
export function validateNewGuests(
  names: Record<number, string>,
  attending: boolean | null,
  registered: string[] = [],
): RsvpErrors {
  const errors: RsvpErrors = {}
  const filled = Object.entries(names).filter(([, n]) => n.trim())
  if (!filled.length) errors.guests = 'Escribe al menos un nombre.'
  if (attending === null) errors.attending = 'Dinos si podrás asistir.'

  const seen = new Set(registered.map(normalize))
  for (const [slot, name] of filled) {
    if (name.trim().length > MAX_NAME)
      errors[`guests.${slot}`] = `El nombre es muy largo (máximo ${MAX_NAME} letras).`
    else if (seen.has(normalize(name)))
      errors[`guests.${slot}`] = 'Ese nombre ya está en tu invitación.'
    seen.add(normalize(name))
  }
  return errors
}

/** Solo los lugares con nombre, en orden; `slots` dice de qué lugar salió cada nombre. */
export function toPayload(
  names: Record<number, string>,
  attending: boolean,
): { payload: RsvpPayload; slots: number[] } {
  const filled = Object.entries(names)
    .map(([slot, name]) => ({ slot: Number(slot), name: name.trim().replace(/\s+/g, ' ') }))
    .filter((e) => e.name)
    .sort((a, b) => a.slot - b.slot)
  return {
    payload: { attending, guests: filled.map((e) => ({ full_name: e.name })) },
    slots: filled.map((e) => e.slot),
  }
}

/** Errores 422 de Laravel (guests.0.full_name) → el lugar donde se escribió ese nombre. */
export function inputErrors(
  errors: Record<string, string[]> | string[],
  slots: number[],
): RsvpErrors {
  if (Array.isArray(errors)) return {}
  return Object.fromEntries(
    Object.entries(errors).map(([key, messages]) => {
      const match = /^guests\.(\d+)\.full_name$/.exec(key)
      return [match ? `guests.${slots[Number(match[1])] ?? ''}` : key, messages[0] ?? '']
    }),
  )
}

/** "Ana", "Ana y Luis", "Ana, Luis y Eva". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}
