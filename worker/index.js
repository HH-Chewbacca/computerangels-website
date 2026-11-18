// Computer Angels website: the one piece of code that runs on Cloudflare.
//
// Everything on the site is still plain files. This script only answers
// /status.json, which the pages read to decide whether to show an automatic
// Public Service Announcement. It asks StatusGator which of the services on
// our board are down, and turns that into ready-written announcements.
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
    warnHeadline: 'Microsoft 365 is reporting some problems',
    warnHappening: 'Microsoft is reporting a problem with part of Microsoft 365. Most things should still work, but some may be slow or not working.',
    scope: '365 customers only',
    link: 'https://status.cloud.microsoft/'
  },
  {
    match: /apple|icloud/i,
    key: 'apple',
    headline: 'Apple services are having problems',
    happening: 'Apple is reporting a fault with its online services. iCloud, Apple Mail and the App Store may be slow or unavailable.',
    warnHeadline: 'Apple is reporting some problems',
    warnHappening: 'Apple is reporting a problem with some of its online services. Most things should still work, but some may be slow or not working.',
    scope: 'Apple users only',
    link: 'https://www.apple.com/uk/support/systemstatus/'
  },
  {
    match: /google/i,
    key: 'google',
    headline: 'Google services are having problems',
    happening: 'Google is reporting a fault with its online services. Gmail, Calendar and Drive may be slow or unavailable.',
    warnHeadline: 'Google is reporting some problems',
    warnHappening: 'Google is reporting a problem with some of its online services. Most things should still work, but some may be slow or not working.',
    scope: 'Google users only',
    link: 'https://www.google.com/appsstatus/dashboard/'
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
  const r = await fetch(API + path, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
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
function announcement(monitor, level, downParts, now, test) {
  const name = clean(monitor.display_name, 60) || 'A service';
  const known = KNOWN.find((k) => k.match.test(name));
  const p = londonParts(now);
  const warn = level === 'warn';
  const a = known ? {
    key: known.key, headline: warn ? known.warnHeadline : known.headline, happening: warn ? known.warnHappening : known.happening, scope: known.scope, link: known.link
  } : {
    key: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    headline: name + (warn ? ' is reporting some problems' : ' is having problems'),
    happening: warn ? name + ' is reporting a problem. Most things should still work, but some may be slow or not working.' : name + ' is reporting a fault. It may be slow or unavailable.',
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

async function liveStatus(env, ctx, origin) {
  const token = findToken(env);
  if (!token) return { configured: false, ok: false, services: [], announcements: [] };
  const now = new Date();
  const board = await boardId(token, ctx, origin);
  const monitors = ((await api('/boards/' + encodeURIComponent(board) + '/monitors', token)).data) || [];
  const services = [];
  const announcements = [];
  for (const m of monitors) {
    const status = m.overridden_status || m.filtered_status || 'up';
    services.push({ name: clean(m.display_name, 60), status: status, early_warning: !!m.early_warning_signal });
    if (status !== 'down' && status !== 'warn') continue;
    let parts = [];
    try {
      for (const wanted of (status === 'down' ? ['down'] : ['down', 'warn'])) {
        const c = await api('/boards/' + encodeURIComponent(board) + '/monitors/' + encodeURIComponent(m.id) + '/components?status=' + wanted + '&per_page=25', token);
        parts = parts.concat(((c && c.data) || []).map((x) => clean(x.name, 40)).filter(Boolean));
      }
      parts = parts.filter((x, i) => parts.indexOf(x) === i).slice(0, 4);
    } catch (e) { /* the list of affected parts is a nicety; carry on without it */ }
    announcements.push(announcement(m, status, parts, now, false));
  }
  // The page shows one notice: the most serious. It mentions any others by name.
  announcements.sort((x, y) => (x.severity === y.severity ? 0 : x.severity === 'moderate' ? -1 : 1));
  if (announcements.length > 1) {
    announcements[0].happening += ' Also reporting problems: ' + announcements.slice(1).map((x) => x.name).join(', ') + '.';
  }
  return { configured: true, ok: true, checked: now.toISOString(), services: services, announcements: announcements };
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
    const names = { microsoft: 'Microsoft 365', apple: 'Apple', google: 'Google Workspace' };
    const name = names[test.toLowerCase()] || 'Example Service';
    return json({ configured: !!findToken(env), ok: true, test: true, services: [], announcements: [announcement({ display_name: name }, url.searchParams.get('level') === 'warn' ? 'warn' : 'down', [], new Date(), true)] }, 0);
  }
  const key = new Request(url.origin + '/__cache/status.json');
  const hit = await caches.default.match(key);
  if (hit) return hit;
  let body, seconds = FRESH_SECONDS;
  try {
    body = await liveStatus(env, ctx, url.origin);
    if (!body.configured) seconds = 30;
  } catch (e) {
    // StatusGator unreachable or the token was refused: show nothing rather than guess.
    body = { configured: true, ok: false, services: [], announcements: [] };
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
