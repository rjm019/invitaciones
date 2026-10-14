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
    ];

    /** Otros nombres de efectos que ya aceptaba el Excel. */
    public const EFFECT_ALIASES = ['cambio_color' => 'cambio_de_color', 'colores' => 'cambio_de_color'];

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
        'lazo' => ['slot' => 'bow', 'label' => 'Moño'],
        'destellos' => ['slot' => 'glitter', 'label' => 'Brillo'],
        'marco' => ['slot' => 'frame', 'label' => 'Marco'],
        'estrellas' => ['slot' => 'stars', 'label' => 'Estrellas'],
        'mujer' => ['slot' => 'woman', 'label' => 'Figura de mujer'],
        'hombre' => ['slot' => 'man', 'label' => 'Figura de hombre'],
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
                ['value' => 'bautizo', 'label' => 'Bautizo'],
                ['value' => 'cumple', 'label' => 'Cumpleaños'],
                ['value' => 'otro', 'label' => 'Otro'],
            ]],
            ['key' => 'tema', 'label' => 'Diseño base', 'input' => 'theme', 'required' => true],
            ['key' => 'festejada', 'label' => 'Nombre completo', 'input' => 'text', 'max_length' => 120],
            ['key' => 'festejada_corto', 'label' => 'Nombre corto (el del sobre)', 'input' => 'text', 'max_length' => 40],
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
            'fields' => [['key' => 'boton', 'label' => 'Texto para abrir', 'input' => 'text', 'placeholder' => 'Toca para abrir', 'max_length' => 60]],
            'linked' => ['festejada_corto', 'festejada', 'subtitulo'],
            'slots' => ['sobre', 'tarjeta', 'flores', 'corona', 'mariposas', 'lacre'],
            'texts' => ['subtitulo' => 'Frase (mis xv años)', 'nombre' => ['block' => 'name', 'label' => 'Nombre grande'], 'lugar' => ['block' => 'place', 'label' => 'Salón y ciudad'], 'para' => ['block' => 'to', 'label' => 'Nombre en el sobre'], 'boton' => 'Texto para abrir'],
        ],
        'musica' => [
            'type' => 'music-player', 'label' => 'Música', 'icon' => 'music',
            'description' => 'El reproductor con la canción que suena al abrir el sobre.',
            'fields' => [['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Dale play', 'max_length' => 60]],
            'linked' => ['musica_fuente', 'musica_audio', 'spotify'],
            'texts' => ['titulo' => 'Título'],
        ],
        'bendicion' => [
            'type' => 'blessing', 'label' => 'Bendición y familia', 'icon' => 'dove',
            'description' => 'Un mensaje y los nombres de papás y padrinos.',
            'fields' => [
                ['key' => 'texto', 'label' => 'Mensaje', 'input' => 'textarea', 'placeholder' => 'Con la bendición de Dios…', 'max_length' => 600],
                ['key' => 'subtitulo', 'label' => 'Subtítulo', 'input' => 'text', 'help' => 'Vacío: la frase de la portada.', 'max_length' => 80],
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
            'fields' => [['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Save the date', 'max_length' => 60]],
            'linked' => ['inicia', 'zona_horaria'],
            'slots' => ['destellos'],
            'texts' => ['titulo' => 'Título', 'fecha' => ['block' => 'date', 'label' => 'Fecha grande'], 'calendario' => ['block' => 'calendar', 'label' => 'Calendario']],
        ],
        'foto' => [
            'type' => 'photo-arch', 'label' => 'Foto', 'icon' => 'camera', 'repeatable' => true,
            'description' => 'Una foto recortada dentro del marco en arco.',
            'fields' => [
                ['key' => 'imagen', 'label' => 'Foto (de preferencia sin fondo)', 'input' => 'image'],
                ['key' => 'titulo', 'label' => 'Iniciales o apodo', 'input' => 'text', 'help' => 'Va en la esquina de la foto.', 'max_length' => 20],
            ],
            'slots' => ['marco', 'estrellas', 'mariposas'],
            'texts' => ['titulo' => 'Iniciales'],
        ],
        'ubicacion' => [
            'type' => 'location', 'label' => 'Ubicación', 'icon' => 'location-dot',
            'description' => 'El salón (o varios lugares) con su botón a Maps.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Ubicación', 'max_length' => 60],
                ['key' => 'boton', 'label' => 'Texto del botón', 'input' => 'text', 'placeholder' => 'Ver en Maps', 'max_length' => 40],
            ],
            'linked' => ['salon', 'salon_nombre_visible', 'salon_ciudad', 'salon_direccion', 'salon_maps', 'salon_foto'],
            'list' => ['key' => 'lugares', 'label' => 'Más lugares (opcional)', 'item_label' => 'Lugar', 'max' => 6, 'help' => 'Para misa y recepción por separado. Sin lugares, se muestra el salón.', 'fields' => [
                ['key' => 'etiqueta', 'label' => 'Qué es', 'input' => 'text', 'placeholder' => 'Ceremonia', 'max_length' => 40],
                ['key' => 'lugar', 'label' => 'Nombre del lugar', 'input' => 'text', 'required' => true, 'max_length' => 120],
                ['key' => 'hora', 'label' => 'Hora', 'input' => 'time'],
                ['key' => 'direccion', 'label' => 'Dirección', 'input' => 'text', 'max_length' => 200],
                ['key' => 'maps', 'label' => 'Enlace de Google Maps', 'input' => 'url'],
                ['key' => 'foto', 'label' => 'Foto', 'input' => 'image'],
            ]],
            'texts' => ['titulo' => 'Título', 'etiqueta' => ['block' => 'label', 'label' => 'Qué es (Ceremonia)'], 'lugar' => ['block' => 'place', 'label' => 'Nombre del lugar'], 'detalle' => ['block' => 'detail', 'label' => 'Hora y dirección'], 'boton' => 'Botón'],
        ],
        'frase' => [
            'type' => 'quote', 'label' => 'Frase', 'icon' => 'quote-left', 'repeatable' => true,
            'description' => 'Una frase corta con el divisor del tema.',
            'fields' => [['key' => 'texto', 'label' => 'Frase', 'input' => 'textarea', 'placeholder' => 'Hoy comienza el capítulo más bonito de mi historia', 'max_length' => 400]],
            'slots' => ['divisor'],
            'texts' => ['texto' => 'Frase'],
        ],
        'itinerario' => [
            'type' => 'itinerary', 'label' => 'Itinerario', 'icon' => 'clock',
            'description' => 'Los momentos de la fiesta con su hora.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Itinerario', 'max_length' => 60],
                ['key' => 'variante', 'label' => 'Acomodo', 'input' => 'select', 'options' => [
                    ['value' => 'zigzag', 'label' => 'Zigzag'],
                    ['value' => 'lista', 'label' => 'Lista'],
                ]],
            ],
            'list' => ['key' => 'momentos', 'label' => 'Momentos', 'item_label' => 'Momento', 'max' => 12, 'fields' => [
                ['key' => 'hora', 'label' => 'Hora', 'input' => 'time', 'required' => true],
                ['key' => 'actividad', 'label' => 'Qué pasa', 'input' => 'text', 'placeholder' => 'Recepción', 'required' => true, 'max_length' => 60],
                ['key' => 'icono', 'label' => 'Ícono', 'input' => 'icon'],
            ]],
            'slots' => ['marco'],
            'texts' => ['titulo' => 'Título', 'hora' => ['block' => 'time', 'label' => 'Horas'], 'actividad' => ['block' => 'activity', 'label' => 'Actividades']],
        ],
        'vestimenta' => [
            'type' => 'dress-code', 'label' => 'Código de vestimenta', 'icon' => 'shirt',
            'description' => 'Qué ponerse, con las figuras y los colores sugeridos.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Dress Code', 'max_length' => 60],
                ['key' => 'subtitulo', 'label' => 'Tipo de vestimenta', 'input' => 'text', 'placeholder' => 'Formal', 'max_length' => 80],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'max_length' => 600],
                ['key' => 'colores', 'label' => 'Colores sugeridos', 'input' => 'colors', 'help' => 'De 1 a 4.'],
            ],
            'slots' => ['lacre', 'tarjeta', 'mujer', 'hombre'],
            'texts' => ['titulo' => 'Título', 'subtitulo' => 'Tipo de vestimenta', 'texto' => 'Texto'],
        ],
        'sin_ninos' => [
            'type' => 'no-kids', 'label' => 'Solo adultos', 'icon' => 'user-group',
            'description' => 'Aviso amable de que la celebración es sin niños.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Sin niños', 'max_length' => 60],
                ['key' => 'subtitulo', 'label' => 'Etiqueta', 'input' => 'text', 'placeholder' => 'Solo adultos', 'max_length' => 40],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'max_length' => 600],
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
            ],
            'list' => ['key' => 'hoteles', 'label' => 'Hoteles', 'item_label' => 'Hotel', 'max' => 8, 'fields' => [
                ['key' => 'nombre', 'label' => 'Nombre', 'input' => 'text', 'required' => true, 'max_length' => 120],
                ['key' => 'nota', 'label' => 'Nota corta', 'input' => 'text', 'placeholder' => 'A unos pasos del salón', 'max_length' => 120],
                ['key' => 'direccion', 'label' => 'Dirección', 'input' => 'text', 'max_length' => 200],
                ['key' => 'maps', 'label' => 'Enlace de Google Maps', 'input' => 'url'],
                ['key' => 'telefono', 'label' => 'Teléfono', 'input' => 'phone'],
                ['key' => 'foto', 'label' => 'Foto', 'input' => 'image'],
            ]],
            'slots' => ['tarjeta', 'divisor'],
            'texts' => ['titulo' => 'Título', 'subtitulo' => 'Subtítulo', 'texto' => 'Texto', 'nombre' => ['block' => 'name', 'label' => 'Nombre del hotel'], 'nota' => ['block' => 'note', 'label' => 'Nota'], 'direccion' => ['block' => 'address', 'label' => 'Dirección'], 'boton' => 'Botón'],
            'hidden_without' => 'Agrega al menos un hotel.',
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
            ],
            'linked' => ['inicia'],
            'slots' => ['corona', 'mariposa'],
            'texts' => ['titulo' => 'Título', 'numeros' => ['block' => 'digits', 'label' => 'Números'], 'unidades' => ['block' => 'units', 'label' => 'Días, horas…'], 'texto' => 'Frase'],
        ],
        'confirmacion' => [
            'type' => 'rsvp', 'label' => 'Confirmación', 'icon' => 'circle-check',
            'description' => 'El formulario para confirmar asistencia, con la fecha límite.',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => 'Confirmación', 'max_length' => 60],
                ['key' => 'subtitulo', 'label' => 'Subtítulo', 'input' => 'text', 'max_length' => 160],
                ['key' => 'boton', 'label' => 'Texto del botón', 'input' => 'text', 'placeholder' => '¡Confirma aquí!', 'max_length' => 40],
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
            ],
            'slots' => ['divisor'],
            'texts' => ['titulo' => 'Título', 'texto' => 'Texto', 'mensaje' => ['block' => 'message', 'label' => 'Mensaje enviado'], 'autor' => ['block' => 'author', 'label' => 'Quién lo envía'], 'boton' => 'Botón'],
        ],
        'cierre' => [
            'type' => 'closing', 'label' => 'Cierre', 'icon' => 'heart', 'repeatable' => true,
            'description' => 'La despedida: "¡Te esperamos!".',
            'fields' => [
                ['key' => 'titulo', 'label' => 'Título', 'input' => 'text', 'placeholder' => '¡Te esperamos!', 'max_length' => 80],
                ['key' => 'texto', 'label' => 'Texto', 'input' => 'textarea', 'max_length' => 400],
            ],
            'slots' => ['flores', 'corona'],
            'texts' => ['titulo' => 'Título', 'texto' => 'Texto'],
        ],
    ];

    /** Límites de un diseño (contra archivos gigantes o pegados por error). */
    public const LIMITS = ['sections' => 60, 'fields' => 120, 'items' => 100, 'value' => 4000];

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
