<script setup lang="ts">
import { ref } from 'vue'

/** Entrada al panel: solo con la clave del evento (clave_panel en el layout). */
const props = defineProps<{
  title: string
  notice?: string
  login: (password: string) => Promise<void>
}>()

const password = ref('')
const error = ref('')
const sending = ref(false)

async function submit() {
  if (!password.value) {
    error.value = 'Escribe la clave del panel.'
    return
  }
  sending.value = true
  error.value = ''
  try {
    await props.login(password.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo entrar.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <form class="login" @submit.prevent="submit">
    <h1 class="login__title">Panel de invitaciones</h1>
    <p class="login__event">{{ title }}</p>
    <p v-if="notice" class="login__notice" role="status">{{ notice }}</p>

    <label class="login__field">
      <span>Clave del panel</span>
      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
        :aria-invalid="!!error"
        :disabled="sending"
        autofocus
      />
    </label>
    <p v-if="error" class="login__error" role="alert">{{ error }}</p>
    <button type="submit" class="p-button" :disabled="sending">
      {{ sending ? 'Entrando…' : 'Entrar' }}
    </button>
  </form>
</template>

<style scoped>
.login {
  display: grid;
  gap: 1rem;
  width: min(100%, 24rem);
  margin: 12vh auto 0;
  padding: 2rem 1.5rem;
  border: 1px solid var(--p-line);
  border-radius: 14px;
  background: var(--p-card);
}
.login__title {
  margin: 0;
  font-size: 1.4rem;
}
.login__event {
  margin: -0.6rem 0 0;
  color: var(--p-muted);
}
.login__notice {
  margin: 0;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  background: #fff4e5;
  color: #7a4b00;
}
.login__field {
  display: grid;
  gap: 0.35rem;
  font-weight: 600;
}
.login__error {
  margin: 0;
  color: var(--p-no);
}
</style>
