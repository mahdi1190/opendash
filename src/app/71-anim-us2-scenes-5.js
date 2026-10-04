/* ============================================================
   US FULL-SCREEN SCENES, batch 5 (Midwest): Michigan, Minnesota, Missouri, Nebraska, North Dakota, Ohio,
   South Dakota, Wisconsin, Chicago, Indianapolis, Cleveland. PURE classic script: it only calls
   usSceneAdd() (71-anim-us.js) with entries whose svg() draws the inside of a 1600 x 900 scene with the
   shared toolkit (usSceneKit). Layered like the Texas scenes: sky and its light, far / mid / near
   layers drifting at different speeds, the landmark, foreground, ambient life. Colours are painted for
   day; finish() lays the evening grade and the us-lit / us-lamps / us-star classes light up at dusk.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish, star5 } = K;
  /** A conifer: stacked tiers, (x, y) is the foot, h tall, w the widest tier. */
  const pine = (x, y, h, w, col) => {
    let d = '';
    for (let i = 0; i < 5; i++) { const top = y - h + i * h * 0.19, base = top + h * 0.34, hw = w * (0.32 + 0.68 * i / 4) / 2; d += `M${R(x)} ${R(top)}L${R(x + hw)} ${R(base)}L${R(x - hw)} ${R(base)}z`; }
    return `<path fill="${col}" d="${d}"/><rect fill="${col}" x="${R(x - w * 0.04)}" y="${R(y - h * 0.1)}" width="${R(w * 0.08)}" height="${R(h * 0.1)}"/>`;
  };
  /** A row of pines along a shore. */
  const pines = (seed, x0, x1, y, h, col, step, w) => {
    const r = rnd(seed); let o = '';
    for (let x = x0; x < x1; x += step * (0.7 + r() * 0.6)) o += pine(x, y + r() * 6, h * (0.6 + r() * 0.6), (w || h * 0.42) * (0.8 + r() * 0.4), col);
    return o;
  };
  /** A catenary arch: points along u = -1..1, apex at (cx, ay), feet at (cx +- hw, by). */
  const archPts = (cx, ay, hw, by, c, n) => { const p = []; for (let i = 0; i <= n; i++) { const u = -1 + 2 * i / n; p.push([R(cx + u * hw), R(by - (by - ay) * (1 - (Math.cosh(c * u) - 1) / (Math.cosh(c) - 1)))]); } return p; };

  /* ---------- Michigan: the Mackinac Bridge at sunrise over the Straits ---------- */
  usSceneAdd({ key: 'state:MI', label: 'The Mackinac Bridge at sunrise', site: 'The Mackinac Bridge', colour: 'blue', mood: 'proud', season: 'any', tags: ['bridge', 'straits', 'sunrise'],
    svg: () => {
      const sky = U(), wat = U(), deck = U(), s3 = U(), tw = U();
      const cab = (x0, y0, cx, cy, x1, y1) => `M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}`;
      const T1 = 520, T2 = 1080, TY = 170, DY = 548;
      let hang = '';
      const qy = (t, a, b, c) => (1 - t) * (1 - t) * a + 2 * t * (1 - t) * b + t * t * c;
      for (let i = 1; i < 40; i++) { const t = i / 40, x = R(T1 + (T2 - T1) * t), y = R(qy(t, TY, 828, TY)); hang += `M${x} ${y + 2}V${DY}`; }
      for (let i = 1; i < 14; i++) { const t = i / 14, x = R(-160 + 680 * t), y = R(qy(t, 505, 470, TY)); hang += `M${x} ${y + 2}V${DY}`; const x2 = R(1080 + 680 * t), y2 = R(qy(t, TY, 470, 505)); hang += `M${x2} ${y2 + 2}V${DY}`; }
      const tower = (x) => {
        let b = '';
        for (let i = 0; i < 7; i++) { const y = TY + 40 + i * 52; b += `<rect x="${x - 17}" y="${y}" width="34" height="7" fill="#c9ced6"/>`; }
        return `<path fill="url(#${tw})" d="M${x - 20} ${TY - 6}h40l3 ${DY - TY + 160}h-46z"/>` + `<path fill="#9aa4b4" d="M${x - 7} ${TY + 4}h14v${DY - TY + 150}h-14z" opacity=".45"/>` + b
          + `<path fill="#e9edf3" d="M${x - 24} ${TY - 14}h48v10h-48z"/>` + lit(x - 3, TY - 30, 6, 12) + `<rect x="${x - 1}" y="${TY - 44}" width="2" height="16" fill="#cfd4dc"/>`;
      };
      return `<defs>${lin(sky, [[0, '#4f6fb4'], [0.34, '#a58ec0'], [0.62, '#f2a6a0'], [0.8, '#ffd3a1'], [1, '#ffe7be']])}${lin(wat, [[0, '#f4c3a6'], [0.12, '#7c9ec4'], [1, '#1f4777']])}${lin(deck, [[0, '#f4f6fa'], [1, '#a9b2c0']])}${linU(tw, [[0, '#f1f3f7'], [1, '#98a3b6']], 0, TY, 0, DY + 150)}</defs>`
        + full(`url(#${sky})`) + stars(5, 40, 200)
        + sun(330, 438, 46, '#fff4d6', '#ffc58a', true)
        + streak(1180, 190, 260, '#ffe2cf', 0.45, 70) + streak(220, 300, 190, '#ffd0c0', 0.5, 80) + streak(760, 140, 220, '#d8c9ee', 0.4, 90)
        + cloud(1330, 270, 0.9, '#e9a9ab', 0.85, 55, 5, '#fde6d6') + cloud(110, 215, 0.7, '#e7a6b3', 0.8, 62, 17, '#fff0e0') + cloud(840, 330, 0.6, '#f0b1a4', 0.7, 70, 30, '#fff1e0')
        + mv('uspar', { ad: '120s', dx: '40px' }, `<path fill="#6d7fa7" d="M-160 438V418l140 -14l120 12l160 -10l200 8l200 -6l240 6l220 -8l220 10l240 -6l160 4V438z" opacity=".7"/>` + `<path fill="#51668f" d="M1250 440q60 -22 130 -12q70 -16 150 2l200 4v8h-480z" opacity=".6"/>`)
        + `<rect y="436" width="1600" height="464" fill="url(#${wat})"/>`
        + `<path fill="#ffd9a8" opacity=".55" d="M250 440h160l50 460h-260z"/>` + shimmer(11, 34, 190, 470, 450, 880, '#ffe6b8', 44) + shimmer(12, 26, 0, 1600, 470, 890, '#bcd3ee', 50)
        + mv('usmove', { ad: '110s', dx: '700px' }, `<g transform="translate(560 612)"><path fill="#1c2f48" d="M-110 0h250l-14 22h-218z"/><path fill="#c84b3b" d="M-100 -14h224l4 14h-232z"/><rect fill="#f0efe8" x="76" y="-44" width="44" height="30"/><rect fill="#d9d6ca" x="86" y="-56" width="24" height="12"/>` + lit(84, -38, 6, 8) + lit(98, -38, 6, 8) + `<rect fill="#2a3b55" x="-60" y="-24" width="130" height="10"/>` + puffs(100, -60, 4, '#e8e6ee', 8, 40, 5, -50, 2.4) + `</g><path fill="none" stroke="#d6e8f7" stroke-width="3" opacity=".55" d="M-120 22q-70 8 -150 18M-120 26q-90 18 -190 36"/>`)
        + `<g fill="none" stroke="#e6ebf2" stroke-width="5" stroke-linecap="round"><path d="${cab(-160, 505, 180, 470, T1, TY)}"/><path d="${cab(T1, TY, 800, 828, T2, TY)}"/><path d="${cab(T2, TY, 1420, 470, 1760, 505)}"/></g>`
        + `<path fill="none" stroke="#dfe5ee" stroke-width="1.6" opacity=".85" d="${hang}"/>`
        + `<path fill="url(#${deck})" d="M-160 ${DY - 6}H1760v22H-160z"/><path fill="#7f8aa0" d="M-160 ${DY + 16}H1760v7H-160z"/><path fill="none" stroke="#6b768c" stroke-width="2" d="${(() => { let t = ''; for (let x = -150; x < 1760; x += 26) t += `M${x} ${DY + 16}l13 -22l13 22`; return t; })()}"/>`
        + dots(`M-150 ${DY - 10}H1750`, '#ffd98a', 4, 70, 'us-lamps')
        + `<g fill="#aab4c4"><rect x="${T1 - 30}" y="${DY + 22}" width="60" height="150"/><rect x="${T2 - 30}" y="${DY + 22}" width="60" height="150"/></g><g fill="#5b6a85" opacity=".5"><rect x="${T1 - 30}" y="${DY + 150}" width="60" height="22"/><rect x="${T2 - 30}" y="${DY + 150}" width="60" height="22"/></g>`
        + tower(T1) + tower(T2)
        + mv('usmove', { ad: '40s', dx: '1500px' }, `<g transform="translate(800 ${DY - 14})"><rect fill="#c33" x="-14" y="-8" width="26" height="8" rx="3"/><rect fill="#2a3b55" x="-6" y="-12" width="12" height="5"/></g>`)
        + haze(560, 160, '#ffe7cf', 0.35)
        + mv('uspar', { ad: '36s', dx: '26px' }, `<path fill="#18304c" d="M-160 900V700q120 -30 260 -6q140 -50 300 -10l60 40v176z"/>` + pines(31, -150, 420, 705, 150, '#102338', 38, 54))
        + pines(41, -150, 360, 740, 230, '#0b1b2d', 52, 80) + `<path fill="#0b1b2d" d="M-160 900V780q150 -20 300 4t280 40l30 76z"/>`
        + `<path fill="#3b2a2a" d="M1290 900q80 -60 200 -70t270 20V900z"/>` + pines(51, 1330, 1760, 850, 190, '#0b1b2d', 60, 70)
        + mv('usbob', { ad: '5s', dy: '4px' }, `<g transform="translate(1180 750)"><path fill="#f3efe6" d="M-60 0h120l-18 18h-84z"/><path fill="#d9d2c4" d="M-8 -78l0 70l54 0z"/><path fill="#fbf7ee" d="M-12 -86l0 78l-44 0z"/><rect fill="#7a5a3c" x="-2" y="-90" width="2" height="90"/></g>`)
        + birds(8, 7, 520, 300, '#33415f', 1.3, 640) + birds(9, 4, 1200, 200, '#4a4f77', 1.0, 480)
        + finish(0.34);
    } });
})();
