// The static preflight (tools/lib/world/preflight.mjs; docs/dev/WORLD_ENGINE.md 16.7): what the full invariant gate will report,
// predicted from the three season worlds in about a second a scene. Measured against recorded gate runs (E1, 22 Oct):
//   MediaCity piazza (positive): the gate's 15 cells reported the tram body overlapping fill-15 (a lamppost, every date) and fill
//     birches that differ by date (fill-125 in January, fill-75 in July, fill-135 and fill-76 in October), at t 167.6 / 200.6 /
//     201.6 / 166.4 / 167.4 s. The preflight must list exactly those, season by season, at those gate frames.
//   Deansgate (manchester-centre-4, negative control): 15 of 15 clean: nothing predicted.
//   Kelham-3 (Alma Street): its parked cars stand in lane alma:f, so that lane never carries traffic: an advisory, not a fault.
//   Deansgate converted from its v2 source (lanes, positive): buses cut by the bottom edge and cars judged against the crossing road.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine, resolveRef, convertRef } from '../tools/lib/world/convert.mjs';
import { worldPreflight, preflightText, PREFLIGHT_STATIC_RULES, PREFLIGHT_ROUTE_RULES } from '../tools/lib/world/preflight.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const E = loadEngine({ root: ROOT });
const run = (id) => { const hit = resolveRef(E, 'world-test/' + id); assert.ok(hit, id); return worldPreflight(E, E.worldHostSpec(hit.item), { id }); };

test('the preflight judges with the gate\'s own rules (no rule of its own except the advisories)', () => {
  const gate = new Set((E.WORLD_INVARIANTS || []).map(r => r.rule));
  for (const r of PREFLIGHT_STATIC_RULES.concat(PREFLIGHT_ROUTE_RULES)) assert.ok(gate.has(r), `${r} is a gate rule`);
  for (const n of ['_wfrRec', '_wfrAgentEnt', '_wfrAgentFoot', '_wfrAbsent', '_wivSolids', '_wivPen', '_wtrFramedOffset']) assert.equal(typeof E.priv[n], 'function', n);
});

test('MediaCity: the tram sweep predicts the gate\'s overlaps season by season, at the gate\'s own frames', () => {
  const r = run('greater-manchester-mediacity-piazza-w3');
  const route = (season) => r.facts.filter(f => f.kind === 'route' && f.rule === 'overlap' && f.seasons.includes(season)).map(f => f.id).sort();
  assert.deepEqual(route('winter'), ['fill-125', 'fill-15']);
  assert.deepEqual(route('summer'), ['fill-15', 'fill-75']);
  assert.deepEqual(route('autumn'), ['fill-135', 'fill-15', 'fill-76']);
  assert.deepEqual(r.facts.filter(f => f.kind !== 'route'), [], 'no static fault and no advisory');
  const first = Object.fromEntries(r.facts.map(f => [f.id, f.first.t]));
  assert.deepEqual(first, { 'fill-15': 200.6, 'fill-125': 167.6, 'fill-75': 201.6, 'fill-135': 166.4, 'fill-76': 167.4 }, 'the first hits are the recorded gate frames');
  // each fact once, ranked: the one in every season first
  assert.equal(r.facts[0].id, 'fill-15');
  assert.equal(new Set(r.facts.map(f => f.rule + '|' + f.id)).size, r.facts.length);
  for (const f of r.facts) { assert.equal(f.sev, 'error'); assert.match(f.msg, /vehicle\.metrolink-m5000 \(on tramway:b\)/); assert.ok(f.fix && f.owner, f.id); }
  const txt = preflightText(r, 'mediacity');
  assert.match(txt, /5 predicted gate fault\(s\)/);
  assert.match(txt, /FAIL overlap fill-125: .*\(fix: /);
  assert.ok(r.ms.total < 20000, 'seconds, not minutes: ' + r.ms.total);
});

test('Deansgate (negative control): a scene the gate passes 15 of 15 has nothing predicted', () => {
  const r = run('greater-manchester-manchester-centre-4-w3');
  assert.deepEqual(r.facts, []);
  assert.ok(r.dates.length === 3 && r.dates.every(D => D.counts.lanes === 4 && D.counts.lanePoses > 0), 'its four lanes were swept in every season');
  assert.match(preflightText(r), /nothing predicted/);
});

test('lanes, positive: Deansgate converted from its v2 source (buses and cars on the near road) predicts what one gate cell finds', () => {
  // measured 23 Oct: one gate cell (2026-01-15 dawn, 360 s at 5 Hz) of this conversion reported the Rylands drawing overlapping a
  // carried building at every frame, buses cut by the bottom edge (t 165.4, 327.4) and cars 'on the right of xing' (the crossing
  // road's line at the junction, from t 0.4): every one of those rule classes must be predicted, on the lanes it happens on
  const c = convertRef('uk-north-manchester-centre/greater-manchester-manchester-centre-4', { root: ROOT, E, critic: false });
  const r = worldPreflight(E, c.spec, { id: 'deansgate-from-v2' });
  const keys = new Set(r.facts.filter(f => f.sev === 'error').map(f => f.kind + ' ' + f.rule + ' ' + f.id));
  for (const k of ['route edgeCut deansgate:f', 'route edgeCut deansgate:b', 'route laneDir deansgate:f', 'route laneDir deansgate:b']) assert.ok(keys.has(k), k + ' in ' + [...keys].join('; '));
  assert.ok(r.facts.some(f => f.kind === 'static' && f.rule === 'overlap' && /mcr-john-rylands/.test(f.id) && /gen-b2/.test(f.msg)), 'the landmark against the carried building');
  assert.ok(r.facts.filter(f => f.kind === 'route' && f.rule === 'edgeCut').every(f => /bus-double-decker/.test(f.msg)), 'the cut mover is the bus');
});

test('Kelham-3: parked cars in a lane are an advisory (laneBlocked), never a gate fault', () => {
  const r = run('sheffield-kelham-3-w3');
  assert.deepEqual(r.facts.filter(f => f.sev === 'error'), []);
  const lb = r.facts.filter(f => f.rule === 'laneBlocked');
  assert.equal(lb.length, 1);
  assert.equal(lb[0].id, 'alma:f');
  assert.equal(lb[0].sev, 'advice');
  assert.deepEqual(lb[0].seasons.slice().sort(), ['autumn', 'summer', 'winter']);
  assert.match(lb[0].msg, /vehicle\.car/);
});
