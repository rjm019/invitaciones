<script setup lang="ts">
import { computed, ref } from 'vue'
import TypewriterText from '@/components/ui/TypewriterText.vue'
import { useInView } from '@/composables/useInView'
import type { ResolvedSection } from '@/types/event'

/**
 * Frase de Nueva York ("neon"): un letrero de neón como los de Times Square. Al llegar a
 * él parpadea y se enciende, y luego zumba muy suave. Solo opacity (el brillo es una
 * sombra fija); con "menos movimiento" ya está encendido. Con el efecto "escribir", la
 * frase aparece letra por letra.
 */
const props = defineProps<{ section: ResolvedSection }>()
const text = computed(() => props.section.text ?? props.section.title ?? '')

const root = ref<HTMLElement | null>(null)
const lit = useInView(root, { threshold: 0.5 })
</script>

<template>
  <figure ref="root" class="ny-neon" :class="{ 'is-lit': lit }">
    <span class="ny-neon__screw ny-neon__screw--a" aria-hidden="true" />
    <span class="ny-neon__screw ny-neon__screw--b" aria-hidden="true" />
    <blockquote class="ny-neon__text" data-text="text">
      <TypewriterText :text="text" :active="section.effects.includes('typewriter')" />
    </blockquote>
  </figure>
</template>

<style scoped>
.ny-neon {
  --neon: var(--color-primary-soft);
  container-type: inline-size;
  position: relative;
  max-width: 24rem;
  margin: 0 auto;
  padding: 2.1rem 1.6rem 2.2rem;
  border: 2px solid color-mix(in srgb, var(--neon) 85%, #fff);
  border-radius: 1.6rem;
  box-shadow:
    0 0 0.4rem color-mix(in srgb, var(--neon) 80%, transparent),
    0 0 1.4rem color-mix(in srgb, var(--neon) 45%, transparent),
    inset 0 0 1rem color-mix(in srgb, var(--neon) 30%, transparent);
  text-align: center;
  opacity: 0.25;
}
/* Los tornillos que lo sostienen a la pared. */
.ny-neon__screw {
  position: absolute;
  top: 50%;
  width: 0.55rem;
  aspect-ratio: 1;
  translate: 0 -50%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 35%,
    var(--color-primary-soft),
    var(--color-primary-strong)
  );
}
.ny-neon__screw--a {
  left: -1.2rem;
}
.ny-neon__screw--b {
  right: -1.2rem;
}
.ny-neon__text {
  margin: 0;
  font-family: var(--t-text-font, var(--font-script));
  font-size: calc(clamp(1.9rem, 10.5cqi, 2.7rem) * var(--t-text-size, 1));
  line-height: 1.2;
  color: var(--t-text-color, color-mix(in srgb, var(--neon) 40%, #fff));
  text-shadow:
    0 0 0.08em #fff,
    0 0 0.3em var(--neon),
    0 0 0.9em color-mix(in srgb, var(--neon) 70%, transparent);
}
/* Al encenderse: parpadea, se prende y se queda zumbando. */
.ny-neon.is-lit {
  animation:
    ny-neon-on calc(1.4s * var(--motion-scale)) steps(1, end) forwards,
    ny-neon-hum calc(5s * var(--motion-scale)) ease-in-out calc(1.4s * var(--motion-scale)) infinite;
}
@keyframes ny-neon-on {
  0% {
    opacity: 0.25;
  }
  12% {
    opacity: 1;
  }
  18% {
    opacity: 0.35;
  }
  34% {
    opacity: 1;
  }
  40% {
    opacity: 0.5;
  }
  48%,
  100% {
    opacity: 1;
  }
}
@keyframes ny-neon-hum {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.88;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ny-neon {
    opacity: 1;
  }
  .ny-neon.is-lit {
    animation: none;
  }
}
</style>
