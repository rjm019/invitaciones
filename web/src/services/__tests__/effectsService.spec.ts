import { describe, expect, it } from 'vitest'
import {
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
