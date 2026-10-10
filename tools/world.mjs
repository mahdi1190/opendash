#!/usr/bin/env node
// The world engine's tool (docs/dev/WORLD_ENGINE.md 6, 7, 8.6). Node >= 20, no dependencies.
//
//   node tools/world.mjs validate <ref | spec.json>        A's validator; a v2 / v1 ref is converted in memory first. Exit 1 on errors.
//   node tools/world.mjs convert <ref> [--out[=file]] [--force] [--report] [--json]
//                                                           v2 / v1 -> v3 with the review report; --out writes src/app/79-world-zscene-<id>.js
//                                                           (never over an existing file without --force; the original scene is untouched)
//   node tools/world.mjs render <ref> [--dir=C:/tmp/world] [--dates=spring,summer,autumn,night] [--gpu] [--dpr=1]
//                                                           PNGs on the real renderer (3 dates + night by default)
//   node tools/world.mjs motion <ref> [--seconds=600] [--svg=file] [--json]
//                                                           the life sim in Node: tracks over the still, red marks for every agent on a
//                                                           forbidden cell, a floater off the water level, a pop or vanish off a spawn cell,
//                                                           a stuck walker, a depth-order violation. Exit 1 on any red mark.
//   node tools/world.mjs perf <ref> [--browser] [--gpu] [--throttle=4] [--seconds=4] [--json]
//                                                           the budget table (7): the Node part always, the renderer with --browser. Exit 1 at 1.2x.
// <ref>: 'world-test/<id>-w3', a bare id ('fleet-canal-2-w3'), a v2 ref ('uk-south-east/hampshire-fleet-canal-2') or a short
// alias ('fleet-canal-2'), or a .json file holding a v3 spec.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadEngine, resolveRef, convertRef, validateSpec, sceneFileSource } from './lib/world/convert.mjs';
import { worldPerfNode, worldPerfBrowser, worldPerfCheck, worldPerfText, worldMotion, worldMotionSvg } from './lib/world/perf.mjs';
import { repoRoot } from './lib/scene-page.mjs';

const argv = process.argv.slice(2);
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v === undefined ? true : v]; }));
const [cmd, ref] = argv.filter(a => !a.startsWith('--'));
const root = repoRoot();
const out = (s) => process.stdout.write(s + '\n');

/** The v3 spec for a ref: a v3 item's spec, a JSON file, or a v2 / v1 scene converted in memory. */
export function specOf(E, r) {
  if (r && r.endsWith('.json') && existsSync(r)) return { spec: JSON.parse(readFileSync(r, 'utf8')), id: r.replace(/^.*[\\/]/, '').replace(/\.json$/, ''), converted: false };
  const hit = resolveRef(E, r) || resolveRef(E, 'world-test/' + r);
  if (!hit) throw new Error(`unknown scene '${r}'`);
  const s = E.worldHostSpec ? E.worldHostSpec(hit.item) : null;
  if (s) return { spec: s, id: hit.item.id, ref: hit.ref, converted: false };
  const c = convertRef(r, { root, E });
  return { spec: c.spec, id: c.meta.id, ref: c.ref, converted: true, report: c.report };
}

const DATES = {
  spring: '2026-04-18T14:00:00Z', summer: '2026-07-16T13:00:00Z', autumn: '2026-10-22T13:00:00Z', winter: '2026-01-20T13:00:00Z',
  night: '2026-07-16T22:30:00Z', dusk: '2026-10-22T17:15:00Z',
};

async function main() {
  if (!cmd || !ref || flags.help) { out(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).map(l => l.slice(3)).join('\n')); return 2; }
  const E = loadEngine({ root });

  if (cmd === 'validate') {
    const s = specOf(E, ref);
    const v = validateSpec(s.spec, E);
    if (flags.json) { out(JSON.stringify(v, null, 1)); return v.ok ? 0 : 1; }
    out(`${s.id}${s.converted ? ' (converted in memory from ' + s.ref + ')' : ''}: ${v.ok ? 'valid' : v.errors.length + ' error(s)'} [${v.by}]`);
    for (const e of v.errors) out(`  ${e.rule.padEnd(18)} ${e.path}: ${e.msg}${e.fix ? '   fix: ' + e.fix : ''}`);
    return v.ok ? 0 : 1;
  }

  if (cmd === 'convert') {
    const c = convertRef(ref, { root, E });
    const R = c.report;
    if (flags.json) out(JSON.stringify({ meta: c.meta, spec: c.spec, report: R }, null, 1));
    else {
      out(`${c.ref} (${R.from}) -> ${c.meta.id}: ${c.ok ? 'VALID' : 'INVALID'} [${c.validation.by}]`);
      out('  ' + Object.entries(R.counts).map(([k, v]) => `${k} ${v}`).join(', '));
      const n = flags.report ? Infinity : 12;
      out(`  review (${R.review.length}):`); for (const r of R.review.slice(0, n)) out(`    ${r.path}: ${r.msg}`);
      if (R.review.length > n) out(`    ... ${R.review.length - n} more (--report)`);
      if (flags.report) { out(`  dropped (${R.dropped.length}):`); for (const d of R.dropped) out(`    ${d.path}.${d.field}: ${d.why}`); for (const s of R.notes) out('  note: ' + s); }
      for (const e of c.validation.errors) out(`  ERROR ${e.rule} ${e.path}: ${e.msg}`);
    }
    if (flags.out) {
      const file = typeof flags.out === 'string' ? resolve(flags.out) : join(root, 'src', 'app', `79-world-zscene-${c.meta.id.replace(/-w3$/, '')}.js`);
      if (existsSync(file) && !flags.force) { out(`  NOT written: ${file} exists (--force to replace; or --out=<other file>)`); return 1; }
      writeFileSync(file, sceneFileSource(c.meta, c.spec, R));
      out(`  wrote ${file}`);
    }
    return c.ok ? 0 : 1;
  }

  if (cmd === 'motion') {
    const s = specOf(E, ref);
    const r = worldMotion(E, s.spec, { seconds: Number(flags.seconds) || 600 });
    if (flags.json) out(JSON.stringify(Object.assign({}, r, { tracks: undefined }), null, 1));
    else {
      out(`${s.id}: ${r.seconds} s simulated, ${r.agentsSeen} agents, ${r.red.length} red mark(s)`);
      const by = {}; for (const m of r.red) by[m.rule] = (by[m.rule] || 0) + 1;
      for (const [k, v] of Object.entries(by)) out(`  ${k}: ${v}`);
      for (const m of r.red.slice(0, 20)) out(`    t ${m.t.toFixed(1)} ${m.id} (${m.cls}) ${m.rule}: ${m.msg}`);
    }
    const svg = typeof flags.svg === 'string' ? resolve(flags.svg) : join('C:/tmp/world', `${s.id}-motion.svg`);
    mkdirSync(resolve(svg, '..'), { recursive: true });
    writeFileSync(svg, worldMotionSvg(E, s.spec, r));
    out(`  overlay: ${svg}`);
    return r.red.length ? 1 : 0;
  }

  if (cmd === 'perf') {
    const s = specOf(E, ref);
    const n = worldPerfNode(s.spec, E, { ticks: Number(flags.ticks) || 300 });
    const m = Object.assign({}, n);
    if (flags.browser) {
      const { launchChrome } = await import('./release-chrome.mjs');
      const chrome = await launchChrome(flags.gpu ? { extraArgs: ['--enable-gpu', '--ignore-gpu-blocklist'] } : {});
      try { Object.assign(m, await worldPerfBrowser(chrome, s.spec, { id: s.id, seconds: Number(flags.seconds) || 4, throttle: flags.throttle })); } finally { await chrome.close(); }
    }
    const chk = worldPerfCheck(m);
    if (flags.json) out(JSON.stringify({ measures: Object.assign({}, m, { raw: undefined }), check: chk }, null, 1));
    else { out(worldPerfText(chk, s.id + (flags.browser ? '' : ' (Node part; --browser for the renderer)'))); out('  stages: ' + JSON.stringify(n.stages)); }
    return chk.ok ? 0 : 1;
  }

  if (cmd === 'render') {
    const s = specOf(E, ref);
    const { launchChrome } = await import('./release-chrome.mjs');
    const { sceneRenderPng } = await import('./lib/scene-page.mjs');
    const dir = resolve(typeof flags.dir === 'string' ? flags.dir : 'C:/tmp/world');
    const names = String(typeof flags.dates === 'string' ? flags.dates : 'spring,summer,autumn,night').split(',');
    const P = s.spec.place || {}, loc = [P.lat != null ? P.lat : 51.5, P.lon != null ? P.lon : -0.1];
    const chrome = await launchChrome(flags.gpu ? { extraArgs: ['--enable-gpu', '--ignore-gpu-blocklist'] } : {});
    try {
      for (const nm of names) {
        const at = DATES[nm] || nm;
        const file = join(dir, `${s.id}-${nm.replace(/[^a-z0-9-]/gi, '')}.png`);
        // sync: the life sim is built before the first frame, so the still shows the warmed-up movers
        await sceneRenderPng(chrome, { data: `worldHostData(${JSON.stringify(s.spec)}, { id: ${JSON.stringify(s.id)}, sync: true })`, at, location: loc, still: true, dpr: Number(flags.dpr) || 1 }, file);
        out(`  ${nm} (${at}): ${file}`);
      }
    } finally { await chrome.close(); }
    return 0;
  }
  out(`unknown command '${cmd}' (validate | convert | render | motion | perf)`);
  return 2;
}

if (process.argv[1] && /[\\/]world\.mjs$/.test(process.argv[1])) {
  main().then(code => { process.exitCode = code; }).catch(e => { console.error(e && e.stack || e); process.exitCode = 1; });
}
