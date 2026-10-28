// Genera src/services/sealGlyphs.ts: el contorno de A–Z y Ñ en Pinyon Script, como paths SVG.
// Herramienta de desarrollo (no corre en el build). Sin dependencia nueva en package.json:
//   docker compose exec -T web sh -c 'npm install --no-save --prefix /tmp/ot opentype.js \
//     && OPENTYPE_PATH=/tmp/ot/node_modules/opentype.js node scripts/seal-glyphs.mjs'
// La fuente sale de @fontsource/pinyon-script (o de dist/assets si no está el paquete).
import { createRequire } from 'node:module'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const opentype = require(process.env.OPENTYPE_PATH ?? 'opentype.js')
const fontFile = 'node_modules/@fontsource/pinyon-script/files/pinyon-script-latin-400-normal.woff'
if (!existsSync(fontFile)) throw new Error(`Falta la fuente: ${fontFile}`)
const buf = readFileSync(fontFile)
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))

const chars = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'Ñ']
const round = (n) => Math.round(n * 10) / 10
let scaleN = 1
const entries = []
for (const ch of chars) {
  const path = font.getPath(ch, 0, 0, 1000)
  const box = path.getBoundingBox()
  // Cada letra mide 100 de alto; la Ñ usa la escala de la N (la tilde sobresale).
  let k = 100 / (box.y2 - box.y1)
  if (ch === 'N') scaleN = k
  if (ch === 'Ñ') k = scaleN
  const top = box.y1
  const left = box.x1
  const d = path.commands
    .map((c) => {
      const p = (x, y) => `${round((x - left) * k)} ${round((y - top) * k)}`
      switch (c.type) {
        case 'M': return `M${p(c.x, c.y)}`
        case 'L': return `L${p(c.x, c.y)}`
        case 'C': return `C${p(c.x1, c.y1)} ${p(c.x2, c.y2)} ${p(c.x, c.y)}`
        case 'Q': return `Q${p(c.x1, c.y1)} ${p(c.x, c.y)}`
        default: return 'Z'
      }
    })
    .join('')
  entries.push({ ch, d, w: round((box.x2 - box.x1) * k), h: round((box.y2 - box.y1) * k) })
}
const body = entries
  .map((e) => `  ${e.ch}: { d: '${e.d}', w: ${e.w}, h: ${e.h} },`)
  .join('\n')
const out = `// GENERADO por web/scripts/seal-glyphs.mjs: no se edita a mano.
// Contornos de Pinyon Script (© Google Inc., licencia SIL Open Font License 1.1,
// https://scripts.sil.org/OFL), convertidos a paths SVG. Cada letra empieza en (0, 0) y
// mide 100 de alto (\`h\`) por \`w\` de ancho; la Ñ conserva la escala de la N.

export interface SealGlyph {
  d: string
  w: number
  h: number
}

export const SEAL_GLYPHS: Record<string, SealGlyph> = {
${body}
}
`
writeFileSync(fileURLToPath(new URL('../src/services/sealGlyphs.ts', import.meta.url)), out)
console.log(`Listo: ${entries.length} letras`)
