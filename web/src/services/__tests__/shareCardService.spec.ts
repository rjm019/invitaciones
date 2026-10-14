import { describe, expect, it } from 'vitest'
import {
  addressLines,
  drawQr,
  drawShareCard,
  fitFont,
  shareCardText,
  shareFileName,
  shareMessage,
  shareRoute,
  type CardContext,
  type CardStyle,
} from '../shareCardService'
import type { PanelBrand } from '@/types/panel'

const brand: PanelBrand = {
  title: 'XV de Nat',
  theme: 'jardin-azul',
  palette: {},
  fonts: {},
  subtitle: 'mis xv años',
  celebrant: { full_name: 'Nat', short_name: 'Nat' },
  starts_at: '2026-11-28T17:00:00-06:00',
  timezone: 'America/Mexico_City',
  venue: { name: 'Salón de Eventos Centala', city: 'Pachuca, Hidalgo' },
  card: { background: 'fondo.webp', phrase: 'Celebremos juntos', text: 'esta etapa tan especial' },
}
const invitation = {
  id: '1',
  label: 'Familia Pérez',
  passes: 2,
  url: 'https://x.dev/i/Tok3nDePrueba',
}

/**
 * Contexto falso: guarda lo que se escribe y las imágenes que se pintan; cada letra mide
 * 10 px por cada 20 px de fuente. Con `spacing`, el lienzo separa letras por sí mismo.
 */
function fakeContext({ spacing = true } = {}) {
  const texts: { text: string; font: string; x: number }[] = []
  const images: unknown[] = []
  const dots: string[] = []
  let strokes = 0
  const ctx: Record<string, unknown> = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'start',
    textBaseline: 'alphabetic',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetY: 0,
    save() {},
    restore() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    arc() {
      dots.push(this.fillStyle as string)
    },
    closePath() {},
    fill() {},
    stroke() {
      strokes++
    },
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    drawImage(image: unknown) {
      images.push(image)
    },
    fillText(text: string, x: number) {
      texts.push({ text, font: this.font as string, x })
    },
    measureText(text: string) {
      const size = Number(/(\d+)px/.exec(this.font as string)?.[1] ?? 20)
      return { width: (text.length * size) / 2 }
    },
  }
  if (spacing) ctx.letterSpacing = '0px'
  return { ctx: ctx as unknown as CardContext, texts, images, dots, strokes: () => strokes }
}

const style: CardStyle = {
  bg: '#f3f1ec',
  text: '#523c0b',
  primary: '#96792c',
  primarySoft: '#e2c77a',
  accent: '#4a7194',
  script: 'Pinyon Script',
  serif: 'EB Garamond',
  engraved: 'Cormorant Garamond',
}

describe('shareCardService', () => {
  it('arma los textos con la fecha en la zona del evento y la frase del layout', () => {
    expect(shareCardText(brand, invitation)).toEqual({
      kicker: 'mis xv años',
      name: 'Nat',
      guest: 'Familia Pérez',
      passes: '2 invitados',
      date: 'Sábado 28 de noviembre · 5:00 pm',
      phrase: 'Celebremos juntos',
      text: 'esta etapa tan especial',
    })
    expect(
      shareCardText({ ...brand, card: undefined }, { ...invitation, label: null, passes: 1 }),
    ).toMatchObject({ guest: null, passes: '1 invitado', phrase: '', text: '' })
  })

  it('achica la letra hasta que el texto cabe', () => {
    const { ctx } = fakeContext()
    expect(fitFont(ctx, 'abcdefghij', (s) => `${s}px x`, 40, 1000)).toBe(40)
    expect(fitFont(ctx, 'abcdefghij', (s) => `${s}px x`, 40, 150)).toBe(30)
    expect(fitFont(ctx, 'abcdefghij', (s) => `${s}px x`, 40, 10)).toBe(20) // nunca menos de la mitad
  })

  /** QR de mentira de 21 × 21 (versión 1), todo oscuro: así se cuentan los puntos. */
  const qr = { size: 21, data: new Array(21 * 21).fill(1) }
  const background = { image: { fondo: true } as unknown as CanvasImageSource, width: 1024, height: 1536 }
  const seal = { image: { lacre: true } as unknown as CanvasImageSource, width: 800, height: 788 }

  it('la imagen lleva el nombre, para quién es, la frase y la fecha; el enlace no se ve', () => {
    const { ctx, texts } = fakeContext()
    drawShareCard(ctx, { background, qr }, shareCardText(brand, invitation), style)

    const written = texts.map((t) => t.text)
    expect(written).toEqual([
      'MIS XV AÑOS',
      'NAT',
      'PARA',
      'Familia Pérez',
      '2 invitados',
      'Celebremos juntos',
      'ESTA ETAPA TAN ESPECIAL',
      'Sábado 28 de noviembre · 5:00 pm',
      'toca o escanea para abrir',
    ])
    expect(written.some((t) => t.includes('Tok3nDePrueba'))).toBe(false)
    expect(texts.find((t) => t.text === 'NAT')?.font).toBe('400 250px "Cormorant Garamond", Georgia, serif')
    expect(texts.find((t) => t.text === 'MIS XV AÑOS')?.font).toContain('"Cormorant Garamond"')
    expect(texts.find((t) => t.text === 'Familia Pérez')?.font).toContain('"Pinyon Script"')
  })

  it('sin nombre en la invitación, el sobre dice "Tu invitación"', () => {
    const { ctx, texts } = fakeContext()
    drawShareCard(ctx, { qr }, shareCardText(brand, { ...invitation, label: null }), style)
    const written = texts.map((t) => t.text)
    expect(written).toContain('Tu invitación')
    expect(written).not.toContain('PARA')
  })

  it('usa el fondo del evento; si no hay, el papel del tema con el lacre', () => {
    const own = fakeContext()
    drawShareCard(own.ctx, { background, seal, qr }, shareCardText(brand, invitation), style)
    expect(own.images).toEqual([background.image])

    const fallback = fakeContext()
    drawShareCard(fallback.ctx, { seal, qr }, shareCardText(brand, invitation), style)
    expect(fallback.images).toEqual([seal.image])
  })

  it('sin las frases del layout, abajo solo van la fecha y el QR', () => {
    const { ctx, texts } = fakeContext()
    drawShareCard(ctx, { qr }, shareCardText({ ...brand, card: undefined }, invitation), style)
    expect(texts.map((t) => t.text).slice(-2)).toEqual([
      'Sábado 28 de noviembre · 5:00 pm',
      'toca o escanea para abrir',
    ])
  })

  it('el QR va en puntos del color de la invitación, con sus tres esquinas completas', () => {
    const { ctx, dots, strokes } = fakeContext()
    drawQr(ctx, qr, 0, 0, 210, '#4a7194')
    // 21 × 21 módulos menos las tres esquinas de 7 × 7 (esas se dibujan aparte).
    expect(dots).toHaveLength(21 * 21 - 3 * 49)
    expect(new Set(dots)).toEqual(new Set(['#4a7194']))
    expect(strokes()).toBe(3) // el marco de cada esquina
  })

  it('un nombre largo va en dos renglones parejos; uno corto, en uno', () => {
    const { ctx } = fakeContext()
    const font = (s: number) => `${s}px x`
    expect(addressLines(ctx, 'Familia Pérez', font, 40, 400)).toEqual({
      lines: ['Familia Pérez'],
      size: 40,
    })
    // 27 letras a 20 px = 540 px: no cabe en 400; se parte donde los renglones quedan más iguales.
    expect(addressLines(ctx, 'Familia Hernández Rodríguez', font, 40, 400)).toEqual({
      lines: ['Familia Hernández', 'Rodríguez'],
      size: 31,
    })
    // Una sola palabra larga no se parte: se achica.
    expect(addressLines(ctx, 'Hernández-Rodríguez', font, 40, 300).lines).toHaveLength(1)
  })

  it('si el lienzo no separa letras, las escribe una por una, centradas', () => {
    const { ctx, texts } = fakeContext({ spacing: false })
    drawShareCard(ctx, { qr }, shareCardText(brand, invitation), style)
    const para = texts.filter((t) => t.font.includes('26px')).slice(0, 4)
    expect(para.map((t) => t.text).join('')).toBe('PARA')
    // 4 letras de 13 px y 3 espacios de 8 px: empieza 38 px a la izquierda del centro.
    expect(para[0]!.x).toBeCloseTo(540 - 38)
  })

  it('comparte desde el celular; si el navegador no puede, se descarga', () => {
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    expect(shareRoute({ canShare: () => true }, file)).toBe('share')
    expect(shareRoute({ canShare: () => false }, file)).toBe('download')
    expect(shareRoute({}, file)).toBe('download')
    expect(
      shareRoute(
        {
          canShare: () => {
            throw new TypeError('sin archivos')
          },
        },
        file,
      ),
    ).toBe('download')
  })

  it('el archivo se llama como la invitación, sin acentos ni espacios', () => {
    expect(shareFileName({ id: '7', label: 'Familia Pérez Núñez' })).toBe(
      'Invitacion-Familia-Perez-Nunez.pdf',
    )
    expect(shareFileName({ id: '7', label: null }, 'jpg')).toBe('Invitacion-7.jpg')
  })

  it('el mensaje que acompaña al PDF no lleva el enlace (va oculto en la invitación)', () => {
    const url = 'https://x.dev/i/Abc'
    expect(
      shareMessage({
        url,
        message: `¡Hola, Familia Pérez! Te compartimos tu invitación (2 pases): ${url}`,
      }),
    ).toBe('¡Hola, Familia Pérez! Te compartimos tu invitación (2 pases)')
    expect(shareMessage({ url, message: `Tu invitación: ${url} ¡te esperamos!` })).toBe(
      'Tu invitación:  ¡te esperamos!',
    )
  })
})
