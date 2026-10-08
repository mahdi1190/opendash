// scene compare-to-golden: a scene against its nearest golden references (docs/dev/SCENE_ENGINE_V2.md 22.3; builder G).
// node tools/lib/scene-cmd/compare-to-golden.mjs <ref> [--n 3] [--out dir] [--no-render] [--with-candidates] [--json]
//
// Finds the n nearest APPROVED golden scenes by composition fingerprint (scene-composition.mjs), prints the metric deltas ("hazeMean
// 0.31 against golden 0.05 to 0.11 (above)"), and renders a side-by-side sheet: the scene and its neighbours at noon and at night.
// The golden entries must be measured (scene golden measure). --with-candidates also compares with measured, unapproved candidates
// (marked as such): useful before the user has approved anything.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadGolden, goldenEntries, goldenNeighbours, measureScene, compareToGolden, renderSheet, cmdLib, subPositionals, standalone, withChromeOrNull, momentsFor, fileSafe, esc } from '../scene-critic.mjs';

const NAME = 'compare-to-golden';
const command = {
  summary: 'a scene against its nearest golden references: the metric deltas, and a side-by-side sheet at noon and at night',
  usage: 'scene compare-to-golden <ref> [--n 3] [--out dir] [--no-render] [--with-candidates] [--json]',
  options: {
    n: { type: 'string', help: 'compare-to-golden: how many neighbours (default 3)' },
    out: { type: 'string', help: 'compare-to-golden: the output folder (default .anim-ref/golden/)' },
    'no-render': { type: 'boolean', help: 'compare-to-golden: the deltas only, no sheet' },
    'with-candidates': { type: 'boolean', help: 'compare-to-golden: include measured, unapproved candidates' },
    json: { type: 'boolean', help: 'compare-to-golden: print JSON' },
    date: { type: 'string', help: 'compare-to-golden: the day of the moments (YYYY-MM-DD, default today)' },
  },
  async run(args, ctx, lib0) {
    const root = ctx.root, [ref] = subPositionals(ctx, NAME);
    if (!ref) throw new Error('compare-to-golden needs a ref (<pack>/<id>)');
    const n = args.n ? Number(args.n) : 3;
    if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error('--n must be 1 to 10');
    const lib = await cmdLib(lib0);
    const reg = lib.loadRegistry(root), E = lib.engineOf(reg);
    E.require('scene compare-to-golden');
    const e = reg.items().find(x => x.ref === ref);
    if (!e || !e.item || !e.item.composed) throw new Error(`unknown composed scene ${ref}`);
    const sc = { ref, item: e.item, data: lib.dataOf(e.item, E), pack: e.pack };
    const m = measureScene(sc, { E, reg, thresholds: lib.loadThresholds(root), lint: lib.lintScene });
    const g = loadGolden(root);
    const pool = goldenEntries(g, { approvedOnly: !args['with-candidates'] }).filter(x => x.kind === 'scene' && x.metrics);
    if (!pool.length) {
      ctx.out(`no ${args['with-candidates'] ? 'measured' : 'approved and measured'} golden scenes yet (scene golden measure${args['with-candidates'] ? ' --with-candidates' : ''}; the user approves entries in tools/scene-golden.json)`);
      return 0;
    }
    const nb = goldenNeighbours(m.fingerprint, pool, n);
    const deltas = compareToGolden(m, nb);
    if (args.json) ctx.out(JSON.stringify({ ref, neighbours: nb.map(x => ({ ref: x.ref, sim: x.sim, approved: x.approved, shared: x.shared })), deltas }, null, 1));
    else {
      ctx.out(`${ref}: nearest golden ${nb.map(x => `${x.ref} (${x.sim}${x.approved ? '' : ', candidate'})`).join(', ')}`);
      for (const d of deltas) ctx.out(`  ${d.verdict === 'within' ? '  ' : '! '}${d.line}`);
      const off = deltas.filter(d => d.verdict !== 'within').length;
      ctx.out(off ? `${off} metric(s) outside the golden range` : 'every metric within the golden range');
    }
    if (args['no-render']) return 0;
    const outDir = resolve(args.out || join(root, '.anim-ref', 'golden'));
    mkdirSync(outDir, { recursive: true });
    await withChromeOrNull(lib, args, async (chrome) => {
      if (!chrome) { ctx.err('compare-to-golden: no Chrome or page harness: no sheet'); return; }
      const rows = [];
      for (const s of [sc].concat(nb.map(x => { const ee = reg.items().find(y => y.ref === x.ref); return ee ? { ref: x.ref, item: ee.item, data: lib.dataOf(ee.item, E), pack: ee.pack, sim: x.sim } : null; }).filter(Boolean))) {
        const r = await renderSheet(chrome, lib.harness, s, { root, times: momentsFor(lib.times, s.data, args.date, ['noon', 'night']), outDir });
        rows.push({ ref: s.ref, sim: s.sim, file: r.sheet });
      }
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:10px;background:#15181d;color:#e8ecf2;font:14px system-ui,sans-serif}figure{margin:0 0 10px}img{display:block;width:1100px}</style></head><body>`
        + rows.map((r, i) => `<figure><img src="${pathToFileURL(r.file).href}"><figcaption>${i ? `golden neighbour ${i} (similarity ${r.sim})` : 'the scene'}: ${esc(r.ref)}</figcaption></figure>`).join('') + '</body></html>';
      const file = join(outDir, `compare-${fileSafe(ref)}.png`);
      writeFileSync(file, await chrome.screenshot({ html, width: 1120, height: 'auto', transparent: false }));
      ctx.out(file);
    });
    return 0;
  },
};
export default command;
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) standalone(command, NAME).then(c => { process.exitCode = c; });
