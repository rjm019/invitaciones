# Mapa de secciones — tema `jardin-azul` (basado en "NAT")

Cada sección indica el **rango vertical en el original** (medido con un viewport de 1054 px), el contenido (con las claves de `contenido.example.json`), los assets (números de `assets-manifest.csv`), el **componente Vue** que la implementa y el **efecto** que se aplica.

> Convención: `{{clave}}` = dato que sale de la configuración del evento, nunca texto fijo en el componente.

---

## 01 · Portada / sobre — `HeroEnvelope.vue` (y 0–600)

- **Contenido:**
  - Corona dorada.
  - "mis xv años" `{{event.subtitle}}`.
  - Nombre grande `{{event.celebrant.short_name}}` (en el original, un apodo corto de 3 letras).
  - Salón `{{event.venue.name}}` y ciudad `{{event.venue.city}}`.
- **Assets:** 3 (sobre + tarjeta), 4 (rosas), 6 (corona), 7 (mariposas), 1 (textura de fondo).
- **Layout:**
  - Sobre centrado de ≈412×597, con la tarjeta blanca encima.
  - Rosas en la esquina superior izquierda de la tarjeta y mariposas abajo a la derecha.
  - Los textos van centrados sobre la tarjeta.
- **Efecto (nuevo):**
  1. **Estado inicial:** sobre cerrado con la leyenda "Toca para abrir".
  2. **Al tocar:** la solapa gira con `rotateX(180deg)` y la tarjeta sube con `translateY(-40%)` (≈900 ms, `cubic-bezier(.2,.8,.2,1)`). Ese mismo toque inicia el audio.
  3. **Después:** se desbloquea el scroll de la página.
  4. **Con `prefers-reduced-motion`:** se muestra la tarjeta abierta, sin animación.
- **Aceptación:**
  - Se ve completo en 360×640 sin hacer scroll.
  - El nombre no se corta con 12 caracteres.
  - El audio arranca solo después del toque.

## 02 · Música — `MusicPlayer.vue` (y 600–770)

- **Contenido:**
  - "DALE PLAY" `{{music.label}}`.
  - Barra de progreso.
  - Controles: shuffle, anterior, play/pausa, siguiente, repetir.
  - Corazón azul decorativo.
- **Assets:** el 8 se reemplaza por iconos (Font Awesome o SVG) en `--color-oro`. El botón central es un círculo de 50 px en oro con el icono en blanco.
- **Efecto (del repo):**
  - Reproductor de `invitation.vue`: play/pausa, barra con *seek*, tiempo actual y duración.
  - Disco o botón con un pulso suave mientras suena.
  - **Mini-reproductor flotante** fijo abajo a la derecha cuando la sección sale de pantalla.
- **Variante:** si `{{music.spotify_playlist_url}}` existe, se añade debajo un iframe de Spotify (`https://open.spotify.com/embed/playlist/<id>`, 152 px de alto, tema oscuro desactivado).
- **Aceptación:**
  - Funciona en iOS Safari.
  - El audio pesa ≤ 3 MB (ideal ≈2 MB).
  - El estado de play se mantiene al hacer scroll.

## 03 · Bendición y familia — `Blessing.vue` (y 770–1270)

- **Contenido:**
  - "Con la bendición de Dios y todo el cariño tenemos el honor de invitarte a este día tan especial para mí" `{{texts.blessing}}`.
  - "mis xv años".
  - Divisor dorado.
  - Lista `{{family[]}}`: cada elemento tiene `role` ("Mi mamá", "Mi papá", "Mis padrinos") y `names`.
- **Assets:** 9 (fondo toile), 10 (tarjeta en arco), 11 (hojas), 12 (divisor), 13 (lazo).
- **Layout:**
  - Rectángulo con fondo toile de ≈468×832.
  - Tarjeta en arco centrada (radio superior = mitad del ancho).
  - Lazo que sobresale abajo, al centro.
- **Efecto:** *reveal* (fade y subida de 24 px) al entrar al viewport.
- **Aceptación:** con 1 a 4 grupos familiares, el arco crece en altura sin deformarse.

## 04 · Save the date + calendario — `SaveTheDate.vue` + `MonthCalendar.vue` (y 1300–1930)

- **Contenido:**
  - "Save the date" sobre brillo dorado.
  - "28 ♥ NOVIEMBRE ♥ 26", generado desde `{{event.starts_at}}`.
  - Calendario D L M M J V S del mes del evento, con el día marcado por un corazón.
- **Assets:** 14 (brillo dorado). Del 15 y el 16 solo se toma la referencia visual: el calendario se **genera** y el corazón es SVG.
- **Layout:**
  - Rejilla de 7 columnas con líneas doradas de 1 px; solo líneas internas, sin borde exterior.
  - Números en serif `--color-oro`, de 24–28 px.
- **Efecto:**
  - El corazón del día se dibuja con `stroke-dashoffset` al entrar.
  - Los números aparecen escalonados, 20 ms cada uno.
- **Aceptación:**
  - El mes, el primer día de la semana y el día marcado son correctos en cualquier fecha (prueba unitaria de `useCalendar`).
  - Calcula en la zona horaria del evento.

## 05 · Foto de la festejada — `PhotoArch.vue` (y 1930–2640)

- **Contenido:** `{{media.portrait}}`, una foto recortada sin fondo (PNG/WebP con transparencia).
- **Assets:**
  - 18 (marco en arco dorado), 17 y 19 (estrellas), 21 (mariposas doradas).
  - **El 20 es la foto real de la festejada: NO reutilizar.** En el tema va un placeholder.
- **Layout:**
  - Marco en arco de ≈338×730.
  - La foto sobresale del marco por arriba: la cabeza sale del arco, con efecto "pop-out".
- **Efecto:**
  - Parallax leve: la foto se mueve un 6 % más lento que el marco.
  - Destellos que titilan con `opacity` de 0.4 a 1 en 2.4 s.
- **Aceptación:**
  - Funciona con fotos de 3:4 a 9:16.
  - Usa `loading="lazy"` y `srcset` 1x/2x.

## 06 · Ubicación — `Location.vue` (y 2640–3215)

- **Contenido:**
  - "Ubicación" y un pin.
  - Nombre del salón en mayúsculas `{{event.venue.display_name}}`.
  - Botón "VER EN MAPS" que abre `{{event.venue.maps_url}}`.
  - Foto del salón `{{event.venue.photo}}`.
- **Varias ubicaciones:** soporta una lista `{{locations[]}}`, por ejemplo misa y recepción por separado (como en la boda del repo).
- **Assets:** 22 (pin, que pasa a icono), 23 (botón, que pasa a CSS), 24 (foto del salón, dato del evento).
- **Efecto:** el botón tiene un brillo que cruza (*shine*) cada 4 s.
- **Aceptación:**
  - Los enlaces abren la app de Maps en el celular.
  - Opcional: botón "Agregar al calendario" (archivo .ics o Google Calendar).

## 07 · Frase — `Quote.vue` (y 3215–3390)

- **Contenido:** "Hoy comienza el capítulo más bonito de mi historia" `{{texts.quote}}`, en script monolínea azul (`--color-azul`), seguida del divisor de laurel (asset 25).
- **Efecto:** el texto aparece letra por letra con `clip-path` o máscara, en 1.2 s.

## 08 · Itinerario — `Itinerary.vue` (y 3400–4030)

- **Contenido:**
  - "Itinerario".
  - `{{itinerary[]}}`: cada elemento tiene `label`, `time` e `icon`.
  - En el original: Recepción 5:00 pm, Entrada oficial 5:50 pm, Banquete 6:00 pm, Protocolo 7:15 pm, Fiesta 8:00 pm.
- **Assets:**
  - 26 (marco ornamental azul).
  - Iconos: corona (6/28), cubiertos (29, pasa a FA), copas (30), bola disco (31).
  - La línea con puntos (27) se hace en CSS.
- **Layout:**
  - Línea vertical dorada al centro con un punto por evento.
  - Los eventos alternan izquierda y derecha, con icono y texto.
- **Efecto (del repo, mejorado):**
  - La línea se **llena** de arriba hacia abajo según el scroll y cada punto se "enciende" (`.active`) al pasar la mitad del viewport.
  - Se implementa con `IntersectionObserver` y un `scroll` con `requestAnimationFrame`, sin `querySelectorAll` global.
- **Aceptación:**
  - Funciona con 3 a 8 eventos.
  - En pantallas menores de 360 px pasa a una sola columna.

## 09 · Dress code — `DressCode.vue` (y 4060–4740)

- **Contenido:**
  - "Dress Code".
  - "VESTIMENTA FORMAL EN COLOR NEGRO" `{{dress_code.title}}`.
  - Figuras de mujer y hombre.
  - "Para crear una atmósfera única y especial te invitamos a acompañarnos vistiendo únicamente de color negro" `{{dress_code.text}}`.
  - Muestra de color `{{dress_code.colors[]}}`.
- **Assets:** 32 (marco azul, pasa a CSS), 33 (sello de lacre), 34 (tarjeta), 35 y 36 (figuras), 37 (círculo, pasa a CSS).
- **Efecto:**
  - El sello de lacre "cae" con escala de 1.3 a 1 y rebote suave.
  - Las figuras entran desde los lados.
- **Aceptación:** soporta de 1 a 4 colores sugeridos o reservados.

## 10 · Cuenta regresiva — `Countdown.vue` (y 4740–5180)

- **Contenido:**
  - "Inicia la cuenta regresiva".
  - DD : HH : MM : SS con etiquetas DÍAS, HORAS, MINUTOS y SEGUNDOS.
  - Divisor con corona.
  - Frase `{{texts.closing_quote}}`: "Hay momentos en la vida que son especiales por sí solos, pero compartirlos con las personas que quieres los convierte en inolvidables".
- **Assets:** 38 (mariposa), 40 (divisor, pasa a SVG). El iframe 39 se **elimina**.
- **Efecto (del repo):**
  - Countdown que se actualiza cada segundo, con los números en `--color-oro` a 56–64 px.
  - Cuando llega a 0 muestra "¡Hoy es el gran día!".
  - **Limpia el `setInterval` en `onBeforeUnmount`.**
- **Aceptación:** coincide con `{{event.starts_at}}` en la zona `{{event.timezone}}`. Para el original el resultado correcto es ≈47 días al 12-oct.

## 11 · Confirmación (RSVP) — `RsvpCard.vue` + `RsvpForm.vue` (y 5180–5470)

- **Contenido:**
  - "Confirmación".
  - "¡AGRADECEMOS QUE CONFIRMES TU ASISTENCIA!".
  - "ANTES DEL {{event.rsvp_deadline | fecha}}".
  - Botón "¡Confirma aquí!".
- **Assets:** 41 (óvalo de lino), 42 (rosas), 43 (botón, pasa a CSS).
- **Comportamiento nuevo:**
  - **Si la invitación tiene token** (`/i/:token`), muestra "Familia {{invitation.family_name}} · {{invitation.passes}} pases" y abre el formulario en un modal o *bottom sheet*:
    - ¿Asistirán? (Sí / No).
    - Nombres de los asistentes, hasta el número de pases.
    - Canción que no puede faltar (opcional).
    - Mensaje para la festejada (opcional).
  - **Si ya respondió:** muestra el resumen y un botón "Modificar".
  - **Después de la fecha límite:** el botón se deshabilita y muestra "Confirmaciones cerradas".
  - **Sin token** (`/e/:slug`): el botón abre WhatsApp con un mensaje prellenado, o el formulario sin pases si `{{rsvp.mode}} = "open"`.
- **Aceptación:**
  - Imposible registrar más asistentes que pases (validado en el backend).
  - Funciona con doble envío.
  - Muestra mensajes de error claros.

## 12 · Cierre — `Closing.vue` (y 5470–5530)

- **Contenido:** "¡Te esperamos!".
- **Extras opcionales:**
  - Botón "Compartir por WhatsApp".
  - Hashtag del evento.
  - Créditos "Hecho por…" (marca propia, en lugar de "Diseñado con Canva").

---

## Elementos globales

- **Fondo:** textura de papel fija (`background-attachment: scroll` en móvil, por rendimiento en iOS).
- **Ancho:** columna de 100 % hasta un máximo de 480 px, centrada. En escritorio, márgenes con la misma textura.
- **Mariposas flotantes:** 2 o 3 SVG/PNG posicionados que se mueven en loop: 6–9 s, `translate` de ±8 px y rotación de ±4°.
- **Mini-reproductor fijo:** aparece después de abrir el sobre.
- **Accesibilidad:**
  - Contraste del café sobre papel ≥ 7:1.
  - Los botones tienen `aria-label`.
  - El audio nunca suena sin una acción del usuario.
