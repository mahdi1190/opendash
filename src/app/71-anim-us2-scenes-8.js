/* ============================================================
   US FULL-SCREEN SCENES, batch 8 (Pacific coast): California, Hawaii, Oregon, Washington, Los Angeles,
   San Francisco, San Diego, Portland, Seattle, Anchorage, Honolulu. Same toolkit as the Texas scenes (usSceneKit):
   1600 x 900 units, sliced to fill any screen, layered (sky, light, far / mid / near, ambient life), painted in
   daytime colours; the dark theme or tod-dusk / tod-night lights .us-lit windows, .us-lamps and .us-star.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish, star5 } = K;
  const f1 = (v) => (Math.round(v * 10) / 10);
  /** Conifers in a row (one path): feet on y, heights hmin..hmax, optional solid foot down to `foot`. */
  const firs = (seed, x0, x1, y, hmin, hmax, fill, foot) => {
    const r = rnd(seed); let d = '';
    for (let x = x0; x < x1; x += 16 + r() * 30) {
      const h = hmin + r() * (hmax - hmin), w = h * 0.27;
      d += `M${R(x - w)} ${y}L${R(x - w * 0.55)} ${R(y - h * 0.42)}L${R(x - w * 0.82)} ${R(y - h * 0.42)}L${R(x - w * 0.3)} ${R(y - h * 0.72)}L${R(x - w * 0.5)} ${R(y - h * 0.72)}L${R(x)} ${R(y - h)}L${R(x + w * 0.5)} ${R(y - h * 0.72)}L${R(x + w * 0.3)} ${R(y - h * 0.72)}L${R(x + w * 0.82)} ${R(y - h * 0.42)}L${R(x + w * 0.55)} ${R(y - h * 0.42)}L${R(x + w)} ${y}z`;
    }
    return `<path fill="${fill}" d="${d}${foot ? `M${x0} ${y - 2}H${x1}V${foot}H${x0}z` : ''}"/>`;
  };
  /** A row of buildings (one path). */
  const bld = (seed, x0, x1, y, hmin, hmax, fill, wmin, wmax, gap) => {
    const r = rnd(seed); let x = x0, d = '';
    while (x < x1) { const w = wmin + r() * (wmax - wmin), h = hmin + r() * (hmax - hmin); d += `M${R(x)} ${y}V${R(y - h)}h${R(w)}V${y}z`; x += w + (gap || 0) * r(); }
    return `<path fill="${fill}" d="${d}"/>`;
  };
  /** Lit windows: random dots on a rectangle (class us-lit lights them at dusk). */
  const wins = (seed, x0, x1, y0, y1, n, w) => {
    const r = rnd(seed); let d = '';
    for (let i = 0; i < n; i++) d += `M${R(x0 + r() * (x1 - x0))} ${R(y0 + r() * (y1 - y0))}h1`;
    return `<path class="us-lit" fill="none" stroke-width="${w || 5}" stroke-linecap="round" d="${d}"/>`;
  };
  /** A building with window rows: body, crown ('step' | 'spire' | 'flat' | 'pyr'), lit window rows. */
  const tower = (x, base, w, h, fill, crown, rows) => {
    const top = base - h; let c = '';
    if (crown === 'step') c = `<path fill="${fill}" d="M${x + w * 0.12} ${top}V${top - h * 0.05}H${x + w * 0.88}V${top}M${x + w * 0.28} ${top - h * 0.05}V${top - h * 0.1}H${x + w * 0.72}V${top - h * 0.05}z"/>`;
    else if (crown === 'spire') c = `<path fill="${fill}" d="M${x + w * 0.3} ${top}L${x + w / 2} ${top - h * 0.14}L${x + w * 0.7} ${top}z"/><path stroke="${fill}" stroke-width="3" d="M${x + w / 2} ${top - h * 0.14}V${top - h * 0.24}"/>`;
    else if (crown === 'pyr') c = `<path fill="${fill}" d="M${x} ${top}L${x + w / 2} ${top - w * 0.55}L${x + w} ${top}z"/>`;
    let d = '';
    if (rows !== 0) for (let y = top + 22; y < base - 10; y += 24) d += `M${R(x + 8)} ${y}H${R(x + w - 8)}`;
    return `<rect x="${R(x)}" y="${R(top)}" width="${R(w)}" height="${R(h)}" fill="${fill}"/>${c}` + (d ? `<path class="us-lit" fill="none" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 15" d="${d}"/>` : '');
  };
  /** A palm: curved trunk, a crown of fronds that sways (feet at x,y; the crown is lean units to the side). */
  const palm = (x, y, h, lean, col, tcol, seed, ad) => {
    const r = rnd(seed || 5), tx = x + lean, ty = y - h, L0 = h * 0.4; let fr = '';
    for (let i = 0; i < 12; i++) {
      const a = (-205 + i * 21 + r() * 8) * Math.PI / 180, L = L0 * (0.75 + r() * 0.5), ca = Math.cos(a), sa = Math.sin(a);
      const ex = tx + L * ca, ey = ty + L * sa + L * 0.4, cx = tx + L * ca * 0.55, cy = ty + L * sa * 0.55 - L * 0.28;
      fr += `M${R(tx)} ${R(ty)}Q${R(cx)} ${R(cy)} ${R(ex)} ${R(ey)}Q${R(cx + 4)} ${R(cy + L * 0.2)} ${R(tx)} ${R(ty)}z`;
    }
    return `<path fill="none" stroke="${tcol}" stroke-width="${R(h * 0.032 + 5)}" stroke-linecap="round" d="M${x} ${y}Q${R(x + lean * 0.15)} ${R(y - h * 0.55)} ${R(tx)} ${R(ty)}"/>`
      + mv('ussway2', { ad: (ad || 6.5) + 's', d: '-' + (r() * 4).toFixed(1) + 's', to: `${R(tx)}px ${R(ty)}px` }, `<path fill="${col}" d="${fr}"/><circle cx="${R(tx)}" cy="${R(ty)}" r="${R(h * 0.02 + 5)}" fill="${tcol}"/>`);
  };
  /** A fern clump (a comb of fronds) that sways. */
  const fern = (x, y, s, col, col2, seed) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < 7; i++) {
      const a = (-165 + i * 25 + r() * 8) * Math.PI / 180, L = (90 + r() * 60) * s, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L * 0.7 + L * 0.35, cx = x + Math.cos(a) * L * 0.5, cy = y + Math.sin(a) * L * 0.95 - L * 0.1;
      const d = `M${R(x)} ${R(y)}Q${R(cx)} ${R(cy)} ${R(ex)} ${R(ey)}`;
      o += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${R(13 * s)}" stroke-dasharray="2 4"/><path d="${d}" fill="none" stroke="${col2}" stroke-width="3"/>`;
    }
    return mv('ussway', { ad: (4 + r() * 2).toFixed(1) + 's', d: '-' + (r() * 3).toFixed(1) + 's', to: `${x}px ${y}px` }, o);
  };
  /** A tapering tree trunk with a flared foot and bark furrows. */
  const trunk = (x, w, y0, y1, fill, fl, furrow, seed) => {
    const r = rnd(seed || 3); let f = '';
    if (furrow) for (let i = 0; i < Math.round(w / 15); i++) { const xi = x - w / 2 + 8 + r() * (w - 16); f += `M${R(xi)} ${y0}Q${R(xi + 10 - r() * 20)} ${R((y0 + y1) / 2)} ${R(xi + 6 - r() * 12)} ${y1}`; }
    return `<path fill="${fill}" d="M${R(x - w / 2 - fl)} ${y1}Q${R(x - w / 2)} ${R(y1 - fl)} ${R(x - w / 2 + 3)} ${R(y1 - fl * 3)}L${R(x - w / 2 + 6)} ${y0}H${R(x + w / 2 - 6)}L${R(x + w / 2 - 3)} ${R(y1 - fl * 3)}Q${R(x + w / 2)} ${R(y1 - fl)} ${R(x + w / 2 + fl)} ${y1}z"/>` + (f ? `<path fill="none" stroke="${furrow}" stroke-width="3" opacity=".4" d="${f}"/>` : '');
  };
  /** A tuft of flower spikes / grass blades along a band (stroke dashes). */
  const spikes = (seed, n, x0, x1, y0, y1, col, w, gap, hh) => {
    const r = rnd(seed); let d = '';
    for (let i = 0; i < n; i++) { const x = R(x0 + r() * (x1 - x0)), y = R(y0 + r() * (y1 - y0)), h = R((hh || 40) * (0.6 + r() * 0.8)); d += `M${x} ${y}q${R(r() * 8 - 4)} ${-R(h / 2)} ${R(r() * 6 - 3)} ${-h}`; }
    return `<path fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="0 ${gap}" d="${d}"/>`;
  };
  /** A small sailboat (hull, mainsail, jib), feet on y. It bobs. */
  const sailboat = (x, y, s, hull, sail, sail2, ad) => `<g transform="translate(${x} ${y}) scale(${s})">` + mv('usbob', { ad: (ad || 3.2) + 's', dy: '3px' },
    `<path fill="${sail}" d="M2 -150L2 -14L82 -14C70 -70 40 -120 2 -150z"/><path fill="${sail2}" d="M-6 -128L-6 -14L-70 -14C-62 -64 -34 -104 -6 -128z"/><path fill="${hull}" d="M-92 -10H112L88 18H-66z"/><path stroke="#6b5a48" stroke-width="3" d="M-2 -158V-10"/>`) + `</g>`;
  const S = [];
  const add = (o) => usSceneAdd(o);

  /* ---------- California: redwood forest, light shafts and fern ---------- */
  add({ key: 'state:CA', label: 'Redwoods in the morning mist', site: 'Redwood National Park', colour: 'green', mood: 'calm', season: 'any', tags: ['redwood', 'forest', 'mist'],
    svg: () => {
      const s1 = U(), sh = U(), g1 = U(), g2 = U(), g3 = U(), g4 = U();
      const hg = (id, x, w) => linU(id, [[0, '#4a2619'], [0.35, '#a3583a'], [0.7, '#7a3f29'], [1, '#3c1e15']], x - w / 2, 0, x + w / 2, 0);
      let far = '', mid = '';
      [60, 260, 470, 690, 880, 1110, 1320, 1530].forEach((x, i) => { far += trunk(x + (i % 2) * 20, 60 + (i * 17) % 40, -10, 690, '#9fb184', 24); });
      [[330, 110], [650, 96], [980, 120], [1290, 100]].forEach(([x, w], i) => { mid += trunk(x, w, -10, 760, '#74503a', 40, '#2c1a12', 20 + i); });
      const shafts = [[560, 70], [800, 110], [1060, 80], [1290, 60]].map(([x, w]) => `M${x} -20h${w}L${x + w * 1.4 - 230} 790h${-R(w * 1.5)}z`);
      return `<defs>${lin(s1, [[0, '#dfe8b4'], [0.5, '#b3cf86'], [1, '#6c9154']])}${linU(sh, [[0, '#fff7c8', 0.8], [1, '#fff7c8', 0]], 0, 0, 0, 780)}${hg(g1, 110, 250)}${hg(g2, 1500, 290)}${radU(g3, [[0, '#fffbd0', 0.95], [1, '#fffbd0', 0]], 1000, 40, 820)}${lin(g4, [[0, '#4d6e3a'], [1, '#26401f']])}</defs>`
        + full(`url(#${s1})`) + `<rect width="1600" height="900" fill="url(#${g3})"/>`
        + `<g transform="translate(0 110) scale(1 -1)">${canopy('#3d5f2c', 52, 36, 5, -160, 1760, 110)}${canopy('#2c4a22', 36, 30, 6, -160, 1760, 110)}</g>`
        + mv('uspar', { ad: '36s', dx: '9px' }, far) + haze(300, 360, '#eef4cf', 0.7)
        + mv('uspar', { ad: '28s', dx: '16px' }, mid) + mv('usdrift', { ad: '52s', dx: '120px' }, haze(520, 110, '#f6fae0', 0.55)) + mv('usdrift', { ad: '64s', d: '-20s', dx: '90px' }, haze(610, 90, '#f6fae0', 0.5))
        + `<g fill="url(#${sh})">` + shafts.map((d, i) => mv('usglow', { ad: (6 + i * 1.3).toFixed(1) + 's', d: '-' + (i * 1.7).toFixed(1) + 's' }, `<path d="${d}"/>`)).join('') + `</g>`
        + ridge(`url(#${g4})`, 790, 26, 9, 4) + `<path fill="#bfa070" opacity=".5" d="M700 900Q760 840 800 800Q830 780 860 790Q820 830 880 900z"/>`
        + fern(430, 850, 1.1, '#5f8c3c', '#3e6a2a', 1) + fern(790, 880, 1.2, '#73a147', '#46702b', 2) + fern(1080, 850, 1, '#5f8c3c', '#3e6a2a', 3) + fern(1290, 885, 1.2, '#73a147', '#46702b', 4) + fern(280, 890, 1, '#6c9a43', '#3e6a2a', 5)
                + mv('uspar', { ad: '22s', dx: '12px' }, trunk(110, 250, -10, 910, `url(#${g1})`, 70, '#24120c', 31) + trunk(1500, 290, -10, 910, `url(#${g2})`, 80, '#24120c', 32)
          + `<ellipse cx="60" cy="780" rx="90" ry="38" fill="#5f8a3c" opacity=".85"/><ellipse cx="1560" cy="800" rx="110" ry="40" fill="#5f8a3c" opacity=".85"/>`)
        + fern(250, 900, 1.5, '#4f7c33', '#2f5a22', 6) + fern(1360, 910, 1.5, '#4f7c33', '#2f5a22', 7)
        + [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => mv('usbob', { ad: (5 + i * 0.7).toFixed(1) + 's', d: '-' + i + 's', dy: '14px' }, `<circle cx="${700 + i * 63}" cy="${300 + (i * 97) % 360}" r="${2 + i % 3}" fill="#fffbd8" opacity=".8"/>`)).join('')
        + [0, 1, 2, 3, 4, 5].map((i) => `<path class="x-usfall" style="--ad:${(9 + i * 1.4).toFixed(1)}s;--d:-${(i * 2.1).toFixed(1)}s;--dx:${(i % 2 ? 1 : -1) * (50 + i * 12)}px" fill="#6d4a22" d="M${620 + i * 130} ${60 + (i * 41) % 90}q9-12 18 0q-9 12-18 0z"/>`).join('')
        + birds(8, 3, 980, 190, '#2e2a20', 0.9, 480) + finish(0.34);
    } });

  /* ---------- Hawaii: Kilauea lava glowing at night ---------- */
  add({ key: 'state:HI', label: 'Kilauea glowing at night', site: 'Hawaii Volcanoes National Park', colour: 'red', mood: 'energetic', season: 'any', tags: ['volcano', 'lava', 'night'],
    svg: () => {
      const s1 = U(), gl = U(), lv = U(), sea = U(), rf = U(), gl2 = U();
      const flow = 'M850 452C900 520 950 590 1010 630S1170 690 1260 738';
      const flow2 = 'M770 452C730 520 640 580 560 640S440 700 380 752';
      const sst = (seed, n, y1, op) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) o += `<circle cx="${R(r() * 1600)}" cy="${R(r() * y1)}" r="${(1 + r() * 1.5).toFixed(1)}"/>`; return `<g fill="#fff" opacity="${op}">${o}</g>`; };
      return `<defs>${lin(s1, [[0, '#0f0b2c'], [0.4, '#3b2159'], [0.68, '#9b3b46'], [1, '#ff8a3a']])}${radU(gl, [[0, '#ff7a28', 0.85], [0.5, '#ff5a20', 0.3], [1, '#ff5a20', 0]], 800, 450, 760)}${lin(sea, [[0, '#3a2445'], [1, '#0b0c26']])}${radU(rf, [[0, '#ff8a3a', 0.7], [1, '#ff8a3a', 0]], 1260, 770, 260)}${lin(lv, [[0, '#ffe27a'], [1, '#ff5a1c']])}${radU(gl2, [[0, '#ff7a28', 0.55], [1, '#ff7a28', 0]], 800, 450, 520)}</defs>`
        + full(`url(#${s1})`) + mv('usglow', { ad: '4.4s' }, sst(21, 34, 360, 0.8)) + mv('usglow', { ad: '5.6s', d: '-2s' }, sst(22, 30, 330, 0.7)) + stars(23, 40, 300)
        + cloud(330, 250, 1.3, '#e58a60', 0.55, 66, 3, '#5c3a78') + cloud(1230, 190, 1.1, '#d9724f', 0.5, 58, 22, '#4f3270')
        + mv('uspar', { ad: '40s', dx: '8px' }, ridge('#34204a', 575, 36, 9, 31) + haze(520, 120, '#c05a5a', 0.4))
        + `<rect width="1600" height="900" fill="url(#${gl})"/>`
        + `<g opacity=".5">${puffs(800, 436, 9, '#8a4a52', 46, 70, 8, -400, 3.4)}${puffs(800, 436, 8, '#c8603f', 30, -40, 6, -330, 2.6)}</g>`
        + `<path fill="#2d1c33" d="M-160 780C80 720 300 640 520 548C640 498 700 470 740 452L780 446H820L870 452C920 470 980 500 1100 560C1300 650 1500 720 1760 780V900H-160z"/>`
        + `<path fill="#3c2640" opacity=".7" d="M520 548C640 498 700 470 740 452L800 600z"/><path fill="url(#${gl2})" d="M-160 780C80 720 300 640 520 548C640 498 700 470 740 452L780 446H820L870 452C920 470 980 500 1100 560C1300 650 1500 720 1760 780V900H-160z"/>`
        + `<ellipse cx="800" cy="448" rx="82" ry="14" fill="#2d1c33"/>` + mv('usglow', { ad: '2.8s' }, `<ellipse cx="800" cy="449" rx="64" ry="9" fill="url(#${lv})"/><ellipse cx="820" cy="448" rx="20" ry="4" fill="#fff3b0"/>`)
        + mv('usglow', { ad: '3.6s', d: '-1s' }, `<path d="${flow}" fill="none" stroke="#ff7a28" stroke-width="22" opacity=".35" stroke-linecap="round"/><path d="${flow}" fill="none" stroke="#ff6a1f" stroke-width="9" stroke-linecap="round"/><path d="${flow}" fill="none" stroke="#ffc04a" stroke-width="3"/>`
          + `<path d="${flow2}" fill="none" stroke="#ff7a28" stroke-width="18" opacity=".3" stroke-linecap="round"/><path d="${flow2}" fill="none" stroke="#ff5a1c" stroke-width="7" stroke-linecap="round"/><path d="${flow2}" fill="none" stroke="#ffc04a" stroke-width="2.5"/>`)
        + `<rect y="738" width="1600" height="162" fill="url(#${sea})"/><rect y="738" width="1600" height="162" fill="url(#${rf})"/>`
        + shimmer(3, 20, 1000, 1500, 746, 880, '#ffb04a', 46) + shimmer(4, 16, -100, 1700, 770, 890, '#8d7fbf', 56)
        + `<g opacity=".5">${puffs(1262, 736, 8, '#d9a08a', 34, 50, 6, -320, 3.2)}</g>`
        + `<path fill="#e8e0f0" opacity=".4" d="M-160 742H1760v4H-160z"/>`
        + mv('uspar', { ad: '20s', dx: '10px' }, ridge('#120d1c', 840, 44, 16, 9) + `<path fill="none" stroke="#ff5a1c" stroke-width="3" d="M120 860l30-18 22 12 34-20M560 872l28-14 26 10 24-14M1050 858l34-16 24 14 30-12M1380 872l24-12 30 8"/>`)
        + mv('usflicker', { ad: '1.1s' }, `<path fill="none" stroke="#ffb040" stroke-width="2" d="M300 884l20-10 18 8M820 880l24-12 16 6M1220 884l22-10 20 6"/>`)
        + puffs(800, 440, 12, '#ffb040', 5, 40, 3, -300, 1.2)
        + palm(150, 920, 560, 70, '#0b0814', '#0b0814', 3, 7) + palm(300, 930, 420, -40, '#0b0814', '#0b0814', 6, 6) + palm(1480, 930, 500, -60, '#0b0814', '#0b0814', 8, 8)
        + birds(14, 2, 400, 330, '#0b0814', 0.8, 420) + finish(0.3);
    } });

  /* ---------- Oregon: Crater Lake and Wizard Island under the Milky Way ---------- */
  add({ key: 'state:OR', label: 'Crater Lake under the stars', site: 'Crater Lake and Wizard Island', colour: 'indigo', mood: 'dreamy', season: 'any', tags: ['lake', 'crater', 'stars', 'night'],
    svg: () => {
      const s1 = U(), lk = U(), mw = U(), hz = U();
      const sst = (seed, n, y1, y0, op) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) o += `<circle cx="${R(r() * 1600)}" cy="${R((y0 || 0) + r() * y1)}" r="${(0.9 + r() * 1.6).toFixed(1)}"/>`; return `<g fill="#fff" opacity="${op}">${o}</g>`; };
      const wiz = 'M520 696C590 694 650 644 690 614L718 598Q736 606 758 614C800 646 850 692 930 698C860 712 600 712 520 696z';
      return `<defs>${lin(s1, [[0, '#060928'], [0.45, '#1b2a6a'], [0.8, '#5666a8'], [1, '#c3a8c9']])}${lin(lk, [[0, '#2e5090'], [0.5, '#173270'], [1, '#08144a']])}<radialGradient id="${mw}"><stop offset="0" stop-color="#dfe6ff" stop-opacity=".55"/><stop offset=".55" stop-color="#aebcf0" stop-opacity=".2"/><stop offset="1" stop-color="#aebcf0" stop-opacity="0"/></radialGradient>${radU(hz, [[0, '#f0c0d0', 0.6], [1, '#f0c0d0', 0]], 800, 560, 620)}</defs>`
        + full(`url(#${s1})`)
        + `<g transform="rotate(-24 800 270)"><ellipse cx="800" cy="270" rx="980" ry="120" fill="url(#${mw})"/><ellipse cx="800" cy="270" rx="760" ry="44" fill="url(#${mw})"/></g>`
        + dots('M-100 470Q700 80 1700 180', '#e8ecff', 3, 11, '', ' opacity=".55"') + dots('M-100 400Q700 60 1700 120', '#cdd6ff', 2, 8, '', ' opacity=".5"')
        + mv('usglow', { ad: '4s' }, sst(61, 60, 440, 0, 0.85)) + mv('usglow', { ad: '5.3s', d: '-2s' }, sst(62, 50, 420, 0, 0.7)) + stars(63, 50, 420)
        + mv('usglide', { ad: '10s', d: '-3s', dx: '520px', dy: '240px' }, `<path d="M300 120l76 34" stroke="#fff" stroke-width="3.5" stroke-linecap="round" fill="none"/>`)
        + cloud(1150, 170, 1.1, '#6a76ba', 0.32, 76, 4, '#8590d0') + cloud(300, 250, 0.9, '#6a76ba', 0.28, 90, 24, '#8590d0')
        + `<rect width="1600" height="900" fill="url(#${hz})"/>`
        + mv('uspar', { ad: '44s', dx: '8px' }, ridge('#3a4684', 548, 40, 11, 42, 600) + haze(500, 110, '#a0acd8', 0.35))
        + `<rect y="572" width="1600" height="328" fill="url(#${lk})"/>`
        + `<g opacity=".5">${sst(64, 40, 300, 590, 0.8)}</g>`
        + `<g opacity=".55" transform="translate(0 1400) scale(1 -1)"><path fill="#16204a" d="${wiz}"/></g>`
        + `<path fill="#141d48" d="${wiz}"/><path fill="#26336c" opacity=".7" d="M690 614L718 598Q736 606 758 614L725 650z"/><ellipse cx="722" cy="602" rx="20" ry="4" fill="#0c1438"/>`
        + shimmer(7, 22, 260, 1340, 640, 880, '#a9b8ee', 54) + shimmer(8, 10, 560, 960, 700, 780, '#fff', 36)
        + mv('usdrift', { ad: '50s', dx: '120px' }, haze(590, 70, '#a8b8ee', 0.3))
        + `<path fill="#0a1033" d="M-160 900V480C-20 480 140 560 300 690C400 770 450 840 500 900z"/><path fill="#0a1033" d="M1760 900V470C1640 480 1520 560 1380 690C1290 770 1240 840 1200 900z"/>`
        + mv('ussway', { ad: '8s', to: '100px 900px' }, firs(51, -160, 380, 900, 180, 360, '#060a22')) + mv('ussway', { ad: '9s', d: '-3s', to: '1400px 900px' }, firs(52, 1240, 1760, 900, 170, 340, '#060a22'))
        + mv('usbob', { ad: '2.4s', dy: '1px' }, `<path fill="#ffd27a" class="us-lit" opacity="0" d="M160 880l14 -22 14 22z"/>`)
        + birds(55, 2, 600, 380, '#0a1033', 0.8, 400) + finish(0.3);
    } });

  /* ---------- Washington: Mount Rainier at sunrise over a still lake ---------- */
  add({ key: 'state:WA', label: 'Mount Rainier at sunrise', site: 'Mount Rainier', colour: 'blue', mood: 'calm', season: 'any', tags: ['mountain', 'rainier', 'sunrise', 'lake'],
    svg: () => {
      const s1 = U(), mt = U(), lk = U(), g3 = U();
      const peak = 'M180 700C300 680 380 570 470 510C520 476 560 448 600 384C640 334 670 302 700 272C720 252 742 234 772 228C800 224 822 234 852 242C892 252 922 272 962 312C1002 352 1032 402 1092 462C1162 532 1262 620 1400 700V740H180z';
      return `<defs>${lin(s1, [[0, '#5b7cc6'], [0.32, '#c7a4d2'], [0.58, '#ffc1a2'], [0.82, '#ffe1b0'], [1, '#fff0cc']])}${linU(mt, [[0, '#fbd5cd'], [0.4, '#fff4ee'], [0.7, '#e9e4f2'], [1, '#98a6d6']], 180, 0, 1400, 0)}${lin(lk, [[0, '#7f9ec8'], [0.4, '#4f78a6'], [1, '#2c4f7c']])}${radU(g3, [[0, '#fff0c0', 0.8], [1, '#fff0c0', 0]], 200, 600, 700)}</defs>`
        + full(`url(#${s1})`) + sun(190, 590, 42, '#fffbe8', '#ffd69a', true) + `<rect width="1600" height="900" fill="url(#${g3})"/>`
        + streak(1180, 150, 300, '#fff0e8', 0.5, 66) + cloud(1300, 230, 1.1, '#f0c8c8', 0.85, 60, 8, '#fff2ee') + cloud(330, 170, 0.9, '#f3c8c8', 0.8, 70, 30, '#fff2ee')
        + mv('uspar', { ad: '50s', dx: '6px' }, ridge('#9aa0cc', 650, 50, 9, 61, 740) + haze(600, 100, '#ffe6d0', 0.5))
        + `<path fill="url(#${mt})" d="${peak}"/>`
        + `<path fill="#6a74ae" opacity=".3" d="M772 228C800 224 822 234 852 242C892 252 922 272 962 312C1002 352 1032 402 1092 462C1162 532 1262 620 1400 700V716H800C790 520 780 380 772 228z"/>`
        + `<g fill="#8a84b8" opacity=".4"><path d="M770 232L758 232C752 350 730 470 690 650L730 650C760 500 774 380 770 232z"/><path d="M852 244L866 246C890 350 930 470 1000 650L950 650C900 500 868 360 852 244z"/><path d="M700 290L714 300C660 400 590 480 500 560L470 540C560 470 650 380 700 290z"/><path d="M962 316L972 306C1030 380 1100 450 1200 600L1160 610C1100 520 1020 440 962 316z"/></g>`
        + `<path fill="#5c5a8c" opacity=".55" d="M560 470l40-26 24 18-14 24zM1090 500l36-20 26 22-20 24zM700 540l30-20 22 20-24 22z"/>`
        + `<path fill="none" stroke="#fff" stroke-width="3" opacity=".6" d="M730 290l40 70M820 280l-30 90M900 330l-50 90"/>`
        + mv('usdrift', { ad: '40s', dx: '70px' }, `<ellipse cx="790" cy="262" rx="150" ry="14" fill="#fff" opacity=".8"/><ellipse cx="800" cy="246" rx="100" ry="10" fill="#fff" opacity=".85"/><ellipse cx="770" cy="282" rx="190" ry="9" fill="#ffe0d8" opacity=".6"/>`)
        + mv('uspar', { ad: '34s', dx: '12px' }, ridge('#4f6094', 700, 36, 10, 62, 740) + firs(63, -160, 1760, 716, 60, 140, '#2f4c4c', 750))
        + `<rect y="716" width="1600" height="184" fill="url(#${lk})"/>`
        + `<g opacity=".4" transform="translate(0 1432) scale(1 -1)"><path fill="url(#${mt})" d="${peak}"/></g>`
        + `<rect y="716" width="1600" height="184" fill="url(#${lk})" opacity=".45"/>`
        + shimmer(9, 24, 160, 1440, 730, 880, '#ffe9d0', 56) + mv('usdrift', { ad: '46s', dx: '90px' }, haze(716, 60, '#ffe6d0', 0.55))
        + `<path fill="#355d3c" d="M-160 900V850Q300 800 700 840T1500 830L1760 850V900z"/>`
        + mv('ussway', { ad: '5.2s', to: '800px 900px' }, spikes(71, 80, 0, 1600, 830, 890, '#6d4aa8', 10, 8, 50) + spikes(72, 50, 0, 1600, 835, 890, '#9b78d4', 6, 6, 40) + spikes(73, 22, 0, 1600, 840, 890, '#e2543a', 10, 9, 36) + spikes(74, 30, 0, 1600, 850, 895, '#fff', 8, 8, 28))
        + mv('ussway', { ad: '9s', to: '60px 900px' }, firs(75, -160, 300, 905, 260, 460, '#1d3a36')) + mv('ussway', { ad: '10s', d: '-4s', to: '1500px 900px' }, firs(76, 1300, 1760, 905, 240, 440, '#1d3a36'))
        + birds(77, 4, 1000, 230, '#3a3f66', 1, 560) + finish(0.3);
    } });

  /* ---------- Los Angeles: palms, skyline and searchlights at sunset ---------- */
  add({ key: 'place:los-angeles', label: 'Palms, skyline and searchlights', site: 'Downtown Los Angeles at sunset', colour: 'pink', mood: 'proud', season: 'any', tags: ['palm', 'sunset', 'hollywood', 'skyline'],
    svg: () => {
      const s1 = U(), hz = U(), b1 = U(), b2 = U(), hl = U();
      const beam = (x, y, a, len, w) => `<g transform="rotate(${a} ${x} ${y})"><path fill="url(#${b1})" d="M${x - 5} ${y}L${x - w} ${y - len}H${x + w}L${x + 5} ${y}z"/></g>`;
      let sign = ''; for (let i = 0; i < 9; i++) sign += `<rect x="${130 + i * 36}" y="${486 - (i % 2) * 2}" width="26" height="34"/><rect x="${138 + i * 36}" y="${494}" width="10" height="18" fill="#a58a7a"/>`;
      const car = (x, y, col, ad, d, dx) => mv('usdrift', { ad: ad + 's', d: '-' + d + 's', dx: dx + 'px' }, `<rect x="${x}" y="${y}" width="9" height="4" rx="2" fill="${col}"/><rect x="${x + 22}" y="${y}" width="9" height="4" rx="2" fill="${col}"/><rect x="${x + 48}" y="${y}" width="9" height="4" rx="2" fill="${col}"/>`);
      return `<defs>${lin(s1, [[0, '#3c3a82'], [0.3, '#b5568f'], [0.58, '#ff9a5e'], [0.85, '#ffd48a'], [1, '#ffe6b0']])}<linearGradient id="${b1}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff6d0" stop-opacity=".85"/><stop offset="1" stop-color="#fff6d0" stop-opacity="0"/></linearGradient>${lin(hl, [[0, '#6a3c6a'], [1, '#3b2447']])}</defs>`
        + full(`url(#${s1})`) + sun(1000, 405, 46, '#fff4d6', '#ffcf86', false)
        + streak(300, 190, 320, '#ffd0c0', 0.5, 70) + streak(1200, 300, 360, '#ffc0a0', 0.5, 56) + cloud(1380, 150, 1, '#e87a8c', 0.7, 66, 4, '#ffd8d0') + cloud(430, 300, 0.8, '#e07890', 0.6, 54, 18, '#ffd0c4')
        + mv('uspar', { ad: '48s', dx: '8px' }, ridge('#9a6a9e', 560, 56, 10, 81, 640) + haze(520, 120, '#ffc0a0', 0.5))
        + mv('uspar', { ad: '36s', dx: '12px' },
          tower(560, 640, 56, 130, '#6a4a7c', 'flat') + tower(630, 640, 46, 190, '#6a4a7c', 'spire') + tower(690, 640, 70, 150, '#6a4a7c', 'flat') + tower(780, 640, 60, 270, '#5e4072', 'step') + tower(850, 640, 50, 200, '#64447a', 'pyr')
          + tower(920, 640, 80, 170, '#6a4a7c', 'flat') + tower(1010, 640, 44, 120, '#6a4a7c', 'flat') + tower(1070, 640, 60, 215, '#5e4072', 'spire') + tower(1140, 640, 70, 140, '#6a4a7c', 'flat') + tower(1220, 640, 46, 100, '#6a4a7c', 'flat')
          + bld(83, 420, 1500, 640, 40, 90, '#6a4a7c', 24, 50, 10) + `<path stroke="#5e4072" stroke-width="3" d="M810 340V300"/>`)
        + haze(600, 80, '#ffb08a', 0.45)
        + `<path fill="#4e3566" d="M400 760V690H640V672H820V700H1000V684H1300V700H1760V760z"/>` + wins(84, 420, 1700, 690, 750, 70, 4) + dots('M420 726H1700', '#ffd27a', 3, 22, 'us-lit')
        + `<path fill="url(#${hl})" d="M-160 760C-60 640 40 570 170 540C280 500 340 480 420 520C500 560 520 650 620 720L700 900H-160z"/>`
        + `<g fill="#f0e2d6" opacity=".9">${sign}</g>`
        + `<g transform="translate(300 546)"><ellipse cx="0" cy="0" rx="34" ry="8" fill="#e8d8cc"/><path fill="#e8d8cc" d="M-26 0V-14H26V0z"/><path fill="#c9b0a0" d="M-14 -14A14 14 0 0 1 14 -14z"/></g>`
        + `<path fill="#2e2040" d="M-160 900V800C100 760 300 790 520 770C760 750 900 770 1100 760C1300 750 1500 780 1760 760V900z"/>`
        + `<path fill="none" stroke="#3a2a4e" stroke-width="30" d="M-160 800C300 770 700 770 1100 790S1600 800 1760 790"/><path fill="none" stroke="#e8d8c0" stroke-width="2" stroke-dasharray="14 18" d="M-160 800C300 770 700 770 1100 790S1600 800 1760 790"/>`
        + car(100, 790, '#fff4c8', 11, 0, 500) + car(500, 786, '#ffe9a0', 14, 5, 400) + car(900, 790, '#ff5a4a', 12, 3, 500) + car(1300, 794, '#ff5a4a', 15, 9, 420) + car(300, 796, '#fff4c8', 17, 12, 380)
        + `<g fill="#ffd27a" class="us-lamps" opacity="0">${dots('M-100 770H1700', '#ffd27a', 5, 70, 'us-lamps')}</g>`
        + mv('ussway2', { ad: '9s', to: '1250px 860px' }, beam(1250, 860, -14, 760, 22) + beam(1250, 860, 10, 760, 22)) + mv('ussway2', { ad: '11s', d: '-3s', to: '1400px 860px' }, beam(1400, 860, 20, 700, 18) + beam(1400, 860, -22, 700, 18))
        + palm(150, 920, 640, 60, '#2a1a3a', '#2a1a3a', 3, 7) + palm(300, 940, 520, -40, '#2a1a3a', '#2a1a3a', 5, 8) + palm(1500, 940, 700, -70, '#2a1a3a', '#2a1a3a', 9, 7) + palm(1360, 940, 540, 40, '#2a1a3a', '#2a1a3a', 11, 9) + palm(820, 790, 250, 12, '#3a2850', '#3a2850', 13, 6)
        + `<path fill="#241532" d="M-160 900V860C100 840 300 870 600 856C900 842 1200 874 1760 860V900z"/>`
        + birds(88, 4, 700, 260, '#4a2e5e', 1, 520) + finish(0.34);
    } });

  /* ---------- San Francisco: the Golden Gate in fog at sunrise ---------- */
  add({ key: 'place:san-francisco', label: 'Golden Gate Bridge in fog', site: 'The Golden Gate Bridge', colour: 'red', mood: 'dreamy', season: 'any', tags: ['bridge', 'fog', 'golden-gate', 'sunrise'],
    svg: () => {
      const s1 = U(), sea = U(), hl = U(), br = U(), fg = U();
      const fog = (x, y, rx, ry, ad, d, dx) => mv('usdrift', { ad: ad + 's', d: '-' + d + 's', dx: dx + 'px' }, `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#${fg})"/>`);
      const tx = [470, 1150], deck = 600, top = 230;
      const tw = (x) => `<path fill="url(#${br})" d="M${x - 30} ${deck + 90}V${top + 20}L${x - 22} ${top}H${x + 22}L${x + 30} ${top + 20}V${deck + 90}H${x + 20}V${top + 30}H${x - 20}V${deck + 90}z"/>`
        + `<path fill="url(#${br})" d="M${x - 34} ${top + 120}H${x + 34}V${top + 140}H${x - 34}zM${x - 34} ${top + 240}H${x + 34}V${top + 258}H${x - 34}zM${x - 34} ${top + 40}H${x + 34}V${top + 56}H${x - 34}z"/>`
        + mv('usflicker', { ad: '1.6s' }, `<circle cx="${x}" cy="${top - 8}" r="4" fill="#ff7a5a"/>`);
      // main cable: parabola between towers, side cables down to the shores
      const cab = (x0, x1, yE, yM) => `M${x0} ${yE}Q${(x0 + x1) / 2} ${2 * yM - yE} ${x1} ${yE}`;
      const cableY = (x0, x1, yE, yM, x) => { const t = (x - x0) / (x1 - x0), cy = 2 * yM - yE; return (1 - t) * (1 - t) * yE + 2 * (1 - t) * t * cy + t * t * yE; };
      let sus = '';
      for (let x = tx[0] + 24; x < tx[1] - 20; x += 22) { const y = cableY(tx[0], tx[1], top + 10, deck - 30, x); sus += `M${x} ${R(y)}V${deck}`; }
      const side = (xa, xb, ya, yb) => { let o = ''; for (let x = xa; x < xb; x += 22) { const t = (x - xa) / (xb - xa), y = ya + (yb - ya) * (t * t * 0.4 + t * 0.6); o += `M${x} ${R(y)}V${deck + 2}`; } return o; };
      return `<defs>${lin(s1, [[0, '#a9b8cc'], [0.45, '#f4c8b4'], [0.75, '#ffe0b8'], [1, '#fff0d0']])}${lin(sea, [[0, '#8fa8b4'], [1, '#3e6272']])}${lin(hl, [[0, '#8a9a6a'], [1, '#4c5f46']])}${lin(br, [[0, '#e0553a'], [1, '#a3341f']])}<radialGradient id="${fg}"><stop offset="0" stop-color="#f4f6f6" stop-opacity=".95"/><stop offset=".55" stop-color="#eef2f2" stop-opacity=".6"/><stop offset="1" stop-color="#eef2f2" stop-opacity="0"/></radialGradient></defs>`
        + full(`url(#${s1})`) + sun(1260, 380, 46, '#fff6dc', '#ffc99a', true)
        + streak(300, 140, 320, '#fff', 0.45, 70) + cloud(700, 150, 0.9, '#ecc0b6', 0.7, 66, 12, '#fff2ea')
        + mv('uspar', { ad: '50s', dx: '8px' }, ridge('#a6a8bc', 520, 40, 9, 91, 640) + haze(480, 120, '#f6e0d0', 0.6))
        + `<rect y="610" width="1600" height="290" fill="url(#${sea})"/>`
        + `<path fill="url(#${hl})" d="M-160 760C-100 640 20 560 160 520C240 500 300 520 360 570L420 640C446 740 410 820 384 900H-160z"/><path fill="#566b4a" opacity=".6" d="M160 520C240 500 300 520 360 570L300 640C260 590 210 560 160 520z"/>`
        + `<path fill="url(#${hl})" opacity=".8" d="M1760 700C1700 620 1620 580 1540 590C1470 600 1420 640 1390 690C1370 770 1350 840 1346 900H1760z"/>`
        + `<g opacity=".85"><path fill="none" stroke="#c0432c" stroke-width="3" d="${cab(tx[0], tx[1], top + 10, deck - 30)}"/><path fill="none" stroke="#c0432c" stroke-width="2" d="${sus}"/></g>`
        + `<path fill="none" stroke="#c0432c" stroke-width="3" d="M-160 ${deck - 10}Q${tx[0] - 200} ${top + 160} ${tx[0]} ${top + 10}M${tx[1]} ${top + 10}Q${tx[1] + 220} ${top + 150} 1760 ${deck - 20}"/>`
        + `<path fill="none" stroke="#c0432c" stroke-width="2" d="${side(tx[1] + 24, 1740, top + 20, deck - 20)}"/>`
        + `<rect x="-160" y="${deck}" width="1920" height="16" fill="#b8381f"/><rect x="-160" y="${deck + 16}" width="1920" height="8" fill="#7c2615"/><path fill="#b8381f" d="M-160 ${deck + 24}H1760V${deck + 44}H-160z" opacity=".55"/>`
        + dots(`M-100 ${deck - 4}H1700`, '#fff2c0', 3, 40, 'us-lamps')
        + tw(tx[0]) + tw(tx[1])
        + fog(160, 640, 560, 120, 44, 0, 120) + fog(1420, 690, 520, 110, 52, 20, 130) + fog(820, 620, 460, 70, 60, 8, 150) + fog(480, 470, 300, 60, 66, 30, 90) + fog(1000, 720, 420, 80, 48, 14, 110)
        + mv('usdrift', { ad: '58s', d: '-14s', dx: '160px' }, haze(560, 130, '#eef0ee', 0.8))
        + mv('usdrift', { ad: '46s', d: '-30s', dx: '130px' }, haze(650, 110, '#e6ecee', 0.85))
        + shimmer(92, 20, 440, 1340, 700, 880, '#ffe7d0', 56)
        + mv('usdrift', { ad: '55s', dx: '300px' }, `<g transform="translate(840 706) scale(.7)">` + mv('usbob', { ad: '3s', dy: '2px' }, `<path fill="#d9d4cc" d="M-90 0H90L70 -18H-60z"/><rect x="-40" y="-34" width="64" height="16" fill="#e9e4dc"/><rect x="-62" y="-26" width="18" height="8" fill="#c0432c"/>`) + `</g>`)
        + sailboat(1020, 830, 0.8, '#f4f0e6', '#fff', '#ffd9c0', 3.6)
        + birds(93, 6, 800, 330, '#6b6e80', 1.2, 620) + birds(94, 3, 300, 420, '#6b6e80', 1.1, 500)
        + finish(0.3);
    } });

  /* ---------- San Diego: harbor, Coronado Bridge, sailboats and a sea lion ---------- */
  add({ key: 'place:san-diego', label: 'Sailboats and a sea lion', site: 'San Diego Bay', colour: 'blue', mood: 'cheerful', season: 'any', tags: ['sailboat', 'sea-lion', 'harbor', 'bridge'],
    svg: () => {
      const s1 = U(), sea = U(), pt = U();
      const dy = (x) => 560 - 215 * Math.exp(-Math.pow((x - 800) / 300, 2));
      let br = ''; for (let x = -160; x <= 1760; x += 40) br += (x > -160 ? 'L' : 'M') + x + ' ' + R(dy(x));
      let pil = ''; for (let x = 20; x < 1600; x += 80) { const y = dy(x); if (y < 636) pil += `M${x - 9} 650L${x - 5} ${R(y + 10)}H${x + 5}L${x + 9} 650z`; }
      const buoy = `<g transform="translate(1290 800) scale(1.2)">` + mv('usbob', { ad: '3.4s', dy: '4px' }, `<path fill="#c9442c" d="M-60 0L-48 -46H48L60 0z"/><rect x="-52" y="-30" width="104" height="9" fill="#fff"/><path fill="#6b5846" d="M-58 -46C-70 -96 -40 -140 -14 -168C-6 -196 14 -212 38 -214C60 -214 82 -204 100 -192L124 -190C130 -186 126 -178 118 -178L102 -172C92 -160 76 -154 60 -152C58 -110 74 -70 64 -46z"/><path fill="#55432f" d="M-8 -128C-44 -108 -66 -76 -56 -46C-30 -72 4 -96 20 -118z"/><path fill="none" stroke="#e8dcc8" stroke-width="2" d="M108 -184l30 -6M108 -180l30 6"/><circle cx="84" cy="-196" r="4" fill="#111"/><circle cx="124" cy="-187" r="4" fill="#222"/>`) + `</g>`;
      return `<defs>${lin(s1, [[0, '#3f8fe0'], [0.55, '#8cc8f2'], [1, '#e2f2fa']])}${lin(sea, [[0, '#59b4d8'], [0.4, '#2f87b8'], [1, '#17598a']])}${lin(pt, [[0, '#b9a37e'], [1, '#7f8a56']])}</defs>`
        + full(`url(#${s1})`) + sun(300, 160, 40, '#fffbe6', '#fff0b0', false)
        + cloud(420, 200, 1.1, '#d8e8f4', 0.95, 56, 6) + cloud(1220, 140, 1.4, '#dbeaf5', 0.95, 66, 30) + cloud(820, 250, 0.7, '#e4eff8', 0.85, 48, 14)
        + `<path fill="url(#${pt})" opacity=".9" d="M-160 620C0 560 160 520 300 540C420 556 520 600 620 640V700H-160z"/>`
        + mv('uspar', { ad: '40s', dx: '9px' }, bld(101, -100, 700, 640, 20, 70, '#9fb0bf', 16, 36, 6) + tower(300, 640, 38, 170, '#aab8c6', 'flat') + tower(420, 640, 34, 120, '#b4c0cc', 'flat') + tower(520, 640, 40, 210, '#a2b2c2', 'spire') + bld(103, 900, 1700, 640, 14, 40, '#b7c4d0', 18, 30, 8))
        + `<rect y="640" width="1600" height="260" fill="url(#${sea})"/>`
        + `<path fill="#dde5ec" d="${pil}"/><path fill="none" stroke="#9fb0bf" stroke-width="30" stroke-linejoin="round" transform="translate(0 6)" d="${br}"/><path fill="none" stroke="#eef3f7" stroke-width="22" stroke-linejoin="round" d="${br}"/><path fill="none" stroke="#c3ced8" stroke-width="3" transform="translate(0 -8)" d="${br}"/>`
        + `<g opacity=".3" transform="translate(0 1280) scale(1 -1)"><path fill="#dde5ec" d="${pil}"/></g>`
        + shimmer(102, 30, -100, 1700, 650, 880, '#e6f6ff', 60) + shimmer(103, 12, -100, 1700, 760, 890, '#fff', 70)
        + mv('usdrift', { ad: '38s', dx: '240px' }, sailboat(430, 760, 0.9, '#f4f4ee', '#fff', '#ffe08a', 3.2))
        + mv('usdrift', { ad: '50s', d: '-18s', dx: '300px' }, sailboat(830, 700, 0.6, '#2c5aa0', '#fff', '#ff8a6a', 2.8))
        + mv('usdrift', { ad: '44s', d: '-8s', dx: '200px' }, sailboat(1000, 745, 0.7, '#f0ece0', '#fff', '#ffd0a0', 3))
        + mv('usdrift', { ad: '70s', dx: '420px' }, `<g transform="translate(1430 660)"><path fill="#7a8794" d="M-160 0H170L130 -26H-120z"/><path fill="#8d99a5" d="M-100 -26H110V-52H-100z"/></g>`)
        + `<path fill="#2e9ab0" opacity=".55" d="M-160 790C100 770 300 810 560 790S1000 770 1200 790S1600 810 1760 790V900H-160z"/>`
        + buoy
        + palm(120, 800, 380, 40, '#2f7a3c', '#7a5a3a', 3, 7) + palm(240, 810, 300, -30, '#3a8a44', '#7a5a3a', 6, 8) + palm(1500, 800, 340, -34, '#2f7a3c', '#7a5a3a', 8, 7)
        + birds(104, 5, 700, 330, '#fff', 1.2, 620) + finish(0.3);
    } });

  /* ---------- Portland: the Willamette, a steel bridge, roses in the rain, Mount Hood ---------- */
  add({ key: 'place:portland-or', label: 'Bridges and roses in the rain', site: 'Portland and the Willamette', colour: 'pink', mood: 'cosy', season: 'any', tags: ['bridge', 'rose', 'rain', 'mount-hood'],
    svg: () => {
      const s1 = U(), rv = U(), hd = U();
      const rose = (x, y, r, c1, c2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c1}"/><circle cx="${x}" cy="${y}" r="${R(r * 0.68)}" fill="${c2}"/><path fill="none" stroke="${c1}" stroke-width="${Math.max(2, R(r / 7))}" opacity=".7" d="M${x - R(r * 0.4)} ${y}a${R(r * 0.4)} ${R(r * 0.4)} 0 1 1 ${R(r * 0.5)} ${R(r * 0.3)}"/>`;
      let rain = ''; const rr = rnd(111);
      for (let i = 0; i < 18; i++) { const x = R(-60 + rr() * 1700), y = R(rr() * 330); rain += mv('usglide', { ad: (1.2 + rr() * 0.8).toFixed(2) + 's', d: '-' + (rr() * 2).toFixed(2) + 's', dx: '-70px', dy: '560px' }, `<path d="M${x} ${y}l-6 26" stroke="#e8f0f4" stroke-width="2.4" stroke-linecap="round" fill="none"/>`); }
      let truss = ''; for (let x = 330; x < 1290; x += 60) truss += `M${x} 520L${x + 30} 460L${x + 60} 520`;
      let roses = '';
      [[130, 800, 46], [260, 840, 56], [400, 790, 40], [530, 850, 50], [1060, 800, 44], [1190, 840, 58], [1330, 800, 42], [1470, 850, 52], [700, 870, 38], [900, 880, 44]].forEach(([x, y, r], i) => { roses += mv('ussway', { ad: (4 + (i % 4) * 0.8).toFixed(1) + 's', d: '-' + i * 0.7 + 's', to: `${x}px ${y + 60}px` }, `<path stroke="#2f5a30" stroke-width="5" fill="none" d="M${x} ${y + 60}V${y}"/><path fill="#3b6c36" d="M${x} ${y + 20}q-40-10-52-34q36 4 52 34zM${x} ${y + 30}q40-10 52-34q-36 4-52 34z"/>` + rose(x, y, r, i % 3 === 0 ? '#e55a8a' : i % 3 === 1 ? '#d63a54' : '#f08aa8', i % 3 === 0 ? '#f48ab0' : i % 3 === 1 ? '#ea6a7a' : '#f8b6c8')); });
      return `<defs>${lin(s1, [[0, '#7c93a2'], [0.5, '#b4c4c8'], [1, '#dde4de']])}${lin(rv, [[0, '#8da2ac'], [1, '#52707e']])}${linU(hd, [[0, '#fff'], [0.5, '#e6eef6'], [1, '#aebccb']], 0, 230, 0, 470)}</defs>`
        + full(`url(#${s1})`) + cloud(320, 140, 1.5, '#a9b8c0', 0.9, 64, 4, '#cdd8dc') + cloud(1150, 110, 1.6, '#a0b0b8', 0.9, 72, 20, '#c8d4d8') + streak(900, 250, 380, '#e8eeee', 0.35, 60)
        + mv('uspar', { ad: '60s', dx: '6px' }, `<path fill="url(#${hd})" opacity=".85" d="M560 470L680 330C700 296 720 270 744 236C760 224 778 224 792 238C816 270 846 300 880 340L1010 470z"/><path fill="#8a9ab0" opacity=".4" d="M792 238C816 270 846 300 880 340L1010 470H770L784 330z"/>`)
        + haze(380, 130, '#d6dede', 0.75)
        + mv('uspar', { ad: '44s', dx: '10px' }, ridge('#6c8478', 480, 40, 10, 112, 560) + firs(113, -160, 1760, 520, 50, 120, '#56706a', 560) + haze(470, 90, '#cdd8d6', 0.55))
        + `<path fill="#8a97a0" d="M0 540h1600V560H0z"/>` + bld(114, 80, 1500, 540, 40, 150, '#8a98a2', 24, 44, 6) + tower(720, 540, 44, 190, '#7d8c97', 'flat') + tower(980, 540, 50, 160, '#7d8c97', 'step') + wins(115, 60, 1500, 420, 530, 60, 4)
        + `<rect y="540" width="1600" height="360" fill="url(#${rv})"/>`
        + `<g fill="none" stroke="#5a6872" stroke-width="5" stroke-linejoin="round"><path d="M300 520H1320M300 460H1320${truss ? '' : ''}"/><path stroke-width="3" d="${truss}"/><path d="M300 520V440M1320 520V440M310 440H350M1270 440H1310"/></g><rect x="300" y="520" width="1020" height="14" fill="#47535c"/>`
        + `<rect x="300" y="430" width="40" height="110" fill="#5a6872"/><rect x="1280" y="430" width="40" height="110" fill="#5a6872"/><path stroke="#47535c" stroke-width="12" d="M440 534V900M880 534V900M1180 534V900" opacity=".6"/>`
        + dots('M310 452H1320', '#ffe9a8', 4, 30, 'us-lamps')
        + mv('usdrift', { ad: '20s', dx: '420px' }, `<g transform="translate(800 500)"><rect x="-90" y="-26" width="64" height="24" rx="6" fill="#d34a4a"/><rect x="-22" y="-26" width="64" height="24" rx="6" fill="#e0e4e8"/><rect x="46" y="-26" width="60" height="24" rx="6" fill="#d34a4a"/><path class="us-lit" fill="none" stroke-width="6" stroke-dasharray="0 14" stroke-linecap="round" d="M-80 -16H96"/></g>`)
        + `<g opacity=".35" transform="translate(0 1140) scale(1 -1)">${bld(114, 80, 1500, 540, 40, 150, '#6a7880', 24, 44, 6)}</g>`
        + shimmer(116, 26, 0, 1600, 590, 880, '#dce8ee', 56)
        + mv('usdrift', { ad: '56s', dx: '200px' }, haze(560, 70, '#d8e2e4', 0.55))
        + `<path fill="#6b7f5a" d="M-160 900V830Q300 790 800 820T1760 820V900z"/>`
        + roses + rain
        + mv('usdrift', { ad: '70s', dx: '240px' }, haze(430, 160, '#e6ecec', 0.45))
        + birds(117, 3, 900, 300, '#5a6872', 1, 520) + finish(0.3);
    } });

  /* ---------- Seattle: the Space Needle, the skyline, Rainier and a ferry in golden light ---------- */
  add({ key: 'place:seattle', label: 'Space Needle and a ferry', site: 'The Space Needle', colour: 'indigo', mood: 'proud', season: 'any', tags: ['space-needle', 'ferry', 'rainier', 'skyline'],
    svg: () => {
      const s1 = U(), sea = U(), nd = U(), mt = U(), hl = U();
      const nx = 400, gy = 800;
      const needle = `<path fill="url(#${nd})" d="M${nx - 56} ${gy}C${nx - 40} ${gy - 120} ${nx - 14} ${gy - 220} ${nx - 10} ${gy - 270}C${nx - 14} ${gy - 330} ${nx - 46} ${gy - 400} ${nx - 62} ${gy - 440}H${nx - 50}C${nx - 30} ${gy - 396} ${nx - 6} ${gy - 340} ${nx} ${gy - 300}C${nx + 6} ${gy - 340} ${nx + 30} ${gy - 396} ${nx + 50} ${gy - 440}H${nx + 62}C${nx + 46} ${gy - 400} ${nx + 14} ${gy - 330} ${nx + 10} ${gy - 270}C${nx + 14} ${gy - 220} ${nx + 40} ${gy - 120} ${nx + 56} ${gy}H${nx + 40}C${nx + 24} ${gy - 100} ${nx + 6} ${gy - 200} ${nx} ${gy - 240}C${nx - 6} ${gy - 200} ${nx - 24} ${gy - 100} ${nx - 40} ${gy}z"/>`
        + `<path fill="none" stroke="#c9d2d8" stroke-width="4" d="M${nx - 24} ${gy - 90}H${nx + 24}M${nx - 14} ${gy - 190}H${nx + 14}M${nx - 8} ${gy - 270}H${nx + 8}"/>`
        + `<path fill="#e8edf0" d="M${nx - 150} ${gy - 470}C${nx - 150} ${gy - 486} ${nx - 80} ${gy - 504} ${nx} ${gy - 504}C${nx + 80} ${gy - 504} ${nx + 150} ${gy - 486} ${nx + 150} ${gy - 470}L${nx + 96} ${gy - 436}H${nx - 96}z"/>`
        + `<path fill="#c9d3da" d="M${nx - 96} ${gy - 436}H${nx + 96}L${nx + 70} ${gy - 418}H${nx - 70}z"/><path fill="#e0653a" d="M${nx - 120} ${gy - 480}H${nx + 120}L${nx + 116} ${gy - 466}H${nx - 116}z"/>`
        + `<path fill="#7ea0b8" d="M${nx - 128} ${gy - 466}H${nx + 128}L${nx + 110} ${gy - 452}H${nx - 110}z"/><path class="us-lit" fill="none" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 12" d="M${nx - 100} ${gy - 459}H${nx + 100}"/>`
        + `<path fill="#e8edf0" d="M${nx - 60} ${gy - 504}C${nx - 40} ${gy - 530} ${nx + 40} ${gy - 530} ${nx + 60} ${gy - 504}z"/><path stroke="#dfe6ea" stroke-width="6" d="M${nx} ${gy - 522}V${gy - 590}"/>`
        + mv('usflicker', { ad: '1.4s' }, `<circle cx="${nx}" cy="${gy - 592}" r="5" fill="#ff5a4a"/>`);
      const ferry = `<path fill="#e9efe9" d="M-120 0H130L112 -22H-98z"/><path fill="#1f6a54" d="M-130 8H140L124 0H-116z"/><rect x="-82" y="-44" width="150" height="22" fill="#f4f6f2"/><rect x="-52" y="-64" width="86" height="20" fill="#fff"/><rect x="-26" y="-86" width="26" height="22" fill="#1f6a54"/><path class="us-lit" fill="none" stroke-width="6" stroke-linecap="round" stroke-dasharray="0 16" d="M-72 -34H58M-44 -54H26"/>`;
      return `<defs>${lin(s1, [[0, '#6a9fd8'], [0.5, '#bcd6ec'], [0.8, '#f8e2bc'], [1, '#ffd89a']])}${lin(sea, [[0, '#6a9cb6'], [1, '#2f5e82']])}${linU(nd, [[0, '#f4f7f8'], [1, '#c1ccd3']], nx - 60, 0, nx + 60, 0)}${lin(mt, [[0, '#fff'], [1, '#c4d2e6']])}${lin(hl, [[0, '#4a7a52'], [1, '#2d4f3b']])}</defs>`
        + full(`url(#${s1})`) + sun(1220, 500, 44, '#fff7dc', '#ffe2a0', false)
        + cloud(1000, 190, 1.2, '#e8ecf4', 0.9, 60, 6, '#fff') + cloud(380, 150, 0.9, '#ecf0f6', 0.85, 52, 22, '#fff') + streak(800, 90, 380, '#fff', 0.5, 62)
        + mv('uspar', { ad: '60s', dx: '5px' }, `<path fill="url(#${mt})" opacity=".92" d="M1000 590C1080 520 1160 420 1240 366C1280 340 1320 340 1350 366C1420 424 1500 520 1600 590z"/><path fill="#8a9ac2" opacity=".35" d="M1350 366C1420 424 1500 520 1600 590H1330L1310 480z"/>` + haze(540, 90, '#eef0f6', 0.55))
        + mv('uspar', { ad: '46s', dx: '10px' }, ridge('#7c93b0', 590, 40, 10, 121, 640) + haze(560, 90, '#f4ead8', 0.5))
        + mv('uspar', { ad: '36s', dx: '14px' },
          bld(122, 560, 1500, 650, 30, 120, '#6c7f96', 22, 44, 8) + tower(880, 650, 64, 300, '#5c6f88', 'step') + tower(780, 650, 50, 190, '#657891', 'flat') + tower(1000, 650, 56, 230, '#617590', 'spire') + tower(1120, 650, 60, 170, '#657891', 'flat') + tower(690, 650, 46, 130, '#6c7f96', 'flat') + tower(1230, 650, 44, 120, '#6c7f96', 'flat')
          + wins(123, 560, 1500, 540, 640, 50, 4))
        + `<rect y="650" width="1600" height="250" fill="url(#${sea})"/>`
        + `<g opacity=".35" transform="translate(0 1300) scale(1 -1)">${bld(122, 560, 1500, 650, 30, 120, '#4a5c72', 22, 44, 8)}</g>`
        + `<path fill="#6a88a4" opacity=".6" d="M-160 650H1760V656H-160z"/>`
        + shimmer(124, 30, -100, 1700, 665, 880, '#fff3d0', 60)
        + mv('usdrift', { ad: '60s', dx: '360px' }, `<g transform="translate(1000 700) scale(.9)">` + mv('usbob', { ad: '3.4s', dy: '2px' }, ferry) + `</g>`)
        + mv('usglide', { ad: '22s', dx: '1300px', dy: '-60px' }, `<g transform="translate(560 240)"><path fill="#f0f0e8" d="M-30 0H30L22 -10H-22z"/><path stroke="#f0f0e8" stroke-width="3" d="M-40 -14H40"/><path fill="#d23a3a" d="M-8 -10h16v-8h-16z"/></g>`)
        + `<path fill="url(#${hl})" d="M-160 900V700C-60 670 100 650 260 690C380 720 480 760 560 820L640 900z"/>`
        + `<path fill="#3a6a48" d="M200 900V800C300 780 420 790 520 840L580 900z" opacity=".6"/>` + firs(125, -160, 300, 770, 80, 190, '#244a36') + `<path fill="#244a36" d="M-160 770H190L420 900H-160z"/>`
        + `<path fill="#3a5a40" d="M560 860C700 820 840 850 960 860S1300 830 1500 860L1760 850V900H560z"/>`
        + `<path fill="#d8d2c0" d="M${nx - 90} ${gy}H${nx + 90}L${nx + 150} 900H${nx - 150}z" opacity="0"/>`
        + needle
        + `<path fill="#355a44" d="M260 900C300 850 360 820 400 812C450 818 520 850 560 900z"/>`
        + firs(126, 1380, 1760, 900, 150, 300, '#1f4231')
        + birds(127, 5, 900, 350, '#5a6a80', 1.2, 600) + finish(0.32);
    } });

  /* ---------- Anchorage: aurora over the Chugach, a moose in the snow ---------- */
  add({ key: 'place:anchorage', label: 'Aurora and a moose', site: 'Anchorage and the northern lights', colour: 'green', mood: 'dreamy', season: 'any', tags: ['aurora', 'moose', 'snow', 'night'],
    svg: () => {
      const s1 = U(), au1 = U(), au2 = U(), sn = U(), ice = U();
      const sst = (seed, n, y1, op) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) o += `<circle cx="${R(r() * 1600)}" cy="${R(r() * y1)}" r="${(0.9 + r() * 1.5).toFixed(1)}"/>`; return `<g fill="#fff" opacity="${op}">${o}</g>`; };
      const curtain = (id, base, amp, x0, x1, hgt, ph) => {
        let d = `M${x0} ${base}`; const n = 10, w = (x1 - x0) / n;
        for (let i = 1; i <= n; i++) d += `Q${R(x0 + w * i - w / 2)} ${R(base - amp * Math.sin(i * 1.3 + ph))} ${R(x0 + w * i)} ${R(base - amp * 0.4 * Math.sin(i * 0.9 + ph))}`;
        for (let i = n; i >= 1; i--) d += `L${R(x0 + w * i)} ${R(base - hgt - amp * 0.6 * Math.sin(i * 0.8 + ph))}`;
        let rays = ''; const r = rnd(7 + R(ph * 9));
        for (let x = x0; x < x1; x += 26) { const k = (x - x0) / w, y = base - amp * 0.4 * Math.sin(k * 0.9 + ph), h = hgt * (0.5 + r() * 0.6); rays += `M${R(x)} ${R(y)}V${R(y - h)}`; }
        return `<path fill="url(#${id})" d="${d}z"/><path fill="none" stroke="#b8ffe0" stroke-width="5" opacity=".14" d="${rays}"/>`;
      };
      const moose = `<g transform="translate(1160 800)"><ellipse cx="20" cy="4" rx="150" ry="9" fill="#0a1630" opacity=".5"/>` + mv('usbob', { ad: '4s', dy: '1.5px' },
        `<path stroke="#241a1c" stroke-width="13" stroke-linecap="round" d="M66 -120L62 -6M92 -118L100 -6M-84 -120L-92 -6M-58 -120L-48 -6"/><path fill="#241a1c" d="M-110 -150C-100 -192 -40 -200 20 -214C60 -224 92 -206 102 -182L112 -140C92 -108 40 -104 -20 -106C-60 -106 -100 -108 -110 -150z"/>`
        + `<path fill="#241a1c" d="M86 -196C106 -232 122 -252 150 -252C172 -254 190 -240 202 -226L238 -206C246 -198 240 -186 228 -184L198 -188C178 -176 150 -176 136 -190C122 -168 106 -150 98 -134z"/><path fill="#241a1c" d="M130 -176C128 -150 134 -134 144 -128C142 -146 146 -160 152 -176z"/>`
        + `<path fill="#241a1c" d="M168 -250C150 -276 120 -282 98 -276L112 -290L100 -300L124 -298L122 -314L142 -300L148 -320L158 -296C180 -300 198 -280 194 -252z"/><path fill="#33262a" d="M178 -252C190 -280 214 -290 240 -284L232 -272L246 -266L230 -260L240 -248C222 -250 200 -246 190 -240z"/><circle cx="196" cy="-222" r="3" fill="#9ab"/>`) + puffs(236, -198, 5, '#bcd2e4', 10, 40, 3.4, -50, 2.6) + `</g>`;
      return `<defs>${lin(s1, [[0, '#02061a'], [0.5, '#0a2038'], [1, '#17455a']])}${lin(au1, [[0, '#6a4adf', 0], [0.35, '#3fe0a0', 0.55], [0.75, '#7affc0', 0.85], [1, '#9dffd0', 0]])}${lin(au2, [[0, '#b44ae0', 0], [0.4, '#40d8c0', 0.5], [0.8, '#a6ffd8', 0.7], [1, '#a6ffd8', 0]])}${lin(sn, [[0, '#cfe4f4'], [1, '#6f94b6']])}${lin(ice, [[0, '#7fa8c4'], [1, '#2f5a7a']])}</defs>`
        + full(`url(#${s1})`) + mv('usglow', { ad: '5s' }, sst(131, 60, 440, 0.9)) + mv('usglow', { ad: '6.4s', d: '-2s' }, sst(132, 50, 400, 0.75)) + stars(133, 50, 420)
        + mv('ussway', { ad: '9s', to: '800px 520px' }, mv('usdrift', { ad: '18s', dx: '90px' }, curtain(au1, 440, 120, -200, 1800, 260, 0)))
        + mv('ussway', { ad: '12s', d: '-4s', to: '600px 520px' }, mv('usdrift', { ad: '26s', d: '-8s', dx: '120px' }, `<g opacity=".8">${curtain(au2, 480, 90, -200, 1800, 200, 2)}</g>`))
        + mv('usglow', { ad: '7s', d: '-2s' }, `<ellipse cx="520" cy="420" rx="400" ry="60" fill="#5affb0" opacity=".16"/>`)
        + cloud(1250, 190, 1, '#2b4a62', 0.35, 80, 8, '#4a6e86')
        + mv('uspar', { ad: '54s', dx: '8px' }, `<path fill="#5b7ea6" d="M-160 600C-80 540 40 470 150 430L230 380L300 430C380 380 440 330 520 300C560 290 590 320 630 360C700 400 760 380 860 340L940 300C1000 330 1060 380 1160 420C1260 380 1400 430 1560 470L1760 560V680H-160z"/><path fill="#d8eaf8" opacity=".85" d="M150 430L230 380L300 430L260 436L230 410L196 440zM520 300C560 290 590 320 630 360L590 352L560 322L530 346zM860 340L940 300L1010 350L960 346L936 326L900 350z"/><path fill="#44668e" opacity=".6" d="M-160 600C-80 540 40 470 150 430L130 600zM1160 420C1260 380 1400 430 1560 470L1760 560V600H1300z"/>`)
        + `<rect y="600" width="1600" height="300" fill="url(#${ice})"/>`
        + `<g opacity=".35" transform="translate(0 1200) scale(1 -1)"><path fill="#7affc0" d="M-200 560H1800V600H-200z"/></g>`
        + `<path fill="#e6f0f8" opacity=".6" d="M-160 600H1760V612H-160z"/>`
        + bld(134, 420, 900, 628, 12, 56, '#3d5a76', 12, 26, 4) + bld(135, 1000, 1300, 628, 10, 40, '#3d5a76', 10, 22, 4) + wins(136, 420, 1300, 580, 626, 40, 4) + dots('M420 614H1300', '#ffd27a', 3, 18, 'us-lit')
        + shimmer(137, 18, 0, 1600, 640, 800, '#9dffd0', 50) + mv('usdrift', { ad: '60s', dx: '200px' }, haze(610, 60, '#bcd6e8', 0.35))
        + `<path fill="url(#${sn})" d="M-160 900V760C100 720 400 740 700 770S1200 730 1500 750L1760 760V900z"/><path fill="#fff" opacity=".5" d="M-160 790C200 770 500 800 800 790S1300 770 1760 790V805C1300 790 1000 815 700 805S200 790 -160 805z"/>`
        + mv('ussway', { ad: '9s', to: '100px 900px' }, firs(138, -160, 420, 800, 220, 440, '#06142a') + `<path fill="#06142a" d="M-160 790H300L420 900H-160z"/>`) + mv('ussway', { ad: '10s', d: '-3s', to: '1500px 900px' }, firs(139, 1400, 1760, 810, 200, 400, '#06142a') + `<path fill="#06142a" d="M1400 810H1760V900H1330z"/>`) + firs(140, 460, 560, 770, 100, 200, '#0a1d34')
        + moose
        + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<circle class="x-usfall" style="--ad:${(8 + i * 1.1).toFixed(1)}s;--d:-${(i * 1.6).toFixed(1)}s;--dx:${(i % 2 ? 1 : -1) * 30}px" cx="${180 + i * 190}" cy="${40 + (i * 61) % 120}" r="3" fill="#e8f4ff"/>`).join('')
        + finish(0.3);
    } });

  /* ---------- Honolulu: Diamond Head, Waikiki and a surfer ---------- */
  add({ key: 'place:honolulu', label: 'Diamond Head and a surfer', site: 'Diamond Head and Waikiki', colour: 'blue', mood: 'cheerful', season: 'any', tags: ['diamond-head', 'surf', 'beach', 'waikiki'],
    svg: () => {
      const s1 = U(), sea = U(), dh = U(), wv = U(), bch = U();
      const wave = 'M-160 790C100 770 260 760 420 740C560 722 640 690 700 640C740 590 810 588 826 630C834 670 800 700 760 704C860 712 1000 740 1180 760C1380 780 1560 790 1760 790V900H-160z';
      const surfer = `<g transform="translate(700 690) scale(1.5)">` + mv('usbob', { ad: '2.2s', dy: '3px' }, `<path fill="#f4e8c8" d="M-80 10C-30 0 40 -2 92 -16C60 8 -20 20 -80 10z"/><path fill="none" stroke="#a9714c" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" d="M-8 4L-22 -26L2 -44M22 0L32 -30L2 -44"/><path fill="none" stroke="#2f6ad0" stroke-width="19" stroke-linecap="round" d="M2 -46L-4 -58"/><path fill="none" stroke="#a9714c" stroke-width="15" stroke-linecap="round" d="M-4 -60L-16 -92"/><path fill="none" stroke="#a9714c" stroke-width="7" stroke-linecap="round" d="M-16 -88L-54 -76M-16 -88L28 -80"/><circle cx="-20" cy="-106" r="11" fill="#a9714c"/><path fill="#3a2a22" d="M-31 -108C-30 -120 -12 -120 -9 -108z"/>`) + `</g>`;
      return `<defs>${lin(s1, [[0, '#2f86e6'], [0.55, '#7cc6f4'], [1, '#d8f0f6']])}${lin(sea, [[0, '#3fcbd0'], [0.45, '#1ea3c4'], [1, '#0f6a9c']])}${linU(dh, [[0, '#8a8a4a'], [0.4, '#6f8a46'], [1, '#4a6a3c']], 0, 300, 0, 640)}${lin(wv, [[0, '#7ae8e0'], [1, '#2aa6c8']])}${lin(bch, [[0, '#f6e6b8'], [1, '#e2c98e']])}</defs>`
        + full(`url(#${s1})`) + sun(1330, 170, 42, '#fffbe0', '#fff0a8', false)
        + cloud(300, 150, 1.1, '#dcecf6', 0.95, 60, 4) + cloud(1020, 110, 1.3, '#e0eef8', 0.95, 70, 30) + cloud(1450, 280, 0.8, '#e4f0f8', 0.9, 52, 12) + streak(700, 260, 300, '#fff', 0.5, 70)
        + mv('uspar', { ad: '50s', dx: '8px' }, `<path fill="url(#${dh})" d="M-160 640C-80 600 60 520 200 450C300 400 340 372 400 340C440 320 480 318 520 336C560 356 600 400 700 470C800 520 900 560 1020 610L1060 640z"/><path fill="#4a5e34" opacity=".55" d="M400 340C440 320 480 318 520 336C560 356 600 400 700 470C640 440 560 400 520 380L470 360z"/><path fill="none" stroke="#3f5a30" stroke-width="3" opacity=".5" d="M240 520C260 480 300 440 340 400M560 400C600 440 660 480 720 520M420 360C400 430 380 500 360 580"/>` + haze(600, 50, '#cfe8e8', 0.3))
        + mv('uspar', { ad: '40s', dx: '12px' }, bld(151, 560, 1500, 662, 40, 150, '#e8e0d0', 28, 46, 6) + tower(900, 662, 56, 220, '#f0e8d8', 'flat') + tower(1060, 662, 50, 180, '#e6dcc8', 'flat') + wins(152, 560, 1500, 540, 660, 40, 4) + `<path fill="#3f8a4a" d="M-160 662V640C200 630 600 640 1000 636S1500 640 1760 650V662z"/>` + canopy('#2d7a3c', 650, 22, 153, -160, 1760, 664))
        + `<path fill="url(#${bch})" d="M-160 662H1760V700C1300 690 800 680 -160 690z"/>`
        + `<rect y="680" width="1600" height="220" fill="url(#${sea})"/>`
        + `<path fill="url(#${wv})" d="${wave}"/>`
        + `<path fill="#fff" opacity=".85" d="M690 650C730 624 790 620 816 650C824 668 810 686 786 692C800 676 790 654 762 650C736 646 716 658 700 676z"/>`
        + mv('usdrift', { ad: '6s', dx: '30px' }, `<path fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8" d="M-100 760C100 750 240 750 400 736M900 730C1000 740 1100 750 1250 758M1300 776C1400 784 1500 786 1700 788"/>`)
        + shimmer(154, 30, -100, 1700, 700, 890, '#fff', 64) + shimmer(155, 20, -100, 1700, 760, 890, '#bff4f4', 70)
        + mv('usdrift', { ad: '64s', dx: '260px' }, `<g transform="translate(1150 726) scale(.9)">` + mv('usbob', { ad: '3s', dy: '3px' }, `<path fill="#c9442c" d="M-90 0C-50 12 50 12 90 0L100 -8C60 -2 -60 -2 -100 -8z"/><path fill="none" stroke="#6a4a38" stroke-width="4" d="M-40 6L-60 22H60L40 6M-60 22V30M60 22V30"/><path fill="#fff" d="M-6 -6V-70L40 -8z"/>`) + `</g>`)
        + surfer
        + `<path fill="url(#${wv})" opacity=".92" d="M-160 830C100 810 300 820 520 806C760 792 900 812 1100 820S1500 810 1760 820V900H-160z"/>`
        + palm(160, 880, 560, 80, '#2f8a44', '#7a5a3a', 3, 7) + palm(290, 900, 420, -40, '#3a9a50', '#7a5a3a', 7, 8) + palm(1470, 890, 520, -70, '#2f8a44', '#7a5a3a', 9, 7) + palm(1360, 900, 380, 30, '#3a9a50', '#7a5a3a', 12, 9)
        + birds(156, 5, 900, 300, '#fff', 1.3, 600) + finish(0.28);
    } });
})();
