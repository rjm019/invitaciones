<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DeadlineCard from '@/components/panel/DeadlineCard.vue'
import DedicationList from '@/components/panel/DedicationList.vue'
import GuestList from '@/components/panel/GuestList.vue'
import InvitationCreator from '@/components/panel/InvitationCreator.vue'
import InvitationList from '@/components/panel/InvitationList.vue'
import PanelLogin from '@/components/panel/PanelLogin.vue'
import { usePanel } from '@/composables/usePanel'
import { usePolling } from '@/composables/usePolling'
import { deadlineBounds } from '@/services/panelService'
import type { PanelInvitation } from '@/types/panel'

/** /panel/:slug — panel del dueño del evento: entra con la clave del layout. */
const props = defineProps<{ slug: string }>()
const panel = usePanel(props.slug)
const { token, overview, loading, error, live } = panel

// En vivo: cada 5 s pregunta si hay algo nuevo (alguien abrió o confirmó) y solo entonces recarga.
usePolling(
  () => panel.checkForChanges(),
  5000,
  () => !!token.value && !!overview.value,
)

const tab = ref<'invitations' | 'guests' | 'dedications'>('invitations')
const highlight = ref<string | null>(null)
const bounds = computed(() =>
  overview.value ? deadlineBounds(overview.value) : { min: '', max: null },
)
const title = computed(() => overview.value?.event.title || props.slug)

function onCreated(invitation: PanelInvitation) {
  highlight.value = invitation.id
}

onMounted(() => {
  document.title = 'Panel de invitaciones'
  if (token.value) void panel.refresh()
})
</script>

<template>
  <div class="panel">
    <PanelLogin v-if="!token" :title="slug" :notice="error" :login="panel.login" />

    <template v-else>
      <header class="panel__header">
        <div>
          <p class="panel__kicker">Panel de invitaciones</p>
          <h1 class="panel__title">{{ title }}</h1>
        </div>
        <div class="panel__session">
          <span class="panel__live" :class="`is-${live}`" role="status">
            {{ live === 'offline' ? 'Sin conexión' : 'En vivo' }}
          </span>
          <button
            type="button"
            class="p-button p-button--small p-button--ghost"
            @click="panel.logout()"
          >
            Salir
          </button>
        </div>
      </header>

      <p v-if="loading && !overview" class="p-hint">Cargando…</p>
      <p v-if="error" class="p-error" role="alert">{{ error }}</p>

      <template v-if="overview">
        <p v-if="!overview.event.published" class="panel__draft">
          El evento no está publicado: los enlaces todavía no abren para tus invitados.
        </p>

        <dl class="panel__summary">
          <div>
            <dt>Invitaciones</dt>
            <dd>{{ overview.summary.invitations }}</dd>
          </div>
          <div>
            <dt>Lugares</dt>
            <dd>{{ overview.summary.seats }}</dd>
          </div>
          <div class="is-ok">
            <dt>Asistirán</dt>
            <dd>{{ overview.summary.attending }}</dd>
          </div>
          <div class="is-no">
            <dt>No asistirán</dt>
            <dd>{{ overview.summary.declined }}</dd>
          </div>
          <div>
            <dt>Sin llenar</dt>
            <dd>{{ overview.summary.empty }}</dd>
          </div>
        </dl>

        <div class="panel__tabs" role="tablist" aria-label="Vistas del panel">
          <button
            id="tab-invitations"
            type="button"
            role="tab"
            class="panel__tab"
            :aria-selected="tab === 'invitations'"
            aria-controls="view-invitations"
            @click="tab = 'invitations'"
          >
            Invitaciones ({{ overview.summary.invitations }})
          </button>
          <button
            id="tab-guests"
            type="button"
            role="tab"
            class="panel__tab"
            :aria-selected="tab === 'guests'"
            aria-controls="view-guests"
            @click="tab = 'guests'"
          >
            Invitados ({{ overview.summary.attending + overview.summary.declined }})
          </button>
          <button
            id="tab-dedications"
            type="button"
            role="tab"
            class="panel__tab"
            :aria-selected="tab === 'dedications'"
            aria-controls="view-dedications"
            @click="tab = 'dedications'"
          >
            Dedicatorias ({{ overview.dedications.length }})
          </button>
        </div>

        <div
          v-show="tab === 'invitations'"
          id="view-invitations"
          role="tabpanel"
          aria-labelledby="tab-invitations"
        >
          <div class="panel__tools">
            <InvitationCreator
              :max-passes="overview.max_passes"
              :create="panel.create"
              @created="onCreated"
            />
            <DeadlineCard :rsvp="overview.rsvp" :bounds="bounds" :change="panel.changeDeadline" />
          </div>
          <InvitationList
            :invitations="overview.invitations"
            :highlight="highlight"
            :assign="panel.assignTables"
          />
        </div>

        <div
          v-show="tab === 'guests'"
          id="view-guests"
          role="tabpanel"
          aria-labelledby="tab-guests"
        >
          <GuestList :invitations="overview.invitations" :assign="panel.assignTables" />
        </div>

        <div
          v-show="tab === 'dedications'"
          id="view-dedications"
          role="tabpanel"
          aria-labelledby="tab-dedications"
        >
          <DedicationList :dedications="overview.dedications" :timezone="overview.event.timezone" />
        </div>
      </template>
    </template>
  </div>
</template>

<style>
/* Estilos del panel (no usan el tema de la invitación). Sin scoped: los comparten sus componentes. */
.panel {
  --p-bg: #f6f4ef;
  --p-card: #ffffff;
  --p-text: #2d2a26;
  --p-muted: #6b655c;
  --p-line: #e2ddd2;
  --p-accent: #7a5c1e;
  --p-ok: #2f7d4f;
  --p-no: #a2483a;
  min-height: 100vh;
  padding: 1rem 1rem 3rem;
  background: var(--p-bg);
  color: var(--p-text);
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    sans-serif;
  font-size: 1rem;
  line-height: 1.45;
}
.panel input[type='text'],
.panel input[type='search'],
.panel input[type='number'],
.panel input[type='password'],
.panel input[type='date'],
.panel input:not([type]) {
  width: 100%;
  min-height: 2.9rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--p-line);
  border-radius: 8px;
  background: var(--p-card);
  color: var(--p-text);
  font: inherit;
  font-size: 1.05rem;
}
.panel input:focus-visible,
.panel button:focus-visible,
.panel a:focus-visible {
  outline: 2px solid var(--p-accent);
  outline-offset: 2px;
}
.panel input[aria-invalid='true'] {
  border-color: var(--p-no);
}
.p-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.9rem;
  padding: 0.5rem 1.1rem;
  border: 1px solid var(--p-accent);
  border-radius: 8px;
  background: var(--p-accent);
  color: #fff;
  font: inherit;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
.p-button:disabled {
  opacity: 0.6;
  cursor: progress;
}
.p-button--small {
  min-height: 2.6rem;
  padding: 0.35rem 0.9rem;
  font-size: 0.95rem;
}
.p-button--ghost {
  background: transparent;
  color: var(--p-accent);
}
.p-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.p-card {
  padding: 1.2rem;
  border: 1px solid var(--p-line);
  border-radius: 14px;
  background: var(--p-card);
}
.p-card__title {
  margin: 0 0 0.8rem;
  font-size: 1.15rem;
}
.p-hint {
  margin: 0;
  color: var(--p-muted);
  font-size: 0.92rem;
}
.p-error {
  margin: 0;
  color: var(--p-no);
}
.p-chip {
  padding: 0.05rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}
.p-chip--ok {
  background: #e3f2e8;
  color: var(--p-ok);
}
.p-chip--no {
  background: #f6e3df;
  color: var(--p-no);
}

.panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  max-width: 70rem;
  margin: 0 auto 1rem;
}
.panel__session {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
.panel__live {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--p-muted);
  font-size: 0.85rem;
}
.panel__live::before {
  content: '';
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--p-line);
}
.panel__live.is-live::before {
  background: var(--p-ok);
  animation: panel-live 2s ease-in-out infinite;
}
.panel__live.is-offline::before {
  background: var(--p-no);
}
@keyframes panel-live {
  50% {
    opacity: 0.35;
  }
}
@media (prefers-reduced-motion: reduce) {
  .panel__live.is-live::before {
    animation: none;
  }
}
.panel__tabs {
  display: flex;
  gap: 0.3rem;
  max-width: 70rem;
  margin: 0 auto 1rem;
  border-bottom: 1px solid var(--p-line);
}
.panel__tab {
  min-height: 2.9rem;
  padding: 0.4rem 1rem;
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  color: var(--p-muted);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.panel__tab[aria-selected='true'] {
  border-bottom-color: var(--p-accent);
  color: var(--p-text);
}
.panel .guests {
  max-width: 70rem;
  margin: 0 auto;
}
.panel__kicker {
  margin: 0;
  color: var(--p-muted);
  font-size: 0.9rem;
}
.panel__title {
  margin: 0;
  font-size: 1.5rem;
}
.panel__draft {
  max-width: 70rem;
  margin: 0 auto 1rem;
  padding: 0.7rem 0.9rem;
  border-radius: 10px;
  background: #fff4e5;
  color: #7a4b00;
}
.panel__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: 0.6rem;
  max-width: 70rem;
  margin: 0 auto 1rem;
}
.panel__summary div {
  padding: 0.8rem 1rem;
  border: 1px solid var(--p-line);
  border-radius: 12px;
  background: var(--p-card);
}
.panel__summary dt {
  color: var(--p-muted);
  font-size: 0.88rem;
}
.panel__summary dd {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.panel__summary .is-ok dd {
  color: var(--p-ok);
}
.panel__summary .is-no dd {
  color: var(--p-no);
}
.panel__tools {
  display: grid;
  gap: 1rem;
  max-width: 70rem;
  margin: 0 auto 1rem;
}
.panel .list {
  max-width: 70rem;
  margin: 0 auto;
}
/* Computadora: generador y fecha lado a lado. */
@media (min-width: 52rem) {
  .panel {
    padding: 2rem 2rem 4rem;
  }
  .panel__tools {
    grid-template-columns: 1.2fr 1fr;
    align-items: start;
  }
}
</style>
