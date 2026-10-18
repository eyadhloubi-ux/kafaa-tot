/* كفاءة TOT — منطق العرض: شريحة واحدة في كل مرة على كل الشاشات */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var XL = 'http://www.w3.org/1999/xlink';
  var root = document.documentElement;
  var stage = document.getElementById('stage');
  var slides = [].slice.call(document.querySelectorAll('.slide'));
  var N = slides.length;
  var cur = -1;
  var MIN_SCALE = 0.7;
  var pad = function (n) { return String(n).padStart(2, '0'); };

  /* ---------- cover: nodes + flowing dots along the path ---------- */
  (function () {
    var g = document.getElementById('cvNodes');
    var path = document.getElementById(g.dataset.path);
    var labels = g.dataset.labels.split('|');
    var L = path.getTotalLength();
    labels.forEach(function (lab, i) {
      var t = i / (labels.length - 1);
      var p = path.getPointAtLength(L * t);
      var node = document.createElementNS(NS, 'g');
      node.setAttribute('class', 'cv-node' + (i === labels.length - 1 ? ' end' : ''));
      var ring = document.createElementNS(NS, 'circle');
      ring.setAttribute('class', 'ring'); ring.setAttribute('cx', p.x); ring.setAttribute('cy', p.y); ring.setAttribute('r', i === labels.length - 1 ? 12 : 9);
      var core = document.createElementNS(NS, 'circle');
      core.setAttribute('class', 'core'); core.setAttribute('cx', p.x); core.setAttribute('cy', p.y); core.setAttribute('r', i === labels.length - 1 ? 5 : 3.5);
      var below = p.y < 110;
      var tx = document.createElementNS(NS, 'text');
      tx.setAttribute('x', p.x); tx.setAttribute('y', below ? p.y + 40 : p.y - 26); tx.textContent = lab;
      var tn = document.createElementNS(NS, 'text');
      tn.setAttribute('class', 'n'); tn.setAttribute('x', p.x); tn.setAttribute('y', below ? p.y + 60 : p.y - 46); tn.textContent = pad(i + 1);
      node.appendChild(ring); node.appendChild(core); node.appendChild(tx); node.appendChild(tn);
      g.appendChild(node);
    });
  })();

  document.querySelectorAll('g[data-dots]').forEach(function (g) {
    var pid = g.dataset.dots, n = +g.dataset.n || 3, dur = +g.dataset.dur || 6, r = +g.dataset.r || 4;
    for (var k = 0; k < n; k++) {
      var begin = (k * dur / n).toFixed(2) + 's';
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', r); c.setAttribute('fill', '#D6C597'); c.setAttribute('opacity', '0');
      var am = document.createElementNS(NS, 'animateMotion');
      am.setAttribute('dur', dur + 's'); am.setAttribute('begin', begin); am.setAttribute('repeatCount', 'indefinite');
      var mp = document.createElementNS(NS, 'mpath');
      mp.setAttribute('href', '#' + pid); mp.setAttributeNS(XL, 'xlink:href', '#' + pid);
      am.appendChild(mp);
      var an = document.createElementNS(NS, 'animate');
      an.setAttribute('attributeName', 'opacity'); an.setAttribute('dur', dur + 's'); an.setAttribute('begin', begin);
      an.setAttribute('repeatCount', 'indefinite'); an.setAttribute('values', '0;1;1;0'); an.setAttribute('keyTimes', '0;.06;.92;1');
      c.appendChild(am); c.appendChild(an); g.appendChild(c);
    }
  });

  /* ---------- TOT dial: 20 day segments ---------- */
  (function () {
    var svg = document.getElementById('dayRing');
    if (!svg) return;
    var n = 20, R = 92, cx = 110, cy = 110, gap = 3.2;
    for (var k = 0; k < n; k++) {
      var a0 = (k * 360 / n + gap / 2) * Math.PI / 180, a1 = ((k + 1) * 360 / n - gap / 2) * Math.PI / 180;
      var d = 'M' + (cx + R * Math.cos(a0)).toFixed(2) + ' ' + (cy + R * Math.sin(a0)).toFixed(2) +
              ' A' + R + ' ' + R + ' 0 0 1 ' + (cx + R * Math.cos(a1)).toFixed(2) + ' ' + (cy + R * Math.sin(a1)).toFixed(2);
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d); p.setAttribute('class', 'seg'); p.style.setProperty('--i', k);
      svg.appendChild(p);
    }
  })();

  /* ---------- 50 leaders dots ---------- */
  (function () {
    var box = document.getElementById('dots50');
    if (!box) return;
    for (var k = 0; k < 50; k++) { var i = document.createElement('i'); i.style.setProperty('--i', k); box.appendChild(i); }
  })();

  var hooks = {};

  /* ---------- counters ---------- */
  function runCounters(s) {
    s.querySelectorAll('[data-count]').forEach(function (el) {
      var to = +el.dataset.count;
      clearTimeout(el._t); cancelAnimationFrame(el._r);
      el.textContent = '0';
      el._t = setTimeout(function () {
        var t0 = performance.now(), D = 1300;
        var f = function (now) {
          var p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * e).toLocaleString('en-US');
          if (p < 1) el._r = requestAnimationFrame(f);
        };
        el._r = requestAnimationFrame(f);
      }, 450);
    });
  }

  /* ---------- fit each slide to the screen ---------- */
  function fit() {
    slides.forEach(function (s) {
      var f = s.querySelector('.fit');
      if (!f) return;
      s.classList.remove('scroll');
      f.style.transform = 'none';
      var cs = getComputedStyle(s);
      var availH = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      var availW = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var scale = Math.min(1, availH / f.offsetHeight, availW / f.offsetWidth);
      if (scale < MIN_SCALE) s.classList.add('scroll');
      else f.style.transform = scale < 0.999 ? 'scale(' + scale.toFixed(3) + ')' : 'none';
    });
  }

  /* ---------- navigation UI ---------- */
  var rail = document.getElementById('rail');
  var mGrid = document.getElementById('mGrid');
  slides.forEach(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.dataset.goto = i + 1;
    b.setAttribute('aria-label', s.dataset.name);
    b.innerHTML = '<span>' + pad(i + 1) + '</span><span class="tip">' + s.dataset.name + '</span>';
    rail.appendChild(b);
    var c = document.createElement('button');
    c.type = 'button'; c.className = 'm-card'; c.dataset.goto = i + 1; c.style.setProperty('--i', i);
    c.innerHTML = '<span class="mn">' + pad(i + 1) + '</span><span class="mt">' + s.dataset.name + '</span><span class="mg">' + s.dataset.group + '</span>';
    mGrid.appendChild(c);
  });
  var railBtns = [].slice.call(rail.children);
  var mCards = [].slice.call(mGrid.children);
  var curTitle = document.getElementById('curTitle');
  var counter = document.getElementById('counter');
  var prog = document.querySelector('#progress i');
  var menu = document.getElementById('menu');

  function isScroll(s) { return s.classList.contains('scroll'); }
  function atTop(s) { return s.scrollTop <= 2; }
  function atBottom(s) { return s.scrollTop + s.clientHeight >= s.scrollHeight - 2; }

  function go(i) {
    i = Math.max(0, Math.min(N - 1, i));
    if (i === cur) return;
    var dir = cur < 0 ? 1 : (i > cur ? 1 : -1);
    stage.style.setProperty('--dir', dir);
    if (cur >= 0) {
      var old = slides[cur];
      old.classList.remove('active'); old.classList.add('leaving');
      setTimeout(function () { old.classList.remove('leaving'); }, 750);
      if (hooks[old.id]) hooks[old.id].leave();
    }
    cur = i;
    var s = slides[i];
    s.scrollTop = dir > 0 ? 0 : s.scrollHeight;
    s.classList.add('active');
    document.body.classList.toggle('is-dark', s.classList.contains('dark'));
    runCounters(s);
    if (hooks[s.id]) hooks[s.id].enter();
    railBtns.forEach(function (b, k) { b.classList.toggle('on', k === i); });
    mCards.forEach(function (b, k) { b.classList.toggle('on', k === i); });
    curTitle.textContent = s.dataset.name;
    counter.innerHTML = '<b>' + pad(i + 1) + '</b> / ' + pad(N);
    prog.style.width = ((i + 1) / N * 100) + '%';
    try { history.replaceState(null, '', '#' + (i + 1)); } catch (err) {}
  }
  function next() { go(cur + 1); }
  function prev() { go(cur - 1); }

  function openMenu() { menu.classList.add('open'); menu.setAttribute('aria-hidden', 'false'); }
  function closeMenu() { menu.classList.remove('open'); menu.setAttribute('aria-hidden', 'true'); }
  document.getElementById('menuBtn').addEventListener('click', openMenu);
  document.getElementById('menuClose').addEventListener('click', closeMenu);
  menu.addEventListener('click', function (e) { if (e.target === menu || e.target.classList.contains('m-inner')) closeMenu(); });

  var fsBtn = document.getElementById('fsBtn');
  if (!document.fullscreenEnabled) fsBtn.hidden = true;
  fsBtn.addEventListener('click', function () {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else { var p = root.requestFullscreen(); if (p && p.catch) p.catch(function () { fsBtn.hidden = true; }); }
    } catch (err) { fsBtn.hidden = true; }
  });

  document.getElementById('nextBtn').addEventListener('click', function (e) { e.stopPropagation(); next(); });
  document.getElementById('prevBtn').addEventListener('click', function (e) { e.stopPropagation(); prev(); });

  /* goto links + click on empty slide area advances (mouse only) */
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-goto]');
    if (g) { e.stopPropagation(); closeMenu(); go(+g.dataset.goto - 1); return; }
    if (!finePointer || menu.classList.contains('open')) return;
    if (e.target.closest('#topbar,#rail,#pager,button,a')) return;
    if (e.target.closest('#stage')) next();
  });

  /* wheel */
  var lockUntil = 0, acc = 0, accT;
  window.addEventListener('wheel', function (e) {
    if (menu.classList.contains('open')) return;
    var s = slides[cur];
    var d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (isScroll(s) && ((d > 0 && !atBottom(s)) || (d < 0 && !atTop(s)))) return;
    e.preventDefault();
    var now = performance.now();
    if (now < lockUntil) { lockUntil = Math.max(lockUntil, now + 220); return; }
    acc += d; clearTimeout(accT); accT = setTimeout(function () { acc = 0; }, 180);
    if (Math.abs(acc) > 35) { if (acc > 0) next(); else prev(); acc = 0; lockUntil = now + 850; }
  }, { passive: false });

  /* keys */
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (menu.classList.contains('open')) closeMenu(); else openMenu(); return; }
    if (menu.classList.contains('open')) return;
    if ((e.key === ' ' || e.key === 'Enter') && e.target.closest && e.target.closest('button')) return;
    var s = slides[cur];
    if (['ArrowDown', 'PageDown', ' ', 'ArrowLeft', 'Enter'].indexOf(e.key) > -1) {
      if (isScroll(s) && !atBottom(s) && (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ')) return;
      e.preventDefault(); next();
    } else if (['ArrowUp', 'PageUp', 'ArrowRight', 'Backspace'].indexOf(e.key) > -1) {
      if (isScroll(s) && !atTop(s) && (e.key === 'ArrowUp' || e.key === 'PageUp')) return;
      e.preventDefault(); prev();
    } else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(N - 1);
    else if (e.key === 'm' || e.key === 'M') openMenu();
    else if (e.key === 'f' || e.key === 'F') fsBtn.click();
  });

  /* touch: vertical or horizontal swipe */
  var ty0 = null, tx0 = null, sTop = true, sBot = true;
  window.addEventListener('touchstart', function (e) {
    if (menu.classList.contains('open')) { ty0 = null; return; }
    var s = slides[cur];
    ty0 = e.touches[0].clientY; tx0 = e.touches[0].clientX;
    sTop = !isScroll(s) || atTop(s); sBot = !isScroll(s) || atBottom(s);
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (!menu.classList.contains('open') && !isScroll(slides[cur])) e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchend', function (e) {
    if (ty0 === null) return;
    var dy = ty0 - e.changedTouches[0].clientY, dx = tx0 - e.changedTouches[0].clientX;
    ty0 = null;
    if (Math.max(Math.abs(dy), Math.abs(dx)) < 50) return;
    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy > 0 && sBot) next(); else if (dy < 0 && sTop) prev();
    } else {
      if (dx < 0) next(); else prev();   // RTL: swipe right = forward
    }
  }, { passive: true });

  /* start */
  var resizeT;
  window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(fit, 80); });
  window.addEventListener('hashchange', function () { var h = parseInt(location.hash.slice(1), 10); if (h) go(h - 1); });
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  var h0 = parseInt(location.hash.slice(1), 10);
  go(h0 && h0 >= 1 && h0 <= N ? h0 - 1 : 0);
})();
