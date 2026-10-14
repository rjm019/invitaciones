import { onBeforeUnmount } from 'vue'
import QRCode from 'qrcode'
import { createAssetResolver } from '@/services/assetService'
import { linkedImagePdf } from '@/services/cardPdfService'
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  drawShareCard,
  shareCardText,
  shareFileName,
  shareMessage,
  shareRoute,
  type CardContext,
  type CardImage,
  type CardStyle,
  type QrMatrix,
} from '@/services/shareCardService'
import { themeAssets } from '@/themes'
import type { ThemeFont, ThemeManifest } from '@/themes/types'
import type { PanelBrand, PanelInvitation } from '@/types/panel'

export interface ShareCard {
  /** El PDF que se manda: la imagen, y al tocarla se abre la invitación. */
  pdf: File
  /** La imagen sola (JPEG), para la vista previa o para descargarla. */
  image: File
  /** URL local de cada uno (se liberan al salir del panel). */
  previewUrl: string
  pdfUrl: string
}

/** Lo que el lienzo no puede leer de un archivo roto: la imagen se omite y ya. */
function loadImage(url: string | null): Promise<CardImage | null> {
  if (!url) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // en desarrollo la media viene de otro origen
    img.onload = () => resolve({ image: img, width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function cssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/**
 * La invitación para WhatsApp, con el tema del evento (ver shareCardService): la imagen y
 * el PDF que la lleva con el enlace oculto (tocar cualquier parte la abre). Se arma al abrir
 * la vista previa; así el botón "Enviar" comparte de inmediato (Safari solo deja compartir
 * justo después del toque).
 */
export function useShareCard() {
  const urls = new Set<string>()
  onBeforeUnmount(() => urls.forEach((u) => URL.revokeObjectURL(u)))

  async function render(
    brand: PanelBrand,
    theme: ThemeManifest,
    fonts: Record<string, ThemeFont>,
    invitation: PanelInvitation,
  ): Promise<ShareCard> {
    const resolve = createAssetResolver(brand.assets ?? {}, themeAssets(theme.id))
    const decor = theme.sections['hero-envelope']?.decor ?? {}
    const style: CardStyle = {
      bg: cssVar('--color-bg', '#f3f1ec'),
      text: cssVar('--color-text', '#523c0b'),
      primary: cssVar('--color-primary', '#96792c'),
      primarySoft: cssVar('--color-primary-soft', '#e2c77a'),
      accent: cssVar('--color-accent-strong', '#3d6a92'),
      script: fonts.script?.family ?? 'cursive',
      serif: fonts.serif?.family ?? 'Georgia',
      engraved: fonts.engraved?.family ?? fonts.caps?.family ?? 'Georgia',
    }

    // Sin las fuentes cargadas, el lienzo usaría la letra del sistema.
    const fontsReady = Promise.all(
      [
        `40px "${style.script}"`,
        `40px "${style.serif}"`,
        `italic 40px "${style.serif}"`,
        `400 40px "${style.engraved}"`,
        `500 40px "${style.engraved}"`,
      ].map((font) => document.fonts.load(font).catch(() => [])),
    )
    // El fondo propio del evento (con el sobre); si no hay, el papel del tema y su lacre.
    const own = resolve(brand.card?.background)
    const [background, paper, seal] = await Promise.all([
      loadImage(own),
      loadImage(own ? null : resolve(theme.page?.image)),
      loadImage(own ? null : resolve(decor.seal)),
    ])
    await fontsReady

    // Corrección "Q" (aguanta 25 % de daño): se lee aunque la pantalla brille o esté rayada.
    const { modules } = QRCode.create(invitation.url, { errorCorrectionLevel: 'Q' })
    const qr: QrMatrix = { size: modules.size, data: modules.data }

    const canvas = document.createElement('canvas')
    canvas.width = CARD_WIDTH
    canvas.height = CARD_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Este navegador no puede crear la imagen.')
    drawShareCard(
      ctx as unknown as CardContext,
      { background, paper, seal, qr },
      shareCardText(brand, invitation),
      style,
    )

    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92))
    if (!blob) throw new Error('No se pudo crear la imagen.')
    const jpeg = new Uint8Array(await blob.arrayBuffer())
    const pdfBytes = linkedImagePdf(
      jpeg,
      CARD_WIDTH,
      CARD_HEIGHT,
      invitation.url,
      `Invitación · ${brand.title}`,
    )
    const image = new File([blob], shareFileName(invitation, 'jpg'), { type: 'image/jpeg' })
    const pdf = new File([pdfBytes], shareFileName(invitation, 'pdf'), { type: 'application/pdf' })
    const previewUrl = URL.createObjectURL(image)
    const pdfUrl = URL.createObjectURL(pdf)
    urls.add(previewUrl)
    urls.add(pdfUrl)
    return { pdf, image, previewUrl, pdfUrl }
  }

  /**
   * Manda el PDF con su mensaje (sin el enlace: va oculto en la invitación). En el celular
   * abre el menú de compartir; en la computadora lo descarga y abre WhatsApp con el mensaje
   * escrito. Devuelve qué se hizo, para decirlo en pantalla.
   */
  async function send(
    card: ShareCard,
    invitation: PanelInvitation,
  ): Promise<'shared' | 'downloaded' | 'cancelled'> {
    const text = shareMessage(invitation)
    if (shareRoute(navigator, card.pdf) === 'share') {
      try {
        await navigator.share({ files: [card.pdf], text })
        return 'shared'
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
        // Si el menú de compartir falla, se cae a descargar.
      }
    }
    download(card, 'pdf')
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    return 'downloaded'
  }

  function download(card: ShareCard, what: 'pdf' | 'image'): void {
    const a = Object.assign(document.createElement('a'), {
      href: what === 'pdf' ? card.pdfUrl : card.previewUrl,
      download: (what === 'pdf' ? card.pdf : card.image).name,
    })
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return { render, send, download }
}
