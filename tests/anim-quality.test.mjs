// The animation QUALITY lint (tools/lib/anim-quality.mjs, tools/anim-quality.json, tools/anim-pack.mjs):
//  (a) every existing full scene and small item of every pack passes it, so CI blocks regressions and weak future packs;
//  (b) negative fixtures: lazy, keyword-stuffed, copied and mis-built drawings fail with the specific rules they should;
//  (c) the thresholds file is valid, documented, and its waivers are still needed;
//  plus the CLI (lint, reference, sheet) and the gold-standard reference list.
// The registry is loaded once and measured once (a few seconds); everything else reuses it. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { measure, check, richness, proposeThresholds, RULE_HINTS, thinSpots, parseMarkup, pathBox, colourClusters, motionKind, checkCss, shapeKeys, sharedShares, profileFor, applyWaivers, RULE_PLAN, RICHNESS_COMPONENTS, ruleTable, stableIds, ADVISORY_PLAN, ADVISORY_MOVED, THIN_HINTS, HUE_NAMES, describe, isLegacyProfile, bytesCapFor, TARGETS, allowedTagList, forbiddenTagList, lintMarkup } from '../tools/lib/anim-quality.mjs';
import { main, lintRegistry, measureRegistry, loadThresholds, loadReference, loadCommands, COMMANDS } from '../tools/anim-pack.mjs';
import { loadRegistry, findBrowser, registrySources, CROPS, SIZES, DEFAULT_AT, itemPage, sizesPage, contactPage } from '../tools/lib/anim-render.mjs';
import { mkdirSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TH = loadThresholds(ROOT);
const REG = loadRegistry(ROOT);
const RES = lintRegistry(REG, TH);                       // measures every item once
const BY_REF = new Map(RES.results.map(r => [r.ref, r]));
// The convert stage (docs/dev/SCENE_ENGINE.md 17) turned every rich hand-drawn scene into a composed one, so nothing in the live
// registry is judged by scene-rich any more. Its floors were calibrated on that art, which each converted item keeps as
// legacySvg: the scene-rich corpus is that legacy art, measured exactly as lintRegistry measured it (shares against the registry).
// A LIVE region upgrade (16.5) is composed too and keeps its hand-drawn art as legacySvg, but that art was calibrated under its
// region's legacy profile (scene), not scene-rich: it stays in the corpus under that profile, measured, checked and waived exactly
// as lintRegistry judges a hand-drawn item. So a scene going live never moves the scene corpus or its pins, and RICH_LEGACY keeps
// meaning the retired rich art of the convert stage (composed items that are not live upgrades).
const isLiveUpgrade = e => !!(e.item.upgrade && e.item.upgrade.state === 'live');
const RETIRED = REG.items().filter(e => e.full && e.composed && typeof e.item.legacySvg === 'function');
const retiredAs = (e, rich) => Object.assign({}, e, { composed: false, rich, item: Object.assign({}, e.item, { composed: false, rich, svg: e.item.legacySvg }) });
const RICH_LEGACY = RES.results.some(r => r.profile === 'scene-rich') ? [] : measureRegistry(REG, RETIRED.filter(e => !isLiveUpgrade(e)).map(e => retiredAs(e, true)), TH)
  .map(r => ({ ref: r.entry.ref, pack: r.entry.pack, profile: 'scene-rich', metrics: r.metrics, failures: [], waived: [] }));
const UPGRADE_LEGACY = measureRegistry(REG, RETIRED.filter(isLiveUpgrade).map(e => retiredAs(e, false)), TH).map(({ entry: e, metrics }) => {
  const profile = profileFor(e, TH), split = applyWaivers(check(metrics, profile, TH), e.ref, TH);
  return { ref: e.ref, pack: e.pack, profile, metrics, failures: split.failures, waived: split.waived };
});
// calibration and advisory checks: the live corpus plus the retired art (rich, and the live upgrades' hand-drawn scenes)
const CORPUS = RES.results.concat(RICH_LEGACY, UPGRADE_LEGACY);
const PACK_CSS = (id) => (REG.packs().find(p => p.id === id) || {}).css || '';
const SCENE_CLASSES = REG.classesFor({ css: PACK_CSS('us-pacific') });

const wrapScene = (inner) => `<span class="anim-scene ap-art c-orange sz-fill ap-opening is-live ap-full" data-anim="t/t" aria-hidden="true"><svg class="as ap-svg as-t" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${inner}</svg></span>`;
const wrapItem = (inner) => `<span class="anim-scene ap-art c-orange sz-hero ap-symbol is-live" data-anim="t/t" aria-hidden="true"><svg class="as ap-svg as-t" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${inner}</svg></span>`;
const lintScene = (inner, profile = 'scene') => { const m = measure(wrapScene(inner), 'scene', { classes: SCENE_CLASSES }); return { m, rules: check(m, profile, TH).map(f => f.rule) }; };
const lintItem = (inner, profile = 'item') => { const m = measure(wrapItem(inner), 'item', { classes: SCENE_CLASSES }); return { m, rules: check(m, profile, TH).map(f => f.rule) }; };

/* ---------- (a) the corpus passes ---------- */

test('the registry has full scenes and small items to lint, in every profile', () => {
  assert.ok(RES.summary.scenes >= 390 && RES.summary.small >= 570, `${RES.summary.scenes} scenes, ${RES.summary.small} small items`);
  for (const p of ['scene', 'scene-legacy', 'scene-rich', 'item', 'item-classic']) assert.ok(CORPUS.some(r => r.profile === p), `something is judged by ${p}`);
  assert.ok(RES.results.some(r => r.profile === 'composed'), 'something is judged by composed');
});

for (const id of [...new Set(RES.results.map(r => r.pack))]) {
  test(`corpus: every scene and small item of pack "${id}" passes the lint`, () => {
    const bad = RES.results.filter(r => r.pack === id && r.failures.length).map(r => `${r.ref}: ${r.failures.map(f => f.message.slice(0, 90)).join(' | ')}`);
    assert.deepEqual(bad, [], 'a drawing is thinner, flatter or more padded than anything accepted so far: draw more (see `node tools/anim-pack.mjs lint --pack ' + id + '`)');
    assert.deepEqual(RES.packCss.filter(p => p.pack === id), [], 'pack css: motion may only change transform and opacity');
  });
}

test('the lint is fast enough to run on every change', () => {
  assert.ok(RES.results.length > 900);
});

/* ---------- (b) negative fixtures ---------- */

test('negative fixture: a lazy scene (a flat rect and one circle) fails the basics', () => {
  const { rules } = lintScene('<rect width="1600" height="900" fill="#335"/><circle cx="800" cy="450" r="100" fill="#fc3"/>');
  for (const r of ['sky-gradient', 'evening-grade', 'bytes', 'shapes', 'paths', 'colours', 'gradients', 'bands', 'detailCells', 'movingGroups', 'motionKinds', 'ambientGroups', 'richness']) assert.ok(rules.includes(r), `lazy scene must fail ${r}: ${rules.join(', ')}`);
  assert.ok(rules.length >= 25);
});

test('negative fixture: a keyword-stuffed scene (many tiny identical shapes, a gradient) fails on composition, not on counts', () => {
  let o = '<defs>';
  for (let i = 0; i < 12; i++) o += `<linearGradient id="g${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#${(i * 21 + 40).toString(16).padStart(2, '0')}4488"/><stop offset="1" stop-color="#112233"/></linearGradient>`;
  o += '</defs><rect width="1600" height="900" fill="url(#g0)"/>';
  for (let i = 0; i < 420; i++) o += `<circle cx="${20 + (i % 40) * 38}" cy="${40 + Math.floor(i / 40) * 80}" r="3" fill="${i % 7 ? '#fff' : '#ffd27a'}"/>`;
  for (let i = 1; i < 12; i++) o += `<rect x="${i * 100}" y="${200 + i * 20}" width="8" height="8" fill="url(#g${i})"/>`;
  for (let i = 0; i < 40; i++) o += `<g class="x-usbob" style="--ad:3s"><circle cx="${30 + i * 39}" cy="860" r="3" fill="#fff"/></g>`;
  o += '<rect class="us-tint" width="1600" height="900"/>';
  const { m, rules } = lintScene(o);
  assert.ok(m.shapes > 400 && m.gradients >= 12, 'it has the counts: many shapes and gradients');
  for (const r of ['distinctForms', 'tinyShare', 'bands', 'paths', 'pathSegments', 'segmentsPerShape', 'sizeClasses', 'colourClusters', 'coloursWithArea', 'bottomCover', 'distinctDurations', 'richness']) assert.ok(rules.includes(r), `stuffed scene must fail ${r}: ${rules.join(', ')}`);
  assert.ok(!rules.includes('sky-gradient') && !rules.includes('evening-grade'), 'it does have a sky and a grade: the rest is what is missing');
});

test('negative fixture: a real scene with its evening-grade layer removed fails exactly that rule', () => {
  const ref = 'us-northeast/new-york-skyline';
  const entry = REG.items().find(e => e.ref === ref);
  const html = REG.html(entry.item);
  assert.deepEqual(measure(html, 'scene', { classes: REG.classesFor(entry.packObj) }).problems, []);
  assert.deepEqual(check(measure(html, 'scene', { classes: REG.classesFor(entry.packObj) }), 'scene', TH).map(f => f.rule), [], 'the real scene passes');
  const noTint = html.replace(/<rect class="[a-z]{2,4}-tint"[^>]*\/>/, '');
  assert.notEqual(noTint, html, 'the tint layer was there to remove');
  assert.deepEqual(check(measure(noTint, 'scene', { classes: REG.classesFor(entry.packObj) }), 'scene', TH).map(f => f.rule), ['evening-grade']);
  // the tint must be the LAST thing drawn: a shape after it fails evening-grade-last
  const after = html.replace('</svg>', '<circle cx="5" cy="5" r="4" fill="#fff"/></svg>');
  assert.deepEqual(check(measure(after, 'scene', { classes: REG.classesFor(entry.packObj) }), 'scene', TH).map(f => f.rule), ['evening-grade-last']);
});

test('negative fixture: a real scene copied and re-coloured shares its shapes (a templated pack)', () => {
  const a = REG.items().find(e => e.ref === 'us-northeast/new-york-skyline');
  const ka = shapeKeys(REG.html(a.item));
  const copy = new Set([...ka].map(k => k.replace(/#5a4a5c/g, '#4a3a4c')));   // one colour changed
  const shares = sharedShares([{ pack: 'p', keys: ka }, { pack: 'p', keys: copy }]);
  assert.ok(shares[0].pack > 0.6, `a re-dressed copy shares most of its shapes (${shares[0].pack})`);
  const own = BY_REF.get('us-northeast/new-york-skyline').metrics;
  assert.ok(own.sharedShare < TH.scene.sharedShare.max && own.sharedShareAll < TH.scene.sharedShareAll.max, 'a hand-drawn scene shares a few percent');
  const f = check({ ...own, sharedShare: 0.8, sharedShareAll: 0.8 }, 'scene', TH).map(x => x.rule);
  assert.ok(f.includes('sharedShare') && f.includes('sharedShareAll'));
  assert.ok(TH['scene-legacy'].sharedShare.max >= 0.9, 'the legacy (templated UK) profile accepts what it was calibrated on');
  assert.ok(!check({ ...own, sharedShare: 0.8, sharedShareAll: 0.8 }, 'scene-legacy', TH).some(x => x.rule === 'sharedShare'));
});

test('closed loopholes: padding that adds no picture does not raise the numbers', () => {
  const sky = '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#335"/><stop offset="1" stop-color="#fc3"/></linearGradient>';
  const thin = (defs, body) => `${sky}${defs}</defs><rect width="1600" height="900" fill="url(#s)"/>${body}<circle cx="800" cy="450" r="100" fill="#fc3"/><rect class="us-tint" width="1600" height="900"/>`;
  const base = lintScene(thin('', ''));
  // 1. gradients that are defined but used by nothing
  let defs = ''; for (let i = 0; i < 20; i++) defs += `<linearGradient id="u${i}"><stop offset="0" stop-color="#${i}f${i}f${i}f"/><stop offset="1" stop-color="#fff"/></linearGradient>`;
  const g = lintScene(thin(defs, ''));
  assert.ok(g.m.gradients >= 21 && g.m.gradientsUsed === base.m.gradientsUsed && g.rules.includes('gradientsUsed'), 'unused gradients do not count');
  // 2. invisible, unpainted and off-canvas shapes
  let ghosts = ''; for (let i = 0; i < 300; i++) ghosts += i % 3 === 0 ? `<circle cx="${i * 5}" cy="300" r="9" fill="#fff" opacity="0"/>` : i % 3 === 1 ? `<rect x="${i * 5}" y="400" width="30" height="30" fill="none"/>` : `<circle cx="${3000 + i}" cy="300" r="9" fill="#f80"/>`;
  const h = lintScene(thin('', ghosts));
  assert.equal(h.m.shapes, base.m.shapes, 'ghost shapes are not shapes');
  assert.ok(h.rules.includes('hiddenShare') && h.rules.includes('shapes'));
  // 3. a pile of shapes under an opaque cover
  let pile = ''; for (let i = 0; i < 300; i++) pile += `<path fill="#${(i * 7 % 200 + 30).toString(16)}6a8a" d="M${i * 5} ${100 + i % 50}l${20 + i % 9} ${10 + i % 7}l-${5 + i % 3} ${20 + i % 11}z"/>`;
  const c = lintScene(thin('', pile + '<rect width="1600" height="900" fill="#234"/>'));
  assert.ok(c.m.coverUps === 1 && c.rules.includes('coverUps'), 'an opaque cover-up is flagged');
  // 4. moving groups with nothing in them, or nothing visible
  let dead = ''; for (let i = 0; i < 40; i++) dead += `<g class="x-usbob" style="--ad:${2 + i % 7}s;--d:-${i}s"></g><g class="x-usglow"><circle cx="9000" cy="9" r="5" fill="#fff"/></g>`;
  const d = lintScene(thin('', dead));
  assert.equal(d.m.movingGroups, 0, 'empty and off-canvas movers do not move anything');
  // 5. a copy of a real scene with every colour changed is still the same picture
  const e = REG.items().find(x => x.ref === 'us-pacific/ak-midnight-sun');
  const html = REG.html(e.item);
  const recoloured = html.replace(/#([0-9a-f]{6})/gi, (all, h) => '#' + (parseInt(h, 16) ^ 0x0f0f0f).toString(16).padStart(6, '0'));
  const shares = sharedShares([{ pack: 'p', keys: shapeKeys(html) }, { pack: 'p', keys: shapeKeys(recoloured) }]);
  assert.ok(shares[1].pack > 0.95, `a re-coloured copy shares ${shares[1].pack} of its shapes`);
});

test('negative fixtures: structural faults each have their own rule', () => {
  const base = '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#335"/><stop offset="1" stop-color="#fc3"/></linearGradient></defs><rect width="1600" height="900" fill="url(#s)"/>';
  const tint = '<rect class="us-tint" width="1600" height="900"/>';
  assert.ok(lintScene(base + '<g class="x-usbob" transform="translate(10 10)"><circle r="4" cx="9" cy="9"/></g>' + tint).rules.includes('x-transform'));
  assert.ok(lintScene(base + '<g class="x-nosuchmotion"><circle r="4" cx="9" cy="9"/></g>' + tint).rules.includes('classes-defined'));
  assert.ok(lintScene(base + '<path fill="#fff" d="M0 0L5 5z<path fill="#000" d="M1 1L9 9z"/>' + tint).rules.includes('structure'), 'a path that lost its closing quote');
  assert.ok(lintScene(base + '<text x="5" y="5">hello</text>' + tint).rules.includes('structure'), 'text');
  assert.ok(lintScene(base + '<image href="https://x.test/a.png" width="9" height="9"/>' + tint).rules.includes('structure'), 'image');
  assert.ok(lintScene(base + '<use href="#nothing"/>' + tint).rules.includes('refs-resolve'), 'a dangling reference');
  assert.ok(lintScene(base + '<circle id="s" r="3" cx="4" cy="4" fill="#fff"/>' + tint).rules.includes('unique-ids'));
  assert.ok(lintScene(base + '<circle r="NaN" cx="4" cy="4" fill="#fff"/>' + tint).rules.includes('structure'), 'NaN');
  assert.ok(lintScene(base + '<script>1</script>' + tint).rules.includes('structure'), 'script');
});

test('negative fixtures: a small item that paints with hex colours and inline widths is off-style', () => {
  const off = lintItem('<circle fill="#e63946" cx="20" cy="20" r="8"/><rect fill="#1d3557" stroke="#000" stroke-width="3" x="14" y="36" width="18" height="12"/><path fill="#f1faee" d="M10 54L24 44L38 56L52 46L58 54z"/>');
  for (const r of ['colours', 'inlinePaint', 'shapes', 'movingGroups']) assert.ok(off.rules.includes(r), `${r}: ${off.rules.join(', ')}`);
  assert.ok(lintItem('<circle class="c x-nosuch" cx="20" cy="20" r="8"/><circle class="brandnew" cx="4" cy="4" r="2"/>').rules.includes('unknownClasses'));
  assert.ok(lintItem('<circle class="c x-nosuch" cx="20" cy="20" r="8"/>').rules.includes('classes-defined'));
});

test('a thin 64 x 64 item fails; a real one passes', () => {
  assert.ok(lintItem('<circle class="c" cx="32" cy="32" r="8"/>').rules.length >= 8);
  const real = BY_REF.get('us-pacific/hi-sea-turtle');
  assert.equal(real.failures.length, 0);
  assert.equal(real.profile, 'item');
});

/* ---------- the metrics themselves ---------- */

test('measure: counts, colours, structure and motion of a small drawing', () => {
  const m = measure(wrapItem('<g class="x-bob" style="--d:.2s"><circle class="c" cx="20" cy="20" r="8"/></g><path class="lk x-wave" style="--d:.6s" d="M4 50q10-8 20 0t20 0"/><rect class="s" x="40" y="10" width="12" height="12" opacity=".5"/>'), 'item', { classes: SCENE_CLASSES });
  assert.equal(m.shapes, 3);
  assert.equal(m.movingGroups, 2);
  assert.deepEqual(m.motionKindList, ['bob', 'wave']);
  assert.equal(m.staggerDelays, 2);
  assert.equal(m.distinctFills, 2);
  assert.equal(m.strokeClasses, 1);
  assert.equal(m.colours, 0);
  assert.deepEqual(m.problems, []);
});

test('measure: ids, balance, hidden shapes and off-canvas shapes', () => {
  const m = measure(wrapScene('<defs><linearGradient id="a"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect id="a" width="10" height="10" fill="url(#zz)"/><circle cx="5000" cy="5" r="3" fill="#fff"/><rect width="9" height="9" fill="none"/><g><circle cx="5" cy="5" r="3" opacity="0" fill="#fff"/>'), 'scene');
  assert.deepEqual(m.duplicateIds, ['a']);
  assert.deepEqual(m.danglingRefs, ['zz']);
  assert.ok(m.problems.some(p => /unclosed <g>/.test(p)));
  assert.equal(m.shapes, 1, 'only the painted, on-canvas rect counts');
  assert.equal(m.hiddenShapes, 3);
});

test('pathBox, parseMarkup, colourClusters and motionKind', () => {
  assert.deepEqual(pathBox('M10 10L30 20').segs, 2);
  const b = pathBox('M10 10h20v30z');
  assert.deepEqual([b.x0, b.y0, b.x1, b.y1], [10, 10, 30, 40]);
  assert.equal(pathBox('M0 0l5 5').sig, pathBox('M50 50l5 5').sig, 'the same outline at another place has the same signature');
  assert.equal(parseMarkup('<g><path d="M0 0"/></g>').problems.length, 0);
  assert.ok(parseMarkup('<g><path d="M0 0"/>').problems.length > 0);
  assert.equal(colourClusters(['#112233', '#112234', '#ff0000']), 2);
  assert.equal(motionKind('x-uspar'), 'par');
  assert.equal(motionKind('x-ukshim'), 'shim');
  assert.equal(motionKind('x-bob'), 'bob');
});

test('checkCss: keyframes may only move transform and opacity', () => {
  assert.deepEqual(checkCss('@keyframes a { from { transform: none; } to { transform: scale(2); opacity: .5; } }'), []);
  assert.equal(checkCss('@keyframes a { from { width: 1px; } to { width: 9px; } }')[0].rule, 'css-motion');
  assert.equal(checkCss('.x { background: url(https://x.test/a.png); }')[0].rule, 'css-fetch');
  for (const p of REG.packs()) assert.deepEqual(checkCss(p.css), [], `pack ${p.id}`);
});

test('thinSpots: advisory, only for metrics that pass but sit beyond the 10th / 90th percentile; a size budget is not padding', () => {
  const own = BY_REF.get('us-northeast/new-york-skyline');
  assert.deepEqual(thinSpots(own.metrics, 'scene', TH), [], 'a gold-standard scene has none');
  const thin = { ...own.metrics, shapes: TH.scene.shapes.min + 1, tinyShare: TH.scene.tinyShare.max - 0.01, bytes: 31000 };
  const spots = thinSpots(thin, 'scene', TH);
  assert.deepEqual(spots.map(x => x.rule).sort(), ['shapes', 'tinyShare']);
  assert.equal(spots.find(x => x.rule === 'shapes').side, 'low');
  assert.equal(spots.find(x => x.rule === 'tinyShare').side, 'high');
  assert.deepEqual(thinSpots({ ...own.metrics, shapes: 1 }, 'scene', TH).filter(x => x.rule === 'shapes'), [], 'a failure is not a thin spot');
});

test('ruleTable has one PASS / FAIL row per rule', () => {
  const r = BY_REF.get('us-northeast/new-york-skyline');
  const rows = ruleTable(r.metrics, r.profile, TH);
  assert.ok(rows.length > 40 && rows.every(x => x.ok));
  const lazy = lintScene('<rect width="1600" height="900" fill="#335"/>');
  assert.ok(ruleTable(lazy.m, 'scene', TH).some(x => !x.ok));
});

/* ---------- (c) the thresholds file ---------- */

test('thresholds: valid, documented, and covering every rule of every profile', () => {
  assert.equal(typeof TH._about, 'string');
  assert.ok(Array.isArray(TH._how) && TH._how.length >= 4, 'the how-to-read notes');
  assert.deepEqual(Object.keys(TH.profiles).sort(), ['item', 'item-classic', 'scene', 'scene-legacy', 'scene-rich']);
  for (const [profile, plan] of Object.entries(RULE_PLAN)) {
    const spec = TH[profile];
    assert.ok(spec, `thresholds for ${profile}`);
    const keys = Object.keys(spec).filter(k => !k.startsWith('_'));
    assert.deepEqual(keys.sort(), Object.keys(plan).sort(), `${profile}: exactly the planned rules, nothing undocumented`);
    for (const [metric, sides] of Object.entries(plan)) {
      const t = spec[metric];
      assert.equal(typeof t.note, 'string', `${profile}.${metric}: a note with the measured distribution`);
      assert.ok(t.note.length > 20, `${profile}.${metric}: the note says what it was calibrated on`);
      if (metric === 'richness') {
        assert.equal(typeof t.min, 'number');
        assert.ok(t.warnMin >= t.min && t.median > t.warnMin, 'richness: min <= advisory level < median');
        assert.deepEqual(Object.keys(t.components).sort(), [...RICHNESS_COMPONENTS[profile.startsWith('scene') ? 'scene' : 'item']].sort());
        assert.ok(Object.values(t.components).every(v => v > 0));
        continue;
      }
      for (const side of sides) {
        assert.ok(Number.isFinite(t[side]), `${profile}.${metric}.${side} is a number`);
        const warn = t[side === 'min' ? 'warnMin' : 'warnMax'];
        if (t.advisoryIn) { assert.equal(warn, undefined, `${profile}.${metric}: its advisory level is ${t.advisoryIn}'s, not its own`); continue; }
        assert.ok(Number.isFinite(warn), `${profile}.${metric}: the advisory (10th percentile) level`);
        assert.ok(side === 'min' ? warn >= t.min : warn <= t.max, `${profile}.${metric}: the advisory level is inside the limit`);
      }
      for (const side of ['min', 'max']) if (!sides.includes(side)) assert.equal(t[side], undefined, `${profile}.${metric} has no ${side}`);
      if (t.min != null && t.max != null) assert.ok(t.min <= t.max, `${profile}.${metric}: min <= max`);
    }
  }
});

test('advisory-only metrics (detailPerKB, sameDelay): no floor, no ceiling, a level at the corpus 10th / 90th percentile, and shapesPerKB hands its advisory to detailPerKB', () => {
  for (const [profile, plan] of Object.entries(RULE_PLAN)) {
    const kind = profile.startsWith('scene') ? 'scene' : 'item', rs = CORPUS.filter(r => r.profile === profile);
    for (const [metric, side] of Object.entries(ADVISORY_PLAN[kind])) {
      const t = TH[profile][metric];
      assert.deepEqual(plan[metric], [], `${profile}.${metric} is in the plan with no limited side`);
      assert.deepEqual([t.min, t.max], [undefined, undefined], `${profile}.${metric} is never a failure`);
      const d = describe(rs.map(r => r.metrics[metric]));
      assert.equal(t[side], side === 'warnMin' ? Math.floor(d.p10 * (d.p10 >= 10 ? 1 : 1000)) / (d.p10 >= 10 ? 1 : 1000) : Math.ceil(d.p90 * (d.p90 >= 10 ? 1 : 1000)) / (d.p90 >= 10 ? 1 : 1000), `${profile}.${metric}.${side} is the corpus ${side === 'warnMin' ? '10th' : '90th'} percentile`);
      assert.equal(t.median, d.median); assert.match(t.note, /^corpus n=\d+: min /);
      // the corpus is judged against its own level: about a tenth of it is a thin spot (that is what the level means)
      const flagged = rs.filter(r => thinSpots(r.metrics, profile, TH).some(x => x.rule === metric)).length;
      assert.ok(flagged / rs.length > 0.02 && flagged / rs.length < 0.2, `${profile}.${metric}: ${flagged} of ${rs.length} are thin spots`);
    }
    for (const [metric, by] of Object.entries(ADVISORY_MOVED[kind])) {
      const t = TH[profile][metric];
      assert.equal(t.advisoryIn, by); assert.equal(t.warnMin, undefined); assert.ok(Number.isFinite(t.min), 'the hard floor is untouched');
      assert.ok(!rs.some(r => thinSpots(r.metrics, profile, TH).some(x => x.rule === metric)), `${profile}.${metric} is never a thin spot any more: ${by} is`);
    }
  }
  // calibrate --propose regenerates exactly these entries (the file is the corpus' answer, not a hand edit)
  for (const profile of Object.keys(RULE_PLAN)) {
    const kind = profile.startsWith('scene') ? 'scene' : 'item', rs = CORPUS.filter(r => r.profile === profile);
    const proposed = proposeThresholds(rs.map(r => r.metrics), profile, { caps: { bytes: bytesCapFor(profile, REG.limits) } });
    for (const metric of Object.keys(ADVISORY_PLAN[kind])) assert.deepEqual(proposed[metric], TH[profile][metric], `${profile}.${metric}`);
    for (const [metric, by] of Object.entries(ADVISORY_MOVED[kind])) { assert.equal(proposed[metric].advisoryIn, by); assert.equal(proposed[metric].warnMin, undefined); }
  }
  assert.match(TH._how.join('\n'), /advisory-only metrics .* "detailPerKB" .* "sameDelay"/);
});

test('every rule says how to fix it (a hint for each limited side)', () => {
  for (const [profile, plan] of Object.entries(RULE_PLAN)) for (const [metric, sides] of Object.entries(plan)) {
    if (metric === 'richness') continue;
    for (const side of sides) assert.ok(RULE_HINTS[metric] && RULE_HINTS[metric][side === 'min' ? 0 : 1], `${profile}.${metric}.${side} has a hint`);
  }
});

// The ratchet. The committed limits: a floor may be RAISED (better art landed, `calibrate --propose`) but never lowered,
// and a ceiling never raised, to let a weak drawing in. Editing this table to lower a limit is the deliberate act the review should catch.
// Re-pinned on 2026-10-07 at the merge of the scene-engine branch: the art there had moved on independently (the US and Asia kit's
// varied clouds and birds, the redrawn South East and Northern scenes, one malformed path fixed), so 'scene' and 'scene-legacy' were
// recalibrated on the merged corpus once, and 'scene-rich' (the rich local scenes, with their render-cost ceilings) was added.
const PINNED = {
  'scene': { bytes: { min: 9781, max: 32000 }, shapes: { min: 65 }, paths: { min: 13 }, pathSegments: { min: 105 }, segmentsPerShape: { min: 0.42 }, bytesPerShape: { min: 73 }, shapesPerKB: { min: 3.1 }, distinctShapes: { min: 57 }, distinctForms: { min: 47 }, distinctRatio: { min: 0.68 }, colours: { min: 27 }, colourClusters: { min: 15 }, coloursWithArea: { min: 13 }, tonalRange: { min: 0.824 }, hueSectors: { max: 7 }, gradients: { min: 5 }, gradientsUsed: { min: 5 }, gradientFilledShapes: { min: 5 }, translucentLayers: { min: 14 }, skyStops: { min: 2 }, bands: { min: 2 }, bandFills: { min: 2 }, detailShapes: { min: 49 }, detailCells: { min: 25 }, detailColumns: { min: 8 }, detailRows: { min: 6 }, focusShare: { min: 0.109 }, sizeClasses: { min: 8 }, tinyShare: { max: 0.747 }, hiddenShare: { max: 0.174 }, bottomCover: { min: 1 }, movingGroups: { min: 12 }, motionKinds: { min: 5 }, driftGroups: { min: 3 }, ambientGroups: { min: 7 }, ambientKinds: { min: 1 }, motionZones: { min: 2 }, distinctDurations: { min: 11 }, staggerDelays: { min: 6 }, movingPerShape: { min: 0.073, max: 0.71 }, sharedShare: { max: 0.263 }, sharedShareAll: { max: 0.361 }, unknownClasses: { max: 0 }, coverUps: { max: 0 }, richness: { min: 0.66 } },
  'scene-legacy': { bytes: { min: 11349, max: 32000 }, shapes: { min: 81 }, paths: { min: 15 }, pathSegments: { min: 190 }, segmentsPerShape: { min: 0.76 }, bytesPerShape: { min: 77 }, shapesPerKB: { min: 4.36 }, distinctShapes: { min: 73 }, distinctForms: { min: 36 }, distinctRatio: { min: 0.421 }, colours: { min: 30 }, colourClusters: { min: 19 }, coloursWithArea: { min: 13 }, tonalRange: { min: 0.892 }, hueSectors: { max: 8 }, gradients: { min: 5 }, gradientsUsed: { min: 5 }, gradientFilledShapes: { min: 5 }, translucentLayers: { min: 14 }, skyStops: { min: 2 }, bands: { min: 3 }, bandFills: { min: 3 }, detailShapes: { min: 47 }, detailCells: { min: 37 }, detailColumns: { min: 14 }, detailRows: { min: 5 }, focusShare: { min: 0.144 }, sizeClasses: { min: 8 }, tinyShare: { max: 0.53 }, hiddenShare: { max: 0.157 }, bottomCover: { min: 1 }, movingGroups: { min: 10 }, motionKinds: { min: 4 }, driftGroups: { min: 3 }, ambientGroups: { min: 0 }, ambientKinds: { min: 0 }, motionZones: { min: 2 }, distinctDurations: { min: 9 }, staggerDelays: { min: 0 }, movingPerShape: { min: 0.034, max: 0.631 }, sharedShare: { max: 0.992 }, sharedShareAll: { max: 0.992 }, unknownClasses: { max: 0 }, coverUps: { max: 0 }, richness: { min: 0.684 } },
  'scene-rich': { bytes: { min: 258152, max: 1000000 }, renderedNodes: { min: 3547, max: 46730 }, movingGroups: { min: 77, max: 250 }, shapesPerKB: { min: 0.98 }, colours: { min: 162 }, colourClusters: { min: 46 }, coloursWithArea: { min: 23 }, tonalRange: { min: 0.632 }, gradients: { min: 10 }, gradientsUsed: { min: 10 }, translucentLayers: { min: 152 }, bands: { min: 10 }, detailShapes: { min: 373 }, detailCells: { min: 54 }, detailColumns: { min: 15 }, detailRows: { min: 8 }, sizeClasses: { min: 17 }, bottomCover: { min: 1 }, motionKinds: { min: 18 }, ambientGroups: { min: 77 }, ambientKinds: { min: 18 }, motionZones: { min: 3 }, distinctDurations: { min: 45 }, staggerDelays: { min: 43 }, hiddenShare: { max: 0.203 }, unknownClasses: { max: 0 }, richness: { min: 0.657 } },
  'item': { bytes: { min: 600, max: 14000 }, shapes: { min: 7 }, paths: { min: 3 }, pathSegments: { min: 14 }, distinctShapes: { min: 4 }, distinctForms: { min: 4 }, distinctFills: { min: 1 }, inkCells: { min: 30 }, extentW: { min: 0.591 }, extentH: { min: 0.534 }, colours: { max: 0 }, gradients: { max: 0 }, inlinePaint: { max: 0 }, unknownClasses: { max: 0 }, movingGroups: { min: 1 }, motionKinds: { min: 1 }, motionShare: { min: 0.1 }, hiddenShapes: { max: 3 }, sharedShare: { max: 0.563 }, sharedShareAll: { max: 0.632 }, richness: { min: 0.642 } },
  'item-classic': { bytes: { min: 321, max: 14000 }, shapes: { min: 1 }, paths: { min: 0 }, pathSegments: { min: 0 }, distinctShapes: { min: 1 }, distinctForms: { min: 1 }, distinctFills: { min: 0 }, inkCells: { min: 10 }, extentW: { min: 0.219 }, extentH: { min: 0.125 }, colours: { max: 0 }, gradients: { max: 0 }, inlinePaint: { max: 0 }, unknownClasses: { max: 6 }, movingGroups: { min: 0 }, motionKinds: { min: 0 }, motionShare: { min: 0 }, hiddenShapes: { max: 5 }, richness: { min: 0.359 } },
};

test('a live region upgrade: the app judges the composed scene (composed profile), and its retired hand-drawn art (legacySvg) still passes its legacy profile, in the corpus', () => {
  const live = REG.items().filter(e => e.full && e.composed && isLiveUpgrade(e));
  assert.deepEqual(UPGRADE_LEGACY.map(r => r.ref).sort(), live.map(e => e.ref).sort(), 'every live upgrade\'s hand-drawn art is measured');
  for (const e of live) assert.equal(BY_REF.get(e.ref).profile, 'composed', e.ref + ': the live item is judged by the composed profile');
  for (const r of UPGRADE_LEGACY) {
    assert.equal(r.profile, profileFor({ pack: r.pack, full: true }, TH), r.ref + ': the profile of its region\'s hand-drawn scenes');
    assert.ok(TH.standard.legacyProfiles.includes(r.profile), r.ref + ': a legacy-tier profile (' + r.profile + ')');
    assert.deepEqual(r.failures.map(f => f.rule + ': ' + f.message), [], r.ref + ': the hand-drawn art still passes its legacy profile');
    assert.ok(CORPUS.includes(r), r.ref + ': in the calibration corpus');
  }
  assert.ok(!RICH_LEGACY.some(r => UPGRADE_LEGACY.some(u => u.ref === r.ref)), 'scene-rich holds only the retired rich art');
});

test('thresholds: the ratchet, no limit is looser than it was (raise floors, never lower them)', () => {
  for (const [profile, rules] of Object.entries(PINNED)) for (const [metric, pin] of Object.entries(rules)) {
    const t = TH[profile][metric];
    assert.ok(t, `${profile}.${metric} still exists`);
    if (pin.min != null) assert.ok(t.min >= pin.min, `${profile}.${metric}: floor ${t.min} is lower than the pinned ${pin.min}`);
    if (pin.max != null) assert.ok(t.max <= pin.max, `${profile}.${metric}: ceiling ${t.max} is higher than the pinned ${pin.max}`);
  }
});

test('thresholds: the byte caps are the registry budgets and the floors are not loosened below the corpus', () => {
  assert.equal(TH.scene.bytes.max, REG.limits.scene);
  assert.equal(TH.item.bytes.max, REG.limits.item);
  assert.equal(TH['scene-rich'].bytes.max, REG.limits.rich, 'a rich scene: the registry budget ANIM_RICH_ITEM_MAX_BYTES');
  // each floor is at the corpus minimum of its profile: raising it would fail an accepted drawing, lowering it lets weaker work in
  for (const profile of Object.keys(RULE_PLAN)) {
    const rs = CORPUS.filter(r => r.profile === profile);
    for (const [metric, t] of Object.entries(TH[profile])) {
      if (metric.startsWith('_') || metric === 'richness' || t.min == null) continue;
      const floor = Math.min(...rs.filter(r => !r.waived.some(w => w.rule === metric)).map(r => r.metrics[metric]));
      assert.ok(t.min <= floor + 1e-9, `${profile}.${metric}: min ${t.min} must not exceed the corpus floor ${floor}`);
    }
  }
});

test('thresholds: profiles are frozen lists, new packs get the strict profiles', () => {
  assert.deepEqual(TH.profiles['item-classic'].packs, ['core', 'moments', 'rewards', 'seasons', 'sky', 'texas', 'world', 'uk-south-west']);
  assert.deepEqual(TH.profiles['scene-legacy'].packs, ['uk-north-west', 'uk-south-east']);
  assert.equal(profileFor({ pack: 'europe-west', full: true }, TH), 'scene');
  assert.equal(profileFor({ pack: 'europe-west', full: false }, TH), 'item');
  assert.equal(profileFor({ pack: 'uk-south-east', full: true }, TH), 'scene-legacy');
  assert.equal(profileFor({ pack: 'core', full: false }, TH), 'item-classic');
  assert.equal(profileFor({ pack: 'uk-south-east', full: true, rich: true }, TH), 'scene-rich', 'a rich scene has its own profile, whatever its pack');
  assert.equal(profileFor({ pack: 'europe-west', full: true, rich: true }, TH), 'scene-rich');
  assert.equal(profileFor({ pack: 'europe-west', full: false, rich: true }, TH), 'item', 'rich is for full scenes only');
  for (const r of RES.results) assert.equal(r.profile, profileFor({ pack: r.pack, full: r.full, rich: r.rich, composed: r.composed }, TH));
});

// The waivers granted on 2026-10-05, to accepted art that predates the lint. The list only shrinks: a NEW drawing is never waived
// (fix it), so adding a line here, or a waiver to tools/anim-quality.json, is a deliberate act that shows in review.
const GRANTED = ['asia-central/uz-signature structure', 'asia-south/af-signature structure', 'core/scene-passport x-transform', 'asia-west/jo-signature sky-gradient', 'asia-west/jo-signature skyStops',
  'asia-west/jo-signature richness', 'us-mountain/nm-white-sands richness', 'asia-west/sa-signature richness', 'texas/el-paso-star-scene richness', 'texas/west-texas-sunset richness'];

test('thresholds: waivers are few, explained, and still needed (the list only shrinks)', () => {
  const extra = TH.waivers.map(w => `${w.ref} ${w.rule}`).filter(w => !GRANTED.includes(w));
  assert.deepEqual(extra, [], 'a waiver that was never granted: fix the drawing instead (waivers are for art that predates the lint)');
  const seen = new Set();
  for (const w of TH.waivers) {
    assert.ok(w.ref && w.rule && typeof w.reason === 'string' && w.reason.length > 25, `${w.ref}: ref, rule and a reason`);
    assert.ok(BY_REF.has(w.ref), `${w.ref} exists`);
    assert.ok(!seen.has(w.ref + w.rule), 'no duplicates');
    seen.add(w.ref + w.rule);
    assert.ok(BY_REF.get(w.ref).waived.some(f => f.rule === w.rule), `${w.ref} still fails ${w.rule}: remove the waiver`);
  }
  assert.deepEqual(RES.staleWaivers, []);
});

test('waivers apply to a ref and a rule only', () => {
  const f = [{ rule: 'richness' }, { rule: 'shapes' }];
  const r = applyWaivers(f, 'asia-west/sa-signature', TH);
  assert.deepEqual(r.waived.map(x => x.rule), ['richness']);
  assert.deepEqual(r.failures.map(x => x.rule), ['shapes']);
  assert.deepEqual(applyWaivers(f, 'some/other', TH).failures.length, 2);
});

/* ---------- the gold-standard reference ---------- */

test('reference: the exemplars exist, are the right kind, and pass the strict lint WITHOUT waivers', () => {
  const ref = loadReference(ROOT);
  assert.ok(ref.scenes.length >= 10 && ref.items.length >= 6 && ref.weaker.length >= 6);
  const kinds = new Set(ref.scenes.flatMap(x => x.tags));
  for (const t of ['skyline-dusk', 'monument', 'desert', 'tropical', 'night-lit', 'wildlife', 'winter']) assert.ok(kinds.has(t), `a ${t} exemplar`);
  for (const x of ref.scenes) {
    const r = BY_REF.get(x.ref);
    assert.ok(r && r.full, `${x.ref} is a full scene`);
    assert.equal(r.profile, 'scene');
    assert.equal(r.failures.length + r.waived.length, 0, `${x.ref} is clean`);
    assert.ok(x.why.length > 80 && x.tags.length >= 3, `${x.ref}: a concrete reason`);
  }
  for (const x of ref.items) {
    const r = BY_REF.get(x.ref);
    assert.ok(r && !r.full && r.profile === 'item' && r.failures.length + r.waived.length === 0, x.ref);
    assert.ok(x.why.length > 60);
  }
  for (const x of ref.weaker) { assert.ok(BY_REF.has(x.ref), x.ref); assert.ok(x.wrong.length > 40 && x.fix.length > 20, x.ref); assert.ok(BY_REF.get(x.ref).full, `${x.ref}: a weaker SCENE`); }
  assert.ok(ref.weakerItems.length >= 3 && ref.weakerItems.length <= 6, 'a few weak SMALL items: the element agents have a negative example of their own kind');
  for (const x of ref.weakerItems) { const r = BY_REF.get(x.ref); assert.ok(r && !r.full && r.profile === 'item', `${x.ref}: a weaker small item of the strict profile`); assert.ok(x.wrong.length > 60 && x.fix.length > 40, x.ref); }
  const all = [...ref.scenes, ...ref.items, ...ref.weaker, ...ref.weakerItems];
  assert.equal(new Set(all.map(x => x.ref)).size, all.length, 'no ref twice');
  // the `read:` hint of an item locates it: the pack file and the call with its id, which really is in that file
  for (const x of [...ref.items, ...ref.weakerItems]) {
    const m = /^(src\/app\/72-anim-pack-[a-z0-9-]+\.js) \(B\.(element|place|state)\('([^']+)', (?:'element', )?\{ id: '([^']+)' \}\)\)$/.exec(x.source || '');
    assert.ok(m, `${x.ref}: source names the file and the call and id, got ${x.source}`);
    const text = readFileSync(join(ROOT, m[1]), 'utf8');
    assert.ok(new RegExp(`B\\.${m[2]}\\('${m[3]}', (?:'element', )?\\{ id: '${m[4]}'`).test(text), `${x.ref}: ${m[0]} is in ${m[1]}`);
    assert.ok(x.ref.endsWith('-' + m[4]) && x.ref.startsWith(BY_REF.get(x.ref).pack + '/'), `${x.ref} is the item that call makes`);
  }
});

/* ---------- the CLI ---------- */

const run = async (argv, extra = {}) => { const out = [], err = []; const code = await main(argv, { out: (s) => out.push(s), err: (s) => err.push(s), ...extra }); return { code, out: out.join('\n'), err: err.join('\n') }; };

test('cli: help lists every subcommand; unknown commands and options are errors', async () => {
  const h = await run(['--help']);
  assert.equal(h.code, 0);
  for (const c of Object.keys(COMMANDS)) assert.match(h.out, new RegExp('\\b' + c + '\\b'));
  assert.deepEqual(Object.keys(COMMANDS).sort(), ['calibrate', 'lint', 'reference', 'sheet']);
  for (const c of Object.values(COMMANDS)) assert.ok(c.summary && c.usage && typeof c.run === 'function');
  assert.match((await run(['lint', '--help'])).out, /--file/);
  const bad = await run(['nonsense']);
  assert.equal(bad.code, 1);
  assert.equal((await run(['lint', '--nonsense'])).code, 1);
  assert.equal((await run(['lint', '--ref', 'no/such'])).code, 1);
  assert.equal((await run(['lint', '--pack', 'nopack'])).code, 1);
});

test('cli: a module dropped in tools/lib/anim-cmd/ becomes a subcommand (the table is extensible without editing the CLI)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'anim-cmd-'));
  try {
    writeFileSync(join(dir, 'hello.mjs'), "export default { summary: 'say hello', usage: 'hello [--name <n>]', options: { name: { type: 'string', help: 'who' } }, run(args, ctx) { ctx.out('hello ' + (args.name || 'world') + ' ' + ctx.positionals.join('+')); return 3; } };");
    const all = await loadCommands(dir);
    assert.deepEqual(Object.keys(all), ['lint', 'sheet', 'reference', 'calibrate', 'hello']);
    const r = await run(['hello', '--name', 'ada', 'x', 'y'], { commandsDir: dir });
    assert.equal(r.code, 3);
    assert.equal(r.out, 'hello ada x+y');
    assert.match((await run(['--help'], { commandsDir: dir })).out, /hello\s+say hello/);
    assert.match((await run(['hello', '--help'], { commandsDir: dir })).out, /--name/);
    writeFileSync(join(dir, 'lint.mjs'), "export default { summary: 's', usage: 'u', run() { return 0; } };");
    assert.equal((await run(['lint'], { commandsDir: dir })).code, 1, 'a plugin cannot replace a built-in');
    rmSync(join(dir, 'lint.mjs'));
    writeFileSync(join(dir, 'broken.mjs'), 'export default { nothing: 1 };');
    assert.equal((await run(['hello'], { commandsDir: dir })).code, 1, 'a malformed plugin is reported');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('cli: lint of one real item prints PASS per rule and exits 0', async () => {
  const r = await run(['lint', '--ref', 'us-northeast/new-york-skyline']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /PASS {2}us-northeast\/new-york-skyline/);
  assert.match(r.out, /PASS {2}sky-gradient/);
  assert.doesNotMatch(r.out, /FAIL/);
});

test('cli: lint --json is machine-readable and lint --pack summarises', async () => {
  const j = await run(['lint', '--pack', 'us-pacific', '--json']);
  const o = JSON.parse(j.out);
  assert.equal(j.code, 0);
  assert.ok(o.ok && o.items.length === RES.results.filter(r => r.pack === 'us-pacific').length && o.items.every(i => i.pass));
  const t = await run(['lint', '--pack', 'us-pacific']);
  assert.match(t.out, /us-pacific/);
  assert.match(t.out, /PASS: \d+ items clean/);
});

test('cli: --file lints a pack file that is not registered yet, and a thin scene fails with exit code 2', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'anim-lint-'));
  try {
    const file = join(dir, '72-anim-pack-zz-lazy.js');
    writeFileSync(file, `(function () { animRegisterPack({ id: 'zz-lazy', name: 'Lazy test pack', version: '1.0.0', description: 'A deliberately thin scene for the lint tests.', css: '',
      items: [{ id: 'flat-sun', slot: 'opening', label: 'Flat sun', tags: ['test'], mood: 'neutral', intensity: 'standard', theme: 'any', season: 'any', region: 'any', colour: 'amber', full: true,
        svg: () => '<rect width="1600" height="900" fill="#335"/><circle cx="800" cy="450" r="100" fill="#fc3"/>', reduced: 'static' }] }); })();`);
    const r = await run(['lint', '--file', file]);
    assert.equal(r.code, 2, r.out);
    assert.match(r.out, /FAIL {2}zz-lazy\/flat-sun/);
    assert.match(r.out, /\[sky-gradient\]/);
    assert.match(r.out, /how to fix/);
    assert.equal(REG.items().some(e => e.ref === 'zz-lazy/flat-sun'), false, 'the real registry is untouched');
    const names = registrySources(ROOT, [file]).map(f => f.name);
    assert.ok(names.indexOf('72-anim-pack-zz-lazy.js') > names.indexOf('72-anim-pack-world.js') - 1, 'a pack file loads with the packs');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('cli: reference prints the exemplars and the weaker scenes', async () => {
  const r = await run(['reference']);
  assert.equal(r.code, 0);
  assert.match(r.out, /us-northeast\/new-york-skyline/);
  assert.match(r.out, /DO BETTER THAN THESE/);
  assert.match(r.out, /reference --render/);
  assert.match(r.out, /DO BETTER THAN THESE SMALL ITEMS \(\d+\)/); assert.match(r.out, /read: src\/app\/72-anim-pack-us-northeast\.js \(B\.state\('VT', 'element', \{ id: 'maple-syrup' \}\)\)/);
  const j = JSON.parse((await run(['reference', '--json'])).out);
  assert.ok(j.scenes.length >= 10 && j.weakerItems.length >= 3);
});

test('calibration: proposing thresholds from today\'s corpus reproduces the committed floors (only the two documented overrides differ)', () => {
  for (const profile of Object.keys(RULE_PLAN)) {
    const rs = CORPUS.filter(r => r.profile === profile);
    const caps = { bytes: bytesCapFor(profile, REG.limits) };
    const proposed = proposeThresholds(rs.map(r => r.metrics), profile, { caps });
    const differs = [];
    for (const [metric, t] of Object.entries(proposed)) {
      if (metric === 'richness') {
        // the size component is measured with stabilised ids (stableIds): the committed median was taken before, so it may differ by a few bytes (well under 1 %)
        const { bytes: pb, ...pRest } = t.components, { bytes: cb, ...cRest } = TH[profile].richness.components;
        assert.deepEqual(pRest, cRest, `${profile}: richness components are the corpus medians`);
        assert.ok(Math.abs(pb - cb) / cb < 0.01, `${profile}: the size component ${pb} is within 1 % of the committed ${cb}`);
        continue;
      }
      for (const side of ['min', 'max']) if (t[side] !== TH[profile][metric][side]) differs.push(`${profile}.${metric}.${side}: proposed ${t[side]}, committed ${TH[profile][metric][side]}`);
    }
    // waived items are inside the corpus, so a metric they set the floor of differs by design: only skyStops (the waived flat sky) may
    assert.deepEqual(differs.filter(d => !/\.skyStops\./.test(d)), [], 'a committed threshold drifted from its corpus floor: run `node tools/anim-pack.mjs calibrate`');
  }
});

test('findBrowser: CHROME_PATH, then Playwright\'s browsers folder', () => {
  const dir = mkdtempSync(join(tmpdir(), 'anim-browser-'));
  try {
    const exe = join(dir, 'chromium-1234', 'chrome-linux', 'chrome');
    mkdirSync(join(dir, 'chromium-1234', 'chrome-linux'), { recursive: true });
    writeFileSync(exe, '');
    assert.equal(findBrowser({ PLAYWRIGHT_BROWSERS_PATH: dir, PATH: '' }, 'linux'), exe);
    const own = join(dir, 'my-chrome');
    writeFileSync(own, '');
    assert.equal(findBrowser({ CHROME_PATH: own, PLAYWRIGHT_BROWSERS_PATH: dir, PATH: '' }, 'linux'), own);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('cli: sheet renders a small item to a 512 x 512 PNG (skipped without Chrome)', { skip: !findBrowser() }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'anim-sheet-'));
  try {
    const r = await run(['sheet', 'us-pacific/hi-sea-turtle', '--out', dir, '--mode', 'dark']);
    assert.equal(r.code, 0, r.err);
    const file = join(dir, 'us-pacific__hi-sea-turtle-dark.png');
    assert.ok(existsSync(file));
    const png = readFileSync(file);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [512, 512]);
    assert.equal((await run(['sheet', '--mode', 'purple', 'us-pacific/hi-sea-turtle'])).code, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ---------- FIX3A: sheet --still, --at, --sizes, --key; the contact sheet matches its mode ---------- */

const pngSize = (f) => { const b = readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('sheet pages: --still renders the reduced-motion rest frame (no is-live, ap-still), --at pauses later, --sizes is a strip at 28, 40, 64 and 128 px, a light contact sheet is on a light page', () => {
  const turtle = REG.items().find(e => e.ref === 'us-pacific/hi-sea-turtle'), scene = REG.items().find(e => e.ref === 'us-pacific/hi-volcano-night');
  assert.deepEqual(SIZES, [28, 40, 64, 128]); assert.equal(DEFAULT_AT, 6500);
  const body = (h) => h.slice(h.indexOf('<body>'));   // the page's css names every class: only the markup counts
  const live = itemPage(REG, turtle, { mode: 'light' }), still = itemPage(REG, turtle, { mode: 'light', still: true });
  assert.match(body(live), /class="anim-scene[^"]*is-live/); assert.doesNotMatch(body(live), /ap-still/); assert.match(live, /currentTime=6500/);
  assert.match(body(still), /class="anim-scene[^"]*ap-still/); assert.doesNotMatch(body(still), /is-live/, 'animations off: the rest frame'); assert.match(itemPage(REG, turtle, { mode: 'light', at: 1200 }), /currentTime=1200/);
  assert.match(body(itemPage(REG, scene, { mode: 'night', still: true })), /class="anim-scene tod-night[^"]*ap-still/, 'night and still combine'); assert.match(itemPage(REG, scene, { mode: 'dark' }), /data-theme="dark"/);
  // the strip: the same item at each size, the app's own size classes, 1x
  const strip = sizesPage(REG, turtle, { mode: 'light' });
  assert.equal((strip.html.match(/<figure>/g) || []).length, 4); for (const px of SIZES) assert.ok(strip.html.includes(`style="width:${px}px;height:${px}px"`) && strip.html.includes(`${px} px</figcaption>`), String(px));
  for (const cls of ['sz-xs', 'sz-sm', 'sz-lg', 'sz-hero']) assert.ok(body(strip.html).includes(cls), cls + ': the app\'s own tile classes');
  assert.deepEqual([strip.width, strip.height], [28 + 40 + 64 + 128 + 4 * 28 + 28, 128 + 28 + 36]); assert.match(strip.html, /background:#f4f4f6/); assert.match(sizesPage(REG, turtle, { mode: 'dark' }).html, /background:#16171a/);
  assert.match(body(sizesPage(REG, turtle, { still: true }).html), /ap-still/); assert.doesNotMatch(body(sizesPage(REG, turtle, { still: true }).html), /is-live/);
  // the contact sheet: a light render sits on a light page, a dark or night one on a dark page; the sizes strips keep their real size
  const done = [{ ref: 'a/b', file: '/tmp/x.png', full: false, sizesFile: '/tmp/x-sizes.png' }];
  assert.match(contactPage(done, { mode: 'light' }), /background:#eceef2;color:#1b2430/); for (const mode of ['dark', 'night']) assert.match(contactPage(done, { mode }), /background:#17232b;color:#fff/, mode);
  assert.doesNotMatch(contactPage(done, { mode: 'light' }), /#17232b/, 'a dark page is only for dark renders');
  const sz = contactPage(done, { mode: 'light', sizes: true, columns: 2 }); assert.ok(sz.includes('x-sizes.png') && !sz.includes('src="file:///tmp/x.png"') && /max-content/.test(sz) && !/width:100%/.test(sz));
  assert.equal(contactPage([{ ref: 'a/b', file: '/tmp/x.png', full: false }], { sizes: true }).includes('<img'), false, 'no strip, no cell');
});

test('sheet --still / --at / --sizes / --key write their own files (skipped without Chrome)', { skip: !findBrowser() }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'anim-sheet2-'));
  try {
    const r = await run(['sheet', 'us-pacific/hi-sea-turtle,us-pacific/ak-totem', '--out', dir, '--still', '--sizes', '--contact']);
    assert.equal(r.code, 0, r.err);
    for (const f of ['us-pacific__hi-sea-turtle-light-still.png', 'us-pacific__hi-sea-turtle-light-still-sizes.png', 'us-pacific__ak-totem-light-still.png', 'contact-light-still.png', 'contact-light-sizes-still.png']) assert.ok(existsSync(join(dir, f)), f);
    assert.deepEqual(pngSize(join(dir, 'us-pacific__hi-sea-turtle-light-still.png')), [512, 512]);
    assert.deepEqual(pngSize(join(dir, 'us-pacific__hi-sea-turtle-light-still-sizes.png')), [28 + 40 + 64 + 128 + 4 * 28 + 28, 128 + 28 + 36], 'a strip at 1x');
    assert.ok(r.out.includes('-sizes.png'), 'the strip paths are printed');
    // --at: another time, another file; a still render is not the animated one
    const at = await run(['sheet', 'us-pacific/hi-sea-turtle', '--out', dir, '--at', '2000']); assert.equal(at.code, 0, at.err); assert.ok(existsSync(join(dir, 'us-pacific__hi-sea-turtle-light-t2000.png')));
    assert.ok(!existsSync(join(dir, 'us-pacific__hi-sea-turtle-light.png')), 'the default-time file is not written by --at');
    for (const bad of ['x', '-1', '1.5', '', '999999999']) { const e = await run(['sheet', 'us-pacific/hi-sea-turtle', '--out', dir, `--at=${bad}`]); assert.equal(e.code, 1, bad); assert.match(e.err, /--at must be a whole number of milliseconds from 0 to 600000/, bad); }
    // --key renders one item of a pack; an unknown key is an error; --sizes on scenes says it draws nothing for them
    const k = await run(['sheet', '--pack', 'us-pacific', '--key', 'hi-sea-turtle', '--out', dir, '--mode', 'dark']); assert.equal(k.code, 0, k.err); assert.deepEqual(k.out.split('\n'), [join(dir, 'us-pacific__hi-sea-turtle-dark.png')]);
    const kk = await run(['sheet', '--pack', 'us-pacific', '--key', 'nope', '--out', dir]); assert.equal(kk.code, 1); assert.match(kk.err, /--key nope names no item of the selection/);
    const sc = await run(['sheet', 'us-pacific/hi-volcano-night', '--out', dir, '--sizes']); assert.equal(sc.code, 0, sc.err); assert.match(sc.err, /--sizes draws a strip for small items only/); assert.ok(!existsSync(join(dir, 'us-pacific__hi-volcano-night-light-sizes.png')));
    // the help says what each does and that the contact sheet is not 28 px
    const h = (await run(['sheet', '--help'])).out;
    for (const w of ['--key <v>', '--still', 'the rest frame, exactly what reduced motion shows', '--at <v>', '--sizes', '28, 40, 64, 128 px', 'a light render sits on a light page', 'NOT 28 px', 'Judge "does it read at 28 px" on the --sizes strip']) assert.ok(h.includes(w), w);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ---------- the CLI review fixes (FIX2) ---------- */

test('lint bytes do not depend on what was rendered before: stable ids, the thinnest scene gives one answer alone and in a pack', async () => {
  const html = (n) => `<svg viewBox="0 0 1600 900"><defs><linearGradient id="us${n}"><stop offset="0" stop-color="#fff"/></linearGradient><radialGradient id="us${n}x"/></defs><rect fill="url(#us${n})"/><use href="#us${n}x"/></svg>`;
  for (const legacy of [false, true]) {
    const a = stableIds(html('1'), legacy), b = stableIds(html('zz9'), legacy), len = legacy ? 5 : 4;
    assert.equal(a, b, 'the same drawing with different counters is the same text');
    assert.match(a, new RegExp(`id="us0*1" `.slice(0, 0) + `<linearGradient id="us.{${len - 2}}"`));
    assert.ok(a.includes(`url(#us${'0'.repeat(len - 3)}1)`) && a.includes(`href="#us${'0'.repeat(len - 3)}2"`), a);
  }
  assert.equal(stableIds('<g data-id="x" id="a"/>'), '<g data-id="x" id="us01"/>', 'only id attributes are renamed');
  assert.equal(stableIds('<rect/>'), '<rect/>');
  assert.ok(isLegacyProfile('scene-legacy') && isLegacyProfile('item-classic') && !isLegacyProfile('scene') && !isLegacyProfile('item'));
  const bytesOf = async (argv) => JSON.parse((await run(['lint', ...argv, '--json'])).out).items.find(i => i.ref === 'us-mountain/nm-white-sands').metrics.bytes;
  const alone = await bytesOf(['--ref', 'us-mountain/nm-white-sands']), inPack = await bytesOf(['--pack', 'us-mountain']), inTwo = await bytesOf(['--ref', 'us-mountain/az-grand-canyon,us-mountain/nm-white-sands']);
  assert.deepEqual([inPack, inTwo], [alone, alone], 'the same result alone, in a selection and in its pack');
  assert.equal(alone, TH.scene.bytes.min, 'it IS the thinnest accepted scene: the floor');
  assert.equal(BY_REF.get('us-mountain/nm-white-sands').metrics.bytes, alone, 'and the corpus measurement agrees');
});

test('the strict vocabulary: use, pattern, mask, symbol and filter are rejected for new packs, text, images, scripts, styles, links and SMIL everywhere; the legacy profiles keep theirs', () => {
  assert.deepEqual(allowedTagList(), ['path', 'circle', 'rect', 'ellipse', 'polygon', 'line', 'polyline', 'defs', 'clipPath', 'linearGradient', 'radialGradient', 'g', 'stop']);
  for (const t of ['text', 'image', 'script', 'style', 'a', 'animate', 'set', 'animateMotion', 'animateTransform', 'foreignObject']) assert.ok(forbiddenTagList().includes(t), t);
  const wrap = (x) => `<svg viewBox="0 0 1600 900"><defs><clipPath id="c"><rect width="9" height="9"/></clipPath><linearGradient id="g"><stop offset="0"/></linearGradient></defs>${x}</svg>`;
  const problems = (x, kind = 'scene', opts = {}) => measure(wrap(x), kind, opts).problems;
  assert.deepEqual(problems('<g clip-path="url(#c)"><rect width="4" height="4" fill="url(#g)"/></g>'), [], 'defs, clipPath and gradients are allowed');
  for (const t of ['<use href="#c"/>', '<pattern id="p"/>', '<mask id="m"/>', '<symbol id="s"/>', '<filter id="f"/>']) assert.ok(problems(t).some(p => /unsupported <(use|pattern|mask|symbol|filter)>/.test(p)), t);
  for (const t of ['<text>x</text>', '<image href="#c"/>', '<script/>', '<style/>', '<a href="#c"/>', '<animate/>']) assert.ok(problems(t).some(p => /is not allowed|unsupported/.test(p)), t);
  assert.deepEqual(problems('<use href="#c"/><pattern id="p"/>', 'scene', { legacy: true }), [], 'the frozen legacy profiles were calibrated on art that uses them');
  assert.ok(lintMarkup(wrap('<use href="#c"/>'), 'scene-legacy', TH).metrics.problems.length === 0 && lintMarkup(wrap('<use href="#c"/>'), 'scene', TH).metrics.problems.length === 1);
  for (const r of RES.results.filter(r => r.profile === 'scene' || r.profile === 'item')) assert.ok(!r.failures.some(f => f.rule === 'structure'), `${r.ref} keeps to the strict vocabulary`);
});

test('small items: a copy of an icon, only re-coloured or nudged, fails sharedShareAll; hand-drawn icons share a few shapes', async () => {
  const turtle = REG.items().find(e => e.ref === 'us-pacific/hi-sea-turtle');
  const svg = turtle.item.svg({});
  const recoloured = svg.replace(/class="([^"]*)"/g, (a, v) => `class="${v.split(' ').map(t => (t === 'c' ? 's' : t === 'k' ? 'm' : t)).join(' ')}"`);
  assert.notEqual(recoloured, svg);
  const keys = (x) => shapeKeys(wrapItem(x));
  const a = keys(svg), b = keys(recoloured);
  const shares = sharedShares([{ pack: 'p', keys: a }, { pack: 'p', keys: b }]);
  assert.equal(shares[1].all, 1, 'every shape of the recoloured copy is in the original');
  assert.ok(shares[1].all > TH.item.sharedShareAll.max && shares[1].pack > TH.item.sharedShare.max);
  const own = BY_REF.get('us-pacific/hi-sea-turtle').metrics;
  assert.ok(own.sharedShare <= TH.item.sharedShare.max && own.sharedShareAll <= TH.item.sharedShareAll.max, 'the original is clean');
  assert.ok(typeof own.sharedShare === 'number' && typeof own.sharedShareAll === 'number', 'small items carry the metrics');
  const rules = check({ ...own, sharedShare: 1, sharedShareAll: 1 }, 'item', TH).map(f => f.rule);
  assert.ok(rules.includes('sharedShare') && rules.includes('sharedShareAll'));
  assert.deepEqual(check({ ...own, sharedShare: 1, sharedShareAll: 1 }, 'item-classic', TH).filter(f => /sharedShare/.test(f.rule)), [], 'the frozen classic icons are templated: no rule for them');
  // the real CLI: the same trick, registered as a new pack item, fails the lint
  const dir = mkdtempSync(join(tmpdir(), 'anim-copy-'));
  try {
    const file = join(dir, '72-anim-pack-zz-copycat.js');
    writeFileSync(file, `(function () { animRegisterPack({ id: 'zz-copycat', name: 'Copycat', version: '1.0.0', description: 'A re-coloured copy of an accepted icon, for the lint tests.', css: '',
      items: [{ id: 'turtle', slot: 'symbol', label: 'Copied turtle', tags: ['test'], mood: 'calm', intensity: 'subtle', theme: 'any', season: 'any', region: 'any', colour: 'green', svg: () => ${JSON.stringify(recoloured)}, reduced: 'static' }] }); })();`);
    const r = await run(['lint', '--file', file, '--json']);
    assert.equal(r.code, 2, r.out);
    const item = JSON.parse(r.out).items[0];
    assert.equal(item.metrics.sharedShareAll, 1); assert.ok(item.failures.some(f => f.rule === 'sharedShareAll'), item.failures.map(f => f.rule).join());
  } finally { rmSync(dir, { recursive: true, force: true }); }
  // calibrate lists the rule with its corpus distribution
  const c = await run(['calibrate']);
  assert.match(c.out, /== item: 245 items[\s\S]*sharedShare\s+<= 0\.563[\s\S]*sharedShareAll\s+<= 0\.632/);
});

test('lint prints the thin spots of EVERY selected item in the default mode, --quiet silences them, --json carries the targets', async () => {
  const refs = ['us-mountain/nm-white-sands', 'asia-west/sa-signature', 'asia-west/abu-dhabi-skyline', 'us-midwest/mn-loon', 'us-pacific/hi-sea-turtle'];
  const r = await run(['lint', '--ref', refs.join(',')]);
  assert.equal(r.code, 0, r.out);
  for (const ref of refs) assert.match(r.out, new RegExp(`PASS  ${ref}`), `${ref} is listed although it passes`);
  assert.equal((r.out.match(/thin spots \d+ \(target <= 4\)/g) || []).length, 5, 'one thin-spot line per item');
  assert.match(r.out, /nm-white-sands[\s\S]*tinyShare\s+0\.421\s+median 0\.136\s+too much/, 'the rule, the value and the corpus median');
  assert.match(r.out, /MISSES THE TARGET: richness 0\.555 < 0\.90/); assert.match(r.out, /redraw target missed by \d+ passing item/);
  assert.match(r.out, /PASS: 5 items clean \(2 documented waivers\)\.$/, 'the last line is still the pass line');
  const q = await run(['lint', '--ref', refs.join(','), '--quiet']);
  assert.equal(q.code, 0); assert.doesNotMatch(q.out, /thin spots|PASS  us-|redraw target|too little/); assert.match(q.out, /PASS: 5 items clean/);
  const j = JSON.parse((await run(['lint', '--ref', refs.join(','), '--json'])).out);
  assert.deepEqual(j.targets, { richness: TARGETS.richness, maxThinSpots: TARGETS.maxThinSpots, maxRedraws: TARGETS.maxRedraws });
  assert.ok(j.items.every(i => typeof i.richness === 'number' && Array.isArray(i.targetMiss) && Array.isArray(i.thin)));
  // the whole registry still lists only the failures (972 blocks would drown them)
  assert.ok(TARGETS.richness === 0.9 && TARGETS.maxThinSpots === 4 && TARGETS.maxRedraws === 3);
  const short = await run(['lint', '--ref', 'asia-west/abu-dhabi-skyline']);   // three or fewer: the rules table, and the thin spots too
  assert.match(short.out, /PASS {2}richness/); assert.match(short.out, /thin spots 5/);
});

test('--option errors are friendly: a negative number is not swallowed as a flag, and a missing src/app is explained', async () => {
  const neg = await run(['lint', '--ref', '-3']);
  assert.equal(neg.code, 1); assert.match(neg.err, /--ref needs a value that does not start with a dash/);
  const none = mkdtempSync(join(tmpdir(), 'anim-empty-'));
  try {
    for (const argv of [['lint'], ['status'], ['status', 'x'], ['brief', 'x', '--kind', 'scene'], ['sheet', 'a/b']]) { const e = await run([...argv, '--root', none]); assert.equal(e.code, 1, argv.join(' ')); assert.match(e.err, /no src\/app folder under .* \(or give --root/, argv.join(' ')); assert.doesNotMatch(e.err, /ENOENT|scandir/); }
  } finally { rmSync(none, { recursive: true, force: true }); }
});

/* ---------- FIX3A: delay lint, detail per KB, thin-spot hints ---------- */

const mover = (cls, d, extra = '') => `<g class="${cls}"${d == null ? '' : ` style="--d:${d}"`}><circle class="c" cx="${10 + extra.length * 7}" cy="30" r="6"/></g>`;
const itemWith = (...movers) => lintItem('<path class="k" d="M10 50h44v8H10z"/><path class="s" d="M12 20l20-10 20 10v20H12z"/>' + movers.map((m, i) => m.replace('cx="', `cx="${12 + i * 9}`).replace(/cx="\d+(\d\d)"/, 'cx="$1"')).join('')).m;

test('sameDelay: how many moving elements share one --d; a mover with no --d is delay 0 (a bare x-glow counts), ".4s", "0.4s" and "400ms" are one delay', () => {
  assert.equal(itemWith(mover('x-glow'), mover('x-pulse'), mover('x-bob')).sameDelay, 3, 'three bare movers: three on delay 0');
  assert.equal(itemWith(mover('x-glow'), mover('x-pulse', '0s'), mover('x-bob', '0')).sameDelay, 3, 'a bare mover and "0s" and "0" are all delay 0');
  assert.equal(itemWith(mover('x-glow', '.4s'), mover('x-pulse', '0.4s'), mover('x-bob', '400ms')).sameDelay, 3, '.4s = 0.4s = 400ms');
  assert.equal(itemWith(mover('x-glow', '.4s'), mover('x-pulse', '.8s'), mover('x-bob', '-.4s')).sameDelay, 1, 'three different delays (a negative one is its own)');
  assert.equal(itemWith(mover('x-glow'), mover('x-pulse', '.5s'), mover('x-bob', '.5s'), mover('x-ring', '.5s')).sameDelay, 3);
  const m = itemWith(mover('x-glow'), mover('x-pulse'), mover('x-bob', '.3s')); assert.deepEqual([m.sameDelay, m.sameDelayValue], [2, '0'], 'the value that is shared is reported');
  assert.deepEqual([itemWith(mover('x-glow', '.3s')).sameDelay, itemWith(mover('x-glow', '.3s')).sameDelayValue], [1, ''], 'one mover shares nothing');
  assert.equal(measure(wrapItem('<path class="k" d="M10 50h44v8H10z"/>'), 'item', { classes: SCENE_CLASSES }).sameDelay, 0, 'nothing moves');
  // a thin spot only beyond the corpus 90th percentile (5): 6 on one delay is flagged, with the advice; the rubric's "no three" is not what the corpus does
  const six = lintItem('<path class="k" d="M10 50h44v8H10z"/>' + Array.from({ length: 6 }, (_, i) => `<g class="x-pulse"><circle class="c" cx="${12 + i * 9}" cy="30" r="5"/></g>`).join('')).m;
  assert.equal(six.sameDelay, 6); const thin = thinSpots(six, 'item', TH).find(t => t.rule === 'sameDelay');
  assert.ok(thin && thin.side === 'high' && thin.warn === 5, JSON.stringify(thin)); assert.match(thin.hint, /6 moving elements share --d 0s \(a mover with no --d is delay 0: a bare x-glow counts\)/); assert.match(thin.hint, /median of 3 on one delay and 90 % have at most 5/); assert.match(thin.hint, /aim for few, not zero/);
  assert.equal(thinSpots(itemWith(mover('x-glow'), mover('x-pulse'), mover('x-bob')), 'item', TH).some(t => t.rule === 'sameDelay'), false, 'three on a delay is the corpus median, not a thin spot');
  assert.ok(!check(six, 'item', TH).some(f => f.rule === 'sameDelay'), 'never a failure');
  assert.ok(!ruleTable(six, 'item', TH).some(r => r.rule === 'sameDelay' || r.rule === 'detailPerKB'), 'an advisory metric is not a row of the PASS / FAIL table');
  // the evidence behind the level: the accepted corpus and every gold exemplar have 3 or more on delay 0
  const gold = loadReference(ROOT).items.map(x => BY_REF.get(x.ref).metrics);
  assert.ok(gold.every(m => m.sameDelay >= 3 && m.sameDelay <= 5 && m.sameDelayValue === '0'), JSON.stringify(gold.map(m => [m.sameDelay, m.sameDelayValue])));
  assert.ok(RES.results.filter(r => r.profile === 'item').filter(r => r.metrics.sameDelay >= 3).length / RES.results.filter(r => r.profile === 'item').length > 0.5, 'most accepted items have 3 or more on one delay: "no three" is craft advice, not the corpus');
});

test('detailPerKB (shapes + path segments per KB) is the "too little drawn for its size" advisory: a path-heavy scene with few shapes per KB is not flagged, a padded one is; shapesPerKB keeps its hard floor', () => {
  const rich = RES.results.filter(r => r.profile === 'scene').map(r => r.metrics);
  assert.ok(rich.every(m => Math.abs(m.detailPerKB - (m.shapes + m.pathSegments) / (m.bytes / 1024)) < 0.01), 'the definition');
  // few shapes per KB, many segments: path-heavy (the pilot's hand-drawn ferns, rocks and houses)
  const heavy = rich.filter(m => m.shapesPerKB < TH.scene.shapesPerKB.min * 2 && m.detailPerKB > TH.scene.detailPerKB.median);
  const m = { ...rich[0], shapesPerKB: 5.5, detailPerKB: 49 }, padded = { ...rich[0], shapesPerKB: 5.5, detailPerKB: 12 };
  assert.ok(m.shapesPerKB >= TH.scene.shapesPerKB.min, 'above the hard floor: passes');
  assert.equal(thinSpots(m, 'scene', TH).some(t => t.rule === 'shapesPerKB' || t.rule === 'detailPerKB'), false, 'path-heavy: rich, not padded');
  const tp = thinSpots(padded, 'scene', TH).find(t => t.rule === 'detailPerKB');
  assert.ok(tp && tp.side === 'low' && tp.warn === 21, JSON.stringify(tp)); assert.match(tp.hint, /^too little drawn for its size: shapes plus path segments per KB\. Padded or repeated markup .*\(a path-heavy scene is fine: its segments count here\)/);
  // the hard floor still holds
  assert.ok(check({ ...rich[0], shapesPerKB: 3.0 }, 'scene', TH).some(f => f.rule === 'shapesPerKB'), 'below the corpus floor: a failure');
  assert.equal(TH.scene.shapesPerKB.min, 3.1); assert.equal(TH['scene-legacy'].shapesPerKB.min, 4.36);   // re-pinned at the 2026-10-07 merge (see PINNED)
  assert.ok(heavy.length >= 0);
});

test('hueSectors: the thin spot says which sectors carry area and how to fit a 5-stop dusk sky in five (the guide\'s palette costs four); the level stays at the corpus 90th percentile (5)', () => {
  assert.equal(TH.scene.hueSectors.warnMax, 5); assert.equal(TH.scene.hueSectors.max, 7, 'the hard ceiling is untouched');
  // the data behind keeping it: 93 % of the accepted scenes stay within five sectors, and the 5-stop dusk skies are within noise of that
  const sc = RES.results.filter(r => r.profile === 'scene'), over = (list) => list.filter(r => r.metrics.hueSectors > 5).length / list.length;
  assert.ok(over(sc) > 0.03 && over(sc) < 0.1, 'overall ' + over(sc)); const dusk = sc.filter(r => r.metrics.skyStops >= 5); assert.ok(dusk.length > 40 && over(dusk) < 0.2, `5-stop skies: ${dusk.length} scenes, ${over(dusk)} above five`);
  const sixSectors = sc.find(r => r.metrics.hueSectors >= 6); assert.ok(sixSectors);
  const t = thinSpots(sixSectors.metrics, 'scene', TH).find(x => x.rule === 'hueSectors');
  assert.ok(t && t.side === 'high'); assert.match(t.hint, new RegExp(`^${sixSectors.metrics.hueSectors} of the 12 hue sectors carry area \\(`)); for (const n of sixSectors.metrics.hueSectorList) assert.ok(t.hint.includes(n) && HUE_NAMES.includes(n), n);
  assert.match(t.hint, /A 5-stop dusk sky alone spends four \(blue, violet, magenta, red to gold\)/); assert.match(t.hint, /ONE more family between them \(muted greens OR teals\)/); assert.match(t.hint, /accents under 4 % of the painted area/);
  assert.equal(sixSectors.metrics.hueSectorList.length, sixSectors.metrics.hueSectors);
  // the guide's own palette: its sky stops fall in four sectors
  const sector = (hex) => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return Math.floor(((h * 60) + 360) % 360 / 30) % 12; };
  assert.deepEqual([...new Set(['#4f4a92', '#b26aa0', '#ff8a7e', '#ffc080', '#ffe4a0'].map(sector))].sort((a, b) => a - b), [0, 1, 8, 10], 'the dusk palette of the style guide is four sectors: one more family fits under the advisory');
});

test('every thin spot says what to do about it: identical seeds cause sharedShare (give every call its own seed), delay, copies, and the CLI prints the hint', async () => {
  for (const rule of ['sharedShare', 'sharedShareAll']) { const x = THIN_HINTS[rule][1](); assert.match(x, /seed/); assert.match(x, /[Gg]ive every .*call its own seed/); }
  assert.match(THIN_HINTS.sharedShare[1](), /stars\(\), birds\(\), shimmer\(\), puffs\(\), ridge\(\) and canopy\(\) draw the SAME shapes for the same seed/);
  for (const rule of ['distinctRatio', 'distinctForms']) assert.match(THIN_HINTS[rule][0], /<g transform=.*scale|scale\(\)/); assert.match(THIN_HINTS.distinctRatio[0], /puffs\(\) with n above 3/); assert.match(THIN_HINTS.distinctRatio[0], /bake the scale into the coordinates/);
  const seed = RES.results.find(r => r.profile === 'scene' && thinSpots(r.metrics, 'scene', TH).some(t => t.rule === 'sharedShare' || t.rule === 'sharedShareAll'));
  if (seed) { const t = thinSpots(seed.metrics, 'scene', TH).find(x => /^sharedShare/.test(x.rule)); assert.match(t.hint, /own seed/); }
  const r = await run(['lint', '--ref', 'us-pacific/ak-midnight-sun,us-pacific/hi-sea-turtle']);
  assert.match(r.out, /delays: \d+ moving elements share --d 0s \(a bare x-\* counts as 0\)|thin spots/);
  const text = (await run(['lint', '--help'])).out;
  for (const w of ['Good to know:', 'us-lit', 'counts as ONE shape and ONE lit pane group', 'give every call its own seed', 'detailPerKB', 'a bare x-glow counts as delay 0', '5-stop dusk sky already spends four of the five hue sectors']) assert.ok(text.includes(w), w);
  const j = JSON.parse((await run(['lint', '--pack', 'us-pacific', '--json'])).out); assert.ok(j.items.every(i => i.thin.every(t => 'hint' in t)), 'the JSON carries the hints too');
  assert.ok(j.items.some(i => i.metrics.detailPerKB > 0 || i.metrics.sameDelay >= 0));
});

test('sheet --crop: a phone and a square tile render what they show of a scene (skipped without Chrome)', { skip: !findBrowser() }, async () => {
  assert.deepEqual(CROPS, { square: 900, phone: 420 });
  const dir = mkdtempSync(join(tmpdir(), 'anim-crop-'));
  try {
    const r = await run(['sheet', 'us-mountain/nm-white-sands', 'us-pacific/hi-sea-turtle', '--out', dir, '--crop', 'phone', '--contact']);
    assert.equal(r.code, 0, r.err);
    const phone = readFileSync(join(dir, 'us-mountain__nm-white-sands-light-phone.png'));
    assert.deepEqual([phone.readUInt32BE(16), phone.readUInt32BE(20)], [420, 900], 'the central 420 x 900 of the scene');
    const turtle = readFileSync(join(dir, 'us-pacific__hi-sea-turtle-light.png'));
    assert.deepEqual([turtle.readUInt32BE(16), turtle.readUInt32BE(20)], [512, 512], 'a small item is never cropped');
    assert.ok(existsSync(join(dir, 'contact-light-phone.png')));
    const sq = await run(['sheet', 'us-mountain/nm-white-sands', '--out', dir, '--crop', 'square']);
    assert.equal(sq.code, 0, sq.err);
    const sqp = readFileSync(join(dir, 'us-mountain__nm-white-sands-light-square.png'));
    assert.deepEqual([sqp.readUInt32BE(16), sqp.readUInt32BE(20)], [900, 900]);
    const bad = await run(['sheet', 'us-mountain/nm-white-sands', '--out', dir, '--crop', 'wide']);
    assert.equal(bad.code, 1); assert.match(bad.err, /--crop must be one of square, phone/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
