// The retrofit (docs/dev/SCENE_ENGINE.md section 7): every hand-drawn region scene keeps its art BYTE-IDENTICAL without a live sky,
// and with one gains the small overlay (live sky veil, the real moon, lamps above the grade, seasons, weather); region items carry liveSky.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';
import { retroCheck } from '../tools/lib/scene-lint.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = loadRegistry(ROOT);
const G = REG.R.get;
const regionFull = () => G('animPacks')().filter(p => /^(us|asia)-/.test(p.id)).flatMap(p => p.items.filter(i => i.full && !i.composed));

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

test('with a night sky: the overlay is at most 6,000 bytes, has the real moon and copies the lamps above the grade', () => {
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
    if (dark) { lit++; assert.match(html, /class="sr-lamps"><use href="#/, it.ref + ': lamps copied above the grade'); }
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
