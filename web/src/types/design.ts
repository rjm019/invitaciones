/**
 * La invitación en el formato nuevo (invitacion.csv) tal como la edita el gestor, y el
 * catálogo que dice qué se puede poner en ella. Contrato de /api/manager (ver
 * api/app/Services/Design/Design.php y Catalog.php). Las claves de los datos van en
 * español porque son las del CSV que la persona puede abrir en Excel.
 */
import type { EventConfig } from './event'
import type { PanelBrand } from './panel'

export type DesignValues = Record<string, string>

export interface DesignSection {
  /** "itinerario", "frase-2". */
  id: string
  fields: DesignValues
  items: DesignValues[]
}

export interface Design {
  event: DesignValues
  colors: DesignValues
  fonts: DesignValues
  texts: DesignValues
  page: DesignValues
  sections: DesignSection[]
}

/** Algo que revisar, con el lugar exacto (bloque o sección, elemento y campo). */
export interface DesignIssue {
  level: 'error' | 'warning'
  block: string
  item: number | null
  field: string | null
  message: string
}

export type FieldInput =
  | 'text'
  | 'textarea'
  | 'lines'
  | 'datetime'
  | 'date'
  | 'time'
  | 'url'
  | 'phone'
  | 'range'
  | 'toggle'
  | 'select'
  | 'chips'
  | 'color'
  | 'colors'
  | 'image'
  | 'audio'
  | 'icon'
  | 'font'
  | 'timezone'
  | 'theme'

export interface FieldOption {
  value: string
  label: string
}

export interface FieldDef {
  key: string
  label: string
  input: FieldInput
  help?: string
  placeholder?: string
  options?: FieldOption[]
  min?: number
  max?: number
  step?: number
  max_length?: number
  required?: boolean
  hidden?: boolean
}

export interface CatalogList {
  key: string
  label: string
  item_label: string
  max: number
  help?: string
  fields: FieldDef[]
}

export interface CatalogSection {
  /** Nombre en el CSV ("itinerario"). */
  id: string
  /** Tipo del contrato ("itinerary"). */
  type: string
  label: string
  description: string
  icon: string
  repeatable: boolean
  fields: FieldDef[]
  list: CatalogList | null
  /** Claves de "evento" que se editan dentro de esta sección (el salón en Ubicación…). */
  linked: string[]
  /** Adornos del tema que se pueden cambiar: nombre en el CSV → ranura del componente. */
  slots: { key: string; slot: string; label: string }[]
  /** Bloques de texto: nombre en el CSV → bloque del contrato. */
  texts: { key: string; block: string; label: string }[]
  hidden_without: string | null
}

export interface Catalog {
  version: number
  reserved: string[]
  event_groups: { label: string; fields: FieldDef[] }[]
  colors: { key: string; token: string; label: string; help: string }[]
  fonts: { key: string; role: string; label: string; help: string }[]
  texts: { key: string; block: string; label: string }[]
  text_props: {
    key: 'fuente' | 'color' | 'tamano'
    prop: 'font' | 'color' | 'size'
    label: string
  }[]
  text_size: { min: number; max: number }
  common: FieldDef[]
  effects: { key: string; effect: string; label: string; help: string }[]
  page: FieldDef[]
  sections: CatalogSection[]
  no_image: string
  limits: { sections: number; fields: number; items: number; value: number }
}

/** Una persona del gestor (la clave nunca viaja). */
export interface ManagerUser {
  username: string
  name: string
  role: 'admin' | 'editor'
  active: boolean
  /** Entró con una clave temporal: elige la suya antes de seguir. */
  must_change_password: boolean
  created_at: string | null
  last_login_at: string | null
}

export type QuoteStatus = 'nueva' | 'contactada' | 'cotizada' | 'cerrada' | 'descartada'

/** Una cotización que llegó desde la landing. */
export interface Quote {
  id: string
  created_at: string | null
  name: string | null
  /** E.164: "+525512345678". */
  phone: string
  type: 'boda' | 'xv' | 'graduacion' | 'otro'
  event_date: string | null
  idea: string | null
  /** Desde qué página la pidió ("/invitaciones-digitales-boda"). */
  page: string | null
  status: QuoteStatus
  note: string | null
  /** Usuario del gestor que la atendió por última vez. */
  handled_by: string | null
  updated_at: string | null
}

/** Qué parte del sitio: la landing, las invitaciones (y muestras) o todo. */
export type VisitScope = 'sitio' | 'invitaciones' | 'todo'

export type VisitKind = 'landing' | 'invitacion' | 'personal' | 'muestra'

/** Un renglón de "lo más visto": páginas, orígenes, dispositivos… */
export interface VisitCount {
  label: string
  visits: number
  visitors: number
}

/** GET /api/manager/visits: las visitas de los últimos días (sin las del equipo). */
export interface VisitStats {
  from: string
  to: string
  scope: VisitScope
  totals: {
    visits: number
    /** Personas distintas (misma IP y navegador = la misma persona). */
    visitors: number
    /** Visitas del equipo (con sesión del gestor), que no cuentan. */
    team: number
    /** Cotizaciones que llegaron en esos días. */
    quotes: number
    /** Cotizaciones por cada 100 personas (null en "invitaciones"). */
    conversion: number | null
  }
  days: { date: string; visits: number; visitors: number }[]
  pages: VisitCount[]
  origins: VisitCount[]
  campaigns: VisitCount[]
  devices: VisitCount[]
  systems: VisitCount[]
  browsers: VisitCount[]
  events: {
    slug: string
    demo: boolean
    visits: number
    visitors: number
    general: number
    personal: number
  }[]
  recent: {
    at: string
    page: string
    kind: VisitKind
    origin: string
    campaign: string | null
    device: string
    system: string
    browser: string
    ip: string | null
  }[]
}

/** Quién publicó (o creó, o migró) una versión, según la bitácora del evento. */
export interface PublishRecord {
  published_at: string
  /** borrador · formato anterior · nueva · copia de <slug> */
  origin: string
  by: { username: string; name: string } | null
}

/** Una tarjeta del inicio del gestor. */
export interface ManagerEvent {
  slug: string
  title: string
  type: string
  celebrant: string | null
  starts_at: string | null
  published: boolean
  template: boolean
  /** Una muestra de la landing (demo=SI): va en su propia pestaña del inicio. */
  demo: boolean
  format: 'design' | 'legacy'
  has_draft: boolean
  pending: boolean
  updated_at: string | null
  last_publish: PublishRecord | null
  /** Usuarios asignados (quien administra las ve todas). */
  people: string[]
  cover: {
    theme: string | null
    colors: Partial<Record<'bg' | 'primary' | 'accent' | 'text', string>>
    font: string | null
  }
  counts: { invitations: number; guests: number; attending: number }
  error?: string
}

export interface ManagerSettings {
  published: boolean
  template: boolean
  panel_password: string | null
  /** Fecha límite que el dueño movió desde su panel (gana sobre la invitación). */
  owner_deadline: string | null
  deadline_changes: number
  /** Quién la ve y la edita en el gestor, además de quien administra. */
  people: { username: string; name: string; role: 'admin' | 'editor'; active: boolean }[]
}

/** Lo que cambia al instante desde "Datos generales" (no espera a "Publicar"). */
export interface SettingsChange {
  /** null quita la clave: el panel del cliente se apaga. */
  panel_password?: string | null
  published?: boolean
  /** Solo quien administra: los usuarios que la ven en el gestor. */
  people?: string[]
  /** Solo quien administra: quita la fecha límite que el cliente movió (vuelve la de la invitación). */
  owner_deadline?: null
  /** Solo quien administra: cuántos de sus cambios de fecha ya usó el cliente (0 a 3). */
  deadline_changes?: number
}

export interface DesignChange {
  type: 'block' | 'section' | 'order'
  key: string | null
  change: 'added' | 'removed' | 'changed'
}

/** Lo que el editor recibe después de guardar. */
export interface DesignBuild {
  version: string
  has_draft: boolean
  pending: boolean
  changes: DesignChange[]
  config: EventConfig
  issues: DesignIssue[]
  brand: PanelBrand
}

/** Lo que el editor recibe al abrir una invitación. */
export interface DesignPayload extends DesignBuild {
  slug: string
  design: Design
  source: 'draft' | 'live' | 'legacy'
  warnings: string[]
  settings: ManagerSettings
  conversion: { identical: boolean; differences: string[]; errors: string[] } | null
}

export interface MediaFile {
  name: string
  url: string
  kind: 'image' | 'audio'
  bytes: number
  width: number | null
  height: number | null
  modified: number
  used_in: { version: string; block: string; item: number | null; field: string }[]
}

/** Una versión que ya no ven los invitados (se puede restaurar al borrador). */
export interface HistoryVersion {
  id: string
  /** Cuándo se publicó y quién (null si la bitácora no lo registró). */
  published_at: string | null
  origin: string | null
  by: { username: string; name: string } | null
  /** Cuándo dejó de verse (se publicó la siguiente). */
  replaced_at: string | null
  bytes: number
}

export interface DesignHistory {
  /** La versión que ven los invitados ahora. */
  current: PublishRecord | null
  versions: HistoryVersion[]
}
