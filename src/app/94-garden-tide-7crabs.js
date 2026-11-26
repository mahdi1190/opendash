/* ============================================================
   CRAB RACES (FUN-ROADMAP phase 2, theme A). At any rock pool at low water (94-garden-tide-2rocks.js), "Race the crabs": four crabs
   at the start of a track scratched in the clear sand beside the pool, a lane each. Pick yours: each has its way (quick off the mark
   and then puffed; sleepy, with naps and a burst; one that goes its own way, sometimes backwards; a show-off who stops to wave its claws
   when it is ahead). About eight seconds. Cheer on the beat (E, Space or a click on "Cheer!"): on the beat it puts on a spurt; cheer
   too much and it stops to wave its claws at you. Alone, the other lanes are the villagers' crabs. Stake a shell for fun: the winner
   keeps the shells.
   With friends, live: the host runs the race (tide|race, tide|rstate a few times a second, tide|rend); a guest near the pool picks a
   crab (tide|rpick) and cheers it on (tide|cheer). Each screen gives its own reward.
   Rewards: a win, 8 coins (the first win of each low water); the first win ever, a shore rosette for your garden and a line in the
   journal; five wins, the crab race cup. Saved: g.wd.tdr (wins), g.led['tdr.<w>'] a low water's win, g.disc['td.race'].
   ============================================================ */
const GT_CRABS = Object.freeze([
  Object.freeze({ id: 'quick', name: 'Nipper', how: 'quick off the mark', c: '#5f7a3a', c2: '#3f5428', c3: '#9aae5a' }),
  Object.freeze({ id: 'sleepy', name: 'Dozy', how: 'sleepy, then sudden', c: '#c8563a', c2: '#8a3422', c3: '#e8906a' }),
  Object.freeze({ id: 'wrong', name: 'Sidle', how: 'goes its own way', c: '#d89a3a', c2: '#9a6a1e', c3: '#f0c870' }),
  Object.freeze({ id: 'show', name: 'Strut', how: 'a bit of a show-off', c: '#6a6a9a', c2: '#44446a', c3: '#a0a0cc' }),
]);
const GT_RACE = Object.freeze({ lenPx: 120, laneW: 10, beat: 0.9, win: 0.2, pickMs: 5000, coins: 8, cup: 5, cupDecor: 'crab-cup', rosette: 'shore-rosette' });
const _gtcr = { R: null, tracks: new Map(), el: null, tok: 0, heard: null };

/* ---------- the track: clear sand beside a pool, along the shore, by rule ---------- */
/** Four lanes scratched in clear sand beside the pool, running along the shore (the way the beach runs there), above the water now:
 *  {ox, oy (the start, world px), ux, uy (along), vx, vy (across the lanes), L, LW, angle, stand (cells), deg (to face it), pool} or null. */
function gardenTideRaceTrack(p, T) {
  const key = p.id + '|' + (T.level < .2 ? 0 : 1), was = _gtcr.tracks.get(key); if (was !== undefined) return was;
  const W = GARDEN_WORLD, P = { x: p.x * W.cellW, y: W.sky + p.y * W.cellH };
  let sx = (Number.isFinite(p.sx) ? p.sx : 0) * W.cellW, sy = (Number.isFinite(p.sy) ? p.sy : 1) * W.cellH; const sl = Math.hypot(sx, sy) || 1; sx /= sl; sy /= sl;   // (towards the sea)
  let ax = -sy, ay = sx; if (ax < 0 || (Math.abs(ax) < .2 && ay < 0)) { ax = -ax; ay = -ay; }   // (along the shore, left to right on the screen)
  const L = GT_RACE.lenPx, LW = GT_RACE.laneW * 4, clearR = (p.rx || 22) * 1.9 + 8;
  const cell = (x, y) => ({ x: x / W.cellW, y: (y - W.sky) / W.cellH });
  // (a sample on a path, a standing thing, the pool's rock or the sea never; up to two on the grass at the top of the beach)
  const open = (x, y) => { const q = cell(x, y), c = gardenIslandBaseCell(q.x, q.y); if (!c || !c.land || c.freshwater) return 2; const h = gardenTideH(q.x, q.y); if (Number.isFinite(h) && h < T.line + 3) return 2; if (_gtdCrowded(q.x, q.y) || Math.hypot(x - P.x, (y - P.y) * 1.6) < clearR) return 2; return Number.isFinite(h) || c.beach ? 0 : 1; };
  let out = null;
  // straight across the screen if there is room (the lanes one under another: the easiest race to follow), else along the shore
  for (const [ux, uy] of [[1, 0], [ax, ay]]) {
  const vx = -uy, vy = ux;
  for (const along of [clearR + 6, -clearR - 6 - L, -L / 2, -L / 2 + 40, -L / 2 - 40]) {
    for (const across of [-LW - 24, 20, -LW - 40, 34, -LW / 2 - 52, 52, -LW - 64, 66, -LW / 2 - 80, 80]) {
      const ox = P.x + ux * along + vx * across, oy = P.y + uy * along + vy * across;
      let bad = 0, worse = false; for (let i = 0; i <= 6 && !worse && bad <= 2; i++) for (const f of [.15, .85]) { const r = open(ox + ux * L * i / 6 + vx * LW * f, oy + uy * L * i / 6 + vy * LW * f); if (r === 2) { worse = true; break; } bad += r; }
      if (worse || bad > 2) continue;
      try { let hit = false; for (const st of gardenTideStones()) { const d = (st.x * W.cellW - ox) * ux + (W.sky + st.y * W.cellH - oy) * uy, e = (st.x * W.cellW - ox) * vx + (W.sky + st.y * W.cellH - oy) * vy; if (d > -14 && d < L + 14 && e > -10 && e < LW + 10) hit = true; } if (hit) continue; } catch (e) { /* no stones */ }
      // where to stand: beside the middle of the track, on the side that is clear (the drier, if both), facing it
      const mx = ox + ux * L / 2 + vx * LW / 2, my = oy + uy * L / 2 + vy * LW / 2;
      let stand = null, best = -Infinity;
      for (const sg of [-1, 1]) { const d = LW / 2 + 20, x = mx + vx * d * sg, y = my + vy * d * sg, q = cell(x, y); if (typeof _gwFree === 'function' && !_gwFree(q.x, q.y)) continue; const h = gardenTideH(q.x, q.y), score = Number.isFinite(h) ? h : 200; if (score > best) { best = score; stand = { x: Math.round(q.x * 100) / 100, y: Math.round(q.y * 100) / 100 }; } }
      if (!stand) continue;
      const S = { x: stand.x * W.cellW, y: W.sky + stand.y * W.cellH };
      out = Object.freeze({ ox, oy, ux, uy, vx, vy, L, LW, angle: Math.atan2(uy, ux), stand, deg: Math.round(Math.atan2(my - S.y, mx - S.x) * 180 / Math.PI), pool: p.id, mid: cell(mx, my) });
      break;
    }
    if (out) break;
  }
  if (out) break;
  }
  if (_gtcr.tracks.size > 60) _gtcr.tracks.clear();
  _gtcr.tracks.set(key, out); return out;
}
/** Where a crab is on the track (cells): s its way along (0 to 1), i its lane. */
function _gtrAt(tr, s, i) { const W = GARDEN_WORLD, a = 10 + s * (tr.L - 20), b = (i + .5) * tr.LW / 4, x = tr.ox + tr.ux * a + tr.vx * b, y = tr.oy + tr.uy * a + tr.vy * b; return { x: x / W.cellW, y: (y - W.sky) / W.cellH, px: x, py: y }; }
function gardenTideRaceRows(px, py, T) {
  const out = []; if (T.level > .45 || _gtcr.R) return out;
  for (const p of gardenTidePools()) {
    if (Math.hypot(p.x - px, (p.y - py) * 1.3) > 6) continue;
    const h = gardenTideH(p.x, p.y); if (!(Number.isFinite(h) && h > T.line + 3)) continue;
    const tr = gardenTideRaceTrack(p, T); if (!tr) continue;
    if (Math.hypot(p.x - px, (p.y - py) * 1.3) > 2.6 && Math.hypot(tr.mid.x - px, (tr.mid.y - py) * 1.3) > 2.4) continue;   // (by the pool, or by its track)
    out.push({ key: 'tide:race:' + p.id, act: 'cheer', tide: { kind: 'race', pool: p.id }, words: 'Race the crabs', name: 'the crab race', x: p.x, y: p.y, stand: tr.stand, pri: .25 });
  }
  return out;
}

/* ---------- picking a crab ---------- */
function gardenTideRaceRun(spot) {
  const p = gardenTidePools().find(q => q.id === spot.tide.pool), T = gardenTideNow(); if (!p) return false;
  const tr = gardenTideRaceTrack(p, T); if (!tr) return false;
  if (gardenShoreLive() === 'guest') { gardenShoreSay('Your host runs the races here: ask them to start one, and you can pick a crab.'); return true; }
  const shell = typeof _gtkShell === 'function' ? _gtkShell() : null, rival = _gtrRivals();
  const pick = (k, stake) => { wdTalkClose(true); _gtrStart(p, tr, k, stake ? shell : null); };
  const acts = GT_CRABS.map((c, k) => ({ label: `${c.name} (${c.how})`, primary: k === 0, run: (Tk) => {
    if (!shell) { pick(k, false); return; }
    Tk.say(`${c.name} it is. Stake ${/^[aeiou]/i.test(shell.name) ? 'an' : 'a'} ${shell.name.toLowerCase()} on it? The winner keeps the shells.`, [{ label: 'Stake a shell', primary: true, run: () => pick(k, true) }, { label: 'Just for fun', run: () => pick(k, false) }]);
  } }));
  wdTalk({ name: 'The crab race', art: _gtrCrabSvg(GT_CRABS[0]), lines: [`Four crabs from the pool are waiting at the start, a lane each, scratched in the sand. ${rival.map(gardenShoreFolkName).slice(0, 3).join(', ')} have the other lanes. Which one is yours?`], actions: acts, at: { x: p.x, y: p.y }, bye: 'Not now' });
  return true;
}
/** The day's villagers with a crab in the race (the other lanes). */
function _gtrRivals() { const r = gardenRand(gardenHash('tide-race-folk|' + _gdToday())), list = GT_SHORE_FOLK.slice(); for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; }

/* ---------- the race ---------- */
/** Each crab's speed now (track lengths a second) by its way, its time and its state. */
function _gtrPace(cr, t, rnd) {
  const base = cr.base;
  switch (cr.kind) {
    case 'quick': return base * (t < 2.2 ? 1.5 : t > 5 ? .8 : 1);
    case 'sleepy': return cr.nap > 0 ? 0 : base * (cr.burst > 0 ? 1.6 : 1);
    case 'wrong': return cr.back > 0 ? -base * .6 : base * 1.08;
    default: return base * (rnd < .5 ? 1.02 : .98);
  }
}
function _gtrStart(p, tr, k, stakeShell) {
  const seed = gardenHash('tide-race|' + p.id + '|' + Date.now()) % 1000, r = gardenRand(seed + 17), rivals = _gtrRivals();   // clock-ok: luck
  const crabs = GT_CRABS.map((c, i) => ({ i, kind: c.id, base: .118 + r() * .022, s: 0, v: 0, nap: 0, burst: 0, back: 0, wave: 0, naps: c.id === 'sleepy' ? [1.2 + r() * 1.8, 3.6 + r() * 2.2] : [], who: i === k ? 'me' : rivals[i % rivals.length] }));
  const R = _gtcr.R = { p, tr, seed, r, crabs, me: k, t: -3.2, beat0: 0, presses: [], stake: stakeShell, done: false, guests: new Map(), live: gardenShoreLive() === 'host', lastTell: 0, picked: false };
  if (stakeShell) { _gdLed('tf', { i: { ['sh:' + stakeShell.id]: -1 }, n: 1 }); _gdSaveQuiet(); }
  if (R.live) { try { gardenLiveFx('tide', 'race', { n: seed || 1, i: p.id, v: 'h' + k }); } catch (e) { /* alone */ } R.t = -GT_RACE.pickMs / 1000 - 3.2; gardenShoreSay('A crab race! Friends near the pool can pick a crab.', 'flag', 4500); }
  // stand at the side of the track, crouched to watch (you face it), and the Cheer button comes up
  _gtcDo('cheer', { key: 'tide:race-go', name: 'the crab race', x: tr.mid.x, y: tr.mid.y, stand: tr.stand, deg: tr.deg }, () => {}, .1);
  _gtrCheerButton(true);
}
function _gtrStep(dt) {
  const R = _gtcr.R; if (!R || R.done || R.remote) return;
  const before = R.t; R.t += dt;
  if (before < -2 && R.t >= -2) gardenShoreFloat(R.tr.mid.x, R.tr.mid.y - .5, 'Ready…');
  if (before < -1 && R.t >= -1) gardenShoreFloat(R.tr.mid.x, R.tr.mid.y - .5, 'Steady…');
  if (before < 0 && R.t >= 0) { gardenShoreFloat(R.tr.mid.x, R.tr.mid.y - .5, 'Go!', { color: '#ffe08a' }); R.beat0 = performance.now(); try { gardenSfx('pat'); } catch (e) { /* quiet */ } }
  if (R.t < 0) return;
  for (const c of R.crabs) {
    if (c.wave > 0) { c.wave -= dt; continue; }
    if (c.kind === 'sleepy') { for (let j = 0; j < c.naps.length; j++) if (c.naps[j] > 0 && R.t >= c.naps[j]) { c.naps[j] = -1; c.nap = .7 + R.r() * .6; } if (c.nap > 0) { c.nap -= dt; if (c.nap <= 0) c.burst = 1.1; } else if (c.burst > 0) c.burst -= dt; }
    if (c.kind === 'wrong') { if (c.back > 0) c.back -= dt; else if (R.r() < dt * .32 && R.t > 1) c.back = .45 + R.r() * .3; }
    if (c.kind === 'show') { let other = 0; for (const q of R.crabs) if (q !== c && q.s > other) other = q.s; if (c.s - other > .09 && !c.showed && c.s > .55) { c.showed = true; c.wave = .8; continue; } }
    let v = _gtrPace(c, R.t, R.r());
    if (c.who !== 'me' && !String(c.who).startsWith('g')) { if (R.r() < dt * .7) c.spurt = .4; }   // (a villager's crab gets a bit of luck now and then)
    if (c.spurt > 0) { c.spurt -= dt; v *= 1.55; }
    c.s = Math.max(0, Math.min(1, c.s + v * dt)); c.v = v;
  }
  if (R.live && performance.now() - R.lastTell > 330) { R.lastTell = performance.now(); _gtrTell('rstate'); }
  let lead = R.crabs[0]; for (const c of R.crabs) if (c.s > lead.s) lead = c;   // (no lists made each frame)
  if (lead.s >= 1 || R.t > 22) _gtrEnd(lead.i);
}
/** A cheer: on the beat, a spurt; off it, a puzzled look; too many, it stops to wave its claws. */
function _gtrCheer(slot) {
  const R = _gtcr.R; if (!R || R.done || R.t < 0) return;
  const c = R.crabs[slot]; if (!c || c.wave > 0) return;
  const now = performance.now(), ph = ((now - R.beat0) / 1000) % GT_RACE.beat, off = Math.min(ph, GT_RACE.beat - ph);
  c.presses = (c.presses || []).filter(t => now - t < 1600); c.presses.push(now);
  const mine = slot === R.me, at = _gtrAt(R.tr, c.s, c.i);
  if (c.presses.length > 3) { c.wave = .9; c.presses.length = 0; if (mine) gardenShoreFloat(at.x, at.y - .6, 'Too much! It waves its claws at you.'); return; }
  if (off <= GT_RACE.win) { c.spurt = .55; if (mine) gardenShoreFloat(at.x, at.y - .5, ['Go on!', 'That’s it!', 'Go, go!'][c.presses.length % 3], { color: '#ffe08a' }); }
  else if (mine) gardenShoreFloat(at.x, at.y - .5, 'Hm?');
}
function _gtrEnd(winner) {
  const R = _gtcr.R; if (!R || R.done) return;
  R.done = true; R.winner = winner; R.endAt = performance.now();
  if (R.live) _gtrTell('rend');
  _gtrCheerButton(false);
  setTimeout(() => { try { if (typeof _ga !== 'undefined' && _ga.cur && _ga.cur.id === 'cheer') gartActStop(true); } catch (e) { /* fine */ } }, 1800);
  _gtrResult(winner === R.me, R.crabs[winner], R.stake);
  setTimeout(() => { if (_gtcr.R === R) _gtcr.R = null; }, 9000);
}
/** The end, on your own screen: the line, the stake, the prize. */
function _gtrResult(won, wc, stake) {
  const R = _gtcr.R, rival = !wc || !wc.who || wc.who === 'me' ? '' : wc.who === 'host' ? (R && R.hostName) || 'Your friend' : String(wc.who).startsWith('g') ? 'A friend' : gardenShoreFolkName(wc.who);
  const T = gardenTideNow(), g = _gdG();
  if (won) {
    const n = (Number(g.wd.tdr) || 0) + 1; g.wd.tdr = n; _wdSave();
    const first = !g.disc['td.race']; if (first) g.disc['td.race'] = _gdToday();
    const gift = { c: 0, x: 3, i: {} };
    if (!g.led['tdr.' + T.w]) gift.c = GT_RACE.coins;
    if (first) gift.i['decor:' + GT_RACE.rosette] = 1;
    if (n === GT_RACE.cup) gift.i['decor:' + GT_RACE.cupDecor] = 1;
    if (stake) { gift.i['sh:' + stake.id] = 1; for (let k = 0; k < 3; k++) { const f = gardenTideFindPick(k === 2 ? 2 : 1, gardenRand(gardenHash('tide-stake|' + T.w + '|' + k + '|' + n)), 0, false); if (f && f.what === 'shell') gift.i['sh:' + f.id] = (gift.i['sh:' + f.id] || 0) + 1; } }
    gardenShoreGive(g.led['tdr.' + T.w] ? 'tdr.' + T.w + '.' + n : 'tdr.' + T.w, gift);
    const words = gardenShoreGiftWords(gift);
    gardenShoreSay(`Your crab wins! It scuttles over the line and straight back into the pool.${words ? ' ' + words.charAt(0).toUpperCase() + words.slice(1) + '.' : ''}`, 'trophy', 7000);
    if (first) setTimeout(() => { try { gardenToast('New in your journal: your first crab race won. A shore rosette for your garden.', { icon: 'book-open' }); } catch (e) { /* fine */ } }, 3200);
    if (n === GT_RACE.cup) setTimeout(() => { try { gardenToast('Five races won: the crab race cup is yours, to stand in your garden.', { icon: 'trophy', timeout: 6500 }); } catch (e) { /* fine */ } }, 4800);
    try { gardenSfx('cheer'); } catch (e) { /* quiet */ }
  } else {
    const lines = rival ? [`${rival}’s crab wins by a claw. ${rival} looks very pleased about it.`, `${rival}’s crab gets there first, and does a little sideways dance.`] : ['Another crab gets there first. Yours stops to look at a shell.'];
    gardenShoreSay(lines[gardenHash('tide-lose|' + Date.now()) % lines.length] + (stake ? ' Your shell goes to the winner.' : ''), 'flag', 6000);   // clock-ok: which line
  }
  gardenShoreEmit('race', { won: !!won });
}

/* ---------- the Cheer! button ---------- */
function _gtrCheerButton(on) {
  const box = typeof _gw !== 'undefined' && _gw.box;
  if (!on || !box) { if (_gtcr.el) { if (_gtcr.el.parentNode) _gtcr.el.parentNode.classList.remove('gt-quick-on'); _gtcr.el.remove(); _gtcr.el = null; } if (_gtcr.off) { _gtcr.off(); _gtcr.off = null; } return; }
  _gtrCheerButton(false);
  const el = document.createElement('button'); el.type = 'button'; el.className = 'ga-prompt gt-quick gt-cheer'; el.innerHTML = '<kbd>E</kbd><span>Cheer!</span><i class="gt-beat" aria-hidden="true"></i>'; el.setAttribute('aria-label', 'Cheer your crab on (E or Space), on the beat');
  if (!document.getElementById('gt-quick-css')) { const css = document.createElement('style'); css.id = 'gt-quick-css'; css.textContent = '.gt-quick-on .ga-prompt:not(.gt-quick),.gt-quick-on .ga-choose{visibility:hidden}.gt-quick{z-index:7}'; document.head.appendChild(css); }
  if (!document.getElementById('gt-cheer-css')) { const css = document.createElement('style'); css.id = 'gt-cheer-css'; css.textContent = '.gt-cheer{position:absolute}.gt-cheer .gt-beat{position:absolute;inset:-5px;border-radius:999px;border:2px solid rgba(255,224,138,.95);opacity:0;pointer-events:none}.gt-cheer.is-beat .gt-beat{animation:gtbeat .34s ease-out}@keyframes gtbeat{0%{opacity:.95;transform:scale(.92)}100%{opacity:0;transform:scale(1.18)}}@media (prefers-reduced-motion:reduce){.gt-cheer.is-beat .gt-beat{animation:none;opacity:.8}}'; document.head.appendChild(css); }
  box.appendChild(el); box.classList.add('gt-quick-on'); _gtcr.el = el;
  const go = (ev) => { if (ev && ev.type === 'keydown' && !(ev.key === 'e' || ev.key === 'E' || ev.key === ' ')) return; const R = _gtcr.R; if (!R) return; if (ev) { ev.preventDefault(); ev.stopPropagation(); } if (R.remote) { try { gardenLiveFx('tide', 'cheer', { n: R.me + 1 }); } catch (e) { /* alone */ } _gtrCheerLocal(R); } else _gtrCheer(R.me); };
  el.addEventListener('click', go); el.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  document.addEventListener('keydown', go, true);
  _gtcr.off = () => document.removeEventListener('keydown', go, true);
}
/** A guest's cheer: the words over their crab at once (the host decides the spurt). */
function _gtrCheerLocal(R) { const c = R.crabs[R.me]; if (!c) return; const at = _gtrAt(R.tr, c.s, c.i); gardenShoreFloat(at.x, at.y - .5, 'Go on!', { color: '#ffe08a' }); }
/** Once a frame from the painter: the race moves, the button keeps its place and beats. */
function _gtrFrame(time, dt) {
  const R = _gtcr.R; if (!R) return;
  if (!R.remote) _gtrStep(dt);
  else if (!R.done) { for (const c of R.crabs) { c.s += (c.to - c.s) * Math.min(1, dt * 6); } }
  const el = _gtcr.el;
  if (el && typeof _ghProject === 'function') {
    const s = _ghProject(_gw.px, _gw.py - 2.3); if (s) el.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(Math.max(s.y, 150))}px) translate(-50%, -100%)`;   // (never under the message strip)
    if (R.t >= 0 && !R.done) { const k = Math.floor((performance.now() - R.beat0) / (GT_RACE.beat * 1000)); if (k !== R.beatK) { R.beatK = k; el.classList.remove('is-beat'); void el.offsetWidth; el.classList.add('is-beat'); } }
  }
  if (!R.done && typeof _gw !== 'undefined' && Math.hypot(_gw.px - R.tr.stand.x, _gw.py - R.tr.stand.y) > 3.5 && R.t > 0) { _gtrCheerButton(false); if (!R.remote) _gtrEnd(R.crabs.slice().sort((a, b) => b.s - a.s)[0].i); }   // (you walked off: it finishes without you)
}

/* ---------- with friends, live: the host runs it ---------- */
function _gtrCode(R) { return R.crabs.map(c => Math.max(0, Math.min(1295, Math.round(c.s * 1000))).toString(36).padStart(2, '0') + (c.wave > 0 ? 'w' : c.nap > 0 ? 'z' : 'r')).join(''); }
function _gtrTell(step) {
  const R = _gtcr.R; if (!R) return;
  try {
    if (step === 'rstate') gardenLiveFx('tide', 'rstate', { n: R.seed || 1, v: _gtrCode(R) });
    else if (step === 'rend') gardenLiveFx('tide', 'rend', { n: R.seed || 1, to: R.winner + 1, v: R.crabs.map(c => c.who === 'me' ? 'h' : String(c.who).startsWith('g') ? c.who : 'v').join('-') });
  } catch (e) { /* alone */ }
}
gardenShoreFxOn('race', (A, ev) => {   // the host started a race: pick a crab while there is time
  if (gardenShoreLive() !== 'guest' || _gtcr.R) return;
  const p = gardenTidePools().find(q => q.id === String(ev.i || '')); if (!p || typeof _gw === 'undefined' || Math.hypot(p.x - _gw.px, p.y - _gw.py) > 12) return;
  const T = gardenTideNow(), tr = gardenTideRaceTrack(p, T); if (!tr) return;
  const host = /^h(\d)$/.exec(String(ev.v || '')), taken = new Set(host ? [Number(host[1])] : []);
  const who = String(A && A.n || 'Your friend').split(/\s+/)[0];
  const R = _gtcr.R = { p, tr, seed: ev.n == null ? 0 : Number(ev.n), crabs: GT_CRABS.map((c, i) => ({ i, kind: c.id, s: 0, to: 0, who: taken.has(i) ? 'host' : 'v' })), me: -1, t: 0, remote: true, done: false, beat0: performance.now(), A, hostName: who };
  wdTalk({ name: 'The crab race', art: _gtrCrabSvg(GT_CRABS[1]), lines: [`${who} is starting a crab race at the pool. Pick a crab, quick!`], actions: GT_CRABS.map((c, k) => ({ label: `${c.name} (${c.how})`, primary: !taken.has(k) && ![...taken].length && k === 0, run: () => { if (_gtcr.R !== R || R.crabs[k].who !== 'v') return; wdTalkClose(true); R.me = k; R.crabs[k].who = 'me'; try { gardenLiveFx('tide', 'rpick', { n: k + 1 }); } catch (e) { /* alone */ } _gtcDo('cheer', { key: 'tide:race-go', name: 'the crab race', x: tr.mid.x, y: tr.mid.y, deg: tr.deg, stand: gardenTideStandFree([-34, 34, -64, 64].map(d => ({ x: tr.stand.x + tr.ux * d / GARDEN_WORLD.cellW, y: tr.stand.y + tr.uy * d / GARDEN_WORLD.cellH })), _gw.px, _gw.py) }, () => {}, .1); _gtrCheerButton(true); } })).filter((a, k) => !taken.has(k)), at: { x: p.x, y: p.y }, bye: 'Just watch' });
  setTimeout(() => { if (_gtcr.R === R && R.me < 0) { try { if (typeof _wd !== 'undefined' && _wd.talk) wdTalkClose(true); } catch (e) { /* fine */ } } }, GT_RACE.pickMs);
});
gardenShoreFxOn('rpick', (A, ev) => {   // a guest picked a lane: theirs, if nobody has it
  const R = _gtcr.R; if (!R || R.remote || !R.live || R.t >= 0) return;
  const k = (ev.n == null ? 0 : Number(ev.n)) - 1, c = R.crabs[k]; if (!c || c.who === 'me' || String(c.who).startsWith('g')) return;
  c.who = 'g' + (A && A.w != null ? A.w : 0); R.guests.set(String(A && A.w), k);
});
gardenShoreFxOn('cheer', (A, ev) => {   // a guest cheered their crab
  const R = _gtcr.R; if (!R || R.remote || !R.live) return;
  const k = R.guests.get(String(A && A.w)); if (k == null) return;
  _gtrCheer(k);
});
gardenShoreFxOn('rstate', (A, ev) => {   // the host's race as it stands
  const R = _gtcr.R; if (!R || !R.remote) return;
  const v = String(ev.v || ''); if (v.length !== 12) return;
  for (let i = 0; i < 4; i++) { const c = R.crabs[i], s = parseInt(v.slice(i * 3, i * 3 + 2), 36) / 1000, st = v[i * 3 + 2]; if (!Number.isFinite(s)) continue; c.to = Math.min(1, s); c.wave = st === 'w' ? 1 : 0; c.nap = st === 'z' ? 1 : 0; }
  if (R.t === 0) { R.t = .01; R.beat0 = performance.now(); }
});
gardenShoreFxOn('rend', (A, ev) => {
  const R = _gtcr.R; if (!R || !R.remote || R.done) return;
  const w = (ev.to == null ? 0 : Number(ev.to)) - 1; R.done = true; R.winner = w; R.endAt = performance.now();
  for (const c of R.crabs) c.s = c.to = Math.min(1, c.to);
  _gtrCheerButton(false);
  setTimeout(() => { try { if (typeof _ga !== 'undefined' && _ga.cur && _ga.cur.id === 'cheer') gartActStop(true); } catch (e) { /* fine */ } }, 1800);
  if (R.me >= 0) _gtrResult(w === R.me, R.crabs[w], null);
  setTimeout(() => { if (_gtcr.R === R) _gtcr.R = null; }, 9000);
});

/* ---------- drawn: the track scratched in the sand, the crabs going sideways ---------- */
function _gtrCrabPaint(B, c, frame) {
  const up = frame === 2, alt = frame === 1;
  B.shadow(0, 1, 7.5, 2.2, .3, '#3a3020');
  // legs, three each side, bent; the two frames swap which are lifted
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const lift = (k % 2 === 0) === alt ? -1.1 : 0, x0 = sd * (3.4 + k * .9), y0 = -2 + k * .7; B.s(`M${x0} ${y0}l${sd * 2.4} ${-1.4 + lift}l${sd * 1.2} ${2.6 - lift}`, c.c2, .9); }
  // claws: out in front, or both up high, waving
  for (const sd of [-1, 1]) { const ax = sd * 4.2, ay = -4, cx = up ? sd * 6.4 : sd * 6, cy = up ? -10.5 : -5.6; B.s(`M${ax} ${ay}L${cx} ${cy}`, c.c2, 1.2); B.f(B.ell(cx, cy - .4, 1.9, 1.5), c.c).f(`M${cx + sd * .2} ${cy - 1.8}l${sd * 1.4} -1.4l-.2 1.8z`, c.c2); }
  // the shell: wider than tall, lit from the upper left, a ridge along its front
  B.f(B.ell(.3, -2.6, 5.4, 3.3), c.c2).f(B.ell(0, -3, 5, 3), B.lin(-5, -6, 5, 0, [[0, c.c3], [.5, c.c], [1, c.c2]])).s(`M-4.4 -1.6Q0 -.2 4.4 -1.6`, c.c2, .6, .8).f(B.ell(-1.8, -4.4, 1.8, .8), '#ffffff', .35);
  // eyes on stalks
  for (const sd of [-1, 1]) { B.s(`M${sd * 1.3} -5.4l${sd * .3} -1.9`, c.c2, .6); B.f(B.circ(sd * 1.6, -7.5, .85), '#1a1612').f(B.circ(sd * 1.4, -7.8, .3), '#ffffff', .9); }
}
/** A crab for the talk card (a fragment in the card's 44 by 56 frame, its feet at 0,0). */
function _gtrCrabSvg(c) {
  return `<g transform="translate(0 -4) scale(2.4)"><ellipse cx="0" cy="1" rx="7" ry="2" fill="#3a3020" opacity="0.25"/><path d="M-4.2 -4L-6 -5.6M4.2 -4L6 -5.6" stroke="${c.c2}" stroke-width="1.2"/><ellipse cx="-6" cy="-6" rx="1.9" ry="1.5" fill="${c.c}"/><ellipse cx="6" cy="-6" rx="1.9" ry="1.5" fill="${c.c}"/><path d="M-3.4 -2l-2.4 -1.4l-1.2 2.6M-4.3 -1.3l-2.4 -1.4l-1.2 2.6M3.4 -2l2.4 -1.4l1.2 2.6M4.3 -1.3l2.4 -1.4l1.2 2.6" stroke="${c.c2}" stroke-width="0.9" fill="none"/><ellipse cx="0" cy="-3" rx="5" ry="3" fill="${c.c}"/><ellipse cx="-1.8" cy="-4.4" rx="1.8" ry="0.8" fill="#fff" opacity="0.35"/><path d="M-1.3 -5.4l-.3 -1.9M1.3 -5.4l.3 -1.9" stroke="${c.c2}" stroke-width="0.6"/><circle cx="-1.6" cy="-7.5" r="0.85" fill="#1a1612"/><circle cx="1.6" cy="-7.5" r="0.85" fill="#1a1612"/></g>`;
}
const GT_TRBOX = Object.freeze([-6, -18, GT_RACE.lenPx + 10, GT_RACE.laneW * 4 + 6]);
function _gtrTrackPaint(B) {
  const L = GT_RACE.lenPx, H = GT_RACE.laneW * 4, S = { line: '#9a845c', lineHi: '#f2e4bc', peb: ['#8a867c', '#a8a094', '#6e6a62', '#c8c0b0'] }, r = gardenRand(91);
  B.f(B.rect(0, 0, L, H), '#c4ae7e', .18);   // (sand smoothed flat for the track)
  for (let i = 0; i <= 4; i++) { const y = H * (.04 + i * .24); let d = `M2 ${y}`; for (let x = 12; x <= L - 2; x += 10) d += `L${x} ${y + (r() - .5) * 1.2}`; B.s(d, S.line, 1.1, .72).s(d.replace(/(\d+(\.\d+)?) (\d+(\.\d+)?)/g, (m, a, _b, c) => a + ' ' + (Number(c) + .8)), S.lineHi, .5, .35); }
  // the start: a row of pebbles; the finish: a stick dragged across, and a little stick with a strip of weed for a flag
  for (let k = 0; k < 9; k++) B.f(B.ell(6 + (r() - .5) * 2, H * (k / 8) * .96 + 1, 1.6 + r(), 1.1 + r() * .5), S.peb[k % 4]).f(B.ell(5.6, H * (k / 8) * .96 + .4, .7, .4), '#ffffff', .35);
  let d = `M${L - 6} -2`; for (let y = 2; y <= H + 2; y += 4) d += `L${L - 6 + (r() - .5) * 1.6} ${y}`; B.s(d, S.line, 1.4, .7);
  B.f(B.ell(L - 1, 2.4, 3, 1.1), '#3a3020', .25).s(`M${L - 1.4} 2L${L} -16`, '#7a5a3a', 1.2).s(`M${L - 1.6} 2L${L - .2} -16`, '#a8845a', .5, .7).f(`M${L} -16l7 2l-7 2.6z`, '#4f6a34', .9).f(`M${L} -16l5 1.4l-5 .6z`, '#7a9a4a', .8);   // (a short stick at the finish, a strip of weed for its flag)
}
const GardenTideRaceSprites = {
  id: 'crab-race',
  paint(scene, root) { this.scene = scene; this.root = root; this.objs = typeof GardenPaintTide !== 'undefined' ? GardenPaintTide.objects() : null; this.crabs = []; this.track = null; this.last = 0; this.for = null; },
  clear() { for (const im of this.crabs || []) { try { im.destroy(); } catch (e) { /* gone */ } } if (this.track) { try { this.track.destroy(); } catch (e) { /* gone */ } } if (this.mark) { try { this.mark.destroy(); } catch (e) { /* gone */ } } this.crabs = []; this.track = null; this.mark = null; this.scene = null; },
  tick(time, view) {
    const scene = this.scene; if (!scene) return;
    let dt = Math.min(2, (time - (this.last || time)) / 1000); this.last = time;   // (real time: a slow frame does not slow the race; worked in small steps)
    while (dt > .06) { _gtrStep(.06); dt -= .06; }
    _gtrFrame(time, dt);
    const R = _gtcr.R;
    if (!R || (R.done && performance.now() - R.endAt > 8000)) { if (this.track) this.clear0(); return; }
    const W = GARDEN_WORLD, K = 3;
    if (this.for !== R) {
      this.clear0(); this.for = R;
      if (!gardenShoreBake(scene, 'gt-track', GT_TRBOX, _gtrTrackPaint, 2)) return;
      this.track = gardenShoreImage(scene, this.root, 'gt-track', GT_TRBOX, R.tr.ox, R.tr.oy, 2).setDepth(-9345.14).setRotation(R.tr.angle);
      if (this.root.sort) this.root.sort('depth');
      for (let i = 0; i < 4; i++) for (let f = 0; f < 3; f++) gardenShoreBake(scene, 'gt-crab|' + i + '|' + f, [-10, -14, 10, 4], (B) => _gtrCrabPaint(B, GT_CRABS[i], f), K);
      if (!gardenShoreBake(scene, 'gt-crab-mark', [-5, -5, 5, 1], (B) => B.f('M-3.4 -4L3.4 -4L0 .4z', '#fffdf4').s('M-3.4 -4L3.4 -4L0 .4z', '#8a6a3a', .6, .9), K)) return;
      for (let i = 0; i < 4; i++) { const im = gardenShoreImage(scene, this.objs || this.root, 'gt-crab|' + i + '|0', [-10, -14, 10, 4], 0, 0, K); this.crabs.push(im); }
      this.mark = gardenShoreImage(scene, this.objs || this.root, 'gt-crab-mark', [-5, -5, 5, 1], 0, 0, K);
    }
    if (!this.crabs.length) return;
    const motion = typeof gardenMotionOn !== 'function' || gardenMotionOn(), step = Math.floor(time / 110) % 2;
    for (const c of R.crabs) {
      const im = this.crabs[c.i]; if (!im) continue;
      const at = _gtrAt(R.tr, c.s, c.i), x = at.px, y = at.py;
      const moving = !R.done && R.t >= 0 && Math.abs(c.v || (c.to != null ? c.to - c.s : 0)) > .001 && !(c.wave > 0) && !(c.nap > 0);
      const f = c.wave > 0 ? 2 : moving && motion ? step : 0, key = 'gt-crab|' + c.i + '|' + f;
      if (im._k !== key) { im.setTexture(key); im._k = key; }
      im.setPosition(x, y + (c.nap > 0 ? 1 : 0)).setDepth(y).setScale(.85 / K);
      if (c.i === R.me && this.mark) this.mark.setPosition(x, y - 15 - (motion ? Math.abs(Math.sin(time / 260)) * 1.5 : 0)).setDepth(y + .01);
    }
    if (this.mark) this.mark.setVisible(R.me >= 0);
  },
  clear0() { for (const im of this.crabs) { try { im.destroy(); } catch (e) { /* gone */ } } if (this.track) { try { this.track.destroy(); } catch (e) { /* gone */ } } if (this.mark) { try { this.mark.destroy(); } catch (e) { /* gone */ } } this.crabs = []; this.track = null; this.mark = null; this.for = null; },
};
if (window.GardenPaintTide) GardenPaintTide.parts.push(GardenTideRaceSprites);
GT_ROW_SOURCES.push((px, py, T) => gardenTideRaceRows(px, py, T));
GT_RUN.race = (spot) => gardenTideRaceRun(spot);
