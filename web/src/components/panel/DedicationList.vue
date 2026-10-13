<script setup lang="ts">
import { computed, ref } from 'vue'
import { shortDateTime } from '@/services/dateFormatService'
import { filterDedications } from '@/services/panelService'
import type { PanelDedication } from '@/types/panel'

/** Dedicatorias que dejaron los invitados (una por enlace), la más reciente primero. */
const props = defineProps<{ dedications: PanelDedication[]; timezone: string }>()

const query = ref('')
const shown = computed(() => filterDedications(props.dedications, query.value))
</script>

<template>
  <section class="p-card dedications" aria-labelledby="dedications-title">
    <div class="dedications__head">
      <h2 id="dedications-title" class="p-card__title">Dedicatorias</h2>
      <input
        v-if="dedications.length"
        v-model="query"
        type="search"
        class="dedications__search"
        placeholder="Buscar por nombre, invitación o texto"
        aria-label="Buscar dedicatorias"
      />
    </div>

    <p v-if="!dedications.length" class="p-hint">
      Todavía no hay dedicatorias. Aparecen aquí en cuanto un invitado envía la suya.
    </p>
    <p v-else-if="!shown.length" class="p-hint">Ninguna dedicatoria coincide con la búsqueda.</p>

    <ul v-else class="dedications__list">
      <li v-for="d in shown" :key="d.invitation" class="dedications__item">
        <p class="dedications__message">{{ d.message }}</p>
        <p class="dedications__meta">
          <strong>{{ d.name }}</strong>
          <span v-if="d.label"> · {{ d.label }}</span>
          <span> · #{{ d.invitation }}</span>
          <span v-if="d.sent_at"> · {{ shortDateTime(d.sent_at, timezone) }}</span>
        </p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.dedications {
  max-width: 70rem;
  margin: 0 auto;
}
.dedications__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}
.dedications__head .p-card__title {
  margin: 0;
}
.dedications__search {
  flex: 1 1 15rem;
  max-width: 24rem;
}
.dedications__list {
  display: grid;
  gap: 0.7rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.dedications__item {
  padding: 0.8rem 1rem;
  border: 1px solid var(--p-line);
  border-left: 3px solid var(--p-accent);
  border-radius: 8px;
  background: var(--p-card);
}
.dedications__message {
  margin: 0;
  white-space: pre-line;
  overflow-wrap: anywhere;
  line-height: 1.45;
}
.dedications__meta {
  margin: 0.5rem 0 0;
  color: var(--p-muted);
  font-size: 0.92rem;
}
.dedications__meta strong {
  color: var(--p-text);
}
</style>
