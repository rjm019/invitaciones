<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
// Los links viejos (/invitacion/Familia/4) ya no funcionan: ahora cada familia tiene un enlace único.
const isOldLink = computed(
  () => route.path.startsWith('/invitacion/') || route.path.startsWith('/register/'),
)
</script>

<template>
  <div class="not-found">
    <h1>Invitación no encontrada</h1>
    <p v-if="isOldLink">Este enlace cambió. Pide el nuevo a los anfitriones.</p>
    <p v-else>Revisa que el enlace esté completo o pídelo de nuevo a los anfitriones.</p>
  </div>
</template>

<style scoped>
.not-found {
  display: grid;
  place-content: center;
  gap: 0.5rem;
  min-height: 100vh;
  padding: 1.5rem;
  font-family: Georgia, serif;
  color: #523c0b;
  background: #f3f1ec;
  text-align: center;
}
h1 {
  margin: 0;
  font-weight: 400;
}
</style>
