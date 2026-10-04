// 020-countdowns - upgrade the top-bar countdowns to the 2.0 widget schema
// (owner: Home / top-bar builder; rules in lib/home-topbar.mjs).
//
// Before 2.0 a countdown was {id, label, date, icon?, color?} and the FIRST one
// was the headline. From 2.0 each entry is a widget with explicit fields:
//   {id, type, label, date, time?, start?, icon, color, style, unit, headline,
//    showBar, warnDays, hideWhenPast, visible}  (+ tasks/clock for live widgets)
// The upgrade keeps what the bar shows: the first entry stays the headline
// (tinted), the others keep their order, labels, dates, colours and symbols
// (old colour names and emoji are mapped onto the design system's swatches and
// icons where there is a clear match; any other emoji is kept as it is).
// Idempotent: a second run finds nothing to change. Never deletes an entry.
//
// Optional, never applied by --auto:
//   --add-from <file.json>   also add the countdowns listed in that file, e.g.
//                            {"countdowns":[{"label":"Launch","date":"2027-01-15",
//                              "icon":"rocket","color":"teal","headline":false}]}
//                            Entries whose label already exists (any date) are
//                            skipped, so running it twice adds nothing twice.
//
//   node tools/migrate.mjs 020-countdowns --dry-run
//   node tools/migrate.mjs 020-countdowns --add-from <file.json> --dry-run
//   node tools/migrate.mjs 020-countdowns --add-from <file.json>

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runIfMain, existsSync } from './_lib.mjs';
import { upgradeCountdowns, normalizeWidget, storedWidget, setHeadline, normColor, widgetList, WIDGET_TYPES, DATED_TYPES, SWATCHES, EMOJI_ICONS } from '../../lib/home-topbar.mjs';

export const id = '020-countdowns';
export const description = 'Upgrade top-bar countdowns to the 2.0 widget schema (type, style, symbol, headline, show-as, warn, visible).';
export const auto = true;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const validIso = (s) => typeof s === 'string' && ISO.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

/** Read and check an --add-from file. Returns { items, problems }. */
export function readAdditions(file) {
  const problems = [];
  let raw;
  try { raw = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { throw new Error(`could not read ${file}: ${e.message}`); }
  const arr = Array.isArray(raw) ? raw : raw && Array.isArray(raw.countdowns) ? raw.countdowns : null;
  if (!arr) throw new Error(`${file} must hold an array or {"countdowns": [...]}`);
  const items = [];
  arr.forEach((x, i) => {
    if (!x || typeof x !== 'object') { problems.push(`entry ${i + 1}: not an object`); return; }
    const type = x.type === undefined ? 'countdown' : x.type;
    if (!DATED_TYPES.includes(type)) { problems.push(`entry ${i + 1}: type must be one of ${DATED_TYPES.join(', ')}`); return; }
    const label = clean(x.label, 80);
    if (!label) { problems.push(`entry ${i + 1}: label is empty`); return; }
    if (!validIso(x.date)) { problems.push(`entry ${i + 1}: date must be YYYY-MM-DD`); return; }
    if (x.start !== undefined && !validIso(x.start)) { problems.push(`entry ${i + 1}: start must be YYYY-MM-DD`); return; }
    if (type === 'progress' && !(x.start && x.start < x.date)) { problems.push(`entry ${i + 1}: a progress widget needs a start before its date`); return; }
    const w = { type, label, date: x.date };
    for (const k of ['time', 'start', 'style', 'unit', 'warnDays', 'hideWhenPast', 'showBar', 'visible', 'headline']) if (x[k] !== undefined) w[k] = x[k];
    if (x.icon !== undefined) { const ic = clean(x.icon, 32); w.icon = EMOJI_ICONS[ic] || ic; }
    if (x.color !== undefined) { const c = normColor(String(x.color), null); if (c) w.color = c; else problems.push(`entry ${i + 1}: unknown colour, using the default`); }
    items.push(w);
  });
  return { items, problems };
}

/** Add the items to a (2.0) list; returns { list, added, skipped }. */
export function addCountdowns(list, items) {
  const out = widgetList(list);
  let added = 0, skipped = 0;
  for (const it of items) {
    if (out.some(w => (w.label || '').toLowerCase() === it.label.toLowerCase())) { skipped++; continue; }
    const used = new Set(out.map(w => w.color));
    const base = { id: `cd-020-${slug(it.label)}`, headline: false, color: SWATCHES.find(c => !used.has(c)) || SWATCHES[out.length % SWATCHES.length], ...it };
    for (let n = 2; out.some(w => w.id === base.id); n++) base.id = `cd-020-${slug(it.label)}-${n}`;
    const w = normalizeWidget({ ...base, headline: false }, out.length, false);
    if (it.headline === true) out.push(w), setHeadline(out, w.id);
    else out.push(w);
    added++;
  }
  // Exactly one headline when there is anything at all.
  if (out.length && !out.some(w => w.headline)) setHeadline(out, out[0].id);
  return { list: out.map(storedWidget), added, skipped };
}

export async function run(ctx) {
  const notes = [];
  const state = await ctx.state.read();
  if (!state) return { changed: false, notes: ['no state file yet: nothing to upgrade'] };
  const before = Array.isArray(state.countdowns) ? state.countdowns : [];
  const up = upgradeCountdowns(before);
  let list = up.list;
  let changed = up.changed;
  notes.push(up.changed ? `countdowns: ${up.upgraded} of ${before.length} upgraded to the widget schema` : `countdowns: ${before.length} already on the widget schema`);
  const from = ctx.arg('--add-from');
  if (from) {
    const file = resolve(from);
    if (!existsSync(file)) throw new Error(`--add-from: no file at ${file}`);
    const { items, problems } = readAdditions(file);
    for (const p of problems) notes.push('add-from: ' + p);
    const r = addCountdowns(list, items);
    list = r.list;
    notes.push(`add-from: ${r.added} added, ${r.skipped} skipped (a countdown with that label already exists)`);
    if (r.added) changed = true;
  }
  if (changed) {
    state.countdowns = list;
    await ctx.state.write(state);
    const types = {};
    for (const w of list) types[w.type] = (types[w.type] || 0) + 1;
    notes.push(`top bar now: ${list.length} widget(s) (${Object.entries(types).map(([k, n]) => `${n} ${WIDGET_TYPES[k].label.toLowerCase()}`).join(', ')})`);
  }
  return { changed, notes };
}

await runIfMain(import.meta.url, { id, description, auto, run });
