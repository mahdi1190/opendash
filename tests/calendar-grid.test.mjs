// Calendar grid editing, Google Calendar's interactions (src/app/45-calendar-grid-logic.js
// + the wiring in 45-calendar-grid-edit.js): 15-minute snapping, the drag maths,
// resizing, click-and-drag ranges, the all-day <-> timed conversions, local
// times for CalWrite, and a keyboard map that clashes with nothing else in the
// app. The pure file runs in a VM; the wiring is checked from its source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadPageClock } from './fixtures/page-clock.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));
const eq = (a, b, msg) => assert.deepEqual(plain(a), plain(b), msg);   // values from the VM are another realm

const box = { console };
vm.createContext(box);
loadPageClock(box);   // wall times come from the page's Clock (travel spec 2.7)
vm.runInContext(read('45-calendar-grid-logic.js') + '\n;this.X = { cglSnap, cglFloor, cglCeil, cglClamp, cglMoveTimed, cglResizeEnd, cglResizeStart, cglCreateRange, cglClickRange, cglAllDayToTimed, cglDayDelta, cglShiftDay, cglMoveAllDay, cglLocalIso, cglTimedPatch, cglAllDayPatch, cglEventGeom, cglRangeLabel, cglKeyAction, cglKeyHelp, CGL_KEYS, CGL_RESERVED, CGL_DAY };', box, { filename: '45-calendar-grid-logic.js' });
const X = box.X;
const H = (h, m = 0) => h * 60 + m;

test('the logic file is pure: no DOM, no page globals', () => {
  const src = read('45-calendar-grid-logic.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const g of ['document', 'window', 'state', 'render', 'saveData', 'CalWrite', 'localStorage']) assert.ok(!new RegExp(`\\b${g}\\b`).test(src), `uses ${g}`);
});

test('snapping: 15 minutes, like Google', () => {
  eq([X.cglSnap(7), X.cglSnap(8), X.cglSnap(22), X.cglSnap(23), X.cglSnap(-7)], [0, 15, 15, 30, -0]);
  eq([X.cglFloor(29), X.cglCeil(16), X.cglFloor(44, 30), X.cglCeil(31, 30)], [15, 30, 30, 60]);
});

test('moving a timed block: keeps its length, snaps, stays inside the day', () => {
  // grabbed 20 minutes into a 10:00-11:00 block, pointer now at 13:27 -> starts 13:07 -> 13:00 (snapped)
  eq(X.cglMoveTimed({ day: '2026-10-08', min: H(13, 27) - H(10) + H(10) - 20 }, { grab: 0, dur: 60 }), { day: '2026-10-08', start: H(13), end: H(14) });
  eq(X.cglMoveTimed({ day: 'd', min: H(15, 8) }, { grab: 20, dur: 45 }), { day: 'd', start: H(14, 45), end: H(15, 30) });
  // never before midnight, never past it (a 90-minute block can start at 22:30 at the latest)
  eq(X.cglMoveTimed({ day: 'd', min: -40 }, { grab: 0, dur: 60 }), { day: 'd', start: 0, end: 60 });
  eq(X.cglMoveTimed({ day: 'd', min: H(23, 50) }, { grab: 0, dur: 90 }), { day: 'd', start: H(22, 30), end: H(24) });
  // an overnight event may keep crossing midnight
  eq(X.cglMoveTimed({ day: 'd', min: H(23) }, { grab: 0, dur: 180, overnight: true }), { day: 'd', start: H(23), end: H(26) });
  // a zero-length event still moves as a 15-minute block
  eq(X.cglMoveTimed({ day: 'd', min: H(9, 2) }, { grab: 0, dur: 0 }), { day: 'd', start: H(9), end: H(9, 15) });
});

test('resizing: 15-minute steps, at least 15 minutes, inside the day', () => {
  assert.equal(X.cglResizeEnd(H(10), H(11, 22)), H(11, 15));
  assert.equal(X.cglResizeEnd(H(10), H(10, 3)), H(10, 15), 'never shorter than 15 minutes');
  assert.equal(X.cglResizeEnd(H(10), H(9)), H(10, 15), 'dragging the bottom edge above the top');
  assert.equal(X.cglResizeEnd(H(23), H(25)), H(24), 'ends at midnight at the latest');
  assert.equal(X.cglResizeEnd(H(23), H(25), 2 * 1440), H(25), 'unless the caller allows more');
  assert.equal(X.cglResizeStart(H(11), H(9, 40)), H(9, 45));
  assert.equal(X.cglResizeStart(H(11), H(10, 59)), H(10, 45), 'the top edge stops 15 minutes before the end');
  assert.equal(X.cglResizeStart(H(1), -30), 0);
});

test('click-and-drag ranges and a single click', () => {
  eq(X.cglCreateRange(H(9, 5), H(10, 20)), { start: H(9), end: H(10, 30) }, 'downwards: the slots from the press to the pointer');
  eq(X.cglCreateRange(H(14, 10), H(12, 50)), { start: H(12, 45), end: H(14, 15) }, 'upwards too');
  eq(X.cglCreateRange(H(9, 5), H(9, 7)), { start: H(9), end: H(9, 15) }, 'at least one slot');
  eq(X.cglCreateRange(H(23, 50), H(30)), { start: H(23, 45), end: H(24) }, 'never past midnight');
  eq(X.cglClickRange(H(15, 20)), { start: H(15), end: H(15, 30) }, 'the half-hour slot, 30 minutes');
  eq(X.cglClickRange(H(15, 40), 60), { start: H(15, 30), end: H(16, 30) });
  eq(X.cglClickRange(H(23, 50), 60), { start: H(23), end: H(24) }, 'kept inside the day');
});

test('all-day <-> timed, and all-day spans', () => {
  eq(X.cglAllDayToTimed(H(10, 10)), { start: H(10), end: H(11) }, 'an all-day event put on the grid: one hour from the slot');
  eq(X.cglAllDayToTimed(H(23, 40)), { start: H(23), end: H(24) });
  eq(X.cglAllDayToTimed(H(9), 30), { start: H(9), end: H(9, 30) });
  eq(X.cglMoveAllDay({ first: '2026-10-05', last: '2026-10-07' }, '2026-10-06', '2026-10-09'), { first: '2026-10-08', last: '2026-10-10', delta: 3 });
  eq(X.cglMoveAllDay({ first: '2026-10-30', last: '2026-11-01' }, '2026-10-30', '2026-10-26'), { first: '2026-10-26', last: '2026-10-28', delta: -4 });
  eq(X.cglAllDayPatch('2026-10-09', '2026-10-09'), { start: '2026-10-09', end: '2026-10-10', allDay: true }, "Google's end date is exclusive");
  eq(X.cglAllDayPatch('2026-12-30', '2027-01-01'), { start: '2026-12-30', end: '2027-01-02', allDay: true });
});

test('days: calendar arithmetic that ignores clock changes', () => {
  assert.equal(X.cglDayDelta('2026-10-24', '2026-10-26'), 2, 'across the October clock change');
  assert.equal(X.cglDayDelta('2026-03-28', '2026-03-30'), 2, 'across the March one');
  assert.equal(X.cglShiftDay('2026-02-28', 1), '2026-03-01');
  assert.equal(X.cglShiftDay('2028-02-28', 1), '2028-02-29');
  assert.equal(X.cglShiftDay('2026-01-01', -1), '2025-12-31');
});

test('local times for CalWrite: wall clock + the offset of that day', () => {
  const iso = X.cglLocalIso('2026-10-08', H(10, 15));
  assert.match(iso, /^2026-10-08T10:15:00[+-]\d{2}:\d{2}$/);
  const d = new Date(iso);
  eq([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()], [2026, 9, 8, 10, 15], 'reads back as the same local time');
  assert.match(X.cglLocalIso('2026-10-08', 1440), /^2026-10-09T00:00:00/, '24:00 is the next midnight');
  assert.match(X.cglLocalIso('2026-10-08', 1440 + 90), /^2026-10-09T01:30:00/, 'an overnight end');
  const winter = X.cglLocalIso('2026-12-08', H(9)), summer = X.cglLocalIso('2026-07-08', H(9));
  assert.equal(new Date(winter).getHours(), 9); assert.equal(new Date(summer).getHours(), 9);
  eq(X.cglTimedPatch('2026-10-08', H(9), H(9, 45)), { start: X.cglLocalIso('2026-10-08', H(9)), end: X.cglLocalIso('2026-10-08', H(9, 45)), allDay: false });
});

test('an event on the local clock (cglEventGeom)', () => {
  const at = (d, h, m = 0) => new Date(2026, 9, d, h, m).toISOString();
  eq(X.cglEventGeom({ start: { dateTime: at(8, 10) }, end: { dateTime: at(8, 11, 30) } }),
    { allDay: false, startDay: '2026-10-08', endDay: '2026-10-08', start: H(10), end: H(11, 30), dur: 90, overnight: false });
  eq(X.cglEventGeom({ start: { dateTime: at(8, 23) }, end: { dateTime: at(9, 1) } }),
    { allDay: false, startDay: '2026-10-08', endDay: '2026-10-09', start: H(23), end: H(25), dur: 120, overnight: true });
  const midnight = X.cglEventGeom({ start: { dateTime: at(8, 22) }, end: { dateTime: at(9, 0) } });
  eq([midnight.endDay, midnight.overnight], ['2026-10-08', false], 'ending at midnight stays on its day');
  eq(X.cglEventGeom({ allDay: true, start: { date: '2026-10-08' }, end: { date: '2026-10-11' } }),
    { allDay: true, startDay: '2026-10-08', endDay: '2026-10-10', start: 0, end: 3 * 1440, dur: 3 * 1440, overnight: true });
  eq(X.cglEventGeom({ allDay: true, start: { date: '2026-10-08' }, end: { date: '2026-10-08' } }).endDay, '2026-10-08', 'a bad end is one day');
  assert.equal(X.cglRangeLabel(H(10, 15), H(11)), '10:15 – 11:00');
  assert.equal(X.cglRangeLabel(H(23), H(24)), '23:00 – 00:00');
});

/* ---------- keys ---------- */
const k = (key, mods = {}) => ({ key, altKey: false, shiftKey: false, ctrlKey: false, metaKey: false, ...mods });

test('keys: one action per key, none of the app-wide keys taken', () => {
  const sig = X.CGL_KEYS.map(r => `${r.alt ? 'Alt+' : ''}${r.shift ? 'Shift+' : ''}${r.key}`);
  eq(sig.filter((s, i) => sig.indexOf(s) !== i), [], 'no key (with its modifiers) is listed twice');
  for (const r of X.CGL_KEYS) assert.ok(!X.CGL_RESERVED.includes(r.key), `${r.key} belongs to the app`);
  // The app's own single keys (90-wiring.js): ? help, q new task, / filter, g then a letter.
  const wiring = read('90-wiring.js');
  for (const key of ['?', 'q', '/', 'g']) assert.ok(wiring.includes(`e.key === '${key}'`), `90-wiring still uses ${key}`);
  // The Calendar section's handler (41) owns exactly the 'section' keys.
  const sec = read('41-calendar-section.js');
  for (const r of X.CGL_KEYS.filter(x => x.by === 'section' && x.key.length === 1)) assert.match(sec, new RegExp(`(['"]${r.key}['"]|[{,]\\s*${r.key}:)`), `41 handles ${r.key}`);
  // Task keys stand aside in the calendar for the section's letters (32-tasks-ui.js).
  const tasks = read('32-tasks-ui.js');
  const m = /calendar[^\n]*\/\^\[([a-z]+)\]\$\/i/.exec(tasks);
  assert.ok(m, '32-tasks-ui.js keeps its calendar exception');
  for (const r of X.CGL_KEYS.filter(x => x.by === 'section' && /^[a-z]$/.test(x.key))) assert.ok(m[1].includes(r.key), `task keys leave ${r.key} to the calendar`);
});

test('keys: Google Calendar actions, events first, open tasks keep theirs', () => {
  const grid = (e, ctx) => X.cglKeyAction(e, Object.assign({ by: 'grid' }, ctx));
  assert.equal(grid(k('c')), 'create');
  assert.equal(grid(k('C')), 'create', 'caps lock');
  assert.equal(grid(k('c', { shiftKey: true })), null, 'Shift+C is not c');
  assert.equal(grid(k('c', { ctrlKey: true })), null, 'Ctrl+C copies');
  assert.equal(grid(k('n')), 'next');
  assert.equal(grid(k('p')), 'prev');
  assert.equal(grid(k('p'), { taskOpen: true }), null, 'p is the task priority key when a task is open');
  assert.equal(grid(k('t')), null, 't is the section handler\'s (41)');
  assert.equal(X.cglKeyAction(k('t'), { by: 'section' }), 'today');
  assert.equal(grid(k('e')), null, 'e needs a selected event');
  assert.equal(grid(k('e'), { hasEvent: true }), 'open');
  assert.equal(grid(k('Enter'), { hasEvent: true }), 'open');
  assert.equal(grid(k('Delete'), { hasEvent: true }), 'delete');
  assert.equal(grid(k('Backspace'), { hasEvent: true, taskOpen: true }), 'delete', 'the selected event wins over the task');
  assert.equal(grid(k('Delete'), { taskOpen: true }), null);
  assert.equal(grid(k('ArrowDown', { altKey: true }), { hasEvent: true }), 'later');
  assert.equal(grid(k('ArrowUp', { altKey: true }), { hasEvent: true }), 'earlier');
  assert.equal(grid(k('ArrowRight', { altKey: true }), { hasEvent: true }), 'dayAfter');
  assert.equal(grid(k('ArrowLeft', { altKey: true }), { hasEvent: true }), 'dayBefore');
  assert.equal(grid(k('ArrowDown', { altKey: true, shiftKey: true }), { hasEvent: true }), 'longer');
  assert.equal(grid(k('ArrowUp', { altKey: true, shiftKey: true }), { hasEvent: true }), 'shorter');
  assert.equal(grid(k('ArrowDown', { altKey: true })), null, 'Alt+arrows need an event');
  assert.equal(grid(k('ArrowRight')), null, 'plain arrows step the period (41)');
  assert.equal(X.cglKeyAction(k('ArrowRight'), { by: 'section' }), 'next');
  assert.equal(grid(k('ArrowRight', { shiftKey: true })), null);
  assert.equal(grid(k('Escape')), 'escape');
});

test('keys: the shortcut sheet lists only keys the calendar handles', () => {
  const rows = X.cglKeyHelp();
  assert.ok(rows.length >= 8);
  const name = { '↑': 'ArrowUp', '↓': 'ArrowDown', '←': 'ArrowLeft', '→': 'ArrowRight', Esc: 'Escape', Del: 'Delete', Enter: 'Enter' };
  const keys = new Set(X.CGL_KEYS.map(r => r.key));
  for (const [label, ks] of rows) {
    assert.equal(typeof label, 'string');
    for (const s of ks) if (!['Alt', 'Shift'].includes(s)) assert.ok(keys.has(name[s] || s.toLowerCase()), `${label}: ${s}`);
  }
  assert.match(read('75-modals.js'), /cglKeyHelp\(\)/, 'the sheet shows them');
});

/* ---------- the wiring ---------- */
test('wiring: the section hooks the grids in, the old slot menu stands aside', () => {
  const sec = read('41-calendar-section.js');
  assert.match(sec, /calGridEditMonth\(grid\)/);
  assert.match(sec, /calGridEditTime\(tg\)/);
  assert.match(sec, /calGridCreate\(\)/, 'New > New event opens the quick-create');
  const views = read('42-calendar-views.js');
  assert.equal((views.match(/col\.closest\('\.cge-on'\)/g) || []).length, 2, 'click and double-click leave the Calendar section to 45');
});

test('wiring: CalWrite through the contract, escaped text, no inline handlers', () => {
  const src = read('45-calendar-grid-edit.js');
  for (const m of ['move', 'resize', 'create', 'remove', 'canEdit', 'pending', 'onChange', 'guests']) assert.match(src, new RegExp(`\\.${m}\\(`), `uses CalWrite.${m}`);
  assert.match(src, /window\.CalWrite/, 'feature-detects CalWrite');
  assert.ok(!/\son[a-z]+=["'\\]/.test(src), 'no inline on* handlers');
  // Titles and reasons reach the page as text only.
  let n = 0;
  for (const m of src.matchAll(/innerHTML\s*=\s*([^;]+);/g)) {
    for (const x of m[1].matchAll(/\$\{([^}]*)\}/g)) {
      n++;
      assert.ok(!/\b(title|summary|reason|name|label)\b/.test(x[1]) || /^\s*esc(Attr)?\(/.test(x[1]), `markup built from text: ${x[1]}`);
    }
  }
  assert.ok(n > 0, 'found the markup');
  assert.match(src, /_cgeReduced\(\)/, 'motion respects reduced motion');
  assert.match(src, /touchmove[\s\S]{0,120}passive: false/, 'a picked-up event does not scroll the page');
  const css = readFileSync(join(ROOT, 'src', 'styles', '32-calendar-edit.css'), 'utf8');
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /data-motion="reduced"/);
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css), 'colours come from the tokens');
});
