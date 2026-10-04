// lib/travel-data.mjs - the offline place tables, greetings, flags and public
// holidays for Node (travel spec 3.4, 4.8, 4.9, 5.4). Owner: PLACES.
//
// The single source is the page: it evaluates, in build order,
//   07-core-clock-logic.js   canonZone (zone aliases), when present
//   69-travel-data.js        the generated tables (tools/build-travel-data.mjs)
//   69-travel-holidays.js    the public-holiday rules
//   69-travel-places.js      the helpers (zones, countries, cities, greetings, flags)
// so the server, the MCP and the tests give the answers the page gives.
//
//   loadTravelData({files})  a fresh copy; every top-level name, plus get(name)
//   places                   the shared copy
//   zoneInfo, zoneCountry, zoneLabel, country, city, cityFind, nearestCity, airportCity,
//   placeKind, greeting, thanks, flagSvg, holidays, holidaysBetween, holidayOn ...

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
export const PLACE_FILES = Object.freeze({
  clock: join(APP, '07-core-clock-logic.js'),
  data: join(APP, '69-travel-data.js'),
  holidays: join(APP, '69-travel-holidays.js'),
  places: join(APP, '69-travel-places.js'),
});

/** A fresh copy of the place helpers (the page files, evaluated together). */
export function loadTravelData({ files = Object.values(PLACE_FILES).filter(f => existsSync(f)) } = {}) {
  const code = files.map(f => readFileSync(f, 'utf8')).join('\n;\n');
  const names = [...new Set([...code.matchAll(/^(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=)/gm)].map(m => m[1] || m[2]))];
  // eslint-disable-next-line no-new-func
  const api = new Function(`"use strict";\n${code}\n;return { ${names.join(', ')} };`)();
  api.get = (n) => api[n];
  return api;
}

export const places = loadTravelData();
export const zoneInfo = (z) => places.trZoneInfo(z);
export const zoneCountry = (z) => places.trZoneCountry(z);
export const zoneLabel = (z) => places.trZoneLabel(z);
export const country = (cc) => places.trCountry(cc);
export const city = (id) => places.trCity(id);
export const cityFind = (name, o) => places.trCityFind(name, o);
export const nearestCity = (lat, lon, o) => places.trNearestCity(lat, lon, o);
export const airportCity = (iata) => places.trAirportCity(iata);
export const placeKind = (o) => places.trPlaceKind(o);
export const greeting = (o) => places.trGreeting(o);
export const thanks = (o) => places.trThanks(o);
export const flagSvg = (cc) => places.trFlagSvg(cc);
export const holidays = (cc, year, o) => places.trHolidays(cc, year, o);
export const holidaysBetween = (cc, from, to, o) => places.trHolidaysBetween(cc, from, to, o);
export const holidayOn = (cc, iso, o) => places.trHolidayOn(cc, iso, o);
export const holidayCountries = () => places.trHolidayCountries();
