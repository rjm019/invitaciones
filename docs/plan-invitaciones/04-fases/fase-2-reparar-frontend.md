# Fase 2 — Reparar la base del frontend (Vue)

**Objetivo:** que el frontend compile en Linux, hable con la API nueva por token y quede listo para los temas.
**Duración estimada:** 1 día.
**Referencias:** bugs #3, 5, 8, 12, 16, 17, 18, 24.

> **Estado (13-oct-2026): hecha.** La lógica quedó en `services/` (TS puro, con pruebas) y `composables/`; los nombres cambiaron un poco contra el plan. Detalle en `../09-avance.md`.
> Casillas: `[x]` hecho · `[x] ~~…~~ Cambió:` resuelto de otra forma · `[ ]` pendiente.

## Tareas

- [x] **Limpieza:** eliminar `TheWelcome.vue`, `components/icons/*`, `views/HomeView.vue`, `views/AboutView.vue` y lo que sobre de `assets/base.css`.
- [x] **Renombrar** `components/invitation.vue` → `web/src/legacy/BodaLegacy.vue`. Se conserva como referencia hasta que el tema `boda-salvia` lo reemplace; solo se ve en desarrollo, en `/legacy/boda`.
- [x] **Variables de entorno:**
  - `web/.env.example` con `VITE_API_URL`.
  - `web/env.d.ts` con el tipo de `ImportMetaEnv`.
- [x] **Cliente HTTP:**
  - `src/services/http.ts`: axios con `baseURL: VITE_API_URL + '/api'` y errores en español (401, 404, 409, 422, 429, 503, sin conexión).
  - `src/services/invitationService.ts`, `eventService.ts` y `panelService.ts`.
- [x] **Tipos:** `src/types/event.ts`, `invitation.ts` y `panel.ts`.
- [x] **Router nuevo:** `/i/:token`, `/e/:slug` y `/panel/:slug` con lazy loading. ~~Guard para `/admin`.~~ **Cambió:** el panel pide la clave en su propia página.
- [x] **`InvitationPage.vue`:** pide los datos por token y muestra los estados de carga, 404 ("Invitación no encontrada") y éxito, con el tema completo.
- [x] **Migrar los efectos del componente legado** sin portar `slowScroll`. Todo se limpia en `onBeforeUnmount` y no hay `setInterval` suelto:
  - `useCountdown`
  - `useMusic` + `audioService`, en lugar de `useAudioPlayer`
  - `useTimelineProgress`
  - `calendarService`, en lugar de `useCalendar`
  - Directiva `v-reveal`
- [x] **Pruebas:** Vitest + `@vue/test-utils` + `happy-dom` (83 en verde):
  - `countdownService`: fake timers, caso `isOver` y zona horaria.
  - `calendarService`: noviembre 2026 empieza en domingo; febrero de año bisiesto.
- [x] **Calidad de código:** ESLint (`eslint-plugin-vue`) + Prettier y scripts `lint` y `test`.

## Criterios de aceptación

- `npm run build` pasa **en Linux** (probar en WSL, en un contenedor o en el CI de la fase 7). *Hecho: corre en el contenedor `web`.*
- `/i/<token-del-seeder>` muestra los datos del evento demo y permite confirmar; un token inválido muestra 404. *Hecho con `eventos/natasha-prueba`.*
- `npm run test` en verde. *Hecho.*

## Prompt sugerido para Claude Code

> Implementa la fase 2 de `docs/plan-invitaciones/04-fases/fase-2-reparar-frontend.md`. Usa `<script setup lang="ts">` en todo lo nuevo. Al terminar, corre `npm run build`, `npm run test` y `npm run lint`.
