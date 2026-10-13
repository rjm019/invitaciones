/*
 * AppController — arma las piezas, decide qué vista se ve y ejecuta
 * las acciones globales: exportar, reiniciar, cambiar de layout.
 */
(function (raiz) {
  'use strict';

  // Mismo código para reiniciar y para cualquier cambio de ocupante de un lugar.
  var CLAVE_ADMIN = '1910';

  function AppController() {
    this.lista = new raiz.ListaInvitados();
    this.almacen = raiz.AlmacenService;
    this.vistaActual = 'lista';
    this.hostess = this.almacen.leerHostess();

    this.encabezado = new raiz.EncabezadoView();
    this.listaView = new raiz.ListaView(document.getElementById('vista-lista'));
    this.mesasView = new raiz.MesasView(document.getElementById('vista-mesas'));
    this.notasView = new raiz.NotasView();
    this.importarView = new raiz.ImportarView();

    var self = this;

    this.invitados = new raiz.InvitadosController(
      this.lista, this.listaView, this.almacen,
      { hostess: function () { return self.hostess; }, clave: CLAVE_ADMIN }
    );
    this.mesas = new raiz.MesasController(this.lista, this.mesasView);
    this.notas = new raiz.NotasController(this.lista, this.notasView, this.encabezado, this.almacen);
    this.importacion = new raiz.ImportacionController(this.lista, this.importarView, this.almacen);

    this.conectar();
  }

  AppController.prototype.conectar = function () {
    var self = this;

    this.lista.alCambiar(function () { self.pintar(); });

    this.encabezado.alBuscar = function (texto) { self.lista.ponerFiltro('texto', texto); };
    this.encabezado.alFiltrarEstado = function (id) { self.lista.ponerFiltro('estado', id); };
    this.encabezado.alFiltrarCategoria = function (id) { self.lista.ponerFiltro('categoria', id); };
    this.encabezado.alQuitarMesa = function () { self.lista.ponerFiltro('mesa', null); };
    // Agregar silla extra: desde el encabezado de cada mesa o desde la barra de mesa activa.
    this.encabezado.alAgregarLugar = function (mesa) { self.invitados.agregarLugar(mesa); };
    this.listaView.alAgregarLugar = function (mesa) { self.invitados.agregarLugar(mesa); };
    this.encabezado.alCambiarVista = function (v) { self.cambiarVista(v); };

    this.mesas.alVerMesa = function (mesa) {
      self.lista.ponerFiltro('mesa', mesa);
      self.cambiarVista('lista');
      window.scrollTo(0, 0);
    };

    this.notas.alIrAInvitado = function (id) {
      var g = self.lista.obtener(id);
      if (!g) return;
      self.lista.ponerFiltro('mesa', g.mesa);
      self.cambiarVista('lista');
      window.scrollTo(0, 0);
    };

    this.importacion.alCargar = function () { self.pintar(); };

    document.getElementById('btn-exportar').addEventListener('click', function () { self.exportar(); });
    document.getElementById('btn-resumen').addEventListener('click', function () { self.exportarResumen(); });
    document.getElementById('btn-importar').addEventListener('click', function () { self.importarView.mostrar(); });
    document.getElementById('btn-reiniciar').addEventListener('click', function () { self.reiniciar(); });
  };

  // ---------- arranque ----------

  AppController.prototype.iniciar = function () {
    var guardado = this.almacen.leerEstado();

    if (guardado && guardado.invitados && guardado.invitados.length) {
      this.lista.cargar(guardado.invitados, guardado.categorias);
      this.importarView.ocultar();
      this.pintar();
    } else {
      this.importarView.mostrar();
    }

    if (!this.almacen.disponible()) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin memoria del navegador',
        text: 'Este navegador no permite guardar localmente. Si recargas, se pierde lo marcado. ' +
              'Exporta el CSV seguido.'
      });
    }
  };

  // ---------- vistas ----------

  AppController.prototype.cambiarVista = function (v) {
    this.vistaActual = v;
    document.getElementById('vista-lista').hidden = (v !== 'lista');
    document.getElementById('vista-mesas').hidden = (v !== 'mesas');
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.classList.toggle('activa', t.dataset.vista === v);
    });
    this.pintar();
  };

  AppController.prototype.pintar = function () {
    if (this.lista.vacia()) return;
    this.encabezado.pintar(this.lista);
    if (this.vistaActual === 'lista') this.listaView.pintar(this.lista);
    else this.mesas.pintar();
    this.notas.actualizar();
  };

  // ---------- acciones ----------

  AppController.prototype.exportar = function () {
    raiz.ArchivoService.descargar(
      raiz.ArchivoService.csvInvitados(this.lista),
      'invitados-' + this.marcaDeTiempo() + '.csv'
    );
  };

  AppController.prototype.exportarResumen = function () {
    raiz.ArchivoService.descargar(
      raiz.ArchivoService.csvResumenMesas(this.lista),
      'resumen-mesas-' + this.marcaDeTiempo() + '.csv'
    );
  };

  AppController.prototype.marcaDeTiempo = function () {
    var d = new Date();
    var p = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  };

  // Reiniciar borra llegadas y horas; las notas se conservan.
  AppController.prototype.reiniciar = function () {
    var self = this;
    var llegados = this.lista.totalLlegados();

    if (!llegados) {
      Swal.fire({ icon: 'info', title: 'No hay nada que reiniciar',
                  text: 'Todavía no marcas a ningún invitado.' });
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: '¿Reiniciar la lista?',
      html: 'Se van a desmarcar los <b>' + llegados + '</b> invitados que ya registraste.<br>' +
            'Los comentarios se conservan. Esto no se puede deshacer.',
      input: 'password',
      inputPlaceholder: 'Contraseña',
      inputAttributes: { autocapitalize: 'off', autocomplete: 'off', inputmode: 'numeric' },
      showCancelButton: true,
      reverseButtons: true,
      focusConfirm: false,
      confirmButtonText: 'Sí, reiniciar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b3261e',
      cancelButtonColor: '#8a8177',
      inputValidator: function (v) {
        if (!v) return 'Escribe la contraseña';
        if (v !== CLAVE_ADMIN) return 'Contraseña incorrecta';
      }
    }).then(function (r) {
      if (!r.isConfirmed) return;
      self.lista.reiniciar();
      self.almacen.guardarEstado(self.lista);
      Swal.fire({ icon: 'success', title: 'Lista reiniciada', timer: 1500, showConfirmButton: false });
    });
  };

  raiz.AppController = AppController;

})(typeof globalThis !== 'undefined' ? globalThis : this);
