// The "page not found" party: fireworks, party blowers and (only if asked) sound.
// No libraries and no audio files: the sounds are made in the browser.
(function () {
  var canvas = document.getElementById('party-canvas');
  var stage = document.getElementById('party');
  var soundBtn = document.getElementById('party-sound');
  var motionBtn = document.getElementById('party-motion');
  if (!canvas || !stage || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1;
  var rockets = [], sparks = [];
  var running = false, soundOn = false, rafId = 0, last = 0;
  var nextRocket = 0, nextToot = 0, tootSide = 0;
  var COLOURS = ['#fbed13', '#ffffff', '#ff5fa2', '#3fd0ff', '#7dff6b', '#ff9a3c', '#c79bff'];
  var blowers = stage.querySelectorAll('.blower');
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------------------------------------------------------------- sound
  var ac = null, master = null, noiseBuf = null;
  function audio() {
    if (ac) return ac;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ac;
  }
  function noise(type, freq, q, peak, attack, decay, when) {
    var t = (when || ac.currentTime);
    var src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    var f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    var g = ac.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random()); src.stop(t + attack + decay + 0.05);
    return f;
  }
  function soundBang() {
    if (!soundOn || !ac) return;
    var f = noise('lowpass', 900, 0.7, 0.9, 0.005, 0.5);
    f.frequency.exponentialRampToValueAtTime(120, ac.currentTime + 0.45);
    for (var i = 0; i < 6; i++) noise('highpass', 3500, 0.5, 0.12, 0.002, 0.04, ac.currentTime + rand(0.15, 0.9));
  }
  function soundWhistle() {
    if (!soundOn || !ac) return;
    var t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(rand(500, 700), t);
    o.frequency.exponentialRampToValueAtTime(rand(1500, 2100), t + 0.55);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.65);
  }
  function soundToot() {
    if (!soundOn || !ac) return;
    var t = ac.currentTime, base = rand(380, 470), len = rand(0.45, 0.7);
    var f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 2.5;
    var g = ac.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
    g.gain.setValueAtTime(0.5, t + len - 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    var buzz = ac.createOscillator(), buzzGain = ac.createGain();
    buzz.type = 'sine'; buzz.frequency.value = 38; buzzGain.gain.value = 14;
    buzz.connect(buzzGain); buzz.start(t); buzz.stop(t + len);
    [1, 1.012].forEach(function (detune) {
      var o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(base * detune * 0.92, t);
      o.frequency.linearRampToValueAtTime(base * detune * 1.12, t + 0.12);
      o.frequency.linearRampToValueAtTime(base * detune, t + len);
      buzzGain.connect(o.frequency);
      o.connect(f); o.start(t); o.stop(t + len);
    });
    f.connect(g); g.connect(master);
  }
  function soundCheer() {
    if (!soundOn || !ac) return;
    var t = ac.currentTime;
    noise('bandpass', 1100, 0.5, 0.22, 0.5, 1.8, t);
    noise('bandpass', 2400, 0.8, 0.1, 0.7, 1.4, t + 0.1);
    for (var i = 0; i < 5; i++) {
      var s = t + rand(0, 1.2), o = ac.createOscillator(), g = ac.createGain(), p = rand(480, 760);
      o.type = 'triangle'; o.frequency.setValueAtTime(p, s);
      o.frequency.linearRampToValueAtTime(p * 1.5, s + 0.25);
      o.frequency.linearRampToValueAtTime(p * 1.1, s + 0.6);
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.045, s + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.65);
      o.connect(g); g.connect(master); o.start(s); o.stop(s + 0.7);
    }
  }

  // ---------------------------------------------------------------- pictures
  function launch() {
    rockets.push({ x: rand(W * 0.12, W * 0.88), y: H + 10, vx: rand(-40, 40), vy: -rand(H * 0.9, H * 1.25),
      targetY: rand(H * 0.12, H * 0.5), colour: COLOURS[Math.floor(Math.random() * COLOURS.length)] });
    soundWhistle();
  }
  function explode(r) {
    var n = W < 500 ? 46 : 80, second = COLOURS[Math.floor(Math.random() * COLOURS.length)];
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + rand(-0.05, 0.05), sp = rand(60, 230);
      sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.9, 1.6), age: 0,
        colour: i % 3 === 0 ? second : r.colour, size: rand(1.8, 3.4) });
    }
    soundBang();
  }
  function toot() {
    var b = blowers[tootSide % blowers.length]; tootSide++;
    if (!b) return;
    b.classList.add('toot');
    setTimeout(function () { b.classList.remove('toot'); }, 650);
    soundToot();
  }
  function frame(now) {
    if (!running) return;
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (now > nextRocket) { launch(); nextRocket = now + rand(450, 1200); }
    if (now > nextToot) { toot(); nextToot = now + rand(1800, 3400); }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (var i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      r.x += r.vx * dt; r.y += r.vy * dt; r.vy += 420 * dt;
      ctx.fillStyle = r.colour; ctx.beginPath(); ctx.arc(r.x, r.y, 2.2, 0, 6.3); ctx.fill();
      if (r.y <= r.targetY || r.vy >= -40) { explode(r); rockets.splice(i, 1); }
    }
    for (var j = sparks.length - 1; j >= 0; j--) {
      var s = sparks[j];
      s.age += dt; if (s.age >= s.life) { sparks.splice(j, 1); continue; }
      s.vx *= 0.985; s.vy = s.vy * 0.985 + 110 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      ctx.globalAlpha = 1 - s.age / s.life; ctx.fillStyle = s.colour;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- controls
  function start() {
    if (running) return;
    running = true; resize(); last = performance.now(); nextRocket = last; nextToot = last + 900;
    rafId = requestAnimationFrame(frame);
    motionBtn.textContent = 'Pause the party'; motionBtn.setAttribute('aria-pressed', 'false');
  }
  function stop() {
    running = false; cancelAnimationFrame(rafId);
    motionBtn.textContent = 'Restart the party'; motionBtn.setAttribute('aria-pressed', 'true');
  }
  motionBtn.addEventListener('click', function () { if (running) { stop(); } else { start(); } });
  soundBtn.addEventListener('click', function () {
    if (!soundOn) {
      if (!audio()) { soundBtn.textContent = 'Sound is not available'; soundBtn.disabled = true; return; }
      ac.resume(); soundOn = true;
      soundBtn.textContent = 'Turn the sound off'; soundBtn.setAttribute('aria-pressed', 'true');
      start(); soundCheer(); toot();
    } else {
      soundOn = false; if (ac) ac.suspend();
      soundBtn.textContent = 'Turn the sound on'; soundBtn.setAttribute('aria-pressed', 'false');
    }
  });
  window.addEventListener('resize', function () { if (running) resize(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && running) { cancelAnimationFrame(rafId); }
    else if (!document.hidden && running) { last = performance.now(); rafId = requestAnimationFrame(frame); }
  });

  // Start the pictures straight away, unless the visitor has asked for less motion.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    motionBtn.textContent = 'Start the party'; motionBtn.setAttribute('aria-pressed', 'true');
  } else {
    start();
  }
})();
