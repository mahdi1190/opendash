// UK_SCENE_PART: uk-south-east/yateley-green-v2
/* Yateley Green — the open common, its pond and wildflower margins.
     https://yateley-tc.gov.uk/our-services/open-spaces/
     https://www.hart.gov.uk/sites/default/files/2022-11/yateley_green_accessible.pdf (conservation area appraisal)
   View 2 of 4 (close): one file per view, so each view's art can change without
   touching the others (the other views: 72-anim-pack-uk-south-east-yateley-green-v1..v4.js).
   Drawn with the rich nature kit T.K (src/app/71-anim-uk-nature-kit.js). Every id, ukPlace,
   ukView, ukSeason and season is unchanged so saved pins and the rotation keep working.

   Brief (view 2, the pond margin, looking south-west across the water):
   - Yateley Green is common land, split by the Reading Road in 1801; wide open mown grass
     edged by woodland of oak, birch and Scots pine, with mature oaks and horse chestnuts
     standing out on the grass.
   - A lily pond, visited by herons, mallards, moorhens and coots, is the centrepiece of the
     largest open area; reeds, bulrushes and wildflowers fringe its margins.
   - Beyond the trees lie the old village: brick and tile cottages and St Peter's church
     (pre-Conquest fabric, a 15th-century timber tower with a shingled spire; rebuilt after the
     1979 fire), glimpsed here through the tree line. No signage. */
function ukSouthEastYateleyGreenV2(T) {
  const { add, U } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js)
  const LAT = 51.34, LON = -0.83, SHORE = 622;

  // St Peter's church: K.stPeters in the kit (the same drawing in every Yateley Green view).
  // A brick-and-tile cottage (some colour-washed white), chimney smoke on cold days.
  const cottage = (L, x, y, s, o = {}) => {
    const wall = o.wall || '#a6584a', roof = o.roof || '#7c3e30', smoke = o.smoke && T.puffs ? `<g transform="translate(${o.w * .3} ${-o.h - 70})">${T.puffs(0, 0, 5, '#e6e2dc', 10, -40, 7, -120, 2.2)}</g>` : '';
    const W = o.w || 120, H = o.h || 46;
    let w = ''; for (let i = 0; i < (W > 110 ? 3 : 2); i++) w += K.window(L, -W / 2 + 14 + i * (W - 34) / (W > 110 ? 2 : 1), -H + 10, 12, 12, { frame: '#f2eee6' }) + K.window(L, -W / 2 + 14 + i * (W - 34) / (W > 110 ? 2 : 1), -H + 28, 12, 13, { frame: '#f2eee6' });
    return K.at(x, y, s, K.shadow(L, 0, 0, W + 20, H + 30) + `<path fill="${wall}" d="M${-W / 2} 0V${-H}H${W / 2}V0z"/>` +
      K.S(K.mix(wall, '#000', .18), 1, Array.from({ length: Math.floor(H / 7) }, (_, i) => `M${-W / 2} ${-4 - i * 7}h${W}`).join(''), ' opacity=".35"') +
      `<path fill="${roof}" d="M${-W / 2 - 6} ${-H + 2}L${-W / 2 + 18} ${-H - 34}H${W / 2 - 18}L${W / 2 + 6} ${-H + 2}z"/><path fill="${K.mix(roof, '#000', .2)}" d="M${W / 2 - 18} ${-H - 34}L${W / 2 + 6} ${-H + 2}H${W / 2 - 14}z"/>` +
      `<path fill="#8a4a3a" d="M${W * .3 - 6} ${-H - 26}v-36h14v36z"/><path fill="#5e4234" d="M${W * .3 - 8} ${-H - 62}h18v4h-18z"/>` + w +
      `<path fill="#3e4a3e" d="M-6 0v-22h12V0z"/>` + smoke);
  };
  // Horse chestnut 'candles' (upright white flower spikes, spring) over a crown drawn with K.tree.
  const candles = (x, y, s, seed) => {
    const r = T.rnd(seed); let d = '', p = '';
    for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, k = Math.sqrt(r()), cx = Math.cos(a) * 190 * k, cy = -270 + Math.sin(a) * 120 * k, h = 14 + r() * 8; d += `M${(cx - 4).toFixed(1)} ${cy.toFixed(1)}l4 ${-h.toFixed(1)} 4 ${h.toFixed(1)}z`; if (i % 3 === 0) p += K.circ(cx, cy - h * .4, 1.6); }
    return K.at(x, y, s, K.P('#fbf6ee', d) + K.P('#e9a0a8', p));
  };
  // Conkers in their split spiny cases under the chestnut (autumn).
  const conkers = (x0, x1, y0, y1, seed) => {
    const r = T.rnd(seed); let shell = '', nut = '', shine = '';
    for (let i = 0; i < 18; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), k = .6 + (y - y0) / (y1 - y0 + 1) * .6; if (i % 2) shell += K.ell(x - 6 * k, y, 6 * k, 4.5 * k); nut += K.circ(x, y - 1, 4.2 * k); shine += K.circ(x - 1.4 * k, y - 2.6 * k, 1.1 * k); }
    return K.P('#8f9a4a', shell) + K.P('#7a3c1e', nut) + K.P('#e8b48a', shine);
  };

  const scene = (season, o = {}) => K.scene(o, () => {
    const spring = season === 'spring', summer = season === 'summer', autumn = season === 'autumn', winter = season === 'winter';
    const L = K.live(o, { heading: 220, fov: 78, horizon: 480, season, at: autumn ? 'golden' : winter ? 'morning' : 'afternoon', lat: LAT, lon: LON });
    const full = K.lod() >= 1;   // tiles draw the main trees only
    const p = K.pal(season), hazeCol = K.mix(L.haze, L.low, .3), night = L.dark > .6;
    const s = K.liveBackdrop(L, { seed: 41, cloudY: [30, 330] }) + (summer || spring ? K.flock({ seed: 42, n: 6, x: 200, y: 200, s: .7, dx: 1100, dy: -40, dur: 38 }) : autumn ? K.flock({ seed: 43, n: 7, x: 100, y: 150, s: .9, dx: 1300, dy: -60, dur: 46, v: true }) : '');

    // 1-3. far woods, the village glimpsed through them, the near tree line with gaps
    // the still part of the far view (no motion inside) is also what the pond mirrors: a static
    // reflection costs nothing per frame, unlike a wobbling copy of animated groups
    let far = ''; const reflBack = U();
    far += K.woods({ seed: 51, y: 482, h: [42, 70], mix: { oak: .45, pine: .3, birch: .25 }, season, haze: .55, hazeCol, sway: 0, foot: 20, shrubs: false, ground: K.mix(p.grass[1], hazeCol, .55) });
    const backWoods = `<g id="${reflBack}">${far}</g>`, meadow = K.land({ d: 'M-160 530V494Q400 488 800 492T1760 490V530z', top: K.mix(p.grass[1], hazeCol, .35), bottom: K.mix(p.grass[1], hazeCol, .2), y0: 488, y1: 530 });   // the gardens and back meadows behind the line
    far = ''; far += cottage(L, 420, 512, .62, { w: 120, h: 44 });
    far += cottage(L, 520, 514, .58, { w: 96, h: 40, wall: '#ebe4d6', roof: '#6e3c32' });
    far += cottage(L, 640, 512, .55, { w: 110, h: 42, wall: '#9c5446' });
    far += K.stPeters(L, 1208, 512, .8);   // the shared St Peter's (kit)
    far += K.woods({ seed: 52, x0: -160, x1: 350, y: 516, h: [70, 110], mix: { oak: .55, birch: .2, pine: .25 }, season, haze: .3, hazeCol, sway: 0, foot: 24, ground: K.mix(p.grass[1], hazeCol, .3) });
    far += K.woods({ seed: 53, x0: 700, x1: 1100, y: 516, h: [70, 115], mix: { oak: .6, birch: .25, pine: .15 }, season, haze: .3, hazeCol, sway: 0, foot: 24, ground: K.mix(p.grass[1], hazeCol, .3) });
    far += K.woods({ seed: 54, x0: 1290, x1: 1760, y: 516, h: [70, 110], mix: { oak: .5, pine: .3, birch: .2 }, season, haze: .3, hazeCol, sway: 0, foot: 24, ground: K.mix(p.grass[1], hazeCol, .3) });
    const reflId = U();
    far = backWoods + meadow + `<g id="${reflId}">${far}</g>`;   // the meadow band stays out of the mirror (its edges drew a box in the pond)
    if ((winter || autumn) && T.puffs) far += `<g transform="translate(442 440)">${T.puffs(0, 0, 5, '#e6e2dc', 10, -40, 7, -120, 2.2)}</g>`;   // chimney smoke on cold days
    if (full) far += K.tree('hawthorn', 1110, 528, .3, { season, seed: 55, haze: .25, hazeCol }) + K.tree('birch', 1262, 530, .22, { season, seed: 56, haze: .25, hazeCol }) + K.tree('oak', 360, 530, .26, { season, seed: 57, haze: .25, hazeCol });
    // 4. the open green: mown grass, mature oaks and horse chestnuts, people and dogs
    far += K.land({ d: `M-160 ${SHORE + 30}V522Q300 512 800 518T1760 516V${SHORE + 30}z`, top: K.mix(p.grass[2], hazeCol, .25), bottom: p.grass[1], y0: 515, y1: SHORE, seed: 58, speckle: 160 });
    far += K.turf({ seed: 59, y0: 524, y1: SHORE - 6, rows: full ? 8 : 4, lobe: [10, 34], density: 4, season, haze: .15, hazeCol });
    far += K.track({ roots: 0, pts: [[1560, 528, 6], [1250, 552, 12], [900, 580, 18], [520, 598, 22], [-160, 606, 26]], seed: 60, season, stones: 20, puddles: winter || autumn ? 1 : 0, sky: L.low });
    if (full) far += K.tree('oak', 860, 556, .34, { season, seed: 61, flutter: full ? 4 : 0, fall: autumn ? 5 : 0, ground: 560 });
    far += K.tree('oak', 1450, 566, .44, { season, seed: 62, flutter: full ? 6 : 0, flip: true, fall: autumn ? 6 : 0, ground: 572 });   // horse chestnut
    if (spring && full) far += candles(1450, 566, .44, 63);
    far += K.tree('oak', 210, 590, .5, { season, seed: 64, flutter: full ? 8 : 0, fall: autumn ? 8 : 0, ground: 596 });
    if (full) far += K.tree('birch', 1010, 548, .26, { season, seed: 65 });
    if (autumn) far += conkers(1360, 1560, 570, 600, 66);
    if (full) far += K.wind(K.blooms({ seed: 67, x0: -160, x1: 1760, y0: 540, y1: SHORE - 4, n: winter ? 0 : 60, kinds: spring ? ['daisy', 'dandelion', 'celandine'] : summer ? ['daisy', 'clover', 'buttercup'] : ['daisy'], k0: .25, k1: .5 }), { amp: 'none' });   // distant: still (sway strips across the green cost repaint)
    if (!night) {
      far += K.walker(560, 598, .5, { dog: true, dx: 300, dur: 52, seed: 7 });
      far += K.walker(1130, 566, .4, { dog: true, dx: -260, dur: 60, seed: 8, flip: true, hat: winter ? '#3a3a4a' : null });
      far += K.family(760, 586, .44, { dx: -240, dur: 70, seed: 9, flip: true, dog: spring || summer });
      far += K.jogger(1300, 550, .34, { dx: -500, dur: 26, seed: 10, flip: true });
      far += K.walker(80, 604, .52, { dx: 200, dur: 44, seed: 11 });
    }
    far += K.rabbit(1640, 560, .4, { dx: 30, dur: 18 }) + K.squirrel(1490, 572, .5) + K.robin(1016, 551, .5);
    // the far margin: reeds and sedge along the shore
    far += K.reeds({ seed: 68, x0: 900, x1: 1500, y0: SHORE - 10, y1: SHORE + 4, n: 22, season, k0: .3, k1: .4, amp: 'none' });
    if (full) far += K.reeds({ seed: 69, x0: -160, x1: 360, y0: SHORE - 8, y1: SHORE + 4, n: 14, season, k0: .3, k1: .4, kinds: ['plume'], amp: 'none' });

    // 5. the lily pond: sky reflection, mirrored green, lilies, birds, fish
    const clip = U(), wd = `M-160 900V${SHORE + 8}Q120 ${SHORE - 4} 420 ${SHORE + 6}T980 ${SHORE + 2}T1400 ${SHORE + 8}T1760 ${SHORE}V900z`;
    let pond = K.water({ d: wd, y0: SHORE, y1: 900, cols: L.water(winter ? ['#9cb4c0', '#5f8494', '#34586a'] : ['#7fa8a8', '#3f7a86', '#1d4a58']), clip, reflect: [], lines: 60, shimmer: 40, glints: L.dark > .5 ? 0 : 10, sky: L.low, keepSky: L.dark < .5 });   // by night the pond takes the land's dimmed grade
    const fadeG = U(), fadeM = U();
    pond += `<defs><linearGradient id="${fadeG}" gradientUnits="userSpaceOnUse" x1="0" y1="${SHORE}" x2="0" y2="${SHORE + 230}"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="${fadeM}" maskUnits="userSpaceOnUse" x="-160" y="${SHORE}" width="1920" height="240"><rect x="-160" y="${SHORE}" width="1920" height="240" fill="url(#${fadeG})"/></mask></defs>`;
    pond += `<g clip-path="url(#${clip})"><g mask="url(#${fadeM})"><use href="#${reflBack}" transform="matrix(1 0 0 -1 0 ${2 * SHORE + 8})" opacity=".4"/><use href="#${reflId}" transform="matrix(1 0 0 -1 0 ${2 * SHORE + 8})" opacity=".4"/></g></g>`;
    pond += K.lightPath(L, { y0: SHORE + 6, y1: 900, w: 50, clip });
    pond += `<path fill="none" stroke="${K.mix(p.ground[0], '#000', .2)}" stroke-width="5" opacity=".55" d="M-160 ${SHORE + 9}Q120 ${SHORE - 3} 420 ${SHORE + 7}T980 ${SHORE + 3}T1400 ${SHORE + 9}T1760 ${SHORE + 1}"/>`;
    if (winter) { // thin ice skinning the shallows, frost-white at the edges
      pond += `<g clip-path="url(#${clip})"><path fill="#e8f0f2" opacity=".42" d="M-160 ${SHORE}H560Q420 660 160 672 0 690-160 700z"/><path fill="#e8f0f2" opacity=".32" d="M1760 ${SHORE}H1180Q1300 662 1500 676 1640 690 1760 720z"/>` + K.S('#ffffff', 1.4, 'M-120 680l60-8M40 664l70-6M1300 660l90 6M1520 684l80 8', ' opacity=".6"') + '</g>';
    }
    pond += K.lilies({ seed: 71, x0: 300, x1: 1150, y0: 660, y1: 780, n: winter ? 8 : autumn ? 22 : 34, flowers: .45, season });
    pond += K.ripples(640, 700, { rx: 30, ry: 6, n: 3, dur: 5 }) + K.ripples(1180, 760, { rx: 24, ry: 5, n: 2, dur: 6, d: 2 }) + K.ripples(380, 820, { rx: 36, ry: 7, n: 2, dur: 7, d: 3 });
    if (!winter) pond += K.fish(820, 720, .6, { dur: 11, d: 4 }) + K.fish(470, 760, .5, { dur: 15, d: 9, flip: true });
    pond += K.heron(1330, SHORE + 26, .62, { flip: true, dur: 14 });
    pond += K.duck('mallard', 700, 742, .7, { dx: 240, dur: 40 }) + K.duck('female', 780, 752, .66, { dx: 240, dur: 40, d: 2 });
    pond += K.duck('moorhen', 1060, 680, .5, { dx: -120, dur: 30, flip: true }) + K.duck('coot', 420, 690, .5, { dx: 160, dur: 34 });
    if (spring) for (let i = 0; i < (full ? 5 : 2); i++) pond += K.duck('female', 860 + i * 22, 772 + (i % 2) * 6, .26, { dx: 240, dur: 40, d: 2.6 + i * .25 });
    if (winter) pond += K.duck('coot', 980, 760, .55, { dx: -180, dur: 36, flip: true }) + K.duck('mallard', 300, 800, .72, { dx: 120, dur: 46, flip: true }) + K.duck('swan', 1180, 720, .6, { dx: -220, dur: 70, flip: true });
    if (autumn) pond += K.mist({ seed: 72, y: SHORE + 20, h: 50, n: 4, col: K.mix('#f2efe6', L.low, .3), op: .45 });
    if (summer && L.dark < .5) pond += K.dragonfly(560, 660, .8, { col: '#2f8ac6', dx: 180, dy: 30 }) + K.dragonfly(980, 700, .7, { col: '#c0402a', dx: -150, dy: 40 }) + K.dragonfly(260, 740, .9, { col: '#3a9a6a', dx: 120, dy: -30 });

    // 6-7. the near margins: banks of grass, reeds, wildflowers; an overhanging oak to the right
    let near = '';
    const lb = 'M-160 900V748Q40 728 200 770Q330 810 400 900z', rb = 'M1760 900V700Q1580 694 1450 752Q1330 820 1290 900z';
    near += K.land({ d: lb, top: p.grass[1], bottom: p.grass[0], y0: 730, y1: 900, seed: 81, speckle: 80 }) + K.land({ d: rb, top: p.grass[1], bottom: p.grass[0], y0: 700, y1: 900, seed: 82, speckle: 80 });
    if (full) near += K.stones({ seed: 83, x0: 180, x1: 380, y0: 780, y1: 880, n: 14, s: 1.2 }) + K.stones({ seed: 84, x0: 1300, x1: 1460, y0: 760, y1: 860, n: 12, s: 1.2 });
    near += K.tree('oak', 1640, 900, 1.05, { season, seed: 85, flutter: full ? 14 : 0, fall: autumn ? 14 : spring ? 0 : 0, ground: 900 });
    near += K.reeds({ seed: 86, x0: 160, x1: 400, y0: 790, y1: 900, n: 16, season, k0: .9, k1: 1.25 });
    near += K.reeds({ seed: 87, x0: 1290, x1: 1480, y0: 740, y1: 880, n: 14, season, k0: .8, k1 : 1.15 });
    if (!full) { /* tiles: no margin tree */ } else if (spring) near += K.tree('hawthorn', 60, 770, .5, { season, seed: 88, blossom: true, flutter: full ? 6 : 0 });
    else near += K.tree('alder', 40, 772, .45, { season, seed: 89, flutter: full ? 6 : 0, fall: autumn ? 6 : 0, ground: 790 });
    const fk = spring ? ['celandine', 'cowparsley', 'daisy', 'anemone', 'buttercup'] : summer ? ['knapweed', 'buttercup', 'clover', 'campion', 'ragwort', 'harebell', 'daisy'] : autumn ? ['knapweed', 'ragwort', 'daisy'] : [];
    near += K.meadow({ seed: 90, x0: -160, x1: 380, y0: 770, y1: 905, n: full ? 70 : 30, h: 60, k0: .9, k1: 1.5, flowers: fk.length ? (autumn ? 12 : 44) : 0, kinds: fk.length ? fk : ['daisy'], season, cols: p.grass });
    near += K.meadow({ seed: 91, x0: 1300, x1: 1760, y0: 720, y1: 905, n: full ? 64 : 28, h: 60, k0: .8, k1: 1.5, flowers: fk.length ? (autumn ? 10 : 40) : 0, kinds: fk.length ? fk : ['daisy'], season, cols: p.grass });
    if (winter) near += K.speckle({ seed: 92, x0: -160, x1: 1760, y0: 700, y1: 900, n: 140, cols: ['#f4f8fa', '#e2ecf0'], w: 1.6 });
    near += K.robin(250, 794, .7, { dur: 6 });
    if ((spring || summer) && L.dark < .5) near += K.butterfly(300, 720, .9, { kind: spring ? 'brimstone' : 'peacock', dx: 220 }) + K.butterfly(1380, 690, .8, { kind: spring ? 'orangetip' : 'blue', dx: -200 }) + K.butterfly(820, 640, .6, { kind: summer ? 'admiral' : 'brimstone' }) + K.bee(120, 810, 1) + K.bee(1500, 780, 1.1);

    // particles and the dark
    let air = '';
    if (L.stars > .3) {   // a few brighter stars twinkling over the green (x-ukystar, the pack's star twinkle)
      const q = T.rnd(98), grp = ['', '', ''];
      for (let i = 0; i < 18; i++) grp[i % 3] += K.circ(q() * 1600, 20 + q() * 340, 1.1 + q() * 1.2);
      air += K.keep(`<g fill="#fff4e0" opacity="${(L.stars * .9).toFixed(2)}">` + grp.map((d, i) => T.mv('ukystar', { ad: `${3.3 + i}s`, d: `-${i}s` }, `<path d="${d}"/>`)).join('') + '</g>');
    }
    if (spring) air += K.petals({ seed: 93, n: 14, x0: -100, x1: 700, y0: 500, y1: 760 });
    if (summer) air += K.motes({ seed: 94, n: 18, x0: 200, x1: 1400, y0: 560, y1: 820 });
    if (autumn) air += K.falling({ seed: 95, n: 18, x0: 0, x1: 1600, y0: 300, y1: 700, dy: 380, dx: 180, cols: ['#d9902a', '#b85a28', '#e8b84a', '#8a5a2a'] });
    if (winter) air += K.falling({ seed: 96, kind: 'seed', n: 16, x0: 0, x1: 1600, y0: 520, y1: 880, dy: -60, dx: 60, cols: ['#ffffff', '#e8f2f6'], size: 10, dur: [8, 14] });   // frost glitter
    if (L.dark > .5 && !winter) air += K.bats({ seed: 97, n: 5, x: 800, y: 440, spread: 420 }) + K.moths(420, 470) + K.moths(1150, 470);

    const g = far + pond + near;
    return s + K.tone(L, g) + air + K.weather(L, { mistY: SHORE }) + K.grade(L);
  });

  const place = 'yateley-green', label = 'Yateley Green', town = 'Yateley', kind = 'landscape', tags = ['village green', 'pond', 'wildflowers'];
  const reasons = { spring: 'Spring flowers along the pond margin', summer: 'Summer insects across the pond margin', autumn: 'Autumn reeds along the water margin', winter: 'Frosted reeds and winter waterbirds' };
  const view = 1;
  // COMPOSED (docs/dev/SCENE_ENGINE.md, sections 3 and 17): when the scene engine is in the build, the four seasonal items
  // of this view share ONE auto-season composed scene (71-scene-uk-south-east-yateley-green-close.js, drawn by the canvas renderer: the
  // date picks the season, the live sky the light). Every id, ukPlace, ukView, ukSeason, season and the rotation stay as
  // they were; the hand-drawn art above is kept as legacySvg (the old-versus-new sheets) and is the scene without the engine.
  const ygFound = typeof sceneItems === 'function' && typeof sceneItem === 'function' ? sceneItems('uk-south-east-yateley-green').find(i => i.id === 'yateley-green-2') : null;
  const ygScene = ygFound ? ygFound.scene : null;
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const reason = reasons[season];
    const legacy = (o = {}) => scene(season, o);
    const o = { id: `${place}-${view + 1}${season !== 'summer' ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: 'close', viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      svg: legacy };
    add('hampshire', kind, ygScene ? Object.assign(sceneItem(Object.assign({ intensity: 'subtle' }, o), ygScene), { season: [season], liveSky: o.liveSky, legacySvg: legacy }) : o);
  }
}
