/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API Laravel, sin `/api` al final. */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
