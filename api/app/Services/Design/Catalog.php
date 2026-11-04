<?php

namespace App\Services\Design;

/**
 * Todo lo que se puede poner en invitacion.csv, en un solo lugar: secciones, campos,
 * adornos, bloques de texto, colores, fuentes y efectos. Lo usan el lector del CSV (orden
 * y alias), el builder (nombres en español → contrato en inglés) y el editor del gestor
 * (arma sus formularios con toArray()). Las claves de datos van en español porque son las
 * que la persona ve en el CSV; las del contrato (config) van en inglés.
 *
 * Agregar un tipo de sección: una entrada en SECTIONS + su componente en la web
 * (sectionRegistry) + sus defaults en el tema.
 */
final class Catalog
{
    public const VERSION = 1;

    /** Bloques de invitacion.csv que no son secciones. */
    public const RESERVED = ['evento', 'colores', 'fuentes', 'textos', 'pagina'];

    /** Nombres viejos o alternativos de secciones → nombre del formato. */
    public const ALIASES = [
        'sobre' => 'portada',
        'familia' => 'bendicion',
        'save_the_date' => 'fecha',
        'dress_code' => 'vestimenta',
        'hoteles' => 'hospedaje',
        'spotify' => 'playlist',
        'solo_adultos' => 'sin_ninos',
        'dedicatorias' => 'dedicatoria',
        'regalos' => 'mesa_regalos',
        'mesa_de_regalos' => 'mesa_regalos',
    ];

    /** Paleta: nombre en el CSV → token CSS (--color-<token>). Los demás nombres pasan tal cual. */
    public const COLORS = [
        'fondo' => ['token' => 'bg', 'label' => 'Fondo', 'help' => 'El color del papel de toda la página.'],
        'texto' => ['token' => 'text', 'label' => 'Texto', 'help' => 'Párrafos, datos y nombres.'],
        'primario' => ['token' => 'primary', 'label' => 'Principal', 'help' => 'Títulos, números grandes y detalles dorados.'],
        'primario_fuerte' => ['token' => 'primary-strong', 'label' => 'Principal oscuro', 'help' => 'Bordes y detalles que necesitan más contraste.'],
        'primario_claro' => ['token' => 'primary-soft', 'label' => 'Principal claro', 'help' => 'Rellenos suaves y brillos.'],
        'acento' => ['token' => 'accent', 'label' => 'Acento', 'help' => 'El segundo color de la invitación (el azul en NAT).'],
        'acento_suave' => ['token' => 'accent-soft', 'label' => 'Acento suave', 'help' => 'Fondos claros de tarjetas y cuadros.'],
        'acento_fuerte' => ['token' => 'accent-strong', 'label' => 'Acento fuerte', 'help' => 'Botones del panel y el QR de la tarjeta.'],
        'superficie' => ['token' => 'surface', 'label' => 'Tarjetas', 'help' => 'Fondo de tarjetas y formularios.'],
        'marco' => ['token' => 'frame', 'label' => 'Marco', 'help' => 'Marcos y fondos de color (el del Dress Code).'],
        'papel' => ['token' => 'paper', 'label' => 'Papel', 'help' => 'El de las franjas claras: con secciones difuminadas, una sección con este fondo se ve como una hoja que asoma por una rasgadura.'],
    ];

    /** Fuentes: rol en el CSV → rol CSS (--font-<rol>). */
    public const FONTS = [
        'script' => ['role' => 'script', 'label' => 'Manuscrita', 'help' => 'Títulos con trazo: "Itinerario", "Save the date".'],
        'script_mono' => ['role' => 'script-mono', 'label' => 'Manuscrita sencilla', 'help' => 'Frases y detalles.'],
        'serif' => ['role' => 'serif', 'label' => 'Texto', 'help' => 'Párrafos y datos.'],
        'caps' => ['role' => 'caps', 'label' => 'Mayúsculas', 'help' => 'Etiquetas y subtítulos espaciados.'],
        'display' => ['role' => 'display', 'label' => 'Números', 'help' => 'La fecha grande y la cuenta regresiva.'],
        'button' => ['role' => 'button', 'label' => 'Botones', 'help' => 'Los botones de la invitación.'],
        'engraved' => ['role' => 'engraved', 'label' => 'Grabado', 'help' => 'Mayúsculas finas de la imagen para WhatsApp.'],
    ];

    /** Efectos: nombre en el CSV → nombre en código. */
    public const EFFECTS = [
        'aparecer' => ['effect' => 'reveal', 'label' => 'Aparecer', 'help' => 'La sección entra suave al llegar a ella.'],
        'parallax' => ['effect' => 'parallax', 'label' => 'Profundidad', 'help' => 'La foto se mueve un poco más lento que la página.'],
        'flotar' => ['effect' => 'float', 'label' => 'Flotar', 'help' => 'Los adornos se mecen despacio.'],
        'brillo' => ['effect' => 'shine', 'label' => 'Brillo', 'help' => 'Un destello cruza los botones.'],
        'linea' => ['effect' => 'timeline-fill', 'label' => 'Línea que se llena', 'help' => 'La línea del itinerario se llena al bajar.'],
        'escribir' => ['effect' => 'typewriter', 'label' => 'Máquina de escribir', 'help' => 'El texto aparece letra por letra.'],
        'destellos' => ['effect' => 'sparkle', 'label' => 'Destellos', 'help' => 'Estrellitas doradas que titilan detrás.'],
        'cascada' => ['effect' => 'cascade', 'label' => 'Cascada', 'help' => 'Los elementos entran uno tras otro.'],
        'acercamiento' => ['effect' => 'ken-burns', 'label' => 'Acercamiento', 'help' => 'La foto se acerca muy despacio.'],
        'cambio_de_color' => ['effect' => 'color-shift', 'label' => 'Cambio de color', 'help' => 'El fondo pasa despacio por los tonos del tema.'],
        'horizonte' => ['effect' => 'skyline', 'label' => 'Horizonte de Nueva York', 'help' => 'Los edificios de Manhattan pasan despacio al pie de la sección y sus ventanas se encienden.'],
        'reflectores' => ['effect' => 'searchlights', 'label' => 'Reflectores', 'help' => 'Haces de luz que barren el cielo, como en un estreno.'],
        'luces' => ['effect' => 'city-lights', 'label' => 'Luces de ciudad', 'help' => 'Luces suaves y desenfocadas que flotan detrás.'],
        'escarcha' => ['effect' => 'glitter', 'label' => 'Escarcha', 'help' => 'Brillitos que caen despacio.'],
        'reflejo' => ['effect' => 'sheen', 'label' => 'Reflejo plateado', 'help' => 'De vez en cuando una luz cruza los títulos y los filos claros.'],
        'panoramica' => ['effect' => 'pan', 'label' => 'Panorámica', 'help' => 'La imagen de fondo se desliza despacio de lado a lado.'],
        'difuminar' => ['effect' => 'blend', 'label' => 'Difuminar (sin cortes)', 'help' => 'La sección deja de verse como tarjeta: llega a las orillas y se funde con las de arriba y abajo. Con color de fondo es una franja.'],
        'bola_disco' => ['effect' => 'disco-ball', 'label' => 'Bola disco', 'help' => 'Bolas de espejos que giran colgadas arriba, con destellos y sus reflejos de luz por toda la sección.'],
        'iconos' => ['effect' => 'city-icons', 'label' => 'Íconos de la ciudad', 'help' => 'La Estatua, un taxi, el Empire State, un pretzel… dibujados a los costados, que se mecen despacio.'],
        'taxi' => ['effect' => 'taxi', 'label' => 'Taxis', 'help' => 'Taxis que cruzan la sección por el pie, uno hacia cada lado.'],
        'franja_ciudad' => ['effect' => 'icon-strip', 'label' => 'Franja de la ciudad', 'help' => 'Una hilera de dibujos de Nueva York a lo largo de la orilla de arriba.'],
        'aparecer_zoom' => ['effect' => 'reveal-zoom', 'label' => 'Aparecer con acercamiento', 'help' => 'La sección entra creciendo desde un poco más chica.'],
        'aparecer_deslizar' => ['effect' => 'reveal-slide', 'label' => 'Aparecer deslizando', 'help' => 'La sección entra desde un costado (alterna izquierda y derecha).'],
        'aparecer_giro' => ['effect' => 'reveal-tilt', 'label' => 'Aparecer con giro', 'help' => 'La sección entra levantándose, como una tarjeta que se abre.'],
        'velo' => ['effect' => 'veil', 'label' => 'Velo', 'help' => 'Un tul marfil que ondea despacio sobre la sección.'],
        'luces_disco' => ['effect' => 'disco-lights', 'label' => 'Reflejos de bola disco', 'help' => 'Puntos de luz que recorren la sección, como los reflejos de una bola disco.'],
        'encaje_giratorio' => ['effect' => 'lace-spin', 'label' => 'Encaje que gira', 'help' => 'Carpetas de encaje que giran muy despacio en las esquinas, detrás del contenido.'],
        'encaje_ondulante' => ['effect' => 'lace-wave', 'label' => 'Encaje ondulante', 'help' => 'Las orillas de encaje de arriba y abajo se mecen como una tela con brisa.'],
        'encaje_dibujado' => ['effect' => 'lace-draw', 'label' => 'Encaje que se dibuja', 'help' => 'Al llegar a la sección, una flor de encaje se dibuja trazo a trazo en dos esquinas.'],
        'foco' => ['effect' => 'spotlight', 'label' => 'Foco de escenario', 'help' => 'Al llegar a la sección se enciende un haz de luz sobre el centro y los bordes se oscurecen, como cuando alguien canta.'],
        'foco_viaja' => ['effect' => 'spotlight-travel', 'label' => 'Foco que recorre', 'help' => 'El haz de luz de escenario se enciende y recorre la sección de lado a lado.'],
        'perlas_destello' => ['effect' => 'pearl-glint', 'label' => 'Perlas con destello', 'help' => 'Un collar de perlas al borde de arriba; un destello lo recorre perla por perla.'],
        'satin_brillo' => ['effect' => 'satin-sweep', 'label' => 'Brillo de satén', 'help' => 'Un barrido de brillo, como luz sobre satén, cruza el fondo de vez en cuando.'],
        'cortinaje_mece' => ['effect' => 'drape-sway', 'label' => 'Cortinaje que se mece', 'help' => 'Guirnaldas de gasa con perlas cuelgan arriba y se balancean con suavidad.'],
        'perlas_cuelgan' => ['effect' => 'pearl-strands', 'label' => 'Hilos de perlas', 'help' => 'Hilos de perlas caen desde arriba al entrar a la sección y se balancean.'],
        'petalos' => ['effect' => 'petals', 'label' => 'Pétalos que caen', 'help' => 'Pétalos blancos que caen muy despacio, meciéndose y girando.'],
        'polvo_luz' => ['effect' => 'light-dust', 'label' => 'Polvo de luz', 'help' => 'Motas de luz pequeñas que suben lentamente y se encienden y apagan.'],
        'tul_respira' => ['effect' => 'tulle-breathe', 'label' => 'Tul que respira', 'help' => 'Velos de tul en las orillas que ondean como cortinas con brisa.'],
        'bordado_aparece' => ['effect' => 'stitch-in', 'label' => 'Título bordado', 'help' => 'El título aparece de a poco y debajo se cose una línea de puntadas.'],
        'tinta' => ['effect' => 'ink', 'label' => 'Título en tinta', 'help' => 'Al llegar a la sección, el título aparece como tinta que se asienta en el papel (de transparente a firme, con un desplazamiento mínimo).'],
        'luz_rasante' => ['effect' => 'raking-light', 'label' => 'Luz rasante', 'help' => 'De vez en cuando una luz cálida y baja cruza la sección despacio y hace notar el relieve del papel.'],
        'papel_entra' => ['effect' => 'paper-in', 'label' => 'Papel que entra', 'help' => 'La tarjeta entra como si la sacaran de un sobre: sube y se endereza.'],
        'respira' => ['effect' => 'breathe', 'label' => 'Respirar', 'help' => 'El panel crece y se encoge apenas, como si respirara.'],
        'dibujo_vivo' => ['effect' => 'living-drawing', 'label' => 'Dibujo vivo', 'help' => 'Los dibujos de línea de la ubicación (iglesia y hacienda) se dibujan trazo a trazo al llegar y cobran vida: campanas que se mecen, árboles con brisa, aves y ventanas que se encienden.'],
        'maquina_escribir' => ['effect' => 'typewriter-title', 'label' => 'Título a máquina de escribir', 'help' => 'Al llegar a la sección, el título (y los nombres de la portada) se escriben letra por letra con un cursor de tinta. El texto completo siempre está ahí para los lectores de pantalla.'],
        'tinta_seca' => ['effect' => 'ink-dry', 'label' => 'Tinta que se seca', 'help' => 'Las letras del título aparecen húmedas, en el color de acento, y se asientan en la tinta de la página de izquierda a derecha.'],
        'caligrafia' => ['effect' => 'calligraphy', 'label' => 'Caligrafía que se traza', 'help' => 'El título (o el "&" de los nombres) se va descubriendo de izquierda a derecha, como si una pluma lo escribiera.'],
        'sello_estampado' => ['effect' => 'stamp', 'label' => 'Letras estampadas', 'help' => 'Las letras del título caen una tras otra y se asientan como un sello que se estampa en el papel.'],
        'pan_de_oro' => ['effect' => 'gold-leaf', 'label' => 'Brillo de pan de oro', 'help' => 'De vez en cuando un brillo dorado recorre el título, el monograma y los lacres de la sección.'],
        'letterpress' => ['effect' => 'letterpress', 'label' => 'Prensa (letterpress)', 'help' => 'El título se imprime al llegar: baja apenas, como presionado contra el papel, y queda en bajorrelieve.'],
    ];

    /** Otros nombres de efectos que ya aceptaba el Excel. */
    public const EFFECT_ALIASES = [
        'cambio_color' => 'cambio_de_color',
        'colores' => 'cambio_de_color',
        'ciudad' => 'horizonte',
        'brillitos' => 'escarcha',
        'paneo' => 'panoramica',
        'integrar' => 'difuminar',
        'sin_cortes' => 'difuminar',
        'disco' => 'bola_disco',
        'reflejos_disco' => 'luces_disco',
        'polvo' => 'polvo_luz',
        'luciernagas' => 'polvo_luz',
        'bordado' => 'bordado_aparece',
        'foco_escenario' => 'foco',
        'saten' => 'satin_brillo',
        'luz' => 'luz_rasante',
    ];

    /** Palabras que apagan los efectos que el tema trae por defecto. */
    public const NO_EFFECTS = ['ninguno', 'none'];

    /** Bloques de texto que comparten todas las secciones (y el bloque global "textos"). */
    public const TEXTS = [
        'titulo' => ['block' => 'title', 'label' => 'Título'],
        'subtitulo' => ['block' => 'subtitle', 'label' => 'Subtítulo'],
        'texto' => ['block' => 'text', 'label' => 'Texto'],
        'boton' => ['block' => 'button', 'label' => 'Botón'],
    ];

    /** Lo que se puede cambiar de cada bloque de texto: <bloque>_fuente, _color, _tamano. */
    public const TEXT_PROPS = [
        'fuente' => ['prop' => 'font', 'label' => 'Letra'],
        'color' => ['prop' => 'color', 'label' => 'Color'],
        'tamano' => ['prop' => 'size', 'label' => 'Tamaño'],
    ];

    /** El tamaño de un texto va de 50 % a 250 % del que pone el tema. */
    public const TEXT_SIZE_MIN = 50;

    public const TEXT_SIZE_MAX = 250;

    /** Adornos del tema que se pueden cambiar o quitar (imagen_<adorno>): nombre en el CSV → ranura. */
    public const SLOTS = [
        'sobre' => ['slot' => 'envelope', 'label' => 'Sobre'],
        'tarjeta' => ['slot' => 'card', 'label' => 'Tarjeta'],
        'flores' => ['slot' => 'flowers', 'label' => 'Flores'],
        'corona' => ['slot' => 'crown', 'label' => 'Corona'],
        'mariposas' => ['slot' => 'butterflies', 'label' => 'Mariposas'],
        'mariposa' => ['slot' => 'butterfly', 'label' => 'Mariposa'],
        'lacre' => ['slot' => 'seal', 'label' => 'Sello de lacre'],
        'arco' => ['slot' => 'arch', 'label' => 'Arco'],
        'hojas' => ['slot' => 'leaves', 'label' => 'Hojas'],
        'divisor' => ['slot' => 'divider', 'label' => 'Divisor'],
        'lamina' => ['slot' => 'sheet', 'label' => 'Lámina de papel'],
        'lazo' => ['slot' => 'bow', 'label' => 'Moño'],
        'destellos' => ['slot' => 'glitter', 'label' => 'Brillo'],
        'marco' => ['slot' => 'frame', 'label' => 'Marco'],
        'estrellas' => ['slot' => 'stars', 'label' => 'Estrellas'],
        'mujer' => ['slot' => 'woman', 'label' => 'Figura de mujer'],
        'hombre' => ['slot' => 'man', 'label' => 'Figura de hombre'],
        'estatua' => ['slot' => 'statue', 'label' => 'Estatua'],
        'puente' => ['slot' => 'bridge', 'label' => 'Puente'],
        'puerta' => ['slot' => 'door', 'label' => 'Puerta del elevador'],
        'paisaje' => ['slot' => 'landscape', 'label' => 'Paisaje del telón'],
        'cortinaje' => ['slot' => 'valance', 'label' => 'Cortinaje (guirnalda de gasa)'],
        'telon' => ['slot' => 'curtain', 'label' => 'Tela del telón'],
        'pliegues' => ['slot' => 'folds', 'label' => 'Pliegues de la cortina'],
        'tela' => ['slot' => 'cloth', 'label' => 'Tela arrugada al pie'],
        'alcatraz' => ['slot' => 'lily', 'label' => 'Alcatraz'],
        'encaje' => ['slot' => 'lace', 'label' => 'Carpeta de encaje'],
        'hacienda' => ['slot' => 'estate', 'label' => 'Dibujo de la hacienda'],
        'papel' => ['slot' => 'paper', 'label' => 'Papel del sobre central'],
        'iglesia' => ['slot' => 'church', 'label' => 'Dibujo de la iglesia'],
        'forro' => ['slot' => 'lining', 'label' => 'Damasco del forro del sobre'],
    ];

    /** División entre secciones (la orilla de las franjas): nombre en el CSV → código. */
    public const EDGES = [
        'degradado' => ['value' => 'fade', 'label' => 'Degradado suave'],
        'hoja' => ['value' => 'torn', 'label' => 'Hoja rasgada'],
        'ciudad' => ['value' => 'city', 'label' => 'La ciudad (edificios)'],
        'ola' => ['value' => 'wave', 'label' => 'Ola'],
        'feston' => ['value' => 'scallop', 'label' => 'Festón (medias lunas)'],
        'recta' => ['value' => 'straight', 'label' => 'Recta'],
        'encaje' => ['value' => 'lace', 'label' => 'Encaje'],
    ];

    /** Estilos de botón de toda la invitación. */
    public const BUTTONS = [
        'degradado' => ['value' => 'gradient', 'label' => 'Degradado metálico'],
        'solido' => ['value' => 'solid', 'label' => 'Sólido'],
        'contorno' => ['value' => 'outline', 'label' => 'Contorno'],
        'deco' => ['value' => 'deco', 'label' => 'Art déco (doble filo)'],
        'boleto' => ['value' => 'ticket', 'label' => 'Boleto (con muescas)'],
        'neon' => ['value' => 'neon', 'label' => 'Neón'],
        'texto' => ['value' => 'link', 'label' => 'Texto subrayado'],
        'liston' => ['value' => 'ribbon', 'label' => 'Listón de satén'],
        'fino' => ['value' => 'fine', 'label' => 'Contorno fino (papelería)'],
    ];

    /** Esquinas de los paneles. */
    public const CORNERS = [
        'deco' => ['value' => 'deco', 'label' => 'Escalonadas art déco'],
        'encaje' => ['value' => 'lace', 'label' => 'Encaje'],
        'ninguna' => ['value' => 'none', 'label' => 'Sin adorno'],
    ];

    /** Textura de tela del fondo de los paneles. */
    public const TEXTURES = [
        'terciopelo' => ['value' => 'velvet', 'label' => 'Terciopelo'],
        'satin' => ['value' => 'satin', 'label' => 'Satén'],
        'gasa' => ['value' => 'gauze', 'label' => 'Gasa'],
        'lino' => ['value' => 'linen', 'label' => 'Lino'],
        'papel' => ['value' => 'paper', 'label' => 'Papel'],
        'piedra' => ['value' => 'stone', 'label' => 'Piedra (beige con manchas suaves)'],
        'algodon' => ['value' => 'cotton', 'label' => 'Algodón (papel marfil con fibra)'],
        'ninguna' => ['value' => 'none', 'label' => 'Sin textura'],
    ];

    /** Silueta de las tarjetas: esquinas cóncavas recortadas, como papelería fina. */
    public const SILHOUETTES = [
        'muesca' => ['value' => 'notch', 'label' => 'Con muescas (esquinas recortadas)'],
        'ninguna' => ['value' => 'none', 'label' => 'Recta'],
    ];

    /** Filete fino por dentro de la silueta. */
    public const FILLETS = [
        'borgona' => ['value' => 'burgundy', 'label' => 'Borgoña'],
        'oro' => ['value' => 'gold', 'label' => 'Oro'],
        'ninguno' => ['value' => 'none', 'label' => 'Sin filete'],
    ];

    /** Valor de imagen_<adorno> que quita ese adorno. */
    public const NO_IMAGE = 'ninguna';

    /** Campos que puede tener cualquier sección, en el orden en que se escriben. */
    private const COMMON = [
        ['key' => 'visible', 'label' => 'Visible', 'input' => 'toggle'],
        ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'max_length' => 120],
        ['key' => 'subtitulo', 'label' => 'Subtítulo', 'input' => 'text', 'max_length' => 160],
        ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'max_length' => 1200],
        ['key' => 'boton', 'label' => 'Texto del botón', 'input' => 'text', 'max_length' => 60],
        ['key' => 'variante', 'label' => 'Variante', 'input' => 'select'],
        ['key' => 'fondo', 'label' => 'Imagen de fondo', 'input' => 'image'],
        ['key' => 'fondo_ajuste', 'label' => 'Cómo va la imagen', 'input' => 'select', 'options' => [
            ['value' => 'cubrir', 'label' => 'Cubrir la sección'],
            ['value' => 'mosaico', 'label' => 'Mosaico (para texturas)'],
        ]],
        ['key' => 'color_fondo', 'label' => 'Color de fondo', 'input' => 'color'],
        ['key' => 'overlay', 'label' => 'Oscurecer la imagen', 'input' => 'range', 'min' => 0, 'max' => 1, 'step' => 0.05],
        ['key' => 'fijo', 'label' => 'Fondo quieto al bajar', 'input' => 'toggle'],
        ['key' => 'efectos', 'label' => 'Animaciones', 'input' => 'chips'],
        ['key' => 'orilla', 'label' => 'División con las vecinas', 'input' => 'select', 'help' => 'La forma de sus orillas cuando es franja (secciones difuminadas, con color de fondo).', 'options' => [
            ['value' => 'degradado', 'label' => 'Degradado suave'],
            ['value' => 'hoja', 'label' => 'Hoja rasgada'],
            ['value' => 'ciudad', 'label' => 'La ciudad (edificios)'],
            ['value' => 'ola', 'label' => 'Ola'],
            ['value' => 'feston', 'label' => 'Festón (medias lunas)'],
            ['value' => 'recta', 'label' => 'Recta'],
            ['value' => 'encaje', 'label' => 'Encaje'],
        ]],
        ['key' => 'silueta', 'label' => 'Silueta de la tarjeta', 'input' => 'select', 'help' => 'Vacío: la de toda la invitación.', 'options' => [
            ['value' => 'muesca', 'label' => 'Con muescas (esquinas recortadas)'],
            ['value' => 'ninguna', 'label' => 'Recta'],
        ]],
        ['key' => 'filete', 'label' => 'Filete interior', 'input' => 'select', 'help' => 'Vacío: el de toda la invitación.', 'options' => [
            ['value' => 'borgona', 'label' => 'Borgoña'],
            ['value' => 'oro', 'label' => 'Oro'],
            ['value' => 'ninguno', 'label' => 'Sin filete'],
        ]],
        ['key' => 'escritorio', 'label' => 'En computadora', 'input' => 'select', 'options' => [
            ['value' => 'completo', 'label' => 'Toda la fila'],
            ['value' => 'mitad', 'label' => 'Media fila (junto a otra)'],
        ]],
    ];

    /** Bloque "evento": datos generales, agrupados como los muestra el editor. */
    private const EVENT_GROUPS = [
        ['label' => 'Evento', 'fields' => [
            ['key' => 'tipo', 'label' => 'Tipo de evento', 'input' => 'select', 'options' => [
                ['value' => 'xv', 'label' => 'XV años'],
                ['value' => 'boda', 'label' => 'Boda'],
                ['value' => 'graduacion', 'label' => 'Graduación'],
                ['value' => 'bautizo', 'label' => 'Bautizo'],
                ['value' => 'cumple', 'label' => 'Cumpleaños'],
                ['value' => 'otro', 'label' => 'Otro'],
            ]],
            ['key' => 'tema', 'label' => 'Diseño base', 'input' => 'theme', 'required' => true],
            ['key' => 'festejada', 'label' => 'Nombre completo', 'input' => 'text', 'max_length' => 120],
            ['key' => 'festejada_corto', 'label' => 'Nombre corto (el del sobre)', 'input' => 'text', 'max_length' => 40],
            ['key' => 'monograma', 'label' => 'Monograma (iniciales)', 'input' => 'text', 'placeholder' => 'I M', 'help' => 'Las iniciales del sello y del monograma (de una a tres letras). Vacío: salen del nombre corto ("Isabella & Mateo" → I M).', 'max_length' => 8],
            ['key' => 'pareja', 'label' => 'Nombre de la pareja', 'input' => 'text', 'max_length' => 120],
            ['key' => 'subtitulo', 'label' => 'Frase de la portada', 'input' => 'text', 'placeholder' => 'mis xv años', 'max_length' => 80],
            ['key' => 'titulo', 'label' => 'Título (pestaña del navegador)', 'input' => 'text', 'max_length' => 120],
            ['key' => 'inicia', 'label' => 'Fecha y hora', 'input' => 'datetime', 'required' => true],
            ['key' => 'zona_horaria', 'label' => 'Zona horaria', 'input' => 'timezone', 'placeholder' => 'America/Mexico_City'],
        ]],
        ['label' => 'Salón', 'fields' => [
            ['key' => 'salon', 'label' => 'Nombre del salón', 'input' => 'text', 'max_length' => 120],
            ['key' => 'salon_nombre_visible', 'label' => 'Nombre como se ve en la invitación', 'input' => 'text', 'max_length' => 120],
            ['key' => 'salon_ciudad', 'label' => 'Ciudad', 'input' => 'text', 'placeholder' => 'Pachuca, Hidalgo', 'help' => 'También sirve para el clima.', 'max_length' => 120],
            ['key' => 'salon_direccion', 'label' => 'Dirección', 'input' => 'text', 'max_length' => 200],
            ['key' => 'salon_maps', 'label' => 'Enlace de Google Maps', 'input' => 'url'],
            ['key' => 'salon_foto', 'label' => 'Foto del salón', 'input' => 'image'],
            ['key' => 'clima_coordenadas', 'label' => 'Coordenadas (opcional)', 'input' => 'text', 'placeholder' => '20.1170, -98.7333', 'help' => 'Solo si el clima de la ciudad no es exacto.'],
        ]],
        ['label' => 'Confirmaciones', 'fields' => [
            ['key' => 'rsvp_modo', 'label' => 'Cómo confirman', 'input' => 'select', 'options' => [
                ['value' => 'token', 'label' => 'Con su enlace personal (lo normal)'],
                ['value' => 'whatsapp', 'label' => 'Por WhatsApp'],
                ['value' => 'open', 'label' => 'Formulario abierto'],
                ['value' => 'off', 'label' => 'Sin confirmación'],
            ]],
            ['key' => 'rsvp_limite', 'label' => 'Fecha límite', 'input' => 'date'],
            ['key' => 'rsvp_whatsapp', 'label' => 'WhatsApp para confirmar', 'input' => 'phone', 'placeholder' => '5217711234567'],
            ['key' => 'rsvp_pedir_cancion', 'label' => 'Pedir canción', 'input' => 'toggle', 'hidden' => true],
            ['key' => 'rsvp_pedir_mensaje', 'label' => 'Pedir mensaje', 'input' => 'toggle', 'hidden' => true],
        ]],
        ['label' => 'Música', 'fields' => [
            ['key' => 'musica_fuente', 'label' => 'De dónde sale la música', 'input' => 'select', 'options' => [
                ['value' => 'archivo', 'label' => 'Una canción (MP3)'],
                ['value' => 'spotify', 'label' => 'Una playlist de Spotify'],
            ]],
            ['key' => 'musica_audio', 'label' => 'Canción (MP3)', 'input' => 'audio', 'help' => 'Ideal de 3 MB o menos.'],
            ['key' => 'musica_inicio', 'label' => 'Segundo en que empieza la canción', 'input' => 'audio_start', 'min' => 0, 'max' => 36000, 'step' => 1, 'help' => 'Segundo en que empieza la canción (por ejemplo 45 para saltarse la intro). Solo con un MP3.'],
            ['key' => 'spotify', 'label' => 'Enlace de Spotify', 'input' => 'url', 'help' => 'En Spotify: Compartir → Copiar enlace.'],
        ]],
        ['label' => 'Compartir', 'fields' => [
            ['key' => 'mensaje_whatsapp', 'label' => 'Mensaje de WhatsApp', 'input' => 'textarea', 'help' => 'Usa {familia}, {, familia}, {pases} y {enlace}.', 'max_length' => 600],
            ['key' => 'titulo_panel', 'label' => 'Título del panel del cliente', 'input' => 'text', 'max_length' => 80],
            ['key' => 'tarjeta_fondo', 'label' => 'Fondo de la tarjeta para WhatsApp', 'input' => 'image'],
            ['key' => 'tarjeta_frase', 'label' => 'Frase de la tarjeta', 'input' => 'text', 'max_length' => 80],
            ['key' => 'tarjeta_texto', 'label' => 'Segunda frase de la tarjeta', 'input' => 'text', 'max_length' => 80],
        ]],
    ];

    /** Bloque "pagina". */
    private const PAGE = [
        ['key' => 'fondo', 'label' => 'Papel de la página', 'input' => 'image'],
        ['key' => 'decoracion', 'label' => 'Adornos que flotan y vuelan', 'input' => 'toggle'],
        ['key' => 'difuminar', 'label' => 'Secciones difuminadas (sin cortes)', 'input' => 'toggle', 'help' => 'Ninguna sección se ve como tarjeta: todas se funden entre sí. Las que tienen color de fondo son franjas.'],
        ['key' => 'orilla', 'label' => 'División entre secciones', 'input' => 'select', 'help' => 'La orilla de las franjas (con secciones difuminadas). Cada sección puede cambiar la suya.', 'options' => [
            ['value' => 'degradado', 'label' => 'Degradado suave'],
            ['value' => 'hoja', 'label' => 'Hoja rasgada'],
            ['value' => 'ciudad', 'label' => 'La ciudad (edificios)'],
            ['value' => 'ola', 'label' => 'Ola'],
            ['value' => 'feston', 'label' => 'Festón (medias lunas)'],
            ['value' => 'recta', 'label' => 'Recta'],
            ['value' => 'encaje', 'label' => 'Encaje'],
        ]],
        ['key' => 'botones', 'label' => 'Estilo de los botones', 'input' => 'select', 'options' => [
            ['value' => 'degradado', 'label' => 'Degradado metálico'],
            ['value' => 'solido', 'label' => 'Sólido'],
            ['value' => 'contorno', 'label' => 'Contorno'],
            ['value' => 'deco', 'label' => 'Art déco (doble filo)'],
            ['value' => 'boleto', 'label' => 'Boleto (con muescas)'],
            ['value' => 'neon', 'label' => 'Neón'],
            ['value' => 'texto', 'label' => 'Texto subrayado'],
            ['value' => 'liston', 'label' => 'Listón de satén'],
        ]],
        ['key' => 'confeti', 'label' => 'Confeti que cae', 'input' => 'select', 'help' => 'Pedacitos de papel metálico con los colores de la paleta.', 'options' => [
            ['value' => 'SI', 'label' => 'Sí'],
            ['value' => 'NO', 'label' => 'No'],
        ]],
        ['key' => 'metalico', 'label' => 'Títulos con brillo de metal', 'input' => 'select', 'options' => [
            ['value' => 'SI', 'label' => 'Sí'],
            ['value' => 'NO', 'label' => 'No'],
        ]],
        ['key' => 'esquinas', 'label' => 'Esquinas de los paneles', 'input' => 'select', 'options' => [
            ['value' => 'deco', 'label' => 'Escalonadas art déco'],
            ['value' => 'encaje', 'label' => 'Encaje'],
            ['value' => 'ninguna', 'label' => 'Sin adorno'],
        ]],
        ['key' => 'textura', 'label' => 'Textura de tela de los paneles', 'input' => 'select', 'help' => 'El fondo de cada panel con trama de tela: brillo en las crestas y sombra en los valles.', 'options' => [
            ['value' => 'terciopelo', 'label' => 'Terciopelo'],
            ['value' => 'satin', 'label' => 'Satén'],
            ['value' => 'gasa', 'label' => 'Gasa'],
            ['value' => 'lino', 'label' => 'Lino'],
            ['value' => 'papel', 'label' => 'Papel'],
            ['value' => 'piedra', 'label' => 'Piedra (beige con manchas suaves)'],
            ['value' => 'algodon', 'label' => 'Algodón (papel marfil con fibra)'],
            ['value' => 'ninguna', 'label' => 'Sin textura'],
        ]],
        ['key' => 'silueta', 'label' => 'Silueta de las tarjetas', 'input' => 'select', 'help' => 'Con muescas: las esquinas de cada tarjeta se recortan en cóncavo, como una tarjeta de papelería fina.', 'options' => [
            ['value' => 'muesca', 'label' => 'Con muescas (esquinas recortadas)'],
            ['value' => 'ninguna', 'label' => 'Recta'],
        ]],
        ['key' => 'filete', 'label' => 'Filete interior de la tarjeta', 'input' => 'select', 'help' => 'Una línea fina por dentro que sigue la silueta.', 'options' => [
            ['value' => 'borgona', 'label' => 'Borgoña'],
            ['value' => 'oro', 'label' => 'Oro'],
            ['value' => 'ninguno', 'label' => 'Sin filete'],
        ]],
        ['key' => 'relieve', 'label' => 'Títulos en relieve (letterpress)', 'input' => 'select', 'help' => 'Los títulos se ven impresos en el papel: una luz y una sombra finas, sin movimiento.', 'options' => [
            ['value' => 'SI', 'label' => 'Sí'],
            ['value' => 'NO', 'label' => 'No'],
        ]],
    ];

    /**
     * Cada tipo de sección. `fields`: campos de contenido que usa (además de los comunes de
     * diseño). `list`: su lista (lugares, hoteles…). `linked`: claves de "evento" que el
     * editor muestra dentro de la sección. `slots`: adornos del tema. `texts`: bloques de
     * texto (comunes y propios), en el orden en que aparecen.
     */
    private const SECTIONS = [
        'portada' => [
            'type' => 'hero-envelope', 'label' => 'Portada', 'icon' => 'envelope',
            'description' => 'El sobre que se abre con el nombre y el salón.',
            'fields' => [
                ['key' => 'boton', 'label' => 'Texto para abrir', 'input' => 'text', 'placeholder' => 'Toca para abrir', 'max_length' => 60],
                ['key' => 'imagen', 'label' => 'Foto de la portada', 'input' => 'image', 'help' => 'La usa "Estatua de la Libertad" detrás del nombre.'],
                ['key' => 'variante', 'label' => 'Cómo abre', 'input' => 'select', 'options' => [
                    ['value' => 'sobre', 'label' => 'Sobre'],
                    ['value' => 'elevador', 'label' => 'Elevador art déco'],
                    ['value' => 'estatua', 'label' => 'Estatua de la Libertad'],
                    ['value' => 'telon', 'label' => 'Telón de terciopelo'],
                    ['value' => 'encaje', 'label' => 'Sobre de encaje'],
                    ['value' => 'sobre-central', 'label' => 'Sobre que abre desde el centro hacia arriba'],
                    ['value' => 'sobre-lacre', 'label' => 'Sobre con lacre y tarjeta de papelería'],
                ]],
            ],
            'linked' => ['festejada_corto', 'festejada', 'subtitulo'],
            'slots' => ['sobre', 'tarjeta', 'flores', 'corona', 'mariposas', 'lacre', 'puerta', 'estatua', 'paisaje', 'cortinaje', 'telon', 'pliegues', 'tela', 'alcatraz', 'papel', 'forro'],
            'texts' => ['subtitulo' => 'Frase (mis xv años)', 'nombre' => ['block' => 'name', 'label' => 'Nombre grande'], 'lugar' => ['block' => 'place', 'label' => 'Salón y ciudad'], 'para' => ['block' => 'to', 'label' => 'Nombre en el sobre'], 'boton' => 'Texto para abrir', 'titulo' => 'Encabezado de la tarjeta («Con todo el corazón»)', 'texto' => 'Frase antes de la fecha', 'fecha' => ['block' => 'date', 'label' => 'Fecha'], 'rol' => ['block' => 'role', 'label' => 'Quiénes son (papás)'], 'nombres' => ['block' => 'names', 'label' => 'Nombres de los papás']],
        ],
        'musica' => [
            'type' => 'music-player', 'label' => 'Música', 'icon' => 'music',
            'description' => 'El reproductor con la canción que suena al abrir el sobre.',
            'fields' => [['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Dale play', 'max_length' => 60], ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'controles-oro', 'label' => 'Controles dorados'], ['value' => 'vinilo', 'label' => 'Tocadiscos'], ['value' => 'lacre', 'label' => 'Lacre como botón de play']]]],
            'linked' => ['musica_fuente', 'musica_audio', 'musica_inicio', 'spotify'],
            'texts' => ['titulo' => 'Título'],
        ],
        'bendicion' => [
            'type' => 'blessing', 'label' => 'Bendición y familia', 'icon' => 'dove',
            'description' => 'Un mensaje y los nombres de papás y padrinos.',
            'fields' => [
                ['key' => 'texto', 'label' => 'Mensaje', 'input' => 'textarea', 'placeholder' => 'Con la bendición de Dios…', 'max_length' => 600],
                ['key' => 'subtitulo', 'label' => 'Subtítulo', 'input' => 'text', 'help' => 'Vacío: la frase de la portada.', 'max_length' => 80],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'programa', 'label' => 'Programa de teatro'], ['value' => 'editorial', 'label' => 'Editorial (padrinos en columnas)']]],
            ],
            'list' => ['key' => 'familia', 'label' => 'Familia', 'item_label' => 'Grupo', 'max' => 12, 'fields' => [
                ['key' => 'rol', 'label' => 'Quiénes son', 'input' => 'text', 'placeholder' => 'Mis papás', 'required' => true, 'max_length' => 60],
                ['key' => 'nombres', 'label' => 'Nombres (uno por línea)', 'input' => 'lines', 'required' => true, 'max_length' => 400],
            ]],
            'slots' => ['arco', 'hojas', 'divisor', 'lazo'],
            'texts' => ['texto' => 'Mensaje', 'subtitulo' => 'Subtítulo', 'rol' => ['block' => 'role', 'label' => 'Quiénes son'], 'nombres' => ['block' => 'names', 'label' => 'Nombres']],
        ],
        'fecha' => [
            'type' => 'save-the-date', 'label' => 'Fecha', 'icon' => 'calendar-days',
            'description' => 'La fecha grande, el calendario del mes y "Agregar a mi calendario".',
            'fields' => [['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Save the date', 'max_length' => 60], ['key' => 'texto', 'label' => 'Texto del talón (diseño Boleto)', 'input' => 'text', 'max_length' => 60], ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'boleto', 'label' => 'Boleto de Broadway'], ['value' => 'calendario', 'label' => 'Calendario en un sobre'], ['value' => 'editorial', 'label' => 'Tarjeta editorial (número grande y filetes)']]]],
            'linked' => ['inicia', 'zona_horaria'],
            'slots' => ['destellos'],
            'texts' => ['titulo' => 'Título', 'texto' => 'Talón del boleto', 'fecha' => ['block' => 'date', 'label' => 'Fecha grande'], 'calendario' => ['block' => 'calendar', 'label' => 'Calendario']],
        ],
        'foto' => [
            'type' => 'photo-arch', 'label' => 'Foto', 'icon' => 'camera', 'repeatable' => true,
            'description' => 'Una foto recortada dentro del marco en arco.',
            'fields' => [
                ['key' => 'imagen', 'label' => 'Foto (de preferencia sin fondo)', 'input' => 'image'],
                ['key' => 'titulo', 'label' => 'Iniciales o apodo', 'input' => 'text', 'help' => 'Va en la esquina de la foto.', 'max_length' => 20],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'ventana', 'label' => 'Ventana de rascacielos'], ['value' => 'camafeo', 'label' => 'Camafeo de encaje']]],
            ],
            'slots' => ['marco', 'estrellas', 'mariposas', 'encaje'],
            'texts' => ['titulo' => 'Iniciales'],
        ],
        'galeria' => [
            'type' => 'gallery', 'label' => 'Galería', 'icon' => 'images', 'repeatable' => true,
            'description' => 'Fotos que se abren a pantalla completa; puede haber varias galerías repartidas por la invitación, cada una con su presentación.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Galería', 'max_length' => 60],
                ['key' => 'subtitulo', 'label' => 'Subtítulo', 'input' => 'text', 'max_length' => 120],
                ['key' => 'variante', 'label' => 'Presentación', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Cuadrícula'], ['value' => 'marcos', 'label' => 'Marcos de plata'], ['value' => 'carrusel', 'label' => 'Carrusel (se desliza de lado)'], ['value' => 'diapositivas', 'label' => 'Se cambian solas (como un gif)'], ['value' => 'bastidor', 'label' => 'Bastidores de bordado'], ['value' => 'editorial', 'label' => 'Editorial (marcos finos y pies de foto)']]],
            ],
            'list' => ['key' => 'fotos', 'label' => 'Fotos', 'item_label' => 'Foto', 'max' => 24, 'fields' => [
                ['key' => 'foto', 'label' => 'Foto', 'input' => 'image', 'required' => true],
                ['key' => 'pie', 'label' => 'Pie de foto', 'input' => 'text', 'max_length' => 120],
            ]],
            'slots' => ['marco', 'divisor'],
            'texts' => ['titulo' => 'Título', 'subtitulo' => 'Subtítulo', 'pie' => ['block' => 'caption', 'label' => 'Pie de foto']],
            'hidden_without' => 'Agrega al menos una foto.',
        ],
        'video' => [
            'type' => 'video', 'label' => 'Video', 'icon' => 'play', 'repeatable' => true,
            'description' => 'Un video de YouTube, Instagram o Facebook, o un MP4 propio (hasta 40 MB). No se carga nada de la red hasta que el invitado toca play.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Video', 'max_length' => 60],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'max_length' => 400],
                ['key' => 'fuente', 'label' => 'De dónde sale', 'input' => 'select', 'options' => [['value' => 'youtube', 'label' => 'YouTube'], ['value' => 'archivo', 'label' => 'Archivo propio (MP4)'], ['value' => 'instagram', 'label' => 'Instagram'], ['value' => 'facebook', 'label' => 'Facebook']]],
                ['key' => 'enlace', 'label' => 'Enlace del video', 'input' => 'url', 'placeholder' => 'https://youtu.be/…', 'help' => 'Para YouTube (también Shorts), Instagram (reel o video) y Facebook (video). Solo https.'],
                ['key' => 'archivo', 'label' => 'Archivo MP4 (H.264, máx. 40 MB)', 'input' => 'video', 'help' => 'Solo con "Archivo propio". Se sube tal cual, sin comprimir.'],
                ['key' => 'poster', 'label' => 'Portada (opcional)', 'input' => 'image', 'help' => 'Se ve antes del play. Sin portada, un fondo con el ícono de la red.'],
                ['key' => 'formato', 'label' => 'Formato', 'input' => 'select', 'options' => [['value' => 'horizontal', 'label' => 'Horizontal (16:9)'], ['value' => 'vertical', 'label' => 'Vertical (9:16)']]],
                ['key' => 'variante', 'label' => 'Marco', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásico'], ['value' => 'encaje', 'label' => 'Óvalo de encaje y perlas']]],
            ],
            'slots' => ['divisor'],
            'texts' => ['titulo' => 'Título', 'texto' => 'Texto', 'boton' => 'Botón'],
            'hidden_without' => 'Pega el enlace del video o elige un MP4 (el enlace debe ser de YouTube, Instagram o Facebook).',
        ],
        'publicacion' => [
            'type' => 'social-post', 'label' => 'Publicación de redes', 'icon' => 'share-nodes', 'repeatable' => true,
            'description' => 'Una publicación de Instagram, Facebook o YouTube ("Síguenos en…"). Se carga la publicación solo al tocarla.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Síguenos', 'max_length' => 60],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'placeholder' => 'Síguenos en…', 'max_length' => 400],
                ['key' => 'red', 'label' => 'Red', 'input' => 'select', 'options' => [['value' => 'instagram', 'label' => 'Instagram'], ['value' => 'facebook', 'label' => 'Facebook'], ['value' => 'youtube', 'label' => 'YouTube']]],
                ['key' => 'enlace', 'label' => 'Enlace de la publicación', 'input' => 'url', 'placeholder' => 'https://www.instagram.com/reel/…', 'help' => 'Solo https y de la red elegida.'],
                ['key' => 'poster', 'label' => 'Portada (opcional)', 'input' => 'image', 'help' => 'Se ve antes de tocar. Sin portada, un fondo con el ícono de la red.'],
                ['key' => 'variante', 'label' => 'Marco', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásico'], ['value' => 'encaje', 'label' => 'Óvalo de encaje y perlas']]],
            ],
            'slots' => ['divisor'],
            'texts' => ['titulo' => 'Título', 'texto' => 'Texto', 'boton' => 'Botón'],
            'hidden_without' => 'Pega el enlace de la publicación (debe ser de la red elegida).',
        ],
        'ubicacion' => [
            'type' => 'location', 'label' => 'Ubicación', 'icon' => 'location-dot', 'repeatable' => true,
            'description' => 'El salón (o varios lugares) con su botón a Maps. Puede haber una por lugar.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Ubicación', 'max_length' => 60],
                ['key' => 'boton', 'label' => 'Texto del botón', 'input' => 'text', 'placeholder' => 'Ver en Maps', 'max_length' => 40],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'metro', 'label' => 'Letrero del metro'], ['value' => 'grabado', 'label' => 'Hacienda en grabado'], ['value' => 'papeleria', 'label' => 'Tarjetitas de papel con dibujo de línea']]],
                ['key' => 'acomodo', 'label' => 'Acomodo de los lugares', 'input' => 'select', 'help' => 'Lado a lado (en el celular se apilan) o uno debajo del otro.', 'options' => [['value' => 'lado a lado', 'label' => 'Lado a lado'], ['value' => 'uno debajo del otro', 'label' => 'Uno debajo del otro']]],
                ['key' => 'calendario', 'label' => 'Botón "Agregar al calendario"', 'input' => 'select', 'options' => [['value' => 'SI', 'label' => 'Sí'], ['value' => 'NO', 'label' => 'No']]],
            ],
            'linked' => ['salon', 'salon_nombre_visible', 'salon_ciudad', 'salon_direccion', 'salon_maps', 'salon_foto'],
            'list' => ['key' => 'lugares', 'label' => 'Más lugares (opcional)', 'item_label' => 'Lugar', 'max' => 6, 'help' => 'Para misa y recepción por separado. Sin lugares, se muestra el salón.', 'fields' => [
                ['key' => 'tipo', 'label' => 'Tipo de lugar', 'input' => 'select', 'help' => 'Pone la etiqueta y el ícono por defecto.', 'options' => [['value' => 'ceremonia religiosa', 'label' => 'Ceremonia religiosa'], ['value' => 'ceremonia civil', 'label' => 'Ceremonia civil'], ['value' => 'recepcion', 'label' => 'Recepción'], ['value' => 'ceremonia y recepcion', 'label' => 'Ceremonia y recepción'], ['value' => 'otro', 'label' => 'Otro']]],
                ['key' => 'etiqueta', 'label' => 'Qué es', 'input' => 'text', 'placeholder' => 'Ceremonia', 'max_length' => 40, 'help' => 'Si lo escribes, gana sobre el tipo.'],
                ['key' => 'lugar', 'label' => 'Nombre del lugar', 'input' => 'text', 'required' => true, 'max_length' => 120],
                ['key' => 'hora', 'label' => 'Hora', 'input' => 'time'],
                ['key' => 'direccion', 'label' => 'Dirección', 'input' => 'text', 'max_length' => 200],
                ['key' => 'maps', 'label' => 'Enlace de Google Maps', 'input' => 'url'],
                ['key' => 'foto', 'label' => 'Foto', 'input' => 'image'],
            ]],
            'slots' => ['hacienda', 'iglesia'],
            'texts' => ['titulo' => 'Título', 'etiqueta' => ['block' => 'label', 'label' => 'Qué es (Ceremonia)'], 'lugar' => ['block' => 'place', 'label' => 'Nombre del lugar'], 'detalle' => ['block' => 'detail', 'label' => 'Hora y dirección'], 'boton' => 'Botón'],
        ],
        'frase' => [
            'type' => 'quote', 'label' => 'Frase', 'icon' => 'quote-left', 'repeatable' => true,
            'description' => 'Una frase corta con el divisor del tema.',
            'fields' => [
                ['key' => 'texto', 'label' => 'Frase', 'input' => 'textarea', 'placeholder' => 'Hoy comienza el capítulo más bonito de mi historia', 'max_length' => 400], ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'neon', 'label' => 'Letrero de neón'], ['value' => 'lamina', 'label' => 'Lámina de papel']]],
                ['key' => 'zona_arriba', 'label' => 'Zona segura: arriba (%)', 'input' => 'number', 'min' => 0, 'max' => 45, 'step' => 1, 'help' => 'Con la lámina: cuánto de la imagen se deja libre arriba.'],
                ['key' => 'zona_derecha', 'label' => 'Zona segura: derecha (%)', 'input' => 'number', 'min' => 0, 'max' => 45, 'step' => 1],
                ['key' => 'zona_abajo', 'label' => 'Zona segura: abajo (%)', 'input' => 'number', 'min' => 0, 'max' => 45, 'step' => 1],
                ['key' => 'zona_izquierda', 'label' => 'Zona segura: izquierda (%)', 'input' => 'number', 'min' => 0, 'max' => 45, 'step' => 1],
                ['key' => 'proporcion', 'label' => 'Proporción de la lámina (ancho / alto)', 'input' => 'number', 'min' => 0.1, 'max' => 10, 'step' => 0.01, 'help' => 'Por ejemplo 0.72. Vacío: se mide de la imagen.'], ],
            'slots' => ['divisor', 'lamina'],
            'texts' => ['texto' => 'Frase'],
        ],
        'capa' => [
            'type' => 'layer', 'label' => 'Capa de imagen', 'icon' => 'images', 'repeatable' => true,
            'description' => 'Fotos que se quedan quietas mientras la página pasa por encima, como si siempre hubieran estado debajo; cada foto es otra capa.',
            'fields' => [
                ['key' => 'imagen', 'label' => 'Primera foto', 'input' => 'image', 'help' => 'Se ve completa al llegar a ella y las demás secciones pasan por encima.'],
                ['key' => 'titulo', 'label' => 'Título (opcional)', 'input' => 'text', 'max_length' => 60],
                ['key' => 'texto', 'label' => 'Texto (opcional)', 'input' => 'textarea', 'max_length' => 300],
                ['key' => 'variante', 'label' => 'Alto de cada capa', 'input' => 'select', 'options' => [['value' => 'media', 'label' => 'Media pantalla'], ['value' => 'alta', 'label' => 'Casi toda la pantalla'], ['value' => 'pantalla', 'label' => 'Pantalla completa']]],
                ['key' => 'sin_oscurecer', 'label' => 'Quitar el oscurecido de las fotos', 'input' => 'toggle', 'help' => 'Apagado, la foto lleva una sombra arriba y abajo.'],
            ],
            'list' => ['key' => 'fotos', 'label' => 'Más capas', 'item_label' => 'Foto', 'max' => 8, 'help' => 'Cada foto es otra capa: al bajar, la siguiente pasa por encima de la anterior.', 'fields' => [
                ['key' => 'foto', 'label' => 'Foto', 'input' => 'image', 'required' => true],
            ]],
            'slots' => [],
            'texts' => ['titulo' => 'Título', 'texto' => 'Texto'],
        ],
        'itinerario' => [
            'type' => 'itinerary', 'label' => 'Itinerario', 'icon' => 'clock',
            'description' => 'Los momentos de la fiesta con su hora.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Itinerario', 'max_length' => 60],
                ['key' => 'en_vivo', 'label' => 'Resaltar el momento actual', 'input' => 'select', 'help' => 'El día del evento marca "Ahora" y "Sigue" según la hora.', 'options' => [['value' => 'SI', 'label' => 'Sí'], ['value' => 'NO', 'label' => 'No']]],
                ['key' => 'variante', 'label' => 'Acomodo', 'input' => 'select', 'options' => [
                    ['value' => 'zigzag', 'label' => 'Zigzag'],
                    ['value' => 'lista', 'label' => 'Lista'],
                    ['value' => 'avenida', 'label' => 'Letreros de calle'],
                    ['value' => 'grabado', 'label' => 'Grabado con íconos de línea'],
                    ['value' => 'minuto', 'label' => 'Minuta editorial (hora en versalitas)'],
                    ['value' => 'sello', 'label' => 'Hilo con un lacre que baja y dibujos de línea'],
                ]],
            ],
            'list' => ['key' => 'momentos', 'label' => 'Momentos', 'item_label' => 'Momento', 'max' => 12, 'fields' => [
                ['key' => 'hora', 'label' => 'Hora', 'input' => 'time', 'required' => true],
                ['key' => 'actividad', 'label' => 'Qué pasa', 'input' => 'text', 'placeholder' => 'Recepción', 'required' => true, 'max_length' => 60],
                ['key' => 'icono', 'label' => 'Ícono', 'input' => 'icon'],
            ]],
            'slots' => ['marco', 'estatua', 'puente', 'divisor'],
            'texts' => ['titulo' => 'Título', 'hora' => ['block' => 'time', 'label' => 'Horas'], 'actividad' => ['block' => 'activity', 'label' => 'Actividades']],
        ],
        'vestimenta' => [
            'type' => 'dress-code', 'label' => 'Código de vestimenta', 'icon' => 'shirt',
            'description' => 'Qué ponerse, con las figuras y los colores sugeridos.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Dress Code', 'max_length' => 60],
                ['key' => 'subtitulo', 'label' => 'Tipo de vestimenta', 'input' => 'text', 'placeholder' => 'Formal', 'max_length' => 80],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'max_length' => 600],
                ['key' => 'restricciones', 'label' => 'Qué evitar (uno por línea, hasta 6)', 'input' => 'lines', 'placeholder' => "Blanco o marfil\nTacones de aguja en el jardín", 'max_length' => 400],
                ['key' => 'colores', 'label' => 'Colores sugeridos', 'input' => 'colors', 'help' => 'De 1 a 4.'],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'vitrinas', 'label' => 'Escaparates de la Quinta Avenida'], ['value' => 'muestrario', 'label' => 'Muestrario de telas'], ['value' => 'editorial', 'label' => 'Página de revista']]],
                ['key' => 'enlace', 'label' => 'Enlace de ejemplos', 'input' => 'url', 'placeholder' => 'https://…', 'help' => 'Un tablero o una galería con ideas de vestimenta. Solo https. Sin enlace, el botón no aparece.'],
                ['key' => 'boton', 'label' => 'Texto del botón', 'input' => 'text', 'placeholder' => 'Ver ejemplos', 'max_length' => 40],
            ],
            'list' => ['key' => 'referencias', 'label' => 'Fotos de referencia (opcional)', 'item_label' => 'Foto', 'max' => 4, 'fields' => [
                ['key' => 'foto', 'label' => 'Foto', 'input' => 'image', 'required' => true],
                ['key' => 'pie', 'label' => 'Pie de foto', 'input' => 'text', 'max_length' => 120],
            ]],
            'slots' => ['lacre', 'tarjeta', 'mujer', 'hombre', 'encaje'],
            'texts' => ['titulo' => 'Título', 'subtitulo' => 'Tipo de vestimenta', 'texto' => 'Texto', 'boton' => 'Botón'],
        ],
        'sin_ninos' => [
            'type' => 'no-kids', 'label' => 'Solo adultos', 'icon' => 'user-group',
            'description' => 'Aviso amable de que la celebración es sin niños.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Sin niños', 'max_length' => 60],
                ['key' => 'subtitulo', 'label' => 'Etiqueta', 'input' => 'text', 'placeholder' => 'Solo adultos', 'max_length' => 40],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'max_length' => 600],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'cordon', 'label' => 'Cordón de terciopelo']]],
            ],
            'slots' => ['lazo'],
            'texts' => ['titulo' => 'Título', 'subtitulo' => 'Etiqueta', 'texto' => 'Texto'],
        ],
        'clima' => [
            'type' => 'weather', 'label' => 'Clima', 'icon' => 'cloud-sun',
            'description' => 'El clima del día en la ciudad del salón.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'El clima', 'max_length' => 60],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'max_length' => 300],
            ],
            'linked' => ['salon_ciudad', 'clima_coordenadas'],
            'texts' => ['titulo' => 'Título', 'lugar' => ['block' => 'place', 'label' => 'Ciudad'], 'datos' => ['block' => 'data', 'label' => 'Temperaturas'], 'texto' => 'Texto'],
            'hidden_without' => 'Necesita la fecha del evento y la ciudad del salón; se quita sola un día después del evento.',
        ],
        'hospedaje' => [
            'type' => 'hotels', 'label' => 'Hospedaje', 'icon' => 'bed',
            'description' => 'Hoteles recomendados con su botón a Maps y para llamar.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Hospedaje', 'max_length' => 60],
                ['key' => 'subtitulo', 'label' => 'Subtítulo', 'input' => 'text', 'max_length' => 120],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'max_length' => 600],
                ['key' => 'boton', 'label' => 'Texto del botón', 'input' => 'text', 'placeholder' => 'Ver en Maps', 'max_length' => 40],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'colgantes', 'label' => 'Colgantes de hotel'], ['value' => 'papeleria', 'label' => 'Fichas de hotel de papelería']]],
            ],
            'list' => ['key' => 'hoteles', 'label' => 'Hoteles', 'item_label' => 'Hotel', 'max' => 8, 'fields' => [
                ['key' => 'nombre', 'label' => 'Nombre', 'input' => 'text', 'required' => true, 'max_length' => 120],
                ['key' => 'nota', 'label' => 'Nota corta', 'input' => 'text', 'placeholder' => 'A unos pasos del salón', 'max_length' => 120],
                ['key' => 'direccion', 'label' => 'Dirección', 'input' => 'text', 'max_length' => 200],
                ['key' => 'maps', 'label' => 'Enlace de Google Maps', 'input' => 'url'],
                ['key' => 'telefono', 'label' => 'Teléfono', 'input' => 'phone'],
                ['key' => 'foto', 'label' => 'Foto', 'input' => 'image'],
                ['key' => 'distancia', 'label' => 'Distancia al salón (opcional)', 'input' => 'text', 'placeholder' => 'A 10 min del salón', 'max_length' => 80],
                ['key' => 'precio', 'label' => 'Precio (opcional)', 'input' => 'text', 'placeholder' => 'Desde $1,800 por noche', 'max_length' => 80],
                ['key' => 'reserva', 'label' => 'Enlace para reservar (opcional)', 'input' => 'url', 'placeholder' => 'https://…', 'help' => 'Solo https.'],
            ]],
            'slots' => ['tarjeta', 'divisor'],
            'texts' => ['titulo' => 'Título', 'subtitulo' => 'Subtítulo', 'texto' => 'Texto', 'nombre' => ['block' => 'name', 'label' => 'Nombre del hotel'], 'nota' => ['block' => 'note', 'label' => 'Nota'], 'direccion' => ['block' => 'address', 'label' => 'Dirección'], 'boton' => 'Botón'],
            'hidden_without' => 'Agrega al menos un hotel.',
        ],
        'lluvia_sobres' => [
            'type' => 'envelope-rain', 'label' => 'Lluvia de sobres', 'icon' => 'envelope',
            'description' => 'Los datos para regalar en un sobre o por transferencia, con botón para copiar la cuenta.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Lluvia de sobres', 'max_length' => 60],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'max_length' => 400],
                ['key' => 'banco', 'label' => 'Banco', 'input' => 'text', 'placeholder' => 'BBVA', 'max_length' => 60],
                ['key' => 'cuenta', 'label' => 'CLABE o tarjeta', 'input' => 'text', 'max_length' => 30, 'help' => 'Se ve de 4 en 4 dígitos, con botón para copiar.'],
                ['key' => 'titular', 'label' => 'A nombre de', 'input' => 'text', 'max_length' => 120],
                ['key' => 'sobre_fisico', 'label' => 'También habrá caja para sobres en el salón', 'input' => 'toggle'],
                ['key' => 'solo_con_enlace', 'label' => 'Datos bancarios solo en las invitaciones personales', 'input' => 'toggle', 'help' => 'Así nadie los ve con el enlace general. Viene encendido.'],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'sobre', 'label' => 'Sobre art déco'], ['value' => 'lamina', 'label' => 'Lámina de papel']]],
                ['key' => 'zona_arriba', 'label' => 'Zona segura: arriba (%)', 'input' => 'number', 'min' => 0, 'max' => 45, 'step' => 1, 'help' => 'Con la lámina: cuánto de la imagen se deja libre arriba.'],
                ['key' => 'zona_derecha', 'label' => 'Zona segura: derecha (%)', 'input' => 'number', 'min' => 0, 'max' => 45, 'step' => 1],
                ['key' => 'zona_abajo', 'label' => 'Zona segura: abajo (%)', 'input' => 'number', 'min' => 0, 'max' => 45, 'step' => 1],
                ['key' => 'zona_izquierda', 'label' => 'Zona segura: izquierda (%)', 'input' => 'number', 'min' => 0, 'max' => 45, 'step' => 1],
                ['key' => 'proporcion', 'label' => 'Proporción de la lámina (ancho / alto)', 'input' => 'number', 'min' => 0.1, 'max' => 10, 'step' => 0.01, 'help' => 'Por ejemplo 0.72. Vacío: se mide de la imagen.'],
            ],
            'slots' => ['divisor', 'lamina'],
            'texts' => ['titulo' => 'Título', 'texto' => 'Texto', 'cuenta' => ['block' => 'account', 'label' => 'Datos bancarios']],
            'hidden_without' => 'Escribe un texto o los datos de la cuenta.',
        ],
        'mesa_regalos' => [
            'type' => 'gifts', 'label' => 'Mesa de regalos', 'icon' => 'gift',
            'description' => 'Las tiendas con su mesa de regalos (la lluvia de sobres ahora es una sección aparte).',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Mesa de regalos', 'max_length' => 60],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'placeholder' => 'Tu presencia es mi mejor regalo; si quieres consentirme, aquí van algunas ideas.', 'max_length' => 600],
                ['key' => 'boton', 'label' => 'Texto del botón', 'input' => 'text', 'placeholder' => 'Ver mesa', 'max_length' => 40],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [
                    ['value' => 'tarjetas', 'label' => 'Tarjetas'],
                    ['value' => 'bolsas', 'label' => 'Bolsas de la Quinta Avenida'],
                    ['value' => 'etiqueta', 'label' => 'Etiquetas de papel rasgado'],
                    ['value' => 'sobre', 'label' => 'Sobre entreabierto'],
                    ['value' => 'volteo', 'label' => 'Tarjetas que se voltean para ver los datos'],
                ]],
                ['key' => 'sobres_titulo', 'label' => '(Antiguo) Título de la lluvia de sobres', 'input' => 'text', 'placeholder' => 'Lluvia de sobres', 'max_length' => 60],
                ['key' => 'sobres_texto', 'label' => '(Antiguo) Texto de la lluvia de sobres', 'input' => 'textarea', 'max_length' => 400],
                ['key' => 'banco', 'label' => '(Antiguo) Banco', 'input' => 'text', 'placeholder' => 'BBVA', 'max_length' => 60],
                ['key' => 'cuenta', 'label' => '(Antiguo) CLABE o tarjeta', 'input' => 'text', 'max_length' => 30, 'help' => 'Se ve de 4 en 4 dígitos, con botón para copiar.'],
                ['key' => 'titular', 'label' => '(Antiguo) A nombre de', 'input' => 'text', 'max_length' => 120],
                ['key' => 'sobre_fisico', 'label' => '(Antiguo) También habrá caja para sobres en el salón', 'input' => 'toggle'],
                ['key' => 'solo_con_enlace', 'label' => '(Antiguo) Datos bancarios solo en las invitaciones personales', 'input' => 'toggle', 'help' => 'Así nadie los ve con el enlace general. Viene encendido.'],
            ],
            'list' => ['key' => 'tiendas', 'label' => 'Tiendas', 'item_label' => 'Tienda', 'max' => 8, 'fields' => [
                ['key' => 'tienda', 'label' => 'Tienda', 'input' => 'select', 'options' => [
                    ['value' => 'liverpool', 'label' => 'Liverpool'],
                    ['value' => 'amazon', 'label' => 'Amazon'],
                    ['value' => 'palacio', 'label' => 'El Palacio de Hierro'],
                    ['value' => 'sears', 'label' => 'Sears'],
                    ['value' => 'costco', 'label' => 'Costco'],
                    ['value' => 'otra', 'label' => 'Otra'],
                ]],
                ['key' => 'nombre', 'label' => 'Nombre (si es otra)', 'input' => 'text', 'max_length' => 80],
                ['key' => 'nota', 'label' => 'Nota', 'input' => 'text', 'placeholder' => 'Ver lista de deseos', 'max_length' => 120],
                ['key' => 'enlace', 'label' => 'Enlace de la mesa', 'input' => 'url'],
                ['key' => 'numero_evento', 'label' => 'Número de evento', 'input' => 'text', 'max_length' => 30, 'help' => 'El de Liverpool, con botón para copiar.'],
            ]],
            'slots' => ['lazo', 'divisor'],
            'texts' => ['titulo' => 'Título', 'texto' => 'Texto', 'tienda' => ['block' => 'store', 'label' => 'Tiendas'], 'sobres' => ['block' => 'envelope', 'label' => 'Lluvia de sobres'], 'cuenta' => ['block' => 'account', 'label' => 'Datos bancarios'], 'boton' => 'Botón'],
            'hidden_without' => 'Agrega una tienda o los datos de la lluvia de sobres.',
        ],
        'playlist' => [
            'type' => 'spotify', 'label' => 'Playlist', 'icon' => 'headphones',
            'description' => 'La playlist de Spotify con su lista de canciones.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Mi playlist', 'max_length' => 60],
                ['key' => 'subtitulo', 'label' => 'Subtítulo', 'input' => 'text', 'max_length' => 120],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'max_length' => 400],
                ['key' => 'boton', 'label' => 'Texto del botón', 'input' => 'text', 'placeholder' => 'Abrir en Spotify', 'max_length' => 40],
                ['key' => 'variante', 'label' => 'Tamaño', 'input' => 'select', 'options' => [
                    ['value' => 'completa', 'label' => 'Completa (unas 7 canciones)'],
                    ['value' => 'lista', 'label' => 'Lista (3 canciones)'],
                    ['value' => 'compacta', 'label' => 'Compacta (solo portada)'],
                ]],
            ],
            'linked' => ['spotify'],
            'texts' => ['titulo' => 'Título', 'subtitulo' => 'Subtítulo', 'texto' => 'Texto', 'boton' => 'Botón'],
            'hidden_without' => 'Falta el enlace de Spotify (en Música).',
        ],
        'cuenta_regresiva' => [
            'type' => 'countdown', 'label' => 'Cuenta regresiva', 'icon' => 'hourglass-half',
            'description' => 'Días, horas, minutos y segundos para el evento.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Inicia la cuenta regresiva', 'max_length' => 60],
                ['key' => 'texto', 'label' => 'Frase', 'input' => 'textarea', 'max_length' => 400],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'tablero', 'label' => 'Tablero de Grand Central'], ['value' => 'corazon', 'label' => 'Corazón de encaje'], ['value' => 'banda', 'label' => 'Banda con números en serif']]],
            ],
            'linked' => ['inicia'],
            'slots' => ['corona', 'mariposa', 'encaje'],
            'texts' => ['titulo' => 'Título', 'numeros' => ['block' => 'digits', 'label' => 'Números'], 'unidades' => ['block' => 'units', 'label' => 'Días, horas…'], 'texto' => 'Frase'],
        ],
        'confirmacion' => [
            'type' => 'rsvp', 'label' => 'Confirmación', 'icon' => 'circle-check',
            'description' => 'El formulario para confirmar asistencia, con la fecha límite.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Confirmación', 'max_length' => 60],
                ['key' => 'subtitulo', 'label' => 'Subtítulo', 'input' => 'text', 'max_length' => 160],
                ['key' => 'boton', 'label' => 'Texto del botón', 'input' => 'text', 'placeholder' => '¡Confirma aquí!', 'max_length' => 40],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'pase', 'label' => 'Pase VIP'], ['value' => 'tarjeta-rsvp', 'label' => 'Tarjeta de respuesta con lacre']]],
            ],
            'linked' => ['rsvp_modo', 'rsvp_limite', 'rsvp_whatsapp'],
            'slots' => ['tarjeta', 'flores'],
            'texts' => ['titulo' => 'Título', 'subtitulo' => 'Subtítulo', 'fecha_limite' => ['block' => 'deadline', 'label' => 'Fecha límite'], 'boton' => 'Botón'],
        ],
        'dedicatoria' => [
            'type' => 'dedications', 'label' => 'Dedicatoria', 'icon' => 'pen-nib',
            'description' => 'Cada invitado deja un mensaje (uno por enlace).',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Dedicatoria', 'max_length' => 60],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'placeholder' => 'Escribe unos buenos deseos…', 'max_length' => 400],
                ['key' => 'boton', 'label' => 'Texto del botón', 'input' => 'text', 'placeholder' => 'Enviar', 'max_length' => 40],
                ['key' => 'muro', 'label' => 'Mostrar las dedicatorias recibidas', 'input' => 'select', 'help' => 'Con "Sí", la invitación muestra el nombre y el mensaje de cada dedicatoria (las más recientes primero). Quien administra puede quitar una eliminando su invitación. Sin elegir: no.', 'options' => [['value' => 'SI', 'label' => 'Sí'], ['value' => 'NO', 'label' => 'No']]],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'postal', 'label' => 'Postal de correo aéreo'], ['value' => 'muro', 'label' => 'Notas de papel en dos columnas']]],
            ],
            'slots' => ['divisor'],
            'texts' => ['titulo' => 'Título', 'texto' => 'Texto', 'mensaje' => ['block' => 'message', 'label' => 'Mensaje enviado y del muro'], 'autor' => ['block' => 'author', 'label' => 'Quién lo envía'], 'boton' => 'Botón'],
        ],
        'trivia' => [
            'type' => 'trivia', 'label' => 'Trivia', 'icon' => 'circle-question',
            'description' => 'Preguntas sobre la festejada: cada invitación responde una vez y el panel muestra el ranking. La respuesta correcta nunca sale en la invitación.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Trivia', 'max_length' => 60],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'placeholder' => '¿Qué tanto conoces a la festejada?', 'max_length' => 400],
                ['key' => 'boton', 'label' => 'Texto del botón', 'input' => 'text', 'placeholder' => 'Empezar', 'max_length' => 40],
                ['key' => 'cierra', 'label' => 'Cierra el', 'input' => 'datetime', 'help' => 'Después de esa fecha ya no se puede responder. Sin fecha, cierra cuando empieza el evento.'],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'tarjetas', 'label' => 'Tarjetas de papel con encaje'], ['value' => 'papeleria', 'label' => 'Cartas de papel con filete']]],
            ],
            'list' => ['key' => 'preguntas', 'label' => 'Preguntas', 'item_label' => 'Pregunta', 'max' => 10, 'fields' => [
                ['key' => 'pregunta', 'label' => 'Pregunta', 'input' => 'text', 'required' => true, 'max_length' => 200],
                ['key' => 'opcion_1', 'label' => 'Opción 1', 'input' => 'text', 'required' => true, 'max_length' => 100],
                ['key' => 'opcion_2', 'label' => 'Opción 2', 'input' => 'text', 'required' => true, 'max_length' => 100],
                ['key' => 'opcion_3', 'label' => 'Opción 3 (opcional)', 'input' => 'text', 'max_length' => 100],
                ['key' => 'opcion_4', 'label' => 'Opción 4 (opcional)', 'input' => 'text', 'max_length' => 100],
                ['key' => 'correcta', 'label' => 'Respuesta correcta', 'input' => 'select', 'required' => true, 'options' => [
                    ['value' => '1', 'label' => 'Opción 1'], ['value' => '2', 'label' => 'Opción 2'],
                    ['value' => '3', 'label' => 'Opción 3'], ['value' => '4', 'label' => 'Opción 4'],
                ]],
            ]],
            'slots' => ['divisor'],
            'texts' => ['titulo' => 'Título', 'texto' => 'Texto', 'pregunta' => ['block' => 'question', 'label' => 'Preguntas'], 'opcion' => ['block' => 'option', 'label' => 'Opciones'], 'resultado' => ['block' => 'result', 'label' => 'Resultado'], 'boton' => 'Botón'],
            'hidden_without' => 'Agrega al menos una pregunta con sus opciones y la respuesta correcta.',
        ],
        'album' => [
            'type' => 'guest-album', 'label' => 'Álbum de los invitados', 'icon' => 'camera',
            'description' => 'Desde el día del evento cada invitación sube hasta 2 fotos; el dueño elige cuáles se muestran en el panel. A los 5–20 días del evento el álbum se borra y la invitación se cierra. En una muestra se ve un álbum de ejemplo (fotos de la lista) y la subida se simula sin guardar nada.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Álbum', 'max_length' => 60],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'placeholder' => 'Comparte tus mejores fotos de la fiesta.', 'max_length' => 400],
                ['key' => 'boton', 'label' => 'Texto del botón', 'input' => 'text', 'placeholder' => 'Elegir fotos', 'max_length' => 40],
                ['key' => 'album_dias', 'label' => 'Días que sigue abierto después del evento', 'input' => 'range', 'min' => 5, 'max' => 20, 'step' => 1, 'help' => 'Se cuentan desde el día siguiente al evento (5 por defecto, de 5 a 20). Al terminar el último día se borra el álbum completo y la invitación ya no abre.'],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'papeleria', 'label' => 'Papelería (fotos como tarjetas)']]],
                ['key' => 'album_max_mb', 'label' => 'Espacio máximo del álbum (MB)', 'input' => 'text', 'placeholder' => '300', 'max_length' => 5, 'help' => 'Al llegar al tope ya no se aceptan más fotos (300 MB por defecto, unas 1,000 fotos).'],
            ],
            'list' => ['key' => 'fotos', 'label' => 'Fotos de ejemplo (solo para muestras)', 'item_label' => 'Foto', 'max' => 8, 'fields' => [
                ['key' => 'foto', 'label' => 'Foto', 'input' => 'image', 'required' => true],
            ]],
            'slots' => ['marco', 'divisor'],
            'texts' => ['titulo' => 'Título', 'texto' => 'Texto', 'boton' => 'Botón'],
        ],
        'historia' => [
            'type' => 'story', 'label' => 'Historia', 'icon' => 'book-open', 'repeatable' => true,
            'description' => 'Un mensaje de bienvenida y, si quieres, los momentos de su historia (año, título, texto y foto).',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Nuestra historia', 'max_length' => 80],
                ['key' => 'subtitulo', 'label' => 'Subtítulo', 'input' => 'text', 'max_length' => 120],
                ['key' => 'texto', 'label' => 'Mensaje de bienvenida', 'input' => 'textarea', 'max_length' => 1200],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'editorial', 'label' => 'Editorial (capitular y foto con marco)'], ['value' => 'cronologia', 'label' => 'Línea de tiempo con los años como pestañas']]],
            ],
            'list' => ['key' => 'momentos', 'label' => 'Momentos', 'item_label' => 'Momento', 'max' => 8, 'fields' => [
                ['key' => 'anio', 'label' => 'Año o fecha', 'input' => 'text', 'placeholder' => '2019', 'max_length' => 20],
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'required' => true, 'max_length' => 80],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'max_length' => 500],
                ['key' => 'foto', 'label' => 'Foto (opcional)', 'input' => 'image'],
            ]],
            'slots' => ['divisor'],
            'texts' => ['titulo' => 'Título', 'subtitulo' => 'Subtítulo', 'texto' => 'Mensaje de bienvenida', 'anio' => ['block' => 'year', 'label' => 'Años'], 'momento' => ['block' => 'moment', 'label' => 'Título de cada momento'], 'detalle' => ['block' => 'detail', 'label' => 'Texto de cada momento']],
        ],
        'informacion' => [
            'type' => 'faq', 'label' => 'Información adicional', 'icon' => 'circle-info',
            'description' => 'Preguntas y respuestas (transporte, estacionamiento, niños…) en un acordeón.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Información adicional', 'max_length' => 80],
                ['key' => 'subtitulo', 'label' => 'Subtítulo', 'input' => 'text', 'max_length' => 120],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'max_length' => 600],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'editorial', 'label' => 'Editorial (filetes finos)']]],
            ],
            'list' => ['key' => 'preguntas', 'label' => 'Preguntas', 'item_label' => 'Pregunta', 'max' => 12, 'fields' => [
                ['key' => 'pregunta', 'label' => 'Pregunta', 'input' => 'text', 'required' => true, 'max_length' => 160],
                ['key' => 'respuesta', 'label' => 'Respuesta', 'input' => 'textarea', 'required' => true, 'max_length' => 600],
            ]],
            'slots' => ['divisor'],
            'texts' => ['titulo' => 'Título', 'subtitulo' => 'Subtítulo', 'texto' => 'Texto', 'pregunta' => ['block' => 'question', 'label' => 'Preguntas'], 'respuesta' => ['block' => 'answer', 'label' => 'Respuestas']],
            'hidden_without' => 'Agrega al menos una pregunta con su respuesta.',
        ],
        'cierre' => [
            'type' => 'closing', 'label' => 'Cierre', 'icon' => 'heart', 'repeatable' => true,
            'description' => 'La despedida: "¡Te esperamos!".',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => '¡Te esperamos!', 'max_length' => 80],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'max_length' => 400],
                ['key' => 'variante', 'label' => 'Diseño', 'input' => 'select', 'options' => [['value' => 'clasica', 'label' => 'Clásica'], ['value' => 'marquesina', 'label' => 'Marquesina de Broadway'], ['value' => 'bordado', 'label' => 'Tela bordada con alcatraces'], ['value' => 'lacre', 'label' => 'Lacre grande con el monograma']]],
            ],
            'slots' => ['flores', 'corona', 'tela', 'alcatraz'],
            'texts' => ['titulo' => 'Título', 'texto' => 'Texto', 'firma' => ['block' => 'signature', 'label' => 'Firma']],
        ],
    ];

    /** Límites de un diseño (contra archivos gigantes o pegados por error). */
    public const LIMITS = ['sections' => 60, 'fields' => 120, 'items' => 100, 'value' => 4000, 'canvas' => 60];

    /**
     * Campos de un elemento del lienzo (filas `lienzo-N` de invitacion.csv), en el orden en
     * que se escriben. Los `e_*` son solo de escritorio y, vacíos, heredan del celular.
     */
    public const CANVAS_FIELDS = [
        'objetivo', 'tipo', 'forma', 'texto', 'imagen', 'color', 'letra', 'tamano', 'alineacion', 'borde', 'radio',
        'x', 'y', 'ancho', 'rotacion', 'escala', 'voltear_h', 'voltear_v', 'opacidad', 'capa', 'bloqueado', 'oculto',
        'e_x', 'e_y', 'e_ancho', 'e_rotacion', 'e_escala', 'e_opacidad', 'e_oculto',
    ];

    /** Una sección conocida, o null. */
    public static function section(string $kind): ?array
    {
        return self::SECTIONS[$kind] ?? null;
    }

    /** @return list<string> */
    public static function kinds(): array
    {
        return array_keys(self::SECTIONS);
    }

    /** "sobre" → "portada"; un nombre desconocido se queda igual. */
    public static function canonicalKind(string $kind): string
    {
        return self::ALIASES[$kind] ?? $kind;
    }

    /** Tipo de sección en el contrato ("itinerario" → "itinerary"); uno desconocido pasa en kebab-case. */
    public static function type(string $kind): string
    {
        return self::SECTIONS[$kind]['type'] ?? str_replace('_', '-', $kind);
    }

    /** Tipo del contrato → nombre en el formato ("itinerary" → "itinerario"), o null. */
    public static function kindOfType(string $type): ?string
    {
        foreach (self::SECTIONS as $kind => $def) {
            if ($def['type'] === $type) {
                return $kind;
            }
        }

        return null;
    }

    public static function repeatable(string $kind): bool
    {
        return (bool) (self::SECTIONS[$kind]['repeatable'] ?? false);
    }

    /**
     * Bloques de texto de una sección: nombre en el CSV → bloque del contrato.
     * Una sección desconocida tiene los comunes.
     *
     * @return array<string, array{block: string, label: string}>
     */
    public static function textBlocks(string $kind): array
    {
        $texts = self::SECTIONS[$kind]['texts'] ?? array_map(fn ($t) => $t['label'], self::TEXTS);
        $out = [];
        foreach ($texts as $key => $def) {
            $out[$key] = is_array($def)
                ? $def
                : ['block' => self::TEXTS[$key]['block'] ?? str_replace('_', '-', $key), 'label' => $def];
        }

        return $out;
    }

    /**
     * Adornos de una sección: nombre en el CSV → ranura del tema.
     *
     * @return array<string, array{slot: string, label: string}>
     */
    public static function slots(string $kind): array
    {
        $out = [];
        foreach (self::SECTIONS[$kind]['slots'] ?? [] as $key) {
            $out[$key] = self::SLOTS[$key];
        }

        return $out;
    }

    /** @return list<array<string, mixed>> */
    public static function listFields(string $kind): array
    {
        return self::SECTIONS[$kind]['list']['fields'] ?? [];
    }

    /**
     * Orden en que se escriben los campos de una sección: visible, sus campos de contenido,
     * los comunes, colores, adornos y estilos de texto. Lo demás va al final (alfabético).
     *
     * @return list<string>
     */
    public static function fieldOrder(string $kind): array
    {
        $order = ['visible'];
        foreach (self::SECTIONS[$kind]['fields'] ?? [] as $field) {
            $order[] = $field['key'];
        }
        foreach (self::COMMON as $field) {
            $order[] = $field['key'];
        }
        foreach (array_keys(self::COLORS) as $color) {
            $order[] = 'color_'.$color;
        }
        foreach (array_keys(self::slots($kind)) as $slot) {
            $order[] = 'imagen_'.$slot;
        }
        foreach (array_keys(self::textBlocks($kind)) as $block) {
            foreach (array_keys(self::TEXT_PROPS) as $prop) {
                $order[] = $block.'_'.$prop;
            }
        }

        return array_values(array_unique($order));
    }

    /** @return list<string> */
    public static function itemFieldOrder(string $kind): array
    {
        return array_map(fn ($f) => $f['key'], self::listFields($kind));
    }

    /** @return list<string> */
    public static function eventOrder(): array
    {
        $order = [];
        foreach (self::EVENT_GROUPS as $group) {
            foreach ($group['fields'] as $field) {
                $order[] = $field['key'];
            }
        }

        return $order;
    }

    /** @return list<string> */
    public static function textsOrder(): array
    {
        $order = [];
        foreach (array_keys(self::TEXTS) as $block) {
            foreach (array_keys(self::TEXT_PROPS) as $prop) {
                $order[] = $block.'_'.$prop;
            }
        }

        return $order;
    }

    /** @return list<string> */
    public static function pageOrder(): array
    {
        return array_map(fn ($f) => $f['key'], self::PAGE);
    }

    /** Tipo de control de un campo de "evento" (url, image, audio…), o null si no se conoce. */
    public static function eventInput(string $key): ?string
    {
        foreach (self::EVENT_GROUPS as $group) {
            foreach ($group['fields'] as $field) {
                if ($field['key'] === $key) {
                    return $field['input'];
                }
            }
        }

        return null;
    }

    /** Tipo de control de un campo de una sección o de su lista. */
    public static function fieldInput(string $kind, string $key, bool $item = false): ?string
    {
        $fields = $item ? self::listFields($kind) : [...(self::SECTIONS[$kind]['fields'] ?? []), ...self::COMMON];
        foreach ($fields as $field) {
            if ($field['key'] === $key) {
                return $field['input'];
            }
        }
        if (! $item && str_starts_with($key, 'imagen_')) {
            return 'image';
        }

        return null;
    }

    /**
     * El catálogo para el editor (JSON, claves en snake_case como el resto de la API).
     *
     * @return array<string, mixed>
     */
    public static function toArray(): array
    {
        $sections = [];
        foreach (self::SECTIONS as $kind => $def) {
            $sections[] = [
                'id' => $kind,
                'type' => $def['type'],
                'label' => $def['label'],
                'description' => $def['description'],
                'icon' => $def['icon'],
                'repeatable' => (bool) ($def['repeatable'] ?? false),
                'fields' => $def['fields'] ?? [],
                'list' => $def['list'] ?? null,
                'linked' => $def['linked'] ?? [],
                'slots' => array_map(
                    fn ($key, $slot) => ['key' => $key, 'slot' => $slot['slot'], 'label' => $slot['label']],
                    array_keys(self::slots($kind)),
                    self::slots($kind),
                ),
                'texts' => array_map(
                    fn ($key, $text) => ['key' => $key, 'block' => $text['block'], 'label' => $text['label']],
                    array_keys(self::textBlocks($kind)),
                    self::textBlocks($kind),
                ),
                'hidden_without' => $def['hidden_without'] ?? null,
            ];
        }

        return [
            'version' => self::VERSION,
            'reserved' => self::RESERVED,
            'event_groups' => self::EVENT_GROUPS,
            'colors' => array_map(
                fn ($key, $c) => ['key' => $key, 'token' => $c['token'], 'label' => $c['label'], 'help' => $c['help']],
                array_keys(self::COLORS),
                self::COLORS,
            ),
            'fonts' => array_map(
                fn ($key, $f) => ['key' => $key, 'role' => $f['role'], 'label' => $f['label'], 'help' => $f['help']],
                array_keys(self::FONTS),
                self::FONTS,
            ),
            'texts' => array_map(
                fn ($key, $t) => ['key' => $key, 'block' => $t['block'], 'label' => $t['label']],
                array_keys(self::TEXTS),
                self::TEXTS,
            ),
            'text_props' => array_map(
                fn ($key, $p) => ['key' => $key, 'prop' => $p['prop'], 'label' => $p['label']],
                array_keys(self::TEXT_PROPS),
                self::TEXT_PROPS,
            ),
            'text_size' => ['min' => self::TEXT_SIZE_MIN, 'max' => self::TEXT_SIZE_MAX],
            'common' => self::COMMON,
            'effects' => array_map(
                fn ($key, $e) => ['key' => $key, 'effect' => $e['effect'], 'label' => $e['label'], 'help' => $e['help']],
                array_keys(self::EFFECTS),
                self::EFFECTS,
            ),
            'page' => self::PAGE,
            'sections' => $sections,
            'no_image' => self::NO_IMAGE,
            'limits' => self::LIMITS,
        ];
    }
}
