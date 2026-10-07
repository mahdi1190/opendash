// UK_SCENE_PART: uk-south-east/fleet-pond-v3
/* Fleet Pond — broad freshwater, reedbeds, woodland and viewing platforms.
     https://www.hart.gov.uk/fleet-pond
     https://group.rspb.org.uk/northeasthants/local-wild-places/fleet-pond-nature-reserve/
   View 3 of 4 ('autumn', the woodland shore), now in all four seasons. One file per view
   (the others: 72-anim-pack-uk-south-east-fleet-pond-v1..v4.js). Drawn with the rich nature kit
   T.K (src/app/71-anim-uk-nature-kit.js) and its live light (K.live).
   Brief: Fleet Pond is Hampshire's largest freshwater lake, a Local Nature Reserve of about
   141 acres of open water, reedbed, marsh, wet woodland (alder and willow) and heath. From the
   sandy east shore (Sandy Bay) the view runs west across the broad water: reeds fringe the east
   and south sides with two big reedbeds on the west, a boardwalk crosses the reeds to a viewing
   platform, and the South Western main line runs along the north shore on its embankment, its
   trains glimpsed through the trees. Great crested grebes, mute swans, Canada geese, coots,
   mallards and grey herons; siskins in the alders in winter.
   Keep every id, ukPlace, ukView, ukSeason and season unchanged so saved pins keep working. */
function ukSouthEastFleetPondV3(T) {
  const { add, U, R, rnd, mv } = T;
  const K = T.K;
  if (!K) return;
  const LAT = 51.29, LON = -0.82;

  // A great crested grebe (faces right, waterline 0, about 50 long): ruff and crest in breeding dress.
  const grebe = (x, y, s, o = {}) => {
    const breed = o.season === 'spring' || o.season === 'summer';
    const art = `<ellipse cy="2" rx="28" ry="3" fill="#0d3040" opacity=".2"/><path fill="#6b5a4a" d="M-26 0c-2-9 6-14 18-14l16 1c8 1 12 6 10 13z"/><path fill="#8a7460" d="M-20-8q14-7 28-4-12 6-28 4z"/>` +
      `<path fill="#f4f1ea" d="M5-12q3-14 2-25h8q0 13 3 25z"/><path fill="none" stroke="#3a3028" stroke-width="2.4" d="M6-14q2-12 1-23"/>` +
      `<g class="x-uknpeck" style="--ad:${o.peck || 9}s;--d:-${(x % 7).toFixed(1)}s;transform-box:view-box;transform-origin:10px -30px">` +
      (breed ? `<path fill="#b5542a" d="M5-36q-7 3-5 11 5-1 7-6zM16-36q6 4 3 11-5-2-5-6z"/><path fill="#2a2420" d="M5-40q3-9 9-6l3-4 1 7z"/>` : `<path fill="#3a3028" d="M6-39q4-6 9-4l2 3z"/>`) +
      `<ellipse cx="11" cy="-35" rx="5" ry="3.6" fill="#f4f1ea"/><path fill="#c98a8a" d="M15-36l13 1.5-13 2z"/><circle cx="13" cy="-36" r="1.1" fill="#9a1a1a"/></g>`;
    const body = mv('uknbob', { ad: (2.6 + (x % 3) * .3).toFixed(1) + 's', dy: '1.5px' }, art) + K.ripples(0, 2, { rx: 30, ry: 5, n: 2, dur: 5, d: x % 4 });
    return K.at(x, y, s, o.dx ? mv('uknpace', { ad: (o.dur || 40) + 's', d: '-' + (o.d || 0) + 's', dx: o.dx + 'px' }, body) : body, o.flip);
  };

  // A kingfisher darting low over the water now and then (a blue flash).
  const kingfisher = (x, y, s, o = {}) => K.at(x, y, 1, mv('uknglide', { ad: (o.dur || 26) + 's', d: '-' + (o.d || 0) + 's', dx: (o.dx || 900) + 'px', dy: '-10px' },
    `<g transform="scale(${s})">${mv('uknbob', { ad: '.9s', dy: '3px' }, `<path fill="#1f8fc0" d="M-14 0q6-8 18-6l8 3-8 4q-10 3-18-1z"/><path fill="#e07a2a" d="M-4 1q8 4 14-1z"/><path fill="#2ab0d8" d="M-12-2q8-2 14-1"/><path fill="#1f1a18" d="M12-3l10 1-10 2z"/>` +
      mv('uknflap', { ad: '.18s' }, `<path fill="#17709a" d="M-6-4q4-10 10-2z"/>`))}</g>`));

  // A South Western Railway electric unit (four cars) on the far embankment: blue body, yellow front,
  // lit windows after real dusk. Faces left at x 0; about 520 long at s 1.
  const train = (L, s, lit) => {
    let cars = '', win = '';
    for (let c = 0; c < 4; c++) {
      const x0 = c * 132;
      cars += `<path fill="#2e4266" d="M${x0 + 2} -36h126v30h-126z"/><path fill="#c9ced6" d="M${x0 + 2} -12h126v4h-126z"/><path fill="#d8402a" d="M${x0 + 2} -15h126v2h-126z"/>`;
      for (let w = 0; w < 7; w++) win += `<rect x="${x0 + 10 + w * 17}" y="-30" width="12" height="9" fill="${lit ? '#ffd98a' : K.mix(L.low, '#1c2630', .5)}"/>`;
    }
    const nose = `<path fill="#2e4266" d="M2-36q-14 2-16 18v12h16z"/><path fill="#f2c522" d="M-14-14v8h16v-8z"/><path fill="#1c2630" d="M-12-32q2-6 12-6v12h-14z"/>`;
    const lights = lit ? K.glow(-12, -10, 22, '#fff2c8', .7) : '';
    const under = `<path fill="#1a1d22" d="M-12-6h540v5h-540z"/><g fill="#22262c"><circle cx="20" cy="-1" r="3"/><circle cx="110" cy="-1" r="3"/><circle cx="152" cy="-1" r="3"/><circle cx="242" cy="-1" r="3"/><circle cx="284" cy="-1" r="3"/><circle cx="374" cy="-1" r="3"/><circle cx="416" cy="-1" r="3"/><circle cx="506" cy="-1" r="3"/></g>`;
    const glow = lit ? K.keep(`<g opacity=".9">${win}</g>` + lights) : win;
    return `<g transform="scale(${s})">${under}${cars}${nose}${glow}</g>`;
  };

  // A boardwalk across the reedbed: individual planks in perspective, posts and hand rails.
  // pts: centre line [[x, y, width], ...] from near to far.
  const boardwalk = (pts, season, L) => {
    const wood = season === 'winter' ? ['#9c9282', '#bdb4a2', '#6e665a'] : ['#8c7356', '#b39776', '#5e4b38'];
    let deck = '', planks = ['', ''], rails = '', posts = '';
    const left = [], right = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0, w0] = pts[i], [x1, y1, w1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.max(2, Math.round(len / Math.max(5, (w0 + w1) * .06)));
      for (let j = 0; j < steps; j++) {
        const t = j / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, w = w0 + (w1 - w0) * t, h = w * .5;
        left.push([x - h, y]); right.push([x + h, y]);
        planks[j % 2] += `M${R(x - h)} ${R(y)}H${R(x + h)}`;
      }
    }
    const [lx, ly, lw] = pts[pts.length - 1]; left.push([lx - lw / 2, ly]); right.push([lx + lw / 2, ly]);
    deck = `M${left.map(p => R(p[0]) + ' ' + R(p[1])).join('L')}L${right.slice().reverse().map(p => R(p[0]) + ' ' + R(p[1])).join('L')}z`;
    for (const side of [left, right]) {
      let rail = '';
      side.forEach((p, i) => {
        const k = 1 - i / side.length, ph = 10 + 34 * k;
        if (i % 3 === 0) posts += `M${R(p[0])} ${R(p[1] + 4 * k)}V${R(p[1] - ph)}`;
        rail += (i ? 'L' : 'M') + R(p[0]) + ' ' + R(p[1] - ph);
      });
      rails += rail;
    }
    return K.P(wood[0], deck) + K.S(wood[1], 2.6, planks[0], ' opacity=".9"') + K.S(wood[2], 1.4, planks[1], ' opacity=".6"') +
      K.S(wood[2], 3, posts) + K.S(wood[1], 2.4, rails) + (L.shadow && L.shadow.op ? K.S('#14261e', 6, rails, ` opacity="${(L.shadow.op * .5).toFixed(2)}" transform="translate(${R(L.shadow.dx * .2)} 30)"`) : '');
  };

  // The viewing platform at the end of the boardwalk, jutting out over the water.
  const platform = (x, y, w, season) => {
    const top = season === 'winter' ? '#b8af9c' : '#a88c6a', side = season === 'winter' ? '#7a7264' : '#5e4b38';
    let posts = '', planks = '';
    for (let i = 0; i <= 8; i++) posts += `M${R(x + i * w / 8)} ${y}v-26`;
    for (let i = 1; i < 6; i++) planks += `M${x} ${y + i * 3}h${w}`;
    return `<path fill="${side}" d="M${x - 6} ${y}h${w + 12}v8h-${w + 12}z"/><path fill="${top}" d="M${x} ${y - 4}h${w}l6 4h-${w + 12}z"/><path fill="none" stroke="${side}" stroke-width="2" d="${posts}M${x} ${y - 26}h${w}M${x} ${y - 14}h${w}"/>` +
      `<path fill="none" stroke="${side}" stroke-width="3" d="M${x + 4} ${y + 8}v26M${x + w - 4} ${y + 8}v26M${R(x + w / 2)} ${y + 8}v24"/>` + K.S('#3a4a4a', 1, planks, ' opacity=".3"');
  };

  // Rooftops of Fleet beyond the railway (north shore), with windows that light at real dusk.
  const houses = (L, seed) => {
    const r = rnd(seed); let out = '';
    for (let i = 0; i < 9; i++) {
      const x = 1180 + i * 62 + r() * 24, w = 30 + r() * 18, h = 12 + r() * 8, y = 512 - r() * 4;
      out += `<path fill="${K.mix('#8a5a4a', L.haze, .45)}" d="M${R(x)} ${R(y - h)}l${R(w / 2)} -11l${R(w / 2)} 11z"/><path fill="${K.mix('#c9b8a0', L.haze, .45)}" d="M${R(x)} ${R(y - h)}h${R(w)}v${R(h)}h-${R(w)}z"/>`;
      out += K.window(L, x + 5, y - h + 3, 5, 4, { on: .6, bars: false, frame: '#e0dcd0' }) + K.window(L, x + w - 10, y - h + 3, 5, 4, { on: .5, bars: false, frame: '#e0dcd0' });
    }
    return out;
  };

  const scene = (o, season) => K.scene(o, () => {
    const at = { spring: 'morning', summer: 'afternoon', autumn: 'golden', winter: 'day' }[season];
    const L = K.live(o, { heading: 262, fov: 80, horizon: 520, season, at, lat: LAT, lon: LON });
    const lo = K.lod() < 1;   // a small tile: K.scene draws about 20% of the detail, and these extras are left out
    const p = K.pal(season), spr = season === 'spring', sum = season === 'summer', aut = season === 'autumn', win = season === 'winter';
    const sx = { spring: 0, summer: 1, autumn: 2, winter: 3 }[season] * 101;
    const sky = K.liveBackdrop(L, { seed: 7 + sx, stars: 220, cloudY: [40, 380] });
    let g = '';
    // 1. far shore: hazy woods, Fleet's rooftops and the railway embankment (all mirrored in the water)
    const far = U();
    let fg = K.woods({ seed: 31 + sx, x0: lo ? 480 : -160, y: 528, h: [26, 52], mix: { oak: .45, birch: .25, pine: .3 }, season, haze: .6, sway: 0, shrubs: false, snow: win });
    fg += houses(L, 77);
    fg += `<path fill="${K.mix(p.grass[0], L.haze, .5)}" d="M700 536L760 516H1760V540H700z"/><path fill="none" stroke="#5a5450" stroke-width="1.6" opacity=".6" d="M770 515H1760M780 518H1760"/>`;
    const lit = L.windows;
    const far2 = U();
    g += `<g id="${far}">${fg}</g>`; fg = '';
    g += `<g transform="translate(1780 514)">${mv('uknglide', { ad: '58s', d: '-9s', dx: '-1300px', dy: '0px' }, train(L, .42, lit))}</g>`;
    g += `<g transform="translate(560 517)">${mv('uknglide', { ad: '74s', d: '-44s', dx: '1300px', dy: '0px' }, `<g transform="scale(-1 1)">${train(L, .4, lit)}</g>`)}</g>`;
    // trees along the embankment screen the line in places
    if (!lo) fg += K.woods({ seed: 33 + sx, x0: 640, x1: 1760, y: 542, h: [34, 70], mix: { alder: .4, willow: .3, birch: .3 }, season, haze: .42, sway: 0, gap: 1.6, shrubs: false, snow: win });
    // the wooded south-west shore on the left, larger and closer
    fg += K.woods({ seed: 35 + sx, x0: -160, x1: 700, y: 548, h: [70, 130], mix: { oak: .4, birch: .3, pine: .2, alder: .1 }, season, haze: .3, sway: 0, snow: win });
    // the west reedbeds along the far waterline
    g += `<g id="${far2}">${fg}</g>`;
    g += K.reeds({ seed: 37 + sx, x0: 420, x1: 1760, y0: 538, y1: 552, n: 90, season, k0: .18, k1: .26, kinds: ['plume'], haze: .35 });
    // 2. the broad water, mirroring the far shore and the sky
    const clip = U(), wd = 'M-160 546H1760V900H-160z';
    g += K.water({ d: wd, y0: 546, y1: 900, cols: L.water(['#9fb8b0', '#4f7470', '#24413f']), clip, reflect: [], keepSky: true, lines: 90, shimmer: 60, glints: L.sun.show ? 16 : 0, gx0: L.sun.x - 200, gx1: L.sun.x + 200, sky: L.low, seed: 41 + sx });
    // the far shore mirrored in the still water (static: a wobbling mirror of the whole shore costs too much per frame)
    g += `<g clip-path="url(#${clip})" opacity=".46"><use href="#${far}" transform="matrix(1 0 0 -1 0 1094)"/><use href="#${far2}" transform="matrix(1 0 0 -1 0 1094)"/></g>`;
    g += K.S(K.mix(L.low, "#ffffff", .3), 1.4, "M-160 560h900M820 566h700M-100 574h500M600 586h1100M200 600h800", " opacity=\".35\" clip-path=\"url(#" + clip + ")\"");
    g += K.lightPath(L, { y0: 550, y1: 860, w: 60, clip });
    if (win) g += `<g clip-path="url(#${clip})"><path fill="#eef4f6" opacity=".35" d="M-160 640Q200 660 420 760T760 900H-160zM1760 650Q1300 660 1060 760T900 900H1760z"/><path fill="none" stroke="#ffffff" stroke-width="1.5" opacity=".5" d="M-100 700l160 12M40 760l180 20M1300 700l200-8M1100 800l260-14"/></g>`;
    if (aut || win || L.alt < 8) g += K.mist({ seed: 43 + sx, y: 560, h: 40, n: 6, op: aut ? .55 : .4, col: K.mix('#f2f4f0', L.light, .3) });
    // 3. water life in the middle distance
    g += K.duck('swan', 560, 640, .7, { dx: 260, dur: 70 }) + K.duck('swan', 640, 660, .6, { dx: 240, dur: 76, d: 10 });
    g += K.duck('goose', 900, 600, .45, { dx: -180, dur: 54 }) + K.duck('goose', 960, 606, .42, { dx: -170, dur: 58, d: 6 }) + K.duck('goose', 1010, 598, .4, { dx: -160, dur: 60, d: 12 });
    g += K.duck('coot', 420, 590, .4, { dx: 120, dur: 30 }) + K.duck('coot', 1100, 612, .4, { dx: -90, dur: 26 }) + K.duck('mallard', 760, 700, .62, { dx: 140, dur: 36 }) + K.duck('female', 800, 712, .6, { dx: 130, dur: 40, d: 5 });
    if (win) g += K.duck('coot', 300, 620, .45, { dx: 140, dur: 34 }) + K.duck('mallard', 1000, 680, .55, { dx: -120, dur: 30 }) + K.duck('female', 340, 700, .6, { dx: 100, dur: 38 });
    g += grebe(700, 590, .38, { season, dx: 160, dur: 48 }) + grebe(330, 660, .55, { season, dx: -120, dur: 44, flip: true, d: 9 });
    if (spr) g += grebe(372, 664, .55, { season, dx: -120, dur: 44, d: 9 });
    g += K.ripples(520, 610, { rx: 26, ry: 4, n: 3, dur: 5 }) + K.ripples(1040, 650, { rx: 34, ry: 5, n: 3, dur: 6, d: 2 });
    g += K.fish(600, 740, .7, { dur: 13 }) + K.fish(900, 640, .5, { dur: 17, d: 7 });
    if (!win && !lo) g += K.lilies({ seed: 45 + sx, x0: 820, x1: 1080, y0: 700, y1: 790, n: 18, season, flowers: sum ? .5 : 0 });
    g += kingfisher(-60, 760, .9, { dx: 1100, dur: 31, d: 4 });
    // 4. the left woodland shore: bank, trees, bracken, a fallen log, leaf litter
    const bank = 'M-160 590Q60 600 210 636Q360 680 470 760Q560 830 620 900H-160z';
    g += K.land({ d: bank, top: K.mix(p.ground[1], p.grass[1], .4), bottom: p.ground[0], y0: 590, y1: 900, seed: 51 + sx, speckle: 260, cols: aut ? ['#b5652a', '#d9902a'] : null });
    if (!lo) g += K.carpet({ seed: 52 + sx, x0: -160, x1: 470, y0: 620, y1: 860, rows: 10, lobe: [18, 70], season, cols: win ? ['#7a6a58', '#9a8a76', '#d8d6cc'] : aut ? ['#8a5a2a', '#b5742e', '#d39a48'] : p.grass.slice(0, 3), dots: aut ? ['#c86a2a', '#e8a840'] : p.grass.slice(1), texture: 'tufts' });
    if (!lo) g += K.tree('pine', -40, 640, .95, { season, seed: 61, flutter: 0, snow: win });
    g += K.tree('oak', 70, 790, 1.35, { season, seed: 62 + sx, flutter: 10, fall: aut ? 16 : 0, ground: 900, snow: win });
    g += K.tree('birch', 250, 700, .95, { season, seed: 63, flutter: 10, fall: aut ? 10 : 0, ground: 860, snow: win });
    if (!lo) g += K.tree('alder', 380, 690, .62, { season, seed: 64, flutter: 6, ground: 820, snow: win });
    if (!lo) g += K.tree('birch', 455, 745, .7, { season, seed: 65, flutter: 8, fall: aut ? 6 : 0, ground: 840, snow: win, flip: true });
    if (!lo) g += K.tree('willow', 190, 640, .55, { season, seed: 66, flutter: 6, ground: 700, snow: win });
    if (!lo) g += K.bracken({ seed: 67 + sx, x0: 160, x1: 470, y0: 740, y1: 880, n: 22, season });
    g += K.log(310, 838, .9, { season }) + K.fern(420, 880, .9, { season }) + K.fern(-80, 900, 1.1, { season });
    g += K.reeds({ seed: 68 + sx, x0: 380, x1: 600, y0: 760, y1: 860, n: 24, season, k0: .7, k1: .9 });
    if (spr) g += K.bluebells ? K.bluebells({ seed: 69, x0: -160, x1: 360, y0: 800, y1: 900, n: 70, season }) : '';
    g += K.robin(330, 812, 1);
    g += K.squirrel(262, 700, .9);
    // 5. Sandy Bay: the little sandy beach on the east shore, front and centre
    const sand = 'M500 900Q540 852 660 834Q860 812 1010 826Q1060 846 1020 900z';
    g += K.land({ d: sand, top: win ? '#d8d0c0' : '#dcc69c', bottom: '#b0926a', y0: 812, y1: 900, seed: 71, speckle: 160 });
    g += `<path fill="none" stroke="#f4f8f4" stroke-width="2" opacity=".6" d="M560 852Q780 818 1010 830"/>` + mv('uknshim', { ad: '4s' }, `<path fill="none" stroke="#e8f4f2" stroke-width="2.6" opacity=".7" d="M580 846Q790 812 1000 824"/>`);
    g += K.stones({ seed: 72, x0: 560, x1: 1000, y0: 838, y1: 900, n: 46 });
    g += K.walker(620, 880, 1.15, { dog: true, dx: 250, dy: -12, dur: 46, seed: 5, coat: win ? '#3a4a6a' : aut ? '#8a4a2a' : '#4a7a5a', hat: win ? '#c0402a' : null });
    // 6. the near reedbed (common reed, a few reedmace) on the right, the boardwalk out to the viewing platform
    g += K.land({ d: 'M960 900Q990 780 1100 720Q1300 650 1760 636V900z', top: K.mix(p.reed[0], '#3a4a40', .5), bottom: '#2e3326', y0: 636, y1: 900, seed: 73 });
    g += K.reeds({ seed: 74 + sx, x0: 1080, x1: 1760, y0: 642, y1: 712, n: 170, season, k0: .32, k1: .55, kinds: ['plume'] });
    g += K.reeds({ seed: 75 + sx, x0: 1300, x1: 1760, y0: 712, y1: 770, n: 60, season, k0: .5, k1: .65, kinds: ['plume', 'plume', 'bulrush'] });
    g += platform(1060, 696, 120, season);
    g += K.family(1110, 692, .55, { dx: 40, dur: 30, seed: 11 });
    g += boardwalk([[1560, 930, 190], [1460, 820, 130], [1340, 748, 90], [1240, 708, 66], [1180, 696, 58]], season, L);
    g += K.heron(1010, 742, .62, { flip: true });
    g += K.walker(1470, 836, 1.05, { dx: -190, dy: -96, dur: 52, seed: 21, coat: win ? '#2a4a6a' : '#c0583a' });
    g += K.reeds({ seed: 76 + sx, x0: 980, x1: 1380, y0: 770, y1: 905, n: 84, season, k0: .6, k1: 1, kinds: ['plume', 'plume', 'bulrush'] });
    g += K.reeds({ seed: 77 + sx, x0: 1560, x1: 1760, y0: 750, y1: 905, n: 60, season, k0: .6, k1: 1, kinds: ['plume', 'plume', 'plume', 'bulrush'] });
    // 7. the nearest edge: grass and seasonal flowers on the bank, swaying
    g += K.wind(K.blades({ seed: 81 + sx, x0: -160, x1: 560, y0: 860, y1: 930, n: 44, h: 70, season, heads: sum || aut ? .25 : 0 }).concat(K.blooms({ seed: 82 + sx, x0: -120, x1: 520, y0: 868, y1: 910, n: win ? 0 : 26, kinds: spr ? ['celandine', 'anemone', 'bluebell'] : sum ? ['foxglove', 'campion', 'buttercup'] : aut ? ['ragwort', 'harebell'] : ['daisy'] })), { strips: 6 });
    // 8. the air: birds, insects, bats, seasonal particles
    const day = L.dark < .5, dusk = L.dark > .3;
    if (day) g += K.flock({ seed: 3 + sx, n: 7, x: 1700, y: 200, s: 1.2, dx: -1900, dy: 40, dur: 62, v: true, col: '#3a3a40' }) + K.flock({ seed: 5, n: 5, x: -120, y: 300, s: .8, dx: 1800, dy: -50, dur: 44 });
    if (win && day) g += K.flock({ seed: 8, n: 9, x: -100, y: 360, s: .9, dx: 1800, dy: -40, dur: 50, col: '#e8ecee' });
    if (day && (spr || sum)) g += K.dragonfly(820, 760, 1, { dx: 180 }) + K.dragonfly(1060, 680, .8, { col: '#c0302a', dx: -140 }) + K.butterfly(260, 820, .9, { kind: spr ? 'brimstone' : 'admiral', dx: 200, dy: 40 }) + K.bee(120, 860, 1.1);
    if (dusk) g += K.bats({ seed: 7, n: 5, x: 760, y: 360, spread: 300 }) + K.owl(258, 440, .8);
    if (aut) g += K.falling({ seed: 91, n: 20, x0: -100, x1: 900, y0: -20, y1: 520, dy: 560, dx: 180, cols: p.leaf.birch.concat(p.leaf.oak) });
    if (spr) g += K.petals({ seed: 92, n: 22, x0: -100, x1: 1200, y0: 100, y1: 520 });
    if (sum) g += K.motes({ seed: 93, n: 22, x0: 200, x1: 1400, y0: 520, y1: 840 });
    if (win) g += K.snow({ n: 40 });
    return sky + K.tone(L, g) + K.weather(L) + K.grade(L);
  });

  const place = 'fleet-pond', label = 'Fleet Pond', town = 'Fleet', kind = 'landscape', tags = ['lake', 'reedbed', 'nature reserve'];
  const reasons = {
    spring: 'Grebes courting off the woodland shore',
    summer: 'The woodland shore and the reedbed boardwalk',
    autumn: 'The autumn woodland shore',
    winter: 'A frosty shore, wildfowl on the broad water',
  };
  // The scene engine (docs/dev/SCENE_ENGINE.md section 17): when it is in the build, the four seasonal items share ONE
  // composed, auto-season scene (71-scene-uk-south-east-fleet-pond-v3.js on the canvas renderer: the date picks the
  // season, the live sky the light). Every id, ukPlace, ukView, ukSeason, season and the rotation stay as they were;
  // the hand-drawn art above is kept as legacySvg (old-versus-new sheets), and is the scene when the engine is absent.
  const composed = typeof sceneUkFleetPondV3 === 'function' && typeof sceneItem === 'function' && typeof sceneSvg === 'function';
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const reason = reasons[season], legacy = (o = {}) => scene(o, season);
    const o = { id: `${place}-3${season !== 'autumn' ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: 'calm', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: 'autumn', viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: LAT, lon: LON }, svg: legacy };
    add('hampshire', kind, composed ? Object.assign(sceneItem(Object.assign({ intensity: 'subtle' }, o), sceneUkFleetPondV3), { season: [season], liveSky: o.liveSky, legacySvg: legacy }) : o);
  }
}
