# Fase 10 — Landing con cotización y 3 demos

**Objetivo:** que la raíz del sitio venda: una landing elegante y rápida (SEO/AEO), sin precios, donde el cliente deja su teléfono para que le coticemos, con 3 demos (boda, XV y graduación) que muestran que todo es a la medida.
**Planeada:** 15-oct-2026.

> Casillas: `[x]` hecho · `[ ]` pendiente.

## Avance

- [x] 1. Landing (inicio, 3 páginas por evento, aviso de privacidad) + cotización (API, CSV, correo) + "Cotizaciones" en el gestor (15-oct, rama `feature/landing-y-secciones`, sin publicar)
  - Páginas en `web/landing/*.html` con piezas compartidas en `web/landing/partials/` (`<!-- @include … -->`, ver `web/landing/build/`); los datos del negocio (marca, responsable, correo, WhatsApp) en `web/landing/site.json`; lo vacío no se muestra. El JSON-LD de las preguntas se arma solo desde las preguntas de cada página.
  - Sin fotos todavía: el celular y sus pantallas están dibujados en HTML y CSS (carga al instante). Las fotos de bancos libres llegan con los demos (paso 2).
  - Pesa 2 KB de JS y 5 KB de CSS (gzip), más las fuentes auto-hospedadas.
  - **Cambió:** el correo va por SMTP de Resend con el mailer de Laravel (sin paquete extra): secretos `MAIL_*` + `COTIZACIONES_CORREO` (ver `06-despliegue/despliegue.md`).
  - `robots.txt`, `sitemap.xml` y `llms.txt` en `web/public/` (con la dirección de fly.dev: cambiarla al tener dominio).
  - **No publicar todavía:** la landing anuncia secciones de la fase 9 (mesa de regalos, álbum, trivia…) y enlaza a los demos (`/e/demo-…`), que aún no existen.
- [x] 2. Tema `marfil` + tipo graduación + 3 demos con las secciones actuales (15-oct)
  - **Cambió:** sin fotos (ni de bancos libres): dibujos de línea fina y bloques de la paleta, como el álbum dibujado de la landing (pedido del usuario).
  - Tema `web/src/themes/marfil/` con sus adornos en SVG (sobre, tarjeta, sello, ramas, divisor, destellos, tiara, moño, vestido y traje).
  - Las muestras viven en `deploy/demos/` (`armar.py` las escribe; `instalar.sh` las copia a `eventos/`; `subir.sh` las sube a Fly) y abren en `/i/DemoBoda2026`, `/i/DemoXVAnos26` y `/i/DemoGradua26`. Entre las tres usan las 17 secciones.
  - `demo=SI` en `ajustes.csv`: se puede confirmar y dejar dedicatoria, pero no se guarda nada ni se anotan las visitas; muestra el listón "Es una muestra · Cotizar".
  - Landing: "o cualquier evento" en cada lista, "invitación" en vez de "enlace", la mesa de regalos al final, una tarjeta "Cualquier evento" y la sección de integraciones (Spotify, redes, YouTube, mapas, calendario, WhatsApp, clima). El celular fijo ya no se encima en ventanas bajas.
- [ ] 3. Las secciones de la fase 9, actualizando los demos con cada una
- [ ] 4. Video del hero, imágenes Open Graph, Lighthouse y publicar


## Contexto

Hoy la raíz `https://invitaciones-jiro.fly.dev/` cae en el SPA (`SpaController`, ruta `fallback`) y muestra "no encontrado". Necesitamos una **landing que venda**:
- sin precios, con **"Cotizar"**: el cliente deja su teléfono y nosotros le cotizamos;
- pensada en **SEO/AEO**;
- muy fluida y elegante: "menos es más", con inspiración en Apple y en el diseño de NAT, colores neutros y el estilo editorial de papelería de boda de Pinterest;
- con énfasis en **boda, XV años y graduación**.

La referencia es teinvitamos.mx, que hace lo contrario de lo que queremos: precios, paquetes, 21 funciones en lista, descuentos y un widget de chat. Nosotros vendemos **a la medida**, con la frase de marca: **"Hacemos posibles tus sueños. Nada es imposible para nosotros."**

**Decisiones del usuario (15-oct):**
- Por ahora en `invitaciones-jiro.fly.dev`. Después: **jirosolutions.com/.mx** para la landing e **invites.jirosolutions.com/.mx** para las invitaciones.
- Aviso de cotización en el **gestor + correo**.
- **3 demos** (boda, XV y graduación) sobre **un tema neutro nuevo** con 3 paletas. Cada demo combina las secciones de forma distinta, para que se note que todo es a la medida.
- Fotos de **bancos libres** (Unsplash o Pexels), con su crédito.

## Arquitectura (aprovechar Fly)

- **Páginas estáticas, sin PHP ni framework en el cliente.**
  - La landing son páginas HTML ya escritas, con todo el contenido en el HTML (lo que leen Google y los motores de respuestas).
  - Son entradas extra de Vite (`web/landing/*.html` en `build.rollupOptions.input`), con su CSS y un TS pequeño (vanilla, < 15 KB gz) solo para el formulario y las animaciones de scroll.
  - Apache las entrega directo, como ya hace con `/assets` y `/media` (reglas en `deploy/apache-site.conf`). Una máquina de 512 MB sirve miles de visitas sin despertar a PHP; PHP solo atiende el envío de la cotización.
- **URLs** (español, legibles):

  | Ruta | Página |
  |---|---|
  | `/` | Inicio |
  | `/invitaciones-digitales-boda` | Boda |
  | `/invitaciones-digitales-xv-anos` | XV años |
  | `/invitaciones-digitales-graduacion` | Graduación |
  | `/aviso-de-privacidad` | Aviso de privacidad |
  | `/e/demo-boda`, `/e/demo-xv`, `/e/demo-graduacion` | Los demos (invitaciones reales del motor) |

- **Lista para el dominio propio:** canonical, sitemap y Open Graph salen de `SITE_URL` en el build. Cuando exista el dominio:
  - el mismo app de Fly atiende los dos hosts (`fly certs add`);
  - un middleware manda `/` del host de invitaciones a la landing y `/i`, `/e`, `/panel` y `/gestor` del host de la landing al de invitaciones;
  - `FRONTEND_URL` pasa a `invites.…` (ya se usa para armar los enlaces). Mientras tanto, todo vive en fly.dev.

## Diseño

- **Inspiración:**
  - *Apple*: un mensaje por pantalla, tipografía grande, mucho aire, el producto (el celular con la invitación) como protagonista, animaciones discretas al hacer scroll.
  - *NAT*: la letra manuscrita como acento (una palabra, no párrafos), las mayúsculas espaciadas con serifa y los divisores finos.
  - *Pinterest, papelería de boda editorial*: neutros cálidos, línea fina y texturas de papel muy suaves.
- **Paleta (tokens en `:root`):**

  | Color | Hex |
  |---|---|
  | Marfil | `#FAF8F5` |
  | Arena | `#EFE9E1` |
  | Piedra | `#D6CEC3` |
  | Taupe | `#8A8178` |
  | Carbón | `#1D1D1F` |
  | Champaña (acento; el dorado de NAT, aclarado) | `#B39A74` |

  Fondo claro; botones en carbón con texto marfil.
- **Letras:**
  - títulos en *Cormorant Garamond* (la de NAT);
  - un acento en *Pinyon Script*;
  - el cuerpo en la letra del sistema (`-apple-system, system-ui…`: en iPhone y Mac es San Francisco y no pesa nada);
  - fuentes **auto-hospedadas** en WOFF2 con subconjunto latino y `font-display: swap` (sin depender de Google Fonts).
- **Movimiento:** IntersectionObserver + clases; solo `transform` y `opacity`, `prefers-reduced-motion` respetado. Ningún secuestro del scroll (regla 5).

### Inicio (`/`), sección por sección

1. **Hero:**
   - texto pequeño en mayúsculas: "Invitaciones digitales";
   - `h1`: "Hechas a la medida de tu historia";
   - frase: **"Hacemos posibles tus sueños. Nada es imposible para nosotros."**;
   - CTA **Cotizar** y "Ver ejemplos";
   - a la derecha (abajo en el celular), un iPhone dibujado en CSS con un video corto (WebM/MP4 en silencio, en bucle, ~1 MB, con póster para el LCP) del demo de boda abriéndose.
2. **Tres celebraciones:** Boda · XV años · Graduación. Tres tarjetas grandes con foto, una línea y "Ver demo" / "Saber más".
3. **"Nada es imposible":** el celular queda fijo mientras cambian a un lado las secciones (sobre, mesa de regalos, álbum, trivia, ubicación…), cada una con una frase de 8 palabras. Remata con: "¿Lo imaginas? Lo hacemos."
4. **Lo que tus invitados viven / lo que tú controlas:** dos columnas sobrias.
   - Invitados: confirmar con su nombre, mapa y calendario, música, álbum, trivia.
   - Tú: panel en vivo, mesas, QR para la recepción, fecha límite.
   - Sin listas de 21 puntos: 6 por lado, con íconos de línea.
5. **Cómo trabajamos:** 3 pasos.
   1. Nos cuentas tu idea.
   2. La diseñamos contigo.
   3. La compartes y ves las confirmaciones en vivo.
6. **Preguntas frecuentes (AEO):** 8 a 10 preguntas con respuestas directas de 1 o 2 frases ("¿Qué es una invitación digital?", "¿Cómo confirman mis invitados?", "¿Puedo cambiar la fecha límite?", "¿Funciona sin app?", "¿Cuánto tarda?", "¿Se puede pedir algo que no ven aquí? — Sí: todo es a la medida").
7. **Cotizar:** el formulario (abajo) y el texto "Te escribimos por WhatsApp en menos de 24 h".
8. **Pie:** marca, enlaces a las 3 páginas, aviso de privacidad, © 2026.

**Páginas por evento** (boda, XV y graduación): misma estructura pero corta, con un `h1` propio ("Invitaciones digitales de boda a la medida"), lo que más se pide en ese evento (boda: mesa de regalos, lluvia de sobres, ceremonia y recepción; XV: vals, padrinos, álbum; graduación: generación, ceremonia, lista de graduados, trivia), su demo, un FAQ propio y "Cotizar".

## SEO / AEO técnico

- Contenido completo en el HTML estático: `lang="es-MX"`, un solo `h1` por página, encabezados en orden y `alt` en todas las imágenes.
- `title` y `meta description` únicos por página; `canonical`; Open Graph y Twitter con una imagen 1200×630 por página.
- **JSON-LD:** `Organization` + `WebSite` en el inicio; `Service` (`serviceType`, `areaServed: MX`) en cada página de evento; `FAQPage` donde haya preguntas; `BreadcrumbList` en las páginas internas.
- `robots.txt`: permite la landing; bloquea `/i/`, `/panel/`, `/gestor`, `/api/` y `/e/`. Las invitaciones ya llevan `noindex`; los demos también, pero la landing los enlaza.
- `sitemap.xml` con las 5 páginas; `llms.txt` con qué hacemos, para quién y cómo cotizar (para motores de respuestas).
- **Rendimiento** (meta en 4G, en celular):
  - LCP < 2 s, CLS < 0.05, INP < 100 ms;
  - JS de la landing < 15 KB gz;
  - imágenes WebP con `srcset` y `loading="lazy"` (salvo la del hero, con `fetchpriority="high"`);
  - el video del hero solo se carga con `prefers-reduced-data` ausente y en pantalla;
  - caché larga en `/assets`; las páginas con `Cache-Control: public, max-age=300`.

## Cotización

- **Formulario:**
  - nombre (opcional);
  - **WhatsApp o teléfono** (obligatorio; México: 10 dígitos, acepta +52, se guarda en formato E.164);
  - tipo de evento (Boda, XV años, Graduación, Otro);
  - fecha aproximada (opcional);
  - "Cuéntanos tu idea" (opcional, 600 caracteres);
  - casilla del aviso de privacidad (obligatoria).
  
  Si falla la red, se muestra un botón para escribirnos por WhatsApp. Funciona sin JS (POST normal y página de "¡Gracias!").
- **API:** `POST /api/public/quotes`.
  - Throttle de 5 por hora por IP.
  - Anti-spam sin captcha: un campo trampa oculto y un tiempo mínimo de 3 s desde que se cargó la página.
  - Mensajes en español.
  - Se guarda en `eventos/_gestor/cotizaciones.csv` (`CsvFile`, `safe()` contra fórmulas): `id, fecha, nombre, telefono, tipo, fecha_evento, idea, pagina, utm, estado (nueva|contactada|cotizada|cerrada|descartada), nota, atendio`.
- **Correo:**
  - Mailer `resend` de Laravel (paquete `resend/resend-php`); se envía con `defer()` después de responder, así que nunca hace esperar al cliente.
  - Mientras no haya dominio: desde `onboarding@resend.dev` hacia `COTIZACIONES_CORREO`. Con el dominio verificado, desde `cotizaciones@jirosolutions…`.
  - Secretos en Fly: `RESEND_API_KEY` y `COTIZACIONES_CORREO`. Sin ellos no se manda correo y solo queda en el gestor (y en el log).
- **Gestor, "Cotizaciones"** (para quien administra):
  - lista con filtro por estado y un contador de nuevas en la barra (con la misma consulta de versión que el panel);
  - botón **WhatsApp** (`wa.me/<tel>?text=Hola {nombre}, gracias por escribirnos…`);
  - cambiar estado y nota (se guarda quién atendió);
  - descargar CSV;
  - borrar a petición del cliente (derechos ARCO).
  - Endpoints bajo `manager.admin`, con prueba Feature.
- **Aviso de privacidad** (LFPDPPP): quién es el responsable, para qué se usa el teléfono (solo para cotizar), cuánto tiempo se guarda (12 meses) y cómo ejercer los derechos ARCO. *Faltan el nombre del responsable y el correo de contacto (pregunta al final).*

## Tema neutro y demos

- **Tipo de evento nuevo:** `graduacion` en `Catalog::EVENT_GROUPS`. `PanelService::titleFor` da "Graduación de {nombre}".
- **Tema nuevo** `web/src/themes/marfil/`:
  - adornos de línea fina en SVG (dibujados para el tema, en los slots del catálogo: divisor, marco, flores, lacre…);
  - el sobre de la portada en papel liso;
  - **3 paletas**: *Boda* (marfil, champaña y carbón), *XV* (rosa palo, arena y oro viejo) y *Graduación* (azul noche, marfil y dorado).
  - Mismo contrato de tokens que `jardin-azul`, para que todas las secciones funcionen sin tocarlas.
- **3 demos** con datos ficticios ("Valeria & Andrés", "Sofía", "Diego · Generación 2026"):
  - se arman en el gestor;
  - el código fuente se versiona en `deploy/demos/<slug>/` (`invitacion.csv` + `media/` de Unsplash/Pexels, con `CREDITOS.md`);
  - se suben con `deploy/subir-evento.sh`.

  | Demo | Secciones |
  |---|---|
  | **Boda** | Portada, música, frase, fecha, ubicación de ceremonia y recepción lado a lado, itinerario en vivo, vestimenta, mesa de regalos y lluvia de sobres, galería, video, hospedaje, confirmación, álbum, dedicatoria, cierre. |
  | **XV** | Portada, bendición y padrinos, cuenta regresiva, foto en arco, publicación de Instagram, ubicación en dos secciones separadas, trivia, playlist, clima, confirmación, dedicatoria, álbum. |
  | **Graduación** | Portada sobria, frase, fecha, ubicación de la ceremonia de toma de protesta, galería en carrusel, video vertical, itinerario, solo adultos, confirmación, cierre. |

  Cada demo lleva un **listón flotante** discreto: "Esta es una muestra · La tuya la hacemos a la medida → Cotizar". Sale con `demo=SI` en `ajustes.csv`. Las confirmaciones del demo responden "Es una muestra", sin escribir nada.

## Orden de trabajo total (Parte 1 + Parte 2)

1. **Landing + cotización + correo + gestor "Cotizaciones" + aviso de privacidad.** No depende de lo demás y empieza a traer clientes. Al principio enlaza un demo de boda con las secciones que ya existen.
2. **Tema `marfil` + tipo graduación + los 3 demos** con las secciones actuales.
3. **Secciones de la Parte 1**, en su orden (ubicación, itinerario en vivo y regalos → galería → video y redes → trivia → álbum). Con cada una se actualizan los demos y su frase en la landing.
4. **Al final:** video del hero grabado del demo terminado, capturas para Open Graph, Lighthouse y publicar.

**Archivos clave de la Parte 2:**
- `web/landing/*.html`, `web/src/landing/{landing.ts,landing.css}`, `web/vite.config.ts`
- `web/public/{robots.txt,sitemap.xml,llms.txt}`, `deploy/apache-site.conf`
- `api/app/Http/Controllers/Public/QuoteController.php`, `api/app/Services/Quotes/QuoteStore.php`, `api/app/Mail/NewQuote.php`
- vista del gestor `web/src/pages/ManagerQuotesPage.vue`, `web/src/themes/marfil/`
- `api/app/Services/Design/Catalog.php`, `deploy/demos/`

## Verificación de la Parte 2

- Pruebas Feature de la cotización:
  - teléfono inválido → `422`;
  - el campo trampa o un envío en menos de 3 s → se descarta en silencio (`200` sin guardar);
  - el sexto envío en una hora → `429`;
  - con `Mail::fake()`, el correo se manda después de responder;
  - quien solo edita no ve las cotizaciones (`403`).
- Vitest: normalización del teléfono, envío del formulario y estados.
- `curl -s /` ya trae el `h1`, el FAQ y el JSON-LD sin ejecutar JS. Validar con el Rich Results Test de Google y validator.schema.org.
- Lighthouse para móvil (Chromium sin interfaz en Docker): Performance ≥ 95, SEO 100, Accesibilidad ≥ 95. Capturas a 390 px y 1440 px para revisarlas contigo antes de publicar.
- `fly deploy --ha=false` solo cuando lo pidas; los secretos `RESEND_API_KEY` y `COTIZACIONES_CORREO` los pones tú con `fly secrets set` (sin `< >`).

## Preguntas para el final (no bloquean empezar)

- El nombre del responsable y el correo de contacto para el aviso de privacidad y el pie.
- El correo que recibe las cotizaciones (`COTIZACIONES_CORREO`).
- El número de WhatsApp del negocio (botón de respaldo del formulario y pie).
