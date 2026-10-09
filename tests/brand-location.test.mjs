// Automatic workspace artwork follows real offline location mappings, using
// compact animations without replaying them on unrelated shell renders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { animRegistryFiles } from '../tools/lib/anim-sources.mjs';

const app = fileURLToPath(new URL('../src/app/', import.meta.url));
const source = f => readFileSync(new URL('../src/app/' + f, import.meta.url), 'utf8');
const registry = animRegistryFiles(app, ['69-travel-data.js', '69-travel-places.js']).map(source).join('\n;\n');
function harness() {
  const look = { block: [], packsOff: [] };
  const ctx = {};
  const box = vm.createContext({
    console, Intl, animLook: () => look, animCtx: () => ctx, animUkWhere: () => null,
    todayStr: () => '2026-10-08', _agLevel: () => 'standard',
    localStorage: { getItem: () => null },
  });
  vm.runInContext(registry + '\n' + source('78-anim-profile.js'), box);
  return { box, look, ctx, pick: () => vm.runInContext('animProfileScene()', box) };
}

test('workspace miniatures follow US states, Texas towns, Asia and explicit world-city coordinates', () => {
  const h = harness();
  for (const [lat, lon, pack, city] of [
    [41.88, -87.63, 'us-midwest'], [32.78, -96.80, 'texas', 'dallas'],
    [35.68, 139.69, 'world', 'tokyo-jp'], [48.86, 2.35, 'world', 'paris-fr'],
    [19.08, 72.88, 'asia-south'],
  ]) {
    Object.assign(h.ctx, { lat, lon, city: '' });
    const item = h.pick();
    assert.ok(item, pack + ' has location art');
    assert.equal(item.pack, pack);
    assert.ok(!item.full, 'a compact drawing is preferred');
    if (city) assert.equal(item.txTown || item.city, city);
    assert.match(item.svg({}), /class="[^"]*x-/, 'the miniature includes authored motion');
    assert.equal(h.pick(), item, 'unchanged context retains the same artwork');
  }
});

test('workspace art honors travel, disabled packs, blocked items and unmapped locations', () => {
  const h = harness();
  Object.assign(h.ctx, { city: 'paris-fr', country: 'FR', lat: 41.88, lon: -87.63 });
  assert.equal(h.pick().city, 'paris-fr', 'travel location takes precedence over home coordinates');
  h.look.packsOff.push('world');
  assert.equal(h.pick(), null, 'disabled world art cannot fall back to the home state while travelling');
  h.look.packsOff.length = 0;
  h.look.block.push(...vm.runInContext("animItems({pack:'world'}).filter(it=>it.city==='paris-fr').map(it=>it.ref)", h.box));
  assert.equal(h.pick(), null, 'blocked city artwork stays blocked');
  Object.assign(h.ctx, { city: '', country: '', lat: 0, lon: 0 });
  assert.equal(h.pick(), null, 'an unmapped location uses the shell initial/logo fallback');
  Object.assign(h.ctx, { lat: 41.88, lon: -87.63 });
  assert.ok(h.pick());
  h.box._agLevel = () => 'off';
  assert.equal(h.pick(), null);
});

test('workspace rendering updates motion without rebuilding an unchanged mark', () => {
  const shell = source('14-shell.js');
  let enabled = true, renders = 0;
  const classes = new Set();
  const mark = { dataset: {}, classList: { toggle: (name, on) => on ? classes.add(name) : classes.delete(name) } };
  const item = { ref: 'local/mini', label: 'Local miniature', full: false };
  const box = vm.createContext({
    APP_CONFIG: {}, appIconKind: () => '', animProfileScene: () => item,
    _agLevel: () => 'standard', animTimeOfDay: () => 'day', animEnabled: () => enabled,
    animItemHtml: (_item, opts) => { renders++; return JSON.stringify(opts); },
  });
  vm.runInContext(shell.slice(shell.indexOf('/** The OpenDash logo as an image URL'), shell.indexOf('/* ---------- the light/dark switch')), box);
  box.setBrandMark(mark, 'User');
  assert.equal(JSON.parse(mark.innerHTML).live, true);
  box.setBrandMark(mark, 'User');
  assert.equal(renders, 1);
  enabled = false;
  box.setBrandMark(mark, 'User');
  assert.equal(JSON.parse(mark.innerHTML).reduced, true);
  assert.equal(renders, 2);
  enabled = true; item.full = true; item.ref = 'local/full';
  box.setBrandMark(mark, 'User');
  assert.equal(JSON.parse(mark.innerHTML).live, false, 'full scenes remain still in the shell');
});
