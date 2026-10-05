// Travel moments (travel spec 4, 7.3 "Moments" and "Library scenes"): the arrival, departure and
// welcome-home content, the level map, the choreography tables, the dock maths, the queue, the
// once-keys and the two-tab claim, the scene generator and the 14 library scenes. Pure: the page
// files are evaluated in Node (synthetic data only, no personal data).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { snap, timed, ms, L as TL } from './fixtures/travel/kit.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const FILES = ['07-core-clock-logic.js', '69-travel-data.js', '69-travel-holidays.js', '69-travel-places.js', '69-travel-logic.js', '71-anim-library.js', '73-brief-logic.js', '69-travel-moments-logic.js'];
function load() {
  const code = FILES.map(read).join('\n;\n');
  const names = [...new Set([...code.matchAll(/^(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=)/gm)].map(m => m[1] || m[2]))];
  // eslint-disable-next-line no-new-func
  return new Function(`"use strict";\n${code}\n;return { ${names.join(', ')} };`)();
}
const L = load();
const HOME = { zone: 'Europe/London', label: 'London', cc: 'GB', ccy: 'GBP' };
const T = Date.UTC(2026, 9, 4, 6, 42);   // Sun 4 Oct 2026, 07:42 London, 15:42 Tokyo
test('journey Easter eggs use straight-line thresholds and never infer trips from manual edits', () => {
  const from = { lat: 0, lon: 0, cc: 'GB' };
  const pick = lon => L.trJourneyEgg({ from, to: { lat: 0, lon, cc: 'GB' }, source: 'geo' });
  assert.equal(pick(1), null);
  assert.equal(pick(1.5).id, 'hundred-miles');
  assert.equal(pick(4).id, 'big-hop');
  assert.equal(pick(15).id, 'thousand-miles');
  assert.match(pick(15).detail, /as the crow flies/);
  assert.equal(pick(15).extraMs, 2500);
  assert.equal(L.trJourneyEgg({ from, to: { lat: 0, lon: 15 }, source: 'manual' }), null);
  assert.equal(L.trJourneyEgg({ from: {lat: NaN, lon: 0}, to: {lat: 0, lon: 200} }), null);
});
test('country, returning-place, town and late arrivals have distinct gentle surprises', () => {
  const pick = i => L.trJourneyEgg(i);
  assert.equal(pick({from:{cc:'GB'},to:{cc:'JP'}}).id, 'new-country');
  assert.equal(pick({from:{cc:'GB'},to:{cc:''}}), null, 'unknown countries do not become border crossings');
  assert.equal(pick({returning:true,to:{town:'Fleet'}}).id, 'returning');
  for (const town of ['Fleet', 'Yateley', 'Sheffield', 'Manchester']) assert.equal(pick({to:{town}}).id, 'local-' + town.toLowerCase());
  assert.equal(pick({hour:23}).id, 'late-arrival');
  assert.equal(pick({hour:12}).id, 'lunchtime');
});
test('all 48 authored Easter eggs are reachable from matching contexts and vary deterministically', () => {
  assert.equal(L.TR_JOURNEY_EGGS.length, 48);
  assert.equal(new Set(L.TR_JOURNEY_EGGS.map(e => e.id)).size, 48);
  const contexts = [
    {birthday:true},
    ...[1.5,4,8,15,40,80,170].map(lon => ({from:{lat:0,lon:0},to:{lat:0,lon},source:'geo'})),
    {from:{lat:10,lon:0},to:{lat:-10,lon:0},source:'geo'},
    {from:{lat:0,lon:170},to:{lat:0,lon:-170},source:'geo'},
    {from:{lat:0,lon:0},to:{lat:20,lon:0},source:'geo'},
    {from:{lat:20,lon:0},to:{lat:0,lon:0},source:'geo'},
    {from:{cc:'GB'},to:{cc:'JP'}}, {from:{cc:'JP'},to:{cc:'GB'},homeCc:'GB'}, {from:{cc:'GB'},to:{cc:'JP'},returningCountry:true},
    ...[30,180,540].map(diffMin=>({diffMin})), {dayDiff:1}, {dayDiff:-1},
    {uniqueToday:3}, {uniqueWeek:5}, {returning:true,awayMs:3600000}, {returning:true,awayMs:31*86400000},
    {visitCount:3}, {visitCount:5}, {returning:true}, {returning:true,dow:6},
    {hour:23}, {hour:6}, {hour:12}, {dow:5,hour:16}, {dow:0,hour:15},
    ...['Fleet','Yateley','Sheffield','Manchester','Reading','Bath','York','Oxford','Cambridge','Edinburgh','Glasgow','Cardiff','Belfast','Derry/Londonderry'].map(town=>({to:{town}})),
  ];
  const reached = new Set();
  for (const c of contexts) for (let sequence=0; sequence<48; sequence++) {
    const egg = L.trJourneyEgg({...c,sequence});
    if (egg) { reached.add(egg.id); assert.equal(egg.extraMs,2500); assert.deepEqual(egg,L.trJourneyEgg({...c,sequence})); }
  }
  assert.deepEqual([...reached].sort(),L.TR_JOURNEY_EGGS.map(e=>e.id).sort());
});

/** Balanced tags, nothing executable. */
function wellFormed(svg) {
  const stack = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
    const [, close, name, , self] = m;
    if (self) continue;
    if (close) { const top = stack.pop(); if (top !== name) return `</${name}> closes <${top}>`; } else stack.push(name);
  }
  return stack.length ? `unclosed <${stack.join('><')}>` : null;
}

// ─── levels ────────────────────────────────────────────────────────────────
test('the level map covers every moment at every level (spec 4.5)', () => {
  assert.deepEqual([...L.TM_LEVELS], ['off', 'reduced', 'subtle', 'standard', 'playful']);
  for (const kind of L.TM_MOMENTS) {
    assert.ok(L.TM_PARTS[kind] && L.TM_PARTS[kind].length, kind);
    for (const lv of L.TM_LEVELS) {
      const plan = L.trMomentLevelPlan(kind, lv);
      for (const p of L.TM_PARTS[kind]) assert.ok(plan[p] !== undefined && plan[p] !== null, `${kind} x ${lv}: ${p}`);
    }
  }
  // The table's corners.
  assert.equal(L.trMomentLevelPlan('arrive', 'off').entrance, 'settled');
  assert.equal(L.trMomentLevelPlan('arrive', 'reduced').entrance, 'fade150');
  assert.equal(L.trMomentLevelPlan('arrive', 'subtle').time, 'final');
  assert.equal(L.trMomentLevelPlan('arrive', 'subtle').diff, 'count', 'Subtle still counts the hero number');
  assert.equal(L.trMomentLevelPlan('arrive', 'standard').time, 'sweep-roll');
  assert.equal(L.trMomentLevelPlan('arrive', 'playful').entrance, 'tilt');
  assert.equal(L.trMomentLevelPlan('home', 'off').life, 'hidden');
  assert.equal(L.trMomentLevelPlan('home', 'subtle').life, 'shown');
  assert.equal(L.trMomentLevelPlan('dock', 'off').dock, 'instant');
  assert.equal(L.trMomentLevelPlan('dock', 'reduced').dock, 'crossfade');
  assert.equal(L.trMomentLevelPlan('dock', 'subtle').dock, 'fade-through');
  assert.equal(L.trMomentLevelPlan('dock', 'standard').dock, 'move');
  // A reopen never replays.
  const re = L.trMomentLevelPlan('reopen', 'playful');
  assert.equal(re.entrance, 'settled'); assert.equal(re.title, 'static'); assert.equal(re.time, 'final');
  // Loops: the motion budget.
  assert.deepEqual(L.TM_LEVELS.map(lv => L.TM_LEVEL_MAP.loops[lv]), [0, 0, 2, 6, 8]);
  const all = [...L.TM_LOOP_ORDER];
  assert.equal(L.trLoopAllot(all, 'off').length, 0);
  assert.equal(L.trLoopAllot(all, 'reduced').length, 0);
  assert.ok(!L.trLoopAllot(all, 'subtle').includes('particles'), 'Subtle: no rain or snow');
  assert.equal(L.trLoopAllot(all, 'subtle').length, 2);
  assert.ok(L.trLoopAllot(all, 'standard').length <= 6);
  assert.ok(L.trLoopAllot(all, 'playful').length <= 8);
});

test('the level comes from the OS, the sidebar switch, the motion level, then Standard', () => {
  assert.equal(L.trMomentLevelOf({}), 'standard');
  assert.equal(L.trMomentLevelOf({ osReduced: true, attr: 'playful' }), 'reduced', 'the OS wins');
  assert.equal(L.trMomentLevelOf({ userReduced: true }), 'off', 'the old switch is Off');
  assert.equal(L.trMomentLevelOf({ attr: 'subtle', userReduced: true }), 'subtle', 'a chosen level wins over the old switch');
  assert.equal(L.trMomentLevelOf({ preview: 'playful', osReduced: true }), 'playful', 'previews force a level');
  assert.equal(L.trMomentLevelOf({ attr: 'nonsense' }), 'standard');
});

// ─── choreography ──────────────────────────────────────────────────────────
test('the choreography tables settle in time and keep the tier order (spec 4.4)', () => {
  const C = L.TM_CHOREO;
  const by = (t) => Object.fromEntries(t.map(r => [r.id, r]));
  for (const [name, t] of Object.entries(C)) for (const r of t) {
    assert.ok(Number.isFinite(r.from) && Number.isFinite(r.to) && r.to > r.from && r.from >= 0, `${name}.${r.id}`);
  }
  // The postcard settles by 2.0 s, and nothing is empty after its first ~120 ms: the content starts with the surface.
  assert.ok(L.trChoreoSettle(C.postcard) <= 2000, `postcard settles at ${L.trChoreoSettle(C.postcard)}`);
  assert.ok(L.trChoreoSettle(C.home) <= 2300);
  const pc = by(C.postcard);
  assert.equal(pc.surface.from, 0);
  assert.ok(pc.over.from <= 120 && pc.title.from <= 200, 'the content tiers start with the surface (v2 fix)');
  for (const t of [C.postcard, C.full, C.home, C.depart]) {
    const tier = (k) => t.filter(r => r.tier === k);
    const min = (rs) => Math.min(...rs.map(r => r.from));
    const max = (rs) => Math.max(...rs.map(r => r.from));
    assert.ok(min(tier('T1')) === 0 || min(tier('T1')) <= min(tier('T2')), 'T1 first');
    if (tier('T3').length) assert.ok(max(tier('T2')) <= max(tier('T3')) && min(tier('T2')) < min(tier('T3')), 'T2 before T3');
    if (tier('T4').length && tier('T3').length) assert.ok(min(tier('T4')) > min(tier('T3')), 'T4 rides after T3');
    const amb = tier('T6');
    assert.equal(amb.length, 1);
    assert.ok(amb[0].from >= L.trChoreoSettle(t), 'ambient loops start once the entry settles');
  }
  // The full card: the stamp lands at 1650, the chips at 1850, the note then the actions.
  const f = by(C.full);
  assert.equal(f.stamp.from, 1650); assert.equal(f.chips.from, 1850); assert.ok(f.note.from < f.actions.from);
  assert.ok(f.dial.from >= f.clocks.from, 'data ink rides its card');
  // The dock: content out first, the shell moves 0-420, the chip fades in under it 320-440, the ring, the dot.
  const d = by(C.dock);
  assert.deepEqual([d.content.to, d.move.to, d.chip.from, d.chip.to, d.ring.from, d.dot.from], [140, 420, 320, 440, 420, 520]);
  const vars = L.trChoreoVars(C.postcard);
  assert.match(vars, /--trm-title-d:160ms;--trm-title-t:730ms;/);
});

// ─── the dock ──────────────────────────────────────────────────────────────
test('the dock vector maps the card corner onto the chip (layout boxes only)', () => {
  const card = { left: 1000, top: 58, width: 400, height: 380 };
  const chip = { left: 1160, top: 8, width: 240, height: 32 };
  const v = L.trDockVector(card, chip);
  assert.deepEqual(v, { dx: 0, dy: -50, sx: 0.6, sy: 0.084, origin: '100% 0' });
  const p = L.trDockVector({ left: 8, top: 400, width: 360, height: 300 }, { left: 200, top: 8, width: 90, height: 32 }, { phone: true });
  assert.equal(p.origin, '50% 100%');
  assert.equal(p.dx, (200 + 45) - (8 + 180));
  assert.equal(p.dy, 40 - 700);
  assert.ok(Number.isFinite(L.trDockVector(null, null).sx), 'no NaN on missing boxes');
  // A source check: the dock never measures the transformed box.
  const src = read('69-travel-moments.js');
  const body = (name) => { const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name); return src.slice(i, src.indexOf('\n}\n', i)); };
  for (const fn of ['trDock', '_tmBox']) assert.ok(!/getBoundingClientRect/.test(body(fn)), `${fn} must use layout boxes`);
});

// ─── the queue ─────────────────────────────────────────────────────────────
test('the moment queue: one at a time, priority, quiet conditions, caps, once per key', () => {
  const now = 1e12;
  const q = [
    { id: 'm1', key: 'moment.inbox:1', kind: 'milestone', at: now - 5000 },
    { id: 'a', key: 'arrive:trip-1:JP', kind: 'travel', at: now - 1000 },
  ];
  const st = { shown: {}, bootAt: now - 60000, blockers: {} };
  let r = L.trMomentQueueNext(q, st, now);
  assert.equal(r.action, 'show'); assert.equal(r.item.kind, 'travel', 'travel outranks a milestone'); assert.equal(r.as, 'card');
  assert.equal(L.trMomentQueueNext(q, Object.assign({}, st, { showing: true }), now).action, 'wait', 'one at a time');
  for (const [b, why] of [['hidden', 'hidden'], ['typing', 'typing'], ['modal', 'modal open'], ['story', 'story playing'], ['card', 'task card open'], ['meeting', 'meeting in progress']]) {
    r = L.trMomentQueueNext(q, Object.assign({}, st, { blockers: { [b]: true } }), now);
    assert.equal(r.action, 'wait', b); assert.equal(r.why, why);
  }
  assert.equal(L.trMomentQueueNext(q, Object.assign({}, st, { bootAt: now - 3000 }), now).why, 'just booted');
  r = L.trMomentQueueNext(q, Object.assign({}, st, { shown: { 'arrive:trip-1:JP': 1 } }), now);
  assert.equal(r.action, 'skip'); assert.equal(r.why, 'already shown');
  r = L.trMomentQueueNext([{ id: 'a', key: 'k', kind: 'travel', at: now - 7 * 3600000 }], st, now);
  assert.equal(r.action, 'skip'); assert.equal(r.why, 'expired', 'waiting 6 h: skipped and marked shown');
  // 3 cards a day for the others; travel moments always show as cards.
  const m = [{ id: 'm', key: 'moment.x', kind: 'daily', at: now }];
  assert.equal(L.trMomentQueueNext(m, Object.assign({}, st, { todayCount: 3 }), now).as, 'pop');
  assert.equal(L.trMomentQueueNext(m, Object.assign({}, st, { lastCardAt: now - 60000 }), now).as, 'flourish');
  assert.equal(L.trMomentQueueNext([q[1]], Object.assign({}, st, { todayCount: 9 }), now).as, 'card');
  assert.equal(L.trMomentQueueNext([], st, now).action, 'idle');
});

test('once-keys, and two tabs never both claim one moment', () => {
  assert.equal(L.trMomentKey('arrive', { tripId: 'trip-a', cc: 'JP' }), 'arrive:trip-a:JP', 'once per country');
  assert.equal(L.trMomentKey('home', { tripId: 'trip-a' }), 'home:trip-a');
  // TravelStore.claim (69-travel.js) over one shared localStorage, from two "tabs".
  const store = new Map();
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const tab = () => { const c = vm.createContext({ localStorage, console, Date, Math, JSON, setTimeout, Promise }); vm.runInContext(read('69-travel.js') + '\n;this.TS = TravelStore;', c); return c.TS; };
  const a = tab(), b = tab();
  assert.equal(a.claim('arrive:trip-a:JP'), true);
  assert.equal(a.claim('arrive:trip-a:JP'), true, 'the same tab may show it (re-renders)');
  assert.equal(b.claim('arrive:trip-a:JP'), false, 'a second tab never shows it');
  assert.equal(b.claim('home:trip-a'), true);
});

// ─── content ───────────────────────────────────────────────────────────────
const tokyo = { cc: 'JP', cityId: 'tokyo-jp', zone: 'Asia/Tokyo', label: 'Tokyo', kind: 'city' };
const rainy = { ok: true, current: { temp: 18.2, cond: 'rain', label: 'Light rain' }, today: { sunrise: '05:44', sunset: '17:22', hi: 19 },
  hourly: [{ date: '2026-10-04', hour: 16, cond: 'rain', rain: 80 }, { date: '2026-10-04', hour: 18, cond: 'cloudy', rain: 10 }] };
test('the arrival card: a city from the calendar, the clocks, the greeting and up to 3 chips in order', () => {
  const m = L.trArrivalModel({ now: T, place: tokyo, home: HOME, source: 'calendar', weather: rainy, leg: { mode: 'flight', arrive: T - 3600000, to: { iata: 'HND' } },
    meetings: [{ title: 'Weekly sync', start: T + 6 * 3600000, their: [] }], rate: { ccy: 'JPY', perHome: 190 } });
  assert.equal(m.title, 'Welcome to Tokyo');
  assert.equal(m.overline, 'Landed · Tokyo, Japan');
  assert.equal(m.local.label, '15:42'); assert.equal(m.home.label, '07:42');
  assert.equal(m.diffMin, 480); assert.equal(m.diffLabel, '+8 h');
  assert.equal(m.greeting.lang, 'ja'); assert.equal(m.greeting.slot, 'a', '15:42 is the afternoon');
  assert.equal(m.sceneKind, 'towers'); assert.equal(m.actor, 'arrive'); assert.equal(m.cond, 'rain');
  assert.deepEqual(m.chips.map(c => c.kind), ['meeting', 'weather', 'currency'], 'the re-timed meeting first, then weather, then the currency');
  assert.equal(m.chipsFull.length, 4, 'the full card adds a fourth chip');
  assert.match(m.chips[0].html, /Weekly sync is now <b>21:42<\/b> here/);
  assert.match(m.chips[1].html, /18°.*until 18:00/);
  assert.match(m.chips[2].html, /¥190/);
  assert.match(m.stamp, /HND · 14:42/);
  assert.equal(L.trMomentAnnounce(m), 'Welcome to Tokyo. It is 15:42 here, 8 hours ahead of London. New country, new chapter. Your dashboard came along for the ride.');
});

test('zone-only, rail, night, half-hour and date-line arrivals', () => {
  const z = L.trArrivalModel({ now: T, place: { cc: 'JP', zone: 'Asia/Tokyo', label: 'Japan' }, home: HOME, source: 'zone' });
  assert.equal(z.title, 'Welcome to Japan', 'only the zone: the country');
  assert.match(z.overline, /^On Tokyo time · Japan$/);
  assert.equal(z.actor, 'none', 'no actor for a zone-only arrival');
  const r = L.trArrivalModel({ now: T, place: { cc: 'FR', cityId: 'paris-fr', zone: 'Europe/Paris', label: 'Paris', kind: 'city' }, home: HOME, source: 'calendar', leg: { mode: 'train', arrive: T - 600000 } });
  assert.match(r.overline, /^Arrived · Paris, France$/); assert.equal(r.actor, 'rail');
  assert.equal(r.diffLabel, '+1 h');
  // 01:20 in Tokyo: the night copy and only the weather chip.
  const n = L.trArrivalModel({ now: Date.UTC(2026, 9, 3, 16, 20), place: tokyo, home: HOME, source: 'calendar', weather: rainy, rate: { perHome: 190 } });
  assert.equal(n.night, true);
  assert.match(n.greeting.text, /^It's 01:20 in Tokyo\.$/); assert.equal(n.greeting.roman, 'Sleep well; tomorrow starts light.');
  assert.ok(n.chips.length <= 1 && (!n.chips.length || n.chips[0].kind === 'weather'));
  const k = L.trArrivalModel({ now: T, place: { cc: 'IN', zone: 'Asia/Kolkata', label: 'India' }, home: HOME, source: 'zone' });
  assert.equal(k.diffLabel, '+4 h 30');
  assert.deepEqual(L.trCountStrip(k.diffMin).steps, ['+0 h', '+1 h', '+2 h', '+3 h', '+4 h 30']);
  const kir = L.trArrivalModel({ now: Date.UTC(2026, 9, 4, 20, 0), place: { cc: 'KI', zone: 'Pacific/Kiritimati', label: 'Kiribati' }, home: HOME, source: 'zone' });
  assert.match(kir.diffLabel, /^\+13 h · tomorrow there$/);
  // Greetings by the local hour.
  for (const [h, slot] of [[7, 'm'], [13, 'a'], [19, 'e'], [22, 'h']]) {
    const t = Date.UTC(2026, 9, 4, (h - 9 + 24) % 24, 0) + (h - 9 < 0 ? 0 : 0);
    const g = L.trArrivalModel({ now: t, place: tokyo, home: HOME, source: 'calendar' }).greeting;
    assert.equal(g.slot, slot, `${h}:00`); assert.equal(g.lang, 'ja');
  }
  // User text in the chips is escaped.
  const e = L.trArrivalModel({ now: T, place: tokyo, home: HOME, source: 'calendar', meetings: [{ title: '<img src=x onerror=1>', start: T + 3600000 }] });
  assert.ok(!/<img/.test(e.chips.map(c => c.html).join('')));
});

test('welcome home and the departure card', () => {
  const h = L.trHomeModel({ now: Date.UTC(2026, 9, 9, 18, 40), home: Object.assign({ cityId: 'london-gb' }, HOME),
    trip: { id: 'trip-a', dest: { label: 'Tokyo', cc: 'JP' }, from: '2026-10-04', to: '2026-10-09', groupEvents: ['a', 'b', 'c'], spending: { byCcy: { JPY: { orig: 48200, home: 254 } } } }, bodyDiffMin: -480 });
  assert.equal(h.title, 'Welcome home');
  assert.equal(h.egg.id, 'home-country');
  assert.equal(h.egg.extraMs, 2500);
  assert.equal(h.line, '6 days in Tokyo. The dashboard is back on London time.');
  assert.deepEqual(h.counts.map(c => c.n), [6, 3]);
  assert.deepEqual(h.spend, [{ ccy: 'JPY', amt: 48200 }]);
  assert.match(h.chips.map(c => c.html).join(' '), /Body clock still <b>8 h ahead<\/b>/);
  assert.equal(h.actor, 'home');
  const leg = { eventId: 'ev-1', mode: 'flight', code: 'BA 7', depart: ms('2026-10-04T07:10:00+01:00'), arrive: ms('2026-10-05T07:40:00+09:00'), arriveZone: 'Asia/Tokyo',
    from: { label: 'London', cc: 'GB' }, to: { label: 'Tokyo', cc: 'JP', zone: 'Asia/Tokyo' } };
  const d = L.trDepartModel({ now: ms('2026-10-04T04:00:00+01:00'), zone: 'Europe/London', home: { zone: 'Europe/London', cc: 'GB', cityId: 'london-gb' }, leg, packed: { done: 9, total: 11 }, checkedIn: true });
  assert.equal(d.title, 'Have a good trip');
  assert.equal(d.overline, 'Today · flight 07:10');
  assert.equal(d.lineText, 'BA 7 · London → Tokyo. Lands the next day, 07:40 Tokyo time (23:40 here).');
  assert.deepEqual(d.chips.map(c => c.kind), ['checkin', 'pack']);
  assert.equal(d.actor, 'depart'); assert.equal(d.homeCc, 'GB'); assert.equal(d.destCc, 'JP');
});

test('a zone abroad with no calendar trip gives a country-level arrival after the 2-min hold', () => {
  const now = ms('2026-10-08T09:00:00+09:00');
  const changes = [{ at: new Date(now - 3 * 60000).toISOString(), from: 'Europe/London', to: 'Asia/Tokyo' }];
  const s = snap({ now, zone: 'Asia/Tokyo', system: 'Asia/Tokyo', changes });
  const a = s.moments.find(m => m.kind === 'arrive');
  assert.ok(a, 'an arrival is due');
  assert.match(a.key, /^arrive:trip-[a-z0-9]+:JP$/);
  assert.equal(a.key, TL.trMomentKey('arrive', { tripId: TL.get('_trlTripId')('zone', now - 3 * 60000), cc: 'JP' }), 'the id the unplanned trip will have');
  const early = snap({ now, zone: 'Asia/Tokyo', system: 'Asia/Tokyo', changes: [{ at: new Date(now - 60000).toISOString(), from: 'Europe/London', to: 'Asia/Tokyo' }] });
  assert.ok(!early.moments.some(m => m.kind === 'arrive'), 'not before 2 min');
  // A flight that landed: the arrival names the city.
  const fl = snap({ now, zone: 'Asia/Tokyo', system: 'Asia/Tokyo', events: [timed('f1', 'BA 7 LHR → HND', { dateTime: '2026-10-07T11:00:00+01:00', timeZone: 'Europe/London' }, { dateTime: '2026-10-08T07:30:00+09:00', timeZone: 'Asia/Tokyo' })], changes });
  const fa = fl.moments.find(m => m.kind === 'arrive');
  assert.ok(fa && fa.leg, 'a leg arrival');
});

// ─── the scene, the dial, the rolls ────────────────────────────────────────
test('the scene generator: every kind, time of day, weather and actor is well-formed and safe', () => {
  for (const kind of L.TM_KINDS) for (const tod of L.TM_TODS) for (const mode of ['arrive', 'rail', 'depart', 'home', 'none']) {
    const cond = mode === 'rail' ? 'snow' : tod === 'night' ? 'clear' : 'rain';
    const svg = L.trSceneSvg({ kind, seed: kind + tod, tod, cond, mode, loops: L.trLoopAllot(L.TM_LOOP_ORDER, 'standard'), month: 12 });
    assert.equal(wellFormed(svg), null, `${kind}/${tod}/${mode}: ${wellFormed(svg)}`);
    assert.ok(!/NaN|undefined|Infinity/.test(svg), `${kind}/${tod}/${mode} has a bad number`);
    assert.ok(!/<script|on[a-z]+=|javascript:|href=/i.test(svg));
    assert.ok(svg.length < 28000, `${kind}/${tod}/${mode}: ${svg.length} bytes`);
  }
  // The same city always looks the same; no user text gets in (the seed only seeds).
  const a = L.trSceneSvg({ kind: 'towers', seed: 'tokyo-jp', tod: 'day', uid: 'x' }), b = L.trSceneSvg({ kind: 'towers', seed: 'tokyo-jp', tod: 'day', uid: 'x' });
  assert.equal(a, b);
  assert.ok(!L.trSceneSvg({ kind: 'towers', seed: '<b>"x"</b>', tod: 'day', uid: '"><script>' }).includes('<b>'));
  // Wet skies hide the sun; night skies have stars and lit windows; the nordic aurora is Nov-Mar.
  assert.ok(!/trm-orb/.test(L.trSceneSvg({ kind: 'oldtown', seed: 's', tod: 'day', cond: 'rain' })));
  assert.ok(/trm-orb-sun/.test(L.trSceneSvg({ kind: 'oldtown', seed: 's', tod: 'day', cond: 'clear' })));
  const night = L.trSceneSvg({ kind: 'towers', seed: 's', tod: 'night', cond: 'clear' });
  assert.ok(/trm-tw/.test(night) && /trm-win/.test(night));
  assert.deepEqual(L.trSceneLoops(night).sort(), ['clouds', 'glow', 'stars', 'windows'].sort());
  assert.ok(/trm-aur/.test(L.trSceneSvg({ kind: 'nordic', seed: 's', tod: 'night', month: 1 })));
  assert.ok(!/trm-aur/.test(L.trSceneSvg({ kind: 'nordic', seed: 's', tod: 'night', month: 7 })));
  // The scene reads the shared sky tokens, through its own CSS (one sky with the brief).
  const css = readFileSync(join(ROOT, 'src', 'styles', '69-travel-moments.css'), 'utf8');
  for (const tod of L.TM_TODS) assert.match(css, new RegExp(`data-tod="${tod}"\\] \\{ --trm-s1: var\\(--sky-${tod}-1\\)`));
  const tokens = readFileSync(join(ROOT, 'src', 'styles', '76-scenes.css'), 'utf8');
  for (const tod of L.TM_TODS) for (const i of [1, 2, 3]) assert.match(tokens, new RegExp(`--sky-${tod}-${i}:`));
  // Travel moments animate transform and opacity only (plus nothing else).
  for (const kf of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)) {
    const props = [...kf[2].matchAll(/([a-z-]+)\s*:/g)].map(x => x[1]).filter(p => p !== 'animation-timing-function');
    for (const p of props) assert.ok(['transform', 'opacity'].includes(p), `@keyframes ${kf[1]} animates ${p}`);
  }
});

test('the dial sweeps by the true difference; the hour roll ends on the local hour', () => {
  const a = L.trDialAngles({ h: 15, m: 42, diffMin: 480 });
  assert.equal(a.to.h, 15 % 12 * 30 + 21); assert.equal(a.to.m, 252);
  assert.equal(a.to.h - a.from.h, 240, 'the hour hand turns 8 h');
  assert.equal(a.to.m - a.from.m, 3 * 360, 'the minute hand: at most 3 turns');
  const w = L.trDialAngles({ h: 2, m: 30, diffMin: -330 });
  assert.equal(w.to.h - w.from.h, -165); assert.equal(w.to.m - w.from.m, -(30 * 6 + 3 * 360));
  assert.deepEqual(L.trDialAngles({ h: 9, m: 0, diffMin: 0 }).from, L.trDialAngles({ h: 9, m: 0, diffMin: 0 }).to);
  const s = L.trHourStrip(7 * 60 + 42, 480);
  assert.deepEqual(s, { hours: ['07', '08', '09', '10', '11', '12', '13', '14', '15'], n: 8, west: false });
  const west = L.trHourStrip(20 * 60, -330);
  assert.equal(west.west, true); assert.equal(west.hours[0], '14', 'west: the resting place (top) is the local hour'); assert.equal(west.hours[west.n], '20');
  assert.deepEqual(L.trHourStrip(23 * 60, 120).hours, ['23', '00', '01'], 'past midnight');
  assert.deepEqual(L.trHourStrip(13 * 60, 60, { h12: true }).hours, ['1', '2']);
  assert.equal(L.trCountStrip(0).final, 'Same time as home');
  const svg = L.trDialSvg({ h: 15, m: 42, diffMin: 480, night: false });
  assert.equal(wellFormed(svg), null); assert.match(svg, /is-sweep/); assert.match(svg, /--trm-from:-?\d/);
});

// ─── the library's travel block ────────────────────────────────────────────
const NEW = ['landing', 'takeoff', 'layover', 'hotel', 'ferry', 'coach', 'passport', 'packing', 'checkin', 'currency', 'jetlag', 'homecoming', 'oldtown', 'tropical'];
test('the 12 travel scenes and 2 motifs follow the library contract', () => {
  const css = readFileSync(join(ROOT, 'src', 'styles', '71-anim-library.css'), 'utf8');
  for (const t of NEW) {
    const s = L.ANIM_SCENES.find(x => x.type === t);
    assert.ok(s, t);
    assert.equal(s.cat, 'travel', t);
    assert.ok(Array.isArray(s.keywords) && typeof s.match === 'function' && typeof s.svg === 'function', t);
    const svg = L.animSceneSvg(t);
    assert.equal(wellFormed(svg), null, t);
    assert.ok(/class="[^"]*\bx-/.test(svg), `${t} moves`);
    for (const m of svg.matchAll(/class="([^"]+)"/g)) for (const c of m[1].split(/\s+/)) if (c.startsWith('x-')) assert.match(css, new RegExp(`\\.${c}\\s*\\{[^}]*--an:`), `${t}: .${c}`);
  }
  // The reduced frame: the library stops every scene at its first frame under reduced motion.
  assert.match(css, /html\[data-motion="reduced"\] \.anim-scene \*/);
  const cls = (title, o) => L.animClassify(Object.assign({ kind: 'event', title }, o || {})).type;
  const now = Date.UTC(2026, 9, 4, 12);
  const fl = 'BA 117 LHR → JFK';   // the library's flight code wants 2-4 digits
  assert.equal(cls(fl, { now, startMs: now + 5 * 3600000, endMs: now + 13 * 3600000 }), 'takeoff', 'a flight within 24 h');
  assert.equal(cls(fl, { now, startMs: now - 15 * 3600000, endMs: now - 2 * 3600000 }), 'landing', 'landed in the last 36 h');
  assert.equal(cls(fl, { now, startMs: now - 3600000, endMs: now + 3600000 }), 'flight', 'in the air');
  assert.equal(cls(fl, { now, startMs: now - 50 * 3600000, endMs: now - 40 * 3600000 }), 'flight', 'landed long ago');
  assert.equal(cls(fl), 'flight', 'no times: a flight');
  assert.equal(cls('Hotel check-in'), 'hotel');
  assert.equal(cls('Ferry to Dieppe'), 'ferry');
  assert.equal(cls('Flixbus to Bristol'), 'coach');
  assert.equal(L.animClassify({ kind: 'task', id: 't1', title: 'Apply for ESTA' }).type, 'passport');
  assert.equal(L.animClassify({ kind: 'task', id: 't2', title: 'Pack for Tokyo' }).type, 'packing');
  assert.equal(L.animClassify({ kind: 'task', id: 't3', title: 'Check in online: BA 7' }).type, 'checkin');
  assert.equal(L.animClassify({ kind: 'task', id: 't4', title: 'Get travel money' }).type, 'currency');
  assert.equal(cls('Flight home'), 'homecoming');
  assert.equal(L.animClassify({ kind: 'task', id: 't5', title: 'Renew passport form' }).type, 'admin', 'forms stay admin');
  assert.ok(L.BRIEF_TRAVEL_TYPES.includes('takeoff') && L.BRIEF_TRAVEL_TYPES.includes('landing'), "the brief's trip card sees the new transport scenes");
});
