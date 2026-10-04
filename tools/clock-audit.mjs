// tools/clock-audit.mjs - the local-time ratchet (travel spec 2.7).
//
// The page must ask window.Clock (src/app/07-core-clock.js) for "now", "today"
// and wall times, so that "today" on the page, on the server and in the MCP is
// the same date when the computer's time zone changes. This counts the places
// that still read the browser's own clock, per file:
//
//   new Date()  .getHours()  .getMinutes()  .getDate()  .getDay()  .getMonth()
//   .getFullYear()  .setHours(  toISOString().slice(0, 10)
//
// in src/app and src/finance, outside 07-core-clock*.js. A line with a
// `// clock-ok: <reason>` comment is not counted (Date.now() and new Date(ms)
// used only as instants are never counted).
//
// tests/clock-audit.test.mjs compares the counts with
// tests/fixtures/clock-audit-baseline.json: a file's count may go down, never
// up, and a new file starts at 0. It also checks that Clock's override switch
// (CLOCK_OVERRIDE_READY in 07-core-clock-logic.js) is on exactly when every
// "display" file below is at 0.
//
//   node tools/clock-audit.mjs            print the counts (display files first)
//   node tools/clock-audit.mjs --lower    lower the baseline to the current counts
//                                         (never raises one, never adds a file)

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BASELINE_FILE = join(ROOT, 'tests', 'fixtures', 'clock-audit-baseline.json');
export const AUDIT_DIRS = Object.freeze(['src/app', 'src/finance']);

// The patterns, as the spec lists them. Each match on a line counts once.
export const PATTERNS = Object.freeze([
  /\bnew Date\(\s*\)/g,
  /\.getHours\(\s*\)/g,
  /\.getMinutes\(\s*\)/g,
  /\.getDate\(\s*\)/g,
  /\.getDay\(\s*\)/g,
  /\.getMonth\(\s*\)/g,
  /\.getFullYear\(\s*\)/g,
  /\.setHours\(/g,
  /\.toISOString\(\s*\)\.slice\(\s*0\s*,\s*10\s*\)/g,
]);
export const OK_MARK = /\/\/\s*clock-ok:\s*\S/;

// Files that may read the browser's clock directly: the clock itself.
export const EXEMPT = (rel) => /^src\/app\/07-core-clock[^/]*\.js$/.test(rel);

// The page display code of spec 2.7 (the SWEEP list). Clock's override
// ("Keep London time", "Always: <zone>") is only safe once all of these are at 0.
export const DISPLAY_FILES = Object.freeze([
  'src/app/40-calendar.js', 'src/app/41-calendar-section.js', 'src/app/42-calendar-views.js',
  'src/app/45-calendar-grid-logic.js', 'src/app/46-cal-event-edit-logic.js', 'src/app/45-calendar-grid-edit.js',
  'src/app/22-quick-add.js', 'src/app/15-nav-sidebar.js',
  'src/app/12-home-head.js', 'src/app/12-home-focus-card.js', 'src/app/12-home-platform.js',
  'src/app/12-home-w-people.js', 'src/app/12-home-w-week.js', 'src/app/12-home-w-schedule.js', 'src/app/12-home-cal.js',
  'src/app/12-home-meet-logic.js',
  'src/app/31-task-views.js', 'src/app/32-tasks-ui.js', 'src/app/30-task-row.js', 'src/app/20-task-model.js',
  'src/app/20-task-plan.js', 'src/app/21-task-query.js',
  'src/app/51-people-section.js', 'src/app/53-people-contact.js', 'src/app/55-email-google.js', 'src/app/63-resources.js',
  'src/app/66-autolink.js',
  'src/app/75-modals.js', 'src/app/76-brief-evening.js', 'src/app/77-brief-review.js', 'src/app/79-story-morning.js',
  'src/app/79-story-evening.js', 'src/app/79-story-weekly.js', 'src/app/79-story-weekly-model.js',
  'src/app/16-command-palette.js', 'src/app/05-core-state-init.js', 'src/app/01-core-state.js',
]);

/** Count the local-clock reads in one file's text. Lines marked clock-ok are skipped. */
export function countText(text) {
  let n = 0;
  for (const line of String(text).split('\n')) {
    if (OK_MARK.test(line)) continue;
    for (const re of PATTERNS) { re.lastIndex = 0; const m = line.match(re); if (m) n += m.length; }
  }
  return n;
}

/** The lines that count, for a report: [{line, text}]. */
export function sitesIn(text) {
  const out = [];
  String(text).split('\n').forEach((line, i) => {
    if (OK_MARK.test(line)) return;
    if (PATTERNS.some(re => { re.lastIndex = 0; return re.test(line); })) out.push({ line: i + 1, text: line.trim().slice(0, 160) });
  });
  return out;
}

/** {'src/app/10-header.js': 12, ...} for every audited file (0s included). */
export function countAll(root = ROOT) {
  const out = {};
  for (const dir of AUDIT_DIRS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs).filter(n => n.endsWith('.js')).sort()) {
      const rel = `${dir}/${f}`;
      if (EXEMPT(rel)) continue;
      out[rel] = countText(readFileSync(join(abs, f), 'utf8'));
    }
  }
  return out;
}

export function readBaseline(file = BASELINE_FILE) {
  const j = JSON.parse(readFileSync(file, 'utf8'));
  return j && j.counts && typeof j.counts === 'object' ? j.counts : {};
}

/** Files whose count went up (or a new file above 0): [{file, was, now}]. */
export function rises(counts, baseline) {
  const out = [];
  for (const [file, now] of Object.entries(counts)) {
    const was = Object.prototype.hasOwnProperty.call(baseline, file) ? baseline[file] : 0;
    if (now > was) out.push({ file, was, now });
  }
  return out;
}

/** True when every display file is at 0 (the override may be switched on). */
export function displayClean(counts) {
  return DISPLAY_FILES.every(f => !counts[f]);
}

/** The CLOCK_OVERRIDE_READY constant as written in the page's clock logic. */
export function overrideConstant(root = ROOT) {
  const t = readFileSync(join(root, 'src', 'app', '07-core-clock-logic.js'), 'utf8');
  const m = /const CLOCK_OVERRIDE_READY\s*=\s*(true|false)\s*;/.exec(t);
  return m ? m[1] === 'true' : null;
}

function writeBaseline(counts) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE_FILE, JSON.stringify({
    about: 'Local-clock reads per page file (tools/clock-audit.mjs). Counts may go down, never up; new files start at 0.',
    counts: sorted,
  }, null, 1) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const counts = countAll();
  if (process.argv.includes('--lower')) {
    const base = existsSync(BASELINE_FILE) ? readBaseline() : null;
    if (!base) { console.error('no baseline yet: tests/fixtures/clock-audit-baseline.json'); process.exit(1); }
    const next = {};
    for (const [f, was] of Object.entries(base)) if (f in counts) next[f] = Math.min(was, counts[f]);
    writeBaseline(next);
    console.log('baseline lowered');
  } else if (process.argv.includes('--init')) {
    // --init [--from <checkout>]: start a baseline (from another checkout's counts, e.g. the tree before a change).
    const from = process.argv.includes('--from') ? process.argv[process.argv.indexOf('--from') + 1] : null;
    writeBaseline(from ? countAll(resolve(from)) : counts);
    console.log('baseline written');
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const disp = DISPLAY_FILES.reduce((a, f) => a + (counts[f] || 0), 0);
  console.log(`local-clock reads: ${total} in ${Object.values(counts).filter(Boolean).length} files; display files: ${disp}; override ready: ${displayClean(counts)}`);
  for (const [f, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) if (n) console.log(`${String(n).padStart(4)}  ${f}${DISPLAY_FILES.includes(f) ? '  (display)' : ''}`);
  if (process.argv.includes('--sites')) {
    const want = process.argv[process.argv.indexOf('--sites') + 1];
    if (want) for (const s of sitesIn(readFileSync(join(ROOT, want), 'utf8'))) console.log(`${want}:${s.line}  ${s.text}`);
  }
}
