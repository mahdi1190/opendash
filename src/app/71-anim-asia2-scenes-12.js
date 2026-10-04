/* ============================================================
   ASIA FULL-SCREEN SCENES, batch 12 (South-east Asia): Hanoi, Da Nang, Manila, Cebu, Davao, Yangon, Mandalay,
   Phnom Penh, Vientiane, Bandar Seri Begawan, Dili. Same toolkit as the US scenes (usSceneKit): 1600 x 900 units,
   sliced to fill any screen, layered, painted in daytime colours; the dark theme or tod-dusk / tod-night lights
   .us-lit windows, .us-lamps and .us-star.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish } = K;
  /** A row of buildings (one path). */
  const bld = (seed, x0, x1, y, hmin, hmax, fill, wmin, wmax, gap) => {
    const r = rnd(seed); let x = x0, d = '';
    while (x < x1) { const w = wmin + r() * (wmax - wmin), h = hmin + r() * (hmax - hmin); d += `M${R(x)} ${y}V${R(y - h)}h${R(w)}V${y}z`; x += w + (gap || 0) * r(); }
    return `<path fill="${fill}" d="${d}"/>`;
  };
  /** Lit windows: random dots on a rectangle. */
  const wins = (seed, x0, x1, y0, y1, n, w) => {
    const r = rnd(seed); let d = '';
    for (let i = 0; i < n; i++) d += `M${R(x0 + r() * (x1 - x0))} ${R(y0 + r() * (y1 - y0))}h1`;
    return `<path class="us-lit" fill="none" stroke-width="${w || 5}" stroke-linecap="round" d="${d}"/>`;
  };
  /** A mirrored copy under a waterline y. */
  const refl = (y, op, inner) => `<g transform="translate(0 ${2 * y}) scale(1 -1)" opacity="${op}">${inner}</g>`;
  /** A palm: curved trunk, swaying crown (feet at x,y; crown lean units to the side). */
  const palm = (x, y, h, lean, col, tcol, seed, ad) => {
    const r = rnd(seed || 5), tx = x + lean, ty = y - h, L0 = h * 0.4; let fr = '';
    for (let i = 0; i < 12; i++) {
      const a = (-205 + i * 21 + r() * 8) * Math.PI / 180, L = L0 * (0.75 + r() * 0.5), ca = Math.cos(a), sa = Math.sin(a);
      const ex = tx + L * ca, ey = ty + L * sa + L * 0.4, cx = tx + L * ca * 0.55, cy = ty + L * sa * 0.55 - L * 0.28;
      fr += `M${R(tx)} ${R(ty)}Q${R(cx)} ${R(cy)} ${R(ex)} ${R(ey)}Q${R(cx + 4)} ${R(cy + L * 0.2)} ${R(tx)} ${R(ty)}z`;
    }
    return `<path fill="none" stroke="${tcol}" stroke-width="${R(h * 0.03 + 4)}" stroke-linecap="round" d="M${x} ${y}Q${R(x + lean * 0.15)} ${R(y - h * 0.55)} ${R(tx)} ${R(ty)}"/>`
      + mv('ussway2', { ad: (ad || 6.5) + 's', d: '-' + (r() * 4).toFixed(1) + 's', to: `${R(tx)}px ${R(ty)}px` }, `<path fill="${col}" d="${fr}"/><circle cx="${R(tx)}" cy="${R(ty)}" r="${R(h * 0.02 + 4)}" fill="${tcol}"/>`);
  };
  /** A weeping willow: trunk and swaying strands. */
  const willow = (x, y, h, lean, trunk, leaf, seed) => {
    const r = rnd(seed), tx = x + lean, ty = y - h; let d = '', o = '';
    for (let i = 0; i < 26; i++) {
      const bx = tx - 150 + r() * 300, by = ty - 30 + Math.abs(bx - tx) * 0.25 + r() * 40, len = 150 + r() * 200;
      d += `M${R(bx)} ${R(by)}q${R(-10 + r() * 20)} ${R(len * 0.5)} ${R(-6 + r() * 12)} ${R(len)}`;
    }
    o += `<path fill="none" stroke="${leaf}" stroke-width="3.4" stroke-linecap="round" d="${d}"/>`;
    o += `<ellipse cx="${tx}" cy="${R(ty - 10)}" rx="190" ry="62" fill="${leaf}"/>`;
    return `<path fill="none" stroke="${trunk}" stroke-width="30" stroke-linecap="round" d="M${x} ${y}Q${R(x + lean * 0.2)} ${R(y - h * 0.6)} ${tx} ${ty}"/>` + mv('ussway', { ad: (5 + r() * 2).toFixed(1) + 's', d: '-' + (r() * 3).toFixed(1) + 's', to: `${tx}px ${ty}px` }, o);
  };
  /** A small boat hull (centre x, waterline y). */
  const hull = (x, y, s, col, trim) => `<path fill="${col}" d="M${R(x - 70 * s)} ${R(y - 8 * s)}L${R(x + 70 * s)} ${R(y - 8 * s)}Q${R(x + 50 * s)} ${R(y + 18 * s)} ${x} ${R(y + 18 * s)}Q${R(x - 50 * s)} ${R(y + 18 * s)} ${R(x - 70 * s)} ${R(y - 8 * s)}z"/><rect x="${R(x - 70 * s)}" y="${R(y - 10 * s)}" width="${R(140 * s)}" height="${R(4 * s)}" fill="${trim}"/>`;
  /** A curved Southeast Asian roof: eaves at y, width w, rise h, ends turned up. */
  const roof = (cx, y, w, h, fill, trim) => `<path fill="${fill}" d="M${R(cx - w / 2 - 12)} ${R(y - 14)}Q${R(cx - w * 0.3)} ${R(y + 2)} ${R(cx - w / 2 + 16)} ${R(y + 4)}H${R(cx + w / 2 - 16)}Q${R(cx + w * 0.3)} ${R(y + 2)} ${R(cx + w / 2 + 12)} ${R(y - 14)}Q${R(cx + w * 0.3)} ${R(y - 8)} ${R(cx + w * 0.1)} ${R(y - h)}H${R(cx - w * 0.1)}Q${R(cx - w * 0.3)} ${R(y - 8)} ${R(cx - w / 2 - 12)} ${R(y - 14)}z"/><path fill="none" stroke="${trim}" stroke-width="3" d="M${R(cx - w / 2 + 14)} ${R(y + 4)}H${R(cx + w / 2 - 14)}"/>`;
  /** A fan of golden sky streaks. */
  const skyband = (a, b, y1, y2) => `<rect x="-160" y="${y1}" width="1920" height="${y2 - y1}" fill="${a}" opacity="${b}"/>`;

  /* ---------------- Hanoi: Hoan Kiem Lake at dawn ---------------- */
  asiaSceneAdd({ key: 'place:hanoi', label: 'Hoan Kiem Lake at dawn', site: 'Hoan Kiem Lake', colour: 'red', mood: 'calm', season: 'any', tags: ['lake', 'bridge', 'dawn'],
    svg: () => {
      const s1 = U(), s2 = U(), w1 = U(), g1 = U();
      const tower = (x, y) => `<ellipse cx="${x}" cy="${y + 6}" rx="76" ry="12" fill="#6e7d5a"/>` + [0, 1, 2].map((i) => `<rect x="${x - 26 + i * 4}" y="${y - 44 - i * 42}" width="${52 - i * 8}" height="42" fill="#cdbf9c"/>` + roof(x, y - 40 - i * 42, 64 - i * 12, 14, '#6d6a58', '#4c4a3c')).join('') + `<rect class="us-lit" x="${x - 5}" y="${y - 30}" width="10" height="16" rx="5"/>`;
      const bridge = () => {
        let p = '';
        for (let i = 0; i <= 12; i++) { const x = 600 + i * 36, t = i / 12, y = 640 - Math.sin(t * Math.PI) * 54; p += `<rect x="${x - 3}" y="${R(y - 40)}" width="6" height="40" fill="#a8241c"/>`; }
        return `<path fill="#9e2a20" d="M598 640Q780 560 1040 636V652H598z"/><path fill="none" stroke="#c63a2b" stroke-width="7" d="M598 600Q780 520 1040 596"/><path fill="none" stroke="#c63a2b" stroke-width="5" d="M598 622Q780 542 1040 618"/>` + p
          + `<path fill="#6e1812" d="M630 652Q660 618 690 652zM740 652Q776 600 812 652zM860 652Q896 604 932 652zM970 652Q996 624 1022 652z"/>`;
      };
      const temple = (x, y) => `<ellipse cx="${x}" cy="${y + 12}" rx="150" ry="18" fill="#5c6e4f"/><rect x="${x - 70}" y="${y - 54}" width="140" height="62" fill="#d5b98b"/><rect x="${x - 20}" y="${y - 44}" width="40" height="52" fill="#5a3a2a"/>` + roof(x, y - 52, 190, 34, '#7a4a38', '#52301f') + `<rect x="${x - 40}" y="${y - 100}" width="80" height="40" fill="#cba97a"/>` + roof(x, y - 98, 120, 28, '#7a4a38', '#52301f') + lit(x - 12, y - 86, 24, 20);
      const far = bld(11, -160, 1760, 510, 40, 120, '#b5b8ac', 36, 88) + bld(12, -160, 1760, 520, 30, 90, '#a0a79b', 40, 96);
      const arcs = (y) => { let o = ''; for (let i = 0; i < 6; i++) o += `<rect x="${-100 + i * 330}" y="${y}" width="150" height="22" rx="4" fill="#bfa97b" opacity=".5"/>`; return o; };
      return `<defs>${lin(s1, [[0, '#b8c7c4'], [0.4, '#efd9bf'], [0.72, '#f6c8a0'], [1, '#f2dcc3']])}${lin(w1, [[0, '#a9bbaf'], [0.5, '#7e9a8e'], [1, '#4f6f66']])}${radU(g1, [[0, '#ffe6bc', 0.9], [1, '#ffe6bc', 0]], 960, 400, 520)}</defs>`
        + full(`url(#${s1})`) + `<circle cx="960" cy="400" r="520" fill="url(#${g1})"/>` + sun(960, 400, 38, '#fff3da', '#ffd9a6', true)
        + cloud(300, 170, 1.1, '#f2c8b0', 0.8, 70, 0) + cloud(1300, 120, 0.9, '#f6cfb4', 0.75, 90, 20)
        + mv('uspar', { ad: '70s', dx: '24px' }, far) + haze(430, 130, '#f6e6d4', 0.7)
        + mv('uspar', { ad: '55s', dx: '16px' }, canopy('#6d8a60', 520, 46, 21) + canopy('#587450', 530, 40, 22))
        + wins(13, 0, 1500, 440, 505, 40, 5)
        + `<rect y="520" width="1600" height="380" fill="url(#${w1})"/>`
        + refl(520, 0.28, far) + `<rect y="520" width="1600" height="12" fill="#f7e2c6" opacity=".45"/>`
        + refl(560, 0.3, tower(470, 560)) + tower(470, 560) + refl(640, 0.35, bridge()) + bridge() + refl(660, 0.3, temple(1180, 640)) + temple(1180, 640)
        + mv('usbob', { ad: '5s', dy: '3px' }, hull(1360, 770, 0.8, '#a2402e', '#e0b050') + `<path fill="none" stroke="#6a3426" stroke-width="3" d="M1300 758L1430 746"/>`)
        + shimmer(5, 40, -100, 1700, 560, 880, '#fff1d8', 54)
        + mv('uspar', { ad: '14s', dx: '16px' }, `<g opacity=".55">${arcs(700)}</g>`)
        + streak(700, 470, 380, '#fff1de', 0.5, 80) + streak(1200, 560, 300, '#fff1de', 0.35, 100)
        + willow(150, 900, 520, 90, '#4a4034', '#8bab5e', 31) + willow(1500, 900, 460, -60, '#4a4034', '#7e9e56', 32)
        + `<g fill="#b8271c">${[0, 1, 2, 3].map((i) => mv('usbob', { ad: (3 + i * 0.4) + 's', d: -i + 's', dy: '4px' }, `<ellipse cx="${300 + i * 70}" cy="${470 + (i % 2) * 24}" rx="9" ry="12"/>`)).join('')}</g>`
        + `<g opacity=".8">${birds(3, 5, 760, 250, '#4a4a46', 0.9)}</g>` + finish(0.32);
    } });

  /* ---------------- Da Nang: the Dragon Bridge breathing fire ---------------- */
  asiaSceneAdd({ key: 'place:da-nang', label: 'Dragon Bridge at dusk', site: 'Dragon Bridge', colour: 'orange', mood: 'energetic', season: 'any', tags: ['bridge', 'river', 'dusk'],
    svg: () => {
      const s1 = U(), w1 = U(), d1 = U(), g1 = U(); const r = rnd(8);
      let ribs = ''; for (let i = 0; i < 40; i++) { const x = 120 + i * 30; ribs += `<path d="M${x} 500q4 -22 14 -30" />`; }
      const body = 'M60 520C170 380 280 640 420 500S660 360 800 500S1040 650 1180 490S1330 420 1380 450';
      const dragon = `<path fill="none" stroke="#7a3a10" stroke-width="40" stroke-linecap="round" d="${body}"/><path fill="none" stroke="#f1b52a" stroke-width="30" stroke-linecap="round" d="${body}"/><path fill="none" stroke="#ffe08a" stroke-width="6" stroke-linecap="round" d="${body}" transform="translate(0 -9)"/>`
        + `<path fill="none" stroke="#b9570f" stroke-width="30" stroke-dasharray="3 22" d="${body}" transform="translate(0 2)"/>`
        + `<path fill="#e9a420" d="M1370 440L1440 400L1520 410L1590 450L1540 470L1580 500L1500 490L1430 500L1380 480z"/><path fill="#7a3a10" d="M1400 420L1380 360L1440 405zM1450 405L1450 345L1490 405z"/><circle cx="1470" cy="438" r="7" fill="#fff"/><circle cx="1472" cy="438" r="3" fill="#2a1408"/>`
        + `<path fill="none" stroke="#d6811a" stroke-width="5" d="M1560 460q40 -10 70 0q-30 20 -70 0"/>`;
      let sup = ''; for (let i = 0; i < 26; i++) sup += `<rect x="${-100 + i * 74}" y="568" width="9" height="${100 + (i % 2) * 6}" fill="#3a3550"/>`;
      let cars = ''; for (let i = 0; i < 6; i++) cars += mv('usmove', { ad: (14 + i * 3) + 's', d: -i * 3 + 's', dx: '1400px' }, `<circle class="us-lamps" cx="${200 + i * 230}" cy="${548 + (i % 2) * 8}" r="5" fill="#ffd9a0"/><circle cx="${230 + i * 230}" cy="${548 + (i % 2) * 8}" r="4" fill="#e04030"/>`);
      const towers = bld(41, -160, 1760, 520, 50, 250, '#4c4a72', 34, 78, 8) + bld(42, -160, 1760, 520, 30, 160, '#3c3a60', 44, 96, 6);
      const lotus = `<path fill="#5a527e" d="M1180 520V250q-30-30-40-70q40 20 70 0q-3 30 40 70z"/>`;
      return `<defs>${lin(s1, [[0, '#2a2358'], [0.45, '#8a3f78'], [0.75, '#f08a58'], [1, '#ffc27a']])}${lin(w1, [[0, '#6a3d6a'], [0.35, '#392c5c'], [1, '#161a3a']])}${radU(g1, [[0, '#ffd27a', 0.5], [1, '#ffd27a', 0]], 1480, 440, 260)}</defs>`
        + full(`url(#${s1})`) + stars(7, 60, 360) + sun(260, 430, 40, '#ffe3a4', '#ffb070') + cloud(700, 200, 1.1, '#d27a8a', 0.8, 80, 0, '#f2a6a0') + cloud(1200, 120, 0.8, '#d77a8a', 0.7, 100, 30, '#f2a6a0')
        + mv('uspar', { ad: '80s', dx: '30px' }, ridge('#6a4a78', 440, 90, 8, 4, 540) + ridge('#4a3a68', 480, 70, 9, 5, 540))
        + mv('uspar', { ad: '60s', dx: '20px' }, towers + lotus) + wins(43, -100, 1700, 300, 515, 90, 5)
        + `<rect y="520" width="1600" height="380" fill="url(#${w1})"/>`
        + refl(520, 0.3, towers) + shimmer(6, 50, -100, 1700, 600, 880, '#ffb070', 60) + shimmer(7, 22, 900, 1700, 600, 880, '#ffe08a', 50)
        + mv('usbob', { ad: '6s', dy: '2px' }, refl(560, 0.35, dragon)) + sup
        + `<rect x="-160" y="548" width="1920" height="22" fill="#2a2744"/><rect x="-160" y="540" width="1920" height="9" fill="#46406a"/>` + dots('M-160 536H1760', '#ffd27a', 5, 40, 'us-lamps')
        + dragon + cars
        + `<circle cx="1500" cy="450" r="90" fill="url(#${g1})"/>`
        + mv('usflicker', { ad: '0.3s', to: '1560px 470px' }, `<path fill="#ff7a1a" d="M1585 470q60 -22 110 -4q-50 8 -110 28z"/><path fill="#ffd45a" d="M1590 474q40 -12 70 -2q-30 6 -70 16z"/>`)
        + puffs(1640, 470, 6, '#ff9a3a', 28, 90, 2.4, -60, 2.2)
        + mv('usbob', { ad: '4s', dy: '4px' }, hull(500, 780, 1.2, '#2a2040', '#d26a28') + `<rect class="us-lit" x="470" y="738" width="60" height="18" rx="4"/>`)
        + mv('usbob', { ad: '5s', d: '-2s', dy: '3px' }, hull(1200, 830, 0.9, '#3a2a48', '#c25a28') + `<rect class="us-lit" x="1176" y="798" width="46" height="14" rx="4"/>`)
        + `<g opacity=".85">${birds(9, 5, 600, 260, '#2a2040', 0.9)}</g>` + finish(0.3);
    } });

  /* ---------------- Manila: sunset over Manila Bay ---------------- */
  asiaSceneAdd({ key: 'place:manila', label: 'Sunset over Manila Bay', site: 'Manila Bay', colour: 'pink', mood: 'cheerful', season: 'any', tags: ['bay', 'sunset', 'skyline'],
    svg: () => {
      const s1 = U(), w1 = U(); const r = rnd(12);
      const skyline = bld(61, 960, 1760, 520, 60, 300, '#5a3466', 30, 66, 6) + bld(62, 900, 1760, 520, 30, 140, '#472a58', 36, 80, 4);
      const spire = `<path fill="#5a3466" d="M1300 520V190l10-40l10 40V520z"/>`;
      const sail = (x, y, s) => hull(x, y, s, '#3a2236', '#d8873a') + `<path fill="none" stroke="#3a2236" stroke-width="${3 * s}" d="M${x - 100 * s} ${y - 6 * s}L${x - 140 * s} ${y + 10 * s}M${x + 100 * s} ${y - 6 * s}L${x + 140 * s} ${y + 10 * s}"/><path fill="none" stroke="#3a2236" stroke-width="${3 * s}" d="M${x} ${y - 8 * s}V${y - 130 * s}"/><path fill="#f0b46a" d="M${x + 3 * s} ${y - 126 * s}L${x + 80 * s} ${y - 12 * s}H${x + 3 * s}z"/><path fill="#d2704a" d="M${x - 3 * s} ${y - 100 * s}L${x - 60 * s} ${y - 12 * s}H${x - 3 * s}z"/>`;
      const jeep = (x, y) => `<rect x="${x}" y="${y - 52}" width="150" height="40" rx="8" fill="#d4402e"/><rect x="${x + 6}" y="${y - 70}" width="138" height="22" rx="6" fill="#f0c040"/><rect x="${x + 14}" y="${y - 44}" width="30" height="20" fill="#7a3a2a"/><rect x="${x + 54}" y="${y - 44}" width="30" height="20" fill="#7a3a2a"/><rect x="${x + 94}" y="${y - 44}" width="30" height="20" fill="#7a3a2a"/><path fill="#2a60b0" d="M${x} ${y - 28}H${x + 150}V${y - 22}H${x}z"/><circle cx="${x + 36}" cy="${y - 10}" r="12" fill="#2a1a2e"/><circle cx="${x + 116}" cy="${y - 10}" r="12" fill="#2a1a2e"/><circle class="us-lit" cx="${x + 150}" cy="${y - 34}" r="5"/>`;
      return `<defs>${lin(s1, [[0, '#3a2a6e'], [0.3, '#a2457e'], [0.58, '#f1745a'], [0.82, '#ffb560'], [1, '#ffd98a']])}${lin(w1, [[0, '#f08a62'], [0.3, '#a8507a'], [1, '#3a2858']])}</defs>`
        + full(`url(#${s1})`) + stars(3, 40, 220) + rays(800, 520, 700, '#ffd078', 0.3) + sun(800, 520, 70, '#fff0b8', '#ffa850') + cloud(300, 230, 1.2, '#c6577a', 0.8, 90, 0, '#f6988a') + cloud(1150, 170, 1, '#c6577a', 0.8, 80, 25, '#f6988a') + cloud(620, 330, 0.8, '#d6677a', 0.7, 100, 10, '#ffaa90')
        + streak(450, 400, 300, '#ffc98a', 0.4, 70)
        + mv('uspar', { ad: '70s', dx: '24px' }, skyline + spire) + wins(63, 920, 1700, 340, 515, 100, 5)
        + `<g fill="#5a3a68" opacity=".7"><path d="M120 520h60l10-14h30v14h40v-24h24v24h80v-8h40v8z"/></g>`
        + `<rect y="520" width="1600" height="380" fill="url(#${w1})"/>`
        + refl(520, 0.3, skyline) + `<path fill="#ffd078" opacity=".5" d="M740 524H860L1020 900H580z"/>`
        + shimmer(21, 70, 300, 1300, 530, 800, '#ffe6a8', 70) + mv('usbob', { ad: '5s', dy: '3px' }, sail(480, 640, 1.0)) + mv('usbob', { ad: '6s', d: '-2s', dy: '3px' }, sail(1100, 600, 0.7))
        + `<rect y="800" width="1600" height="100" fill="#2e2040"/><rect y="800" width="1600" height="10" fill="#4a3458"/>` + dots('M-160 790H1760', '#ffd27a', 6, 50, 'us-lamps')
        + mv('usmove', { ad: '34s', dx: '1500px' }, jeep(200, 864))
        + palm(150, 900, 560, 90, '#25182e', '#25182e', 4, 7) + palm(330, 900, 420, -40, '#2e1d36', '#2e1d36', 5, 6) + palm(1480, 900, 500, -70, '#25182e', '#25182e', 6, 7)
        + `<g opacity=".85">${birds(7, 6, 900, 300, '#3a2236', 1)}</g>` + finish(0.34);
    } });

  /* ---------------- Cebu: outrigger boats over a turquoise sea ---------------- */
  asiaSceneAdd({ key: 'place:cebu', label: 'Outrigger boats off the island', site: 'Banca boats', colour: 'teal', mood: 'cheerful', season: 'any', tags: ['sea', 'boats', 'island'],
    svg: () => {
      const s1 = U(), w1 = U(), i1 = U();
      const banca = (x, y, s, col, awn) => {
        const o = (dy) => `<path fill="none" stroke="#7a5a3a" stroke-width="${4 * s}" d="M${x - 70 * s} ${y + dy * s}H${x + 70 * s}"/>`;
        return `<g>` + `<rect x="${x - 120 * s}" y="${y + 20 * s}" width="${240 * s}" height="${8 * s}" rx="${4 * s}" fill="#e8e0c8"/>` + `<path fill="none" stroke="#6a4a2a" stroke-width="${4 * s}" d="M${x - 40 * s} ${y + 4 * s}L${x - 90 * s} ${y + 22 * s}M${x + 40 * s} ${y + 4 * s}L${x + 90 * s} ${y + 22 * s}"/>`
          + `<path fill="${col}" d="M${R(x - 110 * s)} ${R(y - 4 * s)}Q${R(x - 20 * s)} ${R(y + 22 * s)} ${R(x + 110 * s)} ${R(y - 10 * s)}Q${R(x + 20 * s)} ${R(y + 8 * s)} ${R(x - 110 * s)} ${R(y - 4 * s)}z"/>`
          + `<path fill="${col}" d="M${R(x - 105 * s)} ${R(y - 4 * s)}H${R(x + 105 * s)}L${R(x + 80 * s)} ${R(y + 14 * s)}H${R(x - 80 * s)}z"/><rect x="${R(x - 105 * s)}" y="${R(y - 6 * s)}" width="${R(210 * s)}" height="${R(4 * s)}" fill="#fff"/>`
          + `<path fill="${awn}" d="M${R(x - 50 * s)} ${R(y - 6 * s)}L${R(x - 36 * s)} ${R(y - 44 * s)}H${R(x + 50 * s)}L${R(x + 62 * s)} ${R(y - 6 * s)}z"/><path fill="#fff" opacity=".35" d="M${R(x - 20 * s)} ${R(y - 6 * s)}L${R(x - 12 * s)} ${R(y - 44 * s)}H${R(x + 6 * s)}L${R(x + 2 * s)} ${R(y - 6 * s)}z"/></g>`;
      };
      const isle = `<path fill="#6f8a6a" d="M-160 520V430Q-40 360 40 400Q90 330 190 370Q260 330 330 420Q400 400 480 520z"/><path fill="#a5a590" d="M-160 520V470q80 -20 150 6q60 -30 130 0q70 -22 130 -2q60 -10 120 12V520z"/>`
        + canopy('#4f7a52', 420, 36, 17, -160, 480, 520) ;
      return `<defs>${lin(s1, [[0, '#4aa4dc'], [0.55, '#9fd6ee'], [1, '#e2f4f0']])}${lin(w1, [[0, '#7fe0d6'], [0.25, '#2bbcc0'], [0.6, '#0d8fb4'], [1, '#0b5f94']])}${lin(i1, [[0, '#f2e2b0'], [1, '#d8c48a']])}</defs>`
        + full(`url(#${s1})`) + sun(1250, 150, 40, '#fffbe6', '#fff0b0') + cloud(400, 190, 1.4, '#cfe4f2', 0.95, 90, 0) + cloud(900, 130, 1, '#d6e8f4', 0.95, 70, 15) + cloud(1350, 260, 1.2, '#cfe4f2', 0.9, 110, 40)
        + mv('uspar', { ad: '80s', dx: '20px' }, isle + `<path fill="#7d9c88" opacity=".7" d="M1000 520V480Q1100 440 1200 470Q1300 440 1440 520z"/>`)
        + `<rect y="520" width="1600" height="380" fill="url(#${w1})"/><rect y="520" width="1600" height="8" fill="#fff" opacity=".4"/>`
        + `<path fill="#9ff0e0" opacity=".25" d="M-160 640Q300 600 800 650T1760 620V900H-160z"/>`
        + shimmer(14, 70, -100, 1700, 540, 880, '#e8fffa', 56)
        + mv('usbob', { ad: '5.5s', dy: '4px' }, banca(520, 700, 1.1, '#f4f0e8', '#e2503a')) + mv('usbob', { ad: '6.5s', d: '-2s', dy: '4px' }, banca(1130, 620, 0.75, '#2a78b8', '#f0b830'))
        + mv('usbob', { ad: '7s', d: '-3s', dy: '3px' }, banca(900, 570, 0.5, '#e8503a', '#2ea870'))
        + `<path fill="#f0dca8" d="M-160 900V800Q200 760 520 800T1160 790T1760 810V900z"/><path fill="#fff" opacity=".6" d="M-160 800Q200 760 520 800T1160 790T1760 810V820Q1200 806 1160 802T520 812T-160 812z"/>`
        + mv('ussway', { ad: '6s', dy: '4px' }, `<path fill="#fff" opacity=".35" d="M-160 790Q200 750 520 790T1160 780T1760 800V812Q1200 798 1160 794T520 804T-160 804z"/>`)
        + palm(1450, 880, 520, -90, '#2f7a40', '#6a5236', 21, 6.5) + palm(1300, 880, 400, 50, '#3a8a46', '#6a5236', 22, 7) + palm(150, 900, 460, 80, '#2f7a40', '#6a5236', 23, 6)
        + `<g opacity=".95">${birds(5, 5, 700, 330, '#2e4a5e', 0.9)}</g>` + finish(0.3);
    } });

  /* ---------------- Davao: Mount Apo above the plantations ---------------- */
  asiaSceneAdd({ key: 'place:davao', label: 'Mount Apo above the plantations', site: 'Mount Apo', colour: 'green', mood: 'proud', season: 'any', tags: ['volcano', 'mountain', 'farmland'],
    svg: () => {
      const s1 = U(), m1 = U(), g1 = U(), f1 = U(); const r = rnd(33);
      const banana = (x, y, s) => { let o = ''; for (let i = 0; i < 7; i++) { const a = (-160 + i * 22) * Math.PI / 180, L = (95 + (i % 3) * 18) * s, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L * 0.8 + 16 * s; o += `<path fill="#4aa040" d="M${x} ${y}Q${R(x + Math.cos(a) * L * 0.5)} ${R(y + Math.sin(a) * L * 0.9 - 28 * s)} ${R(ex)} ${R(ey)}Q${R(x + Math.cos(a) * L * 0.5 + 8)} ${R(y + Math.sin(a) * L * 0.7)} ${x} ${y}z"/>`; } return `<path fill="none" stroke="#7a6a42" stroke-width="${8 * s}" d="M${x} ${y + 60 * s}V${y}"/>` + mv('ussway', { ad: (4 + r() * 2).toFixed(1) + 's', d: -r() * 3 + 's', to: `${x}px ${y}px` }, o); };
      let rows = ''; for (let i = 0; i < 14; i++) { const y = 640 + i * 20; rows += `<path fill="none" stroke="#2f6a2c" stroke-width="${2 + i * 0.35}" opacity=".5" d="M-160 ${y}Q800 ${y - 36 - i * 2} 1760 ${y}"/>`; }
      const apo = `<path fill="url(#${m1})" d="M-160 560L180 470Q300 430 390 380Q470 300 560 250Q650 190 720 160Q760 140 800 132Q850 138 890 160Q990 210 1070 280Q1140 340 1210 400Q1340 450 1500 480L1760 540V600H-160z"/>`
        + `<path fill="#2d4a38" opacity=".5" d="M800 132Q760 140 720 160Q650 190 560 250Q470 300 390 380Q520 340 600 330Q700 250 760 220Q800 190 830 170z"/>`
        + `<path fill="#f4ecd8" opacity=".35" d="M800 132Q850 138 890 160Q950 190 990 250Q900 230 860 200Q820 180 800 132z"/>`
        + `<path fill="#4d6a50" d="M720 200l-8 80l30 -50zM900 200l14 70l-40 -40z" opacity=".5"/>`;
      return `<defs>${lin(s1, [[0, '#5aa6dc'], [0.5, '#a9d8ee'], [1, '#f2eed0']])}${lin(m1, [[0, '#5a7d84'], [0.5, '#44705c'], [1, '#3a6a4a']])}${lin(g1, [[0, '#9cd45a'], [1, '#2f7a30']])}${radU(f1, [[0, '#fff8d0', 0.8], [1, '#fff8d0', 0]], 1280, 200, 420)}</defs>`
        + full(`url(#${s1})`) + `<circle cx="1280" cy="200" r="420" fill="url(#${f1})"/>` + sun(1280, 200, 36, '#fffce0', '#fff0a0') + cloud(260, 180, 1.2, '#d4e6f0', 0.95, 90, 0) + cloud(1050, 110, 0.9, '#d4e6f0', 0.9, 70, 30)
        + mv('uspar', { ad: '90s', dx: '18px' }, apo) + mv('usdrift', { ad: '50s', dx: '70px' }, `<ellipse cx="560" cy="330" rx="260" ry="26" fill="#f6f2e4" opacity=".75"/><ellipse cx="1060" cy="350" rx="300" ry="24" fill="#f6f2e4" opacity=".7"/><ellipse cx="800" cy="260" rx="190" ry="14" fill="#fff" opacity=".6"/>`)
        + haze(480, 120, '#dff0e4', 0.7) + ridge('#3f7a48', 560, 50, 8, 31, 620) + canopy('#2f6a3a', 580, 36, 32, -160, 1760, 700)
        + `<path fill="url(#${g1})" d="M-160 640Q500 590 1100 620T1760 600V900H-160z"/>` + rows
        + `<path fill="#7ac0e8" opacity=".6" d="M900 670Q1020 650 1160 680Q1120 700 1000 704z"/><path fill="#c8a870" d="M-160 780Q400 740 800 790T1760 760V900H-160z"/>`
        + mv('ussway2', { ad: '7s', to: '1200px 800px' }, `<g fill="#3a8a36"><path d="M1150 800q20 -80 50 -20q30 -60 50 20z"/></g>`)
        + banana(180, 700, 1.3) + banana(380, 760, 1.5) + banana(1380, 710, 1.4) + banana(1550, 780, 1.6) + banana(960, 800, 1.2)
        + mv('usglide', { ad: '34s', dx: '1000px', dy: '-80px' }, mv('usflap', { ad: '1.1s' }, `<path fill="none" stroke="#2a2a2a" stroke-width="7" stroke-linecap="round" d="M700 230q40 -30 70 0q30 -30 70 0"/>`))
        + `<g opacity=".9">${birds(15, 6, 400, 330, '#2a3a30', 0.8)}</g>` + finish(0.28);
    } });

  /* ---------------- Yangon: the golden stupa at dusk ---------------- */
  asiaSceneAdd({ key: 'place:yangon', label: 'Golden stupa at dusk', site: 'Shwedagon Pagoda', colour: 'amber', mood: 'proud', season: 'any', tags: ['pagoda', 'stupa', 'dusk'],
    svg: () => {
      const s1 = U(), g1 = U(), g2 = U(), gl = U(); const cx = 800;
      const Lp = (dx, y) => `${cx - dx} ${y}`, Rp = (dx, y) => `${cx + dx} ${y}`;
      const stupa = `<path fill="url(#${g1})" d="M${Lp(210, 600)}C${Lp(210, 480)} ${Lp(110, 390)} ${Lp(70, 322)}L${Lp(54, 322)}L${Lp(54, 292)}L${Lp(16, 120)}L${Lp(7, 92)}L${Rp(7, 92)}L${Rp(16, 120)}L${Rp(54, 292)}L${Rp(54, 322)}L${Rp(70, 322)}C${Rp(110, 390)} ${Rp(210, 480)} ${Rp(210, 600)}z"/>`;
      let bands = '', petals = '';
      for (let y = 130; y < 292; y += 15) { const hw = 16 + (54 - 16) * (y - 110) / 182; bands += `<path fill="none" stroke="#8a5a10" stroke-width="2.4" d="M${cx - R(hw)} ${y}Q${cx} ${y + 6} ${cx + R(hw)} ${y}"/>`; }
      for (let i = -5; i <= 5; i++) petals += `<path fill="#f6c850" stroke="#9a6a14" stroke-width="1.5" d="M${cx + i * 12 - 7} 322q7 -24 14 0z"/>`;
      let ribs = ''; for (let i = -4; i <= 4; i++) ribs += `<path fill="none" stroke="#fff0a8" stroke-width="3" opacity=".35" d="M${cx + i * 22} 590Q${cx + i * 14} 470 ${cx + i * 6} 340"/>`;
      const hti = `<rect x="${cx - 18}" y="76" width="36" height="8" fill="#e4a830"/><path fill="#f4c850" d="M${cx - 22} 76H${cx + 22}L${cx + 12} 56H${cx - 12}z"/><path fill="#e4a830" d="M${cx - 14} 56H${cx + 14}L${cx + 8} 40H${cx - 8}z"/><path stroke="#e4a830" stroke-width="4" d="M${cx} 40V10"/><path fill="#f6e08a" d="M${cx} 4l7 10l-7 10l-7 -10z"/>`
        + `<circle class="us-lit" cx="${cx}" cy="14" r="4"/>`;
      const terr = `<path fill="#c88a22" d="M${cx - 320} 640L${cx - 280} 600H${cx + 280}L${cx + 320} 640z"/><path fill="#e0a838" d="M${cx - 290} 604L${cx - 250} 590H${cx + 250}L${cx + 290} 604z"/><rect x="${cx - 360}" y="640" width="720" height="90" fill="#d9a042"/><rect x="${cx - 360}" y="640" width="720" height="10" fill="#f4cc66"/>`;
      const small = (x, y, s) => `<path fill="url(#${g1})" d="M${x - 42 * s} ${y}C${x - 42 * s} ${y - 50 * s} ${x - 18 * s} ${y - 80 * s} ${x - 10 * s} ${y - 100 * s}L${x - 4 * s} ${y - 170 * s}H${x + 4 * s}L${x + 10 * s} ${y - 100 * s}C${x + 18 * s} ${y - 80 * s} ${x + 42 * s} ${y - 50 * s} ${x + 42 * s} ${y}z"/><path fill="#e4a830" d="M${x - 1} ${y - 170 * s}h2v-20h-2z"/><rect x="${x - 50 * s}" y="${y}" width="${100 * s}" height="${10 * s}" fill="#d6962a"/>`;
      let arches = ''; for (let i = 0; i < 12; i++) arches += lit(cx - 340 + i * 56, 668, 20, 32);
      let tr = ''; for (let i = 0; i < 12; i++) tr += `<ellipse cx="${-100 + i * 150}" cy="${690 + (i % 3) * 8}" rx="${52 + (i % 4) * 10}" ry="${70 + (i % 3) * 14}" fill="#1f3a30"/>`;
      return `<defs>${lin(s1, [[0, '#35306e'], [0.35, '#8a4a88'], [0.65, '#ee7a62'], [1, '#ffc078']])}${linU(g1, [[0, '#fff0a0'], [0.3, '#f6c850'], [0.7, '#d8941e'], [1, '#a8660e']], cx - 210, 0, cx + 210, 0)}${radU(gl, [[0, '#ffd870', 0.75], [1, '#ffd870', 0]], cx, 340, 560)}${lin(g2, [[0, '#1f3a30'], [1, '#12241e']])}</defs>`
        + full(`url(#${s1})`) + stars(4, 70, 300) + sun(300, 560, 46, '#ffe8a8', '#ffa860') + cloud(1200, 220, 1.2, '#c6577a', 0.8, 90, 0, '#f09a8a') + cloud(300, 150, 1, '#b0507a', 0.8, 70, 30, '#e6908a') + streak(800, 460, 420, '#ffc08a', 0.35, 90)
        + `<circle cx="${cx}" cy="340" r="560" fill="url(#${gl})"/>`
        + mv('usglow', { ad: '5s', to: `${cx}px 340px` }, rays(cx, 330, 520, '#ffe8a0', 0.28))
        + mv('uspar', { ad: '60s', dx: '16px' }, `<path fill="#2c4a46" d="M-160 640Q200 540 560 610T1200 590T1760 620V740H-160z"/>` + canopy('#24423a', 640, 40, 51, -160, 1760, 760))
        + small(400, 600, 1.1) + small(1200, 600, 1.1) + small(560, 600, 0.8) + small(1040, 600, 0.8)
        + terr + stupa + ribs + bands + petals + hti + arches
        + `<path fill="#fff0a0" opacity=".22" d="M${cx - 40} 120L${cx - 4} 300L${cx - 28} 330L${cx - 60} 300z"/>`
        + dots(`M${cx - 330} 636H${cx + 330}`, '#ffe08a', 6, 26, 'us-lamps')
        + `<rect y="730" width="1600" height="170" fill="url(#${g2})"/>` + tr
        + `<g class="us-lamps">${[0, 1, 2, 3, 4, 5, 6].map((i) => mv('usflicker', { ad: (0.4 + i * 0.07) + 's', d: -i * 0.1 + 's', to: `${380 + i * 140}px 840px` }, `<ellipse cx="${380 + i * 140}" cy="840" rx="6" ry="10" fill="#ffc050"/>`)).join('')}</g>`
        + mv('uspuff', { ad: '9s' }, '') + `<g opacity=".8">${birds(11, 7, 800, 230, '#3a2840', 0.9)}</g>` + finish(0.36);
    } });

  /* ---------------- Mandalay: the teak bridge at sunset ---------------- */
  asiaSceneAdd({ key: 'place:mandalay', label: 'The teak bridge at sunset', site: 'U Bein Bridge', colour: 'orange', mood: 'dreamy', season: 'any', tags: ['bridge', 'lake', 'sunset'],
    svg: () => {
      const s1 = U(), w1 = U(); const r = rnd(70);
      let posts = '', pr = '';
      for (let i = 0; i < 46; i++) { const x = -150 + i * 42, h = 40 + (i % 5) * 4, y = 610 + Math.sin(i * 0.15) * 4; posts += `<rect x="${x}" y="${y}" width="9" height="${h}" fill="#2a1a20"/>`; pr += `<rect x="${x}" y="${y}" width="9" height="${h}" fill="#2a1a20"/>`; }
      const deck = `<rect x="-160" y="598" width="1920" height="14" fill="#3a2428"/><rect x="-160" y="590" width="1920" height="6" fill="#5a3a34"/>`;
      let roofs = ''; for (let i = 0; i < 3; i++) { const x = 300 + i * 420; roofs += `<path fill="#2a1a20" d="M${x - 60} 590L${x - 40} 548H${x + 40}L${x + 60} 590z"/>`; }
      const boat = (x, y, s) => `<path fill="#1e1218" d="M${x - 80 * s} ${y}Q${x} ${y + 20 * s} ${x + 80 * s} ${y - 8 * s}L${x + 60 * s} ${y + 6 * s}Q${x} ${y + 24 * s} ${x - 70 * s} ${y + 8 * s}z"/><path fill="none" stroke="#1e1218" stroke-width="${3 * s}" d="M${x - 10 * s} ${y - 2 * s}L${x - 40 * s} ${y - 54 * s}M${x - 40 * s} ${y - 54 * s}q50 -10 90 20"/>`;
      const far = `<path fill="#6a3a58" d="M-160 560Q100 540 300 556T700 548T1100 556T1760 546V600H-160z"/>` + canopy('#4a2a44', 560, 30, 72, -160, 1760, 600)
        + `<path fill="#4a2a44" d="M1180 556l12 -70l12 70zM1500 556l8 -50l8 50z"/><path fill="#c8884a" opacity=".6" d="M1186 520h12v36h-12z"/>`;
      return `<defs>${lin(s1, [[0, '#4a2a6a'], [0.3, '#b2476a'], [0.6, '#ff8a4a'], [1, '#ffd078']])}${lin(w1, [[0, '#ff9a5a'], [0.2, '#c0557a'], [0.6, '#5a3068'], [1, '#2a1a44']])}</defs>`
        + full(`url(#${s1})`) + stars(6, 40, 200) + rays(780, 560, 640, '#ffe0a0', 0.26) + sun(780, 560, 84, '#fff2c0', '#ffa050') + cloud(240, 260, 1.3, '#a84a72', 0.8, 90, 0, '#f08a78') + cloud(1280, 200, 1.1, '#a84a72', 0.8, 80, 25, '#f08a78') + cloud(780, 150, 0.9, '#b45478', 0.75, 110, 40, '#f09a80')
        + mv('uspar', { ad: '80s', dx: '22px' }, far)
        + `<rect y="556" width="1600" height="344" fill="url(#${w1})"/><path fill="#ffc070" opacity=".5" d="M700 560H860L1060 900H520z"/>`
        + shimmer(31, 70, 100, 1500, 570, 880, '#ffe0a0', 66)
        + mv('usshim', { ad: '6s' }, `<g opacity=".4" transform="translate(0 6)">${posts}</g>`) + posts + deck + roofs
        + `<g opacity=".4" transform="translate(0 1200) scale(1 -1)">${''}</g>`
        + dots('M-160 584H1760', '#ffd27a', 5, 60, 'us-lamps')
        + mv('usbob', { ad: '6s', dy: '3px' }, boat(520, 770, 1.3)) + mv('usbob', { ad: '7s', d: '-2s', dy: '3px' }, boat(1220, 730, 1))
        + mv('usbob', { ad: '5s', d: '-1s', dy: '3px' }, boat(950, 660, 0.6))
        + `<path fill="#2a1a24" d="M-160 900V810Q100 800 200 830Q300 850 360 900z"/><path fill="#2a1a24" d="M1480 900Q1540 830 1760 810V900z"/>`
        + `<path fill="none" stroke="#2a1a24" stroke-width="5" d="M70 810V690M70 760l50 -50M70 770l-50 -60M1650 820V700M1650 770l50 -50M1650 780l-50 -60"/>`
        + `<g opacity=".9">${birds(41, 8, 700, 280, '#3a2030', 1)}</g>` + finish(0.35);
    } });

  /* ---------------- Phnom Penh: the Royal Palace by the river ---------------- */
  asiaSceneAdd({ key: 'place:phnom-penh', label: 'Royal Palace roofs by the river', site: 'Royal Palace', colour: 'violet', mood: 'proud', season: 'any', tags: ['palace', 'river', 'roofs'],
    svg: () => {
      const s1 = U(), w1 = U(), r1 = U(), g1 = U();
      const tiers = (x, y, w, n, hh, fill, tr) => { let o = ''; for (let i = 0; i < n; i++) o += roof(x, y - i * hh, w - i * w * 0.2, hh * 0.9, fill, tr); return o; };
      const chofa = (x, y, s) => `<path fill="#f6c850" d="M${x} ${y}q${6 * s} ${-18 * s} ${2 * s} ${-34 * s}q${-12 * s} ${12 * s} ${-8 * s} ${34 * s}z"/>`;
      const hall = (x, y, w, h, wall, rf) => `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" fill="${wall}"/>` + `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="8" fill="#f6c850"/>`
        + Array.from({ length: Math.max(2, Math.round(w / 56)) }, (_, i) => `<rect x="${x - w / 2 + 14 + i * 56}" y="${y - h + 24}" width="22" height="${h - 24}" rx="11" fill="#c8a860" opacity=".85"/>`).join('')
        + tiers(x, y - h, w + 20, 3, 34, rf, '#f6c850') + chofa(x - w / 2 - 6, y - h - 60, 1) + chofa(x + w / 2 + 6, y - h - 60, 1);
      const spire = (x, y) => { const g = U(); return `<defs>${lin(g, [[0, '#fbe08a'], [1, '#d8921e']])}</defs><rect x="${x - 70}" y="${y - 250}" width="140" height="250" fill="#f4ead2"/>` + `<rect x="${x - 70}" y="${y - 254}" width="140" height="10" fill="#f6c850"/>` + [0, 1, 2].map((i) => roof(x, y - 250 - i * 56, 230 - i * 44, 48, '#d4642a', '#f6c850')).join('')
        + `<path fill="url(#${g})" d="M${x - 38} ${y - 400}L${x - 10} ${y - 520}L${x - 3} ${y - 620}H${x + 3}L${x + 10} ${y - 520}L${x + 38} ${y - 400}z"/>` + `<path stroke="#a8660e" stroke-width="2" d="M${x - 24} ${y - 440}H${x + 24}M${x - 16} ${y - 490}H${x + 16}M${x - 10} ${y - 540}H${x + 10}"/>`
        + `<path fill="#f6c850" d="M${x - 4} ${y - 620}h8v-34h-8z"/>` + [0, 1, 2, 3].map((i) => `<rect class="us-lit" x="${x - 40 + i * 20}" y="${y - 220}" width="12" height="40" rx="6"/>`).join(''); };
      let wall = ''; for (let i = 0; i < 40; i++) wall += `<path fill="#f4ead2" d="M${-160 + i * 50} 720V700l12 -12l12 12V720z"/>`;
      return `<defs>${lin(s1, [[0, '#4a3a86'], [0.4, '#a85a90'], [0.7, '#f0905c'], [1, '#ffd08a']])}${lin(w1, [[0, '#d8785a'], [0.25, '#7a4a78'], [1, '#2a2450']])}${radU(g1, [[0, '#ffd08a', 0.7], [1, '#ffd08a', 0]], 800, 430, 600)}</defs>`
        + full(`url(#${s1})`) + stars(9, 50, 240) + `<circle cx="800" cy="430" r="600" fill="url(#${g1})"/>` + sun(1320, 470, 44, '#ffeab0', '#ffa860') + cloud(300, 180, 1.2, '#b4527c', 0.8, 90, 0, '#f09a88') + cloud(1200, 130, 1, '#b4527c', 0.8, 70, 30, '#f09a88')
        + mv('uspar', { ad: '70s', dx: '20px' }, canopy('#4a3a66', 700, 60, 91, -160, 1760, 760) + bld(92, -160, 1760, 700, 40, 130, '#5c4672', 44, 90, 10))
        + mv('uspar', { ad: '55s', dx: '12px' }, `<g>${hall(260, 720, 250, 90, '#f4e6c6', '#c8532a')}${hall(1320, 720, 270, 100, '#f4e6c6', '#c8532a')}${spire(800, 720)}${hall(560, 720, 200, 70, '#f4e6c6', '#d4642a')}${hall(1050, 720, 200, 70, '#f4e6c6', '#d4642a')}</g>`)
        + `<g opacity=".95">${wall}</g><rect y="716" width="1600" height="16" fill="#e8d8b0"/>`
        + `<rect y="760" width="1600" height="140" fill="url(#${w1})"/>`
        + `<g opacity=".25" transform="translate(0 1480) scale(1 -1)">${''}</g>`
        + shimmer(51, 40, -100, 1700, 770, 890, '#ffd8a0', 60)
        + mv('usbob', { ad: '5s', dy: '3px' }, hull(420, 820, 1.2, '#3a2a58', '#f0a040') + `<path fill="#d4642a" d="M370 806L384 776H460L474 806z"/><rect class="us-lit" x="396" y="788" width="40" height="12" rx="3"/>`)
        + mv('usbob', { ad: '6s', d: '-2s', dy: '3px' }, hull(1180, 850, 1.0, '#4a2a58', '#e0a040'))
        + `<g opacity=".4">${refl(740, 0.9, `<rect x="660" y="540" width="280" height="200" fill="#f4ead2"/>`)}</g>`
        + palm(120, 760, 470, 60, '#243a36', '#2a2a30', 5, 7) + palm(1500, 760, 520, -50, '#243a36', '#2a2a30', 6, 6.5)
        + dots('M-160 730H1760', '#ffd27a', 5, 38, 'us-lamps')
        + `<g opacity=".85">${birds(10, 6, 900, 260, '#3a2a50', 0.9)}</g>` + finish(0.34);
    } });

  /* ---------------- Vientiane: the great golden stupa ---------------- */
  asiaSceneAdd({ key: 'place:vientiane', label: 'The great golden stupa', site: 'That Luang', colour: 'amber', mood: 'proud', season: 'any', tags: ['stupa', 'temple', 'plaza'],
    svg: () => {
      const s1 = U(), g1 = U(), p1 = U(); const cx = 800;
      const Lp = (dx, y) => `${cx - dx} ${y}`, Rp = (dx, y) => `${cx + dx} ${y}`;
      const spire = (x, y, s) => `<path fill="url(#${g1})" d="M${x - 14 * s} ${y}L${x - 12 * s} ${y - 40 * s}Q${x - 8 * s} ${y - 70 * s} ${x} ${y - 110 * s}Q${x + 8 * s} ${y - 70 * s} ${x + 12 * s} ${y - 40 * s}L${x + 14 * s} ${y}z"/><path fill="none" stroke="#9a6414" stroke-width="2" d="M${x - 13 * s} ${y - 20 * s}H${x + 13 * s}M${x - 11 * s} ${y - 36 * s}H${x + 11 * s}"/>`;
      const main = `<path fill="url(#${g1})" d="M${Lp(120, 470)}L${Lp(120, 420)}Q${Lp(100, 390)} ${Lp(80, 360)}L${Lp(78, 320)}Q${Lp(62, 290)} ${Lp(54, 250)}L${Lp(46, 210)}Q${Lp(40, 160)} ${Lp(24, 110)}Q${Lp(12, 70)} ${Lp(3, 40)}L${Rp(3, 40)}Q${Rp(12, 70)} ${Rp(24, 110)}Q${Rp(40, 160)} ${Rp(46, 210)}L${Rp(54, 250)}Q${Rp(62, 290)} ${Rp(78, 320)}L${Rp(80, 360)}Q${Rp(100, 390)} ${Rp(120, 420)}L${Rp(120, 470)}z"/>`;
      let det = ''; for (let y = 120; y < 440; y += 22) det += `<path fill="none" stroke="#8a5a10" stroke-width="2" opacity=".6" d="M${cx - 120 + (440 - y) * 0 - Math.max(8, R((y - 80) * 0.3))} ${y}H${cx + Math.max(8, R((y - 80) * 0.3))}"/>`;
      let lotus = ''; for (let i = -4; i <= 4; i++) lotus += `<path fill="#f8d56a" stroke="#9a6414" stroke-width="1.5" d="M${cx + i * 20 - 11} 430q11 -34 22 0z"/>`;
      const base1 = `<path fill="#d49a28" d="M${Lp(300, 600)}L${Lp(260, 540)}H${Rp(260, 540)}L${Rp(300, 600)}z"/><path fill="#e8b848" d="M${Lp(220, 545)}L${Lp(200, 505)}H${Rp(200, 505)}L${Rp(220, 545)}z"/><path fill="#c8861e" d="M${Lp(150, 506)}L${Lp(130, 468)}H${Rp(130, 468)}L${Rp(150, 506)}z"/>`;
      let minis = ''; for (let i = 0; i < 9; i++) { const x = cx - 240 + i * 60; minis += spire(x, 545, 0.6); }
      for (let i = 0; i < 5; i++) minis += spire(cx - 120 + i * 60, 506, 0.45);
      let wallRow = '', wl = ''; for (let i = 0; i < 32; i++) { const x = -160 + i * 62; wallRow += `<path fill="#d4962a" d="M${x} 640L${x + 8} 600L${x + 20} 640z"/>`; wl += `<rect x="${x + 6}" y="648" width="12" height="30" rx="6" fill="#7a3a1a" opacity=".7"/>`; }
      let frang = ''; const r = rnd(81);
      for (let i = 0; i < 16; i++) frang += `<path fill="${i % 3 ? '#fff' : '#f9e8a8'}" d="M${1300 + r() * 220} ${450 + r() * 140}q8 -12 16 0q-8 12 -16 0z"/>`;
      return `<defs>${lin(s1, [[0, '#2f86d0'], [0.5, '#7ec0ee'], [1, '#d6ecf4']])}${linU(g1, [[0, '#ffe58a'], [0.4, '#f4b830'], [1, '#b8741a']], cx - 120, 0, cx + 120, 0)}${lin(p1, [[0, '#d8c8a2'], [1, '#b8a47a']])}</defs>`
        + full(`url(#${s1})`) + sun(1380, 160, 38, '#fffbe0', '#fff0b0') + cloud(260, 180, 1.4, '#cfe0f0', 0.95, 90, 0) + cloud(1000, 120, 1.1, '#d6e6f4', 0.95, 70, 20) + cloud(1400, 300, 1, '#d0e0f0', 0.9, 110, 45)
        + mv('uspar', { ad: '70s', dx: '18px' }, canopy('#2f6a3a', 590, 60, 82, -160, 1760, 650) + canopy('#245a30', 610, 44, 83, -160, 1760, 650))
        + mv('usglow', { ad: '5s', to: `${cx}px 300px` }, `<circle cx="${cx}" cy="290" r="300" fill="#ffe08a" opacity=".16"/>`)
        + base1 + minis + main + lotus + det
        + `<path fill="#fff6c0" opacity=".3" d="M${cx - 30} 120L${cx - 4} 440H${cx - 50}Q${cx - 44} 300 ${cx - 30} 120z"/>`
        + `<rect x="${cx - 4}" y="6" width="8" height="36" fill="#d49a28"/><path fill="#f8d870" d="M${cx} 0l5 10l-5 10l-5 -10z"/>`
        + `<rect y="640" width="1600" height="260" fill="url(#${p1})"/>` + wallRow + `<rect y="640" width="1600" height="8" fill="#e8c860"/>` + wl
        + `<path fill="#c0a878" opacity=".6" d="M-160 780H1760V810H-160z"/><path fill="#a89468" opacity=".5" d="M600 650L1000 650L1260 900H340z"/>`
        + dots('M-160 650H1760', '#ffe08a', 5, 34, 'us-lamps')
        + `<g class="us-lamps">${[0, 1, 2, 3].map((i) => `<circle cx="${200 + i * 360}" cy="700" r="7" fill="#ffd27a"/>`).join('')}</g>`
        + `<path fill="none" stroke="#5a3a24" stroke-width="22" stroke-linecap="round" d="M1380 900Q1360 700 1420 560"/>` + mv('ussway2', { ad: '8s', to: '1420px 560px' }, `<ellipse cx="1420" cy="520" rx="210" ry="110" fill="#3f8a46"/>${frang}`)
        + mv('usfall', { ad: '9s', dx: '-120px' }, `<path fill="#fff" d="M1380 500q8 -12 16 0q-8 12 -16 0z"/>`) + mv('usfall', { ad: '12s', d: '-4s', dx: '90px' }, `<path fill="#f9e8a8" d="M1500 480q8 -12 16 0q-8 12 -16 0z"/>`)
        + `<g opacity=".9">${birds(14, 6, 500, 220, '#3a4a5a', 0.9)}</g>` + finish(0.3);
    } });

  /* ---------------- Bandar Seri Begawan: the mosque and its lagoon ---------------- */
  asiaSceneAdd({ key: 'place:bandar-seri-begawan', label: 'Mosque and lagoon at blue hour', site: 'Omar Ali Saifuddien Mosque', colour: 'blue', mood: 'calm', season: 'any', tags: ['mosque', 'lagoon', 'stilt village'],
    svg: () => {
      const s1 = U(), w1 = U(), d1 = U(), g1 = U(); const cx = 800;
      const dome = (x, y, r, s) => `<path fill="url(#${d1})" d="M${x - r} ${y}Q${x - r} ${y - r * 1.35} ${x} ${y - r * 1.5}Q${x + r} ${y - r * 1.35} ${x + r} ${y}z"/><path fill="#fff6b0" opacity=".4" d="M${x - r * 0.5} ${y - r * 0.2}Q${x - r * 0.45} ${y - r * 1.0} ${x - r * 0.1} ${y - r * 1.4}Q${x - r * 0.7} ${y - r * 0.9} ${x - r * 0.5} ${y - r * 0.2}z"/><path stroke="#e0a830" stroke-width="4" d="M${x} ${y - r * 1.5}V${y - r * 1.5 - 28 * s}"/>`;
      const mosque = () => {
        let arc = '', col = '';
        for (let i = 0; i < 10; i++) { const x = cx - 270 + i * 60; arc += `<path fill="#9fb0c8" d="M${x + 10} 620V588Q${x + 10} 570 ${x + 26} 570Q${x + 42} 570 ${x + 42} 588V620z"/>` + lit(x + 18, 588, 16, 28); col += `<rect x="${x + 2}" y="560" width="6" height="60" fill="#fff"/>`; }
        return `<rect x="${cx - 300}" y="548" width="600" height="82" fill="#f4f6fa"/><rect x="${cx - 300}" y="540" width="600" height="12" fill="#e2e8f2"/>` + arc + col
          + `<rect x="${cx - 190}" y="470" width="380" height="80" fill="#f8fafc"/><rect x="${cx - 190}" y="466" width="380" height="8" fill="#e0a830"/>`
          + [-150, -90, 90, 150].map((dx) => `<path fill="#e8c860" d="M${cx + dx - 18} 540V500Q${cx + dx - 18} 482 ${cx + dx} 482Q${cx + dx + 18} 482 ${cx + dx + 18} 500V540z"/>` + lit(cx + dx - 8, 502, 16, 32)).join('')
          + `<rect x="${cx - 120}" y="410" width="240" height="60" fill="#f4f6fa"/><rect x="${cx - 120}" y="404" width="240" height="8" fill="#e8c860"/>`
          + dome(cx, 404, 124, 1) + dome(cx - 232, 540, 34, 1) + dome(cx + 232, 540, 34, 1) + dome(cx - 232 + 0, 466, 0.1, 0)
          + `<path fill="#e8c860" d="M${cx - 8} 404h16v-10h-16z"/>` + lit(cx - 10, 424, 20, 30);
      };
      const minaret = (x) => `<rect x="${x - 22}" y="170" width="44" height="460" fill="#f4f6fa"/><rect x="${x - 28}" y="400" width="56" height="12" fill="#e8c860"/><rect x="${x - 26}" y="250" width="52" height="10" fill="#e8c860"/><rect x="${x - 26}" y="168" width="52" height="10" fill="#e8c860"/><path fill="#e8c860" d="M${x - 22} 170V150Q${x - 22} 128 ${x} 124Q${x + 22} 128 ${x + 22} 150V170z"/><path fill="url(#${d1})" d="M${x - 16} 126Q${x - 16} 90 ${x} 84Q${x + 16} 90 ${x + 16} 126z"/><path stroke="#e0a830" stroke-width="3" d="M${x} 84V54"/>` + lit(x - 6, 290, 12, 40) + lit(x - 6, 460, 12, 40) + lit(x - 6, 200, 12, 40);
      const house = (x, y, w, c) => `<rect x="${x}" y="${y - 38}" width="${w}" height="26" fill="${c}"/><path fill="#6a4a3a" d="M${x - 8} ${y - 38}L${x + w / 2} ${y - 62}L${x + w + 8} ${y - 38}z"/>` + lit(x + 8, y - 32, 12, 12) + lit(x + w - 22, y - 32, 12, 12) + `<path stroke="#4a3a30" stroke-width="3" d="M${x + 6} ${y - 12}V${y + 14}M${x + w / 2} ${y - 12}V${y + 14}M${x + w - 6} ${y - 12}V${y + 14}"/>`;
      let stilt = ''; for (let i = 0; i < 6; i++) stilt += house(1180 + i * 90 - (i % 2) * 6, 640 + (i % 2) * 12, 70, i % 2 ? '#c8a888' : '#a8b0b8');
      const barge = `<path fill="#f0f2f6" d="M${cx - 160} 760Q${cx - 60} 790 ${cx + 160} 760V752H${cx - 160}z"/><path fill="#d8a838" d="M${cx - 160} 752H${cx + 160}V744H${cx - 160}z"/><rect x="${cx - 40}" y="710" width="80" height="34" fill="#e8c860"/><path fill="#d49028" d="M${cx - 56} 712L${cx} 680L${cx + 56} 712z"/>` + lit(cx - 30, 722, 14, 16) + lit(cx + 16, 722, 14, 16);
      return `<defs>${lin(s1, [[0, '#2a3a86'], [0.45, '#5a78c0'], [0.78, '#e8a88a'], [1, '#ffd2a0']])}${lin(w1, [[0, '#d6a8a0'], [0.2, '#5a78a8'], [1, '#1e2e5a']])}${linU(d1, [[0, '#fff0a0'], [0.5, '#f0bc3c'], [1, '#b8741a']], cx - 130, 300, cx + 130, 440)}${radU(g1, [[0, '#ffd8a0', 0.6], [1, '#ffd8a0', 0]], cx, 440, 520)}</defs>`
        + full(`url(#${s1})`) + stars(2, 60, 280) + `<circle cx="${cx}" cy="440" r="520" fill="url(#${g1})"/>` + sun(250, 560, 38, '#fff0c8', '#ffc080') + cloud(1200, 230, 1.2, '#7a88b8', 0.8, 90, 0, '#e6b0b0') + cloud(350, 170, 1, '#7a88b8', 0.8, 80, 25, '#e6b0b0') + streak(800, 520, 400, '#ffd0a0', 0.4, 80)
        + mv('uspar', { ad: '80s', dx: '20px' }, ridge('#4a6a8a', 520, 90, 9, 3, 640) + ridge('#2f5a50', 560, 60, 10, 4, 640) + canopy('#244a44', 580, 40, 5, -160, 1760, 650))
        + minaret(cx + 430) + mosque() + `<rect y="632" width="1600" height="20" fill="#cfd6e4"/>`
        + `<rect y="650" width="1600" height="250" fill="url(#${w1})"/>`
        + `<g opacity=".3">${refl(640, 1, mosque() + minaret(cx + 430))}</g>`
        + mv('uspar', { ad: '20s', dx: '14px' }, stilt + `<rect x="1160" y="700" width="560" height="8" fill="#6a4a3a"/>`) + `<g opacity=".25">${refl(700, 1, stilt)}</g>`
        + mv('usbob', { ad: '6s', dy: '3px' }, barge) + mv('usbob', { ad: '6s', dy: '3px' }, `<g opacity=".3" transform="translate(0 1560) scale(1 -1)">${barge}</g>`)
        + shimmer(41, 50, -100, 1700, 660, 880, '#ffe0b0', 56) + shimmer(42, 20, 500, 1100, 660, 880, '#fff0c8', 50)
        + dots(`M${cx - 300} 636H${cx + 300}`, '#ffe08a', 5, 24, 'us-lamps')
        + mv('usbob', { ad: '5s', d: '-1s', dy: '3px' }, hull(280, 840, 1.1, '#2a3a60', '#e0a040') + `<path fill="#d4642a" d="M240 830L254 806H310L324 830z"/>`)
        + `<g opacity=".85">${birds(8, 6, 500, 260, '#2a3a60', 0.9)}</g>` + finish(0.34);
    } });

  /* ---------------- Dili: boats on the bay below dry hills ---------------- */
  asiaSceneAdd({ key: 'place:dili', label: 'Fishing boats under dry hills', site: 'Dili Bay', colour: 'teal', mood: 'calm', season: 'any', tags: ['bay', 'coast', 'hills'],
    svg: () => {
      const s1 = U(), w1 = U(), h1 = U(), g1 = U();
      const boat = (x, y, s, col, tr) => hull(x, y, s, col, tr) + `<path fill="none" stroke="#3a2a20" stroke-width="${3 * s}" d="M${x + 20 * s} ${y - 8 * s}V${y - 70 * s}M${x + 20 * s} ${y - 66 * s}L${x - 40 * s} ${y - 10 * s}"/><path fill="#f4e8d0" d="M${x + 22 * s} ${y - 66 * s}L${x + 70 * s} ${y - 12 * s}H${x + 22 * s}z"/>`;
      let terr = ''; const r = rnd(66);
      for (let i = 0; i < 10; i++) terr += `<path fill="none" stroke="#7a6a3a" stroke-width="3" opacity=".5" d="M${-100 + i * 190} ${470 + r() * 40}q${40 + r() * 40} ${60 + r() * 50} ${10 + r() * 20} ${120 + r() * 60}"/>`;
      return `<defs>${lin(s1, [[0, '#6a8ac8'], [0.35, '#e8a8a8'], [0.65, '#ffc888'], [1, '#ffe6b0']])}${lin(w1, [[0, '#f2c8a0'], [0.12, '#4ac0c0'], [0.5, '#1a90ac'], [1, '#0e5c88']])}${lin(h1, [[0, '#b8a068'], [0.5, '#9a8450'], [1, '#6a7a4a']])}${radU(g1, [[0, '#ffe0a8', 0.9], [1, '#ffe0a8', 0]], 1150, 470, 420)}</defs>`
        + full(`url(#${s1})`) + `<circle cx="1150" cy="470" r="420" fill="url(#${g1})"/>` + sun(1150, 470, 52, '#fff6d0', '#ffd090', true) + cloud(300, 190, 1.3, '#e8a8a0', 0.85, 90, 0, '#ffd6bc') + cloud(850, 130, 1, '#e8a8a0', 0.85, 70, 25, '#ffd6bc') + cloud(1400, 260, 1.1, '#e8a8a0', 0.8, 110, 40, '#ffd6bc')
        + mv('uspar', { ad: '90s', dx: '16px' }, `<path fill="#7a88a8" d="M820 560Q900 500 980 490Q1100 470 1260 520Q1340 540 1400 560z"/><path fill="#6a7a98" opacity=".6" d="M900 560Q1000 520 1100 520T1340 560z"/>`)
        + mv('uspar', { ad: '70s', dx: '20px' }, `<path fill="url(#${h1})" d="M-160 560V420Q0 330 120 370Q220 330 330 380Q440 340 520 420Q620 480 700 560z"/>` + terr + `<path fill="#6a7a4a" d="M-160 560V520Q200 470 520 540L700 560z" opacity=".8"/>` + canopy('#5a7a44', 520, 24, 61, -160, 620, 565))
        + `<rect y="560" width="1600" height="340" fill="url(#${w1})"/>`
        + `<path fill="#ffe0a8" opacity=".5" d="M1080 566H1220L1340 900H820z"/>`
        + shimmer(77, 60, -100, 1700, 580, 880, '#fff0cc', 60)
        + mv('usbob', { ad: '5s', dy: '3px' }, boat(520, 710, 1.1, '#e8d8b0', '#2a8ab8')) + mv('usbob', { ad: '6s', d: '-2s', dy: '3px' }, boat(1030, 650, 0.8, '#c85a3a', '#f4e8d0'))
        + mv('usbob', { ad: '7s', d: '-3s', dy: '3px' }, boat(1380, 600, 0.55, '#2a7aa8', '#f0c050'))
        + `<path fill="#e6c88a" d="M-160 900V820Q150 770 420 810Q640 840 760 900z"/><path fill="#fff" opacity=".55" d="M-160 822Q150 772 420 812Q640 842 760 900H730Q620 850 420 822Q150 786 -160 836z"/>`
        + `<path fill="#c8a868" d="M1100 900Q1300 840 1760 830V900z"/>`
        + palm(120, 880, 440, 80, '#3a6a30', '#6a5236', 63, 6.5) + palm(280, 900, 340, -30, '#4a7a34', '#6a5236', 64, 7) + palm(1500, 880, 470, -70, '#3a6a30', '#6a5236', 65, 6)
        + `<g class="us-lamps">${[0, 1, 2].map((i) => `<circle cx="${1200 + i * 90}" cy="${812 + i * 4}" r="5" fill="#ffd27a"/>`).join('')}</g>`
        + `<g opacity=".9">${birds(23, 6, 600, 300, '#4a3a4a', 0.9)}</g>` + finish(0.3);
    } });
})();
