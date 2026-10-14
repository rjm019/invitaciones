# Fase 4 — Clonar el diseño "NAT" como tema `jardin-azul`

**Objetivo:** recrear en código el diseño publicado en Canva con fidelidad visual alta, usando los efectos del repo y mejoras.
**Duración estimada:** 2–3 días.
**Referencias:**

- `../02-diseno-nat/ficha-diseno.md`: paleta, fuentes y escala.
- `../02-diseno-nat/secciones.md`: especificación sección por sección.
- `../02-diseno-nat/assets-manifest.csv`: 43 assets.
- `../02-diseno-nat/privado/capturas/01–10.jpg`: referencia visual.

> **Estado (13-oct-2026): hecha con el contenido real del Canva.** Faltan la licencia de los assets, la foto original y Lighthouse. Las ilustraciones y fotos viven en `eventos/nat/media/` (privado), no en el tema. Además se agregó la versión horizontal para escritorio. Detalle en `../09-avance.md`.
> Casillas: `[x]` hecho · `[x] ~~…~~ Cambió:` resuelto de otra forma · `[ ]` pendiente.

## 4.1 Obtener los assets (antes de programar)

> ⚠️ Usa assets **propios o con licencia**. Si el diseño de Canva es tuyo, exporta cada elemento desde el editor. No descargues la foto de la festejada del sitio publicado: pídela en original a la familia.

- [x] Obtener cada elemento decorativo del Canva: hay 26 ilustraciones en `eventos/nat/media/`.
- [ ] Revisar la licencia de cada ilustración de Canva (ver `bugs-y-riesgos.md`, Riesgos). Si un elemento no puede usarse fuera de Canva, sustituirlo por uno con licencia propia. *Pendiente (D6).*
- [ ] Foto original de la festejada. *La actual es la comprimida del sitio (pregunta abierta 2).*
- [x] Nombrar los archivos según el manifiesto del tema (`sobre`, `tarjeta`, `rosas-azules`, `toile`, `arco-lino`, `lazo`, `arco-oro`, `laurel`, `marco-azul`, `lacre`, `mujer`, `hombre`, `copas`…). *Se corrigieron dos pares que venían cruzados: arco-oro↔retrato y mujer↔hombre.*
- [x] Optimizar: `php artisan media:optimizar <slug>` pasa los originales a WebP (ancho máximo, por defecto 920 px). `--recortar` quita el aire transparente y `--sin-sombra` quita la sombra.
- [x] **El sobre** se arma en capas (bolsa y solapas) para animar la apertura.
- [x] ~~Guardar en `boda-invitacion/src/themes/jardin-azul/assets/`.~~ **Cambió:** van en `eventos/<slug>/media/`, fuera de git; el Excel los nombra. El tema trae respaldos en CSS si falta un archivo.

## 4.2 Implementación

- [x] `theme.css` con los tokens de `ficha-diseno.md §1–2` y la escala tipográfica (tamaños en `cqi`, relativos al ancho de la sección).
- [x] `manifest.ts`: secciones, variantes, efectos y pares de escritorio por defecto.
- [x] **Secciones, en orden; cada una comparada contra su captura:**
  - [x] 01 `HeroEnvelope`: apertura del sobre (E14) e inicio del audio. *En un enlace personal, el sobre lleva el nombre de la invitación.*
  - [x] 02 `MusicPlayer`: controles dorados (shuffle, anterior, play, siguiente, repetir).
  - [x] 03 `Blessing`: fondo toile, arco de lino y lazo.
  - [x] 04 `SaveTheDate`: brillo, fecha y calendario generado con corazón.
  - [x] 05 `PhotoArch`: marco dorado, foto recortada sin fondo, destellos y mariposas.
  - [x] 06 `Location`: pin, nombre en serif espaciada, botón dorado con shine, foto del salón y "Agregar a mi calendario".
  - [x] 07 `Quote`: script azul y laurel.
  - [x] 08 `Itinerary`: marco azul, zigzag e iconos del tema, con la línea que se llena (E3).
  - [x] 09 `DressCode`: marco azul polvo, sello de lacre que cae, figuras y muestra de color.
  - [x] 10 `Countdown`: números dorados grandes, divisor con corona y frase.
  - [x] 11 `RsvpCard`: óvalo de lino, rosas y fecha límite. **Cambió:** el formulario va debajo, con un campo por invitado.
  - [x] 12 `Closing`: "¡Te esperamos!".
- [x] `FloatingDecor`: mariposas animadas (E17). *Se ocultan en pantallas menores de 85rem, donde tapaban el contenido.*
- [x] `MiniPlayer` fijo después de abrir el sobre.
- [x] **Agregado:** versión horizontal para escritorio. En 1024 px o más, las secciones `mitad` van en pares (columna `escritorio`).
- [x] ~~Seeder `xv-demo` con `contenido.example.json`.~~ **Cambió:** datos ficticios en `api/tests/Fixtures/eventos/`.
- [x] Evento real **nunca** en algo versionado: es `eventos/nat/layout.xlsx`, fuera de git. ~~Crearlo desde el panel admin.~~ **Cambió:** se edita en el Excel.

## 4.3 Comparación visual (QA de fidelidad)

- [x] Capturar la versión en código a **390×844** (iPhone 14). También a 1440×900 para escritorio. *Las capturas están fuera del repo.*
- [x] Comparar lado a lado con `privado/capturas/01–10.jpg`. Tolerancia: misma jerarquía, colores ±3 % y posiciones ±8 px en el contenedor de 460 px.
- [ ] Opcional: Playwright + `toHaveScreenshot()` para pruebas de regresión visual del tema.

## Criterios de aceptación

- Se ve **igual o mejor** que el original en celular. *Revisado en capturas; falta tu revisión en un celular real.*
- Cuenta regresiva y calendario correctos para la fecha del evento. *Hecho (28-nov-2026 17:00; pregunta abierta 1).*
- El audio suena después de abrir el sobre (también en iOS). *Falta el MP3 real y probar en un iPhone.*
- RSVP con pases funcionando contra la API. *Hecho.*
- Lighthouse en móvil: Performance ≥ 85 y Accessibility ≥ 95. *Pendiente.*

## Prompt sugerido para Claude Code

> Implementa el tema `jardin-azul` siguiendo `docs/plan-invitaciones/04-fases/fase-4-tema-jardin-azul.md`, `02-diseno-nat/secciones.md` y las capturas de `02-diseno-nat/privado/capturas/`. Ve sección por sección; después de cada una, levanta el dev server, toma una captura a 390 px y compárala con la captura original correspondiente.
