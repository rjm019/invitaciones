<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

/**
 * Un panel flotante junto a su ancla (el selector de color, el de letras, un menú). Se
 * acomoda para no salirse de la pantalla y se cierra tocando afuera o con Esc.
 *
 * Se pinta al final del gestor (.mgr), no dentro de su ancla: una tarjeta que se levanta
 * al pasar el puntero (transform) o que recorta lo que sobra (overflow) lo dejaba
 * encerrado y fuera de la vista.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    anchor: HTMLElement | null
    width?: number
    align?: 'start' | 'end'
  }>(),
  { width: 280, align: 'start' },
)
const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)
const style = ref<Record<string, string>>({})
// Dentro de .mgr, para que siga con los colores y la letra del gestor (o de su ventana, si
// está en una: lo de afuera queda detrás y sin responder).
const host = computed(() => props.anchor?.closest<HTMLElement>('dialog, .mgr') ?? 'body')

function place(): void {
  if (!props.anchor || !panel.value) return
  const a = props.anchor.getBoundingClientRect()
  const height = panel.value.offsetHeight
  const width = Math.min(props.width, window.innerWidth - 16)
  let left = props.align === 'end' ? a.right - width : a.left
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
  // Abajo si cabe; si no, arriba; si tampoco, pegado al borde.
  let top = a.bottom + 6
  if (top + height > window.innerHeight - 8) top = a.top - height - 6
  top = Math.max(8, Math.min(top, window.innerHeight - height - 8))
  style.value = { top: `${top}px`, left: `${left}px`, width: `${width}px` }
}

function onDocument(e: Event): void {
  const target = e.target as Node
  if (panel.value?.contains(target) || props.anchor?.contains(target)) return
  emit('close')
}
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('close')
    props.anchor?.focus()
  }
}

function listen(on: boolean): void {
  if (on) {
    document.addEventListener('pointerdown', onDocument, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
  } else {
    document.removeEventListener('pointerdown', onDocument, true)
    document.removeEventListener('keydown', onKey, true)
    window.removeEventListener('resize', place)
    window.removeEventListener('scroll', place, true)
  }
}

watch(
  () => props.open,
  async (open) => {
    listen(open)
    if (open) {
      await nextTick()
      place()
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => listen(false))
</script>

<template>
  <Teleport :to="host">
    <div v-if="open" ref="panel" class="g-popover" role="dialog" :style="style">
      <slot />
    </div>
  </Teleport>
</template>

<style scoped>
.g-popover {
  position: fixed;
  z-index: 60;
  padding: 12px;
  border: 1px solid var(--g-line);
  border-radius: 14px;
  background: var(--g-surface, #fff);
  box-shadow: var(--g-shadow-lg);
  animation: g-pop-in 0.16s var(--g-ease, ease-out);
}
@keyframes g-pop-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .g-popover {
    animation: none;
  }
}
</style>
