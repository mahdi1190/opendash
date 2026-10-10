// Scene engine v2, builder C: atmosphere and light (docs/dev/SCENE_ENGINE_V2.md 7 and 27.3). Pure parts in Node; the browser
// passes (78-scene-atmos.js, 78-scene-weather.js) are loaded too for their pure helpers (keys, plans); their drawing is tested
// in headless Chrome by tests/scene-atmos-chrome.test.mjs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenes, sceneSourceFiles, scenePageHtml } from '../tools/lib/scene-page.mjs';
import { findBrowser } from '../tools/lib/anim-render.mjs';
import { launchChrome } from '../tools/release-chrome.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = (f) => readFileSync(join(ROOT, 'src', 'app', f), 'utf8');
const NAMES = ['sceneLightV2', 'sceneLight', 'sceneHazeAt', 'sceneAtmosCompile', 'sceneAtmosResolve', 'sceneAtmosIsV2', 'sceneLightsOf', 'sceneLiftAt', 'sceneWindowShare',
  'SCENE_ATMOS', 'SCENE_WINDOW_SHARE', 'SCENE_LIGHT_SOURCES', 'sceneWeather', 'sceneObj', 'sceneObjShapes', 'almSceneLight', 'almSunPosition',
  'sceneAtmosPass', 'sceneWeatherPass', 'sceneRimAt', 'sceneFogBanks', 'sceneLightKey'];
const extra = app('78-scene-atmos.js') + '\n;\n' + app('78-scene-weather.js') + `\n;globalThis.__scAtmos = { ${NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} };`;
loadScenes(ROOT, { fixtures: true, extra });
const S = globalThis.__scAtmos;
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);
const wrap = (a) => ((a % 360) + 540) % 360 - 180;
const CAM = { eye: 1.65, fov: 66, horizon: 470, heading: 200 };
const DATA = { id: 'atmos-test', camera: CAM, view: { lat: 53.48, lon: -2.25 }, setting: 'urban' };
const VIEW = (o = {}) => Object.assign({ lat: 53.48, lon: -2.25, season: 'autumn' }, o);

test('sceneHazeAt: the values of 7.1, monotone in depth, nothing near the camera', () => {
  near(S.sceneHazeAt(100, 'clear'), 0.008, 0.001, '100 m');
  near(S.sceneHazeAt(2000, 'clear'), 0.14, 0.005, '2 km');
  near(S.sceneHazeAt(10000, 'clear'), 0.47, 0.005, '10 km');
  let prev = -1;
  for (const d of [1, 5, 20, 50, 100, 300, 1000, 3000, 9000, 30000]) { const h = S.sceneHazeAt(d, 'city'); assert.ok(h > prev, 'monotone at ' + d); prev = h; }
  assert.ok(S.sceneHazeAt(30, 'city') < 0.01, 'a near object is never a ghost (city)');
  assert.ok(S.sceneHazeAt(30, 'mist') < 0.03, 'nor in a dawn mist at 30 m');
  assert.equal(S.sceneHazeAt(0, 'clear'), 0);
  assert.ok(S.sceneHazeAt(1e6, 'clear') <= 0.7 + 1e-9, 'never over max');
  for (const [p, V] of Object.entries({ clear: 9000, haze: 4000, city: 3000, mist: 900, coast: 5000, mountain: 15000 })) assert.equal(S.SCENE_ATMOS[p].V, V, p);
});

test('sceneAtmosCompile: auto by the setting and the water; presets; a custom object', () => {
  assert.equal(S.sceneAtmosCompile({ setting: 'urban' }).auto, 'city');
  assert.equal(S.sceneAtmosCompile({ water: [{ id: 'sea', kind: 'sea', band: [200, 1e9] }] }).auto, 'coast');
  assert.equal(S.sceneAtmosCompile({}).auto, 'clear');
  assert.equal(S.sceneAtmosCompile({ atmos: 'mist' }).V, 900);
  const c = S.sceneAtmosCompile({ atmos: { V: 2500, max: 0.5, tint: '#c8d0d8' } });
  assert.deepEqual([c.preset, c.V, c.max, c.tint], ['custom', 2500, 0.5, '#c8d0d8']);
  const C = {}; S.sceneAtmosCompile({ atmos: 'coast' }, C); assert.equal(C.atmos.V, 5000, 'sets C.atmos');
});

test('weather overrides the visibility: fog, mist, rain, falling snow', () => {
  const A = S.sceneAtmosCompile({ atmos: 'clear' }), L = { haze: '#d6e2e6', dark: 0 };
  assert.ok(S.sceneAtmosResolve(A, L, { fog: 1 }).V <= 400 && S.sceneAtmosResolve(A, L, { fog: 1 }).V >= 150, 'fog 150..400');
  const m = S.sceneAtmosResolve(A, L, { fog: 0.5 }).V; assert.ok(m >= 600 && m <= 900, 'mist 600..900: ' + m);
  near(S.sceneAtmosResolve(A, L, { rain: 0.8 }).V, 4500, 1, 'rain halves V');
  near(S.sceneAtmosResolve(A, L, { snow: 0.8 }).V, 3600, 1, 'falling snow V x 0.4');
  const fogL = { atmos: S.sceneAtmosResolve(A, L, { fog: 1 }) };
  assert.ok(S.sceneHazeAt(200, null, fogL) > 0.4, 'fog hides 200 m');
  assert.ok(S.sceneHazeAt(200, A, null) < 0.03, 'a clear day does not');
});

test('sceneLightV2: the sun on the ground for headings 0, 90 and 200; the local hour; otherwise the same L as sceneLight', () => {
  const ms = Date.parse('2026-10-08T15:00:00Z'), sky = S.almSceneLight(ms, 53.48, -2.25, 'UTC');
  const sp = S.almSunPosition(ms, 53.48, -2.25);
  for (const heading of [0, 90, 200]) {
    const data = Object.assign({}, DATA, { camera: Object.assign({}, CAM, { heading }) });
    const L = S.sceneLightV2({ sky }, VIEW(), data);
    const rel = wrap(sp.az - heading);
    near(L.sun.rel, rel, 0.01, 'rel at heading ' + heading);
    near(L.sunG[0], -Math.sin(rel * Math.PI / 180), 1e-3, 'sunG x at ' + heading);
    near(L.sunG[1], -Math.cos(rel * Math.PI / 180), 1e-3, 'sunG d at ' + heading);
    near(L.sunTan, Math.min(12, 1 / Math.tan(sp.alt * Math.PI / 180)), 2e-3, 'sunTan');
    assert.equal(L.heading, heading, 'the camera sets the view heading');
    assert.equal(L.horizon, 470, 'and the horizon');
  }
  const L = S.sceneLightV2({ sky }, VIEW(), DATA);
  near(L.localHour, 15 - 2.25 / 15, 0.01, 'local solar hour from the longitude');
  assert.equal(L.weekday, 4, '8 Oct 2026 is a Thursday');
  // everything sceneLight gives is the same (bar the v2 overrides: haze, the v1 weather flags, wind from the weather)
  const L1 = S.sceneLight({ sky }, Object.assign(VIEW(), { horizon: 470, fov: 66, heading: 200 }));
  for (const k of ['alt', 'az', 'top', 'mid', 'low', 'lowSun', 'light', 'shade', 'shadeOp', 'cover', 'dark', 'lamps', 'windows', 'backlit', 'side', 'stars']) assert.deepEqual(L[k], L1[k], k);
  assert.deepEqual(L.sun, L1.sun, 'sun'); assert.deepEqual(L.shadow, L1.shadow, 'v1 shadow kept');
  assert.equal(L.rain, false); assert.equal(L.fog, false);
  assert.ok(L.atmos && L.atmos.V === 3000, 'urban: city atmosphere');
  assert.equal(L.haze, L.atmos.col, 'the haze colour is the atmosphere');
  assert.equal(L.wx.kind, 'clear');
});

test('sceneLightV2: weather overrides, the live forecast, and a v1 scene with fx keeps its view and flags', () => {
  const ms = Date.parse('2026-10-08T12:00:00Z'), sky = Object.assign(S.almSceneLight(ms, 53.48, -2.25, 'UTC'), { wx: { cond: 'rain', wind: 20, temp: 11 } });
  const live = S.sceneLightV2({ sky }, VIEW(), DATA);
  assert.equal(live.wx.kind, 'rain'); assert.equal(live.wx.src, 'live'); assert.equal(live.wx.wet, 1);
  const snow = S.sceneLightV2({ sky, wx: 'snow' }, VIEW(), DATA);
  assert.equal(snow.wx.kind, 'snow', 'an override wins over the live forecast');
  const fixed = S.sceneLightV2({}, VIEW({ at: 'noon' }), Object.assign({}, DATA, { weather: { kind: 'fog' } }));
  assert.equal(fixed.wx.kind, 'fog'); assert.ok(fixed.cover > 0.8, 'a fixed fog greys the sky'); assert.ok(fixed.atmos.V <= 400, 'and lowers V');
  const v1 = S.sceneLightV2({ sky }, { lat: 51, lon: 0, horizon: 560, fov: 80, heading: 180 }, { id: 'v1', view: { horizon: 560 }, fx: { atmos: 2 } });
  assert.equal(v1.horizon, 560); assert.equal(v1.rain, true, 'v1 keeps its own rain flag (it draws its own rain)');
});

/* ---------- night light sources ---------- */
const cam = Object.assign({}, CAM, { f: 800 / Math.tan(33 * Math.PI / 180), x0: 800, dMin: 4.7, bands: [] });
const proj = (x, d) => ({ X: 800 + cam.f * x / d, Y: cam.horizon + cam.f * cam.eye / d, k: cam.f / d });
const item = (o, x, d, extra) => { const def = S.sceneObj(o), p = proj(x, d), s = p.k * 1 / ((def && def.size && def.size[1]) || 100) * 5; return Object.assign({ o, v: 0, x: p.X, y: p.Y, s, flip: false, layer: 3, season: 'summer', strip: -1, g: { x, d, h: 0 }, dz: d }, extra); };
function fakeC() {
  const items = [item('street.lamp', 2, 20), item('building.shopfront', -6, 30, { s: proj(0, 30).k * 4 / 100 }), item('person.walker-test', 2.5, 20), item('person.walker-test', 30, 120)].filter(it => S.sceneObj(it.o));
  return { v: 2, id: 'lights-test', cam, items, layers: [0, 1, 2, 3, 4].map(i => ({ i })), ground: [], water: [], atmos: S.sceneAtmosCompile({}) };
}

test('sceneLightsOf: lamps and shop spill from the library and the table; v1 scenes have none', () => {
  assert.ok(S.sceneObj('street.lamp'), 'the library lamp exists');
  const C = fakeC(), lights = S.sceneLightsOf(C);
  const lamp = lights.find(l => l.kind === 'lamp');
  assert.ok(lamp, 'the street lamp is a lamp: ' + JSON.stringify(lights));
  assert.equal(lamp.r, 7, 'a 7 m pool');
  near(lamp.d, 20, 1e-6, 'at its depth'); assert.ok(lamp.h > 1, 'the head is up: ' + lamp.h);
  assert.ok(lights.some(l => l.kind === 'spill'), 'the shopfront spills');
  assert.equal(C.lights, lights, 'sets C.lights');
  assert.deepEqual(S.sceneLightsOf({ v: 1, items: C.items }), [], 'no camera: none');
  // a glow:'lamp' object not in the table is a 5 m pool (inline object, its own category)
  const pix = Object.assign({}, C, { items: C.items.map(it => Object.assign({}, it, { g: null, dz: undefined })) });
  assert.ok(S.sceneLightsOf(pix).some(l => l.kind === 'lamp' && Math.abs(l.d - 20) < 0.5), 'pixel placements: the depth is inferred from the row');
});

test('sceneLiftAt: buckets 0 / 0.15 / 0.3 / 0.45 near a lamp at night, nothing by day', () => {
  const C = fakeC(), lights = S.sceneLightsOf(C), night = { lamps: true, dark: 1 }, day = { lamps: false, dark: 0 };
  const under = S.sceneLiftAt({ x: 2.2, d: 20 }, lights, night), mid = S.sceneLiftAt({ x: 2, d: 24 }, lights, night), far = S.sceneLiftAt({ x: 30, d: 120 }, lights, night);
  assert.ok([0, 0.15, 0.3, 0.45].includes(under) && under >= 0.3, 'under the lamp: ' + under);
  assert.ok(mid < under && mid > 0, 'farther from it: ' + mid);
  assert.equal(far, 0, 'out of the pool');
  assert.equal(S.sceneLiftAt({ x: 2.2, d: 20 }, lights, day), 0, 'by day');
  const person = C.items.find(it => it.o === 'person.walker-test' && it.dz === 20);
  if (person) assert.ok(S.sceneLiftAt(person, lights, night, cam) >= 0.3, 'a compiled placement under the lamp');
});

test('SCENE_WINDOW_SHARE: a town goes dark late at night', () => {
  const at = (h) => S.sceneWindowShare(h);
  near(at(17), 0.65, 0.02, 'dusk'); near(at(21), 0.78, 0.01, '21 h'); near(at(23), 0.55, 0.01, '23 h'); near(at(0), 0.4, 0.01, 'midnight'); near(at(1), 0.32, 0.01, '1 h'); near(at(5), 0.25, 0.01, '5 h');
  assert.ok(at(22.5) < at(21) && at(1) < at(23) && at(5) < at(1), 'falls through the night');
  assert.equal(S.sceneWindowShare({ windows: false, localHour: 21 }), 0, 'none by day');
  assert.ok(S.sceneWindowShare({ windows: true, localHour: 23, weekday: 6 }) > S.sceneWindowShare({ windows: true, localHour: 23, weekday: 2 }), 'Saturday nights later');
});

/* ---------- the passes' pure parts (keys, applies, plans) ---------- */
test('the atmos and weather passes: applies (v1 untouched unless fx), keys, sprite keys with the flip', () => {
  const P = S.sceneAtmosPass, W = S.sceneWeatherPass;
  const v1 = { v: 1, items: [] }, v2 = { v: 2, cam, items: [] };
  assert.equal(P.applies(v1), false, 'a v1 scene: no atmos pass'); assert.equal(W.applies(v1), false, 'nor weather');
  assert.equal(P.applies(Object.assign({}, v1, { fx: { atmos: 2 } })), true); assert.equal(W.applies(Object.assign({}, v1, { fx: { weather: 2 } })), true);
  assert.equal(P.applies(v2), true); assert.equal(W.applies(v2), true);
  const L = S.sceneLightV2({}, VIEW({ at: 'golden' }), DATA), L2 = S.sceneLightV2({}, VIEW({ at: 'noon' }), DATA);
  assert.notEqual(P.key(L, v2), P.key(L2, v2), 'the sun moved round: a new key');
  const req = (o, flip) => ({ o, v: 0, part: '*', season: 'summer', flip });
  assert.ok(S.sceneObj('street.lamp'));
  const tree = 'tree.oak-test';
  assert.ok(S.sceneObj(tree), 'fixture tree');
  assert.notEqual(P.spriteKey(L, v2, req(tree, true)), P.spriteKey(L, v2, req(tree, false)), 'the flip bit for shaded classes');
  assert.equal(P.spriteKey(L, v1, req(tree, true)), '', 'v1: no change to sprite keys');
  assert.equal(P.spriteKey(L, v2, Object.assign(req(tree, true), { part: 'lit' })), 'lit2', 'the lit part is never shaded: it takes the lit treatment (soft floods, no own lamp pool) only');
  const rainL = S.sceneLightV2({ wx: 'rain' }, VIEW({ at: 'noon' }), DATA), snowL = S.sceneLightV2({ wx: 'snow' }, VIEW({ at: 'noon' }), DATA);
  assert.notEqual(W.key(rainL, v2), W.key(snowL, v2), 'rain and snow bake differently');
  assert.match(W.spriteKey(snowL, v2, req(tree, false)), /^s\d/, 'snow caps key the tree sprite');
  assert.ok(S.sceneRimAt(L) > 0, 'golden hour: a rim'); assert.equal(S.sceneRimAt(L2) > 0.15, false, 'noon (sun behind the camera): little or none');
});

test('sceneFogBanks: up to 4 banks, far first, at about 400, 150, 60 and 30 m', () => {
  const C = { v: 2, cam, items: [] };
  const L = S.sceneLightV2({ wx: 'fog' }, VIEW({ at: 'dawn' }), DATA);
  const B = S.sceneFogBanks(C, L);
  assert.deepEqual(B.map(b => b.d), [400, 150, 60, 30]);
  assert.ok(B.every((b, i) => i === 0 || b.y > B[i - 1].y), 'nearer banks lower on the screen');
  assert.ok(B.every(b => b.speed > 0 && b.op > 0 && b.op <= 0.6));
  assert.deepEqual(S.sceneFogBanks(C, S.sceneLightV2({}, VIEW({ at: 'noon' }), DATA)), [], 'clear: none');
});

/* ---------- headless Chrome: the passes drawing through the real renderer (skipped without a browser) ---------- */
// A small v2 street compiled by hand into the V2 12 form (a stand-in for builder A's compile, so these tests do not depend on
// it): pavements and a road across the view, a shopfront and a terrace facing the camera, two lamps, a person, grass beyond.
const PAGE_SCRIPT = `
(function () {
  const CAM = { eye: 1.65, fov: 66, horizon: 470, heading: 250, x0: 800 }, f = 800 / Math.tan(33 * Math.PI / 180);
  const P = (x, d) => ({ X: 800 + f * x / d, Y: 470 + f * 1.65 / d, k: f / d });
  const BANDS = [[800, 1e9], [200, 800], [50, 200], [15, 50], [0, 15]], IDS = ['horizon', 'far', 'mid', 'near', 'fore', 'front'];
  const band = (d) => BANDS.findIndex(b => d >= b[0] && d < b[1]);
  const REAL = { 'building.shopfront': 7.5, 'building.terrace-victorian': 9.5, 'street.lamp': 5.5, 'person.walker': 1.72, 'tree.oak': 15 };
  const PLACE = [['tree.oak', 30, 160], ['building.terrace-victorian', -22, 26], ['building.shopfront', 12, 26], ['street.lamp', -6, 20.5], ['street.lamp', 6, 20.5], ['person.walker', -8, 22]];
  const SURF = [['land', 'grass', [-3000, 3000, 4, 5000], ['#7a8a5a', '#5f7a3e']], ['pave-far', 'pavement', [-200, 200, 19, 24], ['#a8a49c', '#96928a']],
    ['road', 'road', [-200, 200, 9.5, 19], ['#5e6064', '#47494d']], ['pave-near', 'pavement', [-200, 200, 4, 9.5], ['#9a968e', '#86827a']]];
  const quad = (x0, x1, d0, d1) => { const a = P(x0, d1), b = P(x1, d1), c = P(x1, d0), e = P(x0, d0); return { d: 'M' + a.X + ' ' + a.Y + 'L' + b.X + ' ' + b.Y + 'L' + c.X + ' ' + c.Y + 'L' + e.X + ' ' + e.Y + 'Z', y0: a.Y, y1: e.Y }; };
  window.__tC = function () {
    const data = { id: 'atmos-chrome', camera: Object.assign({}, CAM), view: { lat: 53.381, lon: -1.47 }, setting: 'urban', weather: 'live', layers: IDS.map(id => ({ id, depth: 0.5, haze: 0 })), particles: 'none', sky: { clouds: { n: 0 } },
      place: PLACE.map(([obj, x, d]) => { const def = sceneObj(obj), p = P(x, d); return { obj, x: p.X, y: p.Y, s: p.k * REAL[obj] / def.size[1], layer: IDS[band(d)], anim: false, shadow: false }; }) };
    const C1 = sceneCompile(data, { season: 'summer', lod: 1 });
    const C = Object.assign({}, C1, { v: 2, cam: Object.assign({}, CAM, { f, dMin: f * 1.65 / 430, dMax: 20000, water: 0, bands: BANDS.map((b, i) => ({ id: IDS[i], i, d0: b[0], d1: b[1] })) }) });
    C.view = Object.assign({}, C1.view, { horizon: 470, fov: 66, heading: 250 });
    // the placements' ground records (A's compile gives them when it has landed; else from the table above); anything A adds
    // on its own (seasonal cover) keeps its record, or is inferred from its row
    C.items = C1.items.map(it => { const q = PLACE.find(p => p[0] === it.o && Math.abs(P(p[1], p[2]).X - it.x) < 0.01), def = sceneObj(it.o);
      const d = q ? q[2] : it.g && it.g.d ? it.g.d : f * 1.65 / Math.max(1, it.y - 470), x = q ? q[1] : it.g && it.g.d ? it.g.x : (it.x - 800) * d / f;
      return Object.assign({}, it, { haze: null, g: { x, d, h: 0 }, dz: d, cls: it.cls || { building: 'building', street: 'street', person: 'person', tree: 'tree' }[def.category] || def.category }); });
    C.ground = []; C.surfaces = [];
    for (const [id, kind, r, cols] of SURF) {
      const idx = [];
      BANDS.forEach((b, bi) => { const a = Math.max(r[2], b[0], 4), z = Math.min(r[3], b[1], 5000); if (!(z > a)) return; const q = quad(r[0], r[1], a, z); idx.push(C.ground.length); C.ground.push({ layer: bi, d: q.d, fill: { lin: [[0, cols[0]], [1, cols[1]]], x1: 0, y1: q.y0, x2: 0, y2: q.y1 }, surf: id }); });
      C.surfaces.push({ id, kind, flags: {}, polyM: [[r[0], r[2]], [r[1], r[2]], [r[1], r[3]], [r[0], r[3]]], groundIdx: idx });
    }
    C.ground.sort((a, b) => a.layer - b.layer);
    sceneAtmosCompile(data, C); sceneWeatherCompile(data, C); sceneLightsOf(C);
    return { C, data };
  };
  window.__tRender = function (o) {
    const { C, data } = window.__tC();
    const sky = almSceneLight(Date.parse(o.at), 53.381, -1.47, 'UTC');
    const L = sceneLightV2({ sky, wx: o.wx || null }, Object.assign({}, data.view, { season: 'summer' }), data);
    if (window.__r) window.__r.destroy();
    const cv = document.getElementById('c');
    const r = window.__r = sceneRendererCreate(cv, { compiled: C }, { L, still: o.t == null, season: 'summer', dpr: 1, governor: false, time: () => o.t || 0 });
    r.resize(1600, 900); r.frame(o.t || 0);
    return { passes: r.stats().passes || null, lk: r.stats().lightKey, alt: L.alt, kind: L.wx.kind };
  };
  window.__tLum = function (x, y, r) { let s = 0, n = 0; const d = document.getElementById('c').getContext('2d').getImageData(Math.round(x - r), Math.round(y - r), 2 * r + 1, 2 * r + 1).data; for (let i = 0; i < d.length; i += 4) { s += 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; n++; } return s / n; };
  window.__tP = function (x, d) { return { X: 800 + f * x / d, Y: 470 + f * 1.65 / d }; };
})();`;
const browser = findBrowser();
let chrome = null, pageHtml = null;
const hasHooks = /sceneRunPasses\(env, 'layer:under'/.test(app('78-scene-canvas.js'));
before(async () => {
  if (!browser) return;
  chrome = await launchChrome({ executable: browser });
  const src = sceneSourceFiles(ROOT, { browser: true, fixtures: true }).map(f => readFileSync(f, 'utf8')).join('\n;\n');
  pageHtml = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:1600px;height:900px}</style></head><body><canvas id="c" width="1600" height="900"></canvas><script>window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message)));</script><script>${src}\n;\n${PAGE_SCRIPT}</script></body></html>`;
});
after(async () => { if (chrome) await chrome.close(); });
const SKIP = !browser ? 'no Chrome / Chromium found' : false, SKIP_R = SKIP || (!hasHooks && 'the renderer has no pass hooks yet (builder B)');
const page = async () => { await chrome.screenshot({ html: pageHtml, width: 1600, height: 900, transparent: false }); assert.deepEqual(await chrome.evaluate('window.__errs'), []); };
const ev = (s) => chrome.evaluate(s);
const NIGHT = '2026-07-08T22:40:00Z', NOON = '2026-07-08T12:10:00Z';
const lumAt = (o, x, d, r = 2) => ev(`(() => { window.__tRender(${JSON.stringify(o)}); const p = window.__tP(${x}, ${d}); return window.__tLum(p.X, p.Y, ${r}); })()`);

test('chrome: a night frame has lamp pools brighter than the ground round them, and lit placements', { skip: SKIP_R }, async () => {
  await page();
  const r = await ev(`window.__tRender({ at: '${NIGHT}' })`);
  assert.ok(r.passes && r.passes.atmos && r.passes.atmos.pools >= 2, 'pools drawn: ' + JSON.stringify(r.passes && r.passes.atmos));
  const pool = await ev(`(() => { const p = window.__tP(-6, 19.6); return window.__tLum(p.X, p.Y, 3); })()`);
  const away = await ev(`(() => { const p = window.__tP(-26, 19.6); return window.__tLum(p.X, p.Y, 3); })()`);
  assert.ok(pool > away + 10, `the pool (${pool.toFixed(1)}) is brighter than the pavement 20 m along (${away.toFixed(1)})`);
  assert.ok(r.passes.atmos.lifted >= 1, 'the person beside the lamp is lifted');
});

test('chrome: rain darkens the hard ground and lays light streaks below the lamps', { skip: SKIP_R }, async () => {
  await page();
  const dry = await lumAt({ at: NOON, wx: 'cloudy' }, -2, 12), wet = await lumAt({ at: NOON, wx: 'rain' }, -2, 12);
  assert.ok(wet < dry - 3, `the road is darker in the rain (${wet.toFixed(1)} vs ${dry.toFixed(1)})`);
  // straight below the lamp's foot on the screen (where its reflection streak lies on the wet road)
  const below = (wx) => ev(`(() => { window.__tRender({ at: '${NIGHT}', wx: '${wx}' }); const p = window.__tP(6, 20.5); return window.__tLum(p.X, p.Y + 40, 2); })()`);
  const dryN = await below('cloudy'), wetN = await below('rain');
  assert.ok(wetN > dryN + 3, `a streak below the lamp on the wet road at night (${wetN.toFixed(1)} vs ${dryN.toFixed(1)})`);
  const st = await ev(`window.__tRender({ at: '${NIGHT}', wx: 'rain', t: 1 }).passes.weather`);
  assert.ok(st.streaks >= 2 && st.rain > 0 && st.puddles >= 3, JSON.stringify(st));
});

test('chrome: snow whitens the grass; a snow cap whitens only a sprite\'s top edges', { skip: SKIP }, async () => {
  await page();
  const cap = await ev(`(() => {
    const c = new OffscreenCanvas(60, 60), cx = c.getContext('2d', { willReadFrequently: true });
    cx.fillStyle = '#5a3020'; cx.fillRect(10, 20, 40, 30);
    sceneWeatherCapSprite(cx, '#f2f5f8', 0.9, 3);
    const px = (x, y) => Array.from(cx.getImageData(x, y, 1, 1).data);
    return { top: px(30, 20), mid: px(30, 35), out: px(5, 5) };
  })()`);
  assert.ok(cap.top[0] > 200 && cap.top[2] > 200, 'the top edge is white: ' + cap.top);
  assert.deepEqual(cap.mid.slice(0, 3), [0x5a, 0x30, 0x20], 'the body is unchanged');
  assert.equal(cap.out[3], 0, 'nothing outside the sprite');
  if (SKIP_R) return;
  const cloudy = await lumAt({ at: NOON, wx: 'cloudy' }, 30, 80), snow = await lumAt({ at: NOON, wx: 'snow' }, 30, 80);
  assert.ok(snow > cloudy + 40, `snow lies on the grass (${snow.toFixed(1)} vs ${cloudy.toFixed(1)})`);
});

test('chrome: the rim light is on the sun\'s side only, and a flipped sprite is lit for its orientation', { skip: SKIP }, async () => {
  await page();
  const r = await ev(`(() => {
    const mk = () => { const c = new OffscreenCanvas(80, 80), cx = c.getContext('2d', { willReadFrequently: true }); cx.fillStyle = '#303030'; cx.beginPath(); cx.arc(40, 40, 30, 0, Math.PI * 2); cx.fill(); return cx; };
    const L = { alt: 5, side: 1, backlit: 0.9, cover: 0, dark: 0, lowSun: '#ffc070', light: '#fff0d4', shade: '#fff0dc', sun: { rel: 20 } };
    const lum = (cx, x) => { const d = cx.getImageData(x, 40, 1, 1).data; return 0.3 * d[0] + 0.59 * d[1] + 0.11 * d[2]; };
    const a = mk(); sceneAtmosShadeSprite(a, L, 1, { shade: 0 });
    const b = mk(); sceneAtmosShadeSprite(b, L, -1, { shade: 0 });
    // the pass: a flipped placement lit from the right is drawn mirrored, so its sprite is rimmed on the LEFT in sprite space
    const c = mk(), env = { C: { v: 2, cam: { f: 1000, eye: 1.65, horizon: 470, fov: 66, x0: 800 } }, L };
    sceneAtmosPass.sprite(env, c, { o: 'person.walker', v: 0, part: '*', flip: true, cls: 'person' });
    const s = mk(); sceneAtmosShadeSprite(s, Object.assign({}, L, { backlit: 0, alt: 40 }), 1, {});
    return { aR: lum(a, 69), aL: lum(a, 11), bR: lum(b, 69), bL: lum(b, 11), cR: lum(c, 69), cL: lum(c, 11), sR: lum(s, 60), sL: lum(s, 20), base: 48 };
  })()`);
  assert.ok(r.aR > r.base + 15 && Math.abs(r.aL - r.base) < 2, 'lit from the right: the right edge only ' + JSON.stringify(r));
  assert.ok(r.bL > r.base + 15 && Math.abs(r.bR - r.base) < 2, 'lit from the left: the left edge only');
  assert.ok(r.cL > r.cR + 10, 'flipped: the rim moves to the other edge of the sprite');
  assert.ok(r.sL < r.sR - 2, 'soft shading: darker away from the sun (no rim at noon)');
});

test('chrome: fog banks drift with the wind', { skip: SKIP_R }, async () => {
  await page();
  const row = `Array.from({ length: 16 }, (_, i) => window.__tLum(100 + i * 90, 452, 1))`;
  const a = await ev(`(() => { const r = window.__tRender({ at: '${NOON}', wx: 'fog', t: 0 }); return { st: r.passes.atmos, row: ${row} }; })()`);
  const b = await ev(`(() => { window.__tRender({ at: '${NOON}', wx: 'fog', t: 9 }); return ${row}; })()`);
  assert.equal(a.st.banks, 4, 'fog: 4 banks');
  assert.ok(a.row.some((v, i) => Math.abs(v - b[i]) > 1.5), 'the banks moved between t = 0 and t = 9');
});

test('host: a v1 scene keeps sceneLight and its light key; a v2 scene gets sceneLightV2, and sceneHostSet previews', { skip: SKIP }, async () => {
  const at = '2026-10-08T15:00:00Z';
  await chrome.screenshot({ html: scenePageHtml({ root: ROOT, data: 'SCENE_TEST_TINY', fixtures: true, at, location: [51.5, -0.12] }), width: 800, height: 450, transparent: false });
  await ev('window.__sceneReady');
  const v1 = await ev(`(() => { const rec = [..._schHosts.values()][0]; const sky = _schSky(rec, rec.data); const season = _scSeasonOf(rec.data, { sky });
    const L0 = sceneLight({ sky }, Object.assign({}, rec.data.view, { season, at: rec.data.at })), L1 = _schLight(rec).L;
    const strip = (L) => JSON.stringify(L, (k, v) => typeof v === 'function' ? undefined : v);
    return { v2: _schIsV2(rec.data), same: strip(L0) === strip(L1), wx: L1.wx === undefined, key: rec.r.stats().lightKey, expect: sceneLightKey(L0, season) }; })()`);
  assert.equal(v1.v2, false); assert.ok(v1.same, 'the same L as sceneLight'); assert.ok(v1.wx, 'no v2 fields');
  assert.equal(v1.key, v1.expect, 'the light key is unchanged');
  const data = "Object.assign({}, SCENE_TEST_TINY, { id: 'host-v2', camera: { eye: 1.65, fov: 66, horizon: 520, heading: 200 } })";
  await chrome.screenshot({ html: scenePageHtml({ root: ROOT, data, fixtures: true, at, location: [51.5, -0.12] }), width: 800, height: 450, transparent: false });
  await ev('window.__sceneReady');
  const v2 = await ev(`(() => { const rec = [..._schHosts.values()][0], el = rec.el, out = {};
    out.v2 = _schIsV2(rec.data); out.kind0 = _schLight(rec).L.wx.kind;
    out.set = sceneHostSet(el, { wx: 'snow' }); out.attr = el.getAttribute('data-sc-wx'); out.kind1 = _schLight(rec).L.wx.kind;
    sceneHostSet(el, { wx: { kind: 'rain', intensity: 0.5 } }); out.kind2 = _schLight(rec).L.wx.kind; out.rain2 = _schLight(rec).L.wx.rain;
    sceneHostSet(el, { at: 'night' }); out.sky = el.getAttribute('data-sc-sky'); out.altN = _schLight(rec).L.alt;
    sceneHostSet(el, { wx: null, at: null, season: 'winter' }); out.attr3 = el.getAttribute('data-sc-wx'); out.season = el.getAttribute('data-sc-season'); out.sky3 = el.getAttribute('data-sc-sky');
    out.none = sceneHostSet(document.body, { wx: 'rain' }); return out; })()`);
  assert.equal(v2.v2, true); assert.equal(v2.set, true);
  assert.equal(v2.attr, 'snow'); assert.equal(v2.kind1, 'snow'); assert.equal(v2.kind2, 'rain'); assert.equal(v2.rain2, 0.4);
  assert.equal(v2.sky, 'off'); assert.ok(v2.altN < -6, 'the authored night: ' + v2.altN);
  assert.equal(v2.attr3, null); assert.equal(v2.season, 'winter'); assert.equal(v2.sky3, null);
  assert.equal(v2.none, false, 'not a scene host');
});
