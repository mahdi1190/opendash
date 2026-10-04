/* ============================================================
   BRIEF + REVIEW: the places it shows up elsewhere (owner: Brief + Review).
     - Home: briefHomeBanner(root), the central "Start my day" / "Finish the day"
     - top bar: a "Start my day" / "Finish the day" pill (registerTopbarWidget)
     - sidebar (Home): Review entries; the palette: commands
     - Settings: "Home and stories" and "Animations" (gallery, keyword rules,
       per-item overrides, Claude for unknown titles); the town for the
       weather in Profile (briefSettingsLocationRow) and onboarding
       (briefOnboardingLocationField)
     - celebrations: animCelebrate(task) after a completion, animBurst(el, type)
     - a tiny scene on hover over calendar entries and Home cards
     - the calendar event panel header (animPanelHeader) with "Change animation"
     - the weekly-review nudge (reviewMaybePrompt) replaces the old modal
   ============================================================ */

/* ---------- Home ---------- */
function _briefSeenToday() { try { return localStorage.getItem('dashboard-brief-seen') === todayStr(); } catch (e) { return false; } }
// Hours where the user is (Clock, travel spec 2.7 P11).
function _briefHourNow() { return Clock.parts(Clock.now()).h; }
function _eveningNow() { return _briefHourNow() >= briefPrefs().eveningHour; }
function _eveningSavedToday() { return (state.reviews || []).some(r => r && r.kind === 'evening' && r.date === todayStr()); }
function briefHomeBanner(root) {
  const h = _briefHourNow();
  const evening = _eveningNow();
  const morning = !evening && (h < 12 || !_briefSeenToday());
  const w = _bf.weather && _bf.weather.ok ? _bf.weather : null;
  if (!_bf.weather && _serverAvailable && APP_CONFIG.location) briefLoadWeather().then(() => { const b = document.querySelector('.home-brief'); if (b && state.view === 'home') b.replaceWith(_briefBannerEl()); });
  root.appendChild(_briefBannerEl(morning, evening, w));
}
function _briefBannerEl(morning, evening, w) {
  if (morning === undefined) { evening = _eveningNow(); morning = !evening && (_briefHourNow() < 12 || !_briefSeenToday()); w = _bf.weather && _bf.weather.ok ? _bf.weather : null; }
  const el = document.createElement('section');
  const big = morning || (evening && !_eveningSavedToday());
  el.className = 'home-brief' + (big ? ' big' : ' small') + (evening ? ' is-evening' : '') + ' anim-hover-host';
  const tod = briefTod(w);
  const cond = w && w.current ? w.current.cond : 'none';
  const wx = w && w.current ? `<span class="hb-wx">${briefWxIcon(cond, w.current.isDay, 'i-sm')}<b class="num">${esc(_bfDeg(w.current.temp))}</b><span>${esc(w.current.label)}</span></span>` : '';
  if (big) {
    el.innerHTML = (animEnabled() ? briefSkyHtml(cond, evening ? (tod === 'night' ? 'night' : 'dusk') : tod, { setting: evening }) : '')
      + `<div class="hb-in">${animSceneHtml(evening ? 'rest' : 'idea', { size: 'lg', hover: true })}<div class="hb-t"><div class="overline">${esc(evening ? 'Evening' : 'Morning')}</div><b>${esc(evening ? 'Ready to wrap up?' : 'Your day, laid out')}</b><span>${esc(evening ? 'See what you got done, roll what slipped and pick tomorrow’s top 3.' : 'Weather, calendar, focus and deadlines, refreshed and on one calm page.')}</span></div>${wx}</div>`;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-primary btn-lg hb-go';
    b.innerHTML = icon(evening ? 'sunset' : 'sunrise') + `<span>${evening ? 'Finish the day' : 'Start my day'}</span>`;
    b.onclick = () => (evening ? (typeof storyFinishTheDay === 'function' ? storyFinishTheDay() : setView('home:evening')) : typeof storyStartMyDay === 'function' ? storyStartMyDay() : briefOpen({ welcome: false }));
    el.querySelector('.hb-in').appendChild(b);
  } else {
    el.innerHTML = `<div class="hb-in">${wx}<span class="spacer"></span></div>`;
    const row = el.querySelector('.hb-in');
    const mk = (label, ic, run) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.innerHTML = icon(ic, 'i-sm') + `<span>${esc(label)}</span>`; b.onclick = run; row.appendChild(b); };
    mk('Today', 'sunrise', () => briefOpen({ welcome: false }));
    mk(evening ? 'Recap saved' : 'Finish the day', evening ? 'circle-check' : 'sunset', () => setView('home:evening'));
    mk('Weekly review', 'calendar-range', () => setView('home:week'));
  }
  return el;
}

/* ---------- top bar ---------- */
registerTopbarWidget({
  id: 'brief-cta', order: 5,
  render(el) {
    // On Home (any tab) the day's hero and the tabs carry the same buttons: no second copy up here.
    if (typeof state === 'undefined' || /^(home|review)(:|$)/.test(String(state.view))) return false;
    const evening = _eveningNow();
    let label = '', ic = '', go = null;
    if (evening && !_eveningSavedToday()) { label = 'Finish the day'; ic = 'sunset'; go = () => setView('home:evening'); }
    else if (!evening && !_briefSeenToday()) { label = 'Start my day'; ic = 'sunrise'; go = () => briefOpen({ welcome: false }); }
    if (!go) { el.innerHTML = ''; return false; }
    // The pill opens the full-screen story over its page (79-story-engine.js); "Open details" is one click away.
    if (typeof storyOpen === 'function') { const page = go, kind = evening ? 'evening' : 'morning'; go = () => { page(); storyOpen(kind, { autoplay: true }); }; }
    if (el.dataset.k !== label) {
      el.dataset.k = label;
      el.innerHTML = `<button type="button" class="tb-brief">${icon(ic, 'i-sm')}<span>${esc(label)}</span></button>`;
    }
    el.querySelector('button').onclick = go;
    return true;
  },
});

/* ---------- sidebar (Home) and palette ---------- */
registerSidebarBlock('home', {
  id: 'review-nav', order: 12,
  render(el, ctx) {
    // Home's other tabs (77-brief-review.js); Home itself (the Today tab) is the item above.
    el.appendChild(sbSection({ title: 'Review' }));
    el.appendChild(sbNavItem({ label: 'Finish the day', icon: 'sunset', view: 'home:evening', badge: _eveningNow() && !_eveningSavedToday() ? 'now' : '' }));
    el.appendChild(sbNavItem({ label: 'Weekly review', icon: 'calendar-range', view: 'home:week' }));
    el.appendChild(sbNavItem({ label: 'History', icon: 'history', view: 'home:history' }));
  },
});
registerCommand({ id: 'brief-start', label: 'Start my day', icon: 'sunrise', group: 'Go to', keywords: 'home morning brief today weather welcome plan day story', run: () => (typeof storyStartMyDay === 'function' ? storyStartMyDay() : briefOpen({ welcome: false })) });
registerCommand({ id: 'brief-evening', label: 'Finish the day', icon: 'sunset', group: 'Go to', keywords: 'evening recap end of day wrap up roll over tomorrow top 3 story', run: () => (typeof storyFinishTheDay === 'function' ? storyFinishTheDay() : setView('home:evening')) });
registerCommand({ id: 'brief-week', label: 'Weekly review', icon: 'calendar-range', group: 'Go to', keywords: 'week review outcomes plan retrospective', run: () => setView('home:week') });
registerCommand({ id: 'brief-history', label: 'History', icon: 'history', group: 'Go to', keywords: 'review history past reviews briefs recaps mornings', run: () => setView('home:history') });
registerCommand({ id: 'brief-refresh', label: 'Refresh Home (calendar, inbox, finances)', icon: 'refresh-cw', keywords: 'morning brief update calendar inbox finances weather', run: () => { briefOpen({ welcome: false }); setTimeout(() => briefRefresh(true), 50); } });

/* ---------- weekly-review nudge (75-modals.js calls this) ---------- */
function reviewMaybePrompt() {
  const now = Clock.parts(Clock.now());
  const dow = now.dow, hour = now.h;
  if (!((dow === 5 && hour >= 15) || dow === 6 || dow === 0 || (dow === 1 && hour < 12))) return;
  if (Date.now() - (state.lastReviewPrompt || 0) < 5 * 86400000) return;
  if (/^home:/.test(String(state.view))) return;      // not on top of Home's Evening / Week / History tabs
  if (typeof storyIsOpen === 'function' && storyIsOpen()) return;   // never over a playing story
  if (typeof _obOpen !== 'undefined' && _obOpen) return;           // never over the welcome set-up
  if (!getAllItems().length) return;                                // a new data folder: nothing to review yet
  const r = reviewWeekRange(todayStr(), APP_CONFIG.weekStart || 'Mon');
  if ((state.reviews || []).some(x => x && x.kind === 'week' && (x.date === r.from || x.date === r.prevFrom))) return;
  state.lastReviewPrompt = Date.now(); saveUI();
  toast('Time for your weekly review? Seven short steps.', { icon: 'calendar-range', timeout: 12000, action: { label: 'Start', run: () => (typeof storyWeekFromPrompt === 'function' ? storyWeekFromPrompt() : setView('home:week')) } });
}

/* ---------- celebrations ---------- */
let _celebrateAt = 0, _celebrateN = 0, _pointer = { x: 0, y: 0, at: 0 };
document.addEventListener('pointerdown', (e) => { _pointer = { x: e.clientX, y: e.clientY, at: Date.now() }; }, true);
/** A tiny once-only scene where the user clicked, after a task is completed. Never during bulk changes. */
function animCelebrate(item) {
  if (!briefPrefs().celebrate || !animEnabled() || document.hidden) return;
  const now = Date.now();
  _celebrateN = now - _celebrateAt < 2500 ? _celebrateN + 1 : 1;
  if (_celebrateN > 2 || now - _pointer.at > 3000) return;      // a burst of completions or no click: stay quiet
  _celebrateAt = now;
  const type = animForTask(item).type;
  // A kind with its own celebration (email, writing, coding, admin, exercise...) or a context
  // moment (submission, milestone, streak, all Focus done): 78-delight-hooks.js.
  try { if (typeof delightCelebrate === 'function' && delightCelebrate(item, type)) return; } catch (e) { console.error('[delight]', e); }
  const el = document.createElement('div');
  el.className = 'anim-pop';
  el.style.left = Math.max(40, Math.min(window.innerWidth - 40, _pointer.x)) + 'px';
  el.style.top = Math.max(40, _pointer.y) + 'px';
  el.innerHTML = animSceneHtml(type, { size: 'md', once: true, cls: 'is-live' });
  if (typeof animTaskDone === 'function') animTaskDone(item, _pointer.x, _pointer.y);   // the stream's completion style, behind (78-anim-moments.js)
  document.body.appendChild(el);
  if (BRIEF_CELEBRATE_TYPES.includes(type) || effPriority(item) === 'p1') animBurst(el, type);
  setTimeout(() => el.remove(), 1700);
}
/** A one-off confetti burst at an element (transform + opacity only). */
function animBurst(at, type) {
  if (!at || !animEnabled()) return;
  const r = at.getBoundingClientRect();
  const host = document.createElement('div'); host.className = 'anim-burst'; host.setAttribute('aria-hidden', 'true');
  host.style.left = (r.left + r.width / 2) + 'px'; host.style.top = (r.top + r.height / 2) + 'px';
  const colours = ['var(--sw-pink)', 'var(--sw-amber)', 'var(--sw-indigo)', 'var(--sw-teal)', 'var(--sw-violet)', 'var(--sw-green)'];
  let html = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + (i % 2) * 0.2, d = 46 + (i * 37 % 40);
    html += `<i style="--tx:${(Math.cos(a) * d).toFixed(1)}px;--ty:${(Math.sin(a) * d - 18).toFixed(1)}px;--r:${(i * 47) % 360}deg;background:${colours[i % colours.length]}"></i>`;
  }
  host.innerHTML = html;
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 1300);
}

/* ---------- a tiny scene on hover (calendar, Home cards) ---------- */
let _hoverTip = null, _hoverTimer = null, _hoverFor = null;
const _HOVER_SEL = '.hf-card[data-id], .tl-item[data-id], .hw-item[data-id], .hw-row[data-id], [data-kind="event"][data-id], [data-kind="task"][data-id]';
document.addEventListener('mouseover', (e) => {
  if (!animEnabled() || !e.target || !e.target.closest) return;
  const host = e.target.closest(_HOVER_SEL);
  // A host that already shows its own scene (Home's Focus rows) needs no badge.
  if (!host || host === _hoverFor || host.closest('.brief, .anim-gallery, .rv') || host.querySelector('.anim-scene')) return;
  _hoverFor = host;
  clearTimeout(_hoverTimer);
  _hoverTimer = setTimeout(() => _showHoverScene(host), 280);
});
document.addEventListener('mouseout', (e) => {
  if (!_hoverFor) return;
  if (e.relatedTarget && _hoverFor.contains(e.relatedTarget)) return;
  _hoverFor = null; clearTimeout(_hoverTimer);
  if (_hoverTip) { _hoverTip.remove(); _hoverTip = null; }
});
function _showHoverScene(host) {
  if (_hoverFor !== host || !host.isConnected) return;
  const id = host.dataset.id, kind = host.dataset.kind || 'task';
  let type = null;
  if (kind === 'event') { const ev = typeof calEventById === 'function' ? calEventById(id) : null; if (ev) type = animForEvent(ev).type; }
  else { const it = getItem(id); if (it) type = animForTask(it).type; }
  if (!type) return;
  if (_hoverTip) _hoverTip.remove();
  const r = host.getBoundingClientRect();
  const tip = document.createElement('div'); tip.className = 'anim-tip'; tip.setAttribute('aria-hidden', 'true');
  tip.innerHTML = animSceneHtml(type, { size: 'sm', cls: 'is-live' });
  // A badge on the card's top-right corner: it never covers the controls above the card.
  tip.style.left = Math.min(window.innerWidth - 40, r.right - 24) + 'px';
  tip.style.top = Math.max(4, r.top - 12) + 'px';
  document.body.appendChild(tip);
  _hoverTip = tip;
}

/* ---------- calendar event panel (43-calendar-panel.js calls this) ---------- */
function animPanelHeader(top, ev) {
  if (!top || !ev) return;
  const a = animForEvent(ev);
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ev-scene';
  b.setAttribute('aria-label', `Animation: ${animScene(a.type).label}. Change it`);
  b.setAttribute('data-tip', `${animScene(a.type).label} · ${a.why}. Click to change`);
  b.innerHTML = animSceneHtml(a.type, { size: 'md' });
  b.onclick = (e) => { e.stopPropagation(); animPickType(b, { kind: 'event', title: ev.summary }, a.type); };
  const sw = top.querySelector('.ev-sw');
  if (sw) sw.replaceWith(b); else top.prepend(b);
  animActivate(top);
}
/** Menu of scene types; picking one saves a per-item override (data, one undo step). */
function animPickType(anchor, item, current) {
  const key = animKey(item);
  const p = animPrefs();
  const items = [];
  if (p.overrides[key]) items.push({ label: 'Back to automatic', icon: 'rotate-ccw', run: () => animSetOverride(key, null) }, 'sep');
  const cats = Object.keys(ANIM_CATEGORIES);
  for (const c of cats) {
    const list = ANIM_SCENES.filter(s => s.cat === c);
    if (!list.length) continue;
    items.push({ heading: ANIM_CATEGORIES[c] });
    for (const s of list) items.push({ label: s.label, checked: s.type === current, run: () => animSetOverride(key, s.type) });
  }
  openMenu(anchor, items, { align: 'start' });
}
function animSetOverride(key, type) {
  if (!state.animPrefs || typeof state.animPrefs !== 'object') state.animPrefs = {};
  const o = Object.assign({}, state.animPrefs.overrides || {});
  if (type) o[key] = type; else delete o[key];
  state.animPrefs = Object.assign({}, state.animPrefs, { overrides: o });
  saveData(); render();
}

/* ---------- Settings: the town for the weather ---------- */
function _briefLocLabel(l) { return l ? [l.name, l.admin, l.country].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(', ') : ''; }
/** A city search box. onPick(location|null). Results come from /api/brief/geocode (Open-Meteo). */
function briefLocationPicker(current, onPick) {
  const wrap = document.createElement('div'); wrap.className = 'loc-pick';
  const box = document.createElement('label'); box.className = 'input input-sm';
  box.innerHTML = icon('map-pin');
  const inp = document.createElement('input'); inp.placeholder = 'Search for your town or city'; inp.value = _briefLocLabel(current); inp.setAttribute('aria-label', 'Town or city for the weather');
  inp.autocomplete = 'off';
  box.appendChild(inp);
  const res = document.createElement('div'); res.className = 'loc-res'; res.setAttribute('role', 'listbox'); res.hidden = true;
  wrap.append(box, res);
  let timer = null, seq = 0;
  inp.oninput = () => {
    clearTimeout(timer);
    const q = inp.value.trim();
    if (q.length < 2) { res.hidden = true; return; }
    timer = setTimeout(async () => {
      const my = ++seq;
      res.hidden = false; res.innerHTML = '<div class="loc-msg"><span class="spinner"></span><span>Searching…</span></div>';
      try {
        const j = await _bfJson('/api/brief/geocode?q=' + encodeURIComponent(q));
        if (my !== seq) return;
        res.innerHTML = '';
        if (!j.results || !j.results.length) { res.innerHTML = '<div class="loc-msg">No place found.</div>'; return; }
        for (const l of j.results) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'loc-opt'; b.setAttribute('role', 'option');
          b.innerHTML = `${icon('map-pin', 'i-sm')}<span><b>${esc(l.name)}</b> <span class="muted">${esc([l.admin, l.country].filter(Boolean).join(', '))}</span></span>`;
          b.onclick = () => { inp.value = _briefLocLabel(l); res.hidden = true; onPick(l); };
          res.appendChild(b);
        }
      } catch (e) { if (my === seq) res.innerHTML = `<div class="loc-msg">${esc(e.message || 'The search is not reachable right now.')}</div>`; }
    }, 300);
  };
  inp.onkeydown = (e) => { if (e.key === 'Escape') { res.hidden = true; } if (e.key === 'Enter') { e.preventDefault(); const f = res.querySelector('.loc-opt'); if (f) f.click(); } };
  return wrap;
}
function briefSettingsLocationRow() {
  const cur = APP_CONFIG.location || null;
  const ctl = document.createElement('div'); ctl.className = 'loc-ctl';
  ctl.appendChild(briefLocationPicker(cur, async (l) => {
    if (await settingsSaveConfig({ location: l }, `Weather is now for ${l.name}`)) { _bf.weather = null; briefLoadWeather(true); }
  }));
  if (cur) {
    const clr = document.createElement('button'); clr.type = 'button'; clr.className = 'btn btn-ghost btn-sm'; clr.textContent = 'Clear';
    clr.onclick = async () => { if (await settingsSaveConfig({ location: null }, 'Weather turned off')) { _bf.weather = null; render(); } };
    ctl.appendChild(clr);
  }
  return _settingsRow('Town for the weather', 'Used by Home’s greeting and the stories. The forecast comes from Open-Meteo.com (free, no account); only the place is sent.', ctl);
}
/** For the welcome set-up (59-onboarding.js): d.location is filled when a place is picked. */
function briefOnboardingLocationField(d) {
  const f = document.createElement('label'); f.className = 'field';
  const l = document.createElement('span'); l.className = 'field-label'; l.textContent = 'Town for the weather (optional)';
  const h = document.createElement('span'); h.className = 'field-hint'; h.textContent = 'For Home’s greeting and the stories. Weather data by Open-Meteo.com.';
  f.append(l, briefLocationPicker(d.location || null, (loc) => { d.location = loc; }), h);
  return f;
}

/* ---------- Settings: Home's day (the hero, the stories, Finish the day, the week) ---------- */
registerSettingsGroup({
  id: 'brief', title: 'Home and stories', icon: 'sunrise', order: 55,
  description: 'The top of Home (the greeting, the day in three sentences, Play my morning), Finish the day and the weekly review.',
  render(el) {
    const p = briefPrefs();
    const save = (patch, msg) => settingsSaveConfig({ brief: patch }, msg).then(ok => { if (ok) render(); });
    el.appendChild(_settingsRow('Open on the first visit of the day', 'Home comes forward with today’s greeting the first time you open the dashboard each day. It refreshes your calendar, inbox and finances in the background.', _settingsSwitch(p.autoOpen, 'Open automatically', (on) => save({ autoOpen: on }, on ? 'Home will greet you each morning' : 'Home will wait for you'))));
    el.appendChild(_settingsRow('Day in three sentences', 'A short summary written by Claude, once a day. Needs Claude (Connections).', _settingsSwitch(p.ai, 'AI summary', (on) => save({ ai: on }))));
    el.appendChild(_settingsRow('Model for summaries', 'Haiku is quick and light; the others write a little more carefully.', _settingsSelect(SETTINGS_MODELS, p.model, (v) => save({ model: v }))));
    el.appendChild(_settingsRow('Offer “Finish the day” from', 'Home and the top bar suggest the evening recap from this hour.', _settingsSelect(['15', '16', '17', '18', '19', '20', '21'].map(x => [x, x + ':00']), String(p.eveningHour), (v) => save({ eveningHour: Number(v) }))));
    el.appendChild(_settingsRow('Temperatures', null, _settingsSeg([['metric', '°C'], ['imperial', '°F']], p.units, (k) => save({ units: k }).then(() => { _bf.weather = null; }))));
    el.appendChild(briefSettingsLocationRow());
    if (typeof storySettingsRows === 'function') storySettingsRows(el);   // 79-story-engine.js
    const open = document.createElement('button'); open.type = 'button'; open.className = 'btn btn-secondary btn-sm';
    open.innerHTML = icon('sunrise', 'i-sm') + '<span>Go to Home now</span>';
    open.onclick = () => briefOpen({ welcome: false });
    el.appendChild(_settingsRow('Try it', null, open));
  },
});

/* ---------- Settings: Animations ---------- */
registerSettingsGroup({
  id: 'animations', title: 'Animations', icon: 'sparkles', order: 56,
  description: 'The little scenes for events and tasks, the weather sky and the small celebrations.',
  render(el) {
    const p = briefPrefs();
    const sys = !!(window.Motion && Motion.prefersReduced());
    const save = (patch) => settingsSaveConfig({ brief: patch }, false).then(ok => { if (ok) { _animSyncRoot(); render(); } });
    // The OS asks for reduced motion (Windows: Animation effects off): say so plainly, and let the user animate anyway.
    if (window.Motion && Motion.osReduced && Motion.osReduced()) {
      const anyway = Motion.osOverride();
      const note = document.createElement('div'); note.className = 'callout set-callout' + (anyway ? '' : ' warn');
      note.innerHTML = icon('info') + `<span>${anyway
        ? 'Your computer asks apps for reduced motion, but you chose to animate anyway on this device.'
        : 'Your computer asks apps for reduced motion (on Windows: Settings &gt; Accessibility &gt; Visual effects &gt; Animation effects is off), so nearly every animation here is silenced. Turn that back on, or animate anyway on this device.'}</span>`;
      note.setAttribute('data-anim-os-note', '');
      el.appendChild(note);
      el.appendChild(_settingsRow('Animate anyway', 'Ignore the system’s reduced-motion request in this browser only. Your intensity choice below still applies.',
        _settingsSwitch(anyway, 'Animate anyway', (on) => { Motion.setOsOverride(on); _animSyncRoot(); render(); })));
    }
    // Intensity (per device, src/motion.js): scales every duration, distance and stagger, or turns motion off.
    if (window.Motion && Motion.setLevel) {
      const osRed = Motion.systemReduced && Motion.systemReduced();
      const seg = _settingsSeg([['off', 'Off'], ['subtle', 'Subtle'], ['standard', 'Standard'], ['playful', 'Playful']], Motion.chosenLevel(),
        (k) => { Motion.setLevel(k); _animSyncRoot(); render();
          requestAnimationFrame(() => { const pv = document.querySelector('.mx-preview'); if (pv) { pv.classList.remove('is-playing'); void pv.offsetWidth; pv.classList.add('is-playing'); } }); });
      const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap';
      const pv = document.createElement('span'); pv.className = 'mx-preview'; pv.setAttribute('aria-hidden', 'true');
      pv.innerHTML = '<i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i><i style="--i:3"></i>';
      wrap.append(seg, pv);
      el.appendChild(_settingsRow('Intensity', osRed ? 'Your system asks for reduced motion, so only short fades play whatever this says.' : 'How much the interface moves on this device: Off keeps everything still; Playful adds bigger celebrations.', wrap));
    }
    // The opening sequence (78-anim-wire.js): the brand, "Welcome to <county>", the county's scene.
    if (typeof animOpeningModeSync === 'function') {
      const seg = _settingsSeg([['every', 'Every load'], ['daily', 'First load of the day'], ['off', 'Off']], animOpeningMode(),
        (k) => { animLookSave({ opening: k }); animOpeningModeSync(); render(); });
      el.appendChild(_settingsRow('Opening', 'When the app opens: the OpenDash mark, then "Welcome to …" your county (with Regional animations (UK) on) and today\'s scene from it, full screen, for a few seconds. Later loads that day show just the short mark. A click or any key skips it.', seg));
    }
    el.appendChild(_settingsRow('Animations', sys ? 'Reduced motion is on (system or Appearance), so scenes stay still whatever this says.' : 'Weather, scenes and moving text. Everything stays still when this is off.', _settingsSwitch(p.animations, 'Animations', (on) => save({ animations: on }))));
    el.appendChild(_settingsRow('Celebrate completed tasks', 'A tiny animation where you clicked, for a second. Never for bulk changes.', _settingsSwitch(p.celebrate, 'Celebrations', (on) => save({ celebrate: on }))));

    // Keyword rules
    const prefs = animPrefs();
    const rules = document.createElement('div'); rules.className = 'anim-rules';
    const list = document.createElement('ul'); list.className = 'anim-rule-list';
    prefs.rules.forEach((r, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<code>${esc(r.kw)}</code>${icon('arrow-right', 'i-xs')}${animSceneHtml(r.type, { size: 'xs' })}<span>${esc(animScene(r.type).label)}</span>`;
      const x = document.createElement('button'); x.type = 'button'; x.className = 'btn btn-ghost btn-sm btn-icon'; x.setAttribute('aria-label', 'Remove rule'); x.innerHTML = icon('x', 'i-sm');
      x.onclick = () => { const next = prefs.rules.slice(); next.splice(i, 1); state.animPrefs = Object.assign({}, state.animPrefs || {}, { rules: next }); saveData(); render(); };
      li.appendChild(x); list.appendChild(li);
    });
    const add = document.createElement('div'); add.className = 'anim-rule-add';
    const kw = document.createElement('input'); kw.className = 'control control-sm'; kw.placeholder = 'a word in the title, e.g. 5-a-side'; kw.maxLength = 40;
    const sel = _settingsSelect(ANIM_SCENES.map(s => [s.type, s.label]), 'party', () => {});
    const ab = document.createElement('button'); ab.type = 'button'; ab.className = 'btn btn-secondary btn-sm'; ab.innerHTML = icon('plus', 'i-sm') + '<span>Add rule</span>';
    ab.onclick = () => {
      const k = kw.value.trim().slice(0, 40); if (!k) { kw.focus(); return; }
      state.animPrefs = Object.assign({}, state.animPrefs || {}, { rules: [...prefs.rules.filter(r => r.kw.toLowerCase() !== k.toLowerCase()), { kw: k, type: sel.value }] });
      saveData(); render();
    };
    add.append(kw, sel, ab);
    rules.append(list, add);
    const rr = _settingsRow('Your keyword rules', 'Checked before everything else: a title containing the word gets that scene.', null);
    rr.classList.add('set-row-stack'); rr.appendChild(rules);
    el.appendChild(rr);

    // Per-item overrides
    const ov = Object.entries(prefs.overrides);
    if (ov.length) {
      const ul = document.createElement('ul'); ul.className = 'anim-rule-list';
      for (const [k, t] of ov.slice(0, 40)) {
        const it = k.startsWith('t:') ? getItem(k.slice(2)) : null;
        const li = document.createElement('li');
        li.innerHTML = `${animSceneHtml(t, { size: 'xs' })}<span class="truncate">${esc(it ? effTitle(it) : k.slice(2))}</span><span class="muted">${esc(animScene(t).label)}</span>`;
        const x = document.createElement('button'); x.type = 'button'; x.className = 'btn btn-ghost btn-sm btn-icon'; x.setAttribute('aria-label', 'Back to automatic'); x.innerHTML = icon('rotate-ccw', 'i-sm');
        x.onclick = () => animSetOverride(k, null);
        li.appendChild(x); ul.appendChild(li);
      }
      const orow = _settingsRow('Set by hand', 'Change one in the calendar event panel (click its scene).', null);
      orow.classList.add('set-row-stack'); orow.appendChild(ul);
      el.appendChild(orow);
    }

    // Ask Claude about titles nothing matched
    const ask = document.createElement('button'); ask.type = 'button'; ask.className = 'btn btn-secondary btn-sm';
    ask.setAttribute('data-requires', 'claude');
    ask.innerHTML = icon('sparkles', 'i-sm') + '<span>Ask Claude about unmatched titles</span>';
    ask.onclick = async () => {
      const today = todayStr(), end = briefAddDays(today, 30);
      const titles = new Set();
      for (const ev of (typeof calAllEvents === 'function' ? calAllEvents() : [])) {
        const d = calEventDays(ev)[0];
        if (d < today || d > end || !calEventVisible(ev)) continue;
        if (animForEvent(ev).source === 'fallback' && ev.summary) titles.add(ev.summary);
      }
      if (!titles.size) { toast('Every event in the next 30 days already has a scene.', { kind: 'ok' }); return; }
      ask.disabled = true; ask.innerHTML = '<span class="spinner"></span><span>Asking…</span>';
      try { const j = await _bfPost('/api/brief/scenes', { titles: [...titles].slice(0, 25) }); _animAi = j.types || _animAi; _animEvCache.clear(); toast(`Claude sorted ${j.asked} title${j.asked === 1 ? '' : 's'}`, { kind: 'ok' }); }
      catch (e) { toast(e.message || 'Claude could not be asked just now.', { kind: 'err' }); }
      render();
    };
    el.appendChild(_settingsRow('Unmatched titles', 'Titles no keyword fits get a plain calendar scene. Claude (Haiku) can suggest better ones; the answers are remembered per title.', ask));

    // The animation gallery (every slot and pack, today's look, themes): 78-anim-gallery.js
    animGalleryRender(el);
    // Achievements and recaps (v2.2 wave 5): 78-achievements.js
    if (typeof achPanelRender === 'function') achPanelRender(el);
  },
});
