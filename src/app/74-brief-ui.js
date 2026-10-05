/* ============================================================
   THE DAY'S HERO (owner: Brief + Review). The top of Home's Today tab (#view=home;
   the tabs live in 77-brief-review.js, the Play button, the inline story and
   Ideas for today in 12-home-head.js). Once a separate "Morning brief" page; it
   became Home (user request, 4 Oct).
     - Home comes forward by itself on the first visit of each day (Settings >
       Home and stories), from "Start my day", the palette and the sidebar;
     - refreshes calendar, inbox and finances in the background through
       the existing jobs and connection gates (briefOrchestrate, 73-...);
     - lays the day out by what kind of day it is (briefDayType), with
       animated scenes (71-anim-library.js), a weather sky, kinetic text
       and an AI "day in 3 sentences" (server/routes/brief.mjs).
   Shared helpers here are used by the evening recap and the review too:
     animSceneHtml / animForEvent / animForTask / animActivate,
     briefPrefs, briefSkyHtml, briefCountUp, briefTypeText, kineticWordsHtml.
   Reduced motion (or Settings > Animations off): static first frames, no
   loops, no typing. Every loop pauses while the tab is hidden; at most
   ANIM_MAX_LIVE scenes animate at once.
   ============================================================ */
const ANIM_MAX_LIVE = 6;
/* Weather icons in Lucide's geometry (ISC, vendor/icons/Lucide-LICENSE.txt), inline because the
   sprite has only the plain cloud. Trusted constant markup. */
const _BF_CLOUD_BASE = '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/>';
const _BF_WX_SVG = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  partly: '<path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41M15.95 12.65a4 4 0 0 0-5.93-4.13"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
  partlyNight: '<path d="M13 16a3 3 0 1 1 0 6H7a5 5 0 1 1 4.9-6Z"/><path d="M10.1 9A6 6 0 0 1 16 4a4 4 0 0 0 6 6 6 6 0 0 1-3 5.2"/>',
  fog: _BF_CLOUD_BASE + '<path d="M16 17H7M17 21H9"/>',
  drizzle: _BF_CLOUD_BASE + '<path d="M8 19v1M8 14v1M16 19v1M16 14v1M12 21v1M12 16v1"/>',
  rain: _BF_CLOUD_BASE + '<path d="M16 14v6M8 14v6M12 16v6"/>',
  showers: _BF_CLOUD_BASE + '<path d="M16 14v2M8 14v2M12 16v4M16 19v2M8 19v1"/>',
  snow: _BF_CLOUD_BASE + '<path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01"/>',
  thunder: '<path d="M6 16.3A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 .5 9"/><path d="m13 12-3 5h4l-3 5"/>',
};
/** The weather icon for a condition (night versions for clear and partly cloudy). */
function briefWxIcon(cond, isDay, cls) {
  const k = cond === 'clear' ? (isDay === false ? 'moon' : 'sun') : cond === 'partly' ? (isDay === false ? 'partlyNight' : 'partly') : _BF_WX_SVG[cond] ? cond : 'cloud';
  const c = cls ? ' ' + String(cls).replace(/[^a-zA-Z0-9 _-]/g, '') : '';
  return `<svg class="i bf-wxi${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${_BF_WX_SVG[k]}</svg>`;
}
const _BF_TYPE_ICON = { birthday: 'cake', party: 'party-popper', flight: 'plane', train: 'train-front', deadline: 'hourglass', meeting: 'users', 'video-call': 'video' };

/* ---------- settings ---------- */
function briefPrefs() {
  const b = (APP_CONFIG && APP_CONFIG.brief) || {};
  const h = Number(b.eveningHour);
  return {
    autoOpen: b.autoOpen !== false, ai: b.ai !== false, model: b.model || 'claude-haiku-4-5',
    eveningHour: Number.isFinite(h) ? h : 17, animations: b.animations !== false, celebrate: b.celebrate !== false, units: b.units === 'imperial' ? 'imperial' : 'metric',
  };
}
function animEnabled() { return briefPrefs().animations && !(window.Motion && Motion.prefersReduced()); }
function _animSyncRoot() { document.documentElement.classList.toggle('anim-off', !animEnabled()); }
/** The user's scene settings (data): {rules:[{kw, type}], overrides:{key: type}}. */
function animPrefs() {
  const p = state.animPrefs && typeof state.animPrefs === 'object' ? state.animPrefs : {};
  return { rules: Array.isArray(p.rules) ? p.rules.filter(r => r && r.kw && r.type) : [], overrides: p.overrides && typeof p.overrides === 'object' ? p.overrides : {} };
}

/* ---------- scenes on the page ---------- */
let _animAi = null, _animAiLoading = false;
function animAiCache() {
  if (_animAi === null && !_animAiLoading && typeof _serverAvailable !== 'undefined' && _serverAvailable) {
    _animAiLoading = true;
    fetch('/api/brief/scenes', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => { _animAi = (j && j.types) || {}; }).catch(() => { _animAi = {}; }).finally(() => { _animAiLoading = false; });
  }
  return _animAi || {};
}
let _animNamesCache = null, _animNamesKey = '';
function _animNames() {
  const people = state.people || [];
  const key = people.length + ':' + (people[0] && people[0].id);
  if (_animNamesCache && key === _animNamesKey) return _animNamesCache;
  _animNamesKey = key;
  _animNamesCache = new Set(people.flatMap(p => [String(p.name || '').split(/\s+/)[0].toLowerCase(), ...(p.aliases || []).map(a => String(a).toLowerCase())]).filter(x => x.length >= 2));
  return _animNamesCache;
}
function _animOpts() { const p = animPrefs(); return { rules: p.rules, overrides: p.overrides, ai: animAiCache(), names: _animNames() }; }
const _animEvCache = new Map();
/** Scene for a calendar event (raw CalStore event). */
function animForEvent(ev) {
  if (!ev) return { type: 'event' };
  // The hour is in the key: a flight turns from takeoff to flight to landing (P13), at most hourly.
  const key = (ev.id || '') + '|' + (ev.summary || '') + '|' + JSON.stringify(animPrefs()) + '|' + Object.keys(animAiCache()).length + '|' + Math.floor(Clock.now() / 3600000);
  if (_animEvCache.has(key)) return _animEvCache.get(key);
  let start = null, minutes = 0, days = 1, calName = '', startMs = NaN, endMs = NaN;
  try {
    if (!ev.allDay && ev.start && ev.start.dateTime) { const s = calEventStart(ev), e = calEventEnd(ev); start = Clock.parts(s.getTime()).min; minutes = Math.round((e - s) / 60000); startMs = s.getTime(); endMs = e.getTime(); }
    const span = calEventDays(ev); days = Math.max(1, _calDaysBetween(span[0], span[1]) + 1);
    const c = calEventCalendar(ev); calName = c ? c.name : '';
  } catch (e) { /* partial event */ }
  const r = animClassify({ kind: 'event', title: ev.summary, description: ev.description, location: ev.location, link: !!(ev.conferenceUrl || ev.hangoutLink), attendees: (ev.attendees || []).length, start, minutes, allDay: !!ev.allDay, days, calendar: calName, eventType: ev.eventType, now: Clock.now(), startMs, endMs }, _animOpts());
  if (_animEvCache.size > 3000) _animEvCache.clear();
  _animEvCache.set(key, r);
  return r;
}
function _calDaysBetween(a, b) { return Math.round((_calParse(b) - _calParse(a)) / 86400000); }
/** Scene for a task. */
function animForTask(item) {
  if (!item) return { type: 'task' };
  const s = STREAMS[effStream(item)];
  return animClassify({ kind: 'task', id: item.id, title: effTitle(item), description: String(effDetail(item) || '').slice(0, 400), tags: effTags(item), stream: s ? s.label : '', priority: effPriority(item), dueToday: effDate(item) === todayStr() }, _animOpts());
}
/**
 * A scene's markup (trusted SVG from the registry). o: {size: xs|sm|md|lg|xl|hero,
 * once, urgent, hover (animates only while its host is hovered), label, cls}.
 */
function animSceneHtml(type, o) {
  o = o || {};
  const s = animScene(type);
  const cls = ['anim-scene', 'c-' + s.colour, 'sz-' + (o.size || 'md')];
  if (o.urgent) cls.push('is-urgent');
  if (o.once) cls.push('is-once');
  if (o.hover) cls.push('anim-hover-only');
  if (o.hero) cls.push('is-hero');
  if (o.cls) cls.push(o.cls);
  return `<span class="${cls.join(' ')}" data-scene="${escAttr(s.type)}"${o.label ? ` role="img" aria-label="${escAttr(o.label)}"` : ' aria-hidden="true"'}>${animSceneSvg(s.type)}</span>`;
}

/* Only the scenes on screen animate, at most ANIM_MAX_LIVE at a time (heroes first). */
let _animIO = null;
const _animVisible = new Set();
function animActivate(root) {
  _animSyncRoot();
  const scenes = [...(root || document).querySelectorAll('.anim-scene:not(.anim-hover-only)')];
  if (typeof IntersectionObserver === 'undefined') { scenes.slice(0, ANIM_MAX_LIVE).forEach(s => s.classList.add('is-live')); return; }
  if (!_animIO) _animIO = new IntersectionObserver((entries) => {
    for (const e of entries) { if (e.isIntersecting) _animVisible.add(e.target); else { _animVisible.delete(e.target); e.target.classList.remove('is-live'); } }
    _animRebalance();
  }, { threshold: 0.15 });
  for (const s of scenes) _animIO.observe(s);
}
function _animRebalance() {
  for (const el of [..._animVisible]) if (!el.isConnected) { _animVisible.delete(el); try { _animIO.unobserve(el); } catch (e) { /* gone */ } }
  const list = [..._animVisible].sort((a, b) => (b.classList.contains('is-hero') - a.classList.contains('is-hero')) || ((a.compareDocumentPosition(b) & 4) ? -1 : 1));
  list.forEach((el, i) => el.classList.toggle('is-live', i < ANIM_MAX_LIVE));
}
/** How many scenes animate right now (tests and the CPU check). */
function animLiveCount() { return document.querySelectorAll('.anim-scene.is-live').length; }
document.addEventListener('visibilitychange', () => {
  document.documentElement.classList.toggle('anim-paused', document.hidden);
  if (!document.hidden) { _bfTick(); _briefDayCheck(); }
});

/* ---------- kinetic text ---------- */
function kineticWordsHtml(text, startMs) {
  return String(text || '').split(/(\s+)/).filter(w => w.length).map((w, i) => /^\s+$/.test(w) ? w : `<span class="kw" style="--i:${i / 2 | 0};--d0:${Number(startMs) || 0}ms">${esc(w)}</span>`).join('');
}
function briefCountUp(el, n) {
  if (!el) return;
  if (animEnabled() && window.Motion && typeof Motion.countUp === 'function' && n > 0) Motion.countUp(el, n, { from: 0, duration: 900 });
  else el.textContent = String(n);
}
let _bfTypeTimer = null;
function briefTypeText(el, text, done) {
  if (!el) return;
  clearTimeout(_bfTypeTimer);
  if (!animEnabled() || document.hidden) { el.textContent = text; el.classList.remove('typing'); if (done) done(); return; }
  const chars = Array.from(String(text));
  let i = 0;
  el.classList.add('typing');
  const step = () => {
    if (!el.isConnected) return;
    if (document.hidden) { el.textContent = text; el.classList.remove('typing'); if (done) done(); return; }
    i = Math.min(chars.length, i + Math.max(1, Math.round(chars.length / 120)));
    el.textContent = chars.slice(0, i).join('');
    if (i < chars.length) _bfTypeTimer = setTimeout(step, 16);
    else { el.classList.remove('typing'); if (done) done(); }
  };
  step();
}

/* ---------- the weather sky ---------- */
/** cond: clear|partly|cloudy|fog|drizzle|rain|showers|snow|thunder|none; tod: briefTimeOfDay. Trusted markup. */
function briefSkyHtml(cond, tod, o) {
  o = o || {};
  let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = [];
  const night = tod === 'night' || tod === 'evening';
  const clearish = cond === 'clear' || cond === 'partly' || cond === 'none';
  if (tod === 'dawn' || tod === 'dusk' || tod === 'evening') p.push('<i class="sky-glow"></i>');
  // Partly cloudy: one cloud always rests by the sun (the drifting ones are off-screen half the time).
  if (clearish && !night) p.push(`<div class="sky-sun${tod === 'dusk' || o.setting ? ' setting' : ''}"><i class="sky-rays"></i><i class="sky-disc"></i>${cond === 'partly' ? '<i class="sky-cloud near"></i>' : ''}</div>`);
  if (night) {
    const n = clearish ? 26 : 10;
    for (let i = 0; i < n; i++) p.push(`<i class="sky-star" style="--x:${(rnd() * 100).toFixed(1)}%;--y:${(rnd() * 62).toFixed(1)}%;--d:${(rnd() * 5).toFixed(2)}s;--s:${(0.6 + rnd() * 1.2).toFixed(2)}"></i>`);
    if (clearish) p.push('<i class="sky-moon"></i>');
  }
  const clouds = { partly: 2, cloudy: 4, fog: 2, drizzle: 3, rain: 4, showers: 3, snow: 3, thunder: 4 }[cond] || 0;
  // Clouds keep to the top band, above the greeting.
  for (let i = 0; i < clouds; i++) p.push(`<i class="sky-cloud${/rain|thunder|showers/.test(cond) ? ' dark' : ''}" style="--y:${(3 + rnd() * 14).toFixed(1)}%;--cx:${(4 + rnd() * 56).toFixed(1)}vw;--s:${(0.7 + rnd() * 0.8).toFixed(2)};--d:${(-rnd() * 60).toFixed(1)}s;--t:${(55 + rnd() * 40).toFixed(0)}s"></i>`);
  const drops = { drizzle: 16, showers: 26, rain: 34, thunder: 34 }[cond] || 0;
  for (let i = 0; i < drops; i++) p.push(`<i class="sky-drop" style="--x:${(rnd() * 100).toFixed(1)}%;--d:${(-rnd() * 2).toFixed(2)}s;--t:${(0.7 + rnd() * 0.6).toFixed(2)}s;--h:${(10 + rnd() * 14).toFixed(0)}px"></i>`);
  if (cond === 'snow') for (let i = 0; i < 28; i++) p.push(`<i class="sky-flake" style="--x:${(rnd() * 100).toFixed(1)}%;--d:${(-rnd() * 9).toFixed(2)}s;--t:${(6 + rnd() * 6).toFixed(1)}s;--s:${(0.5 + rnd() * 0.9).toFixed(2)}"></i>`);
  if (cond === 'fog') for (let i = 0; i < 3; i++) p.push(`<i class="sky-fog" style="--y:${30 + i * 22}%;--d:${(-i * 7).toFixed(1)}s"></i>`);
  if (cond === 'thunder') p.push('<i class="sky-flash"></i>');
  // Extra weather layers (77-sky-ambient.css): wind, the thunder bolt, a rainbow after rain, heat haze.
  const x = o.extras || _bfSkyExtras();
  if (x.wind) {
    for (let i = 0; i < 5; i++) p.push(`<i class="sky-gust" style="--y:${(18 + rnd() * 60).toFixed(1)}%;--w:${(80 + rnd() * 90).toFixed(0)}px;--d:${(-rnd() * 3).toFixed(2)}s;--t:${(1.8 + rnd() * 1.2).toFixed(2)}s"></i>`);
    if (!night) for (let i = 0; i < 3; i++) p.push(`<i class="sky-leaf" style="--y:${(30 + rnd() * 50).toFixed(1)}%;--d:${(-rnd() * 6).toFixed(2)}s;--t:${(5 + rnd() * 3).toFixed(1)}s"><i style="--lc:${['#d9822b', '#c9a227', '#9bb24a'][i]}"></i></i>`);
  }
  if (x.bolt) p.push(`<i class="sky-bolt" style="--x:${(40 + rnd() * 40).toFixed(0)}%"></i>`);
  if (x.rainbow && !night) p.push('<i class="sky-rainbow"></i>');
  if (x.heat && !night) { p.push('<i class="sky-haze"></i>'); for (let i = 0; i < 3; i++) p.push(`<i class="sky-flare" style="--x:${(50 + rnd() * 40).toFixed(0)}%;--y:${(8 + rnd() * 30).toFixed(0)}%;--s:${(30 + rnd() * 40).toFixed(0)}px;--d:${(-rnd() * 6).toFixed(2)}s"></i>`); }
  // The real sky's moment or a festival sky (78-anim-wire.js; the sky and seasons packs): a small accent.
  const acc = o.accent === false || typeof animSkyAccentHtml !== 'function' ? '' : animSkyAccentHtml();
  if (acc) p.push(acc);
  const accKind = acc ? (/data-ap-sky="(\w+)"/.exec(acc) || [])[1] || '' : '';
  return `<div class="bf-sky${o.cls ? ' ' + escAttr(o.cls) : ''}"${accKind ? ` data-ap-sky="${escAttr(accKind)}"` : ''}${x.wind ? ' data-wind=""' : ''} data-cond="${escAttr(cond || 'none')}" data-tod="${escAttr(tod)}" aria-hidden="true">${p.join('')}</div>`;
}
/** Wind / rainbow / heat / bolt flags from the cached weather (09-motion-logic.js motionSkyExtras). */
function _bfSkyExtras() {
  try {
    const w = typeof _bf !== 'undefined' && _bf.weather && _bf.weather.ok ? _bf.weather : null;
    if (!w || typeof motionSkyExtras !== 'function') return {};
    const hour = typeof Clock !== 'undefined' ? Clock.parts().h : new Date().getHours();   // clock-ok: fallback where Clock is not loaded (tests)
    return motionSkyExtras(w, { hour, today: todayStrSafe() });
  } catch (e) { return {}; }
}
function _bfSunHours(w) {
  const h = (s) => { const m = _calMinOf(s); return m === null ? NaN : m / 60; };
  return { up: h(w && w.today && w.today.sunrise), down: h(w && w.today && w.today.sunset) };
}
function briefTod(w, d) {
  const p = Clock.parts(d ? d.getTime() : Clock.now());   // the hour where the user is (travel spec 2.7 P11)
  const sun = _bfSunHours(w);
  return briefTimeOfDay(p.h + p.mi / 60, sun.up, sun.down);
}
function _bfDeg(t) { return typeof t === 'number' && isFinite(t) ? Math.round(t) + '°' : '–'; }

/* ---------- data ---------- */
const _bf = {
  weather: null, weatherAt: 0, weatherLoading: false,
  money: null, moneyAt: 0, moneyLoading: false,
  summary: {}, summaryLoading: {},
  refresh: null, refreshedFor: '', results: {},
  welcome: false, introFor: '', snapFor: '', ticker: null, dayCheck: todayStrSafe(),
};
function todayStrSafe() { try { return todayStr(); } catch (e) { return ''; } }
function _bfJson(url, opts) {
  return fetch(url, Object.assign({ cache: 'no-store', headers: { Accept: 'application/json' } }, opts || {})).then(async r => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || ('HTTP ' + r.status)); e.status = r.status; e.code = j.code; throw e; }
    return j;
  });
}
function _bfPost(url, body) { return _bfJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body || {}) }); }
function briefLoadWeather(force) {
  if (_bf.weatherLoading || !_serverAvailable) return Promise.resolve(_bf.weather);
  if (!force && _bf.weather && Date.now() - _bf.weatherAt < 10 * 60 * 1000) return Promise.resolve(_bf.weather);
  _bf.weatherLoading = true;
  return _bfJson('/api/brief/weather' + (force ? '?refresh=1' : '')).then(j => { _bf.weather = j; }).catch(() => { _bf.weather = { ok: false, reason: 'offline' }; })
    .finally(() => { _bf.weatherLoading = false; _bf.weatherAt = Date.now(); }).then(() => _bf.weather);
}
function briefLoadMoney(force) {
  if (_bf.moneyLoading || !_serverAvailable) return Promise.resolve(_bf.money);
  if (!force && _bf.money && Date.now() - _bf.moneyAt < 5 * 60 * 1000) return Promise.resolve(_bf.money);
  _bf.moneyLoading = true;
  return _bfJson('/api/brief/money').then(j => { _bf.money = j; }).catch(() => { _bf.money = { available: false }; })
    .finally(() => { _bf.moneyLoading = false; _bf.moneyAt = Date.now(); }).then(() => _bf.money);
}

/* ---------- the auto-refresh ---------- */
function _bfWaitStore(store, ms) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const tick = () => {
      if (!store.running()) { store.load(true).then(() => resolve({}), () => resolve({})); return; }
      if (Date.now() - t0 > (ms || 170000)) { resolve({ timeout: true }); return; }
      setTimeout(tick, 1500);
    };
    setTimeout(tick, 1200);
  });
}
function _bfFinanceStatus() { return _bfJson('/api/finance/status'); }
/** The steps "Start my day" runs (each through the existing job and its connection gate). */
function briefRefreshSteps() {
  const feat = (k) => !(APP_CONFIG.features && APP_CONFIG.features[k] === false);
  const conn = (id) => (typeof connHas === 'function' ? connHas(id) : gdConnAccess(id) === 'yes');
  return [
    { id: 'calendar', label: 'Calendar', icon: 'calendar-clock',
      available: () => (!feat('calendar') ? 'off' : conn('calendar') ? true : 'not connected'),
      stale: () => { const a = CalStore.age(); return a === null || a > 30 * 60 * 1000; },
      start: async () => { const r = await CalStore.update({ force: false }); return r.error ? { error: 'could not start' } : r.skipped ? { skipped: true } : {}; },
      wait: () => _bfWaitStore(CalStore) },
    { id: 'inbox', label: 'Inbox', icon: 'inbox',
      available: () => (!feat('email') ? 'off' : conn('gmail') ? true : 'not connected'),
      stale: () => { const a = InboxStore.age(); return a === null || a > 30 * 60 * 1000; },
      start: async () => { const r = await InboxStore.update({ force: false }); return r.error ? { error: 'could not start' } : r.skipped ? { skipped: true } : {}; },
      wait: () => _bfWaitStore(InboxStore) },
    { id: 'finance', label: 'Finances', icon: 'wallet',
      available: () => (!feat('finance') ? 'off' : conn('bank') ? true : 'not connected'),
      stale: async () => {
        const s = await _bfFinanceStatus().catch(() => null);
        const at = s && s.lastUpdate && Date.parse(s.lastUpdate.at || s.lastUpdate.finishedAt || '');
        return !(at && Date.now() - at < 12 * 3600 * 1000);
      },
      start: async () => {
        const r = await fetch('/api/finance/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        return r.status === 202 || r.status === 409 ? {} : { error: 'HTTP ' + r.status };
      },
      wait: () => new Promise((resolve) => {
        const t0 = Date.now();
        const tick = () => _bfFinanceStatus().then(s => {
          if (s && s.job && s.job.state === 'running' && Date.now() - t0 < 240000) { setTimeout(tick, 2500); return; }
          resolve(s && s.job && s.job.state === 'error' ? { error: s.job.error || 'failed' } : {});
        }, () => resolve({ error: 'unreachable' }));
        setTimeout(tick, 2000);
      }) },
    { id: 'weather', label: 'Weather', icon: 'sun',
      available: () => (APP_CONFIG.location ? true : 'no location'),
      stale: () => true,
      start: () => briefLoadWeather(true).then(w => (w && w.ok === false && w.reason === 'offline' ? { error: 'offline' } : {})) },
  ];
}
/** Run the refresh once per day per tab (Refresh runs it again). */
function briefRefresh(force) {
  const today = todayStr();
  if (_bf.refresh) return _bf.refresh;
  if (!force && _bf.refreshedFor === today) return Promise.resolve(_bf.results);
  if (typeof _serverAvailable !== 'undefined' && !_serverAvailable) return Promise.resolve({});
  _bf.results = {};
  _bf.refresh = briefOrchestrate(briefRefreshSteps(), {
    timeoutMs: 240000,
    onProgress: (id, status, info) => { _bf.results[id] = Object.assign({ status }, info || {}); _bfPaintProgress(); },
  }).then(r => {
    _bf.refreshedFor = today;
    _bf.refreshedAt = Date.now();
    _bf.refresh = null;
    if (typeof calendarSoon === 'function') calendarSoon(null, true);
    briefLoadMoney(true).then(() => _bfUpdate(['money']));
    _bfUpdate(['hero', 'cards']);         // new events, weather or tasks: redraw without the intro
    _bfPaintProgress();
    _bfSaveSnapshot(true);
    return r.results;
  });
  _bfPaintProgress();
  return _bf.refresh;
}

/* ---------- the model ---------- */
function _bfMin(d) { return Clock.parts(d.getTime()).min; }
/** The hour of the model's "now" in the dashboard's zone. */
function _bfHour(m) { return Clock.parts(m.nowD.getTime()).h; }
function _bfEventsOn(iso) {
  if (typeof calEntriesOn !== 'function' || !CalStore.data) return [];
  const mine = new Set((APP_CONFIG.myEmails || []).map(x => String(x).toLowerCase()));
  return calEntriesOn(iso, { sources: { google: true, tasks: false, countdowns: false, declined: false } }).filter(e => e.kind === 'event' && !e.declined).map(e => {
    const ev = e.ref || {};
    const a = animForEvent(ev);
    let own = true;
    try { const c = calEventCalendar(ev); own = !c || !mine.size || mine.has(String(c.id).toLowerCase()) || c.id === 'primary' || c.id === 'google'; } catch (x) { /* keep */ }
    // Leave, out-of-office and "free" blocks are background: an all-day chip, never "now" or "next".
    const bg = !e.allDay && (!!e.free || a.type === 'holiday' || ev.eventType === 'outOfOffice');
    const allDay = !!e.allDay || bg;
    return {
      id: e.id, title: e.title || '(no title)', allDay, start: allDay ? null : e.start, end: allDay ? null : e.end,
      minutes: allDay ? 0 : Math.max(0, e.end - e.start), location: ev.location || '', joinUrl: ev.conferenceUrl || ev.hangoutLink || '',
      attendees: (ev.attendees || []).filter(x => !x.self).length, type: a.type, important: !!e.important, ev, free: !!e.free, own, bg,
    };
  });
}
/* Design check: ?wx=rain (clear|partly|cloudy|fog|drizzle|rain|showers|snow|thunder) shows that sky over the real forecast. */
const _BF_WX_LABEL = { clear: 'Clear', partly: 'Partly cloudy', cloudy: 'Cloudy', fog: 'Fog', drizzle: 'Drizzle', rain: 'Rain', showers: 'Showers', snow: 'Snow', thunder: 'Thunderstorm' };
function _bfWxParam() { try { const c = new URLSearchParams(location.search).get('wx'); return c && _BF_WX_LABEL[c] ? c : null; } catch (e) { return null; } }
function _bfForcedWx(w) {
  const c = _bfWxParam();
  if (!c) return w;
  const base = w || { ok: true, today: {}, hourly: [] };
  return Object.assign({}, base, { ok: true, current: Object.assign({ temp: 12, isDay: true }, base.current || {}, { cond: c, label: _BF_WX_LABEL[c] }) });
}
function _bfOpen() { return getAllItems().filter(i => statusOf(i.id) !== 'done'); }
function _bfIsDeadline(i) { return animForTask(i).type === 'deadline'; }
/** Everything the brief shows, from the page's own data. */
function briefModel() {
  const date = todayStr();
  const nowD = new Date(Clock.now()), np = Clock.parts(nowD.getTime()), now = np.min;
  const events = _bfEventsOn(date);
  const open = _bfOpen();
  const dueToday = open.filter(i => effDate(i) === date);
  const overdue = open.filter(i => { const d = effDate(i); return d && d < date; });
  const deadlines = dueToday.filter(_bfIsDeadline);
  const focus = (typeof homeFocusTasks === 'function' ? homeFocusTasks(3) : []).map(f => ({ i: f.i, why: f.why, type: animForTask(f.i).type }));
  const w = _bfForcedWx(_bf.weather && _bf.weather.ok ? _bf.weather : null);
  const input = {
    date, weekday: np.dow, now,
    events: events.map(e => ({ title: e.title, type: e.type, start: e.start, end: e.end, allDay: e.allDay, minutes: e.minutes, own: e.own })),
    tasks: { today: dueToday.length, overdue: overdue.length, p1Today: dueToday.filter(i => effPriority(i) === 'p1').length, deadlines: deadlines.map(i => ({ id: i.id, title: effTitle(i) })) },
    focus: focus.map(f => ({ id: f.i.id, title: effTitle(f.i), type: f.type })),
    weather: w && w.current ? { cond: w.current.cond } : null,
  };
  const dt = briefDayType(input);
  const head = briefHeadline(input, dt);
  const timed = events.filter(e => !e.allDay).sort((a, b) => a.start - b.start);
  const nowEv = timed.find(e => e.start <= now && e.end > now) || null;
  const next = timed.find(e => e.start > now) || null;
  // Deadlines this week: P1 or deadline-like tasks in the next 7 days, plus dated top-bar countdowns in 14.
  const in7 = Clock.addDays(date, 7);
  const weekDl = open.filter(i => { const d = effDate(i); return d && d >= date && d <= in7 && (effPriority(i) === 'p1' || _bfIsDeadline(i)); })
    .sort((a, b) => effDate(a).localeCompare(effDate(b)) || (PRIORITY_ORDER[effPriority(a)] ?? 3) - (PRIORITY_ORDER[effPriority(b)] ?? 3));
  const in14 = Clock.addDays(date, 14);
  const countdowns = (typeof tbList === 'function' ? tbList() : []).filter(x => x && TB_TYPES[x.type] && TB_TYPES[x.type].dated && x.type === 'countdown' && x.date && x.date >= date && x.date <= in14).slice(0, 4);
  const waiting = typeof homeIsWaiting === 'function' ? open.filter(homeIsWaiting) : [];
  const backlog = open.filter(i => !effDate(i) && statusOf(i.id) !== 'doing' && !(typeof homeIsWaiting === 'function' && homeIsWaiting(i)) && !(i.startDate && i.startDate > date))
    .sort((a, b) => (PRIORITY_ORDER[effPriority(a)] ?? 3) - (PRIORITY_ORDER[effPriority(b)] ?? 3) || String(a.createdAt || a.id).localeCompare(String(b.createdAt || b.id))).slice(0, 4);
  const tomorrow = Clock.addDays(date, 1);
  const trip = [...events, ...(dt.type === 'travel' ? [] : _bfEventsOn(tomorrow).map(e => Object.assign(e, { tomorrow: true })))].filter(e => BRIEF_TRAVEL_TYPES.includes(e.type) && (!e.allDay || e.own));
  return { date, now, nowD, events, timed, nowEv, next, open, dueToday, overdue, deadlines, focus, dt, head, weekDl, countdowns, waiting, backlog, trip, weather: w, money: _bf.money };
}

/* ---------- rendering ---------- */
let _bfRoot = null;
/**
 * The day's hero into Home (12-home.js mount, every render): the greeting over the
 * weather sky with Play my morning, the refresh strip, the inline story's stage and
 * "your day in three sentences", then Ideas for today. The widgets follow it.
 */
function briefRender(container) {
  _animSyncRoot();
  if (CalStore && !CalStore.st.loaded && !CalStore.st.loading && _serverAvailable) CalStore.load().then(() => _bfUpdate(['hero']));
  if (!_bf.weather) briefLoadWeather().then(() => _bfUpdate(['hero']));
  if (!_bf.money) briefLoadMoney();
  animAiCache();
  const m = briefModel();
  const intro = _bf.introFor !== m.date && animEnabled();
  _bf.introFor = m.date;
  const root = document.createElement('div');
  root.className = 'brief home-head' + (intro ? ' intro' : '') + (_bf.welcome ? ' is-welcome' : '');
  root.dataset.daytype = m.dt.type;
  root.style.setProperty('--bf-accent', `var(--sw-${m.dt.accent})`);
  _bfRoot = root;
  root.appendChild(_bfHero(m, intro));
  const prog = document.createElement('div'); prog.dataset.region = 'progress'; root.appendChild(prog);
  root.appendChild(_bfAiCard(m));
  if (typeof homeHeadIdeas === 'function') { const ideas = homeHeadIdeas(); if (ideas) root.appendChild(ideas); }
  container.appendChild(root);
  _bfPaintProgress();
  if (intro) _bfIntro(root, m);
  animActivate(root);
  _bfStartTicker();
  briefRefresh(false);
  _bfMarkSeen();
  _bfLoadSummary(m, false);
  return root;
}
function briefUnmount() {
  clearInterval(_bf.ticker); _bf.ticker = null;
  clearTimeout(_bfTypeTimer);
  _bfRoot = null; _bf.welcome = false;
}
/** Replace regions of the hero without replaying the intro ('cards' / 'money': the widgets below have their own data). */
function _bfUpdate(regions) {
  const root = _bfRoot;
  if (!root || !root.isConnected) return;
  const m = briefModel();
  root.classList.remove('intro');
  root.dataset.daytype = m.dt.type;
  root.style.setProperty('--bf-accent', `var(--sw-${m.dt.accent})`);
  for (const r of regions) {
    if (r === 'hero') { const old = root.querySelector('[data-region="hero"]'); if (old) old.replaceWith(_bfHero(m, false)); }
  }
  animActivate(root);
  _bfTick();
}

/* ---------- hero ---------- */
function _bfGreeting(m) {
  const h = _bfHour(m);
  const part = h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return userName() ? `${part}, ${userName()}` : part;
}
/** "Protect your morning" only while it is morning. */
function _bfPart(m) { const h = _bfHour(m); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; }
function _bfTagline(m) {
  const part = _bfPart(m);
  if (part === 'morning') return m.dt.tagline;
  if (part === 'afternoon') return m.dt.tagline.replace('Protect your morning', 'Protect your afternoon');
  return m.dt.tagline.replace(/Protect your morning for the hardest one\.|Protect your morning\./, 'One last push, then call it a day.');
}
function _bfHero(m, intro) {
  const w = m.weather;
  const cond = w && w.current ? w.current.cond : 'none';
  const tod = briefTod(w, m.nowD);
  const hero = document.createElement('section');
  // Rain and storms darken the sky: white text reads better than dark text on slate.
  hero.className = 'bf-hero' + (/night|evening|dusk/.test(tod) || /rain|thunder/.test(cond) ? ' on-dark' : '');
  hero.dataset.region = 'hero'; hero.dataset.tod = tod; hero.dataset.cond = cond;
  let dateTxt = '';
  try { dateTxt = m.nowD.toLocaleDateString(APP_CONFIG.locale || undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: Clock.zone() }); } catch (e) { dateTxt = m.date; }
  const place = APP_CONFIG.location && APP_CONFIG.location.name ? APP_CONFIG.location.name : '';
  const stats = briefStats(m.dt.counts);
  let head = m.head;
  // The pill under the greeting already shows the next meeting: the card shows the first focus instead.
  const nx = m.nowEv || m.next;
  if (head && head.why === 'next' && nx && head.title === nx.title && head.start === nx.start && m.focus[0]) {
    head = { kind: 'task', id: m.focus[0].i.id, title: effTitle(m.focus[0].i), type: m.focus[0].type, why: 'focus' };
  }
  const headScene = head ? animSceneHtml(head.type, { size: 'hero', hero: true, urgent: !!head.urgent, label: head.title }) : animSceneHtml(m.dt.type === 'weekend' ? 'rest' : 'idea', { size: 'hero', hero: true });
  const headWhy = head ? { birthday: 'Birthday today', celebration: 'Something to celebrate', deadline: 'Due today', trip: 'Your trip', next: 'Up next', focus: 'Your first focus' }[head.why] || '' : 'A clear day';
  hero.innerHTML = briefSkyHtml(cond, tod) + `
    <div class="bf-hero-in">
      <div class="bf-hero-l">
        <div class="bf-date overline">${esc(dateTxt)}${place ? ` · ${esc(place)}` : ''}</div>
        <h1 class="bf-greet">${intro ? kineticWordsHtml(_bfGreeting(m), 120) : esc(_bfGreeting(m))}</h1>
        <p class="bf-tagline">${esc(_bfTagline(m))}</p>
        <div class="bf-stats">${stats.every(s => !s.n) ? '<span class="bf-stat-none">Nothing due today.</span>' : stats.map(s => `<span class="bf-stat" data-k="${escAttr(s.key)}"><b class="num" data-n="${escAttr(s.n)}">${intro ? '0' : esc(s.n)}</b> ${esc(s.n === 1 ? s.one : s.many)}</span>`).join('<span class="bf-dot" aria-hidden="true">·</span>')}</div>
        <div class="bf-next"></div>
        <div class="bf-play-row"></div>
      </div>
      <div class="bf-hero-r">
        <div class="bf-wx"></div>
        <figure class="bf-headline">${headScene}<figcaption><span class="overline">${esc(headWhy)}</span><b>${esc(head ? head.title : 'Nothing booked')}</b></figcaption></figure>
      </div>
    </div>`;
  _bfNextLine(hero.querySelector('.bf-next'), m);
  _bfWeatherNow(hero.querySelector('.bf-wx'), m);
  const row = hero.querySelector('.bf-play-row');
  if (typeof homeHeadPlayRow === 'function') homeHeadPlayRow(row, m); else row.remove();   // Play my morning (12-home-head.js)
  if (typeof animLivingPaint === 'function') animLivingPaint(hero);                        // the light that moves through the day (78-anim-moments.js)
  return hero;
}
function _bfNextLine(el, m) {
  const e = m.nowEv || m.next;
  if (!e) {
    el.innerHTML = `${icon('sun', 'i-sm')}<span>${m.timed.length ? 'Nothing else in the calendar today.' : 'No meetings today.'}</span>`;
    return;
  }
  const at = Clock.at(m.date, e.start);
  // Real minutes to go (as the 30 s ticker counts them), not clock minutes: they differ on a daylight-saving day.
  el.innerHTML = `${animSceneHtml(e.type, { size: 'xs' })}<span class="bf-next-t"><b>${esc(e.title)}</b> <span class="bf-rel" data-at="${at}" data-end="${at + e.minutes * 60000}">${esc(m.nowEv === e ? 'now' : briefRelTime(Math.round((at - m.nowD.getTime()) / 60000)))}</span></span>`;
  el.title = `${_bfTimeTxt(e.start)}–${_bfTimeTxt(e.end)} ${e.title}`;
  const url = safeUrl(e.joinUrl);
  if (url) {
    const a = document.createElement('a'); a.className = 'btn btn-sm bf-join' + (e.start - m.now <= 15 ? ' btn-primary' : ' btn-secondary'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.innerHTML = icon('video', 'i-sm') + `<span>${esc(typeof _calJoinLabel === 'function' ? _calJoinLabel({ conferenceUrl: e.joinUrl }) : 'Join')}</span>`;
    el.appendChild(a);
  }
}
function _bfWeatherNow(el, m) {
  const w = m.weather;
  if (!w || !w.current) {
    if (!APP_CONFIG.location) {
      el.innerHTML = `<button type="button" class="bf-wx-set">${icon('map-pin', 'i-sm')}<span>Set your town for the weather</span></button>`;
      el.querySelector('button').onclick = () => setView('settings:profile');
    } else if (_bf.weatherLoading || !_bf.weather) el.innerHTML = '<span class="skeleton skeleton-text" style="width:120px"></span>';
    else el.hidden = true;     // offline: hide the weather
    return;
  }
  const c = w.current, t = w.today || {};
  el.innerHTML = `<div class="bf-wx-now"><span class="bf-wx-ic">${briefWxIcon(c.cond, !/night|evening/.test(briefTod(w, m.nowD)))}</span><span class="bf-wx-t num">${esc(_bfDeg(c.temp))}</span></div>`
    + `<div class="bf-wx-l">${esc(c.label)}</div>`
    + `<div class="bf-wx-s"><span>H ${esc(_bfDeg(t.hi))}</span><span>L ${esc(_bfDeg(t.lo))}</span>${typeof t.rainChance === 'number' ? `<span>${icon('umbrella', 'i-xs')}${esc(t.rainChance)}%</span>` : ''}</div>`
    + (w.stale ? '<div class="bf-wx-stale">Last known forecast</div>' : '');
}

/* ---------- live ticker ("Sam in 42 min") ---------- */
function _bfStartTicker() {
  clearInterval(_bf.ticker);
  _bf.ticker = setInterval(_bfTick, 30000);
}
function _bfTick() {
  if (document.hidden) return;
  if (typeof homeRefreshClock === 'function') homeRefreshClock();
  const now = Date.now();
  for (const el of document.querySelectorAll('.bf-rel[data-at]')) {
    const at = Number(el.dataset.at), end = Number(el.dataset.end) || at;
    const m = Math.round((at - now) / 60000);
    el.textContent = now >= at && now < end ? 'now' : now >= end ? 'finished' : briefRelTime(m);
    el.classList.toggle('soon', m <= 15 && m >= 0);
  }
}

/* ---------- progress strip ---------- */
const _BF_STEP_TEXT = { pending: 'waiting', running: 'updating…', done: 'updated', fresh: 'up to date', skipped: '', error: 'could not update', timeout: 'still running' };
function _bfPaintProgress() {
  const host = _bfRoot && _bfRoot.querySelector('[data-region="progress"]');
  if (!host) return;
  const steps = briefRefreshSteps();
  const res = _bf.results || {};
  const running = !!_bf.refresh;
  const any = Object.keys(res).length;
  host.className = 'bf-progress' + (running ? ' running' : '') + (!any ? ' empty' : '');
  if (!any) { host.innerHTML = ''; return; }
  // Finished without trouble: one quiet line ("Up to date · 08:40"), not a row of chips.
  const bad = steps.filter(s => res[s.id] && ['error', 'timeout'].includes(res[s.id].status));
  if (!running && !bad.length) {
    const off = steps.filter(s => res[s.id] && res[s.id].status === 'skipped' && res[s.id].reason !== 'off').map(s => s.label);
    const at = _bf.refreshedAt ? new Date(_bf.refreshedAt) : null;
    host.className = 'bf-progress is-done';
    host.innerHTML = `<span class="bf-uptodate">${icon('circle-check', 'i-sm')}<span>Up to date${at ? ` · ${esc(_calTimeLabel(_calHM(_bfMin(at))))}` : ''}</span></span>`
      + (off.length ? `<span class="bf-off" title="Connect them in Connections">${esc(off.join(', '))} not connected</span>` : '') + '<span class="spacer"></span>';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm';
    b.innerHTML = icon('refresh-cw', 'i-sm') + '<span>Refresh</span>';
    b.onclick = () => briefRefresh(true);
    host.appendChild(b);
    return;
  }
  host.innerHTML = steps.map(s => {
    const r = res[s.id] || { status: 'pending' };
    const st = r.status;
    const txt = st === 'skipped' ? (r.reason === 'off' ? 'off' : r.reason === 'no location' ? 'no town set' : 'not connected') : _BF_STEP_TEXT[st] || st;
    const lead = st === 'running' || st === 'pending' ? '<span class="spinner"></span>' : icon(st === 'done' || st === 'fresh' ? 'circle-check' : st === 'skipped' ? 'circle-dashed' : 'circle-alert', 'i-sm');
    return `<span class="bf-step s-${escAttr(st)}" title="${escAttr(r.reason || '')}">${lead}<b>${esc(s.label)}</b><span>${esc(txt)}</span></span>`;
  }).join('') + `<span class="spacer"></span>`;
  if (!running) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm';
    b.innerHTML = icon('refresh-cw', 'i-sm') + '<span>Refresh</span>';
    b.onclick = () => briefRefresh(true);
    host.appendChild(b);
  }
}

/* ---------- AI "your day in 3 sentences" ---------- */
function _bfFacts(m) {
  if (_bfWxParam()) m = Object.assign({}, m, { weather: _bf.weather && _bf.weather.ok ? _bf.weather : null });   // Claude gets the real forecast
  const hm = (n) => (n === null || n === undefined ? null : _calHM(n));
  return {
    date: m.date, weekday: m.nowD.toLocaleDateString('en-GB', { weekday: 'long', timeZone: Clock.zone() }), now: hm(m.now), dayType: m.dt.type,
    weather: m.weather && m.weather.current ? { now: m.weather.current.label, temp: m.weather.current.temp, high: m.weather.today && m.weather.today.hi, low: m.weather.today && m.weather.today.lo, rainChance: m.weather.today && m.weather.today.rainChance } : null,
    schedule: m.events.slice(0, 14).map(e => ({ time: e.allDay ? 'all day' : `${hm(e.start)}-${hm(e.end)}`, title: e.title.slice(0, 120), kind: e.type })),
    focus: m.focus.map(f => ({ title: effTitle(f.i).slice(0, 160), why: f.why.map(x => x.t), nextStep: (getSubtasks(f.i.id).find(s => !s.done) || {}).title || null })),
    deadlinesThisWeek: m.weekDl.slice(0, 6).map(i => ({ title: effTitle(i).slice(0, 120), due: effDate(i) })),
    overdue: m.overdue.length, dueToday: m.dueToday.length, waitingOn: m.waiting.length,
  };
}
function _bfAiCard(m) {
  const card = document.createElement('section');
  card.className = 'card bf-ai'; card.dataset.region = 'ai';
  card.setAttribute('data-requires', 'claude'); card.setAttribute('data-requires-soft', '');
  card.innerHTML = `<div class="bf-ai-h">${icon('sparkles', 'i-sm')}<span class="overline">Your day in three sentences</span><span class="spacer"></span></div><p class="bf-ai-t" aria-live="polite"></p>`;
  const regen = document.createElement('button'); regen.type = 'button'; regen.className = 'btn btn-ghost btn-sm bf-ai-re';
  regen.innerHTML = icon('refresh-cw', 'i-sm') + '<span>Regenerate</span>';
  regen.onclick = () => _bfLoadSummary(briefModel(), true);
  card.querySelector('.bf-ai-h').appendChild(regen);
  const p = briefPrefs();
  if (!p.ai && !(typeof homeUseCurrentSummary === 'function' && homeUseCurrentSummary())) { card.hidden = true; return card; }
  _bfPaintAi(card, false);
  return card;
}
function _bfPaintAi(card, typeIt) {
  card = card || (_bfRoot && _bfRoot.querySelector('[data-region="ai"]'));
  if (!card) return;
  const t = card.querySelector('.bf-ai-t');
  if (typeof homeUseCurrentSummary === 'function' && homeUseCurrentSummary()) {
    card.hidden = false;
    const heading = card.querySelector('.overline');
    if (heading) heading.textContent = 'Day so far';
    card.classList.remove('is-off');
    t.textContent = homeCurrentSummary(); t.classList.remove('muted');
    const button = card.querySelector('.bf-ai-re');
    if (button) { button.innerHTML = icon('refresh-cw', 'i-sm') + '<span>Refresh today</span>'; button.onclick = homeRefreshToday; }
    return;
  }
  const heading = card.querySelector('.overline');
  if (heading) heading.textContent = 'Your day in three sentences';
  const button = card.querySelector('.bf-ai-re');
  if (button) { button.innerHTML = icon('refresh-cw', 'i-sm') + '<span>Regenerate</span>'; button.onclick = () => _bfLoadSummary(briefModel(), true); }
  const s = _bf.summary.brief;
  const loading = _bf.summaryLoading.brief;
  const ai = typeof connHas === 'function' ? connHas('claude') : AI_AVAILABLE;
  card.classList.toggle('is-off', !ai);
  if (s && s.date === todayStr() && s.text) {
    if (typeIt) briefTypeText(t, s.text); else t.textContent = s.text;
    t.classList.remove('muted');
  } else if (loading) {
    t.innerHTML = '<span class="skeleton skeleton-text" style="width:92%"></span><span class="skeleton skeleton-text" style="width:70%;margin-top:8px"></span>';
  } else {
    t.textContent = ai ? (s && s.error ? s.error : 'Writing your summary…') : 'Connect Claude to get a short summary of your day here.';
    t.classList.add('muted');
  }
}
function _bfLoadSummary(m, regenerate) {
  if (!regenerate && typeof homeUseCurrentSummary === 'function' && homeUseCurrentSummary()) { _bfPaintAi(null, false); return; }
  const p = briefPrefs();
  if (!p.ai || !_serverAvailable) return;
  const date = m.date;
  if (_bf.summaryLoading.brief) return;
  const cur = _bf.summary.brief;
  if (!regenerate && cur && cur.date === date && cur.text) { _bfPaintAi(null, false); return; }
  const ai = typeof connHas === 'function' ? connHas('claude') : AI_AVAILABLE;
  _bf.summaryLoading.brief = true; _bfPaintAi(null, false);
  const run = async () => {
    if (!regenerate) {
      const hit = await _bfJson(`/api/brief/summary?kind=brief&date=${date}`).catch(() => null);
      if (hit && hit.text) return { hit, typed: false };
      if (!ai) return { hit: null };
      // Wait for the calendar refresh so the summary sees today's events.
      if (_bf.refresh) await Promise.race([_bf.refresh, new Promise(r => setTimeout(r, 45000))]);
    }
    const r = await _bfPost('/api/brief/summary', { kind: 'brief', date, facts: _bfFacts(briefModel()), regenerate: !!regenerate });
    return { hit: r, typed: true };
  };
  run().then(({ hit, typed }) => { _bf.summary.brief = hit ? Object.assign({ date }, hit) : { date, text: null }; _bf.summaryLoading.brief = false; _bfPaintAi(null, typed); _bfSaveSnapshot(true); })
    .catch(e => { _bf.summaryLoading.brief = false; _bf.summary.brief = { date, text: null, error: e.code === 'OFF' ? 'The AI summary is off in Settings.' : 'The summary could not be written just now.' }; _bfPaintAi(null, false); });
}

/* ---------- cards ---------- */
function _bfCardShell(id, title, ic, opts) {
  opts = opts || {};
  const card = document.createElement('section');
  card.className = 'card bf-card bf-' + id + (opts.cls ? ' ' + opts.cls : '');
  card.dataset.card = id;
  card.innerHTML = `<div class="card-h">${icon(ic)}<h3>${esc(title)}</h3>${opts.n !== undefined && opts.n !== '' ? `<span class="n">${esc(opts.n)}</span>` : ''}<span class="spacer"></span></div><div class="card-b"></div>`;
  if (opts.action) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm';
    b.innerHTML = `<span>${esc(opts.action.label)}</span>` + icon('arrow-right');
    b.onclick = opts.action.run;
    card.querySelector('.card-h').appendChild(b);
  }
  return { card, body: card.querySelector('.card-b') };
}
function _bfEmpty(body, ic, title, text) {
  body.innerHTML = `<div class="home-empty">${icon(ic)}<div><b>${esc(title)}</b><span>${esc(text)}</span></div></div>`;
}
function _bfTimeTxt(min) { return _calTimeLabel(_calHM(min)); }
function _bfMoneyFmt(n, cur) { return typeof _homeFmtMoney === 'function' ? _homeFmtMoney(n, cur) : String(n); }

/* ---------- intro choreography ---------- */
function _bfIntro(root, m) {
  root.querySelectorAll('.bf-stat b[data-n]').forEach((b, i) => setTimeout(() => briefCountUp(b, Number(b.dataset.n) || 0), 500 + i * 120));
  if (m.dt.flags.birthday && typeof animBurst === 'function') setTimeout(() => animBurst(root.querySelector('.bf-headline .anim-scene'), 'birthday'), 900);
  setTimeout(() => root.classList.remove('intro'), 2600);
}

/* ---------- seen + snapshot ---------- */
function _bfMarkSeen() {
  const t = todayStr();
  try { localStorage.setItem('dashboard-brief-seen', t); } catch (e) { /* private mode */ }
  _bfSaveSnapshot(false);
}
let _bfSnapTimer = null;
function _bfSaveSnapshot(update) {
  if (!_serverAvailable || _bfWxParam()) return;      // a ?wx= design check is never saved
  const date = todayStr();
  if (!update && _bf.snapFor === date) return;
  _bf.snapFor = date;
  clearTimeout(_bfSnapTimer);
  _bfSnapTimer = setTimeout(() => {
    const m = briefModel();
    const w = m.weather;
    const snapshot = {
      summary: {
        dayType: m.dt.type, tagline: m.dt.tagline, stats: briefStats(m.dt.counts).map(s => `${s.n} ${s.n === 1 ? s.one : s.many}`).join(' · '),
        weather: w && w.current ? `${w.current.label}, ${_bfDeg(w.current.temp)} (high ${_bfDeg(w.today && w.today.hi)}, low ${_bfDeg(w.today && w.today.lo)})` : null,
        headline: m.head ? { title: m.head.title, type: m.head.type } : null,
        ai: _bf.summary.brief && _bf.summary.brief.text ? _bf.summary.brief.text : null,
      },
      events: m.events.slice(0, 30).map(e => ({ title: e.title, start: e.allDay ? null : _calHM(e.start), end: e.allDay ? null : _calHM(e.end), allDay: e.allDay, type: e.type })),
      focus: m.focus.map(f => ({ id: f.i.id, title: effTitle(f.i), type: f.type })),
      deadlines: m.weekDl.slice(0, 8).map(i => ({ id: i.id, title: effTitle(i), due: effDate(i) })),
      counts: { overdue: m.overdue.length, dueToday: m.dueToday.length, waiting: m.waiting.length },
      money: _bf.money && _bf.money.available ? { yesterday: _bf.money.yesterday, month: _bf.money.month, currency: _bf.money.currency } : null,
    };
    _bfPost('/api/brief/snapshot', { date, kind: 'brief', snapshot }).catch(() => {});
  }, update ? 400 : 2500);
}

/* ---------- auto-open on the first visit of the day ---------- */
async function briefMaybeAutoOpen() {
  // Just after a time-zone change: not before 06:00 local, never in the first 10 min (travel spec 2.5, 87-clock-ui.js).
  const wait = typeof clockAutoOpenWait === 'function' ? clockAutoOpenWait() : 0;
  if (wait > 0) { clearTimeout(_bf.autoT); _bf.autoT = setTimeout(briefMaybeAutoOpen, Math.min(wait + 1000, 30 * 60000)); return; }
  _bf.dayCheck = todayStr();
  if (!briefPrefs().autoOpen || typeof _serverAvailable === 'undefined' || !_serverAvailable) return;
  if (typeof _obOpen !== 'undefined' && _obOpen) return;
  if (!APP_CONFIG.onboardedAt && !getAllItems().length) return;       // the welcome set-up comes first
  const today = todayStr();
  let local = null; try { local = localStorage.getItem('dashboard-brief-seen'); } catch (e) { /* ignore */ }
  if (local === today) return;
  try {
    const j = await _bfJson('/api/brief/day?date=' + today);
    if (j && j.brief && j.brief.seen) { try { localStorage.setItem('dashboard-brief-seen', today); } catch (e) { /* ignore */ } return; }
  } catch (e) { return; }
  briefOpen({ welcome: true });
  if (typeof storyAutoOpen === 'function') storyAutoOpen('morning');   // the story poster over the brief (79-story-engine.js)
}
/** Home's Today tab with the day's hero at the top (the greeting reads in again). */
function briefOpen(o) {
  _bf.welcome = !!(o && o.welcome);
  _bf.introFor = '';
  if (_bf.welcome && state.selectedTaskId && typeof closeDetail === 'function') closeDetail();   // the welcome gets the whole width
  if (state.view !== 'home') { setView('home'); return; }
  render();
  const main = document.getElementById('main');
  if (main && main.scrollTop > 0) main.scrollTo({ top: 0, behavior: window.Motion && Motion.prefersReduced() ? 'auto' : 'smooth' });
}
/** A tab left open overnight: the first look at it on a new day opens the brief. */
function _briefDayCheck() {
  const t = todayStrSafe();
  if (t && _bf.dayCheck && t !== _bf.dayCheck) { _bf.dayCheck = t; _bf.refreshedFor = ''; briefMaybeAutoOpen(); }
}
setInterval(() => { if (!document.hidden) _briefDayCheck(); }, 10 * 60 * 1000);
