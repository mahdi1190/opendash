// Scene engine v2, builder C: weather (docs/dev/SCENE_ENGINE_V2.md 8 and 27.3). The resolver, the snow climatology, frost
// and the puddles are pure (70-scene-1weather.js); the weather pass's drawing is tested in Chrome (scene-atmos-chrome.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenes } from '../tools/lib/scene-page.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = (f) => readFileSync(join(ROOT, 'src', 'app', f), 'utf8');
const NAMES = ['sceneWeather', 'sceneWeatherCompile', 'sceneSnowCover', 'sceneFrostAt', 'scenePuddles', 'SCENE_SNOW_CLIMATE', 'SCENE_WEATHER_KINDS', 'sceneLightV2',
  'sceneWeatherSurface', 'sceneWeatherParticles', 'sceneWeatherParticleAt', 'sceneLightningAt', 'sceneWeatherPass'];
const extra = app('78-scene-atmos.js') + '\n;\n' + app('78-scene-weather.js') + `\n;globalThis.__scWx = { ${NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} };`;
loadScenes(ROOT, { fixtures: true, extra });
const S = globalThis.__scWx;
const DAY = 86400000;

test('sceneWeather: every kind maps to falling rain, snow, fog, wet ground and banks', () => {
  const w = (k) => S.sceneWeather(k, null, {});
  for (const k of S.SCENE_WEATHER_KINDS) { const r = w(k); assert.equal(r.kind, k, k); for (const f of ['rain', 'snow', 'fog', 'wet', 'snowDepth', 'frost']) assert.ok(r[f] >= 0 && r[f] <= 1, k + ' ' + f); }
  assert.ok(w('rain').rain > 0.5 && w('rain').wet === 1, 'rain: wet 1');
  assert.equal(w('drizzle').wet, 0.6); assert.equal(w('showers').wet, 0.5); assert.equal(w('thunder').wet, 1); assert.equal(w('thunder').thunder, true);
  assert.ok(w('snow').snow > 0.5 && w('snow').snowDepth >= 0.5, 'falling snow lies');
  assert.equal(w('fog').fog, 1); assert.equal(w('fog').banks, 4); assert.ok(w('mist').fog > 0 && w('mist').fog < 1);
  assert.ok(w('frost').frost > 0, 'a frost scene is frosty');
  const clear = w('clear'); assert.deepEqual([clear.rain, clear.snow, clear.fog, clear.wet, clear.banks], [0, 0, 0, 0, 0]);
  assert.equal(S.sceneWeather('none', null, {}).kind, 'none', 'interiors');
  assert.equal(S.sceneWeather('live', null, {}).kind, 'clear', 'live with no forecast: the authored moment is clear');
  const fixed = S.sceneWeather({ kind: 'rain', intensity: 0.5, wind: 1.6, wet: 0.3, banks: 2 }, null, {});
  assert.deepEqual([fixed.rain, fixed.wind, fixed.wet, fixed.banks], [0.4, 1.6, 0.3, 2], 'an object input: intensity, wind and the explicit values');
  assert.equal(S.sceneWeather({ kind: 'rain', wind: 9 }, null, {}).wind, 1.8, 'wind clamped to 0.4..1.8');
});

test('sceneWeather: the live forecast; an override wins; temperature thaws the snow', () => {
  const live = S.sceneWeather('live', { wind: 1.2 }, { sky: { ms: Date.parse('2026-10-08T12:00Z'), wx: { cond: 'showers', temp: 9 } } });
  assert.deepEqual([live.kind, live.src, live.temp], ['showers', 'live', 9]);
  assert.ok(live.wind >= 1.3, 'showers are gusty');
  assert.equal(S.sceneWeather('snow', null, { sky: { wx: { cond: 'rain' } } }).kind, 'snow', 'a fixed kind (an override) wins');
  assert.ok(S.sceneWeather({ kind: 'snow', temp: 5 }, null, {}).snowDepth <= 0.3, 'over 4 C: patchy');
  assert.equal(S.sceneWeather({ kind: 'snow', temp: 8 }, null, {}).snowDepth, 0, 'over 7 C: none');
  assert.deepEqual(S.sceneWeatherCompile({ weather: 'fog' }).input, 'fog');
  assert.deepEqual(S.sceneWeatherCompile({}).input, 'live');
  const C = {}; S.sceneWeatherCompile({ weather: { kind: 'rain', intensity: 0.7 } }, C); assert.deepEqual(C.weather, { input: { kind: 'rain', intensity: 0.7 } });
});

test('sceneFrostAt: cold clear mornings until the sun is 12 degrees up', () => {
  const L = (alt, morning, ms = Date.parse('2026-01-14T08:00Z')) => ({ alt, morning, ms, lat: 52, lon: -1 });
  assert.ok(S.sceneFrostAt(L(3, true), -2, 'clear') > 0.5, 'live -2 C at dawn');
  assert.equal(S.sceneFrostAt(L(3, false), -2, 'clear'), 0, 'not in the evening');
  assert.equal(S.sceneFrostAt(L(14, true), -2, 'clear'), 0, 'the sun is up');
  assert.equal(S.sceneFrostAt(L(3, true), 4, 'clear'), 0, 'above freezing (live)');
  assert.equal(S.sceneFrostAt(L(3, true), -2, 'rain'), 0, 'rain washes it out');
  // without live data: about 35 % of clear winter mornings, seeded by the date (none in summer)
  let n = 0, s = 0;
  for (let d = 0; d < 400; d++) { const ms = Date.parse('2025-12-01T08:00Z') + (d % 90) * DAY + Math.floor(d / 90) * 365 * DAY; if (S.sceneFrostAt(L(2, true, ms), null, 'clear') > 0) n++; }
  for (let d = 0; d < 90; d++) if (S.sceneFrostAt(L(2, true, Date.parse('2026-06-01T05:00Z') + d * DAY), null, 'clear') > 0) s++;
  assert.ok(n > 400 * 0.2 && n < 400 * 0.5, 'about 35 % of winter mornings: ' + n);
  assert.equal(s, 0, 'no summer frost');
});

test('sceneSnowCover: deterministic per date and place; neighbours agree; the hills whiter; southern winters; none in the tropics', () => {
  const day = (iso) => Date.parse(iso);
  assert.equal(S.sceneSnowCover(53.38, -1.47, 60, day('2027-01-20T12:00Z')), S.sceneSnowCover(53.38, -1.47, 60, day('2027-01-20T12:00Z')), 'deterministic');
  let low = 0, high = 0, agree = 0, n = 0, worse = 0;
  for (let y = 2026; y < 2046; y++) for (let k = 0; k < 90; k++) {
    const ms = Date.UTC(y, 11, 1) + k * DAY;
    const a = S.sceneSnowCover(53.38, -1.47, 60, ms), b = S.sceneSnowCover(53.30, -1.60, 300, ms), c = S.sceneSnowCover(53.40, -1.45, 80, ms);
    n++; if (a) low++; if (b) high++; if ((a > 0) === (c > 0)) agree++; if (a && !b) worse++;
  }
  assert.ok(low / n > 0.01 && low / n < 0.09, 'Sheffield lowland: a few % of winter days: ' + (low / n).toFixed(3));
  assert.ok(high > low * 1.5, 'the Peaks are snowy more often: ' + high + ' vs ' + low);
  assert.equal(agree, n, 'two scenes of one area agree every day');
  assert.equal(worse, 0, 'the hills are white whenever the valley is');
  assert.equal(S.sceneSnowCover(53.38, -1.47, 60, day('2026-07-10T12:00Z')), 0, 'no snow in July (north)');
  let south = 0;
  for (let k = 0; k < 92; k++) if (S.sceneSnowCover(-45.0, 170.5, 700, Date.UTC(2026, 5, 1) + k * DAY)) south++;
  assert.ok(south > 0, 'a southern winter (June to August) at 700 m has snowy days');
  let southJan = 0;
  for (let k = 0; k < 31; k++) if (S.sceneSnowCover(-45.0, 170.5, 700, Date.UTC(2027, 0, 1) + k * DAY)) southJan++;
  assert.equal(southJan, 0, 'and none in its summer');
  for (let k = 0; k < 365; k += 5) assert.equal(S.sceneSnowCover(1.3, 103.8, 20, Date.UTC(2026, 0, 1) + k * DAY), 0, 'the tropics');
});

/* ---------- puddles ---------- */
const F = 800 / Math.tan(33 * Math.PI / 180);
const cam = { eye: 1.65, fov: 66, horizon: 470, heading: 0, x0: 800, f: F, dMin: 4.7, bands: [{ id: 'far', i: 1, d0: 200, d1: 800 }, { id: 'mid', i: 2, d0: 50, d1: 200 }, { id: 'near', i: 3, d0: 15, d1: 50 }, { id: 'fore', i: 4, d0: 0, d1: 15 }] };
const C = { v: 2, id: 'puddle-test', cam, layers: [0, 1, 2, 3, 4].map(i => ({ i })), items: [], ground: [], water: [],
  surfaces: [
    { id: 'land', kind: 'grass', polyM: [[-400, 4], [400, 4], [400, 900], [-400, 900]] },
    { id: 'road', kind: 'road', polyM: [[-3.6, 4], [3.6, 4], [3.6, 300], [-3.6, 300]] },
    { id: 'pave', kind: 'pavement', polyM: [[3.6, 4], [6.2, 4], [6.2, 300], [3.6, 300]] },
    { id: 'cross', kind: 'road', polyM: [[-500, 30], [500, 30], [500, 38], [-500, 38]] },
  ] };
const kindAt = (x, d) => { for (let i = C.surfaces.length - 1; i >= 0; i--) { const p = C.surfaces[i].polyM; const xs = p.map(q => q[0]), ds = p.map(q => q[1]); if (x >= Math.min(...xs) && x <= Math.max(...xs) && d >= Math.min(...ds) && d <= Math.max(...ds)) return C.surfaces[i].kind; } return null; };

test('scenePuddles: 3 to 12 seeded puddles on hard and path ground within 60 m, each at least 6 units across', () => {
  const wx = { wet: 1, snowDepth: 0 }, P = S.scenePuddles(C, wx, {});
  assert.ok(P.length >= 3 && P.length <= 12, 'count ' + P.length);
  assert.deepEqual(JSON.stringify(S.scenePuddles(C, wx, {})), JSON.stringify(P), 'seeded');
  for (const p of P) {
    const q = p.v2.puddle;
    assert.ok(q.d <= 60 + q.rd, 'within 60 m: ' + q.d);
    assert.ok(['road', 'pavement'].includes(kindAt(q.x, q.d)), 'on hard ground: ' + kindAt(q.x, q.d));
    assert.ok(q.d >= 8, 'not at the feet of the camera: ' + q.d);
    for (const [x, d] of p.v2.polyM) assert.ok(['road', 'pavement'].includes(kindAt(x, d)) || Math.abs(x) > 3.5, 'the outline stays on the hard ground');
    assert.ok(2 * q.rx * F / q.d >= 6, 'at least 6 units across');
    assert.equal(p.v2.kind, 'puddle'); assert.equal(p.v2.mirror, 0.7); assert.equal(p.v2.ripple, 0.25); assert.equal(p.v2.clarity, 0);
    assert.ok(p.y1 > p.y0 && /^M/.test(p.d), 'a screen path');
    const X = 800 + F * q.x / q.d;
    assert.ok(X > 0 && X < 1600, 'in view: ' + X.toFixed(0));
  }
  assert.ok(P.length > S.scenePuddles(C, { wet: 0.4, snowDepth: 0 }, {}).length || P.length === 12, 'wetter: more puddles');
  assert.deepEqual(S.scenePuddles(C, { wet: 0.1, snowDepth: 0 }, {}), [], 'dry: none');
  assert.deepEqual(S.scenePuddles(C, { wet: 1, snowDepth: 0.8 }, {}), [], 'under snow: none');
  assert.deepEqual(S.scenePuddles({ v: 1, items: [] }, wx, {}), [], 'v1: none');
  const grass = Object.assign({}, C, { surfaces: [C.surfaces[0]] });
  assert.deepEqual(S.scenePuddles(grass, wx, {}), [], 'grass only: none');
});

/* ---------- the weather pass's pure parts ---------- */
test('the weather pass: surfaces, particles (pure in t, slanted by the wind), lightning 1 to 3 times a minute', () => {
  assert.deepEqual([S.sceneWeatherSurface('road').wet, S.sceneWeatherSurface('road').snow, S.sceneWeatherSurface('road').hard], [0.8, 'slush', true]);
  assert.equal(S.sceneWeatherSurface('grass').grassy, true); assert.equal(S.sceneWeatherSurface('wood').snow, 'partial');
  const R = S.sceneWeatherParticles('rain', 250, 7);
  assert.equal(R.length, 250); assert.ok(R.filter(p => p.near).length === 100, 'two tiers: 40 % near');
  const p = R[0], a = S.sceneWeatherParticleAt(p, 0.01, 1, 'rain'), b = S.sceneWeatherParticleAt(p, 0.02, 1, 'rain');
  assert.deepEqual(S.sceneWeatherParticleAt(p, 0.01, 1, 'rain'), a, 'pure in t');
  if (b.y > a.y) near01((a.x - b.x) / (b.y - a.y), 0.35, 'dx = wind * 0.35 * dy');
  const snow = S.sceneWeatherParticles('snow', 200, 9);
  assert.ok(snow.filter(q => q.near).every(q => q.size >= 3) && snow.filter(q => !q.near).every(q => q.size < 3), 'near flakes larger');
  let flashes = 0;
  for (let t = 0; t < 600; t += 0.04) if (S.sceneLightningAt('x', t)) flashes++;
  const perMin = flashes * 0.04 / 0.12 / 10;
  assert.ok(perMin >= 0.9 && perMin <= 3.2, 'flashes a minute: ' + perMin.toFixed(2));
  assert.equal(S.sceneWeatherPass.applies({ v: 1, items: [] }), false);
});
function near01(a, b, msg) { assert.ok(Math.abs(a - b) < 0.01, `${msg}: ${a} vs ${b}`); }
