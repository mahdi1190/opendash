/* ============================================================
   TRAVEL HOLIDAYS (pure). Owner: PLACES (travel spec 5.4).
   Public holidays from offline rules for about 30 countries: fixed dates,
   the nth or last weekday, Easter offsets (Western and Orthodox), the first
   weekday on or after a date, Japan's equinox formula, substitute days
   (gb: next free weekday; us: Saturday -> Friday, Sunday -> Monday; sun:
   Sunday -> next free day; jp: furikae plus the "citizens' holiday" between
   two holidays), and a 2026-2031 table for lunar or announced dates, which
   are marked `estimated` (the opt-in online lookup, lib/holidays-online.mjs,
   replaces those). No Date objects: day numbers only, so it is the same in
   every time zone. lib/travel-logic.mjs and lib/travel-data.mjs evaluate it
   for Node; tests/travel-holidays.test.mjs checks 2026-2028.

     trHolidays(cc, year, o)          [{date, name, estimated?, sub?, moved?, partial?, regions?}] sorted
                                      o.region: GB 'ENG' (default; 'WLS' is the same), 'SCT', 'NIR', '*' = all
                                      sub: a substitute day off; moved: its day off is the substitute
                                      partial: only some regions (Swiss cantons)
     trHolidaysBetween(cc, from, to, o)   the same over an ISO date range (at most 3 years)
     trHolidayOn(cc, iso, o)          the holiday on that date (a substitute counts) | null
     trHolidayCountries()             the country codes with rules
     trHolidayRegions(cc)             [{id, label}] (GB only)
     trHolidayCoverage(cc, year)      'full' | 'partial' (lunar dates not in the table) | 'none'
     trEasterIso(year, orthodox)      'YYYY-MM-DD'
     trJpEquinox(year, 'spring'|'autumn')   the day of March / September
   ============================================================ */

/* ---------- day numbers (days since 1970-01-01, proleptic Gregorian) ---------- */
function _trhDn(y, m, d) {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400), yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
}
function _trhIso(n) {
  const z = n + 719468, era = Math.floor(z / 146097), doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153), d = doy - Math.floor((153 * mp + 2) / 5) + 1, m = mp < 10 ? mp + 3 : mp - 9;
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
}
const _trhDow = (n) => (((n + 4) % 7) + 7) % 7;   // 0 = Sunday
function _trhFromIso(iso) { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(String(iso || '')); return m ? _trhDn(+m[1], +m[2], +m[3]) : NaN; }

/* ---------- Easter and the Japanese equinoxes ---------- */
function _trhEaster(y, orthodox) {
  if (orthodox) {   // Julian computus, then +13 days (1900-2099)
    const d = (19 * (y % 19) + 15) % 30, e = (2 * (y % 4) + 4 * (y % 7) - d + 34) % 7;
    return _trhDn(y, Math.floor((d + e + 114) / 31), ((d + e + 114) % 31) + 1) + 13;
  }
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return _trhDn(y, Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1);
}
function trEasterIso(year, orthodox) { return _trhIso(_trhEaster(Number(year), !!orthodox)); }
/** The National Astronomical Observatory's formula, valid 1980-2099. */
function trJpEquinox(year, which) {
  const y = Number(year) - 1980;
  return Math.floor((which === 'autumn' ? 23.2488 : 20.8431) + 0.242194 * y - Math.floor(y / 4));
}

/* ---------- lunar and announced dates, 2026-2031 (MMDD per year) ----------
   Computed from new and full moons (Meeus) and checked against the published
   2026 lists. Islamic dates follow the calculated (Umm al-Qura-like) calendar;
   South Asia and Singapore often observe a day later (the +1 in their rules).
   matariki is legislated (not estimated). */
const TRH_TABLE_FROM = 2026;
const TRH_TABLE = Object.freeze({
  cny: '0217 0206 0126 0213 0203 0123', qingming: '0405 0405 0404 0404 0405 0405', dragon: '0619 0609 0528 0616 0605 0624',
  midaut: '0925 0915 1003 0922 0912 1001', eidf: '0320 0309 0226 0214 0204 0124', eida: '0527 0516 0505 0425 0414 0402',
  hijri: '0616 0606 0525 0514 0503 0423', ashura: '0625 0615 0603 0523 0512 0502', mawlid: '0825 0814 0803 0724 0714 0703',
  holi: '0304 0322 0311 0301 0320 0310', ramnavami: '0326 0415 0403 0323 0411 0401', mahavir: '0331 0419 0407 0328 0416 0405',
  buddha: '0501 0520 0508 0428 0517 0507', janmashtami: '0904 0825 0813 0901 0821 0811', dussehra: '1020 1010 0928 1017 1006 1025',
  diwali: '1108 1029 1017 1105 1026 1114', gurunanak: '1124 1114 1102 1121 1110 1129',
  hrp: '0321 0310 0227 0215 0205 0125', hrh: '0527 0517 0505 0425 0414 0402', vesak: '0531 0520 0509 0527 0516 0604',
  deepavali: '1108 1028 1016 1104 1025 1113', matariki: '0710 0625 0714 0706 0621 0711',
});

/* ---------- the rules ----------
   One rule per ';': when|name|flags. When:
     MM-DD  fixed          MM-DD>w  first weekday w (0 = Sunday) on or after
     MM:w:n nth weekday w of the month (n = -1: the last)
     E+n / O+n  days after Western / Orthodox Easter     Js / Ja  JP equinox
     L:key+n  the table (estimated)    T:key  the table (legislated)
     bri  Ireland's St Brigid's Day (1 Feb if a Friday, else the first Monday)
     YYYY-MM-DD  a one-off day
   Flags: * a substitute when it falls on a weekend; ~ a Sunday moves to Saturday;
   p only some regions; @E,S,N GB regions (E England & Wales, S Scotland,
   N Northern Ireland); >YYYY from that year. */
const _TRH_EU = '01-01|New Year\'s Day';
const TRH_RULES = Object.freeze({
  GB: ['gb', '01-01|New Year\'s Day|*;01-02|2 January|*@S;03-17|St Patrick\'s Day|*@N;E-2|Good Friday;E+1|Easter Monday|@E,N;05:1:1|Early May bank holiday;'
    + '05:1:-1|Spring bank holiday;2026-06-15|World Cup bank holiday|@S;07-12|Battle of the Boyne|*@N;08:1:1|Summer bank holiday|@S;08:1:-1|Summer bank holiday|@E,N;'
    + '11-30|St Andrew\'s Day|*@S;12-25|Christmas Day|*;12-26|Boxing Day|*'],
  IE: ['', _TRH_EU + ';bri|St Brigid\'s Day;03-17|St Patrick\'s Day;E+1|Easter Monday;05:1:1|May bank holiday;06:1:1|June bank holiday;08:1:1|August bank holiday;'
    + '10:1:-1|October bank holiday;12-25|Christmas Day;12-26|St Stephen\'s Day'],
  US: ['us', '01-01|New Year\'s Day|*;01:1:3|Martin Luther King Jr. Day;02:1:3|Presidents\' Day;05:1:-1|Memorial Day;06-19|Juneteenth|*;07-04|Independence Day|*;'
    + '09:1:1|Labor Day;10:1:2|Columbus Day;11-11|Veterans Day|*;11:4:4|Thanksgiving;12-25|Christmas Day|*'],
  CA: ['sun', _TRH_EU + ';E-2|Good Friday;05-18>1|Victoria Day;07-01|Canada Day|*;09:1:1|Labour Day;09-30|National Day for Truth and Reconciliation;'
    + '10:1:2|Thanksgiving;12-25|Christmas Day'],
  FR: ['', _TRH_EU + ';E+1|Easter Monday;05-01|Labour Day;05-08|Victory in Europe Day;E+39|Ascension Day;E+50|Whit Monday;07-14|Bastille Day;08-15|Assumption;'
    + '11-01|All Saints\' Day;11-11|Armistice Day;12-25|Christmas Day'],
  DE: ['', _TRH_EU + ';E-2|Good Friday;E+1|Easter Monday;05-01|Labour Day;E+39|Ascension Day;E+50|Whit Monday;10-03|German Unity Day;12-25|Christmas Day;12-26|Second Day of Christmas'],
  ES: ['', _TRH_EU + ';01-06|Epiphany;E-2|Good Friday;05-01|Labour Day;08-15|Assumption;10-12|National Day;11-01|All Saints\' Day;12-06|Constitution Day;'
    + '12-08|Immaculate Conception;12-25|Christmas Day'],
  PT: ['', _TRH_EU + ';E-2|Good Friday;E|Easter Sunday;04-25|Freedom Day;05-01|Labour Day;E+60|Corpus Christi;06-10|Portugal Day;08-15|Assumption;10-05|Republic Day;'
    + '11-01|All Saints\' Day;12-01|Restoration of Independence;12-08|Immaculate Conception;12-25|Christmas Day'],
  IT: ['', _TRH_EU + ';01-06|Epiphany;E|Easter Sunday;E+1|Easter Monday;04-25|Liberation Day;05-01|Labour Day;06-02|Republic Day;08-15|Ferragosto;'
    + '10-04|St Francis\' Day||>2026;11-01|All Saints\' Day;12-08|Immaculate Conception;12-25|Christmas Day;12-26|St Stephen\'s Day'],
  NL: ['', _TRH_EU + ';E|Easter Sunday;E+1|Easter Monday;04-27|King\'s Day|~;E+39|Ascension Day;E+49|Whit Sunday;E+50|Whit Monday;12-25|Christmas Day;12-26|Second Day of Christmas'],
  BE: ['', _TRH_EU + ';E|Easter Sunday;E+1|Easter Monday;05-01|Labour Day;E+39|Ascension Day;E+50|Whit Monday;07-21|National Day;08-15|Assumption;11-01|All Saints\' Day;'
    + '11-11|Armistice Day;12-25|Christmas Day'],
  CH: ['', _TRH_EU + ';01-02|St Berchtold\'s Day|p;E-2|Good Friday|p;E+1|Easter Monday|p;E+39|Ascension Day;E+50|Whit Monday|p;08-01|Swiss National Day;12-25|Christmas Day;'
    + '12-26|St Stephen\'s Day|p'],
  AT: ['', _TRH_EU + ';01-06|Epiphany;E|Easter Sunday;E+1|Easter Monday;05-01|Labour Day;E+39|Ascension Day;E+49|Whit Sunday;E+50|Whit Monday;E+60|Corpus Christi;'
    + '08-15|Assumption;10-26|National Day;11-01|All Saints\' Day;12-08|Immaculate Conception;12-25|Christmas Day;12-26|St Stephen\'s Day'],
  PL: ['', _TRH_EU + ';01-06|Epiphany;E|Easter Sunday;E+1|Easter Monday;05-01|Labour Day;05-03|Constitution Day;E+49|Whit Sunday;E+60|Corpus Christi;08-15|Assumption;'
    + '11-01|All Saints\' Day;11-11|Independence Day;12-24|Christmas Eve||>2025;12-25|Christmas Day;12-26|Second Day of Christmas'],
  SE: ['', _TRH_EU + ';01-06|Epiphany;E-2|Good Friday;E|Easter Sunday;E+1|Easter Monday;05-01|May Day;E+39|Ascension Day;E+49|Whit Sunday;06-06|National Day;'
    + '06-19>5|Midsummer Eve;06-20>6|Midsummer Day;10-31>6|All Saints\' Day;12-24|Christmas Eve;12-25|Christmas Day;12-26|Boxing Day;12-31|New Year\'s Eve'],
  NO: ['', _TRH_EU + ';E-3|Maundy Thursday;E-2|Good Friday;E|Easter Sunday;E+1|Easter Monday;05-01|Labour Day;E+39|Ascension Day;05-17|Constitution Day;E+49|Whit Sunday;'
    + 'E+50|Whit Monday;12-25|Christmas Day;12-26|Boxing Day'],
  DK: ['', _TRH_EU + ';E-3|Maundy Thursday;E-2|Good Friday;E|Easter Sunday;E+1|Easter Monday;E+39|Ascension Day;E+49|Whit Sunday;E+50|Whit Monday;12-25|Christmas Day;12-26|Boxing Day'],
  FI: ['', _TRH_EU + ';01-06|Epiphany;E-2|Good Friday;E|Easter Sunday;E+1|Easter Monday;05-01|May Day;E+39|Ascension Day;E+49|Whit Sunday;06-19>5|Midsummer Eve;'
    + '06-20>6|Midsummer Day;10-31>6|All Saints\' Day;12-06|Independence Day;12-24|Christmas Eve;12-25|Christmas Day;12-26|Boxing Day'],
  IS: ['', _TRH_EU + ';E-3|Maundy Thursday;E-2|Good Friday;E|Easter Sunday;E+1|Easter Monday;04-19>4|First Day of Summer;05-01|Labour Day;E+39|Ascension Day;'
    + 'E+49|Whit Sunday;E+50|Whit Monday;06-17|National Day;08:1:1|Commerce Day;12-24|Christmas Eve;12-25|Christmas Day;12-26|Boxing Day;12-31|New Year\'s Eve'],
  GR: ['', _TRH_EU + ';01-06|Epiphany;O-48|Clean Monday;03-25|Independence Day;O-2|Good Friday;O|Easter Sunday;O+1|Easter Monday;05-01|Labour Day;O+49|Pentecost;O+50|Whit Monday;'
    + '08-15|Assumption;10-28|Ochi Day;12-25|Christmas Day;12-26|Synaxis of the Mother of God'],
  TR: ['', _TRH_EU + ';04-23|National Sovereignty and Children\'s Day;05-01|Labour Day;05-19|Youth and Sports Day;07-15|Democracy and National Unity Day;08-30|Victory Day;'
    + '10-29|Republic Day;L:eidf|Ramadan Feast;L:eidf+1|Ramadan Feast (day 2);L:eidf+2|Ramadan Feast (day 3);L:eida|Feast of Sacrifice;L:eida+1|Feast of Sacrifice (day 2);'
    + 'L:eida+2|Feast of Sacrifice (day 3);L:eida+3|Feast of Sacrifice (day 4)'],
  AE: ['', _TRH_EU + ';L:eidf|Eid al-Fitr;L:eidf+1|Eid al-Fitr (day 2);L:eidf+2|Eid al-Fitr (day 3);L:eida-1|Arafat Day;L:eida|Eid al-Adha;L:eida+1|Eid al-Adha (day 2);'
    + 'L:eida+2|Eid al-Adha (day 3);L:hijri|Islamic New Year;L:mawlid|Prophet\'s Birthday;12-01|Commemoration Day;12-02|National Day;12-03|National Day (day 2)'],
  PK: ['', '02-05|Kashmir Solidarity Day;03-23|Pakistan Day;05-01|Labour Day;05-28|Youm-e-Takbeer;08-14|Independence Day;11-09|Iqbal Day;12-25|Quaid-e-Azam Day;'
    + 'L:eidf+1|Eid ul-Fitr;L:eidf+2|Eid ul-Fitr (day 2);L:eidf+3|Eid ul-Fitr (day 3);L:eida|Eid ul-Adha;L:eida+1|Eid ul-Adha (day 2);L:eida+2|Eid ul-Adha (day 3);'
    + 'L:ashura|Ashura (9 Muharram);L:ashura+1|Ashura (10 Muharram);L:mawlid+1|Eid Milad un-Nabi'],
  IN: ['', '01-26|Republic Day;08-15|Independence Day;10-02|Gandhi Jayanti;12-25|Christmas Day;E-2|Good Friday;L:holi|Holi;L:eidf+1|Id-ul-Fitr;L:ramnavami|Ram Navami;'
    + 'L:mahavir|Mahavir Jayanti;L:buddha|Buddha Purnima;L:eida|Id-ul-Zuha (Bakrid);L:ashura+1|Muharram;L:mawlid+1|Milad-un-Nabi;L:janmashtami|Janmashtami;'
    + 'L:dussehra|Dussehra;L:diwali|Diwali;L:gurunanak|Guru Nanak Jayanti'],
  JP: ['jp', '01-01|New Year\'s Day;01:1:2|Coming of Age Day;02-11|National Foundation Day;02-23|Emperor\'s Birthday;Js|Vernal Equinox Day;04-29|Showa Day;'
    + '05-03|Constitution Memorial Day;05-04|Greenery Day;05-05|Children\'s Day;07:1:3|Marine Day;08-11|Mountain Day;09:1:3|Respect for the Aged Day;'
    + 'Ja|Autumnal Equinox Day;10:1:2|Sports Day;11-03|Culture Day;11-23|Labour Thanksgiving Day'],
  CN: ['', _TRH_EU + ';L:cny-1|Spring Festival Eve;L:cny|Spring Festival;L:cny+1|Spring Festival (day 2);L:cny+2|Spring Festival (day 3);L:qingming|Qingming Festival;'
    + '05-01|Labour Day;05-02|Labour Day (day 2);L:dragon|Dragon Boat Festival;L:midaut|Mid-Autumn Festival;10-01|National Day;10-02|National Day (day 2);10-03|National Day (day 3)'],
  SG: ['sun', '01-01|New Year\'s Day|*;L:cny|Chinese New Year|*;L:cny+1|Chinese New Year (day 2)|*;L:hrp|Hari Raya Puasa|*;E-2|Good Friday;05-01|Labour Day|*;'
    + 'L:vesak|Vesak Day|*;L:hrh|Hari Raya Haji|*;08-09|National Day|*;L:deepavali|Deepavali|*;12-25|Christmas Day|*'],
  AU: ['gb', '01-01|New Year\'s Day|*;01-26|Australia Day|*;E-2|Good Friday;E+1|Easter Monday;04-25|Anzac Day;12-25|Christmas Day|*;12-26|Boxing Day|*'],
  NZ: ['gb', '01-01|New Year\'s Day|*;01-02|Day after New Year\'s Day|*;02-06|Waitangi Day|*;E-2|Good Friday;E+1|Easter Monday;04-25|Anzac Day|*;06:1:1|King\'s Birthday;'
    + 'T:matariki|Matariki;10:1:4|Labour Day;12-25|Christmas Day|*;12-26|Boxing Day|*'],
});
const _TRH_REGIONS = Object.freeze({ GB: [{ id: 'ENG', label: 'England & Wales', k: 'E' }, { id: 'SCT', label: 'Scotland', k: 'S' }, { id: 'NIR', label: 'Northern Ireland', k: 'N' }] });
const _TRH_SUB_NAME = Object.freeze({ us: ' (observed)' });

/* ---------- evaluation ---------- */
const _trhParsed = new Map(), _trhCache = new Map();
function _trhRules(cc) {
  if (_trhParsed.has(cc)) return _trhParsed.get(cc);
  const def = TRH_RULES[cc];
  const out = def ? { sub: def[0], rules: def[1].split(';').map(s => {
    const [when, name, ...rest] = s.split('|');
    const flags = rest.join('|'), reg = /@([A-Z,]+)/.exec(flags), from = />(\d{4})/.exec(flags);
    return { when, name, star: flags.indexOf('*') >= 0, sat: flags.indexOf('~') >= 0, partial: flags.replace(/@[A-Z,]+/, '').indexOf('p') >= 0,
      regions: reg ? reg[1].split(',') : null, from: from ? Number(from[1]) : 0 };
  }) } : null;
  _trhParsed.set(cc, out);
  return out;
}
/** The day number a rule gives in year y: NaN when it does not apply; {n, est} otherwise. */
function _trhWhen(w, y) {
  let m;
  if ((m = /^(\d\d)-(\d\d)$/.exec(w))) return { n: _trhDn(y, +m[1], +m[2]) };
  if ((m = /^(\d\d)-(\d\d)>(\d)$/.exec(w))) { const n = _trhDn(y, +m[1], +m[2]); return { n: n + ((+m[3] - _trhDow(n) + 7) % 7) }; }
  if ((m = /^(\d\d):(\d):(-?\d)$/.exec(w))) {
    const mo = +m[1], wd = +m[2], k = +m[3];
    if (k < 0) { const last = _trhDn(mo === 12 ? y + 1 : y, mo === 12 ? 1 : mo + 1, 1) - 1; return { n: last - ((_trhDow(last) - wd + 7) % 7) }; }
    const first = _trhDn(y, mo, 1);
    return { n: first + ((wd - _trhDow(first) + 7) % 7) + (k - 1) * 7 };
  }
  if ((m = /^([EO])([+-]\d+)?$/.exec(w))) return { n: _trhEaster(y, m[1] === 'O') + Number(m[2] || 0) };
  if ((m = /^J([sa])$/.exec(w))) return { n: m[1] === 's' ? _trhDn(y, 3, trJpEquinox(y, 'spring')) : _trhDn(y, 9, trJpEquinox(y, 'autumn')) };
  if ((m = /^([LT]):(\w+)([+-]\d+)?$/.exec(w))) {
    const row = TRH_TABLE[m[2]], i = y - TRH_TABLE_FROM;
    const v = row ? row.split(' ')[i] : '';
    if (i < 0 || !v) return null;
    return { n: _trhDn(y, +v.slice(0, 2), +v.slice(2)) + Number(m[3] || 0), est: m[1] === 'L' };
  }
  if (w === 'bri') { const f = _trhDn(y, 2, 1); return { n: _trhDow(f) === 5 ? f : f + ((1 - _trhDow(f) + 7) % 7) }; }
  if ((m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(w))) return +m[1] === y ? { n: _trhDn(y, +m[2], +m[3]) } : null;
  return null;
}
function _trhRegionKey(cc, region) {
  const list = _TRH_REGIONS[cc];
  if (!list) return '';
  const r = String(region || '').toUpperCase().replace(/^GB-/, '');
  if (r === '*') return '*';
  if (r === 'WLS') return 'E';
  const hit = list.find(x => x.id === r);
  return hit ? hit.k : list[0].k;
}
/** The holidays of year y before substitutes, as [{n, name, est, star, partial, regions}]. */
function _trhRaw(cc, y, rk) {
  const R = _trhRules(cc);
  const out = [];
  for (const r of R.rules) {
    if (r.from && y < r.from) continue;
    if (r.regions && rk !== '*' && r.regions.indexOf(rk) < 0) continue;
    const w = _trhWhen(r.when, y);
    if (!w || !Number.isFinite(w.n)) continue;
    let n = w.n;
    if (r.sat && _trhDow(n) === 0) n -= 1;
    out.push({ n, name: r.name, est: !!w.est, star: r.star, partial: r.partial, regions: r.regions });
  }
  return out;
}
function _trhWithSubs(cc, raw) {
  const sub = _trhRules(cc).sub;
  const days = raw.map(h => Object.assign({}, h)).sort((a, b) => a.n - b.n);
  if (!sub) return days;
  const taken = new Set(days.map(h => h.n));
  const weekend = (n) => { const d = _trhDow(n); return d === 0 || d === 6; };
  const subs = [];
  for (const h of days) {
    if (!h.star) continue;
    const d = _trhDow(h.n);
    let to = NaN;
    if (sub === 'us') to = d === 6 ? h.n - 1 : d === 0 ? h.n + 1 : NaN;
    else if (sub === 'gb' && weekend(h.n)) { to = h.n + 1; while (weekend(to) || taken.has(to)) to++; }
    else if (sub === 'sun' && d === 0) { to = h.n + 1; while (taken.has(to)) to++; }
    if (!Number.isFinite(to)) continue;
    taken.add(to);
    h.moved = true;
    subs.push({ n: to, name: h.name + (_TRH_SUB_NAME[sub] || ' (substitute day)'), est: h.est, sub: true, regions: h.regions });
  }
  if (sub === 'jp') {
    // Furikae: a holiday on a Sunday gives the next day that is not a holiday. Then a day between two holidays is a holiday too.
    for (const h of days) {
      if (_trhDow(h.n) !== 0) continue;
      let to = h.n + 1;
      while (taken.has(to)) to++;
      taken.add(to); h.moved = true;
      subs.push({ n: to, name: 'Substitute holiday', est: false, sub: true });
    }
    const base = new Set(days.map(h => h.n));
    for (const h of days) {
      const mid = h.n + 1;
      if (base.has(mid + 1) && !taken.has(mid) && _trhDow(mid) !== 0) { taken.add(mid); subs.push({ n: mid, name: 'Citizens\' holiday', est: false, sub: true }); }
    }
  }
  return days.concat(subs).sort((a, b) => a.n - b.n || (a.sub ? 1 : 0) - (b.sub ? 1 : 0));
}
function trHolidays(cc, year, o) {
  const C = String(cc || '').toUpperCase(), y = Number(year);
  if (!TRH_RULES[C] || !Number.isInteger(y) || y < 1900 || y > 2099) return [];
  const rk = _trhRegionKey(C, o && o.region);
  const key = C + ':' + y + ':' + rk;
  if (rk === '*' && !_trhCache.has(key)) {
    // Every region: each region's own list (its own substitutes), merged; a day not in all of them names its regions.
    const regs = _TRH_REGIONS[C], seen = new Map();
    for (const r of regs) {
      for (const h of trHolidays(C, y, { region: r.id })) {
        const k = h.date + '|' + h.name;
        if (!seen.has(k)) seen.set(k, { h, ids: [] });
        seen.get(k).ids.push(r.id);
      }
    }
    const list = [...seen.values()].map(({ h, ids }) => Object.freeze(ids.length === regs.length ? h : Object.assign({}, h, { regions: ids })))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.sub ? 1 : 0) - (b.sub ? 1 : 0)));
    _trhCache.set(key, Object.freeze(list));
  }
  if (!_trhCache.has(key)) {
    // The next year too: a substitute can fall back into this one (US: 1 Jan on a Saturday -> 31 Dec).
    const all = _trhWithSubs(C, _trhRaw(C, y, rk)).concat(_trhWithSubs(C, _trhRaw(C, y + 1, rk)).filter(h => h.sub));
    const lo = _trhDn(y, 1, 1), hi = _trhDn(y, 12, 31);
    const list = all.filter(h => h.n >= lo && h.n <= hi).map(h => {
      const e = { date: _trhIso(h.n), name: h.name };
      if (h.est) e.estimated = true;
      if (h.sub) e.sub = true;
      if (h.moved) e.moved = true;
      if (h.partial) e.partial = true;
      return Object.freeze(e);
    });
    if (_trhCache.size > 200) _trhCache.clear();
    _trhCache.set(key, Object.freeze(list));
  }
  return _trhCache.get(key).slice();
}
function trHolidaysBetween(cc, from, to, o) {
  const a = _trhFromIso(from), b = _trhFromIso(to);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return [];
  const y0 = Number(String(from).slice(0, 4)), y1 = Math.min(Number(String(to).slice(0, 4)), y0 + 2);
  const out = [];
  for (let y = y0; y <= y1; y++) for (const h of trHolidays(cc, y, o)) if (h.date >= from && h.date <= to) out.push(h);
  return out;
}
function trHolidayOn(cc, iso, o) {
  const s = String(iso || '').slice(0, 10);
  if (!Number.isFinite(_trhFromIso(s))) return null;
  return trHolidays(cc, Number(s.slice(0, 4)), o).find(h => h.date === s) || null;
}
function trHolidayCountries() { return Object.keys(TRH_RULES); }
function trHolidayRegions(cc) { return (_TRH_REGIONS[String(cc || '').toUpperCase()] || []).map(r => ({ id: r.id, label: r.label })); }
function trHolidayCoverage(cc, year) {
  const R = _trhRules(String(cc || '').toUpperCase());
  if (!R) return 'none';
  const y = Number(year), i = y - TRH_TABLE_FROM;
  const lunar = R.rules.some(r => /^[LT]:/.test(r.when));
  return lunar && (i < 0 || i >= TRH_TABLE.cny.split(' ').length) ? 'partial' : 'full';
}
