/* ============================================================
   GARDEN LIFE, the engine (2.23). Reads GARDEN_CREATURES and GARDEN_LIFE_BEHAVIOURS and runs them; it never asks for an id, so a new creature is one row.

     gardenLifeSync(m)         after every paint of your garden (94-garden-world-0walk.js calls it): starts the life, refreshes what stands where
     gardenLifeStop()          leaving your garden: everyone goes
     gardenLifeVisit(svg, snap) / gardenLifeVisitStop()   a friend's garden: creatures from THEIR objects, in your own loop; nothing is sent, nothing is earned
     gardenLifeSpawn(id, o)    bring one now (an easter egg's guest, or a look in the console); returns the creature or null

   THE WORLD (W) is what a behaviour may ask: objects (gardenWorldObjects' rows plus {cat, effect, bloom, ripe, propKind}), find(selectors), cell / free (the one collision
   map, read from a copy refreshed with the model, because a behaviour may ask a hundred times), water(x, y), waterNear, view() (cells), player(), pets(), tod, season, rain, wet, snow, still.

   DEPTH. A sprite is a node in .gd-objects sorted by its row (gardenWorldAdd). On a surface it sorts just in front of what it stands on; a flyer rises over anything tall as it comes to
   that thing's row (a height map, _glClearance), so it never pops through a tree when it crosses in front of it. Where it lands is found by looking at the drawing itself (_glSurfaceOf),
   so a butterfly's feet are on the petal or the bench slat, not at a guess.

   COST. One creature is a handful of paths. Off-screen it is display: none and does nothing but age; a tab in the background stops the world's loop altogether. Reduced motion: they sit where they are, you can still say hello. Fun Off: none.
   ============================================================ */
const _gl = { on: false, W: null, list: new Set(), dir: null, tickT: 0, spawnT: 0, m: null, visit: null, seq: 0, dev: {} };
/* How much life there is. Owner's direction, 30 Oct 2026: it must not be excessive, so that it stays special. Usually two to four about, sometimes nobody; the rare ones really rare. Tune here. */
const GL_CAP = Object.freeze({ full: 6, subtle: 3, visit: 3 });   // never more than this at once
const GL_RARITY_ODDS = Object.freeze({ common: 1, uncommon: 0.45, rare: 0.06, epic: 0.015, legendary: 0.004 });
const GL_TUNE = Object.freeze({
  target: Object.freeze({ base: 2, perBloom: 12, bloomMax: 2 }),   // how many it aims for: base, and one more per so many plants in flower, up to bloomMax
  overChance: 0.02,                       // now and then one more than that
  firstIn: Object.freeze([3, 9]),         // seconds after you come in, the first arrival
  gap: Object.freeze([10, 26]),           // seconds between arrivals
  quiet: Object.freeze({ chance: 0.3, secs: Object.freeze([50, 130]) }),   // and sometimes a long quiet spell: a garden can simply be peaceful
  rarePerVisit: 1,                        // rare, epic and legendary together, on one visit
  eggs: Object.freeze({ perVisit: 1, chance: 0.5, firstAfter: Object.freeze([25, 100]) }),   // surprises: at most this many a visit, on about this share of visits, never the same one twice running
});
const _GL_RARE = new Set(['rare', 'epic', 'legendary']);

/* ---------- the world, from your model or a friend's snapshot ---------- */
function _glTagRows(rows, plantOf) {
  for (const o of rows) {
    if (o.kind === 'plant') { const p = plantOf(o.uid); if (!p) continue; o.cat = p.def.cat; o.ripe = !!p.ripe; o.stage = p.stage; o.bloom = p.stage >= 4 && ['flower', 'wild', 'water', 'exotic'].includes(p.def.cat); o.tree = p.def.cat === 'tree' && p.stage >= 3; }
    else if (o.kind === 'decor') { const d = gardenDecor(o.id); if (d) { o.cat = d.cat; o.effect = d.effect ? d.effect.kind : ''; } }
    else if (o.kind === 'prop') { const d = GARDEN_PROPS.find(x => x.id === o.id); o.propKind = d ? d.kind : ''; }
  }
  return rows;
}
function _glMatch(o, sel) {
  if (sel === 'bloom') return !!o.bloom;
  if (sel === 'plant') return o.kind === 'plant';
  if (sel === 'tree') return !!o.tree;
  if (sel === 'ripe') return !!o.ripe;
  if (sel === 'decor') return o.kind === 'decor';
  if (sel === 'prop') return o.kind === 'prop';
  const i = sel.indexOf(':'); if (i < 0) return false;
  const k = sel.slice(0, i), v = sel.slice(i + 1);
  return k === 'cat' ? o.cat === v : k === 'effect' ? o.effect === v : k === 'id' ? o.id === v : k === 'prop' ? o.propKind === v : false;
}
function _glMakeWorld(base) {
  const G = GARDEN_WORLD, W = Object.assign({ objects: [], hmap: new Float32Array(G.cols * G.rows), findCache: new Map(), taken: new Map(), byUid: new Map() }, base);
  W.setObjects = (rows) => {
    W.objects = rows; W.findCache.clear(); W.byUid = new Map(rows.map(o => [o.uid, o])); W.hmap.fill(0);
    for (const o of rows) { const x0 = Math.floor(o.x), x1 = Math.ceil(o.x + o.w), y0 = Math.floor(o.y), y1 = Math.ceil(o.y + o.h); for (let y = Math.max(0, y0); y < Math.min(G.rows, y1); y++) for (let x = Math.max(0, x0); x < Math.min(G.cols, x1); x++) { const i = y * G.cols + x; if (o.height > W.hmap[i]) W.hmap[i] = o.height; } }
  };
  W.find = (sels) => {
    const list = Array.isArray(sels) ? sels : [sels], key = list.join('|');
    let r = W.findCache.get(key);
    if (!r) { r = W.objects.filter(o => list.some(s => _glMatch(o, s))); W.findCache.set(key, r); }
    return r;
  };
  W.alive = (o) => { const n = W.byUid.get(o.uid); return !!n && n.x === o.x && n.y === o.y; };   // (a decoration that has been moved is somewhere else now)
  W.free = (x, y, r) => { const f = r == null ? 0.1 : r; return W.cell(Math.floor(x - f), Math.floor(y - f)) && W.cell(Math.floor(x + f), Math.floor(y - f)) && W.cell(Math.floor(x - f), Math.floor(y + f)) && W.cell(Math.floor(x + f), Math.floor(y + f)); };
  W.waterNear = (x, y, r) => {
    const R = r || 3; let best = null, bd = 1e9;
    for (let dy = -R; dy <= R; dy += 0.5) for (let dx = -R; dx <= R; dx += 0.5) {
      const px = x + dx, py = y + dy; if (!W.water(px, py) || !W.water(px + 0.3, py) || !W.water(px - 0.3, py) || !W.water(px, py + 0.3) || !W.water(px, py - 0.3)) continue;
      const d = dx * dx + dy * dy + Math.random() * 0.8; if (d < bd) { bd = d; best = { x: px, y: py }; }
    }
    return best;
  };
  return W;
}
function _glCamView() {
  const G = GARDEN_WORLD, c = typeof _gw !== 'undefined' && _gw.cam;
  if (!c || !c.w) return { x0: 0, y0: 0, x1: G.cols, y1: G.rows };
  return { x0: Math.max(0, c.x / G.cellW), y0: (c.y - G.sky) / G.cellH, x1: Math.min(G.cols, (c.x + c.w) / G.cellW), y1: Math.min(G.rows + 1, (c.y + c.h - G.sky) / G.cellH) };
}
function _glOwnWorld(m) {
  const G = GARDEN_WORLD;
  const W = _glMakeWorld({
    own: true, svg: null,
    cell: (x, y) => { const g = W.grid; return !!g && x >= 0 && y >= 0 && x < G.cols && y < G.rows && !g[y * G.cols + x]; },
    water: (x, y) => { const cx = Math.floor(x), cy = Math.floor(y); return cx >= 0 && cy >= 0 && cx < G.cols && cy < G.rows && gardenIsWater(cx, cy) && !String(gardenAreaAt(cx, cy, W.level)).startsWith('locked:'); },
    view: _glCamView,
    player: () => (typeof _gw !== 'undefined' && _gw.on ? { x: _gw.px, y: _gw.py, moving: !!_gw.moving, sneak: !!_gw.sneak || (_gw.keys && _gw.keys.has('shift')), face: _gw.face } : null),
    pets() {
      // your pets when they are out (97-pets-7roam.js), else the one that sits and follows you (motion off, or no roaming)
      const out = typeof petGardenPositions === 'function' ? petGardenPositions() : [];
      if (!out.length && typeof _gw !== 'undefined' && _gw.pet) out.push({ x: _gw.pet.x, y: _gw.pet.y, me: true, moving: !!_gw.pet.moving });
      return out;
    },
    add: (spec) => gardenWorldAdd(spec),
    cap: () => (gardenFun() === 'full' ? GL_CAP.full : GL_CAP.subtle),
  });
  _glOwnRefresh(W, m);
  return W;
}
function _glOwnRefresh(W, m) {
  W.m = m; W.tod = _gl.dev.tod || m.tod; W.season = _gl.dev.season || m.season; W.level = m.level.level; W.day = m.today; W.now = m.now;
  const raining = _gl.dev.rain != null ? _gl.dev.rain : !!m.rain.now;
  W.rain = raining; W.snow = _gl.dev.snow != null ? _gl.dev.snow : !!m.rain.snow; W.wet = raining || !!(m.rain.last && m.now - m.rain.last < 3 * 3600000);
  W.grid = _gwGrid(m); W.still = !!(window.Motion && Motion.prefersReduced && Motion.prefersReduced());
  W.setObjects(_glTagRows(gardenWorldObjects(m), (uid) => gardenPlantById(m, uid)).concat(_glPadRows({ areas: m.areas, season: W.season, rain: { snow: W.snow } })));
}
/** The lily pads painted on the water: somewhere to sit, like anything else in the garden. */
function _glPadRows(sc) {
  if (typeof gartLilyPads !== 'function') return [];
  return gartLilyPads(sc).map((q, i) => ({ kind: 'pad', uid: 'pad' + i, id: 'lily-pad', name: 'Lily pad', cat: 'water', x: q.x - 0.15, y: q.y - 0.15, w: 0.3, h: 0.3, z: q.y, height: 2, top: { x: q.x, y: q.y, lift: 0 }, node: () => null }));
}

/* ---------- moving: the helpers the behaviours are made of ---------- */
function _glClip(c, name) {
  const clips = c.art.clips, t = clips[name] != null ? clips[name] : (clips.rest || '');
  c.clip = name;
  if (c.tokens === t) return;
  c.tokens = t;
  if (c.artEl) c.artEl.setAttribute('data-clip', t);
}
function _glBounds(S) { const G = GARDEN_WORLD; S.x = Math.max(-3, Math.min(G.cols + 3, S.x)); S.y = Math.max(-3, Math.min(G.rows + 2, S.y)); }
function _glFaceFrom(c, vx) { if (Math.abs(vx) > 3) c.faceTo = vx > 0 ? 1 : -1; }
/** How high a flyer has to be here not to go through something tall as it crosses that thing's row. */
function _glClearance(W, x, y, vx, vy) {
  const G = GARDEN_WORLD; let h = 0;
  const look = (px, py) => { const cx = Math.floor(px), cy = Math.floor(py); for (let yy = cy; yy <= cy + 1; yy++) for (let xx = cx - 1; xx <= cx + 1; xx++) { if (xx < 0 || yy < 0 || xx >= G.cols || yy >= G.rows) continue; const v = W.hmap[yy * G.cols + xx]; if (v > h) h = v; } };
  look(x, y); look(x + vx * 0.55 / G.cellW, y + vy * 0.55 / G.cellH);
  return h ? h + 9 : 0;
}
/** One frame of flight towards a point, on soft curves. o: wobble (0..1, how much it wanders), arrive (slows and stops at it, with no bob), sharp (changes direction at once), keep (no slowing), near (it is meant to be close to things: no climbing over them). True on arrival. */
function _glFly(c, W, dt, tx, ty, tl, o) {
  o = o || {};
  const G = GARDEN_WORLD, S = c.S, dxp = (tx - S.x) * G.cellW, dyp = (ty - S.y) * G.cellH, d = Math.hypot(dxp, dyp) || 0.001;
  const base = (c.def.speed || 1) * G.cellW * (c.boost || 1);
  const sp = o.keep ? base : Math.min(base, (o.arrive ? 10 : 20) + d * 2.1);
  const wob = (o.wobble == null ? 0.25 : o.wobble) * Math.min(1, d / 70) * (0.9 * Math.sin(c.t * 2.3 + c.seed) + 0.55 * Math.sin(c.t * 5.3 + c.seed * 1.7));
  const cs = Math.cos(wob), sn = Math.sin(wob), ux = (dxp * cs - dyp * sn) / d, uy = (dxp * sn + dyp * cs) / d;
  const k = 1 - Math.exp(-dt * (o.sharp ? 16 : 4));
  c.vx += (ux * sp - c.vx) * k; c.vy += (uy * sp - c.vy) * k;
  S.x += c.vx * dt / G.cellW; S.y += c.vy * dt / G.cellH; _glBounds(S);
  let want = tl;
  if (!o.near && (!o.arrive || d > 44)) want = Math.max(tl, _glClearance(W, S.x, S.y, c.vx, c.vy));
  if (!o.arrive) want += Math.sin(c.t * (c.def.bob || 3.1) + c.seed) * (c.def.bobA == null ? 3 : c.def.bobA);
  { const dl = (want - S.lift) * (1 - Math.exp(-dt * (o.arrive && d < 40 ? 7 : 3.4))), cap = 130 * dt; S.lift += Math.max(-cap, Math.min(cap, dl)); }
  if (S.lift < 0) S.lift = 0;
  _glFaceFrom(c, c.vx);
  c.bank = Math.max(-16, Math.min(16, (c.vy * 0.1) * (c.vx >= 0 ? 1 : -1)));
  return d < (o.arrive ? 2.4 : 12);
}
function _glHover(c, dt, amp) {
  const S = c.S; c.vx *= Math.exp(-dt * 8); c.vy *= Math.exp(-dt * 8);
  S.x += (c.vx * dt + Math.sin(c.t * 7 + c.seed) * amp * dt * 2) / GARDEN_WORLD.cellW; S.lift += Math.sin(c.t * 5.1 + c.seed) * amp * dt * 5; c.bank = 0;
}
/** Off the thing it stands on: for a flyer the air; for walkers a little jump to the ground. It keeps sorting with what it stood on till it is clear. */
function _glTakeOff(c, W) {
  const was = c.perched; if (!was) return;
  c.perched = null; _glRelease(c, W); c.zHold = 1; c.mem0 = null;
  if (c.medium === 'ground' && was.lift > 0) {
    const q = _glFreeAround(W, c.S.x, c.S.y + 0.7, c.def.foot, 2.5) || { x: c.S.x, y: c.S.y + 0.6 };
    _glHopTo(c, q.x, q.y, Math.min(0.55, 0.3 + was.lift / 160), 8); _glClip(c, 'hop');
  } else if (c.medium === 'air') { c.vy = -28; _glClip(c, 'fly'); }
}
function _glSettle(c, s) {
  const S = c.S; S.x = s.x; S.y = s.y; S.lift = s.lift; S.z = s.obj ? s.obj.z + 0.01 : null; c.vx = c.vy = 0; c.bank = 0; c.zHold = 0;
  c.perched = s; c.mem0 = null; c.hop = null;
  _glClip(c, 'rest');
}
/* ---------- on the ground: a route round things, and hops ---------- */
function _glFreeAround(W, x, y, foot, r) {
  const f = foot == null ? 0.15 : foot, R = r || 2; let best = null, bd = 1e9;
  for (let dy = -R; dy <= R; dy += 0.25) for (let dx = -R; dx <= R; dx += 0.25) {
    const d = dx * dx + dy * dy * 2.2; if (d >= bd || !W.free(x + dx, y + dy, f) || x + dx < 0.4 || y + dy < 0.4) continue;
    bd = d; best = { x: x + dx, y: y + dy };
  }
  return best;
}
function _glFreeNear(c, W, range) {
  const f = c.def.foot, S = c.S;
  for (let i = 0; i < 16; i++) { const a = Math.random() * 6.283, r = range * (0.4 + Math.random() * 0.6), x = S.x + Math.cos(a) * r, y = S.y + Math.sin(a) * r * 0.75; if (x > 0.4 && y > 0.4 && W.free(x, y, f) && _glLos(W, S.x, S.y, x, y, f)) return { x, y }; }
  return null;
}
function _glLos(W, ax, ay, bx, by, f) {
  const G = GARDEN_WORLD, n = Math.max(1, Math.ceil(Math.hypot((bx - ax) * G.cellW, (by - ay) * G.cellH) / 6));
  for (let i = 1; i <= n; i++) { const t = i / n; if (!W.free(ax + (bx - ax) * t, ay + (by - ay) * t, f)) return false; }
  return true;
}
/** A route over the cells within reach, cut straight wherever the feet can go straight. Small on purpose: nothing here walks far. */
function _glBfs(W, sx, sy, tx, ty, f) {
  const G = GARDEN_WORLD, R = 16, scx = Math.floor(sx), scy = Math.floor(sy), tcx = Math.floor(tx), tcy = Math.floor(ty);
  if (Math.abs(scx - tcx) > R || Math.abs(scy - tcy) > R) return null;
  const size = R * 2 + 1, seen = new Int16Array(size * size).fill(-1), idx = (x, y) => (y - scy + R) * size + (x - scx + R);
  const q = [[scx, scy]]; seen[idx(scx, scy)] = 0; let head = 0, found = false;
  const steps = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (head < q.length && head < 900) {
    const [x, y] = q[head++];
    if (x === tcx && y === tcy) { found = true; break; }
    for (let k = 0; k < 8; k++) {
      const nx = x + steps[k][0], ny = y + steps[k][1]; if (Math.abs(nx - scx) > R || Math.abs(ny - scy) > R) continue;
      const i = idx(nx, ny); if (seen[i] >= 0 || !W.cell(nx, ny)) continue;
      if (k >= 4 && (!W.cell(x + steps[k][0], y) || !W.cell(x, y + steps[k][1]))) continue;
      seen[i] = k + 1; q.push([nx, ny]);
    }
  }
  if (!found) return null;
  const cells = []; let x = tcx, y = tcy, guard = 0;
  while (!(x === scx && y === scy) && guard++ < 200) { cells.push({ x: x + 0.5, y: y + 0.5 }); const st = steps[seen[idx(x, y)] - 1]; x -= st[0]; y -= st[1]; }
  cells.reverse();
  if (cells.length) cells[cells.length - 1] = { x: tx, y: ty }; else cells.push({ x: tx, y: ty });
  const out = []; let at = { x: sx, y: sy }, i = 0;
  while (i < cells.length) { let j = cells.length - 1; while (j > i && !_glLos(W, at.x, at.y, cells[j].x, cells[j].y, f)) j--; out.push(cells[j]); at = cells[j]; i = j + 1; }
  return out;
}
function _glRouteTo(c, W, x, y) {
  const f = c.def.foot, S = c.S;
  if (_glLos(W, S.x, S.y, x, y, f)) { c.path = [{ x, y }]; return true; }
  const p = _glBfs(W, S.x, S.y, x, y, f);
  c.path = p || []; return !!p;
}
function _glRouteToFoot(c, W, o) {
  const f = c.def.foot, q = _glFreeAround(W, o.x + o.w / 2, o.y + o.h + 0.25, f, o.cat === 'water' ? 5 : 1.6);   // what floats: the nearest bank
  return q ? _glRouteTo(c, W, q.x, q.y) : false;
}
/** A frame along the route, going round what is in the way; true when it is done. */
function _glFollow(c, W, dt, speed) {
  const G = GARDEN_WORLD, S = c.S, f = c.def.foot;
  if (!c.path || !c.path.length) return true;
  const t = c.path[0], dxp = (t.x - S.x) * G.cellW, dyp = (t.y - S.y) * G.cellH, d = Math.hypot(dxp, dyp), step = speed * G.cellW * dt;
  if (d <= Math.max(step, 0.8)) { S.x = t.x; S.y = t.y; c.path.shift(); return !c.path.length; }
  const nx = S.x + dxp / d * step / G.cellW, ny = S.y + dyp / d * step / G.cellH;
  _glFaceFrom(c, dxp);
  if (W.free(nx, ny, f)) { S.x = nx; S.y = ny; c.stuck = 0; return false; }
  if (W.free(nx, S.y, f)) { S.x = nx; return false; }
  if (W.free(S.x, ny, f)) { S.y = ny; return false; }
  // something new is in the way: plan again, or give up and stand there
  c.stuck = (c.stuck || 0) + 1;
  const end = c.path[c.path.length - 1];
  if (c.stuck > 2 || !_glRouteTo(c, W, end.x, end.y)) { c.path = []; return true; }
  return false;
}
function _glHopTo(c, x, y, dur, h) { const S = c.S; c.hop = { x0: S.x, y0: S.y, l0: S.lift || 0, x1: x, y1: y, t: 0, d: dur, h }; _glFaceFrom(c, (x - S.x) * 100); }
/** True when the hop lands. */
function _glHopStep(c, W, dt) {
  const H = c.hop, S = c.S; if (!H) return true;
  H.t = Math.min(1, H.t + dt / H.d);
  const f = H.t;
  S.x = H.x0 + (H.x1 - H.x0) * f; S.y = H.y0 + (H.y1 - H.y0) * f; S.lift = H.l0 * (1 - f) + Math.sin(f * Math.PI) * H.h;
  if (f < 1) return false;
  S.lift = 0; c.hop = null; if (c.zHold) c.zHold = 0.01;
  if (c.medium === 'ground' && c.onScreen && (W.wet || W.rain) && c.def.foot > 0.1) { /* a tiny splash could go here */ }
  return true;
}
function _glHopSpot(c, W, p) {
  const f = c.def.foot, S = c.S, R = p.range || 2.4;
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * 6.283, r = R * (0.3 + Math.random() * 0.45), x = S.x + Math.cos(a) * r, y = S.y + Math.sin(a) * r * 0.7;
    if (!W.free(x, y, f) || x < 0.4 || y < 0.4 || !_glLos(W, S.x, S.y, x, y, f)) continue;
    if (p.nearWater && !W.waterNear(x, y, 2.5) && i < 9) continue;
    return { x, y };
  }
  return null;
}
function _glSwim(c, W, dt, tx, ty, speed) {
  const G = GARDEN_WORLD, S = c.S, dxp = (tx - S.x) * G.cellW, dyp = (ty - S.y) * G.cellH, d = Math.hypot(dxp, dyp) || 1, step = speed * G.cellW * dt;
  const nx = S.x + dxp / d * step / G.cellW, ny = S.y + dyp / d * step / G.cellH;
  _glFaceFrom(c, dxp);
  if (W.water(nx, ny)) { S.x = nx; S.y = ny; } else { c.mem.tx = 0; }
}
function _glEnterWater(c, W) { c.medium = 'water'; c.S.lift = 0; c.path = []; _glFx(c.S.x, c.S.y, 'splash'); c.medEl = true; _glSyncMedium(c); void W; }
function _glLeaveWater(c) { c.medium = 'ground'; _glFx(c.S.x, c.S.y, 'splash'); _glSyncMedium(c); }
function _glSyncMedium(c) { if (c.node) c.node.setAttribute('data-med', c.medium); }
function _glShoreNear(c, W) { return _glFreeAround(W, c.S.x, c.S.y, c.def.foot, 4); }
function _glDartNext(c, W) {
  const m = c.mem, S = c.S, a = Math.random() * 6.283, r = _glR(1.2, 3.4);
  let x = S.x + Math.cos(a) * r, y = S.y + Math.sin(a) * r * 0.7;
  if (m.over === 'water') { const q = W.waterNear(x, y, 2.5); if (q) { x = q.x; y = q.y; } }
  m.x = x; m.y = y; m.tl = Math.max(8, (c.def.alt || 24) + _glR(-6, 14));
}
function _glExitPoint(c, W) {
  const v = W.view(), S = c.S, far = [[v.x0 - 1.5, S.y], [v.x1 + 1.5, S.y], [S.x, v.y0 - 1], [S.x, v.y1 + 1]];
  far.sort((a, b) => _glDist(a[0], a[1], S.x, S.y) - _glDist(b[0], b[1], S.x, S.y));
  for (const p of far) { const q = _glFreeAround(W, Math.max(0.5, Math.min(GARDEN_WORLD.cols - 0.5, p[0])), Math.max(0.5, Math.min(GARDEN_WORLD.rows - 0.5, p[1])), c.def.foot, 3); if (q) return q; }
  return null;
}
/* ---------- surfaces ---------- */
function _glNearestOf(c, W, sels, r) {
  let best = null, bd = r * r;
  for (const o of W.find(sels)) { const dx = o.top.x - c.S.x, dy = (o.top.y - c.S.y) * 0.8, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = o; } }
  return best;
}
function _glCap(o) { return o.kind === 'plant' ? (o.tree ? 3 : 1) : Math.max(1, Math.round(o.w)); }
function _glInReach(c, o, p) { return !p.reach || _glDist(o.top.x, o.top.y, c.S.x, c.S.y) <= p.reach; }
function _glCanLand(c, W, p) { const v = W.view(); return W.find(p.on).some(o => _glInView(o.top, v, 3) && _glInReach(c, o, p) && (W.taken.get(o.uid) || 0) < _glCap(o)); }
function _glInView(pt, v, m) { return pt.x > v.x0 - m && pt.x < v.x1 + m && pt.y > v.y0 - m && pt.y < v.y1 + m; }
function _glPickSurface(c, W, p) {
  const v = W.view(), m = c.def.start === 'in-place' && !c.t ? 2 : 3;
  const cand = W.find(p.on).filter(o => _glInView(o.top, v, m) && _glInReach(c, o, p) && (W.taken.get(o.uid) || 0) < _glCap(o));
  if (!cand.length) return null;
  // nearer is likelier, not certain: they don't all pile onto the first thing they see
  cand.sort((a, b) => _glDist(a.top.x, a.top.y, c.S.x, c.S.y) - _glDist(b.top.x, b.top.y, c.S.x, c.S.y));
  const o = cand[Math.floor(Math.pow(Math.random(), 2) * Math.min(cand.length, 6))];
  return _glSurfaceOf(o, W);
}
function _glReserve(c, W, s) { _glRelease(c, W); c.slot = s.obj.uid; W.taken.set(c.slot, (W.taken.get(c.slot) || 0) + 1); }
function _glRelease(c, W) { if (!c.slot) return; const n = (W.taken.get(c.slot) || 1) - 1; if (n > 0) W.taken.set(c.slot, n); else W.taken.delete(c.slot); c.slot = null; }
/**
 * Where on this thing something could stand, by looking at the drawing: straight down at a few places across it till it meets paint. Filled shapes and thick strokes count; shadows and glows don't.
 * Returns {x, y, lift, obj}: y stays just inside its footprint (so sorting is right), lift is how far up the drawn surface is.
 */
function _glSurfaceOf(o, W) {
  const G = GARDEN_WORLD, fallback = { x: o.top.x, y: o.top.y, lift: o.top.lift, obj: o };
  let node = null; try { node = o.node && o.node(); } catch (e) { node = null; }
  if (!node || !node.getBBox) return fallback;
  try {
    const svg = node.ownerSVGElement, inv0 = svg.getScreenCTM().inverse(), toStage = (el) => inv0.multiply(el.getScreenCTM());
    const nm = toStage(node), bb = node.getBBox(), pt = svg.createSVGPoint();
    const corner = (x, y) => { pt.x = x; pt.y = y; return pt.matrixTransform(nm); };
    const a = corner(bb.x, bb.y), b = corner(bb.x + bb.width, bb.y + bb.height);
    const left = Math.min(a.x, b.x), right = Math.max(a.x, b.x), top = Math.min(a.y, b.y), bot = Math.max(a.y, b.y), H = bot - top;
    if (!(H > 2)) return fallback;
    const shapes = [];
    for (const el of node.querySelectorAll('path,ellipse,circle,rect,polygon')) {
      if (shapes.length > 70) break;
      if (el.closest('.gda-glow,.gd-halo')) continue;
      if (Number(el.getAttribute('opacity') || 1) < 0.5 || Number(el.getAttribute('fill-opacity') || 1) < 0.5) continue;
      const fill = el.getAttribute('fill'), stroke = el.getAttribute('stroke');
      const m = toStage(el).inverse();
      shapes.push({ el, m, fill: fill !== 'none', stroke: !!stroke && Number(el.getAttribute('stroke-width') || 1) >= 1.2 });
    }
    const hits = [], step = Math.max(1.5, Math.min(4, H / 26)), xs = 7, ground = G.sky + o.top.y * G.cellH;
    for (let i = 0; i < xs; i++) {
      const sx = left + (right - left) * (0.16 + 0.68 * (i + 0.5) / xs);
      for (let sy = top; sy < top + H * 0.72; sy += step) {
        let hit = false;
        for (const s of shapes) {
          pt.x = sx; pt.y = sy; const lp = pt.matrixTransform(s.m);
          if ((s.fill && s.el.isPointInFill && s.el.isPointInFill(lp)) || (s.stroke && s.el.isPointInStroke && s.el.isPointInStroke(lp))) { hit = true; break; }
        }
        if (hit) { hits.push({ x: sx, y: sy }); break; }
      }
    }
    if (!hits.length) return fallback;
    // a seat or anything with a chosen height: the catalogue's share of the height wins when it is lower than the very top (the back of a bench is not its seat)
    const share = o.top.lift && o.height ? o.top.lift / o.height : 0.9;
    hits.sort((p, q) => p.y - q.y);
    const pool = hits.slice(0, Math.max(1, Math.ceil(hits.length * 0.6))), h = pool[Math.floor(Math.random() * pool.length)];
    let lift = ground - h.y;
    if (share < 0.8 && o.effect) lift = Math.max(6, Math.min(lift, ground - (bot - H * share)));
    return { x: h.x / G.cellW, y: o.top.y, lift: Math.max(0, lift), obj: o };
  } catch (e) { return fallback; }
}
/** One frame of coming in to land; true when it is down. The last stretch is slow, and it sorts with what it is landing on from here. */
function _glArrive(c, W, dt, s) {
  const d = _glDist(c.S.x, c.S.y, s.x, s.y);
  if (d < 1.3) c.S.z = s.obj.z + 0.01;
  _glFly(c, W, dt, s.x, s.y, s.lift, { arrive: d < 3, wobble: d > 2 ? 0.8 : 0.1 });
  return d < 0.07 && Math.abs(c.S.lift - s.lift) < 2.4;
}
/* ---------- being scared ---------- */
function _glStartle(c, W, tx, ty, p) {
  c.mem.t = 0; c.mem.from = { x: tx, y: ty }; c.mem.action = p.action || (c.medium === 'air' ? 'fly' : c.medium === 'water' ? 'paddle' : 'run');
  c.path = [];
  const S = c.S, ang = Math.atan2((S.y - ty) * 0.8, S.x - tx) + _glR(-0.5, 0.5);
  if (c.medium === 'air') {
    _glTakeOff(c, W); c.boost = 1.9; const r = _glR(4, 7); c.mem.x = S.x + Math.cos(ang) * r; c.mem.y = S.y + Math.sin(ang) * r * 0.7; c.mem.tl = Math.max(50, (c.def.alt || 30) * 1.7); _glClip(c, 'fly');
    if (c.onScreen) _glFx(S.x, S.y - S.lift / GARDEN_WORLD.cellH, 'flurry');
  } else if (c.mem.action === 'hide') { if (c.perched && c.perched.lift > 0) { /* it holds on */ } _glClip(c, 'hide'); c.mem.quiet = 0; if (c.onScreen) _glMark(c, 'bang'); }
  else if (c.mem.action === 'dive' && !c.perched) {
    const q = W.waterNear(S.x, S.y, 3.5);
    if (q) { _glHopTo(c, q.x, q.y, 0.42, 13); _glClip(c, 'hop'); c.mem.diving = true; }
    else c.mem.action = 'run';
  }
  if (c.mem.action === 'run') {
    _glTakeOff(c, W);
    const r = _glR(3, 6); let got = false;
    for (let i = 0; i < 8 && !got; i++) { const a = ang + i * 0.5 * (i % 2 ? 1 : -1), x = S.x + Math.cos(a) * r, y = S.y + Math.sin(a) * r * 0.7; if (x > 0.4 && y > 0.4 && W.free(x, y, c.def.foot)) got = _glRouteTo(c, W, x, y); }
    c.mem.go = got; _glClip(c, 'run');
    if (c.onScreen) _glMark(c, 'bang');
  } else if (c.mem.action === 'paddle') { c.mem.tx = 0; const q = W.waterNear(S.x + Math.cos(ang) * 3, S.y + Math.sin(ang) * 2, 2); if (q) { c.mem.tx = q.x; c.mem.ty = q.y; } _glClip(c, 'swim'); }
  // one goes, they all go
  const tag = c.def.tags && c.def.tags[0];
  if (tag) for (const n of _gl.list) if (n !== c && n.def.tags && n.def.tags[0] === tag && !n.scared && !n.left && _glDist(n.S.x, n.S.y, S.x, S.y) < 3.5) n.alarm = { t: _glR(0.1, 0.55), x: tx, y: ty };
  c.scared = 0;
}
function _glFleeStep(c, W, dt, p) {
  c.mem.t += dt;
  const a = c.mem.action;
  if (a === 'fly') return _glFly(c, W, dt, c.mem.x, c.mem.y, c.mem.tl, { keep: true, wobble: 0.5 }) || c.mem.t > 4;
  if (a === 'run') { if (c.mem.go) return _glFollow(c, W, dt, Math.max(1.2, (c.def.speed || 0.6) * 2.2)) || c.mem.t > 5; return c.mem.t > 0.5; }
  if (a === 'paddle') { if (c.mem.tx) _glSwim(c, W, dt, c.mem.tx, c.mem.ty, 1.2); return c.mem.t > 2.2; }
  if (a === 'dive') { if (c.mem.diving) { c.mem.diving = false; _glEnterWater(c, W); _glClip(c, 'hide'); } return c.mem.t > 2.5; }
  // hide: stay tucked in till all has been quiet for a moment
  const P = W.player(), R = (p.r || 1.5) * 1.5;
  const near = (P && _glDist(c.S.x, c.S.y, P.x, P.y) < R) || W.pets().some(q => _glDist(c.S.x, c.S.y, q.x, q.y) < R);
  c.mem.quiet = near ? 0 : c.mem.quiet + dt;
  return c.mem.quiet > 2.2 || c.mem.t > 30;
}
function _glFleeStop(c, W, p) { c.boost = 1; c.scared = p && p.action === 'hide' ? 1 : 2.5; _glClip(c, 'rest'); }
function _glScareOne(v, W, x, y) {
  const name = (v.brain || []).find(b => b.name.startsWith('startled-by'));
  if (!name || v.scared > 0 || v.hidden) return;
  v.scareAt = { x, y };
  _glSwitch(v, name, { x, y });
}
function _glPrey(c, W, p) {
  const r = p.r || 3; let best = null, bd = r;
  for (const n of _gl.list) { if (n === c || n.left || n.hidden || !n.def.tags || !n.def.tags.includes(p.tag)) continue; const d = _glDist(n.S.x, n.S.y, c.S.x, c.S.y); if (d < bd) { bd = d; best = n; } }
  return best;
}
function _glSink(c, f) { c.sink = f; }

/* ---------- the brain ---------- */
function _glParseBrain(def) {
  const out = [];
  for (const b of def.behaviours || []) { const name = Array.isArray(b) ? b[0] : b, p = (Array.isArray(b) && b[1]) || {}, B = GARDEN_LIFE_BEHAVIOURS[name]; if (B) out.push({ name, p, B }); else console.warn('[garden life] no behaviour', name); }
  return out;
}
function _glSwitch(c, b, scare) {
  const W = _gl.W;
  if (c.cur) { try { if (c.cur.B.stop) c.cur.B.stop(c, W, c.cur.p); } catch (e) { console.error('[garden life]', e); } }
  c.cur = b; c.mem = {};
  if (!b) return;
  try {
    if (scare && b.name.startsWith('startled-by')) _glStartle(c, W, scare.x, scare.y, b.p);
    else b.B.start(c, W, b.p);
  } catch (e) { console.error('[garden life]', c.def.id, b.name, e); c.cur = null; }
}
function _glThink(c, W) {
  if (c.perched && c.mem0 && c.mem0.rested && c.medium === 'ground') _glTakeOff(c, W);
  let total = 0; const cand = [];
  for (const b of c.brain) { if (b.B.reflex) continue; let w = 0; try { w = b.B.want(c, W, b.p) || 0; } catch (e) { console.error('[garden life]', e); } if (w > 0) { cand.push([b, w]); total += w; } }
  if (!cand.length) {
    // nothing it would rather do: it sits a while, and if it is up on something, gets down afterwards
    if (c.perched) c.mem0 = { rested: true };
    else if (c.medium === 'air') c.leaving = true;
    c.idle = _glR(2, 6); _glClip(c, c.medium === 'air' && !c.perched ? 'fly' : 'rest'); return;
  }
  let r = Math.random() * total, pick = cand[0][0];
  for (const [b, w] of cand) { r -= w; if (r <= 0) { pick = b; break; } }
  _glSwitch(c, pick);
}
function _glStep(c, dt, W) {
  c.t += dt; c.age += dt;
  if (c.calm > 0) c.calm -= dt;
  if (c.scared > 0) c.scared -= dt;
  if (c.greeted > 0) c.greeted -= dt;
  if (c.reacting > 0) { c.reacting -= dt; if (c.reacting <= 0) { _glClip(c, c.after || 'rest'); c.after = ''; } }
  if (c.alarm) { c.alarm.t -= dt; if (c.alarm.t <= 0) { const a = c.alarm; c.alarm = null; _glScareOne(c, W, a.x, a.y); } }
  if (c.hop) { _glHopStep(c, W, dt); if (c.hop) return; }   // a hop always finishes: behaviours only ever see it on the ground
  if (c.reacting > 0) return;
  // reflexes first: they interrupt anything
  for (const b of c.reflexes) {
    if (c.cur === b) continue;
    if (c.cur && c.cur.B.reflex && c.cur.name.startsWith('leave')) break;
    let w = 0; try { w = b.B.want(c, W, b.p); } catch (e) { w = 0; }
    if (w > 0) { _glSwitch(c, b); break; }
  }
  if (c.cur) {
    let done = true;
    try { done = c.cur.B.step(c, W, dt, c.cur.p); } catch (e) { console.error('[garden life]', c.def.id, c.cur.name, e); done = true; }
    if (done && c.gone) return;
    if (done) { const was = c.cur; try { if (was.B.stop) was.B.stop(c, W, was.p); } catch (e) { /* carry on */ } c.cur = null; c.mem = {}; c.idle = 0.05; }
    return;
  }
  if ((c.idle -= dt) <= 0) _glThink(c, W);
  else if (c.medium === 'air' && !c.perched) { _glHover(c, dt, 0.8); }
}
/** Coming in from outside your view: straight in, no thinking, until it is somewhere you can see it. Gone if it cannot get there. True when it has arrived. */
function _glArrivalStep(c, W, dt) {
  const v = W.view(), S = c.S;
  c.arrT = (c.arrT || 0) + dt;
  if (!c.arrTo) {
    const x = _glR(v.x0 + 1.5, Math.max(v.x0 + 2, v.x1 - 1.5)), y = _glR(Math.max(0.6, v.y0 + 1), Math.max(1, v.y1 - 1.5));
    if (c.medium === 'air') c.arrTo = { x, y };
    else { const q = _glFreeAround(W, x, y, c.def.foot, 3); if (!q || !_glRouteTo(c, W, q.x, q.y)) { _glRemove(c); return false; } c.arrTo = q; _glClip(c, 'walk'); }
  }
  if (c.arrT > 16) { _glRemove(c); return false; }
  if (c.medium === 'air') _glFly(c, W, dt, c.arrTo.x, c.arrTo.y, c.def.alt || 30, { wobble: 0.5, keep: !_glInView(S, v, 0) });
  else if (_glFollow(c, W, dt, Math.max(0.5, (c.def.speed || 0.6) * 1.3))) return true;
  return _glInView({ x: S.x, y: S.y - S.lift / GARDEN_WORLD.cellH }, v, -0.6);
}
/* ---------- a creature on stage ---------- */
function _glMarkup(c) {
  const rx = c.def.habitat === 'air' ? 4.5 : Math.max(5, ((c.def.foot == null ? 0.15 : c.def.foot) * 48) + 2);
  return `<ellipse class="gl-sh" cx="0" cy="0.5" rx="${_glF(rx)}" ry="${_glF(rx * 0.3)}" fill="#1a2a14" fill-opacity="0.2"/><ellipse class="gl-wake" cx="0" cy="-0.6" rx="${_glF(rx * 2)}" ry="${_glF(rx * 0.55)}"/><g class="gl-pose"><g class="gl-art" data-clip="">${c.art.svg}</g></g>`;
}
/** Some creatures shine (a row's light: {c, r}): the night is painted over everything in the garden, so their light goes above it. */
function _glLightNode(c) {
  const L = c.def.light, svg = (_gl.W && _gl.W.svg) || (typeof _gw !== 'undefined' ? _gw.svg : null); if (!L || !svg) return null;
  if (c.lightEl && c.lightEl.isConnected) return c.lightEl;
  const host = svg.querySelector('.gd-ui .gd-fx') || svg.querySelector('.gd-actors'); if (!host) return null;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'gl-fx gl-light');
  const r = L.r || 12; g.innerHTML = `<g class="gl-glow-b" style="animation-delay:-${_glF(c.seed % 3)}s"><circle r="${r}" fill="${L.c}" fill-opacity="0.14"/><circle r="${_glF(r * 0.5)}" fill="${L.c}" fill-opacity="0.32"/><circle r="${_glF(Math.max(1.4, r * 0.17))}" fill="#fdffd8"/></g>`;
  host.appendChild(g); c.lightEl = g; return g;
}
function _glBind(c) {
  const n = c.S.node; if (!n || c.node === n) return;
  c.node = n; c.tf = ''; c.shTf = '';
  n.setAttribute('class', 'gd-sprite gl-c gl-h-' + c.def.habitat);
  c.artEl = n.querySelector('.gl-art'); c.poseEl = n.querySelector('.gl-pose'); c.shEl = n.querySelector('.gl-sh');
  c.artEl.setAttribute('data-clip', c.tokens || ''); c.artEl.style.setProperty('--sd', (c.seed % 3).toFixed(2) + 's');
  _glSyncMedium(c);
}
function _glPaint(c, dt) {
  const n = c.node; if (!n) return;
  // a turn is a quick squeeze through the middle, not a snap
  const k = 1 - Math.exp(-dt * 14); c.fx += (c.faceTo - c.fx) * k; if (Math.abs(c.fx) < 0.12) c.fx = c.faceTo * 0.12;
  const s = c.sink ? 1 - c.sink * 0.92 : 1, tf = `translate(0 ${c.sink ? _glF(c.sink * 2) : 0}) rotate(${_glF(c.bank * (c.fx >= 0 ? 1 : -1) * 0.6)}) scale(${_glF(c.fx)} ${_glF(s)})`;
  if (c.tf !== tf) { c.tf = tf; c.poseEl.setAttribute('transform', tf); }
  const S = c.S, on = c.perched && c.perched.lift > 0, l = _glF(S.lift), shTf = on || c.medium === 'water' ? 'off' : `translate(0 ${l}) scale(${_glF(Math.max(0.55, 1 - S.lift / 160))})`;
  if (c.shTf !== shTf) { c.shTf = shTf; if (shTf === 'off') c.shEl.setAttribute('visibility', 'hidden'); else { c.shEl.removeAttribute('visibility'); c.shEl.setAttribute('transform', shTf); } }
  if (c.fade < 1 || c.fadeOut) {
    c.fade = c.fadeOut ? Math.max(0, c.fade - dt * 1.6) : Math.min(1, c.fade + dt * 1.8);
    n.setAttribute('opacity', _glF(c.fade));
    if (c.fadeOut && c.fade <= 0) _glRemove(c);
  } else if (n.hasAttribute('opacity')) n.removeAttribute('opacity');
  if (c.def.light) {
    const g = _glLightNode(c);
    if (g) { const G = GARDEN_WORLD, L = c.def.light, lt = `translate(${_glF(S.x * G.cellW + (L.x || 0) * c.fx)} ${_glF(G.sky + S.y * G.cellH - S.lift + (L.y || 0))})`, vis = c.onScreen ? 'visible' : 'hidden'; if (c.ltf !== lt) { c.ltf = lt; g.setAttribute('transform', lt); } if (c.lvis !== vis) { c.lvis = vis; g.setAttribute('visibility', vis); } }
  }
}
function _glUpdate(c, dt) {
  const W = _gl.W; if (!W || c.gone) return;
  const S = c.S;
  _glBind(c);
  if (c.hidden) { if (c.node.getAttribute('display') !== 'none') c.node.setAttribute('display', 'none'); }
  const v = W.view();
  const lifted = { x: S.x, y: S.y - (S.lift || 0) / GARDEN_WORLD.cellH };
  c.onScreen = _glInView(lifted, v, 1.2);
  if (c.arriving) {
    if (c.offscreen === undefined || (c.onScreen && c.offscreen)) { c.offscreen = false; c.node.removeAttribute('display'); }
    if (_glArrivalStep(c, W, dt)) c.arriving = false;
    else { _glPaint(c, dt); return; }
  }
  if (!c.onScreen) {
    // out of sight: nothing but growing older; its nodes are not drawn
    if (!c.offscreen) { c.offscreen = true; if (c.node) c.node.setAttribute('display', 'none'); if (c.lightEl) c.lightEl.setAttribute('visibility', 'hidden'); }
    c.offT = (c.offT || 0) + dt; c.age += dt;
    if (c.left) { _glRemove(c); return; }
    if (c.offT > 22) _glRemove(c);
    return;
  }
  if (c.offscreen) { c.offscreen = false; c.offT = 0; }
  if (!c.hidden && c.node.getAttribute('display') === 'none') c.node.removeAttribute('display');
  if (!W.still) _glStep(c, dt, W);
  else if (c.reacting > 0) { c.reacting -= dt; if (c.reacting <= 0) _glClip(c, 'rest'); }
  // the moment it is clear of what it stood on, it sorts by its own row again
  if (c.zHold > 0) { c.zHold -= dt; if (c.zHold <= 0 && !c.perched) { c.zHold = 0; S.z = null; } }
  else if (!c.perched && S.z != null && !(c.cur && c.mem && (c.mem.s || c.mem.o)) && !(c.mem && c.mem.up)) S.z = null;
  _glPaint(c, dt);
  S.hit = c.hidden || c.left ? 0 : (c.def.hit || (c.def.habitat === 'air' ? 0.34 : 0.5)); S.hitUp = c.def.habitat === 'air' ? 10 : 12;
  if (W.own && !c.foundDone) { c.seenT = (c.seenT || 0) + dt; if (c.seenT > 1.4) { c.foundDone = true; if (typeof gardenLifeFound === 'function') { gardenLifeFound('c', c.def.id); gardenLifeSeenToday(c.def.id); } } }
}
function _glRemove(c) {
  if (c.gone) return;
  c.gone = true;
  if (_gl.W) _glRelease(c, _gl.W);
  _gl.list.delete(c);
  if (c.lightEl) { c.lightEl.remove(); c.lightEl = null; }
  try { if (c.S) c.S.remove(); } catch (e) { /* gone already */ }
}
/* ---------- arriving ---------- */
function _glWhenOk(when, W) {
  if (!when) return true;
  if (when.seasons && !when.seasons.includes(W.season)) return false;
  if (when.tod && !when.tod.includes(W.tod)) return false;
  if (when.weather && !when.weather.some(k => k === 'clear' ? !W.rain && !W.snow : k === 'rain' ? W.rain : k === 'wet' ? W.wet : k === 'snow' ? W.snow : false)) return false;
  return true;
}
function _glNearSel(W, sels, v, m) {
  for (const s of sels) {
    if (s === 'water') { if (_glWaterInView(W, v, m)) return true; continue; }
    if (W.find(s).some(o => _glInView(o.top, v, m))) return true;
  }
  return false;
}
function _glWaterInView(W, v, m) {
  for (let y = Math.max(0, Math.floor(v.y0 - m)); y < Math.min(GARDEN_WORLD.rows, v.y1 + m); y += 1) for (let x = Math.max(0, Math.floor(v.x0 - m)); x < Math.min(GARDEN_WORLD.cols, v.x1 + m); x += 1) if (W.water(x + 0.5, y + 0.5)) return { x: x + 0.5, y: y + 0.5 };
  return null;
}
function _glEligible(def, W, v) {
  if (!_glWhenOk(def.when, W)) return false;
  const n = def.needs;
  if (n) {
    if (n.all && !n.all.every(s => (s === 'water' ? !!_glWaterInView(W, { x0: 0, y0: 0, x1: GARDEN_WORLD.cols, y1: GARDEN_WORLD.rows }, 0) : W.find(s).length > 0))) return false;
    if (n.near && !_glNearSel(W, n.near, v, 4)) return false;
  }
  return true;
}
function _glCount(id) { let n = 0; for (const c of _gl.list) if (c.def.id === id && !c.left) n++; return n; }
function _glOdds(def, W) {
  let w = GL_RARITY_ODDS[def.rarity] || 0.5;
  const b = def.when && def.when.boost;
  if (b) { if (b.wet && W.wet) w *= b.wet; if (b[W.season]) w *= b[W.season]; }
  return w;
}
/** A place outside your view to come in from. */
function _glArrivalPoint(def, W, v) {
  const G = GARDEN_WORLD, m = 1.8;
  if (def.habitat === 'air') {
    const side = Math.floor(Math.random() * 4), x = side === 0 ? v.x0 - m : side === 1 ? v.x1 + m : _glR(v.x0, v.x1), y = side === 2 ? v.y0 - m * 0.6 : side === 3 ? v.y1 + m * 0.6 : _glR(v.y0, v.y1);
    return { x: Math.max(-1.5, Math.min(G.cols + 1.5, x)), y: Math.max(-0.5, Math.min(G.rows + 1, y)), lift: (def.alt || 30) + 20, fade: x < -0.5 || x > G.cols + 0.5 ? 1 : 0.999 };
  }
  if (def.habitat === 'water') { const q = _glWaterInView(W, { x0: v.x0 + _glR(0, v.x1 - v.x0), y0: v.y0 + _glR(0, v.y1 - v.y0), x1: v.x1, y1: v.y1 }, 2) || _glWaterInView(W, v, 3); return q ? Object.assign(W.waterNear(q.x, q.y, 2) || q, { fade: 0 }) : null; }
  const f = def.foot;
  for (let i = 0; i < 30; i++) {
    const side = Math.floor(Math.random() * 4), x = side === 0 ? v.x0 - _glR(0.8, 3) : side === 1 ? v.x1 + _glR(0.8, 3) : _glR(v.x0, v.x1), y = side === 2 ? v.y0 - _glR(0.6, 2) : side === 3 ? v.y1 + _glR(0.6, 2) : _glR(v.y0, v.y1);
    if (x > 0.4 && y > 0.4 && x < G.cols - 0.4 && y < G.rows - 0.4 && W.free(x, y, f)) return { x, y, fade: 1 };
  }
  // the whole garden is in view: it comes out from behind something
  for (let i = 0; i < 40; i++) { const x = _glR(0.5, G.cols - 0.5), y = _glR(0.5, G.rows - 0.5); if (W.free(x, y, f)) return { x, y, fade: 0 }; }
  return null;
}
function gardenLifeSpawn(id, o) {
  const def = GL_CREATURE.get(id), W = _gl.W;
  if (!def || !W) return null;
  o = o || {};
  const v = W.view(), art = gardenLifeArt(def);
  const c = { def, art, id: ++_gl.seq, t: 0, age: 0, seed: Math.random() * 100, medium: def.habitat, mem: {}, mem0: null, fx: 1, faceTo: Math.random() < 0.5 ? 1 : -1, bank: 0, vx: 0, vy: 0, fade: 1, calm: 0, scared: 0, greeted: 0, reacting: 0, idle: 0, life: def.life || _glR(70, 190), brain: _glParseBrain(def), onScreen: true };
  c.reflexes = c.brain.filter(b => b.B.reflex);
  let at = o.at || null, s = null;
  const landOn = c.brain.find(b => b.name === 'land-on') || (W.still ? ((b) => b && { p: { on: b.p.scent || b.p.around } })(c.brain.find(b => b.p.scent || b.p.around)) : null);   // (with reduced motion it stays where it would have gone)
  c.S = { x: 0, y: 0, lift: 0 };   // for the choosing below; the sprite takes its place
  if (!at && (def.start === 'in-place' || W.still)) {
    if (landOn) { c.S.x = (v.x0 + v.x1) / 2; c.S.y = (v.y0 + v.y1) / 2; s = _glPickSurface(c, W, landOn.p); }
    if (s && landOn.p.climb && !W.still) { const q = _glFreeAround(W, s.obj.x + s.obj.w / 2 + _glR(-1, 1), s.obj.y + s.obj.h + 0.25, def.foot, 1.8); s = null; if (q) at = { x: q.x, y: q.y, fade: 0 }; }
    if (s) at = { x: s.x, y: s.y, lift: s.lift, fade: 0 };
    else if (at) { /* at the foot of what it will climb */ }
    else if (def.habitat === 'water' || (c.brain.some(b => b.name === 'swim') && W.still)) { const q = _glWaterInView(W, v, 1); if (q) at = Object.assign(W.waterNear(q.x, q.y, 2) || q, { fade: 0 }); if (!at) return null; c.medium = 'water'; }
    else if (def.habitat === 'air') { const q = _glFreeAround(W, _glR(v.x0, v.x1), _glR(v.y0, v.y1), 0.2, 3); if (!q) return null; at = { x: q.x, y: q.y, lift: W.still ? 0 : def.alt || 20, fade: 0 }; }
    else { const q = _glFreeAround(W, _glR(v.x0, v.x1), _glR(v.y0, v.y1), def.foot, 4); if (!q) return null; at = { x: q.x, y: q.y, fade: 0 }; }
  }
  if (!at) { at = _glArrivalPoint(def, W, v); if (at && at.fade !== 0) c.arriving = true; }
  if (!at) return null;
  if (!W.still && at.fade === 0) c.fade = 0; else if (W.still) c.fade = 1;
  c.S = W.add({
    id: 'life-' + def.id + '-' + c.id, svg: _glMarkup(c), x: at.x, y: at.y, lift: at.lift || 0, hit: 0, ground: false, label: def.name, cursor: 'hand',
    update: (dt) => _glUpdate(c, dt),
    onAim: () => { c.calm = 9; },
    onClick: () => { if (typeof _glReact === 'function') _glReact(c); },
  });
  _gl.list.add(c);
  if (s) { _glReserve(c, W, s); _glSettle(c, s); }
  _glClip(c, W.still ? 'rest' : (c.medium === 'air' && !s ? 'fly' : 'rest'));
  if (c.medium === 'air' && !s && !W.still) c.vy = 4;
  return c;
}
/* ---------- the director: once a second it decides who else might turn up ---------- */
function _glDirector(dt) {
  if (!_gl.W) return;
  _gl.tickT -= dt; if (_gl.tickT > 0) return;
  _gl.tickT = 1;
  const W = _gl.W;
  if (W.own) { const m = gardenModel(); if (m !== _gl.m) { _gl.m = m; _glOwnRefresh(W, m); } if (typeof gardenLifeWorldFrame1s === 'function') gardenLifeWorldFrame1s(W); }
  _glDirect(W);
}
function _glDirect(W) {
  if (gardenFun() === 'off') { for (const c of [..._gl.list]) _glRemove(c); return; }
  if (W.visit && typeof _glvLive === 'function' && _glvLive()) return;   // a live visit: the host owns the creatures, this screen only draws them (94-garden-live-6life.js)
  const v = W.view();
  for (const c of _gl.list) {
    if (c.gone || c.left) continue;
    // its time is up, or the hour or the weather it came for has passed
    if (!c.leaving && !W.still && (c.age > c.life || !_glWhenOk(c.def.when, W))) c.leaving = true;
    // something new was put down on its feet: it moves over
    if (c.medium === 'ground' && !c.perched && !c.hop && !c.hidden && !W.free(c.S.x, c.S.y, c.def.foot)) { const q = _glFreeAround(W, c.S.x, c.S.y, c.def.foot, 2.5); if (q) { _glHopTo(c, q.x, q.y, 0.3, 8); } }
    if (c.perched && c.perched.obj && !W.alive(c.perched.obj)) { _glTakeOff(c, W); }
  }
  const cap = _gl.dev.cap || W.cap(), have = _gl.list.size, T = GL_TUNE;
  _gl.spawnT -= 1;
  if (have >= cap || _gl.spawnT > 0) return;
  // a garden with more in bloom is a little busier; never a crowd, and now and then nobody at all
  const target = _gl.dev.cap || Math.min(cap, T.target.base + Math.min(T.target.bloomMax, Math.floor(W.find('bloom').length / T.target.perBloom)));
  if (have >= target && Math.random() > T.overChance) { _gl.spawnT = 5; return; }
  const pool = [];
  let total = 0;
  for (const def of GARDEN_CREATURES) {
    if (def.egg || _glCount(def.id) >= (def.max || 2) || !_glEligible(def, W, v)) continue;
    if (_GL_RARE.has(def.rarity) && (_gl.rareN || 0) >= T.rarePerVisit) continue;
    const w = _glOdds(def, W); pool.push([def, w]); total += w;
  }
  if (!pool.length) { _gl.spawnT = 3; return; }
  let r = Math.random() * total, pick = pool[0][0];
  for (const [def, w] of pool) { r -= w; if (r <= 0) { pick = def; break; } }
  const n = pick.count ? Math.round(_glR(pick.count[0], pick.count[1])) : 1;
  for (let i = 0; i < n && _gl.list.size < cap && _glCount(pick.id) < (pick.max || 2); i++) gardenLifeSpawn(pick.id);
  if (_GL_RARE.has(pick.rarity)) _gl.rareN = (_gl.rareN || 0) + 1;
  _gl.spawnT = _gl.dev.cap ? 1 : Math.random() < T.quiet.chance ? _glR(T.quiet.secs[0], T.quiet.secs[1]) : _glR(T.gap[0], T.gap[1]);
}
/* ---------- start and stop: your own garden ---------- */
function gardenLifeSync(m) {
  if (typeof _gw === 'undefined' || !_gw.on || !_gw.svg) return;
  if (m && m.visit) { gardenLifeVisit(_gw.svg, m.visit.snap); return; }   // a friend's garden: creatures from their objects, nothing sent, nothing earned
  if (gardenFun() === 'off' && !_gl.on) return;
  if (!_gl.on || !_gl.W || !_gl.W.own) {
    gardenLifeVisitStop(); gardenLifeStop();
    _gl.on = true; _gl.m = m; _gl.W = _glOwnWorld(m);
    _gl.dir = gardenWorldAdd({ id: 'life-director', svg: '', x: 0, y: -2, lift: 0, update: (dt) => { _glDirector(dt); if (typeof gardenLifeFrame === 'function') gardenLifeFrame(dt, _gl.W); } });
    _gl.tickT = 0.2; _gl.spawnT = _glR(GL_TUNE.firstIn[0], GL_TUNE.firstIn[1]); _gl.rareN = 0;
    if (typeof gardenLifeBegin === 'function') gardenLifeBegin(_gl.W);
    return;
  }
  // the page was drawn again: the objects may have moved. Anyone on something that has gone takes off at the next tick.
  if (m !== _gl.m) { _gl.m = m; _glOwnRefresh(_gl.W, m); }
  if (typeof gardenLifePainted === 'function') gardenLifePainted(_gl.W);
}
function gardenLifeStop() {
  for (const c of [..._gl.list]) _glRemove(c);
  if (_gl.dir) { try { _gl.dir.remove(); } catch (e) { /* gone */ } _gl.dir = null; }
  if (typeof gardenLifeEnd === 'function') gardenLifeEnd();
  _gl.W = null; _gl.on = false; _gl.m = null;
}
/* ---------- a friend's garden: the same creatures, from their objects, in a small loop of its own ---------- */
function _glVisitWorld(svg, snap) {
  const G = GARDEN_WORLD, areas = (snap.areas || []).slice(), lvl = snap.lv || 1;
  // (as the scene does: a friend on an older version has no lake or woods in their list)
  if (!areas.includes('lake')) areas.push('lake'); if (lvl >= 4 && !areas.includes('woods')) areas.push('woods');
  const open = (x, y) => { for (const a of GARDEN_AREAS) { if (x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h) return areas.includes(a.id); } return x < G.coreCols && y < G.coreRows; };
  const plants = [], decor = [];
  for (const r of snap.plants || []) { const def = gardenPlant(r[0]); if (def) plants.push({ uid: `p${r[1]},${r[2]}`, def, x: r[1], y: r[2], fp: def.fp || 1, stage: r[3], ripe: !!(r[5] & 4) }); }
  for (const r of snap.decor || []) { const def = gardenDecor(r[0]); if (def) decor.push({ uid: `d${r[1]},${r[2]}`, def, x: r[1], y: r[2] }); }
  const grid = new Uint8Array(G.cols * G.rows);
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) { const pr = gardenPropAt(x, y); grid[y * G.cols + x] = !open(x, y) || (pr && !pr.walk) || (!pr && gardenIsWater(x, y)) ? 1 : 0; }
  const block = (x, y, w, h) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (xx >= 0 && yy >= 0 && xx < G.cols && yy < G.rows) grid[yy * G.cols + xx] = 1; };
  for (const p of plants) if (typeof gardenPlantBlocks === 'function' ? gardenPlantBlocks(p) : (p.stage >= 2 || p.fp > 1)) block(p.x, p.y, p.fp, p.fp);
  for (const d of decor) if (d.def.layer !== 'ground') block(d.x, d.y, d.def.w || 1, d.def.h || 1);
  const pm = new Map(plants.map(p => [p.uid, p]));
  const rows = _glTagRows(gardenWorldObjects({ plants, decor }), (u) => pm.get(u)).concat(_glPadRows({ areas, season: snap.season, rain: {} }));
  for (const o of rows) { if (o.kind === 'pad') continue; const uid = o.uid, x = o.x, y = o.y, kind = o.kind; o.node = () => (kind === 'prop' ? svg.querySelector(`.gd-prop[data-prop="${CSS.escape(uid)}"]`) : svg.querySelector(`.gd-it[data-x="${x}"][data-y="${y}"]`)); }
  const now = _gdNow(), season = snap.season || 'summer';
  const W = _glMakeWorld({
    own: false, visit: true, svg, tod: _gdTod(now, season, snap), season, rain: snap.wx === 1, snow: snap.wx === 2, wet: !!snap.wx, level: lvl, still: !!(window.Motion && Motion.prefersReduced && Motion.prefersReduced()),
    cell: (x, y) => x >= 0 && y >= 0 && x < G.cols && y < G.rows && !grid[y * G.cols + x],
    water: (x, y) => { const cx = Math.floor(x), cy = Math.floor(y); return cx >= 0 && cy >= 0 && cx < G.cols && cy < G.rows && gardenIsWater(cx, cy) && open(cx, cy); },
    view() { const b = svg.viewBox && svg.viewBox.baseVal; return b && b.width ? { x0: Math.max(0, b.x / G.cellW), y0: (b.y - G.sky) / G.cellH, x1: Math.min(G.cols, (b.x + b.width) / G.cellW), y1: Math.min(G.rows + 1, (b.y + b.height - G.sky) / G.cellH) } : { x0: 0, y0: 0, x1: G.coreCols, y1: G.coreRows }; },
    player: () => null, pets: () => [], cap: () => GL_CAP.visit,
    add: (spec) => _glVisitAdd(spec),
  });
  W.setObjects(rows);
  return W;
}
const _glVisitSprites = new Set();
function _glVisitAdd(S) {
  S.lift = S.lift || 0; S.remove = () => { _glVisitSprites.delete(S); if (S.node) S.node.remove(); S.node = null; };
  _glVisitSprites.add(S);
  return S;
}
function _glVisitFrame(ts) {
  const V = _gl.visit; if (!V) return;
  if (!V.svg.isConnected) { gardenLifeVisitStop(); return; }
  V.raf = 0;
  if (document.hidden) { V.last = 0; return; }   // the visibility listener starts it again
  const dt = Math.min(0.1, V.last ? (ts - V.last) / 1000 : 0.016); V.last = ts;
  const G = GARDEN_WORLD, layer = V.svg.querySelector('.gd-objects');
  if (layer) for (const S of _glVisitSprites) {
    if (!S.node) { const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'gd-sprite'); g.setAttribute('data-live', '1'); g.innerHTML = S.svg || ''; S.node = g; S.zk = null; }
    if (S.update) { try { S.update(dt, S); } catch (e) { console.error('[garden life]', e); S.remove(); continue; } }
    if (!S.node) continue;
    { const tf = `translate(${(S.x * G.cellW).toFixed(1)} ${(G.sky + S.y * G.cellH - S.lift).toFixed(1)})`; if (S.tf !== tf) { S.tf = tf; S.node.setAttribute('transform', tf); } }
    const z = S.z != null ? S.z : S.y, zk = Math.floor(z * 3);
    if (S.zk !== zk || !S.node.parentNode) {
      S.zk = zk; S.node.setAttribute('data-z', z.toFixed(2)); let ref = null;
      for (const el of layer.children) { if (el === S.node) continue; const ez = Number(el.getAttribute('data-z')); if (Number.isFinite(ez) && ez > z) { ref = el; break; } }
      layer.insertBefore(S.node, ref);
    }
  }
  V.t = (V.t || 0) + dt; if (V.t > 1) { V.t = 0; _glDirect(_gl.W); }
  if (typeof _glcVisitFrame === 'function') _glcVisitFrame(dt);
  V.raf = requestAnimationFrame(_glVisitFrame);
}
function _glVisitWake() { const V = _gl.visit; if (V && !V.raf && !document.hidden) { V.last = 0; V.raf = requestAnimationFrame(_glVisitFrame); } }
/** A friend's garden is on screen: creatures that suit what grows and stands there. Their snapshot is all it reads. */
function gardenLifeVisit(svg, snap) {
  if (!svg || !snap || gardenFun() === 'off') return;
  if (_gl.visit && _gl.visit.svg === svg) return;
  gardenLifeVisitStop();
  if (_gl.W && _gl.W.own) gardenLifeStop();
  try {
    _gl.W = _glVisitWorld(svg, snap); _gl.on = false; _gl.spawnT = _glR(GL_TUNE.firstIn[0], GL_TUNE.firstIn[1]); _gl.rareN = 0;
    _gl.visit = { svg, raf: 0, last: 0, t: 0.8 };
    document.addEventListener('visibilitychange', _glVisitWake);
    _glVisitWake();
  } catch (e) { console.error('[garden life]', e); gardenLifeVisitStop(); }
}
function gardenLifeVisitStop() {
  const V = _gl.visit; if (!V) return;
  if (V.raf) cancelAnimationFrame(V.raf);
  _gl.visit = null;
  document.removeEventListener('visibilitychange', _glVisitWake);
  for (const c of [..._gl.list]) _glRemove(c);
  for (const S of [..._glVisitSprites]) S.remove();
  _gl.W = null;
}
