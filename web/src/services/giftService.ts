import type { EventConfig, EventGifts, GiftStore } from '@/types/event'

/** "012180001234567891" → "0121 8000 1234 5678 91": de 4 en 4 se dicta y se revisa mejor. */
export function groupDigits(account: string, size = 4): string {
  const clean = account.replace(/\s+/g, '')
  return clean.match(new RegExp(`.{1,${size}}`, 'g'))?.join(' ') ?? ''
}

const ARTICLES = new Set(['el', 'la', 'los', 'las', 'the'])

/** La letra del monograma de una tienda: "El Palacio de Hierro" → "P". */
export function storeMonogram(store: Pick<GiftStore, 'name'>): string {
  const words = store.name.trim().split(/\s+/).filter(Boolean)
  const word = words.find((w) => !ARTICLES.has(w.toLowerCase())) ?? words[0] ?? ''
  return Array.from(word)[0]?.toLocaleUpperCase('es-MX') ?? ''
}

/** ¿Hay algo que mostrar? Sin tiendas ni lluvia de sobres, la sección no se pinta. */
export function hasGifts(gifts: EventGifts | null | undefined): boolean {
  return !!gifts && (gifts.stores.length > 0 || gifts.envelope !== null)
}

/**
 * Cómo la ve el enlace general: sin los datos bancarios si la invitación pidió "solo con
 * enlace". Es lo mismo que hace el servidor (GiftPrivacy); aquí solo sirve para que la
 * vista previa del gestor enseñe lo que verá cada invitado.
 */
export function forGeneralLink(event: EventConfig): EventConfig {
  const envelope = event.gifts?.envelope
  if (!envelope || !envelope.private || !(envelope.bank || envelope.account || envelope.holder)) {
    return event
  }
  return {
    ...event,
    gifts: {
      ...event.gifts!,
      envelope: { ...envelope, bank: '', account: '', holder: '', hidden: true },
    },
  }
}
