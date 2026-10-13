/*
 * MesasController — el tablero de mesas.
 */
(function (raiz) {
  'use strict';

  function MesasController(lista, vista) {
    this.lista = lista;
    this.vista = vista;
    this.alVerMesa = null;

    var self = this;

    vista.alVerMesa = function (mesa) {
      if (self.alVerMesa) self.alVerMesa(mesa);
    };

    vista.alCambiarControles = function () {
      self.vista.pintar(self.lista);
    };
  }

  MesasController.prototype.pintar = function () {
    this.vista.pintar(this.lista);
  };

  raiz.MesasController = MesasController;

})(typeof globalThis !== 'undefined' ? globalThis : this);
