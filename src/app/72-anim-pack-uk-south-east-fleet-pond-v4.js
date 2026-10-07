// UK_SCENE_PART: uk-south-east/fleet-pond-v4
/* Fleet Pond — broad freshwater, reedbeds, woodland and viewing platforms.
     https://www.hart.gov.uk/fleet-pond
     https://en.wikipedia.org/wiki/Fleet_Pond
   View 4 of 4 (evening), drawn with the rich nature kit T.K (71-anim-uk-nature-kit.js).
   Brief (researched 6 Oct 2026): Fleet Pond is Hampshire's largest freshwater lake, a large,
   shallow pond in a 48 ha SSSI and Local Nature Reserve, fringed by Phragmites reedbed, alder
   carr and oak, birch and pine woodland, with boardwalks and viewing platforms. The South
   Western Main Line runs on an embankment along its north shore by Fleet station, so trains
   cross the far bank. Great crested grebes breed and winter here, with mute swans, Canada
   geese, coots, mallards and grey herons. This view: from the south-east shore's boardwalk,
   looking west-north-west across the open water into the evening sun, the railway on the far
   bank to the right, the reedbed and alder carr on the left.
   Live: sky, sun, moon (real phase), stars, light, shadows, reflections, lit train and house
   windows from real dusk, all from K.live (the user's clock and location). */
function ukSouthEastFleetPondV4(T) {
  const { add, U, R, rnd, mv } = T;
  const K = T.K;
  const HEAD = 285, FOV = 92, SHORE = 524;
  const sec = v => (Math.round(v * 100) / 100) + 's';

  /** A great crested grebe (local art faces right, waterline 0), paddling and bobbing. */
  const grebe = (x, y, s, o) => {
    const r = rnd(R(x * 3 + y * 11)), breed = o.season !== 'winter' && o.season !== 'autumn';
    const head = breed
      ? '<path fill="#9a4a22" d="M9-33q-9 5-3 14l10-7z"/><path fill="#2a211c" d="M10-38q6-9 14-2l-2 6h-12zM11-38l-4-8 7 5zM15-40l-1-8 5 7z"/><path fill="#efe9dc" d="M14-33q4 3 8 0v4h-8z"/>'
      : '<path fill="#2a211c" d="M11-38q6-7 12-2l-2 3h-10z"/><path fill="#f2eee4" d="M11-35h12l-1 5h-11z"/>';
    const art = `<ellipse cy="2" rx="30" ry="3" fill="#0d3040" opacity=".22"/><path fill="#5d4c3c" d="M-26 0c-2-9 6-14 18-14l18 1c8 1 12 7 10 13z"/><path fill="#d9cfbd" d="M2-11q12 1 18 11h-18z"/><path fill="none" stroke="#efe9dc" stroke-width="6" stroke-linecap="round" d="M14-9q4-14 2-26"/><path fill="none" stroke="#3a2e26" stroke-width="2" d="M12-10q2-12 0-24"/>${head}<path fill="#d79a8a" d="M23-36l12 2-12 2z"/><circle cx="19" cy="-36" r="1.3" fill="#b0302a"/><path fill="none" stroke="#f2fbf6" stroke-width="1.4" opacity=".6" d="M-26 3q-20 3-40 8M-26 3q-18-1-36-5"/>`;
    const body = mv('uknbob', { ad: sec(2.4 + r() * 1.4), d: sec(-r() * 3), dy: '1.5px' }, art);
    return K.at(x, y, s, mv('uknpace', { ad: sec(o.dur || 40), d: sec(-r() * 30), dx: R(o.dx || 80) + 'px' }, body), o.flip);
  };

  /** A South Western Railway electric unit (navy, red-orange ends), windows lit from real dusk. */
  const train = (L, y, cars, dir, dur, delay, seed) => {
    const r = rnd(seed), carW = 74, h = 13, lit = L.windows;
    let body = '', win = '', band = '';
    for (let c = 0; c < cars; c++) {
      const cx = c * (carW + 3);
      body += `M${cx} ${y - h}h${carW}v${h}h${-carW}z`;
      band += `M${cx} ${y - 3}h${carW}`;
      for (let w = 0; w < 9; w++) if (r() < .93) win += `M${cx + 5 + w * 7.6} ${y - h + 3}h5v4h-5z`;
    }
    const len = cars * (carW + 3), nose = dir > 0 ? len : 0;
    const ends = `<path fill="#c8402a" d="M${dir > 0 ? len - 3 : 0} ${y - h}h${dir > 0 ? 6 : -6}l${dir > 0 ? 5 : -5} ${h}h${dir > 0 ? -11 : 11}z"/><path fill="#e8b830" d="M${dir > 0 ? len - 10 : 4} ${y - 4}h6v2h-6z"/>`;
    const head = lit ? K.keep(`<circle cx="${nose + dir * 6}" cy="${y - 4}" r="2.4" fill="#fff6d8"/>` + K.glow(nose + dir * 14, y - 4, 22, '#fff2c8', .45)) : '';
    const art = `<path fill="#2c3a52" d="${body}"/><path stroke="#5b6b82" stroke-width="1.6" fill="none" d="${band}"/>` + (lit ? K.keep(`<path fill="#ffd98a" d="${win}"/>`) : `<path fill="#1b2433" d="${win}"/>`) + ends + head + `<path stroke="#1a1c22" stroke-width="2" d="M0 ${y + 1}h${len}"/>`;
    const x0 = dir > 0 ? -len - 1500 : 1760 + 1500, dx = dir > 0 ? 1760 + 3000 + len : -(1760 + 3000 + len);
    return `<g transform="translate(${x0} 0)">${mv('uknglide', { ad: sec(dur), d: sec(-delay), dx: R(dx) + 'px', dy: '0px' }, art)}</g>`;
  };

  /** The far bank: hazy woods, Fleet's roofs, the railway embankment, lineside trees and the far reeds. */
  const farBank = (L, season, sd) => {
    const r = rnd(sd), win = season === 'winter', lo = K.lod() < 1;   // lo: a small gallery tile (keep it under its 150 KB budget)
    let g = K.woods({ seed: sd + 1, y: 506, h: lo ? [56, 70] : [30, 52], mix: { oak: .45, pine: .3, birch: .25 }, season, haze: .6, sway: 0, rows: 1 });
    // roofs of Fleet beyond the line (north of the railway), windows lit from real dusk
    for (let i = 0; i < (lo ? 3 : 7); i++) {
      const x = 1180 + i * 78 + r() * 30, w = 40 + r() * 24, hh = 16 + r() * 6, y = 494 - r() * 4;
      g += `<path fill="${K.mix('#8a6a5a', L.haze, .45)}" d="M${R(x - 3)} ${R(y - hh)}l${R(w / 2 + 3)} -12 ${R(w / 2 + 3)} 12z"/><path fill="${K.mix('#c8b8a0', L.haze, .45)}" d="M${R(x)} ${R(y - hh)}h${R(w)}v${R(hh)}h${R(-w)}z"/>`;
      g += K.window(L, x + 6, y - hh + 4, 6, 5, { on: .6, bars: false }) + K.window(L, x + w - 13, y - hh + 4, 6, 5, { on: .5, bars: false });
    }
    // the embankment: a long raised bank with its ballast, rails and a signal
    g += `<path fill="${K.mix('#5d6a48', L.haze, .4)}" d="M330 512Q420 494 520 492H1760V522H330z"/><path fill="${K.mix('#8a7e6e', L.haze, .4)}" d="M470 494H1760v5H470z"/><path stroke="${K.mix('#4a4644', L.haze, .3)}" stroke-width="1.2" fill="none" d="M480 494H1760M480 497H1760"/>`;
    g += `<path stroke="#2a2a2c" stroke-width="2" d="M1452 494v-30"/><path fill="#1e1e22" d="M1448 458h9v10h-9z"/>` + K.keep(`<circle cx="1452.5" cy="463" r="2" fill="#e04030"/>` + (L.dark > .3 ? K.glow(1452, 463, 14, '#ff6040', .5) : ''));
    g += K.lamp(L, 1560, 470, 2.4) + `<path stroke="#3a3a3c" stroke-width="1.6" d="M1560 494v-22"/>` + K.lamp(L, 1680, 469, 2.4) + `<path stroke="#3a3a3c" stroke-width="1.6" d="M1680 494v-22"/>`;
    // two trains, up and down line, passing now and then
    g += train(L, 492, lo ? 4 : 8, 1, 72, 27, sd + 5) + (lo ? '' : train(L, 496, 4, -1, 64, 45, sd + 6));
    // lineside trees with gaps (the train shows between them), denser carr to the west
    for (let x = 520; x < 1760;) {
      const kind = r() < .45 ? 'birch' : r() < .5 ? 'oak' : r() < .5 ? 'alder' : 'pine', s = .1 + r() * .1;
      g += K.tree(kind, x, 518 + r() * 6, s, { season, seed: sd + x, haze: .38, flutter: 0, shadow: false });
      x += lo ? 260 + r() * 200 : 30 + r() * 120;
    }
    g += K.woods({ seed: sd + 2, x0: -160, x1: 560, y: 522, h: lo ? [105, 140] : [70, 135], mix: { alder: .35, birch: .3, oak: .2, pine: .15 }, season, haze: .3, snow: win });
    g += K.reeds({ seed: sd + 3, x0: -160, x1: 1760, y0: 518, y1: 530, n: lo ? 60 : 120, season, k0: .12, k1: .2, haze: .3 });
    return g;
  };

  const scene = (season, o) => K.scene(o, () => {
    const L = K.live(o, { heading: HEAD, fov: FOV, horizon: 512, season, at: 'sunset', lat: 51.29, lon: -0.83 });
    const p = K.pal(season), spr = season === 'spring', sum = season === 'summer', aut = season === 'autumn', win = season === 'winter';
    const lo = K.lod() < 1;
    const sd = { spring: 610, summer: 620, autumn: 630, winter: 640 }[season];
    let s = K.liveBackdrop(L, { seed: sd, cloudY: [40, 380], stars: 260 });
    if (L.stars > .3) {   // a few brighter stars twinkling over the pond (x-ukystar, the pack's star twinkle)
      const q = rnd(sd + 90), grp = ['', '', ''];
      for (let i = 0; i < 15; i++) grp[i % 3] += `<circle cx="${R(q() * 1600)}" cy="${R(q() * 320)}" r="${(1.1 + q() * 1.1).toFixed(1)}"/>`;
      s += K.keep(`<g fill="#fff4e0" opacity="${(L.stars * .9).toFixed(2)}">` + grp.map((d, i) => mv('ukystar', { ad: sec(3.2 + i * 1.1), d: sec(-i) }, d)).join('') + '</g>');
    }
    let g = '';
    // the far bank, kept as a group so the pond mirrors it
    const bank = U();
    g += `<g id="${bank}">${farBank(L, season, sd + 10)}</g>`;
    // the open water: the sky and the far bank mirrored, the sun's or moon's road, rings, life
    const clip = U(), pond = `M-160 ${SHORE}Q400 ${SHORE - 4} 800 ${SHORE}T1760 ${SHORE - 2}V900H-160z`;
    g += K.water({ d: pond, y0: SHORE, y1: 900, cols: L.water(), clip, reflect: [{ id: bank, y: SHORE, op: .5 }], keepSky: true, lines: 110, shimmer: 70, glints: L.sun.show ? 14 : 0, gx0: L.sun.x - 180, gx1: L.sun.x + 180, sky: L.low, seed: sd + 20 }).replace(/ class="x-uknwobble"[^>]*/, '');   // a still mirror: re-rasterising the whole far bank every frame is the costliest thing here
    g += K.lightPath(L, { y0: SHORE + 4, y1: 880, w: 46, clip, n: 90 });
    if (!lo && (L.dark > .15 || win || aut)) g += K.mist({ seed: sd + 21, y: SHORE + 18, h: 40, n: 3, op: win ? .55 : .4 });
    if (!lo && (sum || spr)) g += K.lilies({ seed: sd + 22, x0: 380, x1: 760, y0: 700, y1: 790, n: 22, season, flowers: sum ? .45 : 0 });
    if (win) g += `<path fill="#dfe9ee" opacity=".72" d="M-160 640Q260 652 520 690Q660 730 600 800Q560 860 540 900H-160z"/><path fill="none" stroke="#b8cad4" stroke-width="1.4" d="M80 680l90 40 40 60M300 700l-40 70M420 720l80 30" opacity=".7"/><path fill="#dfe9ee" opacity=".6" d="M1760 720Q1400 740 1180 800L1120 900H1760z"/>`;
    // ripples and rising fish over the open water
    g += K.ripples(860, 600, { rx: 30, ry: 4, n: 3, dur: 6 }) + K.ripples(1230, 650, { rx: 36, ry: 5, n: 2, dur: 7, d: 2 }) + K.ripples(560, 580, { rx: 22, ry: 3, n: 2, dur: 5, d: 1 });
    if (!win) g += K.fish(980, 700, .55, { dur: 13 }) + K.fish(640, 620, .4, { dur: 17, d: 7 });
    // waterbirds: grebes, swans, Canada geese, coots, mallards, a heron in the shallows
    g += grebe(760, 590, .55, { season, dx: 70, dur: 46 }) + grebe(1040, 612, .6, { season, dx: -60, dur: 52, flip: true }) + grebe(1330, 575, .42, { season, dx: 50, dur: 40 });
    g += K.duck('swan', 600, 660, .9, { dx: 160, dur: 70 }) + K.duck('swan', 690, 676, .8, { dx: 150, dur: 74, d: 4 });
    g += K.duck('goose', 1120, 560, .45, { dx: -90, dur: 50 }) + K.duck('goose', 1180, 566, .45, { dx: -80, dur: 54, d: 6 }) + K.duck('goose', 1240, 558, .42, { dx: -70, dur: 58, d: 11, flip: true });
    g += K.duck('coot', 900, 640, .45, { dx: 70, dur: 30 }) + K.duck('coot', 470, 600, .38, { dx: -50, dur: 28, flip: true }) + K.duck('coot', 1420, 620, .5, { dx: -60, dur: 34 });
    g += K.duck('mallard', 980, 760, .8, { dx: 130, dur: 44 }) + K.duck('female', 1050, 772, .78, { dx: 120, dur: 47, d: 3 });
    g += K.duck('moorhen', 560, 712, .55, { dx: 60, dur: 30 });
    if (win) g += K.duck('female', 300, 600, .4, { dx: 80, dur: 40 }) + K.duck('mallard', 1300, 700, .6, { dx: -90, dur: 42 });
    g += K.heron(500, 760, .62, { flip: true, dur: 14 });
    // the alder carr and reedbed on the left: back reeds, a willow, birches, then the front reeds
    g += K.land({ d: 'M-160 664Q240 650 520 700Q640 760 560 830Q500 880 470 900H-160z', top: K.mix(p.reed[0], '#3a4a2a', .3), bottom: K.mix(p.ground[0], '#1a2016', .3), y0: 650, y1: 900, seed: sd + 30, speckle: 120 });
    if (!lo) g += K.reeds({ seed: sd + 31, x0: -160, x1: 560, y0: 640, y1: 720, n: 70, season, k0: .45, k1: .75, kinds: ['plume'] });
    if (!lo) g += K.tree('willow', 360, 690, .55, { season, seed: sd + 32, flutter: 4, fall: aut ? 6 : 0, ground: 760 });
    if (!lo) g += K.tree('alder', 120, 680, .62, { season, seed: sd + 33, flutter: 4, fall: aut ? 8 : 0, ground: 760 });
    if (!lo) g += K.tree('birch', -60, 720, .78, { season, seed: sd + 34, flutter: 6, fall: aut ? 8 : 0, ground: 820, snow: win });
    if (!lo) g += K.tree(spr ? 'hawthorn' : 'alder', 250, 700, .42, { season, seed: sd + 35, blossom: spr, flutter: 3 });
    g += K.reeds({ seed: sd + 36, x0: -160, x1: 520, y0: 730, y1: 820, n: 80, season, k0: .8, k1: 1.2, kinds: ['plume', 'plume', 'bulrush'] });
    g += K.reeds({ seed: sd + 37, x0: -160, x1: 420, y0: 820, y1: 905, n: 60, season, k0: 1.3, k1: 1.8, kinds: ['plume', 'bulrush', 'plume'] });
    // the boardwalk and viewing platform on the right, with a walker and a birder at the rail
    g += K.land({ d: 'M1760 740Q1480 752 1290 812Q1190 856 1170 900H1760z', top: K.mix(p.grass[1], '#2a3a22', .2), bottom: p.ground[0], y0: 740, y1: 900, seed: sd + 40, speckle: 80 });
    g += K.reeds({ seed: sd + 41, x0: 1260, x1: 1760, y0: 740, y1: 800, n: 40, season, k0: .55, k1: .8, kinds: ['plume', 'plume', 'bulrush'] });
    let planks = '', posts = '', piles = '';
    for (let i = 0; i <= 26; i++) { const t = i / 26, x0 = 1130 + t * 630, y0 = 780 + t * 36, y1 = 806 + t * 70; planks += `M${R(x0)} ${R(y0)}L${R(x0 + 14 + t * 30)} ${R(y1)}`; }
    for (let i = 0; i <= 12; i++) { const t = i / 12, x = 1132 + t * 628, y = 780 + t * 36, hh = 34 + t * 34; posts += `M${R(x)} ${R(y)}v${-R(hh)}`; piles += `M${R(x + 16 + t * 30)} ${R(808 + t * 70)}v${R(20 + t * 20)}`; }
    const deck = K.mix('#9c8a6c', L.light, .1);
    g += `<path stroke="#3a3428" stroke-width="5" fill="none" d="${piles}"/><path fill="${deck}" d="M1130 780L1760 816V876L1150 806z"/><path fill="${K.mix(deck, '#000', .35)}" d="M1150 806L1760 876V900L1152 814z"/><path stroke="${K.mix(deck, '#000', .3)}" stroke-width="1.3" fill="none" d="${planks}"/>`;
    g += K.walker(1460, 826, .82, { dog: true, dx: -220, dy: -24, dur: 46, seed: sd + 42 }) + K.walker(1260, 798, .7, { still: true, seed: sd + 43, flip: true });
    g += `<path fill="#7a6448" d="M1560 806h70v6h-70zM1562 794h66v5h-66z"/><path stroke="#4a3c2c" stroke-width="3" d="M1566 812v12M1624 812v12"/><path fill="#3d5a44" d="M1352 760h44v28h-44z"/><path fill="#e8e2d0" d="M1356 765h36v3h-36zM1356 772h28v2h-28zM1356 777h32v2h-32z" opacity=".8"/><path stroke="#4a3c2c" stroke-width="3" d="M1362 788v24M1386 788v24"/>`;
    g += `<path stroke="#5b4c3a" stroke-width="4" fill="none" d="${posts}"/><path stroke="#6e5c44" stroke-width="5" fill="none" d="M1130 746L1760 748M1130 762L1760 782"/>`;
    g += K.tree(aut ? 'birch' : 'alder', 1560, 890, 1.05, { season, seed: sd + 44, flutter: 10, fall: aut ? 14 : 0, ground: 900, snow: win });
    if (!lo) g += K.wind(K.blades({ seed: sd + 45, x0: 1180, x1: 1760, y0: 850, y1: 910, n: 30, h: 50, season, heads: sum || aut ? .25 : 0 }).concat(K.blades({ seed: sd + 46, x0: 380, x1: 620, y0: 840, y1: 910, n: 14, h: 60, season })), { strips: 6 });
    // air: birds by day, bats and a skein of geese at dusk, insects in summer, the season's particles
    const day = L.dark < .5, dusk = L.dark > .25 && L.dark < .95;
    if (day) g += K.flock({ seed: sd + 50, n: 9, x: -120, y: 260, s: 1.2, dx: 1900, dy: -60, dur: 48, v: true, col: '#2e2a28' }) + K.flock({ seed: sd + 51, n: 6, x: 1700, y: 180, s: .8, dx: -1900, dy: 40, dur: 38, col: win ? '#e8e4dc' : '#2f3d48' });
    if (dusk || !day) g += K.flock({ seed: sd + 52, n: 7, x: 1720, y: 320, s: 1, dx: -1900, dy: -80, dur: 60, v: true, col: '#1e1c22' });
    if (L.dark > .3 && !win) g += K.bats({ seed: sd + 53, n: 5, x: 900, y: 420, spread: 300 });
    if (day && (sum || spr)) g += K.flock({ seed: sd + 54, n: 6, x: 400, y: 470, s: .6, dx: 700, dy: 30, dur: 22, col: '#1f2430' }) + K.dragonfly(720, 720, .9, { dx: 180 }) + K.dragonfly(1080, 690, .7, { col: '#3a6ac0', dx: -140 });
    if (day && sum) g += K.butterfly(1380, 830, .8, { kind: 'peacock', dx: 160, dy: 40 });
    if (aut) g += K.falling({ seed: sd + 60, n: 26, x0: 900, x1: 1760, y0: 300, y1: 700, dy: 380, dx: -200, cols: p.leaf.birch.concat(p.leaf.alder || p.leaf.oak) });
    if (spr) g += K.petals({ seed: sd + 61, n: 18, x0: 0, x1: 900, y0: 400, y1: 760 });
    if (sum) g += K.motes({ seed: sd + 62, n: 30, x0: 200, x1: 1500, y0: 520, y1: 820 });
    if (win) g += K.snow({ seed: sd + 63, n: 30 });
    return s + K.tone(L, g) + K.weather(L) + K.grade(L);
  });

  const place = 'fleet-pond', label = 'Fleet Pond', town = 'Fleet', kind = 'landscape', tags = ['lake', 'reedbed', 'nature reserve'];
  const reasons = {
    spring: 'Grebes displaying on the spring evening lake',
    summer: 'Waterbirds across the evening lake',
    autumn: 'Geese and reed plumes in the autumn dusk',
    winter: 'A frosted shore and the winter sunset',
  };
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const reason = reasons[season];
    add('hampshire', kind, { id: `${place}-4${season !== 'summer' ? '-' + season : ''}`, label, site: `${label} — ${reason}`,
      colour: season === 'winter' ? 'blue' : season === 'autumn' ? 'amber' : 'green', mood: 'dreamy', tags: tags.concat(season),
      ukPlace: place, ukLocality: town, ukTown: town, ukView: 'evening', viewReason: reason,
      ukSeason: season, season: [season], rich: true, liveSky: { lat: 51.29, lon: -0.83 },
      svg: (o = {}) => scene(season, o) });
  }
}
