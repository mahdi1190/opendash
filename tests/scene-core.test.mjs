// The scene engine core (docs/dev/SCENE_ENGINE.md sections 2 to 5 and 8): objects, compile determinism and LOD, scatter rules,
// the grade's parity with the kit, seasons, wind, archetypes / tables / batches, sceneFromArchetype's patch semantics,
// sceneKitPick, sign text, and composed items in the registry (validation, the canvas branch of animItemHtml).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
