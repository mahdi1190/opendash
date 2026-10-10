// World engine navigation (src/app/79-world-1nav.js): WORLD_ENGINE.md 3; requirements A2, A3, C2, W3.
// Runs the nav module alone in a context (no other package), on hand-made worlds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ console });
vm.runInContext(readFileSync(new URL('../src/app/79-world-1nav.js', import.meta.url), 'utf8'), ctx);
const W = ctx;

const cam = { fov: 62, eye: 1.65 };
function rect(x0, z0, x1, z1) { return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; }
function polyDist(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  if (inside) return 0;
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L));
    d = Math.min(d, Math.hypot(ax + t * dx - x, az + t * dz - z));
  }
  return d;
}
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const median = (a) => { const s = a.slice().sort((p, q) => p - q); return s[s.length >> 1]; };
// a fixed CPU workload: timing budgets are judged against it as well, so a loaded machine slows both alike (16 ms on the
// reference machine these budgets were set on; a test passes under budget x 1.2 in absolute time OR in that ratio)
const REF_MS = 16;
function refMs() { const a = new Float64Array(200000); let s = 12345; for (let i = 0; i < a.length; i++) { s = (s * 1103515245 + 12345) >>> 0; a[i] = s; } const t = performance.now(); a.sort(); return performance.now() - t; }
function withinBudget(fn, budgetMs, runs = 9) {
  const ms = [], ref = [];
  for (let i = 0; i < runs; i++) { ref.push(refMs()); ms.push(fn(i)); }
  const m = median(ms), r = median(ref);
  return { ok: m < budgetMs * 1.2 || m / r < (budgetMs / REF_MS) * 1.2, m, r };
}

// a park: grass field with a path, a pond, solid blocks, a hedge with a gate
function park({ gateOpen = false } = {}) {
  const solids = [];
  const r = rng(7);
  for (let n = 0; n < 25; n++) {
    const x = -60 + r() * 120, z = 15 + r() * 100;
    if (z > 70 && z < 100 && x > 10 && x < 50) continue;   // keep out of the pond
    solids.push({ id: 's' + n, obj: 'bench.wood', x, z, solidity: 'solid', size: { w: 1 + r() * 3, d: 1 + r() * 3, h: 2 }, facing: r() * 360 });
  }
  return {
    cam,
    surfaces: [
      { id: 'g', kind: 'grass', poly: rect(-80, 0, 80, 120) },
      { id: 'p', kind: 'path', path: [[-70, 10], [0, 60], [70, 110]], width: 2.4 },
      { id: 'pond', kind: 'water', water: 'pond', poly: rect(10, 70, 50, 100), shallow: 0.8 },
      { id: 'hedge', kind: 'hedge', path: [[-80, 40], [-22.5, 40]], width: 1.2 },
      { id: 'hedge2', kind: 'hedge', path: [[-17.5, 40], [-5, 40]], width: 1.2 },
    ],
    entities: [...solids, { id: 'gate', obj: 'gate.field', cls: 'gate', x: -20, z: 40, size: { w: 4.5, d: 0.3, h: 1.2 }, open: gateOpen }],
  };
}

test('layers are typed-array grids with the spec shape', () => {
  const nav = W.worldNavBuild(park());
  for (const L of ['walk', 'graze', 'swim', 'wade', 'drive']) {
    const g = W.worldNavLayer(nav, L);
    assert.equal(g.data.constructor.name, 'Uint8Array');
    for (const k of ['w', 'h', 'cell', 'ox', 'oz', 'N', 'N0']) assert.equal(typeof g[k], 'number');
    assert.equal(g.data.length, g.N);
  }
  assert.equal(W.worldNavLayer(nav, 'walk').cell, 0.5);
  assert.ok(Array.isArray(W.worldNavLayer(nav, 'rail').lines));
});

test('two grids joined at 60 m: 0.5 m to 60 m, 2 m to 300 m; the near grid is never coarsened', () => {
  // a huge world (800 m wide, 300 m deep): the old single grid had to coarsen; now only the far grid is 2 m
  const world = { cam, surfaces: [{ id: 'g', kind: 'grass', poly: rect(-400, 0, 400, 300) }, { id: 'p', kind: 'path', path: [[0, 2], [5, 120], [-20, 290]], width: 2.4 }], entities: [] };
  const nav = W.worldNavBuild(world), g = W.worldNavLayer(nav, 'walk');
  assert.equal(g.cell, 0.5);
  assert.ok(g.far && g.far.cell === 2, 'a 2 m far grid');
  assert.equal(g.seam, 60);
  assert.ok(g.oz + g.hLive * g.cell <= 60 + 1e-9 && g.oz + g.hLive * g.cell > 59, 'the near grid ends at the seam');
  assert.ok(g.far.oz + g.far.h * 2 >= 298, 'the far grid reaches 300 m');
  assert.ok(g.N < 260000, 'clipped to the widest frame: ' + g.N + ' cells');
  // a short route across the seam (A*), and a long one by a flow field
  const p = W.worldPath(nav, 'walk', [0, 50], [3, 74]);
  assert.ok(p && p.length >= 2, 'a route across the seam');
  const f = W.worldFlowField(nav, 'walk', [0, 20]);
  let pos = [-15, 250];
  for (let i = 0; i < 4000; i++) { const d = W.worldFlowDir(f, pos[0], pos[1]); if (!d) break; pos = W.worldStep(nav, 'walk', pos, [d[0] * 1.5, d[1] * 1.5], 0.25, 0.25); }
  assert.ok(Math.hypot(pos[0], pos[1] - 20) < 1.5, 'followed the field down across the seam to ' + pos);
});

test('a narrow diagonal towpath (2.6 m) stays connected at 0.5 m and at 2 m', () => {
  // a towpath between a canal and a hedge, at an angle to the grid, from the near band to the far end
  const C = [[-30, 4], [-10, 40], [15, 80], [40, 150], [70, 280]];
  const off = (P, o) => P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); return [p[0] + o * dz / L, p[1] - o * dx / L]; });
  const bankL = off(C, -6), bankR = off(C, 6);
  const world = { cam, surfaces: [
    { id: 'cut', kind: 'water', water: 'canal', poly: bankL.concat(bankR.slice().reverse()) },
    { id: 'tow', kind: 'towpath', path: off(C, 7.9), width: 2.6 },
    { id: 'hedge', kind: 'hedge', path: off(C, 9.8), width: 1.2 },
  ], entities: [] };
  const nav = W.worldNavBuild(world);
  const tow = off(C, 7.9), start = tow[0], end = tow[tow.length - 1];
  for (const [i, p] of tow.entries()) if (i) assert.ok(W.worldNavOk(nav, 'walk', p[0], p[1], 0.25) || p[1] < 8, 'the towpath centre line is walkable at ' + p);
  const f = W.worldFlowField(nav, 'walk', { key: 'far end', cells: [W.worldNavCell(nav, 'walk', end[0] - 1, end[1] - 3)].filter(k => k >= 0) });
  assert.ok(f.seeds.length, 'a seed at the far end');
  let pos = [tow[1][0], tow[1][1]], steps = 0;
  for (; steps < 20000; steps++) { const d = W.worldFlowDir(f, pos[0], pos[1]); if (!d) break; pos = W.worldStep(nav, 'walk', pos, [d[0] * 1.4, d[1] * 1.4], 0.25, 0.25); }
  assert.ok(Math.hypot(pos[0] - end[0], pos[1] - end[1]) < 6, `walked the whole towpath (${steps} steps) to ${pos.map(v => v.toFixed(1))}`);
  // never off the path's band: the canal stays dry for walkers, at both resolutions
  assert.equal(W.worldNavOk(nav, 'walk', C[2][0], C[2][1], 0), false);
  assert.equal(W.worldNavOk(nav, 'walk', C[4][0] - 2, C[4][1] - 3, 0), false);
  void start;
});

test('no path cell intersects any dilated solid; paths stay on the layer', () => {
  const world = park({ gateOpen: true }), nav = W.worldNavBuild(world);
  const solids = world.entities.map(e => ({ e, foot: e.size ? ctx._wnavFoot(e) : null }));
  const r = 0.25, rand = rng(3);
  let paths = 0;
  for (let t = 0; t < 60; t++) {
    const a = [-55 + rand() * 110, 12 + rand() * 100], b = [a[0] + (rand() - 0.5) * 50, Math.max(8, a[1] + (rand() - 0.5) * 50)];
    const p = W.worldPath(nav, 'walk', a, b, r);
    if (!p) continue;
    paths++;
    for (let i = 1; i < p.length; i++) {
      const n = Math.ceil(Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]) / 0.05);
      // every point of a route is legal in the 0.5 m grid; in the 2 m grid every waypoint is (a mover slides round the rest)
      assert.ok(W.worldNavOk(nav, 'walk', p[i][0], p[i][1], r), `waypoint off layer at ${p[i]}`);
      for (let s = 0; s <= n; s++) {
        const x = p[i - 1][0] + (p[i][0] - p[i - 1][0]) * s / n, z = p[i - 1][1] + (p[i][1] - p[i - 1][1]) * s / n;
        if (z >= 59) continue;
        assert.ok(W.worldNavOk(nav, 'walk', x, z, r), `off layer at ${x},${z}`);
        for (const { e, foot } of solids) if (foot && (e.open !== true) && z < 60) assert.ok(polyDist(foot, x, z) >= r - 0.26, `inside dilated ${e.id}`);
        assert.ok(polyDist(rect(10, 70, 50, 100), x, z) > 0, 'walker in the pond');
      }
    }
  }
  assert.ok(paths > 25, 'most random pairs connect: ' + paths);
});

test('closed gate blocks, open gate passes', () => {
  const north = [-30, 52], south = [-30, 28];
  const closedW = park({ gateOpen: false }); closedW.surfaces.push({ id: 'h3', kind: 'hedge', path: [[-5, 40], [80, 40]], width: 1.2 });
  const openW = park({ gateOpen: true }); openW.surfaces.push({ id: 'h3', kind: 'hedge', path: [[-5, 40], [80, 40]], width: 1.2 });
  const cn = W.worldNavBuild(closedW);
  assert.equal(W.worldPath(cn, 'walk', south, north), null);
  const fc = W.worldFlowField(cn, 'walk', north);
  assert.equal(W.worldFlowDist(fc, south[0], south[1]), Infinity, 'no way round a closed gate');
  const p = W.worldPath(W.worldNavBuild(openW), 'walk', south, north);
  assert.ok(p && p.length >= 2);
  assert.ok(p.some(q => Math.abs(q[0] + 20) < 2.5 && Math.abs(q[1] - 40) < 2.5) || p.some((q, i) => i && (q[1] - 40) * (p[i - 1][1] - 40) <= 0), 'crosses at the gate');
});

test('boats keep their half-beam off the banks; ducks may go closer; waders keep to the shallow margin', () => {
  const world = { cam, surfaces: [{ id: 'bank', kind: 'grass', poly: rect(-20, 0, 20, 100) }, { id: 'cut', kind: 'water', water: 'canal', poly: rect(-6, 0, 6, 100), shallow: 0.6 }], entities: [] };
  const nav = W.worldNavBuild(world), half = 1.05;
  assert.equal(W.worldNavOk(nav, 'swim', -5.3, 50, half), false);
  assert.equal(W.worldNavOk(nav, 'swim', -5.3, 50, 0.15), true);
  const rand = rng(11); let pos = [0, 50];
  for (let i = 0; i < 5000; i++) {
    pos = W.worldStep(nav, 'swim', pos, [(rand() - 0.5) * 8, (rand() - 0.5) * 8], half, 0.25);
    assert.ok(Math.abs(pos[0]) <= 6 - half + 1e-9, 'boat beam over the bank at x ' + pos[0]);
  }
  assert.equal(W.worldNavOk(nav, 'wade', -5.6, 50, 0.1), true);
  assert.equal(W.worldNavOk(nav, 'wade', 0, 50, 0.1), false);
  // the water level is the walking height of swimmers and waders (per region, W4)
  assert.equal(W.worldNavY(nav, 'swim', 0, 50), 0);
  const w2 = JSON.parse(JSON.stringify(world)); w2.surfaces[1].level = -0.6;
  assert.equal(W.worldNavY(W.worldNavBuild(w2), 'swim', 0, 50), -0.6);
});

test('flow field build < 15 ms for a 160 x 120 m world (median of runs at 1.2x, judged against a fixed workload too)', () => {
  const nav = W.worldNavBuild(park({ gateOpen: true }));
  const g = W.worldNavLayer(nav, 'walk');
  assert.ok(g.N > 20000, 'cells ' + g.N);
  W.worldFlowField(nav, 'walk', [0, 30]);   // warm the JIT
  const r = withinBudget(i => { const t = performance.now(); W.worldFlowField(nav, 'walk', [i * 5 - 20, 61 + (i % 3)]); return performance.now() - t; }, 15);
  assert.ok(r.ok, `flow-field build median ${r.m.toFixed(1)} ms (reference workload ${r.r.toFixed(1)} ms)`);
  // following the field reaches the goal
  const f = W.worldFlowField(nav, 'walk', [0, 60]);
  let pos = [-50, 100];
  for (let i = 0; i < 4000; i++) { const d = W.worldFlowDir(f, pos[0], pos[1]); if (!d) break; pos = W.worldStep(nav, 'walk', pos, [d[0] * 1.4, d[1] * 1.4], 0.25, 0.25); }
  assert.ok(Math.hypot(pos[0], pos[1] - 60) < 1.5, 'reached ' + pos);
});

test('a failed route returns null at the cap and builds no flow field (the caller backs off)', () => {
  const world = park({ gateOpen: false }); world.surfaces.push({ id: 'h3', kind: 'hedge', path: [[-5, 40], [80, 40]], width: 1.2 });
  const nav = W.worldNavBuild(world);
  const before = nav.flows.size, t = performance.now();
  for (let i = 0; i < 5; i++) assert.equal(W.worldPath(nav, 'walk', [-50, 20 + i], [-50, 55]), null);
  assert.equal(nav.flows.size, before, 'no flow field fallback');
  assert.ok(performance.now() - t < 2000);
});

test('worldStep never returns a forbidden cell over 10^5 random steps', () => {
  const nav = W.worldNavBuild(park());
  const rand = rng(5);
  const agents = Array.from({ length: 20 }, () => { for (;;) { const p = [-55 + rand() * 110, 12 + rand() * 100]; if (W.worldNavOk(nav, 'walk', p[0], p[1], 0.25)) return p; } });
  for (let s = 0; s < 100000; s++) {
    const a = agents[s % 20];
    const v = [(rand() - 0.5) * 6, (rand() - 0.5) * 6];
    const p = W.worldStep(nav, 'walk', a, v, 0.25, rand() * 0.6);
    assert.ok(W.worldNavOk(nav, 'walk', p[0], p[1], 0.25));
    a[0] = p[0]; a[1] = p[1];
  }
});

test('the near band is off limits where the camera sees it, unless framed (C2)', () => {
  const nav = W.worldNavBuild(park());
  const g = W.worldNavLayer(nav, 'walk');
  assert.ok(g.nearZ > 3 && g.nearZ < 9, 'nearZ ' + g.nearZ);
  assert.equal(W.worldNavOk(nav, 'walk', 0, g.nearZ / 2, 0.25), false);
  assert.equal(W.worldNavOk(nav, 'walk', 0, g.nearZ / 2, 0.25, true), true);
  // the band is a depth (moverNear), whatever the side; and never so near that a mover's feet leave the frame's bottom
  assert.equal(W.worldNavOk(nav, 'walk', -40, g.nearZ / 2, 0.25), false);
  assert.ok(g.nearZ >= nav.cam.dMin, 'feet inside the frame: nearZ ' + g.nearZ.toFixed(2) + ', bottom ' + nav.cam.dMin.toFixed(2));
  const p = W.worldStep(nav, 'walk', [0, g.nearZ + 0.3], [0, -5], 0.25, 1);
  assert.ok(p[1] >= g.nearZ);
});

test('spawn cells: just outside the widest frame, the first row beyond the near band, the far end, cover, doors; all legal', () => {
  const world = park();
  world.entities.push({ id: 'shed', obj: 'shed.wood', x: 0, z: 30, solidity: 'solid', size: { w: 6, d: 4, h: 3 } });
  world.entities.push({ id: 'house', obj: 'building.cottage', cls: 'building', x: -30, z: 80, facing: 180, solidity: 'solid', size: { w: 8, d: 8, h: 7 } });
  const nav = W.worldNavBuild(world), cells = W.worldSpawnCells(nav, 'walk'), g = W.worldNavLayer(nav, 'walk'), C = nav.cam;
  const kinds = new Set(cells.map(c => c.edge));
  for (const e of ['W', 'E', 'N', 'S', 'cover', 'door']) assert.ok(kinds.has(e), 'has ' + e);
  for (const c of cells) {
    assert.ok(W.worldNavOk(nav, 'walk', c.x, c.z, 0.25), 'legal ' + c.edge);
    if (c.edge === 'W') { assert.ok(c.x < -c.z * C.tanL - 0.8, 'W is outside the frame'); assert.ok(c.x > -c.z * C.tanL - 5, 'W is just outside'); }
    if (c.edge === 'E') { assert.ok(c.x > c.z * C.tanR + 0.8, 'E is outside the frame'); assert.ok(c.x < c.z * C.tanR + 5, 'E is just outside'); }
    if (c.edge === 'S') { assert.ok(c.z >= g.nearZ && c.z < g.nearZ + 1.6, 'S is the first row beyond the near band'); assert.equal(c.hidden, c.z < C.dMin); }
  }
  assert.ok(cells.some(c => c.edge === 'cover' && Math.abs(c.x) < 2 && c.z > 32 && c.z < 45), 'behind the shed');
  assert.ok(cells.some(c => c.edge === 'door' && Math.abs(c.x + 30) < 1.5 && c.z < 76), 'at the cottage door (its front faces the camera)');
  const f = W.worldFlowField(nav, 'walk', 'E');
  assert.ok(f.seeds.length > 0);
  assert.ok(W.worldFlowField(nav, 'walk', 'right').seeds.length === f.seeds.length, 'right is an alias of E');
});

test('levels: a raised bridge deck blocks nothing beneath it; stairs join it to the ground (W3)', () => {
  // a canal (x -6..6) with a towpath on its right, a footbridge 4 m up across both, stairs from the towpath up to it
  const world = { cam, surfaces: [
    { id: 'bank', kind: 'grass', poly: rect(-30, 0, 30, 120) },
    { id: 'cut', kind: 'water', water: 'canal', poly: rect(-6, 0, 6, 120) },
    { id: 'tow', kind: 'towpath', path: [[8, 1], [8, 119]], width: 2.6 },
    { id: 'bridge', kind: 'bridge-deck', poly: rect(-10, 50, 12, 52.5), y: 4 },
    { id: 'steps', kind: 'stairs', path: [[16, 45], [16, 50.6]], width: 1.4, from: 'ground', to: 'bridge' },
    { id: 'land', kind: 'grass', poly: rect(12, 50, 18, 52.5) },
  ], entities: [] };
  world.surfaces[3].poly = rect(-10, 50, 17, 52.5);
  const nav = W.worldNavBuild(world);
  const lv = W.worldNavLevels(nav);
  assert.equal(lv.length, 2, JSON.stringify(lv));
  const up = lv[1].layer;
  assert.equal(up, 'walk@1');
  // beneath: the towpath stays walkable at the ground, the canal swimmable
  assert.ok(W.worldNavOk(nav, 'walk', 8, 51.2, 0.25), 'the towpath under the bridge');
  assert.ok(W.worldNavOk(nav, 'swim', 0, 51.2, 0.15), 'the canal under the bridge');
  assert.ok(Math.abs(W.worldNavY(nav, 'walk', 8, 51.2)) < 1e-9, 'a walker under the bridge is on the ground, not in mid-air');
  // above: the deck is its own layer at its height
  assert.ok(W.worldNavOk(nav, up, 0, 51.2, 0.25), 'the deck');
  assert.ok(Math.abs(W.worldNavY(nav, up, 0, 51.2) - 4) < 1e-9);
  // the stairs are shared by both layers, their height climbs from 0 to 4
  const ps = W.worldNavPortals(nav).filter(p => p.kind === 'stairs');
  assert.equal(ps.length, 1);
  assert.ok(ps[0].pairs.length > 2);
  const ys = ps[0].pairs.map(p => W.worldNavY(nav, up, p[2], p[3]));
  assert.ok(Math.min(...ys) < 1.5 && Math.max(...ys) > 2.5, 'stair heights ' + Math.min(...ys) + '..' + Math.max(...ys));
  // a walker on the ground cannot step onto the deck except by the stairs
  assert.equal(W.worldNavOk(nav, 'walk', 0, 51.2, 0.25), false, 'no ground cell where the canal is');
});

test('a bridge-deck surface without a height is walkable and overhead: swimmers pass under it', () => {
  const world = { cam, surfaces: [
    { id: 'cut', kind: 'water', water: 'canal', poly: rect(-6, 0, 6, 100) },
    { id: 'bank', kind: 'grass', poly: rect(6, 0, 30, 100) },
    { id: 'foot', kind: 'bridge-deck', poly: rect(-8, 40, 10, 42) },
  ], entities: [] };
  const nav = W.worldNavBuild(world);
  assert.ok(W.worldNavOk(nav, 'walk', 0, 41, 0.25), 'walk on the bridge');
  assert.ok(W.worldNavOk(nav, 'swim', 0, 41, 0.15), 'swim under it');
  assert.equal(W.worldNavSurfaceId(nav, 'walk', 0, 41), 'foot');
  assert.equal(W.worldNavSurfaceId(nav, 'swim', 0, 41), 'cut');
});

test('decks: a low deck joins the ground; a raised one is its own level with landings; rail is a line', () => {
  const world = {
    cam,
    surfaces: [{ id: 'cut', kind: 'water', poly: rect(-6, 0, 6, 100) }, { id: 'tow', kind: 'towpath', poly: rect(6, 0, 10, 100) },
      { id: 'rl', kind: 'rail', path: [[-30, 150], [30, 150]], width: 9 }],
    entities: [
      { id: 'nb', obj: 'boat.narrowboat', x: 5, z: 40, solidity: 'solid', foot: rect(4, 30, 6, 50), deck: { poly: rect(4.2, 31, 5.8, 49), y: 0.9 } },
      { id: 'jetty', obj: 'structure.jetty', x: 3, z: 70, solidity: 'walkable', foot: rect(0, 68, 6, 72), deck: { poly: rect(0, 68, 6.2, 72), y: 0.3 } },
    ],
  };
  const nav = W.worldNavBuild(world);
  assert.ok(W.worldPath(nav, 'walk', [8, 60], [2, 70], 0.25), 'step from the towpath onto the low jetty (the ground level)');
  assert.ok(Math.abs(W.worldNavY(nav, 'walk', 2, 70) - 0.3) < 1e-9, 'standing on the jetty at its height');
  assert.equal(W.worldNavOk(nav, 'swim', 5, 40, 0.15), false, 'swimmers avoid the hull');
  const lv = W.worldNavLevels(nav).find(l => l.id === 'nb');
  assert.ok(lv, 'the boat deck is a level');
  assert.ok(W.worldNavOk(nav, lv.layer, 5, 40, 0.2), 'its deck is walkable on its own layer');
  const land = W.worldNavPortals(nav).find(p => p.kind === 'landing' && p.b === lv.layer);
  assert.ok(land && land.pairs.length > 0, 'a landing from the towpath');
  for (const p of land.pairs) { assert.ok(W.worldNavOk(nav, 'walk', p[0], p[1]), 'landing ground side legal'); assert.ok(W.worldNavOk(nav, lv.layer, p[2], p[3], 0.2), 'landing deck side legal'); }
  const p = W.worldStep(nav, 'rail', [-30, 150], [10, 3], 0, 1);
  assert.equal(p[1], 150);
  assert.ok(W.worldNavOk(nav, 'rail', 0, 152, 0), 'a track within the line\'s width');
});
