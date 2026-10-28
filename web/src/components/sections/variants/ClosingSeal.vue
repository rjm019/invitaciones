<script setup lang="ts">
import { computed } from 'vue'
import FxText from '@/components/ui/FxText.vue'
import WaxSeal from '@/components/ui/WaxSeal.vue'
import { useEvent } from '@/composables/useEvent'
import { dateParts } from '@/services/dateFormatService'
import { decorOr } from '@/services/decorService'
import { coupleNames, formalDate } from '@/services/stationeryService'
import type { ResolvedSection } from '@/types/event'

/**
 * Cierre con lacre ("lacre"): el broche de la papelería. Un lacre grande (borgoña) con el
 * monograma, el mensaje en itálica, los nombres en mayúsculas espaciadas con el "&"
 * caligráfico y la fecha en versalitas, entre filigranas. Sin tarjeta: sobre el fondo de la
 * página. Con "luz rasante", una luz baja cruza despacio y hace notar el relieve.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset } = useEvent()

const names = computed(() =>
  coupleNames(event.value.celebrant.full_name || event.value.celebrant.short_name || event.value.title),
)
const date = computed(() =>
  event.value.starts_at ? formalDate(dateParts(event.value.starts_at, event.value.timezone)) : '',
)
const divider = computed(() =>
  decorOr(props.section.decor, 'divider', resolveAsset.value('filigrana.svg')),
)
const dividerStyle = computed(() =>
  divider.value ? { '--cs-divider': `url("${divider.value.replace(/"/g, '%22')}")` } : undefined,
)
</script>

<template>
  <div class="cs" :style="dividerStyle">
    <WaxSeal class="cs__seal" tone="burgundy" size="min(11rem, 46cqi)" seed="cierre" />
    <h2 v-if="section.title" class="cs__title" data-text="title"><FxText :text="section.title" :effects="section.effects" /></h2>
    <p v-if="section.text" class="cs__text" data-text="text">{{ section.text }}</p>
    <span v-if="divider" class="cs__divider" aria-hidden="true" />
    <p class="cs__names" data-text="signature">
      <template v-if="names.length === 2">
        {{ names[0] }} <span class="cs__amp">&amp;</span> {{ names[1] }}
      </template>
      <template v-else>{{ names[0] }}</template>
    </p>
    <p v-if="date" class="cs__date">{{ date }}</p>
  </div>
</template>

<style scoped>
.cs {
  container-type: inline-size;
  display: grid;
  justify-items: center;
  gap: 1rem;
  max-width: 30rem;
  margin: 0 auto;
  padding-block: var(--space-2);
  text-align: center;
}
.cs__seal {
  margin-bottom: 0.6rem;
  filter: drop-shadow(0 10px 14px rgb(40 20 20 / 0.35));
}
.cs__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.9rem, 9cqi, 2.8rem) * var(--t-title-size, 1));
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
  margin-right: -0.14em;
}
.cs__text {
  max-width: 28ch;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(clamp(1.2rem, 5.4cqi, 1.45rem) * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
  text-wrap: balance;
}
.cs__divider {
  width: min(12rem, 56%);
  aspect-ratio: 240 / 28;
  background: var(--color-borgona, var(--color-accent));
  -webkit-mask: var(--cs-divider) center / contain no-repeat;
  mask: var(--cs-divider) center / contain no-repeat;
  opacity: 0.7;
}
.cs__names {
  margin: 0;
  font-family: var(--t-signature-font, var(--font-display));
  font-size: calc(clamp(1.2rem, 5.6cqi, 1.6rem) * var(--t-signature-size, 1));
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--t-signature-color, var(--color-text));
}
.cs__amp {
  font-family: var(--font-script);
  font-size: 1.6em;
  line-height: 0;
  letter-spacing: 0;
  text-transform: none;
  color: var(--color-borgona, var(--color-accent));
  vertical-align: -0.12em;
}
.cs__date {
  margin: 0;
  font-family: var(--font-caps);
  font-weight: 600;
  font-size: 0.74rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-text) 70%, transparent);
}
</style>
