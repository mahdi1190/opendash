// tests/fixtures/finance/golden.mjs - what the ORIGINAL Python spend.py
// produced on the synthetic fixture (make-fixture.mjs), so the Node pipeline
// can be checked against it without Python installed.
//
//   digest(financeDir)  -> the comparable summary of a finished run
//   node tests/fixtures/finance/golden.mjs --spend-py <spend.py> [--python python]
//        regenerates golden.json by running spend.py on a fresh fixture copy
//        (needs Python 3 with pandas + openpyxl; uses pandas' stable sort,
//        see tools/finance-parity.mjs).
//
// The fixture is made up (generic shops, fake accounts): nothing personal.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const GOLDEN_FILE = join(HERE, 'golden.json');

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 24);
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x)) : x));

/** The comparable digest of a finance folder after one run. */
export function digest(dir) {
  const sys = join(dir, '_system');
  const a = JSON.parse(readFileSync(join(sys, 'analysis.json'), 'utf8'));
  delete a.generated; delete a.sample; delete a.balances; delete a.balance_history;
  const store = readFileSync(join(sys, 'transactions.csv'), 'utf8');
  const bank = existsSync(join(sys, 'bank_categories.json')) ? JSON.parse(readFileSync(join(sys, 'bank_categories.json'), 'utf8')) : {};
  return {
    today: a.today,
    // Readable parts (a failing test shows which one moved).
    week: a.week, month: a.month, income_month: a.income_month, months: a.months, monthly: a.monthly, weeks: a.weeks,
    recurring: a.recurring, recurring_monthly_total: a.recurring_monthly_total, flags: a.flags,
    uncategorised_merchants: a.uncategorised_merchants, counts: a.counts, categories: a.categories,
    exclude_from_spending: a.exclude_from_spending,
    // Hashes of the bulky parts.
    transactions: { n: a.transactions.length, sha: sha(canon(a.transactions)), categories: sha(a.transactions.map(t => `${t.k}:${t.c}:${t.how}`).join('\n')) },
    analysisSha: sha(canon(a)),
    storeSha: sha(store.replace(/\r\n/g, '\n')),
    bankCategories: { n: Object.keys(bank).length, sha: sha(canon(bank)) },
    processed: readdirSync(join(dir, 'processed')).sort(),
    inboxLeft: readdirSync(join(dir, 'inbox')).sort(),
  };
}

async function main(argv) {
  const { argValue } = await import('../../../lib/datadir.mjs');
  const { makeFinanceFixture, FIXTURE_TODAYS } = await import('./make-fixture.mjs');
  const { runPythonSpend, pythonReady } = await import('../../../tools/finance-parity.mjs');
  const spendPy = argValue(argv, '--spend-py');
  const python = argValue(argv, '--python') || 'python';
  if (!spendPy || !existsSync(spendPy)) { console.error('usage: node tests/fixtures/finance/golden.mjs --spend-py <spend.py>'); process.exitCode = 2; return; }
  if (!pythonReady(python)) { console.error('python with pandas and openpyxl is needed'); process.exitCode = 2; return; }
  const out = {};
  for (const today of FIXTURE_TODAYS) {
    const work = mkdtempSync(join(tmpdir(), 'fin-golden-'));
    const dir = join(work, 'finance');
    makeFinanceFixture(dir);
    await runPythonSpend({ financeDir: dir, spendPy: resolve(spendPy), today, python });
    const d = digest(dir);
    d.processed = d.processed.filter(f => f.toLowerCase().endsWith('.csv'));
    d.inboxLeft = d.inboxLeft.filter(f => !/^stable_sort/.test(f));
    out[today] = d;
    rmSync(work, { recursive: true, force: true });
  }
  writeFileSync(GOLDEN_FILE, JSON.stringify({ note: 'Made by spend.py (Python) on tests/fixtures/finance/make-fixture.mjs. Regenerate with: node tests/fixtures/finance/golden.mjs --spend-py <spend.py>', runs: out }, null, 1) + '\n');
  console.log(`wrote ${GOLDEN_FILE} (${Object.keys(out).length} runs)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
