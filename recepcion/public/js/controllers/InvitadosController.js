/*
 * InvitadosController — marcar llegadas, editar notas y filtrar la lista.
 */
(function (raiz) {
  'use strict';

  // Mismo criterio que el buscador principal: sin acentos y sin mayúsculas,
  // para que "muñoz" encuentre a MUNOZ y al revés.
  function normaliza(s) {
    return raiz.Invitado.quitaAcentos(s).toUpperCase();
  }

  function InvitadosController(lista, vista, almacen, contexto) {
    this.lista = lista;
    this.vista = vista;
    this.almacen = almacen;
    this.contexto = contexto || {};   // { hostess: fn }

    var self = this;

    vista.alAlternar = function (id) { self.alternar(id); };
    vista.alEditarNota = function (id) { self.editarNota(id); };
    vista.alVerMesa = function (mesa) { self.verMesa(mesa); };
    vista.alCambiarLugar = function (id) { self.cambiarLugar(id); };
  }

  InvitadosController.prototype.hostess = function () {
    return this.contexto.hostess ? this.contexto.hostess() : '';
  };

  InvitadosController.prototype.clave = function () {
    return this.contexto.clave || '';
  };

  // Marcar es directo; desmarcar a alguien registrado por otra persona pide confirmación (§2.7).
  InvitadosController.prototype.alternar = function (id) {
    var g = this.lista.obtener(id);
    if (!g) return;

    if (!g.llego) {
      this.lista.marcar(id, this.hostess());
      this.almacen.guardarEstado(this.lista);
      return;
    }

    var yo = this.hostess();
    var ajeno = g.marcado_por && yo && g.marcado_por !== yo;
    var self = this;

    if (!ajeno) {
      this.lista.desmarcar(id);
      this.almacen.guardarEstado(this.lista);
      return;
    }

    Swal.fire({
      icon: 'question',
      title: '¿Quitar la llegada?',
      html: '<b>' + g.marcado_por + '</b> registró a ' + g.nombre +
            ' a las ' + g.hora + '.',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b3261e',
      cancelButtonColor: '#8a8177'
    }).then(function (r) {
      if (!r.isConfirmed) return;
      self.lista.desmarcar(id);
      self.almacen.guardarEstado(self.lista);
    });
  };

  InvitadosController.prototype.editarNota = function (id) {
    var g = this.lista.obtener(id);
    if (!g) return;

    var self = this;
    var actual = g.comentario || '';

    Swal.fire({
      title: g.nombre,
      html: '<div class="sutil" style="font-size:14px;margin-bottom:6px">Mesa ' + g.mesa + '</div>',
      input: 'textarea',
      inputValue: actual,
      inputPlaceholder: 'Ej. vegetariano, silla de ruedas, llega tarde…',
      inputAttributes: { maxlength: 300, rows: 3 },
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#8a6d3b',
      cancelButtonColor: '#8a8177',
      showDenyButton: Boolean(actual),
      denyButtonText: 'Borrar',
      denyButtonColor: '#b3261e'
    }).then(function (r) {
      if (r.isDenied) self.lista.quitarNota(id);
      else if (r.isConfirmed) self.lista.ponerNota(id, r.value || '', self.hostess());
      else return;
      self.almacen.guardarEstado(self.lista);
    });
  };

  // ---------- sustituciones ----------
  //
  // Un renglón es un LUGAR de la mesa. Aquí se decide quién lo ocupa: alguien
  // que llegó sin estar en la lista, alguien ya registrado que se cambia de mesa
  // (y deja su lugar disponible), o nadie. También se agregan sillas extra.
  // Todo el flujo pide el código de autorización.
  InvitadosController.prototype.cambiarLugar = function (id) {
    var g = this.lista.obtener(id);
    if (g) this.dialogoLugar(g, g.mesa);
  };

  // Silla extra en una mesa que recibió más gente de la planeada.
  InvitadosController.prototype.agregarLugar = function (mesa) {
    this.dialogoLugar(null, mesa);
  };

  // `lugar` es el asiento que se está tocando; si viene null se crea uno extra
  // en `mesa` al confirmar. Lo demás del flujo es idéntico en los dos casos.
  InvitadosController.prototype.dialogoLugar = function (lugar, mesa) {
    var g = lugar;
    var self = this;
    var lista = this.lista;
    var esc = raiz.ListaView.esc;

    // Solo quien falta por llegar; con buscador porque la lista es larga.
    var candidatos = lista.candidatosAMover(g ? g.id : null);
    var filasCandidatos = candidatos.map(function (o) {
      return '<label class="cand" data-busca="' + esc(normaliza(o.nombre + ' mesa ' + o.mesa)) + '">' +
               '<input type="radio" name="lg-origen" value="' + o.id + '"' +
                 ' data-nombre="' + esc(o.nombre) + '" data-mesa="' + o.mesa + '">' +
               '<span><b>' + esc(o.nombre) + '</b><i>Mesa ' + o.mesa + '</i></span>' +
             '</label>';
    }).join('');

    var catActual = g ? g.categoria : lista.categoriaPorDefecto();
    var categorias = lista.categorias.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === catActual ? ' selected' : '') + '>' +
             esc(c.etiqueta) + '</option>';
    }).join('');

    var quien = !g
      ? 'Silla <b>extra</b> en la <b>mesa ' + mesa + '</b> · queda marcada con <b>+1</b>'
      : (g.libre
          ? 'Lugar disponible en la <b>mesa ' + g.mesa + '</b>' +
            (g.sustituye_a ? ' · era de <b>' + esc(g.sustituye_a) + '</b>' : '')
          : 'Lugar de <b>' + esc(g.nombre) + '</b> · <b>mesa ' + g.mesa + '</b>');

    function opcion(valor, titulo, pie, marcada) {
      return '<label class="opcion"><input type="radio" name="lg-op" value="' + valor + '"' +
             (marcada ? ' checked' : '') + '>' +
             '<span><b>' + titulo + '</b><i>' + pie + '</i></span></label>';
    }

    var html =
      '<div class="form-lugar">' +
        '<p class="lugar-quien sutil">' + quien + '</p>' +

        opcion('nueva', 'Llega otra persona', 'Se registra en este lugar', true) +
        '<div class="campo" data-de="nueva">' +
          '<input type="text" id="lg-nombre" maxlength="120" autocomplete="off"' +
            ' placeholder="Nombre de quien llega">' +
          '<select id="lg-categoria">' + categorias + '</select>' +
        '</div>' +

        (candidatos.length
          ? opcion('mover', 'Se cambia alguien que aún no llega',
                   'Su lugar anterior queda disponible') +
            '<div class="campo" data-de="mover" hidden>' +
              '<input type="search" id="lg-buscar" autocomplete="off" autocapitalize="off"' +
                ' spellcheck="false" placeholder="Buscar por nombre o mesa…">' +
              '<div class="candidatos">' + filasCandidatos + '</div>' +
              '<p class="cand-pie" id="lg-pie"></p>' +
            '</div>'
          : '') +

        (!g
          ? opcion('libre', 'Dejarlo disponible por ahora', 'La silla queda lista para ocuparse')
          : (g.libre
              ? ''
              : opcion('libre', 'Ya no llega nadie',
                       'El lugar queda disponible dentro de la mesa'))) +

        '<label class="campo-clave">Código de autorización' +
          '<input type="password" id="lg-clave" inputmode="numeric" autocomplete="off"' +
            ' placeholder="····">' +
        '</label>' +
      '</div>';

    Swal.fire({
      title: !g ? 'Agregar lugar' : (g.libre ? 'Ocupar el lugar' : 'Sustituir invitado'),
      html: html,
      width: 460,
      focusConfirm: false,
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#8a6d3b',
      cancelButtonColor: '#8a8177',
      didOpen: function () {
        var campos = document.querySelectorAll('.form-lugar .campo');
        function refrescar() {
          var op = document.querySelector('.form-lugar input[name="lg-op"]:checked').value;
          Array.prototype.forEach.call(campos, function (c) {
            c.hidden = (c.dataset.de !== op);
          });
          if (op === 'mover') document.getElementById('lg-buscar').focus();
        }
        Array.prototype.forEach.call(
          document.querySelectorAll('.form-lugar input[name="lg-op"]'),
          function (r) { r.addEventListener('change', refrescar); }
        );

        if (candidatos.length) {
          var buscar = document.getElementById('lg-buscar');
          var pie = document.getElementById('lg-pie');
          var filas = document.querySelectorAll('.form-lugar .cand');
          var visibles = filas.length;

          // El pie dice a quién elegiste; mientras no elijas, cuántos faltan por llegar.
          function pintaPie() {
            var sel = document.querySelector('.form-lugar input[name="lg-origen"]:checked');
            if (sel) {
              pie.className = 'cand-pie elegido';
              pie.textContent = '✓ ' + sel.dataset.nombre + ' · mesa ' + sel.dataset.mesa;
            } else {
              pie.className = 'cand-pie';
              pie.textContent = visibles === filas.length
                ? filas.length + ' por llegar'
                : visibles + ' de ' + filas.length + ' por llegar';
            }
          }

          buscar.addEventListener('input', function () {
            var partes = normaliza(buscar.value).split(/\s+/).filter(Boolean);
            visibles = 0;
            Array.prototype.forEach.call(filas, function (f) {
              var ok = partes.every(function (p) { return f.dataset.busca.indexOf(p) !== -1; });
              f.hidden = !ok;
              if (ok) visibles++;
            });
            pintaPie();
          });

          Array.prototype.forEach.call(filas, function (f) {
            f.addEventListener('change', function () {
              // resaltar la elegida por JS: :has() no existe en navegadores viejos
              Array.prototype.forEach.call(filas, function (x) {
                x.classList.toggle('elegida', x.querySelector('input').checked);
              });
              pintaPie();
            });
          });
          pintaPie();
        }

        refrescar();
        document.getElementById('lg-nombre').focus();
      },
      preConfirm: function () {
        var op = document.querySelector('.form-lugar input[name="lg-op"]:checked').value;
        var datos = { op: op };

        if (op === 'nueva') {
          datos.nombre = document.getElementById('lg-nombre').value.trim();
          datos.categoria = document.getElementById('lg-categoria').value;
          if (!datos.nombre) {
            Swal.showValidationMessage('Escribe el nombre de quien llega');
            return false;
          }
        } else if (op === 'mover') {
          var sel = document.querySelector('.form-lugar input[name="lg-origen"]:checked');
          if (!sel) {
            Swal.showValidationMessage('Elige a quién mover a este lugar');
            return false;
          }
          datos.origen = Number(sel.value);
        }

        if (document.getElementById('lg-clave').value !== self.clave()) {
          Swal.showValidationMessage('Código de autorización incorrecto');
          return false;
        }
        return datos;
      }
    }).then(function (r) {
      if (!r.isConfirmed || !r.value) return;

      // Se leen antes de tocar el modelo: ocupar y mover cambian estos datos.
      var v = r.value;
      var esNuevo = !g;
      var eraLibre = esNuevo || g.libre;
      var mesaDestino = esNuevo ? mesa : g.mesa;
      var quienEra = eraLibre ? (g && g.sustituye_a) : g.nombre;
      var extra = '';

      // La silla extra se crea hasta aquí: si cancelan, la mesa no crece.
      if (esNuevo) {
        g = lista.agregarLugar(mesa, self.hostess());
        if (!g) return;
        extra = ' (silla extra +1)';
      }

      var id = g.id;
      var aviso;

      if (v.op === 'nueva') {
        lista.ocupar(id, { nombre: v.nombre, categoria: v.categoria }, self.hostess());
        aviso = v.nombre + ' queda en la mesa ' + mesaDestino + extra +
                (eraLibre ? '' : ', en lugar de ' + quienEra);
      } else if (v.op === 'mover') {
        var origen = lista.obtener(v.origen);
        var mesaAnterior = origen ? origen.mesa : null;
        var nombre = origen ? origen.nombre : '';
        if (!lista.mover(v.origen, id, self.hostess())) return;
        aviso = nombre + ' pasa a la mesa ' + mesaDestino + extra +
                (mesaAnterior === null ? '' : '; su lugar en la mesa ' + mesaAnterior +
                 ' queda disponible');
      } else if (esNuevo) {
        aviso = 'La mesa ' + mesaDestino + ' tiene un lugar disponible más (silla extra +1)';
      } else {
        lista.liberar(id, self.hostess());
        aviso = 'El lugar de ' + quienEra + ' queda disponible en la mesa ' + mesaDestino;
      }

      self.almacen.guardarEstado(lista);
      Swal.fire({ icon: 'success', title: 'Listo', text: aviso, timer: 2600, timerProgressBar: true });
    });
  };

  InvitadosController.prototype.verMesa = function (mesa) {
    this.lista.ponerFiltro('mesa', mesa);
    window.scrollTo(0, 0);
  };

  raiz.InvitadosController = InvitadosController;

})(typeof globalThis !== 'undefined' ? globalThis : this);
