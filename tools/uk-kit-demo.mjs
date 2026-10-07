// The rich nature kit's demo scene (visual QA and a worked example for scene authors; it does not
// ship). A heath-and-pond composition in the style of the Yateley commons, drawn only with the
// kit (src/app/71-anim-uk-nature-kit.js) and its live light (K.live).
//   node tools/uk-kit-demo.mjs <outDir> [--season=summer|all] [--at=<ISO> | --times] [--location=lat,lon]
//        [--motion] (frames at 6.5 s, live motion; default a still) [--size=fill|lg]
// Writes demo-<season>[-<moment>].png and prints the rendered size.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAnim, sceneCss, scenePage, reviewMoments, parseArgs, DEFAULT_PLACE } from './uk-scene-lib.mjs';

/** The base toolkit the kit is built on (the same helpers as 72-anim-pack-uk-south-east.js). */
function baseToolkit() {
  let n = 0;
  const U = () => 'kd' + (++n).toString(36), R = Math.round;
  const rnd = seed => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  const stops = a => a.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`).join('');
  const st = o => Object.entries(o).map(([k, v]) => k === 'to' ? `transform-box:view-box;transform-origin:${v}` : `--${k}:${v}`).join(';');
  const mv = (cls, o, inner) => `<g class="x-${cls}"${o ? ` style="${st(o)}"` : ''}>${inner}</g>`;
  const linU = (id, a, x1, y1, x2, y2) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(a)}</linearGradient>`;
  const radU = (id, a, cx, cy, r) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops(a)}</radialGradient>`;
  const puffs = (x, y, k, col, size, dx, dur, dy, sc) => { let o = ''; for (let i = 0; i < k; i++) o += `<circle class="x-ukpuff" style="--ad:${dur || 3.6}s;--d:-${((dur || 3.6) * i / k).toFixed(2)}s;--dx:${dx || -120}px${dy ? `;--dy:${dy}px` : ''}${sc ? `;--sc:${sc}` : ''}" cx="${x}" cy="${y}" r="${R((size || 30) * (0.8 + (i % 3) * 0.15))}" fill="${col}"/>`; return o; };
  return { U, R, rnd, mv, linU, radU, puffs };
}

/** The demo scene's markup (an .anim-scene span like animItemHtml's), for a season and an optional live sky. */
export function demoSceneHtml(Rt, { season = 'summer', sky = null, size = 'fill', reduced = false } = {}) {
  const T = baseToolkit(), K = Rt.ukNatureKit(T), { U, R, rnd } = T;
  const svg = K.scene({ size }, () => {
    const L = K.live({ sky }, { heading: 205, fov: 78, horizon: 500, season, at: 'afternoon' });
    const p = K.pal(season), win = season === 'winter', aut = season === 'autumn', spr = season === 'spring', sum = season === 'summer';
    let s = K.liveSky(L, { stars: 200 });
    s += K.cirrus({ seed: 3, n: 4, y0: 40, y1: 170, col: L.cloud[2], op: .45 });
    s += K.liveClouds(L, { seed: 5, n: 3, y0: 110, y1: 230, s: [.5, .8], dur: [140, 200] });
    s += K.liveClouds(L, { seed: 9, n: 3, y0: 190, y1: 330, s: [.9, 1.4], dur: [90, 130] });
    // the land, graded for the live light by K.tone (the sky above is already in its real colours)
    let g = '';
    // far woods (hazy), then the wood behind the pool, kept as a group so the water can mirror it
    g += K.woods({ seed: 21, y: 500, h: [46, 74], mix: { pine: .5, birch: .3, oak: .2 }, season, haze: .58, sway: 0 });
    const wood = U();
    g += `<g id="${wood}">` + K.woods({ seed: 22, y: 560, h: [120, 190], mix: { pine: .35, birch: .4, oak: .25 }, season, haze: .22, snow: win }) + '</g>';
    // the land: heath rising to the right, the pool's basin on the left
    g += K.land({ d: 'M-160 552Q300 546 700 556T1760 540V900H-160z', top: K.mix(p.grass[1], L.haze, .25), bottom: p.ground[0], y0: 540, y1: 900, seed: 4, speckle: 220 });
    g += K.heathCarpet({ seed: 31, x0: 640, x1: 1760, y0: 562, y1: 880, rows: 16, lobe: [14, 96], season, haze: .1 });
    g += K.turf({ seed: 32, x0: -160, x1: 760, y0: 742, y1: 900, rows: 9, lobe: [20, 80], season });
    // the pool
    const clip = U(), pond = 'M-160 600Q60 572 380 580Q620 590 720 622Q760 660 640 704Q420 760 120 748Q-60 742-160 730z';
    g += K.water({ d: pond, y0: 576, y1: 760, cols: L.water(), clip, reflect: [{ id: wood, y: 562, op: .42 }], keepSky: true, lines: 60, shimmer: 40, glints: L.sun.show ? 10 : 0, gx0: L.sun.x - 160, gx1: L.sun.x + 160, sky: L.low });
    g += K.lightPath(L, { y0: 584, y1: 750, w: 50, clip });
    g += K.lilies({ seed: 6, x0: 120, x1: 520, y0: 660, y1: 735, n: 16, season, flowers: .4 });
    g += K.ripples(470, 640, { rx: 30, ry: 6, n: 3, dur: 5 }) + K.fish(250, 690, .8, { dur: 11 }) + K.fish(560, 655, .6, { dur: 14, d: 6 });
    g += K.reeds({ seed: 7, x0: -160, x1: 160, y0: 600, y1: 640, n: 16, season, k0: .6, k1: .9 }) + K.reeds({ seed: 8, x0: 600, x1: 780, y0: 620, y1: 700, n: 12, season });
    g += K.duck('mallard', 300, 636, .7, { dx: 160, dur: 34 }) + K.duck('female', 340, 648, .7, { dx: 150, dur: 38, d: 4 }) + K.duck('swan', 120, 700, .9, { dx: 220, dur: 60, flip: true }) + K.duck('coot', 520, 612, .55, { dx: -90, dur: 26 });
    g += K.heron(690, 690, .62, { flip: true });
    // gorse and feature trees on the heath, the sandy track winding up it
    g += K.track({ seed: 12, pts: [[1180, 566, 26], [1110, 610, 50], [1170, 680, 90], [1080, 780, 150], [1140, 940, 230]], season, stones: 50, roots: 5, puddles: win || aut ? 2 : 0, sky: L.low });
    g += K.gorse(880, 640, .8, { season, seed: 3 }) + K.gorse(1440, 610, .62, { season, seed: 4 }) + K.gorse(1530, 700, 1, { season, seed: 5, flip: true });
    g += K.tree('pine', 900, 600, .95, { season, seed: 41, flutter: 0 }) + K.tree('birch', 1340, 640, 1.05, { season, seed: 42, flutter: 10, fall: aut ? 12 : 0, ground: 760 }) + K.tree('birch', 1460, 650, .8, { season, seed: 43, flutter: 6, fall: aut ? 6 : 0, ground: 760 });
    g += K.walker(1120, 700, .9, { dog: true, dx: -40, dy: -70, dur: 50, seed: 3 }) + K.jogger(1190, 610, .55, { dx: -30, dy: -30, dur: 30, seed: 9 });
    g += K.deer(1560, 600, .55, { season, flip: true }) + K.rabbit(980, 740, .9, { dx: 60, dur: 16 }) + K.squirrel(1352, 640, .9) + K.robin(1240, 812, 1);
    // the near heath, bracken, grass and flowers swaying in gusts
    g += K.bracken({ seed: 51, x0: 760, x1: 1000, y0: 700, y1: 820, n: 14, season });
    g += K.heath({ seed: 52, x0: 760, x1: 1760, y0: 730, y1: 900, n: 70, season });
    g += K.wind(K.blades({ seed: 53, x0: -160, x1: 820, y0: 770, y1: 930, n: 60, h: 70, season, heads: sum || aut ? .25 : 0 }).concat(K.blooms({ seed: 54, x0: -100, x1: 760, y0: 790, y1: 900, n: 36, kinds: spr ? ['celandine', 'daisy', 'bluebell'] : sum ? ['harebell', 'daisy', 'knapweed', 'buttercup'] : aut ? ['ragwort', 'harebell'] : ['daisy'] })), { strips: 8 });
    const day = L.dark < .5, dusk = L.dark > .3;   // butterflies, bees and dragonflies by day; bats at dusk and night
    if (day && !win) g += K.butterfly(820, 760, 1, { kind: spr ? 'brimstone' : 'peacock', dx: 220, dy: 60 }) + K.butterfly(420, 800, .9, { kind: 'blue', dx: 180 }) + K.bee(1500, 780, 1.2) + K.dragonfly(520, 640, 1, { dx: 160 }) + K.dragonfly(260, 610, .8, { col: '#c0302a', dx: -120 });
    if (dusk) g += K.bats({ seed: 3, n: 4, x: 1000, y: 300, spread: 260 }) + K.owl(1334, 470, .9);
    if (day) g += K.flock({ seed: 2, n: 5, x: -100, y: 200, s: 1.1, dx: 1700, dy: -60, dur: 40 }) + K.flock({ seed: 4, n: 7, x: 1700, y: 140, s: 1.3, dx: -1900, dy: 40, dur: 55, v: true, col: '#3a3a40' });
    if (aut) g += K.falling({ seed: 61, n: 22, x0: -100, x1: 1700, y0: -20, y1: 500, dy: 520, dx: 160, cols: p.leaf.birch.concat(p.leaf.oak) });
    if (spr) g += K.petals({ seed: 62, n: 20, x0: 0, x1: 1600, y0: 100, y1: 500 });
    if (sum) g += K.motes({ seed: 63, n: 18, x0: 200, x1: 1400, y0: 520, y1: 820 });
    if (win) g += K.snow({ n: 36 });
    if (L.alt > -3 && L.alt < 12 && L.morning) g += K.mist({ y: 590, h: 90, n: 5, op: .6 });
    return s + K.tone(L, g) + K.weather(L) + K.grade(L);
  });
  const cls = ['anim-scene', 'ap-art', 'c-green', 'sz-' + size, 'ap-opening', 'ap-full', reduced ? 'ap-still' : 'is-live'];
  return `<span class="${cls.join(' ')}" aria-hidden="true"><svg class="as ap-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${svg}</svg></span>`;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const { launchChrome } = await import('./release-chrome.mjs');
  const { flags, pos } = parseArgs(process.argv.slice(2));
  const out = resolve(pos[0] || 'C:/tmp/uk-kit-demo');
  mkdirSync(out, { recursive: true });
  const Rt = loadAnim(), css = sceneCss(Rt.animPack('uk-south-east'));
  const coords = flags.location ? String(flags.location).split(',').map(Number) : [DEFAULT_PLACE.lat, DEFAULT_PLACE.lon], zone = flags.zone || DEFAULT_PLACE.zone;
  const seasons = flags.season === 'all' ? ['spring', 'summer', 'autumn', 'winter'] : [flags.season || 'summer'];
  const chrome = await launchChrome();
  try {
    for (const season of seasons) {
      const moments = flags.times ? reviewMoments(Rt, season, coords[0], coords[1]) : flags.at ? [{ name: 'at', ms: Date.parse(flags.at) }] : [{ name: '', ms: null }];
      for (const m of moments) {
        const sky = m.ms != null ? Rt.almSceneLight(m.ms, coords[0], coords[1], zone) : null;
        const html = demoSceneHtml(Rt, { season, sky, size: flags.size || 'fill', reduced: !flags.motion });
        const file = `demo-${season}${m.name ? '-' + m.name : ''}.png`;
        writeFileSync(`${out}/${file}`, await chrome.screenshot({ html: scenePage(html, css, { pauseAt: flags.motion ? 6500 : null }), width: 1600, height: 900, transparent: false }));
        console.log(`${file}: ${Math.round(html.length / 1024)} KB${sky ? ` (${sky.tod}, sun ${Math.round(sky.altitude)} deg, moon ${Math.round(sky.moonPos.illum * 100)}%)` : ''}`);
      }
    }
  } finally { await chrome.close(); }
}
