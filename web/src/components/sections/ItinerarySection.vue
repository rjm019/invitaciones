<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useEvent } from '@/composables/useEvent'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useTimelineProgress } from '@/composables/useTimelineProgress'
import { time12h } from '@/services/dateFormatService'
import type { ResolvedSection } from '@/types/event'

const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()
const reduced = useReducedMotion()

const items = computed(() => event.value.itinerary)
const title = computed(() => props.section.title ?? 'Itinerario')

// Línea que se llena con el scroll (efecto "linea" en el layout).
const track = ref<HTMLElement | null>(null)
const dots = ref<HTMLElement[]>([])
const { fill, active } = useTimelineProgress(
  track,
  dots,
  () => props.section.effects.includes('timeline-fill') && !reduced.value,
)

const frameStyle = computed(() =>
  props.section.decor.frame ? { '--frame-image': `url("${props.section.decor.frame}")` } : {},
)
</script>

<template>
  <div class="itinerary">
    <div
      class="itinerary__frame"
      :class="{ 'itinerary__frame--image': section.decor.frame }"
      :style="frameStyle"
    >
      <h2 class="itinerary__title">{{ title }}</h2>

      <ol
        ref="track"
        class="itinerary__list"
        :class="`itinerary__list--${section.variant ?? 'zigzag'}`"
      >
        <span class="itinerary__line" aria-hidden="true">
          <span class="itinerary__line-fill" :style="{ transform: `scaleY(${fill})` }" />
        </span>

        <li
          v-for="(item, i) in items"
          :key="`${item.time}-${item.label}`"
          class="itinerary__item"
          :class="i % 2 === 0 ? 'itinerary__item--left' : 'itinerary__item--right'"
          :style="{ gridRow: i + 1 }"
        >
          <AppIcon v-if="item.icon" :name="item.icon" class="itinerary__icon" />
          <span class="itinerary__label">{{ item.label }}</span>
          <time class="itinerary__time" :datetime="item.time">{{ time12h(item.time) }}</time>
        </li>

        <span
          v-for="(item, i) in items"
          :key="`dot-${i}`"
          ref="dots"
          class="itinerary__dot"
          :class="{ 'is-active': i < active }"
          :style="{ gridRow: i + 1 }"
          aria-hidden="true"
        />
      </ol>
    </div>
  </div>
</template>

<style scoped>
.itinerary {
  container-type: inline-size;
  max-width: 26rem;
  margin: 0 auto;
  text-align: center;
}
/*
 * Marco del tema cortado en 9 partes (border-image): los adornos de arriba y abajo
 * no se deforman aunque el itinerario tenga 3 u 8 actividades. Los grosores se miden
 * con cqw contra .itinerary (el contenedor), así escalan con el ancho.
 */
.itinerary__frame--image {
  --frame-top: calc(100cqw * 300 / 920);
  --frame-side: calc(100cqw * 110 / 920);
  --frame-bottom: calc(100cqw * 260 / 920);
  border-style: solid;
  border-color: transparent;
  border-width: var(--frame-top) var(--frame-side) var(--frame-bottom);
  border-image: var(--frame-image) 300 110 260 110 / var(--frame-top) var(--frame-side)
    var(--frame-bottom) stretch;
  padding: 0 0 var(--space-2);
}
.itinerary__frame:not(.itinerary__frame--image) {
  padding: var(--space-3) var(--space-2);
  border: 1px solid var(--color-frame);
  border-radius: var(--radius-card);
}
.itinerary__title {
  margin: calc(var(--space-2) * -1) 0 var(--space-2);
  font-family: var(--font-script);
  font-weight: 400;
  font-size: clamp(2.3rem, 12cqi, 3.2rem);
  color: var(--color-primary);
}
.itinerary__list {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1.5rem 1fr;
  grid-auto-rows: 5.2rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.itinerary__line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  background: color-mix(in srgb, var(--color-primary) 30%, transparent);
}
.itinerary__line-fill {
  position: absolute;
  inset: 0;
  background: var(--color-primary);
  transform-origin: top;
  transition: transform calc(0.15s * var(--motion-scale)) linear;
}
.itinerary__dot {
  grid-column: 2;
  align-self: center;
  justify-self: center;
  width: 0.8rem;
  height: 0.8rem;
  border: 2px solid var(--color-primary);
  border-radius: 50%;
  background: var(--color-bg);
  transition: background-color calc(0.4s * var(--motion-scale)) ease;
  z-index: 1;
}
.itinerary__dot.is-active {
  background: var(--color-primary);
}
.itinerary__item {
  display: grid;
  justify-items: center;
  align-self: center;
  gap: 0.15rem;
  color: var(--color-text);
}
.itinerary__item--left {
  grid-column: 1;
}
.itinerary__item--right {
  grid-column: 3;
}
.itinerary__icon {
  margin-bottom: 0.2rem;
  font-size: 0.85rem;
  color: var(--color-primary);
}
.itinerary__label {
  font-family: var(--font-caps);
  font-size: clamp(1.05rem, 5cqi, 1.3rem);
  letter-spacing: 0.06em;
  line-height: 1.2;
}
.itinerary__time {
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: clamp(1.05rem, 5cqi, 1.3rem);
  letter-spacing: 0.06em;
}
/* Variante "lista": todas las actividades de un lado. En pantallas muy angostas también. */
.itinerary__list--lista .itinerary__item {
  grid-column: 3;
  justify-items: start;
}
@container (max-width: 260px) {
  .itinerary__item {
    grid-column: 3;
    justify-items: start;
  }
}
</style>
