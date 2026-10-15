// World engine, package appearance: perspective geometry. Linear features (Q2), buildings (Q3), long hulls in perspective (Q4),
// foreshortening of ground textures (Q5). docs/dev/WORLD_ENGINE_REQUIREMENTS.md section 22; docs/dev/WORLD_ENGINE.md 14.2, 14.3.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
const camOf = (o) => W.sceneCamera(Object.assign({ camera: { eye: 1.65, fov: 64, horizon: 468, heading: 0 } }, o || {}));
const P = (cam, p) => { const q = W.sceneProject(cam, p[0], p[2], p[1]); return [q.X, q.Y]; };
/** The intersection of the screen lines a0-a1 and b0-b1. */
function meet(a0, a1, b0, b1) {
  const d1 = [a1[0] - a0[0], a1[1] - a0[1]], d2 = [b1[0] - b0[0], b1[1] - b0[1]], den = d1[0] * d2[1] - d1[1] * d2[0];
  const t = ((b0[0] - a0[0]) * d2[1] - (b0[1] - a0[1]) * d2[0]) / den;
  return [a0[0] + d1[0] * t, a0[1] + d1[1] * t];
}
/** A recording 2D context (Node has no canvas). */
function mockCtx() {
  const calls = [];
  const rec = (name) => (...a) => { calls.push([name, ...a]); };
  const ctx = { calls, globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1 };
  for (const n of ['save', 'restore', 'setTransform', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'clip', 'drawImage', 'quadraticCurveTo', 'bezierCurveTo']) ctx[n] = rec(n);
  return ctx;
}

test('the appearance extrude API is loaded', () => {
  for (const n of ['worldExtrude', 'worldExtrudeLine', 'worldExtrudeBuilding', 'worldExtrudeHull', 'worldExtrudeDraw', 'worldForeshorten']) assert.equal(typeof W[n], 'function', n);
  assert.ok(W.WORLD_EXTRUDE_KINDS.wall && W.WORLD_EXTRUDE_KINDS.hedge && W.WORLD_EXTRUDE_KINDS.kerb);
});

test('Q2: wall edges converge to the right vanishing point', () => {
  const cam = camOf(), dx = 0.4, dz = 1;
  const prims = W.worldExtrudeLine({ id: 'w', kind: 'wall', path: [[3, 5], [3 + dx * 80, 5 + dz * 80]] }, cam);
  assert.ok(prims.length > 3, `cut into pieces: ${prims.length}`);
  const vp = [cam.x0 + cam.f * dx / dz, cam.horizon];
  for (const p of prims) {
    assert.ok(Math.hypot(p.vp[0] - vp[0], p.vp[1] - vp[1]) < 0.5, `piece ${p.id} vp ${p.vp} vs ${vp}`);
    const L = p.edges.left, n = L.length - 1;
    if (L[0][2] < 2 || L[n][2] - L[0][2] < 0.5) continue;
    const T = p.edges.top, base0 = P(cam, L[0]), base1 = P(cam, L[n]), top0 = P(cam, [L[0][0], T[0], L[0][2]]), top1 = P(cam, [L[n][0], T[n], L[n][2]]);
    const m = meet(base0, base1, top0, top1);
    assert.ok(Math.hypot(m[0] - vp[0], m[1] - vp[1]) < 1, `the base and the top of piece ${p.id} meet at ${m.map(Math.round)}, not ${vp.map(Math.round)}`);
  }
  // the faces seen are those on the eye's side: a wall to the right shows its left face and its top (eye above 1.4 m)
  const roles = new Set(prims.flatMap(p => p.faces.map(f => f.role)));
  assert.ok(roles.has('side') && roles.has('top'));
});

test('Q2: a wall keeps its true width at every depth', () => {
  const cam = camOf(), w = 0.45;
  const prims = W.worldExtrudeLine({ id: 'w', kind: 'wall', path: [[2, 1], [2, 160]], width: w }, cam);
  let checked = 0, zmax = 0;
  for (const p of prims) for (let i = 0; i < p.edges.left.length; i++) {
    const a = p.edges.left[i], b = p.edges.right[i];
    if (a[2] < 0.5) continue;
    assert.ok(Math.abs(a[2] - b[2]) < 1e-9, 'both edges at one depth');
    const X0 = P(cam, [a[0], p.edges.top[i], a[2]])[0], X1 = P(cam, [b[0], p.edges.top[i], b[2]])[0];
    assert.ok(Math.abs(Math.abs(X0 - X1) - cam.f * w / a[2]) < 1e-6 * cam.f, `at ${a[2]} m: ${Math.abs(X0 - X1)} vs ${cam.f * w / a[2]}`);
    checked++; zmax = Math.max(zmax, a[2]);
  }
  assert.ok(checked > 40 && zmax > 150, `${checked} samples to ${zmax} m`);
  // pieces never span more depth than max(1 m, 8 % of their depth) plus one sample step
  for (const p of prims) assert.ok(p.zFar - p.zKey <= Math.max(1, 0.08 * p.zKey) + Math.max(0.5, 0.04 * p.zFar) + w + 1e-6, `${p.id}: ${p.zKey}..${p.zFar}`);
});

test('Q2: curves keep their width and slopes follow the ground', () => {
  const relief = { x: [-60, 60], d: [1, 200], nx: 2, nd: 2, h: [0, 0, 8, 8] };
  const cam = camOf({ ground: { relief } });
  const arc = []; for (let k = 0; k <= 12; k++) { const a = k / 12 * Math.PI / 2; arc.push([-20 + 20 * Math.cos(a), 10 + 20 * Math.sin(a)]); }
  const prims = W.worldExtrudeLine({ id: 'curve', kind: 'hedge', path: arc, width: 1 }, cam);
  assert.ok(prims.length > 1);
  for (const p of prims) for (let i = 0; i < p.edges.left.length; i++) {
    const a = p.edges.left[i], b = p.edges.right[i];
    assert.ok(Math.abs(Math.hypot(a[0] - b[0], a[2] - b[2]) - 1) < 0.02, `width ${Math.hypot(a[0] - b[0], a[2] - b[2])}`);
    for (const q of [a, b]) assert.ok(Math.abs(q[1] - W.sceneGroundHeight(cam, q[0], q[2])) < 1e-9, 'each side stands on the ground under it');
    assert.ok(Math.abs(p.edges.top[i] - Math.max(a[1], b[1]) - 1.7) < 0.3, 'the top follows the slope at the hedge height');
  }
  const ys = prims.flatMap(p => p.edges.left.map(q => q[1]));
  assert.ok(Math.max(...ys) - Math.min(...ys) > 0.5, 'the hedge climbs the slope');
});

test('Q2: gates are gaps; fences and railings are posts and rails, not slabs', () => {
  const cam = camOf();
  const prims = W.worldExtrudeLine({ id: 'f', kind: 'fence', path: [[2, 3], [2, 40]], gaps: [{ at: 15, w: 3 }] }, cam);
  const inPoly = (poly, x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / ((b[1] - a[1]) || 1e-12) + a[0]) c = !c; } return c; };
  assert.ok(!prims.some(p => inPoly(p.foot, 2, 18)), 'nothing stands in the gate');
  assert.ok(prims.some(p => p.zFar <= 16.6) && prims.some(p => p.zKey >= 19.4), 'the fence runs on both sides of it');
  assert.ok(prims.every(p => !p.faces.some(f => f.role === 'side')), 'a post-and-rail fence has no solid face');
  assert.ok(prims.some(p => p.details.some(d => d.type === 'stroke')) && prims.some(p => p.details.some(d => d.type === 'fill')), 'rails and posts');
  const wall = W.worldExtrudeLine({ id: 'g', kind: 'wall', path: [[-3, 3], [-3, 40]], gaps: [[12, 15]] }, cam);
  assert.ok(wall.some(p => p.faces.some(f => f.role === 'end')), 'a wall shows its end at a gap');
});

test('Q3: a building shows the faces on the eye\'s side', () => {
  const cam = camOf();
  const right = W.worldExtrudeBuilding({ id: 'b1', foot: [[10, 30], [20, 30], [20, 40], [10, 40]], storeys: 2, style: 'victorian-terrace' }, cam);
  assert.ok(right && right.walls.length >= 2, JSON.stringify(right && right.walls));
  for (const w of right.walls) {
    const mid = [(w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2];
    assert.ok(w.n[0] * -mid[0] + w.n[1] * -mid[1] > 0, `wall ${w.edge} faces away from the eye`);
  }
  const has = (n) => right.walls.some(w => Math.abs(w.n[0] - n[0]) < 1e-6 && Math.abs(w.n[1] - n[1]) < 1e-6);
  assert.ok(has([0, -1]) && has([-1, 0]), 'the front and the side towards the eye');
  assert.ok(!has([0, 1]) && !has([1, 0]), 'never the back or the far side');
  assert.ok(right.direct.shapes.length > 20, 'windows in courses, roof, details');
  const ahead = W.worldExtrudeBuilding({ id: 'b2', foot: [[-5, 30], [5, 30], [5, 40], [-5, 40]], storeys: 3, style: 'victorian-terrace' }, cam);
  assert.equal(ahead.walls.length, 1, 'straight ahead only the front shows');
  assert.ok(ahead.zKey === 30 && ahead.solidity === 'solid');
});

test('Q4: a long hull seen end-on is drawn end-on; seen at an angle it recedes in perspective (sprite hulls: a bus)', () => {
  const cam = camOf();
  const away = W.worldExtrudeHull({ id: 'bus', obj: 'vehicle.bus', x: 0, z: 30, y: 0, facing: 0 }, cam);
  assert.equal(away.end.which, 'stern');
  assert.equal(away.end.obj, 'vehicle.bus-rear', 'the rear art');
  assert.equal(away.strips.length, 0, 'no side slab when exactly end-on');
  const toward = W.worldExtrudeHull({ id: 'bus', obj: 'vehicle.bus', x: 0, z: 30, y: 0, facing: 180 }, cam);
  assert.equal(toward.end.which, 'bow');
  assert.equal(toward.end.obj, 'vehicle.bus-front');
  const v = W.worldViewOf({ obj: 'boat.narrowboat', x: 0, z: 30, facing: 0 }, cam);
  assert.equal(v.view, 'back'); assert.equal(v.persp, true); assert.equal(v.end, 'stern');
  const oblique = W.worldExtrudeHull({ id: 'bus', obj: 'vehicle.bus', x: -4, z: 22, y: 0, facing: 25 }, cam);
  assert.ok(oblique.strips.length >= 4);
  const hs = oblique.strips.map(s => ({ z: s.z, h: Math.abs(s.quad[3][1] - s.quad[0][1]) })).sort((a, b) => a.z - b.z);
  for (let i = 1; i < hs.length; i++) assert.ok(hs[i].h < hs[i - 1].h + 1e-6, 'farther slices are shorter');
  const ratio = hs[0].h / hs[hs.length - 1].h, depth = hs[hs.length - 1].z / hs[0].z;
  assert.ok(Math.abs(ratio - depth) / depth < 0.05, `the slices foreshorten with depth (${ratio} vs ${depth}): never a flat slab`);
  // every triangle's map sends its art corners exactly to the projected hull: neighbouring slices share their edges (no steps)
  for (const s of oblique.strips) for (const t of s.tris) t.art.forEach((a, k) => {
    const m = t.m, X = m[0] * a[0] + m[2] * a[1] + m[4], Y = m[1] * a[0] + m[3] * a[1] + m[5];
    assert.ok(Math.hypot(X - t.pts[k][0], Y - t.pts[k][1]) < 0.05, 'exact at the corners');
  });
  const ord = oblique.strips.slice().sort((a, b) => a.a0 - b.a0);
  for (let i = 1; i < ord.length; i++) if (Math.abs(ord[i].a0 - ord[i - 1].a1) < 1e-6) assert.ok(Math.hypot(ord[i].quad[0][0] - ord[i - 1].quad[1][0], ord[i].quad[0][1] - ord[i - 1].quad[1][1]) < 0.05 && Math.hypot(ord[i].quad[3][0] - ord[i - 1].quad[2][0], ord[i].quad[3][1] - ord[i - 1].quad[2][1]) < 0.05, 'slices meet edge to edge');
  assert.ok(Number.isInteger(oblique.art.repeat));
});

// ---- the narrowboat model (16 Oct): true size, the end it shows, faces seen, the painter's order, night, ropes, bob ----
const NB = (o) => Object.assign({ id: 'nb', obj: 'boat.narrowboat', x: 0, z: 30, y: -0.511, waterline: -0.45, facing: 0, static: true }, o || {});
test('narrowboat model: the end the eye sees, a 3D model drawn from any angle', () => {
  const cam = camOf();
  const away = W.worldExtrudeHull(NB({ facing: 0 }), cam), toward = W.worldExtrudeHull(NB({ facing: 180 }), cam);
  assert.ok(away.model && toward.model, 'canal boats are the 3D model');
  assert.equal(away.end.which, 'stern');
  assert.equal(toward.end.which, 'bow');
  assert.equal(away.strips.length, 0, 'no sprite slices');
  assert.ok(away.faces.some(f => f.role === 'tiller') && away.faces.some(f => f.role === 'rudder'), 'a tiller and a rudder at the stern');
  assert.ok(toward.faces.some(f => f.role === 'cratch') && toward.faces.some(f => f.role === 'cover'), 'a cratch board and its cover at the bow');
  for (const facing of [0, 30, 60, 90, 135, 180, 225, 270, 315]) {
    const m = W.worldExtrudeHull(NB({ facing, x: 3, z: 25 }), cam);
    assert.ok(m && m.faces.length > 40, `${facing}: a full model (${m && m.faces.length} faces)`);
    for (const f of m.faces) for (const p of f.pts) assert.ok(Number.isFinite(p[0]) && Number.isFinite(p[1]), `${facing}: finite points (${f.role})`);
  }
});

test('narrowboat model: true size above the waterline (K8 1.7-2.1 m: the giant invariant) and nothing drawn under the water', () => {
  const cam = camOf();
  for (const v of [0, 1, 2]) {
    const m = W.worldExtrudeHull(NB({ variant: v, facing: 90, x: 0, z: 20 }), cam);
    assert.ok(m.height >= 1.7 && m.height <= 2.1, `variant ${v}: ${m.height} m to the chimney's hat`);
    assert.ok(m.roofH >= 1.6 && m.roofH <= 1.85, `roof ${m.roofH} m above the water`);
    assert.equal(m.waterline, -0.45, 'the hull starts at the waterline');
    // the hull's lowest drawn row is the waterline's row at its nearest point (never a black slab on the surface)
    const yRow = (z) => cam.horizon + cam.f * (cam.eye - -0.45) / z;
    const hullMax = Math.max(...m.faces.filter(f => f.role === 'hull').flatMap(f => f.pts.map(p => p[1])));
    assert.ok(hullMax <= yRow(20 - 1.05) + 0.5, `hull bottom ${hullMax} vs waterline row ${yRow(20 - 1.05)}`);
  }
});

test('narrowboat model: only the faces that face the eye, in a painter order valid from the side, above and below', () => {
  const cam = camOf();
  const side = W.worldExtrudeHull(NB({ facing: 90, x: 0, z: 20 }), cam);   // broadside, bow to the right
  const hull = side.faces.filter(f => f.role === 'hull');
  assert.ok(hull.length >= 3 && hull.every(f => f.z < 20 + 0.3), 'the far side of the hull is culled');
  const cab = side.faces.filter(f => f.role === 'cabin');
  assert.ok(cab.every(f => f.z < 20 + 0.3), 'the far cabin side is culled');
  const roles = side.faces.map(f => f.role), iLast = (r) => roles.lastIndexOf(r), iFirst = (r) => roles.indexOf(r);
  assert.ok(iLast('hull') < iFirst('cabin'), 'the hull before the cabin');
  assert.ok(iFirst('roof') > iLast('cabin') && iFirst('chimney') > iLast('roof'), 'eye above the roof: cabin, roof, then the clutter on it');
  const low = W.worldExtrudeHull(NB({ facing: 90, x: 0, z: 20, y: 0.9, waterline: 0.95 }), cam);   // the roof above the eye
  const lr = low.faces.map(f => f.role);
  assert.ok(!lr.includes('roof'), 'no roof face from below');
  assert.ok(lr.lastIndexOf('chimney') < lr.indexOf('cabin'), 'eye below the roof: the cabin side hides the foot of the chimney');
  // the near end's gear after the cabin, the far end's before it
  const st = W.worldExtrudeHull(NB({ facing: 0 }), cam), sr = st.faces.map(f => f.role);
  assert.ok(sr.indexOf('tiller') > sr.lastIndexOf('cabin'), 'stern towards the eye: the tiller over the cabin');
  assert.ok(sr.indexOf('cratch') < 0 || sr.indexOf('cratch') < sr.lastIndexOf('cabin'), 'the cratch behind the cabin');
});

test('narrowboat model: liveries vary by boat within the variant family; near boats carry their details', () => {
  assert.ok(W.WORLD_BOAT_LIVERIES.length >= 8, 'more liveries');
  const cam = camOf(), seen = new Set();
  for (let i = 0; i < 12; i++) for (const v of [0, 1, 2]) {
    const m = W.worldExtrudeHull(NB({ id: 'nb' + i, variant: v, facing: 90 }), cam);
    assert.equal(m.livery % 3, v, 'the variant keeps its family');
    seen.add(m.livery);
  }
  assert.ok(seen.size >= 6, `${seen.size} liveries over 36 boats`);
  const near = W.worldExtrudeHull(NB({ facing: 90, x: 0, z: 14 }), cam);
  for (const r of ['window', 'curtain', 'name', 'door', 'brass', 'strake', 'handrail', 'chimney', 'vent', 'plank']) assert.ok(near.faces.some(f => f.role === r), `a near boat has ${r}`);
  const far = W.worldExtrudeHull(NB({ facing: 90, x: 0, z: 140 }), cam);
  assert.ok(far.faces.length < near.faces.length / 2, `far away the small details drop (${far.faces.length} vs ${near.faces.length})`);
});

test('narrowboat model: windows light up after dusk (emissive, a glow) and stay dark by day', () => {
  const cam = camOf();
  let litBoats = 0;
  for (let i = 0; i < 10; i++) {
    const m = W.worldExtrudeHull(NB({ id: 'moored-' + i, facing: 90, x: 0, z: 16 }), cam);
    const fills = (night) => { const ctx = mockCtx(), seen = []; ctx.fill = () => seen.push(ctx.fillStyle); W.worldExtrudeDraw(ctx, m, { night, colour: (mat, hex) => hex }); return seen; };
    assert.ok(!fills(false).includes('#ffd48a'), 'no lit window by day');
    if (fills(true).includes('#ffd48a')) litBoats++;
  }
  assert.ok(litBoats >= 4 && litBoats <= 10, `${litBoats} of 10 moored boats have someone aboard after dusk`);
});

test('narrowboat model: mooring ropes run to the bank (never into the water); none under way or with no bank known', () => {
  const cam = camOf();
  // a canal along z from x -6 to 0: the bank is at x > 0
  const regions = [{ polyM: [[-6, 0], [0, 0], [0, 200], [-6, 200]] }];
  const ent = NB({ x: -2.2, z: 24, facing: 0 });
  const m = W.worldExtrudeHull(ent, cam, { regions });
  assert.equal(m.bank, 1);
  assert.equal(m.faces.filter(f => f.role === 'rope').length, 2, 'stern and bow lines');
  for (const p of m.faces.filter(f => f.role === 'pin')) {
    const x = (p.pts[0][0] - cam.x0) * p.z / cam.f;
    assert.ok(x > 0, `the pin stands on the bank (x ${x.toFixed(2)})`);
  }
  assert.ok(!W.worldExtrudeHull(ent, cam).faces.some(f => f.role === 'rope'), 'no ropes when the bank is not known');
  assert.ok(!W.worldExtrudeHull(Object.assign({}, ent, { vx: 0, vz: 1.2, static: false }), cam, { regions }).faces.some(f => f.role === 'rope'), 'none under way');
});

test('narrowboat model: a gentle bob with time; a still (no time) never moves', () => {
  const cam = camOf();
  const a = W.worldExtrudeHull(NB({ facing: 90, x: 0, z: 16 }), cam), b = W.worldExtrudeHull(NB({ facing: 90, x: 0, z: 16 }), cam);
  assert.deepEqual(a.faces.map(f => f.pts), b.faces.map(f => f.pts), 'deterministic');
  const ys = [0, 0.9, 1.8, 2.7].map(t => W.worldExtrudeHull(NB({ facing: 90, x: 0, z: 16 }), cam, { t }).faces.find(f => f.role === 'chimney').pts[0][1]);
  const span = Math.max(...ys) - Math.min(...ys), px1cm = cam.f * 0.01 / 16;
  assert.ok(span > 0.2 * px1cm && span < 4 * px1cm, `the chimney bobs ${span.toFixed(2)} px (1 cm is ${px1cm.toFixed(2)} px)`);
});

test('walkways (bug 7): a boardwalk or platform is drawn from the nav deck itself, so people stand on what is drawn', () => {
  const cam = camOf();
  // a viewing platform turned 40 degrees, its nav deck a rotated 8 x 4 m box at 1 m (as worldObjectInfo gives it)
  const deck = { poly: [[2.479, 29.2], [7.657, 35.371], [10.721, 32.8], [5.543, 26.629]], y: 1.0 };
  const ent = { id: 'platform', obj: 'structure.viewing-platform', x: 6.6, z: 31, y: 0, facing: 40, deck, foot: deck.poly, static: true };
  const m = W.worldExtrudeHull(ent, cam, { regions: [{ polyM: [[-40, 0], [40, 0], [40, 200], [-40, 200]] }] });
  assert.ok(m && m.walkway && m.model, 'a walkway model, not the side sprite');
  assert.equal(m.deckY, 1.0);
  const top = m.faces.find(f => f.role === 'deck');
  assert.ok(top, 'the deck is seen from above');
  const want = deck.poly.map(p => P(cam, [p[0], 1.0, p[1]]));
  assert.equal(top.pts.length, want.length);
  top.pts.forEach((q, i) => assert.ok(Math.hypot(q[0] - want[i][0], q[1] - want[i][1]) < 0.05, `deck corner ${i}: drawn ${q} vs nav ${want[i].map(v => v.toFixed(2))}`));
  // the railings run along the deck's edges (never across open water): every post stands on the deck's outline
  const posts = m.faces.filter(f => f.role === 'post');
  assert.ok(posts.length >= 8, `${posts.length} posts`);
  const inside = (P2, X, Y) => { let c = false; for (let i = 0, j = P2.length - 1; i < P2.length; j = i++) { const a = P2[i], b = P2[j]; if ((a[1] > Y) !== (b[1] > Y) && X < (b[0] - a[0]) * (Y - a[1]) / ((b[1] - a[1]) || 1e-12) + a[0]) c = !c; } return c; };
  const grown = want.map(q => { const cx = want.reduce((s, p) => s + p[0], 0) / 4, cy = want.reduce((s, p) => s + p[1], 0) / 4; return [cx + (q[0] - cx) * 1.03, cy + (q[1] - cy) * 1.03]; });
  for (const p of posts) assert.ok(inside(grown, p.pts[0][0], p.pts[0][1]), `a post foot at ${p.pts[0]} stands on the deck`);
  assert.ok(m.faces.some(f => f.role === 'pile'), 'piles down to the water');
  // a boardwalk running away from the eye: its rails run away too (they converge), never across the view
  const bw = W.worldExtrudeHull({ id: 'bw', obj: 'structure.boardwalk', x: 1.2, z: 16, y: 0, facing: 8, static: true, deck: { poly: [[-0.191, 13.291], [0.61, 18.988], [2.591, 18.709], [1.79, 13.012]], y: 0.2 } }, cam);
  const rails = bw.faces.filter(f => f.role === 'rail');
  assert.ok(rails.length >= 4);
  for (const r of rails) { const dx = Math.abs(r.pts[r.pts.length - 1][0] - r.pts[0][0]); assert.ok(dx < 200, `a rail spans ${dx.toFixed(0)} px across (it runs into the view)`); }
  const brg = W.worldExtrudeHull({ id: 'br', obj: 'structure.bridge-brick', x: 0, z: 60, y: 0, facing: 90, landmark: true }, cam);
  assert.ok(!brg || !brg.walkway, 'bridges and landmarks keep their art');
});

test('Q4: worldExtrude gives long statics their perspective hull, sorted far to near; one bad entry never stops the rest', () => {
  const cam = camOf();
  const world = { cam, entities: [
    { id: 'nb', obj: 'boat.narrowboat', x: -5, z: 25, y: -0.5, facing: 15, static: true },
    { id: 'bench', obj: 'street.bench', x: 3, z: 9, y: 0, facing: 270, static: true },
  ], lines: [{ id: 'kerb', kind: 'kerb', path: [[1, 2], [1, 90]] }, { id: 'bad', kind: 'wall', path: 'nope' }, { id: 'bad2', kind: 'wall', path: [[0, 0], [NaN, 3]] }],
  buildings: [{ id: 'mill', foot: [[12, 60], [30, 60], [30, 75], [12, 75]], storeys: 4, style: 'mill' }, { id: 'broken', foot: [[1, 2]] }] };
  const prims = W.worldExtrude(world, cam);
  assert.ok(prims.some(p => p.kind === 'hull' && p.ent === 'nb'), 'the boat is a hull');
  assert.ok(!prims.some(p => p.ent === 'bench'), 'a bench is a sprite, not a hull');
  assert.ok(prims.some(p => p.kind === 'building' && p.ent === 'mill'));
  assert.ok(prims.some(p => p.kind === 'line' && p.ent === 'kerb'));
  for (let i = 1; i < prims.length; i++) assert.ok(prims[i - 1].zKey >= prims[i].zKey, 'far to near');
  for (const p of prims) assert.ok(Array.isArray(p.foot) && p.foot.length >= 3 && Array.isArray(p.box) && Number.isFinite(p.zKey), `${p.id} has a footprint, a box and a key`);
});

test('worldExtrudeDraw draws every kind of prim on a 2D context, with materials', () => {
  const cam = camOf(), mats = new Set();
  const colour = (mat, hex) => { mats.add(mat); return hex; };
  const wall = W.worldExtrudeLine({ id: 'w', kind: 'wall', path: [[2, 3], [2, 12]] }, cam)[0];
  let ctx = mockCtx();
  const n = W.worldExtrudeDraw(ctx, wall, { vs: 2, ox: 10, oy: 5, colour });
  assert.equal(n, wall.faces.length + wall.details.length);
  assert.equal(ctx.calls.filter(c => c[0] === 'fill').length, wall.faces.length + wall.details.filter(d => d.type === 'fill').length);
  assert.ok(ctx.calls.some(c => c[0] === 'setTransform' && c[1] === 2 && c[5] === 10 && c[6] === 5), 'one uniform scale');
  assert.ok(mats.has('stone'));
  const hull = W.worldExtrudeHull({ id: 'bus', obj: 'vehicle.bus', x: -4, z: 22, y: 0, facing: 25 }, cam);
  const sprite = (req) => { const b = req.o === 'vehicle.bus' ? [-76, -68, 77, 5] : [-30, -68, 30, 5]; return { c: { width: 200, height: 50 }, x0: b[0], y0: b[1], w: b[2] - b[0], h: b[3] - b[1] }; };
  ctx = mockCtx();
  W.worldExtrudeDraw(ctx, hull, { sprite });
  assert.equal(ctx.calls.filter(c => c[0] === 'drawImage').length, 2 * hull.strips.length + (hull.end && hull.end.obj ? 2 : 0), 'two exactly mapped triangles per slice and for the end');
  assert.equal(ctx.calls.filter(c => c[0] === 'clip').length, ctx.calls.filter(c => c[0] === 'drawImage').length, 'each triangle clipped');
  ctx = mockCtx();
  assert.ok(W.worldExtrudeDraw(ctx, hull, {}) >= hull.strips.length, 'without art the slices are filled, never skipped');
  // the boat model: a fill per face, a stroke per line (ropes, rails, tiller), a hairline seal on big panels; by day no glow
  const boat = W.worldExtrudeHull({ id: 'nb', obj: 'boat.narrowboat', x: -4, z: 22, y: -0.5, facing: 25 }, cam);
  ctx = mockCtx();
  const nB = W.worldExtrudeDraw(ctx, boat, { colour });
  const nLines = boat.faces.filter(f => f.line).length, nFills = boat.faces.length - nLines, nSeal = boat.faces.filter(f => f.seal).length;
  assert.equal(nB, boat.faces.length, 'one draw per face');
  assert.equal(ctx.calls.filter(c => c[0] === 'fill').length, nFills);
  assert.equal(ctx.calls.filter(c => c[0] === 'stroke').length, nLines + nSeal);
  assert.ok(mats.has('paint') && mats.has('metal'), 'materials graded by the look');
  const b = W.worldExtrudeBuilding({ id: 'b', foot: [[-6, 25], [6, 25], [6, 33], [-6, 33]], storeys: 2, style: 'victorian-terrace' }, cam);
  ctx = mockCtx();
  const nb = W.worldExtrudeDraw(ctx, b, { night: true, windowShare: 1 });
  assert.ok(nb >= b.direct.shapes.length, 'every shape of the building');
  assert.ok(ctx.calls.filter(c => c[0] === 'moveTo').length >= b.direct.shapes.length, 'the generator paths are traced');
});

test('Q5: paving courses and mowing stripes of the v2 ground compile foreshorten with depth', () => {
  assert.equal(typeof W.sceneCompile, 'function');
  const data = { v: 2, id: 'q5', camera: { eye: 1.65, fov: 64, horizon: 470, heading: 0 }, at: 'noon', season: 'summer',
    surfaces: [{ id: 'rest', kind: 'grass', rest: true }, { id: 'lawn', kind: 'lawn', poly: [[-30, 3], [-3, 3], [-3, 80], [-30, 80]] }, { id: 'pv', kind: 'pavement', path: [[3, 2], [3, 120]], width: 2.5 }],
    water: [], place: [] };
  const C = W.sceneCompile(data, { season: 'summer' }), cam = C.cam;
  const polys = (g) => g.d.split(/[Mm]/).filter(Boolean).map(s => (s.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)).map(a => { const pts = []; for (let i = 0; i + 1 < a.length; i += 2) pts.push([a[i], a[i + 1]]); return pts; });
  // paving joints: transverse lines every 0.9 m; the gap between successive rows is f eye 0.9 / (z1 z2)
  const rows = C.ground.filter(g => g.mark === 'joints').flatMap(polys).map(pts => pts.reduce((s, p) => s + p[1], 0) / pts.length).sort((a, b) => b - a);
  assert.ok(rows.length > 20, `${rows.length} joints`);
  let checked = 0;
  for (let i = 1; i < rows.length; i++) {
    const z = cam.f * cam.eye / (rows[i - 1] - cam.horizon), want = W.worldForeshorten(cam, z, 0.9).along, got = rows[i - 1] - rows[i];
    if (got < 1.5) continue;   // sub-unit rows: rounding
    assert.ok(Math.abs(got - want) / want < 0.08, `joint gap at ${z.toFixed(1)} m: ${got.toFixed(2)} vs ${want.toFixed(2)}`);
    checked++;
  }
  assert.ok(checked > 10);
  // mowing stripes: 2.4 m bands; a band is f 2.4 / z wide at depth z (wider near, narrower far)
  const stripe = C.ground.filter(g => g.mark === 'stripes').flatMap(polys).find(pts => pts.length >= 4);
  assert.ok(stripe, 'the lawn has stripes');
  const ys = stripe.map(p => p[1]), yNear = Math.max(...ys), yFar = Math.min(...ys);
  const widthAt = (Y) => { const xs = stripe.filter(p => Math.abs(p[1] - Y) < 0.6).map(p => p[0]); return Math.max(...xs) - Math.min(...xs); };
  const zN = cam.f * cam.eye / (yNear - cam.horizon), zF = cam.f * cam.eye / (yFar - cam.horizon), wN = widthAt(yNear), wF = widthAt(yFar);
  if (wN > 2 && wF > 0.5) assert.ok(Math.abs(wN / wF - zF / zN) / (zF / zN) < 0.1, `stripe widths ${wN} / ${wF} vs depths ${zF} / ${zN}`);
  // the helper every texture, course, stripe and ripple uses: across ~ 1 / z, along ~ 1 / z^2
  const a = W.worldForeshorten(cam, 10, 0.05), b = W.worldForeshorten(cam, 20, 0.05);
  assert.ok(Math.abs(a.across / b.across - 2) < 1e-9);
  assert.ok(Math.abs(a.along / b.along - 4) < 0.03);
  assert.ok(Math.abs(a.row - (cam.horizon + cam.f * cam.eye / 10)) < 1e-3);
});

test('bug 7: the nav deck of a walkway lies under its railing (the drawn planks), not at the railing top', () => {
  for (const id of ['structure.boardwalk', 'structure.viewing-platform']) {
    const wi = W.worldObjectInfo(id);
    if (!wi || !wi.deck) continue;
    const top = Array.isArray(wi.size) ? wi.size[1] : wi.size && (wi.size.h || wi.size.height);
    assert.ok(Number.isFinite(top) && wi.deck.y <= top - 0.9, `${id}: the deck (${wi.deck.y} m) lies under the railing top (${top} m)`);
  }
});
