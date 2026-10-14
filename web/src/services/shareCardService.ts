import type { PanelBrand, PanelInvitation } from '@/types/panel'
import { dateParts, hourMinute, time12h } from './dateFormatService'

/**
 * La imagen de cada invitación para mandarla por WhatsApp: qué dice y cómo se dibuja.
 * El enlace no se ve: va en el código QR (el mismo que leerá la recepción) y, al mandarla,
 * en un PDF que se abre al tocar cualquier parte (ver cardPdfService). Sin DOM: el lienzo,
 * las imágenes y el QR llegan ya cargados.
 */

/** 2:3, la proporción del fondo de la tarjeta (sobre al centro). */
export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1620

/** La franja del sobre, en fracción del alto: ahí va para quién es la invitación. */
const ENVELOPE = { top: 0.361, bottom: 0.67, seal: 0.546, passes: 0.647 }

export interface ShareCardText {
  /** "mis xv años" */
  kicker: string
  /** "Nat" */
  name: string
  /** "Familia Pérez" (el nombre de la invitación), si tiene. */
  guest: string | null
  /** "2 invitados" */
  passes: string
  /** "Sábado 28 de noviembre · 5:00 pm" */
  date: string
  /** "Celebremos juntos" (tarjeta_frase del layout) */
  phrase: string
  /** "esta etapa tan especial" (tarjeta_texto del layout) */
  text: string
}

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase('es-MX') + s.slice(1)
const upper = (s: string) => s.toLocaleUpperCase('es-MX')

export function shareCardText(
  brand: PanelBrand,
  invitation: Pick<PanelInvitation, 'label' | 'passes' | 'url'>,
): ShareCardText {
  const zone = brand.timezone ?? 'America/Mexico_City'
  let date = ''
  if (brand.starts_at) {
    const d = dateParts(brand.starts_at, zone)
    date = `${capitalize(d.weekday)} ${d.day} de ${d.month} · ${time12h(hourMinute(brand.starts_at, zone))}`
  }
  return {
    kicker: brand.subtitle ?? '',
    name: brand.celebrant?.short_name || brand.celebrant?.full_name || brand.title,
    guest: invitation.label,
    passes: invitation.passes === 1 ? '1 invitado' : `${invitation.passes} invitados`,
    date,
    phrase: brand.card?.phrase ?? '',
    text: brand.card?.text ?? '',
  }
}

/** Lo que se usa del contexto 2D del lienzo (en las pruebas, uno falso). */
export interface CardContext {
  font: string
  fillStyle: string | CanvasGradient | CanvasPattern
  strokeStyle: string | CanvasGradient | CanvasPattern
  lineWidth: number
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
  shadowColor: string
  shadowBlur: number
  shadowOffsetY: number
  letterSpacing?: string
  save(): void
  restore(): void
  fillRect(x: number, y: number, w: number, h: number): void
  strokeRect(x: number, y: number, w: number, h: number): void
  fillText(text: string, x: number, y: number): void
  measureText(text: string): { width: number }
  beginPath(): void
  moveTo(x: number, y: number): void
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
  closePath(): void
  fill(): void
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient
  drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void
}

/** Una imagen ya cargada, con su tamaño natural. */
export interface CardImage {
  image: CanvasImageSource
  width: number
  height: number
}

export interface CardArt {
  /** Fondo propio del evento, con el sobre al centro (tarjeta_fondo del layout). */
  background?: CardImage | null
  /** Si no hay fondo propio: el papel del tema, con un recuadro claro y el lacre al centro. */
  paper?: CardImage | null
  seal?: CardImage | null
  /** El código QR del enlace (cuadrado). */
  qr: CardImage
}

/** Colores y fuentes del tema (los mismos tokens de la invitación). */
export interface CardStyle {
  bg: string
  text: string
  primary: string
  primarySoft: string
  accent: string
  script: string
  scriptMono: string
  caps: string
  serif: string
}

/** El tamaño más grande (de `max` hacia abajo) en que el texto cabe en `maxWidth`. */
export function fitFont(
  ctx: Pick<CardContext, 'font' | 'measureText'>,
  text: string,
  font: (size: number) => string,
  max: number,
  maxWidth: number,
  min = Math.round(max * 0.5),
): number {
  let size = max
  ctx.font = font(size)
  while (size > min && ctx.measureText(text).width > maxWidth) {
    size -= 2
    ctx.font = font(size)
  }
  return size
}

/** Dibuja `img` cubriendo el rectángulo (recorta lo que sobra, sin deformar). */
function cover(ctx: CardContext, img: CardImage, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height)
  const sw = w / scale
  const sh = h / scale
  ctx.drawImage(img.image, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
}

const family = (name: string, fallback: string) => `"${name}", ${fallback}`

/** Texto centrado con letras separadas (las mayúsculas finas de la tarjeta). */
function spaced(ctx: CardContext, text: string, cx: number, y: number, spacing: number) {
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${spacing}px`
    ctx.fillText(text, cx + spacing / 2, y) // el espacio de la última letra no cuenta
    ctx.letterSpacing = '0px'
    return
  }
  // Navegadores sin letterSpacing en el lienzo: letra por letra.
  const chars = [...text]
  const widths = chars.map((c) => ctx.measureText(c).width)
  let x = cx - (widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)) / 2
  ctx.save()
  ctx.textAlign = 'left'
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y)
    x += widths[i]! + spacing
  })
  ctx.restore()
}

/**
 * El nombre del sobre: en un renglón si cabe grande; si no, en dos parejos (cortando en el
 * espacio que deja los dos más iguales) y algo más chico.
 */
export function addressLines(
  ctx: Pick<CardContext, 'font' | 'measureText'>,
  text: string,
  font: (size: number) => string,
  max: number,
  maxWidth: number,
): { lines: string[]; size: number } {
  ctx.font = font(max)
  const words = text.split(/\s+/)
  if (ctx.measureText(text).width <= maxWidth || words.length < 2) {
    return { lines: [text], size: fitFont(ctx, text, font, max, maxWidth) }
  }
  let best: string[] = [text]
  let widest = Infinity
  for (let i = 1; i < words.length; i++) {
    const pair = [words.slice(0, i).join(' '), words.slice(i).join(' ')]
    const w = Math.max(...pair.map((l) => ctx.measureText(l).width))
    if (w < widest) {
      widest = w
      best = pair
    }
  }
  const longest = best.reduce((a, b) => (ctx.measureText(a).width >= ctx.measureText(b).width ? a : b))
  return { lines: best, size: fitFont(ctx, longest, font, Math.round(max * 0.78), maxWidth) }
}

/** Estrella de cuatro puntas (como las del papel). */
function star(ctx: CardContext, x: number, y: number, r: number) {
  const w = r * 0.16
  const rx = r * 0.62
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x + w, y - w, x + rx, y)
  ctx.quadraticCurveTo(x + w, y + w, x, y + r)
  ctx.quadraticCurveTo(x - w, y + w, x - rx, y)
  ctx.quadraticCurveTo(x - w, y - w, x, y - r)
  ctx.closePath()
  ctx.fill()
}

/** Línea dorada con una estrella al centro. */
function divider(ctx: CardContext, cx: number, y: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(cx - 168, y - 1, 132, 2)
  ctx.fillRect(cx + 36, y - 1, 132, 2)
  star(ctx, cx, y, 26)
}

/**
 * La tarjeta, como el diseño del evento: "MIS XV AÑOS" y el nombre en dorado entre
 * estrellas; en el sobre, para quién es y cuántos pases; abajo la frase, la fecha y el QR.
 */
export function drawShareCard(
  ctx: CardContext,
  art: CardArt,
  text: ShareCardText,
  style: CardStyle,
): void {
  const W = CARD_WIDTH
  const H = CARD_HEIGHT
  const cx = W / 2
  const caps = (size: number) => `400 ${size}px ${family(style.caps, 'serif')}`
  const script = (size: number) => `400 ${size}px ${family(style.script, 'cursive')}`
  const serif = (size: number, italic = false) =>
    `${italic ? 'italic ' : ''}400 ${size}px ${family(style.serif, 'Georgia, serif')}`
  const env = { top: H * ENVELOPE.top, bottom: H * ENVELOPE.bottom }

  // Fondo: el del evento (ya trae el sobre) o el papel del tema con un recuadro y el lacre.
  ctx.fillStyle = style.bg
  ctx.fillRect(0, 0, W, H)
  if (art.background) {
    cover(ctx, art.background, 0, 0, W, H)
  } else {
    if (art.paper) cover(ctx, art.paper, 0, 0, W, H)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.fillRect(166, env.top, W - 332, env.bottom - env.top)
    ctx.strokeStyle = style.primarySoft
    ctx.lineWidth = 2
    ctx.strokeRect(180, env.top + 14, W - 360, env.bottom - env.top - 28)
    if (art.seal) {
      const w = 150
      const h = (w * art.seal.height) / art.seal.width
      ctx.drawImage(art.seal.image, 0, 0, art.seal.width, art.seal.height, cx - w / 2, H * ENVELOPE.seal - h / 2, w, h)
    }
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Arriba: estrella, "MIS XV AÑOS", el nombre grande en dorado, estrella.
  divider(ctx, cx, 170, style.primary)
  if (text.kicker) {
    ctx.font = caps(50)
    spaced(ctx, upper(text.kicker), cx, 262, 14)
  }
  const name = upper(text.name)
  const nameSize = fitFont(ctx, name, caps, 224, W - 280)
  const gold = ctx.createLinearGradient(0, 470 - nameSize * 0.7, 0, 470)
  gold.addColorStop(0, style.primarySoft)
  gold.addColorStop(0.55, style.primary)
  gold.addColorStop(1, style.primary)
  ctx.save()
  ctx.shadowColor = 'rgba(70, 50, 10, 0.28)'
  ctx.shadowBlur = 3
  ctx.shadowOffsetY = 3
  ctx.fillStyle = gold
  spaced(ctx, name, cx, 470, 6)
  ctx.restore()
  divider(ctx, cx, 525, style.primary)

  // En el sobre, como si estuviera rotulado: arriba del lacre para quién es (un nombre
  // largo, en dos renglones) y abajo cuántos pases.
  ctx.fillStyle = style.text
  ctx.save()
  ctx.shadowColor = 'rgba(255, 255, 255, 0.45)'
  ctx.shadowOffsetY = 1
  const guest = text.guest ?? 'Tu invitación'
  const lines = addressLines(ctx, guest, script, 88, W - 480)
  let gy = env.top + (lines.lines.length > 1 ? 52 : 70)
  if (text.guest) {
    ctx.font = caps(26)
    spaced(ctx, 'PARA', cx, gy, 7)
  }
  ctx.font = script(lines.size)
  lines.lines.forEach((line, i) => {
    gy += lines.size * (i === 0 ? 0.95 : 0.9)
    ctx.fillText(line, cx, gy)
  })
  // En cursiva y con números de texto: en las mayúsculas del tema el "1" parece una "I".
  ctx.font = serif(36, true)
  ctx.fillText(text.passes, cx, H * ENVELOPE.passes)
  ctx.restore()

  // Abajo: estrella, la frase, la fecha y el QR (el enlace no se escribe).
  let y = env.bottom + 40
  divider(ctx, cx, y, style.primary)
  y += 34
  ctx.fillStyle = style.primary
  if (text.phrase) {
    const size = fitFont(ctx, text.phrase, script, 78, W - 240)
    y += size * 0.6
    ctx.fillText(text.phrase, cx, y)
    y += 64 // la letra de pluma baja mucho (la "j")
  }
  if (text.text) {
    ctx.font = caps(30)
    spaced(ctx, upper(text.text), cx, y, 8)
    y += 46
  }
  if (text.date) {
    ctx.fillStyle = style.text
    fitFont(ctx, text.date, (s) => serif(s, true), 34, W - 240)
    ctx.fillText(text.date, cx, y)
  }
  y += 36

  const qr = 184
  const qrY = Math.min(y, H - 80 - qr)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(cx - qr / 2 - 12, qrY - 12, qr + 24, qr + 24)
  ctx.drawImage(art.qr.image, 0, 0, art.qr.width, art.qr.height, cx - qr / 2, qrY, qr, qr)
  ctx.fillStyle = style.text
  ctx.font = serif(28, true)
  ctx.fillText('Toca o escanea para abrir tu invitación', cx, qrY + qr + 46)
}

/**
 * El texto que acompaña al PDF, sin el enlace (va oculto en la invitación): "¡Hola,
 * Familia Pérez! Te compartimos tu invitación (2 pases)".
 */
export function shareMessage(invitation: Pick<PanelInvitation, 'message' | 'url'>): string {
  return invitation.message
    .replace(invitation.url, '')
    .replace(/[\s:·,-]+$/u, '')
    .trim()
}

/**
 * Cómo mandar la imagen: desde el celular (y los navegadores que lo permiten), con el menú
 * de compartir, que deja elegir WhatsApp y el chat. Si no, se descarga y se abre WhatsApp
 * con el mensaje para adjuntarla.
 */
export function shareRoute(
  nav: { canShare?: (data: ShareData) => boolean } | undefined,
  file: File,
): 'share' | 'download' {
  try {
    return nav?.canShare?.({ files: [file] }) ? 'share' : 'download'
  } catch {
    return 'download'
  }
}

/** "Invitacion-Familia-Perez.pdf": sin acentos ni espacios, para que cualquier app lo acepte. */
export function shareFileName(
  invitation: Pick<PanelInvitation, 'id' | 'label'>,
  extension: 'pdf' | 'jpg' = 'pdf',
): string {
  const base = (invitation.label ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `Invitacion-${base || invitation.id}.${extension}`
}
