// Computer Angels website: the one piece of code that runs on Cloudflare.
//
// Everything on the site is still plain files. This script only answers
// /status.json, which the pages read to decide whether to show an automatic
// Public Service Announcement. It asks StatusGator which of the services on
// our board have problems, reads four official status feeds directly (Google
// Workspace, Cloudflare, Amazon Web Services, Dropbox: major outages only), and
// turns the result into ready-written announcements.
//
// The StatusGator token is a Cloudflare secret (STATUSGATOR_TOKEN). It is never
// sent to the browser and is not in this repository.

const API = 'https://statusgator.com/api/v3';
const FRESH_SECONDS = 180;        // ask StatusGator at most once every three minutes
const BOARD_SECONDS = 86400;      // remember which board is ours for a day

// Wording for the services we expect on the board. Anything else gets the general wording.
const KNOWN = [
  {
    match: /microsoft|office ?365|\bm365\b|outlook|exchange|teams/i,
    key: 'microsoft-365',
    headline: 'Microsoft 365 is having problems',
    happening: 'Microsoft is reporting a fault with Microsoft 365. Email, Teams and OneDrive may be slow or unavailable.',
    warnHeadline: 'Some problems reported with Microsoft 365',
    warnHappening: 'Problems are being reported with part of Microsoft 365. Most things should still work, but some may be slow or not working.',
    scope: '365 customers only',
    link: 'https://status.cloud.microsoft/'
  },
  {
    match: /apple|icloud/i,
    key: 'apple',
    headline: 'Apple services are having problems',
    happening: 'Apple is reporting a fault with its online services. iCloud, Apple Mail and the App Store may be slow or unavailable.',
    warnHeadline: 'Some problems reported with Apple services',
    warnHappening: 'Problems are being reported with some of Apple\'s online services. Most things should still work, but some may be slow or not working.',
    scope: 'Apple users only',
    link: 'https://www.apple.com/uk/support/systemstatus/'
  },
  {
    match: /google/i,
    key: 'google',
    headline: 'Google services are having problems',
    happening: 'Google is reporting a fault with its online services. Gmail, Calendar and Drive may be slow or unavailable.',
    warnHeadline: 'Some problems reported with Google services',
    warnHappening: 'Problems are being reported with some of Google\'s online services. Most things should still work, but some may be slow or not working.',
    scope: 'Google users only',
    link: 'https://www.google.com/appsstatus/dashboard/'
  },
  {
    match: /cloudflare/i,
    key: 'cloudflare',
    headline: 'Many websites may not load: Cloudflare fault',
    happening: 'Cloudflare, a network that a large share of websites and apps rely on, is reporting a major fault. Some websites and apps may not load.',
    warnHeadline: 'Some problems reported with Cloudflare',
    warnHappening: 'Problems are being reported with Cloudflare, a network that many websites rely on. Some websites may be slow or not load.',
    scope: 'Widespread',
    link: 'https://www.cloudflarestatus.com/'
  },
  {
    match: /amazon web services|\baws\b/i,
    key: 'aws',
    headline: 'Many websites and apps may not work: Amazon fault',
    happening: 'Amazon Web Services, which runs many well-known websites and apps, is reporting a major fault. Some websites and apps may not work.',
    warnHeadline: 'Some problems reported with Amazon Web Services',
    warnHappening: 'Problems are being reported with Amazon Web Services, which runs many websites and apps. Some may be slow or not working.',
    scope: 'Widespread',
    link: 'https://health.aws.amazon.com/health/status'
  },
  {
    match: /dropbox/i,
    key: 'dropbox',
    headline: 'Dropbox is having problems',
    happening: 'Dropbox is reporting a major fault. Files may not sync, open or share.',
    warnHeadline: 'Some problems reported with Dropbox',
    warnHappening: 'Problems are being reported with Dropbox. Most things should still work, but syncing may be slow.',
    scope: 'Dropbox users only',
    link: 'https://status.dropbox.com/'
  }
];
const TODO = 'Nothing is wrong with your computer and you do not need to call us. This notice clears by itself when the service recovers.';
const WARN_TODO = 'If something is not working, this may be why, and nothing is wrong with your computer. This notice clears by itself when the service recovers.';

function findToken(env) {
  for (const k of Object.keys(env)) {
    if (/statusgator/i.test(k) && typeof env[k] === 'string' && env[k].trim()) return env[k].trim();
  }
  return '';
}

async function api(path, token) {
  const r = await fetch(API + path, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('StatusGator answered ' + r.status);
  return r.json();
}

function londonParts(d) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  const p = {};
  for (const part of f.formatToParts(d)) p[part.type] = part.value;
  return p;
}

function clean(text, max) {
  return String(text || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// level is 'down' (a full outage: MODERATE strip) or 'warn' (a partial problem: LOW strip).
// A warning can come from StatusGator's own early detection before the provider admits
// anything, so the warn wording says problems "are being reported", not who reported them.
function announcement(monitor, level, downParts, now, test) {
  const name = clean(monitor.display_name, 60) || 'A service';
  const known = KNOWN.find((k) => k.match.test(name));
  const p = londonParts(now);
  const warn = level === 'warn';
  const a = known ? {
    key: known.key, headline: warn ? known.warnHeadline : known.headline, happening: warn ? known.warnHappening : known.happening, scope: known.scope, link: known.link
  } : {
    key: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    headline: warn ? 'Some problems reported with ' + name : name + ' is having problems',
    happening: warn ? 'Problems are being reported with ' + name + '. Most things should still work, but some may be slow or not working.' : name + ' is reporting a fault. It may be slow or unavailable.',
    scope: name + ' users only',
    link: ''
  };
  a.name = known ? name.replace(/\s+suite$/i, '') : name;
  if (downParts.length) a.happening += ' Affected right now: ' + downParts.join(', ') + '.';
  if (test) a.headline = 'TEST ONLY: ' + a.headline;
  return {
    // One id per service per day, so a visitor who closes the strip is not shown it again that day.
    id: (test ? 'test|' : 'auto|') + a.key + '|' + level + '|' + p.year + '-' + p.month + '-' + p.day,
    name: a.name,
    severity: warn ? 'low' : 'moderate',
    scope: a.scope,
    status: 'Ongoing',
    headline: a.headline,
    happening: a.happening,
    todo: warn ? WARN_TODO : TODO,
    updated: p.weekday + ' ' + p.day + ' ' + p.month + ', ' + p.hour + ':' + p.minute,
    link: a.link
  };
}

async function boardId(token, ctx, origin) {
  const key = new Request(origin + '/__cache/statusgator-board');
  const hit = await caches.default.match(key);
  if (hit) return hit.text();
  const boards = await api('/boards', token);
  const id = boards && boards.data && boards.data[0] && boards.data[0].id;
  if (!id) throw new Error('No StatusGator board found');
  ctx.waitUntil(caches.default.put(key, new Response(String(id), { headers: { 'Cache-Control': 'max-age=' + BOARD_SECONDS } })));
  return String(id);
}

// ---- StatusGator: our board of monitors. Returns [{ name, level, parts }].
async function fromStatusGator(token, ctx, origin) {
  const board = await boardId(token, ctx, origin);
  const monitors = ((await api('/boards/' + encodeURIComponent(board) + '/monitors', token)).data) || [];
  const found = [];
  for (const m of monitors) {
    const status = m.overridden_status || m.filtered_status || 'up';
    const item = { name: clean(m.display_name, 60), level: status, early_warning: !!m.early_warning_signal, parts: [] };
    found.push(item);
    if (status !== 'down' && status !== 'warn') continue;
    try {
      let parts = [];
      for (const wanted of (status === 'down' ? ['down'] : ['down', 'warn'])) {
        const c = await api('/boards/' + encodeURIComponent(board) + '/monitors/' + encodeURIComponent(m.id) + '/components?status=' + wanted + '&per_page=25', token);
        parts = parts.concat(((c && c.data) || []).map((x) => clean(x.name, 40)).filter(Boolean));
      }
      item.parts = parts.filter((x, i) => parts.indexOf(x) === i).slice(0, 4);
    } catch (e) { /* the list of affected parts is a nicety; carry on without it */ }
  }
  return found;
}

// ---- Official feeds read directly. Each returns 'down' for a major outage, otherwise 'up'.
// These only ever post for major outages: minor incidents are logged almost daily.
async function getJson(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(url + ' answered ' + r.status);
  return r.json();
}

// Cloudflare and Dropbox both publish the same standard format (Atlassian Statuspage).
async function statuspageLevel(base) {
  const d = await getJson(base + '/api/v2/incidents/unresolved.json');
  const serious = ((d && d.incidents) || []).some((i) => (i.impact === 'major' || i.impact === 'critical') && i.status !== 'resolved' && i.status !== 'postmortem');
  return serious ? 'down' : 'up';
}

// Google Workspace: an incident with no end time is still going on. Only a full
// SERVICE_OUTAGE of one of the everyday products counts.
const GOOGLE_PRODUCTS = /^(gmail|google (drive|calendar|docs|sheets|slides|meet|chat))$/i;
async function googleLevel(now) {
  const list = await getJson('https://www.google.com/appsstatus/dashboard/incidents.json');
  const week = 7 * 86400000;
  const serious = (list || []).some((i) => !i.end && i.status_impact === 'SERVICE_OUTAGE' &&
    now - Date.parse(i.begin) < week &&
    (i.affected_products || []).some((p) => GOOGLE_PRODUCTS.test(p.title || '')));
  return serious ? 'down' : 'up';
}

// Amazon Web Services: the feed is UTF-16 text. Only a disruption (status 3) of many
// services at once, in London, Ireland, the main US region or globally, counts.
const AWS_REGIONS = /^(eu-west-2|eu-west-1|us-east-1|global)$/;
function decodeUtf16(buffer) {
  const b = new Uint8Array(buffer);
  if (b.length < 2 || !((b[0] === 0xfe && b[1] === 0xff) || (b[0] === 0xff && b[1] === 0xfe) || b[0] === 0 || b[1] === 0)) {
    return new TextDecoder().decode(buffer); // ordinary UTF-8 after all
  }
  const big = (b[0] === 0xfe && b[1] === 0xff) || (b[0] === 0 && b[1] !== 0);
  let out = '';
  for (let i = 0; i + 1 < b.length; i += 2) {
    const unit = big ? (b[i] << 8) | b[i + 1] : (b[i + 1] << 8) | b[i];
    if (unit !== 0xfeff) out += String.fromCharCode(unit);
  }
  return out;
}
async function awsLevel() {
  const r = await fetch('https://health.aws.amazon.com/public/currentevents', { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('AWS answered ' + r.status);
  const events = JSON.parse(decodeUtf16(await r.arrayBuffer()));
  const serious = (events || []).some((e) => {
    const region = (String(e.arn || '').split(':')[3]) || '';
    const many = /multiple services/i.test(e.service_name || '') || Object.keys(e.impacted_services || {}).length >= 10;
    return String(e.status) === '3' && many && AWS_REGIONS.test(region);
  });
  return serious ? 'down' : 'up';
}

const DIRECT = [
  { name: 'Google Workspace', check: (now) => googleLevel(now) },
  { name: 'Cloudflare', check: () => statuspageLevel('https://www.cloudflarestatus.com') },
  { name: 'Amazon Web Services', check: () => awsLevel() },
  { name: 'Dropbox', check: () => statuspageLevel('https://status.dropbox.com') }
];

function keyFor(name) {
  const known = KNOWN.find((k) => k.match.test(name));
  return known ? known.key : name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function liveStatus(env, ctx, origin) {
  const token = findToken(env);
  const now = new Date();
  const sources = {};
  // Every source is asked at the same time and fails separately: one being
  // unreachable never hides what the others report.
  const jobs = [
    token ? fromStatusGator(token, ctx, origin).then((list) => { sources.statusgator = 'ok'; return list.map((x) => Object.assign(x, { source: 'statusgator' })); })
      .catch(() => { sources.statusgator = 'error'; return []; })
      : Promise.resolve([]).then((x) => { sources.statusgator = 'no token'; return x; })
  ].concat(DIRECT.map((d) => d.check(now.getTime())
    .then((level) => { sources[d.name] = 'ok'; return [{ name: d.name, level: level, early_warning: false, parts: [], source: 'direct' }]; })
    .catch(() => { sources[d.name] = 'error'; return []; })));
  const all = [].concat.apply([], await Promise.all(jobs));

  // If two sources watch the same service, keep the more serious reading.
  const rank = { down: 2, warn: 1 };
  const byKey = {};
  for (const item of all) {
    const k = keyFor(item.name);
    if (!byKey[k] || (rank[item.level] || 0) > (rank[byKey[k].level] || 0)) byKey[k] = item;
  }
  const announcements = [];
  for (const k of Object.keys(byKey)) {
    const item = byKey[k];
    if (item.level === 'down' || item.level === 'warn') announcements.push(announcement({ display_name: item.name }, item.level, item.parts, now, false));
  }
  // The page shows one notice: the most serious. It mentions any others by name.
  announcements.sort((x, y) => (x.severity === y.severity ? 0 : x.severity === 'moderate' ? -1 : 1));
  if (announcements.length > 1) {
    announcements[0].happening += ' Problems are also reported with: ' + announcements.slice(1).map((x) => x.name).join(', ') + '.';
  }
  return {
    configured: !!token,
    ok: sources.statusgator === 'ok',
    checked: now.toISOString(),
    sources: sources,
    services: all.map((x) => ({ name: x.name, status: x.level, early_warning: x.early_warning, source: x.source })),
    announcements: announcements
  };
}

function json(body, seconds) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=' + seconds,
      'X-Robots-Tag': 'noindex'
    }
  });
}

async function statusJson(request, env, ctx) {
  const url = new URL(request.url);
  // A harmless sample for looking at the design: /status.json?test=microsoft (or apple),
  // with &level=warn for the milder version.
  const test = url.searchParams.get('test');
  if (test) {
    const names = { microsoft: 'Microsoft 365', apple: 'Apple', google: 'Google Workspace', cloudflare: 'Cloudflare', aws: 'Amazon Web Services', dropbox: 'Dropbox' };
    const name = names[test.toLowerCase()] || 'Example Service';
    return json({ configured: !!findToken(env), ok: true, test: true, services: [], announcements: [announcement({ display_name: name }, url.searchParams.get('level') === 'warn' ? 'warn' : 'down', [], new Date(), true)] }, 0);
  }
  const key = new Request(url.origin + '/__cache/status.json');
  const hit = await caches.default.match(key);
  if (hit) return hit;
  let body, seconds = FRESH_SECONDS;
  try {
    body = await liveStatus(env, ctx, url.origin);
    if (!body.ok) seconds = 60; // StatusGator missing or unreachable: try again sooner
  } catch (e) {
    // Something unexpected: show nothing rather than guess.
    body = { configured: !!findToken(env), ok: false, services: [], announcements: [] };
    seconds = 60;
  }
  const response = json(body, seconds);
  ctx.waitUntil(caches.default.put(key, response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/status.json' && (request.method === 'GET' || request.method === 'HEAD')) {
      return statusJson(request, env, ctx);
    }
    // Everything else is a plain file (or the 404 page).
    return env.ASSETS.fetch(request);
  }
};
