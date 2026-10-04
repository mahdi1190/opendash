
/* ---------- the tables as objects, parsed on first use (a few ms, once) ---------- */
const _TRD_AREAS = { A: 'Africa', M: 'America', N: 'Antarctica', R: 'Arctic', S: 'Asia', T: 'Atlantic', U: 'Australia', E: 'Europe', I: 'Indian', P: 'Pacific' };
/** Place kinds (travel spec 4.6): they pick the moments' generated scene and the small motif. */
const TR_KIND_NAMES = Object.freeze({ t: 'towers', o: 'oldtown', c: 'coastal', m: 'mountain', d: 'desert', p: 'tropical', n: 'nordic', l: 'lowlands' });
const _TRD_SPECIAL = { 'ß': 'ss', 'æ': 'ae', 'Æ': 'ae', 'ø': 'o', 'Ø': 'o', 'đ': 'd', 'Đ': 'd', 'ł': 'l', 'Ł': 'l', 'ı': 'i', 'œ': 'oe', 'Œ': 'oe', 'þ': 'th', 'Þ': 'th', 'ð': 'd', 'Ð': 'd', 'ħ': 'h' };
let _trdTables = null;
/** ASCII-folded lower-case words: 'Zürich' -> 'zurich', 'Kraków' -> 'krakow' (tools/build-travel-data.mjs folds the same way). */
function trdFold(s) {
  return String(s == null ? '' : s).replace(/[ßæÆøØđĐłŁıœŒþÞðÐħ]/g, c => _TRD_SPECIAL[c]).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[‘’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function _trdZone(p) { const a = _TRD_AREAS[p.charAt(0)]; return a && p.charAt(1) === '/' ? a + p.slice(1) : p; }
/**
 * The offline tables as objects (built once):
 *   countries {CC: {cc, ccy, langs[], plugs, left, emergency, weekend[], kind, capital, flag}}
 *   cities    [{id, name, cc, zone, lat, lon, pop, kind, lang, aliases[]}], biggest first
 *   zones     {zone: {cc, lat, lon, city}}      links {oldName: zone}
 *   airports  {IATA: cityId}                    states [cc] (the zone is the city)
 *   byId      Map cityId -> city
 * City ids are the folded name and the country ('tokyo-jp', 'new-york-us'); a smaller
 * namesake in the same country also gets its row number. trPlaceIndexFromData
 * (69-travel-logic.js) makes the same ids.
 */
function trPlaceTables() {
  if (_trdTables) return _trdTables;
  const R = TR_DATA_RAW, n36 = (s) => parseInt(s, 36);
  const countries = {};
  for (const row of R.countries.split('\n')) {
    const f = row.split(';');
    countries[f[0]] = { cc: f[0], ccy: f[1] || '', langs: f[2] ? f[2].split(',') : [], plugs: f[3] || '', left: f[4] === 'L', emergency: f[5] || '',
      weekend: (f[6] || '60').split('').map(Number), kind: TR_KIND_NAMES[f[7]] || '', capital: f[8] || '', flag: f[9] || '' };
  }
  const zoneRows = R.zones.split('\n').map(r => r.split(';'));
  const cities = [], byId = new Map();
  for (const row of R.cities.split('\n')) {
    const f = row.split(';');
    const z = zoneRows[n36(f[2])];
    const cc = f[1] || z[1];
    let id = (trdFold(f[0]).replace(/ /g, '-') || 'place') + '-' + cc.toLowerCase();
    if (byId.has(id)) id += '-' + cities.length.toString(36);   // same rule as trPlaceIndexFromData (69-travel-logic.js)
    const c = { id, name: f[0], cc, zone: _trdZone(z[0]), lat: Number(f[3]), lon: Number(f[4]), pop: n36(f[5] || '0') * 1000,
      kind: TR_KIND_NAMES[f[6]] || (countries[cc] ? countries[cc].kind : '') || 'oldtown', lang: f[7] || '', aliases: f[8] ? f[8].split(',') : [] };
    cities.push(c); byId.set(id, c);
  }
  for (const k in countries) { const i = countries[k].capital; countries[k].capital = i ? cities[n36(i)].id : ''; }
  const zones = {};
  for (const z of zoneRows) zones[_trdZone(z[0])] = { cc: z[1], lat: Number(z[2]), lon: Number(z[3]), city: z[4] ? cities[n36(z[4])].id : '' };
  const links = {};
  for (const p of R.links.split(' ')) { if (!p) continue; const i = p.indexOf('>'); links[_trdZone(p.slice(0, i))] = _trdZone(zoneRows[n36(p.slice(i + 1))][0]); }
  const airports = {};
  for (const p of R.airports.split(' ')) if (p) airports[p.slice(0, 3)] = cities[n36(p.slice(3))].id;
  _trdTables = { version: R.version, countries, cities, zones, links, airports, states: R.states.split(' '), byId };
  return _trdTables;
}
/** The tables in the shape trPlaceIndexFromData (69-travel-logic.js) reads; parsed on first use. */
const TR_DATA = Object.freeze({
  get version() { return TR_DATA_RAW.version; },
  get countries() { return trPlaceTables().countries; },
  get cities() { return trPlaceTables().cities; },
  get zones() { return trPlaceTables().zones; },
  get links() { return trPlaceTables().links; },
  get airports() { return trPlaceTables().airports; },
});
