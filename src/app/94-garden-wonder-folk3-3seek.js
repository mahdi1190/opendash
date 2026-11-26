/* ============================================================
   HIDE AND SEEK (the folk3 plan, step 3). "Eyes shut! Count to ten." The world dims softly and a chip counts while the folk run off to
   hide. Then you look. Walk up to someone and press E: Found you! (or click them).
   - SPOTS (found once at the start, a couple of ms): within 12 cells of the start, in open land, never in water, inside what blocks the
     feet, or near a mill (the mill race is out of play):
       trees, from the painter's own trunk list: beside the trunk, a step behind it, so the trunk covers half of whoever crouches there
       (as the hide act's own stand: you must be seen peeking); never where another tree just in front would bury them;
       things of a hiding kind (VALE_HIDE_KINDS: hay, reeds, a log pile, a barn, a stall, a boat, any building): just behind them, at one
       side, where the drawn picture covers a crouching figure (measured from the thing's drawn height).
     Fewer than three spots: not offered. Nothing named: whatever stands near you is where they hide.
   - THE FOLK HIDE BY TEMPER (VALE_GAME_FOLK): Tam takes the farthest and does nothing at all (after a minute a small heap of fresh soil
     appears beside him: "a feature"), Pip a middling one and cannot keep still (his tail and a rustle of leaves every 15 to 25 s),
     Quince the nearest tree, and she giggles. After 40 s with nobody found, the nearest peeks out. Give up after a while: they all
     come out laughing.
   - A FOUND HIDER stands up laughing, says so, and goes back to the start to cheer the next find.
   - WITH FRIENDS the first to reach someone finds them (the host checks: within 3 cells of them); most finds wins.
   ============================================================ */
const _vgs0 = { key: '', t: 0, ok: false };
const _VGS_TELL = Object.freeze({ tail: 'Something moved. A tail?', giggle: 'Somebody giggled.', soil: 'Is that a little heap of fresh soil?', peek: 'Someone peeked out.' });
function _vgsMillNear(x, y) { const C = _vfr.ctx; if (!C) return false; const N = VALE_NO_PLAY_NEAR; for (const t of C.things) if (N.kinds.includes(t.kind) && Math.hypot(t.x - x, t.y - y) < N.r) return true; return false; }
/** Every place to hide near a point: [{ x, y (stand), tx (what they hide behind), kind, name, cover (0..1), d (cells from the start) }]. */
function _vgsSpots(at) {
  const C = typeof _vfr !== 'undefined' && _vfr.ctx; if (!C) return [];
  const out = [], R = 12, m = _vfr.m;
  const ok = (x, y) => (typeof _gwFree !== 'function' || _gwFree(x, y)) && !(typeof _vfrWetAt === 'function' && _vfrWetAt(x, y)) && (!m || _vfrOpenAt(x, y, m)) && Math.hypot(x - at.x, y - at.y) > 3 && !_vgsMillNear(x, y) && (typeof gardenFolkReach !== 'function' || gardenFolkReach(at, { x, y }));
  // (the painter's trunks, kept by the act system until the trees change: the same list the hide act stands at)
  let trunks = []; try { if (typeof _ga !== 'undefined' && typeof _gwPaintedTrunks === 'function') { const sig = typeof _gwTrunkSig === 'function' ? _gwTrunkSig() : ''; if (sig !== _ga.trunkSig || !_ga.trunks.length) { _ga.trunkSig = sig; _ga.trunks = _gwPaintedTrunks(gardenIslandData()); } trunks = _ga.trunks; } } catch (e) { trunks = []; }
  for (const b of trunks) {
    if (b.sp === 'water' || b.x1 - b.x0 < 0.28) continue;
    const fx = (b.x0 + b.x1) / 2, fy = b.y1, d = Math.hypot(fx - at.x, fy - at.y); if (d > R) continue;
    if (trunks.some(t => t !== b && t.y1 > fy + 0.3 && t.y1 < fy + 2.6 && Math.abs((t.x0 + t.x1) / 2 - fx - 0.15) < 1.4)) continue;   // (another tree just in front buries them in its leaves)
    for (const side of [1, -1]) { const x = fx + side * ((b.x1 - b.x0) / 2 + 0.02), y = fy - 0.12; if (ok(x, y)) { out.push({ x, y, tx: fx, ty: fy, kind: 'tree', name: 'the tree', cover: 0.55, d, side }); break; } }
  }
  for (const t of C.things) {
    if (!VALE_HIDE_KINDS.includes(t.kind) || (C.open && !C.open(t))) continue;
    const d = Math.hypot(t.x - at.x, t.y - at.y); if (d > R) continue;
    const B = C.base(t), h = Math.max(0.8, Math.min(5, B.h || 1.2)), hw = Math.max(0.3, (B.w || 1) / 2);
    let best = null;
    for (const side of [1, -1]) {
      const x = B.x + side * Math.max(0, hw - 0.4);
      for (let dy = 0.4; dy <= Math.min(3.4, h - 0.3); dy += 0.25) { const y = B.y - dy; if (ok(x, y)) { const cover = Math.max(0.2, Math.min(1, (h - dy) / 1.15)); if (!best || cover > best.cover) best = { x, y, tx: B.x, ty: B.y, kind: t.kind, name: _vgKindName(t.kind), cover, d, side }; break; } }
    }
    if (best) out.push(best);
  }
  return out;
}
/** Who hides where: Tam the farthest well-covered spot, Pip a middling one, Quince the nearest tree; never two within 2.5 cells. */
function _vgsAssign(folk, spots) {
  const taken = [], out = {};
  const free = (s) => !taken.some(q => Math.hypot(q.x - s.x, q.y - s.y) < 2.5);
  const by = { farthest: (a, b) => (b.d + b.cover * 4) - (a.d + a.cover * 4), near: (a, b) => (a.kind === 'tree' ? 0 : 3) + a.d - ((b.kind === 'tree' ? 0 : 3) + b.d), middle: (a, b) => Math.abs(a.d - 7) - Math.abs(b.d - 7) };
  const order = folk.slice().sort((a, b) => (((VALE_GAME_FOLK[a] || {}).seek || {}).hide === 'farthest' ? 0 : 1) - (((VALE_GAME_FOLK[b] || {}).seek || {}).hide === 'farthest' ? 0 : 1));
  for (const id of order) {
    const how = ((VALE_GAME_FOLK[id] || {}).seek || {}).hide || 'middle', L = spots.filter(free).sort(by[how] || by.middle);
    if (L.length) { out[id] = L[0]; taken.push(L[0]); }
  }
  return out;
}
function _vgsRustle(s) {
  try { if (window.GardenNativeActions && (typeof gardenMotionOn !== 'function' || gardenMotionOn())) { const W = GARDEN_WORLD; GardenNativeActions.effect('trim', s.x * W.cellW, W.sky + (s.y - 0.4) * W.cellH, { width: 26 }); } } catch (e) { /* quiet */ }
}
function _vgsGiggle() { try { wdSound([[880, 0.09, 'triangle', 0.03], [990, 0.08, 'triangle', 0.028, 0.1], [880, 0.08, 'triangle', 0.025, 0.2]]); } catch (e) { /* quiet */ } }
function _vgsSoilSvg() {
  return '<g class="gvg-soil"><ellipse cx="0" cy="0.6" rx="8" ry="2.2" fill="#2a2418" opacity=".22"/><path d="M-7.4 0.6q1.6 -5.6 7.2 -6.4q6 0.6 7.6 6.4z" fill="#6a4a30"/><path d="M-4.6 -1.6q2 -3.4 5 -3.6q1.4 0.4 2.2 1.6q-3.4 -0.6 -7.2 2z" fill="#8a6444" opacity=".9"/><circle cx="-2.4" cy="-1" r=".9" fill="#4a3220"/><circle cx="2.6" cy="-2" r=".7" fill="#4a3220"/><circle cx="4.4" cy="-.4" r=".8" fill="#7a5a3a"/><path d="M-9 1q1 -1.6 2 -.2M7 1.2q1 -1.8 2.2 -.2" stroke="#5f8a3a" stroke-width=".9" fill="none"/></g>';
}
valeGameAdd('seek', {
  late: true,
  giveUp: 150,
  can(at) {
    const key = Math.round(at.x / 3) + ',' + Math.round(at.y / 3), now = performance.now(), M = _vgs0;
    if (M.key !== key || now - M.t > 4000) { M.key = key; M.t = now; M.ok = _vgsSpots(at).length >= 3; }
    return M.ok ? '' : 'Nowhere to hide round here.';
  },
  finding() { return 'Everyone round you. Get ready to count!'; },
  setup(R, cb) {
    const spots = _vgsSpots(R.at); if (spots.length < 3) { cb(false, 'Nowhere to hide here! Somewhere with trees, or a few things to get behind.'); return; }
    R.data.spots = _vgsAssign(R.folk, spots); R.data.found = {}; R.data.st = {};
    R.folk = R.folk.filter(id => R.data.spots[id]);
    if (!R.folk.length) { cb(false, VF3_SAY.noWhere); return; }
    cb(true);
  },
  ready(R) {
    // eyes shut: the world dims, they run off to hide
    _vgDim(true, '10');
    R.folk.forEach((id) => { const s = R.data.spots[id]; gardenFolkDrive(id, { to: { x: s.x, y: s.y }, gait: 'r', by: 'game', noTalk: true, then: () => { gardenFolkPose(id, 'crouch', s.tx < s.x ? -1 : 1); } }); });
    const k = R.folk[0], t = k ? vgLine(k, 'seek', 'yes') : ''; if (t) { try { wdAmbient('“' + t + '”', 3000, 'folk'); } catch (e) { /* quiet */ } }
  },
  readyLine(R, secs) { const n = Math.max(1, R.G.ready - Math.floor(secs)); _vgDim(true, String(n)); return { line: 'Eyes shut! Counting...', big: String(n) }; },
  /** The last second of the count, while your eyes are shut: anyone still on the way is in their place, crouched (a long way round, a
   *  friend in the way: nobody is left standing in the open when you look). */
  readyTick(R, secs) {
    if (R.data.snapped || secs < R.G.ready - 1.1) return;
    R.data.snapped = true;
    for (const id of R.folk) {
      const s = R.data.spots[id], V = _vf3V(id), D = gardenFolkDriven(id); if (!s || !V || !D) continue;
      if (Math.hypot(V.x - s.x, V.y - s.y) > 0.3) { V.x = s.x; V.y = s.y; D.to = null; D.then = null; if (V.path) V.path.length = 0; }
      gardenFolkPose(id, 'crouch', s.tx < s.x ? -1 : 1);
    }
  },
  go(R) {
    _vgDim(false);
    const now = performance.now();
    for (const id of R.folk) {
      const s = R.data.spots[id], g = (VALE_GAME_FOLK[id] || {}).seek || {}, e = g.every || [0, 0];
      R.data.st[id] = { tell: g.tell || '', next: e[1] ? now + (e[0] + Math.random() * (e[1] - e[0])) * 1000 : 0, every: e, at: g.at || 0, peekT: 0, soil: null };
      // anyone not there yet is there now, crouched (they ran while you counted)
      const V = _vf3V(id), D = gardenFolkDriven(id); if (V && D && D.to && Math.hypot(V.x - s.x, V.y - s.y) > 0.3 && !_vfrNearView(V.x, V.y, _vfrView(), 1)) { V.x = s.x; V.y = s.y; D.to = null; if (V.path) V.path.length = 0; }
      gardenFolkPose(id, 'crouch', s.tx < s.x ? -1 : 1);
    }
    for (const p of R.people.values()) { p.n = 0; p.score = 0; p.last = 0; }
    R.data.lastFind = now; R.data.line = 'Go and look! Walk up to someone and press E.'; R.data.lineT = now;
    try { gardenToast('Ready or not, here you come!', { icon: 'eye' }); } catch (e) { /* fine */ }
  },
  tick(R, dt, now) {
    const st = R.data.st, F = R.data.found;
    const left = R.folk.filter(id => !F[id]);
    for (const id of left) {
      const s = st[id], V = _vf3V(id), D = gardenFolkDriven(id); if (!s || !V || !D) continue;
      if (s.peekT && now > s.peekT) { s.peekT = 0; D.pose = 'crouch'; }
      if (s.next && now > s.next && !s.peekT) {
        s.next = now + (s.every[0] + Math.random() * (s.every[1] - s.every[0])) * 1000;
        D.pose = 'peek'; s.peekT = now + 1200;
        if (s.tell === 'tail') _vgsRustle(R.data.spots[id]);
        if (s.tell === 'giggle' || s.tell === 'tail') { if (Math.hypot(V.x - _gw.px, V.y - _gw.py) < 14) _vgsGiggle(); }
        R.data.line = _VGS_TELL[s.tell] || _VGS_TELL.peek; R.data.lineT = now;
      }
      if (s.tell === 'soil' && s.at && !s.soil && now - R.goT > s.at * 1000 && typeof wdSprite === 'function') {
        const p = { x: V.x + (V.face < 0 ? 0.7 : -0.7), y: V.y + 0.12 };
        if (typeof _gwFree !== 'function' || _gwFree(p.x, p.y)) { s.soil = wdSprite({ id: 'vg-soil', x: p.x, y: p.y, hit: 0.2, hitUp: 2, label: 'A little heap of soil', ground: true, still: true, svg: _vgsSoilSvg(), lift: 0, update() { } }); R.sprites.push(s.soil); R.data.line = _VGS_TELL.soil; R.data.lineT = now; }
      }
    }
    // stuck: after 40 s with nobody found, the nearest peeks out (then again every 20 s)
    if (left.length && now - R.data.lastFind > 40000) {
      R.data.lastFind = now - 20000;
      let best = null, bd = Infinity; for (const id of left) { const V = _vf3V(id); if (!V) continue; const d = Math.hypot(V.x - _gw.px, V.y - _gw.py); if (d < bd) { bd = d; best = id; } }
      if (best) { const D = gardenFolkDriven(best), s = st[best]; if (D && s) { D.pose = 'peek'; s.peekT = now + 1800; _vgsGiggle(); R.data.line = _VGS_TELL.peek; R.data.lineT = now; } }
    }
    // friends found by their figures too (they also say so)
    for (const p of R.people.values()) {
      if (p.left || p.w === _vgMeSlot() || p.claimed) continue;
      const at = _vgPos(p.w); if (!at) continue;
      for (const id of left) { const V = _vf3V(id); if (V && Math.hypot(V.x - at.x, V.y - at.y) < 1.2) { this.found(R, id, p.w); break; } }
    }
    if (R.giveUp && !R.data.gaveUp) { R.data.gaveUp = true; for (const id of left) { const D = gardenFolkDriven(id); if (D) D.pose = 'laugh'; } }
  },
  /** Someone found: they stand up laughing, say so, and go back to the start to cheer the rest. */
  found(R, id, w) {
    const F = R.data.found; if (F[id] || !R.folk.includes(id)) return false;
    const now = performance.now(); F[id] = { w, t: (now - R.goT) / 1000 };
    const p = R.people.get(w); if (p) { p.n = (p.n || 0) + 1; p.score = p.n; p.last = F[id].t; }
    R.data.lastFind = now; R.dirty = true;
    const D = gardenFolkDriven(id); if (D) { D.pose = 'laugh'; D.view = ''; }
    const say = vgLine(id, 'seek', 'found'); if (say) { try { wdAmbient((w === _vgMeSlot() ? '' : _vgName(w) + ' found ' + _vgFolkCap(id) + '. ') + '“' + say + '”', 4200, 'folk'); } catch (e) { /* quiet */ } }
    try { gardenSfx('sparkle'); } catch (e) { /* quiet */ }
    const k = Object.keys(F).length;
    setTimeout(() => { if (_vgm.R !== R || R.phase !== 'play') return; gardenFolkDrive(id, { to: _vgBeside(R.at, k), gait: 'w', by: 'game', noTalk: true, face: R.at, then: () => gardenFolkPose(id, '', null) }); }, 1400);
    for (const o of R.folk) if (o !== id && F[o]) { const D2 = gardenFolkDriven(o); if (D2 && !D2.to) { D2.pose = 'clap'; setTimeout(() => { const D3 = gardenFolkDriven(o); if (D3 && D3.pose === 'clap' && _vgm.R === R && R.phase === 'play') D3.pose = ''; }, 2200); } }
    return true;
  },
  rows(R, px, py, me) {
    const out = [];
    for (const id of R.folk) {
      if (R.data.found[id]) continue;
      const V = _vf3V(id); if (!V || !V.S || Math.hypot(V.x - px, (V.y - py) * 1.3) > 1.7) continue;
      out.push({ key: 'vg-found:' + id, act: 'game', src: 'vgf:' + id, run: () => this.found(R, id, me), words: 'Found you!', x: V.x, y: V.y, promptY: V.y - 1.9, pri: 3 });
    }
    return out;
  },
  tap(R, id, me) { if (R.data.found[id]) return true; const V = _vf3V(id); if (V && Math.hypot(V.x - _gw.px, V.y - _gw.py) < 3.5) { this.found(R, id, me); return true; } try { gardenToast('Closer! Walk up to them.'); } catch (e) { /* fine */ } return true; },
  act(R, w, ev, A) {
    const id = String(ev.v || ''); if (!R.folk.includes(id) || R.data.found[id]) return false;
    const V = _vf3V(id); if (!V || !A || !Number.isFinite(A.x) || Math.hypot(V.x - A.x, V.y - A.y) > 3) return false;
    const p = R.people.get(w); if (p) p.claimed = true;
    return this.found(R, id, w);
  },
  line(R, me) {
    const F = R.data.found, n = Object.keys(F).length, left = R.folk.filter(id => !F[id]);
    if (!left.length) return 'Everyone found!';
    let bd = Infinity; for (const id of left) { const V = _vf3V(id); if (V) bd = Math.min(bd, Math.hypot(V.x - _gw.px, V.y - _gw.py)); }
    const heat = bd < 2.5 ? 'Very warm!' : bd < 5 ? 'Warm.' : bd < 9 ? 'Cool.' : 'Cold.';
    const recent = performance.now() - (R.data.lineT || 0) < 5000 ? ' ' + R.data.line : '';
    return `Found ${n} of ${R.folk.length}. ${heat}${recent}`;
  },
  big(R) { const s = Math.floor((performance.now() - R.goT) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },
  done(R) { const F = R.data.found; return R.folk.every(id => F[id]) || (R.giveUp && performance.now() - R.pt > 0) || ![...R.people.values()].some(p => !p.left); },
  result(R) {
    const F = R.data.found, all = R.folk.every(id => F[id]), rows = [];
    const ppl = [...R.people.values()].filter(p => !p.left).map(p => ({ w: p.w, n: p.n || 0, last: p.last || 0 })).sort((a, b) => b.n - a.n || a.last - b.last);
    let place = 1;
    if (!all) { for (const id of R.folk) if (!F[id]) rows.push({ v: id, place: 1, words: 'never found' }); place = 2; }
    for (const p of ppl) rows.push({ w: p.w, place: place++, score: p.n, words: p.n + ' found', last: p.last });
    for (const id of R.folk) if (F[id]) rows.push({ v: id, place: place++, words: 'found at ' + Math.round(F[id].t) + ' s' });
    if (!all && rows[0] && rows[1] && rows[1].v) rows.forEach(r => { if (r.v && !F[r.v]) r.tie = true; });
    if (all) R.data.allT = Math.max(...R.folk.map(id => F[id].t));
    const top = rows[0]; if (top) { const id = top.v || R.folk[0], t = id ? vgLine(id, 'seek', top.v ? 'win' : 'lose') : ''; if (t) setTimeout(() => { try { wdAmbient('“' + t + '”', 5000, 'folk'); } catch (e) { /* quiet */ } }, 900); }
    // everyone out: the unfound stand up laughing
    for (const id of R.folk) if (!F[id]) { const D = gardenFolkDriven(id); if (D) D.pose = 'laugh'; }
    return rows;
  },
  best(mine, won) { return won && Number.isFinite(_vgm.R && _vgm.R.data.allT) ? Math.round(_vgm.R.data.allT) : null; },
  words(score) { return score + ' found'; },
  podium(R) { return R.at; },
  folkWord(R) { const F = R.data.found || {}; return R.folk.filter(id => !F[id]).join('_') || 'none'; },
  clear() { _vgDim(false); },
  /* ---------- a friend's screen ---------- */
  gStart(G) { G.left = new Set(G.folk); },
  gState(G, ev) {
    if (G.phase === 1 && G.joined) _vgDim(true, String(Math.max(1, VALE_GAMES.seek.ready - Math.floor((performance.now() - G.pt) / 1000))));
    else _vgDim(false);
    if (G.phase >= 2) G.left = new Set(String(ev.v || '').split('_').filter(id => VALE_FOLK_ROW.has(id)));
  },
  gFrame(G) { if (G.phase === 1 && G.joined) _vgDim(true, String(Math.max(1, VALE_GAMES.seek.ready - Math.floor((performance.now() - G.pt) / 1000)))); },
  gRows(G, px, py) {
    const out = []; if (typeof _vfg === 'undefined') return out;
    for (const id of G.left || []) { const V = _vfg.V.get(id); if (!V || !V.S || Math.hypot(V.x - px, (V.y - py) * 1.3) > 1.7) continue; out.push({ key: 'vg-found:' + id, act: 'game', src: 'vgf:' + id, run: () => this.gTap(G, id), words: 'Found you!', x: V.x, y: V.y, promptY: V.y - 1.9, pri: 3 }); }
    return out;
  },
  gTap(G, id) { const V = typeof _vfg !== 'undefined' ? _vfg.V.get(id) : null; if (!V || !(G.left || new Set()).has(id)) return; if (Math.hypot(V.x - _gw.px, V.y - _gw.py) > 3.2) { try { gardenToast('Closer! Walk up to them.'); } catch (e) { /* fine */ } return; } try { gardenLiveFx('gm', 'act', { i: G.i, v: id, x: Math.floor(_gw.px), y: Math.floor(_gw.py) }); gardenSfx('sparkle'); } catch (e) { /* alone */ } },
  gLine(G) { if (G.phase === 1) return 'Eyes shut! Counting...'; const n = G.folk.length - (G.left ? G.left.size : 0); return `Found ${n} of ${G.folk.length}. Walk up to someone and press E.`; },
  gClear() { _vgDim(false); },
});
/* ---------- the other way round: you hide, they look (Play again after a round of looking swaps who seeks) ----------
   Pip (or Quince) counts at the start with eyes in an elbow while you hide: get behind something (any hiding place above, or the hide
   act at a tree), or keep moving. Then they look, the places nearest the start first, a moment at each, coming towards where you are
   as time goes on. Stood in the open within a few cells of them, you are seen; hidden, only when they are right by you. Get back to the
   start while they are away from it ("Home!"), or last out the time, and you win. Played on your own with them (not with friends). */
function _vgsYouHidden(R) {
  if (typeof gartActBusy === 'function' && gartActBusy() && typeof _ga !== 'undefined' && _ga.cur && _ga.cur.id === 'hide') return true;
  for (const s of R.data.spots) if (Math.hypot(_gw.px - s.x, (_gw.py - s.y) * 1.3) < 1.4) return true;
  return false;
}
valeGameAdd('hide', {
  late: false,
  can(at) { if (typeof _gll !== 'undefined' && _gll.role === 'host' && typeof _glhAnyone === 'function' && _glhAnyone()) return 'This one is for when it’s just you.'; return _vgsSpots(at).length >= 3 ? '' : 'Nowhere to hide round here.'; },
  finding() { return 'Everyone round you!'; },
  setup(R, cb) {
    const spots = _vgsSpots(R.at); if (spots.length < 3) { cb(false, 'Nowhere to hide here!'); return; }
    R.folk = R.folk.slice(0, 1); if (!R.folk.length) { cb(false, 'Nobody to do the counting just now.'); return; }
    R.data.spots = spots.sort((a, b) => a.d - b.d); R.data.k = -1; R.data.state = ''; R.data.found = false; R.data.home = false;
    cb(true);
  },
  gather(R) { return [_vgBeside(R.at, 1)]; },
  ready(R) {
    const id = R.folk[0], s = R.data.spots[0];
    gardenFolkPose(id, 'count', s ? (s.tx < R.at.x ? 1 : -1) : 1);   // (facing away from the nearest hiding place: no peeping)
    try { gardenToast('Hide! Get behind something, or keep out of sight.', { icon: 'eye-off' }); } catch (e) { /* fine */ }
  },
  readyLine(R, secs) { const n = Math.max(1, R.G.ready - Math.floor(secs)); return { line: _vgFolkCap(R.folk[0]) + ' is counting. Hide!', big: String(n) }; },
  go(R) {
    const id = R.folk[0], t = vgLine(id, 'hide', 'go'); if (t) try { wdAmbient('“' + t + '”', 3200, 'folk'); } catch (e) { /* quiet */ }
    R.data.state = 'look'; R.data.lookT = performance.now() + 900;
    for (const p of R.people.values()) { p.n = 0; p.score = 0; }
  },
  tick(R, dt, now) {
    const id = R.folk[0], V = _vf3V(id), D = gardenFolkDriven(id); if (!V || !D) { R.data.home = true; return; }
    const me = R.people.get(_vgMeSlot()); if (!me || me.left) return;
    const t = (now - R.goT) / 1000, dMe = Math.hypot(V.x - _gw.px, (V.y - _gw.py) * 1.3), hidden = _vgsYouHidden(R);
    if (t > 2.5 && Math.hypot(_gw.px - R.at.x, _gw.py - R.at.y) < R.G.home && Math.hypot(V.x - R.at.x, V.y - R.at.y) > 4) { R.data.home = true; try { wdAmbient('Home! You got back to the start first.', 3400, 'folk'); gardenSfx('cheer'); } catch (e) { /* quiet */ } return; }
    if (dMe < 1.6 || (!hidden && dMe < 5.5 && t > 1)) { R.data.found = true; D.to = null; if (V.path) V.path.length = 0; D.pose = 'point'; D.face = { x: _gw.px, y: _gw.py }; R.data.foundT = t; return; }
    if (R.data.state === 'walk' && !D.to) { R.data.state = 'look'; D.pose = 'seek'; R.data.lookT = now + 1500; }
    if (R.data.state === 'look' && now > R.data.lookT) {
      // the next place: nearest the start first; after half a minute, the places nearest where you are (they heard something)
      const S = R.data.spots; let next = null;
      if (t > 30) { let bd = Infinity; for (const s of S) { if (s.seen && t - s.seen < 20) continue; const d = Math.hypot(s.x - _gw.px, s.y - _gw.py); if (d < bd) { bd = d; next = s; } } }
      else { R.data.k = (R.data.k + 1) % S.length; next = S[R.data.k]; }
      if (!next) next = S[0];
      next.seen = t;
      gardenFolkDrive(id, { to: { x: next.x + (next.side || 1) * 0.6, y: next.y + 0.5 }, gait: 'w', speed: VALE_FOLK_SPEED * 1.6, by: 'game', noTalk: true });
      R.data.state = 'walk';
    }
  },
  tap() { return true; },
  line(R) {
    if (R.data.found) return 'Found!';
    const hidden = _vgsYouHidden(R), V = _vf3V(R.folk[0]), d = V ? Math.hypot(V.x - _gw.px, V.y - _gw.py) : 99;
    return (hidden ? 'Hidden. Keep still.' : 'In the open! Get behind something.') + (d < 4 ? ' They’re close!' : '') + ' Or get back to the start.';
  },
  big(R) { return String(Math.max(0, Math.ceil(R.G.cap - (performance.now() - R.goT) / 1000))); },
  done(R) { return R.data.found || R.data.home || (performance.now() - R.goT) / 1000 > R.G.cap - 1; },
  result(R) {
    const id = R.folk[0], won = !R.data.found, t = Math.round(((R.data.found ? R.data.foundT : (performance.now() - R.goT) / 1000)) || 0);
    const rows = won ? [{ w: _vgMeSlot(), place: 1, score: t, words: R.data.home ? 'home!' : 'never found' }, { v: id, place: 2, words: 'looking' }] : [{ v: id, place: 1, words: 'found you at ' + t + ' s' }, { w: _vgMeSlot(), place: 2, score: t, words: 'hid ' + t + ' s' }];
    const say = vgLine(id, 'hide', won ? 'lose' : 'win'); if (say) setTimeout(() => { try { wdAmbient('“' + say + '”', 5000, 'folk'); } catch (e) { /* quiet */ } }, 800);
    const D = gardenFolkDriven(id); if (D) { D.pose = won ? 'laugh' : 'cheer'; D.face = { x: _gw.px, y: _gw.py }; }
    R.data.secs = t;
    return rows;
  },
  best(mine, won) { return won && Number.isFinite(mine.score) ? mine.score : null; },
  words(score) { return score + ' s'; },
  podium(R) { return R.at; },
});
