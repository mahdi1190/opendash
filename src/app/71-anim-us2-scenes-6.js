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
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish, star5 } = K;

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
  const tree = (x, y, s, dark, lite) => `<g><rect x="${x - R(3 * s)}" y="${y - R(22 * s)}" width="${R(6 * s)}" height="${R(24 * s)}" fill="#4a3526"/><circle cx="${x}" cy="${y - R(44 * s)}" r="${R(30 * s)}" fill="${dark}"/><circle cx="${x - R(10 * s)}" cy="${y - R(52 * s)}" r="${R(18 * s)}" fill="${lite}" opacity=".8"/></g>`;
  const pine = (x, y, s, dark, lite) => { let o = `<rect x="${x - R(3 * s)}" y="${y - R(14 * s)}" width="${R(6 * s)}" height="${R(16 * s)}" fill="#3a2a22"/>`; for (let i = 0; i < 4; i++) { const w = (34 - i * 6) * s, yy = y - (14 + i * 24) * s; o += `<path fill="${dark}" d="M${R(x - w)} ${R(yy)}L${x} ${R(yy - 40 * s)}L${R(x + w)} ${R(yy)}z"/>`; } return o + `<path fill="${lite}" opacity=".35" d="M${x} ${R(y - 110 * s)}l${R(26 * s)} ${R(70 * s)}h${R(-26 * s)}z"/>`; };

  /* ---------- Cincinnati: the Roebling bridge at sunset, a flying pig, a steamboat ---------- */
  usSceneAdd({ key: 'place:cincinnati', label: 'Roebling bridge at sunset', site: 'The Roebling Suspension Bridge', colour: 'pink', mood: 'cheerful', season: 'any', tags: ['bridge', 'river', 'flying pig', 'sunset'],
    svg: () => { const s1 = U(), w1 = U(), r1 = U(), g1 = U();
      const hang = () => { let d = ''; for (let x = 470; x <= 1130; x += 22) { const k = (x - 800) / 370, y = 575 - 175 * (1 - k * k) + 0; d += `M${x} ${R(y)}V646`; } return d; };
      const cab = (dx) => { let d = 'M430 402'; for (let x = 430; x <= 1170; x += 37) { const k = (x - 800) / 370; d += `L${x} ${R(575 - 175 * (1 - k * k) + dx)}`; } return d; };
      const tower = (x) => `<path fill="#7a6568" d="M${x - 34} 660V430l8 -14h52l8 14V660z"/><path fill="#5d4b50" d="M${x + 8} 660V430l8 -14h10l8 14V660z"/><path fill="#8d7679" d="M${x - 40} 412h80l-6 -14h-68z"/><path fill="#43353a" d="M${x - 22} 660V560a14 14 0 0 1 28 0V660zM${x - 22} 520V484a14 14 0 0 1 28 0V520z"/><path fill="#8d7679" d="M${x - 5} 398l5 -22l5 22z"/>`;
      const pig = () => mv('usglide', { ad: '34s', d: '-6s', dx: '700px', dy: '-60px' }, `<g><ellipse cx="0" cy="0" rx="26" ry="19" fill="#f6a5b8"/><circle cx="26" cy="-3" r="13" fill="#f6a5b8"/><ellipse cx="37" cy="0" rx="7" ry="5.5" fill="#ee7f9a"/><path fill="#ee7f9a" d="M22 -14l6 -9l4 11z"/><circle cx="29" cy="-7" r="2" fill="#3a2230"/><path fill="none" stroke="#ee7f9a" stroke-width="3" stroke-linecap="round" d="M-26 -2q-10 -8 -4 -14q6 4 -2 8"/><rect x="-14" y="14" width="5" height="9" fill="#ee7f9a"/><rect x="12" y="14" width="5" height="9" fill="#ee7f9a"/>${mv('usflap', { ad: '.55s', to: '0px 0px' }, `<path fill="#fff" stroke="#e7a4b8" stroke-width="1.5" d="M-4 -12q-6 -34 -32 -40q4 18 8 30q8 -4 10 4q8 -6 14 6z"/><path fill="#fff" stroke="#e7a4b8" stroke-width="1.5" d="M6 -12q8 -34 36 -38q-6 18 -10 30q-8 -4 -10 4q-8 -6 -16 4z"/>`)}</g>`).replace('<g class="x-usglide"', '<g transform="translate(560 250)"><g class="x-usglide"') + '</g>';
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

})();
