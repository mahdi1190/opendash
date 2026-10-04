// Large galleries and local town rotations; synthetic preferences and locations only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = name => readFileSync(new URL('../src/app/' + name, import.meta.url), 'utf8');
const load = () => new Function(src('71-anim-registry.js') + '\n' + src('78-anim-gallery.js') + '\nreturn {animGalleryPage,animRegisterPack,animDailyPick};')();

test('every one of 1,044 gallery scenes is reachable exactly once, with bounded pages', () => {
  const R = load(), items = Array.from({ length: 1044 }, (_, i) => ({ id: i }));
  const seen = [], pages = R.animGalleryPage(items, 0).pages;
  for (let n = 0; n < pages; n++) {
    const page = R.animGalleryPage(items, n);
    assert.ok(page.items.length <= 80);
    assert.equal(page.start, seen.length);
    seen.push(...page.items);
  }
  assert.deepEqual(seen, items);
  assert.equal(R.animGalleryPage(items, 1000).page, pages - 1);
  assert.equal(R.animGalleryPage(items, -8).page, 0);
  assert.deepEqual(R.animGalleryPage([], 9), { page: 0, pages: 1, start: 0, end: 0, items: [] });
});

test('town rotations fall back within the county and retain pins, blocks and national events', () => {
  const R = load();
  const item = (id, town, extra = {}) => Object.assign({ id, slot: 'opening', label: id, tags: ['uk'], mood: 'calm', intensity: 'subtle', theme: 'any', season: 'any', region: ['GB-ENG'], county: 'hampshire', ukTown: town,
    reduced: 'static', svg: () => '<circle cx="32" cy="32" r="8"/>', when: (day, ctx) => ctx.county === 'hampshire' }, extra);
  assert.equal(R.animRegisterPack({ id: 'local-demo', name: 'Synthetic local scenes', items: [item('winchester', 'Winchester'), item('lymington', 'Lymington'), item('county', '')] }).ok, true);
  const ctx = { county: 'hampshire', ukTown: 'Lymington', level: 'standard' };
  for (let d = 1; d <= 28; d++) assert.equal(R.animDailyPick('opening', `2026-10-${String(d).padStart(2, '0')}`, {}, ctx).id, 'lymington');
  assert.equal(R.animDailyPick('opening', '2026-10-03', { pin: { opening: 'local-demo/winchester' } }, ctx).id, 'winchester');
  assert.notEqual(R.animDailyPick('opening', '2026-10-03', { block: ['local-demo/lymington'] }, ctx).id, 'lymington');
  assert.ok(R.animDailyPick('opening', '2026-10-03', {}, { county: 'hampshire', ukTown: 'Undrawn town' }));
  assert.equal(R.animDailyPick('opening', '2026-10-03', { packsOff: ['local-demo'] }, ctx), null);
  assert.equal(R.animDailyPick('opening', '2026-10-03', {}, { county: 'kent', ukTown: 'Lymington' }), null);
  R.animRegisterPack({ id: 'national-demo', name: 'Synthetic national event', items: [item('holiday', '', { county: undefined, priority: 3, when: day => day === '2026-12-25' })] });
  assert.equal(R.animDailyPick('opening', '2026-12-25', {}, ctx).ref, 'national-demo/holiday');
  assert.equal(R.animDailyPick('opening', '2026-12-25', { block: ['national-demo/holiday'] }, ctx).id, 'lymington');
});
