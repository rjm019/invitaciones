<script setup lang="ts">
import { computed } from 'vue'
import { useEvent } from '@/composables/useEvent'
import type { ResolvedSection } from '@/types/event'

/** Bendición y familia: tarjeta en arco de lino sobre el fondo de la sección (toile). */
const props = defineProps<{ section: ResolvedSection }>()
const { event } = useEvent()

const subtitle = computed(() => props.section.subtitle ?? event.value.subtitle)
const archStyle = computed(() =>
  props.section.decor.arch ? { '--arch-image': `url("${props.section.decor.arch}")` } : {},
)
</script>

<template>
  <div class="blessing">
    <div
      class="blessing__arch"
      :class="{ 'blessing__arch--image': section.decor.arch }"
      :style="archStyle"
    >
      <div class="blessing__body">
        <img
          v-if="section.decor.leaves"
          :src="section.decor.leaves"
          alt=""
          class="blessing__leaves"
        />
        <p v-if="section.text" class="blessing__text">{{ section.text }}</p>
        <p v-if="subtitle" class="blessing__subtitle">{{ subtitle }}</p>
        <img
          v-if="section.decor.divider"
          :src="section.decor.divider"
          alt=""
          class="blessing__divider"
        />

        <dl v-if="event.family.length" class="blessing__family">
          <div v-for="group in event.family" :key="group.role" class="blessing__group">
            <dt class="blessing__role">{{ group.role }}</dt>
            <dd v-for="person in group.names" :key="person" class="blessing__name">{{ person }}</dd>
          </div>
        </dl>
      </div>
    </div>
    <img v-if="section.decor.bow" :src="section.decor.bow" alt="" class="blessing__bow" />
  </div>
</template>

<style scoped>
.blessing {
  position: relative;
  width: 84%;
  max-width: 25rem;
  margin: 0 auto;
  padding-bottom: 20%; /* espacio para el lazo que cuelga de la tarjeta */
  container-type: inline-size;
}
/*
 * Arco de lino cortado en 9 partes: la curva de arriba no se deforma aunque la familia
 * tenga 1 o 4 grupos; solo se estira el lino del centro. Medidas sobre la imagen de 920 px.
 */
.blessing__arch--image {
  --arch-top: calc(100cqw * 470 / 920);
  --arch-side: calc(100cqw * 24 / 920);
  --arch-bottom: calc(100cqw * 40 / 920);
  border-style: solid;
  border-color: transparent;
  border-width: var(--arch-top) var(--arch-side) var(--arch-bottom);
  border-image: var(--arch-image) 470 24 40 24 fill / var(--arch-top) var(--arch-side)
    var(--arch-bottom) stretch;
}
/* Sin imagen: el mismo arco en CSS. */
.blessing__arch:not(.blessing__arch--image) {
  padding-top: 30cqw;
  border-radius: 50cqw 50cqw 0 0;
  background: var(--color-lino, var(--color-surface));
  box-shadow: var(--shadow-card);
}
.blessing__body {
  display: grid;
  justify-items: center;
  gap: 0.7rem;
  /* El texto empieza dentro de la curva, como en el diseño. */
  margin-top: calc(100cqw * -0.25);
  padding: 0 7% 12%;
  text-align: center;
}
.blessing__arch:not(.blessing__arch--image) .blessing__body {
  margin-top: 0;
}
.blessing__leaves {
  width: 7%;
}
.blessing__text {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(1rem, 5.6cqi, 1.35rem);
  line-height: 1.25;
  color: var(--color-text);
}
.blessing__subtitle {
  margin: 0.6rem 0 0;
  font-family: var(--font-script-mono);
  font-size: clamp(1.4rem, 8.6cqi, 2.2rem);
  line-height: 1.1;
  color: var(--color-primary);
}
.blessing__divider {
  width: 95%;
}
.blessing__family {
  display: grid;
  gap: 1.1rem;
  margin: 0.8rem 0 0;
}
.blessing__group {
  display: grid;
  gap: 0.1rem;
}
.blessing__role {
  font-family: var(--font-script-mono);
  font-size: clamp(1.4rem, 8.6cqi, 2.2rem);
  line-height: 1.1;
  color: var(--color-primary);
}
.blessing__name {
  margin: 0;
  font-family: var(--font-caps);
  font-size: clamp(1.05rem, 6.4cqi, 1.6rem);
  letter-spacing: 0.04em;
  color: var(--color-text);
}
.blessing__bow {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 28%;
  transform: translateX(-50%);
  pointer-events: none;
}
</style>
