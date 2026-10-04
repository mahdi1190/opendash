// Home's "Payday & safe to spend" widget (WIDGETS_CATALOGUE.md 3.14):
//   - the pure part (src/app/12-home-spendable-logic.js) alone in a VM: the glance URL,
//     money and day formatting, the payday words, the lowest point, the sparkline, the
//     model, what a screen reader hears (amounts in full, or "hidden");
//   - the route's numbers carried through: financeGlance (lib/finance/glance.mjs) on a
//     synthetic analysis gives B.safe, B.cycle and B.bills from MBM.compute, and the
//     widget's model shows exactly those;
//   - in the Home bundle: registered, available, sizes and defaults as the server has
//     them; the S/M/L bodies; Hide amounts; nothing that could move money.
// Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { HOME_WIDGETS, HOME_WIDGET_PREFS } from '../lib/home-topbar.mjs';
import { MBM, briefFor } from '../lib/finance/brief.mjs';
import { financeGlance, MAX_CUSHION } from '../lib/finance/glance.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));
const { dnum, diso } = MBM.util;

/* ───────── the pure part, alone in a VM ───────── */
const logic = vm.createContext({});
vm.runInContext(read('12-home-spendable-logic.js'), logic, { filename: '12-home-spendable-logic.js' });
const L = (fn, ...args) => plain(vm.runInContext(fn, logic)(...plain(args)));
const fmt = vm.runInContext('hspFmt("GBP", "en-GB")', logic);
const model = (g, o) => plain(vm.runInContext('hspModel', logic)(g, Object.assign({ fmt }, o)));

test('the glance URL: the server defaults when nothing is set, the cushion clamped, payday = cycle', () => {
  assert.equal(L('hspQuery', { cushion: null, mode: 'auto' }), '/api/finance/glance');
  assert.equal(L('hspQuery', {}), '/api/finance/glance');
  assert.equal(L('hspQuery', null), '/api/finance/glance');
  assert.equal(L('hspQuery', { cushion: 250, mode: 'payday' }), '/api/finance/glance?cushion=250&mode=cycle');
  assert.equal(L('hspQuery', { cushion: 0, mode: 'month' }), '/api/finance/glance?cushion=0&mode=month');
  assert.equal(L('hspQuery', { cushion: -5 }), '/api/finance/glance?cushion=0');
  assert.equal(L('hspQuery', { cushion: 12.345 }), '/api/finance/glance?cushion=12.35');
  assert.equal(L('hspQuery', { cushion: 9e9 }), `/api/finance/glance?cushion=${MAX_CUSHION}`);
  assert.equal(L('hspQuery', { cushion: 'x', mode: 'weird' }), '/api/finance/glance');
  assert.equal(vm.runInContext('HSP_CUSHION_MAX', logic), MAX_CUSHION, 'the same ceiling as the route');
});

test('money is written as the Finances Overview writes it', () => {
  assert.equal(fmt.money(23.4), '£23');
  assert.equal(fmt.money(1234.5), '£1,235');
  assert.equal(fmt.money(-90), '−£90', 'a real minus sign');
  assert.equal(fmt.money(-0.001), '£0');
  assert.equal(fmt.money2(18), '£18.00');
  assert.equal(fmt.money2(-7.5), '−£7.50');
  assert.equal(fmt.delta(940), '+£940');
  assert.equal(fmt.delta(-90), '−£90');
  assert.equal(fmt.delta(0.2), '£0');
  const eur = vm.runInContext('hspFmt("EUR", "de-DE")', logic);
  assert.match(eur.money(1234), /^1\.234\s?€$/);
  const junk = vm.runInContext('hspFmt("not a currency", "xx-nope")', logic);
  assert.equal(junk.cur, 'GBP');
  // The page's model writes the same (MBM.makeFmt), so the widget and Finances agree.
  const mf = MBM.makeFmt ? MBM.makeFmt('GBP', 'en-GB') : null;
  if (mf && typeof mf.money === 'function') assert.equal(fmt.money(1234.5), mf.money(1234.5));
});

test('days, payday words, the lowest point and the bill tile', () => {
  const T = '2026-10-14';                                          // a Wednesday
  assert.equal(L('hspDayLabel', T, T), 'Today');
  assert.equal(L('hspDayLabel', '2026-10-15', T), 'Tomorrow');
  assert.equal(L('hspDayLabel', '2026-10-13', T), 'Yesterday');
  assert.equal(L('hspDayLabel', '2026-10-17', T), 'Sat 17');
  assert.equal(L('hspDayLabel', '2026-10-24', T), '24 Oct');
  assert.equal(L('hspDayLabel', 'soon', T), 'soon');
  assert.equal(L('hspPaydayText', { daysLeft: 9, mode: 'cycle' }), 'Payday in 9 days');
  assert.equal(L('hspPaydayText', { daysLeft: 1, mode: 'cycle' }), 'Payday tomorrow');
  assert.equal(L('hspPaydayText', { daysLeft: 0, mode: 'cycle', late: true }), 'Payday any day now');
  assert.equal(L('hspPaydayText', { daysLeft: 9, mode: 'month' }), 'Month ends in 9 days');
  assert.equal(L('hspPaydayText', { daysLeft: 1, mode: 'month' }), 'Last day of the month');
  assert.equal(L('hspPaydayText', null), '');
  assert.deepEqual(L('hspLowText', { amount: 210, date: '2026-10-24' }, T, null, 'en-GB'), { amount: '£210', when: 'the 24th', text: 'Lowest £210 on the 24th' });
  assert.equal(L('hspLowText', { amount: 210, date: '2026-10-22' }, T, null, 'en-GB').when, 'the 22nd');
  assert.equal(L('hspLowText', { amount: 210, date: '2026-10-11' }, T, null, 'en-GB').when, 'the 11th');
  assert.equal(L('hspLowText', { amount: 50, date: '2026-11-02' }, T, null, 'en-GB').text, 'Lowest £50 on 2 Nov', 'another month: the date');
  assert.equal(L('hspLowText', null, T), '');
  // An account named after its holder shows its kind; capitals read in title case.
  assert.equal(L('hspAccountName', 'MR SAM A TAYLOR', 'current', 'Sam'), 'Current account');
  assert.equal(L('hspAccountName', 'MR SAM A TAYLOR', 'Transaction', 'Sam Taylor'), 'Transaction account');
  assert.equal(L('hspAccountName', 'Sam’s pot', '', 'Sam'), 'Account');
  assert.equal(L('hspAccountName', 'SAMSUNG REWARDS', 'savings', 'Sam'), 'Samsung Rewards', 'a word, not a part of one');
  assert.equal(L('hspAccountName', 'Everyday', 'current', 'Sam'), 'Everyday');
  assert.equal(L('hspAccountName', '', 'savings account', ''), 'Savings account');
  const named = model({ status: 'ok', today: T, payday: { daysLeft: 5, mode: 'month' }, safe: { perDay: 1, left: 5, cushion: 100 }, bills: [],
    balance: { total: 10, accounts: [{ acct: 'a', name: 'MR SAM A TAYLOR', kind: 'current', balance: 10, inTotal: true }] } }, { today: T, userName: 'Sam Taylor' });
  assert.deepEqual([named.balance.accounts[0].name, named.balance.accounts[0].kind], ['Current account', ''], 'no kind twice');
  assert.equal(L('hspInitial', 'pocket mobile'), 'P');
  assert.equal(L('hspInitial', '  123 Gym'), '1');
  assert.equal(L('hspInitial', '***'), '?');
});

test('the sparkline: x by date (gaps keep their width), flat lines centred, fewer than 2 days = none', () => {
  assert.equal(L('hspSpark', [], 300, 56), null);
  assert.equal(L('hspSpark', [{ date: '2026-10-01', v: 5 }], 300, 56), null);
  const s = L('hspSpark', [{ date: '2026-10-03', v: 100 }, { date: '2026-10-01', v: 300 }, { date: '2026-10-11', v: 200 }, { date: 'bad', v: 1 }], 300, 56);
  assert.equal(s.n, 3);
  assert.deepEqual(s.xy.map(p => p[0]), [0, 60, 300], 'sorted by date, x proportional to the day');
  assert.equal(s.xy[0][1], 3, 'the highest point at the top (3 px pad)');
  assert.equal(s.xy[1][1], 53, 'the lowest at the bottom');
  assert.equal(s.min, 100); assert.equal(s.max, 300);
  assert.ok(s.line.startsWith('M0,3L60,53')); assert.ok(s.area.endsWith('L300,56L0,56Z'));
  const flat = L('hspSpark', [{ date: '2026-10-01', v: 50 }, { date: '2026-10-02', v: 50 }], 100, 10);
  assert.equal(flat.xy[0][1], 5, 'a flat line sits in the middle');
});

/* ───────── the route's numbers, carried through ───────── */
// Salary on the 25th (the Friday before, at a weekend), rent on the 1st, a phone bill on the
// 18th, a streaming bill on the 20th, groceries, coffee; a balance and its history.
function synth({ today = '2026-10-14', months = 4, salary = true, balance = 1500, balances = true } = {}) {
  const tx = []; const T = dnum(today); const start = T - months * 31 - 10;
  const add = (n, m, c, a) => tx.push({ d: diso(n), m, c, a, acct: 'acc-1', memo: m.toUpperCase(), k: 'k' + tx.length });
  for (let n = start; n <= T; n++) {
    const d = new Date(n * 864e5); const dom = d.getUTCDate(); const wd = (n + 3) % 7;
    const pay = (() => { const y = d.getUTCFullYear(), mo = d.getUTCMonth(); let p = dnum(`${y}-${String(mo + 1).padStart(2, '0')}-25`); while ((p + 3) % 7 >= 5) p--; return p; })();
    if (salary && n === pay) add(n, 'Northwind Labs', 'Income', 2500);
    if (dom === 1) add(n, 'Oak Lane Lettings', 'Housing', -900);
    if (dom === 18) add(n, 'Pocket Mobile', 'Bills & utilities', -18);
    if (dom === 20) add(n, 'StreamCo', 'Entertainment', -11);
    const rnd = k => Math.abs(Math.sin(n * k) * 43758.5453) % 1;
    if (rnd(78.233) < 0.25) add(n, 'Green Basket', 'Groceries', -Math.round(10 + rnd(12.9898) * 60));
    if (wd < 5) add(n, 'Bean There Coffee', 'Eating out', -3);
  }
  const history = []; for (let n = T - 90; n <= T; n += 2) history.push({ date: diso(n), total: balance + (T - n) * 3, accounts: { 'acc-1': balance + (T - n) * 3, 'sav-1': 5000 } });
  return { today, transactions: tx, exclude_from_spending: ['Income', 'Internal transfers', 'Savings & investments'],
    balances: balances ? [{ acct: 'acc-1', name: 'Current', kind: 'current', balance, currency: 'GBP', asOf: today }, { acct: 'sav-1', name: 'Rainy day', kind: 'savings', balance: 5000, currency: 'GBP', asOf: today }] : [],
    balance_history: balances ? history : [], recurring: [] };
}

test('the widget shows the Overview\'s own numbers: B.safe, B.cycle and B.bills from MBM.compute', () => {
  const a = synth();
  for (const opts of [{}, { cushion: 250 }, { mode: 'month' }, { cushion: 0, mode: 'cycle' }]) {
    const g = plain(financeGlance(a, opts));
    const { B } = briefFor(a, opts);
    const m = model(g, { today: '2026-10-14', maxBills: 5 });
    const tag = JSON.stringify(opts);
    assert.equal(m.hero.kind, 'safe', tag);
    assert.equal(m.hero.value, B.safe.perDay, `${tag}: a day = B.safe.perDay`);
    assert.equal(m.left, B.safe.left, `${tag}: left after bills = B.safe.left`);
    assert.equal(m.cushion, B.safe.cushion, `${tag}: the cushion`);
    assert.equal(m.daysLeft, B.cycle.daysLeft, `${tag}: days to payday = B.cycle.daysLeft`);
    assert.equal(m.paydayDate, diso(B.cycle.next), `${tag}: payday = B.cycle.next`);
    assert.equal(m.month, B.cycle.mode === 'month', tag);
    assert.equal(m.billCount, B.bills.length, `${tag}: every bill before payday`);
    const total = Math.round(B.bills.reduce((s, b) => s + b.amount, 0) * 100) / 100;
    assert.equal(m.billsTotal, total, `${tag}: bills total`);
    assert.deepEqual(m.bills.map(b => b.amount), B.bills.slice(0, 5).map(b => b.amount), tag);
  }
  // Cycle mode with a salary on the 25th: payday words and both bills before it.
  const g = plain(financeGlance(a, {}));
  const m = model(g, { today: '2026-10-14' });
  assert.equal(m.month, false);
  assert.match(m.paydayText, /^Payday in \d+ days$/);
  assert.deepEqual(m.bills.map(b => [b.name, b.date]), [['Pocket Mobile', '2026-10-18'], ['StreamCo', '2026-10-20']]);
  assert.deepEqual(m.bills.map(b => b.day), ['Sun 18', 'Tue 20'], 'within the week: the weekday');
  assert.ok(m.bills.every(b => b.initial.length === 1 && b.key.includes('|')));
  assert.equal(m.low.text, 'Lowest £1,471 on the 20th', 'the balance after each bill, nothing else spent');
  assert.equal(m.balance.total, 1500); assert.equal(m.balance.change, -90);
  assert.deepEqual(m.balance.accounts.map(x => [x.name, x.inTotal]), [['Current', true], ['Rainy day', false]]);
  assert.equal(m.stale, null);
});

test('no balance: the bills before payday instead; no bills either: the days left', () => {
  const g = plain(financeGlance(synth({ balances: false }), {}));
  const m = model(g, { today: '2026-10-14' });
  assert.equal(m.hero.kind, 'bills');
  assert.equal(m.hero.value, 29);
  assert.equal(m.hero.unit, 'of bills before payday');
  assert.equal(m.balance, null); assert.equal(m.low, null); assert.equal(m.left, null);
  const none = model({ status: 'ok', today: '2026-10-14', payday: { daysLeft: 3, mode: 'month', next: '2026-10-31' }, bills: [], upcoming: [{ m: 'Oak Lane Lettings', name: 'Oak Lane Lettings', date: '2026-11-01', amount: 900 }] }, { today: '2026-10-28' });
  assert.equal(none.hero.kind, 'none'); assert.equal(none.hero.days, 3); assert.equal(none.hero.unit, 'days left this month');
  assert.equal(none.next.name, 'Oak Lane Lettings', 'the first bill after the month ends');
  assert.equal(L('hspModel', null), null);
  assert.equal(L('hspModel', { status: 'empty' }), null);
});

test('more than 5 bills: 5 shown, the rest counted; data over 3 days old is flagged', () => {
  const bills = Array.from({ length: 7 }, (_, i) => ({ m: 'Acme ' + i, name: 'Acme ' + i, date: `2026-10-${String(15 + i).padStart(2, '0')}`, amount: 10 + i }));
  const g = { status: 'ok', today: '2026-10-14', payday: { daysLeft: 11, mode: 'cycle', next: '2026-10-25' }, safe: { perDay: 20, left: 220, cushion: 100 }, bills, billsTotal: 91, staleDays: 4 };
  const m = model(g, { today: '2026-10-14', maxBills: 5 });
  assert.equal(m.bills.length, 5); assert.equal(m.more, 2); assert.equal(m.billCount, 7);
  assert.deepEqual(m.stale, { days: 4, text: 'Bank data 4 days old' });
  assert.equal(model(Object.assign({}, g, { staleDays: 3 }), { today: '2026-10-14' }).stale, null, '3 days is fine');
  // Two bills from one merchant on one day keep distinct, stable keys.
  const twice = model(Object.assign({}, g, { bills: [bills[0], bills[0]] }), { today: '2026-10-14' });
  assert.notEqual(twice.bills[0].key, twice.bills[1].key);
});

test('a screen reader hears amounts in full, or "hidden" for every amount', () => {
  const g = plain(financeGlance(synth(), {}));
  const m = vm.runInContext('hspModel', logic)(g, { today: '2026-10-14', fmt });
  const say = plain(vm.runInContext('hspSay', logic)(m, fmt, false));
  assert.match(say.hero, /^Safe to spend: £\d+ a day for \d+ days, until payday, after £29 of bills and a £100 cushion\.$/);
  assert.match(say.spark, /^Balance over the last \d+ days: .* now £1,500, down £90 in 30 days\. Lowest £\S+, highest £\S+\.$/);
  assert.match(say.low, /£1,471 on the 20th/);
  const hid = plain(vm.runInContext('hspSay', logic)(m, fmt, true));
  for (const k of ['hero', 'left', 'spark', 'low']) {
    assert.ok(!/£/.test(hid[k]), `${k}: no amount while hidden`);
    assert.match(hid[k], /hidden/, k);
  }
});

test('the gallery sample is a whole, synthetic glance the model accepts', () => {
  const g = L('hspSample', { today: '2026-01-15', money: { perDay: 23, daysLeft: 9, bills: [{ name: 'Phone', day: '2026-01-17', amount: 18 }, { name: 'Gym', day: '2026-01-20', amount: 30 }] } });
  const m = model(g, { today: '2026-01-15' });
  assert.equal(m.hero.value, 23); assert.equal(m.daysLeft, 9); assert.equal(m.billCount, 2);
  assert.equal(m.balance.accounts.length, 2); assert.equal(g.balSeries.length, 60);
  assert.ok(L('hspSpark', g.balSeries, 300, 56));
  assert.equal(model(L('hspSample', null), {}).hero.kind, 'safe', 'no kit: still a sample');
});

/* ───────── in the Home bundle ───────── */
const TODAY = '2026-10-14';
function fakeEl() {
  const attrs = {};
  return { dataset: {}, innerHTML: '', textContent: '', disabled: false, isConnected: true, style: {}, getAttribute: (k) => attrs[k] ?? null,
    setAttribute: (k, v) => { attrs[k] = String(v); }, removeAttribute: (k) => { delete attrs[k]; }, hasAttribute: (k) => k in attrs,
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} }, appendChild() {}, querySelector: () => null, querySelectorAll: () => [] };
}
function bundle(st) {
  const box = {
    console, state: st, APP_CONFIG: { locale: 'en-GB', currency: 'GBP', features: {} }, CSS: { escape: (s) => s }, TextEncoder,
    window: { addEventListener() {} },
    document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => fakeEl(), body: { appendChild() {} }, hidden: false },
    registerSection() {}, render() {}, saveData() {}, saveUI() { box._ui = (box._ui || 0) + 1; }, undo() {},
    toast() {}, todayStr: () => TODAY, fmtDate: (d) => d.toISOString().slice(0, 10), setTimeout: () => 0, clearTimeout() {},
    esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    escAttr: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    icon: (n) => `<i data-i="${n}"></i>`,
  };
  vm.createContext(box);
  const files = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n)).sort().map(read);
  vm.runInContext(files.join('\n'), box, { filename: 'home-spendable-bundle.js' });
  return { box, run: (code) => vm.runInContext(code, box), json: (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, box)) };
}
const baseState = () => ({ custom: [], statuses: {}, deleted: {}, pinned: {}, home: {}, homeUI: {} });

test('in the bundle: registered, available, sizes and defaults as the server has them', () => {
  const { json } = bundle(baseState());
  const d = json('homeWidgetDefs().filter(d => d.id === "spendable").map(d => ({ sizes: d.sizes, defaultSize: d.defaultSize, defaultHidden: d.defaultHidden, defaults: d.defaults, available: d.available(), settings: typeof d.settings, title: d.title, gate: d.gate, group: d.group }))')[0];
  const srv = HOME_WIDGETS.find(w => w.id === 'spendable');
  assert.equal(d.available, true);
  assert.deepEqual(d.sizes, srv.sizes); assert.equal(d.defaultSize, 's'); assert.equal(d.defaultHidden, true);
  assert.equal(d.title, srv.title); assert.equal(d.gate, 'finance'); assert.equal(d.group, 'money');
  assert.deepEqual(d.defaults, { cushion: null, mode: 'auto', accounts: true });
  assert.deepEqual(Object.keys(d.defaults).sort(), Object.keys(HOME_WIDGET_PREFS.spendable.properties).sort());
  assert.equal(d.settings, 'function');
  // The default cushion is the Overview's (MBM.CUSHION).
  const { run } = bundle(baseState());
  assert.equal(run('HSP_DEFAULT_CUSHION'), MBM.CUSHION);
});

test('in the bundle: the S, M and L bodies, and Hide amounts', () => {
  const st = baseState();
  const { box, run } = bundle(st);
  box.__g = plain(financeGlance(synth(), {}));
  const html = (size, prefs) => run(`(() => { const f = hspFmt('GBP', 'en-GB'); const m = hspModel(__g, { today: '${TODAY}', fmt: f, maxBills: 5 }); return _hspBodyHtml(m, '${size}', f, ${JSON.stringify(prefs || { accounts: true })}, homeAmountsHidden()); })()`);
  const s = html('s');
  assert.match(s, /class="hsp-hero" data-go="overview"/);
  assert.match(s, /a day</); assert.match(s, /Payday in \d+ days/);
  assert.ok(!/hsp-bill/.test(s), 'S: no bills');
  const m = html('m');
  assert.equal((m.match(/class="hsp-bill /g) || []).length, 2);
  assert.match(m, /data-m="Pocket Mobile"/);
  assert.match(m, /left after bills/);
  assert.ok(!/hsp-bal/.test(m), 'M: no balance');
  const l = html('l');
  assert.match(l, /class="hsp-bal"/); assert.match(l, /<svg viewBox="0 0 300 56"/); assert.match(l, /Lowest <b class="num">/);
  assert.equal((l.match(/class="hsp-ac"/g) || []).length, 2);
  assert.match(l, /Rainy day.*not counted/);
  assert.ok(!/hsp-ac"/.test(html('l', { accounts: false })), 'the Accounts setting hides the rows');
  // Hide amounts: a UI key (saveUI, not saveData), every amount blurred and spoken as "hidden".
  assert.equal(run('homeSetAmountsHidden(true)'), true);
  assert.equal(st.homeUI.hideAmounts, true); assert.equal(box._ui, 1);
  const h = html('l');
  assert.ok((h.match(/hg-amt is-hidden/g) || []).length >= 8, 'every amount is wrapped');
  assert.ok(!/aria-label="[^"]*£/.test(h), 'no amount in a spoken label while hidden');
  assert.match(h, /Balance hidden\./);
  run('homeSetAmountsHidden(false)');
  assert.equal(st.homeUI.hideAmounts, undefined);
});

test('nothing here can move money or write data', () => {
  const src = read('12-home-w-spendable.js') + read('12-home-spendable-logic.js');
  const posts = [...src.matchAll(/fetch\('([^']+)'[^)]*method: 'POST'/g)].map(x => x[1]);
  assert.deepEqual(posts, ['/api/finance/update'], 'the only POST is the read-only bank sync');
  assert.ok(!/saveData\(|homeOps\(|homeAction\(|apiAction|\/api\/actions/.test(src), 'no data writes');
  assert.ok(!/payment|transfer\(|pay\(/i.test(src.replace(/payday|Payday|pay cycle|paid/g, '')), 'no payment words');
});
