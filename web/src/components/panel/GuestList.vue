<script setup lang="ts">
import { computed, ref } from 'vue'
import { ApiError } from '@/services/http'
import {
  filterGuests,
  guestCounts,
  guestRows,
  parseTable,
  tableSummary,
  type GuestFilter,
  type GuestRow,
} from '@/services/panelService'
import type { PanelInvitation, TableAssignment } from '@/types/panel'

/**
 * Lista completa de invitados (personas de todas las invitaciones) con su mesa. La mesa se
 * guarda al salir del campo o con Enter; vacío quita la mesa.
 */
const props = defineProps<{
  invitations: PanelInvitation[]
  assign: (assignments: TableAssignment[]) => Promise<void>
}>()

const filter = ref<GuestFilter>('all')
const query = ref('')
const saving = ref<string | null>(null)
const saved = ref<string | null>(null)
const errors = ref<Record<string, string>>({})

const rows = computed(() => guestRows(props.invitations))
const counts = computed(() => guestCounts(rows.value))
const shown = computed(() => filterGuests(rows.value, filter.value, query.value))
const tables = computed(() => tableSummary(rows.value))

const FILTERS: { id: GuestFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'attending', label: 'Asistirán' },
  { id: 'declined', label: 'No asistirán' },
  { id: 'no-table', label: 'Sin mesa' },
  { id: 'empty', label: 'Lugares libres' },
]

async function saveTable(row: GuestRow, event: Event) {
  const input = event.target as HTMLInputElement
  const table = parseTable(input.value)
  errors.value = { ...errors.value, [row.key]: '' }
  if (table === undefined) {
    errors.value = { ...errors.value, [row.key]: 'La mesa debe ser un número de 1 a 999.' }
    return
  }
  if (table === row.table) return

  saving.value = row.key
  try {
    await props.assign([{ invitation: row.invitationId, slot: row.slot, table }])
    saved.value = row.key
    setTimeout(() => saved.value === row.key && (saved.value = null), 1800)
  } catch (e) {
    errors.value = {
      ...errors.value,
      [row.key]: e instanceof ApiError || e instanceof Error ? e.message : 'No se pudo guardar.',
    }
  } finally {
    saving.value = null
  }
}
</script>

<template>
  <section class="p-card guests" aria-labelledby="guests-title">
    <div class="guests__head">
      <h2 id="guests-title" class="p-card__title">Invitados ({{ counts.all }})</h2>
      <input
        v-model="query"
        type="search"
        class="guests__search"
        placeholder="Buscar nombre o «mesa 5»"
        aria-label="Buscar invitado"
      />
    </div>

    <div class="guests__filters" role="group" aria-label="Filtrar invitados">
      <button
        v-for="f in FILTERS"
        :key="f.id"
        type="button"
        class="guests__filter"
        :class="{ 'is-active': filter === f.id }"
        :aria-pressed="filter === f.id"
        @click="filter = f.id"
      >
        {{ f.label }} <span>{{ counts[f.id] }}</span>
      </button>
    </div>

    <p v-if="tables.tables.length || tables.unassigned" class="guests__tables">
      <span v-for="t in tables.tables" :key="t.table" class="guests__table-chip"
        >Mesa {{ t.table }}: {{ t.people }}</span
      >
      <span v-if="tables.unassigned" class="guests__table-chip is-pending"
        >Sin mesa: {{ tables.unassigned }}</span
      >
    </p>

    <p v-if="!shown.length" class="p-hint">
      {{
        counts.all || filter === 'empty'
          ? 'Nadie coincide con este filtro.'
          : 'Todavía nadie ha confirmado. Aquí aparecerán los nombres que envíen tus invitados.'
      }}
    </p>

    <ol v-else class="guests__rows">
      <li v-for="row in shown" :key="row.key" class="guest" :class="{ 'is-empty': !row.name }">
        <div class="guest__who">
          <strong class="guest__name">{{ row.name ?? 'Lugar libre' }}</strong>
          <span
            v-if="row.attending !== null"
            class="p-chip"
            :class="row.attending ? 'p-chip--ok' : 'p-chip--no'"
          >
            {{ row.attending ? 'Asistirá' : 'No asistirá' }}
          </span>
          <span class="guest__from"
            >#{{ row.invitationId }}{{ row.invitationLabel ? ` · ${row.invitationLabel}` : '' }} ·
            lugar {{ row.slot }}</span
          >
        </div>

        <label v-if="row.attending" class="guest__table">
          <span>Mesa</span>
          <input
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="3"
            :value="row.table ?? ''"
            placeholder="—"
            :aria-label="`Mesa de ${row.name}`"
            :aria-invalid="!!errors[row.key]"
            :disabled="saving === row.key"
            @change="saveTable(row, $event)"
            @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
          />
          <span class="guest__state" aria-live="polite">{{
            saving === row.key ? 'Guardando…' : saved === row.key ? '✓ Guardada' : ''
          }}</span>
        </label>
        <p v-if="errors[row.key]" class="p-error guest__error">{{ errors[row.key] }}</p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.guests__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}
.guests__head .p-card__title {
  margin: 0;
}
.guests__search {
  flex: 1 1 15rem;
  max-width: 24rem;
}
.guests__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.8rem;
}
.guests__filter {
  min-height: 2.5rem;
  padding: 0.3rem 0.8rem;
  border: 1px solid var(--p-line);
  border-radius: 999px;
  background: var(--p-card);
  color: var(--p-text);
  font: inherit;
  font-size: 0.92rem;
  cursor: pointer;
}
.guests__filter span {
  color: var(--p-muted);
  font-variant-numeric: tabular-nums;
}
.guests__filter.is-active {
  border-color: var(--p-accent);
  background: var(--p-accent);
  color: #fff;
}
.guests__filter.is-active span {
  color: #fff;
}
.guests__tables {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0 0 0.9rem;
}
.guests__table-chip {
  padding: 0.15rem 0.6rem;
  border-radius: 6px;
  background: var(--p-bg);
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
}
.guests__table-chip.is-pending {
  background: #fff4e5;
  color: #7a4b00;
}
.guests__rows {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}
.guest {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.3rem 1rem;
  padding: 0.75rem 0.2rem;
  border-top: 1px solid var(--p-line);
}
.guest.is-empty .guest__name {
  color: var(--p-muted);
  font-weight: 400;
  font-style: italic;
}
.guest__who {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem 0.5rem;
  min-width: 0;
}
.guest__name {
  overflow-wrap: anywhere;
}
.guest__from {
  flex-basis: 100%;
  color: var(--p-muted);
  font-size: 0.85rem;
}
.guest__table {
  display: grid;
  grid-template-columns: auto 4.2rem;
  align-items: center;
  gap: 0.2rem 0.5rem;
  font-size: 0.9rem;
  color: var(--p-muted);
}
.guest__table input {
  min-height: 2.6rem;
  padding: 0.3rem 0.5rem;
  text-align: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.guest__state {
  grid-column: 1 / -1;
  min-height: 1em;
  color: var(--p-ok);
  font-size: 0.8rem;
  text-align: right;
}
.guest__error {
  grid-column: 1 / -1;
  font-size: 0.9rem;
}
</style>
