/* י.ס פינוי פסולת: page behaviour (menu, quote builder, call fallback, forms, map, city personalisation) */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  if (!root.getAttribute('dir')) root.setAttribute('dir', 'rtl');
  if (!root.getAttribute('lang')) root.setAttribute('lang', 'he');
  root.classList.add('js');
  var bodyCls = d.querySelector('[data-body-class]');
  if (bodyCls) bodyCls.getAttribute('data-body-class').split(/\s+/).forEach(function (c) { if (c) d.body.classList.add(c); });

  var WA = '972506672195';
  function waHref(text) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text); }
  function $(sel, ctx) { return (ctx || d).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); }

  /* ---------- mobile menu ---------- */
  var menuBtn = $('[data-menu]');
  if (menuBtn) {
    var menu = d.getElementById(menuBtn.getAttribute('aria-controls'));
    menuBtn.addEventListener('click', function () {
      var open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      menuBtn.setAttribute('aria-label', open ? 'פתיחת תפריט' : 'סגירת תפריט');
      if (menu) menu.hidden = open;
    });
  }

  /* ---------- sheets (call fallback) ---------- */
  var lastFocus = null;
  function openSheet(id) {
    var s = d.getElementById(id);
    if (!s) return;
    lastFocus = d.activeElement;
    s.hidden = false;
    d.body.classList.add('lock');
    var f = $('[data-autofocus]', s) || $('button', s);
    if (f) f.focus();
  }
  function closeSheet(s) {
    s.hidden = true;
    d.body.classList.remove('lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  d.addEventListener('click', function (e) {
    var t = e.target;
    var closer = t.closest ? t.closest('[data-close]') : null;
    if (closer) { var s = closer.closest('.sheet'); if (s) closeSheet(s); return; }
    if (t.classList && t.classList.contains('sheet')) { closeSheet(t); }
  });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') $$('.sheet').forEach(function (s) { if (!s.hidden) closeSheet(s); });
  });

  /* a tel: link can be blocked when the page is shown inside another app's frame: there, if the page is still
     in front a moment later, show the number. On the open web the phone's own dialer handles it. */
  var embedded = (function () { try { return window.self !== window.top; } catch (err) { return true; } })();
  if (embedded) d.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-call]') : null;
    if (!a) return;
    var left = false;
    function gone() { if (d.visibilityState === 'hidden') left = true; }
    function blurred() { left = true; }
    d.addEventListener('visibilitychange', gone);
    window.addEventListener('blur', blurred);
    setTimeout(function () {
      d.removeEventListener('visibilitychange', gone);
      window.removeEventListener('blur', blurred);
      if (!left) openSheet('callsheet');
    }, 1300);
  });

  /* copy buttons */
  d.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-copy]') : null;
    if (!b) return;
    var text = b.getAttribute('data-copy');
    var label = b.textContent;
    function done() { b.textContent = 'המספר הועתק'; setTimeout(function () { b.textContent = label; }, 1800); }
    function select() {
      var el = d.getElementById(b.getAttribute('data-copy-target'));
      if (!el) return;
      var r = d.createRange(); r.selectNodeContents(el);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    }
    try {
      navigator.clipboard.writeText(text).then(done, select);
    } catch (err) { select(); }
  });

  /* ---------- quote builder ---------- */
  var SVC = {
    binyan: { label: 'פינוי פסולת בניין', rec: 'אם השיפוץ עוד נמשך: מכולה שעומדת אצלכם לאורך העבודה. אם הפסולת כבר בערימה: משאית המנוף מעמיסה הכול בבת אחת.' },
    gushit: { label: 'פינוי פסולת גושית ורהיטים', rec: 'משאית מנוף עם גראפ. מעמיסים ישר מהחצר או מהמדרכה, בלי לסחוב ובלי מכולה.' },
    gezem: { label: 'פינוי גזם', rec: 'משאית מנוף עם גראפ, שמעמיסה ערימות גזם גדולות בבת אחת. גוזמים לאורך זמן? אפשר מכולה.' },
    barzel: { label: 'פינוי ברזל וגרוטאות', rec: 'משאית מנוף עם גראפ לברזל ולגרוטאות כבדות. ברזל שמצטבר אצלכם כל הזמן? מכולה ייעודית לברזל.' },
    esek: { label: 'פינוי מוסך, מחסן או עסק', rec: 'פינוי חד־פעמי עם משאית מנוף כשמפנים מקום, או מכולה קבועה שמוחלפת לפי קריאה.' },
    mechola: { label: 'השכרת מכולה', rec: 'מכולה בגודל שמתאים לעבודה. אנחנו מציבים, אתם ממלאים בקצב שלכם, ואנחנו מפנים ומחליפים כשהיא מתמלאת.' },
    guf: { label: 'עבודה לרשות, מוסד או קבלן', rec: 'שיחת היכרות קצרה, ואחריה הצעה מסודרת לעבודה שוטפת, לפרויקט או לקריאות לפי צורך.' }
  };
  var WHEN = { today: 'היום', tomorrow: 'מחר', week: 'השבוע', price: 'רק בודק/ת מחיר כרגע' };
  var wiz = d.getElementById('wiz');
  function wizUpdate() {
    if (!wiz) return;
    $$('.tile, .chip', wiz).forEach(function (l) {
      var i = $('input', l);
      if (i) l.classList.toggle('is-on', i.checked);
    });
    var s = $('input[name="svc"]:checked', wiz);
    var w = $('input[name="when"]:checked', wiz);
    var svc = SVC[s ? s.value : 'binyan'];
    var placeSel = d.getElementById('wiz-place');
    var place = '';
    if (placeSel && placeSel.value) place = placeSel.options[placeSel.selectedIndex].getAttribute('data-name') || placeSel.options[placeSel.selectedIndex].text;
    var lines = [
      'שלום, הגעתי מהאתר של י.ס פינוי פסולת.',
      'צריך: ' + svc.label,
      'איפה: ' + (place || 'אפרט בהודעה'),
      'מתי: ' + WHEN[w ? w.value : 'week'],
      'מצרף/ת תמונה של מה שצריך לפנות.'
    ];
    var msg = lines.join('\n');
    var rec = d.getElementById('wiz-rec'); if (rec) rec.textContent = svc.rec;
    var out = d.getElementById('wiz-msg'); if (out) out.textContent = msg;
    var send = d.getElementById('wiz-send'); if (send) send.href = waHref(msg);
  }
  if (wiz) {
    wiz.addEventListener('change', wizUpdate);
    wiz.addEventListener('submit', function (e) { e.preventDefault(); });
    wizUpdate();
  }

  /* ---------- forms that compose a WhatsApp message ---------- */
  $$('form[data-wa-form]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('.form-err', f);
      var missing = [];
      $$('[data-required]', f).forEach(function (el) {
        var ok = el.value.trim().length > 0;
        el.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok) missing.push(el.getAttribute('data-label'));
      });
      if (missing.length) {
        if (err) { err.hidden = false; err.textContent = 'חסר: ' + missing.join(', ') + '. מלאו ונסו שוב.'; }
        return;
      }
      if (err) err.hidden = true;
      var lines = [f.getAttribute('data-wa-intro') || 'שלום,'];
      $$('[data-label]', f).forEach(function (el) {
        var v = el.value.trim();
        if (!v) return;
        var txt = el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : v;
        lines.push(el.getAttribute('data-label') + ': ' + txt);
      });
      var out = $('.form-out', f.parentNode);
      var link = out ? $('a[data-wa-out]', out) : null;
      var prev = out ? $('.bubble', out) : null;
      var msg = lines.join('\n');
      if (prev) prev.textContent = msg;
      if (link) link.href = waHref(msg);
      if (out) { out.hidden = false; if (link) link.focus(); }
    });
  });

  /* ---------- mobile dock: step aside while the hero's own buttons are on screen ---------- */
  var dockEl = $('.dock'), heroCta = $('.hero .cta-row');
  if (dockEl && heroCta && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { dockEl.classList.toggle('is-away', en[0].isIntersecting); }).observe(heroCta);
  }

  /* ---------- map: draw the routes when the map comes into view ---------- */
  var maps = $$('.map[data-anim]');
  if (maps.length && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('play'); io.unobserve(en.target); }
      });
    }, { threshold: 0.35 });
    maps.forEach(function (m) { io.observe(m); });
  }

  /* ---------- campaign page: personalise to a city (#ashdod, chips) ---------- */
  var CITIES = window.YS_CITIES;
  if (CITIES) {
    var current = null;
    function setCity(slug, scroll) {
      var c = CITIES[slug];
      current = c ? slug : null;
      $$('[data-city-b]').forEach(function (el) { el.textContent = c ? c.b : el.getAttribute('data-city-b'); });
      $$('[data-city-name]').forEach(function (el) { el.textContent = c ? c.name : el.getAttribute('data-city-name'); });
      $$('[data-city-km]').forEach(function (el) { el.hidden = !c; if (c) el.querySelector('b').textContent = c.km; });
      $$('[data-city-chip]').forEach(function (b) { b.classList.toggle('home', b.getAttribute('data-city-chip') === current); b.setAttribute('aria-pressed', String(b.getAttribute('data-city-chip') === current)); });
      $$('a[data-wa-city]').forEach(function (a) {
        var base = a.getAttribute('data-wa-city');
        a.href = waHref(c ? base.replace('{city}', c.b) : base.replace(' {city}', ' בשפלה'));
      });
      var sel = d.getElementById('wiz-place');
      if (sel && c) { sel.value = slug; wizUpdate(); }
      if (c) d.title = 'פינוי פסולת ומכולות ' + c.b + ' | י.ס פינוי פסולת';
      if (scroll) { var top = d.getElementById('top'); if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
    $$('[data-city-chip]').forEach(function (b) {
      b.addEventListener('click', function () { setCity(b.getAttribute('data-city-chip'), true); });
    });
    var h = (location.hash || '').replace('#', '');
    if (CITIES[h]) setCity(h, false);
    window.addEventListener('hashchange', function () { var k = location.hash.replace('#', ''); if (CITIES[k]) setCity(k, true); });
  }

  /* ---------- photo guide: tick off the three shots ---------- */
  $$('[data-shoot]').forEach(function (sec) {
    var boxes = $$('input[data-shot]', sec), bars = $$('.shoot__meter i', sec), out = $('[data-shot-state]', sec);
    function upd() {
      var n = 0;
      boxes.forEach(function (b) { var l = b.closest('.shot'); if (l) l.classList.toggle('is-on', b.checked); if (b.checked) n++; });
      bars.forEach(function (b, i) { b.classList.toggle('on', i < n); });
      sec.classList.toggle('is-done', n === boxes.length);
      if (out) out.textContent = n === 0 ? 'סמנו כל תמונה שצילמתם'
        : n < boxes.length ? 'צילמתם ' + n + ' מתוך ' + boxes.length + '. עוד ' + (boxes.length - n === 1 ? 'אחת.' : 'שתיים.')
        : 'מעולה, יש לכם הכול. עכשיו שולחים.';
    }
    boxes.forEach(function (b) { b.addEventListener('change', function () { sec.classList.remove('play'); upd(); }); });
    /* a quick "shutter" pass over the three viewfinders the first time the section shows */
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var seen = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        seen.disconnect();
        sec.classList.add('play');
        setTimeout(function () { sec.classList.remove('play'); }, 2200);
      }, { threshold: 0.35 });
      seen.observe($('.shots', sec) || sec);
    }
  });

  /* ---------- contractor fast line: saved job sites, one-tap WhatsApp orders ---------- */
  var kav = $('[data-kav]');
  if (kav) (function () {
    var KEY = 'ys-kav-v1', MAX = 5, st = { sites: [], cur: '' }, stored = true, editing = null, armed = null;
    try {
      var raw = window.localStorage.getItem(KEY), o = raw ? JSON.parse(raw) : null;
      if (o && Array.isArray(o.sites)) st = o;
    } catch (err) { stored = false; }
    function save() { try { window.localStorage.setItem(KEY, JSON.stringify(st)); } catch (err) { stored = false; } }
    var form = $('[data-kav-form]', kav), panel = $('[data-kav-panel]', kav), errBox = $('[data-kav-err]', kav);
    var del = $('[data-kav-del]', kav), delLabel = del.textContent;
    var F = { name: d.getElementById('k-name'), addr: d.getElementById('k-addr'), kind: d.getElementById('k-kind'), phone: d.getElementById('k-phone'), note: d.getElementById('k-note') };
    function cur() { for (var i = 0; i < st.sites.length; i++) if (st.sites[i].id === st.cur) return st.sites[i]; return st.sites[0] || null; }
    function when() { var w = $('input[name="kwhen"]:checked', kav); return w ? w.value : 'היום'; }
    function message(line, s) {
      var l = ['שלום, כאן ' + s.name + '.', line, 'אתר: ' + s.addr, 'סוג פסולת: ' + s.kind, 'מתי: ' + when()];
      if (s.phone) l.push('טלפון באתר: ' + s.phone);
      if (s.note) l.push('הערה לנהג: ' + s.note);
      return l.join('\n');
    }
    function links() {
      var s = cur(); if (!s) return;
      $$('[data-kav-act]', kav).forEach(function (a) { a.href = waHref(message(a.getAttribute('data-kav-line'), s)); });
    }
    function fill(s) {
      ['name', 'addr', 'phone', 'note'].forEach(function (k) { F[k].value = s ? (s[k] || '') : ''; });
      F.kind.value = s ? s.kind : F.kind.options[0].value;
    }
    function disarm() { clearTimeout(armed); armed = null; del.classList.remove('is-armed'); del.textContent = delLabel; }
    function draw() {
      var s = cur(), showForm = editing !== null || !s;
      form.hidden = !showForm; panel.hidden = showForm;
      $('[data-kav-cancel]', kav).hidden = !s;
      var title = $('[data-kav-title]', kav);
      if (title) title.textContent = editing && editing !== 'new' ? 'עריכת פרטי האתר' : (s ? 'אתר עבודה נוסף' : 'פרטי אתר העבודה. ממלאים פעם אחת.');
      if (showForm) return;
      st.cur = s.id;
      var box = $('[data-kav-sites]', kav);
      box.innerHTML = '';
      if (st.sites.length > 1) st.sites.forEach(function (x) {
        var b = d.createElement('button');
        b.type = 'button'; b.textContent = x.addr; b.setAttribute('aria-pressed', String(x.id === s.id));
        b.addEventListener('click', function () { st.cur = x.id; save(); draw(); });
        box.appendChild(b);
      });
      $('[data-kav-addr]', kav).textContent = s.addr;
      $('[data-kav-meta]', kav).textContent = s.name + ' · ' + s.kind + (s.phone ? ' · ' + s.phone : '');
      $('[data-kav-new]', kav).hidden = st.sites.length >= MAX;
      var note = $('[data-kav-store]', kav);
      note.hidden = stored;
      if (!stored) note.textContent = 'הדפדפן הזה לא מאפשר לשמור. הכפתורים יעבדו עד שתסגרו את הדף.';
      disarm();
      links();
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = { name: F.name.value.trim(), addr: F.addr.value.trim(), kind: F.kind.value, phone: F.phone.value.trim(), note: F.note.value.trim() };
      var miss = [];
      if (!v.name) miss.push('שם');
      if (!v.addr) miss.push('כתובת האתר');
      F.name.setAttribute('aria-invalid', String(!v.name));
      F.addr.setAttribute('aria-invalid', String(!v.addr));
      if (miss.length) { errBox.hidden = false; errBox.textContent = 'חסר: ' + miss.join(', ') + '.'; (v.name ? F.addr : F.name).focus(); return; }
      errBox.hidden = true;
      if (editing && editing !== 'new') {
        st.sites.forEach(function (x) { if (x.id === editing) { Object.keys(v).forEach(function (k) { x[k] = v[k]; }); } });
        st.cur = editing;
      } else {
        v.id = 's' + Date.now().toString(36);
        st.sites.push(v);
        if (st.sites.length > MAX) st.sites.shift();
        st.cur = v.id;
      }
      editing = null;
      save();
      draw();
      var first = $('.kact--main', kav);
      if (first) first.focus();
    });
    $('[data-kav-cancel]', kav).addEventListener('click', function () { editing = null; errBox.hidden = true; draw(); });
    $('[data-kav-edit]', kav).addEventListener('click', function () { var s = cur(); editing = s.id; fill(s); draw(); F.addr.focus(); });
    $('[data-kav-new]', kav).addEventListener('click', function () {
      var s = cur(); editing = 'new'; fill(null); F.name.value = s ? s.name : ''; draw(); F.addr.focus();
    });
    del.addEventListener('click', function () {
      if (!armed) { del.classList.add('is-armed'); del.textContent = 'בטוחים? לחצו שוב'; armed = setTimeout(disarm, 4000); return; }
      var s = cur();
      st.sites = st.sites.filter(function (x) { return x.id !== s.id; });
      st.cur = st.sites[0] ? st.sites[0].id : '';
      save(); disarm();
      if (!st.sites.length) fill(null);
      draw();
    });
    kav.addEventListener('change', function (e) {
      if (e.target.name !== 'kwhen') return;
      $$('.kav__when .chip', kav).forEach(function (l) { l.classList.toggle('is-on', $('input', l).checked); });
      links();
    });
    draw();
  })();
})();
