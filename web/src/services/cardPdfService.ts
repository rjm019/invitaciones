/**
 * PDF de una página con la imagen de la invitación y un enlace oculto que la cubre toda:
 * al tocar cualquier parte (o el QR) se abre la invitación. Una imagen sola no puede
 * llevar enlaces; un PDF sí, y WhatsApp lo muestra con la vista previa de su página.
 *
 * Se escribe a mano (PDF 1.4): la foto va tal cual en JPEG (DCTDecode), sin librerías.
 */

/** Ancho de la página en puntos (7.5 in); el alto sale de la proporción de la imagen. */
export const PDF_PAGE_WIDTH = 540

/** Texto PDF entre paréntesis: se escapan \ ( ) y se quitan saltos de línea. */
function pdfString(text: string): string {
  return text.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[\r\n]/g, '')
}

const round = (n: number) => Math.round(n * 100) / 100

export function linkedImagePdf(
  jpeg: Uint8Array,
  width: number,
  height: number,
  url: string,
  title = 'Invitación',
): Uint8Array {
  const pageW = PDF_PAGE_WIDTH
  const pageH = round((pageW * height) / width)
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0

  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part
    chunks.push(bytes)
    length += bytes.length
  }
  const object = (n: number, ...body: (string | Uint8Array)[]) => {
    offsets[n] = length
    push(`${n} 0 obj\n`)
    body.forEach(push)
    push('\nendobj\n')
  }

  // Encabezado; la segunda línea (bytes > 127) avisa que el archivo es binario.
  push('%PDF-1.4\n')
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))

  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  object(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R /Annots [6 0 R] >>`,
  )
  object(
    4,
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB ` +
      `/BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    jpeg,
    '\nendstream',
  )
  object(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  // El enlace: toda la página, sin borde.
  object(
    6,
    `<< /Type /Annot /Subtype /Link /Rect [0 0 ${pageW} ${pageH}] /Border [0 0 0] ` +
      `/A << /S /URI /URI (${pdfString(url)}) >> >>`,
  )
  // Título (UTF-16 con BOM, para los acentos).
  const utf16 = [0xfe, 0xff]
  for (const ch of title) {
    const code = ch.charCodeAt(0)
    utf16.push(code >> 8, code & 0xff)
  }
  object(7, `<< /Title <${utf16.map((b) => b.toString(16).padStart(2, '0')).join('')}> >>`)

  const xref = length
  const count = offsets.length
  push(`xref\n0 ${count}\n0000000000 65535 f \n`)
  push(
    offsets
      .slice(1)
      .map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)
      .join(''),
  )
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

  const out = new Uint8Array(length)
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}
