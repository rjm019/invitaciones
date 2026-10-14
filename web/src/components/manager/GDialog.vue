<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Ventana del gestor (<dialog> nativo: atrapa el foco, Esc la cierra y la página de atrás
 * no se mueve). Se abre con `open`; avisa `close` al cerrarla con Esc, la X o tocando afuera.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    dismissable?: boolean
  }>(),
  { size: 'md', dismissable: true },
)
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)

function sync(open: boolean): void {
  const el = dialog.value
  if (!el) return
  if (open && !el.open) el.showModal()
  if (!open && el.open) el.close()
}

watch(() => props.open, sync, { flush: 'post' })
onMounted(() => sync(props.open))

function close(): void {
  if (props.dismissable) emit('close')
}
// Un toque en el fondo (fuera de la caja) también cierra.
function onClick(e: MouseEvent): void {
  if (e.target === dialog.value) close()
}
</script>

<template>
  <dialog
    ref="dialog"
    class="g-dialog"
    :class="`g-dialog--${size}`"
    :aria-label="title"
    @cancel.prevent="close"
    @click="onClick"
  >
    <div class="g-dialog__box">
      <header class="g-dialog__head">
        <h2>{{ title }}</h2>
        <button
          v-if="dismissable"
          type="button"
          class="g-icon-btn"
          aria-label="Cerrar"
          @click="close"
        >
          <ManagerIcon name="xmark" />
        </button>
      </header>
      <div class="g-dialog__body"><slot /></div>
      <footer v-if="$slots.footer" class="g-dialog__foot"><slot name="footer" /></footer>
    </div>
  </dialog>
</template>

<style scoped>
.g-dialog {
  width: min(560px, calc(100vw - 24px));
  max-height: min(86vh, 900px);
  padding: 0;
  border: 0;
  border-radius: 16px;
  background: var(--g-surface, #fff);
  color: var(--g-text, #161c2a);
  box-shadow: var(--g-shadow-lg);
  overflow: hidden;
}
.g-dialog--sm {
  width: min(420px, calc(100vw - 24px));
}
.g-dialog--lg {
  width: min(820px, calc(100vw - 24px));
}
.g-dialog--xl {
  width: min(1080px, calc(100vw - 24px));
}
.g-dialog::backdrop {
  background: rgb(15 23 42 / 0.45);
  backdrop-filter: blur(2px);
}
.g-dialog[open] {
  animation: g-dialog-in 0.22s var(--g-ease, ease-out);
}
@keyframes g-dialog-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
}
.g-dialog__box {
  display: grid;
  grid-template-rows: auto 1fr auto;
  max-height: inherit;
}
.g-dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px 22px;
}
.g-dialog__head h2 {
  font-size: 17px;
  font-weight: 700;
}
.g-dialog__body {
  padding: 4px 22px 18px;
  overflow: auto;
}
.g-dialog__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid var(--g-line);
  background: var(--g-surface-2);
}
@media (prefers-reduced-motion: reduce) {
  .g-dialog[open] {
    animation: none;
  }
}
</style>
