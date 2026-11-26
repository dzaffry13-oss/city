/* Избранное и «Поделиться»: хранится только в браузере посетителя (localStorage), без регистрации. */
(function () {
  var KEY = 'city_fav';
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  var SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>';
  var css = '.fav-btn{display:inline-grid;place-items:center;width:40px;height:40px;padding:0;border:1px solid rgba(255,255,255,.7);border-radius:50%;background:rgba(9,27,48,.68);color:#fff;cursor:pointer;font:inherit;-webkit-tap-highlight-color:transparent}'
    + '.fav-btn svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}'
    + '.fav-btn.on{color:#E8C476;border-color:#E8C476}.fav-btn.on svg{fill:#E8C476}'
    + '.fav-btn:focus-visible{outline:2px solid #E8C476;outline-offset:2px}'
    + '.city-toast{position:fixed;left:50%;bottom:calc(86px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:200;background:#101D36;color:#fff;border:1px solid rgba(232,196,118,.6);border-radius:12px;padding:11px 16px;font:600 14px/1.3 system-ui,sans-serif;max-width:calc(100vw - 32px);box-shadow:0 10px 30px rgba(0,0,0,.3)}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function read() { try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.map(String) : []; } catch (e) { return []; } }
  function write(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-200))); } catch (e) {} }

  function track(ev, id) {
    try {
      if (!id || localStorage.getItem('city_owner') || navigator.webdriver) return;
      var k = 'st:' + ev + ':' + id + ':' + new Date().toISOString().slice(0, 10);
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, '1');
      fetch('/api/stat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: String(id), ev: ev }), keepalive: true }).catch(function () {});
    } catch (e) {}
  }

  var toastTimer;
  function toast(t) {
    var el = document.querySelector('.city-toast');
    if (!el) { el = document.createElement('div'); el.className = 'city-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = t; el.hidden = false; clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  var C = {
    list: read,
    has: function (id) { return read().indexOf(String(id)) >= 0; },
    toggle: function (id) {
      id = String(id); if (!id) return false;
      var a = read(), i = a.indexOf(id), on = i < 0;
      if (on) { a.push(id); track('fav', id); } else a.splice(i, 1);
      write(a); C.paint();
      toast(on ? 'Добавлено в избранное' : 'Убрано из избранного');
      document.dispatchEvent(new Event('cityfav'));
      return on;
    },
    share: function (id, title) {
      id = String(id); if (!id) return;
      var url = location.origin + '/o/' + encodeURIComponent(id);
      track('share', id);
      if (navigator.share) {
        navigator.share({ title: (title || 'Объект') + ' — CITY', text: title || '', url: url }).catch(function () {});
        return;
      }
      var done = function () { toast('Ссылка скопирована'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt('Скопируйте ссылку:', url); });
      else window.prompt('Скопируйте ссылку:', url);
    },
    paint: function () {
      var a = read();
      document.querySelectorAll('[data-fav]').forEach(function (b) {
        var on = a.indexOf(String(b.dataset.fav)) >= 0;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.setAttribute('aria-label', on ? 'Убрать из избранного' : 'В избранное');
        var l = b.querySelector('[data-fav-label]'); if (l) l.textContent = on ? 'В избранном' : 'В избранное';
      });
      document.querySelectorAll('[data-fav-count]').forEach(function (n) { n.textContent = String(a.length); });
    },
    icons: { heart: HEART, share: SHARE },
  };
  window.cityFav = C;

  document.addEventListener('click', function (e) {
    var f = e.target.closest && e.target.closest('[data-fav]');
    if (f) { e.preventDefault(); e.stopPropagation(); C.toggle(f.dataset.fav); return; }
    var s = e.target.closest && e.target.closest('[data-share]');
    if (s) { e.preventDefault(); e.stopPropagation(); C.share(s.dataset.share, s.dataset.title); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', C.paint); else C.paint();
})();
