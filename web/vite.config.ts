import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    // En Docker sobre macOS/Windows los cambios del volumen a veces no llegan; VITE_USE_POLLING=1 lo resuelve.
    watch: process.env.VITE_USE_POLLING === '1' ? { usePolling: true, interval: 300 } : undefined,
    // Con VITE_API_PROXY (en Docker, la API por su nombre de servicio), la web pide /api y
    // /media a su mismo origen y Vite los reenvía. Así la invitación se abre también desde
    // un celular de la misma red (http://<ip-de-la-mac>:5173), sin CORS ni "localhost".
    proxy: process.env.VITE_API_PROXY
      ? {
          '/api': { target: process.env.VITE_API_PROXY },
          '/media': { target: process.env.VITE_API_PROXY },
        }
      : undefined,
  },
  // La vista previa (build de producción) usa el mismo reenvío de /api y /media.
  preview: { host: true },
})
