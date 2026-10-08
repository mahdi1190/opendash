// The scene engine core (docs/dev/SCENE_ENGINE.md sections 2 to 5 and 8): objects, compile determinism and LOD, scatter rules,
// the grade's parity with the kit, seasons, wind, archetypes / tables / batches, sceneFromArchetype's patch semantics,
// sceneKitPick, sign text, and composed items in the registry (validation, the canvas branch of animItemHtml).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { loadRegistry } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = loadRegistry(ROOT);
const G = REG.R.get;
const E = new Proxy({}, { get: (_, n) => G(n) });

const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
E.sceneObjDefine({ id: 'plant.coretest', category: 'plant', size: [20, 20], variants: 2, seasonal: true,
  palette: { base: { leaf: ['#336633', '#448844'] }, autumn: { leaf: ['#996633', '#aa7744'] }, winter: { leaf: ['#667766', '#778877'] } },
  anim: { sway: { part: 'body', pivot: [0, -10], deg: 2 } }, tags: ['kit:coretest', 'role:ground'], build: (v, r) => ({ body: [['@leaf.' + v, rect(-10, -20, 20, 20)]] }) });
E.sceneObjDefine({ id: 'building.coretest', category: 'building', size: [100, 80], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
  night: { glow: { window: '#ffd98a' }, on: 0.5 }, tags: ['kit:coretest', 'role:building-mid', 'signature'], weight: 3,
  build: () => ({ body: [['#884422', rect(-50, -80, 100, 80)], { f: '#334455', d: rect(-40, -60, 10, 10), glow: 'window' }, { f: '#334455', d: rect(-20, -60, 10, 10), glow: 'window' }], lit: [{ f: '#ffeeaa', d: rect(-50, -10, 100, 10), op: 0.3 }] }) });
const scene = (over = {}) => Object.assign({ v: 1, id: 'core-test', view: { lat: 51.5, lon: -0.1, horizon: 500 }, season: 'auto',
  place: [{ obj: 'building.coretest', x: 800, y: 700, layer: 'mid' }],
  scatter: [{ obj: 'plant.coretest', layer: 'near', seed: 3, area: { rect: [0, 700, 1600, 900] }, n: 300, minGap: 12, s: [0.8, 1.2], variant: 'random', tint: { col: '#887744', k: [0, 0.2] } },
    { obj: 'plant.coretest', layer: 'fore', seed: 4, area: { poly: [[0, 820], [1600, 820], [1600, 900], [0, 900]] }, n: 120, minGap: 10, anim: 'strip', mask: { noise: { scale: 200, cut: 0.4 }, avoid: [{ rect: [700, 820, 900, 900] }] } }],
  actors: [{ obj: 'plant.coretest', layer: 'near', path: [[0, 800], [1600, 800]], speed: 10 }] }, over);

test('objects: define, resolve palettes per season, memoise, box, kit hooks, problems', () => {
  const a = E.sceneObjShapes('plant.coretest', 1, 'summer'), b = E.sceneObjShapes('plant.coretest', 1, 'summer');
  assert.equal(a, b, 'memoised per (id, v, season)');
  assert.equal(a.parts.body[0].f, '#448844');
  assert.equal(E.sceneObjShapes('plant.coretest', 1, 'autumn').parts.body[0].f, '#aa7744');
  assert.equal(E.sceneObjShapes('plant.coretest', 9, 'summer').parts.body[0].f, '#448844', 'the variant is clamped');
  assert.deepEqual(a.anim.map(x => x.kind), ['sway']);
  assert.ok(a.box[0] <= -10 && a.box[1] <= -20 && a.box[2] >= 10 && a.box[3] >= 0, 'the box covers the shapes');
  assert.equal(E.sceneObjShapes('building.coretest', 0, 'winter'), E.sceneObjShapes('building.coretest', 0, 'summer'), 'a non-seasonal object resolves once');
  assert.deepEqual(E.sceneObjCheck('plant.coretest'), []);
  assert.throws(() => E.sceneObjDefine({ id: 'Bad Id', build() {} }), /bad id/);
  assert.equal(E.sceneObj('nope.nope'), null);
  // a kit adapter object carries its hooks through $anim
  if (typeof G('sceneObjFromKit') === 'function') {
    const sh = E.sceneObjShapes('tree.oak', 0, 'summer');
    assert.ok(sh && sh.order.length >= 1);
  }
});

test('compile: deterministic, memoised, sorted, LOD thins scatter only, strips, glow and lit, stats', () => {
  const d1 = scene(), d2 = scene();
  const A = E.sceneCompile(d1, { season: 'summer', lod: 1 }), B = E.sceneCompile(d2, { season: 'summer', lod: 1 });
  assert.equal(E.sceneCompile(d1, { season: 'summer', lod: 1 }), A, 'memoised on (data, season, lod)');
  assert.deepEqual(JSON.parse(JSON.stringify(A.items)), JSON.parse(JSON.stringify(B.items)), 'the same data expands to the same placements');
  for (let i = 1; i < A.items.length; i++) { const p = A.items[i - 1], q = A.items[i]; assert.ok(p.layer < q.layer || (p.layer === q.layer && p.z <= q.z), 'sorted by layer then z'); }
  const lo = E.sceneCompile(d1, { season: 'summer', lod: 0.3 });
  assert.ok(lo.items.length < A.items.length * 0.5, 'LOD thins the scatter');
  assert.ok(lo.items.some(i => i.o === 'building.coretest') && lo.actors.length === 1, 'hand placements and actors are always kept');
  assert.ok(A.strips.length > 0 && A.strips.every(s => s.items.every(k => A.items[k].strip >= 0)), 'strip rules make wind strips');
  const b = A.items.find(i => i.o === 'building.coretest');
  assert.equal(b.lit, true); assert.equal(b.glowOn.length, 2);
  assert.ok(A.items.filter(i => i.tint).every(i => [0.08, 0.16, 0.24].includes(i.tint[1])), 'tints are bucketed');
  assert.equal(A.stats.placements, A.items.length);
  assert.equal(A.stats.animatedDraws, A.stats.animatedParts + A.stats.strips + A.actors.reduce((n, a) => n + 1 + a.anim.length, 0) + A.stats.flockBirds);
  // minGap and masks
  const near = A.items.filter(i => i.layer === 3 && i.o === 'plant.coretest');
  for (let i = 0; i < near.length; i++) for (let j = i + 1; j < Math.min(near.length, i + 40); j++) assert.ok(Math.hypot(near[i].x - near[j].x, near[i].y - near[j].y) >= 11, 'minGap holds');
  assert.ok(!A.items.some(i => i.layer === 4 && i.x > 701 && i.x < 899), 'the avoid mask holds');
  assert.equal(E.sceneScaleBucket(1), 1); assert.ok(Math.abs(E.sceneScaleBucket(1.1) - 2 ** 0.25) < 1e-9 || E.sceneScaleBucket(1.1) === 1);
});

test('validate: the listed problems', () => {
  assert.deepEqual(E.sceneValidate(scene()), []);
  const p = E.sceneValidate(scene({ view: {}, setting: 'space', layers: new Array(9).fill(0).map((_, i) => ({ id: 'l' + i, depth: 1 })), place: [{ obj: 'nope.x', layer: 'mid' }],
    scatter: [{ obj: 'plant.coretest', area: { rect: [0, 0, 0, 0] } }, { obj: 'plant.coretest', area: { rect: [0, 0, 100, 100] }, n: 5000 }], actors: [{ obj: 'plant.coretest', path: [[0, 0]] }],
    signs: new Array(7).fill({ text: 'Mind the gap' }) }));
  for (const re of [/view.lat/, /at most 8 layers/, /unknown setting/, /unknown object nope.x/, /empty or bad area/, /above 3000/, /at least 2 points/, /at most 6 signs/, /signage: true/, /deny-list/]) assert.ok(p.some(x => re.test(x)), 'reports ' + re);
});

test('the grade is the kit\'s K.toneStr; seasons north, south and tropic; the wind field', () => {
  const K = G('ukNatureKit')(G('animSceneKit')());
  for (const at of ['dawn', 'noon', 'golden', 'dusk', 'night', 'afternoon']) {
    const L = E.sceneLight({}, { lat: 51.3, lon: -0.8, at, season: 'summer' });
    const tone = E.sceneTone(L);
    let r = 7;
    for (let i = 0; i < 200; i++) { r = (r * 1103515245 + 12345) >>> 0; const c = '#' + (r & 0xffffff).toString(16).padStart(6, '0'); assert.equal(tone(c), K.toneStr(L, `fill="${c}"`).slice(6, -1)); }
  }
  const jan = Date.UTC(2026, 0, 15), jul = Date.UTC(2026, 6, 15), oct = Date.UTC(2026, 9, 15);
  assert.equal(E.sceneSeason(jan, 51, { season: 'auto' }), 'winter');
  assert.equal(E.sceneSeason(jul, -33, { season: 'auto' }), 'winter');
  assert.equal(E.sceneSeason(oct, 51, { season: 'auto' }), 'autumn');
  assert.equal(E.sceneSeason(jan, 1.3, { season: 'auto', tropic: 'summer' }), 'summer');
  assert.equal(E.sceneSeason(jan, 51, { season: 'spring' }), 'spring');
  assert.equal(E.sceneSeason(NaN, 51, { season: 'auto' }), 'summer');
  let lo = 9, hi = -9;
  for (let t = 0; t < 60; t += 0.25) for (const x of [0, 400, 1200]) { const w = E.sceneWind(t, x, { wind: 1 }); lo = Math.min(lo, w); hi = Math.max(hi, w); }
  assert.ok(lo > -1.7 && hi < 1.7 && hi - lo > 1, 'about -1.6 .. 1.6');
  assert.equal(E.sceneWind(3, 100, { wind: 0.5 }) * 2, E.sceneWind(3, 100, { wind: 1 }));
});

test('archetypes, tables and batches: thunks are not built at load; patch semantics; kit picks; sign text', () => {
  let builds = 0;
  E.sceneArchetypeDefine('coretest', { params: { id: 'id', name: 'sign', lines: 'list', lat: 'number', lon: 'number', era: ['old', 'new'] }, kits: ['coretest'],
    meta: (p) => ({ id: 'ct-' + p.id, label: p.name, site: p.name, tags: ['a', 'b', 'c', 'd', 'e', 'f'], mood: 'calm', colour: 'blue' }),
    build: (p, u) => { builds++; return { v: 1, id: 'ct-' + p.id, view: { lat: p.lat, lon: p.lon }, place: [{ obj: Object.keys(u.kit('building-mid'))[0], x: 800, y: 700, layer: 'mid' }, { obj: 'plant.coretest', x: 10, y: 800, layer: 'near' }], scatter: [{ obj: 'plant.coretest', area: { rect: [0, 800, 100, 900] }, n: 5 }], actors: [] }; } });
  E.sceneTableDefine('coretest', { cols: ['id', 'name', 'lines', 'lat', 'lon', 'era'], rows: [['one', 'One Road', 'a|b', 51.5, -0.1, 'old'], ['two', "King's Cross St. Pancras", 'a', 51.53, -0.12, 'weird']] });
  const rows = E.sceneTable('coretest');
  assert.deepEqual(rows[0].lines, ['a', 'b']); assert.deepEqual(rows[1].lines, ['a'], 'a list column splits in every row');
  assert.deepEqual(E.sceneArchetypeCheck('coretest', rows[1]), ['era: unknown value weird (old new)']);
  const items = E.sceneBatch('coretest', 'coretest', { when: () => false });
  assert.equal(items.length, 2); assert.equal(builds, 0, 'a batch builds nothing until a scene is shown');
  assert.equal(typeof items[0].scene, 'function'); assert.deepEqual(items[0].liveSky, { lat: 51.5, lon: -0.1 });
  const d = E.sceneData(items[0]);
  assert.equal(builds, 1); assert.equal(E.sceneData(items[0]), d, 'a thunk is evaluated once');
  assert.deepEqual(d.arch.params, rows[0]);
  // patch: append, drop, replace, view merge
  const params = { id: 'p', name: 'P', lat: 51, lon: 0, era: 'new' };
  const patch = { drop: { place: ['plant.coretest'], scatter: [0] }, place: [{ obj: 'plant.coretest', x: 5, y: 850, layer: 'fore' }], view: { heading: 90 }, at: 'dusk' };
  const x = E.sceneFromArchetype('coretest', params, patch);
  assert.equal(E.sceneFromArchetype('coretest', params, patch), x, 'memoised per (archetype, params, patch)');
  assert.deepEqual(x.place.map(p => p.obj), ['building.coretest', 'plant.coretest']); assert.equal(x.place[1].layer, 'fore');
  assert.equal(x.scatter.length, 0); assert.equal(x.view.heading, 90); assert.equal(x.view.lat, 51); assert.equal(x.at, 'dusk');
  assert.throws(() => E.sceneFromArchetype('coretest', params, { place: [{ obj: 'nope.x', x: 0, y: 0 }] }), /unknown object/, 'problems throw in Node');
  // kit picks: tags, weights, empty-safe
  assert.deepEqual(E.sceneKitPick(['coretest'], 'building-mid'), { 'building.coretest': 3 });
  assert.deepEqual(E.sceneKitPick(['coretest'], 'building-mid', { tags: ['nope'] }), {});
  assert.deepEqual(E.sceneKitPick(['nokit'], 'tree'), {});
  // sign text
  assert.equal(E.sceneSignText("  King's  Cross ").text, "King's Cross");
  assert.equal(E.sceneSignText('Elephant & Castle').ok, true);
  for (const bad of ['Underground', 'TfL station', 'mind the gap', '<b>x</b>', '', 'x'.repeat(41)]) assert.equal(E.sceneSignText(bad).ok, false, bad);
});

test('composed items pass animValidatePack and draw through animItemHtml (SVG in Node, the canvas markup when a canvas exists)', () => {
  const data = scene({ id: 'core-item' });
  const it = E.sceneItem({ id: 'core-item', label: 'Core item', site: 'test', tags: ['a', 'b', 'c', 'd', 'e', 'f'], mood: 'calm', colour: 'blue', when: () => false }, data);
  assert.deepEqual(it.liveSky, { lat: 51.5, lon: -0.1 });
  const v = G('animValidatePack')({ id: 'core-test-pack', name: 'Core', items: [it] });
  assert.equal(v.ok, true, v.errors.join('; '));
  const bad = G('animValidatePack')({ id: 'core-test-pack', name: 'Core', items: [Object.assign({}, it, { scene: null }), Object.assign({}, it, { id: 'r2', retro: 'x' })] });
  assert.ok(bad.errors.some(e => /needs scene/.test(e)) && bad.errors.some(e => /retro must be an object/.test(e)));
  G('animRegisterPack')({ id: 'core-test-pack', name: 'Core', items: [it] });
  const html = G('animItemHtml')('core-test-pack/core-item', { size: 'fill', lighting: false });
  assert.match(html, /<svg[^>]*viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"/);
  assert.ok(!/sc-canvas/.test(html), 'Node has no canvas: the SVG still');
  assert.equal(G('sceneItems')('nope').length, 0);
});

test('people: the depth ladder is 16 units at the horizon, linear below it, 150 at most; the archetypes size their walkers with it', () => {
  const view = { horizon: 520 };
  assert.equal(E.scenePersonHeight(view, 520), 16);
  assert.equal(E.scenePersonHeight(view, 900), 132);
  const [a, b, c] = [600, 700, 800].map(y => E.scenePersonHeight(view, y));
  assert.ok(a < b && b < c && Math.abs((b - a) - (c - b)) < 0.2, 'linear in y below the horizon');
  assert.equal(E.scenePersonHeight(view, 1000), 150, 'never above the care limit');
  assert.ok(Math.abs(E.scenePersonScale(64, 700, view) * 64 - b) < 0.1, 'the scale draws a 64-unit object at the ladder height');
  const data = E.sceneFromArchetype('basic', { id: 'ladder-test', lat: 51.5, lon: -0.1 });
  const people = data.actors.filter(x => E.sceneObj(x.obj).category === 'person');
  assert.ok(people.length >= 3);
  for (const x of people) assert.ok(Math.abs(x.s * E.sceneObj(x.obj).size[1] - E.scenePersonHeight(data.view, x.path[0][1])) < 0.2, x.obj + ' at its row');
});

test('size-tiered detail: two scale buckets of one person draw different shapes; objects without detailPx keep theirs', () => {
  const sh = E.sceneObjShapes('person.walker', 0, 'summer'), all = sh.order.flatMap(p => sh.parts[p]), tall = sh.box[3] - sh.box[1];
  const far = E.sceneScaleBucket(0.4), near = E.sceneScaleBucket(1.5), drawn = (sc) => all.filter(s => !s.detail || E.sceneDetailAt('person.walker', sh, sc));
  assert.ok(tall * far < E.SCENE_DETAIL_PX && tall * near >= E.SCENE_DETAIL_PX);
  assert.equal(drawn(near).length, all.length, 'near: every shape');
  assert.ok(drawn(far).length < all.length / 2 && drawn(far).length >= 15, 'far: the silhouette only (' + drawn(far).length + ' of ' + all.length + ')');
  assert.notEqual(E.sceneSpriteKey('person.walker', 0, '*', 'summer', 0, null, far, 'L'), E.sceneSpriteKey('person.walker', 0, '*', 'summer', 0, null, near, 'L'), 'the sprite key carries the scale');
  assert.equal(E.sceneDetailAt('building.coretest', E.sceneObjShapes('building.coretest', 0, 'summer'), 0.01), true, 'no detailPx: detail at any size');
  // the SVG renderer: the same walker far and near in one still
  const svg = E.sceneSvg({ v: 1, id: 'tier-test', view: { lat: 51.5, lon: -0.1, horizon: 500 }, season: 'summer', sky: false, particles: 'none', weather: 'none',
    place: [{ obj: 'person.walker', x: 400, y: 800, s: 0.4, layer: 'near', anim: false }, { obj: 'person.walker', x: 1200, y: 800, s: 1.5, layer: 'near', anim: false }] }, { size: 'fill' });
  const syms = [...svg.matchAll(/<g id="[^"]+">(.*?)<\/g>/g)].map(m => (m[1].match(/<path/g) || []).length).filter(n => n >= 15).sort((x, y) => x - y);
  assert.deepEqual(syms, [drawn(far).length, all.length], 'one symbol per tier');
});

test('people: the shared builder draws faceless heads (no mark inside the face) for every preset and season', () => {
  const P = G('scenePeople'), box = E.scenePathBox;
  const faceMarks = (f, extra = []) => {
    const h = f.head, zone = [h.x + 0.1 * h.rx, h.y - 0.4 * h.ry, h.x + 1.6 * h.rx, h.y + 0.85 * h.ry];   // the face side of the head (it faces right), a nose's reach
    return [...f.legB, ...f.body, ...f.legA, ...extra].map(sh => (Array.isArray(sh) ? { d: sh[1] } : sh)).filter(o => {
      const b = box(o.d, o.m), w = o.s ? (o.w || 1) / 2 : 0;
      return b && b[0] - w >= zone[0] && b[1] - w >= zone[1] && b[2] + w <= zone[2] && b[3] + w <= zone[3];
    });
  };
  assert.ok(P.PRESETS.length >= 8, '8 presets');
  for (const [i, p] of P.PRESETS.entries()) for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const f = P.figure(P.outfit(p, season));
    assert.ok(f.head && f.head.rx > 3 && f.head.y < -50, 'a head');
    assert.deepEqual(faceMarks(f).map(o => o.d), [], `preset ${i} ${season}: nothing on the face`);
  }
  // the check finds a face: an eye dot and a nose (the old figure's marks) inside the zone are caught
  const f = P.figure(P.outfit(P.PRESETS[0], 'summer')), h = f.head;
  assert.equal(faceMarks(f, [['#141010', E.sceneD.circ(h.x + 2.2, h.y - 0.6, 0.5)], ['#e8bfa0', `M${h.x + 3.4} ${h.y - 0.8}l1.6 1.8l-1.6 .6z`]]).length, 2);
});

// Archetype picks (8.6): a function of the scene's params and the SET of eligible objects, never of library load order.
test('sceneKitPick: weight 0 excludes an object, a missing weight is 1, keys in id order; sceneSlotRank is order-free', () => {
  const def = (id, weight) => E.sceneObjDefine(Object.assign({ id, category: 'plant', size: [20, 20], variants: 1, seasonal: false, tags: ['kit:coretest-w', 'role:shrub'],
    build: () => ({ body: [['#336633', rect(-10, -20, 20, 20)]] }) }, weight == null ? {} : { weight }));
  def('plant.coretest-w-zero', 0); def('plant.coretest-w-c'); def('plant.coretest-w-b', 0.5); def('plant.coretest-w-a', 2);
  const w = E.sceneKitPick(['coretest-w'], 'shrub');
  assert.deepEqual(w, { 'plant.coretest-w-a': 2, 'plant.coretest-w-b': 0.5, 'plant.coretest-w-c': 1 }, 'weight 0 is not eligible; no weight is 1');
  assert.deepEqual(Object.keys(w), ['plant.coretest-w-a', 'plant.coretest-w-b', 'plant.coretest-w-c'], 'id order, not definition order');
  const r = E.sceneSlotRank(w, 'scene|slot'), rev = E.sceneSlotRank(Object.fromEntries(Object.entries(w).reverse()), 'scene|slot');
  assert.deepEqual(rev, r, 'the rank ignores the order of the keys');
  assert.deepEqual(r.slice().sort(), Object.keys(w));
  assert.equal(E.sceneSlotRank({ 'x.a': 1, 'x.b': 0 }, 'k').includes('x.b'), false, 'weight 0 never ranks');
  assert.equal(E.sceneSlotPick({}, 'k'), null);
  // weights make a light object rare: over many slot keys the 2-weight object wins far more often than the 0.5 one
  const wins = { 'plant.coretest-w-a': 0, 'plant.coretest-w-b': 0, 'plant.coretest-w-c': 0 };
  for (let i = 0; i < 700; i++) wins[E.sceneSlotPick(w, 'k' + i)]++;
  assert.ok(wins['plant.coretest-w-a'] > wins['plant.coretest-w-c'] && wins['plant.coretest-w-c'] > wins['plant.coretest-w-b'], JSON.stringify(wins));
});

test('scatter maxH: an object taller than the cap is scaled down as a whole (spread kept); skyline-water far rows stay under the sky', () => {
  const d = scene({ id: 'core-maxh', place: [], actors: [], scatter: [{ obj: 'building.coretest', layer: 'far', seed: 5, area: { rect: [0, 600, 1600, 610] }, n: 12, minGap: 40, s: [0.8, 1.6], maxH: 64, variant: 0 }] });
  const ss = E.sceneCompile(d, { season: 'summer', lod: 1 }).items.map(i => i.s);
  assert.equal(ss.length, 12);
  assert.ok(ss.every(s => s * 80 <= 64), 'placed heights within maxH: ' + ss.join(' '));
  assert.ok(Math.max(...ss) / Math.min(...ss) > 1.5, 'the size spread is kept');
  const ny = G('_ANIM_REGION_UPGRADES').us['place:new-york'].scene(), H = ny.view.horizon;
  const C = E.sceneCompile(ny, { season: 'summer', lod: 1 }), far = C.layers.find(l => l.id === 'far').i;
  const towers = C.items.filter(i => i.layer === far && /^building\./.test(i.o));
  assert.ok(towers.some(i => i.o === 'building.skyscraper'), 'the far row draws the skyscraper');
  for (const i of towers) assert.ok(i.s * E.sceneObj(i.o).size[1] <= Math.round(H * 0.8), `${i.o} ${i.s}: ${Math.round(i.s * E.sceneObj(i.o).size[1])} units tall`);
});

let _fresh = null;
const freshReg = () => _fresh || (_fresh = loadRegistry(ROOT, { fresh: true }).R.get);
const pilots = (R) => { const up = R('_ANIM_REGION_UPGRADES'); return { singapore: up.asia['place:singapore'], 'new-york': up.us['place:new-york'], jp: up.asia['country:JP'] }; };
const rebuild = (R) => { R('_scKitPickMemo').clear(); R('_scFromArchMemo').clear(); };

test('archetype picks: the three pilots and the station demo compile identically with the library registered in reversed and shuffled order', () => {
  const R = freshReg(), objs = R('_scObjs'), orig = [...objs.entries()];
  const build = () => {
    rebuild(R);
    const ds = Object.entries(pilots(R)).map(([k, u]) => [k, u.scene()]);
    for (const row of R('sceneTable')('london-demo')) ds.push(['station-' + row.id, R('sceneFromArchetype')('station', Object.assign({}, row))]);
    return ds.map(([k, d]) => { const C = R('sceneCompile')(d, { season: 'summer', lod: 1 });
      return [k, JSON.stringify({ data: d, items: C.items.map(i => [i.o, i.v, i.x, i.y, i.s, i.flip, i.layer]), actors: C.actors.map(a => [a.o, a.v, a.s, a.layer]), flocks: C.flocks.map(f => [f.o, f.n]) }, (_, v) => (typeof v === 'function' ? undefined : v))]; });
  };
  const reorder = (es) => { objs.clear(); for (const [k, v] of es) objs.set(k, v); };
  try {
    const A = build();
    assert.equal(A.length, 6);
    reorder(orig.slice().reverse());
    const B = build();
    let s = 2024; const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    const sh = orig.slice(); for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
    reorder(sh);
    assert.notEqual([...objs.keys()].join(), orig.map(e => e[0]).join(), 'the shuffle moved the registration order');
    const S = build();
    for (let i = 0; i < A.length; i++) {
      assert.ok(A[i][1] === B[i][1], A[i][0] + ': identical with the library reversed');
      assert.ok(A[i][1] === S[i][1], A[i][0] + ': identical with the library shuffled');
    }
  } finally { reorder(orig); rebuild(R); }
});

test('archetype picks: a new eligible tree takes the framing slot only when it wins the slot hash; a scene\'s own picks hold', () => {
  const R = freshReg();
  // the archetype alone (Singapore's params row, no patch: the hash decides) and the pilot (its patch names its own picks)
  const frame = () => { rebuild(R); return R('sceneFromArchetype')('skyline-water', pilots(R).singapore.scene().arch.params).place.filter(p => p.layer === 'front').map(p => p.obj); };
  const own = () => { rebuild(R); return pilots(R).singapore.scene().place.filter(p => p.layer === 'front').map(p => p.obj); };
  const before = frame(), mine = own(), trees = R('sceneKitPick')(['tropical'], 'tree');
  assert.deepEqual(mine, ['plant.palm-coconut-tall', 'tree.rain-tree'], 'the pilot\'s own frame picks');
  assert.equal(before.length, 2);
  assert.equal(before[0], R('sceneSlotPick')(trees, 'singapore|frame'), 'the left frame is the slot\'s pick');
  // construct both cases: a dummy that loses the slot hash and one that wins it
  let loser = null, winner = null;
  for (let i = 0; i < 400 && !(loser && winner); i++) {
    const id = 'tree.sqdummy-' + i, top = R('sceneSlotRank')(Object.assign({}, trees, { [id]: 1 }), 'singapore|frame')[0];
    if (top === id) winner = winner || id; else loser = loser || id;
  }
  assert.ok(loser && winner);
  const dummy = (id) => R('sceneObjDefine')({ id, category: 'tree', size: [100, 300], variants: 3, seasonal: false, tags: ['kit:tropical', 'role:tree'],
    build: () => ({ body: [['#335533', rect(-50, -300, 100, 300)]] }) });
  dummy(loser);
  assert.deepEqual(frame(), before, 'a new tree that loses the hash moves no framing tree');
  dummy(winner);
  assert.deepEqual(frame(), [winner, before[0]], 'the winner takes the left frame, the old holder moves to the right');
  assert.deepEqual(own(), mine, 'a scene that names its own frame picks keeps them, even against a winner');
});

test('archetype picks: a scene\'s own picks lead a slot and its own mix replaces a role\'s dict, both cut to the eligible ids', () => {
  assert.deepEqual(E.sceneSlotRank({ 'x.a': 1, 'x.b': 1, 'x.c': 1 }, 'k', ['x.c', 'x.none', 'x.a']).slice(0, 2), ['x.c', 'x.a'], 'preferred ids first, in their order');
  assert.deepEqual(E.sceneSlotRank({ 'x.a': 1, 'x.b': 1 }, 'k', ['x.none']), E.sceneSlotRank({ 'x.a': 1, 'x.b': 1 }, 'k'), 'an id that is not eligible falls back to the hash');
  assert.deepEqual(E.sceneSlotRank({ 'x.a': 1, 'x.b': 0 }, 'k', ['x.b']), ['x.a'], 'weight 0 is never preferred');
  const sg = G('_ANIM_REGION_UPGRADES').asia['place:singapore'].scene(), params = sg.arch.params;
  const build = (patch) => E.sceneFromArchetype('skyline-water', params, patch);
  const quay = (d) => d.scatter.find(r => r.layer === 'mid' && r.seed === 15).obj;
  const left = (d) => d.place.find(p => p.layer === 'front').obj;
  const plain = build({});
  assert.equal(left(build({ picks: { frame: ['plant.palm-royal'] } })), 'plant.palm-royal');
  assert.equal(left(build({ picks: { frame: ['tree.none'] } })), left(plain), 'a missing preferred id falls back to the slot hash');
  const m = build({ mix: { tree: { 'tree.rain-tree': 2, 'tree.none': 1, 'plant.palm-royal': 1 } } });
  assert.deepEqual(quay(m), { 'tree.rain-tree': 2, 'plant.palm-royal': 1 }, 'the mix, in its own order and weights, cut to the kit\'s trees');
  assert.deepEqual(quay(build({ mix: { tree: { 'tree.none': 1 } } })), quay(plain), 'a mix naming no eligible id leaves the kit\'s dict');
  assert.ok(!('picks' in m) && !('mix' in m), 'picks and mix steer the build, they are not scene data');
  assert.ok(JSON.stringify(params).length <= 400 && !('picks' in params), 'a pilot\'s own picks live in its patch, not its params row');
});

/* ---------- the figure builder v2.1: arm poses, hand anchors, bent legs, the helmet, the hem band ---------- */
const SEASONS4 = ['spring', 'summer', 'autumn', 'winter'];
const shapeList = f => [...f.legB, ...f.body, ...f.legA].map(sh => (Array.isArray(sh) ? { d: sh[1] } : sh));
/** The faceless check of the test above: shapes wholly inside the face side of the head (it faces right), a nose's reach. */
const faceMarksOf = (f, extra = []) => {
  const h = f.head, zone = [h.x + 0.1 * h.rx, h.y - 0.4 * h.ry, h.x + 1.6 * h.rx, h.y + 0.85 * h.ry];
  return [...shapeList(f), ...extra.map(sh => ({ d: sh[1] }))].filter(o => {
    const b = E.scenePathBox(o.d, o.m), w = o.s ? (o.w || 1) / 2 : 0;
    return b && b[0] - w >= zone[0] && b[1] - w >= zone[1] && b[2] + w <= zone[2] && b[3] + w <= zone[3];
  });
};
const figBox = f => shapeList(f).reduce((a, o) => { const b = E.scenePathBox(o.d, o.m); return b ? [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])] : a; }, [Infinity, Infinity, -Infinity, -Infinity]);
const ARM_PAIRS = ['walk', 'forward', 'back', 'run', 'hold', 'play', 'bars', 'phone', 'umbrella', 'none'];
let posedCache = null;
/** Every arm pair x every leg pose on every preset and season (a bike helmet on a third of them), built once. */
const posed = () => posedCache || (posedCache = (() => {
  const P = G('scenePeople'), out = [];
  for (const [i, p] of P.PRESETS.entries()) for (const season of SEASONS4) ARM_PAIRS.forEach((arms, a) => P.LEG_POSES.forEach((legs, l) => {
    const o = Object.assign(P.outfit(p, season), { arms, legs, pedal: (a * 47 + l * 90) % 360 }, (a + l) % 3 === 0 ? { hat: { kind: 'helmet', col: 'red', strip: 1 } } : {});
    out.push({ label: `preset ${i} ${season} arms ${arms} legs ${legs}`, o, f: P.figure(o) });
  }));
  return out;
})());

test('figure v2.1: every arm pose and leg pose on every preset and season stays faceless (and the check still finds a face)', () => {
  const P = G('scenePeople');
  assert.deepEqual([...P.ARM_POSES], ['forward', 'back', 'run', 'hold', 'play', 'bars', 'phone', 'umbrella', 'none']);
  assert.deepEqual([...P.LEG_POSES], ['walk', 'run', 'seated', 'cycle']);
  const all = posed();
  assert.equal(all.length, P.PRESETS.length * 4 * ARM_PAIRS.length * 4);
  for (const { label, f } of all) {
    assert.ok(f.head && f.head.rx > 3, label + ': a head');
    assert.deepEqual(faceMarksOf(f).map(o => o.d), [], label + ': nothing on the face');
    assert.ok(!shapeList(f).some(o => /NaN|Infinity/.test(o.d)), label + ': finite path data');
  }
  // a planted eye dot and nose are still caught on a seated cyclist-helmet head (the head moved with the seat)
  for (const o of [{ legs: 'seated', arms: 'play' }, { legs: 'cycle', arms: 'bars', hat: { kind: 'helmet', col: 'sky' } }]) {
    const f = P.figure(Object.assign(P.outfit(P.PRESETS[3], 'winter'), o)), h = f.head;
    assert.equal(faceMarksOf(f, [['#141010', E.sceneD.circ(h.x + 2.2, h.y - 0.6, 0.5)], ['#e8bfa0', `M${h.x + 3.4} ${h.y - 0.8}l1.6 1.8l-1.6 .6z`]]).length, 2, JSON.stringify(o));
  }
});

test('figure v2.1: hand anchors lie inside the figure box, move with the pose, follow a hand target; arms none is armless', () => {
  const P = G('scenePeople');
  for (const { label, o, f } of posed()) {
    const b = figBox(f), sides = o.arms === 'none' ? [] : ['near', 'far'];
    if (o.arms === 'none') assert.deepEqual([f.hands.near, f.hands.far, f.at.farArm[1] - f.at.farArm[0], f.at.nearArm[1] - f.at.nearArm[0]], [null, null, 0, 0], label);
    for (const k of sides) {
      const [x, y] = f.hands[k];
      assert.ok(x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3], `${label}: the ${k} hand [${x}, ${y}] inside the box ${b}`);
      const arm = f.body.slice(...f.at[k === 'near' ? 'nearArm' : 'farArm']).map(sh => (Array.isArray(sh) ? sh[1] : sh.d));
      assert.ok(arm.some(d => { const hb = E.scenePathBox(d); return hb && Math.abs((hb[0] + hb[2]) / 2 - x) < 0.2 && Math.abs((hb[1] + hb[3]) / 2 - y) < 0.2; }), `${label}: the ${k} arm's run (at) holds the hand at its anchor`);
    }
  }
  // the anchors move with the pose: each pose puts the hands somewhere else
  const at = (o) => P.figure(Object.assign(P.outfit(P.PRESETS[0], 'summer'), o));
  const poses = P.ARM_POSES.filter(a => a !== 'none'), key = h => h.map(v => v.toFixed(1)).join(',');
  assert.equal(new Set(poses.map(a => key(at({ arms: { near: a } }).hands.near))).size, poses.length, 'every near pose has its own hand position');
  assert.equal(new Set(poses.map(a => key(at({ arms: { far: a } }).hands.far))).size, poses.length, 'every far pose has its own hand position');
  assert.ok(at({ arms: 'play' }).hands.far[1] < at({ arms: 'play' }).hands.near[1] && at({ arms: 'bars' }).hands.near[0] > 10 && at({ arms: 'hold' }).hands.near[0] > at({}).hands.near[0] + 10, 'play raises the far hand; bars and hold reach forward');
  assert.deepEqual(at({ arms: 'walk' }).hands, at({}).hands, 'walk is the default pair');
  // a hand target in object coordinates (dx and the seated drop applied), reached by IK
  for (const [o, g] of [[{ arms: { near: { hand: [8, -36] } } }, [8, -36]], [{ dx: 5, arms: { far: { hand: [17, -40] } } }, [17, -40]], [{ legs: 'seated', arms: { near: { hand: [10, -20] } } }, [10, -20]]]) {
    const f = at(o), h = o.arms.near ? f.hands.near : f.hands.far;
    assert.ok(Math.hypot(h[0] - g[0], h[1] - g[1]) < 0.05, `the hand reaches ${g}: ${h}`);
  }
  const far = at({ arms: { near: { hand: [40, -36] } } }).hands.near;
  assert.ok(far[0] < 20 && far[0] > 10, 'an unreachable target: the arm stretches towards it, no further than its length');
  // seated: the hands drop with the body; armless: both arm runs gone, nothing else
  const st = at({ arms: 'hold' }), se = at({ arms: 'hold', legs: 'seated' }), drop = se.pivot[1] - st.pivot[1];
  assert.ok(Math.abs(se.hands.near[1] - st.hands.near[1] - drop) < 1e-9 && se.hands.near[0] === st.hands.near[0]);
  const walk = at({}), none = at({ arms: 'none' });
  assert.equal(none.body.length, walk.body.length - (walk.at.farArm[1] - walk.at.farArm[0]) - (walk.at.nearArm[1] - walk.at.nearArm[0]));
  assert.deepEqual(none.shoulders, walk.shoulders, 'the shoulder joints are returned for an armless body');
});

test('figure v2.1: legs: run strides, seated drops onto the seat (feet on the ground), cycle reaches the pedals; parts and pivot kept', () => {
  const P = G('scenePeople'), base = P.outfit(P.PRESETS[6], 'spring');
  const legBox = (f, part) => f[part].map(sh => E.scenePathBox(Array.isArray(sh) ? sh[1] : sh.d)).filter(Boolean).reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
  const walk = P.figure(base);
  assert.deepEqual([walk.pivot, walk.hip, walk.seat], [[0, P.HIP], P.HIP, null], 'walk: the hip pivot of the walk hook');
  const run = P.figure(Object.assign({}, base, { legs: 'run' }));
  assert.deepEqual(run.pivot, walk.pivot);
  assert.ok(legBox(run, 'legA')[2] > legBox(walk, 'legA')[2] + 1.5 && legBox(run, 'legB')[0] < legBox(walk, 'legB')[0] - 8, 'run: a longer stride than the walk at rest (near leg forward, far leg back)');
  assert.ok(legBox(run, 'legB')[3] < -1, 'run: the far shin kicked up off the ground');
  for (const seat of [10, 16]) {
    const f = P.figure(Object.assign({}, base, { legs: 'seated', seat }));
    assert.deepEqual(f.seat, [0, -seat]);
    assert.ok(Math.abs(f.pivot[1] - (-seat - 3.3)) < 1e-9 && f.hip === f.pivot[1], 'seated: the hip pivot sits above the seat');
    for (const part of ['legA', 'legB']) assert.ok(Math.abs(legBox(f, part)[3] - 0.2) < 0.6, `seated ${seat}: the ${part} foot on the ground`);
    assert.ok(Math.abs((f.head.y - walk.head.y) - (f.pivot[1] - walk.pivot[1])) < 1e-9, 'seated: the whole figure drops');
    assert.ok(legBox(f, 'legA')[2] < legBox(f, 'legB')[2] - 4, 'seated: the near foot drawn in (its knee up), the far leg out');
  }
  for (const pedal of [0, 90, 180, 270]) {
    const f = P.figure(Object.assign({}, base, { legs: 'cycle', pedal, crank: [6, -10], crankLen: 6 }));
    assert.deepEqual(f.pivot, walk.pivot, 'cycle: the hip on the saddle keeps the standing pivot');
    const a = pedal * Math.PI / 180;
    assert.ok(Math.hypot(f.pedals.near[0] - 6 - 6 * Math.cos(a), f.pedals.near[1] + 10 - 6 * Math.sin(a)) < 1e-9 && Math.hypot(f.pedals.far[0] - 6 + 6 * Math.cos(a), f.pedals.far[1] + 10 + 6 * Math.sin(a)) < 1e-9, 'cycle: the pedals on the cranks');
    for (const [part, k] of [['legA', 'near'], ['legB', 'far']]) {
      const b = legBox(f, part), [x, y] = f.pedals[k];
      assert.ok(x >= b[0] - 0.5 && x <= b[2] + 0.5 && y >= b[1] - 0.5 && y <= b[3] + 0.5, `cycle ${pedal}: the ${k} foot reaches its pedal`);
    }
  }
  const moved = P.figure(Object.assign({}, base, { legs: 'cycle', pedal: 45 })), still = P.figure(Object.assign({}, base, { legs: 'cycle', pedal: 45 }));
  assert.notDeepEqual(moved.legA, P.figure(Object.assign({}, base, { legs: 'cycle', pedal: 135 })).legA, 'the pedal angle moves the legs');
  assert.deepEqual(moved, still);
  // a long top and a skirt cover the lap when seated (the thigh in their colour; the hem no lower than the seat)
  const coat = P.figure(Object.assign(P.outfit(P.PRESETS[1], 'spring'), { legs: 'seated' }));
  assert.equal(coat.legA[0][0], '@stone.0', 'seated in a coat: the near thigh in the coat colour');
  assert.ok(figBox({ legB: [], legA: [], body: coat.body.filter(sh => (Array.isArray(sh) ? sh[0] : sh.f) === '@navy.0') })[3] <= coat.seat[1] + 1, 'the skirt ends at the seat');
});

test('figure v2.1: the bike helmet (fine pieces are detail), deterministic by (preset, season, options), tables exported read-only', () => {
  const P = G('scenePeople'), base = P.outfit(P.PRESETS[2], 'summer');
  const J = s => JSON.stringify(s), plain = P.figure(Object.assign({}, base, { hat: null })), helm = P.figure(Object.assign({}, base, { hat: { kind: 'helmet', col: 'red', strip: 1 } }));
  const added = helm.body.filter(sh => !plain.body.map(J).includes(J(sh)));
  assert.ok(added.length >= 6, 'a shell, its band, a peak, vents, a sheen, a strap and a reflector');
  assert.equal(added.filter(sh => !(sh && sh.detail) && sh.glow !== 'rim').length, 3, 'only the shell, its band and the lit reflector draw at the far tier (the head\'s rim light follows the shell)');
  assert.ok(added.some(sh => sh.glow === 'lamp'), 'the reflector lights at night');
  assert.ok(figBox({ legA: [], legB: [], body: added })[1] < helm.head.y - helm.head.ry, 'the shell rises over the crown');
  // determinism: the same (preset, season, options) twice, with other figures built between, gives the same shapes
  for (const [i, p] of P.PRESETS.entries()) for (const season of SEASONS4) for (const extra of [{}, { arms: 'run', legs: 'run' }, { arms: 'play', legs: 'seated' }, { arms: 'bars', legs: 'cycle', pedal: 30, hat: { kind: 'helmet', col: 'sky' } }]) {
    const a = J(P.figure(Object.assign(P.outfit(p, season), extra)));
    P.figure(Object.assign(P.outfit(P.PRESETS[(i + 3) % P.PRESETS.length], 'winter'), { legs: 'cycle', arms: 'none' }));
    assert.equal(J(P.figure(Object.assign(P.outfit(p, season), extra))), a, `preset ${i} ${season} ${J(extra)}`);
  }
  assert.ok(Object.isFrozen(P.BUILD) && Object.isFrozen(P.BUILD.slim) && Object.isFrozen(P.TOPS) && Object.isFrozen(P.TOPS.coat), 'the build and garment tables are exported read-only');
  assert.equal(P.TOPS.coat.long, 1);
  const [joint, end] = P.ik([0, 0], [10, 0], 6, 6, 1);
  assert.ok(joint[1] > 0 && Math.abs(Math.hypot(...joint) - 6) < 1e-9 && Math.hypot(end[0] - 10, end[1]) < 1e-9, 'ik: an elbow bends down, both bones keep their length');
});

test('person.walker: the snapshot (hem band and garment details drawn); the far tier is unchanged since before v2.1', () => {
  // SQ-40: the hem band's push sat inside the neckline's // comment, so it never ran. Fixing it added ONE fine (detail) stroke to
  // the body of every walker variant and season, e.g. preset 0 spring:
  // { s: '@olive.2', w: 0.5, d: 'M-4.6-31Q0-30.3 4.3-31', op: 0.45, detail: true }; a ribbed top (jumper, hoodie) w 1.1, op 0.5.
  // SQ-43 (a deliberate re-record): the garment details now draw. The builder tests T.kind, which the garment table (TOPS) never
  // set, so the jumper neckline, the shirt and blouse placket and buttons, the necklace, the chest and hip pockets, the hoodie's
  // pocket and drawstring, the coat belt and the parka hood's fur trim never ran. They are all fine pieces (detail: true), so
  // only the near tier changes: FAR, the hash of every non-detail shape, is the pre-change builder's (1a4b196 and a0fc8ef).
  // SNAPSHOT is the hash of the output without the hem bands, computed the same way (it was 8954355f... before SQ-43).
  const SNAPSHOT = '4ec74e3ae4e098ff4dd9b6a937cf6d5b52702955a450cebe9b796a1bc995fdb3';
  const FAR = '3a2d850680892ed6929168755e5e08d27a06128c8f9bd526815ff30d0e01cb90';
  const isHemBand = sh => !!(sh && sh.detail && sh.s && (sh.w === 1.1 || sh.w === 0.5) && /^M[^A-Za-z]+Q0-[^A-Za-z]+$/.test(sh.d));
  const out = {}, far = {}, H = s => createHash('sha256').update(s).digest('hex');
  for (let v = 0; v < 8; v++) for (const season of SEASONS4) {
    const sh = E.sceneObjShapes('person.walker', v, season), parts = sh.order.map(p => [p, sh.parts[p]]);
    assert.equal(sh.parts.body.filter(isHemBand).length, 1, `variant ${v} ${season}: one hem band in the body`);
    assert.equal([...sh.parts.legA, ...sh.parts.legB].filter(isHemBand).length, 0);
    assert.ok(parts.reduce((n, [, l]) => n + l.length, 0) <= 180, `variant ${v} ${season}: within the silhouette care limit`);
    out[v + ':' + season] = H(JSON.stringify(parts.map(([p, l]) => [p, l.filter(s => !isHemBand(s))]))).slice(0, 16);
    far[v + ':' + season] = H(JSON.stringify(parts.map(([p, l]) => [p, l.filter(s => !s.detail)]))).slice(0, 16);
  }
  assert.equal(H(JSON.stringify(far)), FAR, 'the far tier (every non-detail shape) is unchanged');
  assert.equal(H(JSON.stringify(out)), SNAPSHOT, 'the near tier is the recorded snapshot');
  const f = G('scenePeople').figure(G('scenePeople').outfit(G('scenePeople').PRESETS[1], 'autumn'));
  assert.deepEqual(f.body.filter(isHemBand), [{ s: '@burgundy.3', w: 1.1, d: 'M-3.8-30.8Q0-30.1 3.4-30.8', op: 0.5, detail: true }], 'the jumper\'s ribbed hem band');
});

test('person.walker: every garment with its own detail draws it, as a fine (detail) piece: near tier only', () => {
  const P = G('scenePeople');
  for (const k of Object.keys(P.TOPS)) assert.equal(P.TOPS[k].kind, k, `TOPS.${k} carries its kind (the builder tests T.kind)`);
  const near = E.sceneScaleBucket(1.5), far = E.sceneScaleBucket(0.4);
  // [top kind, walker variant, season wearing it, the detail only that garment draws (c: the top's colour slot), what it is]
  const GARMENT = [
    ['jumper', 1, 'autumn', (s, c) => s.s === `@${c}.3` && s.w === 0.55, 'the neckline'],
    ['shirt', 2, 'summer', (s, c) => s.f === `@${c}.3` && s.op === 0.8, 'the placket buttons'],
    ['blouse', 1, 'summer', s => s.f === '@cream.1' && s.op === 0.9, 'the bead necklace'],
    ['jacket', 0, 'spring', (s, c) => s.s === `@${c}.3` && s.w === 0.4 && /^M[^A-Za-z]+L[^A-Za-z]+$/.test(s.d), 'the chest pocket'],
    ['hoodie', 3, 'spring', s => s.s === '@white.1' && s.w === 0.35, 'the drawstring'],
    ['coat', 1, 'spring', s => s.f === '@mustard.1', 'the belt buckle (a belted coat)'],
    ['parka', 3, 'winter', s => s.f === '@stone.1', 'the hood\'s fur trim (hood up)'],
  ];
  for (const [kind, v, season, is, what] of GARMENT) {
    const o = P.outfit(P.PRESETS[v], season), top = o.top, sh = E.sceneObjShapes('person.walker', v, season);
    assert.equal(top.kind, kind, `variant ${v} ${season} wears a ${kind}`);
    const hits = P.figure(o).body.filter(s => !Array.isArray(s) && is(s, top.col));   // the builder's own shapes (colour slots)
    assert.equal(sh.parts.body.length, P.figure(o).body.length, 'person.walker draws the builder\'s body as is');
    assert.ok(hits.length >= 1, `${kind}: ${what} is drawn`);
    assert.ok(hits.every(s => s.detail === true), `${kind}: ${what} is a fine piece (detail: true)`);
    assert.ok(E.sceneDetailAt('person.walker', sh, near) && !E.sceneDetailAt('person.walker', sh, far), `${kind}: drawn near, dropped far`);
  }
});
