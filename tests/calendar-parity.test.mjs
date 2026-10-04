// Google Calendar parity fixes from the QA pass (3 Oct): clock-change days drawn
// and edited on the wall clock, resizing from the bottom edge only (the top of a
// block moves it), z / Ctrl+Z undoing the last calendar change, Delete then Enter,
// and a change made while the server is down kept for Try again.
// The pure grid rules run in a VM under the UK zone (clocks go back at 02:00 BST
// on Sun 25 Oct 2026); the wiring is checked from the source.
process.env.TZ = 'Europe/London';
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
const eq = (a, b, msg) => assert.deepEqual(plain(a), plain(b), msg);

const box = { console };
vm.createContext(box);
loadPageClock(box);   // wall times come from the page's Clock, on this process's (UK) zone
vm.runInContext(read('45-calendar-grid-logic.js') + '\n;this.X = { cglEventGeom, cglTimedPatch, cglLocalIso, cglMoveTimed, cglKeyAction, cglKeyHelp, CGL_KEYS, CGL_DAY };', box, { filename: '45-calendar-grid-logic.js' });
const X = box.X;
const ukZone = new Date(2026, 9, 24, 12).getTimezoneOffset() === -60 && new Date(2026, 9, 25, 12).getTimezoneOffset() === 0;

test('the test runs on the UK clock', () => { assert.ok(ukZone, 'process.env.TZ = Europe/London took effect'); });

test('clock change: an event across it keeps its wall-clock length (what the grid shows)', { skip: !ukZone }, () => {
  // 00:30 BST -> 03:00 GMT: 3.5 hours pass, the clock shows 00:30 - 03:00
  const g = X.cglEventGeom({ start: { dateTime: '2026-10-25T00:30:00+01:00' }, end: { dateTime: '2026-10-25T03:00:00+00:00' } });
  eq({ start: g.start, end: g.end, dur: g.dur, startDay: g.startDay, endDay: g.endDay, overnight: g.overnight }, { start: 30, end: 180, dur: 150, startDay: '2026-10-25', endDay: '2026-10-25', overnight: false });
  // moved an hour later on the grid: 01:30 (still BST) - 04:00 GMT, the same 3.5 hours
  const r = X.cglMoveTimed({ day: g.startDay, min: 90 }, { grab: 0, dur: g.dur });
  eq(X.cglTimedPatch(r.day, r.start, r.end), { start: '2026-10-25T01:30:00+01:00', end: '2026-10-25T04:00:00+00:00', allDay: false });
});

test('clock change: days either side keep their wall times and offsets', { skip: !ukZone }, () => {
  eq(X.cglTimedPatch('2026-10-24', 600, 660), { start: '2026-10-24T10:00:00+01:00', end: '2026-10-24T11:00:00+01:00', allDay: false });
  eq(X.cglTimedPatch('2026-10-25', 600, 660), { start: '2026-10-25T10:00:00+00:00', end: '2026-10-25T11:00:00+00:00', allDay: false });
  // a normal overnight event is unchanged by the wall-clock end
  const n = X.cglEventGeom({ start: { dateTime: '2026-10-08T22:00:00+01:00' }, end: { dateTime: '2026-10-09T02:00:00+01:00' } });
  eq([n.start, n.end, n.dur, n.overnight], [1320, 1560, 240, true]);
  // a 26-hour event that crosses the change: 08:00 BST Sat -> 10:00 GMT Sun is 26 hours on the clock
  const l = X.cglEventGeom({ start: { dateTime: '2026-10-24T08:00:00+01:00' }, end: { dateTime: '2026-10-25T10:00:00+00:00' } });
  eq([l.start, l.end, l.dur], [480, 2040, 1560]);
});

test('the grid draws timed events on the wall clock, not by elapsed time (40-calendar.js)', () => {
  const src = read('40-calendar.js');
  const body = src.slice(src.indexOf('function calEntriesOn('), src.indexOf('function calEntriesOn(') + 3000);
  assert.match(body, /Clock\.parts\(d\.getTime\(\)\);[^\n]*p\.h \* 60 \+ p\.mi/, 'wall minutes from the clock (the dashboard\'s zone)');
  assert.ok(!/- dayStart\) \/ 60000/.test(body), 'no elapsed-time minutes');
});

test('resize: the bottom edge only, measured from where it was grabbed', () => {
  const src = read('45-calendar-grid-edit.js');
  assert.match(src, /const _CGE_TOP_EDGE = false;/, 'no top handle (Google: the top of a block moves it)');
  assert.equal((src.match(/_cgeAddHandles\(b, _CGE_TOP_EDGE && /g) || []).length, 2, 'events and planned task blocks');
  assert.match(src, /mode: 'resize'[^\n]*pressMin: _cgeMinIn\(col, e\.clientY\)/, 'the grab point is kept');
  assert.match(src, /d\.edge === 'end' \? d\.g\.end : d\.g\.start\) \+ _cgeMinIn\(col, y\) - /, 'the edge moves by the pointer\'s travel');
});

test('keys: z undoes the last calendar change (Google), Ctrl+Z too, the sheet lists it', () => {
  const grid = (e) => X.cglKeyAction(Object.assign({ altKey: false, shiftKey: false, ctrlKey: false, metaKey: false }, e), { by: 'grid' });
  assert.equal(grid({ key: 'z' }), 'undo');
  assert.equal(grid({ key: 'Z' }), 'undo', 'caps lock');
  assert.equal(grid({ key: 'z', shiftKey: true }), null);
  assert.equal(grid({ key: 'z', ctrlKey: true }), null, 'Ctrl+Z is handled before the key map');
  assert.ok(X.cglKeyHelp().some(([label, ks]) => /undo/i.test(label) && ks.includes('Z')));
  const src = read('45-calendar-grid-edit.js');
  assert.match(src, /\(e\.ctrlKey \|\| e\.metaKey\) && !e\.shiftKey && !e\.altKey && String\(e\.key\)\.toLowerCase\(\) === 'z' && _cgeUndo\(\)/);
  assert.match(src, /act === 'undo'\) \{ if \(!_cgeUndo\(\) && typeof undo === 'function'\) undo\(\); \}/, 'else the app\'s own undo');
  const cw = read('44-calendar-write.js');
  assert.match(cw, /undoLast: \(\) => calwUndoLast\(\)/);
  assert.match(cw, /function calwUndoLast\(\) \{[\s\S]{0,200}u\.mark !== _calwUndoMark\(\)/, 'only while no newer task change is waiting to be undone');
  assert.match(cw, /_calwLastUndo = null;\s+\/\/ a newer calendar message/, 'a newer toast retires it');
});

test('Delete then Enter deletes; a drag never shows hover scenes', () => {
  const src = read('45-calendar-grid-edit.js');
  assert.match(src, /querySelector\('\.modal \.modal-f \.btn-danger'\)[^\n]*focus/, 'the Delete button has the focus');
  assert.match(read('../styles/32-calendar-edit.css'), /body\.cge-dragging \.anim-tip \{ display: none; \}|body\.cge-dragging \.anim-tip\s*\{/);
});

test('server down: no optimistic move while the banner is up, and the reverted change keeps Try again', () => {
  const cw = read('44-calendar-write.js');
  assert.match(cw, /typeof srvIsOffline === 'function' && srvIsOffline\(\)\)\) return \{ ok: false, code: 'SERVER_DOWN'/);
  assert.match(cw, /if \(code === 'SERVER_DOWN'\) action = \{ label: 'Try again', run: \(\) => _calwRetry\(job\) \};/);
  const grid = read('45-calendar-grid-edit.js');
  assert.equal((grid.match(/classList\.contains\('cge-rw'\) \? calGridCanEdit\(ev\) : null/g) || []).length, 2, 'week/day and month ask again at the press');
});
