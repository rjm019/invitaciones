/*
 * ListaInvitados — modelo agregado: la lista completa, sus categorías,
 * los filtros activos y las operaciones de negocio.
 * No conoce el DOM ni localStorage: avisa por suscripción y alguien más decide qué hacer.
 */
(function (raiz, fabrica) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = fabrica(require('./Invitado.js'), require('./Mesa.js'));
  } else {
    raiz.ListaInvitados = fabrica(raiz.Invitado, raiz.Mesa);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Invitado, Mesa) {
  'use strict';

  function ListaInvitados() {
    this.invitados = [];
    this.categorias = [];
    this.porId = {};
    this.oyentes = [];
    this.filtros = { texto: '', categoria: 'todos', estado: 'todos', mesa: null };
  }

  // ---------- carga ----------

  ListaInvitados.prototype.cargar = function (invitados, categorias) {
    this.invitados = (invitados || []).map(function (g) {
      return g instanceof Invitado ? g : new Invitado(g);
    });
    this.categorias = (categorias || []).slice();
    this.porId = {};
    this.invitados.forEach(function (g) { this.porId[g.id] = g; }, this);
    this.filtros.mesa = null;
    this.avisar();
  };

  ListaInvitados.prototype.vacia = function () {
    return this.invitados.length === 0;
  };

  // ---------- suscripción ----------

  ListaInvitados.prototype.alCambiar = function (fn) {
    this.oyentes.push(fn);
  };

  ListaInvitados.prototype.avisar = function () {
    this.oyentes.forEach(function (fn) { fn(this); }, this);
  };

  // ---------- operaciones ----------

  ListaInvitados.prototype.obtener = function (id) {
    return this.porId[id] || null;
  };

  ListaInvitados.prototype.marcar = function (id, hostess) {
    var g = this.obtener(id);
    if (!g) return false;
    var cambio = g.marcar(hostess);
    if (cambio) this.avisar();
    return cambio;
  };

  ListaInvitados.prototype.desmarcar = function (id) {
    var g = this.obtener(id);
    if (!g) return false;
    var cambio = g.desmarcar();
    if (cambio) this.avisar();
    return cambio;
  };

  ListaInvitados.prototype.alternar = function (id, hostess) {
    var g = this.obtener(id);
    if (!g) return false;
    return g.llego ? this.desmarcar(id) : this.marcar(id, hostess);
  };

  ListaInvitados.prototype.ponerNota = function (id, texto, hostess) {
    var g = this.obtener(id);
    if (!g) return false;
    g.ponerNota(texto, hostess);
    this.avisar();
    return true;
  };

  ListaInvitados.prototype.quitarNota = function (id) {
    var g = this.obtener(id);
    if (!g) return false;
    g.quitarNota();
    this.avisar();
    return true;
  };

  // ---------- ocupación de lugares (protegido con el código de autorización) ----------

  // Llega alguien que no estaba en la lista y toma este lugar.
  ListaInvitados.prototype.ocupar = function (id, datos, hostess) {
    var g = this.obtener(id);
    if (!g) return false;
    var cambio = g.ocupar(datos, hostess);
    if (cambio) this.avisar();
    return cambio;
  };

  // Alguien ya registrado se pasa a otro lugar; el que deja queda libre para
  // que ahí se pueda registrar a alguien más.
  ListaInvitados.prototype.mover = function (idOrigen, idDestino, hostess) {
    var origen = this.obtener(idOrigen);
    var destino = this.obtener(idDestino);
    if (!origen || !destino || origen === destino) return false;
    if (!destino.recibirDe(origen, hostess)) return false;
    origen.liberar(hostess);
    this.avisar();
    return true;
  };

  // Silla extra: un lugar que no venía en el layout, porque la mesa recibió más
  // gente de la planeada. Nace disponible y marcado como extra, para poder ver
  // de un vistazo cuánto creció cada mesa durante el evento.
  ListaInvitados.prototype.agregarLugar = function (mesa, hostess) {
    var numero = Number(mesa);
    if (isNaN(numero) || numero < 0) return null;

    var id = 1;
    this.invitados.forEach(function (g) { if (g.id >= id) id = g.id + 1; });

    var lugar = new Invitado({
      id: id, mesa: numero, categoria: this.categoriaPorDefecto(),
      libre: true, extra: true, editado_por: hostess || ''
    });

    this.invitados.push(lugar);
    this.porId[lugar.id] = lugar;
    this.avisar();
    return lugar;
  };

  ListaInvitados.prototype.categoriaPorDefecto = function () {
    return this.categorias.length ? this.categorias[0].id : 'adulto';
  };

  ListaInvitados.prototype.liberar = function (id, hostess) {
    var g = this.obtener(id);
    if (!g) return false;
    var cambio = g.liberar(hostess);
    if (cambio) this.avisar();
    return cambio;
  };

  // Los que sí son personas: un lugar libre no cuenta para nada del avance.
  ListaInvitados.prototype.presentes = function () {
    return this.invitados.filter(function (g) { return !g.libre; });
  };

  // Lugares que existen en las mesas pero nadie ocupa: están disponibles.
  ListaInvitados.prototype.lugaresLibres = function () {
    return this.invitados.filter(function (g) { return g.libre; }).length;
  };

  // Sillas agregadas durante el evento, ocupadas o no.
  ListaInvitados.prototype.lugaresExtra = function () {
    return this.invitados.filter(function (g) { return g.extra; }).length;
  };

  // Para elegir a quién mover: solo quien todavía no llega. A alguien ya
  // registrado en la puerta no se le cambia el lugar: ya está sentado.
  ListaInvitados.prototype.candidatosAMover = function (idDestino) {
    return this.presentes()
      .filter(function (g) { return g.id !== idDestino && !g.llego; })
      .sort(function (a, b) {
        return a.mesa - b.mesa || a.nombre.localeCompare(b.nombre);
      });
  };

  // Limpia llegadas y horas; las notas se conservan a propósito.
  ListaInvitados.prototype.reiniciar = function () {
    this.invitados.forEach(function (g) { g.desmarcar(); });
    this.avisar();
  };

  // ---------- filtros ----------

  ListaInvitados.prototype.ponerFiltro = function (campo, valor) {
    this.filtros[campo] = valor;
    if (campo === 'texto' && valor) this.filtros.mesa = null;
    if (campo === 'mesa' && valor !== null) this.filtros.texto = '';
    this.avisar();
  };

  ListaInvitados.prototype.limpiarFiltros = function () {
    this.filtros = { texto: '', categoria: 'todos', estado: 'todos', mesa: null };
    this.avisar();
  };

  ListaInvitados.prototype.enCategoria = function (g) {
    return this.filtros.categoria === 'todos' || g.categoria === this.filtros.categoria;
  };

  ListaInvitados.prototype.visibles = function () {
    var f = this.filtros;
    var termino = Invitado.quitaAcentos(f.texto.trim()).toUpperCase();
    var partes = termino ? termino.split(/\s+/) : [];

    return this.invitados.filter(function (g) {
      if (f.mesa !== null && g.mesa !== f.mesa) return false;
      if (!this.enCategoria(g)) return false;
      // un lugar libre no está ni llegado ni pendiente: es un hueco por ocupar
      if (f.estado !== 'todos' && g.libre) return false;
      if (f.estado === 'pendientes' && g.llego) return false;
      if (f.estado === 'llegados' && !g.llego) return false;
      if (!partes.length) return true;
      var texto = g.textoBusqueda();
      return partes.every(function (p) { return texto.indexOf(p) !== -1; });
    }, this)
      // La vista agrupa por mesa recorriendo en orden, así que mover a alguien
      // de mesa tiene que reordenar la lista o se parten los encabezados.
      .sort(function (a, b) { return a.mesa - b.mesa; });
  };

  // ---------- conteos ----------

  ListaInvitados.prototype.totalLlegados = function () {
    return this.invitados.filter(function (g) { return g.llego; }).length;
  };

  ListaInvitados.prototype.conteoCategoria = function (idCategoria) {
    var grupo = idCategoria === 'todos'
      ? this.presentes()
      : this.presentes().filter(function (g) { return g.categoria === idCategoria; });
    return {
      total: grupo.length,
      llegados: grupo.filter(function (g) { return g.llego; }).length
    };
  };

  // Solo las categorías con al menos una persona llegan a la barra de filtros (§2.5).
  ListaInvitados.prototype.categoriasVisibles = function () {
    return this.categorias.filter(function (c) {
      return this.conteoCategoria(c.id).total > 0;
    }, this);
  };

  // ---------- mesas ----------

  ListaInvitados.prototype.numerosDeMesa = function () {
    var vistas = {};
    this.invitados.forEach(function (g) { vistas[g.mesa] = true; });
    return Object.keys(vistas).map(Number).sort(function (a, b) { return a - b; });
  };

  ListaInvitados.prototype.mesa = function (numero) {
    var dentro = this.invitados.filter(function (g) { return g.mesa === numero; });
    return new Mesa(numero, dentro, this.categorias);
  };

  ListaInvitados.prototype.mesas = function () {
    return this.numerosDeMesa().map(function (n) { return this.mesa(n); }, this);
  };

  ListaInvitados.prototype.mesasCompletas = function () {
    return this.mesas().filter(function (m) { return m.completa(); }).length;
  };

  // Mesa respetando la categoría activa, para que el encabezado no mienta al filtrar.
  ListaInvitados.prototype.mesaFiltrada = function (numero) {
    var dentro = this.invitados.filter(function (g) {
      return g.mesa === numero && this.enCategoria(g);
    }, this);
    return new Mesa(numero, dentro, this.categorias);
  };

  // ---------- notas (campanita) ----------

  ListaInvitados.prototype.notas = function () {
    return this.invitados
      .filter(function (g) { return g.tieneNota(); })
      .map(function (g) {
        return {
          id: g.id, nombre: g.nombre, mesa: g.mesa,
          texto: g.comentario, hora: g.nota_hora, por: g.nota_por
        };
      })
      .sort(function (a, b) { return (b.hora || '').localeCompare(a.hora || ''); });
  };

  return ListaInvitados;
});
