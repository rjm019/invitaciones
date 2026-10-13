/*
 * Prueba de aceptación del importador contra el layout real del evento.
 * Correr:  docker run --rm -v "$PWD":/app -w /app node:20-alpine node tests/importador.test.js
 */
'use strict';

var fs = require('fs');
var LayoutService = require('../public/js/services/LayoutService.js');
var CsvService = require('../public/js/services/CsvService.js');

var fallos = 0;

function verifica(etiqueta, real, esperado) {
  var ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + etiqueta +
    (ok ? '  → ' + JSON.stringify(real)
        : '\n         esperado: ' + JSON.stringify(esperado) +
          '\n         obtenido: ' + JSON.stringify(real)));
}

console.log('\n=== Layout en rejilla (ejemplos/layout-ejemplo.csv) ===\n');

var texto = fs.readFileSync('ejemplos/layout-ejemplo.csv', 'utf8');
var res = LayoutService.normaliza(CsvService.parsea(texto));

verifica('formato detectado', res.formato, 'rejilla');
verifica('total de invitados', res.invitados.length, 220);
verifica('adultos', res.informe.porCategoria.adulto, 190);
verifica('adolescentes', res.informe.porCategoria.adolescente, 0);
verifica('ninos', res.informe.porCategoria.nino, 30);
verifica('mesas con gente', res.mesas.length, 22);
verifica('categorias detectadas', res.categorias.map(function (c) { return c.id; }),
  ['adulto', 'adolescente', 'nino']);
verifica('etiquetas de categoria', res.categorias.map(function (c) { return c.etiqueta; }),
  ['Adultos', 'Adolescentes', 'Niños']);
verifica('mesas vacias detectadas', res.informe.mesasVacias, [23, 24]);
verifica('totales declarados del layout', res.informe.totalesDeclarados,
  { adulto: 190, adolescente: 0, nino: 30 });
verifica('sin diferencias contra el layout', res.informe.diferencias, []);
verifica('todas las mesas cuadran con su TOTAL',
  res.informe.mesas.filter(function (m) { return !m.cuadra; }).length, 0);

// La nota del capturista no es persona
var descartes = res.informe.descartes.map(function (d) { return d.texto; });
verifica('descarta la nota del capturista', descartes, ['REPETIDO EL NUMERO']);

// JOVEN (mesas 21-24) tiene que caer en la misma categoria que ADOLESCENTES
verifica('JOVEN = adolescente', LayoutService.categoriaDe('JOVEN').id, 'adolescente');
verifica('ADOLESCENTES = adolescente', LayoutService.categoriaDe('ADOLESCENTES').id, 'adolescente');
verifica('ADULTO singular = adulto', LayoutService.categoriaDe('ADULTO').id, 'adulto');
verifica('NIÑO singular = nino', LayoutService.categoriaDe('NIÑO').id, 'nino');
verifica('categoria desconocida se da de alta sola', LayoutService.categoriaDe('PADRINOS'),
  { id: 'padrinos', etiqueta: 'Padrinos' });
verifica('categoria conocida en plural', LayoutService.categoriaDe('BEBÉS'),
  { id: 'bebe', etiqueta: 'Bebés' });

// Acentos y Ñ
var conEnie = res.invitados.filter(function (g) { return /Ñ/.test(g.nombre); })
                           .map(function (g) { return g.nombre; });
verifica('nombres con Ñ intactos', conEnie,
  ['PEQUEÑA', 'PEQUEÑA', 'PEQUEÑA', 'BLANCA ZUÑIGA']);

// Ids unicos y estables
var ids = res.invitados.map(function (g) { return g.id; });
verifica('ids unicos', new Set(ids).size, 220);
verifica('primer invitado', res.invitados[0].nombre, 'MARGARITA MONTES CERON');
verifica('mesa del primero', res.invitados[0].mesa, 1);
verifica('ultimo invitado', res.invitados[219].nombre, 'HIJA DE MONIE');

// Reparto de ninos por mesa (verificado a mano contra el layout)
var ninosPorMesa = {};
res.invitados.forEach(function (g) {
  if (g.categoria === 'nino') ninosPorMesa[g.mesa] = (ninosPorMesa[g.mesa] || 0) + 1;
});
verifica('ninos por mesa', ninosPorMesa,
  { 2: 2, 3: 2, 4: 3, 5: 3, 6: 2, 7: 1, 8: 3, 9: 1, 11: 1, 12: 1,
    15: 2, 16: 3, 17: 3, 19: 1, 20: 1, 22: 1 });

// El rotulo de la mesa trae aclaracion pegada al numero ("MESA 10 NIÑOS"):
// antes ese bloque entero se perdia y sus invitados no se cargaban.
console.log('\n=== Rótulo de mesa con aclaración ===\n');

var rotulada = LayoutService.normaliza(CsvService.parsea([
  'Nº,MESA 9,,ADULTOS,NIÑOS ,,Nº,MESA 10 NIÑOS,,ADULTOS,NIÑOS ',
  '1,KARINA GIL,,2,,,1,SOFI PADRINOS ,, ,1,',
  '2,OSCAR,,1,,,2,EMI PAPAS ,,,2,',
  ',TOTAL ,,3,0,,,TOTAL ,,0,3'
].join('\n')));

verifica('lee la mesa con aclaración en el rótulo', rotulada.mesas, [9, 10]);
verifica('los niños de esa mesa sí se cargan', rotulada.informe.porCategoria.nino, 3);
verifica('la mesa rotulada cuadra con su TOTAL',
  rotulada.informe.mesas.filter(function (m) { return !m.cuadra; }).length, 0);

console.log('\n=== Lista agrupada por titular (ejemplos/lista-agrupada.csv) ===\n');

var agr = LayoutService.normaliza(CsvService.parsea(
  fs.readFileSync('ejemplos/lista-agrupada.csv', 'utf8')));

verifica('formato detectado', agr.formato, 'agrupado');
verifica('las 56 filas se expanden a 126 personas', agr.invitados.length, 126);
verifica('adultos', agr.informe.porCategoria.adulto, 115);
verifica('ninos', agr.informe.porCategoria.nino, 11);
verifica('mesas (la 0 es la principal)', agr.mesas, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
verifica('categorias detectadas', agr.categorias,
  [{ id: 'adulto', etiqueta: 'Adultos' }, { id: 'nino', etiqueta: 'Niños' }]);

// "No Personas" es la columna de adultos, no una categoria nueva
verifica('No Personas = adulto', LayoutService.categoriaDe('No Personas').id, 'adulto');
verifica('no. Personas = adulto', LayoutService.categoriaDe('no. Personas').id, 'adulto');
verifica('PERSONAS = adulto', LayoutService.categoriaDe('PERSONAS').id, 'adulto');

// Cuadra contra la tabla lateral de totales por mesa que trae el archivo
verifica('sin diferencias contra los totales del archivo', agr.informe.diferencias, []);
verifica('solo la mesa principal se queda sin total declarado', agr.informe.mesas
  .filter(function (m) { return m.detalle.indexOf('sin total') === 0; })
  .map(function (m) { return m.mesa; }), [0]);
verifica('nada descartado', agr.informe.descartes, []);

// El titular conserva su nombre y los acompanantes se nombran a partir de el
function nombres(desde, cuantos) {
  return agr.invitados.slice(desde, desde + cuantos).map(function (g) {
    return g.nombre + ' [' + g.categoria + ']';
  });
}
verifica('un acompanante y un nino', nombres(0, 3),
  ['Daniel Gallo [adulto]', 'Acompañante de Daniel Gallo [adulto]', 'Niño de Daniel Gallo [nino]']);
verifica('varios acompanantes van numerados', nombres(8, 3),
  ['Nidia Gonzalez [adulto]', 'Acompañante 1 de Nidia Gonzalez [adulto]',
   'Acompañante 2 de Nidia Gonzalez [adulto]']);
verifica('varios ninos van numerados', nombres(31, 4),
  ['Michel Martinez Vieyra [adulto]', 'Acompañante de Michel Martinez Vieyra [adulto]',
   'Niño 1 de Michel Martinez Vieyra [nino]', 'Niño 2 de Michel Martinez Vieyra [nino]']);
verifica('titular solo con nino, sin acompanante', nombres(46, 2),
  ['Ricardo Muñoz [adulto]', 'Niño de Ricardo Muñoz [nino]']);

verifica('ids unicos', new Set(agr.invitados.map(function (g) { return g.id; })).size, 126);
verifica('mesa 0 completa', agr.informe.mesas[0].total, 3);

console.log('\n=== Tabla plana (ejemplos/invitados-plano.csv) ===\n');

var plano = LayoutService.normaliza(CsvService.parsea(
  fs.readFileSync('ejemplos/invitados-plano.csv', 'utf8')));

verifica('formato detectado', plano.formato, 'plano');
verifica('total de invitados', plano.invitados.length, 220);
verifica('adultos', plano.informe.porCategoria.adulto, 190);
verifica('ninos', plano.informe.porCategoria.nino, 30);
verifica('mismos nombres que la rejilla',
  plano.invitados.map(function (g) { return g.nombre; }).join('|') ===
  res.invitados.map(function (g) { return g.nombre; }).join('|'), true);

console.log('\n=== CSV ida y vuelta ===\n');

var filas = [['id', 'mesa', 'nombre', 'categoria', 'llego', 'comentario']];
filas.push([7, 3, 'NOMBRE, CON COMA', 'adulto', 'SI', 'dijo "hola"']);
filas.push([8, 3, 'SALTO\nDE LINEA', 'nino', '', '']);
var vuelta = CsvService.parsea(CsvService.genera(filas));
verifica('respeta comas y comillas', vuelta[1], ['7', '3', 'NOMBRE, CON COMA', 'adulto', 'SI', 'dijo "hola"']);
verifica('respeta saltos de linea', vuelta[2][2], 'SALTO\nDE LINEA');
verifica('lleva BOM para Excel', CsvService.genera(filas).charCodeAt(0), 0xFEFF);

console.log('\n' + (fallos ? '✗ ' + fallos + ' prueba(s) fallando\n' : '✓ Todas las pruebas pasaron\n'));
process.exit(fallos ? 1 : 0);
