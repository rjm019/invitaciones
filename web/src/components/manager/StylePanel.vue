<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditor } from '@/composables/useEditorContext'
import { useFontSamples } from '@/composables/useFontSamples'
import { useToasts } from '@/composables/useToasts'
import { contrast, derivePalette, normalizeHex, PALETTE_PRESETS } from '@/services/colorService'
import { FONT_PAIRINGS } from '@/services/fontCatalog'
import ColorField from './ColorField.vue'
import FieldInput from './FieldInput.vue'
import FontPicker from './FontPicker.vue'
import GPopover from './GPopover.vue'
import ImageField from './ImageField.vue'
import ManagerIcon from './ManagerIcon.vue'
import TextStyleControl from './TextStyleControl.vue'

/**
 * "Estilo" de toda la invitación: diseño base, paleta (sugeridas, desde un color o color
 * por color, con aviso de poco contraste), letras (combinaciones y por rol), los textos de
 * todas las secciones y el papel de la página.
 */
const { catalog, design, theme, themeColors, themeFonts, update, setBlock } = useEditor()
const { toast } = useToasts()

const color = (key: string) => {
  const token = catalog.value.colors.find((c) => c.key === key)?.token ?? key.replace(/_/g, '-')
  return (
    normalizeHex(design.value.colors[key] ?? '') ??
    normalizeHex(themeColors.value[token] ?? '') ??
    null
  )
}
const PANELS = [
  { key: 'panel', label: 'Panel 1' },
  { key: 'panel_alt', label: 'Panel 2' },
  { key: 'panel_warm', label: 'Panel 3' },
]
const showPanels = ref(false)

function applyColors(colors: Record<string, string>, name: string): void {
  update({ ...design.value, colors: { ...colors } })
  toast(`Paleta "${name}" aplicada. Puedes deshacer con Ctrl+Z.`, 'info')
}

// Crear desde mi color
const mine = ref({ principal: '', acento: '' })
const principal = computed(() => mine.value.principal || color('primario') || '#96792C')
const acento = computed(() => mine.value.acento || color('acento') || '#8CC0E8')
const derived = computed(() => derivePalette(principal.value, acento.value))

// Avisos de contraste (WCAG): texto normal 4.5; títulos grandes 3.
const warnings = computed(() => {
  const out: string[] = []
  const bg = color('fondo')
  const check = (key: string, against: string | null, min: number, what: string) => {
    const c = color(key)
    if (c && against && contrast(c, against) < min) out.push(what)
  }
  check('texto', bg, 4.5, 'El texto se lee poco sobre el fondo.')
  check('primario', bg, 2.5, 'Los títulos (principal) se ven poco sobre el fondo.')
  check(
    'acento_fuerte',
    '#FFFFFF',
    4.5,
    'Los botones (acento fuerte) se leen poco con letra blanca.',
  )
  return out
})

// Letras
const roleButton = ref<HTMLElement | null>(null)
const roleOpen = ref<string | null>(null)
function openRole(role: string, e: MouseEvent): void {
  roleButton.value = e.currentTarget as HTMLElement
  roleOpen.value = roleOpen.value === role ? null : role
}
const themeFont = (role: string) => {
  const css = catalog.value.fonts.find((f) => f.key === role)?.role ?? role
  return (
    (themeFonts.value[css] ?? '').split(',')[0]?.replace(/["']/g, '').trim() ||
    theme.value?.fonts[css]?.family ||
    ''
  )
}
const fontFor = (role: string) => design.value.fonts[role] || themeFont(role)
const fontsInUse = computed(() => catalog.value.fonts.map((f) => fontFor(f.key)).filter(Boolean))
useFontSamples(
  () => FONT_PAIRINGS.flatMap((p) => [p.fonts.script, p.fonts.serif]),
  () => 'Aa Bb Invitación',
)
function applyPairing(fonts: Record<string, string>, name: string): void {
  update({ ...design.value, fonts: { ...fonts } })
  toast(`Letras "${name}" aplicadas.`, 'info')
}

const PLURAL: Record<string, string> = {
  titulo: 'Títulos',
  subtitulo: 'Subtítulos',
  texto: 'Textos',
  boton: 'Botones',
}
const pageImage = computed(() => theme.value?.page?.image ?? null)
const decorDef = computed(() => catalog.value.page.find((f) => f.key === 'decoracion')!)
const themeDef = computed(() => catalog.value.event_groups[0].fields.find((f) => f.key === 'tema')!)
</script>

<template>
  <div class="style">
    <header class="style__head">
      <span class="style__icon"><ManagerIcon name="palette" /></span>
      <div>
        <h2>Estilo</h2>
        <p>Colores, letras y textos de toda la invitación.</p>
      </div>
    </header>

    <div class="style__scroll">
      <section class="g-group">
        <FieldInput
          :def="themeDef"
          :model-value="design.event.tema ?? ''"
          @update:model-value="(v) => setBlock('event', 'tema', v)"
        />
      </section>

      <section class="g-group">
        <h3 class="g-group__title">Paletas <small>de un clic</small></h3>
        <div class="presets">
          <button
            v-for="p in PALETTE_PRESETS"
            :key="p.id"
            type="button"
            class="preset"
            @click="applyColors(p.colors, p.label)"
          >
            <span class="preset__colors" :style="{ background: p.colors.fondo }">
              <i :style="{ background: p.colors.primario }" />
              <i :style="{ background: p.colors.acento }" />
              <i :style="{ background: p.colors.texto }" />
              <i :style="{ background: p.colors.marco }" />
            </span>
            <span class="preset__name">{{ p.label }}</span>
          </button>
        </div>
      </section>

      <section class="g-group">
        <h3 class="g-group__title">Crear desde mi color</h3>
        <div class="mine">
          <div class="mine__pick">
            <span>Principal</span>
            <ColorField
              :model-value="principal"
              :tokens="false"
              :clearable="false"
              label="Color principal"
              @update:model-value="(v) => (mine.principal = v)"
            />
          </div>
          <div class="mine__pick">
            <span>Acento</span>
            <ColorField
              :model-value="acento"
              :tokens="false"
              :clearable="false"
              label="Color de acento"
              @update:model-value="(v) => (mine.acento = v)"
            />
          </div>
        </div>
        <div class="mine__preview" aria-hidden="true">
          <i v-for="(c, k) in derived" :key="k" :style="{ background: c }" :title="String(k)" />
        </div>
        <button
          type="button"
          class="g-btn g-btn--small"
          @click="applyColors(derived, 'desde tu color')"
        >
          <ManagerIcon name="wand-magic-sparkles" /> Usar esta paleta
        </button>
      </section>

      <section class="g-group">
        <h3 class="g-group__title">Colores</h3>
        <p v-for="w in warnings" :key="w" class="g-note g-note--warn style__warn">
          <ManagerIcon name="triangle-exclamation" /> {{ w }}
        </p>
        <div class="colors">
          <div v-for="c in catalog.colors" :key="c.key" class="colors__row">
            <div class="colors__text">
              <strong>{{ c.label }}</strong>
              <small>{{ c.help }}</small>
            </div>
            <ColorField
              :model-value="design.colors[c.key] ?? ''"
              :fallback="themeColors[c.token] ?? null"
              :tokens="false"
              :label="c.label"
              @update:model-value="(v) => setBlock('colors', c.key, v)"
            />
          </div>
        </div>
        <button
          type="button"
          class="g-btn g-btn--ghost g-btn--small style__more"
          :aria-expanded="showPanels"
          @click="showPanels = !showPanels"
        >
          <ManagerIcon :name="showPanels ? 'chevron-up' : 'chevron-down'" /> Fondos de los paneles
        </button>
        <div v-if="showPanels" class="colors">
          <p class="g-help">Las secciones sin fondo propio se turnan estos tres.</p>
          <div v-for="p in PANELS" :key="p.key" class="colors__row">
            <div class="colors__text">
              <strong>{{ p.label }}</strong>
            </div>
            <ColorField
              :model-value="design.colors[p.key] ?? ''"
              :fallback="themeColors[p.key.replace('_', '-')] ?? null"
              :tokens="false"
              :label="p.label"
              @update:model-value="(v) => setBlock('colors', p.key, v)"
            />
          </div>
        </div>
      </section>

      <section class="g-group">
        <h3 class="g-group__title">Letras <small>combinaciones</small></h3>
        <div class="pairings">
          <button
            v-for="p in FONT_PAIRINGS"
            :key="p.id"
            type="button"
            class="pairing"
            :title="p.description"
            @click="applyPairing(p.fonts, p.label)"
          >
            <span class="pairing__script" :style="{ fontFamily: `'${p.fonts.script}', cursive` }"
              >Aa</span
            >
            <span class="pairing__serif" :style="{ fontFamily: `'${p.fonts.serif}', serif` }">{{
              p.label
            }}</span>
          </button>
        </div>
        <div class="roles">
          <div v-for="r in catalog.fonts" :key="r.key" class="roles__row">
            <div class="colors__text">
              <strong>{{ r.label }}</strong>
              <small>{{ r.help }}</small>
            </div>
            <button
              type="button"
              class="roles__button"
              :aria-expanded="roleOpen === r.key"
              @click="openRole(r.key, $event)"
            >
              <span :style="{ fontFamily: `'${fontFor(r.key)}', serif` }">{{
                fontFor(r.key) || 'Del diseño'
              }}</span>
              <ManagerIcon name="chevron-down" />
            </button>
          </div>
        </div>
        <GPopover
          :open="roleOpen !== null"
          :anchor="roleButton"
          :width="300"
          align="end"
          @close="roleOpen = null"
        >
          <FontPicker
            v-if="roleOpen"
            :model-value="design.fonts[roleOpen] ?? ''"
            :sample="catalog.fonts.find((f) => f.key === roleOpen)?.label ?? 'Aa'"
            :in-use="fontsInUse"
            :inherited="themeFont(roleOpen)"
            @pick="(f) => (setBlock('fonts', roleOpen!, f), (roleOpen = null))"
          />
        </GPopover>
      </section>

      <section class="g-group">
        <h3 class="g-group__title">Textos de toda la invitación</h3>
        <p class="g-help style__help">
          Letra, color y tamaño para todas las secciones. Cada sección puede cambiar los suyos.
        </p>
        <div class="texts">
          <TextStyleControl
            v-for="t in catalog.texts"
            :key="t.key"
            :block="t.key"
            :label="PLURAL[t.key] ?? t.label"
            :sample="t.label"
          />
        </div>
      </section>

      <section class="g-group">
        <h3 class="g-group__title">Página</h3>
        <div class="g-field">
          <span class="g-label">Papel de fondo</span>
          <ImageField
            :model-value="design.page.fondo ?? ''"
            label="Papel de fondo"
            purpose="fondo"
            :fallback="pageImage"
            @update:model-value="(v) => setBlock('page', 'fondo', v)"
          />
        </div>
        <FieldInput
          :def="decorDef"
          :model-value="design.page.decoracion ?? 'SI'"
          @update:model-value="(v) => setBlock('page', 'decoracion', v === 'SI' ? '' : v)"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.style {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto 1fr;
  height: 100%;
  min-height: 0;
}
.style__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--g-line);
}
.style__head h2 {
  font-size: 15px;
  font-weight: 700;
}
.style__head p {
  color: var(--g-faint);
  font-size: 12px;
}
.style__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fde68a, #f9a8d4, #a5b4fc);
  color: #3b2f63;
}
.style__scroll {
  min-height: 0;
  overflow: auto;
}
.style__warn {
  margin-bottom: 8px;
}
.style__help {
  margin-bottom: 10px;
}
.style__more {
  margin-top: 8px;
}
.presets {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.preset {
  display: grid;
  gap: 6px;
  padding: 6px;
  border: 1px solid var(--g-line);
  border-radius: 10px;
  background: var(--g-surface);
  cursor: pointer;
  transition:
    border-color 0.15s,
    transform 0.15s var(--g-ease);
}
.preset:hover {
  border-color: var(--g-accent-line);
  transform: translateY(-1px);
}
.preset__colors {
  display: flex;
  gap: 4px;
  padding: 8px;
  border-radius: 7px;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.06);
}
.preset__colors i {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.08);
}
.preset__name {
  padding: 0 2px;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
}
.mine {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.mine__pick {
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: var(--g-muted);
}
.mine__preview {
  display: flex;
  height: 16px;
  margin: 10px 0;
  overflow: hidden;
  border-radius: 6px;
}
.mine__preview i {
  flex: 1;
}
.colors {
  display: grid;
  gap: 10px;
}
.colors__row,
.roles__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.colors__text {
  display: grid;
  min-width: 0;
}
.colors__text strong {
  font-size: 13px;
}
.colors__text small {
  color: var(--g-faint);
  font-size: 11.5px;
}
.pairings {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 14px;
}
.pairing {
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 10px 6px;
  border: 1px solid var(--g-line);
  border-radius: 10px;
  background: var(--g-surface);
  color: var(--g-text);
  cursor: pointer;
}
.pairing:hover {
  border-color: var(--g-accent-line);
}
.pairing__script {
  font-size: 24px;
  line-height: 1.1;
}
.pairing__serif {
  font-size: 12px;
}
.roles {
  display: grid;
  gap: 10px;
}
.roles__button {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 55%;
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid var(--g-line-strong);
  border-radius: 9px;
  background: var(--g-surface);
  color: var(--g-text);
  cursor: pointer;
}
.roles__button span {
  overflow: hidden;
  font-size: 14px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.texts {
  display: grid;
  gap: 6px;
}
</style>
