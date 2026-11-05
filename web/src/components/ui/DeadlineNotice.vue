<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useInvitation } from '@/composables/useInvitation'

/**
 * Aviso de la fecha límite: al abrir la invitación salta un modal con un solo botón OK, con los
 * colores y letras de la invitación. Una vez por día que falta y por dispositivo; solo llega
 * del servidor, ya armado, con el ajuste encendido y lugares sin nombre.
 */
const context = useInvitation()
const dialog = ref<HTMLDialogElement | null>(null)
const text = computed(() => context?.invitation.value?.deadline_notice)
const key = computed(() => `aviso-fecha-${context?.token}-${context?.invitation.value?.deadline_days}`)

function seen(): boolean {
  try {
    return localStorage.getItem(key.value) === '1'
  } catch {
    return false
  }
}

function close() {
  try {
    localStorage.setItem(key.value, '1')
  } catch {
    /* sin almacenamiento: el aviso volverá a salir al recargar */
  }
  dialog.value?.close()
}

watch(
  text,
  (value) => {
    if (value && !seen()) void nextTick(() => dialog.value?.showModal())
  },
  { immediate: true },
)
</script>

<template>
  <dialog
    v-if="text"
    ref="dialog"
    class="deadline-notice"
    aria-labelledby="deadline-notice-text"
    @cancel.prevent="close"
  >
    <p id="deadline-notice-text" class="deadline-notice__text">{{ text }}</p>
    <button type="button" class="deadline-notice__ok" @click="close">OK</button>
  </dialog>
</template>

<style scoped>
.deadline-notice {
  width: min(100% - 2rem, 22rem);
  padding: 1.7rem 1.4rem 1.4rem;
  border: 1px solid var(--color-frame);
  border-radius: 16px;
  background: var(--color-surface);
  color: var(--color-text);
  text-align: center;
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.3);
}
.deadline-notice::backdrop {
  background: rgb(0 0 0 / 0.5);
}
.deadline-notice__text {
  margin: 0 0 1.3rem;
  font-family: var(--font-serif);
  font-size: 1.2rem;
  line-height: 1.4;
}
.deadline-notice__ok {
  min-width: 6rem;
  padding: 0.6rem 1.6rem;
  border: 0;
  border-radius: 999px;
  background: var(--color-primary);
  color: var(--color-surface);
  font-family: var(--font-button);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
