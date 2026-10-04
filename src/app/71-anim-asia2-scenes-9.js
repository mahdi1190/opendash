/* ============================================================
   ASIA FULL-SCREEN SCENES, batch 9 (Xi'an, Hangzhou, Tianjin, Nanjing, Tokyo, Osaka, Sapporo, Fukuoka, Seoul,
   Busan, Pyongyang). PURE classic script: registers entries with asiaSceneAdd() (71-anim-asia.js).
   Each svg() returns the inside of a 1600 x 900 drawing (sliced to fill any screen), layered and moving; colours are
   painted for daytime, the evening grade (us-tint) lights us-lit windows, us-lamps strings and us-star stars.
   Architecture and landscape only. Motion is transform and opacity only.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish } = K;

  /** A grid of window dots (glass by day, lit at dusk). */
  const win = (x, y, w, h, sx, sy, glass) => {
    let d = '';
    for (let yy = y; yy < y + h; yy += sy) d += `M${x} ${yy}h${w}`;
    return dots(d, glass || '#2c3a55', 5, sx, '', ' opacity=".5"') + dots(d, '#ffd27a', 5, sx, 'us-lamps');
  };
  /** A run of filler buildings, optionally with window grids. */
  const city = (seed, x0, x1, base, hmin, hmax, wmin, wmax, fill, wc) => {
    const r = rnd(seed); let x = x0, o = '', w = '';
    while (x < x1) {
      const bw = wmin + r() * (wmax - wmin), bh = hmin + r() * (hmax - hmin);
      o += `<rect x="${R(x)}" y="${R(base - bh)}" width="${R(bw)}" height="${R(bh)}"/>`;
      if (r() < 0.3) o += `<rect x="${R(x + bw * 0.3)}" y="${R(base - bh - 14 - r() * 14)}" width="${R(bw * 0.4)}" height="22"/>`;
      if (wc && r() < wc && bw > 22) w += win(R(x + 6), R(base - bh + 12), R(bw - 12), R(bh - 24), 12, 22);
      x += bw + r() * 4;
    }
    return `<g fill="${fill}">${o}</g>${w}`;
  };
  /** A hipped roof with upswept corners (cx centre, y ridge, w eave width, h height). */
  const roof = (cx, y, w, h, fill, trim) => {
    const x0 = cx - w / 2, x1 = cx + w / 2, rw = w * 0.12;
    const d = `M${R(x0 - 6)} ${R(y + h * 0.9)}Q${R(x0 + w * 0.1)} ${R(y + h * 0.82)} ${R(x0 + w * 0.2)} ${R(y + h * 0.4)}L${R(cx - rw)} ${R(y)}H${R(cx + rw)}L${R(x1 - w * 0.2)} ${R(y + h * 0.4)}Q${R(x1 - w * 0.1)} ${R(y + h * 0.82)} ${R(x1 + 6)} ${R(y + h * 0.9)}Q${R(cx)} ${R(y + h * 1.25)} ${R(x0 - 6)} ${R(y + h * 0.9)}z`;
    return `<path fill="${fill}" d="${d}"/>` + (trim ? `<path fill="none" stroke="${trim}" stroke-width="3" d="M${R(x0 + w * 0.2)} ${R(y + h * 0.4)}L${R(cx - rw)} ${R(y)}H${R(cx + rw)}L${R(x1 - w * 0.2)} ${R(y + h * 0.4)}" opacity=".7"/>` : '');
  };
  const petals = (seed, n, col, dmin, dmax) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) o += `<ellipse class="x-usfall" style="--ad:${R(dmin + r() * (dmax - dmin))}s;--d:-${R(r() * 14)}s;--dx:${R(-120 + r() * 220)}px" cx="${R(-40 + r() * 1700)}" cy="${R(r() * 240)}" rx="${(4 + r() * 3).toFixed(1)}" ry="${(2.6 + r() * 2).toFixed(1)}" fill="${col}"/>`;
    return `<g opacity=".92">${o}</g>`;
  };
  /** A blossom/leaf branch from (x,y) reaching toward (x2,y2), with clusters of coloured dots. */
  const bough = (seed, x, y, x2, y2, bark, cols, n, sz) => {
    const r = rnd(seed); let o = `<path fill="none" stroke="${bark}" stroke-width="9" stroke-linecap="round" d="M${x} ${y}Q${R((x + x2) / 2)} ${R((y + y2) / 2 - 60)} ${x2} ${y2}"/>`;
    for (let i = 0; i < n; i++) {
      const t = r(), bx = R(x + (x2 - x) * t + r() * 90 - 45), by = R(y + (y2 - y) * t - Math.sin(t * 3.14) * 50 + r() * 90 - 45);
      o += `<circle cx="${bx}" cy="${by}" r="${R(sz * (0.6 + r() * 0.9))}" fill="${cols[i % cols.length]}"/>`;
    }
    return o;
  };
  /** A pagoda: tiers [w,h] from the bottom up on baseY, brick body, eave bands, a spire. */
  const pagoda = (cx, baseY, tiers, body, eave, dark, spire) => {
    let y = baseY, o = '';
    tiers.forEach(([w, h], i) => {
      y -= h;
      o += `<rect fill="${body}" x="${R(cx - w / 2 + 10)}" y="${R(y)}" width="${w - 20}" height="${h}"/>`
        + `<rect fill="${dark}" x="${R(cx - 7)}" y="${R(y + h * 0.3)}" width="14" height="${R(h * 0.5)}" rx="7" opacity=".75"/>`
        + `<path fill="${eave}" d="M${R(cx - w / 2 - 6)} ${R(y + 12)}Q${R(cx)} ${R(y + 2)} ${R(cx + w / 2 + 6)} ${R(y + 12)}V${R(y + 20)}H${R(cx - w / 2 - 6)}z"/>`
        + `<path fill="${dark}" d="M${R(cx - w / 2 - 6)} ${R(y + 20)}H${R(cx + w / 2 + 6)}l-6 5H${R(cx - w / 2)}z" opacity=".55"/>`;
    });
    return o + `<path fill="${spire}" d="M${cx - 16} ${R(y + 8)}L${cx} ${R(y - 34)}L${cx + 16} ${R(y + 8)}z"/><path d="M${cx} ${R(y - 34)}V${R(y - 70)}" stroke="${spire}" stroke-width="4"/><circle cx="${cx}" cy="${R(y - 72)}" r="5" fill="${spire}"/>`;
  };
  /** A lattice tower body between two half-width functions sampled at slices (alternating tones). */
  const lattice = (cx, y0, y1, hw0, hw1, tones, n, brace) => {
    let o = '', ys = [], hw = (y) => hw0 + (hw1 - hw0) * ((y0 - y) / (y0 - y1));
    for (let i = 0; i <= n; i++) ys.push(y0 + (y1 - y0) * (i / n));
    for (let i = 0; i < n; i++) {
      const a = ys[i], b = ys[i + 1];
      o += `<path fill="${tones[i % tones.length]}" d="M${R(cx - hw(a))} ${R(a)}L${R(cx - hw(b))} ${R(b)}H${R(cx + hw(b))}L${R(cx + hw(a))} ${R(a)}z"/>`;
      o += `<path stroke="${brace}" stroke-width="2.2" fill="none" d="M${R(cx - hw(a))} ${R(a)}L${R(cx + hw(b))} ${R(b)}M${R(cx + hw(a))} ${R(a)}L${R(cx - hw(b))} ${R(b)}"/>`;
    }
    return o;
  };

  /* ---------- Xi'an: the Big Wild Goose Pagoda among golden ginkgo ---------- */
  asiaSceneAdd({ key: 'place:xian', label: 'Big Wild Goose Pagoda', site: 'Big Wild Goose Pagoda', colour: 'amber', mood: 'calm', season: ['autumn'], tags: ['pagoda', 'landmark', 'autumn'],
    svg: () => {
      const s1 = U(), g1 = U(), tiers = [[196, 100], [176, 78], [158, 68], [142, 60], [128, 54], [116, 50], [104, 46]];
      let leaves = '';
      const tree = (x, y, s, seed) => { const r = rnd(seed); let c = `<path fill="#5a4030" d="M${x - 9 * s} ${y}l${5 * s} ${-150 * s}h${8 * s}l${5 * s} ${150 * s}z"/>`; for (let i = 0; i < 16; i++) c += `<circle cx="${R(x + (r() - 0.5) * 210 * s)}" cy="${R(y - 170 * s - r() * 120 * s)}" r="${R((46 + r() * 40) * s)}" fill="${['#f0b830', '#e8a21c', '#f7cf4a', '#d98d14'][i % 4]}"/>`; return c; };
      for (let i = 0; i < 30; i++) { const r = rnd(i * 7 + 3); leaves += `<path class="x-usfall" style="--ad:${R(9 + r() * 8)}s;--d:-${R(r() * 14)}s;--dx:${R(-100 + r() * 200)}px" fill="#f2b92c" d="M${R(r() * 1600)} ${R(r() * 220)}l7 -4l7 4l-7 9z"/>`; }
      return `<defs>${lin(s1, [[0, '#5da4d8'], [0.55, '#a9d3ec'], [1, '#fbe6b8']])}${lin(g1, [[0, '#c9a455'], [1, '#8a7035']])}</defs>`
        + full(`url(#${s1})`) + sun(300, 210, 40, '#fff4cc', '#ffe08a') + stars(5, 20, 200)
        + cloud(420, 190, 0.9, '#cfe0ee', 0.85, 62, 6) + cloud(1230, 150, 0.8, '#d8e6f0', 0.8, 70, 28) + streak(1000, 90, 260, '#fff', 0.45, 80)
        + mv('uspar', { ad: '44s', dx: '10px' }, ridge('#9dbbcf', 560, 70, 7, 4) + ridge('#86a9b8', 600, 50, 8, 9))
        + mv('uspar', { ad: '34s', dx: '12px' }, city(31, -160, 1760, 650, 20, 60, 40, 80, '#b59c76', 0.0))
        + `<rect x="-160" y="640" width="1920" height="260" fill="url(#${g1})"/>`
        + `<path fill="#b79a68" d="M520 700H1080V664H520z"/><path fill="#c9ad77" d="M560 664H1040V630H560z"/><path d="M600 700V664M700 700V664M800 700V664M900 700V664M1000 700V664" stroke="#8f7648" stroke-width="3"/>`
        + `<path d="M770 700V630M830 700V630" stroke="#d8bf8c" stroke-width="6"/>`
        + `<g>${pagoda(800, 632, tiers, '#d1ad72', '#a98c5c', '#4d3a22', '#6d5a3a')}</g>`
        + mv('uspar', { ad: '40s', dx: '14px' }, tree(250, 760, 1.15, 12) + tree(1360, 770, 1.3, 21) + tree(120, 800, 0.8, 8) + tree(1500, 800, 0.8, 18))
        + `<path fill="#c79d2c" d="M-160 860Q300 800 800 850T1760 840V900H-160z" opacity=".95"/>`
        + `<path fill="#e5b43c" d="M-160 880Q400 840 900 880T1760 870V900H-160z"/>`
        + birds(8, 5, 1000, 260, '#5b4a3a', 1.2, 700) + leaves + petals(5, 10, '#f6c94a', 10, 18)
        + haze(560, 110, '#fff1c8', 0.4) + finish(0.3);
    } });

  /* ---------- Hangzhou: West Lake in morning mist, pagoda, willows ---------- */
  asiaSceneAdd({ key: 'place:hangzhou', label: 'West Lake in morning mist', site: 'West Lake', colour: 'green', mood: 'dreamy', season: 'any', tags: ['lake', 'pagoda', 'willow', 'mist'],
    svg: () => {
      const s1 = U(), w1 = U();
      const willow = (x, y, s, seed) => { const r = rnd(seed); let o = `<path fill="#4a3a2a" d="M${x - 10 * s} ${y}Q${x} ${R(y - 150 * s)} ${x - 28 * s} ${R(y - 240 * s)}l${22 * s} 0Q${x + 6 * s} ${R(y - 140 * s)} ${x + 10 * s} ${y}z"/>`, st = '';
        for (let i = 0; i < 26; i++) { const sx = R(x - 130 * s + r() * 220 * s), sy = R(y - 240 * s + r() * 40 * s); st += `M${R(x - 20 * s)} ${R(y - 240 * s)}Q${sx} ${sy} ${R(sx + (r() - 0.5) * 30)} ${R(y - 40 * s - r() * 90 * s)}`; }
        return o + mv('ussway', { ad: R(5 + r() * 3) + 's', to: `${x}px ${R(y - 240 * s)}px` }, `<g fill="#8bb55a" opacity=".85"><ellipse cx="${x - 20 * s}" cy="${R(y - 250 * s)}" rx="${R(120 * s)}" ry="${R(36 * s)}"/></g><path fill="none" stroke="#7fae4f" stroke-width="3.2" stroke-linecap="round" d="${st}"/><path fill="none" stroke="#a9cf72" stroke-width="2" d="${st}" opacity=".6" transform="translate(6 0)"/>`);
      };
      const boat = (x, y, s, dur, del) => mv('usmove', { ad: dur + 's', d: del + 's', dx: '240px' }, mv('usbob', { ad: '3.4s', dy: '3px' },
        `<path fill="#3d2f27" d="M${x - 70 * s} ${y}Q${x} ${R(y + 24 * s)} ${x + 70 * s} ${y}l${-10 * s} ${-12 * s}h${-100 * s}z"/><path fill="#5a4a3a" d="M${x - 40 * s} ${R(y - 12 * s)}Q${x} ${R(y - 50 * s)} ${x + 40 * s} ${R(y - 12 * s)}z"/>${lit(R(x - 14 * s), R(y - 26 * s), R(28 * s), R(10 * s))}`));
      let lotus = '';
      const r = rnd(41);
      for (let i = 0; i < 18; i++) { const x = R(-60 + r() * 1720), y = R(760 + r() * 120), rr = R(34 + r() * 36); lotus += `<ellipse cx="${x}" cy="${y}" rx="${rr}" ry="${R(rr * 0.3)}" fill="${i % 2 ? '#4f8a54' : '#5f9d5f'}"/>`; if (i % 4 === 0) lotus += `<path d="M${x} ${y}V${y - 80}" stroke="#4f8a54" stroke-width="4"/><path fill="#f6b4c4" d="M${x - 22} ${y - 80}Q${x} ${y - 124} ${x + 22} ${y - 80}Q${x} ${y - 66} ${x - 22} ${y - 80}z"/><path fill="#ffd9e2" d="M${x - 8} ${y - 80}Q${x} ${y - 108} ${x + 8} ${y - 80}z"/>`; }
      return `<defs>${lin(s1, [[0, '#9bb7a7'], [0.45, '#d4e0cf'], [1, '#f6efd4']])}${lin(w1, [[0, '#d3e0cc'], [1, '#6d9a86']])}</defs>`
        + full(`url(#${s1})`) + sun(1180, 330, 38, '#fffbe6', '#fff0c0') + stars(2, 14, 200)
        + cloud(380, 170, 0.9, '#d9e4da', 0.7, 70, 10, '#f4f7ee')
        + mv('uspar', { ad: '50s', dx: '10px' }, ridge('#b5cbb8', 470, 90, 6, 14))
        + mv('uspar', { ad: '40s', dx: '14px' }, ridge('#98b8a0', 520, 70, 7, 3) + haze(470, 80, '#eef3df', 0.7))
        // Leifeng-style pagoda on the hill
        + `<path fill="#6f9877" d="M900 560Q1080 430 1260 560z"/>`
        + `<g>${pagoda(1085, 480, [[96, 40], [86, 36], [76, 34], [68, 32], [60, 30]], '#b4553a', '#7e4a32', '#40261a', '#c9a24a')}</g>`
        + `<path fill="#e6e8d6" opacity=".55" d="M840 505Q1080 470 1340 520V560H840z"/>`
        + `<rect x="-160" y="560" width="1920" height="340" fill="url(#${w1})"/>`
        // Broken Bridge arch and causeway
        + `<path fill="#bdb6a2" d="M120 560Q230 470 340 560V576H120z"/><path fill="#8a8272" d="M170 576Q230 520 290 576z"/><path fill="#9c957f" d="M80 560H380V572H80z"/>`
        + `<path fill="#7c9a68" d="M-160 556Q150 540 420 560V572Q150 580 -160 574z"/>`
        + shimmer(7, 26, 0, 1600, 590, 760, '#f4fbef', 60) + shimmer(9, 14, 0, 1600, 610, 760, '#8bb8aa', 70)
        + boat(560, 650, 1.0, 38, 4) + boat(1060, 720, 1.45, 52, 20)
        + mv('uspar', { ad: '46s', dx: '10px' }, willow(180, 640, 1.0, 5) + willow(1450, 650, 1.1, 9))
        + lotus
        + `<g class="x-ussway" style="--ad:7s;transform-box:view-box;transform-origin:0px 900px">${bough(3, -80, 120, 420, 90, '#503e2e', ['#9ec96a', '#b3d77f', '#86b455'], 40, 17)}</g>`
        + birds(5, 4, 600, 280, '#4f5f55', 1, 500) + puffs(1180, 640, 0, '#fff') + haze(540, 130, '#f0f4e0', 0.55) + petals(4, 8, '#ffd9e2', 12, 20) + finish(0.3);
    } });

  /* ---------- Tianjin: the Ferris wheel over the Hai River at dusk ---------- */
  asiaSceneAdd({ key: 'place:tianjin', label: 'The Eye over the Hai River', site: 'The Tianjin Eye', colour: 'blue', mood: 'energetic', season: 'any', tags: ['ferris wheel', 'bridge', 'river', 'dusk'],
    svg: () => {
      const s1 = U(), w1 = U(), g1 = U(), cx = 800, cy = 380, Rr = 255;
      let spokes = '', pods = '';
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; spokes += `M${cx} ${cy}L${R(cx + Rr * Math.cos(a))} ${R(cy + Rr * Math.sin(a))}`; }
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 + 0.1, px = R(cx + Rr * Math.cos(a)), py = R(cy + Rr * Math.sin(a)); pods += `<circle cx="${px}" cy="${py}" r="13" fill="#e9f1fb" stroke="#6d8bb4" stroke-width="3"/><rect class="us-lit" x="${px - 6}" y="${py - 4}" width="12" height="8" rx="3"/>`; }
      const euro = (x, w, h, wall, roofc, seed) => { const r = rnd(seed); let o = `<rect x="${x}" y="${640 - h}" width="${w}" height="${h}" fill="${wall}"/><path fill="${roofc}" d="M${x - 8} ${640 - h}L${x + 16} ${640 - h - 44}H${x + w - 16}L${x + w + 8} ${640 - h}z"/>`;
        if (r() < 0.6) o += `<path fill="${roofc}" d="M${x + w / 2 - 22} ${640 - h - 44}Q${x + w / 2} ${640 - h - 100} ${x + w / 2 + 22} ${640 - h - 44}z"/>`;
        return o + win(x + 10, 640 - h + 14, w - 20, h - 40, 16, 26); };
      let reflect = '', rr = rnd(7);
      for (let i = 0; i < 20; i++) reflect += `<rect x="${R(260 + rr() * 1080)}" y="${R(700 + rr() * 170)}" width="${R(40 + rr() * 110)}" height="4" rx="2" fill="${['#ffcf7a', '#8fb6ff', '#ff9d8a'][i % 3]}" opacity=".6"/>`;
      return `<defs>${lin(s1, [[0, '#35418c'], [0.4, '#8a6fb5'], [0.7, '#f1946f'], [1, '#ffd08a']])}${lin(w1, [[0, '#8f78a8'], [1, '#232a5e']])}${radU(g1, [[0, '#ffdca0', 0.7], [1, '#ffdca0', 0]], 800, 600, 600)}</defs>`
        + full(`url(#${s1})`) + stars(12, 40, 260) + sun(1250, 560, 30, '#fff1c8', '#ffb070') + rays(1250, 560, 1000, '#ffd9a0', 0.08)
        + cloud(330, 180, 1.0, '#b575a5', 0.8, 60, 5, '#ffc7a8') + cloud(1300, 260, 0.9, '#c07aa5', 0.75, 70, 30, '#ffcdb0')
        + mv('uspar', { ad: '44s', dx: '8px' }, city(2, -160, 1760, 620, 40, 150, 30, 60, '#7c6aa6', 0.25))
        // distant TV tower
        + `<path d="M1450 620V300" stroke="#6a5a98" stroke-width="5"/><ellipse cx="1450" cy="360" rx="22" ry="10" fill="#6a5a98"/><path d="M1450 300V240" stroke="#6a5a98" stroke-width="2"/><rect class="us-lit" x="1445" y="352" width="10" height="3"/>`
        + mv('uspar', { ad: '36s', dx: '12px' }, euro(-60, 120, 160, '#c9a98c', '#5a4a6a', 4) + euro(80, 110, 200, '#d9b99a', '#4f3f64', 8) + euro(200, 100, 130, '#bfa38a', '#5a4a6a', 11) + euro(1180, 120, 180, '#d1b194', '#4f3f64', 14) + euro(1310, 110, 130, '#c3a58c', '#5a4a6a', 17) + euro(1430, 130, 200, '#d6b698', '#4f3f64', 20) + euro(1570, 120, 150, '#c9a98c', '#5a4a6a', 23))
        // the wheel
        + `<path d="M${cx - 150} 640L${cx} ${cy}L${cx + 150} 640M${cx - 60} 640L${cx} ${cy}L${cx + 60} 640" stroke="#dfe7f5" stroke-width="7" fill="none" stroke-linejoin="round"/>`
        + `<circle cx="${cx}" cy="${cy}" r="${Rr + 22}" fill="url(#${g1})"/>`
        + mv('usspin', { ad: '120s', to: `${cx}px ${cy}px` }, `<circle cx="${cx}" cy="${cy}" r="${Rr}" fill="none" stroke="#eaf1fb" stroke-width="8"/><circle cx="${cx}" cy="${cy}" r="${Rr - 38}" fill="none" stroke="#c7d6ec" stroke-width="3"/><path d="${spokes}" stroke="#dce6f5" stroke-width="2.4"/>${pods}`)
        + `<circle cx="${cx}" cy="${cy}" r="20" fill="#f5f8fd" stroke="#8da5c8" stroke-width="4"/>`
        // bridge deck
        + `<rect x="-160" y="630" width="1920" height="22" fill="#6c6f88"/><rect x="-160" y="652" width="1920" height="18" fill="#4a4d6a"/>` + dots('M-160 626H1760', '#ffe3a0', 6, 46, 'us-lamps')
        + `<path d="M-160 700Q100 668 360 700T880 700T1400 700T1920 700" fill="none" stroke="#4a4d6a" stroke-width="12"/>`
        + `<rect x="-160" y="670" width="1920" height="230" fill="url(#${w1})"/>` + reflect + shimmer(3, 24, 0, 1600, 700, 880, '#ffe0a8', 60)
        + mv('usmove', { ad: '30s', dx: '1900px' }, `<rect x="300" y="610" width="64" height="18" rx="6" fill="#d94f4f"/><rect x="316" y="598" width="30" height="14" rx="4" fill="#c63f3f"/>${lit(322, 602, 18, 7)}`)
        + mv('usmove', { ad: '40s', d: '-10s', dx: '1900px' }, `<rect x="900" y="612" width="80" height="16" rx="6" fill="#e7e1d1"/>${lit(912, 614, 16, 7)}${lit(940, 614, 16, 7)}`)
        + mv('usmove', { ad: '50s', dx: '900px' }, mv('usbob', { ad: '3s', dy: '3px' }, `<path fill="#3a2f45" d="M1000 790h200l-24 28H1024z"/><rect x="1060" y="768" width="80" height="22" fill="#e8d9bb"/>${lit(1070, 774, 14, 8)}${lit(1100, 774, 14, 8)}`))
        + birds(6, 5, 520, 220, '#3d3560', 1.2, 700) + puffs(1500, 300, 0, '#fff') + finish(0.36);
    } });

  /* ---------- Nanjing: the Ming city wall and plum blossom by Xuanwu Lake ---------- */
  asiaSceneAdd({ key: 'place:nanjing', label: 'Ming city wall and plum blossom', site: 'The Ming city wall', colour: 'pink', mood: 'calm', season: ['spring', 'winter'], tags: ['city wall', 'plum blossom', 'lake'],
    svg: () => {
      const s1 = U(), w1 = U(), wall = '#8c8579';
      let cren = '', bricks = '';
      for (let x = -160; x < 1760; x += 36) cren += `<rect x="${x}" y="470" width="22" height="20"/>`;
      for (let y = 506; y < 640; y += 20) bricks += `M-160 ${y}H1760`;
      let gate = '';
      gate += `<rect fill="#7d766a" x="560" y="500" width="480" height="150"/><path fill="#2b2a2e" d="M740 650V580Q800 520 860 580V650z"/><path fill="#6e675c" d="M560 490H1040V504H560z"/>`;
      gate += `<rect fill="#a7907a" x="600" y="410" width="400" height="80"/><path d="M640 490V412M700 490V412M760 490V412M820 490V412M880 490V412M940 490V412" stroke="#7a2f2a" stroke-width="7"/><path fill="#cdb590" d="M606 490H994V428H606z" opacity=".35"/>`;
      gate += roof(800, 340, 560, 82, '#4b4f5a', '#6c717e') + `<path fill="#3c3f49" d="M520 422H1080V430H520z"/>${lit(660, 440, 40, 36)}${lit(780, 440, 40, 36)}${lit(900, 440, 40, 36)}`;
      return `<defs>${lin(s1, [[0, '#9cc5e6'], [0.5, '#e6e1ef'], [1, '#fbd9cf']])}${lin(w1, [[0, '#dbb8c1'], [0.2, '#8fb0c4'], [1, '#4e7a92']])}</defs>`
        + full(`url(#${s1})`) + sun(360, 250, 36, '#fff8e3', '#ffe0c8') + stars(9, 16, 220)
        + cloud(900, 160, 1.0, '#e7d8e2', 0.85, 66, 3, '#fff') + cloud(1380, 270, 0.8, '#e9dbe3', 0.8, 58, 22)
        + mv('uspar', { ad: '50s', dx: '10px' }, ridge('#a99bc4', 400, 90, 7, 6) + ridge('#8f84ae', 440, 60, 8, 15))
        + haze(380, 110, '#f3e8f0', 0.6)
        + mv('uspar', { ad: '38s', dx: '8px' }, canopy('#5a7c5a', 478, 30, 4, -160, 1760, 520))
        + `<rect fill="${wall}" x="-160" y="490" width="1920" height="170"/><g fill="${wall}">${cren}</g><path d="${bricks}" stroke="#6d675c" stroke-width="2" opacity=".7"/>` + gate
        + `<rect x="-160" y="660" width="1920" height="240" fill="url(#${w1})"/>`
        + `<g opacity=".45" transform="translate(0 1320) scale(1 -1)"><rect fill="${wall}" x="-160" y="490" width="1920" height="170"/></g>`.replace('translate(0 1320) scale(1 -1)', 'translate(0 1310) scale(1 -1)')
        + `<rect x="-160" y="660" width="1920" height="240" fill="url(#${w1})" opacity=".55"/>`
        + shimmer(5, 28, 0, 1600, 680, 880, '#fff2f0', 70) + shimmer(8, 12, 0, 1600, 700, 880, '#6d98b2', 60)
        + mv('usmove', { ad: '46s', dx: '420px' }, mv('usbob', { ad: '3.6s', dy: '3px' }, `<path fill="#6b4a3a" d="M980 760Q1060 786 1140 760l-14 -16H994z"/><path fill="#c25a4a" d="M1010 744Q1060 706 1110 744z"/>`))
        + `<g class="x-ussway2" style="--ad:8s;transform-box:view-box;transform-origin:1600px 0px">${bough(3, 1760, 40, 1160, 250, '#3f3028', ['#f7bfd0', '#fbd5e0', '#ee9db8', '#ffffff'], 70, 14)}${bough(9, 1760, 150, 1380, 340, '#3f3028', ['#f7bfd0', '#fbd5e0', '#ee9db8'], 40, 12)}</g>`
        + `<g class="x-ussway2" style="--ad:9s;--d:-3s;transform-box:view-box;transform-origin:0px 0px">${bough(5, -160, 100, 360, 160, '#3f3028', ['#f7bfd0', '#fbd5e0', '#ee9db8', '#ffffff'], 50, 13)}</g>`
        + petals(3, 22, '#fbd5e0', 9, 16) + birds(4, 3, 700, 250, '#59506a', 1.1, 600) + finish(0.3);
    } });

  /* ---------- Tokyo: Tokyo Tower and the Skytree over the city at dusk ---------- */
  asiaSceneAdd({ key: 'place:tokyo', label: 'Tokyo Tower and Skytree at dusk', site: 'Tokyo Tower', colour: 'red', mood: 'energetic', season: 'any', tags: ['tower', 'skyline', 'dusk'],
    svg: () => {
      const s1 = U(), g1 = U(), sk = U(), tx = 560;
      const tower = lattice(tx, 760, 320, 150, 18, ['#ee5a2e', '#f7f2ea'], 8, '#a63a1c')
        + `<path fill="#ee5a2e" d="M${tx - 8} 320L${tx - 5} 170H${tx + 5}L${tx + 8} 320z"/><path d="M${tx} 170V110" stroke="#e24a28" stroke-width="3"/>`
        + `<rect fill="#d9d4cc" x="${tx - 96}" y="560" width="192" height="26" rx="4"/><rect fill="#f1ede4" x="${tx - 96}" y="560" width="192" height="8"/><rect fill="#d9d4cc" x="${tx - 50}" y="418" width="100" height="18" rx="3"/>`
        + `<rect class="us-lit" x="${tx - 90}" y="572" width="180" height="8" rx="3"/><rect class="us-lit" x="${tx - 44}" y="424" width="88" height="6" rx="2"/>`
        + `<path d="M${tx - 150} 760V740H${tx + 150}V760" fill="none" stroke="#a63a1c" stroke-width="6"/>`;
      let skyl = '';
      const sx = 1220;
      skyl += `<path fill="url(#${sk})" d="M${sx - 70} 770L${sx - 18} 330L${sx - 6} 160H${sx + 6}L${sx + 18} 330L${sx + 70} 770z"/><path stroke="#6e86a8" stroke-width="2" fill="none" opacity=".7" d="M${sx - 66} 770L${sx + 14} 330M${sx + 66} 770L${sx - 14} 330M${sx - 40} 620H${sx + 40}M${sx - 28} 480H${sx + 28}"/>`;
      skyl += `<ellipse cx="${sx}" cy="330" rx="46" ry="12" fill="#c8d6ea"/><ellipse cx="${sx}" cy="296" rx="32" ry="10" fill="#dce6f4"/><path d="M${sx} 160V80" stroke="#aab9d0" stroke-width="4"/>`;
      skyl += `<rect class="us-lit" x="${sx - 40}" y="326" width="80" height="5" rx="2"/><rect class="us-lit" x="${sx - 28}" y="293" width="56" height="4" rx="2"/>`;
      let flick = `<circle class="x-usflicker" style="--ad:1.4s;transform-box:fill-box;transform-origin:center" cx="${tx}" cy="108" r="6" fill="#ff5a4a"/><circle class="x-usflicker" style="--ad:1.7s;transform-box:fill-box;transform-origin:center" cx="${sx}" cy="78" r="6" fill="#ff5a4a"/>`;
      return `<defs>${lin(s1, [[0, '#4a4f9c'], [0.35, '#9f7fb8'], [0.65, '#f49a78'], [1, '#ffd49a']])}${lin(sk, [[0, '#dfe8f5'], [1, '#8fa6c6']])}${lin(g1, [[0, '#4a4668'], [1, '#2a2745']])}</defs>`
        + full(`url(#${s1})`) + stars(14, 36, 280) + rays(300, 600, 1100, '#ffd9a0', 0.1) + sun(300, 640, 44, '#fff0c4', '#ffae6e')
        + cloud(900, 200, 1.1, '#b87aa6', 0.85, 66, 5, '#ffc2a6') + cloud(300, 330, 0.8, '#c585a6', 0.8, 54, 20, '#ffcdb0')
        + mv('uspar', { ad: '44s', dx: '8px' }, city(3, -160, 1760, 700, 70, 240, 24, 56, '#8e75ad', 0.1))
        + haze(560, 120, '#ffc9a0', 0.4)
        + skyl + tower + flick
        + mv('uspar', { ad: '34s', dx: '14px' }, city(8, -160, 1760, 820, 60, 200, 36, 80, '#5b4f82', 0.25))
        // elevated railway with a train
        + `<rect x="-160" y="790" width="1920" height="16" fill="#3a3558"/><path d="M0 806V900M240 806V900M480 806V900M720 806V900M960 806V900M1200 806V900M1440 806V900M1680 806V900" stroke="#3a3558" stroke-width="12"/>`
        + `<rect x="-160" y="806" width="1920" height="94" fill="url(#${g1})"/>` + dots('M-160 782H1760', '#ffd9a0', 5, 38, 'us-lamps')
        + mv('usmove', { ad: '18s', dx: '2300px' }, `<g><rect x="400" y="752" width="360" height="38" rx="9" fill="#e7e9ee"/><rect x="400" y="772" width="360" height="7" fill="#2ba37c"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => lit(414 + i * 44, 758, 30, 12)).join('')}</g>`)
        // cherry blossom bough
        + `<g class="x-ussway2" style="--ad:8s;transform-box:view-box;transform-origin:1760px 0px">${bough(6, 1760, 60, 1220, 190, '#3a2a2c', ['#ffc4d6', '#ffdbe6', '#f59fbb'], 60, 15)}</g>`
        + `<g class="x-ussway2" style="--ad:9s;--d:-2s;transform-box:view-box;transform-origin:-160px 0px">${bough(2, -160, 40, 260, 120, '#3a2a2c', ['#ffc4d6', '#ffdbe6', '#f59fbb'], 40, 14)}</g>`
        + petals(7, 18, '#ffd0dd', 9, 16) + birds(9, 4, 820, 260, '#3d3560', 1.1, 600) + finish(0.36);
    } });

  /* ---------- Osaka: the castle keep in cherry blossom ---------- */
  asiaSceneAdd({ key: 'place:osaka', label: 'Osaka Castle in cherry blossom', site: 'Osaka Castle', colour: 'pink', mood: 'proud', season: ['spring'], tags: ['castle', 'cherry blossom', 'moat'],
    svg: () => {
      const s1 = U(), w1 = U(), cx = 800;
      let keep = '', y = 540;
      // stone base
      let stone = `<path fill="#8d8b86" d="M420 700L520 540H1080L1180 700z"/>`, joints = '';
      for (let i = 1; i < 6; i++) { const yy = 540 + i * 27; joints += `M${R(520 - (yy - 540) * 0.62)} ${yy}H${R(1080 + (yy - 540) * 0.62)}`; }
      stone += `<path d="${joints}" stroke="#6f6d68" stroke-width="2" opacity=".7"/>` + `<path fill="#a9a7a0" d="M520 540H1080V552H520z"/>`;
      const T = [[330, 70], [270, 62], [220, 56], [176, 52]];
      T.forEach(([w, h], i) => {
        keep += `<rect fill="#f1ede2" x="${cx - w / 2 + 14}" y="${y - h}" width="${w - 28}" height="${h}"/>`;
        for (let k = 0; k < 5; k++) { const wx = cx - w / 2 + 40 + k * ((w - 90) / 4); keep += `<rect fill="#3a3b44" x="${R(wx)}" y="${y - h + 22}" width="16" height="22" rx="2"/>`; }
        keep += `<path fill="#4f8a74" d="M${cx - w / 2 - 20} ${y - h + 22}Q${cx} ${y - h - 18} ${cx + w / 2 + 20} ${y - h + 22}L${cx + w / 2 + 6} ${y - h + 34}H${cx - w / 2 - 6}z"/><path fill="#d9c27a" d="M${cx - w / 2 - 6} ${y - h + 34}H${cx + w / 2 + 6}V${y - h + 38}H${cx - w / 2 - 6}z"/>`;
        y -= h;
      });
      // top storey, dark with gold
      keep += `<rect fill="#2f3036" x="${cx - 70}" y="${y - 56}" width="140" height="56"/><path fill="#d9b24a" d="M${cx - 70} ${y - 40}H${cx + 70}V${y - 34}H${cx - 70}z"/>`
        + `<path fill="#4f8a74" d="M${cx - 112} ${y - 40}Q${cx} ${y - 120} ${cx + 112} ${y - 40}L${cx + 100} ${y - 28}H${cx - 100}z"/><path fill="#d9b24a" d="M${cx - 108} ${y - 44}Q${cx - 128} ${y - 70} ${cx - 104} ${y - 80}M${cx + 108} ${y - 44}Q${cx + 128} ${y - 70} ${cx + 104} ${y - 80}" stroke="#d9b24a" stroke-width="6" fill="none"/>`;
      let refl = '';
      return `<defs>${lin(s1, [[0, '#6aaee0'], [0.5, '#b9dcf0'], [1, '#fdeee6']])}${lin(w1, [[0, '#9dbfc6'], [1, '#456f7e']])}</defs>`
        + full(`url(#${s1})`) + sun(1260, 200, 36, '#fffbe8', '#ffeec0') + stars(4, 14, 200)
        + cloud(380, 170, 1.0, '#d6e6f2', 0.9, 64, 6) + cloud(1180, 300, 0.8, '#dfeaf4', 0.85, 54, 24) + streak(700, 110, 260, '#fff', 0.5, 80)
        + mv('uspar', { ad: '44s', dx: '8px' }, city(6, -160, 1760, 560, 30, 110, 30, 66, '#aab8cc', 0.1))
        + mv('uspar', { ad: '36s', dx: '12px' }, canopy('#6c9a6a', 580, 34, 5, -160, 1760, 700))
        + stone + `<g>${keep}</g>`
        + `<path fill="#8d8b86" d="M-160 640H420L520 640V700H-160z"/><path fill="#8d8b86" d="M1180 640H1760V700H1180z"/><path fill="#a9a7a0" d="M-160 632H500V642H-160zM1100 632H1760V642H1100z"/>`
        + `<path fill="#e8e4d8" d="M-160 600H420V632H-160z"/><path fill="#e8e4d8" d="M1180 600H1760V632H1180z"/><path fill="#4f8a74" d="M-160 590H430L400 604H-160z"/><path fill="#4f8a74" d="M1170 590H1760V604H1200z"/>`
        + `<rect x="-160" y="700" width="1920" height="200" fill="url(#${w1})"/>`
        + `<g opacity=".35" transform="translate(0 1400) scale(1 -1)"><path fill="#8d8b86" d="M420 700L520 540H1080L1180 700z"/></g>`
        + `<rect x="-160" y="700" width="1920" height="200" fill="url(#${w1})" opacity=".6"/>`
        + shimmer(4, 30, 0, 1600, 720, 890, '#ffeef2', 70) + shimmer(11, 12, 0, 1600, 740, 890, '#7fa9b4', 70)
        + mv('usmove', { ad: '50s', dx: '520px' }, mv('usbob', { ad: '3.4s', dy: '3px' }, `<path fill="#d9d1c0" d="M300 800Q380 830 460 800l-12 -16H312z"/><path fill="#9c4b3e" d="M330 784Q380 752 430 784z"/>`))
        + `<g class="x-ussway2" style="--ad:8s;transform-box:view-box;transform-origin:1760px 0px">${bough(2, 1760, 30, 1000, 200, '#3d2c2e', ['#ffc9da', '#ffe0ea', '#f7a6c0', '#fff'], 90, 17)}${bough(7, 1760, 160, 1260, 330, '#3d2c2e', ['#ffc9da', '#ffe0ea', '#f7a6c0'], 50, 14)}</g>`
        + `<g class="x-ussway2" style="--ad:9s;--d:-3s;transform-box:view-box;transform-origin:-160px 0px">${bough(5, -160, 60, 520, 150, '#3d2c2e', ['#ffc9da', '#ffe0ea', '#f7a6c0', '#fff'], 80, 16)}</g>`
        + petals(6, 26, '#ffd0de', 9, 16) + birds(8, 4, 900, 330, '#48506a', 1.1, 600) + finish(0.3) + refl;
    } });

  /* ---------- Sapporo: the TV tower in Odori Park, snow at dusk ---------- */
  asiaSceneAdd({ key: 'place:sapporo', label: 'Odori Park in the snow', site: 'Odori Park', colour: 'teal', mood: 'cosy', season: ['winter'], tags: ['snow', 'tower', 'park', 'winter'],
    svg: () => {
      const s1 = U(), g1 = U(), tx = 800;
      const pine = (x, y, s) => { let o = `<path fill="#e9f0f8" d="M${x} ${R(y - 190 * s)}L${R(x - 56 * s)} ${R(y - 90 * s)}H${R(x - 26 * s)}L${R(x - 76 * s)} ${R(y - 20 * s)}H${R(x - 30 * s)}L${R(x - 90 * s)} ${y}H${R(x + 90 * s)}L${R(x + 30 * s)} ${R(y - 20 * s)}H${R(x + 76 * s)}L${R(x + 26 * s)} ${R(y - 90 * s)}H${R(x + 56 * s)}z"/>`; return o + `<path fill="#3d6a64" d="M${x} ${R(y - 150 * s)}L${R(x - 36 * s)} ${R(y - 80 * s)}L${R(x - 56 * s)} ${R(y - 14 * s)}H${R(x + 56 * s)}L${R(x + 36 * s)} ${R(y - 80 * s)}z" opacity=".55"/>`; };
      const tower = `<path fill="#c9d4e2" d="M${tx - 78} 700L${tx - 14} 330H${tx + 14}L${tx + 78} 700z"/>` + lattice(tx, 700, 330, 78, 14, ['#dfe7f1', '#aebccf'], 8, '#7d8da6')
        + `<rect fill="#aebccf" x="${tx - 42}" y="288" width="84" height="48" rx="6"/><rect fill="#e9eef6" x="${tx - 42}" y="288" width="84" height="8"/>${lit(tx - 34, 304, 18, 18)}${lit(tx - 9, 304, 18, 18)}${lit(tx + 16, 304, 18, 18)}`
        + `<path d="M${tx} 288V226" stroke="#aebccf" stroke-width="5"/><circle class="x-usflicker" style="--ad:1.3s;transform-box:fill-box;transform-origin:center" cx="${tx}" cy="224" r="5" fill="#ff5a4a"/>`;
      let snow = '', r = rnd(3);
      for (let i = 0; i < 54; i++) snow += `<circle class="x-usfall" style="--ad:${R(8 + r() * 9)}s;--d:-${R(r() * 16)}s;--dx:${R(-90 + r() * 140)}px" cx="${R(-40 + r() * 1700)}" cy="${R(r() * 260)}" r="${(1.6 + r() * 3).toFixed(1)}" fill="#fff"/>`;
      const lamp = (x) => `<path d="M${x} 790V690" stroke="#34455a" stroke-width="5"/><circle class="us-lit" cx="${x}" cy="684" r="11"/><circle cx="${x}" cy="684" r="9" fill="#fff3c8"/>`;
      const dome = (x, y, s) => `<path fill="#f4f8fc" d="M${x - 80 * s} ${y}Q${x} ${R(y - 150 * s)} ${x + 80 * s} ${y}z"/><path fill="#c3d6ea" d="M${x - 16 * s} ${y}Q${x} ${R(y - 50 * s)} ${x + 16 * s} ${y}z"/><path fill="#ffd9a0" d="M${x - 10 * s} ${y}Q${x} ${R(y - 36 * s)} ${x + 10 * s} ${y}z" class="us-lit"/>`;
      return `<defs>${lin(s1, [[0, '#2f4a7a'], [0.4, '#6d8fb8'], [0.75, '#b7c6dc'], [1, '#f1dcd0']])}${lin(g1, [[0, '#f4f8fc'], [1, '#bfd0e4']])}</defs>`
        + full(`url(#${s1})`) + stars(3, 40, 260) + sun(1250, 330, 28, '#fff6dc', '#f9d9b8')
        + cloud(400, 190, 1.0, '#aab8d2', 0.8, 70, 4, '#dfe7f2') + cloud(1280, 150, 0.8, '#b2bfd6', 0.8, 60, 22, '#e3e9f3')
        + mv('uspar', { ad: '50s', dx: '10px' }, ridge('#d5e0ee', 520, 100, 6, 2) + ridge('#b5c6dc', 560, 60, 8, 12))
        + mv('uspar', { ad: '40s', dx: '10px' }, city(5, -160, 1760, 640, 40, 150, 34, 64, '#7d8fae', 0.35))
        + haze(560, 100, '#e8ecf6', 0.5)
        + tower
        + `<rect x="-160" y="690" width="1920" height="210" fill="url(#${g1})"/>`
        + `<path fill="#e9f1fa" d="M-160 720Q300 690 800 720T1760 710V740H-160z"/>`
        + dots('M-160 668Q400 640 800 688T1760 670', '#ffd9a0', 6, 40, 'us-lamps')
        + mv('uspar', { ad: '38s', dx: '10px' }, pine(180, 790, 1.2) + pine(330, 770, 0.9) + pine(1290, 775, 0.95) + pine(1450, 800, 1.3))
        + dome(560, 800, 1.1) + dome(1070, 806, 1.0)
        + lamp(420) + lamp(1180) + lamp(700) + lamp(930)
        + mv('usmove', { ad: '40s', dx: '1800px' }, `<rect x="300" y="720" width="70" height="20" rx="6" fill="#d9574f"/>${lit(310, 723, 16, 8)}${lit(332, 723, 16, 8)}`)
        + `<g fill="#fff" opacity=".8">${snow}</g>` + puffs(1170, 780, 4, '#fff', 14, 20, 4, -90, 2)
        + birds(5, 3, 500, 260, '#3b4a63', 1, 500) + finish(0.34);
    } });

  /* ---------- Fukuoka: yatai food stalls along the Naka river at dusk ---------- */
  asiaSceneAdd({ key: 'place:fukuoka', label: 'Yatai stalls by the Naka river', site: 'Nakasu yatai', colour: 'orange', mood: 'cosy', season: 'any', tags: ['street food', 'lanterns', 'river', 'night'],
    svg: () => {
      const s1 = U(), w1 = U();
      const stall = (x, y, s, wcol, seed) => { const r = rnd(seed); let o = `<rect fill="#6b4a32" x="${x}" y="${y}" width="${R(180 * s)}" height="${R(86 * s)}"/><rect fill="#f5e3c0" x="${x + 8}" y="${R(y - 50 * s)}" width="${R(164 * s)}" height="${R(50 * s)}"/>${lit(x + 18, R(y - 38 * s), R(144 * s), R(30 * s))}`
        + `<path fill="${wcol}" d="M${x - 12} ${R(y - 50 * s)}H${R(x + 192 * s)}L${R(x + 176 * s)} ${R(y - 78 * s)}H${x + 4}z"/><path fill="#3d2a1e" d="M${x - 12} ${R(y - 52 * s)}H${R(x + 192 * s)}V${R(y - 46 * s)}H${x - 12}z"/>`;
        for (let i = 0; i < 5; i++) o += `<rect fill="${i % 2 ? '#f6efe0' : '#2a3a6a'}" x="${R(x + 10 + i * 32 * s)}" y="${R(y - 46 * s)}" width="${R(26 * s)}" height="${R(30 * s)}" rx="2"/>`;
        o += `<rect fill="#a78155" x="${x + 6}" y="${R(y + 4)}" width="${R(168 * s)}" height="8" rx="3"/>`;
        for (let i = 0; i < 4; i++) o += `<path d="M${R(x + 24 + i * 44 * s)} ${R(y + 12)}V${R(y + 86 * s)}" stroke="#4a3626" stroke-width="5"/><ellipse cx="${R(x + 24 + i * 44 * s)}" cy="${R(y + 16)}" rx="13" ry="5" fill="#d9a46a"/>`;
        o += `<circle class="us-lit" cx="${x + 10}" cy="${R(y - 90 * s)}" r="14"/><circle fill="#ee5a3a" cx="${x + 10}" cy="${R(y - 90 * s)}" r="12"/><circle class="us-lit" cx="${R(x + 170 * s)}" cy="${R(y - 90 * s)}" r="14"/><circle fill="#ee5a3a" cx="${R(x + 170 * s)}" cy="${R(y - 90 * s)}" r="12"/>`;
        return o + `<g opacity=".5">` + puffs(R(x + 90 * s), R(y - 30 * s), 3, '#fff', 16, 14, 3.4, -150, 2.4) + '</g>'; };
      const tw = (x) => `<path fill="url(#${w1}x)" d=""/>`;
      let reflect = '', rr = rnd(21);
      for (let i = 0; i < 26; i++) reflect += `<rect class="x-usshim" style="--ad:${(2 + rr() * 2).toFixed(1)}s;--d:-${(rr() * 3).toFixed(1)}s" x="${R(100 + rr() * 1400)}" y="${R(660 + rr() * 220)}" width="${R(30 + rr() * 90)}" height="5" rx="2" fill="${['#ffb35a', '#ff7a4a', '#ffd48a'][i % 3]}"/>`;
      const sk = U();
      return `<defs>${lin(s1, [[0, '#2f2c6a'], [0.4, '#7c5a9a'], [0.7, '#e08a6e'], [1, '#ffc88a']])}${lin(w1, [[0, '#a6677a'], [0.25, '#4d3e6e'], [1, '#1e1d44']])}${lin(sk, [[0, '#c4d4ee'], [1, '#6f84b2']])}</defs>`
        + full(`url(#${s1})`) + stars(7, 34, 300) + `<circle cx="300" cy="190" r="34" fill="#fff2d0"/><circle cx="314" cy="182" r="30" fill="#7c5a9a" opacity=".0"/>`
        + cloud(700, 200, 1.0, '#a46a9a', 0.8, 66, 6, '#ffb494') + cloud(1300, 330, 0.8, '#b8729f', 0.8, 58, 26, '#ffbf9a')
        + mv('uspar', { ad: '44s', dx: '8px' }, city(2, -160, 1760, 620, 60, 200, 30, 66, '#76609e', 0.3))
        // Fukuoka Tower (glass)
        + `<path fill="url(#${sk})" d="M1230 620L1262 250L1294 620z"/><path d="M1262 250V190" stroke="#aebbd6" stroke-width="3"/><path d="M1246 520L1262 260L1278 520" stroke="#e5edf9" stroke-width="2" fill="none" opacity=".7"/>${lit(1254, 270, 16, 5)}<circle class="x-usflicker" style="--ad:1.5s;transform-box:fill-box;transform-origin:center" cx="1262" cy="188" r="4" fill="#ff5a4a"/>`
        + mv('uspar', { ad: '36s', dx: '12px' }, city(9, -160, 1760, 650, 90, 260, 40, 84, '#5c4c86', 0.35))
        + `<rect x="-160" y="640" width="1920" height="260" fill="url(#${w1})"/>`
        + `<rect x="-160" y="640" width="1920" height="22" fill="#3a2f55"/><path d="M-160 662H1760" stroke="#2a2245" stroke-width="6"/>`
        + dots('M-160 628Q300 612 800 628T1760 624', '#ffd08a', 7, 34, 'us-lamps')
        + reflect + shimmer(5, 16, 0, 1600, 700, 890, '#ffe0a8', 70)
        // the bridge
        + `<path fill="#3a3358" d="M-160 560H1760V584H-160z"/><path d="M0 584V640M300 584V640M600 584V640M900 584V640M1200 584V640M1500 584V640" stroke="#3a3358" stroke-width="10"/>${dots('M-160 556H1760', '#ffe3a0', 5, 44, 'us-lamps')}`
        + mv('usmove', { ad: '26s', dx: '2000px' }, `<rect x="200" y="534" width="58" height="18" rx="6" fill="#e6e0d0"/>${lit(210, 538, 14, 7)}${lit(230, 538, 14, 7)}`)
        + `<rect x="-160" y="728" width="1920" height="172" fill="#33294e"/><rect x="-160" y="722" width="1920" height="10" fill="#5a4a78"/><path d="M-160 760H1760M-160 800H1760M-160 850H1760" stroke="#463a66" stroke-width="2"/>`
        + stall(170, 740, 1.4, '#c93c3c', 3) + stall(520, 750, 1.2, '#2f5f8f', 5) + stall(1010, 745, 1.3, '#c93c3c', 8) + stall(1330, 755, 1.15, '#d98a2c', 12)
        + birds(5, 3, 900, 240, '#3a2f55', 1.1, 600) + finish(0.34);
    } });

  /* ---------- Seoul: a palace hall below Bugaksan in autumn ---------- */
  asiaSceneAdd({ key: 'place:seoul', label: 'Palace hall below Bugaksan', site: 'Gyeongbokgung Palace', colour: 'red', mood: 'proud', season: ['autumn'], tags: ['palace', 'mountain', 'autumn', 'hanok'],
    svg: () => {
      const s1 = U(), g1 = U(), cx = 800;
      let cols = '', dan = '';
      for (let i = 0; i < 9; i++) cols += `<rect fill="#b3302a" x="${R(cx - 280 + i * 70 - 6)}" y="470" width="12" height="130"/>`;
      for (let i = 0; i < 8; i++) { const x = cx - 280 + i * 70 + 8; cols += `<rect fill="#d9b66a" x="${x}" y="500" width="54" height="100"/><path d="M${x} 530H${x + 54}M${x + 27} 500V600M${x} 560H${x + 54}" stroke="#8a5a2a" stroke-width="2.4"/>`; }
      for (let i = 0; i < 38; i++) dan += `<rect fill="${['#2f7f6a', '#2a5da3', '#c8352c', '#e9d9a8'][i % 4]}" x="${R(cx - 300 + i * 16)}" y="456" width="12" height="14"/>`;
      let upper = '';
      for (let i = 0; i < 6; i++) upper += `<rect fill="#b3302a" x="${R(cx - 190 + i * 76 - 5)}" y="372" width="10" height="64"/>`;
      upper += `<rect fill="#cfae60" x="${cx - 190}" y="384" width="380" height="52"/>`;
      let balus = '';
      for (let x = 340; x <= 1260; x += 30) balus += `M${x} 654V632`;
      let maples = '';
      const maple = (x, y, s, seed) => { const r = rnd(seed); let o = `<path fill="#4a3226" d="M${x - 8 * s} ${y}l${4 * s} ${-120 * s}h${8 * s}l${4 * s} ${120 * s}z"/>`; for (let i = 0; i < 14; i++) o += `<circle cx="${R(x + (r() - 0.5) * 190 * s)}" cy="${R(y - 150 * s - r() * 90 * s)}" r="${R((40 + r() * 34) * s)}" fill="${['#d9461e', '#ee7a1c', '#c7321c', '#f2a02a'][i % 4]}"/>`; return o; };
      let lan = '';
      [[420, 0], [520, 1], [1080, 2], [1180, 3]].forEach(([x, i]) => { lan += `<path d="M${x} 396V430" stroke="#3a2a22" stroke-width="2"/>` + mv('ussway', { ad: (4 + i * 0.7) + 's', to: `${x}px 396px` }, `<ellipse cx="${x}" cy="448" rx="14" ry="20" fill="#d9302a"/><ellipse class="us-lit" cx="${x}" cy="448" rx="14" ry="20"/><path d="M${x - 8} 428H${x + 8}M${x - 8} 468H${x + 8}" stroke="#f0c46a" stroke-width="3"/>`); });
      return `<defs>${lin(s1, [[0, '#4f95cf'], [0.55, '#a9d1ea'], [1, '#fbe9d0']])}${lin(g1, [[0, '#c9bba0'], [1, '#8a7c63']])}</defs>`
        + full(`url(#${s1})`) + sun(1300, 190, 34, '#fff7d8', '#ffe6a8') + stars(5, 18, 200)
        + cloud(380, 170, 1.0, '#d3e3f0', 0.88, 66, 6) + cloud(1240, 300, 0.8, '#dce8f2', 0.82, 52, 24) + streak(800, 100, 240, '#fff', 0.45, 80)
        // Bugaksan granite
        + mv('uspar', { ad: '52s', dx: '8px' }, `<path fill="#9ba5ad" d="M380 480L560 300L640 330L760 220L900 290L1040 240L1240 480z"/><path fill="#bcc3c8" d="M760 220L900 290L860 480L720 480L700 300z" opacity=".6"/><path fill="#7a8a78" d="M300 480Q540 340 800 380Q1050 340 1300 480z" opacity=".55"/>`)
        + mv('uspar', { ad: '44s', dx: '12px' }, ridge('#8a8f6e', 480, 50, 7, 3) + canopy('#6f7e48', 484, 26, 9, -160, 1760, 560))
        + city(4, -160, 280, 560, 40, 160, 30, 50, '#9db0c6', 0.0) + city(5, 1280, 1760, 560, 40, 150, 30, 50, '#9db0c6', 0.0)
        // the hall
        + `<path fill="#a08e75" d="M240 610H1360V654H240z"/><path fill="#c3b194" d="M290 580H1310V612H290z"/><path fill="#b6a68a" d="M340 556H1260V584H340z"/>`
        + `<rect fill="#d9d1bd" x="720" y="598" width="160" height="56" opacity=".0"/>`
        + `<path d="M300 612H1300M240 654H1360" stroke="#8a7a62" stroke-width="3"/>` + `<g stroke="#8a7a62" stroke-width="3" fill="none">${'<path d="' + balus + '"/>'}</g>`
        + `<g>${cols}${dan}</g>` + roof(cx, 440, 700, 84, '#3a3f4a', '#5b6270') + `<rect fill="#f0ead8" x="${cx - 350}" y="470" width="700" height="6" opacity="0"/>`
        + `<g>${upper}</g>` + roof(cx, 300, 480, 96, '#3a3f4a', '#5b6270') + `<path fill="#2c2f38" d="M${cx - 30} 300h60v10h-60z"/>`
        + `<path fill="#b9a98d" d="M740 654H860V720H740z"/><path d="M740 680H860M740 700H860" stroke="#8a7a62" stroke-width="2"/>`
        + lan
        + `<rect x="-160" y="720" width="1920" height="180" fill="url(#${g1})"/>` + `<path d="M-160 740H1760M-160 770H1760M-160 810H1760" stroke="#7a6c54" stroke-width="2" opacity=".6"/>`
        + mv('uspar', { ad: '38s', dx: '14px' }, maple(150, 790, 1.4, 4) + maple(1450, 800, 1.5, 9) + maple(320, 700, 0.8, 14) + maple(1290, 700, 0.8, 18))
        + (() => { let l = '', r = rnd(11); for (let i = 0; i < 28; i++) l += `<path class="x-usfall" style="--ad:${R(9 + r() * 8)}s;--d:-${R(r() * 14)}s;--dx:${R(-120 + r() * 220)}px" fill="${['#d9461e', '#f2a02a', '#c7321c'][i % 3]}" d="M${R(r() * 1600)} ${R(r() * 240)}l7 -4l7 4l-7 9z"/>`; return l; })()
        + birds(7, 5, 1000, 240, '#48506a', 1.2, 700) + haze(500, 90, '#fff0d4', 0.35) + finish(0.3);
    } });

  /* ---------- Busan: the hillside village of colourful houses above the harbour ---------- */
  asiaSceneAdd({ key: 'place:busan', label: 'Colourful hillside village above the harbour', site: 'Gamcheon hillside village', colour: 'teal', mood: 'cheerful', season: 'any', tags: ['hillside', 'harbour', 'bridge', 'colourful'],
    svg: () => {
      const s1 = U(), w1 = U();
      let hs = '', stairs = '';
      const shd = U();
      const pal = ['#f4a6a0', '#f7d36a', '#8fc7e6', '#9fd6a4', '#f5b87a', '#c9a6e0', '#f2e6cf', '#7fbfb6', '#ee8a7a'];
      const r = rnd(19);
      for (let k = 0; k < 6; k++) {
        const base = 470 + k * 78, h = 50 + k * 16, bw = 96 + k * 24;
        let x = -160 - r() * 40;
        while (x < 1760) {
          const w = bw * (0.8 + r() * 0.5), col = pal[Math.floor(r() * 9)], hh = h * (0.8 + r() * 0.5);
          hs += `<rect fill="${col}" x="${R(x)}" y="${R(base - hh)}" width="${R(w)}" height="${R(hh + 8)}"/>`
            + `<rect fill="${['#4a6fa0', '#c75a4a', '#4f8f7a', '#7a5a9a'][Math.floor(r() * 4)]}" x="${R(x - 3)}" y="${R(base - hh - 8)}" width="${R(w + 6)}" height="9"/>`
            + lit(R(x + w * 0.2), R(base - hh * 0.65), R(w * 0.22), R(hh * 0.3)) + lit(R(x + w * 0.6), R(base - hh * 0.65), R(w * 0.2), R(hh * 0.3));
          x += w + 4 + r() * 10;
        }
        hs += `<rect x="-160" y="${base - 6}" width="1920" height="34" fill="url(#${shd})"/>`;
      }
      let sails = '';
      const ship = (x, y, s, col) => mv('usmove', { ad: R(70 + s * 10) + 's', dx: '260px' }, mv('usbob', { ad: '4s', dy: '2px' }, `<path fill="${col}" d="M${x} ${y}h${R(120 * s)}l${R(-14 * s)} ${R(16 * s)}H${R(x + 16 * s)}z"/><rect fill="#f2f0ea" x="${R(x + 30 * s)}" y="${R(y - 20 * s)}" width="${R(44 * s)}" height="${R(20 * s)}"/>`));
      // suspension bridge
      let br = `<rect fill="#d9dde6" x="-160" y="366" width="1920" height="8"/>`;
      for (const px of [430, 1130]) br += `<path fill="#e9edf4" d="M${px - 8} 372V250H${px + 8}V372z"/><path fill="#e9edf4" d="M${px - 14} 290H${px + 14}V296H${px - 14}z"/>`;
      br += `<path fill="none" stroke="#e4e8f0" stroke-width="3" d="M-160 366Q130 250 430 252Q780 340 1130 252Q1450 250 1760 366"/>`;
      let h = ''; for (let i = 0; i < 40; i++) { const x = -100 + i * 46; h += `M${x} 366V${R(300 + Math.abs(((x - 430) % 700) - 350) * 0.1)}`; }
      br += `<path d="${h}" stroke="#cfd5e0" stroke-width="1.6" opacity=".6"/>` + dots('M-160 362H1760', '#ffe3a0', 4, 36, 'us-lamps');
      return `<defs>${lin(shd, [[0, '#2a3a5a', 0], [1, '#2a3a5a', 0.35]])}${lin(s1, [[0, '#6bb4e4'], [0.55, '#c3e3f2'], [1, '#fdeed8']])}${lin(w1, [[0, '#9fd0e0'], [1, '#4f8fb0']])}</defs>`
        + full(`url(#${s1})`) + sun(1280, 170, 34, '#fffbe6', '#ffeab8') + stars(4, 14, 180)
        + cloud(420, 150, 1.0, '#f2d6d6', 0.9, 64, 4, '#fff') + cloud(1000, 250, 0.8, '#e6e3ec', 0.85, 58, 22) + streak(1300, 300, 240, '#fff', 0.5, 80)
        + mv('uspar', { ad: '52s', dx: '8px' }, ridge('#9db8cc', 330, 50, 7, 8) + ridge('#7fa3b4', 350, 30, 9, 12))
        + `<rect x="-160" y="350" width="1920" height="120" fill="url(#${w1})"/>` + shimmer(6, 14, 0, 1600, 372, 460, '#fff', 50)
        + br + ship(540, 420, 1.1, '#3a4f6a') + ship(1160, 408, 0.8, '#a84a3a') + ship(900, 440, 1.4, '#45606f')
        + `<path d="M1100 372V334M1118 372V320M1136 372V334" stroke="#e6a43a" stroke-width="5"/>`
        + mv('uspar', { ad: '40s', dx: '10px' }, hs)
        + `<path fill="#6a8f5a" d="M-160 900V850Q200 820 500 860T1000 850Q1400 820 1760 860V900z"/>`
        + dots('M-160 600Q300 580 800 610T1760 590', '#ffd48a', 5, 34, 'us-lamps')
        + birds(5, 6, 700, 260, '#4a5a7a', 1.3, 700) + birds(14, 3, 1100, 330, '#4a5a7a', 1, 500) + finish(0.28);
    } });

  /* ---------- Pyongyang: the Taedong river, a pavilion and willows at dawn (landscape and architecture only) ---------- */
  asiaSceneAdd({ key: 'place:pyongyang', label: 'Taedong river at dawn', site: 'The Taedong river', colour: 'violet', mood: 'calm', season: ['autumn'], tags: ['river', 'pavilion', 'willow', 'dawn'],
    svg: () => {
      const s1 = U(), w1 = U();
      const tower = (x, w, h, col, seed) => { let o = `<rect fill="${col}" x="${x}" y="${640 - h}" width="${w}" height="${h}"/>` + win(x + 8, 640 - h + 14, w - 16, h - 30, 14, 22); return o; };
      const willow = (x, y, s, seed) => { const r = rnd(seed); let st = ''; for (let i = 0; i < 22; i++) { const sx = R(x - 120 * s + r() * 210 * s); st += `M${R(x - 14 * s)} ${R(y - 220 * s)}Q${sx} ${R(y - 220 * s + 20)} ${R(sx + (r() - 0.5) * 24)} ${R(y - 30 * s - r() * 90 * s)}`; }
        return `<path fill="#4a3a2a" d="M${x - 10 * s} ${y}Q${x} ${R(y - 140 * s)} ${x - 22 * s} ${R(y - 222 * s)}l${22 * s} 0Q${x + 6 * s} ${R(y - 130 * s)} ${x + 10 * s} ${y}z"/>` + mv('ussway', { ad: '6s', to: `${x}px ${R(y - 220 * s)}px` }, `<ellipse cx="${x - 14 * s}" cy="${R(y - 230 * s)}" rx="${R(110 * s)}" ry="${R(30 * s)}" fill="#c4a23c" opacity=".9"/><path fill="none" stroke="#d5b64a" stroke-width="3" stroke-linecap="round" d="${st}"/>`); };
      return `<defs>${lin(s1, [[0, '#7d83b8'], [0.4, '#c9a3c4'], [0.75, '#fbc6b0'], [1, '#ffe6b8']])}${lin(w1, [[0, '#e0b9bc'], [0.3, '#8f8cb4'], [1, '#575f92']])}</defs>`
        + full(`url(#${s1})`) + stars(3, 24, 240) + rays(1100, 560, 1000, '#ffe3b0', 0.09) + sun(1100, 570, 40, '#fff4d2', '#ffc08a', true)
        + cloud(380, 190, 1.0, '#cf9fb6', 0.85, 66, 6, '#ffd6c4') + cloud(1280, 150, 0.8, '#d3a4b8', 0.8, 58, 24, '#ffdccb') + streak(700, 300, 260, '#ffc9b8', 0.45, 80)
        // Moran-style pine hill
        + mv('uspar', { ad: '50s', dx: '8px' }, ridge('#a79ac0', 480, 80, 6, 11) + ridge('#8d86ac', 520, 50, 8, 5))
        + mv('uspar', { ad: '40s', dx: '10px' }, tower(-60, 70, 220, '#a99dc6', 1) + tower(30, 60, 160, '#b4a9cc', 2) + tower(980, 70, 240, '#a99dc6', 3) + tower(1060, 64, 180, '#b4a9cc', 4) + tower(1140, 76, 260, '#a39ac2', 5) + tower(1230, 60, 150, '#b4a9cc', 6) + tower(1300, 74, 210, '#a99dc6', 7) + tower(1390, 66, 170, '#b4a9cc', 8) + tower(1470, 72, 230, '#a39ac2', 9))
        + haze(500, 120, '#f6e4e0', 0.6)
        + `<path fill="#6b7a54" d="M-160 640Q300 610 700 640T1760 636V700H-160z"/>`
        // pavilion
        + `<path fill="#9b8f86" d="M240 640H640V610H240z"/><path fill="#b3a79c" d="M270 610H610V584H270z"/>`
        + `<g>${[0, 1, 2, 3].map(i => `<rect fill="#a8342c" x="${300 + i * 90}" y="480" width="12" height="104"/>`).join('')}<rect fill="#d9b86a" x="312" y="512" width="78" height="72"/><rect fill="#d9b86a" x="402" y="512" width="78" height="72"/><rect fill="#d9b86a" x="492" y="512" width="78" height="72"/>${lit(326, 526, 50, 40)}${lit(506, 526, 50, 40)}</g>`
        + `<g>${Array.from({ length: 14 }, (_, i) => `<rect fill="${['#2f7f6a', '#2a5da3', '#c8352c'][i % 3]}" x="${296 + i * 21}" y="468" width="16" height="12"/>`).join('')}</g>`
        + roof(440, 372, 360, 100, '#4b4f5a', '#6c717e') + `<path d="M440 372V344" stroke="#3a3f49" stroke-width="5"/><circle cx="440" cy="340" r="6" fill="#d9b24a"/>`
        + `<rect x="-160" y="660" width="1920" height="240" fill="url(#${w1})"/>`
        + shimmer(6, 30, 0, 1600, 680, 880, '#fff0e8', 70) + shimmer(2, 14, 0, 1600, 700, 880, '#7a84b8', 60)
        + mv('usmove', { ad: '46s', dx: '520px' }, mv('usbob', { ad: '3.6s', dy: '3px' }, `<path fill="#5a4636" d="M820 770Q900 800 980 770l-12 -16H832z"/><path fill="#d9c08a" d="M870 754V722" stroke="#5a4636" stroke-width="4"/>`))
        + mv('uspar', { ad: '42s', dx: '14px' }, willow(1380, 820, 1.25, 6) + willow(170, 840, 1.1, 12) + willow(1550, 860, 0.8, 3))
        + `<path fill="#6b7a54" d="M-160 900V860Q300 830 800 870T1760 850V900z"/>`
        + birds(6, 5, 800, 240, '#4a4668', 1.2, 700) + petals(8, 14, '#f0b83a', 10, 18) + finish(0.32);
    } });
})();
