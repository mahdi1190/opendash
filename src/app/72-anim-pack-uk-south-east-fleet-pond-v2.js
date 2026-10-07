// UK_SCENE_PART: uk-south-east/fleet-pond-v2
/* Fleet Pond — broad freshwater, reedbeds, woodland and viewing platforms.
     https://www.hart.gov.uk/fleet-pond   https://fleetpond.org.uk/about-fleet-pond/
   View 2 of 4 (close): one file per view, so each view's art can change without
   touching the others (the other views: 72-anim-pack-uk-south-east-fleet-pond-v1..v4.js).
   Drawn with the rich nature kit T.K (src/app/71-anim-uk-nature-kit.js). Keep every id,
   ukPlace, ukView, ukSeason and season unchanged so saved pins and the rotation keep working.

   Brief (this view): Fleet Pond is Hampshire's largest freshwater lake, a Local Nature Reserve
   and mostly SSSI (about 141 acres) run by Hart District Council with the Fleet Pond Society.
   From the raised boardwalk through the reedbed on the north-west shore we look east-south-east
   across the open water: common reed and bulrush margins, alder and willow carr, oak, birch and
   pine woodland on the far shore with Fleet's roofs behind, and the London to Southampton main
   line (1840, third-rail electric) on its embankment along the north side, trains passing.
   Great crested grebes, mute swans, Canada geese, coots, mallards and a grey heron; dragonflies
   and damselflies over the reeds in summer, a kingfisher's dash along the margin. */
function ukSouthEastFleetPondV2(T) {
  const { add, U, R, rnd, mv } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js); null only if that file is missing
  if (!K) return;
  const LAT = 51.287, LON = -0.826;   // Fleet Pond

  /* ---------- place helpers (local art) ---------- */
  /** A great crested grebe: swims, dives (fades out) and surfaces again further on. */
  const grebe = (x, y, s, season, o = {}) => {
    const breed = season === 'spring' || season === 'summer';
    const art = `<ellipse cy="2" rx="26" ry="3" fill="#0d3040" opacity=".22"/><path fill="#5d5248" d="M-24 0c-3-8 4-13 14-13l16 1c7 1 10 6 9 12z"/><path fill="#cfc6b6" d="M-18 0q12-6 30-2l3 2z"/><path fill="#f4f0e6" d="M7-10q3-14 0-25h7q3 12-1 25z"/><path fill="#3a302a" d="M12-35q3 12 1 25h2q2-13-1-25z"/><circle cx="11" cy="-37" r="5.4" fill="#f4f0e6"/><path fill="#1c1816" d="M6-40q1-9 7-10 3 5 0 9z"/>` +
      (breed ? `<path fill="#b4532a" d="M6-37q-5 5 0 10 3-2 4-6zM16-37q5 5 0 10-3-2-4-6z"/>` : '') + `<path fill="#c98a7a" d="M15-38l12 2-12 1.6z"/><circle cx="13" cy="-38" r="1.1" fill="#8a1a1a"/>`;
    const body = mv('uknbob', { ad: '3.2s', dy: '1.5px' }, art) + `<path fill="none" stroke="#f2fbf6" stroke-width="1.4" opacity=".6" d="M-26 3q-20 3-40 8M-26 4q-18 0-36-4"/>`;
    return K.at(x, y, s, mv('uknglide', { ad: (o.dur || 16) + 's', d: -(o.d || 0) + 's', dx: (o.dx || 110) + 'px', dy: '0px' }, body), o.flip);
  };
  /** A kingfisher's dash low along the reed margin (on screen for a few seconds in each minute). */
  const kingfisher = (x, y, o = {}) => `<g transform="translate(${x} ${y})">` + mv('uknglide', { ad: (o.dur || 46) + 's', d: -(o.d || 0) + 's', dx: (o.dx || 6000) + 'px', dy: '-30px' },
    mv('uknbob', { ad: '.5s', dy: '4px' }, `<path fill="#e07a2e" d="M-6 0q8 6 16 0z"/><path fill="#1f8fb8" d="M-14-2q10-8 24-2l-4 4h-16z"/><path fill="#46c0e0" d="M-12-4q6-3 14-2"/><circle cx="12" cy="-4" r="4" fill="#1f8fb8"/><path fill="#1a1a1a" d="M15-5l9 1-9 2z"/>` + mv('uknwing', { ad: '.18s' }, `<path fill="#2b9cc4" d="M-4-4l-6-10 12 6z"/>`))) + '</g>';
  /** A South Western Railway electric unit on the main line embankment (third rail: no wires). */
  const train = (L, x, y, s, o = {}) => {
    const cars = o.cars || 5, cw = 150, lit = L.windows;
    let body = '', glass = '', shine = '';
    for (let c = 0; c < cars; c++) {
      const x0 = c * (cw + 4), nose = c === cars - 1;
      body += `<path fill="#23345a" d="M${x0} -30h${cw - (nose ? 14 : 0)}${nose ? 'q14 2 14 16' : 'v14'}V-6H${x0}z"/><path fill="#d9dde2" d="M${x0} -9h${cw}v3H${x0}z"/><path fill="#c8402e" d="M${x0} -14h${cw}v3H${x0}z"/><path fill="#9aa2aa" d="M${x0 + 2} -33h${cw - 8}v3H${x0 + 2}z"/>` +
        `<path fill="#1a1c20" d="M${x0 + 16} -6h28v6h-28zM${x0 + cw - 44} -6h28v6h-28z"/>`;
      for (let w = 0; w < 8; w++) { const wx = x0 + 10 + w * 17; if (lit && (w * 7 + c * 3) % 5) glass += `M${wx} -26h11v9h-11z`; else shine += `M${wx} -26h11v9h-11z`; }
      if (nose) shine += `M${x0 + cw - 6} -27l8 1v8h-8z`;
    }
    const lamp = L.lamps ? K.keep(K.glow(cars * (cw + 4) + 4, -10, 40, '#fff4d0', .6)) : '';
    const art = body + `<path fill="${K.mix(L.low, '#1c2630', .5)}" d="${shine}"/>` + (glass ? K.keep(`<path fill="#ffd98e" d="${glass}"/>`) : '') + lamp;
    return `<g transform="translate(${R(x)} ${R(y)}) scale(${s} ${Math.abs(s)})">` + mv('uknglide', { ad: (o.dur || 64) + 's', d: -(o.d || 0) + 's', dx: (o.dx || 9000) + 'px', dy: '0px' }, art) + '</g>';
  };
  /** Fleet's roofs glimpsed through the far-shore trees, windows lit from real dusk. */
  const roofs = (L, seed, list) => {
    const r = rnd(seed); let out = '';
    for (const [x, y, w] of list) {
      const h = w * .42, roof = ['#7a4c3c', '#6a5048', '#84574a'][Math.floor(r() * 3)];
      out += `<path fill="#c9bba4" d="M${x} ${y}v-${R(h)}h${w}v${R(h)}z"/><path fill="${roof}" d="M${x - 3} ${R(y - h)}l${R(w * .5 + 3)} -${R(h * .7)} ${R(w * .5 + 3)} ${R(h * .7)}z"/><path fill="#6a5a50" d="M${R(x + w * .7)} ${R(y - h * 1.5)}h4v-7h-4z"/>`;
      out += K.window(L, x + w * .15, y - h * .8, w * .2, h * .35, { on: .6, bars: false }) + K.window(L, x + w * .6, y - h * .8, w * .2, h * .35, { on: .5, bars: false });
    }
    return out;
  };
  /** The raised boardwalk through the reedbed: planks, posts and a low handrail, in perspective. */
  const boardwalk = (season) => {
    const top = season === 'winter' ? '#a39a88' : '#9c8566', side = '#5e4a36', p = [[110, 650, 20], [180, 690, 34], [300, 760, 60], [430, 830, 92], [540, 900, 132], [600, 960, 160]];
    let L = '', Rr = '';
    for (const [x, y, w] of p) { L += `${L ? 'L' : 'M'}${x - w} ${y}`; Rr = `L${x + w} ${y}` + Rr; }
    let planks = '', posts = '', rail = 'M', rail2 = 'M';
    for (let i = 0; i < 46; i++) {
      const t = i / 45, seg = Math.min(p.length - 2, Math.floor(t * (p.length - 1))), u = t * (p.length - 1) - seg, a = p[seg], b = p[seg + 1];
      const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u, w = a[2] + (b[2] - a[2]) * u;
      planks += `M${R(x - w)} ${R(y)}L${R(x + w)} ${R(y)}`;
      if (i % 5 === 0) { const ph = w * .55; posts += `M${R(x + w)} ${R(y + 4)}v-${R(ph)}M${R(x - w)} ${R(y + 4)}v-${R(ph)}`; rail += `${R(x + w)} ${R(y - ph)}L`; rail2 += `${R(x - w)} ${R(y - ph)}L`; }
    }
    rail = rail.replace(/L$/, ''); rail2 = rail2.replace(/L$/, '');
    return `<path fill="${side}" d="${L}${Rr}z" transform="translate(0 8)"/><path fill="${top}" d="${L}${Rr}z"/>` + K.S('#6e5a44', 1.6, planks, ' opacity=".7"') +
      K.S('#4e3c2c', 5, posts) + K.S('#7a6248', 4, rail) + K.S('#7a6248', 4, rail2) + (season === 'winter' ? K.S('#eef4f8', 2, planks, ' opacity=".35"') : '');
  };
  /** A timber viewing platform jutting into the water (Fleet Pond has several). */
  const platform = (x, y, s, season) => K.at(x, y, s, `<path fill="#5e4a36" d="M-90 0h180l-14 10h-152z"/><path fill="${season === 'winter' ? '#b0a894' : '#a28a6a'}" d="M-96-6h192l-6 6h-180z"/><path fill="none" stroke="#4e3c2c" stroke-width="4" d="M-86 10v26M86 10v26M-30 10v26M30 10v26M-92-6v-30M92-6v-30M0-6v-30"/><path fill="none" stroke="#7a6248" stroke-width="4" d="M-92-36h184M-92-22h184"/>`);
  /** Marsh flowers: yellow flag iris (spring), purple loosestrife and meadowsweet (summer). */
  const marshBits = (seed, x0, x1, y0, y1, n, season) => {
    const r = rnd(seed), out = [];
    const iris = K.sym('fp2iris', () => `<path fill="#4f7a3a" d="M-2 0l-4-46 5 2 2 44zM2 0l8-40-1 40z"/><path stroke="#5f8a3a" stroke-width="1.6" d="M0 0v-52"/><path fill="#f2cc22" d="M0-52q-12 2-12 10 6 0 12-6q6 6 12 6 0-8-12-10zM-2-54q2-10 4 0z"/><path fill="#c08a10" d="M-6-46l6-4 6 4"/>`);
    const loose = K.sym('fp2loose', () => `<path stroke="#5a7a3a" stroke-width="1.6" d="M0 0v-58"/><path fill="none" stroke="#b03a8a" stroke-width="5" stroke-linecap="round" stroke-dasharray="3 2" d="M0-58v24"/><path fill="none" stroke="#d26ab0" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 4" d="M1-56v20"/>`);
    const sweet = K.sym('fp2sweet', () => `<path stroke="#6a7a44" stroke-width="1.4" d="M0 0v-48"/><path fill="#f6f0d6" d="${K.circ(0, -50, 6)}${K.circ(-6, -46, 4)}${K.circ(6, -47, 4.5)}"/>`);
    const kinds = season === 'spring' ? [iris] : season === 'summer' ? [loose, sweet, loose, iris] : [];
    if (!kinds.length) return out;
    for (let i = 0; i < n; i++) { const y = y0 + r() * (y1 - y0), k = 1 + (y - y0) / (y1 - y0) * .8; out.push({ x: x0 + r() * (x1 - x0), y, z: .5, use: kinds[i % kinds.length], k: Math.round(k * (.85 + r() * .3) * 100) / 100 }); }
    return out;
  };

  /* ---------- the scene ---------- */
  const draw = (season, o) => K.scene(o, () => {
    const at = { spring: 'morning', summer: 'afternoon', autumn: 'golden', winter: 'day' }[season];
    const L = K.live(o, { heading: 110, fov: 76, horizon: 470, season, at, lat: LAT, lon: LON });
    const p = K.pal(season), win = season === 'winter', aut = season === 'autumn', spr = season === 'spring', sum = season === 'summer';
    const day = L.dark < .5, dusk = L.dark > .3, lite = K.lod() < 1;   // lite: a small tile (the kit draws about 20% of the detail)
    const s = K.liveBackdrop(L, { seed: 7, stars: 240, cloudY: [30, 330] });
    let g = '';
    // 1. distant Hart woodland, hazy, and Fleet's roofs glimpsed on the far right
    if (!lite) g += K.woods({ seed: 211, y: 472, h: [22, 40], mix: { oak: .45, pine: .35, birch: .2 }, season, haze: .62, sway: 0, rows: 1 });
    if (!lite) g += roofs(L, 77, [[1180, 474, 38], [1236, 472, 30], [1290, 475, 42], [1372, 471, 34], [1440, 474, 40], [1530, 472, 30]]);
    // 2. the railway embankment along the north side (left), a train passing now and then
    g += `<path fill="${K.mix(p.grass[0], L.haze, .45)}" d="M-160 470L-160 446Q200 440 560 448Q700 452 760 476z"/>` + K.S(K.mix('#6a6058', L.haze, .4), 2, 'M-160 444Q200 438 560 446L700 456');
    g += train(L, -1000, 446, .62, { dur: 70, d: 18 }) + (lite ? '' : train(L, 1900, 449, -.62, { dur: 84, d: 50 }));
    g += K.woods({ seed: 214, x0: -160, x1: 760, y: 486, h: [26, 46], mix: { birch: .4, alder: .35, oak: .25 }, season, haze: .4, sway: 0, rows: 1 });
    // 3. the far-shore wood (mirrored in the pond)
    const wood = U();
    g += K.woods({ seed: 218, x0: 280, x1: 820, y: 494, h: [36, 70], mix: { alder: .35, birch: .35, oak: .3 }, season, haze: .36, snow: win, sway: 0, rows: 1 });
    g += `<g id="${wood}">` + K.woods({ seed: 221, x0: 560, x1: 1760, y: 500, h: [58, 120], mix: { oak: .35, birch: .25, pine: .2, alder: .2 }, season, haze: .3, snow: win, sway: 0 }) + '</g>';
    // 4. the open water
    const clip = U(), pond = 'M-160 486Q300 494 560 498Q1100 500 1760 503V900H-160z';
    g += K.water({ d: pond, y0: 488, y1: 900, cols: L.water(win ? ['#9fb6c0', '#5f8494', '#2f4c5c'] : ['#8ab6b8', '#3f7e8a', '#1c4a58']), clip, keepSky: true, lines: 80, shimmer: 60, glints: L.sun.show ? 14 : 0, gx0: L.sun.x - 180, gx1: L.sun.x + 180, sky: L.low, seed: 23 });
    if (!lite) g += K.reeds({ seed: 30, x0: 300, x1: 1760, y0: 496, y1: 512, n: 110, season, k0: .16, k1: .24, haze: .3, kinds: ['plume', 'plume', 'bulrush'] });   // the far shore's reed fringe
    // the far wood mirrored in the still water (static: a wobbling copy of the whole wood costs too much per frame), broken by drifting ripple lines
    { const r = rnd(29); let d = ['', '']; for (let i = 0; i < 70; i++) { const y = 504 + Math.pow(r(), 1.6) * 150, w = 20 + r() * 70 * (1 + (y - 504) / 80); d[i % 2] += `M${R(-160 + r() * 1920)} ${R(y)}h${R(w)}`; }
      g += `<g clip-path="url(#${clip})"><use href="#${wood}" transform="matrix(1 0 0 -1 0 1002)" opacity=".36"/>` + d.map((dd, i) => mv('ukndrift', { ad: (14 + i * 5) + 's', dx: (18 + i * 10) + 'px' }, K.S(K.mix(L.low, '#ffffff', .25), 1.6, dd, ` opacity="${i ? .35 : .5}"`))).join('') + '</g>'; }
    g += K.lightPath(L, { y0: 500, y1: 860, w: 46, clip });
    if (win) g += `<path fill="#e6eef2" opacity=".35" d="M-160 640Q120 610 300 660Q160 700-160 700z"/>`;   // skim of ice in the reedy shallows
    // far reed island and the reedbed of the east margin, with alder and willow carr
    g += K.reeds({ seed: 31, x0: 230, x1: 640, y0: 540, y1: 566, n: 34, season, k0: .32, k1: .45, haze: .25 });
    g += K.tree('willow', 1430, 590, .42, { season, seed: 51, flutter: 4, snow: win }) + K.tree('alder', 1560, 600, .5, { season, seed: 52, flutter: 4, snow: win }) + K.tree('alder', 1690, 610, .44, { season, seed: 53, snow: win });
    g += K.reeds({ seed: 32, x0: 1240, x1: 1760, y0: 580, y1: 650, n: 60, season, k0: .45, k1: .7, kinds: ['plume', 'bulrush', 'plume'] });
    g += platform(1130, 640, .8, season) + (L.dark > .8 ? '' : K.walker(1110, 636, .5, { dx: 40, dur: 30, seed: 11 }));
    // 5. birds on the water
    g += grebe(520, 600, .8, season, { dx: 140, dur: 18 }) + grebe(760, 640, .9, season, { dx: -120, dur: 22, d: 9, flip: true });
    g += K.duck('swan', 900, 590, .8, { dx: 160, dur: 70 }) + K.duck('swan', 990, 600, .66, { dx: 150, dur: 74, d: 4 });
    g += K.duck('goose', 360, 640, .75, { dx: 120, dur: 44 }) + K.duck('goose', 300, 652, .7, { dx: 110, dur: 48, d: 6 }) + K.duck('goose', 420, 660, .72, { dx: 100, dur: 46, d: 12 });
    g += K.duck('coot', 640, 700, .7, { dx: -90, dur: 26, flip: true }) + K.duck('coot', 860, 700, .66, { dx: 80, dur: 30 });
    g += K.duck('mallard', 600, 760, .95, { dx: 160, dur: 36 }) + K.duck('female', 700, 790, .92, { dx: 150, dur: 40, d: 22 });
    if (win && !lite) g += K.duck('moorhen', 1200, 700, .7, { dx: -60, dur: 28, flip: true });
    g += K.heron(1250, 676, .72, { flip: true });
    g += K.fish(700, 560, .5, { dur: 13 }) + K.fish(1080, 780, .8, { dur: 17, d: 7 }) + K.ripples(560, 690, { rx: 26, ry: 5, n: 3, dur: 6 }) + K.ripples(1180, 600, { rx: 18, ry: 3, n: 2, dur: 5 });
    if (!win) g += K.lilies({ seed: 41, x0: 380, x1: 1160, y0: 700, y1: 890, n: 40, season, flowers: .45 });
    // 6. the near reedbed: boardwalk, dense reeds and marsh flowers either side
    g += K.reeds({ seed: 33, x0: -160, x1: 260, y0: 600, y1: 700, n: 44, season, k0: .6, k1: .85 });
    g += boardwalk(season);
        // reed litter and mud at the foot of the near reedbeds
    const base = K.mix(p.reed[0], '#2a2a1a', .45);
    g += `<path fill="${base}" d="M-160 900V770q60-14 120 6t110-4 70 40 50 88z"/><path fill="${base}" d="M1760 900V790q-90-10-170 10t-160 2-150 30-140 20-130 30-40 8z"/>`;
    g += K.wind(K.reedBits({ seed: 38, x0: -160, x1: 240, y0: 690, y1: 760, n: 50, season, k0: .7, k1: 1, kinds: ['plume', 'plume', 'bulrush'] }).concat(K.reedBits({ seed: 34, x0: -160, x1: 250, y0: 760, y1: 930, n: 48, season, k0: 1, k1: 1.9, kinds: ['plume', 'bulrush', 'plume'] }), K.reedBits({ seed: 39, x0: 1000, x1: 1760, y0: 730, y1: 800, n: 60, season, k0: .7, k1 : 1, kinds: ['plume', 'plume', 'bulrush'] }), K.reedBits({ seed: 35, x0: 820, x1: 1760, y0: 800, y1: 950, n: 54, season, k0: 1.1, k1: 2.2, kinds: ['plume', 'bulrush', 'plume'] }),
      marshBits(36, -140, 230, 790, 910, 30, season).map(b => Object.assign(b, { z: 2 })), marshBits(37, 860, 1720, 830, 920, 40, season).map(b => Object.assign(b, { z: 2 }))), { amp: 'soft', strips: 6 });
    if (L.dark < .8) g += K.walker(430, 824, .95, { dog: true, dx: -150, dy: -78, dur: 48, seed: 5 });
    // kingfisher, dragonflies and damselflies (warm months), wildfowl overhead
    if (!lite) g += kingfisher(-300, 690, { dur: 52, d: 4 });
    if (day && (sum || spr)) g += K.dragonfly(420, 560, 1, { dx: 180, dy: 50 }) + K.dragonfly(980, 700, 1.1, { dx: -160, dy: 30, col: '#3f7cc0' }) + K.dragonfly(1400, 660, .9, { dx: 140, col: '#6a9a3a' }) + K.dragonfly(160, 760, .7, { dx: 90, dy: -40, col: '#2aa0d8' }) + K.dragonfly(1220, 820, .6, { dx: -70, col: '#3aa6e0' });
    if (day && aut) g += K.dragonfly(500, 640, 1, { dx: 150, col: '#c0302a' }) + K.dragonfly(1300, 720, .9, { dx: -120, col: '#b8402a' });
    if (day && sum) g += K.butterfly(260, 640, .8, { kind: 'peacock', dx: 200 }) + K.bee(1500, 790, 1.1);
    if (day) g += K.flock({ seed: 4, n: 7, x: 1750, y: 170, s: 1.3, dx: -2100, dy: 50, dur: 58, v: true, col: '#3a3a40' }) + K.flock({ seed: 6, n: 4, x: -120, y: 260, s: .9, dx: 1900, dy: -40, dur: 44, col: '#e8ecee' });
    if (dusk) g += K.bats({ seed: 5, n: 5, x: 700, y: 330, spread: 300 }) + K.moths(980, 760);
    // seasonal particles
    if (aut) g += K.falling({ seed: 61, n: 26, x0: -100, x1: 1700, y0: -20, y1: 520, dy: 480, dx: 180, cols: p.leaf.alder.concat(p.leaf.willow, p.leaf.oak) }) + K.motes({ seed: 64, n: 10, x0: 1100, x1: 1700, y0: 560, y1: 820, cols: p.plume });
    if (spr) g += K.motes({ seed: 62, n: 24, x0: 900, x1: 1700, y0: 420, y1: 760, cols: ['#fbf8ee', '#f0ead8'] });   // willow seed fluff
    if (sum) g += K.motes({ seed: 63, n: 22, x0: 100, x1: 1500, y0: 560, y1: 860 });
    if (win) g += K.snow({ n: 26, layers: 2 });
    if (L.alt > -3 && L.alt < 14 && (L.morning || win)) g += K.mist({ y: 500, h: 80, n: 6, op: .55 });
    return s + K.tone(L, g) + K.weather(L, { mistY: 520 }) + K.grade(L);
  });

  const place = 'fleet-pond', label = 'Fleet Pond', town = 'Fleet', kind = 'landscape', tags = ['lake', 'reedbed', 'nature reserve'];
  const view = 1, originalSeason = 'summer';
  const reasons = { spring: 'Yellow flag iris along the reedbed boardwalk', summer: 'Reedbed and hovering dragonflies', autumn: 'Reed plumes and grebes from the boardwalk', winter: 'Frosted reeds and wildfowl on the pond' };
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const reason = reasons[season];
    add('hampshire', kind, { id: `${place}-${view + 1}${season !== originalSeason ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: 'close', viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      svg: (o = {}) => draw(season, o) });
  }
}
