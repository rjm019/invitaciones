import { describe, expect, it, vi } from 'vitest'
import { createAudioPlayer, formatTime, type AudioLike } from '../audioService'

/** Audio falso: dispara los mismos eventos que el real. */
class FakeAudio extends EventTarget implements AudioLike {
  src = ''
  preload = ''
  loop = false
  currentTime = 0
  duration = 120
  paused = true
  blocked = false
  async play() {
    if (this.blocked) throw new DOMException('sin gesto', 'NotAllowedError')
    this.paused = false
    this.dispatchEvent(new Event('play'))
  }
  pause() {
    this.paused = true
    this.dispatchEvent(new Event('pause'))
  }
  removeAttribute() {
    this.src = ''
  }
  load() {}
}

describe('audioService', () => {
  it('sin canción en el layout no está disponible y nunca crea el audio', async () => {
    const create = vi.fn(() => new FakeAudio())
    const player = createAudioPlayer(null, create)
    await player.play()
    expect(player.state().available).toBe(false)
    expect(create).not.toHaveBeenCalled()
  })

  it('crea el audio hasta el primer play y avisa a quien escucha', async () => {
    const fake = new FakeAudio()
    const create = vi.fn(() => fake)
    const player = createAudioPlayer('/media/x/cancion.mp3', create)
    const seen: boolean[] = []
    player.subscribe((s) => seen.push(s.playing))

    expect(create).not.toHaveBeenCalled()
    await player.play()
    expect(fake.src).toBe('/media/x/cancion.mp3')
    expect(fake.loop).toBe(true) // la música de fondo se repite
    expect(player.state()).toMatchObject({ playing: true, started: true, duration: 120 })

    await player.toggle()
    expect(player.state().playing).toBe(false)
    expect(seen).toEqual([false, true, false])
  })

  it('adelantar, regresar e ir a un punto no se salen de la canción', async () => {
    const fake = new FakeAudio()
    const player = createAudioPlayer('/m.mp3', () => fake)
    await player.play()
    player.skip(-10)
    expect(fake.currentTime).toBe(0)
    player.seek(500)
    expect(fake.currentTime).toBe(120)
    player.seek(30)
    player.skip(10)
    expect(player.state().current).toBe(40)
  })

  it('si el navegador bloquea el audio se queda en pausa, sin error', async () => {
    const fake = Object.assign(new FakeAudio(), { blocked: true })
    const player = createAudioPlayer('/m.mp3', () => fake)
    await player.play()
    expect(player.state()).toMatchObject({ playing: false, started: false, error: null })
  })

  it('un archivo que no carga se reporta en español', async () => {
    const fake = new FakeAudio()
    const player = createAudioPlayer('/m.mp3', () => fake)
    await player.play()
    fake.dispatchEvent(new Event('error'))
    expect(player.state().error).toBe('No se pudo cargar la música.')
  })

  it('al destruirlo se detiene y suelta el archivo', async () => {
    const fake = new FakeAudio()
    const player = createAudioPlayer('/m.mp3', () => fake)
    await player.play()
    player.destroy()
    expect(fake.paused).toBe(true)
    expect(fake.src).toBe('')
  })

  it('formatTime', () => {
    expect(formatTime(75.4)).toBe('1:15')
    expect(formatTime(Number.NaN)).toBe('0:00')
  })
})

describe('audioService · segundo de inicio', () => {
  const setup = (start: number, duration = 120) => {
    const fake = new FakeAudio()
    fake.duration = duration
    const player = createAudioPlayer('/m.mp3', () => fake, start)
    return { fake, player }
  }

  it('salta al inicio cuando hay metadatos y no repite solo', async () => {
    const { fake, player } = setup(45)
    await player.play()
    expect(fake.loop).toBe(false)
    fake.dispatchEvent(new Event('loadedmetadata'))
    expect(fake.currentTime).toBe(45)
    fake.dispatchEvent(new Event('canplay'))
    expect(fake.currentTime).toBe(45)
  })

  it('no reinicia la canción si ya avanzó más allá del inicio', async () => {
    const { fake, player } = setup(45)
    await player.play()
    fake.currentTime = 80
    fake.dispatchEvent(new Event('canplay'))
    expect(fake.currentTime).toBe(80)
  })

  it('con inicio mayor o igual a la duración lo ignora y empieza en 0', async () => {
    const { fake, player } = setup(120)
    await player.play()
    fake.dispatchEvent(new Event('loadedmetadata'))
    fake.dispatchEvent(new Event('canplay'))
    expect(fake.currentTime).toBe(0)
    expect(fake.loop).toBe(true)
  })

  it('al terminar y repetir regresa al inicio configurado, no a 0', async () => {
    const { fake, player } = setup(45)
    await player.play()
    fake.dispatchEvent(new Event('canplay'))
    fake.currentTime = 120
    fake.paused = true
    fake.dispatchEvent(new Event('ended'))
    expect(fake.currentTime).toBe(45)
    expect(fake.paused).toBe(false)
  })

  it('sin repetir, al terminar se queda al final', async () => {
    const { fake, player } = setup(45)
    await player.play()
    fake.dispatchEvent(new Event('canplay'))
    player.setLoop(false)
    fake.currentTime = 120
    fake.dispatchEvent(new Event('ended'))
    expect(fake.currentTime).toBe(120)
    expect(player.state().playing).toBe(false)
  })

  it('sin inicio todo queda como antes', async () => {
    const { fake, player } = setup(0)
    await player.play()
    fake.dispatchEvent(new Event('canplay'))
    expect(fake.currentTime).toBe(0)
    expect(fake.loop).toBe(true)
  })
})
