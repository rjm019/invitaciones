<script setup lang="ts">
import { computed } from 'vue'
import FxText from '@/components/ui/FxText.vue'
import { useEvent } from '@/composables/useEvent'
import { decorOr } from '@/services/decorService'
import { otherGroups } from '@/services/stationeryService'
import type { ResolvedSection } from '@/types/event'

/**
 * Bendición en retablo (`retablo`): un nicho de hojalata. Una tarjeta crema con arco arriba
 * dentro de un marco repujado (borde doble con puntitos), el corazón sagrado coronando el
 * arco a medias sobre el borde, el mensaje, los papás en dos columnas y los demás grupos
 * (padrinos, abuelos…) debajo, separados por una hilerita de flores. Si la portada ya es el
 * sobre de papelería (`sobre-lacre`, que lleva a los papás), aquí van solo los demás.
 * Sirve en cualquier tema: el metal y la tinta salen de la paleta.
 */
const props = defineProps<{ section: ResolvedSection }>()
const { event, resolveAsset, sections } = useEvent()

const coverShowsParents = computed(() =>
  (sections?.value ?? []).some((s) => s.type === 'hero-envelope' && s.variant === 'sobre-lacre'),
)
const groups = computed(() =>
  coverShowsParents.value ? otherGroups(event.value.family) : event.value.family,
)
const heart = computed(() =>
  decorOr(props.section.decor, 'sacred_heart', resolveAsset.value('corazon-sagrado.svg')),
)
const flowers = computed(() => {
  const own = decorOr(props.section.decor, 'flowers', null)
  if (own) return [own, own, own]
  if ('flowers' in props.section.decor) return []
  return ['gerbera.svg', 'cempasuchil.svg', 'gerbera-naranja.svg']
    .map((f) => resolveAsset.value(f))
    .filter((f): f is string => !!f)
})
</script>

<template>
  <div class="br">
    <div class="br__frame">
      <img v-if="heart" :src="heart" alt="" class="br__heart" loading="lazy" />
      <div class="br__card">
        <p v-if="section.subtitle" class="br__subtitle" data-text="subtitle">{{ section.subtitle }}</p>
        <h2 v-if="section.title" class="br__title" data-text="title">
          <FxText :text="section.title" :effects="section.effects" />
        </h2>
        <p v-if="section.text" class="br__text" data-text="text">{{ section.text }}</p>

        <div v-if="flowers.length" class="br__flowers" aria-hidden="true">
          <img v-for="(f, i) in flowers" :key="i" :src="f" alt="" loading="lazy" />
        </div>

        <div v-if="groups.length" class="br__groups">
          <div v-for="(group, i) in groups" :key="i" class="br__group">
            <p class="br__role" data-text="role">{{ group.role }}</p>
            <p class="br__names" data-text="names">
              <span v-for="(n, j) in group.names" :key="j">{{ n }}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.br {
  --br-tin: var(--color-amarillo, var(--color-primary-soft));
  --br-tin-dark: color-mix(in srgb, var(--br-tin) 55%, #3a2420);
  container-type: inline-size;
  max-width: 26rem;
  margin: 0 auto;
  /* Lugar para el corazón que sobresale del arco. */
  padding-top: 3.4rem;
}
/* El marco repujado: hojalata con puntitos, con el arco arriba. */
.br__frame {
  position: relative;
  padding: 0.8rem;
  border-radius: 999px 999px 0.8rem 0.8rem;
  background:
    radial-gradient(circle, var(--br-tin-dark) 1.3px, transparent 1.8px) 0 0 / 10px 10px,
    var(--br-tin);
  box-shadow:
    0 0 0 2px var(--br-tin-dark),
    0 1rem 1.6rem -0.8rem rgb(0 0 0 / 0.5);
}
.br__heart {
  position: absolute;
  left: 50%;
  top: -3.6rem;
  z-index: 1;
  width: 6.4rem;
  translate: -50% 0;
  filter: drop-shadow(0 3px 5px rgb(0 0 0 / 0.35));
}
/* La tarjeta crema, con un borde doble por dentro del marco. */
.br__card {
  display: grid;
  justify-items: center;
  gap: 0.9rem;
  padding: 3.6rem 1.2rem 1.8rem;
  border-radius: 999px 999px 0.4rem 0.4rem;
  background: var(--color-paper, #fbf3e2);
  box-shadow:
    inset 0 0 0 2px var(--br-tin-dark),
    inset 0 0 0 5px var(--color-paper, #fbf3e2),
    inset 0 0 0 6px var(--br-tin-dark);
  text-align: center;
}
.br__subtitle {
  margin: 0;
  font-family: var(--t-subtitle-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.74rem * var(--t-subtitle-size, 1));
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--t-subtitle-color, color-mix(in srgb, var(--color-tinta, #3a2420) 75%, transparent));
}
.br__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-display));
  font-weight: 400;
  font-size: calc(clamp(1.5rem, 7cqi, 2rem) * var(--t-title-size, 1));
  line-height: 1.15;
  color: var(--t-title-color, var(--color-rosa, var(--color-accent)));
}
.br__text {
  max-width: 26ch;
  margin: 0;
  font-family: var(--t-text-font, var(--font-serif));
  font-style: italic;
  font-size: calc(clamp(1.1rem, 5cqi, 1.35rem) * var(--t-text-size, 1));
  line-height: 1.45;
  color: var(--t-text-color, var(--color-tinta, #3a2420));
  text-wrap: balance;
}
.br__flowers {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.br__flowers img {
  width: 1.9rem;
  height: auto;
}
/* Papás en dos columnas; el grupo que queda solo ocupa todo el ancho. */
.br__groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.2rem 0.9rem;
  width: 100%;
}
.br__group:last-child:nth-child(odd) {
  grid-column: 1 / -1;
}
.br__role {
  margin: 0 0 0.3rem;
  font-family: var(--t-role-font, var(--font-caps));
  font-weight: 600;
  font-size: calc(0.68rem * var(--t-role-size, 1));
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--t-role-color, var(--color-talavera, var(--color-accent)));
}
.br__names {
  display: grid;
  margin: 0;
  font-family: var(--t-names-font, var(--font-serif));
  font-weight: 500;
  font-size: calc(1.05rem * var(--t-names-size, 1));
  line-height: 1.35;
  color: var(--t-names-color, var(--color-tinta, #3a2420));
  overflow-wrap: anywhere;
}
</style>
