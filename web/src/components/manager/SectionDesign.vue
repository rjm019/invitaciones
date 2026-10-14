<script setup lang="ts">
import { computed } from 'vue'
import { useEditor } from '@/composables/useEditorContext'
import type { CatalogSection, DesignSection } from '@/types/design'
import ColorField from './ColorField.vue'
import FieldInput from './FieldInput.vue'
import ImageField from './ImageField.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Pestaña "Diseño" de una sección: fondo, colores propios, imágenes del tema, animaciones,
 * variante y ancho en computadora. Lo que no se toca queda como lo pone el tema.
 */
const props = defineProps<{ section: DesignSection; def: CatalogSection | undefined }>()
const { catalog, theme, design, setField, setFields, resolveAsset, themeColors } = useEditor()

const f = computed(() => props.section.fields)
const defaults = computed(
  () => (props.def ? theme.value?.sections[props.def.type] : undefined) ?? {},
)
const common = (key: string) => catalog.value.common.find((c) => c.key === key)!
const variant = computed(() => props.def?.fields.find((x) => x.key === 'variante'))

// Colores propios: los principales de la paleta, encima de los de la invitación.
const SECTION_COLORS = ['texto', 'primario', 'acento', 'superficie']
const ownColors = computed(() =>
  Object.keys(f.value).some((k) => k.startsWith('color_') && k !== 'color_fondo'),
)
function paletteColor(key: string): string | null {
  const def = catalog.value.colors.find((c) => c.key === key)
  return design.value.colors[key] ?? themeColors.value[def?.token ?? key] ?? null
}
function toggleOwnColors(on: boolean): void {
  if (on) {
    setFields(props.section.id, { color_texto: paletteColor('texto') ?? '#333333' })
  } else {
    const off: Record<string, string> = {}
    Object.keys(f.value)
      .filter((k) => k.startsWith('color_') && k !== 'color_fondo')
      .forEach((k) => (off[k] = ''))
    setFields(props.section.id, off)
  }
}

// Imágenes del tema que la sección puede cambiar o quitar.
const slots = computed(() =>
  (props.def?.slots ?? []).map((slot) => ({
    ...slot,
    field: `imagen_${slot.key}`,
    value: f.value[`imagen_${slot.key}`] ?? '',
    themeFile: defaults.value.decor?.[slot.slot] ?? null,
  })),
)

// Animaciones: vacío = las del tema; "ninguno" = sin animaciones.
const themeEffects = computed(() => defaults.value.effects ?? [])
const effectKeys = computed(() => (f.value.efectos ?? '').split(/[\s,;|]+/).filter(Boolean))
const effectsMode = computed<'theme' | 'none' | 'own'>(() =>
  !effectKeys.value.length
    ? 'theme'
    : effectKeys.value.some((e) => ['ninguno', 'none'].includes(e))
      ? 'none'
      : 'own',
)
const themeEffectKeys = computed(() =>
  themeEffects.value.map(
    (code) => catalog.value.effects.find((e) => e.effect === code)?.key ?? code,
  ),
)
function effectOn(key: string): boolean {
  return effectsMode.value === 'own'
    ? effectKeys.value.includes(key)
    : effectsMode.value === 'theme' && themeEffectKeys.value.includes(key)
}
function toggleEffect(key: string): void {
  const base =
    effectsMode.value === 'own'
      ? effectKeys.value
      : effectsMode.value === 'theme'
        ? themeEffectKeys.value
        : []
  const next = base.includes(key) ? base.filter((k) => k !== key) : [...base, key]
  setField(props.section.id, 'efectos', next.length ? next.join(' ') : 'ninguno')
}
</script>

<template>
  <div class="design">
    <section class="g-group">
      <h3 class="g-group__title">Fondo</h3>
      <FieldInput
        :def="{ ...common('fondo'), label: 'Imagen de fondo' }"
        :model-value="f.fondo ?? ''"
        :fallback-image="defaults.background?.image ?? null"
        @update:model-value="(v) => setField(section.id, 'fondo', v)"
      />
      <template v-if="f.fondo || defaults.background?.image">
        <FieldInput
          :def="common('fondo_ajuste')"
          :model-value="f.fondo_ajuste ?? ''"
          @update:model-value="(v) => setField(section.id, 'fondo_ajuste', v)"
        />
        <FieldInput
          :def="common('overlay')"
          :model-value="f.overlay ?? ''"
          @update:model-value="(v) => setField(section.id, 'overlay', v)"
        />
        <FieldInput
          :def="common('fijo')"
          :model-value="f.fijo ?? ''"
          @update:model-value="(v) => setField(section.id, 'fijo', v)"
        />
      </template>
      <div class="g-field">
        <span class="g-label">Color de fondo</span>
        <ColorField
          :model-value="f.color_fondo ?? ''"
          label="Color de fondo"
          @update:model-value="(v) => setField(section.id, 'color_fondo', v)"
        />
        <p class="g-help">Sin color: el panel toma el que le toca del diseño.</p>
      </div>
    </section>

    <section class="g-group">
      <h3 class="g-group__title">
        Colores de la sección
        <label class="g-switch">
          <input
            type="checkbox"
            :checked="ownColors"
            @change="toggleOwnColors(($event.target as HTMLInputElement).checked)"
          />
          <span class="g-switch__track" />
          <span class="g-sr">Usar colores propios</span>
        </label>
      </h3>
      <p v-if="!ownColors" class="g-help">
        Usa los colores de toda la invitación. Actívalo para darle a esta sección los suyos.
      </p>
      <div v-else class="design__colors">
        <div v-for="key in SECTION_COLORS" :key="key" class="design__color">
          <span>{{ catalog.colors.find((c) => c.key === key)?.label }}</span>
          <ColorField
            :model-value="f[`color_${key}`] ?? ''"
            :fallback="paletteColor(key)"
            :label="catalog.colors.find((c) => c.key === key)?.label"
            @update:model-value="(v) => setField(section.id, `color_${key}`, v)"
          />
        </div>
        <p class="g-help">Las imágenes del tema (adornos) no cambian de color.</p>
      </div>
    </section>

    <section v-if="slots.length" class="g-group">
      <h3 class="g-group__title">Imágenes del diseño</h3>
      <div class="design__slots">
        <div
          v-for="slot in slots"
          :key="slot.key"
          class="slot"
          :class="{ 'is-off': slot.value === catalog.no_image }"
        >
          <ImageField
            :model-value="slot.value === catalog.no_image ? '' : slot.value"
            :label="slot.label"
            :fallback="slot.value === catalog.no_image ? null : slot.themeFile"
            purpose="adorno"
            trim
            @update:model-value="(v) => setField(section.id, slot.field, v)"
          />
          <div class="slot__foot">
            <strong>{{ slot.label }}</strong>
            <button
              v-if="slot.value !== catalog.no_image"
              type="button"
              class="g-btn g-btn--ghost g-btn--small"
              @click="setField(section.id, slot.field, catalog.no_image)"
            >
              <ManagerIcon name="eye-slash" /> Quitar
            </button>
            <button
              v-else
              type="button"
              class="g-btn g-btn--ghost g-btn--small"
              @click="setField(section.id, slot.field, '')"
            >
              <ManagerIcon name="eye" /> Mostrar
            </button>
          </div>
          <img
            v-if="slot.value === catalog.no_image && resolveAsset(slot.themeFile)"
            class="slot__ghost"
            :src="resolveAsset(slot.themeFile) ?? ''"
            alt=""
          />
        </div>
      </div>
    </section>

    <section class="g-group">
      <h3 class="g-group__title">
        Animaciones
        <small v-if="effectsMode === 'theme'">las del diseño</small>
        <small v-else-if="effectsMode === 'none'">sin animaciones</small>
      </h3>
      <div class="g-chips">
        <button
          v-for="e in catalog.effects"
          :key="e.key"
          type="button"
          class="g-chip"
          :aria-pressed="effectOn(e.key)"
          :title="e.help"
          @click="toggleEffect(e.key)"
        >
          {{ e.label }}
        </button>
      </div>
      <div class="design__effects-actions">
        <button
          v-if="effectsMode !== 'theme'"
          type="button"
          class="g-btn g-btn--ghost g-btn--small"
          @click="setField(section.id, 'efectos', '')"
        >
          <ManagerIcon name="rotate-left" /> Usar las del diseño
        </button>
        <button
          v-if="effectsMode !== 'none'"
          type="button"
          class="g-btn g-btn--ghost g-btn--small"
          @click="setField(section.id, 'efectos', 'ninguno')"
        >
          Sin animaciones
        </button>
      </div>
    </section>

    <section class="g-group">
      <h3 class="g-group__title">Acomodo</h3>
      <FieldInput
        v-if="variant"
        :def="variant"
        :model-value="f.variante ?? ''"
        @update:model-value="(v) => setField(section.id, 'variante', v)"
      />
      <FieldInput
        :def="common('escritorio')"
        :model-value="f.escritorio ?? ''"
        @update:model-value="(v) => setField(section.id, 'escritorio', v)"
      />
      <p class="g-help">En computadora, dos secciones de "media fila" seguidas van lado a lado.</p>
    </section>
  </div>
</template>

<style scoped>
.design__colors {
  display: grid;
  gap: 8px;
}
.design__color {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}
.design__slots {
  display: grid;
  gap: 10px;
}
.slot {
  position: relative;
  display: grid;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--g-line);
  border-radius: 10px;
}
.slot.is-off {
  background: var(--g-surface-2);
}
.slot__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
}
.slot__ghost {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 64px;
  height: 64px;
  object-fit: contain;
  opacity: 0.25;
  filter: grayscale(1);
  pointer-events: none;
}
.design__effects-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}
</style>
