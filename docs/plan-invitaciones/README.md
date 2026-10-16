# Plan — Motor de invitaciones + clon del diseño "NAT"

**Creado:** 12-oct-2026.
**Repo:** `rjm019/invitaciones` (commit analizado `59d723f`).
**Diseño de origen:** https://invitecs.my.canva.site/nat

## Cómo usar esta carpeta

1. Copia la carpeta completa a **`docs/plan-invitaciones/`** dentro del repo.
2. Copia **`CLAUDE.md`** a la **raíz** del repo.
3. La carpeta `02-diseno-nat/privado/` ya trae su propio `.gitignore` (ignora todo su contenido). Aun así, agrégala también al `.gitignore` de la raíz **antes** del primer commit.
4. Abre el repo en VS Code y pídele a Claude Code: *"Lee CLAUDE.md y empieza la fase 0"*.
5. Al terminar cada fase, marca los checkboxes y actualiza la línea "Fase actual" en `CLAUDE.md`.

## Orden de lectura

| # | Archivo | Tiempo |
|---|---|---|
| 0 | `09-avance.md` (qué está hecho y qué cambió) | 3 min |
| 1 | `00-resumen-ejecutivo.md` | 3 min |
| 2 | `08-decisiones-pendientes.md` | 3 min |
| 3 | `01-analisis-codigo/arquitectura-actual.md` | 5 min |
| 4 | `01-analisis-codigo/bugs-y-riesgos.md` | 5 min |
| 5 | `02-diseno-nat/ficha-diseno.md` + `privado/capturas/` | 5 min |
| 6 | `03-arquitectura-objetivo/arquitectura.md` | 5 min |
| 7 | `04-fases/fase-0…` y luego cada fase al ejecutarla | — |

## Índice completo

```
plan-invitaciones/
├── README.md                          ← este archivo
├── CLAUDE.md                          ← copiar a la raíz del repo
├── 00-resumen-ejecutivo.md
├── 01-analisis-codigo/
│   ├── arquitectura-actual.md         ← stack, endpoints, flujo actual (diagrama)
│   ├── bugs-y-riesgos.md              ← 29 hallazgos con archivo:línea y fase
│   └── efectos-reutilizables.md       ← 18 efectos del original + las piezas de diseño reutilizables de hoy
├── 02-diseno-nat/
│   ├── ficha-diseno.md                ← URL, paleta, fuentes, escala, materiales
│   ├── secciones.md                   ← 12 secciones: contenido, layout, efecto, aceptación
│   ├── assets-manifest.csv            ← 43 assets con posición, uso y si se reutilizan
│   ├── contenido.example.json         ← config de ejemplo (datos ficticios)
│   └── privado/                       ← DATOS REALES — fuera de git (.gitignore incluido)
│       ├── contenido-real.json
│       └── capturas/01–10.jpg         ← referencia visual (foto de la festejada pixelada)
├── 03-arquitectura-objetivo/
│   ├── arquitectura.md                ← decisiones, carpetas, cómo se arma una invitación
│   ├── modelo-datos.md                ← ER, migraciones, reglas de negocio
│   ├── api-contrato.md                ← endpoints públicos y admin con JSON
│   ├── frontend.md                    ← rutas, composables, secciones, temas y presupuesto
│   └── evento.schema.json             ← JSON Schema del config del evento
├── 04-fases/
│   ├── fase-0-preparacion.md
│   ├── fase-1-reparar-backend.md
│   ├── fase-2-reparar-frontend.md
│   ├── fase-3-motor-de-temas.md
│   ├── fase-4-tema-jardin-azul.md     ← el clon de NAT
│   ├── fase-5-panel-admin-y-rsvp.md
│   ├── fase-6-musica-spotify-y-efectos.md
│   ├── fase-7-qa-y-despliegue.md
│   ├── fase-8-gestor-de-plantillas.md ← el gestor (/gestor) y el formato invitacion.csv
│   ├── fase-9-secciones-nuevas.md     ← mesa de regalos, galería, video, álbum, trivia…
│   └── fase-10-landing-y-demos.md     ← landing con cotización, tema marfil y 3 muestras
├── 05-calidad/
│   ├── checklist-qa.md
│   └── pruebas.md
├── 06-despliegue/
│   └── despliegue.md
├── 07-proceso-reutilizable/
│   ├── playbook-canva-a-codigo.md     ← el proceso para cualquier diseño futuro
│   ├── plantilla-ficha-diseno.md
│   └── scripts/extraer-diseno-canva.js← pegar en DevTools para extraer un diseño
├── 08-decisiones-pendientes.md        ← decisiones D1–D21 y preguntas abiertas
└── 09-avance.md                       ← lo hecho, cambios contra el plan y lo que falta
```

## Estado (16-oct-2026)

El detalle de lo hecho, los cambios contra este plan y lo que falta está en **`09-avance.md`**. Todo está en `main` (también en GitHub) y en Fly.io (release v10).

- [x] Análisis del código.
- [x] Captura del diseño NAT (textos, posiciones, colores, fuentes, assets y capturas).
- [x] Plan por fases.
- [ ] Decisiones D1–D21: D2, D3, D5, D7, D8 y D12–D21 decididas. Siguen abiertas D1 (repo privado), D4 (dominio propio), D6 (licencia de las ilustraciones), D9 (pases en la puerta, después del evento), D10 y D11 (`08-decisiones-pendientes.md`, con sus preguntas).
- [ ] Fases 0–10:
  - [x] **Fase 0:** monorepo y Docker. Falta el repo privado (acción tuya).
  - [x] **Fase 1:** API por token, **sin base de datos** (CSV).
  - [x] **Fase 2:** base del frontend con servicios y pruebas.
  - [ ] **Fase 3:** motor de secciones y temas hecho, con tres temas (`jardin-azul`, `marfil` y `nueva-york`), diseños de sección y opciones de página que sirven en cualquier tema. Falta el tema `boda-salvia`.
  - [x] **Fase 4:** tema `jardin-azul` con las 12 secciones de NAT. Faltan la licencia de assets, la foto original y Lighthouse.
  - [ ] **Fase 5:** panel del dueño hecho, rediseñado (clave del Excel, enlaces por número de invitados, lista de invitados, mesas y en vivo). Faltan PDF/QR.
  - [ ] **Fase 6:** música y Spotify hechos; faltan Media Session y la medición de FPS.
  - [ ] **Fase 7:** QA, CI y despliegue. Publicado en Fly.io; faltan CI y QA en celulares reales.
  - [x] **Fase 8:** gestor de plantillas y formato `invitacion.csv`. Publicado (15-oct) y NAT ya en el formato nuevo en producción; queda la limpieza del Excel, después del 28-nov.
  - [ ] **Fase 9:** secciones nuevas. Hecha la mesa de regalos (16-oct); siguen ubicación por lugar, itinerario en vivo, galería, video, redes, trivia y álbum.
  - [ ] **Fase 10:** landing, tema `marfil` y las 3 muestras hechos y ya en producción (desde el 15-oct). Faltan las secciones de la fase 9 en las muestras, el video del hero, Open Graph y Lighthouse.
