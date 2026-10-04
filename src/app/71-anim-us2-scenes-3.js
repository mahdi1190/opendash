/* ============================================================
   US FULL-SCREEN SCENES, batch 3 (Southeast): KY LA MS NC SC TN VA WV, Virginia Beach, Charlotte, Atlanta.
   Same toolkit as the Texas scenes (usSceneKit in 71-anim-us.js). Painted in daylight colours; the dark theme /
   tod-dusk / tod-night grade lights windows (.us-lit, .us-lamps) and stars (.us-star). Motion is transform and opacity.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish, star5 } = K;

  /** Short blades of grass / reeds: strokes with a little lean. */
  const blades = (seed, n, x0, x1, y0, y1, col, w, hMin, hMax) => {
    const r = rnd(seed); let d = '';
    for (let i = 0; i < n; i++) { const x = R(x0 + r() * (x1 - x0)), y = R(y0 + r() * (y1 - y0)), h = R((hMin || 24) + r() * ((hMax || 52) - (hMin || 24))); d += `M${x} ${y}q${R(r() * 10 - 5)} ${-R(h / 2)} ${R(r() * 14 - 7)} ${-h}`; }
    return `<path fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" d="${d}"/>`;
  };
  /** Rows of window lights on a facade: pale daytime panes plus two staggered rows of lights that come on at dusk. */
  const win = (x, top, w, base, pitch, day, litc, seed) => {
    let a = '', b = '', k = 0;
    for (let y = top + 14; y < base - 10; y += pitch, k++) { if (k % 2) b += `M${x + 7} ${y}h${w - 14}`; else a += `M${x + 7} ${y}h${w - 14}`; }
    const pa = ['8 10 8 10 8 28', '8 28 8 10 8 10', '8 10 8 36 8 10', '8 10 8 10 8 10 8 46'], s = seed % 4;
    return `<path fill="none" stroke="${day}" stroke-width="9" stroke-dasharray="8 10" opacity=".45" d="${a}${b}"/>`
      + `<path class="us-lamps" fill="none" stroke="${litc}" stroke-width="9" stroke-dasharray="${pa[s]}" d="${a}"/><path class="us-lamps" fill="none" stroke="${litc}" stroke-width="9" stroke-dasharray="${pa[(s + 2) % 4]}" d="${b}"/>`;
  };
  const tower = (x, top, w, base, fill, seed, day, litc, pitch) => `<rect x="${x}" y="${top}" width="${w}" height="${base - top}" fill="${fill}"/>` + win(x, top, w, base, pitch || 22, day || '#cfe3f2', litc || '#ffd27a', seed);
  /** Fireflies: each one glows and drifts on its own timing. */
  const flies = (seed, n, x0, x1, y0, y1, col) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) { const x = R(x0 + r() * (x1 - x0)), y = R(y0 + r() * (y1 - y0));
      o += `<g class="x-usbob" style="--ad:${(3 + r() * 3).toFixed(1)}s;--d:-${(r() * 4).toFixed(1)}s;--dy:${R(6 + r() * 14)}px"><circle class="x-usglow" style="--ad:${(1.6 + r() * 2).toFixed(1)}s;--d:-${(r() * 3).toFixed(1)}s;transform-box:fill-box;transform-origin:center" cx="${x}" cy="${y}" r="${(2.4 + r() * 2).toFixed(1)}" fill="${col}"/></g>`; }
    return o;
  };
  /** Falling leaves. */
  const leaves = (seed, n, x0, x1, cols) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) { const x = R(x0 + r() * (x1 - x0)), y = R(r() * 300);
      o += `<g class="x-usfall" style="--ad:${R(9 + r() * 7)}s;--d:-${R(r() * 12)}s;--dx:${R(-120 + r() * 240)}px"><path fill="${cols[i % cols.length]}" d="M${x} ${y}q9 -10 18 0q-9 12 -18 0z"/></g>`; }
    return o;
  };
  /** A fan palm (palmetto): curved trunk, a head of drooping fronds. (x, y) is the foot. */
  const palm = (x, y, h, lean, trunk, f1, f2, seed) => {
    const r = rnd(seed), hx = x + lean, hy = y - h; let fr = '';
    for (let i = 0; i < 13; i++) {
      const a = (-168 + i * 28) * Math.PI / 180, L = (92 + r() * 40) * (h / 380 + 0.5), ex = hx + Math.cos(a) * L, ey = hy + Math.sin(a) * L * 0.6 + L * 0.34 * Math.abs(Math.cos(a)),
        cx = hx + Math.cos(a) * L * 0.55, cy = hy + Math.sin(a) * L * 0.85 - 10;
      fr += `<path fill="${i % 2 ? f1 : f2}" d="M${R(hx)} ${R(hy)}Q${R(cx)} ${R(cy - 24)} ${R(ex)} ${R(ey)}Q${R(cx + 10)} ${R(cy + 26)} ${R(hx)} ${R(hy + 8)}z"/>`;
    }
    return `<path fill="${trunk}" d="M${x - 16} ${y}C${x - 8} ${y - h * 0.4} ${hx - 14} ${y - h * 0.7} ${hx - 9} ${hy}L${hx + 9} ${hy}C${hx + 8} ${y - h * 0.7} ${x + 10} ${y - h * 0.4} ${x + 16} ${y}z"/>`
      + mv('ussway2', { ad: (5 + seed % 3) + 's', to: `${x}px ${y}px` }, fr + `<circle cx="${R(hx)}" cy="${R(hy + 4)}" r="11" fill="${trunk}"/>`);
  };
  const pine = (x, y, h, col) => { let d = ''; const t = 5, w = h * 0.3; for (let k = 0; k < t; k++) { const yy = y - h * (k / t) * 0.86, ww = w * (1 - k / (t + 0.6)); d += `M${R(x - ww)} ${R(yy)}L${R(x)} ${R(yy - h * 0.34)}L${R(x + ww)} ${R(yy)}z`; } return `<path fill="${col}" d="${d}"/>`; };
  const pines = (seed, n, x0, x1, y, h, col) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) o += pine(R(x0 + r() * (x1 - x0)), y + R(r() * 14), h * (0.7 + r() * 0.6), col); return o; };
  /** A spreading deciduous crown of overlapping blobs (autumn trees). */
  const crown = (x, y, s, cols, seed) => {
    const r = rnd(seed); let o = `<path fill="#4a3428" d="M${R(x - 14 * s)} ${y}C${R(x - 6 * s)} ${R(y - 80 * s)} ${R(x - 4 * s)} ${R(y - 120 * s)} ${R(x - 40 * s)} ${R(y - 190 * s)}L${R(x - 30 * s)} ${R(y - 192 * s)}C${R(x)} ${R(y - 140 * s)} ${R(x + 6 * s)} ${R(y - 100 * s)} ${R(x + 16 * s)} ${y}z"/>`;
    let b = '';
    for (let i = 0; i < 26; i++) b += `<circle cx="${R(x - 130 * s + r() * 260 * s)}" cy="${R(y - 230 * s + (r() - 0.3) * 120 * s)}" r="${R((24 + r() * 36) * s)}" fill="${cols[i % cols.length]}"/>`;
    return o + mv('ussway2', { ad: (6 + seed % 4) + 's', to: `${x}px ${y}px` }, b);
  };
  const horse = (x, y, s, body, dark, graze) => {
    const neck = graze ? 'M146 -126C170 -120 198 -92 212 -58L232 -66C222 -104 200 -140 168 -152z' : 'M146 -128C164 -150 176 -180 188 -210L212 -204C210 -172 204 -142 184 -112z';
    const head = graze ? '<ellipse cx="231" cy="-40" rx="27" ry="12" transform="rotate(70 231 -40)"/>' : '<ellipse cx="224" cy="-206" rx="27" ry="12" transform="rotate(28 224 -206)"/>';
    const mane = graze ? 'M150 -152C178 -146 206 -112 222 -70' : 'M152 -150C168 -176 182 -202 196 -218';
    return mv('ussway2', { ad: '5s', to: `${x}px ${y}px` }, `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="110" cy="2" rx="104" ry="9" fill="#1c2a14" opacity=".25"/>`
      + `<path fill="none" stroke="${dark}" stroke-width="11" stroke-linecap="round" d="M126 -88L122 -46L126 0M84 -90L88 -46L84 0"/>`
      + `<path fill="none" stroke="${body}" stroke-width="12" stroke-linecap="round" d="M146 -88L150 -46L146 0M64 -90L58 -44L64 0"/><path fill="none" stroke="${dark}" stroke-width="12" stroke-linecap="round" d="M146 -7V0M126 -7V0M84 -7V0M64 -7V0"/>`
      + `<path fill="none" stroke="${dark}" stroke-width="9" stroke-linecap="round" d="M48 -130C14 -118 10 -78 22 -34"/>`
      + `<g fill="${body}"><path d="M44 -112C40 -142 80 -150 120 -146C150 -144 166 -138 170 -118C172 -98 160 -84 150 -82H62C48 -86 44 -98 44 -112z"/><path d="${neck}"/>${head}</g>`
      + `<path fill="none" stroke="${dark}" stroke-width="9" stroke-linecap="round" d="${mane}"/></g>`);
  };

  /* ---------- KENTUCKY: a bluegrass horse farm at sunrise ---------- */
  usSceneAdd({ key: 'state:KY', label: 'Bluegrass horse farm at sunrise', site: 'A Bluegrass horse farm at sunrise', colour: 'green', mood: 'calm', season: ['spring'], tags: ['horses', 'bluegrass', 'farm', 'sunrise'],
    svg: () => { const s1 = U(), g1 = U(), g2 = U(), l1 = U();
      const fence = (yA, yB, hgt, w, gap, col) => { let p = ''; const n = Math.ceil(1920 / gap); for (let i = 0; i <= n; i++) { const x = -160 + i * gap, y = yA + (yB - yA) * (i / n); p += `M${x} ${R(y)}v${-hgt}`; }
        return `<g fill="none" stroke="${col}" stroke-linecap="round"><path stroke-width="${R(w * 0.55)}" d="M-160 ${yA - R(hgt * 0.9)}L1760 ${yB - R(hgt * 0.9)}M-160 ${yA - R(hgt * 0.55)}L1760 ${yB - R(hgt * 0.55)}M-160 ${yA - R(hgt * 0.2)}L1760 ${yB - R(hgt * 0.2)}"/><path stroke-width="${w}" d="${p}"/></g>`; };
      return `<defs>${lin(s1, [[0, '#7da0d2'], [0.38, '#e6b6bc'], [0.68, '#ffd39a'], [1, '#ffeab8']])}${linU(g1, [[0, '#a9c767'], [1, '#4f8340']], 0, 600, 0, 900)}${linU(g2, [[0, '#b4cc78'], [1, '#6a9a4a']], 0, 560, 0, 720)}${radU(l1, [[0, '#fff0c0', 0.5], [1, '#fff0c0', 0]], 860, 480, 780)}</defs>`
        + full(`url(#${s1})`) + rays(860, 480, 900, '#fff4d0', 0.2) + sun(860, 480, 42, '#fff6d6', '#ffd68a', true)
        + streak(300, 130, 300, '#fff', 0.5) + streak(1250, 200, 240, '#ffe0d8', 0.5, 70) + cloud(330, 240, 1.1, '#e7b4b6', 0.9, 56, 4, '#fff2e4') + cloud(1370, 300, 1.0, '#eab8b0', 0.85, 64, 24, '#fff4e6') + cloud(760, 170, 0.7, '#f0c0b8', 0.8, 48, 12, '#fff')
        + birds(5, 5, 780, 340, '#3a3a52', 1.1, 560)
        + mv('uspar', { ad: '34s', dx: '8px' }, ridge('#a4b4cc', 530, 36, 9, 41) + haze(470, 110, '#ffe6c0', 0.6) + ridge('#86a98c', 575, 30, 10, 42))
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + mv('uspar', { ad: '34s', dx: '14px' }, ridge(`url(#${g2})`, 628, 34, 8, 43) + canopy('#3c6a3c', 612, 26, 44, 560, 1010, 660) + canopy('#456f3e', 614, 22, 45, 1330, 1760, 660))
        /* the barn on the rise */
        + `<g><path fill="#4d5a52" d="M996 556L1120 482L1244 556z"/><path fill="#2f4f45" d="M996 556L1120 482L1244 556L1232 556L1120 492L1008 556z"/><rect x="1008" y="552" width="224" height="72" fill="#f5eee0"/><rect x="1008" y="552" width="224" height="8" fill="#e4d8c2"/>`
        + `<path fill="#f5eee0" d="M960 590L1008 556V624H960z"/><path fill="#2f4f45" d="M948 592L1008 552V560L960 598z"/><path fill="#f5eee0" d="M1232 556L1280 590V624H1232z"/><path fill="#2f4f45" d="M1232 552L1292 592L1280 598L1232 560z"/>`
        + `<rect x="1090" y="580" width="60" height="44" fill="#2f4f45"/><path fill="none" stroke="#f5eee0" stroke-width="4" d="M1090 580L1150 624M1150 580L1090 624M1120 580V624"/>`
        + `<rect x="1040" y="578" width="26" height="22" fill="#2f4f45"/>${lit(1042, 580, 22, 18)}<rect x="1174" y="578" width="26" height="22" fill="#2f4f45"/>${lit(1176, 580, 22, 18)}`
        + `<rect x="1100" y="452" width="40" height="34" fill="#f5eee0"/><path fill="#2f4f45" d="M1094 454L1120 432L1146 454z"/><rect x="1112" y="460" width="16" height="16" fill="#2f4f45"/>`
        + mv('ussway2', { ad: '3s', to: '1120px 430px' }, `<path fill="#2a2a2e" d="M1119 410h2v22h-2zM1108 416h24l-4 4h-16z"/>`) + `</g>`
        + fence(642, 650, 40, 5, 70, '#fffaf0')
        + haze(600, 110, '#fff1d0', 0.4)
        + ridge(`url(#${g1})`, 712, 32, 7, 46)
        + shimmer(9, 26, 0, 1600, 650, 790, '#fffbe0', 16)
        + horse(880, 700, 0.5, '#8a5a3a', '#2a1c16', false) + horse(1000, 720, 0.42, '#c9c4bc', '#7a7670', true)
        + horse(290, 810, 1.1, '#6e4630', '#1e1410', true) + horse(560, 830, 0.66, '#a86a3a', '#2e1c12', false)
        + mv('ussway', { ad: '5s', to: '800px 900px' }, blades(7, 120, -100, 1700, 770, 900, '#4d8a3a', 5, 22, 46) + blades(8, 60, -100, 1700, 800, 900, '#7fb050', 4, 18, 36))
        + `<g fill="#ffd84a">${(() => { const r = rnd(77); return Array.from({ length: 44 }, () => `<circle cx="${R(r() * 1600)}" cy="${R(760 + r() * 130)}" r="${(2.4 + r() * 2).toFixed(1)}"/>`).join(''); })()}</g>`
        + fence(878, 896, 128, 14, 190, '#f8f2e4')
        + finish(0.32); } });

  /* ---------- LOUISIANA: a bayou at dusk ---------- */
  usSceneAdd({ key: 'state:LA', label: 'Cypress bayou at dusk', site: 'The bayou at dusk', colour: 'teal', mood: 'dreamy', tags: ['bayou', 'cypress', 'fireflies', 'spanish moss'],
    svg: () => { const s1 = U(), w1 = U(), l1 = U();
      const moss = (seed, n, x0, x1, y, len, col, w) => { const r = rnd(seed); let d = ''; for (let i = 0; i < n; i++) { const x = R(x0 + r() * (x1 - x0)), L = R(len * (0.4 + r() * 0.8)); d += `M${x} ${R(y + r() * 40)}q${R(r() * 12 - 6)} ${R(L / 2)} ${R(r() * 16 - 8)} ${L}`; }
        return `<path fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" d="${d}"/>`; };
      const cypress = (x, y, s, seed) => { const r = rnd(seed); let kn = '', cr = '';
        for (let i = 0; i < 4; i++) { const kx = R(x + (-120 + r() * 240) * s); kn += `<path d="M${kx - 7} ${y + 12}q4 ${-R(26 + r() * 30)} 9 ${-R(30 + r() * 20)}q4 ${R(24)} 8 ${R(30)}z"/>`; }
        for (let i = 0; i < 12; i++) cr += `<ellipse cx="${R(x + (-150 + r() * 300) * s)}" cy="${R(y - (470 + r() * 90) * s)}" rx="${R((70 + r() * 70) * s)}" ry="${R((22 + r() * 18) * s)}"/>`;
        return `<g fill="#1b2f33"><path d="M${R(x - 78 * s)} ${y + 10}C${R(x - 34 * s)} ${R(y - 30 * s)} ${R(x - 26 * s)} ${R(y - 220 * s)} ${R(x - 16 * s)} ${R(y - 470 * s)}L${R(x + 18 * s)} ${R(y - 470 * s)}C${R(x + 26 * s)} ${R(y - 220 * s)} ${R(x + 36 * s)} ${R(y - 30 * s)} ${R(x + 84 * s)} ${y + 10}z"/>${kn}`
          + `<path d="M${R(x)} ${R(y - 400 * s)}L${R(x - 150 * s)} ${R(y - 470 * s)}L${R(x - 140 * s)} ${R(y - 480 * s)}L${R(x + 6 * s)} ${R(y - 420 * s)}L${R(x + 150 * s)} ${R(y - 480 * s)}L${R(x + 160 * s)} ${R(y - 470 * s)}z"/>${cr}</g>`
          + mv('ussway', { ad: (5 + seed % 3) + 's', to: `${x}px ${R(y - 470 * s)}px` }, moss(seed + 3, R(6 + 9 * s), x - 170 * s, x + 170 * s, y - 470 * s, 190 * s, '#8e9c86', 4) + moss(seed + 4, R(3 + 5 * s), x - 150 * s, x + 150 * s, y - 470 * s, 130 * s, '#a9b49c', 3)); };
      return `<defs>${lin(s1, [[0, '#2c2860'], [0.3, '#7a468c'], [0.52, '#e0746c'], [0.72, '#ffb470'], [1, '#ffd89a']])}${lin(w1, [[0, '#f09a70'], [0.12, '#7a5a86'], [0.55, '#2a3050'], [1, '#161c2c']])}${radU(l1, [[0, '#ffc47a', 0.6], [1, '#ffc47a', 0]], 800, 540, 760)}</defs>`
        + full(`url(#${s1})`) + stars(31, 40, 220) + rays(800, 540, 1000, '#ffd9a0', 0.2) + sun(800, 536, 54, '#fff0c0', '#ffa860')
        + streak(260, 150, 300, '#ff9c98', 0.5) + streak(1280, 230, 260, '#ffb08a', 0.5, 70) + cloud(520, 330, 1.0, '#a8587a', 0.8, 62, 8, '#ffbc9a') + cloud(1180, 380, 0.9, '#b05e7c', 0.75, 56, 30, '#ffc4a0')
        + birds(8, 4, 1000, 300, '#2a1c34', 1.1, 640)
        + mv('uspar', { ad: '38s', dx: '8px' }, canopy('#4a3a6a', 548, 34, 12) + haze(500, 90, '#ffbc90', 0.45) + canopy('#35305a', 556, 24, 13, -160, 1760, 560))
        + `<rect y="552" width="1600" height="348" fill="url(#${w1})"/><rect width="1600" height="900" fill="url(#${l1})"/>`
        + shimmer(5, 34, 600, 1000, 560, 720, '#ffe2a8', 60) + shimmer(6, 18, 0, 1600, 640, 880, '#9a86c0', 56)
        + `<path fill="#2a2440" opacity=".55" d="M-160 600C200 586 600 606 1000 594S1500 600 1760 592V620H-160z"/>`
        /* a stilt shack and its dock */
        + `<g><path fill="#3a2c34" d="M1000 640h8v60h-8zM1060 640h8v60h-8zM1130 640h8v60h-8zM1190 640h8v60h-8z"/><rect x="990" y="590" width="220" height="56" fill="#6a4a3c"/><path fill="#58606a" d="M976 592L1100 540L1224 592z"/><rect x="1020" y="606" width="36" height="32" fill="#2a1e24"/>${lit(1022, 608, 32, 28)}<rect x="1128" y="606" width="36" height="32" fill="#2a1e24"/>${lit(1130, 608, 32, 28)}`
        + `<path fill="#4a3630" d="M960 646H1240V656H960z"/><path fill="none" stroke="#4a3630" stroke-width="5" d="M960 646V622M1240 646V622M960 630H1000M1200 630H1240"/><path fill="#4a3630" d="M820 656H980V666H820z"/><path fill="#3a2c34" d="M840 666h6v34h-6zM900 666h6v34h-6z"/>`
        + `<path class="us-lamps" fill="none" stroke="#ffd27a" stroke-width="7" stroke-linecap="round" stroke-dasharray="0 18" d="M960 626Q1100 660 1240 626"/>${lit(1236, 626, 6, 10)}</g>`
        + cypress(210, 820, 1.35, 5) + cypress(1440, 800, 1.2, 9) + cypress(620, 650, 0.55, 14) + cypress(1330, 640, 0.5, 17)
        + mv('usbob', { ad: '5s', dy: '4px' }, `<g><path fill="#2a2024" d="M520 760Q640 790 780 756L760 772Q640 796 540 774z"/><circle class="us-lit" cx="740" cy="748" r="7"/><path fill="#2a2024" d="M690 750V722q8-8 16 0V750z"/><circle cx="698" cy="716" r="8" fill="#2a2024"/><path stroke="#2a2024" stroke-width="3" d="M670 770L790 700" fill="none"/></g>`)
        + `<g fill="#ffd27a"><circle class="x-usglow" style="--ad:3s;transform-box:fill-box;transform-origin:center" cx="934" cy="728" r="3"/><circle class="x-usglow" style="--ad:3s;--d:-.4s;transform-box:fill-box;transform-origin:center" cx="944" cy="728" r="3"/></g>`
        + flies(21, 16, 60, 1500, 420, 800, '#e8ff9a')
        + mv('ussway', { ad: '6s', to: '800px 900px' }, blades(3, 30, -100, 1700, 840, 930, '#0f1c20', 7, 60, 150) + `<g fill="#3a2418">${Array.from({ length: 8 }, (_, i) => `<rect x="${R(40 + i * 210)}" y="${R(790 - (i % 3) * 20)}" width="8" height="${R(120 + (i % 3) * 20)}"/>`).join('')}</g><g fill="#5a3426">${Array.from({ length: 8 }, (_, i) => `<ellipse cx="${R(44 + i * 210)}" cy="${R(792 - (i % 3) * 20)}" rx="10" ry="22"/>`).join('')}</g>`)
        + `<g fill="#2a4a3a" opacity=".85">${Array.from({ length: 9 }, (_, i) => `<ellipse cx="${R(120 + i * 170)}" cy="${R(860 + (i % 3) * 14)}" rx="${R(30 + (i % 4) * 8)}" ry="8"/>`).join('')}</g>`
        + finish(0.38); } });

  /* ---------- MISSISSIPPI: Delta cotton at sunset ---------- */
  usSceneAdd({ key: 'state:MS', label: 'Cotton rows in the Delta at sunset', site: 'Cotton rows in the Delta', colour: 'amber', mood: 'calm', season: ['autumn'], tags: ['cotton', 'delta', 'sunset', 'harvest'],
    svg: () => { const s1 = U(), f1 = U(), l1 = U(); const VX = 800, VY = 520;
      /** Cotton bolls along rows that run to the vanishing point, in three depth bands (bigger and sparser near us). */
      const rows = (y0, y1, n, gap, w, col) => { let d = ''; for (let i = 0; i < n; i++) { const bx = -900 + (2400 / (n - 1)) * i, ty0 = (y0 - VY) / (900 - VY), ty1 = (y1 - VY) / (900 - VY);
          d += `M${R(VX + (bx - VX) * ty0)} ${y0}L${R(VX + (bx - VX) * ty1)} ${y1}`; }
        return `<path fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="0 ${gap}" d="${d}"/>`; };
      const plant = (x, y, s) => { let b = ''; const br = [[-60, -150], [-30, -200], [20, -180], [58, -140], [0, -120], [-86, -96]];
        for (const [dx, dy] of br) { b += `<path fill="none" stroke="#4a5a2a" stroke-width="${R(6 * s)}" stroke-linecap="round" d="M${x} ${y}Q${R(x + dx * s * 0.2)} ${R(y + dy * s * 0.7)} ${R(x + dx * s)} ${R(y + dy * s)}"/>`;
          const cx = R(x + dx * s), cy = R(y + dy * s); b += `<path fill="#6a4a2a" d="${star5(cx, cy + 4 * s, 40 * s, 17 * s)}"/><g fill="#fffdf6">${[[-12, -6], [12, -6], [0, -16], [-8, 8], [8, 8]].map(([a, c]) => `<circle cx="${R(cx + a * s)}" cy="${R(cy + c * s)}" r="${R(14 * s)}"/>`).join('')}</g><circle cx="${R(cx - 4 * s)}" cy="${R(cy - 4 * s)}" r="${R(5 * s)}" fill="#e8dcc6"/>`; }
        return mv('ussway', { ad: (4 + (x % 3)) + 's', to: `${x}px ${y}px` }, b); };
      const pole = (x, y, h) => `<path fill="#3a2a22" d="M${x - 3} ${y}V${y - h}h6V${y}z"/><path fill="#3a2a22" d="M${x - 22} ${y - h + 10}h44v5h-44z"/>`;
      return `<defs>${lin(s1, [[0, '#6a68a8'], [0.3, '#d8949e'], [0.58, '#ffb070'], [0.82, '#ffd78e'], [1, '#ffe8b0']])}${lin(f1, [[0, '#a87a4a'], [0.25, '#8a5a38'], [1, '#4a2e22']])}${radU(l1, [[0, '#ffc070', 0.7], [1, '#ffc070', 0]], 1000, 520, 800)}</defs>`
        + full(`url(#${s1})`) + stars(44, 18, 130) + rays(1000, 520, 1000, '#ffe0a0', 0.22) + sun(1000, 508, 70, '#fff0c4', '#ffb050')
        + streak(280, 140, 320, '#ff9e9a', 0.5) + streak(1300, 210, 260, '#ffc48a', 0.5, 70) + cloud(420, 300, 1.2, '#c46a86', 0.82, 62, 8, '#ffc8a4') + cloud(1320, 370, 1.0, '#cc7288', 0.8, 54, 28, '#ffd0aa') + cloud(900, 220, 0.7, '#d27c8c', 0.75, 50, 14, '#ffd6b2')
        + mv('usglide', { ad: '26s', dx: '900px', dy: '-30px' }, `<g class="x-usflap" style="--ad:.6s"><path fill="#2a1e2c" d="M300 300h60l8 -6l-8 -6h-20l-8 -22l-8 22h-24l-8 6z"/></g><path fill="none" stroke="#fff6" stroke-width="3" d="M300 306q-120 14 -260 6"/>`)
        + birds(27, 9, 640, 400, '#2a1c2e', 0.9, 420)
        + mv('uspar', { ad: '38s', dx: '8px' }, canopy('#5a4a62', 524, 20, 51, -160, 330) + canopy('#5a4a62', 524, 20, 52, 500, 1760) + haze(486, 70, '#ffc890', 0.5))
        /* gin, silos and a barn on the horizon */
        + `<g fill="#7a5a5a"><rect x="330" y="470" width="150" height="56"/><path d="M322 472L405 436L488 472z" fill="#8c6a68"/><rect x="500" y="448" width="30" height="78"/><rect x="540" y="454" width="30" height="72"/><path d="M500 448q15 -20 30 0zM540 454q15 -20 30 0z" fill="#9a7a76"/><rect x="590" y="400" width="12" height="126"/></g>`
        + puffs(596, 398, 4, '#d8b6b0', 12, 80, 7, -90, 3)
        + `<path fill="none" stroke="#5a3a3a" stroke-width="2" opacity=".8" d="M620 524V470M660 524V470"/>${lit(350, 488, 14, 18)}${lit(380, 488, 14, 18)}`
        + `<path fill="none" stroke="#4a3430" stroke-width="2" opacity=".7" d="M1160 480Q1260 500 1360 480T1560 480"/>` + pole(1160, 526, 60) + pole(1360, 526, 60) + pole(1560, 526, 60)
        + `<rect y="522" width="1600" height="378" fill="url(#${f1})"/><rect width="1600" height="900" fill="url(#${l1})"/>`
        + rows(524, 600, 34, 7, 3, '#fff1d8') + rows(600, 700, 26, 11, 6, '#fff6e6') + rows(700, 820, 18, 17, 10, '#fffaf0')
        + `<path fill="#c89a62" d="M-160 646Q800 628 1760 646V672Q800 654 -160 672z"/>`
        + mv('usmove', { ad: '36s', dx: '2000px' }, `<g><ellipse cx="800" cy="654" rx="62" ry="5" fill="#000" opacity=".2"/><path fill="#b8442e" d="M744 646h26l10-18h34l12 18h22v10H744z"/><path fill="#5a8aa8" d="M784 630h28l8 14h-36z"/><circle cx="764" cy="656" r="9" fill="#2a2024"/><circle cx="824" cy="656" r="9" fill="#2a2024"/><rect x="740" y="640" width="30" height="6" fill="#ece0c8"/></g>` + puffs(742, 650, 5, '#d9b890', 14, -70, 4, -26, 3.4))
        + haze(540, 80, '#ffc890', 0.4) + plant(180, 900, 1.5) + plant(560, 910, 1.1) + plant(1230, 905, 1.3) + plant(1480, 915, 1.7) + plant(900, 920, 0.9)
        
        + finish(0.32); } });

  /* ---------- NORTH CAROLINA: Cape Hatteras Lighthouse ---------- */
  usSceneAdd({ key: 'state:NC', label: 'Cape Hatteras Lighthouse and the dunes', site: 'Cape Hatteras Lighthouse', colour: 'slate', mood: 'proud', tags: ['lighthouse', 'outer banks', 'dunes', 'hatteras'],
    svg: () => { const s1 = U(), w1 = U(), d1 = U(), l1 = U();
      const X = 560, B = 706, T = 196, wB = 56, wT = 34, xl = (y) => X - (wB + (wT - wB) * ((B - y) / (B - T))), xr = (y) => X + (wB + (wT - wB) * ((B - y) / (B - T)));
      let stripes = ''; const band = 56, tilt = 34;
      for (let ya = B - 4; ya > T - band; ya -= band * 2) { const y1 = ya, y2 = ya - tilt, y3 = y2 - band, y4 = y1 - band; const c = (y) => Math.max(T, Math.min(B, y));
        stripes += `<path d="M${R(xl(c(y1)))} ${c(y1)}L${R(xr(c(y2)))} ${c(y2)}L${R(xr(c(y3)))} ${c(y3)}L${R(xl(c(y4)))} ${c(y4)}z"/>`; }
      return `<defs>${lin(s1, [[0, '#4a8ad0'], [0.5, '#8cc0ea'], [0.8, '#cfe6f4'], [1, '#eaf3f4']])}${lin(w1, [[0, '#8ed0d8'], [0.3, '#3d96b0'], [1, '#1f5f86']])}${lin(d1, [[0, '#f2dfae'], [1, '#d8bb80']])}${radU(l1, [[0, '#fff8d8', 0.5], [1, '#fff8d8', 0]], 300, 140, 700)}</defs>`
        + full(`url(#${s1})`) + sun(280, 150, 38, '#fffbe6', '#fff0b0') + rays(280, 150, 900, '#fff', 0.14)
        + streak(1180, 120, 300, '#fff', 0.6) + streak(300, 300, 260, '#fff', 0.5, 70)
        + cloud(900, 250, 1.4, '#cfdceb', 0.97, 60, 6) + cloud(1380, 190, 1.0, '#d8e4f0', 0.95, 52, 22) + cloud(260, 380, 1.1, '#d6e2ee', 0.93, 70, 30) + cloud(1150, 400, 0.8, '#d8e4f0', 0.9, 56, 40)
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + `<rect y="560" width="1600" height="340" fill="url(#${w1})"/>` + `<path fill="#d4ecee" opacity=".6" d="M-160 560H1760V566H-160z"/>`
        + mv('usmove', { ad: '70s', dx: '140px' }, `<g fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5">${[600, 640, 690, 750].map((y, i) => `<path d="M${-200 + i * 40} ${y}q40 -10 80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0"/>`).join('')}</g>`)
        + shimmer(5, 60, 780, 1600, 580, 800, '#fff', 56) + shimmer(7, 26, 600, 1600, 570, 650, '#dff6f8', 40)
        + mv('usbob', { ad: '6s', dy: '3px' }, `<g><path fill="#f4f4f4" d="M1130 596h90l-14 12h-62z"/><path fill="#c24a3c" d="M1136 604h74l-4 6h-66z"/><path fill="#fff" d="M1175 596L1175 536L1220 590z"/><path fill="#e8e8e8" d="M1172 596V548L1130 592z"/><path stroke="#555" stroke-width="2" d="M1175 596V532"/></g>`)
        + mv('uspar', { ad: '40s', dx: '12px' }, `<path fill="url(#${d1})" opacity=".9" d="M-160 700C200 664 520 690 900 688S1400 650 1760 676V900H-160z"/>`)
        + `<path fill="#c9ae74" d="M900 900C1000 760 1300 700 1760 740V900z"/>`
        + `<path fill="url(#${d1})" d="M-160 900V740C100 706 300 724 500 718S900 740 1100 760C1300 780 1500 790 1760 786V900z"/>`
        + canopy('#4f7438', 702, 22, 71, 330, 800, 722) + canopy('#6a9246', 712, 16, 72, 380, 760, 730)
        /* the keeper's double house */
        + `<g><rect x="690" y="640" width="120" height="68" fill="#f6f2e8"/><path fill="#b24a3a" d="M678 644L750 600L822 644z"/><rect x="740" y="590" width="12" height="26" fill="#a24234"/><rect x="706" y="664" width="22" height="24" fill="#3c4a5a"/>${lit(708, 666, 18, 20)}<rect x="772" y="664" width="22" height="24" fill="#3c4a5a"/>${lit(774, 666, 18, 20)}<rect x="738" y="676" width="24" height="32" fill="#8a6a50"/></g>`
        /* the lighthouse */
        + `<ellipse cx="${X}" cy="${B + 6}" rx="108" ry="12" fill="#2a3a20" opacity=".3"/>`
        + `<path fill="#c1553e" d="M${X - 74} ${B + 8}L${X - 58} ${B - 26}H${X + 58}L${X + 74} ${B + 8}z"/><path fill="#9c4030" d="M${X + 18} ${B - 26}H${X + 58}L${X + 74} ${B + 8}H${X + 26}z"/><path fill="#a39a8c" d="M${X - 84} ${B + 12}H${X + 84}V${B + 4}H${X - 84}z"/>`
        + `<path fill="#f8f6f0" d="M${xl(B - 26)} ${B - 26}L${xr(B - 26)} ${B - 26}L${xr(T)} ${T}L${xl(T)} ${T}z"/><g fill="#1e1e24">${stripes}</g><path fill="#000" opacity=".14" d="M${X + 4} ${B - 26}L${xr(B - 26)} ${B - 26}L${xr(T)} ${T}L${X + 4} ${T}z"/>`
        + `<rect x="${X - 6}" y="${B - 70}" width="12" height="22" fill="#2a2a30"/>`
        + `<path fill="#1e1e24" d="M${xl(T) - 16} ${T}H${xr(T) + 16}V${T - 10}H${xl(T) - 16}z"/><path fill="none" stroke="#1e1e24" stroke-width="3" d="M${xl(T) - 16} ${T - 28}H${xr(T) + 16}M${xl(T) - 12} ${T - 10}V${T - 28}M${X} ${T - 10}V${T - 28}M${xr(T) + 12} ${T - 10}V${T - 28}"/>`
        + `<rect x="${X - 22}" y="${T - 56}" width="44" height="46" fill="#2a2a30"/><rect class="us-lit" x="${X - 17}" y="${T - 50}" width="34" height="34" rx="4"/><path fill="#1e1e24" d="M${X - 28} ${T - 56}Q${X} ${T - 90} ${X + 28} ${T - 56}z"/><path stroke="#1e1e24" stroke-width="3" d="M${X} ${T - 82}V${T - 100}"/>`
        + mv('usglow', { ad: '2.4s', to: `${X}px ${T - 36}px` }, `<circle cx="${X}" cy="${T - 33}" r="18" fill="#fff6c0" opacity=".5"/>`)
        + mv('usspin', { ad: '12s', to: `${X}px ${T - 33}px` }, `<path fill="#fff6c0" opacity=".09" d="M${X} ${T - 33}L${X + 900} ${T - 90}V${T + 24}z"/><path fill="#fff6c0" opacity=".09" d="M${X} ${T - 33}L${X - 900} ${T - 90}V${T + 24}z"/>`)
        + mv('usflag', { ad: '2.4s', to: `${X + 106}px ${B - 118}px` }, `<path fill="#c43a3a" d="M${X + 106} ${B - 118}h30v18h-30z"/>`) + `<path stroke="#7a6a58" stroke-width="3" d="M${X + 106} ${B - 122}V${B - 70}"/>`
        + birds(61, 5, 1000, 330, '#fff', 1.4, 640) + birds(63, 4, 700, 420, '#5a6a7a', 1.1, 520)
        + `<path fill="#b8a066" d="M-160 900V850C200 836 500 858 900 848S1400 836 1760 852V900z"/>`
        + mv('ussway', { ad: '3.6s', to: '800px 900px' }, blades(81, 90, -100, 1700, 800, 900, '#d8c27a', 4, 70, 150) + blades(82, 40, -100, 1700, 810, 900, '#b0a050', 3, 60, 120) + blades(83, 60, -100, 1700, 840, 910, '#8a9a4a', 5, 40, 100))
        + `<g fill="#6a4a2a"><path d="M60 900V800h12V900zM200 900V810h12V900zM340 900V814h12V900z"/></g><path fill="none" stroke="#6a4a2a" stroke-width="6" d="M40 818H380M40 840H380"/>`
        + finish(0.3); } });

  /* ---------- SOUTH CAROLINA: palmettos, a crescent moon and the Charleston marsh ---------- */
  usSceneAdd({ key: 'state:SC', label: 'Palmettos and a crescent moon over the marsh', site: 'Palmettos and the crescent moon', colour: 'blue', mood: 'calm', tags: ['palmetto', 'moon', 'marsh', 'charleston'],
    svg: () => { const s1 = U(), w1 = U(), m1 = U();
      const house = (x, w, h, col, roof) => `<rect x="${x}" y="${566 - h}" width="${w}" height="${h}" fill="${col}"/><path fill="${roof}" d="M${x - 3} ${566 - h}L${x + w / 2} ${566 - h - 18}L${x + w + 3} ${566 - h}z"/>` + win(x, 566 - h, w, 566, 26, '#fff8e8', '#ffd27a', x);
      const houses = [[40, 56, 80, '#e9a0a0', '#5a4a5a'], [96, 50, 96, '#f2d27a', '#5a4a5a'], [146, 54, 74, '#9fc8d8', '#5a4a5a'], [200, 52, 90, '#e8b6c8', '#5a4a5a'], [252, 56, 70, '#b4d8a8', '#5a4a5a'], [310, 50, 100, '#f0c890', '#5a4a5a'],
        [470, 60, 80, '#e9a0a0', '#5a4a5a'], [530, 52, 66, '#f2d27a', '#5a4a5a'], [584, 56, 88, '#9fc8d8', '#5a4a5a'], [644, 52, 72, '#e8b6c8', '#5a4a5a']];
      const spire = (x, h, w) => `<rect x="${x - w}" y="${566 - h}" width="${w * 2}" height="${h}" fill="#f1ece4"/><rect x="${x - w + 3}" y="${566 - h - 46}" width="${w * 2 - 6}" height="48" fill="#ece5da"/><path fill="#d8d0c4" d="M${x - w + 6} ${566 - h - 46}L${x} ${566 - h - 150}L${x + w - 6} ${566 - h - 46}z"/><path stroke="#d8d0c4" stroke-width="3" d="M${x} ${566 - h - 150}V${566 - h - 176}"/>` + `<path fill="#9a948c" d="M${x - 8} ${566 - h - 20}h16v12h-16z"/>${lit(x - 7, 566 - h - 22, 14, 18)}${lit(x - 7, 566 - h + 20, 14, 22)}`;
      return `<defs>${lin(s1, [[0, '#0e1a4a'], [0.34, '#2e3c88'], [0.58, '#7a5a9c'], [0.78, '#e48c92'], [1, '#ffc48c']])}${lin(w1, [[0, '#f2a98e'], [0.1, '#7a6a9c'], [0.5, '#2c3868'], [1, '#141c3c']])}${radU(m1, [[0, '#dfe8ff', 0.5], [0.3, '#bcd0ff', 0.22], [1, '#bcd0ff', 0]], 1090, 220, 520)}</defs>`
        + full(`url(#${s1})`) + stars(15, 80, 320) + `<circle cx="1090" cy="220" r="520" fill="url(#${m1})"/>`
        + mv('usglow', { ad: '7s', to: '1090px 220px' }, `<path fill="#fff6dc" d="M1090 120A100 100 0 0 0 1090 320A128 128 0 0 1 1090 120z"/>`)
        + streak(300, 190, 300, '#c8a8d8', 0.4) + streak(1260, 330, 280, '#f0a8a8', 0.45, 70) + cloud(520, 330, 0.9, '#7a5a98', 0.7, 62, 10, '#d8a8c8') + cloud(1330, 410, 0.8, '#9a6a9a', 0.65, 54, 30, '#f2b0b0')
        + birds(11, 4, 800, 330, '#1c1a3a', 1.1, 600)
        + mv('uspar', { ad: '38s', dx: '8px' }, canopy('#3a3a6a', 550, 16, 3, -160, 440, 570) + canopy('#3a3a6a', 550, 16, 4, 780, 1760, 570) + haze(520, 70, '#ffb490', 0.45))
        + mv('uspar', { ad: '30s', dx: '10px' }, houses.map(h => house(...h)).join('') + spire(400, 130, 20) + `<path fill="#4a3a58" d="M-160 566H1760V574H-160z"/>`)
        + `<rect y="568" width="1600" height="332" fill="url(#${w1})"/>`
        + `<path fill="#fff6dc" opacity=".22" d="M1040 568h100l60 332H980z"/>` + shimmer(5, 26, 900, 1280, 580, 780, '#f4f0ff', 46) + shimmer(6, 20, 0, 1600, 600, 880, '#a898d8', 50)
        + `<path class="us-lamps" fill="none" stroke="#ffd27a" stroke-width="6" stroke-linecap="round" stroke-dasharray="0 24" d="M40 566H700"/>`
        + `<g fill="none" stroke="#2c3868" opacity=".55" stroke-width="2"><path d="M60 570v36M200 570v40M330 570v32M480 570v40M640 570v34"/></g>`
        + mv('usbob', { ad: '6s', dy: '3px' }, `<g><path fill="#1e2040" d="M900 600h70l-8 10h-54z"/><path stroke="#1e2040" stroke-width="3" d="M935 600V560"/><path fill="#d8d8ee" d="M935 562L935 598L910 598z"/><circle class="us-lit" cx="948" cy="596" r="4"/></g>`)
        + `<path fill="#1c2448" d="M-160 900V790C100 774 300 800 560 790S1000 772 1300 792S1600 786 1760 790V900z"/>`
        + `<path fill="#2a3458" opacity=".7" d="M-160 900V836C200 822 500 846 900 834S1400 824 1760 840V900z"/>`
        + mv('ussway', { ad: '5s', to: '800px 900px' }, blades(21, 56, -100, 1700, 780, 900, '#3e5a54', 6, 40, 120) + blades(22, 22, -100, 1700, 800, 900, '#6a8a6a', 4, 30, 90))
        + palm(250, 860, 470, 40, '#2b2028', '#1f3a34', '#2c4c3c', 3) + palm(1390, 870, 540, -50, '#2b2028', '#1c3630', '#2a4a3a', 4) + palm(1150, 800, 180, 18, '#2b2028', '#1f3a34', '#34543e', 5) + palm(520, 800, 130, -14, '#2b2028', '#1f3a34', '#34543e', 6)
        + flies(41, 12, 40, 1560, 560, 860, '#e8ff9a')
        + finish(0.34); } });

  /* ---------- TENNESSEE: fog in the Smokies at dawn ---------- */
  usSceneAdd({ key: 'state:TN', label: 'Mist in the Great Smoky Mountains', site: 'Mist in the Smokies', colour: 'indigo', mood: 'dreamy', tags: ['smoky mountains', 'fog', 'cabin', 'ridges'],
    svg: () => { const s1 = U(), l1 = U();
      const fog = (y, op, dur, del, dx, col) => mv('usdrift', { ad: dur + 's', d: -del + 's', dx: dx + 'px' }, `<ellipse cx="500" cy="${y}" rx="520" ry="${R(24 + op * 40)}" fill="${col || '#f4f0fa'}" opacity="${op}"/><ellipse cx="1150" cy="${y + 10}" rx="620" ry="${R(30 + op * 50)}" fill="${col || '#f4f0fa'}" opacity="${op * 0.9}"/><ellipse cx="820" cy="${y - 6}" rx="360" ry="${R(18 + op * 30)}" fill="#fff" opacity="${op * 0.6}"/>`);
      return `<defs>${lin(s1, [[0, '#7c8ec8'], [0.35, '#c4a8d0'], [0.62, '#ffcfae'], [1, '#fff0d4']])}${radU(l1, [[0, '#fff2cc', 0.75], [1, '#fff2cc', 0]], 940, 440, 760)}</defs>`
        + full(`url(#${s1})`) + rays(940, 440, 1000, '#fff6d8', 0.24) + sun(940, 432, 44, '#fffbe8', '#ffe0a8') + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + streak(300, 140, 300, '#fff', 0.5) + streak(1250, 200, 260, '#ffe6e0', 0.5, 70) + cloud(360, 250, 0.9, '#d8b0c8', 0.85, 60, 6, '#fff0ee') + cloud(1360, 300, 0.8, '#d8b4cc', 0.8, 64, 28, '#fff0f0')
        + birds(2, 3, 600, 330, '#4a4a6a', 1.1, 560)
        + mv('uspar', { ad: '40s', dx: '6px' }, ridge('#c6c0e0', 470, 56, 8, 61) + fog(520, 0.55, 54, 8, 100))
        + mv('uspar', { ad: '36s', dx: '9px' }, ridge('#a8aed4', 540, 60, 9, 62) + fog(590, 0.6, 46, 20, 140))
        + mv('uspar', { ad: '32s', dx: '12px' }, ridge('#8794c0', 610, 50, 10, 63) + fog(660, 0.6, 60, 4, 120))
        + mv('uspar', { ad: '28s', dx: '16px' }, ridge('#5f7aa6', 690, 44, 10, 64) + pines(65, 34, -100, 1700, 690, 60, '#52709a') + fog(740, 0.55, 50, 30, 160))
        + mv('uspar', { ad: '24s', dx: '20px' }, ridge('#3e6280', 760, 40, 9, 66) + pines(67, 46, -100, 1700, 750, 90, '#35566f'))
        /* a cabin on the near slope */
        + `<g><path fill="#2e4a50" d="M-160 900V800C200 770 500 800 900 790S1400 760 1760 780V900z"/><rect x="1050" y="712" width="150" height="76" fill="#7a4e34"/><path fill="#5e3a28" d="M1050 728h150M1050 746h150M1050 764h150" stroke="#5e3a28" stroke-width="3"/><path fill="#4a3a3a" d="M1036 714L1125 660L1214 714z"/><rect x="1166" y="636" width="16" height="42" fill="#6a5a58"/><rect x="1080" y="736" width="26" height="30" fill="#2a1e1c"/>${lit(1082, 738, 22, 26)}<rect x="1148" y="740" width="22" height="48" fill="#4a2e22"/></g>`
        + puffs(1174, 634, 6, '#f0ecf6', 14, 90, 7, -150, 3.4)
        + `<path fill="none" stroke="#3a2a22" stroke-width="5" d="M880 790H1030M890 774H1030M900 800V770M960 800V770M1020 800V770"/>`
        + `<path fill="#223c40" d="M-160 900V842C200 826 600 850 900 838S1400 830 1760 846V900z"/>`
        + pines(71, 9, -80, 380, 880, 520, '#1b3438') + pines(72, 9, 1250, 1700, 890, 600, '#1a3236') + pines(73, 12, -100, 1700, 900, 150, '#223c40')
        + mv('ussway', { ad: '5s', to: '800px 900px' }, blades(74, 80, -100, 1700, 850, 920, '#3e6a52', 5, 30, 80) + `<g fill="#fff">${Array.from({ length: 16 }, (_, i) => { const r = rnd(i + 91); return `<circle cx="${R(400 + r() * 800)}" cy="${R(860 + r() * 30)}" r="${(3 + r() * 3).toFixed(1)}"/>`; }).join('')}</g>`)
        + fog(870, 0.2, 44, 10, 120, '#ece8f4')
        + finish(0.34); } });

  /* ---------- VIRGINIA: the Blue Ridge from Skyline Drive in autumn ---------- */
  usSceneAdd({ key: 'state:VA', label: 'Autumn sunset from the Skyline Drive overlook', site: 'The Blue Ridge from Skyline Drive', colour: 'orange', mood: 'proud', season: ['autumn'], tags: ['shenandoah', 'blue ridge', 'autumn', 'overlook'],
    svg: () => { const s1 = U(), l1 = U();
      const maple = ['#e0561e', '#f08a22', '#f5c030', '#c4381e', '#e87a28'];
      return `<defs>${lin(s1, [[0, '#2c3a7c'], [0.32, '#7a5a9c'], [0.55, '#e8806c'], [0.76, '#ffb472'], [1, '#ffd896']])}${radU(l1, [[0, '#ffc47a', 0.7], [1, '#ffc47a', 0]], 440, 480, 820)}</defs>`
        + full(`url(#${s1})`) + stars(7, 34, 200) + rays(440, 480, 1000, '#ffdca0', 0.24) + sun(440, 476, 56, '#fff0c4', '#ffa850')
        + streak(900, 150, 320, '#ffa89c', 0.5) + streak(250, 230, 260, '#ffc08a', 0.5, 70) + cloud(1150, 290, 1.1, '#bc6a8c', 0.82, 60, 6, '#ffc4a4') + cloud(780, 400, 0.8, '#c4708a', 0.78, 52, 26, '#ffd0aa') + cloud(1420, 440, 0.7, '#c4708a', 0.75, 64, 14, '#ffd0aa')
        + birds(14, 4, 700, 280, '#2c1c34', 1.2, 600)
        + mv('uspar', { ad: '40s', dx: '6px' }, ridge('#d4849a', 510, 50, 9, 81) + haze(480, 90, '#ffc08a', 0.55))
        + mv('uspar', { ad: '34s', dx: '9px' }, ridge('#a86a92', 560, 52, 10, 82) + haze(540, 90, '#ffa880', 0.4))
        + mv('uspar', { ad: '30s', dx: '12px' }, ridge('#7a5688', 620, 46, 10, 83))
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        /* the road ribbon on the nearer ridge, with car lights */
        + mv('uspar', { ad: '26s', dx: '16px' }, ridge('#4a3a6a', 690, 40, 9, 84) + canopy('#5a3a5a', 672, 16, 85, -160, 1760, 700)
          + `<path fill="none" stroke="#2c2440" stroke-width="9" stroke-linecap="round" d="M-160 726Q200 670 520 704T1000 684T1500 706T1760 690"/>` + `<path fill="none" stroke="#ffd27a" stroke-width="2" stroke-dasharray="14 12" opacity=".5" d="M-160 726Q200 670 520 704T1000 684T1500 706T1760 690"/>`)
        + mv('usmove', { ad: '34s', dx: '1000px' }, `<g><circle class="us-lit" cx="500" cy="700" r="5"/><circle cx="520" cy="702" r="4" fill="#d83a2a"/><path fill="#1c1630" d="M492 698h34v6h-34z"/></g>`)
        + `<path fill="#3a2e4e" d="M-160 900V760C200 740 600 770 1000 756S1500 744 1760 762V900z"/>`
        + mv('ussway', { ad: '5s', to: '800px 800px' }, blades(86, 100, -100, 1700, 760, 840, '#c08a3a', 4, 20, 50) + blades(87, 50, -100, 1700, 770, 850, '#8a4a24', 4, 20, 44))
        /* the stone wall of the overlook */
        + `<rect x="-160" y="786" width="1920" height="130" fill="#6e665e"/><g fill="none" stroke-width="24"><path stroke="#8a8278" stroke-dasharray="52 5" d="M-160 800H1760"/><path stroke="#7a726a" stroke-dasharray="40 5" stroke-dashoffset="22" d="M-160 826H1760"/><path stroke="#928a7e" stroke-dasharray="60 5" stroke-dashoffset="8" d="M-160 852H1760"/><path stroke="#767068" stroke-dasharray="46 5" stroke-dashoffset="30" d="M-160 878H1760"/></g><path fill="#aaa294" d="M-160 780H1760V792H-160z"/><path fill="#4a443e" opacity=".4" d="M-160 792H1760V798H-160z"/>`
        + crown(170, 800, 1.5, maple, 3) + crown(1450, 800, 1.7, maple, 4) + crown(420, 790, 0.9, maple, 7) + crown(1180, 790, 0.8, maple, 8)
        + mv('usbob', { ad: '4s', dy: '1.5px' }, `<g transform="translate(1000 788) scale(.8)" fill="#2a2030"><path d="M0 -64C16 -78 60 -80 84 -66C92 -60 90 -44 84 -38V0h-8L72 -34H20L16 0H8V-34C-2 -40 -4 -54 0 -64z"/><path d="M78 -62L100 -104L112 -102L100 -58z"/><ellipse cx="112" cy="-104" rx="16" ry="8" transform="rotate(-22 112 -104)"/><path fill="none" stroke="#2a2030" stroke-width="3" d="M108 -112L102 -140M102 -124L90 -134M112 -112L122 -140M118 -128L130 -134"/><path d="M-2 -60C-10 -64 -14 -70 -12 -76z"/></g>`)
        + leaves(31, 22, 100, 1500, maple)
        + finish(0.32); } });

  /* ---------- WEST VIRGINIA: the New River Gorge Bridge in autumn ---------- */
  usSceneAdd({ key: 'state:WV', label: 'The New River Gorge Bridge in autumn', site: 'The New River Gorge Bridge', colour: 'green', mood: 'proud', season: ['autumn'], tags: ['bridge', 'gorge', 'new river', 'rafts', 'autumn'],
    svg: () => { const s1 = U(), w1 = U(), l1 = U(), c1 = U();
      const cl = ['#d8501e', '#f08a24', '#f4bc34', '#b8381e', '#c8a030', '#7a8a3a'];
      const yc = (u) => 330 + 310 * u * u, th = (u) => 12 + 10 * u * u;
      const N = 48, top = [], bot = [];
      for (let i = 0; i <= N; i++) { const u = -1 + (2 * i) / N, x = 800 + 360 * u; top.push([x, yc(u) - th(u)]); bot.push([x, yc(u) + th(u)]); }
      const poly = (p) => p.map(([x, y], i) => (i ? 'L' : 'M') + R(x) + ' ' + R(y)).join('');
      let lat = '', col = '';
      for (let i = 0; i < N; i += 1) { lat += `M${R(top[i][0])} ${R(top[i][1])}L${R(bot[i + 1][0])} ${R(bot[i + 1][1])}M${R(bot[i][0])} ${R(bot[i][1])}L${R(top[i + 1][0])} ${R(top[i + 1][1])}`; }
      for (let i = 2; i < N - 1; i += 2) { col += `M${R(top[i][0])} ${R(top[i][1])}V290`; }
      let tr = ''; for (let x = 300; x < 1300; x += 26) tr += `M${x} 262L${x + 13} 286L${x + 26} 262`;
      const blob = (seed, n, side) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) { const y = 262 + r() * 640, xe = side < 0 ? 300 + (y - 250) * 0.34 : 1300 - (y - 250) * 0.34, x = side < 0 ? xe - r() * 520 : xe + r() * 520;
          o += `<circle cx="${R(x)}" cy="${R(y)}" r="${R(34 + r() * 46)}" fill="${cl[R(r() * 5)]}"/>`; } return o; };
      return `<defs>${lin(s1, [[0, '#6a9ad4'], [0.45, '#b8d0e4'], [0.78, '#f6e6c0'], [1, '#ffe8b8']])}${lin(w1, [[0, '#6aa89a'], [1, '#2c6a62']])}${linU(c1, [[0, '#8a7a6a'], [1, '#4a4038']], 0, 250, 0, 900)}${radU(l1, [[0, '#fff2c8', 0.6], [1, '#fff2c8', 0]], 1150, 190, 800)}</defs>`
        + full(`url(#${s1})`) + rays(1150, 190, 900, '#fff6d8', 0.18) + sun(1150, 190, 40, '#fffbe8', '#ffe8a8')
        + streak(280, 120, 300, '#fff', 0.5) + cloud(420, 190, 1.0, '#dbe6f0', 0.93, 58, 6) + cloud(1420, 130, 0.8, '#e0e8f0', 0.9, 66, 28)
        + birds(5, 3, 780, 440, '#2c3a40', 1.3, 600)
        + mv('uspar', { ad: '38s', dx: '8px' }, ridge('#a0b4cc', 450, 40, 9, 91) + haze(420, 90, '#f4eed8', 0.55) + ridge('#7e9aa8', 520, 40, 10, 92) + haze(500, 90, '#f4eed8', 0.5) + ridge('#5e8680', 590, 34, 10, 93))
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + `<path fill="url(#${w1})" d="M520 700H1080L1330 900H270z"/>`
        + mv('usmove', { ad: '50s', dx: '60px' }, `<path fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7" d="M600 730q40-10 80 0M780 760q60-14 120 0M980 740q40-8 70 0M520 820q80-16 160 0M900 840q90-14 180 0"/>`) + shimmer(5, 40, 380, 1220, 720, 890, '#e8fff4', 46)
        /* the gorge walls in fall colour */
        + `<path fill="url(#${c1})" d="M-160 250H300C330 330 360 480 420 620L540 900H-160z"/><path fill="url(#${c1})" d="M1760 250H1300C1270 330 1240 480 1180 620L1060 900H1760z"/>`
        + blob(95, 52, -1) + blob(96, 52, 1) + canopy('#e08a24', 262, 30, 97, -160, 340, 330) + canopy('#c8501e', 270, 28, 98, 1260, 1760, 330) + `<path fill="#6a604f" opacity=".5" d="M300 250C330 330 360 480 420 620L450 700C380 560 340 400 300 250zM1300 250C1270 330 1240 480 1180 620L1150 700C1220 560 1260 400 1300 250z"/>`
        + mv('usdrift', { ad: '50s', dx: '120px' }, `<ellipse cx="800" cy="610" rx="420" ry="26" fill="#f4f0e4" opacity=".5"/><ellipse cx="900" cy="690" rx="360" ry="22" fill="#fff" opacity=".45"/>`)
        /* the steel arch and the deck */
        + `<path fill="#4a5662" d="${poly(top)}${poly(bot.slice().reverse()).replace('M', 'L')}z"/><path fill="none" stroke="#2c3640" stroke-width="2.4" d="${lat}"/><path fill="none" stroke="#5a6672" stroke-width="5" d="${col}"/>`
        + `<path fill="#3c4650" d="M440 640l-16 40h40l16-40zM1160 640l16 40h-40l-16-40z"/>`
        + `<rect x="270" y="262" width="1060" height="24" fill="#566270"/><path fill="none" stroke="#2c3640" stroke-width="2.4" d="${tr}"/><rect x="270" y="252" width="1060" height="10" fill="#7a8694"/><path fill="none" stroke="#7a8694" stroke-width="2" d="M270 244H1330"/>`
        + mv('usmove', { ad: '16s', dx: '900px' }, `<rect x="800" y="238" width="22" height="9" rx="3" fill="#d8442e"/><rect x="900" y="238" width="22" height="9" rx="3" fill="#f2f2f2"/><rect x="740" y="238" width="30" height="9" rx="3" fill="#3a6aa8"/>`)
        + mv('usmove', { ad: '20s', dx: '-900px' }, `<rect x="820" y="238" width="22" height="9" rx="3" fill="#f0c030"/><rect x="940" y="238" width="22" height="9" rx="3" fill="#2a2a32"/><circle class="us-lit" cx="822" cy="243" r="3"/>`)
        + mv('usmove', { ad: '40s', dx: '160px' }, `<g><path fill="#f08a24" d="M620 806h40l-6 10h-28z"/><path fill="#f08a24" d="M980 840h44l-6 11h-32z"/><circle cx="632" cy="802" r="4" fill="#2a3a40"/><circle cx="1000" cy="836" r="4" fill="#2a3a40"/></g>`)
        + mv('usfall', { ad: '24s', dx: '90px', d: '-6s' }, `<g><path fill="#e84a3a" d="M1120 300q40 -40 80 0q-40 12 -80 0z"/><path stroke="#555" stroke-width="1.5" d="M1130 304L1160 340M1190 304L1160 340"/><circle cx="1160" cy="344" r="5" fill="#2a3040"/></g>`)
        + crown(120, 900, 1.8, cl, 5) + crown(1490, 920, 1.9, cl, 6)
        + leaves(35, 22, 0, 1600, cl)
        + finish(0.3); } });

  /** A tower with a lit-side shade and its windows. */
  const bld = (x, top, w, base, fill, shade, seed, day, litc, pitch) => `<rect x="${x}" y="${top}" width="${w}" height="${base - top}" fill="${fill}"/><rect x="${x + R(w * 0.66)}" y="${top}" width="${R(w * 0.34)}" height="${base - top}" fill="${shade}"/>` + win(x, top, w, base, pitch || 22, day || '#d8ecf8', litc || '#ffd27a', seed);

  /* ---------- VIRGINIA BEACH: boardwalk, pier and dolphins ---------- */
  usSceneAdd({ key: 'place:virginia-beach', label: 'The oceanfront pier and dolphins', site: 'The oceanfront and the pier', colour: 'blue', mood: 'cheerful', tags: ['beach', 'pier', 'dolphins', 'boardwalk', 'oceanfront'],
    svg: () => { const s1 = U(), w1 = U(), d1 = U(), l1 = U();
      const dolphin = (x, y, s, dur, del) => mv('usbob', { ad: dur + 's', d: -del + 's', dy: '26px' }, mv('ussway2', { ad: dur + 's', d: -del + 's', to: `${x}px ${y}px` }, `<g transform="translate(${x} ${y}) scale(${s}) rotate(-14)"><path fill="#6d8396" d="M-60 8C-34 -28 22 -36 56 -14L74 -26L68 -4L88 4L66 8C34 26 -22 24 -60 8z"/><path fill="#c8d4dc" d="M-40 14C-10 24 30 22 60 8C30 16 -14 16 -40 14z"/><path fill="#566a7c" d="M-6 -26L8 -48L18 -24z"/><path fill="#566a7c" d="M-60 8L-86 -6L-80 14L-92 28L-60 10z"/><circle cx="52" cy="-6" r="2.4" fill="#1c2a34"/></g>`));
      const umb = (x, y, s, c1, c2) => `<path fill="#6a5a4a" d="M${x - 2} ${y}v${R(80 * s)}h4v${-R(80 * s)}z"/><path fill="${c1}" d="M${x - R(60 * s)} ${y}Q${x} ${y - R(56 * s)} ${x + R(60 * s)} ${y}z"/><path fill="${c2}" d="M${x - R(20 * s)} ${y}Q${x - R(16 * s)} ${y - R(50 * s)} ${x} ${y - R(54 * s)}Q${x + R(16 * s)} ${y - R(50 * s)} ${x + R(20 * s)} ${y}z"/><ellipse cx="${x + R(34 * s)}" cy="${y + R(82 * s)}" rx="${R(34 * s)}" ry="${R(5 * s)}" fill="#8a7448" opacity=".25"/>`;
      let pil = ''; for (let x = 800; x < 1700; x += 60) pil += `M${x} 596V676`;
      return `<defs>${lin(s1, [[0, '#3a8ed8'], [0.55, '#8ccdee'], [1, '#e6f6fa']])}${lin(w1, [[0, '#8fe0e0'], [0.2, '#3fb4c8'], [0.7, '#1f86ac'], [1, '#1c7aa0']])}${lin(d1, [[0, '#f4e2b4'], [1, '#e0c78e']])}${radU(l1, [[0, '#fffbe0', 0.6], [1, '#fffbe0', 0]], 1250, 140, 700)}</defs>`
        + full(`url(#${s1})`) + rays(1250, 140, 900, '#fff', 0.14) + sun(1250, 140, 36, '#fffdf0', '#fff4c0') + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + streak(300, 130, 300, '#fff', 0.6) + cloud(400, 250, 1.0, '#d4e8f4', 0.95, 60, 6) + cloud(1000, 320, 0.7, '#dcecf6', 0.9, 54, 24) + cloud(1460, 270, 0.9, '#d8eaf6', 0.92, 66, 12)
        + birds(5, 5, 900, 210, '#fff', 1.3, 640) + birds(6, 5, 400, 470, '#46606e', 1.0, 700)
        + `<rect y="410" width="1600" height="260" fill="url(#${w1})"/><path fill="#dff8f8" opacity=".6" d="M-160 410H1760V415H-160z"/>`
        + mv('usmove', { ad: '80s', dx: '700px' }, `<g><path fill="#fff" d="M1000 408V372L1034 404z"/><path fill="#e8eef2" d="M996 408V380L970 404z"/><path fill="#c24a3c" d="M966 406h74l-6 6h-62z"/></g>`)
        + shimmer(5, 60, 200, 1600, 430, 640, '#fff', 56) + shimmer(6, 30, 0, 1600, 470, 650, '#bff4f4', 46)
        + dolphin(640, 520, 0.9, 3.4, 0) + dolphin(700, 560, 0.7, 4.2, 1.6) + dolphin(580, 590, 0.6, 3.8, 2.4)
        + mv('usmove', { ad: '40s', dx: '220px' }, `<g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"><path d="M300 640q60-14 120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0"/><path d="M200 672q90-18 180 0t180 0t180 0t180 0t180 0t180 0t180 0t180 0"/></g>`)
        /* hotels on the oceanfront */
        + `<g>${bld(-30, 250, 150, 668, '#e8d8c4', '#c8b8a2', 1, '#7a9ab8', '#ffd27a', 26)}${bld(140, 340, 120, 668, '#f4f0e8', '#d6d0c4', 2, '#7a9ab8', '#ffd27a', 26)}${bld(270, 190, 130, 668, '#d8e4ee', '#b8c8d6', 3, '#6a8ab0', '#ffd27a', 26)}${bld(410, 380, 110, 668, '#f0dcc8', '#d4bea6', 4, '#7a9ab8', '#ffd27a', 26)}</g>`
        + `<path fill="#e8d8c4" d="M-30 250h150v-12h-150z"/><path fill="#d8e4ee" d="M270 190h130v-12H270z"/><path fill="#c44a3a" d="M310 178h50v12h-50z"/>`
        + `<path fill="url(#${d1})" d="M-160 900V668C300 660 700 690 1100 690S1500 676 1760 680V900z"/><path fill="#fff" opacity=".7" d="M-160 668C300 660 700 690 1100 690S1500 676 1760 680V690C1500 686 1100 700 700 700S300 672 -160 680z"/>`
        /* the pier */
        + `<path fill="none" stroke="#7a5a3c" stroke-width="7" d="${pil}"/><rect x="780" y="588" width="980" height="14" fill="#a07a50"/><path fill="none" stroke="#8a6a46" stroke-width="3" d="M780 566H1760M780 566V588M900 566V588M1020 566V588M1140 566V588M1260 566V588M1380 566V588M1500 566V588M1620 566V588M1740 566V588"/>`
        + `<g><rect x="740" y="522" width="150" height="66" fill="#f3ece0"/><path fill="#c24a3c" d="M726 524L815 484L904 524z"/><rect x="760" y="540" width="24" height="26" fill="#6a8aa8"/><rect x="800" y="540" width="24" height="26" fill="#6a8aa8"/><rect x="840" y="540" width="24" height="26" fill="#6a8aa8"/>${lit(762, 542, 20, 22)}${lit(802, 542, 20, 22)}${lit(842, 542, 20, 22)}</g>`
        + `<path class="us-lamps" fill="none" stroke="#ffd27a" stroke-width="6" stroke-linecap="round" stroke-dasharray="0 22" d="M780 570H1760"/>`
        + mv('usflag', { ad: '2s', to: '815px 480px' }, `<path fill="#e8443a" d="M815 460h26l-6 8l6 8h-26z"/>`) + `<path stroke="#555" stroke-width="3" d="M815 484V458"/>`
        + `<g fill="#3a3a48"><circle cx="1300" cy="580" r="5"/><path d="M1296 584h8v12h-8z"/><circle cx="1360" cy="580" r="5"/><path d="M1356 584h8v12h-8z"/></g>`
        + mv('usmove', { ad: '60s', dx: '400px' }, `<g fill="#e8643a"><circle cx="1500" cy="580" r="5"/><path d="M1496 584h8v12h-8z" fill="#3a6aa8"/></g>`)
        + umb(300, 760, 1.0, '#e84a3a', '#fff') + umb(560, 744, 0.8, '#2a8ad8', '#fff') + umb(1150, 750, 0.9, '#f4c030', '#fff') + umb(1420, 770, 1.1, '#e84a8a', '#fff')
        + mv('ussway2', { ad: '3s', to: '980px 700px' }, `<g><path fill="#e84a3a" d="M980 640l22 20l-22 22l-22 -22z"/><path fill="#f4c030" d="M980 640l22 20h-44z"/><path fill="none" stroke="#fff" stroke-width="2" d="M980 682q-10 30 4 56t-6 50"/></g>`)
        + `<g fill="#6a5a44" opacity=".5">${Array.from({ length: 30 }, (_, i) => { const r = rnd(i * 3 + 5); return `<ellipse cx="${R(r() * 1600)}" cy="${R(720 + r() * 100)}" rx="${R(8 + r() * 14)}" ry="3"/>`; }).join('')}</g>`
        /* the boardwalk rail */
        + `<rect x="-160" y="838" width="1920" height="70" fill="#a8845a"/><path fill="none" stroke="#8a6a44" stroke-width="3" d="M-160 856H1760M-160 874H1760M-160 892H1760"/><path fill="none" stroke="#6a4a2c" stroke-width="3" d="${Array.from({ length: 34 }, (_, i) => `M${-100 + i * 58} 838v70`).join('')}"/>`
        + `<path fill="#e8dcc8" d="M-160 782H1760V794H-160z"/><g fill="#d8ccb6">${Array.from({ length: 12 }, (_, i) => `<rect x="${-100 + i * 160}" y="782" width="16" height="62"/>`).join('')}</g><path fill="#e8dcc8" d="M-160 812H1760V820H-160z"/>`
        + mv('ussway', { ad: '4s', to: '1400px 900px' }, blades(5, 22, 1380, 1700, 830, 850, '#7aa850', 4, 20, 40))
        + finish(0.28); } });

  /* ---------- CHARLOTTE: the Queen City skyline and its crown ---------- */
  usSceneAdd({ key: 'place:charlotte', label: 'The Queen City skyline and its crown', site: 'The Charlotte skyline', colour: 'blue', mood: 'proud', tags: ['skyline', 'crown', 'light rail', 'uptown'],
    svg: () => { const s1 = U(), w1 = U(), l1 = U(), c1 = U();
      return `<defs>${lin(s1, [[0, '#2f78b0'], [0.4, '#8ec4dc'], [0.7, '#ffdcae'], [1, '#ffc28e']])}${lin(w1, [[0, '#f6c8a0'], [0.2, '#6fa4c0'], [1, '#2c6384']])}${linU(c1, [[0, '#d8f0ff'], [1, '#7aa4c4']], 0, 150, 0, 330)}${radU(l1, [[0, '#ffd098', 0.7], [1, '#ffd098', 0]], 1250, 470, 800)}</defs>`
        + full(`url(#${s1})`) + rays(1250, 470, 1000, '#ffecc0', 0.2) + sun(1250, 470, 52, '#fff4d4', '#ffc478')
        + streak(250, 130, 300, '#fff', 0.5) + cloud(360, 260, 1.2, '#f0b8a4', 0.88, 60, 6, '#fff0e4') + cloud(1380, 250, 1.0, '#f4bca8', 0.85, 52, 26, '#fff2e6') + cloud(900, 150, 0.8, '#f6c4b0', 0.8, 48, 12, '#fff')
        + birds(14, 6, 520, 330, '#2c3a52', 1.1, 600)
        + mv('uspar', { ad: '36s', dx: '8px' }, `<g fill="#9ab4cc" opacity=".75">${[[60, 60, 130], [140, 50, 190], [210, 70, 110], [1250, 60, 160], [1330, 50, 120], [1400, 70, 190], [1490, 50, 130]].map(([x, w, h]) => `<rect x="${x}" y="${640 - h}" width="${w}" height="${h}"/>`).join('')}</g>`) + haze(500, 140, '#ffd8a8', 0.5)
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        /* uptown towers */
        + bld(300, 450, 90, 650, '#7a98b8', '#5a789a', 1) + bld(400, 400, 70, 650, '#8aa6c4', '#6a88aa', 2) + bld(470, 360, 90, 650, '#6a88aa', '#4a6a8c', 3) + bld(1180, 440, 100, 650, '#7a98b8', '#5a789a', 4) + bld(1290, 480, 80, 650, '#8aa6c4', '#6a88aa', 5)
        /* Duke Energy Center, slanted top */
        + bld(560, 340, 100, 650, '#5c7ca2', '#3e5e84', 6) + `<path fill="#6a8ab0" d="M560 340L660 340L660 300z"/>`
        /* the Truist pyramid */
        + bld(980, 300, 96, 650, '#6a88aa', '#486a8e', 7) + `<path fill="#9ab8d4" d="M976 300L1028 236L1080 300z"/><path fill="#6a88aa" d="M1028 236L1080 300H1028z"/><path stroke="#6a88aa" stroke-width="3" d="M1028 236V212"/>` + `<circle class="us-lit" cx="1028" cy="206" r="5"/>`
        /* the Crown: the tallest tower with its glass fins */
        + bld(760, 320, 130, 650, '#4f78a8', '#35597f', 8, '#cfe6f6', '#ffd27a', 22) + bld(782, 262, 86, 330, '#4f78a8', '#35597f', 9, '#cfe6f6', '#ffd27a', 22)
        + `<path fill="url(#${c1})" d="M782 264L798 208L810 238L824 150L836 238L850 208L868 264z"/><path fill="#8ab0d0" d="M824 150L836 238L868 264L850 208L836 238z" opacity=".8"/>`
        + `<path class="us-lamps" fill="none" stroke="#ffe8a8" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 12" d="M798 250L810 238L824 170L836 240L850 218"/><path stroke="#35597f" stroke-width="3" d="M824 150V118"/>`
        + mv('usglow', { ad: '3s', to: '824px 112px' }, `<circle class="us-lit" cx="824" cy="112" r="6"/><circle cx="824" cy="112" r="16" fill="#ff6a5a" opacity=".35"/>`)
        + `<path fill="#ffd8a0" opacity=".28" d="M890 320h0L890 650h-8L882 320z"/>`
        + `<rect y="650" width="1600" height="130" fill="url(#${w1})"/>` + shimmer(7, 44, 0, 1600, 662, 770, '#ffe6b8', 56) + shimmer(8, 22, 300, 1000, 660, 740, '#bfe6f6', 44)
        + `<g fill="#f4bc8a" opacity=".3"><rect x="760" y="652" width="130" height="90"/><rect x="980" y="652" width="96" height="70"/><rect x="560" y="652" width="100" height="60"/></g>`
        + mv('usdrift', { ad: '8s', dx: '20px' }, `<g fill="#fff3e0" opacity=".35"><rect x="700" y="660" width="300" height="3"/></g>`)
        + `<path fill="#3c6a3c" d="M-160 780C100 760 300 776 520 770S900 762 1200 770C1400 774 1600 766 1760 772V900H-160z"/>` + canopy('#2f5a34', 770, 24, 21, -160, 1760, 800)
        /* light rail on its bridge */
        + `<path fill="#7a8694" d="M-160 800H1760V812H-160z"/><path fill="#5a6676" d="M-160 812H1760V862H-160z"/><path fill="#46525f" d="M-160 862H1760V870H-160z"/><g fill="#6a7684">${Array.from({ length: 16 }, (_, i) => `<rect x="${-100 + i * 120}" y="822" width="70" height="30" rx="4"/>`).join('')}</g>`
        + `<path fill="none" stroke="#2c3640" stroke-width="2" d="M-160 690Q400 710 800 692T1760 696"/><path fill="#3a4450" d="M300 690v114M1000 690v114M1500 692v112" stroke="#3a4450" stroke-width="6"/>`
        + mv('usmove', { ad: '22s', dx: '2000px' }, `<g><rect x="650" y="758" width="170" height="42" rx="10" fill="#e8eef4"/><rect x="826" y="758" width="170" height="42" rx="10" fill="#e8eef4"/><rect x="650" y="778" width="346" height="8" fill="#2f78b0"/><g fill="#3a5a78">${Array.from({ length: 8 }, (_, i) => `<rect x="${662 + i * 42}" y="764" width="30" height="12" rx="2"/>`).join('')}</g>${lit(668, 766, 14, 8)}${lit(886, 766, 14, 8)}<path fill="#3a4450" d="M772 758l8-18h8l8 18z"/></g>`)
        + mv('ussway2', { ad: '6s', to: '120px 900px' }, `<g fill="#2e5a34"><circle cx="120" cy="840" r="90"/><circle cx="60" cy="860" r="70"/><circle cx="190" cy="866" r="66"/></g><path fill="#4a3a2a" d="M112 900V850h16V900z"/>`)
        + mv('ussway2', { ad: '7s', to: '1480px 900px' }, `<g fill="#3a6a38"><circle cx="1480" cy="836" r="96"/><circle cx="1410" cy="864" r="70"/><circle cx="1556" cy="860" r="74"/></g><path fill="#4a3a2a" d="M1472 900V850h16V900z"/>`)
        + `<path class="us-lamps" fill="none" stroke="#ffd27a" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 16" d="M-160 800H1760"/>`
        + finish(0.3); } });

  /* ---------- ATLANTA: the skyline at peach-coloured dusk, jets and the Connector ---------- */
  usSceneAdd({ key: 'place:atlanta', label: 'The skyline at dusk with jets overhead', site: 'The Atlanta skyline at dusk', colour: 'indigo', mood: 'energetic', tags: ['skyline', 'jets', 'airport', 'peach', 'highway'],
    svg: () => { const s1 = U(), l1 = U(), p1 = U(), r1 = U();
      const jet = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path fill="#eceaf2" d="M-60 0C-60 -10 -30 -12 30 -10L60 -2L66 4L-50 8z"/><path fill="#d4d2e0" d="M-30 4L10 4L-20 36L-34 36zM-20 -8L-4 -8L-26 -32L-34 -32z"/><path fill="#b8b6cc" d="M-60 0L-70 -26L-56 -26L-44 -6z"/><circle class="us-lit" cx="-70" cy="-26" r="4"/><circle cx="66" cy="4" r="3" fill="#ff5a4a"/></g>`;
      return `<defs>${lin(s1, [[0, '#241f62'], [0.28, '#5a3f92'], [0.52, '#c8689a'], [0.74, '#ff9c80'], [1, '#ffd29a']])}${radU(p1, [[0, '#ffd2a0', 0.95], [0.4, '#ff9c80', 0.4], [1, '#ff9c80', 0]], 340, 560, 560)}${linU(r1, [[0, '#9fb4e0'], [1, '#6a7ab4']], 0, 100, 0, 640)}${lin(l1, [[0, '#383a6a'], [1, '#14163a']])}</defs>`
        + full(`url(#${s1})`) + stars(9, 70, 280) + `<circle cx="340" cy="560" r="560" fill="url(#${p1})"/>` + mv('usglow', { ad: '7s', to: '340px 560px' }, `<circle cx="340" cy="560" r="78" fill="#ffc890"/><circle cx="340" cy="560" r="54" fill="#ffdcaa"/>`)
        + rays(340, 560, 1000, '#ffd2a0', 0.14) + streak(1180, 150, 300, '#f2a0b8', 0.45) + streak(500, 260, 260, '#ffb0a0', 0.45, 70) + cloud(1280, 330, 1.1, '#9a5a96', 0.78, 62, 10, '#f0a0a8') + cloud(760, 400, 0.8, '#b2688e', 0.72, 56, 30, '#ffb0a0')
        + mv('uspar', { ad: '36s', dx: '8px' }, `<g fill="#5a4c8e" opacity=".8">${[[60, 60, 160], [130, 50, 220], [190, 70, 140], [1250, 60, 170], [1330, 50, 230], [1400, 70, 150], [1480, 50, 190]].map(([x, w, h]) => `<rect x="${x}" y="${650 - h}" width="${w}" height="${h}"/>`).join('')}</g>`) + haze(520, 140, '#ffb090', 0.5)
        /* a jet crossing in front of the glow, and a second far away */
        + mv('usglide', { ad: '34s', dx: '1500px', dy: '-80px' }, jet(300, 230, 1.0) + `<circle cx="244" cy="210" r="6" fill="#fff" class="x-usflicker" style="--ad:1.1s;transform-box:fill-box;transform-origin:center"/>`)
        + mv('usglide', { ad: '44s', d: '-20s', dx: '1000px', dy: '-30px' }, jet(900, 340, 0.45))
        /* the towers */
        + bld(430, 470, 110, 650, '#4a4a88', '#33336a', 1, '#c8d0f0', '#ffd27a', 20) + bld(1130, 440, 110, 650, '#44447e', '#2c2c60', 2, '#c8d0f0', '#ffd27a', 20) + bld(1250, 500, 90, 650, '#4a4a88', '#33336a', 3, '#c8d0f0', '#ffd27a', 20) + bld(310, 520, 90, 650, '#4a4a88', '#33336a', 4, '#c8d0f0', '#ffd27a', 20)
        /* Westin Peachtree: a glass cylinder with a round cap */
        + `<rect x="560" y="360" width="100" height="290" fill="#5a5a96"/><rect x="618" y="360" width="42" height="290" fill="#3c3c78"/>` + win(560, 360, 100, 650, 20, '#c8d0f0', '#ffd27a', 5)
        + `<path fill="#6a6aa4" d="M560 360Q610 300 660 360z"/><path fill="#4a4a86" d="M610 300Q650 310 660 360H610z"/><path stroke="#4a4a86" stroke-width="3" d="M610 306V280"/>` + `<circle class="us-lit" cx="610" cy="276" r="5"/>`
        /* Georgia-Pacific, stepped */
        + bld(980, 330, 120, 650, '#505090', '#383878', 6, '#c8d0f0', '#ffd27a', 20) + bld(1000, 280, 80, 340, '#505090', '#383878', 7, '#c8d0f0', '#ffd27a', 20) + `<rect x="1020" y="250" width="40" height="36" fill="#5a5a98"/>`
        /* Bank of America Plaza: the tall slim tower with the gold pyramid */
        + bld(760, 240, 112, 650, '#3e3e80', '#292964', 8, '#c8d0f0', '#ffd27a', 22) + `<path fill="#ffd27a" d="M760 240L816 160L872 240z"/><path fill="#d8a64a" d="M816 160L872 240H816z"/><path stroke="#292964" stroke-width="3" d="M816 160V104"/>`
        + mv('usglow', { ad: '3.4s', to: '816px 200px' }, `<path fill="#fff0b0" opacity=".6" d="M780 240L816 186L852 240z"/>`) + `<circle class="us-lit" cx="816" cy="100" r="5"/><path class="us-lamps" fill="none" stroke="#ffe8a0" stroke-width="4" stroke-linecap="round" stroke-dasharray="0 10" d="M760 240L816 160L872 240"/>`
        + `<rect y="650" width="1600" height="250" fill="url(#${l1})"/>`
        /* the Connector at dusk, with moving light streaks */
        + `<path fill="#22244a" d="M-160 720H1760V900H-160z"/><path fill="#34366a" d="M-160 716H1760V724H-160z"/><path fill="none" stroke="#6a6ca8" stroke-width="3" stroke-dasharray="44 36" d="M-160 780H1760M-160 840H1760"/>`
        + mv('usmove', { ad: '7s', dx: '1900px' }, `<path fill="none" stroke="#fff3c8" stroke-width="7" stroke-linecap="round" stroke-dasharray="40 260" d="M-400 806H2000"/><path fill="none" stroke="#fff3c8" stroke-width="7" stroke-linecap="round" stroke-dasharray="30 360" d="M-300 868H2100"/>`)
        + mv('usmove', { ad: '9s', dx: '-1900px' }, `<path fill="none" stroke="#ff4a3a" stroke-width="7" stroke-linecap="round" stroke-dasharray="36 300" d="M-400 750H2000"/><path fill="none" stroke="#ff4a3a" stroke-width="6" stroke-linecap="round" stroke-dasharray="26 380" d="M-300 810H2100"/>`)
        + `<path fill="#14163a" d="M-160 900V700C100 692 300 716 600 704S1000 690 1300 706S1600 700 1760 704V722H-160z"/>` + canopy('#14163a', 700, 30, 31, -160, 1760, 730)
        + `<g fill="#14163a"><rect x="190" y="660" width="8" height="64"/><rect x="1060" y="660" width="8" height="64"/><rect x="1480" y="660" width="8" height="64"/></g><path fill="#14163a" d="M176 660h36v-8h-36zM1046 660h36v-8h-36zM1466 660h36v-8h-36z"/><circle class="us-lit" cx="194" cy="656" r="9"/><circle class="us-lit" cx="1064" cy="656" r="9"/><circle class="us-lit" cx="1484" cy="656" r="9"/>`
        + birds(77, 4, 1100, 200, '#2a1f4a', 1.2, 700)
        + finish(0.36); } });
})();
