import type { PanelReminders, PanelReminderStatus } from '@/types/panel'

/** Textos y formatos de los recordatorios por WhatsApp del panel (funciones puras). */

const STATUS_LABELS: Record<PanelReminderStatus, string> = {
  responded: 'Respondió',
  no_phone: 'Sin teléfono',
  opted_out: 'Se dio de baja',
  no_whatsapp: 'Sin WhatsApp',
  failed: 'No se pudo enviar',
  read: 'Leído',
  delivered: 'Entregado',
  sent: 'Enviado',
  waiting: 'En espera',
}

export function reminderStatusLabel(status: PanelReminderStatus): string {
  return STATUS_LABELS[status] ?? ''
}

/** Agrupa dígitos de izquierda a derecha en bloques de `size` (el último puede ser menor). */
function chunk(digits: string, size: number): string {
  return (digits.match(new RegExp(`.{1,${size}}`, 'g')) ?? []).join(' ')
}

/**
 * "525512345678" → "+52 55 1234 5678"; "15551234567" → "+1 555 123 4567".
 * Otros países: "+" y los dígitos en grupos de 3. Vacío → "".
 */
export function formatPhone(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('52') && digits.length === 12) {
    const n = digits.slice(2)
    return `+52 ${n.slice(0, 2)} ${n.slice(2, 6)} ${n.slice(6)}`
  }
  if (digits.startsWith('1') && digits.length === 11) {
    const n = digits.slice(1)
    return `+1 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
  }
  return `+${chunk(digits, 3)}`
}

/** "2026-10-31" → "sábado 31 de octubre". */
export function reminderDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  const text = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)))
  return text.replace(',', '')
}

/** La línea de estado de la tarjeta de recordatorios. */
export function reminderStateText(
  reminders: Pick<PanelReminders, 'active' | 'stopped_reason' | 'next_run'>,
): string {
  switch (reminders.stopped_reason) {
    case 'off':
      return 'Apagado'
    case 'no_consent':
      return 'Falta confirmar el permiso'
    case 'deadline':
      return 'Ya pasó la fecha límite'
    case 'cap':
      return 'Se llegó al tope de mensajes'
  }
  if (!reminders.active) return 'Apagado'
  return reminders.next_run ? `Próximo envío: ${reminderDate(reminders.next_run)}` : 'Activo'
}

/** Costo aproximado por mensaje (MXN) para el resumen del gestor. */
export const REMINDER_COST_MXN = 0.16

/** 125 mensajes → "20.00". */
export function reminderCost(sent: number): string {
  return (Math.round(sent * REMINDER_COST_MXN * 100) / 100).toFixed(2)
}
