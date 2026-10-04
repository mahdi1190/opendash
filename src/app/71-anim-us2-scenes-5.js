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
  /** A far treeline of spires: one path of small triangles, base y, height h. */
  const spires = (seed, y, h, col, step, foot) => {
    const r = rnd(seed); let x = -160, d = `M-160 ${foot || y + 30}V${y}`;
    while (x < 1760) { const w = step * (0.7 + r() * 0.7), hh = h * (0.5 + r() * 0.7); d += `L${R(x + w / 2)} ${R(y - hh)}L${R(x + w)} ${y}`; x += w; }
    return `<path fill="${col}" d="${d}V${foot || y + 30}z"/>`;
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
      for (let i = 1; i < 32; i++) { const t = i / 32, x = R(T1 + (T2 - T1) * t), y = R(qy(t, TY, 828, TY)); hang += `M${x} ${y + 2}V${DY}`; }
      for (let i = 1; i < 10; i++) { const t = i / 10, x = R(-160 + 680 * t), y = R(qy(t, 505, 470, TY)); hang += `M${x} ${y + 2}V${DY}`; const x2 = R(1080 + 680 * t), y2 = R(qy(t, TY, 470, 505)); hang += `M${x2} ${y2 + 2}V${DY}`; }
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
        + `<path fill="#ffd9a8" opacity=".28" d="M270 440h120l90 460h-300z"/>` + shimmer(11, 34, 190, 470, 450, 880, '#ffe6b8', 44) + shimmer(12, 26, 0, 1600, 470, 890, '#bcd3ee', 50)
        + mv('usmove', { ad: '110s', dx: '500px' }, `<g transform="translate(900 640)"><path fill="#1c2f48" d="M-110 0h250l-14 22h-218z"/><path fill="#c84b3b" d="M-100 -14h224l4 14h-232z"/><rect fill="#f0efe8" x="76" y="-44" width="44" height="30"/><rect fill="#d9d6ca" x="86" y="-56" width="24" height="12"/>` + lit(84, -38, 6, 8) + lit(98, -38, 6, 8) + `<rect fill="#2a3b55" x="-60" y="-24" width="130" height="10"/>` + puffs(100, -60, 4, '#e8e6ee', 8, 40, 5, -50, 2.4) + `</g><path fill="none" stroke="#d6e8f7" stroke-width="3" opacity=".55" d="M-120 22q-70 8 -150 18"/>`)
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

  /* ---------- Minnesota: a loon on a misty northern lake at dawn ---------- */
  usSceneAdd({ key: 'state:MN', label: 'A loon on a misty northern lake', site: 'A loon on a north-woods lake', colour: 'teal', mood: 'calm', season: 'any', tags: ['loon', 'lake', 'pines', 'mist'],
    svg: () => {
      const sky = U(), lake = U(), glow = U();
      const loon = (flip) => {
        const body = '#16191f', wh = '#f4f4ee';
        let chk = '';
        const r = rnd(9);
        for (let i = 0; i < 26; i++) chk += `<rect x="${R(-70 + (i % 13) * 14 + r() * 4)}" y="${R(-46 + Math.floor(i / 13) * 12 + (i % 13) * 1.4 + r() * 3)}" width="5" height="5" fill="${wh}"/>`;
        let neck = '';
        for (let i = 0; i < 5; i++) neck += `<path d="M${-125 + i * 1.5} ${-88 + i * 7}l16 -3" stroke="${wh}" stroke-width="2.4" fill="none"/>`;
        return `<path fill="${body}" d="M-118 10C-136 -14 -116 -44 -70 -52C-10 -62 70 -54 126 -28L156 -16L130 -8C132 2 112 10 100 10z"/>`
          + `<path fill="${body}" d="M-112 -22C-114 -60 -142 -80 -144 -114L-106 -120C-100 -86 -82 -62 -66 -44z"/>`
          + `<path fill="${body}" d="M-146 -112C-142 -136 -112 -140 -104 -120C-100 -104 -130 -98 -146 -112z"/>`
          + `<path fill="#0e1014" d="M-143 -122l-48 4l46 8z"/><circle cx="-128" cy="-123" r="4" fill="#d4262c"/>` + neck
          + `<path fill="${wh}" d="M-116 8C-110 -4 -60 -20 -10 -14C60 -8 112 0 128 -8L122 10z"/>` + chk + `<path fill="none" stroke="#2c323d" stroke-width="2" d="M-70 -48C-10 -58 70 -50 124 -26"/>`;
      };
      let ref = '';
      return `<defs>${lin(sky, [[0, '#8fb0b8'], [0.45, '#d8d3bd'], [0.7, '#f4d9ae'], [1, '#f8e4bd']])}${lin(lake, [[0, '#d9cfa8'], [0.15, '#8ba8a6'], [1, '#2b5559']])}${radU(glow, [[0, '#fff0c0', 0.9], [1, '#fff0c0', 0]], 800, 400, 520)}</defs>`
        + full(`url(#${sky})`) + stars(3, 36, 220)
        + `<circle cx="800" cy="400" r="520" fill="url(#${glow})"/>` + sun(800, 396, 40, '#fff6dd', '#ffe0a0', true)
        + cloud(250, 170, 0.8, '#d6c9b8', 0.7, 60, 8, '#fff6e6') + cloud(1280, 230, 0.7, '#d6c9b8', 0.7, 66, 22, '#fff6e6') + streak(820, 120, 260, '#ffffff', 0.4, 80)
        + mv('uspar', { ad: '90s', dx: '30px' }, `<path fill="#9db6b2" d="M-160 440V400q80 -30 190 -10q100 -40 230 0q120 -34 260 6q140 -24 280 -4q150 -40 300 4q130 -20 250 6q130 -30 280 10V440z"/>` + spires(61, 436, 60, '#8aa6a2', 16))
        + mv('uspar', { ad: '60s', dx: '44px' }, spires(62, 444, 84, '#5f8683', 22, 460))
        + `<rect y="440" width="1600" height="460" fill="url(#${lake})"/>`
        + `<g opacity=".45" transform="translate(0 888) scale(1 -1)">` + spires(62, 444, 84, '#4e7a77', 22, 460) + `</g>`
        + shimmer(21, 30, 0, 1600, 470, 890, '#fff1cc', 54) + shimmer(22, 22, 0, 1600, 450, 880, '#9cc2bf', 60)
        + mv('usdrift', { ad: '40s', dx: '60px' }, haze(430, 110, '#f4efe0', 0.75))
        + mv('uspar', { ad: '28s', dx: '50px' }, pines(71, -150, 520, 640, 300, '#1c3a3a', 70, 110) + `<path fill="#1c3a3a" d="M-160 900V700q150 -40 330 -20q130 14 190 70l40 150z"/>`)
        + mv('uspar', { ad: '28s', dx: '50px' }, pines(72, 1090, 1760, 640, 340, '#16302f', 76, 120) + `<path fill="#16302f" d="M1760 900V690q-140 -30 -300 10q-150 40 -230 100l-40 100z"/>`)
        + `<path fill="#2c4845" d="M-160 900V810q250 -10 520 40l60 50zM1160 900q170 -50 360 -80t240 -14V900z"/>`
        + mv('usdrift', { ad: '50s', d: '-12s', dx: '120px' }, haze(500, 70, '#f6f2e4', 0.7)) + mv('usdrift', { ad: '64s', dx: '90px' }, haze(580, 60, '#f6f2e4', 0.5))
        /* the loon and its reflection */
        + mv('usbob', { ad: '6s', dy: '3px' }, `<g transform="translate(790 676) scale(1.5)"><g opacity=".4" transform="scale(1 -1) translate(0 -2)">${loon()}</g>${loon()}</g>`)
        + `<g fill="none" stroke="#f2f6f2" stroke-width="2.6" opacity=".6">` + mv('uspuff', { ad: '5s', dx: '0px', dy: '0px', sc: 3.2 }, `<ellipse cx="800" cy="692" rx="140" ry="10"/>`) + mv('uspuff', { ad: '5s', d: '-2.5s', dx: '0px', dy: '0px', sc: 3.2 }, `<ellipse cx="800" cy="692" rx="140" ry="10"/>`) + `</g>`
        + birds(14, 5, 500, 260, '#2d4442', 1.1, 600)
        + finish(0.36);
    } });

  /* ---------- Missouri: the Gateway Arch and a Mississippi sternwheeler ---------- */
  usSceneAdd({ key: 'state:MO', label: 'The Gateway Arch and a riverboat', site: 'The Gateway Arch', colour: 'orange', mood: 'proud', season: 'any', tags: ['arch', 'riverboat', 'mississippi', 'st louis'],
    svg: () => {
      const sky = U(), riv = U(), archL = U(), archR = U(), s3 = U();
      const O = archPts(800, 130, 262, 740, 2.1, 36), I = archPts(800, 168, 205, 740, 1.95, 36);
      const outer = O.map(p => p.join(' ')), inner = I.map(p => p.join(' '));
      const half = (a, b, from, to) => `M${a.slice(from, to + 1).join('L')}L${b.slice(from, to + 1).reverse().join('L')}z`;
      const left = half(outer, inner, 0, 18), right = half(outer, inner, 18, 36);
      const wheel = (() => { let s = ''; for (let i = 0; i < 10; i++) s += `<rect x="-3" y="-44" width="6" height="22" fill="#b3342a" transform="rotate(${i * 36})"/>`; return s; })();
      return `<defs>${lin(sky, [[0, '#3f78c4'], [0.45, '#8fb8e0'], [0.75, '#f9d5a7'], [1, '#ffb877']])}${lin(riv, [[0, '#f2b27c'], [0.1, '#c99a78'], [0.5, '#7d7066'], [1, '#4a4c5a']])}${linU(archL, [[0, '#f8fbff'], [1, '#aebfd4']], 540, 130, 800, 740)}${linU(archR, [[0, '#8da3bf'], [1, '#e8f0fa']], 800, 130, 1060, 740)}</defs>`
        + full(`url(#${sky})`) + stars(7, 40, 260)
        + sun(1260, 560, 46, '#fff0cf', '#ffb870', false) + rays(1260, 560, 760, '#ffe3b5', 0.2)
        + cloud(260, 190, 0.9, '#c8d8ec', 0.9, 58, 3) + cloud(1190, 150, 0.75, '#f3d3c0', 0.85, 66, 15, '#fff2e3') + cloud(620, 330, 0.55, '#e8cdbb', 0.75, 70, 28, '#fff3e6') + streak(1000, 330, 240, '#ffe6c5', 0.5, 80)
        /* the city skyline behind, with the Old Courthouse dome */
        + mv('uspar', { ad: '110s', dx: '28px' }, (() => { const r = rnd(33); let b = ''; for (let x = -150; x < 1760; x += 38 + r() * 30) { const h = 40 + r() * 110, w = 30 + r() * 30; b += `<rect fill="#8a97ad" x="${R(x)}" y="${R(700 - h)}" width="${R(w)}" height="${R(h)}"/>`; if (r() > 0.6) b += lit(R(x + 6), R(700 - h + 10), 6, 10); } return b + `<path fill="#7d8aa2" d="M100 700V610h150v90z"/><path fill="#8a97ad" d="M130 610a45 45 0 0 1 90 0z"/><rect fill="#8a97ad" x="172" y="548" width="6" height="14"/>`; })())
        + `<path fill="#6c9a58" d="M-160 740q300 -34 640 -10t700 6q300 8 480 -4V780H-160z"/>`
        + mv('uspar', { ad: '70s', dx: '30px' }, canopy('#4d7a46', 735, 26, 5, -160, 460, 780) + canopy('#4d7a46', 735, 26, 6, 1160, 1760, 780))
        /* the Arch */
        + `<path fill="#6d7e96" opacity=".35" d="M${R(560 + 12)} 744q240 40 480 0l26 12q-290 52 -532 0z"/>`
        + `<path fill="url(#${archL})" d="${left}"/><path fill="url(#${archR})" d="${right}"/>`
        + `<path fill="none" stroke="#fff" stroke-width="3" opacity=".7" d="M${outer.slice(0, 19).join('L')}"/><path fill="none" stroke="#5b6e8a" stroke-width="3" opacity=".55" d="M${inner.slice(18).join('L')}"/>`
        + mv('usglow', { ad: '3s' }, `<circle cx="800" cy="134" r="14" fill="#fff" opacity=".7"/><path d="M800 104v60M770 134h60" stroke="#fff" stroke-width="2.4" opacity=".8"/>`)
        + `<path fill="#4d7a46" d="M-160 900V760q500 -40 960 -14t960 4V900z" opacity="0"/>`
        /* the river */
        + `<rect y="738" width="1600" height="162" fill="url(#${riv})"/><path fill="#6c5a48" opacity=".5" d="M-160 738H1760v10H-160z"/>`
        + `<path fill="#ffd29a" opacity=".3" d="M1160 738h200l150 162h-520z"/>` + shimmer(41, 26, 880, 1640, 750, 890, '#ffd9a8', 56) + shimmer(42, 18, 0, 1600, 760, 890, '#d0b898', 54)
        /* the sternwheeler */
        + mv('usmove', { ad: '120s', dx: '240px' }, mv('usbob', { ad: '4s', dy: '2.5px' },
            `<g transform="translate(1330 832) scale(.8)"><path fill="#3b2a24" d="M-190 -4h400l-26 28h-348z"/><rect fill="#f7f2e8" x="-170" y="-40" width="340" height="36"/><rect fill="#fbf8f0" x="-150" y="-72" width="290" height="32"/><rect fill="#f1e9d8" x="-120" y="-100" width="170" height="28"/><rect fill="#b3342a" x="-100" y="-114" width="130" height="14"/><rect fill="#2b2a2a" x="-160" y="-44" width="324" height="4"/><rect fill="#2b2a2a" x="-140" y="-76" width="272" height="4"/>`
            + (() => { let w = ''; for (let i = 0; i < 12; i++) w += lit(-150 + i * 26, -34, 12, 14); for (let i = 0; i < 10; i++) w += lit(-126 + i * 26, -66, 12, 14); return w; })()
            + `<g fill="#1c1c1c"><rect x="60" y="-170" width="18" height="70"/><rect x="104" y="-170" width="18" height="70"/><path d="M56 -170h26l-3 -14h-20zM100 -170h26l-3 -14h-20z"/></g><rect fill="#f0e2c0" x="62" y="-150" width="14" height="5"/><rect fill="#f0e2c0" x="106" y="-150" width="14" height="5"/>`
            + puffs(69, -186, 5, '#d9dce6', 14, -70, 4.5, -90, 4) + puffs(113, -186, 5, '#cfd2de', 12, -70, 5, -80, 4)
            + `<g transform="translate(-196 -18)"><circle r="46" fill="#b3342a" opacity=".25"/><g class="x-usspin" style="--ad:5s;transform-box:fill-box;transform-origin:center">${wheel}</g><circle r="6" fill="#3b2a24"/></g>`
            + `</g><path fill="none" stroke="#ffe9cf" stroke-width="3" opacity=".6" d="M1040 856q-100 10 -230 6M1050 862q-130 18 -300 12"/>`))
        + `<path fill="#3f6a3e" d="M-160 900V860q260 -22 520 -6t480 6V900z" opacity="0"/>`
        + birds(17, 6, 820, 380, '#2d3550', 1.2, 600) + birds(18, 3, 300, 250, '#3b4767', 0.9, 420)
        + finish(0.34);
    } });

  /* ---------- Nebraska: Chimney Rock and a wagon on the Oregon Trail ---------- */
  usSceneAdd({ key: 'state:NE', label: 'Chimney Rock and a wagon train', site: 'Chimney Rock on the Oregon Trail', colour: 'amber', mood: 'calm', season: 'any', tags: ['rock', 'prairie', 'trail', 'wagon'],
    svg: () => {
      const sky = U(), rock = U(), grass = U(), s3 = U();
      const r = rnd(77);
      let strata = '';
      for (let i = 0; i < 9; i++) { const y = 490 + i * 26; { const hw = R([55, 62, 72, 88, 112, 145, 190, 245, 310][i] * 0.82); strata += `<path fill="none" stroke="#a77d4f" stroke-width="2" opacity=".55" d="M${R(806 - hw)} ${y}q${hw} 12 ${2 * hw} 0"/>`; } }
      let tufts = '';
      for (let i = 0; i < 46; i++) { const x = R(-140 + r() * 1840), y = R(760 + r() * 130), h = 16 + (y - 760) * 0.25; tufts += `<path d="M${x} ${y}q${R(-h * 0.2)} ${R(-h * 0.7)} ${R(-h * 0.5)} ${R(-h)}M${x} ${y}q${R(h * 0.1)} ${R(-h * 0.8)} ${R(h * 0.1)} ${R(-h * 1.2)}M${x} ${y}q${R(h * 0.2)} ${R(-h * 0.7)} ${R(h * 0.55)} ${R(-h * 0.95)}"/>`; }
      const wheel = (x, y, rr) => { let sp = ''; for (let i = 0; i < 6; i++) sp += `<path d="M0 ${-rr}V${rr}" transform="rotate(${i * 30})"/>`; return `<g transform="translate(${x} ${y})"><circle r="${rr}" fill="none" stroke="#5a3a22" stroke-width="5"/><g class="x-usspin" style="--ad:7s;transform-box:fill-box;transform-origin:center" stroke="#5a3a22" stroke-width="2.4">${sp}</g><circle r="5" fill="#3a2414"/></g>`; };
      const ox = (x) => `<g transform="translate(${x} 800)"><g fill="#6e4a30"><rect x="-34" y="-46" width="68" height="34" rx="14"/><path d="M30 -44l30 10l-4 24l-26 -2z"/><path d="M-30 -14h8v28h-8zM-12 -14h8v28h-8zM12 -14h8v28h-8zM28 -12h8v26h-8z"/></g><path fill="#f1e3c8" d="M54 -34l12 -12l-4 14zM44 -36l-6 -14l12 8z"/><path fill="#4d321f" d="M-34 -40q-10 14 -2 24z"/></g>`;
      return `<defs>${lin(sky, [[0, '#4a86c8'], [0.45, '#9fc6e2'], [0.75, '#f9dca4'], [1, '#f6b777']])}${linU(rock, [[0, '#f0d9ac'], [0.5, '#d9b887'], [1, '#a4764a']], 560, 200, 1040, 720)}${lin(grass, [[0, '#b8b25f'], [0.5, '#8d9444'], [1, '#6a7634']])}</defs>`
        + full(`url(#${sky})`) + stars(15, 44, 250)
        + sun(1330, 520, 40, '#fff2cc', '#ffcf80', false)
        + cloud(300, 180, 1.0, '#d3e0ee', 0.92, 62, 2) + cloud(1100, 130, 0.75, '#f6e2cc', 0.85, 70, 20, '#fff7ea') + cloud(1450, 300, 0.6, '#f6d6b4', 0.8, 75, 35, '#fff3e0') + streak(250, 380, 260, '#fff0d6', 0.5, 85) + streak(900, 70, 300, '#ffffff', 0.35, 100)
        + mv('uspar', { ad: '120s', dx: '26px' }, ridge('#a79a8c', 600, 50, 9, 4) + ridge('#97906f', 640, 34, 8, 6))
        /* the rock: a long talus cone and the thin spire */
        + `<path fill="url(#${rock})" d="M440 726C610 706 700 610 742 480L750 300L754 160L778 130L822 128L848 152L852 300L862 480C905 610 1000 706 1170 726z"/>`
        + `<path fill="#6f4d30" opacity=".38" d="M806 128L848 152L852 300L862 480C905 610 1000 706 1170 726L826 726L816 480L808 300z"/>`
        + `<path fill="#fff4d2" opacity=".5" d="M778 130L806 128L802 300L796 480C770 620 690 700 600 716C690 650 738 570 746 470L752 300L756 160z"/>`
        + strata
        + `<path fill="#7a5a3a" opacity=".3" d="M778 130L822 128L826 140L776 144z"/>`
        + `<path fill="#d9bb86" d="M470 724q90 -20 160 -20t170 10t200 -10t140 20l60 20H410z"/>`
        /* the plain */
        + `<rect y="716" width="1600" height="184" fill="url(#${grass})"/>`
        + mv('uspar', { ad: '50s', dx: '30px' }, `<path fill="#c2a86a" opacity=".55" d="M-160 780q500 -60 1000 -30t920 -20v40H-160z"/>`)
        + `<path fill="#cfb07a" d="M-160 900V850q400 -50 840 -70t1080 -20V900z"/><path fill="#a98458" opacity=".5" d="M-160 880q500 -40 960 -60t960 0v14H-160z"/>`
        + `<g fill="none" stroke="#7d8240" stroke-width="3" stroke-linecap="round" class="x-ussway" style="--ad:5s;transform-box:view-box;transform-origin:800px 900px">${tufts}</g>`
        /* the wagon */
        + mv('usmove', { ad: '90s', dx: '360px' }, mv('usbob', { ad: '1.4s', dy: '1.6px' }, ox(560) + ox(660) + `<path d="M730 780h60" stroke="#4d321f" stroke-width="4"/>`
          + `<g transform="translate(790 0)"><rect fill="#7b4c2a" x="0" y="750" width="170" height="40" rx="4"/><rect fill="#936139" x="0" y="750" width="170" height="10"/><path fill="#f7efdc" d="M10 750q4 -86 76 -92q76 8 80 92z"/><path fill="#d8c9a7" d="M86 658q76 8 80 92h-34q-6 -70 -46 -92z"/><path fill="none" stroke="#a89877" stroke-width="2" d="M44 750q4 -64 42 -88M126 750q-2 -60 -40 -88"/><ellipse cx="22" cy="720" rx="10" ry="26" fill="#3a2c20" opacity=".6"/><rect fill="#5a3a22" x="-30" y="772" width="30" height="4"/>` + wheel(32, 800, 34) + wheel(138, 800, 34) + `</g>`))
        + `<path fill="#4a5226" d="M-160 900V880q200 -30 360 -14t240 40z"/><path fill="#4a5226" d="M1180 900q160 -40 320 -30t260 6V900z"/>`
        + birds(21, 6, 1180, 330, '#4a3a2c', 1.2, 560) + birds(22, 4, 400, 260, '#5a4a3c', 0.9, 460)
        + finish(0.34);
    } });

  /* ---------- North Dakota: pumpjacks on the prairie at sunset ---------- */
  usSceneAdd({ key: 'state:ND', label: 'Pumpjacks on the prairie at sunset', site: 'The Bakken at sunset', colour: 'orange', mood: 'focused', season: 'any', tags: ['oil', 'prairie', 'sunset', 'pumpjack'],
    svg: () => {
      const sky = U(), ground = U(), g3 = U();
      const jack = (x, y, s, col) => {
        const w = (v) => R(v * s);
        return `<g transform="translate(${x} ${y})" fill="${col}" stroke="${col}">`
          + `<path stroke-width="${w(7)}" fill="none" d="M${w(-40)} 0L${w(10)} ${w(-150)}L${w(60)} 0M${w(-14)} ${w(-70)}H${w(36)}"/>`
          + `<rect x="${w(-70)}" y="${w(-14)}" width="${w(170)}" height="${w(14)}" stroke="none"/>`
          + `<g class="x-usbob" style="--ad:3.4s;--dy:${w(10)}px"><path stroke-width="${w(9)}" fill="none" d="M${w(-120)} ${w(-150)}L${w(150)} ${w(-170)}"/><path stroke="none" d="M${w(-150)} ${w(-190)}q${w(60)} ${w(-8)} ${w(66)} ${w(40)}l${w(-14)} ${w(14)}q${w(-26)} ${w(-30)} ${w(-70)} ${w(-24)}z"/><path stroke-width="${w(3)}" fill="none" d="M${w(-110)} ${w(-150)}V${w(-14)}"/></g>`
          + `<g class="x-usbob" style="--ad:3.4s;--d:-1.7s;--dy:${w(8)}px"><path stroke="none" d="M${w(100)} ${w(-190)}h${w(60)}v${w(60)}h${w(-60)}z"/></g>`
          + `<g transform="translate(${w(70)} ${w(-60)})"><circle r="${w(34)}" stroke="none"/><g class="x-usspin" style="--ad:3.4s;transform-box:fill-box;transform-origin:center"><path stroke="${'#e8a26a'}" stroke-width="${w(4)}" d="M${w(-26)} 0H${w(26)}M0 ${w(-26)}V${w(26)}" fill="none" opacity=".5"/></g></g></g>`;
      };
      let bales = '';
      for (let i = 0; i < 5; i++) { const x = 140 + i * 90 + (i % 2) * 20, y = 800 + (i % 3) * 18; bales += `<ellipse cx="${x}" cy="${y}" rx="${34 - (i % 3) * 3}" ry="${28 - (i % 3) * 2}" fill="#d49a3d" stroke="#a8721f" stroke-width="3"/><path d="M${x - 14} ${y}a14 12 0 0 1 28 0" fill="none" stroke="#a8721f" stroke-width="2"/>`; }
      return `<defs>${lin(sky, [[0, '#2b2f6e'], [0.3, '#7a3f8b'], [0.55, '#e0526a'], [0.75, '#ff9a4a'], [1, '#ffd36e']])}${lin(ground, [[0, '#5a3a2e'], [0.3, '#3a2a2a'], [1, '#1f1822']])}${lin(g3, [[0, '#2b1e24'], [1, '#150f18']])}</defs>`
        + full(`url(#${sky})`) + stars(23, 70, 260)
        + sun(800, 560, 70, '#fff0b0', '#ffb24a', false)
        + `<circle cx="800" cy="560" r="200" fill="#ffd27a" opacity=".25"/>` + rays(800, 560, 900, '#ffd890', 0.12)
        + streak(240, 260, 300, '#ff9f7a', 0.55, 80) + streak(1320, 330, 280, '#ffb27a', 0.55, 90) + streak(840, 410, 360, '#ffe0a0', 0.5, 100) + streak(1250, 170, 240, '#c06aa0', 0.5, 110) + streak(400, 420, 260, '#ffd090', 0.5, 95)
        + cloud(600, 250, 0.9, '#b04a78', 0.8, 70, 10, '#ffa07a') + cloud(1100, 360, 0.7, '#c05a6a', 0.8, 80, 30, '#ffc07a') + cloud(200, 150, 0.7, '#7a3a8a', 0.7, 90, 5, '#d4707a')
        + mv('uspar', { ad: '120s', dx: '24px' }, ridge('#8a3c5a', 636, 30, 9, 11) + ridge('#6a2c4a', 664, 26, 8, 12))
        + haze(610, 80, '#ffb27a', 0.45)
        + `<rect y="680" width="1600" height="220" fill="url(#${ground})"/>`
        + `<path fill="#ffb060" opacity=".25" d="M-160 690q500 -14 960 -4t960 6v26q-480 -16 -960 -6t-960 12z"/>`
        + jack(1260, 740, 0.62, '#1a1218') + jack(1050, 724, 0.4, '#241824')
        /* a flare stack and tanks */
        + `<g fill="#1a1218"><rect x="1450" y="520" width="5" height="220"/><rect x="1380" y="690" width="44" height="50" rx="8"/><rect x="1330" y="700" width="40" height="40" rx="8"/></g>`
        + mv('usflicker', { ad: '0.3s', to: '1452px 520px' }, `<path fill="#ff8a2a" d="M1452 480q-14 22 -8 36q8 6 16 0q6 -14 -8 -36z"/><path fill="#ffe27a" d="M1452 498q-6 10 -3 16q4 3 7 0q2 -6 -4 -16z"/>`)
        + `<g class="x-usglow" style="--ad:2.5s"><circle cx="1452" cy="505" r="46" fill="#ff9a3a" opacity=".3"/></g>`
        + mv('usdrift', { ad: '30s', dx: '30px' }, puffs(1452, 470, 3, '#4a3a4a', 14, 60, 8, -70, 3))
        /* the near jack, big, and the field */
        + `<rect y="800" width="1600" height="100" fill="url(#${g3})"/>`
        + jack(520, 820, 1.55, '#0d0a10')
        + `<g class="x-ussway" style="--ad:5s;transform-box:view-box;transform-origin:800px 900px" fill="none" stroke="#0d0a10" stroke-width="3" stroke-linecap="round">` + (() => { const r = rnd(5); let t = ''; for (let i = 0; i < 40; i++) { const x = R(-140 + r() * 1840), y = R(840 + r() * 80), h = 30 + r() * 30; t += `M${x} ${y}q${R(-6)} ${-R(h * 0.6)} ${R(-14 + r() * 28)} ${-R(h)}`; } return `<path d="${t}"/>`; })() + `</g>`
        + `<path fill="#0d0a10" d="M1100 900V850q40 -30 90 -22q40 -6 70 22V900z" opacity=".0"/>`
        + `<g fill="#0d0a10" stroke="#0d0a10"><path stroke-width="4" d="M-160 840H1760"/>${(() => { let p = ''; for (let x = -120; x < 1760; x += 140) p += `<rect x="${x}" y="800" width="8" height="50" stroke="none"/>`; return p; })()}</g>`
        + bales.replace(/fill="#d49a3d"/g, 'fill="#3a2418"').replace(/stroke="#a8721f"/g, 'stroke="#241410"')
        + birds(24, 7, 700, 300, '#3a1f3a', 1.3, 620) + birds(25, 5, 1200, 230, '#4a2540', 1.0, 480)
        + finish(0.3);
    } });

  /* ---------- Ohio: the Wright Flyer over the farm fields ---------- */
  usSceneAdd({ key: 'state:OH', label: 'The Wright Flyer over the fields', site: 'The Wright Flyer', colour: 'blue', mood: 'proud', season: 'any', tags: ['aviation', 'airplane', 'farm', 'fields'],
    svg: () => {
      const sky = U(), fld = U();
      const VP = 430, cols = [['#9bb857', '#86a64a', '#b9c46a', '#d9c775'], ['#6f9a45', '#a9b657', '#e3cf7e', '#7da94f'], ['#5f8e3f', '#c9b963', '#8fb352', '#e0d08a'], ['#4f8238', '#9bb04f', '#d6c46c', '#6f9a45'], ['#477a33', '#86a64a', '#c4b45a', '#5f8e3f']];
      const ys = [436, 470, 520, 590, 690, 900];
      const r = rnd(41); let field = '';
      const xAt = (x0, y) => R(800 + (x0 - 800) * (y - VP) / (900 - VP));
      for (let b = 0; b < 5; b++) {
        let x = -3000;
        while (x < 4200) { const w = 260 + r() * 520, c = cols[b][Math.floor(r() * 4)]; field += `<path fill="${c}" d="M${xAt(x, ys[b])} ${ys[b]}L${xAt(x + w, ys[b])} ${ys[b]}L${xAt(x + w, ys[b + 1])} ${ys[b + 1]}L${xAt(x, ys[b + 1])} ${ys[b + 1]}z"/>`; x += w; }
      }
      let rows = '';
      for (let i = 0; i < 30; i++) { const x0 = -2400 + i * 190; rows += `M${xAt(x0, 520)} 520L${xAt(x0, 900)} 900`; }
      const prop = (x, y) => `<g transform="translate(${x} ${y})"><g class="x-usspin" style="--ad:.28s;transform-box:fill-box;transform-origin:center"><ellipse rx="7" ry="52" fill="#5c3b1e" opacity=".75"/></g></g>`;
      const wing = (y, off) => `<path fill="#f1e5c6" stroke="#9c8a62" stroke-width="2" d="M${-250 + off} ${y}L${230 + off} ${y - 34}L${250 + off} ${y - 22}L${-230 + off} ${y + 14}z"/><path fill="#d3c19a" d="M${-230 + off} ${y + 14}L${250 + off} ${y - 22}L${250 + off} ${y - 16}L${-230 + off} ${y + 22}z"/>`;
      let ribs = ''; for (let i = 0; i < 12; i++) ribs += `M${R(-220 + i * 40)} ${R(-70 + (i * 40) * -0.07 + 6)}l6 28`;
      const flyer = () => `<g fill="none" stroke="#7a5430" stroke-width="5" stroke-linecap="round">`
        + (() => { let s = ''; for (let i = 0; i < 6; i++) { const x = -200 + i * 80, yt = -70 - i * 6 * 0.85, yb = 6 - i * 6 * 0.85; s += `<path d="M${x} ${yt + 6}V${yb + 4}"/><path stroke-width="1.6" stroke="#4a3a2a" d="M${x} ${yt + 6}L${x + 80} ${yb + 4}M${x + 80} ${yt - 0}L${x} ${yb + 4}"/>`; } return s; })() + `</g>`
        + wing(0, 0) + wing(-76, 0)
        + `<path fill="#e6d7b2" stroke="#9c8a62" stroke-width="2" d="M-300 -28l-62 -8l4 30l60 6z"/><path fill="#e6d7b2" stroke="#9c8a62" stroke-width="2" d="M-300 -70l-60 -4l2 26l60 4z"/><path stroke="#7a5430" stroke-width="5" d="M-300 -30L-120 -10M-300 -66L-120 -50" fill="none"/>`
        + `<path fill="#e6d7b2" stroke="#9c8a62" stroke-width="2" d="M320 -70l50 -6l0 76l-50 8z"/><path stroke="#7a5430" stroke-width="5" fill="none" d="M320 -30L240 -10M320 -60L240 -50"/>`
        + `<path fill="none" stroke="#7a5430" stroke-width="6" stroke-linecap="round" d="M-250 38H220M-210 6V38M-70 -4V38M90 -14V38"/>`
        + `<path fill="#5a3a22" d="M-40 -20q40 -22 90 -10l-6 14q-44 -10 -84 4z"/><circle cx="-34" cy="-30" r="9" fill="#e0b48a"/><path fill="#4a3a2a" d="M-44 -38q10 -10 20 0z"/>`
        + `<path fill="none" stroke="#4a3a2a" stroke-width="2" d="M120 -40Q200 -40 230 -10M120 -34Q200 -20 230 6"/><rect x="104" y="-52" width="26" height="30" rx="4" fill="#3a3a40"/>` + prop(262, -34) + prop(262, -92).replace('translate(262 -92)', 'translate(262 -92)');
      return `<defs>${lin(sky, [[0, '#4a8ad6'], [0.4, '#8ec4f0'], [0.75, '#d6ebf6'], [1, '#fbf0d2']])}</defs>`
        + full(`url(#${sky})`) + stars(31, 40, 260)
        + sun(300, 380, 36, '#fff8dc', '#ffe9a8', true) + rays(300, 380, 700, '#fff2c0', 0.18)
        + cloud(220, 170, 1.0, '#cfe0f0', 0.95, 60, 3) + cloud(1220, 140, 1.05, '#d3e2f0', 0.95, 68, 16) + cloud(760, 300, 0.7, '#dbe8f4', 0.9, 74, 30) + cloud(1450, 330, 0.55, '#e0eaf4', 0.9, 80, 40) + streak(600, 90, 280, '#ffffff', 0.45, 90)
        + mv('uspar', { ad: '110s', dx: '24px' }, ridge('#9db8cc', 450, 30, 9, 3) + ridge('#7ea0a0', 470, 20, 9, 8))
        + `<g>${field}</g>`
        + `<path fill="none" stroke="#2f5a2a" stroke-width="2" opacity=".25" d="${rows}"/>`
        + `<path fill="#a98b5a" opacity=".8" d="M${xAt(-100, 436)} 436L${xAt(-60, 436)} 436L${xAt(900, 900)} 900L${xAt(300, 900)} 900z"/>`
        /* barn and silo on the far field */
        + `<g transform="translate(1180 470)"><path fill="#b6372b" d="M0 0V-40L30 -62L60 -40V0z"/><path fill="#f3efe4" d="M26 0V-20h8v20z"/><rect fill="#c8c1b0" x="66" y="-70" width="16" height="70"/><path fill="#8f8a7e" d="M66 -70a8 8 0 0 1 16 0z"/></g>`
        + `<g transform="translate(440 468)"><path fill="#ecece4" d="M0 0V-22L18 -34L36 -22V0z"/><path fill="#a64a3a" d="M-2 -22L18 -38L38 -22z"/></g>`
        + canopy('#3d6d36', 462, 16, 9, 200, 640, 480) + canopy('#3d6d36', 466, 16, 10, 1020, 1440, 480)
        + mv('usdrift', { ad: '70s', dx: '30px' }, haze(440, 60, '#e8f2ea', 0.5))
        + `<g transform="translate(1400 330)"><rect x="-3" y="0" width="6" height="140" fill="#6d6a68"/><g class="x-usflag" style="--ad:1.6s;transform-box:fill-box;transform-origin:left center"><path fill="#e0562a" d="M3 4h70l-12 14l12 14H3z"/><path fill="#fff" d="M30 4h12l-6 14l6 14H30l6 -14z"/></g></g>`
        /* the Flyer: banks gently and rises and falls */
        + mv('usbob', { ad: '5s', dy: '14px' }, mv('ussway2', { ad: '7s', to: '800px 360px' }, `<g transform="translate(800 340) scale(1.05)"><ellipse cx="0" cy="560" rx="260" ry="12" fill="#2a4a2a" opacity="0"/>${flyer()}</g>`))
        + mv('usdrift', { ad: '40s', dx: '60px' }, `<g opacity=".5" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"><path d="M1130 330q150 6 330 -8"/><path d="M1180 350q120 6 280 0" opacity=".6"/></g>`)
        + `<path fill="#4a8a30" d="M-160 900V850q260 -40 560 -10t620 -20q360 -20 740 20V900z"/>`
        + `<g class="x-ussway" style="--ad:4.5s;transform-box:view-box;transform-origin:800px 900px" fill="none" stroke="#2f6a26" stroke-width="3.5" stroke-linecap="round">` + (() => { const q = rnd(3); let t = ''; for (let i = 0; i < 70; i++) { const x = R(-140 + q() * 1840), y = R(850 + q() * 60), h = 26 + q() * 40; t += `M${x} ${y}q${R(-6)} ${-R(h * 0.6)} ${R(-18 + q() * 36)} ${-R(h)}`; } return `<path d="${t}"/>`; })() + `</g>`
        + `<g fill="#f0e8cc" opacity=".9">` + (() => { const q = rnd(8); let t = ''; for (let i = 0; i < 14; i++) t += `<circle cx="${R(q() * 1600)}" cy="${R(860 + q() * 36)}" r="${(2 + q() * 2).toFixed(1)}"/>`; return t; })() + `</g>`
        + birds(33, 5, 1100, 220, '#3b4a66', 1.1, 560) + birds(34, 3, 380, 250, '#3b4a66', 0.9, 480)
        + finish(0.3);
    } });

  /* ---------- South Dakota: Mount Rushmore in the morning light ---------- */
  usSceneAdd({ key: 'state:SD', label: 'Mount Rushmore in the morning light', site: 'Mount Rushmore', colour: 'slate', mood: 'proud', season: 'any', tags: ['mountain', 'monument', 'black hills', 'eagle'],
    svg: () => {
      const sky = U(), wall = U(), cast = U();
      const head = (x, y, s, kind) => {
        const w = (v) => R(v * s);
        const lit = '#dccfb8', mid = '#bfb29b', dk = '#6f6557';
        let o = `<g transform="translate(${x} ${y})"><path fill="#c2b59e" opacity=".45" d="M${w(-78)} ${w(260)}Q${w(-70)} ${w(150)} ${w(-30)} ${w(130)}H${w(30)}Q${w(70)} ${w(150)} ${w(78)} ${w(260)}z"/><path fill="#7d7364" opacity=".25" d="M${w(10)} ${w(130)}H${w(30)}Q${w(70)} ${w(150)} ${w(78)} ${w(260)}H${w(40)}z"/>`;
        o += `<path fill="${mid}" d="M${w(-44)} ${w(150)}Q${w(-62)} ${w(60)} ${w(-52)} ${w(10)}Q${w(-46)} ${w(-52)} 0 ${w(-62)}Q${w(46)} ${w(-52)} ${w(52)} ${w(10)}Q${w(60)} ${w(60)} ${w(44)} ${w(150)}z"/>`;
        o += `<path fill="${lit}" d="M${w(-44)} ${w(150)}Q${w(-62)} ${w(60)} ${w(-52)} ${w(10)}Q${w(-46)} ${w(-52)} 0 ${w(-62)}Q${w(-8)} ${w(40)} ${w(-6)} ${w(150)}z"/>`;
        o += `<path fill="${dk}" opacity=".55" d="M${w(14)} ${w(-58)}Q${w(48)} ${w(-44)} ${w(52)} ${w(10)}Q${w(60)} ${w(60)} ${w(44)} ${w(150)}H${w(20)}Q${w(34)} ${w(60)} ${w(30)} ${w(10)}Q${w(26)} ${w(-30)} ${w(14)} ${w(-58)}z"/>`;
        o += `<path fill="${dk}" opacity=".7" d="M${w(-36)} ${w(-6)}q${w(18)} ${w(-12)} ${w(32)} 0q${w(-16)} ${w(8)} ${w(-32)} 0zM${w(8)} ${w(-6)}q${w(18)} ${w(-12)} ${w(32)} 0q${w(-16)} ${w(8)} ${w(-32)} 0z"/>`;
        o += `<path fill="${dk}" opacity=".55" d="M${w(-4)} ${w(0)}l${w(-8)} ${w(40)}l${w(18)} ${w(4)}z"/><path fill="none" stroke="${dk}" stroke-width="${w(3)}" opacity=".7" d="M${w(-20)} ${w(70)}q${w(18)} ${w(8)} ${w(40)} 0"/>`;
        if (kind === 'g') o += `<path fill="${dk}" opacity=".5" d="M${w(-52)} ${w(10)}Q${w(-56)} ${w(-52)} 0 ${w(-66)}Q${w(56)} ${w(-52)} ${w(52)} ${w(10)}Q${w(40)} ${w(-30)} 0 ${w(-34)}Q${w(-40)} ${w(-30)} ${w(-52)} ${w(10)}z"/>`;
        if (kind === 'j') o += `<path fill="${dk}" opacity=".45" d="M${w(-50)} ${w(20)}Q${w(-56)} ${w(-50)} 0 ${w(-66)}Q${w(56)} ${w(-50)} ${w(50)} ${w(20)}Q${w(46)} ${w(-28)} 0 ${w(-34)}Q${w(-44)} ${w(-28)} ${w(-50)} ${w(20)}z"/>`;
        if (kind === 'r') o += `<g fill="none" stroke="${dk}" stroke-width="${w(3)}" opacity=".85"><circle cx="${w(-20)}" cy="${w(-6)}" r="${w(11)}"/><circle cx="${w(24)}" cy="${w(-6)}" r="${w(11)}"/><path d="M${w(-9)} ${w(-6)}h${w(22)}"/></g><path fill="${dk}" opacity=".6" d="M${w(-26)} ${w(64)}q${w(26)} ${w(-10)} ${w(52)} 0q${w(-26)} ${w(12)} ${w(-52)} 0z"/>`;
        if (kind === 'l') o += `<path fill="${dk}" opacity=".6" d="M${w(-46)} ${w(40)}Q${w(-50)} ${w(130)} ${w(-6)} ${w(168)}Q${w(40)} ${w(130)} ${w(46)} ${w(40)}Q${w(24)} ${w(72)} 0 ${w(76)}Q${w(-24)} ${w(72)} ${w(-46)} ${w(40)}z"/>`;
        return o + '</g>';
      };
      let cracks = '';
      const r = rnd(12);
      for (let i = 0; i < 26; i++) { const x = R(450 + r() * 700), y = R(250 + r() * 380); cracks += `M${x} ${y}l${R(r() * 14 - 7)} ${R(30 + r() * 70)}`; }
      return `<defs>${lin(sky, [[0, '#3b7fc9'], [0.5, '#8cc0ea'], [0.85, '#f6e7c4'], [1, '#fbe2b0']])}${linU(wall, [[0, '#d5c9b4'], [0.5, '#a89c88'], [1, '#6e6659']], 420, 220, 1180, 700)}${lin(cast, [[0, '#2a3a3a', 0], [1, '#1b2a2a', 0.6]])}</defs>`
        + full(`url(#${sky})`) + stars(41, 40, 240)
        + sun(240, 280, 38, '#fffbe6', '#ffe8a8', true) + rays(240, 280, 800, '#fff4c8', 0.2)
        + cloud(1280, 150, 1.0, '#d3e0ee', 0.95, 62, 4) + cloud(300, 120, 0.8, '#d9e6f2', 0.92, 70, 18) + cloud(1000, 320, 0.5, '#e2ecf6', 0.9, 80, 30) + streak(700, 70, 280, '#fff', 0.4, 90)
        + mv('uspar', { ad: '100s', dx: '26px' }, ridge('#7d97a0', 520, 70, 9, 21) + ridge('#5f7d78', 580, 60, 8, 22))
        + `<path fill="url(#${wall})" d="M380 700L420 520L440 430L470 330L520 262L600 214L700 186L800 198L900 182L1000 214L1066 252L1104 332L1150 450L1220 700z"/>`
        + `<path fill="#6e6659" opacity=".4" d="M1000 214L1066 252L1104 332L1150 450L1220 700H1060L1070 450L1040 330z"/>`
        + `<path fill="#efe3c8" opacity=".35" d="M470 330L520 262L600 214L700 186L690 230L600 270L540 330L500 480L440 430z"/>`
        + `<path fill="#9a8f7c" d="M300 760q120 -80 240 -110H1080q140 30 260 110z"/>`
        + `<path fill="none" stroke="#6e6659" stroke-width="2.4" opacity=".5" d="${cracks}"/>`
        + head(596, 306, 0.95, 'g') + head(726, 322, 0.88, 'j') + head(860, 314, 0.95, 'r') + head(996, 316, 1.0, 'l')
        + `<path fill="#6e6659" opacity=".35" d="M470 470q130 40 250 30q120 10 230 -10q110 -10 190 20l-10 130H440z"/>`
        + `<path fill="#4c5a40" opacity=".6" d="M400 660q200 -50 420 -40t380 40V740H400z"/>`
        + mv('usdrift', { ad: '60s', dx: '50px' }, haze(600, 110, '#f4efe6', 0.7))
        + mv('uspar', { ad: '40s', dx: '30px' }, spires(81, 700, 120, '#2f4a38', 20, 780) + spires(82, 730, 150, '#243d2e', 26, 800))
        + `<g opacity=".95">` + pines(91, -150, 330, 800, 340, '#1b3326', 62, 100) + pines(92, 1240, 1760, 800, 360, '#1b3326', 66, 104) + `</g>`
        + `<path fill="#1f3a2a" d="M-160 900V810q300 -40 600 -10t560 -4q300 -20 760 20V900z"/>`
        + `<path fill="#142a1e" d="M-160 900V850q300 -30 600 0t560 -6q300 -20 760 6V900z"/>` + pines(93, -120, 1700, 880, 150, '#102418', 120, 52)
        + mv('usglide', { ad: '34s', dx: '1100px', dy: '-60px' }, mv('ussway2', { ad: '3s', to: '800px 220px' }, `<g transform="translate(800 200)" fill="#2a2018"><path d="M-110 -6Q-60 -34 -20 -10L-8 -8L0 -2L10 -8L24 -10Q64 -34 110 -6Q60 -8 30 8L12 8L6 14H-6L-12 8H-30Q-60 -8 -110 -6z"/><path fill="#f2efe6" d="M-6 -4Q0 -10 6 -4L5 6H-5z"/><path fill="#e0a82a" d="M-10 2l-4 4l8 0z"/></g>`))
        + birds(61, 4, 1100, 250, '#3b4a66', 1.0, 520)
        + finish(0.34);
    } });

  /* ---------- Wisconsin: a Door County lighthouse at dusk ---------- */
  usSceneAdd({ key: 'state:WI', label: 'A Door County lighthouse at dusk', site: 'A Door County lighthouse', colour: 'red', mood: 'calm', season: ['autumn'], tags: ['lighthouse', 'lake', 'autumn', 'door county'],
    svg: () => {
      const sky = U(), sea = U(), tw = U(), bm = U(), s5 = U();
      const LX = 800, LY = 700;
      let rocks = '';
      const r = rnd(19);
      for (let i = 0; i < 16; i++) rocks += `<ellipse cx="${R(560 + r() * 460)}" cy="${R(716 + r() * 24)}" rx="${R(24 + r() * 40)}" ry="${R(10 + r() * 12)}" fill="${i % 3 ? '#6b6258' : '#857a6c'}"/>`;
      return `<defs>${lin(sky, [[0, '#1f2d63'], [0.35, '#5d4c93'], [0.62, '#d9758a'], [0.82, '#ffb06a'], [1, '#ffd68a']])}${lin(sea, [[0, '#f3a56e'], [0.1, '#5a6aa0'], [1, '#14284f']])}${linU(tw, [[0, '#cfc7b8'], [0.45, '#fbf6ea'], [1, '#b9b09f']], 735, 0, 865, 0)}${linU(bm, [[0, '#fff3b0', 0.95], [1, '#fff3b0', 0]], LX, 400, LX + 760, 400)}</defs>`
        + full(`url(#${sky})`) + stars(51, 90, 330)
        + sun(1180, 590, 52, '#ffe9b0', '#ff9a52', false)
        + streak(1180, 560, 300, '#ffc48a', 0.5, 80) + streak(420, 440, 280, '#f08a8a', 0.5, 90) + streak(700, 300, 260, '#b57ab0', 0.5, 100) + streak(1300, 330, 240, '#d98aa0', 0.45, 90)
        + cloud(300, 220, 0.9, '#6a4f8d', 0.85, 66, 6, '#e08aa0') + cloud(1300, 190, 0.8, '#7a5a95', 0.85, 74, 18, '#f09aa0') + cloud(900, 120, 0.6, '#4e4a8d', 0.8, 80, 30, '#c07aa4')
        + mv('uspar', { ad: '120s', dx: '24px' }, `<path fill="#43457a" d="M-160 596V570q100 -20 220 -4q180 -18 340 6t340 -8q200 -16 360 4t380 -6V596z" opacity=".8"/>`)
        + `<rect y="590" width="1600" height="310" fill="url(#${sea})"/>`
        + `<path fill="#ffc07a" opacity=".16" d="M1060 592h240l200 308h-640z"/>` + shimmer(71, 30, 1000, 1500, 600, 890, '#ffd6a0', 50) + shimmer(72, 30, 0, 1600, 610, 890, '#7f90c8', 56)
        /* far shore trees in autumn colour */
        + mv('uspar', { ad: '70s', dx: '30px' }, canopy('#a64a2e', 600, 18, 3, -160, 480, 640) + canopy('#d98a2a', 604, 14, 4, -160, 400, 640) + canopy('#8a3a2a', 600, 16, 5, 1160, 1760, 640) + canopy('#c9792a', 604, 14, 6, 1260, 1760, 640))
        /* the beam: two soft wedges that pulse in turn */
        + mv('usglow', { ad: '4s' }, `<path fill="url(#${bm})" d="M${LX} 410L${LX + 820} 330L${LX + 820} 470z"/>`) + mv('usglow', { ad: '4s', d: '-2s' }, `<path fill="url(#${bm})" transform="translate(1600 0) scale(-1 1)" d="M${LX} 410L${LX + 820} 330L${LX + 820} 470z"/>`)
        /* keeper's house and the island */
        + `<path fill="#4a4251" d="M460 760q40 -50 180 -52t300 -4q120 6 190 56q40 20 40 50H420z"/>` + rocks
        + `<path fill="#6d6458" d="M440 790q200 -40 440 -36t290 40l20 20H430z"/>`
        + `<g transform="translate(500 700)"><path fill="#f3ece0" d="M0 0V-70H130V0z"/><path fill="#8e2e2a" d="M-12 -70L65 -118L142 -70z"/><path fill="#d9cfbd" d="M130 0V-70H142V0z"/><rect fill="#7a4a30" x="56" y="-34" width="18" height="34"/>` + lit(14, -52, 18, 22) + lit(98, -52, 18, 22) + `<rect fill="#8e2e2a" x="104" y="-132" width="14" height="40"/>` + puffs(111, -134, 4, '#d8d0e0', 10, 40, 6, -70, 3.4) + `</g>`
        + `<path fill="#e4dccd" d="M${LX - 60} ${LY}L${LX - 36} ${LY - 330}H${LX + 36}L${LX + 60} ${LY}z"/>` + `<path fill="url(#${tw})" d="M${LX - 60} ${LY}L${LX - 36} ${LY - 330}H${LX + 36}L${LX + 60} ${LY}z"/>`
        + `<path fill="#a99f8e" opacity=".5" d="M${LX + 22} ${LY - 330}H${LX + 36}L${LX + 60} ${LY}H${LX + 36}z"/>`
        + `<rect fill="#2a2830" x="${LX - 44}" y="${LY - 218}" width="12" height="22" rx="6"/>` + lit(LX - 6, LY - 252, 12, 22) + lit(LX - 6, LY - 160, 12, 22) + `<rect fill="#2a2830" x="${LX - 6}" y="${LY - 218}" width="12" height="22" rx="6" opacity="0"/>`
        + `<rect fill="#2a2830" x="${LX - 48}" y="${LY - 342}" width="96" height="14" rx="3"/><path fill="#2a2830" d="M${LX - 40} ${LY - 342}h80v-4h-80z"/>`
        + `<path fill="#2e2a38" d="M${LX - 34} ${LY - 342}V${LY - 400}H${LX + 34}V${LY - 342}z"/>`
        + `<rect class="us-lit" x="${LX - 26}" y="${LY - 394}" width="52" height="46" rx="4"/>` + `<path fill="#fff3c0" opacity=".85" d="M${LX - 22} ${LY - 390}h44v38h-44z"/>`
        + `<path stroke="#2e2a38" stroke-width="3" d="M${LX - 8} ${LY - 392}v42M${LX + 8} ${LY - 392}v42"/>`
        + mv('usflicker', { ad: '0.9s', to: `${LX}px ${LY - 370}px` }, `<circle cx="${LX}" cy="${LY - 372}" r="18" fill="#fff3b0" opacity=".9"/>`)
        + `<path fill="#e03a2a" d="M${LX - 40} ${LY - 400}Q${LX} ${LY - 450} ${LX + 40} ${LY - 400}z"/><rect fill="#2e2a38" x="${LX - 2}" y="${LY - 468}" width="4" height="22"/>`
        + `<path fill="#6d6458" d="M${LX - 90} ${LY + 4}h180l20 44h-220z"/>`
        + `<path fill="#5a5148" d="M900 790q200 -10 380 20t480 24V900H900z" opacity="0"/>`
        /* foreground: rocks and autumn maples */
        + `<path fill="#1f2a3d" d="M-160 900V800q220 -30 420 10t240 90z"/><path fill="#1f2a3d" d="M1160 900q60 -80 240 -96t360 12V900z"/>`
        + mv('uspar', { ad: '30s', dx: '30px' }, canopy('#7a2e1e', 800, 70, 7, -160, 380, 900) + canopy('#b8561f', 820, 50, 8, -160, 300, 900) + canopy('#cf8a2a', 760, 40, 9, -160, 180, 900) + canopy('#8a2e22', 810, 70, 10, 1240, 1760, 900) + canopy('#c9662a', 830, 50, 11, 1340, 1760, 900) + canopy('#d9a03a', 790, 40, 12, 1500, 1760, 900))
        + `<g fill="#cf5a22">` + mv('usfall', { ad: '11s', dx: '70px' }, `<path d="M180 300q10 -10 22 0q-10 14 -22 0z"/>`) + mv('usfall', { ad: '14s', d: '-5s', dx: '-60px' }, `<path d="M420 260q10 -10 22 0q-10 14 -22 0z" fill="#d98a2a"/>`) + mv('usfall', { ad: '12s', d: '-8s', dx: '90px' }, `<path d="M1400 280q10 -10 22 0q-10 14 -22 0z" fill="#b8361f"/>`) + `</g>`
        + `<path fill="#142239" d="M-160 900V870q300 -20 620 0t620 -8q320 -14 720 8V900z"/>`
        + dots('M-100 880Q300 860 700 880T1700 872', '#ffd98a', 4, 80, 'us-lamps')
        + birds(81, 5, 650, 330, '#2e2a50', 1.2, 560) + birds(82, 3, 1200, 440, '#3a2f5a', 0.9, 400)
        + finish(0.3);
    } });

  /* ---------- Chicago: the skyline over the river and the L ---------- */
  usSceneAdd({ key: 'place:chicago', label: 'The skyline and the L', site: 'The Chicago skyline and the L', colour: 'blue', mood: 'energetic', season: 'any', tags: ['skyline', 'train', 'river', 'skyscraper'],
    svg: () => {
      const sky = U(), wat = U(), gl = U(), tr = U();
      const BY = 640;
      const r = rnd(5);
      let far = '', mid = '';
      for (let x = -150; x < 1760; x += 30 + r() * 30) { const h = 60 + r() * 150; far += `<rect x="${R(x)}" y="${R(BY - h)}" width="${R(18 + r() * 30)}" height="${R(h + 4)}"/>`; }
      for (let x = -150; x < 1760; x += 50 + r() * 40) { if (x > 460 && x < 1130) continue; const h = 90 + r() * 190, w = 36 + r() * 40; mid += `<rect x="${R(x)}" y="${R(BY - h)}" width="${R(w)}" height="${R(h + 4)}"/>`; if (r() > 0.45) mid += `<rect x="${R(x + w / 2 - 2)}" y="${R(BY - h - 24)}" width="4" height="26"/>`; }
      let wins = '';
      const rw = rnd(9);
      for (let i = 0; i < 36; i++) { const x = R(-140 + rw() * 1840); if (x > 460 && x < 1130) continue; wins += lit(x, R(BY - 40 - rw() * 150), 5, 7); }
      const tubes = [[610, 300], [638, 232], [666, 150], [694, 150], [722, 262], [750, 330]];
      let will = '', wv = '';
      tubes.forEach(([x, y]) => { will += `<rect x="${x}" y="${y}" width="29" height="${BY - y + 4}"/>`; for (let k = 0; k < 4; k++) wv += `<path d="M${x + 5 + k * 6} ${y + 6}V${BY}"/>`; });
      let hn = '';
      for (let k = 0; k < 6; k++) { const y0 = 640 - k * 78, y1 = y0 - 78, w0 = 52 - k * 3.2, w1 = 52 - (k + 1) * 3.2; hn += `M${R(960 - w0)} ${R(y0)}L${R(960 + w1)} ${R(y1)}M${R(960 + w0)} ${R(y0)}L${R(960 - w1)} ${R(y1)}`; }
      let sail = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><path fill="#fff" d="M0 -64L0 -4L34 -4z"/><path fill="${c}" d="M-4 -56L-4 -4L-30 -4z"/><path fill="#2a3b55" d="M-34 0H40L28 12H-24z"/></g>`;
      let girder = '';
      for (let x = -170; x < 1780; x += 52) girder += `M${x} 806l26 -34l26 34`;
      let cols = '';
      for (let x = -120; x < 1760; x += 300) cols += `<rect x="${x}" y="806" width="22" height="100"/>`;
      const car = (x) => { let w = ''; for (let i = 0; i < 7; i++) w += lit(x + 14 + i * 29, 735, 20, 20); return `<rect fill="url(#${tr})" x="${x}" y="722" width="224" height="48" rx="9"/><rect fill="#2f6cc4" x="${x}" y="760" width="224" height="6"/><rect fill="#7fa6cc" x="${x + 8}" y="730" width="208" height="30" rx="5"/>` + w + `<rect fill="#4a5568" x="${x + 90}" y="716" width="44" height="8" rx="2"/>`; };
      return `<defs>${lin(sky, [[0, '#2f7ad0'], [0.5, '#7fbcee'], [0.85, '#dff0fa'], [1, '#f6f6e6']])}${lin(wat, [[0, '#a9cfe6'], [0.2, '#4f93c2'], [1, '#1c4d86']])}${lin(gl, [[0, '#2b3445'], [1, '#141a28']])}${lin(tr, [[0, '#f4f6fa'], [1, '#aeb8c8']])}</defs>`
        + full(`url(#${sky})`) + stars(61, 50, 260)
        + sun(300, 250, 40, '#fffbe8', '#fff0b8', true) + rays(300, 250, 800, '#ffffff', 0.18)
        + cloud(1240, 150, 1.0, '#cfe1f1', 0.95, 60, 4) + cloud(640, 110, 0.75, '#d9e8f5', 0.92, 70, 20) + cloud(1480, 330, 0.55, '#e0ecf7', 0.9, 80, 40) + streak(400, 380, 280, '#fff', 0.5, 90) + streak(1000, 60, 300, '#fff', 0.35, 100)
        + mv('uspar', { ad: '120s', dx: '24px' }, `<g fill="#9fb9d4">${far}</g>`) + haze(500, 140, '#e8f2fa', 0.5)
        + mv('uspar', { ad: '80s', dx: '18px' }, `<g fill="#5f7ba0">${mid}</g>`)
        + `<g fill="#46597a">${wins.replace(/class="us-lit"/g, 'class="us-lit"')}</g>`
        /* Aon, Willis, Trump, Hancock */
        + `<rect fill="#e9eef4" x="510" y="228" width="72" height="416"/><path fill="#c3ccd8" d="M560 228h22v416h-22z"/><path fill="none" stroke="#9fb0c6" stroke-width="1.6" d="${(() => { let t = ''; for (let k = 0; k < 14; k++) t += `M510 ${250 + k * 28}H582`; return t; })()}"/>`
        + `<g fill="#1d2432">${will}</g><g stroke="#4a5568" stroke-width="2" fill="none" opacity=".8">${wv}</g><path stroke="#1d2432" stroke-width="4" d="M${666 + 8} 150V90M${694 + 20} 150V76"/>`
        + `<g class="x-usflicker" style="--ad:1.4s;transform-box:fill-box;transform-origin:center"><circle cx="${674}" cy="88" r="4" fill="#ff4a3a"/><circle cx="${714}" cy="74" r="4" fill="#ff4a3a"/></g>`
        + `<path fill="#c9d3df" d="M800 640V380h26V330h24V280h30V240h22V640z"/><path fill="#a9b6c6" d="M846 640V280h30V240h22V640z" opacity=".6"/>`
        + `<path fill="#171d2a" d="M908 640L924 188H996L1012 640z"/><path fill="#303a50" d="M978 190H996L1012 640H990z" opacity=".6"/><path fill="none" stroke="#e8eef6" stroke-width="3" opacity=".75" d="${hn}"/><path stroke="#171d2a" stroke-width="4" d="M938 188V120M980 188V108"/>`
        + `<g class="x-usflicker" style="--ad:1.1s;transform-box:fill-box;transform-origin:center"><circle cx="938" cy="118" r="4" fill="#ff4a3a"/><circle cx="980" cy="106" r="4" fill="#ff4a3a"/></g>`
        + `<g fill="#6a7f9c" opacity=".9"><rect x="1040" y="330" width="90" height="314"/><rect x="1150" y="400" width="70" height="244"/><rect x="1240" y="360" width="64" height="284"/></g>` + lit(1060, 360, 8, 12) + lit(1086, 420, 8, 12) + lit(1170, 440, 8, 12) + lit(1260, 400, 8, 12) + lit(540, 300, 8, 12) + lit(620, 330, 8, 12) + lit(960, 300, 8, 12)
        /* the Ferris wheel on the pier */
        + `<g transform="translate(1420 560)"><path fill="none" stroke="#7c8aa3" stroke-width="6" d="M-30 80L0 0L30 80"/><g class="x-usspin" style="--ad:60s;transform-box:fill-box;transform-origin:center"><circle r="78" fill="none" stroke="#e7edf5" stroke-width="5"/><circle r="46" fill="none" stroke="#e7edf5" stroke-width="2.4"/><path stroke="#e7edf5" stroke-width="2" d="${(() => { let t = ''; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 8; t += `M${R(Math.cos(a) * 78)} ${R(Math.sin(a) * 78)}L${R(-Math.cos(a) * 78)} ${R(-Math.sin(a) * 78)}`; } return t; })()}"/>${(() => { let c = ''; const cs = ['#e0523a', '#f0b03a', '#3a9ae0', '#5ac07a']; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; c += `<circle cx="${R(Math.cos(a) * 78)}" cy="${R(Math.sin(a) * 78)}" r="6" fill="${cs[k % 4]}"/>`; } return c; })()}</g></g>`
        + `<path fill="#5c7a4a" d="M-160 640q300 -14 640 -4t640 0t640 -6V660H-160z"/>`
        /* the river */
        + `<rect y="640" width="1600" height="170" fill="url(#${wat})"/>`
        + shimmer(71, 24, 0, 1600, 650, 800, '#ffffff', 56) + shimmer(72, 10, 300, 800, 650, 800, '#cfe8fa', 60)
        + mv('usmove', { ad: '70s', dx: '900px' }, sail(500, 706, 1.1, '#e0523a') + sail(700, 690, 0.8, '#f0b03a'))
        + mv('usmove', { ad: '90s', dx: '-700px' }, `<g transform="translate(1100 716)"><path fill="#f4f6fa" d="M-70 0H80L66 -22H-40z"/><rect fill="#2f6cc4" x="-50" y="-34" width="80" height="14"/><rect fill="#f4f6fa" x="-30" y="-48" width="40" height="16"/><path fill="#1f3a63" d="M-76 0H84l-12 14H-64z"/></g><path fill="none" stroke="#fff" stroke-width="3" opacity=".6" d="M1180 730q100 6 200 0"/>`)
        /* the L: elevated truss and a train crossing */
        + `<path fill="#3b4558" d="M-160 806H1760v-12H-160z"/><path fill="url(#${gl})" d="M-160 806H1760v12H-160z"/><path fill="none" stroke="#2b3445" stroke-width="5" d="${girder}"/>`
        + `<path fill="#1a2030" d="M-160 794H1760v-10H-160z"/><path fill="none" stroke="#8a95a8" stroke-width="3" d="M-160 786H1760"/>`
        + mv('usmove', { ad: '16s', dx: '2400px' }, car(300) + car(528) + car(756) + `<rect fill="#2b3445" x="524" y="744" width="6" height="14"/><rect fill="#2b3445" x="752" y="744" width="6" height="14"/>`)
        + `<rect y="818" width="1600" height="82" fill="#1c4d86"/>` + shimmer(73, 8, 0, 1600, 830, 890, '#9cc4e8', 60) + `<g fill="#2b3445">${cols}</g>`
        + birds(33, 7, 800, 120, '#33415f', 1.2, 700) + birds(34, 3, 1280, 270, '#33415f', 0.9, 480)
        + finish(0.34);
    } });

  /* ---------- Indianapolis: Monument Circle at dusk ---------- */
  usSceneAdd({ key: 'place:indianapolis', label: 'Monument Circle at dusk', site: 'Monument Circle', colour: 'indigo', mood: 'cosy', season: ['autumn'], tags: ['monument', 'fountain', 'circle', 'dusk'],
    svg: () => {
      const sky = U(), st = U(), road = U(), gl = U();
      const r = rnd(27);
      let bld = '', bw = '';
      const cols = ['#b98a62', '#a8705a', '#c7a47c', '#8f6a58', '#d1b48e', '#9a7a62'];
      let x = -150, i = 0;
      while (x < 1760) { const w = 90 + r() * 80, h = 130 + r() * 190; if (x > 560 && x < 1010) { x += w; continue; } bld += `<rect fill="${cols[i % 6]}" x="${R(x)}" y="${R(700 - h)}" width="${R(w)}" height="${R(h + 4)}"/><rect fill="#6a4a3c" x="${R(x - 3)}" y="${R(700 - h - 8)}" width="${R(w + 6)}" height="9"/>`;
        for (let k = 0; k < Math.floor(w / 26); k++) for (let j = 0; j < Math.floor(h / 40); j++) if (r() > 0.55) bw += lit(R(x + 10 + k * 26), R(700 - h + 18 + j * 40), 12, 20);
        x += w; i++; }
      let flute = '';
      for (let k = 0; k < 7; k++) flute += `M${R(783 + k * 6)} 285V500`;
      const jet = (cx, s) => { let o = ''; for (let k = 0; k < 6; k++) o += `<circle class="x-uspuff" style="--ad:2.2s;--d:-${(k * 0.37).toFixed(2)}s;--dx:${(k % 2 ? 1 : -1) * (14 + k * 5)}px;--dy:${-96 - k * 8}px;--sc:.8" cx="${cx}" cy="718" r="${9 * s}" fill="#e6f2fb"/>`; return o; };
      let lamp = (x, y) => `<rect fill="#2a2430" x="${x - 2}" y="${y}" width="4" height="${770 - y}"/><circle class="us-lit" cx="${x}" cy="${y - 4}" r="8"/><circle cx="${x}" cy="${y - 4}" r="8" fill="#fff6d0" opacity=".9"/>`;
      return `<defs>${lin(sky, [[0, '#32408a'], [0.35, '#7a63a8'], [0.62, '#e58a86'], [0.82, '#ffb36e'], [1, '#ffd48a']])}${linU(st, [[0, '#f7f0df'], [0.5, '#e6dcc6'], [1, '#bfb298']], 735, 0, 865, 0)}${lin(road, [[0, '#4a4658'], [1, '#2a2834']])}${radU(gl, [[0, '#ffe3a0', 0.7], [1, '#ffe3a0', 0]], 800, 450, 460)}</defs>`
        + full(`url(#${sky})`) + stars(71, 80, 300)
        + `<circle cx="1220" cy="190" r="30" fill="#fdf3d8"/><circle cx="1234" cy="182" r="30" fill="#7a63a8" opacity=".0"/>`
        + streak(260, 380, 280, '#ffc48a', 0.5, 80) + streak(1240, 420, 260, '#ffb27a', 0.5, 90) + streak(700, 260, 240, '#d098b0', 0.45, 100)
        + cloud(300, 200, 0.8, '#7a5a98', 0.85, 66, 8, '#e48a9a') + cloud(1340, 280, 0.8, '#8a5a90', 0.85, 74, 20, '#f09a90') + cloud(800, 120, 0.55, '#5a5a9a', 0.8, 80, 30, '#c27aa4')
        + `<g>${bld}</g><g>${bw}</g>`
        /* a checkered banner on the tallest roof */
        + `<g transform="translate(250 360)"><rect x="-2" y="-80" width="4" height="100" fill="#2a2430"/><g class="x-usflag" style="--ad:1.5s;transform-box:fill-box;transform-origin:left center"><path fill="#fff" d="M2 -78h70v40H2z"/><path fill="#1c1c24" d="${(() => { let p = ''; for (let a = 0; a < 7; a++) for (let b = 0; b < 4; b++) if ((a + b) % 2 === 0) p += `M${2 + a * 10} ${-78 + b * 10}h10v10h-10z`; return p; })()}"/></g></g>`
        + `<circle cx="800" cy="450" r="460" fill="url(#${gl})"/>`
        /* the circle, street and plaza */
        + `<ellipse cx="800" cy="760" rx="780" ry="122" fill="url(#${road})"/><ellipse cx="800" cy="738" rx="560" ry="70" fill="#c9bba0"/><ellipse cx="800" cy="738" rx="560" ry="70" fill="none" stroke="#8a7a62" stroke-width="3"/>`
        + `<path fill="#d8ccb6" d="M${600} 706H1000L1030 740H570z"/>`
        /* the Soldiers' and Sailors' Monument */
        + `<path fill="#cfc4b0" d="M628 720H972L944 696H656z"/><path fill="#e0d6c2" d="M656 696H944L918 674H682z"/><path fill="#ece3d0" d="M690 674H910V640H690z"/><path fill="#c9bea8" d="M690 640H910l-8 -14H698z"/>`
        + `<path fill="url(#${st})" d="M718 626V520L742 500H858L882 520V626z"/>`
        + `<path fill="url(#${st})" d="M756 500L770 290H830L844 500z"/><path fill="none" stroke="#b8ac96" stroke-width="2" d="${flute}"/><path fill="none" stroke="#a79a82" stroke-width="3" d="M752 440H848M758 380H842M764 330H836"/>`
        + `<path fill="#cfc4b0" d="M752 290H848L840 270H760z"/><path fill="url(#${st})" d="M766 270V232H834V270z"/><path fill="#a79a82" d="M766 232H834L826 220H774z"/>`
        + `<path fill="#d9c7a0" d="M786 220H814V200L800 190L786 200z"/>`
        + `<g fill="#cdb26a"><path d="M790 200Q800 168 810 200L816 214H784z"/><path d="M790 190L772 166L798 180z"/><path d="M810 190L830 164L802 180z"/><rect x="798" y="150" width="4" height="26" rx="2"/></g>` + mv('usglow', { ad: '2.4s' }, `<circle cx="800" cy="146" r="14" fill="#ffd88a" opacity=".7"/>`)
        + `<g fill="#bfb298"><path d="M700 640V560l14 -10V640z"/><path d="M900 640V560l-14 -10V640z"/><path d="M700 600l-20 20V640h20zM900 600l20 20V640h-20z"/></g>`
        + lit(780, 560, 8, 40) + lit(812, 560, 8, 40) + lit(790, 340, 6, 24) + lit(806, 340, 6, 24)
        + dots('M718 626Q800 600 882 626', '#ffe08a', 4, 22, 'us-lamps') + dots('M756 500Q800 486 844 500', '#ffe08a', 4, 18, 'us-lamps')
        /* fountains */
        + `<ellipse cx="590" cy="724" rx="62" ry="16" fill="#cfc4b0"/><ellipse cx="590" cy="722" rx="52" ry="12" fill="#7ab0d0"/>` + jet(590, 1)
        + `<ellipse cx="1010" cy="724" rx="62" ry="16" fill="#cfc4b0"/><ellipse cx="1010" cy="722" rx="52" ry="12" fill="#7ab0d0"/>` + jet(1010, 1)
        + shimmer(5, 8, 540, 640, 716, 730, '#ffffff', 20) + shimmer(6, 8, 960, 1060, 716, 730, '#ffffff', 20)
        /* string lights across the street, lamps, trees in autumn */
        + dots('M-120 380Q400 470 800 400T1720 380', '#ffd98a', 4, 40, 'us-lamps')
        + lamp(420, 700) + lamp(1180, 700) + lamp(250, 760) + lamp(1350, 760)
        + mv('uspar', { ad: '36s', dx: '28px' }, canopy('#b8561f', 760, 70, 3, -160, 220, 800) + canopy('#cf8a2a', 770, 56, 4, 40, 340, 800) + canopy('#8a2e22', 760, 70, 5, 1280, 1760, 800) + canopy('#d9a03a', 780, 50, 6, 1160, 1500, 800))
        + `<path fill="#241c2c" d="M-160 900V840q400 -34 960 -20t960 -10V900z"/>`
        + `<g>` + mv('usfall', { ad: '11s', dx: '70px' }, `<path d="M300 330q10 -10 22 0q-10 14 -22 0z" fill="#d98a2a"/>`) + mv('usfall', { ad: '13s', d: '-5s', dx: '-60px' }, `<path d="M1100 300q10 -10 22 0q-10 14 -22 0z" fill="#cf5a22"/>`) + mv('usfall', { ad: '12s', d: '-8s', dx: '90px' }, `<path d="M640 360q10 -10 22 0q-10 14 -22 0z" fill="#b8361f"/>`) + `</g>`
        + birds(44, 5, 760, 160, '#2e2a50', 1.2, 560)
        + finish(0.3);
    } });

  /* ---------- Cleveland: the glass pyramid on Lake Erie at dusk ---------- */
  usSceneAdd({ key: 'place:cleveland', label: 'The glass pyramid on Lake Erie', site: 'The Rock Hall on Lake Erie', colour: 'pink', mood: 'energetic', season: 'any', tags: ['music', 'lake', 'museum', 'pyramid', 'skyline'],
    svg: () => {
      const sky = U(), lake = U(), fl = U(), fr = U(), bm = U();
      const A = [820, 232], Lc = [470, 652], Fc = [800, 742], Rc = [1160, 662];
      const lerp = (p, q, t) => [R(p[0] + (q[0] - p[0]) * t), R(p[1] + (q[1] - p[1]) * t)];
      let gl = '', gr = '';
      for (let k = 1; k < 9; k++) { const t = k / 9; let p = lerp(A, Lc, t), q = lerp(A, Fc, t); gl += `M${p[0]} ${p[1]}L${q[0]} ${q[1]}`; p = lerp(A, Fc, t); q = lerp(A, Rc, t); gr += `M${p[0]} ${p[1]}L${q[0]} ${q[1]}`; }
      for (let k = 1; k < 11; k++) { const t = k / 11; let p = lerp(Lc, Fc, t); gl += `M${A[0]} ${A[1]}L${p[0]} ${p[1]}`; p = lerp(Fc, Rc, t); gr += `M${A[0]} ${A[1]}L${p[0]} ${p[1]}`; }
      const pyr = (op) => `<g opacity="${op}"><path fill="url(#${fl})" d="M${A}L${Lc}L${Fc}z"/><path fill="url(#${fr})" d="M${A}L${Fc}L${Rc}z"/><path fill="none" stroke="#fff" stroke-width="1.6" opacity=".55" d="${gl}${gr}"/><path fill="none" stroke="#fff4ff" stroke-width="4" opacity=".7" d="M${A}L${Lc}M${A}L${Fc}M${A}L${Rc}"/></g>`;
      let tw = '';
      const r = rnd(19);
      for (let x = 1010; x < 1760; x += 36 + r() * 34) { const h = 120 + r() * 220; tw += `<rect x="${R(x)}" y="${R(660 - h)}" width="${R(30 + r() * 28)}" height="${R(h + 4)}"/>`; }
      let tw2 = '';
      for (let x = -160; x < 420; x += 34 + r() * 30) { const h = 70 + r() * 150; tw2 += `<rect x="${R(x)}" y="${R(660 - h)}" width="${R(30 + r() * 26)}" height="${R(h + 4)}"/>`; }
      const beam = (ang, col, ad, d) => mv('ussway2', { ad, d, to: '820px 232px' }, `<g transform="rotate(${ang} 820 232)"><path fill="url(#${bm})" d="M820 232L760 -400L880 -400z"/></g>`);
      return `<defs>${lin(sky, [[0, '#2a1f6b'], [0.3, '#7a2f94'], [0.55, '#d44a8a'], [0.78, '#ff8a5a'], [1, '#ffc87a']])}${lin(lake, [[0, '#ffa87a'], [0.1, '#a5498f'], [0.4, '#4a2f78'], [1, '#1b1646']])}${linU(fl, [[0, '#ffe2f2'], [0.5, '#f093c4'], [1, '#a2509a']], 470, 232, 800, 742)}${linU(fr, [[0, '#a56ad6'], [1, '#3b2a7a']], 820, 232, 1160, 742)}${linU(bm, [[0, '#ffffff', 0.5], [1, '#ffffff', 0]], 820, 232, 820, -400)}</defs>`
        + full(`url(#${sky})`) + stars(81, 100, 330)
        + sun(300, 640, 60, '#ffe9b0', '#ff9a52', false) + rays(300, 640, 900, '#ffc890', 0.2)
        + streak(1100, 250, 300, '#ff9ab0', 0.5, 80) + streak(300, 380, 280, '#ffb27a', 0.5, 90) + streak(780, 120, 280, '#b070c8', 0.45, 100) + streak(1380, 470, 240, '#ffc08a', 0.5, 85)
        + cloud(260, 190, 0.8, '#7a3a8e', 0.85, 66, 8, '#f08aa8') + cloud(1360, 150, 0.8, '#8a3a90', 0.85, 74, 20, '#ff9aa0') + cloud(800, 100, 0.5, '#4e3a8d', 0.8, 80, 30, '#c07ab0')
        /* the skyline: Terminal Tower with its stepped spire */
        + `<g fill="#6b4a8a" opacity=".85">${tw}</g><g fill="#7d548f" opacity=".8">${tw2}</g>`
        + `<g fill="#4e3a78"><path d="M1240 664V330h40V270h26V220h20V150h8v-40h4v40h8V220h20V270h26V330h40V664z"/><rect x="1196" y="470" width="44" height="194"/><rect x="1420" y="440" width="50" height="224"/></g><path fill="#3a2a62" opacity=".5" d="M1306 664V330h26V664z"/>`
        + lit(1272, 360, 8, 14) + lit(1300, 400, 8, 14) + lit(1328, 360, 8, 14) + lit(1352, 440, 8, 14) + lit(1212, 500, 8, 14) + lit(1436, 480, 8, 14) + lit(1300, 270, 8, 12)
        + `<circle cx="1314" cy="196" r="7" fill="#fff4d0" opacity=".9"/>`
        + `<rect y="650" width="1600" height="250" fill="url(#${lake})"/>`
        + `<path fill="#ffc07a" opacity=".3" d="M180 652h240l110 248H70z"/>` + shimmer(11, 26, 60, 560, 660, 890, '#ffd6a0', 50) + shimmer(12, 36, 0, 1600, 660, 890, '#c06ab0', 56)
        /* the plaza under the pyramid and the white wing */
        + `<path fill="#352a5a" d="M380 664H1260L1330 690H320z"/>`
        + `<g fill="#f4eef8"><path d="M330 600H500V672H330z"/><path d="M360 560H470V600H360z"/></g><path fill="#c9b8da" d="M330 600H500L488 612H342z"/><g fill="#8a6aa8" opacity=".5"><rect x="344" y="624" width="144" height="5"/><rect x="344" y="642" width="144" height="5"/></g>` + lit(372, 572, 20, 12) + lit(406, 572, 20, 12)
        /* the reflection */
        + `<g transform="translate(0 1484) scale(1 -1)" opacity=".26">` + pyr(1) + `</g>`
        + pyr(1)
        + mv('usglow', { ad: '3s' }, `<path fill="#fff" opacity=".35" d="M820 232L800 262L840 262z"/>`) + `<rect x="819" y="196" width="3" height="38" fill="#fff4ff"/>`
        + lit(600, 600, 14, 22) + lit(700, 650, 14, 22) + lit(900, 640, 14, 22) + lit(1000, 600, 14, 22)
        /* spotlights sweeping from the apex */
        + beam(-24, '#fff', '6s', '0s') + beam(18, '#fff', '7s', '-3s') + beam(-4, '#fff', '9s', '-5s')
        + mv('usmove', { ad: '110s', dx: '800px' }, `<g transform="translate(760 760)"><path fill="#2a1f4a" d="M-60 0H70L56 -16H-40z"/><path fill="#fff" d="M0 -60L0 -16L28 -16z"/><path fill="#e0528a" d="M-4 -52L-4 -16L-24 -16z"/></g>`)
        + `<path fill="#2a1f4a" d="M-160 900V830q200 -22 440 -4t500 6t480 -10t440 10V900z"/>`
        + dots('M-100 842Q400 826 800 838T1700 832', '#ffd98a', 4, 70, 'us-lamps')
        + `<g fill="#17113a"><rect x="130" y="760" width="5" height="90"/><rect x="1450" y="750" width="5" height="100"/></g>` + lit(116, 748, 34, 12) + lit(1436, 738, 34, 12)
        + birds(91, 6, 700, 420, '#2a1f4a', 1.3, 640) + birds(92, 4, 1250, 330, '#3a2060', 1.0, 480)
        + finish(0.32);
    } });
})();
