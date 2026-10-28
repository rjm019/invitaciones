<script setup lang="ts">
import { computed, ref } from 'vue'
import { useId } from 'vue'
import type { ResolvedSection } from '@/types/event'

/**
 * Información adicional: preguntas y respuestas en un acordeón accesible. Cada pregunta es
 * un botón (`aria-expanded`, `aria-controls`) que abre su respuesta (`role="region"`,
 * `aria-labelledby`); se maneja con Enter y Espacio, y con las flechas, Inicio y Fin
 * entre preguntas. Pueden quedar varias abiertas. La respuesta aparece con opacity y un
 * desplazamiento mínimo (sin animar el alto); con "reducir movimiento", sin animación.
 */
const props = defineProps<{ section: ResolvedSection }>()

const title = computed(() => props.section.title ?? 'Información adicional')
const items = computed(() => props.section.items ?? [])
const uid = useId()
const open = ref<Set<number>>(new Set())
const triggers = ref<HTMLButtonElement[]>([])

const buttonId = (i: number) => `faq-${uid}-q${i}`
const panelId = (i: number) => `faq-${uid}-a${i}`

function toggle(i: number) {
  const next = new Set(open.value)
  if (next.has(i)) next.delete(i)
  else next.add(i)
  open.value = next
}

function move(event: KeyboardEvent, i: number) {
  const last = items.value.length - 1
  const target =
    event.key === 'ArrowDown'
      ? (i + 1) % (last + 1)
      : event.key === 'ArrowUp'
        ? (i - 1 + last + 1) % (last + 1)
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? last
            : null
  if (target === null) return
  event.preventDefault()
  triggers.value[target]?.focus()
}
</script>

<template>
  <div class="faq">
    <h2 class="faq__title" data-text="title">{{ title }}</h2>
    <p v-if="section.subtitle" class="faq__subtitle" data-text="subtitle">{{ section.subtitle }}</p>
    <p v-if="section.text" class="faq__text" data-text="text">{{ section.text }}</p>

    <div v-if="items.length" class="faq__list">
      <div v-for="(item, i) in items" :key="i" class="faq__item" :class="{ 'is-open': open.has(i) }">
        <h3 class="faq__heading">
          <button
            :id="buttonId(i)"
            :ref="(el) => { if (el) triggers[i] = el as HTMLButtonElement }"
            type="button"
            class="faq__trigger"
            :aria-expanded="open.has(i)"
            :aria-controls="panelId(i)"
            @click="toggle(i)"
            @keydown="move($event, i)"
          >
            <span class="faq__question" data-text="question">{{ item.question }}</span>
            <span class="faq__mark" aria-hidden="true" />
          </button>
        </h3>
        <div
          v-show="open.has(i)"
          :id="panelId(i)"
          class="faq__panel"
          role="region"
          :aria-labelledby="buttonId(i)"
        >
          <p class="faq__answer" data-text="answer">{{ item.answer }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.faq {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: 0.5rem;
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.faq__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-caps));
  font-weight: 400;
  font-size: calc(clamp(1.8rem, 9cqi, 2.6rem) * var(--t-title-size, 1));
  letter-spacing: 0.12em;
  line-height: 1.15;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-primary));
}
.faq__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-serif));
  font-style: italic;
  font-size: calc(clamp(1.05rem, 5cqi, 1.3rem) * var(--t-subtitle-size, 1));
  color: var(--t-subtitle-color, var(--color-text));
}
.faq__text {
  max-width: 28rem;
  margin: 0.3rem 0 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(var(--text-body) * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
}
.faq__list {
  width: 100%;
  margin-top: var(--space-2);
  border-top: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
  text-align: left;
}
.faq__item {
  border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
}
.faq__heading {
  margin: 0;
  font: inherit;
}
.faq__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  min-height: 3rem;
  padding: 0.8rem 0.2rem;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.faq__trigger:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.faq__question {
  font-family: var(--t-question-font, var(--font-serif));
  font-weight: 600;
  font-size: calc(clamp(1.05rem, 5cqi, 1.25rem) * var(--t-question-size, 1));
  line-height: 1.3;
  color: var(--t-question-color, var(--color-text));
}
/* Más y menos con dos líneas finas; al abrir, la vertical gira (solo transform y opacity). */
.faq__mark {
  position: relative;
  flex: none;
  width: 0.9rem;
  height: 0.9rem;
  color: var(--color-primary);
}
.faq__mark::before,
.faq__mark::after {
  content: '';
  position: absolute;
  inset: 50% 0 auto;
  height: 1px;
  background: currentColor;
  transition:
    transform calc(0.3s * var(--motion-scale)) ease,
    opacity calc(0.3s * var(--motion-scale)) ease;
}
.faq__mark::after {
  transform: rotate(90deg);
}
.faq__item.is-open .faq__mark::after {
  opacity: 0;
  transform: rotate(0deg);
}
.faq__panel {
  padding: 0 0.2rem 1rem;
}
.faq__item.is-open .faq__panel {
  animation: faq-in calc(0.35s * var(--motion-scale)) ease both;
}
.faq__answer {
  margin: 0;
  font-family: var(--t-answer-font, var(--font-serif));
  font-size: calc(var(--text-body) * var(--t-answer-size, 1));
  line-height: 1.5;
  white-space: pre-line;
  color: var(--t-answer-color, var(--color-text));
}
@keyframes faq-in {
  from {
    opacity: 0;
    transform: translateY(-0.4rem);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .faq__mark::before,
  .faq__mark::after {
    transition: none;
  }
  .faq__item.is-open .faq__panel {
    animation: none;
  }
}
</style>
