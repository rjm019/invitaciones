/*
 * ListaView — la lista de invitados agrupada por mesa.
 */
(function (raiz) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function ListaView(contenedor) {
    this.el = contenedor;
    this.alAlternar = null;
    this.alEditarNota = null;
    this.alVerMesa = null;
    this.alCambiarLugar = null;
    this.alAgregarLugar = null;
    this.conectar();
  }

  ListaView.prototype.conectar = function () {
    var self = this;
    this.el.addEventListener('click', function (e) {
      // cada zona del renglón hace una sola cosa
      var mas = e.target.closest('.btn-agregar-lugar');
      if (mas) { if (self.alAgregarLugar) self.alAgregarLugar(Number(mas.dataset.mesa)); return; }

      var chip = e.target.closest('.chip-mesa');
      if (chip) { if (self.alVerMesa) self.alVerMesa(Number(chip.dataset.mesa)); return; }

      var lugar = e.target.closest('.btn-lugar');
      if (lugar) { if (self.alCambiarLugar) self.alCambiarLugar(Number(lugar.dataset.id)); return; }

      var nota = e.target.closest('.btn-nota');
      if (nota) { if (self.alEditarNota) self.alEditarNota(Number(nota.dataset.id)); return; }

      var li = e.target.closest('li[data-id]');
      if (!li) return;

      // Un lugar libre no se marca: se ocupa.
      if (li.classList.contains('libre')) {
        if (self.alCambiarLugar) self.alCambiarLugar(Number(li.dataset.id));
        return;
      }
      if (self.alAlternar) self.alAlternar(Number(li.dataset.id));
    });
  };

  ListaView.prototype.pintar = function (lista) {
    var items = lista.visibles();

    if (!items.length) {
      this.el.innerHTML = '<p class="vacio">Sin resultados</p>';
      return;
    }

    var html = '';
    var mesaActual = null;
    var agrupar = lista.filtros.mesa === null;

    if (!agrupar) html += '<ul class="invitados">';

    for (var i = 0; i < items.length; i++) {
      var g = items[i];
      if (agrupar && g.mesa !== mesaActual) {
        if (mesaActual !== null) html += '</ul>';
        html += this.encabezadoMesa(lista.mesaFiltrada(g.mesa));
        html += '<ul class="invitados">';
        mesaActual = g.mesa;
      }
      html += this.fila(g, lista);
    }

    this.el.innerHTML = html + '</ul>';
  };

  ListaView.prototype.encabezadoMesa = function (mesa) {
    return '<h2 class="mesa-titulo">Mesa ' + mesa.numero +
           ' · ' + mesa.llegados + '/' + mesa.total +
           ' · ' + mesa.porcentaje + '%' +
           (mesa.completa() ? ' <span class="palomita">✓ completa</span>' : '') +
           (mesa.libres ? ' <span class="hueco">' + mesa.libres +
                          (mesa.libres > 1 ? ' disponibles' : ' disponible') + '</span>' : '') +
           (mesa.extras ? ' <span class="extra">+' + mesa.extras + '</span>' : '') +
           '<button class="btn-agregar-lugar" data-mesa="' + mesa.numero + '"' +
             ' title="Agregar silla extra">+ Lugar</button>' +
           '</h2>';
  };

  ListaView.prototype.botonLugar = function (g) {
    return '<button class="btn-lugar" data-id="' + g.id + '"' +
           ' aria-label="Sustituir" title="Sustituir o mover">⇄</button>';
  };

  // Las sillas que no venían en el layout se marcan con +1 para poder
  // identificar de un vistazo todo lo que se agregó durante el evento.
  ListaView.prototype.marcaExtra = function (g) {
    return g.extra ? '<span class="extra" title="Silla extra">+1</span>' : '';
  };

  ListaView.prototype.fila = function (g, lista) {
    if (g.libre) return this.filaLibre(g);

    var cat = null;
    for (var i = 0; i < lista.categorias.length; i++) {
      if (lista.categorias[i].id === g.categoria) { cat = lista.categorias[i]; break; }
    }
    // la etiqueta solo aporta cuando no es la categoría mayoritaria (adultos)
    var etiqueta = (cat && g.categoria !== 'adulto')
      ? '<span class="etiqueta">' + esc(cat.etiqueta.toUpperCase()) + '</span>' : '';

    // de quién era el lugar, cuando ya no lo ocupa el invitado original
    var origen = (g.sustituye_a && g.sustituye_a !== g.nombre)
      ? '<span class="sustituye">⇄ En el lugar de ' + esc(g.sustituye_a) + '</span>' : '';

    var nota = g.comentario ? '<span class="nota">' + esc(g.comentario) + '</span>' : '';
    var marca = g.llego && g.hora
      ? '<span class="marca">Llegó ' + esc(g.hora) + (g.marcado_por ? ' · ' + esc(g.marcado_por) : '') + '</span>'
      : '';

    return '<li class="' + (g.llego ? 'llego' : '') + '" data-id="' + g.id + '">' +
             '<span class="casilla">✓</span>' +
             '<span class="nombre">' + esc(g.nombre) + this.marcaExtra(g) + etiqueta +
               origen + nota + marca + '</span>' +
             this.botonLugar(g) +
             '<button class="btn-nota ' + (g.comentario ? 'tiene' : '') + '" data-id="' + g.id + '"' +
               ' aria-label="Nota">' + (g.comentario ? '✎' : '+') + '</button>' +
             '<span class="chip-mesa" data-mesa="' + g.mesa + '">Mesa ' + g.mesa + ' ›</span>' +
           '</li>';
  };

  // El lugar sigue apartado en la mesa aunque nadie lo ocupe: se muestra para
  // poder registrar ahí a quien llegue en lugar del invitado original.
  ListaView.prototype.filaLibre = function (g) {
    var origen = g.sustituye_a
      ? '<span class="sustituye">Era de ' + esc(g.sustituye_a) + '</span>' : '';

    return '<li class="libre" data-id="' + g.id + '">' +
             '<span class="casilla casilla-libre">+</span>' +
             '<span class="nombre">Lugar disponible' + this.marcaExtra(g) +
               '<span class="etiqueta">TOCA PARA OCUPAR</span>' + origen +
             '</span>' +
             this.botonLugar(g) +
             '<span class="chip-mesa" data-mesa="' + g.mesa + '">Mesa ' + g.mesa + ' ›</span>' +
           '</li>';
  };

  ListaView.esc = esc;
  raiz.ListaView = ListaView;

})(typeof globalThis !== 'undefined' ? globalThis : this);
