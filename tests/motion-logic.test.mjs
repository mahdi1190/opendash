// The motion system's pure rules (src/app/09-motion-logic.js) and the delight chooser
// (src/app/71-delight-library.js): intensity scaling, the section-change classifier (the
// replay fix), the variant pickers, the list FLIP plan and the sky extras. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => readFileSync(join(ROOT, 'src', 'app', f), 'utf8');
const NAMES = ['MOTION_T', 'MOTION_LEVELS', 'MOTION_PROFILES', 'motionResolveLevel', 'motionMigrateLevel', 'motionProfile', 'motionMs', 'motionPx',
  'motionStaggerDelay', 'motionSectionOf', 'motionNavKind', 'motionNavDir', 'motionRenderKind', 'motionPick', 'motionFlipPlan', 'motionSkyExtras'];
// eslint-disable-next-line no-new-func
const M = new Function(`"use strict";\n${src('09-motion-logic.js')}\nreturn { ${NAMES.join(', ')} };`)();
// eslint-disable-next-line no-new-func
const D = new Function(`"use strict";\n${src('71-delight-library.js')}\nreturn Delight;`)();

// ─── intensity ─────────────────────────────────────────────────────────────
test('the level resolves: OS reduced wins, then the stored level, then the legacy switch', () => {
  assert.equal(M.motionResolveLevel({ osReduced: true, stored: 'playful' }), 'reduced');
  assert.equal(M.motionResolveLevel({ stored: 'subtle' }), 'subtle');
  assert.equal(M.motionResolveLevel({ stored: 'bogus', legacy: 'reduced' }), 'off');
  assert.equal(M.motionResolveLevel({}), 'standard');
  assert.equal(M.motionMigrateLevel(null, 'reduced'), 'off');
  assert.equal(M.motionMigrateLevel('playful', 'reduced'), null);
});
test('intensity scales durations, distances and the stagger; Off zeroes them', () => {
  assert.equal(M.motionMs('slow', 'standard'), 240);
  assert.equal(M.motionMs('slow', 'subtle'), 192);
  assert.equal(M.motionMs('slow', 'playful'), 264);
  assert.equal(M.motionMs('slow', 'off'), 0);
  assert.equal(M.motionPx('d3', 'standard'), 12);
  assert.equal(M.motionPx('d3', 'subtle'), 6);
  assert.equal(M.motionPx('d3', 'reduced'), 0);
  // stagger: capped item index, and the last start stays inside the budget
  for (const lv of ['subtle', 'standard', 'playful']) {
    const q = M.motionProfile(lv);
    const last = M.motionStaggerDelay(40, 40, 'card', lv);
    assert.ok(last <= q.budget, `${lv}: ${last} > ${q.budget}`);
    assert.equal(M.motionStaggerDelay(0, 10, 'row', lv), 0);
  }
  assert.equal(M.motionStaggerDelay(5, 10, 'row', 'off'), 0);
  assert.equal(M.motionStaggerDelay(5, 10, 'row', 'reduced'), 0);
  assert.ok(M.motionStaggerDelay(3, 10, 'row', 'playful') > M.motionStaggerDelay(3, 10, 'row', 'subtle'));
  assert.equal(M.motionProfile('nope').name, 'standard');
});

// ─── the section-change classifier (the replay fix) ───────────────────────
test('views map to sections: task views share one, person: is people, sub-views keep their section', () => {
  assert.equal(M.motionSectionOf('today'), 'tasks');
  assert.equal(M.motionSectionOf('stream:abc'), 'tasks');
  assert.equal(M.motionSectionOf('person:p1'), 'people');
  assert.equal(M.motionSectionOf('settings:appearance'), 'settings');
  assert.equal(M.motionSectionOf('home:week'), 'home');   // Home's tabs (the old Review pages)
  assert.equal(M.motionSectionOf('finance', () => 'finance'), 'finance');
  assert.equal(M.motionSectionOf('x', () => { throw new Error('no'); }), 'x');
});
test('navigation kinds: same is a no-op, a sub-view is sub, another section is a page', () => {
  assert.equal(M.motionNavKind('settings:appearance', 'settings:appearance'), 'same');
  assert.equal(M.motionNavKind('settings:appearance', 'settings:animations'), 'sub');
  assert.equal(M.motionNavKind('home', 'home:week'), 'sub');
  assert.equal(M.motionNavKind('today', 'all'), 'sub');
  assert.equal(M.motionNavKind('people', 'person:p1'), 'sub');
  assert.equal(M.motionNavKind('home', 'settings:appearance'), 'page');
  assert.equal(M.motionNavKind('today', 'finance'), 'page');
  assert.equal(M.motionNavDir('home', 'home:week'), 1);
  assert.equal(M.motionNavDir('home:week', 'home'), -1);
  assert.equal(M.motionNavDir('people', 'person:p1'), 1);
  assert.equal(M.motionNavDir('home', 'settings'), 1);
});
test('render kinds: boot and section changes are pages, sub-view or mode changes are sub, the rest replay nothing', () => {
  const r = (section, view, mode) => ({ section, view, mode });
  assert.equal(M.motionRenderKind(null, r('home', 'home')), 'page');
  assert.equal(M.motionRenderKind(r('home', 'home'), r('settings', 'settings:a')), 'page');
  assert.equal(M.motionRenderKind(r('settings', 'settings:a'), r('settings', 'settings:b')), 'sub');
  assert.equal(M.motionRenderKind(r('tasks', 'today', 'list'), r('tasks', 'today', 'kanban')), 'sub');
  // a save, a live sync, a theme switch, a filter: the same view and mode
  assert.equal(M.motionRenderKind(r('settings', 'settings:a'), r('settings', 'settings:a')), null);
  assert.equal(M.motionRenderKind(r('finance', 'finance', 'list'), r('finance', 'finance', 'list')), null);
});

// ─── rotation ──────────────────────────────────────────────────────────────
test('motionPick is stable per seed, never repeats the last one, and is silent when still', () => {
  const a = M.motionPick('celebrate-milestone', 'seed-1', 'standard');
  assert.equal(M.motionPick('celebrate-milestone', 'seed-1', 'standard'), a);
  assert.notEqual(M.motionPick('celebrate-milestone', 'seed-1', 'standard', a), a);
  assert.equal(M.motionPick('celebrate-milestone', 'x', 'off'), null);
  assert.equal(M.motionPick('celebrate-milestone', 'x', 'reduced'), null);
  assert.equal(M.motionPick('nope', 'x', 'standard'), null);
  assert.equal(M.motionPick('celebrate-milestone', 'x', 'subtle'), 'sparkle');
});

// ─── lists ─────────────────────────────────────────────────────────────────
test('FLIP plan: moved rows glide, new rows enter, bulk inserts and page moves stay still', () => {
  const before = { a: { top: 0, left: 0 }, b: { top: 40, left: 0 } };
  const after = { b: { top: 0, left: 0 }, a: { top: 40, left: 0 }, c: { top: 80, left: 0 } };
  const p = M.motionFlipPlan(before, after, {});
  assert.deepEqual(p.moves.map(m => m.key).sort(), ['a', 'b']);
  assert.equal(p.moves.find(m => m.key === 'a').dy, -40);
  assert.deepEqual(p.enters, ['c']);
  assert.equal(M.motionFlipPlan(before, after, { nav: 'page' }).instant, true);
  assert.deepEqual(M.motionFlipPlan(before, before, {}).moves, []);   // a plain save moves nothing
  const many = {}; for (let i = 0; i < 20; i++) many['n' + i] = { top: i * 40, left: 0 };
  assert.deepEqual(M.motionFlipPlan(before, Object.assign({}, before, many), {}).enters, []);
  assert.equal(M.motionFlipPlan(before, Object.assign({}, before, many), { nav: 'sub' }).enters.length, 20);
  assert.deepEqual(M.motionFlipPlan(null, after, {}).enters, []);
});

// ─── sky ───────────────────────────────────────────────────────────────────
test('sky extras: wind, heat, the bolt and a rainbow only after recent rain', () => {
  const w = (cur, hourly) => ({ current: cur, hourly: hourly || [] });
  assert.equal(M.motionSkyExtras(w({ cond: 'cloudy', wind: 35 })).wind, true);
  assert.equal(M.motionSkyExtras(w({ cond: 'clear', temp: 30, isDay: true })).heat, true);
  assert.equal(M.motionSkyExtras(w({ cond: 'clear', temp: 30, isDay: false })).heat, false);
  assert.equal(M.motionSkyExtras(w({ cond: 'thunder' })).bolt, true);
  const rained = [{ date: '2026-10-04', hour: 12, cond: 'rain' }];
  assert.equal(M.motionSkyExtras(w({ cond: 'partly', isDay: true }, rained), { hour: 14, today: '2026-10-04' }).rainbow, true);
  assert.equal(M.motionSkyExtras(w({ cond: 'partly', isDay: true }, rained), { hour: 18, today: '2026-10-04' }).rainbow, false);
  assert.equal(M.motionSkyExtras(w({ cond: 'rain', isDay: true }, rained), { hour: 14, today: '2026-10-04' }).rainbow, false);
  assert.deepEqual(M.motionSkyExtras(null), { wind: false, heat: false, rainbow: false, bolt: false });
});

// ─── celebrations (the delight chooser) ───────────────────────────────────
test('every moment has 2+ variants, each with art', () => {
  for (const m of D.DL_MOMENTS) {
    assert.ok(m.variants.length >= 2, m.id);
    for (const v of m.variants) assert.ok(D.DL_ART[v], `${m.id}: ${v} has no art`);
  }
});
test('completions pick a moment by kind, with context moments first', () => {
  const t = (title, o = {}) => ({ kind: 'task', title, ...o });
  assert.equal(D.delightFor(t('Reply to the landlord'), { type: 'email' }).moment, 'done.email');
  assert.equal(D.delightFor(t('Draft chapter 3'), { type: 'writing' }).moment, 'done.writing');
  assert.equal(D.delightFor(t('Fix the parser'), { type: 'coding' }).moment, 'done.coding');
  assert.equal(D.delightFor(t('Pay the bill'), { type: 'admin' }).moment, 'done.admin');
  assert.equal(D.delightFor(t('Morning run'), { type: 'run' }).moment, 'done.exercise');
  assert.equal(D.delightFor(t('Submit the abstract'), { type: 'task' }).moment, 'done.submission');
  assert.equal(D.delightFor(t('Launch the site'), { type: 'task' }).moment, 'done.milestone');
  assert.equal(D.delightFor(t('Plan a party'), { type: 'party' }).moment, 'done.generic');
  assert.equal(D.delightFor(t('Reply'), { type: 'email', streak: 7, streakBefore: 6 }).moment, 'moment.streak');
  assert.equal(D.delightFor(t('Reply'), { type: 'email', streak: 8, streakBefore: 7 }).moment, 'done.email');
  assert.equal(D.delightFor(t('Reply'), { type: 'email', event: 'focus-done' }).moment, 'moment.all-focus');
  assert.equal(D.delightFor(null, { event: 'inbox-zero' }).moment, 'moment.inbox-zero');
});
test('variants rotate through the day and never repeat the last one shown', () => {
  const seen = new Set();
  let recent = {};
  for (let i = 0; i < 6; i++) {
    const v = D.delightPick('done.email', recent, '2026-10-04');
    if (recent['done.email']) assert.notEqual(v, recent['done.email'].v);
    seen.add(v);
    recent = { 'done.email': { v, n: i + 1 } };
  }
  assert.ok(seen.size >= 2);
  assert.equal(D.delightPick('done.email', {}, 'same'), D.delightPick('done.email', {}, 'same'));
});
test('the level gates celebrations: Off and Reduced are still, Subtle at most a pop, bulk is silent', () => {
  const email = D.DL_MOMENT_BY.get('done.email'), sub = D.DL_MOMENT_BY.get('done.submission');
  assert.equal(D.delightAllowed(email, {}, { level: 'off' }, 0).ok, false);
  assert.equal(D.delightAllowed(email, {}, { level: 'reduced' }, 0).ok, false);
  assert.equal(D.delightAllowed(email, {}, { level: 'subtle' }, 0).level, 1);
  assert.equal(D.delightAllowed(email, {}, { level: 'standard' }, 0).level, 2);
  assert.equal(D.delightAllowed(email, { bulk: true }, { level: 'playful' }, 0).ok, false);
  assert.equal(D.delightAllowed(email, { lastHour: { 'done.email': 3 } }, { level: 'standard' }, 0).level, 0);
  assert.equal(D.delightAllowed(sub, {}, { level: 'playful' }, 0).extra, true);
  assert.equal(D.delightAllowed(sub, { lastL3: 1000 }, { level: 'standard' }, 2000).level, 2);
});
test('the motion and delight files stay pure (no DOM, no page globals)', () => {
  for (const f of ['09-motion-logic.js', '71-delight-library.js']) {
    const s = src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const g of [/\bdocument\./, /\bwindow\./, /\bstate\./, /\blocalStorage\b/, /\bfetch\(/]) assert.ok(!g.test(s), `${f} uses ${g}`);
  }
});
