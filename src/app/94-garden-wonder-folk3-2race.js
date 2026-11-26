/* ============================================================
   RACE YOU! (the folk3 plan, step 2). Pip comes over: "Race you to the sign!"; flags pop up beside the lane at a quarter, a half and
   three quarters of the way; "Ready... steady... go!"; the folk run the lanes beside you; three crates come up as a podium at the end.
   - THE COURSE: from where you stand to a thing of a finish kind (VALE_FINISH_KINDS: a sign, a milestone, a bell, a well...) in open
     land, along the folk's own lanes (the path service, found while everyone gathers, never during play): 1,600 to 6,500 px of path
     (about 6 to 25 s at your run), else 1,200 to 9,000; nothing in reach: "Not here!" and nothing starts. Seeded among the fitting ones,
     the one nearest 3,500 px first. Nothing named: any layout with a finish kind along its lanes works; one without, never offers it.
   - FLAGS stand on the verge beside the lane (never on the lane, a bridge, a plot, a doorway, or anything drawn), each a pennant on a
     pole with its foot in the grass; one that cannot be put anywhere is left out (the course still counts). A chequered flag beside
     the finish. People must pass the flags in order (grass shortcuts are allowed between them); the folk keep to the lanes.
   - THE FOLK RUN at VF3_RUN times their own pace, a little slower when well ahead of the best person and a little quicker when well
     behind (valeRaceBand), so you win a little over half the time. Pip stops once to look at the water if the course passes near it
     ("Ooh. A fish."); Quince is steady and never speeds up.
   - THE END: everyone in, or 20 s after the first finish, or the cap. Places by time, then by flags reached, then by how far along.
   ============================================================ */
const _VGR_TARGET = 3500;
/** Things a race could finish at, from a start: of a finish kind, in open land, 12 to 140 cells off, each with a place to stand. */
function _vgrFinishes(at) {
  const C = typeof _vfr !== 'undefined' && _vfr.ctx; if (!C) return [];
  const out = [];
  for (const t of C.things) {
    if (!VALE_FINISH_KINDS.includes(t.kind)) continue;
    const d = Math.hypot(t.x - at.x, t.y - at.y); if (d < 12 || d > 140) continue;
    if (C.open && !C.open(t)) continue;
    out.push({ t, d, px: Math.hypot((t.x - at.x) * GARDEN_WORLD.cellW, (t.y - at.y) * GARDEN_WORLD.cellH) });
  }
  return out;
}
/** Where a racer stops at the finish: the kind's own stand point, else the free ground just in front of it. */
function _vgrStand(t) {
  const C = _vfr.ctx;
  let s = null; try { const sp = C.spots(t); s = sp && sp.length ? sp[0].stand : null; } catch (e) { s = null; }
  if (s && (typeof _gwFree !== 'function' || _gwFree(s.x, s.y))) return { x: s.x, y: s.y };
  const f = typeof _gwNearestFreePt === 'function' ? _gwNearestFreePt(t.x, t.y + 0.7, 2) : null;
  return f || { x: t.x, y: t.y + 0.7 };
}
function _vgrLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot((pts[i].x - pts[i - 1].x) * GARDEN_WORLD.cellW, (pts[i].y - pts[i - 1].y) * GARDEN_WORLD.cellH); return L; }
/** A point a distance along a course (px), with the way it runs there. */
function _vgrAt(C, dist) {
  const P = C.pts, cum = C.cum;
  for (let i = 1; i < P.length; i++) if (cum[i] >= dist || i === P.length - 1) { const seg = cum[i] - cum[i - 1] || 1, k = Math.max(0, Math.min(1, (dist - cum[i - 1]) / seg)); return { x: P[i - 1].x + (P[i].x - P[i - 1].x) * k, y: P[i - 1].y + (P[i].y - P[i - 1].y) * k, dx: P[i].x - P[i - 1].x, dy: P[i].y - P[i - 1].y }; }
  return { x: P[0].x, y: P[0].y, dx: 1, dy: 0 };
}
/** How far along a course a point is (px): its nearest point on the course, searched near the last answer. */
function _vgrAlong(C, p, hint) {
  const P = C.pts, G = GARDEN_WORLD; let best = Infinity, at = 0;
  const i0 = Math.max(1, (hint || 0) - 6), i1 = Math.min(P.length - 1, (hint || 0) + 14);
  for (let pass = 0; pass < 2; pass++) {
    const a = pass ? 1 : i0, b = pass ? P.length - 1 : i1;
    for (let i = a; i <= b; i++) {
      const ax = P[i - 1].x, ay = P[i - 1].y, bx = P[i].x, by = P[i].y, vx = (bx - ax) * G.cellW, vy = (by - ay) * G.cellH, wx = (p.x - ax) * G.cellW, wy = (p.y - ay) * G.cellH, L2 = vx * vx + vy * vy || 1;
      const k = Math.max(0, Math.min(1, (wx * vx + wy * vy) / L2)), ex = wx - vx * k, ey = wy - vy * k, d = ex * ex + ey * ey;
      if (d < best) { best = d; at = C.cum[i - 1] + Math.sqrt(L2) * k; C.hint = i; }
    }
    if (best < 120 * 120) break;
  }
  return at;
}
/** Somewhere on the verge beside the course to stand a flag: off the lane if there is grass, never on a bridge, a plot, a doorway, or
 *  over anything drawn; null when there is nowhere. */
function _vgrFlagSpot(p, used) {
  const C = _vfr.ctx, n = Math.hypot(p.dx, p.dy) || 1, ux = -p.dy / n, uy = p.dx / n;
  const bad = (x, y) => {
    if (typeof _gwFree === 'function' && !_gwFree(x, y)) return true;
    if (C && typeof _vfrClearOfThings === 'function' && !_vfrClearOfThings(C, x, y, '', true)) return true;
    let c = null; try { c = gardenIslandBaseCell(x, y); } catch (e) { c = null; }
    if (c && (c.reservation === 'plot' || c.plot || c.bed || c.gateId)) return true;
    for (const t of C ? C.things : []) {
      if ((t.kind === 'bridge' || t.kind === 'crossing' || t.kind === 'ford') && Math.abs(t.x - x) < (t.w || 1) / 2 + 1.2 && Math.abs(t.y - y) < 1.6) return true;
      if (t.kind === 'building' && Math.abs(t.x - x) < 1.5 && y > t.y - 0.4 && y < t.y + 1.6) return true;
      // (the cloth flies a third of a cell to the right of the pole, at head height: clear of a lamp's lantern, a sign's arms, a post's top)
      if (_VGR_TALL.has(t.kind)) { let B = t; try { if (C.base) B = C.base(t); } catch (e) { B = t; } if (Math.abs(B.x - (x + 0.15)) < 1.25 && Math.abs(B.y - y) < 1.2) return true; }
    }
    for (const q of used) if (Math.hypot(q.x - x, q.y - y) < 2.5) return true;
    return false;
  };
  for (const off of [0.95, 1.2, 0.75, 1.5]) for (const s of [1, -1]) {
    const x = p.x + ux * off * s, y = p.y + uy * off * s * 0.85;
    if (bad(x, y)) continue;
    if (off < 0.9 || (typeof gardenTerrainAt === 'function' && gardenTerrainAt(x, y) !== 'path')) return { x, y };
  }
  return null;
}
const _VGR_FLAG_C = Object.freeze([['#d8452a', '#f4ead8'], ['#e8b830', '#7a3a1a'], ['#3a7ab8', '#f4ead8']]);
const _VGR_TALL = new Set(['lamp', 'signpost', 'post', 'maypole']);   // (kinds drawn tall and slender with a wide head: a flag keeps its cloth clear of them)
/** A race flag: a pennant on a pole, its foot in a tuft, a contact shadow; the cloth stirs (CSS on its own group). */
function _vgrFlagSvg(k, finish) {
  const H = typeof GARDEN_H === 'number' ? GARDEN_H : 41, h = Math.round(H * (finish ? 1.35 : 1.1)), c = _VGR_FLAG_C[k % 3];
  const cloth = finish
    ? `<g class="gvg-cloth" style="transform-origin:1px ${-h + 2}px"><path d="M1 ${-h + 1}h16v11h-16z" fill="#f6f2e6"/>${[0, 1, 2, 3].map(i => [0, 1].map(j => ((i + j) % 2 ? `<rect x="${1 + i * 4}" y="${-h + 1 + j * 5.5}" width="4" height="5.5" fill="#2a2622"/>` : '')).join('')).join('')}<path d="M1 ${-h + 1}h16" stroke="#fff" stroke-width=".6" opacity=".6"/></g>`
    : `<g class="gvg-cloth" style="transform-origin:1px ${-h + 2}px"><path d="M1 ${-h + 1}l15 4.6l-15 4.8z" fill="${c[0]}"/><path d="M1 ${-h + 1}l15 4.6l-7 .4z" fill="#ffffff" opacity=".22"/><circle cx="5.4" cy="${-h + 5.6}" r="1.6" fill="${c[1]}"/></g>`;
  return `<g class="gvg-flag"><ellipse cx="0.6" cy="0.8" rx="5.4" ry="1.7" fill="#2a2418" opacity=".28"/>`
    + `<path d="M-3.4 0.6q1 -3 2 -0.4M2.2 0.6q1.2 -3.2 2 -0.2M-1 0.8q.4 -2.2 1 -.2" stroke="#5f8a3a" stroke-width="1" fill="none" stroke-linecap="round"/>`
    + `<path d="M0 0V${-h}" stroke="#5a3e24" stroke-width="2.2" stroke-linecap="round"/><path d="M-.5 -1V${-h + 1}" stroke="#a07c52" stroke-width=".8" opacity=".8"/>`
    + `<circle cx="0" cy="${-h - 0.6}" r="1.6" fill="#d8b860"/>${cloth}</g>`;
}
function _vgrFlagsDraw(list, flags, finish) {
  if (typeof wdSprite !== 'function') return;
  flags.forEach((f, k) => list.push(wdSprite({ id: 'vg-flag-' + k, x: f.x, y: f.y, hit: 0.25, hitUp: 3, label: 'Flag ' + (k + 1), ground: true, svg: _vgrFlagSvg(k, false), lift: 0, update() { } })));
  if (finish) list.push(wdSprite({ id: 'vg-finish', x: finish.x, y: finish.y, hit: 0.25, hitUp: 3, label: 'The finish', ground: true, svg: _vgrFlagSvg(0, true), lift: 0, update() { } }));
}
/** A racer's own line along the course: each point moved a little to one side across the way it runs, where the feet can go there
 *  (else the course's own point), so two runners side by side never run inside each other. */
function _vgrLane(C, off) {
  const P = C.pts, out = [];
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i + 1] || P[i], dx = (b.x - a.x) * GARDEN_WORLD.cellW, dy = (b.y - a.y) * GARDEN_WORLD.cellH, n = Math.hypot(dx, dy) || 1;
    const q = { x: P[i].x + (-dy / n) * off, y: P[i].y + (dx / n) * off * 0.8 };
    out.push(typeof _gwFree !== 'function' || _gwFree(q.x, q.y) ? q : { x: P[i].x, y: P[i].y });
  }
  return out;
}
/** The course's first point nearest where you stand on a lane (within two cells), else where you stand. */
function _vgrStart(at) {
  for (let r = 0; r <= 2; r += 0.5) for (let k = 0; k < (r ? 8 : 1); k++) { const a = k / 8 * Math.PI * 2, x = at.x + Math.cos(a) * r, y = at.y + Math.sin(a) * r * 0.7; if (typeof gardenFolkTier === 'function' && gardenFolkTier(x, y) === 1 && (typeof _gwFree !== 'function' || _gwFree(x, y))) return { x, y }; }
  return { x: at.x, y: at.y };
}
valeGameAdd('race', {
  late: false,
  can(at) { return _vgrFinishes(at).length ? '' : 'Nowhere to race to round here.'; },
  askAt(at) { const L = _vgrFinishes(at).filter(c => c.px > 1200 && c.px < 4800).sort((a, b) => Math.abs(a.px - 2600) - Math.abs(b.px - 2600)); return L.length ? _vgKindName(L[0].t.kind) : ''; },
  finding() { return 'Finding a course...'; },
  setup(R, cb) {
    R.at = _vgrStart(R.at);
    // a starter, when one is about and not running (Bramble: "Ready... steady... go!"); he stands to one side of the start
    for (const id of _vgAbout(22)) { const g = (VALE_GAME_FOLK[id] || {}).race; if (!g || !g.starter || R.folk.includes(id) || R.helpers.includes(id)) continue; R.helpers.push(id); break; }   // (walked there with the rest: _vgGatherFolk)
    const cands = _vgrFinishes(R.at).sort((a, b) => Math.abs(a.px - _VGR_TARGET / 1.35) - Math.abs(b.px - _VGR_TARGET / 1.35)).slice(0, 12);
    if (!cands.length) { cb(false, VF3_SAY.noWhere); return; }
    let left = cands.length, done = false;
    const choose = () => {
      if (done) return; done = true;
      const G = R.G, rng = valeRng(R.seed), ok = (c, r) => c.len >= r[0] && c.len <= r[1];
      let pool = cands.filter(c => c.pts && ok(c, G.px)); if (!pool.length) pool = cands.filter(c => c.pts && ok(c, G.wide));
      if (!pool.length) { const near = cands.slice().sort((a, b) => a.d - b.d)[0]; cb(false, near ? VF3_SAY.notHere(_vgKindName(near.t.kind)) : VF3_SAY.noWhere); return; }
      pool.sort((a, b) => Math.abs(a.len - _VGR_TARGET) - Math.abs(b.len - _VGR_TARGET));
      const c = pool[Math.min(pool.length - 1, Math.floor(rng() * Math.min(3, pool.length)))];
      const pts = [{ x: R.at.x, y: R.at.y }].concat(c.pts), cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot((pts[i].x - pts[i - 1].x) * GARDEN_WORLD.cellW, (pts[i].y - pts[i - 1].y) * GARDEN_WORLD.cellH));
      const C = R.data.course = { pts, cum, len: cum[cum.length - 1], t: c.t, stand: c.stand, kind: c.t.kind, name: _vgKindName(c.t.kind), hint: 0 };
      // the flags at a quarter, a half and three quarters; the chequered flag beside the finish
      const used = [], flags = [];
      for (const k of [0.25, 0.5, 0.75]) { const p = _vgrAt(C, C.len * k), s = _vgrFlagSpot(p, used); if (s) { used.push(s); flags.push({ x: s.x, y: s.y, on: { x: p.x, y: p.y }, d: C.len * k }); } }
      C.flags = flags;
      const fe = _vgrAt(C, C.len - 1); C.finishFlag = _vgrFlagSpot({ x: C.stand.x, y: C.stand.y, dx: fe.dx, dy: fe.dy }, used);
      // where a racer passes near the water (Pip stops there once to look)
      C.wet = -1; for (let d = C.len * 0.2; d < C.len * 0.85; d += 40) { const p = _vgrAt(C, d); if (typeof _vfrWetAt === 'function' && (_vfrWetAt(p.x + 1.6, p.y) || _vfrWetAt(p.x - 1.6, p.y) || _vfrWetAt(p.x, p.y + 1.4) || _vfrWetAt(p.x, p.y - 1.4))) { C.wet = d; break; } }
      _vgrFlagsDraw(R.sprites, flags, C.finishFlag);
      cb(true);
    };
    for (const c of cands) {
      c.stand = _vgrStand(c.t);
      gardenFolkPathAsk(R.at, c.stand, (pts) => { c.pts = pts && pts.length ? pts : null; c.len = c.pts ? _vgrLen([R.at].concat(c.pts)) : 0; if (--left <= 0) choose(); });
    }
    setTimeout(() => { if (_vgm.R === R && !done) choose(); }, (R.G.gather - 2) * 1000);   // (whatever is found by then)
  },
  gather(R) {
    // the folk line up across the course, beside you, facing along it
    const C = R.data.course, p = C ? _vgrAt(C, 30) : null, n = p ? Math.hypot(p.dx, p.dy) || 1 : 1, ux = p ? -p.dy / n : 1, uy = p ? p.dx / n : 0;
    return R.folk.map((id, k) => { const s = (k % 2 ? -1 : 1) * (0.85 + 0.75 * Math.floor(k / 2)), want = { x: R.at.x + ux * s, y: R.at.y + uy * s * 0.8 }; return (typeof _gwFree !== 'function' || _gwFree(want.x, want.y)) ? want : _vgBeside(R.at, k + 1); });
  },
  ready(R) {
    const C = R.data.course; if (!C) return;
    const ahead = _vgrAt(C, 120);
    for (const id of R.folk) gardenFolkPose(id, 'ready', { x: ahead.x, y: ahead.y });
    for (const id of R.helpers) gardenFolkPose(id, 'point', { x: ahead.x, y: ahead.y });
    if (Math.hypot(_gw.px - R.at.x, _gw.py - R.at.y) > 2.2) { try { gardenWalkToPoint(R.at, null, { radius: 1 }); } catch (e) { /* walk yourself */ } }
    R.data.st = {};
  },
  readyLine(R, secs) { const C = R.data.course; return { line: 'To ' + (C ? C.name : 'the finish') + '. Follow the flags.', big: VF3_SAY.ready[Math.min(2, Math.floor(secs))] }; },
  go(R) {
    const C = R.data.course;
    for (const id of R.folk) {
      const row = VALE_GAME_FOLK[id] || {}, g = row.race || {}, V = _vf3V(id), k = R.folk.indexOf(id);
      const path = _vgrLane(C, (k % 2 ? -1 : 1) * (0.42 + 0.3 * Math.floor(k / 2))); path[path.length - 1] = { x: C.stand.x + (k - 1) * 0.55, y: C.stand.y + 0.25 };   // (each in a lane of their own, side by side at the end, never on one spot)
      gardenFolkDrive(id, { path, gait: 'r', speed: VF3_RUN * (g.pace || 1) * (V && V.row.speed || 1), by: 'game', noTalk: true, pass: true });
      R.data.st[id] = { pace: g.pace || 1, steady: !!g.steady, stop: g.stop === 'water' && C.wet > 0, fin: 0, along: 0, hint: 0 };
    }
    for (const p of R.people.values()) { p.n = 0; p.fin = 0; p.done = !!p.left; p.score = 0; p.along = 0; }
    try { const s = R.helpers.find(id => (VALE_GAME_FOLK[id] || {}).race && VALE_GAME_FOLK[id].race.starter); if (s) wdAmbient('“' + (vgLine(s, 'race', 'go') || 'Go!') + '”', 2400, 'folk'); else { const id = R.folk[0]; const t = id ? vgLine(id, 'race', 'go') : ''; if (t) wdAmbient('“' + t + '”', 2400, 'folk'); } } catch (e) { /* quiet */ }
  },
  tick(R, dt, now) {
    const C = R.data.course; if (!C) return;
    const t = (now - R.goT) / 1000, flags = C.flags;
    let bestAlong = 0, anyone = false;
    for (const p of R.people.values()) {
      if (p.left) continue; anyone = true;
      if (p.done) { bestAlong = Math.max(bestAlong, C.len); continue; }
      const at = _vgPos(p.w); if (!at) continue;
      C.hint = p.hint || 0; p.along = _vgrAlong(C, at, p.hint); p.hint = C.hint; bestAlong = Math.max(bestAlong, p.along);
      if (p.w === _vgMeSlot() || !p.claimed) {   // (a friend says when they reach a flag; their figure here counts too)
        if (p.n < flags.length && Math.hypot(at.x - flags[p.n].on.x, at.y - flags[p.n].on.y) < 1.6) { p.n++; R.dirty = true; if (p.w === _vgMeSlot()) { try { gardenSfx('tick'); } catch (e) { /* quiet */ } } }
        else if (p.n >= flags.length && Math.hypot(at.x - C.stand.x, (at.y - C.stand.y) * 1.2) < 1.4) { p.done = true; p.fin = t; p.score = Math.round(t * 10); R.dirty = true; if (!R.firstFin) R.firstFin = now; }
      }
    }
    for (const id of R.folk) {
      const st = R.data.st[id], V = _vf3V(id), D = gardenFolkDriven(id); if (!st || !V || !D) continue;
      if (st.fin) continue;
      C.hint = st.hint; st.along = _vgrAlong(C, V, st.hint); st.hint = C.hint;
      if (!D.to) { st.fin = t; if (!R.firstFin) R.firstFin = now; R.dirty = true; D.pose = 'cheer'; continue; }
      // Pip: once, the water (a fish!)
      if (st.stop && st.along >= C.wet) { st.stop = false; D.stop = now + 1700; D.pose = 'point'; const p = _vgrAt(C, C.wet); D.face = { x: p.x + (typeof _vfrWetAt === 'function' && _vfrWetAt(p.x + 1.6, p.y) ? 2 : -2), y: p.y }; if (Math.hypot(V.x - _gw.px, V.y - _gw.py) < 12) try { wdAmbient('“Ooh. A fish.”', 2000, 'folk'); } catch (e) { /* quiet */ } }
      if (D.stop && now >= D.stop) { D.stop = 0; D.pose = ''; D.face = null; }
      if (anyone) { const lead = (st.along - bestAlong) / GARDEN_WORLD.cellW; D.speed = VF3_RUN * st.pace * (V.row.speed || 1) * valeRaceBand(lead, st.steady); }
    }
  },
  act(R, w, ev, A) {
    const C = R.data.course, p = R.people.get(w); if (!C || !p || p.done) return false;
    const n = Number(ev.n) || 0, at = A && Number.isFinite(A.x) ? { x: A.x, y: A.y } : null; if (!at) return false;
    p.claimed = true;
    if (n === p.n && n < C.flags.length && Math.hypot(at.x - C.flags[n].on.x, at.y - C.flags[n].on.y) < 3.2) { p.n++; return true; }
    if (n === C.flags.length && p.n >= C.flags.length && Math.hypot(at.x - C.stand.x, at.y - C.stand.y) < 3.2) { const t = (performance.now() - R.goT) / 1000; if (t < C.len / 300) return false; p.done = true; p.fin = t; p.score = Math.round(t * 10); if (!R.firstFin) R.firstFin = performance.now(); return true; }   // (no faster than a run could do it)
    return false;
  },
  tap() { return true; },
  line(R, me) {
    const C = R.data.course, p = R.people.get(me); if (!C) return '';
    if (!p || p.left) return 'They’re off, to ' + C.name + '.';
    if (p.done) return 'You’re in! ' + (p.fin).toFixed(1) + ' s. Waiting for the others.';
    return p.n < C.flags.length ? `Flag ${p.n + 1} of ${C.flags.length}, then ${C.name}.` : 'Now ' + C.name + '!';
  },
  big(R) { return R.goT ? ((performance.now() - R.goT) / 1000).toFixed(1) : ''; },
  done(R) {
    const people = [...R.people.values()].filter(p => !p.left), folk = R.folk.map(id => R.data.st && R.data.st[id]).filter(Boolean);
    if (!people.length) return true;
    if (people.every(p => p.done) && folk.every(s => s.fin)) return true;
    return !!R.firstFin && performance.now() - R.firstFin > R.G.after * 1000;
  },
  result(R) {
    const C = R.data.course, rows = [];
    for (const p of R.people.values()) if (!p.left) rows.push({ w: p.w, fin: p.done ? p.fin : 0, n: p.n, along: p.along || 0 });
    for (const id of R.folk) { const s = R.data.st && R.data.st[id]; if (s) rows.push({ v: id, fin: s.fin, n: C ? C.flags.length : 0, along: s.along || 0 }); }
    rows.sort((a, b) => (a.fin ? 0 : 1) - (b.fin ? 0 : 1) || (a.fin && b.fin ? a.fin - b.fin : 0) || b.n - a.n || b.along - a.along);
    rows.forEach((r, k) => { r.place = k + 1; r.score = r.fin ? Math.round(r.fin * 10) : 0; r.words = r.fin ? r.fin.toFixed(1) + ' s' : 'still running'; });
    for (let k = 1; k < rows.length; k++) if (rows[k].fin && Math.abs(rows[k].fin - rows[k - 1].fin) < 0.05) { rows[k].place = rows[k - 1].place; rows[k].tie = rows[k - 1].tie = true; }
    // what they say: the winner, if one of the folk; else the first of the folk, beaten
    const top = rows[0]; if (top) { const id = top.v || R.folk[0]; const t = id ? vgLine(id, 'race', top.v ? 'win' : 'lose') : ''; if (t) setTimeout(() => { try { wdAmbient('“' + t + '”', 5000, 'folk'); } catch (e) { /* quiet */ } }, 900); }
    return rows;
  },
  best(mine) { return mine && mine.score ? mine.score : null; },
  words(score) { return score ? (score / 10).toFixed(1) + ' s' : 'still running'; },
  podium(R) { const C = R.data.course; return C ? C.stand : R.at; },
  wire(R) {
    const C = R.data.course; if (!C) return [];
    const enc = (p, k) => [k, Math.floor(p.x) * 100 + Math.floor(p.y), Math.min(9, Math.round((p.x % 1) * 9)) * 10 + Math.min(9, Math.round((p.y % 1) * 9))];
    const out = C.flags.map((f, k) => enc(f.on, k)); out.push(enc(C.stand, out.length));
    if (C.finishFlag) out.push(enc(C.finishFlag, 7)); C.flags.forEach((f, k) => { if (out.length < 8) out.push(enc(f, 4 + k)); });   // (the flags' own places last: 4, 5, 6; the chequered flag 7)
    return out.slice(0, 8);
  },
  /* ---------- a friend's screen ---------- */
  gStart(G) {
    const dec = (r) => ({ x: Math.floor(r[1] / 100) + Math.floor(r[2] / 10) / 9, y: (r[1] % 100) + (r[2] % 10) / 9 });
    const rows = G.l || [], on = rows.filter(r => r[0] < 4).map(dec), drawn = rows.filter(r => r[0] >= 4 && r[0] <= 6).map(dec), ff = rows.find(r => r[0] === 7);
    G.stand = on.length ? on[on.length - 1] : G.at; G.flags = on.slice(0, -1); G.myN = 0; G.sent = -1;
    _vgrFlagsDraw(G.sprites, drawn.length ? drawn : G.flags, ff ? dec(ff) : null);
    let near = null; try { near = (typeof gardenAffordThings === 'function' ? gardenAffordThings() : []).filter(t => VALE_FINISH_KINDS.includes(t.kind)).sort((a, b) => Math.hypot(a.x - G.stand.x, a.y - G.stand.y) - Math.hypot(b.x - G.stand.x, b.y - G.stand.y))[0]; } catch (e) { near = null; }
    G.name = near ? _vgKindName(near.kind) : 'the finish';
  },
  gFrame(G) {
    if (!G.joined || G.phase !== 2 || G.myN > G.flags.length) return;
    const n = G.myN, p = n < G.flags.length ? G.flags[n] : G.stand;
    if (Math.hypot(_gw.px - p.x, _gw.py - p.y) < (n < G.flags.length ? 1.6 : 1.4)) { G.myN++; try { gardenLiveFx('gm', 'act', { i: G.i, n, x: Math.floor(_gw.px), y: Math.floor(_gw.py) }); gardenSfx('tick'); } catch (e) { /* alone */ } }
  },
  gLine(G) { if (G.phase === 1) return 'To ' + (G.name || 'the finish') + '. Follow the flags.'; if (G.myN > G.flags.length) return 'You’re in! Waiting for the others.'; return G.myN < G.flags.length ? `Flag ${G.myN + 1} of ${G.flags.length}, then ${G.name}.` : 'Now ' + (G.name || 'the finish') + '!'; },
});
