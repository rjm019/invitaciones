/*
 * Invitado — una persona de la lista. Sin DOM, sin almacenamiento.
 */
(function (raiz, fabrica) {
  if (typeof module !== 'undefined' && module.exports) module.exports = fabrica();
  else raiz.Invitado = fabrica();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function quitaAcentos(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function horaActual(fecha) {
    var d = fecha || new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function Invitado(datos) {
    datos = datos || {};
    this.id = Number(datos.id);
    this.mesa = Number(datos.mesa) || 0;
    this.nombre = datos.nombre || '';
    this.categoria = datos.categoria || 'adulto';
    this.llego = Boolean(datos.llego);
    this.hora = datos.hora || '';
    this.comentario = datos.comentario || '';
    this.nota_hora = datos.nota_hora || '';
    this.nota_por = datos.nota_por || '';
    this.marcado_por = datos.marcado_por || '';
    // Un renglón es un LUGAR en una mesa; quien lo ocupa puede cambiar durante el evento.
    this.sustituye_a = datos.sustituye_a || '';   // de quién era el lugar originalmente
    this.libre = Boolean(datos.libre);            // el lugar existe pero nadie lo ocupa: está disponible
    this.extra = Boolean(datos.extra);            // silla agregada durante el evento, no venía en el layout
    this.editado_por = datos.editado_por || '';   // quién hizo el último cambio de ocupante
    this._busqueda = null;
  }

  function texto(v, limite) {
    return String(v == null ? '' : v).trim().slice(0, limite);
  }

  // Marcar es idempotente: conserva la primera hora y quién registró (§2.7 del plan).
  Invitado.prototype.marcar = function (hostess, fecha) {
    if (this.llego || this.libre) return false;
    this.llego = true;
    this.hora = horaActual(fecha);
    this.marcado_por = hostess || '';
    return true;
  };

  Invitado.prototype.desmarcar = function () {
    if (!this.llego) return false;
    this.llego = false;
    this.hora = '';
    this.marcado_por = '';
    return true;
  };

  // ---------- ocupación del lugar (todo esto pide el código de autorización) ----------

  // Pone a una persona nueva en este lugar. Si estaba ocupado es una sustitución:
  // se guarda de quién era el lugar y se borra lo del anterior, porque su llegada
  // y su nota ya no aplican. Si estaba libre, simplemente lo llena.
  Invitado.prototype.ocupar = function (datos, hostess) {
    datos = datos || {};
    var nombre = texto(datos.nombre, 120);
    if (!nombre) return false;

    this.recordarDueno();
    this.nombre = nombre;
    if (datos.categoria) this.categoria = datos.categoria;
    this.libre = false;
    this.editado_por = hostess || '';
    this.desmarcar();
    this.quitarNota();
    this._busqueda = null;
    return true;
  };

  // Alguien ya registrado se cambia a este lugar: se trae su llegada y su nota,
  // porque es la misma persona sentada en otra silla.
  Invitado.prototype.recibirDe = function (otro, hostess) {
    if (!otro || otro === this || otro.libre || !otro.nombre) return false;

    this.recordarDueno();
    this.nombre = otro.nombre;
    this.categoria = otro.categoria;
    this.llego = otro.llego;
    this.hora = otro.hora;
    this.marcado_por = otro.marcado_por;
    this.comentario = otro.comentario;
    this.nota_hora = otro.nota_hora;
    this.nota_por = otro.nota_por;
    this.libre = false;
    this.editado_por = hostess || '';
    this._busqueda = null;
    return true;
  };

  // El ocupante ya no llega, o se movió a otra mesa. El lugar sigue existiendo
  // y visible: la mesa lo tiene apartado y ahí se puede registrar a alguien más.
  Invitado.prototype.liberar = function (hostess) {
    if (this.libre) return false;
    this.recordarDueno();
    this.nombre = '';
    this.libre = true;
    this.editado_por = hostess || '';
    this.desmarcar();
    this.quitarNota();
    this._busqueda = null;
    return true;
  };

  // El rastro apunta siempre al invitado original del layout, aunque el lugar
  // cambie de manos varias veces en la noche.
  Invitado.prototype.recordarDueno = function () {
    if (this.nombre && !this.sustituye_a) this.sustituye_a = this.nombre;
  };

  Invitado.prototype.ponerNota = function (texto, hostess, fecha) {
    var limpio = String(texto == null ? '' : texto).trim().slice(0, 300);
    if (!limpio) return this.quitarNota();
    this.comentario = limpio;
    this.nota_hora = horaActual(fecha);
    this.nota_por = hostess || '';
    this._busqueda = null;
    return true;
  };

  Invitado.prototype.quitarNota = function () {
    if (!this.comentario) return false;
    this.comentario = '';
    this.nota_hora = '';
    this.nota_por = '';
    this._busqueda = null;
    return true;
  };

  Invitado.prototype.tieneNota = function () {
    return Boolean(this.comentario);
  };

  // Texto normalizado para buscar: nombre, mesa y nota. Incluye de quién era el
  // lugar, para poder llegar a él buscando al invitado original de la lista.
  Invitado.prototype.textoBusqueda = function () {
    if (this._busqueda === null) {
      this._busqueda = quitaAcentos(
        (this.libre ? 'LUGAR LIBRE DISPONIBLE' : this.nombre) +
        (this.extra ? ' +1 EXTRA' : '') +
        ' MESA ' + this.mesa + ' ' + this.comentario + ' ' + this.sustituye_a
      ).toUpperCase();
    }
    return this._busqueda;
  };

  Invitado.prototype.aObjeto = function () {
    return {
      id: this.id, mesa: this.mesa, nombre: this.nombre, categoria: this.categoria,
      llego: this.llego, hora: this.hora, comentario: this.comentario,
      nota_hora: this.nota_hora, nota_por: this.nota_por, marcado_por: this.marcado_por,
      sustituye_a: this.sustituye_a, libre: this.libre, extra: this.extra,
      editado_por: this.editado_por
    };
  };

  Invitado.horaActual = horaActual;
  Invitado.quitaAcentos = quitaAcentos;

  return Invitado;
});
