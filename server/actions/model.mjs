// server/actions/model.mjs - shared vocabulary of the actions layer:
// errors that help a caller (often a model) correct itself, text sanitising,
// ISO dates in the user's time zone, ids, and lookups (streams, people, tags).
//
// Node stdlib only. Nothing here touches the disk.

import { randomBytes } from 'node:crypto';

// ─── Errors ────────────────────────────────────────────────────────────────
// Every refusal carries a stable code, the field at fault and, whenever there
// is a closed set, the valid values - so a caller can fix the call and retry.
export class ActionError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    this.status = extra.status || STATUS_FOR[code] || 400;
    for (const k of EXTRA_KEYS) if (extra[k] !== undefined) this[k] = extra[k];
  }
  toJSON() {
    const o = { code: this.code, message: this.message };
    for (const k of ['opIndex', 'op', ...EXTRA_KEYS, 'more']) if (this[k] !== undefined && !(k in o)) o[k] = this[k];
    return o;
  }
}
const EXTRA_KEYS = ['field', 'valid', 'hint', 'candidates', 'opIndex', 'op', 'errors', 'reasons', 'preview', 'confirm', 'conflicts', 'version'];
const STATUS_FOR = { NOT_FOUND: 404, CONFLICT: 409, VERSION_MISMATCH: 409, PREVIEW_CHANGED: 409, NEEDS_CONFIRM: 428, UNAUTHORIZED: 401, FORBIDDEN: 403 };

// ─── Vocabulary ────────────────────────────────────────────────────────────
export const STATUSES = Object.freeze(['todo', 'doing', 'done']);
export const PRIORITIES = Object.freeze(['p1', 'p2', 'p3', 'p0']);
export const PRIORITY_ALIASES = Object.freeze({ high: 'p1', medium: 'p2', med: 'p2', low: 'p3', none: 'p0', urgent: 'p1' });
export const PRIORITY_INPUTS = Object.freeze([...PRIORITIES, ...Object.keys(PRIORITY_ALIASES)]);
export const PRIORITY_LABELS = Object.freeze({ p1: 'high', p2: 'medium', p3: 'low', p0: 'no priority' });
export const RECURRENCES = Object.freeze(['none', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly']);
export const SOURCES = Object.freeze(['ui', 'assistant', 'mcp', 'script', 'autolink']);   // autolink: lib/autolink.mjs (background auto-linking)

export const LIMITS = Object.freeze({
  title: 300, detail: 20000, note: 20000, subtask: 300, tag: 40, name: 100, label: 80,
  email: 200, role: 200, phone: 60, url: 500, alias: 60, reason: 300, icon: 16, color: 40, client: 80,
});

// ─── Text sanitising ───────────────────────────────────────────────────────
// Control characters go (they break rendering and logs), so do bidi overrides
// (they make text read differently from what it is). Unicode, emoji and
// zero-width joiners (needed by emoji sequences) stay.
// (Built from strings so this file stays plain ASCII.)
const BIDI = '\\u202a-\\u202e\\u2066-\\u2069\\ufeff';
const CTRL_SINGLE = new RegExp(`[\\u0000-\\u001f\\u007f-\\u009f${BIDI}]`, 'g');
const CTRL_MULTI = new RegExp(`[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f${BIDI}]`, 'g');
const LINE_BREAKS = new RegExp('[\\r\\n\\t\\u2028\\u2029]+', 'g');
const PARA_SEPS = new RegExp('[\\u2028\\u2029]', 'g');
export const COMBINING = new RegExp('[\\u0300-\\u036f]', 'g');

/** One-line text: control chars -> space, whitespace collapsed, trimmed, capped. */
export function cleanLine(v, max) {
  let s = String(v ?? '').replace(LINE_BREAKS, ' ').replace(CTRL_SINGLE, '').replace(/ {2,}/g, ' ').trim();
  return capChars(s, max);
}
/** Multi-line text: keeps \n and \t, normalises line ends, capped. */
export function cleanText(v, max) {
  let s = String(v ?? '').replace(/\r\n?/g, '\n').replace(PARA_SEPS, '\n').replace(CTRL_MULTI, '');
  s = s.replace(/[ \t]+$/gm, '').replace(/\n{4,}/g, '\n\n\n').trim();
  return capChars(s, max);
}
/** Cap by code points, never splitting a surrogate pair. */
function capChars(s, max) {
  if (!max || s.length <= max) return s;
  return Array.from(s).slice(0, max).join('').trim();
}

/** Tags: lower case, '#' dropped, spaces/underscores -> '-', only [a-z0-9-] plus letters of any script. */
export function normTag(v) {
  let s = cleanLine(v, 80).toLowerCase().replace(/^#+/, '').replace(/[\s_/]+/g, '-');
  s = s.replace(/[^\p{L}\p{N}-]/gu, '').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  return capChars(s, LIMITS.tag);
}

export function slug(v, max = 40) {
  const s = String(v ?? '').normalize('NFKD').replace(COMBINING, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return s.slice(0, max).replace(/-$/, '');
}

// ─── Dates (ISO only, in the user's time zone) ─────────────────────────────
export const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
export function isIsoDate(s) {
  if (typeof s !== 'string' || !ISO_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
export function isoInTz(date, timeZone) {
  try {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const g = (t) => p.find(x => x.type === t).value;
    return `${g('year')}-${g('month')}-${g('day')}`;
  } catch {
    const d = date;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
/** 'YYYY-MM-DDTHH:MM' of an instant on the user's own clock (their time zone; no offset), or null. */
export function stampInTz(date, timeZone) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  let time;
  try { time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d); }
  catch { time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  return `${isoInTz(d, timeZone)}T${time}`;
}
export function addDaysIso(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
export function addMonthsIso(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, last));
  return dt.toISOString().slice(0, 10);
}
export function daysBetween(fromIso, toIso) {
  const a = Date.UTC(...fromIso.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0)));
  const b = Date.UTC(...toIso.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0)));
  return Math.round((b - a) / 86400000);
}
export const WEEKDAYS = Object.freeze(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
export function weekdayOf(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
/** One step of a repeat rule; month steps keep the anchor day, clamped (31 Jan -> 28 Feb -> 31 Mar). */
function recurrenceStepIso(from, rec, anchorDay) {
  if (rec === 'daily') return addDaysIso(from, 1);
  if (rec === 'weekly') return addDaysIso(from, 7);
  if (rec === 'biweekly') return addDaysIso(from, 14);
  if (rec === 'monthly') {
    const next = addMonthsIso(from, 1);
    if (!anchorDay) return next;
    const [y, m] = next.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${next.slice(0, 8)}${String(Math.min(anchorDay, last)).padStart(2, '0')}`;
  }
  if (rec === 'weekdays') {
    let d = addDaysIso(from, 1);
    while (['Saturday', 'Sunday'].includes(weekdayOf(d))) d = addDaysIso(d, 1);
    return d;
  }
  return from;
}
/**
 * Next due date of a recurring task (same rules as the page, 20-task-model.js
 * nextOccurrence): step from the current due date until it lands AFTER today,
 * so a daily task completed 9 days late moves to tomorrow, not into the past.
 */
export function advanceByRecurrence(iso, rec, today, anchorDay) {
  const from = iso || today;
  if (!rec || rec === 'none') return from;
  let next = recurrenceStepIso(from, rec, anchorDay);
  for (let i = 0; today && next <= today && i < 2000; i++) next = recurrenceStepIso(next, rec, anchorDay);
  return next;
}

/** The dates a caller needs to resolve "tomorrow", "Thursday", "next week" itself. */
export function clock(timeZone, now = new Date()) {
  const today = isoInTz(now, timeZone);
  let time = '';
  try { time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(now); } catch { /* keep '' */ }
  return { today, weekday: weekdayOf(today), time, timezone: timeZone };
}

export function dateError(field, value, today) {
  const looksNatural = typeof value === 'string' && !/^\d/.test(value.trim());
  return new ActionError('BAD_DATE',
    `${field} must be an ISO date YYYY-MM-DD${looksNatural ? ` (natural language like '${String(value).slice(0, 30)}' is not accepted)` : ''}; got ${JSON.stringify(value)}`,
    { field, hint: `Today is ${today} (${weekdayOf(today)}). Work out the date yourself, or call get_context for the calendar of the next two weeks.` });
}

// ─── Ids ───────────────────────────────────────────────────────────────────
const rand = (n = 3) => randomBytes(8).toString('base64url').replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, n).padEnd(n, '0');
// 'u-' marks a user-created task (the page's bin/restore logic relies on it).
export const newTaskId = () => `u-${Date.now()}-${rand(3)}`;
export const newSubtaskId = () => `st-${Date.now()}-${rand(3)}`;
export const newNoteId = () => `n-${Date.now()}-${rand(5)}`;
export const newActivityId = () => `a-${Date.now()}-${rand(3)}`;
export const newCountdownId = () => `cd-${Date.now()}-${rand(3)}`;
export const newToken = (prefix) => `${prefix}_${randomBytes(9).toString('base64url')}`;

// ─── Fuzzy helpers ─────────────────────────────────────────────────────────
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
/** Up to n values from `list` closest to `v` (for "did you mean"). */
export function closest(v, list, n = 3) {
  const q = String(v || '').toLowerCase();
  return list.map(x => {
    const s = String(x).toLowerCase();
    const d = s.includes(q) || q.includes(s) ? Math.abs(s.length - q.length) * 0.1 : levenshtein(q, s);
    return { x, d };
  }).filter(o => o.d <= Math.max(2, q.length / 2)).sort((a, b) => a.d - b.d).slice(0, n).map(o => o.x);
}

// ─── Lookups on a state object ─────────────────────────────────────────────
export const DEFAULT_STREAMS = Object.freeze([
  { id: 'work', label: 'Work' }, { id: 'projects', label: 'Projects' }, { id: 'learning', label: 'Learning' },
  { id: 'admin', label: 'Admin' }, { id: 'personal', label: 'Personal' },
]);

/** Streams as the page sees them: state.streams, else the defaults; plus ids tasks use. */
export function streamList(state) {
  const list = Array.isArray(state.streams) && state.streams.length ? state.streams : DEFAULT_STREAMS;
  const out = list.filter(s => s && typeof s.id === 'string' && s.id)
    .map((s, i) => ({ id: s.id, label: String(s.label || s.id), archived: !!s.archived, order: s.order ?? i }));
  const known = new Set(out.map(s => s.id));
  for (const t of state.custom || []) {
    if (t && typeof t.stream === 'string' && t.stream && !known.has(t.stream)) { known.add(t.stream); out.push({ id: t.stream, label: t.stream, archived: false, order: 999, synthetic: true }); }
  }
  return out.sort((a, b) => a.order - b.order);
}
export function defaultStream(state) {
  const ids = streamList(state).filter(s => !s.archived).map(s => s.id);
  if (state.defaultStream && ids.includes(state.defaultStream)) return state.defaultStream;
  return ids.includes('personal') ? 'personal' : (ids[0] || 'personal');
}
export function resolveStream(state, v, field = 'stream') {
  const list = streamList(state);
  const q = String(v ?? '').trim();
  const hit = list.find(s => s.id === q) || list.find(s => s.id.toLowerCase() === q.toLowerCase() || s.label.toLowerCase() === q.toLowerCase());
  if (hit) return hit.id;
  const valid = list.filter(s => !s.archived).map(s => s.id);
  const near = closest(q, list.flatMap(s => [s.id, s.label]));
  throw new ActionError('UNKNOWN_STREAM', `unknown stream '${q}'; valid: ${valid.join(', ')}`, {
    field, valid, hint: near.length ? `did you mean ${near.map(x => `'${x}'`).join(' or ')}?` : 'use one of the stream ids from get_context',
  });
}

export function normPriority(v, field = 'priority') {
  const s = String(v ?? '').trim().toLowerCase();
  if (PRIORITIES.includes(s)) return s;
  if (PRIORITY_ALIASES[s]) return PRIORITY_ALIASES[s];
  throw new ActionError('BAD_VALUE', `unknown priority '${v}'; valid: p1 (high), p2 (medium), p3 (low), p0 (none)`, { field, valid: [...PRIORITIES] });
}

/** Person by id, exact name, alias or unique first name. */
export function resolvePerson(state, v, field = 'person') {
  const people = Array.isArray(state.people) ? state.people : [];
  const q = String(v ?? '').trim();
  const lq = q.toLowerCase();
  let hit = people.find(p => p.id === q) || people.find(p => String(p.id).toLowerCase() === lq);
  if (!hit) hit = people.find(p => String(p.name || '').toLowerCase() === lq);
  if (!hit) hit = people.find(p => Array.isArray(p.aliases) && p.aliases.some(a => String(a).toLowerCase() === lq));
  if (!hit) {
    const first = people.filter(p => String(p.name || '').toLowerCase().split(/\s+/)[0] === lq);
    if (first.length === 1) hit = first[0];
    else if (first.length > 1) {
      throw new ActionError('AMBIGUOUS_PERSON', `'${q}' matches several people`, { field, candidates: first.map(p => ({ id: p.id, name: p.name })), hint: 'pass the person id' });
    }
  }
  if (hit) return hit;
  const near = closest(q, people.flatMap(p => [p.id, p.name, ...(p.aliases || [])]).filter(Boolean));
  throw new ActionError('UNKNOWN_PERSON', `unknown person '${q}'`, {
    field, valid: people.slice(0, 60).map(p => p.id),
    hint: (near.length ? `did you mean ${near.map(x => `'${x}'`).join(' or ')}? ` : '') + 'list_people shows everyone; create_person adds someone new',
  });
}

/** Every tag in use, with counts. */
export function tagCounts(state) {
  const open = new Map(), total = new Map();
  const statuses = state.statuses || {};
  const deleted = state.deleted || {};
  for (const t of state.custom || []) {
    if (!t || deleted[t.id]) continue;
    for (const tag of Array.isArray(t.tags) ? t.tags : []) {
      total.set(tag, (total.get(tag) || 0) + 1);
      if (statuses[t.id] !== 'done') open.set(tag, (open.get(tag) || 0) + 1);
    }
  }
  return { open, total };
}
/** Canonical tags if the state has a tag registry, else null. */
export function tagRegistry(state) {
  const r = state.tagRegistry || state.tags;
  if (Array.isArray(r)) return r.map(x => (typeof x === 'string' ? x : x && (x.id || x.name || x.tag))).filter(Boolean);
  if (r && typeof r === 'object') return Object.keys(r);
  return null;
}

// ─── Small utilities ───────────────────────────────────────────────────────
export const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
/** Key-order independent JSON (for equality checks and hashes). */
export function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
export const same = (a, b) => stable(a) === stable(b);
export const truncate = (s, n = 60) => { const a = Array.from(String(s ?? '')); return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join(''); };
