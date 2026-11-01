/* ============================================================
   THE GARDENER'S EMOTES (2.23, agent 'craft'): wave, dance, cheer, sit down... from a small wheel. The same idea as the pets' clips: A MOVE IS ONE ROW of GART_EMOTES, tracks on the figure's named parts
   (root, up, head, armL, armR, legL, legR; 94-garden-art-g-player.js draws them), keys [t, {x y r sx sy s k}, ease], built by the clip library's own compiler.
     how   {free: 1}, {treats: n}, {coins: n} or {craft: <recipe>}; hold: true for one that lasts until you move (sitting)
     gartEmoteRun(id, o)    do it (o.quiet: as a reaction, not from the wheel)
     gartEmoteOwned(id)     gartEmoteBuy(id, pay)
     gartEmoteWheel()       open or close the wheel
   Saves: a bought move is state.pet.buy['emote:<id>']; a crafted one is the recipe's item. In the garden only; reduced motion holds the pose for a moment.
   ============================================================ */
const _PE_SEL = Object.freeze({ root: '.gpl-root', up: '.gpl-up', head: '.gpl-hd', armL: '.gpl-af.gpl-b', armR: '.gpl-af.is-r', legL: '.gpl-lf.gpl-a', legR: '.gpl-lf.gpl-b' });
const GART_EMOTES = Object.freeze({
  wave: { name: 'Wave', icon: 'hand', ms: 1500, how: { free: 1 }, armR: [[0.08, { r: 10 }, 'io'], [0.2, { r: -150 }, 'b'], [0.32, { r: -118 }, 'io'], [0.44, { r: -155 }, 'io'], [0.56, { r: -118 }, 'io'], [0.68, { r: -155 }, 'io'], [0.82, { r: -130 }, 'io'], [0.95, {}]], up: [[0.2, { r: -3 }, 's'], [0.82, { r: -3 }, 'io'], [0.95, {}]], head: [[0.2, { r: 5 }, 'io'], [0.5, { r: -3 }, 'io'], [0.82, { r: 4 }, 'io'], [0.95, {}]] },
  cheer: { name: 'Cheer', icon: 'party-popper', ms: 1300, how: { free: 1 }, root: [[0.12, { y: 2, sy: 0.9, sx: 1.08 }, 'i'], [0.36, { y: -22, sy: 1.06, sx: 0.96 }, 'o'], [0.56, { y: -24 }, 'i'], [0.72, { y: 1, sy: 0.88, sx: 1.1 }, 'o'], [0.86, { sy: 1.03 }, 'io']], armL: [[0.14, { r: 14 }, 'i'], [0.34, { r: 158 }, 'b'], [0.7, { r: 150 }, 'io'], [0.92, {}]], armR: [[0.14, { r: -14 }, 'i'], [0.34, { r: -158 }, 'b'], [0.7, { r: -150 }, 'io'], [0.92, {}]], head: [[0.36, { r: -5 }, 'io'], [0.72, { r: 5 }, 'io'], [0.9, {}]], fx: 'spark' },
  clap: { name: 'Clap', icon: 'smile-plus', ms: 1400, how: { free: 1 }, armL: Array.from({ length: 9 }, (_, i) => [0.06 + i * 0.1, { r: i % 2 ? 40 : 66 }, 'io']), armR: Array.from({ length: 9 }, (_, i) => [0.06 + i * 0.1, { r: i % 2 ? -40 : -66 }, 'io']), root: Array.from({ length: 9 }, (_, i) => [0.06 + i * 0.1, { sy: i % 2 ? 0.99 : 1.01 }, 'io']), head: [[0.2, { r: -3 }, 'io'], [0.6, { r: 3 }, 'io'], [0.92, {}]] },
  bow: { name: 'Bow', icon: 'crown', ms: 1500, how: { free: 1 }, up: [[0.3, { r: 0, y: 6, sy: 0.82 }, 'io'], [0.62, { y: 6, sy: 0.82 }, 'io'], [0.86, {}]], head: [[0.3, { y: 8, s: 0.96 }, 'io'], [0.62, { y: 8, s: 0.96 }, 'io'], [0.86, {}]], armL: [[0.3, { r: 26 }, 'io'], [0.62, { r: 26 }, 'io'], [0.86, {}]], armR: [[0.3, { r: -26 }, 'io'], [0.62, { r: -26 }, 'io'], [0.86, {}]] },
  shrug: { name: 'Shrug', icon: 'circle-help', ms: 1300, how: { free: 1 }, up: [[0.3, { y: -2 }, 's'], [0.7, { y: -2 }, 'io'], [0.9, {}]], armL: [[0.3, { r: 52 }, 's'], [0.7, { r: 52 }, 'io'], [0.9, {}]], armR: [[0.3, { r: -52 }, 's'], [0.7, { r: -52 }, 'io'], [0.9, {}]], head: [[0.3, { r: 10 }, 's'], [0.7, { r: 10 }, 'io'], [0.9, {}]] },
  sit: { name: 'Sit down', icon: 'armchair', ms: 700, how: { free: 1 }, hold: true, root: [[0.6, { y: 15 }, 'o'], [1, { y: 15 }]], legL: [[0.6, { r: 62 }, 'o'], [1, { r: 62 }]], legR: [[0.6, { r: -62 }, 'o'], [1, { r: -62 }]], armL: [[0.6, { r: 14 }, 'o'], [1, { r: 14 }]], armR: [[0.6, { r: -14 }, 'o'], [1, { r: -14 }]] },
  dance: { name: 'Dance', icon: 'music', ms: 2200, how: { treats: 5, coins: 40 }, root: Array.from({ length: 12 }, (_, i) => [0.04 + i * 0.077, { x: [-5, 0, 5, 0][i % 4], y: i % 2 ? 1 : -4, sy: i % 2 ? 0.95 : 1.03, r: [-5, 0, 5, 0][i % 4] }, 'io']), armL: Array.from({ length: 12 }, (_, i) => [0.04 + i * 0.077, { r: [130, 30, 60, 30][i % 4] }, 'io']), armR: Array.from({ length: 12 }, (_, i) => [0.04 + i * 0.077, { r: [-60, -30, -130, -30][i % 4] }, 'io']), head: Array.from({ length: 12 }, (_, i) => [0.04 + i * 0.077, { r: [6, 0, -6, 0][i % 4] }, 'io']), legL: Array.from({ length: 12 }, (_, i) => [0.04 + i * 0.077, { sy: i % 4 === 0 ? 0.76 : 1 }, 'io']), legR: Array.from({ length: 12 }, (_, i) => [0.04 + i * 0.077, { sy: i % 4 === 2 ? 0.76 : 1 }, 'io']), fx: 'note' },
  twirl: { name: 'Twirl', icon: 'rotate-ccw', ms: 1400, how: { treats: 6, coins: 50 }, root: [[0.08, { sy: 0.92, sx: 1.05 }, 'i'], [0.22, { sx: 0.05, y: -5 }, 'l'], [0.34, { sx: -1, y: -8 }, 'l'], [0.46, { sx: 0.05, y: -8 }, 'l'], [0.58, { sx: 1, y: -6 }, 'l'], [0.68, { sx: 0.05, y: -3 }, 'l'], [0.76, { sx: -1 }, 'l'], [0.84, { sx: 0.05 }, 'l'], [0.93, { sx: 1.08, sy: 0.94 }, 'o'], [1, {}]], armL: [[0.2, { r: 100 }, 'o'], [0.88, { r: 100 }, 'io'], [1, {}]], armR: [[0.2, { r: -100 }, 'o'], [0.88, { r: -100 }, 'io'], [1, {}]] },
  backflip: { name: 'Backflip', icon: 'sparkles', ms: 1300, how: { coins: 220 }, org: 34, root: [[0.14, { y: 3, sy: 0.82, sx: 1.12 }, 'i'], [0.24, { y: -16, sy: 1.1, r: -30 }, 'l'], [0.46, { y: -42, r: -190 }, 'l'], [0.66, { y: -14, r: -330 }, 'i'], [0.74, { y: 2, r: -360, sy: 0.8, sx: 1.14 }, 'o'], [0.88, { r: -360, sy: 1.03 }, 'io'], [1, { r: -360 }]], armL: [[0.2, { r: 150 }, 'o'], [0.7, { r: 150 }, 'io'], [0.9, {}]], armR: [[0.2, { r: -150 }, 'o'], [0.7, { r: -150 }, 'io'], [0.9, {}]], fx: 'spark' },
  waltz: { name: 'Waltz', icon: 'music', ms: 2600, how: { craft: 'music-box' }, root: Array.from({ length: 10 }, (_, i) => [0.05 + i * 0.09, { x: Math.round(Math.sin(i * 0.9) * 12), y: i % 3 ? 0 : -3, sx: Math.cos(i * 0.9) > 0 ? 1 : -1, r: Math.round(Math.sin(i * 0.9) * 4) }, 'l']), armL: [[0.1, { r: 96 }, 'io'], [0.9, { r: 96 }, 'io'], [1, {}]], armR: [[0.1, { r: -96 }, 'io'], [0.9, { r: -96 }, 'io'], [1, {}]], head: Array.from({ length: 10 }, (_, i) => [0.05 + i * 0.09, { r: Math.round(Math.sin(i * 0.9 + 1) * 6) }, 'io']), fx: 'note' },
  jazz: { name: 'Jazz hands', icon: 'sparkles', ms: 1400, how: { craft: 'jazz-hands' }, root: [[0.1, { y: 2, sy: 0.88, sx: 1.08 }, 'i'], [0.24, { y: -10, sy: 1.06 }, 'b'], [0.72, { y: -8 }, 'i'], [0.86, { y: 1, sy: 0.92, sx: 1.06 }, 'o'], [1, {}]], armL: Array.from({ length: 6 }, (_, i) => [0.22 + i * 0.09, { r: i % 2 ? 118 : 132 }, 'l']), armR: Array.from({ length: 6 }, (_, i) => [0.22 + i * 0.09, { r: i % 2 ? -118 : -132 }, 'l']), fx: 'spark' },
  startled: { name: 'Startled', icon: 'zap', ms: 900, how: { hidden: 1 }, root: [[0.08, { y: 1, sy: 0.92 }, 'l'], [0.14, { y: -18, sy: 1.14, sx: 0.92 }, 'o'], [0.4, { y: -20 }, 'i'], [0.56, { y: 1, sy: 0.86, sx: 1.1 }, 'o'], [0.74, { sy: 1.03 }, 'io']], armL: [[0.14, { r: 120 }, 'o'], [0.5, { r: 110 }, 'o'], [0.8, {}]], armR: [[0.14, { r: -120 }, 'o'], [0.5, { r: -110 }, 'o'], [0.8, {}]] },
});
const _pe = { H: null, wheel: null, hold: false };
function _pePad() { try { return profileGet().avatar; } catch (e) { return null; } }
function gartEmoteOwned(id) {
  const e = GART_EMOTES[id]; if (!e || e.how.hidden) return false;
  if (e.how.free) return true;
  if (e.how.craft) { try { return gardenCraftOwned(e.how.craft) > 0; } catch (x) { return false; } }
  const p = _ptS(); return !!(p.buy && p.buy['emote:' + id]);
}
function gartEmoteBuy(id, pay) {
  const e = GART_EMOTES[id], p = _ptcS(); if (!e) return { ok: false, why: 'unknown' };
  if (gartEmoteOwned(id)) return { ok: true, already: true };
  const via = pay || (e.how.treats ? 'treats' : 'coins'), buy = _ptcMap(p, 'buy'), key = 'emote:' + id, today = _ptToday();
  if (via === 'treats' && e.how.treats) { if (petTreats().have < e.how.treats) return { ok: false, why: 'treats', need: e.how.treats }; buy[key] = { d: today, t: e.how.treats }; }
  else if (via === 'coins' && e.how.coins) { const led = _ptcSpendCoins(e.how.coins); if (!led) return { ok: false, why: 'coins', need: e.how.coins }; buy[key] = { d: today, c: e.how.coins, led }; }
  else return { ok: false, why: e.how.craft ? 'craft' : 'unknown' };
  if (typeof saveUI === 'function') saveUI();
  return { ok: true };
}
function _peCompile(row) {
  const out = [];
  for (const part of Object.keys(_PE_SEL)) {
    const keys = row[part]; if (!keys) continue;
    const lift = part === 'root' ? (row.org || 0) : 0, T = _pcTidy(keys);
    out.push([part, T.map((k, i) => { const P = k[1], s = P.s == null ? 1 : P.s, sx = (P.sx == null ? 1 : P.sx) * s, sy = (P.sy == null ? 1 : P.sy) * s; const f = { offset: k[0], transform: `translate(${_pcN(P.x || 0)}px,${_pcN((P.y || 0) - lift)}px) rotate(${_pcN(P.r || 0)}deg) scale(${_pcN(sx)},${_pcN(sy)}) translate(0px,${_pcN(lift)}px)` }; if (i < T.length - 1) f.easing = _PC_EASE[k[2] || 'io'] || _PC_EASE.io; return f; })]);
  }
  return out;
}
const _peCache = new Map();
function gartEmoteStop() {
  if (!_pe.H) return;
  const H = _pe.H; _pe.H = null; _pe.hold = false;
  for (const a of H.anims) { try { a.cancel(); } catch (e) { /* gone */ } }
  for (const t of H.timers) clearTimeout(t);
  if (H.seat) _gw.bobTf = 'x';   // (the walker puts it back next frame)
  if (H.node) H.node.classList.remove('gpl-emote');
}
/** Strike it. The figure turns to face you first. */
/** On a seat the legs hang down; sprawled out is for the grass. */
function _peOnSeat() { return { ...GART_EMOTES.sit, legL: [[0.6, { r: 7 }, 'o'], [1, { r: 7 }]], legR: [[0.6, { r: -7 }, 'o'], [1, { r: -7 }]] }; }
function gartEmoteRun(id, o) {
  o = o || {};
  const row = o.seat ? _peOnSeat() : GART_EMOTES[id]; if (!row) return false;
  if (typeof _gw === 'undefined' || !_gw.on || !_gw.node) return false;
  if (!o.quiet && typeof gardenLiveEmoted === 'function') gardenLiveEmoted(id);   // friends here see it
  if (_gw.moving && !o.quiet) { _gw.path = []; _gw.then = null; }
  gartEmoteStop();
  // face front, in the plain idle drawing
  if (typeof _GPL !== 'undefined') { _GPL.dir = 's'; _GPL.pose = ''; }
  try { if (typeof _gwBody === 'function') _gwBody(); } catch (e) { /* no walker */ }
  const node = _gw.node.querySelector('.gpl'); if (!node) return false;
  const ck = o.seat ? 'on-seat' : id; let comp = _peCache.get(ck); if (!comp) { comp = _peCompile(row); _peCache.set(ck, comp); }
  const motion = _ptMotionOk() && _ptFun() !== 'off', anims = [], timers = [];
  node.classList.add('gpl-emote');
  for (const [part, frames] of comp) for (const el of node.querySelectorAll(_PE_SEL[part])) {
    try { const a = el.animate(frames, { duration: row.ms, fill: row.hold ? 'forwards' : 'none', easing: 'linear' }); if (!motion) { a.pause(); a.currentTime = row.ms * (row.hold ? 1 : 0.5); } anims.push(a); } catch (e) { /* an old browser */ }
  }
  const H = { anims, timers, node };
  // on a seat the figure is raised to it (the walker leaves this transform alone while you stand still)
  if (o.seat && o.seat.top && _gw.node) { const bob = _gw.node.querySelector('.gd-pl-bob'); if (bob) { bob.setAttribute('transform', `translate(0 ${-(o.seat.top.lift + 2)})`); _gw.bobTf = ''; H.seat = true; } }
  _pe.H = H; _pe.hold = !!row.hold;
  if (row.fx && motion && !o.quiet) { const sp = row.fx === 'note' ? ['note', '#5a4ad0'] : ['spark', '#ffe680']; for (let i = 0; i < 5; i++) timers.push(setTimeout(() => { try { const q = _gw.node.querySelector('.gd-pl-in'); if (q) _pcSprite(q, sp[0], sp[1], { top: { x: i % 2 ? 12 : -12, y: -74 } }, { at: 'top', dur: 900, dx: i % 2 ? 12 : -12, dy: -26, s: 2 }, i); } catch (e) { /* fine */ } }, i * row.ms / 6)); }
  if (!row.hold) timers.push(setTimeout(() => { if (_pe.H === H) gartEmoteStop(); }, motion ? row.ms : 1200));
  return true;
}
/** Sitting: on the nearest seat if there is one close by, else right here. */
function _peSit() {
  try {
    const seats = gardenWorldObjects().filter(o => o.kind === 'decor' && gardenDecor(o.id) && gardenDecor(o.id).effect && gardenDecor(o.id).effect.kind === 'sit');
    let best = null, bd = 6;
    for (const s of seats) { const d = Math.hypot(s.top.x - _gw.px, s.top.y - _gw.py); if (d < bd) { bd = d; best = s; } }
    if (best) { const near = { x: best.top.x, y: best.top.y + 0.35 }; if (gardenWalkToPoint(near, () => gartEmoteRun('sit', { seat: best }), { radius: 1.2 })) return; }
  } catch (e) { /* here will do */ }
  gartEmoteRun('sit');
}
/* ---------- the wheel ---------- */
const _PE_ORDER = Object.freeze(['wave', 'cheer', 'clap', 'sit', 'bow', 'shrug', 'dance', 'twirl', 'backflip', 'waltz', 'jazz']);
function gartEmoteWheel(force) {
  if (_pe.wheel && force !== true) { _pe.wheel.remove(); _pe.wheel = null; document.removeEventListener('pointerdown', _peOutside, true); return; }
  const box = _gw && _gw.box; if (!box) return;
  if (_pe.wheel) _pe.wheel.remove();
  const w = _ptEl('div', 'pew'); w.setAttribute('role', 'menu'); w.setAttribute('aria-label', 'Moves');
  const ids = _PE_ORDER.filter(id => GART_EMOTES[id]), n = ids.length, R = 132;
  ids.forEach((id, i) => {
    const e = GART_EMOTES[id], own = gartEmoteOwned(id), a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const want = own ? '' : e.how.craft ? 'made at the crafting bench' : e.how.treats ? `${e.how.treats} treats` : e.how.coins ? `${e.how.coins} coins` : '';
    const b = _ptEl('button', 'pew-b' + (own ? '' : ' is-locked')); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.setAttribute('data-tip', want ? `${e.name}: ${want}` : e.name); b.setAttribute('aria-label', want ? `${e.name}: ${want}` : e.name);
    b.style.setProperty('--x', Math.round(Math.cos(a) * R) + 'px'); b.style.setProperty('--y', Math.round(Math.sin(a) * R) + 'px'); b.style.setProperty('--i', i);
    // its own picture and its name, always; a locked one is dimmed, with what it wants underneath
    b.innerHTML = `${icon(e.icon)}<span class="pew-n">${esc(e.name)}</span>`;
    if (!own) { const cost = e.how.treats ? ['treats', e.how.treats] : e.how.coins ? ['coins', e.how.coins] : null; if (cost) b.appendChild(_ptCostIcon(cost[0], cost[1], 13)); else if (e.how.craft) { const k = _ptEl('span', 'ptl-cost'); k.innerHTML = icon('hammer', 'i-xs'); b.appendChild(k); } }
    b.onclick = () => {
      if (!own) {
        if (e.how.craft) { gartEmoteWheel(); if (typeof gardenPopupOpen === 'function') gardenPopupOpen('craft'); return; }   // the way to get it: the bench
        const r = gartEmoteBuy(id);
        if (!r.ok) { gameDeny(b, { kind: r.why === 'coins' ? 'coins' : '', badge: r.need, say: 'Not enough ' + r.why }); return; }
        gameCheer(b, { text: 'New!', tone: 'gold', sound: true });
      }
      gartEmoteWheel();
      if (id === 'sit') _peSit(); else gartEmoteRun(id);
    };
    w.appendChild(b);
  });
  box.appendChild(w);
  _pe.wheel = w;
  // stand it above the gardener
  try { const m = _gw.node.getScreenCTM(), r = box.getBoundingClientRect(); w.style.left = Math.max(150, Math.min(r.width - 150, m.e - r.left)) + 'px'; w.style.top = Math.max(150, Math.min(r.height - 150, m.f - r.top - 40)) + 'px'; } catch (e) { w.style.left = '50%'; w.style.top = '50%'; }
  document.addEventListener('pointerdown', _peOutside, true);
}
function _peOutside(ev) { if (_pe.wheel && !_pe.wheel.contains(ev.target) && !(ev.target.closest && ev.target.closest('[data-quick="emote"]'))) gartEmoteWheel(); }
/** The walker tells us it moved: sitting ends. */
function gartEmoteMoved() { if (_pe.hold) gartEmoteStop(); }
