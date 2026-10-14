<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useEditor } from '@/composables/useEditorContext'
import {
  catalogSection,
  duplicateSection,
  isVisible,
  removeSection,
  sectionLabel,
  toggleSection,
} from '@/services/designService'
import type { FieldDef } from '@/types/design'
import FieldInput from './FieldInput.vue'
import ItemListEditor from './ItemListEditor.vue'
import ManagerIcon from './ManagerIcon.vue'
import SectionDesign from './SectionDesign.vue'
import TextStyleControl from './TextStyleControl.vue'

/**
 * El inspector de una sección. "Contenido": sus textos (cada uno con su "Aa" para letra,
 * color y tamaño), su lista y los datos del evento que se ven en ella (el salón en
 * Ubicación…). "Diseño": fondo, colores, imágenes y animaciones.
 */
const props = defineProps<{
  id: string
  tab: 'content' | 'design'
  block?: string | null
  rendered: boolean
}>()
const emit = defineEmits<{
  tab: [tab: 'content' | 'design']
  removed: []
  selected: [id: string]
}>()
const { catalog, design, issues, update, setField, setBlock } = useEditor()

const section = computed(() => design.value.sections.find((s) => s.id === props.id))
const def = computed(() => catalogSection(catalog.value, props.id))
const label = computed(() => sectionLabel(catalog.value, props.id))
const visible = computed(() => (section.value ? isVisible(section.value) : false))

const sectionIssues = computed(() =>
  issues.value.filter((i) => i.block === props.id && i.level === 'error' && i.item === null),
)
const fieldError = (key: string) =>
  sectionIssues.value
    .find((i) => i.field === key)
    ?.message.split(': ')
    .slice(1)
    .join(': ') ?? null

/** Campos de "evento" que se editan aquí. */
const linked = computed<FieldDef[]>(() =>
  (def.value?.linked ?? [])
    .map((key) => catalog.value.event_groups.flatMap((g) => g.fields).find((f) => f.key === key))
    .filter((f): f is FieldDef => !!f && !f.hidden),
)
const eventError = (key: string) =>
  issues.value
    .find((i) => i.block === 'evento' && i.field === key && i.level === 'error')
    ?.message.split(': ')
    .slice(1)
    .join(': ') ?? null

const contentFields = computed(() => (def.value?.fields ?? []).filter((f) => f.key !== 'variante'))
const texts = computed(() => def.value?.texts ?? catalog.value.texts)
/** El texto de un campo ("titulo" → su bloque de texto, si lo tiene). */
const textFor = (key: string) => texts.value.find((t) => t.key === key)
/** Textos que no se escriben en un campo de la sección (números, horas, nombre grande…). */
const moreTexts = computed(() =>
  texts.value.filter((t) => !contentFields.value.some((f) => f.key === t.key)),
)
const sampleFor = (key: string) =>
  section.value?.fields[key] ||
  def.value?.fields.find((f) => f.key === key)?.placeholder ||
  label.value

// Al tocar un texto en la vista previa, se abre su "Aa" y se lleva a la vista.
const root = ref<HTMLElement | null>(null)
watch(
  () => [props.id, props.block],
  async () => {
    if (!props.block) return
    await nextTick()
    root.value
      ?.querySelector(`[data-text-block="${props.block}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  },
  { immediate: true },
)

function toggle(): void {
  update(toggleSection(design.value, props.id))
}
function duplicate(): void {
  const copy = duplicateSection(design.value, catalog.value, props.id)
  if (copy) {
    update(copy.design)
    emit('selected', copy.id)
  }
}
function remove(): void {
  update(removeSection(design.value, props.id))
  emit('removed')
}
</script>

<template>
  <div v-if="section" ref="root" class="inspector">
    <header class="inspector__head">
      <span class="inspector__icon"><ManagerIcon :name="def?.icon ?? 'layer-group'" /></span>
      <div class="inspector__title">
        <h2>{{ label }}</h2>
        <p>{{ def?.description }}</p>
      </div>
      <button
        type="button"
        class="g-icon-btn"
        :class="{ 'is-active': !visible }"
        :aria-label="visible ? 'Ocultar la sección' : 'Mostrar la sección'"
        :title="visible ? 'Ocultar' : 'Mostrar'"
        @click="toggle"
      >
        <ManagerIcon :name="visible ? 'eye' : 'eye-slash'" />
      </button>
      <button
        v-if="def?.repeatable"
        type="button"
        class="g-icon-btn"
        aria-label="Duplicar la sección"
        title="Duplicar"
        @click="duplicate"
      >
        <ManagerIcon name="copy" />
      </button>
      <button
        type="button"
        class="g-icon-btn"
        aria-label="Quitar la sección"
        title="Quitar (se puede deshacer)"
        @click="remove"
      >
        <ManagerIcon name="trash-can" />
      </button>
    </header>

    <nav class="g-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'content'"
        @click="emit('tab', 'content')"
      >
        Contenido
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'design'"
        @click="emit('tab', 'design')"
      >
        Diseño
      </button>
    </nav>

    <div class="inspector__scroll">
      <p v-if="!visible" class="g-note inspector__note">
        <ManagerIcon name="eye-slash" /> Oculta: los invitados no la ven. Sus datos se guardan.
      </p>
      <p v-else-if="!rendered && def?.hidden_without" class="g-note g-note--warn inspector__note">
        <ManagerIcon name="triangle-exclamation" /> No se ve todavía: {{ def.hidden_without }}
      </p>
      <p
        v-for="issue in sectionIssues.filter((i) => !i.field)"
        :key="issue.message"
        class="g-note g-note--danger inspector__note"
      >
        <ManagerIcon name="triangle-exclamation" /> {{ issue.message }}
      </p>

      <template v-if="tab === 'content'">
        <section v-if="linked.length" class="g-group">
          <h3 class="g-group__title">Del evento <small>se usan en otras secciones</small></h3>
          <FieldInput
            v-for="f in linked"
            :key="f.key"
            :def="f"
            linked
            :model-value="design.event[f.key] ?? ''"
            :error="eventError(f.key)"
            @update:model-value="(v) => setBlock('event', f.key, v)"
          />
        </section>

        <section v-if="contentFields.length" class="g-group">
          <h3 class="g-group__title">Textos e imágenes</h3>
          <div v-for="f in contentFields" :key="f.key" class="inspector__field">
            <FieldInput
              :def="f"
              :model-value="section.fields[f.key] ?? ''"
              :error="fieldError(f.key)"
              @update:model-value="(v) => setField(section!.id, f.key, v)"
            />
            <div v-if="textFor(f.key)" :data-text-block="textFor(f.key)!.block">
              <TextStyleControl
                :block="f.key"
                :label="`Estilo de ${f.label.toLowerCase()}`"
                :section="section.id"
                :sample="sampleFor(f.key)"
                :start-open="block === textFor(f.key)!.block"
              />
            </div>
          </div>
        </section>

        <section v-if="def?.list" class="g-group">
          <ItemListEditor :section="section" :list="def.list" />
        </section>

        <section v-if="moreTexts.length" class="g-group">
          <h3 class="g-group__title">Más textos <small>letra, color y tamaño</small></h3>
          <div class="inspector__texts">
            <div v-for="t in moreTexts" :key="t.key" :data-text-block="t.block">
              <TextStyleControl
                :block="t.key"
                :label="t.label"
                :section="section.id"
                :sample="t.label"
                :start-open="block === t.block"
              />
            </div>
          </div>
        </section>
      </template>

      <SectionDesign v-else :section="section" :def="def" />
    </div>
  </div>
</template>

<style scoped>
.inspector {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto 1fr;
  height: 100%;
  min-height: 0;
}
.inspector__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 12px 12px 16px;
}
.inspector__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 10px;
  background: var(--g-accent-soft);
  color: var(--g-accent);
}
.inspector__title {
  flex: 1;
  min-width: 0;
  margin-left: 4px;
}
.inspector__title h2 {
  font-size: 15px;
  font-weight: 700;
}
.inspector__title p {
  overflow: hidden;
  color: var(--g-faint);
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.inspector__scroll {
  min-height: 0;
  overflow: auto;
}
.inspector__note {
  margin: 12px 16px 0;
}
.inspector__field + .inspector__field {
  margin-top: 16px;
}
.inspector__field > div {
  margin-top: 6px;
}
.inspector__texts {
  display: grid;
  gap: 6px;
}
</style>
