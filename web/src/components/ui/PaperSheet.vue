<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * Lámina de papel: una imagen (papel, encaje, pergamino) a todo el ancho y con su
 * proporción intacta, sin recortar, y el contenido del slot dentro de su "zona segura"
 * (márgenes en % de la imagen). El slot es un contenedor de tamaño (`cqi`) para que el
 * texto escale con la lámina. Sin colores propios. Sin imagen: tarjeta lisa.
 */
const props = withDefaults(
  defineProps<{
    src?: string | null
    /** Ancho / alto de la imagen; si falta se mide de la imagen cargada. */
    aspect?: number
    safe?: { top?: number; right?: number; bottom?: number; left?: number }
  }>(),
  { src: null, aspect: undefined, safe: () => ({}) },
)

const measured = ref<number | null>(null)
watch(
  () => props.src,
  () => {
    measured.value = null
  },
)

function onLoad(e: Event): void {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
    measured.value = img.naturalWidth / img.naturalHeight
  }
}

const ratio = computed(() => props.aspect && props.aspect > 0 ? props.aspect : measured.value)
const style = computed(() => {
  const s = props.safe
  return {
    '--sheet-top': `${s.top ?? 18}%`,
    '--sheet-right': `${s.right ?? 16}%`,
    '--sheet-bottom': `${s.bottom ?? 18}%`,
    '--sheet-left': `${s.left ?? 16}%`,
    ...(ratio.value ? { '--sheet-aspect': String(ratio.value) } : {}),
  }
})
</script>

<template>
  <div class="sheet" :class="{ 'sheet--plain': !src }" :style="style">
    <img v-if="src" class="sheet__img" :src="src" alt="" @load="onLoad" />
    <div class="sheet__safe">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.sheet {
  position: relative;
  width: 100%;
  max-width: 34rem;
  margin: 0 auto;
}
.sheet__img {
  display: block;
  width: 100%;
  height: auto;
}
.sheet__safe {
  position: absolute;
  top: var(--sheet-top);
  right: var(--sheet-right);
  bottom: var(--sheet-bottom);
  left: var(--sheet-left);
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.4rem;
  text-align: center;
  container-type: inline-size;
}
.sheet--plain {
  aspect-ratio: var(--sheet-aspect, 0.72);
  border-radius: var(--radius-card);
  background: var(--color-paper);
  box-shadow: var(--shadow-card);
}
</style>
