/*
 * AlmacenService — persistencia local del trabajo en curso (localStorage).
 * Es la red de seguridad: si se recarga la página o se cae el servidor,
 * el dispositivo no pierde lo que ya registró.
 */
(function (raiz) {
  'use strict';

  var CLAVE_ESTADO = 'invitados.estado.v3';
  var CLAVE_LEIDAS = 'invitados.notas-leidas.v3';
  var CLAVE_HOSTESS = 'invitados.hostess.v3';

  function disponible() {
    try {
      localStorage.setItem('__prueba__', '1');
      localStorage.removeItem('__prueba__');
      return true;
    } catch (e) {
      return false;
    }
  }

  function leer(clave, pordefecto) {
    try {
      var txt = localStorage.getItem(clave);
      return txt ? JSON.parse(txt) : pordefecto;
    } catch (e) {
      return pordefecto;
    }
  }

  function escribir(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (e) {
      return false;
    }
  }

  var AlmacenService = {
    disponible: disponible,

    guardarEstado: function (lista) {
      return escribir(CLAVE_ESTADO, {
        guardado: new Date().toISOString(),
        categorias: lista.categorias,
        invitados: lista.invitados.map(function (g) { return g.aObjeto(); })
      });
    },

    leerEstado: function () {
      return leer(CLAVE_ESTADO, null);
    },

    borrarEstado: function () {
      try { localStorage.removeItem(CLAVE_ESTADO); } catch (e) {}
    },

    // El "ya lo vi" de la campanita es por dispositivo (§2.4).
    leerNotasLeidas: function () {
      return leer(CLAVE_LEIDAS, {});
    },

    guardarNotasLeidas: function (mapa) {
      return escribir(CLAVE_LEIDAS, mapa);
    },

    leerHostess: function () {
      try { return localStorage.getItem(CLAVE_HOSTESS) || ''; } catch (e) { return ''; }
    },

    guardarHostess: function (nombre) {
      try { localStorage.setItem(CLAVE_HOSTESS, nombre); } catch (e) {}
    }
  };

  raiz.AlmacenService = AlmacenService;

})(typeof globalThis !== 'undefined' ? globalThis : this);
