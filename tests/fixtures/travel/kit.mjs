// tests/fixtures/travel/kit.mjs - the travel tests' kit (synthetic data only; no personal data).
//
//   L                 a fresh copy of the travel rules (lib/travel-logic.mjs: 07 clock + 69 data + 69 logic)
//   P                 the place index over places.json (synthetic tables)
//   ms(iso)           an instant from an ISO string with an offset
//   timed(id, summary, start, end, extra)   a Google-shaped timed event; start/end = ISO with offset,
//                     or {dateTime, timeZone}
//   allDay(id, summary, from, to, extra)    an all-day event, `to` INCLUSIVE (the kit adds Google's exclusive end)
//   home              London home {zone, cc, cityId, label, ccy}
//   snapInput(o)      trBuildSnapshot's input with defaults; snap(o) = the snapshot
//   ctxFor(o)         the suggestion ctx (tests/fixtures/suggest/harness.mjs makeCtx) + ctx.travel
//   scenario(name, over)  a JSON scenario from this folder (events, tasks, people, decisions...)

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTravelLogic } from '../../../lib/travel-logic.mjs';
import { makeCtx, ev as sgEv, task as sgTask } from '../suggest/harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const L = loadTravelLogic();
export const PLACES = JSON.parse(readFileSync(join(HERE, 'places.json'), 'utf8'));
export const P = L.trPlaceIndex(PLACES);
export const ms = (iso) => { const t = Date.parse(iso); if (!Number.isFinite(t)) throw new Error('bad instant ' + iso); return t; };
export const home = Object.freeze({ zone: 'Europe/London', cc: 'GB', cityId: 'london-gb', label: 'London', ccy: 'GBP' });

const edge = (x) => (typeof x === 'string' ? { dateTime: x } : x);
export function timed(id, summary, start, end, extra = {}) {
  return Object.assign({ id, summary, start: edge(start), end: edge(end || start), status: 'confirmed', calendarId: 'me@example.com' }, extra);
}
export function allDay(id, summary, from, to, extra = {}) {
  const [y, m, d] = to.split('-').map(Number);
  const end = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return Object.assign({ id, summary, start: { date: from }, end: { date: end }, allDay: true, status: 'confirmed', calendarId: 'me@example.com' }, extra);
}
export const me = { email: 'me@example.com', self: true, response: 'accepted' };
export const riley = { email: 'riley@example.com', name: 'Riley Test' };
export const morgan = { email: 'morgan@example.net', name: 'Morgan Test' };
export const casey = { email: 'casey@example.com', name: 'Casey Test' };
export const PEOPLE = [
  { id: 'riley', name: 'Riley Test', email: 'riley@example.com' },
  { id: 'morgan', name: 'Morgan Test', email: 'morgan@example.net', tz: 'America/New_York' },
  { id: 'casey', name: 'Casey Test', email: 'casey@example.com' },
];

/** trBuildSnapshot's input. o.now: ISO with offset (or ms); o.zone / o.system default London. */
export function snapInput(o = {}) {
  return Object.assign({
    now: typeof o.now === 'number' ? o.now : ms(o.now || '2026-10-08T09:00:00+01:00'),
    zone: 'Europe/London', system: o.system || o.zone || 'Europe/London', home, on: true, cfg: {}, overrideReady: false,
    events: [], eventMeta: {}, tasks: [], people: PEOPLE, myEmails: ['me@example.com'], changes: [], rows: null, decisions: {},
    work: { days: [1, 2, 3, 4, 5], start: 540, end: 1080 }, eveningHour: 17, P, holidaysFor: null, geo: null, weather: {},
  }, o, { now: typeof o.now === 'number' ? o.now : ms(o.now || '2026-10-08T09:00:00+01:00') });
}
export function snap(o = {}) { return L.trBuildSnapshot(snapInput(o)); }

/** A task in the suggestion ctx's shape. */
export const task = (o) => sgTask(o);
/** An event in the suggestion ctx's cal.days shape (minutes on the wall clock). */
export const calEv = (start, end, o) => sgEv(start, end, o);

/**
 * The suggestion ctx with ctx.travel: o = snapInput options + {calDays, tasks (ctx shape), caps, work}.
 * ctx.now is the snapshot's wall clock in its zone.
 */
export function ctxFor(o = {}) {
  const input = snapInput(o);
  const w = L.trWall(input.now, input.zone);
  const ctx = makeCtx({ now: `${w.date}T${String(Math.floor(w.min / 60)).padStart(2, '0')}:${String(w.min % 60).padStart(2, '0')}`, tasks: input.tasks,
    events: o.calDays || {}, caps: Object.assign({ travel: true }, o.caps || {}), work: o.workCtx });
  ctx.travel = L.trBuildSnapshot(input);
  return ctx;
}

/** A JSON scenario from this folder: {events, tasks, people?, eventMeta?, decisions?, ...}; `over` patches it. */
export function scenario(name, over = {}) {
  const raw = JSON.parse(readFileSync(join(HERE, name + '.json'), 'utf8'));
  const events = (raw.events || []).map(e => (e.allDay ? allDay(e.id, e.summary, e.from, e.to, e.extra || {}) : timed(e.id, e.summary, e.start, e.end, e.extra || {})));
  const tasks = (raw.tasks || []).map(t => sgTask(t));
  return Object.assign({ events, tasks, eventMeta: raw.eventMeta || {}, people: raw.people || PEOPLE, decisions: raw.decisions || {} }, over);
}
