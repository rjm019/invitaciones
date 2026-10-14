<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditor } from '@/composables/useEditorContext'
import { normalizeHex } from '@/services/colorService'
import ColorPicker, { type Swatch } from './ColorPicker.vue'
import GPopover from './GPopover.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Un color de la invitación: la muestra, su nombre ("Acento", "#C2185B" o "Del tema") y el
 * selector. Guarda un hex o, con `tokens`, el nombre de un color de la paleta (así sigue a
 * la paleta si esta cambia). Vacío = el color que pone el tema (`fallback`).
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    fallback?: string | null
    tokens?: boolean
    compact?: boolean
    clearable?: boolean
  }>(),
  { label: undefined, fallback: null, tokens: true, compact: false, clearable: true },
)
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { catalog, design, themeColors } = useEditor()

const button = ref<HTMLElement | null>(null)
const open = ref(false)

/** Color de un nombre de la paleta: lo de la invitación o lo del tema. */
function tokenColor(key: string): string | null {
  const def = catalog.value.colors.find((c) => c.key === key)
  const own = normalizeHex(design.value.colors[key] ?? '')
  const token = def?.token ?? key.replace(/_/g, '-')
  return own ?? normalizeHex(themeColors.value[token] ?? '') ?? null
}

const swatches = computed<Swatch[]>(() =>
  catalog.value.colors
    .map((c) => ({
      value: props.tokens ? c.key : (tokenColor(c.key) ?? ''),
      color: tokenColor(c.key) ?? '',
      label: c.label,
    }))
    .filter((s) => s.color && s.value),
)
const value = computed(() => props.modelValue.trim())
const isToken = computed(() => value.value !== '' && !value.value.startsWith('#'))
const shown = computed(() => {
  if (!value.value) return normalizeHex(props.fallback ?? '') ?? null
  return isToken.value ? tokenColor(value.value) : normalizeHex(value.value)
})
const text = computed(() => {
  if (!value.value) return 'Del tema'
  if (isToken.value)
    return catalog.value.colors.find((c) => c.key === value.value)?.label ?? value.value
  return normalizeHex(value.value) ?? value.value
})
</script>

<template>
  <div class="color-field" :class="{ 'color-field--compact': compact }">
    <button
      ref="button"
      type="button"
      class="color-field__button"
      :aria-label="`${label ?? 'Color'}: ${text}`"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span
        class="color-field__swatch"
        :class="{ 'is-empty': !shown }"
        :style="shown ? { background: shown } : undefined"
      />
      <span v-if="!compact" class="color-field__text" :class="{ 'is-muted': !value }">{{
        text
      }}</span>
    </button>
    <button
      v-if="clearable && value && !compact"
      type="button"
      class="g-icon-btn color-field__clear"
      title="Volver al color del tema"
      aria-label="Volver al color del tema"
      @click="emit('update:modelValue', '')"
    >
      <ManagerIcon name="rotate-left" />
    </button>

    <GPopover :open="open" :anchor="button" :width="268" @close="open = false">
      <ColorPicker
        :color="shown ?? '#96792C'"
        :swatches="swatches"
        @pick="(v) => emit('update:modelValue', v)"
      />
    </GPopover>
  </div>
</template>

<style scoped>
.color-field {
  display: flex;
  align-items: center;
  gap: 4px;
}
.color-field__button {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 36px;
  padding: 4px 10px 4px 5px;
  border: 1px solid var(--g-line-strong);
  border-radius: 9px;
  background: var(--g-surface);
  color: var(--g-text);
  font: 500 13px/1 var(--g-font);
  cursor: pointer;
}
.color-field--compact .color-field__button {
  padding: 4px;
  min-height: 32px;
}
.color-field__button:hover {
  border-color: var(--g-faint);
}
.color-field__swatch {
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 7px;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.12);
}
.color-field--compact .color-field__swatch {
  width: 22px;
  height: 22px;
}
.color-field__swatch.is-empty {
  background:
    linear-gradient(
      45deg,
      transparent 46%,
      var(--g-danger) 46%,
      var(--g-danger) 54%,
      transparent 54%
    ),
    var(--g-surface-2);
}
.color-field__text {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
}
.color-field__text.is-muted {
  color: var(--g-faint);
  font-family: var(--g-font);
}
.color-field__clear {
  width: 28px;
  height: 28px;
}
</style>
