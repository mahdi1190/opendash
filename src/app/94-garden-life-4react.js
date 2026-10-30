/* ============================================================
   GARDEN LIFE, the interactions (2.23): what happens when you say hello (a row's `react`), gifts, marks and little bursts over the world, flowers rustling as you brush past,
   puddles after rain, and your pet noticing things. All of it reads rows and positions; nothing here knows an id.

     _glReact(c)         a click on a creature, once you have walked up to it
     _glMark(c, name)    a small sign over its head: heart, note, bang, zzz, spark (GL_MARKS: one line each)
     _glFx(x, y, kind)   a small burst on the ground: splash, soil, flurry, petals (GL_BURSTS: one line each)
     _glSound(name)      a very small sound, only if the game's Sounds are on (GL_SOUNDS: one line each)
     gardenLifePetGoal(P, dt)   what your pet would rather be doing than following you (94-garden-world-0walk.js asks each frame), or null
   ============================================================ */
const GL_MARKS = Object.freeze({
  heart: () => GART.P('#e8506e', 'M0 -2C-2 -6 -7 -5 -6 -1C-5.4 2 -2 3.4 0 6C2 3.4 5.4 2 6 -1C7 -5 2 -6 0 -2z') + GART.P('#ffffff', GART.ell(-3, -2.4, 1.2, 0.9), 0.65),
  note: () => GART.P('#3f5c8a', GART.ell(-2.6, 4, 2.6, 2)) + GART.S('#3f5c8a', 1.3, 'M-0.2 4V-5L5 -6.6V-3'),
  bang: () => GART.P('#d8352a', 'M-1.5 -7H1.5L0.9 2.4H-0.9z') + GART.P('#d8352a', GART.circ(0, 5.4, 1.5)),
  zzz: () => GART.S('#7c8ca8', 1.4, 'M-4 -4H2L-4 3H2'),
  spark: () => GART.P('#ffd94a', GART.star(0, 0, 4, 7, 1.8)) + GART.P('#ffffff', GART.circ(0, 0, 1.3)),
});
const _glFxState = { n: 0 };
function _glSvgEl(cls) { const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); if (cls) g.setAttribute('class', cls); return g; }
function _glFxLayer() {
  const W = _gl.W; if (!W) return null;
  const svg = W.svg || (typeof _gw !== 'undefined' ? _gw.svg : null); if (!svg) return null;
  return svg.querySelector('.gd-ui .gd-fx') || svg.querySelector('.gd-actors');
}
function _glFxAdd(node, ms) { const L = _glFxLayer(); if (!L || _glFxState.n > 40) return false; L.appendChild(node); _glFxState.n++; setTimeout(() => { node.remove(); _glFxState.n--; }, ms); return true; }
function _glStage(x, y, lift) { const G = GARDEN_WORLD; return { x: x * G.cellW, y: G.sky + y * G.cellH - (lift || 0) }; }
function _glMark(c, name) {
  const draw = GL_MARKS[name]; if (!draw || !c.S || c.gone) return;
  const p = _glStage(c.S.x, c.S.y, c.S.lift), g = _glSvgEl('gl-fx gl-mark');
  g.setAttribute('transform', `translate(${_glF(p.x + 4)} ${_glF(p.y - (c.def.markY || (c.def.habitat === 'air' ? 26 : 30)))})`);
  g.innerHTML = `<g class="gl-mark-in">${draw()}</g>`;
  _glFxAdd(g, 1250);
}
/* A burst is a few small pieces, each flying off by CSS: --dx, --dy, a delay. */
const GL_BURSTS = Object.freeze({
  splash: { n: 7, c: ['#cfe8f2', '#ffffff'], r: 1.5, dx: 14, dy: -15, ring: '#ffffff' },
  soil: { n: 6, c: ['#6a4e30', '#8a6a44'], r: 1.3, dx: 11, dy: -10 },
  flurry: { n: 5, c: ['#ffffff', '#e8e2cc'], r: 1, dx: 12, dy: -8 },
  petals: { n: 5, c: ['#f2a7c8'], r: 1.6, dx: 13, dy: -13, leaf: true },
  sparkle: { n: 8, c: ['#ffe680', '#ffffff'], r: 1.3, dx: 16, dy: -18 },
});
function _glFx(x, y, kind, o) {
  const B = GL_BURSTS[kind]; if (!B) return;
  if (_gl.W && _gl.W.still) return;
  o = o || {};
  const p = _glStage(x, y, o.lift), g = _glSvgEl('gl-fx gl-burst'), cols = o.c || B.c;
  g.setAttribute('transform', `translate(${_glF(p.x)} ${_glF(p.y)})`);
  let s = B.ring ? `<ellipse class="gl-ring" rx="10" ry="3.4" fill="none" stroke="${B.ring}" stroke-width="1"/>` : '';
  const n = o.n || B.n;
  for (let i = 0; i < n; i++) {
    const a = (i + Math.random() * 0.7) / n * 6.283, dx = Math.cos(a) * B.dx * (0.5 + Math.random() * 0.7), dy = B.dy * (0.5 + Math.random() * 0.8) + Math.sin(a) * 2;
    const col = cols[i % cols.length], shape = B.leaf ? `<path d="M0 -${B.r * 1.5}Q${B.r} 0 0 ${B.r * 1.5}Q-${B.r} 0 0 -${B.r * 1.5}z"/>` : `<circle r="${_glF(B.r * (0.6 + Math.random() * 0.6))}"/>`;
    s += `<g class="gl-bit" fill="${col}" style="--dx:${_glF(dx)}px;--dy:${_glF(dy)}px;--dr:${Math.round(Math.random() * 300 - 150)}deg;animation-delay:${Math.round(Math.random() * 90)}ms">${shape}</g>`;
  }
  g.innerHTML = s;
  _glFxAdd(g, 950);
}
/* ---------- sound: tiny sums of notes, only with Sounds on ---------- */
const GL_SOUNDS = Object.freeze({
  chirp: [[2900, 0.05, 'sine', 0.02], [3500, 0.06, 'sine', 0.025, 0.07], [3100, 0.05, 'sine', 0.02, 0.15]],
  song: [[2100, 0.14, 'sine', 0.02], [2600, 0.1, 'sine', 0.02, 0.15], [1900, 0.2, 'sine', 0.02, 0.27]],
  croak: [[150, 0.12, 'sawtooth', 0.03], [120, 0.16, 'sawtooth', 0.03, 0.16]],
  buzz: [[210, 0.26, 'sawtooth', 0.012]],
  purr: [[60, 0.5, 'triangle', 0.05]],
  quack: [[420, 0.09, 'sawtooth', 0.02], [340, 0.11, 'sawtooth', 0.02, 0.13]],
  twinkle: [[1760, 0.1, 'triangle', 0.018], [2349, 0.14, 'triangle', 0.016, 0.09]],
  pop: [[880, 0.06, 'triangle', 0.03]],
});
let _glAudio = null;
function _glSound(name) {
  const list = GL_SOUNDS[name]; if (!list) return;
  try {
    if (typeof _gmG !== 'function' || !_gmG().prefs.sounds || document.hidden) return;
    if (typeof gameOn === 'function' && !gameOn()) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = _glAudio || (_glAudio = new AC()); if (ac.state === 'suspended') ac.resume();
    const t0 = ac.currentTime + 0.01;
    for (const [f, d, type, peak, at] of list) {
      const o = ac.createOscillator(), v = ac.createGain(), s = t0 + (at || 0);
      o.type = type; o.frequency.value = f; v.gain.setValueAtTime(0, s); v.gain.linearRampToValueAtTime(peak, s + 0.012); v.gain.exponentialRampToValueAtTime(0.0001, s + d);
      o.connect(v); v.connect(ac.destination); o.start(s); o.stop(s + d + 0.02);
    }
  } catch (e) { /* no sound here */ }
}
/* ---------- a click: you have walked up, it reacts ---------- */
function _glClient(x, y, lift) {
  const W = _gl.W, svg = (W && W.svg) || (typeof _gw !== 'undefined' ? _gw.svg : null); if (!svg) return null;
  try { const s = _glStage(x, y, lift), pt = svg.createSVGPoint(); pt.x = s.x; pt.y = s.y; const q = pt.matrixTransform(svg.getScreenCTM()); return { x: q.x, y: q.y }; } catch (e) { return null; }
}
function _glReact(c) {
  if (c.gone || !_gl.W) return;
  const W = _gl.W, R = c.def.react || {}, S = c.S, P = W.player();
  if (typeof gardenLifeFound === 'function') gardenLifeFound('c', c.def.id);
  if (P) c.faceTo = P.x > S.x ? 1 : -1;
  c.calm = 3.5; c.reacting = 1.6; c.after = c.clip || 'rest';
  if (W.still) { _glMark(c, R.mark || 'heart'); if (R.sound) _glSound(R.sound); _glMaybeGift(c, R); return; }
  _glClip(c, R.clip || 'react');
  if (R.mark) _glMark(c, R.mark);
  if (R.sound) _glSound(R.sound);
  if (R.hop && c.medium === 'ground' && !c.perched && !c.hop) _glHopTo(c, S.x, S.y, 0.34, 11);
  _glMaybeGift(c, R);
  if (R.flee) setTimeout(() => { if (!c.gone && _gl.W) { c.calm = 0; c.reacting = 0; const P2 = _gl.W.player(); if (P2) _glScareOne(c, _gl.W, P2.x, P2.y); } }, 1100);
}
function _glMaybeGift(c, R) {
  if (!R.gift || !GL_KEEPSAKE.has(R.gift) || !_gl.W.own) return;
  if (typeof gardenLifeHas === 'function' && gardenLifeHas('k', R.gift)) return;   // you have this one: a hello is its own reward
  if (Math.random() > (R.chance == null ? 0.4 : R.chance)) return;
  if (_gl.gifted && _gl.gifted.has(R.gift)) return;
  (_gl.gifted = _gl.gifted || new Set()).add(R.gift);
  _glDropGift(R.gift, c.S.x, c.S.y, c.S.lift || 0);
}
/** Something dropped: it falls, sits on the ground and glints. Walk up and it is yours. */
function _glDropGift(id, x, y, lift) {
  const W = _gl.W, k = GL_KEEPSAKE.get(id); if (!W || !k) return;
  const P = W.player(), side = P && P.x > x ? 0.55 : -0.55;
  const at = _glFreeAround(W, x + side, y + 0.35, 0.12, 3) || { x, y };
  const S = W.add({
    id: 'gift-' + id, svg: `<g class="gl-gift"><g class="gl-glint">${GL_MARKS.spark()}</g>${gardenKeepsakeSvg(k)}</g>`, x: at.x, y: at.y, lift, hit: 0.7, label: k.name, cursor: 'hand', ground: false,
    update(dt) { if (S.lift > 0) { S.lift = Math.max(0, S.lift - dt * Math.max(40, S.lift * 3)); if (S.lift === 0) _glFx(S.x, S.y, 'flurry', { n: 3 }); } },
    onClick() { if (typeof gardenLifeFound === 'function') gardenLifeFound('k', id); const q = _glClient(S.x, S.y, 16); if (typeof gameCheer === 'function') gameCheer(q, { quiet: false, sound: true }); _glGifts.delete(S); S.remove(); },
  });
  _glGifts.add(S);
}
const _glGifts = new Set();

/* ---------- flowers rustle as you brush past; a splash in a puddle ---------- */
const _glBrush = { t: new Map(), x: 0, y: 0, last: 0, splashT: 0 };
function _glBrushFrame(W, now) {
  if (!W.own || W.still) return;
  const P = W.player(); if (!P || !P.moving) return;
  if (Math.abs(P.x - _glBrush.x) + Math.abs(P.y - _glBrush.y) < 0.12) return;
  _glBrush.x = P.x; _glBrush.y = P.y;
  const m = W.m, cx = Math.floor(P.x), cy = Math.floor(P.y);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cell = m.occ.get((cx + dx) + ',' + (cy + dy)); if (!cell || !cell.plant) continue;
    const pl = gardenPlantById(m, cell.plant); if (!pl || pl.stage < 3 || (pl.def.cat === 'tree')) continue;
    const mx = pl.x + pl.fp / 2, my = pl.y + pl.fp - 0.3;
    if (_glDist(P.x, P.y, mx, my) > 0.74) continue;
    if (now - (_glBrush.t.get(pl.uid) || 0) < 1400) continue;
    _glBrush.t.set(pl.uid, now);
    _glRustle(pl, P);
  }
  // a splash when you walk through a puddle
  if (_glPud.list.length && now - _glBrush.splashT > 420) for (const q of _glPud.list) { if (Math.abs(P.x - q.x) < q.w && Math.abs(P.y - q.y) < q.w * 0.6) { _glBrush.splashT = now; _glFx(P.x, P.y, 'splash', { n: 5 }); break; } }
}
function _glRustle(pl, P) {
  const svg = _gl.W.svg || (typeof _gw !== 'undefined' ? _gw.svg : null); if (!svg) return;
  const n = svg.querySelector(`.gd-it[data-uid="${CSS.escape(pl.uid)}"]`), inner = n && n.firstElementChild;
  if (inner && inner.animate) { const dir = P.x < pl.x + pl.fp / 2 ? 1 : -1; try { inner.animate({ rotate: ['0deg', `${dir * 7}deg`, `${-dir * 4}deg`, `${dir * 2}deg`, '0deg'] }, { duration: 620, easing: 'ease-out' }); } catch (e) { /* an old browser just doesn't rustle */ } }
  const lk = pl.def.look || {}, h = Math.max(12, Math.min(40, (lk.h || 0.7) * 34));
  _glFx(pl.x + pl.fp / 2, pl.y + pl.fp - 0.3, 'petals', { lift: h, c: pl.stage >= 4 && lk.c ? [lk.c, lk.c2 || lk.c] : [lk.leaf || '#6a9a4a'], n: pl.stage >= 4 ? 5 : 3 });
}
/* ---------- puddles: one flat node under everything, the same ones all day ---------- */
const _glPud = { key: '', node: null, list: [] };
function _glPuddles(W) {
  if (!W.own) return;
  const svg = typeof _gw !== 'undefined' ? _gw.svg : null, layer = svg && svg.querySelector('.gd-objects');
  const on = (W.wet || W.rain) && !W.snow && W.season !== 'winter-freeze';
  if (!on || !layer) { if (_glPud.node) { _glPud.node.remove(); _glPud.node = null; } _glPud.list = []; _glPud.key = ''; return; }
  const key = W.day + (W.rain ? '|r' : '|w') + '|' + W.objects.length;
  if (_glPud.key === key && _glPud.node && _glPud.node.isConnected) return;
  _glPud.key = key; if (_glPud.node) _glPud.node.remove();
  const rnd = gardenRand('gl-puddles|' + W.day), G = GARDEN_WORLD, A = GART, list = []; let s = '';
  for (let i = 0; i < 420 && list.length < 16; i++) {
    const x = rnd() * G.cols, y = rnd() * G.rows; if (!W.free(x, y, 0.6) || W.water(x, y)) continue;
    const w = 0.5 + rnd() * 0.8; if (list.some(q => Math.abs(q.x - x) < 2 && Math.abs(q.y - y) < 1.4)) continue;
    list.push({ x, y, w });
    const p = _glStage(x, y), rx = w * G.cellW * 0.62, ry = rx * 0.36, r2 = A.rng(Math.floor(rnd() * 1e6));
    s += `<g transform="translate(${_glF(p.x)} ${_glF(p.y)})"><path fill="#5a7a88" fill-opacity="0.34" d="${A.blob(r2, 0, 0, rx + 1.4, ry + 1, 8, 0.2)}"/><path fill="#a9cede" fill-opacity="0.62" d="${A.blob(r2, 0, 0, rx, ry, 8, 0.2)}"/><path fill="#ffffff" fill-opacity="0.42" d="${A.ell(-rx * 0.28, -ry * 0.28, rx * 0.34, ry * 0.2)}"/>`
      + (W.rain ? `<ellipse class="gl-ripple" rx="${_glF(rx * 0.5)}" ry="${_glF(ry * 0.5)}" style="animation-delay:-${_glF(rnd() * 2)}s"/>` : '') + '</g>';
  }
  const g = _glSvgEl('gl-puddles'); g.setAttribute('data-live', '1'); g.setAttribute('data-z', '-1'); g.innerHTML = s;
  layer.insertBefore(g, layer.firstChild);
  _glPud.node = g; _glPud.list = list;
}
/* ---------- your pet notices things ---------- */
const _glPet = { mode: '', t: 0, cool: 6, c: null };
/** Called by the walk loop for the pet that follows you. Null: go on following. {x, y, near, fast}: go there instead. */
function gardenLifePetGoal(P, dt) {
  if (!_gl.W || !_gl.W.own || _gl.W.still) return null;
  const W = _gl.W, Q = _glPet, pl = W.player(); if (!pl) return null;
  if (Q.cool > 0) Q.cool -= dt;
  const dPl = _glDist(P.x, P.y, pl.x, pl.y);
  // you called it away: walking off ends any game
  if (Q.mode && dPl > 6) { Q.mode = ''; Q.c = null; Q.cool = 4; return null; }
  if (!Q.mode) {
    if (Q.cool > 0 || pl.moving) return null;
    let best = null, bd = 3.6;
    for (const c of _gl.list) { if (c.gone || c.left || c.hidden || !c.onScreen) continue; const d = _glDist(c.S.x, c.S.y, P.x, P.y); if (d < bd) { bd = d; best = c; } }
    Q.cool = 1.2;
    if (!best) return null;
    Q.mode = 'notice'; Q.t = 0.7; Q.c = best; { const f = best.S.x > P.x ? 1 : -1; if (P.dir != null) P.dir = f; else P.face = f; }   // (a roaming pet's way round is P.dir; its P.face is a node)
    _glPetMark(P, 'bang');
    return { x: P.x, y: P.y, near: 999 };
  }
  const c = Q.c;
  if (!c || c.gone || c.left || c.hidden) { Q.mode = ''; Q.c = null; Q.cool = 5; return null; }
  Q.t -= dt;
  if (Q.mode === 'notice') {
    if (Q.t <= 0) { const skit = c.brain.some(b => b.name === 'startled-by-pet'); Q.mode = skit && Math.random() < 0.6 ? 'chase' : 'sniff'; Q.t = Q.mode === 'chase' ? 3.6 : 4; }
    return { x: P.x, y: P.y, near: 999 };
  }
  if (Q.mode === 'chase') {
    if (Q.t <= 0 || c.cur && c.cur.name.startsWith('startled') && _glDist(c.S.x, c.S.y, P.x, P.y) > 5) { Q.mode = ''; Q.c = null; Q.cool = _glR(8, 16); _glPetMark(P, 'heart'); return null; }
    return { x: c.S.x, y: c.S.y, near: 8, fast: true };
  }
  // sniff: up close, nose down, then a heart and back to you
  if (Q.t <= 0) { Q.mode = ''; Q.c = null; Q.cool = _glR(10, 20); return null; }
  const d = _glDist(c.S.x, c.S.y, P.x, P.y);
  if (d < 0.9 && !Q.sniffed) { Q.sniffed = true; _glPetSniff(P); _glPetMark(P, 'heart'); setTimeout(() => { Q.sniffed = false; }, 2500); }
  return { x: c.S.x - (c.S.x > P.x ? 0.5 : -0.5), y: c.S.y + 0.1, near: 4 };
}
function _glPetMark(P, name) { _glMark({ S: { x: P.x, y: P.y, lift: 0 }, def: { markY: 24 } }, name); }
function _glPetSniff(P) {
  if (typeof P.setAct === 'function') { P.setAct('sniff'); setTimeout(() => { if (P.act === 'sniff') P.setAct(''); }, 1400); return; }   // a roaming pet has named clips
  const b = P.node && P.node.querySelector('.gdp-body');
  if (b && b.animate) { try { b.animate({ rotate: ['0deg', '14deg', '10deg', '15deg', '9deg', '14deg', '0deg'] }, { duration: 1400, easing: 'ease-in-out' }); } catch (e) { /* fine */ } }
}
/* ---------- the engine's hooks ---------- */
function gardenLifeFrame(dt, W) {
  if (!W) return;
  const now = performance.now();
  _glBrushFrame(W, now);
  if (typeof _glEggFrame === 'function') _glEggFrame(dt, W);
}
function gardenLifeWorldFrame1s(W) { _glPuddles(W); if (typeof _glEggTick === 'function') _glEggTick(W); }
function gardenLifePainted(W) { _glPuddles(W); }
function gardenLifeBegin(W) { _gl.gifted = new Set(); if (typeof _glEggsBegin === 'function') _glEggsBegin(W); if (typeof gardenLifeSettle === 'function') gardenLifeSettle(); }
function gardenLifeEnd() {
  for (const S of [..._glGifts]) { try { S.remove(); } catch (e) { /* gone */ } } _glGifts.clear();
  if (_glPud.node) { _glPud.node.remove(); _glPud.node = null; } _glPud.list = []; _glPud.key = '';
  Object.assign(_glPet, { mode: '', t: 0, cool: 6, c: null });
  if (typeof _glEggsEnd === 'function') _glEggsEnd();
}
