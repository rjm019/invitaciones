/*
 * NotasView — el panel de la campanita.
 */
(function (raiz) {
  'use strict';

  var esc = raiz.ListaView ? raiz.ListaView.esc : function (s) { return s; };

  function NotasView() {
    this.panel = document.getElementById('panel-notas');
    this.cuerpo = document.getElementById('lista-notas');
    this.alIrAInvitado = null;
    this.alCerrar = null;
    this.conectar();
  }

  NotasView.prototype.conectar = function () {
    var self = this;

    document.getElementById('btn-cerrar-notas').addEventListener('click', function () {
      if (self.alCerrar) self.alCerrar();
    });

    // clic en el velo: cerrar
    this.panel.addEventListener('click', function (e) {
      if (e.target === self.panel && self.alCerrar) self.alCerrar();
    });

    this.cuerpo.addEventListener('click', function (e) {
      var item = e.target.closest('.nota-item');
      if (item && self.alIrAInvitado) self.alIrAInvitado(Number(item.dataset.id));
    });
  };

  NotasView.prototype.abrir = function () { this.panel.hidden = false; };
  NotasView.prototype.cerrar = function () { this.panel.hidden = true; };
  NotasView.prototype.abierto = function () { return !this.panel.hidden; };

  NotasView.prototype.pintar = function (notas, leidas) {
    if (!notas.length) {
      this.cuerpo.innerHTML = '<p class="vacio">Todavía no hay notas.<br>' +
        'Se agregan con el botón <b>+</b> de cada invitado.</p>';
      return;
    }

    this.cuerpo.innerHTML = notas.map(function (n) {
      var nueva = leidas[n.id] !== n.texto;
      return '<article class="nota-item ' + (nueva ? 'nueva' : '') + '" data-id="' + n.id + '">' +
               '<div class="nota-item-cabeza">' +
                 '<span class="nota-item-nombre">' + esc(n.nombre) + '</span>' +
                 '<span>' + (n.hora ? esc(n.hora) : '') + '</span>' +
               '</div>' +
               '<div class="nota-item-cabeza"><span>Mesa ' + n.mesa + '</span>' +
                 (n.por ? '<span>' + esc(n.por) + '</span>' : '') + '</div>' +
               '<div class="nota-item-texto">' + esc(n.texto) + '</div>' +
             '</article>';
    }).join('');
  };

  raiz.NotasView = NotasView;

})(typeof globalThis !== 'undefined' ? globalThis : this);
