/* ============================================================
   US FULL-SCREEN SCENES, batch 2 (Northeast cities, Washington DC, Alabama, Arkansas, Florida, Georgia).
   PURE classic script: defines nothing global; it registers entries with usSceneAdd() (71-anim-us.js),
   which usBuilder() uses to upgrade the matching small icons to full-screen openings.
   Each svg() returns the inside of a 1600 x 900 drawing (sliced to fill any screen), layered: a sky and its
   light, far / mid / near layers that drift at different speeds, the landmark, foreground and ambient life.
   Colours are painted for daytime; the dark theme or tod-dusk / tod-night lays the evening grade over them
   (us-tint) and lights the us-lit windows, us-lamps strings and us-star stars. Motion is transform and
   opacity only. Rendered size must stay under 32 KB per scene.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish, star5 } = K;

  /** A grid of window dots (glass by day, lit at dusk): rows from (x,y), w wide, h tall, sx across, sy down. */
  const win = (x, y, w, h, sx, sy, glass) => {
    let d = '';
    for (let yy = y; yy < y + h; yy += sy) d += `M${x} ${yy}h${w}`;
    return dots(d, glass || '#2c3a55', 5, sx, '', ' opacity=".55"') + dots(d, '#ffd27a', 5, sx, 'us-lamps');
  };
  /** A run of filler buildings (flat tops, a few setbacks), optionally with a sparse window grid. */
  const city = (seed, x0, x1, base, hmin, hmax, wmin, wmax, fill, wc) => {
    const r = rnd(seed); let x = x0, o = '', w = '';
    while (x < x1) {
      const bw = wmin + r() * (wmax - wmin), bh = hmin + r() * (hmax - hmin);
      o += `<rect x="${R(x)}" y="${R(base - bh)}" width="${R(bw)}" height="${R(bh)}"/>`;
      if (r() < 0.3) o += `<rect x="${R(x + bw * 0.3)}" y="${R(base - bh - 16 - r() * 16)}" width="${R(bw * 0.4)}" height="${R(24)}"/>`;
      if (wc && r() < wc && bw > 22) w += win(R(x + 6), R(base - bh + 12), R(bw - 12), R(bh - 24), 12, 22);
      x += bw + r() * 4;
    }
    return `<g fill="${fill}">${o}</g>${w}`;
  };
  /** A flag on a pole (x, y = foot), flapping: pole, cloth in a wrapper so the sway pivots at the pole. */
  const flagPole = (x, y, h, col, cloth, dur, del) => `<path d="M${x} ${y}V${y - h}" stroke="${col}" stroke-width="${Math.max(2, R(h / 40))}" fill="none"/>`
    + mv('usflag', { ad: dur + 's', d: del + 's', to: `${x}px ${y - h}px` }, `<path fill="${cloth}" d="M${x} ${y - h}h${R(h * 0.5)}l${-R(h * 0.06)} ${R(h * 0.14)}l${R(h * 0.06)} ${R(h * 0.14)}H${x}z"/>`);
  const snowflakes = (seed, n, smin, smax, dmin, dmax) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) o += `<circle class="x-usfall" style="--ad:${R(dmin + r() * (dmax - dmin))}s;--d:-${R(r() * 14)}s;--dx:${R(-60 + r() * 120)}px" cx="${R(-40 + r() * 1700)}" cy="${R(r() * 260)}" r="${(smin + r() * (smax - smin)).toFixed(1)}" fill="#fff"/>`;
    return `<g opacity=".9">${o}</g>`;
  };

  /* ---------- New York: the bridge and the skyline at golden hour ---------- */
  usSceneAdd({ key: 'place:new-york', label: 'Brooklyn Bridge and the skyline', site: 'Manhattan from the Brooklyn Bridge', colour: 'indigo', mood: 'energetic', season: 'any', tags: ['bridge', 'skyline', 'east river'],
    svg: () => {
      const s1 = U(), w1 = U(), g1 = U(), st = '#5a4a5c', tw = (x) => {
        const o = `M${x - 64} 720V338l16-22h96l16 22V720z M${x - 38} 720V572Q${x - 38} 528 ${x} 500Q${x + 38} 528 ${x + 38} 572V720z M${x - 32} 478V410Q${x - 32} 376 ${x} 352Q${x + 32} 376 ${x + 32} 410V478z`;
        return `<path fill="${st}" fill-rule="evenodd" d="${o}"/><path fill="#7b6676" d="M${x + 20} 338h28l16 22V720H${x + 38}z" opacity=".55"/><path fill="${st}" d="M${x - 70} 316h140v-10H${x - 70}z"/>`;
      };
      let hang = '', stays = '';
      const catX = (t, a, b, c) => R((1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c);
      for (let i = 1; i < 22; i++) { const t = i / 22, x = catX(t, 420, 800, 1180), y = R(2 * (1 - t) * t * 778 + (1 - t) * (1 - t) * 342 + t * t * 342); hang += `M${x} ${y}V640`; }
      for (let i = 1; i < 9; i++) { const t = i / 9, x = catX(t, -160, 150, 420), y = R((1 - t) * (1 - t) * 610 + 2 * (1 - t) * t * 420 + t * t * 342); hang += `M${x} ${y}V650`; const x2 = catX(t, 1180, 1450, 1760), y2 = R((1 - t) * (1 - t) * 342 + 2 * (1 - t) * t * 420 + t * t * 610); hang += `M${x2} ${y2}V650`; }
      for (let k = 1; k <= 8; k++) for (const tx of [420, 1180]) stays += `M${tx} 326L${tx - k * 44} 640M${tx} 326L${tx + k * 44} 640`;
      return `<defs>${lin(s1, [[0, '#59679f'], [0.38, '#b79ac4'], [0.66, '#ffb58f'], [1, '#ffe2a6']])}${lin(w1, [[0, '#d99a86'], [0.18, '#5b6a9a'], [1, '#2a3566']])}${lin(g1, [[0, '#f7d4a0', 0.7], [1, '#f7d4a0', 0]])}</defs>`
        + full(`url(#${s1})`) + stars(7, 30, 220) + rays(930, 560, 1100, '#ffe3b0', 0.1) + sun(930, 560, 54, '#fff6d6', '#ffc27a')
        + streak(260, 150, 300, '#ffc0c0', 0.5) + streak(1260, 240, 260, '#ffa88a', 0.55, 70) + cloud(520, 320, 1.0, '#c98aa8', 0.8, 60, 8, '#ffd3b4') + cloud(1380, 400, 0.8, '#c88aa6', 0.75, 52, 26, '#ffd9bb')
        + birds(3, 4, 1100, 330, '#4a3858', 1.1, 600)
        + mv('uspar', { ad: '38s', dx: '8px' }, city(11, -160, 1760, 612, 60, 190, 30, 70, '#9a8dbd')) + haze(520, 110, '#ffd9b0', 0.5)
        + mv('uspar', { ad: '30s', dx: '14px' },
          city(21, -160, 640, 612, 90, 250, 34, 74, '#7d74a8', 0.3) + city(22, 1000, 1760, 612, 90, 230, 34, 74, '#7d74a8', 0.3)
          // Empire State
          + `<g fill="#7a74a6"><rect x="700" y="480" width="120" height="132"/><rect x="722" y="410" width="76" height="70"/><rect x="738" y="356" width="44" height="54"/><rect x="750" y="326" width="20" height="30"/></g><path fill="#a99ac0" d="M760 480h60v132h-60zM760 410h38v70h-38zM760 356h22v54h-22z" opacity=".6"/><path d="M760 326V232" stroke="#6a6494" stroke-width="5"/><path d="M760 232V190" stroke="#6a6494" stroke-width="2"/>`
          + win(712, 490, 96, 112, 14, 20)
          // Chrysler
          + `<path fill="#6f6aa0" d="M900 612V430h62v182z"/><path fill="#d3cfe6" d="M903 430C903 380 931 358 931 300C931 358 959 380 959 430z"/><path fill="none" stroke="#7d78a8" stroke-width="3" d="M910 424a21 21 0 0 1 42 0M914 400a17 17 0 0 1 34 0M919 380a12 12 0 0 1 24 0"/><path d="M931 300V250" stroke="#d3cfe6" stroke-width="3"/>` + win(908, 442, 46, 160, 12, 20)
          // One WTC
          + `<path fill="#6c6a9e" d="M1352 612V270L1380 190L1408 270V612z"/><path fill="#9b94c2" d="M1380 190L1408 270V612h-28z" opacity=".6"/><path d="M1380 190V90" stroke="#6c6a9e" stroke-width="4"/>` + win(1360, 290, 40, 310, 12, 22))
        + mv('usflicker', { ad: '1.6s', to: '1380px 92px' }, '<circle cx="1380" cy="90" r="6" fill="#ff5a4a"/>') + mv('usflicker', { ad: '2s', d: '-.6s', to: '760px 190px' }, '<circle cx="760" cy="190" r="5" fill="#ff7a5a"/>')
        + `<rect y="610" width="1600" height="290" fill="url(#${w1})"/>` + `<rect y="610" width="1600" height="60" fill="url(#${g1})"/>`
        + shimmer(5, 26, 500, 1300, 620, 740, '#ffe6b0', 70) + shimmer(6, 20, -100, 1700, 700, 880, '#f0b99a', 90)
        + mv('usmove', { ad: '70s', dx: '1900px' }, '<g transform="translate(800 782)"><path fill="#1f2a50" d="M-70 0l14 -20h84l16 12 22 8z"/><rect x="-30" y="-38" width="44" height="20" fill="#3a2f55"/><rect x="-8" y="-52" width="10" height="16" fill="#c0463a"/><path fill="#ffffff" opacity=".45" d="M-70 6q-60 8 -120 4q60 14 120 8z"/></g>' + puffs(792, 730, 4, '#ffe9d0', 10, -40, 3, -50, 3))
        + mv('usmove', { ad: '95s', d: '-30s', dx: '1900px' }, '<g transform="translate(900 840)"><path fill="#1f2a50" d="M-110 0l22 -26h150l24 16 24 10z"/><rect x="-60" y="-44" width="100" height="20" fill="#e9dccb"/>' + win(-52, -38, 84, 8, 14, 10) + '</g>')
        + `<g fill="none" stroke="#3a2a40" stroke-width="3" opacity=".95"><path d="M-160 610Q150 420 420 342Q800 778 1180 342Q1450 420 1760 610"/><path d="M-160 622Q150 436 420 356Q800 790 1180 356Q1450 436 1760 622" opacity=".55"/><path d="${hang}" stroke-width="1.6"/><path d="${stays}" stroke-width="1.5" opacity=".8"/></g>`
        + tw(420) + tw(1180)
        + `<path fill="#3a2a40" d="M-160 640H1760v24H-160z"/><path d="M-160 652H1760" stroke="#6a5568" stroke-width="22" stroke-dasharray="3 15" fill="none" opacity=".8"/>`
        + dots('M-160 636H1760', '#fff1c8', 5, 40, 'us-lamps') + `<path d="M-160 700H1760V900H-160z" fill="#1f2750" opacity=".25"/>`
        + mv('usmove', { ad: '16s', dx: '1900px' }, '<g transform="translate(800 628)"><rect x="-26" y="-12" width="34" height="12" rx="3" fill="#b43a3a"/><rect class="us-lit" x="4" y="-8" width="6" height="4"/></g>')
        + finish(0.34);
    } });

  /* ---------- Buffalo: City Hall in lake-effect snow ---------- */
  usSceneAdd({ key: 'place:buffalo', label: 'City Hall in the lake-effect snow', site: 'City Hall in the lake-effect snow', colour: 'slate', mood: 'cosy', season: ['winter'], tags: ['snow', 'art deco', 'tower'],
    svg: () => {
      const s1 = U(), g1 = U(), f1 = U(), gl = U();
      const stone = '#c9c3b4', shade = '#9d9a96', B = 668;
      let ribs = '', wins = '';
      for (let x = 552; x < 1050; x += 36) { ribs += `M${x} ${B}V548`; wins += lit(x + 8, 570, 12, 70); }
      for (let x = 740; x < 870; x += 26) { ribs += `M${x} 440V250`; wins += lit(x + 6, 270, 8, 120); }
      const tree = (x, y, s) => `<path d="M${x} ${y}V${y - 120 * s}M${x} ${y - 60 * s}l${-34 * s} ${-44 * s}M${x} ${y - 80 * s}l${30 * s} ${-50 * s}M${x} ${y - 104 * s}l${-18 * s} ${-36 * s}M${x} ${y - 112 * s}l${14 * s} ${-30 * s}" stroke="#24283a" stroke-width="${R(6 * s)}" stroke-linecap="round" fill="none"/>`
        + `<path d="M${x - 34 * s} ${y - 104 * s}h${22 * s}M${x + 30 * s} ${y - 130 * s}h${20 * s}" stroke="#eef3fa" stroke-width="${R(4 * s)}" stroke-linecap="round"/>`;
      const lamp = (x, y, s) => `<path d="M${x} ${y}V${y - 160 * s}h${22 * s}" stroke="#262a3c" stroke-width="${R(6 * s)}" fill="none"/><ellipse cx="${x + 22 * s}" cy="${y - 156 * s}" rx="${R(14 * s)}" ry="${R(7 * s)}" fill="#fff0c0" class="us-lit"/>`;
      return `<defs>${lin(s1, [[0, '#2b3558'], [0.45, '#5a6894'], [0.74, '#b19ab4'], [1, '#e9c0a8']])}${lin(g1, [[0, '#e8eef8'], [1, '#aebbd6']])}${radU(f1, [[0, '#ffd890', 0.55], [1, '#ffd890', 0]], 800, 400, 560)}${lin(gl, [[0, '#e8eef8', 0], [1, '#e8eef8', 0.7]])}</defs>`
        + full(`url(#${s1})`) + stars(9, 40, 260) + streak(300, 160, 320, '#cdd5ea', 0.35) + streak(1250, 120, 300, '#c0cae4', 0.3, 70) + streak(850, 250, 360, '#d8c8da', 0.35, 80)
        + cloud(420, 280, 1.2, '#8d9cc2', 0.8, 70, 10, '#bac4de') + cloud(1300, 230, 1.4, '#8b99c0', 0.8, 80, 40, '#b8c2dc')
        + mv('uspar', { ad: '40s', dx: '8px' }, `<path fill="#7e8fb6" d="M-160 560Q200 530 600 545T1300 540T1760 556V700H-160z"/>` + city(31, -160, 560, 640, 40, 120, 30, 60, '#6b7aa2', 0.5) + city(32, 1120, 1760, 640, 40, 120, 30, 60, '#6b7aa2', 0.5)) + haze(520, 140, '#d8e0f0', 0.5)
        + `<rect width="1600" height="900" fill="url(#${f1})"/>`
        // City Hall: wings, base, mid block, shaft, setbacks, lantern and spire
        + `<g fill="${stone}"><rect x="376" y="606" width="160" height="62"/><rect x="1064" y="606" width="160" height="62"/><rect x="540" y="540" width="520" height="128"/><rect x="604" y="440" width="392" height="100"/><rect x="722" y="250" width="156" height="190"/><rect x="744" y="196" width="112" height="54"/><rect x="766" y="150" width="68" height="46"/></g>`
        + `<g fill="${shade}"><rect x="1064" y="606" width="160" height="62" opacity=".35"/><rect x="838" y="250" width="40" height="190" opacity=".55"/><rect x="960" y="440" width="36" height="100" opacity=".4"/><rect x="1024" y="540" width="36" height="128" opacity=".4"/><rect x="826" y="196" width="30" height="54" opacity=".5"/></g>`
        + `<path fill="#e6ddc4" d="M772 150l28-62 28 62z"/><path fill="#b9a574" d="M800 88l28 62h-28z"/><path d="M800 88V54" stroke="#c9b27a" stroke-width="4"/><path d="M718 250h164M740 196h120M762 150h76" stroke="#9d9a96" stroke-width="5"/>`
        + `<path fill="none" stroke="${shade}" stroke-width="5" d="${ribs}"/>` + win(556, 566, 480, 76, 36, 24, '#3a4466') + win(620, 454, 360, 76, 30, 24, '#3a4466') + wins + lit(412, 628, 20, 22) + lit(452, 628, 20, 22) + lit(1128, 628, 20, 22) + lit(1168, 628, 20, 22)
        + `<g fill="#6f6f78"><rect x="780" y="618" width="40" height="50" rx="20"/></g>` + lit(786, 626, 28, 42)
        + `<circle class="us-lit" cx="800" cy="128" r="9"/>`
        + mv('usglow', { ad: '5s', to: '800px 50px' }, '<circle cx="800" cy="52" r="7" fill="#ffe29a"/>')
        // snowy ground, lamps and trees
        + `<path fill="url(#${g1})" d="M-160 900V690C300 660 700 700 1000 676S1500 664 1760 690V900z"/><path fill="#fff" opacity=".75" d="M-160 760C300 730 700 770 1000 748S1500 740 1760 760V900H-160z"/>`
        + `<path fill="#4b5272" d="M-160 800H1760V830H-160z" opacity=".4"/>` + dots('M-160 815H1760', '#fff1c0', 4, 60, 'us-lamps')
        + mv('usmove', { ad: '22s', dx: '1900px' }, '<g transform="translate(800 812)"><rect x="-44" y="-22" width="88" height="22" rx="6" fill="#43486a"/><rect x="-24" y="-36" width="46" height="18" rx="5" fill="#53587a"/><rect class="us-lit" x="36" y="-14" width="10" height="7"/></g>')
        + mv('usmove', { ad: '30s', d: '-12s', dx: '1900px' }, '<g transform="translate(900 828) scale(-1 1)"><rect x="-40" y="-20" width="80" height="20" rx="6" fill="#7a3a46"/><rect x="-22" y="-33" width="42" height="17" rx="5" fill="#8c4a55"/><rect class="us-lit" x="32" y="-13" width="9" height="6"/></g>')
        + lamp(250, 800, 1.1) + lamp(1350, 800, 1.1) + lamp(560, 790, 0.8) + lamp(1060, 790, 0.8)
        + tree(130, 860, 1.5) + tree(1480, 870, 1.7) + tree(330, 760, 0.9) + tree(1260, 760, 0.9)
        + snowflakes(41, 44, 2, 4.5, 8, 16) + snowflakes(42, 18, 5, 8, 6, 11)
        + `<rect width="1600" height="900" fill="#dce6f6" opacity=".12"/>`
        + finish(0.3);
    } });

  /* ---------- Philadelphia: City Hall at the end of the Parkway ---------- */
  usSceneAdd({ key: 'place:philadelphia', label: 'City Hall and the Parkway flags', site: 'City Hall, down the Parkway', colour: 'blue', mood: 'proud', season: 'any', tags: ['city hall', 'parkway', 'flags', 'fountain'],
    svg: () => {
      const s1 = U(), r1 = U(), gr = U();
      const stone = '#d6c9b4', warm = '#bba98f', roof = '#4f7570';
      let flags = '', trees = '';
      const cols = ['#c8342f', '#2f5fb5', '#e0b030', '#2f8f5a', '#7a3a9a', '#e07a2a'];
      for (let i = 0; i < 7; i++) {
        const t = Math.pow(i / 6, 1.7), y = R(668 + t * 250), dx = R(66 + t * 690), h = R(26 + t * 190);
        flags += flagPole(800 - dx, y, h, '#4a4a58', cols[i % 6], R(2 + i * 0.3), -i * 0.4) + flagPole(800 + dx, y, h, '#4a4a58', cols[(i + 3) % 6], R(2 + i * 0.4), -i * 0.7);
        trees += `<circle cx="${800 - dx - R(40 + t * 100)}" cy="${y - R(h * 1.05)}" r="${R(22 + t * 110)}" fill="#3f8a4a"/><circle cx="${800 + dx + R(40 + t * 100)}" cy="${y - R(h * 1.05)}" r="${R(22 + t * 110)}" fill="#3f8a4a"/>`;
      }
      return `<defs>${lin(s1, [[0, '#3f87d6'], [0.55, '#8dc2ee'], [1, '#dcefff']])}${linU(r1, [[0, '#8a8f9c'], [1, '#6a7080']], 0, 668, 0, 900)}${lin(gr, [[0, '#7dbb62'], [1, '#4a8a3e']])}</defs>`
        + full(`url(#${s1})`) + rays(260, 150, 900, '#fff', 0.1) + sun(260, 150, 40, '#fffbea', '#fff0b8')
        + cloud(420, 260, 1.4, '#c9ddf0', 0.95, 60, 6) + cloud(1230, 190, 1.2, '#cfe2f4', 0.95, 54, 28) + cloud(900, 120, 0.8, '#d8e8f6', 0.9, 48, 14) + streak(1380, 330, 260, '#fff', 0.55)
        + birds(8, 5, 1000, 280, '#3b4560', 1, 600)
        + mv('uspar', { ad: '38s', dx: '8px' }, city(51, -160, 700, 668, 80, 230, 34, 70, '#9bb4cc', 0.3) + city(52, 900, 1760, 668, 80, 220, 34, 70, '#9bb4cc', 0.3)
          // twin towers and the blue glass tower behind
          + `<g fill="#8fa6c2"><rect x="540" y="330" width="62" height="338"/><path d="M540 330l31-40 31 40z"/><rect x="1004" y="290" width="58" height="378"/><path d="M1004 290h58l-14-34h-30z"/></g><path fill="#5d88b8" d="M1118 668V300l50-26v394z"/><path fill="#8bb3dc" d="M1118 300l50-26v394h-20V320z" opacity=".5"/>` + win(1128, 316, 30, 340, 12, 22))
        + haze(600, 90, '#e6f0fa', 0.5)
        // the building
        + `<g fill="${stone}"><rect x="560" y="520" width="480" height="148"/><rect x="700" y="400" width="200" height="120"/><rect x="728" y="318" width="144" height="82"/><rect x="752" y="262" width="96" height="56"/></g>`
        + `<g fill="${warm}"><rect x="900" y="400" width="30" height="120" opacity=".5"/><rect x="1010" y="520" width="30" height="148" opacity=".4"/><rect x="842" y="262" width="26" height="56" opacity=".5"/></g>`
        + `<g fill="${roof}"><path d="M552 520l20-34h56l20 34z"/><path d="M980 520l20-34h56l20 34z" transform="translate(-60 0)"/><path d="M700 400l14-40h172l14 40z"/><path d="M728 318l14-34h116l14 34z"/></g>`
        + `<path fill="${stone}" d="M760 262V212Q800 160 840 212V262z"/><path fill="${roof}" d="M770 212Q800 150 830 212z"/><path fill="${warm}" d="M800 150V132" stroke="#c9a24a" stroke-width="5"/>`
        + `<path fill="#a8864a" d="M790 132h20l-4-26h-12z"/><circle cx="800" cy="98" r="9" fill="#a8864a"/><path d="M800 108v24M788 112l12-4 12 4" stroke="#a8864a" stroke-width="6" fill="none"/>`
        + `<circle cx="800" cy="354" r="26" fill="#fbf6e6" stroke="#8a7a5a" stroke-width="4"/><path d="M800 354V336M800 354l12 6" stroke="#2a2a3a" stroke-width="3"/>`
        + win(576, 536, 440, 124, 22, 24, '#3a4a6a') + win(716, 416, 168, 92, 22, 24, '#3a4a6a') + win(744, 330, 112, 60, 22, 22, '#3a4a6a') + win(768, 270, 64, 40, 22, 22, '#3a4a6a')
        + `<rect x="772" y="620" width="56" height="48" rx="28" fill="#4a5568"/><rect class="us-lit" x="780" y="632" width="40" height="36" rx="20"/>`
        // Parkway: road, plaza fountain and flag rows
        + `<path fill="url(#${gr})" d="M-160 668H1760V900H-160z"/><path fill="url(#${r1})" d="M752 668H848L1500 900H100z"/><path d="M800 668L800 900" stroke="#e8e8d8" stroke-width="3" stroke-dasharray="14 22" opacity=".7" fill="none"/>`
        + trees + flags
        + `<ellipse cx="800" cy="852" rx="170" ry="34" fill="#9fb4c8"/><ellipse cx="800" cy="846" rx="150" ry="26" fill="#6fa6d2"/>` + shimmer(61, 10, 680, 920, 836, 864, '#fff', 40)
        + `<path fill="#c8c0b0" d="M776 840h48v-30l-12-12h-24z"/>` + puffs(800, 800, 7, '#f4fbff', 14, -50, 2.8, -90, 3) + puffs(800, 800, 7, '#e0f0fa', 12, 50, 3.1, -80, 3) + puffs(800, 800, 6, '#ffffff', 12, 0, 2.5, -110, 2.5)
        + mv('usbob', { ad: '2.4s', dy: '3px' }, `<g fill="#6a6a78"><ellipse cx="520" cy="880" rx="9" ry="6"/><circle cx="530" cy="874" r="4"/><ellipse cx="1090" cy="884" rx="9" ry="6"/><circle cx="1099" cy="878" r="4"/></g>`)
        + finish(0.3);
    } });

  /* ---------- Pittsburgh: the Golden Triangle and the incline at blue hour ---------- */
  usSceneAdd({ key: 'place:pittsburgh', label: 'The yellow bridges and the incline', site: 'The Golden Triangle from Mount Washington', colour: 'amber', mood: 'focused', season: 'any', tags: ['bridges', 'incline', 'rivers', 'skyline'],
    svg: () => {
      const s1 = U(), w1 = U(), h1 = U();
      const gold = '#f0b31c';
      const catenary = (xa, ya, xb, yb, sag, n) => { let o = ''; for (let i = 1; i < n; i++) { const t = i / n, x = R(xa + (xb - xa) * t), yc = ya + (yb - ya) * t + sag * 4 * t * (1 - t); o += `M${x} ${R(yc)}V612`; } return o; };
      const tower = (x) => `<path fill="${gold}" d="M${x - 24} 620V404h10v50h28v-50h10V620h-10V470h-28V620z"/><path fill="none" stroke="#b8860c" stroke-width="3" d="M${x - 14} 454h28"/>`;
      return `<defs>${lin(s1, [[0, '#2b4a78'], [0.4, '#6d7cae'], [0.7, '#e9a98a'], [1, '#ffd89a']])}${lin(w1, [[0, '#e0a47a'], [0.2, '#4a6a92'], [1, '#1f3050']])}${lin(h1, [[0, '#2a4a3a'], [1, '#14281f']])}</defs>`
        + full(`url(#${s1})`) + stars(14, 28, 200) + sun(1250, 520, 48, '#fff2cc', '#ffbf7a') + streak(300, 170, 320, '#ffc8b0', 0.4) + streak(1100, 120, 300, '#f0b0b0', 0.4, 70)
        + cloud(900, 280, 1.2, '#b58aa8', 0.7, 66, 8, '#f6c8b4') + cloud(260, 360, 0.9, '#b085a6', 0.7, 58, 30, '#f2c3b2') + birds(17, 4, 800, 300, '#3a3050', 1, 560)
        + mv('uspar', { ad: '40s', dx: '8px' }, ridge('#6f7ea6', 520, 40, 8, 71, 600))
        + mv('uspar', { ad: '34s', dx: '12px' }, city(73, 200, 1000, 598, 60, 150, 30, 60, '#4d5e8a', 0.4)
          // skyline: a glass castle, a dark triangular tower, stepped crowns
          + `<g fill="#3d4f7c"><rect x="420" y="360" width="76" height="238"/><path d="M420 360l38-52 38 52z"/><path d="M458 308V270" stroke="#3d4f7c" stroke-width="4"/><rect x="560" y="300" width="96" height="298"/><path d="M560 300l48-32 48 32z"/><rect x="730" y="400" width="110" height="198"/><rect x="750" y="370" width="70" height="30"/><rect x="900" y="330" width="70" height="268"/><path d="M900 330h70l-12-28h-46z"/></g><path fill="#6f82b0" d="M608 268l48 32v298h-48z" opacity=".5"/>`
          + `<path fill="#2a3a64" d="M360 598L520 232L680 598z" opacity="0"/>`
          + win(430, 372, 56, 218, 12, 22) + win(570, 312, 76, 280, 12, 22) + win(740, 412, 90, 180, 12, 22) + win(908, 344, 54, 246, 12, 22))
        + haze(560, 90, '#ffd8b0', 0.55)
        + `<rect y="598" width="1600" height="302" fill="url(#${w1})"/>` + shimmer(81, 24, 700, 1500, 604, 760, '#ffd9a0', 80) + shimmer(82, 16, -100, 1700, 700, 880, '#9db6d8', 100)
        // yellow suspension bridge
        + `<g fill="none" stroke="${gold}" stroke-width="4"><path d="M-160 624L560 410Q860 700 1160 410L1760 620"/><path d="${catenary(560, 410, 1160, 410, 145, 24)}" stroke-width="2"/></g>`
        + tower(560) + tower(1160)
        + `<path fill="${gold}" d="M-160 614H1760v14H-160z"/><path d="M-160 634H1760" stroke="#b8860c" stroke-width="14" stroke-dasharray="3 12" fill="none"/>`
        + dots('M-160 608H1760', '#fff1c8', 5, 36, 'us-lamps')
        + mv('usmove', { ad: '80s', dx: '1900px' }, '<g transform="translate(800 790)"><path fill="#1a2440" d="M-120 0l16-22h190l16 22z"/><rect x="-80" y="-38" width="34" height="16" fill="#8a3a2a"/><rect x="-30" y="-38" width="34" height="16" fill="#3a5a8a"/><rect x="20" y="-38" width="34" height="16" fill="#8a3a2a"/><path fill="#fff" opacity=".4" d="M-120 6q-70 8-140 4q70 14 140 8z"/></g>')
        + streak(500, 700, 340, '#e8eef8', 0.28, 90) + streak(1250, 820, 300, '#e8eef8', 0.25, 70)
        // Mount Washington hillside with the incline
        + `<g>${mv('uspar', { ad: '36s', dx: '10px' }, `<path fill="url(#${h1})" d="M-160 900V470C60 480 240 520 420 640S700 820 1000 900z"/>`)}</g>`
        + `<g fill="#1f4130">${[[-60, 560, 60], [60, 520, 52], [170, 560, 46], [262, 606, 44], [346, 660, 46], [430, 722, 50], [520, 790, 56], [612, 850, 60]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g><g fill="#2a5238">${[[20, 600, 40], [130, 650, 44], [220, 700, 48], [320, 770, 52], [420, 840, 56]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`
        + `<path d="M100 520L520 830" stroke="#14202a" stroke-width="8" fill="none"/><path d="M82 540L502 850" stroke="#14202a" stroke-width="6" fill="none"/>`
        + `<g transform="rotate(36 300 680)">` + mv('usmove', { ad: '16s', dx: '300px' }, '<g transform="translate(300 664)"><path fill="#8a2a2a" d="M-44 0h88v-34l-12-10h-64l-12 10z"/><rect x="-36" y="-30" width="72" height="14" fill="#2f3f60" opacity=".7"/><path d="M-50 0h100" stroke="#14202a" stroke-width="5"/></g>') + `</g>`
        + `<path fill="#1a2a3a" d="M64 470h76v-44l-38-26l-38 26z"/>` + lit(86, 440, 14, 16) + lit(106, 440, 14, 16) + `<path d="M102 400V380" stroke="#14202a" stroke-width="4"/>`
        + puffs(90, 380, 4, '#e8e4f0', 14, 60, 5, -80, 3)
        + `<g fill="#102418">${[[-40, 800, 90], [90, 840, 80], [210, 870, 70], [320, 890, 60]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`
        + finish(0.3);
    } });

  /* ---------- Boston: Back Bay, the Charles and an autumn regatta ---------- */
  usSceneAdd({ key: 'place:boston', label: 'Back Bay, the Charles and autumn sails', site: 'The Charles River in autumn', colour: 'blue', mood: 'calm', season: ['autumn'], tags: ['skyline', 'sailboat', 'river', 'autumn'],
    svg: () => {
      const s1 = U(), w1 = U(), gl = U();
      const sail = (x, y, s, tone, dur, del) => mv('usmove', { ad: dur + 's', d: -del + 's', dx: R(240 + s * 60) + 'px' }, mv('usbob', { ad: (2.6 + s).toFixed(1) + 's', dy: '2px' },
        `<g transform="translate(${x} ${y}) scale(${s})"><path fill="#2f3a56" d="M-70 0h140l-18 18h-100z"/><path d="M0 0V-190" stroke="#d9d2c4" stroke-width="4"/><path fill="${tone}" d="M6 -184Q74 -90 70 -8H6z"/><path fill="#f2ece0" d="M-6 -160Q-52 -80 -62 -8H-6z"/></g><ellipse cx="${x}" cy="${y + 30 * s}" rx="${R(70 * s)}" ry="${R(5 * s)}" fill="#d8ecff" opacity=".35"/>`));
      const leaves = (seed, n, cols) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) { const cx = R(r() * 1600), cy = R(r() * 280); o += `<g transform="rotate(${R(r() * 180)} ${cx} ${cy})"><ellipse class="x-usfall" style="--ad:${R(9 + r() * 8)}s;--d:-${R(r() * 14)}s;--dx:${R(-120 + r() * 200)}px" cx="${cx}" cy="${cy}" rx="7" ry="4" fill="${cols[i % cols.length]}"/></g>`; } return o; };
      const bank = (seed, x0, x1, y, hmin, hmax) => { const r = rnd(seed); let o = '', x = x0; while (x < x1) { const rr = hmin + r() * (hmax - hmin), c = ['#c8452b', '#e58a2a', '#d9a62e', '#a6361f', '#e9b23f', '#6f8a3a'][R(r() * 5.4)]; o += `<circle cx="${R(x)}" cy="${R(y - rr * 0.6 + r() * 8)}" r="${R(rr)}" fill="${c}"/>`; x += rr * 1.1; } return o; };
      return `<defs>${lin(s1, [[0, '#5a9ad8'], [0.55, '#a9d0ee'], [1, '#fbe6c4']])}${lin(w1, [[0, '#9cc0dc'], [0.15, '#4d7ca8'], [1, '#1f4468']])}${lin(gl, [[0, '#7fb2de'], [0.5, '#4f86bc'], [1, '#3a6a9c']])}</defs>`
        + full(`url(#${s1})`) + rays(1300, 150, 900, '#fff', 0.1) + sun(1300, 150, 36, '#fffbea', '#ffeab0')
        + cloud(380, 230, 1.2, '#d6e4f0', 0.95, 60, 6) + cloud(1000, 150, 1.0, '#dfeaf4', 0.92, 52, 24) + streak(250, 380, 300, '#fff', 0.5) + birds(21, 6, 700, 300, '#34425e', 1.1, 600)
        + mv('uspar', { ad: '38s', dx: '8px' }, city(101, -160, 520, 574, 30, 90, 30, 56, '#9db4c6') + city(102, 1160, 1760, 574, 30, 90, 30, 56, '#9db4c6')
          // Hancock slab, the Prudential and its spire
          + `<path fill="url(#${gl})" d="M690 574V258l26-8h130l22 8V574z"/><path fill="#d7ecfa" d="M716 250h130l22 8-26 14H716z" opacity=".6"/><path d="M780 250V574M716 250L690 574" stroke="#3f6a94" stroke-width="3" opacity=".5"/>`
          + `<rect x="946" y="360" width="86" height="214" fill="#8fa3b8"/><rect x="960" y="318" width="58" height="42" fill="#8fa3b8"/><rect x="972" y="288" width="34" height="30" fill="#8fa3b8"/><path d="M989 288V230" stroke="#8fa3b8" stroke-width="5"/>` + win(954, 372, 70, 190, 12, 20, '#4a6280')
          + `<rect x="536" y="440" width="110" height="134" fill="#a8786a"/><rect x="1060" y="430" width="90" height="144" fill="#9a6a5e"/>` + win(546, 452, 90, 112, 14, 20, '#4a4458') + win(1070, 442, 70, 122, 14, 20, '#4a4458'))
        + mv('usflicker', { ad: '1.8s', to: '989px 230px' }, '<circle cx="989" cy="228" r="5" fill="#ff5a4a"/>')
        + haze(530, 70, '#fff3dc', 0.5)
        // the shore of autumn trees
        + mv('uspar', { ad: '32s', dx: '10px' }, `<path fill="#6a5a3a" d="M-160 574H1760V610H-160z"/><g>${bank(111, -160, 1760, 590, 24, 44)}</g>`)
        + `<rect y="600" width="1600" height="300" fill="url(#${w1})"/>`
        + `<g opacity=".34" transform="translate(0 1180) scale(1 -1)"><rect x="690" y="574" width="176" height="316" fill="#8fc0e8"/><rect x="946" y="574" width="86" height="214" fill="#8fa3b8"/></g>`
        + `<g opacity=".4">${bank(112, 100, 1500, 640, 18, 30)}</g>`
        + shimmer(121, 26, 200, 1400, 620, 780, '#e8f4ff', 70) + shimmer(122, 20, -100, 1700, 760, 890, '#9cc6e8', 100)
        + sail(380, 690, 1.0, '#e7b53a', 70, 5) + sail(1180, 700, 0.75, '#c8452b', 90, 40) + sail(820, 770, 1.35, '#2f6fb0', 110, 20)
        // a rowing eight
        + mv('usmove', { ad: '60s', d: '-20s', dx: '2000px' }, '<g transform="translate(800 860)"><path fill="#f0e4cc" d="M-150 0q150 -12 300 0q-150 10 -300 0z"/>' + [-110, -70, -30, 10, 50, 90].map(x => `<circle cx="${x}" cy="-9" r="5" fill="#c8452b"/><path d="M${x} -6l-10 14M${x} -6l10 14" stroke="#4a3a2a" stroke-width="2"/>`).join('') + '</g>')
        // foreground branches heavy with leaves, top corners
        + `<path d="M-160 120C100 140 260 100 470 20M-160 280C60 240 180 180 300 110M1760 100C1500 130 1340 90 1160 10M1760 260C1560 230 1440 170 1330 100" stroke="#3a2a22" stroke-width="12" fill="none" stroke-linecap="round"/>`
        + mv('ussway2', { ad: '8s', to: '-100px 0px' }, `<g>${bank(131, -140, 480, 110, 40, 70)}${bank(132, -100, 300, 250, 30, 50)}</g>`) + mv('ussway2', { ad: '9s', d: '-3s', to: '1700px 0px' }, `<g>${bank(133, 1180, 1740, 100, 40, 70)}${bank(134, 1320, 1740, 240, 30, 50)}</g>`)
        + leaves(141, 24, ['#d9552a', '#e9a02e', '#b8361f', '#e6c13a'])
        + finish(0.3);
    } });

  /* ---------- Baltimore: Fort McHenry at dawn's early light ---------- */
  usSceneAdd({ key: 'place:baltimore', label: 'Fort McHenry at dawn\'s early light', site: 'Fort McHenry, dawn\'s early light', colour: 'red', mood: 'proud', season: 'any', tags: ['flag', 'harbour', 'fort', 'ships', 'rockets'],
    svg: () => {
      const s1 = U(), w1 = U(), g1 = U(), fl = U();
      const ship = (x, y, s, dur, del) => mv('usmove', { ad: dur + 's', d: -del + 's', dx: '120px' }, mv('usbob', { ad: (3.4 + s).toFixed(1) + 's', dy: '3px' },
        `<g transform="translate(${x} ${y}) scale(${s})"><path fill="#1b1d3a" d="M-130 0l14 28h232l14-28z"/><path d="M-60 0V-170M10 0V-210M80 0V-160" stroke="#1b1d3a" stroke-width="5"/><path fill="#2a2b50" d="M-90 -10Q-60 -80 -30 -150L-30 -20zM-24 -14Q10 -90 40 -190L40 -20zM46 -12Q70 -70 110 -140L110 -20z"/><path fill="#ffb060" class="us-lit" d="M-20 12h8v6h-8zM20 12h8v6h-8zM60 12h8v6h-8z"/></g>`));
      const rocket = (x, y, dur, del, dx, dy) => { const a = Math.atan2(dy, dx) * 180 / Math.PI; return mv('usglide', { ad: dur + 's', d: -del + 's', dx: dx + 'px', dy: dy + 'px' }, `<g transform="translate(${x} ${y}) rotate(${R(a)})"><path d="M-70 0H0" stroke="#ffb066" stroke-width="3" stroke-linecap="round" opacity=".7"/><circle r="6" fill="#fff2b8"/><circle r="12" fill="#ff7a3a" opacity=".5"/></g>`); };
      let stripes = '';
      for (let i = 0; i < 13; i++) stripes += `<rect x="0" y="${i * 14}" width="270" height="14" fill="${i % 2 ? '#f6efe0' : '#c63a3a'}"/>`;
      let cstars = '';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) cstars += `<circle cx="${14 + j * 30}" cy="${12 + i * 22}" r="3.4" fill="#fff"/>`;
      return `<defs>${lin(s1, [[0, '#1f2658'], [0.3, '#5a3f7e'], [0.52, '#c4506a'], [0.72, '#f4885a'], [1, '#ffd08a']])}${lin(w1, [[0, '#f0905e'], [0.12, '#7a4a78'], [1, '#1c2250']])}${lin(g1, [[0, '#4c4a3a'], [1, '#1f2428']])}${lin(fl, [[0, '#fff', 0.1], [0.5, '#000', 0.12], [1, '#fff', 0.1]])}</defs>`
        + full(`url(#${s1})`) + stars(31, 60, 300) + sun(1050, 560, 52, '#fff0c8', '#ffa860', true) + streak(300, 230, 300, '#ff9a90', 0.45) + streak(1200, 330, 330, '#ffb08a', 0.5, 70) + cloud(520, 360, 1.0, '#a4507a', 0.7, 66, 8, '#ffa882') + cloud(1380, 250, 0.9, '#8a4c86', 0.65, 58, 30, '#e88a80')
        + birds(33, 4, 1100, 330, '#2a1e3a', 1, 520)
        + mv('uspar', { ad: '40s', dx: '8px' }, `<path fill="#6a3f6e" d="M-160 600Q200 580 600 592T1200 586T1760 596V640H-160z"/>` + city(121, 1180, 1760, 610, 20, 60, 20, 40, '#5a3a68'))
        + `<rect y="590" width="1600" height="310" fill="url(#${w1})"/>` + shimmer(125, 30, 600, 1500, 600, 760, '#ffc890', 80) + shimmer(126, 20, -100, 1700, 740, 890, '#d27a86', 100)
        + ship(1000, 600, 1.0, 90, 10) + ship(1300, 612, 0.8, 110, 40) + ship(1500, 620, 0.55, 130, 70)
        + rocket(960, 560, 5, 0, 150, -330) + rocket(1250, 570, 6, 2, 190, -290) + rocket(1130, 575, 7, 4, 90, -380) + rocket(1450, 590, 6.5, 1, 160, -260)
        + `<g class="us-lit" fill="#ffd08a">${puffs(1010, 600, 4, '#ffcf9a', 22, -80, 3.2, -30, 3)}</g>` + puffs(1330, 610, 4, '#f2c6a8', 18, -60, 3.6, -30, 3)
        // the fort: low star-shaped brick walls
        + `<path fill="url(#${g1})" d="M-160 900V700C100 690 300 660 420 652H900C1020 664 1180 690 1760 704V900z"/>`
        + `<path fill="#74403a" d="M60 650L180 612H700L860 650V700H60z"/><path fill="#8d5246" d="M180 612H700L740 650H140z"/><path fill="#4d2a2c" d="M60 650H860V700H60z" opacity=".5"/>`
        + `<path d="M170 612V596h24v16M300 612V596h24v16M430 612V596h24v16M560 612V596h24v16M690 612V596h24v16" fill="#8d5246" stroke="#8d5246" stroke-width="6"/>`
        + `<g fill="#1f1b2c"><path d="M250 650l26-8 14 8z"/><path d="M370 650l26-8 14 8z"/><path d="M510 650l26-8 14 8z"/><path d="M640 650l26-8 14 8z"/></g>`
        + `<g stroke="#4d2a2c" stroke-width="3" fill="none" opacity=".6"><path d="M80 664H840M80 678H840M150 700V650M260 700V650M380 700V650M500 700V650M620 700V650M740 700V650"/></g>`
        // the flag on its pole, flying huge
        + `<path d="M520 650V150" stroke="#2a2030" stroke-width="9"/><circle cx="520" cy="146" r="9" fill="#d9b04a"/>`
        + mv('usflag', { ad: '2.6s', to: '524px 170px' }, `<g transform="translate(524 170)"><rect width="270" height="182" fill="#fff"/>${stripes}<rect width="124" height="98" fill="#2a3a8a"/>${cstars}<rect width="270" height="182" fill="url(#${fl})"/></g>`)
        + `<path fill="#1c1630" d="M-160 900V810C200 790 500 820 800 806S1400 790 1760 812V900z"/>`
        + finish(0.3);
    } });

  /* ---------- Washington, DC: the Monument and the cherry blossoms ---------- */
  usSceneAdd({ key: 'place:washington', label: 'Washington Monument and cherry blossoms', site: 'The Monument, from the Tidal Basin', colour: 'pink', mood: 'proud', season: ['spring'], tags: ['monument', 'cherry blossom', 'tidal basin', 'memorial'],
    svg: () => {
      const s1 = U(), w1 = U(), ob = U();
      const petals = (seed, n) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) { const cx = R(r() * 1600), cy = R(r() * 300); o += `<g transform="rotate(${R(r() * 180)} ${cx} ${cy})"><ellipse class="x-usfall" style="--ad:${R(8 + r() * 8)}s;--d:-${R(r() * 14)}s;--dx:${R(-100 + r() * 200)}px" cx="${cx}" cy="${cy}" rx="6" ry="3.4" fill="${i % 3 ? '#ffd1e0' : '#fff'}"/></g>`; } return o; };
      const bloom = (seed, x0, x1, y, rmin, rmax, rows) => { const r = rnd(seed); let o = ''; const cols = ['#f9b8cf', '#ffd6e4', '#f39ab9', '#ffe6ee', '#fbc4d6']; for (let k = 0; k < rows; k++) for (let x = x0; x < x1; x += rmin) { const rr = rmin + r() * (rmax - rmin); o += `<circle cx="${R(x + r() * 30)}" cy="${R(y + k * 40 + r() * 40)}" r="${R(rr)}" fill="${cols[R(r() * 4.4)]}"/>`; } return o; };
      const jeff = (x, y) => `<g fill="#f2ede0"><rect x="${x - 110}" y="${y - 40}" width="220" height="40"/><path d="M${x - 80} ${y - 40}Q${x} ${y - 140} ${x + 80} ${y - 40}z"/><path d="M${x - 124} ${y - 40}h248l-124 -26z" fill="#e4dccb"/></g><path d="M${x - 100} ${y - 38}V${y}M${x - 76} ${y - 38}V${y}M${x - 52} ${y - 38}V${y}M${x - 28} ${y - 38}V${y}M${x - 4} ${y - 38}V${y}M${x + 20} ${y - 38}V${y}M${x + 44} ${y - 38}V${y}M${x + 68} ${y - 38}V${y}M${x + 92} ${y - 38}V${y}" stroke="#b8ad98" stroke-width="5"/><path d="M${x} ${y - 130}v-14" stroke="#d9d0bd" stroke-width="3"/>`;
      return `<defs>${lin(s1, [[0, '#6fa6e0'], [0.5, '#b9d8f2'], [0.85, '#fde8e8'], [1, '#ffe9d0']])}${lin(w1, [[0, '#e6cfd8'], [0.12, '#8fb4d4'], [1, '#4a7aa8']])}${linU(ob, [[0, '#fbf8f0'], [0.5, '#ece6d8'], [1, '#d3cab8']], 780, 0, 870, 0)}</defs>`
        + full(`url(#${s1})`) + rays(1180, 130, 900, '#fff', 0.12) + sun(1180, 130, 36, '#fffdf0', '#ffeec8') + cloud(380, 220, 1.2, '#e8eef8', 0.95, 58, 6) + cloud(1300, 320, 1.0, '#f4eaf0', 0.9, 54, 28) + streak(900, 120, 300, '#fff', 0.55) + birds(41, 5, 520, 250, '#3a4560', 1.0, 560)
        + mv('uspar', { ad: '38s', dx: '8px' }, ridge('#a9c2a8', 560, 20, 8, 151, 600) + jeff(330, 574))
        + `<g opacity=".95">${mv('uspar', { ad: '30s', dx: '12px' }, canopy('#7fae6a', 560, 18, 152, -160, 1760, 600))}</g>`
        // the obelisk
        + `<path fill="url(#${ob})" d="M792 590L806 140L825 100L844 140L858 590z"/><path fill="#cbc2b0" d="M825 100L844 140L858 590H825z" opacity=".55"/><path fill="none" stroke="#c8bfae" stroke-width="2" d="M796 450H854M800 330H850M804 230H846"/><path fill="#ede6d6" d="M806 140L825 100L844 140z"/>`
        + mv('usflicker', { ad: '1.7s', to: '825px 108px' }, '<circle cx="825" cy="106" r="6" fill="#ff5a4a"/>') + mv('usflicker', { ad: '1.7s', d: '-.8s', to: '825px 150px' }, '<circle cx="825" cy="150" r="4" fill="#ff5a4a"/>')
        + `<path fill="#9a9482" d="M740 600h170l-10-14h-150z"/>` + [0, 1, 2, 3, 4, 5].map(i => flagPole(742 + i * 28, 592, 30, '#6a6a76', ['#c63a3a', '#2f5fb5', '#fff', '#c63a3a', '#2f5fb5', '#fff'][i], 2 + i * 0.3, -i * 0.4)).join('')
        + `<rect y="598" width="1600" height="302" fill="url(#${w1})"/>`
        + `<g opacity=".3" transform="translate(0 1190) scale(1 -1)"><path fill="#f2ede0" d="M792 590L806 140L825 100L844 140L858 590z"/></g>` + `<g opacity=".35" transform="translate(0 1200) scale(1 -1)">${jeff(330, 600)}</g>`
        + shimmer(161, 28, 150, 1450, 610, 780, '#fff', 70) + shimmer(162, 20, -100, 1700, 760, 890, '#bcd8ee', 100)
        + `<path fill="#6c9a58" d="M-160 640Q200 620 420 640T820 632T1200 640T1760 626V660H-160z" opacity=".7"/>`
        // two swan paddleboats
        + mv('usmove', { ad: '80s', dx: '900px' }, mv('usbob', { ad: '3s', dy: '2px' }, `<g transform="translate(700 770)"><path fill="#fff" d="M-40 0h80l-10 16h-60z"/><path fill="#fff" d="M30 -6q10-30 22-16q8 10-6 16z"/><circle cx="48" cy="-26" r="7" fill="#fff"/><path d="M54 -26l12 3" stroke="#f0a030" stroke-width="3"/></g>`))
        + mv('usmove', { ad: '110s', d: '-40s', dx: '1000px' }, mv('usbob', { ad: '3.4s', dy: '2px' }, `<g transform="translate(1000 830) scale(1.3)"><path fill="#fff" d="M-40 0h80l-10 16h-60z"/><path fill="#fff" d="M30 -6q10-30 22-16q8 10-6 16z"/><circle cx="48" cy="-26" r="7" fill="#fff"/><path d="M54 -26l12 3" stroke="#f0a030" stroke-width="3"/></g>`))
        // foreground blossom canopies and boughs
        + `<path d="M-160 210C60 190 200 130 340 40M1760 190C1540 170 1400 120 1250 30M-160 420C40 380 150 330 260 250" stroke="#4a3236" stroke-width="12" fill="none" stroke-linecap="round"/>`
        + mv('ussway2', { ad: '8s', to: '-100px 0px' }, bloom(171, -160, 480, 30, 38, 66, 4)) + mv('ussway2', { ad: '9s', d: '-3s', to: '1700px 0px' }, bloom(172, 1160, 1760, 20, 38, 66, 4))
        + `<path fill="#4a3236" d="M-160 900V850Q300 820 800 860T1760 850V900z"/>` + petals(181, 26)
        + finish(0.3);
    } });

  /* ---------- Alabama: the steel arch bridge at dawn ---------- */
  usSceneAdd({ key: 'state:AL', label: 'The arch bridge at dawn', site: 'The Edmund Pettus Bridge at dawn', colour: 'amber', mood: 'proud', season: 'any', tags: ['bridge', 'river', 'dawn', 'history'],
    svg: () => {
      const s1 = U(), w1 = U(), m1 = U();
      const arch = (t) => ({ x: R(160 + 1280 * t), y: R(0.25 * 520 * 2 * (1 - t) * (1 - t) + 2 * (1 - t) * t * 180 + t * t * 520) });
      let posts = '', diag = '';
      for (let i = 1; i < 22; i++) { const t = i / 22, p = arch(t); posts += `M${p.x} ${p.y}V520`; if (i < 21) { const q = arch((i + 1) / 22); diag += `M${p.x} ${p.y}L${q.x} 520M${p.x} 520L${q.x} ${q.y}`; } }
      const oak = (x, y, s, seed) => {
        const r = rnd(seed); let c = '', m = '';
        for (let i = 0; i < 9; i++) c += `<circle cx="${R(x - 150 * s + i * 40 * s + r() * 20)}" cy="${R(y - 200 * s - Math.sin(i / 8 * Math.PI) * 50 * s + r() * 20)}" r="${R((50 + r() * 30) * s)}"/>`;
        for (let i = 0; i < 16; i++) { const mx = R(x - 160 * s + r() * 320 * s), my = R(y - 190 * s + r() * 40 * s); m += `M${mx} ${my}q${R(r() * 8 - 4)} ${R(30 + r() * 50)} ${R(r() * 6 - 3)} ${R(70 + r() * 60)}`; }
        return `<path fill="#2c2a2a" d="M${R(x - 16 * s)} ${y}C${R(x - 8 * s)} ${R(y - 80 * s)} ${R(x - 40 * s)} ${R(y - 130 * s)} ${R(x - 90 * s)} ${R(y - 190 * s)}L${R(x - 60 * s)} ${R(y - 190 * s)}C${R(x - 20 * s)} ${R(y - 140 * s)} ${R(x + 10 * s)} ${R(y - 100 * s)} ${R(x + 18 * s)} ${y}z"/>`
          + mv('ussway2', { ad: '8s', to: `${x}px ${y}px` }, `<g fill="#3a3a3c">${c}</g><path d="${m}" stroke="#8f9a86" stroke-width="3" fill="none" opacity=".75" stroke-linecap="round"/>`);
      };
      return `<defs>${lin(s1, [[0, '#2f3f6a'], [0.35, '#7a6a9a'], [0.62, '#f09a6a'], [0.82, '#ffcf80'], [1, '#ffe9a8']])}${lin(w1, [[0, '#f7b980'], [0.14, '#8a7a96'], [1, '#2a3a5e']])}${lin(m1, [[0, '#ffe3b8', 0], [0.5, '#ffe3b8', 0.7], [1, '#ffe3b8', 0]])}</defs>`
        + full(`url(#${s1})`) + stars(51, 30, 220) + rays(800, 520, 1200, '#ffe0a0', 0.1) + sun(800, 520, 70, '#fff6d4', '#ffb860', true)
        + streak(280, 190, 320, '#ffb490', 0.5) + streak(1250, 270, 280, '#ffa882', 0.5, 70) + cloud(330, 360, 1.0, '#c4749a', 0.75, 66, 6, '#ffbe96') + cloud(1320, 430, 0.85, '#c2759a', 0.7, 58, 30, '#ffc49c')
        + birds(53, 6, 800, 300, '#2c2038', 1.1, 640)
        + mv('uspar', { ad: '40s', dx: '8px' }, ridge('#7a6a94', 540, 24, 8, 191, 600)) + haze(500, 110, '#ffcf9a', 0.55)
        + `<rect y="560" width="1600" height="340" fill="url(#${w1})"/>`
        // the sun's path and ripples on the river
        + `<path fill="#ffd490" opacity=".38" d="M700 560H900L1060 900H540z"/>` + shimmer(201, 34, 560, 1040, 570, 800, '#ffe8b0', 70) + shimmer(202, 20, -100, 1700, 700, 890, '#8a9cc0', 100)
        // the bridge: abutments, arch (two chords), posts, diagonals, deck, rails
        + `<path fill="#3a3040" d="M-160 520H160V640H-160zM1440 520H1760V640H1440z"/><path fill="#4a3c48" d="M120 520H190V640H120zM1410 520H1480V640H1410z"/>`
        + `<g fill="none" stroke="#2a2434" stroke-linecap="round"><path d="M160 520Q800 180 1440 520" stroke-width="16"/><path d="M160 536Q800 214 1440 536" stroke-width="9"/><path d="${posts}" stroke-width="5"/><path d="${diag}" stroke-width="2.5" opacity=".8"/></g>`
        + `<path fill="#2a2434" d="M-160 516H1760v26H-160z"/><path d="M-160 540H1760" stroke="#4a3c48" stroke-width="10" stroke-dasharray="3 14" fill="none"/>`
        + dots('M160 508H1440', '#fff1c8', 5, 40, 'us-lamps')
        + `<path fill="#2a2434" d="M600 540h16v100h-16zM984 540h16v100h-16z" opacity=".6"/>`
        // river mist drifting in bands
        + streak(520, 640, 420, '#ffe9c8', 0.4, 80) + streak(1150, 700, 380, '#ffe3c0', 0.35, 100) + streak(300, 770, 360, '#f5d9c8', 0.3, 90)
        + `<path fill="#2a2630" d="M-160 900V780C100 760 300 790 500 800C600 806 540 900 600 900z"/><path fill="#26222c" d="M1760 900V760C1500 750 1300 790 1100 810C1000 818 1060 900 1000 900z"/>`
        + oak(160, 800, 1.45, 5) + oak(1470, 790, 1.3, 9)
        + mv('usmove', { ad: '70s', dx: '1000px' }, `<g transform="translate(800 850)"><path fill="#2a2834" d="M-60 0l10 14h100l14-14z"/><path d="M0 0V-24" stroke="#2a2834" stroke-width="3"/><circle cx="0" cy="-28" r="5" class="us-lit"/></g>`)
        + finish(0.3);
    } });

  /* ---------- Arkansas: misty Ozark ridges in autumn ---------- */
  usSceneAdd({ key: 'state:AR', label: 'Mist in the Ozarks', site: 'Morning mist in the Ozarks', colour: 'teal', mood: 'calm', season: ['autumn'], tags: ['mountains', 'mist', 'autumn', 'cabin'],
    svg: () => {
      const s1 = U(), l1 = U(), b1 = U();
      const fall = (seed, n, cols) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) { const cx = R(r() * 1600), cy = R(r() * 300); o += `<g transform="rotate(${R(r() * 180)} ${cx} ${cy})"><ellipse class="x-usfall" style="--ad:${R(10 + r() * 8)}s;--d:-${R(r() * 16)}s;--dx:${R(-90 + r() * 180)}px" cx="${cx}" cy="${cy}" rx="7" ry="4" fill="${cols[i % cols.length]}"/></g>`; } return o; };
      return `<defs>${lin(s1, [[0, '#9fb6c4'], [0.5, '#d6dfd8'], [1, '#f6ecd2']])}${radU(l1, [[0, '#fff8e0', 0.8], [1, '#fff8e0', 0]], 430, 250, 520)}${lin(b1, [[0, '#6a5a44'], [1, '#2e2a24']])}</defs>`
        + full(`url(#${s1})`) + `<rect width="1600" height="900" fill="url(#${l1})"/>` + stars(61, 18, 150) + sun(430, 250, 40, '#fffaf0', '#fff0c8') + rays(430, 250, 900, '#fffbe8', 0.14)
        + streak(1180, 150, 300, '#fff', 0.55) + streak(300, 130, 260, '#fff', 0.5, 70) + birds(63, 4, 1000, 250, '#4a5a64', 1.2, 560)
        + mv('uspar', { ad: '46s', dx: '8px' }, ridge('#aebcc6', 400, 60, 9, 211, 900)) + haze(380, 120, '#f2eee0', 0.65)
        + mv('uspar', { ad: '38s', dx: '12px' }, ridge('#97a9b4', 470, 60, 10, 212, 900) + canopy('#8a9a98', 440, 20, 213, -160, 1760, 900)) + streak(900, 500, 520, '#fff', 0.5, 90) + haze(470, 110, '#f4efe0', 0.6)
        + mv('uspar', { ad: '32s', dx: '16px' }, ridge('#788ea0', 560, 60, 10, 214, 900) + canopy('#b2823c', 536, 22, 215, -160, 1760, 900)) + streak(300, 580, 480, '#fff', 0.55, 80) + haze(560, 100, '#f2ebd8', 0.6)
        + mv('uspar', { ad: '28s', dx: '20px' }, ridge('#5f7a82', 640, 50, 9, 216, 900) + canopy('#c4522c', 618, 26, 217, -160, 1760, 900) + canopy('#d99a30', 650, 24, 218, -160, 1760, 900)) + streak(1250, 690, 460, '#fff', 0.45, 100) + haze(640, 90, '#efe6d0', 0.5)
        // the near bluff: cabin, chimney smoke, a lone red maple
        + `<path fill="url(#${b1})" d="M-160 900V700C100 690 300 720 500 730C700 740 900 700 1100 690S1500 700 1760 720V900z"/>`
        + `<g fill="#4a3a2c"><path d="M1060 700l-4-44h160l-4 44z"/></g><path fill="#5a4636" d="M1050 658L1136 612L1222 658z"/><path fill="#3a2c22" d="M1176 640V590h22v46z"/><rect class="us-lit" x="1086" y="672" width="22" height="18"/><rect x="1130" y="676" width="26" height="24" fill="#2a2018"/><path d="M1060 680h150M1060 668h150" stroke="#34281e" stroke-width="2" opacity=".6"/>`
        + puffs(1187, 590, 5, '#e8e4dc', 14, 70, 6, -90, 3.4)
        + `<path fill="#2e2a24" d="M-160 900V780C100 770 400 800 700 810S1300 800 1760 790V900z"/>`
        + `<path d="M300 800V640" stroke="#2a2018" stroke-width="12"/><path d="M300 700l-50-40M300 680l44-44" stroke="#2a2018" stroke-width="7" fill="none"/>`
        + mv('ussway2', { ad: '8s', to: '300px 790px' }, [[300, 600, 92, '#c4392b'], [236, 650, 64, '#d9552a'], [366, 640, 70, '#e07a2a'], [300, 560, 62, '#e9a02e'], [250, 580, 40, '#b8361f']].map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join(''))
        + canopy('#232e2a', 840, 40, 219, -160, 700, 900) + canopy('#1e2824', 850, 36, 220, 900, 1760, 900)
        + fall(221, 26, ['#d9552a', '#e9a02e', '#b8361f', '#e6c13a'])
        + finish(0.3);
    } });

  /* ---------- Florida: an airboat in the Everglades ---------- */
  usSceneAdd({ key: 'state:FL', label: 'An airboat in the Everglades', site: 'The Everglades, river of grass', colour: 'green', mood: 'energetic', season: 'any', tags: ['everglades', 'airboat', 'sawgrass', 'egret'],
    svg: () => {
      const s1 = U(), w1 = U(), l1 = U();
      const grass = (seed, n, x0, x1, y0, y1, col, w, hmin) => { const r = rnd(seed); let d = ''; for (let i = 0; i < n; i++) { const x = R(x0 + r() * (x1 - x0)), y = R(y0 + r() * (y1 - y0)), h = R(hmin + r() * hmin); d += `M${x} ${y}q${R(r() * 16 - 8)} ${-R(h * 0.6)} ${R(r() * 30 - 15)} ${-h}`; } return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`; };
      const cypress = (x, y, s) => `<path fill="#2c3a2c" d="M${x - 8 * s} ${y}L${x - 4 * s} ${y - 120 * s}h${8 * s}L${x + 8 * s} ${y}z"/>` + `<g fill="#3d5a3a"><ellipse cx="${x}" cy="${y - 130 * s}" rx="${R(54 * s)}" ry="${R(26 * s)}"/><ellipse cx="${x - 30 * s}" cy="${y - 108 * s}" rx="${R(40 * s)}" ry="${R(18 * s)}"/><ellipse cx="${x + 34 * s}" cy="${y - 112 * s}" rx="${R(44 * s)}" ry="${R(18 * s)}"/></g><path d="M${x - 30 * s} ${y - 100 * s}v${R(40 * s)}M${x + 20 * s} ${y - 100 * s}v${R(50 * s)}" stroke="#8f9a74" stroke-width="3" opacity=".6"/>`;
      return `<defs>${lin(s1, [[0, '#2f90c8'], [0.4, '#7fd0d8'], [0.7, '#ffd890'], [1, '#ffb878']])}${lin(w1, [[0, '#f3c78a'], [0.1, '#6fb8a8'], [1, '#1f5f5a']])}${radU(l1, [[0, '#ffdc90', 0.7], [1, '#ffdc90', 0]], 1220, 500, 700)}</defs>`
        + full(`url(#${s1})`) + rays(1220, 500, 1000, '#fff0b8', 0.16) + sun(1220, 500, 56, '#fffbe0', '#ffc860')
        // towering cumulus
        + cloud(340, 300, 1.7, '#e4c8b8', 0.92, 80, 8, '#fff4e8') + cloud(760, 190, 1.3, '#ecd0bc', 0.9, 70, 30, '#fff') + cloud(1420, 280, 1.2, '#f0c8a8', 0.88, 74, 18, '#fff3e0') + streak(900, 400, 360, '#fff', 0.4)
        + birds(71, 6, 600, 330, '#fff', 1.2, 700) + birds(72, 3, 1000, 250, '#2d4a58', 1.0, 600)
        + mv('uspar', { ad: '46s', dx: '8px' }, `<path fill="#6b9a7a" d="M-160 540Q300 520 700 534T1300 528T1760 540V600H-160z"/>` + cypress(160, 560, 1.0) + cypress(420, 556, 0.7) + cypress(1020, 552, 0.8) + cypress(1460, 560, 1.1) + canopy('#55805a', 538, 14, 231, 540, 940, 600)) + haze(520, 90, '#fff0c8', 0.5)
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + `<rect y="560" width="1600" height="340" fill="url(#${w1})"/>`
        // sawgrass islands and reflections of the sky
        + shimmer(241, 30, 100, 1500, 570, 800, '#fff0c0', 80) + shimmer(242, 20, -100, 1700, 730, 890, '#a4e0d0', 100)
        + `<g transform="translate(0 0)"><path fill="#7a9a4a" d="M-160 620Q100 596 300 622T700 616T1100 622T1760 612V640H-160z"/></g>`
        + mv('ussway', { ad: '5s' }, grass(251, 80, -100, 700, 612, 640, '#6a8a3a', 4, 30) + grass(252, 60, 900, 1700, 610, 640, '#6a8a3a', 4, 30))
        // a great egret wading on the left
        + `<g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"><path d="M250 640V590M262 640V590"/></g><path fill="#fff" d="M232 590Q250 560 290 580L320 560L324 566L296 592Q270 610 240 596z"/><path d="M296 576Q312 540 300 506" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="302" cy="502" r="7" fill="#fff"/><path d="M308 502l28 6" stroke="#f0b040" stroke-width="4"/>`
        // the airboat: hull, cage, seat, pilot, fan
        + mv('usbob', { ad: '1.4s', dy: '3px' }, `<g transform="translate(760 780)"><path fill="#1c2b34" d="M-210 0L260 -2L330 -26L-190 -26z"/><path fill="#e8e4d0" d="M-210 0H260l-4 14H-196z"/><path fill="#c8402a" d="M-170 -26H300l30 -2l-60 -16H-170z"/>`
          + `<path d="M-190 -26V-150M-90 -26V-150M-190 -150H-90M-190 -100H-90M-190 -62H-90M-190 -150L-90 -26M-90 -150L-190 -26" stroke="#2a2a30" stroke-width="5" fill="none"/>`
          + `<path fill="#3a3a44" d="M-60 -26V-72h80v46z"/><path fill="#d6d0b8" d="M-50 -72q30 -22 60 0z"/><circle cx="-24" cy="-98" r="16" fill="#2d2420"/><path fill="#c9a876" d="M-46 -108h46l-12 -14h-26z"/><path fill="#2d2420" d="M-44 -82l-6 54H-4l-10 -54z"/>`
          + `<path d="M-150 -150V-210" stroke="#2a2a30" stroke-width="8"/><ellipse cx="-150" cy="-218" rx="22" ry="80" fill="#c8d4d0" opacity=".3"/><ellipse cx="-150" cy="-218" rx="22" ry="80" fill="none" stroke="#2a2a30" stroke-width="2" opacity=".35"/><circle cx="-150" cy="-218" r="9" fill="#2a2a30"/>`
          + mv('usflicker', { ad: '.12s', to: '-150px -218px' }, `<ellipse cx="-150" cy="-218" rx="7" ry="70" fill="#2a2a30" opacity=".35"/><path d="M-150 -288V-148" stroke="#2a2a30" stroke-width="4" opacity=".5"/>`)
          + `</g>`)
        + puffs(520, 770, 8, '#fff', 32, -300, 2.4, -50, 2.8) + puffs(520, 780, 8, '#d8f4f0', 26, -360, 2.8, -20, 3)
        + `<path fill="#fff" opacity=".4" d="M560 800Q300 800 -100 880L-100 900H700z"/><path fill="#fff" opacity=".28" d="M1100 800Q1300 810 1700 880V900H1000z"/>`
        // a gator's eyes and snout in the foreground
        + `<g fill="#2c3a22"><ellipse cx="1260" cy="840" rx="130" ry="14"/><circle cx="1210" cy="826" r="12"/><circle cx="1262" cy="826" r="12"/></g><circle cx="1214" cy="824" r="4" fill="#f0c840"/><circle cx="1266" cy="824" r="4" fill="#f0c840"/>`
        + mv('ussway', { ad: '4.4s', d: '-1s' }, grass(261, 34, -100, 480, 880, 900, '#3d6a2a', 6, 80) + grass(262, 30, 1060, 1700, 880, 900, '#3d6a2a', 6, 80) + grass(263, 20, -100, 460, 880, 900, '#5a8a36', 4, 60) + grass(264, 20, 1080, 1700, 880, 900, '#5a8a36', 4, 60))
        + finish(0.3);
    } });

  /* ---------- Georgia: the granite dome at a peach sunset ---------- */
  usSceneAdd({ key: 'state:GA', label: 'The granite dome at a peach sunset', site: 'Stone Mountain at sunset', colour: 'orange', mood: 'dreamy', season: 'any', tags: ['mountain', 'granite', 'cable car', 'peach', 'lake'],
    svg: () => {
      const s1 = U(), m1 = U(), w1 = U(), l1 = U();
      const pine = (x, y, s, col) => `<path fill="${col}" d="M${x} ${y - 190 * s}l${22 * s} ${60 * s}h${-12 * s}l${28 * s} ${56 * s}h${-14 * s}l${32 * s} ${60 * s}H${x - 36 * s}l${32 * s} ${-60 * s}h${-14 * s}l${28 * s} ${-56 * s}h${-12 * s}z"/><rect x="${x - 4 * s}" y="${y - 8 * s}" width="${8 * s}" height="${12 * s}" fill="#2a1e22"/>`;
      const fly = (seed, n) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) o += `<g class="x-usbob" style="--ad:${(2 + r() * 3).toFixed(1)}s;--d:-${(r() * 4).toFixed(1)}s;--dy:${R(8 + r() * 10)}px"><circle class="us-lit" cx="${R(r() * 1600)}" cy="${R(600 + r() * 280)}" r="3.4"/></g>`; return o; };
      return `<defs>${lin(s1, [[0, '#5a6ab0'], [0.3, '#c89ac4'], [0.58, '#ffa89a'], [0.8, '#ffc88a'], [1, '#ffe6a8']])}${linU(m1, [[0, '#d9b7ba'], [0.5, '#b08a98'], [1, '#6a5668']], 400, 300, 1000, 640)}${lin(w1, [[0, '#ffc08a'], [0.12, '#d78a96'], [1, '#3a3a68']])}${radU(l1, [[0, '#ffc890', 0.55], [1, '#ffc890', 0]], 1200, 520, 800)}</defs>`
        + full(`url(#${s1})`) + stars(81, 30, 220) + rays(1200, 520, 1100, '#ffe0b0', 0.2) + sun(1200, 520, 74, '#fff0c8', '#ffa070')
        + streak(260, 160, 320, '#ffb8b0', 0.5) + streak(1180, 250, 300, '#ffa890', 0.55, 70) + cloud(500, 300, 1.2, '#cc7ea6', 0.8, 66, 8, '#ffc0a8') + cloud(1400, 380, 0.9, '#d4849e', 0.75, 58, 30, '#ffc6a8') + birds(83, 5, 900, 260, '#3a2a48', 1.0, 600)
        + mv('uspar', { ad: '44s', dx: '8px' }, ridge('#a784a8', 560, 36, 9, 261, 640)) + haze(520, 100, '#ffd0a8', 0.5)
        + mv('uspar', { ad: '36s', dx: '12px' }, ridge('#85688e', 600, 26, 9, 262, 640) + canopy('#6a5278', 590, 18, 263, -160, 1760, 640))
        // the dome: smooth granite shoulder, strata lines, a lit face
        + `<path fill="url(#${m1})" d="M60 640C120 520 260 400 460 360C600 332 760 322 880 340C1010 362 1110 440 1180 520C1230 575 1270 610 1300 640z"/>`
        + `<path fill="#fff" opacity=".18" d="M880 340C1010 362 1110 440 1180 520C1230 575 1270 610 1300 640H1040C1010 540 960 420 880 340z"/>`
        + `<path d="M270 590C420 520 600 470 760 460M360 560C520 500 700 440 880 440M560 640C640 560 760 500 940 500M840 640C900 580 990 540 1100 540" stroke="#7a5e72" stroke-width="3" fill="none" opacity=".5"/>`
        + `<path d="M150 620C300 560 520 520 700 512" stroke="#6a4e64" stroke-width="2" fill="none" opacity=".4"/>`
        + `<path fill="#6a5668" d="M560 360l10-24h14l8 24z" opacity=".8"/><path d="M572 336V318" stroke="#6a5668" stroke-width="3"/>`
        // the skyride cable and its car
        + `<path d="M590 372L1170 650" stroke="#2a2430" stroke-width="3" fill="none"/><path fill="#3a3040" d="M1150 640h46v40h-46z"/><path d="M1140 640l32-26l32 26z" fill="#4a3c50"/>`
        + `<g transform="translate(880 511) rotate(25.6)">` + mv('usdrift', { ad: '28s', dx: '230px' }, `<g><path d="M0 0V16" stroke="#2a2430" stroke-width="3"/><rect x="-24" y="16" width="48" height="30" rx="6" fill="#d94a3a"/><rect x="-18" y="22" width="36" height="12" fill="#ffd9a8" opacity=".85"/><rect class="us-lit" x="-14" y="24" width="8" height="8"/><rect class="us-lit" x="4" y="24" width="8" height="8"/></g>`) + `</g>`
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        // lake
        + `<rect y="640" width="1600" height="260" fill="url(#${w1})"/>` + `<g opacity=".3" transform="translate(0 1280) scale(1 -1)"><path fill="#b08a98" d="M60 640C120 520 260 400 460 360C600 332 760 322 880 340C1010 362 1110 440 1180 520C1230 575 1270 610 1300 640z"/></g>`
        + `<path fill="#ffc890" opacity=".35" d="M1100 640H1300L1420 900H960z"/>` + shimmer(271, 30, 100, 1500, 650, 800, '#ffe4b8', 70) + shimmer(272, 20, -100, 1700, 780, 890, '#8a8cc0', 100)
        + `<path fill="#3a2e44" d="M-160 640Q200 628 480 652T900 640T1400 656T1760 644V670H-160z"/>`
        + mv('usmove', { ad: '80s', dx: '1700px' }, mv('usbob', { ad: '3.4s', dy: '2px' }, `<g transform="translate(800 740)"><path fill="#2a2038" d="M-40 0h80l-12 12h-56z"/><path d="M0 0V-34" stroke="#2a2038" stroke-width="3"/><path fill="#d9644a" d="M2 -34L26 -6H2z"/></g>`))
        + ridge('#2e2038', 850, 40, 10, 281)
        + pine(90, 830, 1.5, '#241a2c') + pine(240, 860, 1.9, '#2a1e34') + pine(1500, 850, 1.7, '#241a2c') + pine(1360, 880, 1.4, '#2a1e34') + pine(1650, 880, 2, '#1f1628')
        + fly(291, 14) + finish(0.3);
    } });

/*SCENES-END*/
})();
