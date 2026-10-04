/* ============================================================
   ASIA FULL-SCREEN SCENES, batch 7 (Islamabad, Dhaka, Colombo, Kathmandu, Thimphu, Male, Kabul, China, Japan,
   South Korea, North Korea). PURE classic script: registers entries with asiaSceneAdd() (71-anim-asia.js).
   Each svg() returns the inside of a 1600 x 900 drawing, layered, with drifting far / mid / near layers, the
   landmark, foreground and ambient life. Daytime colours; the evening grade lights the us-lit / us-lamps / us-star
   classes. Landscape, skyline and architecture only. Motion is transform and opacity only.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish } = K;

  /** A fir / pine: three stacked tiers on a trunk, foot at (x, y). */
  const pine = (x, y, s, c) => `<path fill="${c}" d="M${x} ${R(y - 150 * s)}l${R(26 * s)} ${R(56 * s)}h${-R(12 * s)}l${R(34 * s)} ${R(54 * s)}h${-R(18 * s)}l${R(40 * s)} ${R(40 * s)}H${R(x - 56 * s)}l${R(40 * s)} ${-R(40 * s)}h${-R(18 * s)}l${R(34 * s)} ${-R(54 * s)}h${-R(12 * s)}z"/><rect x="${R(x - 4 * s)}" y="${R(y - 2)}" width="${R(8 * s)}" height="${R(14 * s)}" fill="#3a2a22"/>`;
  /** A palm: curved trunk and a fan of fronds, foot at (x, y), height h. */
  const palm = (x, y, h, lean, c, tc) => {
    const tx = x + lean, ty = y - h; let f = '';
    for (let i = 0; i < 7; i++) { const a = (-160 + i * 50) * Math.PI / 180, l = h * 0.4; f += `M${tx} ${ty}Q${R(tx + Math.cos(a) * l * 0.6)} ${R(ty + Math.sin(a) * l * 0.6 - l * 0.35)} ${R(tx + Math.cos(a) * l)} ${R(ty + Math.sin(a) * l * 0.5 + l * 0.3)}`; }
    return `<path d="M${x} ${y}Q${x + lean * 0.2} ${R(y - h * 0.6)} ${tx} ${ty}" stroke="${tc}" stroke-width="${R(h / 16)}" fill="none" stroke-linecap="round"/>`
      + mv('ussway2', { ad: '5s', to: `${tx}px ${ty}px` }, `<path d="${f}" stroke="${c}" stroke-width="${R(h / 14)}" fill="none" stroke-linecap="round"/>`);
  };
  /** A slim minaret: shaft, balconies, pointed cap and a thin finial. */
  const minaret = (x, top, base, w, fill, shade, cap) => `<rect x="${x - w / 2}" y="${top}" width="${w}" height="${base - top}" fill="${fill}"/><rect x="${x}" y="${top}" width="${w / 2}" height="${base - top}" fill="${shade}" opacity=".5"/>`
    + `<rect x="${x - w}" y="${top + 30}" width="${w * 2}" height="7" fill="${fill}"/><rect x="${x - w * 0.8}" y="${top + 90}" width="${w * 1.6}" height="6" fill="${fill}"/>`
    + `<path fill="${cap}" d="M${x - w * 0.8} ${top}L${x} ${R(top - w * 3)}L${x + w * 0.8} ${top}z"/><path d="M${x} ${R(top - w * 3)}v${-R(w * 1.2)}" stroke="${cap}" stroke-width="2"/>`;
  /** Falling petals / leaves: n shapes dropping at different speeds. */
  const fall = (seed, n, cols, smin, smax, dmin, dmax) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) o += `<ellipse class="x-usfall" style="--ad:${R(dmin + r() * (dmax - dmin))}s;--d:-${R(r() * 16)}s;--dx:${R(-80 + r() * 160)}px" cx="${R(-40 + r() * 1700)}" cy="${R(r() * 160)}" rx="${(smin + r() * (smax - smin)).toFixed(1)}" ry="${(smin * 0.6 + r() * (smax - smin) * 0.6).toFixed(1)}" fill="${cols[i % cols.length]}"/>`;
    return o;
  };
  /** A scatter of small leaf blobs (blossom / autumn crowns) inside a box. */
  const blobs = (seed, n, x0, y0, x1, y1, r0, r1, cols) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) o += `<circle cx="${R(x0 + r() * (x1 - x0))}" cy="${R(y0 + r() * (y1 - y0))}" r="${R(r0 + r() * (r1 - r0))}" fill="${cols[i % cols.length]}"/>`;
    return o;
  };

  /* ---------- Islamabad: the great tent-shaped mosque beneath the Margalla Hills ---------- */
  asiaSceneAdd({ key: 'place:islamabad', label: 'The Margalla Hills and the mosque', site: 'Faisal Mosque and the Margalla Hills', colour: 'teal', mood: 'calm', season: 'any', tags: ['mosque', 'hills', 'architecture'],
    svg: () => {
      const s1 = U(), g1 = U(), f1 = U(), W = '#f4f1ea', S = '#cfc9bc', D = '#a9a395';
      let facets = '';
      for (let i = 1; i < 6; i++) facets += `M${800 - i * 40} ${640 - i * 43}L${800 + i * 40} ${640 - i * 43}`;
      return `<defs>${lin(s1, [[0, '#6aa2d6'], [0.55, '#bcd9ec'], [1, '#fbe8c8']])}${lin(g1, [[0, '#d9d3c4'], [1, '#b9b3a2']])}${radU(f1, [[0, '#fff1c8', 0.6], [1, '#fff1c8', 0]], 1330, 250, 520)}</defs>`
        + full(`url(#${s1})`) + `<rect width="1600" height="900" fill="url(#${f1})"/>` + stars(3, 24, 200)
        + sun(1330, 220, 38, '#fffbe6', '#fff0b8', true)
        + cloud(360, 220, 1.1, '#cfe0ee', 0.85, 70, 5) + cloud(1380, 150, 0.9, '#d7e6f2', 0.8, 85, 30) + cloud(820, 130, 0.8, '#d9e8f3', 0.7, 95, 50)
        + birds(5, 5, 400, 300, '#3a4a58', 1.1, 600)
        + mv('uspar', { ad: '60s', dx: '10px' }, ridge('#8aa2b4', 470, 70, 9, 41, 700) + haze(430, 120, '#dbe9f2', 0.55))
        + mv('uspar', { ad: '44s', dx: '16px' }, ridge('#5f8872', 540, 80, 11, 52, 700) + canopy('#4f7a62', 560, 14, 17, -160, 1760, 700) + haze(540, 90, '#e6efe8', 0.4))
        + mv('uspar', { ad: '34s', dx: '8px' }, `<path fill="#3f6a52" d="M-160 640Q200 600 500 628T1000 618T1760 630V720H-160z"/>` + canopy('#2f5a44', 620, 22, 23, -160, 560, 720) + canopy('#2f5a44', 620, 22, 24, 1040, 1760, 720))
        // the mosque: four slim minarets and the tent-like prayer hall
        + minaret(420, 250, 660, 24, W, D, '#d6d0c2') + minaret(1180, 250, 660, 24, W, D, '#d6d0c2') + minaret(560, 330, 650, 20, W, D, '#d6d0c2') + minaret(1040, 330, 650, 20, W, D, '#d6d0c2')
        + `<path fill="${W}" d="M520 650L800 360L1080 650z"/><path fill="${S}" d="M800 360L1080 650H800z"/><path fill="${D}" d="M800 360L1080 650H940z" opacity=".5"/>`
        + `<path fill="none" stroke="${D}" stroke-width="3" d="${facets}M800 360V650M660 505L800 650M940 505L800 650M720 450L650 650M880 450L950 650M680 650V560M920 650V560"/>`
        + `<path fill="#fffdf6" d="M800 360L842 410H758z"/><path fill="${W}" d="M470 650h660v22H470z"/><path fill="${D}" d="M470 672h660v10H470z"/>`
        + `<path fill="#1f5b7a" d="M740 650V590Q800 548 860 590V650z"/>` + lit(756, 600, 18, 44) + lit(791, 596, 18, 48) + lit(826, 600, 18, 44)
        + lit(580, 620, 14, 24) + lit(630, 620, 14, 24) + lit(956, 620, 14, 24) + lit(1006, 620, 14, 24)
        + mv('usglow', { ad: '5s', to: '800px 360px' }, '<circle cx="800" cy="352" r="8" fill="#f4d98a"/>')
        // the plaza, steps and a long pool
        + `<path fill="url(#${g1})" d="M-160 682H1760V900H-160z"/><path fill="#8fb7cc" d="M300 770H1300L1440 860H160z" opacity=".75"/><path fill="#fff" opacity=".4" d="M300 770H1300L1320 790H280z"/>`
        + shimmer(7, 26, 200, 1400, 775, 855, '#ffffff', 70) + puffs(520, 782, 3, '#ffffff', 10, 0, 3.4, -60, 2.2) + puffs(1080, 782, 3, '#ffffff', 10, 0, 3.4, -60, 2.2)
        + `<path d="M-160 700H1760" stroke="#a9a395" stroke-width="2"/>` + dots('M-120 704H1720', '#fff3cc', 4, 70, 'us-lamps')
        + mv('ussway2', { ad: '7s', to: '120px 900px' }, pine(120, 900, 1.5, '#2d5a43') + pine(1480, 900, 1.6, '#2d5a43') + pine(240, 900, 1.1, '#33664c'))
        + finish(0.3);
    } });

  /* ---------- Dhaka: the pink palace on the river at sunset ---------- */
  asiaSceneAdd({ key: 'place:dhaka', label: 'The pink palace on the Buriganga', site: 'Ahsan Manzil and the Buriganga', colour: 'pink', mood: 'energetic', season: 'any', tags: ['palace', 'river', 'boats'],
    svg: () => {
      const s1 = U(), w1 = U(), g1 = U(), P = '#e69091', Pd = '#c46c76', Wh = '#fbeee6';
      let arches = '', lits = '';
      for (let x = 420; x < 1200; x += 52) { if (x + 30 > 684 && x < 916) continue; arches += `<path fill="#6a2f42" d="M${x} 612V578Q${x + 14} 556 ${x + 28} 578V612z"/>`; lits += lit(x + 6, 576, 16, 34); }
      for (let x = 430; x < 1190; x += 52) if (!(x + 26 > 684 && x < 916)) arches += `<path fill="#6a2f42" d="M${x} 540V512Q${x + 12} 494 ${x + 24} 512V540z"/>` + lit(x + 5, 510, 14, 28);
      const boat = (x, y, s, hull, sail) => `<g transform="translate(${x} ${y}) scale(${s})"><path fill="${hull}" d="M-90 0Q-40 22 40 22Q90 18 104 -14Q60 4 -90 -8z"/><path fill="#3a2530" d="M-70 -6h120v-14h-120z" opacity=".9"/>${sail ? `<path fill="${sail}" d="M-10 -20L-10 -90L50 -20z"/><path stroke="#3a2530" stroke-width="3" d="M-10 -20V-96"/>` : `<path fill="#8a5a44" d="M-40 -20Q-5 -52 40 -20z"/>`}</g>`;
      return `<defs>${lin(s1, [[0, '#5a4f90'], [0.35, '#d07a98'], [0.7, '#ffa878'], [1, '#ffd890']])}${lin(w1, [[0, '#f0a080'], [0.3, '#a8607c'], [1, '#463a64']])}${lin(g1, [[0, '#ffd6a0', 0.8], [1, '#ffd6a0', 0]])}</defs>`
        + full(`url(#${s1})`) + stars(11, 30, 220) + rays(640, 560, 1100, '#ffd9a0', 0.12) + sun(640, 560, 56, '#fff3d0', '#ffb070')
        + streak(300, 180, 320, '#ffc4b0', 0.5) + streak(1250, 260, 300, '#ff9c88', 0.55, 70) + cloud(1300, 360, 1.0, '#d27a92', 0.8, 60, 10, '#ffc2a8') + cloud(380, 400, 0.9, '#cc7890', 0.75, 70, 40, '#ffc8b0')
        + birds(2, 6, 900, 330, '#4a2f48', 1.1, 700)
        + mv('uspar', { ad: '42s', dx: '8px' }, `<g fill="#a27aa0">` + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => { const x = -140 + i * 170, h = 70 + (i * 37) % 90; return `<rect x="${x}" y="${600 - h}" width="${70 + (i * 13) % 50}" height="${h}"/>`; }).join('') + `</g>` + haze(520, 110, '#ffd3b0', 0.55))
        // the palace: long front, central domed hall, twin wings
        + `<rect x="360" y="500" width="880" height="140" fill="${P}"/><rect x="360" y="634" width="880" height="14" fill="${Wh}"/><rect x="360" y="494" width="880" height="10" fill="${Wh}"/><rect x="360" y="500" width="880" height="140" fill="${Pd}" opacity=".18"/>`
        + arches + lits
        + `<rect x="690" y="430" width="220" height="214" fill="${P}"/><rect x="690" y="424" width="220" height="10" fill="${Wh}"/><path fill="${Wh}" d="M690 424V400h220v24z"/>`
        + `<path fill="#6a2f42" d="M770 644V560Q800 520 830 560V644z"/><path fill="#6a2f42" d="M710 590V520Q740 490 770 520V590zM830 590V520Q860 490 890 520V590z" opacity=".9"/>` + lit(716, 530, 48, 50) + lit(836, 530, 48, 50) + lit(784, 568, 32, 64)
        + `<path fill="${Wh}" d="M706 400h188l-12 -30h-164z"/><path fill="${Pd}" d="M722 370h156v-34h-156z"/><path fill="${Wh}" d="M718 336Q800 230 882 336z"/><path fill="${Pd}" d="M800 232Q870 262 882 336H800z" opacity=".25"/><path d="M800 232V184" stroke="${Wh}" stroke-width="4"/><circle cx="800" cy="180" r="9" fill="#e6c36a"/>`
        + lit(740, 342, 14, 22) + lit(846, 342, 14, 22) + lit(793, 342, 14, 22)
        + `<path fill="${Wh}" d="M590 640V600h20v40zM990 640V600h20v40z"/><path fill="${Wh}" d="M720 648H880l30 52H690z"/><path fill="#e9d8cc" d="M690 700H910V712H690z"/>`
        // waterfront, river and boats
        + `<path fill="#9a8478" d="M-160 700H1760V730H-160z"/><path fill="#c8b09a" d="M-160 690H1760V702H-160z"/>` + dots('M-160 716H1760', '#ffe3b0', 5, 46, 'us-lamps')
        + `<rect y="728" width="1600" height="172" fill="url(#${w1})"/><rect y="728" width="1600" height="50" fill="url(#${g1})"/>`
        + shimmer(5, 34, 300, 1000, 735, 880, '#ffe6b0', 80) + shimmer(6, 22, -100, 1700, 800, 890, '#f0b090', 100)
        + mv('usmove', { ad: '80s', dx: '2000px' }, mv('usbob', { ad: '3s', dy: '4px' }, boat(600, 790, 1.1, '#3a2538', '#f3dcc0')))
        + mv('usmove', { ad: '100s', d: '-40s', dx: '2000px' }, mv('usbob', { ad: '3.6s', dy: '4px' }, boat(1000, 840, 1.4, '#2e2038', '')))
        + mv('usbob', { ad: '3.4s', dy: '5px' }, boat(1380, 812, 0.9, '#4a2c3e', '#f6e0c4'))
        + mv('ussway2', { ad: '6s', to: '1500px 730px' }, palm(1500, 730, 220, 30, '#2e4a3a', '#4a3a30') + palm(1420, 730, 160, -24, '#365a44', '#4a3a30'))
        + mv('ussway2', { ad: '7s', to: '120px 730px' }, palm(120, 730, 250, 26, '#2e4a3a', '#4a3a30') + palm(220, 730, 170, -20, '#365a44', '#4a3a30'))
        + finish(0.34);
    } });

  /* ---------- Colombo: the lotus tower and the sea at sunset ---------- */
  asiaSceneAdd({ key: 'place:colombo', label: 'The lotus tower and Galle Face', site: 'The Lotus Tower and the Galle Face seafront', colour: 'orange', mood: 'dreamy', season: 'any', tags: ['tower', 'sea', 'sunset'],
    svg: () => {
      const s1 = U(), w1 = U(), g1 = U(), tc = '#c9ccd6';
      let petals = '';
      for (let i = 0; i < 7; i++) { const a = -60 + i * 20, x = 1030; petals += `<path fill="${i % 2 ? '#e6a4c0' : '#f2b8d0'}" stroke="#c47a9c" stroke-width="1.5" d="M${x} 334Q${R(x + a * 1.1)} 290 ${R(x + a * 0.7)} 232Q${R(x + a * 0.15)} 282 ${x} 334z"/>`; }
      const ship = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><path fill="${c}" d="M-90 0H90L74 -16H-74z"/><rect x="-60" y="-34" width="90" height="18" fill="#9a4a42"/><rect x="-46" y="-48" width="40" height="14" fill="#c9bfb0"/><rect x="38" y="-30" width="28" height="14" fill="#3f6a8a"/></g>`;
      return `<defs>${lin(s1, [[0, '#6a4a8e'], [0.3, '#d8689a'], [0.6, '#ff9a6a'], [1, '#ffd58a']])}${lin(w1, [[0, '#ffb070'], [0.25, '#c8688a'], [1, '#3e3a70']])}${lin(g1, [[0, '#ffd49a', 0.85], [1, '#ffd49a', 0]])}${linU('tw' + g1, [[0, '#e8eaf0'], [1, '#a8aab8']], 0, 330, 0, 700)}</defs>`
        + full(`url(#${s1})`) + stars(8, 34, 220) + rays(420, 580, 1100, '#ffd09a', 0.12) + sun(420, 590, 60, '#fff1c8', '#ff9a60')
        + streak(260, 190, 330, '#ffbea0', 0.5) + streak(1240, 160, 340, '#ff9c8c', 0.5, 66) + cloud(840, 330, 1.1, '#cf6a8e', 0.8, 62, 6, '#ffbea0') + cloud(1380, 470, 0.9, '#c8688a', 0.75, 70, 34, '#ffc4a0') + cloud(130, 440, 0.8, '#cc6c90', 0.75, 76, 20, '#ffc4a8')
        + birds(4, 6, 700, 300, '#4a2a48', 1.1, 700)
        + mv('uspar', { ad: '46s', dx: '8px' }, `<g fill="#9e6a98">` + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<rect x="${560 + i * 74}" y="${600 - 60 - (i * 41) % 110}" width="${44 + (i * 17) % 34}" height="${260}"/>`).join('') + `<rect x="1180" y="430" width="48" height="190"/><rect x="1236" y="410" width="48" height="210"/></g>` + haze(540, 100, '#ffc8a0', 0.5))
        // the lotus tower: tall tapering shaft, a bulb of petals, and a spire
        + `<path fill="url(#tw${g1})" d="M1018 700L1024 400L1030 330L1036 400L1042 700z"/><path d="M1030 330V150" stroke="${tc}" stroke-width="4"/><path d="M1030 150V104" stroke="#c9c3a8" stroke-width="2"/>`
        + `<path fill="#d6d9e4" d="M1000 400H1060L1068 372H992z"/><path fill="#8fa0c0" d="M992 372H1068L1056 340H1004z"/>` + petals
        + `<ellipse cx="1030" cy="262" rx="26" ry="40" fill="#c2d0e6"/><path fill="#aebcd8" d="M1030 222Q1058 262 1030 302z"/><circle class="us-lit" cx="1030" cy="262" r="10"/><path d="M1030 222V190" stroke="#a8b6d0" stroke-width="6"/>`
        + lit(1022, 346, 16, 8) + lit(1004, 382, 52, 8)
        + mv('usflicker', { ad: '1.8s', to: '1030px 104px' }, '<circle cx="1030" cy="102" r="6" fill="#ff5a4a"/>')
        // sea, ships at anchor
        + `<rect y="610" width="1600" height="290" fill="url(#${w1})"/><rect y="610" width="1600" height="60" fill="url(#${g1})"/>`
        + `<path fill="#563c6e" d="M-160 612H1760V622H-160z" opacity=".5"/>` + ship(260, 640, 0.7, '#3a3258') + ship(640, 634, 0.5, '#4a3a60') + ship(1320, 640, 0.6, '#3a3258')
        + shimmer(5, 38, 100, 800, 625, 800, '#ffe0a8', 80) + shimmer(6, 20, 700, 1700, 700, 880, '#f0a8a0', 90)
        + mv('usmove', { ad: '90s', dx: '2000px' }, mv('usbob', { ad: '2.8s', dy: '4px' }, `<g transform="translate(800 760)"><path fill="#2e2038" d="M-70 0Q0 24 78 -6Q40 4 -70 -12z"/><path d="M-40 -8L-40 -78L26 -8z" fill="#f6dcc0"/><path d="M-40 -8V-84" stroke="#2e2038" stroke-width="3"/><path d="M-60 10Q0 22 70 12" stroke="#2e2038" stroke-width="3" fill="none"/></g>`))
        + mv('usbob', { ad: '3.4s', dy: '4px' }, `<g transform="translate(1250 850) scale(1.3)"><path fill="#2e2038" d="M-70 0Q0 24 78 -6Q40 4 -70 -12z"/><path d="M-40 -8L-40 -78L26 -8z" fill="#f2d0b4"/><path d="M-40 -8V-84" stroke="#2e2038" stroke-width="3"/></g>`)
        // the seafront promenade
        + `<path fill="#6a5248" d="M-160 860H1760V900H-160z"/><path fill="#8a6e5e" d="M-160 850H1760V864H-160z"/>` + dots('M-160 856H1760', '#ffe6b0', 5, 50, 'us-lamps')
        + mv('ussway2', { ad: '6s', to: '1500px 860px' }, palm(1500, 870, 330, -40, '#264a34', '#3e3028') + palm(1380, 870, 250, 30, '#2e5640', '#3e3028'))
        + mv('ussway2', { ad: '7s', to: '110px 860px' }, palm(110, 870, 340, 40, '#264a34', '#3e3028') + palm(230, 870, 230, -26, '#2e5640', '#3e3028'))
        + finish(0.34);
    } });

  /* ---------- Kathmandu: the great white stupa and the Himalaya at dawn ---------- */
  asiaSceneAdd({ key: 'place:kathmandu', label: 'The great stupa and the Himalaya', site: 'Boudhanath Stupa and the Himalaya', colour: 'amber', mood: 'calm', season: 'any', tags: ['stupa', 'himalaya', 'dawn'],
    svg: () => {
      const s1 = U(), g1 = U(), W = '#f6f0e6', Wd = '#cfc4b8', G = '#d9a83a';
      let tiers = '', wheels = '';
      for (let i = 0; i < 13; i++) { const w = 70 - i * 4.2, y = 300 - i * 11; tiers += `<path fill="${i % 2 ? '#c8942c' : G}" d="M${R(800 - w)} ${y}L${R(800 - w + 6)} ${y - 11}H${R(800 + w - 6)}L${R(800 + w)} ${y}z"/>`; }
      for (let x = 420; x < 1190; x += 24) wheels += `M${x} 560v14`;
      const home = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/><rect x="${x - 4}" y="${y - 6}" width="${w + 8}" height="8" fill="#6a3e32"/>` + lit(x + 8, y + 12, 12, 16) + lit(x + w - 22, y + 12, 12, 16) + (h > 70 ? lit(x + 8, y + 44, 12, 16) + lit(x + w - 22, y + 44, 12, 16) : '');
      return `<defs>${lin(s1, [[0, '#5a78b8'], [0.35, '#c4a8cc'], [0.7, '#ffcaa0'], [1, '#ffe8b0']])}${lin(g1, [[0, '#d8c8b0'], [1, '#a89478']])}</defs>`
        + full(`url(#${s1})`) + stars(6, 22, 160) + rays(1150, 400, 1100, '#ffe6b0', 0.12) + sun(1180, 420, 40, '#fffbe6', '#ffe0a0', true)
        + streak(300, 150, 300, '#ffd8c0', 0.5) + cloud(1380, 250, 0.9, '#d2b0d0', 0.8, 70, 12, '#fff0e0') + cloud(260, 330, 1.0, '#d8b4d2', 0.78, 80, 40, '#ffeee0')
        // snow peaks
        + mv('uspar', { ad: '70s', dx: '8px' }, `<path fill="#a8b4d8" d="M-160 520L90 380L190 430L360 280L470 370L600 320L760 450L900 350L1040 300L1200 410L1340 330L1520 420L1760 360V620H-160z"/><path fill="#fff6ee" d="M360 280L430 336L396 330L370 354L346 330L318 342zM1040 300L1100 350L1068 346L1046 368L1022 346L990 356zM600 320L650 360L626 358L606 374L586 360L562 366zM1340 330L1396 372L1366 368L1346 390L1320 368L1290 376z"/>` + haze(430, 130, '#ffe3c8', 0.6))
        + mv('uspar', { ad: '50s', dx: '12px' }, `<path fill="#8a86b0" d="M-160 560Q200 480 520 540T1060 520T1760 560V700H-160z"/>` + canopy('#6a7a7c', 570, 18, 15, -160, 1760, 700) + haze(560, 80, '#ffdcc0', 0.4))
        // houses crowding the stupa square
        + `<g>${home(-60, 590, 90, 90, '#b0705a')}${home(36, 612, 72, 70, '#c6866a')}${home(120, 580, 100, 100, '#a8604c')}${home(236, 606, 80, 76, '#d09676')}${home(1290, 596, 96, 86, '#b8705a')}${home(1396, 580, 84, 100, '#a8604c')}${home(1490, 610, 100, 70, '#c88a6e')}${home(1596, 590, 80, 90, '#b0705a')}</g>`
        // the stupa
        + `<path fill="${Wd}" d="M360 680L400 640H1200L1240 680z"/><path fill="${W}" d="M400 640L440 600H1160L1200 640z"/><path fill="${Wd}" d="M440 600L480 566H1120L1160 600z"/>`
        + `<path fill="${W}" d="M480 566Q480 400 800 330Q1120 400 1120 566z"/><path fill="${Wd}" d="M800 330Q1120 400 1120 566H900Q960 440 800 330z" opacity=".7"/><path fill="#fffdf6" d="M560 520Q580 440 700 390Q640 450 640 540z" opacity=".5"/>`
        + `<path fill="none" stroke="#6a3a30" stroke-width="3" d="${wheels}" opacity=".6"/>`
        + `<rect x="740" y="270" width="120" height="68" fill="${G}"/><rect x="746" y="276" width="108" height="56" fill="#f2d890"/><path fill="${Wd}" d="M800 276h54v56h-54z" opacity=".4"/>` + tiers
        + `<path fill="${G}" d="M780 166h40l8 -18h-56z"/><path d="M800 148V120" stroke="${G}" stroke-width="5"/><circle cx="800" cy="114" r="9" fill="#f2d070"/>`
        + `<path d="M800 114V100" stroke="${G}" stroke-width="3"/>`
        + mv('usglow', { ad: '5s', to: '800px 240px' }, `<rect x="740" y="270" width="120" height="68" fill="#fff1c0" opacity=".25"/>`)
        // lamps ringing the dome and the square
        + dots('M440 660H1160', '#ffd890', 6, 36, 'us-lamps') + dots('M400 700H1200', '#ffd890', 5, 40, 'us-lamps')
        + `<path fill="url(#${g1})" d="M-160 690H1760V900H-160z"/><path fill="#c8b69c" opacity=".7" d="M200 760H1400L1560 900H40z"/><path d="M-160 700H1760" stroke="#8a7458" stroke-width="3" opacity=".5"/>`
        + mv('usglide', { ad: '20s', dx: '700px', dy: '-60px' }, mv('usflap', { ad: '.5s' }, `<path d="M420 460q9 -10 18 0q9 -10 18 0M470 480q7 -8 14 0q7 -8 14 0M400 500q8 -9 16 0q8 -9 16 0" stroke="#e0dad4" stroke-width="3" fill="none" stroke-linecap="round"/>`))
        + birds(9, 5, 1000, 470, '#8a8590', 1.2, 600)
        + (() => { let o = '', p = ''; for (let i = 0; i < 17; i++) { const x = 120 + i * 85; o += mv('usflicker', { ad: (0.5 + (i % 4) * 0.12).toFixed(2) + 's', d: '-' + (i % 5) * 0.1 + 's', to: `${x}px 770px` }, `<path fill="#ffb02e" d="M${x} 770q-6 -10 0 -22q6 12 0 22z"/>`) + `<path fill="#c8a45a" d="M${x - 8} 782h16l-3 -12h-10z"/>`; } for (let y = 800; y < 900; y += 34) p += `M-160 ${y}H1760`; return `<path d="${p}" stroke="#a89478" stroke-width="2" opacity=".5" fill="none"/>` + o; })()
        + mv('usbob', { ad: '2s', dy: '3px' }, `<g fill="#9a96a2"><ellipse cx="560" cy="846" rx="16" ry="9"/><circle cx="574" cy="838" r="6"/><ellipse cx="640" cy="862" rx="16" ry="9"/><circle cx="654" cy="854" r="6"/><ellipse cx="1010" cy="850" rx="16" ry="9"/><circle cx="1024" cy="842" r="6"/></g>`)
        + finish(0.3);
    } });

  /* ---------- Thimphu: the fortress monastery in the valley at dusk ---------- */
  asiaSceneAdd({ key: 'place:thimphu', label: 'The fortress monastery in the valley', site: 'Tashichho Dzong in the Thimphu valley', colour: 'red', mood: 'proud', season: 'any', tags: ['dzong', 'valley', 'mist'],
    svg: () => {
      const s1 = U(), g1 = U(), w1 = U(), Wl = '#f2ece0', Wd = '#d2c8b8', Rd = '#a8402e', Gd = '#d8a238';
      let slits = '', win = '';
      for (let x = 400; x < 1240; x += 40) { win += lit(x + 10, 540, 12, 20) + lit(x + 10, 584, 12, 20); }
      for (let x = 380; x < 1240; x += 20) slits += `M${x} 636l-3 -1`;
      const roof = (x, y, w, h) => `<path fill="${Gd}" d="M${x - w - 16} ${y + h}Q${x - w + 6} ${y + h - 8} ${x - w * 0.6} ${y}L${x} ${y - 8}L${x + w * 0.6} ${y}Q${x + w - 6} ${y + h - 8} ${x + w + 16} ${y + h}z"/><path fill="#8a5a1e" d="M${x - w - 16} ${y + h}h${2 * w + 32}v6h${-2 * w - 32}z"/>`;
      return `<defs>${lin(s1, [[0, '#2f3e72'], [0.4, '#8a78a8'], [0.72, '#f0a888'], [1, '#ffd8a0']])}${lin(g1, [[0, '#4a6a44'], [1, '#2e4632']])}${lin(w1, [[0, '#a8b0cc'], [1, '#5a6890']])}</defs>`
        + full(`url(#${s1})`) + stars(12, 50, 240) + sun(1250, 470, 42, '#fff2cc', '#ffb77a') + cloud(480, 220, 1.2, '#9a88b4', 0.8, 78, 8, '#e0c4d4') + cloud(1280, 190, 1.0, '#a08ab6', 0.8, 84, 40, '#e8c8d0') + streak(820, 300, 320, '#f4b8a0', 0.4, 70)
        + mv('uspar', { ad: '70s', dx: '8px' }, ridge('#8a86b0', 400, 90, 8, 63, 700) + haze(420, 110, '#f0c8c0', 0.5))
        + mv('uspar', { ad: '52s', dx: '12px' }, ridge('#5a6c8a', 480, 100, 10, 71, 700) + canopy('#475c70', 520, 16, 31, -160, 1760, 700) + haze(500, 110, '#d8c0cc', 0.5))
        + mv('uspar', { ad: '38s', dx: '10px' }, `<path fill="#3a5456" d="M-160 560Q200 480 500 540T1100 520T1760 560V720H-160z"/>` + canopy('#2e4a42', 560, 26, 33, -160, 1760, 720))
        // the dzong: tapering white walls, red band, golden roofs, central tower
        + `<path fill="${Wl}" d="M370 650L390 520H1210L1230 650z"/><path fill="${Wd}" d="M900 520H1210L1230 650H900z" opacity=".5"/><rect x="384" y="520" width="832" height="36" fill="${Rd}"/><path d="M384 530H1216M384 546H1216" stroke="#e9cf8c" stroke-width="3"/>`
        + win + `<path fill="#6a3a2c" d="M770 650V590Q800 560 830 590V650z"/><path d="M386 600H1214" stroke="${Wd}" stroke-width="3" opacity=".6"/>`
        + `<rect x="716" y="320" width="168" height="200" fill="${Wl}"/><rect x="716" y="360" width="168" height="26" fill="${Rd}"/><rect x="716" y="470" width="168" height="26" fill="${Rd}"/>` + lit(750, 404, 20, 40) + lit(790, 404, 20, 40) + lit(830, 404, 20, 40)
        + roof(800, 292, 100, 32) + roof(800, 258, 70, 28) + `<path fill="${Wl}" d="M770 258V232h60v26z"/>` + roof(800, 226, 46, 24)
        + `<path d="M800 204V160" stroke="${Gd}" stroke-width="4"/><circle cx="800" cy="154" r="8" fill="${Gd}"/>`
        + roof(470, 500, 70, 24) + roof(1130, 500, 70, 24) + `<rect x="420" y="480" width="100" height="30" fill="${Wl}"/><rect x="1080" y="480" width="100" height="30" fill="${Wl}"/>` + lit(450, 486, 14, 18) + lit(1140, 486, 14, 18)
        + mv('usglow', { ad: '5s', to: '800px 300px' }, `<circle cx="800" cy="154" r="16" fill="#ffe4a0" opacity=".5"/>`)
        // mist across the valley floor and the river with a timber bridge
        + haze(600, 100, '#e8dce0', 0.55)
        + `<path fill="url(#${g1})" d="M-160 640Q400 626 800 650T1760 640V900H-160z"/><path fill="url(#${w1})" d="M-160 740Q500 700 900 730T1760 720V790Q900 770 500 800T-160 800z"/>`
        + shimmer(4, 20, 100, 1500, 735, 790, '#f0d8d0', 80)
        + `<path d="M520 770H1000" stroke="#5a3a2a" stroke-width="12"/><path d="M560 770V740M660 770V740M760 770V740M860 770V740M960 770V740M540 740H980" stroke="#5a3a2a" stroke-width="4"/><path fill="#a8402e" d="M520 740H1000l-10 -16H530z"/>`
        + puffs(1060, 520, 4, '#d8d0d4', 20, 70, 6, -130, 3) + puffs(340, 520, 3, '#d8d0d4', 18, -50, 6, -110, 3)
        + birds(15, 5, 600, 330, '#3a3050', 1.1, 560)
        + mv('ussway2', { ad: '8s', to: '140px 900px' }, pine(140, 900, 2.0, '#223a2c') + pine(300, 900, 1.5, '#2a4634') + pine(60, 900, 1.2, '#2a4634'))
        + mv('ussway2', { ad: '9s', to: '1480px 900px' }, pine(1480, 900, 2.2, '#223a2c') + pine(1350, 900, 1.4, '#2a4634') + pine(1560, 900, 1.2, '#2a4634'))
        + finish(0.36);
    } });

  /* ---------- Male: the island capital in a turquoise lagoon ---------- */
  asiaSceneAdd({ key: 'place:male', label: 'The island capital in the lagoon', site: 'The island capital and its lagoon', colour: 'teal', mood: 'cheerful', season: 'any', tags: ['island', 'lagoon', 'mosque'],
    svg: () => {
      const s1 = U(), w1 = U(), r1 = U();
      const blocks = (seed, x0, x1, base) => { const r = rnd(seed), cols = ['#f4efe4', '#f2c8a0', '#9ed0d8', '#f0a8a0', '#d8e4a8', '#f6e08c']; let x = x0, o = ''; while (x < x1) { const w = 34 + r() * 40, h = 60 + r() * 100; o += `<rect x="${R(x)}" y="${R(base - h)}" width="${R(w)}" height="${R(h)}" fill="${cols[Math.floor(r() * cols.length)]}"/><rect x="${R(x)}" y="${R(base - h)}" width="${R(w)}" height="6" fill="#d8d0c0"/>`; for (let y = base - h + 16; y < base - 12; y += 32) o += `<rect x="${R(x + 6)}" y="${R(y)}" width="${R(w - 12)}" height="7" fill="#4a7a96" opacity=".6"/>`; if (r() < 0.5) o += lit(R(x + 8), R(base - 30), 10, 12); x += w + 3; } return o; };
      const dhoni = (x, y, s, c, col) => `<g transform="translate(${x} ${y}) scale(${s})"><path fill="${c}" d="M-70 0Q-20 24 60 8Q86 -6 96 -22Q60 -8 -70 -12z"/><path fill="#f6f1e6" d="M-30 -12h70l12 -26h-60z"/><rect x="-6" y="-60" width="4" height="22" fill="#6a4a38"/><path fill="${col}" d="M-70 -12h52v6h-52z"/></g>`;
      return `<defs>${lin(s1, [[0, '#2f86d0'], [0.6, '#8ccaf0'], [1, '#dff4f8']])}${lin(w1, [[0, '#4ad0d0'], [0.35, '#1fb4c4'], [1, '#0b6a96']])}${lin(r1, [[0, '#ffffff', 0.9], [1, '#ffffff', 0]])}</defs>`
        + full(`url(#${s1})`) + sun(1300, 190, 44, '#fffdf0', '#fff4c0') + rays(1300, 190, 1100, '#fff8d8', 0.1)
        + cloud(300, 220, 1.3, '#c8e0f0', 0.95, 70, 6) + cloud(900, 170, 1.0, '#d6e8f4', 0.9, 90, 40) + cloud(1450, 380, 1.1, '#d0e4f2', 0.9, 80, 22) + cloud(120, 430, 0.8, '#d0e4f2', 0.85, 84, 60)
        + `<rect y="470" width="1600" height="430" fill="url(#${w1})"/>` + haze(450, 50, '#dff4f8', 0.7)
        // sand and reef patches in the lagoon
        + `<g opacity=".5"><ellipse cx="260" cy="640" rx="260" ry="34" fill="#9eeed8"/><ellipse cx="1360" cy="600" rx="240" ry="28" fill="#9eeed8"/><ellipse cx="900" cy="850" rx="360" ry="30" fill="#7fe0d0"/></g>`
        // the island city
        + mv('uspar', { ad: '60s', dx: '8px' }, `<path fill="#4a8a58" d="M280 545Q800 520 1320 545V572H280z"/>` + canopy('#3a7a4c', 548, 14, 5, 280, 1320, 580) + blocks(7, 330, 1280, 556))
        // the mosque: golden dome and a slim minaret
        + `<rect x="640" y="440" width="150" height="116" fill="#f8f4ea"/><rect x="640" y="436" width="150" height="8" fill="#d6cdbc"/><path fill="#e3b440" d="M652 440Q652 372 715 366Q778 372 778 440z"/><path fill="#f6d170" d="M690 372Q652 392 652 440H690z" opacity=".6"/><path d="M715 366V336" stroke="#e3b440" stroke-width="4"/><circle cx="715" cy="332" r="6" fill="#e3b440"/>`
        + `<path fill="#3a7aa0" d="M692 556V500Q715 478 738 500V556z"/>` + lit(660, 466, 14, 26) + lit(756, 466, 14, 26)
        + `<rect x="812" y="340" width="26" height="216" fill="#f8f4ea"/><rect x="808" y="380" width="34" height="8" fill="#d6cdbc"/><path fill="#e3b440" d="M810 340L825 296L840 340z"/><path d="M825 296V272" stroke="#e3b440" stroke-width="3"/>` + lit(818, 400, 14, 18)
        + `<path fill="#ece4d4" d="M250 556H1350V580H250z"/><path d="M250 568H1350" stroke="#b8ae9c" stroke-width="3"/>` + dots('M260 574H1340', '#fff0c0', 4, 40, 'us-lamps')
        + `<rect y="580" width="1600" height="10" fill="url(#${r1})" opacity=".4"/>`
        + shimmer(3, 40, -100, 1700, 590, 890, '#ffffff', 90) + shimmer(8, 20, -100, 1700, 620, 890, '#bdf4f0', 120)
        + mv('usmove', { ad: '70s', dx: '2000px' }, mv('usbob', { ad: '2.6s', dy: '4px' }, dhoni(800, 640, 1.0, '#e8e2d4', '#2f86d0')) + puffs(700, 640, 3, '#ffffff', 8, -60, 2.6, -10, 3))
        + mv('usmove', { ad: '110s', d: '-50s', dx: '2000px' }, mv('usbob', { ad: '3s', dy: '5px' }, dhoni(800, 760, 1.6, '#f0e6d4', '#e8604c')))
        + mv('usbob', { ad: '3.4s', dy: '4px' }, dhoni(1240, 700, 1.2, '#e8e2d4', '#f0b838'))
        + mv('usglide', { ad: '34s', dx: '1900px', dy: '-120px' }, `<g transform="translate(800 330)"><path fill="#f4f6f8" d="M-34 0h56l16 -8h14l-6 8h-8l-30 8h-40z"/><path fill="#d03a3a" d="M-10 0h24v5h-24z"/><path d="M-28 10h60M-30 14h60" stroke="#8a9aa8" stroke-width="3"/></g>`)
        + birds(9, 5, 400, 340, '#f4f8fa', 1.2, 700)
        + mv('ussway2', { ad: '6s', to: '1440px 900px' }, palm(1440, 900, 520, -90, '#2e7a4a', '#7a5a3e') + palm(1560, 900, 380, 40, '#3a8a54', '#7a5a3e'))
        + mv('ussway2', { ad: '7s', to: '110px 900px' }, palm(110, 900, 440, 60, '#2e7a4a', '#7a5a3e'))
        + finish(0.28);
    } });

  /* ---------- Kabul: the mountain city's hillside homes and kites ---------- */
  asiaSceneAdd({ key: 'place:kabul', label: 'Hillside homes and kites', site: 'The hillside homes and the snow mountains', colour: 'amber', mood: 'dreamy', season: 'any', tags: ['hills', 'kites', 'mountains'],
    svg: () => {
      const s1 = U(), g1 = U();
      const homes = (seed, x0, x1, y0, rows, step, cols) => {
        const r = rnd(seed); let o = '';
        for (let k = 0; k < rows; k++) {
          let x = x0 + r() * 20 - (k % 2) * 16;
          while (x < x1) { const w = 40 + r() * 34, h = 26 + r() * 20, y = y0 + k * step + Math.sin(x / 140 + k) * 8; o += `<rect x="${R(x)}" y="${R(y - h)}" width="${R(w)}" height="${R(h)}" fill="${cols[Math.floor(r() * cols.length)]}"/><rect x="${R(x)}" y="${R(y - h)}" width="${R(w)}" height="4" fill="#7a5a44" opacity=".5"/>`; if (r() < 0.3) o += lit(R(x + 6), R(y - h + 9), 8, 10); if (r() < 0.12) o += `<rect x="${R(x + w - 12)}" y="${R(y - h - 10)}" width="5" height="10" fill="#6a4a38"/>`; x += w + 6 + r() * 12; }
        }
        return o;
      };
      const kite = (x, y, s, c1, c2, dur, del) => mv('usdrift', { ad: dur + 's', d: del + 's', dx: '90px' }, mv('ussway2', { ad: '3s', to: `${x}px ${y}px` }, `<g transform="translate(${x} ${y}) rotate(-14) scale(${s})"><path fill="${c1}" d="M0 -40L26 0L0 52L-26 0z"/><path fill="${c2}" d="M0 -40L26 0H0zM0 52L-26 0H0z"/><path d="M0 52Q-12 100 6 150Q-6 190 14 230" stroke="${c1}" stroke-width="3" fill="none"/><path d="M0 -40V52M-26 0H26" stroke="#fff" stroke-width="1.5" opacity=".7"/></g>`));
      return `<defs>${lin(s1, [[0, '#4a7ab8'], [0.4, '#a8c4de'], [0.75, '#f6d8b0'], [1, '#ffd08a']])}${lin(g1, [[0, '#b8946a'], [1, '#7a5e44']])}</defs>`
        + full(`url(#${s1})`) + stars(17, 24, 160) + sun(1240, 330, 40, '#fffbe4', '#ffd890') + rays(1240, 330, 1100, '#ffe8b8', 0.1)
        + cloud(360, 230, 1.0, '#cfdcea', 0.85, 80, 10) + cloud(1000, 150, 0.9, '#d4e0ec', 0.8, 90, 40)
        + mv('uspar', { ad: '70s', dx: '8px' }, `<path fill="#9aa6c4" d="M-160 470L40 360L160 410L330 250L460 340L580 300L760 420L880 330L1060 280L1220 380L1380 320L1560 400L1760 330V640H-160z"/><path fill="#fffaf2" d="M330 250L398 304L366 298L342 322L318 296L284 312zM1060 280L1124 332L1092 326L1068 350L1044 324L1010 338zM580 300L632 340L606 336L586 354L566 336L538 346zM1380 320L1436 362L1406 356L1384 378L1360 354L1330 366z"/>` + haze(430, 120, '#ffe6c8', 0.55))
        + mv('uspar', { ad: '52s', dx: '12px' }, ridge('#9a7e68', 520, 70, 8, 81, 700) + haze(540, 80, '#f4d8b8', 0.4))
        // two hills crowded with flat-roofed homes
        + `<path fill="url(#${g1})" d="M-160 900V560Q120 440 360 520Q640 600 760 700L820 900z"/><path fill="url(#${g1})" d="M1000 900Q1060 660 1240 560Q1480 460 1760 540V900z"/><path fill="#9a7a58" d="M-160 900V700Q400 640 900 760Q1300 700 1760 740V900z"/>`
        + `<g>` + homes(3, -150, 560, 590, 4, 50, ['#d6b48a', '#c8a07a', '#e0c49a', '#b88e6c', '#e8d2a8']) + `</g>` + `<g>` + homes(9, 1020, 1760, 610, 4, 50, ['#d6b48a', '#c8a07a', '#e0c49a', '#b88e6c', '#e8d2a8']) + `</g>`
        + `<path d="M-160 820H1760" stroke="#6a4e36" stroke-width="3" opacity=".5"/>`
        + `<g>` + homes(5, -60, 1700, 880, 1, 36, ['#caa47e', '#b88c68', '#dcc094']) + `</g>`
        + canopy('#556e3e', 770, 30, 21, 560, 1010, 900) + canopy('#3e5a2e', 810, 26, 22, 600, 980, 900)
        + puffs(260, 560, 3, '#e0d8d0', 14, 50, 6, -120, 3) + puffs(1300, 560, 3, '#e0d8d0', 14, 40, 6, -110, 3) + puffs(1500, 600, 3, '#e0d8d0', 14, -40, 6, -100, 3)
        + dots('M-100 820H1700', '#ffd890', 5, 60, 'us-lamps')
        + kite(600, 200, 1.2, '#d83a4a', '#f6c84a', 22, 0) + kite(840, 140, 1.0, '#2f7ad8', '#f6f0e0', 26, -8) + kite(1020, 280, 1.4, '#3aa860', '#f6c84a', 30, -14) + kite(430, 330, 0.9, '#e8782a', '#4a2f8a', 24, -4) + kite(1260, 180, 0.8, '#a83a9a', '#f6f0e0', 20, -10)
        + birds(11, 4, 800, 400, '#4a3a44', 1.0, 500)
        + finish(0.3);
    } });

  /* ---------- China: the Great Wall along the misty ridges in autumn ---------- */
  asiaSceneAdd({ key: 'country:CN', label: 'The Great Wall in autumn', site: 'The Great Wall above the autumn ridges', colour: 'red', mood: 'proud', season: ['autumn'], tags: ['wall', 'mountains', 'autumn'],
    svg: () => {
      const s1 = U(), g1 = U();
      const P = [[-160, 700], [60, 640], [220, 560], [340, 566], [470, 500], [600, 440], [690, 456], [800, 380], [940, 420], [1060, 330], [1180, 360], [1300, 300], [1420, 340], [1560, 290], [1760, 330]];
      const path = P.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('');
      const tower = (x, y) => `<rect x="${x - 26}" y="${y - 60}" width="52" height="62" fill="#a89478"/><rect x="${x - 26}" y="${y - 60}" width="52" height="8" fill="#6a5a46"/><rect x="${x - 30}" y="${y - 68}" width="60" height="10" fill="#8a7860"/><path fill="#7a4a3a" d="M${x - 34} ${y - 68}L${x} ${y - 90}L${x + 34} ${y - 68}z"/><path fill="#2a2a2a" d="M${x - 8} ${y}V${y - 22}Q${x} ${y - 32} ${x + 8} ${y - 22}V${y}z"/>` + lit(x - 20, y - 46, 8, 12) + lit(x + 12, y - 46, 8, 12);
      return `<defs>${lin(s1, [[0, '#7a96c4'], [0.4, '#d6c4c8'], [0.75, '#fcd6a8'], [1, '#ffe8bc']])}${lin(g1, [[0, '#7a4a3a'], [1, '#3a2a28']])}</defs>`
        + full(`url(#${s1})`) + stars(5, 20, 160) + rays(1000, 330, 1100, '#ffe8c0', 0.12) + sun(1000, 340, 46, '#fffbe6', '#ffd48a', true)
        + streak(300, 170, 320, '#f0d4c4', 0.5) + cloud(480, 260, 1.1, '#d4c4d0', 0.85, 80, 10, '#fff2e4') + cloud(1380, 190, 1.0, '#d8c8d4', 0.8, 90, 40, '#fff0e0')
        + mv('uspar', { ad: '70s', dx: '8px' }, ridge('#a8a4c4', 360, 90, 8, 91, 700) + haze(400, 110, '#f8e4d0', 0.55))
        + mv('uspar', { ad: '54s', dx: '12px' }, ridge('#8a90ae', 470, 100, 9, 92, 700) + haze(470, 90, '#f4dcc8', 0.5))
        + mv('uspar', { ad: '40s', dx: '10px' }, ridge('#6c7a78', 580, 80, 10, 93, 800) + canopy('#7a6a4a', 600, 18, 94, -160, 1760, 800) + haze(590, 90, '#ecd4c0', 0.4))
        // the wall: a body stroked along the ridge, a crenelled top, towers
        + `<path d="${path}" fill="none" stroke="#5a4a3e" stroke-width="30" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="#b4a086" stroke-width="22" stroke-linejoin="round"/>`
        + `<path d="${path}" transform="translate(0 -12)" fill="none" stroke="#8a7a66" stroke-width="9" stroke-dasharray="11 9"/><path d="${path}" transform="translate(0 4)" fill="none" stroke="#d8c8a8" stroke-width="3" opacity=".7"/>`
        + tower(340, 566) + tower(690, 456) + tower(1060, 330) + tower(1420, 340) + tower(1300, 300).replace(/x="/g, 'x="') + tower(220, 560)
        + mv('usglow', { ad: '6s', to: '1060px 240px' }, `<circle cx="1060" cy="260" r="40" fill="#ffd890" opacity=".25"/>`)
        // red and gold autumn slopes
        + `<path fill="url(#${g1})" d="M-160 900V700Q200 640 520 720T1100 700T1760 730V900z"/>`
        + canopy('#c8442e', 710, 34, 95, -160, 1760, 900) + canopy('#e0742a', 770, 34, 96, -160, 1760, 900) + canopy('#e8a63a', 830, 30, 97, -160, 1760, 900) + canopy('#a8321e', 880, 24, 98, -160, 1760, 900)
        + mv('ussway2', { ad: '7s', to: '260px 900px' }, `<path d="M260 900V640" stroke="#3a2a22" stroke-width="12"/>` + blobs(21, 16, 190, 560, 340, 690, 20, 40, ['#e0442a', '#e8742a', '#d8a030']))
        + mv('ussway2', { ad: '8s', to: '1420px 900px' }, `<path d="M1420 900V630" stroke="#3a2a22" stroke-width="12"/>` + blobs(22, 16, 1340, 550, 1500, 680, 20, 40, ['#e8a63a', '#e0442a', '#d8782a']))
        + fall(33, 22, ['#e0442a', '#e8a63a', '#d8782a'], 3, 6, 9, 16)
        + birds(4, 7, 500, 280, '#3a3040', 1.1, 700)
        + finish(0.3);
    } });

  /* ---------- Japan: the great snow-capped cone over the lake in spring ---------- */
  asiaSceneAdd({ key: 'country:JP', label: 'Mount Fuji at dawn', site: 'Mount Fuji, a pagoda and cherry blossom', colour: 'pink', mood: 'calm', season: ['spring'], tags: ['mountain', 'blossom', 'pagoda'],
    svg: () => {
      const s1 = U(), l1 = U(), m1 = U(), g1 = U();
      const cone = 'M250 640C480 610 640 440 740 330Q800 292 860 330C960 440 1120 610 1350 640z';
      const cap = 'M740 330Q800 292 860 330C876 350 900 392 918 424L896 410L874 440L850 416L826 446L800 418L774 448L750 416L726 442L704 410L682 424C700 392 724 350 740 330z';
      const pagoda = (x, y, s) => { let o = ''; for (let i = 0; i < 5; i++) { const w = (64 - i * 8) * s, yy = y - i * 44 * s; o += `<rect x="${R(x - w * 0.7)}" y="${R(yy - 30 * s)}" width="${R(w * 1.4)}" height="${R(30 * s)}" fill="#c8402e"/><path fill="#4a3a44" d="M${R(x - w - 14 * s)} ${R(yy - 26 * s)}Q${R(x - w * 0.5)} ${R(yy - 30 * s)} ${R(x)} ${R(yy - 44 * s)}Q${R(x + w * 0.5)} ${R(yy - 30 * s)} ${R(x + w + 14 * s)} ${R(yy - 26 * s)}z"/>` + lit(R(x - 6 * s), R(yy - 24 * s), R(12 * s), R(16 * s)); } return o + `<path d="M${x} ${R(y - 5 * 44 * s - 8 * s)}v${-R(36 * s)}" stroke="#4a3a44" stroke-width="${R(4 * s)}"/>`; };
      const branch = (x0, y0, x1, y1, seed) => `<path d="M${x0} ${y0}Q${R((x0 + x1) / 2)} ${R(y0 - 40)} ${x1} ${y1}" stroke="#4a3236" stroke-width="12" fill="none" stroke-linecap="round"/>` + blobs(seed, 46, Math.min(x0, x1) - 30, Math.min(y0, y1) - 20, Math.max(x0, x1) + 20, Math.max(y0, y1) + 60, 14, 32, ['#f8c0d4', '#f4a8c4', '#fbd8e4', '#f6b4cc']);
      return `<defs>${lin(s1, [[0, '#4a5a9c'], [0.35, '#b08cc0'], [0.65, '#ffb4b0'], [1, '#ffe2b8']])}${linU(m1, [[0, '#5a6aa4'], [1, '#8a82b4']], 0, 300, 0, 650)}${lin(l1, [[0, '#a8b4e0'], [0.4, '#f0b8c8'], [1, '#6a78b0']])}${lin(g1, [[0, '#6a8a5c'], [1, '#3e5a40']])}</defs>`
        + full(`url(#${s1})`) + stars(14, 44, 220) + sun(800, 320, 30, '#fff4d8', '#ffc4a0', true)
        + streak(300, 170, 300, '#ffd0d0', 0.5) + streak(1280, 220, 280, '#ffc4c4', 0.5, 70) + `<ellipse cx="800" cy="300" rx="320" ry="14" fill="#ffd8d8" opacity=".6"/>` + `<ellipse cx="800" cy="326" rx="250" ry="9" fill="#ffe8e0" opacity=".5"/>`
        + mv('uspar', { ad: '70s', dx: '6px' }, `<path fill="url(#${m1})" d="${cone}"/><path fill="#fff0f2" d="${cap}"/><path fill="#c8b8d8" opacity=".6" d="M800 296L860 330C960 440 1120 610 1350 640H1000C1000 560 900 400 800 296z"/><path fill="#f0c8d4" opacity=".7" d="M740 330Q700 396 690 440L720 424L740 450z"/>` + haze(540, 110, '#ffd8d0', 0.55))
        + mv('uspar', { ad: '48s', dx: '10px' }, ridge('#6a78a8', 610, 50, 9, 101, 700) + canopy('#4e6a78', 630, 16, 41, -160, 1760, 700))
        // the lake with Fuji reflected
        + `<rect y="650" width="1600" height="250" fill="url(#${l1})"/><g opacity=".4" transform="translate(0 1300) scale(1 -1)"><path fill="#6a6aa4" d="${cone}"/><path fill="#fff0f2" d="${cap}"/></g>`
        + `<rect y="640" width="1600" height="20" fill="#ffd8d8" opacity=".35"/>` + shimmer(5, 34, 200, 1400, 665, 880, '#ffe4ec', 90)
        + mv('usbob', { ad: '3.4s', dy: '3px' }, `<g transform="translate(1180 740)"><path fill="#3a2c3c" d="M-60 0Q0 18 64 -4Q30 4 -60 -10z"/><rect x="-10" y="-34" width="3" height="26" fill="#3a2c3c"/><path fill="#fbe8ee" d="M-8 -34L24 -10H-8z"/></g>`)
        // a pagoda on the near shore and the shore itself
        + `<path fill="url(#${g1})" d="M900 900V780Q1060 730 1200 770Q1400 740 1760 790V900z"/>` + canopy('#3a5a3e', 770, 30, 51, 900, 1760, 900) + pagoda(1120, 780, 1.1) + canopy('#2e4a34', 800, 24, 52, 860, 1500, 900)
        + dots('M920 800H1500', '#ffe2a0', 4, 40, 'us-lamps')
        // cherry blossom boughs frame the view
        + mv('ussway2', { ad: '9s', to: '-100px 100px' }, branch(-100, 90, 420, 250, 61) + branch(40, 240, 320, 130, 62))
        + mv('ussway2', { ad: '11s', d: '-3s', to: '1700px 100px' }, branch(1700, 70, 1200, 190, 63) + branch(1620, 260, 1380, 360, 64))
        + fall(71, 34, ['#fbd0dc', '#f6b8cc', '#ffe6ee'], 4, 7, 8, 15)
        + birds(8, 4, 560, 420, '#4a3a54', 1.0, 500)
        + finish(0.3);
    } });

  /* ---------- South Korea: the palace hall under the granite peak in autumn ---------- */
  asiaSceneAdd({ key: 'country:KR', label: 'The palace hall in autumn', site: 'A royal palace hall under the granite peak', colour: 'amber', mood: 'proud', season: ['autumn'], tags: ['palace', 'hanok', 'autumn'],
    svg: () => {
      const s1 = U(), g1 = U(), st1 = U(), T = '#4a5460', Td = '#363e48';
      let cols = '', dan = '';
      for (let x = 540; x <= 1060; x += 65) { cols += `<rect x="${x - 7}" y="520" width="14" height="130" fill="#b8382a"/>`; }
      for (let x = 545; x < 1060; x += 22) dan += `<path fill="${(x / 22) % 2 ? '#2f8a7a' : '#3a6ab0'}" d="M${x} 498h14v14h-14z"/>`;
      const roofTop = 'M360 470Q440 464 520 430Q640 382 800 376Q960 382 1080 430Q1160 464 1240 470L1260 450Q1176 446 1100 396Q960 340 800 336Q640 340 500 396Q424 446 340 450z';
      const roof2 = 'M420 392Q520 384 600 330Q690 284 800 280Q910 284 1000 330Q1080 384 1180 392L1200 372Q1100 368 1020 306Q920 246 800 242Q680 246 580 306Q500 368 400 372z';
      return `<defs>${lin(s1, [[0, '#3a82cc'], [0.5, '#9ccbe8'], [1, '#fbe6c0']])}${lin(g1, [[0, '#cfc6b6'], [1, '#a89e8e']])}${lin(st1, [[0, '#9a9aa0'], [1, '#6e7078']])}</defs>`
        + full(`url(#${s1})`) + stars(3, 20, 140) + sun(1320, 230, 36, '#fffdf0', '#fff0b8') + cloud(380, 190, 1.0, '#d4e6f2', 0.9, 80, 6) + cloud(1340, 380, 0.9, '#d8e8f4', 0.85, 90, 40) + streak(820, 130, 300, '#ffffff', 0.4, 70)
        // the granite peak behind the palace
        + mv('uspar', { ad: '70s', dx: '8px' }, `<path fill="#8a8e98" d="M300 520L430 330L520 300L600 220L700 180L800 140L900 190L1000 230L1100 320L1200 360L1320 520z"/><path fill="#a8acb6" d="M700 180L800 140L900 190L850 330L780 300L720 360L660 280z" opacity=".7"/><path fill="#6e727e" d="M900 190L1000 230L1100 320L1200 360L1320 520H1000z" opacity=".5"/>` + canopy('#8a6a3a', 520, 20, 7, 300, 1320, 600) + haze(440, 120, '#e8eef2', 0.5))
        + mv('uspar', { ad: '50s', dx: '12px' }, ridge('#7a8a6a', 560, 70, 10, 111, 700) + canopy('#b8662a', 580, 22, 112, -160, 1760, 700) + canopy('#d89a30', 610, 20, 113, -160, 1760, 700))
        // the hall: two tiers of up-curved tiled eaves, red columns and painted brackets
        + `<path fill="${Td}" d="${roof2}"/><path fill="${T}" d="M420 392Q520 384 600 330Q690 284 800 280Q910 284 1000 330Q1080 384 1180 392Q1100 384 1000 344Q900 306 800 304Q700 306 600 344Q500 384 420 392z"/>`
        + `<rect x="560" y="392" width="480" height="70" fill="#f0e4cc"/><rect x="560" y="392" width="480" height="12" fill="#2f8a7a"/>` + lit(610, 412, 24, 40) + lit(700, 412, 24, 40) + lit(790, 412, 24, 40) + lit(880, 412, 24, 40) + lit(970, 412, 24, 40)
        + `<path fill="none" stroke="#1f2830" stroke-width="3" opacity=".6" d="M440 386Q540 378 620 326Q700 282 800 280M1160 386Q1060 378 980 326Q900 282 800 280"/>`
        + `<path fill="${Td}" d="${roofTop}"/><path fill="${T}" d="M360 470Q440 464 520 430Q640 382 800 376Q960 382 1080 430Q1160 464 1240 470Q1150 462 1070 424Q960 388 800 384Q640 388 530 424Q450 462 360 470z"/>`
        + `<path stroke="#6e7886" stroke-width="3" fill="none" opacity=".6" d="M440 462Q540 440 640 400M520 450Q600 420 700 392M1160 462Q1060 440 960 400M1080 450Q1000 420 900 392"/>`
        + `<rect x="520" y="470" width="560" height="190" fill="#f4ead4"/><rect x="520" y="486" width="560" height="26" fill="#2a6a8a"/>` + dan + cols
        + `<path fill="#5a2a22" d="M720 650V560Q800 530 880 560V650z"/><path fill="#7a3a2c" d="M620 650V570H700V650zM900 650V570H980V650z" opacity=".85"/>` + lit(630, 580, 60, 60) + lit(910, 580, 60, 60) + lit(740, 570, 120, 76)
        + mv('usglow', { ad: '6s', to: '800px 280px' }, `<circle cx="800" cy="240" r="10" fill="#e8c46a"/>`)
        // the stone terrace with staircases, a lantern and the courtyard
        + `<path fill="url(#${st1})" d="M440 650H1160V690H440z"/><path fill="#b4b4ba" d="M440 650H1160V658H440z"/><path fill="url(#${st1})" d="M700 690H900L930 760H670z"/><path fill="#b8b8be" d="M690 726H910L930 760H670z" opacity=".6"/><path d="M670 760H930M680 740H920M690 720H910M700 700H900" stroke="#6e7078" stroke-width="2"/>`
        + `<path fill="url(#${g1})" d="M-160 760H1760V900H-160z"/><path d="M-160 790H1760" stroke="#b0a696" stroke-width="3"/><path d="M200 900L600 790M1400 900L1000 790" stroke="#bcb2a2" stroke-width="3" opacity=".6"/>`
        + `<g fill="#8a8a92"><rect x="400" y="718" width="26" height="40"/><path d="M394 718h38l-6 -14h-26z"/><rect x="1174" y="718" width="26" height="40"/><path d="M1168 718h38l-6 -14h-26z"/></g>` + lit(406, 726, 14, 14) + lit(1180, 726, 14, 14)
        + dots('M-100 800H1700', '#fff0c0', 4, 70, 'us-lamps')
        + mv('ussway2', { ad: '9s', to: '160px 900px' }, `<path d="M160 900V560" stroke="#4a3426" stroke-width="16"/>` + blobs(23, 26, 40, 380, 290, 640, 26, 50, ['#f0b830', '#e8a020', '#f6d24a']))
        + mv('ussway2', { ad: '10s', d: '-3s', to: '1440px 900px' }, `<path d="M1440 900V540" stroke="#4a3426" stroke-width="16"/>` + blobs(24, 26, 1320, 360, 1580, 620, 26, 50, ['#e8742a', '#d8501e', '#f0a030']))
        + fall(41, 24, ['#f0b830', '#e8742a', '#f6d24a'], 4, 8, 9, 16)
        + birds(5, 5, 600, 150, '#3a4450', 1.0, 600)
        + finish(0.28);
    } });

  /* ---------- North Korea: jagged granite peaks, pines and mist in autumn (landscape only) ---------- */
  asiaSceneAdd({ key: 'country:KP', label: 'Granite peaks in the autumn mist', site: 'Jagged granite peaks over a pine valley', colour: 'teal', mood: 'calm', season: ['autumn'], tags: ['mountains', 'mist', 'pines'],
    svg: () => {
      const s1 = U(), f1 = U(), w1 = U(), g1 = U();
      const peaks = (seed, n, base, hmin, hmax, wmin, wmax, fill, hi) => {
        const r = rnd(seed); let o = '', hl = ''; let x = -120;
        for (let i = 0; i < n; i++) {
          const w = wmin + r() * (wmax - wmin), h = hmin + r() * (hmax - hmin), cx = x + w / 2; let d = `M${R(x)} ${base}`, e = `M${R(cx)} ${R(base - h)}`;
          const k = 5; for (let j = 1; j <= k; j++) { const t = j / (k + 1), yy = base - h * (1 - t * 0.95) + r() * 14; d += `L${R(x + w * 0.5 * t * (0.8 + r() * 0.3))} ${R(yy)}`; }
          d += `L${R(cx - 8)} ${R(base - h + 14)}L${R(cx)} ${R(base - h)}L${R(cx + 8 + r() * 8)} ${R(base - h + 18)}`;
          for (let j = k; j >= 1; j--) { const t = j / (k + 1), yy = base - h * (1 - t * 0.95) + r() * 14; d += `L${R(x + w - w * 0.5 * t * (0.8 + r() * 0.3))} ${R(yy)}`; }
          d += `L${R(x + w)} ${base}z`; o += `<path d="${d}"/>`;
          hl += `<path d="M${R(cx)} ${R(base - h)}L${R(cx + w * 0.34)} ${R(base - h * 0.4)}L${R(cx + w * 0.1)} ${R(base)}L${R(cx + 4)} ${R(base - h * 0.6)}z"/>`;
          x += w * 0.72;
        }
        return `<g fill="${fill}">${o}</g><g fill="${hi}" opacity=".45">${hl}</g>`;
      };
      const ledgePine = (x, y, s) => pine(x, y, s, '#2e5a3e');
      return `<defs>${lin(s1, [[0, '#6f98b4'], [0.45, '#c4d8d8'], [0.8, '#f4ead0'], [1, '#fff4d8']])}${radU(f1, [[0, '#fff4cc', 0.7], [1, '#fff4cc', 0]], 1000, 260, 520)}${lin(w1, [[0, '#9ac4c0'], [1, '#3e7a82']])}${lin(g1, [[0, '#6a8a58'], [1, '#34503a']])}</defs>`
        + full(`url(#${s1})`) + `<rect width="1600" height="900" fill="url(#${f1})"/>` + stars(4, 18, 120) + sun(1000, 250, 34, '#fffdf0', '#fff0c0', true)
        + cloud(300, 170, 1.0, '#d6e4e8', 0.8, 80, 8) + cloud(1380, 140, 0.9, '#dae8ec', 0.8, 90, 40)
        + mv('uspar', { ad: '70s', dx: '8px' }, peaks(3, 7, 560, 220, 330, 240, 340, '#b0c0c4', '#e8f0f0') + haze(420, 160, '#eef2ec', 0.7))
        + mv('uspar', { ad: '54s', dx: '12px' }, peaks(5, 7, 650, 260, 400, 260, 380, '#8a9ea4', '#d8e4e4') + canopy('#9a7a3a', 640, 16, 9, -160, 1760, 700) + haze(500, 160, '#e4ecea', 0.6))
        + mv('uspar', { ad: '40s', dx: '16px' }, peaks(8, 6, 760, 300, 450, 300, 420, '#6e8486', '#c4d4d2') + canopy('#b8662a', 740, 22, 12, -160, 1760, 900) + haze(640, 120, '#e8eee8', 0.45))
        // a waterfall and pool between the rocks
        + `<path fill="#f4fafa" opacity=".9" d="M820 520Q834 520 838 560L852 700H790L804 560Q808 520 820 520z"/><path d="M806 540V700M820 530V700M834 560V700" stroke="#c6dcdc" stroke-width="3" opacity=".8"/>` + puffs(820, 700, 4, '#ffffff', 18, 20, 4, -60, 2.6)
        + `<path fill="url(#${g1})" d="M-160 900V760Q300 720 700 770Q820 740 1000 780Q1300 730 1760 770V900z"/><path fill="url(#${w1})" d="M360 900Q480 800 800 780Q1100 800 1240 900z"/>`
        + shimmer(6, 20, 480, 1100, 800, 890, '#ffffff', 70)
        + canopy('#b8662a', 790, 24, 14, -160, 600, 900) + canopy('#d89a30', 830, 24, 15, 1100, 1760, 900) + canopy('#3e6a44', 860, 24, 16, -160, 1760, 900)
        + mv('ussway2', { ad: '8s', to: '200px 900px' }, ledgePine(200, 900, 2.3) + ledgePine(330, 900, 1.6) + ledgePine(90, 900, 1.3))
        + mv('ussway2', { ad: '9s', to: '1400px 900px' }, ledgePine(1400, 900, 2.4) + ledgePine(1520, 900, 1.5) + ledgePine(1280, 900, 1.2))
        + mv('usdrift', { ad: '60s', dx: '120px' }, `<ellipse cx="500" cy="590" rx="360" ry="22" fill="#f6f8f4" opacity=".6"/><ellipse cx="1150" cy="500" rx="300" ry="18" fill="#f6f8f4" opacity=".55"/><ellipse cx="800" cy="680" rx="420" ry="20" fill="#f6f8f4" opacity=".5"/>`)
        + fall(51, 18, ['#e8742a', '#f0b830', '#c8442e'], 3, 6, 9, 16)
        + birds(6, 5, 420, 330, '#3a4850', 1.1, 600)
        + finish(0.28);
    } });
})();
