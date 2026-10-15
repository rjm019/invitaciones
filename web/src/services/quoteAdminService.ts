import type { Quote, QuoteStatus } from '@/types/design'

/**
 * Cotizaciones en el gestor: textos, filtros y el mensaje de WhatsApp para escribirle a
 * quien cotizó. Lógica pura (sin Vue ni DOM).
 */

export const QUOTE_TYPES: Record<Quote['type'], string> = {
  boda: 'Boda',
  xv: 'XV años',
  graduacion: 'Graduación',
  otro: 'Otra celebración',
}

export const QUOTE_STATUSES: { value: QuoteStatus; label: string }[] = [
  { value: 'nueva', label: 'Nueva' },
  { value: 'contactada', label: 'Contactada' },
  { value: 'cotizada', label: 'Cotizada' },
  { value: 'cerrada', label: 'Cerrada' },
  { value: 'descartada', label: 'Descartada' },
]

export type QuoteFilter = 'open' | 'all' | QuoteStatus

/** "Abiertas" = las que siguen en curso (ni cerradas ni descartadas). */
export function filterQuotes(list: Quote[], filter: QuoteFilter, query = ''): Quote[] {
  const q = query.trim().toLocaleLowerCase('es')
  const digits = q.replace(/\D/g, '')
  return list
    .filter((x) =>
      filter === 'all'
        ? true
        : filter === 'open'
          ? x.status !== 'cerrada' && x.status !== 'descartada'
          : x.status === filter,
    )
    .filter(
      (x) =>
        !q ||
        `${x.name ?? ''} ${x.idea ?? ''} ${x.note ?? ''}`.toLocaleLowerCase('es').includes(q) ||
        (digits.length >= 3 && x.phone.includes(digits)),
    )
}

/** "+525512345678" → "55 1234 5678"; otros países, tal cual. */
export function formatPhone(phone: string): string {
  const mx = /^\+52(\d{2})(\d{4})(\d{4})$/.exec(phone)
  return mx ? `${mx[1]} ${mx[2]} ${mx[3]}` : phone
}

/** El enlace para escribirle por WhatsApp, con un saludo ya escrito. */
export function whatsappLink(quote: Pick<Quote, 'phone' | 'name' | 'type'>): string {
  const hello = quote.name ? `¡Hola, ${quote.name.split(' ')[0]}!` : '¡Hola!'
  const what =
    quote.type === 'otro'
      ? 'tu celebración'
      : `tu invitación de ${QUOTE_TYPES[quote.type].toLowerCase()}`
  const text = `${hello} Gracias por escribirnos. Te contactamos para platicar sobre ${what}.`
  return `https://wa.me/${quote.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}
