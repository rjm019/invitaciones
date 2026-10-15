<script setup lang="ts">
import GDialog from './GDialog.vue'
import ManagerIcon from './ManagerIcon.vue'

/** Otra ventana (u otra persona) guardó esta invitación: ¿cuál se queda? */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ theirs: []; mine: [] }>()
</script>

<template>
  <GDialog :open="open" title="Alguien más cambió esta invitación" size="sm" :dismissable="false">
    <p class="g-note g-note--warn">
      <ManagerIcon name="triangle-exclamation" />
      <span
        >Otra persona (o tú, en otra ventana) guardó cambios mientras tenías esta página abierta. El
        autoguardado se pausó para no perder nada.</span
      >
    </p>
    <ul class="conflict">
      <li>
        <strong>Cargar la más reciente:</strong> ves lo que se guardó allá (lo de aquí se descarta).
      </li>
      <li><strong>Conservar la mía:</strong> lo de esta ventana queda encima.</li>
    </ul>
    <template #footer>
      <button type="button" class="g-btn" @click="emit('theirs')">Cargar la más reciente</button>
      <button type="button" class="g-btn g-btn--primary" @click="emit('mine')">
        Conservar la mía
      </button>
    </template>
  </GDialog>
</template>

<style scoped>
.conflict {
  display: grid;
  gap: 8px;
  margin: 14px 0 0;
  padding-left: 18px;
  color: var(--g-muted);
}
</style>
