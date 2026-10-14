<script setup lang="ts">
import { dismissToast, useToasts } from '@/composables/useToasts'
import ManagerIcon from './ManagerIcon.vue'

/** Donde aparecen los avisos breves del gestor (abajo, al centro). */
const { toasts } = useToasts()
const ICON = { ok: 'circle-check', error: 'triangle-exclamation', info: 'circle-info' } as const
</script>

<template>
  <div class="g-toasts" role="status" aria-live="polite">
    <TransitionGroup name="g-toast">
      <div v-for="t in toasts" :key="t.id" class="g-toast" :class="`g-toast--${t.tone}`">
        <ManagerIcon :name="ICON[t.tone]" />
        <span class="g-toast__text">{{ t.message }}</span>
        <button
          v-if="t.action"
          type="button"
          class="g-toast__action"
          @click="(t.action.run(), dismissToast(t.id))"
        >
          {{ t.action.label }}
        </button>
        <button
          type="button"
          class="g-toast__close"
          aria-label="Cerrar aviso"
          @click="dismissToast(t.id)"
        >
          <ManagerIcon name="xmark" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.g-toasts {
  position: fixed;
  left: 50%;
  bottom: 20px;
  z-index: 80;
  display: grid;
  gap: 8px;
  width: min(460px, calc(100vw - 24px));
  transform: translateX(-50%);
  pointer-events: none;
}
.g-toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px 11px 14px;
  border-radius: 12px;
  background: #1c2333;
  color: #f4f6fb;
  box-shadow: var(--g-shadow-lg);
  font-size: 13.5px;
  pointer-events: auto;
}
.g-toast--ok .g-icon {
  color: #6ee7a8;
}
.g-toast--error .g-icon {
  color: #fca5a5;
}
.g-toast--info .g-icon {
  color: #a5b4fc;
}
.g-toast__text {
  flex: 1;
}
.g-toast__action {
  border: 0;
  background: transparent;
  color: #c7d2fe;
  font: 700 13px/1 var(--g-font);
  cursor: pointer;
}
.g-toast__close {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #9aa3b5;
  cursor: pointer;
}
.g-toast-enter-active,
.g-toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s var(--g-ease, ease-out);
}
.g-toast-enter-from,
.g-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
