<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import FxText from '@/components/ui/FxText.vue'
import RibbonBow from '@/components/ui/RibbonBow.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { motionScale } from '@/composables/useMotionScale'
import { useReducedMotion } from '@/composables/useReducedMotion'
import type { ResolvedSection } from '@/types/event'

/**
 * Vestimenta de moños ("lazos"): el texto de vestimenta va en una tarjeta ovalada de papel con
 * doble filete del color del listón, y debajo hay un moño de listón (`RibbonBow`) por cada
 * color sugerido, en una hilera que se acomoda de dos a cinco. Cada moño se ata al llegar a la
 * sección, uno tras otro, y después mece sus colas. Sin colores sugeridos salen tres moños con
 * los tonos de la paleta. Título y código (`subtitulo`), descripción, figuras con sus listas,
 * lo que conviene evitar, fotos de referencia y botón de ejemplos (`enlace`), igual que la
 * vestimenta de sarape. Con "menos movimiento" los moños ya están atados y quietos. Sirve en
 * cualquier tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const reduced = useReducedMotion()

const title = computed(() => props.section.title ?? 'Código de vestimenta')
const menList = computed(() => props.section.men_list ?? [])
const womenList = computed(() => props.section.women_list ?? [])
const figures = computed(() =>
  [
    { key: 'man', image: props.section.decor.man, list: menList.value, label: 'Vestimenta para ellos' },
    { key: 'woman', image: props.section.decor.woman, list: womenList.value, label: 'Vestimenta para ellas' },
  ].filter((f) => f.image || f.list.length),
)
const restrictions = computed(() => props.section.restrictions ?? [])
const references = computed(() =>
  (props.section.references ?? []).flatMap((r) => {
    const photo = resolveAsset.value(r.photo)
    return photo ? [{ photo, caption: r.caption }] : []
  }),
)

// Un moño por color sugerido (hasta cinco); sin colores, tres con los tonos de la paleta.
const suggested = computed(() => event.value.dress_code.colors.slice(0, 5))
const bows = computed(() =>
  suggested.value.length
    ? suggested.value.map((color) => ({ tone: color, label: color }))
    : [
        { tone: 'var(--color-primary)', label: '' },
        { tone: 'var(--color-accent)', label: '' },
        { tone: 'var(--color-oro, var(--color-primary-strong))', label: '' },
      ],
)

// Se atan uno tras otro cuando la hilera llega a la pantalla.
const row = ref<HTMLElement | null>(null)
const inView = useInView(row, { threshold: 0.3 })
const tied = reactive<boolean[]>([])
const timers: ReturnType<typeof setTimeout>[] = []
watch(
  [inView, reduced, () => bows.value.length],
  () => {
    timers.forEach(clearTimeout)
    timers.length = 0
    bows.value.forEach((_, i) => {
      if (reduced.value) tied[i] = true
      else if (inView.value && !tied[i])
        timers.push(setTimeout(() => (tied[i] = true), (250 + i * 380) * motionScale()))
    })
  },
  { immediate: true },
)
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <div class="db">
    <div class="db__oval">
      <h2 class="db__title" data-text="title"><FxText :text="title" :effects="section.effects" /></h2>
      <p v-if="section.subtitle" class="db__headline" data-text="subtitle">{{ section.subtitle }}</p>
      <p v-if="section.text" class="db__text" data-text="text">{{ section.text }}</p>

      <div v-if="figures.length" class="db__figures">
        <div v-for="f in figures" :key="f.key" class="db__figure">
          <img v-if="f.image" :src="f.image" alt="" class="db__outfit" loading="lazy" decoding="async" />
          <ul v-if="f.list.length" class="db__bullets" :aria-label="f.label">
            <li v-for="item in f.list" :key="item" data-text="text">{{ item }}</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="db__palette">
      <p v-if="suggested.length" class="db__label">Colores sugeridos</p>
      <ul ref="row" class="db__bows" :aria-label="suggested.length ? 'Colores sugeridos' : undefined">
        <li
          v-for="(bow, i) in bows"
          :key="i"
          class="db__bow"
          :aria-label="bow.label || undefined"
          :aria-hidden="bow.label ? undefined : true"
        >
          <RibbonBow :tied="!!tied[i]" sway :tone="bow.tone" />
        </li>
      </ul>
    </div>

    <div v-if="restrictions.length" class="db__avoid">
      <p class="db__avoid-label">Te pedimos evitar</p>
      <ul class="db__list">
        <li v-for="(line, i) in restrictions" :key="i">{{ line }}</li>
      </ul>
    </div>

    <div v-if="references.length" class="db__refs">
      <figure v-for="(ref, i) in references" :key="i" class="db__ref">
        <img :src="ref.photo" :alt="ref.caption" class="db__img fx-photo" loading="lazy" decoding="async" />
        <figcaption v-if="ref.caption" class="db__caption">{{ ref.caption }}</figcaption>
      </figure>
    </div>

    <a
      v-if="section.link"
      :href="section.link"
      class="db__button inv-btn"
      data-text="button"
      target="_blank"
      rel="noopener"
    >
      {{ section.button ?? 'Ver ejemplos' }}
    </a>
  </div>
</template>

<style scoped>
.db {
  --db-ink: var(--color-text);
  --db-line: var(--color-primary);
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: 1.4rem;
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
  color: var(--db-ink);
}
/* La tarjeta ovalada de papel, con doble filete del color del listón. */
.db__oval {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.8rem;
  width: 100%;
  padding: 2.2rem 1.6rem 2rem;
  border: 1px solid var(--db-line);
  border-radius: 3.5rem;
  background: var(--color-paper, var(--color-surface));
  box-shadow:
    inset 0 0 0 0.4rem var(--color-paper, var(--color-surface)),
    inset 0 0 0 calc(0.4rem + 1px) color-mix(in srgb, var(--db-line) 55%, transparent),
    0 0.7rem 1.2rem -0.9rem rgb(0 0 0 / 0.4);
}
.db__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.4rem, 12cqi, 3.4rem) * var(--t-title-size, 1));
  line-height: 1.05;
  color: var(--t-title-color, var(--color-primary-strong, var(--color-primary)));
}
.db__headline {
  margin: -0.2rem 0 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(clamp(0.8rem, 3.6cqi, 0.95rem) * var(--t-subtitle-size, 1));
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-oro, var(--color-accent)));
}
.db__text {
  max-width: 30ch;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(clamp(1.05rem, 4.6cqi, 1.2rem) * var(--t-text-size, 1));
  line-height: 1.5;
  color: var(--t-text-color, var(--db-ink));
  text-wrap: balance;
}
.db__figures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  width: 100%;
  align-items: start;
}
.db__figure {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 0.6rem;
}
.db__outfit {
  display: block;
  width: 100%;
  max-height: 14rem;
  object-fit: contain;
}
.db__bullets {
  display: grid;
  gap: 0.2rem;
  margin: 0;
  padding: 0 0 0 1.1em;
  text-align: left;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(clamp(1rem, 4.6cqi, 1.15rem) * var(--t-text-size, 1));
  line-height: 1.25;
  color: var(--t-text-color, var(--db-ink));
}

/* La hilera de moños: se acomodan sin amontonarse, de dos a cinco. */
.db__palette {
  display: grid;
  justify-items: center;
  gap: 0.2rem;
  width: 100%;
}
.db__label {
  margin: 0;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.72rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--db-ink) 75%, transparent);
}
.db__bows {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.2rem 0.6rem;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}
.db__bow {
  flex: 0 1 calc(33.333% - 0.6rem);
  min-width: 5.6rem;
  max-width: 8.2rem;
}
.db__bow :deep(.rb) {
  width: 100%;
  filter: drop-shadow(0 0.25rem 0.3rem rgb(0 0 0 / 0.14));
}

/* Lo que conviene evitar, en una cintilla de papel con el filete del listón. */
.db__avoid {
  display: grid;
  justify-items: center;
  gap: 0.3rem;
  width: 100%;
  padding: 0.8rem 1.2rem;
  border: 1px dashed var(--db-line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--db-line) 10%, var(--color-paper, #fff));
}
.db__avoid-label {
  margin: 0;
  font-family: var(--font-caps);
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--color-primary-strong, var(--db-line));
}
.db__list {
  display: grid;
  gap: 0.15rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: 1rem;
  line-height: 1.3;
}
.db__refs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
  gap: 0.8rem;
  width: 100%;
}
.db__ref {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0.4rem;
  border: 1px solid var(--db-line);
  border-radius: 0.8rem;
}
.db__img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 0.5rem;
}
.db__caption {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.9rem;
}
.db__button {
  display: inline-block;
  padding: 0.6rem 1.3rem;
  border: var(--btn-border, 0);
  border-radius: var(--btn-radius, 999px);
  background: var(--btn-bg, var(--color-primary-strong, var(--db-line)));
  font-family: var(--t-button-font, var(--font-caps));
  font-size: calc(0.78rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.16em);
  text-transform: var(--btn-case, uppercase);
  text-decoration: var(--btn-decoration, none);
  color: var(--t-button-color, var(--btn-color, var(--color-surface, #fff)));
  box-shadow: var(--btn-shadow, none);
  clip-path: var(--btn-clip, none);
}
.db__button:focus-visible {
  outline: 2px solid var(--db-line);
  outline-offset: 3px;
}
</style>
