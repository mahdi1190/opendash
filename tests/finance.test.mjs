// The finance pipeline (lib/finance/*), the Node port of the old Python
// spend.py: Python-exact helpers, CSV import and de-duplication,
// categorisation, the analysis, and parity with Python on a synthetic fixture
// (tests/fixtures/finance/golden.json was produced by spend.py itself).
// Real-data parity is a manual check: tools/finance-parity.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pyRound, pyFixed, pyComma2, pyRepr, pyFloat, cmpStr, splitlines, strptimeDate, decodeText, pySlice } from '../lib/finance/pycompat.mjs';
import { readRows, dictRows, writeCsv } from '../lib/finance/csv.mjs';
import { parseCsv, merge, money, updateBankCategories, storeCsv, parseStore, stableKeys } from '../lib/finance/store.mjs';
import { cleanMerchant, niceTitle, Categoriser } from '../lib/finance/categorise.mjs';
import { runPipeline, ensureFinanceDir, defaultRules, checkCsv, loadFrame, transactionsCsv } from '../lib/finance/pipeline.mjs';
import { makeFinanceFixture, FIXTURE_TODAYS } from './fixtures/finance/make-fixture.mjs';
import { digest, GOLDEN_FILE } from './fixtures/finance/golden.mjs';

const tmp = (p) => mkdtempSync(join(tmpdir(), p));

test('Python-exact numbers: round half to even, repr, formatting', () => {
  assert.equal(pyRound(2.675, 2), 2.67);          // binary 2.67499..., like Python
  assert.equal(pyRound(0.125, 2), 0.12);          // exact tie -> even
  assert.equal(pyRound(0.375, 2), 0.38);
  assert.equal(pyRound(-0.125, 2), -0.12);
  assert.equal(pyRound(2.5, 0), 2);
  assert.equal(pyFixed(1.005, 2), '1.00');
  assert.equal(pyFixed(0.5, 0), '0');
  assert.equal(pyComma2(1234567.891), '1,234,567.89');
  assert.equal(pyComma2(-1234.5), '-1,234.50');
  assert.equal(pyRepr(10), '10.0');
  assert.equal(pyRepr(-3.2), '-3.2');
  assert.equal(pyRepr(1e-5), '1e-05');
  assert.equal(pyFloat(' 12.50 '), 12.5);
  assert.throws(() => pyFloat('12,50'), /could not convert/);
});

test('Python-exact strings and dates', () => {
  assert.ok(cmpStr('Z', 'a') < 0);
  assert.ok(cmpStr('￿', '\u{1F600}') < 0, 'code point order, not UTF-16');
  assert.deepEqual(splitlines('a\r\nb\rc\n'), ['a', 'b', 'c']);
  assert.equal(strptimeDate('31/01/2026', '%d/%m/%Y'), '2026-01-31');
  assert.equal(strptimeDate('5 sep 2026', '%d %b %Y'), '2026-09-05');
  assert.equal(strptimeDate('04/09/26', '%d/%m/%y'), '2026-09-04');
  assert.throws(() => strptimeDate('31/02/2026', '%d/%m/%Y'), /out of range/);
  assert.throws(() => strptimeDate('2026-01-01x', '%Y-%m-%d'), /unconverted/);
  assert.equal(decodeText(Buffer.from([0xef, 0xbb, 0xbf, 0x41])), 'A', 'BOM stripped');
  assert.equal(decodeText(Buffer.from([0xa3, 0x31])), '£1', 'cp1252 fallback');
  assert.equal(pySlice('😀abc', 2), '😀a');
});

test('CSV reading and writing behave like Python csv', () => {
  assert.deepEqual(readRows('a,"b,c","d""e"\r\n\r\nx,y\n'), [['a', 'b,c', 'd"e'], [], ['x', 'y']]);
  const { fieldnames, rows } = dictRows('h1,h2\n1\n');
  assert.deepEqual(fieldnames, ['h1', 'h2']);
  assert.equal(rows[0].get('h2'), null);
  assert.equal(writeCsv(['a', 'b'], [{ a: 'x,y', b: 'q"' }]), 'a,b\r\n"x,y","q"""\r\n');
});

test('bank exports: layouts, amounts, de-duplication, bank categories', () => {
  assert.equal(money('£1,234.50'), 1234.5);
  assert.equal(money('(12.00)'), -12);
  assert.equal(money('-'), 0);
  const a = parseCsv('Number,Date,Account,Amount,Subcategory,Memo\n,01/09/2026,A1,-3.20,DEB,SNACK HUT\n,01/09/2026,A1,-3.20,DEB,SNACK HUT\n', 'a.csv');
  assert.equal(a.length, 2);
  const inout = parseCsv('Preamble\nTransaction Date,Description,Money In,Money Out\n02 Sep 2026,SHOP,,£5.00\n03 Sep 2026,PAY,"£1,000.00",\n', 'b.csv');
  assert.deepEqual(inout.map(r => [r.date, r.amount, r.memo]), [['2026-09-02', -5, 'SHOP'], ['2026-09-03', 1000, 'PAY']]);
  assert.throws(() => parseCsv('foo,bar\n1,2\n', 'c.csv'), /couldn't find date\/amount\/description/);
  // Overlapping export: the two genuine identical payments stay, a repeat of them does not double.
  assert.equal(merge(a, a).length, 0);
  assert.equal(merge([a[0]], a).length, 1);
  const sync = parseCsv('Date,Account,Amount,Memo,Bank category\n01/09/2026,A1,-3.20,SNACK HUT,eating_out\n02/09/2026,A1,-1,X,Weird<cat>\n', 's.csv');
  const bank = {};
  assert.equal(updateBankCategories(bank, sync), 1, 'odd category text is dropped, not trusted');
  assert.equal(Object.values(bank)[0], 'eating_out');
  // The store round-trips, sorted by (date, memo), Python float text.
  const text = storeCsv([...a, ...inout]);
  assert.match(text, /^date,amount,account,subcategory,memo,source\r\n2026-09-01,-3.2,/);
  assert.equal(parseStore(text).length, 4);
  assert.equal(new Set(stableKeys(parseStore(text))).size, 4, 'identical rows still get distinct keys');
});

test('merchant cleaning and categorisation order', () => {
  assert.equal(cleanMerchant('TESCO STORES 1234 ON 02 JUL BCC'), 'TESCO STORES');
  assert.equal(cleanMerchant('SQ *THE COFFEE CO'), 'THE COFFEE CO');
  assert.equal(cleanMerchant('CARD PAYMENT TO CORNER SHOP 1234****5678'), 'CARD PAYMENT TO CORNER SHOP');
  assert.equal(niceTitle("SAM'S DINER"), "Sam's Diner");
  const rules = defaultRules();
  rules.merchant_overrides = { 'THE COFFEE CO': 'Treats' };
  rules.bank_category_map = { eating_out: 'Eating out' };
  const c = new Categoriser(rules);
  assert.deepEqual(c.categorise('SQ *THE COFFEE CO', 'THE COFFEE CO', -3, '', null), ['Treats', 'override']);
  assert.deepEqual(c.categorise('MYSTERY PLACE', 'MYSTERY PLACE', -3, '', 'eating_out'), ['Eating out', 'bank']);
  assert.deepEqual(c.categorise('MYSTERY PLACE', 'MYSTERY PLACE', 30, '', null), ['Income', 'default']);
  assert.deepEqual(c.categorise('MYSTERY PLACE', 'MYSTERY PLACE', -30, '', null), ['Uncategorised', 'unmatched']);
  assert.throws(() => new Categoriser({}), /no "rules" list/);
});

test('the shipped default rules are generic and complete', () => {
  const r = defaultRules();
  assert.ok(Array.isArray(r.rules) && r.rules.length >= 10);
  assert.deepEqual(r.merchant_overrides || {}, {}, 'no personal merchants in the template');
  assert.ok(r.bank_category_map && Object.keys(r.bank_category_map).length > 5);
  assert.ok(r.exclude_from_spending.includes('Income'));
  new Categoriser(r);
});

test('pipeline on the synthetic fixture matches Python spend.py exactly', async () => {
  const golden = JSON.parse(readFileSync(GOLDEN_FILE, 'utf8')).runs;
  for (const today of FIXTURE_TODAYS) {
    const dir = tmp('fin-pipe-');
    try {
      makeFinanceFixture(dir);
      const s = await runPipeline(dir, { today, generated: 'x' });
      assert.equal(s.status, 'ok');
      assert.equal(s.errors.length, 1, 'the broken file is reported');
      const d = digest(dir);
      d.inboxLeft = d.inboxLeft.filter(f => !f.startsWith('.'));
      for (const k of Object.keys(golden[today])) assert.deepEqual(d[k], golden[today][k], `${today}: ${k}`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test('pipeline: re-running imports nothing new; broken files stay in the inbox; outputs written', async () => {
  const dir = tmp('fin-pipe2-');
  try {
    makeFinanceFixture(dir);
    const first = await runPipeline(dir, { today: '2026-09-10' });
    assert.equal(first.imported, 526);
    assert.equal(first.bank_categories_changed, 10);
    const before = readFileSync(join(dir, '_system', 'transactions.csv'), 'utf8');
    const second = await runPipeline(dir, { today: '2026-09-10' });
    assert.equal(second.imported, 0);
    assert.equal(readFileSync(join(dir, '_system', 'transactions.csv'), 'utf8'), before);
    assert.deepEqual(readdirSync(join(dir, 'inbox')).sort(), ['broken.csv', 'notes.txt']);
    for (const f of ['analysis.json', 'summary.json']) assert.ok(existsSync(join(dir, '_system', f)), f);
    assert.ok(existsSync(join(dir, 'reports', '2026-09-10.md')));
    const a = JSON.parse(readFileSync(join(dir, '_system', 'analysis.json'), 'utf8'));
    assert.equal(a.balances.length, 1, 'malformed balances are dropped');
    assert.equal(a.balance_history.length, 2);
    assert.ok(a.flags.some(f => f.kind === 'Large spend'));
    assert.ok(a.flags.some(f => f.kind === 'Possible duplicate'));
    assert.ok(a.flags.some(f => f.kind === 'New recurring payment'));
    assert.deepEqual(a.recurring.map(r => r.frequency).sort(), ['annual', 'monthly', 'monthly', 'monthly', 'monthly', 'monthly', 'weekly']);
    // A same-file overlap: the second, overlapping export added only its new days.
    assert.equal(a.transactions.filter(t => /SNACK HUT/.test(t.memo)).length, 2);
    // The CSV export (replaces Spending.xlsx) never lets a cell start a formula.
    const frame = await loadFrame(dir);
    writeFileSync(join(dir, 'inbox', 'evil.csv'), 'Date,Amount,Memo\n09/09/2026,-1.00,=HYPERLINK("x")\n');
    await runPipeline(dir, { today: '2026-09-10' });
    const csv = transactionsCsv(await loadFrame(dir));
    assert.equal(csv.split('\r\n').length - 2, frame.length + 1);
    assert.doesNotMatch(csv, /,=HYPERLINK/);
    assert.match(csv, /'=HYPERLINK/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('pipeline: a new user starts with the default rules and an empty status', async () => {
  const dir = tmp('fin-new-');
  try {
    const s = await runPipeline(join(dir, 'finance'), { today: '2026-09-10' });
    assert.equal(s.status, 'empty');
    assert.ok(existsSync(join(dir, 'finance', '_system', 'rules.json')));
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'finance', '_system', 'rules.json'), 'utf8')), defaultRules());
    const again = await ensureFinanceDir(join(dir, 'finance'));
    assert.equal(again.rulesCreated, false, 'never overwrites the user\'s rules');
    assert.deepEqual(checkCsv(Buffer.from('Date,Amount,Memo\n01/09/2026,-1,A\n03/09/2026,-2,B\n'), 'x.csv'), { rows: 2, from: '2026-09-01', to: '2026-09-03' });
    assert.throws(() => checkCsv(Buffer.from('Date,Amount,Memo\n'), 'x.csv'), /no transactions/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('demo data goes through the same pipeline and never replaces real data', async () => {
  const { writeFakeData } = await import('../tools/make-fake-data.mjs');
  const dir = tmp('fin-demo-');
  try {
    await writeFakeData(dir, { tasks: 10 });
    const a = JSON.parse(readFileSync(join(dir, 'finance', '_system', 'analysis.json'), 'utf8'));
    assert.equal(a.sample, true);
    assert.ok(a.transactions.length > 50);
    assert.equal(a.counts.by_how.unmatched || 0, 0, 'every demo transaction is categorised');
    // Rebuilding keeps it marked as a sample.
    await runPipeline(join(dir, 'finance'), { today: a.today });
    assert.equal(JSON.parse(readFileSync(join(dir, 'finance', '_system', 'analysis.json'), 'utf8')).sample, true);
    // A real store (no demo marker) is left alone by a later demo write.
    const real = tmp('fin-real-');
    makeFinanceFixture(join(real, 'finance'));
    await runPipeline(join(real, 'finance'), { today: '2026-09-10' });
    const store = readFileSync(join(real, 'finance', '_system', 'transactions.csv'), 'utf8');
    await writeFakeData(real, { tasks: 5, force: true });
    assert.equal(readFileSync(join(real, 'finance', '_system', 'transactions.csv'), 'utf8'), store);
    rmSync(real, { recursive: true, force: true });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
