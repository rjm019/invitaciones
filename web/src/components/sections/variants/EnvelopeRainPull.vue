<script setup lang="ts">
import { computed, ref } from 'vue'
import EnvelopeRainSection from '@/components/sections/EnvelopeRainSection.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useEvent } from '@/composables/useEvent'
import { usePreview } from '@/composables/usePreview'
import { decorOr } from '@/services/decorService'
import { motionTime } from '@/services/effectsService'
import { groupDigits } from '@/services/giftService'
import type { ResolvedSection } from '@/types/event'

/**
 * Lluvia de sobres con un sobre de imagen que se abre (`sobre-imagen`). Tres capas con el
 * mismo lienzo: atrás (solapa e interior), la hoja y el frente (bolsillo). Al tocar el sobre,
 * la hoja sale hacia arriba y pasa al frente; en ella van el título, el texto, los datos
 * bancarios con su botón para copiar y el aviso de la caja. Tocar de nuevo la guarda.
 * Sin imágenes de sobre cae al diseño clásico. Solo se animan transform y opacity; con
 * prefers-reduced-motion arranca abierto y sin animación.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const { copied, copy } = useClipboard()
const envelope = computed(() => event.value.envelope ?? null)

const back = computed(() => decorOr(props.section.decor, 'envelope_back', null))
const front = computed(() => decorOr(props.section.decor, 'envelope_front', null))
const paper = computed(() => decorOr(props.section.decor, 'envelope_sheet', null))
const hasImages = computed(() => !!(back.value || front.value))

const reduced =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
// En la vista previa del gestor arranca abierto: así se ve y se acomoda lo que va en la hoja.
const preview = usePreview()
const open = ref(reduced || !!preview.value)
function toggle(): void {
  open.value = !open.value
}

// Proporción (ancho / alto) del lienzo y de la hoja: la que dice la sección o la de la imagen.
const stageRatio = ref<number | null>(null)
const paperRatio = ref<number | null>(null)
function ratioOf(e: Event): number | null {
  const img = e.target as HTMLImageElement
  return img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : null
}
function onStage(e: Event): void {
  stageRatio.value = ratioOf(e) ?? stageRatio.value
}
function onPaper(e: Event): void {
  paperRatio.value = ratioOf(e) ?? paperRatio.value
}

const style = computed(() => {
  const pull = props.section.pull ?? {}
  const safe = props.section.sheet ?? {}
  return {
    '--ratio': String(stageRatio.value ?? 0.95),
    '--sratio': String(paperRatio.value ?? 1),
    '--hx': String(pull.x ?? 50),
    '--hy': String(pull.y ?? 55),
    '--hw': String(pull.width ?? 75),
    '--tilt': `${pull.tilt ?? 0}deg`,
    '--zt': `${safe.top ?? 10}%`,
    '--zr': `${safe.right ?? 10}%`,
    '--zb': `${safe.bottom ?? 10}%`,
    '--zl': `${safe.left ?? 10}%`,
    '--dur': motionTime(0.8),
  }
})
</script>

<template>
  <EnvelopeRainSection v-if="!hasImages" :section="section" />
  <div v-else class="pull" :style="style">
    <section v-if="envelope" class="pull__box" aria-labelledby="pull-title">
      <div class="pull__stage" :class="{ 'is-open': open }" data-pull-stage>
        <img v-if="back" class="pull__layer pull__back" :src="back" alt="" @load="onStage" />
        <div class="pull__sheet" :inert="!open" :class="{ 'pull__sheet--plain': !paper }">
          <img v-if="paper" class="pull__paper" :src="paper" alt="" @load="onPaper" />
          <div class="pull__safe">
            <h2 id="pull-title" class="pull__title" data-text="title">
              {{ envelope.title || 'Lluvia de sobres' }}
            </h2>
            <p v-if="envelope.text" class="pull__text" data-text="text">{{ envelope.text }}</p>
            <div v-if="envelope.account" class="pull__bank" data-text="account">
              <span v-if="envelope.bank" class="pull__bank-name">{{ envelope.bank }}</span>
              <span class="pull__account">{{ groupDigits(envelope.account) }}</span>
              <span v-if="envelope.holder" class="pull__holder">{{ envelope.holder }}</span>
              <button
                type="button"
                class="pull__copy"
                aria-label="Copiar el número de cuenta"
                @click="copy(envelope.account, 'account')"
              >
                <AppIcon name="copy" />
                {{ copied === 'account' ? 'Copiado' : 'Copiar' }}
              </button>
            </div>
            <p v-else-if="envelope.hidden" class="pull__note">
              Los datos para tu sobre vienen en tu invitación personal.
            </p>
            <p v-if="envelope.box" class="pull__note">También habrá caja para sobres en el salón.</p>
          </div>
        </div>
        <img v-if="front" class="pull__layer pull__front" :src="front" alt="" @load="onStage" />
        <button
          type="button"
          class="pull__toggle"
          :aria-expanded="open"
          aria-label="Sobre de regalo: abrir o guardar la hoja con los datos"
          @click="toggle"
        ></button>
      </div>
      <p class="pull__hint" aria-hidden="true">{{ open ? 'Toca el sobre para guardarla' : 'Toca el sobre' }}</p>
    </section>
  </div>
</template>

<style scoped>
.pull {
  container-type: inline-size;
  display: grid;
  justify-items: center;
  width: 100%;
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.pull__box {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  width: 100%;
}
.pull__stage {
  --open-scale: 1.12;
  /* Alto de la hoja abierta (con su escala) y centro de llegada: arriba del lienzo, sin salirse. */
  --open-h: calc(var(--hw) * 1cqw * var(--open-scale) / var(--sratio));
  --open-cy: calc(var(--open-h) / 2 + 2cqw);
  --closed-cy: calc(var(--hy) / var(--ratio) * 1cqw);
  position: relative;
  width: 100%;
  aspect-ratio: var(--ratio);
  /* Si la hoja abierta es más alta que el lienzo, se reserva el resto abajo. */
  margin-bottom: max(0px, calc(var(--open-h) + 4cqw - 100cqw / var(--ratio)));
}
.pull__layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}
.pull__back {
  z-index: 0;
}
.pull__front {
  z-index: 2;
}
.pull__sheet {
  position: absolute;
  z-index: 1;
  left: calc(var(--hx) * 1%);
  top: var(--closed-cy);
  width: calc(var(--hw) * 1%);
  aspect-ratio: var(--sratio);
  transform: translate(-50%, -50%) rotate(var(--tilt));
  transition: transform var(--dur) cubic-bezier(0.22, 0.8, 0.3, 1);
  filter: drop-shadow(0 0.25rem 0.5rem rgb(0 0 0 / 0.22));
  will-change: transform;
}
.pull__sheet--plain {
  background: var(--color-surface);
}
.pull__paper {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.is-open .pull__sheet {
  z-index: 4;
  transform: translate(
      calc(-50% + (50 - var(--hx)) * 1cqw),
      calc(-50% + var(--open-cy) - var(--closed-cy))
    )
    scale(var(--open-scale));
}
.pull__safe {
  position: absolute;
  inset: var(--zt) var(--zr) var(--zb) var(--zl);
  container-type: inline-size;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity var(--dur) ease;
}
.is-open .pull__safe {
  opacity: 1;
}
.pull__toggle {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.pull__toggle:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.pull__hint {
  margin: 0;
  font-family: var(--font-caps);
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-primary);
}
.pull__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(1.3rem, 11cqi, 2.4rem) * var(--t-title-size, 1));
  line-height: 1.05;
  color: var(--t-title-color, var(--color-primary));
  overflow-wrap: anywhere;
}
.pull__text {
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(clamp(0.7rem, 4.6cqi, 1rem) * var(--t-text-size, 1));
  line-height: 1.3;
  color: var(--t-text-color, var(--color-text));
}
.pull__bank {
  display: grid;
  justify-items: center;
  gap: 0.1rem;
  font-family: var(--t-account-font, var(--font-serif));
  color: var(--t-account-color, var(--color-text));
}
.pull__bank-name {
  font-family: var(--font-caps);
  font-size: clamp(0.6rem, 3.4cqi, 0.8rem);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.pull__account {
  font-size: calc(clamp(0.85rem, 6.2cqi, 1.15rem) * var(--t-account-size, 1));
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.pull__holder {
  font-size: clamp(0.7rem, 4cqi, 0.9rem);
}
.pull__copy {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.15rem;
  padding: 0.2rem 0.7rem;
  border: 1px solid color-mix(in srgb, var(--color-primary) 55%, transparent);
  border-radius: 999px;
  background: none;
  color: var(--color-primary);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.pull__copy :deep(.app-icon) {
  width: 0.85em;
  height: 0.85em;
}
.pull__copy:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
.pull__note {
  margin: 0;
  font-size: clamp(0.65rem, 3.8cqi, 0.85rem);
  color: color-mix(in srgb, var(--color-text) 80%, transparent);
}
@media (prefers-reduced-motion: reduce) {
  .pull__sheet,
  .pull__safe {
    transition: none;
  }
}
</style>
