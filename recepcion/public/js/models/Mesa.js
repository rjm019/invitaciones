/*
 * Mesa — avance de una mesa. Se calcula al vuelo desde sus invitados,
 * nunca se guarda un contador que se pueda desincronizar.
 */
(function (raiz, fabrica) {
  if (typeof module !== 'undefined' && module.exports) module.exports = fabrica();
  else raiz.Mesa = fabrica();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function Mesa(numero, invitados, categorias) {
    this.numero = numero;
    this.invitados = invitados || [];
    this.total = 0;      // personas sentadas: un lugar libre no es una persona
    this.llegados = 0;
    this.libres = 0;     // lugares que existen y están disponibles
    this.extras = 0;     // sillas agregadas durante el evento (marcadas con +1)

    this.porCategoria = {};
    (categorias || []).forEach(function (c) {
      this.porCategoria[c.id] = { total: 0, llegados: 0, etiqueta: c.etiqueta };
    }, this);

    this.invitados.forEach(function (g) {
      if (g.extra) this.extras++;
      if (g.libre) { this.libres++; return; }

      if (!this.porCategoria[g.categoria]) {
        this.porCategoria[g.categoria] = { total: 0, llegados: 0, etiqueta: g.categoria };
      }
      this.total++;
      this.porCategoria[g.categoria].total++;
      if (g.llego) {
        this.llegados++;
        this.porCategoria[g.categoria].llegados++;
      }
    }, this);

    this.pendientes = this.total - this.llegados;
    this.lugares = this.total + this.libres;   // capacidad real de la mesa hoy
    this.porcentaje = this.total ? Math.round(this.llegados / this.total * 100) : 0;
  }

  Mesa.prototype.completa = function () {
    return this.total > 0 && this.llegados === this.total;
  };

  Mesa.prototype.sinLlegar = function () {
    return this.llegados === 0;
  };

  Mesa.prototype.estado = function () {
    if (this.completa()) return 'completa';
    if (this.sinLlegar()) return 'sin-llegar';
    return 'en-curso';
  };

  // "6 adultos · 2 niños · 1 disponible · 2 extra" — solo lo que aplica a esta mesa.
  Mesa.prototype.desglose = function () {
    var partes = [];
    Object.keys(this.porCategoria).forEach(function (id) {
      var c = this.porCategoria[id];
      if (c.total) partes.push(c.total + ' ' + c.etiqueta.toLowerCase());
    }, this);
    if (this.libres) partes.push(this.libres + (this.libres === 1 ? ' disponible' : ' disponibles'));
    if (this.extras) partes.push(this.extras + ' extra');
    return partes.join(' · ');
  };

  return Mesa;
});
