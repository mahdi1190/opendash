// World engine at night (the night-light audit, 18 Oct; docs/dev/SCENE_LESSONS.md section AC). One test per defect class found on real
// night renders, each written so it fails on the engine as it was:
//   N1  lantern glows were stacked hard-edged discs (rings round every lantern of York and Elm Hill)
//   N2  every pane of the generated buildings came on at once when the light band turned 'night', and kept the same lit set all
//       night (the chunk's relight key ignored buildings): Castlefield at 18:45 and at midnight showed the same windows
//   N3  lit panes on walls seen edge-on were bright bars; the sky's day streak lay across lit panes
//   N4  walkers under lamps and lanterns were as dark as everyone else; lanterns lit no ground
//   N5  gulls and pigeons flew over the night harbour
//   N6  a harbour quay had no lamp near the camera (a dark slab under a lit town)
//   N7  the night pixel check read a light layer the compositor never makes (0 lit pixels at every night: a false failure)
//   N8  library facades lit in whole storeys (one glow path per row of panes)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadScenes, repoRoot } from '../tools/lib/scene-page.mjs';
import { worldLitPixels } from '../tools/lib/world/check.mjs';

const NAMES = ['worldHostSpec', '_scPacks', 'worldBuild', 'worldFramePlan', 'worldBuildingGlassOn', 'worldBuildingGlassMask', 'worldBuildingLamps', 'worldLocalLight',
  'worldMaterialColour', 'worldMaterialKey', 'worldGlowParts', 'worldSkyOf', 'worldKbDensity', 'worldExtrudeDraw', '_wfrChunkLit', 'worldInvariants', 'sceneObjShapes'];
const x = 'globalThis.__wn = {' + NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + '};';
loadScenes(repoRoot(), { fixtures: false, browser: true, extra: x });
const E = globalThis.__wn;
delete globalThis.__wn;
globalThis.__wnG = E.worldGlowParts;

const specOf = (id) => E.worldHostSpec(Object.values(E._scPacks).flat().find(it => it && it.id === id));
const memo = new Map();
const planOf = (id, season = 'autumn') => {
  if (!memo.has(id)) { const w = E.worldBuild(specOf(id), { season }); memo.set(id, { w, plan: E.worldFramePlan(w, { season, backdrop: false }) }); }
  return memo.get(id);
};
const buildings = (id) => planOf(id).plan.recs.filter(r => r.prim && r.prim.kind === 'building' && r.prim.direct);

/* ---------- N1: one soft glow per lantern, never rings ---------- */
test('N1: a lantern glows as ONE soft radial falloff (no stacked discs), and its lamp is handed to the world', () => {
  for (const id of ['york-shambles-1-w3', 'norwich-elm-hill-1-w3']) {
    const B = buildings(id).filter(r => (r.prim.direct.lit || []).length);
    assert.ok(B.length, id + ': some house carries lit lanterns');
    let glows = 0, lamps = 0;
    for (const r of B) {
      const lit = r.prim.direct.lit;
      // concentric discs: two or more plain-colour lit shapes centred on one point with different radii are a stack of rings
      const plain = lit.filter(s => typeof s.f === 'string'), soft = lit.filter(s => s.f && typeof s.f === 'object' && s.f.rad);
      const centres = new Map();
      for (const s of plain) { const t = (s.d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number); if (t.length < 24 || s.d.split('M').length !== 2) continue; let cx = 0, cy = 0; for (let i = 0; i < t.length; i += 2) { cx += t[i]; cy += t[i + 1]; } const k = Math.round(cx / (t.length / 2)) + ',' + Math.round(cy / (t.length / 2)); centres.set(k, (centres.get(k) || 0) + 1); }
      for (const [k, n] of centres) assert.ok(n <= 1, `${id} ${r.id}: ${n} round lit discs share the centre ${k} (rings)`);
      for (const s of soft) {
        glows++;
        const a = s.f.rad.map(q => q[2]);
        assert.ok(a.length >= 8, 'a soft glow has at least 8 stops');
        for (let i = 1; i < a.length; i++) assert.ok(a[i] <= a[i - 1] && a[i - 1] - a[i] <= 0.2, `stops fall smoothly: ${a.join(',')}`);
        assert.equal(a[a.length - 1], 0, 'the glow ends at nothing');
      }
      lamps += (r.prim.direct.lamps || []).length;
    }
    assert.ok(glows > 0, id + ': lanterns have a soft glow');
    assert.ok(lamps > 0, id + ': the generator hands its lanterns to the world as lamps (direct.lamps)');
  }
});

/* ---------- N2: panes come on through dusk, building by building, and go out through the night ---------- */
test('N2: generated panes light pane-bucket by pane-bucket through dusk, never all at once, and the lit set changes through the night', () => {
  assert.equal(typeof E.worldBuildingGlassOn, 'function');
  const keys = Array.from({ length: 300 }, (_, i) => 'b' + i);
  const share = (alt, s) => { let on = 0, n = 0; for (const k of keys) for (let b = 0; b < 8; b++) { n++; if (E.worldBuildingGlassOn(k, (b + 0.5) / 8, alt, s, false)) on++; } return on / n; };
  assert.equal(share(8, 0.7), 0, 'none by day');
  const a = share(1, 0.7), b = share(-3, 0.7), c = share(-9, 0.7);
  assert.ok(a > 0 && a < 0.2, `just after sunset only a few are lit (${a})`);
  assert.ok(b > a + 0.15 && c > b + 0.15, `more come on as it darkens (${a} ${b} ${c})`);
  assert.ok(Math.abs(c - 0.75) < 0.08, `deep night: the hour's share (${c})`);
  assert.ok(share(-20, 0.25) < share(-20, 0.7) - 0.3, 'they go out through the night with the share');
  // the chunk's relight key follows the building's lit set (it ignored buildings: one lit set per light band)
  const B = buildings('manchester-castlefield-1-w3').filter(r => r.prim.direct.shapes.some(s => s.glow));
  assert.ok(B.length > 3);
  const S = { season: 'autumn' }, ch = { ents: B };
  const k1 = E._wfrChunkLit(S, ch, { alt: -10, share: 0.72, murky: false, sky: { localHour: 19 } }), k2 = E._wfrChunkLit(S, ch, { alt: -40, share: 0.4, murky: false, sky: { localHour: 0 } });
  const k0 = E._wfrChunkLit(S, ch, { alt: -1, share: 0.65, murky: false, sky: { localHour: 17.8 } });
  assert.notEqual(k1, '-'); assert.notEqual(k1, k2, 'the evening and midnight lit sets differ'); assert.notEqual(k0, k1, 'dusk and night differ');
});

/* ---------- N3: grazing walls and the day streak ---------- */
test('N3: a pane on a wall seen edge-on carries its reduced light (gk); the sky streak is drawn only on unlit panes', () => {
  let gk = 0, full = 0, dt = 0;
  for (const id of ['manchester-castlefield-1-w3', 'sheffield-kelham-1-w3', 'whitby-harbour-1-w3']) for (const r of buildings(id)) for (const s of r.prim.direct.shapes) {
    if (s.glow && s.gk != null) { gk++; assert.ok(s.gk >= 0 && s.gk < 1); }
    if (s.glow && s.gk == null) full++;
    if (s.dt != null) dt++;
  }
  assert.ok(gk > 0 && full > gk, `some panes are on grazing walls (${gk}), most are not (${full})`);
  assert.ok(dt > 0, 'the sky streaks are tied to their pane');
  // drawn lit: no streak over a lit pane; a grazing pane is dimmer than a face-on one
  const r = buildings('manchester-castlefield-1-w3').find(q => q.prim.direct.shapes.some(s => s.dt != null) && q.prim.direct.shapes.some(s => s.glow && s.gk != null && s.gk < 0.5));
  assert.ok(r, 'a building with streaks and grazing panes');
  const fills = [];
  const ctx = new Proxy({}, { get: (t, k) => k === 'fill' ? () => fills.push(t.fillStyle) : k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  E.worldExtrudeDraw(ctx, r.prim, { night: true, glassOn: () => true });
  assert.ok(!fills.includes('#c8d6e2'), 'no sky streak on a lit pane');
  fills.length = 0;
  E.worldExtrudeDraw(ctx, r.prim, { night: false });
  assert.ok(fills.includes('#c8d6e2'), 'the streak is drawn by day');
});

/* ---------- N4: lamp light on movers, pools under lanterns ---------- */
test('N4: a mover under a lamp takes its light (its colours return, warm); away from it, none', () => {
  const pools = [{ x: 0, z: 10, r: 6, h: 4.5 }];
  assert.ok(E.worldLocalLight(pools, 0, 10).k >= 0.5, 'under the lamp');
  assert.ok(E.worldLocalLight(pools, 2, 11).k > 0 && E.worldLocalLight(pools, 2, 11).k < E.worldLocalLight(pools, 0, 10).k, 'falls off');
  assert.equal(E.worldLocalLight(pools, 7, 10).k, 0, 'nothing past its reach');
  const sky = E.worldSkyOf({ ms: Date.parse('2026-10-17T23:00:00Z'), lat: 53.96, lon: -1.08, weather: 'clear' }, { live: false });
  const c0 = { month: 9, sky, band: sky.band }, c1 = Object.assign({}, c0, { lamp: { k: 0.5, col: '#ffd59a' } });
  assert.notEqual(E.worldMaterialKey(c0), E.worldMaterialKey(c1), 'the lamp is in the sprite key');
  const lum = (h) => { const n = parseInt(h.slice(1), 16); return (n >> 16 & 255) + (n >> 8 & 255) + (n & 255); };
  const red0 = E.worldMaterialColour('cloth', '#b02a2a', c0), red1 = E.worldMaterialColour('cloth', '#b02a2a', c1);
  assert.ok(lum(red1) > lum(red0) + 60, `a red coat under a lamp (${red0} -> ${red1})`);
  assert.ok(parseInt(red1.slice(1, 3), 16) > parseInt(red1.slice(5, 7), 16) + 40, 'and it is red again');
  // the lanterns of a lane light the ground under them when it is dark
  const B = buildings('york-shambles-1-w3').filter(r => r.prim.direct.lamps);
  const L = B.flatMap(r => E.worldBuildingLamps(r.id, r.prim.direct.lamps, { alt: -20 }));
  assert.ok(L.length > 3 && L.every(l => l.on && l.pool && l.pool.r > 2 && l.halo === 0), 'pools, no second halo');
  assert.ok(E.worldBuildingLamps('b', B[0].prim.direct.lamps, { alt: 20 }).every(l => !l.on), 'off by day');
});

/* ---------- N5: birds roost after dark ---------- */
test('N5: gulls and pigeons are not out after dark', () => {
  const night = { dark: true, hour: 23, season: 'autumn' }, day = { dark: false, hour: 12, season: 'autumn' };
  for (const who of ['gulls', 'pigeons']) {
    assert.equal(E.worldKbDensity(who, night, 'town'), 0, who + ' at night');
    assert.ok(E.worldKbDensity(who, day, 'town') > 0, who + ' by day');
  }
});

/* ---------- N6: a lit town's quay has a lamp ---------- */
test('N6: street lighting: a quayside view gets a lamp near the camera when none stands there', () => {
  const { w } = planOf('whitby-harbour-1-w3'), cam = w.cam;
  const near = w.entities.filter(e => /lamp/.test(e.obj || '') && e.z > 0 && e.z < 45 && Math.abs(cam.x0 + cam.f * e.x / e.z - 800) < 1200);
  assert.ok(near.length >= 1, 'a lamp within 45 m in the frame');
  assert.ok((w.log || []).some(l => l && l.rule === 'L4' && /street lighting/.test(l.reason || '')), 'logged');
});

/* ---------- N7: the night pixel check measures the picture ---------- */
test('N7: lit pixels are counted on the picture: lit glass and lamps count, the night sky and moonlit stone do not', () => {
  const W = 10, H = 10, img = new Uint8ClampedArray(W * H * 4);
  const put = (i, c) => { img[i * 4] = c[0]; img[i * 4 + 1] = c[1]; img[i * 4 + 2] = c[2]; img[i * 4 + 3] = 255; };
  for (let i = 0; i < 100; i++) put(i, [20, 26, 48]);              // night sky
  for (let i = 0; i < 10; i++) put(i, [180, 186, 205]);            // pale stone under the night key
  for (let i = 10; i < 30; i++) put(i, [255, 217, 138]);           // lit glass
  for (let i = 30; i < 35; i++) put(i, [255, 226, 160]);           // a lamp head
  assert.equal(worldLitPixels(img, W, H), 25);
  // the rule: a night frame with lit pixels passes; a day frame with lit panes of a generated building fails
  const frame = (o) => Object.assign({ t: 0, W: 1600, H: 900, cam: { f: 1000, x0: 800, horizon: 450, eye: 1.65 }, ents: [{ id: 'h', cls: 'building', obj: 'building.x', static: true, x: 0, z: 40, box: [600, 200, 900, 500] }], surfaces: [], lights: [] }, o);
  const run = (f) => E.worldInvariants(f, { rules: ['nightLight'] }).filter(v => v.rule === 'nightLight');
  assert.deepEqual(run(frame({ sun: { alt: -20 }, litPx: 900, glassLit: 5 })), []);
  assert.equal(run(frame({ sun: { alt: -20 }, litPx: 0 })).length, 1);
  assert.equal(run(frame({ sun: { alt: 30 }, litPx: 0, glassLit: 2 })).length, 1, 'panes lit by day');
  assert.deepEqual(run(frame({ sun: { alt: 30 }, litPx: 0, glassLit: 0 })), []);
});

/* ---------- N8: a library facade lights pane by pane, not in storeys ---------- */
test('N8: a library building whose drawing lays a storey of panes as one glow path lights each pane on its own', () => {
  const G = globalThis.__wnG;
  const parts = G('building.mill-red-brick', 1, 'autumn').parts;
  // variant 1: 4 floors of 10 bays (two random glow paths a floor) and no tower: one glow part per pane
  assert.ok(parts.length >= 40, `${parts.length} glow parts for 40 panes`);
  const w = parts.map(p => p.size);
  assert.ok(Math.max(...w) < 3 * Math.min(...w), 'every part is one pane (no storey-wide part)');
});
