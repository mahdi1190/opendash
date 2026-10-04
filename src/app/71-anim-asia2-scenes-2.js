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
  const dome = (cx, b, r, h, fill, rib, drum) => {
    let o = '';
    if (drum) o += `<rect x="${R(cx - r * 0.82)}" y="${b}" width="${R(r * 1.64)}" height="${drum}" fill="${fill}"/><path fill="none" stroke="${rib}" stroke-width="2" opacity=".6" d="M${R(cx - r * 0.82)} ${b + 8}h${R(r * 1.64)}"/>`;
    o += `<path fill="${fill}" d="M${R(cx - r)} ${b}C${R(cx - r)} ${R(b - h * 0.72)} ${R(cx - r * 0.45)} ${R(b - h * 0.98)} ${cx} ${b - h}C${R(cx + r * 0.45)} ${R(b - h * 0.98)} ${R(cx + r)} ${R(b - h * 0.72)} ${R(cx + r)} ${b}z"/>`;
    let d = '';
    for (let i = -3; i <= 3; i++) d += `M${R(cx + i * r / 3.4)} ${b}Q${R(cx + i * r / 5)} ${R(b - h * 0.8)} ${cx} ${b - h + 4}`;
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

})();
