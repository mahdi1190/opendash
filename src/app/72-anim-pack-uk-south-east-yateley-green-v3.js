// UK_SCENE_PART: uk-south-east/yateley-green-v3
/* Yateley Green — the open common, its pond and wildflower margins.
     https://yateley-tc.gov.uk/our-services/open-spaces/
     https://www.hart.gov.uk/sites/default/files/2022-11/yateley_green_accessible.pdf (conservation area appraisal)
   View 3 of 4 (detail): one file per view, so each view's art can change without
   touching the others (the other views: 72-anim-pack-uk-south-east-yateley-green-v1..v4.js).
   Keep every id, ukPlace, ukView, ukSeason and season unchanged so saved pins and the rotation keep working.

   Brief (view 3, "detail": in the shade of a big oak on the bank of Shute's Pond, looking south-west):
   - Yateley Green is a large common of wide open mown grass edged by mature oaks and horse chestnuts,
     with Shute's Pond, its largest pond, set in the grass and fringed by reeds and wildflower margins.
   - Beyond the green, Church End: brick and white-rendered cottages under clay-tile roofs, and St Peter's,
     whose early 16th-century timber bell tower (shingled spire, eight bells) shows through the trees.
   - Everyday life: dog walkers and strollers on the mown paths, mallards and coots on the pond, squirrels
     under the chestnuts (conkers in autumn), blackbirds and robins in the margins. No signage drawn.
   The sky, sun, moon (real phase), stars, light, shadows, lit windows and reflections follow the live
   almanac for the user's location and clock (K.live); without a live sky the authored moment is used. */
function ukSouthEastYateleyGreenV3(T) {
  const { add, U, rnd } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js)
  const R = v => Math.round(v * 10) / 10;

  // St Peter's church: K.stPeters in the kit (the same drawing in every Yateley Green view).

  // A Church End cottage: brick or white render, tiled or thatched roof, chimney, lit windows at dusk.
  const cottage = (L, x, y, s, v) => {
    const wall = ['#b4654a', '#efe8d8', '#c47a58', '#e6dccb'][v % 4], roof = v % 3 === 2 ? '#8a7350' : ['#8e4a36', '#7b3f30'][v % 2];
    const thatch = v % 3 === 2, w = 150 + (v % 2) * 40;
    let g = K.P(wall, `M${-w / 2} 0V-70H${w / 2}V0z`);
    if (wall[1] < 'c') g += K.S('#8a4a36', 1, Array.from({ length: 6 }, (_, i) => `M${-w / 2} ${-10 - i * 11}H${w / 2}`).join(''), ' opacity=".35"');
    g += thatch ? K.P(roof, `M${-w / 2 - 12} -64Q0 -150 ${w / 2 + 12} -64Q0 -78 ${-w / 2 - 12} -64z`) + K.S('#6c5838', 1.2, `M${-w / 3} -96Q0 -120 ${w / 3} -96`, ' opacity=".6"')
      : K.P(roof, `M${-w / 2 - 10} -66L${-w / 2 + 30} -126H${w / 2 - 30}L${w / 2 + 10} -66z`) + K.S('#5a2c22', 1, `M${-w / 2 + 10} -80H${w / 2 - 10}M${-w / 2 + 20} -96H${w / 2 - 20}M${-w / 2 + 28} -112H${w / 2 - 28}`, ' opacity=".4"');
    g += K.P('#7a4a38', `M${w / 2 - 50} -120V-150h18v${thatch ? 50 : 30}z`);
    g += K.window(L, -w / 2 + 18, -54, 26, 22, { frame: '#f4f0e6' }) + K.window(L, w / 2 - 44, -54, 26, 22, { frame: '#f4f0e6', curtain: v % 2 }) + K.window(L, -w / 2 + 18, -110 + (thatch ? 20 : 0), 22, 16, { frame: '#f4f0e6', on: .45 });
    g += K.P(['#2f5a46', '#6a2a2a', '#2a3a5a'][v % 3], 'M-12 0v-40h24V0z') + K.lamp(L, 20, -46, 2.6);
    return K.at(x, y, s, g);
  };

  // A park bench on the green.
  const bench = (x, y, s) => K.at(x, y, s, K.P('#6f5a40', 'M-40-22h80v5h-80zM-40-13h80v5h-80zM-42-6h84v5h-84z') + K.S('#3e3328', 3, 'M-32 10V-24M32 10V-24'));

  // Conkers and their spiky husks in the autumn grass (horse chestnut).
  const conkers = (seed, x0, x1, y0, y1, n) => {
    const r = rnd(seed); let husk = '', nut = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), k = .6 + (y - y0) / (y1 - y0 + 1) * .8;
      if (i % 3) nut += `<ellipse cx="${R(x)}" cy="${R(y)}" rx="${R(5 * k)}" ry="${R(4 * k)}"/>`;
      else husk += `<path d="M${R(x - 7 * k)} ${R(y)}q${R(7 * k)} ${R(-12 * k)} ${R(14 * k)} 0q${R(-7 * k)} ${R(5 * k)} ${R(-14 * k)} 0z"/>`;
    }
    return `<g fill="#6a3418" stroke="#d9a06a" stroke-width=".8">${nut}</g><g fill="#9aa04a" stroke="#c6c47a" stroke-width="1" stroke-dasharray="1 2">${husk}</g>`;
  };

  const scene = (season, o) => K.scene(o, () => {
    const L = K.live(o, { heading: 228, fov: 80, horizon: 470, season, at: 'afternoon', lat: 51.343, lon: -0.835 });
    const p = K.pal(season), spring = season === 'spring', summer = season === 'summer', autumn = season === 'autumn', winter = season === 'winter';
    const snowy = winter && (!L.live || L.snow), seedBase = 7300 + ['spring', 'summer', 'autumn', 'winter'].indexOf(season) * 97;
    const sd = n => seedBase + n, lite = K.lod() < 1;   // lite: the small tile (150 KB), only the main shapes
    const sky = K.liveBackdrop(L, { seed: sd(1), cloudY: [30, 330] });
    let far = '', g = '', glimpse = '';

    // 1. far: the tree line behind Church End, the church and cottages glimpsed between trees
    far += K.woods({ seed: sd(2), y: 478, h: [50, 82], mix: { oak: .6, alder: .2, pine: .2 }, season, haze: .6, sway: 0, foot: 16 });
    if (!lite) far += K.woods({ seed: sd(3), y: 490, h: [56, 92], mix: { oak: .65, birch: .1, alder: .25 }, season, haze: .45, gap: 1.6, foot: 14, sway: 0 });
    far += K.stPeters(L, 1097, 506, 1.1);   // the shared St Peter's (kit)
    far += cottage(L, 640, 508, .5, 1) + cottage(L, 1250, 508, .52, 0) + (lite ? '' : cottage(L, 770, 510, .46, 2) + cottage(L, 1390, 510, .48, 3));
    // a few trees in front, so Church End is glimpsed through them rather than shown whole
    if (!lite) for (const [x, k, sp] of [[700, .2, 'oak'], [960, .17, 'alder'], [1110, .22, 'oak'], [1320, .19, 'oak'], [560, .18, 'alder']]) glimpse += K.tree(sp, x, 514, k, { season, seed: sd(x), haze: .3, shadow: false, snow: snowy, still: true });
    g += far;
    far = glimpse;
    // 2. the green: wide open mown grass, a mown path and the strollers on it
    far += K.land({ d: 'M-160 900V506Q500 498 900 504T1760 500V900z', top: K.mix(p.grass[2], L.haze || '#c9dbe0', .3), bottom: p.grass[1], y0: 500, y1: 640, seed: sd(4), speckle: 160 });
    if (!lite) far += K.turf({ seed: sd(5), y0: 508, y1: 600, rows: 5, lobe: [14, 40], season, haze: .25 });
    if (snowy) far += `<path fill="#f2f5f6" opacity=".75" d="M-160 640V510Q500 502 900 507T1760 504V640z"/>`;
    far += K.S(K.mix(p.ground[2], p.grass[2], .45), 6, 'M-160 556Q300 540 700 548T1760 534', ' opacity=".7"');
    g += far;
    // mid trees across the green, standing clear: oaks and horse chestnuts, with their shadows
    if (!lite) g += K.tree('oak', 300, 560, .5, { season, seed: sd(6), snow: snowy, still: true });
    if (!lite) g += K.tree('oak', 1500, 556, .46, { season, seed: sd(7), snow: snowy, flip: true, still: true });
    g += K.tree('oak', 880, 548, .32, { season, seed: sd(8), blossom: spring && !lite, snow: snowy, still: true, shadow: false });   // horse chestnut: candles in spring
    g += bench(560, 566, .5) + bench(1180, 560, .45);
    g += K.walker(420, 552, .42, { dog: true, dx: 260, dur: 70, seed: 11 });
    g += K.walker(1260, 546, .36, { dx: -220, dur: 80, seed: 12, flip: true });
    g += K.family(700, 550, .38, { dx: 180, dur: 90, dog: !winter, seed: 13 });
    if (!winter) g += K.jogger(1000, 540, .32, { dx: -300, dur: 36, seed: 14, flip: true });
    g += K.walker(160, 560, .44, { dog: true, dx: 140, dur: 60, seed: 15 });
    if (summer || spring) g += K.cyclist(1350, 534, .3, { dx: -260, dur: 40, seed: 16, flip: true });
    g += K.mist({ seed: sd(9), y: 520, h: 36, n: 3, op: winter ? .4 : autumn ? .3 : .15 });

    // 3. Shute's Pond: reflects the far bank and the sky, with the light road under the sun or moon
    const pond = U(), pondD = 'M-160 900V640Q120 600 500 606T1100 600Q1500 596 1760 612V900z';
    g += K.S(K.mix(p.ground[0], '#2a2a1e', .3), 10, 'M-160 641Q120 601 500 607T1100 601Q1500 597 1760 613', ' opacity=".55"');
    g += K.water({ d: pondD, clip: pond, y0: 600, y1: 900, cols: L.water(winter ? ['#c8d8e0', '#8fa9b8', '#56707e'] : ['#9cc8c4', '#4e8e98', '#1e4f5e']), reflect: [], lines: 70, shimmer: 50, glints: summer ? 12 : 5, sky: L.low, seed: sd(10) });
    // the far bank in the water: a soft mirrored silhouette of the tree line and the spire
    // (cheap paths, not a <use> copy of the whole bank, which doubled the paint cost of every frame)
    {
      const rq = rnd(sd(40)), crown = winter ? K.mix(p.bare || '#6a6058', '#8fa4b0', .4) : K.mix((p.leaf.oak || p.leaf.birch)[0], '#3a6070', .35);
      let d = 'M-160 600', x = -160;
      d = 'M-160 600V628';
      while (x < 1760) { const w = 30 + rq() * 60, b = 630 + rq() * 8, dep = 10 + rq() * 26; d += `Q${R(x + w / 2)} ${R(b + dep * 2)} ${R(x + w)} ${R(b)}`; x += w * (.75 + rq() * .2); }
      d += 'V600z';
      g += `<g clip-path="url(#${pond})" opacity="${winter ? .22 : .3}"><path fill="${crown}" d="${d}"/>` +
        `<path fill="#5c5550" d="M1080 628l18 64 18-64z" opacity=".7"/></g>`;
    }
    g += K.lightPath(L, { y0: 610, y1: 860, w: 50, clip: pond });
    if (winter) g += `<path fill="#e8f0f2" opacity=".4" d="M-160 900V700Q300 660 760 680T1760 650V900z"/>` + K.S('#ffffff', 1.4, 'M200 720l90-12M600 700l140 8M980 690l120-6M1300 676l80 10', ' opacity=".5"');
    // the far reed fringe and margin plants along the waterline
    g += K.reeds({ seed: sd(11), x0: -160, x1: 420, y0: 604, y1: 640, n: 24, season, kinds: ['bulrush', 'plume'], k0: .35, k1: .55 });
    g += K.reeds({ seed: sd(12), x0: 1180, x1: 1760, y0: 598, y1: 630, n: 24, season, kinds: ['plume', 'bulrush'], k0: .35, k1: .55 });
    if (!winter && !lite) g += K.lilies({ seed: sd(13), x0: 900, x1: 1500, y0: 660, y1: 740, n: 14, flowers: summer ? 6 : spring ? 2 : 0, season });
    // waterfowl: mallards, a pair of coots, a moorhen (every one drifts on its own)
    g += K.duck('mallard', 620, 690, .7, { dx: 160, dur: 40 }) + K.duck('female', 690, 702, .66, { dx: 150, dur: 42 });
    g += K.duck('coot', 1040, 655, .5, { dx: -120, dur: 34, flip: true }) + K.duck('coot', 1100, 664, .48, { dx: -100, dur: 38, flip: true });
    g += K.duck('moorhen', 420, 650, .45, { dx: 90, dur: 30 }) + K.duck('mallard', 1280, 720, .78, { dx: -180, dur: 46, flip: true });
    if (spring && !lite) g += [0, 1, 2, 3].map(i => K.duck('female', 740 + i * 24, 712 + (i % 2) * 6, .3, { dx: 150, dur: 42 })).join('');
    g += K.ripples(860, 760, { rx: 50, ry: 8, n: 3, dur: 5 }) + K.ripples(300, 700, { rx: 34, ry: 6, n: 2, dur: 4.5, d: 2 });
    if (!winter) g += K.fish(520, 780, .9, { dur: 11 }) + K.fish(1180, 760, .8, { dur: 14, d: 6 });
    if (summer) g += K.dragonfly(960, 640, .8) + K.dragonfly(380, 700, .7);

    // 4. the near bank: wildflower margin, a big oak framing the left, a horse chestnut on the right
    g += K.land({ d: 'M-160 900V770Q200 740 520 790Q760 830 900 900z', top: K.mix(p.grass[1], p.ground[1], .2), bottom: p.grass[0], y0: 760, y1: 900, seed: sd(14), speckle: 120 });
    g += K.land({ d: 'M1760 900V740Q1500 720 1260 780Q1120 830 1060 900z', top: p.grass[1], bottom: p.grass[0], y0: 730, y1: 900, seed: sd(15), speckle: 100 });
    if (snowy) g += `<path fill="#f4f7f8" opacity=".8" d="M-160 900V780Q200 750 520 800Q760 838 880 900zM1760 900V752Q1500 732 1260 790Q1130 836 1080 900z"/>`;
    g += K.reeds({ seed: sd(16), x0: 380, x1: 760, y0: 780, y1: 860, n: 26, season, kinds: ['bulrush'], k0: .6, k1: .9 });
    g += K.tree('oak', 40, 905, 1.35, { season, seed: sd(17), still: true, flutter: 8, fall: autumn ? 12 : 0, ground: 900, snow: snowy });
    g += K.tree('oak', 1560, 890, 1.0, { season, seed: sd(18), still: true, flutter: 6, fall: autumn ? 8 : 0, ground: 890, blossom: spring && !lite, snow: snowy, flip: true });   // horse chestnut
    const flowers = spring ? ['cowparsley', 'buttercup', 'celandine', 'daisy'] : summer ? ['knapweed', 'campion', 'clover', 'daisy', 'buttercup'] : autumn ? ['knapweed', 'ragwort', 'clover'] : [];
    if (lite) g += K.grass({ seed: sd(19), x0: -160, x1: 560, y0: 800, y1: 905, n: 40, season, k0: .9, k1: 1.4 });
    else if (!winter) {
      g += K.meadow({ seed: sd(19), x0: -160, x1: 560, y0: 790, y1: 905, n: 40, h: 70, k0: .8, k1: 1.5, flowers: spring || summer ? 36 : 14, kinds: flowers, season });
      g += K.meadow({ seed: sd(20), x0: 1120, x1: 1760, y0: 770, y1: 905, n: 40, h: 70, k0: .8, k1: 1.5, flowers: spring || summer ? 32 : 12, kinds: flowers, season });
      if (spring && !lite) g += K.bluebells({ seed: sd(21), x0: 1260, x1: 1700, y0: 820, y1: 900, n: 40 });
    } else g += K.grass({ seed: sd(19), x0: -160, x1: 560, y0: 790, y1: 905, n: 60, season, k0: .8, k1: 1.4 }) + K.grass({ seed: sd(20), x0: 1120, x1: 1760, y0: 770, y1: 905, n: 60, season, k0: .8, k1: 1.4 });
    if (!lite) g += K.wind(K.blades({ seed: sd(22), x0: -160, x1: 480, y0: 860, y1: 905, n: 26, h: 70, season, heads: summer || autumn ? .3 : 0 }), {});
    if (!lite) g += K.wind(K.blades({ seed: sd(23), x0: 1180, x1: 1760, y0: 850, y1: 905, n: 26, h: 70, season, heads: summer || autumn ? .3 : 0 }), {});
    if (autumn && !lite) g += conkers(sd(24), 1240, 1720, 840, 900, 24) + K.falling({ seed: sd(25), n: 22, x0: -100, x1: 1700, y0: 120, y1: 600, dy: 380, dx: 180, cols: ['#c8702a', '#e0a040', '#9a5a2a', '#d88a36'] });

    // 5. life close by: squirrel, robin, butterflies, bees, birds overhead, seasonal air
    g += K.squirrel(1420, 880, .9, { dx: -60 });
    g += K.robin(250, 876, .9) + K.robin(1180, 870, .8, { dur: 7 });
    if (summer || spring) g += K.butterfly(300, 790, .9, { kind: spring ? 'brimstone' : 'blue' }) + K.butterfly(1300, 800, .8, { kind: 'tortoiseshell' }) + K.butterfly(820, 720, .6, { kind: 'peacock' }) + K.bee(160, 860, 1) + K.bee(1380, 850, 1) + K.bee(1250, 830, .9);
    if (spring) g += K.petals({ seed: sd(26), n: 16, x0: 1100, x1: 1700, y0: 300, y1: 700 });
    if (summer) g += K.motes({ seed: sd(27), n: 22, x0: 100, x1: 1500, y0: 420, y1: 820 });
    if (winter && !L.live) g += K.snow({ seed: sd(28), n: 46 });
    if (winter) g += K.flock({ seed: sd(29), n: 7, x: 500, y: 190, s: .8, dx: 900, dur: 40, v: true, col: '#3a4048' });
    else g += K.flock({ seed: sd(29), n: 5, x: 300, y: 230, s: .6, dx: 1000, dur: 38 });
    if (L.dark > .6) g += K.bats({ seed: sd(30), n: summer || autumn ? 4 : 0, x0: 300, x1: 1300, y0: 250, y1: 450 }) + K.moths(1480, 600, { n: summer ? 5 : 0 });
    return sky + K.tone(L, g) + K.weather(L) + K.grade(L);
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
  // of this view share ONE auto-season composed scene (71-scene-uk-south-east-yateley-green-detail.js, drawn by the canvas renderer: the
  // date picks the season, the live sky the light). Every id, ukPlace, ukView, ukSeason, season and the rotation stay as
  // they were; the hand-drawn art above is kept as legacySvg (the old-versus-new sheets) and is the scene without the engine.
  const ygFound = typeof sceneItems === 'function' && typeof sceneItem === 'function' ? sceneItems('uk-south-east-yateley-green').find(i => i.id === 'yateley-green-3') : null;
  const ygScene = ygFound ? ygFound.scene : null;
  for (const view of [2]) for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const originalSeason = view === 2 ? 'autumn' : 'summer', reason = seasonalReasons[season][view];
    const legacy = (o = {}) => scene(season, o);
    const o = { id: `${place}-${view + 1}${season !== originalSeason ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: view === 3 ? 'dreamy' : 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: ['wide', 'close', 'detail', 'evening'][view], viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: 51.343, lon: -0.835 },
      svg: legacy };
    add('hampshire', kind, ygScene ? Object.assign(sceneItem(Object.assign({ intensity: 'subtle' }, o), ygScene), { season: [season], liveSky: o.liveSky, legacySvg: legacy }) : o);
  }
}
