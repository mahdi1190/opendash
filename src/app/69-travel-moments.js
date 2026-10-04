/* ============================================================
   TRAVEL MOMENTS (page). Owner: MOMENTS (travel spec 4).
   The arrival card, the welcome-home postcard and its recap card, the
   departure card on Home, the dock into the top-bar chip, and the queue
   that shows them once each, at most one at a time, never over typing,
   a modal, a story, a task card or a meeting. The pure pieces (timing
   tables, the level map, the scene, the dial, the dock vector, the
   content) are 69-travel-moments-logic.js.

   Decision (3 Oct): the arrival is a centred modal, once per country, with
   Esc and click-to-skip. Closing it docks it into the top-bar travel chip
   (when the chip is there), which can reopen it, settled.

     TravelMoments.check()            look for due moments now (runs on its own every 20 s)
     TravelMoments.reopen()           the last arrival card, settled, grown from the chip
     TravelMoments.toggle()           the chip's click: reopen, or dock when open
     TravelMoments.hasDot() / clearDot()   the chip's "new" dot (this local day)
     TravelMoments.dotHtml()          the dot's markup for the chip (SURFACES' travel-clock)
     TravelMoments.chipMenu()         [{id, label, icon, run}] for the chip's menu
     TravelMoments.preview(kind, o)   show a moment with sample or given content (no once-key)
     trMomentsTakeBanner(ev, words, show)  87-clock-ui.js: with travel on and an arrival
                                      coming, the zone banner's sentence becomes the card's
                                      note line instead (one surface, never both)
     trDepartureHomeCard(entering)    12-home.js: the departure card above the board
     Motion.moment(id, render, {key, kind})   the moment queue (MOTION 9.1), installed when
                                      the motion build has none
   Levels: Off / Reduced / Subtle / Standard / Playful (MOTION 5, spec 4.5);
   html[data-motion-level] when the motion build sets it, else Standard, with the
   OS setting as Reduced and the sidebar's "Reduce motion" as Off.
   ============================================================ */

const _TM_LS_SHOWN = 'dashboard-moments-shown';     // non-travel moments' once-keys (travel ones are data)
const _TM_LS_DAY = 'dashboard-moments-day';         // {date, n, lastAt}: the 3-a-day cap
const _TM_LS_DOT = 'dashboard-travel-dot';          // {key, date}: the chip's "new" dot (UI only)
const _TM_LS_DEPART_X = 'dashboard-travel-depart-x:';
const _TM = {
  bootAt: Date.now(), queue: [], showing: null, timer: null, started: false, banner: null, bannerTimer: null,
  last: null, open: null, departDecided: null, departPlayed: new Set(), departStart: null, lastCheck: 0, uid: 0, log: [],
};

/* ---------- small helpers ---------- */
function _tmLs(k, v) {
  try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ }
  return null;
}
/** A short in-memory trail of what the queue did (QA reads TravelMoments._state.log; no places or text). */
function _tmLog(msg) { _TM.log.push(Math.round((Date.now() - _TM.bootAt) / 100) / 10 + 's ' + msg); if (_TM.log.length > 40) _TM.log.shift(); }
function _tmJson(k) { try { return JSON.parse(_tmLs(k) || 'null'); } catch (e) { return null; } }
function _tmNowMs() { return typeof Clock !== 'undefined' ? Clock.now() : Date.now(); }
function _tmToday() { return typeof Clock !== 'undefined' ? Clock.today() : todayStr(); }
function _tmIcon(n, cls) { return typeof icon === 'function' ? icon(n, cls || 'i-xs') : ''; }
function _tmH12() { const t = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.time) || {}; return t.clock12 === true; }
/** The level now (spec 4.5), or a preview's. */
function trMomentLevelNow(preview) {
  const html = document.documentElement;
  const os = (window.Motion && Motion.systemReduced ? Motion.systemReduced() : !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  return trMomentLevelOf({ preview, osReduced: os, userReduced: html.getAttribute('data-motion') === 'reduced', attr: html.getAttribute('data-motion-level') || '' });
}
/** Settings > Animations off (the content switch): scenes show their first frame at any level. */
function _tmScenesOff() { return document.documentElement.classList.contains('anim-off'); }
function _tmTravelOn() { return typeof TravelStore !== 'undefined' && TravelStore.on() && TravelStore.config().moments; }
function _tmWords(text) {
  return String(text).split(' ').map((w, i) => `<span class="trm-w"><span class="trm-wi" style="--i:${i}">${esc(w)}</span></span>`).join(' ');
}
function _tmChipsHtml(list) {
  return (list || []).map((c, i) => `<span class="trm-chip" style="--i:${i}">${_tmIcon(c.icon)}<span>${c.html}</span></span>`).join('');   // c.html: built by the logic file with every user text escaped
}
function _tmRollHtml(strip, extra) {
  return `<span class="trm-roll${strip.west ? ' is-west' : ''}" style="--trm-rn:${strip.n}" aria-hidden="true"><span class="trm-strip">${strip.hours.map(h => `<i>${esc(h)}</i>`).join('')}</span></span>${extra || ''}`;
}
function _tmCountHtml(cs) {
  return `<span class="trm-roll trm-count" style="--trm-rn:${cs.n}" aria-hidden="true"><span class="trm-strip">${cs.steps.map(s => `<i>${esc(s)}</i>`).join('')}</span></span>`;
}
function _tmFlag(cc, cls) { return typeof trFlagHtml === 'function' && cc ? trFlagHtml(cc, { sheen: true, cls: 'trm-flag' + (cls ? ' ' + cls : '') }) : ''; }
function _tmLoopsFor(kind, level, scenesOff) {
  if (scenesOff) return [];
  return trLoopAllot(TM_LOOP_ORDER, level);
}
function _tmScene(model, level, mode) {
  const loops = _tmLoopsFor(model.sceneKind, level, _tmScenesOff());
  return trSceneSvg({ kind: model.sceneKind, seed: model.seed, tod: model.tod, cond: model.cond, mode, loops, month: model.month, uid: 'tm' + (++_TM.uid) });
}
/** The live region the moments speak through (polite; made once, early). */
function _tmAnnounce(text) {
  let el = document.getElementById('trm-live');
  if (!el) { el = document.createElement('div'); el.id = 'trm-live'; el.className = 'sr-only trm-sr'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  el.textContent = '';
  setTimeout(() => { el.textContent = text; }, 60);
}

/* ---------- the chip (the dock target; SURFACES draws it as the top-bar widget 'travel-clock') ---------- */
function _tmVisible(el) { return !!(el && !el.hidden && el.offsetParent !== null && el.offsetWidth > 0); }
function _tmChip() {
  const host = document.getElementById('tbw-travel-clock');
  if (_tmVisible(host)) { const c = host.querySelector('.tr-chip, .tbw, button, [data-chip]') || host; if (_tmVisible(c)) return c; }
  const clock = document.querySelector('#countdowns .cdw[data-type="clock"], #countdowns .cdw[data-id="clock"]');
  return _tmVisible(clock) ? clock : null;
}
/**
 * An element's LAYOUT box in viewport pixels: offset* along the offsetParent chain, minus the
 * scroll of the ancestors in between. Never getBoundingClientRect, which returns the transformed
 * box: a re-measure during the entrance or the dock would give a wrong vector (spec 4.4).
 */
function _tmBox(el) {
  let x = 0, y = 0, fixed = false;
  for (let e = el; e; e = e.offsetParent) {
    x += e.offsetLeft; y += e.offsetTop;
    if (getComputedStyle(e).position === 'fixed') { fixed = true; break; }
  }
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) { x -= p.scrollLeft || 0; y -= p.scrollTop || 0; }
  if (!fixed) { const se = document.scrollingElement; if (se) { x -= se.scrollLeft; y -= se.scrollTop; } }
  return { left: x, top: y, width: el.offsetWidth, height: el.offsetHeight };
}
function _tmPhone() { return !!(window.matchMedia && window.matchMedia('(max-width: 600px)').matches); }
/**
 * The dock (spec 4.4): the content fades, the shell takes the chip's tint while it moves and
 * scales onto the chip's box, the chip fades in under it (same box, so nothing jumps), one ring
 * pulse, the "new" dot pops. Levels: instant (Off), a 150 ms crossfade (Reduced), a
 * fade-through without the move (Subtle). Resolves when it is done.
 */
function trDock(card, chip, level) {
  const plan = trMomentLevelPlan('dock', level).dock;
  const done = (a) => (a && a.finished ? a.finished.catch(() => {}) : Promise.resolve());
  if (!card || plan === 'instant' || typeof card.animate !== 'function') return Promise.resolve();
  if (!chip || plan === 'crossfade' || plan === 'fade-through') {
    return done(card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: plan === 'crossfade' ? 150 : 220, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }));
  }
  const T = {}; for (const r of TM_CHOREO.dock) T[r.id] = r;
  const v = trDockVector(_tmBox(card), _tmBox(chip), { phone: _tmPhone() });       // measured when the dock starts
  const kids = [...card.children].filter(k => !k.classList.contains('trm-tint'));
  for (const k of kids) k.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T.content.to - T.content.from, delay: T.content.from, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
  const tint = card.querySelector(':scope > .trm-tint');
  if (tint) tint.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T.tint.to - T.tint.from, delay: T.tint.from, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
  card.style.transformOrigin = v.origin;
  const move = card.animate([
    { transform: 'none', opacity: 1 },
    { transform: `translate(${v.dx * 0.8}px, ${v.dy * 0.8}px) scale(${1 + (v.sx - 1) * 0.8}, ${1 + (v.sy - 1) * 0.8})`, opacity: 1, offset: 0.8 },
    { transform: `translate(${v.dx}px, ${v.dy}px) scale(${v.sx}, ${v.sy})`, opacity: 0 },
  ], { duration: T.move.to - T.move.from, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
  chip.classList.add('trm-dock-host');
  chip.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T.chip.to - T.chip.from, delay: T.chip.from, easing: 'linear', fill: 'backwards' });
  if (plan === 'move-ring' || plan === 'move') {
    const ring = document.createElement('i'); ring.className = 'trm-ring'; ring.setAttribute('aria-hidden', 'true');
    chip.appendChild(ring);
    ring.animate([{ opacity: 0.55, transform: 'scale(.97)' }, { opacity: 0, transform: 'scale(1.16)' }], { duration: T.ring.to - T.ring.from, delay: T.ring.from, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' })
      .finished.catch(() => {}).then(() => ring.remove());
  }
  if (TravelMoments.hasDot()) {
    if (window.Travel && typeof Travel.chipDot === 'function') chip.classList.add('has-dot');
    const dot = chip.querySelector('.tr-chip-dot, .trm-newdot') || (() => { const d = document.createElement('i'); d.className = 'trm-newdot is-temp'; d.setAttribute('aria-hidden', 'true'); chip.appendChild(d); return d; })();
    dot.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'none' }], { duration: T.dot.to - T.dot.from, delay: T.dot.from, easing: 'cubic-bezier(.34,1.4,.64,1)', fill: 'backwards' });
  }
  return done(move);
}

/* ---------- the cards ---------- */
function _tmClocksHtml(m, compact) {
  const strip = trHourStrip(m.home.min, m.diffMin, { h12: m.h12 });
  const cs = trCountStrip(m.diffMin);
  const night = (h) => h >= 19 || h < 6;
  const mins = esc(m.local.label.replace(/^\d+/, ''));   // ':42' (or ':42pm'): the hour is the roll
  return `<div class="trm-clocks">`
    + `<div class="trm-clock">${trDialSvg({ h: m.local.h, m: m.local.m, diffMin: m.diffMin, night: night(m.local.h) })}<div><div class="trm-t" aria-label="${esc(m.local.label)}">${_tmRollHtml(strip, `<span aria-hidden="true">${mins}</span>`)}</div>`
    + `<div class="trm-l">${_tmIcon('map-pin')} ${esc(m.timeLabel)} · your time</div></div></div>`
    + `<span class="trm-diff" aria-label="${esc(m.diffLabel)}">${_tmCountHtml(cs)}${/tomorrow|yesterday/.test(m.diffLabel) ? `<span class="trm-diff-day">${esc(m.diffLabel.split(' · ')[1] || '')}</span>` : ''}</span>`
    + `<div class="trm-clock is-home">${trDialSvg({ h: m.home.h, m: m.home.m, diffMin: 0, night: night(m.home.h), cls: 'is-sm' })}<div><div class="trm-t">${esc(m.home.label)}</div><div class="trm-l">${_tmIcon('house')} ${esc(m.home.city)}${compact ? '' : ', home'}</div></div></div>`
    + `</div>`;
}
function _tmGreetHtml(g) {
  if (!g) return '';
  if (g.night) return `<p class="trm-greet"><span class="trm-native">${esc(g.text)}</span><span class="trm-roman">${esc(g.roman)}</span></p>`;
  const sub = [g.roman, g.meaning].filter(Boolean).join(' · ');
  return `<p class="trm-greet"><span class="trm-native" lang="${esc(g.lang || 'en')}">${esc(g.text)}</span>${sub ? `<span class="trm-roman">${esc(sub)}</span>` : ''}</p>`;
}
/** Playful's flourish: the dotted home -> here arc draws over the scene (a mask that slides: transform only). */
function _tmRouteSvg() {
  const id = 'trm-rm-' + (++_TM.uid);
  return `<svg class="trm-route" viewBox="0 0 560 236" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><mask id="${id}"><rect class="trm-route-mask" x="0" y="0" width="560" height="236" fill="#fff"/></mask></defs>`
    + `<path mask="url(#${id})" d="M36 132 Q290 -16 470 70"/><circle cx="36" cy="132" r="4"/><circle class="trm-route-dot" cx="470" cy="70" r="5"/></svg>`;
}
/** The full arrival card (the decision-3 modal; t1). Markup only; trusted parts come from the logic file. */
function trFullCard(m, o) {
  o = o || {};
  const level = o.level || 'standard';
  const id = 'trm-t-' + (++_TM.uid);
  // "Keep London time" only when the dashboard is showing the local time now (the override exists, 2.8).
  const keep = typeof Clock !== 'undefined' && Clock.overrideReady && Clock.follow && Clock.follow() === 'system' && m.diffMin && Clock.zone() !== Clock.home();
  return `<div class="trm-backdrop" data-trm-close></div>`
    + `<section class="trm-card trm-full" role="dialog" aria-modal="true" aria-labelledby="${id}" tabindex="-1">`
    + `<button type="button" class="trm-x" data-trm-close aria-label="Close">${_tmIcon('x', 'i-sm')}</button>`
    + `<div class="trm-scene">${_tmScene(m, level, m.actor)}${level === 'playful' ? _tmRouteSvg() : ''}${typeof animWorldArrivalHtml === 'function' && m.cityId ? animWorldArrivalHtml(m.cityId, level) : ''}</div>`
    + `<div class="trm-body">`
    + `<div class="trm-stamp" aria-hidden="true">${m.stamp}</div>`
    + `<div class="trm-over">${_tmFlag(m.cc, 'is-lg')}<span class="trm-overline">${esc(m.overline)}</span></div>`
    + `<h2 class="trm-title" id="${id}" aria-label="${esc(m.title)}"><span aria-hidden="true">${_tmWords(m.title)}</span></h2>`
    + _tmGreetHtml(m.greeting)
    + _tmClocksHtml(m)
    + `<div class="trm-chips">${_tmChipsHtml(m.chipsFull)}</div>`
    + `<p class="trm-note">${_tmIcon('clock')} <span>${esc(m.note || m.fullNote)}</span></p>`
    + `<div class="trm-act">`
    + (m.tripId ? `<button type="button" class="btn btn-primary btn-sm" data-trm-act="trip">${_tmIcon('map', 'i-sm')} See the trip</button>` : '')
    + (keep ? `<button type="button" class="btn btn-secondary btn-sm" data-trm-act="keep">Keep ${esc(m.home.city)} time</button>` : '')
    + `<button type="button" class="btn btn-secondary btn-sm" data-trm-close>Close</button><span class="trm-sp"></span>`
    + `<button type="button" class="btn btn-ghost btn-sm" data-trm-act="settings">${_tmIcon('settings')} Travel settings</button></div>`
    + `</div><i class="trm-tint" aria-hidden="true"></i></section>`;
}
/** The welcome-home postcard (non-modal; t7's shell with t3's content). */
function trPostcard(m, o) {
  o = o || {};
  const level = o.level || 'standard';
  const id = 'trm-t-' + (++_TM.uid);
  return `<section class="trm-card trm-pc" role="dialog" aria-modal="false" aria-labelledby="${id}">`
    + `<div class="trm-band">${_tmScene(m, level, 'home')}</div>`
    + `<button type="button" class="trm-x" data-trm-close aria-label="Close (tucks into the top bar)">${_tmIcon('x', 'i-sm')}</button>`
    + `<div class="trm-body">`
    + `<div class="trm-over">${_tmIcon('house', 'i-sm')}<span class="trm-overline">${esc(m.overline.replace(m.dateIso, typeof Clock !== 'undefined' ? Clock.fmtDate(Clock.now(), { weekday: 'long', day: 'numeric', month: 'long' }) : m.dateIso))}</span></div>`
    + `<h2 class="trm-title" id="${id}" aria-label="${esc(m.title)}"><span aria-hidden="true">${_tmWords(m.title)}</span></h2>`
    + `<p class="trm-line">${esc(m.line)}</p>`
    + `<div class="trm-chips">${_tmChipsHtml(m.chips)}</div>`
    + `<div class="trm-act"><button type="button" class="btn btn-primary btn-sm" data-trm-act="more">${_tmIcon('maximize-2')} See more</button>`
    + (m.tripId ? `<button type="button" class="btn btn-secondary btn-sm" data-trm-act="trip">${_tmIcon('map')} Trip</button>` : '')
    + `<span class="trm-sp"></span><span class="trm-hint">Tucks into the top bar</span></div>`
    + `</div><div class="trm-life" aria-hidden="true"><i></i></div><i class="trm-tint" aria-hidden="true"></i></section>`;
}
/** The welcome-home recap ("See more"; t3): counts roll up, the spending, the trip's actions. */
function trRecapCard(m, o) {
  o = o || {};
  const id = 'trm-t-' + (++_TM.uid);
  const fmtAmt = (s) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: s.ccy, maximumFractionDigits: 0 }).format(s.amt); } catch (e) { return `${s.amt} ${s.ccy}`; } };
  const counts = m.counts.map(c => `<div class="trm-amt"><b>${_tmCountHtml({ steps: Array.from({ length: Math.min(c.n, 30) + 1 }, (_, k) => String(k === Math.min(c.n, 30) ? c.n : k)), n: Math.min(c.n, 30) })}</b><span>${esc(c.label)}</span></div>`).join('')
    + m.spend.map(s => `<div class="trm-amt"><b>${esc(fmtAmt(s))}</b><span>spent in ${esc(s.ccy)}</span></div>`).join('');
  return `<div class="trm-backdrop" data-trm-close></div>`
    + `<section class="trm-card trm-full trm-recap" role="dialog" aria-modal="true" aria-labelledby="${id}" tabindex="-1">`
    + `<button type="button" class="trm-x" data-trm-close aria-label="Close">${_tmIcon('x', 'i-sm')}</button>`
    + `<div class="trm-scene">${_tmScene(m, o.level || 'standard', 'home')}</div>`
    + `<div class="trm-body">`
    + `<div class="trm-over">${_tmIcon('house', 'i-sm')}<span class="trm-overline">${esc(m.overline.replace(m.dateIso, typeof Clock !== 'undefined' ? Clock.fmtDate(Clock.now(), { weekday: 'long', day: 'numeric', month: 'long' }) : m.dateIso))}</span></div>`
    + `<h2 class="trm-title" id="${id}" aria-label="${esc(m.title)}"><span aria-hidden="true">${_tmWords(m.title)}</span></h2>`
    + `<p class="trm-line">${esc(m.line)}</p>`
    + `<div class="trm-amts">${counts}</div>`
    + `<div class="trm-chips">${_tmChipsHtml(m.chips)}</div>`
    + `<div class="trm-act">${m.tripId ? `<button type="button" class="btn btn-primary btn-sm" data-trm-act="trip">${_tmIcon('map', 'i-sm')} See the trip</button>` : ''}`
    + `<button type="button" class="btn btn-secondary btn-sm" data-trm-close>Close</button><span class="trm-sp"></span>`
    + (m.keptUntil ? `<span class="trm-hint">Trip kept until ${esc(typeof Clock !== 'undefined' ? Clock.fmtDate(Clock.at(m.keptUntil, 720), { day: 'numeric', month: 'short' }) : m.keptUntil)}</span>` : '')
    + `</div></div><i class="trm-tint" aria-hidden="true"></i></section>`;
}

/* ---------- mounting, entrance, skip, close ---------- */
function _tmLayer(kind, level, table, settled, shift) {
  const el = document.createElement('div');
  el.className = 'trm-root trm-layer is-' + kind;
  el.setAttribute('data-trm-level', settled ? 'settled' : level);
  if (_tmScenesOff()) el.setAttribute('data-trm-scenes', 'off');
  el.style.cssText = trChoreoVars(table, { shift });
  return el;
}
/** Any key or click during the entrance: every finite animation jumps to its end (spec 4.4 "Skipping"). */
function _tmFinish(root) {
  if (!root || typeof root.getAnimations !== 'function') return;
  for (const a of root.getAnimations({ subtree: true })) {
    try { const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null; if (t && t.iterations !== Infinity && t.activeDuration !== Infinity) a.finish(); } catch (e) { /* already done */ }
  }
  root.classList.add('is-settled');
}
/** After the entrance: the ambient loops run (their delay is the settle), then stop after 30 s. */
function _tmSettle(root, ms) {
  const t1 = setTimeout(() => root.classList.add('is-settled'), ms);
  const t2 = setTimeout(() => root.classList.add('is-calm'), ms + 30000);
  root._tmTimers = [t1, t2];
}
function _tmClearTimers(root) { for (const t of (root && root._tmTimers) || []) clearTimeout(t); }
function _tmBlockers(snap) {
  const a = document.activeElement;
  const typing = !!(a && a !== document.body && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) && a.type !== 'checkbox' && a.type !== 'radio' && a.type !== 'button');
  const ours = (n) => !!(n && n.closest && n.closest('.trm-root'));
  let modal = false;
  for (const n of document.querySelectorAll('.modal-overlay.open, #modal-overlay.open, #kb-overlay.open, dialog[open], [aria-modal="true"], .cmd, .drawer')) if (!ours(n) && _tmVisible(n)) { modal = true; break; }
  const now = _tmNowMs();
  return {
    hidden: document.hidden, typing, modal,
    story: typeof storyIsOpen === 'function' && !!storyIsOpen(),
    card: !!document.querySelector('.tc-root'),
    meeting: !!(snap && (snap.meetings || []).some(mt => mt && mt.start <= now && now < (mt.end || mt.start))),
  };
}
function _tmGo(view) {
  if (typeof setView !== 'function') return;
  if (typeof sectionFor === 'function' && view.startsWith('trip:') && !sectionFor(view)) view = 'trips';
  if (typeof sectionFor === 'function' && view === 'trips' && !sectionFor('trips')) return;
  setView(view);
}
function _tmSettingsView() { return typeof SETTINGS_GROUPS !== 'undefined' && SETTINGS_GROUPS.some(g => g.id === 'time') ? 'settings:time' : 'settings'; }

/**
 * Show the arrival card (modal). o: {level, settled (reopen), from (the chip: grow from it), onDone}.
 * Esc or Close docks it into the chip; a click on the backdrop closes it; any other key or a
 * click inside during the entrance skips to the end. Focus moves into the card and comes back.
 */
function _tmShowModal(kind, m, o) {
  o = o || {};
  const level = o.level || trMomentLevelNow();
  const settled = !!o.settled;
  const table = TM_CHOREO.full;
  const root = _tmLayer(kind, level, table, settled);
  root.innerHTML = kind === 'recap' ? trRecapCard(m, { level }) : trFullCard(m, { level });
  document.body.appendChild(root);
  const card = root.querySelector('.trm-card');
  const back = document.activeElement;
  const settle = settled ? 0 : trChoreoSettle(table);
  let entering = !settled && level !== 'off' && level !== 'reduced';
  const state = { kind, root, card, model: m, level, closing: false };
  _TM.open = state;
  if (kind === 'arrive') _TM.last = m;
  // Reduced: the final frame, faded in over 150 ms (WAAPI: the reduced-motion CSS zeroes CSS animations).
  if (level === 'reduced' && !settled) root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear' });
  if (settled && o.from && level !== 'off' && level !== 'reduced') {
    const v = trDockVector(_tmBox(card), _tmBox(o.from), { phone: _tmPhone() });
    card.style.transformOrigin = v.origin;
    card.animate([{ opacity: 0, transform: `translate(${v.dx}px, ${v.dy}px) scale(${v.sx}, ${v.sy})` }, { opacity: 1, offset: 0.4 }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
    root.querySelector('.trm-backdrop').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' });
  }
  _tmSettle(root, settle);
  setTimeout(() => { entering = false; }, settle);
  card.focus({ preventScroll: true });
  if (!settled) _tmAnnounce(trMomentAnnounce(m));
  const close = (how) => {
    if (state.closing) return;
    state.closing = true;
    _tmLog('close ' + kind + ' (' + how + ')');
    document.removeEventListener('keydown', onKey, true);
    _tmClearTimers(root);
    const chip = how === 'dock' ? _tmChip() : null;
    const finish = () => {
      root.remove();
      if (_TM.open === state) _TM.open = null;
      if (back && back.isConnected && typeof back.focus === 'function') back.focus({ preventScroll: true });
      if (typeof o.onDone === 'function') o.onDone();
    };
    const bd = root.querySelector('.trm-backdrop');
    if (bd && bd.animate && level !== 'off') bd.animate([{ opacity: 1 }, { opacity: 0 }], { duration: level === 'reduced' ? 150 : 260, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    _tmFinish(card);
    trDock(card, chip, level).then(finish);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close('dock'); return; }
    if (e.key === 'Tab') {   // keep focus inside the dialog
      const f = [...card.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')].filter(_tmVisible);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      return;
    }
    if (entering && card.contains(document.activeElement)) { entering = false; _tmFinish(root); }
  };
  document.addEventListener('keydown', onKey, true);
  root.addEventListener('pointerdown', (e) => { if (entering && card.contains(e.target)) { entering = false; _tmFinish(root); } });
  root.addEventListener('click', (e) => {
    const c = e.target.closest('[data-trm-close]');
    if (c) { close(c.classList.contains('trm-backdrop') ? 'fade' : 'dock'); return; }
    const b = e.target.closest('[data-trm-act]');
    if (!b) return;
    const act = b.getAttribute('data-trm-act');
    if (act === 'trip') { close('fade'); _tmGo('trip:' + m.tripId); }
    else if (act === 'settings') { close('fade'); _tmGo(_tmSettingsView()); }
    else if (act === 'keep') { if (typeof clockKeepHome === 'function') clockKeepHome(); close('dock'); }
  });
  state.close = close;
  return state;
}
/**
 * Show the welcome-home postcard (non-modal: no scrim, focus is not taken; it sits after the top
 * bar in DOM order). Its life line runs out over 8 s from settle (paused while hovered, focused
 * or hidden), then it docks; Esc and × dock it at once. o: {level, onDone}.
 */
function _tmShowPostcard(m, o) {
  o = o || {};
  const level = o.level || trMomentLevelNow();
  const table = TM_CHOREO.home;
  const root = _tmLayer('home', level, table, false);
  root.innerHTML = trPostcard(m, { level });
  const tb = document.getElementById('topbar');
  if (tb && tb.parentNode) tb.insertAdjacentElement('afterend', root); else document.body.appendChild(root);
  const card = root.querySelector('.trm-card');
  const settle = trChoreoSettle(table);
  const state = { kind: 'home', root, card, model: m, level, closing: false };
  _TM.open = state;
  if (level === 'reduced') root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear' });
  _tmSettle(root, settle);
  _tmAnnounce(trMomentAnnounce(m));
  let entering = level !== 'off' && level !== 'reduced';
  setTimeout(() => { entering = false; }, settle);
  // The life line: a JS timer (the reduced-motion CSS would cut a CSS one to 1 ms); the bar is only its picture.
  let left = 8000, startedAt = 0, timer = null, paused = 0;
  const bar = root.querySelector('.trm-life i');
  const anim = bar && level !== 'off' && level !== 'reduced' ? bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 8000, delay: settle, easing: 'linear', fill: 'both' }) : null;
  const run = () => { if (paused || timer || state.closing) return; startedAt = Date.now(); timer = setTimeout(() => close('dock'), left); if (anim) anim.play(); };
  const hold = (why) => { paused |= why; if (timer) { clearTimeout(timer); timer = null; left = Math.max(0, left - (Date.now() - startedAt)); } if (anim) anim.pause(); };
  const release = (why) => { paused &= ~why; run(); };
  const startT = setTimeout(run, settle);
  const onVis = () => (document.hidden ? hold(4) : release(4));
  root.addEventListener('pointerenter', () => hold(1));
  root.addEventListener('pointerleave', () => release(1));
  root.addEventListener('focusin', () => hold(2));
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) release(2); });
  document.addEventListener('visibilitychange', onVis);
  const onKey = (e) => {
    if (e.key === 'Escape' && !_tmBlockers(null).modal) { const a = document.activeElement; if (a && a !== document.body && !root.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return; close('dock'); return; }
    if (entering && root.contains(document.activeElement)) { entering = false; _tmFinish(root); }
  };
  document.addEventListener('keydown', onKey);
  root.addEventListener('pointerdown', () => { if (entering) { entering = false; _tmFinish(root); } });
  const close = (how) => {
    if (state.closing) return;
    state.closing = true;
    _tmLog('close home (' + how + ')');
    clearTimeout(timer); clearTimeout(startT);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
    _tmClearTimers(root);
    _tmFinish(card);
    trDock(card, how === 'dock' ? _tmChip() : null, level).then(() => {
      root.remove();
      if (_TM.open === state) _TM.open = null;
      if (typeof o.onDone === 'function') o.onDone();
    });
  };
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-trm-close]')) { close('dock'); return; }
    const b = e.target.closest('[data-trm-act]');
    if (!b) return;
    const act = b.getAttribute('data-trm-act');
    if (act === 'more') { close('fade'); _tmShowModal('recap', m, { level }); }
    else if (act === 'trip') { close('fade'); _tmGo('trip:' + m.tripId); }
  });
  state.close = close;
  return state;
}

/* ---------- the departure card on Home (not a moment: it does not count to the caps) ---------- */
/**
 * 12-home.js calls this on every Home render. The decision is made when Home is entered and
 * kept on re-renders (a card appearing mid-view would shift the board); the entrance plays once
 * per leg, ever. Hidden after the leg departs or when dismissed.
 */
function trDepartureHomeCard(entering) {
  // Decided on entry; while the calendar is still loading the decision waits for it (the first
  // render with the events is still the board's first real paint).
  const d0 = _TM.departDecided;
  if (entering || !d0 || d0.pending || (!d0.m && Date.now() - d0.at < 4000)) {
    const pending = typeof CalStore !== 'undefined' && !(CalStore.data && Array.isArray(CalStore.data.events));
    _TM.departDecided = { m: pending ? null : _tmDepartDue(), pending, at: entering || !d0 ? Date.now() : d0.at };
  }
  const d = _TM.departDecided.m;
  if (!d || _tmNowMs() >= d.departAt || _tmLs(_TM_LS_DEPART_X + d.key)) return null;
  const level = trMomentLevelNow();
  // The entrance plays once per leg, ever. A re-render during it (a save, live sync, the
  // suggestions refreshing) continues it from where it is (negative delays): nothing restarts.
  const settle = trChoreoSettle(TM_CHOREO.depart);
  if (!_TM.departPlayed.has(d.key) && !TravelStore.shown(d.key)) { _TM.departPlayed.add(d.key); _TM.departStart = { key: d.key, at: Date.now() }; }
  const st = _TM.departStart && _TM.departStart.key === d.key ? _TM.departStart : null;
  const elapsed = st ? Date.now() - st.at : Infinity;
  const play = elapsed < settle + 2000;
  const el = _tmLayer('depart', level, TM_CHOREO.depart, !play, play ? -elapsed : 0);
  el.classList.remove('trm-layer');
  el.classList.add('trm-depart-wrap');
  const id = 'trm-t-' + (++_TM.uid);
  el.innerHTML = `<section class="trm-card trm-depart" aria-labelledby="${id}">`
    + `<div class="trm-scene">${_tmScene(d, level, d.actor)}</div>`
    + `<div class="trm-body"><button type="button" class="trm-x" aria-label="Dismiss">${_tmIcon('x', 'i-sm')}</button>`
    + `<div class="trm-over">${_tmFlag(d.homeCc)}${_tmIcon('arrow-right')}${_tmFlag(d.destCc)}<span class="trm-overline">${esc(d.overline)}</span></div>`
    + `<h2 class="trm-title" id="${id}" aria-label="${esc(d.title)}"><span aria-hidden="true">${_tmWords(d.title)}</span></h2>`
    + `<p class="trm-line">${esc(d.lineText)}</p><div class="trm-chips">${_tmChipsHtml(d.chips)}</div></div></section>`;
  el.querySelector('.trm-x').addEventListener('click', () => {
    _tmLs(_TM_LS_DEPART_X + d.key, String(Date.now()));
    if (el.animate && level !== 'off') el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).finished.catch(() => {}).then(() => el.remove());
    else el.remove();
  });
  if (play) {
    _tmSettle(el, Math.max(0, settle - elapsed));
    setTimeout(() => { if (!TravelStore.shown(d.key)) TravelStore.momentShown(d.key); }, 0);   // after the render, never inside it
  } else el.classList.add('is-settled', 'is-calm');
  return el;
}
function _tmDepartDue() {
  if (!_tmTravelOn()) return null;
  const snap = trSnapshot();
  if (!snap || snap.pending) return null;
  const mo = (snap.moments || []).find(x => x.kind === 'depart' && x.leg);
  if (!mo) return null;
  const trip = (snap.trips || []).find(t => t.id === mo.tripId) || null;
  const packTitle = trip && trip.slug ? new RegExp('\\bpack', 'i') : null;
  let packed = null;
  if (packTitle && typeof getAllItems === 'function') {
    const t = getAllItems().find(x => packTitle.test(String(x.title || '')) && (trip.tasks || []).includes(x.id));
    if (t && Array.isArray(t.subtasks) && t.subtasks.length) packed = { done: t.subtasks.filter(s => s && s.done).length, total: t.subtasks.length };
  }
  const legView = (snap.legs || []).find(l => l.eventId === mo.leg.eventId);
  const cache = trip && trip.dest && trip.dest.cityId ? _tmWeatherCached(trip.dest.cityId) : null;
  const m = trDepartModel({ now: _tmNowMs(), zone: snap.zone, home: snap.home, leg: mo.leg, trip, weather: cache, packed, checkedIn: !!(legView && legView.checkinTask), h12: _tmH12() });
  m.key = mo.key;
  return m;
}
/** The destination's forecast when TravelStore already has it (no wait inside a render); else fetch it for the next one. */
function _tmWeatherCached(cityId) {
  if (typeof TravelStore === 'undefined' || !TravelStore.config().weather) return null;
  const c = typeof _trlCache !== 'undefined' && _trlCache.weather ? _trlCache.weather.get(cityId) : null;
  if (c && c.data) return c.data;
  TravelStore.weather(cityId).catch(() => {});
  return null;
}

/* ---------- the zone banner hand-over (spec 2.4 step 6) ---------- */
/**
 * 87-clock-ui.js asks before it shows the zone banner. With travel and moments on and the
 * computer now abroad in a country not welcomed yet, the arrival card will follow (2 min later):
 * keep the banner's sentence for the card's note line and say yes. If no arrival comes within
 * 4 min, show() puts the banner up after all.
 */
function trMomentsTakeBanner(ev, words, show) {
  if (!_tmTravelOn() || typeof Clock === 'undefined' || !ev) return false;
  const to = ev.toEffective || Clock.zone();
  if (!to || Clock.placeless(to)) return false;
  const away = Clock.away();
  if (!away || !away.away || !away.cc) return false;
  const shown = TravelStore.decisions().moments;
  const cut = Date.now() - 14 * 86400000;
  if (Object.entries(shown).some(([k, ts]) => k.startsWith('arrive:') && k.endsWith(':' + away.cc) && Number(ts) > cut)) return false;
  clearTimeout(_TM.bannerTimer);
  _TM.banner = { text: [words && words.lead, words && words.rest].filter(Boolean).join(' '), cc: away.cc, show, at: Date.now() };
  _TM.bannerTimer = setTimeout(() => {
    const b = _TM.banner;
    if (!b) return;
    const pending = _TM.queue.some(q => q.cc === b.cc) || (_TM.showing && _TM.showing.cc === b.cc);
    if (!pending) { _TM.banner = null; try { b.show(); } catch (e) { console.error('[moments]', e); } }
  }, 4 * 60000);
  setTimeout(() => TravelMoments.check(), 2 * 60000 + 1500);
  return true;
}

/* ---------- the queue and the driver ---------- */
function _tmShownMap() {
  const ls = _tmJson(_TM_LS_SHOWN) || {};
  const tr = typeof TravelStore !== 'undefined' ? TravelStore.decisions().moments : {};
  return Object.assign({}, ls, tr);
}
function _tmMarkShown(item) {
  if (item.kind === 'travel' && typeof TravelStore !== 'undefined') { TravelStore.momentShown(item.key); return; }
  const ls = _tmJson(_TM_LS_SHOWN) || {};
  ls[item.key] = Date.now();
  const cut = Date.now() - 400 * 86400000;
  for (const [k, v] of Object.entries(ls)) if (Number(v) < cut) delete ls[k];
  _tmLs(_TM_LS_SHOWN, JSON.stringify(ls));
}
function _tmDayCount() { const d = _tmJson(_TM_LS_DAY); return d && d.date === _tmToday() ? d : { date: _tmToday(), n: 0, lastAt: null }; }
/** Motion.moment (MOTION 9.1): queue a moment; render(as, done) draws it as card | flourish | pop. */
function tmMomentAdd(id, render, o) {
  o = o || {};
  const key = String(o.key || `moment.${id}:${_tmToday()}`);
  if (_TM.queue.some(q => q.key === key) || (_TM.showing && _TM.showing.key === key)) return false;
  _TM.queue.push({ id: String(id), key, kind: o.kind || 'daily', at: Number.isFinite(o.at) ? o.at : Date.now(), render, cc: o.cc || '' });
  setTimeout(_tmPump, 0);
  return true;
}
function _tmPump(snap) {
  if (!_TM.queue.length) return;
  const now = Date.now();
  const day = _tmDayCount();
  const r = trMomentQueueNext(_TM.queue, { showing: !!_TM.showing, shown: _tmShownMap(), todayCount: day.n, lastCardAt: day.lastAt, bootAt: _TM.bootAt, blockers: _tmBlockers(snap || null) }, now);
  if (r.action === 'skip') {
    _tmLog('skip ' + r.item.key + ' (' + r.why + ')');
    _TM.queue = _TM.queue.filter(q => q !== r.item);
    if (r.why === 'expired') { _tmMarkShown(r.item); if (r.item.id === 'arrive') _tmSetDot(r.item.key); }
    _tmPump(snap);
    return;
  }
  if (r.action !== 'show') return;
  const item = r.item;
  _TM.queue = _TM.queue.filter(q => q !== item);
  if (item.kind === 'travel' && typeof TravelStore !== 'undefined' && !TravelStore.claim(item.key)) return;   // another tab has it
  _TM.showing = item;
  _tmLog('show ' + item.key + ' as ' + r.as);
  _tmMarkShown(item);
  if (r.as === 'card') _tmLs(_TM_LS_DAY, JSON.stringify({ date: day.date, n: day.n + 1, lastAt: now }));
  const done = () => { if (_TM.showing === item) _TM.showing = null; setTimeout(() => TravelMoments.check(), 400); };
  try { item.render(r.as, done); } catch (e) { console.error('[moments]', e); done(); }
}
function _tmSetDot(key) { _tmLs(_TM_LS_DOT, JSON.stringify({ key, date: _tmToday() })); if (window.Travel && typeof Travel.chipDot === 'function') Travel.chipDot(true); try { document.dispatchEvent(new CustomEvent('travel-moments-dot')); } catch (e) { /* old browser */ } if (typeof renderTopbarWidgets === 'function') renderTopbarWidgets(); }
/** Arrival content from the snapshot, the cached weather and the calendar. */
async function _tmArrivalFor(mo, snap) {
  const place = mo.place || {};
  let weather = null;
  if (place.cityId && TravelStore.config().weather) {
    try { weather = await Promise.race([TravelStore.weather(place.cityId), new Promise(r => setTimeout(() => r(null), 1500))]); } catch (e) { weather = null; }
  }
  const trip = (snap.trips || []).find(t => t.id === mo.tripId) || null;
  let rate = null;
  if (trip && trip.ccy && trip.spending && trip.spending.byCcy && trip.spending.byCcy[trip.ccy]) {
    const v = trip.spending.byCcy[trip.ccy];
    if (v.home > 0 && v.orig > 0) rate = { ccy: trip.ccy, perHome: Math.round(v.orig / v.home) };
  }
  let nextEvent = null;
  const now = _tmNowMs();
  try {
    const evs = typeof calAllEvents === 'function' ? calAllEvents() : [];
    for (const ev of evs) {
      if (!ev || !ev.start || !ev.start.dateTime || ev.status === 'cancelled') continue;
      const s = Date.parse(ev.start.dateTime);
      if (s > now && s - now <= 12 * 3600000 && (!nextEvent || s < nextEvent.start)) nextEvent = { title: String(ev.summary || '').slice(0, 60), start: s };
    }
  } catch (e) { nextEvent = null; }
  const b = _TM.banner && _TM.banner.cc === place.cc ? _TM.banner.text : '';
  if (b) { _TM.banner = null; clearTimeout(_TM.bannerTimer); }
  const landed = snap.landed && snap.landed.cc === place.cc ? `Your ${mo.leg && mo.leg.mode && mo.leg.mode !== 'flight' ? 'train' : 'flight'} arrived in ${snap.landed.label || place.label}. This computer still shows ${Clock.label(Clock.home())} time.` : '';
  const m = trArrivalModel({ now, zone: place.zone || snap.zone, place, home: snap.home, leg: mo.leg, source: snap.where && snap.where.source, trip, weather, meetings: snap.meetings, nextEvent, holidays: snap.holidays, rate, h12: _tmH12(), banner: b, landed, key: mo.key });
  m.tripId = mo.tripId || m.tripId;
  if (place.cityId) m.cityId = place.cityId;   // the world pack's landmark on the card (78-anim-world.js)
  return m;
}
function _tmHomeFor(mo, snap) {
  const trip = (snap.trips || []).find(t => t.id === mo.tripId) || null;
  const body = snap.body && snap.body.active && Number.isFinite(snap.body.D) ? Math.round(snap.body.D) * 60 : 0;   // trBody: D hours, local - body (whole hours)
  const weather = typeof _bf !== 'undefined' && _bf.weather && _bf.weather.ok ? _bf.weather : null;   // the brief's forecast is home's
  const m = trHomeModel({ now: _tmNowMs(), home: snap.home, trip, weather, bodyDiffMin: body, h12: _tmH12(), key: mo.key });
  return m;
}
/** Look for due moments (arrivals and welcome-homes) and queue them; departures are Home cards. */
function _tmCheck() {
  _TM.lastCheck = Date.now();
  if (!_tmTravelOn() || typeof trSnapshot !== 'function') { _tmPump(null); return; }
  let snap = null;
  try { snap = trSnapshot(); } catch (e) { console.error('[moments]', e); return; }
  if (!snap || snap.pending) return;
  const shown = _tmShownMap();
  const now = _tmNowMs();
  const forgotten = (id) => { const d = TravelStore.decisions(); return !!(id && d.notTrips[id]); };
  for (const mo of snap.moments || []) {
    if ((mo.kind !== 'arrive' && mo.kind !== 'home') || !mo.key || shown[mo.key] || forgotten(mo.tripId)) continue;
    if (_TM.queue.some(q => q.key === mo.key) || (_TM.showing && _TM.showing.key === mo.key)) continue;
    const due = trMomentDue({ key: mo.key, due: mo.due }, { now, shown });
    if (due.skip) { TravelStore.momentShown(mo.key); if (mo.kind === 'arrive') _tmSetDot(mo.key); continue; }
    if (!due.show) continue;
    const cc = mo.place && mo.place.cc;
    tmMomentAdd(mo.kind, (as, done) => {
      if (mo.kind === 'arrive') {
        _tmArrivalFor(mo, snap).then((m) => { _tmSetDot(mo.key); _tmShowModal('arrive', m, { onDone: done }); }).catch((e) => { console.error('[moments]', e); done(); });
      } else _tmShowPostcard(_tmHomeFor(mo, snap), { onDone: done });
    }, { key: mo.key, kind: 'travel', at: Number.isFinite(mo.due) ? Date.now() - Math.max(0, now - mo.due) : Date.now(), cc });
  }
  _tmPump(snap);
}

/* ---------- the API ---------- */
const TravelMoments = {
  check() { try { _tmCheck(); } catch (e) { console.error('[moments]', e); } },
  /** The last arrival card, settled, grown from the chip (the chip's click and its menu). */
  reopen() {
    const m = _TM.last || _tmLastArrivalModel();
    if (!m || _TM.open) return false;
    TravelMoments.clearDot();
    _tmShowModal('arrive', m, { settled: true, from: _tmChip() });
    return true;
  },
  /** The chip's click: reopen the card, or dock it when it is open. */
  toggle() { if (_TM.open && _TM.open.close) { _TM.open.close('dock'); return false; } return TravelMoments.reopen(); },
  isOpen: () => !!_TM.open,
  /** SURFACES' chip click (69-travel-ui.js): true when handled (reopen, or dock the open card); false = show the menu. */
  chipClick() {
    if (_TM.open && _TM.open.close) { _TM.open.close('dock'); return true; }
    if (!(_TM.last || _tmLastArrivalModel())) return false;
    return TravelMoments.reopen();
  },
  openFull() { return TravelMoments.reopen(); },
  hasDot() {
    if (window.Travel && typeof Travel.chipDot === 'function' && Travel.chipDot()) return true;
    const d = _tmJson(_TM_LS_DOT); return !!(d && d.date === _tmToday());
  },
  clearDot() { _tmLs(_TM_LS_DOT, null); if (window.Travel && typeof Travel.chipDot === 'function') Travel.chipDot(false); if (typeof renderTopbarWidgets === 'function') renderTopbarWidgets(); },
  dotHtml() { return TravelMoments.hasDot() ? '<i class="trm-newdot" aria-label="New: arrival card"></i>' : ''; },
  chipMenu() {
    const t = _TM.last && _TM.last.tripId;
    return [
      { id: 'arrival', label: 'Arrival card', icon: 'maximize-2', run: () => TravelMoments.reopen() },
      ...(t ? [{ id: 'trip', label: 'Trip', icon: 'map', run: () => _tmGo('trip:' + t) }] : []),
      { id: 'settings', label: 'Travel settings', icon: 'settings', run: () => _tmGo(_tmSettingsView()) },
    ];
  },
  /** Show a moment with sample (or given) content, with no once-key: screenshots, the Settings preview. */
  preview(kind, o) {
    o = o || {};
    if (_TM.open && _TM.open.close) _TM.open.close('fade');
    const level = o.level || trMomentLevelNow();
    const m = o.model || _tmSample(kind);
    if (kind === 'home') return _tmShowPostcard(m, { level });
    if (kind === 'recap') return _tmShowModal('recap', m, { level });
    if (kind === 'reopen') return _tmShowModal('arrive', m, { level, settled: true, from: _tmChip() });
    return _tmShowModal('arrive', m, { level });
  },
  close(how) { if (_TM.open && _TM.open.close) _TM.open.close(how || 'dock'); },
  sample: (kind) => _tmSample(kind),
  _state: _TM,
};
if (typeof window !== 'undefined') window.TravelMoments = TravelMoments;
function _tmLastArrivalModel() {
  if (!_tmTravelOn()) return null;
  const snap = trSnapshot();
  const d = _tmJson(_TM_LS_DOT);
  const shown = TravelStore.decisions().moments;
  const key = (d && d.key) || Object.keys(shown).filter(k => k.startsWith('arrive:')).sort((a, b) => shown[b] - shown[a])[0];
  if (!key || !snap.where || !snap.where.away) return null;
  const parts = key.split(':');
  const m = trArrivalModel({ now: _tmNowMs(), place: snap.where.place, home: snap.home, leg: snap.where.leg, source: snap.where.source, meetings: snap.meetings, holidays: snap.holidays, h12: _tmH12(), key, tripId: parts[1] });
  m.tripId = parts[1] || '';
  _TM.last = m;
  return m;
}
/** Sample content for previews (fake data: Tokyo, home London). */
function _tmSample(kind) {
  const now = _tmNowMs();
  const home = { zone: (typeof Clock !== 'undefined' && Clock.home()) || 'Europe/London', label: 'London', cc: 'GB', ccy: 'GBP' };
  const wx = { ok: true, current: { temp: 18, cond: 'rain', label: 'Light rain' }, today: { sunrise: '05:44', sunset: '17:22', hi: 19 }, hourly: [] };
  if (kind === 'home' || kind === 'recap') {
    return trHomeModel({ now, home, trip: { id: 'trip-sample', label: 'Tokyo', dest: { label: 'Tokyo', cc: 'JP' }, from: Clock.addDays(Clock.today(), -6), to: Clock.today(), groupEvents: Array.from({ length: 9 }, (_, i) => 'e' + i), spending: { byCcy: { JPY: { orig: 48200, home: 254 } } } }, bodyDiffMin: -480, h12: _tmH12() });
  }
  const m = trArrivalModel({ now, place: { cc: 'JP', cityId: 'tokyo-jp', zone: 'Asia/Tokyo', label: 'Tokyo', kind: 'city' }, home, source: 'calendar', weather: wx,
    leg: { mode: 'flight', arrive: now - 40 * 60000, to: { iata: 'HND' } }, rate: { ccy: 'JPY', perHome: 190 }, nextEvent: { title: 'Dinner', start: now + 3 * 3600000 }, h12: _tmH12() });
  m.tripId = 'trip-sample';
  m.cityId = 'tokyo-jp';
  return m;
}

/* ---------- start: Motion.moment when the motion build has none; the driver ---------- */
function _tmStart() {
  if (_TM.started) return;
  _TM.started = true;
  _TM.bootAt = Date.now();
  if (window.Motion && typeof Motion.moment !== 'function') Motion.moment = tmMomentAdd;
  if (typeof TravelStore !== 'undefined') TravelStore.onChange(() => { if (Date.now() - _TM.lastCheck > 2000) setTimeout(() => TravelMoments.check(), 50); });
  if (typeof Clock !== 'undefined' && Clock.onChange) Clock.onChange(() => setTimeout(() => TravelMoments.check(), 200));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(() => TravelMoments.check(), 300); });
  document.addEventListener('focusout', () => { if (_TM.queue.length) setTimeout(() => _tmPump(null), 600); });
  _TM.timer = setInterval(() => { if (!document.hidden) TravelMoments.check(); }, 20000);
  setTimeout(() => TravelMoments.check(), 10500);   // 10 s after boot (spec 4.1)
}
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _tmStart);
  else setTimeout(_tmStart, 0);
}
