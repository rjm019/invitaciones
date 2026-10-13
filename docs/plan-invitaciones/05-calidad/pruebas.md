# Estrategia de pruebas

| Capa | Herramienta | Qué se prueba | Cuándo |
|---|---|---|---|
| API | PHPUnit (Feature) | Endpoints públicos y admin, reglas de RSVP, políticas, throttle | Fase 1 en adelante, en el CI |
| API | Pint | Estilo del código PHP | En el CI |
| Web | Vitest + @vue/test-utils | Composables (`useCountdown`, `useCalendar`, `useTimelineProgress`, `useAudioPlayer` con mock de `HTMLMediaElement`) y `RsvpForm` (validación de pases) | Fase 2 en adelante, en el CI |
| Web | ESLint + vue-tsc | Tipos y estilo | En el CI |
| E2E (opcional) | Playwright | Flujo: abrir `/i/:token` → abrir sobre → confirmar → ver resumen | Fase 7 |
| Visual (opcional) | Playwright `toHaveScreenshot` | Regresión visual por tema (390 px y 1054 px) | Fase 4 y 7 |
| Manual | `checklist-qa.md` | Antes de cada publicación | Siempre |

## Casos clave

### `RsvpTest`

1. Confirmar con 2 de 4 pases → 200, `status = confirmed`, 2 guests.
2. Confirmar con 5 de 4 → 422 y la BD sin cambios.
3. Reenviar con 3 → reemplaza a los 2 anteriores (quedan 3, no 5).
4. Declinar → `declined` y 0 guests.
5. Después del deadline → 409 (salvo `allow_late`).
6. Token inexistente → 404.
7. 11 peticiones en un minuto → 429.

### `useCalendar`

1. `2026-11-28`: el primer día cae en domingo (columna 0), el mes tiene 30 días y la celda 28 está marcada.
2. `2028-02-29`: año bisiesto.

### `useCountdown`

1. Con *fake timers*, a 47 días exactos del evento muestra `47 : 00 : 00 : 00`.
2. Pasada la fecha: `isOver = true`.
3. Al desmontar, `clearInterval` se llama una vez.
