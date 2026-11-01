/* ============================================================
   GARDEN, how a game answers you (2.23). Owner, 30 Oct 2026: "I hate how messages pop up when you can't do something; it should be
   visual, like they flash red, something goes wrong with the cursor, an X appears, the cursor becomes an X; games already have solutions."
   So nothing in the garden says no in a toast. Shared by the garden, fishing, friends' gardens and the pets.

     gameDeny(target, opts)    a blocked action: the target flashes red and shakes, a small red X pops at the spot and fades, a soft
                               "no" if Sounds is on. opts {kind, badge, at, say, silent}
                                 kind 'coins'    the coin counter shakes and flashes too
                                 kind 'tool'     the tool in your hand shakes (wrong tool, wrong season)
                                 kind 'lock'     a little padlock with the X (badge: 'Lv 5')
                                 kind 'water'    the watering can shakes
                                 kind 'bag'      the bag shakes (no seeds left)
                                 badge           a very short mark beside the X ('Lv 5', '40')
                                 at              {x, y} in window pixels (else the middle of the target, else the last click)
                                 say             the plain sentence: for screen readers only, never on screen
     gameCheer(target, opts)   a success: a small sparkle and pop, and a floating number. opts {text ('+3'), tone ('coin'|'xp'|'water'|'gold'),
                               at, quiet (no sparkle), sound}
     gameDenyOf(result, target, o)  an engine answer ({ok: false, msg}): works out kind and badge from the words, then gameDeny
     gameCursor(el, name)      a game cursor on an element: 'no', 'hand', 'trowel', 'can', 'shears', 'spade', 'feed', 'door', 'rod', 'net', 'buy', 'walk',
                               'grab' or '' (see the [data-gcur] rules in 94-garden.css)

   target may be an element (SVG too), an {x, y} of window pixels, or null. Everything moves with transform and opacity only, once, then
   leaves no trace in the page; reduced motion keeps the red flash and the X without the shaking.
   ============================================================ */
const _gfel = { last: null, live: null, layer: null, ac: null, soundT: 0, bound: false };

function _gfMotion() { return !(window.Motion && Motion.prefersReduced && Motion.prefersReduced()); }
function _gfBind() {
  if (_gfel.bound) return; _gfel.bound = true;
  // the last place you pressed: where an X appears when nothing better is known
  document.addEventListener('pointerdown', (ev) => { _gfel.last = { x: ev.clientX, y: ev.clientY }; }, { capture: true, passive: true });
}
_gfBind();
function _gfLayer() {
  if (_gfel.layer && _gfel.layer.isConnected) return _gfel.layer;
  const n = document.createElement('div'); n.className = 'gf-layer'; n.setAttribute('aria-hidden', 'true');
  document.body.appendChild(n);
  _gfel.layer = n;
  return n;
}
/** The plain sentence, for a screen reader only: a game shows, but nobody should be left guessing. */
function _gfSay(text) {
  if (!text) return;
  if (!_gfel.live || !_gfel.live.isConnected) { const n = document.createElement('div'); n.className = 'sr-only gf-live'; n.setAttribute('role', 'status'); n.setAttribute('aria-live', 'polite'); document.body.appendChild(n); _gfel.live = n; }
  _gfel.live.textContent = ''; _gfel.live.textContent = String(text).slice(0, 200);
}
function _gfPoint(target, opts) {
  if (opts && opts.at && Number.isFinite(opts.at.x)) return opts.at;
  if (target && target.getBoundingClientRect) { const r = target.getBoundingClientRect(); if (r.width || r.height) return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  if (target && Number.isFinite(target.x)) return { x: target.x, y: target.y };
  return _gfel.last || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}
function _gfShake(el, big) {
  if (!el || !el.animate || !_gfMotion()) return;
  const d = big ? 5 : 3;
  // `translate`, not `transform`: it leaves an SVG node's own transform attribute alone
  try { el.animate({ translate: ['0 0', `${-d}px 0`, `${d}px 0`, `${-d * 0.7}px 0`, `${d * 0.5}px 0`, '0 0'] }, { duration: 340, easing: 'ease-out' }); } catch (e) { /* an old browser just flashes */ }
}
function _gfFlash(el) {
  if (!el || !el.classList) return;
  el.classList.remove('gf-flash'); void (el.getBBox ? 0 : el.offsetWidth);
  el.classList.add('gf-flash');
  clearTimeout(el._gfT); el._gfT = setTimeout(() => el.classList.remove('gf-flash'), 460);
}
function _gfSound(kind) {
  // only when Sounds is on (the game's own setting); never more than a few a second
  try {
    if (performance.now() - _gfel.soundT < 180) return; _gfel.soundT = performance.now();
    if (typeof _gmG !== 'function' || !_gmG().prefs.sounds || document.hidden) return;
    if (typeof gameOn === 'function' && !gameOn()) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = _gfel.ac || (_gfel.ac = new AC()); if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime + 0.01, deny = kind === 'deny';
    const notes = deny ? [196, 164.8] : [880, 1174.7];
    notes.forEach((f, i) => {
      const o = ac.createOscillator(), v = ac.createGain();
      o.type = deny ? 'sine' : 'triangle'; o.frequency.value = f;
      const s = t + i * (deny ? 0.07 : 0.06), peak = deny ? 0.06 : 0.035;
      v.gain.setValueAtTime(0, s); v.gain.linearRampToValueAtTime(peak, s + 0.012); v.gain.exponentialRampToValueAtTime(0.0001, s + 0.16);
      o.connect(v); v.connect(ac.destination); o.start(s); o.stop(s + 0.18);
    });
  } catch (e) { /* no audio here */ }
}
const _GF_X = '<svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><circle cx="14" cy="14" r="12.5" fill="#d8352a" stroke="#fff" stroke-width="2"/><path d="M9.4 9.4l9.2 9.2M18.6 9.4l-9.2 9.2" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';
const _GF_LOCK = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="#fff" stroke-width="1.6"/><rect x="3.5" y="7" width="9" height="7" rx="1.6" fill="#fff"/></svg>';
/*
 * THE MESSAGE LINE. The owner: messages belong "top middle of the screen", plain, not said by your character. Every short message in the garden, a room or a friend's garden goes through here:
 *   gardenMessage(text, o)        one line, top middle, fading by itself. A newer one replaces it. o: { kind: 'err', ms, action, action2, retry, log: false }. Falsy when the garden is not showing
 *   gardenMessageHold(key, text, o)  a line that stays while it applies (fishing). o: { urgent, tone: 'now' | 'err' }. urgent: shown at once, and passing messages wait in Recent messages until it ends
 *   gardenMessageDrop(key)        that line no longer applies
 *   gardenMessageHost()           the column it sits in, so the Nature book card and the connection strip stack with it
 *   gardenToast(msg, o)           takes toast's arguments: the line in the garden, the app's toast anywhere else, and for a running wait with its Cancel
 */
const _gmsg = { host: null, el: null, temp: null, hold: null, shown: null, t: 0, outT: 0 };
function _gmsgWhere() {
  const room = document.querySelector('.ee-room'); if (room) return room;   // (a room is drawn over the stage)
  if (typeof _gw === 'undefined' || !_gw.on || !_gw.box || !_gw.box.isConnected || typeof _gdOnPage !== 'function' || !_gdOnPage()) return null;
  return document.querySelector('.modal') ? document.body : _gw.box;   // (a panel of the garden's own covers the stage: the line goes over it)
}
function gardenMessageHost() {
  const at = _gmsgWhere(); if (!at) return null;
  if (!_gmsg.host) { _gmsg.host = document.createElement('div'); _gmsg.host.className = 'gd-msgs'; }
  const h = _gmsg.host;
  if (h.parentNode !== at) at.appendChild(h);
  h.classList.toggle('is-over', at === document.body);
  h.classList.toggle('is-room', at.classList.contains('ee-room'));
  return h;
}
function _gmsgWait(M) { const len = Math.max(2600, Math.min(12000, 1400 + M.text.length * 60)); return Math.max(len, Number(M.ms) || 0, M.acts.length || M.kind === 'err' ? 10000 : 0); }
function _gmsgArm() {
  clearTimeout(_gmsg.t); clearTimeout(_gmsg.outT);
  const M = _gmsg.temp; if (!M || _gmsg.shown !== M) return;
  if (_gmsg.el) _gmsg.el.classList.remove('is-out');
  _gmsg.t = setTimeout(() => {
    if (_gmsg.temp !== M) return;
    if (_gmsg.hold) { _gmsg.temp = null; _gmsgPaint(); return; }   // (what is still going on comes straight back)
    if (_gmsg.el) _gmsg.el.classList.add('is-out');
    _gmsg.outT = setTimeout(() => { if (_gmsg.temp === M) { _gmsg.temp = null; _gmsgPaint(); } }, 450);
  }, _gmsgWait(M));
}
function _gmsgPaint() {
  const H = _gmsg.hold, M = H && H.urgent ? H : _gmsg.temp || H;
  if (!M) { _gmsg.shown = null; clearTimeout(_gmsg.t); clearTimeout(_gmsg.outT); if (_gmsg.el) { _gmsg.el.remove(); _gmsg.el = null; } return; }
  const host = gardenMessageHost(); if (!host) return;
  if (_gmsg.shown === M && _gmsg.el && _gmsg.el.parentNode === host) return;
  const fresh = !_gmsg.el || !_gmsg.el.isConnected;
  let el = _gmsg.el;
  if (!el) { el = _gmsg.el = document.createElement('div'); el.onpointerenter = () => clearTimeout(_gmsg.t); el.onpointerleave = _gmsgArm; }
  if (el.parentNode !== host) host.appendChild(el);
  clearTimeout(_gmsg.outT);
  // (a fresh line eases in; a change of words on a line already there, or "Now!", is simply there)
  el.className = 'gd-msg' + (M.kind === 'err' ? ' is-bad' : '') + (M.tone === 'now' ? ' is-now' : '') + (M.acts.length ? ' has-acts' : '') + (fresh && !M.urgent ? ' is-in' : '');
  el.setAttribute('role', M.kind === 'err' ? 'alert' : 'status');
  el.textContent = '';
  const p = document.createElement('span'); p.textContent = M.text; el.appendChild(p);
  for (const a of M.acts) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = a.label;
    b.onclick = (ev) => { ev.stopPropagation(); if (_gmsg.temp === M) { _gmsg.temp = null; _gmsgPaint(); } try { a.run(); } catch (e) { console.error('[garden]', e); } };
    el.appendChild(b);
  }
  _gmsg.shown = M;
  _gmsgArm();
}
function gardenMessage(text, o) {
  o = o || {};
  let t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  if (!t || !_gmsgWhere()) return false;
  let kind = o.kind === 'err' ? 'err' : '';
  if (kind) {
    if (typeof presenceCalmMatch === 'function' && presenceCalmMatch(t)) kind = '';   // (a device of yours is only asleep: that is not a problem)
    else if (typeof netPlainError === 'function') t = netPlainError(t);
  }
  const acts = [];
  for (const a of [o.action, o.action2]) {
    if (!a || !a.label || typeof a.run !== 'function') continue;
    if (typeof _toastIsPlainUndo === 'function' && _toastIsPlainUndo(a) && typeof undoMark === 'function') {
      let mark = null;   // (taken after this tick, as a toast does: a save made just after the call is the step it undoes)
      setTimeout(() => { mark = undoMark(); }, 0);
      acts.push({ label: a.label, run: () => (mark ? undoMarked(mark) : undo()) });
    } else acts.push(a);
  }
  if (!acts.length && typeof o.retry === 'function') acts.push({ label: 'Try again', run: o.retry });
  if (o.log !== false && typeof _toastRemember === 'function') _toastRemember(t, kind, o.icon || (kind === 'err' ? 'circle-alert' : 'info'));
  const M = { text: t, kind, acts, ms: o.ms };
  const close = Object.assign(() => { if (_gmsg.temp === M) { _gmsg.temp = null; _gmsgPaint(); } }, { update: () => {}, progress: () => {} });
  if (_gmsg.hold && _gmsg.hold.urgent && !kind && !acts.length) return close;   // ("Now!" wins over chatter)
  const T = _gmsg.temp;
  if (T && T.text === t && !acts.length && !T.acts.length && _gmsg.shown === T && _gmsg.el && _gmsg.el.isConnected) { T.ms = o.ms; _gmsgArm(); return close; }   // (the same words again: they stay a little longer)
  _gmsg.temp = M;
  _gmsgPaint();
  return close;
}
function gardenMessageHold(key, text, o) {
  if (!text) { gardenMessageDrop(key); return; }
  o = o || {};
  const H = _gmsg.hold, urgent = !!o.urgent, kind = o.tone === 'err' ? 'err' : '', tone = o.tone || '';
  if (H && H.key === key && H.text === text && H.urgent === urgent && H.tone === tone && (_gmsg.shown !== H || (_gmsg.el && _gmsg.el.isConnected))) return;
  _gmsg.hold = { key, text, urgent, kind, tone, acts: [] };
  if (urgent && _gmsg.temp && !_gmsg.temp.acts.length && _gmsg.temp.kind !== 'err') _gmsg.temp = null;
  _gmsgPaint();
}
function gardenMessageDrop(key) { if (!_gmsg.hold || _gmsg.hold.key !== key) return; _gmsg.hold = null; _gmsgPaint(); }
function gardenMessageClear() { _gmsg.hold = _gmsg.temp = null; _gmsgPaint(); }
function gardenToast(msg, o) {
  const opt = o || {};
  if (opt.busy || !_gmsgWhere()) return toast(msg, opt);
  return gardenMessage(msg, { kind: opt.kind, ms: opt.timeout, action: opt.action, action2: opt.action2, retry: opt.retry, icon: opt.icon }) || toast(msg, opt);
}
function gameDeny(target, opts) {
  const o = opts || {};
  try {
    if (o.say && !gardenMessage(o.say, { log: false })) _gfSay(o.say);
    const el = target && target.getBoundingClientRect ? target : null;
    if (el) { _gfFlash(el); _gfShake(el); }
    const page = document;
    if (o.kind === 'coins') for (const c of page.querySelectorAll('.is-coins')) { _gfFlash(c); _gfShake(c, true); }
    if (o.kind === 'tool') { const t = page.querySelector('.gd-slot[aria-pressed="true"]'); if (t) { _gfFlash(t); _gfShake(t, true); } }
    if (o.kind === 'water') { const t = page.querySelector('.gd-slot[data-tool="water"]'); if (t) { _gfFlash(t); _gfShake(t, true); } }
    if (o.kind === 'bag') { const t = page.querySelector('.gd-slot[data-slot="bag"]'); if (t) { _gfFlash(t); _gfShake(t, true); } }
    const p = _gfPoint(target, o);
    const n = document.createElement('div'); n.className = 'gf-x' + (o.kind === 'lock' ? ' is-lock' : '');
    n.innerHTML = _GF_X + (o.kind === 'lock' ? `<i>${_GF_LOCK}</i>` : '');
    if (o.badge) { const b = document.createElement('b'); b.textContent = String(o.badge).slice(0, 8); n.appendChild(b); }
    n.style.left = Math.round(p.x) + 'px'; n.style.top = Math.round(p.y) + 'px';
    _gfLayer().appendChild(n);
    setTimeout(() => n.remove(), 800);
    if (!o.silent) _gfSound('deny');
  } catch (e) { console.error('[garden feel]', e); }
  return false;
}
function gameCheer(target, opts) {
  const o = opts || {};
  try {
    const p = _gfPoint(target, o), layer = _gfLayer();
    if (o.text != null && _gfMotion()) {
      const f = document.createElement('div'); f.className = 'gf-num' + (o.tone ? ' is-' + o.tone : ''); f.textContent = String(o.text).slice(0, 14);
      f.style.left = Math.round(p.x) + 'px'; f.style.top = Math.round(p.y - 8) + 'px';
      layer.appendChild(f); setTimeout(() => f.remove(), 1000);
    }
    if (!o.quiet && _gfMotion()) {
      const s = document.createElement('div'); s.className = 'gf-spark' + (o.tone ? ' is-' + o.tone : '');
      s.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i>';
      s.style.left = Math.round(p.x) + 'px'; s.style.top = Math.round(p.y) + 'px';
      layer.appendChild(s); setTimeout(() => s.remove(), 720);
    }
    if (target && target.animate && _gfMotion()) { try { target.animate({ scale: ['1', '1.08', '1'] }, { duration: 260, easing: 'ease-out' }); } catch (e) { /* fine */ } }
    if (o.sound) _gfSound('cheer');
  } catch (e) { console.error('[garden feel]', e); }
  return true;
}
/** An engine's "no", in pictures: what stopped you is read from the words, so the engine and the assistant's tools keep their plain sentences. */
function gameDenyOf(r, target, o) {
  if (r && r.shown) return false;   // (already said)
  const msg = r && r.msg ? String(r.msg) : '', opts = Object.assign({ say: msg }, o || {});
  if (!opts.kind) {
    const lv = /level (\d+)/i.exec(msg), coins = /(\d+) coins?/i.exec(msg);
    if (lv) { opts.kind = 'lock'; opts.badge = opts.badge || 'Lv ' + lv[1]; }
    else if (/costs? \d+ coin|not enough coins|you have \d+/i.test(msg)) { opts.kind = 'coins'; if (coins && !opts.badge) opts.badge = coins[1]; }
    else if (/\bcan\b.*empty|out of water|no water left/i.test(msg)) opts.kind = 'water';
    else if (/no .*seeds? left|no seeds?/i.test(msg)) opts.kind = 'bag';
    else if (/only$|only\b.*season|event:|out of season/i.test(msg)) opts.kind = 'tool';
    else if (/grows? in the|plants grow|pond plants|not in the water|not here|straddles/i.test(msg)) opts.kind = 'tool';
    else if (/opens at|buy this land|locked/i.test(msg)) opts.kind = 'lock';
  }
  return gameDeny(target, opts);
}
/** A game cursor on an element ('' clears it). The pictures are in 94-garden.css. */
function gameCursor(el, name) { if (el && el.dataset && el.dataset.gcur !== (name || '')) el.dataset.gcur = name || ''; }
