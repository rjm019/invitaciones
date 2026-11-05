/*
 * SyncService — comparte la lista entre todos los dispositivos con el servidor.
 * Cada dispositivo manda solo los renglones que cambió y cada pocos segundos pregunta si
 * alguien más cambió algo. Sin DOM: recibe `http` (fetch) y los callbacks desde fuera.
 *
 *   var s = new SyncService({ base: '/api/public/recepcion', http: fetch });
 *   s.alRecibir = function (estado) { ... };   // estado: { rev, categorias, invitados }
 */
(function (raiz, fabrica) {
  if (typeof module !== 'undefined' && module.exports) module.exports = fabrica();
  else raiz.SyncService = fabrica();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CAMPOS = ['id', 'mesa', 'nombre', 'categoria', 'llego', 'hora', 'comentario', 'nota_hora',
                'nota_por', 'marcado_por', 'sustituye_a', 'libre', 'extra', 'editado_por'];

  // Huella de un renglón con los campos en orden fijo: el servidor y la pantalla no los
  // listan en el mismo orden y comparar el JSON tal cual los vería siempre distintos.
  function huella(g) {
    return JSON.stringify(CAMPOS.map(function (c) {
      var v = g[c];
      return v === undefined || v === null ? (typeof g[c] === 'boolean' ? false : '') : v;
    }));
  }

  function SyncService(opciones) {
    this.base = opciones.base;
    this.http = opciones.http;
    this.rev = 0;
    this.conocidos = {};      // id → JSON del renglón tal como lo tiene el servidor
    this.enVuelo = false;
    this.alRecibir = null;
    this.alEstado = null;     // (enLinea: boolean)
    this.leerLocal = null;    // () → { categorias, invitados } con lo que hay en pantalla
  }

  SyncService.prototype.json = function (ruta, metodo, cuerpo, clave) {
    var cab = { Accept: 'application/json' };
    if (cuerpo !== undefined) cab['Content-Type'] = 'application/json';
    if (clave) cab['X-Recepcion-Key'] = clave;
    return this.http(this.base + ruta, {
      method: metodo, headers: cab, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (datos) {
        if (!r.ok) {
          var e = new Error(datos.message || 'Error ' + r.status);
          e.status = r.status;
          throw e;
        }
        return datos;
      });
    });
  };

  SyncService.prototype.recordar = function (estado) {
    this.rev = estado.rev;
    this.conocidos = {};
    estado.invitados.forEach(function (g) { this.conocidos[g.id] = huella(g); }, this);
  };

  // Renglones locales distintos de lo que sabe el servidor.
  SyncService.prototype.pendientes = function (invitados) {
    var conocidos = this.conocidos;
    return invitados.filter(function (g) { return conocidos[g.id] !== huella(g); });
  };

  /* Estado del servidor; lo que se editó localmente y aún no se manda se conserva. */
  SyncService.prototype.fusionar = function (estado, local) {
    var pend = {};
    this.pendientes(local).forEach(function (g) { pend[g.id] = g; });
    var vistos = {};
    var invitados = estado.invitados.map(function (g) {
      vistos[g.id] = true;
      return pend[g.id] || g;
    });
    // Lugares nuevos que este dispositivo creó y todavía no llegan al servidor.
    local.forEach(function (g) {
      if (!vistos[g.id] && this.conocidos[g.id] === undefined) invitados.push(g);
    }, this);
    return { rev: estado.rev, categorias: estado.categorias, invitados: invitados };
  };

  SyncService.prototype.adoptar = function (estado) {
    var local = this.leerLocal ? this.leerLocal().invitados : [];
    var fusion = this.fusionar(estado, local);
    this.recordar(estado);
    if (this.alRecibir) this.alRecibir(fusion);
    return fusion;
  };

  SyncService.prototype.avisarEstado = function (ok) {
    if (this.alEstado) this.alEstado(ok);
  };

  SyncService.prototype.cargarInicial = function () {
    var self = this;
    return this.json('', 'GET').then(function (estado) {
      self.avisarEstado(true);
      self.recordar(estado);
      return estado;
    });
  };

  /* Manda los renglones cambiados. Si no hay nada, solo consulta. */
  SyncService.prototype.sincronizar = function () {
    var self = this;
    if (this.enVuelo || !this.leerLocal) return Promise.resolve();
    var local = this.leerLocal().invitados;
    var cambios = this.pendientes(local);
    this.enVuelo = true;

    var peticion = cambios.length
      ? this.json('/cambios', 'POST', { invitados: cambios })
      : this.json('?rev=' + this.rev, 'GET');

    return peticion.then(function (estado) {
      self.avisarEstado(true);
      if (estado.igual) return;
      if (cambios.length || estado.rev !== self.rev) self.adoptar(estado);
    }).catch(function () {
      self.avisarEstado(false);
    }).then(function () { self.enVuelo = false; });
  };

  SyncService.prototype.validarClave = function (clave) {
    return this.json('/sesion', 'POST', {}, clave);
  };

  /* Reemplaza toda la lista (solo administración). */
  SyncService.prototype.subirLista = function (clave, categorias, invitados) {
    var self = this;
    return this.json('/lista', 'PUT', { categorias: categorias, invitados: invitados }, clave)
      .then(function (estado) { self.recordar(estado); return estado; });
  };

  SyncService.huella = huella;

  return SyncService;
});
