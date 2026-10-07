// Achievements and recaps (v2.2 wave 5): the pure rules in src/app/71-achievements.js,
// the locked rewards in the registry (unlock, animLocked, the Golden hour theme), the
// recap aggregates and the animation of the day's origin line. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { animRegistryFiles } from '../tools/lib/anim-sources.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');
const body = animRegistryFiles(APP, ['71-achievements.js']).map(src).join('\n;\n');   // the build's order
const NAMES = ['ACH_DEFS', 'ACH_NOTES', 'achDef', 'achFacts', 'achProgress', 'achEarned', 'achRewardFor', 'achLockedBy', 'recapRange', 'recapBuild', 'recapLongestRun', 'animOriginLine',
  'ANIM_THEMES', 'animItem', 'animItems', 'animPack', 'animLocked', 'animThemeOpen', 'animLookNormalize', 'animThemeFor', 'animPickFor', 'animDailyPick', 'animValidatePack'];
// eslint-disable-next-line no-new-func
const R = new Function(`"use strict";\n${body}\nreturn { ${NAMES.join(', ')} };`)();

const ts = (iso, h = 12) => Date.parse(`${iso}T${String(h).padStart(2, '0')}:00:00Z`);
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
const addDays = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);

test('every achievement is well formed and its reward exists, locked by it', () => {
  const ids = new Set();
  for (const d of R.ACH_DEFS) {
    assert.match(d.id, /^[a-z0-9][a-z0-9-]*$/); assert.ok(!ids.has(d.id), d.id); ids.add(d.id);
    assert.ok(d.label && d.hint && d.icon && d.fact && d.of >= 1, d.id);
    assert.ok(['done', 'bestStreak', ...R.ACH_NOTES].includes(d.fact), d.id);
    assert.ok(d.reward && (d.reward.item || d.reward.theme), d.id);
    if (d.reward.item) {
      const it = R.animItem(d.reward.item);
      assert.ok(it, `${d.id}: ${d.reward.item} exists`);
      assert.equal(it.unlock, d.id, `${d.reward.item} is locked by ${d.id}`);
      assert.equal(R.achLockedBy(d.reward.item), d.id);
    } else {
      const th = R.ANIM_THEMES.find(t => t.id === d.reward.theme);
      assert.ok(th && th.unlock === d.id, `${d.id}: theme ${d.reward.theme}`);
    }
  }
  for (const want of ['done-100', 'done-500', 'done-1000', 'streak-7', 'streak-30', 'streak-100', 'under-budget', 'inbox-zero', 'first-focus', 'boss']) assert.ok(ids.has(want), want);
  // every item of the rewards pack is earned by some achievement
  for (const it of R.animPack('rewards').items) assert.ok(R.achDef(it.unlock), it.ref);
  assert.equal(R.animValidatePack({ id: 'x', name: 'X', items: [{ id: 'a', slot: 'symbol', label: 'A', tags: [], mood: 'calm', intensity: 'subtle', svg: () => '', reduced: 'static', unlock: 'Bad Id' }] }).ok, false);
});

test('facts: completions, the longest run of days, the noted moments', () => {
  const log = {
    a: [ts('2026-03-01'), ts('2026-03-02'), ts('2026-03-03')],
    b: [ts('2026-03-03', 18), ts('2026-03-05')],
    c: ['junk', ts('2026-03-06'), ts('2026-03-07')],
    d: 'not a list',
  };
  const f = R.achFacts({ log, dayOf, notes: { focus: '2026-03-01', nonsense: '2026-01-01' } });
  assert.equal(f.done, 7);
  assert.equal(f.bestStreak, 3, '1-3 March, then 5-7 March');
  assert.equal(f.focus, 1); assert.equal(f.boss, 0); assert.equal(f.nonsense, undefined);
  assert.equal(R.recapLongestRun([]), 0);
  assert.equal(R.recapLongestRun(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']), 4, 'across the month end');
  assert.equal(R.recapLongestRun(['2024-02-28', '2024-02-29', '2024-03-01']), 3, 'a leap day');
});

test('earning: thresholds, nothing twice, progress capped', () => {
  const base = { done: 0, bestStreak: 0, focus: 0, boss: 0, 'under-budget': 0, 'inbox-zero': 0 };
  assert.deepEqual(R.achEarned(base, {}), []);
  assert.deepEqual(R.achEarned(Object.assign({}, base, { done: 99, bestStreak: 6 }), {}), []);
  assert.deepEqual(R.achEarned(Object.assign({}, base, { done: 100 }), {}), ['done-100']);
  assert.deepEqual(R.achEarned(Object.assign({}, base, { done: 1200, bestStreak: 31 }), {}), ['done-100', 'done-500', 'done-1000', 'streak-7', 'streak-30']);
  assert.deepEqual(R.achEarned(Object.assign({}, base, { done: 150 }), { 'done-100': '2026-01-01' }), [], 'an unlock is never earned twice');
  assert.deepEqual(R.achEarned(Object.assign({}, base, { focus: 1, boss: 1, 'inbox-zero': 1, 'under-budget': 1 }), {}), ['under-budget', 'inbox-zero', 'first-focus', 'boss']);
  assert.deepEqual(R.achProgress(R.achDef('done-500'), { done: 120 }), { n: 120, of: 500, done: false });
  assert.deepEqual(R.achProgress(R.achDef('streak-7'), { bestStreak: 40 }), { n: 7, of: 7, done: true });
  assert.deepEqual(R.achProgress(R.achDef('boss'), {}), { n: 0, of: 1, done: false });
});

test('locked rewards stay out of every pick until earned', () => {
  const day = '2026-10-04';
  const locked = R.animLookNormalize({ pin: { focus: 'rewards/focus-bonsai' } });
  assert.deepEqual(locked.unlocked, []);
  assert.ok(R.animLocked(R.animItem('rewards/focus-bonsai'), locked));
  assert.ok(!R.animItems({ slot: 'focus', look: locked }).some(it => it.pack === 'rewards'));
  assert.ok(R.animItems({ slot: 'focus' }).some(it => it.ref === 'rewards/focus-bonsai'), 'listed (the gallery shows it locked)');
  const p1 = R.animPickFor('focus', day, locked, { level: 'standard' });
  assert.ok(p1 && p1.ref !== 'rewards/focus-bonsai', 'a pin on a locked reward is ignored');
  const open = R.animLookNormalize({ pin: { focus: 'rewards/focus-bonsai' }, unlocked: ['first-focus'] });
  assert.equal(R.animPickFor('focus', day, open, { level: 'standard' }).ref, 'rewards/focus-bonsai');
  // the daily rotation never brings a locked one up
  for (let i = 0; i < 120; i++) {
    const d = addDays('2026-01-01', i);
    for (const slot of ['celebration', 'opening', 'symbol', 'sky', 'empty-loading']) {
      const it = R.animDailyPick(slot, d, {}, { level: 'playful' });
      assert.ok(!it || it.pack !== 'rewards', `${slot} ${d}`);
    }
  }
  assert.equal(R.animLookNormalize({ unlocked: ['ok-id', 'Bad Id', 5, 'ok-id'] }).unlocked.join(','), 'ok-id');
});

test('the Golden hour theme opens with the 30-day streak', () => {
  assert.equal(R.animLookNormalize({ theme: 'gold' }).theme, 'calm');
  assert.equal(R.animLookNormalize({ theme: 'gold', unlocked: ['streak-30'] }).theme, 'gold');
  assert.ok(!R.animThemeOpen('gold', { unlocked: [] }) && R.animThemeOpen('gold', { unlocked: ['streak-30'] }) && R.animThemeOpen('neon', null));
  const seen = new Set();
  for (let i = 0; i < 90; i++) seen.add(R.animThemeFor(addDays('2026-01-01', i), { themeDaily: true }));
  assert.ok(!seen.has('gold') && seen.size >= 5, 'the daily rotation skips a locked theme');
  const seen2 = new Set();
  for (let i = 0; i < 200; i++) seen2.add(R.animThemeFor(addDays('2026-01-01', i), { themeDaily: true, unlocked: ['streak-30'] }));
  assert.ok(seen2.has('gold'));
});

test('recap ranges: a year, a month, never past today', () => {
  assert.deepEqual(R.recapRange('year', '2025', '2026-10-04'), { period: 'year', from: '2025-01-01', to: '2025-12-31', label: '2025', key: '2025' });
  assert.equal(R.recapRange('year', '2026', '2026-10-04').to, '2026-10-04');
  assert.equal(R.recapRange('year', null, '2026-10-04').key, '2026');
  const feb = R.recapRange('month', '2024-02', '2026-10-04');
  assert.equal(feb.to, '2024-02-29'); assert.equal(feb.label, 'February 2024'); assert.equal(feb.month, 'February');
  const now = R.recapRange('month', '2026-10', '2026-10-04');
  assert.equal(now.from, '2026-10-01'); assert.equal(now.to, '2026-10-04');
  assert.equal(R.recapRange('month', 'junk', '2026-10-04').key, '2026-10');
});

test('recap aggregates: counts, busiest day, streams, people, money totals, achievements', () => {
  const completions = [
    ...['2026-03-02', '2026-03-02', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-09', '2026-03-31'].map((day, i) => ({ day, stream: i < 4 ? 'thesis' : 'work' })),
    { day: '2026-04-01', stream: 'thesis' },   // outside March
    { day: '2026-02-28', stream: 'work' },
    { day: '2026-03-10', stream: '' },
  ];
  const meetings = [
    { day: '2026-03-02', people: ['p1', 'p2'] },
    { day: '2026-03-05', people: ['p1'] },
    { day: '2026-03-06', people: ['p1', 'p1', 'p3'] },   // a person once per meeting
    { day: '2026-04-02', people: ['p9'] },
  ];
  const money = { tx: [
    { d: '2026-03-01', a: -40, c: 'Groceries' }, { d: '2026-03-15', a: -25.5, c: 'Groceries' }, { d: '2026-03-20', a: -30, c: 'Transport' },
    { d: '2026-03-25', a: 2000, c: 'Income' }, { d: '2026-03-26', a: -500, c: 'Internal transfers' }, { d: '2026-03-27', a: 10, c: 'Groceries' },
    { d: '2026-04-01', a: -999, c: 'Rent' }, { d: 'junk', a: -1, c: 'X' },
  ], exclude: [] };
  const unlocked = { 'done-100': '2026-03-09', 'streak-7': '2025-12-01' };
  const r = R.recapBuild({ completions, meetings, money, unlocked }, R.recapRange('month', '2026-03', '2026-10-04'));
  assert.equal(r.tasksDone, 8);
  assert.equal(r.activeDays, 6);
  assert.deepEqual(r.busiestDay, { day: '2026-03-02', n: 3 });
  assert.deepEqual(r.busiestWeekday, { name: 'Monday', n: 4 }, 'Mondays 2 (x3) and 9; Tuesdays 3, 10 and 31');
  assert.deepEqual(r.topStreams, [{ id: 'thesis', n: 4 }, { id: 'work', n: 3 }], 'no stream is not a stream');
  assert.equal(r.meetings, 3);
  assert.deepEqual(r.topPeople, [{ id: 'p1', n: 3 }, { id: 'p2', n: 1 }, { id: 'p3', n: 1 }]);
  assert.equal(r.bestStreak, 3, '2-4 March');
  assert.deepEqual(r.buckets, [5, 2, 0, 0, 1], 'by week of the month (days 1-7, 8-14, ... 29-31)');
  assert.deepEqual(r.money, { spent: 86, income: 2000, topCategory: { name: 'Groceries', amount: 56 } }, 'refunds count against, transfers and income are not spending');
  assert.deepEqual(r.achievements, ['done-100']);
  const y = R.recapBuild({ completions }, R.recapRange('year', '2026', '2026-10-04'));
  assert.equal(y.tasksDone, 10); assert.equal(y.buckets.length, 12); assert.equal(y.buckets[2], 8); assert.equal(y.buckets[1], 1); assert.equal(y.money, null);
  const empty = R.recapBuild({}, R.recapRange('year', '2026', '2026-10-04'));
  assert.equal(empty.tasksDone, 0); assert.equal(empty.busiestDay, null); assert.equal(empty.busiestWeekday, null); assert.deepEqual(empty.topPeople, []);
});

test('the animation of the day: its origin line', () => {
  const durdle = R.animItem('uk-south-west/dorset-durdle-door');
  assert.ok(durdle, 'a county item');
  assert.equal(R.animOriginLine(durdle, '2026-10-04', {}), 'From Dorset, South West');
  const bonfire = R.animItem('seasons/open-bonfire');
  assert.equal(R.animOriginLine(bonfire, '2026-11-05', {}), 'For Bonfire night');
  const plain = R.animItems({ slot: 'opening', pack: 'core' }).find(it => typeof it.when !== 'function');
  assert.match(R.animOriginLine(plain, '2026-10-04', {}), /^From the .+ pack/);
  assert.equal(R.animOriginLine(null, '2026-10-04', {}), '');
});
