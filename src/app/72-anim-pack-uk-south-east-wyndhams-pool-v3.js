// UK_SCENE_PART: uk-south-east/wyndhams-pool-v3
/* Wyndham's Pool — the Common's wooded pond, reed margins and dusk wildlife.
     https://www.hants.gov.uk/thingstodo/countryside/walking/yateleycommon
     https://hwas.co.uk/wyndhams-pool-hospital-pond/
   View 3 of 4 (detail): one file per view, so each view's art can change without
   touching the others (the other views: 72-anim-pack-uk-south-east-wyndhams-pool-v1..v4.js).
   Drawn with the rich nature kit T.K (src/app/71-anim-uk-nature-kit.js). Keep every id, ukPlace,
   ukView, ukSeason and season unchanged so saved pins and the rotation keep working.

   Brief (this view): the largest pond on Yateley Common, man-made (probably a medieval-style fish
   pond, a bathing pool in the early 1900s, drained in WWII, later restocked and still fished), ringed
   by birch, Scots pine and oak with reed and bulrush margins and water-lilies. Known for scarce
   dragonflies (black darter, downy emerald), mallard, coot, moorhen and mute swan, carp and tench
   rising, and bats feeding over the water at dusk. The detail view: from the bank path on the south
   side, looking west-south-west across the water to the far wooded bank, past an angler's peg. */
function ukSouthEastWyndhamsPoolV3(T) {
  const { add, U, mv, rnd } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js); null only if that file is missing
  const LAT = 51.34, LON = -0.83;

  // An angler's wooden peg on the near bank, with a rod and a float bobbing out on the water.
  const peg = (x, y, s, floatX, floatY) => K.at(x, y, s,
    '<path fill="#6e5a42" d="M-70 0l10-26h140l-8 26z"/><path fill="#8e7656" d="M-60-26h140l-6 6H-64z"/>' +
    '<path fill="none" stroke="#4f3f2e" stroke-width="2" d="M-40-24v24M0-24v24M40-24v24"/><path stroke="#4a3a2a" stroke-width="6" d="M-55 0v24M66 0v22"/>' +
    '<path fill="#3d4a3a" d="M-20-26v-14h26v14z"/><path fill="#2f3a2e" d="M-24-42h34v4h-34z"/>') +
    `<path fill="none" stroke="#2a2420" stroke-width="2" d="M${x + 20 * s} ${y - 40 * s}L${x - 160 * s} ${y - 170 * s}"/>` +
    `<path fill="none" stroke="#e8e4da" stroke-width=".8" opacity=".7" d="M${x - 160 * s} ${y - 170 * s}Q${(x - 160 * s + floatX) / 2} ${y - 90 * s} ${floatX} ${floatY}"/>` +
    mv('uknbob', { ad: '3.4s', dy: '2px' }, `<path fill="#e8402a" d="M${floatX - 2} ${floatY}v-9h4v9z"/><ellipse cx="${floatX}" cy="${floatY + 1}" rx="6" ry="1.6" fill="none" stroke="#eefcf6" stroke-width="1" opacity=".7"/>`);

  // Birch catkins (spring lambs' tails) hanging from the near birch's crown, swaying.
  const catkins = (seed, x0, x1, y0, y1, n) => {
    const r = rnd(seed); let d = '', g = '';
    for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), l = 8 + r() * 10; d += `M${Math.round(x)} ${Math.round(y)}q${(r() * 4 - 2).toFixed(1)} ${Math.round(l / 2)} ${(r() * 3 - 1).toFixed(1)} ${Math.round(l)}`; if (i % 3 === 0) g += K.circ(x + 1, y + l, 1.4); }
    return K.sway(x0, K.S('#b89a4a', 3, d) + K.P('#d9c470', g), 'soft');
  };

  // Ice on the winter pool: a pale sheet with cracks and a dark open lead where the birds gather.
  const ice = (seed, clip) => {
    const r = rnd(seed); let cr = '';
    for (let i = 0; i < 26; i++) { const x = -160 + r() * 1920, y = 510 + Math.pow(r(), .8) * 360, k = .4 + (y - 510) / 360; cr += `M${Math.round(x)} ${Math.round(y)}l${Math.round((20 + r() * 60) * k)} ${Math.round((r() * 10 - 5) * k)}l${Math.round((10 + r() * 40) * k)} ${Math.round((r() * 14 - 4) * k)}`; }
    return `<g clip-path="url(#${clip})"><path fill="#dfe9ee" opacity=".72" d="M-160 498H1760V900H-160z"/><path fill="#9fb6c2" opacity=".55" d="M560 610q160-26 330-6 120 20 40 50-200 34-380 6-90-24 10-50z"/>` +
      K.S('#ffffff', 1.6, cr, ' opacity=".7"') + K.S('#9aaab4', 1, cr.replace(/M(-?\d+) (\d+)/g, (m, a, b) => `M${a} ${+b + 2}`), ' opacity=".5"') + '</g>';
  };

  const scene = (season, o) => K.scene(o, () => {
    const L = K.live(o, { heading: 245, fov: 80, horizon: 470, season, at: season === 'autumn' ? 'golden' : 'afternoon', lat: LAT, lon: LON });
    const p = K.pal(season), win = season === 'winter', aut = season === 'autumn', spr = season === 'spring', sum = season === 'summer';
    const S0 = 9300 + ['spring', 'summer', 'autumn', 'winter'].indexOf(season) * 97;
    const day = L.dark < .5, dusk = L.dark > .3, lo = K.lod() < 1;   // lo: a small tile (the kit draws about 20% of the detail; skip the extras too)
    const s = K.liveBackdrop(L, { seed: S0 + 1, cloudY: [30, 330] });
    let g = '';
    // 1. distant woods beyond the pool (hazy), then 2. the far wooded bank, mirrored in the water
    if (!lo) g += K.woods({ seed: S0 + 2, y: 476, h: [50, 82], mix: { pine: .45, birch: .3, oak: .25 }, season, haze: .55, sway: 0, snow: win });
    const far = U();
    let farBank = K.woods({ seed: S0 + 3, y: 504, h: [100, 165], mix: { pine: .35, birch: .4, oak: .25 }, season, haze: .2, snow: win });
    if (!lo) farBank += K.tree('pine', 1180, 506, .42, { season, seed: S0 + 4, snow: win }) + K.tree('birch', 420, 507, .36, { season, seed: S0 + 5, flutter: 4, snow: win }) + K.tree('birch', 470, 508, .3, { season, seed: S0 + 6, snow: win });
    farBank += K.land({ d: 'M-160 498Q400 494 800 500T1760 497V512H-160z', top: K.mix(p.grass[0], L.haze, .3), bottom: p.ground[0], y0: 496, y1: 512 });
    if (!lo) farBank += K.reeds({ seed: S0 + 7, x0: -160, x1: 700, y0: 500, y1: 514, n: 46, season, k0: .22, k1: .3, haze: .2 }) + K.reeds({ seed: S0 + 8, x0: 1300, x1: 1760, y0: 500, y1: 514, n: 30, season, k0: .22, k1: .3, haze: .2 });
    g += `<g id="${far}">${farBank}</g>`;
    // 3. the pool: sky-mirroring water, the far bank's reflection, the sun's or moon's road
    const clip = U(), pond = 'M-160 506H1760V640Q1560 650 1420 704Q1180 784 980 834Q700 892 420 862Q200 826-160 766z';
    g += K.water({ d: pond, y0: 506, y1: 900, cols: L.water(win ? ['#b8c8d0', '#7f98a6', '#5a7282'] : ['#6f9a8a', '#2f5e5a', '#173a3e']), clip, reflect: [{ id: far, y: 508, op: win ? .25 : .5 }], keepSky: true, lines: 70, shimmer: win ? 10 : 46, glints: L.sun.show && !win ? 14 : 0, gx0: L.sun.x - 180, gx1: L.sun.x + 180, sky: L.low, seed: S0 + 9 });
    if (!win) g += K.lightPath(L, { y0: 512, y1: 860, w: 46, clip, seed: S0 + 10 });
    if (win) g += ice(S0 + 11, clip);
    // in the water: lilies, rising fish and rings, a reed island near the far bank
    if (!win) g += K.lilies({ seed: S0 + 12, x0: 380, x1: 1060, y0: 640, y1: 790, n: aut ? 18 : 30, season, flowers: .45 }) + K.lilies({ seed: S0 + 13, x0: 40, x1: 360, y0: 560, y1: 640, n: 12, season, flowers: .3 });
    if (!win) g += `<g clip-path="url(#${clip})">` + K.fish(640, 600, .7, { dur: 11 }) + K.fish(1120, 660, .8, { dur: 14, d: 5, flip: true }) + K.fish(300, 700, .9, { dur: 17, d: 9 }) +
      K.ripples(860, 560, { rx: 24, ry: 4, n: 3, dur: 5 }) + K.ripples(520, 720, { rx: 34, ry: 6, n: 3, dur: 6.5, d: 2 }) + K.ripples(1300, 600, { rx: 20, ry: 4, n: 2, dur: 4.4, d: 1 }) + '</g>';
    if (!lo) g += K.reeds({ seed: S0 + 41, x0: 1460, x1: 1640, y0: 528, y1: 552, n: 16, season, k0: .4, k1: .5 });
    if (!win) g += K.log(560, 580, .35, { season, flip: true });
    g += K.stones({ seed: S0 + 42, x0: 700, x1: 1200, y0: 846, y1: 872, n: 24, s: 1.1 });
    g += K.reeds({ seed: S0 + 14, x0: 120, x1: 330, y0: 530, y1: 556, n: 22, season, k0: .4, k1: .5 });
    // birds on the water (on the open lead in winter)
    if (win) g += K.duck('mallard', 640, 628, .55, { dx: 120, dur: 30 }) + K.duck('female', 700, 640, .55, { dx: 110, dur: 34, d: 6 }) + K.duck('coot', 820, 618, .45, { dx: -70, dur: 24 }) + K.duck('swan', 1010, 560, .5, { still: true, flip: true }) + K.duck('moorhen', 1460, 700, .5, { dx: -40, dur: 20 });
    else {
      g += K.duck('swan', 980, 640, .95, { dx: 240, dur: 70, flip: true }) + K.duck('mallard', 620, 650, .7, { dx: 180, dur: 36 }) + K.duck('female', 680, 668, .7, { dx: 160, dur: 40, d: 5 });
      g += K.duck('coot', 420, 590, .5, { dx: -110, dur: 26 }) + K.duck('coot', 1240, 610, .45, { dx: 90, dur: 30, d: 8 }) + K.duck('moorhen', 1380, 690, .55, { dx: -70, dur: 22 }) + K.duck('moorhen', 240, 750, .6, { dx: 80, dur: 24, d: 3 });
      if (spr) for (let i = 0; i < 4; i++) g += K.duck('female', 740 + i * 26, 690 + (i % 2) * 6, .3, { dx: 150, dur: 40, d: 5 + i * .4 });
      if (sum) for (let i = 0; i < 3; i++) g += K.duck('goose', 1010 + i * 34, 600 + (i % 2) * 5, .3, { dx: 240, dur: 70, flip: true });
    }
    if (aut || win) g += K.heron(260, 548, .42, { flip: true });
    // 4. the near bank: right-hand spit with alder, reeds and the angler's peg; the bank path along the front
    g += K.reeds({ seed: S0 + 15, x0: 1220, x1: 1760, y0: 630, y1: 720, n: 40, season, k0: .7, k1: 1 });
    g += K.reeds({ seed: S0 + 16, x0: -160, x1: 280, y0: 720, y1: 800, n: 34, season, k0: .8, k1: 1.15 });
    const bank = 'M-160 766Q200 826 420 862Q700 892 980 834Q1180 784 1420 704Q1560 650 1760 640V900H-160z';
    g += K.land({ d: bank, top: win ? '#e6ecee' : p.grass[1], bottom: win ? '#c4ccd0' : p.ground[0], y0: 640, y1: 900, seed: S0 + 17, speckle: 260 });
    if (!lo) g += K.turf({ seed: S0 + 18, x0: -160, x1: 820, y0: 872, y1: 910, rows: 4, lobe: [40, 90], season, cols: win ? ['#c8d0d0', '#dfe6e8', '#f2f6f6'] : undefined });
    g += K.tree('alder', 1440, 700, .62, { season, seed: S0 + 19, flutter: 6, fall: aut ? 6 : 0, ground: 740, snow: win }) + K.tree('pine', 1640, 690, .95, { season, seed: S0 + 20, snow: win });
    if (day) g += K.squirrel(1652, 560, .9);
    g += K.track({ seed: S0 + 21, pts: [[1760, 700, 22], [1520, 752, 36], [1260, 818, 56], [1000, 878, 84], [760, 950, 120]], season, stones: 34, roots: 4, puddles: aut || win ? 2 : 1, sky: L.low, cols: win ? ['#b8b4ac', '#dad6ce', '#f4f2ee'] : undefined });
    g += peg(905, 862, .8, 800, 770);
    if (spr) g += K.bluebells({ seed: S0 + 22, x0: 1460, x1: 1760, y0: 740, y1: 800, n: 40, patches: 6 });
    g += K.fern(1300, 780, .7, { season }) + K.fern(1560, 760, .8, { season, flip: true });
    if (!lo) g += K.bracken({ seed: S0 + 23, x0: 1480, x1: 1760, y0: 760, y1: 860, n: 18, season, s: 1.2 });
    g += K.log(1420, 870, .8, { season });
    if (aut || win) g += K.robin(1340, 836, 1.1);
    if (L.dark < .7) g += K.walker(1560, 720, .75, { dog: true, dx: -260, dy: 70, dur: 60, seed: S0 + 24 });
    // 5. the near birch on the left framing the view, its roots in the bank
    g += K.tree('birch', 150, 920, 1.3, { season, seed: S0 + 25, flutter: 12, fall: aut ? 14 : 0, ground: 900, snow: win }) + K.tree('birch', 330, 900, .9, { season, seed: S0 + 26, flutter: 8, fall: aut ? 8 : 0, ground: 900, snow: win });
    if (spr && !lo) g += catkins(S0 + 27, 10, 290, 400, 640, 50) + catkins(S0 + 40, 250, 420, 560, 700, 24);
    // 6. the foreground: grass, sedges and flowers along the path edge, swaying in gusts
    g += K.wind(K.blades({ seed: S0 + 28, x0: -160, x1: 900, y0: 820, y1: 940, n: 80, h: 70, season, heads: sum || aut ? .25 : 0, cols: win ? ['#9aa08a', '#c6c8b6', '#e8ecea'] : undefined })
      .concat(win ? [] : K.blooms({ seed: S0 + 29, x0: -120, x1: 700, y0: 850, y1: 920, n: 26, kinds: spr ? ['celandine', 'daisy', 'bluebell'] : sum ? ['harebell', 'clover', 'daisy'] : ['ragwort', 'harebell'] })), { strips: 8 });
    if (!lo) g += K.wind(K.blades({ seed: S0 + 30, x0: 1100, x1: 1760, y0: 860, y1: 940, n: 30, h: 80, season, heads: sum ? .3 : 0, cols: win ? ['#9aa08a', '#c6c8b6', '#e8ecea'] : undefined }), { strips: 5, x0: 1100, x1: 1760 });
    if (day && !win && L.alt > 12) g += K.dapple({ seed: S0 + 31, x0: 700, x1: 1500, y0: 790, y1: 900, n: 22, op: .25 });
    // insects, birds and bats
    if (day && (sum || aut)) g += K.dragonfly(560, 610, 1, { col: '#1d1d22', dx: 180 }) + K.dragonfly(1180, 690, .9, { col: '#2f7a4a', dx: -160, dy: 30 });
    if (day && sum) g += K.dragonfly(860, 720, .7, { col: '#3aa0e0', dx: 120, dy: 20 }) + K.dragonfly(260, 690, .6, { col: '#3aa0e0', dx: -90 }) + K.butterfly(600, 820, .9, { kind: 'brimstone', dx: 200 }) + K.motes({ seed: S0 + 32, n: 18, x0: 200, x1: 1400, y0: 520, y1: 820 });
    if (day && spr) g += K.butterfly(1200, 760, .9, { kind: 'orangetip', dx: -180 }) + K.bee(1560, 780, 1.1) + K.petals({ seed: S0 + 33, n: 14, x0: 0, x1: 1600, y0: 300, y1: 600, cols: ['#d9c470', '#b89a4a'] });
    if (day) g += K.flock({ seed: S0 + 34, n: 5, x: -100, y: 210, s: 1, dx: 1800, dy: -40, dur: 44 });
    if (day && (aut || win)) g += K.flock({ seed: S0 + 35, n: 7, x: 1700, y: 150, s: 1.2, dx: -1900, dy: 30, dur: 58, v: true, col: '#3a3a40' });
    if (dusk && !win) g += K.bats({ seed: S0 + 36, n: 5, x: 800, y: 430, spread: 360 }) + K.moths(1060, 760, { n: 4 });
    if (dusk) g += K.owl(1588, 470, .8);
    if (aut) g += K.falling({ seed: S0 + 37, n: 26, x0: -100, x1: 1700, y0: -20, y1: 520, dy: 520, dx: 160, cols: p.leaf.birch.concat(p.leaf.oak) });
    if (win) g += K.snow({ seed: S0 + 38, n: 40 });
    if (aut || (L.alt > -4 && L.alt < 10 && L.morning)) g += K.mist({ seed: S0 + 39, y: 540, h: 70, n: 5, op: aut ? .35 : .55 });
    return s + K.tone(L, g) + K.weather(L) + K.grade(L);
  });

  const place = "wyndhams-pool", label = "Wyndham's Pool", town = 'Yateley', kind = 'landscape', tags = ["pond","woodland","reeds"];
  const view = 2, originalSeason = 'autumn';   // the detail view; its autumn scene keeps the original saved ref
  const reasons = { spring: 'Catkins over the woodland margin', summer: 'Summer waterbirds at the woodland margin', autumn: 'Autumn birches along the water', winter: 'Snow over the frozen woodland pool' };
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const reason = reasons[season];
    add('hampshire', kind, { id: `${place}-${view + 1}${season !== originalSeason ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: 'detail', viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      svg: (o = {}) => scene(season, o) });
  }
}
