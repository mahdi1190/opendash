// Finances numbers audit (NA, 3 Oct 2026): regression tests for the bugs the
// audit found and fixed. All data is synthetic.
//   1. Bills before payday / month end were projected every 30 days, so rent
//      paid on the 1st landed on the 31st after a 31-day month and was counted
//      "before the month ends" (safe to spend in Month mode off by the rent / days).
//   2. Sentence 2 said "everything else is close to normal" while another
//      category was well over usual.
//   3. The AI check let through amounts in words ("fifty pounds", "a grand"),
//      amounts with a unit word ("12 pounds", "40 per cent") and the wrong
//      direction ("£147 under" when it is over; "Shopping is down £106").
//   4. Merchant groups merged different businesses that share a brand word
//      ("LIME*RIDE" and "LIME LEAF THAI"), merging their totals and filters.
// Round 2 (evening):
//   5. The AI check took any of the brief's real figures anywhere: the bills
//      total as "spent", spent as "a day", a mover's change on a category that
//      did not move, "8 bills" (8 = the day of the cycle), "payday on 2 October"
//      (today) and the wrong weekday all got through. A thousands separator
//      ("£1,147") also split the clause, so its direction was never checked.
//   6. The template's own sentence 2 failed the check when the faller it names
//      ranks below the top five movers (an AI was never told about it), and
//      sentence 1's "about £72 a day" (no usual yet) was not an allowed figure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { MBM, briefFor } from '../lib/finance/brief.mjs';
import { loadFinanceView } from '../tools/finance-numbers.mjs';
import { buildFakeData } from '../tools/make-fake-data.mjs';
import { buildScaleFinance } from '../tools/make-fake-finance.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { dnum, diso, r2 } = MBM.util;
const fmt = MBM.makeFmt('GBP', 'en-GB');
const plain = x => JSON.parse(JSON.stringify(x));
const fake = () => buildFakeData({ today: new Date('2026-10-02T12:00:00') }).finance.analysis;
const rec = (charges, o = {}) => {
  const ch = charges.map(([d, s]) => ({ n: dnum(d), s }));
  const last = ch[ch.length - 1].n;
  return Object.assign({ m: 'Bill', cat: 'Bills & utilities', active: true, period: 30.44, freq: 'Monthly', typical: ch[0].s, last, next: last + 30, charges: ch }, o);
};
const days = list => list.map(b => diso(b.n) + (b.due ? ' due' : ''));

test('bills fall on their usual day of the month, not every 30 days', () => {
  // Rent on the 1st: after a 31-day month "+30 days" said 31 Oct, inside October.
  const rent = rec([['2026-07-01', 900], ['2026-08-01', 900], ['2026-09-01', 900], ['2026-10-01', 900]], { m: 'Rent', cat: 'Housing' });
  assert.deepEqual(days(MBM.billsBetween([rent], dnum('2026-10-02'), dnum('2026-11-01'))), [], 'nothing more before the month ends');
  assert.deepEqual(days(MBM.billsBetween([rent], dnum('2026-10-02'), dnum('2026-12-05'))), ['2026-11-01', '2026-12-01']);
  // A bill on the last day of the month: 31 Aug, 30 Sep -> 31 Oct, 30 Nov.
  const eom = rec([['2026-07-31', 20], ['2026-08-31', 20], ['2026-09-30', 20]]);
  assert.deepEqual(days(MBM.billsBetween([eom], dnum('2026-10-02'), dnum('2026-12-01'))), ['2026-10-31', '2026-11-30']);
  // On the 30th (February clamps to the 28th): the 30th again, not the 31st.
  const d30 = rec([['2027-01-30', 12], ['2027-02-28', 12], ['2027-03-30', 12]]);
  assert.deepEqual(days(MBM.billsBetween([d30], dnum('2027-04-01'), dnum('2027-06-01'))), ['2027-04-30', '2027-05-30']);
  // Taken late over a weekend (Sat 31 Oct -> Mon 2 Nov): the next is still 30 Nov.
  const late = rec([['2026-07-31', 15], ['2026-08-31', 15], ['2026-09-30', 15], ['2026-11-02', 15]]);
  assert.deepEqual(days(MBM.billsBetween([late], dnum('2026-11-03'), dnum('2026-12-05'))), ['2026-11-30']);
  // A bill that drifts earlier (27th, 25th, 24th) comes next on the last one's day, as before.
  const drift = rec([['2026-07-27', 40], ['2026-08-25', 40], ['2026-09-24', 40]]);
  assert.deepEqual(days(MBM.billsBetween([drift], dnum('2026-10-03'), dnum('2026-11-01'))), ['2026-10-24']);
  // Only two charges, the last on a month's last day: 31 Aug + 30 Sep is "the 31st".
  const two = rec([['2026-08-31', 9.99], ['2026-09-30', 9.99]]);
  assert.deepEqual(days(MBM.billsBetween([two], dnum('2026-10-02'), dnum('2026-12-01'))), ['2026-10-31', '2026-11-30']);
  // A day overdue: due now (it has not left yet).
  const over = rec([['2026-08-15', 30], ['2026-09-15', 30]]);
  assert.deepEqual(days(MBM.billsBetween([over], dnum('2026-10-16'), dnum('2026-10-20'))), ['2026-10-16 due']);
  // Quarterly and yearly keep their day too; weekly still steps 7 days from r.next.
  const q = rec([['2026-01-31', 50], ['2026-04-30', 50], ['2026-07-31', 50]], { period: 91, freq: 'Quarterly' });
  assert.deepEqual(days(MBM.billsBetween([q], dnum('2026-08-01'), dnum('2027-02-01'))), ['2026-10-31', '2027-01-31']);
  const wk = { m: 'Box', cat: 'Groceries', active: true, period: 7, typical: 5, last: dnum('2026-10-01'), next: dnum('2026-10-08'), charges: [] };
  assert.deepEqual(days(MBM.billsBetween([wk], dnum('2026-10-02'), dnum('2026-10-23'))), ['2026-10-08', '2026-10-15', '2026-10-22']);
});

test('Month mode: rent paid on the 1st is not a bill before the month ends, and safe to spend adds up', () => {
  const a = fake();
  for (const mode of ['month', 'cycle']) {
    const { B } = briefFor(a, { mode, currency: 'GBP', locale: 'en-GB' });
    assert.ok(B.bills.every(b => b.n < B.cycle.next && b.n >= B.anchor), `${mode}: bills inside the period`);
    assert.ok(!B.bills.some(b => /lettings/i.test(b.m)), `${mode}: the rent (paid 1 Oct) is next due 1 Nov`);
    assert.equal(B.billsTotal, r2(B.bills.reduce((s, b) => s + b.amount, 0)));
    assert.equal(B.safe.perDay, r2(Math.max(0, B.balance.total - B.billsTotal - B.cushion) / B.cycle.daysLeft), `${mode}: (balance - bills - cushion) / days left`);
    const s3 = B.sentences[2].text;
    assert.match(s3, new RegExp(`^${B.bills.length} bills worth ${fmt.money(B.billsTotal).replace(/[£]/g, '\\$&')}`));
  }
  const { B } = briefFor(a, { mode: 'month' });
  assert.ok(B.upcoming.some(b => /lettings/i.test(b.m) && diso(b.n) === '2026-11-01'), 'Coming up shows the rent on 1 Nov');
});

test('sentence 2 only says "everything else is close to normal" when it is', () => {
  const base = { anchor: dnum('2026-10-10'), cycle: { mode: 'month', start: dnum('2026-10-01'), next: dnum('2026-11-01'), day: 9, len: 31, daysLeft: 22 }, mood: { known: false }, spent: 300, lead: {}, cats: [], bills: [], safe: null };
  const two = MBM.sentences(Object.assign({}, base, { movers: [{ k: 'Shopping', delta: 106 }, { k: 'Eating out', delta: 39 }, { k: 'Transport', delta: -3 }] }), fmt)[1].text;
  assert.doesNotMatch(two, /close to normal/);
  assert.match(two, /^Shopping is up £106 on usual, and Eating out is £39 higher\.$/);
  const one = MBM.sentences(Object.assign({}, base, { movers: [{ k: 'Shopping', delta: 106 }, { k: 'Eating out', delta: 4 }, { k: 'Transport', delta: -3 }] }), fmt)[1].text;
  assert.match(one, /; everything else is close to normal\.$/);
  // The fake data's pay cycle has Shopping +£106 and Eating out +£39.
  const { B } = briefFor(fake(), { mode: 'cycle' });
  const others = B.movers.filter(x => Math.abs(x.delta) >= 5).length;
  if (others > 1) assert.doesNotMatch(B.sentences[1].text, /close to normal/);
});

test('the AI check fails amounts in words, unit words it cannot match, and the wrong direction', () => {
  const { B, fmt: f } = briefFor(fake(), { mode: 'cycle', currency: 'GBP', locale: 'en-GB' });
  assert.ok(B.mood.diff > 1, 'the fake cycle runs over usual');
  const up = B.movers.find(x => x.delta >= 5);
  const t = B.sentences.map(s => s.text);
  const check = s1 => MBM.validate({ sentences: [{ text: s1, entities: [] }, { text: t[1], entities: [] }, { text: t[2], entities: [] }] }, B, f);
  const forged = {
    'a wrong amount': `You've spent ${f.money(B.spent + 250)} since payday.`,
    'number words': `Shopping is up fifty pounds on usual.`,
    'scale words': `You are about two hundred pounds over your usual pace.`,
    'a grand': `You have a grand to spare.`,
    'a multiplier': `You've spent twice your usual.`,
    'pounds as a word, wrong': `${up.k} is up 13 pounds on usual.`,
    'per cent as a word, wrong': `${up.k} is 97 per cent higher than usual.`,
    'the wrong direction (pace)': `You've spent ${f.money(B.spent)} since payday, ${f.money(Math.abs(B.mood.diff))} under your usual pace.`,
    'the wrong direction (mover)': `${up.k} is down ${f.money(up.delta)} on usual.`,
  };
  for (const [name, s] of Object.entries(forged)) assert.equal(check(s).replaced, 1, name);
  // A faithful rewording still passes.
  const ok = check(`Spending since payday is ${f.money(B.spent)}, which is ${f.money(B.mood.diff)} more than usual by now.`);
  assert.equal(ok.replaced, 0); assert.match(ok.sentences[0].text, /more than usual/);
  assert.equal(check(`${up.k} is ${f.money(up.delta)} higher than usual.`).replaced, 0);
});

test('every template sentence passes its own check (fake, scale and both periods)', () => {
  const sets = [fake(), buildScaleFinance({ days: 730, seed: 11, today: '2026-10-02' }).analysis];
  for (const a of sets) for (const mode of ['cycle', 'month']) {
    const { B, fmt: f } = briefFor(a, { mode, currency: 'GBP', locale: 'en-GB' });
    const v = MBM.validate({ sentences: B.sentences.map(s => ({ text: s.text, entities: s.entities })) }, B, f);
    assert.equal(v.replaced, 0, `${mode}: ${B.sentences.map(s => s.text).join(' | ')}`);
    assert.deepEqual(v.sentences.map(s => s.text), B.sentences.map(s => s.text));
  }
});

test('merchant groups: a shared brand word does not merge different businesses', () => {
  const box = {}; vm.createContext(box);
  vm.runInContext(readFileSync(join(ROOT, 'src', 'app', '67-fin-symbols.js'), 'utf8'), box);
  const FV = loadFinanceView({ currency: 'GBP', locale: 'en-GB' });
  const tx = [];
  const add = (d, m, c, a) => tx.push({ d, m, c, a, k: 'k' + tx.length });
  add('2026-09-02', 'LIME*RIDE', 'Transport', -3.5); add('2026-09-09', 'LIME*RIDE', 'Transport', -4.5);
  add('2026-09-05', 'LIME LEAF THAI', 'Eating out', -32);
  add('2026-09-06', 'SHELL', 'Transport', -60); add('2026-09-20', 'SHELL COTTAGE B&B', 'Holidays', -180);
  add('2026-09-07', 'TESCO STORES 3345', 'Groceries', -20); add('2026-09-12', 'Tesco', 'Groceries', -30); add('2026-09-14', 'TESCO EXPRESS', 'Uncategorised', -6);
  add('2026-09-25', 'Payroll', 'Income', 2000);
  const analysis = { today: '2026-09-30', transactions: tx, categories: ['Transport', 'Eating out', 'Holidays', 'Groceries', 'Income'], exclude_from_spending: ['Income', 'Internal transfers'] };
  FV._vendors.useSymbols(box.FinSymbols);
  try {
    const M = FV._shell.setModel(analysis);
    const G = FV._vendors.VK.groups(M);
    assert.notEqual(G.keyOf('LIME*RIDE'), G.keyOf('LIME LEAF THAI'));
    assert.notEqual(G.keyOf('SHELL'), G.keyOf('SHELL COTTAGE B&B'));
    assert.equal(G.keyOf('Tesco'), G.keyOf('TESCO STORES 3345'), 'spellings of one merchant still merge');
    assert.equal(G.keyOf('TESCO EXPRESS'), G.keyOf('Tesco'), 'an uncategorised spelling stays with its merchant');
    assert.equal(G.label(G.keyOf('LIME LEAF THAI')), 'Lime Leaf Thai', 'a split name reads as itself');
    // Totals per group = the sum of its members; the merchant filter follows the groups.
    const groups = FV._vendors.VL.groupAgg(FV._vendors.merchantAgg(M.tx.filter(x => x.kind === 'spend')), G.keyOf, G.label);
    for (const g of groups) assert.equal(r2(g.total), r2(g.raw.reduce((s, m) => s + M.tx.filter(x => x.m === m && x.kind === 'spend').reduce((a, x) => a + x.s, 0), 0)), g.m);
    assert.equal(plain(FV._numbers({ preset: '1M', analysis, filters: { merchant: 'LIME*RIDE' } })).kpis.spent, 8, 'the Thai restaurant is not in Lime');
    assert.equal(plain(FV._numbers({ preset: '1M', analysis, filters: { merchant: 'Tesco' } })).kpis.spent, 56);
    const none = plain(FV._numbers({ preset: '1M', analysis }));
    assert.equal(none.kpis.spent, 336, 'no filter: every row');
  } finally { FV._vendors.useSymbols(undefined); }
});

// One forged sentence in place i; the other two are the template's.
const forge = (B, f, i, text) => {
  const s = B.sentences.map(x => ({ text: x.text, entities: [] })); s[i] = { text, entities: [] };
  return MBM.validate({ sentences: s }, B, f);
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOWS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

test('the AI check fails real figures in the wrong place, wrong counts, dates and weekdays', () => {
  for (const mode of ['cycle', 'month']) {
    const { B, fmt: f } = briefFor(fake(), { mode, currency: 'GBP', locale: 'en-GB' });
    assert.ok(B.safe && B.bills.length >= 2 && B.mood.known, `${mode}: the fake period has bills, safe to spend and a usual`);
    const M = f.money, T = B.sentences.map(s => s.text);
    const next = new Date(B.cycle.next * 864e5), today = new Date(B.anchor * 864e5);
    const nextDate = `${next.getUTCDate()} ${MONTHS[next.getUTCMonth()]}`;
    const up = B.movers.find(x => x.delta >= 5);
    const still = B.cats.map(x => x.c).find(c => !B.movers.slice(0, 5).some(m => m.k === c));
    const wrongCount = [B.cycle.day + 1, B.cycle.len, B.cycle.daysLeft].find(v => v !== B.bills.length && v > 1 && v < 13);
    const bad = {
      'the bills total as spent': [0, `You've spent ${M(B.billsTotal)} so far.`],
      'spent as safe a day': [2, `About ${M(B.spent)} a day is free to spend.`],
      'safe a day as the bills total': [2, `${B.bills.length} bills worth ${M(B.safe.perDay)} are still to go.`],
      'a wrong bill count that is another real count': [2, `${wrongCount} bills worth ${M(B.billsTotal)} are still to go.`],
      'the end of the period on today\'s date': [2, `${B.bills.length} bills are due before ${mode === 'cycle' ? 'payday on' : 'the month ends on'} ${today.getUTCDate()} ${MONTHS[next.getUTCMonth()]}.`],
      'the wrong weekday': [2, `${B.bills.length} bills are due before ${DOWS[(next.getUTCDay() + 2) % 7]} ${nextDate}.`],
      'a wrong number of days left': [0, `You have ${B.cycle.daysLeft + 4} days left.`],
    };
    if (still && up) bad['a mover\'s change on a category that did not move'] = [1, `${still} is up ${M(up.delta)} on usual.`];
    for (const [name, [i, s]] of Object.entries(bad)) {
      const v = forge(B, f, i, s);
      assert.equal(v.replaced, 1, `${mode}: ${name}: ${s}`);
      assert.equal(v.sentences[i].text, T[i]);
    }
    // Faithful rewordings still pass.
    const good = [
      [0, `So far you have spent ${M(B.spent)}.`],
      [2, `After ${M(B.billsTotal)} of bills, about ${M(B.safe.perDay)} a day is free to spend.`],
      [2, `${B.bills.length} bills worth ${M(B.billsTotal)} are due before ${DOWS[next.getUTCDay()]} ${nextDate}.`],
      [2, `${B.bills.length} bills worth ${M(B.billsTotal)} are due in the next ${B.cycle.daysLeft} days.`],
      [1, `${up.k} is ${M(up.delta)} higher than usual.`],
    ];
    for (const [i, s] of good) assert.equal(forge(B, f, i, s).replaced, 0, `${mode}: ${s}`);
  }
});

test('a thousands separator does not hide the direction of the pace gap', () => {
  const { B: B0, fmt: f } = briefFor(fake(), { mode: 'cycle', currency: 'GBP', locale: 'en-GB' });
  // The same brief with a bigger gap: £1,147 OVER usual.
  const B = Object.assign({}, B0, { mood: Object.assign({}, B0.mood, { diff: 1147.2, known: true }), usual: r2(B0.spent - 1147.2) });
  assert.equal(forge(B, f, 0, `You've spent ${f.money(B.spent)} since payday, ${f.money(1147.2)} under your usual pace.`).replaced, 1);
  assert.equal(forge(B, f, 0, `You've spent ${f.money(B.spent)} since payday, ${f.money(1147.2)} over your usual pace.`).replaced, 0);
});

// The scale data only becomes an analysis after the finance pipeline runs, so
// write it to a temporary folder first (writeScaleFinance) and read it back.
async function scaleAnalysis() {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { writeScaleFinance } = await import('../tools/make-fake-finance.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'fin-scale-'));
  try {
    await writeScaleFinance(dir, { days: 730, seed: 11, today: '2026-10-02' });
    return JSON.parse(readFileSync(join(dir, 'finance', '_system', 'analysis.json'), 'utf8'));
  } finally { try { rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); } catch { /* best effort */ } }
}

test('every template sentence passes its own check on every day (the faller below the top five, no usual yet)', async () => {
  const scale = await scaleAnalysis();
  const sets = [['fake', fake(), 75], ['scale', scale, 120]];
  let n = 0;
  for (const [name, a, days] of sets) {
    const last = a.transactions.reduce((m, t) => (t.d > m ? t.d : m), '').slice(0, 10);
    for (let k = 0; k < days; k++) {
      const today = new Date(Date.parse(last) - k * 864e5).toISOString().slice(0, 10);
      const sub = Object.assign({}, a, { today, transactions: a.transactions.filter(t => t.d.slice(0, 10) <= today) });
      for (const mode of ['cycle', 'month']) {
        const { B, fmt: f } = briefFor(sub, { mode, currency: 'GBP', locale: 'en-GB' });
        const v = MBM.validate({ sentences: B.sentences.map(s => ({ text: s.text, entities: s.entities })) }, B, f);
        assert.equal(v.replaced, 0, `${name} ${today} ${B.mode}: ${B.sentences.map(s => s.text).join(' | ')}`);
        n++;
      }
    }
  }
  assert.ok(n >= 390);
  // The faller sentence 2 names is in the facts an AI sees, even when it ranks 7th.
  const sub = Object.assign({}, scale, { today: '2026-07-31', transactions: scale.transactions.filter(t => t.d.slice(0, 10) <= '2026-07-31') });
  const { B, facts } = briefFor(sub, { mode: 'month', currency: 'GBP', locale: 'en-GB' });
  const down = B.movers.find(x => x.delta <= -5);
  assert.ok(B.movers.indexOf(down) >= 5, 'this day has the faller below the top five');
  assert.ok(facts.movers.some(x => x.category === down.k), 'the faller is in the facts');
});
