# Resumen ejecutivo

> **Estado (16-oct-2026):** el plan se ejecutó con cambios importantes: Laravel 13 **sin base de datos** (CSV por evento), panel por evento con clave y enlaces por número de invitados. Después se sumaron el **gestor** para armar invitaciones sin tocar archivos, la **landing** con cotización y tres muestras, y tres temas: `jardin-azul` (NAT), `marfil` y `nueva-york`. Cada tema puede tener su propio diseño de cada sección, y esos diseños, la división entre secciones, los botones y los demás detalles sirven en cualquier tema. Todo está publicado en Fly.io. Lo hecho, lo que cambió y lo que falta está en `09-avance.md`.

## Qué vamos a construir

Un **motor de invitaciones digitales** sobre tu repo `rjm019/invitaciones` (Laravel 11 + Vue 3):

1. **Reparar** el código actual: hoy el registro de invitados no funciona (ver `01-analisis-codigo/bugs-y-riesgos.md`).
2. **Convertir** la boda fija en un sistema de **eventos + temas + secciones** reutilizables.
3. **Clonar** el diseño de Canva "NAT" (XV años, jardín azul y oro) como el tema `jardin-azul`. Lleva los efectos que ya usamos (música, countdown, itinerario animado, RSVP con pases, Spotify) y mejoras: sobre que se abre, calendario y countdown generados desde la fecha.
4. Añadir un **panel de administración** para crear eventos, generar links por familia (WhatsApp + QR) y ver las respuestas.
5. **Documentar el proceso** para repetirlo con cualquier diseño futuro (`07-proceso-reutilizable/`).

## Por qué código y no solo Canva

| Necesidad | Canva | Este motor |
|---|---|---|
| Pases por familia y link personalizado | ❌ | ✅ token por familia |
| Confirmación con control de cupo y estado | ❌ (formulario anónimo, 10 preguntas) | ✅ |
| Playlist de Spotify completa | ❌ (la app Embed falla) | ✅ iframe directo |
| Música con reproductor real | ❌ (el "DALE PLAY" es una imagen) | ✅ |
| Countdown y calendario correctos | ⚠️ (en NAT el countdown apunta a otra fecha) | ✅ calculados |
| Reutilizar el diseño en otro evento | Duplicar y editar a mano | Cambiar el JSON del evento |
| Diseñar visualmente | ✅ excelente | Se diseña en Canva y se implementa como tema |

**Flujo ideal:** diseñar en Canva → convertir el diseño en tema con el playbook → cada evento nuevo es configuración.

## Fases y estimación

| Fase | Contenido | Días |
|---|---|---|
| 0 | Preparación: repo privado, rama, `CLAUDE.md`, entorno local | 0.5 |
| 1 | Backend: arreglos, eventos, tokens, RSVP seguro y pruebas | 1.5–2 |
| 2 | Frontend base: build en Linux, API por token, composables y pruebas | 1 |
| 3 | Motor de secciones y temas + tema `boda-salvia` (la boda actual) | 2 |
| 4 | **Tema `jardin-azul` (clon de NAT)** | 2–3 |
| 5 | Panel admin, importar CSV, WhatsApp/QR, pases PDF | 2–3 |
| 6 | Música, Spotify y pulido de efectos | 1 |
| 7 | QA, CI, Open Graph para WhatsApp y despliegue | 1–1.5 |
| **Total** | | **≈ 11–14 días** de trabajo efectivo |

**Ruta corta para el evento real (28-nov-2026, RSVP hasta el 6-nov):** fases 0 → 1 → 2 → 4 (solo las secciones de NAT, con un evento creado por seeder **local** o desde tinker) → 7 (despliegue). Panel admin y PDF quedan después. ≈ 6–7 días.

## Entregables de esta carpeta

| Carpeta | Para qué sirve |
|---|---|
| `01-analisis-codigo/` | Entender el repo actual: arquitectura, 26 bugs priorizados, inventario de efectos |
| `02-diseno-nat/` | Clon del diseño: ficha (paleta, fuentes, escala), 12 secciones, 43 assets, capturas, contenido de ejemplo y privado |
| `03-arquitectura-objetivo/` | Cómo debe quedar: arquitectura, modelo de datos, contrato de API, frontend y temas, JSON Schema del evento |
| `04-fases/` | Plan ejecutable fase por fase, con checklist, criterios de aceptación y prompt para Claude Code |
| `05-calidad/` | Checklist de QA y estrategia de pruebas |
| `06-despliegue/` | Producción: VPS + Netlify/Vercel, variables y pasos |
| `07-proceso-reutilizable/` | Playbook Canva → código, plantilla de ficha y script de extracción |
| `08-decisiones-pendientes.md` | Lo que necesito que decidas |
| `CLAUDE.md` | Va en la raíz del repo; guía para Claude Code en VS Code |
