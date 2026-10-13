<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useEvent } from '@/composables/useEvent'

/**
 * Ícono del layout: un archivo ("copas.webp", se busca en la media del evento y en el
 * tema) o un nombre de Font Awesome de esta lista ("utensils"). Cada SVG se carga
 * solo cuando se usa.
 */
const props = defineProps<{ name?: string; label?: string }>()

const ICONS: Record<string, () => Promise<{ default: string }>> = {
  utensils: () => import('@fortawesome/fontawesome-free/svgs/solid/utensils.svg?raw'),
  church: () => import('@fortawesome/fontawesome-free/svgs/solid/church.svg?raw'),
  'door-open': () => import('@fortawesome/fontawesome-free/svgs/solid/door-open.svg?raw'),
  'champagne-glasses': () =>
    import('@fortawesome/fontawesome-free/svgs/solid/champagne-glasses.svg?raw'),
  crown: () => import('@fortawesome/fontawesome-free/svgs/solid/crown.svg?raw'),
  music: () => import('@fortawesome/fontawesome-free/svgs/solid/music.svg?raw'),
  heart: () => import('@fortawesome/fontawesome-free/svgs/solid/heart.svg?raw'),
  'location-dot': () => import('@fortawesome/fontawesome-free/svgs/solid/location-dot.svg?raw'),
  ring: () => import('@fortawesome/fontawesome-free/svgs/solid/ring.svg?raw'),
  dove: () => import('@fortawesome/fontawesome-free/svgs/solid/dove.svg?raw'),
  gift: () => import('@fortawesome/fontawesome-free/svgs/solid/gift.svg?raw'),
  'cake-candles': () => import('@fortawesome/fontawesome-free/svgs/solid/cake-candles.svg?raw'),
  // Reproductor y ubicación
  play: () => import('@fortawesome/fontawesome-free/svgs/solid/play.svg?raw'),
  pause: () => import('@fortawesome/fontawesome-free/svgs/solid/pause.svg?raw'),
  backward: () => import('@fortawesome/fontawesome-free/svgs/solid/backward.svg?raw'),
  forward: () => import('@fortawesome/fontawesome-free/svgs/solid/forward.svg?raw'),
  shuffle: () => import('@fortawesome/fontawesome-free/svgs/solid/shuffle.svg?raw'),
  repeat: () => import('@fortawesome/fontawesome-free/svgs/solid/repeat.svg?raw'),
  'calendar-plus': () => import('@fortawesome/fontawesome-free/svgs/regular/calendar-plus.svg?raw'),
  // Clima y playlist
  sun: () => import('@fortawesome/fontawesome-free/svgs/solid/sun.svg?raw'),
  moon: () => import('@fortawesome/fontawesome-free/svgs/solid/moon.svg?raw'),
  'cloud-sun': () => import('@fortawesome/fontawesome-free/svgs/solid/cloud-sun.svg?raw'),
  'cloud-moon': () => import('@fortawesome/fontawesome-free/svgs/solid/cloud-moon.svg?raw'),
  cloud: () => import('@fortawesome/fontawesome-free/svgs/solid/cloud.svg?raw'),
  smog: () => import('@fortawesome/fontawesome-free/svgs/solid/smog.svg?raw'),
  'cloud-rain': () => import('@fortawesome/fontawesome-free/svgs/solid/cloud-rain.svg?raw'),
  'cloud-showers-heavy': () =>
    import('@fortawesome/fontawesome-free/svgs/solid/cloud-showers-heavy.svg?raw'),
  'cloud-bolt': () => import('@fortawesome/fontawesome-free/svgs/solid/cloud-bolt.svg?raw'),
  snowflake: () => import('@fortawesome/fontawesome-free/svgs/solid/snowflake.svg?raw'),
  droplet: () => import('@fortawesome/fontawesome-free/svgs/solid/droplet.svg?raw'),
  spotify: () => import('@fortawesome/fontawesome-free/svgs/brands/spotify.svg?raw'),
}

const { resolveAsset } = useEvent()
const image = computed(() =>
  props.name && /\.\w{3,4}$/.test(props.name) ? resolveAsset.value(props.name) : null,
)
const svg = ref('')

watchEffect(async () => {
  const load = props.name ? ICONS[props.name] : undefined
  svg.value = load ? (await load()).default : ''
})
</script>

<template>
  <img
    v-if="image"
    :src="image"
    :alt="label ?? ''"
    class="app-icon app-icon--image"
    loading="lazy"
  />
  <!-- SVG de Font Awesome Free (CC BY 4.0), estático y empaquetado: seguro para v-html -->
  <span
    v-else-if="svg"
    class="app-icon app-icon--svg"
    :aria-label="label"
    :aria-hidden="!label"
    v-html="svg"
  />
</template>

<style scoped>
.app-icon--image {
  width: auto;
  height: 2.6em;
  object-fit: contain;
}
.app-icon--svg {
  display: inline-block;
  width: 1.8em;
  height: 1.8em;
}
.app-icon--svg :deep(svg) {
  width: 100%;
  height: 100%;
  fill: currentColor;
}
</style>
