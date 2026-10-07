/* ============================================================
   ANIMATION ALMANAC (v2.2 wave 2). PURE classic script: no DOM, no page
   globals, no network. The date rules and the sky maths the seasons and sky
   packs (72-anim-pack-seasons.js, 72-anim-pack-sky.js) use in their item
   when(day, ctx) rules, and the page uses for the living sky (78-anim-wire.js).
   Everything is offline: festivals that move come from a small table for
   2025-2031 (moon-sighted dates can differ by a day locally); Easter is
   computed; the sun and the moon use the standard low-precision formulas
   (sunrise / sunset within a few minutes, the moon's phase within a day).

     almDay(y, m, d)                 'YYYY-MM-DD'
     almAddDays(day, n)              'YYYY-MM-DD'
     almEaster(y)                    Western Easter Sunday
     almFestivals(day, ctx)          ['christmas', 'diwali', ...] on that day
         ctx: {birthday: 'MM-DD'|'YYYY-MM-DD', tz, firstSnow: 'YYYY-MM-DD'}
     almIsFestival(id, day, ctx)     one of them
     almSeasonMark(day)              'spring-equinox'|'summer-solstice'|'autumn-equinox'|'winter-solstice'|null (UTC day)
     almClocksChange(day, tz)        'forward'|'back'|null (any zone; EU rule without one)
     almSunTimes(day, lat, lon)      {rise, set} UTC ms (null when the sun never rises / sets), polar
     almSkyMoment(ms, lat, lon)      'sunrise'|'day'|'sunset'|'night'
     almMoonPhase(ms)                {age (days), frac (0 new, 0.5 full), index 0-7, name}
     almMeteorShower(day)            {id, name} on a shower's peak night (or null)
     almAuroraNights(year, lat)      at most four seeded nights a year, only far enough north (or south)
     almSunPosition(ms, lat, lon)    {alt, az} degrees (az from north, clockwise)
     almMoonPosition(ms, lat, lon)   {alt, az, illum 0..1, frac (phase), limb}: limb is the bright
                                     limb's direction (deg clockwise from up) for a viewer facing the moon
     almSceneLight(ms, lat, lon, tz) the live-scene snapshot (tod, altitude, azimuth, moonPos, ms, lat, lon, tz ...)
   ============================================================ */
const ALM_DAY_MS = 86400000;
function almDay(y, m, d) { return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
function _almParts(day) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(day || '')); return m ? [+m[1], +m[2], +m[3]] : null; }
function _almUtc(day) { const p = _almParts(day); return p ? Date.UTC(p[0], p[1] - 1, p[2]) : NaN; }
function almAddDays(day, n) { const t = new Date(_almUtc(day) + n * ALM_DAY_MS); return almDay(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }

/** Western (Gregorian) Easter Sunday: the anonymous Gregorian algorithm. */
function almEaster(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return almDay(y, month, day);
}

/* Festivals that follow the moon: a compact table (the usual UK dates; a moon-sighted Eid may be a day either side). */
const ALM_MOVING = Object.freeze({
  'lunar-new-year': ['2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03', '2031-01-23'],
  diwali: ['2025-10-20', '2026-11-08', '2027-10-29', '2028-10-17', '2029-11-05', '2030-10-26', '2031-11-14'],
  'eid-al-fitr': ['2025-03-30', '2026-03-20', '2027-03-10', '2028-02-27', '2029-02-14', '2030-02-04', '2031-01-24'],
  'eid-al-adha': ['2025-06-06', '2026-05-27', '2027-05-16', '2028-05-05', '2029-04-24', '2030-04-13', '2031-04-02'],
});

/* ---------- the sun ---------- */
const _ALM_RAD = Math.PI / 180;
/** The sun's apparent ecliptic longitude (degrees) and declination (radians) at a Julian day number. */
function _almSun(jd) {
  const n = jd - 2451545.0;
  const M = ((357.5291 + 0.98560028 * n) % 360 + 360) % 360;
  const C = 1.9148 * Math.sin(M * _ALM_RAD) + 0.02 * Math.sin(2 * M * _ALM_RAD) + 0.0003 * Math.sin(3 * M * _ALM_RAD);
  const lambda = ((M + C + 180 + 102.9372) % 360 + 360) % 360;
  return { M, lambda, dec: Math.asin(Math.sin(lambda * _ALM_RAD) * Math.sin(23.4397 * _ALM_RAD)) };
}
/** The sun's apparent longitude (degrees), Meeus's low-precision series (good to about 0.01 deg). */
function _almSunLon(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T, M = (357.52911 + 35999.05029 * T) * _ALM_RAD;
  const C = (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  const lon = L0 + C - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * T) * _ALM_RAD);
  return ((lon % 360) + 360) % 360;
}
function _almJd(ms) { return ms / ALM_DAY_MS + 2440587.5; }
function _almMs(jd) { return (jd - 2440587.5) * ALM_DAY_MS; }

/** Sunrise and sunset (UTC ms) for a date at a place: the sunrise equation (refraction and the sun's disc: -0.833 deg). */
function almSunTimes(day, lat, lon) {
  const t = _almUtc(day);
  if (!isFinite(t) || !isFinite(+lat) || !isFinite(+lon)) return { rise: null, set: null, polar: null };
  const n = Math.round(_almJd(t + ALM_DAY_MS / 2) - 2451545.0 + 0.0008);
  const Jstar = n - lon / 360;
  const s = _almSun(2451545.0 + Jstar);
  const transit = 2451545.0 + Jstar + 0.0053 * Math.sin(s.M * _ALM_RAD) - 0.0069 * Math.sin(2 * s.lambda * _ALM_RAD);
  const phi = lat * _ALM_RAD;
  const cosW = (Math.sin(-0.833 * _ALM_RAD) - Math.sin(phi) * Math.sin(s.dec)) / (Math.cos(phi) * Math.cos(s.dec));
  if (cosW < -1) return { rise: null, set: null, polar: 'day' };
  if (cosW > 1) return { rise: null, set: null, polar: 'night' };
  const w = Math.acos(cosW) / _ALM_RAD / 360;
  return { rise: Math.round(_almMs(transit - w)), set: Math.round(_almMs(transit + w)), polar: null };
}
/** The moment of the day at a place: about 40 minutes either side of sunrise / sunset count as those. */
function almSkyMoment(ms, lat, lon) {
  const d = new Date(ms + (isFinite(+lon) ? lon / 15 * 3600000 : 0));       // the place's solar date
  const st = almSunTimes(almDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()), lat, lon);
  if (st.polar) return st.polar;
  if (st.rise == null) return 'day';
  const W = 40 * 60000;
  if (Math.abs(ms - st.rise) <= W) return 'sunrise';
  if (Math.abs(ms - st.set) <= W) return 'sunset';
  return ms > st.rise && ms < st.set ? 'day' : 'night';
}
/** The equinox or solstice whose moment falls on this UTC day (the sun's longitude crosses 0/90/180/270). */
function almSeasonMark(day) {
  const t = _almUtc(day);
  if (!isFinite(t)) return null;
  const a = _almSunLon(_almJd(t)), b = _almSunLon(_almJd(t + ALM_DAY_MS));
  const marks = [[0, 'spring-equinox'], [90, 'summer-solstice'], [180, 'autumn-equinox'], [270, 'winter-solstice']];
  for (const [deg, id] of marks) {
    const x = ((a - deg) % 360 + 360) % 360, y = ((b - deg) % 360 + 360) % 360;
    if (x > 350 && y < 10) return id;
  }
  return null;
}

/* ---------- the clocks ---------- */
function _almOffsetMin(ms, tz) {
  try {
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'longOffset' });
    const p = f.formatToParts(new Date(ms)).find(x => x.type === 'timeZoneName');
    const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(p ? p.value : '');
    return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +(m[3] || 0)) : 0;
  } catch (e) { return null; }
}
function _almLastSunday(y, month) { const last = new Date(Date.UTC(y, month, 0)); return almDay(y, month, last.getUTCDate() - last.getUTCDay()); }
/** 'forward' / 'back' on the day the clocks change in that zone; without a zone, the EU rule. */
function almClocksChange(day, tz) {
  const t = _almUtc(day);
  if (!isFinite(t)) return null;
  if (tz) {
    const a = _almOffsetMin(t - 12 * 3600000, tz), b = _almOffsetMin(t + 36 * 3600000, tz);
    if (a == null || b == null) return null;
    // The zone's own midnight-to-midnight: the offset at the start and the end of that local day.
    const s = _almOffsetMin(t - a * 60000 + 60000, tz), e = _almOffsetMin(t + ALM_DAY_MS - b * 60000 - 60000, tz);
    if (s == null || e == null || s === e) return null;
    return e > s ? 'forward' : 'back';
  }
  const y = _almParts(day)[0];
  return day === _almLastSunday(y, 3) ? 'forward' : day === _almLastSunday(y, 10) ? 'back' : null;
}

/* ---------- the calendar ---------- */
function _almBirthday(day, b) {
  const m = /^(?:\d{4}-)?(\d{2})-(\d{2})$/.exec(String(b || ''));
  if (!m) return false;
  const p = _almParts(day);
  if (!p) return false;
  const leap = (p[0] % 4 === 0 && p[0] % 100 !== 0) || p[0] % 400 === 0;
  if (m[1] === '02' && m[2] === '29' && !leap) return p[1] === 2 && p[2] === 28;
  return p[1] === +m[1] && p[2] === +m[2];
}
/** Every festival and special day on a date. */
function almFestivals(day, ctx) {
  ctx = ctx || {};
  const p = _almParts(day);
  if (!p) return [];
  const y = p[0], md = day.slice(5, 10), out = [];
  if (md === '12-24') out.push('christmas-eve');
  if (md === '12-25' || md === '12-24' || md === '12-26') out.push('christmas');
  if (md === '12-31' || md === '01-01') out.push('new-year');
  if (md === '02-14') out.push('valentines');
  if (md === '10-31') out.push('halloween');
  if (md === '11-05') out.push('bonfire-night');
  const easter = almEaster(y);
  if (day === easter || day === almAddDays(easter, -2) || day === almAddDays(easter, 1)) out.push('easter');
  if (day === almAddDays(easter, -47)) out.push('pancake-day');
  for (const [id, days] of Object.entries(ALM_MOVING)) if (days.includes(day)) out.push(id.startsWith('eid') ? 'eid' : id);
  const mark = almSeasonMark(day);
  if (mark) out.push(mark.endsWith('solstice') ? 'solstice' : 'equinox', mark);
  if (almClocksChange(day, ctx.tz)) out.push('clocks-change', 'clocks-' + almClocksChange(day, ctx.tz));
  if (ctx.firstSnow && ctx.firstSnow === day) out.push('first-snow');
  if (ctx.birthday && _almBirthday(day, ctx.birthday)) out.push('birthday');
  return [...new Set(out)];
}
function almIsFestival(id, day, ctx) { return almFestivals(day, ctx).includes(id); }

/* ---------- the moon ---------- */
const ALM_SYNODIC = 29.530588853;
const ALM_MOON_NAMES = Object.freeze(['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent']);
/** The moon's phase from the mean lunation (reference new moon 2000-01-06 18:14 UTC). */
function almMoonPhase(ms) {
  const age = (((_almJd(ms) - 2451550.26) % ALM_SYNODIC) + ALM_SYNODIC) % ALM_SYNODIC;
  const frac = age / ALM_SYNODIC;
  const index = Math.floor(frac * 8 + 0.5) % 8;
  return { age, frac, index, name: ALM_MOON_NAMES[index] };
}

/* ---------- rare skies ---------- */
const ALM_SHOWERS = Object.freeze([
  { id: 'quadrantids', name: 'Quadrantids', days: ['01-03', '01-04'] },
  { id: 'lyrids', name: 'Lyrids', days: ['04-22'] },
  { id: 'eta-aquariids', name: 'Eta Aquariids', days: ['05-06'] },
  { id: 'perseids', name: 'Perseids', days: ['08-12', '08-13'] },
  { id: 'orionids', name: 'Orionids', days: ['10-21'] },
  { id: 'leonids', name: 'Leonids', days: ['11-17'] },
  { id: 'geminids', name: 'Geminids', days: ['12-13', '12-14'] },
]);
function almMeteorShower(day) { const md = String(day || '').slice(5, 10); return ALM_SHOWERS.find(s => s.days.includes(md)) || null; }
function _almHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** A few seeded aurora nights a year (dark months only), and only at 50 degrees or more from the equator. */
function almAuroraNights(year, lat) {
  const a = Math.abs(+lat);
  if (!isFinite(a) || a < 50) return [];
  const n = a >= 58 ? 4 : a >= 54 ? 3 : 2;
  const south = +lat < 0;
  const months = south ? [4, 5, 6, 7, 8, 9] : [1, 2, 3, 9, 10, 11, 12];
  const out = new Set();
  for (let i = 0; out.size < n && i < 40; i++) {
    const h = _almHash(`${year}|aurora|${i}|${south ? 's' : 'n'}`);
    const m = months[h % months.length], d = 1 + ((h >>> 8) % 28);
    out.add(almDay(year, m, d));
  }
  return [...out].sort();
}


/** Pure illustrated lighting from the local date, sunrise equation and declination.
 * Sun elevation uses the standard latitude/declination/hour-angle equation:
 * https://gml.noaa.gov/grad/solcalc/solareqns.PDF . The screen arc is artistic,
 * not a compass bearing. Lunar phase uses the existing mean-lunation model.
 */
function almSceneLight(ms, lat, lon, tz) {
  if (!Number.isFinite(ms) || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) return null;
  let day;
  try { const p=new Intl.DateTimeFormat('en-CA',{timeZone:tz||'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ms));const get=k=>p.find(x=>x.type===k).value;day=`${get('year')}-${get('month')}-${get('day')}`; }
  catch(e){return null;}
  // Select the solar cycle nearest local noon, also across the date line.
  let times=almSunTimes(day,lat,lon);
  if(times.rise!=null){const cycles=[-1,0,1].map(d=>almSunTimes(almAddDays(day,d),lat,lon));times=cycles.reduce((a,b)=>Math.abs(ms-(a.rise+a.set)/2)<Math.abs(ms-(b.rise+b.set)/2)?a:b);}
  const noon=times.rise==null?_almUtc(day)+12*3600000-lon/15*3600000:(times.rise+times.set)/2;
  const hour=(ms-noon)/3600000*15*_ALM_RAD,phi=lat*_ALM_RAD,dec=_almSun(_almJd(ms)).dec;
  const altitude=Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(hour))/_ALM_RAD;
  const progress=times.rise==null?((ms-noon)/ALM_DAY_MS+.5):Math.max(0,Math.min(1,(ms-times.rise)/(times.set-times.rise)));
  const tod=altitude < -6?'night':altitude < 7?(ms<noon?'dawn':'dusk'):'day';
  const grade=tod==='night'?.66:tod==='day'?0:.16+Math.max(0,-altitude)*.025;
  // ms / lat / lon / tz, the sun's azimuth and the moon's place let a live scene (the UK nature kit's
  // K.live) put the sun and moon where they really stand in its view, with the real phase and tilt.
  return {day,tod,altitude,progress,x:Math.round(240+1120*progress),y:Math.round(480-Math.max(0,altitude)*5.2),sun:altitude>=-.833,grade,moon:almMoonPhase(ms),...times,
    ms,lat,lon,tz:tz||'UTC',azimuth:almSunPosition(ms,lat,lon).az,moonPos:almMoonPosition(ms,lat,lon)};
}

/* ---------- where the sun and moon stand (live scenes) ---------- */
// Low-precision positions (the sun to about 0.1 deg, the moon to about 1 deg: plenty for art).
// Formulas: NOAA / Meeus via the widely used "suncalc" set (sidereal time 280.16 + 360.9856235 d).
const _ALM_OBL = 23.4397 * _ALM_RAD;
function _almEquatorial(l, b) {
  return { ra: Math.atan2(Math.sin(l) * Math.cos(_ALM_OBL) - Math.tan(b) * Math.sin(_ALM_OBL), Math.cos(l)),
    dec: Math.asin(Math.sin(b) * Math.cos(_ALM_OBL) + Math.cos(b) * Math.sin(_ALM_OBL) * Math.sin(l)) };
}
/** Altitude and azimuth (degrees; azimuth from north, clockwise) of a body at right ascension / declination. */
function _almHorizontal(ms, lat, lon, eq) {
  const d = _almJd(ms) - 2451545.0, H = (280.16 + 360.9856235 * d + lon) * _ALM_RAD - eq.ra, phi = lat * _ALM_RAD;
  const alt = Math.asin(Math.sin(phi) * Math.sin(eq.dec) + Math.cos(phi) * Math.cos(eq.dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(eq.dec) * Math.cos(phi));
  return { alt: alt / _ALM_RAD, az: ((az / _ALM_RAD + 180) % 360 + 360) % 360 };
}
/** Where the sun stands: {alt, az} in degrees (az from north, clockwise). */
function almSunPosition(ms, lat, lon) {
  if (!Number.isFinite(ms) || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const s = _almSun(_almJd(ms));
  return _almHorizontal(ms, lat, lon, _almEquatorial(s.lambda * _ALM_RAD, 0));
}
/**
 * Where the moon stands, how much of it is lit and which way its bright limb faces:
 * {alt, az, illum (0..1), frac (phase, as almMoonPhase), waxing, limb (degrees clockwise from
 * straight up, for a viewer facing the moon: the bright limb points along the sky toward the sun)}.
 */
function almMoonPosition(ms, lat, lon) {
  if (!Number.isFinite(ms) || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const d = _almJd(ms) - 2451545.0;
  const L = (218.316 + 13.176396 * d) * _ALM_RAD, M = (134.963 + 13.064993 * d) * _ALM_RAD, F = (93.272 + 13.22935 * d) * _ALM_RAD;
  const m = _almHorizontal(ms, lat, lon, _almEquatorial(L + 6.289 * _ALM_RAD * Math.sin(M), 5.128 * _ALM_RAD * Math.sin(F)));
  const s = almSunPosition(ms, lat, lon), a1 = m.alt * _ALM_RAD, a2 = s.alt * _ALM_RAD, dz = (s.az - m.az) * _ALM_RAD;
  // the great-circle bearing from the moon to the sun in the local sky (up = towards the zenith, right = increasing azimuth)
  const limb = Math.atan2(Math.sin(dz) * Math.cos(a2), Math.cos(a1) * Math.sin(a2) - Math.sin(a1) * Math.cos(a2) * Math.cos(dz)) / _ALM_RAD;
  const elong = Math.acos(Math.max(-1, Math.min(1, Math.sin(a1) * Math.sin(a2) + Math.cos(a1) * Math.cos(a2) * Math.cos(dz))));
  const ph = almMoonPhase(ms);
  return { alt: m.alt, az: m.az, illum: (1 - Math.cos(elong)) / 2, frac: ph.frac, waxing: ph.frac < .5, limb: Math.round(limb * 10) / 10 };
}
/** The illuminated moon silhouette (right = waxing, left = waning). */
function almMoonDiscPath(frac,r) {
  const f=((frac%1)+1)%1,cos=Math.cos(f*2*Math.PI),rx=Math.max(.001,Math.abs(cos)*r),wax=f<.5;
  return `M0 ${-r}A${r} ${r} 0 0 ${wax?1:0} 0 ${r}A${rx.toFixed(2)} ${r} 0 0 ${wax?(cos>=0?0:1):(cos>=0?1:0)} 0 ${-r}Z`;
}
