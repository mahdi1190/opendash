/* ============================================================
   ASIA FULL-SCREEN SCENES, batch 8: Mongolia, Taiwan, Hong Kong, Macau, and the cities Beijing, Shanghai,
   Guangzhou, Shenzhen, Chengdu, Chongqing, Wuhan. PURE classic script: registers entries with asiaSceneAdd()
   (71-anim-asia.js). Each svg() is the inside of a 1600 x 900 drawing, layered, painted for daytime; the dark
   theme / tod-dusk / tod-night lays the evening grade over it and lights the us-lit / us-lamps / us-star parts.
   Landscape, skyline and architecture only.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish } = K;

  /** A flat tower: body, a shaded right side, and a sparse window grid (glass by day, lit at dusk). */
  const win = (x, y, w, h, sx, sy, glass) => {
    let d = '';
    for (let yy = y; yy < y + h; yy += sy) d += `M${x} ${yy}h${w}`;
    return (glass === 0 ? '' : dots(d, glass || '#2c3a55', 4, sx, '', ' opacity=".4"')) + dots(d, '#ffd27a', 4, sx, 'us-lamps');
  };
  const tower = (x, base, w, h, fill, shade, wins) => `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="${fill}"/><rect x="${R(x + w * 0.62)}" y="${base - h}" width="${R(w * 0.38)}" height="${h}" fill="${shade}" opacity=".5"/>` + (wins ? win(x + 5, base - h + 10, w - 10, h - 20, 12, 24, wins === 2 ? 0 : undefined) : '');
  /** A run of filler towers with window grids. */
  const city = (seed, x0, x1, base, hmin, hmax, wmin, wmax, fill, shade, wc) => {
    const r = rnd(seed); let x = x0, o = '';
    while (x < x1) {
      const bw = wmin + r() * (wmax - wmin), bh = hmin + r() * (hmax - hmin);
      o += tower(R(x), base, R(bw), R(bh), fill, shade, wc && r() < wc && bw > 24 ? 2 : 0);
      if (r() < 0.25) o += `<rect x="${R(x + bw * 0.4)}" y="${R(base - bh - 18)}" width="${R(bw * 0.2)}" height="18" fill="${fill}"/>`;
      x += bw + r() * 5;
    }
    return o;
  };
  /** An upturned Chinese eave (hip roof) centred on cx, eave line at y, h tall. */
  const eave = (cx, y, w, h, fill, edge) => {
    const a = cx - w / 2, b = cx + w / 2;
    return `<path fill="${fill}" d="M${R(a - 16)} ${y - 12}Q${R(a + 8)} ${y + 4} ${R(a + w * 0.26)} ${R(y - h * 0.35)}Q${R(cx - w * 0.15)} ${R(y - h * 0.88)} ${R(cx - w * 0.08)} ${y - h}H${R(cx + w * 0.08)}Q${R(cx + w * 0.15)} ${R(y - h * 0.88)} ${R(b - w * 0.26)} ${R(y - h * 0.35)}Q${R(b - 8)} ${y + 4} ${R(b + 16)} ${y - 12}Q${cx} ${y + 10} ${R(a - 16)} ${y - 12}z"/>`
      + `<path fill="none" stroke="${edge}" stroke-width="3" d="M${R(a - 16)} ${y - 12}Q${cx} ${y + 10} ${R(b + 16)} ${y - 12}"/>`;
  };
  /** A ship on the water: hull, a deckhouse, a lit row, and a wake that shimmers. */
  const ship = (x, y, w, hull, cab) => `<path fill="${hull}" d="M${x} ${y}h${w}l${-R(w * 0.08)} 16H${R(x + w * 0.06)}z"/><rect x="${R(x + w * 0.58)}" y="${y - 20}" width="${R(w * 0.26)}" height="20" fill="${cab}"/><rect x="${R(x + w * 0.1)}" y="${y - 9}" width="${R(w * 0.4)}" height="9" fill="${cab}" opacity=".8"/>` + lit(R(x + w * 0.62), y - 15, R(w * 0.18), 6);
  const junk = (x, y, s, sail, hull) => `<g transform="translate(${x} ${y}) scale(${s})"><path fill="${hull}" d="M-90 0Q-60 26 0 26Q70 26 100 -6L92 -14H-82z"/><path d="M-6 -14V-120M54 -14V-92" stroke="#3a2a22" stroke-width="4"/><path fill="${sail}" d="M-10 -116Q-70 -90 -78 -20H-10zM50 -90Q10 -70 6 -20H50z"/><path fill="none" stroke="#7a2a1c" stroke-width="2" opacity=".6" d="M-72 -50H-10M-76 -80H-10M8 -50H50M8 -72H50"/></g>`;

  /* ---------- Mongolia: a ger camp on the steppe at sunset ---------- */
  const horse = (x, y, s, col) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${col}" stroke="${col}"><ellipse cx="0" cy="-42" rx="34" ry="15" stroke="none"/><path stroke="none" d="M-26 -48Q-46 -58 -52 -34L-60 -26L-52 -22L-44 -30Q-34 -34 -20 -34z"/><path fill="none" stroke-width="5" stroke-linecap="round" d="M-24 -34L-27 0M-16 -32L-12 0M22 -32L20 0M28 -36L34 -2M32 -50Q48 -42 42 -18"/></g>`;
  const ger = (x, y, w, h, door, band) => {
    const rf = h * 0.5;
    return `<path fill="#f4ede0" d="M${x - w / 2} ${y}V${y - h}H${x + w / 2}V${y}z"/><path fill="#e2d8c4" d="M${x + w * 0.2} ${y - h}H${x + w / 2}V${y}H${x + w * 0.2}z" opacity=".7"/>`
      + `<path fill="#fbf6ea" d="M${x - w / 2 - 12} ${y - h + 2}Q${x - w * 0.2} ${y - h - rf * 0.6} ${x} ${y - h - rf}Q${x + w * 0.2} ${y - h - rf * 0.6} ${x + w / 2 + 12} ${y - h + 2}z"/><path fill="#d9cdb6" d="M${x + w * 0.1} ${y - h - rf * 0.8}L${x + w / 2 + 12} ${y - h + 2}H${x + w * 0.05}z" opacity=".6"/>`
      + `<path fill="none" stroke="${band}" stroke-width="5" d="M${x - w / 2} ${y - h * 0.3}H${x + w / 2}M${x - w / 2 - 8} ${y - h + 4}Q${x} ${y - h - 6} ${x + w / 2 + 8} ${y - h + 4}"/>`
      + `<path fill="${door}" d="M${x - w * 0.11} ${y}V${y - h * 0.62}H${x + w * 0.11}V${y}z"/><path fill="none" stroke="#3b64a8" stroke-width="3" d="M${x - w * 0.11} ${y - h * 0.31}H${x + w * 0.11}M${x} ${y - h * 0.62}V${y}"/>`
      + `<circle cx="${x}" cy="${y - h - rf}" r="7" fill="#c04a2a"/>`;
  };
  asiaSceneAdd({ key: 'country:MN', label: 'The steppe at sunset', site: 'A ger camp on the steppe', colour: 'amber', mood: 'calm', season: 'any', tags: ['steppe', 'ger', 'horses'],
    svg: () => {
      const s1 = U(), g1 = U(), r = rnd(31); let tufts = '', tuf2 = '';
      for (let i = 0; i < 70; i++) { const x = R(-100 + r() * 1800), y = R(760 + r() * 150), h = 26 + r() * 40; tufts += `M${x} ${y}q${R(r() * 10 - 5)} ${-h * 0.5} ${R(r() * 16 - 8)} ${-h}M${x + 6} ${y}q${R(r() * 8)} ${-h * 0.6} ${R(r() * 20 - 4)} ${-h * 0.9}`; }
      for (let i = 0; i < 40; i++) { const x = R(-100 + r() * 1800), y = R(620 + r() * 100); tuf2 += `M${x} ${y}l${R(r() * 6 - 3)} ${-12 - R(r() * 10)}`; }
      return `<defs>${lin(s1, [[0, '#35508f'], [0.35, '#7f8fc2'], [0.62, '#f2b585'], [0.85, '#ffd79a'], [1, '#ffe7b8']])}${lin(g1, [[0, '#8a9a3f'], [0.5, '#a8a047'], [1, '#6f7a2e']])}</defs>`
        + full(`url(#${s1})`) + stars(5, 24, 200) + rays(560, 545, 1000, '#ffe1a0', 0.12) + sun(560, 545, 46, '#fff3cf', '#ffbf6a')
        + cloud(300, 250, 1.3, '#e69a9a', 0.85, 70, 6, '#ffd8c0') + cloud(1150, 180, 1.6, '#c07fa6', 0.8, 90, 20, '#ffcdb6') + cloud(1420, 370, 1.0, '#ea9f8d', 0.8, 60, 36, '#ffe0c0') + streak(780, 120, 380, '#ffc6b0', 0.4, 80)
        + birds(9, 3, 1000, 330, '#46324a', 1.5, 700)
        + mv('uspar', { ad: '60s', dx: '10px' }, ridge('#7a7fb2', 590, 70, 7, 4) + ridge('#8b8cae', 610, 40, 9, 8)) + haze(560, 90, '#ffd8a8', 0.55)
        + mv('uspar', { ad: '44s', dx: '18px' }, `<path fill="url(#${g1})" d="M-160 900V650Q200 600 520 640T1100 630T1760 650V900z"/>`) + `<path fill="none" stroke="#5f6a28" stroke-width="2" opacity=".5" d="${tuf2}"/>`
        + `<path fill="#97913d" d="M-160 900V700Q300 660 700 700T1400 690T1760 710V900z" opacity=".9"/>`
        // the camp
        + `<g>${ger(1000, 700, 150, 70, '#d2562e', '#c04a2a')}${ger(1160, 716, 118, 56, '#cc6a2e', '#b94025')}${ger(860, 722, 100, 48, '#d2562e', '#3b64a8')}</g>`
        + `<path d="M1010 628V580" stroke="#3a3030" stroke-width="5"/>` + puffs(1010, 578, 5, '#d8d0e0', 18, 60, 5, -150, 3.4) + lit(985, 676, 24, 24)
        + `<path d="M920 745H1240" stroke="#6a4a3a" stroke-width="3" opacity=".6"/>` + dots('M920 745H1240', '#e98a4a', 4, 26, 'us-lamps')
        + mv('usbob', { ad: '5s', dy: '2px' }, horse(380, 770, 1.1, '#4a2c22')) + mv('usbob', { ad: '6s', d: '-2s', dy: '2px' }, horse(520, 800, 0.9, '#9a6a3c')) + horse(260, 800, 0.7, '#e8dcc8')
        + mv('usmove', { ad: '70s', dx: '300px' }, horse(1420, 740, 0.45, '#3a2a2a') + horse(1470, 745, 0.4, '#8a5a30'))
        + `<g stroke="#e9d77a" stroke-width="4" stroke-linecap="round" fill="none">${mv('ussway', { ad: '3.4s', to: '800px 900px' }, `<path d="${tufts}"/>`)}</g>`
        + `<g fill="#f6e9a8" opacity=".55">${[0, 1, 2, 3, 4, 5].map((i) => `<circle class="x-usfall" style="--ad:${12 + i * 3}s;--d:-${i * 3}s;--dx:90px" cx="${100 + i * 280}" cy="460" r="3"/>`).join('')}</g>`
        + finish(0.34);
    } });

  /* ---------- Taiwan: tea terraces above a sea of cloud at sunrise ---------- */
  asiaSceneAdd({ key: 'country:TW', label: 'Tea terraces above the clouds', site: 'Mountain tea terraces at sunrise', colour: 'green', mood: 'calm', season: 'any', tags: ['mountain', 'tea', 'sunrise'],
    svg: () => {
      const s1 = U(), r = rnd(77); let terr = '', rows = '';
      const bands = [['#4d8a3a', '#2f6a2c'], ['#5d9a40', '#3a742f'], ['#6aa845', '#478434']];
      for (let i = 0; i < 12; i++) {
        const y = 560 + i * 30, sh = i % 2 ? '#3a7a30' : '#5a9a3c', amp = 40 + i * 5;
        terr += `<path fill="${sh}" d="M-160 ${y + 40}Q300 ${y - amp} 760 ${y + 8}T1760 ${y - 20}V${y + 60}H-160z"/><path fill="none" stroke="#8cc55a" stroke-width="2" opacity=".7" d="M-160 ${y + 40}Q300 ${y - amp} 760 ${y + 8}T1760 ${y - 20}"/>`;
      }
      for (let i = 0; i < 30; i++) { const y = 600 + i * 10; rows += `M-160 ${y}Q300 ${y - 60 - i} 760 ${y - 16}T1760 ${y - 40}`; }
      return `<defs>${lin(s1, [[0, '#6d7fb8'], [0.3, '#d9a0c0'], [0.55, '#ffc49a'], [0.8, '#ffe6b8']])}</defs>` + full(`url(#${s1})`) + stars(3, 16, 160)
        + rays(800, 420, 1100, '#fff0c8', 0.14) + sun(800, 420, 40, '#fff8de', '#ffd09a', true)
        + cloud(280, 200, 1.2, '#e6a8bc', 0.8, 70, 4, '#ffe0d0') + cloud(1300, 150, 1.4, '#d9a0c0', 0.8, 90, 30, '#ffe0d0')
        + mv('uspar', { ad: '70s', dx: '12px' }, ridge('#7a8cc0', 430, 110, 6, 14) + ridge('#6f86b0', 470, 90, 7, 19)) + haze(430, 100, '#ffd7b8', 0.5)
        + mv('uspar', { ad: '50s', dx: '20px' }, ridge('#4a7a8a', 500, 110, 8, 23) + cloud(500, 560, 2, '#e8c8d0', 0.9, 80, 12, '#fff') + cloud(1250, 575, 2.2, '#e8c8d0', 0.9, 66, 40, '#fff'))
        + mv('uspar', { ad: '56s', dx: '10px' }, ridge('#2d5e48', 560, 70, 9, 28, 700))
        + terr + `<path fill="none" stroke="#2a6a2a" stroke-width="3" stroke-dasharray="1 7" opacity=".5" d="${rows}"/>`
        // pavilion
        + `<path fill="#3f7a34" d="M1060 700Q1150 620 1236 616Q1330 620 1420 700z"/><g transform="translate(1236 650) scale(1.5) translate(-1236 -650)"><rect x="1190" y="580" width="12" height="62" fill="#a0402a"/><rect x="1270" y="580" width="12" height="62" fill="#a0402a"/><rect x="1180" y="636" width="112" height="10" fill="#c9b79a"/><rect x="1196" y="590" width="80" height="8" fill="#7a2c20"/>${eave(1236, 580, 130, 44, '#3d5a5a', '#ffd39a')}<circle cx="1236" cy="530" r="5" fill="#ffd39a"/>${lit(1212, 604, 22, 28)}${lit(1240, 604, 22, 28)}</g>`
        + `<path fill="#264f2c" d="M-160 900V800Q200 740 600 790T1300 770T1760 800V900z"/><path fill="#1f4426" d="M-160 900V850Q300 820 800 850T1760 840V900z"/>`
        + mv('ussway', { ad: '5s', to: '200px 900px' }, `<path fill="#2f6a30" d="M120 900Q140 820 100 770Q160 810 170 900zM260 900Q300 800 250 740Q330 800 320 900z"/>`)
        + birds(12, 4, 500, 330, '#fff', 1.1, 600) + birds(6, 2, 1200, 400, '#3a4a5a', 1.0, 500)
        + finish(0.3);
    } });

  /* ---------- Hong Kong: the harbour and its skyline at dusk ---------- */
  asiaSceneAdd({ key: 'country:HK', label: 'The harbour skyline at dusk', site: 'Victoria Harbour from Kowloon', colour: 'violet', mood: 'energetic', season: 'any', tags: ['skyline', 'harbour', 'junk'],
    svg: () => {
      const s1 = U(), w1 = U(), g1 = U(), r = rnd(21);
      // landmark towers on the Island side
      const ifc = `<path fill="#c9cde0" d="M760 600V240l22-20h46l22 20V600z"/><path fill="#8c93b8" d="M815 220l29 20V600h-29z" opacity=".6"/><path d="M805 220V150" stroke="#8c93b8" stroke-width="3"/>${win(768, 252, 90, 340, 10, 16, '#33456a')}`;
      const boc = `<path fill="#d8dcee" d="M980 600V330l50-50l50 50V600z"/><path fill="none" stroke="#8c93b8" stroke-width="3" d="M980 330L1080 600M1080 330L980 600M980 465H1080M1030 280V600"/><path d="M1030 280V240" stroke="#8c93b8" stroke-width="3"/>`;
      const cp = `<path fill="#b9a8c8" d="M600 600V310h60V600z"/><path fill="#e0b050" d="M600 310h60l-30-26z"/>${win(606, 322, 48, 270, 10, 16)}`;
      let rf = '';
      for (let i = 0; i < 40; i++) rf += `<rect class="x-usshim" style="--ad:${(2 + r() * 2).toFixed(1)}s;--d:-${(r() * 3).toFixed(1)}s" x="${R(200 + r() * 1200)}" y="${R(645 + r() * 190)}" width="${R(30 + r() * 70)}" height="${R(3 + r() * 4)}" rx="2" fill="${i % 3 ? '#ffd27a' : '#ff8aa0'}"/>`;
      return `<defs>${lin(s1, [[0, '#3a3f84'], [0.35, '#8a6cae'], [0.62, '#f08aa0'], [0.85, '#ffc08a'], [1, '#ffd9a0']])}${lin(w1, [[0, '#8a6aa6'], [0.3, '#4a4a8a'], [1, '#232a5a']])}${lin(g1, [[0, '#2d4a52'], [1, '#1a3038']])}</defs>`
        + full(`url(#${s1})`) + stars(11, 36, 230) + sun(1180, 560, 40, '#fff0d0', '#ff9a7a')
        + cloud(380, 230, 1.4, '#c97ab0', 0.85, 80, 6, '#ffb8c0') + cloud(1280, 310, 1.2, '#d880a8', 0.8, 66, 30, '#ffc0b0') + streak(820, 140, 340, '#ffa0b8', 0.4, 90)
        + birds(5, 3, 700, 300, '#3a2848', 1.1, 600)
        + mv('uspar', { ad: '60s', dx: '8px' }, ridge('#6a5c94', 520, 90, 6, 5) + ridge('#58558a', 560, 60, 8, 12)) + haze(500, 110, '#ffc0a8', 0.5)
        + mv('uspar', { ad: '40s', dx: '12px' }, city(3, -160, 600, 604, 90, 240, 34, 66, '#8e86b8', '#5b5890', 0.5) + city(5, 1100, 1760, 604, 90, 220, 34, 66, '#8e86b8', '#5b5890', 0.5) + ifc + boc + cp)
        + `<rect x="-160" y="600" width="1920" height="300" fill="url(#${w1})"/>` + `<rect x="-160" y="598" width="1920" height="8" fill="#ffb8a0" opacity=".5"/>`
        + shimmer(4, 24, 100, 1500, 650, 880, '#ffb8a8', 60) + rf
        // Kowloon foreshore and promenade
        + `<path fill="url(#${g1})" d="M-160 900V820H1760V900z"/><path d="M-160 826H1760" stroke="#ffd27a" stroke-width="4"/>` + dots('M-160 820H1760', '#ffd27a', 7, 38, 'us-lamps')
        + mv('usmove', { ad: '90s', dx: '1400px' }, junk(800, 770, 1.15, '#a8321e', '#4a2a1e'))
        + mv('usmove', { ad: '70s', d: '-20s', dx: '1300px' }, ship(900, 700, 150, '#2a2f4e', '#e9e0e0') + `<path class="x-usshim" d="M880 718h190" stroke="#fff" stroke-width="3" opacity=".4"/>`)
        + mv('usbob', { ad: '5s', dy: '3px' }, junk(1280, 830, 0.7, '#c0402a', '#3a2a22'))
        + puffs(1000, 690, 3, '#e8e0f0', 14, 60, 5, -60, 2.4)
        + finish(0.34);
    } });

  /* ---------- Macau: the tower, a colonial square and the bay at golden hour ---------- */
  asiaSceneAdd({ key: 'country:MO', label: 'The tower and the old town', site: 'Old town and the tower over the bay', colour: 'orange', mood: 'cheerful', season: 'any', tags: ['tower', 'old town', 'bay'],
    svg: () => {
      const s1 = U(), w1 = U(), r = rnd(55); let wave = '';
      for (let y = 800; y < 920; y += 22) for (let x = -160; x < 1760; x += 44) wave += `M${x} ${y}q11 -12 22 0t22 0`;
      const tw = `<path fill="#d9dde8" d="M1250 640L1262 330H1290L1302 640z"/><path fill="#aab0c8" d="M1276 330H1290L1302 640H1276z" opacity=".6"/><path fill="#e9ecf4" d="M1226 330H1326l-10-34H1236z"/><rect x="1236" y="296" width="80" height="20" fill="#7a86b0"/><path d="M1276 296V196" stroke="#c9cde0" stroke-width="5"/><path d="M1276 196V150" stroke="#c9cde0" stroke-width="2"/>${lit(1244, 302, 64, 8)}`;
      const yb = (x, w, h, col, tr) => `<rect x="${x}" y="${660 - h}" width="${w}" height="${h}" fill="${col}"/><rect x="${x - 6}" y="${660 - h - 10}" width="${w + 12}" height="12" fill="${tr}"/>`
        + Array.from({ length: Math.floor((h - 30) / 56) }, (_, i) => i).map((i) => [0, 1, 2].map((j) => `<rect x="${x + 14 + j * ((w - 28) / 3)}" y="${660 - h + 22 + i * 56}" width="${(w - 28) / 3 - 12}" height="38" fill="#3f7a64"/>` + lit(R(x + 18 + j * ((w - 28) / 3)), 660 - h + 28 + i * 56, R((w - 28) / 3 - 20), 26)).join('')).join('');
      return `<defs>${lin(s1, [[0, '#4a86c8'], [0.4, '#8ec2e6'], [0.7, '#ffd6a0'], [1, '#ffeab8']])}${lin(w1, [[0, '#7ab8c8'], [1, '#2f6a86']])}</defs>`
        + full(`url(#${s1})`) + stars(8, 20, 160) + rays(420, 520, 1000, '#fff2c0', 0.12) + sun(420, 520, 48, '#fffbe6', '#ffd78a')
        + cloud(300, 190, 1.2, '#ffd0b0', 0.9, 70, 6) + cloud(1000, 150, 1.5, '#ffd8c0', 0.85, 80, 30) + cloud(1450, 330, 1.0, '#ffc9a8', 0.8, 60, 10) + birds(4, 4, 800, 280, '#3a4458', 1.2, 600)
        + mv('uspar', { ad: '60s', dx: '10px' }, ridge('#8aa4c0', 560, 70, 7, 8) + ridge('#7a9cb4', 580, 40, 9, 3)) + haze(540, 90, '#fff0c8', 0.55)
        + mv('uspar', { ad: '44s', dx: '12px' }, city(9, 560, 1180, 650, 70, 200, 30, 60, '#a8bcd0', '#7a90b0', 0.4) + city(10, 1360, 1760, 650, 80, 180, 30, 60, '#a8bcd0', '#7a90b0', 0.4) + tw)
        + `<rect y="640" x="-160" width="1920" height="260" fill="url(#${w1})"/>` + shimmer(6, 22, 200, 1500, 665, 790, '#fff0c0', 60)
        // bridge
        + `<path d="M-160 700H1760" stroke="#e9ecf4" stroke-width="8"/><path d="M-160 692Q300 640 760 692" stroke="#e9ecf4" stroke-width="3" fill="none" opacity=".0"/>`
        + mv('usmove', { ad: '80s', dx: '1300px' }, junk(900, 760, 0.8, '#b8321e', '#5a3a2a'))
        // old town square
        + `<path fill="#d8c6a0" d="M-160 900V770Q400 740 1000 768T1760 760V900z"/><path fill="none" stroke="#262a33" stroke-width="5" opacity=".75" d="${wave}"/>`
        + `<g>${yb(-60, 240, 190, '#f2c75a', '#fff6e0')}${yb(220, 200, 160, '#e8a24a', '#fff6e0')}${yb(1480, 240, 210, '#f4cf6a', '#fff6e0')}</g>`
        + `<g>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path fill="none" stroke="#7a2a20" stroke-width="2" d="M${440 + i * 160} 560V600"/>`).join('')}${[0, 1, 2, 3, 4, 5, 6].map((i) => mv('ussway2', { ad: `${3 + (i % 3)}s`, d: `-${i}s`, to: `${440 + i * 160}px 560px` }, `<ellipse cx="${440 + i * 160}" cy="614" rx="16" ry="22" fill="#d8321e"/><rect x="${430 + i * 160}" y="590" width="20" height="6" fill="#e9b040"/><ellipse class="us-lit" cx="${440 + i * 160}" cy="614" rx="10" ry="15"/>`)).join('')}</g>`
        + dots('M440 560H1400', '#e9b040', 3, 40, 'us-lamps') + `<path d="M440 560V660M1400 560V660" stroke="#5a3a2a" stroke-width="6"/><path d="M440 560H1400" stroke="#7a2a20" stroke-width="2"/>`
        + `<path fill="#3a6a48" d="M1040 900Q1030 790 1080 740Q1120 800 1100 900z"/><circle cx="1070" cy="740" r="60" fill="#4a8a54"/><circle cx="1030" cy="780" r="44" fill="#3a7a48"/>`
        + finish(0.3);
    } });

  /* ---------- Beijing: the Hall of Prayer for Good Harvests, autumn ---------- */
  asiaSceneAdd({ key: 'place:beijing', label: 'The Temple of Heaven in autumn', site: 'Hall of Prayer for Good Harvests', colour: 'blue', mood: 'proud', season: 'any', tags: ['temple', 'landmark', 'autumn'],
    svg: () => {
      const s1 = U(), r = rnd(41); let leaves = '', trees = '';
      for (let i = 0; i < 18; i++) leaves += `<path class="x-usfall" style="--ad:${9 + (i % 5) * 2}s;--d:-${i}s;--dx:${60 + (i % 4) * 30}px" fill="${i % 2 ? '#e8a020' : '#d2622a'}" d="M${R(r() * 1600)} ${R(r() * 300)}q8 -8 14 0q-6 10 -14 0z"/>`;
      for (let i = 0; i < 7; i++) { const x = -40 + i * 270 + R(r() * 60); trees += `<rect x="${x}" y="690" width="14" height="80" fill="#4a3a30"/><circle cx="${x + 7}" cy="660" r="${R(60 + r() * 24)}" fill="${i % 2 ? '#e0a030' : '#d4802a'}"/><circle cx="${x - 30}" cy="690" r="46" fill="${i % 2 ? '#c8601e' : '#e8b038'}"/><circle cx="${x + 44}" cy="684" r="42" fill="#e8b440"/>`; }
      const cx = 800;
      const tierRoof = (y, w, h, col) => `<ellipse cx="${cx}" cy="${y}" rx="${w / 2 + 14}" ry="16" fill="#1f4a8a"/><path fill="${col}" d="M${cx - w / 2 - 14} ${y}Q${cx - w / 2 + 20} ${y - 10} ${cx - w * 0.3} ${y - h * 0.5}Q${cx - w * 0.15} ${y - h * 0.95} ${cx - w * 0.1} ${y - h}H${cx + w * 0.1}Q${cx + w * 0.15} ${y - h * 0.95} ${cx + w * 0.3} ${y - h * 0.5}Q${cx + w / 2 - 20} ${y - 10} ${cx + w / 2 + 14} ${y}Q${cx} ${y + 22} ${cx - w / 2 - 14} ${y}z"/><path fill="#173a70" opacity=".5" d="M${cx + w * 0.05} ${y - h}H${cx + w * 0.1}Q${cx + w * 0.15} ${y - h * 0.95} ${cx + w * 0.3} ${y - h * 0.5}Q${cx + w / 2 - 20} ${y - 10} ${cx + w / 2 + 14} ${y}Q${cx + w * 0.3} ${y + 14} ${cx + w * 0.05} ${y + 14}z"/><path fill="none" stroke="#e8b84a" stroke-width="3" d="M${cx - w / 2 - 14} ${y}Q${cx} ${y + 22} ${cx + w / 2 + 14} ${y}"/>`;
      const wall = (y, w, h) => `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" fill="#b03a2a"/><rect x="${cx - w / 2}" y="${y}" width="${w}" height="8" fill="#2f6aa8"/>` + `<path fill="none" stroke="#e8b84a" stroke-width="3" d="M${cx - w / 2} ${y + 14}h${w}"/>`;
      let col = ''; for (let i = 0; i < 9; i++) col += `<rect x="${cx - 150 + i * 36}" y="520" width="12" height="82" fill="#a02a22"/>`;
      let rail = ''; for (let i = 0; i < 30; i++) rail += `<rect x="${cx - 230 + i * 16}" y="${740 - (0)}" width="6" height="22" rx="2" fill="#f4f0e6"/>`;
      return `<defs>${lin(s1, [[0, '#3a82cc'], [0.5, '#7fbce6'], [0.85, '#d8ecf4'], [1, '#f6ecd6']])}</defs>` + full(`url(#${s1})`) + stars(2, 14, 140)
        + sun(1300, 200, 36, '#fffbe8', '#fff0c0') + cloud(260, 200, 1.4, '#cfe0ee', 0.9, 80, 4) + cloud(1000, 120, 1.8, '#d6e6f0', 0.85, 100, 30) + cloud(1480, 360, 1.0, '#dbe9f2', 0.8, 70, 12) + streak(500, 330, 300, '#fff', 0.5, 80)
        + birds(5, 5, 400, 340, '#2a3850', 1.2, 700)
        + mv('uspar', { ad: '60s', dx: '8px' }, ridge('#9ab4cc', 660, 40, 8, 6) + canopy('#7a9a72', 690, 30, 14))
        + mv('uspar', { ad: '40s', dx: '12px' }, `<path fill="#6a8a56" d="M-160 740V690Q300 660 700 690T1760 680V740z" opacity="0"/>`)
        // the hall: three marble tiers, three blue roofs
        + `<rect x="${cx - 330}" y="700" width="660" height="60" fill="#e6e2d8"/><rect x="${cx - 330}" y="696" width="660" height="8" fill="#f8f6ee"/><rect x="${cx - 270}" y="660" width="540" height="40" fill="#efece2"/><rect x="${cx - 270}" y="656" width="540" height="7" fill="#faf8f0"/><rect x="${cx - 210}" y="620" width="420" height="40" fill="#f2efe6"/><rect x="${cx - 210}" y="616" width="420" height="7" fill="#fff"/>`
        + `<path fill="#c8c4b8" d="M${cx + 120} 620h90v40h-90zM${cx + 190} 660h80v40h-80zM${cx + 240} 700h90v60h-90z" opacity=".5"/>`
        + `<path stroke="#bdb9ac" stroke-width="2" d="M${cx - 330} 730H${cx + 330}M${cx - 270} 680H${cx + 270}" opacity=".6"/>` + `<g fill="#f4f0e6">${rail}</g>`
        + `<rect x="${cx - 24}" y="620" width="48" height="140" fill="#d8d3c4"/><path stroke="#a89a80" d="M${cx - 12} 620V760M${cx + 12} 620V760" opacity=".5"/>`
        + wall(440, 300, 176) + `<g>${col}</g><rect x="${cx - 40}" y="530" width="80" height="86" fill="#7a2018"/>${lit(cx - 30, 540, 60, 70)}`
        + dots('M' + (cx - 135) + ' 470H' + (cx + 135), '#e8b84a', 6, 22, '')
        + tierRoof(468, 360, 56, '#2a62b0') + wall(372, 240, 52) + tierRoof(384, 300, 50, '#2a62b0') + wall(318, 160, 36) + tierRoof(330, 240, 56, '#2a62b0')
        + `<path d="M${cx} 270V236" stroke="#e8b84a" stroke-width="5"/><circle cx="${cx}" cy="222" r="14" fill="#f4c850"/><path fill="#f4c850" d="M${cx - 6} 236h12l-6 14z"/>`
        + mv('usglow', { ad: '5s', to: cx + 'px 222px' }, `<circle cx="${cx}" cy="222" r="26" fill="#fff0b0" opacity=".35"/>`)
        + `<g>${trees}</g>` + `<path fill="#3a5a3a" d="M-160 900V800Q400 770 800 800T1760 790V900z"/>`
        + `<path fill="#6a4a30" d="M-160 900V860Q500 840 900 862T1760 850V900z"/>` + `<g>${leaves}</g>`
        + finish(0.3);
    } });

  /* ---------- Shanghai: the Pudong skyline across the river at blue hour ---------- */
  asiaSceneAdd({ key: 'place:shanghai', label: 'Pudong across the Huangpu', site: 'Pudong skyline from the Bund', colour: 'indigo', mood: 'energetic', season: 'any', tags: ['skyline', 'river', 'night'],
    svg: () => {
      const s1 = U(), w1 = U(), g1 = U(), r = rnd(88), base = 640;
      const pearl = `<path d="M440 ${base}V470M470 ${base}V470" stroke="#9aa4cc" stroke-width="10"/><path d="M455 470V200" stroke="#8a94bc" stroke-width="8"/><circle cx="455" cy="450" r="54" fill="#d86a98"/><circle cx="455" cy="450" r="54" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/><circle cx="455" cy="330" r="34" fill="#c85a90"/><circle cx="455" cy="262" r="18" fill="#d86a98"/><path d="M455 200V120" stroke="#8a94bc" stroke-width="3"/><circle cx="455" cy="450" r="22" class="us-lit"/><circle cx="455" cy="330" r="14" class="us-lit"/>`
        + `<path fill="#9aa4cc" d="M405 ${base}L430 540h50l25 100z" opacity=".9"/><circle cx="455" cy="560" r="20" fill="#d86a98"/>`;
      const jin = `<path fill="#aeb4d4" d="M610 ${base}V330l14-16V290l12-12V256l14-14h30l14 14v22l12 12v24l14 16V${base}z"/><path fill="#7c84ae" d="M690 242l14 14v22l12 12v24l14 16V${base}h-40z" opacity=".5"/><path d="M660 242V190" stroke="#7c84ae" stroke-width="3"/>` + win(618, 340, 120, 290, 11, 17, '#3a4a78');
      const swfc = `<path fill="#a6acd0" d="M800 ${base}V210l36-24l36 24V${base}z"/><path fill="#161a38" d="M825 232l22-14l22 14v34h-44z"/><rect x="838" y="226" width="20" height="30" class="us-lit"/><path fill="#7c84ae" d="M860 210V${base}h12V210z" opacity=".5"/>` + win(808, 270, 56, 360, 9, 17, '#3a4a78');
      const sht = `<path fill="#b4bae0" d="M930 ${base}C922 520 940 400 958 260C968 180 980 120 996 70C1010 120 1022 180 1030 260C1046 400 1060 520 1056 ${base}z"/><path fill="#8a92be" d="M996 70C1010 120 1022 180 1030 260C1046 400 1060 520 1056 ${base}H996z" opacity=".5"/><path fill="none" stroke="#e8eaff" stroke-width="2" opacity=".6" d="M960 ${base}C950 480 975 330 996 70M1030 ${base}C1040 480 1016 330 996 70"/>` + win(950, 150, 90, 480, 10, 15, '#3a4a78');
      let refl = '';
      for (let i = 0; i < 24; i++) refl += `<rect class="x-usshim" style="--ad:${(2 + r() * 2.4).toFixed(1)}s;--d:-${(r() * 3).toFixed(1)}s" x="${R(380 + r() * 760)}" y="${R(660 + r() * 200)}" width="${R(18 + r() * 60)}" height="${R(3 + r() * 5)}" rx="2" fill="${['#ff8ab0', '#ffd27a', '#8ad0ff'][i % 3]}"/>`;
      return `<defs>${lin(s1, [[0, '#1f2766'], [0.4, '#5a4a9a'], [0.68, '#c86a9a'], [0.88, '#ffa27a'], [1, '#ffc58a']])}${lin(w1, [[0, '#8a5aa0'], [0.2, '#3a3a82'], [1, '#161c4a']])}${lin(g1, [[0, '#262b4e'], [1, '#12162e']])}</defs>`
        + full(`url(#${s1})`) + stars(22, 60, 340) + sun(1400, 600, 30, '#ffe6c8', '#ff9a8a') + cloud(300, 240, 1.4, '#a864a8', 0.85, 80, 6, '#e08ab0') + cloud(1150, 180, 1.8, '#9a60a8', 0.85, 90, 26, '#e8a0b0') + streak(900, 330, 380, '#ffa0c0', 0.4, 70)
        + mv('usglide', { ad: '30s', dx: '900px', dy: '-10px' }, `<path fill="#2a2f50" d="M1200 160l20 -4l22 4l-8 8h-30z"/><circle class="x-usflicker us-lit" cx="1210" cy="164" r="3"/>`)
        + birds(3, 3, 1250, 300, '#2a2048', 1.0, 600)
        + mv('uspar', { ad: '50s', dx: '8px' }, city(2, -160, 1760, base, 40, 160, 24, 54, '#7c76b0', '#52508a', 0.2))
        + haze(560, 100, '#ffa8a0', 0.45)
        + mv('uspar', { ad: '36s', dx: '12px' }, city(6, -160, 380, base, 80, 200, 30, 60, '#6c68a0', '#48467e', 0.3) + city(7, 1080, 1760, base, 80, 220, 30, 60, '#6c68a0', '#48467e', 0.3) + jin + swfc + sht + pearl)
        + mv('usflicker', { ad: '1.5s', to: '455px 120px' }, `<circle cx="455" cy="118" r="5" fill="#ff5a5a"/>`)
        + `<rect x="-160" y="${base}" width="1920" height="260" fill="url(#${w1})"/>` + `<rect x="-160" y="${base - 2}" width="1920" height="10" fill="#ffc0a0" opacity=".5"/>` + dots(`M-160 ${base + 4}H1760`, '#ffd27a', 5, 22, 'us-lamps')
        + shimmer(7, 22, -100, 1700, 680, 880, '#ffb8c8', 70) + refl
        + mv('usmove', { ad: '75s', dx: '1500px' }, ship(700, 770, 220, '#1c2040', '#e9dede') + `<path d="M690 786H950" stroke="#fff" stroke-width="3" class="x-usshim" opacity=".4"/>`)
        + mv('usmove', { ad: '90s', d: '-30s', dx: '1500px' }, ship(900, 725, 130, '#2c2a52', '#d8d0e0'))
        + `<path fill="url(#${g1})" d="M-160 900V840Q400 826 800 840T1760 830V900z"/>` + `<path d="M-160 840Q400 826 800 840T1760 830" stroke="#ffd27a" stroke-width="3" fill="none"/>` + dots('M-160 846Q400 832 800 846T1760 836', '#ffd27a', 9, 44, 'us-lamps')
        + finish(0.34);
    } });

  /* ---------- Guangzhou: the Canton Tower over the Pearl River ---------- */
  asiaSceneAdd({ key: 'place:guangzhou', label: 'Canton Tower and the Pearl River', site: 'Canton Tower on the Pearl River', colour: 'teal', mood: 'dreamy', season: 'any', tags: ['tower', 'river', 'skyline'],
    svg: () => {
      const s1 = U(), w1 = U(), r = rnd(19), base = 660, cx = 800;
      // hyperboloid lattice: waist at y 470, base 660, top 130
      const half = (y) => { const t = (y - 470) / (y < 470 ? 340 : 190); return 34 + 70 * t * t; };
      let lat = '', rings = '', body = '';
      const ys = []; for (let y = 160; y <= base; y += 30) ys.push(y);
      const lp = (y, k) => R(cx - half(y) + k * half(y) * 2 / 9), up = (y, k) => R(cx - half(y) + k * half(y) * 2 / 9);
      for (let k = 0; k <= 9; k++) { let d = `M${R(cx - half(150) + k * half(150) * 2 / 9)} 150`; for (const y of ys) d += `L${R(cx - half(y) + ((k + (y - 150) / 60) % 9.0 + 9) % 9 * half(y) * 2 / 9)} ${y}`; lat += d; }
      let sil = `M${cx - half(150)} 150`; for (const y of ys) sil += `L${R(cx - half(y))} ${y}`; sil += `L${cx - half(base)} ${base}H${cx + half(base)}`; for (const y of ys.slice().reverse()) sil += `L${R(cx + half(y))} ${y}`;
      for (const y of ys) rings += `M${R(cx - half(y))} ${y}H${R(cx + half(y))}`;
      let towers = ''; towers += tower(1060, base, 74, 330, '#8fb8c0', '#5a8a9c', true) + tower(1150, base, 90, 250, '#9cc2c8', '#6a9aa6', true) + tower(1260, base, 80, 380, '#86b0ba', '#5a8a9c', true) + tower(1380, base, 110, 200, '#9cc2c8', '#6a9aa6', true) + tower(520, base, 80, 300, '#8fb8c0', '#5a8a9c', true) + tower(420, base, 90, 220, '#9cc2c8', '#6a9aa6', true) + tower(300, base, 100, 180, '#a4c8cc', '#6a9aa6', true);
      let refl = ''; for (let i = 0; i < 36; i++) refl += `<rect class="x-usshim" style="--ad:${(2 + r() * 2.4).toFixed(1)}s;--d:-${(r() * 3).toFixed(1)}s" x="${R(560 + r() * 480)}" y="${R(680 + r() * 190)}" width="${R(14 + r() * 40)}" height="${R(3 + r() * 5)}" rx="2" fill="${['#ff8ac0', '#ffd27a', '#8affd8', '#ffffff'][i % 4]}"/>`;
      return `<defs>${lin(s1, [[0, '#2a5a8a'], [0.4, '#5a9ab0'], [0.7, '#e6b0a0'], [0.9, '#ffd0a0'], [1, '#ffe2b0']])}${lin(w1, [[0, '#7ab8b8'], [0.3, '#2f7a90'], [1, '#143e56']])}</defs>`
        + full(`url(#${s1})`) + stars(14, 30, 260) + sun(1300, 500, 38, '#fff0d0', '#ffb08a') + cloud(300, 230, 1.5, '#e8a8b0', 0.85, 80, 6, '#ffd8c8') + cloud(1100, 150, 1.7, '#d8a0b0', 0.8, 100, 24, '#ffd8c8') + cloud(1450, 340, 1.0, '#e8b0a8', 0.8, 66, 10, '#ffe0c8')
        + birds(8, 4, 500, 300, '#2a4058', 1.2, 700)
        + mv('uspar', { ad: '60s', dx: '8px' }, ridge('#82aeb6', 570, 60, 7, 13) + city(4, -160, 1760, base, 60, 150, 26, 56, '#8cb4bc', '#5f8c9c', 0.3)) + haze(520, 120, '#ffd0b0', 0.55)
        + mv('uspar', { ad: '40s', dx: '12px' }, towers)
        // the tower
        + `<path fill="#e8f4f6" fill-opacity=".35" d="${sil}z"/><path fill="none" stroke="#f2fbfc" stroke-width="2.5" d="${lat}"/><path fill="none" stroke="#c8e4ea" stroke-width="5" d="${rings}"/>`
        + `<path d="M${cx} 150V20" stroke="#c8e4ea" stroke-width="6"/><path d="M${cx} 100V40" stroke="#f2fbfc" stroke-width="3"/>`
        + `<path class="us-lamps" fill="none" stroke="#7affd8" stroke-width="3" d="${lat}"/>` + `<path class="us-lamps" fill="none" stroke="#ff8ad0" stroke-width="5" d="${rings}"/>`
        + `<ellipse cx="${cx}" cy="470" rx="${R(half(470) + 14)}" ry="9" fill="#eaf6f8"/>`
        + mv('usflicker', { ad: '1.4s', to: cx + 'px 20px' }, `<circle cx="${cx}" cy="20" r="6" fill="#ff5a5a"/>`)
        + `<rect x="-160" y="${base}" width="1920" height="260" fill="url(#${w1})"/>` + `<rect x="-160" y="${base - 2}" width="1920" height="8" fill="#ffd0b0" opacity=".5"/>`
        + shimmer(3, 26, 100, 1500, 690, 880, '#ffe0c0', 70) + refl
        + mv('usmove', { ad: '80s', dx: '1500px' }, `<g transform="translate(700 790)"><path fill="#a63a2a" d="M-70 0Q-50 22 0 22Q60 22 80 -4L74 -10H-64z"/><rect x="-28" y="-34" width="64" height="26" fill="#f2d8a0"/><path fill="#c85a30" d="M-36 -34H44L30 -50H-22z"/>${lit(-20, -28, 14, 14)}${lit(2, -28, 14, 14)}</g>`)
        + mv('usbob', { ad: '4s', dy: '3px' }, `<g transform="translate(1180 840)"><path fill="#7a3a2a" d="M-60 0Q-40 18 0 18Q40 18 56 -2L52 -8H-54z"/><path fill="#d8b070" d="M-24 -8V-30H30V-8z"/>${lit(-14, -24, 12, 12)}</g>`)
        // bridge arch
        + `<path d="M1000 ${base - 2}Q1250 520 1500 ${base - 2}" stroke="#e8f0f4" stroke-width="7" fill="none"/>` + dots(`M1000 ${base - 2}Q1250 520 1500 ${base - 2}`, '#ffe0a0', 5, 24, 'us-lamps')
        + `<path fill="#183a48" d="M-160 900V850Q400 830 800 850T1760 840V900z"/>` + dots('M-160 852Q400 832 800 852T1760 842', '#ffd27a', 8, 40, 'us-lamps')
        + `<g fill="#2a6a50">${[0, 1, 2, 3].map((i) => `<path d="M${100 + i * 90} 900Q${90 + i * 90} 800 ${60 + i * 90} 760Q${130 + i * 90} 800 ${150 + i * 90} 900z"/>`).join('')}</g>` + `<g fill="#2a6a50">${mv('ussway', { ad: '5s', to: '1500px 900px' }, `<path d="M1450 900Q1440 810 1410 770Q1480 810 1510 900zM1520 900Q1530 800 1570 760Q1590 820 1580 900z"/>`)}</g>`
        + finish(0.34);
    } });

  /* ---------- Shenzhen: the bay, a morning skyline and its tallest spire ---------- */
  asiaSceneAdd({ key: 'place:shenzhen', label: 'The bay skyline in the morning', site: 'Futian skyline from Shenzhen Bay', colour: 'teal', mood: 'energetic', season: 'any', tags: ['skyline', 'bay', 'modern'],
    svg: () => {
      const s1 = U(), w1 = U(), r = rnd(63), base = 620;
      const spire = `<path fill="#aeccd8" d="M1060 ${base}V250l26-14l26 14V${base}z"/><path fill="#7aa0b4" d="M1086 236l26 14V${base}h-26z" opacity=".55"/><path fill="#e8f4f8" d="M1066 240l20-10l20 10V260H1066z"/><path d="M1086 230V90" stroke="#9ab8c8" stroke-width="5"/><path d="M1086 90V50" stroke="#9ab8c8" stroke-width="2"/>` + win(1066, 270, 40, 340, 9, 16, '#365a78');
      const kk = `<path fill="#c2d8e0" d="M900 ${base}V300h70V${base}z"/><path fill="#9ab8c8" d="M940 300h30V${base}h-30z" opacity=".5"/><path fill="#e8f4f8" d="M900 300l35-70l35 70z"/><path d="M935 230V150" stroke="#9ab8c8" stroke-width="3"/>` + win(906, 318, 58, 290, 10, 16, '#365a78');
      const slant = `<path fill="#b8d0dc" d="M1260 ${base}V380L1380 300V${base}z"/><path fill="#8cb0c4" d="M1330 340L1380 300V${base}h-50z" opacity=".5"/>` + win(1268, 400, 100, 210, 12, 18, '#365a78');
      const crane = (x) => `<path d="M${x} 660V500M${x - 20} 500H${x + 80}M${x + 56} 500V540M${x} 500L${x - 20} 520" stroke="#e8793a" stroke-width="4" fill="none"/><path d="M${x + 56} 540v10" stroke="#555" stroke-width="2"/>`;
      let refl = ''; for (let i = 0; i < 34; i++) refl += `<rect class="x-usshim" style="--ad:${(2 + r() * 2.4).toFixed(1)}s;--d:-${(r() * 3).toFixed(1)}s" x="${R(r() * 1600)}" y="${R(660 + r() * 200)}" width="${R(24 + r() * 70)}" height="${R(3 + r() * 5)}" rx="2" fill="#ffffff" opacity=".7"/>`;
      return `<defs>${lin(s1, [[0, '#3a9ad8'], [0.45, '#8ad2ee'], [0.8, '#d8f0ea'], [1, '#f8f0d0']])}${lin(w1, [[0, '#7ad0d8'], [0.3, '#2c9ab4'], [1, '#126a8c']])}</defs>`
        + full(`url(#${s1})`) + stars(6, 18, 160) + rays(260, 300, 1000, '#fffbe0', 0.14) + sun(260, 300, 46, '#fffef0', '#fff0b0') + cloud(600, 190, 1.5, '#d0e6f0', 0.92, 80, 4) + cloud(1200, 130, 1.8, '#d8ecf4', 0.88, 100, 28) + cloud(1450, 330, 1.0, '#e0f0f4', 0.85, 66, 12) + streak(700, 330, 320, '#fff', 0.55, 80)
        + birds(7, 5, 500, 300, '#2a4a68', 1.2, 700)
        + mv('uspar', { ad: '60s', dx: '8px' }, ridge('#7ab0c4', 540, 80, 7, 9) + ridge('#6aa4b4', 580, 50, 9, 17)) + haze(540, 90, '#e8f6f0', 0.6)
        + mv('uspar', { ad: '40s', dx: '12px' }, city(5, -160, 880, base, 70, 200, 30, 64, '#a4c4d2', '#7a9cb4', 0.5) + city(8, 1420, 1760, base, 70, 180, 30, 64, '#a4c4d2', '#7a9cb4', 0.5) + kk + spire + slant)
        + mv('uspar', { ad: '50s', dx: '6px' }, crane(120) + crane(240))
        + `<rect x="-160" y="${base}" width="1920" height="280" fill="url(#${w1})"/>` + `<rect x="-160" y="${base - 2}" width="1920" height="6" fill="#e8fcf8" opacity=".6"/>`
        + shimmer(9, 24, 0, 1600, 650, 880, '#ffffff', 70) + refl
        // a bridge across the bay
        + `<path d="M-160 700H1760" stroke="#e8f0f4" stroke-width="8"/><path d="M-160 708H1760" stroke="#9ab8c8" stroke-width="3"/>` + [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<path d="M${40 + i * 190} 700V ${712}" stroke="#9ab8c8" stroke-width="6"/>`).join('')
        + mv('usmove', { ad: '40s', dx: '1900px' }, `<rect x="400" y="688" width="48" height="12" fill="#e8793a"/><rect x="452" y="690" width="34" height="10" fill="#2a6aa8"/>`)
        // sailboats
        + mv('usbob', { ad: '5s', dy: '3px' }, `<path fill="#f4f4f0" d="M520 800V730Q600 750 620 800z"/><path fill="#e8c860" d="M510 800V744L470 800z"/><path fill="#2a4a68" d="M450 804h190l-24 20H480z"/>`)
        + mv('usbob', { ad: '6s', d: '-2s', dy: '3px' }, `<path fill="#f4f4f0" d="M1180 770V716Q1240 730 1252 770z"/><path fill="#e87a50" d="M1174 770V726L1144 770z"/><path fill="#2a4a68" d="M1128 774h140l-18 16H1146z"/>`)
        // mangroves
        + `<path fill="#2a6a4a" d="M-160 900V830Q100 790 360 830T800 840V900z"/>` + canopy('#2f7a50', 820, 40, 33, -160, 700, 900) + canopy('#256a44', 850, 36, 41, -160, 900, 900)
        + mv('ussway', { ad: '5s', to: '1400px 900px' }, `<path fill="#2f7a50" d="M1300 900Q1290 810 1250 770Q1330 810 1360 900zM1380 900Q1390 790 1440 750Q1470 820 1450 900zM1480 900Q1500 810 1540 790Q1570 840 1560 900z"/>`)
        + `<path fill="#1a5a40" d="M-160 900V870Q400 850 1000 872T1760 862V900z"/>`
        + finish(0.3);
    } });

  /* ---------- Chengdu: a giant panda in a misty bamboo grove ---------- */
  asiaSceneAdd({ key: 'place:chengdu', label: 'A panda in the bamboo grove', site: 'Giant panda in a bamboo grove', colour: 'green', mood: 'calm', season: 'any', tags: ['panda', 'bamboo', 'forest'],
    svg: () => {
      const s1 = U(), r = rnd(12);
      const stalks = (seed, n, y0, w, cols, sway, dur) => {
        const q = rnd(seed); let o = '';
        for (let i = 0; i < n; i++) {
          const x = R(-100 + q() * 1800), top = R(-60 - q() * 80), ww = w * (0.7 + q() * 0.6), col = cols[i % cols.length];
          let lv = ''; for (let k = 0; k < 4; k++) { const ly = R(top + 80 + k * 110 + q() * 40), s = k % 2 ? 1 : -1; lv += `<path d="M${x} ${ly}q${s * 40} -14 ${s * 80} 10q${-s * 40} 8 ${-s * 80} -10z"/>`; }
          o += mv(sway, { ad: (dur + q() * 3).toFixed(1) + 's', d: -R(q() * 4) + 's', to: `${x}px 900px` }, `<path fill="none" stroke="${col}" stroke-width="${ww.toFixed(1)}" stroke-dasharray="${R(110 + q() * 60)} 5" d="M${x} ${y0}V${top}"/><g fill="${col}" opacity=".9">${lv}</g>`);
        }
        return o;
      };
      const panda = (x, y) => `<g transform="translate(${x} ${y})">`
        + `<ellipse cx="0" cy="-70" rx="92" ry="78" fill="#f6f4ee"/><path fill="#26262c" d="M-92 -76Q-60 -118 0 -112Q60 -118 92 -76Q80 -50 60 -46Q0 -64 -60 -46Q-80 -50 -92 -76z" opacity=".95"/>`
        + `<ellipse cx="-62" cy="-8" rx="30" ry="44" fill="#26262c" transform="rotate(10 -62 -8)"/><ellipse cx="62" cy="-8" rx="30" ry="44" fill="#26262c" transform="rotate(-10 62 -8)"/><ellipse cx="-32" cy="-2" rx="26" ry="20" fill="#f6f4ee"/><ellipse cx="32" cy="-2" rx="26" ry="20" fill="#f6f4ee"/>`
        + `<circle cx="0" cy="-168" r="58" fill="#f6f4ee"/><circle cx="-46" cy="-212" r="20" fill="#26262c"/><circle cx="46" cy="-212" r="20" fill="#26262c"/>`
        + `<ellipse cx="-24" cy="-172" rx="13" ry="18" fill="#26262c" transform="rotate(-25 -24 -172)"/><ellipse cx="24" cy="-172" rx="13" ry="18" fill="#26262c" transform="rotate(25 24 -172)"/><circle cx="-22" cy="-174" r="4" fill="#fff"/><circle cx="26" cy="-174" r="4" fill="#fff"/>`
        + `<ellipse cx="0" cy="-146" rx="14" ry="10" fill="#f0eadc"/><path d="M-8 -154Q0 -148 8 -154z" fill="#26262c"/><path d="M0 -146V-138M-9 -136Q0 -128 9 -136" stroke="#26262c" stroke-width="3" fill="none"/>`
        + `<path fill="none" stroke="#6aa040" stroke-width="12" stroke-linecap="round" d="M-34 -64Q-48 -110 -8 -150"/><path d="M-36 -64Q-50 -100 -14 -140" stroke="#8ac85a" stroke-width="3" fill="none"/></g>`;
      let mist = ''; for (let i = 0; i < 4; i++) mist += streak(300 + i * 360, 470 + (i % 2) * 90, 360, '#f0f8ee', 0.4, 70 + i * 8);
      let ferns = ''; for (let i = 0; i < 16; i++) { const x = R(-80 + i * 120 + r() * 40); ferns += `<path d="M${x} 900Q${x - 20} 830 ${x - 70} 810Q${x - 10} 840 ${x + 6} 900zM${x} 900Q${x + 20} 820 ${x + 80} 806Q${x + 16} 840 ${x + 14} 900z"/>`; }
      return `<defs>${lin(s1, [[0, '#b8d8c0'], [0.5, '#d8ecd2'], [1, '#eef4d8']])}</defs>` + full(`url(#${s1})`) + rays(160, -40, 1100, '#fffbd8', 0.2) + rays(560, -80, 900, '#fffbd8', 0.14)
        + stars(4, 14, 80) + mv('uspar', { ad: '60s', dx: '10px' }, ridge('#9cc0a4', 560, 120, 6, 9) + stalks(1, 16, 700, 10, ['#9cc4a0', '#a8ccaa'], 'ussway2', 7)) + mist
        + mv('uspar', { ad: '46s', dx: '12px' }, stalks(2, 16, 760, 15, ['#6aa464', '#74ae6a', '#5e9a5e'], 'ussway2', 8)) + haze(520, 200, '#f4faee', 0.5)
        + `<path fill="#6a8a50" d="M-160 900V700Q300 660 800 700T1760 690V900z"/><path fill="#7aa05a" d="M-160 900V760Q400 730 900 770T1760 750V900z"/>`
        + `<path fill="#8a6a48" d="M880 770Q1000 730 1180 760Q1260 790 1240 830Q1000 850 880 830z"/><path fill="#a08060" d="M880 770Q1000 730 1180 760Q1140 750 1000 760Q930 770 880 790z" opacity=".7"/>`
        + `<path fill="#7ab0c0" d="M-160 860Q300 820 700 850T1100 860V900H-160z" opacity=".85"/>` + shimmer(5, 10, -100, 800, 850, 895, '#fff', 40)
        + mv('ussway2', { ad: '7s', to: '1060px 800px' }, panda(1060, 790))
        + mv('uspuff', { ad: '6s', dx: '30px', dy: '-70px', sc: '2' }, `<circle cx="1230" cy="640" r="10" fill="#fff" opacity=".4"/>`)
        + mv('uspar', { ad: '30s', dx: '20px' }, stalks(3, 8, 960, 28, ['#3f7a44', '#488450'], 'ussway2', 9))
        + `<g fill="#3a7a3a">${mv('ussway', { ad: '5s', to: '700px 900px' }, ferns)}</g>`
        + `<g fill="#e8f4a0" opacity=".7">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<circle class="x-usfall" style="--ad:${14 + i * 2}s;--d:-${i * 3}s;--dx:${50 + i * 10}px" cx="${120 + i * 230}" cy="120" r="2.4"/>`).join('')}</g>`
        + birds(5, 2, 400, 250, '#4a6a58', 0.9, 500)
        + finish(0.3);
    } });

  /* ---------- Chongqing: stilted cliffside houses over the river at dusk ---------- */
  asiaSceneAdd({ key: 'place:chongqing', label: 'The cliffside stilt houses at dusk', site: 'Stilted houses on the river cliff', colour: 'amber', mood: 'dreamy', season: 'any', tags: ['river', 'cliff', 'lanterns'],
    svg: () => {
      const s1 = U(), w1 = U(), c1 = U(), r = rnd(29);
      const tierBld = (x, y, w, h, wall) => `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${wall}"/><rect x="${x}" y="${y - h}" width="${w}" height="7" fill="#5a2a20"/>` + [0, 1, 2, 3, 4, 5].filter((i) => 16 + i * 24 < w - 14).map((i) => lit(x + 12 + i * 24, y - h + 18, 14, h - 30)).join('') + eave(R(x + w / 2), y - h, w + 20, 26, '#4a3a38', '#e8a040') + `<path stroke="#e8a040" stroke-width="3" d="M${x} ${y - h + 10}h${w}" opacity=".0"/>`;
      let stil = '', build = '', lant = '';
      for (let i = 0; i < 9; i++) { const x = R(150 + i * 66); stil += `M${x} 560V700`; }
      const rows = [[250, 520, 330, 70], [140, 440, 440, 66], [220, 366, 360, 62], [170, 296, 300, 60], [260, 230, 260, 56]];
      rows.forEach(([x, y, w, h], k) => { build += tierBld(x, y, w, h, k % 2 ? '#c88a4a' : '#b4723c'); });
      build += tierBld(600, 600, 120, 60, '#c88a4a') + tierBld(80, 610, 130, 60, '#b4723c');
      for (let i = 0; i < 10; i++) { const x = R(120 + i * 60), y = R(130 + r() * 380); lant += mv('ussway2', { ad: `${3 + (i % 3)}s`, d: `-${i}s`, to: `${x}px ${y}px` }, `<path d="M${x} ${y}v14" stroke="#7a2a20"/><ellipse cx="${x}" cy="${y + 26}" rx="8" ry="12" fill="#d8321e"/><ellipse class="us-lit" cx="${x}" cy="${y + 26}" rx="5" ry="8"/>`); }
      let refl = ''; for (let i = 0; i < 22; i++) refl += `<rect class="x-usshim" style="--ad:${(2 + r() * 2.4).toFixed(1)}s;--d:-${(r() * 3).toFixed(1)}s" x="${R(840 + r() * 760)}" y="${R(730 + r() * 150)}" width="${R(14 + r() * 50)}" height="${R(3 + r() * 5)}" rx="2" fill="${i % 2 ? '#ffb040' : '#ff7a50'}"/>`;
      let stays = ''; for (let k = 1; k <= 7; k++) stays += `M1330 250L${1330 - k * 70} 600M1330 250L${1330 + k * 70} 600`;
      return `<defs>${lin(s1, [[0, '#2e3c78'], [0.35, '#5a5a98'], [0.62, '#d07a8a'], [0.85, '#ffb07a'], [1, '#ffd08a']])}${lin(w1, [[0, '#8a6a88'], [0.25, '#4a4678'], [1, '#1c2250']])}${lin(c1, [[0, '#6a5a58'], [1, '#3a302e']])}</defs>`
        + full(`url(#${s1})`) + stars(18, 40, 250) + sun(1180, 480, 36, '#ffeed0', '#ff9a7a') + cloud(500, 200, 1.6, '#b86a98', 0.85, 80, 6, '#f0a0a8') + cloud(1200, 150, 1.8, '#a860a0', 0.85, 90, 26, '#f0a8b0') + streak(900, 320, 360, '#ffa0a8', 0.4, 80)
        + birds(5, 3, 1100, 300, '#2a2048', 1.1, 600)
        + mv('uspar', { ad: '60s', dx: '8px' }, ridge('#6a5c94', 470, 90, 7, 3) + city(13, 900, 1760, 560, 130, 330, 30, 60, '#7a6aa0', '#524a84', 0.5) + city(14, -160, 100, 560, 100, 240, 30, 60, '#7a6aa0', '#524a84', 0.5)) + haze(430, 150, '#ffb8a0', 0.5)
        + mv('uspar', { ad: '44s', dx: '10px' }, city(15, 700, 1300, 640, 80, 260, 34, 70, '#6a5c98', '#46407a', 0.55) + city(16, 1420, 1760, 640, 80, 220, 34, 70, '#6a5c98', '#46407a', 0.55))
        // the bridge
        + `<path d="M900 600H1760" stroke="#e0d8e8" stroke-width="9"/><path d="M1330 600V250" stroke="#e0d8e8" stroke-width="12"/><path d="M1330 250V200" stroke="#e0d8e8" stroke-width="4"/><path d="${stays}" stroke="#e0d8e8" stroke-width="2" fill="none" opacity=".8"/>` + dots('M900 596H1760', '#ffd27a', 5, 26, 'us-lamps')
        // the cliff, stilts and houses
        + `<path fill="url(#${c1})" d="M-160 900V240Q60 200 120 260Q150 460 120 700Q300 760 560 740Q700 730 800 900z"/><path fill="none" stroke="#2a2220" stroke-width="3" opacity=".5" d="M-100 320Q40 380 70 500M-60 600Q60 640 100 720"/>`
        + `<path fill="none" stroke="#5a3a2a" stroke-width="7" d="${stil}"/>` + build
        + `<rect x="120" y="652" width="620" height="16" fill="#8a5a38"/>` + dots('M120 648H740', '#ffb040', 6, 18, 'us-lamps') + lant
        + `<rect x="-160" y="700" width="1920" height="200" fill="url(#${w1})" opacity="0"/>`
        + `<path fill="url(#${w1})" d="M780 900Q700 760 800 700H1760V900z"/>` + shimmer(2, 14, 860, 1700, 720, 880, '#ffd0a0', 60) + refl
        + mv('usmove', { ad: '70s', dx: '500px' }, ship(1150, 790, 180, '#1c2040', '#e0d0d0') + `<path d="M890 806H1100" stroke="#fff" stroke-width="3" class="x-usshim" opacity=".4"/>`)
        + mv('usbob', { ad: '5s', dy: '3px' }, `<g transform="translate(1180 850)"><path fill="#5a3a2a" d="M-50 0Q-30 16 0 16Q40 16 56 -4L50 -8H-44z"/><path fill="#e8a040" d="M-18 -8V-26H24V-8z"/>${lit(-8, -22, 10, 10)}</g>`)
        + `<path fill="#2a2220" d="M-160 900V850Q300 820 700 880V900z"/>`
        + finish(0.32);
    } });

  /* ---------- Wuhan: the Yellow Crane Tower among cherry blossom ---------- */
  asiaSceneAdd({ key: 'place:wuhan', label: 'The Yellow Crane Tower in spring', site: 'Yellow Crane Tower above the Yangtze', colour: 'pink', mood: 'proud', season: 'any', tags: ['tower', 'cherry blossom', 'yangtze'],
    svg: () => {
      const s1 = U(), w1 = U(), r = rnd(37), cx = 760;
      let tw = '';
      const tiers = [[420, 540], [350, 460], [290, 390], [240, 330], [190, 270]];
      let y = 640;
      tiers.forEach(([w], i) => {
        const wh = 48 - i * 3, ww = w - 40;
        tw += `<rect x="${cx - ww / 2}" y="${y - wh}" width="${ww}" height="${wh}" fill="#c8402a"/><rect x="${cx - ww / 2}" y="${y - wh}" width="${ww}" height="7" fill="#e8c050"/>`;
        for (let k = 0; k <= 6; k++) tw += `<rect x="${R(cx - ww / 2 + 6 + k * (ww - 18) / 6)}" y="${y - wh + 8}" width="8" height="${wh - 8}" fill="#8a2018"/>`;
        tw += lit(cx - 22, y - wh + 12, 44, wh - 14) + lit(cx - ww / 2 + 20, y - wh + 12, 30, wh - 14) + lit(cx + ww / 2 - 50, y - wh + 12, 30, wh - 14);
        tw += eave(cx, y - wh, w + 50, 52 + (i === 4 ? 40 : 0), '#e8b830', '#b8801a');
        tw += `<path fill="#b8801a" opacity=".45" d="M${cx + 20} ${y - wh - 8}L${cx + w / 2 + 30} ${y - wh - 12}Q${cx + w / 2 + 6} ${y - wh + 10} ${cx} ${y - wh + 10}z"/>`;
        y -= wh + 36 + (i === 3 ? 4 : 0);
      });
      const topY = y + 30;
      const bloom = (x, yy, rad, a, b) => { let o = ''; for (let i = 0; i < 18; i++) o += `<circle cx="${R(x + (r() - 0.5) * rad * 2)}" cy="${R(yy + (r() - 0.5) * rad * 1.3)}" r="${R(rad * (0.18 + r() * 0.24))}" fill="${i % 3 ? a : b}"/>`; return o; };
      let petals = ''; for (let i = 0; i < 26; i++) petals += `<ellipse class="x-usfall" style="--ad:${9 + (i % 6) * 2}s;--d:-${i % 12}s;--dx:${40 + (i % 5) * 30}px" cx="${R(r() * 1600)}" cy="${R(r() * 300)}" rx="6" ry="3.5" fill="${i % 2 ? '#ffd0dc' : '#fff'}"/>`;
      let stays = ''; for (let k = 0; k < 8; k++) stays += `M${1210 + k * 52} 620V${560 - (k % 2) * 30}`;
      return `<defs>${lin(s1, [[0, '#8ab4e0'], [0.4, '#cfd8ee'], [0.75, '#f8e0e4'], [1, '#fff2dc']])}${lin(w1, [[0, '#d8dcec'], [0.3, '#8aa4c4'], [1, '#4a6a94']])}</defs>`
        + full(`url(#${s1})`) + stars(3, 14, 120) + sun(1380, 250, 36, '#fffdf0', '#fff0d0') + cloud(300, 200, 1.5, '#f0d8e4', 0.9, 80, 6) + cloud(1000, 130, 1.8, '#f6e4ea', 0.88, 100, 28) + cloud(1450, 380, 1.0, '#f0dce6', 0.85, 66, 12) + streak(600, 330, 340, '#fff', 0.55, 80)
        + birds(6, 4, 1100, 320, '#4a5470', 1.2, 700)
        + mv('uspar', { ad: '60s', dx: '8px' }, ridge('#b6c4dc', 590, 60, 7, 11) + ridge('#a2b4d0', 620, 40, 9, 5)) + haze(560, 120, '#f6eaf0', 0.6)
        // the Yangtze river bridge in the mist
        + mv('uspar', { ad: '50s', dx: '6px' }, `<path d="M1000 620H1760" stroke="#98a8c4" stroke-width="9"/><path d="M1090 620V540H1700V620" stroke="#98a8c4" stroke-width="5" fill="none"/><path d="M1090 540L1160 620L1230 540L1300 620L1370 540L1440 620L1510 540L1580 620L1650 540" stroke="#98a8c4" stroke-width="3" fill="none"/><path d="M1090 620V700M1380 620V700M1700 620V700" stroke="#98a8c4" stroke-width="12"/>` + city(24, 1000, 1760, 640, 40, 120, 28, 56, '#a8b4d0', '#8494b8', 0.0))
        + `<rect x="-160" y="640" width="1920" height="260" fill="url(#${w1})"/>` + shimmer(8, 22, -100, 1700, 660, 880, '#ffffff', 70)
        + mv('usmove', { ad: '80s', dx: '1500px' }, ship(1000, 730, 200, '#3a4a6a', '#f0eef0') + `<path d="M990 746H1220" stroke="#fff" stroke-width="3" class="x-usshim" opacity=".5"/>`)
        + mv('usmove', { ad: '100s', d: '-40s', dx: '1500px' }, ship(300, 700, 120, '#4a5a7a', '#f0eef0'))
        // the hill, terrace and the tower
        + `<path fill="#9ab07a" d="M-160 900V700Q200 560 480 610Q760 650 1000 640T1500 700L1760 900z"/><path fill="#7a9a5a" d="M-160 900V780Q300 700 700 740T1760 800V900z"/>`
        + `<rect x="${cx - 280}" y="636" width="560" height="26" fill="#d8d0c0"/><rect x="${cx - 250}" y="662" width="500" height="40" fill="#c8c0b0"/><path stroke="#a8a090" stroke-width="2" d="M${cx - 250} 676H${cx + 250}M${cx - 250} 690H${cx + 250}" opacity=".7"/>`
        + `<path fill="#d8d0c0" d="M${cx - 60} 702h120l30 90h-180z"/><path stroke="#a8a090" stroke-width="2" d="${[0, 1, 2, 3, 4, 5].map((i) => `M${cx - 60 - i * 5} ${702 + i * 15}h${120 + i * 10}`).join('')}" opacity=".7"/>`
        + tw + `<path d="M${cx} ${topY + 10}V${topY - 30}" stroke="#b8801a" stroke-width="5"/><circle cx="${cx}" cy="${topY - 36}" r="8" fill="#e8b830"/>`
        // cherry blossom, both sides
        + `<path fill="#5a3a30" d="M80 900Q120 700 60 540Q140 640 160 560Q150 760 200 900zM1480 900Q1440 740 1500 560Q1520 680 1580 600Q1550 760 1540 900z"/>`
        + mv('ussway2', { ad: '8s', to: '120px 900px' }, `<g>${bloom(120, 500, 210, '#ffc0d2', '#ffe8ee')}${bloom(40, 640, 150, '#f8a8c0', '#ffd8e4')}${bloom(230, 560, 150, '#ffd0dc', '#fff2f6')}</g>`)
        + mv('ussway2', { ad: '9s', d: '-3s', to: '1520px 900px' }, `<g>${bloom(1510, 480, 220, '#ffc0d2', '#ffe8ee')}${bloom(1420, 620, 160, '#f8a8c0', '#ffd8e4')}${bloom(1600, 560, 160, '#ffd0dc', '#fff2f6')}</g>`)
        + `<path fill="#5f8a48" d="M-160 900V850Q300 830 800 860T1760 850V900z"/><g>${petals}</g>`
        + finish(0.3);
    } });
})();
