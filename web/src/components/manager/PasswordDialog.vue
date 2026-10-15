<script setup lang="ts">
import { ref, watch } from 'vue'
import { useManagerSession } from '@/composables/useManagerSession'
import { useToasts } from '@/composables/useToasts'
import { MIN_PASSWORD } from '@/services/managerAccountService'
import GDialog from './GDialog.vue'
import ManagerIcon from './ManagerIcon.vue'

/** Cambiar mi clave. Las otras sesiones (otra computadora) se cierran; las pestañas de aquí siguen. */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { changePassword } = useManagerSession()
const { toast } = useToasts()

const current = ref('')
const fresh = ref('')
const show = ref(false)
const error = ref('')
const field = ref<string | null>(null)
const busy = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    current.value = ''
    fresh.value = ''
    error.value = ''
    field.value = null
  },
)

async function submit(): Promise<void> {
  if (!current.value || !fresh.value) {
    error.value = 'Escribe tu clave actual y la nueva.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await changePassword(current.value, fresh.value)
    toast(
      'Listo: tu clave cambió. Si entraste en otra computadora, ahí tendrás que entrar de nuevo.',
    )
    emit('close')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo cambiar la clave.'
    const errors = (e as { errors?: Record<string, string[]> }).errors
    field.value = errors ? (Object.keys(errors)[0] ?? null) : null
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <GDialog :open="open" title="Cambiar mi clave" size="sm" @close="emit('close')">
    <form class="password" @submit.prevent="submit">
      <div class="g-field">
        <label class="g-label" for="password-current">Clave actual</label>
        <input
          id="password-current"
          v-model="current"
          class="g-input"
          type="password"
          autocomplete="current-password"
          :aria-invalid="field === 'current_password' ? 'true' : undefined"
        />
      </div>
      <div class="g-field">
        <label class="g-label" for="password-new">Clave nueva</label>
        <div class="password__row">
          <input
            id="password-new"
            v-model="fresh"
            class="g-input"
            :type="show ? 'text' : 'password'"
            autocomplete="new-password"
            :aria-invalid="field === 'password' ? 'true' : undefined"
          />
          <button
            type="button"
            class="g-icon-btn"
            :aria-label="show ? 'Ocultar clave' : 'Ver clave'"
            @click="show = !show"
          >
            <ManagerIcon :name="show ? 'eye-slash' : 'eye'" />
          </button>
        </div>
        <p class="g-help">Al menos {{ MIN_PASSWORD }} caracteres.</p>
      </div>
      <p v-if="error" class="g-error" role="alert">{{ error }}</p>
      <div class="password__actions">
        <button type="button" class="g-btn g-btn--ghost" @click="emit('close')">Cancelar</button>
        <button type="submit" class="g-btn g-btn--primary" :disabled="busy">
          <ManagerIcon v-if="busy" name="spinner" spin />
          {{ busy ? 'Guardando…' : 'Cambiar clave' }}
        </button>
      </div>
    </form>
  </GDialog>
</template>

<style scoped>
.password {
  display: grid;
  gap: 14px;
}
.password .g-field + .g-field {
  margin-top: 0;
}
.password__row {
  display: flex;
  gap: 6px;
}
.password__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
