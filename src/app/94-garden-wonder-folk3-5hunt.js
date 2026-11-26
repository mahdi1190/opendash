/* ============================================================
   TREASURE HUNT (a fourth game with the folk: Bramble draws the map, Tam does the burying). Three things are buried beside things of
   the vale; the chip reads the next clue ("A bench, a little way east of here, by the lamp. Dig on its sunny side."), says warmer or
   colder as you walk, and at the right spot E says Dig. A little tin chest comes up out of the soil with something real in it.
   - SPOTS by kind (VALE_HUNT_KINDS: a bench, a stump, a well, a sign, the stones, a lamp, a tree...), in open land you can walk to,
     within 26 cells of the start, at least 6 cells apart; the hole on open ground beside the thing (gardenTerrainTakes: grass, snow or
     sand, never a path, water, a building's ground or on top of anything). A layout with fewer than three such places never offers it.
   - CLUES are made from the thing's own kind name, the way from the start (north, south-east...), how far, the nearest other thing
     (by kind) when two of a kind could be meant, and which side to dig: nothing named.
   - THE FOLK DIG TOO: Tam heads for the right place at his own slow pace (he knows: he buried them), Pip tries a wrong place first.
   - FINDS: each a little tin chest with something in it (a seed of the season, fertiliser or a material), the day's first three on
     each person's own computer (the reward's own caps). Most finds wins; friends dig for the same three.
   ============================================================ */
const _vgh0 = { key: '', t: 0, ok: false };
const _VGH_DIRS = Object.freeze(['east', 'north-east', 'north', 'north-west', 'west', 'south-west', 'south', 'south-east']);
const VALE_HUNT_FINDS = Object.freeze([['seed', 'a packet of seeds'], ['fertiliser', 'a little bag of fertiliser'], ['mat:stone', 'a good stone'], ['seed', 'a packet of seeds'], ['mat:timber', 'a length of good timber']]);
function _vghDir(a, b) { const ang = Math.atan2(-(b.y - a.y) * 1.6, b.x - a.x), k = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8; return _VGH_DIRS[k]; }
function _vghFar(d) { return d < 10 ? 'close by' : d < 18 ? 'a little way' : 'a good walk'; }
function _vghDigAt(t, C, rng) {
  const B = C.base(t), hw = Math.max(0.4, (B.w || 1) / 2), sides = [[0, 0.85, 'on its sunny side'], [hw + 0.7, 0.2, 'on its east side'], [-(hw + 0.7), 0.2, 'on its west side'], [0, -0.9, 'behind it']];
  for (let i = sides.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const x = sides[i]; sides[i] = sides[j]; sides[j] = x; }
  for (const [dx, dy, side] of sides) {
    const x = B.x + dx, y = B.y + dy;
    if (typeof _gwFree === 'function' && !_gwFree(x, y)) continue;
    if (typeof gardenTerrainTakes === 'function' && !gardenTerrainTakes('hole', x, y)) continue;
    return { x, y, side };
  }
  return null;
}
/** Three places to bury things near a point, each with its clue. */
function _vghSpots(at, seed) {
  const C = typeof _vfr !== 'undefined' && _vfr.ctx; if (!C) return [];
  const rng = valeRng(seed || 'hunt'), m = _vfr.m, cands = [];
  for (const t of C.things) {
    if (!VALE_HUNT_KINDS.includes(t.kind) || (C.open && !C.open(t))) continue;
    const d = Math.hypot(t.x - at.x, t.y - at.y); if (d < 5 || d > VALE_GAMES.hunt.r) continue;
    if (m && typeof _vfrOpenAt === 'function' && !_vfrOpenAt(t.x, t.y, m)) continue;
    cands.push({ t, d, r: rng() });
  }
  cands.sort((a, b) => a.r - b.r);
  const out = [];
  for (const c of cands) {
    if (out.length >= VALE_GAMES.hunt.spots) break;
    if (out.some(o => Math.hypot(o.t.x - c.t.x, o.t.y - c.t.y) < 6)) continue;
    const dig = _vghDigAt(c.t, C, rng); if (!dig) continue;
    if (typeof gardenFolkReach === 'function' && !gardenFolkReach(at, dig)) continue;
    out.push({ t: c.t, d: c.d, dig, kind: c.t.kind });
  }
  if (out.length < VALE_GAMES.hunt.spots) return [];
  for (const s of out) s.clue = _vghClue(s, at, C);
  return out;
}
function _vghClue(s, at, C) {
  const name = _vgKindName(s.kind).replace(/^the /, ''), dir = _vghDir(at, s.t), far = _vghFar(s.d);
  const a = /^[aeiou]/.test(name) ? 'An ' + name : 'A ' + name;
  // two of a kind that way and that far: the nearest other thing to it, by its kind
  const same = C.things.filter(t => t !== s.t && t.kind === s.kind && _vghDir(at, t) === dir && Math.abs(Math.hypot(t.x - at.x, t.y - at.y) - s.d) < 8).length;
  let by = '';
  if (same) { let best = null, bd = 4.5; for (const t of C.things) { if (t === s.t || t.kind === s.kind || !t.kind || t.kind === 'building' || t.kind === 'scenery') continue; const d = Math.hypot(t.x - s.t.x, t.y - s.t.y); if (d < bd) { bd = d; best = t; } } if (best) by = ', by ' + _vgKindName(best.kind); }
  return `${a}, ${far} ${dir} of the start${by}. Dig ${s.dig.side}.`;
}
function _vghChestSvg(open) {
  const lid = open
    ? '<path d="M-8 -11.5l1.4 -6.4h13.2l1.4 6.4z" fill="#8a5a32"/><path d="M-6.6 -17.9h13.2" stroke="#d8b050" stroke-width="1.2"/><path d="M-6 -10.4h12v-1.6h-12z" fill="#3a2414"/><path d="M-4.4 -11.6l1.6 -2.8l1.4 2.4l1.8 -3l1.6 3.2l1.4 -2.2l1.2 2.4" fill="#f0d070"/>'
    : '<path d="M-8 -9.6q8 -5.4 16 0v1.4h-16z" fill="#8a5a32"/><path d="M-8 -8.4h16" stroke="#d8b050" stroke-width="1.1"/>';
  return '<g class="gvg-chest"><ellipse cx="0" cy="0.8" rx="12" ry="3" fill="#2a2418" opacity=".24"/>'
    + '<path d="M-12 1q2 -5 12 -5.4q10 0.4 12 5.4z" fill="#6a4a30"/><path d="M-9 -0.2q4 -3.2 9 -3.2q5 0 8.2 3" fill="#8a6444" opacity=".8"/>'
    + '<rect x="-8" y="-8.6" width="16" height="8" rx="1" fill="#a06a3a"/><rect x="-8" y="-8.6" width="16" height="2" fill="#c88a4e"/><path d="M-4 -8.6v8M4 -8.6v8" stroke="#d8b050" stroke-width="1.1"/><rect x="-1.4" y="-6.6" width="2.8" height="2.8" rx=".5" fill="#e8c860"/>'
    + lid + '<circle cx="-10" cy="-1.4" r=".9" fill="#4a3220"/><circle cx="10.4" cy="-.8" r=".8" fill="#4a3220"/></g>';
}
function _vghChest(s, list) {
  if (typeof wdSprite !== 'function') return;
  const W = GARDEN_WORLD;
  try { if (window.GardenNativeActions) { GardenNativeActions.effect('soil', s.dig.x * W.cellW, W.sky + s.dig.y * W.cellH, { width: 30 }); setTimeout(() => { try { GardenNativeActions.effect('gold', s.dig.x * W.cellW, W.sky + (s.dig.y - 0.4) * W.cellH, { width: 26 }); } catch (e) { /* quiet */ } }, 450); } } catch (e) { /* quiet */ }
  try { gardenSfx('dig'); } catch (e) { /* quiet */ }
  const S = wdSprite({ id: 'vg-chest', x: s.dig.x, y: s.dig.y, hit: 0.3, hitUp: 2, label: 'A little tin chest', ground: true, svg: _vghChestSvg(false), lift: 0, update() { } });
  setTimeout(() => { try { wdArt(S, _vghChestSvg(true)); gardenSfx('sparkle'); } catch (e) { /* gone */ } }, 520);
  list.push(S);
}
/** What was in it: on your own computer, the day's first three finds bring something real (inside the reward caps). */
function _vghGift(n) {
  try {
    const day = _wdToday(), W = _wdG(), k = Number(W['vgh.' + day] || 0) + 1; W['vgh.' + day] = k;
    if (k > 3) { gardenToast('A little tin chest. Empty: Tam must have had that one.', { icon: 'map' }); return; }
    const [item, words] = VALE_HUNT_FINDS[(gardenHash('vgh|' + day + k) + n) % VALE_HUNT_FINDS.length];
    const it = item === 'seed' && typeof _wkSeed === 'function' ? _wkSeed('vgh|' + day + k) : item === 'seed' ? 'fertiliser' : item;
    const ok = _grGive('gmh.' + k, { [it]: 1, x: 1 });
    const what = item === 'seed' && typeof _wkItemWords === 'function' ? _wkItemWords(it) : it === 'fertiliser' ? 'a little bag of fertiliser' : words;
    gardenToast(ok ? `You dug it up! Inside: ${what}. It is in your bag.` : 'You dug it up! A little tin chest, with a note inside: “Well done.”', { icon: 'map' });
  } catch (e) { /* not ready */ }
}
valeGameAdd('hunt', {
  late: true,
  can(at) {
    const key = Math.round(at.x / 3) + ',' + Math.round(at.y / 3), now = performance.now(), M = _vgh0;
    if (M.key !== key || now - M.t > 4000) { M.key = key; M.t = now; M.ok = _vghSpots(at, 'can').length > 0; }
    return M.ok ? '' : 'Nowhere to bury anything round here.';
  },
  askAt() { return ''; },
  finding() { return 'Bramble is drawing the map...'; },
  setup(R, cb) {
    const spots = _vghSpots(R.at, R.seed); if (!spots.length) { cb(false, 'Not here! I need a few more things to draw on the map.'); return; }
    R.data.spots = spots; R.data.found = {}; R.data.st = {}; R.data.cur = 0;
    cb(true);
  },
  ready(R) {
    const by = R.by || R.helpers[0] || R.folk[0], t = by ? vgLine(by, 'hunt', 'yes') : '';
    if (t) { try { wdAmbient('“' + t + '”', 4200, 'folk'); } catch (e) { /* quiet */ } }
    for (const id of R.helpers) gardenFolkPose(id, 'point', R.data.spots[0].t);
  },
  readyLine(R) { return { line: 'Here is the map. Three things to find.', big: '' }; },
  go(R) {
    const now = performance.now();
    for (const p of R.people.values()) { p.n = 0; p.score = 0; p.last = 0; }
    R.folk.forEach((id, k) => { const g = (VALE_GAME_FOLK[id] || {}).hunt || {}; R.data.st[id] = { pace: g.pace || 1, wrong: !!g.wrong, at: now + (10 + k * 4) * 1000, target: -1, digT: 0 }; });
    R.data.clueT = now;
  },
  /** The next clue's spot: the first not yet found. */
  cur(R) { const S = R.data.spots; for (let k = 0; k < S.length; k++) if (!R.data.found[k]) return k; return -1; },
  found(R, k, who) {
    if (R.data.found[k]) return false;
    const s = R.data.spots[k]; R.data.found[k] = { who, t: (performance.now() - R.goT) / 1000 }; R.dirty = true;
    _vghChest(s, R.sprites);
    if (who.w != null) { const p = R.people.get(who.w); if (p) { p.n = (p.n || 0) + 1; p.score = p.n; p.last = R.data.found[k].t; } if (who.w === _vgMeSlot()) _vghGift(k); else try { wdAmbient(_vgName(who.w) + ' dug one up!', 3000, 'folk'); } catch (e) { /* quiet */ } }
    else { const st = R.data.st[who.v]; if (st) st.n = (st.n || 0) + 1; try { wdAmbient(_vgFolkCap(who.v) + (who.v === 'tam' ? ' dug one up first. “Thought you’d want to know.”' : ' dug one up first!'), 3600, 'folk'); } catch (e) { /* quiet */ } }
    const say = R.by ? vgLine(R.by, 'hunt', 'found') : ''; if (say && who.w === _vgMeSlot()) setTimeout(() => { try { wdAmbient('“' + say + '”', 3600, 'folk'); } catch (e) { /* quiet */ } }, 1600);
    R.data.clueT = performance.now();
    for (const id of R.folk) { const st = R.data.st[id]; if (st && st.target === k) { st.target = -1; st.at = performance.now() + 6000; const D = gardenFolkDriven(id); if (D) { D.pose = 'shrug'; D.to = null; } } }
    return true;
  },
  tick(R, dt, now) {
    const k = this.cur(R); if (k < 0) return;
    const s = R.data.spots[k];
    for (const id of R.folk) {
      const st = R.data.st[id], V = _vf3V(id), D = gardenFolkDriven(id); if (!st || !V || !D) continue;
      if (st.digT) { if (now > st.digT) { st.digT = 0; D.pose = ''; if (st.target === k && Math.hypot(V.x - s.dig.x, V.y - s.dig.y) < 1.2) this.found(R, k, { v: id }); else { st.target = -1; st.at = now + 2500; } } continue; }
      if (now < st.at || st.target !== -1) continue;   // (on the way somewhere already)
      // Pip tries somewhere wrong first (any thing of the same kind nearby, else a step off), then the right one
      let to = s.dig;
      if (st.wrong && !st.triedWrong) { st.triedWrong = true; const C = _vfr.ctx, alt = C.things.filter(t => t.kind === s.kind && t !== s.t && Math.hypot(t.x - s.t.x, t.y - s.t.y) < 16)[0]; to = alt ? (_vghDigAt(alt, C, Math.random) || s.dig) : { x: s.dig.x + 2.2, y: s.dig.y + 0.6 }; st.target = -2; }
      else st.target = k;
      gardenFolkDrive(id, { to, gait: 'w', speed: VALE_FOLK_SPEED * 1.5 * st.pace, by: 'game', noTalk: true, then: () => { const D2 = gardenFolkDriven(id); if (D2) D2.pose = 'dig'; st.digT = performance.now() + 2600; } });
    }
  },
  rows(R, px, py, me) {
    const k = this.cur(R); if (k < 0) return [];
    const s = R.data.spots[k]; if (Math.hypot(s.dig.x - px, (s.dig.y - py) * 1.3) > 1.3) return [];
    return [{ key: 'vg-dig:' + k, act: 'game', src: 'vgd:' + k, run: () => this.found(R, k, { w: me }), words: 'Dig here', x: s.dig.x, y: s.dig.y, pri: 3 }];
  },
  act(R, w, ev, A) {
    const k = Number(ev.n) || 0; if (k !== this.cur(R) || !A || !Number.isFinite(A.x)) return false;   // (n: 0 is left off the wire)
    const s = R.data.spots[k]; if (Math.hypot(s.dig.x - A.x, s.dig.y - A.y) > 2.6) return false;
    return this.found(R, k, { w });
  },
  tap() { return true; },
  line(R) {
    const k = this.cur(R); if (k < 0) return 'All three found!';
    const s = R.data.spots[k], d = Math.hypot(_gw.px - s.dig.x, _gw.py - s.dig.y);
    const heat = d < 2 ? ' Very warm!' : d < 5 ? ' Warm.' : d < 10 ? ' Cool.' : '';
    return `Clue ${k + 1} of ${R.data.spots.length}: ${s.clue}${heat}`;
  },
  big(R) { const s = Math.floor((performance.now() - R.goT) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },
  done(R) { return this.cur(R) < 0 || ![...R.people.values()].some(p => !p.left); },
  result(R) {
    const rows = [];
    for (const p of R.people.values()) if (!p.left) rows.push({ w: p.w, n: p.n || 0, last: p.last || 0 });
    for (const id of R.folk) { const st = R.data.st[id]; rows.push({ v: id, n: (st && st.n) || 0, last: 0 }); }
    rows.sort((a, b) => b.n - a.n || (a.v ? 1 : 0) - (b.v ? 1 : 0) || a.last - b.last);
    rows.forEach((r, k) => { r.place = k + 1; r.score = r.n; r.words = r.n + ' found'; });
    if (rows[1] && rows[0].n === rows[1].n && rows[0].v === rows[1].v) rows[0].tie = rows[1].tie = true;
    const all = R.data.spots.every((s, k) => R.data.found[k]); if (all) R.data.allT = Math.max(...R.data.spots.map((s, k) => R.data.found[k].t));
    const top = rows[0], by = R.by || 'bramble'; if (top) { const id = top.v || by, t = vgLine(id, 'hunt', top.v ? 'win' : 'lose'); if (t) setTimeout(() => { try { wdAmbient('“' + t + '”', 5000, 'folk'); } catch (e) { /* quiet */ } }, 900); }
    return rows;
  },
  best(mine, won) { return won && _vgm.R && Number.isFinite(_vgm.R.data.allT) ? Math.round(_vgm.R.data.allT) : null; },
  words(score) { return score + ' found'; },
  podium(R) { return R.at; },
  folkWord(R) { let m = 0; R.data.spots.forEach((s, k) => { if (R.data.found[k]) m |= 1 << k; }); return 'h' + m; },
  wire(R) { return R.data.spots.map((s, k) => [k, Math.floor(s.dig.x) * 100 + Math.floor(s.dig.y), Math.min(9, Math.round((s.dig.x % 1) * 9)) * 10 + Math.min(9, Math.round((s.dig.y % 1) * 9))]); },
  /* ---------- a friend's screen ---------- */
  gStart(G) {
    const C = { things: typeof gardenAffordThings === 'function' ? gardenAffordThings() : [] };   // (the garden you are visiting: its own things)
    G.spots = (G.l || []).map(r => ({ dig: { x: Math.floor(r[1] / 100) + Math.floor(r[2] / 10) / 9, y: (r[1] % 100) + (r[2] % 10) / 9, side: '' } }));
    for (const s of G.spots) { let best = null, bd = 3; for (const t of C.things) { if (!VALE_HUNT_KINDS.includes(t.kind)) continue; const d = Math.hypot(t.x - s.dig.x, t.y - s.dig.y); if (d < bd) { bd = d; best = t; } } s.t = best || { x: s.dig.x, y: s.dig.y }; s.kind = best ? best.kind : 'place'; s.d = Math.hypot(s.t.x - G.at.x, s.t.y - G.at.y); s.dig.side = s.dig.y > s.t.y + 0.4 ? 'on its sunny side' : s.dig.y < s.t.y - 0.4 ? 'behind it' : s.dig.x > s.t.x ? 'on its east side' : 'on its west side'; s.clue = _vghClue(s, G.at, C); }
    G.mask = 0; G.shown = 0; G.mine = 0;
  },
  gState(G, ev) {
    const m = /^h(\d+)$/.exec(String(ev.v || '')); if (!m) return;
    const mask = Number(m[1]);
    G.spots.forEach((s, k) => { if ((mask & (1 << k)) && !(G.shown & (1 << k))) { G.shown |= 1 << k; _vghChest(s, G.sprites); } });
    G.mask = mask;
    const me = (G.people || []).find(r => r[0] === _vgMeSlot()); const n = me ? me[2] : 0;
    while (G.mine < n) { G.mine++; _vghGift(G.mine); }
  },
  gCur(G) { for (let k = 0; k < (G.spots || []).length; k++) if (!(G.mask & (1 << k))) return k; return -1; },
  gRows(G, px, py) {
    const k = this.gCur(G); if (k < 0) return [];
    const s = G.spots[k]; if (Math.hypot(s.dig.x - px, (s.dig.y - py) * 1.3) > 1.3) return [];
    return [{ key: 'vg-dig:' + k, act: 'game', src: 'vgd:' + k, run: () => { try { gardenLiveFx('gm', 'act', { i: G.i, n: k, x: Math.floor(_gw.px), y: Math.floor(_gw.py) }); gardenSfx('dig'); } catch (e) { /* alone */ } }, words: 'Dig here', x: s.dig.x, y: s.dig.y, pri: 3 }];
  },
  gLine(G) { const k = this.gCur(G); if (k < 0) return 'All three found!'; const s = G.spots[k], d = Math.hypot(_gw.px - s.dig.x, _gw.py - s.dig.y); return `Clue ${k + 1} of ${G.spots.length}: ${s.clue}${d < 2 ? ' Very warm!' : d < 5 ? ' Warm.' : d < 10 ? ' Cool.' : ''}`; },
});
