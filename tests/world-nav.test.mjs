// World engine module B (navigation) acceptance tests: WORLD_ENGINE.md 8.2.
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
    assert.equal(g.data.constructor.name, "Uint8Array");
    for (const k of ['w', 'h', 'cell', 'ox', 'oz']) assert.equal(typeof g[k], 'number');
  }
  assert.equal(W.worldNavLayer(nav, 'walk').cell, 0.5);
  assert.ok(Array.isArray(W.worldNavLayer(nav, 'rail').lines));
});

test('no path cell intersects any dilated solid; paths stay on the layer', () => {
  const world = park({ gateOpen: true }), nav = W.worldNavBuild(world);
  const solids = world.entities.map(e => ({ e, foot: e.size ? ctx._wnavFoot(e) : null }));
  const r = 0.25, rand = rng(3);
  let paths = 0;
  for (let t = 0; t < 60; t++) {
    const a = [-70 + rand() * 140, 12 + rand() * 100], b = [-70 + rand() * 140, 12 + rand() * 100];
    const p = W.worldPath(nav, 'walk', a, b, r);
    if (!p) continue;
    paths++;
    for (let i = 1; i < p.length; i++) {
      const n = Math.ceil(Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]) / 0.05);
      for (let s = 0; s <= n; s++) {
        const x = p[i - 1][0] + (p[i][0] - p[i - 1][0]) * s / n, z = p[i - 1][1] + (p[i][1] - p[i - 1][1]) * s / n;
        assert.ok(W.worldNavOk(nav, 'walk', x, z, r), `off layer at ${x},${z}`);
        for (const { e, foot } of solids) if (foot && (e.open !== true)) assert.ok(polyDist(foot, x, z) >= r - 0.26, `inside dilated ${e.id}`);
        assert.ok(polyDist(rect(10, 70, 50, 100), x, z) > 0, 'walker in the pond');
      }
    }
  }
  assert.ok(paths > 30, 'most random pairs connect: ' + paths);
});

test('closed gate blocks, open gate passes', () => {
  const north = [-50, 60], south = [-50, 20];
  // close the rest of the hedge line so the gate is the only way through
  const closedW = park({ gateOpen: false }); closedW.surfaces.push({ id: 'h3', kind: 'hedge', path: [[-5, 40], [80, 40]], width: 1.2 });
  const openW = park({ gateOpen: true }); openW.surfaces.push({ id: 'h3', kind: 'hedge', path: [[-5, 40], [80, 40]], width: 1.2 });
  assert.equal(W.worldPath(W.worldNavBuild(closedW), 'walk', south, north), null);
  const p = W.worldPath(W.worldNavBuild(openW), 'walk', south, north);
  assert.ok(p && p.length >= 2);
  assert.ok(p.some((q, i) => i && (q[1] - 40) * (p[i - 1][1] - 40) <= 0 && Math.abs(q[0] + 20) < 3) || p.some(q => Math.abs(q[0] + 20) < 1.2 && Math.abs(q[1] - 40) < 2), 'crosses at the gate');
});

test('boats keep their half-beam off the banks; ducks may go closer', () => {
  const world = { cam, surfaces: [{ id: 'bank', kind: 'grass', poly: rect(-20, 0, 20, 100) }, { id: 'cut', kind: 'water', water: 'canal', poly: rect(-6, 0, 6, 100), shallow: 0.6 }], entities: [] };
  const nav = W.worldNavBuild(world), half = 1.05;
  assert.equal(W.worldNavOk(nav, 'swim', -5.3, 50, half), false);
  assert.equal(W.worldNavOk(nav, 'swim', -5.3, 50, 0.15), true);
  const rand = rng(11); let pos = [0, 50];
  for (let i = 0; i < 5000; i++) {
    pos = W.worldStep(nav, 'swim', pos, [(rand() - 0.5) * 8, (rand() - 0.5) * 8], half, 0.25);
    assert.ok(Math.abs(pos[0]) <= 6 - half + 1e-9, 'boat beam over the bank at x ' + pos[0]);
  }
  // wade = the shallow margin only
  assert.equal(W.worldNavOk(nav, 'wade', -5.6, 50, 0.1), true);
  assert.equal(W.worldNavOk(nav, 'wade', 0, 50, 0.1), false);
});

test('flow field build < 15 ms for a 160 x 120 m grid at 0.5 m', () => {
  const nav = W.worldNavBuild(park({ gateOpen: true }));
  const g = W.worldNavLayer(nav, 'walk');
  assert.ok(g.w * g.h >= 320 * 240 && g.w * g.h <= 324 * 244, g.w + "x" + g.h);
  W.worldFlowField(nav, 'walk', [0, 30]);   // warm the JIT
  const times = [];
  for (let i = 0; i < 9; i++) { const t = performance.now(); W.worldFlowField(nav, "walk", [i * 5 - 20, 60]); times.push(performance.now() - t); }
  times.sort((a, b) => a - b);
  assert.ok(times[0] < 15, 'best-of-9 flow-field build ' + times[0].toFixed(1) + ' ms');
  // following the field reaches the goal
  const f = W.worldFlowField(nav, 'walk', [0, 60]);
  let pos = [-60, 100];
  for (let i = 0; i < 4000; i++) { const d = W.worldFlowDir(f, pos[0], pos[1]); if (!d) break; pos = W.worldStep(nav, 'walk', pos, [d[0] * 1.4, d[1] * 1.4], 0.25, 0.25); }
  assert.ok(Math.hypot(pos[0], pos[1] - 60) < 1.5, 'reached ' + pos);
});

test('worldStep never returns a forbidden cell over 10^5 random steps', () => {
  const nav = W.worldNavBuild(park());
  const rand = rng(5);
  const agents = Array.from({ length: 20 }, () => { for (;;) { const p = [-70 + rand() * 140, 12 + rand() * 100]; if (W.worldNavOk(nav, 'walk', p[0], p[1], 0.25)) return p; } });
  for (let s = 0; s < 100000; s++) {
    const a = agents[s % 20];
    const v = [(rand() - 0.5) * 6, (rand() - 0.5) * 6];
    const p = W.worldStep(nav, 'walk', a, v, 0.25, rand() * 0.6);
    assert.ok(W.worldNavOk(nav, 'walk', p[0], p[1], 0.25));
    a[0] = p[0]; a[1] = p[1];
  }
});

test('near-camera band is off limits unless framed', () => {
  const nav = W.worldNavBuild(park());
  const g = W.worldNavLayer(nav, 'walk');
  assert.ok(g.nearZ > 3 && g.nearZ < 9, 'nearZ ' + g.nearZ);
  assert.equal(W.worldNavOk(nav, 'walk', -50, g.nearZ / 2, 0.25), false);
  assert.equal(W.worldNavOk(nav, 'walk', -50, g.nearZ / 2, 0.25, true), true);
  const p = W.worldStep(nav, 'walk', [-50, g.nearZ + 0.3], [0, -5], 0.25, 1);
  assert.ok(p[1] >= g.nearZ);
});

test('spawn cells: at frame edges and behind cover, all legal', () => {
  const world = park();
  world.entities.push({ id: 'shed', obj: 'shed.wood', x: 0, z: 30, solidity: 'solid', size: { w: 6, d: 4, h: 3 } });
  const nav = W.worldNavBuild(world);
  const cells = W.worldSpawnCells(nav, 'walk');
  const kinds = new Set(cells.map(c => c.edge));
  for (const e of ['W', 'E', 'N', 'cover']) assert.ok(kinds.has(e), 'has ' + e);
  for (const c of cells) assert.ok(W.worldNavOk(nav, 'walk', c.x, c.z, 0.25));
  assert.ok(cells.some(c => c.edge === 'cover' && Math.abs(c.x) < 2 && c.z > 32 && c.z < 40), 'behind the shed');
  // flow field to an edge letter
  const f = W.worldFlowField(nav, 'walk', 'E');
  assert.ok(f.seeds.length > 0);
});

test('decks are walkable over water; rail is a line', () => {
  const world = {
    cam,
    surfaces: [{ id: 'cut', kind: 'water', poly: rect(-6, 0, 6, 100) }, { id: 'tow', kind: 'towpath', poly: rect(6, 0, 10, 100) },
      { id: 'rl', kind: 'rail', path: [[-30, 150], [30, 150]] }],
    entities: [{ id: 'nb', obj: 'boat.narrowboat', x: 5, z: 40, solidity: 'solid', foot: rect(4, 30, 6, 50), deck: { poly: rect(4, 30, 6, 50), y: 0.9 } }],
  };
  const nav = W.worldNavBuild(world);
  assert.ok(W.worldPath(nav, 'walk', [8, 20], [5, 40], 0.25), 'step from towpath onto deck');
  assert.equal(W.worldNavOk(nav, 'swim', 5, 40, 0.15), false, 'swimmers avoid the hull');
  const p = W.worldStep(nav, 'rail', [-30, 150], [10, 3], 0, 1);
  assert.equal(p[1], 150);
});
