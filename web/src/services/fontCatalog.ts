/**
 * Fuentes de Google sugeridas en el editor (por estilo) y combinaciones listas. Cualquier
 * otra fuente de Google Fonts también se puede escribir a mano.
 */
export type FontCategory = 'script' | 'serif' | 'sans' | 'display'

export interface FontEntry {
  family: string
  category: FontCategory
}

export const FONT_CATEGORIES: Record<FontCategory, string> = {
  script: 'Manuscritas',
  serif: 'Con remate',
  sans: 'Sin remate',
  display: 'Decorativas',
}

const list = (category: FontCategory, families: string[]): FontEntry[] =>
  families.map((family) => ({ family, category }))

export const FONTS: FontEntry[] = [
  ...list('script', [
    'Pinyon Script',
    'Great Vibes',
    'Parisienne',
    'Alex Brush',
    'Allura',
    'Sacramento',
    'Tangerine',
    'Italianno',
    'Petit Formal Script',
    'Dancing Script',
    'Mrs Saint Delafield',
    'Monsieur La Doulaise',
  ]),
  ...list('serif', [
    'EB Garamond',
    'Cormorant Garamond',
    'Playfair Display',
    'Libre Baskerville',
    'Lora',
    'Cormorant',
    'Prata',
    'Bodoni Moda',
    'Crimson Text',
  ]),
  ...list('sans', [
    'Montserrat',
    'Raleway',
    'Josefin Sans',
    'Poppins',
    'Lato',
    'Quicksand',
    'Nunito',
  ]),
  ...list('display', [
    'Marcellus',
    'Cinzel',
    'Cinzel Decorative',
    'Italiana',
    'Forum',
    'Abril Fatface',
    'Bellefair',
  ]),
]

export interface FontPairing {
  id: string
  label: string
  description: string
  /** Rol (como en invitacion.csv) → familia. */
  fonts: Record<string, string>
}

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: 'elegante',
    label: 'Elegante',
    description: 'Manuscrita fina con texto clásico (la de NAT).',
    fonts: {
      script: 'Pinyon Script',
      script_mono: 'Sacramento',
      serif: 'EB Garamond',
      caps: 'Marcellus',
      display: 'Playfair Display',
      button: 'Cormorant Garamond',
    },
  },
  {
    id: 'romantica',
    label: 'Romántica',
    description: 'Trazos amplios y mayúsculas grabadas.',
    fonts: {
      script: 'Great Vibes',
      script_mono: 'Parisienne',
      serif: 'Cormorant Garamond',
      caps: 'Cinzel',
      display: 'Cormorant Garamond',
      button: 'Cormorant Garamond',
    },
  },
  {
    id: 'moderna',
    label: 'Moderna',
    description: 'Manuscrita ligera con letra sin remate.',
    fonts: {
      script: 'Allura',
      script_mono: 'Allura',
      serif: 'Lora',
      caps: 'Montserrat',
      display: 'Playfair Display',
      button: 'Montserrat',
    },
  },
  {
    id: 'clasica',
    label: 'Clásica',
    description: 'Mayúsculas romanas y texto de libro.',
    fonts: {
      script: 'Tangerine',
      script_mono: 'Italianno',
      serif: 'Libre Baskerville',
      caps: 'Cinzel',
      display: 'Cinzel',
      button: 'Libre Baskerville',
    },
  },
  {
    id: 'minimalista',
    label: 'Minimalista',
    description: 'Limpia, con mucho aire.',
    fonts: {
      script: 'Alex Brush',
      script_mono: 'Alex Brush',
      serif: 'Raleway',
      caps: 'Josefin Sans',
      display: 'Josefin Sans',
      button: 'Josefin Sans',
    },
  },
  {
    id: 'vintage',
    label: 'Vintage',
    description: 'Contraste alto, como papelería antigua.',
    fonts: {
      script: 'Petit Formal Script',
      script_mono: 'Italianno',
      serif: 'Playfair Display',
      caps: 'Prata',
      display: 'Abril Fatface',
      button: 'Prata',
    },
  },
]

/**
 * Una hoja de Google Fonts para las muestras del selector: solo las letras de la muestra
 * (`text=`), así pesa muy poco aunque sean muchas fuentes.
 */
export function sampleFontsUrl(families: string[], text: string): string | null {
  const unique = [...new Set(families.filter((f) => /^[A-Za-z0-9 ]{2,60}$/.test(f)))]
  if (!unique.length) return null
  const params = unique.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}`).join('&')
  const letters = [...new Set(text)].join('')
  return `https://fonts.googleapis.com/css2?${params}&text=${encodeURIComponent(letters)}&display=swap`
}
