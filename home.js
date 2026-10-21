// Home: seletor de plano (com preço de config/prices quando disponível) e galeria 3D.
(function () {
  var pick = document.getElementById('planPick'), cta = document.getElementById('planCta');
  if (pick && cta) {
    var price = { monthly: 'R$ 12,99', yearly: 'R$ 99,99' }, per = { monthly: '/mês', yearly: '/ano' };
    var arrow = cta.querySelector('svg');
    var sync = function () {
      var cur = pick.querySelector('input:checked');
      pick.querySelectorAll('.pp-opt').forEach(function (l) { l.classList.toggle('selected', l.contains(cur)); });
      var p = cur ? cur.value : 'yearly';
      cta.textContent = 'Apoiar por ' + price[p] + per[p] + ' ';
      if (arrow) cta.appendChild(arrow);
      cta.href = 'apoiar?plan=' + p;
    };
    pick.addEventListener('change', sync);
    sync();
    var brl = function (c) { return 'R$ ' + (c / 100).toFixed(2).replace('.', ','); };
    var set = function (sel, txt) { var el = pick.querySelector(sel); if (el) el.textContent = txt; };
    var num = function (f) { return f ? Number(f.integerValue || f.doubleValue) : 0; };
    fetch('https://firestore.googleapis.com/v1/projects/menos-pista/databases/(default)/documents/config/prices?key=AIzaSyA1R525o7a3ThSC4BEv-k2J0iaMal_JBN4')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var f = d && d.fields; if (!f) return;
        [['monthly', 'monthlyFrom'], ['yearly', 'yearlyFrom']].forEach(function (k) {
          var por = num(f[k[0]]), de = num(f[k[1]]);
          if (!(por > 0)) return;
          price[k[0]] = brl(por); set('[data-price="' + k[0] + '"]', brl(por));
          if (de > por) { set('[data-from="' + k[0] + '"]', 'de ' + brl(de)); set('[data-save="' + k[0] + '"]', '-' + Math.round((1 - por / de) * 100) + '%'); }
          if (k[0] === 'yearly') set('[data-eq="yearly"]', 'cerca de ' + brl(Math.round(por / 12)) + '/mês');
        });
        sync();
      }).catch(function () { /* mantém os valores fixos */ });
  }
  var g = document.getElementById('gallery');
  if (g && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var items = g.querySelectorAll('.g-item'), raf = 0;
    var paint = function () {
      raf = 0; var mid = g.getBoundingClientRect().left + g.clientWidth / 2;
      items.forEach(function (it) {
        var r = it.getBoundingClientRect(), d = (r.left + r.width / 2 - mid) / r.width;
        var c = Math.max(-2, Math.min(2, d));
        it.style.setProperty('--ry', (c * -22) + 'deg');
        it.style.setProperty('--sc', (1 - Math.min(Math.abs(c), 1.5) * 0.1).toFixed(3));
        it.style.setProperty('--op', (1 - Math.min(Math.abs(c), 1.6) * 0.3).toFixed(2));
      });
    };
    g.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    addEventListener('resize', paint); paint();
    // começa centrado na 3ª tela (detalhe da oferta)
    if (items[2]) g.scrollLeft = items[2].offsetLeft - (g.clientWidth - items[2].clientWidth) / 2;
  }
})();
