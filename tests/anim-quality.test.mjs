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
import { measure, check, richness, proposeThresholds, RULE_HINTS, thinSpots, parseMarkup, pathBox, colourClusters, motionKind, checkCss, shapeKeys, sharedShares, profileFor, applyWaivers, RULE_PLAN, RICHNESS_COMPONENTS, ruleTable } from '../tools/lib/anim-quality.mjs';
import { main, lintRegistry, loadThresholds, loadReference, loadCommands, COMMANDS } from '../tools/anim-pack.mjs';
import { loadRegistry, findBrowser, registrySources } from '../tools/lib/anim-render.mjs';
import { mkdirSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TH = loadThresholds(ROOT);
const REG = loadRegistry(ROOT);
const RES = lintRegistry(REG, TH);                       // measures every item once
const BY_REF = new Map(RES.results.map(r => [r.ref, r]));
const PACK_CSS = (id) => (REG.packs().find(p => p.id === id) || {}).css || '';
const SCENE_CLASSES = REG.classesFor({ css: PACK_CSS('us-pacific') });

const wrapScene = (inner) => `<span class="anim-scene ap-art c-orange sz-fill ap-opening is-live ap-full" data-anim="t/t" aria-hidden="true"><svg class="as ap-svg as-t" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${inner}</svg></span>`;
const wrapItem = (inner) => `<span class="anim-scene ap-art c-orange sz-hero ap-symbol is-live" data-anim="t/t" aria-hidden="true"><svg class="as ap-svg as-t" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${inner}</svg></span>`;
const lintScene = (inner, profile = 'scene') => { const m = measure(wrapScene(inner), 'scene', { classes: SCENE_CLASSES }); return { m, rules: check(m, profile, TH).map(f => f.rule) }; };
const lintItem = (inner, profile = 'item') => { const m = measure(wrapItem(inner), 'item', { classes: SCENE_CLASSES }); return { m, rules: check(m, profile, TH).map(f => f.rule) }; };

/* ---------- (a) the corpus passes ---------- */

test('the registry has full scenes and small items to lint, in every profile', () => {
  assert.ok(RES.summary.scenes >= 390 && RES.summary.small >= 570, `${RES.summary.scenes} scenes, ${RES.summary.small} small items`);
  for (const p of ['scene', 'scene-legacy', 'item', 'item-classic']) assert.ok(RES.results.some(r => r.profile === p), `something is judged by ${p}`);
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
  assert.deepEqual(Object.keys(TH.profiles).sort(), ['item', 'item-classic', 'scene', 'scene-legacy']);
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
        assert.ok(Number.isFinite(warn), `${profile}.${metric}: the advisory (10th percentile) level`);
        assert.ok(side === 'min' ? warn >= t.min : warn <= t.max, `${profile}.${metric}: the advisory level is inside the limit`);
      }
      for (const side of ['min', 'max']) if (!sides.includes(side)) assert.equal(t[side], undefined, `${profile}.${metric} has no ${side}`);
      if (t.min != null && t.max != null) assert.ok(t.min <= t.max, `${profile}.${metric}: min <= max`);
    }
  }
});

test('every rule says how to fix it (a hint for each limited side)', () => {
  for (const [profile, plan] of Object.entries(RULE_PLAN)) for (const [metric, sides] of Object.entries(plan)) {
    if (metric === 'richness') continue;
    for (const side of sides) assert.ok(RULE_HINTS[metric] && RULE_HINTS[metric][side === 'min' ? 0 : 1], `${profile}.${metric}.${side} has a hint`);
  }
});

// The ratchet. The committed limits as of 2026-10-05: a floor may be RAISED (better art landed, `calibrate --propose`) but never lowered,
// and a ceiling never raised, to let a weak drawing in. Editing this table to lower a limit is the deliberate act the review should catch.
const PINNED = {
  'scene': { bytes: { min: 9622, max: 32000 }, shapes: { min: 65 }, paths: { min: 13 }, pathSegments: { min: 98 }, segmentsPerShape: { min: 0.38 }, bytesPerShape: { min: 72 }, shapesPerKB: { min: 3.28 }, distinctShapes: { min: 57 }, distinctForms: { min: 47 }, distinctRatio: { min: 0.68 }, colours: { min: 27 }, colourClusters: { min: 15 }, coloursWithArea: { min: 13 }, tonalRange: { min: 0.824 }, hueSectors: { max: 7 }, gradients: { min: 5 }, gradientsUsed: { min: 5 }, gradientFilledShapes: { min: 5 }, translucentLayers: { min: 14 }, skyStops: { min: 2 }, bands: { min: 2 }, bandFills: { min: 2 }, detailShapes: { min: 49 }, detailCells: { min: 24 }, detailColumns: { min: 8 }, detailRows: { min: 6 }, focusShare: { min: 0.111 }, sizeClasses: { min: 8 }, tinyShare: { max: 0.747 }, hiddenShare: { max: 0.174 }, bottomCover: { min: 1 }, movingGroups: { min: 12 }, motionKinds: { min: 5 }, driftGroups: { min: 3 }, ambientGroups: { min: 7 }, ambientKinds: { min: 1 }, motionZones: { min: 2 }, distinctDurations: { min: 11 }, staggerDelays: { min: 6 }, movingPerShape: { min: 0.073, max: 0.701 }, sharedShare: { max: 0.257 }, sharedShareAll: { max: 0.361 }, unknownClasses: { max: 0 }, coverUps: { max: 0 }, richness: { min: 0.66 } },
  'scene-legacy': { bytes: { min: 12355, max: 32000 }, shapes: { min: 77 }, paths: { min: 17 }, pathSegments: { min: 176 }, segmentsPerShape: { min: 0.69 }, bytesPerShape: { min: 72 }, shapesPerKB: { min: 4.7 }, distinctShapes: { min: 77 }, distinctForms: { min: 46 }, distinctRatio: { min: 0.516 }, colours: { min: 29 }, colourClusters: { min: 17 }, coloursWithArea: { min: 15 }, tonalRange: { min: 0.892 }, hueSectors: { max: 5 }, gradients: { min: 7 }, gradientsUsed: { min: 7 }, gradientFilledShapes: { min: 19 }, translucentLayers: { min: 19 }, skyStops: { min: 2 }, bands: { min: 3 }, bandFills: { min: 3 }, detailShapes: { min: 58 }, detailCells: { min: 33 }, detailColumns: { min: 15 }, detailRows: { min: 4 }, focusShare: { min: 0.13 }, sizeClasses: { min: 8 }, tinyShare: { max: 0.447 }, hiddenShare: { max: 0.142 }, bottomCover: { min: 1 }, movingGroups: { min: 19 }, motionKinds: { min: 7 }, driftGroups: { min: 3 }, ambientGroups: { min: 10 }, ambientKinds: { min: 3 }, motionZones: { min: 2 }, distinctDurations: { min: 17 }, staggerDelays: { min: 8 }, movingPerShape: { min: 0.055, max: 0.645 }, sharedShare: { max: 1 }, sharedShareAll: { max: 1 }, unknownClasses: { max: 0 }, coverUps: { max: 0 }, richness: { min: 0.795 } },
  'item': { bytes: { min: 600, max: 14000 }, shapes: { min: 7 }, paths: { min: 3 }, pathSegments: { min: 14 }, distinctShapes: { min: 4 }, distinctForms: { min: 4 }, distinctFills: { min: 1 }, inkCells: { min: 30 }, extentW: { min: 0.591 }, extentH: { min: 0.534 }, colours: { max: 0 }, gradients: { max: 0 }, inlinePaint: { max: 0 }, unknownClasses: { max: 0 }, movingGroups: { min: 1 }, motionKinds: { min: 1 }, motionShare: { min: 0.1 }, hiddenShapes: { max: 3 }, richness: { min: 0.642 } },
  'item-classic': { bytes: { min: 321, max: 14000 }, shapes: { min: 1 }, paths: { min: 0 }, pathSegments: { min: 0 }, distinctShapes: { min: 1 }, distinctForms: { min: 1 }, distinctFills: { min: 0 }, inkCells: { min: 10 }, extentW: { min: 0.219 }, extentH: { min: 0.125 }, colours: { max: 0 }, gradients: { max: 0 }, inlinePaint: { max: 0 }, unknownClasses: { max: 6 }, movingGroups: { min: 0 }, motionKinds: { min: 0 }, motionShare: { min: 0 }, hiddenShapes: { max: 5 }, richness: { min: 0.359 } },
};

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
  // each floor is at the corpus minimum of its profile: raising it would fail an accepted drawing, lowering it lets weaker work in
  for (const profile of Object.keys(RULE_PLAN)) {
    const rs = RES.results.filter(r => r.profile === profile);
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
  for (const r of RES.results) assert.equal(r.profile, profileFor({ pack: r.pack, full: r.full }, TH));
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
  for (const x of ref.weaker) { assert.ok(BY_REF.has(x.ref), x.ref); assert.ok(x.wrong.length > 40 && x.fix.length > 20, x.ref); }
  assert.equal(new Set([...ref.scenes, ...ref.items, ...ref.weaker].map(x => x.ref)).size, ref.scenes.length + ref.items.length + ref.weaker.length, 'no ref twice');
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
  const j = JSON.parse((await run(['reference', '--json'])).out);
  assert.ok(j.scenes.length >= 10);
});

test('calibration: proposing thresholds from today\'s corpus reproduces the committed floors (only the two documented overrides differ)', () => {
  for (const profile of Object.keys(RULE_PLAN)) {
    const rs = RES.results.filter(r => r.profile === profile);
    const caps = { bytes: profile.startsWith('scene') ? REG.limits.scene : REG.limits.item };
    const proposed = proposeThresholds(rs.map(r => r.metrics), profile, { caps });
    const differs = [];
    for (const [metric, t] of Object.entries(proposed)) {
      if (metric === 'richness') { assert.deepEqual(t.components, TH[profile].richness.components, `${profile}: richness components are the corpus medians`); continue; }
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
    assert.equal(findBrowser({ PLAYWRIGHT_BROWSERS_PATH: dir, PATH: '' }), exe);
    const own = join(dir, 'my-chrome');
    writeFileSync(own, '');
    assert.equal(findBrowser({ CHROME_PATH: own, PLAYWRIGHT_BROWSERS_PATH: dir, PATH: '' }), own);
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
