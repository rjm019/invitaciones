<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useManagerSession } from '@/composables/useManagerSession'
import { useToasts } from '@/composables/useToasts'
import { slugify, validSlug } from '@/services/designService'
import { ApiError } from '@/services/http'
import * as managerService from '@/services/managerService'
import type { ManagerEvent } from '@/types/design'
import GDialog from './GDialog.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Nueva invitación en dos pasos: de dónde parte (una plantilla, otra invitación o en
 * blanco) y sus datos (tipo, nombre, fecha). La dirección /e/<slug> se propone sola.
 * También sirve para duplicar y para guardar una invitación como plantilla.
 */
const props = defineProps<{
  open: boolean
  events: ManagerEvent[]
  /** Copiar de esta (duplicar o usar plantilla): salta al paso 2. */
  from?: string | null
  /** Crear una plantilla en vez de un evento. */
  template?: boolean
}>()
const emit = defineEmits<{ close: [] }>()
const router = useRouter()
const { withSession } = useManagerSession()
const { toast } = useToasts()

const TYPES = [
  { value: 'xv', label: 'XV años', icon: 'crown', name: 'Nombre de la festejada' },
  { value: 'boda', label: 'Boda', icon: 'ring', name: 'Nombres de los novios' },
  { value: 'bautizo', label: 'Bautizo', icon: 'dove', name: 'Nombre del bebé' },
  { value: 'cumple', label: 'Cumpleaños', icon: 'cake-candles', name: 'Nombre del festejado' },
  { value: 'otro', label: 'Otro', icon: 'star', name: 'Nombre del evento' },
] as const

const step = ref<1 | 2>(1)
const source = ref<string | null>(null) // slug de origen, o null = en blanco
const type = ref<(typeof TYPES)[number]['value']>('xv')
const name = ref('')
const shortName = ref('')
const date = ref('')
const time = ref('19:00')
const slug = ref('')
const slugTouched = ref(false)
const busy = ref(false)
const errors = ref<Record<string, string>>({})

const templates = computed(() => props.events.filter((e) => e.template))
const others = computed(() => props.events.filter((e) => !e.template))
const sourceEvent = computed(() => props.events.find((e) => e.slug === source.value) ?? null)
const typeDef = computed(() => TYPES.find((t) => t.value === type.value) ?? TYPES[0])
const title = computed(() =>
  props.template
    ? 'Guardar como plantilla'
    : props.from && !sourceEvent.value?.template
      ? 'Duplicar invitación'
      : 'Nueva invitación',
)
const taken = computed(() => props.events.some((e) => e.slug === slug.value))

watch(
  () => props.open,
  (open) => {
    if (!open) return
    source.value = props.from ?? null
    step.value = props.from ? 2 : 1
    const base = sourceEvent.value
    type.value = (TYPES.find((t) => t.value === base?.type)?.value ?? 'xv') as typeof type.value
    name.value = ''
    shortName.value = ''
    date.value = ''
    slug.value = props.template && base ? `plantilla-${base.slug}`.slice(0, 60) : ''
    slugTouched.value = !!slug.value
    errors.value = {}
  },
)

// La dirección se arma sola mientras la persona no la cambie.
watch([type, name], () => {
  if (slugTouched.value) return
  const prefix = props.template ? 'plantilla' : type.value === 'otro' ? '' : type.value
  slug.value = slugify(`${prefix} ${name.value}`.trim())
})
watch(name, (value, old) => {
  const firstOld = old.trim().split(/\s+/)[0] ?? ''
  if (!shortName.value || shortName.value === firstOld)
    shortName.value = value.trim().split(/\s+/)[0] ?? ''
})

function choose(slugFrom: string | null): void {
  source.value = slugFrom
  const base = sourceEvent.value
  if (base)
    type.value = (TYPES.find((t) => t.value === base.type)?.value ??
      type.value) as typeof type.value
  step.value = 2
}

function validate(): boolean {
  const next: Record<string, string> = {}
  if (!props.template && !name.value.trim()) next.name = 'Escribe el nombre.'
  if (!validSlug(slug.value)) next.slug = 'Usa de 2 a 60 letras minúsculas, números o guiones.'
  else if (taken.value) next.slug = 'Ya existe una invitación con esa dirección.'
  if (date.value && !/^\d{4}-\d{2}-\d{2}$/.test(date.value)) next.date = 'Elige la fecha.'
  errors.value = next
  return Object.keys(next).length === 0
}

async function create(): Promise<void> {
  if (!validate()) return
  busy.value = true
  try {
    const event: managerService.NewEvent['event'] = { tipo: type.value }
    if (name.value.trim()) event.festejada = name.value.trim()
    if (shortName.value.trim()) event.festejada_corto = shortName.value.trim()
    if (date.value) event.inicia = `${date.value} ${time.value || '19:00'}`
    const created = await withSession((t) =>
      managerService.createEvent(t, {
        slug: slug.value,
        source: source.value ? 'event' : 'blank',
        from: source.value ?? undefined,
        template: props.template,
        event,
      }),
    )
    toast(props.template ? 'Plantilla creada ✓' : 'Invitación creada ✓ (empieza oculta)')
    emit('close')
    await router.push(`/gestor/${created.slug}`)
  } catch (e) {
    if (e instanceof ApiError && !Array.isArray(e.errors) && e.errors.slug)
      errors.value = { slug: e.errors.slug[0] }
    else errors.value = { form: e instanceof Error ? e.message : 'No se pudo crear.' }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <GDialog :open="open" :title="title" size="lg" @close="emit('close')">
    <!-- Paso 1: de dónde parte -->
    <div v-if="step === 1" class="origin">
      <p class="origin__lead">Elige cómo empezar. Todo se puede cambiar después.</p>

      <section v-if="templates.length">
        <h3 class="origin__title">Plantillas</h3>
        <div class="origin__grid">
          <button
            v-for="t in templates"
            :key="t.slug"
            type="button"
            class="origin__card"
            @click="choose(t.slug)"
          >
            <span class="origin__swatches">
              <i v-for="(c, k) in t.cover.colors" :key="k" :style="{ background: c }" />
            </span>
            <strong>{{ t.title }}</strong>
            <small>Plantilla</small>
          </button>
        </div>
      </section>

      <section>
        <h3 class="origin__title">Empezar de</h3>
        <div class="origin__grid">
          <button type="button" class="origin__card origin__card--blank" @click="choose(null)">
            <ManagerIcon name="plus" />
            <strong>En blanco</strong>
            <small>Todas las secciones con textos de ejemplo</small>
          </button>
          <button
            v-for="e in others.slice(0, 8)"
            :key="e.slug"
            type="button"
            class="origin__card"
            @click="choose(e.slug)"
          >
            <span class="origin__swatches">
              <i v-for="(c, k) in e.cover.colors" :key="k" :style="{ background: c }" />
            </span>
            <strong>{{ e.title }}</strong>
            <small>Copiar /e/{{ e.slug }}</small>
          </button>
        </div>
      </section>
    </div>

    <!-- Paso 2: datos -->
    <form v-else id="new-event-form" class="data" @submit.prevent="create">
      <p v-if="sourceEvent" class="g-note">
        <ManagerIcon name="copy" />
        <span
          >Parte de <strong>{{ sourceEvent.title }}</strong
          >: su diseño, textos y archivos. Nunca sus invitados ni sus respuestas.</span
        >
      </p>
      <p v-else class="g-note">
        <ManagerIcon name="wand-magic-sparkles" /> Empieza con todas las secciones y textos de
        ejemplo.
      </p>

      <div class="g-field">
        <span class="g-label">Tipo de evento</span>
        <div class="g-chips" role="radiogroup" aria-label="Tipo de evento">
          <button
            v-for="t in TYPES"
            :key="t.value"
            type="button"
            class="g-chip"
            role="radio"
            :aria-checked="type === t.value"
            :aria-pressed="type === t.value"
            @click="type = t.value"
          >
            <ManagerIcon :name="t.icon" /> {{ t.label }}
          </button>
        </div>
      </div>

      <div class="data__row">
        <div class="g-field g-grow">
          <label class="g-label" for="new-name">{{ typeDef.name }}</label>
          <input
            id="new-name"
            v-model="name"
            class="g-input"
            maxlength="120"
            :aria-invalid="errors.name ? 'true' : undefined"
          />
          <p v-if="errors.name" class="g-error">{{ errors.name }}</p>
        </div>
        <div class="g-field data__short">
          <label class="g-label" for="new-short">Nombre corto</label>
          <input id="new-short" v-model="shortName" class="g-input" maxlength="40" />
        </div>
      </div>

      <div class="data__row">
        <div class="g-field g-grow">
          <label class="g-label" for="new-date">Fecha</label>
          <input
            id="new-date"
            v-model="date"
            class="g-input"
            type="date"
            :aria-invalid="errors.date ? 'true' : undefined"
          />
          <p class="g-help">Puedes ponerla después.</p>
        </div>
        <div class="g-field data__time">
          <label class="g-label" for="new-time">Hora</label>
          <input id="new-time" v-model="time" class="g-input" type="time" />
        </div>
      </div>

      <div class="g-field">
        <label class="g-label" for="new-slug">Dirección de la invitación</label>
        <div class="slug" :class="{ 'slug--invalid': errors.slug }">
          <span class="slug__prefix">/e/</span>
          <input
            id="new-slug"
            v-model="slug"
            class="slug__input"
            maxlength="60"
            autocomplete="off"
            spellcheck="false"
            :aria-invalid="errors.slug ? 'true' : undefined"
            @input="slugTouched = true"
          />
        </div>
        <p v-if="errors.slug" class="g-error">{{ errors.slug }}</p>
        <p v-else-if="taken" class="g-error">Ya existe una invitación con esa dirección.</p>
        <p v-else class="g-help">
          Es lo que verán tus invitados en el enlace general. No se puede cambiar después.
        </p>
      </div>

      <p v-if="errors.form" class="g-note g-note--danger" role="alert">{{ errors.form }}</p>
    </form>

    <template #footer>
      <button v-if="step === 2 && !from" type="button" class="g-btn g-btn--ghost" @click="step = 1">
        <ManagerIcon name="arrow-left" /> Atrás
      </button>
      <span class="g-grow" />
      <button type="button" class="g-btn" @click="emit('close')">Cancelar</button>
      <button
        v-if="step === 2"
        type="submit"
        form="new-event-form"
        class="g-btn g-btn--primary"
        :disabled="busy"
      >
        <ManagerIcon v-if="busy" name="spinner" spin />
        {{ template ? 'Crear plantilla' : 'Crear invitación' }}
      </button>
    </template>
  </GDialog>
</template>

<style scoped>
.origin {
  display: grid;
  gap: 18px;
}
.origin__lead {
  color: var(--g-muted);
}
.origin__title {
  margin-bottom: 8px;
  color: var(--g-faint);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.origin__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.origin__card {
  display: grid;
  gap: 6px;
  justify-items: start;
  padding: 14px;
  border: 1px solid var(--g-line);
  border-radius: 12px;
  background: var(--g-surface);
  color: var(--g-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s var(--g-ease);
}
.origin__card:hover {
  border-color: var(--g-accent-line);
  box-shadow: var(--g-shadow-md);
  transform: translateY(-1px);
}
.origin__card small {
  color: var(--g-faint);
  font-size: 12px;
}
.origin__card--blank {
  border-style: dashed;
}
.origin__card--blank > .g-icon {
  color: var(--g-accent);
  font-size: 18px;
}
.origin__swatches {
  display: flex;
}
.origin__swatches i {
  width: 22px;
  height: 22px;
  margin-right: -6px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--g-line);
}
.data {
  display: grid;
  gap: 16px;
}
.data .g-field + .g-field {
  margin-top: 0;
}
.data__row {
  display: flex;
  gap: 12px;
}
.data__short {
  width: 170px;
}
.data__time {
  width: 140px;
}
.slug {
  display: flex;
  align-items: center;
  border: 1px solid var(--g-line-strong);
  border-radius: 9px;
  background: var(--g-surface);
  overflow: hidden;
}
.slug:focus-within {
  border-color: var(--g-accent);
  box-shadow: 0 0 0 3px var(--g-accent-soft);
}
.slug--invalid {
  border-color: var(--g-danger);
}
.slug__prefix {
  padding: 0 4px 0 11px;
  color: var(--g-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.slug__input {
  flex: 1;
  min-height: 38px;
  border: 0;
  outline: none;
  background: transparent;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13.5px;
}
@media (max-width: 600px) {
  .data__row {
    flex-direction: column;
  }
  .data__short,
  .data__time {
    width: auto;
  }
}
</style>
