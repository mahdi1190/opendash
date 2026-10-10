// World engine v3, module D: depth-sorted chunks, per-frame interleave, occluder redraw, order check.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../src/app/79-world-3order.js', import.meta.url), 'utf8');
const ctx = vm.createContext({ module: { exports: {} } });
vm.runInContext(src, ctx);
const W = ctx.module.exports;

// simple pinhole camera: eye 1.6 m, focal 800 px, horizon at 300
const cam = {
  project(x, z, y) { const zz = Math.max(0.5, z); return { x: 800 + x * 800 / zz, y: 300 + (1.6 - y) * 800 / zz }; },
};

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function rect(cx, cz, w, d, deg = 0) {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]
    .map(([x, z]) => [cx + x * c - z * s, cz + x * s + z * c]);
}

function inside(poly, x, z) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
}

function randomWorld(seed, nStatic = 500) {
  const R = rng(seed), ents = [];
  for (let i = 0; i < nStatic; i++) {
    const z = 3 + R() * 120, x = (R() - 0.5) * z * 1.6;
    const w = 0.3 + R() * 3, d = 0.3 + R() * 2;
    ents.push({ id: 's' + i, x, z, y: 0, height: 0.5 + R() * 6, foot: rect(x, z, w, d, R() * 180), static: true });
  }
  const standZ = []; for (let z = 2; z < 125; z += 0.5) if (R() < 0.6) standZ.push(z);
  return { world: { entities: ents, backdrop: { kind: 'hills' } }, nav: { standZ } };
}

function randomAgents(seed, statics, n = 60) {
  const R = rng(seed), out = [];
  while (out.length < n) {
    const z = 3 + R() * 110, x = (R() - 0.5) * z * 1.4;
    if (statics.some((s) => inside(s.foot, x, z))) continue;
    out.push({ id: 'a' + out.length, x, z, y: 0, height: 0.4 + R() * 1.4, foot: [[x, z]], static: false,
      vx: (R() - 0.5) * 0.2, vz: (R() - 0.5) * 0.2 });
  }
  return out;
}

function boxOf(e) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const w = e.static ? 0 : 0.25;
  for (const [x, z] of e.foot) for (const dx of [-w, w]) for (const y of [e.y, e.y + e.height]) {
    const p = cam.project(x + dx, z, y);
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  return { x0, y0, x1, y1 };
}

test('chunks: far to near, capped at 24, split where movers can stand', () => {
  const { world, nav } = randomWorld(7);
  const ch = W.worldChunks(world, nav, cam);
  assert.ok(ch.length <= 24, `chunks ${ch.length}`);
  assert.ok(ch[0].backdrop, 'backdrop chunk at the back');
  let n = 0;
  for (let i = 1; i < ch.length; i++) {
    n += ch[i].ents.length;
    assert.ok(ch[i].z1 >= ch[i].z0);
    if (i > 1) assert.ok(ch[i - 1].z0 >= ch[i].z1, 'chunks ordered far to near');
    assert.ok(ch[i].bbox, 'clipped bbox');
  }
  assert.equal(n, 500);
  // with no mover cells and a tiny world, nearby statics share one chunk
  const small = W.worldChunks({ entities: [
    { id: 'a', x: 0, z: 10, foot: rect(0, 10, 1, 0.2) }, { id: 'b', x: 1, z: 10.2, foot: rect(1, 10.2, 1, 0.2) }] }, null, cam);
  assert.equal(small.length, 1);
  const split = W.worldChunks({ entities: [
    { id: 'a', x: 0, z: 10, foot: rect(0, 10, 1, 0.2) }, { id: 'b', x: 1, z: 10.2, foot: rect(1, 10.2, 1, 0.2) }] }, { standZ: [9.95] }, cam);
  assert.equal(split.length, 2, 'a standable cell between them splits the chunk');
});

test('500 statics + 60 agents: 0 order violations over 1,000 frames, order < 0.7 ms', () => {
  const { world, nav } = randomWorld(11);
  const chunks = W.worldChunks(world, nav, cam);
  for (const c of chunks) for (const e of c.ents) e.box = boxOf(e);
  const agents = randomAgents(12, world.entities);
  let worst = [], times = [];
  for (let f = 0; f < 1000; f++) {
    for (const a of agents) {
      const nx = a.x + a.vx, nz = a.z + a.vz;
      if (nz > 3 && nz < 115 && !world.entities.some((s) => Math.abs(s.z - nz) < 4 && inside(s.foot, nx, nz))) { a.x = nx; a.z = nz; }
      else { a.vx = -a.vx; a.vz = -a.vz; }
      a.foot = [[a.x, a.z]]; a.box = boxOf(a);
    }
    const t0 = performance.now();
    const order = W.worldFrameOrder(chunks, agents, cam);
    times.push(performance.now() - t0);
    const v = W.worldOrderCheck(order);
    if (v.length) { worst = v; break; }
  }
  assert.deepEqual(worst.slice(0, 3).map((v) => v.why), []);
  times.sort((a, b) => a - b);
  const per = times[500]; // median frame (the box is shared with other test runs)
  assert.ok(per < 0.7, `order ${per.toFixed(3)} ms/frame`);
  console.log(`# order ${per.toFixed(3)} ms/frame`);
});

test('long boat at 30 degrees: swan in front and behind on either side', () => {
  const boat = { id: 'nb', x: 0, z: 20, y: 0, height: 1.8, foot: rect(0, 20, 20, 2.1, 30), static: true };
  boat.box = boxOf(boat);
  const chunks = W.worldChunks({ entities: [boat] }, null, cam);
  const F = (x) => W.worldOrderFrontZ(boat.foot, x);
  const cases = [
    { x: 7, z: F(7) + 3, front: false }, { x: 7, z: F(7) - 1, front: true },
    { x: -7, z: F(-7) + 3, front: false }, { x: -7, z: F(-7) - 1, front: true },
    // a swan nearer than the boat's far-right front edge but farther than its zKey (anchor test would fail)
    { x: 7, z: F(-7) + 1, front: true },
  ];
  for (const c of cases) {
    const swan = { id: 'swan', x: c.x, z: c.z, y: 0, height: 0.6, foot: [[c.x, c.z]], static: false };
    // sanity: the case is on the stated side of the hull front edge at its x
    assert.equal(c.z < W.worldOrderFrontZ(boat.foot, c.x), c.front);
    swan.box = boxOf(swan);
    swan.box = { ...swan.box, x0: Math.min(swan.box.x0, boat.box.x1 - 1), x1: Math.max(swan.box.x1, boat.box.x0 + 1) };
    const order = W.worldFrameOrder(chunks, [swan], cam);
    const last = (id) => order.map((o, i) => ((o.kind === 'chunk' ? o.ref.ents.some((e) => e.id === id) : o.ref.id === id) ? i : -1)).reduce((a, b) => Math.max(a, b));
    assert.equal(last('swan') > last('nb'), c.front, `swan at ${c.x},${c.z}`);
    assert.equal(W.worldOrderCheck(order).length, 0);
  }
});

test('attached movers draw straight after their host; checker catches a bad order', () => {
  const boat = { id: 'nb', x: 0, z: 20, y: 0, height: 1.8, foot: rect(0, 20, 20, 2.1, 0), static: false };
  const man = { id: 'p', x: 3, z: 20.5, y: 1, height: 1.7, foot: [[3, 20.5]], attach: 'deck:nb', static: false };
  const walker = { id: 'w', x: 3, z: 30, y: 0, height: 1.7, foot: [[3, 30]], static: false };
  for (const e of [boat, man, walker]) e.box = boxOf(e);
  const order = W.worldFrameOrder([], [man, boat, walker], cam);
  const ids = order.map((o) => o.ref.id);
  assert.equal(ids.join(), 'w,nb,p');
  assert.equal(W.worldOrderCheck(order).length, 0);
  const bad = [{ kind: 'agent', ref: man }, { kind: 'agent', ref: boat }];
  assert.equal(W.worldOrderCheck(bad).length, 1);
});
