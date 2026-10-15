// UK_SCENE_PART: uk-south-east/wyndhams-pool-v1
/* Wyndham's Pool — the Common's wooded pond, reed margins and dusk wildlife.
     https://www.hants.gov.uk/thingstodo/countryside/walking/yateleycommon
     https://hwas.co.uk/wyndhams-pool-hospital-pond/
   View 1 of 4 (wide): one file per view, so each view's art can change without
   touching the others (the other views: 72-anim-pack-uk-south-east-wyndhams-pool-v1..v4.js).
   Drawn with the rich nature kit T.K (src/app/71-anim-uk-nature-kit.js; see
   docs/dev/UK_PACK.md, "Rich local scenes"). Keep every id, ukPlace, ukView,
   ukSeason and season unchanged so saved pins and the rotation keep working.

   Brief (view 1, wide, looking south-west across the open water):
   - Wyndham's Pool is the largest pond on Yateley Common (Yateley Common Country Park), a man-made
     pond named after the Wyndham family of Minley Manor; once a fish pond, later a bathing pool,
     drained in WWII (a landmark for bombers heading for Blackbushe airfield), now a coarse fishery.
   - Ringed by silver birch and Scots pine with oak behind, reed and rush margins, lily pads; anglers
     fish from wooden swims (carp, tench, perch, roach, pike); mallard, coot, moorhen and mute swan.
   - Light aircraft from Blackbushe cross the sky; a bank path runs round the water. */
function ukSouthEastWyndhamsPoolV1(T) {
  const { add, U, R, rnd, mv } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js)
  const LAT = 51.332, LON = -0.822;
  const AT = { spring: 'morning', summer: 'afternoon', autumn: 'golden', winter: 'day' };

  /** A light aircraft out of Blackbushe crossing the sky (daylight only). */
  const plane = (x, y, s, dur, d) => `<g transform="translate(${x} ${y})">${mv('uknglide', { ad: dur + 's', d: `-${d}s`, dx: '1900px', dy: '-40px' },
    `<g transform="scale(${s})"><path fill="#eef0f2" d="M-22 0q2-5 10-5h26q8 1 10 5-2 3-10 3h-26q-8 0-10-3z"/><path fill="#c23a32" d="M-12-1h28v2h-28z"/><path fill="#dfe3e6" d="M-4-3l6-14h5l-3 14zM-4 2l6 10h4l-3-10z"/><path fill="#d8dce0" d="M-22 0l-4-9h4l5 7z"/><path fill="#3a4a5a" d="M10-4h6l2 3h-8z"/></g>`)}</g>`;

  /** A carp angler at a wooden swim: platform, green brolly, seated figure, rod and a bobbing float. */
  const swim = (x, y, s, fx, fy, season) => {
    const coat = season === 'winter' ? '#3c4a3e' : season === 'summer' ? '#6a7a4a' : '#4e5e3e';
    const art = `<path fill="#6b5440" d="M-70 6h150l-8 10h-136z"/><path stroke="#4a3a2c" stroke-width="3" d="M-60 6v30M64 6v30M-10 6v32"/><path stroke="#8a7058" stroke-width="1.4" d="M-66 8h140M-64 12h136"/>` +
      `<path fill="#2f4a32" d="M-62-82q48-36 96 0z"/><path stroke="#24382a" stroke-width="2" d="M-14-96v100"/><path fill="none" stroke="#3a5a3e" stroke-width="1.2" d="M-62-82q24 8 48 0q24 8 48 0"/>` +
      `<path fill="#5a4a3a" d="M2-6h26v12H2z"/><path fill="${coat}" d="M6-6q-2-26 8-34h10q6 10 2 34z"/><circle cx="18" cy="-46" r="7" fill="#c99a7a"/><path fill="#2e3a2a" d="M10-50q8-10 16 0z"/><path stroke="#2e3a2e" stroke-width="5" stroke-linecap="round" d="M10-4l-10 12M24-4l-6 12"/>` +
      `<path fill="#3a4a5a" d="M34-6h18v10H34z"/><path stroke="#8a8a80" stroke-width="2" d="M30-30l40-10"/>`;
    const rod = `<path fill="none" stroke="#2a2a26" stroke-width="2.4" stroke-linecap="round" d="M26-26Q-30-70 ${R((fx - x) / s * .45)} -96"/>`;
    const line = `<path fill="none" stroke="#e8e8e0" stroke-width=".7" opacity=".6" d="M${R((fx - x) / s * .45)} -96Q${R((fx - x) / s * .8)} ${R((fy - y) / s * .2)} ${R((fx - x) / s)} ${R((fy - y) / s)}"/>`;
    const float = mv('uknbob', { ad: '2.6s', dy: '2px' }, `<path fill="#e8402a" d="M${R(fx)} ${R(fy - 7)}l2 6h-4z"/><path fill="#1f2a2a" d="M${R(fx - 1)} ${R(fy - 1)}h2v2h-2z"/>`) + K.ripples(fx, fy, { rx: 14, ry: 3, n: 2, dur: 5 });
    return K.at(x, y, s, art + K.sway(x, rod + line, 'soft')) + float;
  };

  /** Ice along the near margin (winter): a pale sheet with cracks and frost. */
  const ice = r => {
    let cracks = '';
    for (let i = 0; i < 26; i++) { const x = -160 + r() * 1920, y = 720 + r() * 80; cracks += `M${R(x)} ${R(y)}l${R(-30 + r() * 60)} ${R(-6 + r() * 12)}l${R(-20 + r() * 40)} ${R(-4 + r() * 8)}`; }
    return `<path fill="#e4eef2" opacity=".62" d="M-160 724Q200 706 520 728T1100 716T1760 726V900H-160z"/><path fill="#ffffff" opacity=".35" d="M-160 760Q300 744 700 762T1760 752V900H-160z"/>` + K.S('#a9c2cc', 1.2, cracks, ' opacity=".7"');
  };

  const scene = (season, o) => K.scene(o, () => {
    const p = K.pal(season), r = rnd(9100 + ['spring', 'summer', 'autumn', 'winter'].indexOf(season) * 37);
    const spring = season === 'spring', summer = season === 'summer', autumn = season === 'autumn', winter = season === 'winter';
    const L = K.live(o, { heading: 222, fov: 82, horizon: 470, season, at: AT[season], lat: LAT, lon: LON });
    const hazeCol = K.mix(L.low, L.mid, .35), dark = L.dark, lo = K.lod() < 1;   // lo: a small tile (draw the main pieces only)
    const sky = K.liveBackdrop(L, { seed: 31 + season.length, cloudY: [30, 330] }) +
      (dark < .4 ? plane(-120, 150 + r() * 80, .9, 46, R(r() * 40)) + K.flock({ seed: 52, n: 6, x: 300, y: 250, s: .7, dx: 1000, dy: -50, dur: 38 }) : '') +
      (winter && dark < .4 ? K.flock({ seed: 53, n: 7, x: 1200, y: 180, s: .9, dx: -1100, dy: -30, dur: 44, v: true, col: '#3a3f44' }) : '');

    const farId = U(), midId = U(), rightId = U(), clip = U();
    let g = '';
    // 1. distant pine and birch on the rise behind the pool, hazed
    if (!lo) g += `<g id="${farId}">` + K.woods({ seed: 21, y: 486, h: [36, 62], mix: { pine: .5, birch: .3, oak: .2 }, season, haze: .58, hazeCol, sway: 0, foot: 10, ground: K.mix(p.grass[0], hazeCol, .5), snow: winter }) + '</g>';
    // 2. the far shore: birch, pine and oak to the water's edge
    g += `<g id="${midId}">` + K.woods({ seed: 22, y: 510, h: [80, 150], mix: { birch: .42, pine: .33, oak: .25 }, season, haze: .26, hazeCol, sway: 0, foot: 8, ground: K.mix(p.grass[0], '#1c2a1e', .3), snow: winter }) +
      K.reeds({ seed: 23, x0: -160, x1: 1760, y0: 504, y1: 514, n: 60, season, k0: .2, k1: .3, amp: 'none' }) + '</g>';
    // 3. the open water: peaty, mirroring the sky and the far shore, the sun's or moon's road
    const water = 'M-160 512Q260 506 700 514T1760 510V900H-160z';
    // the far shore's reflection is laid still (a wobbling copy of the whole wood repaints every frame);
    // the ripple lines and shimmer over it carry the movement
    const still = `<g clip-path="url(#${clip})"><use href="#${midId}" transform="matrix(1 0 0 -1 0 1026)" opacity=".55"/></g>`;
    g += K.water({ d: water, y0: 510, y1: 900, cols: L.water(['#7c9a8c', '#3a5e56', '#1c3a36']), clip, seed: 24, keepSky: true,
      reflect: [], lines: 80, shimmer: 46, glints: dark > .6 ? 4 : 18, gx0: 500, gx1: 1300, sky: L.low });
    g = g.replace(`<g clip-path="url(#${clip})">`, m => still + m);   // under the water's lines
    g += K.lightPath(L, { y0: 516, y1: 800, w: 46, clip, n: 70 });
    if (autumn || winter || L.phase !== 'day') g += K.mist({ seed: 25, y: 530, h: 36, n: 5, op: winter ? .5 : .38, col: K.mix('#eef2f0', L.low, .3) });
    if (winter) g += `<g clip-path="url(#${clip})">${ice(rnd(26))}</g>`;
    // lilies in the sheltered bays
    if (!winter) g += K.lilies({ seed: 27, x0: 120, x1: 560, y0: 600, y1: 690, n: 34, season, flowers: .45 }) + K.lilies({ seed: 28, x0: 1020, x1: 1330, y0: 556, y1: 604, n: 22, season, flowers: .35 });
    else g += K.lilies({ seed: 27, x0: 200, x1: 520, y0: 620, y1: 680, n: 8, season });
    // 4. the side banks: a wooded spit on the left, the birch bank on the right
    g += K.land({ d: 'M-160 528Q40 534 150 572Q250 610 292 664Q330 724 250 800H-160z', top: K.mix(p.grass[1], '#2a3a24', .25), bottom: p.ground[0], y0: 530, y1: 800, seed: 29, speckle: 160 });
    g += K.land({ d: 'M1760 522Q1600 530 1500 556Q1410 590 1394 640Q1384 704 1460 790H1760z', top: K.mix(p.grass[1], '#2a3a24', .25), bottom: p.ground[0], y0: 522, y1: 790, seed: 30, speckle: 140 });
    g += K.reeds({ seed: 31, x0: 150, x1: 320, y0: 600, y1: 730, n: lo ? 14 : 34, season, k0: .55, k1: .9, strips: 3 });
    if (!lo) g += K.reeds({ seed: 32, x0: 1380, x1: 1480, y0: 600, y1: 760, n: 28, season, k0: .55, k1: .9, strips: 3 });
    if (!lo) g += K.grass({ seed: 33, x0: -160, x1: 260, y0: 560, y1: 780, n: 70, season, k0: .4, k1: .9, strips: 3 }) + K.grass({ seed: 34, x0: 1430, x1: 1760, y0: 556, y1: 780, n: 60, season, k0: .4, k1: .9, strips: 3 });
    if (!lo) g += K.bracken({ seed: 35, x0: -160, x1: 200, y0: 640, y1: 790, n: 14, season, s: .8 }) + K.bracken({ seed: 36, x0: 1520, x1: 1760, y0: 640, y1: 790, n: 12, season, s: .8 });
    g += K.tree('pine', 40, 640, 1.05, { season, seed: 37, flutter: 0 }) + (lo ? '' : K.tree('birch', 170, 630, .72, { season, seed: 38, flutter: 5, fall: autumn ? 8 : 0, ground: 760 }));
    if (!lo) g += K.tree('birch', 236, 676, .6, { season, seed: 39, flutter: 4 });
    g += K.tree('oak', -90, 740, 1.1, { season, seed: 40, flutter: 6, fall: autumn ? 10 : 0, ground: 800 });
    g += `<g id="${rightId}">` + (lo ? '' : K.tree('alder', 1420, 650, .62, { season, seed: 41, flutter: 4 })) + K.tree('birch', 1500, 610, .8, { season, seed: 42, flutter: 5, fall: autumn ? 8 : 0, ground: 760 }) + '</g>';
    if (!lo) g += K.tree('birch', 1580, 640, .92, { season, seed: 43, flutter: 4 });
    g += K.tree('pine', 1700, 690, 1.15, { season, seed: 44 });
    if (!lo) g += K.fern(80, 760, .7, { season }) + K.fern(1640, 770, .8, { season });
    g += K.log(1560, 780, .45, { season });
    if (L.dark > .5) g += K.owl(52, 360, .9);
    else g += K.squirrel(1590, 560, .9, { flip: true });
    // 5. life on the water
    g += K.duck('swan', 690, 600, .72, { dx: 220, dur: 70 }) + K.duck('swan', 790, 612, .66, { dx: 200, dur: 74, d: 3 });
    g += K.duck('mallard', 1010, 660, .62, { dx: -170, dur: 40, flip: true }) + K.duck('female', 1070, 668, .6, { dx: -160, dur: 41, flip: true, d: 1 });
    g += K.duck('coot', 470, 712, .58, { dx: 120, dur: 30 }) + K.duck('coot', 1210, 590, .42, { dx: -90, dur: 34, flip: true });
    g += K.duck('moorhen', 1340, 690, .5, { dx: -60, dur: 26, flip: true }) + K.duck('moorhen', 330, 640, .4, { dx: 50, dur: 22 });
    if (spring) { g += K.duck('female', 880, 720, .6, { dx: 160, dur: 46 }); for (let i = 0; i < 5; i++) g += K.duck('female', 840 - i * 26, 726 + (i % 2) * 6, .26, { dx: 160, dur: 46, d: .4 + i * .3 }); }
    if (winter) g += K.duck('mallard', 760, 690, .62, { dx: 140, dur: 36 }) + K.duck('female', 610, 700, .6, { dx: 120, dur: 34 });
    if (!winter) g += K.fish(620, 676, .8, { dur: 11 }) + K.fish(1150, 640, .6, { dur: 14, d: 6, flip: true }) + K.fish(930, 560, .45, { dur: 17, d: 3 });
    for (let i = 0; i < 6; i++) g += K.ripples(380 + r() * 900, 540 + r() * 200, { rx: 16 + r() * 18, ry: 3 + r() * 3, n: 2, dur: 5 + r() * 4, d: r() * 6 });
    g += K.heron(300, 734, .62, { flip: true });
    if (summer && dark < .5) g += K.dragonfly(560, 640, .9, { dx: 160, dy: 40 }) + K.dragonfly(1120, 610, .7, { col: '#3aa060', dx: -140 }) + K.dragonfly(400, 760, 1.1, { dx: 120, dy: -50 }) + K.dragonfly(1300, 700, .8, { col: '#c0402a', dx: -100 });
    if (spring && dark < .5) g += K.dragonfly(520, 700, .7, { col: '#3a7ad8', dx: 90, dy: 20 }) + K.dragonfly(1260, 660, .6, { col: '#3a7ad8', dx: -80 });
    if (autumn && dark < .5) g += K.dragonfly(600, 720, .8, { col: '#c0402a', dx: 130 }) + K.dragonfly(1180, 690, .7, { col: '#c0402a', dx: -110 });
    // 6. the angler's swim on the near bank and the bank path
    g += swim(1080, 800, .9, 930, 712, season);
    g += K.land({ d: 'M-160 806Q240 782 640 800T1300 796T1760 790V900H-160z', top: K.mix(p.grass[1], p.ground[1], .3), bottom: p.grass[0], y0: 790, y1: 900, seed: 45, speckle: 220 });
    g += K.track({ pts: [[-160, 870, 92], [300, 856, 108], [760, 866, 118], [1200, 858, 110], [1760, 868, 96]], seed: 46, season, stones: 70, roots: 4, puddles: summer ? 0 : 3, sky: L.low });
    g += K.reeds({ seed: 47, x0: -160, x1: 160, y0: 790, y1: 822, n: 22, season, k0: .62, k1: .85 }) + K.reeds({ seed: 59, x0: 330, x1: 820, y0: 794, y1: 816, n: 22, season, k0: .5, k1: .7 }) + K.reeds({ seed: 48, x0: 1200, x1: 1760, y0: 786, y1: 820, n: 30, season, k0: .55, k1: .8 });
    g += K.walker(220, 872, 1.1, { dog: true, dx: 560, dur: 52, seed: 7 }) + K.robin(1585, 752, .9);
    if (!winter && dark < .5) g += K.jogger(1500, 866, 1.05, { dx: -620, dur: 30, seed: 9, flip: true });
    // 7. the near verge: blades and flowers in front of the path
    const kinds = spring ? ['celandine', 'anemone', 'daisy'] : summer ? ['foxglove', 'ragwort', 'harebell'] : autumn ? ['ragwort', 'knapweed'] : null;
    g += kinds ? K.meadow({ seed: 49, x0: -160, x1: 1760, y0: 880, y1: 908, n: 150, h: 64, k0: 1, k1: 1.6, flowers: spring ? 56 : summer ? 48 : 18, kinds, season, cols: p.grass })
      : K.grass({ seed: 49, x0: -160, x1: 1760, y0: 880, y1: 908, n: 150, season, k0: 1, k1: 1.6 });
    if (!lo) g += K.wind(K.blades({ seed: 60, x0: -160, x1: 420, y0: 890, y1: 912, n: 26, h: 80, season, k0: 1.1, k1: 1.5, heads: autumn || summer ? .4 : 0 }).concat(K.blades({ seed: 61, x0: 1240, x1: 1760, y0: 890, y1: 912, n: 24, h: 80, season, k0: 1.1, k1: 1.5 })), { amp: 'strong' });
    g += K.stones({ seed: 62, x0: 340, x1: 1200, y0: 802, y1: 822, n: 26 });
    g += K.bracken({ seed: 50, x0: -160, x1: 160, y0: 880, y1: 910, n: 8, season, s: 1.4 }) + K.bracken({ seed: 51, x0: 1480, x1: 1760, y0: 880, y1: 910, n: 8, season, s: 1.4 });
    if ((summer || spring) && dark < .5) g += K.butterfly(700, 820, .9, { kind: spring ? 'brimstone' : 'admiral' }) + K.bee(980, 860, 1);
    if (dark > .4) g += K.bats({ seed: 54, n: 4, x: 800, y: 380, spread: 260 });
    // seasonal air
    let air = '';
    if (spring) air = K.falling({ seed: 55, n: 14, x0: 0, x1: 1600, y0: 240, y1: 620, kind: 'seed', cols: ['#e6e0a0', '#f4f0c0'], dy: 260, dx: 200, size: 12 });
    if (summer) air = K.motes({ seed: 56, n: 18, x0: 200, x1: 1400, y0: 520, y1: 820 });
    if (autumn) air = K.falling({ seed: 57, n: 22, x0: -100, x1: 1700, y0: 300, y1: 700, dy: 260, dx: 160, cols: [p.leaf.birch[2], p.leaf.birch[1], p.leaf.oak[1]] });
    if (winter && !L.snow) air = K.snow({ seed: 58, n: 14, layers: 2 });
    return sky + K.tone(L, g + air) + K.weather(L) + K.grade(L);
  });

  const place = "wyndhams-pool", label = "Wyndham's Pool", town = 'Yateley', kind = 'landscape', tags = ["pond","woodland","reeds"];
  // Four composed views per season. The summer wide/close/evening and the autumn third view keep the original saved refs.
  const seasonalReasons = {
    spring: ["New birch leaves above the spring pool","Spring waterbirds beside the reeds","Catkins over the woodland margin","Spring evening at the wooded pool"],
    summer: ["Leafy shade and open summer water","Dragonflies above the near reeds","Summer waterbirds at the woodland margin","Warm evening water beneath the trees"],
    autumn: ["Golden birches above the wooded pool","Falling leaves beside the near reeds","Autumn birches along the water","Autumn evening at the wooded bank"],
    winter: ["Bare birches above winter water","A robin beside the frost-lined reeds","Snow over the frozen woodland pool","Winter evening at the misty pool"],
  };
  // The scene engine (docs/dev/SCENE_ENGINE.md section 17): when it is in the build, the four seasonal items share ONE
  // composed, auto-season scene (71-scene-uk-south-east-wyndhams-pool-wide.js, drawn by the canvas renderer: the date
  // picks the season, the live sky the light). Every id, ukPlace, ukView, ukSeason, season and the rotation stay as they
  // were; the hand-drawn art above is kept as legacySvg (old-versus-new sheets) and is the look when the engine is absent.
  // A still with no clock (Node, the gallery's sheets, the tile) shows the item's own season; with a live sky, the date's.
  const composed = it => {
    if (typeof sceneUkWyndhamsPoolWide !== 'function' || typeof sceneItem !== 'function' || typeof sceneSvg !== 'function') return it;
    const c = Object.assign(sceneItem(it, sceneUkWyndhamsPoolWide), { season: it.season, liveSky: it.liveSky, legacySvg: it.svg, sceneSeason: it.ukSeason });
    const own = (o) => (o.season || (o.sky && Number.isFinite(o.sky.ms)) ? o : Object.assign({}, o, { season: it.ukSeason }));
    c.svg = (o = {}) => sceneSvg(c, own(o));
    return c;
  };
  for (const view of [0]) for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const originalSeason = view === 2 ? 'autumn' : 'summer', reason = seasonalReasons[season][view];
    add('hampshire', kind, composed({ id: `${place}-${view + 1}${season !== originalSeason ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: view === 3 ? 'dreamy' : 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: ['wide', 'close', 'detail', 'evening'][view], viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      svg: (o = {}) => scene(season, o) }));
  }
}
