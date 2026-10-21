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
  var car = document.getElementById('carousel');
  if (car) {
    var track = car.querySelector('.car-track'), items = [].slice.call(car.querySelectorAll('.g-item')), dots = [].slice.call(car.parentNode.querySelectorAll('#carDots button'));
    var tEl = document.getElementById('carTitle'), dEl = document.getElementById('carDesc'), n = items.length, cur = 0, timer = 0;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, desk = matchMedia('(min-width: 900px)');
    var mark = function (i) {
      cur = (i + n) % n;
      items.forEach(function (it, k) {
        it.classList.toggle('is-active', k === cur);
        it.classList.toggle('is-prev', k === (cur - 1 + n) % n);
        it.classList.toggle('is-next', k === (cur + 1) % n);
        it.setAttribute('aria-hidden', String(k !== cur));
      });
      dots.forEach(function (d, k) { d.setAttribute('aria-current', String(k === cur)); });
      tEl.textContent = items[cur].dataset.title; dEl.textContent = items[cur].dataset.desc;
    };
    var go = function (i, user) {
      mark(i);
      if (!desk.matches) track.scrollTo({ left: items[cur].offsetLeft - (track.clientWidth - items[cur].offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
      if (user) restart();
    };
    var restart = function () { clearInterval(timer); if (!reduce) timer = setInterval(function () { if (!document.hidden) go(cur + 1); }, 5000); };
    car.querySelector('.prev').addEventListener('click', function () { go(cur - 1, true); });
    car.querySelector('.next').addEventListener('click', function () { go(cur + 1, true); });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k, true); }); });
    items.forEach(function (it, k) { it.addEventListener('click', function () { if (k !== cur && desk.matches) go(k, true); }); });
    track.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') go(cur - 1, true); if (e.key === 'ArrowRight') go(cur + 1, true); });
    car.addEventListener('mouseenter', function () { clearInterval(timer); }); car.addEventListener('mouseleave', restart);
    car.addEventListener('focusin', function () { clearInterval(timer); });
    // swipe no desktop (toque em tela grande) e leitura do scroll-snap no celular
    var x0 = null;
    track.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function (e) { if (x0 === null || !desk.matches) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1), true); x0 = null; }, { passive: true });
    var st = 0;
    track.addEventListener('scroll', function () {
      if (desk.matches) return; clearTimeout(st);
      st = setTimeout(function () {
        var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 1e9;
        items.forEach(function (it, k) { var d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
        if (best !== cur) { mark(best); restart(); }
      }, 90);
    }, { passive: true });
    mark(0); if (!desk.matches) track.scrollLeft = 0; restart();
  }
})();
