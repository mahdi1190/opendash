/* ============================================================
   US FULL-SCREEN SCENES, batch 7 (Mountain West, Southwest, Alaska).
   PURE classic script: it only calls usSceneAdd(). Same toolkit and layering as the Texas scenes.
     states   NV Pyramid Lake, NM White Sands, OK storm over wheat, UT Bryce hoodoos, WY Old Faithful, AK Denali
     cities   Denver, Salt Lake City, Las Vegas, Phoenix, Oklahoma City
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish, star5 } = K;

  /** A window grid: dark glass by day plus a lit set (us-lit) that glows at dusk. */
  const grid = (x, y, w, h, cw, ch, glass) => {
    let d = ''; for (let yy = y + ch / 2 + 6; yy < y + h - 4; yy += ch) d += `M${x + 6} ${R(yy)}h${w - 12}`;
    const a = cw - 4, sw = ch - 7;
    return `<path fill="none" stroke="${glass}" stroke-width="${sw}" stroke-dasharray="${a} 4" opacity=".5" d="${d}"/>`
      + `<path class="us-lit" fill="none" stroke-width="${sw}" stroke-dasharray="${a} 4 ${a} 4 ${a} ${2 * cw + 4}" d="${d}"/>`;
  };
  /** A conifer from tiered triangles. */
  const pine = (x, y, s, c1, c2) => {
    const P = [[0, -100], [18, -62], [9, -62], [30, -30], [16, -30], [44, 0]]; const L = P.map(([a, b]) => `${R(x + a * s)} ${R(y + b * s)}`);
    const Rr = P.slice(1, 5).reverse().map(([a, b]) => `${R(x - a * s)} ${R(y + b * s)}`);
    return `<path fill="${c1}" d="M${L.join('L')}L${R(x - 44 * s)} ${y}L${Rr.join('L')}z"/><path fill="${c2}" opacity=".5" d="M${x} ${R(y - 100 * s)}L${R(x + 44 * s)} ${y}H${x}z"/>`;
  };
  const saguaro = (x, y, s, c1, c2) => `<g fill="none" stroke="${c1}" stroke-linecap="round" stroke-linejoin="round"><path stroke-width="${R(36 * s)}" d="M${x} ${y}V${R(y - 290 * s)}"/>`
    + `<path stroke-width="${R(24 * s)}" d="M${x} ${R(y - 100 * s)}Q${R(x - 62 * s)} ${R(y - 100 * s)} ${R(x - 62 * s)} ${R(y - 160 * s)}V${R(y - 230 * s)}M${x} ${R(y - 150 * s)}Q${R(x + 58 * s)} ${R(y - 150 * s)} ${R(x + 58 * s)} ${R(y - 205 * s)}V${R(y - 262 * s)}"/></g>`
    + `<path fill="none" stroke="${c2}" stroke-width="${R(3 * s)}" opacity=".55" stroke-linecap="round" d="M${R(x + 7 * s)} ${R(y - 282 * s)}V${y}M${R(x - 7 * s)} ${R(y - 282 * s)}V${y}M${R(x - 62 * s)} ${R(y - 222 * s)}V${R(y - 160 * s)}M${R(x + 58 * s)} ${R(y - 254 * s)}V${R(y - 205 * s)}"/>`;

  /* ---------- Nevada: Pyramid Lake at twilight ---------- */
  const smooth = (P) => { let d = `M${R(P[0][0])} ${R(P[0][1])}`; for (let i = 1; i < P.length - 1; i++) d += `Q${R(P[i][0])} ${R(P[i][1])} ${R((P[i][0] + P[i + 1][0]) / 2)} ${R((P[i][1] + P[i + 1][1]) / 2)}`; return d + `L${R(P[P.length - 1][0])} ${R(P[P.length - 1][1])}`; };
  const tufa = (x, y, w, h, c1, c2, seed) => {
    const r = rnd(seed), n = 9, L = [], Rt = [];
    for (let i = 0; i <= n; i++) { const k = i / n, half = w * 0.5 * Math.pow(1 - k, 0.85) * (0.78 + r() * 0.44) + 5; L.push([x - half, y - h * k]); Rt.push([x + half * (0.8 + r() * 0.4), y - h * k]); }
    let nod = ''; for (let i = 0; i < 7; i++) { const k = 0.1 + r() * 0.7; nod += `<circle cx="${R(x + (r() - 0.3) * w * 0.4 * (1 - k))}" cy="${R(y - h * k)}" r="${R(5 + r() * 9)}"/>`; }
    const top = R(y - h - 8), tail = smooth(Rt.slice().reverse()).replace(/^M-?\d+ -?\d+/, '');
    return `<path fill="${c1}" d="${smooth(L)}L${R(x)} ${top}${tail}z"/><path fill="${c2}" opacity=".8" d="M${R(x)} ${top}${tail}L${R(x)} ${y}z"/><g fill="${c2}" opacity=".5">${nod}</g>`;
  };
  usSceneAdd({ key: 'state:NV', label: 'Pyramid Lake tufa at twilight', site: 'Pyramid Lake', colour: 'orange', mood: 'dreamy', season: 'any', tags: ['lake', 'tufa', 'twilight'],
    svg: () => { const s1 = U(), w1 = U(), l1 = U();
      return `<defs>${lin(s1, [[0, '#2b3a80'], [0.34, '#7a5aa6'], [0.6, '#e8847c'], [0.8, '#ffc27a'], [1, '#ffe3a2']])}${linU(w1, [[0, '#f2a67e'], [0.2, '#8a6aa8'], [0.6, '#33508a'], [1, '#1f3466']], 0, 600, 0, 900)}${radU(l1, [[0, '#ffd48a', 0.55], [1, '#ffd48a', 0]], 1050, 560, 700)}</defs>`
        + full(`url(#${s1})`) + stars(31, 40, 220) + `<circle cx="300" cy="170" r="30" fill="#fff0d0" opacity=".9"/><circle cx="314" cy="160" r="27" fill="#6a5aa2" opacity=".7"/>`
        + rays(1050, 560, 900, '#ffe0a0', 0.2) + sun(1050, 560, 54, '#fff1c4', '#ff9a56')
        + streak(380, 150, 320, '#ffb08a', 0.5) + streak(1250, 250, 280, '#ff8f80', 0.5, 70) + cloud(560, 300, 1.1, '#a8587e', 0.8, 62, 10, '#ffc2a2') + cloud(1380, 380, 0.9, '#b8607e', 0.75, 54, 32, '#ffd0a8')
        + birds(32, 4, 600, 330, '#2a2050', 1.2, 700)
        + mv('uspar', { ad: '38s', dx: '10px' }, ridge('#6d58a0', 560, 80, 9, 41, 620) + haze(500, 110, '#f0b0b0', 0.45))
        + mv('uspar', { ad: '30s', dx: '20px' }, ridge('#4a3e86', 590, 50, 8, 42, 640))
        + `<rect y="610" width="1600" height="290" fill="url(#${w1})"/>`
        + `<path fill="#ffd89a" opacity=".5" d="M1000 612h100l60 288h-220z"/>`
        + shimmer(33, 60, 880, 1220, 618, 800, '#ffe8b0', 60) + shimmer(34, 36, 0, 1600, 650, 880, '#c8b8e8', 54)
        + `<g opacity=".4" transform="translate(0 1290) scale(1 -1)">${tufa(1230, 650, 150, 200, '#3a2c52', '#3a2c52', 56)}${tufa(450, 650, 190, 260, '#3a2c52', '#3a2c52', 58)}</g>`
        + mv('usbob', { ad: '7s', dy: '3px' }, tufa(450, 660, 190, 270, '#6a5878', '#c79a8c', 58) + tufa(560, 670, 120, 160, '#5a4a6e', '#b88a88', 57) + tufa(1230, 664, 150, 220, '#66526e', '#cf9a88', 56) + tufa(1340, 672, 90, 120, '#5a4a6e', '#b88a84', 55))
        + `<path fill="none" stroke="#fff" stroke-width="3" opacity=".45" d="M380 664q40-10 80 0t80 0t80 0M1160 670q40-10 80 0t80 0"/>`
        + `<path fill="#241a3e" d="M-160 900V800C100 780 300 810 560 790S1000 770 1300 790S1600 780 1760 790V900z"/>`
        + mv('ussway', { ad: '5s', to: '200px 880px' }, `<g stroke="#1b1230" stroke-width="3" fill="none"><path d="M150 880q-8-70-26-110M170 880q4-76 20-120M200 880q14-60 40-100M1180 880q-6-64-22-100M1210 880q8-70 28-96"/></g>`)
        + finish(0.34); } });

  /* ---------- New Mexico: White Sands at late afternoon ---------- */
  const dune = (x, y, w, h, lit1, sh1) => {
    const cx = x + w * 0.4, B = y + h;
    return `<path fill="${lit1}" d="M${x} ${B}C${R(x + w * 0.2)} ${R(y + h * 0.6)} ${R(cx - w * 0.1)} ${y + 6} ${R(cx)} ${y}C${R(cx + w * 0.2)} ${R(y + h * 0.5)} ${R(x + w * 0.8)} ${R(y + h * 0.9)} ${x + w} ${B}z"/>`
      + `<path fill="${sh1}" d="M${R(cx)} ${y}C${R(cx + w * 0.1)} ${R(y + h * 0.25)} ${R(cx + w * 0.2)} ${R(y + h * 0.6)} ${R(cx + w * 0.1)} ${B}H${x + w}C${R(x + w * 0.8)} ${R(y + h * 0.9)} ${R(cx + w * 0.2)} ${R(y + h * 0.5)} ${R(cx)} ${y}z"/>`;
  };
  usSceneAdd({ key: 'state:NM', label: 'White Sands dunes at dusk', site: 'White Sands', colour: 'violet', mood: 'dreamy', season: 'any', tags: ['dunes', 'gypsum', 'dusk'],
    svg: () => { const s1 = U(), l1 = U(), m1 = U();
      const yucca = (x, y, s) => `<g stroke="#4a5a3a" stroke-width="${R(4 * s)}" stroke-linecap="round" fill="none"><path d="M${x} ${y}V${R(y - 90 * s)}"/></g><g stroke="#5e7048" stroke-width="${R(3 * s)}" stroke-linecap="round" fill="none"><path d="M${x} ${R(y - 40 * s)}l${R(-40 * s)} ${R(-30 * s)}M${x} ${R(y - 40 * s)}l${R(40 * s)} ${R(-30 * s)}M${x} ${R(y - 46 * s)}l${R(-26 * s)} ${R(-44 * s)}M${x} ${R(y - 46 * s)}l${R(26 * s)} ${R(-44 * s)}M${x} ${R(y - 50 * s)}V${R(y - 78 * s)}M${x} ${R(y - 36 * s)}l${R(-50 * s)} ${R(-6 * s)}M${x} ${R(y - 36 * s)}l${R(50 * s)} ${R(-6 * s)}"/></g><circle cx="${x}" cy="${R(y - 104 * s)}" r="${R(6 * s)}" fill="#fff"/>`;
      return `<defs>${lin(s1, [[0, '#4a5aaa'], [0.38, '#a888cc'], [0.68, '#f4aab8'], [1, '#ffe0c4']])}${radU(l1, [[0, '#ffd8b0', 0.7], [1, '#ffd8b0', 0]], 420, 530, 760)}${lin(m1, [[0, '#9a84c0'], [1, '#d8b0c8']])}</defs>`
        + full(`url(#${s1})`) + stars(35, 40, 260) + `<circle cx="1000" cy="110" r="30" fill="#fff6e4" opacity=".92"/><circle cx="1014" cy="101" r="27" fill="#6a6ab4" opacity=".75"/>`
        + rays(420, 530, 900, '#ffe3c0', 0.2) + sun(420, 530, 48, '#fff4e0', '#ffb0a0')
        + streak(900, 170, 320, '#ffd0d8', 0.55) + cloud(1180, 300, 1.0, '#c890b8', 0.8, 60, 12, '#ffd8d8') + cloud(520, 250, 0.8, '#bb88b8', 0.75, 70, 40, '#ffd2d4')
        + birds(36, 3, 900, 310, '#4a3a70', 1.2, 700)
        + mv('uspar', { ad: '40s', dx: '8px' }, `${ridge('#a58ac4', 540, 44, 12, 37, 640)}` + haze(560, 100, '#f8d0d0', 0.6))
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + mv('uspar', { ad: '34s', dx: '14px' }, dune(-100, 600, 640, 110, '#f6e8f0', '#b9a2d0') + dune(560, 590, 760, 120, '#f8ecf0', '#b49cd0') + dune(1180, 610, 620, 100, '#f4e6ee', '#b8a0cc'))
        + mv('uspar', { ad: '30s', dx: '24px' }, dune(-200, 650, 760, 150, '#fbf1f2', '#bda6d4') + dune(600, 640, 700, 150, '#fcf2f2', '#b8a0d0') + dune(1200, 660, 600, 140, '#fbf0f0', '#bca4d2'))
        + mv('usdrift', { ad: '14s', dx: '60px' }, `<g fill="#fff" opacity=".55"><ellipse cx="300" cy="650" rx="140" ry="4"/><ellipse cx="900" cy="640" rx="170" ry="4"/><ellipse cx="1300" cy="668" rx="120" ry="3"/><ellipse cx="620" cy="700" rx="110" ry="3"/></g>`)
        + `<path fill="#fffaf6" d="M-160 900V790C100 740 300 770 560 760S900 800 1200 770S1600 750 1760 770V900z"/>`
        + `<path fill="none" stroke="#d6c4e4" stroke-width="3" opacity=".8" d="M-100 830q60-14 120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0"/>`
        + mv('ussway2', { ad: '5s', to: '1220px 830px' }, yucca(1220, 830, 1.5)) + mv('ussway2', { ad: '6.5s', d: '-2s', to: '280px 800px' }, yucca(280, 800, 1.0))
        + `<g fill="none" stroke="#c9b4dc" stroke-width="4" opacity=".7" stroke-linecap="round"><path d="M700 860l14-4M730 868l14-4M770 862l14-4M800 872l14-4"/></g>`
        + finish(0.32); } });

  /* ---------- Oklahoma: a storm over the wheat ---------- */
  usSceneAdd({ key: 'state:OK', label: 'Storm over the wheat', site: 'Storm over the wheat', colour: 'slate', mood: 'energetic', season: 'any', tags: ['storm', 'wheat', 'windmill', 'lightning'],
    svg: () => { const s1 = U(), r1 = U(), w1 = U(), l1 = U(), f1 = U();
      let wheat = ''; const r = rnd(77);
      for (let row = 0; row < 4; row++) { let d = ''; const y0 = 680 + row * 52, n = 70 - row * 8;
        for (let i = 0; i < n; i++) { const x = -60 + i * (1720 / n) + r() * 14, h = 40 + row * 22 + r() * 12, lean = 8 + row * 2; d += `M${R(x)} ${y0 + 60}q${R(lean / 2)} ${-R(h * 0.6)} ${lean} ${-h}`; }
        const col = ['#b88a2e', '#d6a23a', '#e4b44a', '#c8962e'][row];
        wheat += mv(row % 2 ? 'ussway' : 'ussway2', { ad: (4 + row) + 's', d: `-${row}s`, to: `800px ${y0 + 60}px` }, `<path fill="none" stroke="${col}" stroke-width="${3 + row}" stroke-linecap="round" d="${d}"/>`); }
      const bolt = `<path fill="#fff" d="M1130 330l-60 140l40-6l-70 160l110-170l-44 6z"/>`;
      return `<defs>${lin(s1, [[0, '#262d3c'], [0.4, '#48546a'], [0.7, '#86909a'], [0.86, '#d8b46c'], [1, '#f0cc84']])}${linU(r1, [[0, '#2c3446', 0], [0.25, '#2c3446', 0.8], [0.75, '#2c3446', 0.8], [1, '#2c3446', 0]], 820, 0, 1260, 0)}${lin(w1, [[0, '#8a6a30'], [1, '#4a3418']])}${radU(l1, [[0, '#f6dc9c', 0.6], [1, '#f6dc9c', 0]], 300, 640, 700)}${radU(f1, [[0, '#dce8ff', 0.8], [1, '#dce8ff', 0]], 1100, 440, 300)}</defs>`
        + full(`url(#${s1})`) + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + streak(300, 580, 340, '#f8dca0', 0.5, 50)
        + cloud(260, 470, 1.8, '#3a4256', 0.95, 70, 10, '#7a8498') + cloud(1420, 480, 1.7, '#38404f', 0.95, 62, 30, '#78808f')
        + cloud(800, 250, 3.2, '#222836', 0.98, 80, 0, '#59647a') + cloud(500, 350, 2.2, '#2a3142', 0.96, 58, 18, '#667088') + cloud(1150, 330, 2.4, '#262d3c', 0.96, 66, 6, '#5d687e')
        + `<rect x="820" y="420" width="440" height="280" fill="url(#${r1})" opacity=".85"/>`
        + mv('usdrift', { ad: '5s', dx: '24px' }, `<g stroke="#aebccc" stroke-width="2" opacity=".35" stroke-linecap="round">${Array.from({ length: 34 }, (_, i) => `<path d="M${860 + i * 12} ${470 + (i * 37) % 60}l-10 160"/>`).join('')}</g>`)
        + mv('ussway', { ad: '3.2s', to: '980px 640px' }, `<path fill="#1f2532" d="M890 396c30 24 120 24 170 0c-10 50-26 96-34 150c-6 40-4 70 4 96h-10c-10-30-14-60-10-92c-22-44-34-86-120-154z" opacity=".96"/><path fill="#59627a" opacity=".5" d="M930 404c20 12 60 12 80 0c-10 60-24 120-26 180h-6z"/>`) + `<g fill="#8a7a62" opacity=".7"><ellipse cx="978" cy="646" rx="60" ry="12"/></g>`
        + `<circle cx="1100" cy="440" r="300" fill="url(#${f1})" opacity=".7" class="x-usflicker" style="--ad:2.4s"/>` + mv('usflicker', { ad: '2.4s', to: '1100px 330px' }, bolt)
        + mv('uspar', { ad: '30s', dx: '14px' }, ridge('#5c6a52', 640, 24, 9, 78, 760) + haze(600, 80, '#d8c090', 0.3))
        + `<path fill="url(#${w1})" d="M-160 900V700C300 680 800 690 1100 700S1500 690 1760 700V900z"/>`
        + `<path fill="#a8602c" d="M650 900L720 700h160l110 200z" opacity=".85"/><path fill="#3a2a1c" opacity=".35" d="M700 900l50-200h60l40 200z"/>`
        + `<g fill="#8a2e22"><path d="M1190 650h110v-34l-55-30l-55 30z"/><path fill="#eadccb" d="M1186 650h118v8h-118z"/></g><path fill="#4a2a24" d="M1232 658h26v-26h-26z"/>`
        + wheat
        + `<g stroke="#2a2630" stroke-width="7" fill="none"><path d="M240 700L270 480L300 700M255 640h30M262 570h16"/></g><rect x="262" y="468" width="16" height="22" fill="#2a2630"/>`
        + mv('usspin', { ad: '4s', to: '270px 462px' }, `<g fill="#3a3640" stroke="#2a2630" stroke-width="2"><path d="M270 462L262 392L278 392zM270 462L338 440L338 456zM270 462L202 484L202 468zM270 462L262 532L278 532z"/><circle cx="270" cy="462" r="7"/></g>`)
        + mv('usmove', { ad: '12s', dx: '1800px' }, `<g fill="none" stroke="#8a6a38" stroke-width="3"><circle cx="0" cy="850" r="20"/><path d="M-18 842l36 16M-16 856l32-12M-6 832l12 36"/></g>`)
        + birds(79, 4, 700, 560, '#2a2630', 1.1, 900)
        + finish(0.36); } });

  /* ---------- Utah: Bryce Canyon hoodoos at dawn ---------- */
  const hoodoo = (x, base, w, h, fill, seed) => {
    const r = rnd(seed), n = 7, L = [], Rt = [];
    for (let i = 0; i <= n; i++) { const k = i / n, half = w * (0.12 + 0.88 * Math.pow(k, 1.35)) * (0.7 + r() * 0.5), yy = base - h + h * k;
      L.push(`${R(x - half)} ${R(yy)}`, `${R(x - half * (0.75 + r() * 0.2))} ${R(yy + h / n * 0.55)}`); Rt.push(`${R(x + half * (0.8 + r() * 0.35))} ${R(yy)}`, `${R(x + half * (0.7 + r() * 0.2))} ${R(yy + h / n * 0.55)}`); }
    return `<path fill="${fill}" d="M${R(x + (r() - 0.5) * 8)} ${R(base - h - 14)}L${L.join('L')}L${Rt.reverse().join('L')}z"/>`;
  };
  usSceneAdd({ key: 'state:UT', label: 'Bryce hoodoos at dawn', site: 'Bryce Canyon', colour: 'orange', mood: 'calm', season: 'any', tags: ['hoodoos', 'sunrise', 'canyon'],
    svg: () => { const s1 = U(), l1 = U(), f1 = U();
      const band = (id, y, c1, c2) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" spreadMethod="repeat" x1="0" y1="${y}" x2="0" y2="${y + 56}"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c1}"/><stop offset=".62" stop-color="${c2}"/><stop offset="1" stop-color="${c1}"/></linearGradient>`;
      const row = (seed, base, hmin, hmax, w, step, fill, off) => { const r = rnd(seed); let o = `<rect x="-160" y="${base - 30}" width="1920" height="${900 - base + 30}" fill="${fill}"/>`; for (let x = -100 + off; x < 1700; x += step * (0.7 + r() * 0.6)) o += hoodoo(x, base, w * (0.7 + r() * 0.6), hmin + r() * (hmax - hmin), fill, R(x) + seed); return o; };
      const b1 = U(), b2 = U(), b3 = U();
      return `<defs>${lin(s1, [[0, '#5f72bc'], [0.3, '#d49cc2'], [0.58, '#ffbc9c'], [0.8, '#ffe0a8'], [1, '#fff0c4']])}${radU(l1, [[0, '#ffe0a0', 0.65], [1, '#ffe0a0', 0]], 1220, 480, 800)}${lin(f1, [[0, '#2a4a3a'], [1, '#14281f']])}${band(b1, 560, '#e8a890', '#f6cdb4')}${band(b2, 600, '#dc7a50', '#f0a070')}${band(b3, 640, '#c85a38', '#e88458')}</defs>`
        + full(`url(#${s1})`) + stars(51, 24, 150) + rays(1220, 470, 1000, '#fff0c0', 0.24) + sun(1220, 470, 58, '#fff8e0', '#ffb766', true)
        + streak(300, 140, 320, '#fff', 0.5) + cloud(700, 250, 1.1, '#f0a8a8', 0.85, 62, 8, '#fff0e0') + cloud(1380, 230, 0.8, '#f2b4a8', 0.8, 54, 28, '#fff3e4')
        + birds(52, 3, 400, 300, '#3a2840', 1.2, 760)
        + mv('uspar', { ad: '40s', dx: '8px' }, ridge('#a2789a', 500, 50, 9, 61, 640) + canopy('#6a7a88', 500, 14, 62, -160, 1760, 620) + haze(470, 120, '#ffd0b0', 0.5))
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + mv('uspar', { ad: '36s', dx: '10px' }, row(63, 690, 90, 170, 40, 80, `url(#${b1})`, 0))
        + mv('uspar', { ad: '32s', dx: '18px' }, row(64, 780, 150, 290, 58, 125, `url(#${b2})`, 20))
        + mv('uspar', { ad: '28s', dx: '22px' }, row(65, 860, 200, 380, 86, 260, `url(#${b3})`, 60) + `<rect width="1600" height="900" fill="#7a1e0a" opacity=".12"/>`)
        + `<path fill="#3a5a4a" d="M-160 880C200 850 500 872 800 860S1300 850 1760 872V900H-160z"/>`
        + mv('ussway2', { ad: '6s', to: '800px 800px' }, [60, 150, 240, 330, 520, 1060, 1180, 1290, 1420, 1500].map((x, i) => pine(x, 890 + (i % 3) * 6, 0.8 + (i % 4) * 0.12, '#1f3a2c', '#2f5a42')).join(''))
        + `<path fill="url(#${f1})" d="M-160 900V850C100 830 300 850 560 842S1000 830 1300 850S1600 840 1760 850V900z"/>`
        + `<path fill="#8a5a40" d="M-160 900V864C300 850 800 872 1200 858S1600 866 1760 860V900z"/>`
        + mv('ussway2', { ad: '7s', to: '120px 900px' }, pine(110, 900, 2.6, '#142a20', '#24442f')) + mv('ussway2', { ad: '8s', d: '-3s', to: '1490px 900px' }, pine(1500, 900, 2.1, '#142a20', '#24442f'))
        + `<path fill="none" stroke="#5a3a2a" stroke-width="6" d="M300 880H1300M360 880V850M560 880V850M760 880V850M960 880V850M1160 880V850M340 856H1260"/>`
        + finish(0.32); } });

  /* ---------- Wyoming: Old Faithful erupting ---------- */
  usSceneAdd({ key: 'state:WY', label: 'Old Faithful erupts', site: 'Old Faithful', colour: 'teal', mood: 'proud', season: 'any', tags: ['geyser', 'steam', 'yellowstone', 'bison'],
    svg: () => { const s1 = U(), e1 = U(), g1 = U(), l1 = U(), p1 = U();
      const bison = (x, y, s, c) => `<g fill="${c}"><ellipse cx="${R(x + 18 * s)}" cy="${y}" rx="${R(46 * s)}" ry="${R(26 * s)}"/><ellipse cx="${R(x - 10 * s)}" cy="${R(y - 14 * s)}" rx="${R(30 * s)}" ry="${R(28 * s)}"/><ellipse cx="${R(x - 46 * s)}" cy="${R(y + 12 * s)}" rx="${R(20 * s)}" ry="${R(17 * s)}"/><path d="M${R(x - 44 * s)} ${R(y + 22 * s)}l${R(-6 * s)} ${R(20 * s)}l${R(12 * s)} ${R(-6 * s)}z"/></g><path fill="none" stroke="${c}" stroke-width="${R(7 * s)}" stroke-linecap="round" d="M${R(x - 20 * s)} ${R(y + 16 * s)}v${R(34 * s)}M${R(x - 2 * s)} ${R(y + 20 * s)}v${R(30 * s)}M${R(x + 36 * s)} ${R(y + 20 * s)}v${R(30 * s)}M${R(x + 54 * s)} ${R(y + 14 * s)}v${R(34 * s)}"/>`;
      return `<defs>${lin(s1, [[0, '#3f7cc4'], [0.45, '#7fb8e2'], [0.78, '#cfe8ee'], [1, '#f4f8e8']])}${linU(e1, [[0, '#ffffff', 0.15], [0.3, '#ffffff', 0.95], [1, '#e8f4f8', 0.9]], 0, 120, 0, 640)}${lin(g1, [[0, '#a89a76'], [1, '#6a5a42']])}${radU(l1, [[0, '#fff2c0', 0.5], [1, '#fff2c0', 0]], 300, 120, 700)}<radialGradient id="${p1}"><stop offset="0" stop-color="#fff" stop-opacity=".92"/><stop offset=".6" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`
        + full(`url(#${s1})`) + rays(300, 110, 1000, '#fff6d0', 0.2) + sun(300, 110, 40, '#fffbe4', '#ffe9a0') + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + streak(1300, 140, 300, '#fff', 0.6) + cloud(520, 220, 1.1, '#bcd4e4', 0.9, 60, 6) + cloud(1380, 330, 0.9, '#c0d8e6', 0.85, 54, 30) + birds(91, 4, 900, 300, '#2a3a4a', 1.2, 760)
        + mv('uspar', { ad: '40s', dx: '8px' }, ridge('#6a94b0', 520, 60, 9, 92, 640) + canopy('#5a8a8a', 540, 16, 93, -160, 1760, 640) + haze(500, 120, '#e8f2f0', 0.55))
        + mv('uspar', { ad: '32s', dx: '16px' }, ridge('#3f7060', 600, 36, 9, 94, 700) + canopy('#2f5c4c', 610, 22, 95, -160, 1760, 720))
        + `<g><path fill="#6a4630" d="M40 640V590h340v50z"/><path fill="#3e2a20" d="M20 596L130 520L205 548L290 490L400 596z"/><path fill="#4e3426" d="M130 520L205 548L290 490L330 520L205 590z" opacity=".6"/><path fill="#3e2a20" d="M110 600l20-34l20 34zM250 600l20-34l20 34z"/><path fill="none" stroke="#2e1e16" stroke-width="2" d="M40 604H380M40 618H380M40 632H380"/></g>` + grid(60, 600, 300, 40, 24, 20, '#1c120c')
        + `<path fill="url(#${g1})" d="M-160 900V730C200 700 500 720 640 700L690 664C740 640 860 640 910 664L960 700C1200 720 1500 704 1760 730V900z"/>`
        + `<path fill="#7ab8c8" opacity=".6" d="M700 666C760 650 840 650 900 666C860 676 740 676 700 666z"/>`
        + `<path fill="#c8b890" opacity=".7" d="M650 700C760 690 840 690 950 700L1000 740H600z"/>`
        + mv('ussway', { ad: '3.4s', to: '800px 660px' }, `<path fill="url(#${e1})" d="M790 664C786 500 770 380 764 300C750 220 790 140 800 110C810 140 850 220 836 300C830 380 814 500 810 664z"/>`)
        + mv('usglow', { ad: '2.6s', to: '800px 660px' }, `<path fill="#fff" opacity=".8" d="M797 664C796 520 792 400 800 250C808 400 804 520 803 664z"/>`)
        + puffs(800, 140, 7, `url(#${p1})`, 70, 260, 6, -60, 3.4) + puffs(800, 200, 5, `url(#${p1})`, 90, 300, 8, -40, 3) + puffs(800, 640, 6, `url(#${p1})`, 60, 90, 4, -240, 2.6) + puffs(760, 650, 4, `url(#${p1})`, 48, -120, 3.8, -200, 2.4)
        + `<path fill="#6a5a46" d="M-160 900V820C200 790 600 800 900 780S1500 790 1760 800V900z"/>`
        + `<g fill="none" stroke="#4a3a2c" stroke-width="5"><path d="M-40 790C300 760 520 744 700 736L1000 736C1200 744 1400 760 1700 790"/><path d="M60 770V792M300 760V784M500 748V772M700 740V764M900 740V764M1100 748V772M1300 760V784M1500 770V792"/></g>`
        + `<g fill="#2c2c3a">${[560, 598, 640, 1010, 1050, 1090].map((x, i) => `<circle cx="${x}" cy="${700 + (i % 2) * 2}" r="6"/><path d="M${x - 8} ${742}q8-36 16 0z"/>`).join('')}</g>`
        + mv('usmove', { ad: '60s', dx: '260px' }, bison(1130, 856, 1.3, '#2e2018') + bison(1320, 870, 1.0, '#3a2a1e') + bison(1460, 850, 0.8, '#2e2018'))
        + `<g fill="#e8d4a0" opacity=".9">${[100, 200, 380, 520].map((x, i) => `<circle cx="${x}" cy="${860 - i * 4}" r="3"/>`).join('')}</g>`
        + finish(0.3); } });

  /* ---------- Alaska: midnight sun over Denali ---------- */
  usSceneAdd({ key: 'state:AK', label: 'Midnight sun over Denali', site: 'Denali', colour: 'orange', mood: 'calm', season: 'any', tags: ['denali', 'tundra', 'moose', 'midnight sun'],
    svg: () => { const s1 = U(), m1 = U(), w1 = U(), l1 = U(), c1 = U();
      const moose = (x, y, s, c) => `<g fill="${c}"><ellipse cx="${x}" cy="${y}" rx="${R(54 * s)}" ry="${R(24 * s)}"/><ellipse cx="${R(x - 26 * s)}" cy="${R(y - 14 * s)}" rx="${R(28 * s)}" ry="${R(22 * s)}"/><path d="M${R(x - 40 * s)} ${R(y - 20 * s)}l${R(-30 * s)} ${R(14 * s)}l${R(-6 * s)} ${R(18 * s)}l${R(24 * s)} ${R(6 * s)}l${R(22 * s)} ${R(-16 * s)}z"/><path d="M${R(x - 74 * s)} ${R(y - 4 * s)}l${R(-12 * s)} ${R(18 * s)}l${R(12 * s)} ${R(2 * s)}z"/></g>`
        + `<path fill="none" stroke="${c}" stroke-width="${R(7 * s)}" stroke-linecap="round" d="M${R(x - 40 * s)} ${R(y + 12 * s)}l${R(-4 * s)} ${R(56 * s)}M${R(x - 22 * s)} ${R(y + 16 * s)}l${R(4 * s)} ${R(52 * s)}M${R(x + 30 * s)} ${R(y + 16 * s)}l${R(-4 * s)} ${R(52 * s)}M${R(x + 48 * s)} ${R(y + 8 * s)}l${R(6 * s)} ${R(56 * s)}"/>`
        + `<path fill="${c}" d="M${R(x - 66 * s)} ${R(y - 20 * s)}l${R(-30 * s)} ${R(-26 * s)}l${R(8 * s)} ${R(-4 * s)}l${R(10 * s)} ${R(10 * s)}l${R(2 * s)} ${R(-20 * s)}l${R(8 * s)} ${R(4 * s)}l${R(2 * s)} ${R(18 * s)}l${R(14 * s)} ${R(-12 * s)}l${R(2 * s)} ${R(10 * s)}z"/>`;
      const mtn = `M300 640L420 520L520 540L640 380L720 420L860 220L930 250L1000 160L1060 120L1100 150L1180 260L1260 300L1360 440L1470 500L1640 640z`;
      return `<defs>${lin(s1, [[0, '#3b4a8c'], [0.3, '#8f6aaa'], [0.55, '#f08c80'], [0.78, '#ffc68e'], [1, '#ffe4b4']])}${linU(m1, [[0, '#fff'], [0.5, '#ffd4d0'], [1, '#8a8ac0']], 600, 120, 1300, 640)}${lin(w1, [[0, '#e8a890'], [0.3, '#7a7ab0'], [1, '#2c3c70']])}${radU(l1, [[0, '#ffd6a0', 0.7], [1, '#ffd6a0', 0]], 260, 580, 700)}<clipPath id="${c1}"><rect x="-160" y="640" width="1920" height="130"/></clipPath></defs>`
        + full(`url(#${s1})`) + stars(95, 20, 120) + rays(260, 580, 900, '#ffe6b0', 0.2) + sun(260, 580, 46, '#fff4d0', '#ff9c70')
        + streak(900, 120, 340, '#ffc0b0', 0.55) + streak(300, 230, 260, '#ffd0c0', 0.5, 70) + cloud(1380, 260, 0.9, '#d890a8', 0.8, 58, 14, '#ffd8d0') + birds(96, 4, 700, 330, '#3a2c50', 1.3, 760)
        + mv('uspar', { ad: '44s', dx: '8px' }, ridge('#8a78b8', 590, 70, 9, 97, 660) + haze(540, 120, '#f8c8c0', 0.5))
        + `<path fill="url(#${m1})" d="${mtn}"/><path fill="#6a68a8" opacity=".55" d="M1060 120L1000 160L1030 300L960 420L1010 560L1100 150z"/><path fill="#8a88c0" opacity=".5" d="M860 220L930 250L900 400L820 520L700 420L640 380z"/>`
        + `<path fill="none" stroke="#9a96c8" stroke-width="4" opacity=".6" d="M1010 170L960 300M1050 140L1040 300L1100 420M880 250L850 380M1180 262L1130 420M960 300L1000 440"/>`
        + mv('usdrift', { ad: '40s', dx: '40px' }, `<path fill="#ffeee8" opacity=".85" d="M960 170c30-14 110-14 160 6c-40 12-110 16-160-6z"/>`)
        + mv('uspar', { ad: '34s', dx: '14px' }, ridge('#6a6a9c', 650, 40, 9, 98, 700) + canopy('#2f4a52', 660, 20, 99, -160, 1760, 720))
        + `<rect y="640" width="1600" height="130" fill="url(#${w1})"/><g clip-path="url(#${c1})"><g opacity=".4" transform="translate(0 1280) scale(1 -1)"><path fill="url(#${m1})" d="${mtn}"/></g></g>`
        + shimmer(100, 50, 300, 1500, 650, 760, '#ffe0c0', 50)
        + `<path fill="#c0562e" d="M-160 900V740C200 716 500 740 800 724S1300 716 1760 740V900z"/>`
        + `<path fill="#e0902e" opacity=".7" d="M-160 900V790C300 770 700 800 1000 780S1500 780 1760 790V900z"/>`
        + `<path fill="#8e2f2a" opacity=".6" d="M-160 900V850C400 830 800 860 1200 842S1600 846 1760 850V900z"/>`
        + `<g fill="#ffbe4a">${Array.from({ length: 24 }, (_, i) => `<circle cx="${40 + i * 66}" cy="${780 + (i * 29) % 90}" r="${4 + i % 3}"/>`).join('')}</g>`
        + `<g fill="#f6e6d4" opacity=".9">${Array.from({ length: 12 }, (_, i) => `<circle cx="${100 + i * 130}" cy="${820 + (i * 17) % 60}" r="3"/>`).join('')}</g>`
        + mv('usmove', { ad: '70s', dx: '240px' }, moose(1130, 800, 0.9, '#2a1c26'))
        + mv('ussway2', { ad: '5s', to: '200px 900px' }, pine(180, 900, 2.0, '#17302e', '#264a42') + pine(300, 900, 1.5, '#17302e', '#264a42') + pine(1480, 900, 2.3, '#17302e', '#264a42'))
        + finish(0.32); } });

  /* ---------- Denver: the skyline under the Rockies ---------- */
  usSceneAdd({ key: 'place:denver', label: 'The Mile High skyline', site: 'Denver and the Rockies', colour: 'blue', mood: 'proud', season: 'any', tags: ['skyline', 'rockies', 'light rail'],
    svg: () => { const s1 = U(), l1 = U(), g1 = U(), p1 = U();
      const tw = (x, w, h, fill, top) => `<path fill="${fill}" d="M${x} 700V${700 - h}${top || ''}H${x + w}V700z"/>` + grid(x, 700 - h, w, h, 17, 24, '#1c2c4a');
      const peaks = (y, fill, snow, seed) => { const r = rnd(seed); let d = `M-160 ${y + 80}`, sn = ''; let x = -160;
        while (x < 1760) { const w = 140 + r() * 120, h = 60 + r() * 130; d += `L${R(x + w / 2)} ${R(y - h)}L${R(x + w)} ${y + 10}`; sn += `<path fill="${snow}" d="M${R(x + w / 2)} ${R(y - h)}l${R(-w * 0.2)} ${R(h * 0.4)}l${R(w * 0.08)} ${-R(h * 0.08)}l${R(w * 0.1)} ${R(h * 0.12)}l${R(w * 0.1)} ${-R(h * 0.1)}l${R(w * 0.1)} ${R(h * 0.06)}z"/>`; x += w; }
        return `<path fill="${fill}" d="${d}L1760 ${y + 80}z"/>` + sn; };
      return `<defs>${lin(s1, [[0, '#3a74c6'], [0.5, '#7cb0e4'], [0.82, '#c4e0f2'], [1, '#e8f4f6']])}${radU(l1, [[0, '#fff0c0', 0.55], [1, '#fff0c0', 0]], 1280, 160, 700)}${lin(g1, [[0, '#7a8a52'], [1, '#43502e']])}${lin(p1, [[0, '#6a7aa4'], [1, '#a8b6d0']])}</defs>`
        + full(`url(#${s1})`) + stars(121, 30, 200) + rays(1280, 160, 1000, '#fff6d0', 0.18) + sun(1280, 160, 44, '#fffbe6', '#ffe6a0')
        + cloud(380, 250, 1.4, '#a8c4e0', 0.92, 60, 6) + cloud(900, 160, 1.1, '#b0c8e2', 0.9, 52, 24) + cloud(1450, 320, 1.0, '#b0c6e0', 0.88, 66, 40) + streak(700, 400, 300, '#fff', 0.5)
        + birds(122, 4, 500, 330, '#2a3a5a', 1.1, 760)
        + mv('uspar', { ad: '44s', dx: '8px' }, peaks(470, '#8896c0', '#fff', 123) + haze(430, 110, '#d8e8f4', 0.55))
        + mv('uspar', { ad: '36s', dx: '14px' }, peaks(520, '#5a6ea4', '#e8f0fa', 124) + `<path fill="#6a8a60" d="M-160 660V560C100 540 300 570 560 556S1000 540 1300 566S1600 550 1760 566V660z"/>`)
        + `<g class="x-uspar" style="--ad:32s;--dx:10px">`
        + tw(1160, 80, 150, '#6a7ca4') + tw(1260, 70, 110, '#7a8cb0') + tw(1340, 90, 160, '#6a7ca4') + tw(1450, 70, 100, '#7a8cb0')
        + tw(400, 110, 210, '#4e638e', `l0 0`) + `<path fill="#3a4c74" d="M520 700V420l36-24l36 24V700z"/>` + grid(520, 420, 72, 280, 17, 24, '#16243e')
        + `<path fill="#58709c" d="M620 700V380h80V700z"/><path fill="#58709c" d="M610 380h100l-12 -22h-76z"/><path fill="#c7d8ee" d="M628 360l24-60l24 60z"/>` + grid(620, 380, 80, 320, 17, 24, '#16243e')
        + `<path fill="#46608e" d="M740 700V300L800 250L860 300V700z"/><path fill="#7a96c4" opacity=".5" d="M800 250L860 300V700H800z"/>` + grid(740, 300, 120, 400, 17, 24, '#14223c')
        + `<path fill="#52689a" d="M880 700V340h90l30 -50v410z"/>` + grid(880, 340, 120, 360, 17, 24, '#14223c')
        + `<path fill="#3e5686" d="M1020 700V430h60l20 -26V700z"/>` + grid(1020, 430, 80, 270, 17, 24, '#14223c')
        + `</g>`
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + `<g><rect x="100" y="620" width="250" height="80" fill="#d8d2c4"/><rect x="100" y="610" width="250" height="10" fill="#b8b0a0"/><path fill="#c8c0b0" d="M150 620h150v-26h-150z"/><rect x="185" y="560" width="80" height="34" fill="#d8d2c4"/><path fill="#e8c24a" d="M190 560a35 40 0 0 1 70 0z"/><path fill="#c89a2a" d="M225 520v-22" stroke="#c89a2a" stroke-width="4"/><circle cx="225" cy="494" r="5" fill="#e8c24a"/><path fill="none" stroke="#a89e8a" stroke-width="3" d="M120 620V700M150 620V700M180 620V700M270 620V700M300 620V700M330 620V700"/></g>`
        + `<path fill="url(#${g1})" d="M-160 900V700H1760V900z"/><path fill="#3a4a64" d="M-160 760H1760V820H-160z"/><path fill="#fff" opacity=".55" d="M-160 790H1760v3H-160z"/>`
        + mv('usmove', { ad: '16s', dx: '1900px' }, `<g transform="translate(800 0)"><rect x="80" y="738" width="380" height="42" rx="10" fill="#e8edf4"/><rect x="80" y="760" width="380" height="8" fill="#2f7a4a"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${100 + i * 46}" y="746" width="32" height="14" rx="3" fill="#2a3c5c"/>`).join('')}<path fill="#2a3c5c" d="M200 738l20-34h60l20 34z" opacity=".0"/></g>`)
        + `<path fill="none" stroke="#2a3040" stroke-width="3" d="M-100 704H1700M0 704V680M400 704V680M800 704V680M1200 704V680M1600 704V680"/>`
        + `<path fill="#4a5a38" d="M-160 900V850C300 836 800 852 1200 840S1600 846 1760 850V900z"/>`
        + mv('ussway2', { ad: '6s', to: '200px 880px' }, `<g fill="#e0b030"><circle cx="150" cy="800" r="48"/><circle cx="210" cy="780" r="40"/><circle cx="100" cy="780" r="36"/></g><rect x="144" y="840" width="12" height="50" fill="#5a4a36"/>`)
        + mv('ussway2', { ad: '7s', d: '-2s', to: '1450px 880px' }, `<g fill="#e8962a"><circle cx="1440" cy="790" r="50"/><circle cx="1500" cy="770" r="40"/><circle cx="1390" cy="780" r="36"/></g><rect x="1434" y="838" width="12" height="52" fill="#5a4a36"/>`)
        + `<g fill="#e0b030" opacity=".8"><circle cx="500" cy="870" r="4"/><circle cx="640" cy="862" r="3"/><circle cx="1000" cy="870" r="4"/></g>`
        + finish(0.3); } });

  /* ---------- Salt Lake City: the Temple under the Wasatch ---------- */
  usSceneAdd({ key: 'place:salt-lake-city', label: 'Temple and Wasatch at dusk', site: 'Temple Square and the Wasatch', colour: 'violet', mood: 'proud', season: 'any', tags: ['temple', 'wasatch', 'mountains', 'spires'],
    svg: () => { const s1 = U(), l1 = U(), m1 = U(), st1 = U();
      const spire = (x, y, h, w) => `<path fill="url(#${st1})" d="M${x - w / 2} ${y}V${y - h * 0.5}h${w}V${y}z"/><path fill="#d8d4de" d="M${x - w / 2 - 3} ${y - h * 0.5}h${w + 6}v6h${-w - 6}z"/><path fill="#cfcad8" d="M${x - w / 2 + 3} ${y - h * 0.5}L${x} ${y - h}L${x + w / 2 - 3} ${y - h * 0.5}z"/><path fill="#a8a2bc" opacity=".6" d="M${x} ${y - h}L${x + w / 2 - 3} ${y - h * 0.5}H${x}z"/>`
        + `<path fill="none" stroke="#6a6480" stroke-width="2" opacity=".5" d="M${x - w / 4} ${y}V${y - h * 0.46}M${x + w / 4} ${y}V${y - h * 0.46}"/><rect class="us-lit" x="${x - 4}" y="${R(y - h * 0.4)}" width="8" height="${R(h * 0.2)}" rx="4"/>`;
      return `<defs>${lin(s1, [[0, '#2f2c6c'], [0.32, '#6f56a4'], [0.6, '#e08aa0'], [0.82, '#ffc28e'], [1, '#ffe2b0']])}${lin(m1, [[0, '#fff2f4'], [0.45, '#d8a8c0'], [1, '#6a5a9c']])}${lin(st1, [[0, '#ebe8ee'], [1, '#b0aac4']])}${radU(l1, [[0, '#ffc89a', 0.6], [1, '#ffc89a', 0]], 800, 600, 800)}</defs>`
        + full(`url(#${s1})`) + stars(141, 50, 240) + `<circle cx="1330" cy="170" r="32" fill="#fff4dc" opacity=".92"/><circle cx="1346" cy="160" r="28" fill="#6a58a0" opacity=".7"/>`
        + rays(800, 560, 1000, '#ffd8b0', 0.16) + streak(300, 170, 320, '#ffb4a8', 0.5) + streak(1100, 260, 280, '#ff9ca0', 0.45, 70) + cloud(480, 330, 1.1, '#b46a96', 0.78, 62, 8, '#ffbea6') + cloud(1280, 380, 0.9, '#b8709a', 0.75, 56, 30, '#ffc8a6')
        + birds(142, 4, 700, 340, '#2a2250', 1.1, 760)
        + mv('uspar', { ad: '44s', dx: '8px' }, `<path fill="url(#${m1})" d="M-160 640V470L-60 380L20 430L140 280L240 360L320 320L440 440L560 400L680 460L900 380L1010 300L1120 390L1240 330L1340 400L1460 320L1560 420L1660 380L1760 450V640z"/><path fill="#fff" opacity=".7" d="M140 280l-40 70l30-8l20 18l22-18l30 10z"/><path fill="#fff" opacity=".7" d="M1010 300l-34 62l28-6l22 16l22-16l26 8z"/><path fill="#fff" opacity=".7" d="M1460 320l-30 54l26-6l16 14l22-14l22 6z"/>` + haze(480, 120, '#f4c4c8', 0.5))
        + mv('uspar', { ad: '36s', dx: '14px' }, ridge('#6a5a98', 600, 70, 9, 143, 700) + canopy('#4a4272', 620, 16, 144, -160, 1760, 700))
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + `<path fill="#35564a" d="M-160 900V690H1760V900z"/><path fill="#4a7258" opacity=".6" d="M-160 740C300 700 800 720 1200 700S1600 710 1760 700V760H-160z"/><path fill="#c9c2d2" d="M740 900L780 700H820L860 900z"/>`
        + `<path fill="#d4d0dc" d="M420 700V500H1180V700z"/>` + `<path fill="url(#${st1})" d="M440 700V510H1160V700z"/>`
        + `<path fill="#bcb6cc" d="M380 500L800 440L1220 500z" opacity=".9"/>`
        + spire(520, 520, 190, 56) + spire(800, 516, 300, 66) + spire(1080, 520, 190, 56) + spire(600, 560, 120, 40) + spire(1000, 560, 120, 40)
        + `<path fill="#8a8aa4" d="M440 520H1160v8H440z"/><path fill="none" stroke="#d6d2e0" stroke-width="12" stroke-dasharray="14 10" d="M420 504H1180"/><path fill="none" stroke="#b0aac4" stroke-width="3" d="M440 700V530M500 700V530M700 700V530M900 700V530M1100 700V530M1160 700V530"/>`
        + `<g fill="#6a6482"><path d="M480 700V620a14 14 0 0 1 28 0V700zM560 700V620a14 14 0 0 1 28 0V700zM640 700V600a18 18 0 0 1 36 0V700zM920 700V600a18 18 0 0 1 36 0V700zM1010 700V620a14 14 0 0 1 28 0V700zM1090 700V620a14 14 0 0 1 28 0V700z"/></g>`
        + `<g class="us-lit"><path d="M486 700V622a8 8 0 0 1 16 0V700zM566 700V622a8 8 0 0 1 16 0V700zM648 700V604a10 10 0 0 1 20 0V700zM928 700V604a10 10 0 0 1 20 0V700zM1016 700V622a8 8 0 0 1 16 0V700zM1096 700V622a8 8 0 0 1 16 0V700z"/></g>`
        + `<path fill="none" stroke="#9a94b0" stroke-width="2" d="M440 560H1160M440 610H1160"/>`
        + mv('usglow', { ad: '3s', to: '800px 202px' }, `<path fill="#ffd25a" d="M792 214h16v-10c4-6 4-14 0-20c-4-6-12-6-16 0c-4 6-4 14 0 20z"/><path fill="#ffd25a" d="M808 190l22-16l-2 6l-18 14z"/><circle cx="800" cy="196" r="16" fill="#ffd25a" opacity=".3"/>`)
        + mv('usflag', { ad: '2.4s', to: '1180px 430px' }, `<path fill="#c8422e" d="M1180 430v-34l34 6l-34 10z"/>`) + `<path stroke="#6a6480" stroke-width="3" d="M1180 440V392"/>`
        + `<path fill="#2a4a3c" d="M-160 900V790C300 780 800 800 1200 782S1600 786 1760 790V900z"/>`
        + `<g fill="#26482c">${[60, 180, 300, 1300, 1420, 1540].map((x, i) => `<circle cx="${x}" cy="${740 - (i % 2) * 14}" r="${50 + (i % 3) * 8}"/><rect x="${x - 5}" y="${740}" width="10" height="50"/>`).join('')}</g>`
        + `<g fill="#34683c">${[100, 360, 1240, 1480].map((x, i) => `<circle cx="${x}" cy="${718 + i % 2 * 10}" r="${36}"/>`).join('')}</g>`
        + dots('M440 740H1160', '#ffd27a', 7, 24, 'us-lamps') + dots('M-40 790Q300 770 560 790M1040 790Q1300 770 1640 790', '#ffd27a', 7, 26, 'us-lamps')
        + `<g>${Array.from({ length: 30 }, (_, i) => `<circle cx="${60 + i * 52}" cy="${830 + (i % 3) * 8}" r="6" fill="${['#e83e5a', '#ffd23e', '#e86ac8', '#ff8a3e'][i % 4]}"/>`).join('')}</g>`
        + mv('usmove', { ad: '18s', dx: '1800px' }, `<g><rect x="0" y="808" width="180" height="26" rx="8" fill="#e8e4f0"/><rect x="0" y="822" width="180" height="5" fill="#3a5ab0"/>${[0, 1, 2, 3].map(i => `<rect x="${12 + i * 42}" y="812" width="26" height="9" rx="2" fill="#2a2850"/>`).join('')}</g>`)
        + finish(0.34); } });

  /* ---------- Las Vegas: the Strip at dusk ---------- */
  usSceneAdd({ key: 'place:las-vegas', label: 'The Strip at dusk', site: 'The Las Vegas Strip', colour: 'pink', mood: 'energetic', season: 'any', tags: ['neon', 'strip', 'casino', 'tower'],
    svg: () => { const s1 = U(), l1 = U(), p1 = U(), b1 = U();
      const blk = (x, w, h, fill) => `<rect x="${x}" y="${690 - h}" width="${w}" height="${h}" fill="${fill}"/>` + grid(x, 690 - h, w, h, 16, 22, '#241a44');
      const palm = (x, y, s) => `<path fill="none" stroke="#3a2a28" stroke-width="${R(9 * s)}" d="M${x} ${y}q${R(10 * s)} ${R(-90 * s)} ${R(4 * s)} ${R(-180 * s)}"/><g fill="none" stroke="#1d4a3a" stroke-width="${R(7 * s)}" stroke-linecap="round"><path d="M${R(x + 4 * s)} ${R(y - 180 * s)}q${R(-60 * s)} ${R(-20 * s)} ${R(-90 * s)} ${R(30 * s)}M${R(x + 4 * s)} ${R(y - 180 * s)}q${R(60 * s)} ${R(-24 * s)} ${R(90 * s)} ${R(26 * s)}M${R(x + 4 * s)} ${R(y - 180 * s)}q${R(-30 * s)} ${R(-50 * s)} ${R(-70 * s)} ${R(-30 * s)}M${R(x + 4 * s)} ${R(y - 180 * s)}q${R(30 * s)} ${R(-56 * s)} ${R(70 * s)} ${R(-34 * s)}"/></g>`;
      return `<defs>${lin(s1, [[0, '#1b1850'], [0.35, '#59308c'], [0.65, '#d2488a'], [0.88, '#ff945c'], [1, '#ffc070']])}${lin(b1, [[0, '#ffe6a0', 0.9], [1, '#ffe6a0', 0]])}${linU(p1, [[0, '#5a4a8c'], [1, '#2a2050']], 0, 700, 0, 900)}${radU(l1, [[0, '#ff9a5a', 0.5], [1, '#ff9a5a', 0]], 800, 650, 900)}</defs>`
        + full(`url(#${s1})`) + stars(161, 90, 300) + `<circle cx="260" cy="160" r="30" fill="#fff0d0" opacity=".9"/><circle cx="274" cy="150" r="27" fill="#4a2c80" opacity=".75"/>`
        + streak(800, 190, 340, '#ff9ab8', 0.5) + cloud(1300, 330, 1.2, '#7a3a8c', 0.8, 62, 8, '#e87aa0') + cloud(400, 360, 1.0, '#7a3a8a', 0.75, 70, 30, '#e07aa4') + birds(162, 3, 1000, 250, '#1a1440', 1.1, 700)
        + mv('uspar', { ad: '44s', dx: '8px' }, ridge('#5a3a86', 610, 70, 9, 163, 700) + haze(560, 120, '#e870a0', 0.4))
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + mv('uspar', { ad: '34s', dx: '10px' }, blk(60, 140, 160, '#5a4a8c') + blk(210, 110, 220, '#4a3c7c') + blk(1250, 120, 200, '#5a4a8c') + blk(1380, 150, 150, '#4a3c7c') + blk(1530, 100, 230, '#5a4a8c'))
        + `<path fill="#4a3a7a" d="M360 690L520 450L680 690z"/><path fill="#6a58a0" opacity=".7" d="M520 450L680 690H520z"/>` + `<path fill="none" stroke="#2a2050" stroke-width="2" d="M400 640H640M440 590H600M480 540H560"/>`
        + mv('usglow', { ad: '2.5s' }, `<path fill="url(#${b1})" d="M508 450h24l60-450h-144z"/><rect x="514" y="446" width="12" height="10" fill="#ffe6a0"/>`)
        + `<path fill="#52428a" d="M780 690V420h30V690zM796 420V150l6-40l6 40v270z"/>` + `<ellipse cx="802" cy="300" rx="48" ry="20" fill="#6a58a8"/><rect class="us-lit" x="768" y="288" width="68" height="10" rx="5"/><path fill="#ff4a7a" d="M800 108v-30"/><circle cx="802" cy="74" r="6" fill="#ff4a7a" class="x-usglow" style="--ad:1.2s"/>`
        + `<path fill="none" stroke="#5a4a96" stroke-width="5" d="M900 690L960 330L1020 690M912 640H1008M924 590H996M936 530H984M948 460H972"/><path fill="none" stroke="#5a4a96" stroke-width="3" d="M890 690C920 650 1000 650 1030 690M960 330V250"/><path fill="#5a4a96" d="M944 340h32v-16h-32z"/><path fill="#6a58a8" d="M950 324h20l-10-40z"/><circle class="us-lit" cx="960" cy="270" r="6"/>`
        + `<g fill="#3f2f6c"><rect x="1040" y="400" width="180" height="290"/></g>` + grid(1040, 400, 180, 290, 16, 22, '#1d1440')
        + `<rect x="700" y="520" width="80" height="170" fill="#4a3a7c"/>` + grid(700, 520, 80, 170, 16, 22, '#1d1440')
        + mv('usglow', { ad: '2.2s' }, `<rect x="212" y="454" width="106" height="20" rx="4" fill="#ff3d8a"/><rect x="1040" y="380" width="180" height="16" rx="4" fill="#33d8ff"/><rect x="1252" y="520" width="116" height="16" rx="4" fill="#ffd23e"/><rect x="62" y="560" width="136" height="14" rx="4" fill="#9a5aff"/><rect x="1390" y="600" width="130" height="14" rx="4" fill="#ff7a3e"/>`)
        + mv('usglow', { ad: '3.1s', d: '-1s' }, `<circle cx="880" cy="740" r="22" fill="#ff3d8a"/><circle cx="880" cy="740" r="10" fill="#fff"/><circle cx="1180" cy="720" r="18" fill="#33d8ff"/><circle cx="1180" cy="720" r="8" fill="#fff"/>`)
        + `<g class="x-uspar" style="--ad:22s;--dx:6px"><circle cx="1100" cy="230" r="3" fill="#ff5a9a"/></g>`
        + mv('usglow', { ad: '2s', to: '1100px 240px' }, `<g fill="none" stroke-linecap="round" stroke-width="4"><path stroke="#ff9ac8" d="M1100 180v-28M1100 300v28M1040 240h-28M1160 240h28M1058 198l-20-20M1142 282l20 20M1142 198l20-20M1058 282l-20 20"/></g>`)
        + `<g fill="#ff3d8a" opacity=".9"><rect x="216" y="474" width="6" height="216"/><rect x="306" y="474" width="6" height="216"/></g><g fill="#33d8ff" opacity=".9"><rect x="1044" y="400" width="5" height="290"/><rect x="1211" y="400" width="5" height="290"/></g>`
        + mv('usglow', { ad: '2.8s', d: '-1.2s' }, `<path fill="#ffd23e" d="${star5(1320, 480, 34, 15)}"/><path fill="#ff3d8a" d="${star5(150, 500, 28, 12)}"/><rect x="1316" y="506" width="8" height="60" fill="#8a7ab0"/>`)
        + mv('usspin', { ad: '16s', to: '260px 690px' }, `<path fill="#fff" opacity=".18" d="M260 690L180 120L340 120z"/>`) + mv('usspin', { ad: '22s', d: '-5s', to: '1500px 690px' }, `<path fill="#9ad8ff" opacity=".18" d="M1500 690L1420 150L1580 150z"/>`)
        + `<path fill="url(#${p1})" d="M-160 900V690H1760V900z"/>`
        + `<path fill="#1d1640" d="M-160 800H1760V840H-160z"/><path fill="none" stroke="#e8d8ff" stroke-width="3" stroke-dasharray="40 30" opacity=".6" d="M-160 820H1760"/>`
        + mv('usmove', { ad: '9s', dx: '1900px' }, `<g><circle cx="0" cy="766" r="7" fill="#fff"/><circle cx="60" cy="768" r="7" fill="#fff"/><circle cx="170" cy="764" r="7" fill="#fff"/><circle cx="420" cy="766" r="7" fill="#fff"/><circle cx="560" cy="768" r="7" fill="#fff"/></g>`)
        + mv('usmove', { ad: '12s', dx: '-1900px' }, `<g><circle cx="800" cy="860" r="8" fill="#ff3a3a"/><circle cx="880" cy="864" r="8" fill="#ff3a3a"/><circle cx="1010" cy="858" r="8" fill="#ff3a3a"/><circle cx="1260" cy="862" r="8" fill="#ff3a3a"/></g>`)
        + mv('ussway2', { ad: '6s', to: '120px 900px' }, palm(120, 900, 1.3)) + mv('ussway2', { ad: '7s', d: '-2s', to: '1480px 900px' }, palm(1480, 900, 1.5)) + mv('ussway2', { ad: '8s', d: '-1s', to: '1000px 770px' }, palm(1000, 770, 0.6))
        + dots('M-60 718Q400 704 800 716S1300 704 1660 718', '#ffd27a', 7, 22, 'us-lamps')
        + finish(0.34); } });

  /* ---------- Phoenix: sun and saguaros ---------- */
  usSceneAdd({ key: 'place:phoenix', label: 'Sun and saguaros over Camelback', site: 'Camelback and the Valley of the Sun', colour: 'orange', mood: 'cheerful', season: 'any', tags: ['saguaro', 'camelback', 'desert', 'sun'],
    svg: () => { const s1 = U(), l1 = U(), g1 = U(), m1 = U();
      const rr = (x, y, s) => `<g fill="#3a2a2a"><ellipse cx="${x}" cy="${y}" rx="${R(22 * s)}" ry="${R(9 * s)}"/><path d="M${R(x + 18 * s)} ${R(y - 4 * s)}l${R(22 * s)} ${R(-20 * s)}l${R(8 * s)} ${R(4 * s)}l${R(-18 * s)} ${R(22 * s)}z"/><path d="M${R(x - 20 * s)} ${y}l${R(-44 * s)} ${R(-10 * s)}l${R(2 * s)} ${R(6 * s)}l${R(40 * s)} ${R(10 * s)}z"/></g><path fill="none" stroke="#3a2a2a" stroke-width="${R(3 * s)}" d="M${R(x - 6 * s)} ${R(y + 6 * s)}l${R(-8 * s)} ${R(18 * s)}M${R(x + 8 * s)} ${R(y + 6 * s)}l${R(8 * s)} ${R(18 * s)}"/>`;
      return `<defs>${lin(s1, [[0, '#c8482e'], [0.3, '#f0763a'], [0.58, '#ffae48'], [0.82, '#ffd870'], [1, '#fff0a8']])}${radU(l1, [[0, '#fff2b0', 0.75], [1, '#fff2b0', 0]], 1040, 540, 800)}${lin(g1, [[0, '#c27a4a'], [1, '#6a3a2a']])}${lin(m1, [[0, '#b8583a'], [1, '#7a3a34']])}</defs>`
        + full(`url(#${s1})`) + stars(181, 30, 180) + rays(1040, 540, 1000, '#fff0b0', 0.3) + sun(1040, 540, 100, '#fffbd8', '#ffc050')
        + streak(280, 150, 340, '#ffc480', 0.55) + streak(1240, 270, 300, '#ff9a60', 0.5, 70) + cloud(560, 320, 1.1, '#d8605a', 0.75, 60, 8, '#ffbe8a') + birds(182, 3, 700, 300, '#5a2a2a', 1.4, 800)
        + mv('uspar', { ad: '44s', dx: '8px' }, ridge('#a2543e', 590, 60, 9, 183, 680) + haze(540, 110, '#ffc890', 0.5))
        + mv('uspar', { ad: '36s', dx: '12px' }, `<path fill="url(#${m1})" d="M80 680C140 600 220 540 300 520C340 500 380 520 410 540C440 520 480 524 520 556C580 590 620 640 660 680z"/><path fill="#5a2a2c" opacity=".5" d="M410 540C440 520 480 524 520 556C580 590 620 640 660 680H430z"/><path fill="#e08a58" opacity=".45" d="M300 520C220 540 140 600 80 680H140C190 610 250 560 300 520z"/>`)
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + mv('uspar', { ad: '32s', dx: '14px' }, [[760, 60, 100], [826, 50, 150], [882, 74, 210], [962, 60, 120], [1028, 50, 170], [1084, 70, 110], [1160, 60, 140]].map(([x, w, h], i) => `<rect x="${x}" y="${690 - h}" width="${w}" height="${h}" fill="${i % 2 ? '#8a4a3a' : '#7a3e34'}"/>` + grid(x, 690 - h, w, h, 15, 22, '#3a1c1c')).join('') + `<path fill="#7a3e34" d="M882 480l37-60l37 60z"/>`)
        + `<path fill="url(#${g1})" d="M-160 900V690C200 676 600 700 900 686S1400 676 1760 692V900z"/>`
        + `<path fill="#8a4a30" opacity=".5" d="M-160 900V780C300 760 700 790 1100 772S1600 770 1760 780V900z"/>`
        + `<g fill="#7a8a4a" opacity=".85">${Array.from({ length: 40 }, (_, i) => `<ellipse cx="${(i * 97 + 20) % 1700 - 40}" cy="${720 + (i * 53) % 150}" rx="${14 + i % 4 * 6}" ry="${8 + i % 3 * 3}"/>`).join('')}</g>`
        + mv('usshim', { ad: '3s' }, `<path fill="none" stroke="#fff4c0" stroke-width="3" opacity=".7" d="M300 696q50-8 100 0t100 0t100 0M900 704q50-8 100 0t100 0t100 0"/>`)
        + mv('usmove', { ad: '14s', dx: '1900px' }, rr(0, 836, 1.1))
        + `<g fill="#f0a82a">${Array.from({ length: 20 }, (_, i) => `<circle cx="${40 + i * 82}" cy="${842 + (i * 37) % 50}" r="5"/>`).join('')}</g>`
        + mv('ussway2', { ad: '9s', to: '240px 900px' }, saguaro(240, 900, 1.8, '#2a3a24', '#6a8a4a')) + mv('ussway2', { ad: '11s', d: '-3s', to: '1400px 900px' }, saguaro(1400, 900, 2.4, '#26361f', '#6a8a4a'))
        + `<g fill="#3a4a2a">${saguaro(620, 760, 0.8, '#364a2c', '#6a8a4a')}${saguaro(1180, 750, 0.7, '#364a2c', '#6a8a4a')}</g>`
        + `<g fill="#d8442e" class="x-usglow" style="--ad:3s"><circle cx="220" cy="560" r="7"/><circle cx="1440" cy="440" r="8"/></g>`
        + finish(0.3); } });

  /* ---------- Oklahoma City: the skyline and the Ferris wheel ---------- */
  usSceneAdd({ key: 'place:oklahoma-city', label: 'Skyline, Skydance bridge and Ferris wheel', site: 'Bricktown and the Devon tower', colour: 'blue', mood: 'cheerful', season: 'any', tags: ['skyline', 'ferris wheel', 'bridge', 'bricktown'],
    svg: () => { const s1 = U(), l1 = U(), w1 = U(), d1 = U();
      let gond = '', spokes = '';
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, gx = R(Math.cos(a) * 150), gy = R(Math.sin(a) * 150); gond += `<rect x="${gx - 8}" y="${gy - 6}" width="16" height="16" rx="3" fill="${['#e8453a', '#ffd23e', '#3aa0e8', '#4ac86a'][i % 4]}"/>`; spokes += `M0 0L${gx} ${gy}`; }
      const ben = (x, w, h, c1) => `<rect x="${x}" y="${700 - h}" width="${w}" height="${h}" fill="${c1}"/>` + grid(x, 700 - h, w, h, 16, 22, '#2a1c1c');
      return `<defs>${lin(s1, [[0, '#2f78cc'], [0.45, '#6cb0e8'], [0.8, '#bce0f4'], [1, '#f4f0d8']])}${radU(l1, [[0, '#fff2c0', 0.5], [1, '#fff2c0', 0]], 1400, 200, 800)}${lin(w1, [[0, '#6aa8c0'], [1, '#2f6a8a']])}${linU(d1, [[0, '#b8e8f8'], [1, '#2a78a8']], 330, 150, 430, 700)}</defs>`
        + full(`url(#${s1})`) + stars(201, 24, 200) + rays(1400, 190, 900, '#fff4d0', 0.2) + sun(1400, 190, 40, '#fffbe4', '#ffe090')
        + cloud(300, 220, 1.5, '#a8c8e4', 0.94, 60, 6) + cloud(800, 150, 1.2, '#b0cce4', 0.92, 52, 22) + cloud(1200, 400, 1.3, '#b4cee6', 0.9, 70, 40) + cloud(60, 450, 1.0, '#b0cce4', 0.88, 66, 12) + birds(202, 4, 700, 340, '#2a3a5a', 1.1, 760)
        + mv('uspar', { ad: '36s', dx: '10px' }, `<g fill="#7a98b8">${[[100, 60, 100], [180, 80, 150], [1000, 70, 120], [1100, 90, 90], [1220, 70, 150], [1320, 80, 110]].map(([x, w, h]) => `<rect x="${x}" y="${690 - h}" width="${w}" height="${h}"/>`).join('')}</g>` + haze(560, 120, '#e4f0f6', 0.5))
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + mv('uspar', { ad: '30s', dx: '12px' }, ben(420, 110, 200, '#4a6a94') + ben(540, 80, 150, '#5a7aa4') + ben(640, 100, 250, '#4a6a94') + ben(760, 90, 170, '#5a7aa4') + ben(870, 90, 220, '#4a6a94'))
        + `<path fill="url(#${d1})" d="M330 700V280L350 160L380 100L410 160L430 280V700z"/><path fill="#fff" opacity=".25" d="M380 100L410 160L430 280V700H390z"/><path fill="none" stroke="#1f5a82" stroke-width="2" opacity=".6" d="M350 700V200M370 700V150M390 700V150M410 700V200"/><path fill="#1f5a82" d="M376 100h8V60h-8z"/><circle class="x-usglow" style="--ad:1.4s" cx="380" cy="56" r="5" fill="#ff4a3a"/>` + grid(330, 160, 100, 540, 14, 24, '#173a58')
        + `<path fill="none" stroke="#f4f4f8" stroke-width="22" stroke-linecap="round" d="M1130 720C1160 560 1170 400 1300 180"/>`
        + `<path fill="none" stroke="#c0c8d8" stroke-width="5" d="M1126 720C1156 560 1166 400 1294 184"/>`
        + `<g stroke="#e8ecf4" stroke-width="2.6" opacity=".9">${Array.from({ length: 11 }, (_, i) => `<path d="M${R(1186 + i * 4)} ${R(520 - i * 28)}L${R(1020 - i * 6)} 724M${R(1186 + i * 4)} ${R(520 - i * 28)}L${R(1320 + i * 26)} 724"/>`).join('')}</g>`
        + `<path fill="#9aa4b8" d="M980 724H1720V744H980z"/><path fill="#6a7488" d="M980 744H1720V752H980z"/>`
        + mv('usspin', { ad: '48s', to: '200px 360px' }, `<g transform="translate(200 360)"><circle r="160" fill="none" stroke="#f4f4f8" stroke-width="6"/><circle r="110" fill="none" stroke="#d8dce8" stroke-width="3"/><path stroke="#d8dce8" stroke-width="2.5" d="${spokes}"/>${gond}</g>`)
        + `<path fill="#e8ecf4" d="M186 720L200 360L214 720z"/><path fill="none" stroke="#e8ecf4" stroke-width="5" d="M140 720L200 360L260 720"/>`
        + `<path fill="url(#${w1})" d="M-160 790H1760V900H-160z"/>` + shimmer(203, 40, 0, 1600, 800, 890, '#e8f8ff', 50)
        + `<g fill="#8a3a2a"><path d="M-160 790V700H400V790z"/><path d="M1000 790V716H1760V790z"/></g>` + grid(-100, 700, 500, 90, 24, 26, '#2a1c1c') + grid(1000, 716, 700, 74, 24, 26, '#2a1c1c')
        + `<path fill="#b8503a" d="M-160 700H400V716H-160zM1000 716H1760V730H1000z"/>`
        + mv('usmove', { ad: '26s', dx: '800px' }, `<g><path fill="#f4f0e4" d="M500 820h130l-14 26H514z"/><path fill="#e8453a" d="M520 806h90v14h-90z"/><path fill="#fff" d="M540 790h50v16h-50z"/></g>`)
        + `<path fill="#a8502a" d="M-160 900V860C300 846 800 866 1200 852S1600 858 1760 860V900z"/>`
        + `<g fill="#7a9a3a">${Array.from({ length: 30 }, (_, i) => `<path d="M${-60 + i * 62} 900l6-${20 + i % 4 * 8}l8 ${20 + i % 4 * 8}z"/>`).join('')}</g>`
        + mv('ussway2', { ad: '5s', to: '1500px 900px' }, `<g fill="#d8a22e">${Array.from({ length: 10 }, (_, i) => `<path d="M${1380 + i * 22} 900q${i % 2 ? 8 : -8}-60 ${i % 3 * 6} -${80 + i % 4 * 14}"/>`).join('')}</g><g stroke="#d8a22e" stroke-width="4" fill="none">${Array.from({ length: 10 }, (_, i) => `<path d="M${1380 + i * 22} 900q${i % 2 ? 8 : -8}-60 ${i % 3 * 6} -${80 + i % 4 * 14}"/>`).join('')}</g>`)
        + dots('M-60 745Q200 730 400 745M1000 748Q1300 734 1660 748', '#ffd27a', 7, 24, 'us-lamps')
        + finish(0.3); } });
})();
