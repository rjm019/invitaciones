/* Correr: docker run --rm -v "$PWD":/app -w /app node:20-alpine node tests/sync.test.js */
'use strict';
var SyncService = require('../public/js/services/SyncService.js');

var fallos = 0;
function verifica(etiqueta, real, esperado) {
  var ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + etiqueta + (ok ? '' : '\n    esperado: ' + JSON.stringify(esperado) + '\n    obtenido: ' + JSON.stringify(real)));
}

function servidor() {
  var estado = { rev: 1, categorias: [{ id: 'a', etiqueta: 'A' }], invitados: [{ id: 1, llego: false }, { id: 2, llego: false }] };
  var llamadas = [];
  return {
    estado: estado, llamadas: llamadas,
    http: function (url, op) {
      llamadas.push(op.method + ' ' + url);
      if (op.method === 'GET' && /rev=(\d+)/.test(url) && Number(RegExp.$1) === estado.rev) {
        return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ rev: estado.rev, igual: true }); } });
      }
      if (op.method === 'POST') {
        JSON.parse(op.body).invitados.forEach(function (g) {
          var i = estado.invitados.findIndex(function (x) { return x.id === g.id; });
          if (i < 0) estado.invitados.push(g); else estado.invitados[i] = g;
        });
        estado.rev++;
      }
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(JSON.parse(JSON.stringify(estado))); } });
    }
  };
}

(async function () {
  var srv = servidor();
  var s = new SyncService({ base: '/r', http: srv.http });
  var local = [{ id: 1, llego: false }, { id: 2, llego: false }];
  var recibido = null;
  s.leerLocal = function () { return { invitados: local }; };
  s.alRecibir = function (e) { recibido = e; };

  await s.cargarInicial();
  verifica('revisión inicial', s.rev, 1);

  await s.sincronizar();
  verifica('sin cambios solo consulta', srv.llamadas, ['GET /r', 'GET /r?rev=1']);
  verifica('sin cambios no avisa', recibido, null);

  local[0] = { id: 1, llego: true };
  await s.sincronizar();
  // el servidor lista los campos en otro orden que la pantalla: no debe verse como cambio
  var desordenado = [{ llego: true, id: 1 }, { id: 2, llego: false }];
  verifica('el orden de los campos no cuenta', s.pendientes(desordenado).length, 0);

  verifica('manda solo el renglón cambiado', srv.llamadas[2], 'POST /r/cambios');
  verifica('el servidor lo guardó', srv.estado.invitados[0].llego, true);
  verifica('queda al día', s.pendientes(local).length, 0);

  // otro dispositivo marca el 2 mientras aquí se edita el 1
  srv.estado.invitados[1] = { id: 2, llego: true }; srv.estado.rev++;
  local[0] = { id: 1, llego: false };
  var fusion = s.fusionar(JSON.parse(JSON.stringify(srv.estado)), local);
  verifica('conserva lo editado aquí y toma lo de los demás',
    fusion.invitados, [{ id: 1, llego: false }, { id: 2, llego: true }]);

  // lugar nuevo creado aquí y todavía sin enviar
  local.push({ id: 3, libre: true });
  var f2 = s.fusionar(JSON.parse(JSON.stringify(srv.estado)), local);
  verifica('no pierde el lugar nuevo sin enviar', f2.invitados.map(function (g) { return g.id; }), [1, 2, 3]);

  // la administración reemplazó la lista: lo que ya no existe se va
  var f3 = s.fusionar({ rev: 9, categorias: [], invitados: [{ id: 7 }] }, [{ id: 1, llego: false }]);
  verifica('lo quitado por la administración desaparece', f3.invitados.map(function (g) { return g.id; }), [7]);

  // sin red
  var caido = new SyncService({ base: '/r', http: function () { return Promise.reject(new Error('x')); } });
  var estados = [];
  caido.leerLocal = function () { return { invitados: [] }; };
  caido.alEstado = function (ok) { estados.push(ok); };
  await caido.sincronizar();
  verifica('sin red avisa y no truena', estados, [false]);

  console.log(fallos ? '\n' + fallos + ' fallas' : '\nTodo bien');
  process.exit(fallos ? 1 : 0);
})();
