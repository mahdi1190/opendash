/* ============================================================
   TRAVEL LOGIC (pure). Owner: TRIPS (travel spec 3.1-3.3, 5.3, 5.5).
   Where the user is, which trips the calendar, the computer's time zone and
   card payments show, and the facts the travel suggestions read (T1-T14 in
   68-suggest-rules-travel.js, through ctx.travel). No DOM, no page globals
   and no clock: the page (69-travel.js trSnapshot) and Node
   (lib/travel-logic.mjs) pass everything in, so both get the same answers.
   Zone maths come from 07-core-clock-logic.js (clockPartsIn, clockOffsetIn,
   clockAtIn, clockAddDays, clockDaysBetween, canonZone, clockPlaceless).
   Inferred places, legs, trips and totals are recomputed on demand and never
   stored (spec 6.2); only the user's decisions live in state.travel.

     trPlaceIndex(D)               the place index over plain tables
                                   D = {countries, cities, zones, airports} (tests)
     trPlaceIndexFromData(TR_DATA) the same over 69-travel-data.js (city ids 'tokyo-jp', 'new-york-us')
     trPlace(text, P, o)           the city or country a text names (last comma part first)
     trZonePlace(zone, P)          the country (and, for city states, the city) of a zone
     trLegs(events, P, o)          flights, trains, ferries, coaches -> legs
     trJourneys(legs)              legs chained (next.from ~ prev.to within 24 h), layovers
     trTripEvents(events, P, o)    multi-day trips with a place, hotels, holidays
     trZoneEpisodes(changes, o)    time spent on a zone abroad (the time.json history)
     trFxSignal(memo, o)           {ccy, amt, rate, cc, atm, fee, online, abroad}
     trPayEpisodes(rows, o)        days of card payments abroad, per country
     trTripsFrom(legs, tripEvents, zoneEps, payEps, home, P, o)   trips (merged, decided)
     trStatus(trip, now, o)        planned | departing | away | returning | home | past
     trWhere(sig, now, P)          where the user is now {place, source, conf, ...}
     trGroup(trip, ctx)            a trip's events, tasks and spending
     trBody(o)                     the body clock after a long flight (jet lag)
     trTheirTime(m, o)             a meeting in the other people's time, a fairer slot
     trMomentKey / trMomentDue     once-keys and the quiet rules for the moments
     trBuildSnapshot(input)        all of it -> ctx.travel (the suggestions' facts)
   ============================================================ */

const TRL_VERSION = 1;
const TRL_MIN_MS = 60000, TRL_HOUR_MS = 3600000, TRL_DAY_MS = 86400000;
/** Words that make a task part of a trip (5.5). */
const TRL_TRIP_TASK_RE = /\b(pack|packing|passport|visa|check.?in|adapter|currency|insurance|hotel|itinerary|boarding pass|luggage|suitcase)\b/i;
/** An all-day event like this without a place is still a trip, destination unknown ("Where to?"). */
const TRL_HOLIDAY_RE = /\b(holiday|holidays|vacation|trip|getaway|honeymoon|abroad|travel|travelling|traveling)\b/i;
const TRL_HOTEL_RE = /\b(hotel|airbnb|hostel|check.?in|accommodation|ryokan|resort)\b/i;
/** An all-day event that already says "away" (T5 stays quiet). */
const TRL_OOO_RE = /\b(away|ooo|out of (?:the )?office|annual leave|a\/l|leave|pto|vacation|holiday|holidays|off work|days? off|travel(?:ling)?)\b/i;
const TRL_CITY_STATES = new Set(['SG', 'HK', 'MO', 'MC', 'VA', 'SM', 'GI', 'LI', 'AD', 'MT', 'BH', 'QA', 'KW', 'LU']);
/** Minutes at the station or airport before departure (T2), by mode. */
const TRL_BUFFER_MIN = Object.freeze({ flight: 120, 'flight-domestic': 90, eurostar: 60, train: 15, ferry: 60, coach: 15 });
const TRL_TRAVEL_MIN = 60;          // getting there (T2), until Settings has a value
const _trlPad = (n) => String(n).padStart(2, '0');

/* ---------- small helpers ---------- */
function _trlHM(min) { const m = ((Math.round(Number(min) || 0) % 1440) + 1440) % 1440; return _trlPad(Math.floor(m / 60)) + ':' + _trlPad(m % 60); }
function _trlFold(s) {
  return String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function _trlHash(s) {
  let h = 2166136261;
  const t = String(s);
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
/** 'tokyo', 'new-york' (tags, keys). */
function trTagSlug(s) { return _trlFold(s).replace(/ /g, '-').slice(0, 40); }
/** ms from a number or an ISO string (NaN when neither). */
function _trlMs(v) { if (typeof v === 'number') return v; const t = Date.parse(String(v || '')); return Number.isFinite(t) ? t : NaN; }
function _trlZone(z) { return typeof canonZone === 'function' ? canonZone(z) : (z || ''); }
function _trlPlaceless(z) { return typeof clockPlaceless === 'function' ? clockPlaceless(z) : /^(UTC|Etc\/)/.test(String(z || '')); }
/** {date, min, dow} of an instant in a zone. */
// Both are pure and called for every event several times per snapshot (trSnapshot must stay
// under 3 ms for 300 events): small caches, cleared when they grow.
const _trlWallMemo = new Map(), _trlEdgeMemo = new WeakMap();
function trWall(ms, zone) {
  const k = zone + '|' + Math.floor(ms / 60000);
  let p = _trlWallMemo.get(k);
  if (!p) { const q = clockPartsIn(ms, zone); p = [q.iso, q.min, q.dow]; if (_trlWallMemo.size > 20000) _trlWallMemo.clear(); _trlWallMemo.set(k, p); }
  return { date: p[0], min: p[1], dow: p[2] };
}
/** Instant of an event edge {dateTime, timeZone} | {date}: an offset in the string wins; else the edge's zone, else `zone`. */
function _trlEdgeMs(w, zone) {
  if (!w) return NaN;
  if (typeof w !== 'object') return _trlEdgeMsRaw(w, zone);
  // Keyed by the edge object itself (events are not edited in place: a new fetch makes new objects).
  const c = _trlEdgeMemo.get(w);
  if (c && c.z === zone && c.dt === w.dateTime && c.d === w.date) return c.v;
  const v = _trlEdgeMsRaw(w, zone);
  _trlEdgeMemo.set(w, { z: zone, dt: w.dateTime, d: w.date, v });
  return v;
}
function _trlEdgeMsRaw(w, zone) {
  if (w.dateTime) {
    const s = String(w.dateTime);
    if (/(Z|[+-]\d{2}:?\d{2})$/.test(s)) return Date.parse(s);
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(s);
    return m ? clockAtIn(m[1], Number(m[2]) * 60 + Number(m[3]), _trlZone(w.timeZone) || zone) : NaN;
  }
  if (w.date) return clockAtIn(String(w.date).slice(0, 10), 0, zone);
  return NaN;
}
function _trlTitle(ev) { return String((ev && (ev.summary || ev.title)) || ''); }
function _trlSkipEvent(ev) {
  return !ev || ev.status === 'cancelled' || ev.selfResponse === 'declined' || ev.declined === true || /\bcancel+ed\b/i.test(_trlTitle(ev));
}

/* ---------- countries: alpha-3 codes and English names (memos, titles) ---------- */
const TRL_A3 = 'AFGAF ALAAX ALBAL DZADZ ASMAS ANDAD AGOAO AIAAI ATAAQ ATGAG ARGAR ARMAM ABWAW AUSAU AUTAT AZEAZ BHSBS BHRBH BGDBD BRBBB BLRBY BELBE BLZBZ BENBJ BMUBM BTNBT BOLBO BESBQ BIHBA BWABW BVTBV BRABR IOTIO BRNBN BGRBG BFABF BDIBI CPVCV KHMKH CMRCM CANCA CYMKY CAFCF TCDTD CHLCL CHNCN CXRCX CCKCC COLCO COMKM COGCG CODCD COKCK CRICR CIVCI HRVHR CUBCU CUWCW CYPCY CZECZ DNKDK DJIDJ DMADM DOMDO ECUEC EGYEG SLVSV GNQGQ ERIER ESTEE SWZSZ ETHET FLKFK FROFO FJIFJ FINFI FRAFR GUFGF PYFPF ATFTF GABGA GMBGM GEOGE DEUDE GHAGH GIBGI GRCGR GRLGL GRDGD GLPGP GUMGU GTMGT GGYGG GINGN GNBGW GUYGY HTIHT HMDHM VATVA HNDHN HKGHK HUNHU ISLIS INDIN IDNID IRNIR IRQIQ IRLIE IMNIM ISRIL ITAIT JAMJM JPNJP JEYJE JORJO KAZKZ KENKE KIRKI PRKKP KORKR KWTKW KGZKG LAOLA LVALV LBNLB LSOLS LBRLR LBYLY LIELI LTULT LUXLU MACMO MDGMG MWIMW MYSMY MDVMV MLIML MLTMT MHLMH MTQMQ MRTMR MUSMU MYTYT MEXMX FSMFM MDAMD MCOMC MNGMN MNEME MSRMS MARMA MOZMZ MMRMM NAMNA NRUNR NPLNP NLDNL NCLNC NZLNZ NICNI NERNE NGANG NIUNU NFKNF MKDMK MNPMP NORNO OMNOM PAKPK PLWPW PSEPS PANPA PNGPG PRYPY PERPE PHLPH PCNPN POLPL PRTPT PRIPR QATQA REURE ROURO RUSRU RWARW BLMBL SHNSH KNAKN LCALC MAFMF SPMPM VCTVC WSMWS SMRSM STPST SAUSA SENSN SRBRS SYCSC SLESL SGPSG SXMSX SVKSK SVNSI SLBSB SOMSO ZAFZA SGSGS SSDSS ESPES LKALK SDNSD SURSR SJMSJ SWESE CHECH SYRSY TWNTW TJKTJ TZATZ THATH TLSTL TGOTG TKLTK TONTO TTOTT TUNTN TURTR TKMTM TCATC TUVTV UGAUG UKRUA AREAE GBRGB USAUS UMIUM URYUY UZBUZ VUTVU VENVE VNMVN VGBVG VIRVI WLFWF ESHEH YEMYE ZMBZM ZWEZW XKXXK';
/** Codes that are also words or US states at the end of a memo: they count only with a city or a currency of that country. */
const TRL_A3_WEAK = new Set('AND CAN PER TON COM GIN BEN GUM ARM NIC DOM MAC MAR SUR TUN BES PAN NAM LIE FRO GAB SOM ATA ASM PRY CUB HND'.split(' '));
const TRL_A2_WEAK = new Set('TO IN IT IS AT BE NO ME AS AM ST SA AG BV CO DO MY MA ID PE PA PR NE GA LA AL CA DE IL MD MN MO MS MT NC SC SD TN VA VI KY AR AZ GU MH MP UM BY SO CH CC CD TV'.split(' '));
const TRL_COUNTRY_ALIASES = Object.freeze({
  usa: 'US', 'united states of america': 'US', america: 'US', uk: 'GB', 'great britain': 'GB', britain: 'GB', england: 'GB', scotland: 'GB', wales: 'GB',
  'northern ireland': 'GB', holland: 'NL', 'the netherlands': 'NL', uae: 'AE', emirates: 'AE', 'south korea': 'KR', korea: 'KR', czechia: 'CZ',
  'czech republic': 'CZ', turkey: 'TR', turkiye: 'TR', russia: 'RU', vietnam: 'VN', 'viet nam': 'VN', 'ivory coast': 'CI', 'hong kong': 'HK', macau: 'MO',
  macao: 'MO', taiwan: 'TW', bosnia: 'BA', macedonia: 'MK', laos: 'LA', burma: 'MM', iran: 'IR', syria: 'SY', palestine: 'PS', bolivia: 'BO', venezuela: 'VE',
});
let _trlA3Map = null, _trlNames = null, _trlDn = null;
function _trlAlpha3() {
  if (!_trlA3Map) { _trlA3Map = new Map(); for (const p of TRL_A3.split(' ')) _trlA3Map.set(p.slice(0, 3), p.slice(3)); }
  return _trlA3Map;
}
function _trlDisplayNames() {
  if (_trlDn === null) { try { _trlDn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { _trlDn = false; } }
  return _trlDn || null;
}
/** The country's English name ('Japan'), from Intl (no name table). */
function trCountryLabel(cc) {
  const c = String(cc || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '';
  const dn = _trlDisplayNames();
  let n = '';
  try { n = dn ? dn.of(c) : ''; } catch (e) { n = ''; }
  return n && n !== c ? n.replace(/\s+SAR China$/, '') : c;
}
/** folded English country name -> alpha-2 ('japan' -> 'JP'), built once. */
function _trlCountryNames() {
  if (_trlNames) return _trlNames;
  const m = new Map();
  for (const a2 of _trlAlpha3().values()) {
    const n = trCountryLabel(a2);
    if (!n || n === a2) continue;
    const add = (s) => { const f = _trlFold(s).replace(/^the /, ''); if (f.length >= 4 && !m.has(f)) m.set(f, a2); };
    add(n); add(n.replace(/\s*\(.*\)\s*$/, '')); add(n.split(' - ')[0]); add(n.replace(/ SAR China$/, ''));
  }
  for (const [k, v] of Object.entries(TRL_COUNTRY_ALIASES)) m.set(k, v);
  _trlNames = m;
  return m;
}

/* ---------- the place index ---------- */
/** Names that are also common words or first names: in free text they count only after "in / to / at / visit". */
const TRL_NAMEY = new Set(['florence', 'sydney', 'austin', 'charlotte', 'jackson', 'madison', 'lincoln', 'georgia', 'chelsea', 'paris', 'adelaide', 'regina',
  'victoria', 'dallas', 'denver', 'phoenix', 'orlando', 'sofia', 'valencia', 'lima', 'kingston', 'hamilton', 'wellington', 'nelson', 'jordan', 'chad',
  'israel', 'india', 'eugene', 'savannah', 'aurora', 'alexandria', 'santiago', 'salvador', 'nice', 'reading', 'split', 'mobile', 'bath', 'male', 'orange',
  'buffalo', 'deal', 'march', 'may', 'york', 'paisley', 'derby', 'darwin', 'hull', 'wells', 'eastbourne', 'warwick', 'cork', 'carmel', 'troy', 'guernsey',
  'jersey', 'america', 'turkey', 'china', 'cuba', 'peru', 'mali', 'oman', 'iran', 'iraq', 'niger', 'togo', 'kent', 'surrey', 'essex']);
const TRL_LEAD_WORDS = new Set(['in', 'to', 'at', 'visit', 'visiting', 'trip', 'from', 'via', 'into', 'around', 'near', 'flight', 'eurostar', 'train', 'ferry', 'coach', 'bus']);
/**
 * The place index. D (69-travel-data.js, or a test fixture) may give each table as an
 * array or an object keyed by id:
 *   countries {CC: {ccy, lang, plugs, ...}}
 *   cities    [{id, name, aliases?, cc, zone, lat, lon, kind?, lang?, pop?}]
 *   zones     {zone: {cc, city?} | [cc, city?]}
 *   airports  {IATA: cityId | {city, cc}}
 */
function trPlaceIndex(D) {
  D = D && typeof D === 'object' ? D : {};
  const P = { countries: new Map(), cities: new Map(), names: new Map(), zones: new Map(), zonesOf: new Map(), airports: new Map(), maxWords: 1, data: D };
  const each = (x, fn) => {
    if (Array.isArray(x)) x.forEach((v, i) => fn(v, String((v && (v.id || v.iata || v.zone || v.cc)) || i)));
    else if (x && typeof x === 'object') for (const k of Object.keys(x)) fn(x[k], k);
  };
  each(D.countries, (c, cc) => { if (/^[A-Za-z]{2}$/.test(cc)) P.countries.set(cc.toUpperCase(), Object.assign({ cc: cc.toUpperCase() }, c && typeof c === 'object' ? c : {})); });
  const addName = (name, city) => {
    const f = _trlFold(name);
    if (!f || f.length < 2) return;
    const words = f.split(' ').length;
    if (words > P.maxWords) P.maxWords = Math.min(5, words);
    const cur = P.names.get(f);
    if (!cur) P.names.set(f, city);
    else if ((Number(city.pop) || 0) > (Number(cur.pop) || 0)) P.names.set(f, city);
  };
  each(D.cities, (c, id) => {
    if (!c || typeof c !== 'object') return;
    const cc = String(c.cc || '').toUpperCase();
    // Zone ids are taken as given (tzdata names; checking each with Intl would cost ~40 ms): lookups canonicalise the query.
    const city = { id: String(c.id || id), name: String(c.name || c.n || id), cc, zone: String(c.zone || c.z || ''), lat: Number(c.lat), lon: Number(c.lon),
      kind: c.kind || '', lang: c.lang || '', pop: Number(c.pop) || 0 };
    P.cities.set(city.id, city);
    addName(city.name, city);
    for (const a of Array.isArray(c.aliases) ? c.aliases : (typeof c.aliases === 'string' ? c.aliases.split('|') : [])) addName(a, city);
  });
  each(D.zones, (z, zid) => {
    const zone = zid;
    const cc = String((z && (z.cc || z[0])) || '').toUpperCase();
    const cityId = (z && (z.city || z[1])) || '';
    if (!cc) return;
    P.zones.set(zone, { zone, cc, cityId });
    if (!P.zonesOf.has(cc)) P.zonesOf.set(cc, []);
    P.zonesOf.get(cc).push(zone);
  });
  each(D.airports, (a, iata) => {
    const code = String((a && a.iata) || iata).toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) return;
    const cityId = typeof a === 'string' ? a : String((a && (a.city || a.c)) || '');
    const city = P.cities.get(cityId) || null;
    P.airports.set(code, { iata: code, cityId, cc: String((a && a.cc) || (city && city.cc) || '').toUpperCase() });
  });
  return P;
}
const TRL_ZONE_AREAS = Object.freeze({ A: 'Africa', M: 'America', N: 'Antarctica', R: 'Arctic', S: 'Asia', T: 'Atlantic', U: 'Australia', E: 'Europe', I: 'Indian', P: 'Pacific' });
/**
 * The place index over 69-travel-data.js (TR_DATA: compact '\n' / ';' rows, see that file's
 * header). City ids are 'name-cc' slugs ('tokyo-jp', 'new-york-us'): stable when the tables are
 * regenerated, and the same on the page and the server (/api/travel/weather?place=).
 */
function trPlaceIndexFromData(D) {
  if (D && D.zones && typeof D.zones === 'object') {
    // 69-travel-data.js's TR_DATA gives the parsed tables (trPlaceTables: the same 'name-cc' ids, kinds by name); old zone names come from links.
    const P = trPlaceIndex(D);
    for (const [from, to] of Object.entries(D.links || {})) { const z = P.zones.get(to); if (z && !P.zones.has(from)) P.zones.set(from, { zone: from, cc: z.cc, cityId: z.cityId }); }
    return P;
  }
  if (!D || typeof D.zones !== 'string') return trPlaceIndex({});
  const unpack = (z) => { const m = /^([A-Z])\/(.+)$/.exec(z); return m && TRL_ZONE_AREAS[m[1]] ? TRL_ZONE_AREAS[m[1]] + '/' + m[2] : z; };
  const rows = (s) => String(s || '').split('\n').filter(Boolean).map(r => r.split(';'));
  const zr = rows(D.zones);
  const zoneNames = zr.map(r => unpack(r[0]));
  const cr = rows(D.cities);
  const cities = [], ids = new Map();
  cr.forEach((r, i) => {
    const zone = zoneNames[parseInt(r[2], 36)] || '';
    const zrow = zr[parseInt(r[2], 36)];
    const cc = (r[1] || (zrow && zrow[1]) || '').toUpperCase();
    let id = (typeof trdFold === 'function' ? trdFold : _trlFold)(r[0]).replace(/ /g, '-') + '-' + cc.toLowerCase();
    if (ids.has(id)) id += '-' + i.toString(36);
    ids.set(id, i);
    cities.push({ id, name: r[0], cc, zone, lat: Number(r[3]), lon: Number(r[4]), pop: (parseInt(r[5] || '0', 36) || 0) * 1000, kind: r[6] || '', lang: r[7] || '',
      aliases: r[8] ? r[8].split(',') : [], row: i });
  });
  const zones = {};
  zr.forEach((r, i) => { const c = r[4] ? cities[parseInt(r[4], 36)] : null; zones[zoneNames[i]] = { cc: r[1], city: c ? c.id : '' }; });
  for (const l of String(D.links || '').split(' ').filter(Boolean)) {
    const [from, idx] = l.split('>');
    const to = zoneNames[parseInt(idx, 36)];
    if (from && to && zones[to]) zones[unpack(from)] = zones[to];
  }
  const countries = {};
  for (const r of rows(D.countries)) {
    if (!/^[A-Z]{2}$/.test(r[0] || '')) continue;
    countries[r[0]] = { ccy: r[1] || '', langs: r[2] || '', lang: String(r[2] || '').split(',')[0].split('-')[0], plugs: r[3] || '', left: r[4] === 'L',
      emergency: r[5] || '', weekend: r[6] || '', kind: r[7] || '', capital: r[8] && cities[parseInt(r[8], 36)] ? cities[parseInt(r[8], 36)].id : '' };
  }
  const airports = {};
  for (const a of String(D.airports || '').split(' ').filter(Boolean)) {
    const c = cities[parseInt(a.slice(3), 36)];
    if (c) airports[a.slice(0, 3)] = c.id;
  }
  const P = trPlaceIndex({ countries, cities, zones, airports });
  P.version = D.version || '';
  return P;
}
/** The zone of a country with one zone (or its first); '' when unknown. */
function _trlCountryZone(cc, P) {
  const z = P && P.zonesOf.get(cc);
  if (z && z.length) return z[0];
  return '';
}
function _trlCityPlace(c, how) { return { kind: 'city', cityId: c.id, name: c.name, label: c.name, cc: c.cc, zone: c.zone || '', how: how || '' }; }
function _trlCountryPlace(cc, P) {
  const z = P && P.zonesOf.get(cc);
  return { kind: 'country', cityId: '', name: trCountryLabel(cc), label: trCountryLabel(cc), cc, zone: z && z.length === 1 ? z[0] : '', how: 'country' };
}
/** A place from an airport code. */
function trAirportPlace(iata, P) {
  const a = P && P.airports.get(String(iata || '').toUpperCase());
  if (!a) return null;
  const c = P.cities.get(a.cityId);
  const pl = c ? _trlCityPlace(c, 'iata') : _trlCountryPlace(a.cc, P);
  pl.iata = a.iata;
  return pl;
}
/** Every city / country named in one folded part: [{start, n, city?, cc?}] (longest first wins its words). */
function _trlScan(f, P, o) {
  const toks = f ? f.split(' ') : [];
  const hits = [];
  const used = new Array(toks.length).fill(false);
  const names = _trlCountryNames();
  for (let n = Math.min(P ? P.maxWords : 1, 4, toks.length) || 0; n >= 1; n--) {
    for (let i = 0; i + n <= toks.length; i++) {
      if (used.slice(i, i + n).some(Boolean)) continue;
      const key = n === 1 ? toks[i] : toks.slice(i, i + n).join(' ');
      if (key.length < 3 && key !== 'uk') continue;
      const city = P ? P.names.get(key) : null;
      const cc = names.get(key) || '';
      if (!city && !cc) continue;
      if (o && o.strict && n === 1 && TRL_NAMEY.has(key) && !(i > 0 && TRL_LEAD_WORDS.has(toks[i - 1])) && !(o.lead && i === 0)) continue;
      hits.push({ start: i, n, city, cc });
      for (let k = i; k < i + n; k++) used[k] = true;
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}
/**
 * The place a text names: {kind: 'city'|'country', cityId, name, label, cc, zone} | null.
 * Comma-separated parts are read from the last one ("Hotel X, Shinjuku, Tokyo, Japan");
 * a city wins when its country agrees (or none is named). o.strict: names that are
 * also words or first names ("Nice", "Chad") need "in / to / at" before them.
 */
function trPlace(text, P, o) {
  o = o || {};
  if (!text) return null;
  const parts = String(text).split(/[,\n;|·()[\]]+/).map(s => s.trim()).filter(Boolean);
  let city = null, cc = '';
  for (let i = parts.length - 1; i >= 0 && !city; i--) {
    const hits = _trlScan(_trlFold(parts[i]), P, o);
    for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (h.cc && !cc) cc = h.cc;
      if (h.city && !city && (!cc || h.city.cc === cc)) city = h.city;
    }
    if (!city && o.iata !== false) {
      for (const m of String(parts[i]).matchAll(/\b([A-Z]{3})\b/g)) { const a = trAirportPlace(m[1], P); if (a) return a; }
    }
  }
  if (city && (!cc || city.cc === cc)) return _trlCityPlace(city, 'name');
  if (cc) return _trlCountryPlace(cc, P);
  return null;
}
/** The country of a time zone, and its city for city states: {cc, zone, cityId, label} | null (UTC / Etc: null). */
function trZonePlace(zone, P) {
  const z = _trlZone(zone);
  if (!z || _trlPlaceless(z)) return null;
  const e = P && (P.zones.get(z) || P.zones.get(String(zone)));
  const cc = e ? e.cc : '';
  const city = e && e.cityId && P ? P.cities.get(e.cityId) : null;
  const label = city ? city.name : (typeof clockZoneLabel === 'function' ? clockZoneLabel(z) : z.split('/').pop().replace(/_/g, ' '));
  const single = !!(cc && TRL_CITY_STATES.has(cc));
  return { kind: single && city ? 'city' : 'zone', cityId: single && city ? city.id : '', name: single ? label : trCountryLabel(cc) || label, label, zoneLabel: label, cc, zone: z, how: 'zone' };
}
function _trlSamePlace(a, b) {
  if (!a || !b) return true;
  if (a.cityId && b.cityId) return a.cityId === b.cityId;
  if (a.iata && b.iata) return a.iata === b.iata;
  return !!a.cc && a.cc === b.cc && (!a.zone || !b.zone || a.zone === b.zone);
}

/* ---------- C1: transport legs ---------- */
const TRL_CODE_RE = /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{1,4})\b/;
const TRL_IATA_PAIR_RE = /\b([A-Z]{3})\s*(?:→|->|⇒|–|—|-|>|\bto\b)\s*([A-Z]{3})\b/;
const TRL_ARROW_SPLIT_RE = /\s*(?:→|->|⇒|–>|—>|>)\s*|\s+to\s+/i;
const TRL_LEG_HINT_RE = /[→>⇒]|->|\bto\b|flight|✈|eurostar|train|ferry|coach|\b[A-Z]{3}\b/i;
function _trlModeOf(title) {
  if (/eurostar/i.test(title)) return 'eurostar';
  if (/\b(train|rail|railway|lner|avanti|tgv|ice|shinkansen|amtrak)\b/i.test(title)) return 'train';
  if (/\bferry\b/i.test(title)) return 'ferry';
  if (/\b(coach|bus)\b/i.test(title)) return 'coach';
  return 'flight';
}
/** One event -> a leg or null. */
function _trlLegOf(ev, P, o) {
  const title = _trlTitle(ev);
  if (!title || _trlSkipEvent(ev) || !ev.start || ev.start.date || ev.allDay) return null;
  if (!TRL_LEG_HINT_RE.test(title)) return null;
  const zone = o.zone;
  const depart = _trlEdgeMs(ev.start, zone), arrive = _trlEdgeMs(ev.end || ev.start, zone);
  if (!Number.isFinite(depart)) return null;
  const sz = _trlZone(ev.start.timeZone), ez = _trlZone(ev.end && ev.end.timeZone);
  const zonesDiffer = !!(sz && ez && sz !== ez);
  const mode = _trlModeOf(title);
  const codeM = TRL_CODE_RE.exec(title.replace(TRL_IATA_PAIR_RE, ' '));
  const flightWord = /\bflight\b|✈|\bfly(?:ing)?\b/i.test(title);
  let from = null, to = null, how = '';
  const ip = TRL_IATA_PAIR_RE.exec(title);
  if (ip) { const a = trAirportPlace(ip[1], P), b = trAirportPlace(ip[2], P); if (a && b) { from = a; to = b; how = 'iata'; } }
  if (!to) {
    const m = /\b(?:flight|fly(?:ing)?|eurostar|train|ferry|coach|bus|travel|trip)\s+(?:back\s+)?to\s+(.+)$/i.exec(title);
    if (m) { to = trPlace(m[1], P, { strict: true, lead: true }); if (to) how = 'to'; }
  }
  if (!to) {
    const parts = title.split(TRL_ARROW_SPLIT_RE);
    if (parts.length >= 2) {
      const a = trPlace(parts[0].split(/[:(]/).pop(), P, { strict: true, lead: true });
      const b = trPlace(parts[1], P, { strict: true, lead: true });
      if (a && b && !_trlSamePlace(a, b)) { from = a; to = b; how = 'pair'; }
    }
  }
  if (!to) return null;
  const code = codeM && !/^\d+$/.test(codeM[1]) ? `${codeM[1]} ${Number(codeM[2])}` : '';
  if (mode === 'flight') {
    if (!(code || flightWord || zonesDiffer || how === 'iata')) return null;
  } else if (how === 'iata') return null;
  if (!from && ev.location) from = trPlace(ev.location, P, {});
  if (!from && sz) { const zp = trZonePlace(sz, P); if (zp && zp.cc) from = zp; }
  if (from && to && _trlSamePlace(from, to) && how !== 'iata') from = null;
  const departZone = sz || (from && from.zone) || zone;
  const arriveZone = ez || (to && to.zone) || (to && to.cc ? _trlCountryZone(to.cc, P) : '') || departZone;
  return {
    id: 'leg:' + ev.id, eventId: String(ev.id || ''), mode: mode === 'flight' ? 'flight' : mode, code, carrier: code ? code.split(' ')[0] : '',
    title: title.slice(0, 120), from, to, depart, arrive: Number.isFinite(arrive) && arrive >= depart ? arrive : depart,
    departZone, arriveZone, intl: !!(from && to && from.cc && to.cc && from.cc !== to.cc), how,
  };
}
/**
 * Flights, trains, ferries and coaches in calendar events (Google's shape). Declined,
 * cancelled and all-day events are skipped. o: {zone (for times without one), from, to (ms window)}.
 * -> legs sorted by departure: {id, eventId, mode, code, carrier, from, to, depart, arrive, departZone, arriveZone, intl}
 */
function trLegs(events, P, o) {
  o = o || {};
  const out = [];
  for (const ev of events || []) {
    const l = _trlLegOf(ev, P, o);
    if (!l) continue;
    if (Number.isFinite(o.from) && l.arrive < o.from) continue;
    if (Number.isFinite(o.to) && l.depart > o.to) continue;
    out.push(l);
  }
  out.sort((a, b) => a.depart - b.depart);
  // A leg with no "from" starts where the one before it ended (within 24 h).
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i];
    if (!b.from && b.depart - a.arrive <= TRL_DAY_MS && b.depart >= a.arrive - 30 * TRL_MIN_MS) { b.from = a.to; b.intl = !!(b.from && b.to && b.from.cc && b.to.cc && b.from.cc !== b.to.cc); }
  }
  return out;
}
/** Legs chained into journeys (next.from ~ prev.to, within 24 h); a stop under 12 h is a layover. */
function trJourneys(legs) {
  const out = [];
  let cur = null;
  for (const l of (legs || []).slice().sort((a, b) => a.depart - b.depart)) {
    const prev = cur && cur.legs[cur.legs.length - 1];
    const gap = prev ? l.depart - prev.arrive : Infinity;
    // A leg back to where the journey began is a return (a day trip), never a connection.
    const back = !!(cur && cur.from && l.to && (cur.from.cc ? l.to.cc === cur.from.cc : false) && _trlSamePlace(l.to, cur.from));
    if (prev && !back && gap >= -30 * TRL_MIN_MS && gap <= TRL_DAY_MS && _trlSamePlace(l.from, prev.to)) {
      (gap <= 12 * TRL_HOUR_MS ? cur.layovers : cur.stopovers).push({ place: prev.to, from: prev.arrive, to: l.depart, minutes: Math.round(gap / TRL_MIN_MS) });
      cur.legs.push(l);
      Object.assign(cur, { to: l.to, arrive: l.arrive, arriveZone: l.arriveZone });
    } else {
      cur = { id: l.id, legs: [l], from: l.from, to: l.to, depart: l.depart, arrive: l.arrive, departZone: l.departZone, arriveZone: l.arriveZone, layovers: [], stopovers: [] };
      out.push(cur);
    }
  }
  for (const j of out) j.intl = !!(j.from && j.to && j.from.cc && j.to.cc && j.from.cc !== j.to.cc);
  return out;
}

/* ---------- C2: trip events (multi-day with a place, hotels, holidays) ---------- */
/**
 * -> [{eventId, kind: 'trip'|'hotel'|'holiday', place|null, from, to (inclusive ISO dates), days, title}]
 * o: {zone (for timed events' days)}
 */
function trTripEvents(events, P, o) {
  o = o || {};
  const out = [];
  for (const ev of events || []) {
    if (_trlSkipEvent(ev) || !ev.start) continue;
    if (/#holiday@|holiday@group\.v\.calendar|#contacts@|addressbook#/.test(String(ev.calendarId || ''))) continue;
    if (ev.eventType === 'birthday') continue;
    const title = _trlTitle(ev), loc = String(ev.location || '');
    const allDay = !!ev.start.date;
    let from, to;
    if (allDay) { from = String(ev.start.date).slice(0, 10); to = clockAddDays(String((ev.end && ev.end.date) || clockAddDays(from, 1)).slice(0, 10), -1); if (to < from) to = from; }
    else {
      const s = _trlEdgeMs(ev.start, o.zone), e = _trlEdgeMs(ev.end || ev.start, o.zone);
      if (!Number.isFinite(s)) continue;
      from = trWall(s, o.zone).date; to = trWall(Math.max(s, (Number.isFinite(e) ? e : s) - 1), o.zone).date;
    }
    const days = clockDaysBetween(from, to) + 1;
    if (TRL_HOTEL_RE.test(title) && (loc || days >= 2)) {
      const place = (loc && trPlace(loc, P, {})) || trPlace(title, P, { strict: true });
      if (place) { out.push({ eventId: String(ev.id || ''), kind: 'hotel', place, from, to, days, title: title.slice(0, 120) }); continue; }
    }
    if (!allDay || days < 2) continue;
    if (/\b(visitors?|visiting us|staying with us|comes? to stay)\b/i.test(title)) continue;
    const place = (loc && !/^https?:/i.test(loc) && trPlace(loc, P, {})) || trPlace(title, P, { strict: true, lead: true });
    if (place) out.push({ eventId: String(ev.id || ''), kind: 'trip', place, from, to, days, title: title.slice(0, 120) });
    else if (TRL_HOLIDAY_RE.test(title)) out.push({ eventId: String(ev.id || ''), kind: 'holiday', place: null, from, to, days, title: title.slice(0, 120) });
  }
  return out;
}

/* ---------- Z: the zone history ---------- */
/**
 * Time on a zone away from home, from time.json's changes [{at, from, to}] (at: ms or ISO).
 * A zone left again within 10 min (fiddling) is dropped; UTC / Etc never count; DST is not a
 * change (same zone id). o: {homeCc, homeZone, ccOf(zone), now, system (the zone now)}.
 * -> [{zone, cc, from, to (null = still there), minutes, domestic}]
 */
function trZoneEpisodes(changes, o) {
  o = o || {};
  const now = Number.isFinite(o.now) ? o.now : 0;
  const ccOf = typeof o.ccOf === 'function' ? o.ccOf : () => '';
  const list = (changes || []).map(c => ({ at: _trlMs(c && c.at), to: _trlZone(c && c.to), from: _trlZone(c && c.from) })).filter(c => Number.isFinite(c.at) && c.to).sort((a, b) => a.at - b.at);
  const segs = [];
  for (let i = 0; i < list.length; i++) segs.push({ zone: list[i].to, from: list[i].at, to: i + 1 < list.length ? list[i + 1].at : null });
  const sys = _trlZone(o.system);
  if (sys && segs.length && segs[segs.length - 1].zone !== sys) { segs[segs.length - 1].to = segs[segs.length - 1].to || now; }
  const kept = segs.filter(s => (s.to === null ? now - s.from >= 0 : s.to - s.from >= 10 * TRL_MIN_MS));
  const homeZone = _trlZone(o.homeZone);
  const out = [];
  for (const s of kept) {
    if (!s.zone || _trlPlaceless(s.zone) || s.zone === homeZone) continue;
    const cc = ccOf(s.zone) || '';
    const domestic = !!(cc && o.homeCc && cc === o.homeCc);
    if (domestic && homeZone && clockOffsetIn(s.from, s.zone) === clockOffsetIn(s.from, homeZone)) continue;
    const last = out[out.length - 1];
    if (last && last.cc === cc && cc && (last.to === null || s.from - last.to <= 10 * TRL_MIN_MS)) { last.to = s.to; last.zone = s.zone; continue; }
    out.push({ zone: s.zone, cc, from: s.from, to: s.to, domestic });
  }
  for (const e of out) e.minutes = Math.round(((e.to === null ? now : e.to) - e.from) / TRL_MIN_MS);
  return out;
}

/* ---------- B: card payments abroad ---------- */
/** Currencies a memo may name (major travel currencies; codes that are also words, like CUP or TOP, are left out). */
const TRL_CCYS = new Set('EUR USD JPY CHF AUD CAD NZD SEK NOK DKK ISK PLN CZK HUF RON BGN TRY AED SAR QAR OMR KWD BHD INR PKR LKR NPR BDT CNY HKD SGD THB MYR IDR PHP VND KRW TWD MXN BRL ARS CLP COP ZAR EGP MAD TND KES ILS JOD GBP RUB UAH GEL'.split(' '));
const TRL_CCY_OF = Object.freeze({ EUR: ['AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'MC', 'SM', 'VA', 'AD', 'ME', 'XK'],
  USD: ['US', 'PR', 'EC', 'SV', 'PA'], JPY: ['JP'], CHF: ['CH', 'LI'], AUD: ['AU'], CAD: ['CA'], NZD: ['NZ'], SEK: ['SE'], NOK: ['NO'], DKK: ['DK', 'GL', 'FO'], ISK: ['IS'],
  PLN: ['PL'], CZK: ['CZ'], HUF: ['HU'], RON: ['RO'], BGN: ['BG'], TRY: ['TR'], AED: ['AE'], SAR: ['SA'], QAR: ['QA'], OMR: ['OM'], KWD: ['KW'], BHD: ['BH'], INR: ['IN'],
  PKR: ['PK'], LKR: ['LK'], NPR: ['NP'], BDT: ['BD'], CNY: ['CN'], HKD: ['HK'], SGD: ['SG'], THB: ['TH'], MYR: ['MY'], IDR: ['ID'], PHP: ['PH'], VND: ['VN'], KRW: ['KR'],
  TWD: ['TW'], MXN: ['MX'], BRL: ['BR'], ARS: ['AR'], CLP: ['CL'], COP: ['CO'], ZAR: ['ZA'], EGP: ['EG'], MAD: ['MA'], TND: ['TN'], KES: ['KE'], ILS: ['IL'], JOD: ['JO'],
  GBP: ['GB', 'IM', 'JE', 'GG'], RUB: ['RU'], UAH: ['UA'], GEL: ['GE'] });
/** The currency a country pays in (from the table above; PLACES' countries table wins when given). */
function trCcyOf(cc, P) {
  const c = String(cc || '').toUpperCase();
  const t = P && P.countries.get(c);
  if (t && /^[A-Z]{3}$/.test(String(t.ccy || ''))) return t.ccy;
  for (const [ccy, list] of Object.entries(TRL_CCY_OF)) if (list.includes(c)) return ccy;
  return '';
}
/** Online billers and web descriptors: a subscription billed from Ireland must never start a trip. */
const TRL_ONLINE_RE = /\.COM\b|\.CO\.UK\b|\.NET\b|\.IO\b|\.AI\b|\bWWW\b|HTTPS?:|\bAMAZON\b|\bAMZN\b|\bPAYPAL\b|\bPP\s?\*|APPLE\.COM|\bITUNES\b|\bGOOGLE\b|\bNETFLIX\b|\bSPOTIFY\b|\bMICROSOFT\b|\bMSFT\b|\bXBOX\b|\bSTEAM|\bUBER\s?\*?\s?EATS\b|\bDELIVEROO\b|\bJUST ?EAT\b|\bADOBE\b|\bDROPBOX\b|\bZOOM\.US\b|\bOPENAI\b|\bANTHROPIC\b|\bCLAUDE\.AI\b|\bPATREON\b|\bDISNEY ?PLUS\b|\bPRIME VIDEO\b|\bAUDIBLE\b|\bKINDLE\b|\bGITHUB\b|\bLINKEDIN\b|\bFACEBK\b|\bFACEBOOK\b|\bCANVA\b|\bNOTION\b|\bSLACK\b|\bDUOLINGO\b|\bNINTENDO\b|\bPLAYSTATION\b|\bEBAY\b|\bALIEXPRESS\b|\bSHEIN\b|\bTEMU\b|\bVINTED\b|\bETSY\b|\bBOOKING\.COM\b|\bEXPEDIA\b|\bSKYSCANNER\b|\bICLOUD\b|\bYOUTUBE\b/;
const TRL_FEE_RE = /NON[- ]?STERLING|NON-?STG|FOREIGN\s+(?:TRANSACTION|EXCHANGE|CURRENCY|USAGE)?\s*FEE|\bFX\s+FEE|CURRENCY\s+CONVERSION\s+FEE|CROSS[- ]BORDER\s+FEE|INT(?:ERNATIONA)?L\s+(?:TRANSACTION\s+)?FEE|FOREIGN\s+CASH\s+FEE/;
const TRL_ATM_RE = /\bATM\b|CASH\s+WITHDRAWAL|^CASH\b|\bCASH\s+(?:MACHINE|WDL|W\/D)|\bNOTEMACHINE\b|\bLINK\s+ATM/;
const TRL_SYMBOL_CCY = Object.freeze({ '€': 'EUR', '¥': 'JPY', '₹': 'INR', '฿': 'THB', '₩': 'KRW', '₺': 'TRY', '₪': 'ILS', 'R$': 'BRL', 'US$': 'USD', '$': 'USD' });
const _TRL_AMT = '(\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d{1,2})?)';
const TRL_CCY_AMT_RE = new RegExp('\\b([A-Z]{3})\\s?' + _TRL_AMT + '(?![\\d.,])', 'g');
const TRL_AMT_CCY_RE = new RegExp('(?<![\\d.,])' + _TRL_AMT + '\\s?([A-Z]{3})\\b', 'g');
const TRL_SYM_AMT_RE = new RegExp('(US\\$|R\\$|[€¥₹฿₩₺₪$])\\s?' + _TRL_AMT, 'g');
const TRL_RATE_RE = /(?:@|\bRATE\b\s*:?|\bEXCHANGE RATE\b\s*:?|\bFX RATE\b\s*:?)\s*(\d+(?:\.\d+)?)/;
const TRL_RATE_ALL_RE = new RegExp(TRL_RATE_RE.source, 'g');
const TRL_US_STATES = new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' '));
const TRL_DOLLAR_CC = Object.freeze({ AU: 'AUD', CA: 'CAD', NZ: 'NZD', SG: 'SGD', HK: 'HKD', MX: 'MXN', TW: 'TWD' });
const _trlNum = (s) => Number(String(s).replace(/,/g, ''));
/**
 * What a bank memo says about money abroad. o: {homeCcy ('GBP'), homeCc ('GB'), recurring (Set of
 * folded merchant names the finance model marks as recurring), P}.
 * -> {ccy, amt, rate, cc, atm, fee, online, abroad}
 *    ccy/amt: the original currency and amount (when the memo has them); rate: the bank's rate;
 *    cc: a trailing country code or English country name; online: a web biller (never a trip);
 *    abroad: a payment (or cash) in another country or currency, not online.
 */
function trFxSignal(memo, o) {
  o = o || {};
  const raw = String(memo == null ? '' : memo).replace(/\s+/g, ' ').trim();
  const up = raw.toUpperCase();
  const homeCcy = String(o.homeCcy || 'GBP').toUpperCase(), homeCc = String(o.homeCc || '').toUpperCase();
  const out = { ccy: null, amt: null, rate: null, cc: null, atm: false, fee: false, online: false, abroad: false };
  if (!up) return out;
  out.fee = TRL_FEE_RE.test(up);
  out.atm = TRL_ATM_RE.test(up);
  out.online = TRL_ONLINE_RE.test(up) || !!(o.recurring && o.recurring.size && o.recurring.has(_trlFold(o.merchant || '')));
  const rm = TRL_RATE_RE.exec(up);
  if (rm) { const r = Number(rm[1]); if (r > 0 && r < 1e6) out.rate = r; }
  // Currency and amount: "JPY 1,200.00", "1200 JPY", "¥1,200" (the rate taken out first: "RATE 189.5 JPY 5,400")
  const body = up.replace(TRL_RATE_ALL_RE, ' ');
  const ccyHit = [];
  for (const re of [TRL_CCY_AMT_RE, TRL_AMT_CCY_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(body))) {
      const [ccy, amt] = re === TRL_CCY_AMT_RE ? [m[1], m[2]] : [m[2], m[1]];
      if (TRL_CCYS.has(ccy) && ccy !== homeCcy) ccyHit.push({ ccy, amt: _trlNum(amt), at: m.index });
    }
  }
  let sym = '';
  if (!ccyHit.length) {
    TRL_SYM_AMT_RE.lastIndex = 0;
    let m;
    const rawBody = raw.replace(TRL_RATE_ALL_RE, ' ');
    while ((m = TRL_SYM_AMT_RE.exec(rawBody))) { const ccy = TRL_SYMBOL_CCY[m[1]]; if (ccy && ccy !== homeCcy) { ccyHit.push({ ccy, amt: _trlNum(m[2]), at: m.index }); sym = sym || m[1]; } }
  }
  if (ccyHit.length) { ccyHit.sort((a, b) => a.at - b.at); out.ccy = ccyHit[0].ccy; out.amt = ccyHit[0].amt; }
  // Country: a trailing alpha-3 / alpha-2 code or an English country name (amounts and currency codes after it skipped).
  const toks = up.replace(/[^A-Z0-9.,/ ]+/g, ' ').split(' ').filter(Boolean);
  let end = toks.length - 1;
  while (end >= 0 && (/^[\d.,/]+$/.test(toks[end]) || TRL_CCYS.has(toks[end]) || /^(RATE|@)$/.test(toks[end]))) end--;
  const words = toks.slice(0, end + 1);
  const confirms = (cc) => {
    if (!cc) return false;
    if (out.ccy && trCcyOf(cc, o.P) === out.ccy) return true;
    const before = _trlFold(words.slice(Math.max(0, words.length - 4), words.length - 1).join(' '));
    const hit = o.P ? _trlScan(before, o.P, {}).find(h => h.city && h.city.cc === cc) : null;
    return !!hit;
  };
  const last = words[words.length - 1] || '';
  if (/^[A-Z]{3}$/.test(last) && _trlAlpha3().has(last) && !TRL_CCYS.has(last)) {
    const cc = _trlAlpha3().get(last);
    if (!TRL_A3_WEAK.has(last) || confirms(cc)) out.cc = cc;
  } else if (/^[A-Z]{2}$/.test(last) && words.length >= 2) {
    const cc = last === 'UK' ? 'GB' : last;
    if ((_trlCountryCodes().has(cc) && !TRL_A2_WEAK.has(cc)) || (TRL_A2_WEAK.has(cc) && confirms(cc))) out.cc = cc;
    else if (TRL_US_STATES.has(last) && (confirms('US') || /\bUSA?\b/.test(words.slice(0, -1).join(' ')) || out.ccy === 'USD')) out.cc = 'US';
  }
  if (!out.cc && words.length >= 2) {
    const names = _trlCountryNames();
    for (let n = Math.min(4, words.length - 1); n >= 1 && !out.cc; n--) {
      const key = _trlFold(words.slice(words.length - n).join(' '));
      if (names.has(key) && !(n === 1 && TRL_NAMEY.has(key))) out.cc = names.get(key);
    }
  }
  if (out.cc && sym === '$' && TRL_DOLLAR_CC[out.cc]) out.ccy = TRL_DOLLAR_CC[out.cc];
  if (out.cc && sym === '¥' && out.cc === 'CN') out.ccy = 'CNY';
  if (!out.cc && out.ccy) { const list = TRL_CCY_OF[out.ccy]; if (list && list.length === 1) out.cc = list[0]; }
  const foreign = (out.cc && homeCc && out.cc !== homeCc) || (out.ccy && out.ccy !== homeCcy);
  out.abroad = !out.online && !!foreign;
  return out;
}
let _trlCodes = null;
function _trlCountryCodes() { if (!_trlCodes) _trlCodes = new Set(_trlAlpha3().values()); return _trlCodes; }
/**
 * Days of payments abroad per country (online billers left out): consecutive days (gaps of
 * up to 2 days) form an episode. rows: [{date, memo, amount?, fx?: signal}] (fx = a signal
 * already worked out, e.g. by /api/finance/travel). o: as trFxSignal.
 * -> [{cc, ccy, from, to, days, atm, n}]
 */
function trPayEpisodes(rows, o) {
  o = o || {};
  const byCc = new Map();
  for (const r of rows || []) {
    if (!r || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date || ''))) continue;
    // A row from /api/finance/travel is already read (cc, fx, atm, no memo); a raw row has a memo.
    const s = typeof r.memo === 'string' ? trFxSignal(r.memo, Object.assign({}, o, { merchant: r.merchant || '' }))
      : { cc: r.cc || '', ccy: (r.fx && r.fx.ccy) || '', atm: !!r.atm, online: !!r.online, abroad: !!(r.cc && r.cc !== o.homeCc) };
    const cc = s.cc || '';
    if (!cc || s.online || cc === o.homeCc || !s.abroad) continue;
    if (!byCc.has(cc)) byCc.set(cc, []);
    byCc.get(cc).push({ date: r.date, atm: !!s.atm, ccy: s.ccy || '' });
  }
  const out = [];
  for (const [cc, list] of byCc) {
    list.sort((a, b) => (a.date < b.date ? -1 : 1));
    let cur = null;
    for (const x of list) {
      if (cur && clockDaysBetween(cur.to, x.date) <= 3) { cur.to = x.date; cur.dates.add(x.date); cur.atm = cur.atm || x.atm; cur.n++; if (!cur.ccy) cur.ccy = x.ccy; continue; }
      cur = { cc, ccy: x.ccy, from: x.date, to: x.date, dates: new Set([x.date]), atm: x.atm, n: 1 };
      out.push(cur);
    }
  }
  return out.map(e => ({ cc: e.cc, ccy: e.ccy, from: e.from, to: e.to, days: e.dates.size, atm: e.atm, n: e.n })).sort((a, b) => (a.from < b.from ? -1 : 1));
}

/* ---------- trips ---------- */
const TRL_KIND_RANK = Object.freeze({ legs: 4, event: 3, hotel: 3, zone: 2, holiday: 1, payments: 0 });
function _trlTripId(kind, seed) { return 'trip-' + _trlHash(kind + ':' + seed); }
/** The day an instant falls on in a zone. */
function _trlDay(ms, zone) { return Number.isFinite(ms) ? trWall(ms, zone).date : ''; }
/**
 * Trips from every signal (3.2): an outbound journey leaving the home country plus the next one
 * back; a multi-day trip event with a place; 6 h or more on a zone abroad with no calendar trip
 * ("unplanned"); payments abroad on 2 days (or cash) with no other signal (a candidate only).
 * Overlapping trips merge (a different place becomes a stop). Ids are stable (a hash of the
 * first leg's event id, the event id or the episode start); `ids` lists every source's id so a
 * decision made under one survives a merge.
 * home: {zone, cc, cityId?}. o: {now, zone, decisions (state.travel), work, P}.
 * -> trips sorted by start (see trBuildSnapshot for the shape)
 */
function trTripsFrom(legs, tripEvents, zoneEps, payEps, home, P, o) {
  o = o || {};
  home = home || {};
  const homeCc = home.cc || '', homeZone = home.zone || o.zone || 'UTC';
  const now = Number.isFinite(o.now) ? o.now : 0;
  const raw = [];
  const isHome = (pl) => !!(pl && pl.cc && pl.cc === homeCc);
  const atHomeTown = (pl) => !!(pl && (isHome(pl) && (!home.cityId || !pl.cityId || pl.cityId === home.cityId)));
  // 1. journeys
  const js = trJourneys(legs);
  for (let j = 0; j < js.length; j++) {
    const out = js[j];
    if (!out.to) continue;
    const leavesHome = (!out.from || isHome(out.from)) && out.to.cc && !isHome(out.to);
    const domestic = !leavesHome && isHome(out.to) && !atHomeTown(out.to) && (!out.from || atHomeTown(out.from));
    if (!leavesHome && !domestic) continue;
    let back = null;
    const stops = [];
    for (let k = j + 1; k < js.length; k++) {
      const jn = js[k];
      if (jn.depart - out.arrive > 90 * TRL_DAY_MS) break;
      if (leavesHome ? isHome(jn.to) : atHomeTown(jn.to) || _trlSamePlace(jn.to, out.from)) { back = jn; j = k; break; }
      stops.push({ place: jn.to, from: jn.arrive, legs: jn.legs.map(l => l.id) });
    }
    const from = _trlDay(out.depart, out.departZone || homeZone);
    const to = back ? _trlDay(back.arrive, back.arriveZone || homeZone) : '';
    if (domestic && (!back || to === from)) continue;              // a domestic day trip or one-way: not a trip
    const allLegs = [...out.legs, ...(back ? back.legs : [])];
    for (const s of stops) for (const l of legs) if (s.legs.includes(l.id) && !allLegs.includes(l)) allLegs.push(l);
    raw.push({ kind: 'legs', id: _trlTripId('legs', out.legs[0].eventId), dest: out.to, from, to, start: out.depart, end: back ? back.arrive : null,
      outbound: out, inbound: back, stops: stops.map(s => s.place).concat(out.stopovers.map(s => s.place)), legs: allLegs, events: allLegs.map(l => l.eventId),
      sources: ['calendar'], conf: 0.8, intl: !!leavesHome, domestic: !!domestic, candidate: false, unplanned: false, layovers: out.layovers.concat(back ? back.layovers : []) });
  }
  // 2. trip events
  for (const te of tripEvents || []) {
    if (te.place && atHomeTown(te.place)) continue;
    if (te.place && isHome(te.place) && !te.place.cityId) continue;
    const startMs = clockAtIn(te.from, 0, homeZone), endMs = clockAtIn(clockAddDays(te.to, 1), 0, homeZone) - 1;
    raw.push({ kind: te.place ? (te.kind === 'hotel' ? 'hotel' : 'event') : 'holiday', id: _trlTripId('event', te.eventId), dest: te.place, from: te.from, to: te.to,
      start: startMs, end: endMs, outbound: null, inbound: null, stops: [], legs: [], events: [te.eventId], sources: ['calendar'], conf: te.place ? 0.6 : 0.3,
      intl: !!(te.place && !isHome(te.place)), domestic: !!(te.place && isHome(te.place)), candidate: !te.place, unplanned: false, layovers: [] });
  }
  // 3. zone episodes abroad, 6 h or more
  for (const ep of zoneEps || []) {
    if (ep.domestic || !ep.cc) continue;
    const end = ep.to === null ? null : ep.to;
    if (((end === null ? now : end) - ep.from) < 6 * TRL_HOUR_MS) continue;
    const zp = trZonePlace(ep.zone, P) || { cc: ep.cc, zone: ep.zone, label: ep.zone, cityId: '' };
    raw.push({ kind: 'zone', id: _trlTripId('zone', ep.from), dest: Object.assign({}, zp, { kind: zp.cityId ? 'city' : 'zone' }), from: _trlDay(ep.from, homeZone),
      to: end === null ? '' : _trlDay(end, ep.zone), start: ep.from, end, outbound: null, inbound: null, stops: [], legs: [], events: [], sources: ['zone'], conf: 0.9,
      intl: true, domestic: false, candidate: false, unplanned: true, layovers: [] });
  }
  // 4. payments abroad (a candidate only)
  for (const pe of payEps || []) {
    if (!(pe.days >= 2 || pe.atm)) continue;
    raw.push({ kind: 'payments', id: _trlTripId('payments', pe.cc + ':' + pe.from), dest: _trlCountryPlace(pe.cc, P), from: pe.from, to: pe.to,
      start: clockAtIn(pe.from, 0, homeZone), end: clockAtIn(clockAddDays(pe.to, 1), 0, homeZone) - 1, outbound: null, inbound: null, stops: [], legs: [], events: [],
      sources: ['bank'], conf: pe.atm ? 0.8 : 0.6, intl: true, domestic: false, candidate: true, unplanned: false, layovers: [] });
  }
  // Merge overlapping ones (dates inclusive; an open end is "still going"). The strongest
  // source leads (legs > event/hotel > zone > holiday > payments); a trip with both its legs
  // keeps their dates. Payments arrive 1-3 days late, so they match a trip within 3 days.
  raw.sort((a, b) => (TRL_KIND_RANK[b.kind] - TRL_KIND_RANK[a.kind]) || (a.start - b.start));
  const merged = [];
  const endDay = (t) => t.to || _trlDay(now, homeZone);
  const overlaps = (x, t) => {
    const slack = t.kind === 'payments' ? 3 : 0;
    return clockAddDays(x.from, -slack) <= endDay(t) && t.from <= clockAddDays(endDay(x), slack);
  };
  for (const t of raw) {
    const m = merged.find(x => overlaps(x, t));
    if (!m) { merged.push(Object.assign({ ids: [t.id] }, t, { stops: t.stops.slice(), events: t.events.slice(), sources: t.sources.slice() })); continue; }
    m.ids.push(t.id);
    for (const s of t.sources) if (!m.sources.includes(s)) { m.sources.push(s); m.conf = Math.min(0.99, Math.round((m.conf + 0.1) * 100) / 100); }
    for (const e of t.events) if (!m.events.includes(e)) m.events.push(e);
    const fixed = m.kind === 'legs' && m.inbound;            // both legs known: their dates stand
    if (!fixed && t.kind !== 'payments') {
      if (t.from < m.from) { m.from = t.from; m.start = Math.min(m.start, t.start); }
      if (m.to && (!t.to || t.to > m.to)) { m.to = t.to; m.end = t.end; }
      else if (!m.to && t.to && m.kind !== 'zone') { m.to = t.to; m.end = t.end; }
    }
    if (t.dest && m.dest) {
      if (t.dest.cc === m.dest.cc && t.dest.cityId && !m.dest.cityId) m.dest = t.dest;
      else if (t.dest.cc !== m.dest.cc && !m.stops.some(s => _trlSamePlace(s, t.dest))) m.stops.push(t.dest);
    } else if (t.dest && !m.dest) m.dest = t.dest;
    if (!t.candidate) m.candidate = false;
    if (!t.unplanned) m.unplanned = false;
    if (t.intl) { m.intl = true; m.domestic = false; }
  }
  // Decisions: "not a trip" drops it; a confirmed trip keeps its name and place.
  const dec = o.decisions && typeof o.decisions === 'object' ? o.decisions : {};
  const not = dec.notTrips && typeof dec.notTrips === 'object' ? dec.notTrips : {};
  const kept = dec.trips && typeof dec.trips === 'object' ? dec.trips : {};
  const out = [];
  for (const t of merged) {
    if (t.ids.some(id => not[id])) continue;
    const d = t.ids.map(id => kept[id]).find(Boolean) || null;
    t.confirmed = !!(d && d.confirmed);
    t.name = d && typeof d.name === 'string' && d.name.trim() ? d.name.trim().slice(0, 80) : '';
    if (d && d.dest && typeof d.dest === 'object' && d.dest.cc) t.dest = Object.assign({}, t.dest || {}, d.dest);
    if (d && d.from && /^\d{4}-\d{2}-\d{2}$/.test(d.from)) t.from = d.from;
    if (d && d.to && /^\d{4}-\d{2}-\d{2}$/.test(d.to)) t.to = d.to;
    if (t.confirmed) t.candidate = false;
    t.label = t.name || (t.dest ? t.dest.label || t.dest.name || '' : '');
    t.nights = t.to ? Math.max(0, clockDaysBetween(t.from, t.to)) : null;
    out.push(t);
  }
  return out.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : a.start - b.start));
}
/**
 * The trip's state now (3.3): planned (more than 24 h before the first leg) -> departing (24 h)
 * -> away -> returning (24 h before the last leg) -> home (until the next local morning) -> past.
 * o: {zone (home zone for the morning rule)}.
 */
function trStatus(trip, now, o) {
  o = o || {};
  if (!trip) return 'past';
  const start = Number.isFinite(trip.start) ? trip.start : clockAtIn(trip.from, 0, o.zone || 'UTC');
  if (now < start - TRL_DAY_MS) return 'planned';
  if (now < start) return 'departing';
  const end = trip.end === null || trip.end === undefined ? (trip.to ? clockAtIn(clockAddDays(trip.to, 1), 0, o.zone || 'UTC') : Infinity) : trip.end;
  if (now < end) {
    if (trip.inbound && now >= trip.inbound.depart - TRL_DAY_MS) return 'returning';
    return 'away';
  }
  const z = o.zone || 'UTC';
  const endDay = trWall(end, z).date;
  const morning = clockAtIn(clockAddDays(endDay, 1), 6 * 60, z);
  return now < Math.max(morning, end + 6 * TRL_HOUR_MS) ? 'home' : 'past';
}
/** Work days a trip covers (from..to inclusive). */
function trWorkDays(trip, work) {
  if (!trip || !trip.from || !trip.to) return 0;
  const days = Array.isArray(work && work.days) ? work.days : [1, 2, 3, 4, 5];
  let n = 0;
  for (let d = trip.from, i = 0; d <= trip.to && i < 400; d = clockAddDays(d, 1), i++) {
    const [y, m, dd] = d.split('-').map(Number);
    if (days.includes(new Date(Date.UTC(y, m - 1, dd)).getUTCDay())) n++;
  }
  return n;
}

/* ---------- where am I (3.3) ---------- */
/**
 * sig: {home: {zone, cc, cityId}, system (the computer's zone), legs, trips, episodes, geo: {place, at}}.
 * -> {place, source: 'calendar'|'geo'|'zone'|'trip'|'home', conf, since, away, domestic, layover, mismatch}
 *    mismatch 'zone-home': a leg landed abroad but the computer is still on home time (T7).
 */
function trWhere(sig, now, P) {
  sig = sig || {};
  const home = sig.home || {};
  const cands = [];
  const legs = (sig.legs || []).slice().sort((a, b) => a.arrive - b.arrive);
  let leg = null;
  for (const l of legs) if (l.arrive <= now && now - l.arrive <= 36 * TRL_HOUR_MS) leg = l;
  if (leg && legs.some(l => l.depart > leg.arrive && l.depart <= now)) leg = null;     // already left again
  if (leg && leg.to) cands.push({ place: leg.to, source: 'calendar', conf: 0.8, since: leg.arrive, leg });
  const geo = sig.geo;
  if (geo && geo.place && Number.isFinite(geo.at) && now - geo.at <= 6 * TRL_HOUR_MS) cands.push({ place: geo.place, source: 'geo', conf: 0.95, since: geo.at });
  const zp = trZonePlace(sig.system, P);
  const ep = (sig.episodes || []).find(e => e.to === null);
  if (zp && zp.cc && (zp.cc !== home.cc || (ep && ep.domestic))) cands.push({ place: zp, source: 'zone', conf: 0.9, since: ep ? ep.from : now });
  const today = home.zone ? trWall(now, sig.zone || home.zone).date : '';
  const tr = (sig.trips || []).find(t => (t.kind === 'event' || t.kind === 'hotel') && t.dest && t.from <= today && (!t.to || today <= t.to));
  if (tr) cands.push({ place: tr.dest, source: 'trip', conf: 0.6, since: tr.start });
  if (!cands.length) return { place: home.cc ? { kind: 'home', cc: home.cc, zone: home.zone, cityId: home.cityId || '', label: home.label || '' } : null, source: 'home', conf: 1, since: null, away: false, domestic: false, layover: null, mismatch: '' };
  cands.sort((a, b) => b.conf - a.conf);
  const best = Object.assign({}, cands[0], { place: Object.assign({}, cands[0].place) });
  for (const c of cands.slice(1)) {
    if (c.place.cc && c.place.cc === best.place.cc) {
      best.conf = Math.min(0.99, best.conf + 0.05);
      if (!best.place.cityId && c.place.cityId) Object.assign(best.place, { cityId: c.place.cityId, label: c.place.label, name: c.place.name, kind: 'city' });
    }
  }
  const away = !!(best.place.cc && best.place.cc !== home.cc);
  const domestic = !away && !!(best.place.cityId && home.cityId && best.place.cityId !== home.cityId);
  let layover = null;
  if (leg) { const next = legs.find(l => l.depart >= leg.arrive && l.depart - leg.arrive <= 12 * TRL_HOUR_MS && l !== leg); if (next) layover = { place: leg.to, next }; }
  const sysCc = zp ? zp.cc : home.cc;
  const mismatch = leg && leg.to && leg.to.cc && leg.to.cc !== home.cc && (!sig.system || sysCc === home.cc || _trlPlaceless(sig.system)) ? 'zone-home' : '';
  return { place: best.place, source: best.source, conf: Math.round(best.conf * 100) / 100, since: best.since, away, domestic, layover, mismatch, leg: leg || null };
}
/** 30 days or more on one zone abroad: {zone, label, days} | null (3.3 "long stays"). */
function trLongStay(episodes, now, P) {
  const ep = (episodes || []).find(e => e.to === null && !e.domestic);
  if (!ep) return null;
  const days = Math.floor((now - ep.from) / TRL_DAY_MS);
  if (days < 30) return null;
  const zp = trZonePlace(ep.zone, P);
  return { zone: ep.zone, label: zp ? zp.label : ep.zone, cc: ep.cc, days };
}

/* ---------- a trip's events, tasks and spending (5.5) ---------- */
/**
 * ctx: {events (Google shape), eventMeta, tasks [{id, title, tags, due, planned, status}], rows (/api/finance/travel rows),
 *       P, zone, home {cc, ccy}}
 * -> {events: [id], tasks: [id], spending: {rows, byCcy: {JPY: {orig, home, n}}, homeOnly, fees, total}}
 */
function trGroup(trip, ctx) {
  ctx = ctx || {};
  const out = { events: [], tasks: [], spending: { rows: [], byCcy: {}, homeOnly: 0, fees: 0, total: 0 } };
  if (!trip) return out;
  const zone = ctx.zone || 'UTC';
  const destZone = (trip.dest && trip.dest.zone) || '';
  const destCc = (trip.dest && trip.dest.cc) || '';
  const to = trip.to || trWall(Number.isFinite(ctx.now) ? ctx.now : trip.start, zone).date;
  const evIds = new Set(trip.events || []);
  const prepFrom = clockAddDays(trip.from, -2);
  for (const ev of ctx.events || []) {
    if (!ev || !ev.start || _trlSkipEvent(ev) || evIds.has(ev.id)) continue;
    const s = _trlEdgeMs(ev.start, zone);
    if (!Number.isFinite(s)) continue;
    const d = ev.start.date ? String(ev.start.date).slice(0, 10) : trWall(s, zone).date;
    const meta = (ctx.eventMeta && ctx.eventMeta[ev.id]) || {};
    if (d >= prepFrom && d < trip.from && ((meta.origin && meta.origin.kind === 'travel') || /\b(airport|taxi|station)\b/i.test(_trlTitle(ev)))) { evIds.add(ev.id); continue; }
    if (d < trip.from || d > to) continue;
    const ez = _trlZone(ev.start.timeZone);
    const inDest = (destZone && ez === destZone) || (destCc && ev.location && (trPlace(ev.location, ctx.P, {}) || {}).cc === destCc);
    if (inDest || ctx.away) evIds.add(ev.id);
  }
  out.events = [...evIds];
  const tagSet = new Set(['trip', trip.dest ? trTagSlug(trip.dest.label || trip.dest.name || '') : ''].filter(Boolean));
  const linked = new Set();
  for (const id of out.events) for (const t of ((ctx.eventMeta && ctx.eventMeta[id] && ctx.eventMeta[id].tasks) || [])) linked.add(t);
  const before = clockAddDays(trip.from, -7);
  const destName = trip.dest ? _trlFold(trip.dest.label || trip.dest.name || '') : '';
  for (const t of ctx.tasks || []) {
    if (!t || !t.id) continue;
    const tags = (t.tags || []).map(x => _trlFold(x).replace(/ /g, '-'));
    const when = t.due || t.planned || '';
    const words = TRL_TRIP_TASK_RE.test(t.title || '') || (destName && _trlFold(t.title).includes(destName));
    if (linked.has(t.id) || tags.some(x => tagSet.has(x)) || (when && when >= before && when <= trip.from && words)) out.tasks.push(t.id);
  }
  const lo = clockAddDays(trip.from, -1), hi = clockAddDays(to, 3);
  const sp = out.spending;
  for (const r of ctx.rows || []) {
    if (!r || r.date < lo || r.date > hi) continue;
    const amt = Math.abs(Number(r.amount) || 0);
    const spend = (Number(r.amount) || 0) < 0;
    if (r.fee) { sp.fees += amt; sp.rows.push(r.id); continue; }
    if (!spend) continue;
    if (r.fx && r.fx.ccy) {
      const b = sp.byCcy[r.fx.ccy] || (sp.byCcy[r.fx.ccy] = { orig: 0, home: 0, n: 0 });
      b.orig += Number(r.fx.amt) || 0; b.home += amt; b.n++;
    } else if (r.cc && r.cc === destCc) {
      const ccy = trCcyOf(destCc, ctx.P) || 'XXX';
      const b = sp.byCcy[ccy] || (sp.byCcy[ccy] = { orig: 0, home: 0, n: 0 });
      b.home += amt; b.n++;
    } else if (r.cc && r.cc !== (ctx.home && ctx.home.cc)) {
      sp.homeOnly += amt;
    } else continue;
    sp.rows.push(r.id);
  }
  const round = (x) => Math.round(x * 100) / 100;
  for (const b of Object.values(sp.byCcy)) { b.orig = round(b.orig); b.home = round(b.home); }
  sp.fees = round(sp.fees); sp.homeOnly = round(sp.homeOnly);
  sp.total = round(Object.values(sp.byCcy).reduce((a, b) => a + b.home, 0) + sp.homeOnly + sp.fees);
  return out;
}

/* ---------- the body clock (5.3) ---------- */
/** Hours a zone is ahead of another at an instant, folded into (-12, 12]. */
function _trlShiftH(zA, zB, ms) {
  let d = (clockOffsetIn(ms, zB) - clockOffsetIn(ms, zA)) / 60;
  while (d > 12) d -= 24;
  while (d <= -12) d += 24;
  return d;
}
/**
 * Jet lag after the latest long trip across zones: the body zone is where the user spent the
 * 3 days before (the journey's departure zone), D = local - body in hours. D shrinks by 1 h a
 * day after flying east and 1.5 h a day after flying west, and stops under 1 h. A return
 * journey starts a new D from the trip's zone.
 * o: {now, zone (where the user is), legs, home}.
 * -> {bodyZone, localZone, D0, D, Dtomorrow, dir: 'east'|'west', arrivedAt, days, bodyNowMin, active} | null
 */
function trBody(o) {
  o = o || {};
  const now = o.now;
  const js = trJourneys(o.legs || []).filter(j => j.arrive <= now && now - j.arrive <= 14 * TRL_DAY_MS);
  for (let i = js.length - 1; i >= 0; i--) {
    const j = js[i];
    const bodyZone = j.departZone, localZone = j.arriveZone;
    if (!bodyZone || !localZone || bodyZone === localZone) continue;
    const D0 = _trlShiftH(bodyZone, localZone, j.arrive);
    if (Math.abs(D0) < 3) continue;
    const rate = D0 > 0 ? 1 : 1.5;
    const at = (t) => { const days = Math.max(0, (t - j.arrive) / TRL_DAY_MS); const left = Math.abs(D0) - rate * days; return left < 1 ? 0 : Math.sign(D0) * Math.round(left * 10) / 10; };
    const D = at(now);
    const local = trWall(now, localZone);
    return { bodyZone, localZone, D0, D, Dtomorrow: at(now + TRL_DAY_MS), dir: D0 > 0 ? 'east' : 'west', arrivedAt: j.arrive, days: Math.floor((now - j.arrive) / TRL_DAY_MS),
      bodyNowMin: (((local.min - Math.round(D * 60)) % 1440) + 1440) % 1440, active: Math.abs(D) >= 1,
      // The dashboard shows the local time (the computer switched): the calendar's hours are local hours.
      zoneMatches: !o.zone || clockOffsetIn(now, o.zone) === clockOffsetIn(now, localZone) };
  }
  return null;
}

/* ---------- their time (5.2) ---------- */
/**
 * A meeting in the other people's time. m: {eventId, title, start, end (ms), zone (the event's own
 * zone), organizerSelf, organizer: {email, name}, attendees: [{email, name, self}]}.
 * o: {myZone, people: Map(email -> {id, name, first, tz}), busy: [[startMs, endMs]], now}
 * -> {their: [{personId, name, first, zone, date, min, unsocial}], mine: {date, min}, unsocial: 'them'|'you'|'', slot}
 *    unsocial: their time outside 07:00-21:00, or yours outside 07:00-22:00. slot: the first
 *    start in the next 3 days inside 08:00-20:00 for everyone and free for you.
 */
function trTheirTime(m, o) {
  o = o || {};
  const myZone = o.myZone || 'UTC';
  const mine = trWall(m.start, myZone);
  const their = [];
  const seen = new Set();
  for (const a of m.attendees || []) {
    if (!a || a.self) continue;
    const p = o.people && o.people.get(String(a.email || '').toLowerCase());
    const tz = p && _trlZone(p.tz);
    if (!tz || seen.has(tz + '|' + p.id)) continue;
    seen.add(tz + '|' + p.id);
    const w = trWall(m.start, tz);
    their.push({ personId: p.id, name: p.name || '', first: p.first || String(p.name || '').split(' ')[0], zone: tz, date: w.date, min: w.min, unsocial: w.min < 7 * 60 || w.min >= 21 * 60 });
  }
  const ez = _trlZone(m.zone);
  if (!their.length && !m.organizerSelf && ez && ez !== myZone && !_trlPlaceless(ez)) {
    const org = m.organizer || {};
    const p = o.people && o.people.get(String(org.email || '').toLowerCase());
    const w = trWall(m.start, ez);
    their.push({ personId: p ? p.id : '', name: (p && p.name) || org.name || '', first: (p && p.first) || String(org.name || '').split(' ')[0], zone: ez, date: w.date, min: w.min,
      unsocial: w.min < 7 * 60 || w.min >= 21 * 60, fromEvent: true });
  }
  const meBad = mine.min < 7 * 60 || mine.min >= 22 * 60;
  const unsocial = their.some(t => t.unsocial) ? 'them' : meBad && their.length ? 'you' : '';
  let slot = null;
  if (unsocial && their.length) {
    const dur = Math.max(15 * TRL_MIN_MS, (m.end || m.start) - m.start);
    const step = 30 * TRL_MIN_MS;
    const t0 = Math.ceil(Math.max(o.now || 0, m.start - 3 * TRL_DAY_MS) / step) * step;
    const okIn = (t, z) => { const s = trWall(t, z), e = trWall(t + dur, z); return s.date === e.date && s.min >= 8 * 60 && e.min <= 20 * 60; };
    for (let t = t0; t < t0 + 3 * TRL_DAY_MS && !slot; t += step) {
      if (t === m.start || !okIn(t, myZone) || their.some(x => !okIn(t, x.zone))) continue;
      if ((o.busy || []).some(([a, b]) => a < t + dur && b > t)) continue;
      const w = trWall(t, myZone);
      slot = { start: t, end: t + dur, date: w.date, startMin: w.min, endMin: w.min + Math.round(dur / TRL_MIN_MS) };
    }
  }
  return { their, mine, unsocial, slot };
}

/* ---------- moments (4.1): once-keys and the quiet rules ---------- */
/** 'arrive:<tripId>:<cc>' (once per country, decision 3), 'depart:<legEventId>', 'home:<tripId>'. */
function trMomentKey(kind, o) {
  o = o || {};
  if (kind === 'arrive') return `arrive:${o.tripId || 'x'}:${o.cc || o.cityId || 'x'}`;
  if (kind === 'depart') return `depart:${o.eventId || 'x'}`;
  if (kind === 'home') return `home:${o.tripId || 'x'}`;
  return `${kind}:${o.tripId || 'x'}`;
}
/**
 * May a moment show now? m: {key, due (ms it became due)}. env: {now, shown {key: ts}, claimed
 * (another tab claimed it), visible, bootAt, modal, inMeeting, off, forgotten}.
 * -> {show, wait, skip, why}: skip = waited 6 h, mark it shown without showing it.
 */
function trMomentDue(m, env) {
  env = env || {};
  const now = env.now;
  if (!m || !m.key) return { show: false, why: 'none' };
  if (env.off) return { show: false, why: 'off' };
  if (env.forgotten) return { show: false, why: 'forgotten' };
  if (env.shown && env.shown[m.key]) return { show: false, why: 'shown' };
  if (env.claimed) return { show: false, why: 'claimed' };
  if (Number.isFinite(m.due) && now - m.due > 6 * TRL_HOUR_MS) return { show: false, skip: true, why: 'stale' };
  if (env.visible === false) return { show: false, wait: true, why: 'hidden' };
  if (Number.isFinite(env.bootAt) && now - env.bootAt < 10000) return { show: false, wait: true, why: 'boot' };
  if (env.modal) return { show: false, wait: true, why: 'busy' };
  if (env.inMeeting) return { show: false, wait: true, why: 'meeting' };
  return { show: true, why: 'ok' };
}
/**
 * The moments that are due now (MOMENTS shows them; trMomentDue gates them).
 * s: the snapshot's pieces {now, zone, home, where, trips, legs, episodes, eveningHour}.
 * -> [{kind: 'arrive'|'arrive-domestic'|'layover'|'depart'|'home', key, due, tripId, place, leg}]
 */
function trMoments(s) {
  const out = [];
  const now = s.now, home = s.home || {};
  const w = s.where || {};
  let cur = (s.trips || []).find(t => ['away', 'returning'].includes(t.status) && !t.candidate);
  // A zone abroad with no calendar trip (MOMENTS): the unplanned trip it becomes after 6 h already
  // has its id (the episode's start), so its country-level arrival shows after the 2-min hold.
  if (!cur && w.away && w.source === 'zone' && Number.isFinite(w.since)) cur = { id: _trlTripId('zone', w.since), status: 'away' };
  if (w.layover && w.layover.place) out.push({ kind: 'layover', key: '', due: w.since, place: w.layover.place, leg: w.layover.next });
  else if (cur && w.away && w.place && w.place.cc) {
    const viaZone = w.source === 'zone' && Number.isFinite(w.since) && now - w.since >= 2 * TRL_MIN_MS;
    const viaLeg = w.leg && now - w.leg.arrive <= 36 * TRL_HOUR_MS;
    if (viaZone || viaLeg || w.source === 'geo') out.push({ kind: 'arrive', key: trMomentKey('arrive', { tripId: cur.id, cc: w.place.cc }), due: w.since || now, tripId: cur.id, place: w.place, leg: w.leg || null });
  } else if (cur && w.domestic && w.place) out.push({ kind: 'arrive-domestic', key: trMomentKey('arrive', { tripId: cur.id, cityId: w.place.cityId }), due: w.since || now, tripId: cur.id, place: w.place });
  for (const t of s.trips || []) {
    const leg = t.outbound && t.outbound.legs[0];
    if (leg && !t.candidate && leg.depart > now) {
      const dep = trWall(leg.depart, leg.departZone || s.zone);
      const early = dep.min < 10 * 60;
      const eve = early ? clockAtIn(clockAddDays(dep.date, -1), (Number(s.eveningHour) || 17) * 60, leg.departZone || s.zone) : Infinity;
      const due = Math.min(leg.depart - 6 * TRL_HOUR_MS, eve);
      if (now >= due) out.push({ kind: 'depart', key: trMomentKey('depart', { eventId: leg.eventId }), due, tripId: t.id, leg });
    }
    if (t.status === 'home' && !t.candidate && t.nights >= 1 && !w.away) out.push({ kind: 'home', key: trMomentKey('home', { tripId: t.id }), due: t.end || now, tripId: t.id });
  }
  return out;
}

/* ---------- the weather over a trip's days (T3) ---------- */
/**
 * A forecast (/api/travel/weather: lib/weather.mjs's shape with `daily`) summed up over the
 * trip's days it covers: {lo, hi, rainDays, days} | null. A wet day: rain chance 50 % or more,
 * or rain, showers, drizzle or thunder.
 */
function trWeatherSummary(f, from, to) {
  if (!f || f.ok === false || !Array.isArray(f.daily)) return null;
  const days = f.daily.filter(d => d && d.date >= from && (!to || d.date <= to));
  if (!days.length) return null;
  const nums = (k) => days.map(d => d[k]).filter(Number.isFinite);
  const lo = nums('lo'), hi = nums('hi');
  return { lo: lo.length ? Math.min(...lo) : null, hi: hi.length ? Math.max(...hi) : null,
    rainDays: days.filter(d => (Number(d.rainChance) || 0) >= 50 || /rain|showers|drizzle|thunder/.test(String(d.cond || ''))).length, days: days.length };
}

/* ---------- T2: when to leave ---------- */
/** {buffer, travel, leave (ms), arrive (ms at the airport/station)} for a leg. */
function trLeaveBy(leg, o) {
  o = o || {};
  const key = leg.mode === 'flight' ? (leg.intl ? 'flight' : 'flight-domestic') : leg.mode;
  const buffer = Number.isFinite(o.buffer) ? o.buffer : (TRL_BUFFER_MIN[key] || 60);
  const travel = Number.isFinite(o.travel) ? o.travel : TRL_TRAVEL_MIN;
  const at = leg.depart - buffer * TRL_MIN_MS;
  return { buffer, travel, leave: at - travel * TRL_MIN_MS, at };
}

/* ---------- the snapshot (ctx.travel) ---------- */
/**
 * Everything the travel suggestions and surfaces read, from plain inputs (pure, < 3 ms for
 * 300 events). input:
 *   now (ms), zone (effective), home {zone, cc, cityId?, label?, ccy?}, system (the computer's zone),
 *   on (travel features on), cfg (config.travel), overrideReady,
 *   events (CalStore's Google-shaped events), eventMeta, tasks (68-suggest-context's task shape),
 *   people [{id, name, email, emails?, tz?, self?}], myEmails, changes (time.json zone changes),
 *   rows (/api/finance/travel rows or null), decisions (state.travel), work, eveningHour,
 *   P (trPlaceIndex), holidaysFor(cc, year) -> [{date, name, estimated?}], geo {place, at},
 *   weather {cityId|cc: {lo, hi, rainDays, days}}
 * -> ctx.travel (documented in 68-suggest-rules-travel.js)
 */
function trBuildSnapshot(input) {
  const I = input || {};
  const now = I.now, zone = I.zone || (I.home && I.home.zone) || 'UTC';
  const P = I.P || trPlaceIndex({});
  const home = Object.assign({ zone: zone, cc: '' }, I.home || {});
  if (!home.cc) { const hp = trZonePlace(home.zone, P); home.cc = hp ? hp.cc : ''; }
  if (!home.label) home.label = (home.cityId && P.cities.get(home.cityId) && P.cities.get(home.cityId).name) || (typeof clockZoneLabel === 'function' ? clockZoneLabel(home.zone) : home.zone);
  home.ccy = home.ccy || trCcyOf(home.cc, P) || 'GBP';
  const cfg = I.cfg && typeof I.cfg === 'object' ? I.cfg : {};
  const today = trWall(now, zone).date;
  const ccOf = (z) => { const p = trZonePlace(z, P); return p ? p.cc : ''; };
  const win = { from: now - 45 * TRL_DAY_MS, to: now + 60 * TRL_DAY_MS };
  const events = [];
  for (const ev of I.events || []) {
    if (!ev || !ev.start) continue;
    const s = ev.start.dateTime ? Date.parse(ev.start.dateTime) : ev.start.date ? Date.parse(ev.start.date + 'T12:00:00Z') : NaN;
    if (Number.isFinite(s) && (s < win.from - 30 * TRL_DAY_MS || s > win.to)) continue;
    events.push(ev);
  }
  const legs = trLegs(events, P, { zone, from: win.from, to: win.to });
  const tripEvents = trTripEvents(events, P, { zone });
  const episodes = trZoneEpisodes(I.changes || [], { homeCc: home.cc, homeZone: home.zone, ccOf, now, system: I.system });
  const pay = Array.isArray(I.rows) ? trPayEpisodes(I.rows, { homeCcy: home.ccy, homeCc: home.cc, P }) : [];
  const trips = trTripsFrom(legs, tripEvents, episodes, pay, home, P, { now, zone, decisions: I.decisions, work: I.work });
  const sysZ = _trlZone(I.system) || zone;
  const where = trWhere({ home, system: sysZ, legs, trips, episodes, geo: I.geo, zone }, now, P);
  const work = I.work || { days: [1, 2, 3, 4, 5] };
  const meta = I.eventMeta || {};
  const taskList = Array.isArray(I.tasks) ? I.tasks : [];
  const openTasks = taskList.filter(t => t && t.status !== 'done');
  // Per trip: status, work days, flags the rules read.
  for (const t of trips) {
    t.status = trStatus(t, now, { zone: home.zone });
    t.workDays = trWorkDays(t, work);
    t.diffMin = t.dest && t.dest.zone ? clockOffsetIn(Number.isFinite(t.start) ? t.start : now, t.dest.zone) - clockOffsetIn(Number.isFinite(t.start) ? t.start : now, home.zone) : 0;
    t.ccy = t.dest ? trCcyOf(t.dest.cc, P) : '';
    const plugsOf = (x) => String(Array.isArray(x) ? x.join('') : x || '').toUpperCase().replace(/[^A-O]/g, '');
    const c = t.dest && P.countries.get(t.dest.cc);
    const hc = P.countries.get(home.cc);
    t.plugs = c ? plugsOf(c.plugs) : '';
    const hp = hc ? plugsOf(hc.plugs) : '';
    t.plugsDiffer = !!(t.plugs && hp && t.dest.cc !== home.cc && !t.plugs.split('').some(p => hp.includes(p)));
    t.slug = t.dest ? trTagSlug(t.label || t.dest.label || t.dest.name || '') : '';
    const g = trGroup(t, { events, eventMeta: meta, tasks: taskList, rows: I.rows || [], P, zone, home, now, away: where.away });
    t.tasks = g.tasks;
    t.spending = g.spending;
    t.groupEvents = g.events;
    // T5: an all-day "away" event that covers it already
    t.ooo = events.some(ev => ev.start && ev.start.date && !_trlSkipEvent(ev) && TRL_OOO_RE.test(_trlTitle(ev))
      && String(ev.start.date) <= t.from && clockAddDays(String((ev.end && ev.end.date) || ev.start.date), -1) >= (t.to || t.from));
    // T3: a pack task for it
    t.packTask = openTasks.some(x => /\bpack(ing)?\b/i.test(x.title || '') && ((x.due && x.due <= t.from && x.due >= clockAddDays(t.from, -10)) || (x.tags || []).some(g2 => ['trip', t.slug].includes(_trlFold(g2).replace(/ /g, '-'))) || t.tasks.includes(x.id)));
    // T4 / T11: open non-trip tasks due or planned on trip days
    const lastDay = t.to || today;
    t.awayTasks = openTasks.filter(x => !t.tasks.includes(x.id) && ((x.due && x.due >= t.from && x.due <= lastDay) || (x.planned && x.planned >= t.from && x.planned <= lastDay)))
      .map(x => ({ id: x.id, title: x.title, due: x.due || null, planned: x.planned || null, priority: x.priority || '' }));
    t.weather = I.weather && t.dest && t.dest.cityId && I.weather[t.dest.cityId] ? trWeatherSummary(I.weather[t.dest.cityId], t.from, t.to) : null;
    t.meetings = [];
  }
  const trip = trips.find(t => ['away', 'returning'].includes(t.status) && !t.candidate)
    || trips.find(t => ['departing', 'planned'].includes(t.status) && !t.candidate && t.from <= clockAddDays(today, 14))
    || trips.find(t => t.status === 'home') || null;
  // Legs the rules read: upcoming in 48 h (T1 / T2) and landed in the last 36 h (T7).
  const legView = (l) => Object.assign({}, l, {
    dep: trWall(l.depart, zone), arr: trWall(l.arrive, l.arriveZone || zone), depLocal: trWall(l.depart, l.departZone || zone),
    leave: (() => { const b = trLeaveBy(l, cfg.leave || {}); return Object.assign(b, { leaveWall: trWall(b.leave, zone), atWall: trWall(b.at, zone) }); })(),
    tripId: (trips.find(t => t.legs.includes(l)) || {}).id || '',
    linked: ((meta[l.eventId] && meta[l.eventId].tasks) || []).slice(),
    leaveBlock: events.some(ev => {
      const m2 = meta[ev.id];
      if (!ev.start || !ev.start.dateTime || ev.id === l.eventId) return false;
      const s2 = _trlEdgeMs(ev.start, zone);
      return s2 < l.depart && s2 > l.depart - 12 * TRL_HOUR_MS && ((m2 && m2.origin && m2.origin.kind === 'travel') || /^(travel|leave|taxi|drive|train|uber) (to|for)\b/i.test(_trlTitle(ev)));
    }),
    checkinTask: openTasks.some(x => /check.?in/i.test(x.title || '') && (((meta[l.eventId] && meta[l.eventId].tasks) || []).includes(x.id)
      || (l.code && (x.title || '').toUpperCase().includes(l.code.replace(' ', ''))) || (l.code && (x.title || '').includes(l.code))
      || (x.due && x.due >= clockAddDays(today, -1) && x.due <= trWall(l.depart, zone).date))),
  });
  const soon = legs.filter(l => (l.depart > now && l.depart - now <= 48 * TRL_HOUR_MS) || (l.arrive <= now && now - l.arrive <= 36 * TRL_HOUR_MS)).map(legView);
  // T7: a leg landed abroad more than 30 min ago, the computer is still on home time.
  let landed = null;
  if (where.mismatch === 'zone-home' && where.leg && now - where.leg.arrive >= 30 * TRL_MIN_MS) {
    const t = trips.find(x => x.legs.includes(where.leg)) || null;
    landed = { legId: where.leg.id, eventId: where.leg.eventId, tripId: t ? t.id : '', zone: where.leg.arriveZone, label: (where.leg.to && where.leg.to.label) || '',
      cc: where.leg.to ? where.leg.to.cc : '', minutes: Math.round((now - where.leg.arrive) / TRL_MIN_MS), until: t && t.to ? t.to : clockAddDays(today, 7), code: where.leg.code };
  }
  // Meetings with other people in the next 7 days (and during trips): their time (T6, T10, T12).
  const peopleByEmail = new Map();
  for (const p of I.people || []) {
    if (!p || p.self) continue;
    const first = String(p.name || '').split(/\s+/)[0] || '';
    for (const e of [p.email, ...(Array.isArray(p.emails) ? p.emails : [])]) if (e) peopleByEmail.set(String(e).toLowerCase(), { id: p.id, name: p.name || '', first, tz: p.tz || '' });
  }
  const mine = new Set((I.myEmails || []).map(e => String(e).toLowerCase()));
  const mEnd = now + 7 * TRL_DAY_MS;
  const tripTo = trips.filter(t => ['planned', 'departing', 'away', 'returning'].includes(t.status) && t.to).reduce((a, t) => Math.max(a, clockAtIn(clockAddDays(t.to, 1), 0, home.zone)), 0);
  const horizon = Math.max(mEnd, Math.min(tripTo, now + 30 * TRL_DAY_MS));
  const timed = [];
  for (const ev of events) {
    if (!ev.start || !ev.start.dateTime || _trlSkipEvent(ev) || ev.free) continue;
    const s = _trlEdgeMs(ev.start, zone), e = _trlEdgeMs(ev.end || ev.start, zone);
    if (s >= now - TRL_HOUR_MS && s <= horizon) timed.push({ ev, s, e: Number.isFinite(e) ? e : s });
  }
  const busy = timed.map(x => [x.s, x.e, x.ev.id]);
  const meetings = [];
  for (const { ev, s, e } of timed) {
    const att = (Array.isArray(ev.attendees) ? ev.attendees : []).filter(a => a && !a.resource);
    const others = att.filter(a => !a.self && !mine.has(String(a.email || '').toLowerCase()));
    if (!others.length) continue;
    const orgSelf = !!(ev.organizer && (ev.organizer.self || mine.has(String(ev.organizer.email || '').toLowerCase())));
    // A fairer slot is looked for only for meetings the user organises, in the next 7 days.
    const free = orgSelf && s <= mEnd ? busy.filter(b => b[2] !== ev.id) : null;
    const tt = trTheirTime({ eventId: ev.id, title: _trlTitle(ev), start: s, end: e, zone: ev.start.timeZone, organizerSelf: orgSelf, organizer: ev.organizer, attendees: att },
      { myZone: zone, people: peopleByEmail, now, busy: free || [] });
    for (const x of tt.their) { const zp = trZonePlace(x.zone, P); x.cc = zp ? zp.cc : ''; x.label = zp ? zp.label : x.zone; x.diffMin = clockOffsetIn(s, x.zone) - clockOffsetIn(s, zone); }
    const w = trWall(s, zone);
    const inTrip = trips.find(t => !t.candidate && t.dest && t.dest.zone && s >= (t.start || 0) && (t.end === null || t.end === undefined || s <= t.end));
    const local = inTrip ? trWall(s, inTrip.dest.zone) : null;
    const mt = { eventId: ev.id, title: _trlTitle(ev).slice(0, 120), start: s, end: e, date: w.date, min: w.min, endMin: trWall(e, zone).min,
      organizerSelf: orgSelf, attendees: others.length, recurring: !!(ev.recurring || ev.recurringEventId), zone: _trlZone(ev.start.timeZone) || '',
      their: tt.their, unsocial: tt.unsocial, slot: free ? tt.slot : null, tripId: inTrip ? inTrip.id : '',
      local: local ? { zone: inTrip.dest.zone, label: inTrip.dest.label || '', date: local.date, min: local.min } : null };
    meetings.push(mt);
    if (inTrip) inTrip.meetings.push(mt.eventId);
  }
  // T13: a person who organised 2+ events in another zone, with no zone saved yet.
  const pz = new Map();
  for (const ev of events) {
    if (!ev.start || !ev.start.dateTime || !ev.organizer || ev.organizer.self) continue;
    const z = _trlZone(ev.start.timeZone);
    if (!z || z === zone || z === home.zone || _trlPlaceless(z)) continue;
    const p = peopleByEmail.get(String(ev.organizer.email || '').toLowerCase());
    if (!p || p.tz) continue;
    const k = p.id + '|' + z;
    pz.set(k, (pz.get(k) || 0) + 1);
  }
  const personZones = [];
  for (const [k, n] of pz) {
    if (n < 2) continue;
    const [pid, z] = k.split('|');
    const p = [...peopleByEmail.values()].find(x => x.id === pid);
    const zp = trZonePlace(z, P);
    personZones.push({ personId: pid, name: p ? p.name : '', first: p ? p.first : '', zone: z, label: zp ? zp.label : z, n });
  }
  personZones.sort((a, b) => b.n - a.n);
  // Holidays in the next 7 days: home, the trip's country, and where people with a zone live (T10).
  const holidays = [];
  if (typeof I.holidaysFor === 'function') {
    const ccs = new Map([[home.cc, 'home']]);
    if (trip && trip.dest && trip.dest.cc && trip.dest.cc !== home.cc) ccs.set(trip.dest.cc, 'trip');
    for (const mt of meetings) for (const t of mt.their) { const c = ccOf(t.zone); if (c && !ccs.has(c)) ccs.set(c, 'people'); }
    const last = clockAddDays(today, 7);
    const years = [...new Set([today.slice(0, 4), last.slice(0, 4)])].map(Number);
    for (const [cc, why] of ccs) {
      if (!cc) continue;
      for (const y of years) {
        let list = [];
        try { list = I.holidaysFor(cc, y) || []; } catch (e) { list = []; }
        for (const h of list) if (h && h.date >= today && h.date <= last) holidays.push({ cc, date: h.date, name: String(h.name || 'Public holiday'), estimated: !!h.estimated, home: why === 'home', why });
      }
    }
    holidays.sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  const body = cfg.jetlag === false ? null : trBody({ now, zone, legs, home });
  const longStay = trLongStay(episodes, now, P);
  const s = {
    v: TRL_VERSION, on: I.on !== false, now, zone, today, home, system: { zone: sysZ, cc: ccOf(sysZ), isHome: ccOf(sysZ) === home.cc || sysZ === home.zone },
    overrideReady: !!I.overrideReady, where, away: !!where.away, trips, trip, legs: soon, landed, body, meetings, personZones, holidays,
    daysOff: !!(cfg.holidays && cfg.holidays.daysOff), longStay, episodes, eveningHour: Number(I.eveningHour) || 17,
  };
  s.moments = trMoments(s);
  // When travel is off: only whether to ask (6.4) - a flight soon or a zone abroad.
  s.optIn = !s.on && (trips.some(t => t.intl && !t.candidate && ['planned', 'departing', 'away', 'returning'].includes(t.status) && t.from <= clockAddDays(today, 14)) || (where.source === 'zone' && where.away))
    ? { reason: where.source === 'zone' && where.away ? 'zone' : 'trip', label: (where.away && where.place && where.place.label) || (trip && trip.label) || '' } : null;
  return s;
}
