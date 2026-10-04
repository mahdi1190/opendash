// lib/clock.mjs - the one time resolver, for Node (travel spec 2.1-2.2).
//
// The rules are the page's own pure file, src/app/07-core-clock-logic.js,
// evaluated once here (the lib/select-logic.mjs pattern), so the page, the
// server and the MCP agree on the effective zone and on "today".
//
//   effectiveZone(cfg, sys, now), canonZone(z), ...   the shared rules
//   createTimeStore(dataDirOrPaths) / timeStoreFor(...) -> {
//       get()                         {system:{zone, at, offsetMin}|null, changes:[{at, from, to}]}
//       observe(zone, offsetMin, at)  -> {ok, changed, from, to, effective?}
//       history({from, to})           changes in a window
//       forget({from, to})            -> {removed}   (all: forget({}))
//     }   over <data>/time.json (written through lib/fsutil.mjs; never exported or shared)
//   systemZone({header, stored, now, cfg})   -> {zone, source}: the best source first:
//       the page's request header, time.json if observed in the last 12 h,
//       this process's own Intl zone, config.timezone
//   clockFor(cfg, sys, now)       -> {today, weekday, time, timezone (effective), home, away, system}
//                                    (replaces clock(cfg.timezone, now))
//   requestZone(req)              the validated X-Dashboard-Zone header, or ''
//   setClockPlaces({ccOf, label}) the place table plugs in here (countries for `away`)
//
// Logs never carry zone ids (spec 6.7): callers log booleans and counts.

import { readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson, withLock } from './fsutil.mjs';

export const SOURCE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', '07-core-clock-logic.js');
const NAMES = ['CLOCK_OVERRIDE_READY', 'CLOCK_FOLLOW_MODES', 'CLOCK_ZONE_ALIASES', 'clockValidZone', 'canonZone', 'clockPlaceless',
  'effectiveZone', 'clockFollowOf', 'clockOffsetIn', 'clockPartsIn', 'clockTodayIn', 'clockAtIn', 'clockAddDays', 'clockDaysBetween',
  'clockDiffMin', 'clockFmtDiff', 'clockDiffLabel', 'clockZoneLabel', 'clockAway'];
// eslint-disable-next-line no-new-func
const api = new Function(`"use strict";\n${readFileSync(SOURCE_FILE, 'utf8')}\nreturn { ${NAMES.join(', ')} };`)();
export const {
  CLOCK_OVERRIDE_READY, CLOCK_FOLLOW_MODES, CLOCK_ZONE_ALIASES, clockValidZone, canonZone, clockPlaceless,
  effectiveZone, clockFollowOf, clockOffsetIn, clockPartsIn, clockTodayIn, clockAtIn, clockAddDays, clockDaysBetween,
  clockDiffMin, clockFmtDiff, clockDiffLabel, clockZoneLabel, clockAway,
} = api;

export const ZONE_HEADER = 'x-dashboard-zone';
export const SYSTEM_FRESH_MS = 12 * 3600 * 1000;    // a time.json reading this recent beats the process's own zone
export const MAX_CHANGES = 50;
export const DEFAULT_KEEP_DAYS = 365;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

let places = { ccOf: null, label: null };
/** The place table (travel data) plugs in here: ccOf(zone) -> 'JP', label(zone) -> 'Tokyo'. */
export function setClockPlaces(p) {
  places = { ccOf: p && typeof p.ccOf === 'function' ? p.ccOf : null, label: p && typeof p.label === 'function' ? p.label : null };
}
export function clockLabel(z) {
  if (places.label) { try { const l = places.label(canonZone(z)); if (l) return String(l); } catch { /* fall back */ } }
  return clockZoneLabel(z);
}

/** This process's own zone (right for a freshly started MCP; stale for a server started before a trip). */
export function processZone() {
  try { return canonZone(Intl.DateTimeFormat().resolvedOptions().timeZone) || ''; } catch { return ''; }
}

/** The page's zone header, validated ('' when absent or unknown). */
export function requestZone(req) {
  const raw = req && req.headers ? req.headers[ZONE_HEADER] : undefined;
  if (typeof raw !== 'string' || raw.length > 64 || !/^[A-Za-z0-9_+\-/]+$/.test(raw)) return '';
  return canonZone(raw);
}

/**
 * The computer's zone as best the server knows it: {zone, source}.
 * source: 'header' | 'observed' | 'process' | 'home'.
 */
export function systemZone({ header, stored, now = Date.now(), cfg } = {}) {
  const h = canonZone(header);
  if (h) return { zone: h, source: 'header' };
  const s = stored && stored.system;
  const at = s && Date.parse(s.at);
  if (s && canonZone(s.zone) && Number.isFinite(at) && now - at <= SYSTEM_FRESH_MS) return { zone: canonZone(s.zone), source: 'observed' };
  const p = processZone();
  if (p) return { zone: p, source: 'process' };
  return { zone: canonZone(cfg && cfg.timezone) || 'UTC', source: 'home' };
}

/** {today, weekday, time, timezone (effective), home, away, system}. sys = zone string or {zone}. */
export function clockFor(cfg, sys, now = Date.now()) {
  const ms = now instanceof Date ? now.getTime() : Number(now);
  const sz = typeof sys === 'string' ? sys : (sys && sys.zone) || '';
  const zone = effectiveZone(cfg || {}, { zone: sz }, ms);
  const home = canonZone(cfg && cfg.timezone) || 'UTC';
  const p = clockPartsIn(ms, zone);
  const a = clockAway(home, zone, ms, places.ccOf);
  return {
    today: p.iso, weekday: WEEKDAYS[p.dow], time: `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`,
    timezone: zone, home, away: a.away, diffMin: a.diffMin, system: canonZone(sz) || null,
  };
}

// ─── <data>/time.json ───────────────────────────────────────────────────────
const fileOf = (x) => {
  if (typeof x === 'string') return path.join(x, 'time.json');
  if (x && typeof x === 'object') return path.join(x.root || x.dataDir || '.', 'time.json');
  throw new Error('time store needs a data folder');
};
const isoAt = (v) => { const t = typeof v === 'number' ? v : Date.parse(v); return Number.isFinite(t) ? new Date(t).toISOString() : null; };
const msOf = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return Date.parse(String(v) + 'T00:00:00Z');
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : null;
};

/** A clean time.json object (bad entries dropped). */
export function normalizeTimeFile(raw) {
  const out = { version: 1, system: null, changes: [] };
  if (!raw || typeof raw !== 'object') return out;
  const s = raw.system;
  if (s && canonZone(s.zone) && isoAt(s.at)) {
    out.system = { zone: canonZone(s.zone), at: isoAt(s.at) };
    if (Number.isFinite(Number(s.offsetMin)) && Math.abs(Number(s.offsetMin)) <= 18 * 60) out.system.offsetMin = Math.round(Number(s.offsetMin));
  }
  if (Array.isArray(raw.changes)) {
    for (const c of raw.changes) {
      if (!c || !isoAt(c.at) || !canonZone(c.to)) continue;
      out.changes.push({ at: isoAt(c.at), from: canonZone(c.from) || null, to: canonZone(c.to) });
    }
  }
  out.changes.sort((a, b) => a.at.localeCompare(b.at));
  return out;
}
/** Keep the last MAX_CHANGES changes, none older than keepDays. */
export function pruneChanges(changes, { now = Date.now(), keepDays = DEFAULT_KEEP_DAYS } = {}) {
  const cut = now - Math.max(1, Number(keepDays) || DEFAULT_KEEP_DAYS) * 86400000;
  return changes.filter(c => Date.parse(c.at) >= cut).slice(-MAX_CHANGES);
}

export function createTimeStore(where, { now = () => Date.now(), keepDays = () => DEFAULT_KEEP_DAYS } = {}) {
  const file = fileOf(where);
  let cache = null, cacheKey = '';
  async function read() {
    let key = '';
    try { const st = await stat(file); key = `${st.size}:${st.mtimeMs}`; } catch (e) { if (e.code !== 'ENOENT') throw e; key = 'none'; }
    if (cache && key === cacheKey) return cache;
    cache = normalizeTimeFile(await readJson(file, { fallback: null }).catch(() => null));
    cacheKey = key;
    return cache;
  }
  async function write(obj) {
    await writeJson(file, obj, { trailingNewline: true });
    cache = normalizeTimeFile(obj); cacheKey = '';   // peek() sees it at once; the next get() re-reads the file
  }
  return {
    file,
    /** {version, system:{zone, at, offsetMin?}|null, changes:[...]} (a copy). */
    async get() { const t = await read(); return { version: 1, system: t.system ? { ...t.system } : null, changes: t.changes.map(c => ({ ...c })) }; },
    /** The last reading this process made (sync; null before the first get/observe). */
    peek() { return cache; },
    /**
     * The page saw the computer's zone. Appends {at, from, to} when it changed.
     * Writes at most once per 10 min while nothing changes (to keep `at` fresh).
     */
    async observe(zone, offsetMin, at) {
      const z = canonZone(zone);
      if (!z) return { ok: false, error: 'unknown time zone' };
      const t = msOf(at) ?? now();
      return withLock(file, async () => {
        cacheKey = '';   // re-read under the lock
        const cur = await read();
        const prev = cur.system && cur.system.zone;
        const changed = !!prev && prev !== z;
        const fresh = cur.system && Date.parse(cur.system.at);
        const offOk = Number.isFinite(Number(offsetMin)) && Math.abs(Number(offsetMin)) <= 18 * 60;
        const sameOff = !offOk || cur.system?.offsetMin === Math.round(Number(offsetMin));
        if (prev === z && sameOff && Number.isFinite(fresh) && t - fresh < 10 * 60000 && t >= fresh) return { ok: true, changed: false, from: prev, to: z, wrote: false };
        const next = { version: 1, system: { zone: z, at: new Date(t).toISOString(), ...(offOk ? { offsetMin: Math.round(Number(offsetMin)) } : {}) }, changes: cur.changes.slice() };
        if (changed) next.changes.push({ at: new Date(t).toISOString(), from: prev, to: z });
        next.changes = pruneChanges(next.changes, { now: t, keepDays: keepDays() });
        await write(next);
        return { ok: true, changed, from: prev || null, to: z, wrote: true };
      });
    },
    /** Zone changes between from and to (ISO dates or instants; both optional). */
    async history({ from, to } = {}) {
      const t = await read();
      const a = msOf(from), b = msOf(to);
      const bEnd = b != null && /^\d{4}-\d{2}-\d{2}$/.test(String(to)) ? b + 86400000 - 1 : b;
      return t.changes.filter(c => { const x = Date.parse(c.at); return (a == null || x >= a) && (bEnd == null || x <= bEnd); });
    },
    /** Remove the zone changes in a window ({} = all of them; the current system zone stays). */
    async forget({ from, to } = {}) {
      return withLock(file, async () => {
        cacheKey = '';
        const cur = await read();
        const a = msOf(from), b = msOf(to);
        const bEnd = b != null && /^\d{4}-\d{2}-\d{2}$/.test(String(to)) ? b + 86400000 - 1 : b;
        const keep = cur.changes.filter(c => { const x = Date.parse(c.at); return !((a == null || x >= a) && (bEnd == null || x <= bEnd)); });
        const removed = cur.changes.length - keep.length;
        if (removed) await write({ version: 1, system: cur.system, changes: keep });
        return { ok: true, removed };
      });
    },
  };
}

const stores = new Map();
/** One time store per data folder (the server, the actions layer and the routes share it). */
export function timeStoreFor(where, opts) {
  const f = fileOf(where);
  let s = stores.get(f);
  if (!s) { s = createTimeStore(where, opts); stores.set(f, s); }
  return s;
}
