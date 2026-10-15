// World compare (docs/dev/WORLD_ENGINE.md 16.4, 16.5 item 4; requirements U3, U4, P7, X4). Node >= 20, no dependencies.
//
//   worldComparePlan(spec, o)                   -> [{ date, moment, at }]: 3 dates x 5 times at the scene's place
//   worldCompare(chrome, v3, original, o)       -> { sheet, rows: [{ at, label, v3, original }], critic?, errors }
//       v3: { ref } | { spec, id }; original: { ref } (the v1 / v2 scene it replaces). Each side is ONE page re-lit per moment
//       (sceneHostSet), so both are drawn by the app's own renderer at the same sky; the sheet puts them side by side, one row per
//       moment, with the critic scores of both (o.critic: { v3, source } from tools/lib/world/critic.mjs) and the reviewer's list.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { worldPageOpen, composeSheet, worldReviewChecklist, fileSafe } from './sheet.mjs';
import { worldMomentsOf, WORLD_DATES3 } from './adversarial.mjs';

export function worldComparePlan(spec, o = {}) { return worldMomentsOf(spec, o.dates || WORLD_DATES3); }

export async function worldCompare(chrome, v3, original, o = {}) {
  const size = o.size || { w: 640, h: 360 }, dir = o.dir || join(tmpdir(), 'opendash-world', 'compare');
  mkdirSync(dir, { recursive: true });
  const spec = v3.spec || o.spec || {}, plan = worldComparePlan(spec, o), errors = [];
  const name = fileSafe((v3.ref || v3.id || 'world') + '--vs--' + (original.ref || 'original'));
  const rows = plan.map(m => ({ at: m.at, label: `${m.date} ${m.moment}` }));
  for (const [side, src] of [['original', original], ['v3', v3]]) {
    let page = null;
    try { page = await worldPageOpen(chrome, src, { size, at: plan[0] && plan[0].at, root: o.root }); }
    catch (e) { errors.push(`${side}: ${e.message}`); continue; }
    for (const r of rows) {
      try { await page.set({ at: r.at }); r[side] = join(dir, `${name}--${side}--${fileSafe(r.label)}.png`); writeFileSync(r[side], await page.png()); }
      catch (e) { errors.push(`${side} ${r.label}: ${e.message}`); }
    }
    for (const e of await page.errors()) errors.push(`${side} page: ${e}`);
  }
  const cells = [];
  rows.forEach((r, i) => {
    cells.push({ row: i, col: 0, rowLabel: r.label, label: 'original: ' + (original.ref || ''), file: r.original });
    cells.push({ row: i, col: 1, rowLabel: r.label, label: 'world: ' + (v3.ref || v3.id || ''), file: r.v3 });
  });
  const c = o.critic, notes = [];
  if (c) notes.push(`critic (box measure): world ${c.v3} vs original ${c.source}: ${c.v3 + 0.5 >= c.source ? 'at least as rich' : 'POORER than the original (P7, U4)'}`);
  notes.push('Reviewer: compare each row and list every one of these you see:', ...worldReviewChecklist('compare'));
  const sheet = join(dir, `${name}--compare.png`);
  writeFileSync(sheet, await composeSheet(chrome, cells, { title: `world compare: ${v3.ref || v3.id} vs ${original.ref}, 3 dates x 5 times`, thumb: { w: Math.min(size.w, 480), h: Math.round(Math.min(size.w, 480) * size.h / size.w) }, notes }));
  return { sheet, rows, errors };
}
