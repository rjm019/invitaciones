<script setup lang="ts">
import { ref } from 'vue'
import GDialog from './GDialog.vue'
import ManagerIcon from './ManagerIcon.vue'

/**
 * Desarmar y armar: descargar la invitación (para Excel o como paquete con sus archivos) e
 * importar una (también un Excel del formato anterior). Lo importado cae en el borrador.
 */
defineProps<{ open: boolean; busy: boolean; warnings: string[] }>()
const emit = defineEmits<{
  close: []
  download: [format: 'csv' | 'xlsx' | 'zip']
  import: [file: File]
}>()
const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

function onFile(files: FileList | null | undefined): void {
  const file = files?.[0]
  if (file) emit('import', file)
}
</script>

<template>
  <GDialog :open="open" title="Descargar o importar" size="md" @close="emit('close')">
    <div class="transfer">
      <section>
        <h3 class="g-group__title">Descargar</h3>
        <div class="transfer__options">
          <button type="button" class="transfer__option" @click="emit('download', 'xlsx')">
            <ManagerIcon name="file-excel" />
            <span
              ><strong>Excel</strong
              ><small>Una hoja con toda la invitación y otra con la guía.</small></span
            >
          </button>
          <button type="button" class="transfer__option" @click="emit('download', 'csv')">
            <ManagerIcon name="file-csv" />
            <span
              ><strong>CSV</strong
              ><small>invitacion.csv, igual al que guarda el sistema.</small></span
            >
          </button>
          <button type="button" class="transfer__option" @click="emit('download', 'zip')">
            <ManagerIcon name="file-zipper" />
            <span
              ><strong>Paquete</strong
              ><small>La invitación y todas sus imágenes y canciones (.zip).</small></span
            >
          </button>
        </div>
        <p class="g-help">Nunca llevan la clave del cliente ni los datos de los invitados.</p>
      </section>

      <section>
        <h3 class="g-group__title">Importar</h3>
        <div
          class="transfer__drop"
          :class="{ 'is-over': dragging }"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="((dragging = false), onFile($event.dataTransfer?.files))"
        >
          <ManagerIcon :name="busy ? 'spinner' : 'file-arrow-up'" :spin="busy" />
          <p>
            Arrastra un <strong>.csv</strong>, <strong>.xlsx</strong> o <strong>.zip</strong>, o
            <button type="button" class="transfer__link" :disabled="busy" @click="input?.click()">
              elígelo
            </button>
          </p>
          <small>Queda en el borrador: lo revisas en la vista previa y luego publicas.</small>
          <input
            ref="input"
            type="file"
            accept=".csv,.xlsx,.zip"
            hidden
            @change="onFile(($event.target as HTMLInputElement).files)"
          />
        </div>
        <ul v-if="warnings.length" class="transfer__warnings">
          <li v-for="w in warnings" :key="w" class="g-note g-note--warn">
            <ManagerIcon name="circle-info" /> {{ w }}
          </li>
        </ul>
      </section>
    </div>
  </GDialog>
</template>

<style scoped>
.transfer {
  display: grid;
  gap: 20px;
}
.transfer__options {
  display: grid;
  gap: 8px;
  margin-bottom: 8px;
}
.transfer__option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--g-line);
  border-radius: 10px;
  background: var(--g-surface);
  color: var(--g-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.transfer__option:hover {
  border-color: var(--g-accent-line);
  background: var(--g-surface-2);
}
.transfer__option > .g-icon {
  font-size: 20px;
  color: var(--g-accent);
}
.transfer__option span {
  display: grid;
}
.transfer__option small {
  color: var(--g-muted);
  font-size: 12px;
}
.transfer__drop {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 20px;
  border: 2px dashed var(--g-line-strong);
  border-radius: 12px;
  background: var(--g-surface-2);
  color: var(--g-muted);
  text-align: center;
}
.transfer__drop.is-over {
  border-color: var(--g-accent);
  background: var(--g-accent-soft);
}
.transfer__drop > .g-icon {
  font-size: 22px;
  color: var(--g-accent);
}
.transfer__drop small {
  color: var(--g-faint);
}
.transfer__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--g-accent);
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}
.transfer__warnings {
  display: grid;
  gap: 6px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
</style>
