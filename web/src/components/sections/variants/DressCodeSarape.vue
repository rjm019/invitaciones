<script setup lang="ts">
import { computed } from 'vue'
import FxText from '@/components/ui/FxText.vue'
import { useEvent } from '@/composables/useEvent'
import type { ResolvedSection } from '@/types/event'

/**
 * Vestimenta de sarape ("sarape"): una tarjeta crema entre dos franjas de sarape (el adorno
 * compartido `sarape.svg`, que se repite a lo ancho). Título y código (`subtitulo`), la
 * descripción, las figuras con sus listas, los colores sugeridos como listones que cuelgan
 * (tiras con punta en V que se mecen despacio), lo que conviene evitar en una cintilla, las
 * fotos de referencia y el botón de ejemplos (`enlace`), igual que la vestimenta editorial.
 * Sirve en cualquier tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? 'Código de vestimenta')
const colors = computed(() => event.value.dress_code.colors)
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
const sarape = computed(() => resolveAsset.value('sarape.svg'))
const sarapeStyle = computed(() =>
  sarape.value ? { '--ds-sarape': `url("${sarape.value.replace(/"/g, '%22')}")` } : undefined,
)
</script>

<template>
  <div class="ds" :style="sarapeStyle">
    <span v-if="sarape" class="ds__band ds__band--top" aria-hidden="true" />
    <div class="ds__card">
      <h2 class="ds__title" data-text="title"><FxText :text="title" :effects="section.effects" /></h2>
      <p v-if="section.subtitle" class="ds__headline" data-text="subtitle">{{ section.subtitle }}</p>

      <p v-if="section.text" class="ds__text" data-text="text">{{ section.text }}</p>

      <div v-if="figures.length" class="ds__figures">
        <div v-for="f in figures" :key="f.key" class="ds__figure">
          <img v-if="f.image" :src="f.image" alt="" class="ds__outfit" loading="lazy" decoding="async" />
          <ul v-if="f.list.length" class="ds__bullets" :aria-label="f.label">
            <li v-for="item in f.list" :key="item" data-text="text">{{ item }}</li>
          </ul>
        </div>
      </div>

      <div v-if="colors.length" class="ds__palette">
        <p class="ds__label">Colores sugeridos</p>
        <ul class="ds__ribbons" aria-label="Colores sugeridos">
          <li
            v-for="(color, i) in colors"
            :key="color"
            class="ds__ribbon"
            :style="{ '--swatch': color, '--delay': `${(i % 4) * -0.9}s` }"
            :aria-label="color"
            data-cascade
          >
            <span class="ds__pin" aria-hidden="true" />
            <span class="ds__strip" />
          </li>
        </ul>
      </div>

      <div v-if="restrictions.length" class="ds__avoid">
        <p class="ds__avoid-label">Te pedimos evitar</p>
        <ul class="ds__list">
          <li v-for="(line, i) in restrictions" :key="i">{{ line }}</li>
        </ul>
      </div>

      <div v-if="references.length" class="ds__refs">
        <figure v-for="(ref, i) in references" :key="i" class="ds__ref">
          <img :src="ref.photo" :alt="ref.caption" class="ds__img fx-photo" loading="lazy" decoding="async" />
          <figcaption v-if="ref.caption" class="ds__caption">{{ ref.caption }}</figcaption>
        </figure>
      </div>

      <a
        v-if="section.link"
        :href="section.link"
        class="ds__button inv-btn"
        data-text="button"
        target="_blank"
        rel="noopener"
      >
        {{ section.button ?? 'Ver ejemplos' }}
      </a>
    </div>
    <span v-if="sarape" class="ds__band ds__band--bottom" aria-hidden="true" />
  </div>
</template>

<style scoped>
.ds {
  --ds-blue: var(--color-talavera, var(--color-primary));
  --ds-paper: var(--color-paper, #fbf3e2);
  --ds-ink: var(--color-tinta, #3a2420);
  container-type: inline-size;
  max-width: 34rem;
  margin: 0 auto;
  box-shadow: 0 0.8rem 1.2rem -0.8rem rgb(0 0 0 / 0.5);
}
/* Las franjas de sarape se repiten a lo ancho (el dibujo ya empalma). */
.ds__band {
  display: block;
  height: 1.7rem;
  background: var(--ds-sarape) 0 0 / auto 100% repeat-x;
}
.ds__card {
  display: grid;
  justify-items: center;
  gap: 1rem;
  padding: 1.6rem 1.2rem 1.8rem;
  background: var(--ds-paper);
  text-align: center;
  color: var(--ds-ink);
}
.ds__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.05;
  color: var(--t-title-color, var(--ds-blue));
}
.ds__headline {
  margin: -0.4rem 0 0;
  font-family: var(--t-subtitle-font, var(--font-display));
  font-size: calc(clamp(1.6rem, 9cqi, 2.4rem) * var(--t-subtitle-size, 1));
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, var(--color-rosa, var(--color-accent)));
}
.ds__text {
  max-width: 30ch;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(clamp(1.05rem, 4.6cqi, 1.2rem) * var(--t-text-size, 1));
  line-height: 1.5;
  color: var(--t-text-color, var(--ds-ink));
  text-wrap: balance;
}
.ds__figures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  width: 100%;
  align-items: start;
}
.ds__figure {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 0.6rem;
}
.ds__outfit {
  display: block;
  width: 100%;
  max-height: 15rem;
  object-fit: contain;
}
.ds__bullets {
  display: grid;
  gap: 0.2rem;
  margin: 0;
  padding: 0 0 0 1.1em;
  text-align: left;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(clamp(1rem, 4.6cqi, 1.15rem) * var(--t-text-size, 1));
  line-height: 1.25;
  color: var(--t-text-color, var(--ds-ink));
}
.ds__label {
  margin: 0 0 0.4rem;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.72rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--ds-ink) 75%, transparent);
}
.ds__palette {
  width: 100%;
}

/* Los listones cuelgan de un alfiler y se mecen apenas, cada uno a su tiempo. */
.ds__ribbons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.7rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ds__ribbon {
  position: relative;
  display: grid;
  justify-items: center;
  transform-origin: 50% 0;
  animation: ds-sway calc(5s * var(--motion-scale)) ease-in-out infinite alternate;
  animation-delay: calc(var(--delay, 0s) * var(--motion-scale));
  filter: drop-shadow(0 0 1px rgb(0 0 0 / 0.5)) drop-shadow(0 3px 3px rgb(0 0 0 / 0.2));
}
.ds__pin {
  z-index: 1;
  width: 0.6rem;
  height: 0.6rem;
  margin-bottom: -0.3rem;
  border-radius: 50%;
  background: var(--color-rojo, var(--color-accent));
}
.ds__strip {
  display: block;
  width: 1.9rem;
  height: 5.2rem;
  background: var(--swatch);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 0.9rem), 0 100%);
}

/* La cintilla de lo que conviene evitar. */
.ds__avoid {
  display: grid;
  justify-items: center;
  gap: 0.3rem;
  width: calc(100% + 2.4rem);
  padding: 0.7rem 1.4rem;
  background: var(--color-rojo, var(--color-accent));
  color: var(--ds-paper);
}
.ds__avoid-label {
  margin: 0;
  font-family: var(--font-caps);
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
}
.ds__list {
  display: grid;
  gap: 0.15rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: 1rem;
  line-height: 1.3;
}
.ds__refs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
  gap: 0.8rem;
  width: 100%;
}
.ds__ref {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0.4rem;
  border: 1px solid var(--ds-blue);
}
.ds__img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
}
.ds__caption {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.9rem;
  color: var(--ds-ink);
}
.ds__button {
  display: inline-block;
  padding: 0.6rem 1.3rem;
  border: var(--btn-border, 1px solid var(--ds-blue));
  border-radius: var(--btn-radius, 999px);
  background: var(--btn-bg, transparent);
  font-family: var(--t-button-font, var(--font-caps));
  font-size: calc(0.78rem * var(--t-button-size, 1));
  letter-spacing: var(--btn-tracking, 0.16em);
  text-transform: var(--btn-case, uppercase);
  text-decoration: var(--btn-decoration, none);
  color: var(--t-button-color, var(--btn-color, var(--ds-blue)));
  box-shadow: var(--btn-shadow, none);
  clip-path: var(--btn-clip, none);
}
.ds__button:focus-visible {
  outline: 2px solid var(--ds-blue);
  outline-offset: 3px;
}
@keyframes ds-sway {
  from {
    transform: rotate(-3deg);
  }
  to {
    transform: rotate(3deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ds__ribbon {
    animation: none;
  }
}
</style>
