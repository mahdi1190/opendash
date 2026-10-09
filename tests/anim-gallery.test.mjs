import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const reg = loadRegistry(ROOT, { extraFiles: [join(ROOT, 'src/app/77-anim-gallery-logic.js')] });
const get = reg.R.get;
const items = reg.items().map(e => e.item);
const info = get('animGalleryInfo'), filter = get('animGalleryFilter');
const catalogue = get('animGalleryCatalogue'), places = get('animGalleryPlaces');
const preview = get('animGalleryPreviewOptions');
const common = items.filter(i => i.ukPlace === 'yateley-common');   // the composed Yateley Common views (uk-area-yateley)
const upgraded = items.filter(i => i.legacySvg);                    // composed scenes that keep their old hand-drawn art

test('location search spans UK counties/towns, US states/places, Asia countries/places, pack names and tags', () => {
  assert.equal(filter(items, { q: 'YATELEY, Hampshire common' }).length, common.length);
  assert.ok(filter(items, { q: 'Yateley birch' }).some(i => i.ukPlace === 'yateley-common'));
  assert.ok(filter(items, { q: 'Massachusetts boston' }).some(i => i.usPlace === 'boston'));
  assert.ok(filter(items, { q: 'Japan Fuji' }).some(i => i.asiaCc === 'JP'));
  assert.ok(filter(items, { q: 'texas dallas bridge' }).some(i => i.txTown === 'dallas'));
  const result = filter(items, { q: 'uk-area-yateley/hampshire-yateley-common-1-spring' });
  assert.ok(result.some(i => i.ref === 'uk-area-yateley/hampshire-yateley-common-1-spring'));
  assert.equal(filter(items, { q: 'yateley nonexistentword' }).length, 0);
  const synthetic = [{ ref: 'pack/one', label: "Xi’an Café", tags: ['São-Paulo'], pack: 'pack', slot: 'opening' }];
  assert.equal(filter(synthetic, { q: 'xian cafe sao paulo' }).length, 1);
});

test('catalogue exposes retained old art without mutating saved registry identities or mislabelling drafts', () => {
  const original = upgraded[0], before = Object.keys(original);
  const out = catalogue([original]), old = out[1];
  assert.equal(out[0], original);
  assert.equal(out.length, 2);
  assert.equal(info(original).technique, 'new');
  assert.equal(info(old).technique, 'old');
  assert.equal(old.ref, original.ref + '~legacy');
  assert.equal(info(old).baseRef, original.ref);
  assert.equal(old.svg, original.legacySvg);
  assert.equal(old.reduced, 'static');
  assert.equal(old.scene, undefined);
  assert.deepEqual(Object.keys(original), before);
  const draft = items.find(i => i.upgrade && i.upgrade.state === 'draft');
  assert.ok(draft);
  assert.equal(info(draft).technique, 'old');
  assert.equal(catalogue([draft]).length, 1, 'a draft is not a live new renderer');
  assert.equal(filter(out, { technique: 'old' })[0], old);
});

test('a location family collects its views and four seasons, treating v1 as a view', () => {
  assert.ok(common.length >= 16 && common.length % 4 === 0);
  const group = places(catalogue(common))[0];
  assert.equal(group.label, 'Yateley Common, Hampshire');
  assert.equal(group.count, common.length, 'composed from the start: no retained old art');
  for (const v of ['wide', 'close', 'detail', 'evening']) assert.ok(group.views.includes(v), v);
  assert.deepEqual(new Set(group.seasons), new Set(['spring', 'summer', 'autumn', 'winter']));
  assert.deepEqual(new Set(group.techniques), new Set(['new']));
  const summer = common.find(i => i.ukSeason === 'summer' && i.ukView === 'wide');
  assert.equal(info(summer).variantLabel, 'Wide view · Summer');
  assert.doesNotMatch(info(summer).variantLabel, /version|revision|v1/i);
  assert.equal(filter(catalogue(common), { place: group.key, season: 'winter' }).length, common.length / 4);
});

test('combining search, pack, slot, technique and season never consults daily eligibility', () => {
  const all = catalogue(items);
  const selected = filter(all, { q: 'yateley common', pack: 'uk-area-yateley', slot: 'opening', technique: 'new', season: 'winter' });
  assert.equal(selected.length, common.length / 4);
  assert.ok(selected.every(i => i.ukSeason === 'winter' && i.composed));
  assert.equal(filter(all, { q: 'yateley', pack: 'texas' }).length, 0);
  assert.ok(filter(all, { q: 'boston', season: 'winter' }).length, 'all-season art remains visible with a season filter');
});

test('each preview uses deterministic solar light at the art location and retains the item season', () => {
  const source = common.find(i => i.ukSeason === 'winter');
  const legacy = get('animGalleryLegacyItem'), up = upgraded[0], upOld = legacy(up);   // the Yateley views are composed from the start: an upgraded scene shows both techniques
  assert.deepEqual(preview(source, 'live'), { season: 'winter' });
  for (const time of ['dawn', 'day', 'dusk', 'night']) {
    const options = preview(source, time);
    assert.deepEqual(options, preview(source, time));
    assert.equal(options.tod, time);
    assert.equal(options.sky.tod, time, 'the fixed solar moment and its labelled phase agree');
    assert.equal(options.sky.lat, source.liveSky.lat);
    assert.equal(options.sky.lon, source.liveSky.lon);
    assert.equal(options.season, 'winter');
    assert.equal(options.sky.wx, undefined, 'the preview does not inherit weather at the user location');
    assert.ok(options.sky.ms < Date.UTC(2001, 0, 1));
    assert.deepEqual(preview(upOld, time), preview(up, time), 'both techniques receive identical preview light');
    assert.match(reg.R.animItemHtml(source, { ...options, size: 'lg', renderer: 'svg' }), new RegExp('tod-' + time));
    const attrs = get('sceneHostAttrs')(source, { ...options, size: 'lg' });
    assert.match(attrs, new RegExp('data-sc-sky="' + options.sky.ms + ','));
    assert.match(attrs, /data-sc-season="winter"/);
  }
});
