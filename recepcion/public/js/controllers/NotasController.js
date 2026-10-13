/*
 * NotasController — la campanita: cuenta lo no leído y abre el panel.
 * "Leído" es por dispositivo: que una hostess lea no apaga el aviso de las demás (§2.4).
 */
(function (raiz) {
  'use strict';

  function NotasController(lista, vista, encabezado, almacen) {
    this.lista = lista;
    this.vista = vista;
    this.encabezado = encabezado;
    this.almacen = almacen;
    this.leidas = almacen.leerNotasLeidas();
    this.previas = 0;
    this.alIrAInvitado = null;

    var self = this;

    encabezado.alAbrirNotas = function () { self.abrir(); };
    vista.alCerrar = function () { self.cerrar(); };
    vista.alIrAInvitado = function (id) {
      self.cerrar();
      if (self.alIrAInvitado) self.alIrAInvitado(id);
    };
  }

  // No leída = nota que este dispositivo nunca vio, o que cambió desde la última vez.
  NotasController.prototype.sinLeer = function () {
    var leidas = this.leidas;
    return this.lista.notas().filter(function (n) {
      return leidas[n.id] !== n.texto;
    }).length;
  };

  NotasController.prototype.actualizar = function () {
    var n = this.sinLeer();

    if (n > this.previas) this.encabezado.rebotar();
    this.previas = n;
    this.encabezado.pintarCampana(n);

    if (this.vista.abierto()) this.vista.pintar(this.lista.notas(), this.leidas);
  };

  NotasController.prototype.abrir = function () {
    this.vista.pintar(this.lista.notas(), this.leidas);
    this.vista.abrir();
    this.marcarTodasLeidas();
  };

  NotasController.prototype.cerrar = function () {
    this.vista.cerrar();
    this.marcarTodasLeidas();
  };

  NotasController.prototype.marcarTodasLeidas = function () {
    var leidas = {};
    this.lista.notas().forEach(function (n) { leidas[n.id] = n.texto; });
    this.leidas = leidas;
    this.almacen.guardarNotasLeidas(leidas);
    this.previas = 0;
    this.encabezado.pintarCampana(0);
  };

  raiz.NotasController = NotasController;

})(typeof globalThis !== 'undefined' ? globalThis : this);
