<script setup lang="ts">
import { computed } from 'vue'
import { useEvent } from '@/composables/useEvent'
import { decorOr } from '@/services/decorService'
import { otherGroups } from '@/services/stationeryService'
import type { ResolvedSection } from '@/types/event'

/**
 * Bendición editorial ("editorial"): el mensaje en itálica grande, entre dos filigranas, y
 * los grupos de la familia en columnas (quiénes son en versalitas, los nombres debajo),
 * como el reverso de una tarjeta impresa. Si la portada ya es el sobre de papelería
 * (`sobre-lacre`, que lleva a los papás en su tarjeta), aquí van solo los demás (padrinos,
 * abuelos…), para no repetirlos.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset, sections } = useEvent()

const coverShowsParents = computed(() =>
  (sections?.value ?? []).some((s) => s.type === 'hero-envelope' && s.variant === 'sobre-lacre'),
)
const groups = computed(() =>
  coverShowsParents.value ? otherGroups(event.value.family) : event.value.family,
)
const divider = computed(() =>
  decorOr(props.section.decor, 'divider', resolveAsset.value('filigrana.svg')),
)
const dividerStyle = computed(() =>
  divider.value ? { '--be-divider': `url("${divider.value.replace(/"/g, '%22')}")` } : undefined,
)
</script>

<template>
  <div class="be" :style="dividerStyle">
    <span v-if="divider" class="be__divider" aria-hidden="true" />
    <p v-if="section.subtitle" class="be__subtitle" data-text="subtitle">{{ section.subtitle }}</p>
    <h2 v-if="section.title" class="be__title" data-text="title">{{ section.title }}</h2>
    <p v-if="section.text" class="be__text" data-text="text">{{ section.text }}</p>

    <div v-if="groups.length" class="be__groups">
      <div v-for="(group, i) in groups" :key="i" class="be__group">
        <p class="be__role" data-text="role">{{ group.role }}</p>
        <p class="be__names" data-text="names">
          <span v-for="(n, j) in group.names" :key="j">{{ n }}</span>
        </p>
      </div>
    </div>
    <span v-if="divider" class="be__divider be__divider--end" aria-hidden="true" />
  </div>
</template>

<style scoped>
.be {
  display: grid;
  justify-items: center;
  gap: 1.1rem;
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}
.be__divider {
  width: min(13rem, 60%);
  aspect-ratio: 240 / 28;
  background: var(--color-borgona, var(--color-accent));
  -webkit-mask: var(--be-divider) center / contain no-repeat;
  mask: var(--be-divider) center / contain no-repeat;
  opacity: 0.75;
}
.be__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.74rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, color-mix(in srgb, var(--color-text) 70%, transparent));
}
.be__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.6rem, 7cqi, 2.1rem) * var(--t-title-size, 1));
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--t-title-color, var(--color-text));
}
.be__text {
  max-width: 28ch;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(clamp(1.25rem, 5.6cqi, 1.5rem) * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-text));
  text-wrap: balance;
}
.be__groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr));
  gap: 1.4rem 1.2rem;
  width: 100%;
  margin-top: 0.4rem;
}
.be__role {
  margin: 0 0 0.35rem;
  font-family: var(--t-role-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.7rem * var(--t-role-size, 1));
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--t-role-color, var(--color-borgona, var(--color-accent)));
}
.be__names {
  display: grid;
  margin: 0;
  font-family: var(--t-names-font, var(--font-serif));
  font-weight: 500;
  font-size: calc(1.08rem * var(--t-names-size, 1));
  line-height: 1.35;
  color: var(--t-names-color, var(--color-text));
}
</style>
