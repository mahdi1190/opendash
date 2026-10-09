// scene golden: the golden set (docs/dev/SCENE_ENGINE_V2.md 22; builder G). Loaded by the `scene` command's delegation, or on its own:
// node tools/lib/scene-cmd/golden.mjs list
//
//   scene golden list                         the entries of tools/scene-golden.json: approved or candidate, measured or not
//   scene golden sheet [--out dir]            every candidate scene at noon, golden hour and night (800 x 450) and one contact sheet of them,
//                                             for the user to approve (.anim-ref/golden/); objects are listed (object sheet <id> draws them)
//   scene golden measure [--with-candidates]       stores each APPROVED scene's metrics (fingerprint, composition, the critic's measures, the
//                                             lint's numeric values) in the file; --with-candidates measures the unapproved ones too
//   scene golden calibrate [--apply-to file]  proposes thresholds from the approved metrics (golden max + 15 % for "at most" rules, min - 15 %
//                                             for "at least"), as a patch; --apply-to writes them into a COPY of anim-quality.json at <file>.
//                                             While nothing is approved it proposes nothing.
// `approved` is set to true ONLY by the user (by hand in the file); no command here sets it.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadGolden, saveGolden, goldenEntries, measureScene, calibrateThresholds, renderSheet, cmdLib, subPositionals, standalone, withChromeOrNull, momentsFor, fileSafe, esc } from '../scene-critic.mjs';

const NAME = 'golden';
const command = {
  summary: 'the golden set (tools/scene-golden.json): list, sheet (render the candidates for approval), measure (store the approved metrics), calibrate (propose thresholds)',
  usage: 'scene golden list | sheet [--out dir] | measure [--with-candidates] | calibrate [--apply-to <file>]',
  options: {
    'with-candidates': { type: 'boolean', help: 'golden measure: also measure the unapproved candidates (compare-to-golden --with-candidates reads them)' },
    'apply-to': { type: 'string', help: 'golden calibrate: write the proposals into a copy of tools/anim-quality.json at this path' },
    out: { type: 'string', help: 'golden sheet: the output folder (default .anim-ref/golden/)' },
    date: { type: 'string', help: 'golden sheet: the day of the moments (YYYY-MM-DD, default today)' },
  },
  async run(args, ctx, lib0) {
    const root = ctx.root, [action] = subPositionals(ctx, NAME);
    const g = loadGolden(root);
    if (!action || action === 'list') {
      const es = goldenEntries(g);
      ctx.out(`${es.length} entries (${es.filter(e => e.approved === true).length} approved by the user):`);
      for (const e of es) ctx.out(`  ${e.approved === true ? 'APPROVED ' : 'candidate'} ${e.kind === 'scene' ? e.ref : 'object ' + e.object}${e.metrics ? '  [measured]' : ''}   ${e.why || ''}`);
      if (g.calibration) ctx.out(`calibration: ${JSON.stringify(g.calibration)}`);
      return 0;
    }
    if (action === 'calibrate') {
      const res = calibrateThresholds(goldenEntries(g));
      ctx.out(res.note);
      if (!Object.keys(res.proposals).length) return 0;
      ctx.out(JSON.stringify(res.proposals, null, 1));
      if (args['apply-to']) {
        const q = JSON.parse(readFileSync(join(root, 'tools', 'anim-quality.json'), 'utf8'));
        for (const [path, p] of Object.entries(res.proposals)) {
          const keys = path.split('.'); let o = q;
          for (let i = 0; i < keys.length - 1; i++) { o[keys[i]] = o[keys[i]] && typeof o[keys[i]] === 'object' ? o[keys[i]] : {}; o = o[keys[i]]; }
          o[keys[keys.length - 1]] = p.value;
        }
        const file = resolve(args['apply-to']);
        if (file === resolve(join(root, 'tools', 'anim-quality.json'))) throw new Error('--apply-to writes a COPY: the reviewer applies only tighter values to tools/anim-quality.json by hand');
        writeFileSync(file, JSON.stringify(q, null, 1) + '\n');
        ctx.out(file);
      }
      return 0;
    }
    const lib = await cmdLib(lib0);
    const reg = lib.loadRegistry(root), E = lib.engineOf(reg);
    E.require(`scene golden ${action}`);
    const byRef = new Map(reg.items().map(e => [e.ref, e]));
    const sceneOf = (ref) => { const e = byRef.get(ref); if (!e || !e.item || !e.item.composed) return null; return { ref, item: e.item, data: lib.dataOf(e.item, E), pack: e.pack }; };
    if (action === 'measure') {
      const thresholds = lib.loadThresholds(root);
      let n = 0;
      for (const e of g.entries) {
        if (e.kind !== 'scene' || !(e.approved === true || args['with-candidates'])) continue;
        const sc = sceneOf(e.ref);
        if (!sc) { ctx.err(`  ${e.ref}: not a composed scene in this checkout`); continue; }
        e.metrics = measureScene(sc, { E, reg, thresholds, lint: lib.lintScene });
        n++; ctx.out(`  measured ${e.ref}`);
      }
      if (!n) { ctx.out('measure: nothing approved (add --with-candidates to measure the candidates)'); return 0; }
      saveGolden(root, g);
      ctx.out(`${n} entr${n === 1 ? 'y' : 'ies'} measured: ${join(root, 'tools', 'scene-golden.json')}`);
      return 0;
    }
    if (action === 'sheet') {
      const outDir = resolve(args.out || join(root, '.anim-ref', 'golden'));
      mkdirSync(outDir, { recursive: true });
      const done = [];
      await withChromeOrNull(lib, args, async (chrome) => {
        if (!chrome) throw new Error('golden sheet needs Chrome and the page harness (scene-page.mjs)');
        for (const e of g.entries.filter(x => x.kind === 'scene')) {
          const sc = sceneOf(e.ref);
          if (!sc) { ctx.err(`  ${e.ref}: not a composed scene in this checkout`); continue; }
          const r = await renderSheet(chrome, lib.harness, sc, { root, times: momentsFor(lib.times, sc.data, args.date), outDir });
          done.push({ e, file: r.sheet }); ctx.out(r.sheet);
        }
        if (done.length) {
          const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:10px;background:#15181d;color:#e8ecf2;font:14px system-ui,sans-serif}`
            + `figure{margin:0 0 10px}img{display:block;width:1200px}figcaption{padding:3px 0}</style></head><body><h1 style="font-size:16px">Golden set candidates (approve in tools/scene-golden.json)</h1>`
            + done.map(d => `<figure><img src="${pathToFileURL(d.file).href}"><figcaption>${d.e.approved === true ? 'APPROVED' : 'candidate'}: ${esc(d.e.ref)}: ${esc(d.e.why || '')}</figcaption></figure>`).join('') + '</body></html>';
          const file = join(outDir, 'golden-candidates.png');
          writeFileSync(file, await chrome.screenshot({ html, width: 1220, height: 'auto', transparent: false }));
          ctx.out(file);
        }
      });
      for (const e of g.entries.filter(x => x.kind === 'object')) ctx.out(`object ${e.object}: node tools/anim-pack.mjs object sheet ${e.object}`);
      return 0;
    }
    throw new Error(`scene golden: unknown action "${action}" (list, sheet, measure, calibrate)`);
  },
};
export default command;
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) standalone(command, NAME).then(c => { process.exitCode = c; });
