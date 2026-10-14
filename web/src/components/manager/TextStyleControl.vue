<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditor } from '@/composables/useEditorContext'
import { applyTextStyleEverywhere } from '@/services/designService'
import { normalizeHex } from '@/services/colorService'
import ColorField from './ColorField.vue'
import FontPicker from './FontPicker.vue'
import GPopover from './GPopover.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Letra, color y tamaño de un texto ("Aa"): de una sección (`section`) o de toda la
 * invitación (sin `section`, en el bloque "textos"). Cerrado muestra un resumen; abierto,
 * los tres controles. Vacío = lo del diseño (o, en una sección, lo de "textos").
 */
const props = defineProps<{
  block: string
  label: string
  section?: string | null
  sample?: string
  startOpen?: boolean
}>()
const { catalog, design, update, setField, setBlock, themeFonts } = useEditor()

const open = ref(!!props.startOpen)
const fontButton = ref<HTMLElement | null>(null)
const fontOpen = ref(false)

const common = computed(() => catalog.value.texts.some((t) => t.key === props.block))
const own = (prop: string) =>
  (props.section
    ? design.value.sections.find((s) => s.id === props.section)?.fields[`${props.block}_${prop}`]
    : design.value.texts[`${props.block}_${prop}`]) ?? ''
// En una sección, lo que pone "textos" para todos (si este texto es de los comunes).
const global = (prop: string) =>
  props.section && common.value ? (design.value.texts[`${props.block}_${prop}`] ?? '') : ''

const font = computed(() => own('fuente'))
const color = computed(() => own('color'))
const size = computed(() => Number(own('tamano')) || 0)
const shownFont = computed(() => font.value || global('fuente'))
const shownSize = computed(() => size.value || Number(global('tamano')) || 100)
const changed = computed(() => !!(font.value || color.value || size.value))

const fontsInUse = computed(() => {
  const listed = Object.values(design.value.fonts)
  const theme = Object.values(themeFonts.value).map(
    (v) => v.split(',')[0]?.replace(/["']/g, '').trim() ?? '',
  )
  return [...listed, ...theme].filter((f) => /^[A-Za-z0-9 ]{2,60}$/.test(f))
})

function set(prop: 'fuente' | 'color' | 'tamano', value: string): void {
  const key = `${props.block}_${prop}`
  if (props.section) setField(props.section, key, value)
  else setBlock('texts', key, value)
}
function setSize(value: number): void {
  const { min, max } = catalog.value.text_size
  const clamped = Math.min(max, Math.max(min, Math.round(value / 5) * 5))
  set('tamano', clamped === 100 ? '' : String(clamped))
}
function reset(): void {
  if (!props.section) {
    for (const prop of ['fuente', 'color', 'tamano'] as const) set(prop, '')
    return
  }
  const fields = {
    [`${props.block}_fuente`]: '',
    [`${props.block}_color`]: '',
    [`${props.block}_tamano`]: '',
  }
  // Los tres de una vez: un solo paso de "deshacer".
  const sectionId = props.section
  update({
    ...design.value,
    sections: design.value.sections.map((s) => {
      if (s.id !== sectionId) return s
      const next = { ...s.fields }
      Object.keys(fields).forEach((k) => delete next[k])
      return { ...s, fields: next }
    }),
  })
}
function everywhere(): void {
  if (!props.section) return
  update(
    applyTextStyleEverywhere(design.value, props.block, {
      [`${props.block}_fuente`]: font.value,
      [`${props.block}_color`]: color.value,
      [`${props.block}_tamano`]: size.value ? String(size.value) : '',
    }),
  )
}
const colorDot = computed(() => {
  const v = color.value || global('color')
  if (!v) return null
  if (v.startsWith('#')) return normalizeHex(v)
  return normalizeHex(design.value.colors[v] ?? '') ?? null
})
</script>

<template>
  <div class="ts" :class="{ 'ts--open': open, 'ts--changed': changed }">
    <button type="button" class="ts__summary" :aria-expanded="open" @click="open = !open">
      <span class="ts__aa" :style="shownFont ? { fontFamily: `'${shownFont}', serif` } : undefined"
        >Aa</span
      >
      <span class="ts__label">{{ label }}</span>
      <span class="ts__meta">
        <span v-if="colorDot" class="ts__dot" :style="{ background: colorDot }" />
        <span v-if="shownFont" class="ts__font">{{ shownFont }}</span>
        <span v-if="shownSize !== 100">{{ shownSize }} %</span>
        <span v-if="!changed && !shownFont && shownSize === 100" class="ts__default"
          >Del diseño</span
        >
      </span>
      <ManagerIcon :name="open ? 'chevron-up' : 'chevron-down'" />
    </button>

    <div v-if="open" class="ts__body">
      <div class="ts__row">
        <span class="ts__name">Letra</span>
        <button
          ref="fontButton"
          type="button"
          class="ts__font-button"
          :aria-expanded="fontOpen"
          @click="fontOpen = !fontOpen"
        >
          <span :style="shownFont ? { fontFamily: `'${shownFont}', serif` } : undefined">{{
            font || (global('fuente') ? `${global('fuente')} (todas)` : 'Del diseño')
          }}</span>
          <ManagerIcon name="chevron-down" />
        </button>
      </div>
      <div class="ts__row">
        <span class="ts__name">Color</span>
        <ColorField
          :model-value="color"
          :label="`Color de ${label}`"
          @update:model-value="(v) => set('color', v)"
        />
      </div>
      <div class="ts__row">
        <span class="ts__name">Tamaño</span>
        <div class="ts__size">
          <button
            type="button"
            class="g-icon-btn"
            aria-label="Más chico"
            @click="setSize(shownSize - 10)"
          >
            −
          </button>
          <input
            type="range"
            :min="catalog.text_size.min"
            :max="catalog.text_size.max"
            step="5"
            :value="shownSize"
            :aria-label="`Tamaño de ${label}`"
            :aria-valuetext="`${shownSize} %`"
            @input="setSize(Number(($event.target as HTMLInputElement).value))"
          />
          <button
            type="button"
            class="g-icon-btn"
            aria-label="Más grande"
            @click="setSize(shownSize + 10)"
          >
            +
          </button>
          <span class="ts__value">{{ shownSize }} %</span>
        </div>
      </div>
      <div class="ts__actions">
        <button
          type="button"
          class="g-btn g-btn--ghost g-btn--small"
          :disabled="!changed"
          @click="reset"
        >
          <ManagerIcon name="rotate-left" /> Restablecer
        </button>
        <button
          v-if="section && common"
          type="button"
          class="g-btn g-btn--ghost g-btn--small"
          :disabled="!changed"
          @click="everywhere"
        >
          <ManagerIcon name="layer-group" /> Usar en todas las secciones
        </button>
      </div>
    </div>

    <GPopover :open="fontOpen" :anchor="fontButton" :width="300" @close="fontOpen = false">
      <FontPicker
        :model-value="font"
        :sample="sample ?? label"
        :in-use="fontsInUse"
        :inherited="global('fuente') || null"
        @pick="(f) => (set('fuente', f), (fontOpen = false))"
      />
    </GPopover>
  </div>
</template>

<style scoped>
.ts {
  border: 1px solid var(--g-line);
  border-radius: 10px;
  background: var(--g-surface);
}
.ts--changed {
  border-color: var(--g-accent-line);
}
.ts__summary {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border: 0;
  background: transparent;
  color: var(--g-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.ts__aa {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 7px;
  background: var(--g-surface-3);
  font-size: 16px;
}
.ts--changed .ts__aa {
  background: var(--g-accent-soft);
  color: var(--g-accent);
}
.ts__label {
  font-weight: 600;
  font-size: 13px;
}
.ts__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  overflow: hidden;
  color: var(--g-faint);
  font-size: 12px;
  white-space: nowrap;
}
.ts__font {
  overflow: hidden;
  max-width: 110px;
  text-overflow: ellipsis;
}
.ts__dot {
  width: 12px;
  height: 12px;
  flex: none;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.15);
}
.ts__default {
  font-style: italic;
}
.ts__body {
  display: grid;
  gap: 10px;
  padding: 4px 12px 12px;
  border-top: 1px solid var(--g-line);
  padding-top: 12px;
}
.ts__row {
  display: grid;
  grid-template-columns: 62px 1fr;
  align-items: center;
  gap: 8px;
}
.ts__name {
  color: var(--g-muted);
  font-size: 12.5px;
  font-weight: 600;
}
.ts__font-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--g-line-strong);
  border-radius: 9px;
  background: var(--g-surface);
  color: var(--g-text);
  font-size: 15px;
  cursor: pointer;
}
.ts__size {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ts__size input {
  flex: 1;
  accent-color: var(--g-accent);
}
.ts__value {
  width: 48px;
  color: var(--g-muted);
  font-size: 12px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.ts__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0 -6px -4px;
}
</style>
