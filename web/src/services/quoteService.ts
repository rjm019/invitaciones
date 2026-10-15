/**
 * Cotizaciones de la landing: revisar el formulario antes de enviarlo (las mismas reglas
 * que el servidor, que es quien decide) y enviarlo. Sin Vue ni DOM: lo usa `landing.ts`.
 */

export type QuoteType = 'boda' | 'xv' | 'graduacion' | 'otro'

export interface QuoteForm {
  telefono: string
  nombre: string
  tipo: string
  fecha_evento: string
  idea: string
  privacidad: boolean
  pagina: string
  /** Campo trampa: una persona nunca lo llena. */
  empresa: string
  /** Cuándo se abrió la página (ms). */
  t: number
}

export type QuoteErrors = Partial<Record<'telefono' | 'tipo' | 'privacidad' | 'form', string>>

const TYPES: QuoteType[] = ['boda', 'xv', 'graduacion', 'otro']

/** Igual que `QuoteStore::normalizePhone`: "55 1234 5678" → "+525512345678"; null si no es un teléfono. */
export function normalizePhone(phone: string): string | null {
  const raw = phone.trim()
  const international = raw.startsWith('+') || raw.startsWith('00')
  let digits = raw.replace(/\D+/g, '')
  if (raw.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 10 && !international) return `+52${digits}`
  const mx = /^521?(\d{10})$/.exec(digits)
  if (mx) return `+52${mx[1]}`
  if (international && /^[1-9]\d{7,14}$/.test(digits)) return `+${digits}`
  return null
}

/** Lo que falta o está mal, con el mismo texto que daría el servidor. */
export function validateQuote(
  form: Pick<QuoteForm, 'telefono' | 'tipo' | 'privacidad'>,
): QuoteErrors {
  const errors: QuoteErrors = {}
  if (!form.telefono.trim()) errors.telefono = 'Escribe tu WhatsApp o teléfono.'
  else if (!normalizePhone(form.telefono))
    errors.telefono = 'Revisa tu número: 10 dígitos (por ejemplo 55 1234 5678).'
  if (!TYPES.includes(form.tipo as QuoteType)) errors.tipo = 'Elige qué celebras.'
  if (!form.privacidad)
    errors.privacidad = 'Necesitamos que aceptes el aviso de privacidad para escribirte.'
  return errors
}

/** El primer error de cada campo que devolvió el servidor (422). */
export function serverErrors(body: unknown): QuoteErrors {
  const out: QuoteErrors = {}
  const data = body as { message?: string; errors?: Record<string, string[]> } | null
  for (const [key, list] of Object.entries(data?.errors ?? {})) {
    if (key === 'telefono' || key === 'tipo' || key === 'privacidad') out[key] = list[0]
  }
  if (!Object.keys(out).length) out.form = data?.message || 'No se pudo enviar. Intenta de nuevo.'
  return out
}

/**
 * Envía la cotización. `ok` si se recibió; si no, los errores para mostrarlos.
 * `fetcher` se inyecta en las pruebas.
 */
export async function sendQuote(
  form: QuoteForm,
  fetcher: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; errors: QuoteErrors }> {
  const local = validateQuote(form)
  if (Object.keys(local).length) return { ok: false, errors: local }
  try {
    const res = await fetcher('/api/public/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...form, privacidad: form.privacidad ? '1' : '0' }),
    })
    if (res.ok) return { ok: true }
    if (res.status === 429)
      return {
        ok: false,
        errors: { form: 'Recibimos varias solicitudes desde aquí. Intenta en un rato.' },
      }
    return { ok: false, errors: serverErrors(await res.json().catch(() => null)) }
  } catch {
    return { ok: false, errors: { form: 'Sin conexión. Revisa tu internet e intenta de nuevo.' } }
  }
}
