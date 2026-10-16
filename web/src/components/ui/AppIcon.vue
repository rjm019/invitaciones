<script setup lang="ts">
import { computed } from 'vue'
import utensilsSvg from '@fortawesome/fontawesome-free/svgs/solid/utensils.svg?raw'
import churchSvg from '@fortawesome/fontawesome-free/svgs/solid/church.svg?raw'
import doorOpenSvg from '@fortawesome/fontawesome-free/svgs/solid/door-open.svg?raw'
import champagneGlassesSvg from '@fortawesome/fontawesome-free/svgs/solid/champagne-glasses.svg?raw'
import crownSvg from '@fortawesome/fontawesome-free/svgs/solid/crown.svg?raw'
import musicSvg from '@fortawesome/fontawesome-free/svgs/solid/music.svg?raw'
import heartSvg from '@fortawesome/fontawesome-free/svgs/solid/heart.svg?raw'
import locationDotSvg from '@fortawesome/fontawesome-free/svgs/solid/location-dot.svg?raw'
import ringSvg from '@fortawesome/fontawesome-free/svgs/solid/ring.svg?raw'
import doveSvg from '@fortawesome/fontawesome-free/svgs/solid/dove.svg?raw'
import giftSvg from '@fortawesome/fontawesome-free/svgs/solid/gift.svg?raw'
import cakeCandlesSvg from '@fortawesome/fontawesome-free/svgs/solid/cake-candles.svg?raw'
import graduationCapSvg from '@fortawesome/fontawesome-free/svgs/solid/graduation-cap.svg?raw'
import playSvg from '@fortawesome/fontawesome-free/svgs/solid/play.svg?raw'
import pauseSvg from '@fortawesome/fontawesome-free/svgs/solid/pause.svg?raw'
import backwardSvg from '@fortawesome/fontawesome-free/svgs/solid/backward.svg?raw'
import forwardSvg from '@fortawesome/fontawesome-free/svgs/solid/forward.svg?raw'
import shuffleSvg from '@fortawesome/fontawesome-free/svgs/solid/shuffle.svg?raw'
import repeatSvg from '@fortawesome/fontawesome-free/svgs/solid/repeat.svg?raw'
import calendarPlusSvg from '@fortawesome/fontawesome-free/svgs/regular/calendar-plus.svg?raw'
import sunSvg from '@fortawesome/fontawesome-free/svgs/solid/sun.svg?raw'
import moonSvg from '@fortawesome/fontawesome-free/svgs/solid/moon.svg?raw'
import cloudSunSvg from '@fortawesome/fontawesome-free/svgs/solid/cloud-sun.svg?raw'
import cloudMoonSvg from '@fortawesome/fontawesome-free/svgs/solid/cloud-moon.svg?raw'
import cloudSvg from '@fortawesome/fontawesome-free/svgs/solid/cloud.svg?raw'
import smogSvg from '@fortawesome/fontawesome-free/svgs/solid/smog.svg?raw'
import cloudRainSvg from '@fortawesome/fontawesome-free/svgs/solid/cloud-rain.svg?raw'
import cloudShowersHeavySvg from '@fortawesome/fontawesome-free/svgs/solid/cloud-showers-heavy.svg?raw'
import cloudBoltSvg from '@fortawesome/fontawesome-free/svgs/solid/cloud-bolt.svg?raw'
import snowflakeSvg from '@fortawesome/fontawesome-free/svgs/solid/snowflake.svg?raw'
import dropletSvg from '@fortawesome/fontawesome-free/svgs/solid/droplet.svg?raw'
import spotifySvg from '@fortawesome/fontawesome-free/svgs/brands/spotify.svg?raw'
import bedSvg from '@fortawesome/fontawesome-free/svgs/solid/bed.svg?raw'
import phoneSvg from '@fortawesome/fontawesome-free/svgs/solid/phone.svg?raw'
import taxiSvg from '@fortawesome/fontawesome-free/svgs/solid/taxi.svg?raw'
import envelopeSvg from '@fortawesome/fontawesome-free/svgs/regular/envelope.svg?raw'
import copySvg from '@fortawesome/fontawesome-free/svgs/regular/copy.svg?raw'
import bagSvg from '@fortawesome/fontawesome-free/svgs/solid/bag-shopping.svg?raw'
import martiniSvg from '@fortawesome/fontawesome-free/svgs/solid/martini-glass-citrus.svg?raw'
import citySvg from '@fortawesome/fontawesome-free/svgs/solid/city.svg?raw'
import statueSvg from '@/assets/icons/statue-of-liberty.svg?raw'
import bridgeSvg from '@/assets/icons/brooklyn-bridge.svg?raw'
import empireSvg from '@/assets/icons/empire-state.svg?raw'
import discoBallSvg from '@/assets/icons/disco-ball.svg?raw'
import { useEvent } from '@/composables/useEvent'

/**
 * Ícono del layout: un archivo ("copas.webp", se busca en la media del evento y en el
 * tema) o un nombre de Font Awesome de esta lista ("utensils"). Los SVG van empaquetados
 * con la invitación (son pocos y chicos): aparecen junto con todo lo demás.
 */
const props = defineProps<{ name?: string; label?: string }>()

const ICONS: Record<string, string> = {
  utensils: utensilsSvg,
  church: churchSvg,
  'door-open': doorOpenSvg,
  'champagne-glasses': champagneGlassesSvg,
  crown: crownSvg,
  music: musicSvg,
  heart: heartSvg,
  'location-dot': locationDotSvg,
  ring: ringSvg,
  dove: doveSvg,
  gift: giftSvg,
  'cake-candles': cakeCandlesSvg,
  'graduation-cap': graduationCapSvg,
  play: playSvg,
  pause: pauseSvg,
  backward: backwardSvg,
  forward: forwardSvg,
  shuffle: shuffleSvg,
  repeat: repeatSvg,
  'calendar-plus': calendarPlusSvg,
  sun: sunSvg,
  moon: moonSvg,
  'cloud-sun': cloudSunSvg,
  'cloud-moon': cloudMoonSvg,
  cloud: cloudSvg,
  smog: smogSvg,
  'cloud-rain': cloudRainSvg,
  'cloud-showers-heavy': cloudShowersHeavySvg,
  'cloud-bolt': cloudBoltSvg,
  snowflake: snowflakeSvg,
  droplet: dropletSvg,
  spotify: spotifySvg,
  bed: bedSvg,
  phone: phoneSvg,
  taxi: taxiSvg,
  envelope: envelopeSvg,
  copy: copySvg,
  'bag-shopping': bagSvg,
  'martini-glass-citrus': martiniSvg,
  city: citySvg,
  // Propios (src/assets/icons): Nueva York y la fiesta.
  'statue-of-liberty': statueSvg,
  'brooklyn-bridge': bridgeSvg,
  'empire-state': empireSvg,
  'disco-ball': discoBallSvg,
}

const { resolveAsset } = useEvent()
const image = computed(() =>
  props.name && /\.\w{3,4}$/.test(props.name) ? resolveAsset.value(props.name) : null,
)
const svg = computed(() => (props.name ? (ICONS[props.name] ?? '') : ''))
</script>

<template>
  <img
    v-if="image"
    :src="image"
    :alt="label ?? ''"
    class="app-icon app-icon--image"
    loading="lazy"
  />
  <!-- SVG de Font Awesome Free (CC BY 4.0) o propios, estáticos y empaquetados: seguros para v-html -->
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
