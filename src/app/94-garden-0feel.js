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
 * WORDS IN THE WORLD. The owner: "no more annoying messages at the bottom ... messages only if needed, but it looks good and thematic". In the garden, what used to be a bar is said by your own figure, a bubble over its head that
 * only you see (gardenSay). What needs an answer or is a real problem hangs on a wooden sign at the top of the stage, with its buttons (gardenSign). Away from the garden, or with a dialog open, it is the app's ordinary toast.
 *   gardenToast(msg, o)   takes toast's arguments and chooses
 */
function _gfWorldOpen() { return typeof _gw !== 'undefined' && _gw.on && !!_gw.box && _gw.box.isConnected && typeof _gdOnPage === 'function' && _gdOnPage() && !document.querySelector('.modal, .ee-room'); }
function gardenSay(text, ms) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t || t.length > 110 || !_gfWorldOpen() || !_gw.node || typeof _gllMe === 'undefined') return false;
  const wait = Math.max(2600, Math.min(6000, Number(ms) || 1400 + t.length * 60));
  _gllMe.say = { text: t, until: Date.now() + wait };   // clock-ok: how long a bubble stays
  _gllSayDraw(_gllMe);
  clearTimeout(_gllMe.sayT); _gllMe.sayT = setTimeout(() => { _gllMe.say = null; _gllSayDraw(_gllMe); }, wait);
  return true;
}
function gardenSign(text, o) {
  o = o || {};
  const box = _gw.box;
  let n = box.querySelector(':scope > .gd-sign');
  if (n) { clearTimeout(n._t); n.remove(); }
  n = document.createElement('div'); n.className = 'gd-sign' + (o.kind === 'err' ? ' is-bad' : ''); n.setAttribute('role', o.kind === 'err' ? 'alert' : 'status');
  const p = document.createElement('span'); p.textContent = String(text); n.appendChild(p);
  const close = () => { clearTimeout(n._t); n.remove(); };
  const btn = (label, run) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = (ev) => { ev.stopPropagation(); close(); try { run(); } catch (e) { console.error('[garden]', e); } }; n.appendChild(b); };
  if (o.action && o.action.label && typeof o.action.run === 'function') btn(o.action.label, o.action.run);
  if (typeof o.retry === 'function') btn('Try again', o.retry);
  box.appendChild(n);
  n._t = setTimeout(close, Number(o.timeout) || (o.kind === 'err' || o.retry ? 10000 : 7000));
  return close;
}
function gardenToast(msg, o) {
  const opt = o || {};
  if (opt.busy) return toast(msg, opt);
  if (!_gfWorldOpen()) {
    if (opt.later || typeof _gw === 'undefined' || !_gw.on || typeof _gdOnPage !== 'function' || !_gdOnPage()) return toast(msg, opt);
    setTimeout(() => gardenToast(msg, Object.assign({}, opt, { later: true })), 500);   // (a panel of the garden's own is just closing)
    return () => {};
  }
  const plain = opt.kind !== 'err' && !opt.action && !opt.retry;
  if (plain && gardenSay(msg, opt.timeout)) return () => {};
  return gardenSign(msg, opt);
}
function gameDeny(target, opts) {
  const o = opts || {};
  try {
    _gfSay(o.say);
    if (o.say) gardenSay(o.say);
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
