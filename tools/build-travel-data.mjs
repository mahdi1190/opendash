#!/usr/bin/env node
// tools/build-travel-data.mjs - generates src/app/69-travel-data.js, the
// offline place tables behind the travel features (owner: PLACES; spec
// TRAVEL_SPEC 3.4). The raw downloads are never committed.
//
//   node tools/build-travel-data.mjs --from <downloads dir> [--out <file>] [--check]
//
// <downloads dir> holds, unchanged:
//   zone.tab, tzdata.zi       IANA tzdata (public domain): https://www.iana.org/time-zones
//                             (the same files ship in Python's tzdata package, zoneinfo/)
//   cities15000.txt           GeoNames (CC BY 4.0): https://download.geonames.org/export/dump/cities15000.zip
//   countryInfo.txt           GeoNames (CC BY 4.0): https://download.geonames.org/export/dump/countryInfo.txt
//   airports.csv              OurAirports (public domain): https://ourairports.com/data/
// plus the hand-written facts in tools/travel-data-facts.mjs (plugs, drive
// side, emergency numbers, weekends, skyline kinds, flags, aliases).
//
// Output tables (compact strings, parsed lazily by 69-travel-places.js):
//   zones      every tzdata zone of zone.tab + the backward links browsers
//              still report (Asia/Calcutta ...): {cc, lat, lon, city?}
//   countries  every GeoNames country: currency, languages, plugs, drive side,
//              emergency number, weekend, skyline kind, flag spec, capital
//   cities     capitals + population >= 300k (the biggest per country) +
//              tourist cities: name, zone, lat, lon, population, kind?, lang?, aliases?
//   airports   scheduled-service IATA codes -> city (+ metro codes LON, NYC ...)
// --check exits 1 when the output would change (CI-style). --relink re-emits
// the existing file's tables with the current parser (no downloads needed).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as F from './travel-data-facts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
export const OUT_FILE = join(ROOT, 'src', 'app', '69-travel-data.js');

/* ---------- small helpers (fold must match trFold in 69-travel-places.js) ---------- */
const SPECIAL = { 'ß': 'ss', 'æ': 'ae', 'Æ': 'ae', 'ø': 'o', 'Ø': 'o', 'đ': 'd', 'Đ': 'd', 'ł': 'l', 'Ł': 'l', 'ı': 'i', 'œ': 'oe', 'Œ': 'oe', 'þ': 'th', 'Þ': 'th', 'ð': 'd', 'Ð': 'd', 'ħ': 'h' };
export function fold(s) {
  return String(s || '').replace(/[ßæÆøØđĐłŁıœŒþÞðÐħ]/g, c => SPECIAL[c]).normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[‘’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
const R2 = (n) => String(Math.round(n * 100) / 100);
const b36 = (n) => n.toString(36);
const km = (a, b) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const ZONE_AREAS = { Africa: 'A', America: 'M', Antarctica: 'N', Arctic: 'R', Asia: 'S', Atlantic: 'T', Australia: 'U', Europe: 'E', Indian: 'I', Pacific: 'P' };
const packZone = (z) => { const i = z.indexOf('/'); const a = ZONE_AREAS[z.slice(0, i)]; return a ? a + z.slice(i) : z; };
const clean = (s) => String(s).replace(/[;\n`$\\]/g, ' ').trim();

function iso6709(s) {
  // +DDMM[SS]+DDDMM[SS]
  const m = /^([+-])(\d{2})(\d{2})(\d{2})?([+-])(\d{3})(\d{2})(\d{2})?$/.exec(s);
  if (!m) throw new Error('bad coordinates ' + s);
  const lat = (Number(m[2]) + Number(m[3]) / 60 + Number(m[4] || 0) / 3600) * (m[1] === '-' ? -1 : 1);
  const lon = (Number(m[6]) + Number(m[7]) / 60 + Number(m[8] || 0) / 3600) * (m[5] === '-' ? -1 : 1);
  return { lat, lon };
}
function csvRows(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

export function buildTravelData(from, { log = () => {} } = {}) {
  const need = (f) => { const p = join(from, f); if (!existsSync(p)) throw new Error(`missing ${f} in ${from}`); return readFileSync(p, 'utf8'); };
  const warn = [];

  /* ---------- countries ---------- */
  const countries = [];
  for (const line of need('countryInfo.txt').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const c = line.split('\t');
    const cc = c[0];
    if (!/^[A-Z]{2}$/.test(cc) || cc === 'CS' || cc === 'AN') continue;   // retired codes
    countries.push({ cc, name: c[4], capital: c[5], ccy: F.CCY[cc] || c[10] || '', langs: c[15] || '' });
  }
  const ccSet = new Set(countries.map(c => c.cc));

  /* ---------- zones ---------- */
  const zones = new Map();   // name -> {cc, lat, lon}
  for (const line of need('zone.tab').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [cc, coord, name] = line.split('\t');
    const { lat, lon } = iso6709(coord);
    zones.set(name.trim(), { cc, lat, lon });
  }
  // Backward links: names a browser may still report (ICU keeps the old CLDR ids).
  const links = new Map();
  for (const line of need('tzdata.zi').split('\n')) {
    const m = /^L (\S+) (\S+)/.exec(line);
    if (m) links.set(m[2], m[1]);
  }
  const intlZones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  // Only the names browsers report (Intl) and the hand-checked ZONE_FIX list: tzdata's own
  // links now send some old names to a merged zone in another country (Asmera -> Nairobi).
  const linkOut = new Map();
  const chain = (n) => { let t = n, k = 0; while (!zones.has(t) && links.has(t) && k++ < 5) t = links.get(t); return zones.has(t) ? t : null; };
  const resolveLink = (n) => (F.ZONE_FIX[n] && zones.has(F.ZONE_FIX[n]) ? F.ZONE_FIX[n] : chain(n));
  for (const n of new Set([...intlZones, ...Object.keys(F.ZONE_FIX)])) {
    if (zones.has(n)) continue;
    const t = F.ZONE_FIX[n] && zones.has(F.ZONE_FIX[n]) ? F.ZONE_FIX[n] : null;
    if (t) linkOut.set(n, t);
    else if (!/^(Etc\/|UTC$|GMT$)/.test(n)) warn.push(`zone ${n}: not mapped (add it to ZONE_FIX after checking its country)`);
  }

  /* ---------- cities ---------- */
  const OK_CODES = new Set(['PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLC', 'PPLG', 'PPLS', 'PPLF', 'PPLR']);
  const all = [];
  for (const line of need('cities15000.txt').split('\n')) {
    if (!line) continue;
    const c = line.split('\t');
    if (!OK_CODES.has(c[7])) continue;
    all.push({
      gid: c[0], name: c[1], ascii: c[2], alts: c[3] ? c[3].split(',') : [], lat: Number(c[4]), lon: Number(c[5]), fcode: c[7], cc: c[8],
      admin1: c[10], pop: Number(c[14]) || 0, tz: c[17],
    });
  }
  const byKey = new Map();   // 'fold|cc' -> [city]
  const addKey = (k, city) => { if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(city); };
  for (const city of all) {
    const names = new Set([fold(city.name), fold(city.ascii)]);
    for (const a of city.alts) if (/^[\p{Script=Latin}\s'.\-]+$/u.test(a)) names.add(fold(a));
    for (const n of names) if (n) addKey(n + '|' + city.cc, city);
  }
  const find = (key) => {
    const [name, cc] = key.split('|');
    const exact = all.filter(c => c.cc === cc && (fold(c.name) === fold(name) || fold(c.ascii) === fold(name)));
    const list = exact.length ? exact : (byKey.get(fold(name) + '|' + cc) || []);
    return list.slice().sort((a, b) => b.pop - a.pop || (a.gid < b.gid ? -1 : 1))[0] || null;
  };

  const chosen = new Map();   // gid -> city
  const want = (city, why) => { if (city) { chosen.set(city.gid, city); city.why = city.why || why; } };
  // capitals
  for (const c of all) if (c.fcode === 'PPLC' && ccSet.has(c.cc)) want(c, 'capital');
  // big cities: 300k+, at most the 12 biggest per country unless 1.5M+
  const perCc = new Map();
  for (const c of all.filter(x => x.pop >= 300000).sort((a, b) => b.pop - a.pop)) {
    const n = (perCc.get(c.cc) || 0) + 1; perCc.set(c.cc, n);
    if (n <= 12 || c.pop >= 1500000) want(c, 'big');
  }
  // tourist places too small for cities15000 (hand-placed; the zone comes from the nearest city)
  for (const [key, [lat, lon]] of Object.entries(F.EXTRA_CITIES || {})) {
    const [name, cc] = key.split('|');
    const near = all.filter(c => c.cc === cc).sort((a, b) => km(a, { lat, lon }) - km(b, { lat, lon }))[0];
    if (!near) { warn.push(`extra city ${key}: no city nearby for its zone`); continue; }
    const city = { gid: 'x:' + key, name, ascii: name, alts: [], lat, lon, fcode: 'PPL', cc, admin1: '', pop: 0, tz: near.tz };
    all.push(city); addKey(fold(name) + '|' + cc, city);
  }
  // the hand lists
  const listKeys = new Set([...F.TOURIST, ...Object.keys(F.ALIASES), ...Object.keys(F.CITY_LANG), ...Object.values(F.AIRPORT_CITY), ...Object.values(F.METRO || {}),
    ...Object.keys(F.RENAME || {}), ...Object.values(F.CITY_KIND).flatMap(s => s.split(','))]);
  const keyCity = new Map();
  for (const k of listKeys) {
    const c = find(k);
    if (!c) { warn.push(`city ${k}: not in GeoNames cities15000`); continue; }
    keyCity.set(k, c); want(c, 'listed');
  }
  // drop near-duplicates (the same place twice) and districts of a bigger city (Islington, Brent ...)
  let cities = [...chosen.values()].sort((a, b) => b.pop - a.pop || (a.gid < b.gid ? -1 : 1));
  const kept = [];
  for (const c of cities) {
    const dup = kept.find(k => k.cc === c.cc && fold(k.name) === fold(c.name) && km(k, c) < 40);
    if (dup) { warn.push(`city ${c.name}|${c.cc}: duplicate of a bigger one nearby, dropped`); continue; }
    const part = c.why === 'big' && /^(PPL|PPLA3|PPLA4)$/.test(c.fcode) && kept.find(k => k.cc === c.cc && km(k, c) < 12);
    if (part) { warn.push(`city ${c.name}|${c.cc}: part of ${part.name}, dropped`); continue; }
    kept.push(c);
  }
  cities = kept;
  const cityIdx = new Map(cities.map((c, i) => [c.gid, i]));

  // per-city extras
  const kindOf = new Map();
  for (const [k, list] of Object.entries(F.CITY_KIND)) for (const key of list.split(',')) { const c = keyCity.get(key); if (c) kindOf.set(c.gid, k); }
  const langOf = new Map(Object.entries(F.CITY_LANG).map(([k, v]) => [keyCity.get(k)?.gid, v]).filter(([g]) => g));
  const aliasOf = new Map();
  for (const [k, v] of Object.entries(F.ALIASES)) { const c = keyCity.get(k); if (c && v) aliasOf.set(c.gid, v.split(',').map(s => clean(s)).filter(Boolean)); }
  const renameOf = new Map(Object.entries(F.RENAME || {}).map(([k, v]) => [keyCity.get(k)?.gid, v]).filter(([g]) => g));

  /* ---------- the zone each city uses (a city's tz must be known) ---------- */
  const zoneNames = [...zones.keys()].sort();
  const zoneIdx = new Map(zoneNames.map((z, i) => [z, i]));
  for (const c of cities) {
    let z = c.tz;
    if (!zones.has(z)) z = resolveLink(z);
    if (!z) { warn.push(`city ${c.name}|${c.cc}: unknown zone ${c.tz}`); z = null; }
    c.zone = z;
  }
  cities = cities.filter(c => c.zone);
  cities.forEach((c, i) => cityIdx.set(c.gid, i));

  /* ---------- a zone's own city (the exemplar, when the table has it) ---------- */
  const zoneCity = new Map();
  for (const z of zoneNames) {
    const zc = zones.get(z);
    const ex = fold(z.split('/').pop().replace(/_/g, ' '));
    let best = cities.find(c => c.cc === zc.cc && (fold(c.name) === ex || fold(c.ascii) === ex || (aliasOf.get(c.gid) || []).some(a => fold(a) === ex)) && km(c, zc) < 80);
    if (!best && F.CITY_STATES.includes(zc.cc)) best = cities.filter(c => c.cc === zc.cc).sort((a, b) => b.pop - a.pop)[0];
    // Else the table city at the zone's own point (tzdata places a zone on its city): Tirane -> Tirana, Ho_Chi_Minh.
    if (!best) best = cities.filter(c => c.cc === zc.cc && km(c, zc) < 25).sort((a, b) => km(a, zc) - km(b, zc))[0];
    if (best) zoneCity.set(z, cityIdx.get(best.gid));
  }

  /* ---------- airports ---------- */
  const airports = new Map();
  const medium = [];
  const rows = csvRows(need('airports.csv'));
  const head = rows.shift();
  const col = Object.fromEntries(head.map((h, i) => [h, i]));
  const tableNames = new Map();   // 'fold|cc' -> city
  for (const c of cities) for (const n of [c.name, c.ascii, ...(aliasOf.get(c.gid) || [])]) { const k = fold(n) + '|' + c.cc; if (!tableNames.has(k)) tableNames.set(k, c); }
  for (const r of rows) {
    const type = r[col.type], iata = r[col.iata_code], cc = r[col.iso_country];
    if (!/^[A-Z]{3}$/.test(iata || '') || r[col.scheduled_service] !== 'yes' || !(type === 'large_airport' || type === 'medium_airport')) continue;
    if (type === 'medium_airport' && !F.AIRPORT_CITY[iata]) medium.push(r);
    const at = { lat: Number(r[col.latitude_deg]), lon: Number(r[col.longitude_deg]) };
    if (type === 'medium_airport' && !F.AIRPORT_CITY[iata]) continue;   // second pass below
    let city = null;
    if (F.AIRPORT_CITY[iata]) city = keyCity.get(F.AIRPORT_CITY[iata]) || null;
    if (!city) { const c = tableNames.get(fold(r[col.municipality]) + '|' + cc); if (c && km(c, at) < 80) city = c; }
    if (!city && type === 'large_airport') {
      const near = cities.filter(c => c.cc === cc && km(c, at) < 60).sort((a, b) => b.pop - a.pop)[0];
      if (near) city = near;
    }
    if (!city) continue;
    airports.set(iata, cityIdx.get(city.gid));
  }
  // medium airports: only for a listed place, a capital or a 1M+ city that has no large airport in the table
  const served = new Set(airports.values());
  for (const r of medium) {
    const iata = r[col.iata_code], cc = r[col.iso_country];
    const at = { lat: Number(r[col.latitude_deg]), lon: Number(r[col.longitude_deg]) };
    const c = tableNames.get(fold(r[col.municipality]) + '|' + cc);
    if (!c || km(c, at) > 60 || served.has(cityIdx.get(c.gid))) continue;
    if (!(c.why === 'listed' || c.why === 'capital' || c.pop >= 1000000)) continue;
    airports.set(iata, cityIdx.get(c.gid)); served.add(cityIdx.get(c.gid));
  }
  for (const [code, key] of Object.entries(F.METRO || {})) { const c = keyCity.get(key); if (c && !airports.has(code)) airports.set(code, cityIdx.get(c.gid)); }

  /* ---------- serialise ---------- */
  const capitalOf = new Map();
  for (const c of cities) if (c.fcode === 'PPLC' && !capitalOf.has(c.cc)) capitalOf.set(c.cc, cityIdx.get(c.gid));
  const countryRows = countries.map(c => {
    const langs = (F.LANGS[c.cc] || c.langs.split(',').map(l => l.trim()).filter(Boolean).slice(0, 3).join(','));
    const capital = capitalOf.has(c.cc) ? b36(capitalOf.get(c.cc)) : '';
    return [c.cc, c.ccy, langs, F.PLUGS[c.cc] || '', F.LEFT.has(c.cc) ? 'L' : '', F.EMERGENCY[c.cc] || '', F.WEEKEND[c.cc] || '', F.KIND[c.cc] || '', capital, F.FLAGS[c.cc] || '']
      .map(clean).join(';').replace(/;+$/, '');
  });
  const zoneCc = (z) => zones.get(z).cc;
  const zoneRows = zoneNames.map(z => {
    const v = zones.get(z), city = zoneCity.has(z) ? b36(zoneCity.get(z)) : '';
    return [packZone(z), v.cc, R2(v.lat), R2(v.lon), city].join(';').replace(/;+$/, '');
  });
  const linkRows = [...linkOut.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([n, t]) => `${packZone(n)}>${b36(zoneIdx.get(t))}`);
  const cityRows = cities.map(c => {
    const own = kindOf.get(c.gid);
    const kind = own && own !== (F.KIND[c.cc] || '') ? own : '';
    const ccField = zoneCc(c.zone) === c.cc ? '' : c.cc;
    const name = renameOf.get(c.gid) || (/^(KR|KP|JP)$/.test(c.cc) ? c.name.replace(/-(si|shi|gun)$/i, '') : c.name);
    const aliases = [...(aliasOf.get(c.gid) || [])];
    if (renameOf.has(c.gid) && !aliases.some(a => fold(a) === fold(c.name))) aliases.unshift(clean(c.name));
    for (let i = aliases.length - 1; i >= 0; i--) if (fold(aliases[i]) === fold(name) || aliases.findIndex(a => fold(a) === fold(aliases[i])) < i) aliases.splice(i, 1);
    return [clean(name), ccField, b36(zoneIdx.get(c.zone)), R2(c.lat), R2(c.lon), b36(Math.round(c.pop / 1000)), kind, langOf.get(c.gid) || '', aliases.join(',')]
      .join(';').replace(/;+$/, '');
  });
  const airportRows = [...airports.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([code, i]) => code + b36(i));

  const raw = {
    version: new Date().toISOString().slice(0, 10),
    states: F.CITY_STATES.join(' '),
    zones: zoneRows.join('\n'), links: linkRows.join(' '), countries: countryRows.join('\n'), cities: cityRows.join('\n'), airports: airportRows.join(' '),
  };
  const js = renderTravelData(raw);
  log(`zones ${zoneRows.length} (+${linkRows.length} links), countries ${countryRows.length}, cities ${cities.length}, airports ${airportRows.length}, ${Math.round(js.length / 1024)} KB`);
  return { js, raw, warn, stats: { zones: zoneRows.length, links: linkRows.length, countries: countryRows.length, cities: cities.length, airports: airportRows.length, bytes: Buffer.byteLength(js) } };
}

/* ---------- the generated file: the raw tables + the small parser (tools/travel-data-runtime.js) ---------- */
// The parser travels inside the generated file so every loader (the page,
// lib/travel-data.mjs, lib/travel-logic.mjs) gets the same TR_DATA. Change
// tools/travel-data-runtime.js, then run --relink (no downloads needed).
export const RUNTIME_FILE = join(HERE, 'travel-data-runtime.js');
const HEADER = `/* ============================================================
   TRAVEL DATA (generated: do not edit by hand). Owner: PLACES.
   Made by tools/build-travel-data.mjs (travel spec 3.4) from:
     - IANA tzdata zone.tab and backward links (public domain)
     - GeoNames cities15000 and countryInfo (CC BY 4.0, https://www.geonames.org/)
     - OurAirports airports (public domain, https://ourairports.com/)
     - hand-written facts: tools/travel-data-facts.mjs
   trPlaceTables() parses the strings once; TR_DATA gives the tables in the
   shape trPlaceIndexFromData (69-travel-logic.js) reads. Helpers: 69-travel-places.js.
   Raw rows are newline-separated, fields ';'-separated; base-36 numbers are
   indexes (zones, cities) or thousands of people; zone areas are packed
   (A Africa, M America, N Antarctica, R Arctic, S Asia, T Atlantic,
   U Australia, E Europe, I Indian, P Pacific).
     zones      zone;cc;lat;lon;city
     links      oldName>zone (names browsers and calendars still report)
     countries  cc;ccy;langs;plugs;L;emergency;weekend;kind;capital;flag
     cities     name;cc (when not the zone's);zone;lat;lon;pop;kind;lang;aliases
     airports   IATA + city
   ============================================================ */
`;
export function renderTravelData(raw) {
  for (const [k, v] of Object.entries(raw)) if (/[`$\\]/.test(String(v))) throw new Error(`table ${k} holds a character the file cannot carry`);
  const lit = (v) => (String(v).includes('\n') ? '`' + v + '`' : "'" + String(v).replace(/'/g, "\\'") + "'");
  return HEADER + 'const TR_DATA_RAW = {\n'
    + Object.entries(raw).map(([k, v]) => `  ${k}: ${lit(v)},\n`).join('') + '};\n' + readFileSync(RUNTIME_FILE, 'utf8');
}
/** The raw tables of an existing generated file (for --relink). */
export function readRaw(file) {
  const m = /const TR_DATA_RAW = (\{[\s\S]*?\n\});\n/.exec(readFileSync(file, 'utf8'));
  if (!m) throw new Error('no TR_DATA_RAW block in ' + file);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + m[1])();
}

/* ---------- CLI ---------- */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const from = opt('--from');
  const out = opt('--out') || OUT_FILE;
  if (args.includes('--relink')) {
    // Re-emit the existing tables with the current parser (no downloads needed).
    writeFileSync(out, renderTravelData(readRaw(out)));
    console.log('relinked ' + out); process.exit(0);
  }
  if (!from) {
    console.error('usage: node tools/build-travel-data.mjs --from <downloads dir> [--out <file>] [--check] [--quiet]\n       node tools/build-travel-data.mjs --relink [--out <file>]');
    process.exit(2);
  }
  const { js, warn } = buildTravelData(from, { log: (m) => console.log(m) });
  if (!args.includes('--quiet')) for (const w of warn) console.log('  note: ' + w);
  // The version stamp is today's date: --check compares everything else.
  const strip = (s) => s.replace(/version: '[^']*'/, '');
  if (args.includes('--check')) {
    const cur = existsSync(out) ? readFileSync(out, 'utf8') : '';
    if (strip(cur) !== strip(js)) { console.error(`${out} is out of date`); process.exit(1); }
    console.log('up to date'); process.exit(0);
  }
  writeFileSync(out, js);
  console.log('wrote ' + out);
}
