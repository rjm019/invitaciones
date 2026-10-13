/*
 * LayoutService — normaliza un acomodo de mesas a la lista canónica de invitados.
 * UMD: el navegador lo usa como window.LayoutService y el servidor con require().
 *
 * Entrada: matriz de celdas (venga de CSV o de XLSX).
 * Salida:  { formato, invitados, categorias, mesas, informe }
 */
(function (raiz, fabrica) {
  if (typeof module !== 'undefined' && module.exports) module.exports = fabrica();
  else raiz.LayoutService = fabrica();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---------- texto ----------

  function quitaAcentos(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // Repara el mojibake de UTF-8 leído como latin-1 (NIÃ‘OS -> NIÑOS).
  function reparaMojibake(s) {
    if (s.indexOf('Ã') === -1 && s.indexOf('Â') === -1) return s;
    return s
      .replace(/Ã‘/g, 'Ñ').replace(/Ã±/g, 'ñ')
      .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é')
      .replace(/Ã­/g, 'í').replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú').replace(/Âº/g, 'º')
      .replace(/Ã(?=[A-Z])/g, 'Ñ')
      .replace(/Â/g, '');
  }

  function limpia(s) {
    return reparaMojibake(String(s == null ? '' : s)).replace(/\s+/g, ' ').trim();
  }

  function clave(s) {
    return quitaAcentos(limpia(s)).toUpperCase();
  }

  function titulo(s) {
    var t = limpia(s).toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // ---------- categorías ----------

  // Sinónimos conocidos; lo que no aparezca aquí se da de alta con su propio nombre.
  var SINONIMOS = [
    { id: 'adulto', etiqueta: 'Adultos', singular: 'Adulto',
      patron: /^(ADULTO(S)?|(N(O|UM|UMERO)?\.?\s*(DE\s+)?)?PERSONAS?)$/ },
    { id: 'adolescente', etiqueta: 'Adolescentes', singular: 'Adolescente',
      patron: /^(ADOLESCENTE(S)?|JOVEN(ES)?)$/ },
    { id: 'nino', etiqueta: 'Niños', singular: 'Niño',
      patron: /^(NINO(S)?|NINA(S)?|INFANTE(S)?)$/ },
    { id: 'bebe', etiqueta: 'Bebés', singular: 'Bebé',
      patron: /^BEBE(S)?$/ }
  ];

  function categoriaDe(encabezado) {
    var k = clave(encabezado);
    if (!k) return null;
    for (var i = 0; i < SINONIMOS.length; i++) {
      if (SINONIMOS[i].patron.test(k)) return { id: SINONIMOS[i].id, etiqueta: SINONIMOS[i].etiqueta };
    }
    return { id: k.toLowerCase().replace(/[^a-z0-9]+/g, '_'), etiqueta: titulo(encabezado) };
  }

  // Cómo se nombra a UNA persona de esa categoría; para las que se dan de alta
  // solas no hay singular conocido, así que se usa su propia etiqueta.
  function singularDe(cat) {
    for (var i = 0; i < SINONIMOS.length; i++) {
      if (SINONIMOS[i].id === cat.id) return SINONIMOS[i].singular;
    }
    return cat.etiqueta;
  }

  // El rótulo suele traer una aclaración pegada al número ("MESA 10 NIÑOS",
  // "MESA 3 NOVIOS"): manda el número y lo de atrás es descripción.
  var ES_MESA = /^MESA\s+(\d+)(\s+.*)?$/;
  var ES_TOTAL = /^TOTAL/;
  var ES_CONTEO = /^(\d+([.,]\d+)?|X|SI)$/;

  function numeroConteo(v) {
    var k = clave(v);
    if (!k || !ES_CONTEO.test(k)) return 0;
    if (k === 'X' || k === 'SI') return 1;
    return Math.round(parseFloat(k.replace(',', '.'))) || 0;
  }

  // ---------- escáner de la rejilla ----------

  // Un encabezado de categoría es una palabra, no un número ni un nombre de persona.
  var ES_ENCABEZADO = /^[A-ZÑ][A-ZÑ ]{1,19}$/;
  var NO_SON_CATEGORIA = ['NO', 'NUM', 'NUMERO', 'MESA', 'TOTAL', 'NOMBRE', 'INVITADO'];

  function esEncabezadoCategoria(texto) {
    var k = clave(texto);
    if (!ES_ENCABEZADO.test(k)) return false;
    return NO_SON_CATEGORIA.indexOf(k) === -1;
  }

  // Lee los encabezados de conteo a la derecha de una celda "MESA n".
  // Se salta las columnas vacías previas y corta en la primera vacía posterior,
  // que es lo que separa un bloque del de al lado.
  function columnasDelBloque(rejilla, fila, col) {
    var cols = [];
    var f = rejilla[fila] || [];
    var limite = Math.min(f.length, col + 12);

    for (var c = col + 1; c < limite; c++) {
      var texto = limpia(f[c]);

      if (!texto) {
        if (cols.length) break; // terminó este bloque
        continue;              // hueco antes de los encabezados
      }
      if (ES_MESA.test(clave(texto))) break;
      if (!esEncabezadoCategoria(texto)) {
        if (cols.length) break;
        continue;
      }

      cols.push({ col: c, categoria: categoriaDe(texto) });
    }

    return cols;
  }

  function analizaRejilla(rejilla) {
    var bloques = [];
    var categorias = [];
    var vistas = {};

    function registraCategoria(cat) {
      if (vistas[cat.id]) return;
      vistas[cat.id] = true;
      categorias.push({ id: cat.id, etiqueta: cat.etiqueta });
    }

    for (var r = 0; r < rejilla.length; r++) {
      var fila = rejilla[r] || [];
      for (var c = 0; c < fila.length; c++) {
        var m = ES_MESA.exec(clave(fila[c]));
        if (!m) continue;

        var cols = columnasDelBloque(rejilla, r, c);
        if (!cols.length) continue; // "MESA n" suelto, sin columnas de conteo

        cols.forEach(function (x) { registraCategoria(x.categoria); });

        var bloque = {
          mesa: parseInt(m[1], 10),
          personas: [],
          descartes: [],
          totalDeclarado: null
        };

        // El nombre va en la misma columna donde está el rótulo "MESA n";
        // la columna de la izquierda es el consecutivo (Nº).
        for (var rr = r + 1; rr < rejilla.length; rr++) {
          var f2 = rejilla[rr] || [];
          var nombre = limpia(f2[c]);
          var k = clave(nombre);

          if (ES_MESA.test(k)) break;

          if (ES_TOTAL.test(k)) {
            var dec = {};
            cols.forEach(function (x) { dec[x.categoria.id] = numeroConteo(f2[x.col]); });
            bloque.totalDeclarado = dec;
            break;
          }

          var conteos = {};
          var suma = 0;
          cols.forEach(function (x) {
            var n = numeroConteo(f2[x.col]);
            if (n > 0) { conteos[x.categoria.id] = n; suma += n; }
          });

          var consecutivo = c > 0 ? limpia(f2[c - 1]) : '';
          if (!nombre && !suma && !consecutivo) break;

          if (nombre && suma) {
            // una fila con conteo > 1 representa varias personas
            Object.keys(conteos).forEach(function (catId) {
              for (var n = 0; n < conteos[catId]; n++) {
                bloque.personas.push({ mesa: bloque.mesa, nombre: nombre, categoria: catId });
              }
            });
          } else if (nombre && !suma) {
            bloque.descartes.push({
              mesa: bloque.mesa, texto: nombre,
              motivo: 'sin conteo en ninguna categoría'
            });
          }
        }

        bloques.push(bloque);
      }
    }

    return { bloques: bloques, categorias: categorias };
  }

  // Totales generales del encabezado del layout ("TOTAL ADULTOS | 190").
  function totalesDeclarados(rejilla, categorias) {
    var out = {};
    for (var r = 0; r < rejilla.length; r++) {
      var fila = rejilla[r] || [];
      for (var c = 0; c < fila.length; c++) {
        var m = /^TOTAL\s+(.+)$/.exec(clave(fila[c]));
        if (!m) continue;
        var cat = categoriaDe(m[1]);
        if (!cat) continue;
        var pertenece = categorias.some(function (x) { return x.id === cat.id; });
        if (!pertenece) continue;
        for (var c2 = c + 1; c2 < fila.length; c2++) {
          var celda = clave(fila[c2]);
          if (!celda) continue;
          if (ES_CONTEO.test(celda)) { out[cat.id] = numeroConteo(celda); }
          break;
        }
      }
    }
    return out;
  }

  // ---------- lista agrupada por titular ----------
  //
  // Tercer formato: una fila por invitado principal con el número de personas
  // que trae ("Mesa | Lista final | No Personas | Niños | Comentarios").
  // Se expande a una persona por renglón, que es lo que se marca en la puerta.

  var ES_MESA_SUELTA = /^MESA$/;
  var ES_COMENTARIO = /^(COMENTARIO(S)?|NOTA(S)?|OBSERVACION(ES)?)$/;

  // "Ana Pérez +1 persona +2 niños" → el nombre termina donde empiezan los acompañantes.
  var ACOMPANANTES = /\s*\+\s*\d*\s*(PERSONA|NIN[OA]|ADULTO|INVITADO|ACOMPANANTE|ADOLESCENTE|JOVEN|BEBE)/;

  function separaAcompanantes(texto) {
    var t = limpia(texto);
    var m = ACOMPANANTES.exec(clave(t));
    if (!m || !m.index) return t; // sin sufijo, o el sufijo es todo lo que hay
    return limpia(t.slice(0, m.index));
  }

  // Clasifica una columna por lo que trae debajo del encabezado: los conteos son
  // números y los nombres no. Así no hay que adivinar por el título de la columna,
  // que en estos archivos es cualquier cosa ("Lista final", "No Personas").
  function perfilColumna(rejilla, filaEnc, col) {
    var num = 0, txt = 0;
    for (var r = filaEnc + 1; r < rejilla.length && num + txt < 20; r++) {
      var v = limpia((rejilla[r] || [])[col]);
      if (!v) continue;
      if (ES_CONTEO.test(clave(v))) num++; else txt++;
    }
    if (!num && !txt) return 'vacio';
    return num > txt ? 'numero' : 'texto';
  }

  // Lee los encabezados a la derecha de una celda "MESA" (sin número).
  // Devuelve null si ahí no empieza una tabla de este tipo.
  function encabezadoAgrupado(rejilla, fila, col) {
    var f = rejilla[fila] || [];
    var nombre = -1, comentario = -1, conteos = [];

    for (var c = col + 1; c < f.length; c++) {
      var texto = limpia(f[c]);

      if (!texto) {
        if (nombre !== -1 || conteos.length) break; // terminó la tabla
        continue;                                   // hueco antes de los encabezados
      }

      var k = clave(texto);
      if (ES_MESA_SUELTA.test(k) || ES_MESA.test(k)) break;

      if (ES_COMENTARIO.test(k)) {
        if (comentario === -1) comentario = c;
        continue;
      }

      if (perfilColumna(rejilla, fila, c) === 'numero') {
        conteos.push({ col: c, categoria: categoriaDe(texto) });
      } else if (nombre === -1 && !conteos.length) {
        nombre = c;
      } else {
        break;
      }
    }

    if (!conteos.length) return null;
    return { fila: fila, mesa: col, nombre: nombre, comentario: comentario, conteos: conteos };
  }

  function leeFilasAgrupadas(rejilla, enc) {
    var filas = [], mesa = 0;

    for (var r = enc.fila + 1; r < rejilla.length; r++) {
      var f = rejilla[r] || [];
      var celdaMesa = limpia(f[enc.mesa]);
      var texto = limpia(f[enc.nombre]);

      if (ES_TOTAL.test(clave(celdaMesa)) || ES_TOTAL.test(clave(texto))) break;

      // La mesa se arrastra: en estas listas se escribe una vez y se deja en blanco.
      if (celdaMesa) {
        var n = parseInt(celdaMesa, 10);
        if (!isNaN(n)) mesa = n;
      }

      if (!texto) continue;

      var conteos = {}, suma = 0;
      enc.conteos.forEach(function (x) {
        var v = numeroConteo(f[x.col]);
        if (v > 0) { conteos[x.categoria.id] = v; suma += v; }
      });

      filas.push({
        mesa: mesa,
        texto: texto,
        nombre: separaAcompanantes(texto),
        comentario: enc.comentario === -1 ? '' : limpia(f[enc.comentario]),
        conteos: conteos,
        total: suma
      });
    }

    return filas;
  }

  // Una fila con conteos se vuelve N personas: el titular con su nombre y los
  // demás nombrados a partir de él, para que en la lista se distingan entre sí.
  function expandeFila(fila, cols) {
    var personas = [];
    var titularPuesto = false;

    cols.forEach(function (x) {
      var n = fila.conteos[x.categoria.id] || 0;
      if (!n) return;

      var etiqueta = titularPuesto ? singularDe(x.categoria) : 'Acompañante';
      var inicio = 0;

      if (!titularPuesto) {
        personas.push({ mesa: fila.mesa, nombre: fila.nombre, categoria: x.categoria.id });
        titularPuesto = true;
        inicio = 1;
      }

      var extras = n - inicio;
      for (var i = 0; i < extras; i++) {
        personas.push({
          mesa: fila.mesa,
          nombre: etiqueta + (extras > 1 ? ' ' + (i + 1) : '') + ' de ' + fila.nombre,
          categoria: x.categoria.id
        });
      }
    });

    return personas;
  }

  // Tabla lateral de totales ("Mesa | no. Personas"): mismos encabezados de conteo
  // pero sin columna de nombres. Sirve para cuadrar lo leído contra el archivo.
  function resumenPorMesa(rejilla, resumenes) {
    var out = {};
    resumenes.forEach(function (enc) {
      for (var r = enc.fila + 1; r < rejilla.length; r++) {
        var f = rejilla[r] || [];
        var celda = limpia(f[enc.mesa]);
        if (ES_TOTAL.test(clave(celda))) break;
        var mesa = parseInt(celda, 10);
        if (isNaN(mesa)) continue;
        var dec = out[mesa] || (out[mesa] = {});
        enc.conteos.forEach(function (x) { dec[x.categoria.id] = numeroConteo(f[x.col]); });
      }
    });
    return out;
  }

  function analizaAgrupado(rejilla) {
    var bloques = [], resumenes = [];

    for (var r = 0; r < rejilla.length; r++) {
      var fila = rejilla[r] || [];
      for (var c = 0; c < fila.length; c++) {
        if (!ES_MESA_SUELTA.test(clave(fila[c]))) continue;
        if (perfilColumna(rejilla, r, c) !== 'numero') continue;

        var enc = encabezadoAgrupado(rejilla, r, c);
        if (!enc) continue;

        if (enc.nombre === -1) resumenes.push(enc); // tabla de totales, no de personas
        else bloques.push(enc);
      }
    }

    if (!bloques.length) return null;

    var categorias = [], vistas = {};
    var filas = [];

    bloques.forEach(function (enc) {
      enc.conteos.forEach(function (x) {
        if (vistas[x.categoria.id]) return;
        vistas[x.categoria.id] = true;
        categorias.push({ id: x.categoria.id, etiqueta: x.categoria.etiqueta });
      });
      leeFilasAgrupadas(rejilla, enc).forEach(function (f) {
        filas.push({ fila: f, cols: enc.conteos });
      });
    });

    return { filas: filas, categorias: categorias, declarados: resumenPorMesa(rejilla, resumenes) };
  }

  function normalizaAgrupado(rejilla) {
    var res = analizaAgrupado(rejilla);
    if (!res) return null;

    var invitados = [], descartes = [], id = 1;

    res.filas.sort(function (a, b) { return a.fila.mesa - b.fila.mesa; });

    res.filas.forEach(function (x) {
      if (!x.fila.total) {
        descartes.push({
          mesa: x.fila.mesa, texto: x.fila.texto,
          motivo: 'sin conteo en ninguna categoría'
        });
        return;
      }
      expandeFila(x.fila, x.cols).forEach(function (p) {
        invitados.push({
          id: id++, mesa: p.mesa, nombre: p.nombre, categoria: p.categoria,
          llego: false, hora: '', comentario: x.fila.comentario,
          nota_hora: '', nota_por: '', marcado_por: ''
        });
      });
    });

    // Una fila por mesa, cuadrada contra la tabla de totales del archivo si la trae.
    var porMesa = {}, orden = [];
    invitados.forEach(function (g) {
      if (!porMesa[g.mesa]) { porMesa[g.mesa] = { total: 0, cats: {} }; orden.push(g.mesa); }
      porMesa[g.mesa].total++;
      porMesa[g.mesa].cats[g.categoria] = (porMesa[g.mesa].cats[g.categoria] || 0) + 1;
    });

    var mesasInforme = [], diferencias = [];

    orden.forEach(function (m) {
      var conteo = {};
      res.categorias.forEach(function (c) { conteo[c.id] = porMesa[m].cats[c.id] || 0; });

      var fila = { mesa: m, total: porMesa[m].total, porCategoria: conteo, cuadra: true, detalle: '' };
      var dec = res.declarados[m];

      if (dec) {
        var difs = [];
        res.categorias.forEach(function (c) {
          if (dec[c.id] === undefined) return;
          if (dec[c.id] !== conteo[c.id]) {
            difs.push(c.etiqueta + ': archivo ' + dec[c.id] + ' vs leído ' + conteo[c.id]);
          }
        });
        if (difs.length) {
          fila.cuadra = false;
          fila.detalle = difs.join(' · ');
          diferencias.push({ ambito: 'Mesa ' + m, detalle: fila.detalle });
        }
      } else {
        fila.detalle = 'sin total declarado en el archivo';
      }

      mesasInforme.push(fila);
    });

    var declaradosTotales = totalesDeclarados(rejilla, res.categorias);
    var porCategoria = contarPorCategoria(invitados, res.categorias);

    res.categorias.forEach(function (c) {
      if (declaradosTotales[c.id] === undefined) return;
      if (declaradosTotales[c.id] !== porCategoria[c.id]) {
        diferencias.push({
          ambito: 'Total ' + c.etiqueta,
          detalle: 'archivo ' + declaradosTotales[c.id] + ' vs leído ' + porCategoria[c.id]
        });
      }
    });

    return {
      formato: 'agrupado',
      invitados: invitados,
      categorias: res.categorias,
      mesas: listaMesas(invitados),
      informe: {
        formato: 'Lista agrupada por titular (' + res.filas.length + ' filas → ' +
                 invitados.length + ' personas)',
        total: invitados.length,
        porCategoria: porCategoria,
        totalesDeclarados: declaradosTotales,
        mesas: mesasInforme,
        mesasVacias: [],
        descartes: descartes,
        diferencias: diferencias
      }
    };
  }

  // ---------- tabla plana (reimportación) ----------

  function filaEncabezadoPlano(rejilla) {
    for (var r = 0; r < Math.min(rejilla.length, 5); r++) {
      var k = (rejilla[r] || []).map(clave);
      if (k.indexOf('NOMBRE') !== -1 && k.indexOf('MESA') !== -1) return r;
    }
    return -1;
  }

  function leeTablaPlana(rejilla, filaEnc) {
    var enc = (rejilla[filaEnc] || []).map(clave);
    function idx(n) { return enc.indexOf(n); }

    var iId = idx('ID'), iMesa = idx('MESA'), iNombre = idx('NOMBRE');
    var iCat = idx('CATEGORIA') !== -1 ? idx('CATEGORIA') : idx('TIPO');
    var iLlego = idx('LLEGO'), iHora = idx('HORA'), iCom = idx('COMENTARIO');
    var iNotaHora = idx('NOTA_HORA'), iNotaPor = idx('NOTA_POR'), iPor = idx('MARCADO_POR');
    var iSust = idx('SUSTITUYE_A'), iLibre = idx('LIBRE'), iEditado = idx('EDITADO_POR');
    var iExtra = idx('EXTRA');

    var invitados = [], categorias = [], vistas = {};

    for (var r = filaEnc + 1; r < rejilla.length; r++) {
      var f = rejilla[r] || [];
      var nombre = limpia(f[iNombre]);
      var libre = iLibre !== -1 && clave(f[iLibre]) === 'SI';
      // un lugar libre no trae nombre, pero sigue siendo un renglón de la mesa
      if (!nombre && !libre) continue;

      var cat = categoriaDe(iCat === -1 ? 'adulto' : (limpia(f[iCat]) || 'adulto'));
      if (!vistas[cat.id]) { vistas[cat.id] = true; categorias.push(cat); }

      invitados.push({
        id: iId === -1 ? invitados.length + 1 : (parseInt(limpia(f[iId]), 10) || invitados.length + 1),
        mesa: parseInt(limpia(f[iMesa]), 10) || 0,
        nombre: nombre,
        categoria: cat.id,
        llego: iLlego !== -1 && clave(f[iLlego]) === 'SI',
        hora: iHora === -1 ? '' : limpia(f[iHora]),
        comentario: iCom === -1 ? '' : limpia(f[iCom]),
        nota_hora: iNotaHora === -1 ? '' : limpia(f[iNotaHora]),
        nota_por: iNotaPor === -1 ? '' : limpia(f[iNotaPor]),
        marcado_por: iPor === -1 ? '' : limpia(f[iPor]),
        sustituye_a: iSust === -1 ? '' : limpia(f[iSust]),
        libre: libre,
        extra: iExtra !== -1 && clave(f[iExtra]) === 'SI',
        editado_por: iEditado === -1 ? '' : limpia(f[iEditado])
      });
    }

    return { invitados: invitados, categorias: categorias };
  }

  function contarPorCategoria(invitados, categorias) {
    var out = {};
    categorias.forEach(function (c) { out[c.id] = 0; });
    invitados.forEach(function (g) { out[g.categoria] = (out[g.categoria] || 0) + 1; });
    return out;
  }

  function listaMesas(invitados) {
    var vistas = {};
    invitados.forEach(function (g) { vistas[g.mesa] = true; });
    return Object.keys(vistas).map(Number).sort(function (a, b) { return a - b; });
  }

  // ---------- entrada principal ----------

  function normaliza(rejilla) {
    var filaPlana = filaEncabezadoPlano(rejilla);

    if (filaPlana !== -1) {
      var plano = leeTablaPlana(rejilla, filaPlana);
      return {
        formato: 'plano',
        invitados: plano.invitados,
        categorias: plano.categorias,
        mesas: listaMesas(plano.invitados),
        informe: {
          formato: 'Tabla plana (reimportación)',
          total: plano.invitados.length,
          porCategoria: contarPorCategoria(plano.invitados, plano.categorias),
          totalesDeclarados: {},
          mesas: [], mesasVacias: [], descartes: [], diferencias: []
        }
      };
    }

    var res = analizaRejilla(rejilla);

    // Solo si el archivo no es una rejilla de bloques: así el formato conocido
    // manda y el agrupado entra donde antes no se leía nada.
    if (!res.bloques.length) {
      var agrupado = normalizaAgrupado(rejilla);
      if (agrupado) return agrupado;
    }

    var declarados = totalesDeclarados(rejilla, res.categorias);

    var invitados = [], descartes = [], mesasInforme = [], diferencias = [], id = 1;

    res.bloques.sort(function (a, b) { return a.mesa - b.mesa; });

    res.bloques.forEach(function (b) {
      b.personas.forEach(function (p) {
        invitados.push({
          id: id++, mesa: p.mesa, nombre: p.nombre, categoria: p.categoria,
          llego: false, hora: '', comentario: '', nota_hora: '', nota_por: '', marcado_por: ''
        });
      });

      b.descartes.forEach(function (d) { descartes.push(d); });

      var conteo = {};
      res.categorias.forEach(function (c) { conteo[c.id] = 0; });
      b.personas.forEach(function (p) { conteo[p.categoria] = (conteo[p.categoria] || 0) + 1; });

      var fila = {
        mesa: b.mesa, total: b.personas.length, porCategoria: conteo,
        cuadra: true, detalle: ''
      };

      if (b.totalDeclarado) {
        var difs = [];
        res.categorias.forEach(function (c) {
          var esperado = b.totalDeclarado[c.id] || 0;
          var real = conteo[c.id] || 0;
          if (esperado !== real) difs.push(c.etiqueta + ': layout ' + esperado + ' vs leído ' + real);
        });
        if (difs.length) {
          fila.cuadra = false;
          fila.detalle = difs.join(' · ');
          diferencias.push({ ambito: 'Mesa ' + b.mesa, detalle: fila.detalle });
        }
      } else {
        fila.detalle = 'sin fila TOTAL en el layout';
      }

      mesasInforme.push(fila);
    });

    var porCategoria = contarPorCategoria(invitados, res.categorias);

    res.categorias.forEach(function (c) {
      if (declarados[c.id] === undefined) return;
      if (declarados[c.id] !== porCategoria[c.id]) {
        diferencias.push({
          ambito: 'Total ' + c.etiqueta,
          detalle: 'layout ' + declarados[c.id] + ' vs leído ' + porCategoria[c.id]
        });
      }
    });

    return {
      formato: 'rejilla',
      invitados: invitados,
      categorias: res.categorias,
      mesas: listaMesas(invitados),
      informe: {
        formato: 'Layout de acomodo (rejilla por mesa)',
        total: invitados.length,
        porCategoria: porCategoria,
        totalesDeclarados: declarados,
        mesas: mesasInforme,
        mesasVacias: res.bloques.filter(function (b) { return !b.personas.length; })
                                .map(function (b) { return b.mesa; }),
        descartes: descartes,
        diferencias: diferencias
      }
    };
  }

  return {
    normaliza: normaliza,
    categoriaDe: categoriaDe,
    limpia: limpia,
    clave: clave,
    quitaAcentos: quitaAcentos
  };
});
