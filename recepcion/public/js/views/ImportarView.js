/*
 * ImportarView — pantalla de carga del layout y el informe previo,
 * que es lo que permite confirmar con datos antes de guardar nada.
 */
(function (raiz) {
  'use strict';

  var esc = raiz.ListaView ? raiz.ListaView.esc : function (s) { return s; };

  function ImportarView() {
    this.pantalla = document.getElementById('pantalla-importar');
    this.app = document.getElementById('app');
    this.zona = document.getElementById('zona-suelta');
    this.entrada = document.getElementById('archivo');
    this.informe = document.getElementById('informe');
    this.alElegirArchivo = null;
    this.alConfirmar = null;
    this.alCancelar = null;
    this.conectar();
  }

  ImportarView.prototype.conectar = function () {
    var self = this;

    document.getElementById('btn-elegir').addEventListener('click', function () {
      self.entrada.click();
    });

    this.entrada.addEventListener('change', function (e) {
      if (e.target.files[0] && self.alElegirArchivo) self.alElegirArchivo(e.target.files[0]);
      e.target.value = '';
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      self.zona.addEventListener(ev, function (e) {
        e.preventDefault();
        self.zona.classList.add('encima');
      });
    });

    ['dragleave', 'drop'].forEach(function (ev) {
      self.zona.addEventListener(ev, function (e) {
        e.preventDefault();
        self.zona.classList.remove('encima');
      });
    });

    this.zona.addEventListener('drop', function (e) {
      var f = e.dataTransfer.files[0];
      if (f && self.alElegirArchivo) self.alElegirArchivo(f);
    });

    this.informe.addEventListener('click', function (e) {
      if (e.target.id === 'btn-confirmar' && self.alConfirmar) self.alConfirmar();
      if (e.target.id === 'btn-cancelar' && self.alCancelar) self.alCancelar();
    });
  };

  ImportarView.prototype.mostrar = function () {
    this.pantalla.hidden = false;
    this.app.hidden = true;
  };

  ImportarView.prototype.ocultar = function () {
    this.pantalla.hidden = true;
    this.app.hidden = false;
    this.informe.hidden = true;
  };

  ImportarView.prototype.error = function (mensaje) {
    this.informe.hidden = false;
    this.informe.innerHTML = '<div class="aviso alerta">' + esc(mensaje) + '</div>';
  };

  ImportarView.prototype.pintarInforme = function (res) {
    var inf = res.informe;
    var cats = res.categorias;

    var html = '<h3>' + esc(inf.formato) + '</h3>';

    var difs = inf.diferencias || [];
    html += difs.length
      ? '<div class="aviso alerta"><b>Revisa antes de continuar.</b> ' + difs.length +
        ' diferencia(s) contra los totales del archivo:<br>' +
        difs.map(function (d) { return '· ' + esc(d.ambito) + ': ' + esc(d.detalle); }).join('<br>') +
        '</div>'
      : '<div class="aviso ok">✓ Todo cuadra contra los totales del archivo.</div>';

    // resumen por categoría, comparado contra lo que declara el layout
    html += '<table><tr><th>Categoría</th><th class="num">Leído</th><th class="num">Layout</th></tr>';
    cats.forEach(function (c) {
      var leido = inf.porCategoria[c.id] || 0;
      var dec = inf.totalesDeclarados && inf.totalesDeclarados[c.id];
      html += '<tr><td>' + esc(c.etiqueta) + '</td><td class="num">' + leido + '</td>' +
              '<td class="num">' + (dec === undefined ? '—' : dec) + '</td></tr>';
    });
    html += '<tr><td><b>Total</b></td><td class="num"><b>' + inf.total + '</b></td>' +
            '<td class="num">—</td></tr></table>';

    if (inf.mesas && inf.mesas.length) {
      html += '<h3>Mesas (' + inf.mesas.length + ')</h3><div class="tabla-scroll"><table>' +
              '<tr><th>Mesa</th><th class="num">Personas</th><th>Detalle</th></tr>';
      inf.mesas.forEach(function (m) {
        html += '<tr><td>' + m.mesa + '</td><td class="num">' + m.total + '</td><td>' +
                (m.cuadra ? '<span class="sutil">' + (m.detalle ? esc(m.detalle) : 'cuadra') + '</span>'
                          : '<b>' + esc(m.detalle) + '</b>') + '</td></tr>';
      });
      html += '</table></div>';
    }

    if (inf.mesasVacias && inf.mesasVacias.length) {
      html += '<p class="sutil">Mesas sin invitados: ' + inf.mesasVacias.join(', ') + '</p>';
    }

    if (inf.descartes && inf.descartes.length) {
      html += '<h3>Renglones descartados (' + inf.descartes.length + ')</h3><table>';
      inf.descartes.forEach(function (d) {
        html += '<tr><td>Mesa ' + d.mesa + '</td><td>' + esc(d.texto) + '</td>' +
                '<td class="sutil">' + esc(d.motivo) + '</td></tr>';
      });
      html += '</table>';
    }

    html += '<div class="controles-mesas" style="margin-top:14px">' +
            '<button class="boton primario" id="btn-confirmar">Cargar ' + inf.total + ' invitados</button>' +
            '<button class="boton" id="btn-cancelar">Cancelar</button></div>';

    this.informe.hidden = false;
    this.informe.innerHTML = html;
  };

  raiz.ImportarView = ImportarView;

})(typeof globalThis !== 'undefined' ? globalThis : this);
