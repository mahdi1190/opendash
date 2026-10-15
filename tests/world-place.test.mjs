// World engine, package "sense": the placement solver (docs/dev/WORLD_ENGINE.md 12; WORLD_ENGINE_REQUIREMENTS.md P1-P4 with K1, K3,
// K4, K9, G3, G8). The engine knows what is weird whatever the scene says: it snaps, turns, re-attaches, pushes apart, moves off
// walking lines, jitters rows or drops, and logs every action with its reason.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
const FIX = join(ROOT, 'tests', 'fixtures', 'world');
const angle = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
const cam = { eye: 1.65, fov: 62, horizon: 460, heading: 0 };
const spec = (surfaces, entities, x) => Object.assign({ v: 3, place: { lat: 51.28, lon: -0.83, region: 'hampshire' }, camera: cam, surfaces, entities, backdrop: { style: 'woodland' }, seed: 3 }, x || {});
const lawn = { id: 'lawn', kind: 'grass', poly: [[-80, 1], [80, 1], [80, 220], [-80, 220]] };
const walk = { id: 'walk', kind: 'path', path: [[0, 1], [0, 220]], width: 2.4 };
const build = (s, o) => W.worldBuild(s, Object.assign({ fill: false }, o || {}));
const ent = (w, id) => w.entities.find(e => e.id === id);
const logOf = (w, id) => w.log.filter(l => l.id === id);
const scenes = () => readdirSync(join(ROOT, 'src', 'app')).filter(f => /^79-world-zscene-.*\.js$/.test(f)).map(f => {
  const got = []; vm.runInNewContext(readFileSync(join(ROOT, 'src', 'app', f), 'utf8'), { worldAdd: (p, m, s) => got.push(s), Math });
  return { f, spec: got[0] };
});

test('the sense placement interface is loaded', () => {
  for (const n of ['worldPlaceProbe', 'worldPlaceOk', 'worldPlaceAdd', 'worldPlace']) assert.equal(typeof W[n], 'function', n);
});

test('the probe: surface, tags, water and bank, paths and the walking line, lanes, rails, decks, spans and solids (12.1)', () => {
  const s = spec([lawn,
    { id: 'cut', kind: 'water', water: 'canal', poly: [[-20, 1], [-6, 1], [-6, 200], [-20, 200]], shallow: 0.6 },
    walk,
    { id: 'road', kind: 'road', path: [[20, 1], [20, 200]], width: 7 },
    { id: 'line', kind: 'rail', path: [[-80, 180], [80, 180]], width: 3 },
    { id: 'bridge', kind: 'bridge-deck', path: [[-25, 100], [5, 100]], width: 4, y: 4 }],
    [], { buildings: [{ id: 'shed', foot: [[40, 40], [50, 40], [50, 50], [40, 50]], storeys: 1 }] });
  const w = build(s);
  const P = (x, z) => W.worldPlaceProbe(w, x, z);
  const c = P(0, 30);
  assert.equal(c.surface, 'walk'); assert.ok(c.tags.includes('walk') && c.tags.includes('path') && c.tags.includes('path-line'));
  assert.ok(Math.abs(c.pathDist) < 1e-9 && c.pathHalf === 1.2 && angle(c.pathDir, 0) < 1e-6);
  const e = P(1.0, 30);
  assert.ok(e.tags.includes('path') && !e.tags.includes('path-line'), 'the edge of the path is off the 1.2 m walking line');
  const g = P(2.0, 30);
  assert.ok(g.tags.includes('grass-edge') && !g.tags.includes('path'));
  const wtr = P(-10, 30);
  assert.ok(wtr.inWater && wtr.water === 'cut' && Math.abs(wtr.waterDist + 4) < 1e-9 && angle(wtr.bankDir, 0) < 1e-6);
  assert.ok(wtr.tags.includes('water') && !wtr.tags.includes('water-margin'));
  assert.ok(P(-6.5, 30).tags.includes('water-margin'));
  const bank = P(-4, 30);
  assert.ok(!bank.inWater && Math.abs(bank.waterDist - 2) < 1e-9 && bank.tags.includes('bank'));
  const lane = P(18, 30), lane2 = P(22, 30);
  assert.equal(lane.laneDir, 0, 'left of the centre line: traffic runs along the road (UK, drive on the left)');
  assert.equal(lane2.laneDir, 180);
  assert.equal(P(0, 180).onRail, 'line');
  const br = P(-10, 100);
  assert.ok(br.inWater && br.under && br.under.id === 'bridge' && !br.deck);
  const roof = P(45, 45);
  assert.ok(roof.solid && roof.solid.kind === 'building' && roof.tags.includes('roof'));
  const o = W.worldPlaceProbe(w, 3, 60, { orient: true });
  assert.equal(o.toPath, 270, 'K3 bearings on request: the path lies west');
  assert.ok(angle(W.worldPlaceProbe(w, -2, 60, { orient: true }).toWater, 270) < 1e-6);
});

for (const f of readdirSync(FIX).filter(f => /^repair-.*\.json$/.test(f))) {
  test(`repair fixture ${f}: built plain-but-sensible with a log entry for every fix`, () => {
    const { spec: s, expect, about } = JSON.parse(readFileSync(join(FIX, f), 'utf8'));
    assert.equal(typeof about, 'string');
    let w;
    assert.doesNotThrow(() => { w = build(s); });
    for (const [id, x] of Object.entries(expect)) {
      const e = ent(w, id), L = logOf(w, id);
      assert.equal(!!e, x.kept, `${id} kept ${x.kept}`);
      for (const a of x.actions || []) assert.ok(L.some(l => l.action === a), `${id}: no ${a} in ${JSON.stringify(L)}`);
      for (const r of x.rules || []) assert.ok(L.some(l => l.rule === r), `${id}: no rule ${r} in ${JSON.stringify(L)}`);
      for (const l of L) assert.ok(l.reason && l.by === 'sense' && l.action && l.rule, JSON.stringify(l));
      if (x.untouched) assert.deepEqual(L, [], `${id} untouched`);
      if (!e) continue;
      if (x.facing != null) assert.ok(angle(e.facing, x.facing) <= 30, `${id} facing ${e.facing}`);
      if (x.parallel != null) assert.ok(Math.min(angle(e.facing, x.parallel), angle(e.facing, x.parallel + 180)) <= 20, `${id} parallel to the bank: ${e.facing}`);
      if (x.parent) assert.equal(e.parent, x.parent);
      if (x.inWater) {
        const water = w.surfaces.find(q => q.id === x.inWater);
        for (const p of e.foot) assert.ok(W.worldPlaceProbe(w, p[0], p[1]).water === water.id, `${id}: corner ${p} off the water`);
        assert.equal(e.attach, 'water'); assert.ok(e.waterline != null && e.y < e.waterline);
      }
      if (x.onSurface) assert.equal(W.worldPlaceProbe(w, e.x, e.z).surface, x.onSurface);
      if (x.offPath) {
        const pth = w.surfaces.find(q => q.id === x.offPath);
        for (const p of e.foot) assert.ok(Math.abs(p[0] - pth.path[0][0]) >= pth.width / 2 - 1e-6, `${id}: corner ${p} on the path`);
        const to = W.worldPlaceProbe(w, e.x, e.z, { orient: true }).toPath;
        assert.ok(angle(e.facing, to) <= 45, `${id} faces the path (${e.facing} vs ${to})`);
      }
      if (x.maxMove) { const src = s.entities.find(q => q.id === id); assert.ok(Math.hypot(e.x - src.at[0], e.z - src.at[1]) <= x.maxMove, `${id} moved too far`); }
    }
  });
}

test('P1: a snap only moves an entity a little (max(2 m, half its size)); farther from its habitat it is dropped', () => {
  const pond = { id: 'pond', kind: 'water', water: 'pond', poly: [[-10, 20], [10, 20], [10, 40], [-10, 40]] };
  const w = build(spec([lawn, pond], [{ obj: 'bird.mallard', id: 'near', at: [11.2, 30], attach: 'water' }, { obj: 'bird.mallard', id: 'far', at: [25, 30], attach: 'water' },
    { obj: 'boat.narrowboat', id: 'beached', at: [30, 120], facing: 0, attach: 'water' }]));
  const near = ent(w, 'near');
  assert.ok(near && near.attach === 'water' && Math.hypot(near.x - 11.2, near.z - 30) <= 2.01, 'snapped into the pond');
  assert.ok(logOf(w, 'near').some(l => l.action === 'snap' && l.rule === 'badAttach' && l.from[0] === 11.2));
  assert.ok(!ent(w, 'far') && logOf(w, 'far').some(l => l.action === 'drop'));
  assert.ok(!ent(w, 'beached') && logOf(w, 'beached').some(l => l.action === 'drop' && /no legal spot within 9 m/.test(l.reason)));
  // a duck put on the bank (no attach given) is grazing: it stays, standing on the ground
  const w2 = build(spec([lawn, pond], [{ obj: 'bird.mallard', id: 'grazer', at: [11.5, 30] }]));
  const gz = ent(w2, 'grazer');
  assert.ok(gz && gz.attach === 'ground' && gz.x === 11.5);
});

test('P2: solids never overlap: the later one is pushed apart; a landmark never moves; reeds never stand inside a hull', () => {
  const pond = { id: 'pond', kind: 'water', water: 'pond', poly: [[-40, 10], [40, 10], [40, 90], [-40, 90]], shallow: 1 };
  const path = { id: 'side', kind: 'path', path: [[48, 1], [48, 200]], width: 2.4 };
  const s = spec([lawn, pond, path], [
    { obj: 'street.bench', id: 'a', at: [50.2, 30], facing: 270 }, { obj: 'street.bench', id: 'b', at: [50.4, 30.4], facing: 270 },
    { obj: 'boat.narrowboat', id: 'nb1', at: [0, 50], facing: 90, attach: 'water' }, { obj: 'boat.narrowboat', id: 'nb2', at: [1, 50.8], facing: 90, attach: 'water' },
    { obj: 'tree.bank-oak', id: 'oak', at: [62, 60] }, { obj: 'plant.reed', id: 'reed', at: [0.5, 50.2], attach: 'water' }]);
  s.landmarks = [{ obj: 'building.townhouse', id: 'hall', at: [60, 60], facing: 180, src: 'test' }];
  const v = W.worldValidate(s);
  assert.ok(v.errors.filter(e => e.rule === 'overlap').length >= 2, 'strict: the overlaps are errors');
  const w2 = build(s);
  const sol = w2.entities.filter(e => e.solidity === 'solid' && e.attach !== 'air');
  for (let i = 0; i < sol.length; i++) for (let j = i + 1; j < sol.length; j++) {
    const pen = (A, B) => { let best = Infinity; for (const P of [A, B]) for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!L) continue; const nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L; let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity; for (const q of A) { const t = q[0] * nx + q[1] * nz; a0 = Math.min(a0, t); a1 = Math.max(a1, t); } for (const q of B) { const t = q[0] * nx + q[1] * nz; b0 = Math.min(b0, t); b1 = Math.max(b1, t); } const o = Math.min(a1, b1) - Math.max(a0, b0); if (o <= 0) return 0; best = Math.min(best, o); } return best; };
    assert.ok(pen(sol[i].foot, sol[j].foot) <= 0.06, `${sol[i].id} overlaps ${sol[j].id}`);
  }
  const hall = ent(w2, 'hall');
  assert.ok(hall.x === 60 && hall.z === 60, 'the landmark stays');
  assert.ok(logOf(w2, 'b').some(l => l.rule === 'overlap' && (l.action === 'move' || l.action === 'drop')));
  assert.ok(logOf(w2, 'nb2').some(l => l.rule === 'overlap'));
  const oak = ent(w2, 'oak');
  assert.ok(!oak || logOf(w2, 'oak').some(l => l.rule === 'overlap' || l.rule === 'badAttach'), 'the oak moved out of the landmark or was dropped');
  const reed = ent(w2, 'reed');
  if (reed) for (const b of w2.entities.filter(e => e.cls === 'boat')) { const inside = W.worldPlaceOk(w2, reed, reed.x, reed.z, reed.facing); assert.ok(inside.ok, `${inside.reason}`); }
});

test('P3: nothing stands on a walking line; a closed gate across a path stands open; a bridge approach stays clear', () => {
  const s = spec([lawn, walk], [
    { obj: 'tree.bank-oak', id: 'oak', at: [0.3, 40] }, { obj: 'street.lamppost', id: 'lamp', at: [-0.2, 60] },
    { obj: 'plant.towpath-hedge', id: 'hedge', at: [0, 80], facing: 90 }, { obj: 'structure.field-gate', id: 'gate', at: [0, 100], facing: 90 },
    { obj: 'street.lamppost', id: 'edge-lamp', at: [1.8, 120] }]);
  const w = build(s);
  for (const id of ['oak', 'lamp', 'hedge']) {
    const e = ent(w, id);
    assert.ok(e, `${id} kept beside the path`);
    for (const p of e.foot) assert.ok(Math.abs(p[0]) >= 0.6 - 1e-6, `${id} still on the walking line`);
    assert.ok(logOf(w, id).some(l => l.rule === 'blocksPath'), id);
  }
  const gate = ent(w, 'gate');
  assert.equal(gate.solidity, 'passable', 'the gate stands open');
  assert.ok(logOf(w, 'gate').some(l => l.action === 'default' && l.rule === 'blocksPath'));
  assert.deepEqual(logOf(w, 'edge-lamp'), [], 'a lamp at the path edge stays');
  // a bridge deck's approach: a bench across the end of a footbridge moves aside
  const b = spec([lawn, { id: 'brook', kind: 'water', water: 'river', poly: [[-80, 50], [80, 50], [80, 56], [-80, 56]] },
    { id: 'foot', kind: 'bridge-deck', path: [[0, 46], [0, 60]], width: 2.5, y: 1.5 }],
    [{ obj: 'street.bench', id: 'blocker', at: [0.4, 45.6], facing: 0 }]);
  const wb = build(b);
  const bl = ent(wb, 'blocker');
  assert.ok(!bl || Math.hypot(bl.x, bl.z - 46) >= 1.5, 'the approach is clear');
  assert.ok(logOf(wb, 'blocker').some(l => l.rule === 'blocksPath'));
});

test('P4: an even row of trees is jittered unless declared real (row: true); a natural clump is left alone', () => {
  const row = [], real = [], clump = [[30, 20], [33.2, 22.9], [29.1, 25.7], [35.8, 27.1], [31.5, 31.4]];
  for (let k = 0; k < 7; k++) row.push({ obj: 'tree.bank-oak', id: 'r' + k, at: [-20, 20 + k * 12] });
  for (let k = 0; k < 7; k++) real.push({ obj: 'tree.bank-oak', id: 'avenue' + k, at: [-50, 20 + k * 12], row: true });
  const ents = row.concat(real, clump.map((p, k) => ({ obj: 'tree.bank-oak', id: 'c' + k, at: p })));
  const w = build(spec([lawn], ents));
  const moved = row.filter(r => { const e = ent(w, r.id); return e && (e.x !== r.at[0] || e.z !== r.at[1]); });
  assert.ok(moved.length >= 5, `the row is broken up (${moved.length} of 7 jittered)`);
  assert.ok(w.log.filter(l => l.action === 'jitter' && l.rule === 'gridRow').length >= 5);
  const gaps = (ids) => { const z = ids.map(id => ent(w, id)).sort((a, b) => a.z - b.z); const d = []; for (let i = 1; i < z.length; i++) d.push(Math.hypot(z[i].x - z[i - 1].x, z[i].z - z[i - 1].z)); const m = d.reduce((a, b) => a + b) / d.length; return Math.sqrt(d.reduce((a, b) => a + (b - m) ** 2, 0) / d.length) / m; };
  assert.ok(gaps(row.map(r => r.id)) > 0.08, 'no longer evenly spaced');
  for (const r of real) { const e = ent(w, r.id); assert.ok(e.x === r.at[0] && e.z === r.at[1], 'row: true is a real avenue'); }
  for (let k = 0; k < clump.length; k++) { const e = ent(w, 'c' + k); assert.ok(e.x === clump[k][0] && e.z === clump[k][1], 'a clump is natural'); }
  // a grid of trees too
  const grid = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) grid.push({ obj: 'tree.bank-oak', id: `g${i}${j}`, at: [20 + i * 10, 100 + j * 10] });
  const wg = build(spec([lawn], grid));
  assert.ok(wg.log.filter(l => l.action === 'jitter').length >= 8, 'a grid is jittered');
});

test('K3 through the solver: boats parallel to the bank, cars on the left, benches face the path, gates in their fence line', () => {
  const s = spec([lawn, { id: 'cut', kind: 'water', water: 'canal', poly: [[-30, 1], [-10, 1], [-10, 200], [-30, 200]] }, walk,
    { id: 'road', kind: 'road', path: [[30, 1], [30, 200]], width: 7 }],
    [{ obj: 'boat.narrowboat', id: 'nb', at: [-20, 60], facing: 60, attach: 'water' }, { obj: 'vehicle.car', id: 'car', at: [31.8, 40], facing: 10 },
      { obj: 'street.bench', id: 'bench', at: [3, 80], facing: 90 }, { obj: 'structure.field-gate', id: 'gate', at: [10.6, 150], facing: 90, open: true }],
    { lines: [{ id: 'fence', kind: 'fence', path: [[10, 1], [10, 200]], gaps: [[146, 154]] }] });
  assert.deepEqual(W.worldValidate(s).errors.filter(e => e.rule !== 'orient'), []);
  const w = build(s);
  assert.ok(Math.min(angle(ent(w, 'nb').facing, 0), angle(ent(w, 'nb').facing, 180)) <= 20, 'boat along the bank');
  assert.ok(angle(ent(w, 'car').facing, 180) <= 30, 'a car right of the centre line drives towards the camera (UK left)');
  assert.ok(angle(ent(w, 'bench').facing, 270) <= 35, 'the bench faces the path');
  const gate = ent(w, 'gate');
  assert.ok(Math.min(angle(gate.facing, 0), angle(gate.facing, 180)) <= 15, 'the gate lies in its fence line');
  assert.ok(Math.abs(gate.x - 10) < 0.35, 'and sits in it');
  for (const id of ['nb', 'car', 'bench', 'gate']) assert.ok(logOf(w, id).some(l => l.action === 'rotate' && l.rule === 'orient'), id);
  // the author's facing stands when it already fits the rule
  const ok = build(spec([lawn, walk], [{ obj: 'street.bench', id: 'b2', at: [3, 80], facing: 265 }]));
  assert.equal(ent(ok, 'b2').facing, 265);
});

test('worldPlaceOk and worldPlaceAdd: the same rules for the fill and the tools', () => {
  const s = spec([lawn, { id: 'sq', kind: 'plaza', poly: [[-30, 1], [-5, 1], [-5, 60], [-30, 60]] }, walk], []);
  const w = build(s);
  const tree = { obj: 'tree.bank-oak', id: 't' };
  assert.equal(W.worldPlaceOk(w, tree, -15, 30, 90).ok, false, 'not on paving');
  assert.equal(W.worldPlaceOk(w, tree, -15, 30, 90).rule, 'badAttach');
  assert.equal(W.worldPlaceOk(w, tree, 20, 30, 90).ok, true);
  const line = W.worldPlaceOk(w, { obj: 'street.bench', id: 'b' }, 0, 30, 0);
  assert.equal(line.ok, false); assert.equal(line.rule, 'blocksPath');
  assert.equal(W.worldPlaceOk(w, { obj: 'nope.nothing' }, 0, 30, 0).ok, false);
  const n0 = w.entities.length, l0 = w.log.length;
  const added = W.worldPlaceAdd(w, { obj: 'tree.bank-oak', at: [20, 40] }, { action: 'fill', rule: 'P6', reason: 'test', by: 'kb' });
  assert.ok(added && added.auto === 'fill' && w.entities.length === n0 + 1);
  assert.ok(w.log.length === l0 + 1 && w.log[l0].action === 'fill' && w.log[l0].by === 'kb' && w.log[l0].id === added.id);
  assert.equal(W.worldPlaceAdd(w, { obj: 'tree.bank-oak', at: [20.5, 40.2] }, 'fill') && W.worldPlaceOk(w, { obj: 'tree.bank-oak', id: 'x' }, 20.2, 40.1, 90).ok, false, 'a second trunk on the first is moved away or refused');
  const n1 = w.entities.length;
  assert.equal(W.worldPlaceAdd(w, { obj: 'tree.bank-oak', at: [-15, 30] }, { action: 'fill', snap: false }), null, 'refused on paving without a snap');
  assert.equal(w.entities.length, n1);
  const snapped = W.worldPlaceAdd(w, { obj: 'tree.bank-oak', at: [-4.8, 30] }, 'fill');
  assert.ok(snapped && snapped.x > -4.6, 'a fill item near its habitat is nudged onto it');
  assert.equal(W.worldPlaceAdd(w, null, 'fill'), null);
  assert.equal(W.worldPlaceAdd(null, { obj: 'tree.bank-oak', at: [1, 1] }, 'fill'), null);
  // a bench added with no facing faces the path (K3)
  const bench = W.worldPlaceAdd(w, { obj: 'street.bench', at: [2.2, 90] }, 'fill');
  assert.ok(bench && angle(bench.facing, 270) <= 35);
});

test('G8: a broken entity record is dropped by the solver with a log entry; the rest are placed', () => {
  const w = build(spec([lawn], [{ obj: 'tree.bank-oak', id: 'ok', at: [10, 30] }]), { place: false });
  w.entities.push({ id: 'broken', obj: 'tree.bank-oak', x: 'a', z: null, foot: null });
  w.entities.push({ id: 'ghost', obj: 'no.such-object', x: 1, z: 30, foot: [[0, 0], [1, 0], [1, 1]] });
  let log;
  assert.doesNotThrow(() => { log = W.worldPlace(w); });
  assert.ok(log.some(l => l.id === 'broken' && l.rule === 'buildError' && l.action === 'drop'));
  assert.ok(log.some(l => l.id === 'ghost' && l.action === 'drop'));
  assert.ok(ent(w, 'ok') && !ent(w, 'broken') && !ent(w, 'ghost'));
  assert.deepEqual(W.worldPlace(null), []);
});

test('G3: the solver goes through a spatial index (never all pairs): 900 entities place in well under a second', () => {
  const ents = [];
  let seed = 7; const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let k = 0; k < 600; k++) ents.push({ obj: 'tree.bank-oak', id: 't' + k, at: [-75 + rnd() * 150, 2 + rnd() * 210] });
  for (let k = 0; k < 300; k++) ents.push({ obj: 'street.bench', id: 'b' + k, at: [-75 + rnd() * 150, 2 + rnd() * 210], facing: rnd() * 360 });
  const s = spec([lawn, walk], ents);
  const runs = [];
  for (let r = 0; r < 3; r++) { const t0 = Date.now(); build(s); runs.push(Date.now() - t0); }
  runs.sort((a, b) => a - b);
  assert.ok(runs[1] < 1200, `median ${runs[1]} ms (budget 1 s at 1.2x)`);
  const a = build(s), b = build(s);
  assert.deepEqual(a.entities.map(e => [e.id, e.x, e.z, e.facing]), b.entities.map(e => [e.id, e.x, e.z, e.facing]), 'deterministic');
});

test('the three test scenes: after the solver every entity stands in its habitat, off the walking lines, clear of other solids', () => {
  for (const { f, spec: s } of scenes()) {
    const w = build(s);
    const bad = [];
    for (const e of w.entities) { if (e.landmark) continue; const r = W.worldPlaceOk(w, e, e.x, e.z, e.facing); if (!r.ok) bad.push(`${e.id}: ${r.reason}`); }
    assert.deepEqual(bad, [], f);
    assert.ok(!w.log.some(l => l.rule === 'buildError'), f);
    // authored, named entities are never dropped from the test scenes
    const named = new Set((s.entities || []).filter(e => e.id).map(e => e.id));
    assert.deepEqual(w.log.filter(l => l.action === 'drop' && named.has(l.id)).map(l => l.id + ' ' + l.reason), [], f);
  }
});

test('A10, C2: a person or animal in the near band is moved back along its line of sight (or dropped); a framed one stays', () => {
  const s = spec([lawn, walk], [{ obj: 'person.walker', id: 'p-near', at: [0.2, 2] }, { obj: 'animal.dog', id: 'framed-dog', at: [-1, 1.5], framed: true }]);
  const w = build(s);
  const p = ent(w, 'p-near'), band = w.cam.f * W.worldObjectInfo('person.walker').size.h / 405;
  assert.ok(p && p.z >= band, `moved beyond the near band (${p && p.z} >= ${band})`);
  assert.ok(Math.abs(p.x / p.z - 0.2 / 2) < 0.01, 'along its line of sight: the same place on screen');
  assert.ok(logOf(w, 'p-near').some(l => l.action === 'move' && l.rule === 'nearBand'));
  const d = ent(w, 'framed-dog');
  assert.ok(d && d.z === 1.5, 'a declared framing element may stand near the lens');
});

test('nothing passable stands inside a solid (a walker in a wall), and nothing solid is added over a walker', () => {
  const s = spec([lawn], [{ obj: 'structure.stone-wall', id: 'wall-1', at: [-5, 18], facing: 0 }, { obj: 'person.walker', id: 'p-wall', at: [-5, 18] }]);
  if (!W.worldObjectInfo('structure.stone-wall')) return;
  const w = build(s);
  const p = ent(w, 'p-wall'), wall = ent(w, 'wall-1');
  assert.ok(wall && wall.x === -5);
  assert.ok(!p || !W.worldPlaceProbe(w, p.x, p.z).solid && W.worldPlaceOk(w, p, p.x, p.z, p.facing).ok, 'the walker is out of the wall');
  assert.ok(logOf(w, 'p-wall').some(l => l.rule === 'overlap'));
  const w2 = build(spec([lawn, walk], [{ obj: 'person.walker', id: 'sitter', at: [10, 30] }]));
  assert.equal(W.worldPlaceAdd(w2, { obj: 'street.bench', at: [10, 30], facing: 90 }, { action: 'fill', snap: false }), null, 'no bench lands on a walker');
});
