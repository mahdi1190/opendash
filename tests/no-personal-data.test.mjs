// No personal data in the app code. The names to look for are NOT written here
// (this file is public): they are read from the owner's local, gitignored data
// (<repo>/data, or the pre-2.0 <repo>/state) when it exists - the user's name,
// the people's names and e-mail addresses. On a machine without local data
// (a fresh clone, CI, someone else's copy) the test has nothing to compare
// against and passes trivially.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Code a copy of the app ships with. tests/ and tools/ are covered too, except
// the files listed in ALLOW (each one a deliberate, documented decision).
const DIRS = ['src', 'server', 'lib', 'mcp', 'tools', 'tests'];
const FILES = ['serve.mjs', 'build.mjs', 'README.md', 'README-STANDALONE.md', 'MODULES.md', 'THIRD_PARTY_NOTICES.md', 'start-opendash.bat', 'start-opendash.sh', 'start-dashboard.bat', 'start-dashboard.sh'];
const ALLOW = new Set([
  'tools/apply_sync.py',                       // untracked, gitignored personal script
]);
// Ordinary words that also happen to be names are not evidence of anything.
const COMMON = new Set(['group', 'office', 'admin', 'team', 'support', 'service', 'services', 'calendar', 'google', 'research', 'student', 'students', 'summary', 'mark', 'will', 'doctor', 'bank']);

function localTerms() {
  const cands = [join(ROOT, 'data', 'state', 'dashboard-state.json'), join(ROOT, 'state', 'dashboard-state.json')];
  const file = cands.find(f => existsSync(f));
  if (!file) return [];
  let s;
  try { s = JSON.parse(readFileSync(file, 'utf8')); } catch { return []; }
  const terms = new Set();
  let cfgName = null;
  try { cfgName = JSON.parse(readFileSync(join(ROOT, 'data', 'config.json'), 'utf8')).userName; } catch {}
  if (cfgName && cfgName.length >= 4) terms.add(cfgName);
  for (const p of Array.isArray(s.people) ? s.people : []) {
    const name = String(p && p.name || '').replace(/\(.*?\)/g, ' ');
    for (const part of name.split(/[\s,/]+/)) if (/^[A-Z][a-z'-]{3,}$/.test(part)) terms.add(part);
    for (const e of [].concat(p && p.email || [], p && p.emails || [])) if (typeof e === 'string' && e.includes('@')) terms.add(e.toLowerCase());
    // Mailbox-style aliases (a department's shared address, e.g. "dept-office2") identify an institution.
    for (const a of Array.isArray(p && p.aliases) ? p.aliases : []) if (typeof a === 'string' && a.length >= 6 && /[-_.\d]/.test(a) && !/\s/.test(a)) terms.add(a.toLowerCase());
  }
  return [...terms].filter(t => !COMMON.has(t.toLowerCase()));
}

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules', '.git', 'fixtures'].includes(e.name) || dir === join(ROOT, 'tests') && e.name === 'fixtures') yield* walk(p); }
    else if (/\.(m?js|css|html|md|json|bat|sh|txt)$/i.test(e.name) && statSync(p).size < 4e6) yield p;
  }
}

test('no personal names or e-mail addresses from the local data appear in the app code', (t) => {
  const terms = localTerms();
  if (!terms.length) { t.skip('no local data folder to compare against'); return; }
  const res = terms.map(x => ({ x, re: x.includes('@') || x === x.toLowerCase() ? null : new RegExp(`\\b${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`) }));
  const hits = [];
  const files = [...DIRS.filter(d => existsSync(join(ROOT, d))).flatMap(d => [...walk(join(ROOT, d))]), ...FILES.map(f => join(ROOT, f)).filter(existsSync)];
  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    if (ALLOW.has(rel)) continue;
    const txt = readFileSync(f, 'utf8');
    const low = txt.toLowerCase();
    const found = res.filter(({ x, re }) => re ? re.test(txt) : low.includes(x));
    // Report the file and how many terms matched - never the terms themselves.
    if (found.length) hits.push(`${rel} (${found.length})`);
  }
  assert.deepEqual(hits, [], `personal names from the local data found in: ${hits.join(', ')}`);
});
