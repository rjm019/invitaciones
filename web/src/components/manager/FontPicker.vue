<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFontSamples } from '@/composables/useFontSamples'
import { FONT_CATEGORIES, FONTS, type FontCategory } from '@/services/fontCatalog'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Elegir una letra de Google Fonts: cada opción se ve con el texto real ("Itinerario"), las
 * de esta invitación primero y luego por estilo. También se puede escribir cualquier otra.
 */
const props = defineProps<{
  modelValue: string
  sample: string
  inUse: string[]
  inherited?: string | null
}>()
const emit = defineEmits<{ pick: [family: string] }>()

const search = ref('')
const custom = ref('')
const sampleText = computed(() => (props.sample.trim() || 'Aa Bb').slice(0, 40))

const groups = computed(() => {
  const q = search.value.trim().toLowerCase()
  const match = (f: string) => !q || f.toLowerCase().includes(q)
  const used = [...new Set(props.inUse)].filter(match)
  const out: { label: string; fonts: string[] }[] = []
  if (used.length) out.push({ label: 'De esta invitación', fonts: used })
  for (const category of Object.keys(FONT_CATEGORIES) as FontCategory[]) {
    const fonts = FONTS.filter((f) => f.category === category && !used.includes(f.family))
      .map((f) => f.family)
      .filter(match)
    if (fonts.length) out.push({ label: FONT_CATEGORIES[category], fonts })
  }
  return out
})

useFontSamples(
  () => [...new Set([...props.inUse, ...FONTS.map((f) => f.family)])],
  () => sampleText.value,
)

function useCustom(): void {
  const family = custom.value.trim().replace(/\s+/g, ' ')
  if (/^[A-Za-z0-9][A-Za-z0-9 ]{1,59}$/.test(family)) emit('pick', family)
}
</script>

<template>
  <div class="fonts">
    <label class="fonts__search">
      <ManagerIcon name="magnifying-glass" />
      <span class="g-sr">Buscar letra</span>
      <input v-model="search" type="search" placeholder="Buscar letra" />
    </label>

    <div class="fonts__list" role="listbox" aria-label="Letras">
      <button
        type="button"
        class="fonts__option fonts__option--reset"
        role="option"
        :aria-selected="!modelValue"
        @click="emit('pick', '')"
      >
        <span class="fonts__name">Del diseño{{ inherited ? ` (${inherited})` : '' }}</span>
        <ManagerIcon v-if="!modelValue" name="check" />
      </button>
      <template v-for="group in groups" :key="group.label">
        <p class="fonts__group">{{ group.label }}</p>
        <button
          v-for="family in group.fonts"
          :key="family"
          type="button"
          class="fonts__option"
          role="option"
          :aria-selected="modelValue === family"
          @click="emit('pick', family)"
        >
          <span class="fonts__sample" :style="{ fontFamily: `'${family}', serif` }">{{
            sampleText
          }}</span>
          <span class="fonts__name">{{ family }}</span>
          <ManagerIcon v-if="modelValue === family" name="check" />
        </button>
      </template>
    </div>

    <form class="fonts__custom" @submit.prevent="useCustom">
      <input v-model="custom" class="g-input" placeholder="Otra de Google Fonts…" maxlength="60" />
      <button type="submit" class="g-btn g-btn--small" :disabled="!custom.trim()">Usar</button>
    </form>
  </div>
</template>

<style scoped>
.fonts {
  display: grid;
  gap: 8px;
}
.fonts__search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--g-line-strong);
  border-radius: 9px;
  color: var(--g-faint);
}
.fonts__search input {
  flex: 1;
  min-height: 34px;
  border: 0;
  outline: none;
  background: transparent;
}
.fonts__list {
  display: grid;
  max-height: 320px;
  margin: 0 -6px;
  overflow: auto;
}
.fonts__group {
  margin: 8px 8px 2px;
  color: var(--g-faint);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.fonts__option {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 2px 8px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--g-text);
  text-align: left;
  cursor: pointer;
}
.fonts__option:hover,
.fonts__option[aria-selected='true'] {
  background: var(--g-surface-3);
}
.fonts__option .g-icon {
  grid-row: span 2;
  color: var(--g-accent);
}
.fonts__sample {
  overflow: hidden;
  font-size: 22px;
  line-height: 1.25;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.fonts__name {
  color: var(--g-faint);
  font-size: 11.5px;
}
.fonts__option--reset .fonts__name {
  color: var(--g-text);
  font-size: 13px;
  font-weight: 600;
}
.fonts__custom {
  display: flex;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--g-line);
}
</style>
