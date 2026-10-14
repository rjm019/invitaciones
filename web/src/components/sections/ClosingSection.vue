<script setup lang="ts">
import { computed } from 'vue'
import type { ResolvedSection } from '@/types/event'

/**
 * Cierre: "¡Te esperamos!" y, si el layout lo trae, un texto final. Con la decoración
 * "flowers", un ramo arriba a la derecha (volteado) y otro abajo a la izquierda: la
 * esquina de abajo a la derecha queda libre para el botón flotante de la música.
 */
const props = defineProps<{ section: ResolvedSection }>()
const title = computed(() => props.section.title ?? '¡Te esperamos!')
</script>

<template>
  <div class="closing" :class="{ 'closing--flowers': section.decor.flowers }">
    <template v-if="section.decor.flowers">
      <img :src="section.decor.flowers" alt="" class="closing__flowers closing__flowers--top" />
      <img :src="section.decor.flowers" alt="" class="closing__flowers closing__flowers--bottom" />
    </template>
    <img v-if="section.decor.crown" :src="section.decor.crown" alt="" class="closing__crown" />
    <h2 class="closing__title" data-text="title">{{ title }}</h2>
    <p v-if="section.text" class="closing__text" data-text="text">{{ section.text }}</p>
  </div>
</template>

<style scoped>
.closing {
  position: relative;
  display: grid;
  justify-items: center;
  gap: var(--space-1);
  max-width: 26rem;
  margin: 0 auto;
  padding-bottom: var(--space-3);
  text-align: center;
}
/*
 * Con flores: más alto y de todo el ancho del panel (en escritorio es una fila completa),
 * para que los ramos queden en sus esquinas y el título al centro.
 */
.closing--flowers {
  max-width: none;
  padding-block: var(--space-5);
}
.closing__flowers {
  position: absolute;
  width: 34%;
  max-width: 9rem;
  pointer-events: none;
}
/* Llegan hasta la orilla del panel (el panel las recorta en su esquina redonda). */
.closing__flowers--top {
  top: calc(-1 * var(--section-padding-block, var(--space-4)) - 0.4rem);
  right: calc(-1 * var(--section-padding-inline, var(--space-2)) - 0.4rem);
  scale: 1 -1; /* rosas arriba y hojas cayendo por la orilla derecha */
}
.closing__flowers--bottom {
  bottom: calc(-1 * var(--section-padding-block, var(--space-4)) - 0.4rem);
  left: calc(-1 * var(--section-padding-inline, var(--space-2)) - 0.4rem);
  scale: -1 1; /* rosas abajo y hojas subiendo por la orilla izquierda */
}
.closing__crown {
  width: 14%;
}
.closing__title {
  position: relative;
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2rem, 10cqi, 2.9rem) * var(--t-title-size, 1));
  color: var(--t-title-color, var(--color-primary));
}
.closing__text {
  position: relative;
  max-width: 26rem;
  margin: 0;
  font-size: calc(var(--text-body) * var(--t-text-size, 1));
  line-height: 1.4;
  font-family: var(--t-text-font);
  color: var(--t-text-color);
}
</style>
