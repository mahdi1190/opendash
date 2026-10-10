// `scene validate` (docs/dev/WORLD_ENGINE.md 6, 8.7): the world engine's validator from the anim-pack tool.
//
//   node tools/anim-pack.mjs scene validate [<ref>,...] [--pack <id>] [--file <scene file | spec.json>] [--json]
//
// <ref>: a v3 scene ('world-test/fleet-pond-2-w3', its id, or 'fleet-pond-2-w3'); a v2 / v1 ref is converted to v3 in memory
// first (tools/lib/world/convert.mjs) and the converted spec is validated. --file: a 79-world-zscene-*.js file (what it passes to
// worldAdd) or a .json v3 spec. With no ref, every registered v3 scene is validated, plus every spec worldAdd REFUSED while the
// app loaded (an invalid v3 scene is not registered at all: the old version stays, so this is where it shows), plus the
// templated check over all v3 specs (worldTemplated). Each error has its path, rule, message and fix. Exit 1 on any error.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { worldScenes, worldSceneOf } from '../world/refs.mjs';

const splitList = (v) => [].concat(v || []).flatMap(x => String(x).split(',')).map(s => s.trim()).filter(Boolean);

/** The v3 specs a scene file registers (evaluated with worldAdd captured; nothing else of the app is needed). */
function specsOfFile(file) {
  if (/\.json$/i.test(file)) { const j = JSON.parse(readFileSync(file, 'utf8')); return [{ ref: file, spec: j && j.v !== 3 && j.spec ? j.spec : j }]; }
  const got = [];
  vm.runInNewContext(readFileSync(file, 'utf8'), { worldAdd: (pack, meta, spec) => { got.push({ ref: `${pack}/${meta && meta.id}`, spec }); return true; }, Math, JSON, Object, Array, Number, String });
  return got;
}

export default {
  summary: 'the v3 (world engine) validator: every rule with its fix; specs worldAdd refused; converts a v2 / v1 ref first; templated check',
  usage: 'scene validate [<ref>,...] [--pack <id>] [--file <scene file | spec.json>] [--json]',
  options: {
    file: { type: 'string', multiple: true, help: 'validate: a 79-world-zscene-*.js scene file (what it passes to worldAdd) or a .json v3 spec' },
  },
  async run(args, ctx, lib) {
    const pos = (ctx.positionals || []).filter(x => x !== 'validate');
    const reg = lib.loadRegistry(ctx.root, { fresh: true }), get = reg.R.get;
    const V = get('worldValidate'), T = get('worldTemplated'), refused = get('worldAddProblems');
    if (typeof V !== 'function') throw new Error('scene validate needs worldValidate (src/app/79-world-0core.js)');
    const jobs = [];   // { ref, spec, converted? }
    const refs = splitList(pos), packs = splitList(args.pack), files = splitList(args.file);
    for (const f of files) {
      const p = resolve(f);
      if (!existsSync(p)) throw new Error(`no file ${f}`);
      const got = specsOfFile(p);
      if (!got.length) throw new Error(`${f} registers no v3 scene (it must call worldAdd(pack, meta, spec))`);
      jobs.push(...got);
    }
    for (const r of refs) {
      const w = worldSceneOf(reg, r);
      if (w) { jobs.push({ ref: w.ref, spec: w.spec }); continue; }
      // not a v3 scene: a v2 / v1 scene converted in memory
      const { convertRef, loadEngine } = await import('../world/convert.mjs');
      let c;
      try { c = convertRef(r, { root: ctx.root, E: loadEngine({ root: ctx.root }) }); } catch (e) { throw new Error(`unknown scene ${r} (a v3 ref or id, or a v2 / v1 ref to convert): ${e.message}`); }
      jobs.push({ ref: `${c.ref} (converted in memory)`, spec: c.spec, converted: true, review: c.report && c.report.review ? c.report.review.length : 0 });
    }
    const all = worldScenes(reg);
    if (packs.length) for (const w of all) if (packs.includes(w.pack)) jobs.push({ ref: w.ref, spec: w.spec });
    const everything = !refs.length && !packs.length && !files.length;
    if (everything) for (const w of all) jobs.push({ ref: w.ref, spec: w.spec });
    const rows = jobs.map(j => { let r; try { r = V(j.spec); } catch (e) { r = { ok: false, errors: [{ path: '', rule: 'crash', msg: e.message, fix: 'a validator bug: report it' }] }; } return Object.assign({}, j, { ok: !!r.ok, errors: r.errors || [] }); });
    const ref0 = everything && typeof refused === 'function' ? refused() : [];
    const tmpl = typeof T === 'function' && rows.length > 1 ? (T(rows.map(r => r.spec)) || []) : [];
    const tmplErrors = Array.isArray(tmpl) ? tmpl : (tmpl.errors || []);
    const bad = rows.filter(r => !r.ok).length + ref0.length + tmplErrors.length;
    if (args.json) {
      ctx.out(JSON.stringify({ ok: !bad, scenes: rows.map(r => ({ ref: r.ref, ok: r.ok, converted: !!r.converted, errors: r.errors })), refused: ref0, templated: tmplErrors }, null, 1));
      return bad ? 1 : 0;
    }
    if (!rows.length && !ref0.length) ctx.out('no v3 scene registered (worldAdd) and none named');
    for (const r of rows) {
      ctx.out(`${r.ok ? 'VALID  ' : 'INVALID'} ${r.ref}${r.ok ? '' : `  ${r.errors.length} error(s)`}${r.converted ? `  (${r.review} review note(s): node tools/world.mjs convert ${r.ref.split(' ')[0]} --report)` : ''}`);
      for (const e of r.errors) ctx.out(`    ${String(e.rule).padEnd(18)} ${e.path}: ${e.msg}${e.fix ? `   fix: ${e.fix}` : ''}`);
    }
    for (const p of ref0) {
      ctx.out(`REFUSED ${p.pack}/${p.id}: worldAdd did not register it (${p.errors.length} error(s)); the app shows the old version or nothing`);
      for (const e of p.errors) ctx.out(`    ${String(e.rule).padEnd(18)} ${e.path}: ${e.msg}${e.fix ? `   fix: ${e.fix}` : ''}`);
    }
    for (const e of tmplErrors) ctx.out(`TEMPLATED ${e.path || ''}: ${e.msg}${e.fix ? `   fix: ${e.fix}` : ''}`);
    ctx.out(bad ? `${bad} problem(s)` : `${rows.length} v3 scene(s) valid`);
    return bad ? 1 : 0;
  },
};
