// Synthetic splash and clock: exercise the real timer chain, including skip,
// reduced motion, blocked holidays and packs off. No browser dependencies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { animRegistryFiles, REGION_FILE_RE } from '../tools/lib/anim-sources.mjs';
// Hampshire's scenes: the South East region pack and the composed area packs (the scene engine draws them). The parts
// of the Yateley and Fleet area packs are the nearby art of a Yateley or Fleet user.
const HANTS_AREA_PACKS = ['yateley', 'fleet', 'winchester', 'newforest', 'coast'];
const NORTH_HANTS_PARTS = ['area-yateley', 'area-fleet'];
const HANTS_FILES = HANTS_AREA_PACKS.map(a => `72-anim-pack-uk-area-${a}.js`);

const src = name => readFileSync(new URL('../src/app/' + name, import.meta.url), 'utf8');
const SCRIPTS = new Map();   // compiled once, run in every harness
const script = name => { if (!SCRIPTS.has(name)) SCRIPTS.set(name, new vm.Script(src(name), { filename: name })); return SCRIPTS.get(name); };
const PACKS = ['72-anim-pack-seasons.js', '72-anim-pack-uk-south-east.js', ...HANTS_FILES];
const LOAD = animRegistryFiles(fileURLToPath(new URL('../src/app/', import.meta.url)), ['69-travel-moments-logic.js']).filter(f => (!REGION_FILE_RE.test(f) || f === '71-anim-0region.js') && (!f.startsWith('72-anim-pack-') || PACKS.includes(f)));
function harness({ day = '2026-12-25', look = {}, on = true, town = '', stored = new Map() } = {}) {
  const timers = [], attributes = {}; let gone = false;
  const element = () => ({
    isConnected: true, innerHTML: '', children: [], className: '',
    classList: { add() {}, contains() { return false; } },
    style: { setProperty() {} }, setAttribute(k, v) { attributes[k] = v; },
    appendChild(el) { this.children.push(el); }, remove() { this.isConnected = false; },
    listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; },
  });
  const splash = element();
  const context = vm.createContext({
    console, setTimeout: (fn, delay) => { fn.delay = delay; timers.push(fn); }, setInterval() {}, addEventListener() {}, removeEventListener() {}, performance: { now: () => 0 },
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
  for (const file of LOAD) script(file).runInContext(context);
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
  assert.match(h.attributes['data-od-scene'], /^uk-(south-east|area-[a-z0-9-]+)\/hampshire-/);
  assert.equal(h.attributes['data-od-scene'], 'uk-area-newforest/hampshire-new-forest-ponies');
  assert.equal(h.attributes['data-od-event'], undefined);
  h.next(); // welcome ends, county scene continues
  assert.equal(h.attributes['data-od-event'], undefined);
  h.next(); // county scene ends, event begins
  assert.equal(h.attributes['data-od-event'], 'seasons/open-christmas-tree');
  assert.equal(h.gone(), false); h.next(); assert.equal(h.gone(), true);
});

test('opening selects its scene after location preparation and respects skipping while waiting', async () => {
  for (const skip of [false, true]) {
    const h = harness({ day: '2026-10-06' }); let resolve;
    h.context.dashboardLocationBeforeOpening = () => new Promise(r => { resolve = r; });
    h.run(); h.next();
    assert.equal(h.attributes['data-od-scene'], undefined);
    h.context.animUkWhere = () => ({ id: 'hampshire', name: 'Hampshire', town: 'Fleet' });
    if (skip) h.skip();
    resolve(true); await new Promise(r => setImmediate(r));
    if (skip) assert.equal(h.attributes['data-od-scene'], undefined);
    else assert.match(h.splash.children[0].innerHTML, /od-seq-place">Fleet</);
  }
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
  assert.equal(pick(false), 'uk-area-newforest/hampshire-new-forest-ponies');
  const seen = new Set();
  for (let i = 0; i < 42; i++) seen.add(pick(true));
  assert.equal(seen.size, 42, 'all county scenes are reached before repeating');
  h.run(); h.next();
  const first = h.attributes['data-od-scene'];
  h.run(); h.next(); h.next(); h.next();
  assert.notEqual(h.attributes['data-od-scene'], first, 'returning splash advances');
});

test('local openings keep the current town in the title and only show nearby scenes', () => {
  const h = harness({ day: '2026-10-06', town: 'Yateley' });
  h.run(); h.next();
  assert.match(h.splash.children[0].innerHTML, /od-seq-place">Yateley</);
  assert.doesNotMatch(h.splash.children[0].innerHTML, /Welcome to/);
  const seen = new Set(); let nearby = 0;
  for (let i = 0; i < 30; i++) {
    const it = vm.runInContext('animOpeningScene(animUkWhere(), true).it', h.context);
    assert.ok(!seen.has(it.ref), 'the first thirty selections do not repeat'); seen.add(it.ref);
    if (NORTH_HANTS_PARTS.includes(it.ukPart)) nearby++;
  }
  assert.equal(nearby, 30);
  assert.equal(vm.runInContext('animOpeningPlace({ukTown:"Fleet",ukLocality:"Fleet"},animUkWhere())',h.context),'Yateley');
});
test('moving towns within a county welcomes the actual town for three displayed openings', () => {
  const h = harness({ day: '2026-10-06', town: 'Yateley' });
  vm.runInContext(src('78-anim-uk.js'), h.context);
  h.context.animUkWhere = () => ({ id: 'hampshire', name: 'Hampshire', town: 'Yateley', lat: 51.34, lon: -0.83 });
  vm.runInContext('animUkArrivalState(animUkWhere())', h.context);
  h.context.animUkWhere = () => ({ id: 'hampshire', name: 'Hampshire', town: 'Fleet', lat: 51.28, lon: -0.84 });
  // Observing a pending arrival repeatedly does not use its three welcomes.
  for (let i = 0; i < 4; i++) assert.equal(vm.runInContext('animUkArrivalState(animUkWhere()).remaining', h.context), 3);
  for (let i = 0; i < 4; i++) {
    h.run(); h.next();
    const html = h.splash.children.at(-1).innerHTML;
    assert.match(html, /od-seq-place">Fleet</);
    assert.equal(html.includes('Welcome to'), i < 3);
    h.timers.length = 0;
  }
  assert.equal(vm.runInContext('animUkCheck()', h.context), false, 'no extra arrival after the splash');
});

test('Yateley arrivals use exact-town art for three reloads, then rotate nearby scenes', () => {
  const stored=new Map();
  const seed=harness({stored});
  vm.runInContext(src('78-anim-uk.js'),seed.context);
  vm.runInContext("animUkArrivalState({id:'hampshire',town:'Fleet',lat:51.28,lon:-0.84})",seed.context);
  const first=new Set();let nearby=0;
  for(let load=0;load<20;load++) {
    const h=harness({stored,day:'2026-10-06'});
    vm.runInContext(src('78-anim-uk.js'),h.context);
    h.context.APP_CONFIG.locationMode='manual';
    h.context.animUkWhere=()=>({id:'hampshire',name:'Hampshire',town:'Yateley',lat:51.34,lon:-0.83});
    h.run();h.next();
    h.context.selected=h.attributes['data-od-scene'];
    const it=vm.runInContext('animItem(selected)',h.context);
    if(load<3) { assert.equal(it.ukTown,'Yateley');first.add(it.ref); }
    else if(it.ukTown!=='Yateley')nearby++;
  }
  assert.equal(first.size,3,'different exact-town views');
  assert.ok(nearby>0,'nearby art becomes available after the third display');
});

test('exact-place preference expires after five minutes and unavailable exact art falls back nearby', () => {
  const h=harness({day:'2026-10-06'});let now=1000;
  vm.runInContext(src('78-anim-uk.js'),h.context);
  h.context.Date=class extends Date {static now(){return now;}};
  h.context.animUkWhere=()=>({id:'hampshire',name:'Hampshire',town:'Yateley',lat:51.34,lon:-0.83});
  assert.equal(vm.runInContext('animUkArrivalState(animUkWhere()).exactRemaining',h.context),3);
  assert.equal(vm.runInContext('animOpeningScene(animUkWhere(),true).it.ukTown',h.context),'Yateley');
  now+=5*60000;
  assert.equal(vm.runInContext('animUkArrivalState(animUkWhere()).exactRemaining',h.context),0);
  h.context.animLook=()=>({opening:'daily',packsOff:[],block:vm.runInContext('animItems({slot:"opening"}).filter(x=>x.ukTown==="Yateley").map(x=>x.ref)',h.context)});
  assert.notEqual(vm.runInContext('animOpeningScene(animUkWhere(),true).it.ukTown',h.context),'Yateley');
});

test('US, Asian and Texas arrival art prefers enabled exact-city views over regional art', () => {
  for(const [field,value,name,cc] of [['usPlace','boston','Boston','US'],['asiaPlace','tokyo','Tokyo','JP'],['txTown','Austin','Austin','US']]) {
    const h=harness();
    const regional={ref:'test/region',pack:'test',intensity:'subtle'};
    const city=[1,2].map(n=>({ref:'test/city-'+n,pack:'test',intensity:'subtle',[field]:value,when:()=>true}));
    h.context.animCtx=()=>({});h.context.animItems=()=>[regional,...city];
    h.context.tx={id:value.toLowerCase(),name,cc,it:regional};
    vm.runInContext('animOpeningExactScene(tx,{exactRemaining:3})',h.context);
    assert.equal(h.context.tx.it.ref,'test/city-1');
    vm.runInContext('animOpeningExactScene(tx,{exactRemaining:2})',h.context);
    assert.equal(h.context.tx.it.ref,'test/city-2');
    h.context.tx.it=regional;
    vm.runInContext('animOpeningExactScene(tx,{exactRemaining:0})',h.context);
    assert.equal(h.context.tx.it.ref,regional.ref,'expired window respects the ordinary pick');
    h.context.animLook=()=>({block:city.map(it=>it.ref),packsOff:[]});
    vm.runInContext('animOpeningExactScene(tx,{exactRemaining:3})',h.context);
    assert.equal(h.context.tx.it.ref,regional.ref,'blocked exact-city art is excluded');
  }
});
test('GPS boundary jitter does not restart welcome counts; accepted arrivals survive reload', () => {
  const stored = new Map();
  const make = () => {
    const c = vm.createContext({ APP_CONFIG: { locationMode: 'device' },
      localStorage: { getItem: k => stored.get(k), setItem: (k, v) => stored.set(k, v) } });
    vm.runInContext(src('78-anim-uk.js'), c); return c;
  };
  let c = make();
  const observe = (town, lat, consume = false) => { c.point = { id: 'hampshire', name: 'Hampshire', town, lat, lon: -0.83 }; return vm.runInContext(`animUkArrivalState(point, ${consume})`, c); };
  observe('Yateley', 51.34);
  assert.equal(observe('Neighbouring town', 51.35).remaining, 0);
  assert.equal(observe('Fleet', 51.28, true).remaining, 3);
  c = make();
  assert.equal(observe('Fleet', 51.28, true).remaining, 2);
  assert.equal(observe('Fleet', 51.28, true).remaining, 1);
  assert.equal(observe('Fleet', 51.28).remaining, 0);
  assert.equal(observe('Yateley', 51.34).remaining, 3, 'returning is a new arrival');
});
test('same-county arrivals defer while busy and do not replay on periodic checks', () => {
  const h = harness({ day: '2026-10-06' });
  vm.runInContext(src('78-anim-uk.js'), h.context);
  h.context.animUkWhere = () => ({ id: 'hampshire', name: 'Hampshire', town: 'Yateley', lat: 51.34, lon: -0.83 });
  vm.runInContext('animUkCheck()', h.context);
  h.context.animUkWhere = () => ({ id: 'hampshire', name: 'Hampshire', town: 'Fleet', lat: 51.28, lon: -0.84 });
  h.context.document.hidden = true;
  assert.equal(vm.runInContext('animUkCheck()', h.context), false);
  h.context.document.hidden = false;
  assert.equal(vm.runInContext('animUkCheck()', h.context), true);
  assert.match(h.context.document.body.children[0].innerHTML, /Welcome to/);
  assert.match(h.context.document.body.children[0].innerHTML, /ap-cine-place">Fleet</);
  h.next();
  assert.equal(vm.runInContext('animUkCheck()', h.context), false);
});
test('arrival prefixes expire after five minutes even when fewer than three were shown', () => {
  let now = 1000;
  const c = vm.createContext({ APP_CONFIG: { locationMode: 'manual' }, Date: { now: () => now } });
  vm.runInContext(src('78-anim-uk.js'), c);
  c.point = { id: 'hampshire', town: 'Yateley' };
  vm.runInContext('animUkArrivalState(point)', c);
  c.point = { id: 'hampshire', town: 'Fleet' };
  assert.equal(vm.runInContext('animUkArrivalState(point, true).remaining', c), 3);
  now += 5 * 60 * 1000 - 1;
  assert.equal(vm.runInContext('animUkArrivalState(point).remaining', c), 2);
  now++;
  assert.equal(vm.runInContext('animUkArrivalState(point).remaining', c), 0);
  assert.equal(vm.runInContext('animUkArrivalState(point).pending', c), false);
});
test('Fleet to Boston USA stops welcoming after three actual page loads with shared storage', () => {
  const stored = new Map();
  const fleet = harness({stored});
  vm.runInContext(src('78-anim-uk.js'),fleet.context);
  vm.runInContext("animUkArrivalState({id:'hampshire',town:'Fleet',lat:51.28,lon:-0.84})",fleet.context);
  for (let load=0;load<7;load++) {
    const h = harness({stored,day:'2026-10-06'});
    vm.runInContext(src('71-anim-us.js')+'\n'+src('78-anim-uk.js'),h.context);   // the US is a region (71-anim-0region.js: already in the harness load, for the scene engine)
    h.context.APP_CONFIG.locationMode='manual';
    h.context.APP_CONFIG.location={name:'Boston',countryCode:'US',lat:42.36,lon:-71.06};
    h.context.animUkWhere=()=>null;
    h.context.animToday=()=>({...vm.runInContext('animItems({slot:"opening"})[0]',h.context),pack:'us-northeast'});
    h.run();h.next();
    const html=h.splash.children[0].innerHTML;
    assert.match(html,/od-seq-place">Boston</);
    assert.equal(html.includes('Welcome to'),load<3,'page load '+(load+1));
    assert.equal(html.includes('Over 2,500 miles.'),load===1,'the distance surprise follows the country change');
    assert.equal(html.includes('New country, new chapter.'),load===0||load===2,'reuse only after matching choices run out');
    assert.equal(html.includes('od-seq-title has-egg'),load<3,'the Easter egg is the main headline within the budget');
  }
});
test('foreign openings stop welcoming after five minutes, even across a reload', () => {
  const stored=new Map();let now=1000;
  const open = () => {
    const h=harness({stored,day:'2026-10-06'});
    vm.runInContext(src('78-anim-uk.js'),h.context);
    h.context.Date=class extends Date { static now(){return now;} };
    h.context.APP_CONFIG.locationMode='manual';
    h.context.APP_CONFIG.location={name:'Boston',countryCode:'US',lat:42.36,lon:-71.06};
    h.context.animUkWhere=()=>null;
    h.context.usWhere=()=>({name:'Boston',id:'boston',state:'MA'});
    h.context.animToday=()=>({...vm.runInContext('animItems({slot:"opening"})[0]',h.context),pack:'us-northeast'});
    h.run();h.next();return h.splash.children[0].innerHTML;
  };
  assert.match(open(),/Welcome to/);
  now+=5*60000;
  assert.doesNotMatch(open(),/Welcome to/);
});
test('Texas, Asian and generic manual location openings share the same welcome budget', () => {
  for(const target of [{name:'Austin',cc:'US',pack:'texas',fn:'animTexasWhere'}, {name:'Tokyo',cc:'JP',pack:'asia-japan',fn:'asiaWhere'}, {name:'Paris',cc:'FR',pack:'seasons',fn:''}]) {
    const h=harness({day:'2026-10-06'});
    vm.runInContext(src('78-anim-uk.js'),h.context);
    h.context.APP_CONFIG.locationMode='manual';
    h.context.APP_CONFIG.location={name:target.name,countryCode:target.cc};
    h.context.animUkWhere=()=>null;
    if(target.fn)h.context[target.fn]=()=>({name:target.name,id:target.name.toLowerCase(),cc:target.cc});
    h.context.animToday=()=>({...vm.runInContext('animItems({slot:"opening"})[0]',h.context),pack:target.pack});
    for(let i=0;i<4;i++){h.run();h.next();assert.equal(h.splash.children.at(-1).innerHTML.includes('Welcome to'),i<3,target.name+' '+i);h.timers.length=0;}
  }
});
test('an arrival Easter egg adds 2.5 seconds, preserves the title and respects skipping', () => {
  const h = harness({ day: '2026-10-06' });
  vm.runInContext(src('78-anim-uk.js'), h.context);
  h.context.animUkWhere = () => ({ id: 'hampshire', name: 'Hampshire', town: 'Yateley', lat: 51.34, lon: -0.83 });
  vm.runInContext('animUkCheck()', h.context);
  h.context.animUkWhere = () => ({ id: 'hampshire', name: 'Hampshire', town: 'Fleet', lat: 51.28, lon: -0.84 });
  assert.equal(vm.runInContext('animUkCheck()', h.context), true);
  const overlay = h.context.document.body.children[0];
  assert.match(overlay.innerHTML, /Fleet by name/);
  assert.match(overlay.innerHTML, /ap-cine-place">Fleet</);
  assert.equal(h.timers[0].delay, 3400 + 2500 + 80);
  assert.equal(vm.runInContext('animUkArrivalState(animUkWhere()).remaining', h.context), 2);
  overlay.listeners.click(); h.next();
  assert.equal(h.context.document.body.children.length, 1, 'skip does not add another stage');
});
test('splash Easter eggs extend only their welcome stage and share the display budget', () => {
  const h = harness({ day: '2026-10-06' });
  vm.runInContext(src('78-anim-uk.js'), h.context);
  h.context.animUkWhere = () => ({ id: 'hampshire', name: 'Hampshire', town: 'Yateley', lat: 51.34, lon: -0.83 });
  vm.runInContext('animUkArrivalState(animUkWhere())', h.context);
  h.context.animUkWhere = () => ({ id: 'hampshire', name: 'Hampshire', town: 'Fleet', lat: 51.28, lon: -0.84 });
  h.run(); h.next();
  assert.match(h.splash.children[0].innerHTML, /od-seq-egg/);
  assert.equal(h.timers[0].delay, 1600 + 2500);
  h.next(); assert.equal(h.timers[0].delay, 3600, 'the ordinary scene duration stays the same');
  assert.equal(vm.runInContext('animUkArrivalState(animUkWhere()).remaining', h.context), 2);
});
test('cinematic Easter egg copy is escaped and cannot insert markup', () => {
  const h = harness();
  h.context.esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  vm.runInContext('animCineShow({art:"",place:"Fleet",egg:{title:"<img src=x>",detail:"<script>bad</script>"},ms:5900})',h.context);
  const html = h.context.document.body.children[0].innerHTML;
  assert.match(html,/&lt;img src=x&gt;/);
  assert.match(html,/&lt;script&gt;bad&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<img|<script/);
});
test('local Easter eggs expire with the welcome, stay stable on reads and keep bounded memories', () => {
  let now = 1000;
  const c = vm.createContext({ APP_CONFIG: { locationMode: 'manual' }, Date: { now: () => now } });
  vm.runInContext(src('69-travel-moments-logic.js') + '\n' + src('78-anim-uk.js'), c);
  const visit = (town, consume = false) => { c.point = { id: 'hampshire', town }; return vm.runInContext(`animUkArrivalState(point, ${consume})`, c); };
  visit('Yateley');
  assert.equal(visit('Fleet', true).egg.id, 'local-fleet');
  const back=visit('Yateley');
  assert.equal(back.egg.id, 'returning');
  assert.equal(visit('Yateley').egg.id, back.egg.id, 'a peek does not shuffle or spend');
  assert.equal(visit('Yateley', true).remaining, 3);
  assert.equal(visit('Yateley', true).egg.id, 'local-yateley', 'unused lower tiers get their turn');
  assert.equal(visit('Yateley', true).remaining, 1);
  assert.equal(visit('Yateley').egg, null, 'three displays exhaust the budget');
  assert.equal(visit('Fleet').remaining, 3, 'a new arrival starts a fresh window');
  now += 5 * 60000;
  assert.equal(visit('Fleet').egg, null);
  for (let i = 0; i < 20; i++) visit('Town ' + i);
  assert.equal(vm.runInContext('_aukArrivalMemory.seen.length', c), 12);
  assert.equal(vm.runInContext('_aukArrivalMemory.visits.length', c), 12);
  assert.equal(vm.runInContext('_aukArrivalMemory.recent.length', c), 12);
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
