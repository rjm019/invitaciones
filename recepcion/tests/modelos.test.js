/*
 * Pruebas de los modelos (sin DOM).
 * Correr: docker run --rm -v "$PWD":/app -w /app node:20-alpine node tests/modelos.test.js
 */
'use strict';

var fs = require('fs');
var LayoutService = require('../public/js/services/LayoutService.js');
var CsvService = require('../public/js/services/CsvService.js');
var ListaInvitados = require('../public/js/models/ListaInvitados.js');

var fallos = 0;
function verifica(etiqueta, real, esperado) {
  var ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + etiqueta +
    (ok ? '  → ' + JSON.stringify(real)
        : '\n         esperado: ' + JSON.stringify(esperado) +
          '\n         obtenido: ' + JSON.stringify(real)));
}

var res = LayoutService.normaliza(CsvService.parsea(
  fs.readFileSync('ejemplos/layout-ejemplo.csv', 'utf8')));

var lista = new ListaInvitados();
lista.cargar(res.invitados, res.categorias);

console.log('\n=== Carga y conteos ===\n');
verifica('total cargado', lista.invitados.length, 220);
verifica('llegados al inicio', lista.totalLlegados(), 0);
verifica('mesas', lista.numerosDeMesa().length, 22);
verifica('categorias visibles omiten las vacias',
  lista.categoriasVisibles().map(function (c) { return c.id; }), ['adulto', 'nino']);
verifica('adolescentes existe pero con 0', lista.conteoCategoria('adolescente'), { total: 0, llegados: 0 });

console.log('\n=== Marcar / desmarcar ===\n');
lista.marcar(1, 'Ana');
var g1 = lista.obtener(1);
verifica('marca y sella hostess', [g1.llego, g1.marcado_por, /^\d\d:\d\d$/.test(g1.hora)], [true, 'Ana', true]);

var horaPrimera = g1.hora;
lista.marcar(1, 'Beto');
verifica('marcar de nuevo es idempotente', [g1.marcado_por, g1.hora], ['Ana', horaPrimera]);

lista.desmarcar(1);
verifica('desmarcar limpia hora y autor', [g1.llego, g1.hora, g1.marcado_por], [false, '', '']);

console.log('\n=== Mesa completa y porcentajes ===\n');
var mesa1 = lista.invitados.filter(function (g) { return g.mesa === 1; });
mesa1.forEach(function (g) { lista.marcar(g.id, 'Ana'); });

var m1 = lista.mesa(1);
verifica('mesa 1 completa', m1.completa(), true);
verifica('porcentaje mesa 1', m1.porcentaje, 100);
verifica('estado mesa 1', m1.estado(), 'completa');
verifica('mesas completas', lista.mesasCompletas(), 1);

var m2 = lista.mesa(2);
verifica('mesa 2 sin llegar', m2.estado(), 'sin-llegar');
verifica('desglose mesa 2', m2.desglose(), '8 adultos · 2 niños');

var deMesa2 = lista.invitados.filter(function (g) { return g.mesa === 2; });
lista.marcar(deMesa2[0].id, 'Ana');
lista.marcar(deMesa2[1].id, 'Ana');
verifica('mesa 2 en curso', lista.mesa(2).estado(), 'en-curso');
verifica('porcentaje mesa 2 (2 de 10)', lista.mesa(2).porcentaje, 20);

console.log('\n=== Notas ===\n');
lista.ponerNota(15, 'Vegetariano', 'Ana');
var n = lista.notas();
verifica('una nota registrada', n.length, 1);
verifica('nota trae nombre, mesa y autor', [n[0].mesa, n[0].por, n[0].texto], [2, 'Ana', 'Vegetariano']);
lista.quitarNota(15);
verifica('nota borrada', lista.notas().length, 0);

console.log('\n=== Filtros ===\n');
lista.limpiarFiltros();
lista.ponerFiltro('texto', 'zuniga');
verifica('busca sin acentos', lista.visibles().map(function (g) { return g.nombre; }), ['BLANCA ZUÑIGA']);

lista.ponerFiltro('texto', 'montes 15');
verifica('busca varias palabras', lista.visibles().every(function (g) {
  return g.mesa === 15 && /MONTES/.test(g.nombre);
}), true);

lista.ponerFiltro('texto', '');
lista.ponerFiltro('categoria', 'nino');
verifica('filtra ninos', lista.visibles().length, 30);
verifica('mesa filtrada respeta categoria', lista.mesaFiltrada(4).total, 3);

lista.ponerFiltro('categoria', 'todos');
lista.ponerFiltro('mesa', 5);
verifica('filtra por mesa', lista.visibles().length, 11);

lista.ponerFiltro('texto', 'ariadna');
verifica('escribir suelta la mesa fijada', lista.filtros.mesa, null);

console.log('\n=== Reinicio ===\n');
lista.limpiarFiltros();
lista.ponerNota(3, 'Silla de ruedas', 'Ana');
lista.reiniciar();
verifica('reinicio deja llegadas en cero', lista.totalLlegados(), 0);
verifica('reinicio conserva las notas', lista.notas().length, 1);

// ---------------------------------------------------------------------------
// Sustituciones: el renglón es un LUGAR de la mesa y quien lo ocupa puede cambiar.
// ---------------------------------------------------------------------------
console.log('\n=== Sustitución por alguien nuevo ===\n');

var s = new ListaInvitados();
s.cargar(res.invitados.map(function (g) { return Object.assign({}, g); }), res.categorias);
var personas = s.invitados.length;

// El de la mesa 1 ya no llega y en su lugar llega alguien que no estaba en la lista.
var lugar = s.invitados[0];
var original = lugar.nombre;
s.marcar(lugar.id, 'Ana');
s.ponerNota(lugar.id, 'vegetariano', 'Ana');
s.ocupar(lugar.id, { nombre: 'Ana Ruiz', categoria: 'adulto' }, 'Sofía');

verifica('el lugar cambia de ocupante', lugar.nombre, 'Ana Ruiz');
verifica('queda el rastro del invitado original', lugar.sustituye_a, original);
verifica('la llegada del anterior no se hereda', [lugar.llego, lugar.hora, lugar.marcado_por], [false, '', '']);
verifica('la nota del anterior tampoco', lugar.comentario, '');
verifica('queda quién autorizó el cambio', lugar.editado_por, 'Sofía');
verifica('el total de personas no cambia', s.presentes().length, personas);

// Sustituir dos veces sigue apuntando al invitado original de la lista
s.ocupar(lugar.id, { nombre: 'Luis Mora', categoria: 'adulto' }, 'Sofía');
verifica('el rastro sigue siendo el original', [lugar.nombre, lugar.sustituye_a], ['Luis Mora', original]);

console.log('\n=== Cambio de mesa: el lugar anterior queda libre ===\n');

// Alguien de la mesa 3 se pasa al lugar de alguien de la mesa 9 que ya no llega.
var origen = s.invitados.filter(function (g) { return g.mesa === 3; })[0];
var destino = s.invitados.filter(function (g) { return g.mesa === 9; })[0];
var nombreQueSeMueve = origen.nombre;
var duenoDelDestino = destino.nombre;
var totalMesa3 = s.mesa(3).total;

s.marcar(origen.id, 'Ana');
s.ponerNota(origen.id, 'llega tarde', 'Ana');
s.mover(origen.id, destino.id, 'Sofía');

verifica('la persona ocupa el lugar de destino', destino.nombre, nombreQueSeMueve);
verifica('se lleva su llegada y su nota', [destino.llego, destino.marcado_por, destino.comentario],
  [true, 'Ana', 'llega tarde']);
verifica('el destino recuerda de quién era', destino.sustituye_a, duenoDelDestino);
verifica('el lugar que dejó queda libre', [origen.libre, origen.nombre], [true, '']);
verifica('y recuerda de quién era', origen.sustituye_a, nombreQueSeMueve);
verifica('el lugar libre no arrastra llegada ni nota', [origen.llego, origen.comentario], [false, '']);
verifica('un lugar libre no cuenta como persona', s.presentes().length, personas - 1);
verifica('pero sigue existiendo en la lista', s.invitados.length, personas);
verifica('se cuenta como hueco', s.lugaresLibres(), 1);

var mesa3 = s.mesa(3);
verifica('la mesa lo reporta como libre, no como pendiente',
  [mesa3.total, mesa3.libres], [totalMesa3 - 1, 1]);
verifica('un lugar libre no se puede marcar', s.marcar(origen.id, 'Ana'), false);

console.log('\n=== Ocupar un lugar libre ===\n');

s.ocupar(origen.id, { nombre: 'Nuevo Invitado', categoria: 'nino' }, 'Sofía');
verifica('el hueco se llena', [origen.libre, origen.nombre, origen.categoria],
  [false, 'Nuevo Invitado', 'nino']);
verifica('conserva de quién era el lugar', origen.sustituye_a, nombreQueSeMueve);
verifica('vuelve a contar como persona', s.presentes().length, personas);
verifica('sin huecos pendientes', s.lugaresLibres(), 0);

console.log('\n=== Dar de baja sin sustituto ===\n');

var baja = s.invitados.filter(function (g) { return g.mesa === 11; })[0];
var nombreBaja = baja.nombre;
s.liberar(baja.id, 'Sofía');
verifica('el lugar queda libre y apartado', [baja.libre, baja.sustituye_a], [true, nombreBaja]);
verifica('deja de contar', s.presentes().length, personas - 1);

console.log('\n=== Candidatos a mover: solo los que faltan por llegar ===\n');

var todos = s.presentes().length;
var yaLlegaron = s.presentes().filter(function (g) { return g.llego; }).length;
var refLugar = s.invitados.filter(function (g) { return !g.libre && !g.llego; })[0];

verifica('hay gente ya marcada para la prueba', yaLlegaron > 0, true);
verifica('no ofrece a los que ya llegaron',
  s.candidatosAMover(refLugar.id).some(function (g) { return g.llego; }), false);
verifica('tampoco al lugar que se está ocupando',
  s.candidatosAMover(refLugar.id).some(function (g) { return g.id === refLugar.id; }), false);
verifica('ni a los lugares disponibles',
  s.candidatosAMover(refLugar.id).some(function (g) { return g.libre; }), false);
verifica('la lista se acorta a los pendientes',
  s.candidatosAMover(refLugar.id).length, todos - yaLlegaron - 1);
verifica('ordenados por mesa', s.candidatosAMover(refLugar.id).map(function (g) { return g.mesa; })
  .every(function (m, i, a) { return i === 0 || a[i - 1] <= m; }), true);

console.log('\n=== Sillas extra ===\n');

var antesDeExtras = s.invitados.length;
var lugaresMesa5 = s.mesa(5).lugares;

var silla = s.agregarLugar(5, 'Sofía');
verifica('nace disponible y marcada como extra', [silla.libre, silla.extra, silla.mesa],
  [true, true, 5]);
verifica('no es una persona todavía', s.mesa(5).total, lugaresMesa5);
verifica('pero la mesa tiene un lugar más', s.mesa(5).lugares, lugaresMesa5 + 1);
verifica('se contabiliza como disponible', s.mesa(5).libres, 1);
verifica('y como extra', s.mesa(5).extras, 1);
verifica('id nuevo sin chocar', s.obtener(silla.id) === silla, true);

s.ocupar(silla.id, { nombre: 'Colado Feliz', categoria: 'adulto' }, 'Sofía');
verifica('al ocuparla ya cuenta como persona', s.mesa(5).total, lugaresMesa5 + 1);
verifica('deja de estar disponible', s.mesa(5).libres, 0);
verifica('sigue marcada como extra', [s.obtener(silla.id).extra, s.mesa(5).extras], [true, 1]);
verifica('la marca +1 se puede buscar',
  (s.ponerFiltro('texto', 'extra'), s.visibles().some(function (g) { return g.id === silla.id; })), true);
s.limpiarFiltros();

// Dos extras seguidas en la misma mesa
s.agregarLugar(5, 'Sofía');
verifica('se pueden agregar varias', s.mesa(5).extras, 2);
verifica('el desglose las reporta', /1 disponible · 2 extra$/.test(s.mesa(5).desglose()), true);
verifica('renglones nuevos en la lista', s.invitados.length, antesDeExtras + 2);
verifica('mesa inexistente no crea nada', s.agregarLugar(-3, 'Sofía'), null);

// La lista se recorre agrupada por mesa: mover gente no debe romper el orden
console.log('\n=== Orden de la lista tras los movimientos ===\n');
s.limpiarFiltros();
var mesas = s.visibles().map(function (g) { return g.mesa; });
var ordenado = mesas.slice().sort(function (a, b) { return a - b; });
verifica('los renglones siguen ordenados por mesa', mesas.join(',') === ordenado.join(','), true);
verifica('se puede buscar por el invitado original',
  (s.ponerFiltro('texto', nombreQueSeMueve), s.visibles().length) > 0, true);
s.limpiarFiltros();

console.log('\n' + (fallos ? '✗ ' + fallos + ' prueba(s) fallando\n' : '✓ Todas las pruebas pasaron\n'));
process.exit(fallos ? 1 : 0);
