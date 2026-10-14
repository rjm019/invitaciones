<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import type { ResolvedSection } from '@/types/event'

/**
 * Código de vestimenta en una tarjeta de papel con sello de lacre. Al entrar, el sello
 * "cae" y las figuras llegan desde los lados. Los colores salen de vestimenta_colores.
 * Con el efecto "cambio de color", la tarjeta va y viene a una versión negra con solo
 * los textos en blanco (otra cara encima que aparece y se va: solo opacity).
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()

const title = computed(() => props.section.title ?? 'Dress Code')
const colors = computed(() => event.value.dress_code.colors)
const cardStyle = computed(() =>
  props.section.decor.card ? { backgroundImage: `url("${props.section.decor.card}")` } : {},
)

// Cara negra: el mismo papel, oscurecido.
const night = computed(() => props.section.effects.includes('color-shift'))
const nightStyle = computed(() =>
  props.section.decor.card ? { '--night-paper': `url("${props.section.decor.card}")` } : {},
)

const root = ref<HTMLElement | null>(null)
const shown = useInView(root)
</script>

<template>
  <div ref="root" class="dress" :class="{ 'is-shown': shown }">
    <div class="dress__card" :style="cardStyle">
      <div class="dress__day" :class="{ 'is-cycling': night }">
        <img v-if="section.decor.seal" :src="section.decor.seal" alt="" class="dress__seal" />
        <h2 class="dress__title" data-text="title">{{ title }}</h2>
        <p v-if="section.subtitle" class="dress__subtitle" data-text="subtitle">
          {{ section.subtitle }}
        </p>

        <div
          v-if="section.decor.woman || section.decor.man"
          class="dress__figures"
          aria-hidden="true"
        >
          <img
            v-if="section.decor.woman"
            :src="section.decor.woman"
            alt=""
            class="dress__figure dress__figure--left"
          />
          <img
            v-if="section.decor.man"
            :src="section.decor.man"
            alt=""
            class="dress__figure dress__figure--right"
          />
        </div>

        <p v-if="section.text" class="dress__text" data-text="text">{{ section.text }}</p>

        <ul v-if="colors.length" class="dress__colors" aria-label="Colores sugeridos">
          <li
            v-for="color in colors"
            :key="color"
            class="dress__color"
            :style="{ background: color }"
            :title="color"
          />
        </ul>
      </div>

      <!-- Cara negra: solo los textos, en blanco (los lectores de pantalla ya leen la otra). -->
      <div v-if="night" class="dress__night" :style="nightStyle" aria-hidden="true">
        <div class="dress__night-text">
          <p class="dress__title" data-text="title">{{ title }}</p>
          <p v-if="section.subtitle" class="dress__subtitle" data-text="subtitle">
            {{ section.subtitle }}
          </p>
          <p v-if="section.text" class="dress__text" data-text="text">{{ section.text }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dress {
  max-width: 26rem;
  margin: 0 auto;
  padding-top: 9cqi; /* lugar para el sello que sobresale */
}
.dress__card {
  position: relative;
  padding: 12cqi 8% 9%;
  text-align: center;
  background: var(--color-surface) center / cover no-repeat;
  box-shadow: var(--shadow-card);
}
.dress__day {
  display: grid;
  justify-items: center;
  gap: 0.8rem;
}
.dress__seal {
  position: absolute;
  top: 0;
  left: 50%;
  width: 18%;
  translate: -50% -55%;
  filter: drop-shadow(0 3px 4px rgb(0 0 0 / 0.2));
  transition:
    opacity calc(0.5s * var(--motion-scale)) ease,
    transform calc(0.7s * var(--motion-scale)) cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dress:not(.is-shown) .dress__seal {
  opacity: 0;
  transform: scale(1.3);
}
.dress__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.dress__subtitle {
  margin: 0;
  max-width: 16em;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-size: calc(clamp(1.05rem, 5.4cqi, 1.4rem) * var(--t-subtitle-size, 1));
  letter-spacing: 0.05em;
  line-height: 1.35;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-text));
}
.dress__figures {
  display: flex;
  justify-content: center;
  gap: 12%;
  width: 100%;
  margin: 0.4rem 0;
}
.dress__figure {
  height: clamp(7rem, 38cqi, 10rem);
  width: auto;
  transition:
    opacity calc(0.7s * var(--motion-scale)) var(--ease-out) calc(0.2s * var(--motion-scale)),
    transform calc(0.7s * var(--motion-scale)) var(--ease-out) calc(0.2s * var(--motion-scale));
}
.dress:not(.is-shown) .dress__figure--left {
  opacity: 0;
  transform: translateX(-2.5rem);
}
.dress:not(.is-shown) .dress__figure--right {
  opacity: 0;
  transform: translateX(2.5rem);
}
.dress__text {
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(clamp(1.05rem, 5.6cqi, 1.35rem) * var(--t-text-size, 1));
  line-height: 1.3;
  color: var(--t-text-color, var(--color-text));
}
.dress__colors {
  display: flex;
  gap: 0.6rem;
  margin: 0.2rem 0 0;
  padding: 0;
  list-style: none;
}
.dress__color {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.12);
}
/*
 * Cara negra, al ritmo del fondo (12 s), en pasos para que los textos nunca se encimen:
 * se van los textos y figuras del papel → el papel se pone negro → aparecen los textos
 * en blanco → se queda → y de regreso igual. Solo opacity.
 */
.dress__night {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-content: center;
  padding: 10% 9%;
  background:
    linear-gradient(
      color-mix(in srgb, var(--color-night) 96%, transparent),
      color-mix(in srgb, var(--color-night) 96%, transparent)
    ),
    var(--night-paper, none) center / cover no-repeat,
    var(--color-night);
  /* filo dorado por dentro, como el de los paneles */
  box-shadow:
    inset 0 0 0 0.45rem var(--color-night),
    inset 0 0 0 calc(0.45rem + 1px) color-mix(in srgb, var(--color-primary-soft) 55%, transparent);
  opacity: 0;
  animation: dress-night calc(12s * var(--motion-scale)) ease-in-out infinite;
}
.dress__night-text {
  display: grid;
  justify-items: center;
  gap: 1.1rem;
  text-align: center;
  opacity: 0;
  animation: dress-night-text calc(12s * var(--motion-scale)) ease-in-out infinite;
}
.dress__night .dress__title,
.dress__night .dress__subtitle,
.dress__night .dress__text {
  color: var(--color-on-night);
}
.dress__night .dress__title {
  font-size: calc(clamp(2.6rem, 14cqi, 3.8rem) * var(--t-title-size, 1));
}
.dress__day.is-cycling {
  animation: dress-day calc(12s * var(--motion-scale)) ease-in-out infinite;
}
@keyframes dress-day {
  0%,
  26%,
  90%,
  100% {
    opacity: 1;
  }
  32%,
  84% {
    opacity: 0;
  }
}
@keyframes dress-night {
  0%,
  32%,
  84%,
  100% {
    opacity: 0;
  }
  38%,
  78% {
    opacity: 1;
  }
}
@keyframes dress-night-text {
  0%,
  38%,
  78%,
  100% {
    opacity: 0;
  }
  43%,
  73% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .dress__seal,
  .dress__figure {
    transition: none;
  }
  .dress__night,
  .dress__night-text,
  .dress__day.is-cycling {
    animation: none;
  }
  .dress:not(.is-shown) .dress__seal,
  .dress:not(.is-shown) .dress__figure--left,
  .dress:not(.is-shown) .dress__figure--right {
    opacity: 1;
    transform: none;
  }
}
</style>
