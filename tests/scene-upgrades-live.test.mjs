// Every LIVE upgrade (docs/dev/SCENE_ENGINE.md 16.5): a hand-drawn region scene replaced in the app by a composed scene.
// For each upgrade registered with state: 'live', the composed scene the app shows passes the composed data, bar, variety
// and care rules (perf needs Chrome: `node tools/anim-pack.mjs scene lint <ref> --upgrades --perf`), places the
// landmarks it names, and the live item keeps the legacy item's identity: the same id, key, place fields, original label, site,
// tags and `when` as the item built WITHOUT any upgrade file. Passes with no live upgrade at all (drafts are not checked
// here: they may fail anything, 16.5).
// An explicit new-subject label is checked separately; legacyLabel preserves the original artwork's caption.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';
import { engineOf, lintScene } from '../tools/lib/scene-lint.mjs';
import { regionOf, regionKeyOf } from '../tools/lib/scene-upgrade.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TH = JSON.parse(readFileSync(join(ROOT, 'tools', 'anim-quality.json'), 'utf8'));
const REG = loadRegistry(ROOT);
const E = engineOf(REG);
const skip = E.ready ? false : 'the scene engine is not in this checkout';
const UPGRADES = REG.R.get('_ANIM_REGION_UPGRADES') || {};
const LIVE = [];
for (const [region, byKey] of Object.entries(UPGRADES)) for (const [key, up] of Object.entries(byKey || {})) if (up && up.state === 'live') LIVE.push({ region, key, up });
// the same corpus without any upgrade file: the legacy items the live ones must match (loaded only when there is a live upgrade)
const LEGACY = LIVE.length ? loadRegistry(ROOT, { omit: REG.files.filter(f => /^71-scene-upgrade-/.test(f)) }) : null;

// Texas is the documented non-region pack (16.2, last bullet): its full city
// scenes use the same upgrade registry, with the pack id and place:<txTown>.
// Keep this ownership mapping local: the region tools still describe regions.
const ownerOf = (reg, pack) => regionOf(reg, pack) || (pack === 'texas'
  ? { id: 'texas', fields: { place: 'txTown', kind: 'texasKind' } }
  : null);
const keyOf = (owner, item) => owner.id === 'texas'
  ? (item.full && item.texasKind === 'scene' ? 'place:' + (item.txTown || item.id) : null)
  : regionKeyOf(owner, item);

/** The full items of a registry that region `regionId` builds for scene key `key`. */
const itemsOf = (reg, regionId, key) => reg.items().filter(e => {
  if (!e.full) return false;
  const r = ownerOf(reg, e.pack);
  return !!r && r.id === regionId && keyOf(r, e.item) === key;
});
/** The identity an item keeps through an upgrade (16.2): its id and ref, the region's place fields, caption, tags, rotation. */
const identity = (reg, e) => {
  const it = e.item, F = ownerOf(reg, e.pack).fields || {}, out = { ref: e.ref };
  for (const k of ['id', 'label', 'site', 'tags', 'priority', 'slot', 'region', 'country', 'colour', 'mood', 'season', ...Object.values(F)]) out[k] = it[k];
  if (it.legacyLabel !== undefined) out.label = it.legacyLabel;
  out.when = typeof it.when === 'function' ? String(it.when) : it.when;
  return out;
};

test('live upgrades: every live item in the registry belongs to a registered live upgrade (passes with none)', { skip }, () => {
  const liveItems = REG.items().filter(e => e.item.upgrade && e.item.upgrade.state === 'live');
  for (const e of liveItems) {
    const r = ownerOf(REG, e.pack);
    assert.ok(r, e.ref + ' is a region item or the documented Texas pack');
    assert.ok(LIVE.some(l => l.region === r.id && l.key === keyOf(r, e.item)), e.ref + ' has a live upgrade registered for its key');
    assert.equal(e.composed, true, e.ref + ' is composed');
  }
  assert.ok(liveItems.length >= LIVE.length, 'each live upgrade replaces at least one item');
});

for (const { region, key, up } of LIVE) {
  test(`live upgrade ${region} ${key}: the composed scene passes the composed data, bar, variety and care rules`, { skip }, () => {
    const items = itemsOf(REG, region, key);
    assert.ok(items.length > 0, 'a full item is built for the key');
    for (const e of items) {
      const it = e.item;
      assert.equal(it.composed, true);
      assert.equal(it.upgrade && it.upgrade.state, 'live');
      assert.equal(typeof it.legacySvg, 'function', 'the hand-drawn art is kept as legacySvg');
      const data = it.scene();
      assert.equal(data.arch && data.arch.id, up.archetype, 'built from its archetype');
      assert.deepEqual(REG.R.get('sceneValidate')(data), []);
      const res = lintScene(data, TH, { E, ref: e.ref });
      assert.deepEqual(res.failures.map(f => f.name || f), [], 'no failing rule');
      assert.equal(res.pass, true);
      // the scene places every landmark the upgrade names
      const C = REG.R.get('sceneCompile')(data, { lod: 1 });
      for (const id of up.landmarks || []) assert.ok(C.items.some(x => x.o === id), id + ' is placed');
    }
  });
  test(`live upgrade ${region} ${key}: the live item keeps the legacy item's id, key, place fields, label, site, tags and when`, { skip }, () => {
    const live = itemsOf(REG, region, key), legacy = itemsOf(LEGACY, region, key);
    assert.ok(legacy.length > 0, 'a legacy (hand-drawn) item exists for the key');
    assert.equal(live.length, legacy.length, 'as many items as before');
    for (const e of live) {
      const original = legacy.find(old => old.ref === e.ref);
      assert.ok(original, e.ref + ' retains its original reference');
      if (up.label !== undefined) {
        assert.equal(e.item.label, up.label.trim(), 'the explicit new subject has its accurate label');
        assert.equal(e.item.legacyLabel, original.item.label, 'the retained artwork keeps its original caption');
      } else {
        assert.equal(e.item.label, original.item.label, 'ordinary upgrades retain their caption');
        assert.equal(e.item.legacyLabel, undefined, 'no unsolicited caption override');
      }
    }
    assert.deepEqual(live.map(e => identity(REG, e)), legacy.map(e => identity(LEGACY, e)));
    for (const e of legacy) assert.ok(!e.composed && !(e.item.upgrade && e.item.upgrade.state === 'live'), e.ref + ' is the hand-drawn item without the upgrade');
  });
}
