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
