// The money story (owner: MS): its pure model (src/finance/25-money-story-model.js,
// evaluated with the money brief's model by lib/finance/money-story.mjs exactly as
// the server uses it), the narration script from a fixture, the numbers against the
// money model (MBM) and the page's own build, what an AI may see (aggregates only),
// the check of an AI's lines, the Story engine hooks and the page wiring, and
// GET /api/finance/story with a mocked Claude. All data is synthetic.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';
import { MBM, MSM, storyFor, storyPrompt, aiStory, STORY_SCHEMA, groupsFor } from '../lib/finance/money-story.mjs';
import { loadFinanceView } from '../tools/finance-numbers.mjs';
import { buildFakeData } from '../tools/make-fake-data.mjs';

const { dnum, diso } = MBM.util;
const fmt = MBM.makeFmt('GBP', 'en-GB');
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.006, `${msg}: ${a} vs ${b}`);

// A small synthetic analysis: salary on the 25th (the Friday before a weekend), rent on
// the 1st, a phone bill on the 18th, groceries on irregular days, a coffee every weekday,
// one big one-off purchase on 14 Sep, a quiet stretch of no spending 19-22 Sep.
// today = 2026-10-14.
function synth({ today = '2026-10-14', months = 5, salary = true } = {}) {
  const tx = []; const T = dnum(today); const start = T - months * 31 - 10;
  const add = (n, m, c, a, memo) => tx.push({ d: diso(n), m, c, a, acct: 'acc-1', memo: memo || m.toUpperCase(), k: 'k' + tx.length });
  const quiet = n => n >= dnum('2026-09-19') && n <= dnum('2026-09-22');
  for (let n = start; n <= T; n++) {
    const d = new Date(n * 864e5); const dom = d.getUTCDate(); const wd = (n + 3) % 7;
    const pay = (() => { const y = d.getUTCFullYear(), mo = d.getUTCMonth(); let p = dnum(`${y}-${String(mo + 1).padStart(2, '0')}-25`); while ((p + 3) % 7 >= 5) p--; return p; })();
    if (salary && n === pay) add(n, 'Northwind Labs', 'Income', 2500, 'BGC NORTHWIND');
    if (dom === 1) add(n, 'Oak Lane Lettings', 'Housing', -900, 'SO OAK LANE');
    if (dom === 18) add(n, 'Pocket Mobile', 'Bills & utilities', -18, 'DD POCKET MOBILE');
    if (quiet(n)) continue;
    const rnd = k => Math.abs(Math.sin(n * k) * 43758.5453) % 1;
    if (rnd(78.233) < 0.3) add(n, 'Green Basket', 'Groceries', -Math.round(10 + rnd(12.9898) * 60));
    if (wd < 5) add(n, 'Bean There Coffee', 'Eating out', -3);
  }
  add(dnum('2026-09-14'), 'Gadget Hub', 'Shopping', -249.99);
  const history = []; for (let n = T - 60; n <= T; n += 2) history.push({ date: diso(n), total: 1500 + (T - n) * 3, accounts: { 'acc-1': 1500 + (T - n) * 3 } });
  return { today, transactions: tx, exclude_from_spending: ['Income', 'Internal transfers', 'Savings & investments'],
    balances: [{ acct: 'acc-1', name: 'Current', kind: 'current', balance: 1500, currency: 'GBP', asOf: today }], balance_history: history, recurring: [] };
}
const SEP = { period: 'month', ref: '2026-09-10', currency: 'GBP', locale: 'en-GB' };

test('the server evaluates the page\'s own model files (one source of truth), pure', () => {
  for (const f of ['build', 'script', 'facts', 'validate', 'beats', 'periodOf', 'defaultPeriod']) assert.equal(typeof MSM[f], 'function', f);
  const src = read('src/finance/25-money-story-model.js');
  assert.match(src.split('\n')[0], /@part 25-money-story-model\.js .*OWNER: MS/);
  assert.doesNotMatch(src.replace(/\/\/.*$/gm, ''), /\bdocument\.|\bwindow\.|getComputedStyle|£|'en-GB'/, 'pure: no DOM, no hard-coded currency or locale');
  assert.deepEqual(MSM.BEATS, ['intro', 'spent', 'topcat', 'race', 'big', 'bills', 'kept', 'facts', 'close']);
  assert.ok(!MSM.AI_BEATS.includes('big'), 'the biggest purchase (one transaction) is never reworded');
});

test('the period: a month is the Overview\'s month mode; a week starts on the configured day; the 1st-3rd tell last month', () => {
  const A = dnum('2026-10-14');
  const m = MSM.periodOf('month', dnum('2026-09-10'), A, A - 200);
  assert.deepEqual(m, MBM.cycleOf(dnum('2026-09-30'), 'month', null, A - 200));
  assert.equal(diso(m.start), '2026-09-01'); assert.equal(m.len, 30); assert.equal(m.day, 29);
  const cur = MSM.periodOf('month', A, A, A - 200);
  assert.equal(cur.day, 13); assert.equal(cur.daysLeft, 18);
  const w = MSM.periodOf('week', dnum('2026-10-14'), A, A - 200);
  assert.equal(diso(w.start), '2026-10-12', 'Monday'); assert.equal(w.day, 2); assert.equal(w.prev.length, 6);
  assert.equal(diso(MSM.periodOf('week', A, A, A - 200, 'Sun').start), '2026-10-11', 'Sunday weeks');
  assert.deepEqual(MSM.defaultPeriod(dnum('2026-10-02')), { period: 'month', ref: dnum('2026-09-30') });
  assert.deepEqual(MSM.defaultPeriod(dnum('2026-10-04')), { period: 'month', ref: dnum('2026-10-04') });
});

test('the script from a fixture: September, read aloud beat by beat', () => {
  const { S, template: L } = storyFor(synth(), SEP);
  assert.equal(S.period, 'month'); assert.equal(diso(S.start), '2026-09-01'); assert.equal(diso(S.to), '2026-09-30'); assert.equal(S.thisPeriod, false);
  assert.deepEqual(MSM.beats(S, { lines: L }), MSM.BEATS, 'every beat has something to show');
  assert.equal(L.intro, "Here's your September in money.");
  assert.equal(L.spent, `You spent ${fmt.money(S.spent)} in September, ${fmt.money(Math.abs(S.mood.diff))} ${S.mood.diff < 0 ? 'less' : 'more'} than a usual month.`);
  assert.equal(L.topcat, `Groceries was your biggest everyday category at ${fmt.money(S.topcat.v)}, ${Math.round(S.topcat.share * 100)}% of all your spending, mostly at Green Basket.`);
  assert.equal(L.big, 'Your biggest one-off purchase was £249.99 at Gadget Hub, on Monday 14 September.');
  assert.match(L.race, /^Green Basket took the top spot at £\d[\d,]*, ahead of (Gadget Hub|Bean There Coffee) and (Gadget Hub|Bean There Coffee)\.$/);
  assert.equal(L.bills, 'Coming up: 2 bills worth £918 in the next 30 days, starting with Pocket Mobile on Sunday.', 'a bill within the week is named by its weekday');
  assert.equal(L.kept, `In September, £2,500 came in and you kept ${fmt.money(2500 - S.spent)} of it: a savings rate of ${Math.round((2500 - S.spent) / 2500 * 100)}%.`);
  // The regular is the coffee shop: one clause.
  assert.equal(L.facts, `A few fun facts: ${S.facts.coffees.n} coffees, all of them at Bean There Coffee and a 4-day no-spend streak.`);
  assert.equal(L.close, "That's September. See you next month.");
  // The quiet stretch is the streak; coffee shops are found by FinSymbols' coffee scene.
  assert.deepEqual([diso(S.facts.streak.from), diso(S.facts.streak.to), S.facts.streak.len], ['2026-09-19', '2026-09-22', 4]);
  const coffees = synth().transactions.filter(t => t.m === 'Bean There Coffee' && t.d.startsWith('2026-09')).length;
  assert.equal(S.facts.coffees.n, coffees);
  // This month so far and a week read differently.
  const now = storyFor(synth(), { period: 'month', currency: 'GBP', locale: 'en-GB' });
  assert.equal(now.template.intro, "Here's October so far, in money.");
  assert.match(now.template.spent, /^You've spent £[\d,]+ so far this month, /);
  assert.equal(now.template.close, "That's October so far. Check back when the month is done.");
  const lastWeek = storyFor(synth(), { period: 'week', ref: '2026-10-05', currency: 'GBP', locale: 'en-GB' });
  assert.equal(lastWeek.template.intro, "Here's last week in money.");
  const older = storyFor(synth(), { period: 'week', ref: '2026-09-14', currency: 'GBP', locale: 'en-GB' });
  assert.equal(older.template.intro, "Here's the week of 14 Sept in money.".replace('Sept', fmt.short(dnum('2026-09-14')).split(' ')[1]));
});

test('the numbers match the money model: spent, usual, categories, bills, kept', () => {
  const a = synth();
  const input = MBM.fromAnalysis(a);
  const { S } = storyFor(a, SEP);
  // A month is MBM.compute's month mode, anchored on the month's last day.
  const B = MBM.compute(Object.assign({}, input, { anchor: dnum('2026-09-30') }), { mode: 'month', fmt });
  assert.equal(S.spent, B.spent); assert.equal(S.usual, B.usual); assert.deepEqual(S.mood, B.mood);
  assert.deepEqual(S.curve, B.curve); assert.deepEqual(S.pace, B.pace);
  assert.deepEqual(S.cats.map(x => [x.c, x.v]), B.cats.map(x => [x.c, x.v]));
  near(S.kept.inc, B.moneyIn, 'money in'); near(S.kept.kept, B.net, 'kept = net');
  // Bills ahead are the Overview's "Coming up" (today's brief, the next 30 days).
  const today = MBM.compute(input, { mode: 'month', fmt });
  assert.deepEqual(S.bills.map(b => [b.m, b.n, b.amount]), today.upcoming.map(b => [b.m, b.n, b.amount]));
  // Spending is the rows of kind 'spend' in the period, by hand.
  const rows = input.tx.filter(t => t.kind === 'spend' && t.d >= '2026-09-01' && t.d <= '2026-09-30');
  near(S.spent, rows.reduce((s, t) => s + t.s, 0), 'spent by hand');
  assert.equal(S.payments, rows.filter(t => t.s > 0).length);
  // The race ends on each top place's total; the days add up to the period.
  assert.deepEqual(S.race.frames[S.race.frames.length - 1].values, S.merchants.map(x => x.v));
  assert.equal(S.race.frames.length, 30);
  assert.ok(S.merchants.every(x => !MBM.isFixed(x.c)), 'rent and bills sit out of the top places');
  // A week: the same rules over seven days, the usual from up to six earlier weeks.
  const W = storyFor(a, { period: 'week', ref: '2026-10-05', currency: 'GBP', locale: 'en-GB' }).S;
  const wk = input.tx.filter(t => t.kind === 'spend' && t.d >= '2026-10-05' && t.d <= '2026-10-11');
  near(W.spent, wk.reduce((s, t) => s + t.s, 0), 'week spent');
  const prevWeeks = [1, 2, 3, 4, 5, 6].map(k => input.tx.filter(t => t.kind === 'spend' && t.n >= dnum('2026-10-05') - 7 * k && t.n < dnum('2026-10-05') - 7 * k + 7).reduce((s, t) => s + t.s, 0));
  near(W.usual, MBM.util.med(prevWeeks), 'week usual = median of the six weeks before');
});

test('the page builds the same story as the server (buildModel, its recurring list)', () => {
  const FV = loadFinanceView({ currency: 'GBP', locale: 'en-GB' });
  assert.equal(typeof FV._moneyStory.story, 'function');
  for (const [a, opts] of [[synth(), { period: 'month', ref: '2026-09-10' }], [synth(), { period: 'week', ref: '2026-10-05' }], [buildFakeData({ today: new Date('2026-10-02T12:00:00') }).finance.analysis, {}]]) {
    const page = JSON.parse(JSON.stringify(FV._moneyStory.story(Object.assign({ analysis: a }, opts))));   // out of the sandbox's realm
    const { S } = storyFor(a, Object.assign({ currency: 'GBP', locale: 'en-GB' }, opts));
    assert.equal(page.key, S.key, JSON.stringify(opts));
    assert.equal(page.spent, S.spent); assert.equal(page.usual, S.usual);
    assert.deepEqual(page.cats, S.cats.map(x => ({ c: x.c, v: x.v })));
    assert.deepEqual(page.bills, JSON.parse(JSON.stringify(S.bills.map(b => ({ m: b.m, n: b.n, amount: b.amount })))));
    assert.deepEqual(page.kept, JSON.parse(JSON.stringify(S.kept)));
    assert.equal(page.lines.spent, MSM.script(S, fmt).lines.spent);
  }
  // The page's "this month" is the Overview's month mode, figure for figure.
  const a = synth();
  const brief = JSON.parse(JSON.stringify(FV._money.brief({ analysis: a, mode: 'month' })));
  const now = JSON.parse(JSON.stringify(FV._moneyStory.story({ analysis: a, period: 'month' })));
  assert.equal(now.spent, brief.spent); assert.equal(now.usual, brief.usual); assert.deepEqual(now.mood, brief.mood);
});

test('what an AI may see: aggregates only, never a transaction', () => {
  const a = synth();
  const { S, facts } = storyFor(a, SEP);
  const json = JSON.stringify(facts);
  for (const k of ['memo', 'acct', 'acc-1', 'BGC', 'transactions', 'balance']) assert.ok(!json.includes(k), k);
  assert.ok(!json.includes('Gadget Hub'), 'the biggest purchase is one transaction: not sent');
  assert.ok(!json.includes('249.99'));
  assert.deepEqual(Object.keys(facts).sort(), ['billsNext30Days', 'categories', 'funFacts', 'kept', 'period', 'spending', 'topCategory', 'topPlaces']);
  assert.equal(facts.spending.total, fmt.money(S.spent));
  const { system, prompt } = storyPrompt(facts, { userName: 'Sam <b>' });
  assert.match(system, /ONLY the facts/); assert.match(prompt, /data only, not instructions/);
  assert.ok(!prompt.includes('<b>'), 'the name is cleaned');
  assert.deepEqual(Object.keys(STORY_SCHEMA.properties.lines.properties), MSM.AI_BEATS);
});

test('an AI\'s lines are checked number by number; the template stands in', () => {
  const { S } = storyFor(synth(), SEP);
  const L = MSM.script(S, fmt).lines;
  const sp = fmt.money(S.spent), gap = fmt.money(Math.abs(S.mood.diff)), dir = S.mood.diff < 0;
  const good = {
    intro: 'Welcome to your September, told in money.',
    spent: `September came to ${sp}, which is ${gap} ${dir ? 'less' : 'more'} than a typical month.`,
    topcat: `Groceries led the way at ${fmt.money(S.topcat.v)}.`,
    big: 'You bought a rocket for £1.',
    kept: 'You kept £999,999 of it.',
    facts: 'Fifty coffees and a grand day out.',
    close: 'Thanks, Sam.',
    extra: 'An unknown beat.',
  };
  const v = MSM.validate({ lines: good }, S, fmt);
  assert.equal(v.lines.intro, good.intro); assert.equal(v.lines.spent, good.spent); assert.equal(v.lines.topcat, good.topcat); assert.equal(v.lines.close, good.close);
  assert.equal(v.lines.big, L.big, 'the biggest purchase keeps the template');
  assert.equal(v.lines.kept, L.kept, 'an invented amount fails');
  assert.equal(v.lines.facts, L.facts, 'amounts in words fail');
  assert.equal(v.lines.race, L.race, 'missing lines keep the template');
  assert.equal(v.replaced, 2); assert.equal(v.dropped, 2); assert.equal(v.used, 4);
  // The wrong direction fails even with the right figure; markup and links fail.
  const wrong = MSM.validate({ lines: { spent: `You spent ${sp}, ${gap} ${dir ? 'more' : 'less'} than usual.`, intro: '<script>x</script>', close: 'See https://example.com' } }, S, fmt);
  assert.equal(wrong.lines.spent, L.spent); assert.equal(wrong.lines.intro, L.intro); assert.equal(wrong.lines.close, L.close);
  assert.equal(wrong.used, 0);
  // [{beat, text}] works too.
  assert.equal(MSM.validate({ lines: [{ beat: 'intro', text: good.intro }] }, S, fmt).lines.intro, good.intro);
});

test('AI story through a mocked json job: the schema is sent, numbers are checked', async () => {
  const { S, fmt: f, facts } = storyFor(synth(), SEP);
  const calls = [];
  const askJson = async (o) => { calls.push(o); return { json: { lines: { intro: 'September, in money.', kept: 'You kept £1 million.' } }, model: o.model }; };
  const r = await aiStory({ S, fmt: f, facts, askJson });
  assert.equal(calls.length, 1); assert.equal(calls[0].schema, STORY_SCHEMA); assert.equal(calls[0].model, 'claude-haiku-4-5'); assert.equal(calls[0].effort, 'low');
  assert.equal(r.used, 1); assert.equal(r.replaced, 1); assert.equal(r.lines.intro, 'September, in money.');
  assert.ok(!calls[0].prompt.includes('Gadget Hub'));
});

test('merchant groups on the server: name variants as one, money to people by name', () => {
  const tx = [{ m: 'TESCO STORES 3345', c: 'Groceries', a: -10 }, { m: 'Tesco', c: 'Groceries', a: -30 }, { m: 'Sam Lee', c: 'Payments to people', a: -5 }];
  const G = groupsFor(tx);
  assert.equal(G.keyOf('TESCO STORES 3345'), G.keyOf('Tesco'));
  assert.equal(G.label(G.keyOf('Tesco')), 'Tesco');
  assert.equal(G.keyOf('Sam Lee'), 'person:sam lee');
});

test('engine and page wiring: the money kind, the Overview button, the review entries', () => {
  const eng = read('src/app/79-story-engine.js');
  assert.match(eng, /function storyRegisterKind\(kind, src\)/);
  assert.match(eng, /registerKind: storyRegisterKind/);
  assert.match(eng, /src \? await src\.load\(opts\)/, 'a page-built kind loads its own data');
  assert.match(eng, /\(_story\.variant \|\| ''\) === variant/, 'another period is a new story, the same one a no-op');
  assert.match(eng, /STORY_VIEWS\[kind\] && !STORY_SOURCES\[kind\]/, 'built-in kinds cannot be replaced');
  const ui = read('src/finance/26-money-ui.js');
  assert.match(ui, /E\.storyBtn = h\('button', \{[^}]*hidden: !msCanPlay\(\)[^}]*onclick: \(\) => msOpen\(\{\}\)/);
  const ms = read('src/finance/28-money-story.js');
  for (const t of ['ms-intro', 'ms-spent', 'ms-topcat', 'ms-race', 'ms-big', 'ms-bills', 'ms-kept', 'ms-facts', 'ms-close']) assert.ok(ms.includes(`registerBeatType('${t}'`), t);
  assert.match(ms, /registerKind\('money'/);
  assert.match(ms, /realtimeSort: true/, 'the top places race');
  assert.match(ms, /type: 'gauge'/, 'the savings-rate gauge');
  assert.match(ms, /categoryIcon\(tc\.c, \{ size: 'hero', live: 'loop'/, 'the animated category icon');
  assert.match(read('src/app/77-brief-review.js'), /MoneyStory\.weekEntry\(root, r\.from\)/);
  assert.match(read('src/app/79-story-weekly.js'), /MoneyStory\.open\(\{ period: 'week'/);
  // Nothing runs at load in Node: the sandbox has no window.Story and the view still loads.
  const FV = loadFinanceView({ currency: 'GBP', locale: 'en-GB' });
  assert.equal(typeof FV._moneyStory.model.build, 'function');
});

test('the first days of a month: a dismissible Home suggestion through the Suggestions engine', async () => {
  const { loadSuggestLogic } = await import('../lib/suggest-logic.mjs');
  const api = loadSuggestLogic();
  const rule = api.sgRule('money-story');
  assert.ok(rule, 'registered'); assert.equal(rule.area, 'money'); assert.ok(rule.surfaces.includes('home'));
  const offer = { due: true, ref: '2026-09-01', month: 'September', days: 30, key: 'money-story:2026-09' };
  const ctx = (money) => ({ now: { date: '2026-10-02', min: 600, dow: 5 }, money, capabilities: { server: true } });
  const [card] = rule.run(ctx({ ok: true, known: true, offer }));
  assert.deepEqual(api.sgCheckCard(card), [], 'a well-formed card');
  assert.equal(card.key, 'money-story:2026-09', 'one per month: "Not for this one" lasts the month');
  assert.deepEqual(card.primary.action, { type: 'nav', args: { to: 'story', kind: 'money', period: 'month', ref: '2026-09-01' } });
  assert.ok(!card.quick, 'nothing to apply, so no quick tick');
  assert.equal(rule.run(ctx({ ok: false, known: true, offer })).length, 0, 'no money data: no card');
  assert.equal(rule.run(ctx({ ok: true, known: true, offer: { due: false } })).length, 0, 'after the 3rd: no card');
  assert.equal(rule.run(ctx(null)).length, 0);
  // The page side: the nav action opens the money story; the snapshot asks MoneyStory.status().
  assert.match(read('src/app/68-suggest-actions.js'), /a\.kind === 'money' && window\.MoneyStory\) MoneyStory\.open\(/);
  assert.match(read('src/app/68-suggest-context.js'), /window\.MoneyStory\.status\(d\)/);
});

// ── GET /api/finance/story (a real server on a synthetic data folder) ──
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
  dir = mkdtempSync(join(tmpdir(), 'money-story-'));
  const sys = join(dir, 'finance', '_system'); mkdirSync(sys, { recursive: true });
  writeFileSync(join(sys, 'analysis.json'), JSON.stringify(synth()));
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ currency: 'GBP', locale: 'en-GB', brief: { autoOpen: false, ai: false, story: { autoOpen: false } } }));
  const { setMoneyStoryAi } = await import('../server/routes/money-story.mjs');
  setMoneyStoryAi({ aiStatus: async () => ({ available: aiOn, code: aiOn ? null : 'NOT_SIGNED_IN' }), askJson: async (o) => { aiCalls.push(o); return { json: aiAnswer, model: o.model, ms: 3 }; } });
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir]);
});
after(async () => {
  await srv?.close();
  const { setMoneyStoryAi } = await import('../server/routes/money-story.mjs');
  setMoneyStoryAi(null);
  rmSync(dir, { recursive: true, force: true });
});

test('GET /api/finance/story: the template at once, Claude only when asked, cached for the day', async () => {
  const q = '/api/finance/story?period=month&ref=2026-09-10';
  const r = await get(q);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ai.state, 'missing'); assert.equal(aiCalls.length, 0);
  const { S, template } = storyFor(synth(), SEP);
  assert.equal(r.json.key, S.key); assert.deepEqual(r.json.template, template); assert.equal(r.json.start, '2026-09-01');
  assert.equal((await get(q, { 'Sec-Fetch-Site': 'cross-site' })).status, 403, 'cross-site requests are refused');
  assert.equal((await get('/api/finance/story?period=year')).status, 400);
  assert.equal((await get('/api/finance/story?ref=tomorrow')).status, 400);
  aiAnswer = { lines: { intro: 'September, in money.', spent: 'You spent £9,999,999.' } };
  const g = await get(q + '&ai=1');
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.ai.state, 'fresh'); assert.equal(g.json.ai.lines.intro, 'September, in money.'); assert.equal(g.json.ai.lines.spent, template.spent);
  assert.equal(aiCalls.length, 1);
  assert.ok(!aiCalls[0].prompt.includes('Gadget Hub'), 'no single transaction in the prompt');
  assert.ok(existsSync(join(dir, 'finance', '_system', 'money-story-ai.json')));
  const c = await get(q);
  assert.equal(c.json.ai.state, 'cached'); assert.equal(aiCalls.length, 1, 'served from the cache, no call');
  const rg = await get(q + '&regenerate=1');
  assert.equal(rg.json.ai.state, 'fresh'); assert.equal(aiCalls.length, 2);
  aiAnswer = { lines: { intro: '<b>x</b>', spent: 'You spent £1 million.' } };
  assert.equal((await get('/api/finance/story?period=week&ai=1')).status, 502, 'nothing usable: the page keeps its own words');
  aiOn = false;
  const off = await get('/api/finance/story?period=week&regenerate=1');
  assert.equal(off.status, 503); assert.equal(off.json.code, 'NOT_SIGNED_IN');
});
