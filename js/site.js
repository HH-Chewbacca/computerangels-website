// Computer Angels — small shared behaviours. No libraries.

// Hamburger menu on narrow screens.
(function () {
  var nav = document.getElementById('nav');
  var btn = nav && nav.querySelector('.nav-toggle');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();

// Banner video: a pause button (moving content must be stoppable),
// and no autoplay for people who ask their device to reduce motion.
(function () {
  var v = document.getElementById('banner-video');
  var btn = document.getElementById('banner-toggle');
  if (!v || !btn) return;
  var show = function () {
    btn.textContent = v.paused ? 'Play animation' : 'Pause animation';
    btn.setAttribute('aria-pressed', v.paused ? 'true' : 'false');
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    v.removeAttribute('autoplay');
    v.pause();
  }
  btn.addEventListener('click', function () { if (v.paused) { v.play(); } else { v.pause(); } });
  v.addEventListener('play', show);
  v.addEventListener('pause', show);
  show();
})();

// Enquiry form: send to Web3Forms without leaving the page.
// Without JavaScript the form still posts normally.
(function () {
  var form = document.getElementById('enquiry-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  var say = function (cls, msg) { status.className = 'form-status ' + cls; status.textContent = msg; };
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var key = form.elements['access_key'].value;
    if (!key || key.indexOf('YOUR_') === 0) {
      say('err', 'The online form is not switched on yet. Please call 020 7736 0800.');
      return;
    }
    // Subject starts with the customer's name so it threads in the office mailbox.
    form.elements['subject'].value = form.elements['name'].value.trim() + ' - website enquiry (' + form.elements['topic'].value + ')';
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    say('', '');
    fetch(form.action, { method: 'POST', headers: { 'Accept': 'application/json' }, body: new FormData(form) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.success) { form.reset(); say('ok', 'Thank you. Your message has been sent and we will be in touch shortly.'); }
        else { say('err', 'Sorry, that did not send. Please call 020 7736 0800.'); }
      })
      .catch(function () { say('err', 'Sorry, that did not send. Please call 020 7736 0800.'); })
      .then(function () { btn.disabled = false; });
  });
})();

// Guardian Angel calculator: £30 per user + £200 per server, per month, plus VAT.
(function () {
  var seats = document.getElementById('ga-seats');
  var servers = document.getElementById('ga-servers');
  if (!seats || !servers) return;
  var SEAT = 30, SERVER = 200, VAT = 0.2;
  var num = function (el) { var n = Math.floor(Number(el.value)); return n > 0 ? Math.min(n, Number(el.max)) : 0; };
  var gbp = function (n) { return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
  var update = function () {
    var net = num(seats) * SEAT + num(servers) * SERVER;
    document.getElementById('ga-net').textContent = gbp(net);
    document.getElementById('ga-vat').textContent = gbp(net * VAT);
    document.getElementById('ga-gross').textContent = gbp(net * (1 + VAT));
  };
  // Carry the numbers over to the contact form.
  var links = document.querySelectorAll('.ga-quote');
  var base = update;
  update = function () {
    base();
    for (var i = 0; i < links.length; i++) {
      links[i].href = 'contact-computer-angels.html?topic=guardian-angel&users=' + num(seats) + '&servers=' + num(servers) + '#enquiry';
    }
  };
  seats.addEventListener('input', update);
  servers.addEventListener('input', update);
  update();
})();

// Contact form: arriving from the Guardian Angel calculator pre-fills the enquiry.
(function () {
  var form = document.getElementById('enquiry-form');
  if (!form || !window.URLSearchParams) return;
  var q = new URLSearchParams(window.location.search);
  if (q.get('topic') !== 'guardian-angel') return;
  form.elements['topic'].value = 'Guardian Angel contract quote';
  var clean = function (v, max) { var n = Math.floor(Number(v)); return n >= 0 && n <= max ? n : null; };
  var users = clean(q.get('users'), 500), servers = clean(q.get('servers'), 50);
  if (users === null || servers === null || form.elements['message'].value) return;
  var net = users * 30 + servers * 200;
  form.elements['message'].value = 'Please send me a quote for Guardian Angel business support.\n' +
    'Users: ' + users + '\nServers: ' + servers + '\n' +
    'Calculator estimate: £' + net.toLocaleString('en-GB') + ' + VAT per month.\n';
})();

// Postcode checker: which Angel Zone a postcode is in. Districts read from the zone map.
(function () {
  var form = document.getElementById('pc-form');
  if (!form) return;
  var ZONES = {
    1: 'W1 W2 W3 W4 W6 W8 W9 W10 W11 W12 W14 WC1 WC2 SW1 SW2 SW3 SW4 SW5 SW6 SW7 SW8 SW9 SW10 SW11 SW12 SW13 SW14 SW15 SW17 SW18 SW19 SW20 KT1 KT2 KT3 KT4 KT5 KT6 KT7 KT8 KT9 KT10 KT19',
    2: 'NW1 NW2 NW3 NW5 NW6 NW8 NW10 N1 N5 N7 EC1 EC2 EC3 EC4 SE1 SE5 SE11 SE15 SE17 SE21 SE22 SE24 SE27 SW16 W5 W13 TW1 TW2 TW8 TW9 TW10 TW11 TW12 TW13 TW16 KT11 KT12 KT17 KT18 KT21 KT22 SM1 SM2 SM3 SM4 SM5 CR4',
    3: 'NW4 NW9 NW11 N2 N4 N6 N8 N10 N16 N19 E1 E2 E8 SE4 SE8 SE14 SE16 SE19 SE23 SE26 W7 UB1 UB2 UB6 TW3 TW4 TW5 TW7 TW14 TW15 TW17 KT13 KT14 KT20 KT23 KT24 SM6 SM7 CR0 CR5 CR7 CR8'
  };
  var TEXT = {
    1: 'is in Angel Zone 1: no travel surcharge.',
    2: 'is in Angel Zone 2: \u00a310 + VAT per visit (\u00a312 including VAT).',
    3: 'is in Angel Zone 3: \u00a320 + VAT per visit (\u00a324 including VAT).'
  };
  var lookup = {};
  for (var z in ZONES) { ZONES[z].split(' ').forEach(function (d) { lookup[d] = z; }); }
  var input = document.getElementById('pc-input');
  var out = document.getElementById('pc-result');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var raw = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // Outward code = area letters + district number, e.g. "SW6 5RA" -> SW6, "EC1A 1BB" -> EC1.
    var m = raw.match(/^([A-Z]{1,2})(\d{1,2})[A-Z]?(\d[A-Z]{2})?$/);
    if (!m) { out.textContent = 'Please enter a postcode, for example SW6 5RA.'; return; }
    var district = m[1] + m[2];
    var zone = lookup[district];
    out.textContent = zone
      ? district + ' ' + TEXT[zone]
      : district + ' is outside our zone map. Call us on 020 7736 0800 and we will tell you the travel charge.';
  });
})();

// ---------------------------------------------------------------------------
// Public Service Announcements.
// Reads /announcement.txt (plain "word: value" lines). If "show" is yes and the
// notice has not expired, shows it on every page: HIGH pops up once, then sits as
// a strip; MODERATE and LOW are a strip. All text is inserted as plain text.
// ---------------------------------------------------------------------------
(function () {
  var me = document.currentScript;
  if (!me || !window.fetch) return;
  var fileUrl;
  try { fileUrl = new URL('../announcement.txt', me.src).href; } catch (e) { return; }

  var LEVELS = {
    high: { word: 'HIGH', bars: 3, meaning: 'You probably cannot work until this is fixed.' },
    moderate: { word: 'MODERATE', bars: 2, meaning: 'Some things are slow or not working.' },
    low: { word: 'LOW', bars: 1, meaning: 'Worth knowing about. Nothing you need to do.' }
  };
  var SVG = 'http://www.w3.org/2000/svg';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVG, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function parse(text) {
    var out = {};
    text.split(/\r?\n/).forEach(function (line) {
      line = line.trim();
      if (!line || line.charAt(0) === '#') return;
      var i = line.indexOf(':');
      if (i < 1) return;
      out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
    });
    return out;
  }
  function expired(when) {
    if (!when) return false;
    var m = when.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/);
    if (!m) return false; // unreadable date: show the notice rather than hide it
    return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 23, m[5] ? +m[5] : 59).getTime() < Date.now();
  }
  function safeLink(url) { return /^https:\/\/[^\s]+$/i.test(url || '') ? url : ''; }
  function store(key, value) {
    try { if (value === undefined) return window.localStorage.getItem(key); window.localStorage.setItem(key, value); } catch (e) { /* private browsing */ }
    return null;
  }

  // The warning triangle with its exclamation mark.
  function triangle(size) {
    var s = svg('svg', { viewBox: '0 0 84 76', width: size, height: Math.round(size * 76 / 84), role: 'img', 'aria-label': 'Warning', 'class': 'psa-tri' });
    s.appendChild(svg('path', { d: 'M42 3 L81 73 L3 73 Z', fill: '#fbed13' }));
    s.appendChild(svg('rect', { x: 37.5, y: 26, width: 9, height: 26, fill: '#000' }));
    s.appendChild(svg('rect', { x: 37.5, y: 57, width: 9, height: 9, fill: '#000' }));
    return s;
  }
  // Checker: three rows of true squares on black, so the black squares run into the bar below.
  var checkId = 0;
  function checker(columns) {
    var id = 'psa-check-' + (++checkId);
    var s = svg('svg', { viewBox: '0 0 ' + columns + ' 3', preserveAspectRatio: 'none', 'shape-rendering': 'crispEdges', 'aria-hidden': 'true', 'class': 'psa-check' });
    s.style.aspectRatio = columns + ' / 3';
    var defs = svg('defs', {}), p = svg('pattern', { id: id, width: 2, height: 2, patternUnits: 'userSpaceOnUse' });
    p.appendChild(svg('rect', { x: 0, y: 0, width: 1, height: 1, fill: '#fbed13' }));
    p.appendChild(svg('rect', { x: 1, y: 1, width: 1, height: 1, fill: '#fbed13' }));
    defs.appendChild(p); s.appendChild(defs);
    s.appendChild(svg('rect', { x: 0, y: 0, width: columns, height: 3, fill: 'url(#' + id + ')' }));
    return s;
  }
  function bars(count, small) {
    var b = el('span', 'psa-bars' + (small ? ' small' : ''));
    b.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 3; i++) b.appendChild(el('span', i < count ? 'on' : ''));
    return b;
  }
  function severityRow(key) {
    var L = LEVELS[key], row = el('div', 'psa-level ' + key);
    row.appendChild(bars(L.bars));
    var t = el('div');
    t.appendChild(el('div', 'psa-big', L.word));
    t.appendChild(el('div', 'psa-meaning', L.meaning));
    row.appendChild(t);
    return row;
  }

  function build(a) {
    var level = LEVELS[a.severity];
    var id = [a.severity, a.headline, a.updated].join('|');
    var link = safeLink(a.link);

    // ---- the full card, shown in a dialog
    var dlg = el('dialog', 'psa-dialog');
    dlg.setAttribute('aria-labelledby', 'psa-title');
    var narrow = window.innerWidth < 640;
    dlg.appendChild(checker(narrow ? 21 : 45));

    var bar = el('div', 'psa-bar');
    var barText = el('div');
    barText.appendChild(el('div', 'psa-brand', 'COMPUTER ANGELS'));
    barText.appendChild(el('div', 'psa-name', 'PUBLIC SERVICE ANNOUNCEMENT'));
    bar.appendChild(barText); bar.appendChild(triangle(narrow ? 62 : 84));
    dlg.appendChild(bar);

    var body = el('div', 'psa-body');
    var h = el('h2', 'psa-headline', a.headline); h.id = 'psa-title';
    body.appendChild(h);

    var meta = el('div', 'psa-meta');
    var sev = el('div', 'psa-cell sev');
    sev.appendChild(el('div', 'psa-label', 'SEVERITY'));
    var sevLine = el('div', 'psa-sevline'); sevLine.appendChild(bars(level.bars)); sevLine.appendChild(el('span', 'psa-big', level.word));
    sev.appendChild(sevLine);
    var info = el('button', 'psa-info'); info.type = 'button'; info.setAttribute('aria-label', 'What the severity levels mean'); info.setAttribute('aria-expanded', 'false');
    info.appendChild(el('span', '', 'i'));
    sev.appendChild(info);
    meta.appendChild(sev);
    [['SCOPE', a.scope], ['STATUS', a.status]].forEach(function (pair) {
      if (!pair[1]) return;
      var c = el('div', 'psa-cell');
      c.appendChild(el('div', 'psa-label', pair[0]));
      c.appendChild(el('div', 'psa-big', pair[1].toUpperCase()));
      meta.appendChild(c);
    });
    body.appendChild(meta);

    [['What is happening.', a.happening], ['What to do.', a.todo]].forEach(function (pair) {
      if (!pair[1]) return;
      var p = el('p', 'psa-para');
      p.appendChild(el('b', '', pair[0] + ' '));
      p.appendChild(document.createTextNode(pair[1]));
      body.appendChild(p);
    });

    var foot = el('div', 'psa-foot');
    foot.appendChild(el('div', 'psa-updated', (a.updated ? 'Updated ' + a.updated + ' · ' : '') + '020 7736 0800'));
    var btns = el('div', 'psa-btns');
    if (link) {
      var more = el('a', 'psa-btn ghost', 'More details');
      more.href = link; more.target = '_blank'; more.rel = 'noopener';
      more.appendChild(el('span', 'vh', ' (opens in a new tab)'));
      btns.appendChild(more);
    }
    var ok = el('button', 'psa-btn', 'Got it'); ok.type = 'button';
    btns.appendChild(ok); foot.appendChild(btns); body.appendChild(foot);
    dlg.appendChild(body);

    // ---- the severity legend, opened by the "i" button
    var legend = el('div', 'psa-legend'); legend.hidden = true;
    var lbar = el('div', 'psa-legend-bar');
    lbar.appendChild(el('div', 'psa-legend-title', 'WHAT THE SEVERITY LEVELS MEAN'));
    var lclose = el('button', 'psa-x'); lclose.type = 'button'; lclose.setAttribute('aria-label', 'Close');
    lclose.appendChild(el('span', '', '×')); lbar.appendChild(lclose);
    legend.appendChild(lbar);
    var lbody = el('div', 'psa-legend-body');
    ['high', 'moderate', 'low'].forEach(function (k) { lbody.appendChild(severityRow(k)); });
    legend.appendChild(lbody); dlg.appendChild(legend);
    function showLegend(on) { legend.hidden = !on; info.setAttribute('aria-expanded', on ? 'true' : 'false'); (on ? lclose : info).focus(); }
    info.addEventListener('click', function () { showLegend(true); });
    lclose.addEventListener('click', function () { showLegend(false); });

    // ---- the strip across the top of the page
    var strip = el('aside', 'psa-strip'); strip.setAttribute('aria-label', 'Public service announcement');
    var sblock = el('div', 'psa-strip-block');
    sblock.appendChild(triangle(46));
    var sname = el('div');
    sname.appendChild(el('div', 'psa-brand', 'COMPUTER ANGELS'));
    sname.appendChild(el('div', 'psa-strip-name', 'PUBLIC SERVICE ANNOUNCEMENT'));
    sblock.appendChild(sname); strip.appendChild(sblock);
    var smid = el('div', 'psa-strip-mid');
    smid.appendChild(el('div', 'psa-strip-head', a.headline));
    var tags = el('div', 'psa-tags');
    var t1 = el('span', 'psa-tag sev'); t1.appendChild(bars(level.bars, true)); t1.appendChild(document.createTextNode('SEVERITY: ' + level.word));
    tags.appendChild(t1);
    if (a.scope) tags.appendChild(el('span', 'psa-tag', 'SCOPE: ' + a.scope.toUpperCase()));
    if (a.status) tags.appendChild(el('span', 'psa-tag', 'STATUS: ' + a.status.toUpperCase()));
    smid.appendChild(tags); strip.appendChild(smid);
    var sact = el('div', 'psa-strip-act');
    var details = el('button', 'psa-btn', 'Details'); details.type = 'button';
    var sx = el('button', 'psa-x dark'); sx.type = 'button'; sx.setAttribute('aria-label', 'Dismiss announcement'); sx.appendChild(el('span', '', '×'));
    sact.appendChild(details); sact.appendChild(sx); strip.appendChild(sact);

    function open() {
      legend.hidden = true;
      if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else { dlg.setAttribute('open', ''); }
      ok.focus();
    }
    function close() { if (dlg.close) { dlg.close(); } else { dlg.removeAttribute('open'); } }
    ok.addEventListener('click', close);
    dlg.addEventListener('close', function () { store('ca-psa-seen', id); details.focus(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); }); // click on the dimmed backdrop
    details.addEventListener('click', open);
    sx.addEventListener('click', function () { store('ca-psa-hidden', id); strip.remove(); });

    document.body.appendChild(dlg);
    if (store('ca-psa-hidden') !== id) document.body.insertBefore(strip, document.body.firstChild);
    // HIGH pops up once per visitor per announcement; after that only the strip shows.
    if (a.severity === 'high' && store('ca-psa-seen') !== id && store('ca-psa-hidden') !== id) open();
  }

  fetch(fileUrl, { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.text() : ''; })
    .then(function (text) {
      var a = parse(text);
      a.severity = (a.severity || '').toLowerCase();
      if (!/^(yes|y|true|on)$/i.test(a.show || '') || !LEVELS[a.severity] || !a.headline || expired(a.expires)) return;
      build(a);
    })
    .catch(function () { /* no announcement file, or offline: show nothing */ });
})();
