#!/usr/bin/env node
// tools/finance-parity.mjs - check that the Node finance pipeline gives the
// same results as the old Python spend.py on REAL data, without touching it.
//
//   node tools/finance-parity.mjs --finance-from <finance folder> [--spend-py <spend.py>]
//        [--today 2026-10-02,2026-08-15] [--replay] [--raw] [--work <dir>] [--python <exe>]
//
// For every --today date it copies the finance folder twice into --work (default:
// a temp folder), runs `python spend.py --today D` in one copy and the Node
// pipeline in the other, and compares: analysis.json (every number, every
// transaction's category), transactions.csv, bank_categories.json, the summary
// and the weekly report. --replay first moves processed/*.csv back into inbox/
// and deletes the store in both copies, so the CSV import and de-duplication are
// compared too. Only counts and field paths are printed, never amounts,
// merchants or descriptions.
//
// pandas sorts dates with an unstable sort on some CPUs (AVX2/AVX-512 SIMD), so
// same-day rows can come out in any order and spend.py's tie-dependent outputs
// (e.g. the last amount of a merchant charged twice in one day) vary by machine.
// By default Python is run with pandas' sorts made stable, which is what the Node
// port does. --raw runs spend.py exactly as it is and reports the differences.
//
// Needs Python 3 with pandas and openpyxl. Exit code 1 if anything differs.

import { mkdtemp, mkdir, readdir, rename, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { copyTree } from '../lib/fsutil.mjs';
import { argValue } from '../lib/datadir.mjs';
import { runPipeline } from '../lib/finance/pipeline.mjs';
import { parseStore } from '../lib/finance/store.mjs';

const WRAPPER = `import sys, runpy
import pandas as pd
_df_sv, _s_sv = pd.DataFrame.sort_values, pd.Series.sort_values
def _df(self, *a, **k):
    k.setdefault('kind', 'stable')
    return _df_sv(self, *a, **k)
def _s(self, *a, **k):
    k.setdefault('kind', 'stable')
    return _s_sv(self, *a, **k)
pd.DataFrame.sort_values, pd.Series.sort_values = _df, _s
script = sys.argv[1]
sys.argv = sys.argv[1:]
runpy.run_path(script, run_name='__main__')
`;

/** Deep compare; returns differing paths (values are never reported). */
export function diffPaths(a, b, path = '$', out = []) {
  if (out.length > 200) return out;
  if (typeof a === 'number' && typeof b === 'number') { if (!(a === b || (Number.isNaN(a) && Number.isNaN(b)))) out.push(path); return out; }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') { if (a !== b) out.push(path); return out; }
  if (Array.isArray(a) !== Array.isArray(b)) { out.push(path + ' (type)'); return out; }
  if (Array.isArray(a)) {
    if (a.length !== b.length) out.push(`${path} (length ${a.length} vs ${b.length})`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) diffPaths(a[i], b[i], `${path}[${i}]`, out);
    return out;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!(k in a)) out.push(`${path}.<key> only in node`);
    else if (!(k in b)) out.push(`${path}.<key> only in python`);
    else diffPaths(a[k], b[k], `${path}.${/^[A-Za-z_]\w*$/.test(k) ? k : '<key>'}`, out);
  }
  return out;
}

const junk = (rel) => /(^|[\\/])(__pycache__|backups)([\\/]|$)/.test(rel) || /\.lock$/.test(rel);

async function prepare(src, dst, replay) {
  await copyTree(src, dst, { skip: (rel) => junk(rel) });
  if (!replay) return;
  const proc = join(dst, 'processed'), inbox = join(dst, 'inbox');
  await mkdir(inbox, { recursive: true });
  for (const f of existsSync(proc) ? await readdir(proc) : []) if (f.toLowerCase().endsWith('.csv')) await rename(join(proc, f), join(inbox, f));
  for (const f of ['transactions.csv', 'bank_categories.json', 'analysis.json', 'summary.json']) await rm(join(dst, '_system', f), { force: true });
}

async function readMaybe(p, json) {
  if (!existsSync(p)) return null;
  const t = await readFile(p, 'utf8');
  return json ? JSON.parse(t) : t;
}

/**
 * Run spend.py on a finance folder (a copy!) for one day. The script is copied
 * into the folder's _system if it is not there. Returns its printed summary.
 */
export async function runPythonSpend({ financeDir, spendPy, today, raw = false, python = 'python' }) {
  const sys = join(financeDir, '_system');
  await mkdir(sys, { recursive: true });
  const pySpend = join(sys, 'spend.py');
  if (!existsSync(pySpend)) await writeFile(pySpend, await readFile(spendPy, 'utf8'));
  // spend.py also renders a standalone HTML page from a template; a stub will do.
  if (!existsSync(join(sys, 'dashboard_template.html'))) await writeFile(join(sys, 'dashboard_template.html'), '<script>/*__DATA__*/null</script>');
  const wrapper = join(financeDir, '..', 'stable_sort.py');
  if (!raw) await writeFile(wrapper, WRAPPER);
  const args = raw ? [pySpend, '--today', today] : [wrapper, pySpend, '--today', today];
  const r = spawnSync(python, args, { cwd: sys, encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }, windowsHide: true });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`python failed (exit ${r.status}): ${(r.stderr || '').trim().split(/\r?\n/).slice(-1)[0]}`);
  return JSON.parse(r.stdout);
}

/** True if `python` with pandas and openpyxl is available. */
export function pythonReady(python = 'python') {
  const r = spawnSync(python, ['-c', 'import pandas, openpyxl'], { encoding: 'utf8', windowsHide: true });
  return !r.error && r.status === 0;
}

export async function compareOnce({ src, spendPy, today, replay, raw, work, python = 'python' }) {
  const dir = await mkdtemp(join(work, `parity-${today}-`));
  const py = join(dir, 'py'), nd = join(dir, 'node');
  await prepare(src, py, replay);
  await prepare(src, nd, replay);
  const pySummary = await runPythonSpend({ financeDir: py, spendPy, today, raw, python });
  const ndSummary = await runPipeline(nd, { today, generated: 'x' });

  const result = { today, replay: !!replay, raw: !!raw, checks: {} };
  const check = (name, paths) => { result.checks[name] = paths.length ? paths : 'same'; };

  const pa = await readMaybe(join(py, '_system', 'analysis.json'), true);
  const na = await readMaybe(join(nd, '_system', 'analysis.json'), true);
  if (pa && na) { delete pa.generated; delete na.generated; }
  check('analysis.json', diffPaths(pa, na));
  if (pa && na) {
    result.counts = { transactions: na.transactions.length, categories: na.categories.length, recurring: na.recurring.length, flags: na.flags.length, months: na.months.length };
    const pc = new Map(pa.transactions.map(t => [t.k, `${t.c}|${t.how}`]));
    result.counts.categoryMismatches = na.transactions.filter(t => pc.get(t.k) !== `${t.c}|${t.how}`).length;
  }
  const ps = await readMaybe(join(py, '_system', 'transactions.csv')), ns = await readMaybe(join(nd, '_system', 'transactions.csv'));
  check('transactions.csv (rows)', diffPaths(ps && parseStore(ps), ns && parseStore(ns)));
  result.checks['transactions.csv (bytes)'] = ps === ns ? 'same' : ['bytes differ'];
  check('bank_categories.json', diffPaths(await readMaybe(join(py, '_system', 'bank_categories.json'), true), await readMaybe(join(nd, '_system', 'bank_categories.json'), true)));
  const pick = (s) => s && ({ status: s.status, imported: s.imported, errors: (s.errors || []).length, new_files: s.new_files, bank: s.bank_categories_changed, by_how: s.by_how, week: s.week, month: s.month, flags: s.flags });
  check('summary', diffPaths(pick(pySummary), pick(ndSummary)));
  if (pa && na) {
    const norm = (t) => t && t.replace(/\r\n/g, '\n').replace('Export a fresh CSV from Barclays', 'Export a fresh CSV from your bank');
    const pr = norm(await readMaybe(join(py, 'reports', `${pa.today}.md`))), nr = norm(await readMaybe(join(nd, 'reports', `${na.today}.md`)));
    result.checks.report = pr === nr ? 'same' : ['report text differs'];
  }
  const lsP = existsSync(join(py, 'processed')) ? (await readdir(join(py, 'processed'))).sort() : [];
  const lsN = existsSync(join(nd, 'processed')) ? (await readdir(join(nd, 'processed'))).sort() : [];
  check('processed/ files', diffPaths(lsP, lsN));
  result.ok = Object.entries(result.checks).every(([k, v]) => v === 'same' || k === 'transactions.csv (bytes)');
  await rm(dir, { recursive: true, force: true }).catch(() => {});
  return result;
}

async function main(argv = process.argv.slice(2)) {
  const src = argValue(argv, '--finance-from');
  if (!src) { console.error('usage: node tools/finance-parity.mjs --finance-from <finance folder> [--spend-py <file>] [--today D1,D2] [--replay] [--raw]'); process.exitCode = 2; return; }
  const spendPy = resolve(argValue(argv, '--spend-py') || join(src, '_system', 'spend.py'));
  if (!existsSync(spendPy)) { console.error(`spend.py not found: ${spendPy} (pass --spend-py)`); process.exitCode = 2; return; }
  const work = resolve(argValue(argv, '--work') || tmpdir());
  await mkdir(work, { recursive: true });
  const days = (argValue(argv, '--today') || new Date().toISOString().slice(0, 10)).split(',').map(s => s.trim()).filter(Boolean);
  let bad = 0;
  for (const today of days) {
    for (const replay of argv.includes('--replay') ? [false, true] : [false]) {
      const r = await compareOnce({ src: resolve(src), spendPy, today, replay, raw: argv.includes('--raw'), work, python: argValue(argv, '--python') || process.env.PYTHON || 'python' });
      if (!r.ok) bad++;
      console.log(JSON.stringify(r, null, 1));
    }
  }
  console.log(bad ? `\n${bad} run(s) differ.` : '\nAll runs identical.');
  process.exitCode = bad ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
