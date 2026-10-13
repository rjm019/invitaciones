# Plan — Motor de invitaciones + clon del diseño "NATASHA"

**Creado:** 12-oct-2026.
**Repo:** `rjm019/invitaciones` (commit analizado `59d723f`).
**Diseño de origen:** https://invitecs.my.canva.site/natasha

## Cómo usar esta carpeta

1. Copia la carpeta completa a **`docs/plan-invitaciones/`** dentro del repo.
2. Copia **`CLAUDE.md`** a la **raíz** del repo.
3. La carpeta `02-diseno-natasha/privado/` ya trae su propio `.gitignore` (ignora todo su contenido). Aun así, agrégala también al `.gitignore` de la raíz **antes** del primer commit.
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
| 5 | `02-diseno-natasha/ficha-diseno.md` + `privado/capturas/` | 5 min |
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
│   ├── bugs-y-riesgos.md              ← 26 hallazgos con archivo:línea y fase
│   └── efectos-reutilizables.md       ← 18 efectos → composables/componentes
├── 02-diseno-natasha/
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
│   ├── fase-4-tema-jardin-azul.md     ← el clon de NATASHA
│   ├── fase-5-panel-admin-y-rsvp.md
│   ├── fase-6-musica-spotify-y-efectos.md
│   └── fase-7-qa-y-despliegue.md
├── 05-calidad/
│   ├── checklist-qa.md
│   └── pruebas.md
├── 06-despliegue/
│   └── despliegue.md
├── 07-proceso-reutilizable/
│   ├── playbook-canva-a-codigo.md     ← el proceso para cualquier diseño futuro
│   ├── plantilla-ficha-diseno.md
│   └── scripts/extraer-diseno-canva.js← pegar en DevTools para extraer un diseño
├── 08-decisiones-pendientes.md        ← decisiones D1–D11 y preguntas abiertas
└── 09-avance.md                       ← lo hecho, cambios contra el plan y lo que falta
```

## Estado (13-oct-2026)

El detalle de lo hecho, los cambios contra este plan y lo que falta está en **`09-avance.md`**.

- [x] Análisis del código.
- [x] Captura del diseño NATASHA (textos, posiciones, colores, fuentes, assets y capturas).
- [x] Plan por fases.
- [ ] Decisiones D1–D11: D2, D5 y D8 decididas; las demás siguen abiertas (`08-decisiones-pendientes.md`, con 17 preguntas nuevas).
- [ ] Fases 0–7:
  - [x] **Fase 0:** monorepo y Docker. Falta el repo privado (acción tuya).
  - [x] **Fase 1:** API por token, **sin base de datos** (CSV).
  - [x] **Fase 2:** base del frontend con servicios y pruebas.
  - [ ] **Fase 3:** motor de secciones y temas hecho; falta el tema `boda-salvia`.
  - [x] **Fase 4:** tema `jardin-azul` con las 12 secciones de NATASHA. Faltan la licencia de assets, la foto original y Lighthouse.
  - [ ] **Fase 5:** panel del dueño hecho, rediseñado (clave del Excel, enlaces por número de invitados, lista de invitados, mesas y en vivo). Faltan PDF/QR.
  - [ ] **Fase 6:** música y Spotify hechos; faltan Media Session y la medición de FPS.
  - [ ] **Fase 7:** QA, CI y despliegue. Sin empezar: la publicación espera.
