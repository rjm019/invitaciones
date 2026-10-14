<script setup lang="ts">
import { computed } from 'vue'
import ColorField from './ColorField.vue'
import ManagerIcon from './ManagerIcon.vue'

/** Varios colores (los sugeridos del Dress Code): de 1 a `max`. Se guardan separados por espacio. */
const props = withDefaults(defineProps<{ modelValue: string; max?: number }>(), { max: 4 })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const colors = computed(() => props.modelValue.split(/[\s,;|]+/).filter(Boolean))

function set(list: string[]): void {
  emit('update:modelValue', list.filter(Boolean).join(' '))
}
function change(index: number, value: string): void {
  set(colors.value.map((c, i) => (i === index ? value : c)))
}
</script>

<template>
  <div class="colors">
    <div v-for="(c, i) in colors" :key="i" class="colors__item">
      <ColorField
        :model-value="c"
        :tokens="false"
        :clearable="false"
        compact
        :label="`Color ${i + 1}`"
        @update:model-value="(v) => change(i, v)"
      />
      <button
        type="button"
        class="g-icon-btn"
        :aria-label="`Quitar el color ${i + 1}`"
        @click="set(colors.filter((_, k) => k !== i))"
      >
        <ManagerIcon name="xmark" />
      </button>
    </div>
    <button
      v-if="colors.length < max"
      type="button"
      class="g-btn g-btn--small"
      @click="set([...colors, '#000000'])"
    >
      <ManagerIcon name="plus" /> Color
    </button>
  </div>
</template>

<style scoped>
.colors {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.colors__item {
  display: flex;
  align-items: center;
  padding-right: 2px;
  border: 1px solid var(--g-line);
  border-radius: 10px;
}
.colors__item :deep(.color-field__button) {
  border: 0;
}
</style>
