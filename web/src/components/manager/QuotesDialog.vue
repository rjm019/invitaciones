<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useManagerSession } from '@/composables/useManagerSession'
import { useToasts } from '@/composables/useToasts'
import * as managerService from '@/services/managerService'
import {
  filterQuotes,
  formatPhone,
  QUOTE_STATUSES,
  QUOTE_TYPES,
  whatsappLink,
  type QuoteFilter,
} from '@/services/quoteAdminService'
import type { Quote, QuoteStatus } from '@/types/design'
import GDialog from './GDialog.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Cotizaciones que llegan desde la landing (solo quien administra): escribirle por
 * WhatsApp, marcar en qué va, dejar una nota, descargarlas en CSV y borrar una si la persona
 * pide que se borren sus datos.
 */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; changed: [newCount: number] }>()
const { withSession } = useManagerSession()
const { toast } = useToasts()

const quotes = ref<Quote[]>([])
const loading = ref(false)
const error = ref('')
const filter = ref<QuoteFilter>('open')
const search = ref('')
const notes = ref<Record<string, string>>({})
const busy = ref<string | null>(null)
const confirmDelete = ref<string | null>(null)

const shown = computed(() => filterQuotes(quotes.value, filter.value, search.value))
const newCount = computed(() => quotes.value.filter((q) => q.status === 'nueva').length)
const openCount = computed(() => filterQuotes(quotes.value, 'open').length)

const dateFmt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
const dayFmt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' })
const when = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : '')
const day = (ymd: string) => dayFmt.format(new Date(`${ymd}T00:00:00Z`))

async function load(): Promise<void> {
  loading.value = true
  try {
    const data = await withSession((t) => managerService.listQuotes(t))
    quotes.value = data.quotes
    notes.value = Object.fromEntries(data.quotes.map((q) => [q.id, q.note ?? '']))
    error.value = ''
    emit('changed', data.new)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudieron cargar las cotizaciones.'
  } finally {
    loading.value = false
  }
}

function replace(updated: Quote): void {
  quotes.value = quotes.value.map((q) => (q.id === updated.id ? updated : q))
  emit('changed', newCount.value)
}

async function setStatus(quote: Quote, status: QuoteStatus): Promise<void> {
  if (status === quote.status) return
  busy.value = quote.id
  try {
    replace(await withSession((t) => managerService.updateQuote(t, quote.id, { status })))
  } catch (e) {
    toast(e instanceof Error ? e.message : 'No se pudo guardar.', 'error')
  } finally {
    busy.value = null
  }
}

async function saveNote(quote: Quote): Promise<void> {
  const note = (notes.value[quote.id] ?? '').trim()
  if (note === (quote.note ?? '')) return
  busy.value = quote.id
  try {
    replace(await withSession((t) => managerService.updateQuote(t, quote.id, { note })))
    toast('Nota guardada.', 'ok')
  } catch (e) {
    toast(e instanceof Error ? e.message : 'No se pudo guardar la nota.', 'error')
  } finally {
    busy.value = null
  }
}

/** Al escribirle por WhatsApp, una nueva pasa sola a "contactada". */
function contacted(quote: Quote): void {
  if (quote.status === 'nueva') void setStatus(quote, 'contactada')
}

async function remove(quote: Quote): Promise<void> {
  busy.value = quote.id
  try {
    await withSession((t) => managerService.deleteQuote(t, quote.id))
    quotes.value = quotes.value.filter((q) => q.id !== quote.id)
    confirmDelete.value = null
    emit('changed', newCount.value)
    toast('Cotización borrada.', 'ok')
  } catch (e) {
    toast(e instanceof Error ? e.message : 'No se pudo borrar.', 'error')
  } finally {
    busy.value = null
  }
}

async function download(): Promise<void> {
  try {
    const blob = await withSession((t) => managerService.exportQuotes(t))
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: 'cotizaciones.csv' }).click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch (e) {
    toast(e instanceof Error ? e.message : 'No se pudo descargar.', 'error')
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) void load()
    else confirmDelete.value = null
  },
  { immediate: true },
)
</script>

<template>
  <GDialog :open="open" title="Cotizaciones" size="lg" @close="emit('close')">
    <div class="quotes">
      <div class="quotes__bar">
        <div class="g-segmented" role="tablist" aria-label="Mostrar">
          <button
            type="button"
            role="tab"
            :aria-selected="filter === 'open'"
            :aria-pressed="filter === 'open'"
            @click="filter = 'open'"
          >
            En curso ({{ openCount }})
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="filter === 'nueva'"
            :aria-pressed="filter === 'nueva'"
            @click="filter = 'nueva'"
          >
            Nuevas ({{ newCount }})
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="filter === 'all'"
            :aria-pressed="filter === 'all'"
            @click="filter = 'all'"
          >
            Todas ({{ quotes.length }})
          </button>
        </div>
        <input
          v-model="search"
          class="g-input quotes__search"
          type="search"
          placeholder="Buscar por nombre, idea o teléfono"
          aria-label="Buscar cotización"
        />
        <button
          type="button"
          class="g-btn g-btn--ghost"
          :disabled="!quotes.length"
          @click="download"
        >
          <ManagerIcon name="file-csv" /> Descargar
        </button>
      </div>

      <p v-if="error" class="g-note g-note--danger" role="alert">{{ error }}</p>
      <p v-else-if="loading && !quotes.length" class="g-help">Cargando…</p>
      <div v-else-if="!shown.length" class="g-empty quotes__empty">
        <ManagerIcon name="inbox" />
        <p v-if="!quotes.length">
          Aún no llegan cotizaciones. Cuando alguien deje su WhatsApp en la página, aparece aquí (y
          te llega un correo si está configurado).
        </p>
        <p v-else>Ninguna cotización en esta vista.</p>
      </div>

      <ul v-else class="quotes__list" :aria-busy="loading">
        <li v-for="q in shown" :key="q.id" class="g-card quote" :class="`is-${q.status}`">
          <div class="quote__head">
            <div class="quote__who">
              <strong>{{ q.name ?? 'Sin nombre' }}</strong>
              <span>{{ formatPhone(q.phone) }} · {{ QUOTE_TYPES[q.type] }}</span>
            </div>
            <span v-if="q.status === 'nueva'" class="g-badge g-badge--accent">Nueva</span>
            <a
              class="g-btn g-btn--primary g-btn--small"
              :href="whatsappLink(q)"
              target="_blank"
              rel="noopener"
              @click="contacted(q)"
            >
              <ManagerIcon name="whatsapp" /> Escribirle
            </a>
          </div>

          <dl class="quote__facts">
            <div>
              <dt>Llegó</dt>
              <dd>{{ when(q.created_at) }}</dd>
            </div>
            <div v-if="q.event_date">
              <dt>Evento</dt>
              <dd>{{ day(q.event_date) }}</dd>
            </div>
            <div v-if="q.page">
              <dt>Desde</dt>
              <dd>{{ q.page }}</dd>
            </div>
          </dl>
          <p v-if="q.idea" class="quote__idea">{{ q.idea }}</p>

          <div class="quote__work">
            <div class="g-field">
              <label class="g-label" :for="`quote-status-${q.id}`">En qué va</label>
              <select
                :id="`quote-status-${q.id}`"
                class="g-select"
                :value="q.status"
                :disabled="busy === q.id"
                @change="setStatus(q, ($event.target as HTMLSelectElement).value as QuoteStatus)"
              >
                <option v-for="s in QUOTE_STATUSES" :key="s.value" :value="s.value">
                  {{ s.label }}
                </option>
              </select>
            </div>
            <div class="g-field g-grow">
              <label class="g-label" :for="`quote-note-${q.id}`">Nota</label>
              <textarea
                :id="`quote-note-${q.id}`"
                v-model="notes[q.id]"
                class="g-textarea"
                rows="2"
                maxlength="600"
                placeholder="Qué le cotizaste, cuándo volver a escribirle…"
                @blur="saveNote(q)"
              />
            </div>
          </div>

          <div class="quote__foot">
            <span v-if="q.handled_by" class="g-help">
              Atendió {{ q.handled_by }} · {{ when(q.updated_at) }}
            </span>
            <template v-if="confirmDelete === q.id">
              <span class="g-help">¿Borrar sus datos? No se puede deshacer.</span>
              <button
                type="button"
                class="g-btn g-btn--danger g-btn--small"
                :disabled="busy === q.id"
                @click="remove(q)"
              >
                Sí, borrar
              </button>
              <button
                type="button"
                class="g-btn g-btn--ghost g-btn--small"
                @click="confirmDelete = null"
              >
                Cancelar
              </button>
            </template>
            <button
              v-else
              type="button"
              class="g-btn g-btn--ghost g-btn--small quote__delete"
              title="Si la persona pide que se borren sus datos"
              @click="confirmDelete = q.id"
            >
              <ManagerIcon name="trash-can" /> Borrar
            </button>
          </div>
        </li>
      </ul>
    </div>
  </GDialog>
</template>

<style scoped>
.quotes {
  display: grid;
  gap: 14px;
}
.quotes__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.quotes__search {
  flex: 1 1 200px;
}
.quotes__empty {
  text-align: center;
}
.quotes__list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.quote {
  display: grid;
  gap: 10px;
}
.quote.is-cerrada,
.quote.is-descartada {
  opacity: 0.72;
}
.quote__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.quote__who {
  display: grid;
  flex: 1 1 200px;
}
.quote__who span {
  color: var(--g-muted);
  font-size: 13px;
}
.quote__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  margin: 0;
  font-size: 13px;
}
.quote__facts div {
  display: flex;
  gap: 6px;
}
.quote__facts dt {
  color: var(--g-muted);
}
.quote__facts dd {
  margin: 0;
}
.quote__idea {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--g-accent-soft);
  white-space: pre-line;
  font-size: 14px;
}
.quote__work {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-start;
}
.quote__work .g-field:first-child {
  flex: 0 0 160px;
}
.quote__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.quote__delete {
  margin-left: auto;
}
</style>
