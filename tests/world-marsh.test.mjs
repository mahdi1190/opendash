// The marsh generator (src/app/79-world-4marsh.js; SCENE_LESSONS U): a boardwalk and four numbers make a reed bed, none of it a
// ruled polygon: wet-ground islands with channels of open water between them, reed stands, reeds closing in on both sides of
// the deck, rails and posts only along the walk and its platform, a platform at the reed edge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadScenes, repoRoot } from '../tools/lib/scene-page.mjs';

const NAMES = ['worldMarsh', 'worldWalkwayWater', 'worldBuild', 'worldValidate'];
loadScenes(repoRoot(), { fixtures: false, browser: true, extra: 'globalThis.__wmh = {' + NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + '};' });
const E = globalThis.__wmh;
delete globalThis.__wmh;

const WALK = [[0.2, 1.0], [0.2, 5], [0.4, 7.4], [0.6, 10], [0.9, 12.4], [1.9, 14.6], [2.4, 17], [2.8, 19.0]];
const make = (o = {}) => E.worldMarsh(Object.assign({ id: 'fen', walk: WALK, width: 1.6, seed: 11, from: 11.4, reach: 9.5, open: 0.5 }, o));
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const dseg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)) : 0; return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); };
const dline = (P, x, z) => { let d = Infinity; for (let i = 1; i < P.length; i++) d = Math.min(d, dseg(x, z, P[i - 1], P[i])); return d; };
const inPoly = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
/** The longest stretch (metres) of an outline that keeps one direction within `deg` degrees: a ruled edge has a long one. */
function longestStraight(P, deg) {
  const n = P.length, seg = [];
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; seg.push({ a: Math.atan2(b[1] - a[1], b[0] - a[0]), l: Math.hypot(b[0] - a[0], b[1] - a[1]) }); }
  const diff = (u, v) => { let d = Math.abs(u - v); if (d > Math.PI) d = 2 * Math.PI - d; return d * 180 / Math.PI; };
  let best = 0;
  for (let i = 0; i < n; i++) {
    let len = 0;
    for (let k = 0; k < n; k++) { const q = seg[(i + k) % n]; if (diff(q.a, seg[i].a) > deg) break; len += q.l; }
    best = Math.max(best, len);
  }
  return best;
}

test('a marsh from a walk and four numbers: water, islands, a spine, the walk, a platform, rails, plants', () => {
  const m = make();
  const kinds = m.surfaces.map(s => s.kind);
  assert.equal(m.surfaces[0].id, 'fen-water');
  assert.equal(kinds[0], 'water');
  assert.ok(m.surfaces.filter(s => /-isle-/.test(s.id)).length >= 6, 'at least six islands');
  assert.ok(m.surfaces.some(s => s.id === 'fen-spine' && s.kind === 'reeds'));
  assert.ok(m.surfaces.some(s => s.id === m.walk && s.kind === 'boardwalk'));
  assert.ok(m.surfaces.some(s => s.id === m.deck && s.kind === 'deck'));
  assert.ok(m.entities.some(e => e.cluster === 'plant.reed' && e.on === 'fen-spine'), 'reeds close in on the walk');
  assert.ok(m.entities.some(e => e.cluster === 'plant.bulrush' && e.edge === true), 'reedmace round the margin of the water');
  assert.ok(m.entities.some(e => e.cluster === 'water.lily'), 'floating vegetation');
  assert.ok(m.entities.some(e => e.obj === 'street.bench'), 'a bench on the platform');
});

test('deterministic from the seed, different for another', () => {
  assert.deepEqual(make(), make());
  assert.notDeepEqual(make().surfaces[0].poly, make({ seed: 12 }).surfaces[0].poly);
});

test('no outline is a ruled polygon: every one is a smooth curve with no straight run of more than 6 m', () => {
  const m = make();
  for (const s of m.surfaces) {
    if (!Array.isArray(s.poly)) continue;
    assert.ok(s.poly.length >= 10, `${s.id} has ${s.poly.length} points`);
    const run = longestStraight(s.poly, 6);
    assert.ok(run <= 6, `${s.id}: a straight run of ${run.toFixed(1)} m`);
  }
});

test('islands stand apart: a channel of open water between any two and between each and the spine', () => {
  const m = make();
  const isles = m.surfaces.filter(s => /-isle-/.test(s.id)), spine = m.surfaces.find(s => s.id === 'fen-spine');
  for (let a = 0; a < isles.length; a++) {
    for (let b = a + 1; b < isles.length; b++) assert.ok(!isles[a].poly.some(p => inPoly(isles[b].poly, p[0], p[1])) && !isles[b].poly.some(p => inPoly(isles[a].poly, p[0], p[1])), `${isles[a].id} and ${isles[b].id} overlap`);
    assert.ok(!isles[a].poly.some(p => inPoly(spine.poly, p[0], p[1])), `${isles[a].id} lies on the spine`);
  }
  // both sides of the walk have stands
  const side = (s) => { const c = s.poly.reduce((t, p) => [t[0] + p[0] / s.poly.length, t[1] + p[1] / s.poly.length], [0, 0]); return c[0] - 0.2 - (c[1] - 1) * 0.1; };
  assert.ok(isles.some(s => side(s) < -1.5) && isles.some(s => side(s) > 1.5), 'islands left and right of the walk');
});

test('rails and posts run only along the boardwalk and round the platform', () => {
  const m = make();
  assert.ok(m.lines.length >= 5 && m.lines.every(l => l.kind === 'fence'));
  const deck = m.surfaces.find(s => s.id === m.deck), P = deck.path, hw = deck.width / 2 + 0.5;
  for (const l of m.lines) for (const p of l.path) {
    const nearWalk = dline(WALK, p[0], p[1]) <= 1.6 / 2 + 0.3, nearDeck = dline(P, p[0], p[1]) <= hw;
    assert.ok(nearWalk || nearDeck, `${l.id} at ${p} is away from the walk and the platform`);
  }
  assert.deepEqual(make({ rails: false }).lines, []);
});

test('a platform at the reed edge: on reed ground, never over open water, and the whole marsh passes the walkway rule', () => {
  const m = make();
  const land = { id: 'land', kind: 'grass', poly: rect(-100, 0.5, 100, 120) };
  const pond = { id: 'pond', kind: 'water', water: 'pond', poly: rect(-60, 8.4, 60, 120) };
  // the walk's own start (z 1 .. 8.4) is on the carr: the pond begins at z 8.4 and the stream bridge is its first 3 m
  const r = E.worldWalkwayWater([land, { id: 'stream', kind: 'water', water: 'river', poly: rect(-40, 8.4, 40, 11.4) }, m.surfaces[0], ...m.surfaces.slice(1)]);
  assert.deepEqual(r, [], JSON.stringify(r.map(v => v.msg)));
  const over = E.worldWalkwayWater([land, pond, ...m.surfaces.slice(1)]);
  assert.deepEqual(over.filter(v => v.id === m.deck), [], 'the platform is on the spine, not out on the pond');
});

test('the marsh builds into a world with no validator error and every plant on its own ground', () => {
  const m = make();
  const spec = { v: 3, camera: { eye: 2.4, horizon: 400, water: -0.1 }, fill: false, surfaces: [{ id: 'land', kind: 'grass', poly: rect(-100, 0.5, 100, 120) }, ...m.surfaces], lines: m.lines, entities: m.entities, backdrop: { style: 'woodland' }, seed: 5 };
  const v = E.worldValidate(spec);
  assert.deepEqual(v.errors.filter(e => e.rule !== 'templated'), [], JSON.stringify(v.errors.slice(0, 3)));
  const w = E.worldBuild(spec, {});
  const reeds = w.entities.filter(e => /^plant\.reed/.test(e.obj || ''));
  assert.ok(reeds.length > 40, `${reeds.length} reeds placed`);
  // never on the deck: the engine snaps them off it, so none stands within the deck's half width of the walk
  assert.ok(reeds.every(e => dline(WALK, e.x, e.z) > 0.7), 'no reed on the walk');
});
