/* ============================================================
   GARDEN DESIGNER, the strict rules. The owner, 1 Nov 2026: "make the designer a lot stricter so we don't have anything silly looking." Every number is in GDZ_STRICT.
   These rules run only when you draw or put something down yourself, in the designer. They never run on what is already there, on Put it back, or on a design from a friend or an old layout:
   what was placed before stays until it is moved, and gardenDesignClean still draws any design it can read. Only the reach rule in 94-garden-design-2tools.js checks an old layout.
   No DOM here. Each check gives back words a person can act on; snapping (gardenDesignAnchor, _gdzSnapNear in the tools) fixes most things before anyone reads them.
   ============================================================ */
const GDZ_STRICT = Object.freeze({
  snap: 2,                  // cells: a building or a decoration slides this far to the nearest spot that works
  path: Object.freeze({ snapEnd: 2, minLen: 2, step: 0.25, curlDeg: 210, curlSpan: 2, overlapGap: 0.45, overlapShare: 0.3, clearEnds: 0.9, joinPad: 17 }),
  building: Object.freeze({ gap: 1, sameKind: 8, doorToPath: 1, on: Object.freeze(['green', 'lane']) }),
  stand: Object.freeze({ gap: 1, sameKind: 3, besidePath: 1, crowdRadius: 3, crowdMax: 5, areaShare: 0.34, areaMin: 2 }),
  made: Object.freeze({ sign: 2, flag: 2, statue: 1 }),   // how many of each you can make in one piece of land
  signText: 16,             // letters on a new sign. (GDZ_LIMITS.text stays what a friend's older one may hold.)
  ground: Object.freeze({ patchMin: 5, compact: 0.3 }),
  plazaMiddle: 0.5,         // of a plaza's size: its middle, where nothing new stands
  protectGap: 1,            // cells kept clear round a landmark and a waterfall or brook
  // [x, y, half width in px, half depth in px], the paved plazas of the map
  heart: Object.freeze([25.6, 12.5, 138, 60]),
  // the places that make the map the map: they stay put
  landmarks: Object.freeze(['ld-cross', 'ld-statue', 'ld-stones', 'ld-tower', 'ld-chapel', 'ld-lighthouse', 'ld-temple', 'ld-folly', 'ld-falls', 'ld-mill', 'ld-ring', 'ld-barn', 'ld-boathouse', 'ld-grotto', 'ld-beacon', 'ld-wish', 'ld-labyrinth', 'ld-hut', 'ld-house', 'ld-treehouse', 'ld-hollow', 'ld-bridge', 'ld-rope', 'ld-sunk', 'ld-driftwood', 'ld-hide', 'ld-icehouse', 'ld-smoke', 'ld-arch-n', 'ld-arch-e', 'ld-arch-w', 'ld-arch-sw', 'ld-arch-se']),
  buildingKinds: Object.freeze(['shop', 'tackle', 'stall', 'board', 'hall', 'bench', 'lf-office']),
  besideArts: Object.freeze(['seat', 'lamp', 'picnic', 'finger']),    // on the map: what belongs beside a path
  besideEffects: Object.freeze(['sit', 'light']),                     // the same for decorations
  freeCats: Object.freeze(['path', 'fence']),                         // laid in rows on purpose: no spacing for these
  // colours that go together, as [main, trim] in GDZ_COLOURS: the only ones you can pick
  pairs: Object.freeze({ sign: Object.freeze([[0, 7], [0, 3], [0, 1], [0, 4], [2, 7], [8, 7]]), flag: Object.freeze([[1, 0], [4, 0], [3, 2], [2, 1], [5, 2], [9, 8]]), statue: Object.freeze([[6, 7], [6, 6], [0, 6], [8, 6]]) }),
  // what suits each kind of land (GARDEN_LAND_KINDS), so the colours of a place fit together
  groundByKind: Object.freeze({ green: Object.freeze(['grass', 'flowers', 'clover', 'bed', 'veg']), meadow: Object.freeze(['grass', 'flowers', 'clover', 'moss']), orchard: Object.freeze(['grass', 'flowers', 'clover', 'bark']), nursery: Object.freeze(['grass', 'clover', 'bark']), wood: Object.freeze(['moss', 'bark', 'grass']), dell: Object.freeze(['moss', 'bark', 'flowers']), rock: Object.freeze(['sand', 'slate', 'moss']), bed: Object.freeze(['bed', 'bark', 'flowers']), herb: Object.freeze(['bed', 'bark', 'slate']), berry: Object.freeze(['bed', 'bark', 'grass']), patch: Object.freeze(['veg', 'bed', 'bark']), veg: Object.freeze(['veg', 'bed', 'bark']), rich: Object.freeze(['veg', 'bed', 'bark']), pondedge: Object.freeze(['moss', 'sand', 'grass']), reed: Object.freeze(['moss', 'sand', 'grass']), glass: Object.freeze(['sand', 'slate', 'bark']), suntrap: Object.freeze(['sand', 'slate', 'bark']), exotic: Object.freeze(['sand', 'slate', 'moss']) }),
  groundOther: Object.freeze(['grass', 'flowers', 'bark']),
});
function _gdzsThe(name) { return String(name || 'that').replace(/^(The|An|A) /, (w) => w.toLowerCase()); }
function _gdzsPlazas() { return [GDZ_STRICT.heart].concat(GARDEN_LAND_SQUARES); }
/** How far into a plaza this point is: under 1 is on it, under GDZ_STRICT.plazaMiddle in its middle. */
function _gdzsPlazaAt(x, y) { const W = GARDEN_WORLD; let best = 9; for (const [cx, cy, rx, ry] of _gdzsPlazas()) best = Math.min(best, Math.hypot((x - cx) * W.cellW / rx, (y - cy) * W.cellH / ry)); return best; }

/* ---------- where the paths are ---------- */
/** Every point along a drawn path, about every quarter of a cell, in cells: {x, y, st, i}. */
function _gdzsSamples(draft) {
  const out = [];
  (draft.p || []).forEach((row, i) => {
    const ps = gardenDesignPts(row).map(([px, py]) => [px / GARDEN_WORLD.cellW, (py - GARDEN_WORLD.sky) / GARDEN_WORLD.cellH]);
    for (let k = 1; k < ps.length; k++) { const [ax, ay] = ps[k - 1], [bx, by] = ps[k], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / GDZ_STRICT.path.step)); for (let t = k === 1 ? 0 : 1; t <= n; t++) out.push({ x: ax + (bx - ax) * t / n, y: ay + (by - ay) * t / n, st: row[0], i }); }
  });
  return out;
}
/** Per cell: 0 nothing, 1 a trail, 2 the lane, 3 a plaza, 4 a drawn path, 5 a path laid as a decoration. */
function gardenDesignPathMask(draft, m) {
  const key = JSON.stringify(draft.p) + '|' + m.decor.length + '|' + m.decor.filter(d => d.def.cat === 'path').map(d => d.x + ',' + d.y).join(';');
  const C = gardenDesignPathMask;
  if (C.key === key) return C.mask;
  const W = GARDEN_WORLD, mask = new Uint8Array(W.cols * W.rows);
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) { const c = gardenLandCell(x, y); if (c && c.lane) mask[y * W.cols + x] = 2; else if (c && c.trail) mask[y * W.cols + x] = 1; else if (_gdzsPlazaAt(x + 0.5, y + 0.5) < 1 && !gardenIsWater(x, y)) mask[y * W.cols + x] = 3; }
  for (const s of _gdzsSamples(draft)) { const i = Math.floor(s.y) * W.cols + Math.floor(s.x); if (i >= 0 && i < mask.length) mask[i] = 4; }
  for (const d of m.decor) if (d.def.cat === 'path') mask[d.y * W.cols + d.x] = 5;
  C.key = key; C.mask = mask;
  return mask;
}
function _gdzsNearPath(mask, x, y, w, h, gap) {
  const W = GARDEN_WORLD;
  for (let cy = y - gap; cy < y + h + gap; cy++) for (let cx = x - gap; cx < x + w + gap; cx++) { if (cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows) continue; if (mask[cy * W.cols + cx]) return true; }
  return false;
}
/** The nearest place a path can start or end, within the snap: a door, then a drawn path, then a trail, the lane or a plaza. {x, y, what} or null. */
function gardenDesignAnchor(pt, draft, m) {
  if (!pt) return null;
  const W = GARDEN_WORLD, R = GDZ_STRICT.path.snapEnd, mask = gardenDesignPathMask(draft, m);
  let best = null, bd = 1e9;
  const see = (x, y, what, extra) => { const d = Math.hypot(x - pt.x, y - pt.y) + (extra || 0); if (d <= R && d < bd) { bd = d; best = { x, y, what }; } };
  for (const p of gardenPropsNow()) if (p.act && p.door && (!p.needs || gardenWorkOwned(p.needs))) see(p.door.x + 0.5, p.door.y + 0.5, `the door of ${_gdzsThe(p.name)}`, -0.3);
  for (const s of _gdzsSamples(draft)) see(s.x, s.y, 'your path');
  const cx0 = Math.floor(pt.x), cy0 = Math.floor(pt.y);
  for (let y = cy0 - R; y <= cy0 + R; y++) for (let x = cx0 - R; x <= cx0 + R; x++) { if (x < 0 || y < 0 || x >= W.cols || y >= W.rows) continue; const k = mask[y * W.cols + x]; if (k && k !== 4) see(Math.min(x + 1, Math.max(x, pt.x)), Math.min(y + 1, Math.max(y, pt.y)), k === 3 ? 'the plaza' : k === 2 ? 'the lane' : 'a path'); }
  return best;
}
/** A hand's wobble taken out, the two ends kept. */
function _gdzsSmooth(pts) {
  if (pts.length < 4) return pts.slice();
  return pts.map((p, i) => (i === 0 || i === pts.length - 1 ? p : [(pts[i - 1][0] + p[0] * 2 + pts[i + 1][0]) / 4, (pts[i - 1][1] + p[1] * 2 + pts[i + 1][1]) / 4]));
}
function _gdzsResample(pts, step) {
  const out = [pts[0].slice()]; let left = step;
  for (let k = 1; k < pts.length; k++) { let [ax, ay] = pts[k - 1]; const [bx, by] = pts[k]; let d = Math.hypot(bx - ax, by - ay); while (d >= left && d > 0) { const t = left / d; ax += (bx - ax) * t; ay += (by - ay) * t; out.push([ax, ay]); d = Math.hypot(bx - ax, by - ay); left = step; } left -= d; }
  const e = pts[pts.length - 1], l = out[out.length - 1]; if (Math.hypot(e[0] - l[0], e[1] - l[1]) > 0.01) out.push(e.slice());
  return out;
}
function _gdzsSegCross(a, b, c, d) { const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; }
/**
 * A path as drawn so far. {why, pts (smoothed, ends snapped: what would be laid), a, b (what each end joins, or null), bad ([x, y] where it goes wrong)}. The ghost shows all of it while you draw,
 * so the reason is on screen before you let go.
 */
function gardenDesignPathCheck(raw, draft, m) {
  const P = GDZ_STRICT.path, lv = m.level.level;
  let pts = _gdzsSmooth(raw);
  const a = gardenDesignAnchor({ x: pts[0][0], y: pts[0][1] }, draft, m), e = pts[pts.length - 1], b = gardenDesignAnchor({ x: e[0], y: e[1] }, draft, m);
  if (a) pts = [[a.x, a.y]].concat(pts.slice(1));
  if (b && pts.length > 1) pts = pts.slice(0, -1).concat([[b.x, b.y]]);
  const out = { why: '', pts, a, b, bad: [] }, line = _gdzsResample(pts, P.step);
  let len = 0; for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  const set = (why, at) => { if (!out.why) out.why = why; if (at) out.bad.push(at); };
  line.forEach((q, i) => {
    const cx = Math.floor(q[0]), cy = Math.floor(q[1]), fromEnd = Math.min(i, line.length - 1 - i) * P.step;
    if (gardenIsWater(cx, cy)) { set('A path cannot cross the water. Go round it.', q); return; }
    if (gardenAreaAt(cx, cy, lv).startsWith('locked:')) { const c = gardenLandCell(cx, cy); set(c && c.solid ? 'The trees are too thick for a path there.' : `${c ? c.name : 'That land'} is not yours yet.`, q); return; }
    const pr = gardenPropAt(cx, cy);
    if (pr && gardenPropCol(pr) === 'full' && fromEnd > P.clearEnds) set(`A path cannot go through ${_gdzsThe(pr.name)}. Go round it.`, q);
  });
  if (!out.why && len < P.minLen) set('That is too short for a path. Draw a bit further.');
  // curls and knots
  if (!out.why) {
    const c = _gdzsResample(pts, 0.5), n = Math.round(P.curlSpan / 0.5) * 2;
    for (let i = 1; i + 1 < c.length && !out.why; i++) {
      let turn = 0; for (let k = i; k + 1 < c.length && k < i + n; k++) { const t = Math.atan2(c[k + 1][1] - c[k][1], c[k + 1][0] - c[k][0]) - Math.atan2(c[k][1] - c[k - 1][1], c[k][0] - c[k - 1][0]); turn += Math.atan2(Math.sin(t), Math.cos(t)); }
      if (Math.abs(turn) * 180 / Math.PI > P.curlDeg) set('That curl is too tight. Make it a gentle bend.', c[i]);
    }
    for (let i = 0; i + 1 < c.length && !out.why; i++) for (let k = i + 2; k + 1 < c.length; k++) if (_gdzsSegCross(c[i], c[i + 1], c[k], c[k + 1])) { set('Your path crosses itself. Draw one clean line.', c[k]); break; }
  }
  // one material a stretch: it may meet another path, but not run along on top of it
  if (!out.why) {
    const S = _gdzsSamples(draft); let on = 0, all = 0;
    if (S.length) line.forEach((q, i) => { if (Math.min(i, line.length - 1 - i) * P.step < 1.5) return; all++; if (S.some(s => Math.hypot(s.x - q[0], s.y - q[1]) < P.overlapGap)) on++; });
    if (all && on / all > P.overlapShare) set('That runs on top of a path you already have. Keep to one path along a stretch.');
  }
  if (!out.why && (!a || !b)) {
    if (!a) out.bad.push(pts[0]); if (!b) out.bad.push(pts[pts.length - 1]);
    set(!b ? 'Keep going: a path has to end on another path, a plaza or a door.' : 'A path has to start on another path, a plaza or a door.');
  }
  return out;
}

/* ---------- what is protected ---------- */
function gardenDesignLandmark(id) { return GDZ_STRICT.landmarks.includes(id); }
function _gdzsProtected(x, y, w, h, selfId) {
  const G = GDZ_STRICT.protectGap;
  for (let cy = y; cy < y + h; cy++) for (let cx = x; cx < x + w; cx++) {
    if (_gdzsPlazaAt(cx + 0.5, cy + 0.5) < GDZ_STRICT.plazaMiddle) return 'The middle of a plaza stays open. Try nearer its edge.';
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (gardenIsWater(cx + dx, cy + dy)) return 'The water’s edge stays clear. Try a step back from it.';
    for (const brook of GARDEN_LAND_BROOKS) for (const [bx, by] of brook) if (Math.abs(bx - cx - 0.5) <= G + 0.5 && Math.abs(by - cy - 0.5) <= G + 0.5) return 'The brook and the falls stay as they are. Try further from them.';
  }
  for (const id of GDZ_STRICT.landmarks) {
    if (id === selfId) continue;
    const r = gardenDesignRow(id); if (!r) continue;
    if (x < r.x + (r.w || 1) + G && x + w > r.x - G && y < r.y + (r.h || 1) + G && y + h > r.y - G) return `${r.name} is a landmark, so it keeps some room round it.`;
  }
  return '';
}
/* ---------- what stands where ---------- */
/** 'landmark', 'building' or 'stand' for a fixed row. */
function gardenDesignClass(row) {
  if (gardenDesignLandmark(row.id)) return 'landmark';
  if (GDZ_STRICT.buildingKinds.includes(row.kind) || (gardenPropCol(row) === 'full' && (row.w || 1) >= 2)) return 'building';
  return 'stand';
}
function _gdzsOthers(m, self) {
  const out = [];
  for (const p of gardenPropsNow()) {
    if (p.walk || !p.kind && !/^dzc/.test(p.id) || p.id === self.id || (p.needs && !gardenWorkOwned(p.needs))) continue;
    const made = /^dzc/.test(p.id);
    out.push({ x: p.x, y: p.y, w: p.w || 1, h: p.h || 1, key: p.dz ? 'made-' + p.dz : p.kind || p.id, name: p.name, building: !made && gardenDesignClass(p) !== 'stand', free: false, made });
  }
  for (const d of m.decor) {
    if (d.uid === self.uid || d.def.layer === 'ground') continue;
    out.push({ x: d.x, y: d.y, w: d.def.w || 1, h: d.def.h || 1, key: d.def.id, name: d.def.name, building: false, free: GDZ_STRICT.freeCats.includes(d.def.cat), made: false });
  }
  return out;
}
const _gdzsDist = (a, b) => Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)), Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
/**
 * Can something new stand here? o: {cls 'building' | 'stand', x, y, w, h, key (what it is), name, beside (belongs by a path), free (a fence or a kerb), made ('sign'...), self: {id, uid}, madeList}. '' or why.
 */
function gardenDesignStandWhy(o, m, draft) {
  const S = GDZ_STRICT, me = { x: o.x, y: o.y, w: o.w, h: o.h }, mask = gardenDesignPathMask(draft, m), W = GARDEN_WORLD;
  if (o.free) return '';
  { const why = _gdzsProtected(o.x, o.y, o.w, o.h, o.self.id); if (why) return why; }
  for (let cy = o.y; cy < o.y + o.h; cy++) for (let cx = o.x; cx < o.x + o.w; cx++) {
    const k = mask[cy * W.cols + cx], c = gardenLandCell(cx, cy);
    if (k === 1 || k === 4 || k === 5) return `Keep the path clear: ${o.name} would stand on it.`;
    if (o.cls === 'building' && !(c && ((c.lane && S.building.on.includes('lane')) || (c.green && S.building.on.includes('green'))))) return `${o.name} needs the mown green or the lane. It does not suit ${c ? _gdzsThe(c.name) : 'this ground'}.`;
  }
  const others = _gdzsOthers(m, o.self), gap = o.cls === 'building' ? S.building.gap : S.stand.gap, same = o.cls === 'building' ? S.building.sameKind : S.stand.sameKind;
  for (const q of others) {
    if (q.free) continue;
    const d = _gdzsDist(me, q);
    if (d < gap) return `${o.name} is too close to ${_gdzsThe(q.name)}. Leave a gap.`;
    if (q.key === o.key && d < same) return `There is another just there. Keep the same things ${same} squares apart.`;
  }
  if (o.beside && !_gdzsNearPath(mask, o.x, o.y, o.w, o.h, S.stand.besidePath)) return `${o.name} belongs beside a path. Try right next to one.`;
  if (o.cls === 'stand') {
    const near = others.filter(q => !q.free && Math.hypot(q.x - o.x, q.y - o.y) <= S.stand.crowdRadius).length;
    if (near >= S.stand.crowdMax) return 'That spot is crowded already. Try somewhere with more room.';
    const c = gardenLandCell(o.x, o.y);
    if (c && !c.lane && !c.trail && c.cells) {
      const inArea = (q) => { const k = gardenLandCell(q.x, q.y); return k && k.id === c.id; }, here = others.filter(q => !q.free && inArea(q)), cap = Math.max(S.stand.areaMin, Math.floor(c.cells.length * S.stand.areaShare));
      if (here.length >= cap) return `${c.name} has as much as it can hold. Try another piece of land.`;
      if (o.made) { const lim = S.made[o.made] || 1, n = (draft.c || []).filter((q, i) => i !== o.self.madeI && GDZ_MADE[q[0]] && GDZ_MADE[q[0]].id === o.made && gardenLandCell(q[1], q[2]) === c).length; if (n >= lim) return `${c.name} has enough ${o.made === 'statue' ? 'statues' : o.made + 's'} already. Try another piece of land.`; }
    }
  }
  return '';
}

/* ---------- ground ---------- */
function gardenDesignGroundFor(c) { return (c && GDZ_STRICT.groundByKind[c.kind]) || GDZ_STRICT.groundOther; }
/** Can this ground go on this cell? '' or why. */
function gardenDesignPaintWhy(x, y, st, mask, lv) {
  const W = GARDEN_WORLD, c = gardenLandCell(x, y);
  if (gardenIsWater(x, y)) return 'Ground does not go on the water.';
  if (gardenAreaAt(x, y, lv).startsWith('locked:')) return 'Ground goes on your own land, and this is not yours yet.';
  if (mask[y * W.cols + x]) return 'Ground does not go on paths, the lane or a plaza.';
  { const pr = gardenPropAt(x, y); if (pr && gardenPropCol(pr) === 'full') return `${pr.name} is standing there.`; }
  if (st && !gardenDesignGroundFor(c).includes(st.id)) { const names = gardenDesignGroundFor(c).map(id => (GDZ_GROUND.find(g => g.id === id) || {}).name).filter(Boolean).join(', '); return `${st.name} does not suit ${_gdzsThe(c ? c.name : 'this land')}. Here you can use ${names}.`; }
  return '';
}
/** Whole patches: little holes filled, and a piece that is too small or too thin goes, with the reason. {cells (Map), why}. */
function gardenDesignPatchTidy(cells, added, st, ok) {
  const W = GARDEN_WORLD, G = GDZ_STRICT.ground, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]], at = (i, dx, dy) => { const x = i % W.cols + dx, y = (i - i % W.cols) / W.cols + dy; return x < 0 || y < 0 || x >= W.cols || y >= W.rows ? -1 : y * W.cols + x; };
  // little holes
  for (const i of [...added]) for (const [dx, dy] of nb) { const h = at(i, dx, dy); if (h < 0 || cells.get(h) === st || !ok(h)) continue; let n = 0; for (const [ex, ey] of nb) { const j = at(h, ex, ey); if (j >= 0 && cells.get(j) === st) n++; } if (n >= 3) { cells.set(h, st); added.add(h); } }
  // whole patches
  const seen = new Set(); let small = 0, thin = 0, kept = 0;
  for (const s of [...added]) {
    if (seen.has(s) || cells.get(s) !== st) continue;
    const comp = [], stack = [s]; seen.add(s);
    while (stack.length) { const i = stack.pop(); comp.push(i); for (const [dx, dy] of nb) { const j = at(i, dx, dy); if (j >= 0 && !seen.has(j) && cells.get(j) === st) { seen.add(j); stack.push(j); } } }
    const xs = comp.map(i => i % W.cols), ys = comp.map(i => (i - i % W.cols) / W.cols), box = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
    if (comp.length < G.patchMin) small++; else if (comp.length / box < G.compact) thin++;
    else { kept++; continue; }
    for (const i of comp) if (added.has(i)) cells.delete(i);
  }
  return { kept, why: !kept && small ? `That is too small to look right. A patch needs at least ${G.patchMin} squares of open ground.` : !kept && thin ? 'That looks like a scribble. Paint a whole soft patch instead.' : '' };
}
