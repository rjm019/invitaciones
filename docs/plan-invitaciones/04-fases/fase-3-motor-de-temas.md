# Fase 3 — Motor de secciones y temas

**Objetivo:** que cualquier invitación se arme con `config.sections` + un tema, y migrar la boda actual a su propio tema (`boda-salvia`) para validar el motor.
**Duración estimada:** 2 días.
**Referencias:** `../03-arquitectura-objetivo/frontend.md`, `../01-analisis-codigo/efectos-reutilizables.md`.

> **Estado (16-oct-2026): motor hecho, con tres temas (`jardin-azul`, `marfil` y `nueva-york`); falta el tema `boda-salvia`.** El `config` sale de `invitacion.csv` (antes, del Excel del evento), no de un JSON. Además, cada tema puede tener su propio diseño de cada sección (variantes que cualquier tema puede usar) y sus opciones de toda la invitación. Detalle en `../09-avance.md`.
> Casillas: `[x]` hecho · `[x] ~~…~~ Cambió:` resuelto de otra forma · `[ ]` pendiente.

## Tareas

- [x] `src/themes/index.ts`: registro con carga diferida (lazy). *Hoy: `jardin-azul`, `marfil` y `nueva-york`, más `_shared/` (adornos que cualquier tema encuentra por nombre).* `themeService` pone `document.documentElement.dataset.theme = id` y carga `theme.css`.
  ```ts
  export const themes = {
    'jardin-azul':   () => import('./jardin-azul/manifest'),
    'new-york-noir': () => import('./new-york-noir/manifest'),
    'boda-salvia':   () => import('./boda-salvia/manifest'),
  }
  ```
- [x] `src/components/sections/`: secciones con estilos que solo usan tokens, props tipadas e `id` de ancla.
  1. [x] `HeroEnvelope`
  2. [x] `MusicPlayer` + `MiniPlayer`
  3. [x] `Blessing`
  4. [x] `SaveTheDate` + `MonthCalendar`
  5. [x] `PhotoArch`
  6. [x] `Location` (lista; pestaña `ubicaciones`)
  7. [x] `Quote`
  8. [x] `Itinerary` (zigzag + línea)
  9. [x] `DressCode`
  10. [x] `Countdown`
  11. [x] `Hotels` (sección `hospedaje`, pestaña `hoteles`). *Hecho el 13-oct para Nat: tarjetas con nota, dirección, Maps y Llamar, y efectos.*
  12. [x] `SpotifyEmbed`. *Va dentro de `MusicPlayer` cuando el evento tiene `spotify`.*
  13. [x] ~~`RsvpCard` + `RsvpForm` (modal o bottom sheet).~~ **Cambió:** `RsvpSection` + `RsvpGuestForm` en línea, con un campo por invitado (a pedido tuyo).
  14. [x] `Closing`
- [x] ~~`src/components/ui/`: `GoldButton`, `Modal`, `BottomSheet`, `FloatingDecor`, `Divider`.~~ **Cambió:** existen `SectionShell`, `FloatingDecor`, `MiniPlayer`, `MonthCalendar` y `AppIcon`. El botón dorado sale de los tokens (`--button-gradient`). Modal y BottomSheet no hicieron falta, porque el formulario va en línea.
- [x] ~~Directiva `v-reveal` registrada globalmente.~~ **Cambió:** la aplica `SectionShell` como efecto `aparecer`, por sección, desde el Excel.
- [x] `sectionRegistry` + props por sección, en `InvitationRenderer`.
- [x] Carga de fuentes por tema y por evento (pestaña `tipografia`): `themeService` inyecta un solo `<link>` de Google Fonts.
- [x] **Agregado (16-oct): diseños de sección por variante, para cualquier tema.** `components/sectionVariants.ts` dice qué diseño alterno tiene cada tipo. `useSectionComponents` descarga solo los que se usan, y la invitación espera a tenerlos. Hoy hay 14 componentes y 2 pieles CSS, los de Nueva York. Los adornos compartidos están en `themes/_shared/` (`themeAssets`, `decorOr`).
- [x] **Agregado (16-oct): opciones de toda la invitación.** Secciones difuminadas, división entre secciones (`withEdges`), estilos de botón (`effects/buttons.css`), confeti, títulos metálicos y esquinas (`effects/options.css`). El tema pone sus valores en el manifiesto y la invitación los cambia en `pagina`.
- [ ] **Tema `boda-salvia`:** pospuesto (la prioridad es NAT).
  - Portar colores, fuentes y decoraciones de `web/src/legacy/BodaLegacy.vue`.
  - Crear un evento de ejemplo con datos ficticios.
  - Validar que se vea equivalente a la boda original.
- [ ] Eliminar `BodaLegacy.vue` cuando el tema esté validado.
- [ ] Meta tags por evento: hechos `<title>` (con el título del evento) y `robots=noindex`. Faltan `og:title` y `og:image`. En una SPA, la vista previa de WhatsApp **no lee** meta tags generadas por JS → ver la tarea de la fase 7 (endpoint de Laravel que sirve el HTML con OG).

## Criterios de aceptación

- Cambiar `config.theme` de `boda-salvia` a `jardin-azul` cambia el aspecto **sin** tocar código. *Se cumple con `jardin-azul`, `marfil` y `nueva-york` (en el gestor, Estilo → Diseño base); `boda-salvia` sigue pendiente.*
- Quitar una clave de `config.sections` oculta esa sección. *Hecho: columna `visible` de la pestaña `secciones`.*
- Lighthouse en móvil: Performance ≥ 85 y Accessibility ≥ 95 con el tema `boda-salvia`. *Pendiente.*

## Prompt sugerido para Claude Code

> Implementa la fase 3 de `docs/plan-invitaciones/04-fases/fase-3-motor-de-temas.md`. Empieza por el registro de temas, el `sectionRegistry` y 3 secciones (`Countdown`, `Itinerary`, `RsvpCard`); muéstrame el resultado antes de crear el resto.
