/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string
  readonly VITE_PLANNING_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
