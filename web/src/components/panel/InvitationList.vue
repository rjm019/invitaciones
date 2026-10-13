<script setup lang="ts">
import { computed, ref } from 'vue'
import { useClipboard } from '@/composables/useClipboard'
import { filterInvitations, invitationProgress, parseTable } from '@/services/panelService'
import type { PanelInvitation, TableAssignment } from '@/types/panel'

/**
 * Lista completa de enlaces generados: para cuántos invitados es cada uno, quiénes ya
 * están y su mesa. "Mesa para todos" sienta de una vez a los que asisten de esa invitación.
 */
const props = defineProps<{
  invitations: PanelInvitation[]
  highlight: string | null
  assign: (assignments: TableAssignment[]) => Promise<void>
}>()

const tableDraft = ref<Record<string, string>>({})
const tableError = ref<Record<string, string>>({})
const tableSaving = ref<string | null>(null)

async function seatAll(inv: PanelInvitation) {
  const table = parseTable(tableDraft.value[inv.id] ?? '')
  tableError.value = { ...tableError.value, [inv.id]: '' }
  if (table === undefined || table === null) {
    tableError.value = { ...tableError.value, [inv.id]: 'Escribe un número de mesa de 1 a 999.' }
    return
  }
  tableSaving.value = inv.id
  try {
    await props.assign(
      inv.guests
        .filter((g) => g.attending)
        .map((g) => ({ invitation: inv.id, slot: g.slot, table })),
    )
    tableDraft.value = { ...tableDraft.value, [inv.id]: '' }
  } catch (e) {
    tableError.value = {
      ...tableError.value,
      [inv.id]: e instanceof Error ? e.message : 'No se pudo guardar.',
    }
  } finally {
    tableSaving.value = null
  }
}

const query = ref('')
const { copied, copy } = useClipboard()
const shown = computed(() => [...filterInvitations(props.invitations, query.value)].reverse()) // las nuevas arriba
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
</script>

<template>
  <section class="p-card list" aria-labelledby="list-title">
    <div class="list__head">
      <h2 id="list-title" class="p-card__title">
        Invitaciones generadas ({{ invitations.length }})
      </h2>
      <input
        v-if="invitations.length > 3"
        v-model="query"
        type="search"
        class="list__search"
        placeholder="Buscar por nombre o #número"
        aria-label="Buscar invitación"
      />
    </div>

    <p v-if="!invitations.length" class="p-hint">
      Todavía no hay enlaces. Genera el primero arriba.
    </p>
    <p v-else-if="!shown.length" class="p-hint">Ninguna invitación coincide con «{{ query }}».</p>

    <ol class="list__items">
      <li
        v-for="inv in shown"
        :key="inv.id"
        class="item"
        :class="{ 'is-new': inv.id === highlight }"
      >
        <div class="item__head">
          <span class="item__id">#{{ inv.id }}</span>
          <strong class="item__label">{{ inv.label ?? 'Sin nombre' }}</strong>
          <span class="item__passes">{{ plural(inv.passes, 'invitado', 'invitados') }}</span>
        </div>

        <div
          class="item__progress"
          :aria-label="`${invitationProgress(inv).filled} de ${inv.passes} lugares con nombre`"
        >
          <span
            v-for="n in inv.passes"
            :key="n"
            class="item__seat"
            :class="{
              'is-yes': inv.guests.find((g) => g.slot === n)?.attending === true,
              'is-no': inv.guests.find((g) => g.slot === n)?.attending === false,
            }"
          />
          <span class="item__count">{{ invitationProgress(inv).filled }} de {{ inv.passes }}</span>
        </div>

        <ul v-if="inv.guests.length" class="item__guests">
          <li v-for="g in inv.guests" :key="g.slot">
            {{ g.full_name }}
            <span class="p-chip" :class="g.attending ? 'p-chip--ok' : 'p-chip--no'">{{
              g.attending ? 'Asistirá' : 'No asistirá'
            }}</span>
            <span v-if="g.table" class="item__table">Mesa {{ g.table }}</span>
          </li>
        </ul>

        <form
          v-if="invitationProgress(inv).attending"
          class="item__seat-all"
          @submit.prevent="seatAll(inv)"
        >
          <label :for="`seat-${inv.id}`">Mesa para todos</label>
          <input
            :id="`seat-${inv.id}`"
            v-model="tableDraft[inv.id]"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="3"
            placeholder="Núm."
            :aria-invalid="!!tableError[inv.id]"
          />
          <button
            type="submit"
            class="p-button p-button--small p-button--ghost"
            :disabled="tableSaving === inv.id"
          >
            {{ tableSaving === inv.id ? 'Guardando…' : 'Asignar' }}
          </button>
          <p v-if="tableError[inv.id]" class="p-error item__seat-error">{{ tableError[inv.id] }}</p>
        </form>

        <div class="item__link">
          <input
            :value="inv.url"
            readonly
            :aria-label="`Enlace de la invitación ${inv.id}`"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <div class="p-actions">
            <button type="button" class="p-button p-button--small" @click="copy(inv.url, inv.id)">
              {{ copied === inv.id ? '¡Copiado!' : 'Copiar' }}
            </button>
            <a
              class="p-button p-button--small p-button--ghost"
              :href="inv.whatsapp_url"
              target="_blank"
              rel="noopener"
              >WhatsApp</a
            >
            <a
              class="p-button p-button--small p-button--ghost"
              :href="inv.url"
              target="_blank"
              rel="noopener"
              >Ver</a
            >
          </div>
        </div>
        <p class="item__meta">
          {{ inv.opens ? `Abierta ${plural(inv.opens, 'vez', 'veces')}` : 'Aún no se abre' }}
        </p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.list__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}
.list__head .p-card__title {
  margin: 0;
}
.list__search {
  flex: 1 1 14rem;
  max-width: 22rem;
}
.list__items {
  display: grid;
  gap: 0.8rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  display: grid;
  gap: 0.6rem;
  padding: 1rem;
  border: 1px solid var(--p-line);
  border-radius: 10px;
}
.item.is-new {
  border-color: var(--p-ok);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--p-ok) 25%, transparent);
}
.item__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
}
.item__id {
  color: var(--p-muted);
  font-variant-numeric: tabular-nums;
}
.item__label {
  flex: 1;
}
.item__passes {
  padding: 0.1rem 0.6rem;
  border-radius: 999px;
  background: var(--p-bg);
  font-weight: 600;
}
.item__progress {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}
.item__seat {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid var(--p-line);
  border-radius: 50%;
}
.item__seat.is-yes {
  border-color: var(--p-ok);
  background: var(--p-ok);
}
.item__seat.is-no {
  border-color: var(--p-no);
  background: var(--p-no);
}
.item__count {
  margin-left: 0.3rem;
  color: var(--p-muted);
  font-size: 0.9rem;
}
.item__guests {
  display: grid;
  gap: 0.3rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.item__guests li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}
.item__table {
  padding: 0.05rem 0.5rem;
  border-radius: 6px;
  background: var(--p-bg);
  font-size: 0.8rem;
  font-weight: 600;
}
.item__seat-all {
  display: grid;
  grid-template-columns: auto 5rem auto;
  align-items: center;
  gap: 0.4rem 0.6rem;
  justify-content: start;
  font-size: 0.92rem;
}
.item__seat-all input {
  min-height: 2.6rem;
  text-align: center;
  font-weight: 700;
}
.item__seat-error {
  grid-column: 1 / -1;
  font-size: 0.9rem;
}
.item__link {
  display: grid;
  gap: 0.5rem;
}
.item__link input {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
}
.item__meta {
  margin: 0;
  color: var(--p-muted);
  font-size: 0.85rem;
}
</style>
