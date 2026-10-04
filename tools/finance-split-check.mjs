#!/usr/bin/env node
// tools/finance-split-check.mjs - prove that src/finance/ is a mechanical
// split of the old single src/finance.js + src/finance.css.
//
//   node tools/finance-split-check.mjs [--orig-js <file>] [--orig-css <file>] [--rev <git rev>] [--quiet]
//
// The originals default to git <rev>:src/finance.js / .css (rev HEAD). The
// parts are put back together the way build.mjs does (name order, the JS in
// FINANCE_IIFE) with three mechanical allowances, then compared byte for byte:
//   - a part's first line may be an "@part" header comment (its owner line);
//   - a part whose @part header says NEW, and any block between "@new-begin"
//     and "@new-end" comment lines, is code added after the split (left out);
//   - the file's doc comment, which sat in front of the IIFE, is the first
//     thing in 00-core.js (inside it).
// Prints IDENTICAL (exit 0) or the differing lines (exit 1).
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { FINANCE_IIFE } from '../build.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'src', 'finance');
const HEADER = /^[ \t]*(?:\/\/|\/\*)[ \t]*@part\b[^\n]*\n/;
const NEW_BLOCK = /^[ \t]*(?:\/\/|\/\*)[ \t]*@new-begin\b[^\n]*\n[\s\S]*?^[ \t]*(?:\/\/|\/\*)[ \t]*@new-end\b[^\n]*\n/gm;

/** The part's text as it was cut from the original (header and additions removed); null for a NEW part. */
export function originalPart(text) {
  const h = HEADER.exec(text);
  if (h && /\bNEW\b/.test(h[0])) return null;
  return (h ? text.slice(h[0].length) : text).replace(NEW_BLOCK, '');
}
/** Put the parts back together as the original single files. */
export function reassemble(dir = DIR) {
  const read = ext => readdirSync(dir).filter(f => f.endsWith(ext)).sort()
    .map(f => ({ f, t: originalPart(readFileSync(join(dir, f), 'utf8')) })).filter(p => p.t != null);
  const js = read('.js'), css = read('.css');
  let body = js.map(p => p.t).join('');
  const doc = /^\/\*[\s\S]*?\*\/\n/.exec(body);           // the doc comment goes back in front of the IIFE
  if (doc) body = body.slice(doc[0].length);
  return {
    js: (doc ? doc[0] : '') + FINANCE_IIFE[0] + body + FINANCE_IIFE[1], css: css.map(p => p.t).join(''),
    jsParts: js.map(p => p.f), cssParts: css.map(p => p.f),
  };
}
/** Line diff (LCS) as hunks of '-'/'+' lines with 1 line of context. */
export function lineDiff(a, b, max = 60) {
  const A = a.split('\n'), B = b.split('\n');
  let s = 0; while (s < A.length && s < B.length && A[s] === B[s]) s++;
  let ea = A.length, eb = B.length; while (ea > s && eb > s && A[ea - 1] === B[eb - 1]) { ea--; eb--; }
  const n = ea - s, m = eb - s;
  if (n * m > 4e7) return [`(too different to diff: ${n} vs ${m} lines)`];
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[s + i] === B[s + j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while ((i < n || j < m) && out.length < max) {
    if (i < n && j < m && A[s + i] === B[s + j]) { i++; j++; continue; }
    if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { out.push(`+${s + j + 1}: ${B[s + j]}`); j++; }
    else { out.push(`-${s + i + 1}: ${A[s + i]}`); i++; }
  }
  return out;
}
const sha = t => createHash('sha256').update(t).digest('hex').slice(0, 16);

function main(argv) {
  const arg = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const rev = arg('--rev') || 'HEAD';
  const orig = (flag, rel) => {
    if (arg(flag)) return readFileSync(resolve(arg(flag)), 'utf8');
    const r = spawnSync('git', ['-C', ROOT, 'show', `${rev}:${rel}`], { encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.status !== 0) throw new Error(`git show ${rev}:${rel} failed: ${r.stderr}`);
    return r.stdout;
  };
  const want = { js: orig('--orig-js', 'src/finance.js'), css: orig('--orig-css', 'src/finance.css') };
  const got = reassemble();
  let ok = true;
  for (const k of ['js', 'css']) {
    const same = got[k] === want[k];
    ok = ok && same;
    const parts = got[k === 'js' ? 'jsParts' : 'cssParts'];
    console.log(`${k.toUpperCase()}: ${same ? 'IDENTICAL' : 'DIFFERENT'} · original ${Buffer.byteLength(want[k])} bytes sha256 ${sha(want[k])} · reassembled ${Buffer.byteLength(got[k])} bytes sha256 ${sha(got[k])} · ${parts.length} parts`);
    if (!same && !argv.includes('--quiet')) for (const l of lineDiff(want[k], got[k])) console.log('   ' + l);
  }
  process.exit(ok ? 0 : 1);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
