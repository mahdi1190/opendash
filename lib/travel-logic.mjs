// lib/travel-logic.mjs - the travel rules for Node (travel spec 3, 5.3, 5.5).
//
// The single source is the page: src/app/69-travel-logic.js (legs, trips,
// card payments abroad, where the user is, the body clock, their time, the
// snapshot the travel suggestions read). It is a pure classic-script file;
// this module evaluates it once, together with the files it leans on, in
// build order (the lib/select-logic.mjs pattern):
//   07-core-clock-logic.js   zone maths (clockPartsIn, clockOffsetIn, ...)
//   69-travel-data.js        the offline place tables (when present)
//   69-travel-holidays.js    the offline public-holiday rules (when present)
// so the server (/api/finance/travel, /api/travel/*) and the tests run exactly
// the rules the page runs.
//
//   loadTravelLogic({extra})  a fresh copy; every top-level name via api.get(name)
//   api                       the shared copy
//   travelIndex()             the place index over the offline tables (cached); travelCity(id)
//   holidaysFor(cc, year)     offline public holidays [{date, name, estimated?}] ([] when unknown)
//   normTravelConfig(v)       config.travel with defaults (lib/travel-config.mjs; lib/datadir.mjs uses it)

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
export const LOGIC_FILE = join(APP, '69-travel-logic.js');
export const CLOCK_FILE = join(APP, '07-core-clock-logic.js');
export const DATA_FILE = join(APP, '69-travel-data.js');
export const HOLIDAYS_FILE = join(APP, '69-travel-holidays.js');
// Build order (file name), as the page concatenates them.
export function sourceFiles() { return [CLOCK_FILE, DATA_FILE, HOLIDAYS_FILE, LOGIC_FILE].filter(f => existsSync(f)); }

/** A fresh copy of the travel rules (and the files they use). `extra` = more source evaluated after them. */
export function loadTravelLogic({ extra = '', files = sourceFiles() } = {}) {
  const code = files.map(f => readFileSync(f, 'utf8')).join('\n;\n') + '\n;\n' + extra;
  const fnNames = [...new Set([...code.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m => m[1]))];
  const constNames = [...new Set([...code.matchAll(/^(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/gm)].map(m => m[1]))];
  const all = [...new Set([...fnNames, ...constNames])];
  // eslint-disable-next-line no-new-func
  const api = new Function(`"use strict";\n${code}\nreturn { ${all.join(', ')} };`)();
  api.get = (n) => api[n];
  return api;
}

export const api = loadTravelLogic();
export const {
  TRL_VERSION, trTagSlug, trWall, trCountryLabel, trPlaceIndex, trPlaceIndexFromData, trAirportPlace, trPlace, trZonePlace, trLegs, trJourneys,
  trTripEvents, trZoneEpisodes, trCcyOf, trFxSignal, trPayEpisodes, trTripsFrom, trStatus, trWorkDays, trWhere, trLongStay, trGroup, trBody,
  trTheirTime, trMomentKey, trMomentDue, trMoments, trLeaveBy, trBuildSnapshot,
} = api;

/** The offline tables (69-travel-data.js TR_DATA), or null before they exist. */
export function travelData(a = api) { return a.TR_DATA && typeof a.TR_DATA === 'object' ? a.TR_DATA : null; }
let _index = null;
/** The place index over the offline tables (built once; empty tables when there are none). */
export function travelIndex() {
  if (!_index) _index = travelData() ? api.trPlaceIndexFromData(travelData()) : api.trPlaceIndex({});
  return _index;
}
/** A city of the place index by id ('tokyo-jp'), or null. */
export function travelCity(id) {
  const s = String(id || '');
  if (!/^[a-z0-9-]{2,80}$/.test(s)) return null;
  return travelIndex().cities.get(s) || null;
}
/** Offline public holidays for a country and year, [] when the rules do not cover it. */
export function holidaysFor(cc, year, opts = {}) {
  for (const n of ['trHolidays', 'trHolidaysFor', 'holidaysFor']) {
    if (typeof api[n] === 'function') {
      try { const r = api[n](cc, year, opts); return Array.isArray(r) ? r : (r && Array.isArray(r.days) ? r.days : []); } catch { return []; }
    }
  }
  return [];
}

export { TRAVEL_DEFAULTS, normTravelConfig } from './travel-config.mjs';
