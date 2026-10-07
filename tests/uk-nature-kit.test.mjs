// The UK nature kit (src/app/71-anim-uk-nature-kit.js) and the live sky it draws with:
// the sun and moon positions in the almanac, K.live's light model, K.tone / K.keep, the
// registry's live-sky snapshot (location fallback and weather) and the rich-scene budget.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const src = f => readFileSync(join(APP, f), 'utf8');
// eslint-disable-next-line no-new-func
const A = new Function(src('71-anim-almanac.js') + '\nreturn { almSunPosition, almMoonPosition, almSceneLight, almSunTimes, almMoonDiscPath };')();
// the kit on the same small base toolkit the South East pack hands it (U, R, rnd, mv, linU, radU, puffs)
const base = () => {
  let n = 0;
  const U = () => 'kt' + (++n).toString(36), R = Math.round;
  const rnd = seed => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  const stops = a => a.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`).join('');
  const st = o => Object.entries(o).map(([k, v]) => k === 'to' ? `transform-box:view-box;transform-origin:${v}` : `--${k}:${v}`).join(';');
  return { U, R, rnd, mv: (cls, o, inner) => `<g class="x-${cls}"${o ? ` style="${st(o)}"` : ''}>${inner}</g>`,
    linU: (id, a, x1, y1, x2, y2) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(a)}</linearGradient>`,
    radU: (id, a, cx, cy, r) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops(a)}</radialGradient>`,
    puffs: () => '' };
};
// eslint-disable-next-line no-new-func
const kitOf = new Function(src('71-anim-almanac.js') + '\n' + src('71-anim-uk-nature-kit.js') + '\nreturn ukNatureKit;')();
const K = kitOf(base());
const lat = 51.34, lon = -0.83, zone = 'UTC';
const sky = iso => A.almSceneLight(Date.parse(iso), lat, lon, zone);

test('the almanac places the sun and the moon', () => {
  const summer = A.almSunPosition(Date.parse('2026-06-21T12:03Z'), lat, lon), winter = A.almSunPosition(Date.parse('2026-12-21T12:03Z'), lat, lon);
  assert.ok(Math.abs(summer.alt - 62.1) < 1 && Math.abs(summer.az - 180) < 3, 'midsummer noon: high in the south');
  assert.ok(Math.abs(winter.alt - 15.2) < 1 && Math.abs(winter.az - 180) < 3, 'midwinter noon: low in the south');
  const rise = A.almSunTimes('2026-06-21', lat, lon).rise, atRise = A.almSunPosition(rise, lat, lon);
  assert.ok(Math.abs(atRise.alt + .83) < .6 && atRise.az > 40 && atRise.az < 55, 'a midsummer sunrise is in the north east');
  const full = A.almMoonPosition(Date.parse('2026-06-29T23:30Z'), lat, lon), fresh = A.almMoonPosition(Date.parse('2026-11-09T12:00Z'), lat, lon);
  assert.ok(full.illum > .97 && Math.abs(full.az - 180) < 25, 'a full moon near midnight stands in the south, fully lit');
  assert.ok(fresh.illum < .03, 'new moon: dark');
  // an evening crescent after sunset in the south west: its lit limb faces the set sun (right and down)
  const cres = A.almMoonPosition(Date.parse('2026-10-13T18:00Z'), lat, lon);
  assert.ok(cres.waxing && cres.illum < .2 && cres.limb > 60 && cres.limb < 140, `crescent limb ${cres.limb}`);
  const wane = A.almMoonPosition(Date.parse('2026-10-06T07:00Z'), lat, lon);
  assert.ok(!wane.waxing && wane.limb < -60 && wane.limb > -170, `a morning waning moon is lit toward the rising sun (left): ${wane.limb}`);
  const s = sky('2026-07-08T12:00Z');
  for (const k of ['ms', 'lat', 'lon', 'tz', 'azimuth', 'moonPos']) assert.ok(s[k] != null, `almSceneLight gives ${k}`);
  assert.equal(A.almSunPosition(NaN, lat, lon), null);
});

test('K.live: the sun and moon where they stand in the view, light by real sun height', () => {
  const noon = sky('2026-12-21T12:03Z');
  const south = K.live({ sky: noon }, { heading: 180, fov: 80, horizon: 560 }), east = K.live({ sky: noon }, { heading: 90, fov: 80, horizon: 560 });
  assert.equal(south.live, true);
  assert.ok(Math.abs(south.sun.x - 800) < 40 && south.sun.show, 'facing south at noon the winter sun is in the middle');
  assert.ok(Math.abs(south.sun.y - (560 - noon.altitude * 20)) < 3, 'altitude maps to height above the horizon');
  assert.equal(east.sun.show, false, 'facing east at noon it is out of the view');
  assert.ok(south.shadow.len > 3 && south.shadow.dy > 0, 'a low winter sun ahead casts long shadows toward the viewer');
  const night = K.live({ sky: sky('2026-06-29T23:30Z') }, { heading: 180 });
  assert.equal(night.tod, 'night'); assert.ok(night.lamps && night.windows, 'lamps and windows lit after dark');
  assert.ok(night.moon.show && night.moon.illum > .95, 'the full moon shows');
  assert.ok(night.stars > 0 && night.stars < 1, 'stars, fewer under a full moon');
  const moonless = K.live({ sky: sky('2026-11-10T00:30Z') }, { heading: 180 });
  assert.ok(moonless.stars > night.stars, 'more stars on a moonless night');
  const day = K.live({ sky: sky('2026-07-08T12:00Z') }, { heading: 180 });
  assert.ok(!day.lamps && day.stars === 0 && day.shadeOp < .05);
  // no live sky: the authored moment, deterministic
  const a = K.live({}, { at: 'night', season: 'winter' }), b = K.live({}, { at: 'night', season: 'winter' });
  assert.equal(a.live, false); assert.equal(a.tod, 'night'); assert.equal(a.ms, b.ms);
  assert.equal(K.live({}, { at: 'golden', season: 'summer' }).phase, 'golden');
  assert.equal(K.live({}, { at: 'day' }).tod, 'day');
  // weather: overcast hides the sun and greys the light; rain falls; wind scales the sway
  const wet = Object.assign({}, noon, { wx: { cond: 'rain', wind: 40 } }), L = K.live({ sky: wet }, { heading: 180 });
  assert.ok(L.rain && L.cover > .85 && !L.sun.show && L.wind > 1.4);
  assert.match(K.weather(L), /x-uknsnow/, 'rain streaks fall');
});

test('K.tone grades the land for the light; K.keep and the sky stay as drawn', () => {
  const night = K.live({}, { at: 'night', season: 'summer' }), day = K.live({}, { at: 'noon', season: 'summer' });
  const land = '<path fill="#88aa44" d="M0 0h9v9z"/><g fill="#ffffff" color="#c0c0c0" stroke="#336699"></g><stop stop-color="#ffcc00"/>';
  const n = K.tone(night, land), lum = h => { const v = parseInt(h.slice(1), 16); return (v >> 16) * .3 + (v >> 8 & 255) * .59 + (v & 255) * .11; };
  const before = [...land.matchAll(/#[0-9a-f]{6}/g)].map(m => m[0]), after = [...n.matchAll(/#[0-9a-f]{6}/g)].map(m => m[0]);
  assert.equal(after.length, before.length);
  after.forEach((c, i) => assert.ok(lum(c) < lum(before[i]) * .6, `${before[i]} darkens at night (${c})`));
  const d = K.tone(day, land), dd = [...d.matchAll(/#[0-9a-f]{6}/g)].map(m => m[0]);
  dd.forEach((c, i) => assert.ok(Math.abs(lum(c) - lum(before[i])) < 8, `a high sun leaves ${before[i]} nearly as drawn (${c})`));
  const kept = K.tone(night, 'x' + K.keep('<circle fill="#ffe2a0"/>'));
  assert.ok(kept.includes('fill="#ffe2a0"'), 'kept markup is not graded');
  const html = K.scene({ size: 'fill' }, () => { const L = K.live({}, { at: 'night' }); return K.tone(L, K.tree('oak', 400, 700, .5, { season: 'summer', seed: 3 })) + K.lamp(L, 10, 10); });
  assert.ok(!/[\u0001\u0002]/.test(html), 'keep marks are removed');
  assert.ok(!html.includes('fill="#ffffff"'), 'symbols in the defs are graded too');
  assert.ok(html.includes('#ffe2a0'), 'the lamp glows');
});

test('kit markup: balanced, transform/opacity motion only, a rich demo inside its budget', async () => {
  const { demoSceneHtml } = await import('../tools/uk-kit-demo.mjs');
  const { loadAnim } = await import('../tools/uk-scene-lib.mjs');
  const R = loadAnim();
  for (const [season, iso] of [['summer', '2026-07-08T14:00Z'], ['winter', '2027-01-20T23:00Z'], ['autumn', null]]) {
    const s = iso ? R.almSceneLight(Date.parse(iso), lat, lon, zone) : null;
    const full = demoSceneHtml(R, { season, sky: s }), tile = demoSceneHtml(R, { season, sky: s, size: 'lg' });
    const stack = [];
    for (const m of full.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) { if (m[4]) continue; if (!m[1]) stack.push(m[2]); else assert.equal(stack.pop(), m[2]); }
    assert.equal(stack.length, 0);
    assert.ok(!/NaN|undefined|\[object /.test(full), 'no NaN / undefined');
    assert.ok(full.length <= R.animItemMaxBytes({ full: true, rich: true }, 'fill'), `${season}: ${full.length} bytes full screen`);
    assert.ok(tile.length <= R.animItemMaxBytes({ full: true, rich: true }, 'lg'), `${season}: ${tile.length} bytes in a tile`);
    assert.ok(tile.length < full.length * .6, 'tiles draw less');
    const groups = (full.match(/class="x-ukn/g) || []).length;
    assert.ok(groups > 80 && groups < 400, `${groups} animated groups`);
  }
  const css = K.css;
  for (const m of css.matchAll(/@keyframes [\w-]+ \{([^']*?)\}\s*\}/g)) assert.ok(!/(?:^|[;{\s])(?!transform|opacity)[a-z-]+\s*:/.test(m[1].replace(/\d+%|from|to|,/g, '').replace(/[{}]/g, ';')), 'keyframes animate transform and opacity only');
  assert.ok(/@keyframes ap-ukngust \{[^']*?var\(--wk/.test(css), 'the wind scales the sway');
});

test('the registry hands live scenes the clock, a fallback place and the weather', () => {
  // eslint-disable-next-line no-new-func
  const run = new Function(`${src('71-anim-almanac.js')}\n${src('71-anim-library.js')}\n${src('71-anim-registry.js')}
    const Clock = { now: () => Date.parse('2026-07-08T12:00:00Z'), zone: () => 'UTC' };
    let where = { lat: null, lon: null, tz: 'UTC' };
    function animCtx() { return where; }
    const _bf = { weather: { ok: true, current: { cond: 'rain', wind: 20, temp: 14 }, units: { wind: 'mp/h' } } };
    let seen = null;
    animRegisterPack({ id: 'x-live', name: 'Live', items: [{ id: 'a', slot: 'opening', label: 'A', tags: [], mood: 'calm', intensity: 'subtle', full: true, rich: true, liveSky: { lat: 51.34, lon: -0.83 },
      svg: o => { seen = o.sky || null; return '<rect width="9" height="9"/>'; }, reduced: 'static' }] });
    const out = [];
    animItemHtml('x-live/a', {}); out.push(seen);
    where = { lat: 40, lon: -74, tz: 'UTC' }; animItemHtml('x-live/a', {}); out.push(seen);
    animItemHtml('x-live/a', { lighting: false }); out.push(seen);
    return out;`);
  const [fallback, located, off] = run();
  assert.ok(fallback && fallback.lat === 51.34 && fallback.ms === Date.parse('2026-07-08T12:00:00Z'), 'no location: the scene\'s own place with the clock');
  assert.equal(fallback.wx.cond, 'rain'); assert.ok(Math.abs(fallback.wx.wind - 32.18) < .1, 'mph becomes km/h');
  assert.equal(located.lat, 40, 'a set location wins');
  assert.equal(off, null, 'lighting: false keeps the authored scene');
});
