# CLAUDE.md — Motor de invitaciones digitales + recepción

## Proyecto

Monorepo con tres apps que **no dependen entre sí en tiempo de ejecución**:

- `api/`: Laravel 13 y PHP 8.3, **sin base de datos**. El estado vive en archivos CSV por evento: el diseño en `invitacion.csv` (antes `layout.xlsx`, deprecado), y ajustes, enlaces, respuestas y dedicatorias aparte.
- `web/`: Vue 3, Vite y TypeScript; invitación pública, panel del dueño (`/panel/:slug`) y gestor de plantillas (`/gestor`).
- `recepcion/`: buscador de invitados para la puerta del evento. JS plano, sin build, funciona sin internet. Hoy se sirve estático; su backend pasará a Laravel más adelante.

El plan completo está en `docs/plan-invitaciones/`. **Lee primero** `docs/plan-invitaciones/README.md` y la fase en curso.

## Fase en curso

- **Fase actual:** Pasos 2a, 3 y 2b terminados, más el **panel del dueño** (`/panel/:slug`, entra con `clave_panel`: en `ajustes.csv` en el formato nuevo, en el layout en el anterior): genera y elimina enlaces (eliminar quita también sus invitados y su dedicatoria) por número de invitados, lista de invitaciones y de invitados con su mesa, se actualiza en vivo (consulta de versión cada 5 s), fecha límite cambiable hasta 3 veces. La invitación personal (`/i/:token`) muestra un campo por invitado; los nombres enviados quedan fijos. Secciones `clima` (Open-Meteo: típico y luego pronóstico) y `playlist`; la música puede salir de un MP3 o de Spotify (`musica_fuente`; NAT usa MP3 para que suene completa). Cada sección es un panel con su fondo y el mismo espacio entre todas (`--section-gap`); secciones `sin_ninos` y `dedicatoria` (una por enlace, `dedicatorias.csv`, pestaña en el panel); efecto `cambio_de_color`; sección `hospedaje` (pestaña `hoteles`). El panel se ve con los colores de su invitación ("XV de Nat") y "Enviar" arma un PDF con la invitación (el diseño del sobre de NAT.pdf: `tarjeta_fondo`, `tarjeta_frase`, `tarjeta_texto`) y su enlace oculto (QR en puntos azules integrado al fondo, y toque); ese QR es el que leerá la recepción. Todo en CSV. **Publicado en Fly.io** (`https://invitaciones-jiro.fly.dev`, ver `docs/plan-invitaciones/06-despliegue/despliegue.md`). Formato: `eventos/README.md`.
- **Fase 8 — gestor de plantillas** (14-oct; en `main`, **publicado en Fly el 15-oct**, release v6, y en GitHub desde el 16-oct): `/gestor` (una cuenta por persona en `eventos/_gestor/usuarios.csv`; `GESTOR_CLAVE` lo enciende y crea la primera; quien edita ve solo las suyas y quien administra, todas; el historial dice quién publicó qué) arma invitaciones y plantillas con la invitación a la vista (colores, tamaños y textos que pasan tal cual al instante con `previewPatchService`; lo demás con la config del servidor en ~0.5 s), borrador con autoguardado en dos ritmos (400 ms si la vista previa necesita al servidor, 1 s si ya lo muestra) y **Publicar**, historial, biblioteca de media, descargar/importar csv, xlsx o zip. Inicio con pestañas Invitaciones, Plantillas y Muestras (`demo=SI`); quien administra elimina invitaciones, plantillas y muestras (la carpeta pasa completa a `eventos/_gestor/papelera/`, nunca se borra; una invitación visible, con enlaces o con respuestas pide escribir su dirección). Formato `invitacion.csv` (`seccion, elemento, campo, valor`; letra/color/tamaño por bloque de texto; colores y adornos por sección); `clave_panel`, `publicado` y `plantilla` en `ajustes.csv` (la clave del panel se escribe a mano, se genera o se quita en "Datos generales"; quien administra también pone la clave de cualquier persona y deshace lo que el cliente movió en su panel; ninguna clave lleva espacios: `KeyInput` + `passwordService`). NAT local ya migrado (`invitacion:migrar`, verificado idéntico). En producción Apache entrega `/media` sin PHP (el JSON lo comprime el proxy de Fly; ver `deploy/apache-site.conf`). Producción (`docs/plan-invitaciones/06-despliegue/despliegue.md`): la cuenta del usuario en el gestor ya existe y NAT ya está en el formato nuevo (migrada el 15-oct; revisado en el disco el 16-oct, con un borrador sin publicar). Deploys, subir eventos y lo demás del runbook, **solo cuando el usuario lo pida**. Detalle: `docs/plan-invitaciones/04-fases/fase-8-gestor-de-plantillas.md`.
- **Fases 9 y 10 (planeadas 15-oct; en `main` y en Fly: la landing desde el 15-oct y todo lo demás desde la release v10, 16-oct):** fase 10, pasos 1 y 2 hechos: landing en `/` (páginas estáticas en `web/landing/`, Apache las sirve sin PHP) con cotización (`POST /api/public/quotes` → `eventos/_gestor/cotizaciones.csv` + correo) y "Cotizaciones" en el gestor; **ya está publicada** con sus muestras, antes de tener las secciones que anuncia (pregunta 47 de `08-decisiones-pendientes.md`; sin correo ARCO, WhatsApp ni secretos del correo). Tema `marfil` (sin fotos: dibujos de línea) y 3 muestras en `deploy/demos/` (`demo=SI` en `ajustes.csv`: no guardan nada). Tema `nueva-york` (oscuro: negro, perla y plata, art déco) con **diseño propio en cada sección**, que además **sirve en cualquier tema** (`components/sectionVariants.ts` → `components/sections/variants/`: elevador, tocadiscos, boleto, metro, neón, letreros de calle, tablero de Grand Central, pase VIP, postal…; adornos compartidos en `themes/_shared/assets`), opciones de diseño de toda la invitación (`pagina`: `orilla`, `botones`, `confeti`, `metalico`, `esquinas`; el tema pone las suyas en su manifest), **secciones difuminadas** (`pagina,,difuminar`: franjas de papel con hoja rasgada y franjas grises cortadas por la ciudad), efectos `horizonte`, `reflectores`, `luces`, `escarcha`, `reflejo`, `panoramica`, `bola_disco`, `luces_disco`, confeti plateado y su plantilla en `deploy/plantillas/` (`instalar.sh nueva-york` en local, `subir.sh nueva-york` en Fly); panel e imagen para WhatsApp con versión oscura. Catálogo de todas las piezas reutilizables: `01-analisis-codigo/efectos-reutilizables.md`. Sección `mesa_regalos` (fase 9 §2; datos bancarios solo en enlaces personales, `GiftPrivacy`). Ximena: diseño en local (`eventos/ximena`, Nueva York, 21-nov) y, desde el 16-oct, en el borrador de `xv-ximena` en producción (oculta, sin publicar; faltan sus datos reales). Sigue: las secciones de la fase 9 (`04-fases/fase-9-secciones-nuevas.md`, `fase-10-landing-y-demos.md`).
- **Estadísticas del sitio y SEO** (17-oct; en `main` y en GitHub desde el 20-oct, sin `fly deploy`): cada página vista (landing, `/e/`, `/i/`, muestras) manda `POST /api/public/visits` con `sendBeacon` (`services/visitService.ts`) → `eventos/_gestor/visitas/AAAA-MM-DD.csv` (IP, origen, dispositivo; sin robots ni las del equipo; sin IP con DNT/GPC; IP borrada a los 365 días; el token de `/i/` nunca se guarda). Gestor → "Estadísticas" (`StatsDialog`, solo quien administra; el botón cuenta las visitas de hoy) con enlaces con etiqueta (utm). SEO: imágenes `/og/*.png` (se rearman con `web/landing/og/capturar.mjs`), `404` real fuera de las rutas de la SPA, `noindex` en la SPA, `robots.txt`/`sitemap.xml`/`llms.txt` armados con `SITE_URL` al compilar (plantillas en `web/landing/`), verificación de buscadores y redes en `site.json`. Preguntas 54–61.
- **Prioridad:** invitaciones (XV NAT: RSVP cierra 6-nov-2026, evento 28-nov-2026). El buscador espera.
- **Rama:** `main`, igual a `origin/main` desde el push del 20-oct (Fly sigue en la release v11 del 16-oct: sin los commits del 17-oct, con ajustes de Nueva York, estadísticas y SEO, ni los de claves del 20-oct); `feature/gestor-plantillas` y `feature/landing-y-secciones` ya están unidas a `main`. La migración a Google Cloud (fase 11) vive en `feature/migracion-gcp`, sin unir ni publicar; al unirla, las visitas pasan al disco virtual.

## Comandos (todo corre en Docker)

```bash
docker compose up -d --build          # api (8010), web (5173), recepcion (8090); no hay contenedor de BD
docker compose logs -f api            # logs

# API
docker compose exec api php artisan test
docker compose exec api ./vendor/bin/pint

# Web
docker compose exec web npm run test
docker compose exec web npm run lint
docker compose exec web npm run build   # el build corre en Linux: atrapa mayúsculas mal escritas en imports

# Invitaciones: desarmar y armar (los mismos servicios que el gestor)
docker compose exec api php artisan invitacion:validar <slug>
docker compose exec api php artisan invitacion:exportar <slug> --formato=zip     # csv, xlsx o zip
docker compose exec api php artisan invitacion:importar <slug> <archivo>        # al borrador
docker compose exec api php artisan invitacion:migrar <slug> --probar           # Excel anterior → invitacion.csv
docker compose exec api php artisan gestor:usuario [<usuario> --clave-nueva]     # cuentas del gestor

# Recepción (pruebas del importador y modelos)
docker run --rm -v "$PWD/recepcion":/app -w /app node:20-alpine node tests/importador.test.js
```

Producción (Fly.io, cuenta `tu cuenta personal`): `fly deploy --ha=false` publica el código; `deploy/subir-evento.sh <slug>` sube media (y el layout anterior, si lo hay) sin pisar los CSV que escribe la app; `invitacion.csv` solo con `--forzar` (allá la edita el gestor; respalda antes la del servidor). `deploy/bajar-evento.sh <slug>` trae un evento del servidor a una carpeta nueva.

Gestor en local: `GESTOR_CLAVE` (16+ caracteres) en `api/.env` y `http://localhost:5173/gestor`; la primera vez pide crear tu cuenta con esa clave.

Los puertos del host se cambian con `API_PORT`, `WEB_PORT` y `RECEPCION_PORT` (8000 y 8080 ya los usan otros proyectos en esta máquina).

## Reglas del proyecto

1. **Nunca** versionar datos reales de personas (nombres, fotos, teléfonos), ni `.env`, ni audios con derechos. Los datos reales viven en `docs/plan-invitaciones/02-diseno-nat/privado/`, `recepcion/ejemplos/` y `recepcion/prototipo/` y los layouts de eventos reales (todos en `.gitignore`).
2. Las invitaciones se identifican por un **token aleatorio**; nunca por familia o número en la URL.
3. Toda regla de negocio del RSVP (límite de pases, deadline, idempotencia) se valida **en el servidor**.
4. **Frontend (`web/`):**
   - `<script setup lang="ts">` en todo lo nuevo.
   - `services/` es lógica pura en TS (sin Vue ni DOM global) y lleva pruebas; `composables/` solo envuelven servicios y limpian en `onBeforeUnmount`.
   - Las secciones (`components/sections/`) solo usan **tokens CSS** (`var(--color-…)`, `var(--font-…)`); fondos, overlays y efectos los pinta `SectionShell`. Los temas viven en `src/themes/<id>/`.
   - Los datos del evento llegan por props desde el `config`; nada de textos, fechas ni colores fijos.
5. **Efectos:**
   - Animar solo `transform` y `opacity`.
   - Limpiar listeners, observers e intervalos en `onBeforeUnmount`.
   - Respetar `prefers-reduced-motion`.
   - No reimplementar el scroll (nada de `wheel` + `preventDefault`).
   - Toda duración y retraso pasa por la velocidad de la invitación: `calc(0.8s * var(--motion-scale))` en CSS y `motionTime()` en estilos en línea; los temporizadores de JS multiplican por `motionScale()`. El token vive en `themes/tokens.css` (hoy 1.1).
6. **Configuración por entorno:** URLs con `VITE_API_URL` y `FRONTEND_URL`, nunca `127.0.0.1` fijo.
7. **Pruebas:** cada endpoint nuevo lleva una prueba Feature; cada servicio o composable nuevo, una prueba en Vitest.
8. **Sin base de datos:** todo dato persistente es un archivo CSV (UTF-8 con BOM, CRLF) que se puede abrir en Excel. Las escrituras son atómicas (tmp + rename) y con `flock`; antes de sobrescribir, se respalda con fecha.
9. **Idiomas:** la interfaz y los mensajes al usuario van en **español (México)**. El código de `api/` y `web/` va en inglés; `recepcion/` se queda en español (ya está escrito así).
10. **Gestor:** la `config` la arma solo el servidor (`InvitationConfigBuilder`); no hay un segundo builder en TS. Un tipo de sección nuevo = entrada en `Catalog` + componente con `data-text` y `var(--t-<bloque>-…)` + línea en `sectionRegistry` (ver `frontend.md` §6). La clave del panel nunca va en el diseño.
11. **Temas con diseño propio, todo reutilizable:**
    - Un tema nuevo no recolorea a otro: cada sección lleva un diseño propio, aunque su contenido sea el mismo (D20).
    - Los diseños son variantes globales (`components/sectionVariants.ts` → `components/sections/variants/`, o piel CSS en `variants/skins.css`) que cualquier tema puede usar. Los adornos genéricos van en `themes/_shared/assets`.
    - Cada detalle nuevo (orillas, botones, confeti, esquinas…) es una opción de `pagina` o de la sección, y el tema pone su valor en el manifest. Nada queda amarrado a una sola plantilla.
    - Antes de terminar, NAT y las muestras deben verse igual que antes (capturas). Guías en `frontend.md` §6; catálogo en `01-analisis-codigo/efectos-reutilizables.md`.

## Referencias rápidas

| Tema | Archivo |
|---|---|
| Avance, cambios contra el plan y lo que falta | `docs/plan-invitaciones/09-avance.md` |
| Gestor de plantillas y formato `invitacion.csv` | `docs/plan-invitaciones/04-fases/fase-8-gestor-de-plantillas.md` y `eventos/README.md` |
| Decisiones y preguntas abiertas | `docs/plan-invitaciones/08-decisiones-pendientes.md` |
| Bugs actuales con archivo:línea | `docs/plan-invitaciones/01-analisis-codigo/bugs-y-riesgos.md` |
| Efectos, diseños de sección y opciones de página reutilizables (y cómo agregar más) | `docs/plan-invitaciones/01-analisis-codigo/efectos-reutilizables.md` y `03-arquitectura-objetivo/frontend.md` §6 |
| Plan del buscador (recepción) | `docs/plan-invitaciones/01-analisis-codigo/PLAN-Buscador-Invitados.md` |
| Modelo de datos | `docs/plan-invitaciones/03-arquitectura-objetivo/modelo-datos.md` |
| Contrato de API | `docs/plan-invitaciones/03-arquitectura-objetivo/api-contrato.md` |
| Frontend y temas | `docs/plan-invitaciones/03-arquitectura-objetivo/frontend.md` |
| Schema del `config` del evento | `docs/plan-invitaciones/03-arquitectura-objetivo/evento.schema.json` |
| Diseño a clonar (NAT) | `docs/plan-invitaciones/02-diseno-nat/` (ficha, secciones, assets, capturas) |
| QA antes de publicar | `docs/plan-invitaciones/05-calidad/checklist-qa.md` |
| Landing, cotizaciones y demos | `docs/plan-invitaciones/04-fases/fase-10-landing-y-demos.md` y `web/landing/` |
| Secciones nuevas (regalos, galería, video, álbum, trivia…) | `docs/plan-invitaciones/04-fases/fase-9-secciones-nuevas.md` |
