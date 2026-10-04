// The Finances Overview's money brief: the pure model (src/finance/25-money-model.js,
// evaluated by lib/finance/brief.mjs exactly as the server uses it), the mood of the
// money, the pay cycle, the template sentences, the check of an AI's wording against
// the numbers, and the page and the server agreeing on every figure. Then
// GET /api/finance/brief with a mocked Claude. All data is synthetic.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';
import { MBM, briefFor, briefPrompt, aiBrief, BRIEF_SCHEMA } from '../lib/finance/brief.mjs';
import { loadFinanceView } from '../tools/finance-numbers.mjs';
import { buildFakeData } from '../tools/make-fake-data.mjs';
import { todayIn } from '../lib/finance/pipeline.mjs';
import { systemTimeZone } from '../lib/datadir.mjs';

const { dnum, diso } = MBM.util;
const fmt = MBM.makeFmt('GBP', 'en-GB');
// As on CI: no Claude CLI, so the server's start-up checks never run a real one
// (the brief's AI is a fake) and close() never waits for one.
process.env.CLAUDE_CLI_PATH = join(tmpdir(), 'opendash-tests-no-claude-cli', 'claude');

// A small synthetic analysis: salary on the 25th (Fri before a weekend), rent on
// the 1st, a phone bill on the 18th, steady groceries and coffee, three earlier
// cycles, a balance and its history. today = 2026-10-14 (day 20 of the cycle).
function synth({ today = '2026-10-14', groceries = 1, months = 4, salary = true, balance = 1500 } = {}) {
  const tx = []; const T = dnum(today); const start = T - months * 31 - 10;
  const add = (n, m, c, a, memo) => tx.push({ d: diso(n), m, c, a, acct: 'acc-1', memo: memo || m.toUpperCase(), k: 'k' + tx.length });
  for (let n = start; n <= T; n++) {
    const d = new Date(n * 864e5); const dom = d.getUTCDate(); const wd = (n + 3) % 7;
    const pay = (() => { const y = d.getUTCFullYear(), mo = d.getUTCMonth(); let p = dnum(`${y}-${String(mo + 1).padStart(2, '0')}-25`); while ((p + 3) % 7 >= 5) p--; return p; })();
    if (salary && n === pay) add(n, 'Northwind Labs', 'Income', 2500, 'BGC NORTHWIND');
    if (dom === 1) add(n, 'Oak Lane Lettings', 'Housing', -900, 'SO OAK LANE');
    if (dom === 18) add(n, 'Pocket Mobile', 'Bills & utilities', -18, 'DD POCKET MOBILE');
    const rnd = k => Math.abs(Math.sin(n * k) * 43758.5453) % 1;   // groceries on irregular days, varying amounts: not a recurring bill
    if (rnd(78.233) < 0.25) add(n, 'Green Basket', 'Groceries', -Math.round(10 + rnd(12.9898) * 60) * (n > T - 20 ? groceries : 1));
    if (wd < 5) add(n, 'Bean There Coffee', 'Eating out', -3);
  }
  const history = []; for (let n = T - 60; n <= T; n += 2) history.push({ date: diso(n), total: balance + (T - n) * 3, accounts: { 'acc-1': balance + (T - n) * 3 } });
  return { today, transactions: tx, exclude_from_spending: ['Income', 'Internal transfers', 'Savings & investments', 'Work expenses'],
    balances: [{ acct: 'acc-1', name: 'Current', kind: 'current', balance, currency: 'GBP', asOf: today }], balance_history: history, recurring: [] };
}

test('the server evaluates the page\'s own model file (one source of truth)', () => {
  for (const f of ['fromAnalysis', 'compute', 'sentences', 'facts', 'validate', 'moodOf', 'numbersIn']) assert.equal(typeof MBM[f], 'function', f);
  const src = readFileSync(new URL('../src/finance/25-money-model.js', import.meta.url), 'utf8');
  assert.match(src.split('\n')[0], /@part 25-money-model\.js .*OWNER: O/);
  assert.doesNotMatch(src.replace(/\/\/.*$/gm, ''), /\bdocument\.|\bwindow\.|getComputedStyle|£/, 'pure: no DOM, no hard-coded currency');
});

test('mood: spent against usual by today (cool / calm / warm / hot); small gaps stay calm', () => {
  assert.equal(MBM.moodOf(800, 1000, 2000).mood, 'cool');
  assert.equal(MBM.moodOf(1000, 1000, 2000).mood, 'calm');
  assert.equal(MBM.moodOf(1040, 1000, 2000).mood, 'calm');
  assert.equal(MBM.moodOf(1150, 1000, 2000).mood, 'warm');
  assert.equal(MBM.moodOf(1300, 1000, 2000).mood, 'hot');
  // Day 1: usual by today is tiny, so a ratio of 3 over a coffee is still calm (gap under 20 / 3%).
  assert.equal(MBM.moodOf(9, 3, 2000).mood, 'calm');
  assert.equal(MBM.moodOf(200, 60, 2000).mood, 'hot');
  const none = MBM.moodOf(500, 0);
  assert.equal(none.known, false); assert.equal(none.mood, 'calm'); assert.equal(none.diff, null);
  assert.equal(MBM.moodOf(1300, 1000, 2000).diff, 300);
});

test('pay cycle: a monthly salary is found, paydays move off weekends, cycles and pace bands line up', () => {
  const a = synth();
  const input = MBM.fromAnalysis(a);
  const sal = MBM.salary(input.tx, input.anchor);
  assert.ok(sal); assert.equal(sal.m, 'Northwind Labs'); assert.equal(sal.dom, 25);
  // 25 Oct 2026 is a Sunday: payday is Friday 23 Oct.
  assert.equal(diso(MBM.nextPayday(sal, dnum('2026-09-25'))), '2026-10-23');
  const B = MBM.compute(input, { fmt });
  assert.equal(B.mode, 'cycle');
  assert.equal(diso(B.cycle.start), '2026-09-25');
  assert.equal(diso(B.cycle.next), '2026-10-23');
  assert.equal(B.cycle.day, 19); assert.equal(B.cycle.daysLeft, 9);
  assert.ok(B.cycle.prev.length >= 3 && B.cycle.prev.every(p => p.start >= input.minN));
  // The cycle curve is the running sum of spending: its end is exactly what was spent.
  const spent = input.tx.filter(t => t.kind === 'spend' && t.n >= B.cycle.start && t.n <= B.anchor).reduce((s, t) => s + t.s, 0);
  assert.ok(Math.abs(B.spent - spent) < 0.005);
  assert.equal(B.curve.length, B.cycle.day + 1);
  for (let i = 1; i < B.curve.length; i++) assert.ok(B.curve[i] >= B.curve[i - 1]);
  // Bands: lo <= median <= hi every day; the projection adds the usual rest of the cycle.
  for (let i = 0; i < B.cycle.len; i++) assert.ok(B.pace.lo[i] <= B.pace.med[i] + 1e-9 && B.pace.med[i] <= B.pace.hi[i] + 1e-9);
  assert.ok(Math.abs(B.projected - (B.spent + B.usualEnd - B.usual)) < 0.011);
  // No salary: the calendar month, and the toggle is not offered.
  const M = MBM.compute(MBM.fromAnalysis(synth({ salary: false })), { fmt });
  assert.equal(M.mode, 'month'); assert.equal(M.hasSalary, false);
  assert.equal(diso(M.cycle.start), '2026-10-01'); assert.equal(M.cycle.len, 31); assert.equal(M.cycle.day, 13);
  // Asking for the month view with a salary works too.
  assert.equal(MBM.compute(input, { fmt, mode: 'month' }).mode, 'month');
  // Irregular large payments are not a salary.
  const irr = synth({ salary: false });
  for (const d of ['2026-07-07', '2026-07-31', '2026-08-05', '2026-08-14', '2026-09-16', '2026-09-30']) irr.transactions.push({ d, m: 'Client ' + d.slice(5, 7), c: 'Income', a: 900 });
  assert.equal(MBM.salary(MBM.fromAnalysis(irr).tx, dnum('2026-10-14')), null);
});

test('bills before payday, safe to spend and movers', () => {
  const a = synth({ groceries: 4 });
  const input = MBM.fromAnalysis(a);
  input.recurring = MBM.recurring(input.tx, [], input.anchor);
  const B = MBM.compute(input, { fmt });
  // Rent (1st) is after payday (23 Oct); the phone bill (18th) is before it.
  assert.deepEqual(B.bills.map(b => [b.m, diso(b.n), b.amount]), [['Pocket Mobile', '2026-10-18', 18]]);
  assert.equal(B.safe.daysLeft, 9);
  assert.ok(Math.abs(B.safe.perDay - (1500 - 18 - 100) / 9) < 0.006);
  // Movers leave rent and bills out; groceries doubled in the last weeks.
  assert.ok(!B.movers.some(x => MBM.isFixed(x.c)));
  assert.equal(B.movers[0].k, 'Groceries'); assert.ok(B.movers[0].delta > 0);
  assert.ok(MBM.isFixed('Rent') && MBM.isFixed('Housing') && !MBM.isFixed('Groceries'));
  // A charge a few days overdue counts as due now; weekly bills repeat.
  const recs = [{ m: 'Gym', cat: 'Fitness', active: true, typical: 10, period: 7, next: 100 }, { m: 'Late', cat: 'Bills & utilities', active: true, typical: 5, period: 30.44, next: 98 }, { m: 'Pot', cat: 'Savings & investments', active: true, typical: 50, period: 30.44, next: 103 }];
  const due = MBM.billsBetween(recs, 100, 115);
  // (Gym's next charge is today and hasn't come in: it is due now too.)
  assert.deepEqual(due.map(b => [b.m, b.n, b.due]), [['Gym', 100, true], ['Late', 100, true], ['Gym', 107, false], ['Gym', 114, false]]);
  // No balance from the bank: no safe to spend (and never a made-up one).
  const nb = synth(); nb.balances = []; nb.balance_history = [];
  assert.equal(MBM.compute(MBM.fromAnalysis(nb), { fmt }).safe, null);
});

test('the three template sentences: facts only, entity offsets exact', () => {
  const a = synth({ groceries: 4 });
  const input = MBM.fromAnalysis(a); input.recurring = MBM.recurring(input.tx, [], input.anchor);
  const B = MBM.compute(input, { fmt });
  const s = B.sentences;
  assert.equal(s.length, 3);
  assert.match(s[0].text, /^You've spent £[\d,]+ since payday, £[\d,]+ (over|under) your usual pace\.$/);
  assert.match(s[1].text, /^Groceries is up £\d+ on usual, mostly Green Basket/);
  assert.equal(s[2].text, `Pocket Mobile (£18.00) is the only bill before payday on Friday 23 October, so about ${fmt.money(B.safe.perDay)} a day is free to spend.`);
  for (const x of s) for (const e of x.entities) assert.equal(x.text.slice(e.start, e.end), e.text, `${e.type} ${e.text}`);
  const tones = s[0].entities.map(e => e.tone);
  assert.equal(tones[1], B.mood.diff < 0 ? 'good' : 'warn');
  assert.equal(s[1].entities.find(e => e.type === 'money').tone, 'warn');
  assert.deepEqual(s[2].entities.map(e => e.type), ['merchant', 'money', 'date', 'money']);
  // Every number a template sentence states passes the AI check (the template is the bar AI text must meet).
  const v = MBM.validate({ sentences: s }, B, fmt);
  assert.equal(v.replaced, 0);
  // ...and only merchants an AI was told about (the bills) may be AI chips.
  assert.equal(v.dropped, s.flatMap(x => x.entities).filter(e => e.type === 'merchant' && !B.bills.some(b => b.m === e.ref)).length);
  // Variants: several bills name the next one; no bills; month view; no history yet.
  const B2 = MBM.compute(input, { fmt, mode: 'month' });
  assert.match(B2.sentences[0].text, /so far this month/);
  assert.match(B2.sentences[2].text, /before the month ends/);
  const many = MBM.compute(Object.assign({}, input, { recurring: [{ m: 'A Co', cat: 'Bills & utilities', active: true, typical: 10, period: 30.44, next: B.anchor + 1 }, { m: 'B Co', cat: 'Subscriptions', active: true, typical: 5, period: 30.44, next: B.anchor + 4 }] }), { fmt });
  assert.match(many.sentences[2].text, /^2 bills worth £15 leave before payday on Friday 23 October, starting with A Co tomorrow, so about £\d+ a day is free to spend\.$/);
  const none = MBM.compute(Object.assign({}, input, { recurring: [] }), { fmt });
  assert.match(none.sentences[2].text, /^No bills are due before payday on Friday 23 October/);
  const fresh = MBM.compute(MBM.fromAnalysis(synth({ months: 0 })), { fmt });
  assert.equal(fresh.mood.known, false);
  assert.match(fresh.sentences[0].text, /about £\d+ a day\.$/);
});

test('AI wording: every number must match the figures; bad sentences fall back, bad chips drop', () => {
  const a = synth({ groceries: 4 });
  const input = MBM.fromAnalysis(a); input.recurring = MBM.recurring(input.tx, [], input.anchor);
  const B = MBM.compute(input, { fmt });
  const spent = fmt.money(B.spent), diff = fmt.money(Math.abs(B.mood.diff)), g = B.movers[0];
  const ok = {
    sentences: [
      { text: `So far this cycle you've spent ${spent}, which is ${diff} ${B.mood.diff < 0 ? 'below' : 'above'} where you'd usually be.`, entities: [{ type: 'money', text: spent, ref: spent }, { type: 'money', text: diff, ref: diff }] },
      { text: `Groceries is running ${fmt.money(g.delta)} ahead of usual (${Math.round(g.pct * 100)}%).`, entities: [{ type: 'category', text: 'Groceries', ref: 'Groceries' }, { type: 'merchant', text: 'Groceries', ref: 'Tesco' }] },
      { text: `Pocket Mobile takes £18.00 on Sunday 18 October; nine days remain until payday on Friday 23 October.`, entities: [{ type: 'merchant', text: 'Pocket Mobile', ref: 'Pocket Mobile' }, { type: 'date', text: 'Friday 23 October', ref: '2026-10-23' }] },
    ],
  };
  const v = MBM.validate(ok, B, fmt);
  assert.equal(v.replaced, 0, JSON.stringify(v.sentences.map(s => s.text)));
  assert.equal(v.sentences[0].text, ok.sentences[0].text);
  assert.equal(v.sentences[0].entities[1].tone, B.mood.diff < 0 ? 'good' : 'warn');
  assert.equal(v.dropped, 1, 'an overlapping / unknown merchant chip is dropped');
  for (const s of v.sentences) for (const e of s.entities) assert.equal(s.text.slice(e.start, e.end), e.text);
  // A wrong amount, a made-up percentage, a k-rounding too far off, markup: the template takes its place.
  const bad = MBM.validate({ sentences: [
    { text: `You've spent ${fmt.money(B.spent + 40)} since payday.`, entities: [] },
    { text: 'Groceries is up 75% on usual.', entities: [] },
    { text: '<b>Bills</b> ahead.', entities: [] },
  ] }, B, fmt);
  assert.equal(bad.replaced, 3);
  assert.deepEqual(bad.sentences.map(s => s.text), B.sentences.map(s => s.text));
  // k notation within its rounding passes; a merchant the AI was never told about can't be a chip.
  const k = MBM.validate({ sentences: [{ text: `Spending is at ${'£' + (B.spent / 1000).toFixed(1)}k so far.`, entities: [{ type: 'merchant', text: 'Spending', ref: 'Green Basket' }] }] }, B, fmt);
  assert.equal(k.replaced, 2, 'missing sentences are filled from the template');
  assert.equal(k.sentences[0].entities.length, 0);
  // Number parsing: symbols, separators, decimals, k, %, words; other locales' separators.
  const nums = MBM.numbersIn('£1,813 then −£12.99, 1.8k, 40% and four bills', fmt);
  assert.deepEqual(nums.map(x => [x.v, x.money, x.pct]), [[1813, true, false], [12.99, true, false], [1800, false, false], [40, false, true], [4, false, false]]);
  const de = MBM.makeFmt('EUR', 'de-DE');
  assert.deepEqual(MBM.numbersIn('1.813,50 € und 12 €', de).map(x => [x.v, x.money]), [[1813.5, true], [12, true]]);
});

test('facts for an AI: aggregates only (no transactions, balances, accounts or memos)', () => {
  const a = synth();
  const { facts, B } = briefFor(a, { currency: 'GBP', locale: 'en-GB' });
  const json = JSON.stringify(facts);
  for (const s of ['BGC', 'DD POCKET', 'acc-1', 'Green Basket', 'Bean There', 'Oak Lane', 'Northwind', String(B.balance.total)]) assert.ok(!json.includes(s), `facts leak ${s}`);
  assert.ok(json.includes('Pocket Mobile'), 'the next bills are named');
  assert.ok(json.length < 4000);
  const p = briefPrompt(facts, { userName: 'Alex <b>' });
  assert.ok(p.system.includes('ONLY the facts'));
  assert.ok(!p.prompt.includes('<b>'));
  assert.deepEqual(BRIEF_SCHEMA.properties.sentences.maxItems, 3);
});

test('the page and the server agree on every figure (page: buildModel + its recurring list)', () => {
  const { finance } = buildFakeData({ today: new Date('2026-10-02T12:00:00') });
  const FV = loadFinanceView({ currency: 'GBP', locale: 'en-GB' });
  for (const mode of ['cycle', 'month']) {
    const page = JSON.parse(JSON.stringify(FV._money.brief({ analysis: finance.analysis, mode })));   // out of the sandbox's realm
    const { B } = briefFor(finance.analysis, { mode, currency: 'GBP', locale: 'en-GB' });
    assert.equal(page.key, B.key, mode);
    assert.deepEqual(page.bills, JSON.parse(JSON.stringify(B.bills.map(b => ({ m: b.m, n: b.n, amount: b.amount })))), mode);
    assert.deepEqual(page.sentences, B.sentences.map(s => s.text), mode);
    assert.deepEqual(page.insights, B.insights.map(x => x.title), mode);
    assert.equal(page.spent, B.spent); assert.deepEqual(page.safe, JSON.parse(JSON.stringify(B.safe)));
  }
});

test('AI brief through a mocked json job: the schema is sent, numbers are checked', async () => {
  const { B, fmt: f, facts } = briefFor(synth(), { currency: 'GBP', locale: 'en-GB' });
  const calls = [];
  const askJson = async (o) => { calls.push(o); return { json: { sentences: [{ text: B.sentences[0].text, entities: B.sentences[0].entities }, { text: 'Everything costs £9,999 now.', entities: [] }, { text: B.sentences[2].text, entities: [] }] }, model: o.model }; };
  const r = await aiBrief({ B, fmt: f, facts, askJson });
  assert.equal(calls.length, 1); assert.equal(calls[0].schema, BRIEF_SCHEMA); assert.equal(calls[0].model, 'claude-haiku-4-5');
  assert.equal(r.replaced, 1); assert.equal(r.sentences[1].text, B.sentences[1].text);
});

// ── GET /api/finance/brief (a real server on a synthetic data folder) ──
let dir, port, srv, aiCalls = [], aiAnswer = null, aiOn = true;
function freePort() { return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); }); }
function get(path, headers = {}) {
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method: 'GET', path, headers: { Host: `localhost:${port}`, 'Sec-Fetch-Site': 'same-origin', ...headers } }, (r) => {
      const chunks = []; r.on('data', d => chunks.push(d));
      r.on('end', () => { const t = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(t); } catch { /* text */ } res({ status: r.statusCode, json, text: t }); });
    });
    req.on('error', rej); req.end();
  });
}
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'fin-brief-'));
  const sys = join(dir, 'finance', '_system'); mkdirSync(sys, { recursive: true });
  writeFileSync(join(sys, 'analysis.json'), JSON.stringify(synth({ groceries: 4 })));
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ currency: 'GBP', locale: 'en-GB', brief: { autoOpen: false, ai: false, story: { autoOpen: false } } }));
  const { setFinanceBriefAi } = await import('../server/routes/finance.mjs');
  setFinanceBriefAi({ aiStatus: async () => ({ available: aiOn, code: aiOn ? null : 'NOT_SIGNED_IN' }), askJson: async (o) => { aiCalls.push(o); return { json: aiAnswer, model: o.model, ms: 3 }; } });
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir]);
});
after(async () => {
  await srv?.close();
  const { setFinanceBriefAi } = await import('../server/routes/finance.mjs');
  setFinanceBriefAi(null);
  rmSync(dir, { recursive: true, force: true });
});

test('GET /api/finance/brief: template at once, Claude only when asked, cached for the day', async () => {
  const r = await get('/api/finance/brief?mode=cycle');
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ai.state, 'missing'); assert.equal(r.json.template.length, 3); assert.equal(aiCalls.length, 0);
  // The server reads the analysis with "today" moved on to the user's today once that is
  // later than the day it was built (lib/finance.mjs financeData; this config has no zone: the computer's).
  const a = synth({ groceries: 4 }), now = todayIn(systemTimeZone());
  const B = briefFor(now > a.today ? { ...a, today: now } : a, { currency: 'GBP', locale: 'en-GB' }).B;
  assert.equal(r.json.key, B.key);
  // Cross-site requests are refused (it can start a Claude run).
  assert.equal((await get('/api/finance/brief', { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  aiAnswer = { sentences: [{ text: B.sentences[0].text, entities: [] }, { text: 'Spending is up 300% everywhere.', entities: [] }, { text: B.sentences[2].text, entities: [] }] };
  const g = await get('/api/finance/brief?mode=cycle&ai=1');
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.ai.state, 'fresh'); assert.equal(g.json.ai.replaced, 1);
  assert.equal(g.json.ai.sentences[1].text, B.sentences[1].text);
  assert.equal(aiCalls.length, 1);
  assert.ok(!aiCalls[0].prompt.includes('Green Basket'), 'no merchant names beyond the bills');
  assert.ok(existsSync(join(dir, 'finance', '_system', 'brief-ai.json')));
  const c = await get('/api/finance/brief?mode=cycle&ai=1');
  assert.equal(c.json.ai.state, 'cached'); assert.equal(aiCalls.length, 1, 'served from the cache');
  const rg = await get('/api/finance/brief?mode=cycle&regenerate=1');
  assert.equal(rg.json.ai.state, 'fresh'); assert.equal(aiCalls.length, 2);
  // Nothing usable: 502, the page keeps its template.
  aiAnswer = { sentences: [{ text: 'You spent £1 million.', entities: [] }, { text: 'Up 999%.', entities: [] }, { text: '<i>x</i>', entities: [] }] };
  assert.equal((await get('/api/finance/brief?mode=month&ai=1')).status, 502);
  aiOn = false;
  const off = await get('/api/finance/brief?mode=month&ai=1');
  assert.equal(off.status, 503); assert.equal(off.json.code, 'NOT_SIGNED_IN');
});
