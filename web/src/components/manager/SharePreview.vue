<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useEditor } from '@/composables/useEditorContext'
import { useShareCard } from '@/composables/useShareCard'
import { googleFontsUrl, resolveFonts } from '@/services/themeService'
import type { ThemeFont } from '@/themes/types'
import ManagerIcon from './ManagerIcon.vue'

/**
 * La imagen que el cliente manda por WhatsApp desde su panel (la del PDF), con un invitado
 * de ejemplo. Se arma al abrirla y se rehace cuando cambian los datos, los colores o las
 * letras; sus textos y su fondo son `tarjeta_frase`, `tarjeta_texto` y `tarjeta_fondo`.
 */
const { brand, theme, themeColors } = useEditor()
const { render } = useShareCard()

const SAMPLE = {
  id: 'ejemplo',
  label: 'Familia Pérez',
  passes: 4,
  url: `${location.origin}/i/ejemplo`,
}
const open = ref(false)
const image = ref<string | null>(null)
const busy = ref(false)
const failed = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
let drawing = 0
let shown: string[] = []

// El lienzo solo usa letras que este documento ya cargó: se piden las de la tarjeta.
let link: HTMLLinkElement | null = null
function loadFonts(fonts: (ThemeFont | undefined)[]): Promise<void> {
  const href = googleFontsUrl(fonts.filter((f): f is ThemeFont => !!f))
  if (!href || link?.href === href) return Promise.resolve()
  link?.remove()
  const next = Object.assign(document.createElement('link'), { rel: 'stylesheet', href })
  link = next
  return new Promise((resolve) => {
    const done = () => resolve()
    next.addEventListener('load', done, { once: true })
    next.addEventListener('error', done, { once: true })
    setTimeout(done, 3000)
    document.head.append(next)
  })
}

async function draw(): Promise<void> {
  const current = brand.value
  const manifest = theme.value
  if (!open.value || !current || !manifest) return
  const ticket = ++drawing
  busy.value = true
  failed.value = ''
  try {
    const fonts = resolveFonts(manifest.fonts, current.fonts ?? {})
    await loadFonts([fonts.script, fonts.serif, fonts.engraved ?? fonts.caps])
    const card = await render(current, manifest, fonts, SAMPLE, themeColors.value)
    if (ticket !== drawing) {
      URL.revokeObjectURL(card.previewUrl)
      URL.revokeObjectURL(card.pdfUrl)
      return
    }
    shown.forEach((u) => URL.revokeObjectURL(u))
    shown = [card.previewUrl, card.pdfUrl]
    image.value = card.previewUrl
  } catch (e) {
    if (ticket === drawing)
      failed.value = e instanceof Error ? e.message : 'No se pudo crear la imagen.'
  } finally {
    if (ticket === drawing) busy.value = false
  }
}

watch([open, brand, theme, themeColors], () => {
  clearTimeout(timer)
  if (open.value) timer = setTimeout(() => void draw(), 400)
})

onBeforeUnmount(() => {
  clearTimeout(timer)
  drawing++
  link?.remove()
})
</script>

<template>
  <div class="share">
    <button type="button" class="g-btn g-btn--small" :aria-expanded="open" @click="open = !open">
      <ManagerIcon :name="open ? 'chevron-up' : 'image'" />
      {{ open ? 'Ocultar la tarjeta' : 'Ver la tarjeta para WhatsApp' }}
    </button>
    <div v-if="open" class="share__frame" :aria-busy="busy">
      <img
        v-if="image"
        :src="image"
        class="share__image"
        :class="{ 'is-busy': busy }"
        alt="Tarjeta para WhatsApp con un invitado de ejemplo"
      />
      <p v-else-if="!failed" class="share__state">
        <ManagerIcon name="spinner" spin /> Armando la tarjeta…
      </p>
      <p v-if="failed" class="g-error" role="alert">{{ failed }}</p>
    </div>
    <p v-if="open" class="g-help">
      Así la manda el cliente desde su panel (aquí, para "Familia Pérez", 4 invitados). Tocarla en
      cualquier parte abre la invitación.
    </p>
  </div>
</template>

<style scoped>
.share {
  display: grid;
  justify-items: start;
  gap: 10px;
  margin-top: 14px;
}
.share__frame {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid var(--g-line);
  border-radius: 12px;
  background: var(--g-surface-3);
}
.share__image {
  width: min(100%, 240px);
  border-radius: 8px;
  box-shadow: var(--g-shadow-lg);
  transition: opacity 0.2s var(--g-ease);
}
.share__image.is-busy {
  opacity: 0.6;
}
.share__state {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--g-faint);
  font-size: 13px;
}
@media (prefers-reduced-motion: reduce) {
  .share__image {
    transition: none;
  }
}
</style>
