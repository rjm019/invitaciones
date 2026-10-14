# PLAN — Sistema de recepción de invitados (independiente, offline, en Docker)

> **Ubicación:** `~/Documents/buscador-invitados/PLAN-Buscador-Invitados.md`
> **Proyecto:** independiente. **No** forma parte de `enegence` ni usa su repo, convenciones ni contenedores.
> **Fecha:** 2026-08-08
> **Origen:** prototipo `~/Desktop/buscador-invitados.html` (un solo archivo, 220 invitados embebidos) + layout `ACOMODO DE MESAS HOSTES`.
> **Modo de ejecución:** cada Etapa puede correr en un chat nuevo diciendo "ejecuta Etapa N de `~/Documents/buscador-invitados/PLAN-Buscador-Invitados.md`".

---

## 1. Objetivo

Convertir el prototipo de una sola página en un sistema propio que:

1. **Funcione sin internet** durante el evento. Cero CDN, cero fuentes remotas, cero servicios externos.
2. **Cargue el layout de acomodo de mesas** en `.xlsx` y `.csv` — el formato real de trabajo (rejilla de bloques por mesa), no una tabla plana — y lo normalice solo.
3. **Produzca un CSV resultante** con llegadas, horas y notas, reimportable, más un **resumen por mesa**.
4. Conserve **todo lo que ya hace** el prototipo: búsqueda sin acentos, marcar llegada, filtros por categoría, filtro por mesa, notas por invitado, reinicio protegido con contraseña `1910`.
5. Tome las **categorías del layout** (adultos, adolescentes, niños o las que traiga), sin listas fijas en el código.
6. Muestre **qué mesas ya están completas** y el avance/porcentaje de cada una.
7. Avise con una **campanita interna** cuando se agreguen notas nuevas.
8. Corra **montado en Docker**, sirviendo a **4-6 hostess marcando al mismo tiempo** desde sus celulares, en la red local y en tiempo real.
9. Quede listo para lo siguiente: un **dispositivo dedicado con IP fija** en esa red, al que cualquiera entre escaneando un QR.

---

## 2. Decisiones de arquitectura

### 2.1 Stack: JS plano, no Next

| | JS plano (recomendado) | Next.js |
| - | --- | --- |
| Peso en el navegador | ~150 KB, un archivo | 1–3 MB, cientos de archivos |
| Build | ninguno | `npm install` + build en cada cambio |
| Arranque del contenedor | instantáneo | segundos + imagen 3–5× más grande |
| Funciona con doble clic (sin servidor) | sí | no |
| Curva de mantenimiento a un año | leer un archivo | actualizar framework y dependencias |

**Decisión: front en JavaScript plano**, sin framework ni build. Next resuelve problemas que este sistema no tiene (SEO, SSR, rutas, ecosistema React) y cobra el peaje justo donde más duele: arranque, tamaño y dependencias que caducan. Para el servidor sí hace falta Node, pero mínimo (ver 2.2).

### 2.2 Dos modos, el mismo código

El sistema se entrega en **dos formas que comparten el 100% de la lógica de UI**:

- **Modo servidor** (Docker) — **el modo principal.** El front servido por un Node chico que guarda el CSV y sincroniza a todos los dispositivos en tiempo real. Con 4-6 hostess marcando a la vez, no hay alternativa: sin estado compartido, seis listas independientes se contradicen en veinte minutos.
- **Modo archivo** (`buscador-invitados.html`): un solo archivo autocontenido. Doble clic y funciona, sin Docker, sin red. Es el **respaldo del día del evento**: si falla el servidor, el Wi-Fi o la corriente, cada hostess sigue trabajando desde su copia y al final se reconcilia por CSV.

Que el modo archivo sobreviva no es nostalgia: es el plan B de un evento donde no puedes reiniciar nada a media recepción.

### 2.3 El CSV es la base de datos

Sin motor de base de datos. El estado vive en un CSV dentro de un volumen de Docker, con escritura atómica (`tmp` + `rename`) y respaldo con fecha en cada importación. Un solo proceso escribe el archivo, así que no hay condiciones de carrera. Se puede abrir en Excel a media fiesta sin apagar nada.

### 2.4 Campanita de notas (avisos internos de la plataforma)

**No** son notificaciones del sistema operativo, ni push, ni correo, ni WhatsApp. Es un apartado **dentro** de la plataforma cuyo único trabajo es que quien esté usándola note que **se agregaron notas nuevas**.

| Elemento | Comportamiento |
| -------- | -------------- |
| Campanita en el encabezado | Siempre visible. Con notas sin leer, muestra un globito con el número y da un rebote corto al llegar una nueva |
| Panel de notas | Al tocarla se abre la lista, la más reciente arriba: **nombre del invitado, mesa, texto de la nota y hora**. En modo servidor, además quién la escribió |
| Marcar como leída | Al abrir el panel el globito se limpia. El "ya lo vi" es **por dispositivo**: que una hostess lea no le apaga el aviso a las demás |
| Ir al invitado | Tocar una nota lleva a esa persona en la lista, lista para marcarla o editarle la nota |
| Editar y borrar | Editar una nota la vuelve a marcar como no leída para los demás. Borrarla la saca del panel |

**Lo único que dispara la campanita son las notas.** Las llegadas no: en plena recepción son cientos de eventos por hora y el globito perdería todo significado. Si más adelante quieren que algo más avise, se agrega — pero arrancar solo con notas es lo que mantiene el aviso creíble.

En modo archivo (un dispositivo) la campanita sigue sirviendo: es la bandeja de todas las notas capturadas, con lo nuevo desde la última vez que se abrió. En modo servidor es donde brilla, porque la nota que escribe una hostess le aparece a las demás al instante.

### 2.5 Las categorías las define el layout, no el código

Adultos, adolescentes y niños **no van clavados en el programa**. El layout declara qué categorías existen: el importador lee las columnas de conteo de cada bloque de mesa y de ahí salen las categorías del sistema, sus totales y los botones de filtro.

- **Se detectan por encabezado**, con sinónimos, en singular o plural: `ADULTO(S)` → `adulto`, `ADOLESCENTE(S)` / `JOVEN(ES)` → `adolescente`, `NIÑO(S)` / `NIÑA(S)` / `NINO(S)` → `nino`. Esto no es hipotético: en el layout actual las mesas 1-20 encabezan `ADULTOS, ADOLESCENTES, NIÑOS` y las mesas 21-24 encabezan `ADULTO, JOVEN, NIÑO`. Ambas formas tienen que caer en la misma categoría o los totales no cuadran.
- **Una categoría desconocida se da de alta sola.** Si un layout futuro trae `BEBÉS` o `STAFF`, aparece con su nombre en Título, sin tocar código.
- **El orden** de los botones es el orden de las columnas en el layout.
- **Declarada pero vacía no ensucia la pantalla.** Hoy `ADOLESCENTES` viene en el layout con total 0: la columna existe en el CSV y el informe de importación la reporta como `0/0` confirmada contra el total del archivo, pero no se pinta un botón que siempre diría cero. El día que llegue un adolescente, el botón aparece solo.

El sistema no sabe qué es un "niño": sabe leer columnas de conteo y sumar. Por eso aguanta el layout del próximo evento sin reprogramarse.

### 2.6 Tablero de mesas: cuáles ya están completas y cómo va cada una

Además de la lista de invitados, una vista **Mesas** que responde de un vistazo "¿qué mesa ya está completa y cuáles me faltan?".

| Elemento | Detalle |
| -------- | ------- |
| Tarjeta por mesa | `Mesa 5` · `8/11` · **73%** · barra de avance · desglose por categoría (`6 adultos · 2 niños`) |
| Estado | **Completa** (todos llegaron, en verde con palomita) · **En curso** (al menos uno) · **Sin llegar** (ninguno) |
| Resumen arriba | `7 de 22 mesas completas` y el avance global |
| Orden | Por número de mesa (default) o **por avance**, para ver primero las que están por cerrarse o las que ni empiezan |
| Filtro rápido | Ver solo completas / solo pendientes |
| Toca una tarjeta | Abre esa mesa en la lista de invitados, con el filtro por mesa ya puesto |

En la lista de invitados, el encabezado de cada mesa gana el porcentaje y la palomita de completa, para no tener que cambiar de vista cuando ya estás ahí.

**El tablero no toca la campanita.** Que una mesa se complete se ve, no avisa: la campanita es solo para notas (§2.4) y meterle otro tipo de evento la volvería ruido.

Este avance por mesa también sale en la exportación (§4.3), así queda registro del cierre del evento y no solo de la pantalla.

### 2.7 Seis hostess a la vez: identidad y choques

Con 4-6 personas marcando en la puerta al mismo tiempo, dos cosas dejan de ser detalle:

**Quién hizo qué.** Al abrir la app por primera vez, cada dispositivo se identifica una sola vez (nombre o "Hostess 1…6") y queda guardado en ese celular. Ese nombre viaja en cada marca y en cada nota: el renglón muestra `Llegó 20:14 · Ana` y el panel de notas dice quién escribió. Sin esto, a la hora del corte nadie puede resolver una duda.

**Choques.** Que dos hostess marquen al mismo invitado va a pasar, y seguido: la familia entra dividida y cada quien atiende a una parte.

- Marcar a alguien **ya marcado** no es un error ni un conflicto: es idempotente, el estado ya es el correcto y se conserva la primera hora con la primera hostess.
- **Desmarcar** sí es destructivo, así que pide confirmación cuando lo marcó otra persona: *"Ana lo registró a las 20:14. ¿Quitar la llegada?"*.
- Todo cambio llega a los demás dispositivos en menos de un segundo, así que el segundo lector ve la palomita **antes** de volver a preguntar el nombre.
- En las notas gana la última edición, y como la campanita avisa (§2.4), nadie pisa una nota sin enterarse.

**Opcional, si estorba el volumen:** filtro "mis mesas" para repartir el salón por rangos de mesa entre hostess. Se deja anotado, no se construye en la primera vuelta: conviene ver primero si de verdad se estorban.

---

## 3. Estructura del proyecto

```
~/Documents/buscador-invitados/
├── PLAN-Buscador-Invitados.md
├── docker-compose.yml
├── Dockerfile
├── package.json                 # solo 2 dependencias: ws y xlsx
├── public/                      # cliente, en MVC
│   ├── index.html               # contenedor de vistas
│   ├── css/
│   │   └── estilos.css
│   ├── js/
│   │   ├── models/              # datos y reglas; no tocan el DOM
│   │   │   ├── Invitado.js
│   │   │   ├── Categoria.js
│   │   │   ├── Mesa.js
│   │   │   └── ListaInvitados.js      # agregado: conteos, mesas, filtros, notas
│   │   ├── views/               # pintan el DOM; no deciden reglas
│   │   │   ├── EncabezadoView.js
│   │   │   ├── ListaView.js
│   │   │   ├── MesasView.js
│   │   │   ├── NotasView.js           # campanita
│   │   │   └── ImportarView.js
│   │   ├── controllers/         # orquestan modelo ↔ vista
│   │   │   ├── AppController.js
│   │   │   ├── InvitadosController.js
│   │   │   ├── MesasController.js
│   │   │   ├── NotasController.js
│   │   │   └── ImportacionController.js
│   │   ├── services/            # infraestructura, reutilizable en servidor
│   │   │   ├── LayoutService.js       # normalizador (rejilla y tabla plana)
│   │   │   ├── CsvService.js
│   │   │   ├── XlsxService.js
│   │   │   ├── AlmacenService.js      # localStorage
│   │   │   └── SincronizacionService.js
│   │   └── main.js              # arranque
│   └── vendor/                  # sweetalert2.min.js, xlsx.full.min.js (locales)
├── server/                      # servidor, en MVC
│   ├── models/
│   │   └── ListaRepositorio.js  # lee/escribe el CSV + respaldos
│   ├── controllers/
│   │   ├── EstadoController.js
│   │   ├── ImportacionController.js
│   │   └── ExportacionController.js
│   ├── routes/
│   │   └── api.js
│   └── index.js                 # HTTP estático + rutas + WebSocket
├── build/
│   └── empaquetar.mjs           # genera el HTML de un solo archivo (modo archivo)
├── ejemplos/                    # material de referencia para el importador
│   ├── layout-ejemplo.csv       # el acomodo real, en rejilla
│   ├── layout-ejemplo.xlsx      # el mismo, en Excel
│   └── invitados-plano.csv      # tabla plana ya normalizada (220 filas)
├── prototipo/                   # lo que ya funciona hoy, como referencia
│   ├── buscador-invitados.html
│   └── fuente/
├── data/                        # volumen Docker
│   ├── invitados.csv            # ← la base de datos
│   └── respaldos/
└── dist/
    └── buscador-invitados.html  # entregable modo archivo
```

**Convenciones de la separación (MVC):**

- **Modelos** — no conocen el DOM ni `localStorage`. Reciben datos, aplican reglas (quién llegó, cómo va cada mesa, qué categorías existen) y responden preguntas. Se pueden probar sin navegador.
- **Vistas** — solo pintan y emiten eventos. No deciden nada ni escriben en el modelo.
- **Controladores** — el único lugar donde se cruzan: escuchan la vista, mandan al modelo, piden repintar.
- **Servicios** — infraestructura sin reglas de negocio (parseo, almacenamiento, red). `LayoutService` se escribe en **UMD** para que el servidor lo reutilice con `require` sin duplicar una sola línea del importador.

Las mismas capas se repiten en `server/`, para que la lógica viva en un solo lado sin importar si corre en un celular o en el contenedor.

---

## 4. Modelo de datos

### 4.1 Esquema canónico (en memoria y en el CSV)

| Campo | Tipo | Notas |
| ----- | ---- | ----- |
| `id` | entero | estable; ancla las marcas aunque cambie el orden |
| `mesa` | entero | |
| `nombre` | texto | tal cual del layout |
| `categoria` | texto | **abierta, no lista fija** — la que declare el layout (`adulto`, `adolescente`, `nino`, …). Ver §2.5 |
| `llego` | `SI` \| vacío | |
| `hora` | `HH:MM` | se sella al marcar |
| `comentario` | texto | libre, hasta 300 caracteres |
| `nota_hora` | `HH:MM` | cuándo se escribió la nota; alimenta la campanita |
| `nota_por` | texto | quién la escribió; solo en modo servidor |
| `marcado_por` | texto | dispositivo/hostess; solo en modo servidor |

### 4.2 CSV resultante

`id,mesa,nombre,categoria,llego,hora,comentario,nota_hora,nota_por,marcado_por` — UTF-8 con BOM (para que Excel respete acentos y la Ñ), saltos CRLF. Reimportarlo restaura el estado completo: es a la vez respaldo, entregable y mecanismo de traspaso entre dispositivos.

Las categorías **no se guardan en un archivo aparte**: al reimportar una tabla plana se reconstruyen con los valores distintos de la columna `categoria`, respetando el orden en que aparecen. Un valor que el sistema no conozca se muestra en Título tal cual.

### 4.3 Resumen por mesa (segundo archivo de salida)

`resumen-mesas.csv` — `mesa,total,llegados,pendientes,porcentaje,completa` más una columna por categoría (`adulto_total,adulto_llegados,…`, generadas de las categorías que haya). Es el registro de cierre del evento: se genera al exportar y **también** se puede sacar a media recepción para un corte.

Este archivo es **derivado**: se reconstruye siempre desde `invitados.csv`, nunca se edita a mano ni se reimporta.

---

## 5. Importación del layout — la parte delicada

El archivo real **no es una tabla**: es una rejilla de bloques de mesa repartidos en columnas (offsets 0, 7 y 14 en el layout actual), con filas `TOTAL`, renglones de nota que no son personas ("REPETIDO EL NUMERO"), mesas vacías y encabezados desalineados entre bandas. El importador **no puede** asumir posiciones fijas: el layout del próximo evento vendrá distinto.

**Reglas del escáner (validadas ya contra el archivo real):**

1. Recorrer toda la rejilla buscando celdas que digan `MESA <n>`, en cualquier fila y columna.
2. Para cada una, derivar sus columnas leyendo a la derecha **todas** las columnas de conteo que traiga su encabezado — no una lista fija de tres. De ahí salen las categorías (§2.5) y el bloque se ubica solo, sin offsets fijos.
3. Bajar fila por fila hasta encontrar `TOTAL`, otro `MESA <n>`, o el fin del bloque.
4. **Es persona** si tiene nombre **y** al menos un conteo. Esto descarta solo las notas del capturista.
5. La categoría sale de cuál columna trae el 1.
6. Normalizar: recortar espacios, colapsar dobles espacios, reparar mojibake (`NIÃOS` → `NIÑOS`) si el archivo viene mal codificado.

**Validación automática al importar** (esto es lo que convierte el importador en confiable):

- Comparar el conteo de cada bloque contra su propia fila `TOTAL`, **categoría por categoría**.
- Comparar el gran total contra el encabezado del layout (`TOTAL ADULTOS / ADOLESCENTES / NIÑOS / FINAL`), emparejando por nombre de categoría, no por posición.
- Mostrar un **informe previo** antes de guardar: categorías detectadas con su total, mesas, personas por mesa, diferencias y renglones descartados con su motivo.
- Si algo no cuadra, se importa igual pero con la discrepancia señalada — nunca en silencio.

**Prueba de aceptación (layout actual):** 22 mesas con gente, **190 adultos + 0 adolescentes + 30 niños = 220**, cada mesa cuadra con su fila TOTAL, mesas 23 y 24 vacías, "REPETIDO EL NUMERO" descartado, y `JOVEN` de las mesas 21-24 reconocido como la misma categoría que `ADOLESCENTES`. *Ya verificado con el parser del prototipo; el importador debe reproducirlo exacto.*

**Detección de formato:** si los encabezados traen `id/mesa/nombre` → tabla plana (reimportación); si aparece `MESA <n>` en la rejilla → layout. XLSX y CSV entran al **mismo** normalizador; lo único que cambia es cómo se llega a la matriz de celdas (SheetJS para `.xlsx`, parser propio para `.csv`).

---

## 6. Etapas

| # | Etapa | Fase | Estimación | Resultado verificable |
| - | ----- | ---- | ---------- | --------------------- |
| 1 | Reestructurar el proyecto y el estado por `id` | 1 | 2 h | El prototipo actual corre desde `public/` con estado por `id`, sin datos embebidos |
| 2 | Importador de layout CSV + categorías dinámicas + informe | 1 | 5 h | El CSV real da 22 mesas / 190 adultos / 0 adolescentes / 30 niños / 220 y descarta la nota |
| 3 | Importador XLSX sobre el mismo normalizador | 1 | 2 h | El `.xlsx` original da idéntico resultado que el `.csv` |
| 4 | Funciones actuales sobre el nuevo estado | 1 | 3 h | Búsqueda, filtros por categoría generados del layout, filtro por mesa, comentarios y reinicio `1910` |
| 5 | Campanita de notas | 1 | 3 h | Escribir una nota levanta el globito; el panel lista nombre, mesa, texto y hora, y lleva al invitado |
| 6 | Tablero de mesas (completas, avance y porcentaje) | 1 | 3 h | Vista Mesas con `8/11 · 73%`, las completas en verde y `7 de 22 mesas completas` |
| 7 | Exportar/reimportar el CSV resultante + resumen por mesa | 1 | 3 h | Exportar, cerrar, reimportar y recuperar todo; `resumen-mesas.csv` cuadra con la pantalla |
| 8 | Empaquetado modo archivo + verificación sin red | 1 | 2 h | Un `.html` funcionando con Wi-Fi apagado |
| 9 | **Docker + servidor + tiempo real + identidad de hostess** | 2 | 8 h | **6 celulares** en `http://IP:8080` marcando a la vez y viéndose al instante; la nota de uno levanta la campanita de los otros |
| 10 | Dispositivo dedicado con IP fija + QR de acceso | 3 | 3 h | Mini PC/Raspberry que arranca solo; las hostess entran escaneando |

**Fase 1 (Etapas 1-8) es el núcleo y funciona en un dispositivo.** Con 4-6 hostess confirmadas, la **Etapa 9 es obligatoria para el evento**, no un extra: es lo que evita que seis listas independientes se contradigan. La Etapa 10 sí es opcional — mejora el arranque y la estabilidad, pero una laptop con Docker en la misma red ya sirve.

---

## 7. Detalle por etapa

### ETAPA 1 — Reestructurar y anclar el estado por `id`

Sacar el HTML del escritorio a la estructura de §3, separar `index.html` / `app.js` / `estilos.css`, y cambiar el estado de índice de arreglo a **`id` del CSV**. Hoy las marcas viven en `localStorage` con el índice del arreglo: si mañana se agrega un invitado a media lista, todas las marcas se recorren. Con `id` eso deja de pasar.

`localStorage` sube a `v2` (las marcas de prueba actuales se pierden — son de prueba). Entregable: el prototipo corriendo desde `public/`, idéntico en comportamiento.

### ETAPA 2 — Importador de layout CSV + categorías dinámicas + informe

Implementar `server/layout.js` con las reglas de §5, usable también desde el navegador (mismo archivo, sin dependencias de Node). Pantalla de importación: arrastrar archivo o elegirlo → **informe previo** (categorías detectadas con su total, mesas, personas por mesa, diferencias contra totales, renglones descartados con motivo) → confirmar → se escribe `data/invitados.csv`.

Aquí vive el catálogo de sinónimos de §2.5 y la regla de categoría desconocida. El resto del sistema **nunca** menciona "adulto" o "niño" en duro: consume la lista de categorías que este módulo devuelve.

Verificación: el CSV original reproduce 22 mesas / 190 adultos / 0 adolescentes / 30 niños / 220; `JOVEN` cae en `adolescente`; el informe muestra "REPETIDO EL NUMERO — sin conteo, descartado".

### ETAPA 3 — Importador XLSX

Agregar SheetJS **local** (`public/vendor/`, nunca CDN) para convertir la primera hoja del `.xlsx` a matriz de celdas y pasarla al mismo normalizador. Si el peso molesta (~900 KB), la alternativa es `fflate` + lectura directa del XML del XLSX (~30 KB), a costa de código propio que mantener; se decide al medir, no antes.

Verificación: `ACOMODO DE MESAS HOSTES.xlsx` y su `.csv` producen exactamente el mismo resultado.

### ETAPA 4 — Funciones actuales sobre el nuevo estado

Portar sin perder nada: búsqueda sin acentos por nombre/mesa/comentario, filtro por mesa al tocar la etiqueta, comentarios con SweetAlert, y **reinicio con contraseña `1910`** (que limpia llegadas y horas, y conserva las notas, como hoy).

El cambio de fondo está en los filtros de categoría: **se generan solos** a partir de lo que devolvió el importador, con su conteo en vivo (`Adultos 10/190`), en el orden del layout y omitiendo las vacías (§2.5). Botón `Todos` siempre presente.

Se agrega lo que el modo multi-dispositivo vuelve necesario: **hora de llegada** automática y, en modo servidor, quién marcó.

### ETAPA 5 — Campanita de notas

Implementar §2.4: campanita en el encabezado con globito de no leídas, panel ordenado por hora descendente (nombre, mesa, texto, hora y autor en modo servidor), tocar una nota lleva al invitado, y el "leído" guardado **por dispositivo** en `localStorage`.

En modo archivo se alimenta de las notas locales; en modo servidor, del evento que difunde el WebSocket (Etapa 9). La lógica del panel es la misma en ambos: solo cambia de dónde llegan las notas.

Verificación: escribir una nota levanta el globito; abrir el panel lo limpia; editar una nota vuelve a marcarla como nueva; borrarla la saca de la lista.

### ETAPA 6 — Tablero de mesas

Implementar §2.6: vista **Mesas** con una tarjeta por mesa (llegados/total, porcentaje, barra, desglose por categoría), estado Completa / En curso / Sin llegar, resumen `N de M mesas completas`, orden por número o por avance, filtro completas/pendientes, y tocar una tarjeta abre esa mesa en la lista.

En la lista de invitados, el encabezado de mesa gana porcentaje y palomita cuando está completa.

Todo se calcula al vuelo desde el estado — sin campos nuevos en el CSV de invitados, sin contadores que se puedan desincronizar.

Verificación: marcar una mesa entera y verla pasar a Completa en ambas vistas; el resumen sube de `6` a `7 de 22`; una mesa a la mitad muestra el porcentaje correcto.

### ETAPA 7 — CSV resultante y resumen por mesa

Botón **Exportar CSV** (descarga con BOM) y **Reimportar** (detecta tabla plana y restaura llegadas, horas, categorías y notas). Botón aparte para **`resumen-mesas.csv`** (§4.3). En navegadores con File System Access API, además "Guardar en el mismo archivo" — con respaldo automático a descarga donde no exista.

Verificación: exportar a media captura, cerrar el navegador, reimportar y recuperar el estado íntegro, categorías incluidas; los porcentajes del `resumen-mesas.csv` coinciden con el tablero.

### ETAPA 8 — Empaquetado modo archivo y verificación sin red

`build/empaquetar.mjs` inserta CSS, JS y librerías en un solo `dist/buscador-invitados.html`.

Verificación explícita: `grep` sin `src="http` ni `@import url(http`; abrir el archivo **con el Wi-Fi apagado** y ejercitar todo el flujo, importación de XLSX incluida.

### ETAPA 9 — Docker, servidor, tiempo real e identidad de hostess

**Servidor** (`server/index.js`), Node sin framework pesado:

| Ruta | Función |
| ---- | ------- |
| `GET /` | el front estático |
| `GET /api/estado` | lista completa + versión |
| `POST /api/llegada` | marca/desmarca `{id, llego, hostess}` |
| `POST /api/nota` | guarda `{id, texto, hostess}` y difunde el aviso a la campanita |
| `POST /api/importar` | sube layout XLSX/CSV |
| `GET /api/exportar` | descarga el CSV resultante y el resumen por mesa |
| `POST /api/reiniciar` | valida la contraseña **en el servidor**, no en el navegador |
| `WS /ws` | difunde cambios a todos los conectados |

**Identidad (§2.7):** pantalla de bienvenida que pide el nombre de la hostess una sola vez por dispositivo. Todo cambio viaja con ese nombre y se ve en la lista (`Llegó 20:14 · Ana`) y en el panel de notas.

**Sincronización:** el cliente aplica el cambio de inmediato (no espera al servidor), lo envía, y el servidor difunde a los demás. Si se cae el Wi-Fi, el cliente **encola en `localStorage`** y reenvía al reconectar, pidiendo estado completo para resincronizar. Con seis celulares en el Wi-Fi de un salón esto no es un lujo: es la diferencia entre seguir trabajando y perder registros.

**Concurrencia:** marcar a alguien ya marcado es idempotente y conserva la primera hora con su hostess. **Desmarcar** a alguien registrado por otra persona pide confirmación mostrando quién y a qué hora. Las notas se resuelven por última edición, con aviso en la campanita.

**Indicador de conexión:** un punto en el encabezado — conectado, reconectando, o trabajando local con N cambios en cola. Con seis dispositivos, una hostess desconectada sin saberlo es el peor escenario posible.

**Reinicio con `1910`:** ahora se valida en el servidor. Con seis personas dentro, un reinicio accidental borra el trabajo de todas.

**Docker:** imagen `node:20-alpine`, `docker-compose.yml` con `data/` como volumen, puerto `8080`, `restart: unless-stopped`. Acceso desde cualquier celular de la misma red en `http://<IP-del-equipo>:8080`. Seis clientes es carga despreciable: el cuello de botella será el Wi-Fi del salón, nunca el servidor.

⚠️ **El Wi-Fi de invitados de muchos salones aísla los dispositivos entre sí** (AP isolation): los celulares ven internet pero no ven a la laptop. Es la falla más probable de todo el proyecto y no se arregla desde el código. Mitigación: llevar **router propio** (o un hotspot dedicado, sin internet) solo para el sistema, y **probarlo en el salón antes del evento**, no ese día.

⚠️ **Construir la imagen sí requiere internet, una sola vez.** El día del evento no. Para llevarla a un equipo sin conexión: `docker save` → USB → `docker load`. Dejarlo probado **antes**, no en la puerta del salón.

La campanita de la Etapa 5 se conecta aquí: al guardarse una nota, el servidor la difunde y **a las demás hostess les levanta el globito** sin recargar nada.

### ETAPA 10 — Dispositivo dedicado con IP fija

Mini PC o Raspberry Pi con Docker, IP fija reservada en el router, arranque automático del contenedor y un nombre corto en la red (`http://recepcion.local:8080` vía mDNS). Entregable: una tarjeta impresa con la dirección y el QR para que cualquier hostess entre sin que nadie le explique nada.

---

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| ------ | ------- | ---------- |
| El layout del próximo evento cambia de forma o de categorías | **Alto** — el importador es el corazón | Escáner sin offsets fijos y categorías leídas del encabezado (§2.5, §5) + informe previo que exige confirmación |
| **Wi-Fi del salón aísla los dispositivos (AP isolation)** | **Alto** — tumba el modo servidor completo | Router propio o hotspot dedicado; **prueba en el salón antes del evento** (Etapa 9) |
| Wi-Fi del salón inestable | Alto | Cola local, indicador de conexión y resincronización (Etapa 9); modo archivo como respaldo |
| Se cae el servidor a media recepción | Alto | Cada uno de los 6 dispositivos conserva su copia en `localStorage`; el CSV está en disco; el modo archivo sigue funcionando y se reconcilia por CSV al final |
| El equipo que hospeda se suspende a media recepción | Medio | Desactivar suspensión, conectado a corriente; o Etapa 10 con equipo dedicado |
| La campanita se vuelve ruido y dejan de mirarla | Medio | Solo las notas la disparan, nunca las llegadas (§2.4); el "leído" es por dispositivo |
| Una hostess reinicia la lista por error | **Alto** con 6 personas dentro | `1910` validado en el servidor, confirmación explícita y respaldo del CSV antes de limpiar |
| Dos hostess marcan al mismo invitado | Bajo | Marcar es idempotente y conserva la primera hora; desmarcar lo ajeno pide confirmación con nombre y hora (§2.7) |
| Nadie sabe quién marcó qué a la hora del corte | Medio | Identidad por dispositivo; `marcado_por` y `nota_por` en el CSV |
| Construir la imagen el día del evento sin internet | Medio | Imagen construida y probada con anticipación; `docker save`/`load` para moverla |
| Nombres repetidos ("LUIS HERNANDEZ" en mesas 3 y 11, "HIJA" dos veces en la 13) | Bajo | El `id` distingue; la UI siempre muestra la mesa junto al nombre |

---

## 9. Checklist de aceptación

**Datos**
- [ ] El `.xlsx` y el `.csv` del layout dan 22 mesas, 190 adultos, 0 adolescentes, 30 niños, 220 total.
- [ ] Cada mesa cuadra con su propia fila `TOTAL`, categoría por categoría.
- [ ] `JOVEN` (mesas 21-24) y `ADOLESCENTES` (mesas 1-20) quedan en la misma categoría.
- [ ] "REPETIDO EL NUMERO" aparece en descartados con su motivo.
- [ ] Acentos y Ñ correctos (`PEQUEÑA`, `BLANCA ZUÑIGA`) al importar y al exportar a Excel.

**Categorías dinámicas**
- [ ] Los botones de filtro salen del layout, no del código.
- [ ] `ADOLESCENTES` con total 0 no pinta botón, pero sí aparece en el informe como `0/0`.
- [ ] Un layout de prueba con una categoría inventada (ej. `BEBÉS`) la da de alta sin tocar código.
- [ ] Un layout con solo dos columnas de conteo funciona igual.

**Funciones**
- [ ] Búsqueda sin acentos por nombre, mesa y nota.
- [ ] Filtros de categoría con conteo en vivo.
- [ ] Tocar `Mesa N ›` filtra la mesa completa; "Ver todas" regresa.
- [ ] Notas: crear, editar, borrar, y que se busquen.
- [ ] Campanita: se levanta con nota nueva, se limpia al abrir el panel, y la nota lleva al invitado.
- [ ] Reinicio: pide `1910`, rechaza clave incorrecta, conserva notas.

**Tablero de mesas**
- [ ] Cada mesa muestra `llegados/total` y porcentaje correctos.
- [ ] Marcar la mesa completa la pasa a Completa y sube el contador `N de 22`.
- [ ] Ordenar por avance y filtrar completas/pendientes.
- [ ] Tocar una tarjeta abre esa mesa en la lista.
- [ ] `resumen-mesas.csv` cuadra contra la pantalla.

**Offline**
- [ ] Sin `src="http` ni `@import url(http` en el entregable.
- [ ] Flujo completo con el Wi-Fi apagado en modo archivo.
- [ ] Flujo completo en modo servidor con el router **sin salida a internet**.

**Multi-hostess (prueba con 6 dispositivos, no con 2)**
- [ ] Los 6 celulares ven el mismo estado en menos de un segundo.
- [ ] Cada dispositivo se identifica una vez y su nombre aparece en `Llegó HH:MM · Nombre`.
- [ ] Dos hostess marcan al mismo invitado a la vez: no se duplica y se conserva la primera hora.
- [ ] Desmarcar a alguien registrado por otra hostess pide confirmación con nombre y hora.
- [ ] Una nota escrita en un celular levanta la campanita de los otros cinco.
- [ ] Apagar el Wi-Fi de un celular, marcar 3 invitados, reconectar y que se sincronicen; el indicador muestra la cola mientras tanto.
- [ ] Reiniciar el contenedor y que el CSV conserve todo.
- [ ] **Prueba en el salón** (o en una red igual): los 6 celulares alcanzan al servidor — descarta AP isolation.

---

## 10. Fuera de alcance (registrado, no se ejecuta)

- Acceso desde fuera de la red local (internet, dominio, nube).
- Cuentas de usuario con contraseña por persona; en Fase 2 solo hay hostess y administrador.
- Impresión de gafetes y plano visual del salón. ~~Lector de QR por invitado.~~ **Cambió (13-oct):** el lector de QR sí entra, más adelante. Lee el QR de la invitación (el mismo del PDF que se manda por WhatsApp, con `/i/{token}`). Ver D9 en `08-decisiones-pendientes.md` y la fase 5.
- Motor de base de datos. El CSV es suficiente y es lo que se pidió.
- App nativa iOS/Android: el navegador cubre el caso.

---

## 11. Decisiones

**Resueltas**

1. ~~¿Cuántas hostess a la vez?~~ → **4 a 6** (2026-08-08). Consecuencia: la Etapa 9 pasa a obligatoria, entra identidad por dispositivo (§2.7) y la validación del reinicio se mueve al servidor.
2. ~~¿Notificaciones?~~ → **campanita interna, solo para notas** (§2.4). Se descartan push, HTTPS local y certificados.
3. ~~¿Categorías?~~ → **las declara el layout** (§2.5), no el código.

**Pendientes**

4. **¿Dónde corre Docker el día del evento** — una laptop o un equipo dedicado? Define si la Etapa 10 entra. Con laptop: desactivar suspensión y dejarla conectada a corriente.
5. **¿Se puede probar la red del salón antes?** Es la prueba más importante de todas (AP isolation, §8). Si no se puede, hay que llevar router propio por default.
6. **¿Las hostess usan su propio celular o equipos del evento?** Cambia el arranque: con equipos propios conviene el QR desde la primera vuelta.
7. **¿Reparten el salón por mesas** (hostess 1 → mesas 1-6, etc.)? Si sí, el filtro "mis mesas" de §2.7 sube de opcional a necesario.
