// Design polish of the shell, Home, Tasks, Calendar and palette (mockup fidelity
// pass): the page code in a VM where it is pure, static checks for the markup
// and CSS rules the screenshots depend on. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = (f) => readFileSync(join(ROOT, 'src', 'app', f), 'utf8');
const css = (f) => readFileSync(join(ROOT, 'src', 'styles', f), 'utf8');

function box(files, extra = {}) {
  const b = {
    console, APP_CONFIG: { locale: 'en-GB', currency: 'GBP', features: {} }, window: { addEventListener() {}, matchMedia: () => ({ matches: false }) },
    state: { custom: [], statuses: {}, pinned: {}, deleted: {} }, registerSection() {}, registerSidebarBlock() {}, registerCommand() {},
    document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
    ...extra,
  };
  vm.createContext(b);
  for (const f of files) vm.runInContext(app(f), b, { filename: f });
  return b;
}

test('Home description preview: list items read "a · b", a list after a sentence does not start with a dot', () => {
  const b = box(['10-header.js', '12-home.js']);
  assert.equal(b.homePlainText('Before the 1:1.\n\n- Regenerate at 300 dpi\n- Shorten captions'), 'Before the 1:1. Regenerate at 300 dpi · Shorten captions');
  assert.equal(b.homePlainText('- [ ] one\n- [x] two\n3. three'), 'one · two · three');
  assert.equal(b.homePlainText('**Bold** and [a link](http://x) `code`\n\n- item'), 'Bold and a link code item');
});

test('Task rows name the weekday of a weekly repeat ("Every Fri"), other rules keep their label', () => {
  const b = box(['30-task-row.js'], { recurrenceLabel: (r) => ({ weekly: 'Every week', monthly: 'Every month', daily: 'Every day' })[r] || r });
  assert.equal(b._rowRecurLabel('weekly', '2026-10-02'), 'Every Fri');
  assert.equal(b._rowRecurLabel('biweekly', '2026-10-05'), 'Every other Mon');
  assert.equal(b._rowRecurLabel('weekly', null), 'Every week');
  assert.equal(b._rowRecurLabel('monthly', '2026-10-02'), 'Every month');
});

test('Home Focus cards do not repeat the due chip in the meta line', () => {
  const s = app('12-home-w-focus.js');
  assert.match(s, /whyShown = effDate\(item\) \? why\.filter\(w => !\['overdue', 'today', 'soon'\]\.includes\(w\.k\)\)/);
  assert.match(s, /\$\{whyShown\.slice\(0, 2\)/);
  // the timeline's "now" line never sits above an event that is under way
  // (12-home-cal.js homeDayModel; the behaviour is tested in tests/home-schedule.test.mjs)
  assert.match(app('12-home-cal.js'), /the now line after anything already under way/);
});

test('Page header: the mockup layout (List | Board | Calendar | Review) and a filter that opens from a search button', () => {
  const body = readFileSync(join(ROOT, 'src', 'body.html'), 'utf8');
  const modes = [...body.matchAll(/data-mode="(\w+)"/g)].map(m => m[1]);
  assert.deepEqual(modes, ['list', 'kanban', 'calendar', 'review']);
  assert.match(body, /data-mode="calendar" data-goto="calendar:week"/);
  assert.match(body, /id="search-input"[^>]*aria-label="Filter this list"/);
  assert.match(app('90-wiring.js'), /if \(b\.dataset\.goto\) \{ setView\(b\.dataset\.goto\); return; \}/);
  const layout = css('05-layout.css');
  assert.match(layout, /\.view-controls \.view-filter:focus-within,\s*\n\.view-controls \.view-filter:has\(input:not\(:placeholder-shown\)\)/);
  // the 1000px text column of the mockups (1080 page minus 2 x 40px padding)
  assert.match(layout, /max-width: calc\(var\(--content-max\) - 2 \* var\(--space-10\)\)/);
  // phones: no breadcrumb, so the headline widget is never squeezed
  assert.match(layout, /@media \(max-width: 640px\) \{[\s\S]*?\.topbar \.crumb \{ display: none; \}/);
});

test('Workspace button shows the user name only; the window title keeps "<name>\'s OpenDash"', () => {
  assert.match(app('14-shell.js'), /const name = userName\(\) \|\| 'OpenDash';/);
  assert.match(app('99-boot.js'), /document\.title = appTitle\(\);/);
});

test('Calendar sidebar countdowns use the widget number and unit (15w) and its colour', () => {
  const s = app('15-nav-sidebar.js');
  assert.match(s, /tbCompute\(c\)/);
  assert.match(s, /tbColorAttrs\(c\.color\)/);
});

test('Today schedule strip never squeezes pills: overflow wraps out of sight into "+N", past events go first', () => {
  const s = app('40-calendar.js');
  assert.match(s, /className = 'cal-sched-pills'/);
  assert.match(s, /classList\.contains\('past'\)/);
  assert.match(s, /more\.textContent = `\+\$\{n\}`/);
  assert.match(css('20-main-tasks.css'), /\.cal-sched-pills\) \{ position: relative; display: flex; flex-wrap: wrap;[^}]*height: 32px; overflow: hidden;/);
});

test('Week grid: opens on the working day at night, records scroll only when laid out; phones get three days', () => {
  const v = app('42-calendar-views.js');
  assert.match(v, /let startMin = 8 \* 60;/);
  assert.doesNotMatch(v, /Math\.min\(nowMin - 120, 8 \* 60\)/);
  assert.match(v, /root\.scrollHeight > root\.clientHeight \+ 1\) \{ _calGridScroll = root\.scrollTop;/);
  const sec = app('41-calendar-section.js');
  assert.match(sec, /if \(_calNarrow\(\)\) return \[0, 1, 2\]\.map\(i => _calAddDays\(iso, i\)\);/);
  assert.match(css('30-calendar.css'), /@container main \(max-width: 560px\) \{[\s\S]*\.cal-wrap\.mode-month \.mc \.ce \{ width: 6px; height: 6px;/);
});

test('Quick-add priority chips take the priority colour (P2 amber, P3 blue), in the dialog and inline', () => {
  assert.match(app('23-quick-add-dialog.js'), /t\.kind === 'priority' && \/\^p\[1-3\]\$\/i\.test\(t\.label\) \? ' qa-' \+ t\.label\.toLowerCase\(\)/);
  assert.match(app('31-task-views.js'), /t\.kind === 'priority' && \/\^p\[1-3\]\$\/i\.test\(t\.label\) \? ' qa-' \+ t\.label\.toLowerCase\(\)/);
  const c = css('20-main-tasks.css');
  assert.match(c, /\.qa-tok\.qa-priority\.qa-p2 \{ --pc: var\(--p2\); --pci: var\(--p2-ink\); \}/);
  assert.match(c, /\.qa-tok\.qa-priority\.qa-p3 \{ --pc: var\(--p3\); --pci: var\(--p3-ink\); \}/);
});

test('Detail panel: values read as text until hovered or focused; the page-header .ph class cannot leak into it', () => {
  const d = css('40-detail.css');
  assert.match(d, /\.detail-pane \.ph \{ display: inline; min-height: 0; margin: 0; gap: 0; \}/);
  assert.match(d, /\.dp-props select\.control \{[^}]*border-color: transparent; background-color: transparent;/);
  assert.match(d, /\.dp-props \.tags-input:focus-within \{/);
});

test('Palette: "New task in <stream>" comes before "Filter this list"; sooner-due tasks rank higher; footer fits', () => {
  const p = app('16-command-palette.js');
  assert.ok(p.indexOf('New task in ${streamHit[1].label}') < p.indexOf('Filter this list for'));
  assert.match(p, /const soon = dd === null \? 0 : dd < 0 \? 5 : dd <= 30 \? \(30 - dd\) \/ 5 : 0;/);
  assert.match(css('12-command-palette.css'), /\.cmd-f \{[^}]*gap: var\(--space-3\);[^}]*overflow: hidden;/);
});
