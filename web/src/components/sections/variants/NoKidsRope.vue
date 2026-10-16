<script setup lang="ts">
import { computed } from 'vue'
import type { ResolvedSection } from '@/types/event'

/**
 * Sin niños de Nueva York ("cordon"): el cordón de terciopelo de la entrada de un club,
 * entre dos postes plateados, con el letrero colgando ("Solo adultos"). El cordón se mece
 * muy poco. Abajo, el mensaje.
 */
const props = defineProps<{ section: ResolvedSection }>()
const title = computed(() => props.section.title ?? 'Sin niños')
const badge = computed(() => props.section.subtitle ?? 'Solo adultos')
const text = computed(
  () =>
    props.section.text ??
    'Queremos mucho a sus pequeños, pero esta celebración es solo para adultos. ¡Gracias por su comprensión!',
)
</script>

<template>
  <div class="ny-rope">
    <h2 class="ny-rope__title" data-text="title">{{ title }}</h2>

    <div class="ny-rope__entrance">
      <span class="ny-rope__post ny-rope__post--left" aria-hidden="true" />
      <span class="ny-rope__post ny-rope__post--right" aria-hidden="true" />
      <div class="ny-rope__swing">
        <span class="ny-rope__cord" aria-hidden="true" />
        <p v-if="badge" class="ny-rope__sign page-palette" data-text="subtitle">{{ badge }}</p>
      </div>
    </div>

    <p v-if="text" class="ny-rope__text" data-text="text">{{ text }}</p>
  </div>
</template>

<style scoped>
.ny-rope {
  container-type: inline-size;
  display: grid;
  /* Una columna que no crece con un título largo: el título se acomoda en dos renglones. */
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: var(--space-2);
  max-width: 24rem;
  margin: 0 auto;
  text-align: center;
}
.ny-rope__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.ny-rope__entrance {
  position: relative;
  width: min(100%, 19rem);
  height: 9.5rem;
}
/* Postes: la bola de arriba, el tubo y la base redonda. */
.ny-rope__post {
  position: absolute;
  bottom: 0;
  width: 1.5rem;
  height: 100%;
  background:
    radial-gradient(
        circle at 40% 35%,
        var(--color-primary-soft),
        var(--color-primary-strong) 62%,
        transparent 66%
      )
      50% 0 / 1.5rem 1.5rem no-repeat,
    linear-gradient(
        90deg,
        var(--color-primary-strong),
        var(--color-primary-soft) 45%,
        var(--color-primary)
      )
      50% 1.3rem / 0.42rem calc(100% - 2rem) no-repeat,
    radial-gradient(
        ellipse at 50% 45%,
        var(--color-primary-soft),
        var(--color-primary-strong) 62%,
        transparent 66%
      )
      50% 100% / 1.5rem 0.95rem no-repeat;
}
.ny-rope__post--left {
  left: 0;
}
.ny-rope__post--right {
  right: 0;
}
/* El cordón cuelga entre las dos bolas y se mece desde arriba, con su letrero. */
.ny-rope__swing {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  right: 0.75rem;
  height: 5.6rem;
  transform-origin: 50% 0;
  animation: ny-rope calc(5s * var(--motion-scale)) ease-in-out infinite;
}
.ny-rope__cord {
  position: absolute;
  inset: 0 0 auto;
  height: 4.2rem;
  border: 0.4rem solid transparent;
  border-top: 0;
  border-bottom-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-night));
  border-radius: 0 0 50% 50% / 0 0 100% 100%;
  box-shadow: 0 0.35rem 0.4rem -0.2rem rgb(0 0 0 / 0.5);
}
.ny-rope__cord::after {
  content: '';
  position: absolute;
  inset: -0.4rem -0.4rem auto;
  height: calc(100% + 0.4rem);
  border: 1px solid transparent;
  border-bottom-color: color-mix(in srgb, var(--color-primary-soft) 70%, transparent);
  border-radius: inherit;
  opacity: 0.6;
}
.ny-rope__sign {
  position: absolute;
  left: 50%;
  top: 4.4rem;
  margin: 0;
  padding: 0.4rem 0.9rem;
  translate: -50% 0;
  border: 1px solid var(--color-primary);
  border-radius: 0.2rem;
  background: var(--color-night);
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-size: calc(0.72rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.26em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--t-subtitle-color, var(--color-on-night));
  box-shadow: 0 0.4rem 0.8rem rgb(0 0 0 / 0.45);
}
/* Las dos argollas que lo cuelgan del cordón. */
.ny-rope__sign::before,
.ny-rope__sign::after {
  content: '';
  position: absolute;
  bottom: 100%;
  width: 1px;
  height: 0.55rem;
  background: var(--color-primary);
}
.ny-rope__sign::before {
  left: 18%;
}
.ny-rope__sign::after {
  right: 18%;
}
@keyframes ny-rope {
  0%,
  100% {
    transform: rotate(-1.2deg);
  }
  50% {
    transform: rotate(1.2deg);
  }
}
.ny-rope__text {
  max-width: 21rem;
  margin: 0;
  font-family: var(--t-text-font, var(--font-display));
  font-style: italic;
  font-size: calc(1.02rem * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
}
@media (prefers-reduced-motion: reduce) {
  .ny-rope__swing {
    animation: none;
  }
}
</style>
