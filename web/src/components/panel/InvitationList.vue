<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useClipboard } from '@/composables/useClipboard'
import {
  deletionWarning,
  filterInvitations,
  invitationProgress,
  parseTable,
} from '@/services/panelService'
import type { PanelDedication, PanelInvitation, TableAssignment } from '@/types/panel'

/**
 * Invitaciones generadas: se despliega al tocar el título (cerrada al entrar, para que el
 * panel se vea limpio). De cada una: para cuántos invitados es, quiénes ya respondieron, su
 * mesa y "Enviar" (la imagen para WhatsApp). El enlace no se muestra: solo "copiar link" o
 * "ver link", discretos. "eliminar" pide confirmarlo ahí mismo: se borra con sus invitados y
 * su dedicatoria, y el enlace deja de abrir.
 */
const props = defineProps<{
  invitations: PanelInvitation[]
  highlight: string | null
  dedications: PanelDedication[]
  assign: (assignments: TableAssignment[]) => Promise<void>
  remove: (id: string) => Promise<void>
}>()
const emit = defineEmits<{ send: [invitation: PanelInvitation] }>()

const open = ref(false)
const revealed = ref<string | null>(null)
// Al generar una nueva, la lista se abre para que se vea.
watch(
  () => props.highlight,
  (id) => {
    if (id) open.value = true
  },
)

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

const confirming = ref<string | null>(null)
const removing = ref<string | null>(null)
const removeError = ref('')
const warning = (inv: PanelInvitation) =>
  deletionWarning(
    inv,
    props.dedications.some((d) => d.invitation === inv.id),
  )

function askRemove(inv: PanelInvitation) {
  confirming.value = inv.id
  removeError.value = ''
}

async function confirmRemove(inv: PanelInvitation) {
  removing.value = inv.id
  removeError.value = ''
  try {
    await props.remove(inv.id)
    confirming.value = null
  } catch (e) {
    removeError.value = e instanceof Error ? e.message : 'No se pudo eliminar.'
  } finally {
    removing.value = null
  }
}

const query = ref('')
const { copied, copy } = useClipboard()
const shown = computed(() => [...filterInvitations(props.invitations, query.value)].reverse()) // las nuevas arriba
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
</script>

<template>
  <section class="p-card list" :class="{ 'is-open': open }">
    <h2 class="list__heading">
      <button
        type="button"
        class="list__toggle"
        :aria-expanded="open"
        aria-controls="list-body"
        @click="open = !open"
      >
        <span>Invitaciones generadas</span>
        <span class="list__count">{{ invitations.length }}</span>
        <span class="list__chevron" aria-hidden="true" />
      </button>
    </h2>

    <div v-show="open" id="list-body" class="list__body">
      <input
        v-if="invitations.length > 3"
        v-model="query"
        type="search"
        class="list__search"
        placeholder="Buscar por nombre o #número"
        aria-label="Buscar invitación"
      />

      <p v-if="!invitations.length" class="p-hint">
        Todavía no hay invitaciones. Genera la primera arriba.
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
            :aria-label="`${invitationProgress(inv).filled} de ${inv.passes} invitados con nombre`"
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
            <span class="item__count"
              >{{ invitationProgress(inv).filled }} de {{ inv.passes }}</span
            >
            <span class="item__meta">
              · {{ inv.opens ? `abierta ${plural(inv.opens, 'vez', 'veces')}` : 'aún no se abre' }}
            </span>
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
            <p v-if="tableError[inv.id]" class="p-error item__seat-error">
              {{ tableError[inv.id] }}
            </p>
          </form>

          <div class="item__actions">
            <button type="button" class="p-button p-button--small" @click="emit('send', inv)">
              Enviar
            </button>
            <button type="button" class="p-link" @click="copy(inv.url, inv.id)">
              {{ copied === inv.id ? '¡Copiado!' : 'copiar link' }}
            </button>
            <button
              type="button"
              class="p-link"
              :aria-expanded="revealed === inv.id"
              @click="revealed = revealed === inv.id ? null : inv.id"
            >
              {{ revealed === inv.id ? 'ocultar link' : 'ver link' }}
            </button>
            <button
              v-if="confirming !== inv.id"
              type="button"
              class="p-link item__remove"
              @click="askRemove(inv)"
            >
              eliminar
            </button>
          </div>
          <div
            v-if="confirming === inv.id"
            class="item__confirm"
            role="alertdialog"
            :aria-labelledby="`remove-${inv.id}`"
          >
            <p :id="`remove-${inv.id}`" class="item__confirm-text">
              ¿Eliminar la invitación #{{ inv.id }}{{ inv.label ? ` (${inv.label})` : '' }}?
              {{ warning(inv) }} El enlace dejará de abrir y no se puede deshacer.
            </p>
            <div class="item__confirm-actions">
              <button
                type="button"
                class="p-button p-button--small item__confirm-yes"
                :disabled="removing === inv.id"
                @click="confirmRemove(inv)"
              >
                {{ removing === inv.id ? 'Eliminando…' : 'Sí, eliminar' }}
              </button>
              <button
                type="button"
                class="p-button p-button--small p-button--ghost"
                :disabled="removing === inv.id"
                @click="confirming = null"
              >
                Cancelar
              </button>
            </div>
            <p v-if="removeError" class="p-error" role="alert">{{ removeError }}</p>
          </div>
          <a
            v-if="revealed === inv.id"
            class="item__url"
            :href="inv.url"
            target="_blank"
            rel="noopener"
            >{{ inv.url }}</a
          >
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.list__heading {
  margin: 0;
}
.list__toggle {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  min-height: 2.9rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--p-text);
  font-family: var(--p-font-title);
  font-size: 1.15rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  text-align: left;
  text-transform: uppercase;
  cursor: pointer;
}
.list__count {
  min-width: 1.9rem;
  padding: 0.05rem 0.55rem;
  border-radius: 999px;
  background: var(--p-soft);
  color: var(--p-accent);
  font-family: var(--p-font-body);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0;
  text-align: center;
}
/* Flecha que gira al abrir. */
.list__chevron {
  width: 0.65rem;
  height: 0.65rem;
  margin-left: auto;
  border-right: 2px solid var(--p-accent);
  border-bottom: 2px solid var(--p-accent);
  transform: translateY(-25%) rotate(45deg);
  transition: transform 0.2s ease;
}
.list.is-open .list__chevron {
  transform: translateY(25%) rotate(225deg);
}
@media (prefers-reduced-motion: reduce) {
  .list__chevron {
    transition: none;
  }
}
.list__body {
  display: grid;
  gap: 0.8rem;
  margin-top: 1rem;
}
.list__search {
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
  gap: 0.55rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--p-line);
  border-radius: 14px;
  background: var(--p-card);
}
.item.is-new {
  border-color: var(--p-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--p-accent) 18%, transparent);
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
  font-size: 1.1rem;
}
.item__passes {
  padding: 0.1rem 0.7rem;
  border-radius: 999px;
  background: var(--p-soft);
  color: var(--p-accent);
  font-size: 0.92rem;
  font-weight: 600;
}
.item__progress {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}
.item__seat {
  width: 0.85rem;
  height: 0.85rem;
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
.item__count,
.item__meta {
  color: var(--p-muted);
  font-size: 0.92rem;
}
.item__count {
  margin-left: 0.3rem;
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
  background: var(--p-soft);
  font-size: 0.8rem;
  font-weight: 600;
}
.item__seat-all {
  display: grid;
  grid-template-columns: auto 5rem auto;
  align-items: center;
  gap: 0.4rem 0.6rem;
  justify-content: start;
  font-size: 0.95rem;
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
.item__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 1.1rem;
  margin-top: 0.2rem;
}
.item__remove {
  margin-left: auto;
}
.item__remove:hover {
  color: var(--p-no);
}
.item__confirm {
  display: grid;
  gap: 0.6rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid color-mix(in srgb, var(--p-no) 40%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--p-no) 6%, var(--p-card));
}
.item__confirm-text {
  margin: 0;
  font-size: 0.95rem;
}
.item__confirm-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.item__confirm-yes {
  border-color: var(--p-no);
  background: var(--p-no);
  box-shadow: none;
}
.item__url {
  overflow-wrap: anywhere;
  color: var(--p-muted);
  font-size: 0.85rem;
}
</style>
