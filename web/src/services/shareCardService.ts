import type { PanelBrand, PanelInvitation } from '@/types/panel'
import { isDarkPalette } from './colorService'
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
  lineTo(x: number, y: number): void
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
  arc(x: number, y: number, radius: number, start: number, end: number): void
  closePath(): void
  fill(): void
  stroke(): void
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): CanvasGradient
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

/** Los módulos del QR (de la librería qrcode): `size` × `size`, por renglones; 1 = oscuro. */
export interface QrMatrix {
  size: number
  data: ArrayLike<number>
}

export interface CardArt {
  /** Fondo propio del evento, con el sobre al centro (tarjeta_fondo del layout). */
  background?: CardImage | null
  /** Si no hay fondo propio: el papel del tema, con un recuadro claro y el lacre al centro. */
  paper?: CardImage | null
  seal?: CardImage | null
  /** El QR del enlace: se dibuja aquí, con puntos del color de la invitación. */
  qr: QrMatrix
}

/** Colores y fuentes del tema (los mismos tokens de la invitación). */
export interface CardStyle {
  bg: string
  text: string
  primary: string
  primarySoft: string
  accent: string
  script: string
  serif: string
  /** Las mayúsculas finas: "MIS XV AÑOS", el nombre y "PARA" (rol `engraved`). */
  engraved: string
  /** Invitación de fondo oscuro: el sobre se aclara apenas y el QR va en una placa clara. */
  dark?: boolean
}

/**
 * Colores y letras de la tarjeta: de la paleta ya calculada de la invitación (token → color,
 * los mismos `--color-*`) y de sus fuentes por rol. Lo que falte, con los del tema base.
 */
export function cardStyle(
  colors: Record<string, string>,
  fonts: Record<string, { family: string } | undefined>,
): CardStyle {
  const pick = (token: string, fallback: string) => colors[token]?.trim() || fallback
  return {
    bg: pick('bg', '#f3f1ec'),
    text: pick('text', '#523c0b'),
    primary: pick('primary', '#96792c'),
    primarySoft: pick('primary-soft', '#e2c77a'),
    accent: pick('accent-strong', '#3d6a92'),
    script: fonts.script?.family ?? 'cursive',
    serif: fonts.serif?.family ?? 'Georgia',
    engraved: fonts.engraved?.family ?? fonts.caps?.family ?? 'Georgia',
    dark: isDarkPalette({ bg: pick('bg', '#f3f1ec') }),
  }
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
  const longest = best.reduce((a, b) =>
    ctx.measureText(a).width >= ctx.measureText(b).width ? a : b,
  )
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

/** Línea fina con una estrella al centro. */
function divider(ctx: CardContext, cx: number, y: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(cx - 150, y - 0.75, 120, 1.5)
  ctx.fillRect(cx + 30, y - 0.75, 120, 1.5)
  star(ctx, cx, y, 20)
}

/** Rectángulo con esquinas redondeadas (el lienzo de algunos navegadores no trae roundRect). */
function roundedRect(ctx: CardContext, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/** ¿El módulo es parte de una de las tres esquinas (los "ojos" del QR)? */
const inEye = (r: number, c: number, n: number) =>
  (r < 7 || r >= n - 7) && (c < 7 || c >= n - 7) && !(r >= n - 7 && c >= n - 7)

/**
 * El QR integrado al diseño: puntos redondos y esquinas redondeadas del color de la
 * invitación, sobre un halo claro que se desvanece en el fondo (sin recuadro blanco). Los
 * lectores lo leen igual: el halo deja claro el margen y las esquinas quedan completas.
 * En un fondo oscuro el halo no alcanza: con `plate`, el QR va en una placa clara (como
 * un boleto plateado) con su margen de lectura completo.
 */
export function drawQr(
  ctx: CardContext,
  qr: QrMatrix,
  x: number,
  y: number,
  side: number,
  color: string,
  plate?: string,
): void {
  const n = qr.size
  const m = side / n
  const mid = { x: x + side / 2, y: y + side / 2 }
  if (plate) {
    const pad = m * 3
    ctx.fillStyle = plate
    roundedRect(ctx, x - pad, y - pad, side + pad * 2, side + pad * 2, m * 3)
    ctx.fill()
  } else {
    const halo = ctx.createRadialGradient(mid.x, mid.y, side * 0.45, mid.x, mid.y, side * 0.95)
    halo.addColorStop(0, 'rgba(255, 255, 255, 0.85)')
    halo.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = halo
    ctx.fillRect(mid.x - side, mid.y - side, side * 2, side * 2)
  }

  ctx.fillStyle = color
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.data[r * n + c] || inEye(r, c, n)) continue
      ctx.beginPath()
      ctx.arc(x + (c + 0.5) * m, y + (r + 0.5) * m, m * 0.42, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Cada ojo: un marco de un módulo de grueso y un centro de 3 × 3, redondeados.
  ctx.strokeStyle = color
  ctx.lineWidth = m
  for (const [r, c] of [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ] as const) {
    const ex = x + c * m
    const ey = y + r * m
    roundedRect(ctx, ex + m / 2, ey + m / 2, m * 6, m * 6, m * 1.8)
    ctx.stroke()
    roundedRect(ctx, ex + m * 2, ey + m * 2, m * 3, m * 3, m * 0.9)
    ctx.fill()
  }
}

/**
 * La tarjeta, como el diseño del evento: "MIS XV AÑOS" y el nombre en dorado y letra fina
 * entre estrellas; en el sobre, para quién es y cuántos pases; abajo, poco: la fecha y el QR
 * con puntos azules, integrado al fondo. Las frases del layout (`tarjeta_frase`,
 * `tarjeta_texto`) son opcionales y van entre la estrella y la fecha.
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
  const engraved = (size: number, weight = 400) =>
    `${weight} ${size}px ${family(style.engraved, 'Georgia, serif')}`
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
    // En un fondo oscuro, el sobre apenas se aclara y su filo es del color principal (plata).
    ctx.fillStyle = style.dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.6)'
    ctx.fillRect(166, env.top, W - 332, env.bottom - env.top)
    ctx.strokeStyle = style.dark ? style.primary : style.primarySoft
    ctx.lineWidth = 2
    ctx.strokeRect(180, env.top + 14, W - 360, env.bottom - env.top - 28)
    if (art.seal) {
      const w = 150
      const h = (w * art.seal.height) / art.seal.width
      ctx.drawImage(
        art.seal.image,
        0,
        0,
        art.seal.width,
        art.seal.height,
        cx - w / 2,
        H * ENVELOPE.seal - h / 2,
        w,
        h,
      )
    }
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Arriba, lo principal: estrella, "MIS XV AÑOS", el nombre grande en dorado, estrella.
  divider(ctx, cx, 170, style.primary)
  if (text.kicker) {
    ctx.fillStyle = style.primary
    ctx.font = engraved(48, 500)
    spaced(ctx, upper(text.kicker), cx, 262, 16)
  }
  const name = upper(text.name)
  // Una mayúscula con acento (SOFÍA) sube más: un poco más chica para no tocar la línea de arriba.
  const nameMax = /[ÁÉÍÓÚÜ]/.test(name) ? 215 : 250
  const nameSize = fitFont(ctx, name, (s) => engraved(s), nameMax, W - 280)
  const gold = ctx.createLinearGradient(0, 470 - nameSize * 0.65, 0, 470)
  gold.addColorStop(0, style.primarySoft)
  gold.addColorStop(0.6, style.primary)
  gold.addColorStop(1, style.primary)
  ctx.save()
  ctx.shadowColor = 'rgba(70, 50, 10, 0.18)'
  ctx.shadowBlur = 2
  ctx.shadowOffsetY = 2
  ctx.fillStyle = gold
  spaced(ctx, name, cx, 470, 10)
  ctx.restore()
  divider(ctx, cx, 525, style.primary)

  // En el sobre, como si estuviera rotulado: arriba del lacre para quién es (un nombre
  // largo, en dos renglones) y abajo cuántos pases.
  ctx.fillStyle = style.text
  ctx.save()
  ctx.shadowColor = style.dark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.45)'
  ctx.shadowOffsetY = 1
  const guest = text.guest ?? 'Tu invitación'
  const lines = addressLines(ctx, guest, script, 88, W - 480)
  let gy = env.top + (lines.lines.length > 1 ? 52 : 70)
  if (text.guest) {
    ctx.font = engraved(26, 500)
    spaced(ctx, 'PARA', cx, gy, 8)
  }
  ctx.font = script(lines.size)
  lines.lines.forEach((line, i) => {
    gy += lines.size * (i === 0 ? 0.95 : 0.9)
    ctx.fillText(line, cx, gy)
  })
  // En cursiva y con números de texto: en mayúsculas el "1" puede parecer una "I".
  ctx.font = serif(34, true)
  ctx.fillText(text.passes, cx, H * ENVELOPE.passes)
  ctx.restore()

  // Abajo, sin ruido: estrella, las frases del layout (si hay), la fecha y el QR.
  let y = env.bottom + 58
  divider(ctx, cx, y, style.primary)
  y += 30
  ctx.fillStyle = style.primary
  if (text.phrase) {
    const size = fitFont(ctx, text.phrase, script, 64, W - 240)
    y += size * 0.6
    ctx.fillText(text.phrase, cx, y)
    y += 54 // la letra de pluma baja mucho (la "j")
  }
  if (text.text) {
    ctx.font = engraved(26, 500)
    spaced(ctx, upper(text.text), cx, y, 8)
    y += 40
  }
  if (text.date) {
    y += text.phrase || text.text ? 0 : 32
    ctx.fillStyle = style.primary
    fitFont(ctx, text.date, (s) => serif(s, true), 32, W - 240)
    ctx.fillText(text.date, cx, y)
  }

  // Con las dos frases del layout, el QR se achica para no pegarse a la fecha (no menos
  // de 150 px: así se sigue leyendo desde otro celular).
  const qrY = y + 40
  const side = Math.max(150, Math.min(190, H - 110 - qrY))
  if (style.dark) drawQr(ctx, art.qr, cx - side / 2, qrY, side, style.bg, style.primarySoft)
  else drawQr(ctx, art.qr, cx - side / 2, qrY, side, style.accent)
  ctx.fillStyle = style.primary
  ctx.font = serif(24, true)
  ctx.fillText('toca o escanea para abrir', cx, qrY + side + 44)
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
