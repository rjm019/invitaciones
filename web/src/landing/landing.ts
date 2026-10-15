/**
 * Lo poco que la landing hace con JavaScript (el contenido ya viene en el HTML):
 * la barra al bajar, aparecer al llegar, las pantallas del celular y el formulario.
 * Sin JS todo se ve y el formulario funciona (POST normal).
 */
import { sendQuote, type QuoteErrors, type QuoteForm } from '@/services/quoteService'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const openedAt = Date.now()

function bar(): void {
  const el = document.querySelector<HTMLElement>('.bar')
  if (!el) return
  let ticking = false
  const update = () => {
    el.classList.toggle('is-scrolled', window.scrollY > 8)
    ticking = false
  }
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    },
    { passive: true },
  )
  update()
}

function reveal(): void {
  const items = document.querySelectorAll<HTMLElement>('[data-reveal]')
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach((i) => i.classList.add('is-visible'))
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible')
          io.unobserve(e.target)
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  )
  items.forEach((i) => io.observe(i))
}

/** Muestra la pantalla `name` del celular (las demás se desvanecen). */
function show(phone: Element, name: string): void {
  phone.querySelectorAll<HTMLElement>('.screen').forEach((s) => {
    s.classList.toggle('is-active', s.dataset.screen === name)
  })
}

/** Hero: el celular pasa solo por sus pantallas mientras se ve (no con movimiento reducido). */
function heroPhone(): void {
  const phone = document.querySelector('[data-phone="hero"]')
  if (!phone) return
  const names = [...phone.querySelectorAll<HTMLElement>('.screen')].map((s) => s.dataset.screen!)
  if (reduced || names.length < 2) return
  let i = Math.max(
    0,
    names.indexOf(phone.querySelector<HTMLElement>('.screen.is-active')?.dataset.screen ?? ''),
  )
  let timer: number | undefined
  let visible = true
  const tick = () => {
    i = (i + 1) % names.length
    show(phone, names[i]!)
  }
  const sync = () => {
    window.clearInterval(timer)
    timer = undefined
    if (visible && !document.hidden) timer = window.setInterval(tick, 3400)
  }
  new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting
    sync()
  }).observe(phone)
  document.addEventListener('visibilitychange', sync)
}

/** "Nada es imposible": cada idea que llega al centro cambia la pantalla del celular fijo. */
function story(): void {
  const root = document.querySelector('[data-story]')
  const phone = root?.querySelector('[data-phone="story"]')
  if (!root || !phone || !('IntersectionObserver' in window)) return
  const steps = [...root.querySelectorAll<HTMLElement>('[data-step]')]
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const step = e.target as HTMLElement
        steps.forEach((s) => s.classList.toggle('is-current', s === step))
        show(phone, step.dataset.step!)
      }
    },
    // En el celular, el celular fijo tapa la mitad de arriba: cuenta la franja de abajo.
    {
      rootMargin: window.matchMedia('(max-width: 860px)').matches
        ? '-64% 0px -24% 0px'
        : '-45% 0px -45% 0px',
    },
  )
  steps.forEach((s) => io.observe(s))
}

function quoteForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-quote-form]')
  if (!form) return
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null
  const showErrors = (errors: QuoteErrors) => {
    for (const key of ['telefono', 'tipo', 'privacidad', 'form'] as const) {
      const box = form.querySelector<HTMLElement>(`[data-error="${key}"]`)
      if (box) box.textContent = errors[key] ?? ''
      field(key)?.setAttribute('aria-invalid', errors[key] ? 'true' : 'false')
    }
    const first = (['telefono', 'tipo', 'privacidad'] as const).find((k) => errors[k])
    if (first) field(first)?.focus()
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const data: QuoteForm = {
      telefono: field('telefono')?.value ?? '',
      nombre: field('nombre')?.value ?? '',
      tipo: (form.elements.namedItem('tipo') as HTMLSelectElement | null)?.value ?? '',
      fecha_evento: field('fecha_evento')?.value ?? '',
      idea: (form.elements.namedItem('idea') as HTMLTextAreaElement | null)?.value ?? '',
      privacidad: !!field('privacidad')?.checked,
      pagina: window.location.pathname,
      empresa: field('empresa')?.value ?? '',
      t: openedAt,
    }
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (button) {
      button.disabled = true
      button.dataset.label ??= button.textContent ?? ''
      button.textContent = 'Enviando…'
    }
    const result = await sendQuote(data)
    if (button) {
      button.disabled = false
      button.textContent = button.dataset.label ?? 'Enviar'
    }
    if (!result.ok) {
      showErrors(result.errors)
      return
    }
    const done = form.querySelector<HTMLTemplateElement>('template[data-done]')
    if (done) {
      form.replaceChildren(done.content.cloneNode(true))
      form.querySelector<HTMLElement>('[tabindex="-1"]')?.focus()
    }
  })
}

document.documentElement.classList.add('js')
bar()
reveal()
heroPhone()
story()
quoteForm()
