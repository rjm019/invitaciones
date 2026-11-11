<script setup lang="ts">
import { computed, ref } from 'vue'
import FxText from '@/components/ui/FxText.vue'
import { useEvent } from '@/composables/useEvent'
import { useInView } from '@/composables/useInView'
import { decorOr } from '@/services/decorService'
// El trío va en línea (no como imagen) para poder mecer a cada músico.
import mariachisSvg from '@/themes/_shared/assets/mariachis.svg?raw'
import type { ResolvedSection } from '@/types/event'

/**
 * Cierre de serenata ("serenata"): arriba, una hilera de papel picado de colores; después el
 * título en letra caligráfica grande, el texto y la firma. Al pie, los mariachis (en línea, se
 * mecen despacio mientras la sección está a la vista), un saguaro y un nopal a los lados y una
 * franja de sarape de orilla a orilla. Con "menos movimiento" quedan quietos. Sirve en
 * cualquier tema.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()

const title = computed(() => props.section.title ?? '¡Te esperamos!')
const signature = computed(
  () => event.value.celebrant.short_name || event.value.celebrant.full_name || event.value.title,
)
const saguaro = computed(() => decorOr(props.section.decor, 'saguaro', resolveAsset.value('saguaro.svg')))
const nopal = computed(() => decorOr(props.section.decor, 'nopal', resolveAsset.value('nopal.svg')))
const flag = computed(() => resolveAsset.value('papel-picado.svg'))
const sarape = computed(() => resolveAsset.value('sarape.svg'))
const vars = computed(() => {
  const out: Record<string, string> = {}
  if (flag.value) out['--cn-flag'] = `url("${flag.value.replace(/"/g, '%22')}")`
  if (sarape.value) out['--cn-sarape'] = `url("${sarape.value.replace(/"/g, '%22')}")`
  return out
})
const FLAG_COLORS = ['rosa', 'cempasuchil', 'turquesa', 'amarillo', 'talavera', 'nopal']
const flags = Array.from({ length: 8 }, (_, i) => ({
  color: `var(--color-${FLAG_COLORS[i % FLAG_COLORS.length]}, var(--color-accent))`,
  delay: `${(i % 4) * -0.8}s`,
}))

const root = ref<HTMLElement | null>(null)
const inView = useInView(root, { once: false, threshold: 0, rootMargin: '0px' })
</script>

<template>
  <div ref="root" class="cn" :class="{ 'is-live': inView }" :style="vars">
    <div v-if="flag" class="cn__flags" aria-hidden="true">
      <span
        v-for="(f, i) in flags"
        :key="i"
        class="cn__flag"
        :style="{ '--flag': f.color, '--delay': f.delay }"
      />
    </div>

    <div class="cn__body">
      <h2 class="cn__title" data-text="title"><FxText :text="title" :effects="section.effects" /></h2>
      <p v-if="section.text" class="cn__text" data-text="text">{{ section.text }}</p>
      <p v-if="signature" class="cn__signature" data-text="signature">{{ signature }}</p>
    </div>

    <div class="cn__stage" aria-hidden="true">
      <img v-if="saguaro" :src="saguaro" alt="" class="cn__cactus cn__cactus--left" />
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="cn__band" v-html="mariachisSvg" />
      <img v-if="nopal" :src="nopal" alt="" class="cn__cactus cn__cactus--right" />
    </div>
    <span v-if="sarape" class="cn__sarape" aria-hidden="true" />
  </div>
</template>

<style scoped>
.cn {
  container-type: inline-size;
  position: relative;
  display: grid;
  justify-items: center;
  gap: 1rem;
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
/* La hilera de papel picado, con su hilo. */
.cn__flags {
  position: relative;
  display: flex;
  justify-content: center;
  width: 100%;
  padding-top: 2px;
}
.cn__flags::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: var(--color-tinta, var(--color-text));
  opacity: 0.55;
}
.cn__flag {
  flex: 0 1 12.5%;
  min-width: 0;
  aspect-ratio: 4 / 5;
  background: var(--flag);
  -webkit-mask: var(--cn-flag) center / 100% 100% no-repeat;
  mask: var(--cn-flag) center / 100% 100% no-repeat;
  transform-origin: 50% 0;
}
.is-live .cn__flag {
  animation: cn-sway calc(4.5s * var(--motion-scale)) ease-in-out infinite alternate;
  animation-delay: calc(var(--delay) * var(--motion-scale));
}
.cn__body {
  display: grid;
  justify-items: center;
  gap: 0.8rem;
  padding-inline: 0.5rem;
}
.cn__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(3rem, 17cqi, 4.8rem) * var(--t-title-size, 1));
  line-height: 1;
  color: var(--t-title-color, var(--color-text));
}
.cn__text {
  max-width: 28ch;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-size: calc(clamp(1.1rem, 5cqi, 1.3rem) * var(--t-text-size, 1));
  line-height: 1.5;
  color: var(--t-text-color, var(--color-text));
  text-wrap: balance;
}
.cn__signature {
  margin: 0.2rem 0 0;
  font-family: var(--t-signature-font, var(--font-script));
  font-size: calc(clamp(1.8rem, 9cqi, 2.4rem) * var(--t-signature-size, 1));
  line-height: 1.1;
  color: var(--t-signature-color, var(--color-text));
}

/* Los mariachis al pie, con un cactus a cada lado. */
.cn__stage {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  margin-top: 0.4rem;
}
.cn__band {
  flex: 0 1 62%;
  min-width: 0;
}
.cn__band :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.cn__band :deep([id^='musico-']) {
  transform-box: fill-box;
  transform-origin: 50% 100%;
}
.is-live .cn__band :deep(#musico-1) {
  animation: cn-rock calc(3.6s * var(--motion-scale)) ease-in-out infinite alternate;
}
.is-live .cn__band :deep(#musico-2) {
  animation: cn-rock calc(3.6s * var(--motion-scale)) ease-in-out infinite alternate;
  animation-delay: calc(-1.2s * var(--motion-scale));
}
.is-live .cn__band :deep(#musico-3) {
  animation: cn-rock calc(3.6s * var(--motion-scale)) ease-in-out infinite alternate;
  animation-delay: calc(-2.4s * var(--motion-scale));
}
.cn__cactus {
  display: block;
  flex: 0 1 19%;
  min-width: 0;
  height: auto;
  max-height: 11rem;
  object-fit: contain;
  object-position: bottom;
}
.cn__cactus--left {
  margin-right: -2%;
}
.cn__cactus--right {
  margin-left: -2%;
  max-height: 7rem;
}
/* La franja de sarape de orilla a orilla de la sección (el dibujo empalma a lo ancho). */
.cn__sarape {
  display: block;
  width: 100%;
  height: 1.7rem;
  margin-top: -0.3rem;
  background: var(--cn-sarape) 0 0 / auto 100% repeat-x;
}

@keyframes cn-sway {
  from {
    transform: rotate(-4deg);
  }
  to {
    transform: rotate(4deg);
  }
}
@keyframes cn-rock {
  from {
    transform: rotate(-1.6deg);
  }
  to {
    transform: rotate(1.6deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .is-live .cn__flag,
  .is-live .cn__band :deep([id^='musico-']) {
    animation: none;
  }
}
</style>
