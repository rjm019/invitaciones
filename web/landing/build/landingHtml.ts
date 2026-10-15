/**
 * Armado de las páginas de la landing (lógica pura; la usa `landingPlugin` en el build).
 */

/** Datos del sitio: `landing/site.json` + la dirección pública (SITE_URL). */
export interface SiteInfo {
  url: string
  brand: string
  /** Quién responde por los datos (aviso de privacidad). */
  responsible: string
  /** Correo de contacto; vacío = todavía no hay. */
  email: string
  /** WhatsApp del negocio, solo dígitos con lada (5215512345678); vacío = todavía no hay. */
  whatsapp: string
}

const INCLUDE = /<!--\s*@include\s+([\w.-]+)((?:\s+[\w-]+="[^"]*")*)\s*-->/g
const PARAM = /([\w-]+)="([^"]*)"/g

/**
 * `<!-- @include form.html tipo="boda" -->` → el contenido de la pieza. Dentro de la pieza,
 * `{{tipo}}` es el valor del parámetro; `{{tipo==boda}}` da "selected" si coincide y
 * `{{actual==boda|aria-current="page"}}`, ese texto. Las piezas pueden incluir otras (hasta 5
 * niveles).
 */
export function expandIncludes(html: string, read: (name: string) => string, depth = 0): string {
  if (depth > 5) throw new Error('Las piezas de la landing se incluyen en círculo.')
  return html.replace(INCLUDE, (_all, name: string, rawParams: string) => {
    const params: Record<string, string> = {}
    for (const [, key, value] of rawParams.matchAll(PARAM)) params[key!] = value!
    const body = read(name)
      .replace(
        /\{\{([\w-]+)==([\w-]*)(?:\|([^}]*))?\}\}/g,
        (_m, key: string, value: string, text: string | undefined) =>
          (params[key] ?? '') === value ? (text ?? 'selected') : '',
      )
      .replace(/\{\{([\w-]+)\}\}/g, (_m, key: string) => params[key] ?? '')
    return expandIncludes(body, read, depth + 1)
  })
}

/** `%SITE_URL%`, `%BRAND%`, `%RESPONSIBLE%`, `%YEAR%`… Lo que dependa de un dato vacío se quita. */
export function fillTokens(html: string, site: SiteInfo, now = new Date()): string {
  // Bloques que solo aparecen si hay dato: <!-- @if whatsapp --> … <!-- @endif -->
  const withBlocks = html.replace(
    /<!--\s*@if\s+(email|whatsapp)\s*-->([\s\S]*?)<!--\s*@endif\s*-->/g,
    (_m, key: 'email' | 'whatsapp', body: string) => (site[key] ? body : ''),
  )
  const tokens: Record<string, string> = {
    SITE_URL: site.url,
    BRAND: site.brand,
    RESPONSIBLE: site.responsible,
    EMAIL: site.email,
    WHATSAPP: site.whatsapp,
    YEAR: String(now.getFullYear()),
  }
  return withBlocks.replace(/%([A-Z_]+)%/g, (all, key: string) => tokens[key] ?? all)
}

function plain(fragment: string): string {
  return fragment
    .replace(/<\/?(?:em|strong|b|i|a|span|abbr|small)\b[^>]*>/g, '') // en línea: sin espacio de más
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Las preguntas de la página: `<details class="faq__item"><summary>…</summary>…</details>`. */
export function faqItems(html: string): { question: string; answer: string }[] {
  const items: { question: string; answer: string }[] = []
  const re =
    /<details class="faq__item"[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g
  for (const [, q, a] of html.matchAll(re)) items.push({ question: plain(q!), answer: plain(a!) })
  return items
}

/** Agrega el JSON-LD `FAQPage` antes de `</head>` si la página tiene preguntas. */
export function faqJsonLd(html: string): string {
  const items = faqItems(html)
  if (!items.length) return html
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  }
  // "<" escapado: un texto nunca puede cerrar la etiqueta <script>.
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return html.replace('</head>', `<script type="application/ld+json">${json}</script>\n</head>`)
}
