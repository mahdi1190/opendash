// The local-time ratchet (travel spec 2.7, 2.8): page files may only read the
// browser's clock less, never more, than tests/fixtures/clock-audit-baseline.json
// says (a new file starts at 0), and Clock's override switch is on exactly when
// every display file asks Clock. tools/clock-audit.mjs prints the sites
// (--sites <file>) and lowers the baseline (--lower).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countAll, countText, readBaseline, rises, displayClean, overrideConstant, DISPLAY_FILES, sitesIn } from '../tools/clock-audit.mjs';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('the audit counts the local-clock patterns and skips clock-ok lines', () => {
  assert.equal(countText('const d = new Date(); d.getHours(); x.getMinutes(); y.getDate(); z.getDay(); m.getMonth(); n.getFullYear();'), 7);
  assert.equal(countText('d.setHours(0, 0, 0, 0); new Date(ms).toISOString().slice(0, 10); new Date().toISOString().slice(0,10)'), 4);
  assert.equal(countText('Date.now(); new Date(ms); d.getUTCHours(); d.getTime(); Clock.parts(ms).h'), 0, 'instants and UTC reads are fine');
  assert.equal(countText('const d = new Date(); // clock-ok: an instant for a log line'), 0);
  assert.equal(countText('const d = new Date(); // clock-ok:'), 1, 'a clock-ok mark needs a reason');
  assert.deepEqual(sitesIn('a\nconst t = new Date();\nb').map(s => s.line), [2]);
});

test('no page file reads the browser clock more than the baseline allows (new files start at 0)', () => {
  const counts = countAll();
  const base = readBaseline();
  const up = rises(counts, base);
  assert.deepEqual(up, [], 'Use Clock (src/app/07-core-clock.js) for now, today and wall times: '
    + up.map(r => `${r.file} ${r.was} -> ${r.now} (node tools/clock-audit.mjs --sites ${r.file})`).join('; '));
});

test('the override switch (CLOCK_OVERRIDE_READY) matches the display files being at 0', () => {
  for (const f of DISPLAY_FILES) assert.ok(existsSync(join(ROOT, f)), `display file listed but missing: ${f}`);
  const ready = overrideConstant();
  assert.notEqual(ready, null, 'CLOCK_OVERRIDE_READY is declared in 07-core-clock-logic.js');
  assert.equal(ready, displayClean(countAll()), ready
    ? 'the override is on, but a display file reads the browser clock again'
    : 'every display file asks Clock now: switch CLOCK_OVERRIDE_READY on');
});
