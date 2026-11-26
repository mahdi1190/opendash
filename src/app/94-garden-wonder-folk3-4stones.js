/* ============================================================
   SKIMMING STONES TOGETHER (the folk3 plan, step 4). At a calm water edge Pip (or the angler) says "Bet I can beat that." Three throws
   each, turn about. Your throw is the skim act you already know (E at the water's edge: Skim a stone): while it is your turn a marker
   swings along the chip, and how near the middle it is when you throw, the calm of the water and a little luck make the skips (1 to 12).
   A villager's throw: they step to the edge, throw (the throw pose), and their stone skips across the water in front of them, a ring at
   each skip, the count floating over the water ("Six!"). The best single throw wins.
   - THE EDGE is the skim act's own test (water-edge terrain with water ahead: gardenTerrainWaterAhead), on calm water (nothing whose
     kind calms the water round it, such as falls), never within 10 cells of a mill (its race is out of play). Stand points along the
     edge about 1.6 cells apart. A layout with a pond and nothing else still plays it; one with no still water never offers it.
   - WITH FRIENDS each person throws in turn on their own screen and says how it went (gm|act n: skips, at most 12).
   ============================================================ */
const VGT_SWING = 1400;   // ms for the marker to cross the chip once (and back again)
const _vgt = { memo: null };
/** Calm water edges near a point, nearest first: [{x, y}] where you stand with the water in front of you. */
function _vgtEdges(at, R, want) {
  const key = Math.round(at.x / 2) + ',' + Math.round(at.y / 2) + ',' + R + ',' + want, now = performance.now();
  if (_vgt.memo && _vgt.memo.key === key && now - _vgt.memo.t < 5000) return _vgt.memo.list;
  const out = [];
  if (typeof gardenTerrainWaterAhead !== 'function' || typeof _gwFree !== 'function') return out;
  let calm = []; try { calm = gardenAffordThings().filter(t => GARDEN_KINDS[t.kind] && GARDEN_KINDS[t.kind].calmsWater); } catch (e) { calm = []; }
  const m = typeof _vfr !== 'undefined' ? _vfr.m : null;
  for (let r = 0; r <= R && out.length < want; r += r < 6 ? 0.5 : 1) {
    const n = r ? Math.max(8, Math.round(r * (r < 6 ? 8 : 5))) : 1;
    for (let k = 0; k < n && out.length < want; k++) {
      const a = k / n * Math.PI * 2, x = Math.round((at.x + Math.cos(a) * r) * 4) / 4, y = Math.round((at.y + Math.sin(a) * r * 0.8) * 4) / 4;
      if (out.some(q => Math.hypot(q.x - x, q.y - y) < 1.6) || !_gwFree(x, y) || !gardenTerrainWaterAhead(x, y)) continue;
      if (calm.some(t => Math.hypot(x - t.x, (y - t.y) * 1.3) < Math.max(GARDEN_KINDS[t.kind].calmsWater, t.w || 1)) || (typeof _vgsMillNear === 'function' && _vgsMillNear(x, y))) continue;
      if (m && typeof _vfrOpenAt === 'function' && !_vfrOpenAt(x, y, m)) continue;
      if (typeof gardenFolkReach === 'function' && !gardenFolkReach(at, { x, y })) continue;   // (on your side of the water: the folk walk there with you)
      out.push({ x, y });
    }
  }
  _vgt.memo = { key, t: now, list: out };
  return out;
}
const _VGT_WORD = Object.freeze(['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']);
function _vgtCountSvg(n) {
  const t = (_VGT_WORD[n] || String(n)) + '!', w = 10 + t.length * 5.4;
  return `<g class="gvg-count"><rect x="${-w / 2}" y="-15" width="${w}" height="15" rx="7.5" fill="#fffaf0" opacity=".94"/><rect x="${-w / 2}" y="-15" width="${w}" height="15" rx="7.5" fill="none" stroke="#6a5a44" stroke-width=".7" opacity=".6"/><text x="0" y="-4.4" text-anchor="middle" font-size="9.6" font-weight="700" fill="#3a3028" font-family="Georgia, serif">${t}</text></g>`;
}
const _VGT_STONE = '<g class="gvg-stone"><ellipse cx="0" cy="0.4" rx="3.2" ry="1" fill="#1a2a30" opacity=".25"/><ellipse cx="0" cy="-1" rx="3" ry="1.6" fill="#8a8a82"/><ellipse cx="-0.7" cy="-1.5" rx="1.4" ry=".6" fill="#c8c8bc" opacity=".8"/></g>';
/** A villager's stone, across the water in front of them: a hop at each skip, a ring where it touches, then the count over the water. */
function _vgtFly(from, n, list) {
  if (typeof wdSprite !== 'function') return;
  const W = GARDEN_WORLD, hops = [];
  let x = from.x, y = from.y;
  for (let i = 0; i < n; i++) { const d = 1.6 + i * 1.1 - i * i * 0.04, hx = from.x + Math.sin(i * 1.7) * 0.15, hy = from.y - d * 0.7 - 0.4; if (typeof gardenWaterContainsPoint === 'function' && !gardenWaterContainsPoint(hx, hy)) break; hops.push({ x: hx, y: hy, t: 380 + i * (260 - i * 14) }); x = hx; y = hy; }
  if (!hops.length) return;
  const t0 = performance.now(), last = hops[hops.length - 1], motion = typeof gardenMotionOn !== 'function' || gardenMotionOn();
  let k = 0;
  const S = wdSprite({ id: 'vg-stone', x: from.x, y: from.y - 0.3, hit: 0, hitUp: 0, label: '', ground: false, svg: _VGT_STONE, lift: 0,
    update(dt, Sp) {
      const t = performance.now() - t0;
      while (k < hops.length && t >= hops[k].t) { try { if (motion && window.GardenNativeActions) GardenNativeActions.effect('water', hops[k].x * W.cellW, W.sky + hops[k].y * W.cellH, { width: 20 - k * 1.4 }); } catch (e) { /* quiet */ } k++; }
      if (k >= hops.length) { if (t > last.t + 200) { Sp.remove(); } return; }
      const a = k ? hops[k - 1] : { x: from.x, y: from.y - 0.3, t: 0 }, b = hops[k], f = Math.max(0, Math.min(1, (t - a.t) / Math.max(1, b.t - a.t)));
      Sp.x = a.x + (b.x - a.x) * f; Sp.y = a.y + (b.y - a.y) * f; Sp.lift = Math.sin(f * Math.PI) * (k ? 9 - k : 22);
    } });
  if (list) list.push(S);
  setTimeout(() => {
    try { gardenSfx('plop'); } catch (e) { /* quiet */ }
    const C = wdSprite({ id: 'vg-count', x: last.x, y: last.y, hit: 0, hitUp: 0, label: '', ground: false, svg: _vgtCountSvg(hops.length), lift: 26, update(dt, Sp) { Sp.t = (Sp.t || 0) + dt; if (Sp.t > 2.4) Sp.remove(); else Sp.lift = 26 + Sp.t * 6; } });
    if (list) list.push(C);
  }, last.t + 240);
  return hops.length;
}
/** Is the still water frozen (winter: 94-garden-zz-2season.js)? Ice is ground to the skim act, so no edge is found on it. */
function _vgtFrozen() { return typeof _GD_ICE !== 'undefined' && _GD_ICE.size > 0; }
/** Whose turn it is: people and folk taken turn about, three rounds. */
function _vgtTurn(R) { const T = R.data.turns; return T && R.data.k < T.length ? T[R.data.k] : null; }
function _vgtNext(R) { R.data.k++; R.data.turnT = performance.now(); R.data.thrown = false; R.dirty = true; const T = _vgtTurn(R); if (T && T.w === _vgMeSlot()) { R.data.meterT0 = performance.now(); try { gardenSfx('tick'); } catch (e) { /* quiet */ } } }
function _vgtKey(T) { return T.v ? 'f' + T.v : 'w' + T.w; }
function _vgtRecord(R, T, n) {
  const k = _vgtKey(T), L = R.data.throws[k] || (R.data.throws[k] = []); L.push(n);
  if (T.w != null) { const p = R.people.get(T.w); if (p) { p.n = L.length; p.score = Math.max(...L); } }
  R.data.last = { k, n }; R.dirty = true;
}
/** The marker's place now: 0 at either end, 1 in the middle. */
function _vgtQuality(t0) { const t = (performance.now() - (t0 || 0)) % (VGT_SWING * 2), s = t / VGT_SWING, pos = s <= 1 ? s : 2 - s; return 1 - Math.abs(2 * pos - 1); }
/** The skim act asks how far your throw goes (94-garden-zz-7act-1core.js, hook A4): in a game, on your turn, from your timing. 0: not in a game. */
function gardenGameSkips(cur) {
  try {
    const R = _vgm.R, G = _vgm.G, me = _vgMeSlot(), calm = (() => { try { const m = gardenHere(); return m.rain && m.rain.now ? 0.6 : 1; } catch (e) { return 1; } })();
    if (R && R.game === 'stones' && R.phase === 'play') {
      const T = _vgtTurn(R); if (!T || T.w !== me || R.data.thrown) return 0;
      if (Math.hypot(_gw.px - R.at.x, _gw.py - R.at.y) > 6) return 0;
      const n = valeSkips(_vgtQuality(R.data.meterT0), calm, Math.random());
      R.data.thrown = true; _vgtRecord(R, T, n);
      setTimeout(() => { if (_vgm.R === R && _vgtTurn(R) === T) _vgtNext(R); }, 900 + n * 260 + 900);
      return n;
    }
    if (G && G.game === 'stones' && G.phase === 2 && G.joined && G.turn === 'w' + me && !G.thrown) {
      const n = valeSkips(_vgtQuality(G.meterT0), calm, Math.random());
      G.thrown = true; try { gardenLiveFx('gm', 'act', { i: G.i, n, x: Math.floor(_gw.px), y: Math.floor(_gw.py) }); } catch (e) { /* alone */ }
      return n;
    }
  } catch (e) { console.error('[vale games]', e); }
  return 0;
}
valeGameAdd('stones', {
  late: false,
  can(at) { return _vgtEdges(at, 25, 1).length ? '' : _vgtFrozen() ? 'The ponds are frozen. Skimming waits for the thaw.' : 'No still water near here to skim on.'; },
  askAt() { return 'the water'; },
  finding() { return 'To the water’s edge!'; },
  setup(R, cb) {
    const near = _vgtEdges(R.at, 25, 1); if (!near.length) { cb(false, _vgtFrozen() ? 'The ponds are frozen! Skimming waits for the thaw.' : 'No still water near here! Somewhere with a calm edge.'); return; }
    const spots = _vgtEdges(near[0], 7, 1 + R.folk.length + 3).sort((a, b) => Math.hypot(a.x - near[0].x, a.y - near[0].y) - Math.hypot(b.x - near[0].x, b.y - near[0].y));
    R.at = { x: near[0].x, y: near[0].y }; R.data.spots = spots; R.data.throws = {}; R.data.k = 0;
    cb(true);
  },
  gather(R) { return R.folk.map((id, k) => R.data.spots[k + 1] || _vgBeside(R.at, k + 1)); },
  ready(R) {
    for (const id of R.folk) { const D = gardenFolkDriven(id); if (D) { D.view = 'n'; D.pose = ''; } }
    if (Math.hypot(_gw.px - R.at.x, _gw.py - R.at.y) > 1.2) { try { gardenWalkToPoint(R.at, null, { radius: 0.6 }); } catch (e) { /* walk yourself */ } }
    const id = R.folk[0], t = id ? vgLine(id, 'stones', 'yes') : ''; if (t) { try { wdAmbient('“' + t + '”', 3200, 'folk'); } catch (e) { /* quiet */ } }
  },
  go(R) {
    const ppl = [...R.people.values()].filter(p => !p.left).map(p => ({ w: p.w })), folk = R.folk.map(v => ({ v })), order = [];
    for (let i = 0; i < Math.max(ppl.length, folk.length); i++) { if (ppl[i]) order.push(ppl[i]); if (folk[i]) order.push(folk[i]); }
    R.data.turns = []; for (let r = 0; r < R.G.throws; r++) R.data.turns.push(...order);
    R.data.k = -1; _vgtNext(R);
  },
  tick(R, dt, now) {
    const T = _vgtTurn(R); if (!T) return;
    if (T.v) {
      const D = gardenFolkDriven(T.v), V = _vf3V(T.v); if (!D || !V) { _vgtNext(R); return; }
      if (!R.data.thrown && now - R.data.turnT > 1300) {
        R.data.thrown = true; D.pose = 'throw'; D.view = 'n'; V.drawn = '';
        const n = valeFolkSkips(T.v, Math.random()), from = { x: V.x, y: V.y };
        setTimeout(() => { if (_vgm.R !== R) return; const got = _vgtFly(from, n, R.sprites) || n; _vgtRecord(R, T, got); const D2 = gardenFolkDriven(T.v); if (D2) D2.pose = ''; }, 420);
        R.data.nextT = now + 420 + 380 + n * 250 + 1400;
      } else if (R.data.thrown && now > R.data.nextT) _vgtNext(R);
    } else if (!R.data.thrown && now - R.data.turnT > 30000) { _vgtRecord(R, T, 0); _vgtNext(R); }   // (a long wait: that throw passes)
  },
  rows(R, px, py, me) {
    const T = _vgtTurn(R); if (!T || T.w !== me || R.data.thrown || typeof gardenTerrainWaterAhead !== 'function') return [];
    const w = gardenTerrainWaterAhead(px, py); if (!w) return [];
    return [{ key: 'water:skim', act: 'skim', name: '', x: w.x, y: w.y, stand: null, deg: w.deg, lift: 0, src: 'water', pri: 3 }];
  },
  act(R, w, ev) {
    const T = _vgtTurn(R); if (!T || T.w !== w || R.data.thrown) return false;
    const n = Math.max(0, Math.min(12, Number(ev.n) || 0)); R.data.thrown = true; _vgtRecord(R, T, n);
    setTimeout(() => { if (_vgm.R === R && _vgtTurn(R) === T) _vgtNext(R); }, 900 + n * 260 + 900);
    return true;
  },
  tap() { return true; },
  line(R, me) {
    const T = _vgtTurn(R), mine = R.data.throws['w' + me] || [], best = mine.length ? Math.max(...mine) : 0, L = R.data.last;
    const lastW = L ? (L.k[0] === 'f' ? _vgFolkCap(L.k.slice(1)) : _vgName(Number(L.k.slice(1)))) + ': ' + L.n + '. ' : '';
    if (!T) return lastW + 'All thrown!';
    if (T.w === me) return R.data.thrown ? lastW + 'Nice.' : `Your throw (${mine.length + 1} of ${R.G.throws}). Face the water, press E when the marker is in the middle.` + (best ? ' Best: ' + best + '.' : '');
    return lastW + (T.v ? _vgFolkCap(T.v) + '’s throw.' : _vgName(T.w) + '’s throw.') + (best ? ' Your best: ' + best + '.' : '');
  },
  meter(R, me) { const T = _vgtTurn(R); return T && T.w === me && !R.data.thrown ? R.data.meterT0 : 0; },
  done(R) { return !!R.data.turns && R.data.k >= R.data.turns.length; },
  result(R) {
    const rows = [];
    for (const p of R.people.values()) if (!p.left) { const L = R.data.throws['w' + p.w] || []; rows.push({ w: p.w, best: L.length ? Math.max(...L) : 0 }); }
    for (const id of R.folk) { const L = R.data.throws['f' + id] || []; rows.push({ v: id, best: L.length ? Math.max(...L) : 0 }); }
    rows.sort((a, b) => b.best - a.best);
    rows.forEach((r, k) => { r.place = k && rows[k - 1].best === r.best ? rows[k - 1].place : k + 1; r.score = r.best; r.words = r.best + (r.best === 1 ? ' skip' : ' skips'); });
    for (const r of rows) if (rows.some(o => o !== r && o.place === r.place)) r.tie = true;
    const top = rows[0]; if (top) { const id = top.v || R.folk[0], t = id ? vgLine(id, 'stones', top.v ? 'win' : 'lose') : ''; if (t) setTimeout(() => { try { wdAmbient('“' + t + '”', 5000, 'folk'); } catch (e) { /* quiet */ } }, 900); }
    return rows;
  },
  best(mine) { return mine && mine.score ? mine.score : null; },
  words(score) { return score + (score === 1 ? ' skip' : ' skips'); },
  podium(R) { return { x: R.at.x, y: R.at.y + 1.6 }; },
  folkWord(R) { const T = _vgtTurn(R), L = R.data.last; return (T ? (T.v ? 'f' + T.v : 'w' + T.w) : 'done') + (L ? '_l' + L.k + 'x' + L.n : ''); },
  /* ---------- a friend's screen ---------- */
  gStart(G) { G.turn = ''; G.thrown = false; G.lastSeen = ''; },
  gState(G, ev) {
    const [turn, last] = String(ev.v || '').split('_');
    if (turn !== G.turn) { G.turn = turn; G.thrown = false; if (turn === 'w' + _vgMeSlot()) G.meterT0 = performance.now(); }
    if (last && last !== G.lastSeen) {
      G.lastSeen = last; const m = /^lf([a-z]+)x(\d+)$/.exec(last);
      if (m && typeof _vfg !== 'undefined') { const V = _vfg.V.get(m[1]); if (V) _vgtFly({ x: V.x, y: V.y }, Number(m[2]), G.sprites); }
    }
  },
  gRows(G, px, py) {
    if (G.turn !== 'w' + _vgMeSlot() || G.thrown || typeof gardenTerrainWaterAhead !== 'function') return [];
    const w = gardenTerrainWaterAhead(px, py); if (!w) return [];
    return [{ key: 'water:skim', act: 'skim', name: '', x: w.x, y: w.y, stand: null, deg: w.deg, lift: 0, src: 'water', pri: 3 }];
  },
  gMeter(G) { return G.turn === 'w' + _vgMeSlot() && !G.thrown ? G.meterT0 : 0; },
  gLine(G) { if (G.turn === 'w' + _vgMeSlot()) return G.thrown ? 'Nice.' : 'Your throw. Face the water, press E when the marker is in the middle.'; return G.turn && G.turn[0] === 'f' ? _vgFolkCap(G.turn.slice(1)) + '’s throw.' : 'Someone else’s throw.'; },
});
