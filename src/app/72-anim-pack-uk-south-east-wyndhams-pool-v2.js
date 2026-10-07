// UK_SCENE_PART: uk-south-east/wyndhams-pool-v2
/* Wyndham's Pool — the Common's wooded pond, reed margins and pool life.
     https://www.hants.gov.uk/thingstodo/countryside/walking/yateleycommon
     https://hwas.co.uk/wyndhams-pool-hospital-pond/
   View 2 of 4 (close): one file per view, so each view's art can change without
   touching the others (the other views: 72-anim-pack-uk-south-east-wyndhams-pool-v1..v4.js).
   Drawn with the rich nature kit T.K (src/app/71-anim-uk-nature-kit.js). Keep every id,
   ukPlace, ukView, ukSeason and season unchanged so saved pins and the rotation keep working.

   Brief (this view): Wyndham's Pool, off Cricket Hill Lane on Yateley Common, is the
   Common's largest pond: a man-made pool from the 17th/18th century (probably named after
   the Wyndhams of Minley Manor), once a fish pond, later a bathing pool, drained in WWII
   and refilled behind a rebuilt dam; now a club fishery with pegs along the bank. It sits in
   birch and Scots pine on heathy ground, with reed and bulrush margins and water lilies,
   and is known for its dragonflies and damselflies (part of the Common's SSSI).
   The close view: from the reedy near bank looking south-west across the open water to the
   wooded far shore, the bank path and an angler's peg on the right. */
function ukSouthEastWyndhamsPoolV2(T) {
  const { add } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js)
  const LAT = 51.34, LON = -0.83, WL = 472;   // WL: the far waterline

  // Place helpers: a wooden fishing peg (platform and post) and a seated angler whose rod tip nods.
  const peg = (x, y, k) => K.at(x, y, k, `<path fill="#5c4630" d="M-62 0l8-16h112l8 16z"/><path fill="#7d6244" d="M-58-16h116v-6H-58z"/><path stroke="#4a3826" stroke-width="5" d="M-50 0v26M50 0v26M0 0v30"/><path fill="none" stroke="#a88a62" stroke-width="1.5" opacity=".6" d="M-56-19h112M-40-16l-4 16M-10-16l-3 16M22-16l-2 16"/>`);
  const angler = (L, x, y, k, flip) => {
    const fx = flip ? -1 : 1, torch = L.dark > .55 ? K.keep(K.glow(x + fx * 16 * k, y - 66 * k, 26 * k, '#fff2c0', .5) + `<circle cx="${Math.round(x + fx * 16 * k)}" cy="${Math.round(y - 66 * k)}" r="${(2.4 * k).toFixed(1)}" fill="#fff6d8"/>`) : '';
    return K.at(x, y, k, `<path fill="#3a5a3a" d="M-30-6h30v-22h-30z"/><path stroke="#2a2a2a" stroke-width="3" d="M-28-6l-6 12M-2-6l6 12"/>` +
      `<path fill="#4a5a44" d="M-14-28q-6-26 8-34 14-2 16 12l2 22z"/><path fill="#3a3a3a" d="M-8-28l16 2 18 16-4 4-18-12z"/><circle cx="2" cy="-66" r="8" fill="#d8b090"/><path fill="#2f4030" d="M-7-68q2-10 10-9 8 1 8 8z"/>` +
      `<path stroke="#2a2420" stroke-width="2.4" d="M6-44l22 4"/>` +
      T.mv('ukybranch', { ad: '6.5s', to: '26px -40px' }, `<path fill="none" stroke="#2a2420" stroke-width="2" d="M26-40L160-132"/><path fill="none" stroke="#e8e8e0" stroke-width=".8" opacity=".7" d="M160-132q30 70 60 168"/>`), flip) + torch;
  };
  // A weathered marker stake at the water's edge (a perch).
  const post = (x, y, k) => K.at(x, y, k, `<ellipse cy="2" rx="14" ry="3" fill="#14261e" opacity=".3"/><path fill="#6a5440" d="M-6 0l1-62h10l1 62z"/><path fill="none" stroke="#9a8466" stroke-width="2" d="M-2-58v52"/><path fill="#8a7458" d="M-5-62h10l-1-3h-8z"/>`);
  // A thin shelf of ice and rime along a shore (winter).
  const ice = (d) => `<path fill="#e4eef2" opacity=".62" d="${d}"/><path fill="none" stroke="#ffffff" stroke-width="1.5" opacity=".7" d="${d}"/>`;

  const scene = (season, o) => K.scene(o, () => {
    const spring = season === 'spring', summer = season === 'summer', autumn = season === 'autumn', winter = season === 'winter';
    const L = K.live(o, { heading: 228, fov: 76, horizon: WL, season, at: 'afternoon', lat: LAT, lon: LON });
    const p = K.pal(season), U = T.U, big = K.lod() >= 1;   // full screen: every piece; small tiles: the main ones
    const hazeCol = K.mix(L.haze, L.low, .4);
    let s = K.liveBackdrop(L, { seed: 31, cloudY: [30, 330] });
    if (L.dark < .5) s += K.flock(autumn || winter ? { seed: 32, n: 7, x: 260, y: 170, s: .9, v: true, dx: 1100, dy: -40, dur: 46, col: '#2a3038' } : { seed: 32, n: 4, x: 420, y: 230, s: .7, dx: 900, dur: 34 });
    else if (!winter) s += K.bats({ seed: 33, n: 4, x: 820, y: 330, spread: 260, s: 1.1 });

    // far shore: two rows of wood, birch and Scots pine with oak, mirrored in the pool
    const far = U();
    let wood = K.woods({ seed: 41, y: WL - 14, h: [52, 84], mix: { pine: .45, birch: .35, oak: .2 }, season, haze: .55, hazeCol, sway: 0, ground: K.mix(p.grass[1], hazeCol, .55), foot: 16 });
    wood += K.woods({ seed: 42, y: WL - 2, h: [92, 150], mix: { pine: .4, birch: .4, oak: .2 }, season, haze: .26, hazeCol, ground: K.mix(p.grass[0], hazeCol, .3), foot: 10 });
    if (big) wood += K.tree('pine', 1060, WL - 2, .44, { season, seed: 43, haze: .2, hazeCol });
    if (big) wood += K.tree('birch', 300, WL, .38, { season, seed: 44, haze: .2, hazeCol, flutter: 4 });
    wood += K.reeds({ seed: 45, x0: -160, x1: 520, y0: WL - 6, y1: WL + 4, n: 34, season, k0: .25, k1: .32, haze: .3, hazeCol });
    wood += K.reeds({ seed: 46, x0: 1180, x1: 1760, y0: WL - 6, y1: WL + 4, n: 30, season, k0: .25, k1: .32, haze: .3, hazeCol, kinds: ['plume'] });
    let g = `<g id="${far}">${wood}</g>`;
    // a low reedy spit from the left bank, with young birch and alder, the swim beyond it
    const spit = `M-160 ${WL + 40}Q60 ${WL + 30} 230 ${WL + 46}Q300 ${WL + 56} 250 ${WL + 64}Q90 ${WL + 72} -160 ${WL + 70}z`;
    let sp = K.land({ d: spit, top: K.mix(p.grass[1], hazeCol, .2), bottom: K.mix(p.ground[0], hazeCol, .2), y0: WL + 30, y1: WL + 72, seed: 39 });
    if (big) sp += K.tree('alder', -40, WL + 52, .42, { season, seed: 37, haze: .12, hazeCol }) + K.tree('birch', 70, WL + 50, .5, { season, seed: 38, haze: .1, hazeCol, flutter: 5 }) + K.tree('birch', 170, WL + 54, .34, { season, seed: 36, haze: .12, hazeCol });
    sp += K.reeds({ seed: 35, x0: -160, x1: 280, y0: WL + 50, y1: WL + 72, n: 40, season, k0: .4, k1: .5 });
    if (L.dark < .6) g += K.mist({ seed: 47, y: WL - 8, h: 26, n: 4, op: winter ? .6 : autumn ? .45 : .25, col: K.mix('#f2f6f4', L.low, .3) });

    // the open water: sky-coloured, the far wood mirrored, lines, shimmer, the sun or moon road
    const clip = U(), waterD = `M-160 ${WL - 2}Q400 ${WL + 4} 800 ${WL}T1760 ${WL + 2}V900H-160z`;
    let w = K.water({ d: waterD, y0: WL, y1: 900, cols: L.water(winter ? ['#a8c4cc', '#6a8e9c', '#2e5060'] : ['#8ab4b0', '#3f7680', '#1a4450']), clip, reflect: [], lines: 70, shimmer: 46, glints: L.dark > .5 ? 0 : 10, sky: L.low, keepSky: true, seed: 48 });
    // the far wood mirrored: a still copy (a wobbling copy of the whole wood costs a full repaint every frame)
    w += `<g clip-path="url(#${clip})"><use href="#${far}" transform="matrix(1 0 0 -1 0 ${WL * 2})" opacity=".5"/></g>`;
    w += K.lightPath(L, { y0: WL + 4, y1: 780, w: 50, clip });
    w += sp;
    if (winter) w += ice(`M-160 ${WL}h1920v10q-300 6-620 2t-700 6q-400-2-600-6z`);
    // lily pads in the bay (flowers in summer), rising fish and their rings
    if (!winter) w += K.lilies({ seed: 49, x0: 220, x1: 760, y0: 560, y1: 660, n: 22, season, flowers: .45 }) + K.lilies({ seed: 50, x0: 860, x1: 1120, y0: 520, y1: 580, n: 10, season, flowers: .35 });
    w += K.fish(640, 560, .55, { dur: 11, d: 2, col: '#7a7a5a' }) + K.fish(1040, 610, .7, { dur: 14, d: 8, col: '#8a8462', flip: true });
    w += K.ripples(470, 520, { rx: 30, ry: 5, n: 3, dur: 5 }) + K.ripples(880, 700, { rx: 46, ry: 8, n: 3, dur: 6, d: 2 }) + K.ripples(1180, 540, { rx: 24, ry: 4, n: 2, dur: 4.5, d: 1 });
    // water birds (the reason for spring: a duck with her brood beside the reeds)
    w += K.duck('swan', 560, 512, .55, { dx: 180, dur: 60 });
    w += K.duck('mallard', 860, 600, .62, { dx: -150, dur: 38 }) + K.duck('female', 920, 612, .6, { dx: -150, dur: 38, d: 3 });
    w += K.duck('coot', 330, 548, .5, { dx: 110, dur: 30 }) + K.duck('coot', 1240, 530, .42, { dx: -80, dur: 26, flip: true });
    w += K.duck('moorhen', 420, 700, .66, { dx: 90, dur: 28 });
    if (spring) { w += K.duck('female', 700, 676, .7, { dx: 140, dur: 34, d: 4 }); for (let i = 0; i < 4; i++) w += K.duck('female', 640 - i * 26, 682 + (i % 2) * 6, .28, { dx: 140, dur: 34, d: 4.6 + i * .25 }); }
    if (L.dark < .7) w += K.heron(150, WL + 12, .4, { dur: 14 });
    g += w;

    // the near bank on the right: heathy ground, the path, the peg, birch and pine
    const bankD = 'M1760 900V600Q1560 604 1400 650Q1250 700 1140 780Q1060 846 980 900z';
    g += K.land({ d: bankD, top: K.mix(p.grass[1], p.ground[1], .4), bottom: p.ground[0], y0: 600, y1: 900, seed: 51, speckle: 220 });
    g += K.stones({ seed: 52, x0: 1000, x1: 1420, y0: 680, y1: 880, n: 30 });
    g += K.heath({ seed: 53, x0: 1440, x1: 1760, y0: 606, y1: 660, n: 60, season, k0: .35, k1: .55, grass: 30 });
    if (big) g += K.heath({ seed: 65, x0: 1180, x1: 1460, y0: 690, y1: 760, n: 36, season, k0: .5, k1: .7, grass: 30 });
    if (big) g += K.grass({ seed: 66, x0: 1060, x1: 1400, y0: 740, y1: 800, n: 50, season, k0: .6, k1: .9 });
    if (big) g += K.heath({ seed: 67, x0: 1500, x1: 1760, y0: 720, y1: 860, n: 40, season, k0: .7, k1: 1.1, grass: 20 });
    g += K.track({ pts: [[1780, 640, 44], [1600, 660, 64], [1480, 710, 96], [1400, 790, 150], [1360, 910, 230]], seed: 54, season, stones: 50, roots: 4, puddles: winter || autumn ? 2 : 0, sky: L.low });
    g += K.tree('birch', 1560, 660, .92, { season, seed: 55, flutter: 8, fall: autumn ? 14 : 0, ground: 700 });
    g += K.tree('pine', 1700, 700, 1.15, { season, seed: 56 });
    if (big) g += K.tree('birch', 1440, 690, .7, { season, seed: 57, flutter: 6, flip: true });
    g += K.bracken({ seed: 58, x0: 1600, x1: 1760, y0: 680, y1: 760, n: 12, season, s: .9 });
    g += K.fern(1520, 720, .7, { season }) + K.log(1660, 800, .55, { season });
    g += peg(1210, 764, .9) + angler(L, 1210, 748, .9, true);
    if (L.dark < .55) g += K.walker(1690, 650, .42, { dx: -180, dy: 40, dog: true, seed: 7, dur: 40 });
    g += K.squirrel(1600, 712, .9);
    g += K.grass({ seed: 59, x0: 1080, x1: 1760, y0: 760, y1: 910, n: 70, season, k0: .9, k1: 1.5 });
    const fl = spring ? ['celandine', 'anemone', 'daisy'] : summer ? ['ragwort', 'knapweed', 'clover', 'harebell'] : autumn ? ['ragwort', 'harebell'] : null;
    if (fl) g += K.meadow({ seed: 60, x0: 1120, x1: 1760, y0: 800, y1: 905, n: 40, k0: 1, k1: 1.5, flowers: spring ? 26 : summer ? 30 : 8, kinds: fl, season });

    // the near reed bed on the left, in the shallows: big strap leaves, bulrushes and plumes
    g += K.reeds({ seed: 61, x0: -160, x1: 240, y0: 600, y1: 690, n: 26, season, k0: .6, k1: .9 });
    g += K.reeds({ seed: 62, x0: -160, x1: 380, y0: 720, y1: 820, n: 26, season, k0: .9, k1: 1.4 });
    g += K.reeds({ seed: 63, x0: -160, x1: 300, y0: 830, y1: 930, n: 22, season, k0: 1.5, k1: 2.1 });
    g += K.reeds({ seed: 68, x0: 300, x1: 560, y0: 860, y1: 930, n: 10, season, k0: 1.3, k1: 1.7, kinds: ['plume'] });
    g += K.reeds({ seed: 64, x0: 900, x1: 1080, y0: 850, y1: 930, n: 9, season, k0: 1.3, k1: 1.7, kinds: ['bulrush'] });
    if (winter) g += post(1110, 806, 1.1) + K.robin(1110, 738, 1.5, { dur: 4 }) + K.robin(300, 836, 1.1, { flip: true, dur: 6 });
    else g += K.robin(1140, 752, .9, { dur: 5 });

    // insects: dragonflies over the reeds (the summer reason), damselflies in spring, darters in autumn
    const dr = summer ? [[420, 640, '#2f7ac6', 1.4], [700, 760, '#4a9ad6', 1.2], [980, 700, '#c84a2a', 1], [260, 560, '#3a8ad0', .9], [1120, 640, '#6aa0c8', 1.1], [560, 600, '#2fa0b0', .8]]
      : spring ? [[380, 660, '#3a8ad0', .7], [720, 720, '#4ab0c0', .6], [980, 690, '#c84a2a', .7]] : autumn ? [[500, 680, '#c0402a', .9], [880, 720, '#b8402a', .8], [1100, 650, '#c84a2a', .8]] : [];
    if (L.dark < .5) for (const [x, y, col, k] of dr) g += K.dragonfly(x, y, k, { col, dx: 120 + (x % 70), dy: -30 - (y % 40) });
    if ((spring || summer) && L.dark < .5) g += K.butterfly(1300, 820, .9, { kind: spring ? 'brimstone' : 'admiral' }) + K.butterfly(1500, 760, .8, { kind: spring ? 'orangetip' : 'blue' }) + K.bee(1420, 850, 1);
    if (L.dark > .6 && !winter) g += K.moths(1520, 720, { n: 5 }) + K.moths(300, 640, { n: 4 });

    // seasonal air
    if (autumn) g += K.falling({ seed: 70, n: 22, x0: 1100, x1: 1760, y0: 260, y1: 640, dy: 420, dx: -260, cols: ['#e8b43a', '#d9902a', '#f2cc5a', '#c0702a'] });
    if (spring) g += K.petals({ seed: 71, n: 10, x0: 1000, x1: 1700, y0: 300, y1: 700, cols: ['#e8e0a0', '#f4f0d0'] }) + K.motes({ seed: 72, n: 10, x0: 200, x1: 1400, y0: 480, y1: 760 });
    if (summer) g += K.motes({ seed: 73, n: 18, x0: 100, x1: 1500, y0: 500, y1: 820 });
    if (winter) g += K.motes({ seed: 74, n: 14, x0: 0, x1: 1600, y0: 300, y1: 800, cols: ['#ffffff', '#e8f4ff'], dy: 160, dx: 60 });

    return s + K.tone(L, g) + K.weather(L) + K.grade(L);
  });

  const place = "wyndhams-pool", label = "Wyndham's Pool", town = 'Yateley', kind = 'landscape', tags = ["pond","woodland","reeds"];
  // Four composed views per season. The summer wide/close/evening and the autumn third view keep the original saved refs.
  const seasonalReasons = {
    spring: ["New birch leaves above the spring pool","Spring waterbirds beside the reeds","Catkins over the woodland margin","Spring evening at the wooded pool"],
    summer: ["Leafy shade and open summer water","Dragonflies above the near reeds","Summer waterbirds at the woodland margin","Warm evening water beneath the trees"],
    autumn: ["Golden birches above the wooded pool","Falling leaves beside the near reeds","Autumn birches along the water","Autumn evening at the wooded bank"],
    winter: ["Bare birches above winter water","A robin beside the frost-lined reeds","Snow over the frozen woodland pool","Winter evening at the misty pool"],
  };
  for (const view of [1]) for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const originalSeason = view === 2 ? 'autumn' : 'summer', reason = seasonalReasons[season][view];
    add('hampshire', kind, { id: `${place}-${view + 1}${season !== originalSeason ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: view === 3 ? 'dreamy' : 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: ['wide', 'close', 'detail', 'evening'][view], viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      svg: (o = {}) => scene(season, o) });
  }
}
