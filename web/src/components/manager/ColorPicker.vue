<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { hexToHsv, hsvToHex, normalizeHex, readableOn } from '@/services/colorService'
import ManagerIcon from './ManagerIcon.vue'

export interface Swatch {
  /** Lo que se guarda: un hex o el nombre de un color de la paleta ("acento"). */
  value: string
  /** Cómo se ve (hex). */
  color: string
  label: string
}

/**
 * Selector de color: cuadro (saturación y brillo) + barra de matiz + hex, con las muestras
 * de la paleta de la invitación y el cuentagotas del navegador si lo tiene. Se maneja con
 * mouse, dedo o teclado (flechas). Avisa cada cambio mientras se arrastra (la vista previa
 * lo muestra al instante).
 */
const props = defineProps<{ color: string; swatches?: Swatch[] }>()
const emit = defineEmits<{ pick: [value: string] }>()

const hsv = ref(hexToHsv(normalizeHex(props.color) ?? '#96792C'))
const hex = ref(normalizeHex(props.color) ?? '')
watch(
  () => props.color,
  (value) => {
    const next = normalizeHex(value)
    if (next && next !== hsvToHex(hsv.value)) {
      hsv.value = hexToHsv(next)
      hex.value = next
    }
  },
)

const hueColor = computed(() => hsvToHex({ h: hsv.value.h, s: 1, v: 1 }))
const current = computed(() => hsvToHex(hsv.value))
const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

function set(next: Partial<typeof hsv.value>): void {
  hsv.value = { ...hsv.value, ...next }
  hex.value = current.value
  emit('pick', current.value)
}

function drag(e: PointerEvent, apply: (x: number, y: number) => void): void {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const at = (ev: PointerEvent) =>
    apply(
      Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height)),
    )
  target.setPointerCapture(e.pointerId)
  at(e)
  const move = (ev: PointerEvent) => at(ev)
  const up = () => {
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', up)
    target.removeEventListener('pointercancel', up)
  }
  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', up)
  target.addEventListener('pointercancel', up)
}

function onSquare(e: PointerEvent): void {
  drag(e, (x, y) => set({ s: x, v: 1 - y }))
}
function onHue(e: PointerEvent): void {
  drag(e, (x) => set({ h: Math.min(359.9, x * 360) }))
}
function squareKey(e: KeyboardEvent): void {
  const step = e.shiftKey ? 0.1 : 0.02
  const moves: Record<string, Partial<typeof hsv.value>> = {
    ArrowLeft: { s: Math.max(0, hsv.value.s - step) },
    ArrowRight: { s: Math.min(1, hsv.value.s + step) },
    ArrowUp: { v: Math.min(1, hsv.value.v + step) },
    ArrowDown: { v: Math.max(0, hsv.value.v - step) },
  }
  if (moves[e.key]) {
    e.preventDefault()
    set(moves[e.key])
  }
}
function hueKey(e: KeyboardEvent): void {
  const step = e.shiftKey ? 15 : 3
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    set({ h: (hsv.value.h + (e.key === 'ArrowLeft' ? -step : step) + 360) % 360 })
  }
}
function onHex(): void {
  const next = normalizeHex(hex.value)
  if (next) {
    hsv.value = hexToHsv(next)
    hex.value = next
    emit('pick', next)
  } else {
    hex.value = current.value
  }
}
async function eyeDropper(): Promise<void> {
  try {
    const dropper = new (
      window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }
    ).EyeDropper()
    const { sRGBHex } = await dropper.open()
    const next = normalizeHex(sRGBHex)
    if (next) {
      hsv.value = hexToHsv(next)
      hex.value = next
      emit('pick', next)
    }
  } catch {
    // La persona canceló.
  }
}
</script>

<template>
  <div class="picker">
    <div
      class="picker__square"
      :style="{ backgroundColor: hueColor }"
      role="slider"
      tabindex="0"
      aria-label="Saturación y brillo"
      :aria-valuetext="current"
      @pointerdown="onSquare"
      @keydown="squareKey"
    >
      <span
        class="picker__thumb"
        :style="{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: current }"
      />
    </div>
    <div
      class="picker__hue"
      role="slider"
      tabindex="0"
      aria-label="Tono"
      :aria-valuenow="Math.round(hsv.h)"
      aria-valuemin="0"
      aria-valuemax="360"
      @pointerdown="onHue"
      @keydown="hueKey"
    >
      <span
        class="picker__hue-thumb"
        :style="{ left: `${(hsv.h / 360) * 100}%`, background: hueColor }"
      />
    </div>

    <div class="picker__row">
      <span class="picker__preview" :style="{ background: current, color: readableOn(current) }"
        >Aa</span
      >
      <label class="picker__hex">
        <span class="g-sr">Color en hex</span>
        <input
          v-model="hex"
          class="g-input"
          maxlength="7"
          spellcheck="false"
          @change="onHex"
          @keydown.enter.prevent="onHex"
        />
      </label>
      <button
        v-if="hasEyeDropper"
        type="button"
        class="g-icon-btn"
        title="Tomar un color de la pantalla"
        aria-label="Cuentagotas"
        @click="eyeDropper"
      >
        <ManagerIcon name="eye-dropper" />
      </button>
    </div>

    <div v-if="swatches?.length" class="picker__swatches" aria-label="Colores de la invitación">
      <button
        v-for="s in swatches"
        :key="s.value"
        type="button"
        class="picker__swatch"
        :style="{ background: s.color }"
        :title="s.label"
        :aria-label="s.label"
        @click="emit('pick', s.value)"
      />
    </div>
  </div>
</template>

<style scoped>
.picker {
  display: grid;
  gap: 10px;
}
.picker__square {
  position: relative;
  height: 150px;
  border-radius: 10px;
  background-image:
    linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent);
  cursor: crosshair;
  touch-action: none;
}
.picker__thumb,
.picker__hue-thumb {
  position: absolute;
  width: 18px;
  height: 18px;
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.25),
    0 2px 6px rgb(0 0 0 / 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.picker__hue {
  position: relative;
  height: 14px;
  border-radius: 999px;
  background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
  cursor: pointer;
  touch-action: none;
}
.picker__hue-thumb {
  top: 50%;
}
.picker__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.picker__preview {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 9px;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08);
  font-weight: 700;
}
.picker__hex {
  flex: 1;
}
.picker__hex input {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  text-transform: uppercase;
}
.picker__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--g-line);
}
.picker__swatch {
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.12);
  cursor: pointer;
  transition: transform 0.12s var(--g-ease);
}
.picker__swatch:hover {
  transform: scale(1.12);
}
</style>
