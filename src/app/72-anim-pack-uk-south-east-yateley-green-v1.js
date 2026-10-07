// UK_SCENE_PART: uk-south-east/yateley-green-v1
/* Yateley Green — the open common, its pond and wildflower margins.
     https://yateley-tc.gov.uk/our-services/open-spaces/
     https://www.hart.gov.uk/sites/default/files/2022-11/yateley_green_accessible.pdf
   View 1 of 4 (wide): one file per view, so each view's art can change without
   touching the others (the other views: 72-anim-pack-uk-south-east-yateley-green-v1..v4.js).
   Drawn with the rich nature kit T.K (src/app/71-anim-uk-nature-kit.js).
   Keep every id, ukPlace, ukView, ukSeason and season unchanged so saved pins and the rotation keep working.

   Brief (view 1, wide, looking east across the green toward Church End):
   - Yateley Green is registered common land (CL25) at the heart of the town; its largest pond,
     Shute's Pond, sits in open mown grass with a managed wildflower area (part of the Green is a SINC).
   - Mature oaks and horse chestnuts stand on the Green; woodland runs off to the north and west,
     and the Green continues east to Church End Green.
   - Through the trees to the east: brick-and-tile cottages and St Peter's Church, whose timber-framed
     west tower carries a shingled spire. Dog walkers, families, mallards, moorhens, coots and geese.
   - Light and sky are live: the view faces about 100 degrees (east), so the moon and morning sun rise
     over Church End. */
function ukSouthEastYateleyGreenV1(T) {
  const { add } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js)
  const LAT = 51.34, LON = -0.83;

  // A brick or rendered cottage with a clay-tile roof, chimney and live windows (sky-glass by day, lit at dusk).
  const cottage = (L, x, y, w, h, o = {}) => {
    const wall = o.wall || '#a65a40', roof = o.roof || '#7a3e2e', rh = h * .75, wy = y - h;
    let s = `<path fill="${K.mix(wall, '#000', .12)}" d="M${x} ${y}V${wy}h${w}V${y}z"/>`;
    if (!o.render) s += K.S(K.mix(wall, '#2a1a14', .25), 1, Array.from({ length: Math.floor(h / 6) }, (_, i) => `M${x} ${wy + 6 + i * 6}h${w}`).join(''), ' opacity=".35"');
    s += `<path fill="${roof}" d="M${x - 6} ${wy + 2}L${x + w * .5} ${wy - rh}L${x + w + 6} ${wy + 2}z"/>`;
    s += K.S(K.mix(roof, '#000', .3), 1, Array.from({ length: 4 }, (_, i) => `M${x - 4 + i * 2} ${wy - rh * (i + 1) / 5 + 2}h${w + 8 - i * 4}`).join(''), ' opacity=".4"');
    s += `<path fill="${K.mix(wall, '#3a1a10', .3)}" d="M${x + w * .72} ${wy - rh * .5}v-${rh * .62}h${w * .1}v${rh * .5}z"/><path fill="#5a3a2a" d="M${x + w * .7} ${wy - rh * 1.12}h${w * .14}v4h-${w * .14}z"/>`;
    const ww = Math.max(7, w * .14), wh = h * .26;
    s += K.window(L, x + w * .12, wy + h * .14, ww, wh, { on: .75 }) + K.window(L, x + w * .74, wy + h * .14, ww, wh, { on: .6 });
    s += K.window(L, x + w * .12, wy + h * .58, ww, wh, { on: .8, curtain: true }) + `<rect x="${x + w * .45}" y="${y - h * .5}" width="${w * .12}" height="${h * .5}" fill="${o.door || '#2f4a3a'}"/>`;
    return s;
  };
  // St Peter's church: K.stPeters in the kit (the same drawing in every Yateley Green view).
  const bench = (x, y, k) => K.at(x, y, k, `<ellipse cy="3" rx="44" ry="5" fill="#1a2a1e" opacity=".25"/><path stroke="#4a3a2c" stroke-width="4" d="M-34 0v-22M34 0v-22M-30 0v-10M30 0v-10"/><path fill="#9a7a54" d="M-40-24h80v5h-80zM-40-34h80v5h-80zM-42-14h84v5h-84z"/><path fill="#c4a478" d="M-40-34h80v1.6h-80z"/>`);
  const lampPost = (L, x, y, k) => K.at(x, y, k, `<path stroke="#2a2e30" stroke-width="5" d="M0 0v-120"/><path fill="#2a2e30" d="M-10-120h20l-4-16h-12z"/><path stroke="#2a2e30" stroke-width="10" d="M0 0v-14"/>`) + K.lamp(L, x, y - 128 * k, 6 * k);

  const KINDS = {
    spring: ['daisy', 'buttercup', 'cowparsley', 'dandelion', 'celandine'],
    summer: ['daisy', 'knapweed', 'poppy', 'clover', 'buttercup', 'campion'],
    autumn: ['knapweed', 'ragwort', 'clover', 'daisy'],
    winter: ['daisy'],
  };
  const AT = { spring: 'morning', summer: 'afternoon', autumn: 'golden', winter: 'day' };

  const scene = (season, o) => K.scene(o, () => {
    const L = K.live(o, { heading: 100, fov: 78, horizon: 470, season, at: AT[season], lat: LAT, lon: LON });
    const p = K.pal(season), winter = season === 'winter', spring = season === 'spring', summer = season === 'summer', autumn = season === 'autumn';
    const hazeCol = L.haze, mix = K.mix, U = T.U, tile = K.lod() < 1;
    const s = K.liveBackdrop(L, { seed: 31, cloudY: [30, 320] }) + K.flock({ seed: 32, n: 6, x: 420, y: 210, s: .6, dx: 760, dur: 40 });
    let g = '';
    // 1. far: the woods beyond Church End, faint in the haze
    g += K.woods({ seed: 41, y: 476, h: [44, 76], mix: { oak: .55, alder: .2, birch: .15, pine: .1 }, season, haze: .58, hazeCol, sway: 0, rows: 1, gap: tile ? 2.4 : 1.3 });
    // 2. St Peter's tower and spire, and a row of cottages glimpsed between the trees
    g += K.stPeters(L, 1145, 506, .82, { flip: true });   // the shared St Peter's (kit)
    g += K.woods({ seed: 42, y: 512, h: [66, 118], mix: { oak: .6, alder: .25, birch: .15 }, season, haze: .36, hazeCol, x0: -160, x1: 430, sway: 0, rows: 1 });
    g += K.woods({ seed: 43, y: 512, h: [56, 104], mix: { oak: .6, alder: .2, hawthorn: .2 }, season, haze: .36, hazeCol, x0: 870, x1: 1100, sway: 0, mass: false, rows: 1 });
    g += K.woods({ seed: 44, y: 512, h: [56, 98], mix: { oak: .6, alder: .25, birch: .15 }, season, haze: .36, hazeCol, x0: 1230, x1: 1760, sway: 0, rows: 1 });
    let cots = cottage(L, 446, 514, 92, 46, { wall: '#ece4d2', render: true, roof: '#6e3a2a' }) + cottage(L, 550, 516, 120, 52, {}) + cottage(L, 682, 514, 84, 44, { wall: '#b4664a', door: '#6a2a24' }) + cottage(L, 778, 516, 70, 40, { wall: '#efe6d6', render: true, roof: '#5e3426', door: '#2a3a5a' });
    g += cots;
    // hedges and garden trees in front of the cottages
    if (!tile) g += K.tree('oak', 640, 530, .26, { season, seed: 45, haze: .3, hazeCol, blossom: false }) + K.tree('hawthorn', 862, 526, .2, { season, seed: 46, haze: .3, hazeCol, blossom: false }) + K.tree('alder', 1200, 530, .24, { season, seed: 47, haze: .3, hazeCol });
    // 3. the open green, mown, with the wildflower area to the front
    g += K.land({ d: 'M-160 900V512Q400 506 800 514T1760 510V900z', top: mix(p.grass[1], hazeCol, .3), bottom: p.grass[0], y0: 510, y1: 900, seed: 48, speckle: 200 });
    // mown sward: broad mowing stripes in perspective, then still tufts and daisies (a dense cushion carpet repaints too slowly under the moving trees)
    let stripes = '';
    for (let k = 0; k < 9; k++) { const a = -900 + k * 380, b = a + 190; stripes += `M${800 + (a - 800) * .14} 514L${800 + (b - 800) * .14} 514L${b} 900L${a} 900z`; }
    g += K.P(mix(p.grass[2], hazeCol, .15), stripes, ' opacity=".22"');
    g += K.wind(K.tufts({ seed: 49, x0: -160, x1: 1760, y0: 520, y1: 900, n: tile ? 120 : 260, k0: .2, k1: 1.1, season, haze: .08, hazeCol, heads: false }).concat(winter ? [] : K.blooms({ seed: 149, x0: -160, x1: 1760, y0: 540, y1: 880, n: autumn ? 30 : 90, kinds: spring ? ['daisy', 'dandelion', 'daisy'] : ['daisy', 'clover', 'daisy'], k0: .15, k1: .6 })), { amp: 'none' });
    // the lane along the far edge of the green, then the gravel path round the pond
    g += K.track({ pts: [[-160, 530, 10], [400, 528, 12], [900, 532, 12], [1760, 528, 12]], seed: 50, season, stones: 20, cols: ['#8a8478', '#a29a8a', '#c4bcaa'] });
    g += K.track({ pts: [[880, 532, 10], [1120, 566, 26], [1360, 640, 56], [1330, 760, 110], [1180, 905, 210]], seed: 51, season, stones: 60, puddles: winter || autumn ? 2 : 0, sky: L.low });
    if (!tile) g += K.cyclist(80, 532, .32, { dx: 1300, dur: 30, seed: 52 }) + K.walker(700, 534, .3, { dx: -260, dur: 50, seed: 53, dog: true });
    // 4. Shute's Pond: the far bank (trees, reeds) wrapped so the water can mirror it
    const bank = U(), clip = U();
    let far = tile ? '' : K.tree('willow', 420, 606, .5, { season, seed: 54, haze: .12, hazeCol }) + K.tree('oak', 880, 600, .44, { season, seed: 55, haze: .14, hazeCol, flutter: 4, blossom: spring });
    if (!tile) far += K.tree('alder', 1220, 610, .38, { season, seed: 56, haze: .12, hazeCol }) + K.tree('hawthorn', 610, 600, .28, { season, seed: 57, haze: .14, hazeCol, blossom: false });
    far += K.reeds({ seed: 58, x0: 470, x1: 760, y0: 596, y1: 608, n: 22, season, s: .5, strips: 3 }) + K.reeds({ seed: 59, x0: 940, x1: 1180, y0: 594, y1: 606, n: 18, season, s: .5, strips: 3 });
    g += `<g id="${bank}">${far}</g>`;
    const pond = 'M372 616Q520 590 800 594Q1090 590 1248 618Q1310 664 1196 714Q900 754 620 746Q398 734 356 682Q336 640 372 616z';
    g += `<path fill="${mix(p.ground[0], '#2a2a1a', .3)}" d="M362 612Q520 584 800 588Q1094 584 1258 614Q1326 666 1200 722Q900 762 618 754Q390 742 346 684Q324 640 362 612z"/>`;
    g += K.water({ d: pond, y0: 592, y1: 752, cols: L.water(winter ? ['#a8c0c8', '#6a8c9a', '#3a5a6a'] : ['#8fb4a8', '#4f8088', '#244a54']), clip, lines: 40, shimmer: 30, glints: L.dark < .5 ? 10 : 0, gx0: 500, gx1: 1150, sky: L.low });
    // the far bank mirrored in the still water (static: a wobbling copy of the whole bank costs too much per frame)
    g += `<g clip-path="url(#${clip})"><use href="#${bank}" transform="matrix(1 0 0 -1 0 1212)" opacity=".3"/></g>`;
    g += K.lightPath(L, { y0: 600, y1: 740, w: 50, clip });
    if (winter) g += `<path fill="#e8f0f2" opacity=".35" d="M380 640Q560 610 760 616Q600 640 380 640z"/>`;
    if (!tile) g += K.lilies({ seed: 60, x0: 460, x1: 720, y0: 690, y1: 735, n: 14, season, flowers: .5 });
    // waterbirds: mallards, a duck, coot, moorhen and two Canada geese
    g += K.duck('mallard', 700, 668, .62, { dx: 160, dur: 36 }) + K.duck('female', 760, 676, .58, { dx: 150, dur: 38 }) + K.duck('mallard', 980, 700, .7, { dx: -180, dur: 44, flip: true });
    g += K.duck('coot', 560, 650, .5, { dx: 120, dur: 30 }) + K.duck('moorhen', 1140, 640, .46, { dx: -90, dur: 28, flip: true }) + K.duck('female', 880, 724, .72, { dx: 90, dur: 34 });
    g += K.duck('goose', 900, 630, .55, { dx: -140, dur: 52, flip: true }) + K.duck('goose', 960, 636, .58, { dx: -140, dur: 52, flip: true });
    g += K.fish(640, 712, .7, { dur: 11 }) + K.ripples(1040, 670, { rx: 30, ry: 6, n: 3, dur: 5 }) + K.ripples(520, 700, { rx: 22, ry: 5, n: 2, dur: 6, d: 2 });
    if (!winter && L.dark < .5) g += K.dragonfly(600, 640, .8, { dx: 140, dy: 30 }) + K.dragonfly(1020, 610, .7, { col: '#c0402a', dx: -110, dy: 40 });
    // near margin: reeds and rushes along the front edge of the pond
    g += K.reeds({ seed: 61, x0: 340, x1: 520, y0: 680, y1: 740, n: 26, season, s: .9, strips: 3 }) + K.reeds({ seed: 62, x0: 1150, x1: 1290, y0: 660, y1: 720, n: 18, season, s: .8, strips: 3 });
    g += bench(1290, 712, .9) + K.robin(1270, 680, .7, { dur: 6 }) + lampPost(L, 1404, 690, .9);
    if (L.lamps) g += K.moths(1404, 576);
    // 5. the big trees on the green: an oak to the left, a horse chestnut to the right (white candles in spring)
    g += K.tree('oak', 1520, 712, .95, { season, seed: 63, flutter: tile ? 0 : 5, fall: autumn ? 8 : 0, ground: 760, blossom: spring && !tile });
    g += K.squirrel(1450, 716, .7, { flip: true });
    if (!tile) g += K.tree('hawthorn', 120, 640, .42, { season, seed: 64, blossom: spring && !tile });
    // people on the green
    g += K.walker(1250, 640, .62, { dog: true, dx: 140, dy: 70, dur: 34, seed: 65 }) + K.family(860, 572, .48, { dx: 220, dur: 70, seed: 66, dog: spring || summer });
    g += K.jogger(1180, 580, .46, { dx: 200, dy: 50, dur: 26, seed: 67 }) + K.walker(280, 600, .5, { dx: -200, dur: 46, seed: 68, coat: '#8a3a4a' });
    g += K.walker(1300, 818, .9, { dog: true, dx: -150, dy: 60, dur: 40, seed: 69, coat: winter ? '#2a4a6a' : '#c0583a', hat: winter ? '#c03a3a' : '' });
    // 6. the wildflower margin and longer grass in front
    const kinds = KINDS[season];
    g += K.meadow({ seed: 70, x0: -160, x1: 560, y0: 760, y1: 870, n: 90, k0: .7, k1: 1.2, flowers: winter ? 4 : autumn ? 26 : 60, kinds, season, strips: 4 });
    if (!tile) g += K.meadow({ seed: 71, x0: 760, x1: 1760, y0: 800, y1: 880, n: 70, k0: .8, k1: 1.3, flowers: winter ? 4 : autumn ? 20 : 46, kinds, season, strips: 4 });
    g += K.tree('oak', 110, 830, 1.05, { season, seed: 72, flutter: tile ? 0 : 6, fall: autumn ? 10 : 0, ground: 880 });
    if (!tile) g += K.wind(K.blades({ seed: 73, x0: -160, x1: 1760, y0: 868, y1: 910, n: 70, h: 54, season, heads: summer || autumn ? .3 : 0 }), { amp: 'soft', strips: 4 });
    if ((spring || summer) && L.dark < .5) g += K.butterfly(540, 780, 1, { kind: spring ? 'orangetip' : 'blue' }) + K.butterfly(980, 800, .9, { kind: spring ? 'brimstone' : 'admiral' }) + K.butterfly(160, 740, .8, { kind: 'peacock' }) + K.bee(420, 820, 1) + K.bee(1120, 840, 1.1);
    if (L.dark > .6) g += K.bats({ seed: 74, n: 3, x: 900, y: 380, spread: 260, s: 1.2 });
    // seasonal air
    if (spring) g += K.petals({ seed: 75, n: 14, x0: 0, x1: 1600, y0: 300, y1: 700 });
    if (summer) g += K.motes({ seed: 76, n: 16, x0: 200, x1: 1400, y0: 520, y1: 820 });
    if (autumn) g += K.falling({ seed: 77, n: 14, x0: 0, x1: 1600, y0: 300, y1: 640, dy: 360, dx: 180, cols: p.leaf.oak.concat(['#c0602a']) });
    if (winter) g += K.snow({ seed: 78, n: 22, layers: 2 }) + K.mist({ seed: 79, y: 520, h: 50, n: 4, op: .35 });
    return s + K.tone(L, g) + K.weather(L) + K.grade(L);
  });

  const place = "yateley-green", label = "Yateley Green", town = 'Yateley', kind = 'landscape', tags = ["village green","pond","wildflowers"];
  // Four composed views per season. The summer wide/close/evening and the autumn third view keep the original saved refs.
  const seasonalReasons = {
    spring: ["Spring blossom around the green pond","Spring flowers along the pond margin","Fresh birches beside the open green","Spring dusk beneath the birches"],
    summer: ["The pond within the summer green","Summer insects across the pond margin","Leafy shade beside the open green","A summer evening beneath the birches"],
    autumn: ["Golden leaves around the green pond","Autumn reeds along the water margin","Autumn shade beside the open green","Autumn dusk beneath the birches"],
    winter: ["Bare birches around the green pond","Frosted reeds and winter waterbirds","Snow around the frozen green pond","Winter dusk beneath the bare branches"],
  };
  for (const view of [0]) for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const originalSeason = view === 2 ? 'autumn' : 'summer', reason = seasonalReasons[season][view];
    add('hampshire', kind, { id: `${place}-${view + 1}${season !== originalSeason ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: view === 3 ? 'dreamy' : 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: ['wide', 'close', 'detail', 'evening'][view], viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      svg: (o = {}) => scene(season, o) });
  }
}
