// UK_SCENE_PART: uk-south-east/yateley-common-v4
/* Yateley Common — open heather, gorse and scattered birch, rather than hills.
   https://www.hants.gov.uk/thingstodo/countryside/walking/yateleycommon
   https://www.hants.gov.uk/thingstodo/countryside/finder/yateleycommon
   View 4 of 4 (evening): one file per view, so each view's art can change without
   touching the others (the other views: 72-anim-pack-uk-south-east-yateley-common-v1..v4.js).
   Drawn with the rich nature kit T.K (src/app/71-anim-uk-nature-kit.js; see
   docs/dev/UK_PACK.md, "Rich local scenes"). Keep every id, ukPlace, ukView,
   ukSeason and season unchanged so saved pins and the rotation keep working.

   Brief (this view): looking west over the open heath of Yateley Common Country Park toward
   the sunset. The common is lowland heath (ling and bell heather, gorse, bracken, silver birch
   and Scots pine) on sandy soil, part of the Castle Bottom to Yateley and Hawley Commons SSSI
   and the Thames Basin Heaths SPA, kept open by scrub clearance and grazing for ground-nesting
   nightjars, Dartford warblers and woodlarks; scattered pines are the nightjars' song posts at
   dusk, small heathland ponds hold the sky, and light aircraft use Blackbushe airfield next door.
   The sky, sun, moon (real phase), stars, light, shadows and lit cottage windows are live. */
function ukSouthEastYateleyCommonV4(T) {
  const { add, U, R, rnd, mv } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js); null only if that file is missing
  const at = K.at, P = K.P, S = K.S, mix = K.mix;
  const rr = (r, a, b) => a + r() * (b - a);

  /* ---------- place helpers (local art faces right) ---------- */
  // Grazing cattle (conservation grazing): a polled, stocky beef cow; head dips to graze, tail swishes.
  const cow = (x, y, s, o = {}) => {
    const c = o.col || '#2a2220', d = mix(c, '#000', .35), belt = o.belt ? `<path fill="#ece6da" d="M-14-70h26v40h-26z"/>` : '';
    const legs = S(d, 8, 'M-46-34v32M-34-34v34M34-34v34M47-34v32');
    const body = `<path fill="${c}" d="M-60-56q-2-16 14-18l72-2q22 0 26 14l2 26q0 8-8 8H-52q-8 0-8-8z"/>${belt}<path fill="#000" opacity=".18" d="M-58-40q50 10 108 0v8q0 6-8 6H-52q-6 0-6-6z"/><path fill="#fff" opacity=".1" d="M-48-72q40-6 74-2-30 6-74 2z"/>`;
    const head = mv('ukngraze', { ad: (o.dur || 11) + 's', d: -(o.d || 0) + 's', to: '44px -64px' }, `<path fill="${c}" d="M36-72q22-8 34 0l16 16q4 10-6 12l-16-2-30-10z"/><path fill="${d}" d="M78-50q8 0 8 6-2 4-8 2z"/><path fill="${c}" d="M62-72l-10-8 4 12zM68-70l6-10 2 12z"/><circle cx="70" cy="-60" r="1.8" fill="#0e0c0c"/>`);
    const tail = mv('ukntail', { ad: (2.6 + (o.d || 0) % 2) + 's', to: '-58px -68px' }, S(d, 3, 'M-58-68q-8 14-6 40') + `<path fill="${d}" d="M-68-30q4-6 8 0l-3 8z"/>`);
    return at(x, y, s, `<ellipse cy="2" rx="62" ry="7" fill="#14201a" opacity=".25"/>` + legs + tail + body + head, o.flip);
  };
  // A male stonechat on a gorse top: black head, white collar, orange breast; bobs and flicks.
  const stonechat = (x, y, s, o = {}) => at(x, y, s, mv('uknbob', { ad: '2.3s', d: -(x % 2) + 's', dy: '-2px' },
    mv('ukntail', { ad: '1.6s', to: '-8px -6px' }, `<path fill="#3a2e28" d="M-8-6l-12 6 2 3 12-5z"/>`) +
    `<path fill="#6a5442" d="M-10-4q-4-12 8-15 12-1 13 9l-3 8z"/><path fill="#d8743a" d="M2-14q9 2 7 11-7 3-10-4z"/><path fill="#f2efe6" d="M-1-17q5 2 9 0v3q-5 2-9 0z"/><circle cx="5" cy="-20" r="5.2" fill="#161414"/><path fill="#2a2420" d="M9-21l5 1-5 2z"/><path stroke="#2a2420" stroke-width="1.2" d="M-2-1v4M3-1v4"/>`), o.flip);
  // A nightjar: long pointed wings and tail, hawking moths at dusk (wing claps), or churring on a pine.
  const nightjarFly = (x, y, s, o = {}) => at(x, y, s, mv('uknflit', { ad: (o.dur || 9) + 's', d: -(o.d || 0) + 's', dx: (o.dx || 220) + 'px', dy: (o.dy || 50) + 'px' },
    mv('uknflap', { ad: '.5s' }, S('#2a2622', 3.4, 'M-26-4Q-12-12 0 0Q12-12 26-4', ' stroke-linejoin="round"')) + `<path fill="#3a332c" d="M-4-2q4-4 8 0l-2 3h-4zM-1 1l1 12 2-12z"/><circle cx="-14" cy="-6" r="1.5" fill="#f2efe6"/><circle cx="14" cy="-6" r="1.5" fill="#f2efe6"/>`));
  const nightjarPerch = (x, y, s) => at(x, y, s, mv('uknbob', { ad: '.35s', dy: '-.6px' }, `<path fill="#4a3e32" d="M-18 0q2-8 14-10l12-1q8 1 8 6-4 6-14 6z"/><path fill="#5a4c3c" d="M-18-1l-14 3 2 2 14-2z"/><circle cx="12" cy="-8" r="1.2" fill="#0e0c0c"/>`));
  // A light aircraft out of Blackbushe: a high-wing silhouette with nav lights and a strobe.
  const plane = (L, x, y, o = {}) => {
    const body = `<path fill="#3a3e48" d="M-22-1q2-5 14-6h20q8 0 10 4l-4 4H-18zM-24-2l-5-10h4l7 9zM-10-9h30v-2.4h-30zM-31-5h10v-1.6h-10z"/><path stroke="#3a3e48" stroke-width="1.2" d="M4-9l2 8M4 1v4M12 1v4"/>`;
    const lights = `<circle cx="-6" cy="-7" r="1.6" fill="#ff4a3a"/><circle cx="12" cy="-7" r="1.6" fill="#4aff7a"/>` + mv('ukntwinkle', { ad: '1.2s' }, `<circle cx="-24" cy="-9" r="${L.dark > .3 ? 2.6 : 1.4}" fill="#ffffff"/>`);
    return K.keep(`<g transform="translate(${x} ${y})">${mv('uknglide', { ad: (o.dur || 80) + 's', d: -(o.d || 0) + 's', dx: (o.dx || 1900) + 'px', dy: (o.dy || -60) + 'px' }, `<g transform="scale(${o.s || 1})">${L.dark > .6 ? lights : body + lights}</g>`)}</g>`);
  };
  // A heathland-edge cottage (the common is ringed by Yateley's houses): windows light at real dusk.
  const cottage = (L, x, y, s, seed) => {
    const r = rnd(seed), wall = ['#d8c8a8', '#c9a27e', '#e6dcc8'][seed % 3], roof = ['#6a4438', '#4a4a52', '#7a5040'][seed % 3];
    return at(x, y, s, `<path fill="${wall}" d="M-60 0v-46h120V0z"/><path fill="${roof}" d="M-68-44l20-34h96l20 34z"/><path fill="${mix(roof, '#000', .3)}" d="M30-80h10v-18h-10z"/>` +
      K.window(L, -46, -36, 16, 14, { on: .8 }) + K.window(L, 26, -36, 16, 14, { on: .6 }) + K.window(L, -10, -36, 18, 14, { curtain: true, on: .7 }) + `<path fill="${mix(wall, '#000', .25)}" d="M-60-46h120v4H-60z"/>` +
      `<g opacity=".6">${T.puffs && r() < .7 ? `<g transform="translate(35 -100)">${T.puffs(0, 0, 4, '#d8d4d0', 6, -40, 4, -110, 3)}</g>` : ''}</g>`);
  };

  /* ---------- the view: west over the open heath at sunset ---------- */
  const evening = (season, o) => K.scene(o, () => {
    const p = K.pal(season), spring = season === 'spring', summer = season === 'summer', autumn = season === 'autumn', winter = season === 'winter';
    const L = K.live(o, { heading: 272, fov: 84, horizon: 500, season, at: 'golden', lat: 51.34, lon: -0.83 });
    const hz = L.haze, seedS = { spring: 0, summer: 1, autumn: 2, winter: 3 }[season] * 97;
    let s = K.liveBackdrop(L, { seed: 3 + seedS, cloudY: [24, 220], clouds: autumn || winter ? 4 : 3 });
    // birds in the sky: rooks going to roost, a light aircraft, gulls high up
    s += K.flock({ seed: 5 + seedS, n: 9, x: -120, y: 250, s: .7, dx: 1500, dy: -110, dur: 70, col: '#1e2026' });
    s += K.flock({ seed: 6 + seedS, n: 4, x: 1700, y: 150, s: .55, dx: -1700, dy: 40, dur: 95, d: 30, col: '#2a2e36' });
    s += plane(L, -140, 210, { dur: 85, d: 20, s: .9 });
    if (L.dark > .35 || summer) s += K.bats({ seed: 7, n: 4, x: 520, y: 360, spread: 260, s: 1.1 });

    let g = '';
    const lo = K.lod() < 1;   // gallery tiles: the far and secondary trees drop out (tile budget)
    const gr = p.grass;
    // 1. the far tree line (Hawley and Blackbushe woods), pine and birch, hazed
    g += K.woods({ seed: 21 + seedS, y: 500, h: [30, 52], mix: { pine: .55, birch: .3, oak: .15 }, season, haze: .62, hazeCol: hz, sway: 0, gap: lo ? 2 : 1, shrubs: !lo, ground: mix(p.heather[1], hz, .55), foot: 18 });
    // 2. cottages at the edge of the common, lights from real dusk
    g += cottage(L, 600, 504, .3, 1) + cottage(L, 646, 505, .24, 2) + cottage(L, 860, 504, .27, 3);
    if (!lo) g += K.woods({ seed: 31 + seedS, x0: -160, x1: 380, y: 512, h: [44, 74], mix: { pine: .5, birch: .5 }, season, haze: .45, hazeCol: hz, sway: 2, shrubs: true, ground: mix(p.heather[1], hz, .45), foot: 14 });
    if (!lo) g += K.woods({ seed: 33 + seedS, x0: 1240, x1: 1760, y: 520, h: [60, 100], mix: { pine: .6, birch: .3, oak: .1 }, season, haze: .38, hazeCol: hz, sway: 3, ground: mix(p.heather[1], hz, .4), foot: 14 });
    g += K.mist({ seed: 9 + seedS, y: 512, h: autumn ? 60 : 36, n: autumn || winter ? 6 : 4, col: mix('#f2f0ec', hz, .4), op: autumn ? .55 : .35 });
    // 3. the open heath running back to the trees
    g += K.land({ d: 'M-160 900V508Q300 500 800 506T1760 512V900z', top: mix(p.heather[1], hz, .35), bottom: p.heather[0], y0: 505, y1: 900, seed: 11, speckle: 200 });
    g += K.heathCarpet({ seed: 12 + seedS, season, y0: 512, y1: 905, rows: 12, lobe: [30, 160], haze: .15, hazeCol: hz });
    // 4. a heathland pond on the right, holding the sky; birches behind it reflected
    const pondD = 'M1010 612Q1030 590 1140 588Q1290 586 1350 600Q1380 618 1300 632Q1180 646 1060 638Q1000 630 1010 612z', clip = U(), birchId = U();
    if (!lo) g += K.reeds({ seed: 40 + seedS, x0: 1080, x1: 1330, y0: 584, y1: 596, n: 9, season, s: .35, amp: 'none' });
    const pondTrees = `<g id="${birchId}">` + K.tree('birch', 1150, 592, .34, { season, seed: 41, flutter: 0, shadow: false }) + K.tree('pine', 1262, 592, .3, { season, seed: 43, shadow: false }) + '</g>';
    if (!lo) g += pondTrees;
    g += K.water({ d: pondD, y0: 588, y1: 646, cols: L.water(), clip, reflect: lo ? [] : [{ id: birchId, y: 594, op: .4 }], lines: 16, shimmer: 14, glints: summer ? 4 : 2, gx0: 1040, gx1: 1330, sky: L.low, seed: 44 });
    g += K.lightPath(L, { y0: 592, y1: 640, w: 24, clip, seed: 45 });
    g += K.ripples(1120, 616, { rx: 20, ry: 3, n: 2, dur: 6 }) + K.ripples(1270, 624, { rx: 16, ry: 2.5, n: 2, dur: 7, d: 3 });
    g += winter ? '' : K.duck('mallard', 1205, 618, .32, { dx: 60, dur: 34 }) + K.duck('female', 1235, 624, .3, { dx: 50, dur: 38 });
    if (summer) g += K.dragonfly(1170, 575, .55, { dx: 90, dy: 20 });
    g += K.reeds({ seed: 46 + seedS, x0: 1000, x1: 1370, y0: 628, y1: 650, n: 14, season, s: .5, strips: 4 });
    // 5. the sandy track winding out of the west toward us
    g += K.track({ pts: [[720, 506, 6], [690, 530, 14], [760, 565, 30], [660, 625, 60], [780, 720, 130], [640, 905, 300]], seed: 18 + seedS, season, stones: 70, roots: 2, puddles: summer ? 0 : 2, sky: L.low });
    // 6. far heath: small heather, gorse, lone Scots pines and birches (the nightjars' song posts)
    g += K.heath({ seed: 50 + seedS, x0: -160, x1: 1760, y0: 520, y1: 575, n: 60, season, k0: .14, k1: .3, haze: .25, hazeCol: hz, grass: 30, amp: 'none' });
    const r = rnd(60 + seedS);
    for (let i = 0; i < (lo ? 3 : 9); i++) { const x = rr(r, -100, 1700), y = rr(r, 525, 570); if (Math.abs(x - 720) < 60) continue; g += K.gorse(x, y, rr(r, .12, .22), { season, seed: 61 + i, haze: .25, hazeCol: hz, still: true }); }
    if (!lo) g += K.tree('pine', 980, 552, .32, { season, seed: 70, haze: .2, hazeCol: hz });
    if (!lo) g += K.tree('birch', 520, 548, .26, { season, seed: 71, haze: .22, hazeCol: hz });
    // grazing cattle on the open heath (left) and a roe deer at the woods' edge (right)
    const coat = ['#231c1a', '#6a3a24', '#2a2422'];
    g += cow(230, 584, .3, { col: coat[0], d: 0, dur: 10 }) + cow(320, 594, .34, { col: coat[1], d: 4, dur: 12, flip: true }) + cow(530, 600, .38, { col: coat[2], belt: true, d: 7, dur: 9 });
    g += K.deer(1450, 556, .3, { season, d: 3 }) + K.deer(1500, 560, .26, { season, flip: true, d: 6 });
    // 7. mid heath: big lone pine with a nightjar, more birch, gorse, bracken
    const pineX = 420, pineY = 640;
    g += K.tree('pine', pineX, pineY, .78, { season, seed: 80, flutter: 0 });
    if (summer || spring) g += nightjarPerch(pineX + 52, pineY - 236, .9);
    g += K.tree('birch', 1520, 650, .62, { season, seed: 81, flutter: autumn ? 8 : 4, fall: autumn ? 10 : 0, ground: 700 });
    if (!lo) g += K.tree('birch', 1600, 640, .5, { season, seed: 82 });
    g += K.heath({ seed: 90 + seedS, x0: -160, x1: 600, y0: 580, y1: 660, n: 80, season, k0: .35, k1: .6, grass: 30, strips: 4 });
    g += K.heath({ seed: 91 + seedS, x0: 860, x1: 1760, y0: 652, y1: 700, n: 70, season, k0: .45, k1: .65, grass: 26, strips: 4 });
    if (!lo) g += K.bracken({ seed: 92 + seedS, x0: 820, x1: 1020, y0: 600, y1: 660, n: 18, season, s: .5 });
    g += K.bracken({ seed: 93 + seedS, x0: -160, x1: 140, y0: 640, y1: 700, n: 14, season, s: .7 });
    const gz = [[120, 668, .45], [560, 652, .4], [930, 690, .5], [1380, 700, .55], [870, 600, .3]];
    gz.forEach(([x, y, k], i) => { g += K.gorse(x, y, k, { season, seed: 100 + i }); });
    g += stonechat(560, 652 - 66 * .4 - 2, .42) + stonechat(1380, 700 - 66 * .55 - 2, .5, { flip: true });
    // people: a dog walker and a jogger on the track
    g += K.jogger(700, 560, .3, { dx: 70, dy: 10, dur: 26, seed: 4 });
    g += K.walker(690, 640, .6, { dog: true, dx: 70, dy: 40, dur: 46, seed: 3, coat: winter ? '#2f4a6a' : undefined, hat: winter ? '#a03a3a' : undefined });
    if (summer || spring) g += K.rabbit(960, 720, .7, { dx: 60, dur: 15 }) + K.rabbit(300, 690, .6, { flip: true });
    else g += K.rabbit(980, 724, .65, { dx: 50, dur: 18 });
    // 8. near heath and the framing foreground
    g += K.heath({ seed: 110 + seedS, x0: -160, x1: 560, y0: 700, y1: 820, n: 70, season, k0: .7, k1: 1, grass: 40, strips: 5 });
    g += K.heath({ seed: 111 + seedS, x0: 900, x1: 1760, y0: 720, y1: 820, n: 70, season, k0: .7, k1: 1, grass: 40, strips: 5 });
    g += K.gorse(1180, 790, .85, { season, seed: 120 }) + K.gorse(330, 820, .75, { season, seed: 121, flip: true });
    g += stonechat(1180, 790 - 66 * .85 - 2, .75);
    g += K.tree('birch', 70, 905, 1.3, { season, seed: 122, flutter: autumn ? 14 : 8, fall: autumn ? 16 : 0, ground: 880 });
    g += K.gorse(1560, 915, 1.5, { season, seed: 128 });
    g += K.bracken({ seed: 123 + seedS, x0: 1300, x1: 1760, y0: 820, y1: 905, n: 16, season, s: 1.5 });
    g += K.heath({ seed: 124 + seedS, x0: -160, x1: 520, y0: 820, y1: 905, n: 50, season, k0: 1.3, k1: 2.1, grass: 50 });
    g += K.heath({ seed: 125 + seedS, x0: 900, x1: 1350, y0: 830, y1: 905, n: 40, season, k0: 1.3, k1: 2, grass: 40 });
    g += K.wind(K.blades({ seed: 126 + seedS, x0: 520, x1: 960, y0: 850, y1: 905, n: 26, h: 50, cols: gr, heads: summer || autumn ? .3 : 0 }), {});
    if (spring || summer) g += K.wind(K.blooms({ seed: 127, x0: 840, x1: 1200, y0: 820, y1: 900, n: 14, kinds: summer ? ['harebell', 'ragwort'] : ['dandelion'], k0: .9, k1: 1.3 }), { amp: 'soft' });
    // insects and particles
    const day = L.dark < .5;
    if (summer && day) g += K.butterfly(860, 760, .9, { kind: 'blue' }) + K.butterfly(260, 640, .7, { kind: 'peacock' }) + K.bee(1150, 760, 1) + K.motes({ seed: 130, n: 22, x0: 100, x1: 1500, y0: 520, y1: 820 });
    if (spring && day) g += K.butterfly(1100, 740, .9, { kind: 'brimstone' }) + K.bee(1190, 740, 1) + K.motes({ seed: 131, n: 14, x0: 200, x1: 1400, y0: 540, y1: 800 });
    if (autumn) g += K.falling({ seed: 132, n: 16, x0: -100, x1: 400, y0: 380, y1: 700, dy: 260, dx: 220, cols: p.leaf.birch.slice(1).concat('#c8902a'), size: 10 }) + K.falling({ seed: 133, n: 8, x0: 1400, x1: 1700, y0: 420, y1: 640, dy: 240, dx: -160, cols: p.leaf.birch.slice(1), size: 9 });
    if (winter) g += K.robin(1250, 742, 1);
    // dusk life: nightjars hawking over the heath, moths
    if ((summer || spring) && L.dark > .05) g += nightjarFly(600, 420, .9, { dx: 260, dy: 60, dur: 9 }) + nightjarFly(1000, 470, .7, { dx: -220, dy: 40, dur: 11, d: 4 });
    if (!winter && L.dark > .3) g += K.moths(860, 700, { n: 5 });

    let front = '';
    if (winter) front += K.snow({ seed: 140, n: L.snow ? 10 : 28, layers: 2 }) + K.mist({ seed: 141, y: 560, h: 60, n: 3, col: '#eef2f4', op: .3 });
    return s + K.tone(L, g) + front + K.weather(L, { mistY: 540 }) + K.grade(L);
  });

  const place = "yateley-common", label = "Yateley Common", town = 'Yateley', kind = 'landscape', tags = ["heathland","heather","birch"];
  // Four composed views per season. The summer wide/close/evening and the autumn third view keep the original saved refs.
  const seasonalReasons = {
    spring: ["Fresh heath shoots and flowering gorse","Birch catkins above the sandy path","New growth beside the fallen branch","Spring dusk across the heath"],
    summer: ["Flowering heather beside the sandy trail","Butterflies beneath the leafy birches","Summer heather around the fallen branch","A summer dusk perch over the heath"],
    autumn: ["Golden birches and dry heath seed heads","Falling leaves above the winding path","Autumn gorse beside the fallen branch","Amber dusk over the open heath"],
    winter: ["Frosted heath and a winter robin","Bare birches above the pale sandy path","Snow over the heath and fallen branch","Winter dusk over the frosted heath"],
  };
  for (const view of [3]) for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const originalSeason = view === 2 ? 'autumn' : 'summer', reason = seasonalReasons[season][view];
    add('hampshire', kind, { id: `${place}-${view + 1}${season !== originalSeason ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: view === 3 ? 'dreamy' : 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: ['wide', 'close', 'detail', 'evening'][view], viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: 51.34, lon: -0.83 },
      svg: (o = {}) => evening(season, o) });
  }
}
