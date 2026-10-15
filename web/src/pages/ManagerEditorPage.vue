<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import '@/components/manager/manager.css'
import AddSectionDialog from '@/components/manager/AddSectionDialog.vue'
import ConflictDialog from '@/components/manager/ConflictDialog.vue'
import EditorTopBar from '@/components/manager/EditorTopBar.vue'
import GDialog from '@/components/manager/GDialog.vue'
import GeneralPanel from '@/components/manager/GeneralPanel.vue'
import HistoryDialog from '@/components/manager/HistoryDialog.vue'
import ManagerIcon from '@/components/manager/ManagerIcon.vue'
import ManagerLogin from '@/components/manager/ManagerLogin.vue'
import MediaLibraryDialog from '@/components/manager/MediaLibraryDialog.vue'
import PreviewFrame from '@/components/manager/PreviewFrame.vue'
import PublishDialog from '@/components/manager/PublishDialog.vue'
import SectionInspector from '@/components/manager/SectionInspector.vue'
import SectionList from '@/components/manager/SectionList.vue'
import StylePanel from '@/components/manager/StylePanel.vue'
import ToastHost from '@/components/manager/ToastHost.vue'
import TransferDialog from '@/components/manager/TransferDialog.vue'
import { useDesignEditor } from '@/composables/useDesignEditor'
import { provideEditor, type MediaRequest, type Selection } from '@/composables/useEditorContext'
import { useManagerSession } from '@/composables/useManagerSession'
import { usePreviewHost } from '@/composables/usePreviewHost'
import { useToasts } from '@/composables/useToasts'
import { createAssetResolver } from '@/services/assetService'
import { addSection, sectionLabel } from '@/services/designService'
import * as managerService from '@/services/managerService'
import { previewPatch } from '@/services/previewPatchService'
import type { PreviewDisplay } from '@/services/previewProtocol'
import { loadTheme, themeAssets } from '@/themes'
import type { ThemeManifest } from '@/themes/types'
import type { DesignIssue, SettingsChange } from '@/types/design'

/**
 * /gestor/:slug — el editor de una invitación. A la izquierda sus partes (estilo, datos y
 * secciones), al centro la invitación de verdad y a la derecha lo que se está editando.
 * Todo se guarda solo en el borrador; los invitados ven los cambios al publicar.
 */
const props = defineProps<{ slug: string }>()
const router = useRouter()
const session = useManagerSession()
const editor = useDesignEditor(props.slug, session.withSession)
const { toast } = useToasts()

const selection = ref<Selection>({ kind: 'style' })
const theme = shallowRef<ThemeManifest | null>(null)
const themeColors = ref<Record<string, string>>({})
const themeFonts = ref<Record<string, string>>({})
const rendered = ref<Set<string> | null>(null)
const device = ref<'phone' | 'desktop'>('phone')
const display = reactive<Omit<PreviewDisplay, 'labels'>>({
  envelope: 'open',
  guest: 'general',
  muted: true,
  mode: 'select',
})
const drawer = ref(false)
const mobileTab = ref<'sections' | 'edit' | 'preview'>('preview')

const catalog = computed(() => editor.catalog.value!)
const design = computed(() => editor.design.value!)
const ready = computed(() => !!editor.catalog.value && !!editor.design.value)
const title = computed(() => editor.brand.value?.title || props.slug)
const errors = computed(() => editor.issues.value.filter((i) => i.level === 'error').length)
const labels = computed(() =>
  Object.fromEntries(
    (editor.design.value?.sections ?? []).map((s) => [
      s.id,
      editor.catalog.value ? sectionLabel(editor.catalog.value, s.id) : s.id,
    ]),
  ),
)
const previewDisplay = computed<PreviewDisplay>(() => ({ ...display, labels: labels.value }))

// Vista previa
const previewComp = ref<InstanceType<typeof PreviewFrame> | null>(null)
const frame = computed(() => previewComp.value?.frame ?? null)
const preview = usePreviewHost(frame, {
  onReady: () => {
    sendPatch(true)
    if (selection.value.kind === 'section') preview.select(selection.value.id)
  },
  onPick: (key, block) =>
    select({ kind: 'section', id: key, tab: 'content', block, at: Date.now() }, true),
  onRendered: (keys) => (rendered.value = new Set(keys)),
  onTokens: (colors, fonts) => {
    themeColors.value = colors
    themeFonts.value = fonts
  },
})

// Biblioteca de media: una sola, la abre cualquier campo y responde con el archivo elegido.
const media = reactive<{
  open: boolean
  request: MediaRequest | null
  resolve: ((name: string | null) => void) | null
}>({
  open: false,
  request: null,
  resolve: null,
})
function pickMedia(request: MediaRequest): Promise<string | null> {
  media.resolve?.(null)
  return new Promise((resolve) => Object.assign(media, { open: true, request, resolve }))
}
function closeMedia(name: string | null = null): void {
  media.open = false
  media.resolve?.(name)
  media.resolve = null
}

const resolveAsset = computed(() =>
  createAssetResolver(
    editor.config.value?.assets ?? {},
    themeAssets(editor.design.value?.event.tema || 'jardin-azul'),
  ),
)

/** Lo que se edita a la derecha. Si se eligió en la lista, la vista previa lo busca. */
function select(next: Selection, fromPreview = false): void {
  selection.value = next
  if (next.kind === 'section' && !fromPreview) preview.select(next.id)
  drawer.value = false
  mobileTab.value = 'edit'
}
/** La sección elegida, si todavía existe (se puede quitar o deshacer su creación). */
const selectedSection = computed(() => {
  const current = selection.value
  return current.kind === 'section' &&
    editor.design.value?.sections.some((s) => s.id === current.id)
    ? current
    : null
})
function setTab(tab: 'content' | 'design'): void {
  if (selection.value.kind === 'section') selection.value = { ...selection.value, tab, block: null }
}

provideEditor({
  slug: props.slug,
  catalog,
  design,
  config: editor.config,
  brand: editor.brand,
  issues: editor.issues,
  theme,
  themeColors,
  themeFonts,
  resolveAsset,
  update: editor.update,
  select,
  pickMedia,
})

watch(
  () => editor.design.value?.event.tema,
  async (id) => {
    theme.value = await loadTheme(id || 'jardin-azul')
  },
  { immediate: true },
)

// La config del servidor (cada guardado) y, encima, lo último de estilo y de los textos que
// pasan tal cual (al instante).
let lastPatch = ''
function sendPatch(force = false): void {
  if (!editor.catalog.value || !editor.design.value) return
  const patch = previewPatch(editor.catalog.value, editor.design.value)
  const json = JSON.stringify(patch)
  if (force || json !== lastPatch) {
    lastPatch = json
    preview.sendPatch(patch)
  }
}
watch(editor.config, (config) => {
  if (config) {
    preview.sendConfig(config, previewDisplay.value)
    sendPatch(true)
  }
})
watch(
  () => editor.design.value,
  () => sendPatch(),
)
// Las etiquetas se recalculan con cada tecla: solo se manda si algo cambió de verdad.
watch(
  () => JSON.stringify(previewDisplay.value),
  () => preview.sendDisplay(previewDisplay.value),
)
function replay(): void {
  if (display.envelope === 'closed') preview.replay()
  else display.envelope = 'closed'
}

// Agregar sección: debajo de la que está elegida, o al final.
const dialogs = reactive({ add: false, publish: false, history: false, transfer: false })
function addKind(kind: string): void {
  const current = selection.value.kind === 'section' ? selection.value.id : null
  const at = current
    ? design.value.sections.findIndex((s) => s.id === current) + 1
    : design.value.sections.length
  const result = addSection(design.value, catalog.value, kind, at)
  editor.update(result.design)
  select({ kind: 'section', id: result.id, tab: 'content' })
}

// Publicar
const publishing = ref(false)
async function publish(options: {
  replaceOwnerDeadline: boolean
  makeVisible: boolean
}): Promise<void> {
  publishing.value = true
  try {
    const template = editor.settings.value?.template
    await editor.publish(options.replaceOwnerDeadline)
    if (options.makeVisible) await editor.changeSettings({ published: true })
    dialogs.publish = false
    const hidden = !editor.settings.value?.published
    toast(
      template
        ? 'Plantilla guardada ✓'
        : hidden
          ? 'Publicado ✓ Sigue oculta: hazla visible en "Datos generales".'
          : 'Publicado ✓ Los invitados ya ven los cambios.',
      'ok',
      template
        ? undefined
        : {
            label: 'Ver invitación',
            run: () => window.open(`/e/${props.slug}`, '_blank', 'noopener'),
          },
    )
  } catch (e) {
    toast(e instanceof Error ? e.message : 'No se pudo publicar.', 'error')
  } finally {
    publishing.value = false
  }
}
function goToIssue(issue: DesignIssue): void {
  dialogs.publish = false
  if (issue.block === 'evento') select({ kind: 'general' })
  else if (['colores', 'fuentes', 'textos', 'pagina'].includes(issue.block))
    select({ kind: 'style' })
  else select({ kind: 'section', id: issue.block, tab: 'content' })
}

// Descargar e importar
const transferBusy = ref(false)
const transferWarnings = ref<string[]>([])
async function download(format: 'csv' | 'xlsx' | 'zip'): Promise<void> {
  try {
    await editor.flush()
    const file = await session.withSession((t) =>
      managerService.exportDesign(t, props.slug, format),
    )
    const url = URL.createObjectURL(file.blob)
    Object.assign(document.createElement('a'), { href: url, download: file.name }).click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch (e) {
    toast(e instanceof Error ? e.message : 'No se pudo descargar.', 'error')
  }
}
async function importFile(file: File): Promise<void> {
  transferBusy.value = true
  try {
    const result = await editor.importFile(file)
    transferWarnings.value = result.warnings
    toast('Importada al borrador ✓ Revísala en la vista previa y publica.')
    if (!result.warnings.length) dialogs.transfer = false
  } catch (e) {
    toast(e instanceof Error ? e.message : 'No se pudo importar.', 'error', undefined, 7000)
  } finally {
    transferBusy.value = false
  }
}

// Confirmaciones (descartar)
const confirmDiscard = ref(false)
async function discard(): Promise<void> {
  confirmDiscard.value = false
  try {
    await editor.discard()
    toast('Se descartaron los cambios sin publicar.')
  } catch (e) {
    toast(e instanceof Error ? e.message : 'No se pudo descartar.', 'error')
  }
}
async function restore(id: string): Promise<void> {
  try {
    await editor.restore(id)
    toast('Esa versión quedó en el borrador. Revísala y publica.')
  } catch (e) {
    toast(e instanceof Error ? e.message : 'No se pudo restaurar.', 'error')
  }
}
async function changeSettings(changes: SettingsChange): Promise<void> {
  try {
    await editor.changeSettings(changes)
    if ('published' in changes)
      toast(changes.published ? 'La invitación ya se ve.' : 'La invitación quedó oculta.')
    else if (changes.panel_password)
      toast('Clave nueva guardada. Si el cliente tenía su panel abierto, entra con esta.', 'info')
    else if (changes.people) {
      const names = (editor.settings.value?.people ?? [])
        .filter((p) => p.role !== 'admin')
        .map((p) => p.name)
      toast(
        names.length
          ? `Ahora la editan ${names.join(', ')} y quien administra.`
          : 'Ahora solo la ve quien administra.',
      )
    }
  } catch (e) {
    toast(e instanceof Error ? e.message : 'No se pudo cambiar.', 'error')
  }
}

// Atajos: ⌘/Ctrl+Z deshacer, ⌘/Ctrl+Shift+Z o Ctrl+Y rehacer, ⌘/Ctrl+S guardar ya.
function onKey(e: KeyboardEvent): void {
  if (!(e.metaKey || e.ctrlKey) || !ready.value) return
  const key = e.key.toLowerCase()
  if (key === 'z' && !e.shiftKey) {
    e.preventDefault()
    editor.undo()
  } else if ((key === 'z' && e.shiftKey) || key === 'y') {
    e.preventDefault()
    editor.redo()
  } else if (key === 's') {
    e.preventDefault()
    void editor.save()
  }
}
/** Hay cambios que el servidor todavía no tiene. */
const unsaved = () =>
  ready.value && ['dirty', 'saving', 'offline', 'error', 'conflict'].includes(editor.status.value)
function beforeUnload(e: BeforeUnloadEvent): void {
  if (unsaved()) {
    e.preventDefault()
    e.returnValue = ''
  }
}
onBeforeRouteLeave(async () => {
  await editor.flush()
  return !unsaved() || window.confirm('Hay cambios que no se guardaron. ¿Salir de todos modos?')
})

async function start(): Promise<void> {
  await editor.load()
  const first = editor.design.value?.sections[0]
  if (first) selection.value = { kind: 'section', id: first.id, tab: 'content' }
  document.title = `${title.value} · Gestor`
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('beforeunload', beforeUnload)
  if (session.authenticated.value) void start()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('beforeunload', beforeUnload)
})
// Si la sesión venció a media edición, al volver a entrar se guarda lo pendiente.
watch(
  () => session.authenticated.value,
  (on) => {
    if (!on) return
    if (!editor.design.value) void start()
    else void editor.save()
  },
)
</script>

<template>
  <div class="mgr editor-page">
    <ManagerLogin v-if="!session.authenticated.value" />

    <template v-else>
      <div v-if="!ready" class="editor-state">
        <template v-if="editor.status.value === 'error'">
          <ManagerIcon name="triangle-exclamation" />
          <p>{{ editor.error.value }}</p>
          <div class="g-row">
            <button type="button" class="g-btn" @click="router.push('/gestor')">
              <ManagerIcon name="arrow-left" /> Volver
            </button>
            <button type="button" class="g-btn g-btn--primary" @click="start">Reintentar</button>
          </div>
        </template>
        <template v-else>
          <ManagerIcon name="spinner" spin />
          <p>Abriendo la invitación…</p>
        </template>
      </div>

      <div
        v-else
        class="editor"
        :class="[`editor--tab-${mobileTab}`, { 'editor--drawer': drawer }]"
      >
        <EditorTopBar
          class="editor__bar"
          :title="title"
          :slug="slug"
          :status="editor.status.value"
          :source="editor.source.value"
          :pending="editor.pending.value"
          :changes="editor.changes.value.length"
          :errors="errors"
          :template="!!editor.settings.value?.template"
          :visible="!!editor.settings.value?.published"
          :can-undo="editor.canUndo.value"
          :can-redo="editor.canRedo.value"
          @back="router.push('/gestor')"
          @undo="editor.undo"
          @redo="editor.redo"
          @publish="dialogs.publish = true"
          @history="dialogs.history = true"
          @transfer="((transferWarnings = []), (dialogs.transfer = true))"
          @discard="confirmDiscard = true"
          @sections="drawer = !drawer"
        />

        <p
          v-if="editor.conversion.value && !editor.conversion.value.identical"
          class="editor__banner g-note g-note--warn"
        >
          <ManagerIcon name="triangle-exclamation" />
          <span>
            Esta invitación está en el formato anterior y al convertirla cambian algunas cosas ({{
              editor.conversion.value.errors[0] ?? editor.conversion.value.differences[0]
            }}). Revísala antes de publicar.
          </span>
        </p>

        <aside class="editor__list">
          <SectionList
            :selection="selection"
            :rendered="rendered"
            @select="select"
            @add="dialogs.add = true"
          />
        </aside>

        <main class="editor__preview">
          <PreviewFrame
            ref="previewComp"
            :device="device"
            :display="previewDisplay"
            :ready="preview.ready.value"
            @device="(d) => (device = d)"
            @display="(partial) => Object.assign(display, partial)"
            @replay="replay"
          />
        </main>

        <aside class="editor__inspector">
          <StylePanel v-if="selection.kind === 'style'" />
          <GeneralPanel
            v-else-if="selection.kind === 'general'"
            :settings="editor.settings.value"
            @settings="changeSettings"
          />
          <SectionInspector
            v-else-if="selectedSection"
            :key="`${selectedSection.id}:${selectedSection.at ?? 0}`"
            :id="selectedSection.id"
            :tab="selectedSection.tab"
            :block="selectedSection.block ?? null"
            :rendered="!rendered || rendered.has(selectedSection.id)"
            @tab="setTab"
            @removed="selection = { kind: 'style' }"
            @selected="(id) => select({ kind: 'section', id, tab: 'content' })"
          />
          <div v-else class="g-empty">
            <ManagerIcon name="hand-pointer" />
            <span>Elige una sección a la izquierda o tócala en la vista previa.</span>
          </div>
        </aside>

        <div v-if="drawer" class="editor__scrim" @click="drawer = false" />

        <nav class="editor__tabs" aria-label="Vista">
          <button
            type="button"
            :aria-pressed="mobileTab === 'sections'"
            @click="mobileTab = 'sections'"
          >
            <ManagerIcon name="layer-group" /> Secciones
          </button>
          <button type="button" :aria-pressed="mobileTab === 'edit'" @click="mobileTab = 'edit'">
            <ManagerIcon name="paintbrush" /> Editar
          </button>
          <button
            type="button"
            :aria-pressed="mobileTab === 'preview'"
            @click="mobileTab = 'preview'"
          >
            <ManagerIcon name="eye" /> Ver
          </button>
        </nav>
      </div>

      <template v-if="ready">
        <AddSectionDialog :open="dialogs.add" @close="dialogs.add = false" @add="addKind" />
        <PublishDialog
          :open="dialogs.publish"
          :changes="editor.changes.value"
          :issues="editor.issues.value"
          :settings="editor.settings.value"
          :migrating="editor.source.value === 'legacy' || editor.conversion.value !== null"
          :busy="publishing"
          @close="dialogs.publish = false"
          @publish="publish"
          @go="goToIssue"
        />
        <HistoryDialog
          :open="dialogs.history"
          :slug="slug"
          @close="dialogs.history = false"
          @restore="restore"
        />
        <TransferDialog
          :open="dialogs.transfer"
          :busy="transferBusy"
          :warnings="transferWarnings"
          @close="dialogs.transfer = false"
          @download="download"
          @import="importFile"
        />
        <MediaLibraryDialog
          :open="media.open"
          :slug="slug"
          :request="media.request"
          @close="closeMedia()"
          @pick="(name) => closeMedia(name)"
        />
        <ConflictDialog
          :open="editor.status.value === 'conflict'"
          @theirs="editor.takeTheirs"
          @mine="editor.keepMine"
        />
        <GDialog
          :open="confirmDiscard"
          title="¿Descartar los cambios sin publicar?"
          size="sm"
          @close="confirmDiscard = false"
        >
          <p>La invitación vuelve a como está publicada. Esto no se puede deshacer.</p>
          <template #footer>
            <button type="button" class="g-btn" @click="confirmDiscard = false">Cancelar</button>
            <button type="button" class="g-btn g-btn--danger" @click="discard">Descartar</button>
          </template>
        </GDialog>
      </template>
    </template>
    <ToastHost />
  </div>
</template>

<style scoped>
.editor-page {
  height: 100vh;
  overflow: hidden;
}
.editor-state {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  height: 100vh;
  color: var(--g-muted);
  font-size: 15px;
}
.editor-state > .g-icon {
  font-size: 26px;
  color: var(--g-accent);
}
.editor {
  display: grid;
  grid-template-columns: 272px minmax(0, 1fr) 384px;
  grid-template-rows: auto auto minmax(0, 1fr);
  grid-template-areas:
    'bar bar bar'
    'banner banner banner'
    'list preview inspector';
  height: 100vh;
}
.editor__bar {
  grid-area: bar;
}
.editor__banner {
  grid-area: banner;
  margin: 0;
  border-radius: 0;
}
.editor__list {
  grid-area: list;
  min-height: 0;
  border-right: 1px solid var(--g-line);
  background: var(--g-surface);
}
.editor__preview {
  grid-area: preview;
  min-width: 0;
  min-height: 0;
}
.editor__inspector {
  grid-area: inspector;
  min-height: 0;
  border-left: 1px solid var(--g-line);
  background: var(--g-surface);
}
.editor__tabs,
.editor__scrim {
  display: none;
}

/* Tablet: las secciones en un cajón. */
@media (max-width: 1199px) {
  .editor {
    grid-template-columns: minmax(0, 1fr) 360px;
    grid-template-areas:
      'bar bar'
      'banner banner'
      'preview inspector';
  }
  .editor__list {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 40;
    width: min(300px, 86vw);
    box-shadow: var(--g-shadow-lg);
    transform: translateX(-105%);
    transition: transform 0.25s var(--g-ease);
  }
  .editor--drawer .editor__list {
    transform: none;
  }
  .editor__scrim {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: block;
    background: rgb(15 23 42 / 0.3);
  }
}

/* Celular: una cosa a la vez, con pestañas abajo. */
@media (max-width: 767px) {
  .editor {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    grid-template-areas: 'bar' 'banner' 'main' 'tabs';
  }
  .editor__list,
  .editor__preview,
  .editor__inspector {
    grid-area: main;
    position: static;
    width: auto;
    border: 0;
    box-shadow: none;
    transform: none;
    visibility: hidden;
  }
  .editor--tab-sections .editor__list,
  .editor--tab-edit .editor__inspector,
  .editor--tab-preview .editor__preview {
    visibility: visible;
  }
  .editor__scrim {
    display: none;
  }
  .editor__tabs {
    grid-area: tabs;
    display: flex;
    border-top: 1px solid var(--g-line);
    background: var(--g-surface);
  }
  .editor__tabs button {
    display: grid;
    flex: 1;
    justify-items: center;
    gap: 2px;
    padding: 8px 0 10px;
    border: 0;
    background: transparent;
    color: var(--g-faint);
    font: 600 11px/1 var(--g-font);
  }
  .editor__tabs button[aria-pressed='true'] {
    color: var(--g-accent);
  }
  .editor__tabs .g-icon {
    font-size: 17px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .editor__list {
    transition: none;
  }
}
</style>
