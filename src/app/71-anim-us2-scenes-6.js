/* ============================================================
   US FULL-SCREEN SCENES, batch 6 (Midwest cities and Mountain states). Drawn with usSceneKit() (71-anim-us.js),
   the same toolkit and layering as the Texas scenes: 1600 x 900 user units, sliced to fill any screen; sky and its light,
   far / mid / near layers that drift, the landmark, a foreground and ambient life. Colours are painted for daytime;
   finish() lays the evening grade and .us-lit / .us-lamps / .us-star light up at dusk. Motion is transform and opacity only.
     place:cincinnati place:detroit place:milwaukee place:minneapolis place:st-louis place:kansas-city place:omaha
     state:AZ state:CO state:ID state:MT
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, mesa, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish, star5 } = K;

  /** A grid of lit windows as one path (class us-lit). cols x rows of w x h panes spaced gx, gy; p = share that are on. */
  const win = (x, y, cols, rows, gx, gy, w, h, seed, p) => {
    const r = rnd(seed); let d = '';
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (r() < (p == null ? 0.55 : p)) d += `M${x + i * gx} ${y + j * gy}h${w}v${h}h${-w}z`;
    return `<path class="us-lit" d="${d}"/>`;
  };
  /** A row of towers standing on y = base from x0 to x1: random widths and heights, a lit-window grid on each. */
  const skyline = (x0, x1, base, hmin, hmax, seed, fill, edge, wl) => {
    const r = rnd(seed); let o = '', x = x0;
    while (x < x1) {
      const w = R(34 + r() * 56), h = R(hmin + r() * (hmax - hmin)), top = r();
      o += `<path fill="${fill}" d="M${x} ${base}V${base - h}${top > 0.8 ? `l${R(w / 2)} -${R(18 + r() * 24)}l${R(w / 2)} ${R(18)}` : `h${w}`}V${base}z"/>`;
      if (edge) o += `<rect x="${x + w - 7}" y="${base - h}" width="7" height="${h}" fill="${edge}"/>`;
      if (top > 0.45 && top <= 0.8) o += `<rect x="${x + R(w / 2) - 2}" y="${base - h - R(24 + r() * 40)}" width="4" height="${R(30 + r() * 40)}" fill="${fill}"/>`;
      if (wl !== false) o += win(x + 7, base - h + 12, Math.max(1, R((w - 14) / 12)), Math.max(1, R((h - 20) / 18)), 12, 18, 5, 8, R(x + seed), 0.5);
      x += w + R(r() * 6);
    }
    return o;
  };
  /** Two-tone water: reflection wash of a colour with a column of glints. */
  const glints = (seed, n, x0, x1, y0, y1, col, w) => shimmer(seed, n, x0, x1, y0, y1, col, w);
  /** A jagged range from x -160 to 1760: n peaks over a notch line at y, ragged slopes, snow caps, and a lit face (lite = opacity) on the right of each peak. */
  const saw = (y, amp, n, seed, fill, snow, lite) => {
    const r = rnd(seed); let d = `M-160 900V${y}`, x = -160, lt = '', sn = ''; const w = 1920 / n;
    for (let i = 0; i < n; i++) {
      const px = x + w * (0.35 + r() * 0.3), py = y - amp * (0.5 + r() * 0.5), nx = x + w, ny = y - amp * 0.12 * r();
      const j = (t, a, b) => `L${R(a[0] + (b[0] - a[0]) * t + (r() - 0.5) * w * 0.06)} ${R(a[1] + (b[1] - a[1]) * t + (r() - 0.5) * amp * 0.1)}`;
      const A = [x, i ? y - amp * 0.1 : y], P = [px, py], N = [nx, ny];
      d += j(0.35, A, P) + j(0.68, A, P) + `L${R(px)} ${R(py)}` + j(0.3, P, N) + j(0.62, P, N) + `L${R(nx)} ${R(ny)}`;
      if (lite) lt += `M${R(px)} ${R(py)}L${R(nx - w * 0.1)} ${R(ny + 6)}L${R(px + (nx - px) * 0.18)} ${R(py + amp * 0.7)}z`;
      if (snow) sn += `M${R(px)} ${R(py)}l${R(-24 - (px % 13))} ${R(40 + (px % 19))}l${R(12)} ${R(-8)}l${R(10)} ${R(18)}l${R(8)} ${R(-22)}l${R(14)} ${R(14)}z`;
      x += w;
    }
    return `<path fill="${fill}" d="${d}V900z"/>` + (lite ? `<path fill="#fff" opacity="${lite}" d="${lt}"/>` : '') + (snow ? `<path fill="${snow}" d="${sn}"/>` : '');
  };
  const tree = (x, y, s, dark, lite) => `<g><rect x="${x - R(3 * s)}" y="${y - R(22 * s)}" width="${R(6 * s)}" height="${R(24 * s)}" fill="#4a3526"/><circle cx="${x}" cy="${y - R(44 * s)}" r="${R(30 * s)}" fill="${dark}"/><circle cx="${x - R(10 * s)}" cy="${y - R(52 * s)}" r="${R(18 * s)}" fill="${lite}" opacity=".8"/></g>`;
  const pine = (x, y, s, dark, lite) => { let o = `<rect x="${x - R(3 * s)}" y="${y - R(14 * s)}" width="${R(6 * s)}" height="${R(16 * s)}" fill="#3a2a22"/>`; for (let i = 0; i < 4; i++) { const w = (34 - i * 6) * s, yy = y - (14 + i * 24) * s; o += `<path fill="${dark}" d="M${R(x - w)} ${R(yy)}L${x} ${R(yy - 40 * s)}L${R(x + w)} ${R(yy)}z"/>`; } return o + `<path fill="${lite}" opacity=".35" d="M${x} ${R(y - 110 * s)}l${R(26 * s)} ${R(70 * s)}h${R(-26 * s)}z"/>`; };

  /* ---------- Cincinnati: the Roebling bridge at sunset, a flying pig, a steamboat ---------- */
  usSceneAdd({ key: 'place:cincinnati', label: 'Roebling bridge at sunset', site: 'The Roebling Suspension Bridge', colour: 'pink', mood: 'cheerful', season: 'any', tags: ['bridge', 'river', 'flying pig', 'sunset'],
    svg: () => { const s1 = U(), w1 = U(), r1 = U(), g1 = U();
      const hang = () => { let d = ''; for (let x = 470; x <= 1130; x += 22) { const k = (x - 800) / 370, y = 402 + 190 * (1 - k * k); d += `M${x} ${R(y)}V646`; } return d; };
      const cab = (dx) => { let d = 'M430 402'; for (let x = 430; x <= 1170; x += 37) { const k = (x - 800) / 370; d += `L${x} ${R(402 + 190 * (1 - k * k) + dx)}`; } return d; };
      const tower = (x) => `<path fill="#7a6568" d="M${x - 34} 660V430l8 -14h52l8 14V660z"/><path fill="#5d4b50" d="M${x + 8} 660V430l8 -14h10l8 14V660z"/><path fill="#8d7679" d="M${x - 40} 412h80l-6 -14h-68z"/><path fill="#43353a" d="M${x - 22} 660V560a14 14 0 0 1 28 0V660zM${x - 22} 520V484a14 14 0 0 1 28 0V520z"/><path fill="#8d7679" d="M${x - 5} 398l5 -22l5 22z"/>`;
      const pig = () => mv('usglide', { ad: '34s', d: '-6s', dx: '700px', dy: '-60px' }, `<g><ellipse cx="0" cy="0" rx="26" ry="19" fill="#f6a5b8"/><circle cx="26" cy="-3" r="13" fill="#f6a5b8"/><ellipse cx="37" cy="0" rx="7" ry="5.5" fill="#ee7f9a"/><path fill="#ee7f9a" d="M22 -14l6 -9l4 11z"/><circle cx="29" cy="-7" r="2" fill="#3a2230"/><path fill="none" stroke="#ee7f9a" stroke-width="3" stroke-linecap="round" d="M-26 -2q-10 -8 -4 -14q6 4 -2 8"/><rect x="-14" y="14" width="5" height="9" fill="#ee7f9a"/><rect x="12" y="14" width="5" height="9" fill="#ee7f9a"/>${mv('usflap', { ad: '.55s', to: '0px 0px' }, `<path fill="#fff" stroke="#e7a4b8" stroke-width="1.5" d="M-4 -12q-6 -34 -32 -40q4 18 8 30q8 -4 10 4q8 -6 14 6z"/><path fill="#fff" stroke="#e7a4b8" stroke-width="1.5" d="M6 -12q8 -34 36 -38q-6 18 -10 30q-8 -4 -10 4q-8 -6 -16 4z"/>`)}</g>`).replace('<g class="x-usglide"', '<g transform="translate(560 250) scale(1.7)"><g class="x-usglide"') + '</g>';
      return `<defs>${lin(s1, [[0, '#4b4f96'], [0.35, '#b7689c'], [0.62, '#ff9a6e'], [0.8, '#ffd08a']])}${lin(w1, [[0, '#f0a784'], [0.25, '#8b6a9a'], [1, '#2f3f6e']])}${radU(r1, [[0, '#ffe2a8', 0.8], [1, '#ffe2a8', 0]], 1010, 560, 700)}${lin(g1, [[0, '#3f5a46'], [1, '#233a33']])}</defs>`
        + full(`url(#${s1})`) + stars(41, 30, 160) + rays(1010, 560, 1100, '#ffe2b0', 0.2) + sun(1010, 548, 52, '#fff1c8', '#ffc77a')
        + streak(280, 190, 320, '#ffb9a0', 0.55) + streak(1250, 140, 380, '#ffc5a0', 0.5) + cloud(220, 300, 1.2, '#d8789c', 0.9, 60, 6, '#ffc1b0') + cloud(1280, 330, 1.4, '#d0709a', 0.88, 70, 30, '#ffb89c') + cloud(700, 180, 0.9, '#cf7aa6', 0.8, 52, 18, '#ffcdb4')
        + birds(14, 6, 1100, 240, '#4a3350', 1.1, 520) + pig()
        + mv('uspar', { ad: '40s', dx: '8px' }, ridge('#6f5a86', 520, 36, 9, 61) + haze(500, 80, '#f7b79a', 0.5))
        + mv('uspar', { ad: '34s', dx: '12px' }, skyline(-120, 1700, 612, 40, 150, 17, '#7d5f79', '#6a4e68') + `<path fill="#9a7686" d="M1300 612V430l14 -16h46l14 16V612zM1330 414V346l10 -22l10 22V414z"/><path fill="#a98a92" d="M1330 612V340l10 -16v288z" opacity=".5"/>` + win(1310, 440, 4, 9, 14, 18, 6, 9, 5, 0.55))
        + `<path fill="#a98a92" d="M1004 612V470h82V612z"/><path fill="#bb9ca0" d="M1016 470V404h58V470z"/><path fill="#cdb0b0" d="M1030 404V346h30V404z"/><path fill="#d6bcb8" d="M1040 346V300h10V346zM1044 300V262h2V300z"/>` + win(1010, 480, 5, 7, 15, 18, 6, 9, 3, 0.5) + win(1022, 414, 3, 3, 16, 18, 6, 9, 4, 0.6)
        + `<rect y="612" width="1600" height="288" fill="url(#${w1})"/><rect y="612" width="1600" height="288" fill="url(#${r1})" opacity=".8"/>`
        + `<path fill="#fff1c0" opacity=".28" d="M960 616h100l60 284H900z"/>` + glints(77, 34, 880, 1160, 630, 900, '#ffe9b8', 52) + glints(78, 24, -100, 1700, 640, 900, '#f9c9a2', 30)
        + mv('usmove', { ad: '60s', dx: '900px' }, `<g transform="translate(300 745)"><path fill="#2a2036" d="M0 0h190l20 -22h-210z"/><path fill="#f3e9e4" d="M18 -22h150v-26h-150z"/><path fill="#d9c9c8" d="M26 -48h134v-20h-134z"/><path fill="#c9413a" d="M44 -68h30v-30h-30zM100 -68h30v-30h-30z"/><path fill="#2a2036" d="M52 -98h14v-34h-14zM108 -98h14v-34h-14z"/><rect x="-24" y="-42" width="26" height="42" rx="6" fill="#b4302f"/><path stroke="#fff" stroke-width="2" d="M-18 -38v34M-12 -38v34M-6 -38v34"/>${win(28, -42, 10, 1, 14, 0, 7, 10, 1, 1)}</g>` + puffs(430, 618, 4, '#f7e6e6', 12, 30, 4, -90, 3) + puffs(500, 618, 4, '#f7e6e6', 12, 30, 4.4, -90, 3))
        + `<path fill="none" stroke="#3b2c3c" stroke-width="3" d="${cab(0)}"/><path fill="none" stroke="#3b2c3c" stroke-width="2.4" d="${cab(10)}" opacity=".8"/><path fill="none" stroke="#3b2c3c" stroke-width="3" d="M430 402L-160 640M1170 402L1760 640"/><path fill="none" stroke="#4c3a48" stroke-width="1.4" d="${hang()}"/>`
        + `<path fill="#3f2f3d" d="M-160 640H1760v14H-160z"/><path fill="none" stroke="#3f2f3d" stroke-width="2" d="M-160 660L${Array.from({ length: 49 }, (_, i) => `${-160 + (i + 1) * 40} ${i % 2 ? 660 : 678}`).join('L')}"/><path fill="#4c3a48" d="M-160 654H1760v6H-160z"/>` + tower(430) + tower(1170)
        + `<g fill="#26192a" opacity=".9">${tower(430).slice(0, 0)}</g>`
        + mv('usmove', { ad: '26s', dx: '1400px' }, `<g transform="translate(0 636)"><rect width="30" height="10" rx="3" fill="#f2e1d6"/><rect x="40" width="30" height="10" rx="3" fill="#c93a3a"/><rect x="82" width="30" height="10" rx="3" fill="#35466b"/><circle class="us-lamps" cx="112" cy="5" r="3" fill="#fff"/></g>`)
        + mv('uspar', { ad: '28s', dx: '16px' }, `<path fill="url(#${g1})" d="M-160 900V822Q200 780 520 820T1000 800Q1300 770 1760 810V900z"/>` + canopy('#2c4437', 812, 22, 33, -160, 700) + canopy('#2a4136', 800, 20, 34, 1000, 1760))
        + `<path fill="#1f3029" d="M-160 900V850H1760V900z"/>` + dots('M-160 846H1760', '#ffe3a0', 5, 38, 'us-lamps') + finish(0.34); } });

  /* ---------- Detroit: the Renaissance Center across the river, a freighter passing, dawn ---------- */
  usSceneAdd({ key: 'place:detroit', label: 'Riverfront towers at dawn', site: 'The Renaissance Center', colour: 'slate', mood: 'proud', season: 'any', tags: ['skyline', 'river', 'freighter', 'dawn'],
    svg: () => { const s1 = U(), w1 = U(), c1 = U(), c2 = U(), r1 = U();
      const cyl = (x, top, w, base, fid) => `<rect x="${x - w / 2}" y="${top}" width="${w}" height="${base - top}" fill="url(#${fid})"/>`
        + `<path fill="none" stroke="#cfe6f2" stroke-width="1.2" opacity=".35" d="${Array.from({ length: Math.floor((base - top) / 15) }, (_, i) => `M${x - w / 2} ${top + 10 + i * 15}h${w}`).join('')}"/>` + win(x - w / 2 + 6, top + 14, Math.floor((w - 10) / 11), Math.floor((base - top - 24) / 30), 11, 30, 5, 7, R(x), 0.35);
      return `<defs>${lin(s1, [[0, '#7e98b6'], [0.4, '#b9c6d6'], [0.62, '#f3d3bd'], [0.8, '#f7a977']])}${lin(w1, [[0, '#d9a98a'], [0.12, '#7d93a8'], [1, '#2b4057']])}`
        + `<linearGradient id="${c1}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#43647f"/><stop offset=".35" stop-color="#8fb8cf"/><stop offset=".6" stop-color="#5f869f"/><stop offset="1" stop-color="#2b4559"/></linearGradient>`
        + `<linearGradient id="${c2}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b5870"/><stop offset=".4" stop-color="#7ea8c0"/><stop offset="1" stop-color="#253f52"/></linearGradient>${radU(r1, [[0, '#ffd9a6', 0.8], [1, '#ffd9a6', 0]], 1180, 560, 560)}</defs>`
        + full(`url(#${s1})`) + stars(52, 22, 140) + sun(1180, 556, 40, '#fff1d0', '#ffcf94', true)
        + streak(300, 150, 360, '#fff', 0.45) + cloud(240, 230, 1.3, '#aebccb', 0.9, 66, 6, '#e8e6e8') + cloud(1300, 190, 1.5, '#b0bdca', 0.9, 74, 28, '#efe3de') + cloud(800, 120, 0.9, '#b4c1cc', 0.85, 58, 14, '#eee')
        + birds(23, 6, 980, 320, '#3d4b5b', 1.1, 560)
        + mv('uspar', { ad: '44s', dx: '8px' }, skyline(-120, 1700, 600, 40, 130, 91, '#8fa1b3', '#7f92a5', false) + haze(520, 90, '#f0d2bc', 0.4))
        + mv('uspar', { ad: '36s', dx: '12px' }, skyline(-120, 600, 600, 90, 210, 71, '#667d92', '#586e82', false) + skyline(1010, 1700, 600, 80, 190, 72, '#667d92', '#586e82', false))
        + `<g>${cyl(800, 150, 96, 610, c1)}<path fill="#2b4559" d="M752 150h96l-10 -14h-76z"/><rect x="796" y="104" width="8" height="34" fill="#2b4559"/>${cyl(690, 280, 62, 610, c2)}${cyl(910, 280, 62, 610, c2)}${cyl(738, 300, 56, 610, c2)}${cyl(862, 300, 56, 610, c2)}<path fill="#d9ecf5" opacity=".25" d="M780 160h14v440h-14z"/><path fill="#26394a" d="M590 610V540h420v70z"/><path fill="#a9cbdc" opacity=".6" d="M600 548h400v14H600z"/>${win(604, 566, 36, 2, 11, 18, 7, 9, 4, 0.5)}<path fill="#fff" opacity=".6" d="M800 150l-4 -12h8z"/></g>`
        + `<rect y="600" width="1600" height="300" fill="url(#${w1})"/><rect y="600" width="1600" height="300" fill="url(#${r1})" opacity=".6"/>`
        + `<g opacity=".45" transform="translate(0 1210) scale(1 -1)"><rect x="754" y="150" width="92" height="450" fill="#46657d"/><rect x="660" y="280" width="62" height="320" fill="#46657d"/><rect x="880" y="280" width="62" height="320" fill="#46657d"/></g><rect y="600" width="1600" height="300" fill="url(#${w1})" opacity=".55"/>`
        + glints(88, 40, 560, 1060, 612, 760, '#e9f2f8', 46) + glints(89, 26, -100, 1700, 620, 900, '#f0cfae', 34)
        + mv('usmove', { ad: '70s', dx: '1300px' }, `<g transform="translate(620 746)"><path fill="#a7332f" d="M-30 -30h470l30 -8l-24 54h-440z"/><path fill="#1f2a36" d="M-30 -4h464l-12 20h-440z"/><path fill="#7a756f" d="M60 -30h250v-8h-250z"/><path fill="#e9ecef" d="M-30 -30V-70h58V-30z"/><path fill="#d3d7dc" d="M-30 -70h58l6 -10h-70z"/><rect x="-18" y="-92" width="10" height="22" fill="#3b4856"/><path fill="#1f2a36" d="M-14 -92h4v-18h-4z"/><path fill="#e9ecef" d="M395 -38V-58h34V-38z"/><path fill="#d8d0c4" d="M60 -38h240v6H60z"/><path class="us-lit" d="M-24 -58h6v8h-6zM-12 -58h6v8h-6zM0 -58h6v8h0z"/></g>` + puffs(604, 664, 4, '#cfd5dc', 14, 40, 5, -80, 3))
        + mv('uspar', { ad: '30s', dx: '14px' }, `<path fill="#3a4a3f" d="M-160 900V830Q300 800 700 828T1400 818Q1600 810 1760 822V900z"/><path fill="#516455" d="M-160 900V862Q400 846 800 860T1760 856V900z"/>`)
        + `<path fill="#2a3640" d="M-160 868H1760V900H-160z"/>` + [90, 330, 570, 1030, 1270, 1510].map(x => `<path fill="#2a3640" d="M${x - 3} 868V784h6V868z"/><path fill="#2a3640" d="M${x - 14} 786h28l-4 -8h-20z"/><circle class="us-lit" cx="${x}" cy="772" r="8"/>`).join('')
        + dots('M-160 872H1760', '#ffe0a8', 4, 46, 'us-lamps') + finish(0.34); } });

  /* ---------- Milwaukee: the Art Museum's wings above Lake Michigan ---------- */
  usSceneAdd({ key: 'place:milwaukee', label: 'The Art Museum wings on the lake', site: 'The Milwaukee Art Museum', colour: 'teal', mood: 'proud', season: ['summer'], tags: ['museum', 'lake', 'sailboats', 'architecture'],
    svg: () => { const s1 = U(), w1 = U(), l1 = U(), g1 = U(), h1 = U();
      const wing = (dir) => { let fins = '', spine = ''; const n = 40;
        for (let i = 0; i <= n; i++) { const t = i / n, sx = 800 + dir * (30 + 560 * t), sy = 468 - 120 * t + 40 * t * t, L = 40 + 190 * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.95)) * (1 - 0.15 * t), ex = sx + dir * (60 * (1 - t) + 18), ey = sy - L;
          fins += `M${R(sx - dir * 3)} ${R(sy)}L${R(ex)} ${R(ey)}L${R(ex + dir * 5)} ${R(ey + 3)}L${R(sx + dir * 3)} ${R(sy)}z`; spine += `${i ? 'L' : 'M'}${R(sx)} ${R(sy)}`; }
        return `<path fill="#fbfdff" d="${fins}"/><path fill="none" stroke="#c9d6e2" stroke-width="2" d="${spine}"/>`; };
      const sail = (x, y, s, c) => mv('usbob', { ad: (3 + (x % 3)).toFixed(1) + 's', d: -(x % 4) + 's', dy: '2px' }, `<path fill="#fff" d="M${x} ${y - 70 * s}V${y}h${R(-44 * s)}z"/><path fill="${c}" d="M${x + 4} ${y - 52 * s}V${y}h${R(30 * s)}z"/><path fill="#3a4658" d="M${R(x - 48 * s)} ${y + 3}h${R(86 * s)}l${R(-12 * s)} ${R(10 * s)}h${R(-62 * s)}z"/>`);
      return `<defs>${lin(s1, [[0, '#3f8fd8'], [0.55, '#8ec7f0'], [0.85, '#d9eefb']])}${lin(w1, [[0, '#6cb7d9'], [0.3, '#2f8fbf'], [1, '#14527f']])}${radU(l1, [[0, '#fffbe2', 0.6], [1, '#fffbe2', 0]], 1280, 90, 800)}${lin(g1, [[0, '#8cc067'], [1, '#4c8a3c']])}${lin(h1, [[0, '#ffffff'], [1, '#d3dde8']])}</defs>`
        + full(`url(#${s1})`) + rays(1280, 90, 1100, '#fffbe0', 0.18) + sun(1280, 90, 40, '#fffdf0', '#fff4c0')
        + streak(260, 130, 300, '#fff', 0.7) + cloud(260, 110, 1.0, '#dbe8f4', 0.96, 56, 8) + cloud(1000, 90, 0.8, '#dbe8f4', 0.92, 64, 26) + cloud(1450, 190, 0.8, '#e3eef7', 0.9, 50, 14) + cloud(700, 150, 0.7, '#e8f1f9', 0.9, 70, 38)
        + birds(31, 7, 400, 330, '#ffffff', 1.2, 620)
        + `<rect y="520" width="1600" height="380" fill="url(#${w1})"/>` + `<path fill="#bfe3f4" opacity=".5" d="M-160 520H1760v8H-160z"/>` + glints(44, 60, -100, 1700, 535, 620, '#e8f8ff', 56) + glints(45, 18, 500, 1100, 535, 610, '#fff', 40)
        + mv('uspar', { ad: '40s', dx: '10px' }, skyline(-100, 560, 526, 20, 76, 12, '#aebfd0', null, false) + skyline(1100, 1700, 526, 20, 80, 13, '#aebfd0', null, false))
        + mv('usmove', { ad: '120s', dx: '700px' }, sail(240, 600, 0.9, '#e0463a')) + mv('usmove', { ad: '150s', d: '-40s', dx: '600px' }, sail(1150, 590, 0.7, '#2b6fb8') + sail(1230, 598, 0.55, '#f0b429')) + mv('usmove', { ad: '170s', d: '-90s', dx: '500px' }, sail(620, 566, 0.4, '#2fa38a') + sail(1420, 560, 0.35, '#e0463a'))
        + `<path fill="url(#${g1})" d="M-160 900V610Q300 590 600 606T1100 600Q1400 590 1760 608V900z"/><path fill="#d9cfb8" d="M-160 640Q300 626 640 636T1180 630Q1500 624 1760 640V664Q1400 650 1100 656T640 662Q300 652 -160 664z"/>`
        + `<path fill="url(#${h1})" d="M560 640Q560 520 680 496L800 468L920 496Q1040 520 1040 640z"/><path fill="#9fc6dc" d="M600 640Q600 548 690 520L800 498L910 520Q1000 548 1000 640z"/><path fill="none" stroke="#fff" stroke-width="3" d="M640 640Q640 560 700 540M720 640Q720 540 760 520M800 640V500M880 640Q880 540 840 520M960 640Q960 560 900 540"/><path fill="#7ea8c2" opacity=".5" d="M600 640V600H1000V640z"/><path fill="#fff" d="M540 640H1060v8H540z"/>`
        + `<g class="x-ussway2" style="--ad:9s;transform-box:view-box;transform-origin:800px 470px">${wing(-1)}</g><g class="x-ussway2" style="--ad:9s;--d:-3s;transform-box:view-box;transform-origin:800px 470px">${wing(1)}</g>`
        + `<path fill="#f4f8fc" d="M800 476l-12 -8l12 -16l12 16z"/>`
        + `<path fill="#fff" d="M392 640L382 220L398 216L418 640z"/><path fill="#d3dde8" d="M398 216L418 640h-8z"/><path fill="none" stroke="#fff" stroke-width="1.8" d="M390 232L180 640M390 262L240 640M390 300L300 640M390 232L500 640M390 262L520 640M390 300L480 640"/><path fill="#e8eef4" d="M120 628H520v12H120z"/>`
        + mv('uspar', { ad: '26s', dx: '16px' }, `<path fill="#3f7a35" d="M-160 900V780Q200 760 500 790T1000 776Q1400 764 1760 790V900z"/>` + tree(180, 800, 1.6, '#2f6a2c', '#58a048') + tree(1420, 790, 1.8, '#2f6a2c', '#58a048') + tree(1530, 800, 1.3, '#2b6329', '#4f9644'))
        + `<g fill="none" stroke-linecap="round"><path stroke="#e3b84a" stroke-width="9" stroke-dasharray="0 14" d="M-100 850H1700"/><path stroke="#f26a5b" stroke-width="7" stroke-dasharray="0 22" d="M-80 872H1700"/><path stroke="#fff" stroke-width="6" stroke-dasharray="0 26" d="M-60 886H1700"/></g>`
        + dots('M120 628H520', '#fff6cf', 4, 24, 'us-lamps') + finish(0.3); } });

  /* ---------- Minneapolis: the Spoonbridge and Cherry in the sculpture garden, skyline behind ---------- */
  usSceneAdd({ key: 'place:minneapolis', label: 'Spoonbridge and Cherry', site: 'The Spoonbridge and Cherry', colour: 'red', mood: 'cheerful', season: ['summer'], tags: ['sculpture', 'garden', 'skyline', 'cherry'],
    svg: () => { const s1 = U(), p1 = U(), g1 = U(), sp = U(), ch = U(), l1 = U();
      const kite = (x, y, c) => mv('usbob', { ad: '4.2s', d: -(x % 5) + 's', dy: '14px' }, `<g class="x-ussway2" style="--ad:3s;transform-box:view-box;transform-origin:${x}px ${y}px"><path fill="${c}" d="M${x} ${y - 30}l22 30l-22 30l-22 -30z"/><path fill="#fff" opacity=".55" d="M${x} ${y - 30}l22 30h-22z"/><path fill="none" stroke="#fff" stroke-width="1.6" d="M${x} ${y + 30}q-20 60 -4 120q16 50 -16 100"/></g>`);
      return `<defs>${lin(s1, [[0, '#3c93e0'], [0.6, '#92cdf3'], [1, '#e2f3fb']])}${lin(p1, [[0, '#5d9fb5'], [1, '#2b7a96']])}${lin(g1, [[0, '#8fcb5e'], [1, '#4c963a']])}`
        + `<linearGradient id="${sp}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfdff"/><stop offset=".5" stop-color="#b7c3cf"/><stop offset="1" stop-color="#6c7a88"/></linearGradient>`
        + `<radialGradient id="${ch}" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ff7a6a"/><stop offset=".45" stop-color="#d81e2c"/><stop offset="1" stop-color="#7d0c1c"/></radialGradient>${radU(l1, [[0, '#fff9d8', 0.55], [1, '#fff9d8', 0]], 200, 60, 800)}</defs>`
        + full(`url(#${s1})`) + rays(200, 60, 1100, '#fffbe0', 0.16) + sun(200, 70, 36, '#fffdf0', '#fff4c0')
        + streak(900, 120, 340, '#fff', 0.7) + cloud(1200, 220, 1.3, '#d6e6f3', 0.96, 62, 8) + cloud(500, 160, 1.0, '#d9e8f4', 0.95, 54, 24) + cloud(900, 300, 0.7, '#e6f1f9', 0.9, 70, 40)
        + birds(35, 6, 1000, 260, '#41536a', 1.1, 560)
        + mv('uspar', { ad: '40s', dx: '8px' }, skyline(-120, 1700, 560, 30, 110, 21, '#9bb6cf', '#88a3be', false))
        + mv('uspar', { ad: '34s', dx: '12px' }, skyline(-120, 360, 566, 60, 150, 22, '#7f9bb6', '#6e8aa5', false) + skyline(1240, 1700, 566, 60, 140, 23, '#7f9bb6', '#6e8aa5', false)
          + `<path fill="#5f8cb4" d="M520 566V260h110V566z"/><path fill="#4d7aa2" d="M606 566V260h24V566z"/><path fill="#6f9cc4" d="M528 260V232h94V260zM540 232V210h70V232zM552 210V196h46V210z"/><path fill="#8fb8d8" opacity=".6" d="M538 566V270h8V566zM566 566V270h6V566z"/>${win(530, 276, 7, 14, 14, 20, 7, 11, 8, 0.45)}`
          + `<path fill="#c9c0b0" d="M780 566V330h60V566z"/><path fill="#b3a998" d="M780 330l30 -80l30 80z"/><path fill="#d8cfbe" d="M792 330V270l18 -50l18 50V330z"/><rect x="808" y="168" width="4" height="52" fill="#b3a998"/>${win(788, 340, 4, 9, 14, 20, 6, 10, 9, 0.5)}`
          + `<path fill="#7494b8" d="M950 566V380h90V566z"/><path fill="#5f7fa3" d="M1020 566V380h20V566z"/><path fill="#86a6c6" d="M950 380l45 -30l45 30z"/>${win(958, 392, 6, 8, 13, 20, 6, 10, 10, 0.5)}`)
        + `<path fill="url(#${g1})" d="M-160 900V560Q300 548 800 556T1760 552V900z"/>` + canopy('#3f8a3a', 566, 30, 41, -160, 480, 600) + canopy('#3a8236', 570, 28, 42, 1180, 1760, 600)
        + `<path fill="#e8d9b8" d="M-160 640Q300 620 800 628T1760 622V650Q1300 646 800 652T-160 662z"/><g opacity=".12">${Array.from({ length: 5 }, (_, i) => `<path fill="#fff" d="M-160 ${580 + i * 14}H1760v4H-160z"/>`).join('')}</g>`
        + `<path fill="url(#${p1})" d="M200 760Q220 680 520 672Q800 664 1100 672Q1400 680 1400 760Q1400 860 800 872Q200 862 200 760z"/><path fill="#fff" opacity=".18" d="M300 730Q500 700 800 700T1300 730Q1000 716 800 716T300 730z"/>` + glints(51, 40, 300, 1300, 690, 850, '#e9fbff', 50)
        + `<path fill="#6f7f8c" opacity=".35" d="M360 842Q560 790 640 806Q900 872 1100 800Q1200 790 1260 840Q800 890 360 842z"/>`
        + `<path fill="url(#${sp})" d="M330 760Q330 744 360 740Q480 724 560 640Q580 616 612 628Q650 644 740 712Q760 724 820 724H1180Q1270 724 1270 748Q1270 784 1180 784H820Q750 784 700 748Q630 700 590 668Q570 656 560 672Q490 764 360 780Q330 782 330 760z"/><path fill="#fff" opacity=".8" d="M360 744Q490 730 566 648Q584 628 606 636Q540 650 500 700Q440 742 360 752z"/><path fill="#5d6b78" opacity=".5" d="M830 778H1180Q1250 778 1262 756Q1230 790 1180 790H820z"/><ellipse cx="1000" cy="738" rx="170" ry="16" fill="#a4b1bd"/><ellipse cx="1000" cy="732" rx="150" ry="10" fill="#dce4ec"/>`
        + `<path fill="#6e7b88" d="M996 624Q1010 560 1040 520q6 -8 12 -4q4 6 -2 14Q1022 570 1016 628z"/>`
        + `<circle cx="1000" cy="672" r="70" fill="url(#${ch})"/><ellipse cx="974" cy="646" rx="18" ry="12" fill="#fff" opacity=".6" transform="rotate(-30 974 646)"/><ellipse cx="1000" cy="734" rx="68" ry="9" fill="#5a0a16" opacity=".4"/>`
        + puffs(1048, 518, 9, '#eafaff', 10, 36, 2.8, -10, 3.2) + puffs(1048, 518, 6, '#cfeefa', 7, -40, 3.2, 40, 2.4)
        + kite(1360, 200, '#f2493e') + kite(240, 250, '#ffd23f')
        + mv('uspar', { ad: '26s', dx: '16px' }, `<path fill="#3c8a37" d="M-160 900V830Q200 810 400 840T800 900H-160z"/>` + tree(120, 860, 2.0, '#2f7a30', '#58b048') + tree(1500, 860, 2.2, '#2c742d', '#4fa543') + `<path fill="#3c8a37" d="M1760 900V830Q1500 810 1300 840T1000 900z"/>`)
        + Array.from({ length: 26 }, (_, i) => `<circle cx="${40 + i * 62 + (i % 3) * 8}" cy="${878 + (i % 4) * 5}" r="6" fill="${['#ffd23f', '#fff', '#ff7a7a'][i % 3]}"/>`).join('')
        + `<rect width="1600" height="900" fill="url(#${l1})"/>` + finish(0.3); } });

  /* ---------- St. Louis: the Gateway Arch framing the afternoon sun over the Mississippi ---------- */
  usSceneAdd({ key: 'place:st-louis', label: 'The Gateway Arch', site: 'The Gateway Arch', colour: 'slate', mood: 'proud', season: 'any', tags: ['arch', 'landmark', 'river', 'riverboat'],
    svg: () => { const s1 = U(), w1 = U(), a1 = U(), g1 = U(), r1 = U();
      const arch = () => { const H = 590, base = 700, hw = 280, n = 48, k = 2.0, pts = [];
        for (let i = 0; i <= n; i++) { const u = -1 + 2 * i / n, cy = base - H * (1 - (Math.cosh(k * u) - 1) / (Math.cosh(k) - 1)), cx = 800 + hw * u, th = 26 + 34 * u * u * u * u;
          const m = 2 * k * Math.sinh(k * u) / (Math.cosh(k) - 1) * H / hw; const l = Math.hypot(1, m); pts.push([cx, cy, -m / l, -1 / l, th]); }
        // normal of slope m is (m,-1)/l; build outer (up) and inner (down) edges
        const o = pts.map(p => `${R(p[0] - p[2] * p[4] / 2 * -1)} ${R(p[1] + p[3] * p[4] / 2)}`), inn = pts.map(p => `${R(p[0] + p[2] * p[4] / 2 * -1)} ${R(p[1] - p[3] * p[4] / 2)}`).reverse();
        return `M${o.join('L')}L${inn.join('L')}z`; };
      return `<defs>${lin(s1, [[0, '#2f7fd0'], [0.5, '#7fbdee'], [0.8, '#d4ecf5'], [1, '#fdeec4']])}${lin(w1, [[0, '#d9c28d'], [0.2, '#8a9aa0'], [1, '#4b5b62']])}`
        + `<linearGradient id="${a1}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#e3e9ee"/><stop offset=".7" stop-color="#aab4bf"/><stop offset="1" stop-color="#7f8c99"/></linearGradient>${lin(g1, [[0, '#86b95c'], [1, '#43803a']])}${radU(r1, [[0, '#fff2c4', 0.9], [1, '#fff2c4', 0]], 800, 330, 520)}</defs>`
        + full(`url(#${s1})`) + `<rect width="1600" height="900" fill="url(#${r1})"/>` + rays(800, 330, 1100, '#fffbe0', 0.22) + sun(800, 330, 58, '#fffef6', '#fff0b0')
        + streak(300, 150, 340, '#fff', 0.65) + streak(1300, 90, 360, '#fff', 0.6) + cloud(250, 300, 1.3, '#cfe0ee', 0.94, 60, 4) + cloud(1380, 330, 1.2, '#d3e3ef', 0.94, 68, 22) + cloud(1000, 120, 0.8, '#e0edf6', 0.9, 54, 36)
        + birds(66, 6, 560, 200, '#3a4a60', 1.2, 600)
        + mv('uspar', { ad: '40s', dx: '8px' }, ridge('#a6bfa4', 640, 30, 9, 8) + haze(600, 70, '#fff1c8', 0.5))
        + mv('uspar', { ad: '34s', dx: '12px' }, skyline(-120, 400, 690, 40, 150, 3, '#8b9bab', '#7a8a9a', false) + skyline(1160, 1700, 690, 40, 150, 4, '#8b9bab', '#7a8a9a', false) + `<g transform="translate(-250 0)"><path fill="#a9a29a" d="M420 690V620h120V690z"/><path fill="#bdb6ac" d="M436 620V586h88V620z"/><path fill="#cfc8bc" d="M450 586Q480 540 510 586z"/><rect x="478" y="528" width="4" height="26" fill="#a9a29a"/>` + win(430, 630, 9, 3, 12, 18, 6, 10, 6, 0.5) + '</g>')
        + `<rect y="690" width="1600" height="210" fill="url(#${w1})"/><path fill="#ffe9a8" opacity=".35" d="M760 692h80l150 208H610z"/>` + glints(71, 40, 520, 1080, 700, 900, '#fff3c8', 50) + glints(72, 24, -100, 1700, 706, 900, '#d8e6e8', 34)
        + `<g opacity=".28" transform="translate(0 1400) scale(1 -1)"><path fill="#d6dde4" d="${arch()}"/></g><rect y="690" width="1600" height="210" fill="url(#${w1})" opacity=".6"/>`
        + mv('usmove', { ad: '80s', dx: '1000px' }, `<g transform="translate(900 758)"><path fill="#3a3028" d="M0 0h260l24 -20h-300z"/><path fill="#f7efe4" d="M20 -20h210v-26h-210z"/><path fill="#e8dccb" d="M34 -46h176v-22h-176z"/><path fill="#f7efe4" d="M54 -68h120v-20h-120z"/><path fill="#c23a30" d="M-14 -4h6v-60h-6z"/><circle cx="-6" cy="-34" r="46" fill="none"/><path fill="#c23a30" d="M-40 -2a40 40 0 0 1 0 -60l10 6a30 30 0 0 0 0 48z"/><path fill="#3a3028" d="M90 -88h12v-44h-12zM140 -88h12v-44h-12z"/><path fill="#d8d0c4" d="M86 -132h20v-6h-20zM136 -132h20v-6h-20z"/>${win(36, -42, 11, 1, 16, 0, 8, 12, 1, 1)}</g>` + puffs(996, 626, 5, '#fff', 16, 50, 4.4, -110, 3) + puffs(1046, 626, 5, '#f4f0ea', 16, 50, 5, -110, 3))
        + `<path fill="url(#${a1})" d="${arch()}"/><path fill="none" stroke="#fff" stroke-width="3" opacity=".6" d="${arch().split('L').slice(0, 49).join('L').replace(/^M/, 'M')}"/>`
        + `<path fill="#9aa5b0" d="M548 700h46v12h-46zM1006 700h46v12h-46z"/>`
        + `<path fill="url(#${g1})" d="M-160 900V790Q300 760 800 776T1760 766V900z"/><path fill="#cfc7b6" d="M-160 790Q300 762 800 778T1760 768V790Q1300 776 800 794T-160 812z"/><g opacity=".5">${Array.from({ length: 8 }, (_, i) => `<path fill="#a9a08e" d="M-160 ${796 + i * 4}H1760v1H-160z"/>`).join('')}</g>`
        + mv('uspar', { ad: '26s', dx: '16px' }, tree(160, 830, 2.4, '#2d7230', '#56a647') + tree(1440, 830, 2.6, '#2a6c2e', '#4fa043') + tree(70, 850, 1.8, '#2f7632', '#5aae4a'))
        + `<g stroke="#e9dfc8" stroke-width="6" stroke-dasharray="0 22" stroke-linecap="round" fill="none"><path d="M560 812Q800 826 1040 812"/></g>` + dots('M520 770Q800 782 1080 770', '#fff0b8', 5, 40, 'us-lamps') + finish(0.3); } });

  /* ---------- Kansas City: the Liberty Memorial tower against breaking storm light, fountains playing ---------- */
  usSceneAdd({ key: 'place:kansas-city', label: 'City of Fountains and the Liberty Memorial', site: 'The Liberty Memorial and the fountains', colour: 'teal', mood: 'proud', season: 'any', tags: ['fountain', 'memorial', 'skyline', 'storm light'],
    svg: () => { const s1 = U(), g1 = U(), w1 = U(), t1 = U(), l1 = U();
      const jet = (x, y, h, w, d) => `<g class="x-usflicker" style="--ad:${(1.6 + (x % 7) * 0.12).toFixed(2)}s;--d:-${d}s;transform-box:view-box;transform-origin:${x}px ${y}px"><path fill="#f4fcff" opacity=".85" d="M${x - 3} ${y}Q${x - w * 0.2} ${y - h * 0.8} ${x} ${y - h}Q${x + w * 0.2} ${y - h * 0.8} ${x + 3} ${y}z"/><path fill="#fff" opacity=".6" d="M${x - w} ${y - h * 0.5}Q${x - w * 0.3} ${y - h * 1.02} ${x} ${y - h}Q${x + w * 0.3} ${y - h * 1.02} ${x + w} ${y - h * 0.5}Q${x + w * 0.3} ${y - h * 0.8} ${x} ${y - h * 0.3}Q${x - w * 0.3} ${y - h * 0.8} ${x - w} ${y - h * 0.5}z"/></g>` + puffs(x, y - h, 3, '#e9f8ff', 9, d % 2 ? 24 : -24, 2.4, 30, 2.4);
      const sphinx = (x) => `<path fill="#c8b79a" d="M${x} 300v-36h14v12l14 6v18z"/><path fill="#a99878" d="M${x + 14} 264l12 10l-12 8z"/>`;
      return `<defs>${lin(s1, [[0, '#32486b'], [0.45, '#6e7fa0'], [0.7, '#e3a974'], [0.86, '#ffd98f']])}${lin(g1, [[0, '#7fa85a'], [1, '#3d7436']])}${lin(w1, [[0, '#8fc5d2'], [1, '#2d7c92']])}${lin(t1, [[0, '#e8dcc2'], [1, '#bda987']])}${radU(l1, [[0, '#ffe7a8', 0.8], [1, '#ffe7a8', 0]], 800, 400, 700)}</defs>`
        + full(`url(#${s1})`) + stars(7, 22, 120) + `<rect width="1600" height="900" fill="url(#${l1})"/>` + rays(800, 400, 1200, '#ffe9b0', 0.3) + sun(800, 440, 46, '#fff6d8', '#ffd48a')
        + cloud(220, 180, 1.5, '#4f5f80', 0.95, 70, 6, '#a9b6cb') + cloud(1340, 150, 1.7, '#4c5c7e', 0.95, 78, 28, '#a2b0c6') + cloud(1000, 290, 1.0, '#7a86a4', 0.92, 58, 14, '#e6c8b0') + cloud(560, 330, 0.9, '#7f89a6', 0.9, 64, 40, '#efc9a6') + streak(800, 90, 300, '#c6d0e0', 0.4)
        + birds(14, 7, 1100, 400, '#33384e', 1.1, 560)
        + mv('uspar', { ad: '40s', dx: '8px' }, ridge('#7d8fa0', 500, 36, 9, 5) + haze(480, 80, '#f5c995', 0.5))
        + mv('uspar', { ad: '34s', dx: '12px' }, skyline(-120, 560, 560, 36, 150, 15, '#5f7088', '#52627a', false) + skyline(1060, 1700, 560, 30, 130, 16, '#5f7088', '#52627a', false) + `<path fill="#7a7f8e" d="M200 560V280l16 -18h30l16 18V560z"/><path fill="#8d93a2" d="M216 262l14 -48l14 48z"/>${win(210, 296, 5, 12, 12, 20, 6, 10, 3, 0.5)}`)
        + `<path fill="url(#${g1})" d="M-160 900V560Q300 540 800 552T1760 548V900z"/><path fill="#cdbf9e" opacity=".5" d="M200 600Q800 580 1400 600L1500 620Q800 596 100 620z"/>`
        + `<g fill="url(#${t1})"><path d="M430 600V520h250V600z"/><path d="M920 600V520h250V600z"/></g><path fill="#a99878" d="M430 520h250v8H430zM920 520h250v8H920z"/>` + Array.from({ length: 11 }, (_, i) => `<rect x="${442 + i * 22}" y="534" width="8" height="60" fill="#f1e7cf"/>`).join('') + Array.from({ length: 11 }, (_, i) => `<rect x="${932 + i * 22}" y="534" width="8" height="60" fill="#f1e7cf"/>`).join('')
        + `<path fill="#d3c4a3" d="M600 600V540H1000V600z"/><path fill="#b9a784" d="M580 600H1020V612H580zM560 612H1040V626H560z"/>`
        + `<path fill="url(#${t1})" d="M754 540V326h92V540z"/><path fill="#a99878" d="M830 540V326h16V540z"/><path fill="none" stroke="#bfae8e" stroke-width="2" d="M770 540V330M786 540V330M802 540V330M818 540V330"/><path fill="#d3c4a3" d="M744 326h112v-14H744z"/><path fill="#bba88a" d="M744 312h112v-8H744z"/>${sphinx(740)}<path fill="#c8b79a" d="M860 300v-36h-14v12l-14 6v18z"/>`
        + `<path fill="#d8c9a8" d="M770 304V270h60V304z"/><path fill="#a99878" d="M770 270h60l-8 -12h-44z"/><path fill="#bba88a" d="M786 258h28v-14H786z"/><path fill="#7b6a4e" d="M792 244h16l4 -14h-24z"/>` + win(786, 342, 1, 5, 0, 36, 5, 22, 2, 1) + win(808, 342, 1, 5, 0, 36, 5, 22, 3, 1)
        + mv('usflicker', { ad: '1.1s', to: '800px 230px' }, `<path fill="#ff9a2e" d="M800 230q-18 -22 -8 -44q8 12 8 -12q18 20 10 44q-4 12 -10 12z"/><path fill="#ffe27a" d="M800 228q-8 -12 -3 -24q5 6 3 -6q9 12 5 24z"/>`) + puffs(800, 190, 5, '#f4e8dc', 14, 30, 4, -60, 3)
        + `<path fill="url(#${w1})" d="M180 700Q800 676 1420 700L1500 780Q800 750 100 780z"/><path fill="#f4efe0" d="M170 696Q800 672 1430 696l6 8Q800 682 164 704z"/><path fill="#b9ac8a" d="M100 780Q800 750 1500 780V796Q800 766 100 796z"/>` + glints(33, 26, 200, 1400, 706, 770, '#f1fcff', 46)
        + jet(480, 744, 60, 22, 1) + jet(620, 738, 90, 28, 2) + jet(710, 732, 130, 34, 3) + jet(800, 730, 190, 44, 4) + jet(890, 732, 130, 34, 5) + jet(980, 738, 90, 28, 6) + jet(1120, 744, 60, 22, 7)
        + `<path fill="#3d7436" d="M-160 900V826Q300 800 800 812T1760 806V900z"/>` + canopy('#2d6a36', 810, 26, 21, -160, 340, 900) + canopy('#2a6232', 806, 24, 22, 1260, 1760, 900)
        + mv('uspar', { ad: '28s', dx: '16px' }, tree(120, 860, 2.4, '#2d6a36', '#4f9244') + tree(1480, 860, 2.6, '#2a6232', '#4a8a40'))
        + Array.from({ length: 22 }, (_, i) => `<circle cx="${60 + i * 74 + (i % 3) * 10}" cy="${870 + (i % 4) * 6}" r="6" fill="${['#ffd23f', '#ff7a7a', '#fff'][i % 3]}"/>`).join('')
        + dots('M180 696Q800 672 1420 696', '#fff0c0', 4, 34, 'us-lamps') + finish(0.36); } });

  /* ---------- Omaha: the Desert Dome and giraffes on a bright morning ---------- */
  usSceneAdd({ key: 'place:omaha', label: 'The Desert Dome and giraffes', site: 'The Desert Dome at the zoo', colour: 'green', mood: 'cheerful', season: 'any', tags: ['zoo', 'dome', 'giraffe', 'skyline'],
    svg: () => { const s1 = U(), d1 = U(), g1 = U(), l1 = U();
      const giraffe = (s, seed) => { const spots = rnd(seed); let sp = ''; for (let i = 0; i < 12; i++) sp += `<circle cx="${R(-40 + spots() * 80)}" cy="${R(-146 + spots() * 30)}" r="${R(3 + spots() * 4)}"/>`; for (let i = 0; i < 6; i++) sp += `<circle cx="${R(36 + i * 10 + spots() * 6)}" cy="${R(-160 - i * 18)}" r="${R(4 + spots() * 3)}"/>`;
        return `<g transform="scale(${s})"><ellipse cx="10" cy="2" rx="80" ry="7" fill="#000" opacity=".16"/>` + mv('usbob', { ad: '1.4s', d: -(seed % 3) * 0.3 + 's', dy: '2px' }, `<g><path fill="#e3a43b" d="M-60 -130Q-60 -160 -10 -162Q40 -166 56 -146Q62 -126 40 -108Q-6 -100 -50 -108Q-62 -114 -60 -130z"/><rect x="-52" y="-112" width="10" height="112" fill="#d9962f"/><rect x="-26" y="-112" width="10" height="112" fill="#e3a43b"/><rect x="26" y="-112" width="10" height="112" fill="#d9962f"/><rect x="48" y="-118" width="10" height="118" fill="#e3a43b"/><path fill="#6b4a22" d="M-52 0h10v-8h-10zM-26 0h10v-8h-10zM26 0h10v-8h-10zM48 0h10v-8h-10z"/><path fill="none" stroke="#6b4a22" stroke-width="3" d="M-60 -140q-16 14 -12 50"/>`
          + mv('ussway2', { ad: '3.4s', to: '40px -140px' }, `<path fill="#e3a43b" d="M26 -144L72 -262L96 -252L62 -134z"/><ellipse cx="104" cy="-262" rx="26" ry="12" transform="rotate(24 104 -262)" fill="#e9b04a"/><path fill="#6b4a22" d="M92 -272l-4 -22h4l6 20zM104 -268l2 -22h4l-2 24z"/><circle cx="114" cy="-266" r="3" fill="#2a1a10"/><path fill="none" stroke="#6b4a22" stroke-width="4" d="M70 -262Q58 -244 48 -196"/>`) + `<g fill="#8a5a22" opacity=".85">${sp}</g></g>`) + '</g>'; };
      const mer = (a) => { let d = ''; for (const f of [-72, -50, -28, -8, 8, 28, 50, 72]) { const sx = Math.sin(f * Math.PI / 180); d += `M${R(800 + 360 * sx)} 650A${R(Math.abs(360 * sx))} 310 0 0 ${sx < 0 ? 1 : 0} 800 340`; } return d; };
      return `<defs>${lin(s1, [[0, '#6fb4e8'], [0.55, '#c8e6f3'], [0.85, '#fdeec6']])}`
        + `<radialGradient id="${d1}" cx=".4" cy=".25" r=".9"><stop offset="0" stop-color="#e8fbff" stop-opacity=".95"/><stop offset=".5" stop-color="#8fd0dc" stop-opacity=".85"/><stop offset="1" stop-color="#3f8aa0" stop-opacity=".95"/></radialGradient>${lin(g1, [[0, '#a7c864'], [1, '#5f9440']])}${radU(l1, [[0, '#fff3c4', 0.6], [1, '#fff3c4', 0]], 240, 180, 800)}</defs>`
        + full(`url(#${s1})`) + rays(240, 180, 1100, '#fffbe0', 0.18) + sun(240, 190, 42, '#fffdf0', '#fff0b0')
        + streak(900, 110, 320, '#fff', 0.6) + cloud(1250, 200, 1.2, '#dbe9f2', 0.95, 62, 4) + cloud(560, 160, 0.9, '#e0edf6', 0.92, 56, 24) + cloud(1480, 380, 0.7, '#e6f1f7', 0.9, 70, 40)
        + mv('uspar', { ad: '40s', dx: '8px' }, ridge('#a3c7b0', 560, 30, 9, 4) + haze(530, 70, '#fdf1cb', 0.5))
        + mv('uspar', { ad: '34s', dx: '12px' }, skyline(1180, 1700, 600, 30, 130, 8, '#8fa6b8', '#7e95a8', false) + skyline(-120, 260, 600, 24, 90, 9, '#8fa6b8', '#7e95a8', false))
        + mv('usglide', { ad: '60s', d: '-14s', dx: '900px', dy: '-60px' }, `<g transform="translate(300 330)"><path fill="#e8503e" d="M0 -80C-44 -80 -52 -20 -14 8h28C52 -20 44 -80 0 -80z"/><path fill="#ffd23f" d="M0 -80C-16 -70 -18 -20 -4 8h8C18 -20 16 -70 0 -80z"/><path fill="#2f8f9a" d="M-14 8h28l-4 10h-20z" opacity="0"/><path fill="none" stroke="#5a4636" stroke-width="2" d="M-12 6l4 22M12 6l-4 22"/><rect x="-10" y="28" width="20" height="14" fill="#8a5a32"/></g>`)
        + birds(62, 6, 900, 300, '#3e5568', 1.1, 620)
        + `<path fill="url(#${g1})" d="M-160 900V610Q400 590 800 604T1760 596V900z"/>` + canopy('#4e8a3e', 612, 24, 17, -160, 400, 700) + canopy('#4a853a', 608, 22, 18, 1240, 1760, 700)
        + `<path fill="#c9bd9a" opacity=".6" d="M100 650Q800 628 1500 650L1600 690Q800 660 0 690z"/>`
        + `<path fill="#46453f" d="M430 654Q430 340 800 336Q1170 340 1170 654z" opacity=".35"/><path fill="url(#${d1})" d="M440 650Q440 346 800 340Q1160 346 1160 650z"/>`
        + `<g opacity=".4" fill="#2f6d44">${tree(640, 650, 1.6, '#2f6d44', '#3f8a52')}${tree(760, 650, 2.4, '#2f6d44', '#3f8a52')}${tree(900, 650, 2.0, '#2f6d44', '#3f8a52')}${tree(1010, 650, 1.4, '#2f6d44', '#3f8a52')}<path fill="#a86c3c" d="M520 650Q560 600 620 650zM1040 650Q1090 586 1140 650z"/></g>`
        + `<path fill="none" stroke="#f4fdff" stroke-width="3" opacity=".8" d="${mer()}"/><path fill="none" stroke="#f4fdff" stroke-width="2.5" opacity=".7" d="M470 560Q800 600 1130 560M520 470Q800 508 1080 470M620 396Q800 420 980 396M440 650Q800 690 1160 650"/><path fill="#fff" opacity=".4" d="M520 440Q560 380 660 360Q580 400 560 470z"/><path fill="#cfd6d8" d="M426 652H1174V670H426z"/><path fill="#a4acb0" d="M426 664H1174V672H426z"/>`
        + `<path fill="none" stroke="#ffffff" stroke-width="3" opacity=".25" d="M800 340V650"/>` + mv('uspar', { ad: '30s', dx: '14px' }, `<path fill="#4c8a3e" d="M-160 900V780Q300 740 700 770T1300 760Q1500 750 1760 770V900z"/>`)
        + mv('usmove', { ad: '70s', dx: '700px' }, `<g transform="translate(1000 810)">${giraffe(1.5, 3)}</g>`) + mv('usmove', { ad: '90s', d: '-30s', dx: '520px' }, `<g transform="translate(420 780)">${giraffe(1.1, 5)}</g>`)
        + `<path fill="#3a6a32" d="M-160 900V850Q400 830 800 846T1760 836V900z"/><g fill="none" stroke="#5f8a38" stroke-width="3">${Array.from({ length: 40 }, (_, i) => { const x = i * 42 - 40, h = 30 + (i * 37) % 36; return `<path d="M${x} 900q${(i % 3) * 4 - 4} ${-h / 2} ${(i % 5) * 3 - 6} ${-h}"/>`; }).join('')}</g>`
        + mv('uspar', { ad: '26s', dx: '18px' }, `<g transform="translate(1500 860)"><path fill="#5a4630" d="M-4 0V-130h8V0z"/><path fill="#5a4630" d="M0 -100L-60 -150L-50 -154L0 -118L40 -160L50 -154z"/><path fill="#5d9a48" d="M-120 -150Q-60 -200 0 -170Q70 -200 130 -150Q60 -164 0 -154Q-60 -164 -120 -150z"/></g>`) + `<rect width="1600" height="900" fill="url(#${l1})"/>` + finish(0.3); } });

  /* ---------- Arizona: the Grand Canyon from the South Rim at sunset, a saguaro on the edge ---------- */
  usSceneAdd({ key: 'state:AZ', label: 'Grand Canyon sunset from the rim', site: 'The Grand Canyon', colour: 'orange', mood: 'proud', season: 'any', tags: ['canyon', 'sunset', 'saguaro', 'river'],
    svg: () => { const s1 = U(), b1 = U(), b2 = U(), rv = U(), l1 = U();
      const bands = (id, y0, y1, cols) => { const n = cols.length; return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}">` + cols.map((c, i) => `<stop offset="${(i / n).toFixed(3)}" stop-color="${c}"/><stop offset="${((i + 1) / n).toFixed(3)}" stop-color="${c}"/>`).join('') + '</linearGradient>'; };
      /** A stepped butte (a temple): ledges up to a pointed-ish crown. */
      const butte = (x, base, w, h, fill, steps, seed) => { const r = rnd(seed); let d = `M${x - w / 2} ${base}`, yy = base, hw = w / 2; const dy = h / steps;
        for (let i = 0; i < steps; i++) { const nx = hw * (1 - (i + 1) / steps * 0.8) * (0.9 + r() * 0.2); d += `L${R(x - hw * (1 - i / steps * 0.8))} ${R(yy - dy * 0.55)}h${R(hw * 0.1)}L${R(x - nx)} ${R(yy - dy)}`; yy -= dy; hw = hw; }
        d += `h${R(w * 0.12)}`; yy = base - h; for (let i = steps - 1; i >= 0; i--) { const nx = (w / 2) * (1 - i / steps * 0.8); const ny = base - dy * i; d += `L${R(x + nx)} ${R(ny - dy * 0.5)}h${R(w * 0.02)}L${R(x + (w / 2) * (1 - (i) / steps * 0.8) + w * 0.03)} ${R(ny)}`; }
        return `<path fill="${fill}" d="${d}V${base}z"/>`; };
      const saguaro = (x, y, s) => `<g fill="#26301f"><path d="M${x - 16 * s} ${y}V${y - 330 * s}q${16 * s} ${-36 * s} ${32 * s} 0V${y}z"/><path d="M${x - 16 * s} ${y - 150 * s}h${-44 * s}q${-22 * s} 0 ${-22 * s} ${-26 * s}V${y - 250 * s}q${14 * s} ${-14 * s} ${28 * s} 0V${y - 176 * s}q${4 * s} ${6 * s} ${14 * s} ${6 * s}h${24 * s}z"/><path d="M${x + 16 * s} ${y - 200 * s}h${40 * s}q${22 * s} 0 ${22 * s} ${-24 * s}V${y - 290 * s}q${-14 * s} ${-14 * s} ${-28 * s} 0V${y - 228 * s}q${-4 * s} ${6 * s} ${-14 * s} ${6 * s}h${-20 * s}z"/></g><path fill="none" stroke="#ffb066" stroke-width="${3 * s}" opacity=".7" d="M${x + 12 * s} ${y - 20 * s}V${y - 320 * s}"/>`;
      return `<defs>${lin(s1, [[0, '#4a3f86'], [0.3, '#b05a8c'], [0.55, '#ff8f5c'], [0.75, '#ffcb7a']])}${bands(b1, 420, 760, ['#c4623c', '#d97a4a', '#b4503a', '#e0905a', '#9a4234', '#cf6f45', '#a74a36', '#d98450', '#8e3b30', '#c0603c'])}${bands(b2, 520, 800, ['#8e4034', '#a85238', '#7c3a30', '#b45e3e', '#6e332c', '#9a4a36', '#823a30', '#a34e38'])}${lin(rv, [[0, '#6aa8b0'], [1, '#2c6676']])}${radU(l1, [[0, '#ffe3a0', 0.85], [1, '#ffe3a0', 0]], 1180, 440, 700)}</defs>`
        + full(`url(#${s1})`) + stars(15, 24, 140) + `<rect width="1600" height="900" fill="url(#${l1})"/>` + rays(1180, 440, 1200, '#ffe6b0', 0.26) + sun(1180, 440, 46, '#fff4d0', '#ffc27a')
        + streak(300, 170, 340, '#ffb08a', 0.55) + streak(1250, 120, 380, '#ffc08a', 0.5) + cloud(260, 260, 1.4, '#c3688c', 0.9, 66, 6, '#ffb8a0') + cloud(900, 160, 1.1, '#c8708c', 0.88, 58, 20, '#ffc4a4') + cloud(1450, 300, 1.0, '#c06a8c', 0.85, 72, 36, '#ffc09c')
        + birds(55, 3, 620, 330, '#2a2038', 2.0, 700) + birds(56, 4, 1000, 400, '#2a2038', 1.2, 560)
        + mv('uspar', { ad: '44s', dx: '8px' }, ridge('#b3688c', 468, 26, 12, 9) + haze(450, 70, '#ffc58a', 0.55) + butte(450, 520, 200, 90, '#a76a8c', 4, 21) + butte(880, 520, 160, 70, '#a8688c', 3, 22) + butte(1560, 520, 220, 100, '#a76a8c', 4, 23) + haze(470, 90, '#f7b189', 0.45))
        + mv('uspar', { ad: '38s', dx: '12px' }, mesa(120, 440, 420, 240, 'url(#' + b1 + ')', '#e59a64') + mesa(980, 460, 340, 220, 'url(#' + b1 + ')', '#e59a64') + butte(700, 560, 280, 200, 'url(#' + b1 + ')', 5, 3) + butte(1420, 560, 300, 150, 'url(#' + b1 + ')', 4, 4))
        + haze(540, 100, '#f7b189', 0.5)
        + mv('uspar', { ad: '32s', dx: '16px' }, butte(300, 680, 360, 230, 'url(#' + b2 + ')', 5, 7) + butte(1180, 700, 420, 280, 'url(#' + b2 + ')', 6, 8) + butte(780, 690, 300, 150, 'url(#' + b2 + ')', 4, 9) + `<path fill="#7a3a34" d="M-160 900V680Q200 650 600 690T1200 700Q1500 690 1760 706V900z"/>`)
        + `<path fill="url(#${rv})" d="M-160 720Q150 690 420 716T900 712Q1200 700 1500 722T1760 726V744Q1500 740 1200 724T900 734Q600 738 420 736T-160 746z"/>` + glints(21, 28, -100, 1700, 718, 744, '#ffe0a0', 60)
        + `<path fill="#6e322e" d="M-160 900V760Q300 740 700 770T1300 760Q1500 752 1760 774V900z"/><path fill="#8a443a" opacity=".6" d="M-160 790Q300 770 700 800T1300 790Q1500 782 1760 804V830Q1400 810 1300 818T700 828Q300 800 -160 820z"/>`
        + `<rect width="1600" height="900" fill="url(#${l1})" opacity=".5"/>`
        + mv('usdrift', { ad: '50s', dx: '120px' }, `<ellipse cx="700" cy="600" rx="260" ry="34" fill="#4a2548" opacity=".14"/><ellipse cx="1300" cy="650" rx="200" ry="26" fill="#4a2548" opacity=".12"/>`)
        + `<path fill="#3a1f26" d="M-160 900V836Q100 820 340 846T700 840Q900 836 1100 860T1500 848Q1640 842 1760 856V900z"/><path fill="#59302e" d="M1000 900V850Q1200 842 1400 856T1760 850V900z"/><path fill="none" stroke="#ffa860" stroke-width="3" opacity=".55" d="M-160 836Q100 820 340 846T700 840Q900 836 1100 860"/>`
        + mv('ussway2', { ad: '7s', to: '230px 880px' }, saguaro(230, 880, 1.15)) + mv('ussway2', { ad: '9s', d: '-2s', to: '1330px 880px' }, saguaro(1330, 880, 0.7))
        + `<g fill="#2b3822"><path d="M470 900q10 -50 4 -86l18 62q6 -40 22 -64q-4 50 -2 88z"/><path d="M1500 900q8 -60 -2 -100l22 70q8 -34 24 -60q-6 54 0 90z"/></g>` + finish(0.34); } });

  /* ---------- Colorado: the Maroon Bells and their lake at first light, aspens turning gold ---------- */
  usSceneAdd({ key: 'state:CO', label: 'Maroon Bells at first light', site: 'The Maroon Bells', colour: 'indigo', mood: 'calm', season: ['autumn'], tags: ['peaks', 'lake', 'aspens', 'alpenglow'],
    svg: () => { const s1 = U(), sh = U(), lt = U(), w1 = U(), cl = U();
      const sil = 'M-160 640L120 566L260 480L400 430L500 316L560 205L604 242L656 324L726 404L800 426L860 366L940 296L1010 262L1070 302L1140 384L1260 472L1420 562L1760 640z';
      const peaks = () => `<path fill="url(#${sh})" d="${sil}"/>`
        + `<path fill="url(#${lt})" d="M560 205L604 242L656 324L726 404L800 426L742 640H560L584 420L572 320z"/><path fill="url(#${lt})" d="M1010 262L1070 302L1140 384L1260 472L1420 562L1300 640H1000L1020 460L1006 360z"/>`
        + `<path fill="#e8cfe0" d="M556 214L600 246L572 330L592 410L568 330z"/><path fill="#f2dce8" d="M640 330L676 372L660 420L694 440L650 450z"/><path fill="#f2dce8" d="M1012 272L1054 306L1030 380L1044 440L1018 372z"/>`
        + `<g fill="none" stroke="#4e2c46" stroke-width="3" opacity=".3"><path d="M480 380L640 420M420 440L700 470M300 500L760 520M900 380L1140 410M860 440L1220 480"/></g>`;
      const aspen = (x, y, s, c1, c2, seed) => { const r = rnd(seed); let o = `<path fill="none" stroke="#efe9dc" stroke-width="${R(5 * s)}" stroke-linecap="round" d="M${x} ${y}V${R(y - 120 * s)}M${R(x + 12 * s)} ${y}V${R(y - 90 * s)}"/>`; for (let i = 0; i < 9; i++) o += `<circle cx="${R(x - 36 * s + r() * 78 * s)}" cy="${R(y - (90 + r() * 70) * s)}" r="${R((20 + r() * 20) * s)}" fill="${r() > 0.45 ? c1 : c2}"/>`; return `<g class="x-ussway2" style="--ad:${(5 + r() * 4).toFixed(1)}s;--d:-${R(r() * 5)}s;transform-box:view-box;transform-origin:${x}px ${y}px">${o}</g>`; };
      return `<defs>${lin(s1, [[0, '#3c4f94'], [0.4, '#9a85b8'], [0.65, '#f2b7a0'], [0.8, '#ffdcb0']])}${lin(sh, [[0, '#8a566c'], [1, '#52364e']])}${lin(lt, [[0, '#ffc0a0'], [0.4, '#e2877a'], [1, '#a8566a']])}${lin(w1, [[0, '#7c9cc0'], [1, '#2c4a72']])}${radU(cl, [[0, '#ffe2bc', 0.7], [1, '#ffe2bc', 0]], 1000, 330, 700)}</defs>`
        + full(`url(#${s1})`) + stars(88, 40, 200) + `<rect width="1600" height="900" fill="url(#${cl})"/>` + sun(1300, 380, 28, '#fff3d6', '#ffd0a0', true)
        + streak(300, 150, 300, '#ffc6b0', 0.5) + cloud(220, 230, 1.1, '#b48ab8', 0.88, 70, 6, '#ffd0c0') + cloud(1380, 180, 1.2, '#b48ab8', 0.85, 62, 24, '#ffcfbe')
        + mv('uspar', { ad: '50s', dx: '6px' }, ridge('#8f7aa6', 560, 40, 12, 14) + haze(540, 70, '#f6c9b4', 0.5))
        + peaks() + haze(540, 120, '#f4cdb8', 0.55) + `<path fill="#3a4a46" d="M-160 640V600Q200 580 400 610T900 600Q1200 590 1500 604T1760 600V640z"/>` + canopy('#2a4538', 612, 34, 71, -160, 1760, 650)
        + `<rect y="640" width="1600" height="260" fill="url(#${w1})"/>`
        + `<g opacity=".55" transform="translate(0 1280) scale(1 -1)">${peaks()}</g><rect y="640" width="1600" height="260" fill="url(#${w1})" opacity=".55"/>`
        + mv('usdrift', { ad: '40s', dx: '60px' }, `<ellipse cx="500" cy="650" rx="420" ry="16" fill="#f6dcd0" opacity=".45"/><ellipse cx="1180" cy="664" rx="360" ry="12" fill="#f6dcd0" opacity=".4"/>`)
        + glints(24, 46, 100, 1500, 650, 800, '#ffe8d4', 70) + glints(25, 26, -100, 1700, 660, 880, '#c6d4ee', 40)
        + `<path fill="#3a5a3e" d="M-160 900V790Q300 760 560 790T1100 780Q1400 770 1760 790V900z"/>` + canopy('#2c4a38', 770, 40, 73, -160, 420, 900) + canopy('#2a4636', 764, 40, 74, 1180, 1760, 900)
        + [60, 150, 250, 340, 430].map((x, i) => aspen(x, 800 + (i % 2) * 14, 1.3 + (i % 3) * 0.2, '#f2b822', '#e08a1e', 80 + i)).join('') + [1160, 1260, 1350, 1450, 1540].map((x, i) => aspen(x, 806 - (i % 2) * 10, 1.4 + (i % 3) * 0.2, '#f6c22e', '#e4781c', 90 + i)).join('')
        + `<g opacity=".9">${Array.from({ length: 8 }, (_, i) => `<path class="x-usfall" style="--ad:${(8 + i * 1.4).toFixed(1)}s;--d:-${(i * 1.6).toFixed(1)}s;--dx:${(i % 2 ? 1 : -1) * (50 + i * 10)}px" fill="#f2b822" d="M${R(120 + i * 190)} ${R(560 + (i * 41) % 120)}q9 -12 18 0q-9 12 -18 0z"/>`).join('')}</g>`
        + `<path fill="#25392c" d="M-160 900V860Q200 846 500 862T1000 858Q1300 850 1760 864V900z"/>` + finish(0.34); } });

  /* ---------- Idaho: the Sawtooth peaks over Redfish Lake at moonrise, a campfire on the shore ---------- */
  usSceneAdd({ key: 'state:ID', label: 'Sawtooth moonlit lake', site: 'The Sawtooth Mountains', colour: 'violet', mood: 'dreamy', season: 'any', tags: ['peaks', 'lake', 'moon', 'campfire'],
    svg: () => { const s1 = U(), m1 = U(), w1 = U(), p1 = U(), f1 = U();
      const camp = () => `<path fill="#ffb347" opacity=".18" d="M120 780Q330 600 540 780z"/>` + `<path fill="#3d3a5a" d="M250 840L330 700L410 840z"/><path fill="#2e2a46" d="M330 700L410 840H330z"/><path class="us-lit" d="M300 840L330 770L360 840z"/>`
        + `<path fill="#4a3426" d="M450 862l62 -16l4 8l-62 16zM450 846l62 16l-4 8l-62 -16z"/>` + mv('usflicker', { ad: '.5s', to: '482px 856px' }, `<path fill="#ff8a2a" d="M482 856q-26 -28 -10 -62q10 14 8 -14q30 26 20 70z"/><path fill="#ffd45a" d="M482 856q-12 -16 -4 -36q8 8 6 -8q14 18 8 44z"/>`) + puffs(484, 800, 6, '#ffb347', 5, 24, 3, -60, 1.6);
      return `<defs>${lin(s1, [[0, '#0f1a4e'], [0.4, '#2f3c86'], [0.7, '#7a6aa8'], [0.88, '#e8a58a']])}${radU(m1, [[0, '#fff6d8', 0.9], [0.3, '#cfd8ff', 0.35], [1, '#cfd8ff', 0]], 1150, 230, 560)}${lin(w1, [[0, '#4a5b9c'], [0.4, '#2a366e'], [1, '#141b44']])}${linU(p1, [[0, '#fff2cc', 0.85], [1, '#fff2cc', 0]], 0, 560, 0, 900)}${lin(f1, [[0, '#1b2a40'], [1, '#0e1624']])}</defs>`
        + full(`url(#${s1})`) + stars(3, 90, 420) + `<rect width="1600" height="900" fill="url(#${m1})"/>`
        + mv('usglow', { ad: '8s' }, `<circle cx="1150" cy="230" r="62" fill="#fff8e4"/><circle cx="1130" cy="214" r="10" fill="#e8e0c8" opacity=".6"/><circle cx="1172" cy="248" r="14" fill="#e8e0c8" opacity=".5"/><circle cx="1150" cy="262" r="6" fill="#e8e0c8" opacity=".5"/>`)
        + streak(300, 170, 300, '#8e86c8', 0.4) + cloud(250, 250, 1.1, '#3d4a8c', 0.85, 64, 6, '#8a90c8') + cloud(1400, 300, 1.0, '#3d4a8c', 0.8, 70, 28, '#9aa0d4')
        + mv('usmove', { ad: '9s', d: '-3s', dx: '700px' }, `<path fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8" d="M520 120l60 28"/>`)
        + mv('uspar', { ad: '50s', dx: '6px' }, saw(520, 230, 13, 5, '#5a5c9a', '#dfe2f6', 0.2) + haze(500, 80, '#e8b0a0', 0.4))
        + mv('uspar', { ad: '40s', dx: '10px' }, saw(590, 280, 9, 6, '#33407a', '#b6bfe8', 0.28) + haze(560, 70, '#8a7ab4', 0.4))
        + `<path fill="#1d2858" d="M-160 640V600Q300 580 700 606T1200 596Q1500 590 1760 604V640z"/>` + canopy('#16203e', 612, 34, 12, -160, 1760, 650)
        + `<rect y="640" width="1600" height="260" fill="url(#${w1})"/>`
        + `<g opacity=".4" transform="translate(0 1280) scale(1 -1)">${saw(590, 280, 9, 6, '#33407a', null)}</g><rect y="640" width="1600" height="260" fill="url(#${w1})" opacity=".6"/>`
        + `<path fill="#fff2cc" opacity=".35" d="M1090 642h120l90 258H980z"/>` + glints(9, 40, 950, 1350, 650, 900, '#fff4d0', 56) + glints(10, 24, -100, 1700, 660, 900, '#7e8cd0', 36)
        + mv('usdrift', { ad: '44s', dx: '80px' }, `<ellipse cx="600" cy="656" rx="440" ry="14" fill="#c9cdf0" opacity=".3"/><ellipse cx="1250" cy="672" rx="360" ry="12" fill="#c9cdf0" opacity=".28"/>`)
        + `<path fill="url(#${f1})" d="M-160 900V790Q200 760 600 800T1200 790Q1500 784 1760 806V900z"/>`
        + camp()
        + mv('uspar', { ad: '30s', dx: '14px' }, pine(80, 900, 3.0, '#0f1a2c', '#2a3d5c') + pine(1480, 900, 3.4, '#0e1828', '#2a3d5c') + pine(1370, 880, 2.2, '#101c2e', '#2a3d5c') + pine(200, 900, 2.0, '#101c2e', '#2a3d5c') + pine(1580, 890, 2.5, '#0e1828', '#2a3d5c'))
        + `<g fill="#fff" class="us-star">${Array.from({ length: 8 }, (_, i) => `<circle cx="${R(100 + i * 190)}" cy="${R(60 + (i * 53) % 110)}" r="2.2"/>`).join('')}</g>`
        + finish(0.3); } });

  /* ---------- Montana: big sky over the prairie, the Rocky Mountain Front, a storm cell and a red barn ---------- */
  usSceneAdd({ key: 'state:MT', label: 'Big sky over the prairie', site: 'Big Sky Country', colour: 'blue', mood: 'calm', season: ['summer'], tags: ['sky', 'prairie', 'mountains', 'barn', 'storm'],
    svg: () => { const s1 = U(), g1 = U(), g2 = U(), l1 = U(), rn = U();
      const bigcloud = (x, y, s, tone, top, dur, del) => cloud(x, y, s, tone, 0.97, dur, del, top);
      const wheat = (seed, n, y0, y1, col, w) => { const r = rnd(seed); let d = ''; for (let i = 0; i < n; i++) { const x = R(r() * 1800 - 100), y = R(y0 + r() * (y1 - y0)), h = R(16 + (y - y0) / (y1 - y0 + 1) * 40); d += `M${x} ${y}q${R(r() * 6 - 3)} ${-R(h / 2)} ${R(r() * 8 - 2)} ${-h}`; } return `<path fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" d="${d}"/>`; };
      const post = (x, y, s) => `<path fill="#6a4a30" d="M${x - 3 * s} ${y}v${-34 * s}h${6 * s}v${34 * s}z"/>`;
      return `<defs>${lin(s1, [[0, '#2268c8'], [0.4, '#4f9be4'], [0.7, '#a6d2f2'], [0.88, '#e6f2f6']])}${lin(g1, [[0, '#d9b653'], [1, '#a98833']])}${lin(g2, [[0, '#e6c45e'], [1, '#b8923a']])}${radU(l1, [[0, '#fff6d0', 0.6], [1, '#fff6d0', 0]], 1350, 60, 800)}`
        + `<linearGradient id="${rn}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d6a86" stop-opacity=".85"/><stop offset="1" stop-color="#6d7a96" stop-opacity="0"/></linearGradient></defs>`
        + full(`url(#${s1})`) + rays(1480, 60, 1200, '#fffbe0', 0.14) + sun(1480, 80, 38, '#fffdf2', '#fff2b8')
        + streak(260, 120, 360, '#fff', 0.6) + streak(900, 70, 300, '#fff', 0.5)
        + bigcloud(300, 330, 2.0, '#aebfd6', '#fff', 78, 6) + bigcloud(900, 270, 1.6, '#b4c4da', '#fff', 84, 30) + bigcloud(600, 150, 1.2, '#c0d0e4', '#fff', 66, 14) + bigcloud(1480, 360, 0.9, '#b8c8de', '#fff', 90, 46)
        + `<g class="x-usdrift" style="--ad:70s;--dx:50px"><ellipse cx="1180" cy="380" rx="300" ry="64" fill="#46536e" opacity=".85"/><ellipse cx="1090" cy="360" rx="190" ry="56" fill="#556280"/><ellipse cx="1260" cy="352" rx="170" ry="48" fill="#5f6d8c"/><path fill="url(#${rn})" d="M980 400H1400L1370 590H1000z"/><path fill="none" stroke="#7f8cac" stroke-width="2.4" opacity=".7" stroke-dasharray="14 10" d="${Array.from({ length: 16 }, (_, i) => `M${1000 + i * 25} 396l-14 190`).join('')}"/></g>`
        + `<path class="x-usshim" style="--ad:2.4s" fill="none" stroke="#fff6c0" stroke-width="3" d="M1180 420l-14 40l16 4l-12 36"/>`
        + birds(77, 3, 500, 440, '#2b3646', 2.0, 640) + birds(78, 5, 900, 500, '#2b3646', 1.0, 520)
        + mv('uspar', { ad: '50s', dx: '6px' }, saw(650, 140, 16, 31, '#9db6d2', '#f6f9fc', 0.22) + haze(580, 80, '#eaf3f8', 0.55))
        + mv('uspar', { ad: '40s', dx: '10px' }, ridge('#7d9ec0', 640, 40, 10, 32) + haze(640, 60, '#dce9f0', 0.5))
        + `<path fill="url(#${g1})" d="M-160 900V660Q300 620 700 650T1300 640Q1500 636 1760 650V900z"/>` + wheat(2, 120, 650, 720, '#c7a244', 3)
        + `<path fill="url(#${g2})" d="M-160 900V720Q300 680 800 716T1760 700V900z"/>` + wheat(3, 120, 720, 800, '#9f7e2e', 4)
        + `<path fill="#a99a80" d="M820 900L840 790Q860 740 900 720L880 716Q820 740 790 790L700 900z" opacity="0"/><path fill="#b9a88a" d="M700 900Q760 800 830 748Q870 720 960 702L952 696Q860 710 800 744Q710 800 640 900z"/><path fill="none" stroke="#8f7e60" stroke-width="2" stroke-dasharray="12 14" d="M670 900Q740 800 820 748Q880 712 956 698"/>`
        + mv('usmove', { ad: '40s', dx: '120px' }, `<g transform="translate(900 712)"><path fill="#c23a30" d="M0 0h20l4 -8h8v-8l-10 -4h-18z"/><circle cx="6" cy="1" r="2.4" fill="#222"/><circle cx="22" cy="1" r="2.4" fill="#222"/></g>`)
        + `<g>` + Array.from({ length: 14 }, (_, i) => post(60 + i * 56, 800 + i * 3.2, 1.0)).join('') + `<path fill="none" stroke="#5f4a38" stroke-width="2" d="M60 782L816 806M60 770L816 794"/></g>`
        + `<g transform="translate(1180 760)"><path fill="#8a2a24" d="M-70 0V-70L0 -110L70 -70V0z"/><path fill="#a63a30" d="M-70 -70L0 -110L70 -70H-70z" opacity=".5"/><path fill="#f2ead8" d="M-12 0V-54h24V0z"/><path fill="none" stroke="#f2ead8" stroke-width="3" d="M-12 -54L12 0M12 -54L-12 0M-62 -66h124"/><path fill="#5a2420" d="M-82 -68L0 -118L82 -68L74 -64L0 -106L-74 -64z"/><path fill="#7a7a82" d="M72 0V-84h30V0z"/><path fill="#a0a0aa" d="M72 -84q15 -22 30 0z"/>${win(-52, -48, 2, 1, 22, 0, 12, 14, 1, 1)}</g>`
        + `<path fill="#e6c45e" d="M-160 900V810Q300 786 800 816T1760 800V900z"/>` + wheat(4, 140, 810, 900, '#a98a32', 5)
        + mv('ussway', { ad: '3.4s', to: '800px 900px' }, wheat(5, 80, 830, 900, '#c9a548', 6) + wheat(6, 40, 850, 900, '#d9b858', 8))
        + `<g class="x-ussway" style="--ad:2.8s;transform-box:view-box;transform-origin:300px 900px"><path fill="none" stroke="#b9902c" stroke-width="5" d="M300 900q4 -100 -2 -180M330 900q10 -90 6 -160M270 900q-6 -80 -10 -150"/><g fill="#e0b13a">${[[298, 720], [336, 740], [260, 750]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="22" transform="rotate(${x % 2 ? 6 : -6} ${x} ${y})"/>`).join('')}</g></g>`
        + `<rect width="1600" height="900" fill="url(#${l1})"/>` + finish(0.28); } });

})();
