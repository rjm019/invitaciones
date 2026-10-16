<script setup lang="ts">
import { computed, useId } from 'vue'
import { listThemes } from '@/themes'
import type { FieldDef } from '@/types/design'
import AudioField from './AudioField.vue'
import ColorField from './ColorField.vue'
import ColorsField from './ColorsField.vue'
import IconField from './IconField.vue'
import ImageField from './ImageField.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Un campo de la invitación, con el control que le toca según el catálogo (texto, fecha y
 * hora, color, imagen, canción, ícono, interruptor…), su ayuda y, si hay, su error.
 * Siempre guarda texto, como en invitacion.csv (sí/no = "SI"/"NO").
 */
const props = defineProps<{
  def: FieldDef
  modelValue: string
  error?: string | null
  /** Lo que se ve si está vacío (el texto que pone la invitación por defecto). */
  placeholder?: string
  /** Para una imagen: el archivo que usa el diseño si este está vacío. */
  fallbackImage?: string | null
  /** El campo es de "evento" pero se edita aquí (el salón en Ubicación…). */
  linked?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()

const YES = ['si', 'sí', 's', 'x', 'yes', 'true', '1']
const checked = computed(() => YES.includes(props.modelValue.trim().toLowerCase()))

const TIMEZONES = [
  { value: 'America/Mexico_City', label: 'Centro (CDMX, Guadalajara, Monterrey)' },
  { value: 'America/Cancun', label: 'Sureste (Cancún, Quintana Roo)' },
  { value: 'America/Merida', label: 'Mérida' },
  { value: 'America/Chihuahua', label: 'Chihuahua' },
  { value: 'America/Mazatlan', label: 'Pacífico (Mazatlán, Sinaloa, Nayarit)' },
  { value: 'America/Hermosillo', label: 'Sonora' },
  { value: 'America/Tijuana', label: 'Noroeste (Tijuana, Baja California)' },
  { value: 'America/Matamoros', label: 'Frontera noreste (Matamoros)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles' },
  { value: 'America/Chicago', label: 'Chicago, Houston' },
  { value: 'America/New_York', label: 'Nueva York' },
  { value: 'America/Bogota', label: 'Bogotá' },
  { value: 'Europe/Madrid', label: 'Madrid' },
]
const THEME_LABELS: Record<string, string> = {
  'jardin-azul': 'Jardín azul',
  marfil: 'Marfil',
  'nueva-york': 'Nueva York',
}
const themes = computed(() => listThemes().map((t) => ({ value: t, label: THEME_LABELS[t] ?? t })))

const dateTime = computed(() => {
  const [date = '', time = ''] = props.modelValue.trim().split(/[ T]/)
  return { date, time: time.slice(0, 5) }
})
function setDateTime(part: 'date' | 'time', value: string): void {
  const next = { ...dateTime.value, [part]: value }
  emit('update:modelValue', next.date ? `${next.date} ${next.time || '19:00'}` : '')
}

const urlInvalid = computed(
  () =>
    props.def.input === 'url' &&
    props.modelValue.trim() !== '' &&
    !/^https?:\/\//i.test(props.modelValue.trim()),
)
const set = (value: string) => emit('update:modelValue', value)
const describedBy = computed(
  () =>
    [props.def.help ? `${id}-help` : '', props.error ? `${id}-error` : '']
      .filter(Boolean)
      .join(' ') || undefined,
)
</script>

<template>
  <div class="g-field field" :class="{ 'field--toggle': def.input === 'toggle' }">
    <label v-if="def.input !== 'toggle'" class="g-label" :for="id">
      <span>
        {{ def.label }}
        <span
          v-if="linked"
          class="field__linked"
          title="Es un dato de todo el evento: también se usa en otras secciones"
        >
          <ManagerIcon name="link" />
        </span>
      </span>
      <span v-if="def.required && !modelValue" class="field__required">Obligatorio</span>
    </label>

    <!-- Texto -->
    <input
      v-if="def.input === 'text' || def.input === 'phone'"
      :id="id"
      class="g-input"
      :type="def.input === 'phone' ? 'tel' : 'text'"
      :value="modelValue"
      :placeholder="placeholder ?? def.placeholder"
      :maxlength="def.max_length"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @input="set(($event.target as HTMLInputElement).value)"
    />
    <textarea
      v-else-if="def.input === 'textarea' || def.input === 'lines'"
      :id="id"
      class="g-textarea"
      :rows="def.input === 'lines' ? 3 : 4"
      :value="modelValue"
      :placeholder="
        placeholder ?? def.placeholder ?? (def.input === 'lines' ? 'Uno por línea' : undefined)
      "
      :maxlength="def.max_length"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @input="set(($event.target as HTMLTextAreaElement).value)"
    />

    <!-- Enlace -->
    <div v-else-if="def.input === 'url'" class="g-row">
      <input
        :id="id"
        class="g-input g-grow"
        type="url"
        inputmode="url"
        :value="modelValue"
        :placeholder="def.placeholder ?? 'https://…'"
        :aria-invalid="error || urlInvalid ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="set(($event.target as HTMLInputElement).value)"
      />
      <a
        v-if="modelValue && !urlInvalid"
        class="g-icon-btn"
        :href="modelValue"
        target="_blank"
        rel="noopener"
        title="Abrir el enlace"
        aria-label="Abrir el enlace"
      >
        <ManagerIcon name="arrow-up-right-from-square" />
      </a>
    </div>

    <!-- Fecha y hora -->
    <div v-else-if="def.input === 'datetime'" class="g-row">
      <input
        :id="id"
        class="g-input g-grow"
        type="date"
        :value="dateTime.date"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="setDateTime('date', ($event.target as HTMLInputElement).value)"
      />
      <input
        class="g-input field__time"
        type="time"
        :value="dateTime.time"
        :aria-label="`Hora de ${def.label}`"
        @input="setDateTime('time', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <input
      v-else-if="def.input === 'date' || def.input === 'time'"
      :id="id"
      class="g-input"
      :type="def.input"
      :value="def.input === 'time' ? modelValue.slice(0, 5) : modelValue"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @input="set(($event.target as HTMLInputElement).value)"
    />

    <!-- Opciones -->
    <select
      v-else-if="def.input === 'select' || def.input === 'timezone' || def.input === 'theme'"
      :id="id"
      class="g-select"
      :value="modelValue"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @change="set(($event.target as HTMLSelectElement).value)"
    >
      <option value="">
        {{ def.input === 'timezone' ? 'Centro (la de siempre)' : 'Lo del diseño' }}
      </option>
      <option
        v-for="o in def.input === 'timezone'
          ? TIMEZONES
          : def.input === 'theme'
            ? themes
            : (def.options ?? [])"
        :key="o.value"
        :value="o.value"
      >
        {{ o.label }}
      </option>
      <option
        v-if="
          modelValue &&
          ![
            ...(def.input === 'timezone'
              ? TIMEZONES
              : def.input === 'theme'
                ? themes
                : (def.options ?? [])),
          ].some((o) => o.value === modelValue)
        "
        :value="modelValue"
      >
        {{ modelValue }}
      </option>
    </select>

    <!-- Interruptor -->
    <label v-else-if="def.input === 'toggle'" class="g-switch" :for="id">
      <input
        :id="id"
        type="checkbox"
        :checked="checked"
        @change="set(($event.target as HTMLInputElement).checked ? 'SI' : 'NO')"
      />
      <span class="g-switch__track" />
      <span>{{ def.label }}</span>
    </label>

    <!-- Deslizador (0 a 1) -->
    <div v-else-if="def.input === 'range'" class="g-row">
      <input
        :id="id"
        class="g-grow field__range"
        type="range"
        :min="def.min ?? 0"
        :max="def.max ?? 1"
        :step="def.step ?? 0.05"
        :value="modelValue || 0"
        @input="
          set(
            String(($event.target as HTMLInputElement).value) === '0'
              ? ''
              : ($event.target as HTMLInputElement).value,
          )
        "
      />
      <span class="field__value">{{ Math.round(Number(modelValue || 0) * 100) }} %</span>
    </div>

    <ColorField
      v-else-if="def.input === 'color'"
      :model-value="modelValue"
      :label="def.label"
      @update:model-value="set"
    />
    <ColorsField
      v-else-if="def.input === 'colors'"
      :model-value="modelValue"
      @update:model-value="set"
    />
    <ImageField
      v-else-if="def.input === 'image'"
      :model-value="modelValue"
      :label="def.label"
      :fallback="fallbackImage"
      @update:model-value="set"
    />
    <AudioField
      v-else-if="def.input === 'audio'"
      :model-value="modelValue"
      @update:model-value="set"
    />
    <IconField
      v-else-if="def.input === 'icon'"
      :model-value="modelValue"
      @update:model-value="set"
    />

    <p v-if="urlInvalid && !error" class="g-error">Debe empezar con https://</p>
    <p v-if="error" :id="`${id}-error`" class="g-error" role="alert">{{ error }}</p>
    <p v-else-if="def.help" :id="`${id}-help`" class="g-help">{{ def.help }}</p>
  </div>
</template>

<style scoped>
.field__linked {
  margin-left: 4px;
  color: var(--g-accent);
  font-size: 11px;
}
.field__required {
  color: var(--g-warn);
  font-size: 11.5px;
  font-weight: 600;
}
.field__time {
  width: 116px;
}
.field__range {
  accent-color: var(--g-accent);
}
.field__value {
  width: 44px;
  color: var(--g-muted);
  font-size: 12px;
  text-align: right;
}
</style>
