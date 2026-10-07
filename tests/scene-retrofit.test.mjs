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
const REG = loadRegistry(ROOT);
const G = REG.R.get;
const regionFull = () => G('animPacks')().filter(p => /^(us|asia)-/.test(p.id)).flatMap(p => p.items.filter(i => i.full && !i.composed));
const hx = c => { let s = c.replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const lum = c => { const [r, g, b] = hx(c); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
const ref = (r) => REG.items().find(e => e.ref === r).item;
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
  assert.ok(entries.length >= 229, 'the US, Asia and Texas scenes are retrofitted (' + entries.length + ')');
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
  for (const r of ['asia-east/tokyo-skyline', 'us-northeast/ny-statue', 'asia-east/jp-signature']) assert.ok(moon(ref(r).svg({ size: 'fill', sky })), r + ': the real moon');
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
  const tk = ref('asia-east/tokyo-skyline'), frost = s => +/opacity="([\d.]+)" style="mix-blend-mode:screen"/.exec(s)[1];
  assert.ok(tinted(tk.svg({ size: 'fill', sky: noon })), 'an any-season scene outside the tropics gets the winter');
  assert.ok(frost(tk.svg({ size: 'fill', sky: night })) < frost(tk.svg({ size: 'fill', sky: noon })) / 2, 'the frost does not grey the night sky');
  // reduced motion: stars at a steady mid twinkle, no particles frozen in a band at the top
  const css = readFileSync(join(ROOT, 'src', 'styles', '76-scene.css'), 'utf8');
  assert.match(css, /\.anim-scene\.ap-still \.sr-retro \.x-srtw \{ opacity: \.75; \}/);
  assert.match(css, /\.anim-scene\.ap-still \.sr-retro \.x-srfall \{ display: none; \}/);
});
