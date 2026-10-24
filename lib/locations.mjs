// lib/locations.mjs - the permanent LOCATION LOG (2.16): where the user has been, kept in
// the data folder forever so the Locations tab can show fun facts.
//
//   <data>/locations/log.json  {v: 1, prefs: {on, noticeAt, deletedAt}, records: {id: rec},
//                               done: {id: completion}, badges: {id: firstEarnedAt}}
//
//   rec   {id, kind: 'stay'|'move', at, until, place, city, region, country, cc, lat, lon,
//          tz, fromTz?, src: 'geo'|'manual'|'zone'|'trip'|'import', dev, wx?: {hi, lo, cond, label, n}}
//         One record per meaningful stay (a place, from `at` to the last time it was seen,
//         `until`) or move (a time-zone change, an instant). lat/lon are rounded to 2 decimals
//         (about 1 km). Every source is IP-free: the browser's own location (when the user
//         chose Device location), a place the user picked, the computer's time zone, or a trip.
//   done  {id: '<taskId>@<ms>', task, at, rec, city, cc}: where a task was completed.
//
// The rules, from the user (24 Oct): keep it forever, never prune it automatically; it is
// synced only between the user's own devices through the end-to-end encrypted sync
// (lib/sync/manifest.mjs, the `// ── locations ──` block: merged by record id); the user can
// turn logging off, export it (JSON/CSV, done by the page) and delete it (Settings >
// Location history). Upserts only grow a record (earliest `at`, latest `until`); nothing
// here deletes except deleteAll(). No network, no Claude.

import { join } from 'node:path';
import { readJson, writeJson, withLock } from './fsutil.mjs';
import { dataPaths } from './datadir.mjs';

export const LOC_SOURCES = Object.freeze(['geo', 'manual', 'zone', 'trip', 'import']);
export const LOC_KINDS = Object.freeze(['stay', 'move']);
export const LOC_ID_RE = /^[a-z]-[A-Za-z0-9_.:-]{3,80}$/;
export const LOC_DONE_ID_RE = /^[A-Za-z0-9_.:-]{1,120}@\d{10,14}$/;
const MAX_PER_POST = 400;

export function locationsFile(dataDir) { return join(dataPaths(dataDir).root, 'locations', 'log.json'); }

const str = (v, n = 80) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n) : '');
const ms = (v) => { const n = Number(v); return Number.isFinite(n) && n > 946684800000 && n < 4102444800000 ? Math.round(n) : null; };   // 2000..2100
const coord = (v, lim) => { const n = Number(v); return Number.isFinite(n) && Math.abs(n) <= lim ? Math.round(n * 100) / 100 : null; };
const zone = (v) => (typeof v === 'string' && /^[A-Za-z][A-Za-z0-9_+\-/]{1,60}$/.test(v) ? v : '');
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 10) / 10 : null; };

/** A record from the page, checked and trimmed, or null. */
export function cleanRecord(r) {
  if (!r || typeof r !== 'object' || !LOC_ID_RE.test(String(r.id || ''))) return null;
  const at = ms(r.at);
  if (at == null) return null;
  const kind = LOC_KINDS.includes(r.kind) ? r.kind : 'stay';
  const until = Math.max(at, ms(r.until) ?? at);
  const out = { id: r.id, kind, at, until, src: LOC_SOURCES.includes(r.src) ? r.src : 'import' };
  for (const k of ['place', 'city', 'region', 'country']) { const s = str(r[k]); if (s) out[k] = s; }
  const cc = str(r.cc, 2).toUpperCase(); if (/^[A-Z]{2}$/.test(cc)) out.cc = cc;
  const lat = coord(r.lat, 90), lon = coord(r.lon, 180);
  if (lat != null && lon != null) { out.lat = lat; out.lon = lon; }
  const tz = zone(r.tz); if (tz) out.tz = tz;
  const fz = zone(r.fromTz); if (fz) out.fromTz = fz;
  const dev = str(r.dev, 60); if (dev) out.dev = dev;
  if (r.wx && typeof r.wx === 'object') {
    const w = { hi: num(r.wx.hi), lo: num(r.wx.lo), cond: str(r.wx.cond, 24), label: str(r.wx.label, 40), n: Math.max(1, Math.min(1e6, Math.round(Number(r.wx.n) || 1))) };
    if (w.hi != null || w.lo != null || w.cond) out.wx = w;
  }
  if (!out.place && !out.city && !out.cc && !out.tz) return null;
  return out;
}
/** A completion's place from the page, or null. */
export function cleanDone(d) {
  if (!d || typeof d !== 'object' || !LOC_DONE_ID_RE.test(String(d.id || ''))) return null;
  const at = ms(d.at); if (at == null) return null;
  const out = { id: d.id, task: str(d.task, 120), at };
  if (d.rec && LOC_ID_RE.test(String(d.rec))) out.rec = d.rec;
  const city = str(d.city); if (city) out.city = city;
  const cc = str(d.cc, 2).toUpperCase(); if (/^[A-Z]{2}$/.test(cc)) out.cc = cc;
  return out;
}
/** Two copies of one record: the stay only grows (earliest at, latest until); fields are filled, never emptied. */
export function mergeRecord(a, b) {
  if (!a) return b;
  if (!b) return a;
  const newer = (b.until || b.at) >= (a.until || a.at) ? b : a;
  const out = { ...a, ...b, ...newer, at: Math.min(a.at, b.at), until: Math.max(a.until || a.at, b.until || b.at) };
  for (const k of ['place', 'city', 'region', 'country', 'cc', 'lat', 'lon', 'tz', 'fromTz', 'dev']) if (out[k] == null || out[k] === '') { if (a[k] != null && a[k] !== '') out[k] = a[k]; }
  if (a.wx && b.wx) out.wx = { hi: Math.max(a.wx.hi ?? -999, b.wx.hi ?? -999), lo: Math.min(a.wx.lo ?? 999, b.wx.lo ?? 999), cond: newer.wx.cond || a.wx.cond, label: newer.wx.label || a.wx.label, n: Math.max(a.wx.n || 1, b.wx.n || 1) };
  if (out.wx && out.wx.hi === -999) out.wx.hi = null;
  if (out.wx && out.wx.lo === 999) out.wx.lo = null;
  return out;
}
const emptyLog = () => ({ v: 1, prefs: { on: true }, records: {}, done: {}, badges: {} });
function normLog(raw) {
  const L = emptyLog();
  if (!raw || typeof raw !== 'object') return L;
  if (raw.prefs && typeof raw.prefs === 'object') L.prefs = { ...L.prefs, ...raw.prefs };
  for (const k of ['records', 'done', 'badges']) if (raw[k] && typeof raw[k] === 'object' && !Array.isArray(raw[k])) L[k] = raw[k];
  return L;
}

export async function readLog(dataDir) {
  return normLog(await readJson(locationsFile(dataDir), { fallback: null }).catch(() => null));
}
async function update(dataDir, fn) {
  const file = locationsFile(dataDir);
  return withLock(file, async () => {
    const L = normLog(await readJson(file, { fallback: null }).catch(() => null));
    const r = await fn(L);
    if (r && r.write === false) return r;
    await writeJson(file, L);
    return r;
  });
}
/** Add or grow records and completion places. {records, done, badges} -> {ok, added, grown}. Logging off: nothing is kept. */
export async function upsert(dataDir, body, { dev = '' } = {}) {
  const recs = (Array.isArray(body && body.records) ? body.records : []).slice(0, MAX_PER_POST).map(cleanRecord).filter(Boolean);
  const done = (Array.isArray(body && body.done) ? body.done : []).slice(0, MAX_PER_POST).map(cleanDone).filter(Boolean);
  const badges = body && body.badges && typeof body.badges === 'object' && !Array.isArray(body.badges) ? Object.entries(body.badges).slice(0, 100) : [];
  return update(dataDir, (L) => {
    if (L.prefs.on === false) return { ok: true, off: true, added: 0, grown: 0, write: false };
    let added = 0, grown = 0, same = 0;
    for (const r of recs) {
      if (!r.dev && dev) r.dev = dev;
      const cur = L.records[r.id];
      const next = mergeRecord(cur, r);
      if (cur && JSON.stringify(cur) === JSON.stringify(next)) { same++; continue; }
      L.records[r.id] = next;
      if (cur) grown++; else added++;
    }
    for (const d of done) { if (!L.done[d.id]) { L.done[d.id] = d; added++; } else same++; }
    for (const [id, at] of badges) {
      if (/^[a-z0-9:_-]{2,60}$/i.test(id) && ms(at) != null && !L.badges[id]) { L.badges[id] = ms(at); added++; }
    }
    if (!added && !grown) return { ok: true, added: 0, grown: 0, same, write: false };
    return { ok: true, added, grown };
  });
}
/** {on?, noticeAt?} -> the prefs. */
export async function setPrefs(dataDir, body) {
  return update(dataDir, (L) => {
    if (body && typeof body.on === 'boolean') L.prefs.on = body.on;
    if (body && ms(body.noticeAt) != null) L.prefs.noticeAt = ms(body.noticeAt);
    return { ok: true, prefs: L.prefs };
  });
}
/**
 * "Delete my location history": every record, completion place and badge (the switch and
 * notice stay). With {from, to} (ms): only what overlaps that window ("Forget this trip").
 */
export async function deleteAll(dataDir, range = null) {
  const from = range ? ms(range.from) : null, to = range ? ms(range.to) : null;
  return update(dataDir, (L) => {
    if (from != null && to != null) {
      let removed = 0;
      for (const [id, r] of Object.entries(L.records)) if (r && r.at <= to && (r.until || r.at) >= from) { delete L.records[id]; removed++; }
      for (const [id, d] of Object.entries(L.done)) if (d && d.at >= from && d.at <= to) { delete L.done[id]; removed++; }
      return removed ? { ok: true, removed } : { ok: true, removed: 0, write: false };
    }
    const removed = Object.keys(L.records).length + Object.keys(L.done).length;
    L.records = {}; L.done = {}; L.badges = {};
    L.prefs.deletedAt = Date.now();
    return { ok: true, removed };
  });
}

/** Spend per country, when the finance analysis carries it (published by the finance side), else null. */
export function spendByCountry(analysis) {
  if (!analysis || typeof analysis !== 'object') return null;
  const src = analysis.spendByCountry || analysis.byCountry || (analysis.travel && analysis.travel.byCountry) || analysis.countries || null;
  if (!src || typeof src !== 'object') return null;
  const rows = [];
  const pick = (o) => (typeof o === 'number' ? o : o && typeof o === 'object' ? Number(o.spend ?? o.total ?? o.amount ?? o.out ?? NaN) : NaN);
  const push = (cc, v, n) => { const C = String(cc || '').toUpperCase(); const a = Math.abs(pick(v)); if (/^[A-Z]{2}$/.test(C) && Number.isFinite(a) && a > 0) rows.push({ cc: C, amount: Math.round(a * 100) / 100, n: Number(n) || (v && Number(v.count || v.n)) || null }); };
  if (Array.isArray(src)) for (const r of src) push(r && (r.cc || r.country || r.code), r, r && (r.count || r.n));
  else for (const [cc, v] of Object.entries(src)) push(cc, v);
  return rows.length ? rows.sort((a, b) => b.amount - a.amount).slice(0, 80) : null;
}
