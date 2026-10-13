/*
 * ArchivoService — convierte un archivo (CSV o XLSX) en matriz de celdas,
 * y genera los archivos de salida. Sin reglas de negocio: eso vive en LayoutService.
 */
(function (raiz) {
  'use strict';

  var Csv = raiz.CsvService;

  function esExcel(nombre) {
    return /\.(xlsx|xlsm|xls|xlsb)$/i.test(nombre || '');
  }

  function leeTexto(archivo) {
    return new Promise(function (ok, falla) {
      var fr = new FileReader();
      fr.onload = function () { ok(fr.result); };
      fr.onerror = function () { falla(new Error('No se pudo leer el archivo')); };
      fr.readAsText(archivo, 'UTF-8');
    });
  }

  function leeBinario(archivo) {
    return new Promise(function (ok, falla) {
      var fr = new FileReader();
      fr.onload = function () { ok(new Uint8Array(fr.result)); };
      fr.onerror = function () { falla(new Error('No se pudo leer el archivo')); };
      fr.readAsArrayBuffer(archivo);
    });
  }

  // La primera hoja del libro, como matriz de strings.
  function rejillaDeExcel(bytes) {
    if (typeof XLSX === 'undefined') {
      throw new Error('Falta la librería para leer Excel');
    }
    var libro = XLSX.read(bytes, { type: 'array' });
    var hoja = libro.Sheets[libro.SheetNames[0]];
    return XLSX.utils.sheet_to_json(hoja, { header: 1, raw: false, defval: '' });
  }

  var ArchivoService = {
    esExcel: esExcel,

    // Devuelve la matriz de celdas de cualquiera de los dos formatos.
    aRejilla: function (archivo) {
      if (esExcel(archivo.name)) {
        return leeBinario(archivo).then(rejillaDeExcel);
      }
      return leeTexto(archivo).then(function (txt) { return Csv.parsea(txt); });
    },

    // ---------- salidas ----------

    ENCABEZADO: ['id', 'mesa', 'nombre', 'categoria', 'llego', 'hora',
                 'comentario', 'nota_hora', 'nota_por', 'marcado_por',
                 'sustituye_a', 'libre', 'extra', 'editado_por'],

    csvInvitados: function (lista) {
      var filas = [ArchivoService.ENCABEZADO.slice()];
      lista.invitados.forEach(function (g) {
        filas.push([
          g.id, g.mesa, g.nombre, g.categoria, g.llego ? 'SI' : '', g.hora,
          g.comentario, g.nota_hora, g.nota_por, g.marcado_por,
          g.sustituye_a, g.libre ? 'SI' : '', g.extra ? 'SI' : '', g.editado_por
        ]);
      });
      return Csv.genera(filas);
    },

    // Archivo derivado: siempre se reconstruye desde la lista (§4.3 del plan).
    csvResumenMesas: function (lista) {
      var cats = lista.categorias;
      var enc = ['mesa', 'lugares', 'total', 'llegados', 'pendientes', 'disponibles',
                 'extras', 'porcentaje', 'completa'];
      cats.forEach(function (c) {
        enc.push(c.id + '_total', c.id + '_llegados');
      });

      var filas = [enc];
      lista.mesas().forEach(function (m) {
        var fila = [m.numero, m.lugares, m.total, m.llegados, m.pendientes, m.libres,
                    m.extras, m.porcentaje + '%', m.completa() ? 'SI' : ''];
        cats.forEach(function (c) {
          var d = m.porCategoria[c.id] || { total: 0, llegados: 0 };
          fila.push(d.total, d.llegados);
        });
        filas.push(fila);
      });

      var personas = lista.presentes().length;
      var totales = ['TOTAL', personas + lista.lugaresLibres(), personas,
                     lista.totalLlegados(), personas - lista.totalLlegados(),
                     lista.lugaresLibres(), lista.lugaresExtra(),
                     (personas ? Math.round(lista.totalLlegados() / personas * 100) : 0) + '%',
                     lista.mesasCompletas() + '/' + lista.mesas().length];
      cats.forEach(function (c) {
        var d = lista.conteoCategoria(c.id);
        totales.push(d.total, d.llegados);
      });
      filas.push(totales);

      return Csv.genera(filas);
    },

    descargar: function (contenido, nombre) {
      var blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
  };

  raiz.ArchivoService = ArchivoService;

})(typeof globalThis !== 'undefined' ? globalThis : this);
