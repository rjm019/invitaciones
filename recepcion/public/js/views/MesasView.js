/*
 * MesasView — tablero: qué mesas están completas y cómo va cada una.
 */
(function (raiz) {
  'use strict';

  function MesasView(contenedor) {
    this.el = contenedor;
    this.orden = 'numero';   // numero | avance
    this.filtro = 'todas';   // todas | completas | pendientes
    this.alVerMesa = null;
    this.alCambiarControles = null;
    this.conectar();
  }

  MesasView.prototype.conectar = function () {
    var self = this;
    this.el.addEventListener('click', function (e) {
      var ctrl = e.target.closest('[data-control]');
      if (ctrl) {
        self[ctrl.dataset.control] = ctrl.dataset.valor;
        if (self.alCambiarControles) self.alCambiarControles();
        return;
      }
      var tarjeta = e.target.closest('.tarjeta');
      if (tarjeta && self.alVerMesa) self.alVerMesa(Number(tarjeta.dataset.mesa));
    });
  };

  MesasView.prototype.pintar = function (lista) {
    var mesas = lista.mesas();
    var completas = mesas.filter(function (m) { return m.completa(); }).length;
    var total = lista.presentes().length;   // los lugares libres no son personas
    var llegados = lista.totalLlegados();
    var libres = lista.lugaresLibres();
    var extras = lista.lugaresExtra();

    var visibles = mesas.filter(function (m) {
      if (this.filtro === 'completas') return m.completa();
      if (this.filtro === 'pendientes') return !m.completa();
      return true;
    }, this);

    if (this.orden === 'avance') {
      visibles.sort(function (a, b) { return b.porcentaje - a.porcentaje || a.numero - b.numero; });
    }

    var html =
      '<div class="resumen-mesas">' +
        '<div class="grande">' + completas + ' de ' + mesas.length + ' mesas completas</div>' +
        '<div class="sutil">' + llegados + ' de ' + total + ' invitados · ' +
          (total ? Math.round(llegados / total * 100) : 0) + '% del evento</div>' +
        (libres || extras
          ? '<div class="sutil">' +
              (libres ? libres + (libres === 1 ? ' lugar disponible' : ' lugares disponibles') : '') +
              (libres && extras ? ' · ' : '') +
              (extras ? extras + (extras === 1 ? ' silla extra (+1)' : ' sillas extra (+1)') : '') +
            '</div>'
          : '') +
      '</div>' +
      '<div class="controles-mesas">' +
        this.botones('orden', this.orden, [
          { v: 'numero', t: 'Por mesa' }, { v: 'avance', t: 'Por avance' }
        ]) +
        this.botones('filtro', this.filtro, [
          { v: 'todas', t: 'Todas' }, { v: 'completas', t: 'Completas' }, { v: 'pendientes', t: 'Pendientes' }
        ]) +
      '</div>';

    if (!visibles.length) {
      this.el.innerHTML = html + '<p class="vacio">Sin mesas que mostrar</p>';
      return;
    }

    html += '<div class="tarjetas">' + visibles.map(function (m) {
      return '<article class="tarjeta ' + m.estado() + '" data-mesa="' + m.numero + '">' +
               '<div class="tarjeta-cabeza">' +
                 '<span class="tarjeta-mesa">Mesa ' + m.numero + (m.completa() ? ' ✓' : '') + '</span>' +
                 '<span class="tarjeta-pct">' + m.porcentaje + '%</span>' +
               '</div>' +
               '<div class="tarjeta-conteo">' + m.llegados + ' de ' + m.total + ' llegaron</div>' +
               '<div class="barra"><i style="width:' + m.porcentaje + '%"></i></div>' +
               '<div class="tarjeta-desglose">' + m.desglose() + '</div>' +
             '</article>';
    }).join('') + '</div>';

    this.el.innerHTML = html;
  };

  MesasView.prototype.botones = function (control, activo, opciones) {
    return opciones.map(function (o) {
      return '<button class="pill' + (o.v === activo ? ' on' : '') +
             '" data-control="' + control + '" data-valor="' + o.v + '">' + o.t + '</button>';
    }).join('');
  };

  raiz.MesasView = MesasView;

})(typeof globalThis !== 'undefined' ? globalThis : this);
