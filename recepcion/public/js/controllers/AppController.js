/*
 * AppController — arma las piezas, decide qué vista se ve y ejecuta
 * las acciones globales: exportar, reiniciar, cambiar de layout.
 */
(function (raiz) {
  'use strict';

  // Mismo código para reiniciar y para cualquier cambio de ocupante de un lugar.
  var CLAVE_ADMIN = '1910';
  var CLAVE_SESION = 'invitados.admin.v2';
  var DURACION_SESION_MS = 10 * 60 * 60 * 1000;   // la sesión de administración dura 10 horas
  var CADA_MS = 1000;

  // En desarrollo el buscador (8090) y la API (8010) viven en puertos distintos.
  function baseApi() {
    if (raiz.RECEPCION_API) return raiz.RECEPCION_API;
    var l = raiz.location;
    return (l.port === '8090' ? l.protocol + '//' + l.hostname + ':8010' : '') + '/api/public/recepcion';
  }

  // La contraseña ya validada se recuerda 10 horas en este dispositivo; después hay que reingresarla.
  function leerClaveAdmin() {
    try {
      var d = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null');
      if (d && d.clave && d.hasta > Date.now()) return d.clave;
      localStorage.removeItem(CLAVE_SESION);
    } catch (e) {}
    return '';
  }

  function guardarClaveAdmin(clave) {
    try {
      localStorage.setItem(CLAVE_SESION, JSON.stringify({ clave: clave, hasta: Date.now() + DURACION_SESION_MS }));
    } catch (e) {}
  }

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

    this.sync = new raiz.SyncService({ base: baseApi(), http: function (u, o) { return raiz.fetch(u, o); } });
    this.claveAdmin = leerClaveAdmin();
    this.enLinea = true;
    this.temporizador = null;

    this.conectar();
    this.conectarSync();
  }

  // ---------- lista compartida (servidor) ----------

  AppController.prototype.conectarSync = function () {
    var self = this;
    var sync = this.sync;

    sync.leerLocal = function () {
      return { invitados: self.lista.invitados.map(function (g) { return g.aObjeto(); }) };
    };

    // Lo que cambió en otro dispositivo (o la administración) llega aquí.
    sync.alRecibir = function (estado) {
      self.lista.cargar(estado.invitados, estado.categorias, true);
      self.almacen.guardarEstado(self.lista, true);
      if (self.importarView.pantalla.hidden === false && !self.lista.vacia() && !self.cargando) {
        self.importarView.ocultar();
      }
    };

    sync.alEstado = function (ok) {
      self.enLinea = ok;
      document.getElementById('titulo').classList.toggle('sin-red', !ok);
    };

    // Cada cambio guardado se manda enseguida (junta los que vengan casi juntos).
    var envio = null;
    this.almacen.alGuardar = function () {
      clearTimeout(envio);
      envio = setTimeout(function () { sync.sincronizar(); }, 300);
    };

    this.importacion.subir = function (categorias, invitados) {
      self.claveAdmin = leerClaveAdmin();
      return sync.subirLista(self.claveAdmin, categorias, invitados);
    };

    this.importarView.alPedirClave = function () { self.pedirClaveAdmin(); };
    this.importarView.alVolver = function () { self.importarView.ocultar(); self.pintar(); };
  };

  AppController.prototype.iniciarSondeo = function () {
    var self = this;
    clearInterval(this.temporizador);
    this.temporizador = setInterval(function () {
      if (!document.hidden) self.sync.sincronizar();
    }, CADA_MS);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) self.sync.sincronizar();
    });
  };

  // Sin contraseña correcta no se ofrece cargar archivos. Se valida en el servidor.
  AppController.prototype.pedirClaveAdmin = function () {
    var self = this;
    return Swal.fire({
      title: 'Contraseña de administración',
      input: 'password',
      inputAttributes: { autocapitalize: 'off', autocomplete: 'off' },
      showCancelButton: true,
      confirmButtonText: 'Entrar',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      allowOutsideClick: function () { return !Swal.isLoading(); },
      preConfirm: function (clave) {
        if (!clave) { Swal.showValidationMessage('Escribe la contraseña'); return false; }
        return self.sync.validarClave(clave).then(function () { return clave; }).catch(function (err) {
          Swal.showValidationMessage(err.status === 401 ? 'Contraseña incorrecta'
            : err.status === 503 ? 'La carga de la lista no está habilitada en el servidor'
            : 'No se pudo comprobar. ¿Hay conexión?');
          return false;
        });
      }
    }).then(function (r) {
      if (!r.isConfirmed) return false;
      self.claveAdmin = r.value;
      guardarClaveAdmin(r.value);
      self.importarView.ponerAcceso(true, !self.lista.vacia());
      return true;
    });
  };

  AppController.prototype.abrirImportar = function () {
    this.claveAdmin = leerClaveAdmin();
    this.importarView.mostrar();
    this.importarView.ponerAcceso(Boolean(this.claveAdmin), !this.lista.vacia());
  };

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
    document.getElementById('btn-importar').addEventListener('click', function () { self.abrirImportar(); });
    document.getElementById('btn-reiniciar').addEventListener('click', function () { self.reiniciar(); });
  };

  // ---------- arranque ----------

  AppController.prototype.iniciar = function () {
    var self = this;
    var guardado = this.almacen.leerEstado();

    var avisoSinMemoria = function () {
      if (self.almacen.disponible()) return;
      Swal.fire({
        icon: 'warning',
        title: 'Sin memoria del navegador',
        text: 'Este navegador no permite guardar localmente. Si recargas, se pierde lo marcado. ' +
              'Exporta el CSV seguido.'
      });
    };

    // La lista vive en el servidor: todos los dispositivos ven la misma. Si no hay red,
    // se usa la última copia de este dispositivo y se vuelve a intentar cada 5 s.
    this.sync.cargarInicial().then(function (estado) {
      if (estado.invitados.length) {
        self.lista.cargar(estado.invitados, estado.categorias);
        self.almacen.guardarEstado(self.lista);
        self.importarView.ocultar();
        self.pintar();
      } else {
        self.abrirImportar();
      }
    }).catch(function () {
      self.sync.alEstado(false);
      if (guardado && guardado.invitados && guardado.invitados.length) {
        self.lista.cargar(guardado.invitados, guardado.categorias);
        self.importarView.ocultar();
        self.pintar();
      } else {
        self.abrirImportar();
      }
    }).then(function () {
      self.iniciarSondeo();
      avisoSinMemoria();
    });
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
