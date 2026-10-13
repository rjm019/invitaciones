# Ficha de diseño — "NATASHA" (XV años, jardín azul y oro)

| Campo | Valor |
|---|---|
| URL publicada | https://invitecs.my.canva.site/natasha |
| Plataforma de origen | Canva Sitios web (plan gratuito: muestra el pie "Diseñado con Canva") |
| Fecha de captura | 12-oct-2026, 22:45 (America/Mexico_City) |
| Tipo de evento | XV años |
| Estilo | Romántico / jardín: acuarela azul (rosas, mariposas, moños), oro y papel texturizado |
| Formato | Una sola página con scroll vertical; diseñada para celular y centrada en escritorio |
| Ancho útil del contenido | ≈ 460 px (columna central). Todo el diseño cabe en 360–480 px |
| Alto total | ≈ 5,580 px con un viewport de 1054 px; ≈ 12 secciones |
| Contenedor de scroll | Canva hace scroll dentro de `div.ZRRuDw`, no en el `body` |
| Base de los assets | `https://invitecs.my.canva.site/natasha/_assets/media/<archivo>` (ver `assets-manifest.csv`) |
| Capturas | `privado/capturas/01.jpg` … `10.jpg` (fuera de git porque muestran nombres reales; la foto de la festejada está pixelada a propósito en 04 y 05) |
| Datos reales del evento | `privado/contenido-real.json` (**no subir al repo público**) |

---

## 1. Paleta de color

Los valores salen de los estilos calculados de la página, y los de fondo de muestrear las capturas.

| Token CSS | Hex | Uso |
|---|---|---|
| `--color-oro` | `#96792C` | Títulos en script ("Save the date", "Ubicación", "Itinerario"…), "mis xv años", fechas del calendario |
| `--color-oro-brillo` | `#C0902C` | Botones dorados (degradado), brillos |
| `--color-oro-claro` | `#E2C77A` | Inicio del degradado dorado de los botones y del marco de la foto |
| `--color-cafe` | `#523C0B` | Texto de cuerpo, nombres, itinerario, "DALE PLAY" |
| `--color-azul` | `#8CC0E8` | Frase en script azul ("Hoy comienza el capítulo…"), corazones |
| `--color-azul-polvo` | `#ABC1D9` | Marco del dress code y sobre |
| `--color-azul-claro` | `#C8DDEE` | Luces del sobre y acuarelas |
| `--color-papel` | `#F3F1EC` | Fondo base (debajo de la textura) |
| `--color-tarjeta` | `#F6F6F6` | Tarjetas de papel blanco |
| `--color-lino` | `#F0EDE8` | Tarjetas de lino (arco y óvalo) |
| `--color-negro` | `#000000` | Figuras y muestra del dress code |

Degradado sugerido para los botones dorados: `linear-gradient(180deg, #E2C77A 0%, #C0902C 55%, #96792C 100%)`, con sombra `0 2px 4px rgba(82,60,11,.35)`.

## 2. Tipografías

Canva ofusca los nombres de las fuentes (`YAHNdemC4i0_0`, `YAGXhP81m8s_0`, …). Estos son equivalentes **aproximados** en Google Fonts, identificados visualmente:

| Rol | ID en Canva | Equivalente sugerido | Alternativas | Dónde aparece |
|---|---|---|---|---|
| Script caligráfico (títulos) | `YAGXhP81m8s_0` | **Pinyon Script** | Great Vibes, Italianno | Save the date, Ubicación, Itinerario, Dress Code, Inicia la cuenta regresiva, Confirmación, ¡Te esperamos! |
| Script monolínea | `YAHNdemC4i0_0` | **Sacramento** | Allura, Parisienne | "mis xv años", salón y ciudad de la portada, "Mi mamá", frase azul |
| Serif de cuerpo | `YAFcfkb7jcU_0` | **EB Garamond** | Cormorant Garamond | Bendición, textos del dress code, calendario, confirmación |
| Serif espaciada (nombres y etiquetas) | `YAEw2GhSLyw_0` | **Marcellus** | Cormorant SC | nombres de familiares, nombre del salón, itinerario |
| Serif display | `YAFdJhem5V8_1` | **Playfair Display** | Bodoni Moda | "DALE PLAY", "¡Confirma aquí!" |
| Serif pequeña (botón) | `YAGzXW3gftg_0` | **Cormorant Garamond 600** | — | "VER EN MAPS" |
| Nombre grande de portada | (posible imagen) | **Pinyon Script** a 110–130 px | — | Portada |

### Escala tipográfica (medida en un contenedor de ≈460 px)

| Elemento | Tamaño | Interletrado | Color |
|---|---|---|---|
| Nombre de portada | 110–130 px | normal | `--color-oro` |
| Títulos script de sección | 55–77 px | normal | `--color-oro` |
| Script monolínea ("mis xv años") | 49 px | normal | `--color-oro` |
| "Salón / Ciudad" (portada) | 31–33 px | normal | `--color-oro` |
| Nombre (serif espaciada) | 28 px | 1.4 px | `--color-cafe` |
| Fecha del calendario ("28 NOVIEMBRE 26") | 28–31 px | 3.3–3.6 px | `--color-oro` |
| Itinerario (evento y hora) | 21–23 px | 1.0–1.2 px | `--color-cafe` |
| Cuerpo | 22–25 px | 0.1 px | `--color-cafe` |
| "DALE PLAY" | 23 px | 2.6 px | `--color-cafe` |
| "ANTES DEL 6 DE NOVIEMBRE" | 15 px | 1.9 px | `--color-cafe` |
| Botón "VER EN MAPS" | 15 px | 0.6 px | `--color-cafe` |

En código, cada tamaño se escribe con `clamp()` en función del ancho, por ejemplo `font-size: clamp(2.6rem, 11vw, 3.4rem)` para los títulos script.

## 3. Texturas y materiales

- **Fondo:** textura de papel crema que cubre toda la página (`39a0373d….png`, 1600×2400).
- **Tarjetas:** papel blanco con fibra (sobre, dress code) y lino crema (arco de la bendición, óvalo de la confirmación).
- **Ilustraciones:** acuarela azul (rosas, lazo, mariposas, marco del itinerario) y oro (corona, laurel, estrellas, marco de la foto).
- **Sombras:** suaves y cálidas, por ejemplo `0 8px 24px rgba(82,60,11,.12)`.

## 4. Interacción y animación en el original

- **Animaciones:** no tiene animaciones de entrada; Canva publica el sitio prácticamente estático.
- **Reproductor "DALE PLAY":** es una **imagen**, no reproduce nada (no hay `<audio>` en la página).
- **Cuenta regresiva:** es un **iframe externo** (`canva-embed.com → /countdown/11504943/my-countdown`). ⚠️ El 12-oct marcaba **66 días**, que apunta a ≈18-dic; el evento es el **28-nov** (debería marcar ≈47 días). En código se calcula desde la fecha del evento y se elimina ese error.
- **Calendario:** es una **imagen** fija.
- **Confirmación:** enlaza a un Google Form (`forms.gle`), sin control de pases.
- **Ubicación:** botón a Google Maps.

## 5. Mejoras que aporta el código (resumen)

1. Reproductor real con los mismos iconos (shuffle, anterior, play/pausa, siguiente, repetir), barra dorada y la indicación "Dale play".
2. Portada con **sobre que se abre** al tocarlo, lo que además permite reproducir el audio (los navegadores bloquean el autoplay hasta que hay interacción).
3. Calendario y cuenta regresiva **generados desde la fecha del evento**.
4. Itinerario con **línea dorada que se llena al hacer scroll** (efecto del repo).
5. Confirmación propia con **pases por familia**, enlace único y panel de respuestas.
6. Mariposas con animación sutil de "flotar" y entrada suave de secciones (respetando `prefers-reduced-motion`).
