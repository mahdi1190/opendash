/* ============================================================
   GARDEN WONDER, the kit (docs/dev/HUNDRED_WORLD.md). User request, 1 Nov 2026: significant things that surprise, that make the garden a world you enjoy being in.

     wdMod({id, pref, fun, visit, begin(m), painted(m), tick(m), frame(dt), end()})   one part of the world. fun: false stays on at Fun Off; visit: true runs in a friend's garden too; pref: a Settings switch
     wdSprite(spec)              gardenWorldAdd, removed when you leave
     wdGlow(id, svg, x, y)       something that shines over the night (the night is painted over everything in the objects layer); a repaint wipes the fx layer, so ask again each tick
     wdTalk(o)                   someone speaks: a strip at the foot of the stage, never a pop-up over your work
     wdWhisper(text)             one quiet line that fades by itself
     wdMoon(iso), wdSound(list), wdNear(x, y, r)

   SAVES: state.garden.wd, entry by entry (lib/sync/model.mjs), so two devices add up. Ids and days only: no friend's text, nothing about tasks or money.
   Everything sold or found shows in the world; a friend sees what is in the snapshot's `wd` (gardenWonderWire).
   ============================================================ */
const _wd = { on: false, key: '', dir: null, t: 0, tickT: 0, sprites: new Set(), glows: new Map(), live: [], talk: null, wh: null };
const _WD_MODS = [];
function wdMod(o) { _WD_MODS.push(o); }
function _wdG() { return _gdG().wd; }
function _wdGet(k) { return _wdG()[k]; }
function _wdSave() { try { if (typeof saveUI === 'function') saveUI(); } catch (e) { /* the next save takes it */ } }
function _wdSet(k, v) { _wdG()[k] = v; _wdSave(); }
function _wdToday() { return _gdToday(); }
function _wdDaysBetween(a, b) { const x = Date.parse(a + 'T12:00:00Z'), y = Date.parse(b + 'T12:00:00Z'); return Number.isFinite(x) && Number.isFinite(y) ? Math.round((y - x) / 86400000) : 0; }   // clock-ok: the distance between two ISO days
function _wdFriendId() { try { return typeof _gsvIdOf === 'function' ? _gsvIdOf(state.view) : null; } catch (e) { return null; } }
/* ---------- world cells: every place these files use, worked out from GARDEN_AREAS and GARDEN_PROPS, so a moved map moves them too. List of tables: WD_AT here, WD_FINDS in 3finds. ---------- */
function _wdPt(id, dx, dy) { const p = GARDEN_PROPS.find(x => x.id === id), b = !p ? { x: 10, y: 12 } : p.door ? { x: p.door.x + 0.5, y: p.door.y + 0.5 } : { x: p.x + p.w / 2, y: p.y + p.h / 2 }; return { x: b.x + (dx || 0), y: b.y + (dy || 0) }; }
const _WD_LAKE = (GARDEN_AREAS.find(a => a.id === 'lake') || {}).water || { x: 0, y: 13, w: 28, h: 17 };
const _WD_ISLE_C = Object.freeze({ cx: _WD_LAKE.x + _WD_LAKE.w * 0.786, cy: _WD_LAKE.y + _WD_LAKE.h * 0.535, rx: 3.5, ry: 2.3 });
const WD_AT = Object.freeze({   // world cells
  isle: _WD_ISLE_C,
  road: (() => { const a = _wdPt('tackle-shop', -0.9, 0), s = { x: a.x, y: _WD_LAKE.y - 0.3 }, e = { x: _WD_ISLE_C.cx - 0.8, y: _WD_ISLE_C.cy - _WD_ISLE_C.ry + 0.1 }, at = (t, bend) => [s.x + (e.x - s.x) * t + bend, s.y + (e.y - s.y) * t]; return Object.freeze([[s.x, s.y], at(0.33, -0.5), at(0.66, -0.3), [e.x, e.y]]); })(),
  willow: Object.freeze({ x: _WD_ISLE_C.cx + 0.2, y: _WD_ISLE_C.cy - 1.2 }),
  seat: Object.freeze({ x: _WD_ISLE_C.cx - 1.1, y: _WD_ISLE_C.cy + 0.8 }),
  bell: Object.freeze({ x: _WD_ISLE_C.cx + 1.9, y: _WD_ISLE_C.cy + 0.5 }),
  rowboat: Object.freeze({ x: _WD_ISLE_C.cx - 0.7, y: _WD_ISLE_C.cy - 2 }),
  rowHome: _wdPt('tackle-shop', -0.9, 0),
  postWalk: _wdPt('post-box', -0.1, 0.2),
  postFlag: _wdPt('post-box', 0, -0.58),
  bench: _wdPt('reed-bank', -0.3, 0.4),
  trunk: _wdPt('reed-bank', 1.2, -0.58),
  rug: _wdPt('notice-board', -1, -2.8),
  cairn: _wdPt('notice-board', -2, 0.25),
  farShore: Object.freeze({ x0: _WD_LAKE.x + _WD_LAKE.w * 0.5, x1: _WD_LAKE.x + _WD_LAKE.w * 0.96, y: _WD_LAKE.y + _WD_LAKE.h * 0.8 }),
  lakeStars: Object.freeze({ x: _WD_LAKE.x + 1.2, y: _WD_LAKE.y + 2.2 }),
  feast: _wdPt('notice-board', -2.5, -3),
  fire: _wdPt('camera-tripod', -0.5, 0.1),
  lanterns: _wdPt('pier', 0, 2.6),
  miceBack: _wdPt('sundial', -2, -2.4),
});
/* ---------- Settings: each kind can be turned down ---------- */
const WD_PREFS = Object.freeze([
  ['folk', 'People who call by', 'Six characters, one at a time, who come to your garden and remember what you have done.'],
  ['post', 'The snail post', 'Letters and postcards, brought slowly by a snail.'],
  ['days', 'Small days in the calendar', 'A lantern on the lake, a supper, a fire: a few days a year, in the world.'],
  ['weather', 'Weather you can feel', 'Footprints in snow and after rain, and whatever else leaves them.'],
  ['still', 'Things that come to you', 'A bird on your head if you stand still long enough.'],
]);
function _wdOn(k) { try { const p = _gdG().prefs.wd; return !p || p[k] !== false; } catch (e) { return true; } }
registerSettingsGroup({
  id: 'garden-world', title: 'Garden world', icon: 'trees', order: 62,
  description: 'What happens in your garden on its own. Nothing here ever changes a task, an event or your money.',
  render(el) {
    for (const [k, label, hint] of WD_PREFS) {
      el.appendChild(_settingsRow(label, hint, _settingsSwitch(_wdOn(k), label, (on) => {
        const g = _gdG(); g.prefs.wd = Object.assign({}, g.prefs.wd, { [k]: !!on }); _wdSave();
        if (_wd.on) { const m = gardenHere(); gardenWonderStop(); gardenWonderSync(m); }
      })));
    }
  },
});
/* ---------- the moon: the real one ---------- */
const _WD_SYN = 29.530588853;
function wdMoonAge(iso) { const d = (Date.parse(iso + 'T12:00:00Z') - Date.UTC(2000, 0, 6, 18, 14)) / 86400000; return ((d % _WD_SYN) + _WD_SYN) % _WD_SYN; }   // clock-ok: the age of the moon on an ISO day
function wdMoon(iso) {
  const a = wdMoonAge(iso), mid = _WD_SYN / 2, toFull = a <= mid ? mid - a : mid + _WD_SYN - a, full = Math.abs(a - mid) <= 1.3;
  const name = full ? 'full' : a < 1.3 || a > _WD_SYN - 1.3 ? 'new' : a < mid ? 'waxing' : 'waning';
  return { age: a, full, name, toFull: Math.round(toFull) };
}
/* ---------- the world's loop: one sprite that does nothing but this; it stops when the world's loop stops ---------- */
function _wdActive(M) { return (M.fun === false || gardenFun() !== 'off') && (!M.pref || _wdOn(M.pref)); }
function gardenWonderSync(m) {
  if (typeof _gw === 'undefined' || !_gw.on || !m) return;
  const key = m.visit ? 'v' + (_wdFriendId() || '') : 'o';
  if (_wd.on && _wd.key !== key) gardenWonderStop();
  if (!_wd.on) {
    _wd.on = true; _wd.key = key; _wd.t = 0; _wd.tickT = 0;
    _wd.live = _WD_MODS.filter(M => (!m.visit || M.visit) && _wdActive(M));
    _wd.dir = gardenWorldAdd({ id: 'wonder', svg: '', x: 0, y: -2, lift: 0, still: true, update: _wdFrame });
    for (const M of _wd.live) if (M.begin) { try { M.begin(m); } catch (e) { console.error('[garden wonder]', M.id, e); } }
  }
  for (const M of _wd.live) if (M.painted) { try { M.painted(m); } catch (e) { console.error('[garden wonder]', M.id, e); } }
}
function _wdFrame(dt) {
  _wd.t += dt;
  for (const M of _wd.live) if (M.frame) { try { M.frame(dt); } catch (e) { console.error('[garden wonder]', M.id, e); } }
  if ((_wd.tickT -= dt) > 0) return;
  _wd.tickT = 1;
  const m = gardenHere();
  if (_wd.talk) _wdTalkCheck();
  for (const M of _wd.live) if (M.tick) { try { M.tick(m); } catch (e) { console.error('[garden wonder]', M.id, e); } }
}
function gardenWonderStop() {
  if (!_wd.on) return;
  for (const M of _wd.live) if (M.end) { try { M.end(); } catch (e) { console.error('[garden wonder]', M.id, e); } }
  _wd.on = false; _wd.live = []; wdTalkClose(true);
  for (const S of [..._wd.sprites]) { try { S.remove(); } catch (e) { /* gone */ } }
  if (_wd.dir) { try { _wd.dir.remove(); } catch (e) { /* gone */ } _wd.dir = null; }
  for (const g of _wd.glows.values()) g.remove();
  _wd.glows.clear();
}
/* ---------- things in the world ---------- */
function wdSprite(spec) {
  const S = gardenWorldAdd(Object.assign({ lift: 0, ground: false }, spec)), rm = S.remove;
  _wd.sprites.add(S);
  S.remove = () => { _wd.sprites.delete(S); rm(); };
  return S;
}
/** Change a sprite's drawing: it holds for the node it has now and for the one a repaint makes. */
function wdArt(S, svg) { if (S.svg === svg) return; S.svg = svg; if (S.node) S.node.innerHTML = svg; }
function wdGlow(id, markup, x, y) {
  const svg = typeof _gw !== 'undefined' ? _gw.svg : null, host = svg && (svg.querySelector('.gd-ui .gd-fx') || svg.querySelector('.gd-actors')); if (!host) return null;
  let g = _wd.glows.get(id);
  if (!g || !g.isConnected || g._mk !== markup) {
    if (g) g.remove();
    g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'wd-glow'); g.innerHTML = markup; g._mk = markup; host.appendChild(g); _wd.glows.set(id, g);
  }
  const W = GARDEN_WORLD, tf = `translate(${(x * W.cellW).toFixed(1)} ${(W.sky + y * W.cellH).toFixed(1)})`;
  if (g.getAttribute('transform') !== tf) g.setAttribute('transform', tf);
  return g;
}
function wdGlowOff(id) { const g = _wd.glows.get(id); if (g) { g.remove(); _wd.glows.delete(id); } }
function wdNear(x, y, r) { return typeof _gw !== 'undefined' && Math.hypot(_gw.px - x, _gw.py - y) <= r; }
/** A free point near this one, or null. */
function wdFreeNear(x, y, r) { return typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(x, y, r || 3) : null; }
/* ---------- sound: only if the game's Sounds are on ---------- */
function wdSound(list) {
  try {
    if (typeof _gmG !== 'function' || !_gmG().prefs.sounds || document.hidden) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = _glAudio || (_glAudio = new AC()); if (ac.state === 'suspended') ac.resume();
    const t0 = ac.currentTime + 0.01;
    for (const [f, d, type, peak, at] of list) {
      const o = ac.createOscillator(), v = ac.createGain(), s = t0 + (at || 0);
      o.type = type || 'sine'; o.frequency.value = f; v.gain.setValueAtTime(0, s); v.gain.linearRampToValueAtTime(peak, s + 0.015); v.gain.exponentialRampToValueAtTime(0.0001, s + d);
      o.connect(v); v.connect(ac.destination); o.start(s); o.stop(s + d + 0.05);
    }
  } catch (e) { /* no sound, no matter */ }
}
/* ---------- someone speaks ---------- */
function _wdBox() { return typeof _gw !== 'undefined' && _gw.box ? _gw.box : null; }
/** o: {name, art (svg inside a 44 by 56 frame, feet at 0,0), lines: [text], actions: [{label, run, primary}], at: {x, y}, bye (the last button's word), onClose} */
function wdTalk(o) {
  wdTalkClose(true);
  const box = _wdBox(); if (!box) return;
  const el = document.createElement('div'); el.className = 'wd-talk'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', o.name ? o.name + ' is talking to you' : 'Something to read');
  el.innerHTML = (o.art ? `<div class="wd-talk-art" aria-hidden="true"><svg viewBox="-24 -54 48 60" width="72" height="90">${o.art}</svg></div>` : '') + '<div class="wd-talk-in"><b class="wd-talk-n"></b><p class="wd-talk-t" aria-live="polite"></p><div class="wd-talk-go"></div></div>';
  el.querySelector('.wd-talk-n').textContent = o.name || '';
  if (!o.name) el.querySelector('.wd-talk-n').remove();
  const lines = (o.lines || []).filter(Boolean), T = { el, o, i: 0 };
  _wd.talk = T;
  const go = el.querySelector('.wd-talk-go');
  const btn = (label, run, primary) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm' + (primary ? ' btn-primary' : ' btn-ghost'); b.textContent = label; b.onclick = run; go.appendChild(b); return b; };
  const show = () => {
    el.querySelector('.wd-talk-t').textContent = lines[T.i] || '';
    go.textContent = '';
    if (T.i < lines.length - 1) { btn('Go on', () => { T.i++; show(); }, true).focus({ preventScroll: true }); return; }
    for (const a of o.actions || []) btn(a.label, () => a.run(T), a.primary);
    btn(o.bye || 'Goodbye', () => wdTalkClose()).focus({ preventScroll: true });
  };
  T.say = (text, actions) => { lines.length = 0; lines.push(text); T.i = 0; o.actions = actions || []; show(); };
  el.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); wdTalkClose(); } ev.stopPropagation(); });
  box.appendChild(el); show();
  return T;
}
function wdTalkClose(quiet) { const T = _wd.talk; if (!T) return; _wd.talk = null; T.el.remove(); if (T.o.onClose && !quiet) { try { T.o.onClose(); } catch (e) { console.error('[garden wonder]', e); } } else if (T.o.onClose && quiet === true && T.o.closeQuiet) T.o.onClose(); }
/** Walked away from whoever you were talking to: they stop. */
function _wdTalkCheck() { const T = _wd.talk; if (!T) return; const a = T.o.at; if (a && !wdNear(a.x, a.y, 6)) wdTalkClose(); else if (!T.el.isConnected) { const box = _wdBox(); if (box) box.appendChild(T.el); } }
function wdWhisper(text, ms) {
  const box = _wdBox(); if (!box) return;
  if (_wd.wh) { clearTimeout(_wd.wh.t); _wd.wh.el.remove(); }
  const el = document.createElement('div'); el.className = 'wd-whisper'; el.setAttribute('role', 'status'); el.textContent = text;
  box.appendChild(el);
  const W = { el, t: setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 900); if (_wd.wh === W) _wd.wh = null; }, ms || 6000) };
  _wd.wh = W;
}
/** A page to read, or something found: the kit's own dialog, since you asked to see it. */
function wdPage(o) {
  openDialog({
    title: o.title, width: o.width || 480, className: 'wd-pagedlg',
    body(el) {
      if (o.art) { const a = _gdpEl('div', 'wd-page-art'); a.innerHTML = o.art; el.appendChild(a); }
      for (const t of o.text || []) el.appendChild(_gdpEl('p', 'wd-page-p', t));
      if (o.sign) el.appendChild(_gdpEl('p', 'wd-page-sign', o.sign));
      if (o.foot) el.appendChild(_gdpEl('p', 'muted wd-page-foot', o.foot));
      if (o.after) o.after(el);
    },
  });
}
/** What a friend sees of all this: ids and numbers. */
function gardenWonderWire() {
  const w = _wdG(), out = {}, sk = [];
  let st = 0, f = 0;
  for (const k of Object.keys(w)) { if (k.startsWith('sk.')) sk.push(k.slice(3)); else if (k.startsWith('st.')) st++; else if (k.startsWith('ff.')) f++; }
  if (sk.length) out.sk = sk.slice(0, 24);
  if (st) out.st = Math.min(999, st);
  if (f) out.f = Math.min(99, f);
  if (w['lr.w7']) out.w = 1;
  return Object.keys(out).length ? out : null;
}
function _wdTheir(m) { return (m && m.visit && m.visit.snap && m.visit.snap.wd) || {}; }
function _wdPlural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
