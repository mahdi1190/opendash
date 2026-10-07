// UK_SCENE_PART: uk-south-east/wyndhams-pool-v4
/* Wyndham's Pool — the Common's wooded pond at evening, looking west across the water to the sunset.
     https://www.hants.gov.uk/thingstodo/countryside/walking/yateleycommon
     https://hwas.co.uk/wyndhams-pool-hospital-pond/
   Brief (view 4, evening): Wyndham's Pool is an 18th-century fishpond on Yateley Common (SSSI),
   later a bathing pool with a diving board, a coarse fishery since the 1980s (carp, tench, roach,
   perch, pike; wooden swims on the bank; a new dam in 2016). It sits in mixed woodland of Scots
   pine, silver birch and oak on the edge of the heath, with reed and rush margins and lily pads;
   mallard, coot, moorhen and mute swan use it, with bats and roosting rooks at dusk.
   View 4 of 4 (evening): one file per view (the others: 72-anim-pack-uk-south-east-wyndhams-pool-v1..v3.js).
   Drawn with the rich nature kit T.K (src/app/71-anim-uk-nature-kit.js) on the live sky and light.
   Keep every id, ukPlace, ukView, ukSeason and season unchanged so saved pins and the rotation keep working. */
function ukSouthEastWyndhamsPoolV4(T) {
  const { add, U, R, rnd, mv } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js); null only if that file is missing
  const LAT = 51.34, LON = -0.83;

  /* A wooden fishing swim (platform) on the near bank, an angler on a box and a rod line to a bobbing float. */
  const swim = (L, x, y, s, fx, fy, seed) => {
    const r = rnd(seed), wood = '#7a5c40', dk = '#4e3a2a', lt = '#a8865e';
    let planks = '';
    for (let i = 0; i < 7; i++) planks += `M${-120 + i * 34} -8l${-6} 26`;
    const deck = `<path fill="${dk}" d="M-132 18l14-30h236l18 30z"/><path fill="${wood}" d="M-126 12l12-24h228l14 24z"/><path fill="none" stroke="${dk}" stroke-width="2" d="${planks}"/>` +
      `<path stroke="${dk}" stroke-width="7" d="M-118 18v26M112 18v30M-20 18v22"/><path fill="none" stroke="${lt}" stroke-width="2" opacity=".6" d="M-114-10h226"/>`;
    const coat = ['#3d5a3a', '#4a4a3a', '#5a4a3a'][Math.floor(r() * 3)];
    const angler = `<path fill="#3a3530" d="M-14-12h28v-20h-28z"/><path fill="${coat}" d="M-12-30q-4-34 10-40h10q12 8 6 40z"/><circle cx="2" cy="-78" r="8" fill="#c99a78"/><path fill="#2f3a2a" d="M-8-80q8-14 20-2l4 2h-26z"/>` +
      `<path stroke="#2a2a30" stroke-width="7" stroke-linecap="round" d="M-6-32l-22 4v30M8-32l-14 6v26"/><path stroke="${coat}" stroke-width="6" stroke-linecap="round" d="M6-58l-26 12"/>`;
    const rod = `<path fill="none" stroke="#2a2420" stroke-width="2.6" d="M-20-46Q-120-140-250-170"/>`;
    const brolly = `<path fill="#2f5a3a" d="M40-110q70-30 140 0z"/><path stroke="#2a2a2a" stroke-width="3" d="M110-122v118"/><path fill="none" stroke="#1f3f2a" stroke-width="2" d="M40-110q35-6 70-12 35 6 70 12"/>`;
    const kit = `<path fill="#4a5a6a" d="M36 -4h34v-18h-34z"/><path fill="#6a5040" d="M78-6h22v-10h-22z"/>`;
    // the line hangs from the rod tip (local -250, -170) to the float, drawn in scene space
    const tipX = x + (-250 * s), tipY = y + (-170 * s);
    const line = `<path fill="none" stroke="#d8d8d0" stroke-width="1" opacity=".55" d="M${R(tipX)} ${R(tipY)}Q${R((tipX + fx) / 2)} ${R(Math.max(tipY, fy) + 10)} ${R(fx)} ${R(fy)}"/>`;
    const float = mv('uknbob', { ad: '2.6s', dy: '2.5px' }, `<path fill="#e24a2a" d="M${R(fx - 2)} ${R(fy - 9)}h4v6h-4z"/><path fill="#2a2a2a" d="M${R(fx - 2.5)} ${R(fy - 3)}h5v3h-5z"/>`) + K.ripples(fx, fy + 1, { rx: 10, ry: 2.5, n: 2, dur: 5 });
    return `<g transform="translate(${R(x)} ${R(y)}) scale(${s})">${deck}${brolly}${kit}<g transform="translate(-40 -12)">${angler}${rod}</g></g>` + line + float;
  };

  /* Ice and frost along the margins in winter (thin sheets with crazed edges). */
  const ice = (seed, x0, x1, y0, y1) => {
    const r = rnd(seed); let d = '', cr = '';
    for (let i = 0; i < 9; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), w = 60 + r() * 160, h = 6 + r() * 14; d += `M${R(x - w)} ${R(y)}q${R(w * .5)} ${R(-h)} ${R(w)} ${R(-h * .4)}q${R(w * .6)} ${R(h * .2)} ${R(w)} ${R(h * .6)}q${R(-w)} ${R(h * .9)} ${R(-w * 2)} ${R(-h * .2)}z`; cr += `M${R(x - w * .6)} ${R(y - h * .2)}l${R(w * .3)} ${R(-h * .3)} ${R(w * .4)} ${R(h * .2)}`; }
    return K.P('#e6eef2', d, ' opacity=".55"') + K.S('#ffffff', 1.2, cr, ' opacity=".5"');
  };

  /* Midges dancing in a column over the water in the low sun (summer evenings). */
  const midges = (seed, x, y, n) => {
    const r = rnd(seed); let out = '';
    for (let i = 0; i < n; i++) out += mv('uknflit', { ad: `${(1.6 + r() * 1.8).toFixed(2)}s`, d: `-${(r() * 2).toFixed(2)}s`, dx: `${R(-14 + r() * 28)}px`, dy: `${R(-18 + r() * 36)}px` }, `<circle cx="${R(x + (r() - .5) * 50)}" cy="${R(y + (r() - .5) * 60)}" r="1.3" fill="#f4ecd0" opacity=".8"/>`);
    return K.keep(out);
  };

  const scene = (season, o) => K.scene(o, () => {
    const L = K.live(o, { heading: 275, fov: 80, horizon: 488, season, at: 'sunset', lat: LAT, lon: LON });
    const p = K.pal(season), win = season === 'winter', aut = season === 'autumn', spr = season === 'spring', sum = season === 'summer';
    const dusk = L.dark > .25, day = L.dark < .55, lite = K.lod() < 1;   // lite: a small tile (keep it under the tile budget)
    const s = K.liveBackdrop(L, { seed: 7 + ['spring', 'summer', 'autumn', 'winter'].indexOf(season), cloudY: [36, 330], stars: 240 });
    let g = '';
    let twinkle = '';
    if (L.stars > .3) { const q = rnd(84), grp = ['', '', '']; for (let i = 0; i < 18; i++) grp[i % 3] += `<circle cx="${R(q() * 1600)}" cy="${R(q() * 300)}" r="${(1.1 + q() * 1.2).toFixed(1)}"/>`; twinkle = K.keep(`<g fill="#fff4e0" opacity="${(L.stars * .9).toFixed(2)}">` + grp.map((d, i) => mv('ukystar', { ad: `${3.4 + i}s`, d: `-${i}s` }, d)).join('') + '</g>'); }
    // 1. far woods across the pool (hazy), then the far bank wood (mirrored in the water)
    if (!lite) g += K.woods({ seed: 41, y: 486, h: [40, 66], mix: { pine: .55, birch: .25, oak: .2 }, season, haze: .6, sway: 0, shrubs: false });
    const far = U();
    g += `<g id="${far}">` + K.woods({ seed: 42, y: 512, h: [110, 175], mix: { pine: .42, birch: .36, oak: .22 }, season, haze: .26, snow: win }) + (lite ? '' :
      K.tree('pine', 470, 514, .56, { season, seed: 43, flutter: 0, haze: .22 }) + K.tree('pine', 1210, 512, .62, { season, seed: 44, flutter: 0, haze: .22 }) +
      K.tree('birch', 880, 516, .42, { season, seed: 45, flutter: 0, haze: .24, snow: win })) + '</g>';
    // 2. the far bank: a thin strip of rush and reed at the foot of the trees
    g += K.land({ d: 'M-160 506Q300 500 760 508T1760 504V522H-160z', top: K.mix(p.grass[1], L.haze, .45), bottom: K.mix(p.ground[0], L.haze, .35), y0: 500, y1: 522, seed: 46, speckle: 60 });
    if (!lite) g += K.reeds({ seed: 47, x0: -160, x1: 1760, y0: 508, y1: 520, n: 70, season, k0: .14, k1: .2, haze: .4 });
    // 3. the pool: mirrored far wood, ripple lines, shimmer, the sun or moon road, lilies and life
    const clip = U(), pool = 'M-160 516Q420 510 800 518T1760 514V772Q1460 800 1120 792Q760 782 420 806Q140 826-160 812z';
    g += K.water({ d: pool, y0: 514, y1: 830, cols: L.water(), clip, reflect: [], keepSky: true, lines: 90, shimmer: 60, glints: L.sun.show ? 14 : 0, gx0: L.sun.x - 180, gx1: L.sun.x + 180, sky: L.low, seed: 48 });
    g += `<g clip-path="url(#${clip})"><use href="#${far}" transform="matrix(1 0 0 -1 0 1028)" opacity=".5"/></g>`;   // a still mirror: the wobbling one cost a frame budget
    g += K.lightPath(L, { y0: 520, y1: 790, w: 46, clip, seed: 49 });
    if (win) g += `<g clip-path="url(#${clip})">${ice(50, 400, 1500, 524, 548)}${ice(51, -100, 1300, 772, 806)}</g>`;
    g += K.lilies({ seed: 52, x0: 80, x1: 560, y0: 650, y1: 770, n: win ? 8 : 26, season, flowers: sum ? .45 : 0 });
    g += K.lilies({ seed: 53, x0: 1180, x1: 1560, y0: 560, y1: 640, n: win ? 5 : 16, season, flowers: sum ? .3 : 0 });
    // rising fish and the rings where they broke the surface (fewer in the cold)
    g += K.fish(640, 640, .55, { dur: 12 }) + K.fish(980, 590, .4, { dur: 15, d: 6 });
    if (!win) g += K.fish(330, 720, .7, { dur: 10, d: 3, flip: true }) + K.fish(1340, 690, .6, { dur: 13, d: 9 });
    g += K.ripples(760, 600, { rx: 26, ry: 5, n: 3, dur: 6 }) + K.ripples(1120, 650, { rx: 34, ry: 6, n: 3, dur: 7, d: 2 }) + K.ripples(420, 600, { rx: 20, ry: 4, n: 2, dur: 5, d: 1 }) + K.ripples(1460, 740, { rx: 30, ry: 6, n: 3, dur: 8, d: 4 });
    // waterfowl: a pair of mute swans, mallards, coots and a moorhen by the reeds
    g += K.duck('swan', 860, 600, .62, { dx: 240, dur: 70, flip: true }) + K.duck('swan', 940, 612, .66, { dx: 220, dur: 74, d: 5, flip: true });
    g += K.duck('mallard', 520, 680, .62, { dx: 150, dur: 36 }) + K.duck('female', 566, 694, .6, { dx: 140, dur: 40, d: 4 });
    g += K.duck('coot', 1240, 580, .44, { dx: -120, dur: 28 }) + K.duck('coot', 300, 560, .36, { dx: 90, dur: 32, d: 7 });
    g += K.duck('moorhen', 150, 762, .62, { dx: 70, dur: 24, flip: true });
    if (!win) g += K.duck('mallard', 1380, 610, .5, { dx: -110, dur: 30, d: 9, flip: true });
    g += K.heron(1580, 640, .5, { flip: true });
    // 4. the near bank: earth and turf left and right of the water, the bank path along the front
    g += K.land({ d: 'M-160 804Q140 818 420 800Q760 778 1120 788Q1460 794 1760 764V900H-160z', top: p.grass[1], bottom: p.ground[0], y0: 770, y1: 900, seed: 54, speckle: 260 });
    g += K.stones({ seed: 83, x0: 380, x1: 1120, y0: 782, y1: 800, n: 26, season });
    if (!lite) g += K.turf({ seed: 56, x0: -160, x1: 1000, y0: 806, y1: 900, rows: 6, lobe: [22, 70], season });
    if (!lite) g += K.turf({ seed: 57, x0: 1000, x1: 1760, y0: 776, y1: 900, rows: 7, lobe: [22, 74], season });
    g += K.track({ seed: 58, pts: [[1760, 776, 40], [1520, 800, 64], [1260, 836, 96], [1080, 900, 150]], season, stones: 40, roots: 4, puddles: win || aut ? 2 : 0, sky: L.low });
    // the wooden swim with an angler (the pool is a day-ticket fishery), his float out on the water
    g += swim(L, 1290, 790, .55, 1080, 724, 59);
    // 5. framing trees: a big Scots pine on the left, birches on both banks, an oak at the right edge
    g += K.tree('pine', 40, 880, 1.55, { season, seed: 60, flutter: 0 });
    g += K.tree('birch', 300, 840, 1.0, { season, seed: 61, flutter: 8, fall: aut ? 10 : 0, ground: 880, snow: win });
    if (!lite) g += K.tree('birch', 420, 812, .72, { season, seed: 62, flutter: 5, fall: aut ? 6 : 0, ground: 860, snow: win });
    g += K.tree('birch', 1500, 800, 1.05, { season, seed: 63, flutter: 8, fall: aut ? 10 : 0, ground: 880, snow: win, flip: true });
    g += K.tree('oak', 1700, 820, 1.3, { season, seed: 64, flutter: 10, fall: aut ? 12 : 0, ground: 890, snow: win });
    if (!lite) g += K.tree('alder', 1060, 790, .5, { season, seed: 65, flutter: 4, snow: win });
    // creatures in the trees and on the bank
    g += K.squirrel(1690, 812, .9) + K.robin(470, 846, 1.05);
    if (dusk) g += K.owl(70, 470, 1);
    if (L.dark < .8) g += K.walker(1660, 790, .62, { dog: true, dx: -260, dy: 40, dur: 44, seed: 5, flip: true });
    // 6. the margins: reed beds (bulrushes and plumes), rush and bracken, ferns and a fallen log
    g += K.reeds({ seed: 66, x0: -160, x1: 260, y0: 760, y1: 830, n: 38, season, k0: .5, k1: .8, kinds: ['bulrush', 'plume'] });
    g += K.reeds({ seed: 67, x0: 860, x1: 1100, y0: 770, y1: 830, n: 22, season, k0: .45, k1: .7, kinds: ['plume', 'bulrush'] });
    g += K.reeds({ seed: 68, x0: 1420, x1: 1760, y0: 750, y1: 790, n: 22, season, k0: .4, k1: .62 });
    g += K.bracken({ seed: 69, x0: 1400, x1: 1760, y0: 800, y1: 880, n: 16, season });
    if (!lite) g += K.bracken({ seed: 70, x0: -160, x1: 200, y0: 830, y1: 880, n: 10, season });
    if (!lite) g += K.fern(560, 880, .7, { season }) + K.fern(200, 900, .9, { season }) + K.fern(1560, 900, .8, { season });
    g += K.log(700, 900, .62, { season }) + K.gorse(1020, 900, .6, { season, seed: 71 });
    // 7. the very front: blades of grass and flowers in the gusts
    if (!lite) g += K.wind(K.blades({ seed: 72, x0: -160, x1: 720, y0: 850, y1: 930, n: 54, h: 66, season, heads: sum || aut ? .25 : 0 })
      .concat(K.blades({ seed: 73, x0: 1080, x1: 1760, y0: 850, y1: 930, n: 54, h: 66, season, heads: sum || aut ? .25 : 0 }))
      .concat(win ? [] : K.blooms({ seed: 74, x0: -120, x1: 1700, y0: 860, y1: 900, n: 30, kinds: spr ? ['celandine', 'bluebell', 'anemone'] : sum ? ['foxglove', 'harebell', 'campion'] : ['ragwort', 'harebell'] })), { strips: 8 });
    // 8. the air: bats and an owl at dusk, rooks to roost, damsels and dragonflies over the water
    if (dusk) g += K.bats({ seed: 75, n: 7, x: 800, y: 380, spread: 380 }) + K.moths(300, 640, { n: 4 });
    if (L.dark < .7) g += K.flock({ seed: 76, n: 9, x: 1700, y: 210, s: 1.1, dx: -1900, dy: 50, dur: 60, col: '#2a2a30' });
    if (day && (sum || spr)) g += K.dragonfly(700, 720, .9, { dx: 180, dy: 30 }) + K.dragonfly(1180, 700, .8, { col: '#c0302a', dx: -150 }) + K.dragonfly(240, 740, .7, { col: '#3a6ad8', dx: 120, dy: -20 });
    if (sum && L.dark < .7) g += midges(77, 620, 560, 26) + K.flock({ seed: 78, n: 4, x: 200, y: 470, s: .7, dx: 900, dy: 20, dur: 18 });
    if (aut) g += K.falling({ seed: 79, n: 30, x0: -100, x1: 1700, y0: -20, y1: 600, dy: 540, dx: 160, cols: p.leaf.birch.concat(p.leaf.oak) });
    if (spr) g += K.falling({ seed: 80, n: 20, x0: 0, x1: 1600, y0: 80, y1: 600, kind: 'seed', cols: ['#e8d88a', '#d8c870'], dx: 200, dy: 260 }) + K.butterfly(820, 820, .9, { kind: 'brimstone', dx: 200, dy: 40 });
    if (sum) g += K.motes({ seed: 81, n: 22, x0: 100, x1: 1500, y0: 520, y1: 820 });
    if (win) g += K.snow({ n: 30 });
    if (!lite && (aut || win || L.alt < 4)) g += K.mist({ seed: 82, y: 560, h: 46, n: 3, op: win ? .55 : .42, x0: -100, x1: 1700 });
    return s + twinkle + K.tone(L, g) + K.weather(L) + K.grade(L);
  });

  const place = "wyndhams-pool", label = "Wyndham's Pool", town = 'Yateley', kind = 'landscape', tags = ["pond","woodland","reeds"];
  const seasonalReasons = {
    spring: "Spring evening at the wooded pool",
    summer: "Warm evening water beneath the trees",
    autumn: "Autumn evening at the wooded bank",
    winter: "Winter evening at the misty pool",
  };
  const view = 3, originalSeason = 'summer';
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const reason = seasonalReasons[season];
    add('hampshire', kind, { id: `${place}-${view + 1}${season !== originalSeason ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: 'dreamy', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: 'evening', viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      svg: (o = {}) => scene(season, o) });
  }
}
