/*
 * EncabezadoView — contadores, buscador, filtros y campanita.
 * Pinta y avisa; no decide reglas ni toca el modelo.
 */
(function (raiz) {
  'use strict';

  function EncabezadoView() {
    this.contador = document.getElementById('contador');
    this.barra = document.getElementById('barra-avance');
    this.buscador = document.querySelector('.buscador');
    this.entrada = document.getElementById('q');
    this.pillsEstado = document.getElementById('pills-estado');
    this.pillsCategoria = document.getElementById('pills-categoria');
    this.mesaActiva = document.getElementById('mesa-activa');
    this.mesaActivaTxt = document.getElementById('mesa-activa-txt');
    this.masLugar = document.getElementById('btn-mas-lugar');
    this.campana = document.getElementById('btn-campana');
    this.globo = document.getElementById('globo');
    this.tabs = document.querySelectorAll('.tab');

    this.ESTADOS = [
      { id: 'todos', etiqueta: 'Todos' },
      { id: 'pendientes', etiqueta: 'Faltan' },
      { id: 'llegados', etiqueta: 'Llegaron' }
    ];

    this.alBuscar = null;
    this.alFiltrarEstado = null;
    this.alFiltrarCategoria = null;
    this.alQuitarMesa = null;
    this.alAgregarLugar = null;
    this.alAbrirNotas = null;
    this.alCambiarVista = null;
    this.mesaVisible = null;

    this.conectar();
  }

  EncabezadoView.prototype.conectar = function () {
    var self = this;

    // Agregar una silla extra a la mesa que se está viendo.
    this.masLugar.addEventListener('click', function () {
      if (self.alAgregarLugar && self.mesaVisible !== null) self.alAgregarLugar(self.mesaVisible);
    });

    this.entrada.addEventListener('input', function (e) {
      self.buscador.classList.toggle('con-texto', Boolean(e.target.value));
      if (self.alBuscar) self.alBuscar(e.target.value);
    });

    document.getElementById('btn-limpiar').addEventListener('click', function () {
      self.entrada.value = '';
      self.buscador.classList.remove('con-texto');
      self.entrada.focus();
      if (self.alBuscar) self.alBuscar('');
    });

    this.pillsEstado.addEventListener('click', function (e) {
      var pill = e.target.closest('.pill');
      if (pill && self.alFiltrarEstado) self.alFiltrarEstado(pill.dataset.id);
    });

    this.pillsCategoria.addEventListener('click', function (e) {
      var pill = e.target.closest('.pill');
      if (pill && self.alFiltrarCategoria) self.alFiltrarCategoria(pill.dataset.id);
    });

    document.getElementById('btn-ver-todas').addEventListener('click', function () {
      if (self.alQuitarMesa) self.alQuitarMesa();
    });

    this.campana.addEventListener('click', function () {
      if (self.alAbrirNotas) self.alAbrirNotas();
    });

    Array.prototype.forEach.call(this.tabs, function (tab) {
      tab.addEventListener('click', function () {
        Array.prototype.forEach.call(self.tabs, function (t) { t.classList.remove('activa'); });
        tab.classList.add('activa');
        if (self.alCambiarVista) self.alCambiarVista(tab.dataset.vista);
      });
    });
  };

  EncabezadoView.prototype.pintar = function (lista) {
    var total = lista.presentes().length;   // los lugares libres no son personas
    var llegados = lista.totalLlegados();

    this.contador.textContent = llegados + ' de ' + total;
    this.barra.style.width = (total ? llegados / total * 100 : 0) + '%';

    this.pintarPills(this.pillsEstado, this.ESTADOS.map(function (e) {
      return { id: e.id, etiqueta: e.etiqueta, conteo: '' };
    }), lista.filtros.estado, '');

    var cats = [{ id: 'todos', etiqueta: 'Todos' }].concat(lista.categoriasVisibles());
    this.pintarPills(this.pillsCategoria, cats.map(function (c) {
      var d = lista.conteoCategoria(c.id);
      return { id: c.id, etiqueta: c.etiqueta, conteo: d.llegados + '/' + d.total };
    }), lista.filtros.categoria, 'cat');

    this.mesaVisible = lista.filtros.mesa;

    if (lista.filtros.mesa === null) {
      this.mesaActiva.hidden = true;
    } else {
      var m = lista.mesa(lista.filtros.mesa);
      var ninos = m.porCategoria.nino ? m.porCategoria.nino.total : 0;
      this.mesaActivaTxt.textContent =
        'Mesa ' + m.numero + ' · ' + m.llegados + '/' + m.total + ' llegaron · ' + m.porcentaje + '%' +
        (ninos ? ' · ' + ninos + (ninos === 1 ? ' niño' : ' niños') : '') +
        (m.libres ? ' · ' + m.libres + (m.libres === 1 ? ' disponible' : ' disponibles') : '') +
        (m.extras ? ' · +' + m.extras + ' extra' : '');
      this.mesaActiva.hidden = false;
    }

    if (this.entrada.value !== lista.filtros.texto) {
      this.entrada.value = lista.filtros.texto;
      this.buscador.classList.toggle('con-texto', Boolean(lista.filtros.texto));
    }
  };

  EncabezadoView.prototype.pintarPills = function (contenedor, items, activo, clase) {
    contenedor.innerHTML = items.map(function (i) {
      return '<button class="pill ' + clase + (i.id === activo ? ' on' : '') + '" data-id="' + i.id + '">' +
             i.etiqueta + (i.conteo ? '<em>' + i.conteo + '</em>' : '') + '</button>';
    }).join('');
  };

  // Globito de la campanita: cuántas notas no ha visto este dispositivo.
  EncabezadoView.prototype.pintarCampana = function (sinLeer) {
    this.campana.classList.toggle('tiene', sinLeer > 0);
    if (sinLeer > 0) {
      this.globo.textContent = sinLeer > 99 ? '99+' : sinLeer;
      this.globo.hidden = false;
    } else {
      this.globo.hidden = true;
    }
  };

  EncabezadoView.prototype.rebotar = function () {
    var c = this.campana;
    c.classList.remove('rebota');
    void c.offsetWidth; // reinicia la animación
    c.classList.add('rebota');
  };

  raiz.EncabezadoView = EncabezadoView;

})(typeof globalThis !== 'undefined' ? globalThis : this);
