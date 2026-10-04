/* ============================================================
   ASIA FULL-SCREEN SCENES, batch 2 (Iran, Saudi Arabia, Yemen, Oman, UAE, Qatar, Bahrain, Kuwait, Istanbul, Tbilisi, Yerevan).
   PURE classic script: defines nothing global; it registers entries with asiaSceneAdd() (71-anim-asia.js).
   Each svg() returns the inside of a 1600 x 900 drawing (sliced to fill any screen): a sky and its light, far / mid / near
   layers drifting at different speeds, the landmark, foreground and ambient life. Colours are painted for daytime; the dark
   theme or tod-dusk / tod-night lays the evening grade over them and lights the us-lit windows and us-lamps strings.
   Motion is transform and opacity only. Landscape and architecture only: no flags, maps, text or figures.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, mesa, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish } = K;

  /** A copy of a drawing mirrored about the line y (a reflection in water). */
  const mir = (inner, y, op) => `<g transform="translate(0 ${2 * y}) scale(1 -1)" opacity="${op}">${inner}</g>`;
  /** A ribbed dome (cx, base y, radius, height) with a drum and a finial. */
  const dome = (cx, b, r, h, fill, rib, drum, plain) => {
    let o = '';
    if (drum) o += `<rect x="${R(cx - r * 0.82)}" y="${b}" width="${R(r * 1.64)}" height="${drum}" fill="${fill}"/><path fill="none" stroke="${rib}" stroke-width="2" opacity=".6" d="M${R(cx - r * 0.82)} ${b + 8}h${R(r * 1.64)}"/>`;
    o += `<path fill="${fill}" d="M${R(cx - r)} ${b}C${R(cx - r)} ${R(b - h * 0.72)} ${R(cx - r * 0.45)} ${R(b - h * 0.98)} ${cx} ${b - h}C${R(cx + r * 0.45)} ${R(b - h * 0.98)} ${R(cx + r)} ${R(b - h * 0.72)} ${R(cx + r)} ${b}z"/>`;
    let d = '';
    if (!plain) for (let i = -3; i <= 3; i++) d += `M${R(cx + i * r / 3.4)} ${b}Q${R(cx + i * r / 5)} ${R(b - h * 0.8)} ${cx} ${b - h + 4}`;
    return o + `<path fill="none" stroke="${rib}" stroke-width="1.6" opacity=".45" d="${d}"/><path fill="none" stroke="${rib}" stroke-width="2.4" d="M${cx} ${b - h}V${b - h - Math.max(14, R(r * 0.3))}"/><circle cx="${cx}" cy="${b - h - Math.max(14, R(r * 0.3))}" r="${Math.max(3, R(r * 0.05))}" fill="${rib}"/>`;
  };
  /** A slender minaret (x, base, height, width): tapering shaft, balcony, upper tube, pointed cap. */
  const minaret = (x, b, h, w, fill, band, cap) => {
    const t = b - h, w2 = w * 0.78;
    let o = `<path fill="${fill}" d="M${R(x - w / 2)} ${b}L${R(x - w2 / 2)} ${t}H${R(x + w2 / 2)}L${R(x + w / 2)} ${b}z"/>`;
    for (let i = 1; i < 6; i++) { const y = R(b - h * i / 6.4); o += `<rect x="${R(x - w * 0.52)}" y="${y}" width="${R(w * 1.04)}" height="${R(Math.max(3, w * 0.12))}" fill="${band}" opacity=".85"/>`; }
    o += `<rect x="${R(x - w * 0.95)}" y="${t - 4}" width="${R(w * 1.9)}" height="${R(w * 0.3)}" rx="2" fill="${band}"/>`;
    o += `<rect x="${R(x - w * 0.4)}" y="${R(t - w * 2.2)}" width="${R(w * 0.8)}" height="${R(w * 2)}" fill="${fill}"/><rect x="${R(x - w * 0.6)}" y="${R(t - w * 2.4)}" width="${R(w * 1.2)}" height="${R(w * 0.24)}" fill="${band}"/>`;
    return o + `<path fill="${cap}" d="M${R(x - w * 0.55)} ${R(t - w * 2.4)}Q${x} ${R(t - w * 3.4)} ${x} ${R(t - w * 5.4)}Q${x} ${R(t - w * 3.4)} ${R(x + w * 0.55)} ${R(t - w * 2.4)}z"/>`;
  };
  /** A row of pointed arches (x0 .. x1, base y, height) cut dark into a wall. */
  const arches = (x0, x1, b, h, aw, gap, col) => {
    let d = '';
    for (let x = x0; x + aw <= x1; x += aw + gap) d += `M${x} ${b}V${R(b - h * 0.7)}Q${x} ${R(b - h * 0.92)} ${R(x + aw / 2)} ${b - h}Q${x + aw} ${R(b - h * 0.92)} ${x + aw} ${R(b - h * 0.7)}V${b}z`;
    return `<path fill="${col}" d="${d}"/>`;
  };
  const palm = (x, y, h, lean, col, fcol, seed) => {
    const r = rnd(seed || 5), tx = x + lean, ty = y - h;
    let f = '';
    for (let i = 0; i < 9; i++) {
      const a = (-170 + i * 20 + r() * 8) * Math.PI / 180, L = 70 + r() * 40, ex = R(tx + Math.cos(a) * L), ey = R(ty + Math.sin(a) * L * 0.55 + L * 0.42);
      const mx = R(tx + Math.cos(a) * L * 0.55), my = R(ty + Math.sin(a) * L * 0.9 - 10);
      f += `<path d="M${tx} ${ty}Q${mx} ${my - 8} ${ex} ${ey}Q${mx} ${my + 8} ${tx} ${ty + 3}z"/>`;
    }
    return mv('ussway2', { ad: (5 + r() * 2).toFixed(1) + 's', d: '-' + R(r() * 4) + 's', to: `${x}px ${y}px` }, `<path fill="none" stroke="${col}" stroke-width="${R(h / 22) + 4}" stroke-linecap="round" d="M${x} ${y}Q${R(x + lean * 0.2)} ${R(y - h * 0.55)} ${tx} ${ty}"/><g fill="${fcol}">${f}</g>`);
  };
  /** A camel in profile facing right, feet at (x, y). */
  const camel = (x, y, s, fill) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}"><path d="M-52 -62C-50 -74 -34 -76 -24 -66C-18 -88 2 -90 8 -68C20 -70 30 -72 38 -80L50 -110C52 -118 60 -120 68 -116L88 -108C92 -104 90 -98 84 -98L70 -96L60 -88L50 -66C48 -56 44 -50 42 -44L40 -2H32L32 -40L22 -42L22 -2H14L12 -40L-34 -42L-34 -2H-42L-42 -42L-50 -40L-52 -2H-60L-58 -52z"/><path fill="none" stroke="${fill}" stroke-width="2.5" d="M-56 -58Q-64 -44 -62 -26"/></g>`;
  /** A dhow with a raised stern (centre x, waterline y), optionally with a lateen sail. */
  const dhow = (x, y, s, hull, trim, sail) => `<g transform="translate(${x} ${y}) scale(${s})">` + mv('usbob', { ad: (3 + s).toFixed(1) + 's', dy: '3px' },
    (sail ? `<path fill="${sail}" d="M-6 -150L-10 -34L96 -34C84 -84 44 -124 -6 -150z"/><path stroke="#5b4636" stroke-width="3" d="M-8 -154V-30"/>` : '')
    + `<path fill="${hull}" d="M-110 -30L-104 -60L-84 -42H80C104 -42 124 -54 148 -70L128 -4Q110 8 80 8H-70Q-100 8 -110 -30z"/><path fill="${trim}" d="M-110 -30L-104 -60L-98 -46L-84 -42H80C104 -42 124 -54 148 -70L146 -62C122 -46 104 -34 80 -34H-90z"/><rect x="-52" y="-64" width="70" height="24" fill="${trim}" opacity=".9"/>`) + `</g>`;
  const gull = (seed, n, x, y, col, dx) => birds(seed, n, x, y, col, 1, dx);

  /* ---------- Iran: a tiled mosque and its reflecting pool at dusk ---------- */
  asiaSceneAdd({ key: 'country:IR', label: 'A turquoise-domed mosque at dusk', site: 'Isfahan, the royal mosques', colour: 'teal', mood: 'dreamy', season: 'any', tags: ['mosque', 'dome', 'reflection'],
    svg: () => {
      const s1 = U(), w1 = U(), g1 = U(), g2 = U();
      const bld = (rf) => {
        let o = '';
        if (!rf) o += `<rect x="-160" y="618" width="1920" height="82" fill="#c8a468"/>` + arches(-150, 690, 696, 66, 34, 16, '#6a4a3a') + arches(910, 1760, 696, 66, 34, 16, '#6a4a3a');
        if (!rf) o += `<rect x="-160" y="590" width="1920" height="30" fill="#b99458"/>` + arches(-150, 650, 618, 22, 18, 22, '#5a4034') + arches(950, 1760, 618, 22, 18, 22, '#5a4034');
        else o += `<rect x="-160" y="590" width="1920" height="110" fill="#b99458"/>`;
        o += dome(420, 590, 62, 80, '#2aa1ae', '#0f5766', 14) + dome(1180, 590, 62, 80, '#2aa1ae', '#0f5766', 14);
        o += dome(800, 470, 140, 205, `url(#${g1})`, '#0e5a6a', 0);
        o += minaret(676, 440, 250, 34, '#d3ad6e', '#1f7f94', '#2aa1ae') + minaret(924, 440, 250, 34, '#d3ad6e', '#1f7f94', '#2aa1ae');
        o += `<rect x="676" y="396" width="248" height="304" fill="#d8b274"/><rect x="676" y="396" width="248" height="14" fill="#1f7f94"/><rect x="700" y="420" width="200" height="280" fill="none" stroke="#2a7fa0" stroke-width="7"/>`;
        o += `<path fill="url(#${g2})" d="M730 700V510Q730 440 800 408Q870 440 870 510V700z"/><path fill="#0d3f55" d="M764 700V560Q764 506 800 486Q836 506 836 560V700z"/>`;
        let m = '';
        for (let i = 0; i < 4; i++) { const w = 120 - i * 22, y = 470 + i * 24; for (let j = 0; j < 4 + i; j++) m += `M${R(800 - w / 2 + j * w / (3 + i))} ${y}q${R(w / (7 + 2 * i))} -16 ${R(w / (3 + i))} 0`; }
        o += `<path fill="none" stroke="#9fe0e8" stroke-width="2" opacity=".75" d="${m}"/>` + `<rect x="744" y="640" width="112" height="3" fill="#e6c27a"/>`;
        return o + lit(790, 600, 20, 40) + lit(444, 640, 14, 30) + lit(1156, 640, 14, 30) + lit(560, 650, 12, 26) + lit(1040, 650, 12, 26);
      };
      const cyp = (x, h) => `<path fill="#23422f" d="M${x} ${700 - h}Q${x + 22} ${700 - h * 0.45} ${x + 20} 700H${x - 20}Q${x - 22} ${700 - h * 0.45} ${x} ${700 - h}z"/>`;
      return `<defs>${lin(s1, [[0, '#2a3170'], [0.4, '#7b5aa0'], [0.7, '#e88f8a'], [1, '#ffcf92']])}${lin(w1, [[0, '#d98c8e'], [0.25, '#5c5a98'], [1, '#1f2a5a']])}${linU(g1, [[0, '#46c7cf'], [0.6, '#1f95a6'], [1, '#13768a']], 640, 266, 960, 266)}${lin(g2, [[0, '#2b6fa6'], [1, '#12456b']])}</defs>`
        + full(`url(#${s1})`) + stars(31, 46, 330) + sun(800, 690, 38, '#fff0c8', '#ffb27a')
        + cloud(300, 250, 1.1, '#c86f90', 0.7, 60, 4, '#f7b69a') + cloud(1300, 330, 0.9, '#c06a90', 0.65, 70, 22, '#f9bb9c')
        + mv('uspar', { ad: '44s', dx: '8px' }, ridge('#6b5f98', 650, 40, 8, 9) + haze(590, 90, '#f4b6a0', 0.45))
        + `<rect y="700" width="1600" height="200" fill="url(#${w1})"/>`
        + mv('uspar', { ad: '36s', dx: '9px' }, bld() + cyp(560, 150) + cyp(600, 120) + cyp(1000, 120) + cyp(1040, 150) + cyp(220, 130) + cyp(1380, 130))
        + mir(bld(1) + cyp(560, 150) + cyp(1040, 150), 700, 0.32)
        + `<rect y="700" width="1600" height="200" fill="url(#${w1})" opacity=".55"/>`
        + shimmer(7, 26, 200, 1400, 706, 890, '#ffc8a0', 60) + shimmer(8, 16, 0, 1600, 760, 896, '#7f86c8', 70)
        + [640, 800, 960].map((x, i) => `<g opacity=".8">${puffs(x, 880, 5, '#d8e8f8', 10, 0, 2.6 + i * 0.3, -150, 1.4)}</g>`).join('')
        + `<path fill="#c8a468" d="M-160 868H1760V900H-160z"/><path fill="#a98448" d="M-160 868H1760v6H-160z"/>`
        + `<g class="us-lamps">${dots('M80 720H1520', '#ffd27a', 6, 70, 'us-lamps')}</g>`
        + birds(33, 5, 600, 270, '#3a2a58', 1.1, 700) + finish(0.34);
    } });

  /* ---------- Saudi Arabia: sandstone rock arch, camels and dunes at golden hour ---------- */
  asiaSceneAdd({ key: 'country:SA', label: 'Sandstone rocks and a camel caravan', site: 'AlUla, the desert rocks', colour: 'amber', mood: 'proud', season: 'any', tags: ['desert', 'rock', 'camel'],
    svg: () => {
      const s1 = U(), r1 = U(), d1 = U(), d2 = U(), c1 = U();
      const rock = 'M300 770L330 560C334 470 400 392 520 386C640 380 720 410 776 460L852 468C890 480 900 520 880 560L850 700L880 770H760L736 640C730 580 700 540 640 530C590 524 540 540 510 590L486 770z';
      let strata = '';
      for (let i = 0; i < 9; i++) strata += `M${300 + i * 6} ${460 + i * 34}Q${520} ${440 + i * 34 + (i % 2) * 14} ${880 - i * 8} ${470 + i * 32}`;
      return `<defs><clipPath id="${c1}"><path d="${rock}"/></clipPath>${lin(s1, [[0, '#5d7db3'], [0.4, '#e3a98f'], [0.7, '#ffcf8a'], [1, '#ffe7ae']])}${linU(r1, [[0, '#c4703c'], [0.55, '#a65a30'], [1, '#6e3a22']], 300, 400, 900, 760)}${lin(d1, [[0, '#e0a05c'], [1, '#bc7a40']])}${lin(d2, [[0, '#c4824a'], [1, '#8f5a30']])}</defs>`
        + full(`url(#${s1})`) + rays(1180, 540, 1100, '#fff0c0', 0.12) + sun(1180, 540, 50, '#fffbe0', '#ffc678')
        + streak(300, 190, 320, '#ffd2b0', 0.45) + cloud(1300, 300, 0.9, '#d98f88', 0.55, 64, 8, '#ffe0c0')
        + mv('uspar', { ad: '50s', dx: '8px' }, mesa(-40, 560, 360, 130, '#b98a72', '#c89c82') + mesa(1240, 540, 420, 150, '#b98a72', '#c89c82') + ridge('#c59a78', 640, 26, 10, 3) + haze(560, 120, '#ffd9a8', 0.55))
        + mv('uspar', { ad: '34s', dx: '12px' }, ridge('#d9a064', 700, 30, 8, 4) + `<path fill="url(#${r1})" d="${rock}"/><path fill="#5d2e1c" opacity=".35" d="M780 462L852 468C890 480 900 520 880 560L850 700L880 770H820L840 690L860 560C866 520 850 490 780 462z"/><path clip-path="url(#${c1})" fill="none" stroke="#7a3d22" stroke-width="3" opacity=".55" d="${strata}"/>`
          + `<path fill="url(#${r1})" d="M1280 770L1296 640C1300 590 1340 560 1390 560C1440 560 1470 590 1474 640L1486 770z"/>`)
        + haze(640, 120, '#ffd9a8', 0.4)
        + `<path fill="url(#${d1})" d="M-160 780C100 740 360 760 600 790C860 820 1200 760 1400 770C1560 780 1680 790 1760 790V900H-160z"/>`
        + mv('usmove', { ad: '70s', dx: '460px' }, [0, 1, 2, 3, 4].map((i) => camel(460 + i * 200, 812 - (i % 2) * 8, 1.35, '#3f2818')).join('') + `<path fill="none" stroke="#3f2818" stroke-width="2" opacity=".6" d="M470 700Q580 726 660 700Q760 726 860 700"/>`)
        + `<path fill="url(#${d2})" d="M-160 850C160 810 440 830 700 860C960 890 1300 820 1560 840C1640 846 1700 850 1760 850V900H-160z"/>`
        + `<path fill="#f0c07c" opacity=".55" d="M-160 850C160 810 440 830 700 860C960 890 1300 820 1560 840L1560 846C1300 826 960 896 700 866C440 836 160 816 -160 856z"/>`
        + mv('usdrift', { ad: '9s', dx: '80px' }, `<path fill="none" stroke="#f3d29a" stroke-width="3" opacity=".6" stroke-linecap="round" d="M100 830q60-6 120 0M900 872q70-8 140 0M1360 826q50-6 100 0"/>`)
        + mv('usdrift', { ad: '12s', d: '-4s', dx: '100px' }, `<path fill="none" stroke="#f3d29a" stroke-width="2" opacity=".5" stroke-linecap="round" d="M300 884q60-6 120 0M700 806q50-6 100 0"/>`)
        + palm(1500, 800, 140, -14, '#5b4228', '#3f5a2a', 3) + palm(1550, 820, 110, 16, '#5b4228', '#4a6830', 4)
        + birds(35, 3, 760, 250, '#4a3224', 1.2, 600) + finish(0.32);
    } });

  /* ---------- Yemen: mud-brick tower houses of a mountain old town ---------- */
  asiaSceneAdd({ key: 'country:YE', label: 'Tower houses of an old mountain town', site: 'Sanaa, the old city', colour: 'orange', mood: 'proud', season: 'any', tags: ['old town', 'tower houses', 'mountains'],
    svg: () => {
      const s1 = U(), h1 = U();
      const house = (x, b, w, fl, col, seed) => {
        const r = rnd(seed), fh = 70, top = b - fl * fh - 16;
        let o = `<path fill="${col}" d="M${x} ${b}V${top}H${x + w}V${b}z"/><rect x="${x - 4}" y="${top - 8}" width="${w + 8}" height="12" fill="#f2e8d4"/>`, dk = '', fr = '', f1 = '', f2 = '', lt = '', bd = '';
        const n = Math.max(2, Math.floor(w / 52));
        for (let f = 0; f < fl; f++) {
          const y = b - (f + 1) * fh + 16;
          bd += `M${x} ${y + 44}h${w}`;
          for (let k = 0; k < n; k++) {
            const wx = R(x + (w / n) * (k + 0.5) - 12), wy = y + 2;
            dk += `M${wx} ${wy + 32}V${wy + 12}Q${wx} ${wy} ${wx + 12} ${wy}Q${wx + 24} ${wy} ${wx + 24} ${wy + 12}V${wy + 32}z`;
            fr += `M${wx - 3} ${wy + 34}V${wy + 11}Q${wx - 3} ${wy - 4} ${wx + 12} ${wy - 4}Q${wx + 27} ${wy - 4} ${wx + 27} ${wy + 11}V${wy + 34}`;
            const fan = `M${wx + 2} ${wy + 12}Q${wx + 12} ${wy + 1} ${wx + 22} ${wy + 12}z`;
            if (r() < 0.5) f1 += fan; else f2 += fan;
            if (f > 0 && k % 2 === 0) lt += lit(wx + 4, wy + 15, 16, 16);
          }
        }
        return o + `<path fill="none" stroke="#f2e8d4" stroke-width="5" opacity=".9" d="${bd}"/><path fill="#5a3322" d="${dk}"/><path fill="none" stroke="#f6eee0" stroke-width="3" d="${fr}"/><path fill="#d8603c" d="${f1}"/><path fill="#3f8a9c" d="${f2}"/>` + lt;
      };
      const far = (seed, x0, x1, b, cols) => {
        const r = rnd(seed); let x = x0, o = '', d = '';
        while (x < x1) {
          const bw = 56 + r() * 40, bh = 90 + r() * 140;
          o += `<rect x="${R(x)}" y="${R(b - bh)}" width="${R(bw)}" height="${R(bh)}" fill="${cols[R(r() * 9) % cols.length]}"/><rect x="${R(x - 3)}" y="${R(b - bh - 6)}" width="${R(bw + 6)}" height="9" fill="#efe2c8"/>`;
          for (let y = b - bh + 22; y < b - 20; y += 40) d += `M${R(x + 12)} ${R(y)}h${R(bw - 24)}`;
          x += bw + 4;
        }
        return o + dots(d, '#5a3322', 14, 22, '', ' opacity=".7"') + dots(d, '#ffd27a', 8, 22, 'us-lamps');
      };
      let row1 = '', row2 = '';
      [[-70, 190, 5, '#a8693d'], [136, 170, 4, '#b4764a'], [320, 150, 6, '#9c5e36']].forEach((h, i) => { row1 += house(h[0], 830, h[1], h[2], h[3], 11 + i); });
      [[1150, 150, 6, '#b4764a'], [1316, 190, 4, '#a8693d'], [1520, 160, 5, '#b87a4c']].forEach((h, i) => { row2 += house(h[0], 830, h[1], h[2], h[3], 31 + i); });
      const mid = far(51, 470, 1130, 800, ['#c08558', '#b87a4c', '#c58c60', '#b4764a']);
      return `<defs>${lin(s1, [[0, '#3f86c8'], [0.55, '#8dc2e2'], [1, '#f6e2c0']])}${lin(h1, [[0, '#a08080'], [1, '#d6b8a0']])}</defs>`
        + full(`url(#${s1})`) + rays(220, 140, 900, '#fffbe6', 0.14) + sun(220, 140, 40, '#fffbe8', '#ffe6a0')
        + cloud(620, 230, 1.0, '#c4d8ec', 0.85, 60, 6) + cloud(1280, 150, 1.2, '#c4d8ec', 0.8, 74, 20) + cloud(1480, 380, 0.7, '#d4e4f0', 0.7, 56, 40)
        + mv('uspar', { ad: '52s', dx: '8px' }, ridge('#a58aa0', 520, 70, 8, 12) + ridge('#9a7a78', 580, 50, 9, 14) + haze(520, 110, '#f6e0c4', 0.5))
        + mv('uspar', { ad: '36s', dx: '12px' }, ridge('#a07860', 640, 36, 10, 16) + `<rect x="-160" y="690" width="1920" height="140" fill="#b88a60"/>`
          + `<path fill="#e6d4b6" d="M786 700V330H812V700z"/><path fill="#d2b996" d="M774 330H824V316H774zM782 316H816V308H782z"/><path fill="#6e8f6a" d="M782 306Q799 270 816 306z"/>`)
        + mv('uspar', { ad: '28s', dx: '14px' }, mid)
        + mv('uspar', { ad: '22s', dx: '18px' }, row1 + row2)
        + `<path fill="#8f5a38" d="M-160 830H1760V900H-160z"/><path fill="#a8703f" d="M-160 830H1760v8H-160z"/>`
        + `<path fill="#d9c09a" opacity=".6" d="M300 900L560 830H1040L1300 900z"/>`
        + mv('usdrift', { ad: '40s', dx: '60px' }, haze(760, 90, '#f6dcb4', 0.35))
        + [0, 1, 2, 3, 4, 5].map((i) => mv('usglide', { ad: (14 + i * 2) + 's', d: -(i * 3) + 's', dx: '400px', dy: '-20px' }, mv('usflap', { ad: '.5s', d: -(i * 0.1).toFixed(1) + 's' }, `<path fill="none" stroke="#f4f4f4" stroke-width="3" stroke-linecap="round" d="M${420 + i * 130} ${520 + (i % 3) * 36}q8-9 16 0q8-9 16 0"/>`))).join('')
        + puffs(830, 560, 4, '#fff8ec', 8, 30, 5, -90, 2) + finish(0.32);
    } });

  /* ---------- Oman: a harbour of white houses, a hill tower and dhows under rugged mountains ---------- */
  asiaSceneAdd({ key: 'country:OM', label: 'A harbour under rugged mountains', site: 'Muscat, Mutrah harbour', colour: 'blue', mood: 'calm', season: 'any', tags: ['harbour', 'dhow', 'mountains'],
    svg: () => {
      const s1 = U(), sea = U(), m1 = U();
      const jag = (fill, y, amp, n, seed) => {
        const r = rnd(seed); let d = `M-160 900V${y}`, x = -160;
        for (let i = 0; i < n; i++) { x += 1920 / n; d += `L${R(x - 40 * r())} ${R(y - amp * (0.15 + r() * 0.85))}L${R(x)} ${R(y - amp * 0.1 * r())}`; }
        return `<path fill="${fill}" d="${d}L1760 900z"/>`;
      };
      const town = (seed, x0, x1, b, cols) => {
        const r = rnd(seed); let x = x0, o = '', w = '';
        while (x < x1) {
          const bw = 40 + r() * 46, bh = 34 + r() * 56;
          o += `<rect x="${R(x)}" y="${R(b - bh)}" width="${R(bw)}" height="${R(bh)}" fill="${cols[R(r() * 10) % cols.length]}"/>`;
          if (r() < 0.25) o += `<path fill="#e2e8ea" d="M${R(x + bw * 0.2)} ${R(b - bh)}Q${R(x + bw / 2)} ${R(b - bh - 26)} ${R(x + bw * 0.8)} ${R(b - bh)}z"/>`;
          if (bw > 46) w += lit(R(x + 8), R(b - bh + 10), 8, 12) + lit(R(x + bw - 18), R(b - bh + 10), 8, 12);
          x += bw + 4 + r() * 6;
        }
        return o + w;
      };
      return `<defs>${lin(s1, [[0, '#5fa6dc'], [0.6, '#bfe0ee'], [1, '#fdf0d4']])}${lin(sea, [[0, '#46b8c4'], [0.5, '#1f8aa8'], [1, '#12587c']])}${lin(m1, [[0, '#9a5f48'], [1, '#5a2f2a']])}</defs>`
        + full(`url(#${s1})`) + sun(1330, 150, 36, '#fffdf0', '#fff0b0') + cloud(400, 190, 1.0, '#cfe0ee', 0.85, 60, 4) + cloud(900, 120, 0.7, '#d6e6f0', 0.8, 70, 26) + cloud(1450, 300, 0.8, '#d6e6f0', 0.75, 54, 38)
        + mv('uspar', { ad: '54s', dx: '8px' }, jag('#b88a78', 480, 130, 26, 5) + haze(420, 100, '#f6e4d0', 0.5))
        + mv('uspar', { ad: '38s', dx: '12px' }, jag(`url(#${m1})`, 580, 150, 18, 8) + `<path fill="#7a4636" d="M1000 590L1090 420L1130 330H1190L1230 420L1320 590z"/><path fill="#c98a68" opacity=".4" d="M1190 330L1230 420L1320 590H1230z"/>` + jag('#6d3a30', 610, 60, 24, 21)
          + `<rect x="1128" y="250" width="56" height="74" fill="#efe4cf"/><rect x="1122" y="238" width="68" height="16" fill="#e0d0b0"/><path fill="#efe4cf" d="M1122 238h10v-10h10v10h10v-10h10v10h10v-10h10v10h6v-8h-76z" opacity="0"/><path fill="#d9c8a8" d="M1122 238h8v-12h12v12h12v-12h12v12h12v-12h12v12h-68z"/><path fill="#6b3f2a" d="M1146 324v-26q8-10 16 0v26z"/>`)
        + `<rect y="640" width="1600" height="260" fill="url(#${sea})"/>`
        + mv('uspar', { ad: '30s', dx: '14px' }, `<path fill="#8a5036" d="M-160 640C100 600 300 560 520 580C700 596 900 620 1100 600C1300 580 1560 600 1760 630V660H-160z"/>` + town(41, -140, 1000, 650, ['#f4efe4', '#ece3d0', '#f9f6ee', '#e4d8bf']) + `<g opacity=".95">${town(42, 1000, 1760, 640, ['#f4efe4', '#ece3d0', '#f9f6ee'])}</g>`)
        + `<rect y="650" width="1600" height="10" fill="#e8dcc6" opacity=".7"/>`
        + shimmer(3, 28, -100, 1700, 670, 890, '#d8f4f4', 56) + shimmer(4, 16, -100, 1700, 700, 896, '#0f6a8a', 70)
        + dhow(430, 790, 1.2, '#6b3f26', '#3f2616', '#f6f0e0') + dhow(1150, 760, 0.9, '#7a4a2c', '#3f2616', null) + dhow(840, 700, 0.55, '#6b3f26', '#3f2616', '#f6f0e0') + dhow(1500, 830, 1.05, '#6b3f26', '#e0b04a', null)
        + `<path fill="none" stroke="#d8f4f4" stroke-width="3" opacity=".5" d="M240 794q60 6 120 0M960 764q50 5 100 0"/>`
        + gull(9, 6, 700, 300, '#fff', 520) + puffs(1330, 700, 3, '#ffffff', 6, 20, 6, -60, 2) + finish(0.3);
    } });


  /** A skyline of filler towers (flat or slanted tops) with a lit window carpet. */
  const towers = (seed, x0, x1, b, hmin, hmax, wmin, wmax, fill, glass, glow) => {
    const r = rnd(seed); let x = x0, o = '', d = '';
    while (x < x1) {
      const bw = wmin + r() * (wmax - wmin), bh = hmin + r() * (hmax - hmin), k = r();
      o += k < 0.25 ? `<path d="M${R(x)} ${b}V${R(b - bh + 36)}L${R(x + bw)} ${R(b - bh)}V${b}z"/>` : k < 0.4 ? `<path d="M${R(x)} ${b}V${R(b - bh)}H${R(x + bw * 0.6)}L${R(x + bw)} ${R(b - bh + 24)}V${b}z"/>` : `<rect x="${R(x)}" y="${R(b - bh)}" width="${R(bw)}" height="${R(bh)}"/>`;
      if (bw > 26) for (let y = b - bh + 26; y < b - 14; y += 24) d += `M${R(x + 8)} ${R(y)}h${R(bw - 16)}`;
      x += bw + 2 + r() * 8;
    }
    return `<g fill="${fill}">${o}</g>` + dots(d, glass, 9, 16, '', ' opacity=".5"') + dots(d, glow || '#ffd27a', 5, 16, 'us-lamps');
  };
  /** A dune: a lit slope and a shaded slope meeting on a crest running from (x0, y) up to (x0 + w * 0.5, y - h) and down to (x0 + w, y). */
  const dune = (x0, y, w, h, light, shade, foot) => {
    const cx = x0 + w * 0.46, f = foot || 900;
    return `<path fill="${light}" d="M${x0} ${f}V${y}C${R(x0 + w * 0.2)} ${R(y - h * 0.15)} ${R(cx - w * 0.15)} ${R(y - h)} ${R(cx)} ${R(y - h)}C${R(cx + 10)} ${R(y - h * 0.5)} ${R(cx - w * 0.04)} ${R(y + h * 0.3)} ${R(cx - w * 0.14)} ${f}z"/><path fill="${shade}" d="M${R(cx)} ${R(y - h)}C${R(cx + w * 0.12)} ${R(y - h * 0.9)} ${R(x0 + w * 0.8)} ${R(y - h * 0.1)} ${x0 + w} ${y}V${f}H${R(cx - w * 0.14)}C${R(cx - w * 0.04)} ${R(y + h * 0.3)} ${R(cx + 10)} ${R(y - h * 0.5)} ${R(cx)} ${R(y - h)}z"/>`;
  };
  const sphere = (cx, cy, r, base, band, hi) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${base}"/><path fill="none" stroke="${band}" stroke-width="${R(r / 7)}" opacity=".85" d="M${cx - r} ${cy}A${r} ${R(r * 0.3)} 0 0 0 ${cx + r} ${cy}M${R(cx - r * 0.93)} ${R(cy - r * 0.38)}A${r} ${R(r * 0.26)} 0 0 0 ${R(cx + r * 0.93)} ${R(cy - r * 0.38)}M${R(cx - r * 0.9)} ${R(cy + r * 0.4)}A${r} ${R(r * 0.26)} 0 0 0 ${R(cx + r * 0.9)} ${R(cy + r * 0.4)}M${R(cx - r * 0.6)} ${R(cy - r * 0.8)}A${r} ${R(r * 0.2)} 0 0 0 ${R(cx + r * 0.6)} ${R(cy - r * 0.8)}"/><ellipse cx="${R(cx - r * 0.3)}" cy="${R(cy - r * 0.35)}" rx="${R(r * 0.22)}" ry="${R(r * 0.34)}" fill="${hi}" opacity=".55" transform="rotate(35 ${R(cx - r * 0.3)} ${R(cy - r * 0.35)})"/>`;

  /* ---------- United Arab Emirates: a needle-tower skyline over the dunes at sunrise ---------- */
  asiaSceneAdd({ key: 'country:AE', label: 'Dunes and a glass skyline at sunrise', site: 'The desert and the skyline', colour: 'pink', mood: 'energetic', season: 'any', tags: ['dunes', 'skyline', 'desert'],
    svg: () => {
      const s1 = U(), g1 = U();
      return `<defs>${lin(s1, [[0, '#7c9fd6'], [0.4, '#d8b8d4'], [0.68, '#ffc8b4'], [1, '#ffe6bc']])}${linU(g1, [[0, '#b9a8cc'], [1, '#8a80b0']], 0, 100, 0, 600)}</defs>`
        + full(`url(#${s1})`) + rays(1040, 600, 1200, '#fff1d0', 0.1) + sun(1040, 600, 60, '#fffaf0', '#ffd0a0')
        + streak(380, 170, 300, '#ffe0dc', 0.55) + streak(1300, 250, 260, '#ffd0cc', 0.5, 70) + cloud(700, 300, 0.8, '#d9a4b8', 0.6, 62, 10, '#ffe2d4')
        + mv('uspar', { ad: '46s', dx: '8px' }, towers(61, -160, 1760, 650, 60, 200, 28, 60, '#a898c4', '#6f6a9c', '#ffd27a') + `<path fill="#9b8bbd" d="M1030 650L1042 420L1047 250L1050 130L1053 250L1058 420L1070 650z"/><path fill="#9b8bbd" d="M1040 330h20v90h-20z"/><path fill="#b9a8d8" d="M1050 130L1053 250L1058 420L1070 650H1052z" opacity=".6"/>`
          + `<path fill="#a898c4" d="M640 650C650 520 690 440 780 360C760 460 770 560 790 650z"/><path fill="#c9bbe0" d="M780 360C760 460 770 560 790 650H760C760 560 770 460 780 360z" opacity=".7"/>` + haze(540, 140, '#ffdcc0', 0.55))
        + mv('uspar', { ad: '34s', dx: '12px' }, towers(62, -160, 1760, 690, 40, 110, 36, 70, '#8a7eb2', '#5c5890', '#ffd27a') + haze(640, 90, '#ffd8b8', 0.4))
        + dune(-200, 710, 1100, 90, '#f2b676', '#c98a56', 900) + dune(700, 720, 1200, 110, '#f6c080', '#d29a5e', 900)
        + mv('uspar', { ad: '26s', dx: '16px' }, dune(-240, 800, 1200, 160, '#eeaa66', '#b87646', 900) + dune(640, 830, 1300, 190, '#e89c58', '#a8683c', 900))
        + mv('usdrift', { ad: '8s', dx: '70px' }, `<path fill="none" stroke="#ffe2b4" stroke-width="3" stroke-linecap="round" opacity=".6" d="M200 760q70-8 140 0M1180 790q60-8 120 0"/>`)
        + mv('usdrift', { ad: '11s', d: '-3s', dx: '90px' }, `<path fill="none" stroke="#ffe2b4" stroke-width="2.4" stroke-linecap="round" opacity=".5" d="M620 770q60-8 120 0M900 740q50-8 100 0"/>`)
        + `<path fill="none" stroke="#a8683c" stroke-width="2" opacity=".35" d="M60 860q80-14 160 0M380 880q80-14 160 0M820 862q80-14 160 0M1240 880q80-14 160 0"/>`
        + mv('usmove', { ad: '80s', dx: '300px' }, camel(380, 842, 1.5, '#4a2c1a') + camel(560, 850, 1.5, '#4a2c1a') + camel(740, 844, 1.4, '#4a2c1a'))
        + palm(1470, 880, 190, -30, '#5b4228', '#3f6a30', 6)
        + birds(63, 3, 800, 220, '#5a3a4a', 1.4, 640) + finish(0.32);
    } });

  /* ---------- Qatar: a sunlit bay, dhows and the angular towers of a waterfront ---------- */
  asiaSceneAdd({ key: 'country:QA', label: 'Dhows on a bright waterfront bay', site: 'Doha Bay', colour: 'teal', mood: 'cheerful', season: 'any', tags: ['bay', 'dhow', 'skyline'],
    svg: () => {
      const s1 = U(), sea = U(), t1 = U(), t2 = U();
      const tower = (x, b, w, h, kind) => {
        let o = '';
        if (kind === 0) o = `<path fill="url(#${t1})" d="M${x} ${b}V${b - h + 70}L${x + w} ${b - h}V${b}z"/><path fill="#fff" opacity=".4" d="M${x + w * 0.7} ${b}V${b - h + 10}L${x + w} ${b - h}V${b}z"/>`;
        else if (kind === 1) o = `<path fill="url(#${t2})" d="M${x} ${b}V${b - h * 0.85}Q${x} ${b - h} ${x + w / 2} ${b - h}Q${x + w} ${b - h} ${x + w} ${b - h * 0.85}V${b}z"/><path fill="#fff" opacity=".35" d="M${x + w * 0.65} ${b}V${b - h * 0.95}Q${x + w * 0.9} ${b - h} ${x + w} ${b - h * 0.85}V${b}z"/>`;
        else o = `<path fill="url(#${t1})" d="M${x} ${b}L${x + w * 0.2} ${b - h}H${x + w * 0.8}L${x + w} ${b}z"/><path fill="#d8ecf6" d="M${x + w * 0.5} ${b - h}L${x + w * 0.5} ${b - h - 44}" stroke="#9db4c4" stroke-width="3"/>`;
        let d = ''; for (let y = b - h + 40; y < b - 10; y += 22) d += `M${x + 8} ${y}h${w - 16}`;
        return o + dots(d, '#ffffff', 5, 14, '', ' opacity=".35"') + dots(d, '#ffd27a', 4, 14, 'us-lamps');
      };
      let sky = '';
      [[300, 80, 330, 0], [390, 100, 440, 1], [510, 90, 380, 2], [620, 110, 560, 0], [750, 90, 300, 1], [850, 120, 480, 2], [990, 90, 360, 0], [1090, 110, 420, 1], [1220, 100, 320, 2]].forEach(([x, w, h, k]) => { sky += tower(x, 618, w, h, k); });
      return `<defs>${lin(s1, [[0, '#3b97dc'], [0.55, '#8ed0ee'], [1, '#e8f6f4']])}${lin(sea, [[0, '#38c0c8'], [0.5, '#1590b0'], [1, '#0a5f86']])}${lin(t1, [[0, '#9fd0e8'], [1, '#4f8fb8']])}${lin(t2, [[0, '#e6f2f6'], [1, '#79a8c4']])}</defs>`
        + full(`url(#${s1})`) + sun(560, 130, 38, '#ffffff', '#fff6c0')
        + cloud(300, 180, 0.9, '#d2e6f2', 0.85, 60, 4) + cloud(1180, 150, 1.1, '#d2e6f2', 0.8, 74, 22)
        + mv('uspar', { ad: '46s', dx: '8px' }, `<g opacity=".55">` + towers(71, -160, 300, 618, 40, 120, 30, 60, '#8fb4cc', '#6a98b8') + towers(72, 1320, 1760, 618, 40, 120, 30, 60, '#8fb4cc', '#6a98b8') + `</g>` + haze(520, 100, '#e8f6f4', 0.55))
        + mv('uspar', { ad: '36s', dx: '12px' }, sky)
        + `<rect y="618" width="1600" height="282" fill="url(#${sea})"/><path fill="#e8dcc0" d="M-160 618H1760v14H-160z"/><path fill="#7ec0a0" d="M-160 606H1760v14H-160z" opacity=".5"/>`
        + mir(sky, 618, 0.16)
        + shimmer(5, 30, -100, 1700, 640, 890, '#e8fbfb', 60) + shimmer(6, 20, -100, 1700, 680, 896, '#0a6a90', 70)
        + dhow(380, 760, 1.5, '#7a4a2c', '#e8c060', '#fff6e6') + dhow(1060, 720, 1.0, '#8a5230', '#c8483c', null) + dhow(760, 690, 0.6, '#7a4a2c', '#e8c060', '#fff6e6') + dhow(1400, 800, 1.4, '#7a4a2c', '#2f8a9a', '#fff6e6')
        + `<g class="us-lamps">${dots('M260 744Q380 724 500 744', '#ffd27a', 6, 24, 'us-lamps')}</g>`
        + palm(80, 900, 260, 30, '#5b4228', '#2f6a3a', 8) + palm(1540, 900, 230, -26, '#5b4228', '#2f6a3a', 9)
        + gull(73, 6, 640, 330, '#ffffff', 600) + finish(0.3);
    } });

  /* ---------- Bahrain: an old sea fort with palms at sunset, a pearling dhow offshore ---------- */
  asiaSceneAdd({ key: 'country:BH', label: 'An old sea fort at sunset', site: 'The old fort and the sea', colour: 'violet', mood: 'calm', season: 'any', tags: ['fort', 'sea', 'dhow'],
    svg: () => {
      const s1 = U(), sea = U(), m1 = U();
      const fort = (rf) => {
        let o = `<path fill="#a98a5e" d="M740 720C790 680 860 650 940 640H1280C1340 660 1380 690 1420 720z"/>`;
        o += `<rect x="860" y="540" width="480" height="104" fill="#cfae7a"/><path fill="#cfae7a" d="M860 540h18v-14h16v14h18v-14h16v14h18v-14h16v14h18v-14h16v14h18v-14h16v14h18v-14h16v14h18v-14h16v14h18v-14h16v14h18v-14h16v14h18v-14h16v14h18v-14h16v14h18v-14h16v14H860z" opacity="0"/>`;
        for (let x = 860; x < 1340; x += 32) o += `<rect x="${x}" y="526" width="18" height="16" fill="#cfae7a"/>`;
        [[860, 520], [1340, 520]].forEach(([x, y]) => { o += `<rect x="${x - 38}" y="${y - 60}" width="76" height="190" fill="#c29c68"/><rect x="${x - 44}" y="${y - 72}" width="88" height="16" fill="#cfae7a"/>`; for (let i = 0; i < 4; i++) o += `<rect x="${x - 44 + i * 24}" y="${y - 86}" width="16" height="16" fill="#cfae7a"/>`; });
        o += `<rect x="1050" y="440" width="120" height="110" fill="#d8b884"/><rect x="1040" y="424" width="140" height="20" fill="#cfae7a"/>`;
        for (let i = 0; i < 6; i++) o += `<rect x="${1040 + i * 26}" y="408" width="16" height="18" fill="#cfae7a"/>`;
        o += `<path fill="none" stroke="#a98a5e" stroke-width="2" opacity=".55" d="M860 566h480M860 592h480M860 618h480M1050 466h120M1050 490h120M1050 516h120"/><path fill="#6a4630" d="M1090 550V500Q1090 480 1110 480Q1130 480 1130 500V550z"/><path fill="#6a4630" d="M1004 640V590Q1004 570 1024 570Q1044 570 1044 590V640z"/>`;
        o += `<path fill="#e8cc98" opacity=".5" d="M1320 540h20v104h-20zM1150 440h20v110h-20z"/>`;
        return o + (rf ? '' : lit(1100, 512, 12, 24) + lit(1016, 596, 12, 22) + lit(862, 470, 12, 16) + lit(1336, 470, 12, 16) + lit(1200, 580, 12, 22));
      };
      return `<defs>${lin(s1, [[0, '#3d3f86'], [0.35, '#8a5fa0'], [0.62, '#f08a8e'], [0.82, '#ffb890'], [1, '#ffd89c']])}${lin(sea, [[0, '#f4a090'], [0.2, '#8a6aa8'], [1, '#2a3a76']])}${lin(m1, [[0, '#d8b080'], [1, '#a68458']])}</defs>`
        + full(`url(#${s1})`) + stars(81, 40, 260) + rays(420, 640, 1100, '#ffd8a0', 0.12) + sun(420, 640, 62, '#fff2d0', '#ff9a78')
        + cloud(260, 230, 1.0, '#c0709a', 0.65, 60, 6, '#f8a8a0') + cloud(1200, 180, 1.1, '#b8689a', 0.6, 72, 24, '#f4a0a4')
        + mv('uspar', { ad: '48s', dx: '8px' }, `<path fill="#9a7aa8" d="M-160 662C100 650 300 660 600 656C900 652 1200 664 1760 658V668H-160z"/>` + haze(600, 80, '#ffc8a8', 0.5))
        + `<rect y="660" width="1600" height="240" fill="url(#${sea})"/>`
        + mv('uspar', { ad: '36s', dx: '10px' }, fort(0))
        + `<g transform="translate(0 1440) scale(1 -1)" opacity=".25">${fort(1)}</g><rect y="660" width="1600" height="240" fill="url(#${sea})" opacity=".5"/>`
        + shimmer(7, 28, -100, 1700, 670, 890, '#ffc098', 56) + shimmer(8, 18, -100, 1700, 720, 896, '#6a68b0', 66)
        + `<path fill="url(#${m1})" d="M-160 900V850C120 820 300 836 520 858C700 874 900 840 1100 836C1300 830 1560 846 1760 866V900z"/><path fill="#8a6a44" opacity=".5" d="M-160 884C200 868 500 888 800 892C1100 896 1400 876 1760 888V900H-160z"/>`
        + dhow(300, 722, 0.8, '#5a3a28', '#c8982f', '#f2e4d0') + `<g transform="translate(300 722)"><ellipse cx="0" cy="12" rx="120" ry="5" fill="#ffc098" opacity=".4"/></g>` + dhow(1480, 700, 0.55, '#5a3a28', '#c8982f', null)
        + palm(160, 880, 340, 50, '#3a2630', '#2b1f34', 4) + palm(300, 890, 250, -30, '#3a2630', '#2b1f34', 5) + palm(1420, 890, 360, -50, '#3a2630', '#2b1f34', 6) + palm(1530, 890, 260, 30, '#3a2630', '#2b1f34', 7)
        + birds(83, 4, 1000, 300, '#3a2a58', 1.1, 600) + finish(0.34);
    } });

  /* ---------- Kuwait: slender sphere towers over the Gulf at dusk ---------- */
  asiaSceneAdd({ key: 'country:KW', label: 'Slender sphere towers over the Gulf', site: 'The Gulf waterfront', colour: 'indigo', mood: 'focused', season: 'any', tags: ['towers', 'gulf', 'dusk'],
    svg: () => {
      const s1 = U(), sea = U(), sh = U();
      const twr = (rf) => {
        let o = '';
        // main tower: shaft, lower sphere, upper bulb, needle
        o += `<path fill="url(#${sh})" d="M672 650L690 420H710L728 650z"/><path fill="url(#${sh})" d="M694 350H706V250H700z" opacity="0"/>`;
        o += `<path fill="url(#${sh})" d="M694 360L698 250H702L706 360z"/><path fill="#cfe4ee" d="M699 250L700 130L701 250z" stroke="#cfe4ee" stroke-width="3"/>`;
        o += sphere(700, 396, 58, '#3e93b4', '#d6f0f4', '#ffffff') + sphere(700, 262, 24, '#3e93b4', '#d6f0f4', '#ffffff');
        // second tower
        o += `<path fill="url(#${sh})" d="M876 650L892 470H908L924 650z"/><path fill="url(#${sh})" d="M894 400L898 320H902L906 400z"/><path fill="#cfe4ee" d="M899 320L900 200L901 320z" stroke="#cfe4ee" stroke-width="3"/>`;
        o += sphere(900, 436, 44, '#3e93b4', '#d6f0f4', '#ffffff') + sphere(900, 334, 18, '#3e93b4', '#d6f0f4', '#ffffff');
        // slender third
        o += `<path fill="url(#${sh})" d="M1034 650L1046 300H1054L1066 650z"/><path fill="#cfe4ee" d="M1049 300L1050 220L1051 300z" stroke="#cfe4ee" stroke-width="3"/>` + sphere(1050, 330, 22, '#3e93b4', '#d6f0f4', '#ffffff');
        return o + (rf ? '' : lit(692, 380, 16, 10) + lit(692, 410, 16, 10) + lit(694, 252, 12, 8) + lit(892, 424, 16, 8) + lit(892, 448, 16, 8) + lit(1042, 322, 16, 8) + dots('M700 650V420M900 650V470M1050 650V330', '#ffd27a', 5, 26, 'us-lamps'));
      };
      return `<defs>${lin(s1, [[0, '#1c2f6e'], [0.4, '#37649c'], [0.68, '#e48a7e'], [1, '#ffcf8c']])}${lin(sea, [[0, '#f0a890'], [0.2, '#4a6aa0'], [1, '#12285a']])}${linU(sh, [[0, '#9ec8d8'], [0.5, '#e8f4f8'], [1, '#7aa8c0']], 660, 0, 740, 0)}</defs>`
        + full(`url(#${s1})`) + stars(91, 50, 280) + rays(1250, 650, 1000, '#ffd8a0', 0.1) + sun(1250, 650, 50, '#fff0c8', '#ff9a74')
        + cloud(300, 220, 1.0, '#b86a92', 0.6, 60, 6, '#f4a89c') + cloud(1100, 160, 0.9, '#a86490', 0.55, 70, 26, '#ec9aa0')
        + mv('uspar', { ad: '46s', dx: '8px' }, towers(92, 1180, 1760, 650, 50, 190, 28, 54, '#5a6a9a', '#3a4a7c', '#ffd27a') + towers(93, -160, 480, 650, 40, 120, 30, 56, '#5a6a9a', '#3a4a7c', '#ffd27a') + haze(590, 80, '#ffc8a0', 0.45))
        + `<rect y="650" width="1600" height="250" fill="url(#${sea})"/>`
        + mv('uspar', { ad: '34s', dx: '10px' }, `<path fill="#3a4470" d="M-160 650H1760v34H-160z"/>` + twr(0))
        + mir(twr(1), 650, 0.28) + `<rect y="650" width="1600" height="250" fill="url(#${sea})" opacity=".45"/>`
        + shimmer(5, 26, -100, 1700, 670, 890, '#ffc098', 56) + shimmer(6, 20, -100, 1700, 720, 896, '#5a7ac0', 66)
        + `<path fill="#2a3052" d="M-160 690H1760V900H-160z" opacity="0"/>`
        + dhow(1180, 790, 1.3, '#4a2e22', '#d8a840', '#efe2cc') + dhow(380, 760, 0.8, '#4a2e22', '#d8a840', null)
        + `<g class="us-lamps">${dots('M1060 772Q1180 752 1300 772', '#ffd27a', 6, 22, 'us-lamps')}</g>`
        + palm(110, 900, 300, 40, '#2b2034', '#241a34', 6) + palm(250, 900, 200, -26, '#2b2034', '#241a34', 7) + palm(1500, 900, 280, -36, '#2b2034', '#241a34', 8)
        + birds(94, 4, 520, 300, '#2e2850', 1.1, 600) + finish(0.34);
    } });

  /* ---------- Istanbul: the old city's domes and minarets above the Bosphorus at dawn ---------- */
  asiaSceneAdd({ key: 'place:istanbul', id: 'skyline', label: 'Domes and minarets above the Bosphorus', site: 'Sultanahmet from the Bosphorus', colour: 'pink', mood: 'dreamy', season: 'any', tags: ['domes', 'minarets', 'ferry', 'bosphorus'],
    svg: () => {
      const s1 = U(), sea = U(), d1 = U();
      const hs = (x, b) => {
        let o = `<rect x="${x - 150}" y="${b - 130}" width="300" height="130" fill="#d6a894"/><rect x="${x - 150}" y="${b - 130}" width="300" height="10" fill="#e8c4ae"/>`;
        o += dome(x - 118, b - 128, 56, 46, '#8c8aa8', '#6a6888', 0, 1) + dome(x + 118, b - 128, 56, 46, '#8c8aa8', '#6a6888', 0, 1);
        o += `<rect x="${x - 98}" y="${b - 200}" width="196" height="76" fill="#d6a894"/>` + dome(x - 76, b - 196, 46, 40, '#8c8aa8', '#6a6888', 0, 1) + dome(x + 76, b - 196, 46, 40, '#8c8aa8', '#6a6888', 0, 1);
        o += `<rect x="${x - 76}" y="${b - 236}" width="152" height="44" fill="#d6a894"/>` + dome(x, b - 232, 76, 88, '#8c8aa8', '#6a6888', 0, 1);
        let w = ''; for (let i = -3; i <= 3; i++) w += `M${x + i * 20} ${b - 224}v10`;
        o += `<path fill="none" stroke="#ffd27a" stroke-width="7" stroke-linecap="round" class="us-lamps" d="${w}"/>`;
        for (const dx of [-186, 186]) o += `<rect x="${x + dx - 15}" y="${b - 150}" width="30" height="150" fill="#cf9f8c"/>`;
        let b2 = ''; for (let i = -2; i <= 2; i++) b2 += `M${x + i * 52 - 6} ${b - 20}V${b - 70}Q${x + i * 52 + 4} ${b - 90} ${x + i * 52 + 14} ${b - 70}V${b - 20}z`;
        o += `<path fill="#8a5a4a" opacity=".7" d="${b2}"/>`;
        o += minaret(x - 204, b - 30, 230, 17, '#e6d8c8', '#c8b8a8', '#8c8aa8') + minaret(x + 204, b - 30, 230, 17, '#e6d8c8', '#c8b8a8', '#8c8aa8');
        return o + lit(x - 70, b - 90, 12, 24) + lit(x + 58, b - 90, 12, 24);
      };
      const bm = (x, b) => {
        let o = `<rect x="${x - 120}" y="${b - 100}" width="240" height="100" fill="#cdbfc8"/><rect x="${x - 150}" y="${b - 56}" width="300" height="56" fill="#c6b7c2"/>`;
        for (let i = -4; i <= 4; i++) o += dome(x + i * 34, b - 56, 15, 18, '#8c8aa8', '#6a6888', 0, 1);
        o += dome(x - 90, b - 98, 44, 48, '#8c8aa8', '#6a6888', 0, 1) + dome(x + 90, b - 98, 44, 48, '#8c8aa8', '#6a6888', 0, 1) + dome(x, b - 150, 70, 66, '#8c8aa8', '#6a6888', 0, 1);
        o += dome(x - 40, b - 112, 24, 28, '#8c8aa8', '#6a6888', 0, 1) + dome(x + 40, b - 112, 24, 28, '#8c8aa8', '#6a6888', 0, 1);
        o += `<rect x="${x - 58}" y="${b - 156}" width="116" height="52" fill="#cdbfc8"/>` + dome(x, b - 154, 62, 98, '#8c8aa8', '#6a6888', 0, 1);
        let w = ''; for (let i = -3; i <= 3; i++) w += `M${x + i * 15} ${b - 140}v8`;
        o += `<path fill="none" stroke="#ffd27a" stroke-width="6" stroke-linecap="round" class="us-lamps" d="${w}"/>`;
        for (const [dx, h] of [[-150, 250], [150, 250], [-124, 170], [124, 170]]) o += minaret(x + dx, b - 56, h, 15, '#e0d4d8', '#bcaeb8', '#8c8aa8');
        return o;
      };
      const ferry = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">` + mv('usbob', { ad: '3.4s', dy: '2px' },
        `<path fill="#f4f0ec" d="M-120 -30H110L96 0H-100z"/><path fill="#b8362c" d="M-114 -12H104L100 -4H-110z"/><rect x="-90" y="-52" width="160" height="22" fill="#fbf7f2"/><rect x="-60" y="-72" width="100" height="20" fill="#f4f0ec"/><rect x="-14" y="-98" width="18" height="26" fill="#d8d0c8"/><rect x="-16" y="-104" width="22" height="10" fill="#222"/>`
        + `<path fill="#3a4a6a" d="M-84 -46h22v10h-22zM-54 -46h22v10h-22zM-24 -46h22v10h-22zM6 -46h22v10H6zM36 -46h22v10H36zM-50 -66h18v8h-18zM-22 -66h18v8h-18zM6 -66h18v8H6z" opacity=".75"/>`
        + `<path class="us-lit" d="M-84 -46h22v10h-22zM-24 -46h22v10h-22zM36 -46h22v10H36zM-22 -66h18v8h-18z"/>`) + puffs(-6, y * 0 - 104, 6, '#e8e4ec', 14, 90, 5, -60, 3) + `</g>`;
      let trees = '';
      const r = rnd(7); for (let i = 0; i < 26; i++) trees += `<ellipse cx="${R(480 + r() * 1100)}" cy="${R(640 - r() * 20)}" rx="${R(20 + r() * 20)}" ry="${R(18 + r() * 16)}"/>`;
      return `<defs>${lin(s1, [[0, '#7a8cc8'], [0.35, '#d0a8cc'], [0.65, '#ffbfae'], [1, '#ffe3b6']])}${lin(sea, [[0, '#f0b0a8'], [0.2, '#8a8cc0'], [1, '#2f4a86']])}</defs>`
        + full(`url(#${s1})`) + stars(101, 26, 200) + rays(430, 600, 1100, '#fff0cc', 0.1) + sun(430, 600, 66, '#fffaf0', '#ffc8a4')
        + streak(300, 190, 300, '#ffe4e4', 0.55) + cloud(1200, 190, 1.0, '#d49ab8', 0.65, 64, 12, '#ffdccc') + cloud(760, 130, 0.7, '#d49ab8', 0.55, 56, 30, '#ffdccc')
        + mv('uspar', { ad: '52s', dx: '8px' }, ridge('#a79cc4', 600, 26, 12, 5) + haze(560, 90, '#ffd8c4', 0.5))
        + mv('uspar', { ad: '38s', dx: '12px' }, `<path fill="#9a8ab2" d="M470 650C560 610 760 590 1000 580C1240 570 1460 590 1760 620V650z"/>` + `<g fill="#6a8a78">${trees}</g>` + hs(760, 628) + bm(1190, 622) + `<g fill="#5a7a68">${trees}</g>`)
        + haze(560, 100, '#fbd8d0', 0.4)
        + `<rect y="640" width="1600" height="260" fill="url(#${sea})"/>`
        + mir(`<path fill="#9a8ab2" d="M470 650C560 610 760 590 1000 580C1240 570 1460 590 1760 620V650z"/><g fill="#d6a894"><rect x="610" y="500" width="300" height="140"/><rect x="1070" y="530" width="240" height="110"/></g><g fill="#8c8aa8"><circle cx="760" cy="420" r="70"/><circle cx="1190" cy="490" r="62"/></g>`, 640, 0.2) + `<rect y="640" width="1600" height="260" fill="url(#${sea})" opacity=".55"/>`
        + shimmer(5, 28, -100, 1700, 660, 890, '#ffd0b0', 60) + shimmer(6, 20, -100, 1700, 700, 896, '#6a74b8', 70)
        + mv('usmove', { ad: '70s', dx: '700px' }, ferry(800, 780, 1.4) + `<path fill="none" stroke="#ffe8e0" stroke-width="4" opacity=".5" stroke-linecap="round" d="M580 790q-110 6 -240 18M600 800q-120 10 -260 28"/>`)
        + `<g opacity=".95">${dhow(1340, 700, 0.5, '#3a3050', '#8a6a98', null)}</g>`
        + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => mv('usglide', { ad: (12 + i * 1.6) + 's', d: -(i * 2.4) + 's', dx: '600px', dy: '-30px' }, mv('usflap', { ad: '.55s', d: -(i * 0.12).toFixed(1) + 's' }, `<path fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" d="M${560 + i * 70} ${420 + (i * 53) % 170}q10-12 20 0q10-12 20 0"/>`))).join('')
        + finish(0.3);
    } });

  /* ---------- Tbilisi: balconied houses on the river, a hill fortress and a church on its rock, in autumn ---------- */
  asiaSceneAdd({ key: 'place:tbilisi', id: 'skyline', label: 'Balconied houses above the river in autumn', site: 'The old town and the Kura river', colour: 'orange', mood: 'cosy', season: ['autumn'], tags: ['old town', 'balconies', 'fortress', 'autumn'],
    svg: () => {
      const s1 = U(), rv = U(), cl = U();
      const hcols = ['#e0a860', '#c8704c', '#8ec0a0', '#f0dcb4', '#d88a8a', '#e8c070', '#9fb8d0'];
      const homes = (seed, x0, x1, b, hmin, hmax) => {
        const r = rnd(seed); let x = x0, o = '', win = '', bal = '', rails = '';
        while (x < x1) {
          const w = 62 + r() * 34, h = hmin + r() * (hmax - hmin), c = hcols[R(r() * 20) % hcols.length], top = R(b - h);
          o += `<rect x="${R(x)}" y="${top}" width="${R(w)}" height="${R(h)}" fill="${c}"/><path fill="#9a4a38" d="M${R(x - 5)} ${top}L${R(x + w / 2)} ${top - 24}L${R(x + w + 5)} ${top}z"/>`;
          for (let f = 0; f < 2 + (h > 90 ? 1 : 0); f++) {
            const y = top + 14 + f * 36;
            win += `M${R(x + 10)} ${y}h12v20h-12zM${R(x + w - 22)} ${y}h12v20h-12z`;
            if (f === 0 || r() < 0.6) { bal += `<rect x="${R(x + 4)}" y="${y + 24}" width="${R(w - 8)}" height="10" fill="#5a3a28"/>`; rails += `M${R(x + 8)} ${y + 24}v-10M${R(x + w / 2)} ${y + 24}v-10M${R(x + w - 8)} ${y + 24}v-10`; }
          }
          x += w + 3 + r() * 6;
        }
        return o + `<path fill="#4a3022" d="${win}"/>` + `<path fill="none" stroke="#5a3a28" stroke-width="2" d="${rails}"/>` + bal + dots(win.replace(/h12v20h-12z/g, 'h12'), '#ffd27a', 8, 12, 'us-lamps');
      };
      let treesA = '', treesB = '';
      const r2 = rnd(12); for (let i = 0; i < 30; i++) { const c = ['#d8782a', '#e8a838', '#b8501e', '#c9962e'][i % 4]; treesA += `<circle cx="${R(-120 + r2() * 1880)}" cy="${R(420 + r2() * 90)}" r="${R(24 + r2() * 26)}" fill="${c}"/>`; }
      const r3 = rnd(15); for (let i = 0; i < 26; i++) { const c = ['#d8782a', '#e8a838', '#b8501e', '#8a9a3a'][i % 4]; treesB += `<circle cx="${R(r3() * 1700 - 60)}" cy="${R(690 + r3() * 40)}" r="${R(22 + r3() * 24)}" fill="${c}"/>`; }
      const wall = (x0, x1, y) => { let o = `<path fill="#c8a47e" d="M${x0} ${y + 60}V${y}H${x1}V${y + 60}z"/>`; for (let x = x0; x < x1; x += 22) o += `<rect x="${x}" y="${y - 12}" width="12" height="14" fill="#c8a47e"/>`; return o; };
      const cliff = `M1010 700V470C1010 440 1030 420 1060 414L1180 410C1230 412 1260 440 1262 480V700z`;
      return `<defs>${lin(s1, [[0, '#4b6fb0'], [0.45, '#d29aa8'], [0.75, '#ffc684'], [1, '#ffe0a0']])}${lin(rv, [[0, '#c89a70'], [0.3, '#6a7a78'], [1, '#2a4048']])}</defs>`
        + full(`url(#${s1})`) + stars(111, 20, 160) + rays(1400, 420, 1000, '#ffe6a8', 0.1) + sun(1400, 420, 46, '#fff6d4', '#ffbe6a')
        + cloud(380, 170, 1.0, '#d28a94', 0.7, 60, 6, '#ffd2b4') + cloud(1180, 120, 0.8, '#d28a94', 0.65, 70, 24, '#ffd8b8')
        + mv('uspar', { ad: '54s', dx: '8px' }, ridge('#8c86b4', 400, 80, 9, 3) + `<path fill="#fff" opacity=".4" d="M230 340l24 16 20-10 26 16h-80zM900 330l20 14 24-8 20 14h-70z"/>` + haze(360, 100, '#ffd4b0', 0.5))
        + mv('uspar', { ad: '40s', dx: '12px' }, ridge('#7a6a4a', 500, 50, 9, 6) + treesA)
        + mv('uspar', { ad: '34s', dx: '14px' }, wall(420, 900, 330) + `<path fill="#c8a47e" d="M420 330V270h14v-8h14v8h14v60zM556 330V250l24-26l24 26v80z" opacity="0"/><rect x="410" y="250" width="44" height="90" fill="#b8946a"/><path fill="#8a4a3a" d="M404 250L432 218L460 250z"/><rect x="620" y="262" width="40" height="78" fill="#b8946a"/><path fill="#8a4a3a" d="M614 262L640 232L666 262z"/><rect x="840" y="256" width="46" height="84" fill="#b8946a"/><path fill="#8a4a3a" d="M834 256L863 224L892 256z"/><path fill="#8a6a4a" d="M410 340C500 380 700 390 900 340z"/>`)
        + mv('uspar', { ad: '28s', dx: '16px' }, `<path fill="#a08a64" d="M-160 700V560C-60 520 100 500 300 470C420 452 520 450 700 460V700z"/>` + homes(21, -120, 760, 560, 70, 110) + `<path fill="#8a7450" d="M-160 700V620H760V700z"/>` + homes(22, -140, 700, 650, 74, 100))
        + mv('uspar', { ad: '30s', dx: '12px' }, `<path fill="#8a7a62" d="${cliff}"/><path fill="#6a5a46" opacity=".5" d="M1180 410C1230 412 1260 440 1262 480V700H1210z"/>`
          + `<rect x="1060" y="320" width="116" height="92" fill="#d2ae88"/><path fill="#b8946a" d="M1060 320h116v10H1060z"/><rect x="1086" y="268" width="64" height="52" fill="#d2ae88"/><path fill="#6a6a78" d="M1082 268L1118 190L1154 268z"/><path fill="#6a6a78" d="M1118 190V176" stroke="#6a6a78" stroke-width="3"/><path fill="#8a4a3a" d="M1100 412V366Q1100 350 1114 350Q1128 350 1128 366V412z"/><path fill="#6a5a46" d="M1150 412V380H1166V412z"/>` + lit(1112, 288, 12, 22) + lit(1076, 346, 10, 16) + lit(1148, 346, 10, 16)
          + `<path fill="#6a8a58" d="M1008 470C1020 456 1034 458 1050 446" opacity="0"/><circle cx="1030" cy="436" r="24" fill="#c9962e"/><circle cx="1246" cy="470" r="22" fill="#d8782a"/>`)
        + `<rect y="690" width="1600" height="210" fill="url(#${rv})"/>`
        + mir(`<path fill="#8a7a62" d="${cliff}"/><rect x="-160" y="560" width="920" height="140" fill="#b8845c"/><rect x="1060" y="320" width="116" height="92" fill="#d2ae88"/>`, 700, 0.3) + `<rect y="700" width="1600" height="200" fill="url(#${rv})" opacity=".55"/>`
        + shimmer(5, 26, -100, 1700, 710, 890, '#ffd8a0', 56) + shimmer(6, 18, -100, 1700, 760, 896, '#4a6870', 66)
        + `<path fill="#3a2a22" d="M-160 868C100 850 300 866 600 872C900 878 1200 856 1760 868V900H-160z"/>` + `<g opacity=".95">${treesB}</g>`.replace(/cy="(\d+)"/g, (m, v) => `cy="${+v + 170}"`)
        + `<path fill="none" stroke="#2f2a2a" stroke-width="2" d="M300 262L1500 150"/>` + mv('usmove', { ad: '40s', dx: '900px' }, `<g transform="translate(850 208)"><path stroke="#2f2a2a" stroke-width="2" d="M0 0v16"/><rect x="-14" y="16" width="28" height="18" rx="3" fill="#c8402c"/>${lit(-8, 20, 16, 8)}</g>`)
        + [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<path class="x-usfall" style="--ad:${(10 + i * 1.4).toFixed(1)}s;--d:-${(i * 2.2).toFixed(1)}s;--dx:${(i % 2 ? 1 : -1) * (60 + i * 10)}px" fill="${['#d8782a', '#e8a838', '#b8501e'][i % 3]}" d="M${200 + i * 160} ${100 + (i * 47) % 160}q10-14 20 0q-10 14-20 0z"/>`).join('')
        + puffs(130, 480, 4, '#f0e8e4', 12, 40, 6, -110, 2.4) + birds(113, 4, 900, 200, '#3a2a44', 1.1, 600) + finish(0.32);
    } });

  /* ---------- Yerevan: the great mountain above rose-tuff rooftops at sunrise ---------- */
  asiaSceneAdd({ key: 'place:yerevan', id: 'skyline', label: 'A snowy mountain over rose-coloured rooftops', site: 'Yerevan at sunrise', colour: 'pink', mood: 'calm', season: ['spring'], tags: ['mountain', 'sunrise', 'church', 'apricot'],
    svg: () => {
      const s1 = U(), m1 = U(), sn = U(), f1 = U();
      const blocks = (seed, x0, x1, b, hmin, hmax, cols) => {
        const r = rnd(seed); let x = x0, o = '', win = '';
        while (x < x1) {
          const w = 40 + r() * 50, h = hmin + r() * (hmax - hmin), top = R(b - h);
          o += `<rect x="${R(x)}" y="${top}" width="${R(w)}" height="${R(h)}" fill="${cols[R(r() * 9) % cols.length]}"/><rect x="${R(x - 2)}" y="${top - 3}" width="${R(w + 4)}" height="5" fill="#b86a58" opacity=".6"/>`;
          for (let y = top + 14; y < b - 14; y += 24) win += `M${R(x + 9)} ${y}h${R(w - 18)}`;
          x += w + 2 + r() * 4;
        }
        return o + dots(win, '#6a3a38', 10, 22, '', ' opacity=".55"') + dots(win, '#ffd27a', 6, 22, 'us-lamps');
      };
      const church = (x, b) => `<rect x="${x - 70}" y="${b - 90}" width="140" height="90" fill="#c4887a"/><path fill="#b27264" d="M${x - 76} ${b - 90}L${x} ${b - 130}L${x + 76} ${b - 90}z"/><rect x="${x - 34}" y="${b - 150}" width="68" height="70" fill="#cf9484"/><path fill="#a86a5c" d="M${x - 42} ${b - 150}L${x} ${b - 236}L${x + 42} ${b - 150}z"/><path fill="#c9887a" d="M${x} ${b - 236}V${b - 244}" stroke="#a86a5c" stroke-width="3"/><path fill="#5a3030" d="M${x - 10} ${b}V${b - 40}Q${x} ${b - 54} ${x + 10} ${b - 40}V${b}z"/><path fill="#5a3030" d="M${x - 8} ${b - 130}V${b - 106}Q${x} ${b - 116} ${x + 8} ${b - 106}V${b - 130}z"/>` + lit(x - 6, b - 126, 12, 18);
      const blossom = (x, y, dx, dy, seed) => {
        const r = rnd(seed); let o = '', br = `M${x} ${y}Q${R(x + dx * 0.4)} ${R(y + dy * 0.2)} ${R(x + dx)} ${R(y + dy)}`, fl = '';
        for (let i = 0; i < 38; i++) { const t = r(), px = R(x + dx * t + (r() - 0.5) * 120), py = R(y + dy * t + (r() - 0.3) * 90); fl += `<circle cx="${px}" cy="${py}" r="${R(7 + r() * 7)}" fill="${r() < 0.5 ? '#ffffff' : '#ffd0d8'}"/>`; }
        return mv('ussway2', { ad: '7s', d: '-' + seed + 's', to: `${x}px ${y}px` }, `<path fill="none" stroke="#4a3028" stroke-width="9" stroke-linecap="round" d="${br}"/><g opacity=".92">${fl}</g>`);
      };
      let rows = '';
      for (let i = 0; i < 9; i++) rows += `M${-160 + i * 80} 700L${-200 + i * 220} 770`;
      return `<defs>${lin(s1, [[0, '#6c92d0'], [0.4, '#c8b4d8'], [0.7, '#ffc4b0'], [1, '#ffe6b8']])}${linU(m1, [[0, '#d8c4e0'], [0.5, '#b09ac8'], [1, '#8a7ab0']], 160, 240, 520, 640)}${linU(sn, [[0, '#ffffff'], [1, '#ffd8e0']], 440, 230, 700, 380)}${lin(f1, [[0, '#8ea25a'], [1, '#5a7a3a']])}</defs>`
        + full(`url(#${s1})`) + rays(1330, 600, 1100, '#fff0c8', 0.1) + sun(1330, 600, 52, '#fffaf0', '#ffd0a0')
        + streak(1180, 190, 300, '#ffe6e4', 0.55) + cloud(350, 160, 0.8, '#d49ab8', 0.55, 66, 10, '#ffe0d0') + cloud(1000, 120, 0.7, '#d49ab8', 0.5, 56, 30, '#ffe0d0')
        + mv('uspar', { ad: '60s', dx: '7px' }, `<path fill="#c0a0cc" d="M900 650C960 530 990 430 1030 384C1070 430 1110 530 1200 650z"/><path fill="#fff" opacity=".85" d="M1006 410L1030 384L1054 410L1040 424L1030 408L1018 426z"/><path fill="#ffd8e0" opacity=".6" d="M1030 384L1054 410L1040 424L1030 408z"/>`
          + `<path fill="url(#${m1})" d="M-160 650C100 610 280 490 400 340C440 290 480 250 520 230C560 250 600 290 650 360C760 500 920 610 1100 650z"/><path fill="#8a74ac" opacity=".55" d="M520 230C500 330 470 480 440 650H-160C100 610 280 490 400 340C440 290 480 250 520 230z"/>`
          + `<path fill="url(#${sn})" d="M400 340C440 290 480 250 520 230C560 250 600 290 650 360L626 344L598 388L566 342L534 398L504 346L470 392L438 350L416 384z"/><path fill="#c4a0cc" opacity=".55" d="M520 230C500 290 470 330 438 350L416 384L400 340C440 290 480 250 520 230z"/>`
          + haze(480, 150, '#ffd8d0', 0.55))
        + mv('uspar', { ad: '44s', dx: '10px' }, `<rect x="-160" y="640" width="1920" height="70" fill="url(#${f1})"/><path fill="none" stroke="#c4cc7a" stroke-width="3" opacity=".6" d="${rows}"/>` + `<path fill="#a0b060" opacity=".4" d="M-160 640H1760v8H-160z"/>`)
        + mv('uspar', { ad: '34s', dx: '14px' }, blocks(121, -160, 1760, 730, 40, 110, ['#e0a08a', '#d98f78', '#e8b098', '#cf8a76', '#e6a890']) + haze(690, 80, '#ffd0c0', 0.3))
        + mv('uspar', { ad: '26s', dx: '16px' }, `<path fill="#6a8a48" d="M-160 900V800C100 780 300 790 560 800C800 810 1100 780 1400 790C1560 796 1700 800 1760 800V900z"/>` + blocks(122, 640, 1560, 810, 50, 140, ['#e8a690', '#d98f78', '#ecb49c', '#d4907c']))
        + church(260, 800) + `<path fill="#4f7a3a" d="M-160 900V810C100 790 300 800 500 816C700 830 900 832 1000 840C1200 850 1560 830 1760 840V900z"/>`
        + `<g fill="#6a8a48">${[160, 420, 560, 1030, 1230, 1510].map((x) => `<circle cx="${x}" cy="838" r="${34 + (x % 3) * 8}"/>`).join('')}</g>`
        + blossom(1700, 120, -520, 120, 3) + blossom(1700, 40, -300, 220, 5) + blossom(-100, 60, 360, 150, 7)
        + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<circle class="x-usfall" style="--ad:${(9 + i * 1.3).toFixed(1)}s;--d:-${(i * 1.9).toFixed(1)}s;--dx:${(i % 2 ? 1 : -1) * (40 + i * 9)}px" cx="${900 + i * 70}" cy="${100 + (i * 41) % 120}" r="5" fill="#ffd8e0"/>`).join('')
        + birds(123, 4, 700, 230, '#4a3858', 1.2, 700) + finish(0.3);
    } });
})();
