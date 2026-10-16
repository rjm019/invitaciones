<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import DeadlineCard from '@/components/panel/DeadlineCard.vue'
import DedicationList from '@/components/panel/DedicationList.vue'
import GuestList from '@/components/panel/GuestList.vue'
import InvitationCreator from '@/components/panel/InvitationCreator.vue'
import InvitationList from '@/components/panel/InvitationList.vue'
import PanelLogin from '@/components/panel/PanelLogin.vue'
import ShareDialog from '@/components/panel/ShareDialog.vue'
import { usePanel } from '@/composables/usePanel'
import { usePanelTheme } from '@/composables/usePanelTheme'
import { usePolling } from '@/composables/usePolling'
import { isDarkPalette } from '@/services/colorService'
import { deadlineBounds } from '@/services/panelService'
import type { PanelInvitation } from '@/types/panel'

/**
 * /panel/:slug — panel del dueño del evento: entra con la clave del layout. Se ve con los
 * colores y las letras de su invitación (el azul es lo principal) y su título ("XV de Nat").
 */
const props = defineProps<{ slug: string }>()
const panel = usePanel(props.slug)
const { token, overview, brand, loading, error, live } = panel
const { theme, fonts } = usePanelTheme(brand)
// Una invitación de fondo negro (Nueva York): el panel también va en oscuro.
const dark = computed(() => isDarkPalette(brand.value?.palette ?? {}, theme.value?.dark))

// En vivo: cada 5 s pregunta si hay algo nuevo (alguien abrió o confirmó) y solo entonces recarga.
usePolling(
  () => panel.checkForChanges(),
  5000,
  () => !!token.value && !!overview.value,
)

const tab = ref<'invitations' | 'guests' | 'dedications'>('invitations')
const highlight = ref<string | null>(null)
const sending = ref<PanelInvitation | null>(null)
const bounds = computed(() =>
  overview.value ? deadlineBounds(overview.value) : { min: '', max: null },
)
const title = computed(() => brand.value?.title || overview.value?.event.title || props.slug)

function onCreated(invitation: PanelInvitation) {
  highlight.value = invitation.id
}

watch(
  title,
  (t) => {
    document.title = `${t} · Panel`
  },
  { immediate: true },
)

onMounted(() => {
  void panel.loadBrand()
  if (token.value) void panel.refresh()
})
</script>

<template>
  <div class="panel" :class="{ 'panel--dark': dark }">
    <PanelLogin v-if="!token" :title="title" :notice="error" :login="panel.login" />

    <template v-else>
      <header class="panel__header">
        <div class="panel__brand">
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

      <p v-if="loading && !overview" class="p-hint panel__center">Cargando…</p>
      <p v-if="error" class="p-error panel__center" role="alert">{{ error }}</p>

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
            <dt>Invitados</dt>
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
            <dt>Pendientes</dt>
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
              @send="sending = $event"
            />
            <DeadlineCard :rsvp="overview.rsvp" :bounds="bounds" :change="panel.changeDeadline" />
          </div>
          <InvitationList
            :invitations="overview.invitations"
            :highlight="highlight"
            :dedications="overview.dedications"
            :assign="panel.assignTables"
            :remove="panel.remove"
            @send="sending = $event"
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

        <ShareDialog
          v-if="sending && brand && theme && fonts"
          :key="sending.id"
          :invitation="sending"
          :brand="brand"
          :theme="theme"
          :fonts="fonts"
          @close="sending = null"
        />
      </template>
    </template>
  </div>
</template>

<style>
/*
 * Estilos del panel, con los colores y las letras de la invitación (tokens del tema; si
 * no cargan, los valores de respaldo). El azul es lo principal; el oro, el adorno. Sin
 * scoped: los comparten sus componentes.
 */
.panel {
  --p-accent: var(--color-accent-strong, #3d6a92);
  /* Letra sobre el acento (botones y filtros activos) */
  --p-on-accent: #fff;
  --p-soft: color-mix(in srgb, var(--color-accent-soft, #c9dbe8) 55%, white);
  --p-gold: var(--color-primary, #96792c);
  --p-bg: var(--color-panel-alt, #eef3f8);
  --p-card: #ffffff;
  --p-text: var(--color-text, #2d2a26);
  --p-muted: color-mix(in srgb, var(--color-text, #2d2a26) 62%, white);
  --p-line: color-mix(in srgb, var(--color-frame, #abc1d9) 45%, white);
  --p-ok: #2f7d4f;
  --p-no: #a2483a;
  --p-font-title: var(--font-caps, Georgia, serif);
  --p-font-script: var(--font-script, cursive);
  --p-font-body: var(--font-serif, Georgia, serif);
  min-height: 100vh;
  padding: 1rem 1rem 3rem;
  background:
    radial-gradient(120% 60% at 50% 0%, var(--p-glow, #ffffff) 0%, transparent 70%), var(--p-bg);
  color: var(--p-text);
  font-family: var(--p-font-body);
  font-size: 1.08rem;
  line-height: 1.45;
}
/*
 * Invitación oscura (fondo negro): tarjetas grafito con letra clara, botones del color
 * principal (plata) con letra oscura, como los de la invitación, y verde y rojo un poco más
 * claros para leerse sobre el grafito.
 */
.panel.panel--dark {
  --p-accent: var(--color-primary, #c4c8ce);
  --p-on-accent: var(--color-bg, #0b0b0c);
  --p-soft: color-mix(in srgb, var(--color-text, #f3f3f1) 10%, transparent);
  --p-bg: var(--color-bg, #0b0b0c);
  --p-card: color-mix(in srgb, var(--color-surface, #141517) 85%, #3a3c40);
  --p-text: var(--color-text, #f3f3f1);
  --p-muted: color-mix(in srgb, var(--color-text, #f3f3f1) 62%, black);
  --p-line: color-mix(in srgb, var(--color-text, #f3f3f1) 18%, transparent);
  --p-glow: color-mix(in srgb, var(--color-primary, #c4c8ce) 16%, transparent);
  --p-ok: #3f9a66;
  --p-no: #c75a48;
  color-scheme: dark;
}
.panel input[type='text'],
.panel input[type='search'],
.panel input[type='number'],
.panel input[type='password'],
.panel input[type='date'],
.panel input:not([type]) {
  width: 100%;
  min-height: 2.9rem;
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--p-line);
  border-radius: 10px;
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
  padding: 0.5rem 1.3rem;
  border: 1px solid var(--p-accent);
  border-radius: 999px;
  background: var(--p-accent);
  color: var(--p-on-accent);
  font: inherit;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-decoration: none;
  box-shadow: 0 3px 10px color-mix(in srgb, var(--p-accent) 28%, transparent);
  cursor: pointer;
}
.p-button:disabled {
  opacity: 0.6;
  cursor: progress;
}
.p-button--small {
  min-height: 2.5rem;
  padding: 0.3rem 1.1rem;
  font-size: 0.98rem;
}
.p-button--ghost {
  background: transparent;
  color: var(--p-accent);
  box-shadow: none;
}
/* Acción discreta: solo la frase ("copiar link", "ver link"). */
.p-link {
  min-height: 2.2rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--p-muted);
  font: inherit;
  font-size: 0.9rem;
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--p-muted) 45%, transparent);
  text-underline-offset: 0.2em;
  cursor: pointer;
}
.p-link:hover {
  color: var(--p-accent);
}
.p-link:disabled {
  opacity: 0.5;
  cursor: default;
}
.p-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
/* Tarjeta como los paneles de la invitación: blanca, esquinas suaves y filo dorado. */
.p-card {
  position: relative;
  padding: 1.3rem;
  border: 1px solid var(--p-line);
  border-radius: 18px;
  background: var(--p-card);
  box-shadow: 0 6px 20px rgb(30 60 90 / 0.07);
}
.p-card__title {
  margin: 0 0 0.9rem;
  font-family: var(--p-font-title);
  font-size: 1.15rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.p-hint {
  margin: 0;
  color: var(--p-muted);
  font-size: 0.95rem;
}
.p-error {
  margin: 0;
  color: var(--p-no);
}
.p-chip {
  padding: 0.05rem 0.55rem;
  border-radius: 999px;
  font-size: 0.82rem;
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

.panel__center {
  max-width: 70rem;
  margin: 0 auto 1rem;
}
.panel__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.6rem 1rem;
  max-width: 70rem;
  margin: 0 auto 1.2rem;
}
.panel__kicker {
  margin: 0;
  color: var(--p-accent);
  font-family: var(--p-font-title);
  font-size: 0.85rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
/* "XV de Nat", grande y en la letra de pluma de la invitación. */
.panel__title {
  margin: 0;
  color: var(--p-gold);
  font-family: var(--p-font-script);
  font-size: clamp(3rem, 12vw, 4.2rem);
  font-weight: 400;
  line-height: 1.1;
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
  font-size: 0.88rem;
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
  overflow-x: auto;
  border-bottom: 1px solid var(--p-line);
}
.panel__tab {
  flex: none;
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
  color: var(--p-accent);
}
.panel .guests {
  max-width: 70rem;
  margin: 0 auto;
}
.panel__draft {
  max-width: 70rem;
  margin: 0 auto 1rem;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  background: #fff4e5;
  color: #7a4b00;
}
/*
 * Resumen: una franja discreta (no tarjetas grandes), número arriba y etiqueta abajo. En el
 * celular cabe en un renglón y casi no ocupa pantalla; lo principal del panel va debajo.
 */
.panel__summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  max-width: 70rem;
  margin: 0 auto 1rem;
  padding: 0.5rem 0.15rem;
  border: 1px solid var(--p-line);
  border-radius: 14px;
  background: color-mix(in srgb, var(--p-card) 65%, transparent);
}
.panel__summary div {
  display: flex;
  flex-direction: column-reverse; /* en el HTML va primero la etiqueta (dt), para el lector */
  align-items: center;
  min-width: 0;
  padding: 0 0.1rem;
  text-align: center;
}
.panel__summary div + div {
  border-left: 1px solid var(--p-line);
}
.panel__summary dt {
  color: var(--p-muted);
  font-family: var(--p-font-body);
  font-size: 0.7rem;
  line-height: 1.2;
}
.panel__summary dd {
  margin: 0;
  color: var(--p-accent);
  /* Los números en la letra de los títulos grandes (en Marcellus el 0 parece una O). */
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.15rem;
  line-height: 1.2;
  font-variant-numeric: lining-nums tabular-nums;
}
.panel__summary .is-ok dd {
  color: var(--p-ok);
}
.panel__summary .is-no dd {
  color: var(--p-no);
}
@media (min-width: 720px) {
  .panel__summary {
    padding: 0.7rem 0.4rem;
  }
  .panel__summary dt {
    font-size: 0.78rem;
    letter-spacing: 0.04em;
  }
  .panel__summary dd {
    font-size: 1.45rem;
  }
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
