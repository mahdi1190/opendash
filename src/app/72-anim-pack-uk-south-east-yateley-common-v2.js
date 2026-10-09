// UK_SCENE_PART: uk-south-east/yateley-common-v2
/* Yateley Common, view 2 of 4 (close): a sandy heath ride under silver birches.
   https://www.hants.gov.uk/thingstodo/countryside/walking/yateleycommon
   Brief: Yateley Common Country Park (about 200 ha, Hampshire County Council) is lowland heath in
   the Thames Basin Heaths SPA and an SSSI: ling and bell heather, gorse, bracken, spreading silver
   birch and Scots pine on pale sandy soils, with small acid ponds in the hollows. Sandy rides cross
   it, busy with dog walkers, joggers and cyclists; cattle graze the heath to keep it open; stonechat,
   Dartford warbler and woodlark breed; light aircraft from Blackbushe (on its southern edge) cross
   the big sky.
   The other views: 72-anim-pack-uk-south-east-yateley-common-v1..v4.js. Drawn with the rich nature
   kit T.K (src/app/71-anim-uk-nature-kit.js). ids, ukPlace, ukView, ukSeason and season are
   unchanged so saved pins and the rotation keep working. */
function ukSouthEastYateleyCommonV2(T) {
  const { add, R, rnd, mv, U } = T;
  const K = T.K;
  const f = v => Math.round(v * 100) / 100;

  /* ---- place helpers ---- */
  // A grazing cow (belted / red / black): legs, body, a head that dips to graze, tail flicks. Feet at y 0.
  const cow = (x, y, s, col, o = {}) => {
    const dark = K.mix(col, '#000', .35), belt = o.belt ? `<path fill="#f1ece0" d="M-8-62h22v38h-22z"/>` : '';
    const legs = K.S(dark, 7, 'M-34-26v26M-24-26v25M22-26v26M32-26v25');
    const body = `<path fill="${col}" d="M-46-40q0-22 22-24h50q20 2 20 22l-2 18q-4 6-12 6h-62q-14 0-16-8z"/>${belt}<path fill="${dark}" opacity=".35" d="M-44-30q30 10 86 0v8q-40 8-84 0z"/>`;
    const head = mv('ukngraze', { ad: f(o.dur || 10) + 's', d: '-' + f(o.d || 0) + 's', to: '44px -50px' }, `<path fill="${col}" d="M40-56q12-6 20 2l14 24q2 8-6 10l-10-2-20-20z"/><path fill="${dark}" d="M62-22q8 2 10-6l-6-4z"/><path fill="${dark}" d="M46-58l-8-8 12 3zM56-58l6-8-2 10z"/><circle cx="60" cy="-42" r="2" fill="#141010"/>`);
    const tail = mv('ukntail', { ad: f(2.4 + (o.d || 0) % 1.5) + 's', to: '-46px -50px' }, K.S(dark, 3, 'M-46-50q-8 14-4 34') + `<ellipse cx="-50" cy="-14" rx="3" ry="5" fill="${dark}"/>`);
    return K.at(x, y, s, `<ellipse cy="2" rx="60" ry="7" fill="#1c2618" opacity=".25"/>` + legs + tail + body + head, o.flip);
  };
  // A stonechat on a gorse top: black head, white collar, orange breast; it bobs and flicks.
  const stonechat = (x, y, s, o = {}) => K.at(x, y, s, mv('uknpeck', { ad: f(o.dur || 6) + 's', d: '-' + f(o.d || 0) + 's', to: '0px 0px' },
    `<path fill="#6d5640" d="M-12-2q-6-16 8-20 12-2 15 10l-4 11z"/><path fill="#d9792e" d="M1-14q9 1 8 11-7 4-11-4z"/><path fill="#f3efe6" d="M-1-17q5 2 9 0l-1 4q-4 1-8-1z"/><path fill="#1e1a18" d="M0-17q-1-10 8-10 7 1 6 9l-4 1q-6 1-10 0z"/><path fill="#3a2c22" d="M-12-6l-10 3 10 3z"/><path fill="#f3efe6" d="M-6-12l5 3-6 1z"/><path fill="#2a2420" d="M13-21l5 1-5 2z"/>`) +
    K.S('#3a2e24', 1.4, 'M-2 0v4M3 0v4'), o.flip);
  // A light aircraft out of Blackbushe crossing the sky (fades in and out at the ends).
  const plane = (x, y, s, o = {}) => K.at(x, y, 1, mv('uknglide', { ad: f(o.dur || 70) + 's', d: '-' + f(o.d || 0) + 's', dx: (o.dx || 1300) + 'px', dy: (o.dy || -30) + 'px' },
    K.at(0, 0, s, `<path fill="#e9ecef" d="M-30 0q2-6 10-6h34q10 0 14 5l-6 3h-48z"/><path fill="#c23a32" d="M-30 0l-6-12h6l8 8z"/><path fill="#d8dde2" d="M-6-4l-8 18h6l12-18zM-6-5l-4-8h4l8 8z"/><path fill="#5d7486" d="M12-5h6l4 3h-10z"/>` +
      mv('uknflutter', { ad: '.2s' }, `<path stroke="#7a8288" stroke-width="1.5" d="M28-10v14"/>`))));
  // Birch catkins hanging from the near canopy (spring): small swaying tassels.
  const catkins = (seed, x0, x1, y0, y1, n, col) => {
    const r = rnd(seed), bits = [];
    for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), l = 10 + r() * 14; bits.push({ x, z: 0, stroke: col, w: 3.2, d: `M${R(x)} ${R(y)}q${R(r() * 4 - 2)} ${R(l * .5)} ${R(r() * 3)} ${R(l)}` }); }
    return K.wind(bits, { amp: 'soft' });
  };
  // A small acid pond in a heath hollow: the sky in it, rushes, rings.
  const pond = (L, season, x, y, w, h) => {
    const clip = U(), d = `M${x - w} ${y}q${w * .3} ${-h} ${w} ${-h * .9}t${w} ${h * .9}q${-w * .4} ${h * 1.1} ${-w} ${h}t${-w} ${-h}z`;
    return (K.water({ d, y0: y - h, y1: y + h, cols: L.water(['#6f8f86', '#3e6560', '#1e3c3a']), clip, lines: 6, shimmer: true, glints: 6, seed: 51, sky: L.low })) +
      K.ripples(x + w * .3, y + 2, { rx: 16, ry: 4, n: 2, dur: 6 }) + K.ripples(x - w * .4, y + h * .3, { rx: 12, ry: 3, n: 2, dur: 7, d: 3 }) +
      (K.lod() < 1 ? '' : K.reeds({ seed: 52, x0: x - w * 1.05, x1: x - w * .4, y0: y - h * .4, y1: y + h * .6, n: 16, season, k0: .3, k1: .45, kinds: ['plume'], strips: 2 })) +
      (K.lod() < 1 ? '' : K.reeds({ seed: 53, x0: x + w * .55, x1: x + w * 1.05, y0: y - h * .5, y1: y + h * .5, n: 12, season, k0: .3, k1: .4, kinds: ['bulrush', 'plume'], strips: 2 }));
  };

  // The close view: looking south-west along a pale sandy ride, birches arching over it.
  const scene = (season, o = {}) => K.scene(o, () => {
    const moment = { spring: 'morning', summer: 'afternoon', autumn: 'golden', winter: 'day' }[season];
    const L = K.live(o, { heading: 228, fov: 78, horizon: 512, season, at: moment, lat: 51.34, lon: -0.83 });
    const p = K.pal(season), winter = season === 'winter', autumn = season === 'autumn', spring = season === 'spring', summer = season === 'summer';
    const sv = 6200 + ['spring', 'summer', 'autumn', 'winter'].indexOf(season) * 97, hz = L.haze, tile = K.lod() < 1;   // tiles: fewer mid trees and woods (150 KB tile budget)
    let s = K.liveBackdrop(L, { seed: sv + 1, cloudY: [40, 330] });
    s += K.flock({ seed: sv + 2, n: 6, x: 240, y: 230, s: .7, dx: 1000, dy: -50, dur: 46 });
    if (!winter) s += K.flock({ seed: sv + 3, n: 3, x: 1300, y: 300, s: .5, dx: -800, dy: 30, dur: 58, d: 20 });
    s += plane(-120, 150, .9, { dur: 80, d: 18, dx: 1900, dy: -40 });

    let g = '';
    // 1-3: far pine and birch lines across the open heath
    g += K.woods({ seed: sv + 4, y: 512, h: tile ? [40, 62] : [26, 44], mix: { pine: .6, birch: .25, oak: .15 }, season, haze: .66, sway: 0, foot: 14, snow: winter });
    if (!tile) g += K.woods({ seed: sv + 5, y: 528, h: [44, 76], mix: { pine: .45, birch: .4, oak: .15 }, season, haze: .44, x0: -160, x1: 640, foot: 18, sway: 0, snow: winter });
    if (!tile) g += K.woods({ seed: sv + 6, y: 534, h: [40, 70], mix: { pine: .55, birch: .35, oak: .1 }, season, haze: .44, x0: 1060, x1: 1760, foot: 18, sway: 0, snow: winter });
    // 4: the heath floor, mid clumps, cattle grazing and a hollow pond
    g += K.land({ d: 'M-160 900V520Q300 512 800 518T1760 516V900z', top: K.mix(p.heather[1], hz, .35), bottom: p.heather[0], y0: 515, y1: 900, seed: sv + 7, speckle: 120 });
    g += K.heathCarpet({ seed: sv + 8, x0: -160, x1: 1760, y0: 524, y1: 900, rows: 11, lobe: [26, 190], season, haze: .14, hazeCol: hz });
    g += K.tree('pine', 250, 588, .34, { season, seed: sv + 9, haze: .3, hazeCol: hz, snow: winter, still: true });
    if (!tile) g += K.tree('birch', 330, 592, .3, { season, seed: sv + 10, haze: .3, hazeCol: hz, snow: winter, still: true });
    if (!tile) g += K.tree('birch', 1180, 584, .3, { season, seed: sv + 11, haze: .32, hazeCol: hz, snow: winter, still: true });
    if (!tile) g += K.tree('pine', 1290, 580, .4, { season, seed: sv + 12, haze: .32, hazeCol: hz, snow: winter, still: true });
    g += K.tree('birch', 1350, 590, .26, { season, seed: sv + 13, haze: .3, hazeCol: hz, snow: winter, flip: true, still: true });
    for (const [x, y, k, c, fl, d] of [[1010, 566, .26, '#7a4a2e', false, 0], [1086, 572, .3, '#2a2422', true, 4], [960, 560, .2, '#a6623a', false, 7]])
      g += K.shadow(L, x, y, 110 * k, 70 * k) + cow(x, y, k, c, { belt: c === '#2a2422', flip: fl, d, dur: 9 + d * .4 });
    if (!tile) g += K.heath({ seed: sv + 14, x0: -160, x1: 1760, y0: 540, y1: 600, n: 50, season, k0: .2, k1: .32, haze: .2, hazeCol: hz, grass: 40, amp: 'none', strips: 1 });
    g += pond(L, season, 1010, 626, 110, 16);
    // 5: the sandy ride, far to near, curving out of the heather
    const sand = winter ? ['#b9b2a2', '#d8d2c4', '#eeeae0'] : ['#b59a6c', '#dcc59a', '#f1e2bf'];
    g += K.track({ pts: [[790, 524, 10], [770, 556, 26], [830, 610, 60], [760, 690, 130], [640, 790, 260], [560, 920, 440]], seed: sv + 15, season, cols: sand, stones: 40, roots: 2, puddles: summer ? 0 : 2, sky: L.low });
    if (!tile) g += K.speckle({ seed: sv + 16, x0: 470, x1: 880, y0: 660, y1: 900, n: 80, cols: [K.mix(sand[0], '#000', .2), sand[2]] });
    // people on the rides: a family far off, a jogger, a cyclist on the cross ride, a dog walker near
    if (L.dark < .85) g += K.family(780, 560, .3, { dx: -20, dy: 10, dur: 70, dog: true, seed: sv + 17 }) +
      K.jogger(818, 606, .42, { dx: -50, dy: 30, dur: 26, seed: sv + 18 }) + K.cyclist(420, 552, .3, { dx: 260, dur: 30, seed: sv + 19 });
    g += K.shadow(L, 720, 712, 40, 90) + K.walker(720, 712, .72, { dog: true, dx: 70, dy: -24, dur: 46, seed: sv + 20, hat: winter });
    // gorse, mid heath and bracken either side of the ride
    for (const [x, y, k, sd] of [[380, 640, .42, 1], [1150, 646, .46, 2], [150, 680, .62, 3], [1180, 690, .55, 4], [1500, 670, .5, 5], [30, 610, .36, 6], [1530, 760, .8, 7]])
      g += K.shadow(L, x, y, 200 * k, 90 * k) + K.gorse(x, y, k, { season, seed: sv + 30 + sd, bloom: spring ? 1 : summer ? .5 : autumn ? .35 : .15 });
    g += stonechat(1150, 606, .9, { d: 2 }) + stonechat(150, 630, .9, { d: 5, flip: true });
    g += K.heath({ seed: sv + 21, x0: -160, x1: 640, y0: 600, y1: 700, n: 60, season, k0: .4, k1: .7, grass: 25, strips: 4 }) + K.heath({ seed: sv + 22, x0: 900, x1: 1760, y0: 600, y1: 700, n: 60, season, k0: .4, k1: .7, grass: 25, strips: 4 });
    if (!tile) g += K.bracken({ seed: sv + 23, x0: 1000, x1: 1500, y0: 660, y1: 720, n: 14, season, s: .7, strips: 3 });
    g += K.rabbit(930, 700, .7, { dx: 60, dur: 18 }) + K.rabbit(330, 728, .8, { flip: true, dx: -50, dur: 22 });
    if (!winter && !tile) g += K.deer(1560, 640, .4, { season, flip: true });
    // 6: the near birches arching over the ride, and a Scots pine on the right
    g += K.tree('birch', 160, 905, 1.95, { season, seed: sv + 40, flutter: 4, fall: autumn ? 8 : 0, ground: 880, snow: winter });
    if (!tile) g += K.tree('birch', 360, 860, 1.25, { season, seed: sv + 41, flutter: 2, fall: autumn ? 3 : 0, ground: 880, snow: winter, flip: true });
    g += K.tree('birch', 1230, 870, 1.45, { season, seed: sv + 42, flutter: 3, fall: autumn ? 4 : 0, ground: 880, snow: winter });
    g += K.tree('pine', 1490, 905, 1.7, { season, seed: sv + 43, snow: winter, still: true });
    if (spring && !tile) g += catkins(sv + 44, 50, 430, 130, 560, 45, '#a8923e') + catkins(sv + 45, 1120, 1330, 290, 560, 28, '#a8923e');
    // 7: the near heath, bracken and grass at your feet
    g += K.heath({ seed: sv + 24, x0: -160, x1: 470, y0: 760, y1: 900, n: 50, season, k0: .9, k1: 1.5, grass: 25, strips: 5 }) + K.heath({ seed: sv + 25, x0: 960, x1: 1760, y0: 760, y1: 900, n: 50, season, k0: .9, k1: 1.5, grass: 25, strips: 5 });
    g += K.bracken({ seed: sv + 26, x0: 1200, x1: 1760, y0: 830, y1: 905, n: 10, season, s: 1.5 });
    if (!tile) g += K.bracken({ seed: sv + 27, x0: -160, x1: 260, y0: 850, y1: 905, n: 7, season, s: 1.4 });
    g += K.grass({ seed: sv + 28, x0: 380, x1: 1000, y0: 870, y1: 905, n: 40, season, k0: 1.1, k1: 1.5 });
    if ((summer || spring) && !tile) g += K.meadow({ seed: sv + 29, x0: -160, x1: 420, y0: 860, y1: 905, n: 30, h: 60, k0: 1, k1: 1.4, flowers: 14, kinds: spring ? ['dandelion', 'celandine'] : ['harebell', 'ragwort', 'clover'], season });
    // wildlife by day, bats and an owl after dark, seasonal particles
    if (L.dark < .5) {
      if (summer) g += K.butterfly(520, 720, 1, { kind: 'blue' }) + K.butterfly(1100, 760, .9, { kind: 'tortoiseshell' }) + K.butterfly(260, 800, 1.1, { kind: 'peacock' }) + K.bee(300, 780, 1) + K.bee(1080, 800, 1.1) + K.dragonfly(1000, 590, .8, { dx: 120, dy: 20 });
      if (spring) g += K.butterfly(500, 700, 1, { kind: 'brimstone' }) + K.butterfly(1150, 740, .9, { kind: 'orangetip' }) + K.bee(1000, 640, 1);
      if (autumn) g += K.butterfly(600, 740, .9, { kind: 'admiral' });
      if (winter) g += K.robin(1236, 600, .9);
    } else if (!winter) g += K.bats({ seed: sv + 50, n: 3, x: 800, y: 300, spread: 260, s: 1 }) + K.owl(1218, 560, .7);
    if (autumn) g += K.falling({ seed: sv + 60, n: 22, x0: 0, x1: 1500, y0: 80, y1: 520, dy: 420, dx: 200, cols: ['#e8c040', '#d9a02a', '#c47a2a', '#f0d060'], size: 11 });
    if (spring) g += K.motes({ seed: sv + 61, n: 18, x0: 100, x1: 1500, y0: 300, y1: 800, cols: ['#e9d77a', '#fff6c8'] });
    if (summer) g += K.motes({ seed: sv + 62, n: 20, x0: 200, x1: 1400, y0: 450, y1: 820 });
    if (winter && !tile) g += K.snow({ seed: sv + 63, n: 22 });
    return s + K.tone(L, g) + K.weather(L) + K.grade(L);
  });

  const place = "yateley-common", label = "Yateley Common", town = 'Yateley', kind = 'landscape', tags = ["heathland","heather","birch"];
  // Four composed views per season. The summer wide/close/evening and the autumn third view keep the original saved refs.
  const seasonalReasons = {
    spring: ["Fresh heath shoots and flowering gorse","Birch catkins above the sandy path","New growth beside the fallen branch","Spring dusk across the heath"],
    summer: ["Flowering heather beside the sandy trail","Butterflies beneath the leafy birches","Summer heather around the fallen branch","A summer dusk perch over the heath"],
    autumn: ["Golden birches and dry heath seed heads","Falling leaves above the winding path","Autumn gorse beside the fallen branch","Amber dusk over the open heath"],
    winter: ["Frosted heath and a winter robin","Bare birches above the pale sandy path","Snow over the heath and fallen branch","Winter dusk over the frosted heath"],
  };
  for (const view of [1]) for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const originalSeason = view === 2 ? 'autumn' : 'summer', reason = seasonalReasons[season][view];
    const it = { id: `${place}-${view + 1}${season !== originalSeason ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: view === 3 ? 'dreamy' : 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: ['wide', 'close', 'detail', 'evening'][view], viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: 51.34, lon: -0.83 },
      svg: (o = {}) => scene(season, o) };
    // The composed scene (71-scene-uk-south-east-yateley-common-2.js) when the scene engine is in the build; the
    // hand-drawn art above stays as legacySvg (and is the item's art without the engine).
    add('hampshire', kind, typeof _scYc === 'object' ? _scYc.composed(it, season, typeof sceneYateleyCommon2 === 'function' ? sceneYateleyCommon2 : null) : it);
  }
}
