<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditor } from '@/composables/useEditorContext'
import { sectionLabel } from '@/services/designService'
import type { AlignMode } from '@/services/arrangeService'
import ColorField from './ColorField.vue'
import FontPicker from './FontPicker.vue'
import GPopover from './GPopover.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * El inspector del modo «Acomodar»: las capas de la sección, y de lo que está elegido en la
 * vista previa su lugar, tamaño y giro (a mano, en %), opacidad, volteo, capas, alinear y
 * repartir. En lo que se agregó, también su texto, letra, color, borde y radio. Todo
 * cambia la pantalla que se está viendo (celular o computadora).
 */
const { arrange, catalog, design, themeFonts } = useEditor()

const sectionName = computed(() =>
  arrange.section.value ? sectionLabel(catalog.value, arrange.section.value) : '',
)
const count = computed(() => arrange.refs.value.length)
const one = computed(() => (count.value === 1 ? arrange.current.value : null))
const first = computed(() => arrange.current.value)
const ref0 = computed(() => arrange.refs.value[0] ?? '')
const measure = computed(() => arrange.measures.value[ref0.value])
const content = computed(() => arrange.frame.value?.content ?? 0)
const allFree = computed(() => count.value > 0 && arrange.refs.value.every((r) => r.startsWith('lienzo-')))
const onlyFree = computed(() => count.value === 1 && allFree.value)
const anyLocked = computed(() => arrange.refs.value.some((r) => arrange.values(r)?.locked))
const allLocked = computed(
  () => count.value > 0 && arrange.refs.value.every((r) => arrange.values(r)?.locked),
)
const allHidden = computed(
  () => count.value > 0 && arrange.refs.value.every((r) => arrange.values(r)?.hidden),
)

/** Medida en % del ancho de la sección (lo que el diseño guarda), a un decimal. */
const pct = (px: number | undefined) =>
  px !== undefined && content.value > 0 ? Math.round((px / content.value) * 1000) / 10 : null
const numbers = computed(() => ({
  x: one.value ? Math.round(one.value.x * 10) / 10 : null,
  y: one.value ? Math.round(one.value.y * 10) / 10 : null,
  width: pct(measure.value?.w),
  height: pct(measure.value?.h),
  rotation: one.value ? Math.round(one.value.rotation * 10) / 10 : null,
}))

function onNumber(field: 'x' | 'y' | 'width' | 'height' | 'rotation', event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.value.trim() === '') return
  arrange.setNumber(field, Number(input.value))
}

const ALIGN: { mode: AlignMode; label: string; glyph: string }[] = [
  { mode: 'left', label: 'Alinear a la izquierda', glyph: '⇤' },
  { mode: 'hcenter', label: 'Centrar horizontalmente', glyph: '↔' },
  { mode: 'right', label: 'Alinear a la derecha', glyph: '⇥' },
  { mode: 'top', label: 'Alinear arriba', glyph: '⤒' },
  { mode: 'vcenter', label: 'Centrar verticalmente', glyph: '↕' },
  { mode: 'bottom', label: 'Alinear abajo', glyph: '⤓' },
]
const alignTo = ref<'section' | 'selection'>('section')

const raw = (field: string) => first.value?.row[field] ?? ''
const rawNumber = (field: string, fallback: number) => {
  const n = Number(raw(field).replace(',', '.'))
  return raw(field).trim() !== '' && Number.isFinite(n) ? n : fallback
}
const fontButton = ref<HTMLElement | null>(null)
const fontOpen = ref(false)
const fontsInUse = computed(() => {
  const listed = Object.values(design.value.fonts)
  const theme = Object.values(themeFonts.value).map(
    (v) => v.split(',')[0]?.replace(/["']/g, '').trim() ?? '',
  )
  return [...listed, ...theme].filter((f) => /^[A-Za-z0-9 ]{2,60}$/.test(f))
})
const ALIGN_TEXT = [
  { value: 'izquierda', label: 'Izquierda' },
  { value: 'centro', label: 'Centro' },
  { value: 'derecha', label: 'Derecha' },
]
const textAlign = computed(() => {
  const v = raw('alineacion').trim().toLowerCase()
  return ALIGN_TEXT.some((o) => o.value === v) ? v : 'centro'
})
const kindIcon = { text: 'font', image: 'image', shape: 'square', target: 'hand-pointer' } as const

function choose(ref: string, event: MouseEvent): void {
  const current = arrange.refs.value
  if (event.shiftKey || event.metaKey || event.ctrlKey) {
    arrange.choose(current.includes(ref) ? current.filter((r) => r !== ref) : [...current, ref])
  } else arrange.choose([ref])
}
</script>

<template>
  <div class="arr">
    <header class="arr__head">
      <span class="arr__icon"><ManagerIcon name="up-down-left-right" /></span>
      <div class="arr__title">
        <h2>Acomodar</h2>
        <p v-if="arrange.section.value">{{ sectionName }}</p>
        <p v-else>Toca una sección en la vista previa.</p>
      </div>
    </header>

    <p
      class="g-note arr__device"
      :class="{ 'g-note--warn': arrange.desktop.value }"
      role="status"
    >
      <ManagerIcon :name="arrange.desktop.value ? 'desktop' : 'mobile-screen'" />
      <span v-if="arrange.desktop.value">
        <strong>Editando escritorio.</strong> Lo que muevas aquí cambia solo en computadora; el
        celular no se toca.
      </span>
      <span v-else>
        <strong>Editando celular.</strong> En computadora se ve igual, salvo lo que muevas en esa
        vista.
      </span>
    </p>

    <div class="arr__scroll">
      <div v-if="!arrange.section.value" class="g-empty">
        <ManagerIcon name="hand-pointer" />
        <span>Toca un texto, una imagen o una sección de la vista previa para acomodarla.</span>
      </div>

      <template v-else>
        <section class="g-group">
          <h3 class="g-group__title">Capas <small>de arriba hacia abajo</small></h3>
          <p v-if="!arrange.layers.value.length" class="g-help">
            Aún no hay nada acomodado aquí. Toca un texto o una imagen, o usa «Agregar».
          </p>
          <ul v-else class="arr__layers" aria-label="Capas de la sección">
            <li
              v-for="layer in arrange.layers.value"
              :key="layer.ref"
              :class="{ 'is-on': arrange.refs.value.includes(layer.ref) }"
            >
              <button
                type="button"
                class="arr__layer"
                :aria-pressed="arrange.refs.value.includes(layer.ref)"
                @click="choose(layer.ref, $event)"
              >
                <ManagerIcon :name="kindIcon[layer.kind]" />
                <span class="arr__layer-name">{{ layer.label }}</span>
                <ManagerIcon v-if="layer.locked" name="lock" label="Bloqueado" />
                <ManagerIcon v-if="layer.hidden" name="eye-slash" label="Oculto" />
              </button>
            </li>
          </ul>
        </section>

        <p v-if="!count" class="g-help arr__hint">
          Elige un elemento en la vista previa o en la lista. Con Shift eliges varios, o arrastra
          un recuadro. Las flechas lo mueven 1 px (con Shift, 10).
        </p>

        <template v-else>
          <section class="g-group">
            <h3 class="g-group__title">
              {{ count === 1 ? 'Posición y tamaño' : `${count} elementos` }}
            </h3>
            <div v-if="one" class="arr__grid">
              <label>
                <span>{{ one.free ? 'X' : 'Mover X' }}</span>
                <input
                  class="g-input"
                  type="number"
                  step="0.5"
                  :disabled="one.locked"
                  :value="numbers.x ?? ''"
                  :aria-label="one.free ? 'Posición X en %' : 'Desplazamiento X en %'"
                  @change="onNumber('x', $event)"
                />
              </label>
              <label>
                <span>{{ one.free ? 'Y' : 'Mover Y' }}</span>
                <input
                  class="g-input"
                  type="number"
                  step="0.5"
                  :disabled="one.locked"
                  :value="numbers.y ?? ''"
                  :aria-label="one.free ? 'Posición Y en %' : 'Desplazamiento Y en %'"
                  @change="onNumber('y', $event)"
                />
              </label>
              <label>
                <span>Ancho</span>
                <input
                  class="g-input"
                  type="number"
                  step="0.5"
                  min="1"
                  :disabled="one.locked || numbers.width === null"
                  :value="numbers.width ?? ''"
                  aria-label="Ancho en %"
                  @change="onNumber('width', $event)"
                />
              </label>
              <label>
                <span>Alto</span>
                <input
                  class="g-input"
                  type="number"
                  step="0.5"
                  min="1"
                  :disabled="one.locked || numbers.height === null"
                  :value="numbers.height ?? ''"
                  aria-label="Alto en %"
                  @change="onNumber('height', $event)"
                />
              </label>
              <label>
                <span>Giro °</span>
                <input
                  class="g-input"
                  type="number"
                  step="1"
                  min="-360"
                  max="360"
                  :disabled="one.locked"
                  :value="numbers.rotation ?? ''"
                  aria-label="Giro en grados"
                  @change="onNumber('rotation', $event)"
                />
              </label>
            </div>
            <p v-if="one" class="g-help">
              Medidas en % del ancho de la sección. Ancho y alto cambian el tamaño sin deformar.
            </p>

            <label v-if="first" class="arr__opacity">
              <span>Opacidad</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                :value="first.opacity"
                :disabled="anyLocked"
                aria-label="Opacidad"
                @input="arrange.setOpacity(Number(($event.target as HTMLInputElement).value))"
              />
              <output>{{ first.opacity }} %</output>
            </label>

            <div class="arr__row" role="group" aria-label="Voltear, bloquear y ocultar">
              <button
                type="button"
                class="g-btn g-btn--small"
                :aria-pressed="!!first?.flipH"
                :disabled="anyLocked"
                @click="arrange.toggle('flipH')"
              >
                ⇋ Voltear
              </button>
              <button
                type="button"
                class="g-btn g-btn--small"
                :aria-pressed="!!first?.flipV"
                :disabled="anyLocked"
                @click="arrange.toggle('flipV')"
              >
                ⇵ Voltear
              </button>
              <button
                type="button"
                class="g-btn g-btn--small"
                :aria-pressed="allLocked"
                @click="arrange.toggle('locked')"
              >
                <ManagerIcon :name="allLocked ? 'lock' : 'lock-open'" />
                {{ allLocked ? 'Desbloquear' : 'Bloquear' }}
              </button>
              <button type="button" class="g-btn g-btn--small" @click="arrange.toggle('hidden')">
                <ManagerIcon :name="allHidden ? 'eye' : 'eye-slash'" />
                {{ allHidden ? 'Mostrar' : 'Ocultar' }}
              </button>
            </div>
          </section>

          <section class="g-group">
            <h3 class="g-group__title">Capas y orden</h3>
            <div class="arr__row" role="group" aria-label="Orden de las capas">
              <button
                type="button"
                class="g-btn g-btn--small"
                :disabled="!allFree"
                @click="arrange.stack('front')"
              >
                <ManagerIcon name="arrow-up" /> Al frente
              </button>
              <button
                type="button"
                class="g-btn g-btn--small"
                :disabled="!allFree"
                @click="arrange.stack('forward')"
              >
                Un paso adelante
              </button>
              <button
                type="button"
                class="g-btn g-btn--small"
                :disabled="!allFree"
                @click="arrange.stack('backward')"
              >
                Un paso atrás
              </button>
              <button
                type="button"
                class="g-btn g-btn--small"
                :disabled="!allFree"
                @click="arrange.stack('back')"
              >
                <ManagerIcon name="arrow-down" /> Al fondo
              </button>
            </div>
            <p v-if="!allFree" class="g-help">
              El orden solo cambia en lo que agregaste; los textos e imágenes de la sección
              mantienen el suyo.
            </p>
          </section>

          <section class="g-group">
            <h3 class="g-group__title">Alinear y repartir</h3>
            <div v-if="count > 1" class="g-segmented" aria-label="Alinear con">
              <button
                type="button"
                :aria-pressed="alignTo === 'section'"
                @click="alignTo = 'section'"
              >
                A la sección
              </button>
              <button
                type="button"
                :aria-pressed="alignTo === 'selection'"
                @click="alignTo = 'selection'"
              >
                Entre sí
              </button>
            </div>
            <div class="arr__row" role="group" aria-label="Alinear">
              <button
                v-for="a in ALIGN"
                :key="a.mode"
                type="button"
                class="g-icon-btn arr__glyph"
                :title="a.label"
                :aria-label="a.label"
                :disabled="anyLocked && allLocked"
                @click="arrange.align(a.mode, count > 1 ? alignTo : 'section')"
              >
                {{ a.glyph }}
              </button>
            </div>
            <div class="arr__row" role="group" aria-label="Repartir">
              <button
                type="button"
                class="g-btn g-btn--small"
                :disabled="count < 3"
                @click="arrange.distribute('h')"
              >
                Repartir a lo ancho
              </button>
              <button
                type="button"
                class="g-btn g-btn--small"
                :disabled="count < 3"
                @click="arrange.distribute('v')"
              >
                Repartir a lo alto
              </button>
            </div>
          </section>

          <section v-if="onlyFree && first" class="g-group">
            <h3 class="g-group__title">
              {{ first.kind === 'text' ? 'Texto' : first.kind === 'image' ? 'Imagen' : 'Forma' }}
            </h3>
            <label v-if="first.kind === 'text'" class="arr__field">
              <span>Texto</span>
              <textarea
                class="g-textarea"
                rows="3"
                maxlength="600"
                :value="raw('texto')"
                @input="arrange.setRaw('texto', ($event.target as HTMLTextAreaElement).value)"
              />
            </label>
            <template v-if="first.kind === 'text'">
              <div class="arr__field">
                <span>Letra</span>
                <button
                  ref="fontButton"
                  type="button"
                  class="g-btn g-btn--small"
                  :aria-expanded="fontOpen"
                  @click="fontOpen = !fontOpen"
                >
                  <span :style="raw('letra') ? { fontFamily: `'${raw('letra')}', serif` } : undefined">{{
                    raw('letra') || 'Del diseño'
                  }}</span>
                  <ManagerIcon name="chevron-down" />
                </button>
              </div>
              <label class="arr__opacity">
                <span>Tamaño</span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  :value="rawNumber('tamano', 6)"
                  aria-label="Tamaño del texto"
                  @input="arrange.setRaw('tamano', ($event.target as HTMLInputElement).value)"
                />
                <output>{{ rawNumber('tamano', 6) }}</output>
              </label>
              <div class="g-segmented" aria-label="Alineación del texto">
                <button
                  v-for="o in ALIGN_TEXT"
                  :key="o.value"
                  type="button"
                  :aria-pressed="textAlign === o.value"
                  @click="arrange.setRaw('alineacion', o.value)"
                >
                  {{ o.label }}
                </button>
              </div>
            </template>
            <div class="arr__field">
              <span>{{ first.kind === 'image' ? 'Color del borde' : 'Color' }}</span>
              <ColorField
                :model-value="raw('color')"
                label="Color del elemento"
                fallback="El del diseño"
                @update:model-value="(v) => arrange.setRaw('color', v)"
              />
            </div>
            <template v-if="first.kind !== 'text'">
              <label class="arr__opacity">
                <span>Borde</span>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  :value="rawNumber('borde', 0)"
                  aria-label="Grosor del borde"
                  @input="arrange.setRaw('borde', ($event.target as HTMLInputElement).value)"
                />
                <output>{{ rawNumber('borde', 0) }} px</output>
              </label>
              <label class="arr__opacity">
                <span>Esquinas</span>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  :value="rawNumber('radio', 0)"
                  aria-label="Redondeo de las esquinas"
                  @input="arrange.setRaw('radio', ($event.target as HTMLInputElement).value)"
                />
                <output>{{ rawNumber('radio', 0) }} %</output>
              </label>
            </template>
          </section>

          <section class="g-group">
            <div class="arr__row">
              <button
                type="button"
                class="g-btn g-btn--small"
                :disabled="!allFree"
                title="Duplicar (⌘D)"
                @click="arrange.duplicate()"
              >
                <ManagerIcon name="copy" /> Duplicar
              </button>
              <button
                type="button"
                class="g-btn g-btn--small"
                title="Volver a su lugar: quita lo movido en esta pantalla"
                @click="arrange.reset()"
              >
                <ManagerIcon name="rotate-left" /> Volver a su lugar
              </button>
              <button
                type="button"
                class="g-btn g-btn--small g-btn--danger"
                :disabled="!allFree"
                title="Eliminar (Supr)"
                @click="arrange.remove()"
              >
                <ManagerIcon name="trash-can" /> Eliminar
              </button>
            </div>
          </section>
        </template>
      </template>
    </div>

    <GPopover :open="fontOpen" :anchor="fontButton" :width="300" @close="fontOpen = false">
      <FontPicker
        :model-value="raw('letra')"
        :sample="raw('texto')"
        :in-use="fontsInUse"
        @pick="(f) => (arrange.setRaw('letra', f), (fontOpen = false))"
      />
    </GPopover>
  </div>
</template>

<style scoped>
.arr {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.arr__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px 8px;
}
.arr__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--g-accent-soft);
  color: var(--g-accent);
}
.arr__title h2 {
  margin: 0;
  font-size: 16px;
}
.arr__title p {
  margin: 2px 0 0;
  color: var(--g-muted);
  font-size: 12.5px;
}
.arr__device {
  margin: 0 16px 8px;
}
.arr__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px 24px;
}
.arr__hint {
  margin: 12px 0;
}
.arr__layers {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.arr__layer {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--g-line);
  border-radius: 8px;
  background: var(--g-surface);
  color: var(--g-text);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.arr__layer[aria-pressed='true'] {
  border-color: var(--g-accent);
  background: var(--g-accent-soft);
}
.arr__layer-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.arr__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.arr__grid label,
.arr__field {
  display: grid;
  gap: 3px;
  font-size: 12px;
  color: var(--g-muted);
}
.arr__field {
  margin-top: 8px;
}
.arr__opacity {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) 52px;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 12px;
  color: var(--g-muted);
}
.arr__opacity output {
  text-align: right;
  color: var(--g-text);
}
.arr__row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.arr__row .g-btn[aria-pressed='true'] {
  border-color: var(--g-accent);
  background: var(--g-accent-soft);
}
.arr__glyph {
  width: 34px;
  height: 34px;
  font-size: 16px;
}
</style>
