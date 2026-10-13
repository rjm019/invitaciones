/* main.js — arranque. */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var app = new AppController();
    app.iniciar();
    window.app = app; // útil para revisar estado desde la consola
  });
})();
