/* ============================================================
   TRAVEL SURFACES (page). Owner: SURFACES (travel spec 5.1, 5.2, 5.5, 5.6, 6.4).
   User request, 3 Oct: "make sure we track the timezone, and we can make
   recommendations based off the location and country and timezone, update
   everything ... and we can have fun popups based on the country or location
   etc if they are travelling". The rules are pure (69-travel-ui-logic.js); the
   facts come from trSnapshot() (69-travel.js). Travel features are OFF until the
   user turns them on (decision 1, 3 Oct); time correctness never depends on it.

   This file:
     window.Travel = {on(), turnOn(o), turnOff(), save(patch, msg), openTrip(id), openTrips(),
                      openSettings(focus), chip(), chipDot(on?), refresh()}
                      (87-clock-ui.js's banner line calls Travel.turnOn)
     top bar         registerTopbarWidget 'travel-clock' (5.1): flag, local time, city, the
                     day/night arc, home time; a departure pill in the 24 h before a leg; chrome
                     (data-m-chrome): no entrance on navigation, minute ticks swap the digits only.
                     Click: MOMENTS' postcard when it is there (TravelMoments.chipClick), else the
                     menu; the menu (right-click, long press, ⋯): Arrival card, Trip, Travel settings.
                     The chip is the postcard's dock target: Travel.chip() / [data-tr-chip].
     opt-in card     "Turn on travel features?" (6.4): Turn on / Not now (asks again on the next
                     trip) / Never (config.travel.prompt false). Not while the zone banner asks.
     prefill         sgPrefillTagHtml(), sgPrefillSweep(root, o): the shared "Filled in from a
                     suggestion" tag and the soft accent sweep over prefilled fields, 90 ms apart
                     (5.6 request 5; every suggestion that opens an editor). Reduced motion: none.
                     trTcSubtasksSection(draft): the task card's prefilled checklist (61-task-card.js).
     event card      trEvcZoneExtras(ev): "your time (Tokyo)" while away and the "their time" line
                     (5.2), hooked into _evcWhen's bits (46-cal-event-edit.js).
                     trEvcSetProposal(id, {date, start, end}) / trEvcProposal(ev, ed, where, extra):
                     the event card in edit mode at a proposed time (cal.moveOpen; the T8 / T12
                     primaries through event.open {propose}); Save = CalWrite.move with its guest
                     question; Cancel puts the card back. Nothing changes until Save.
     people          trPersonTzHtml(p) / trPersonTzWire(section, p) (the person panel's Time zone
                     row; T13's prefill opens the editor with the zone filled in),
                     trPersonTzField(v, F, field) (the editor's field), trPersonTzCheck(v).
     nav focus       trNavFocus(key): after a suggestion's nav, scroll to and ring a row
                     ([data-m-key] / [data-focus-key]); changes nothing (5.6 request 4).
     sidebar         Home's "Trips" block while travel is on.
   The Trip view and list: 69-travel-ui-trips.js. Settings > Travel & time: 69-travel-ui-settings.js.
   Home widget: 12-home-w-travel.js.
   ============================================================ */

const _TRU_DOT_KEY = 'dashboard-travel-chip-dot';      // localStorage: the chip's "new" dot (the local day it was set)
const _TRU_OPTIN_KEY = 'dashboard-travel-optin-seen';  // localStorage: {key: date} opt-in prompts answered with Not now
const _TRU_ADDCARD_KEY = 'dashboard-travel-add-card';  // localStorage: "Add the Trip card to Home?" was offered
let _truChipKey = '', _truChipShownKeys = new Set(), _truTickOff = null, _truChipMin = -1, _truChipBooted = false;
let _truProp = null;

function _truLs(k, v) {
  try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ }
  return null;
}
function _truCfg() { return trUiCfg((typeof APP_CONFIG !== 'undefined' && APP_CONFIG && APP_CONFIG.travel) || {}); }
function _truOn() { return _truCfg().on; }
function _truReduced() { return !!(window.Motion && Motion.prefersReduced && Motion.prefersReduced()) || document.documentElement.getAttribute('data-motion-level') === 'off'; }
function _truFlag(cc, o) { return cc && typeof trFlagHtml === 'function' ? trFlagHtml(cc, o || {}) : ''; }
function _truTime(ms, zone) { return Clock.fmtTime(ms, { zone }); }
function _truSnap() { try { return typeof trSnapshot === 'function' ? trSnapshot() : null; } catch (e) { console.error('[travel ui]', e); return null; } }

/* ---------- window.Travel ---------- */
const Travel = {
  on: () => _truOn(),
  /** Turn travel features on (Undo turns them off again); then offer the Trip card on Home, once. */
  async turnOn(o) {
    o = o || {};
    if (_truOn()) { if (!o.quiet) Travel.openSettings(); return true; }
    if (typeof settingsSaveConfig !== 'function' || !(await settingsSaveConfig({ travel: { on: true } }, false))) return false;
    _truAfterChange();
    toast('Travel features on: local time, weather and tips when you travel', { kind: 'ok', icon: 'plane', timeout: 9000,
      action: { label: 'Undo', run: async () => { if (await settingsSaveConfig({ travel: { on: false } }, false)) _truAfterChange(); } } });
    if (!_truLs(_TRU_ADDCARD_KEY) && typeof homeWidgetShow === 'function') {
      _truLs(_TRU_ADDCARD_KEY, String(Date.now()));
      setTimeout(() => toast('Add the Trip card to Home?', { icon: 'layout-grid', timeout: 12000, action: { label: 'Add it', run: () => Travel.addCard() } }), 600);
    }
    return true;
  },
  async turnOff() {
    if (!_truOn()) return true;
    if (!(await settingsSaveConfig({ travel: { on: false } }, false))) return false;
    _truAfterChange();
    toast('Travel features off', { kind: 'ok', icon: 'plane', action: { label: 'Undo', run: async () => { if (await settingsSaveConfig({ travel: { on: true } }, false)) _truAfterChange(); } } });
    return true;
  },
  /** Save part of config.travel. */
  async save(patch, msg) {
    if (typeof settingsSaveConfig !== 'function') return false;
    const ok = await settingsSaveConfig({ travel: patch }, msg === undefined ? false : msg);
    if (ok) _truAfterChange();
    return ok;
  },
  /** The Trip card on Home, shown and highlighted in Customise (5.1). */
  addCard() {
    if (state.view !== 'home') setView('home');
    if (typeof homeWidgetShow === 'function') homeWidgetShow('travel', 'm');
    if (typeof homeEditStart === 'function') setTimeout(() => homeEditStart({ focus: 'travel' }), 60);
  },
  openTrip(id) { if (id) setView('trip:' + id); },
  openTrips() { setView('trips'); },
  openSettings(focus) { setView('settings:time'); if (focus) trNavFocus('time:' + focus); },
  chip: () => document.querySelector('[data-tr-chip]'),
  /** The chip's "new" dot until it is opened or the local day ends; chipDot() reads it. */
  chipDot(on) {
    if (on === undefined) return _truLs(_TRU_DOT_KEY) === Clock.today();
    _truLs(_TRU_DOT_KEY, on ? Clock.today() : null);
    const c = Travel.chip(); if (c) c.classList.toggle('has-dot', !!on);
    return !!on;
  },
  refresh() { _truAfterChange(); },
};
if (typeof window !== 'undefined') window.Travel = Travel;
function _truAfterChange() {
  if (typeof TravelStore !== 'undefined') TravelStore.changed();
  if (typeof Clock !== 'undefined' && Clock.refresh) Clock.refresh('setting');
  render();
}

/* ---------- the top-bar chip (5.1) ---------- */
function _truArcSvg(h) {
  const a = trUiArc(h);
  return `<svg class="tr-arc${a.night ? ' is-night' : ''}" viewBox="0 0 24 14" aria-hidden="true"><path d="M2 12 Q12 -6 22 12" class="tr-arc-p"/><circle cx="${a.x}" cy="${a.y}" r="2.2" class="tr-arc-s"/></svg>`;
}
function _truChipTip(m) {
  const now = Clock.now();
  const f = (z) => Clock.fmtDate(now, { zone: z, weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + _truTime(now, z);
  return m.mode === 'depart' ? m.line : `${m.label}: ${f(m.zone)} · ${m.homeLabel}, home: ${f(m.homeZone)} (${Clock.fmtDiff(m.diffMin)})`;
}
function _truChipHtml(m) {
  const now = Clock.now();
  if (m.mode === 'depart') {
    return `${icon(m.leg && m.leg.mode === 'flight' ? 'plane' : 'train-front', 'i-sm')}<span class="tr-chip-line"></span>`;
  }
  const lp = Clock.parts(now, m.zone);
  return `${_truFlag(m.cc)}<b class="tr-chip-t num"></b><span class="tr-chip-c"></span>${m.mode === 'away' || m.mode === 'layover' ? _truArcSvg(lp.h + lp.mi / 60) : ''}`
    + (m.mode === 'away' ? `<span class="tr-chip-sep" aria-hidden="true"></span><span class="tr-chip-home">${icon('house', 'i-xs')}<span class="tr-chip-h num"></span><span class="tr-chip-hl"></span></span>` : '')
    + (m.line && m.mode !== 'away' ? `<span class="tr-chip-line"></span>` : '')
    + '<i class="tr-chip-dot" aria-hidden="true"></i>';
}
/** Fill the chip's words (also each minute, in place). */
function _truChipFill(btn, m) {
  const now = Clock.now();
  const set = (sel, v) => { const n = btn.querySelector(sel); if (n && n.textContent !== v) n.textContent = v; };
  set('.tr-chip-t', _truTime(now, m.zone));
  set('.tr-chip-c', m.mode === 'layover' ? 'Layover · ' + m.label : m.label);
  set('.tr-chip-h', _truTime(now, m.homeZone));
  set('.tr-chip-hl', m.homeLabel);
  set('.tr-chip-line', m.line || '');
  const arc = btn.querySelector('.tr-arc');
  if (arc) { const lp = Clock.parts(now, m.zone); const a = trUiArc(lp.h + lp.mi / 60); const s = arc.querySelector('.tr-arc-s'); if (s) { s.setAttribute('cx', a.x); s.setAttribute('cy', a.y); } arc.classList.toggle('is-night', a.night); }
  btn.setAttribute('aria-label', m.mode === 'depart' ? m.line : `${m.label} ${_truTime(now, m.zone)}, ${m.homeLabel} ${_truTime(now, m.homeZone)}. Travel menu`);
  btn.setAttribute('data-tip', _truChipTip(m));
  btn.classList.toggle('has-dot', Travel.chipDot());
}
function _truChipMenu(anchor, m) {
  const TM = window.TravelMoments;
  const items = [];
  if (TM && typeof TM.openFull === 'function' && m.mode === 'away') items.push({ label: 'Arrival card', icon: 'sparkles', run: () => TM.openFull() });
  if (m.tripId) items.push({ label: 'Trip', icon: 'map', run: () => Travel.openTrip(m.tripId) });
  items.push({ label: 'All trips', icon: 'list', run: () => Travel.openTrips() });
  items.push({ label: 'Travel settings', icon: 'settings', run: () => Travel.openSettings() });
  openMenu(anchor, items, { align: 'end', width: 220 });
}
function _truChipRender(el) {
  if (typeof state === 'undefined' || !_truOn()) { el.innerHTML = ''; _truChipKey = ''; _truOptInMaybe(); return false; }
  _truOptInMaybe();
  const snap = _truSnap();
  const m = snap ? trUiChip(snap, { now: Clock.now(), cfg: _truCfg() }) : null;
  if (!m) { if (_truChipKey) { el.innerHTML = ''; _truChipKey = ''; } return false; }
  let btn = el.querySelector('.tr-chip');
  if (!btn || _truChipKey !== m.key) {
    el.innerHTML = '';
    btn = document.createElement('button'); btn.type = 'button';
    btn.className = 'tr-chip is-' + m.mode; btn.dataset.trChip = ''; btn.setAttribute('data-m-chrome', '');
    btn.setAttribute('aria-haspopup', 'menu');
    btn.innerHTML = _truChipHtml(m);
    // Chrome: it appears once per zone change (a 120 ms fade, or MOMENTS' dock), never on navigation.
    // (The first chip after the page loads is just there: that is not a change.)
    if (!_truChipShownKeys.has(m.key) && _truChipBooted && !_truReduced()) btn.classList.add('tr-chip-in');
    _truChipShownKeys.add(m.key);
    _truChipKey = m.key;
    btn.addEventListener('click', (e) => {
      const TM = window.TravelMoments;
      if (TM && typeof TM.chipClick === 'function' && TM.chipClick(btn) !== false) return;
      Travel.chipDot(false);
      _truChipMenu(btn, btn._m || m);
    });
    btn.addEventListener('contextmenu', (e) => { e.preventDefault(); _truChipMenu(btn, btn._m || m); });
    let lp = 0;
    btn.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') lp = setTimeout(() => { lp = 0; _truChipMenu(btn, btn._m || m); }, 500); });
    btn.addEventListener('pointerup', () => { if (lp) { clearTimeout(lp); lp = 0; } });
    btn.addEventListener('keydown', (e) => { if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); _truChipMenu(btn, btn._m || m); } });
    el.appendChild(btn);
  }
  btn._m = m;
  _truChipFill(btn, m);
  _truChipMin = Math.floor(Clock.now() / 60000);
  if (!_truChipBooted) setTimeout(() => { _truChipBooted = true; }, 1500);
  if (!_truTickOff && typeof Clock.onTick === 'function') _truTickOff = Clock.onTick(_truChipTick);
  return true;
}
/** Each minute: only the digits change (swapText up, or nothing with reduced motion). */
function _truChipTick() {
  const minute = Math.floor(Clock.now() / 60000);
  if (minute === _truChipMin) return;
  _truChipMin = minute;
  const btn = document.querySelector('[data-tr-chip]');
  if (!btn || !btn._m) return;
  const snap = _truSnap();
  const m = snap ? trUiChip(snap, { now: Clock.now(), cfg: _truCfg() }) : null;
  if (!m || m.key !== btn._m.key) { if (typeof renderTopbarWidgets === 'function') renderTopbarWidgets(); return; }
  btn._m = m;
  const t = btn.querySelector('.tr-chip-t');
  _truChipFill(btn, m);
  if (t && !_truReduced() && t.animate) t.animate([{ transform: 'translateY(40%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 120, easing: 'ease-out' });
}
registerTopbarWidget({ id: 'travel-clock', order: 3, render: (el) => _truChipRender(el) });

/* ---------- "Turn on travel features?" (6.4) ---------- */
function _truOptInSeen() { try { return JSON.parse(_truLs(_TRU_OPTIN_KEY) || '{}') || {}; } catch (e) { return {}; } }
function _truOptInMaybe() {
  if (typeof document === 'undefined' || !document.body) return;
  const cur = document.getElementById('tr-optin');
  const cfg = _truCfg();
  if (cfg.on || !cfg.prompt) { if (cur) cur.remove(); return; }
  const banner = document.querySelector('#clk-banner .clk-optin:not([hidden])');
  if (banner) { if (cur) cur.remove(); return; }      // the zone banner already asks (87-clock-ui.js)
  const snap = _truSnap();
  const card = snap ? trUiOptIn(snap, cfg, _truOptInSeen()) : null;
  if (!card) { if (cur) cur.remove(); return; }
  if (cur && cur.dataset.key === card.key) return;
  if (cur) cur.remove();
  const el = document.createElement('div');
  el.id = 'tr-optin'; el.className = 'clk-banner tr-optin'; el.dataset.key = card.key;
  el.setAttribute('role', 'region'); el.setAttribute('aria-label', card.title);
  el.innerHTML = `<span class="clk-ic">${icon('plane')}</span><div class="clk-msg"><span class="clk-t"></span> <span class="clk-s"></span></div><div class="clk-acts"></div>`;
  el.querySelector('.clk-t').textContent = card.title;
  el.querySelector('.clk-s').textContent = card.text;
  const acts = el.querySelector('.clk-acts');
  const close = () => { el.classList.add('is-out'); setTimeout(() => el.remove(), _truReduced() ? 0 : 220); };
  const mk = (label, cls, run) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + cls; b.textContent = label; b.addEventListener('click', run); acts.appendChild(b); return b; };
  mk('Turn on', 'btn-primary', async () => { close(); await Travel.turnOn(); });
  mk('Not now', 'btn-ghost', () => { const s = _truOptInSeen(); s[card.key] = Clock.today(); _truLs(_TRU_OPTIN_KEY, JSON.stringify(s)); close(); });
  mk('Never', 'btn-ghost', async () => { close(); if (await Travel.save({ prompt: false })) toast('Travel won’t ask again. Settings > Travel & time turns it on.', { kind: 'ok', icon: 'plane' }); });
  const content = document.getElementById('content');
  if (content && content.parentNode) content.parentNode.insertBefore(el, content);
  else { el.classList.add('is-floating'); document.body.appendChild(el); }
  requestAnimationFrame(() => el.classList.add('on'));
}

/* ---------- the prefill tag and sweep (5.6 request 5, prototype t6) ---------- */
function sgPrefillTagHtml(text) { return `<span class="sg-prefill-tag">${icon('sparkles', 'i-xs')}<span>${esc(text || 'Filled in from a suggestion')}</span></span>`; }
/**
 * One soft accent sweep over each prefilled field, 90 ms apart (the fields marked
 * [data-prefilled], or o.fields). Once per element; nothing with reduced motion.
 */
function sgPrefillSweep(root, o) {
  o = o || {};
  if (!root) return 0;
  const els = o.fields || [...root.querySelectorAll('[data-prefilled]')];
  if (_truReduced()) return 0;
  let i = 0;
  for (const el of els) {
    if (!el || el._sgSwept) continue;
    el._sgSwept = true;
    const d = (i++) * 90;
    setTimeout(() => { el.classList.add('sg-sweep'); setTimeout(() => el.classList.remove('sg-sweep'), 900); }, d);
  }
  return i;
}
/** The prefilled checklist of a new task (T3's packing list): editable before Save. */
function trTcSubtasksSection(d) {
  if (!d || !Array.isArray(d.subtasks) || !d.subtasks.length) return null;
  const sec = document.createElement('section'); sec.className = 'dp-section tr-tc-steps';
  sec.innerHTML = `<div class="dp-sh"><h4>Checklist <span class="subtle">${d.subtasks.length}</span></h4></div>`;
  const ul = document.createElement('ul'); ul.className = 'tr-tc-list';
  const paint = () => {
    ul.innerHTML = '';
    d.subtasks.forEach((s, i) => {
      const li = document.createElement('li'); li.className = 'tr-tc-item'; if (d.suggested) li.dataset.prefilled = '';
      const inp = document.createElement('input'); inp.className = 'control control-sm'; inp.value = s; inp.maxLength = 200; inp.setAttribute('aria-label', 'Step ' + (i + 1));
      inp.addEventListener('input', () => { d.subtasks[i] = inp.value; });
      const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon btn-sm'; x.innerHTML = icon('x', 'i-xs'); x.setAttribute('aria-label', 'Remove ' + s);
      x.addEventListener('click', () => { d.subtasks.splice(i, 1); paint(); const h = sec.querySelector('h4 .subtle'); if (h) h.textContent = String(d.subtasks.length); });
      const box = document.createElement('span'); box.className = 'tr-tc-box'; box.innerHTML = icon('square', 'i-sm');
      li.append(box, inp, x);
      ul.appendChild(li);
    });
    const add = document.createElement('li'); add.className = 'tr-tc-add';
    const ai = document.createElement('input'); ai.className = 'control control-sm'; ai.placeholder = 'Add a step…'; ai.setAttribute('aria-label', 'Add a step');
    ai.addEventListener('keydown', (e) => { if (e.key === 'Enter' && ai.value.trim()) { e.preventDefault(); e.stopPropagation(); d.subtasks.push(ai.value.trim()); paint(); const n = ul.querySelector('.tr-tc-add input'); if (n) n.focus(); } });
    add.appendChild(ai);
    ul.appendChild(add);
  };
  paint();
  sec.appendChild(ul);
  return sec;
}

/* ---------- event card: both times and their time (5.2) ---------- */
function _truPeopleByEmail() {
  const m = new Map();
  for (const p of (typeof state !== 'undefined' && state.people) || []) {
    if (!p || p.self) continue;
    const first = String(p.name || '').split(/\s+/)[0] || '';
    const emails = typeof pplPersonEmails === 'function' ? pplPersonEmails(p) : [p.email].filter(Boolean);
    for (const e of emails) m.set(String(e).toLowerCase(), { id: p.id, name: p.name || '', first, tz: p.tz || '' });
  }
  return m;
}
/** The event card's extra time lines: "your time (Tokyo)" while away, and their time. */
function trEvcZoneExtras(ev) {
  if (!ev || ev.allDay || !ev.start || !ev.start.dateTime) return null;
  const cfg = _truCfg();
  if (cfg.bothTimes === 'off') return null;
  const frag = document.createDocumentFragment();
  const away = Clock.away && Clock.away().away;
  if (away) {
    const b = document.createElement('span'); b.className = 'evc-bit evc-zone tr-evc-your';
    b.innerHTML = icon('clock', 'i-xs') + '<span></span>';
    b.querySelector('span').textContent = `your time (${Clock.label(Clock.zone())})`;
    frag.appendChild(b);
  }
  const att = (Array.isArray(ev.attendees) ? ev.attendees : []).filter(a => a && !a.resource).map(a => ({ email: a.email, name: a.displayName || a.name || '', self: !!a.self }));
  const mine = new Set(((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.myEmails) || []).map(e => String(e).toLowerCase()));
  for (const a of att) if (mine.has(String(a.email || '').toLowerCase())) a.self = true;
  if (att.some(a => !a.self)) {
    const start = Date.parse(ev.start.dateTime), end = Date.parse((ev.end && ev.end.dateTime) || ev.start.dateTime);
    const org = ev.organizer || {};
    const t = trUiTheirTime({ eventId: ev.id, title: ev.summary, start, end, zone: ev.start.timeZone || '', organizerSelf: !!(org.self || mine.has(String(org.email || '').toLowerCase())), organizer: { email: org.email, name: org.displayName || '' }, attendees: att },
      { myZone: Clock.zone(), people: _truPeopleByEmail(), now: Clock.now() });
    if (t) {
      const line = document.createElement('div'); line.className = 'tr-evc-their' + (t.warn ? ' is-warn' : '');
      line.innerHTML = icon(t.warn ? 'moon' : 'users', 'i-xs') + '<span class="tr-evc-their-t"></span> <span class="tr-evc-their-v"></span>';
      line.querySelector('.tr-evc-their-t').textContent = t.text;
      line.querySelector('.tr-evc-their-v').textContent = t.verdict;
      frag.appendChild(line);
    }
  }
  return frag.childNodes.length ? frag : null;
}
/** openEvent(id, {propose}) (61-task-card.js) keeps the proposed time here for the card to show. */
function trEvcSetProposal(id, p) {
  _truProp = id && p && /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || '')) && Number.isFinite(p.start) && Number.isFinite(p.end) && p.end > p.start ? { id: String(id), p, at: Date.now(), swept: false } : null;
}
/**
 * The "when" part of an event card opened with a proposed time (cal.moveOpen): the normal
 * date/time editor at the new time, "Filled in from a suggestion", Save / Cancel. Save goes
 * through evcUpdate (CalWrite: the guest and series questions). null = no proposal for it.
 */
function trEvcProposal(ev, ed, where, extra) {
  if (!_truProp || !ev || _truProp.id !== ev.id) return null;
  if (Date.now() - _truProp.at > 30 * 60000 || !ed || !ed.ok || ev.allDay) { _truProp = null; return null; }
  const P = _truProp;
  const p = P.p;
  const orig = evcWhenOf(ev);
  let w = Object.assign({}, orig, { startDate: p.date, startTime: evcHM(p.start), endDate: p.end >= 1440 ? clockAddDays(p.date, 1) : p.date, endTime: evcHM(p.end % 1440) });
  const box = document.createElement('div'); box.className = 'tr-evc-prop'; box.dataset.prefilled = '';
  const head = document.createElement('div'); head.className = 'tr-evc-prop-h';
  head.innerHTML = sgPrefillTagHtml() + `<span class="subtle tr-evc-was"></span>`;
  head.querySelector('.tr-evc-was').textContent = `was ${orig.startTime}–${orig.endTime}${orig.startDate !== p.date ? ' ' + trUiDate(orig.startDate) : ''}`;
  box.appendChild(head);
  let editor = null;
  const paint = () => {
    // The zone bits go with the first paint (they are fragments: used once).
    const n = _evcWhenEditor(w, (field, value) => { w = evcWhenEdit(w, field, value); paint(); }, { fk: 'evc', extra: editor ? [] : (extra || []) });
    if (editor) editor.replaceWith(n); else box.appendChild(n);
    editor = n;
  };
  paint();
  const bar = document.createElement('div'); bar.className = 'tr-evc-prop-f';
  const save = document.createElement('button'); save.type = 'button'; save.className = 'btn btn-primary btn-sm'; save.textContent = 'Save';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn btn-ghost btn-sm'; cancel.textContent = 'Cancel';
  const hint = document.createElement('span'); hint.className = 'subtle tr-evc-prop-hint';
  hint.textContent = (ev.attendees || []).some(a => a && !a.self && !a.resource) ? 'Saving asks whether to email the guests.' : 'Change anything, then Save.';
  save.addEventListener('click', () => { _truProp = null; evcUpdate(ev, evcPatchDiff({ when: orig }, { when: w })); });
  cancel.addEventListener('click', () => { _truProp = null; if (typeof tcRefresh === 'function') tcRefresh(); else render(); });
  bar.append(save, cancel, hint);
  box.appendChild(bar);
  if (!P.swept) { P.swept = true; requestAnimationFrame(() => sgPrefillSweep(box, { fields: [box] })); }
  return box;
}

/* ---------- people: their time zone (5.2, T13) ---------- */
function trPersonTzCheck(v) {
  const z = String(v || '').trim();
  if (!z) return { ok: true, zone: '' };
  const c = typeof canonZone === 'function' ? canonZone(z) : z;
  if (!c || (typeof clockValidZone === 'function' && !clockValidZone(c))) return { ok: false, message: `“${z}” is not a time zone. Pick one from the list, e.g. America/New_York.` };
  return { ok: true, zone: c };
}
function trPersonTzHtml(p) {
  if (!p || !p.tz) return '<span class="subtle">Not set</span> <button type="button" class="chip chip-more tr-ptz-set">' + icon('plus', 'i-xs') + '<span>Set</span></button>';
  const now = Clock.now();
  const d = Clock.diff(Clock.zone(), p.tz, now);
  return `<span class="tr-ptz"><span>${esc(Clock.label(p.tz))}</span> · <span class="num">${esc(_truTime(now, p.tz))}</span> now <span class="subtle">(${esc(d ? Clock.fmtDiff(d).replace('Same time as home', 'same time') : 'same time as you')})</span></span> <button type="button" class="chip chip-more tr-ptz-set">${icon('pencil', 'i-xs')}<span>Change</span></button>`;
}
/** Wire the row's button; a suggestion's prefill (T13: nav person:<id> {prefill:{tz}}) opens the editor with it. */
function trPersonTzWire(sec, p) {
  if (!sec || !p) return;
  const b = sec.querySelector('.tr-ptz-set');
  if (b) b.addEventListener('click', () => openPersonEditor(p.id, { _focus: 'tz' }));
  const pre = typeof sgTakePrefill === 'function' ? sgTakePrefill('person:' + p.id) : null;
  if (pre && pre.tz) setTimeout(() => openPersonEditor(p.id, { tz: pre.tz, _prefill: ['tz'], _focus: 'tz' }), 60);
}
/** The person editor's Time zone field (F.tz). */
function trPersonTzField(v, F, field) {
  const i = document.createElement('input'); i.className = 'control'; i.placeholder = 'e.g. America/New_York'; i.value = v.tz || ''; i.autocomplete = 'off';
  const dl = document.createElement('datalist'); dl.id = 'tr-ptz-' + Date.now();
  for (const z of (typeof settingsTimeZones === 'function' ? settingsTimeZones() : [])) { const o = document.createElement('option'); o.value = z; dl.appendChild(o); }
  i.setAttribute('list', dl.id);
  F.tz = i;
  const f = field('Time zone', i, 'Meetings with them show their time too, and late or early ones are flagged.');
  f.appendChild(dl);
  if (Array.isArray(v._prefill) && v._prefill.includes('tz')) {
    f.dataset.prefilled = '';
    f.insertAdjacentHTML('afterbegin', sgPrefillTagHtml());
    requestAnimationFrame(() => { sgPrefillSweep(f, { fields: [i] }); });
  }
  if (v._focus === 'tz') setTimeout(() => { try { i.focus(); i.select(); } catch (e) { /* closed */ } }, 80);
  return f;
}

/* ---------- the top-bar clock widget's zone (5.1: 'local' | 'home' | an IANA id) ---------- */
function trTbClockZoneControl(w, changed) {
  const box = document.createElement('div'); box.className = 'tr-tbz';
  const cur = !w.zone || w.zone === 'local' ? 'local' : w.zone === 'home' ? 'home' : 'zone';
  const seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', 'Clock time zone');
  const zSel = document.createElement('select'); zSel.className = 'control control-sm tr-tbz-z'; zSel.setAttribute('aria-label', 'Time zone');
  for (const z of (typeof settingsTimeZones === 'function' ? settingsTimeZones() : [])) { const o = document.createElement('option'); o.value = z; o.textContent = z.replace(/_/g, ' '); zSel.appendChild(o); }
  zSel.value = cur === 'zone' ? w.zone : (Clock.system() !== Clock.home() ? Clock.system() : 'Asia/Tokyo');
  zSel.hidden = cur !== 'zone';
  const pick = (k) => {
    if (k === 'local') { delete w.zone; delete w.zoneLabel; }
    else if (k === 'home') { w.zone = 'home'; delete w.zoneLabel; }
    else { w.zone = zSel.value; }
    zSel.hidden = k !== 'zone';
    for (const b of seg.children) { const on = b.dataset.k === k; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.classList.toggle('on', on); }
    changed();
  };
  for (const [k, label] of [['local', 'Local'], ['home', `Home (${Clock.label(Clock.home())})`], ['zone', 'Another zone']]) {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.k = k; b.textContent = label;
    b.setAttribute('aria-checked', k === cur ? 'true' : 'false'); if (k === cur) b.classList.add('on');
    b.addEventListener('click', () => pick(k));
    seg.appendChild(b);
  }
  zSel.addEventListener('change', () => { w.zone = zSel.value; changed(); });
  box.append(seg, zSel);
  return box;
}

/* ---------- a suggestion's nav focus (5.6 request 4) ---------- */
function trNavFocus(key) {
  if (!key) return;
  let n = 0;
  const go = () => {
    const el = document.querySelector(`[data-m-key="${CSS.escape(key)}"], [data-focus-key="${CSS.escape(key)}"]`);
    if (!el) { if (++n < 10) setTimeout(go, 60); return; }
    el.scrollIntoView({ block: 'center', behavior: _truReduced() ? 'auto' : 'smooth' });
    el.classList.remove('tr-focus-ring'); void el.offsetWidth; el.classList.add('tr-focus-ring');
    setTimeout(() => el.classList.remove('tr-focus-ring'), 1800);
    const f = el.querySelector('input, select, button, [tabindex]');
    if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* gone */ }
  };
  requestAnimationFrame(go);
}

/* ---------- sidebar: Trips on Home ---------- */
registerSidebarBlock('home', {
  id: 'trips', order: 14,
  render(el, ctx) {
    if (!_truOn() || typeof TravelStore === 'undefined') return false;
    const snap = _truSnap();
    if (!snap || !Array.isArray(snap.trips)) return false;
    const list = snap.trips.filter(t => !t.candidate && ['planned', 'departing', 'away', 'returning', 'home'].includes(t.status) && clockDaysBetween(snap.today, t.from) <= 30).slice(0, 4);
    if (!list.length) return false;
    el.appendChild(sbSection({ title: 'Trips' }));
    for (const t of list) {
      const view = 'trip:' + t.id;
      el.appendChild(sbNavItem({ label: `${t.label || 'Trip'} · ${trUiTripWhen(t, snap.today).replace(t.label + ' ', '')}`, avatarHtml: `<span class="ic">${_truFlag(t.dest && t.dest.cc) || icon('map-pin')}</span>`, view, active: ctx.view === view }));
    }
  },
});
registerCommand({ id: 'travel-trips', label: 'Trips', icon: 'map', group: 'Go to', keywords: 'travel trip holiday abroad flights journeys', run: () => Travel.openTrips(), when: () => _truOn() });
registerCommand({ id: 'travel-settings', label: 'Travel & time settings', icon: 'globe', group: 'Settings', keywords: 'time zone travel trips home time second clock holidays jet lag', run: () => Travel.openSettings() });
