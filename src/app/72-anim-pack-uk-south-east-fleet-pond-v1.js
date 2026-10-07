// UK_SCENE_PART: uk-south-east/fleet-pond-v1
/* Fleet Pond — broad freshwater, reedbeds, woodland and viewing platforms.
     https://www.hart.gov.uk/fleet-pond   https://www.fleetpondsociety.co.uk
   View 1 of 4 (wide): one file per view, so each view's art can change without
   touching the others (the other views: 72-anim-pack-uk-south-east-fleet-pond-v1..v4.js).
   Drawn with the rich nature kit T.K (src/app/71-anim-uk-nature-kit.js). Keep every id,
   ukPlace, ukView, ukSeason and season unchanged so saved pins and the rotation keep working.

   Brief (this view): Fleet Pond is Hampshire's largest freshwater lake (about 21 ha of open
   water in a 52 ha Local Nature Reserve, an SSSI managed by Hart District Council with the
   Fleet Pond Society). Boardwalks cross the reedbeds (Phragmites, with reedmace) to viewing
   platforms on the open water; oak, birch, Scots pine and alder carr ring the shore, and the
   South Western main line runs along the north shore on its embankment, near Fleet station.
   Great crested grebes, mute swans, Canada geese, coots, mallards and grey herons are resident;
   gulls and duck gather in winter, hobbies and dragonflies hunt over the reeds in summer.
   Here: from the boardwalk's platform, looking west-north-west across the water (heading 300),
   so the summer and equinox sunsets set over the far wood and the railway. */
function ukSouthEastFleetPondV1(T) {
  const { add, U, R, rnd, mv } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js); null only if that file is missing
  if (!K) return;
  const LAT = 51.29, LON = -0.82, HOR = 470, SHORE = 506;
  const sec = v => (Math.round(v * 100) / 100) + 's';

  /* ---------- place-specific pieces ---------- */
  // A South Western Railway electric unit (third rail: no wires), 8 cars, yellow cab end; windows
  // mirror the sky by day and light up from real dusk. Faces right; flip runs it the other way.
  const train = (L, x, y, k, o) => {
    const cars = o.cars || 8, cw = 62, ch = 13, win = L.windows ? '#ffdf9a' : K.mix(L.low, '#33404e', .45);
    let body = '', wins = '';
    for (let i = 0; i < cars; i++) {
      const cx = -i * (cw + 2);
      body += `M${cx - cw} ${-ch - 3}h${cw - 2}q3 0 3 3v${ch}h${-cw - 1}z`;
      for (let j = 0; j < 7; j++) wins += `M${cx - cw + 4 + j * 8.4} ${-ch + 1}h5.6v4h-5.6z`;
    }
    const nose = `<path fill="#f2c431" d="M2 -16q8 2 9 10v6h-11z"/><path fill="#1c2430" d="M3-14q5 1 6 6h-6z"/>`;
    const art = `<path fill="#3a4a64" d="${body}"/>` +
      `<path fill="none" stroke="#c8372d" stroke-width="1.4" d="M${-cars * (cw + 2)} -3H0"/>` + nose +
      (L.windows ? K.keep(`<path fill="${win}" d="${wins}"/><path fill="#ffd27a" opacity=".18" d="M${-cars * (cw + 2)} -18H8v14H${-cars * (cw + 2)}z"/>`) : `<path fill="${win}" d="${wins}"/>`) +
      `<path fill="#20262c" d="M${-cars * (cw + 2)} 0H8v2H${-cars * (cw + 2)}z"/>`;
    const dx = o.dx || 2600;
    return K.at(x, y, k, mv('uknglide', { ad: sec(o.dur || 46), d: sec(-(o.d || 0)), dx: dx + 'px', dy: '0px' }, art), o.flip);
  };
  // Great crested grebe (waterline 0, faces right): chestnut ruff and black crest in breeding
  // plumage (spring, summer), plain grey-and-white in winter. Paddles there and back, bobbing.
  const grebe = (x, y, s, o = {}) => {
    const breeding = o.season === 'spring' || o.season === 'summer';
    const art = `<ellipse cy="2" rx="28" ry="3.4" fill="#0d3040" opacity=".22"/><path fill="#5d5448" d="M-24 0c-2-8 5-12 16-12l14 2c7 1 9 6 7 10z"/><path fill="#8b7a62" d="M-18-7q14-6 26-1-12 4-26 1z"/>` +
      `<path fill="#f4efe6" d="M6-8q5-14 2-26 6-5 10 0 1 14-4 32z"/><path fill="#2a2522" d="M8-34q4-8 11-4l-2 6z"/>` +
      (breeding ? `<path fill="#2a2522" d="M9-37l-6-6 8 2zM12-38l-3-8 6 6z"/><path fill="#b4552c" d="M9-30q-8 3-6 10l9-3zM18-30q5 4 2 10l-4-3z"/>` : '') +
      `<path fill="#d07a6a" d="M19-33l12 2-12 2z"/><circle cx="16" cy="-33" r="1.2" fill="#a0201a"/>`;
    const body = mv('uknbob', { ad: sec(o.bob || 3.1), dy: '1.4px' }, art) + `<path fill="none" stroke="#f2fbf6" stroke-width="1.4" opacity=".55" d="M-26 2q-22 3-40 8"/>`;
    return K.at(x, y, s, o.dx ? mv('uknpace', { ad: sec(o.dur || 34), d: sec(-(o.d || 0)), dx: o.dx + 'px' }, body) : body, o.flip);
  };
  // A kingfisher darting low along the reed edge now and then (a blue flash).
  const kingfisher = (x, y, s, o = {}) => K.at(x, y, s, mv('uknglide', { ad: sec(o.dur || 16), d: sec(-(o.d || 0)), dx: (o.dx || 520) + 'px', dy: '-6px' },
    `<path fill="#1e8fc4" d="M-14-2q8-8 18-5l6 4-6 4q-10 2-18-3z"/><path fill="#e0742a" d="M-6 0q6 4 12 1-6-1-12-1z"/><path fill="#2a6f9e" d="M-16-2l-8-2 8 4z"/><path fill="#1a1a1a" d="M10-4l10 1-10 2z"/>` +
    mv('uknflap', { ad: '.14s' }, `<path fill="#3fb0e0" d="M-6-5q4-8 10-2z"/>`)), o.flip);
  // The boardwalk out of the reeds to a viewing platform on the water (planks foreshortened,
  // posts and handrails, a bench); the platform's front edge is at y 676.
  const boardwalk = (L, season) => {
    const p = K.pal(season), wood = season === 'winter' ? ['#6f6556', '#8f8572', '#b9b09c'] : ['#6a5440', '#8f7656', '#b49c74'];
    const lx = t => 330 + (160 - 330) * t, rx = t => 470 + (640 - 470) * t, yt = t => 676 + 224 * t;
    let planks = '', rails = '', posts = '', grain = '';
    for (let i = 1; i < 26; i++) { const t = Math.pow(i / 26, 1.35), y = yt(t); planks += `M${R(lx(t))} ${R(y)}H${R(rx(t))}`; if (i % 2) grain += `M${R(lx(t) + 10 + 30 * t)} ${R(y - 2 - 5 * t)}h${R(30 + 60 * t)}`; }
    const pts = [0, .14, .3, .5, .74, 1.02];
    for (const t of pts) { const h = 14 + 70 * t, w = 2 + 5 * t; posts += `M${R(lx(t) - w)} ${R(yt(t))}v${-R(h)}h${R(w * 1.6)}v${R(h)}zM${R(rx(t) - w * .6)} ${R(yt(t))}v${-R(h)}h${R(w * 1.6)}v${R(h)}z`; }
    rails = `M${R(lx(0))} ${R(yt(0) - 14)}L${R(lx(1.02))} ${R(yt(1.02) - 84)}M${R(rx(0))} ${R(yt(0) - 14)}L${R(rx(1.02))} ${R(yt(1.02) - 84)}M${R(lx(0))} ${R(yt(0) - 7)}L${R(lx(1.02))} ${R(yt(1.02) - 42)}M${R(rx(0))} ${R(yt(0) - 7)}L${R(rx(1.02))} ${R(yt(1.02) - 42)}`;
    let out = `<path fill="${wood[1]}" d="M330 676L160 900H640L470 676z"/>` + K.S(wood[0], 1.4, planks, ' opacity=".8"') + K.S(wood[2], 1.2, grain, ' opacity=".35"');
    // the platform: a deck on legs over the water, railed on three sides, a bench facing the view
    out += `<path fill="${wood[0]}" d="M244 676h282v8H244z"/><path fill="${wood[1]}" d="M244 676L268 644H504L526 676z"/>` + K.S(wood[0], 1, 'M256 660H515M262 652H509M250 668H520', ' opacity=".6"');
    out += K.S('#3e3328', 4, 'M250 684v18M300 684v16M400 684v16M480 684v16M520 684v18') + K.S(wood[0], 2.4, 'M244 676v-20M268 644v-16M504 644v-16M526 676v-20M386 644v-16M256 660v-18M515 660v-18') + K.S(wood[0], 2, 'M244 656L268 628H504L526 656M244 666L268 636H504L526 666');
    out += `<path fill="${wood[0]}" d="M340 654h76v4h-76zM344 658v7h3v-7zM409 658v7h3v-7zM338 646h80v3h-80z"/>`;
    out += `<path fill="${wood[0]}" d="${posts}"/>` + K.S(wood[2], 2.6, rails) + K.S(wood[0], 1, rails, ' opacity=".4" transform="translate(0 2)"');
    // a lichen or frost sheen on the handrail tops
    out += K.S(season === 'winter' ? '#eef4f6' : K.mix(p.grass[2], '#ffffff', .3), 1, rails, ' opacity=".35" transform="translate(0 -1)"');
    return out;
  };
  // A few roofs of Fleet beyond the line (Pondtail side), windows lit at real dusk.
  const roofs = (L, season) => {
    let out = '';
    const r = rnd(77), hz = c => K.mix(c, L.haze, .55);
    for (const [x, w] of [[1080, 34], [1122, 28], [1158, 40], [1240, 30], [-40, 30], [6, 36]]) {
      const h = 10 + r() * 6, y = 478;
      out += `<path fill="${hz('#8c5a48')}" d="M${x} ${y - h}l${w / 2} -9 ${w / 2} 9z"/><path fill="${hz('#c8b8a0')}" d="M${x + 1} ${y - h}h${w - 2}v${h}h${-w + 2}z"/>`;
      out += K.window(L, x + 4, y - h + 3, 5, 4, { bars: false, on: .8, frame: hz('#e8e4da') }) + K.window(L, x + w - 9, y - h + 3, 5, 4, { bars: false, on: .6, frame: hz('#e8e4da') });
    }
    return out;
  };

  // The far shore mirrored in the water, drawn as its own light silhouette (soft crowns in three
  // tones and vertical streaks) rather than a <use> of the detailed shore: every bird and ripple
  // that moves over it would otherwise repaint the whole reflected wood each frame.
  const mirrorShore = (L, season, p) => {
    const r = rnd(91), win = season === 'winter', lv = win ? [p.twig || '#7a6a72', p.bare || '#5a4f4a', '#8a8078'] : (p.leaf.oak || p.leaf.alder);
    const wcol = L.water()[1], tones = [K.mix(lv[0], wcol, .35), K.mix(lv[1], wcol, .45), K.mix(lv[2] || lv[1], wcol, .55)], d = ['', '', ''];
    const clumps = [[-160, 190], [640, 820], [1240, 1760]], inClump = x => clumps.some(([a, b]) => x > a && x < b);
    for (let x = -160; x < 1760;) {
      const big = inClump(x), h = big ? 60 + r() * 56 : 26 + r() * 40, w = big ? 26 + r() * 30 : 18 + r() * 26, t = Math.floor(r() * 3);
      d[t] += K.lobed(r, x, SHORE + 2 + h * .45, w, h * .5, 9, .28);
      x += w * (.7 + r() * .6);
    }
    let streak = '';
    for (let i = 0; i < (K.lod() < 1 ? 20 : 70); i++) { const x = -160 + r() * 1920, y = SHORE + 4 + r() * 90; streak += `M${R(x)} ${R(y)}v${R(6 + r() * 26)}`; }
    const emb = K.mix(K.mix(p.grass[1], p.dry[0], .3), wcol, .5);
    return `<g opacity="${win ? .32 : .42}">` + K.P(emb, `M-160 ${SHORE}h1920v6h-1920z`) + d.map((x, i) => K.P(tones[i], x)).join('') + K.S(K.mix(tones[0], '#000', .2), 2, streak, ' opacity=".35"') + '</g>' +
      K.S(K.mix(L.low, '#ffffff', .3), 1.4, `M-160 ${SHORE + 1}h1920`, ' opacity=".5"');
  };

  /* ---------- the scene ---------- */
  const MOMENT = { spring: 'morning', summer: 'afternoon', autumn: 'golden', winter: 'day' };
  const scene = (season, o = {}) => K.scene(o, () => {
    const L = K.live(o, { heading: 300, fov: 80, horizon: HOR, season, at: MOMENT[season], lat: LAT, lon: LON });
    const p = K.pal(season), win = season === 'winter', aut = season === 'autumn', spr = season === 'spring', sum = season === 'summer';
    const tile = K.lod() < 1;   // small tiles (150 KB): the far detail, extra birds and the willow are left out
    const hazeCol = L.haze, near = (y, a, b) => a + (b - a) * Math.max(0, Math.min(1, (y - SHORE) / (760 - SHORE)));
    let sky = K.liveBackdrop(L, { seed: 31 + ['spring', 'summer', 'autumn', 'winter'].indexOf(season) * 5, cloudY: [30, 330], clouds: 2, cirrus: 3 });
    // birds high over the water: a skein of Canada geese, gulls wheeling (winter), swifts (summer)
    sky += K.flock({ seed: 11, n: 7, x: -120, y: 210, s: .9, v: true, col: '#2f3438', dx: 1900, dy: -70, dur: 52, d: 8 });
    if (win || aut) sky += K.flock({ seed: 12, n: 9, x: 300, y: 330, s: .7, col: '#f2f2ee', spread: 220, dx: 600, dy: -40, dur: 40, d: 12 });
    if (sum || spr) sky += K.flock({ seed: 13, n: 6, x: 600, y: 300, s: .6, col: '#1e2226', spread: 260, dx: 700, dy: -30, dur: 18, d: 5 });

    /* far shore: the wood beyond the line, the railway embankment and its trains, shore trees in clumps */
    let far = '';
    far += K.woods({ seed: 41, y: 484, h: [38, 66], mix: { oak: .35, pine: .3, birch: .25, alder: .1 }, season, haze: .62, hazeCol, sway: 0, foot: 8, snow: win });
    if (!tile) far += roofs(L, season);
    if (!tile) far += K.woods({ seed: 42, y: 490, h: [44, 72], mix: { oak: .4, pine: .25, birch: .2, alder: .15 }, season, haze: .48, hazeCol, sway: 0, foot: 6, x0: 980, x1: 1760 });
    const emb = K.mix(K.mix(p.grass[1], p.dry[0], aut || win ? .5 : .2), hazeCol, .45);
    far += `<path fill="${emb}" d="M-160 500V487H1760V500z"/><path fill="${K.mix(emb, '#3a3a36', .35)}" d="M-160 488H1760v1.6H-160z"/>`;
    far += K.woods({ seed: 43, y: 505, h: [60, 110], mix: { alder: .4, willow: .2, birch: .25, oak: .15 }, season, haze: .34, hazeCol, sway: 0, foot: 6, x0: -160, x1: 190, snow: win });
    far += K.woods({ seed: 44, y: 506, h: [56, 104], mix: { oak: .35, alder: .3, birch: .2, pine: .15 }, season, haze: .3, hazeCol, sway: 0, foot: 6, x0: 640, x1: 820, snow: win });
    far += K.woods({ seed: 45, y: 505, h: [60, 116], mix: { alder: .35, willow: .25, birch: .25, oak: .15 }, season, haze: .3, hazeCol, sway: 0, foot: 6, x0: 1240, x1: 1760, snow: win });
    far += K.reeds({ seed: 46, x0: -160, x1: 1760, y0: 500, y1: 509, n: 140, season, k0: .14, k1: .2, haze: .3, hazeCol, kinds: ['plume'], amp: 'none' });
    let land = far;
    land += train(L, -200, 488, 1.15, { dur: 44, d: 6, dx: 2600 });
    land += train(L, 1960, 488, 1.15, { dur: 51, d: 33, dx: 2600, flip: true, cars: 5 });

    /* the water: the pond from the far reeds to the platform, mirroring the far shore and the sky */
    const clip = U(), wd = `M-160 ${SHORE}H1760V900H-160z`;
    land += K.keep(K.water({ d: wd, y0: SHORE, y1: 900, cols: L.water(win ? ['#8fa8b4', '#4f7488', '#264458'] : ['#86b4bc', '#3f7f90', '#1d4a5c']), clip, seed: 51, lines: 90, shimmer: 70, glints: L.dark > .6 ? 0 : 14, sky: L.low }));
    land += mirrorShore(L, season, p);
    land += K.lightPath(L, { y0: SHORE + 2, y1: 860, w: 46, clip, seed: 52, n: 80 });
    if (win) land += `<path fill="#e6eef0" opacity=".5" d="M-160 507H1760v3q-600 4-1100 1T-160 512z"/>` + K.S('#ffffff', 1.2, 'M-100 512h220M300 511h160M980 510h240', ' opacity=".5"');
    if (aut || win || spr) land += K.mist({ seed: 53, y: SHORE + 14, h: 34, n: 5, op: aut ? .5 : .35, col: K.mix('#f2f4f2', L.low, .3) });
    if (sum) land += K.lilies({ seed: 54, x0: 620, x1: 1040, y0: 690, y1: 760, n: 26, season, flowers: .45 }) + K.lilies({ seed: 55, x0: 760, x1: 980, y0: 580, y1: 620, n: 10, season, flowers: .3 });
    if (spr) land += K.lilies({ seed: 54, x0: 640, x1: 1000, y0: 700, y1: 760, n: 14, season, flowers: 0 });

    /* life on the water, scaled by distance */
    const bird = (kind, x, y, o2 = {}) => K.duck(kind, x, y, near(y, .16, .62) * (o2.k || 1), Object.assign({ dx: R(near(y, 60, 220)) }, o2));
    let life = '';
    life += bird('swan', 760, 548, { dx: 160, dur: 70, k: 1.05 }) + bird('swan', 830, 556, { dx: 140, dur: 66, d: 6 });
    life += grebe(560, 572, near(572, .16, .62), { season, dx: 120, dur: 40 }) + grebe(1070, 608, near(608, .16, .62), { season, dx: -150, dur: 36, d: 9, flip: true });
    if (spr) life += grebe(1110, 610, near(610, .16, .62), { season, dx: -150, dur: 36, d: 7.5, flip: true, bob: 2.6 });
    life += bird('goose', 1180, 528, { dx: 90, dur: 60 }) + (tile ? '' : bird('goose', 1230, 532, { dx: 90, dur: 62, d: 4 }) + bird('goose', 300, 534, { dx: 110, dur: 58 }));
    life += bird('coot', 930, 640, { dx: 120, dur: 30 }) + (tile ? '' : bird('coot', 640, 600, { dx: -90, dur: 28, flip: true }) + bird('coot', 1010, 712, { dx: 80, dur: 26 }));
    life += bird('mallard', 580, 742, { dx: 130, dur: 38 }) + bird('female', 640, 752, { dx: 130, dur: 38, d: 3 });
    if (win && !tile) life += bird('mallard', 880, 560, { dx: 60 }) + bird('female', 900, 566, { dx: 60, d: 2 }) + bird('moorhen', 1060, 690, { dx: 70 });
    life += K.fish(720, 650, .55, { dur: 11, d: 2 }) + K.fish(980, 590, .38, { dur: 14, d: 8 });
    life += K.ripples(860, 680, { rx: 30, ry: 5, n: 3, dur: 5 }) + K.ripples(440, 600, { rx: 18, ry: 3, n: 2, dur: 6, d: 2 });
    life += kingfisher(700, 640, .8, { dx: 480, dur: 19, d: 4 });
    if (sum || spr) life += K.dragonfly(860, 700, .9, { dx: 180, dy: 40 }) + K.dragonfly(1010, 640, .7, { col: '#c43a2a', dx: -140, dy: 30 }) + K.dragonfly(560, 760, .9, { col: '#3a9a6a', dx: 160 });
    land += life;

    /* the right bank: a deep reedbed with alder, willow and birch behind it, a heron in the shallows */
    let right = `<path fill="${K.mix(p.reed[0], '#2a2a1c', .25)}" d="M1760 900V560Q1440 548 1180 600Q1040 660 990 740Q930 830 900 900z"/>`;
    if (!tile) right += K.tree('willow', 1330, 600, .52, { season, seed: 61, flutter: 5, fall: aut ? 6 : 0, snow: win });
    right += K.tree('alder', 1440, 592, .62, { season, seed: 62, flutter: 6, snow: win });
    right += K.tree('birch', 1640, 640, .95, { season, seed: 63, flutter: 8, fall: aut ? 10 : 0, snow: win, blossom: false });
    right += K.reeds({ seed: 64, x0: 1150, x1: 1760, y0: 580, y1: 640, n: 90, season, k0: .4, k1: .6, kinds: ['plume'], amp: 'none' });
    right += K.reeds({ seed: 65, x0: 1040, x1: 1760, y0: 640, y1: 740, n: 120, season, k0: .6, k1: .9, kinds: ['plume'], strips: 4 }) + K.reeds({ seed: 68, x0: 1060, x1: 1240, y0: 690, y1: 750, n: 14, season, k0: .8, k1: .95, kinds: ['bulrush'] });
    right += K.heron(1000, 712, .55, { flip: true, dur: 14 });
    right += K.reeds({ seed: 66, x0: 980, x1: 1760, y0: 740, y1: 840, n: 90, season, k0: .9, k1: 1.3, kinds: ['plume'], strips: 4 });
    right += K.reeds({ seed: 67, x0: 900, x1: 1760, y0: 840, y1: 905, n: 66, season, k0: 1.3, k1: 1.7, kinds: ['plume', 'plume', 'bulrush'] });
    land += right;

    /* the left bank: reeds round the boardwalk, an oak on the dry bank framing the view */
    let left = `<path fill="${K.mix(p.reed[0], '#2a2a1c', .25)}" d="M-160 900V600Q60 610 230 660L170 900z"/>`;
    left += K.tree('oak', -40, 690, 1.15, { season, seed: 71, flutter: 9, fall: aut ? 14 : 0, snow: win });
    left += K.reeds({ seed: 72, x0: -160, x1: 250, y0: 610, y1: 690, n: 80, season, k0: .5, k1: .8, kinds: ['plume'], amp: 'none' });
    left += K.reeds({ seed: 73, x0: -160, x1: 230, y0: 690, y1: 800, n: 70, season, k0: .8, k1: 1.2, kinds: ['plume', 'plume', 'bulrush'] });
    left += boardwalk(L, season);
    // people on the platform: a birdwatcher with binoculars, a walker with a dog coming and going
    left += K.walker(312, 672, .34, { still: true, seed: 5, coat: win ? '#7a2a2a' : '#3a5a4a', hat: true });
    left += K.walker(470, 674, .34, { dx: -120, dur: 36, dog: true, seed: 8 });
    left += K.shadow(L, 312, 672, 14, 40) + K.shadow(L, 440, 674, 16, 40);
    left += K.reeds({ seed: 74, x0: -160, x1: 175, y0: 800, y1: 905, n: 54, season, k0: 1.2, k1: 1.7, kinds: ['plume'] });
    left += K.wind(K.blades({ seed: 75, x0: 600, x1: 900, y0: 870, y1: 905, n: 22, h: 70, season, cols: p.grass.slice(0, 3), heads: sum || aut ? .3 : 0 }), { amp: 'soft' });
    land += left;

    // seasonal air: spring petals and catkin dust, summer motes, autumn leaves, winter snow flurries
    let air = '';
    if (spr) air += K.petals({ seed: 81, n: 10, x0: 200, x1: 1200, y0: 320, y1: 640 }) + K.butterfly(220, 760, .9, { kind: 'brimstone', dx: 200 }) + K.butterfly(1200, 700, .8, { kind: 'orangetip' });
    if (sum) air += K.motes({ seed: 82, n: 12, x0: 320, x1: 980, y0: 530, y1: 720 }) + K.butterfly(860, 820, .9, { kind: 'admiral', dx: 220 }) + K.butterfly(140, 720, .8, { kind: 'peacock' });
    if (aut) air += K.falling({ seed: 83, n: 14, x0: 200, x1: 1300, y0: 330, y1: 640, dy: 380, dx: 200, cols: [p.leaf.oak[1], p.leaf.oak[2], p.leaf.birch[2], p.leaf.willow[1]] });
    if (win) air += K.snow({ seed: 84, n: 26, layers: 2 });
    if (L.dark > .5) air += K.bats({ seed: 85, n: 3, x: 700, y: 400, spread: 260, s: .9 });

    return sky + K.tone(L, land) + air + K.weather(L) + K.grade(L);
  });

  const place = 'fleet-pond', label = 'Fleet Pond', town = 'Fleet', kind = 'landscape', tags = ['lake', 'reedbed', 'nature reserve'];
  const reasons = {
    spring: 'Grebes courting off the viewing platform',
    summer: 'Open water from a viewing platform',
    autumn: 'Golden shore and geese over the open water',
    winter: 'Winter wildfowl from the boardwalk platform',
  };
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const reason = reasons[season];
    add('hampshire', kind, { id: `${place}-1${season !== 'summer' ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: 'wide', viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      svg: (o = {}) => scene(season, o) });
  }
}
