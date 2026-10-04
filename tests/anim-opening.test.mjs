// Synthetic splash and clock: exercise the real timer chain, including skip,
// reduced motion, blocked holidays and packs off. No browser dependencies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = name => readFileSync(new URL('../src/app/' + name, import.meta.url), 'utf8');
function harness({ day = '2026-12-25', look = {}, on = true, town = '' } = {}) {
  const timers = [], attributes = {}, stored = new Map(); let gone = false;
  const element = () => ({
    isConnected: true, innerHTML: '', children: [], className: '',
    classList: { add() {}, contains() { return false; } },
    style: { setProperty() {} }, setAttribute(k, v) { attributes[k] = v; },
    appendChild(el) { this.children.push(el); }, remove() { this.isConnected = false; },
    listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; },
  });
  const splash = element();
  const context = vm.createContext({
    console, setTimeout: fn => { timers.push(fn); }, setInterval() {}, addEventListener() {}, removeEventListener() {}, performance: { now: () => 0 },
    localStorage: { getItem: k => stored.get(k), setItem: (k, v) => stored.set(k, v) },
    document: { hidden: false, readyState: 'loading', addEventListener() {},
      getElementById: () => splash, createElement: element, querySelector: () => null,
      documentElement: { classList: { contains: () => false } }, body: element() },
    window: { addEventListener() {}, __odOpening: { hold: true, gone: () => gone, out: () => { gone = true; }, t0: () => 0 } },
    APP_CONFIG: { onboardedAt: 'synthetic' },
    _serverAvailable: false, todayStr: () => day, _agLevel: () => 'standard',
    animEnabled: () => on, animLook: () => ({ opening: 'daily', block: [], packsOff: [], ...look }),
    esc: s => String(s),
    animUkWhere: () => ({ id: 'hampshire', name: 'Hampshire', welcome: 'Hampshire', town }),
    animUkCountyId: () => 'hampshire', _AUK_KEY: 'synthetic-county',
  });
  for (const file of ['71-anim-almanac.js', '71-anim-library.js', '71-anim-registry.js', '71-uk-counties.js', '72-anim-pack-seasons.js', '72-anim-pack-uk-south-east-4.js', '72-anim-pack-uk-south-east.js']) vm.runInContext(src(file), context);
  vm.runInContext("function animToday(slot) { return animDailyPick(slot, todayStr(), animLook(), { county: 'hampshire', level: 'standard' }); }", context);
  vm.runInContext(src('78-anim-wire.js'), context);
  const arrival = () => {
    vm.runInContext(src('78-anim-uk.js'), context);
    vm.runInContext("animUkWhere = () => ({ id: 'hampshire', name: 'Hampshire', welcome: 'Hampshire' }); animUkCountyId = () => 'hampshire'; animUkCheck({ force: true, first: true })", context);
    return vm.runInContext('document.body.children', context);
  };
  return { context, splash, attributes, timers, skip: () => { gone = true; },
    arrival,
    run: () => vm.runInContext('animOpeningSequence()', context),
    next: () => { assert.ok(timers.length, 'pending stage'); timers.shift()(); },
    event: () => vm.runInContext('animOpeningEvent()', context), gone: () => gone };
}

test('Christmas plays after the welcome and county scene, then closes', () => {
  const h = harness();
  assert.equal(h.run(), true); h.next();
  assert.match(h.attributes['data-od-scene'], /^uk-south-east\/hampshire-/);
  assert.equal(h.attributes['data-od-scene'], 'uk-south-east/hampshire-new-forest-ponies');
  assert.equal(h.attributes['data-od-event'], undefined);
  h.next(); // welcome ends, county scene continues
  assert.equal(h.attributes['data-od-event'], undefined);
  h.next(); // county scene ends, event begins
  assert.equal(h.attributes['data-od-event'], 'seasons/open-christmas-tree');
  assert.equal(h.gone(), false); h.next(); assert.equal(h.gone(), true);
});

test('county arrivals continue with the holiday only on natural completion', () => {
  const h = harness(); const overlays = h.arrival();
  assert.equal(overlays.length, 1); assert.match(overlays[0].innerHTML, /Hampshire/); assert.doesNotMatch(overlays[0].innerHTML, /Welcome to/);
  h.next(); assert.equal(overlays.length, 2); assert.match(overlays[1].innerHTML, /Christmas/);
  h.next(); assert.equal(overlays[1].isConnected, false);
  const skipped = harness(); const dismissed = skipped.arrival();
  dismissed[0].listeners.click(); skipped.next(); assert.equal(dismissed.length, 1);
});

test('skipping the county scene prevents a later holiday from appearing', () => {
  const h = harness(); h.run(); h.next(); h.next(); h.skip(); h.next();
  assert.equal(h.attributes['data-od-event'], undefined);
});

test('returning county openings rotate on refresh; arrival keeps its signature', () => {
  const h = harness({ day: '2026-10-06' });
  const pick = rotate => vm.runInContext(`animOpeningScene(animUkWhere(), ${rotate}).it.ref`, h.context);
  assert.equal(pick(false), 'uk-south-east/hampshire-new-forest-ponies');
  const seen = new Set();
  for (let i = 0; i < 42; i++) seen.add(pick(true));
  assert.equal(seen.size, 42, 'all county scenes are reached before repeating');
  h.run(); h.next();
  const first = h.attributes['data-od-scene'];
  h.run(); h.next(); h.next(); h.next();
  assert.notEqual(h.attributes['data-od-scene'], first, 'returning splash advances');
});

test('local openings name the scene town and mix two nearby views with one wider view', () => {
  const h = harness({ day: '2026-10-06', town: 'Yateley' });
  h.run(); h.next();
  assert.match(h.splash.children[0].innerHTML, /od-seq-place">Yateley</);
  assert.doesNotMatch(h.splash.children[0].innerHTML, /Welcome to/);
  const seen = new Set(); let nearby = 0;
  for (let i = 0; i < 30; i++) {
    const it = vm.runInContext('animOpeningScene(animUkWhere(), true).it', h.context);
    assert.ok(!seen.has(it.ref), 'the first thirty selections do not repeat'); seen.add(it.ref);
    if (it.ukPart === 'north-hampshire') nearby++;
  }
  assert.equal(nearby, 20);
});

test('ordinary days, blocked holidays and disabled packs have no event stage', () => {
  for (const options of [{ day: '2026-10-06' }, { look: { block: ['seasons/open-christmas-tree'] } }, { look: { packsOff: ['seasons'] } }]) {
    const h = harness(options); assert.equal(h.event(), null);
    h.run(); h.next(); h.next(); h.next();
    assert.equal(h.attributes['data-od-event'], undefined); assert.equal(h.gone(), true);
  }
});

test('motion off and opening off never start the county or holiday stages', () => {
  for (const options of [{ on: false }, { look: { opening: 'off' } }]) {
    const h = harness(options); assert.equal(h.run(), false); assert.equal(h.timers.length, 0);
    assert.equal(h.attributes['data-od-event'], undefined);
  }
});

test('every opening is full screen: a small item is drawn large on the landscape stage, a full scene fills the screen', () => {
  const h = harness();
  const html = (code) => vm.runInContext(code, h.context);
  const small = html("(() => { const it = animItems({ slot: 'opening' }).find(i => !i.full); return animOpeningStageHtml(it, 'summer', 'day'); })()");
  assert.match(small, /ap-fallback/, 'the landscape behind');
  assert.match(small, /od-seq-stage-art/, 'the item, large in the middle');
  const big = html("(() => { const it = animItems({ slot: 'opening' }).find(i => i.full); return animOpeningStageHtml(it, 'summer', 'day'); })()");
  assert.ok(big.includes('ap-full') && !big.includes('od-seq-stage-art'), 'a full scene is the whole stage');
});
