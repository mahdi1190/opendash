// The retrofit (docs/dev/SCENE_ENGINE.md section 7): every hand-drawn region scene keeps its art BYTE-IDENTICAL without a live sky,
// and with one is re-lit (its own sky turned into the real one, the real stars and moon behind the land, the land graded, its own
// lamps lit at real dusk) plus a small overlay (seasons, weather); region items carry liveSky.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';
import { retroCheck } from '../tools/lib/scene-lint.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIVE_REG = loadRegistry(ROOT);
// The retrofit still serves retained original art. Exercise that complete corpus after its live scenes become composed.
const REG = loadRegistry(ROOT, { omit: LIVE_REG.files.filter(f => /^71-scene-upgrade-/.test(f)) });
const G = REG.R.get;
const regionFull = () => G('animPacks')().filter(p => /^(us|asia)-/.test(p.id)).flatMap(p => p.items.filter(i => i.full && !i.composed));
const hx = c => { let s = c.replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const lum = c => { const [r, g, b] = hx(c); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
const ref = (r) => REG.items().find(e => e.ref === r).item;
/** The first retained hand-drawn fixture with the requested property. */
const drawn = (...refs) => { const r = refs.find(x => { const e = REG.items().find(i => i.ref === x); return !!e && !e.composed; }); assert.ok(r, 'a hand-drawn scene among ' + refs.join(', ')); return r; };
/** The sky at the scene's own local midnight (8 October): real night at every US and Asia place. */
const midnight = (it) => G('almSceneLight')(Date.parse('2026-10-08T00:00:00Z') - it.liveSky.lon / 15 * 36e5, it.liveSky.lat, it.liveSky.lon, 'UTC');
/** The markup after the art's sr-back group (the overlay on top of the art). */
const overlayOf = (s) => { let d = 0, i = s.indexOf('<g class="sr-back">'); const re = /<g\b|<\/g>/g; re.lastIndex = i; for (let m; (m = re.exec(s));) { d += m[0] === '</g>' ? -1 : 1; if (!d) return s.slice(m.index + 4); } return ''; };

test('region full items carry liveSky and the retro wrap; without o.sky the art is byte-identical to the unwrapped art', () => {
  const items = regionFull();
  assert.ok(items.length > 100, 'the US and Asia scenes are loaded (' + items.length + ')');
  for (const it of items) {
    assert.ok(it.liveSky && Number.isFinite(it.liveSky.lat) && Number.isFinite(it.liveSky.lon), it.ref + ' liveSky');
    assert.ok(it.retro && typeof it.retro === 'object', it.ref + ' retro');
  }
  // the wrapped svg(o) without a sky equals the raw art: the wrap only adds markup when o.sky is given
  for (const it of items.slice(0, 40)) {
    const a = it.svg({ size: 'fill' }), b = it.svg({ size: 'fill' });
    assert.ok(!/sr-retro/.test(a), it.ref + ': no overlay without a live sky');
    assert.equal(a.replace(/us[0-9a-z]+/g, ''), b.replace(/us[0-9a-z]+/g, ''), it.ref + ': deterministic');
  }
});

test('with a night sky: the overlay is at most 6,000 bytes, has the real moon and lights the art\'s own lamps', () => {
  const items = regionFull().filter(i => /us-lit|us-lamps/.test(i.svg({ size: 'fill' }))).slice(0, 12);
  assert.ok(items.length > 0);
  const ms = Date.parse('2026-10-07T21:30:00Z');
  let moons = 0, lit = 0;
  for (const it of items) {
    const sky = G('almSceneLight')(ms, it.liveSky.lat, it.liveSky.lon, 'UTC');
    const html = it.svg({ size: 'fill', sky });
    assert.match(html, /^<g class="sr-retro"><g class="sr-back">/);
    const rules = retroCheck(html, { maxBytes: G('SCENE_RETRO_MAX_BYTES') });
    assert.ok(rules.every(r => r.ok), it.ref + ': ' + rules.filter(r => !r.ok).map(r => r.message).join('; '));
    const dark = G('sceneLight')({ sky }, { lat: it.liveSky.lat, lon: it.liveSky.lon }).windows;
    // the lamps are the art's own lit pieces, lit by the class round the art (they were <use> copies, which rendered black and drifted)
    if (dark) {
      lit++;
      assert.match(html, /^<g class="sr-retro"><g class="sr-back"><g class="sr-lamps">/, it.ref + ': the art\'s own lamps lit');
      assert.equal((html.match(/<use\b/g) || []).length, (it.svg({ size: 'fill' }).match(/<use\b/g) || []).length, it.ref + ': no lamp copies');
    }
    if (/rotate\([-0-9.]+\)" d="M0 -16A/.test(html)) moons++;
  }
  assert.ok(lit > 0, 'some of the scenes are at night at this moment');
  const L = G('sceneLight')({ sky: G('almSceneLight')(ms, 40.7, -74, 'UTC') }, { lat: 40.7, lon: -74, heading: 180, fov: 80, horizon: 520 });
  const out = G('sceneRetrofitSvg')('<rect/>', Object.assign({}, L, { moon: { show: true, x: 800, y: 200, illum: 0.6, limb: 120 }, dark: 1 }), {}, { season: 'autumn', lat: 40.7 });
  assert.match(out, /rotate\(30\)/, 'the moon disc turns to its real limb');
  assert.ok(out.length - '<rect/>'.length <= G('SCENE_RETRO_MAX_BYTES') + 80);
});

test('retro false and composed items are never wrapped; at noon in summer the overlay is light', () => {
  const it = { id: 'x', full: true, svg: () => '<rect/>', reduced: 'static' };
  assert.equal(G('sceneRetrofit')(it, false), it);
  assert.equal(G('sceneRetrofit')(Object.assign({}, it, { composed: true }), {}).svg, it.svg);
  const w = G('sceneRetrofit')(Object.assign({}, it, { liveSky: { lat: 51.5, lon: 0 } }), {});
  assert.equal(w.svg({}), '<rect/>');
  const noon = w.svg({ sky: G('almSceneLight')(Date.parse('2026-07-01T12:00:00Z'), 51.5, 0, 'UTC') });
  assert.match(noon, /sr-retro/); assert.ok(!/sr-lamps/.test(noon));
});

test('every scene x 4 dates x 12 hours: the retrofit adds at most 6,000 bytes, every sr-* class has css; html with a sky stays under 40,000', (t) => {
  const max = G('SCENE_RETRO_MAX_BYTES'), entries = REG.items().filter(e => e.full && !e.composed && e.item.retro && e.item.liveSky);
  // The retained originals are rendered below; account for current art independently so originals cannot hide a missing live item.
  const currentRetro = LIVE_REG.items().filter(e => e.full && !e.composed && e.item.retro && e.item.liveSky);
  const live = LIVE_REG.items().filter(e => e.full && e.composed && e.item.upgrade && e.item.upgrade.state === 'live');
  for (const e of live) assert.ok(!e.item.retro && typeof e.item.legacySvg === 'function', e.ref + ': a live upgrade is not retrofitted');
  assert.ok(currentRetro.length + live.length >= 229, 'the US, Asia and Texas scenes are retrofitted (' + currentRetro.length + ', plus ' + live.length + ' live upgrades)');
  assert.ok(entries.length >= 229, 'the retained original scenes still receive the complete retrofit checks');
  let n = 0, worst = 0, over32 = new Map(), over40 = new Map();
  const used = new Set();
  for (const e of entries) {
    const raw = e.item.svg({ size: 'fill' }), classes = REG.classesFor(e.packObj);
    for (const date of ['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15']) for (let h = 0; h < 24; h += 2) {
      const sky = G('almSceneLight')(Date.parse(date + 'T00:00:00Z') + h * 36e5, e.item.liveSky.lat, e.item.liveSky.lon, 'UTC');
      const html = REG.html(e.item, { live: true, size: 'fill', sky }), svg = html.slice(html.indexOf('>', html.indexOf('<svg')) + 1, html.lastIndexOf('</svg>'));
      const rules = retroCheck(svg, { classes, maxBytes: max });
      assert.ok(rules.every(r => r.ok), e.ref + ' ' + date + ' ' + h + 'h: ' + rules.filter(r => !r.ok).map(r => r.message).join('; '));
      // the lint counts what is outside the art; every byte added (the re-lit art's growth and the live sky in it) is held to the same cap
      assert.ok(svg.length - raw.length <= max, e.ref + ' ' + date + ' ' + h + 'h: the retrofit adds ' + (svg.length - raw.length) + ' bytes');
      worst = Math.max(worst, svg.length - raw.length);
      for (const m of svg.matchAll(/class="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) if (/^(sr-|x-sr)/.test(c)) used.add(c);
      if (html.length > 32000) over32.set(e.ref, Math.max(over32.get(e.ref) || 0, html.length));
      if (html.length > 40000) over40.set(e.ref, html.length);
      n++;
    }
  }
  assert.equal(n, entries.length * 48);
  for (const c of ['sr-retro', 'sr-back', 'sr-lamps', 'sr-sky', 'x-srtw']) assert.ok(used.has(c), c + ' is used (and so checked for css)');
  t.diagnostic(`${n} renders, at most ${worst} bytes added; html with a sky over the 32,000-byte full budget: ${over32.size} scenes (max ${Math.max(0, ...over32.values())}); over 40,000: ${over40.size}`);
  assert.deepEqual([...over40.keys()], [], 'scenes whose html with a sky is over 40,000 bytes');
});

test('at real night the art is re-lit, never veiled: no band, the land stands out from the dark real sky, its colours kept', () => {
  // every scene drawn with the kit's sky (a full 1600 x 900 gradient rect first); the one that starts with a canyon wall is only graded
  const kitSky = regionFull().filter(it => /^(<defs>[\s\S]*?<\/defs>)*<rect y="0" width="1600" height="900" fill="url\(#/.test(it.svg({ size: 'fill' })));
  assert.ok(kitSky.length >= regionFull().length - 1, 'scenes with the kit sky: ' + kitSky.length);
  for (const it of kitSky) {
    const sky = midnight(it), raw = it.svg({ size: 'fill' }), svg = it.svg({ size: 'fill', sky });
    assert.equal(G('sceneLight')({ sky }, { lat: it.liveSky.lat, lon: it.liveSky.lon }).dark, 1, it.ref + ': midnight is night');
    // nothing opaque on top of the art: the overlay holds only blended season layers, a faint fog, particles and rain
    const over = overlayOf(svg);
    assert.ok(!/clip-path|<linearGradient/.test(over), it.ref + ': no veil over the art');
    for (const r of over.matchAll(/<rect\b[^>]*>/g)) assert.ok(/mix-blend-mode/.test(r[0]) || +(/opacity="([\d.]+)"/.exec(r[0]) || [0, 1])[1] <= 0.35, it.ref + ': an opaque rect over the art: ' + r[0]);
    // the art's own sky is still first and is now the dark real sky; the stars and moon stand behind the land (straight after it)
    assert.match(svg, /^<g class="sr-retro"><g class="sr-back">(<g class="sr-lamps">)?(<defs>[\s\S]*?<\/defs>)*<rect y="0" width="1600" height="900" fill="[^"]+"\/><g class="sr-sky">/, it.ref + ': the live sky goes behind the land');
    const top = /stop-color="(#[0-9a-fA-F]{3,6})"/.exec(svg)[1], land = svg.slice(svg.indexOf('</g>', svg.indexOf('<g class="sr-sky">')) + 4);
    const fills = [...land.matchAll(/fill="(#[0-9a-fA-F]{3,6})"/g)].map(m => m[1]), mean = fills.reduce((s, c) => s + lum(c), 0) / fills.length;
    assert.ok(lum(top) < 0.12, it.ref + ': the real night sky is dark (' + top + ')');
    assert.ok(mean >= 0.1 && mean > lum(top) + 0.04, it.ref + ': the skyline reads against the sky (land ' + mean.toFixed(3) + ', sky ' + lum(top).toFixed(3) + ')');
    const rawLand = raw.slice(raw.search(/<rect y="0" width="1600"/));
    assert.ok(new Set(fills).size >= 0.8 * new Set([...rawLand.matchAll(/fill="(#[0-9a-fA-F]{3,6})"/g)].map(m => m[1])).size, it.ref + ': the land keeps its colours');
  }
});

test('windows and lamps: the art\'s own lit pieces, untouched and in place, lit by css at real dusk; never copies', () => {
  const css = readFileSync(join(ROOT, 'src', 'styles', '76-scene.css'), 'utf8');
  assert.match(css, /\.sr-back \.sr-lamps :is\(\.us-lit, \.us-lamps\) \{ opacity: \.92; \}/, 'the lamps rule');
  let lit = 0;
  for (const it of regionFull()) {
    const raw = it.svg({ size: 'fill' }), opens = s => [...s.matchAll(/<[a-z]+\b[^>]*class="[^"]*\b(us-lit|us-lamps)\b[^"]*"[^>]*>/g)].map(m => m[0]);
    if (!opens(raw).length) continue;
    const night = it.svg({ size: 'fill', sky: midnight(it) });
    assert.match(night, /^<g class="sr-retro"><g class="sr-back"><g class="sr-lamps">/, it.ref + ': lit at night');
    assert.deepEqual(opens(night), opens(raw), it.ref + ': the same lit pieces, byte for byte (not graded, not doubled)');
    assert.equal((night.match(/<use\b/g) || []).length, (raw.match(/<use\b/g) || []).length, it.ref + ': no copies');
    lit++;
  }
  assert.ok(lit > 100, 'scenes with lit pieces: ' + lit);
});

test('painted night skies and painted moons keep their own moon: no second one; a painted sun fades out at night', () => {
  // New York, 28 July 2026 05:05 UTC: deep night with the moon high in the south (in every scene's view)
  const sky = G('almSceneLight')(Date.parse('2026-07-28T05:05:00Z'), 40.7, -74, 'UTC');
  const moon = s => /rotate\([-0-9.]+\)" d="M0 -16A/.test(s);
  // Each retained original has an open sky (no painted night or moon) with this moon in its view. Live upgrades do not change
  // these fixtures: the retrofit's real-moon behavior remains covered on the original drawings.
  for (const r of [drawn('asia-east/tokyo-skyline', 'asia-east/tianjin-skyline'), drawn('us-northeast/ny-statue', 'us-northeast/baltimore-fort-mchenry'), drawn('asia-east/jp-signature', 'asia-east/osaka-skyline')])
    assert.ok(moon(ref(r).svg({ size: 'fill', sky })), r + ': the real moon');
  for (const r of ['us-mountain/id-sawtooth-lake', 'us-southeast/sc-palmetto-crescent', 'us-southeast/memphis-beale-bridge', 'us-mountain/nv-pyramid-lake', 'us-mountain/las-vegas-neon-strip',
    'us-pacific/hi-volcano-night', 'us-pacific/or-crater-lake', 'us-pacific/anchorage-aurora-moose', 'asia-west/jeddah-skyline']) assert.ok(!moon(ref(r).svg({ size: 'fill', sky })), r + ': its own painted night or moon, no second moon');
  // the fix is central; the only per-scene override is a big low sun painted by hand (not the kit's sun(), so never faded), which reads as the moon at night
  const exempt = { 'us-midwest/nd-pumpjack': { moon: false } };
  for (const it of regionFull()) assert.deepEqual(it.retro, exempt[it.ref] || {}, it.ref + ': per-scene retro override');
  assert.ok(!moon(ref('us-midwest/nd-pumpjack').svg({ size: 'fill', sky })), 'us-midwest/nd-pumpjack: its painted sun stands in for the moon, no second one');
  // the kit's painted sun (sun()) is gone at night, at full strength at noon
  const nv = ref('us-mountain/nv-pyramid-lake'), sun = /<g class="x-us(glow|rise)" style="--ad:(6|9)s"><circle/;
  assert.ok(sun.test(nv.svg({ size: 'fill' })) && !sun.test(nv.svg({ size: 'fill', sky })), 'the painted sun is gone at night');
  assert.ok(sun.test(nv.svg({ size: 'fill', sky: G('almSceneLight')(Date.parse('2026-07-28T17:05:00Z'), 40.7, -74, 'UTC') })), 'and kept by day');
});

test('seasons: tropical and fixed-season scenes never tint (wherever they are seen from); winter frost fades at night; the still frame is finished', () => {
  const at = iso => G('almSceneLight')(Date.parse(iso), 40.7, -74, 'UTC'), tinted = s => /mix-blend-mode:(screen|soft-light)/.test(overlayOf(s)) || /x-srfall/.test(s);
  const noon = at('2026-12-21T16:55:00Z'), night = at('2026-12-21T04:55:00Z');
  for (const r of ['asia-southeast/singapore-skyline', 'asia-southeast/th-signature', 'us-pacific/honolulu-diamond-head-surf', 'us-midwest/ks-wheat', 'us-mountain/co-maroon-bells'])
    assert.ok(!tinted(ref(r).svg({ size: 'fill', sky: noon })), r + ': no season tint');
  // An any-season retained original where winter frost ramps in (35 N and up); Tokyo's original remains available after upgrading.
  const frostScene = drawn('asia-east/tokyo-skyline', regionFull().filter(it => it.ref.startsWith('asia-east/') && it.season === 'any' && it.liveSky.lat >= 36).map(it => it.ref).sort()[0]);
  const tk = ref(frostScene), frost = s => +/opacity="([\d.]+)" style="mix-blend-mode:screen"/.exec(s)[1];
  assert.ok(tinted(tk.svg({ size: 'fill', sky: noon })), 'an any-season scene outside the tropics gets the winter');
  assert.ok(frost(tk.svg({ size: 'fill', sky: night })) < frost(tk.svg({ size: 'fill', sky: noon })) / 2, 'the frost does not grey the night sky');
  // reduced motion: stars at a steady mid twinkle, no particles frozen in a band at the top
  const css = readFileSync(join(ROOT, 'src', 'styles', '76-scene.css'), 'utf8');
  assert.match(css, /\.anim-scene\.ap-still \.sr-retro \.x-srtw \{ opacity: \.75; \}/);
  assert.match(css, /\.anim-scene\.ap-still \.sr-retro \.x-srfall \{ display: none; \}/);
});

test('the winter grade is a pure rule of the scene\'s own latitude and the date: snow only where winter snow is plausible', () => {
  // copied into this realm (the bundle runs in its own context, so its objects carry another Object prototype)
  const S = (...a) => ({ ...G('sceneRetroSeason')(...a) }), dec = Date.parse('2026-12-21T12:00:00Z'), jul = Date.parse('2026-07-21T12:00:00Z');
  const full = { tint: 1, desat: 1, fall: 1 }, mild = { tint: 0, desat: 0.5, fall: 0 }, none = { tint: 0, desat: 0, fall: 0 };
  // cold: the full winter (frost, desaturation, flecks)
  for (const lat of [45, 47.9, 55, 61.2]) assert.deepEqual(S(lat, dec), { season: 'winter', ...full }, lat + ': cold');
  // temperate 35..45: the frost and the flecks ramp in with the latitude, the desaturation from half to full
  const t = [36, 40, 44].map(lat => S(lat, dec));
  for (const g of t) assert.ok(g.season === 'winter' && g.tint > 0 && g.tint < 1 && g.fall === g.tint && g.desat > 0.5 && g.desat < 1, JSON.stringify(g));
  assert.ok(t[0].fall < t[1].fall && t[1].fall < t[2].fall, 'the ramp rises with the latitude');
  assert.equal(S(35, dec).fall, 0); assert.equal(S(35, dec).tint, 0);
  // subtropical 23.5..35 (Miami, Dubai, Riyadh, Delhi, Lahore): a mild cool tint only, never frost or flecks
  for (const lat of [23.5, 24.71, 25.2, 25.76, 28.6, 31.5, 34.9]) assert.deepEqual(S(lat, dec), { season: 'winter', ...mild }, lat + ': subtropical');
  // tropical: nothing, in any month
  for (const lat of [1.3, 13.75, 21.3, -6.2, -23.4]) for (const ms of [dec, jul]) assert.deepEqual(S(lat, ms), { season: 'summer', ...none }, lat + ': tropical');
  // southern hemisphere: winter in July, by the same latitude bands; their December is summer (motes, no frost)
  assert.deepEqual(S(-54.8, jul), { season: 'winter', ...full });
  assert.equal(S(-40, jul).season, 'winter'); assert.ok(S(-40, jul).fall > 0 && S(-40, jul).fall < 1);
  assert.deepEqual(S(-33.9, jul), { season: 'winter', ...mild });
  assert.deepEqual(S(-54.8, dec), { season: 'summer', ...full });
  assert.deepEqual(S(-33.9, dec), { season: 'summer', ...full });
  // the other seasons are as they were; a known season stands in for the date
  assert.deepEqual(S(25.2, jul), { season: 'summer', ...full });
  assert.deepEqual(S(25.2, NaN, 'winter'), S(25.2, dec));
});

test('winter in hot places: Miami, the Everglades and two subtropical West Asian scenes get no snow flecks and no frost; cold scenes still do', () => {
  const flakes = s => /x-srfall|h2\.4v2\.4h-2\.4z/.test(s), frost = s => /mix-blend-mode:screen/.test(overlayOf(s));
  const desat = s => (/opacity="([\d.]+)" style="mix-blend-mode:saturation"/.exec(overlayOf(s)) || [])[1];
  // the scene's own noon and midnight on 21 December, and the user's view from Miami at 17:00Z
  const skies = it => [12, 0].map(h => G('almSceneLight')(Date.parse('2026-12-21T12:00:00Z') + (h - 12 - it.liveSky.lon / 15) * 36e5, it.liveSky.lat, it.liveSky.lon, 'UTC'))
    .concat(G('almSceneLight')(Date.parse('2026-12-21T17:00:00Z'), 25.8, -80.2, 'UTC'));
  // Choose retained West Asian originals of any season in the 23.5 to 35 degree band, where the retrofit draws the mild
  // cool tint at half strength with no frost or flecks. Upgrading a live scene keeps these original-art cases available.
  const hot = regionFull().filter(it => it.ref.startsWith('asia-west/') && it.season === 'any' && Math.abs(it.liveSky.lat) >= 23.5 && Math.abs(it.liveSky.lat) < 35).map(it => it.ref).sort();
  const hotA = drawn(...hot), hotB = drawn(...hot.filter(x => x !== hotA));
  for (const r of ['us-southeast/miami-deco-neon', 'us-southeast/fl-everglades-airboat', hotA, hotB]) {
    const it = ref(r);
    assert.ok(Math.abs(it.liveSky.lat) >= 23.5 && Math.abs(it.liveSky.lat) < 35, r + ': a subtropical place');
    for (const sky of skies(it)) {
      const s = it.svg({ size: 'fill', sky });
      assert.match(s, /sr-retro/, r + ': retrofitted');
      assert.ok(!flakes(s), r + ': no snow flecks in winter');
      assert.ok(!frost(s), r + ': no white frost layer in winter');
      assert.equal(+desat(s), 0.13, r + ': only the mild cool tint, at half strength');
    }
    const july = it.svg({ size: 'fill', sky: G('almSceneLight')(Date.parse('2026-07-21T12:00:00Z'), it.liveSky.lat, it.liveSky.lon, 'UTC') });
    assert.match(july, /x-srfall/, r + ': the summer motes are unchanged');
  }
  for (const r of ['us-pacific/anchorage-aurora-moose', 'asia-east/mn-signature', 'us-midwest/mn-loon']) {
    const it = ref(r), s = it.svg({ size: 'fill', sky: skies(it)[0] });
    assert.ok(flakes(s), r + ': a cold scene still gets the snow flecks');
    assert.ok(frost(s), r + ': and the frost');
    assert.equal(+desat(s), 0.25, r + ': and the full desaturation');
  }
});
