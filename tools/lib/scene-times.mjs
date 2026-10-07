// The real moments of a day at a place, for `scene sheet --times`, `--compare` and `--seasons` (docs/dev/SCENE_ENGINE.md section 10).
// Node >= 20, no dependencies. The sun comes from the app's own almanac (src/app/71-anim-almanac.js, almSunPosition), so a sheet shows
// the sky the app would draw at that moment.
//
//   sceneTimesFor(lat, lon, dateISO, { sunPos }) -> { dawn, noon, golden, dusk, night }   ISO times (UTC), null when the sun never does it
//       scans the sun's altitude in 5-minute steps through the local solar day: dawn = -3 degrees rising, noon = the highest, golden =
//       6 degrees setting, dusk = -4 degrees setting, night = the lowest between noon and the next local noon
//   seasonDates(lat, year) -> [{ season, date }]   the 15th of January, April, July and October as winter, spring, summer, autumn
//       (flipped south of the equator: January is summer there)
//   MOMENTS                                         the moment names in sheet order
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const MOMENTS = Object.freeze(['dawn', 'noon', 'golden', 'dusk', 'night']);
const STEP = 5 * 60000, DAY = 86400000;

let _alm = null;
/** almSunPosition from the app's almanac, evaluated once (the file is pure: functions and consts). */
export function almanacSun(root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')) {
  if (_alm) return _alm;
  const file = join(root, 'src', 'app', '71-anim-almanac.js');
  if (!existsSync(file)) throw new Error(`no almanac at ${file}`);
  _alm = new vm.Script(`(function () {\n${readFileSync(file, 'utf8')}\nreturn almSunPosition;\n})`, { filename: '71-anim-almanac.js' }).runInThisContext()();
  return _alm;
}

export function sceneTimesFor(lat, lon, dateISO, { sunPos = almanacSun() } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('sceneTimesFor needs a latitude and a longitude');
  const day = /^\d{4}-\d{2}-\d{2}/.test(String(dateISO || '')) ? String(dateISO).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const t0 = Date.parse(day + 'T00:00:00Z') - (lon / 15) * 3600000;   // local SOLAR midnight
  const alt = (ms) => sunPos(ms, lat, lon).alt;
  const iso = (ms) => (ms == null ? null : new Date(Math.round(ms / 60000) * 60000).toISOString().replace(/\.000Z$/, 'Z'));
  const samples = [];
  for (let ms = t0; ms <= t0 + DAY + 12 * 3600000; ms += STEP) samples.push([ms, alt(ms)]);
  const inDay = samples.filter(([ms]) => ms <= t0 + DAY);
  let noon = inDay[0];
  for (const s of inDay) if (s[1] > noon[1]) noon = s;
  const cross = (level, rising, from, to) => {
    for (let i = 1; i < samples.length; i++) {
      const [m0, a0] = samples[i - 1], [m1, a1] = samples[i];
      if (m1 < from || m0 > to) continue;
      if (rising ? a0 < level && a1 >= level : a0 > level && a1 <= level) return m0 + (m1 - m0) * (level - a0) / (a1 - a0);
    }
    return null;
  };
  const dawn = cross(-3, true, t0, noon[0]);
  const golden = cross(6, false, noon[0], t0 + DAY);
  const dusk = cross(-4, false, noon[0], t0 + DAY);
  let night = null;
  for (const s of samples) if (s[0] > noon[0] && s[0] <= noon[0] + DAY / 2 && (!night || s[1] < night[1])) night = s;
  return { dawn: iso(dawn), noon: iso(noon[0]), golden: iso(golden), dusk: iso(dusk), night: iso(night && night[0]), date: day, noonAlt: Math.round(noon[1] * 10) / 10 };
}

export function seasonDates(lat, year = new Date().getUTCFullYear()) {
  const north = [['winter', '01'], ['spring', '04'], ['summer', '07'], ['autumn', '10']];
  const flip = { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' };
  return north.map(([season, mm]) => ({ season: lat < 0 ? flip[season] : season, date: `${year}-${mm}-15` }))
    .sort((a, b) => ['spring', 'summer', 'autumn', 'winter'].indexOf(a.season) - ['spring', 'summer', 'autumn', 'winter'].indexOf(b.season));
}
