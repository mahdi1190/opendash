// World engine, light and water fixes from the 15 Oct audit (requirements L2, L4, L5, H1, H5, H6, K7, M3). One test per bug class,
// each written so it fails on the engine as it was before the fix:
//   12  v2 seasonal screen particles (petals, motes that glow as fireflies, leaves from an empty sky) drawn over a world scene
//   13  lamp pools painted as opaque discs over plants (also at dawn); window halos drawn over the whole frame and off their panes
//       (merge of 15 Oct: main's lights are kept, SCENE_LESSONS H: soft capped pools under what stands, lit glass on the panes,
//       halos only round real sources; the tests below check bug 13 on them, and uk-rebuild's halo-on-the-sprite point is ported)
//   16  two overlapping water surfaces drawn as two regions (a glass-slab seam); a ripple that broke reflections into zigzags
//   17  shadows cast by things that draw no pixels
//   night reflections paler than what they mirror (the day tint mixed into the night water)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadScenes, repoRoot } from '../tools/lib/scene-page.mjs';

const NAMES = ['worldHostData', 'worldHostSpec', 'sceneCompile', '_scPacks', 'sceneCamera', 'worldWaterPlan', 'worldWaterSpansAt', 'worldWaterContact', 'worldWaterMirror',
  'worldWaterComposite', 'worldWaterRipple', 'worldWaterLook', 'worldSkyOf', 'worldShadowPlan', 'worldLights', 'worldDrawLights', 'worldLightDraws', 'WORLD_LIGHT_CAPS', 'worldGlitterPlan',
  '_wfrLightOnRec', '_wfrWet', 'worldDrawShadows', 'worldSunOf', 'worldBuild', 'worldFramePlan', 'worldGlowParts'];
const x = 'globalThis.__wlw = {' + NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + '};';
loadScenes(repoRoot(), { fixtures: false, browser: true, extra: x });
const E = globalThis.__wlw;
delete globalThis.__wlw;

const cam = E.sceneCamera({ camera: { eye: 1.65, fov: 62, horizon: 455, heading: 70 } });
const FLEET = { lat: 51.28, lon: -0.84 };
const skyAt = (iso, wx = 'clear') => E.worldSkyOf({ ms: Date.parse(iso), lat: FLEET.lat, lon: FLEET.lon, weather: wx }, { live: false });
const IDS = ['fleet-canal-2-w3', 'fleet-pond-2-w3', 'sheffield-kelham-1-w3'];
const specOf = (id) => E.worldHostSpec((E._scPacks['world-test'] || []).find(it => it.id === id));

/* ---------- 12: no v2 screen particles in a world scene ---------- */
test('bug 12: a world scene carries no v2 seasonal particles (no petals, motes or leaves from an empty sky)', () => {
  for (const id of IDS) {
    const data = E.worldHostData(specOf(id), { id: 'lw-' + id, sim: false });
    assert.equal(data.particles, 'none', id + ': host data asks for no seasonal particles');
    for (const season of ['spring', 'summer', 'autumn', 'winter']) {
      const C = E.sceneCompile(data, { season });
      assert.ok(!C.particles || C.particles.kind === 'none' || !C.particles.n, `${id} ${season}: compiled particles ${JSON.stringify(C.particles)}`);
    }
  }
});

/* ---------- 16: one water, no seam ---------- */
const pond = (id, poly, o = {}) => Object.assign({ id, kind: 'water', water: 'pond', level: 0, poly }, o);
test('bug 16: overlapping water surfaces at one level are one region: one wet mask, one base, no seam along a part', () => {
  const world = { cam, surfaces: [pond('pond', [[-60, 20], [-6, 18], [-3, 3], [4, 3], [6, 16], [60, 22], [60, 120], [-60, 120]]), pond('cut', [[-3, 3], [4, 3], [5, 18], [3, 28], [-2, 28], [-6, 18]])] };
  const R = E.worldWaterPlan(world, cam);
  assert.equal(R.length, 1, 'one region for the pond and its inlet');
  assert.deepEqual(R[0].ids.sort(), ['cut', 'pond']);
  // the spans of a column through the overlap are one run (the union), not two overlapping runs
  const X = cam.x0 + cam.f * (-4) / 20;
  const sp = E.worldWaterSpansAt(R[0], X);
  assert.equal(sp.length, 1, 'one run: ' + JSON.stringify(sp));
  // a point in the inlet only is in this water
  assert.equal(E.worldWaterContact(R[0], { x: 0, z: 26, obj: 'bird.mallard' }, cam).kind, 'own');
  // the base: along a row crossing the inlet's outline, no step (only the dither, +-2)
  const res = E.worldWaterMirror(null, R[0], null, null, { W: 1600, H: 900, ripple: false, sky: skyAt('2026-07-15T12:00:00Z') });
  const y = Math.round(cam.horizon + cam.f * cam.eye / 12) - res.y0, row = [];
  for (let xx = 0; xx < res.w; xx++) { const q = (y * res.w + xx) * 4; if (res.img.data[q + 3]) row.push(res.img.data[q + 1]); }
  let step = 0;
  for (let i = 1; i < row.length; i++) step = Math.max(step, Math.abs(row[i] - row[i - 1]));
  assert.ok(row.length > 200 && step <= 4, `row of ${row.length} wet pixels, largest step ${step}`);
  assert.equal(res.gaps, 0);
  // separate waters, or one at another level, stay separate
  const two = E.worldWaterPlan({ cam, surfaces: [pond('a', [[-30, 10], [-10, 10], [-10, 40], [-30, 40]]), pond('b', [[10, 10], [30, 10], [30, 40], [10, 40]])] }, cam);
  assert.equal(two.length, 2);
  const lock = E.worldWaterPlan({ cam, surfaces: [pond('a', [[-10, 10], [10, 10], [10, 40], [-10, 40]]), pond('b', [[-10, 40], [10, 40], [10, 80], [-10, 80]], { level: -1.5 })] }, cam);
  assert.equal(lock.length, 2, 'a step in level is two waters');
});

test('bug 16: the parts of a region are wound one way, so a nonzero clip of all of them is their union', () => {
  const R = E.worldWaterPlan({ cam, surfaces: [pond('p', [[-20, 10], [20, 10], [20, 60], [-20, 60]]), pond('q', [[-5, 50], [-5, 90], [5, 90], [5, 50]])] }, cam)[0];
  const area = (P) => { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return a; };
  assert.equal(R.clips.length, 2);
  assert.ok(R.clips.every(P => area(P) > 0), 'every part wound the same way');
  const wet = E._wfrWet({ cam, surfaces: [] }, cam, [R]);
  assert.equal(wet.water.length, 2, 'the compositor clips the water by every part');
});

test('bug 16: the ripple is a quiet shimmer: still water (canals) under a pixel, rivers and ponds a few pixels near the camera', () => {
  // (merge of 15 Oct) main's ripple is kept (its slope cap: a reflection never shears more than WORLD_RIPPLE_SLOPE a row, SCENE_LESSONS
  // H); still water stays under a pixel (uk-rebuild's own limit, 0.6 px, was set for its amplitude formula, which is not kept)
  const lim = { canal: 1, pond: 1.4, river: 2.2 };
  for (const kind of Object.keys(lim)) {
    const [R] = E.worldWaterPlan({ cam, surfaces: [{ id: kind, kind: 'water', water: kind, poly: [[-30, 2], [30, 2], [30, 200], [-30, 200]] }] }, cam);
    let A = 0, shear = 0;
    for (let y = Math.ceil(R.box[1]); y < 900; y += 3) for (let t = 0; t < 6; t += 0.37) {
      const a = E.worldWaterRipple(R, y, t, { vs: 1, oy: 0, wind: 1 }), b = E.worldWaterRipple(R, y + 1, t, { vs: 1, oy: 0, wind: 1 });
      A = Math.max(A, Math.abs(a)); shear = Math.max(shear, Math.abs(b - a));
    }
    assert.ok(A < lim[kind], `${kind}: largest shift ${A.toFixed(2)} px (limit ${lim[kind]})`);
    assert.ok(shear <= 0.46, `${kind}: never a zigzag (a shear of ${shear.toFixed(2)} px a row)`);
    assert.ok(A > 0.05, `${kind}: it still moves`);
  }
});

/* ---------- night reflections ---------- */
test('a reflection at night is never paler than what it mirrors (no day tint in the night water)', () => {
  const [R] = E.worldWaterPlan({ cam, surfaces: [pond('n', [[-30, 6], [30, 6], [30, 80], [-30, 80]])] }, cam);
  const z = 30, h = 60, X = Math.round(cam.x0), Y = Math.round(cam.horizon + cam.f * cam.eye / z);
  const img = { data: new Uint8ClampedArray(20 * h * 4), width: 20, height: h };
  for (let i = 0; i < 20 * h; i++) { img.data[i * 4] = 14; img.data[i * 4 + 1] = 18; img.data[i * 4 + 2] = 16; img.data[i * 4 + 3] = 255; }
  const post = { id: 'p', obj: 'street.bollard', x: 0, z, y: 0 };
  const { comp, owner } = E.worldWaterComposite(R, [{ id: 'p', z, contact: E.worldWaterContact(R, post, cam), img, x: X - 10, y: Y - h }], { W: 1600, H: 900 });
  const res = E.worldWaterMirror(null, R, comp, owner, { W: 1600, H: 900, ripple: false, sky: skyAt('2026-07-16T00:05:00Z') });
  const r = Y + 5 - res.y0, q = (r * res.w + (X - res.x0)) * 4, R0 = res.refl.data;
  assert.ok(R0[q + 3] > 0, 'reflected');
  assert.ok(R0[q + 1] <= 30, `the mirrored dark post stays dark at night (green ${R0[q + 1]})`);
});

/* ---------- 13: lights ---------- */
test('bug 13: lights show by how dark it is: none by day, faint in twilight, full at night', () => {
  // (merge of 15 Oct) main's lights: a lamp lights by its photocell (a seeded threshold round sunset), never by day; what it paints is a
  // soft falloff within WORLD_LIGHT_CAPS at any hour, so a lamp lit at dawn is never a cream disc
  const world = { entities: [{ id: 'lp', obj: 'street.lamppost', x: 3, z: 14, y: 0, facing: 90 }] };
  const lit = (iso) => E.worldLights(world, { sky: skyAt(iso) }).filter(l => l.kind === 'lamp' && l.on);
  assert.equal(lit('2026-07-15T12:00:00Z').length, 0, 'noon: off');
  assert.ok(lit('2026-07-16T00:05:00Z').length > 0, 'night: on');
  for (const iso of ['2026-01-15T07:43:00Z', '2026-07-16T00:05:00Z']) {
    for (const d of E.worldLightDraws(lit(iso), cam, { sky: skyAt(iso) })) {
      if (d.kind === 'pool') assert.ok(d.a <= E.WORLD_LIGHT_CAPS.poolAlpha && d.rx <= E.WORLD_LIGHT_CAPS.poolPx, `${iso}: a capped pool`);
      if (d.kind === 'halo') assert.ok(d.a <= E.WORLD_LIGHT_CAPS.haloAlpha && d.rx <= E.WORLD_LIGHT_CAPS.haloPx, `${iso}: a capped halo`);
    }
  }
});

/** A 2D context stand-in that records the fills (arcs and polygons) and the composite mode. */
function rec() {
  const L = [];
  const g = { addColorStop() {} };
  const ctx = { globalAlpha: 1, globalCompositeOperation: 'source-over', fillStyle: null, save() {}, restore() {}, translate() {}, scale() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {},
    arc(x, y, r) { L.push({ kind: 'arc', x, y, r, op: this.globalCompositeOperation }); }, ellipse(x, y, rx, ry) { L.push({ kind: 'ellipse', x, y, rx, ry, op: this.globalCompositeOperation }); },
    fill() { L.push({ kind: 'fill', style: this.fillStyle, alpha: this.globalAlpha, op: this.globalCompositeOperation }); },
    fillRect() { L.push({ kind: 'fill', style: this.fillStyle, alpha: this.globalAlpha, op: this.globalCompositeOperation }); }, createRadialGradient() { return g; }, createLinearGradient() { return g; } };
  return { ctx, L };
}
test('bug 13: lamp pools fall on the ground as a soft additive falloff (never a flat disc) and halos are drawn apart from them', () => {
  const lamp = { ref: 'l', part: 0, kind: 'lamp', x: 2, y: -4, z: 12, r: 1.2, halo: 0.5, src: true, col: '#ffd9a0', on: true, pool: { x: 2, z: 12, r: 7, h: 4, col: '#ffd9a0' } };
  const g = rec();
  E.worldDrawLights(g.ctx, [lamp], cam, { stage: 'ground' });
  const fills = g.L.filter(f => f.kind === 'fill');
  assert.equal(fills.length, 1, 'one pool');
  assert.ok(fills.every(f => f.op === 'lighter' && typeof f.style === 'object'), 'additive, a gradient (no flat cream disc)');
  const h = rec();
  E.worldDrawLights(h.ctx, [lamp], cam, { stage: 'glow' });
  assert.equal(h.L.filter(f => f.kind === 'fill').length, 1, 'the halo alone');
  assert.deepEqual(E.worldLightDraws([lamp], cam, { stage: 'glow' }).map(d => d.kind), ['halo'], 'no pool with the halo');
  const day = rec();
  assert.equal(E.worldDrawLights(day.ctx, [Object.assign({}, lamp, { on: false })], cam, {}), 0, 'nothing when it is off (by day)');
});

test('bug 13: a light knows its point on the art, and the compositor lays its halo on the drawn sprite there', () => {
  const world = { entities: [{ id: 'm', obj: 'building.mill-red-brick', x: -20, z: 60, y: 0, facing: 90 }] };
  const L = E.worldLights(world, { night: true });
  assert.ok(L.length > 4, 'the mill has window lights');
  assert.ok(L.every(l => Number.isFinite(l.u) && Number.isFinite(l.v)), 'u, v on every light');
  const r = { X: 300, Y: 600, s: 0.5, flip: true };
  const l = E._wfrLightOnRec(Object.assign({}, L[0]), r);
  assert.deepEqual(l.scr, [300 - L[0].u * 0.5, 600 + L[0].v * 0.5]);
  // a near lamp: the halo is drawn on the plan record's own glow part, not at a projected world point beside it
  const spec = { v: 3, place: { lat: 51.28, lon: -0.84 }, camera: { eye: 1.65, fov: 62, horizon: 455, heading: 0 }, fill: false, seed: 1,
    surfaces: [{ id: 'g', kind: 'grass', poly: [[-60, 1], [60, 1], [60, 200], [-60, 200]] }], entities: [{ obj: 'street.lamppost', at: [3, 14], id: 'lp', facing: 90 }] };
  const w = E.worldBuild(spec, { season: 'summer' }), plan = E.worldFramePlan(w, { season: 'summer', backdrop: false }), rr = plan.recs.find(q => q.ent && q.ent.id === 'lp');
  const lamps = E.worldLights({ entities: [Object.assign({}, rr.ent, { id: rr.id, mirror: !!rr.flip })] }, { night: true }).filter(q => q.kind === 'lamp' && q.on);
  assert.ok(lamps.length > 0, 'the lamp is lit');
  for (const q of lamps) {
    const G = E.worldGlowParts(rr.o, rr.v, rr.season || 'summer').parts[q.part], d = E.worldLightDraws([E._wfrLightOnRec(q, rr)], w.cam, { stage: 'glow' })[0];
    assert.ok(Math.hypot(d.X - (rr.X + (rr.flip ? -1 : 1) * G.u * rr.s), d.Y - (rr.Y + G.v * rr.s)) < 0.01, 'the halo sits on the lamp head');
  }
});

/* ---------- 17: only what is drawn casts ---------- */
test('bug 17: a thing that draws no pixels now casts no shadow (no orphan footprint on the grass)', () => {
  const sun = { az: 180, alt: 30 };
  const world = { cam, surfaces: [], entities: [{ id: 'b', obj: 'plant.hedgerow-blackberry', x: 2, z: 10, y: 0 }, { id: 't', obj: 'tree.bank-oak', x: -4, z: 20, y: 0 }] };
  const all = E.worldShadowPlan(world, cam, sun);
  assert.ok(all.some(s => s.ref === 'b') && all.some(s => s.ref === 't'));
  const drawn = E.worldShadowPlan(world, cam, sun, { drawn: (e) => e.id !== 'b' });
  assert.ok(!drawn.some(s => s.ref === 'b'), 'the undrawn bramble casts nothing');
  assert.ok(drawn.some(s => s.ref === 't' && s.kind === 'cast'), 'the drawn tree still casts');
});

test('a thin thing\'s shadow is its silhouette in the shadow colour, never its own art laid on the ground', () => {
  const sun = { az: 250, alt: 8 };
  const world = { cam, surfaces: [], entities: [{ id: 'r', obj: 'plant.reed', x: 1, z: 8, y: 0 }] };
  const plan = E.worldShadowPlan(world, cam, sun).filter(s => s.kind === 'cast');
  assert.ok(plan.length && plan.every(s => s.sil), 'the reed casts its outline');
  const art = { width: 40, height: 80, getContext() { return null; } };   // the sprite canvas (its own colours)
  const seen = [];
  const ctx = { globalAlpha: 1, fillStyle: null, save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() { seen.push('fill:' + this.fillStyle); }, rect() {}, clip() {},
    setTransform() {}, drawImage(c) { seen.push(c === art ? 'ART' : 'silhouette'); } };
  E.worldDrawShadows(ctx, plan, { col: '#14202e', cam, sun: E.worldSunOf(sun, cam), spriteOf: () => ({ c: art, x0: -20, y0: -80, w: 40, h: 80, s: 1, X: 800, Y: 600, x: 1, d: 8, top: -80 }) });
  assert.ok(seen.length > 0);
  assert.ok(!seen.includes('ART'), 'the sprite itself is never drawn as a shadow: ' + seen.join(','));
});
