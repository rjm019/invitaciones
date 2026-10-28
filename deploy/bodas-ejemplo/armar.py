"""Arma en eventos/ (fuera de git) la boda de ejemplo "Isabella & Mateo" con el tema `lacre`.

Es una invitación regular, no una muestra: sin `demo`, con panel y clave, y la confirmación,
las dedicatorias, la trivia y el álbum sí se guardan. Datos ficticios; los lugares y el
hospedaje son los mismos de la versión en encaje. Las fotos son libres (CC0, ver
CREDITOS.md).

    python3 deploy/bodas-ejemplo/armar.py

Cada corrida reescribe el diseño (invitacion.csv) y las fotos. La clave del panel y los
tokens de las invitaciones se generan al azar **solo la primera vez** (no se versionan) y
se imprimen; si el evento ya existe, se conservan los suyos y se vuelven a imprimir.
"""
import csv
import io
import os
import secrets
import shutil
import string
import sys
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ALNUM = string.ascii_letters + string.digits


def write(path, header, rows):
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator='\r\n')
    w.writerow(header)
    w.writerows(rows)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8-sig', newline='') as f:
        f.write(buf.getvalue())
    os.replace(tmp, path)


def read(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def token():
    # 12 alfanuméricos, como InvitationStore::PATTERN.
    return ''.join(secrets.choice(ALNUM) for _ in range(12))


def panel_key():
    # Sin espacios ni caracteres que se confundan (como passwordService).
    alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
    return '-'.join(''.join(secrets.choice(alphabet) for _ in range(4)) for _ in range(3))


def install(slug, design, guests, media):
    d = os.path.join(ROOT, 'eventos', slug)
    os.makedirs(os.path.join(d, 'media'), exist_ok=True)
    rows = [list(i) if len(i) == 4 else [i[0], '', i[1], i[2]] for i in design]
    write(os.path.join(d, 'invitacion.csv'), ['seccion', 'elemento', 'campo', 'valor'], rows)

    # Ajustes: la clave del panel de antes se conserva (la del dueño); si no hay, una nueva.
    settings = {r['clave']: r['valor'] for r in read(os.path.join(d, 'ajustes.csv'))}
    settings.pop('demo', None)
    settings['publicado'] = 'SI'
    settings.setdefault('clave_panel', panel_key())
    write(os.path.join(d, 'ajustes.csv'), ['clave', 'valor'], list(settings.items()))

    # Invitaciones: solo la primera vez (después las maneja el panel).
    invitations = read(os.path.join(d, 'invitaciones.csv'))
    if not invitations:
        now = datetime.now().strftime('%Y-%m-%d %H:%M')
        invitations = [
            {'id': str(i), 'token': token(), 'invitados': str(n), 'para': label, 'creada': now}
            for i, (label, n) in enumerate(guests, 1)
        ]
        write(os.path.join(d, 'invitaciones.csv'), ['id', 'token', 'invitados', 'para', 'creada'],
              [[r['id'], r['token'], r['invitados'], r['para'], r['creada']] for r in invitations])

    src = os.path.join(HERE, media)
    for name in sorted(os.listdir(src)):
        shutil.copy2(os.path.join(src, name), os.path.join(d, 'media', name))
    shutil.copy2(os.path.join(HERE, 'CREDITOS.md'), os.path.join(d, 'CREDITOS.md'))

    print('eventos/%s listo' % slug)
    print('  panel:  /panel/%s  clave: %s' % (slug, settings['clave_panel']))
    for r in invitations:
        print('  invitación: /i/%s  (%s, %s pases)' % (r['token'], r['para'], r['invitados']))


def trivia(questions):
    rows = []
    for n, (q, opts, ok) in enumerate(questions, 1):
        rows.append(('trivia', str(n), 'pregunta', q))
        for i, o in enumerate(opts, 1):
            rows.append(('trivia', str(n), 'opcion_%d' % i, o))
        rows.append(('trivia', str(n), 'correcta', str(ok)))
    return rows


LACRE = [
    ('evento', 'tipo', 'boda'),
    ('evento', 'tema', 'lacre'),
    ('evento', 'festejada', 'Isabella & Mateo'),
    ('evento', 'festejada_corto', 'Isabella & Mateo'),
    ('evento', 'pareja', 'Isabella & Mateo'),
    ('evento', 'monograma', 'I M'),
    ('evento', 'subtitulo', 'nos casamos'),
    ('evento', 'titulo', 'Isabella & Mateo · Nuestra boda'),
    ('evento', 'inicia', '2027-10-23 17:00'),
    ('evento', 'zona_horaria', 'America/Mexico_City'),
    ('evento', 'salon', 'Hacienda Santa Elena'),
    ('evento', 'salon_ciudad', 'San Miguel de Allende'),
    ('evento', 'salon_direccion', 'Camino a la Cañada 120'),
    ('evento', 'salon_maps', 'https://maps.google.com/?q=San+Miguel+de+Allende'),
    ('evento', 'rsvp_modo', 'token'),
    ('evento', 'rsvp_limite', '2027-09-25'),
    ('evento', 'musica_fuente', 'spotify'),
    ('evento', 'spotify', 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO'),
    ('evento', 'tarjeta_frase', 'Nuestra boda'),

    ('portada', 'visible', 'SI'),
    ('portada', 'titulo', 'Con todo el corazón'),
    ('portada', 'texto', 'Tenemos el honor de invitarles a celebrar nuestro matrimonio el día'),
    ('portada', 'boton', 'Toca para abrir'),

    ('musica', 'visible', 'SI'),
    ('musica', 'titulo', 'Nuestra canción'),

    ('bendicion', 'visible', 'SI'),
    ('bendicion', 'texto', 'Con la bendición de Dios y el cariño de quienes nos enseñaron a amar, unimos nuestras vidas.'),
    ('bendicion', '1', 'rol', 'Papás de la novia'),
    ('bendicion', '1', 'nombres', 'Elena Carrillo de Ruiz\nJavier Ruiz Arriaga'),
    ('bendicion', '2', 'rol', 'Papás del novio'),
    ('bendicion', '2', 'nombres', 'Lucía Fernández de Montoya\nAndrés Montoya Lara'),
    ('bendicion', '3', 'rol', 'Padrinos de velación'),
    ('bendicion', '3', 'nombres', 'Marina Solís\nGabriel Ortega'),
    ('bendicion', '4', 'rol', 'Padrinos de anillos'),
    ('bendicion', '4', 'nombres', 'Daniela Ruiz Carrillo\nRodrigo Ibarra'),
    ('bendicion', '5', 'rol', 'Padrinos de lazo'),
    ('bendicion', '5', 'nombres', 'Teresa Lara\nManuel Montoya'),

    ('historia', 'visible', 'SI'),
    ('historia', 'titulo', 'Nuestra historia'),
    ('historia', 'texto', 'Nos conocimos entre los pasillos de una librería de Guanajuato, buscando el mismo libro de poemas. Él lo dejó en el estante; ella se lo llevó. Diez años, tres mudanzas y un perro después, seguimos discutiendo quién de los dos lo leyó primero. Ahora queremos escribir el capítulo más importante con ustedes cerca.'),
    ('historia', '1', 'anio', '2017'),
    ('historia', '1', 'titulo', 'El mismo libro'),
    ('historia', '1', 'texto', 'Una tarde de lluvia en Guanajuato y un poemario de segunda mano.'),
    ('historia', '2', 'anio', '2020'),
    ('historia', '2', 'titulo', 'Canelo llega a casa'),
    ('historia', '2', 'texto', 'Un cachorro de ojos tristes que hoy será el paje de los anillos.'),
    ('historia', '3', 'anio', '2026'),
    ('historia', '3', 'titulo', 'La pregunta'),
    ('historia', '3', 'texto', 'Al atardecer, en el mirador de San Miguel. Ella dijo que sí antes de que él terminara.'),
    ('historia', '3', 'foto', 'pareja.webp'),

    ('fecha', 'visible', 'SI'),
    ('fecha', 'titulo', 'Reserva la fecha'),

    ('ubicacion', 'visible', 'SI'),
    ('ubicacion', 'titulo', 'Dónde'),
    ('ubicacion', 'boton', 'Ver ubicación'),
    ('ubicacion', 'acomodo', 'lado a lado'),
    ('ubicacion', 'calendario', 'SI'),
    ('ubicacion', '1', 'tipo', 'ceremonia religiosa'),
    ('ubicacion', '1', 'etiqueta', 'Ceremonia'),
    ('ubicacion', '1', 'lugar', 'Parroquia de San Rafael'),
    ('ubicacion', '1', 'hora', '17:00'),
    ('ubicacion', '1', 'direccion', 'Calle del Cardo 8, Centro'),
    ('ubicacion', '1', 'maps', 'https://maps.google.com/?q=San+Miguel+de+Allende+Centro'),
    ('ubicacion', '2', 'tipo', 'recepcion'),
    ('ubicacion', '2', 'etiqueta', 'Recepción'),
    ('ubicacion', '2', 'lugar', 'Hacienda Santa Elena'),
    ('ubicacion', '2', 'hora', '19:00'),
    ('ubicacion', '2', 'direccion', 'Camino a la Cañada 120, San Miguel de Allende'),
    ('ubicacion', '2', 'maps', 'https://maps.google.com/?q=San+Miguel+de+Allende'),

    ('cuenta_regresiva', 'visible', 'SI'),
    ('cuenta_regresiva', 'titulo', 'Faltan'),
    ('cuenta_regresiva', 'texto', 'para decirnos que sí frente a ustedes'),

    ('itinerario', 'visible', 'SI'),
    ('itinerario', 'titulo', 'El programa'),
    ('itinerario', 'en_vivo', 'SI'),
    ('itinerario', '1', 'hora', '17:00'), ('itinerario', '1', 'actividad', 'Ceremonia religiosa'),
    ('itinerario', '2', 'hora', '18:15'), ('itinerario', '2', 'actividad', 'Traslado a la hacienda'),
    ('itinerario', '3', 'hora', '19:00'), ('itinerario', '3', 'actividad', 'Cóctel en el jardín'),
    ('itinerario', '4', 'hora', '20:30'), ('itinerario', '4', 'actividad', 'Cena'),
    ('itinerario', '5', 'hora', '22:00'), ('itinerario', '5', 'actividad', 'Primer baile'),
    ('itinerario', '6', 'hora', '22:30'), ('itinerario', '6', 'actividad', 'Fiesta'),
    ('itinerario', '7', 'hora', '2:00'), ('itinerario', '7', 'actividad', 'Tornaboda'),

    ('vestimenta', 'visible', 'SI'),
    ('vestimenta', 'titulo', 'Código de vestimenta'),
    ('vestimenta', 'subtitulo', 'Formal'),
    ('vestimenta', 'texto', 'Vestido largo o de cóctel para ellas; traje oscuro para ellos. La noche en la hacienda refresca: un chal o un saco no sobran.'),
    ('vestimenta', 'colores', '#4E5136 #A99C88 #6E1F2C #B08D57'),
    ('vestimenta', 'restricciones', 'El blanco y el marfil son para la novia\nTacón de aguja: el cóctel es en el jardín\nMezclilla y tenis'),
    ('vestimenta', '1', 'foto', 'dama.webp'), ('vestimenta', '1', 'pie', 'Largo, en tonos tierra'),
    ('vestimenta', '2', 'foto', 'retrato.webp'), ('vestimenta', '2', 'pie', 'Traje oscuro, sin corbata de moño'),
    ('vestimenta', '3', 'foto', 'novia-ramo.webp'), ('vestimenta', '3', 'pie', 'Flores y texturas naturales'),

    ('hospedaje', 'visible', 'SI'),
    ('hospedaje', 'titulo', 'Hospedaje'),
    ('hospedaje', 'subtitulo', 'Para que nadie maneje de regreso'),
    ('hospedaje', 'texto', 'Apartamos habitaciones con tarifa especial hasta el 1 de septiembre; menciona «Boda Isabella y Mateo» al reservar.'),
    ('hospedaje', 'boton', 'Reservar'),
    ('hospedaje', '1', 'nombre', 'Casa de la Cañada'),
    ('hospedaje', '1', 'nota', 'A cinco minutos de la hacienda'),
    ('hospedaje', '1', 'maps', 'https://maps.google.com/?q=San+Miguel+de+Allende'),
    ('hospedaje', '1', 'distancia', '5 min de la hacienda'),
    ('hospedaje', '1', 'precio', 'Desde $2,900 por noche'),
    ('hospedaje', '2', 'nombre', 'Hotel Portal del Jardín'),
    ('hospedaje', '2', 'nota', 'En el centro, junto a la parroquia'),
    ('hospedaje', '2', 'maps', 'https://maps.google.com/?q=San+Miguel+de+Allende+Centro'),
    ('hospedaje', '2', 'distancia', '2 min a pie de la parroquia'),
    ('hospedaje', '2', 'precio', 'Desde $2,400 por noche'),
    ('hospedaje', '3', 'nombre', 'Posada del Cantador'),
    ('hospedaje', '3', 'nota', 'A 10 minutos en auto'),
    ('hospedaje', '3', 'maps', 'https://maps.google.com/?q=San+Miguel+de+Allende'),
    ('hospedaje', '3', 'distancia', '10 min en auto'),
    ('hospedaje', '3', 'precio', 'Desde $1,600 por noche'),

    ('galeria', 'visible', 'SI'),
    ('galeria', 'titulo', 'Momentos'),
    ('galeria', 'subtitulo', 'Antes del sí'),
    ('galeria', '1', 'foto', 'pasillo.webp'), ('galeria', '1', 'pie', 'El pasillo de San Rafael'),
    ('galeria', '2', 'foto', 'manos.webp'), ('galeria', '2', 'pie', 'Siempre de la mano'),
    ('galeria', '3', 'foto', 'ramo.webp'), ('galeria', '3', 'pie', 'Las flores del jardín'),
    ('galeria', '4', 'foto', 'bosque.webp'), ('galeria', '4', 'pie', 'Una caminata en la Cañada'),
    ('galeria', '5', 'foto', 'anillos-manos.webp'), ('galeria', '5', 'pie', 'Los anillos'),

    ('mesa_regalos', 'visible', 'SI'),
    ('mesa_regalos', 'titulo', 'Mesa de regalos'),
    ('mesa_regalos', 'texto', 'Su presencia es el mejor regalo. Si desean tener un detalle con nosotros, les dejamos algunas opciones.'),
    ('mesa_regalos', 'boton', 'Ver mesa'),
    ('mesa_regalos', '1', 'tienda', 'otra'),
    ('mesa_regalos', '1', 'nombre', 'Casa Olivo'),
    ('mesa_regalos', '1', 'nota', 'Vajilla, lino y cosas para la casa'),
    ('mesa_regalos', '1', 'numero_evento', '20271023'),
    ('mesa_regalos', '2', 'tienda', 'otra'),
    ('mesa_regalos', '2', 'nombre', 'Atelier Lumbre'),
    ('mesa_regalos', '2', 'nota', 'Nuestra luna de miel, por noches'),
    ('mesa_regalos', '2', 'numero_evento', 'IM-1023'),
    ('mesa_regalos', 'sobres_titulo', 'Transferencia'),
    ('mesa_regalos', 'sobres_texto', 'Si lo prefieren, también pueden hacernos una transferencia.'),
    ('mesa_regalos', 'banco', 'Banco Ejemplo'),
    ('mesa_regalos', 'cuenta', '123456789012345678'),
    ('mesa_regalos', 'titular', 'Isabella Ruiz Carrillo'),
    ('mesa_regalos', 'sobre_fisico', 'SI'),

    ('informacion', 'visible', 'SI'),
    ('informacion', 'titulo', 'Preguntas frecuentes'),
    ('informacion', '1', 'pregunta', '¿Habrá transporte entre la parroquia y la hacienda?'),
    ('informacion', '1', 'respuesta', 'Sí. Al terminar la ceremonia, dos camionetas saldrán del atrio a las 18:15 y harán viajes de regreso al centro desde la 1:00.'),
    ('informacion', '2', 'pregunta', '¿Hay estacionamiento?'),
    ('informacion', '2', 'respuesta', 'La hacienda tiene estacionamiento con valet sin costo. En el centro conviene dejar el auto en el estacionamiento de Calle del Cardo.'),
    ('informacion', '3', 'pregunta', '¿Pueden ir niños?'),
    ('informacion', '3', 'respuesta', 'Queremos que sea una noche para adultos; los únicos pequeños invitados son nuestros sobrinos de la familia cercana.'),
    ('informacion', '4', 'pregunta', '¿A qué hora conviene llegar a la parroquia?'),
    ('informacion', '4', 'respuesta', 'Quince minutos antes: la ceremonia empieza puntual a las 17:00.'),
    ('informacion', '5', 'pregunta', '¿Cómo es el clima en octubre?'),
    ('informacion', '5', 'respuesta', 'De día es templado y por la noche baja a unos 12 °C. Trae algo para cubrirte en el jardín.'),
    ('informacion', '6', 'pregunta', '¿Hasta cuándo puedo confirmar?'),
    ('informacion', '6', 'respuesta', 'Hasta el 25 de septiembre de 2027, desde tu invitación personal.'),

    ('trivia', 'visible', 'SI'),
    ('trivia', 'titulo', 'Cuánto nos conoces'),
    ('trivia', 'texto', 'Diez preguntas sobre nosotros y sobre esta invitación.'),
    ('trivia', 'boton', 'Empezar'),
] + trivia([
    ('¿Dónde se conocieron Isabella y Mateo?', ['En una librería de Guanajuato', 'En una boda de amigos', 'En la universidad'], 1),
    ('¿Qué libro buscaban los dos aquella tarde?', ['Una novela de misterio', 'Un poemario de segunda mano', 'Una guía de viaje'], 2),
    ('¿Cómo se llama su perro, el paje de los anillos?', ['Canelo', 'Firulais', 'Bruno'], 1),
    ('¿Dónde le pidió Mateo matrimonio a Isabella?', ['En la playa', 'En un restaurante', 'En el mirador de San Miguel'], 3),
    ('¿En qué parroquia es la ceremonia?', ['San Francisco', 'San Rafael', 'La Merced'], 2),
    ('¿A qué hora salen las camionetas a la hacienda?', ['17:00', '18:15', '20:30'], 2),
    ('¿Qué colores sugieren para vestir?', ['Pastel y blanco', 'Olivo, taupe, vino y oro', 'Negro y plata'], 2),
    ('¿Qué conviene evitar en los zapatos?', ['El tacón de aguja', 'Los zapatos cerrados', 'El color negro'], 1),
    ('¿Qué pasa al tocar «Agregar al calendario»?', ['Se confirma tu asistencia', 'La hora queda guardada en tu calendario', 'Suena la canción'], 2),
    ('¿Hasta cuándo puedes confirmar tu asistencia?', ['25 de septiembre de 2027', '23 de octubre de 2027', 'No hace falta'], 1),
]) + [
    ('confirmacion', 'visible', 'SI'),
    ('confirmacion', 'titulo', 'Confirma tu asistencia'),
    ('confirmacion', 'subtitulo', 'Nos ayudará mucho saber si nos acompañas'),

    ('dedicatoria', 'visible', 'SI'),
    ('dedicatoria', 'titulo', 'Unas palabras para nosotros'),
    ('dedicatoria', 'texto', 'Un deseo, un recuerdo o un consejo. Lo leeremos juntos el día después.'),
    ('dedicatoria', 'muro', 'SI'),

    ('album', 'visible', 'SI'),
    ('album', 'titulo', 'Álbum de la boda'),
    ('album', 'texto', 'El día de la boda, sube hasta 2 fotos de la fiesta; nosotros elegimos las que se quedan.'),
    ('album', 'boton', 'Elegir fotos'),

    ('cierre', 'visible', 'SI'),
    ('cierre', 'titulo', 'Los esperamos'),
    ('cierre', 'texto', 'Gracias por ser parte de nuestra historia. Este día no sería el mismo sin ustedes.'),
]

if __name__ == '__main__':
    install('boda-isabella-mateo', LACRE,
            [('Familia Ortega Solís', 4), ('Sofía Herrera', 2)], 'media')
    if '--sin-miniaturas' not in sys.argv:
        print('Si agregas fotos nuevas: docker compose exec -T api php artisan media:miniaturas boda-isabella-mateo')
