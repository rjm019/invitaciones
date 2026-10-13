/*
 * CsvService — leer y escribir CSV. Sin reglas de negocio.
 * UMD: navegador (window.CsvService) y servidor (require).
 */
(function (raiz, fabrica) {
  if (typeof module !== 'undefined' && module.exports) module.exports = fabrica();
  else raiz.CsvService = fabrica();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var BOM = '﻿';

  // Respeta comillas, comas dentro de comillas y saltos CRLF.
  function parsea(texto) {
    texto = String(texto == null ? '' : texto);
    if (texto.charAt(0) === BOM) texto = texto.slice(1);

    var filas = [], fila = [], valor = '', comillas = false;

    for (var i = 0; i < texto.length; i++) {
      var ch = texto[i];
      if (comillas) {
        if (ch === '"') {
          if (texto[i + 1] === '"') { valor += '"'; i++; }
          else comillas = false;
        } else valor += ch;
      } else if (ch === '"') {
        comillas = true;
      } else if (ch === ',') {
        fila.push(valor); valor = '';
      } else if (ch === '\n') {
        fila.push(valor); filas.push(fila); fila = []; valor = '';
      } else if (ch !== '\r') {
        valor += ch;
      }
    }
    if (valor !== '' || fila.length) { fila.push(valor); filas.push(fila); }

    return filas;
  }

  function escapa(v) {
    var s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  // BOM y CRLF para que Excel abra acentos y Ñ sin pelear.
  function genera(filas) {
    return BOM + filas.map(function (f) {
      return f.map(escapa).join(',');
    }).join('\r\n') + '\r\n';
  }

  return { parsea: parsea, genera: genera, BOM: BOM };
});
