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

// Respect "reduce motion": show the still banner instead of the looping video.
(function () {
  var v = document.getElementById('banner-video');
  if (v && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    v.removeAttribute('autoplay');
    v.pause();
  }
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
      say('err', 'The online form is not switched on yet. Please call 020 7736 0800 or email angels@computerangels.co.uk.');
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
  seats.addEventListener('input', update);
  servers.addEventListener('input', update);
  update();
})();
