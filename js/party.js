// The "page not found" party: fireworks and (only if asked) sound.
// No libraries. Sound comes from three short recordings in /audio.
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
  var nextRocket = 0, nextToot = 0;
  var COLOURS = ['#fbed13', '#ffffff', '#ff5fa2', '#3fd0ff', '#7dff6b', '#ff9a3c', '#c79bff'];
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------------------------------------------------------------- sound
  // Three short recordings, fetched only if the visitor turns the sound on.
  var FILES = { blower: '/audio/party-blower.mp3', fireworks: '/audio/fireworks.mp3', cheer: '/audio/cheer.mp3' };
  var ac = null, master = null, buffers = {}, loaded = null, bed = null, cheerTimer = 0;
  function audio() {
    if (loaded) return loaded;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !window.fetch) return (loaded = Promise.reject(new Error('no audio')));
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
    loaded = Promise.all(Object.keys(FILES).map(function (name) {
      return fetch(FILES[name])
        .then(function (r) { if (!r.ok) throw new Error(name); return r.arrayBuffer(); })
        .then(function (data) { return new Promise(function (ok, fail) { ac.decodeAudioData(data, ok, fail); }); })
        .then(function (buf) { buffers[name] = buf; });
    }));
    return loaded;
  }
  function play(name, volume, loop, rate) {
    if (!ac || !buffers[name]) return null;
    var src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = buffers[name]; src.loop = !!loop; src.playbackRate.value = rate || 1;
    g.gain.value = volume; src.connect(g); g.connect(master); src.start();
    return src;
  }
  function soundToot() { if (soundOn) play('blower', 0.9, false, rand(0.94, 1.08)); }
  function soundCheer() {
    if (!soundOn) return;
    play('cheer', 0.75);
    clearTimeout(cheerTimer);
    cheerTimer = setTimeout(function () { if (soundOn && running) soundCheer(); }, rand(11000, 16000));
  }
  function soundBed() { if (soundOn && !bed) bed = play('fireworks', 0.6, true); }

  // ---------------------------------------------------------------- pictures
  function launch() {
    rockets.push({ x: rand(W * 0.12, W * 0.88), y: H + 10, vx: rand(-40, 40), vy: -rand(H * 0.9, H * 1.25),
      targetY: rand(H * 0.12, H * 0.5), colour: COLOURS[Math.floor(Math.random() * COLOURS.length)] });
  }
  function explode(r) {
    var n = W < 500 ? 46 : 80, second = COLOURS[Math.floor(Math.random() * COLOURS.length)];
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + rand(-0.05, 0.05), sp = rand(60, 230);
      sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.9, 1.6), age: 0,
        colour: i % 3 === 0 ? second : r.colour, size: rand(1.8, 3.4) });
    }
  }
  function toot() { soundToot(); }
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
    if (ac && soundOn) ac.resume();
    running = true; resize(); last = performance.now(); nextRocket = last; nextToot = last + 900;
    rafId = requestAnimationFrame(frame);
    motionBtn.textContent = 'Pause the party'; motionBtn.setAttribute('aria-pressed', 'false');
  }
  function stop() {
    running = false; cancelAnimationFrame(rafId);
    if (ac) ac.suspend();
    motionBtn.textContent = 'Restart the party'; motionBtn.setAttribute('aria-pressed', 'true');
  }
  motionBtn.addEventListener('click', function () { if (running) { stop(); } else { start(); } });
  soundBtn.addEventListener('click', function () {
    if (soundOn) {
      soundOn = false; clearTimeout(cheerTimer); if (ac) ac.suspend();
      soundBtn.textContent = 'Turn the sound on'; soundBtn.setAttribute('aria-pressed', 'false');
      return;
    }
    soundBtn.disabled = true; soundBtn.textContent = 'Loading sound\u2026';
    audio().then(function () {
      soundOn = true; soundBtn.disabled = false;
      soundBtn.textContent = 'Turn the sound off'; soundBtn.setAttribute('aria-pressed', 'true');
      ac.resume(); start(); soundBed(); soundCheer(); toot();
    }).catch(function () {
      soundBtn.textContent = 'Sound is not available';
    });
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
