// UK_SCENE_PART: uk-south-east/yateley-green-v4
/* Yateley Green — the open common, its pond and wildflower margins.
     https://yateley-tc.gov.uk/our-services/open-spaces/
     https://www.hart.gov.uk/sites/default/files/2022-11/yateley_green_accessible.pdf (conservation area appraisal)
   View 4 of 4 (evening): one file per view, so each view's art can change without
   touching the others (the other views: 72-anim-pack-uk-south-east-yateley-green-v1..v4.js).
   Drawn with the rich nature kit T.K (src/app/71-anim-uk-nature-kit.js). Keep every id, ukPlace,
   ukView, ukSeason and season unchanged so saved pins and the rotation keep working.

   Brief (this view): Yateley Green is registered common land on undulating former heathland, the
   most northerly of Hart's conservation areas. Shute's Pond, the largest pond on the Green, is ringed
   by reeds, mature oaks and horse chestnuts, with grass and wildflower margins walked by dog walkers.
   Through the trees: red-brick Georgian houses and cottages with clay-tile roofs and chimneys, and
   St Peter's Church (Saxon north wall, a 15th-century timber tower with a shingled spire) by Church
   End Green. The view looks west across the pond into the real sunset, sun and moon from the almanac.
*/
function ukSouthEastYateleyGreenV4(T) {
  const { add, U, mv } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js)
  const LAT = 51.34, LON = -0.83;

  /* ---------- place helpers ---------- */
  // A red-brick Georgian cottage (local origin at the foot centre, about 150 wide): clay-tile roof,
  // chimney stacks, white sash windows that mirror the sky by day and light from real dusk.
  const cottage = (L, x, y, k, o = {}) => {
    const w = (o.w || 150) * k, h = (o.h || 70) * k, rh = (o.rh || 52) * k, x0 = x - w / 2, top = y - h;
    const brick = o.brick || '#a5583c', roof = o.roof || '#7c3e2c';
    let s = `<path fill="${brick}" d="M${x0} ${y}V${top}h${w}V${y}z"/>`;
    s += `<path fill="none" stroke="#7a3c28" stroke-width="${Math.max(.6, k)}" opacity=".35" d="${Array.from({ length: 6 }, (_, i) => `M${x0} ${top + (i + 1) * h / 7}h${w}`).join('')}"/>`;
    s += `<path fill="#000" opacity=".16" d="M${x0 + w * .82} ${y}V${top}h${w * .18}V${y}z"/>`;
    s += `<path fill="${roof}" d="M${x0 - 5 * k} ${top + 2 * k}L${x0 + w * .16} ${top - rh}H${x0 + w * .84}L${x0 + w + 5 * k} ${top + 2 * k}z"/>`;
    s += `<path fill="#000" opacity=".14" d="M${x0 + w * .84} ${top - rh}L${x0 + w + 5 * k} ${top + 2 * k}H${x0 + w * .6}z"/>`;
    s += `<path fill="none" stroke="#5a2a1e" stroke-width="${Math.max(.5, k * .8)}" opacity=".4" d="${Array.from({ length: 4 }, (_, i) => `M${x0 + w * .16 - i * 1.4 * k} ${top - rh + (i + 1) * rh / 5}H${x0 + w * .84 + i * 1.4 * k}`).join('')}"/>`;
    for (const cx of o.chimneys || [.2, .8]) s += `<path fill="${brick}" d="M${x0 + w * cx - 7 * k} ${top - rh + 6 * k}v${-24 * k}h${14 * k}v${24 * k}z"/><path fill="#5a2a1e" d="M${x0 + w * cx - 8 * k} ${top - rh - 18 * k}h${16 * k}v${3 * k}h${-16 * k}z"/>`;
    const ww = 15 * k, wh = 20 * k;
    for (const fx of [.14, .38, .62, .86]) {
      s += K.window(L, x0 + w * fx - ww / 2, top + 9 * k, ww, wh, { frame: '#f2eee4' });
      if (fx === .38) s += `<path fill="#3a4a3e" d="M${x0 + w * .5 - 8 * k} ${y}v${-26 * k}h${16 * k}v${26 * k}z"/><path fill="#f2eee4" d="M${x0 + w * .5 - 11 * k} ${y - 29 * k}h${22 * k}v${3 * k}h${-22 * k}z"/>`;
      else s += K.window(L, x0 + w * fx - ww / 2, top + 40 * k, ww, wh, { frame: '#f2eee4' });
    }
    return s;
  };
  // Chimney smoke: a few soft puffs rising and fading (only when the fires are lit, cool seasons and evenings).
  const smoke = (x, y, k, seed) => { let out = ''; for (let i = 0; i < 5; i++) out += mv('uknfall', { ad: (8 + i * .7) + 's', d: -(i * 1.7 + seed % 3) + 's', dx: R(30 * k + i * 4) + 'px', dy: R(-100 * k - i * 6) + 'px' }, `<ellipse cx="${x}" cy="${y}" rx="${R(7 * k + i)}" ry="${R(5 * k + i * .6)}" fill="#cfccd2" opacity=".3"/>`); return out; };
  // St Peter's church: K.stPeters in the kit (the same drawing in every Yateley Green view).
  // A horse chestnut: the broad, domed tree of the Green (drawn on the oak skeleton), with its white
  // "candles" of blossom in spring and conkers in the grass in autumn.
  const chestnut = (x, y, s, season, seed, o = {}) => {
    let t = K.tree('oak', x, y, s, Object.assign({ season, seed, flutter: 8, fall: season === 'autumn' ? 10 : 0 }, o));
    const r = rnd(seed * 7 + 3);
    if (season === 'spring') {
      let d = '', p = '';
      for (let i = 0; i < 46; i++) {
        const a = r() * Math.PI * 2, q = Math.sqrt(r()), cx = x + Math.cos(a) * q * 170 * s, cy = y - 270 * s + Math.sin(a) * q * 110 * s, h = (11 + r() * 8) * s, w = h * .32;
        d += `M${R(cx - w)} ${R(cy)}L${R(cx)} ${R(cy - h)}L${R(cx + w)} ${R(cy)}z`;
        if (i % 3 === 0) p += `M${R(cx)} ${R(cy - h * .5)}h${R(w * .6)}`;
      }
      t += K.sway(x, `<path fill="#fbf6ee" d="${d}"/><path stroke="#e7a0a8" stroke-width="${Math.max(1, 2 * s)}" d="${p}"/>`, 'tree');
    }
    if (season === 'autumn') {
      let d = '', h = '';
      for (let i = 0; i < 14; i++) { const cx = x + (r() - .5) * 280 * s, cy = y + 6 + r() * 26 * s; d += K.circ(cx, cy, 4.5 * s); if (i % 2) h += K.circ(cx + 6 * s, cy + 1, 4 * s); }
      t += `<path fill="#6a3a1e" d="${d}"/><path fill="#9aa04a" d="${h}"/>`;
    }
    return t;
  };
  // A Victorian-style lamp post by the path: the lantern lights at real dusk.
  const lampPost = (L, x, y, k) => `<path stroke="#262a2c" stroke-width="${4 * k}" d="M${x} ${y}v${-92 * k}"/><path fill="#262a2c" d="M${x - 7 * k} ${y}h${14 * k}l-3 ${-10 * k}h${-8 * k}zM${x - 8 * k} ${y - 92 * k}h${16 * k}l-4 ${-18 * k}h${-8 * k}zM${x - 6 * k} ${y - 112 * k}h${12 * k}l-6 ${-7 * k}z"/>` + K.lamp(L, x, y - 101 * k, 5 * k);
  // A green-painted wooden bench.
  const bench = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cy="4" rx="90" ry="7" fill="#14261e" opacity=".22"/><path fill="#5a6e4e" d="M-75-48h150v10H-75zM-75-31H75v10H-75zM-80-10H80V0H-80z"/><path stroke="#2e3830" stroke-width="7" d="M-60 22v-72M60 22v-72M-66 22l10-22M66 22l-10-22"/></g>`;
  const R = Math.round, rnd = T.rnd;

  const seasonal = {
    spring: { flowers: ['celandine', 'dandelion', 'cowparsley', 'daisy', 'anemone'], fl: 140 },
    summer: { flowers: ['buttercup', 'daisy', 'campion', 'knapweed', 'clover', 'poppy', 'harebell'], fl: 200 },
    autumn: { flowers: ['ragwort', 'knapweed', 'daisy'], fl: 60 },
    winter: { flowers: ['daisy'], fl: 6 },
  };

  const scene = (season, o) => K.scene(o, () => {
    const L = K.live(o, { heading: 268, fov: 96, horizon: 500, season, at: 'sunset', lat: LAT, lon: LON });
    const p = K.pal(season), winter = season === 'winter', autumn = season === 'autumn', spring = season === 'spring', summer = season === 'summer';
    const tile = K.lod() < 1, evening = L.alt < 6, fires = winter || autumn || (spring && L.dark > .2);
    // 1. the sky: live gradient, the real sun or moon in its phase, stars, clouds; rooks heading to roost
    let s = K.liveBackdrop(L, { seed: 41, cloudY: [30, 330], clouds: 2, cirrus: 3 });
    s += K.flock({ seed: 42, n: 7, x: -60, y: 190, s: .7, dx: 1500, dy: -40, dur: 46, col: '#20242a' });
    s += K.flock({ seed: 43, n: 4, x: 1500, y: 120, s: .55, dx: -1400, dy: 30, dur: 58, d: 20, col: '#262a30' });
    if (L.stars > .3) {   // a few brighter stars twinkling over the west (x-ukystar, the pack's star twinkle)
      const q = rnd(98), grp = ['', '', ''];
      for (let i = 0; i < 18; i++) grp[i % 3] += K.circ(q() * 1600, 20 + q() * 320, 1.1 + q() * 1.2);
      s += `<g fill="#fff4e0" opacity="${(L.stars * .9).toFixed(2)}">` + grp.map((d, i) => mv('ukystar', { ad: `${3.3 + i}s`, d: `-${i}s` }, `<path d="${d}"/>`)).join('') + '</g>';
    }
    if (!winter && L.alt < 4) s += K.bats({ seed: 44, n: 4, x: 900, y: 300, spread: 260, s: 1.1 });

    // 2. far: the wooded edge of the common, cottages and the church tower glimpsed between the trees
    const far = U(), mid = U();
    let f = tile ? '' : K.woods({ seed: 51, y: 492, h: [56, 92], mix: { oak: .55, birch: .15, pine: .12, alder: .18 }, season, haze: .5, sway: 0, snow: winter });
    const bld = U();
    f += `<g id="${bld}">` + K.stPeters(L, 1100, 508, 1.1);   // the shared St Peter's (kit)
    f += cottage(L, 250, 512, .62, {}) + cottage(L, 470, 508, .56, { w: 130, chimneys: [.75] }) + cottage(L, 840, 510, .6, { brick: '#9e5a40', roof: '#6e3a2a' }) + cottage(L, 1420, 512, .58, {}) + '</g>';
    if (fires) f += K.keep(smoke(488, 428, .6, 52) + smoke(812, 426, .6, 53));
    for (const [x0, x1, sd] of [[-160, 160, 61], [330, 395, 62], [545, 760, 63], [925, 1065, 64], [1215, 1340, 65], [1500, 1760, 66]])
      f += K.woods({ seed: sd, x0, x1, y: 528, h: [86, 140], mix: { oak: .5, alder: .2, birch: .15, hawthorn: .15 }, season, haze: .26, snow: winter, rows: 1 });
    f += tile ? `<path fill="${p.grass[1]}" d="M-160 568V520H1760V568z"/>` : K.turf({ seed: 66, x0: -160, x1: 1760, y0: 520, y1: 568, rows: 5, lobe: [14, 30], season, base: p.grass[1] });
    let g = `<g id="${far}">${f}</g>`;

    // 3. mid: the big trees of the Green, the path along the pond and the people on it
    let m = K.track({ pts: [[-160, 560, 16], [300, 556, 18], [800, 560, 20], [1300, 556, 18], [1760, 562, 16]], seed: 71, season, stones: 30, puddles: winter ? 2 : 0, sky: L.low });
    // small tiles: the three big trees of the Green as light woodland symbols (a full tree is ~17 KB)
    const tileTree = (x, y, h, sd) => {
      const q = rnd(sd), lv = (p.leaf && p.leaf.oak) || null, tw = h * .06;
      let t = K.shadow(L, x, y, h * .7, h) + `<path fill="#4a3c30" d="M${R(x - tw)} ${y}Q${R(x - tw * .4)} ${R(y - h * .3)} ${R(x - tw * .3)} ${R(y - h * .55)}h${R(tw * .6)}Q${R(x + tw * .4)} ${R(y - h * .3)} ${R(x + tw)} ${y}z"/>`;
      if (!lv) { let b = ''; for (let i = 0; i < 9; i++) { const a = -2.6 + i * .27 + (q() - .5) * .2; b += `M${x} ${R(y - h * .45)}l${R(Math.cos(a) * h * .45)} ${R(Math.sin(a) * h * .5)}`; } return t + `<path fill="none" stroke="#5a4f4a" stroke-width="${R(tw * .35)}" d="${b}"/>`; }
      for (let i = 0; i < 3; i++) { let d = ''; for (let k = 0; k < 4; k++) d += K.lobed(q, x + (q() - .5) * h * .7 - (i - 1) * h * .06, y - h * (.62 + q() * .3) - i * h * .04, h * (.2 + q() * .08), h * (.16 + q() * .06), 10, .3); t += `<path fill="${lv[i]}" d="${d}"/>`; }
      return K.sway(x, t, 'tree');
    };
    m += tile ? tileTree(660, 566, 190, 72) + tileTree(330, 568, 240, 73) : chestnut(660, 566, .52, season, 72) + K.tree('oak', 330, 568, .66, { season, seed: 73, flutter: 8, fall: autumn ? 8 : 0, snow: winter });
    m += (tile ? tileTree(1300, 570, 220, 74) : K.tree('oak', 1300, 570, .6, { season, seed: 74, flutter: 8, fall: autumn ? 8 : 0, snow: winter })) + (tile ? '' : K.tree('birch', 1000, 566, .5, { season, seed: 75, flutter: 6 }));
    m += lampPost(L, 860, 562, .7) + lampPost(L, 1560, 564, .7);
    if (L.lamps) m += K.moths(860, 488, { n: 4 }) + K.moths(1560, 490, { n: 3 });
    m += K.walker(120, 560, .42, { dog: true, dx: 520, dur: 70, seed: 81 });
    m += K.family(1180, 558, .4, { dx: -420, dur: 90, seed: 82, d: 30, dog: summer });
    m += K.walker(760, 561, .4, { dx: 360, dur: 60, seed: 83, d: 12 });
    m += (winter ? K.walker(1500, 560, .4, { dog: true, dx: -300, dur: 55, seed: 84 }) : K.jogger(1500, 560, .4, { dx: -900, dur: 32, seed: 84 }));
    if (!winter) m += K.cyclist(300, 556, .38, { dx: 900, dur: 36, seed: 85, d: 9 });
    if (autumn || winter) m += K.owl(1314, 440, .6, { dur: 11 });
    g += `<g id="${mid}">${m}</g>`;

    // 4. Shute's Pond: the sky in the water, the trees and church mirrored, the glitter road under the sun or moon
    const pondD = 'M-160 598Q120 574 520 584T1180 582Q1560 586 1760 604V780Q1400 806 980 792T300 806Q20 800 -160 778z', clip = U();
    let w = K.water({ d: pondD, y0: 580, y1: 810, cols: L.water(), clip, lines: 70, shimmer: 50, glints: summer ? 10 : 4, sky: L.low, keepSky: true });
    // the mirrored Green: the buildings mirrored exactly, the tree masses as soft lobed shapes (a mirrored
    // copy of the whole animated far and mid layers doubled the per-frame paint under the shimmer)
    const rq = rnd(97), leafC = winter ? '#6a5e5a' : (p.leaf.oak || p.leaf.pine)[0], leafL = winter ? '#8a7c76' : (p.leaf.oak || p.leaf.pine)[1];
    let band = '', crowns = '';
    for (let x = -160; x < 1780; x += 46 + rq() * 40) band += K.lobed(rq, x, 600 + rq() * 18, 40 + rq() * 30, 34 + rq() * 26, 9, .3);
    for (const [x, y, k] of [[330, 568, .66], [660, 566, .52], [1000, 566, .4], [1300, 570, .6]]) crowns += K.lobed(rq, x, 2 * 578 - (y - 270 * k), 170 * k, 120 * k, 12, .32);
    w += `<g clip-path="url(#${clip})" opacity=".3"><path fill="${leafC}" d="${band}"/><path fill="${leafL}" d="${crowns}"/><use href="#${bld}" transform="matrix(1 0 0 -1 0 1146)"/></g>`;
    w += K.lightPath(L, { y0: 586, y1: 800, w: 50, clip });
    if (winter) w += `<path fill="#e8f0f4" opacity=".55" d="M-160 600Q120 578 420 590Q300 640 -160 650zM1240 586Q1560 590 1760 606V700Q1520 640 1240 586z"/><path fill="none" stroke="#ffffff" stroke-width="1.4" opacity=".6" d="M-120 612l180-6M60 622l140-10M1360 604l170 18M1460 628l200 30"/>`;
    if (!winter) w += K.lilies({ seed: 91, x0: 60, x1: 520, y0: 620, y1: 700, n: tile ? 8 : 16, flowers: .5, season }) + K.lilies({ seed: 92, x0: 1180, x1: 1520, y0: 640, y1: 740, n: tile ? 6 : 12, flowers: .4, season });
    w += K.ripples(720, 640, { rx: 34, ry: 6, n: 3, dur: 5 }) + K.ripples(1060, 700, { rx: 46, ry: 8, n: 3, dur: 6, d: 2 }) + K.ripples(380, 740, { rx: 40, ry: 7, n: 2, dur: 7, d: 1 });
    if (!winter) w += K.fish(930, 660, .7, { dur: 13 }) + K.fish(470, 720, .6, { dur: 17, d: 6, flip: true });
    w += K.duck('mallard', 560, 650, .62, { dx: 160, dur: 34 }) + K.duck('female', 610, 666, .6, { dx: 150, dur: 34, d: 2 });
    w += K.duck('swan', 1020, 628, .62, { dx: -220, dur: 60, flip: true }) + K.duck('coot', 300, 700, .6, { dx: 120, dur: 24 }) + K.duck('moorhen', 1300, 690, .58, { dx: -110, dur: 22, flip: true });
    w += K.duck('mallard', 860, 740, .78, { dx: -180, dur: 40, flip: true }) + (winter ? '' : K.duck('goose', 140, 640, .55, { dx: 140, dur: 44 }));
    if (summer) w += K.dragonfly(700, 610, .9) + K.dragonfly(1180, 650, .8, { flip: true });
    g += w;
    g += K.reeds({ seed: 93, x0: -160, x1: 160, y0: 586, y1: 640, n: tile ? 20 : 40, season, k0: .5, k1: .8 }) + K.reeds({ seed: 94, x0: 1420, x1: 1760, y0: 596, y1: 660, n: tile ? 22 : 44, season, k0: .5, k1: .85 });
    g += K.heron(1470, 712, .7, { dur: 14 });

    // 5. near bank: grass and wildflower margins, the bench, the strollers on the near path
    const nearD = 'M-160 900V770Q200 812 560 800T1120 808T1760 768V900z';
    g += K.land({ d: nearD, top: p.grass[2], bottom: p.grass[0], y0: 770, y1: 900, seed: 101, speckle: 180 });
    g += K.turf({ seed: 102, x0: -160, x1: 1760, y0: 790, y1: 900, rows: tile ? 6 : 12, lobe: [24, 80], season });
    if (!tile) g += K.reeds({ seed: 103, x0: 380, x1: 980, y0: 790, y1: 820, n: 30, season, kinds: ['plume', 'bulrush'], k0: .7, k1: .9, strips: 3 });
    g += K.track({ pts: [[-160, 892, 34], [400, 880, 40], [900, 886, 44], [1400, 878, 40], [1760, 888, 34]], seed: 104, season, stones: 40, roots: 2, puddles: winter || autumn ? 2 : 0, sky: L.low });
    g += bench(1180, 840, .62) + K.robin(1160, 811, .7, { dur: 6 });
    g += K.walker(300, 884, .74, { dog: true, dx: 600, dur: 64, seed: 111 }) + K.walker(1500, 882, .72, { dx: -700, dur: 76, seed: 112, d: 20 });
    g += K.squirrel(140, 846, .8);
    // the framing trees: a great oak on the left, a horse chestnut on the right
    g += K.tree('oak', -90, 930, 1.12, { season, seed: 121, flutter: 4, fall: autumn ? 14 : 0, snow: winter });
    g += chestnut(1720, 920, 1.0, season, 122, { snow: winter, flutter: 4 });
    // wildflower margins (seasonal species) and long grass in front
    const sf = seasonal[season];
    g += K.meadow({ seed: 131, x0: -160, x1: 700, y0: 820, y1: 905, n: tile ? 36 : 120, h: 60, k0: .8, k1: 1.5, flowers: tile ? sf.fl / 3 : sf.fl, kinds: sf.flowers, season, cols: p.grass, strips: 4 });
    g += K.meadow({ seed: 132, x0: 1000, x1: 1760, y0: 820, y1: 905, n: tile ? 32 : 110, h: 60, k0: .8, k1: 1.5, flowers: tile ? sf.fl / 3 : sf.fl, kinds: sf.flowers, season, cols: p.grass, strips: 4 });
    if (spring) g += K.bluebells({ seed: 133, x0: -160, x1: 260, y0: 846, y1: 900, n: 30, patches: 5 });
    if (summer || spring) g += K.butterfly(420, 790, .9, { kind: spring ? 'brimstone' : 'blue' }) + K.butterfly(1240, 800, .9, { kind: 'tortoiseshell' }) + K.bee(260, 846, 1) + K.bee(1400, 850, 1);

    // seasonal particles and air
    let air = '';
    if (spring) air += K.petals({ seed: 141, n: 14, x0: 0, x1: 1600, y0: 300, y1: 760 });
    if (summer) air += K.motes({ seed: 142, n: 18, x0: 100, x1: 1500, y0: 480, y1: 820 });
    if (autumn) air += K.falling({ seed: 143, n: 18, x0: -100, x1: 1700, y0: 260, y1: 700, dy: 380, dx: 180, cols: ['#c0782a', '#d99a3a', '#8a4a20', '#e8b84a'] });
    if (winter) air += K.snow({ seed: 144, n: 26, layers: 2 });
    if (evening && (winter || autumn)) air += K.mist({ seed: 145, y: 590, h: 40, n: 3, op: .3 });
    return s + K.tone(L, g + air) + K.weather(L) + K.grade(L);
  });

  const place = "yateley-green", label = "Yateley Green", town = 'Yateley', kind = 'landscape', tags = ["village green","pond","wildflowers"];
  // Four composed views per season. The summer wide/close/evening and the autumn third view keep the original saved refs.
  const seasonalReasons = {
    spring: ["Spring blossom around the green pond","Spring flowers along the pond margin","Fresh birches beside the open green","Spring dusk beneath the birches"],
    summer: ["The pond within the summer green","Summer insects across the pond margin","Leafy shade beside the open green","A summer evening beneath the birches"],
    autumn: ["Golden leaves around the green pond","Autumn reeds along the water margin","Autumn shade beside the open green","Autumn dusk beneath the birches"],
    winter: ["Bare birches around the green pond","Frosted reeds and winter waterbirds","Snow around the frozen green pond","Winter dusk beneath the bare branches"],
  };
  // COMPOSED (docs/dev/SCENE_ENGINE.md, sections 3 and 17): when the scene engine is in the build, the four seasonal items
  // of this view share ONE auto-season composed scene (71-scene-uk-south-east-yateley-green-evening.js, drawn by the canvas renderer: the
  // date picks the season, the live sky the light). Every id, ukPlace, ukView, ukSeason, season and the rotation stay as
  // they were; the hand-drawn art above is kept as legacySvg (the old-versus-new sheets) and is the scene without the engine.
  const ygFound = typeof sceneItems === 'function' && typeof sceneItem === 'function' ? sceneItems('uk-south-east-yateley-green').find(i => i.id === 'yateley-green-4') : null;
  const ygScene = ygFound ? ygFound.scene : null;
  for (const view of [3]) for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const originalSeason = view === 2 ? 'autumn' : 'summer', reason = seasonalReasons[season][view];
    const legacy = (o = {}) => scene(season, o);
    const o = { id: `${place}-${view + 1}${season !== originalSeason ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: view === 3 ? 'dreamy' : 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: ['wide', 'close', 'detail', 'evening'][view], viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      svg: legacy };
    add('hampshire', kind, ygScene ? Object.assign(sceneItem(Object.assign({ intensity: 'subtle' }, o), ygScene), { season: [season], liveSky: o.liveSky, legacySvg: legacy }) : o);
  }
}
