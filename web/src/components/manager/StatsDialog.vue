<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useClipboard } from '@/composables/useClipboard'
import { useManagerSession } from '@/composables/useManagerSession'
import { useToasts } from '@/composables/useToasts'
import * as managerService from '@/services/managerService'
import {
  axisTicks,
  chartBars,
  formatCount,
  LINK_SOURCES,
  niceMax,
  share,
  trackedLink,
  VISIT_KINDS,
  VISIT_RANGES,
  VISIT_SCOPES,
} from '@/services/visitStatsService'
import type { VisitCount, VisitScope, VisitStats } from '@/types/design'
import GDialog from './GDialog.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Estadísticas del sitio (solo quien administra): cuántas visitas y personas, por día, de
 * dónde llegan, en qué páginas e invitaciones, con qué dispositivo y las últimas visitas
 * (con su IP). Las del equipo no cuentan. Abajo, enlaces con etiqueta para saber qué
 * publicación o volante trae a cada persona.
 */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; changed: [today: number] }>()
const { withSession } = useManagerSession()
const { toast } = useToasts()
const { copied, copy } = useClipboard()

const days = ref<number>(30)
const scope = ref<VisitScope>('sitio')
const stats = ref<VisitStats | null>(null)
const loading = ref(false)
const error = ref('')

const bars = computed(() => (stats.value ? chartBars(stats.value.days) : []))
const top = computed(() => niceMax(Math.max(0, ...bars.value.map((b) => b.visits))))
// Fecha del eje → su lugar entre las fechas que se muestran (en el celular, una sí y una no).
const ticks = computed(() => new Map(axisTicks(bars.value.length).map((bar, i) => [bar, i])))
const minorTick = (i: number) => {
  const order = ticks.value.get(i)
  return order !== undefined && order % 2 === 1 && i !== bars.value.length - 1
}
const weekly = computed(() => !!stats.value && stats.value.days.length > 92)
const hovered = ref<number | null>(null)
const hoveredBar = computed(() => (hovered.value === null ? null : bars.value[hovered.value]))

const breakdowns = computed(() => {
  const s = stats.value
  if (!s) return []
  const list: { title: string; rows: VisitCount[]; hint?: string }[] = [
    {
      title: 'De dónde llegan',
      rows: s.origins,
      hint: '“Directo”: escribieron la dirección, escanearon un QR o la abrieron desde WhatsApp, que no dice de dónde viene.',
    },
  ]
  if (s.scope !== 'invitaciones') list.unshift({ title: 'Páginas', rows: s.pages })
  if (s.campaigns.length) list.push({ title: 'Enlaces con etiqueta', rows: s.campaigns })
  list.push(
    { title: 'Dispositivos', rows: s.devices },
    { title: 'Sistemas', rows: s.systems },
    { title: 'Navegadores y apps', rows: s.browsers },
  )
  return list
})

const dateTime = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})
const when = (iso: string) => dateTime.format(new Date(iso))

async function load(): Promise<void> {
  loading.value = true
  try {
    stats.value = await withSession((t) => managerService.getVisitStats(t, days.value, scope.value))
    error.value = ''
    if (days.value === 1 && scope.value === 'sitio') emit('changed', stats.value.totals.visits)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudieron cargar las estadísticas.'
  } finally {
    loading.value = false
  }
}

async function download(): Promise<void> {
  try {
    const blob = await withSession((t) => managerService.exportVisits(t, days.value))
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), {
      href: url,
      download: `visitas-${stats.value?.from ?? ''}-a-${stats.value?.to ?? ''}.csv`,
    }).click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch (e) {
    toast(e instanceof Error ? e.message : 'No se pudo descargar.', 'error')
  }
}

// Enlaces con etiqueta: la dirección de este sitio con utm_source (y la campaña).
const linkSource = ref<string>('instagram')
const linkCampaign = ref('')
const link = computed(() =>
  trackedLink(window.location.origin, linkSource.value, linkCampaign.value),
)
async function copyLink(): Promise<void> {
  if (await copy(link.value, 'link')) toast('Enlace copiado.', 'ok')
}

watch([days, scope], () => {
  hovered.value = null
  if (props.open) void load()
})
watch(
  () => props.open,
  (open) => {
    if (open) void load()
  },
  { immediate: true },
)
</script>

<template>
  <GDialog :open="open" title="Estadísticas" size="lg" @close="emit('close')">
    <div class="stats">
      <div class="stats__bar">
        <div class="g-segmented" role="tablist" aria-label="Qué parte del sitio">
          <button
            v-for="s in VISIT_SCOPES"
            :key="s.value"
            type="button"
            role="tab"
            :title="s.hint"
            :aria-selected="scope === s.value"
            :aria-pressed="scope === s.value"
            @click="scope = s.value"
          >
            {{ s.label }}
          </button>
        </div>
        <label class="g-sr" for="stats-range">Periodo</label>
        <select id="stats-range" v-model.number="days" class="g-select stats__range">
          <option v-for="r in VISIT_RANGES" :key="r.days" :value="r.days">{{ r.label }}</option>
        </select>
        <button
          type="button"
          class="g-btn g-btn--ghost stats__download"
          :disabled="!stats"
          title="Todas las visitas de este periodo, con su IP, para abrir en Excel"
          @click="download"
        >
          <ManagerIcon name="file-csv" /> Descargar
        </button>
      </div>

      <p v-if="error" class="g-note g-note--danger" role="alert">{{ error }}</p>
      <p v-else-if="loading && !stats" class="g-help">Cargando…</p>

      <template v-if="stats">
        <div class="stats__tiles" :aria-busy="loading">
          <div class="g-card tile">
            <span class="tile__label">Visitas</span>
            <strong class="tile__value">{{ formatCount(stats.totals.visits) }}</strong>
            <span class="tile__sub">páginas vistas</span>
          </div>
          <div class="g-card tile">
            <span class="tile__label">Personas</span>
            <strong class="tile__value">{{ formatCount(stats.totals.visitors) }}</strong>
            <span class="tile__sub">distintas (por IP y navegador)</span>
          </div>
          <div v-if="stats.scope !== 'invitaciones'" class="g-card tile">
            <span class="tile__label">Cotizaciones</span>
            <strong class="tile__value">{{ formatCount(stats.totals.quotes) }}</strong>
            <span class="tile__sub">
              <template v-if="stats.totals.conversion !== null">
                {{ stats.totals.conversion }} de cada 100 personas
              </template>
              <template v-else>sin visitas todavía</template>
            </span>
          </div>
          <div v-else class="g-card tile">
            <span class="tile__label">Invitaciones vistas</span>
            <strong class="tile__value">{{ formatCount(stats.events.length) }}</strong>
            <span class="tile__sub">con al menos una visita</span>
          </div>
        </div>

        <section class="g-card chart" aria-labelledby="stats-chart-title">
          <h3 id="stats-chart-title" class="stats__title">
            Visitas por {{ weekly ? 'semana' : 'día' }}
          </h3>
          <div class="chart__plot">
            <div class="chart__grid" aria-hidden="true">
              <span :data-value="formatCount(top)" />
              <span :data-value="top % 2 ? '' : formatCount(top / 2)" />
              <span data-value="0" />
            </div>
            <div class="chart__bars" :style="{ '--n': bars.length }" @mouseleave="hovered = null">
              <button
                v-for="(b, i) in bars"
                :key="b.key"
                type="button"
                class="chart__col"
                :class="{ 'is-hovered': hovered === i }"
                :aria-label="`${b.label}: ${b.visits} visitas, ${b.visitors} personas`"
                @mouseenter="hovered = i"
                @focus="hovered = i"
                @blur="hovered = null"
              >
                <span class="chart__bar" :style="{ height: `${(b.visits / top) * 100}%` }" />
              </button>
            </div>
            <div
              v-if="hoveredBar && hovered !== null"
              class="chart__tip"
              :style="{ '--x': (hovered + 0.5) / bars.length }"
              role="status"
            >
              <strong>{{ hoveredBar.label }}</strong>
              <span>{{ formatCount(hoveredBar.visits) }} visitas</span>
              <span
                >{{ formatCount(hoveredBar.visitors) }}
                {{ hoveredBar.visitors === 1 ? 'persona' : 'personas' }}</span
              >
            </div>
          </div>
          <div class="chart__axis" :style="{ '--n': bars.length }" aria-hidden="true">
            <span
              v-for="(b, i) in bars"
              :key="b.key"
              :class="{ 'is-last': i === bars.length - 1 && i > 0, 'is-minor': minorTick(i) }"
              >{{ ticks.has(i) ? b.short : '' }}</span
            >
          </div>
          <details class="chart__table">
            <summary>Ver como tabla</summary>
            <table class="stats__table">
              <thead>
                <tr>
                  <th scope="col">{{ weekly ? 'Semana' : 'Día' }}</th>
                  <th scope="col" class="num">Visitas</th>
                  <th scope="col" class="num">Personas</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in [...bars].reverse()" :key="b.key">
                  <td>{{ b.label }}</td>
                  <td class="num">{{ formatCount(b.visits) }}</td>
                  <td class="num">{{ formatCount(b.visitors) }}</td>
                </tr>
              </tbody>
            </table>
          </details>
        </section>

        <section v-if="stats.scope !== 'sitio'" class="g-card" aria-labelledby="stats-events">
          <h3 id="stats-events" class="stats__title">Invitaciones</h3>
          <p v-if="!stats.events.length" class="g-help">
            Nadie ha abierto una invitación en este periodo.
          </p>
          <table v-else class="stats__table">
            <thead>
              <tr>
                <th scope="col">Invitación</th>
                <th scope="col" class="num">General</th>
                <th scope="col" class="num">Personales</th>
                <th scope="col" class="num">Personas</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in stats.events" :key="e.slug">
                <td>
                  {{ e.slug }}
                  <span v-if="e.demo" class="g-badge">Muestra</span>
                </td>
                <td class="num">{{ formatCount(e.general) }}</td>
                <td class="num">{{ formatCount(e.personal) }}</td>
                <td class="num">{{ formatCount(e.visitors) }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <div class="stats__grid">
          <section v-for="group in breakdowns" :key="group.title" class="g-card">
            <h3 class="stats__title">{{ group.title }}</h3>
            <p v-if="!group.rows.length" class="g-help">Sin visitas en este periodo.</p>
            <ol v-else class="rank">
              <li v-for="row in group.rows" :key="row.label" class="rank__row">
                <span class="rank__label" :title="row.label">{{ row.label }}</span>
                <span class="rank__value">
                  {{ formatCount(row.visits) }}
                  <small>{{ share(row.visits, stats.totals.visits) }}%</small>
                </span>
                <span class="rank__track" aria-hidden="true">
                  <span :style="{ width: `${share(row.visits, stats.totals.visits)}%` }" />
                </span>
              </li>
            </ol>
            <p v-if="group.hint && group.rows.length" class="g-help rank__hint">{{ group.hint }}</p>
          </section>
        </div>

        <section class="g-card" aria-labelledby="stats-recent">
          <h3 id="stats-recent" class="stats__title">Últimas visitas</h3>
          <p v-if="!stats.recent.length" class="g-help">Todavía no hay visitas en este periodo.</p>
          <div v-else class="stats__scroll">
            <table class="stats__table">
              <thead>
                <tr>
                  <th scope="col">Cuándo</th>
                  <th scope="col">Página</th>
                  <th scope="col">De dónde</th>
                  <th scope="col">Dispositivo</th>
                  <th scope="col">IP</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(v, i) in stats.recent" :key="`${v.at}-${i}`">
                  <td class="nowrap">{{ when(v.at) }}</td>
                  <td :title="VISIT_KINDS[v.kind]">{{ v.page }}</td>
                  <td :title="v.campaign ?? undefined">{{ v.origin }}</td>
                  <td :title="`${v.system} · ${v.browser}`">{{ v.device }} · {{ v.browser }}</td>
                  <td class="mono">{{ v.ip ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <details class="g-card links">
          <summary class="stats__title">Enlaces con etiqueta</summary>
          <p class="g-help">
            WhatsApp y los QR no dicen de dónde viene la visita. Comparte la página con un enlace
            distinto en cada lugar (la biografía de Instagram, un volante, una historia) y aquí
            verás cuál trae más personas.
          </p>
          <div class="links__form">
            <div class="g-field">
              <label class="g-label" for="link-source">Dónde lo vas a poner</label>
              <select id="link-source" v-model="linkSource" class="g-select">
                <option v-for="s in LINK_SOURCES" :key="s.value" :value="s.value">
                  {{ s.label }}
                </option>
              </select>
            </div>
            <div class="g-field g-grow">
              <label class="g-label" for="link-campaign">Campaña (opcional)</label>
              <input
                id="link-campaign"
                v-model="linkCampaign"
                class="g-input"
                maxlength="40"
                placeholder="Expo bodas, promoción de diciembre…"
              />
            </div>
          </div>
          <div class="links__result">
            <input class="g-input mono" :value="link" readonly aria-label="Enlace con etiqueta" />
            <button type="button" class="g-btn g-btn--primary" @click="copyLink">
              <ManagerIcon :name="copied === 'link' ? 'check' : 'copy'" />
              {{ copied === 'link' ? 'Copiado' : 'Copiar' }}
            </button>
          </div>
        </details>

        <p class="g-help stats__foot">
          No cuentan las visitas del equipo (navegadores donde alguien entró al gestor)<template
            v-if="stats.totals.team"
            >: {{ formatCount(stats.totals.team) }} en este periodo</template
          >. Tampoco los robots ni las vistas previas de WhatsApp o Facebook. Las IP se borran al
          año.
        </p>
      </template>
    </div>
  </GDialog>
</template>

<style scoped>
.stats {
  display: grid;
  /* minmax(0, …): una tabla ancha se desplaza en su caja, no ensancha la ventana. */
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}
.stats .g-card {
  padding: 14px 16px;
}
.stats__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.stats__range {
  width: auto;
}
.stats__download {
  margin-left: auto;
}
.stats__title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}
.stats__tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.tile {
  display: grid;
  gap: 2px;
}
.tile__label {
  color: var(--g-muted);
  font-size: 13px;
}
.tile__value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}
.tile__sub {
  color: var(--g-faint);
  font-size: 12px;
}

/* Gráfica: una columna por día; la columna entera es el blanco del puntero. */
.chart__plot {
  position: relative;
  height: 180px;
  margin-left: 34px;
}
.chart__grid {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}
.chart__grid span {
  position: relative;
  border-top: 1px solid var(--g-line);
}
.chart__grid span:last-child {
  border-top-color: var(--g-line-strong);
}
.chart__grid span::before {
  content: attr(data-value);
  position: absolute;
  right: calc(100% + 6px);
  top: -7px;
  color: var(--g-faint);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.chart__bars {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  gap: 2px;
}
.chart__col {
  display: flex;
  align-items: flex-end;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 4px 4px 0 0;
  background: transparent;
  cursor: default;
}
.chart__col:focus-visible {
  outline: 2px solid var(--g-accent);
  outline-offset: 1px;
}
.chart__col.is-hovered {
  background: var(--g-accent-soft);
}
.chart__bar {
  display: block;
  width: 100%;
  min-height: 0;
  max-width: 28px;
  margin: 0 auto;
  border-radius: 4px 4px 0 0;
  background: var(--g-accent);
}
.chart__col.is-hovered .chart__bar {
  background: var(--g-accent-hover);
}
.chart__tip {
  position: absolute;
  top: 0;
  left: clamp(64px, calc(var(--x) * 100%), calc(100% - 64px));
  z-index: 2;
  display: grid;
  gap: 1px;
  padding: 7px 10px;
  border: 1px solid var(--g-line);
  border-radius: var(--g-radius-sm);
  background: var(--g-surface);
  box-shadow: var(--g-shadow-md);
  font-size: 12px;
  white-space: nowrap;
  transform: translateX(-50%);
  pointer-events: none;
}
.chart__axis {
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  gap: 2px;
  margin: 6px 0 0 34px;
  color: var(--g-faint);
  font-size: 11px;
}
.chart__axis span {
  overflow: visible;
  white-space: nowrap;
  text-align: left;
}
.chart__axis span.is-last {
  display: flex;
  justify-content: flex-end; /* la fecha que no cabe crece hacia la izquierda */
}
.chart__table {
  margin-top: 10px;
  font-size: 13px;
}
.chart__table summary {
  color: var(--g-muted);
  cursor: pointer;
}

.stats__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.rank {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.rank__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 10px;
  font-size: 13px;
}
.rank__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank__value {
  font-variant-numeric: tabular-nums;
}
.rank__value small {
  margin-left: 4px;
  color: var(--g-faint);
}
.rank__track {
  grid-column: 1 / -1;
  height: 4px;
  border-radius: 4px;
  background: var(--g-surface-3);
}
.rank__track span {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: var(--g-accent);
}
.rank__hint {
  margin: 10px 0 0;
}

.stats__scroll {
  max-height: 320px;
  overflow: auto;
}
.stats__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.stats__table th {
  position: sticky;
  top: 0;
  background: var(--g-surface);
  color: var(--g-muted);
  font-weight: 500;
  text-align: left;
}
.stats__table th,
.stats__table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--g-line);
}
.stats__table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.nowrap {
  white-space: nowrap;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.links summary {
  margin: 0;
  cursor: pointer;
}
.links[open] summary {
  margin-bottom: 8px;
}
.links__form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
.links__form .g-field:first-child {
  flex: 0 0 220px;
}
.links__result {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.links__result .g-input {
  flex: 1;
  min-width: 0;
}
.stats__foot {
  margin: 0;
}

@media (max-width: 640px) {
  .stats__tiles,
  .stats__grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .stats__download {
    margin-left: 0;
  }
  .chart__axis span.is-minor {
    visibility: hidden;
  }
  .links__form .g-field:first-child {
    flex: 1 1 100%;
  }
}
</style>
