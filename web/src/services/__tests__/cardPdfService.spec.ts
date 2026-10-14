import { describe, expect, it } from 'vitest'
import { linkedImagePdf } from '../cardPdfService'

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9])
const text = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join('')

describe('linkedImagePdf', () => {
  const pdf = linkedImagePdf(jpeg, 1080, 1350, 'https://x.dev/i/Abc(1)')
  const raw = text(pdf)

  it('una página del tamaño de la imagen, con la foto en JPEG tal cual', () => {
    expect(raw.startsWith('%PDF-1.4\n')).toBe(true)
    expect(raw).toContain('/MediaBox [0 0 540 675]')
    expect(raw).toContain('/Width 1080 /Height 1350')
    expect(raw).toContain('/Filter /DCTDecode /Length 8')
    expect(raw).toContain(text(jpeg))
    expect(raw.trimEnd().endsWith('%%EOF')).toBe(true)
  })

  it('toda la página es el enlace (oculto, sin borde) a la invitación', () => {
    expect(raw).toContain('/Subtype /Link /Rect [0 0 540 675] /Border [0 0 0]')
    expect(raw).toContain('/URI (https://x.dev/i/Abc\\(1\\))')
  })

  it('el índice apunta a cada objeto (los lectores lo usan para abrirlo)', () => {
    const start = Number(/startxref\n(\d+)/.exec(raw)?.[1])
    expect(raw.slice(start, start + 4)).toBe('xref')
    const rows = raw.slice(start).split('\n').slice(3, 10)
    rows.forEach((row, i) => {
      const offset = Number(row.slice(0, 10))
      expect(raw.startsWith(`${i + 1} 0 obj\n`, offset)).toBe(true)
    })
  })
})
