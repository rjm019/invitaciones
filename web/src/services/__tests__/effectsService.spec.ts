import { describe, expect, it } from 'vitest'
import {
  FABRIC_EFFECTS,
  laceDoilies,
  laceStrokes,
  lightDust,
  pearlBeads,
  pearlStrands,
  petals,
  buntingFlags,
  marigoldPetals,
  bloomFlowers,
  musicNotes,
  flipTiles,
  balloonFlights,
  ribbonCurls,
  cloudDrifts,
  daisyRow,
  soapBubbles,
  tulleVeils,
  cityLights,
  confetti,
  discoBalls,
  discoRays,
  discoSpots,
  discoTiles,
  flutterPieces,
  foilConfetti,
  glints,
  CITY_ICONS,
  cityIcons,
  glitter,
  motionTime,
  parallaxOffset,
  searchlights,
  taxis,
  seededRandom,
  sparkles,
  splitLetters,
  starBurst,
} from '../effectsService'

describe('parallaxOffset', () => {
  it('en el centro de la pantalla no se mueve; arriba y abajo se mueve en sentido contrario', () => {
    expect(parallaxOffset({ top: 300, height: 200 }, 800, 0.06)).toBe(0)
    expect(parallaxOffset({ top: 600, height: 200 }, 800, 0.06)).toBe(-18)
    expect(parallaxOffset({ top: 0, height: 200 }, 800, 0.06)).toBe(18)
  })

  it('nunca pasa del máximo', () => {
    expect(parallaxOffset({ top: 3000, height: 200 }, 800, 0.06)).toBe(-24)
  })
})

describe('splitLetters', () => {
  it('separa en palabras y numera las letras de corrido (acentos incluidos)', () => {
    const { words, count } = splitLetters(' Hoy  comienza el capítulo ')
    expect(words.map((w) => w.map((l) => l.char).join(''))).toEqual([
      'Hoy',
      'comienza',
      'el',
      'capítulo',
    ])
    expect(words[1][0]).toEqual({ char: 'c', index: 3 })
    expect(count).toBe(21)
  })
})

describe('destellos y confeti', () => {
  it('la misma semilla da siempre los mismos números (entre 0 y 1)', () => {
    const a = seededRandom('fecha')
    const b = seededRandom('fecha')
    const first = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(first)
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true)
    expect(seededRandom('otra')()).not.toBe(first[0])
  })

  it('los destellos de una sección no cambian entre visitas y la mayoría va a las orillas', () => {
    const list = sparkles('countdown', 9)
    expect(sparkles('countdown', 9)).toEqual(list)
    expect(list).toHaveLength(9)
    const edges = list.filter((s) => s.left < 16 || s.left > 84)
    expect(edges.length).toBeGreaterThanOrEqual(6)
    expect(list.every((s) => s.top >= 4 && s.top <= 96 && s.delay <= 0)).toBe(true)
  })

  it('el confeti sale del centro, sube, cae y alterna formas y colores', () => {
    const pieces = confetti('sobre', 12, 4)
    expect(pieces).toHaveLength(12)
    expect(pieces.every((p) => p.x >= 42 && p.x <= 58 && p.rise < 0 && p.fall > 0)).toBe(true)
    expect(new Set(pieces.map((p) => p.shape))).toEqual(new Set(['petal', 'strip', 'dot']))
    expect(pieces.map((p) => p.color).slice(0, 5)).toEqual([0, 1, 2, 3, 0])
  })

  it('las estrellitas son chicas, destellan y terminan antes de que se quite la ráfaga', () => {
    const pieces = starBurst('sobre', 30)
    expect(pieces).toHaveLength(30)
    expect(pieces.every((p) => p.shape === 'star' && p.size < 0.8 && p.twinkle! > 0)).toBe(true)
    expect(pieces.every((p) => p.rise < 0 && p.fall > 0 && Math.abs(p.rotate) <= 90)).toBe(true)
    expect(Math.max(...pieces.map((p) => p.delay + p.duration))).toBeLessThan(4.2)
    expect(starBurst('sobre', 30)).toEqual(pieces)
  })
})

describe('figuras de una decoración', () => {
  const parts = [
    { x: 0, y: 44, w: 27.1, h: 23.5 },
    { x: 92.3, y: 15, w: 7.7, h: 9.5 },
  ]

  it('recorta cada mariposa y la hace aletear alrededor de su centro', () => {
    const [a, b] = flutterPieces(parts, 'mariposas')
    expect(a!.clip).toBe('inset(44% 72.9% 32.5% 0%)')
    expect(a!.origin).toBe('13.6% 55.8%')
    expect(b!.clip).toBe('inset(15% 0% 75.5% 92.3%)')
    expect(flutterPieces(parts, 'mariposas')).toEqual([a, b])
    expect(a!.flap).toBeGreaterThanOrEqual(0.35)
    expect(a!.drift).toBeGreaterThanOrEqual(4.5)
  })

  it('pone un destello en el centro de cada estrella, con tamaño entre 5 % y 18 %', () => {
    const list = glints([{ x: 34, y: 29.5, w: 49.2, h: 44.5 }, ...parts], 'estrellas')
    expect(list.map((g) => [g.left, g.top, g.size])).toEqual([
      [58.6, 51.8, 18],
      [13.6, 55.8, 11.8],
      [96.1, 19.8, 5],
    ])
  })
})

describe('motionTime', () => {
  it('cada duración pasa por la velocidad de la invitación', () => {
    expect(motionTime(2.4)).toBe('calc(2.4s * var(--motion-scale))')
    expect(motionTime(120, 'ms')).toBe('calc(120ms * var(--motion-scale))')
  })
})

describe('luces de ciudad, escarcha y reflectores', () => {
  it('las luces se reparten de arriba abajo, sin salirse, y no cambian entre visitas', () => {
    const lights = cityLights('music-player')
    expect(lights).toEqual(cityLights('music-player'))
    expect(lights).toHaveLength(12)
    const tops = lights.map((l) => l.top)
    expect([...tops].sort((a, b) => a - b)).toEqual(tops)
    for (const l of lights) {
      expect(l.top).toBeGreaterThanOrEqual(2)
      expect(l.top).toBeLessThanOrEqual(94)
      expect(l.left).toBeGreaterThanOrEqual(3)
      expect(l.left).toBeLessThanOrEqual(97)
      expect(l.size).toBeGreaterThanOrEqual(0.7)
      expect(l.size).toBeLessThanOrEqual(3.5)
      expect(l.delay).toBeLessThanOrEqual(0)
    }
  })

  it('la escarcha sale de la mitad de arriba y una de cada cuatro es estrellita', () => {
    const specks = glitter('closing', 20)
    expect(specks.filter((s) => s.star)).toHaveLength(5)
    for (const s of specks) {
      expect(s.top).toBeLessThanOrEqual(60)
      expect(s.fall).toBeGreaterThan(0)
      expect(Math.abs(s.sway)).toBeLessThanOrEqual(22)
      expect(s.size).toBeLessThanOrEqual(s.star ? 12 : 4.5)
    }
  })

  it('los reflectores salen de cada lado y se inclinan hacia el centro para cruzarse', () => {
    const [left, right] = searchlights('countdown')
    expect(left.left).toBeLessThan(25)
    expect(right.left).toBeGreaterThan(75)
    expect((left.from + left.to) / 2).toBeGreaterThan(0)
    expect((right.from + right.to) / 2).toBeLessThan(0)
    expect(left.to - left.from).toBeGreaterThanOrEqual(32)
    expect(searchlights('countdown')).toEqual([left, right])
    expect(searchlights('hero', 3)[1].left).toBe(50)
  })
})

describe('bola disco y confeti plateado', () => {
  it('las bolas cuelgan a los lados (nunca al centro), la segunda más chica y girando al revés', () => {
    const [big, small] = discoBalls('hero-envelope')
    expect(discoBalls('hero-envelope')).toEqual([big, small])
    expect(Math.abs(big.left - 50)).toBeGreaterThan(25)
    expect(Math.abs(small.left - 50)).toBeGreaterThan(25)
    // una de cada lado
    expect(Math.sign(big.left - 50)).toBe(-Math.sign(small.left - 50))
    expect(small.size).toBeLessThan(big.size)
    expect(big.reverse).toBe(false)
    expect(small.reverse).toBe(true)
    expect(big.delay).toBeLessThanOrEqual(0)
  })

  it('los espejos cubren la esfera de polo a polo, menos hacia los polos y casi cuadrados', () => {
    const tiles = discoTiles('bola', 10)
    const rows = [...new Set(tiles.map((t) => t.lat))]
    expect(rows).toHaveLength(10)
    expect(Math.min(...rows)).toBe(-81)
    expect(Math.max(...rows)).toBe(81)
    const perRow = (lat: number) => tiles.filter((t) => t.lat === lat)
    expect(perRow(9)).toHaveLength(20)
    expect(perRow(81).length).toBeLessThan(perRow(45).length)
    for (const t of tiles) {
      expect(t.w / t.h).toBeGreaterThan(0.6)
      expect(t.w / t.h).toBeLessThan(1.5)
      expect(t.lon).toBeGreaterThanOrEqual(0)
      expect(t.lon).toBeLessThan(360)
      expect(t.light).toBeGreaterThan(0.2)
      expect(t.light).toBeLessThanOrEqual(1)
    }
    // unos pocos encendidos, no todos
    const lit = tiles.filter((t) => t.light >= 0.9).length
    expect(lit).toBeGreaterThan(3)
    expect(lit).toBeLessThan(tiles.length / 4)
  })

  it('los rayos dan la vuelta completa', () => {
    const rays = discoRays('bola', 8)
    expect(rays).toHaveLength(8)
    expect(rays[0].angle).toBeLessThan(45)
    expect(rays[7].angle).toBeGreaterThan(300)
    for (const r of rays) expect(r.length).toBeLessThanOrEqual(0.8)
  })

  it('los reflejos se reparten a lo alto y a lo largo del recorrido', () => {
    const spots = discoSpots('closing', 26, 24)
    expect(spots).toEqual(discoSpots('closing', 26, 24))
    const tops = spots.map((s) => s.top)
    expect([...tops].sort((a, b) => a - b)).toEqual(tops)
    const phases = spots.map((s) => -s.delay)
    for (const p of phases) {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(24)
    }
    // repartidos: en cada cuarto del recorrido hay reflejos
    for (let q = 0; q < 4; q++) {
      expect(phases.some((p) => p >= q * 6 && p < (q + 1) * 6)).toBe(true)
    }
    expect(spots.filter((s) => s.star).length).toBe(6)
  })

  it('el confeti cae repartido a lo ancho, en tiras, cuadritos y lentejuelas', () => {
    const pieces = foilConfetti('ximena', 16)
    expect(pieces).toEqual(foilConfetti('ximena', 16))
    expect(new Set(pieces.map((p) => p.shape))).toEqual(new Set(['strip', 'square', 'disc']))
    for (const p of pieces) {
      expect(p.left).toBeGreaterThanOrEqual(2)
      expect(p.left).toBeLessThanOrEqual(98)
      expect(p.delay).toBeLessThanOrEqual(0)
      expect(p.duration).toBeGreaterThanOrEqual(11)
      if (p.shape === 'strip') expect(p.height).toBeGreaterThan(p.width)
      else expect(p.height).toBe(p.width)
    }
  })
})

describe('cityIcons', () => {
  it('reparte dibujos distintos por los costados y es estable por sección', () => {
    const icons = cityIcons('ubicacion')
    expect(icons).toEqual(cityIcons('ubicacion'))
    expect(new Set(icons.map((i) => i.name)).size).toBe(icons.length)
    for (const icon of icons) {
      expect(CITY_ICONS).toContain(icon.name)
      expect(icon.inset).toBeLessThan(0.2)
      expect(['left', 'right']).toContain(icon.side)
    }
    expect(cityIcons('otra').map((i) => i.name)).not.toEqual(icons.map((i) => i.name))
  })
})

describe('taxis', () => {
  it('un taxi hacia cada lado, a medio camino uno del otro', () => {
    const cabs = taxis('itinerario')
    expect(cabs.map((c) => c.reverse)).toEqual([false, true])
    expect(cabs[1].delay).toBe(-cabs[0].duration * 0.6)
  })
})

describe('efectos de tela y encaje', () => {
  it('las carpetas de encaje van en esquinas opuestas, giran al revés y son estables', () => {
    const [big, small] = laceDoilies('bendicion')
    expect(laceDoilies('bendicion')).toEqual([big, small])
    expect(big.size).toBeGreaterThan(small.size)
    expect(big.reverse).not.toBe(small.reverse)
    expect(Math.sign(big.left - 50)).not.toBe(Math.sign(small.left - 50))
  })

  it('el encaje se dibuja a trazos escalonados, de adentro hacia afuera', () => {
    const strokes = laceStrokes()
    expect(strokes.filter((s) => s.kind === 'ring')).toHaveLength(4)
    expect(strokes.filter((s) => s.kind === 'petal')).toHaveLength(8)
    expect(strokes.filter((s) => s.kind === 'dot')).toHaveLength(16)
    const delays = strokes.map((s) => s.delay)
    expect([...delays].sort((a, b) => a - b)).toEqual(delays)
    expect(new Set(delays).size).toBeGreaterThan(20)
  })

  it('las perlas cuelgan en arco y el destello las recorre de punta a punta', () => {
    const beads = pearlBeads(15)
    expect(beads).toHaveLength(15)
    expect(beads[0].sag).toBe(0)
    expect(beads[14].sag).toBe(0)
    expect(beads[7].sag).toBeGreaterThan(beads[2].sag)
    expect(beads[14].delay).toBeGreaterThan(beads[0].delay)
    expect(pearlBeads(1)[0].left).toBeGreaterThan(40)
  })

  it('los hilos de perlas cuelgan por las orillas, uno corto al centro, y caen escalonados', () => {
    const strands = pearlStrands('contador')
    expect(strands).toHaveLength(7)
    expect(strands).toEqual(pearlStrands('contador'))
    const sides = strands.slice(0, 6).map((s) => s.left)
    expect(sides.every((l) => l < 20 || l > 80)).toBe(true)
    expect(Math.abs(strands[6].left - 50)).toBeLessThan(1)
    expect(strands[6].length).toBeLessThan(3)
    expect(strands[5].drop).toBeGreaterThan(strands[0].drop)
  })

  it('pétalos, polvo de luz y velos: estables por sección, pocos y dentro de la sección', () => {
    const fall = petals('rsvp')
    expect(fall).toHaveLength(12)
    expect(fall).toEqual(petals('rsvp'))
    for (const p of fall) {
      expect(p.left).toBeGreaterThan(0)
      expect(p.left).toBeLessThan(100)
      expect(p.fall).toBeGreaterThan(100)
      expect(p.duration).toBeGreaterThanOrEqual(12)
    }
    const dust = lightDust('nosotros')
    expect(dust).toHaveLength(22)
    expect(Math.max(...dust.map((m) => m.size))).toBeLessThanOrEqual(7)
    const veils = tulleVeils('clima')
    expect(veils.map((v) => v.side)).toEqual(['left', 'left', 'right', 'right'])
    expect(veils[0].width).toBeGreaterThan(veils[1].width)
  })

  it('FABRIC_EFFECTS no repite nombres', () => {
    expect(new Set(FABRIC_EFFECTS).size).toBe(FABRIC_EFFECTS.length)
  })
})

describe('efectos de fiesta mexicana', () => {
  it('banderines: dos hileras de 5 a 7, estables por sección y con los 7 colores posibles', () => {
    const flags = buntingFlags('portada')
    expect(flags).toEqual(buntingFlags('portada'))
    for (const row of [0, 1]) {
      const inRow = flags.filter((f) => f.row === row)
      expect(inRow.length).toBeGreaterThanOrEqual(5)
      expect(inRow.length).toBeLessThanOrEqual(7)
    }
    for (const f of flags) {
      expect(f.color).toBeGreaterThanOrEqual(0)
      expect(f.color).toBeLessThan(7)
      expect(f.left).toBeGreaterThan(0)
      expect(f.left).toBeLessThan(100)
      expect(f.duration).toBeGreaterThan(2)
    }
  })

  it('cempasúchil: la caída de los pétalos con tres tonos', () => {
    const fall = marigoldPetals('regalos')
    expect(fall).toHaveLength(14)
    expect(fall).toEqual(marigoldPetals('regalos'))
    for (const p of fall) {
      expect([0, 1, 2]).toContain(p.tone)
      expect(p.fall).toBeGreaterThan(100)
    }
  })

  it('flores que brotan: tres por esquina, escalonadas', () => {
    const flowers = bloomFlowers('ubicacion')
    expect(flowers).toEqual(bloomFlowers('ubicacion'))
    expect(flowers.map((f) => f.corner)).toEqual(['tl', 'tl', 'tl', 'br', 'br', 'br'])
    for (const f of flowers) expect(f.kind).toBeLessThan(5)
    expect(flowers[5].delay).toBeGreaterThan(flowers[0].delay)
  })

  it('notas: de 8 a 10, suben y se van de lado', () => {
    const notes = musicNotes('musica')
    expect(notes).toEqual(musicNotes('musica'))
    expect(notes.length).toBeGreaterThanOrEqual(8)
    expect(notes.length).toBeLessThanOrEqual(10)
    for (const n of notes) {
      expect(n.rise).toBeGreaterThan(100)
      expect([0, 1]).toContain(n.glyph)
    }
  })

  it('azulejos: siete, alternando los cuatro dibujos y volteándose en orden', () => {
    const tiles = flipTiles('fecha')
    expect(tiles.map((t) => t.tile)).toEqual([1, 2, 3, 4, 1, 2, 3])
    expect(tiles[6].delay).toBeGreaterThan(tiles[0].delay)
  })
})

describe('efectos de baby shower', () => {
  it('globos: siete, siempre a los costados y a destiempo', () => {
    const balloons = balloonFlights('fecha')
    expect(balloons).toEqual(balloonFlights('fecha'))
    expect(balloons).toHaveLength(7)
    for (const b of balloons) {
      expect(b.left < 20 || b.left > 80).toBe(true)
      expect(b.tone).toBeLessThan(5)
      expect(b.duration).toBeGreaterThan(10)
    }
    expect(new Set(balloons.map((b) => b.delay)).size).toBeGreaterThan(3)
  })

  it('listones: dos rizos por esquina de arriba', () => {
    const curls = ribbonCurls('portada')
    expect(curls).toEqual(ribbonCurls('portada'))
    expect(curls.map((c) => c.corner)).toEqual(['l', 'l', 'r', 'r'])
    for (const c of curls) expect(c.length).toBeGreaterThan(3.5)
  })

  it('nubes: tres lejanas y dos cercanas, las lejanas más lentas', () => {
    const clouds = cloudDrifts('musica')
    expect(clouds).toEqual(cloudDrifts('musica'))
    expect(clouds.map((c) => c.layer)).toEqual([0, 0, 0, 1, 1])
    const far = Math.min(...clouds.filter((c) => c.layer === 0).map((c) => c.duration))
    const near = Math.max(...clouds.filter((c) => c.layer === 1).map((c) => c.duration))
    expect(far).toBeGreaterThan(near)
  })

  it('margaritas: nueve, de izquierda a derecha y brotando en orden', () => {
    const daisies = daisyRow('ubicacion')
    expect(daisies).toEqual(daisyRow('ubicacion'))
    expect(daisies).toHaveLength(9)
    expect(daisies[8].delay).toBeGreaterThan(daisies[0].delay)
    expect(daisies[8].left).toBeGreaterThan(daisies[0].left)
  })

  it('burbujas: diez, suben entre 40 y 75 % del alto', () => {
    const bubbles = soapBubbles('fecha')
    expect(bubbles).toEqual(soapBubbles('fecha'))
    expect(bubbles).toHaveLength(10)
    for (const b of bubbles) {
      expect(b.rise).toBeGreaterThanOrEqual(40)
      expect(b.rise).toBeLessThanOrEqual(75)
    }
  })
})
