/* ============================================================
   ANIMATION WIRING (v2.2 wave 2). Plays the daily picks (78-anim-gallery.js
   animToday, the registry's animDailyPick / animSpecialPick) in the page, for
   the slots wave 1 only registered:
     opening           animOpeningSequence(): on load, chained onto the brand splash
                       (the first load of the day, or every load: look.opening);
                       animOpeningPlay(true): today's opening on request
     story-transition  animStoryTx(): the beat transition kind (79-story-engine.js
                       sets .story[data-ap-tx]; 71-anim-wire.css)
     page-transition   html[data-ap-page-tx] (set per render by animThemeApply):
                       the section View Transition's entrance (fade, slide, rise)
     sky               animSkyAccent(): the real sky's moment (sunrise and sunset at
                       the weather town, offline; the moon, meteors, the aurora) or a
                       festival sky, as a small accent in briefSkyHtml (Home's hero
                       ambient and the briefs)
     empty-loading     animEmptyArtHtml() (emptyStateHtml, 11-ui-kit.js) and
                       animLoadingHtml() (the story while it loads)
   Rules kept: nothing moves under reduced motion or with animations off (the
   still variant shows instead); the intensity level filters the picks and sets
   the opening's length; art plays once per entry (a view's first render),
   re-renders draw it still; everything pauses while the tab is hidden
   (html.anim-paused).
   ============================================================ */
const _aw = { view: null, once: new Set(), opening: false };

/** What the items' when(day, ctx) rules read: the birthday, the zone, the weather town, the first snow, the UK county (opt-in). */
function animCtx() {
  const loc = APP_CONFIG.location && typeof APP_CONFIG.location === 'object' ? APP_CONFIG.location : null;
  return {
    birthday: typeof APP_CONFIG.birthday === 'string' ? APP_CONFIG.birthday : '',
    tz: APP_CONFIG.timezone || '',
    lat: loc && isFinite(+loc.lat) ? +loc.lat : null,
    lon: loc && isFinite(+loc.lon) ? +loc.lon : null,
    firstSnow: _awFirstSnow(),
    ...(() => { const w = typeof animUkWhere === 'function' ? animUkWhere() : null; return { county: w ? w.id : '', ukTown: w ? w.town : '' }; })(),   // offline and opt-in (78-anim-uk.js)
    ...(() => { const w = typeof animWorldWhere === 'function' ? animWorldWhere() : null; return { city: w ? w.city : '', country: w ? w.country : '' }; })(),   // the world pack (78-anim-world.js)
  };
}
/** The first snowy day of this winter (Oct-Apr), remembered on this device. */
function _awFirstSnow() {
  const today = todayStr(), mo = +today.slice(5, 7);
  if (mo > 4 && mo < 10) return '';
  const winter = String(mo >= 10 ? +today.slice(0, 4) : +today.slice(0, 4) - 1);
  let rec = null;
  try { rec = JSON.parse(localStorage.getItem('dashboard-anim-first-snow') || 'null'); } catch (e) { rec = null; }
  if (rec && rec.winter === winter) return rec.day || '';
  const w = typeof _bf !== 'undefined' && _bf.weather && _bf.weather.ok ? _bf.weather : null;
  if (w && w.current && w.current.cond === 'snow') {
    try { localStorage.setItem('dashboard-anim-first-snow', JSON.stringify({ winter, day: today })); } catch (e) { /* private mode */ }
    return today;
  }
  return '';
}
function _awOn() { return typeof animEnabled === 'function' ? animEnabled() : !(window.Motion && Motion.prefersReduced && Motion.prefersReduced()); }
/** True the first time a key is asked for since the view was entered (the once-per-entry rule). */
function _awEntryOnce(key) {
  const v = typeof state !== 'undefined' ? state.view : '';
  if (_aw.view !== v) { _aw.view = v; _aw.once.clear(); }
  if (_aw.once.has(key)) return false;
  _aw.once.add(key);
  return true;
}

/* ---------- the opening ---------- */
const _AW_OPEN_MS = { subtle: 1100, standard: 1700, playful: 2300 };
/**
 * A short full-screen moment (.ap-cine, 71-anim-wire.css): trusted art edge to edge, words low on
 * the left (escaped here). A click or any key closes it at once; it ends by itself after o.ms.
 * Returns the element (or null when motion is off).
 */
function animCineShow(o) {
  if (!_awOn() || document.hidden) return null;
  const ms = o.ms || 3400;
  const el = document.createElement('div');
  el.className = 'ap-cine' + (o.cls ? ' ' + o.cls : ''); el.setAttribute('role', 'status');
  el.style.setProperty('--ap-open-ms', ms + 'ms');
  el.innerHTML = o.art + `<div class="ap-cine-t">${o.over ? `<span class="ap-cine-over">${esc(o.over)}</span>` : ''}<span class="ap-cine-place">${esc(o.place || '')}</span>${o.origin ? `<span class="ap-cine-origin">${esc(o.origin)}</span>` : ''}<span class="ap-cine-skip">Click or press any key to close</span></div>`;
  const end = (reason) => { if (!el.isConnected) return; el.remove(); removeEventListener('keydown', skip, true); if (o.onEnd) o.onEnd(reason); };
  const skip = () => end('skip');
  el.addEventListener('click', skip);
  addEventListener('keydown', skip, true);
  document.body.appendChild(el);
  setTimeout(() => end('complete'), ms + 80);
  return el;
}
function animOpeningPlay(force) {
  try {
    if (!force) {
      if (_aw.opening || document.hidden || !_awOn() || document.documentElement.classList.contains('story-open')) return false;
      // The first-run set-up is showing: only for a new data folder (no onboardedAt AND no tasks,
      // the server's own rule). A folder in use from before the set-up existed has no
      // onboardedAt either, and that used to silence the opening for good.
      if (!APP_CONFIG.onboardedAt && typeof _serverAvailable !== 'undefined' && _serverAvailable && typeof getAllItems === 'function' && !getAllItems().length) return false;
      const key = 'dashboard-anim-opening';
      if (sessionStorage.getItem(key) === todayStr()) return false;
      sessionStorage.setItem(key, todayStr());
    }
    _aw.opening = true;
    const it = animToday('opening');
    const lv = _agLevel();
    const ms = _AW_OPEN_MS[lv] || _AW_OPEN_MS.standard;
    if (!it || !_AW_OPEN_MS[lv]) return false;
    if (it.full) {   // a full scene plays full screen, never in a small box
      const ok = animCineShow({ art: animItemHtml(it, { size: 'fill', live: true, tod: animTimeOfDay() }), over: 'Today', place: it.site || it.label, origin: it.county && it.label.includes(', ') ? it.label.split(', ').pop() : '', ms: { subtle: 2400, standard: 3400, playful: 4200 }[lv], onEnd: () => { _aw.opening = false; } });
      if (!ok) _aw.opening = false;
      return !!ok;
    }
    const el = document.createElement('div');
    el.className = 'ap-opening'; el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--ap-open-ms', ms + 'ms');
    el.innerHTML = animItemHtml(it, { size: 'hero', live: true });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms + 80);
    return true;
  } catch (e) { return false; }
}
/* ---------- the opening sequence: brand, county welcome, county scene, optional event ----------
   One chained, skippable, FULL-SCREEN overlay on the splash (src/body.html #od-splash, 02-splash.css).
   The splash holds on the first load of the day (or every load: Settings > Animations > Opening,
   look.opening, mirrored to localStorage for the splash); later loads show just the short brand
   opening. Stages, each crossfading into the next: the brand; "Welcome to <county>" large over the
   scene as it fades in behind; the scene edge to edge (a full-viewport item, item.full: drawn at
   16:9 and sliced to fill any screen) with its origin line ("New Forest ponies · Hampshire"); then
   a matching holiday or event, when available, then a slow fade into the app.
   Lengths per intensity: [brand, welcome, scene] ms (about 6 s at
   Standard). A county with no full scene yet (or no county) gets a full-screen seasonal landscape
   (animOpeningFallbackHtml). Off / reduced motion: the splash is never shown, so nothing plays.
   A click or any key skips everything (the splash's own handlers). */
const _AW_SEQ_MS = { subtle: [800, 1000, 2200], standard: [1000, 1600, 3600], playful: [1200, 1800, 4400] };
function animOpeningMode() { try { return animLook().opening; } catch (e) { return 'daily'; } }
function animOpeningModeSync() { try { localStorage.setItem('dashboard-opening-mode', animOpeningMode()); } catch (e) { /* storage blocked */ } }
/** The part of the day for the scene's light: dawn, day, dusk or night (the clock in the user's zone). */
function animTimeOfDay() {
  let h = 12;
  try { h = Clock.parts(Clock.now()).h; } catch (e) { h = new Date().getHours(); }   // clock-ok: fallback before the clock loads
  return h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night';
}
/** Signature on arrival; subsequent openings advance through the county's scenes. */
function animOpeningScene(w, rotate) {
  if (!w) return { it: null, origin: '' };
  const day = todayStr(), look = animLook();
  const mine = animItems({ slot: 'opening', look }).filter(x => x.full && x.county === w.id && !look.block.includes(x.ref) && _animFitsLevel(x, _agLevel()) && _awWhen(x, day, w.id));
  if (!mine.length) return { it: null, origin: '' };
  const key = 'dashboard-opening-last-' + w.id;
  let last = '';
  try { last = localStorage.getItem(key) || ''; } catch (e) { /* private mode */ }
  const signature = mine.find(x => x.signature);
  const previous = mine.findIndex(x => x.ref === last);
  const pin = mine.find(x => look.pin && x.ref === look.pin.opening);
  const next = mine[(previous >= 0 ? previous + 1 : Math.max(0, mine.indexOf(signature) + 1)) % mine.length];
  const it = rotate ? pin || next : signature || pin || mine[0];
  try { localStorage.setItem(key, it.ref); } catch (e) { /* private mode */ }
  const site = it.site || it.label.replace(new RegExp(', ' + w.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), '');
  return { it, origin: site.includes(w.name) ? site : site + ' · ' + w.name };
}
function _awWhen(it, day, county) { try { return typeof it.when !== 'function' || !!it.when(day, Object.assign(animCtx(), { county })); } catch (e) { return false; } }

/** A date-based holiday or special event, following (never replacing) the
 * county welcome. The registry still enforces blocks, packs and intensity.
 * County rotations themselves have priority 1 and do not become an event. */
function animOpeningEvent() {
  const it = animSpecialPick('opening', todayStr(), animLook(), Object.assign(animCtx(), { level: _agLevel() }));
  return it && !it.county && !it.city && (it.priority || 1) >= 2 ? it : null;
}
function animOpeningEventHtml(it, tod) {
  const art = animItemHtml(it, { size: it.full ? 'fill' : 'hero', live: true, tod });
  return it.full ? art : animOpeningFallbackHtml(animSeasonOf(todayStr()), tod) + `<div class="od-seq-event-art">${art}</div>`;
}

/* ---------- the fallback: a full-screen seasonal landscape (no drawn county scene yet) ----------
   Rolling hills in the season's colours under the sky of the hour, drifting clouds, birds, a few
   trees; its motion classes live in 71-anim-wire.css (x-awf-*), so it needs no pack. */
const _AWF_SEASON = {
  spring: { hills: ['#9fc48a', '#7fae6a', '#5f9150'], tree: ['#6f9f4f', '#f2c6d6'], field: '#8cbc6a' },
  summer: { hills: ['#a7c07a', '#86a85a', '#5f8a3e'], tree: ['#4f7f3a', '#6f9f4a'], field: '#d8c070' },
  autumn: { hills: ['#c9b07a', '#b08a52', '#7f6a3a'], tree: ['#c8702a', '#e0a040'], field: '#c89a52' },
  winter: { hills: ['#dfe6ee', '#c7d2de', '#a8b6c6'], tree: ['#6a6070', '#8a8494'], field: '#eef2f6' },
};
const _AWF_SKY = { dawn: ['#5a6aa6', '#e8a8a0', '#ffd9a6'], day: ['#5f97d4', '#a9cbea', '#e8f1f6'], dusk: ['#3c4680', '#c07a9a', '#f5b07a'], night: ['#0d1430', '#1f2a5a', '#3a4a7a'] };
function animOpeningFallbackHtml(season, tod) {
  const S = _AWF_SEASON[season] || _AWF_SEASON.summer, K = _AWF_SKY[tod] || _AWF_SKY.day, night = tod === 'night';
  const id = 'awf' + Math.floor(Math.random() * 1e6).toString(36);
  const hill = (y, a, c, k) => `<path fill="${c}" d="M-160 900V${y}C${200 + k} ${y - a} ${500 + k} ${y + a * 0.4} ${820 + k} ${y - a * 0.3}S${1400 + k} ${y + a * 0.5} 1760 ${y - a * 0.6}V900z"/>`;
  const tree = (x, y, s) => `<path fill="#3e3228" d="M${x - 5 * s} ${y}h${10 * s}v${-60 * s}h${-10 * s}z"/><g class="x-awf-sway" style="transform-origin:${x}px ${y}px"><circle cx="${x}" cy="${y - 80 * s}" r="${36 * s}" fill="${S.tree[0]}"/><circle cx="${x - 22 * s}" cy="${y - 62 * s}" r="${24 * s}" fill="${S.tree[0]}"/><circle cx="${x + 14 * s}" cy="${y - 96 * s}" r="${20 * s}" fill="${S.tree[1]}"/></g>`;
  const cl = (x, y, s, d) => `<g class="x-awf-drift" style="--ad:${50 + d}s;--d:-${d}s"><g fill="${night ? '#3a4470' : '#fff'}" opacity="${night ? 0.6 : 0.9}"><ellipse cx="${x}" cy="${y}" rx="${150 * s}" ry="${24 * s}"/><circle cx="${x - 50 * s}" cy="${y - 20 * s}" r="${40 * s}"/><circle cx="${x + 10 * s}" cy="${y - 36 * s}" r="${54 * s}"/><circle cx="${x + 70 * s}" cy="${y - 16 * s}" r="${36 * s}"/></g></g>`;
  const bird = (x, y, d) => `<g class="x-awf-glide" style="--d:-${d}s"><path fill="none" stroke="#2c2f3a" stroke-width="4" stroke-linecap="round" d="M${x} ${y}q10-10 20 0q10-10 20 0"/></g>`;
  let stars = '';
  if (night) for (let i = 0; i < 60; i++) stars += `<circle cx="${(i * 263) % 1600}" cy="${(i * 97) % 380}" r="${1 + (i % 3) * 0.6}" fill="#fff" opacity=".8"/>`;
  const sx = tod === 'day' ? 1180 : 820, sy = tod === 'day' ? 200 : 470;
  const orb = night ? `<circle cx="1180" cy="190" r="46" fill="#f4f1e0"/><circle cx="1200" cy="178" r="42" fill="${K[0]}"/>`
    : `<circle class="x-awf-glow" cx="${sx}" cy="${sy}" r="260" fill="url(#${id}g)"/><circle cx="${sx}" cy="${sy}" r="52" fill="#fff6dc"/>`;
  return `<span class="anim-scene ap-art ap-full sz-fill is-live ap-fallback tod-${tod}" aria-hidden="true"><svg class="as ap-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">`
    + `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K[0]}"/><stop offset=".6" stop-color="${K[1]}"/><stop offset="1" stop-color="${K[2]}"/></linearGradient><radialGradient id="${id}g"><stop offset="0" stop-color="#ffe2a0" stop-opacity=".8"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></radialGradient></defs>`
    + `<rect width="1600" height="900" fill="url(#${id}s)"/>${stars}${orb}${cl(320, 220, 1.4, 4)}${cl(1000, 150, 1.1, 18)}${cl(1450, 300, 0.9, 30)}`
    + `<g class="x-awf-par">${hill(560, 60, S.hills[0], 0)}</g>${hill(640, 70, S.hills[1], 160)}${tree(300, 640, 1.2)}${tree(1260, 620, 1)}${tree(1360, 640, 0.8)}${hill(740, 60, S.hills[2], -120)}${tree(140, 800, 1.8)}`
    + `<path fill="${S.field}" opacity=".5" d="M-160 900C300 820 900 800 1760 860V900z"/>${night ? '' : bird(700, 300, 0) + bird(760, 330, 3) + bird(820, 290, 6)}`
    + (night ? '<rect width="1600" height="900" fill="#0b1030" opacity=".25"/>' : '') + `</svg></span>`;
}

function animOpeningSequence() {
  animOpeningModeSync();
  const ctl = window.__odOpening, sp = document.getElementById('od-splash');
  if (!ctl || !ctl.hold || !sp || ctl.gone()) return false;   // the short brand opening only (or nothing)
  const done = () => { try { ctl.out(false); } catch (e) { sp.remove(); } };
  const ms = _AW_SEQ_MS[_agLevel()];
  if (!ms || !_awOn() || animOpeningMode() === 'off') { done(); return false; }
  const alive = () => sp.isConnected && !ctl.gone();
  const wait = (t, fn) => setTimeout(() => { if (alive()) fn(); }, Math.max(0, t));
  // The brand first; the rest is decided then (the state file has had time to load).
  wait(ms[0] - (performance.now() - ctl.t0()), () => {
    // the first-run set-up (a new data folder): nothing in front of it
    if (!APP_CONFIG.onboardedAt && typeof _serverAvailable !== 'undefined' && _serverAvailable && typeof getAllItems === 'function' && !getAllItems().length) { done(); return; }
    let w = null;
    try { w = typeof animUkWhere === 'function' ? animUkWhere() : null; } catch (e) { w = null; }
    let returning = false;
    if (w) try { returning = localStorage.getItem(_AUK_KEY) === w.id; localStorage.setItem(_AUK_KEY, w.id); } catch (e) { /* private mode */ }   // no second welcome (78-anim-uk.js)
    try { if (typeof animThemeApply === 'function') animThemeApply(); } catch (e) { /* the packs' css is injected there */ }
    // No UK county: in Texas (72-anim-pack-texas.js) the welcome names the town and today's Texas opening is the emblem.
    let tx = null;
    if (!w) try { const t = typeof animTexasWhere === 'function' ? animTexasWhere(animCtx()) : null; const pick = t ? animToday('opening') : null; if (pick && pick.pack === 'texas') tx = { name: t.name, it: pick, over: 'Texas' }; } catch (e) { tx = null; }
    // Elsewhere in the US (71-anim-us.js, 72-anim-pack-us-*.js): the town or the state, with today's US opening as the emblem.
    if (!w && !tx) try { const u = typeof usWhere === 'function' ? usWhere(animCtx()) : null; const pick = u ? animToday('opening') : null; if (pick && /^us-/.test(pick.pack)) tx = { name: u.name, it: pick, over: 'USA' }; } catch (e) { tx = null; }
    const tod = animTimeOfDay(), season = animSeasonOf(todayStr());
    const { it, origin } = animOpeningScene(w, returning);
    const part = { dawn: 'dawn', day: 'day', dusk: 'evening', night: 'night' }[tod];
    const cap = it ? origin : tx ? (tx.it.full ? tx.it.site || tx.it.label : tx.over + ' · ' + tx.it.label) : (w ? `${season[0].toUpperCase() + season.slice(1)} · ${w.name}` : `${/^[aeiou]/.test(season) ? 'An' : 'A'} ${season} ${part}`);
    const art = it ? animItemHtml(it, { size: 'fill', live: true, tod }) : tx && tx.it.full ? animItemHtml(tx.it, { size: 'fill', live: true, tod }) : animOpeningFallbackHtml(season, tod);
    const emblem = tx && !tx.it.full ? '<div class="od-seq-emblem" aria-hidden="true">' + animItemHtml(tx.it, { size: 'hero', live: true }) + '</div>' : '';
    const box = document.createElement('div'); box.className = 'od-seq';
    box.innerHTML = `<div class="od-seq-bg">${art}</div><div class="od-seq-shade"></div>${emblem}`
      + `<div class="od-seq-title"><span class="od-seq-over">${esc(w || tx ? 'Welcome to' : 'Welcome back')}</span>${w || tx ? `<span class="od-seq-place">${esc(w ? w.welcome : tx.name)}</span>` : ''}</div>`
      + `<div class="od-seq-cap"><span class="od-seq-origin">${esc(cap)}</span><span class="od-seq-skip">Click or press any key to skip</span></div>`;
    sp.style.setProperty('--od-hello-ms', ms[1] + 'ms');
    sp.style.setProperty('--od-scene-ms', ms[2] + 'ms');
    sp.appendChild(box);
    sp.setAttribute('data-od-county', w ? w.id : '');
    sp.setAttribute('data-od-scene', it ? it.ref : tx ? tx.it.ref : 'fallback');
    sp.classList.add('od-st-hello');
    wait(ms[1], () => {
      sp.classList.add('od-st-scene');
      wait(ms[2], () => {
        // Keep the same splash and skip handlers. A skipped/removed splash
        // cannot start the event because wait() checks alive() before running.
        const event = animOpeningEvent();
        if (!event || !_awOn()) { done(); return; }
        const eventBox = document.createElement('div'); eventBox.className = 'od-seq od-seq-event';
        eventBox.innerHTML = `<div class="od-seq-bg">${animOpeningEventHtml(event, tod)}</div><div class="od-seq-cap"><span class="od-seq-origin">${esc(event.site || event.label)}</span><span class="od-seq-skip">Click or press any key to skip</span></div>`;
        box.remove(); sp.appendChild(eventBox);
        sp.setAttribute('data-od-event', event.ref);
        wait(_AW_OPEN_MS[_agLevel()] || _AW_OPEN_MS.standard, done);
      });
    });
  });
  return true;
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const run = () => { try { animOpeningSequence(); } catch (e) { const c = window.__odOpening; if (c) c.out(false); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true }); else setTimeout(run, 0);
}

/* ---------- story and page transitions ---------- */
function _awTx(slot, fallback) {
  const it = animToday(slot);
  const k = it && it.tx && typeof it.tx.kind === 'string' ? it.tx.kind : fallback;
  return /^[a-z-]{1,16}$/.test(k) ? k : fallback;
}
function animStoryTx() { return _awOn() ? _awTx('story-transition', 'fade') : 'none'; }
function animPageTx() { return _awOn() && _agLevel() !== 'subtle' ? _awTx('page-transition', 'fade') : 'fade'; }

/* ---------- the sky ---------- */
function animSkyMomentNow() {
  const now = Clock.now(), c = animCtx();
  if (c.lat != null && c.lon != null) return almSkyMoment(now, c.lat, c.lon);
  const h = Clock.parts(now).h;
  return h < 6 || h >= 21 ? 'night' : 'day';
}
/** The special sky now (sunrise, sunset, tonight's moon, a shower, the aurora, a festival), or null. */
function animSkyAccentItem() {
  if (!_awOn()) return null;
  return animSpecialPick('sky', todayStr(), animLook(), Object.assign(animCtx(), { level: _agLevel(), moment: animSkyMomentNow(), now: Clock.now() }));
}
function animSkyAccentRef() { try { const it = animSkyAccentItem(); return it ? it.ref : ''; } catch (e) { return ''; } }
/** The accent's markup for briefSkyHtml: trusted (registry art only), aria-hidden. */
function animSkyAccentHtml() {
  let it = null;
  try { it = animSkyAccentItem(); } catch (e) { it = null; }
  if (!it) return '';
  const kind = it.tags.includes('moon') ? 'moon' : it.tags.includes('sunrise') || it.tags.includes('sunset') ? 'sun' : 'extra';
  return `<span class="ap-sky-accent" data-ap-sky="${kind}">${animItemHtml(it, { size: 'lg', live: true })}</span>`;
}

/* ---------- empty and loading ---------- */
/** Today's empty-state art: it plays the first time in a view, then draws still. */
function animEmptyArtHtml() {
  try {
    const it = animToday('empty-loading');
    if (!it) return '';
    const live = _awOn() && _awEntryOnce('empty');
    return animItemHtml(it, { size: 'lg', live, reduced: !live });
  } catch (e) { return ''; }
}
/** The loading art (a story while it loads). */
function animLoadingHtml(cls) {
  try {
    const it = animToday('empty-loading');
    if (!it) return '';
    const on = _awOn();
    return `<div class="ap-loading ${cls ? String(cls).replace(/[^a-z0-9 -]/gi, '') : ''}" aria-hidden="true">${animItemHtml(it, { size: 'xl', live: on, reduced: !on })}</div>`;
  } catch (e) { return ''; }
}
