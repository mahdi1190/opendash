// World engine, package look: WATER (docs/dev/WORLD_ENGINE.md 2.5, 11.2; requirements H1-H6, W4, Y3; SCENE_LESSONS section C).
// Reflections come FROM THE WATER SURFACE: the composite above a region is mirrored column by column about each pixel's owner's
// contact row. These tests build composites by hand (solid sprites at their projected rows) and read the mirror's z-buffer,
// which records which owner landed on each water pixel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { sceneSourceFiles } from '../tools/lib/scene-page.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOOK = ['79-world-4backdrop.js', '79-world-4light.js', '79-world-4material.js', '79-world-4water.js'];
const NAMES = ['WORLD_WATER_LOOK', 'WORLD_WATER_CAPS', 'worldWaterLook', 'worldWaterPlan', 'worldWaterSpansAt', 'worldWaterContact', 'worldWaterContactRow', 'worldWaterContactClip', 'worldWaterOwners',
  'worldWaterComposite', 'worldWaterMirror', 'worldWaterRipple', 'worldWaterCut', 'worldWaterReflectOf', 'worldWaterFalls', 'worldWaterInit', 'worldWaterTick',
  'worldWaterEvent', 'worldWaterBob', 'worldSkyOf', 'sceneCamera', 'sceneProject'];
// a stand-in for the systems package's worldSystem, so the registrations can be checked
const PRE = 'const __sys = []; function worldSystem(def) { __sys.push(def); return def; }\n';
const files = sceneSourceFiles(ROOT, { browser: true, fixtures: false }).filter(f => !/79-world-/.test(f.split(/[\\/]/).pop())).concat(LOOK.map(f => join(ROOT, 'src', 'app', f)));
const body = PRE + files.map(f => readFileSync(f, 'utf8')).join('\n;\n') + `\n;return { __sys, ${NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} };`;
const W = new vm.Script('(function () {\n' + body + '\n})', { filename: 'water-bundle.js' }).runInThisContext()();

const cam = W.sceneCamera({ camera: { eye: 1.65, fov: 62, horizon: 455, heading: 70 } });
const F = { W: 1600, H: 900 };
const Rl = (z, level = 0) => cam.horizon + cam.f * (cam.eye - level) / z;
const Xof = (x, z) => cam.x0 + cam.f * x / z;
/** A solid sprite of w x h device px. */
const rect = (w, h, c = [200, 40, 40]) => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; } return { data: d, width: w, height: h }; };
/** A sprite standing on a per-column line: columns xa..xb, each filled from line(X) - h(X) up to (not including) the line. */
function onLine(xa, xb, line, hOf, c = [60, 60, 200]) {
  const top = Math.floor(Math.min(...Array.from({ length: xb - xa }, (_, i) => line(xa + i + 0.5) - hOf(xa + i + 0.5)))) - 1, bot = Math.ceil(Math.max(...Array.from({ length: xb - xa }, (_, i) => line(xa + i + 0.5))));
  const w = xb - xa, h = bot - top, img = { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }, count = new Map();
  for (let x = 0; x < w; x++) {
    const X = xa + x + 0.5, L = line(X), T = L - hOf(X);
    let n = 0;
    for (let y = 0; y < h; y++) { const yc = top + y + 0.5; if (yc >= T && yc < L) { const q = (y * w + x) * 4; img.data[q] = c[0]; img.data[q + 1] = c[1]; img.data[q + 2] = c[2]; img.data[q + 3] = 255; n++; } }
    count.set(xa + x, n);
  }
  return { img, x: xa, y: top, count };
}
/** The rows of device column x where the owner of depth z landed (from the mirror's z-buffer). */
// Since fef2fea the mirror is RESAMPLED (a linear blend of the two source rows a destination row falls between), so a reflected edge is
// anti-aliased at its true row: an owner can land on ONE extra (partly covered) row at its far edge. A thing therefore reflects in its
// height h or h + 1 rows, once; a doubled image would be about 2h.
const onceRows = (n, h) => n >= h && n <= h + 1;
function rowsOf(res, x, z) { const out = []; for (let r = 0; r < res.h; r++) if (res.zb.data[r * res.w + (x - res.x0)] === z) out.push(r + res.y0); return out; }
const contiguous = (rows) => rows.every((r, i) => i === 0 || r === rows[i - 1] + 1);
const pond = (poly, o = {}) => Object.assign({ id: 'pond', kind: 'water', water: 'pond', level: 0, poly }, o);

/* ---------- kinds, hints, the plan (H5, H6) ---------- */
test('kinds set colour, clarity, mirror and ripple; a scene gives only hint calm | breezy; the plan clips at the near plane', () => {
  const c = W.worldWaterLook('canal'), r = W.worldWaterLook('river'), s = W.worldWaterLook('sea');
  assert.ok(c.ripple < r.ripple && r.ripple < s.ripple && c.mirror > s.mirror && c.base[0] !== s.base[0]);
  assert.equal(c.drift, 'still'); assert.equal(r.drift, 'flow');
  assert.ok(Math.abs(W.worldWaterLook('pond', 'calm').ripple - W.worldWaterLook('pond').ripple / 2) < 1e-9);
  assert.ok(Math.abs(W.worldWaterLook('pond', 'breezy').ripple - W.worldWaterLook('pond').ripple * 1.6) < 1e-9);
  assert.equal(W.worldWaterLook('pond', 'stormy').hint, null, 'only calm or breezy');
  // a scene's own look keys are ignored: the kind decides
  const [R] = W.worldWaterPlan({ cam, surfaces: [pond([[-20, -5], [20, -5], [20, 50], [-20, 50]], { mirror: 0.1, ripple: 3, base: ['#ff0000'] })] }, cam);
  assert.equal(R.look.mirror, W.worldWaterLook('pond').mirror); assert.equal(R.look.ripple, W.worldWaterLook('pond').ripple); assert.notEqual(R.look.base[0], '#ff0000');
  // water running under the camera is clipped at the near plane, so it reaches past the frame's bottom edge
  assert.ok(R.dNear > 0 && R.box[3] > 900, 'reaches the bottom: ' + R.box[3]);
  assert.ok(Math.abs(W.worldWaterSpansAt(R, 800)[0][0] - Rl(50)) < 1e-6, 'its top row is the far edge');
  assert.ok(R.topRow.length > 1600 && Math.abs(R.topRow[Math.round(800 - R.col0)] - Rl(50)) < 0.5);
  // rivers flow along their centre line; canals are still
  const [rv] = W.worldWaterPlan({ cam, surfaces: [{ id: 'rv', kind: 'water', water: 'river', path: [[-40, 30], [40, 30]], width: 12 }] }, cam);
  assert.ok(rv.flow[0] > 0.2 && Math.abs(rv.flow[1]) < 1e-9, 'flows along its path');
  const [cn] = W.worldWaterPlan({ cam, surfaces: [{ id: 'cn', kind: 'water', water: 'canal', path: [[0, 5], [0, 90]], width: 9 }] }, cam);
  assert.deepEqual(cn.flow, [0, 0]);
});

/* ---------- H1, H2: each owner about its own contact row, once ---------- */
test('a heron, a post and a boat on one region reflect once each, from their own contact rows; the nearer owner wins', () => {
  const world = { cam, surfaces: [pond([[-40, 6], [40, 6], [40, 60], [-40, 60]])] };
  const [R] = W.worldWaterPlan(world, cam);
  const heron = { id: 'heron', obj: 'bird.heron', x: -5, z: 20, y: 0, height: 0.9 };
  const post = { id: 'post', obj: 'street.bollard', x: 3, z: 15, y: 0, height: 1.0 };
  const boat = { id: 'boat', obj: 'boat.narrowboat', x: 8, z: 30, y: -0.3, attach: 'water', height: 2.1, foot: [[-1, 28.95], [17, 28.95], [17, 31.05], [-1, 31.05]] };
  const cH = W.worldWaterContact(R, heron, cam), cP = W.worldWaterContact(R, post, cam), cB = W.worldWaterContact(R, boat, cam);
  assert.equal(cH.kind, 'own'); assert.equal(cP.kind, 'own'); assert.equal(cB.kind, 'line');
  const hp = Math.round(cam.f * 0.9 / 20), pp = Math.round(cam.f * 1.0 / 15);
  // the boat in three overlapping slices (one entity, one owner): drawn down to its own near waterline (the cut)
  const bLine = (X) => W.worldWaterContactRow(R, cB, X), bxa = Math.floor(Xof(-1, 30)), bxb = Math.ceil(Xof(17, 30)), bh = (X) => cam.f * 2.1 / 30;
  const slices = [[bxa, bxa + 300], [bxa + 290, bxa + 560], [bxa + 550, bxb]].map(([a, b]) => onLine(a, b, bLine, bh));
  const draws = [...slices.map(s => ({ id: 'boat', z: 30, contact: cB, img: s.img, x: s.x, y: s.y })),
    { id: 'heron', z: 20, contact: cH, img: rect(6, hp), x: Math.round(Xof(-5, 20)) - 3, y: Math.round(Rl(20)) - hp },
    { id: 'post', z: 15, contact: cP, img: rect(8, pp), x: Math.round(Xof(3, 15)) - 4, y: Math.round(Rl(15)) - pp }];
  const { comp, owner } = W.worldWaterComposite(R, draws, F);
  assert.equal(owner.list.length, 3, 'one owner per thing, whatever its pieces');
  const res = W.worldWaterMirror(null, R, comp, owner, Object.assign({ t: 0, ripple: false }, F));
  // the heron and the post: their whole height, once, starting at their own waterline row
  for (const [x, z, h, row] of [[Math.round(Xof(-5, 20)), 20, hp, Rl(20)], [Math.round(Xof(3, 15)), 15, pp, Rl(15)]]) {
    const rows = rowsOf(res, x, z);
    assert.ok(contiguous(rows), 'one run');
    assert.ok(onceRows(rows.length, h), `${z}: ${rows.length} rows, its height ${h} (once, not doubled; one anti-aliased edge row allowed)`);
    assert.ok(Math.abs(rows[0] - row) <= 1, `${z}: starts at ${rows[0]}, its waterline ${row}`);
  }
  // the boat: in every column away from the post, one run from its sloped waterline, the height of its art there
  const postX = Math.round(Xof(3, 15));
  let cols = 0;
  for (const s of slices) for (const [x, n] of s.count) {
    if (Math.abs(x - postX) < 8 || !n) continue;
    const rows = rowsOf(res, x, 30), line = bLine(x + 0.5);
    assert.ok(contiguous(rows), 'boat column ' + x + ': one run');
    assert.ok(Math.abs(rows[0] - line) <= 1, `boat column ${x}: starts at ${rows[0]}, its waterline ${line.toFixed(2)}`);
    assert.ok(Math.abs(rows.length - n) <= 1, `boat column ${x}: ${rows.length} rows for ${n} pixels of art`);
    cols++;
  }
  assert.ok(cols > 500, 'checked ' + cols + ' boat columns');
  // where the post's image and the boat's land on the same water, the nearer (the post) wins
  const both = rowsOf(res, postX, 15);
  assert.ok(onceRows(both.length, pp) && rowsOf(res, postX, 30).every(r => r < both[0]), 'the post covers the boat behind it');
});

test('a far-bank tree mirrors from the bank edge, following a curving bank in perspective', () => {
  const far = [[-40, 50], [-20, 58], [0, 62], [20, 58], [40, 50]];
  const world = { cam, surfaces: [pond([[-40, 6], [40, 6], ...far.slice().reverse()])] };
  const [R] = W.worldWaterPlan(world, cam);
  const trees = [[-30, 57, 't1'], [-10, 63, 't2'], [0, 66, 't3'], [25, 60, 't4']].map(([x, z, id], i) => ({ id, obj: 'tree.bank-oak', x, z, y: 0, height: 12,
    foot: Array.from({ length: 8 }, (_, k) => [x + 0.3 * Math.cos(k * Math.PI / 4), z + 0.3 * Math.sin(k * Math.PI / 4)]), zk: 100 + i }));
  const draws = trees.map(t => { const h = Math.round(cam.f * 12 / t.z), X = Math.round(Xof(t.x, t.z)); return { id: t.id, z: t.zk, contact: W.worldWaterContact(R, t, cam), img: rect(30, h, [40, 120, 40]), x: X - 15, y: Math.round(Rl(t.z)) - h }; });
  draws.forEach(d => assert.equal(d.contact.kind, 'bank'));
  const { comp, owner } = W.worldWaterComposite(R, draws.slice().reverse(), F);
  const res = W.worldWaterMirror(null, R, comp, owner, Object.assign({ ripple: false }, F));
  for (const t of trees) {
    const X = Math.round(Xof(t.x, t.z));
    for (const x of [X - 12, X, X + 12]) {
      const rows = rowsOf(res, x, t.zk), edge = W.worldWaterSpansAt(R, x + 0.5)[0][0];
      assert.ok(rows.length > 20 && contiguous(rows), t.id + ' reflects');
      assert.ok(Math.abs(rows[0] - edge) <= 1, `${t.id} column ${x}: starts at ${rows[0]}, the bank edge ${edge.toFixed(2)}`);
    }
  }
});

test('what a nearer thing hides on the screen still reflects: no hole in a far reflection (each owner keeps its own layer)', () => {
  const world = { cam, surfaces: [pond([[-40, 6], [40, 6], [40, 58], [-40, 58]])] };
  const [R] = W.worldWaterPlan(world, cam);
  // a far warehouse on the far bank and a tall mooring post in the water whose top covers the warehouse's base on the screen
  const bld = { id: 'bld', x: 0, z: 60, y: 0, height: 10, foot: [[-8, 60], [8, 60], [8, 70], [-8, 70]] }, post = { id: 'post', x: 0, z: 12, y: 0, height: 1.5 };
  const bh = Math.round(cam.f * 10 / 60), bw = Math.round(cam.f * 16 / 60), BX = Math.round(Xof(0, 60)), ph = Math.round(cam.f * 1.5 / 12), PX = Math.round(Xof(0, 12));
  const draws = [{ id: 'bld', z: 60, contact: W.worldWaterContact(R, bld, cam), img: rect(bw, bh, [150, 70, 50]), x: BX - (bw >> 1), y: Math.round(Rl(60)) - bh },
    { id: 'post', z: 12, contact: W.worldWaterContact(R, post, cam), img: rect(10, ph, [60, 50, 40]), x: PX - 5, y: Math.round(Rl(12)) - ph }];
  assert.ok(Math.round(Rl(12)) - ph < Math.round(Rl(60)), 'on the screen the post covers the warehouse base');
  const { comp, owner } = W.worldWaterComposite(R, draws, F);
  const res = W.worldWaterMirror(null, R, comp, owner, Object.assign({ ripple: false }, F));
  const edge = W.worldWaterSpansAt(R, PX + 0.5)[0][0];
  const rows = rowsOf(res, PX, 60), postRows = rowsOf(res, PX, 12);
  assert.ok(onceRows(postRows.length, ph), 'the post reflects in full where it lands (the nearer wins there)');
  assert.ok(contiguous(rows) && Math.abs(rows[0] - edge) <= 1, 'the warehouse from the bank edge, one run');
  assert.ok(Math.abs(rows[rows.length - 1] + 1 - postRows[0]) <= 1, `no hole: the warehouse fills every water row down to the post's image (${rows[rows.length - 1]} / ${postRows[0]})`);
  const hidden = Math.round(Rl(60)) - (Math.round(Rl(12)) - ph);
  assert.ok(rows.length > hidden + 50, 'including its base, hidden behind the post on the screen');
});

test('a sloped multi-piece boat reflects once with no doubling', () => {
  const world = { cam, surfaces: [pond([[-40, 6], [40, 6], [40, 80], [-40, 80]])] };
  const [R] = W.worldWaterPlan(world, cam);
  // a narrowboat at 35 degrees to the view: its footprint in the water, its waterline a sloped line on the screen
  const a = 35 * Math.PI / 180, hl = 9, hw = 1.05, cx = 2, cz = 26, u = [Math.cos(a), Math.sin(a)], v = [-Math.sin(a), Math.cos(a)];
  const foot = [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].map(([p, q]) => [cx + u[0] * p + v[0] * q, cz + u[1] * p + v[1] * q]);
  const boat = { id: 'nb', obj: 'boat.narrowboat', x: cx, z: cz, y: -0.3, attach: 'water', height: 2.1, foot };
  const c = W.worldWaterContact(R, boat, cam);
  assert.equal(c.kind, 'line');
  const line = (X) => W.worldWaterContactRow(R, c, X), xs = c.pts.map(p => p[0]), xa = Math.floor(Math.min(...xs)), xb = Math.ceil(Math.max(...xs));
  assert.ok(Math.abs(line(xa + 5) - line(xb - 5)) > 10, 'the waterline slopes on the screen');
  // four pieces (hull slices and a cabin) that overlap each other, all of the one boat
  const H = (X) => 70 + 25 * Math.sin((X - xa) / 60);
  const pieces = [[xa, xa + 180], [xa + 150, xa + 330], [xa + 300, xb], [xa + 100, xa + 260]].map(([p, q], i) => onLine(p, Math.min(q, xb), line, i === 3 ? (X) => H(X) * 0.6 : H, [80 + i * 30, 50, 60]));
  const draws = pieces.map(s => ({ id: 'nb', z: 26, contact: c, img: s.img, x: s.x, y: s.y }));
  const { comp, owner } = W.worldWaterComposite(R, draws, F);
  const res = W.worldWaterMirror(null, R, comp, owner, Object.assign({ ripple: false }, F));
  // per column: the boat's pixels above its waterline (the union of its pieces) land exactly once
  let cols = 0;
  for (let x = xa + 1; x < xb - 1; x++) {
    let n = 0;
    for (let y = 0; y < comp.height; y++) if (owner.idx[y * comp.width + (x - comp.x0)] === 0 && comp.y0 + y + 0.5 < line(x + 0.5)) n++;
    if (!n) continue;
    const rows = rowsOf(res, x, 26);
    assert.ok(contiguous(rows), 'column ' + x + ': one run (no second copy)');
    assert.ok(rows.length <= n + 1 && rows.length >= n - 1, `column ${x}: ${rows.length} reflected rows for ${n} pixels`);
    assert.ok(Math.abs(rows[0] - line(x + 0.5)) <= 1, `column ${x}: from its own sloped waterline`);
    cols++;
  }
  assert.ok(cols > 300, 'columns checked: ' + cols);
});

test('the compositor form works too: a composite with draw records (boxes, world entities or rows) instead of an owner index', () => {
  const world = { cam, surfaces: [pond([[-40, 6], [40, 6], [40, 60], [-40, 60]])], entities: [{ id: 'heron', obj: 'bird.heron', x: -5, z: 20, y: 0, height: 0.9 }] };
  const [R] = W.worldWaterPlan(world, cam);
  const hp = Math.round(cam.f * 0.9 / 20), X = Math.round(Xof(-5, 20)), pp = Math.round(cam.f / 15), PX = Math.round(Xof(3, 15));
  // a composite as one pixel buffer (the region box), and the records: one with its world entity, one with only its device row
  const x0 = 0, y0 = 0, w = 1600, h = 900, data = new Uint8ClampedArray(w * h * 4);
  const paint = (bx, by, bw, bh) => { for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) { const q = (y * w + x) * 4; data[q] = 200; data[q + 3] = 255; } };
  paint(X - 3, Math.round(Rl(20)) - hp, 6, hp); paint(PX - 4, Math.round(Rl(15)) - pp, 8, pp);
  const owner = { list: [{ id: 'heron', z: 20, box: [X - 3, Math.round(Rl(20)) - hp, X + 3, Math.round(Rl(20))] }, { id: 'post', z: 15, box: [PX - 4, Math.round(Rl(15)) - pp, PX + 4, Math.round(Rl(15))], row: Rl(15) }] };
  const res = W.worldWaterMirror(null, R, { data, width: w, height: h, x: x0, y: y0 }, owner, Object.assign({ ripple: false, world }, F));
  const hr = rowsOf(res, X, 20), pr = rowsOf(res, PX, 15);
  assert.equal(hr.length, hp); assert.ok(Math.abs(hr[0] - Rl(20)) <= 1, 'the heron from its waterline (its world entity)');
  assert.equal(pr.length, pp); assert.ok(Math.abs(pr[0] - Rl(15)) <= 1, 'the post from its given row');
});

/* ---------- nothing outside the water; no gaps (H2, H6) ---------- */
test('nothing reflects outside water; the frame outside the water is untouched', () => {
  const world = { cam, surfaces: [pond([[-6, 8], [6, 8], [10, 70], [-10, 70]])] };
  const [R] = W.worldWaterPlan(world, cam);
  // a tall building beside the pond, a tree beyond it, a heron in it
  const bld = { id: 'bld', obj: 'building.terrace-victorian', x: 14, z: 30, y: 0, height: 12 }, tree = { id: 'tr', obj: 'tree.oak', x: 0, z: 80, y: 0, height: 15 }, her = { id: 'he', obj: 'bird.heron', x: 1, z: 20, y: 0, height: 0.9 };
  const draws = [tree, bld, her].map((e, i) => { const h = Math.round(cam.f * e.height / e.z), w = Math.round(cam.f * (e.id === 'bld' ? 10 : e.id === 'tr' ? 8 : 0.4) / e.z); return { id: e.id, z: e.z, contact: W.worldWaterContact(R, e, cam), img: rect(w, h, [90 + i * 50, 90, 90]), x: Math.round(Xof(e.x, e.z) - w / 2), y: Math.round(Rl(e.z)) - h }; });
  const { comp, owner } = W.worldWaterComposite(R, draws, F);
  const dst = { data: new Uint8ClampedArray(F.W * F.H * 4), width: F.W, height: F.H };
  const res = W.worldWaterMirror(null, R, comp, owner, Object.assign({ t: 1.3, dst }, F));
  let refl = 0;
  for (let y = 0; y < F.H; y++) for (let x = 0; x < F.W; x++) {
    if (!dst.data[(y * F.W + x) * 4 + 3]) continue;
    const inWater = W.worldWaterSpansAt(R, x + 0.5).some(([a, b]) => y + 0.5 >= a && y + 0.5 <= b);
    assert.ok(inWater, `a water pixel outside the water at ${x}, ${y}`);
  }
  for (let p = 0; p < res.w * res.h; p++) if (Number.isFinite(res.zb.data[p])) refl++;
  assert.ok(refl > 1000, 'the pond does mirror: ' + refl);
  assert.ok(rowsOf(res, Math.round(Xof(1, 20)), 20).length > 0, 'the heron in it reflects');
});

test('no transparent water pixel at the frame edge, near the camera or where water meets an occluder', () => {
  // water wider than the frame and running under the camera
  const world = { cam, surfaces: [pond([[-300, -10], [300, -10], [300, 120], [-300, 120]])] };
  const [R] = W.worldWaterPlan(world, cam);
  const occ = { id: 'occ', obj: 'street.bollard', x: 0.5, z: 4, y: 0, height: 1.2 };       // a near occluder standing in the water
  const h = Math.round(cam.f * 1.2 / 4);
  const { comp, owner } = W.worldWaterComposite(R, [{ id: 'occ', z: 4, contact: W.worldWaterContact(R, occ, cam), img: rect(60, h), x: Math.round(Xof(0.5, 4)) - 30, y: Math.round(Rl(4)) - h }], F);
  for (const t of [0, 0.7, 3.1]) {
    const dst = { data: new Uint8ClampedArray(F.W * F.H * 4), width: F.W, height: F.H };
    const res = W.worldWaterMirror(null, R, comp, owner, Object.assign({ t, dst, wind: 1.8 }, F));
    assert.equal(res.gaps, 0, 'no wet pixel left transparent');
    const top = Math.ceil(Rl(120));
    for (let y = top + 1; y < F.H; y++) for (const x of [0, 1, F.W - 2, F.W - 1]) assert.equal(dst.data[(y * F.W + x) * 4 + 3], 255, `edge pixel ${x}, ${y} at t ${t}`);
    for (let x = 0; x < F.W; x++) for (const y of [F.H - 1, F.H - 2]) assert.equal(dst.data[(y * F.W + x) * 4 + 3], 255, `bottom pixel ${x}, ${y} (near the camera)`);
    // under and round the occluder: water all the same (the occluder is drawn over it by the compositor)
    const ox = Math.round(Xof(0.5, 4));
    for (let y = Math.round(Rl(4)) - 10; y < F.H; y++) for (let x = ox - 40; x < ox + 40; x++) assert.equal(dst.data[(y * F.W + x) * 4 + 3], 255);
  }
});

/* ---------- movers per frame ---------- */
test('movers are mirrored per frame on their columns only, and a nearer static still covers a farther mover', () => {
  const world = { cam, surfaces: [pond([[-40, 6], [40, 6], [40, 60], [-40, 60]])] };
  const [R] = W.worldWaterPlan(world, cam);
  const post = { id: 'post', x: 3, z: 15, y: 0, height: 1.0 }, pp = Math.round(cam.f * 1 / 15), PX = Math.round(Xof(3, 15));
  const st = W.worldWaterComposite(R, [{ id: 'post', z: 15, contact: W.worldWaterContact(R, post, cam), img: rect(8, pp), x: PX - 4, y: Math.round(Rl(15)) - pp }], F);
  const bake = W.worldWaterMirror(null, R, st.comp, st.owner, Object.assign({ ripple: false }, F));
  // a tall mover (a sail) behind the post, its image overlapping the post's in the water
  const sail = { id: 'sail', x: 3 * 22 / 15, z: 22, y: 0, height: 4 }, sh = Math.round(cam.f * 4 / 22), SX = Math.round(Xof(sail.x, 22));
  const mv = W.worldWaterComposite(R, [{ id: 'sail', z: 22, contact: W.worldWaterContact(R, sail, cam), img: rect(40, sh, [250, 250, 250]), x: SX - 20, y: Math.round(Rl(22)) - sh }], F);
  const cols = [SX - 22, SX + 22];
  const res = W.worldWaterMirror(null, R, mv.comp, mv.owner, Object.assign({ base: false, ripple: false, cols, zb: bake.zb }, F));
  assert.ok(res.x0 >= cols[0] && res.x0 + res.w <= cols[1], 'only its columns');
  const sailRows = rowsOf(res, PX, 22), postRows = rowsOf(bake, PX, 15);
  assert.ok(onceRows(postRows.length, pp) && !sailRows.some(r => postRows.includes(r)), 'the post wins where both land');
  assert.ok(rowsOf(res, SX + 15, 22).length > sh * 0.9, 'beside the post the sail reflects in full');
  assert.equal(res.gaps, 0);
});

/* ---------- ripple (H4) ---------- */
test('ripple drifts with the flow on rivers and stays in place on canals; calm is smaller than breezy', () => {
  const mk = (water, hint, flow) => W.worldWaterPlan({ cam, surfaces: [Object.assign({ id: water, kind: 'water', water, poly: [[-40, 6], [40, 6], [40, 90], [-40, 90]] }, hint ? { hint } : {}, flow ? { flow } : {})] }, cam)[0];
  const zeros = (R, t) => { const z = []; let last = null; for (let y = 520; y < 880; y += 0.25) { const v = W.worldWaterRipple(R, y, t); if (last != null && Math.sign(v) !== Math.sign(last) && v !== 0) z.push(y); last = v; } return z; };
  const shift = (a, b) => Math.min(...a.map(y => Math.min(...b.map(q => Math.abs(q - y)))));
  const canal = mk('canal'), river = mk('river', null, [0, 0.6]);
  const c0 = zeros(canal, 0.2), c1 = zeros(canal, 1.1), r0 = zeros(river, 0.2), r1 = zeros(river, 0.5);
  assert.ok(c0.length > 3 && c0.length === c1.length && c0.every((y, i) => Math.abs(y - c1[i]) < 0.5), 'canal: the pattern stays in place');
  const near = (y, L) => L.reduce((best, q) => (Math.abs(q - y) < Math.abs(best - y) ? q : best), Infinity);
  const moved = r0.slice(1, -1).map(y => near(y, r1) - y), mean = moved.reduce((a, b) => a + b, 0) / moved.length;
  assert.ok(Math.abs(mean) > 1 && r0.length > 3, 'river: the pattern travels (' + mean.toFixed(2) + ' px)');
  assert.ok(mean < 0, 'flowing away: up the screen');
  const amp = (R) => Math.max(...Array.from({ length: 200 }, (_, i) => Math.abs(W.worldWaterRipple(R, 600 + i, 0.37))));
  assert.ok(amp(mk('pond', 'calm')) < amp(mk('pond')) && amp(mk('pond')) < amp(mk('pond', 'breezy')));
  assert.ok(shift(c0, c1) < 0.5);
});

/* ---------- floaters (H3) ---------- */
test('floaters sit in the water: the art is cut at the waterline, the foot sinks by class', () => {
  const [R] = W.worldWaterPlan({ cam, surfaces: [pond([[-40, 6], [40, 6], [40, 60], [-40, 60]])] }, cam);
  const duck = { id: 'd', obj: 'bird.mallard', cls: 'duck', x: 1, z: 12, y: -0.08, attach: 'water' };
  const c = W.worldWaterCut(duck, cam, R);
  assert.equal(c.kind, 'row'); assert.ok(Math.abs(c.row - Rl(12)) < 1e-9 && Math.abs(c.sink - 0.08) < 1e-9);
  assert.ok(c.footRow > c.row + 5, 'the foot is drawn below the waterline: ' + (c.footRow - c.row).toFixed(1));
  const boat = { id: 'b', obj: 'boat.narrowboat', x: 8, z: 30, y: -0.3, foot: [[-1, 28.95], [17, 28.95], [17, 31.05], [-1, 31.05]] };
  const cb = W.worldWaterCut(boat, cam, R);
  assert.equal(cb.kind, 'line'); assert.ok(Math.abs(cb.sink - 0.3) < 1e-9);
  assert.equal(W.worldWaterCut({ id: 'x', x: 100, z: 12, y: 0 }, cam, R), null, 'not in this water');
  const ref = W.worldWaterReflectOf({ cam, surfaces: [pond([[-40, 6], [40, 6], [40, 60], [-40, 60]])] }, cam, Object.assign({ height: 0.35 }, duck));
  assert.ok(ref && ref.surface === 'pond' && Math.abs(ref.rowY - Rl(12)) < 0.01, 'a duck reflects about its own waterline');
});

/* ---------- weirs and falls (H4, W4) ---------- */
test('weirs and falls draw as falling water from the upper level to the lower, with spray', () => {
  const world = { cam, surfaces: [
    { id: 'upper', kind: 'water', water: 'river', level: 1.0, poly: [[-30, 40], [30, 40], [30, 120], [-30, 120]] },
    { id: 'lower', kind: 'water', water: 'river', level: 0, poly: [[-30, 8], [30, 8], [30, 38], [-30, 38]] },
    { id: 'weir', kind: 'weir', path: [[-30, 39], [30, 39]], width: 2 },
    { id: 'pool', kind: 'water', water: 'pond', level: 0.2, poly: [[40, 20], [70, 20], [70, 60], [40, 60]], step: { path: [[45, 25], [65, 25]], drop: 0.8, kind: 'fall' } }] };
  const falls = W.worldWaterFalls(world, cam);
  const weir = falls.find(f => f.id === 'weir'), fall = falls.find(f => f.kind === 'fall');
  assert.ok(weir && Math.abs(weir.drop - 1) < 1e-9 && weir.upper === 1 && weir.lower === 0, 'the weir drops from 1 m to 0');
  assert.ok(weir.top.every((p, i) => p[1] < weir.foot[i][1] - 3), 'the curtain runs down the screen from the crest to the foot');
  assert.ok(fall && Math.abs(fall.drop - 0.8) < 1e-9);
  // the water system throws spray at the falls through the particles package (here a stand-in)
  const emitted = [];
  globalThis.worldEmit = (w, kind, o) => emitted.push([kind, o]);
  try {
    const w = Object.assign({ seed: 3, entities: [], falls }, world);
    W.worldWaterInit(w);
    for (let i = 0; i < 30; i++) W.worldWaterTick(w, 1 / 30, { weather: 'clear', month: 6 });
    assert.ok(emitted.length >= 2 && emitted.every(([k]) => k === 'spray'), 'spray: ' + emitted.length);
  } finally { delete globalThis.worldEmit; }
});

/* ---------- the water system (Y3) ---------- */
test('the water system: wakes spread and fade, birds and rain ring the water, floaters bob out of step and rock in wakes, the current carries leaves', () => {
  const surfaces = [{ id: 'cut', kind: 'water', water: 'canal', poly: [[-6, 4], [6, 4], [6, 200], [-6, 200]] },
    { id: 'rv', kind: 'water', water: 'river', path: [[-100, 300], [100, 300]], width: 20 }];
  const nb1 = { id: 'nb1', obj: 'boat.narrowboat', cls: 'boat', x: -4, z: 30, attach: 'water' }, nb2 = { id: 'nb2', obj: 'boat.narrowboat', cls: 'boat', x: -4, z: 150, attach: 'water' };
  const ducks = [{ id: 'dk1', obj: 'bird.mallard', cls: 'duck', x: 2, z: 60, layer: 'swim', vx: 0.2, vz: 0 }, { id: 'dk2', obj: 'bird.mallard', cls: 'duck', x: -2, z: 70, layer: 'swim' },
    { id: 'dk3', obj: 'bird.mallard', cls: 'duck', x: 20, z: 60, layer: 'walk' }];
  const cruiser = { id: 'cr', obj: 'boat.narrowboat', cls: 'boat', x: 2, z: 20, vx: 0, vz: 1.2, layer: 'swim' };
  const world = { seed: 5, surfaces, entities: [nb1, nb2], agents: [...ducks, cruiser] };
  W.worldWaterInit(world);
  const ctx = { weather: 'clear', month: 6 }, dt = 1 / 30;
  const dy = { nb1: [], nb2: [], dk1: [], dk2: [] }, roll = { nb1: [], nb2: [] };
  for (let i = 0; i < 30 * 14; i++) {
    cruiser.z += cruiser.vz * dt;
    W.worldWaterTick(world, dt, ctx);
    for (const k of Object.keys(dy)) dy[k].push(W.worldWaterBob(world, { id: k }).dy);
    for (const k of Object.keys(roll)) roll[k].push(Math.abs(W.worldWaterBob(world, { id: k }).roll));
  }
  const S = world.water;
  // a boat under way leaves wakes (no event needed); they spread and fade within their life
  const wakes = S.wakes.filter(q => q.src === 'cr');
  assert.ok(wakes.length >= 5 && wakes.every(q => q.age < q.life), 'wakes behind the moving boat: ' + wakes.length);
  // rings from the paddling birds on the water, never from the duck on the bank
  assert.ok(S.rings.some(r => r.src === 'dk1') && S.rings.some(r => r.src === 'dk2'), 'rings from swimming ducks');
  assert.ok(!S.rings.some(r => r.src === 'dk3'), 'no rings from a duck on land');
  assert.ok(!S.rings.some(r => r.src === 'rain'), 'no rain rings in fine weather');
  // bobbing out of step; the moored boat beside the cruiser's wake rocks more than the far one
  assert.notDeepEqual(dy.dk1, dy.dk2, 'no two floaters bob in step');
  const max = (a) => Math.max(...a);
  assert.ok(max(roll.nb1) > max(roll.nb2) + 1, `rocking in the wake: ${max(roll.nb1).toFixed(2)} vs ${max(roll.nb2).toFixed(2)}`);
  assert.ok(nb1.x === -4 && nb1.z === 30, 'a moored boat never moves');
  // a wake event spreads and fades
  W.worldWaterEvent(world, 'wake', { id: 'ev', x: 0, z: 100, vx: 0, vz: 1, speed: 1 });
  for (let i = 0; i < 30 * 5; i++) W.worldWaterTick(world, dt, ctx);
  const ev = S.wakes.find(q => q.src === 'ev');
  assert.ok(ev && ev.age > 4.9, 'the wake is still spreading after 5 s');
  for (let i = 0; i < 30 * 5; i++) W.worldWaterTick(world, dt, ctx);
  assert.ok(!S.wakes.some(q => q.src === 'ev'), 'and faded after its life');
  // rain rings in rain
  for (let i = 0; i < 30 * 2; i++) W.worldWaterTick(world, dt, { weather: 'rain', month: 6 });
  assert.ok(S.rings.filter(r => r.src === 'rain').length >= 10, 'rain rings');
  assert.ok(S.rings.length <= W.WORLD_WATER_CAPS.rings && S.wakes.length <= W.WORLD_WATER_CAPS.wakes, 'pooled and capped');
  // leaves: none in July; in October the river carries them downstream (+x), the still canal leaves them where they fall
  assert.equal(S.leaves.length, 0, 'no leaves in July');
  for (let i = 0; i < 30 * 60; i++) W.worldWaterTick(world, dt, { weather: 'clear', month: 9 });
  const onRiver = S.leaves.filter(q => q.region === 'rv');
  assert.ok(S.leaves.length > 3 && onRiver.length > 0, 'leaves on the water in October: ' + S.leaves.length);
  const before = onRiver.map(q => [q, q.x]);
  for (let i = 0; i < 30 * 5; i++) W.worldWaterTick(world, dt, { weather: 'clear', month: 9 });
  const moved = before.filter(([q]) => S.leaves.includes(q)).map(([q, x]) => q.x - x);
  assert.ok(moved.length && moved.every(d => d > 1), 'carried downstream: ' + moved.map(d => d.toFixed(1)));
  assert.ok(S.leaves.filter(q => q.region === 'cut').every(q => Math.abs(q.x) <= 6), 'the canal keeps its leaves');
});

test('the water and light systems register through worldSystem (phases fx and light)', () => {
  const water = W.__sys.find(d => d.id === 'water'), light = W.__sys.find(d => d.id === 'light');
  assert.ok(water && water.phase === 'fx' && water.onEvent && typeof water.onEvent.wake === 'function' && water.rate > 0 && 30 % water.rate === 0);
  assert.ok(light && light.phase === 'light' && 30 % light.rate === 0);
  const world = { cam, seed: 1, surfaces: [pond([[-10, 5], [10, 5], [10, 40], [-10, 40]])], entities: [], ctx: { weather: 'rain', month: 6 } };
  water.init(world);
  water.onEvent.wake(world, { id: 'b', x: 0, z: 20, vz: 1, speed: 1 });
  for (let i = 0; i < 30; i++) water.update(world, 1 / 30);
  assert.ok(world.water.wakes.length === 1 && world.water.rings.length > 0 && Array.isArray(world.falls));
  world.ctx = { ms: Date.UTC(2026, 5, 21, 12), lat: 51.28, lon: -0.84, weather: 'clear' };
  light.update(world, 0.5);
  assert.ok(world.sky && world.sky.phase === 'noon');
});

test('a mill set back on a high quay mirrors where the water plane puts it, not from the channel edge (verify round 1, Kelham)', () => {
  // a 6 m channel 2.6 m below its quays, running away from the eye; a mill 20 m to the side of it
  const level = -2.6, world = { cam, surfaces: [{ id: 'ch', kind: 'water', water: 'canal', level, poly: [[-3, 4], [3, 4], [3, 200], [-3, 200]] }] };
  const [R] = W.worldWaterPlan(world, cam);
  const mill = { id: 'mill', obj: 'building.terrace', x: -23, z: 40, y: 0, height: 18, foot: [[-30, 30], [-23, 30], [-23, 50], [-30, 50]] };
  const c = W.worldWaterContact(R, mill, cam);
  assert.equal(c.kind, 'bank');
  const X = Xof(-23, 30), row = W.worldWaterContactRow(R, c, X);
  const truth = 2 * Rl(30, level) - Rl(30, 0);   // the mirrored base: 2 x the water-level row - the ground row at its front
  assert.ok(Math.abs(row - truth) < 1, `the mill's base mirrors to ${row.toFixed(1)}, the water plane puts it at ${truth.toFixed(1)}`);
  // ... and the image of the quay's own wall hides the mill down to the wall's mirrored top in that column
  const Xw = Xof(-2.9, 40), top = W.worldWaterSpansAt(R, Xw)[0][0], clip = W.worldWaterContactClip(R, c, Xw);
  assert.ok(Math.abs(clip - (top + (top - cam.horizon) * 2.6 / (cam.eye + 2.6))) < 0.5, `clip ${clip} under the edge ${top}`);
  // ... while a tree on a low bank still lays its base on the edge (no gap)
  const low = [{ id: 'p', kind: 'water', water: 'pond', level: -0.1, poly: [[-40, 6], [40, 6], [40, 50], [-40, 50]] }];
  const [R2] = W.worldWaterPlan({ cam, surfaces: low }, cam);
  const tree = { id: 't', obj: 'tree.bank-oak', x: 0, z: 52, y: 0, height: 12, foot: [[-0.3, 51.7], [0.3, 51.7], [0.3, 52.3], [-0.3, 52.3]] };
  const c2 = W.worldWaterContact(R2, tree, cam), edge = W.worldWaterSpansAt(R2, Xof(0, 52))[0][0];
  const r2 = W.worldWaterContactRow(R2, c2, Xof(0, 52));
  assert.equal(W.worldWaterContactClip(R2, c2, Xof(0, 52)), -Infinity, 'a low bank hides nothing');
  assert.ok(Math.abs(r2 - edge) < 0.6, `a low bank: from the edge (${r2.toFixed(2)} vs ${edge.toFixed(2)}, f ${cam.f})`);
});
