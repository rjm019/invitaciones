/*
 * ImportacionController — carga del layout: archivo → informe → confirmación.
 * Nada se guarda hasta que alguien ve los números y confirma.
 */
(function (raiz) {
  'use strict';

  function ImportacionController(lista, vista, almacen) {
    this.lista = lista;
    this.vista = vista;
    this.almacen = almacen;
    this.pendiente = null;
    this.alCargar = null;
    this.subir = null;   // (categorias, invitados) → Promise: la manda al servidor para todos

    var self = this;

    vista.alElegirArchivo = function (archivo) { self.procesar(archivo); };
    vista.alConfirmar = function () { self.confirmar(); };
    vista.alCancelar = function () { self.cancelar(); };
  }

  ImportacionController.prototype.procesar = function (archivo) {
    var self = this;

    raiz.ArchivoService.aRejilla(archivo).then(function (rejilla) {
      if (!rejilla || !rejilla.length) {
        self.vista.error('El archivo está vacío o no se pudo leer.');
        return;
      }

      var res = raiz.LayoutService.normaliza(rejilla);

      if (!res.invitados.length) {
        self.vista.error('No se encontró ningún invitado. ¿Es el layout de acomodo de mesas ' +
                         'o un CSV exportado por el sistema?');
        return;
      }

      self.pendiente = res;
      self.vista.pintarInforme(res);
    }).catch(function (err) {
      self.vista.error('No se pudo leer el archivo: ' + err.message);
    });
  };

  ImportacionController.prototype.confirmar = function () {
    if (!this.pendiente) return;
    var self = this;
    var res = this.pendiente;

    var terminar = function () {
      self.lista.cargar(res.invitados, res.categorias);
      self.almacen.guardarEstado(self.lista);
      self.pendiente = null;
      self.vista.ocultar();
      if (self.alCargar) self.alCargar();
    };

    if (!this.subir) { terminar(); return; }

    this.subir(res.categorias, res.invitados.map(function (g) {
      return typeof g.aObjeto === 'function' ? g.aObjeto() : g;
    })).then(terminar).catch(function (err) {
      self.vista.error(err.status === 401
        ? 'La contraseña ya no es válida. Vuelve a ingresarla.'
        : 'No se pudo subir la lista al servidor: ' + err.message);
    });
  };

  ImportacionController.prototype.cancelar = function () {
    this.pendiente = null;
    this.vista.informe.hidden = true;
    if (!this.lista.vacia()) this.vista.ocultar();
  };

  raiz.ImportacionController = ImportacionController;

})(typeof globalThis !== 'undefined' ? globalThis : this);
