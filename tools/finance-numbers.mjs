#!/usr/bin/env node
// tools/finance-numbers.mjs - the Finances numbers audit, without a browser.
//
// Loads the Finances view exactly as build.mjs puts it in the page (the
// src/finance/*.js parts in one IIFE) into a sandbox with a stub DOM, feeds it
// a data folder's analysis.json, and calls FinanceView._numbers() for each
// date preset: every KPI and the key figures of each section. Visual work
// must leave these numbers unchanged.
//
//   node tools/finance-numbers.mjs --data-dir <dir> [--presets 1M,3M,YTD,All] [--budgets '<json>'] [--out <file>]
//   node tools/finance-numbers.mjs --data-dir <dir> --write <baseline.json> --name <dataset> [--recipe "<how the folder was made>"]
//   node tools/finance-numbers.mjs --data-dir <dir> --compare <baseline.json> --name <dataset>
//
// --write adds (or replaces) one dataset in a baseline file; --compare reruns
// it with the inputs recorded there (presets, budgets) and lists every number
// that moved (exit 1). Budgets default to the folder's _system/budgets.json.
// Only use made-up data for files you keep: the output names merchants.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { financeSources } from '../build.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** A browser-ish global object, just enough for the view to load and compute. */
function sandbox(config, opts = {}) {
  const store = new Map();
  const noop = () => {};
  const anything = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : anything()), apply: () => anything(), construct: () => anything() });
  const docEl = { getAttribute: n => (n === 'data-motion' && opts.reduced ? 'reduced' : null), setAttribute: noop, classList: { contains: () => false, add: noop, remove: noop, toggle: noop }, style: {} };
  const g = {
    APP_CONFIG: { currency: config.currency || 'GBP', locale: config.locale || 'en-GB' },
    console, setTimeout: (f, ms) => { const t = setTimeout(f, ms); t.unref && t.unref(); return t; }, clearTimeout, setInterval: () => 0, clearInterval: noop,
    requestAnimationFrame: () => 0, cancelAnimationFrame: noop, performance,
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    location: { search: '', hash: '' }, navigator: { userAgent: 'node' }, URLSearchParams,
    fetch: () => Promise.reject(new Error('no network in the numbers sandbox')),
    MutationObserver: class { observe() {} disconnect() {} }, ResizeObserver: class { observe() {} disconnect() {} },
  };
  g.document = new Proxy({ documentElement: docEl, hidden: false, addEventListener: noop, removeEventListener: noop, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
    { get: (t, k) => (k in t ? t[k] : anything()) });
  g.window = g; g.self = g; g.globalThis = g;
  return g;
}

/** Load the view; returns FinanceView (with _numbers and _kit). opts.reduced: as with reduced motion on. */
export function loadFinanceView(config = {}, root = ROOT, opts = {}) {
  const g = sandbox(config, opts);
  vm.createContext(g);
  vm.runInContext(financeSources(root).js, g, { filename: 'src/finance/*.js (one IIFE)' });
  if (!g.FinanceView || typeof g.FinanceView._numbers !== 'function') throw new Error('FinanceView._numbers is missing (src/finance/95-numbers.js)');
  return g.FinanceView;
}

/** The analysis + budgets + config of a data folder (read-only). */
export function readDataFolder(dataDir) {
  const root = resolve(dataDir);
  const config = existsSync(join(root, 'config.json')) ? JSON.parse(readFileSync(join(root, 'config.json'), 'utf8')) : {};
  const fin = config.financeDir ? resolve(root, config.financeDir) : join(root, 'finance');
  const file = join(fin, '_system', 'analysis.json');
  if (!existsSync(file)) throw new Error(`no analysis.json in ${fin} (make one: node tools/make-fake-data.mjs <dir>)`);
  const analysis = JSON.parse(readFileSync(file, 'utf8'));
  const bf = join(fin, '_system', 'budgets.json');
  const budgets = existsSync(bf) ? JSON.parse(readFileSync(bf, 'utf8')) : {};
  analysis.budgets = budgets;     // as GET /api/finance serves it
  return { config, analysis, budgets };
}

/** { inputs, presets: { '1M': numbers, ... } } — JSON-clean (numbers, strings, nulls). */
export function computeNumbers(dataDir, { presets = ['1M', '3M', 'YTD', 'All'], budgets = null } = {}, root = ROOT) {
  const d = readDataFolder(dataDir);
  const FV = loadFinanceView(d.config, root);
  const b = budgets || d.budgets;
  const out = {};
  for (const p of presets) out[p] = JSON.parse(JSON.stringify(FV._numbers({ preset: p, analysis: d.analysis, budgets: b })));
  return { inputs: { presets, budgets: b, today: d.analysis.today || null, transactions: (d.analysis.transactions || []).length }, presets: out };
}

/** Every leaf that differs: ['path: old -> new']. Money compares to the penny. */
export function diffNumbers(a, b, path = '', out = []) {
  if (out.length > 200) return out;
  const ta = a === null ? 'null' : Array.isArray(a) ? 'array' : typeof a, tb = b === null ? 'null' : Array.isArray(b) ? 'array' : typeof b;
  if (ta !== tb) { out.push(`${path || '.'}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`); return out; }
  if (ta === 'number') { if (Math.abs(a - b) > 0.0049) out.push(`${path}: ${a} -> ${b}`); return out; }
  if (ta === 'array') {
    if (a.length !== b.length) out.push(`${path}: length ${a.length} -> ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) diffNumbers(a[i], b[i], `${path}[${i}]`, out);
    return out;
  }
  if (ta === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in b)) out.push(`${path}.${k}: removed`);
      else if (!(k in a)) out.push(`${path}.${k}: added (new analysis is fine)`);
      else diffNumbers(a[k], b[k], `${path}.${k}`, out);
    }
    return out;
  }
  if (a !== b) out.push(`${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
  return out;
}

function main(argv) {
  const arg = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const dir = arg('--data-dir');
  if (!dir) { console.error('usage: node tools/finance-numbers.mjs --data-dir <dir> [--presets 1M,3M,YTD,All] [--budgets JSON] [--out F | --write BASELINE --name N | --compare BASELINE --name N]'); process.exit(2); }
  if (arg('--compare')) {
    const base = JSON.parse(readFileSync(resolve(arg('--compare')), 'utf8'));
    const name = arg('--name'); const ds = base.datasets && base.datasets[name];
    if (!ds) { console.error(`no dataset "${name}" in ${arg('--compare')} (have: ${Object.keys(base.datasets || {}).join(', ')})`); process.exit(2); }
    const now = computeNumbers(dir, { presets: ds.inputs.presets, budgets: ds.inputs.budgets });
    const diffs = diffNumbers(ds.presets, now.presets);
    const added = diffs.filter(d => d.endsWith('(new analysis is fine)'));
    const moved = diffs.filter(d => !d.endsWith('(new analysis is fine)'));
    if (now.inputs.transactions !== ds.inputs.transactions || now.inputs.today !== ds.inputs.today) console.log(`note: the data folder differs from the baseline's (${now.inputs.transactions} vs ${ds.inputs.transactions} transactions, today ${now.inputs.today} vs ${ds.inputs.today}): regenerate it with the recipe`);
    console.log(`${name}: ${moved.length ? moved.length + ' number(s) CHANGED' : 'all numbers identical'} across ${ds.inputs.presets.join(', ')}${added.length ? ` · ${added.length} new key(s)` : ''}`);
    for (const d of moved.slice(0, 80)) console.log('  ' + d);
    for (const d of added.slice(0, 20)) console.log('  + ' + d);
    process.exit(moved.length ? 1 : 0);
  }
  const res = computeNumbers(dir, { presets: (arg('--presets') || '1M,3M,YTD,All').split(','), budgets: arg('--budgets') ? JSON.parse(arg('--budgets')) : null });
  if (arg('--write')) {
    const f = resolve(arg('--write')); const name = arg('--name') || 'default';
    const base = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : { about: 'Finances numbers baseline: FinanceView._numbers() per date preset. Re-run: node tools/finance-numbers.mjs --data-dir <folder made by the recipe> --compare <this file> --name <dataset>', datasets: {} };
    base.datasets[name] = Object.assign({ recipe: arg('--recipe') || '', recordedAt: new Date().toISOString() }, res);
    writeFileSync(f, JSON.stringify(base, null, 1) + '\n');
    console.log(`wrote dataset "${name}" (${res.inputs.transactions} transactions, presets ${res.inputs.presets.join(', ')}) to ${f}`);
  } else if (arg('--out')) writeFileSync(resolve(arg('--out')), JSON.stringify(res, null, 1) + '\n');
  else console.log(JSON.stringify(res, null, 1));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
