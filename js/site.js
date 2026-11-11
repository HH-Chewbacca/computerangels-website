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
