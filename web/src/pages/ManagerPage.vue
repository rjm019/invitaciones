<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import '@/components/manager/manager.css'
import AccountMenu from '@/components/manager/AccountMenu.vue'
import EventCard from '@/components/manager/EventCard.vue'
import GDialog from '@/components/manager/GDialog.vue'
import ManagerIcon from '@/components/manager/ManagerIcon.vue'
import ManagerLogin from '@/components/manager/ManagerLogin.vue'
import NewEventDialog from '@/components/manager/NewEventDialog.vue'
import QuotesDialog from '@/components/manager/QuotesDialog.vue'
import ToastHost from '@/components/manager/ToastHost.vue'
import { useFontSamples } from '@/composables/useFontSamples'
import { useManagerSession } from '@/composables/useManagerSession'
import { usePolling } from '@/composables/usePolling'
import { useToasts } from '@/composables/useToasts'
import {
  groupByTab,
  kindOf,
  needsConfirmation,
  searchEvents,
  type HomeTab,
} from '@/services/managerHomeService'
import * as managerService from '@/services/managerService'
import type { ManagerEvent } from '@/types/design'

/**
 * /gestor — inicio del gestor: las invitaciones, las plantillas y las muestras de la landing
 * (cada una en su pestaña), crear una nueva, duplicar, guardar como plantilla y descargar su
 * paquete. Quien administra ve además las cotizaciones que llegan de la landing, con un
 * contador de las nuevas, y puede eliminar invitaciones, plantillas y muestras (van a la
 * papelera del servidor; una invitación ya compartida pide escribir su dirección).
 */
const router = useRouter()
const { authenticated, isAdmin, setUser, withSession } = useManagerSession()
const { toast } = useToasts()

const events = ref<ManagerEvent[]>([])
const loading = ref(false)
const error = ref('')
const tab = ref<HomeTab>('events')
const search = ref('')
const dialog = ref<{ open: boolean; from: string | null; template: boolean }>({
  open: false,
  from: null,
  template: false,
})

const groups = computed(() => groupByTab(events.value))
const shown = computed(() => searchEvents(groups.value[tab.value], search.value))
// La pestaña de muestras solo aparece si hay muestras.
watch(
  () => groups.value.demos.length,
  (n) => {
    if (!n && tab.value === 'demos') tab.value = 'events'
  },
)

const toDelete = ref<ManagerEvent | null>(null)
const deleting = ref(false)
const typed = ref('')
const deleteKind = computed(() => (toDelete.value ? kindOf(toDelete.value) : 'invitación'))
const mustType = computed(() => !!toDelete.value && needsConfirmation(toDelete.value))
const canConfirm = computed(() => !mustType.value || typed.value.trim() === toDelete.value?.slug)

function askDelete(event: ManagerEvent): void {
  typed.value = ''
  toDelete.value = event
}

async function deleteEvent(): Promise<void> {
  const target = toDelete.value
  if (!target || !canConfirm.value) return
  const kind = kindOf(target)
  deleting.value = true
  try {
    await withSession((t) =>
      managerService.deleteEvent(t, target.slug, mustType.value ? typed.value.trim() : undefined),
    )
    events.value = events.value.filter((e) => e.slug !== target.slug)
    toast(`Se eliminó la ${kind} «${target.title}».`)
    toDelete.value = null
  } catch (e) {
    toast(e instanceof Error ? e.message : `No se pudo eliminar la ${kind}.`, 'error')
  } finally {
    deleting.value = false
  }
}

// Los nombres de las portadas, cada uno en la letra de su invitación.
useFontSamples(
  () => events.value.map((e) => e.cover.font).filter((f): f is string => !!f),
  () => events.value.map((e) => e.celebrant || e.title).join(''),
)

const quotesOpen = ref(false)
const newQuotes = ref(0)

/** Cuántas cotizaciones nuevas hay (solo quien administra; si falla, se deja como estaba). */
async function countQuotes(): Promise<void> {
  if (!isAdmin.value) return
  try {
    newQuotes.value = await withSession((t) => managerService.countQuotes(t))
  } catch {
    // El contador no es crítico.
  }
}
// Cada minuto, mientras la pestaña está a la vista.
usePolling(countQuotes, 60_000, () => authenticated.value && isAdmin.value)

async function load(): Promise<void> {
  loading.value = true
  try {
    const list = await withSession((t) => managerService.listEvents(t))
    events.value = list.events
    // Otra persona pudo cambiar mi nombre o mi rol mientras no estaba: llega con la lista.
    setUser(list.user)
    void countQuotes()
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo cargar la lista.'
  } finally {
    loading.value = false
  }
}

function openNew(from: string | null = null, template = false): void {
  dialog.value = { open: true, from, template }
}

async function download(event: ManagerEvent): Promise<void> {
  try {
    const file = await withSession((t) => managerService.exportDesign(t, event.slug, 'zip'))
    const url = URL.createObjectURL(file.blob)
    Object.assign(document.createElement('a'), { href: url, download: file.name }).click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch (e) {
    toast(e instanceof Error ? e.message : 'No se pudo descargar.', 'error')
  }
}

onMounted(() => {
  document.title = 'Gestor de invitaciones'
  if (authenticated.value) void load()
})
watch(authenticated, (on) => {
  if (on) void load()
  else events.value = []
})
</script>

<template>
  <div class="mgr">
    <ManagerLogin v-if="!authenticated" />

    <div v-else class="home">
      <header class="home__bar">
        <div class="home__brand">
          <span class="home__mark" aria-hidden="true"><ManagerIcon name="envelope" /></span>
          <div>
            <h1>Invitaciones</h1>
            <p>Diseña, publica y comparte</p>
          </div>
        </div>
        <div class="home__actions">
          <button
            v-if="isAdmin"
            type="button"
            class="g-btn g-btn--ghost"
            :aria-label="`Cotizaciones${newQuotes ? `: ${newQuotes} nuevas` : ''}`"
            @click="quotesOpen = true"
          >
            <ManagerIcon name="inbox" /> Cotizaciones
            <span v-if="newQuotes" class="g-badge g-badge--accent" aria-hidden="true">{{
              newQuotes
            }}</span>
          </button>
          <button type="button" class="g-btn g-btn--primary" @click="openNew()">
            <ManagerIcon name="plus" /> Nueva invitación
          </button>
          <AccountMenu />
        </div>
      </header>

      <main class="home__main">
        <div class="home__toolbar">
          <div class="g-segmented" role="tablist" aria-label="Mostrar">
            <button
              type="button"
              role="tab"
              :aria-selected="tab === 'events'"
              :aria-pressed="tab === 'events'"
              @click="tab = 'events'"
            >
              Invitaciones <span class="home__count">{{ groups.events.length }}</span>
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="tab === 'templates'"
              :aria-pressed="tab === 'templates'"
              @click="tab = 'templates'"
            >
              Plantillas <span class="home__count">{{ groups.templates.length }}</span>
            </button>
            <button
              v-if="groups.demos.length"
              type="button"
              role="tab"
              :aria-selected="tab === 'demos'"
              :aria-pressed="tab === 'demos'"
              title="Las muestras que enlaza la landing"
              @click="tab = 'demos'"
            >
              Muestras <span class="home__count">{{ groups.demos.length }}</span>
            </button>
          </div>
          <label class="home__search">
            <ManagerIcon name="magnifying-glass" />
            <span class="g-sr">Buscar</span>
            <input v-model="search" type="search" placeholder="Buscar por nombre o dirección" />
          </label>
        </div>

        <p v-if="error" class="g-note g-note--danger" role="alert">
          <ManagerIcon name="triangle-exclamation" /> {{ error }}
          <button type="button" class="g-btn g-btn--small" @click="load">Reintentar</button>
        </p>

        <p v-if="tab === 'demos' && shown.length" class="home__hint">
          Las muestras que enlaza la landing (<code>/i/Demo…</code>). No guardan confirmaciones ni
          visitas; los cambios que publiques aquí los ven los clientes.
        </p>

        <div v-if="loading && !events.length" class="home__grid" aria-busy="true">
          <div v-for="n in 3" :key="n" class="home__skeleton g-card" />
        </div>

        <div v-else-if="shown.length" class="home__grid">
          <EventCard
            v-for="e in shown"
            :key="e.slug"
            :event="e"
            :can-delete="isAdmin"
            @edit="router.push(`/gestor/${e.slug}`)"
            @use="openNew(e.slug)"
            @duplicate="openNew(e.slug, e.template)"
            @template="openNew(e.slug, true)"
            @download="download(e)"
            @delete="askDelete(e)"
          />
        </div>

        <div v-else class="g-empty g-card">
          <ManagerIcon :name="tab === 'events' ? 'envelope' : 'layer-group'" />
          <template v-if="search">
            <strong>Nada coincide con “{{ search }}”.</strong>
          </template>
          <template v-else-if="tab === 'events'">
            <strong>{{
              isAdmin ? 'Aún no hay invitaciones.' : 'Aún no tienes invitaciones.'
            }}</strong>
            <span v-if="isAdmin">Crea la primera: puedes partir de una plantilla o en blanco.</span>
            <span v-else
              >Crea una (desde una plantilla o en blanco) o pídele a quien administra que te asigne
              alguna.</span
            >
            <button type="button" class="g-btn g-btn--primary" @click="openNew()">
              <ManagerIcon name="plus" /> Nueva invitación
            </button>
          </template>
          <template v-else-if="tab === 'templates'">
            <strong>Aún no hay plantillas.</strong>
            <span>En una invitación, usa “Guardar como plantilla” para reusar su diseño.</span>
          </template>
          <template v-else>
            <strong>Aún no hay muestras.</strong>
          </template>
        </div>
      </main>
    </div>

    <NewEventDialog
      :open="dialog.open"
      :events="events"
      :from="dialog.from"
      :template="dialog.template"
      @close="dialog.open = false"
    />
    <QuotesDialog
      v-if="isAdmin"
      :open="quotesOpen"
      @close="quotesOpen = false"
      @changed="newQuotes = $event"
    />
    <GDialog
      :open="!!toDelete"
      :title="`¿Eliminar esta ${deleteKind}?`"
      size="sm"
      :dismissable="!deleting"
      @close="toDelete = null"
    >
      <template v-if="toDelete">
        <p v-if="toDelete.template">
          «{{ toDelete.title }}» deja de aparecer en el gestor. Las invitaciones que ya se hicieron
          con ella no cambian.
        </p>
        <template v-else>
          <p>
            «{{ toDelete.title }}» deja de aparecer en el gestor y
            <strong>sus enlaces dejan de abrir</strong>: la invitación general, las personales y el
            panel del cliente.
          </p>
          <ul v-if="mustType" class="home__loses">
            <li v-if="toDelete.published">Está visible: hoy la pueden abrir los invitados.</li>
            <li v-if="toDelete.counts?.invitations">
              {{ toDelete.counts.invitations }}
              {{ toDelete.counts.invitations === 1 ? 'enlace generado' : 'enlaces generados' }}
            </li>
            <li v-if="toDelete.counts?.guests">
              {{ toDelete.counts.guests }}
              {{ toDelete.counts.guests === 1 ? 'persona respondió' : 'personas respondieron' }}
              ({{ toDelete.counts.attending }} confirmadas)
            </li>
          </ul>
        </template>
        <p class="home__trash-note">
          En el servidor queda una copia completa en la papelera, por si hace falta recuperarla.
        </p>
        <label v-if="mustType" class="home__type-confirm">
          Para confirmar, escribe su dirección: <code>{{ toDelete.slug }}</code>
          <input
            v-model="typed"
            type="text"
            class="g-input"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :aria-label="`Escribe ${toDelete.slug} para confirmar`"
            @keydown.enter.prevent="deleteEvent"
          />
        </label>
      </template>
      <template #footer>
        <button type="button" class="g-btn" :disabled="deleting" @click="toDelete = null">
          Cancelar
        </button>
        <button
          type="button"
          class="g-btn g-btn--danger"
          :disabled="deleting || !canConfirm"
          @click="deleteEvent"
        >
          <ManagerIcon name="trash-can" /> {{ deleting ? 'Eliminando…' : 'Eliminar' }}
        </button>
      </template>
    </GDialog>
    <ToastHost />
  </div>
</template>

<style scoped>
.home__bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px clamp(16px, 4vw, 40px);
  border-bottom: 1px solid var(--g-line);
  background: rgb(255 255 255 / 0.86);
  backdrop-filter: saturate(160%) blur(12px);
}
.home__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.home__brand h1 {
  font-size: 18px;
  font-weight: 800;
}
.home__brand p {
  color: var(--g-faint);
  font-size: 12.5px;
}
.home__mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #fff;
}
.home__actions {
  display: flex;
  gap: 8px;
}
.home__main {
  display: grid;
  gap: 18px;
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px clamp(16px, 4vw, 40px) 64px;
}
.home__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.home__count {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--g-surface-3);
  color: var(--g-muted);
  font-size: 11px;
}
.home__hint {
  margin-top: -6px;
  color: var(--g-muted);
  font-size: 13px;
}
.home__loses {
  margin: 10px 0 0;
  padding-left: 18px;
  color: var(--g-danger);
  font-size: 13.5px;
}
.home__trash-note {
  margin-top: 10px;
  color: var(--g-muted);
  font-size: 13px;
}
.home__type-confirm {
  display: grid;
  gap: 6px;
  margin-top: 14px;
  font-size: 13.5px;
}
.home__type-confirm code {
  font-weight: 700;
}
.home__search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(320px, 100%);
  padding: 0 12px;
  border: 1px solid var(--g-line-strong);
  border-radius: 10px;
  background: var(--g-surface);
  color: var(--g-faint);
}
.home__search:focus-within {
  border-color: var(--g-accent);
  box-shadow: 0 0 0 3px var(--g-accent-soft);
}
.home__search input {
  flex: 1;
  min-height: 38px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--g-text);
}
.home__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.home__skeleton {
  height: 270px;
  background: linear-gradient(
    90deg,
    var(--g-surface) 0%,
    var(--g-surface-2) 50%,
    var(--g-surface) 100%
  );
}
@media (max-width: 560px) {
  .home__bar {
    flex-wrap: wrap;
  }
  .home__brand p {
    display: none;
  }
}
</style>
