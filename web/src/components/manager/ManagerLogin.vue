<script setup lang="ts">
import { ref } from 'vue'
import { useManagerSession } from '@/composables/useManagerSession'
import ManagerIcon from './ManagerIcon.vue'

/** Entrada al gestor con la clave maestra. */
const emit = defineEmits<{ entered: [] }>()
const { login, message } = useManagerSession()
const password = ref('')
const error = ref('')
const busy = ref(false)
const show = ref(false)

async function submit(): Promise<void> {
  if (!password.value.trim()) {
    error.value = 'Escribe la clave del gestor.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await login(password.value)
    password.value = ''
    emit('entered')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo entrar.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login">
    <form class="login__card g-card" @submit.prevent="submit">
      <div class="login__mark" aria-hidden="true"><ManagerIcon name="envelope" /></div>
      <h1>Gestor de invitaciones</h1>
      <p class="login__lead">Diseña, publica y comparte las invitaciones de tus eventos.</p>

      <p v-if="message" class="g-note g-note--warn">
        <ManagerIcon name="lock" />
        {{ message }}
      </p>

      <div class="g-field">
        <label class="g-label" for="manager-password">Clave del gestor</label>
        <div class="login__password">
          <input
            id="manager-password"
            v-model="password"
            class="g-input"
            :type="show ? 'text' : 'password'"
            autocomplete="current-password"
            :aria-invalid="error ? 'true' : undefined"
            aria-describedby="manager-password-error"
            autofocus
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
        <p v-if="error" id="manager-password-error" class="g-error" role="alert">{{ error }}</p>
      </div>

      <button
        type="submit"
        class="g-btn g-btn--primary g-btn--block login__submit"
        :disabled="busy"
      >
        <ManagerIcon v-if="busy" name="spinner" spin />
        {{ busy ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 24px 16px;
  background:
    radial-gradient(60% 50% at 20% 0%, #e0e7ff 0%, transparent 70%),
    radial-gradient(50% 50% at 100% 100%, #fde7f3 0%, transparent 70%), var(--g-bg);
}
.login__card {
  display: grid;
  gap: 14px;
  width: min(400px, 100%);
  padding: 32px 28px 28px;
}
.login__mark {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #fff;
  font-size: 20px;
  box-shadow: 0 8px 20px rgb(99 102 241 / 0.35);
}
.login h1 {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.login__lead {
  color: var(--g-muted);
}
.login__password {
  display: flex;
  gap: 6px;
}
.login__submit {
  min-height: 42px;
  margin-top: 6px;
}
</style>
