// UK_SCENE_PART: uk-south-east/yateley-common-v1
/* Yateley Common — view 1 (wide): the open heath looking south-west over the Common.
   https://www.hants.gov.uk/thingstodo/countryside/walking/yateleycommon
   https://www.hants.gov.uk/thingstodo/countryside/finder/yateleycommon
   https://tbhpartnership.org.uk/news/yateley-common/
   Brief (this view): Yateley Common Country Park is over 450 acres of lowland heath, woodland and
   ponds between Yateley, the A30 and Blackbushe Airport, much of it an SSSI and part of the Thames
   Basin Heaths SPA. The heath is ling, bell heather and cross-leaved heath with common and dwarf
   gorse, scattered silver birch and Scots pine and bracken on sandy, gravelly soils; small heathland
   ponds lie in the hollows. Dartford warblers and stonechats use the gorse, nightjars the open heath;
   grazing, gorse coppicing and birch cutting keep it open, and dog walkers use the sandy tracks.
   Light planes from Blackbushe pass low over the northern edge.
   View 1 of 4 (wide): one file per view (the others: ...-yateley-common-v2..v4.js). Drawn with the
   rich nature kit T.K (src/app/71-anim-uk-nature-kit.js) on the live sky (K.live: the real sun,
   moon phase, stars and light for the user's place and clock). Keep every id, ukPlace, ukView,
   ukSeason and season unchanged so saved pins and the rotation keep working. */
function ukSouthEastYateleyCommonV1(T) {
  const { add, mv } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js)
  if (!K) return;
  const R = v => Math.round(v), f2 = v => Math.round(v * 100) / 100;
  const rnd = seed => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  const LAT = 51.34, LON = -0.83;

  /* ---------- place-specific helpers ---------- */
  // Conservation-grazing cattle (local art faces right): a grazing head that lifts now and then, a tail flick.
  const cow = (L, x, y, s, o = {}) => {
    const c = o.col || '#6a3f26', d = K.mix(c, '#000', .3), lt = K.mix(c, '#fff', .2), belt = o.belt;
    const legs = `<path fill="none" stroke="${d}" stroke-width="7" stroke-linecap="round" d="M-42-22l-2 26M-30-22l2 26M28-22l-1 26M40-22l2 26"/><path fill="#2a221c" d="M-48 2h8v4h-8zM-26 2h8v4h-8zM24 2h8v4h-8zM38 2h8v4h-8z"/>`;
    const body = `<path fill="${c}" d="M-56-44q-4-22 20-26h62q26 0 28 22 2 22-12 28l-14 2H-38q-18-4-18-26z"/>` +
      (belt ? `<path fill="${belt}" d="M-12-70h26q4 26-2 50h-22q-6-24-2-50z"/>` : '') +
      `<path fill="${lt}" opacity=".35" d="M-46-58q30-12 80-6-30 4-80 6z"/><path fill="${d}" opacity=".35" d="M-50-28q40 10 96 2-6 8-16 8H-38q-10-2-12-10z"/>` +
      `<path fill="${K.mix(c, '#f0d0c0', .5)}" d="M-4-18q8 6 16 0-4 8-8 8t-8-8z"/>`;
    const tail = mv('ukntail', { ad: `${f2(2.2 + (x % 7) * .25)}s`, d: `-${f2((x % 5) * .4)}s`, to: '-56px -56px' }, `<path fill="none" stroke="${d}" stroke-width="3" d="M-56-56q-8 14-6 36"/><path fill="${d}" d="M-66-22q4-6 8 0l-2 8h-4z"/>`);
    const head = mv('ukngraze', { ad: `${f2(o.dur || 10)}s`, d: `-${f2(o.d || 0)}s`, to: '44px -54px' }, `<path fill="${c}" d="M40-62q14-8 22 4l14 10q8 8 0 14l-10 4q-8 0-12-8l-16-12z"/><path fill="${o.face || K.mix(c, '#000', .15)}" d="M70-40q8 4 4 10l-8 2q-4-6 4-12z"/><circle cx="62" cy="-50" r="2" fill="#140e0a"/><path fill="${d}" d="M52-64l-6-10 10 6zM60-62l8-8-2 10z"/>` + (o.horns ? `<path fill="none" stroke="#e8dcc0" stroke-width="3" stroke-linecap="round" d="M54-66q-6-12 4-18M60-64q10-8 18-2"/>` : ''));
    return K.shadow(L, x, y + 3 * s, 120 * s, 70 * s) + K.at(x, y, s, legs + tail + body + head, o.flip);
  };
  // A stonechat on a sprig (male: black head, white collar, orange breast): bobs, flicks its tail.
  const stonechat = (x, y, s, o = {}) => K.at(x, y, s,
    `<path fill="none" stroke="#5a4a3a" stroke-width="2" d="M-14 6q10-4 22-2"/>` +
    mv('ukntail', { ad: '1.4s', to: '-8px -6px' }, `<path fill="#2a2420" d="M-8-6l-12 10 4 2 10-8z"/>`) +
    mv('uknpeck', { ad: `${f2(o.dur || 6)}s`, d: `-${f2(o.d || 0)}s`, to: '0px 4px' },
      `<path fill="#4a3c32" d="M-10-4q-2-12 10-14 10-1 12 8l-4 10q-12 4-18-4z"/><path fill="${o.female ? '#c99266' : '#e07a3a'}" d="M4-12q8 2 8 10-4 6-10 4z"/>` +
      `<path fill="${o.female ? '#6a5442' : '#1c1a1a'}" d="M0-16q2-10 10-8 4 4 2 8z"/>` + (o.female ? '' : `<path fill="#f4f0e8" d="M2-14q4 0 6 4l-6 0z"/>`) +
      `<path fill="#f0ece2" opacity=".8" d="M-6-8l6-2v3z"/><circle cx="8" cy="-19" r="1.2" fill="#0a0a0a"/><path fill="#1a1a1a" d="M12-19l4 1-4 1z"/>`) +
    `<path stroke="#2a2420" stroke-width="1.2" d="M-2 0v6M2 0v6"/>`, o.flip);
  // A light aircraft out of Blackbushe crossing the sky slowly (navigation lights after dusk).
  const plane = (L, y, o = {}) => {
    const lit = L.dark > .4, body = `<path fill="${lit ? '#2a3040' : '#f2f2ee'}" d="M-34 0q2-6 12-6h34q10 0 14 4l-4 4H-30z"/><path fill="${lit ? '#2a3040' : '#e8e8e4'}" d="M-30-4l-6-10h6l8 8z"/><path fill="${lit ? '#343a48' : '#d8dce0'}" d="M-6-8h22l-2-3h-18z"/><path fill="#3a5a8a" d="M14-4h8l2 2h-10z"/><path fill="${lit ? '#2a3040' : '#c8ccd0'}" d="M-4 2l-2 6h4l6-6z"/>` + (lit ? `<circle cx="-36" cy="-14" r="1.6" fill="#ff5040"/><circle cx="24" cy="-2" r="1.6" fill="#f8f8ff"/>` : '');
    return mv('uknglide', { ad: `${o.dur || 70}s`, d: `-${o.d || 20}s`, dx: '2100px', dy: '-60px' }, `<g transform="translate(-260 ${y}) scale(${o.s || .9})">${body}</g>`);
  };
  // Nightjar churring on a dead pine branch at dusk (just a silhouette that turns its head).
  const pondPath = (x0, x1, y0, y1, r) => {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2; let d = '';
    for (let i = 0; i <= 18; i++) { const a = i / 18 * Math.PI * 2, k = 1 + (r() - .5) * .14; d += `${i ? 'L' : 'M'}${R(cx + Math.cos(a) * rx * k)} ${R(cy + Math.sin(a) * ry * k)}`; }
    return d + 'z';
  };

  /* ---------- the view ---------- */
  const draw = (season, o) => K.scene(o, () => {
    const si = ['spring', 'summer', 'autumn', 'winter'].indexOf(season), seed = 6200 + si * 100, r = rnd(seed);
    const winter = season === 'winter', autumn = season === 'autumn', spring = season === 'spring', summer = season === 'summer';
    const L = K.live(o, { heading: 215, fov: 80, horizon: 500, season, at: 'afternoon', lat: LAT, lon: LON });
    const lo = K.lod() < 1;   // a small tile: about a fifth of the detail
    const p = K.pal(season), hazeCol = K.mix(L.low, '#d8e2e6', .35), night = L.dark > .75;
    const sky = K.liveBackdrop(L, { seed: seed + 3, cloudY: [30, 330] }) +
      K.flock({ seed: seed + 4, n: 6, x: 300, y: 230, s: .7, dx: 900, dur: 40, col: K.mix('#2f3d48', L.top, .3) }) +
      plane(L, 190, { dur: 80, d: 12 });

    let g = '';
    // 1. the far tree line: Blackbushe woods and the pine belts beyond the heath, hazed
    g += K.woods({ seed: seed + 10, y: 486, h: [30, 52], mix: { pine: .55, birch: .25, oak: .2 }, season, haze: .62, hazeCol, sway: 0, snow: false, gap: lo ? 3.2 : 1 });
    // 2. a nearer belt of Scots pine and birch along the heath edge, broken into stands
    g += K.woods({ seed: seed + 11, y: 506, h: [46, 82], mix: { pine: .6, birch: .4 }, season, haze: .38, hazeCol, x0: -160, x1: 640, gap: lo ? 2.4 : 1.1, sway: 0 });
    if (!lo) g += K.woods({ seed: seed + 15, y: 498, h: [34, 56], mix: { pine: .5, birch: .3, oak: .2 }, season, haze: .5, hazeCol, x0: 600, x1: 1100, sway: 0 });
    if (!lo) g += K.woods({ seed: seed + 12, y: 510, h: [40, 70], mix: { pine: .5, birch: .5 }, season, haze: .4, hazeCol, x0: 1060, x1: 1760, gap: 1.2, sway: 0 });
    // 3. the open heath: land and a carpet of heather cushions running back to the trees
    g += K.land({ d: 'M-160 900V492Q300 486 800 490T1760 490V900z', top: K.mix(p.heather[0], hazeCol, .3), bottom: p.heather[0], y0: 490, y1: 900, seed: seed + 13, speckle: 300 });
    g += K.heathCarpet({ seed: seed + 14, season, y0: 500, y1: 905, rows: lo ? 7 : 8, lobe: [24, 170], haze: .1, hazeCol });
    // far scatter: small birch and pine, gorse clumps, a stand of three pines
    // lone birch and pine dotted over the open heath (shared symbols, two staggered depths)
    g += K.woods({ seed: seed + 20, y: 526, h: [30, 46], mix: { pine: .5, birch: .5 }, season, haze: .34, hazeCol, rows: 1, gap: 7, mass: false, shrubs: false, sway: 0 });
    g += K.woods({ seed: seed + 21, y: 548, h: [40, 60], mix: { pine: .4, birch: .6 }, season, haze: .26, hazeCol, rows: 1, gap: 9, mass: false, shrubs: false, x0: 660, x1: 1760, sway: 0 });
    if (!lo) g += K.tree('pine', 1290, 548, .27, { season, seed: seed + 36, haze: .22, hazeCol }) + K.tree('pine', 1330, 552, .3, { season, seed: seed + 37, haze: .2, hazeCol }) + K.tree('pine', 1372, 546, .24, { season, seed: seed + 38, haze: .24, hazeCol });
    for (let i = 0; i < (lo ? 3 : 10); i++) { const x = -120 + r() * 1840, y = 530 + r() * 50; g += K.gorse(x, y, .1 + (y - 530) / 50 * .08 + r() * .04, { season, seed: seed + 40 + i, haze: .25, hazeCol, still: true }); }

    // 4. a heathland pond in the hollow (left of centre): live sky in the water, a birch on the far bank reflected
    const pr = rnd(seed + 60), pd = pondPath(230, 640, 572, 640, pr), birchId = T.U(), clip = T.U();
    const bankBirch = `<g id="${birchId}">${K.tree('birch', 470, 578, .3, { season, seed: seed + 61, flutter: 4 })}${lo ? '' : K.tree('birch', 520, 576, .24, { season, seed: seed + 62 })}</g>`;
    g += K.heath({ seed: seed + 71, x0: -160, x1: 1760, y0: 560, y1: 646, n: 80, season, k0: .25, k1: .45, grass: 30, amp: 'none' });
    if (!lo) g += bankBirch;
    g += `<path fill="${K.mix(p.ground[0], '#2a2a20', .3)}" d="${pondPath(222, 648, 568, 646, rnd(seed + 60))}"/>`;
    let pond = K.water({ d: pd, y0: 572, y1: 640, cols: L.water(['#7fa8b0', '#3f6e78', '#24444c']).map(c => K.mix(c, '#0a1020', L.dark * .55)), clip, lines: 26, shimmer: 22, glints: L.dark < .5 ? 8 : 0, gx0: 260, gx1: 620, sky: L.low, keepSky: true });
    if (!lo) pond = pond.replace(/<\/g>$/, K.mirror(birchId, 578, .3) + '</g>');
    g += pond + K.keep(K.lightPath(L, { y0: 574, y1: 638, w: 50, clip }));
    if (!winter) g += K.lilies({ seed: seed + 63, x0: 280, x1: 420, y0: 600, y1: 632, n: 9, season, flowers: .3 });
    g += K.ripples(380, 612, { rx: 26, ry: 4, n: 3, dur: 5 }) + K.ripples(560, 624, { rx: 18, ry: 3, n: 2, dur: 4, d: 2 });
    if (!winter) g += K.duck(summer || spring ? 'mallard' : 'female', 330, 620, .5, { dx: 120, dur: 46 });
    g += K.reeds({ seed: seed + 64, x0: 220, x1: 330, y0: 610, y1: 648, n: 16, season, k0: .35, k1: .5, kinds: ['bulrush', 'plume'] });
    g += K.reeds({ seed: seed + 65, x0: 560, x1: 660, y0: 616, y1: 650, n: 12, season, k0: .35, k1: .5, kinds: ['plume'] });
    if (summer || spring) g += K.dragonfly(440, 590, .6, { col: '#2f8ac6', dx: 140, dy: 30 }) + K.dragonfly(300, 600, .5, { col: '#c8402a', dx: -90, dy: 24 });

    // 5. cattle grazing the heath (right of centre), the sandy track winding toward the trees
    const herd = [[1010, 604, .5, '#6a3f26', 0], [1120, 596, .44, '#2a2422', 3], [1330, 612, .56, '#8a5a34', 6], [940, 594, .4, '#2a2422', 8]];
    herd.forEach(([x, y, s, c, d], i) => { g += cow(L, x, y, s, { col: c, d, dur: 9 + i * 1.7, flip: i % 2 === 1, belt: i === 1 ? '#efe9dc' : null, horns: i === 2 }); });
    g += K.track({ pts: [[905, 510, 6], [880, 530, 14], [930, 562, 26], [880, 610, 46], [790, 670, 80], [720, 760, 140], [700, 905, 270]], seed: seed + 70, season, stones: 70, roots: 4, puddles: winter || autumn ? 3 : spring ? 1 : 0, sky: L.low, cols: winter ? ['#a4927a', '#c4b49a', '#e2d6c0'] : ['#b89a6c', '#d6bf92', '#efe0bc'] });
    g += K.heath({ seed: seed + 77, x0: -160, x1: 1760, y0: 648, y1: 690, n: 44, season, k0: .45, k1: .55, grass: 18, amp: 'none' });
    // people on the track: dog walkers, a jogger (by day)
    if (!night) {
      g += K.shadow(L, 892, 548, 14, 30) + K.walker(892, 548, .32, { dog: true, dx: 30, dy: 10, dur: 46, seed: seed + 72 });
      g += K.walker(830, 640, .5, { dog: true, dx: -60, dy: 20, dur: 52, seed: seed + 73, hat: winter ? '#3a4a5a' : null, coat: winter ? '#2a4a6a' : null });
      g += K.jogger(900, 590, .38, { dx: -50, dy: 30, dur: 30, seed: seed + 74 });
      if (!lo) g += K.family(760, 720, .62, { dx: 70, dy: -20, dur: 70, seed: seed + 75, dog: true });
    } else g += K.bats({ seed: seed + 76, n: 3, x: 900, y: 360, spread: 260, s: 1.2 });
    // mid trees: a birch group right, a leaning Scots pine left
    g += K.tree('birch', 1250, 690, .62, { season, seed: seed + 81, flutter: 8, fall: autumn ? 10 : 0 });
    if (!lo) g += K.tree('birch', 1180, 680, .5, { season, seed: seed + 80, flutter: 6, fall: autumn ? 8 : 0 }) + K.tree('birch', 1110, 692, .4, { season, seed: seed + 82 });
    if (!lo) g += K.tree('pine', 140, 700, .78, { season, seed: seed + 83, flip: true });
    for (const [x, y, s, sd] of [[520, 700, .42, 84], [980, 690, .38, 85], [1380, 700, .5, 86], [60, 720, .45, 87], [1000, 730, .3, 88], [620, 744, .34, 89]].slice(0, lo ? 3 : 6)) g += K.gorse(x, y, s, { season, seed: seed + sd });
    if (!lo) g += stonechat(1392, 663, .6, { dur: 5, d: 1 }) + stonechat(538, 668, .5, { female: true, dur: 7, d: 3, flip: true });
    g += K.heath({ seed: seed + 90, x0: -160, x1: 1760, y0: 690, y1: 800, n: 85, season, k0: .6, k1: .95, s: 1, grass: 40, strips: 5 });
    g += K.bracken({ seed: seed + 91, x0: 1240, x1: 1760, y0: 720, y1: 810, n: 22, season, k0: .6, k1: .9 });
    g += K.bracken({ seed: seed + 92, x0: -160, x1: 300, y0: 730, y1: 820, n: 16, season, k0: .6, k1: .9 });
    g += K.rabbit(560, 790, .9, { dx: 80, dur: 16 }) + K.rabbit(1060, 800, .8, { flip: true, dx: 50, dur: 19, d: 6 });
    // 6. the foreground: a big Scots pine framing the right, a silver birch left, gorse, heather and grass blades
    g += K.tree('pine', 1520, 905, 1.45, { season, seed: seed + 93, flutter: 0 });
    g += K.tree('birch', 210, 900, 1.15, { season, seed: seed + 94, flutter: 10, fall: autumn ? 14 : 0, flip: true });
    g += K.heath({ seed: seed + 97, x0: -160, x1: 1760, y0: 800, y1: 905, n: 70, season, k0: 1, k1: 1.6, s: 1.1, grass: 28 });
    g += K.gorse(420, 880, 1.2, { season, seed: seed + 95 }) + K.gorse(1210, 900, 1.05, { season, seed: seed + 96, flip: true });
    g += stonechat(392, 788, 1.9, { dur: 6.5, d: 2 });
    if (!lo) g += K.wind(K.blades({ seed: seed + 98, x0: -160, x1: 560, y0: 860, y1: 905, n: 30, h: 70, season, heads: summer || autumn ? .4 : 0 }).concat(K.blades({ seed: seed + 99, x0: 900, x1: 1760, y0: 862, y1: 905, n: 30, h: 66, season, heads: summer || autumn ? .4 : 0 })), { amp: 'strong' });
    // wildlife and season in the air
    if (summer) g += K.butterfly(600, 720, 1, { kind: 'blue' }) + K.butterfly(980, 760, .9, { kind: 'blue', dx: -120 }) + K.butterfly(300, 690, .9, { kind: 'tortoiseshell' }) + K.bee(470, 820, 1.1) + K.bee(1150, 830, 1) + K.bee(760, 790, .9);
    if (spring) g += K.butterfly(640, 700, 1, { kind: 'brimstone' }) + K.butterfly(1020, 740, .9, { kind: 'peacock', dx: -140 }) + K.bee(450, 830, 1.1) + K.bee(1240, 840, 1);
    if (autumn) g += K.butterfly(700, 720, .9, { kind: 'admiral' });
    if (winter) g += K.robin(1222, 812, 1.3, { dur: 6 }) + K.robin(540, 812, 1, { dur: 8, flip: true });
    if (!night) g += K.flock({ seed: seed + 100, n: 3, x: 760, y: 420, s: .5, dx: -500, dur: 26, col: '#3a3a3a' });

    let air = '';
    if (spring) air += K.motes({ seed: seed + 110, n: 18, x0: 100, x1: 1500, y0: 560, y1: 860, cols: ['#fff3b0', '#f8e070'] });
    if (summer) air += K.motes({ seed: seed + 110, n: 22, x0: 100, x1: 1500, y0: 520, y1: 860 });
    if (autumn) air += K.falling({ seed: seed + 110, n: 18, x0: -100, x1: 1600, y0: 300, y1: 700, dy: 380, dx: 220, size: 9, cols: ['#e8b83a', '#d99a2a', '#f2cf5a'] }) + K.mist({ seed: seed + 111, y: 520, h: 40, n: 4, op: .35, col: K.mix('#f2f0e8', L.low, .3) });
    if (winter) air += K.mist({ seed: seed + 111, y: 525, h: 46, n: 5, op: .4, col: K.mix('#eef2f4', L.low, .3) }) + K.snow({ seed: seed + 112, n: 14, layers: 2, dur: 34 });
    return sky + K.tone(L, g) + air + K.weather(L) + K.grade(L);
  });

  const place = 'yateley-common', label = 'Yateley Common', town = 'Yateley', kind = 'landscape', tags = ['heathland', 'heather', 'birch'];
  const reasons = { spring: 'Fresh heath shoots and flowering gorse', summer: 'Flowering heather beside the sandy trail', autumn: 'Golden birches and dry heath seed heads', winter: 'Frosted heath and a winter robin' };
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const reason = reasons[season];
    const it = { id: `${place}-1${season !== 'summer' ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: 'wide', viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      svg: (o = {}) => draw(season, o) };
    // The composed scene (71-scene-uk-south-east-yateley-common-1.js) when the scene engine is in the build; the
    // hand-drawn art above stays as legacySvg (and is the item's art without the engine).
    add('hampshire', kind, typeof _scYc === 'object' ? _scYc.composed(it, season, typeof sceneYateleyCommon1 === 'function' ? sceneYateleyCommon1 : null) : it);
  }
}
