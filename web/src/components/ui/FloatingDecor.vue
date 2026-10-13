<script setup lang="ts">
import { computed } from 'vue'
import { useEvent } from '@/composables/useEvent'
import type { FloatingDecorItem } from '@/themes/types'

/**
 * Decoraciones del tema que flotan en las orillas de la página, detrás del contenido.
 * Solo en pantallas anchas, donde hay margen a los lados; en el celular estorbarían.
 */
const props = defineProps<{ items: FloatingDecorItem[] }>()
const { resolveAsset } = useEvent()

const resolved = computed(() =>
  props.items
    .map((item, i) => ({ ...item, src: resolveAsset.value(item.file), i }))
    .filter((item) => item.src),
)
</script>

<template>
  <div class="floating-decor" aria-hidden="true">
    <img
      v-for="item in resolved"
      :key="item.i"
      :src="item.src!"
      alt=""
      class="floating-decor__item"
      :class="{ 'is-flipped': item.flip }"
      :style="{
        top: item.top,
        [item.side]: 'clamp(1rem, 3vw, 4rem)',
        width: item.size,
        '--delay': `${-item.i * 2.3}s`,
      }"
      loading="lazy"
    />
  </div>
</template>

<style scoped>
.floating-decor {
  display: none;
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
/* Con la página a 1200 px, desde 1360 px quedan márgenes libres a los lados. */
@media (min-width: 85rem) {
  .floating-decor {
    display: block;
  }
}
.floating-decor__item {
  position: absolute;
  animation: fx-float calc(8s * var(--motion-scale)) ease-in-out infinite;
  animation-delay: calc(var(--delay) * var(--motion-scale));
}
.floating-decor__item.is-flipped {
  scale: -1 1;
}
@media (prefers-reduced-motion: reduce) {
  .floating-decor__item {
    animation: none;
  }
}
</style>
