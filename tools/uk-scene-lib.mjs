// Shared by the UK scene review tools (review-uk-pack.mjs, perf-uk-scene.mjs, uk-kit-demo.mjs):
// loads the animation sources the way the build orders them, builds a full-screen review page,
// and works out the review moments (dawn, noon, sunset, night, full-moon and new-moon nights)
// for a scene's season at a place. Visual QA only; nothing here ships in the app.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { animRegistryFiles } from './lib/anim-sources.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const app = join(root, 'src', 'app');
/** Yateley (the default place for live-sky reviews), in this computer's zone (only the calendar date depends on it). */
export const DEFAULT_PLACE = { lat: 51.34, lon: -0.83, zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };

/** The animation sources in build order, evaluated once: the region framework, the registry, the almanac, the nature kit and every pack. */
export function loadAnim() {
  const files = animRegistryFiles(app);   // one list sorted as build.mjs sorts it (tools/lib/anim-sources.mjs)
  // eslint-disable-next-line no-new-func
  return new Function(files.map(f => readFileSync(join(app, f), 'utf8')).join('\n;\n') +
    '\nreturn {animPack,animItem,animItemHtml,animItemMaxBytes,almSceneLight,almSunTimes,almMoonPhase,almMoonPosition,almSunPosition,ukNatureKit};')();
}

/** The scene stylesheets plus a pack's css. */
export function sceneCss(pack) {
  return ['00-tokens.css', '01-components.css', '78-delight.css', '71-anim-registry.css', '71-anim-library.css', '71-anim-moments.css', '76-scenes.css']
    .map(f => readFileSync(join(root, 'src', 'styles', f), 'utf8')).join('\n') + '\n' + (pack ? pack.css : '');
}

/** A full-screen review page around rendered scene markup. pauseAt: freeze every animation at that time (ms). */
export function scenePage(body, css, { dark = false, pauseAt = null } = {}) {
  return `<!doctype html><html data-theme="${dark ? 'dark' : 'light'}"><head><meta charset="utf-8"><style>${css}
    html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#233d46;--ap-speed:1;--ap-ease:ease-in-out}
    .anim-scene.ap-full{position:absolute;inset:0;width:100%;height:100%;border-radius:0;background:none;--as-size:100%;filter:none}
    .anim-scene.ap-full svg{width:100%;height:100%;filter:none}
    .anim-scene:not(.ap-full){position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);--as-size:420px;width:420px;height:420px}
    </style></head><body>${body}${pauseAt != null ? `<script>for(const a of document.getAnimations()){a.pause();a.currentTime=${Number(pauseAt)}}</script>` : ''}</body></html>`;
}

const SEASON_DATE = { spring: '2027-04-22', summer: '2026-07-08', autumn: '2026-10-14', winter: '2027-01-20' };
/**
 * The review moments for a season at a place: dawn (just after sunrise), noon (solar noon),
 * sunset (the sun on the horizon), night (solar midnight), and the nearest full-moon and
 * new-moon nights (at the moon's highest in that night; the new moon at solar midnight).
 * Returns [{name, ms, iso}].
 */
export function reviewMoments(R, season, lat = DEFAULT_PLACE.lat, lon = DEFAULT_PLACE.lon) {
  const day = SEASON_DATE[season] || SEASON_DATE.summer, H = 3600000, M = 60000;
  const st = R.almSunTimes(day, lat, lon);
  const night = (d) => { const a = R.almSunTimes(d, lat, lon), b = R.almSunTimes(addDays(d, 1), lat, lon); return { from: a.set, to: b.rise, mid: (a.set + b.rise) / 2 }; };
  const nearest = (target) => {   // the date within 16 days whose midnight phase is closest to target (0 new, .5 full)
    let best = null;
    for (let k = -16; k <= 16; k++) { const d = addDays(day, k), n = night(d), f = R.almMoonPhase(n.mid).frac, dist = Math.min(Math.abs(f - target), 1 - Math.abs(f - target)); if (!best || dist < best.dist) best = { d, n, dist }; }
    return best;
  };
  const full = nearest(.5), nw = nearest(0);
  let fullMs = full.n.mid, top = -99;
  for (let t = full.n.from + H; t < full.n.to - H; t += 10 * M) { const a = R.almMoonPosition(t, lat, lon).alt; if (a > top) { top = a; fullMs = t; } }
  const out = [['dawn', st.rise + 8 * M], ['noon', (st.rise + st.set) / 2], ['sunset', st.set - 4 * M], ['dusk', st.set + 35 * M], ['night', night(day).mid], ['fullmoon', fullMs], ['newmoon', nw.n.mid]];
  return out.map(([name, ms]) => ({ name, ms: Math.round(ms), iso: new Date(Math.round(ms)).toISOString() }));
}
function addDays(day, n) { const t = new Date(Date.parse(day + 'T00:00Z') + n * 86400000); return t.toISOString().slice(0, 10); }

/** Flags as --name=value (or --name: true) and the positional arguments, in order. */
export function parseArgs(argv) {
  const flags = {}, pos = [];
  for (const a of argv) { if (a.startsWith('--')) { const i = a.indexOf('='); if (i < 0) flags[a.slice(2)] = true; else flags[a.slice(2, i)] = a.slice(i + 1); } else pos.push(a); }
  return { flags, pos };
}
