// lib/calendar-sources.mjs - calendars from more than one source.
//
// The Google Calendar preset keeps its tuned job and file (lib/calendar.mjs,
// <data>/calendar/events.json). Every other calendar source has its own
// snapshot, <data>/calendar/sources/<sourceId>.json =
//   { version:1, sourceId, fetchedAt, window:{from,to}, calendars:[{id,name}], events:[Event], warnings? }
// written atomically after each fetch:
//   kind 'ical'  fetched by the server (lib/ical.mjs), no AI
//   kind 'mcp'   the generic adapter (lib/source-adapter.mjs)
// Calendar ids outside Google are '<sourceId>/<calendar id at the source>'.
//
// mergeCalendarData() builds what GET /api/calendar returns: every enabled
// source's calendars (with sourceId, sourceLabel and whether it starts
// switched on: config.myEmails, "only my stuff by default") and their events,
// de-duplicated across sources (iCalUID, or start + title).
//
// Node stdlib only.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readJson, writeJson, withLock } from './fsutil.mjs';
import { fetchIcal, parseIcal, expandIcal } from './ical.mjs';
import { fetchFromSource, describeRejected } from './source-adapter.mjs';
import { dedupeEventsAcross, calendarDefaultOn, COLOURS, readSourcesFile, legacySources } from './sources.mjs';
import { cleanText } from './calendar-jobkit.mjs';

const SNAP_ID = /^[a-z0-9][a-z0-9-]{1,40}$/;
export function sourceSnapshotFile(paths, sourceId) {
  if (!SNAP_ID.test(String(sourceId))) throw new Error('bad source id');
  return join(paths.calendar, 'sources', `${sourceId}.json`);
}

export async function readSourceSnapshot(paths, sourceId) {
  const f = sourceSnapshotFile(paths, sourceId);
  if (!existsSync(f)) return null;
  const doc = await readJson(f, { fallback: null }).catch(() => null);
  return doc && Array.isArray(doc.events) ? doc : null;
}

/**
 * Fetch one non-Google calendar source for [from, to]. Resolves
 * {calendars, events, warnings, count}; throws an Error with .code.
 */
export async function fetchCalendarSource(source, { from, to, timeZone, serverDef, denyServers, run, fetchFn = fetchIcal, onLine } = {}) {
  const accountOn = (id) => { const a = (source.accounts || []).find(x => x.id === id); return !a || a.enabled !== false; };
  if (source.kind === 'ical') {
    const got = await fetchFn(source.url);
    const parsed = parseIcal(got.text);
    if (!parsed.events.length && !/BEGIN:VCALENDAR/i.test(got.text)) throw Object.assign(new Error('That link did not return a calendar (.ics).'), { code: 'NOT_ICAL' });
    const calId = `${source.id}/feed`;
    const ex = expandIcal(parsed, { from, to, timeZone, calendarId: calId, idPrefix: 'ic' + source.id.replace(/[^a-z0-9]/g, '').slice(-6) });
    const warnings = [];
    if (ex.skippedRules) warnings.push(`${ex.skippedRules} repeating event(s) use a rule the dashboard cannot read; only their first date is shown.`);
    if (ex.dropped) warnings.push(`${ex.dropped} event(s) could not be read.`);
    const name = cleanText(parsed.name, 60) || source.label;
    return { calendars: [{ id: 'feed', name }], events: accountOn('feed') ? ex.events : [], warnings, count: ex.events.length };
  }
  if (source.kind === 'mcp') {
    const r = await fetchFromSource(source, { from, to, timeZone, serverDef, denyServers, run, accountOn, onLine });
    const warnings = [];
    const rej = describeRejected(r.rejected);
    if (rej) warnings.push(`Left out: ${rej}.`);
    if (r.failedCalls) warnings.push(`${r.failedCalls} of ${r.calls} tool calls failed.`);
    return { calendars: r.calendars, events: r.events, warnings, count: r.events.length };
  }
  throw Object.assign(new Error('Not a calendar source.'), { code: 'BAD_REQUEST' });
}

export async function saveSourceSnapshot(paths, sourceId, { from, to, calendars, events, warnings }, now = Date.now()) {
  const f = sourceSnapshotFile(paths, sourceId);
  const doc = { version: 1, sourceId, fetchedAt: new Date(now).toISOString(), window: { from, to }, count: events.length, calendars, events, ...(warnings && warnings.length ? { warnings } : {}) };
  await withLock(f, () => writeJson(f, doc, { trailingNewline: true }));
  return doc;
}

/**
 * Everything the calendar shows, read straight from the data folder (for the
 * MCP / actions layer, which has no server context): Google's events.json
 * (or the old snapshot) plus every enabled source's snapshot, merged.
 * Returns {fetchedAt, calendars, events} or null when there is nothing yet.
 */
export async function readMergedCalendar(paths, { myEmails = [] } = {}) {
  const doc = await readSourcesFile(paths.root).catch(() => null);
  const sources = (doc ? doc.sources : legacySources({ evidence: { calendar: true } })).filter(s => s.capability === 'calendar');
  let googleDoc = null;
  for (const f of [join(paths.calendar, 'events.json'), paths.calendarFile]) {
    if (!existsSync(f)) continue;
    googleDoc = await readJson(f, { fallback: null }).catch(() => null);
    if (googleDoc && Array.isArray(googleDoc.events)) break;
    googleDoc = null;
  }
  const snapshots = {};
  for (const s of sources) if (s.preset !== 'google-calendar' && s.enabled) snapshots[s.id] = await readSourceSnapshot(paths, s.id).catch(() => null);
  const m = mergeCalendarData({ googleDoc, snapshots, sources, myEmails });
  if (!m.events.length && !googleDoc) return null;
  return { fetchedAt: m.fetchedAt, calendars: m.calendars, events: m.events };
}

/**
 * GET /api/calendar's calendars + events from the Google doc (events.json, or
 * null) and the other sources' snapshots. `sources` are the calendar
 * sources (all, enabled or not); disabled ones and switched-off accounts are
 * left out. Returns {calendars, events, sources:[summary], fetchedAt}.
 */
export function mergeCalendarData({ googleDoc, snapshots = {}, sources = [], myEmails = [] }) {
  const calendars = [], groups = [], summary = [];
  let fetchedAt = null;
  const latest = (a) => { if (a && (!fetchedAt || a > fetchedAt)) fetchedAt = a; };
  const gSrc = sources.find(s => s.preset === 'google-calendar');
  const legacyOnly = !sources.length;               // no sources model yet: Google as before
  if (googleDoc && (legacyOnly || (gSrc && gSrc.enabled))) {
    const off = new Set(((gSrc && gSrc.accounts) || []).filter(a => a.enabled === false).map(a => a.id));
    const gcals = (Array.isArray(googleDoc.calendars) ? googleDoc.calendars : []).filter(c => c && !off.has(c.id));
    for (const c of gcals) {
      calendars.push({ ...c, sourceId: gSrc ? gSrc.id : 'calendar-google', sourceLabel: gSrc ? gSrc.label : 'Google Calendar', defaultOn: calendarDefaultOn(c, myEmails) });
    }
    const events = (googleDoc.events || []).filter(e => !off.size || !(e.calendars || [e.calendarId]).every(id => off.has(id)));
    // An old snapshot (or demo data) has events but no calendar list: one row for them all,
    // so they can be shown next to other sources' calendars ('google' is the page's id for it).
    if (!gcals.length && events.some(e => !e.calendarId)) {
      calendars.push({ id: 'google', name: gSrc ? gSrc.label : 'Google Calendar', color: (gSrc && gSrc.colour) || 'blue', sourceId: gSrc ? gSrc.id : 'calendar-google', sourceLabel: gSrc ? gSrc.label : 'Google Calendar', defaultOn: true, count: events.length });
    }
    groups.push({ sourceId: gSrc ? gSrc.id : 'calendar-google', events });
    latest(googleDoc.fetchedAt);
    if (gSrc) summary.push({ id: gSrc.id, label: gSrc.label, kind: gSrc.kind, colour: gSrc.colour, fetchedAt: googleDoc.fetchedAt || null, count: events.length, calendars: gcals.length, partial: !!googleDoc.partial, source: googleDoc.source || 'claude' });
  }
  for (const s of sources) {
    if (s.preset === 'google-calendar' || !s.enabled) continue;
    const doc = snapshots[s.id];
    const accOn = (id) => { const a = (s.accounts || []).find(x => x.id === id); return !a || a.enabled !== false; };
    const cals = (doc && Array.isArray(doc.calendars) ? doc.calendars : []).filter(c => c && accOn(c.id));
    cals.forEach((c, i) => {
      const acc = (s.accounts || []).find(a => a.id === c.id);
      const colour = (acc && acc.colour) || (i === 0 ? s.colour : COLOURS[(COLOURS.indexOf(s.colour) + i) % COLOURS.length]);
      calendars.push({ id: `${s.id}/${c.id}`, name: cleanText((acc && acc.renamed && acc.name) || c.name, 60) || s.label, color: colour, sourceId: s.id, sourceLabel: s.label, count: 0,
        defaultOn: s.kind === 'ical' ? true : calendarDefaultOn({ id: c.id }, myEmails) });
    });
    const keep = new Set(cals.map(c => `${s.id}/${c.id}`));
    const events = (doc && Array.isArray(doc.events) ? doc.events : []).filter(e => keep.has(e.calendarId));
    groups.push({ sourceId: s.id, events });
    latest(doc && doc.fetchedAt);
    summary.push({ id: s.id, label: s.label, kind: s.kind, colour: s.colour, fetchedAt: (doc && doc.fetchedAt) || null, count: events.length, calendars: cals.length, ...(doc && doc.warnings ? { warnings: doc.warnings } : {}) });
  }
  const events = dedupeEventsAcross(groups);
  const counts = new Map();
  for (const e of events) for (const id of e.calendars || [e.calendarId]) if (id) counts.set(id, (counts.get(id) || 0) + 1);
  for (const c of calendars) if (!c.count || c.sourceId !== 'calendar-google') c.count = counts.get(c.id) || c.count || 0;
  return { calendars, events, sources: summary, fetchedAt };
}
