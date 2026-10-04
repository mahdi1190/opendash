// Design-polish regressions for People, Tags, Settings, Connections, Finances,
// Email triage, the top-bar customiser and the demo data (onboarding).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFakeData, DEMO_PEOPLE } from '../tools/make-fake-data.mjs';
import { financeSources } from '../build.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = (f) => readFileSync(join(ROOT, 'src', f), 'utf8');
const js = (f) => readFileSync(join(ROOT, 'src', 'app', f), 'utf8');

test('demo people are shaped like the People mockup: role, organisation and group are separate fields', () => {
  for (const p of DEMO_PEOPLE) {
    assert.ok(!/·/.test(p.role), `${p.id}: role holds only the role`);
    assert.equal(typeof p.group, 'string', `${p.id}: has a group (the filter chips)`);
  }
  assert.ok(DEMO_PEOPLE.filter(p => p.org).length >= 4, 'most demo people have an organisation');
});

test('demo calendar names demo people as attendees, so People shows next meeting and last contact', () => {
  const d = buildFakeData({ today: new Date('2026-03-10T09:00:00') });
  const emails = new Set(DEMO_PEOPLE.map(p => p.email));
  const withPeople = d.calendar.events.filter(e => (e.attendees || []).some(a => !a.self && emails.has(a.email)));
  assert.ok(withPeople.length >= 5, 'several events have demo people as attendees');
  for (const e of d.calendar.events) for (const a of e.attendees || []) assert.match(a.email, /@example\.(com|org|net)$/);
});

test('demo data has notes on people, names not yet in People, and a little tag mess for the clean-up', () => {
  const s = buildFakeData({ today: new Date('2026-03-10T09:00:00') }).state;
  assert.ok(s.people.some(p => Array.isArray(p.notes) && p.notes.length), 'a person has notes');
  for (const p of s.people) for (const n of p.notes || []) assert.ok(n.id && n.text && Number.isFinite(n.ts));
  const titles = s.custom.map(t => t.title).join('\n');
  assert.match(titles, /Sam Rivera/); assert.match(titles, /Noor Haddad/);
  const tags = new Set(s.custom.flatMap(t => t.tags || []));
  for (const t of ['meeting', 'meetings', 'review', 'reviews']) assert.ok(tags.has(t), t);
});

test('person panel: streams fall back to the streams of their tasks (same rule as the table)', () => {
  assert.match(js('51-people-section.js'), /_pplStreamsFromTasks\(f\.tasks\)\)\.filter\(s => STREAMS\[s\]\)\.slice\(0, 4\)/);
});

test('tag manager on a phone keeps the sort, the close button and the suggestions (nothing hidden)', () => {
  const c = css('styles/26-tags.css');
  const m = c.match(/@media \(max-width: 760px\) \{[\s\S]*?\n\}/)[0];
  assert.doesNotMatch(m, /\.tm-side \{ display: none/);
  assert.doesNotMatch(m, /\.tm-h \.seg \{ display: none/);
  assert.match(m, /\.tm-h \.tm-x \{ grid-column: 4; grid-row: 1;/);
  assert.match(m, /\.tm-f \{ flex-wrap: wrap;/);
});

test('email triage: row actions are visible without hover on phones and touch screens', () => {
  const c = css('styles/37-email.css');
  assert.match(c, /@media \(hover: none\) \{\s*\.em-row \.em-a > \.btn, \.em-row \.em-a > a\.btn \{ opacity: 1; \}/);
  const m = c.match(/@container main \(max-width: 720px\) \{[\s\S]*?\n\}/)[0];
  assert.match(m, /\.em-row \.em-a > \.btn, \.em-row \.em-a > a\.btn \{ opacity: 1; \}/, 'beats .em-a > .btn:not(.btn-icon)');
  assert.match(m, /\.em-a \{ flex-basis: 100%;/);
});

test('settings: one control width down the page; stacked rows stay full width', () => {
  const c = css('styles/57-settings.css');
  assert.match(c, /\.set-c > \.control, \.set-c > select\.control \{ width: 240px; min-width: 0; \}/);
  assert.match(c, /\.set-row-stack > \.set-c > \.control \{ width: 100%; \}/);
});

test('connections and sources: subtitles and footers wrap instead of being cut off', () => {
  const c = css('styles/56-connections.css'), s = css('styles/56-sources.css');
  assert.match(c, /\.conn-sub \{[^}]*-webkit-line-clamp: 2/);
  assert.doesNotMatch(c.match(/\.conn-when \{[^}]*\}/)[0], /nowrap|ellipsis/);
  assert.match(s, /\.src-sub \{[^}]*-webkit-line-clamp: 2/);
});

test('finances: KPI changes wrap instead of "vs previous 9…"; the gated Sync caret matches its button', () => {
  const c = financeSources(ROOT).css;   // src/finance/*.css in name order
  assert.match(c, /\.fv-kpi-d \{[^}]*flex-wrap: wrap/);
  assert.match(c, /\.fv-sync:has\(> \.fv-sync-main\.is-gated\) \.fv-sync-caret \{ opacity: 0\.55;/);
});

test('date field: an empty time reads "Add time", not the browser\'s --:--', () => {
  assert.match(js('10-header-editor.js'), /<span>Add time<\/span>/);
  const c = css('styles/11-topbar.css');
  assert.match(c, /\.ui-datef-time\.is-empty:not\(:focus\) \{ color: transparent; \}/);
  assert.match(c, /\.ui-datef-time:not\(\.is-empty\) \+ \.ui-datef-tph, \.ui-datef-time:focus \+ \.ui-datef-tph \{ display: none; \}/);
});
