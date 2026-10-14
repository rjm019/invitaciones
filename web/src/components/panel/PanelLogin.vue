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
    <p class="login__kicker">Panel de invitaciones</p>
    <h1 class="login__title">{{ title }}</h1>
    <span class="login__divider" aria-hidden="true" />
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
/* Como una tarjeta de la invitación: papel blanco, filo dorado por dentro y el título en pluma. */
.login {
  position: relative;
  display: grid;
  gap: 1rem;
  width: min(100%, 26rem);
  margin: 10vh auto 0;
  padding: 2.4rem 1.8rem 2rem;
  border: 1px solid var(--p-line);
  border-radius: 22px;
  background: var(--p-card);
  box-shadow: 0 18px 50px rgb(30 60 90 / 0.12);
  text-align: center;
}
.login::after {
  content: '';
  position: absolute;
  inset: 0.5rem;
  border: 1px solid color-mix(in srgb, var(--p-gold) 30%, transparent);
  border-radius: 16px;
  pointer-events: none;
}
.login__kicker {
  margin: 0;
  color: var(--p-accent);
  font-family: var(--p-font-title);
  font-size: 0.85rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.login__title {
  margin: -0.4rem 0 0;
  color: var(--p-gold);
  font-family: var(--p-font-script);
  font-size: clamp(3rem, 14vw, 4rem);
  font-weight: 400;
  line-height: 1.1;
}
/* Línea dorada con un rombo al centro. */
.login__divider {
  position: relative;
  justify-self: center;
  width: 9rem;
  height: 1px;
  margin: -0.2rem 0 0.4rem;
  background: linear-gradient(90deg, transparent, var(--p-gold), transparent);
}
.login__divider::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.45rem;
  height: 0.45rem;
  background: var(--p-gold);
  transform: translate(-50%, -50%) rotate(45deg);
}
.login__notice {
  margin: 0;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  background: #fff4e5;
  color: #7a4b00;
}
.login__field {
  display: grid;
  gap: 0.35rem;
  font-weight: 600;
  text-align: left;
}
.login__error {
  margin: 0;
  color: var(--p-no);
}
</style>
