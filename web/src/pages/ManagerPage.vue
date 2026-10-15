<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import '@/components/manager/manager.css'
import AccountMenu from '@/components/manager/AccountMenu.vue'
import EventCard from '@/components/manager/EventCard.vue'
import ManagerIcon from '@/components/manager/ManagerIcon.vue'
import ManagerLogin from '@/components/manager/ManagerLogin.vue'
import NewEventDialog from '@/components/manager/NewEventDialog.vue'
import ToastHost from '@/components/manager/ToastHost.vue'
import { useFontSamples } from '@/composables/useFontSamples'
import { useManagerSession } from '@/composables/useManagerSession'
import { useToasts } from '@/composables/useToasts'
import * as managerService from '@/services/managerService'
import type { ManagerEvent } from '@/types/design'

/**
 * /gestor — inicio del gestor: las invitaciones y las plantillas, crear una nueva,
 * duplicar, guardar como plantilla y descargar su paquete.
 */
const router = useRouter()
const { authenticated, isAdmin, refresh, withSession } = useManagerSession()
const { toast } = useToasts()

const events = ref<ManagerEvent[]>([])
const loading = ref(false)
const error = ref('')
const tab = ref<'events' | 'templates'>('events')
const search = ref('')
const dialog = ref<{ open: boolean; from: string | null; template: boolean }>({
  open: false,
  from: null,
  template: false,
})

const own = computed(() => events.value.filter((e) => !e.template))
const templates = computed(() => events.value.filter((e) => e.template))
const shown = computed(() => {
  const list = tab.value === 'events' ? own.value : templates.value
  const q = search.value.trim().toLowerCase()
  return q
    ? list.filter((e) => `${e.title} ${e.slug} ${e.celebrant ?? ''}`.toLowerCase().includes(q))
    : list
})

// Los nombres de las portadas, cada uno en la letra de su invitación.
useFontSamples(
  () => events.value.map((e) => e.cover.font).filter((f): f is string => !!f),
  () => events.value.map((e) => e.celebrant || e.title).join(''),
)

async function load(): Promise<void> {
  loading.value = true
  try {
    events.value = await withSession((t) => managerService.listEvents(t))
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
  if (authenticated.value) {
    void load()
    // Otra persona pudo cambiar mi nombre o mi rol mientras no estaba.
    refresh().catch(() => {})
  }
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
              Invitaciones <span class="home__count">{{ own.length }}</span>
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="tab === 'templates'"
              :aria-pressed="tab === 'templates'"
              @click="tab = 'templates'"
            >
              Plantillas <span class="home__count">{{ templates.length }}</span>
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

        <div v-if="loading && !events.length" class="home__grid" aria-busy="true">
          <div v-for="n in 3" :key="n" class="home__skeleton g-card" />
        </div>

        <div v-else-if="shown.length" class="home__grid">
          <EventCard
            v-for="e in shown"
            :key="e.slug"
            :event="e"
            @edit="router.push(`/gestor/${e.slug}`)"
            @use="openNew(e.slug)"
            @duplicate="openNew(e.slug, e.template)"
            @template="openNew(e.slug, true)"
            @download="download(e)"
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
          <template v-else>
            <strong>Aún no hay plantillas.</strong>
            <span>En una invitación, usa “Guardar como plantilla” para reusar su diseño.</span>
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
