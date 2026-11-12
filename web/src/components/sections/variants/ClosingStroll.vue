<script setup lang="ts">
import { computed, ref } from 'vue'
import BabyPram from '@/components/ui/BabyPram.vue'
import FlyingStork from '@/components/ui/FlyingStork.vue'
import FxText from '@/components/ui/FxText.vue'
import PartyGoose from '@/components/ui/PartyGoose.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { useReducedMotion } from '@/composables/useReducedMotion'
import type { ResolvedSection } from '@/types/event'

/**
 * Cierre de paseo ("paseo"): el título, el texto y la firma en letra manuscrita grande, con un
 * moñito de línea como divisor. Al pie, una franja de pasto con margaritas por donde el gansito
 * de pie empuja la carriola (`PartyGoose` con dos globos detrás de `BabyPram`), cruzando
 * despacio de un lado a otro en un paseo sin fin: entra por un lado, sale por el otro y vuelve
 * a entrar. Por arriba pasa de vez en cuando una cigüeña (`FlyingStork`) en sentido contrario.
 * Solo se mueve mientras la sección está a la vista. Con "menos movimiento" el gansito y la
 * carriola quedan quietos al centro del pasto y no hay cigüeña. Sirve en cualquier tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()
const reduced = useReducedMotion()

const title = computed(() => props.section.title ?? '¡Te esperamos!')
const signature = computed(
  () => event.value.celebrant.short_name || event.value.celebrant.full_name || event.value.title,
)
const bow = computed(() => resolveAsset.value('mono-linea.svg'))
const daisy = computed(() => resolveAsset.value('margarita.svg'))
const vars = computed(() => {
  const out: Record<string, string> = {}
  if (bow.value) out['--cs-bow'] = `url("${bow.value.replace(/"/g, '%22')}")`
  if (daisy.value) out['--cs-daisy'] = `url("${daisy.value.replace(/"/g, '%22')}")`
  return out
})

const root = ref<HTMLElement | null>(null)
const inView = useInView(root, { once: false, threshold: 0, rootMargin: '0px' })
const moving = computed(() => inView.value && !reduced.value)
</script>

<template>
  <div
    ref="root"
    class="cs"
    :class="{ 'is-live': moving, 'is-still': reduced }"
    :style="vars"
  >
    <div class="cs__body">
      <h2 class="cs__title" data-text="title"><FxText :text="title" :effects="section.effects" /></h2>
      <span v-if="bow" class="cs__bow" aria-hidden="true" />
      <p v-if="section.text" class="cs__text" data-text="text">{{ section.text }}</p>
      <p v-if="signature" class="cs__signature" data-text="signature">{{ signature }}</p>
    </div>

    <div class="cs__stage" aria-hidden="true">
      <div v-if="!reduced" class="cs__sky">
        <div class="cs__stork"><FlyingStork :flying="moving" flip size="5.5rem" /></div>
      </div>
      <div class="cs__lane">
        <div class="cs__walker">
          <div class="cs__pair">
            <div class="cs__goose"><PartyGoose :walking="moving" :balloons="2" /></div>
            <div class="cs__pram"><BabyPram :rolling="moving" /></div>
          </div>
        </div>
      </div>
      <span class="cs__grass" />
    </div>
  </div>
</template>

<style scoped>
.cs {
  container-type: inline-size;
  position: relative;
  display: grid;
  justify-items: center;
  gap: 1.2rem;
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.cs__body {
  display: grid;
  justify-items: center;
  gap: 0.7rem;
  padding-inline: 0.5rem;
}
.cs__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(3rem, 17cqi, 4.8rem) * var(--t-title-size, 1));
  line-height: 1;
  color: var(--t-title-color, var(--color-primary-strong, var(--color-primary)));
}
/* El moñito de línea del divisor, pintado del color del listón. */
.cs__bow {
  display: block;
  width: 3.6rem;
  height: 2rem;
  background: var(--color-primary);
  -webkit-mask: var(--cs-bow) center / contain no-repeat;
  mask: var(--cs-bow) center / contain no-repeat;
  opacity: 0.85;
}
.cs__text {
  max-width: 28ch;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(clamp(1.1rem, 5cqi, 1.3rem) * var(--t-text-size, 1));
  line-height: 1.5;
  color: var(--t-text-color, var(--color-text));
  text-wrap: balance;
}
.cs__signature {
  margin: 0.2rem 0 0;
  font-family: var(--t-signature-font, var(--font-script));
  font-size: calc(clamp(2.4rem, 13cqi, 3.4rem) * var(--t-signature-size, 1));
  line-height: 1.1;
  color: var(--t-signature-color, var(--color-primary-strong, var(--color-primary)));
}

/* El escenario: cielo para la cigüeña, el paseo y el pasto al pie. */
.cs__stage {
  position: relative;
  width: 100%;
  height: 14rem;
  overflow: hidden;
}
.cs__sky {
  position: absolute;
  inset: 0 0 auto;
  height: 6rem;
}
.cs__stork {
  position: absolute;
  top: 0.3rem;
  left: 0;
  width: 5.5rem;
  opacity: 0;
}
.is-live .cs__stork {
  animation: cs-stork calc(26s * var(--motion-scale)) linear infinite;
  animation-delay: calc(-2s * var(--motion-scale));
}
.cs__lane {
  position: absolute;
  inset: auto 0 0.9rem;
  height: 10rem;
}
.cs__walker {
  position: absolute;
  inset: 0;
}
.is-live .cs__walker {
  animation: cs-stroll calc(30s * var(--motion-scale)) linear infinite;
}
.cs__pair {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: flex-end;
  width: 17.2rem;
}
.is-still .cs__pair {
  left: 50%;
  translate: -50% 0;
}
.cs__goose {
  flex: 0 0 7.1rem;
  margin-right: -1rem;
  z-index: 1;
}
.cs__pram {
  flex: 0 0 9.5rem;
}
/* El pasto: una línea suave con margaritas a lo largo. */
.cs__grass {
  position: absolute;
  inset: auto 0 0;
  height: 1.7rem;
  background:
    var(--cs-daisy, none) 0 0 / auto 1.1rem space repeat-x,
    linear-gradient(
      to bottom,
      transparent 0.6rem,
      color-mix(in srgb, var(--color-accent) 45%, transparent) 0.6rem,
      color-mix(in srgb, var(--color-accent) 45%, transparent) 0.72rem,
      color-mix(in srgb, var(--color-accent) 16%, transparent) 0.72rem,
      transparent 100%
    );
  background-position: 0 0.15rem, 0 0;
  background-repeat: space no-repeat, no-repeat;
}

/* El paseo: la pareja cruza de lado a lado y vuelve a entrar. */
@keyframes cs-stroll {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}
/* La cigüeña va en sentido contrario: entra por la derecha, sale por la izquierda y descansa. */
@keyframes cs-stork {
  0%,
  35% {
    transform: translate(calc(100cqw + 1rem), 0);
    opacity: 0;
  }
  38% {
    opacity: 1;
  }
  50% {
    transform: translate(45cqw, 1.6rem);
  }
  62% {
    opacity: 1;
  }
  65%,
  100% {
    transform: translate(-7rem, 0);
    opacity: 0;
  }
}
@container (min-width: 30rem) {
  .cs__pair {
    width: 20.5rem;
  }
  .cs__goose {
    flex-basis: 8.4rem;
  }
  .cs__pram {
    flex-basis: 11.4rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .is-live .cs__walker,
  .is-live .cs__stork {
    animation: none;
  }
}
</style>
