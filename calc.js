// Calculadora de corrida do Menos Pista (pt/en/es). Sem dependências. Metas e custo ficam no localStorage.
(function () {
  'use strict';
  var f = document.getElementById('calcForm'); if (!f) return;
  var L = f.dataset.lang || 'pt', loc = f.dataset.locale || 'pt-BR', fixed = f.dataset.fixed === '1';
  var T = {
    pt: { ok: 'Vale a pena', warn: 'Atenção', bad: 'Não vale', fill: 'Preencha a oferta para ver o veredito', goals: 'Defina suas metas para ver o veredito', km: 'km', mi: 'milha', kmS: 'km', miS: 'mi', h: 'hora', bothOk: 'Bate as duas metas.', onlyKm: 'Bate só a meta por {u}.', onlyH: 'Bate só a meta por hora.', none: 'Não bate nenhuma meta.' },
    en: { ok: 'Worth it', warn: 'Caution', bad: 'Not worth it', fill: 'Fill in the offer to see the verdict', goals: 'Set your goals to see the verdict', km: 'km', mi: 'mile', kmS: 'km', miS: 'mi', h: 'hour', bothOk: 'Meets both goals.', onlyKm: 'Meets only the per-{u} goal.', onlyH: 'Meets only the per-hour goal.', none: 'Meets neither goal.' },
    es: { ok: 'Vale la pena', warn: 'Atención', bad: 'No vale', fill: 'Completa la oferta para ver el veredicto', goals: 'Define tus metas para ver el veredicto', km: 'km', mi: 'milla', kmS: 'km', miS: 'mi', h: 'hora', bothOk: 'Cumple las dos metas.', onlyKm: 'Cumple solo la meta por {u}.', onlyH: 'Cumple solo la meta por hora.', none: 'No cumple ninguna meta.' }
  }[L];
  var $ = function (id) { return document.getElementById(id); };
  var cur = $('cCurrency'), unit = $('cUnit'), KEY = 'mpCalc:' + L;
  var keep = ['cCost', 'cGoalKm', 'cGoalH'];
  try {
    var s = JSON.parse(localStorage.getItem(KEY) || '{}');
    keep.forEach(function (k) { if (s[k] != null && $(k)) $(k).value = s[k]; });
    if (!fixed && s.cur && cur) cur.value = s.cur;
    if (!fixed && s.unit && unit) unit.value = s.unit;
  } catch (e) {}
  var save = function () {
    try { var o = {}; keep.forEach(function (k) { o[k] = $(k).value; }); if (cur) o.cur = cur.value; if (unit) o.unit = unit.value; localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
  };
  var num = function (id) { var v = String($(id).value).replace(',', '.').trim(); return v === '' ? NaN : Number(v); };
  var code = function () { return fixed ? 'BRL' : (cur ? cur.value : 'USD'); };
  var u = function () { return fixed ? 'km' : (unit ? unit.value : 'km'); };
  var money = function (v) {
    var c = code();
    if (c === 'OTHER') return new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    return new Intl.NumberFormat(loc, { style: 'currency', currency: c }).format(v);
  };
  var sym = function () {
    var c = code(); if (c === 'OTHER') return '';
    var p = new Intl.NumberFormat(loc, { style: 'currency', currency: c }).formatToParts(0).filter(function (x) { return x.type === 'currency'; })[0];
    return p ? p.value : c;
  };
  var dec = function (v) { return new Intl.NumberFormat(loc, { maximumFractionDigits: 1 }).format(v); };
  var labels = function () {
    var s = sym(), uu = u() === 'mi' ? T.miS : T.kmS, un = u() === 'mi' ? T.mi : T.km;
    document.querySelectorAll('[data-c]').forEach(function (e) { e.textContent = s ? '(' + s + ')' : ''; });
    document.querySelectorAll('[data-u]').forEach(function (e) { e.textContent = uu; });
    document.querySelectorAll('[data-un]').forEach(function (e) { e.textContent = un; });
  };
  var out = function (id, t) { $(id).textContent = t; };
  var run = function () {
    labels(); save();
    var val = num('cValue'), dp = num('cPickup'), dt = num('cTrip'), min = num('cMin'), cost = num('cCost'), gk = num('cGoalKm'), gh = num('cGoalH');
    var uu = u() === 'mi' ? T.miS : T.kmS, un = u() === 'mi' ? T.mi : T.km, v = $('cVerdict'), why = $('cWhy');
    var dash = '—';
    if (!(val > 0) || !(dp >= 0) || !(dt >= 0) || !(dp + dt > 0) || !(min > 0)) {
      ['rDist', 'rPerKm', 'rPerH', 'rCost', 'rProfit', 'rProfitH'].forEach(function (i) { out(i, dash); });
      v.className = 'calc-verdict'; v.textContent = T.fill; why.textContent = ''; return;
    }
    var dist = dp + dt, h = min / 60, perKm = val / dist, perH = val / h;
    out('rDist', dec(dist) + ' ' + uu); out('rPerKm', money(perKm) + '/' + uu); out('rPerH', money(perH) + '/h');
    if (cost >= 0) { var c = cost * dist, p = val - c; out('rCost', money(c)); out('rProfit', money(p)); out('rProfitH', money(p / h) + '/h'); }
    else { out('rCost', dash); out('rProfit', dash); out('rProfitH', dash); }
    if (!(gk > 0) || !(gh > 0)) { v.className = 'calc-verdict'; v.textContent = T.goals; why.textContent = ''; return; }
    var a = perKm >= gk, b = perH >= gh;
    if (a && b) { v.className = 'calc-verdict g'; v.textContent = T.ok; why.textContent = T.bothOk; }
    else if (a || b) { v.className = 'calc-verdict y'; v.textContent = T.warn; why.textContent = a ? T.onlyKm.replace('{u}', un) : T.onlyH; }
    else { v.className = 'calc-verdict r'; v.textContent = T.bad; why.textContent = T.none; }
  };
  f.addEventListener('input', run); f.addEventListener('change', run);
  f.addEventListener('submit', function (e) { e.preventDefault(); run(); });
  run();
})();
