// Engine-wide checks for the bug classes of the 15 Oct audit (the user: "even when looking at different seasons the trees lose
// their heads"). Each test sweeps the WHOLE library or a real test scene, so a class of fault cannot come back in one object
// while another is fixed. The pixel versions of the same checks run on real frames in `node tools/world.mjs check`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadScenes } from '../tools/lib/scene-page.mjs';
import { loadEngine, resolveRef } from '../tools/lib/world/convert.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const E = loadEngine({ root: ROOT });
const specOfRef = (r) => E.worldHostSpec(resolveRef(E, r).item);
// the library and the material functions (the names loadEngine does not expose)
const K = (() => {
  const extra = "globalThis.__wck = { sceneObjs, sceneObjShapes, scenePathBox, worldMaterialOf: typeof worldMaterialOf === 'undefined' ? null : worldMaterialOf, worldMaterialVisible: typeof worldMaterialVisible === 'undefined' ? null : worldMaterialVisible, worldMaterialCtx: typeof worldMaterialCtx === 'undefined' ? null : worldMaterialCtx, worldMaterialFor: typeof worldMaterialFor === 'undefined' ? null : worldMaterialFor };";
  loadScenes(ROOT, { fixtures: false, extra });
  const k = globalThis.__wck; delete globalThis.__wck;
  return k;
})();
const SEASON_MS = { spring: Date.parse('2026-04-18T13:00:00Z'), summer: Date.parse('2026-07-16T13:00:00Z'), autumn: Date.parse('2026-10-22T13:00:00Z'), winter: Date.parse('2026-01-20T13:00:00Z') };
const ctxOf = (season) => { const ms = SEASON_MS[season], d = new Date(ms); return { ms, month: d.getUTCMonth(), doy: Math.floor((ms - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1, season, lat: 51.3, weather: 'clear' }; };

test('bug 1: every tree in the library keeps its crown (or its winter branches) in every season after the materials choose what shows', () => {
  // the same selection _wfrSprite makes: the season's art, each shape's material, dropped when the material says it is not visible
  const bad = [];
  let n = 0;
  for (const def of K.sceneObjs()) {
    if (!/^tree\./.test(def.id) || /trunk|stump|log|snag/.test(def.id)) continue;
    const nv = Math.max(1, (def.variants && def.variants.length) || 1);
    for (let v = 0; v < Math.min(nv, 6); v++) for (const season of Object.keys(SEASON_MS)) {
      const sh = K.sceneObjShapes(def.id, v, season);
      if (!sh || !sh.box) continue;
      const ctx = ctxOf(season), mc = K.worldMaterialFor && K.worldMaterialCtx ? K.worldMaterialFor(K.worldMaterialCtx(ctx), { obj: def.id, id: def.id + '#' + v }, ctx) : null;
      const top = sh.box[1] + (sh.box[3] - sh.box[1]) * 0.4;
      let vis = 0, inTop = 0;
      for (const p of sh.still || sh.order.filter(q => q !== 'lit')) for (const s of sh.parts[p] || []) {
        const mat = K.worldMaterialOf ? K.worldMaterialOf(def.id, p, typeof s.f === 'string' ? s.f : null, s) : 'paint';
        if (K.worldMaterialVisible && mc && !K.worldMaterialVisible(mat, mc)) continue;
        const b = K.scenePathBox(s.d, s.m);
        if (!b) continue;
        vis++;
        if (b[1] < top) inTop++;
      }
      n++;
      if (!vis) bad.push(`${def.id} v${v} ${season}: nothing is drawn`);
      else if (!inTop) bad.push(`${def.id} v${v} ${season}: nothing in the top 40 % of its box (a trunk with no head)`);
    }
  }
  assert.ok(n > 100, `trees checked: ${n}`);
  assert.deepEqual(bad.slice(0, 30), [], `${bad.length} tree drawing(s) lose their crown`);
});

test('bug 12: a world scene runs no v2 screen particles (no petals, motes, fireflies or leaves from an empty sky)', () => {
  for (const r of ['world-test/fleet-canal-2-w3', 'world-test/fleet-pond-2-w3', 'world-test/sheffield-kelham-1-w3']) {
    const d = E.worldHostV2Data(specOfRef(r), { id: 'chk-' + r.split('/')[1] });
    const p = d && d.particles;
    assert.ok(p === 'none' || (p && typeof p === 'object' && (p.kind === 'none' || !p.n)), `${r}: particles ${JSON.stringify(p)}`);
  }
});

test('bug 21: the renderer\'s plan splits 300+ statics spread over depth into at least 6 chunks (one bitmap makes every mover redraw its occluders)', { todo: 'scene-fill-framing / render: _wfrMergeChunks merges the canal\'s statics into 2 chunks (audit bug 21)' }, () => {
  const spec = specOfRef('world-test/fleet-canal-2-w3'), world = E.worldBuild(spec, { season: 'summer' });
  const nav = E.worldNavBuild ? E.worldNavBuild(world) : null;
  const plan = E.worldFramePlan(world, { season: 'summer', nav });
  assert.ok(plan.recs.length >= 300, `statics ${plan.recs.length}`);
  assert.ok(plan.chunks.length >= 6, `${plan.chunks.length} chunk(s) for ${plan.recs.length} statics`);
});
