// UK_SCENE_PART: uk-south-east/yateley-common-v3
/* Yateley Common — open heather, gorse and scattered birch, rather than hills.
   https://www.hants.gov.uk/thingstodo/countryside/walking/yateleycommon
   View 3 of 4 (detail): one file per view, so each view's art can change without
   touching the others (the other views: 72-anim-pack-uk-south-east-yateley-common-v1..v4.js).
   Drawn with the rich nature kit T.K (src/app/71-anim-uk-nature-kit.js). Keep every id,
   ukPlace, ukView, ukSeason and season unchanged so saved pins and the rotation keep working.

   Brief (this view): a low, close look south-south-west across the Common from beside a fallen
   pine branch in the heather. Yateley Common Country Park is Hampshire County Council lowland
   heath (part of the Thames Basin Heaths SPA): ling and bell heather, gorse, silver birch and
   Scots pine, bracken, sandy tracks and small acid ponds with cotton-grass. Conservation grazing
   cattle keep the scrub down; stonechats and Dartford warblers perch on gorse tops, silver-
   studded blues fly over summer heather, and light aircraft from Blackbushe cross the wide sky. */
function ukSouthEastYateleyCommonV3(T) {
  const { add, U, rnd, mv } = T;
  const K = T.K;   // the rich nature kit (71-anim-uk-nature-kit.js)
  if (!K) return;
  const LAT = 51.34, LON = -0.83;
  const R = v => Math.round(v * 10) / 10;

  /* ---------- place-specific helpers ---------- */
  // Conservation grazing cattle (faces right): grazes (head dips), tail swishes. coat: [body, dark].
  const cow = (x, y, s, o = {}) => {
    const [c, d] = o.coat || ['#2a2422', '#141110'], belt = o.belt ? `<path fill="#ece6da" d="M-14-58h22l2 40h-26z"/>` : '';
    const art = `<ellipse cy="3" rx="62" ry="7" fill="#1a2418" opacity=".25"/>` +
      `<path stroke="${d}" stroke-width="7" stroke-linecap="round" d="M-38-24l-2 24M-26-24l2 24M24-24l-2 24M36-24l3 24"/>` +
      mv('ukntail', { ad: `${(2.6 + (x % 7) * .2).toFixed(1)}s`, to: '-48px -52px' }, `<path fill="none" stroke="${d}" stroke-width="3" d="M-48-52q-6 18-4 38"/><path fill="${d}" d="M-56-16q4-6 8 0l-2 8h-4z"/>`) +
      `<path fill="${c}" d="M-50-34q-4-26 20-28h50q20 0 24 14l2 24q-2 8-12 8h-70q-14-2-14-18z"/>` + belt +
      `<path fill="${d}" opacity=".35" d="M-46-26q40 10 90 0v8q-46 10-90 0z"/>` +
      mv('ukngraze', { ad: `${o.dur || 10}s`, d: `-${o.d || 0}s`, to: '38px -50px' }, `<path fill="${c}" d="M36-56q16-6 24 4l14 22q4 10-6 12l-10-2-22-20z"/><path fill="${d}" d="M66-22q8 0 8 6l-8 4z"/><circle cx="58" cy="-40" r="2" fill="#0a0808"/><path fill="${c}" d="M44-56l-10-8 8-2z"/><path fill="none" stroke="#d8cfbf" stroke-width="2.4" d="M50-58q2-8 8-8"/>`);
    return `<g transform="translate(${R(x)} ${R(y)}) scale(${o.flip ? -s : s} ${s})">${art}</g>`;
  };
  // A male stonechat on a gorse top: black head, white collar, orange breast; bobs and flicks.
  const stonechat = (x, y, s, o = {}) => `<g transform="translate(${R(x)} ${R(y)}) scale(${o.flip ? -s : s} ${s})">` +
    mv('uknbob', { ad: `${o.dur || 2.4}s`, d: `-${o.d || 0}s`, dy: '-3px' },
      `<path stroke="#2a2420" stroke-width="1.6" d="M-2 0l-2 8M3 0l1 8"/>` +
      mv('ukntail', { ad: '1.3s', to: '-10px -6px' }, `<path fill="#2a2420" d="M-10-8l-12 6 2 3 12-4z"/>`) +
      `<path fill="#5a4a3e" d="M-12-6q-2-12 10-14 12 0 14 10l-4 10H-6z"/><path fill="#e0743a" d="M4-12q8 2 6 12-6 2-10-4z"/><path fill="#f4f0e8" d="M-2-16q6-2 8 2-4 4-8 2z"/>` +
      mv('uknlook', { ad: `${o.look || 6}s`, to: '6px -18px' }, `<path fill="#141210" d="M-2-18q2-10 10-8 6 2 4 10l-6 2z"/><circle cx="9" cy="-20" r="1.2" fill="#e8e4dc"/><path fill="#141210" d="M14-20l5 1-5 2z"/>`)) + '</g>';
  // A Dartford warbler: slate grey, wine breast, long cocked tail.
  const warbler = (x, y, s, o = {}) => `<g transform="translate(${R(x)} ${R(y)}) scale(${o.flip ? -s : s} ${s})">` +
    mv('uknbob', { ad: '1.9s', d: `-${o.d || 0}s`, dy: '-2px' },
      mv('ukntail', { ad: '1.1s', to: '-8px -8px' }, `<path fill="#4a4a54" d="M-8-8l-14-16 4-2 14 14z"/>`) +
      `<path fill="#55566a" d="M-10-6q0-12 10-12 10 0 12 8l-4 10H-6z"/><path fill="#8a3a3a" d="M0-8q8 0 8 6-4 4-10 2z"/><circle cx="8" cy="-13" r="1.4" fill="#c84030"/><path fill="#2a2a30" d="M12-12l5 1-5 2z"/>`) + '</g>';
  // A light aircraft out of Blackbushe crossing the sky (slow glide, wings level).
  const plane = (x, y, s, dur, d, flip) => mv('uknglide', { ad: `${dur}s`, d: `-${d}s`, dx: `${flip ? -2100 : 2100}px`, dy: '-40px' },
    `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})"><path fill="#eef0f2" d="M-20 0q0-5 6-6h20q8 0 10 4-2 4-10 4h-20q-6 0-6-2z"/><path fill="#d8dce0" d="M-20-1l-4-9h4l6 8z"/><path fill="#f4f6f8" d="M-10-8h24v2.4h-24z"/><path fill="#2a3a5a" d="M4-5h5l2 3h-7z"/><path fill="#b02a2a" d="M-16-1h24v1.4h-24z"/><path stroke="#556" stroke-width="1" d="M16-4v6M2-5l-2 7"/></g>`);
  // Cotton-grass tufts at the pond edge (white seed heads in late spring and summer).
  const cotton = (seed, x0, x1, y0, y1, n, season) => {
    if (season !== 'summer' && season !== 'spring') return '';
    const r = rnd(seed); let st = '', hd = '';
    for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), h = 16 + r() * 18, lean = (r() - .5) * 8; st += `M${R(x)} ${R(y)}q${R(lean)} ${R(-h * .5)} ${R(lean * 1.4)} ${R(-h)}`; hd += K.circ(x + lean * 1.4, y - h - 2, 2.6 + r() * 2); }
    return K.sway(x0, K.S('#6f8a4a', 1.2, st) + K.P('#fbfaf4', hd), 'soft');
  };
  // Pine-needle and birch-leaf litter on the sand (static).
  const litter = (seed, x0, x1, y0, y1, n, cols) => { const r = rnd(seed), d = cols.map(() => ''); for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), a = r() * 6.3, l = 4 + r() * 7; d[i % cols.length] += `M${R(x)} ${R(y)}l${R(Math.cos(a) * l)} ${R(Math.sin(a) * l * .4)}`; } return d.map((p, i) => K.S(cols[i], 1.4, p)).join(''); };

  /* ---------- the scene ---------- */
  const scene = (season, o) => K.scene(o, () => {
    const L = K.live(o, { heading: 205, fov: 78, horizon: 470, season, at: 'afternoon', lat: LAT, lon: LON });
    const p = K.pal(season), win = season === 'winter', aut = season === 'autumn', spr = season === 'spring', sum = season === 'summer';
    const lo = K.lod() < 1, night = L.dark > .6, hazeCol = K.mix(L.low, '#d8e2e6', .3);
    const s = K.liveBackdrop(L, { seed: 31 + (win ? 2 : 0), cloudY: [30, 330], clouds: 3 });
    let g = '';
    // 1. far horizon: a blue line of pine and birch woods round the Common
    g += K.woods({ seed: 101, y: 476, h: lo ? [30, 50] : [26, 46], mix: { pine: .55, birch: .3, oak: .15 }, season, haze: .66, hazeCol, sway: 0, foot: 14 });
    // 2. nearer woods at the heath edge, left and right (open sky in the middle)
    g += K.woods({ seed: 102, x0: -160, x1: 640, y: 502, h: [60, 110], mix: { pine: .5, birch: .35, oak: .15 }, season, haze: .4, hazeCol, foot: 24, sway: 0 });
    g += K.woods({ seed: 103, x0: 1260, x1: 1760, y: 500, h: [56, 100], mix: { pine: .45, birch: .45, oak: .1 }, season, haze: .42, hazeCol, foot: 24, sway: 0 });
    if (!night) g += K.mist({ seed: 104, y: 500, h: 24, n: 3, op: win ? .4 : .2, col: hazeCol });
    // 3. the open heath, far to near
    g += K.land({ d: 'M-160 900V478Q300 472 760 480T1760 476V900z', top: K.mix(p.heather[1], hazeCol, .35), bottom: p.heather[0], y0: 484, y1: 900, seed: 105, speckle: 240 });
    g += K.heathCarpet({ seed: 106, x0: -160, x1: 1760, y0: 486, y1: 566, rows: 6, lobe: [16, 70], season, haze: .3, hazeCol });
    g += K.heath({ seed: 107, x0: -160, x1: 1760, y0: 494, y1: 540, n: 50, season, k0: .14, k1: .26, haze: .3, hazeCol, grass: 20, amp: 'none' });
    // far gorse clumps and young birch scrub
    for (const [x, y, k, sd] of [[180, 516, .22, 1], [420, 508, .18, 2], [1010, 512, .2, 3], [1480, 520, .24, 4], [1660, 506, .16, 5], [720, 512, .14, 6]].slice(0, lo ? 3 : 6)) g += K.gorse(x, y, k, { season, seed: 110 + sd, haze: .3, hazeCol, still: true });
    if (!lo) for (const [kind, x, y, k, sd] of [['birch', 300, 528, .2, 1], ['pine', 880, 516, .2, 3], ['birch', 1380, 530, .22, 4], ['pine', 1600, 522, .24, 5]]) g += K.tree(kind, x, y, k, { season, seed: 120 + sd, haze: .26, hazeCol, still: true });
    // 4. the heathland pond, with birches and a pine on its far bank mirrored in it
    const bank = U(), pondClip = U();
    let fb = (lo ? '' : K.tree('birch', 1040, 568, .34, { season, seed: 131, still: true }) + K.tree('birch', 1100, 572, .28, { season, seed: 132, still: true })) + K.tree('pine', 1290, 566, .4, { season, seed: 133, still: true });
    fb += K.gorse(1180, 572, .3, { season, seed: 135, still: true }) + K.heath({ seed: 136, x0: 960, x1: 1460, y0: 560, y1: 574, n: 30, season, k0: .25, k1: .3, grass: 10, amp: 'none' });
    g += `<g id="${bank}">${fb}</g>`;
    const pondD = 'M930 578Q1000 566 1180 570T1480 580Q1520 600 1440 618T1150 630 950 612Q890 596 930 578z';
    g += K.water({ d: pondD, y0: 570, y1: 632, clip: pondClip, cols: L.water(), reflect: [{ id: bank, y: 574, op: .42 }], lines: 26, shimmer: 22, glints: night ? 0 : 6, gx0: 980, gx1: 1440, sky: L.low, seed: 137 });
    g += K.lightPath(L, { y0: 574, y1: 628, w: 40, clip: pondClip, n: 30, seed: 138 });
    g += K.ripples(1210, 604, { rx: 26, ry: 4, n: 3, dur: 5 }) + K.ripples(1060, 596, { rx: 18, ry: 3, n: 2, dur: 6, d: 2 });
    g += K.reeds({ seed: 139, x0: 920, x1: 1010, y0: 588, y1: 614, n: 16, season, kinds: ['plume'], k0: .3, k1: .4 }) + K.reeds({ seed: 140, x0: 1420, x1: 1500, y0: 584, y1: 612, n: 12, season, k0: .3, k1: .4 });
    g += cotton(141, 950, 1460, 612, 634, lo ? 8 : 30, season);
    if (!win && !night) g += K.dragonfly(1150, 586, .55, { dx: 140, dy: 20 }) + K.dragonfly(1300, 594, .5, { col: '#c84a2a', dx: -110, dy: 16 });
    // 5. mid heath: grazing cattle, the sandy track and walkers
    g += K.heath({ seed: 150, x0: -160, x1: 1760, y0: 540, y1: 640, n: 55, season, k0: .26, k1: .45, grass: 40, amp: 'none' });
    g += cow(340, 584, .42, { coat: ['#2a2422', '#141110'], belt: true, dur: 11 }) + cow(470, 596, .46, { coat: ['#7a3e24', '#4a2414'], flip: true, dur: 9, d: 4 }) + cow(180, 600, .5, { coat: ['#2a2422', '#141110'], dur: 13, d: 7 });
    g += K.track({ pts: [[770, 490, 6], [740, 530, 18], [800, 580, 40], [700, 660, 90], [560, 760, 170], [420, 900, 300]], seed: 151, season, stones: 70, roots: 4, puddles: win || spr ? 2 : aut ? 1 : 0, sky: L.low });
    g += litter(152, 480, 860, 640, 900, lo ? 30 : 120, [K.mix(p.ground[0], '#3a2a1a', .3), p.dry[0]]);
    if (!night) {
      g += K.walker(760, 560, .34, { dog: true, dx: -40, dy: 30, dur: 34, seed: 7 });
      g += K.jogger(745, 520, .2, { dx: 30, dy: -10, dur: 22, seed: 8 });
      if (!win) g += K.walker(640, 690, .62, { dx: 60, dy: -40, dur: 46, seed: 9 });
    }
    g += K.rabbit(880, 650, .7, { dx: 60, dur: 15 }) + (night ? K.rabbit(300, 660, .7, { flip: true }) : '');
    // 6. near heath: gorse with a stonechat and a Dartford warbler, bracken, young birch and pine
    g += K.heathCarpet({ seed: 160, x0: -160, x1: 1760, y0: 630, y1: 900, rows: 8, lobe: [40, 160], season });
    g += K.tree('pine', 1540, 720, .9, { season, seed: 161 }) + K.tree('birch', 120, 700, .78, { season, seed: 162, flutter: 8, fall: aut ? 10 : 0, ground: 760 });
    if (!lo) g += K.tree('birch', 250, 690, .5, { season, seed: 163, flutter: 6 });
    g += K.gorse(1020, 700, .62, { season, seed: 164 }) + K.gorse(330, 760, .72, { season, seed: 165, flip: true }) + K.gorse(1680, 790, .8, { season, seed: 166 });
    g += stonechat(1022, 645, 1.1, { d: 1 }) + warbler(318, 700, 1, { d: .6, flip: true });
    g += K.bracken({ seed: 167, x0: 1200, x1: 1760, y0: 680, y1: 760, n: 14, season, s: 1.1 }) + K.bracken({ seed: 168, x0: -160, x1: 200, y0: 740, y1: 820, n: 8, season, s: 1.2 });
    g += K.heath({ seed: 169, x0: -160, x1: 1760, y0: 650, y1: 780, n: 60, season, k0: .5, k1: .9, grass: 40, amp: 'none' });
    // 7. foreground: a fallen pine trunk in the heather (moss, bracket fungi), bell heather, grass, bilberry-height tufts
    g += K.log(1150, 868, 1.25, { season, flip: true }) + (lo ? '' : K.fern(1420, 890, 1.1, { season }));
    if (aut) g += K.falling({ seed: 170, n: 4, x0: 820, x1: 1300, y0: 700, y1: 800, dy: 40, dx: 30, cols: ['#c27a2a', '#e0a83a'] });
    g += K.heath({ seed: 171, x0: -160, x1: 900, y0: 780, y1: 910, n: 48, season, k0: 1, k1: 1.6, s: 1.2, grass: 36, h: 40, strips: 5 });
    g += K.heath({ seed: 172, x0: 1380, x1: 1760, y0: 790, y1: 910, n: 30, season, k0: 1, k1: 1.6, s: 1.2, grass: 20, h: 40, strips: 3 });
    g += K.gorse(1560, 872, 1.15, { season, seed: 174 }) + stonechat(1545, 782, 1.9, { d: 2, look: 7 });
    g += K.meadow({ seed: 173, x0: 860, x1: 1500, y0: 860, y1: 912, n: 40, h: 60, k0: 1, k1: 1.5, flowers: sum ? 14 : spr ? 8 : 0, kinds: ['harebell', 'clover'], season, cols: p.grass });
    // 8. life in the air and seasonal particles
    if (!night) {
      g += K.flock({ seed: 180, n: win ? 7 : 4, x: 300, y: 210, s: .6, dx: 1100, dur: 38 });
      g += K.flock({ seed: 181, n: 3, x: 1300, y: 300, s: .45, dx: -900, dur: 44 });
      g += plane(-120, 150, .9, 70, 20, false);
    }
    if ((sum || spr) && !night) {
      g += K.butterfly(520, 760, .9, { kind: sum ? 'blue' : 'brimstone', dx: 180, dy: 40 }) + K.butterfly(1400, 720, .8, { kind: sum ? 'blue' : 'peacock', dx: -160 }) + K.butterfly(860, 820, .9, { kind: sum ? 'blue' : 'orangetip' });
      g += K.bee(240, 820, 1) + K.bee(1180, 780, 1.1) + K.bee(1460, 840, .9);
    }
    if (aut && !night) g += K.butterfly(700, 740, .8, { kind: 'admiral', dx: 200 });
    if (night) g += K.bats({ seed: 182, n: sum || aut ? 4 : 2, x: 800, y: 320, spread: 300 }) + (sum ? K.moths(1100, 720, { n: 5 }) : '');
    if (spr) g += K.motes({ seed: 183, n: 14, x0: 0, x1: 1600, y0: 480, y1: 860, cols: ['#fff2a8', '#f8e070'] });
    if (sum) g += K.motes({ seed: 184, n: 10, x0: 100, x1: 1500, y0: 500, y1: 860 });
    if (aut) g += K.falling({ seed: 185, n: 16, x0: -100, x1: 1600, y0: 300, y1: 700, dy: 400, dx: 180, cols: p.leaf.birch });
    if (win) { const fg = U(); g += `<defs><linearGradient id="${fg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f8fa" stop-opacity=".34"/><stop offset="1" stop-color="#f4f8fa" stop-opacity=".12"/></linearGradient></defs><path fill="url(#${fg})" d="M-160 900V478Q300 472 760 480T1760 476V900z"/>`; }
    if (win) g += K.speckle({ seed: 186, x0: -160, x1: 1760, y0: 500, y1: 900, n: 400, cols: ['#ffffff', '#e6eef2'], op: .8 });
    let out = s + K.tone(L, g);
    if (win) out += K.snow({ seed: 187, n: 30, layers: 2 });
    return out + K.weather(L) + K.grade(L);
  });

  const place = "yateley-common", label = "Yateley Common", town = 'Yateley', kind = 'landscape', tags = ["heathland","heather","birch"];
  // Four composed views per season. The summer wide/close/evening and the autumn third view keep the original saved refs.
  const seasonalReasons = {
    spring: ["Fresh heath shoots and flowering gorse","Birch catkins above the sandy path","New growth beside the fallen branch","Spring dusk across the heath"],
    summer: ["Flowering heather beside the sandy trail","Butterflies beneath the leafy birches","Summer heather around the fallen branch","A summer dusk perch over the heath"],
    autumn: ["Golden birches and dry heath seed heads","Falling leaves above the winding path","Autumn gorse beside the fallen branch","Amber dusk over the open heath"],
    winter: ["Frosted heath and a winter robin","Bare birches above the pale sandy path","Snow over the heath and fallen branch","Winter dusk over the frosted heath"],
  };
  for (const view of [2]) for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const originalSeason = view === 2 ? 'autumn' : 'summer', reason = seasonalReasons[season][view];
    const it = { id: `${place}-${view + 1}${season !== originalSeason ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: view === 3 ? 'dreamy' : 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: ['wide', 'close', 'detail', 'evening'][view], viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON },
      svg: (o = {}) => scene(season, o) };
    // The composed scene (71-scene-uk-south-east-yateley-common-3.js) when the scene engine is in the build; the
    // hand-drawn art above stays as legacySvg (and is the item's art without the engine).
    add('hampshire', kind, typeof _scYc === 'object' ? _scYc.composed(it, season, typeof sceneYateleyCommon3 === 'function' ? sceneYateleyCommon3 : null) : it);
  }
}
