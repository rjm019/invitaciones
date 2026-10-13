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
    this.lista.cargar(this.pendiente.invitados, this.pendiente.categorias);
    this.almacen.guardarEstado(this.lista);
    this.pendiente = null;
    this.vista.ocultar();
    if (this.alCargar) this.alCargar();
  };

  ImportacionController.prototype.cancelar = function () {
    this.pendiente = null;
    this.vista.informe.hidden = true;
    if (!this.lista.vacia()) this.vista.ocultar();
  };

  raiz.ImportacionController = ImportacionController;

})(typeof globalThis !== 'undefined' ? globalThis : this);
