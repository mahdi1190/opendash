/* ============================================================
   ASIA FULL-SCREEN SCENES, batch 5 (Astana, Tashkent, Ashgabat, Novosibirsk, Vladivostok, Yekaterinburg,
   India, Pakistan, Bangladesh, Sri Lanka, Nepal).
   PURE classic script: registers entries with asiaSceneAdd() (71-anim-asia.js). Each svg() returns the inside of a
   1600 x 900 drawing, layered, painted for daytime; the evening grade (us-tint, us-lit, us-lamps, us-star) is
   laid over it by the shared scene css. Motion is transform and opacity only.
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
  /** A run of filler buildings with an optional sparse window grid. */
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
  /** A snow-capped peak: x centre, base y, width, height. */
  const peak = (x, b, w, h, fill, snow, shade) => {
    const p = `M${R(x - w / 2)} ${b}L${R(x - w * 0.14)} ${R(b - h * 0.68)}L${R(x - w * 0.05)} ${R(b - h * 0.78)}L${x} ${R(b - h)}L${R(x + w * 0.1)} ${R(b - h * 0.8)}L${R(x + w * 0.18)} ${R(b - h * 0.7)}L${R(x + w / 2)} ${b}z`;
    let o = `<path fill="${fill}" d="${p}"/>`;
    if (shade) o += `<path fill="${shade}" opacity=".5" d="M${x} ${R(b - h)}L${R(x + w * 0.18)} ${R(b - h * 0.7)}L${R(x + w / 2)} ${b}H${R(x + w * 0.06)}z"/>`;
    if (snow) o += `<path fill="${snow}" d="M${R(x - w * 0.14)} ${R(b - h * 0.68)}L${R(x - w * 0.05)} ${R(b - h * 0.78)}L${x} ${R(b - h)}L${R(x + w * 0.1)} ${R(b - h * 0.8)}L${R(x + w * 0.18)} ${R(b - h * 0.7)}L${R(x + w * 0.1)} ${R(b - h * 0.62)}L${R(x + w * 0.03)} ${R(b - h * 0.68)}L${R(x - w * 0.04)} ${R(b - h * 0.6)}L${R(x - w * 0.09)} ${R(b - h * 0.66)}z"/>`;
    return o;
  };
  /** A bulbous dome with ribs: centre x, base y, radius. */
  const dome = (cx, by, r, fill, rib, hl) => {
    const p = `M${cx - r} ${by}C${R(cx - r * 1.15)} ${R(by - r * 0.9)} ${R(cx - r * 0.5)} ${R(by - r * 1.35)} ${cx} ${R(by - r * 1.8)}C${R(cx + r * 0.5)} ${R(by - r * 1.35)} ${R(cx + r * 1.15)} ${R(by - r * 0.9)} ${cx + r} ${by}z`;
    let o = `<path fill="${fill}" d="${p}"/>`;
    if (hl) o += `<path fill="${hl}" opacity=".45" d="M${R(cx - r * 0.7)} ${R(by - r * 0.3)}C${R(cx - r * 0.8)} ${R(by - r * 0.9)} ${R(cx - r * 0.3)} ${R(by - r * 1.3)} ${R(cx - r * 0.1)} ${R(by - r * 1.6)}C${R(cx - r * 0.3)} ${R(by - r * 1.1)} ${R(cx - r * 0.5)} ${R(by - r * 0.7)} ${R(cx - r * 0.7)} ${R(by - r * 0.3)}z"/>`;
    if (rib) { let d = ''; for (let k = -3; k <= 3; k++) d += `M${R(cx + k * r * 0.3)} ${by}Q${R(cx + k * r * 0.62)} ${R(by - r * 1.0)} ${cx} ${R(by - r * 1.8)}`; o += `<path fill="none" stroke="${rib}" stroke-width="2" opacity=".6" d="${d}"/>`; }
    return o;
  };
  /** A stepped minaret / tower shaft: x centre, base, top, half-width at the foot. */
  const shaft = (x, b, t, hw, fill, band, cap) => {
    let o = `<path fill="${fill}" d="M${x - hw} ${b}L${R(x - hw * 0.7)} ${t}H${R(x + hw * 0.7)}L${x + hw} ${b}z"/>`;
    if (band) for (let y = t + 14; y < b - 20; y += 34) o += `<rect x="${R(x - hw * 0.85)}" y="${y}" width="${R(hw * 1.7)}" height="7" fill="${band}" opacity=".85"/>`;
    return o + (cap || '');
  };
  /** A pointed arch window or door: x, y = foot, w, h. */
  const arch = (x, y, w, h, fill) => `<path fill="${fill}" d="M${x} ${y}V${R(y - h * 0.62)}Q${x} ${R(y - h * 0.9)} ${R(x + w / 2)} ${y - h}Q${x + w} ${R(y - h * 0.9)} ${x + w} ${R(y - h * 0.62)}V${y}z"/>`;
  /** A line of autumn / leafy tree crowns: round blobs with trunks. */
  const trees = (seed, x0, x1, base, hmin, hmax, cols, trunk) => {
    const r = rnd(seed); let o = '', x = x0;
    while (x < x1) {
      const h = hmin + r() * (hmax - hmin), rr = h * (0.32 + r() * 0.12), c = cols[Math.floor(r() * cols.length)];
      o += `<rect x="${R(x - 4)}" y="${R(base - h * 0.5)}" width="8" height="${R(h * 0.5)}" fill="${trunk || '#4a3a2a'}"/><circle cx="${R(x)}" cy="${R(base - h * 0.62)}" r="${R(rr)}" fill="${c}"/><circle cx="${R(x - rr * 0.6)}" cy="${R(base - h * 0.48)}" r="${R(rr * 0.7)}" fill="${c}"/><circle cx="${R(x + rr * 0.6)}" cy="${R(base - h * 0.5)}" r="${R(rr * 0.72)}" fill="${c}"/>`;
      x += rr * 1.5 + r() * 40;
    }
    return o;
  };
  /** The same drawing mirrored in water below y (reflection wrapper, no motion class on it). */
  const mirror = (y, op, inner) => `<g transform="translate(0 ${2 * y}) scale(1 -1)" opacity="${op}">${inner}</g>`;
  const snowfall = (seed, n, dmin, dmax) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) o += `<circle class="x-usfall" style="--ad:${R(dmin + r() * (dmax - dmin))}s;--d:-${R(r() * 14)}s;--dx:${R(-60 + r() * 120)}px" cx="${R(-40 + r() * 1700)}" cy="${R(r() * 260)}" r="${(1.2 + r() * 2).toFixed(1)}" fill="#fff"/>`;
    return `<g opacity=".9">${o}</g>`;
  };

  /* ---------- Astana: the tower of the poplar and the tent, a winter dusk on the steppe ---------- */
  asiaSceneAdd({ key: 'place:astana', label: 'Winter dusk on the steppe capital', site: 'Bayterek and Khan Shatyr', colour: 'indigo', mood: 'proud', season: ['winter'], tags: ['skyline', 'landmark', 'steppe'],
    svg: () => {
      const s1 = U(), g1 = U(), t1 = U();
      let br = '';
      for (let i = -4; i <= 4; i++) br += `M520 392Q${520 + i * 18} 350 ${520 + i * 30} 318`;
      let ribs = '';
      for (let k = 1; k < 9; k++) ribs += `M1086 214Q${1086 + k * 18} 450 ${900 + k * 40} 640M1086 214Q${1086 - k * 5} 420 ${900 + k * 20} 640`;
      return `<defs>${lin(s1, [[0, '#2f3f78'], [0.4, '#7a6fae'], [0.72, '#f0a48c'], [1, '#ffd9a0']])}${lin(g1, [[0, '#f4eef6'], [1, '#bfc6e2']])}${lin(t1, [[0, '#fff0c8', 0.9], [1, '#8fb2e0', 0.5]])}</defs>`
        + full(`url(#${s1})`) + stars(3, 40, 300) + sun(1260, 620, 40, '#fff2d0', '#ffb98a') + streak(300, 170, 280, '#ffb7b0', 0.45) + streak(1180, 300, 240, '#ffa8a0', 0.5, 70)
        + cloud(420, 400, 0.9, '#c08ab0', 0.8, 60, 5, '#ffcfb8') + cloud(1380, 330, 0.7, '#b98ab4', 0.75, 52, 22, '#ffd6bc')
        + birds(5, 3, 1000, 360, '#3d3560', 1.0, 600)
        + mv('uspar', { ad: '40s', dx: '8px' }, city(31, -160, 1760, 650, 40, 120, 30, 70, '#8f86bb') + haze(520, 120, '#ffd7b4', 0.45))
        + mv('uspar', { ad: '30s', dx: '14px' }, city(32, -160, 330, 650, 90, 230, 34, 70, '#6c6598', 0.4) + city(33, 700, 900, 650, 100, 260, 36, 70, '#6c6598', 0.4) + city(34, 1330, 1760, 650, 100, 270, 34, 74, '#6c6598', 0.4)
          + `<path fill="#5e5a8e" d="M1480 650V300L1500 250L1520 300V650z"/><path d="M1500 250V190" stroke="#5e5a8e" stroke-width="3"/>`)
        // Khan Shatyr tent
        + mv('uspar', { ad: '26s', dx: '10px' }, `<path fill="url(#${t1})" d="M880 650Q1010 560 1086 214Q1130 470 1330 650z"/><path fill="none" stroke="#fff6dc" stroke-width="1.6" opacity=".7" d="${ribs}"/><path d="M1086 214V150" stroke="#e8d9b0" stroke-width="4"/><path fill="#6a639a" opacity=".35" d="M1086 214Q1130 470 1330 650H1130Q1110 440 1086 214z"/>`
          + lit(1000, 590, 14, 36) + lit(1040, 596, 14, 30) + lit(1180, 596, 14, 30) + lit(1230, 600, 14, 26))
        // Bayterek
        + `<path fill="#e6ddc8" d="M498 650Q508 480 508 392H532Q532 480 542 650z"/><path fill="#b9ab90" opacity=".6" d="M520 392H532Q532 480 542 650H520z"/><path fill="none" stroke="#e6ddc8" stroke-width="3.5" d="${br}"/><circle cx="520" cy="300" r="52" fill="#f2c765"/><circle cx="520" cy="300" r="52" fill="none" stroke="#b78b36" stroke-width="3"/>`
        + `<path fill="none" stroke="#b78b36" stroke-width="2" opacity=".7" d="M470 300H570M476 276H564M476 324H564M520 248V352"/>` + mv('usglow', { ad: '5s', to: '520px 300px' }, '<circle cx="520" cy="300" r="22" fill="#fff4c4" opacity=".85"/>')
        + `<path fill="#d8cfba" d="M470 650Q520 610 570 650z"/>`
        + `<rect y="640" width="1600" height="260" fill="url(#${g1})"/><path d="M-160 700Q400 668 900 700T1760 690V900H-160z" fill="#dfe2f2"/>`
        + `<path d="M-160 760Q500 722 1000 762T1760 748V780Q1100 800 500 776T-160 790z" fill="#9fb6dc" opacity=".6"/>`
        + shimmer(4, 16, 100, 1500, 760, 860, '#fff1d0', 70)
        + `<path d="M-160 650H1760" stroke="#9aa0c4" stroke-width="6"/>`
        + dots('M-160 654H1760', '#ffe3a0', 6, 54, 'us-lamps')
        + mv('usmove', { ad: '30s', dx: '1900px' }, '<g transform="translate(800 664)"><rect width="36" height="14" rx="4" fill="#d54a3c"/><rect x="6" y="-8" width="22" height="9" rx="3" fill="#8d2b24"/>' + lit(10, -6, 6, 5) + '</g>')
                + snowfall(8, 46, 10, 18) + finish(0.34);
    } });

  /* ---------- Tashkent: a turquoise-domed madrasa in autumn plane trees ---------- */
  asiaSceneAdd({ key: 'place:tashkent', label: 'Turquoise domes in autumn plane trees', site: 'A Tashkent madrasa', colour: 'teal', mood: 'cosy', season: ['autumn'], tags: ['landmark', 'architecture', 'dome'],
    svg: () => {
      const s1 = U(), w1 = U(), d1 = U();
      let tiles = '';
      for (let x = 600; x < 1000; x += 40) tiles += `M${x} 530V420`;
      return `<defs>${lin(s1, [[0, '#6fb0d8'], [0.6, '#cfe4ea'], [1, '#fbe6bc']])}${lin(w1, [[0, '#d8b48a'], [1, '#b98a60']])}${linU(d1, [[0, '#3ec5c0'], [1, '#157f8c']], 0, 220, 0, 430)}</defs>`
        + full(`url(#${s1})`) + sun(260, 170, 36, '#fffbe6', '#ffe8a8') + cloud(540, 190, 0.8, '#d9e6ec', 0.9, 60, 3) + cloud(1280, 130, 0.9, '#e3edf0', 0.9, 70, 20) + streak(900, 100, 220, '#fff', 0.4)
        + birds(9, 5, 700, 180, '#ffffff', 1.0, 700)
        // distant TV tower and city
        + mv('uspar', { ad: '44s', dx: '8px' }, city(41, -160, 1760, 560, 30, 90, 26, 60, '#b8c6ca') + `<path fill="#a9b8be" d="M1400 560L1412 330H1420L1432 560z"/><ellipse cx="1416" cy="320" rx="30" ry="10" fill="#a9b8be"/><ellipse cx="1416" cy="296" rx="14" ry="22" fill="#b7c5ca"/><path d="M1416 275V200" stroke="#a9b8be" stroke-width="3"/>` + haze(470, 100, '#fdeccc', 0.5))
        // madrasa
        + mv('uspar', { ad: '30s', dx: '10px' },
          `<rect x="160" y="450" width="1280" height="190" fill="url(#${w1})"/><rect x="160" y="436" width="1280" height="16" fill="#c9a074"/>`
          + [210, 300, 390, 1110, 1200, 1290].map((x) => arch(x, 600, 56, 100, '#6b4a34') + arch(x + 8, 596, 40, 84, '#8c6a4c')).join('')
          + `<path fill="#d9b88e" d="M600 640V330Q600 270 800 262Q1000 270 1000 330V640z"/><path fill="#2d9aa6" d="M624 640V340Q624 300 800 292Q976 300 976 340V640z" opacity=".35"/>`
          + arch(700, 640, 200, 250, '#5a4030') + arch(722, 640, 156, 214, '#3c2b20') + `<path fill="none" stroke="#2d9aa6" stroke-width="6" d="M690 640V460Q690 400 800 366Q910 400 910 460V640"/>` + `<path fill="none" stroke="#1d6e86" stroke-width="3" d="${tiles}" opacity="0"/>`
          + `<rect x="600" y="330" width="400" height="14" fill="#2d9aa6"/><rect x="600" y="352" width="400" height="6" fill="#1d6e86"/>`
          + `<rect x="710" y="190" width="180" height="46" fill="#d9b88e"/>`
          + `<path fill="url(#${d1})" d="M742 238C714 196 746 136 800 88C854 136 886 196 858 238z"/><path fill="none" stroke="#bff3ee" stroke-width="2" opacity=".6" d="M800 88Q770 160 770 238M800 88Q830 160 830 238M800 88Q750 150 750 238M800 88Q850 150 850 238"/><path d="M800 88V54" stroke="#e6c768" stroke-width="3"/><circle cx="800" cy="52" r="6" fill="#e6c768"/>`
          + shaft(500, 640, 270, 28, '#d9b88e', '#2d9aa6', `<rect x="478" y="262" width="44" height="14" fill="#2d9aa6"/><path fill="url(#${d1})" d="M482 262C474 228 490 204 500 188C510 204 526 228 518 262z"/>`)
          + shaft(1100, 640, 270, 28, '#d9b88e', '#2d9aa6', `<rect x="1078" y="262" width="44" height="14" fill="#2d9aa6"/><path fill="url(#${d1})" d="M1082 262C1074 228 1090 204 1100 188C1110 204 1126 228 1118 262z"/>`)
          + win(180, 470, 1240, 60, 60, 36, '#6b4a34'))
        + `<rect y="636" width="1600" height="264" fill="#cdb28c"/>`
        + `<path d="M-160 650H1760V690Q800 700 -160 690z" fill="#e3cca4"/>`
        // pool and fountain
        + `<ellipse cx="800" cy="760" rx="380" ry="56" fill="#7fbfc6"/><ellipse cx="800" cy="760" rx="380" ry="56" fill="none" stroke="#e8d3a8" stroke-width="10"/>` + shimmer(2, 18, 480, 1120, 740, 790, '#ffffff', 60)
        + `<path fill="none" stroke="#d6f0f2" stroke-width="3" d="M800 760V690M800 700Q770 690 760 730M800 700Q830 690 840 730" opacity=".8"/>` + puffs(800, 696, 4, '#e6f6f8', 12, 6, 2.4, -26, 1.6)
        // plane trees
        + mv('ussway', { ad: '7s', to: '120px 900px' }, `<rect x="90" y="520" width="26" height="380" fill="#6a4c36"/><circle cx="100" cy="420" r="130" fill="#e08a2c"/><circle cx="20" cy="520" r="90" fill="#c9701f"/><circle cx="190" cy="500" r="96" fill="#f0a23a"/><circle cx="110" cy="330" r="80" fill="#f2b04a"/>`)
        + mv('ussway2', { ad: '8s', to: '1500px 900px' }, `<rect x="1486" y="500" width="28" height="400" fill="#6a4c36"/><circle cx="1500" cy="410" r="140" fill="#d9792a"/><circle cx="1600" cy="520" r="100" fill="#c0601a"/><circle cx="1400" cy="500" r="96" fill="#f0a23a"/><circle cx="1510" cy="310" r="84" fill="#f4b653"/>`)
        + Array.from({ length: 14 }, (_, i) => `<ellipse class="x-usfall" style="--ad:${9 + (i % 5) * 2}s;--d:-${i * 1.4}s;--dx:${(i % 2 ? 90 : -70)}px" cx="${R(60 + i * 110)}" cy="${R(120 + (i % 4) * 40)}" rx="9" ry="5" fill="${i % 2 ? '#e58a28' : '#c4551c'}"/>`).join('')
        + finish(0.32);
    } });

  /* ---------- Ashgabat: white marble and gold domes under the Kopetdag ---------- */
  asiaSceneAdd({ key: 'place:ashgabat', label: 'White marble and gold domes below the Kopetdag', site: 'Marble avenues of Ashgabat', colour: 'amber', mood: 'calm', season: 'any', tags: ['skyline', 'marble', 'fountain'],
    svg: () => {
      const s1 = U(), m1 = U(), p1 = U();
      let cols = '';
      for (let x = 470; x <= 1130; x += 44) cols += `<rect x="${x}" y="470" width="14" height="150" fill="#fbfaf4"/><rect x="${x + 9}" y="470" width="5" height="150" fill="#d8d6cc"/>`;
      return `<defs>${lin(s1, [[0, '#4f93d4'], [0.7, '#a9d2ee'], [1, '#f6efdc']])}${lin(m1, [[0, '#9e7d86'], [1, '#d7a98a']])}${lin(p1, [[0, '#86cfd8'], [1, '#3a9ab0']])}</defs>`
        + full(`url(#${s1})`) + sun(1280, 160, 36, '#fffbe6', '#ffeaa8') + cloud(380, 170, 0.8, '#e7f0f6', 0.9, 70, 4) + cloud(980, 110, 0.6, '#eef4f8', 0.9, 80, 30)
        + birds(12, 4, 800, 250, '#516a86', 1.0, 700)
        // Kopetdag
        + mv('uspar', { ad: '50s', dx: '8px' }, ridge('#b99aa0', 430, 90, 12, 7) + ridge(`url(#${m1})`, 470, 60, 14, 12) + haze(400, 100, '#fbeed4', 0.5))
        + mv('uspar', { ad: '34s', dx: '12px' }, city(51, -160, 420, 600, 60, 170, 30, 60, '#ece8de', 0.3) + city(52, 1180, 1760, 600, 60, 190, 30, 60, '#ece8de', 0.3)
          + `<path fill="#f4f1e8" d="M1330 600V260H1356V600z"/><path d="M1343 260V210" stroke="#d9b45a" stroke-width="4"/><circle cx="1343" cy="206" r="8" fill="#e5bd5d"/>`)
        // grand marble hall
        + `<rect x="440" y="440" width="720" height="190" fill="#f7f5ee"/><rect x="440" y="426" width="720" height="18" fill="#fffdf6"/><path fill="#e4e1d6" d="M440 600H1160V630H440z"/>` + cols
        + `<rect x="720" y="380" width="160" height="62" fill="#fbfaf4"/>`
        + dome(800, 380, 78, '#e0b24a', '#a37a22', '#fff0b0') + `<path d="M800 240V204" stroke="#e0b24a" stroke-width="4"/><circle cx="800" cy="200" r="7" fill="#e0b24a"/>`
        + [[520, 426, 38], [1080, 426, 38]].map(([x, y, r]) => `<rect x="${x - 44}" y="${y - 30}" width="88" height="34" fill="#fbfaf4"/>` + dome(x, y - 30, r, '#e0b24a', '#a37a22', '#fff0b0')).join('')
        + lit(560, 490, 20, 40) + lit(1020, 490, 20, 40) + lit(790, 400, 20, 30)
        + `<rect x="400" y="626" width="800" height="16" fill="#fffdf6"/>`
        // plaza and pools
        + `<rect y="640" width="1600" height="260" fill="#eee7d6"/><path d="M-160 700H1760" stroke="#d9d0bb" stroke-width="3"/>`
        + `<path d="M520 660H1080L1240 900H360z" fill="url(#${p1})"/><path d="M520 660H1080L1240 900H360z" fill="none" stroke="#fffdf6" stroke-width="10"/>`
        + shimmer(3, 24, 400, 1200, 680, 890, '#e8fbff', 90)
        + [600, 800, 1000].map((x, i) => `<path fill="none" stroke="#f2fdff" stroke-width="3" stroke-linecap="round" d="M${x} 740V${650 + i % 2 * 12}M${x} 700Q${x - 30} 690 ${x - 36} 740M${x} 700Q${x + 30} 690 ${x + 36} 740" opacity=".85"/>` + puffs(x, 690, 4, '#f4feff', 12, 4, 2.2 + i * 0.3, -30, 1.6)).join('')
        + mv('ussway', { ad: '6s', to: '150px 900px' }, `<rect x="140" y="640" width="12" height="260" fill="#7a5a3c"/><path fill="#4a9a50" d="M146 640Q80 600 30 640Q90 610 146 630Q100 560 60 540Q130 570 146 620Q150 540 140 500Q170 560 150 620Q200 560 250 560Q190 590 150 636Q220 610 260 650Q200 628 150 646z"/>`)
        + mv('ussway2', { ad: '7s', to: '1450px 900px' }, `<rect x="1444" y="640" width="12" height="260" fill="#7a5a3c"/><path fill="#3f8c49" d="M1450 640Q1384 600 1334 640Q1394 610 1450 630Q1404 560 1364 540Q1434 570 1450 620Q1454 540 1444 500Q1474 560 1454 620Q1504 560 1554 560Q1494 590 1454 636Q1524 610 1564 650Q1504 628 1454 646z"/>`)
        + finish(0.3);
    } });

  /* ---------- Novosibirsk: the railway bridge over the frozen Ob, winter sunset ---------- */
  asiaSceneAdd({ key: 'place:novosibirsk', label: 'Winter sunset over the Ob and its railway bridge', site: 'The Ob and the Trans-Siberian bridge', colour: 'slate', mood: 'calm', season: ['winter'], tags: ['bridge', 'river', 'train'],
    svg: () => {
      const s1 = U(), i1 = U();
      let truss = '', arc = '';
      for (let x = 160; x < 1500; x += 70) truss += `M${x} 560L${x + 35} 500L${x + 70} 560`;
      for (const c of [[160, 700], [700, 1240]]) arc += `M${c[0]} 560Q${(c[0] + c[1]) / 2 + 20} 440 ${c[1]} 560`;
      let piers = '';
      for (const x of [160, 700, 1240]) piers += `<path fill="#6e6a7e" d="M${x - 24} 560L${x - 36} 780H${x + 36}L${x + 24} 560z"/><path fill="#fff" opacity=".7" d="M${x - 34} 780l8-40h52l8 40z"/>`;
      return `<defs>${lin(s1, [[0, '#4b5a98'], [0.4, '#a98cbc'], [0.7, '#f4a98a'], [1, '#ffd9a2']])}${lin(i1, [[0, '#e8d4dc'], [0.4, '#b8c2e0'], [1, '#8d9bc6']])}</defs>`
        + full(`url(#${s1})`) + stars(14, 36, 260) + rays(480, 590, 1000, '#ffe0b0', 0.1) + sun(480, 590, 46, '#fff4d0', '#ffb784') + streak(1200, 190, 280, '#ffc0b8', 0.5) + streak(300, 300, 220, '#ffb0a8', 0.5, 70)
        + cloud(900, 330, 1.0, '#bb86b0', 0.8, 62, 6, '#ffcdb4') + cloud(1400, 200, 0.7, '#b184b0', 0.75, 50, 20, '#ffd2b8')
        + birds(2, 4, 1100, 300, '#463a66', 1.0, 600)
        // far bank: city with a domed opera house
        + mv('uspar', { ad: '40s', dx: '8px' }, city(61, -160, 1760, 560, 30, 110, 26, 64, '#8c82b4', 0.35) + haze(450, 110, '#ffd4b0', 0.5))
        + mv('uspar', { ad: '30s', dx: '12px' }, city(62, -160, 430, 560, 70, 190, 32, 66, '#6e6798', 0.4) + city(63, 1050, 1760, 560, 70, 200, 32, 66, '#6e6798', 0.4)
          + `<rect x="620" y="468" width="360" height="92" fill="#cdbfc8"/><path fill="#e4d8dc" d="M620 468H980V480H620z"/>`
          + [650, 700, 750, 850, 900, 950].map((x) => `<rect x="${x}" y="484" width="9" height="76" fill="#efe6e6"/>`).join('')
          + `<path fill="#7f9a8a" d="M690 468C690 380 740 340 800 340C860 340 910 380 910 468z"/><path fill="#a2bcac" opacity=".6" d="M690 468C690 400 730 360 770 346C740 380 730 420 740 468z"/>` + `<path fill="none" stroke="#5f7a6b" stroke-width="2" opacity=".6" d="M800 340V468M760 350Q745 410 750 468M840 350Q855 410 850 468"/>`
          + lit(780, 490, 18, 40) + lit(820, 490, 18, 40))
        + `<rect y="560" width="1600" height="340" fill="url(#${i1})"/>`
        + `<path d="M-160 600Q300 580 800 606T1760 594V640H-160z" fill="#f4f1fa" opacity=".6"/>`
        // ice floes and shimmer
        + [[120, 700, 160, 22], [520, 760, 220, 28], [980, 700, 180, 20], [1330, 800, 260, 30], [260, 840, 200, 24]].map(([x, y, w, h], i) => mv('usdrift', { ad: (40 + i * 7) + 's', dx: '90px' }, `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${h}" fill="#f6f8fd" opacity=".85"/><ellipse cx="${x}" cy="${y + 4}" rx="${w * 0.8}" ry="${h * 0.5}" fill="#cdd6ea" opacity=".6"/>`)).join('')
        + shimmer(7, 20, 100, 900, 610, 760, '#ffe3b8', 70)
        // bridge
        + piers + `<path fill="none" stroke="#2f2c44" stroke-width="7" d="${arc}"/><path fill="none" stroke="#2f2c44" stroke-width="3" d="${truss}"/><rect x="-160" y="552" width="1920" height="14" fill="#2f2c44"/><rect x="-160" y="566" width="1920" height="6" fill="#4e4968"/>`
        + dots('M-160 546H1760', '#ffe0a0', 6, 60, 'us-lamps')
        + mv('usmove', { ad: '34s', dx: '2400px' }, `<g transform="translate(700 532)"><rect width="200" height="22" rx="3" fill="#2a4a6e"/><rect x="0" y="-6" width="40" height="8" fill="#1c3550"/>${[50, 90, 130, 170].map((x) => `<rect x="${x - 18}" y="0" width="34" height="22" fill="#b44a3a"/>`).join('')}${lit(6, 4, 8, 8)}</g>` + puffs(700, 520, 5, '#f4f1fa', 14, -120, 3, -50, 2.4))
        + `<path d="M-160 780H1760V900H-160z" fill="#8795c4" opacity=".3"/>`
        + snowfall(21, 36, 12, 22) + finish(0.36);
    } });

  /* ---------- Vladivostok: the Golden Horn Bridge at dusk, ships in the bay ---------- */
  asiaSceneAdd({ key: 'place:vladivostok', label: 'The Golden Horn bridge and the harbour at dusk', site: 'Golden Horn Bay', colour: 'blue', mood: 'focused', season: 'any', tags: ['bridge', 'harbour', 'hills'],
    svg: () => {
      const s1 = U(), w1 = U();
      let cab = '';
      for (const px of [560, 1040]) for (let k = 1; k <= 9; k++) { cab += `M${px} ${250 + k * 14}L${px - k * 52} 520M${px} ${250 + k * 14}L${px + k * 52} 520`; }
      let hs = '';
      const r = rnd(77);
      for (let x = -120; x < 1760; x += 22) { const h = 14 + r() * 28; hs += `<rect x="${x}" y="${R(600 - h)}" width="${R(14 + r() * 10)}" height="${R(h)}"/>`; }
      return `<defs>${lin(s1, [[0, '#2c3d7c'], [0.45, '#8672ae'], [0.75, '#f2a08c'], [1, '#ffd49a']])}${lin(w1, [[0, '#e0a090'], [0.2, '#566a9c'], [1, '#1f2c58']])}</defs>`
        + full(`url(#${s1})`) + stars(22, 40, 280) + sun(1250, 590, 42, '#fff0cc', '#ffb080') + streak(300, 170, 300, '#ffb0ac', 0.5) + streak(1150, 280, 240, '#ffa090', 0.5, 70)
        + cloud(500, 330, 1.0, '#bb82ac', 0.8, 60, 6, '#ffcab0') + cloud(1400, 220, 0.7, '#b07eaa', 0.75, 50, 24, '#ffd0b4')
        + birds(23, 5, 800, 330, '#3a3158', 1.1, 700)
        + mv('uspar', { ad: '50s', dx: '8px' }, ridge('#7a70a8', 520, 70, 10, 5) + haze(480, 100, '#ffd0b0', 0.45))
        // hillside with houses
        + mv('uspar', { ad: '36s', dx: '12px' }, ridge('#5e5890', 570, 60, 12, 9) + `<g fill="#4a4678">${hs}</g>` + win(-100, 560, 1860, 30, 18, 14) + `<rect x="-160" y="598" width="1920" height="10" fill="#4a4678"/>`)
        + `<rect y="600" width="1600" height="300" fill="url(#${w1})"/>`
        + shimmer(5, 28, 200, 1500, 610, 880, '#ffd8a8', 80)
        // far ships
        + mv('usmove', { ad: '110s', dx: '1900px' }, `<g transform="translate(740 598)"><path fill="#3a3560" d="M0 0h120l-14 -24H20z"/><rect x="40" y="-44" width="30" height="20" fill="#4c4676"/><rect x="50" y="-62" width="8" height="18" fill="#c04a3a"/>${lit(46, -38, 6, 6)}</g>`)
        // bridge: deck, pylons, cables
        + `<path fill="none" stroke="#e9e1ea" stroke-width="1.8" opacity=".85" d="${cab}"/>`
        + `<path fill="#d7cfd9" d="M-160 516H1760V532H-160z"/><path fill="#8e86a4" d="M-160 532H1760V540H-160z"/>`
        + [560, 1040].map((px) => `<path fill="#e8e0e8" d="M${px - 16} 580L${px - 10} 232H${px + 10}L${px + 16} 580z"/><path fill="#a59cb8" opacity=".6" d="M${px} 232H${px + 10}L${px + 16} 580H${px}z"/><rect x="${px - 20}" y="515" width="40" height="22" fill="#cfc6d4"/>`).join('')
        + [560, 1040].map((px) => `<path fill="#d8d0dc" d="M${px - 14} 580H${px + 14}L${px + 20} 660H${px - 20}z" opacity=".0"/>`).join('')
        + `<path fill="#8e86a4" d="M-100 540H1700V556H-100z" opacity=".5"/>` + dots('M-160 512H1760', '#ffe4a8', 6, 46, 'us-lamps')
        + mv('usmove', { ad: '26s', dx: '1900px' }, '<g transform="translate(800 504)"><rect width="46" height="12" rx="4" fill="#d44a3c"/>' + lit(34, 3, 6, 4) + '</g>')
        + mv('usmove', { ad: '34s', d: '-12s', dx: '-1900px' }, '<g transform="translate(800 504)"><rect width="38" height="12" rx="4" fill="#e8e4f0"/>' + lit(4, 3, 6, 4) + '</g>')
        // near ferry and pier
        + mv('usbob', { ad: '5s', to: '700px 820px' }, `<g><path fill="#232a52" d="M520 790H900l-30 40H560z"/><rect x="580" y="750" width="240" height="40" fill="#e6e2ef"/><rect x="640" y="720" width="120" height="30" fill="#d0cbe0"/><rect x="690" y="690" width="14" height="30" fill="#c8483a"/>${win(596, 762, 210, 14, 22, 12, '#2c3a55')}${lit(660, 728, 14, 12)}${lit(710, 728, 14, 12)}</g>`)
        + puffs(697, 686, 4, '#e9e4f2', 12, -90, 4, -40, 2.4)
        + `<path d="M-160 840H1760V900H-160z" fill="#1c2750" opacity=".4"/>`
        + finish(0.36);
    } });

  /* ---------- Yekaterinburg: gold-domed church, the Iset river and a glass tower in autumn ---------- */
  asiaSceneAdd({ key: 'place:yekaterinburg', label: 'Autumn on the Iset below the Urals', site: 'The Iset embankment', colour: 'amber', mood: 'cosy', season: ['autumn'], tags: ['river', 'church', 'autumn'],
    svg: () => {
      const s1 = U(), w1 = U(), g1 = U();
      const onion = (cx, by, r, col) => `<path fill="${col}" d="M${cx - r * 0.5} ${by}C${R(cx - r * 1.2)} ${R(by - r * 0.7)} ${R(cx - r * 0.3)} ${R(by - r * 1.3)} ${cx} ${R(by - r * 2.1)}C${R(cx + r * 0.3)} ${R(by - r * 1.3)} ${R(cx + r * 1.2)} ${R(by - r * 0.7)} ${R(cx + r * 0.5)} ${by}z"/><path d="M${cx} ${R(by - r * 2.1)}V${R(by - r * 2.7)}M${R(cx - r * 0.2)} ${R(by - r * 2.4)}H${R(cx + r * 0.2)}" stroke="${col}" stroke-width="3"/>`;
      const bld = `<rect x="560" y="400" width="400" height="220" fill="#f3eadb"/><rect x="560" y="388" width="400" height="14" fill="#e0d2b6"/>`
        + `<rect x="700" y="300" width="120" height="100" fill="#f7efe0"/><rect x="730" y="260" width="60" height="40" fill="#f7efe0"/>` + onion(760, 262, 40, '#e4b53e')
        + [600, 920].map((x) => `<rect x="${x - 34}" y="340" width="68" height="60" fill="#f7efe0"/>` + onion(x, 340, 30, '#e4b53e')).join('')
        + [640, 880].map((x) => `<rect x="${x - 22}" y="350" width="44" height="40" fill="#f7efe0"/>`).join('') + onion(640, 350, 20, '#3a6eb0') + onion(880, 350, 20, '#3a6eb0')
        + arch(724, 620, 72, 130, '#5a3a2c') + [600, 660, 840, 900].map((x) => arch(x, 560, 34, 70, '#5a4a40')).join('') + lit(738, 470, 12, 24) + lit(770, 470, 12, 24);
      return `<defs>${lin(s1, [[0, '#7aa0cc'], [0.5, '#f0cca4'], [1, '#ffe7b6']])}${lin(w1, [[0, '#cba17c'], [0.3, '#8a9ec0'], [1, '#4a5d88']])}${lin(g1, [[0, '#7a5a40'], [1, '#4c3a2c']])}</defs>`
        + full(`url(#${s1})`) + sun(1180, 420, 44, '#fff6d6', '#ffd48a') + streak(300, 200, 280, '#fff1d4', 0.5) + cloud(520, 160, 0.8, '#e8c8b0', 0.85, 60, 4, '#fff4e0') + cloud(1300, 260, 0.7, '#e6c8b4', 0.8, 50, 20, '#fff2dc')
        + birds(31, 5, 900, 200, '#4a3c46', 1.1, 700)
        + mv('uspar', { ad: '50s', dx: '8px' }, ridge('#98a4be', 450, 70, 10, 3) + ridge('#7a86a4', 480, 50, 12, 8) + haze(420, 100, '#ffe8c4', 0.5))
        // glass tower and city
        + mv('uspar', { ad: '36s', dx: '12px' }, city(71, -160, 450, 600, 50, 180, 30, 64, '#8a8cac', 0.3) + city(72, 1050, 1760, 600, 50, 200, 30, 64, '#8a8cac', 0.3)
          + `<path fill="#6f7ba2" d="M1240 600V210L1262 150L1284 210V600z"/><path fill="#a6b2d4" opacity=".6" d="M1262 150L1284 210V600H1262z"/><path d="M1262 150V100" stroke="#6f7ba2" stroke-width="3"/>` + win(1248, 230, 28, 350, 10, 22, '#2c3a55'))
        + mv('uspar', { ad: '28s', dx: '10px' }, bld)
        // river and embankment
        + `<rect y="610" width="1600" height="290" fill="url(#${w1})"/>`
        + mirror(610, 0.4, `<g>${bld}</g>`).replace('<g transform', '<g clip-path="none" transform')
        + `<rect y="610" width="1600" height="290" fill="url(#${w1})" opacity=".55"/>`
        + shimmer(11, 30, -100, 1700, 620, 880, '#ffe6b4', 80)
        + `<rect x="-160" y="600" width="1920" height="20" fill="#9a8a78"/><rect x="-160" y="620" width="1920" height="10" fill="#6a5c50"/>` + dots('M-160 596H1760', '#ffe0a0', 6, 90, 'us-lamps')
        + mv('usmove', { ad: '60s', dx: '1900px' }, '<g transform="translate(800 700)"><path fill="#3a3a58" d="M0 0h110l-14 22H18z"/><rect x="30" y="-18" width="50" height="18" fill="#d8d0c8"/>' + lit(40, -12, 8, 6) + '</g>')
        // autumn trees
        + mv('ussway', { ad: '8s', to: '160px 900px' }, `<rect x="152" y="540" width="26" height="360" fill="#4e3a2c"/><circle cx="160" cy="470" r="150" fill="#e0881f"/><circle cx="60" cy="570" r="100" fill="#c9561a"/><circle cx="270" cy="560" r="100" fill="#f2aa34"/><circle cx="170" cy="370" r="86" fill="#f4bc4c"/>`)
        + mv('ussway2', { ad: '9s', to: '1450px 900px' }, `<rect x="1438" y="520" width="28" height="380" fill="#4e3a2c"/><circle cx="1450" cy="440" r="160" fill="#c9561a"/><circle cx="1560" cy="560" r="100" fill="#e0881f"/><circle cx="1350" cy="540" r="100" fill="#f2aa34"/><circle cx="1460" cy="330" r="90" fill="#e8982a"/>`)
        + Array.from({ length: 16 }, (_, i) => `<ellipse class="x-usfall" style="--ad:${9 + (i % 5) * 2}s;--d:-${i * 1.2}s;--dx:${(i % 2 ? 90 : -70)}px" cx="${R(80 + i * 98)}" cy="${R(100 + (i % 4) * 40)}" rx="9" ry="5" fill="${i % 2 ? '#e58a28' : '#c4551c'}"/>`).join('')
        + finish(0.32);
    } });

  /* ---------- India: the Taj Mahal at sunrise ---------- */
  asiaSceneAdd({ key: 'country:IN', label: 'The Taj Mahal at sunrise', site: 'The Taj Mahal', colour: 'pink', mood: 'dreamy', season: 'any', tags: ['landmark', 'mausoleum', 'sunrise'],
    svg: () => {
      const s1 = U(), w1 = U(), m1 = U();
      const taj = `<rect x="560" y="520" width="480" height="40" fill="#f6efe6"/><rect x="540" y="560" width="520" height="30" fill="#efe6da"/>`
        + `<rect x="620" y="430" width="360" height="92" fill="#fbf6ee"/>`
        + `<path fill="#eadfd2" d="M740 520V470Q740 436 800 424Q860 436 860 470V520z"/>` + arch(752, 520, 96, 140, '#9c8aa6')
        + `<path fill="#fbf6ee" d="M706 430h-14v-22q0-6 7-6t7 6zM894 430h14v-22q0-6 -7-6t-7 6z"/>`
        + `<rect x="740" y="330" width="120" height="100" fill="#fbf6ee"/><rect x="724" y="424" width="152" height="10" fill="#efe6da"/>`
        + dome(800, 336, 68, '#fffaf2', '#cbbcae', '#ffffff') + `<path d="M800 214V176" stroke="#d9b45a" stroke-width="4"/><circle cx="800" cy="172" r="6" fill="#d9b45a"/>`
        + [[630, 430], [970, 430]].map(([x, y]) => `<rect x="${x - 24}" y="${y - 26}" width="48" height="26" fill="#fbf6ee"/>` + dome(x, y - 26, 16, '#fffaf2', '', '#fff')).join('')
        + arch(650, 520, 40, 70, '#a898b0') + arch(910, 520, 40, 70, '#a898b0') + arch(580, 560, 40, 60, '#a898b0') + arch(980, 560, 40, 60, '#a898b0');
      const minaret = (x) => `<path fill="#fbf6ee" d="M${x - 17} 590L${x - 12} 280H${x + 12}L${x + 17} 590z"/><path fill="#d8cabc" opacity=".6" d="M${x} 280H${x + 12}L${x + 17} 590H${x}z"/>`
        + [380, 460, 530].map((y) => `<rect x="${x - 22}" y="${y}" width="44" height="8" fill="#efe6da"/>`).join('')
        + `<rect x="${x - 22}" y="268" width="44" height="14" fill="#efe6da"/><rect x="${x - 15}" y="240" width="30" height="28" fill="#fbf6ee"/>` + dome(x, 240, 17, '#fffaf2', '', '#fff') + `<path d="M${x} 208V188" stroke="#d9b45a" stroke-width="3"/>`;
      return `<defs>${lin(s1, [[0, '#8a8cc4'], [0.35, '#e8a8c0'], [0.65, '#ffc49a'], [1, '#ffeab4']])}${lin(w1, [[0, '#9fc2c8'], [1, '#6a98aa']])}${lin(m1, [[0, '#fff2e6', 0], [1, '#fff2e6', 0.7]])}</defs>`
        + full(`url(#${s1})`) + stars(41, 20, 140) + rays(800, 360, 1100, '#fff0c0', 0.1) + sun(800, 330, 58, '#fffae0', '#ffc8a0', true)
        + streak(300, 140, 300, '#ffd0d0', 0.5) + streak(1280, 220, 280, '#ffc6b0', 0.5, 70) + cloud(360, 300, 0.9, '#e6a8bc', 0.8, 60, 5, '#ffe2d0') + cloud(1300, 160, 0.8, '#e8aabe', 0.8, 52, 20, '#ffe4d2')
        + birds(43, 6, 1000, 240, '#5a4a6e', 1.0, 700)
        + mv('uspar', { ad: '44s', dx: '8px' }, ridge('#d8b0b8', 560, 20, 14, 4, 600) + canopy('#a8b098', 548, 14, 5, -160, 1760, 600))
        + haze(440, 180, '#fff0e0', 0.6)
        + mv('uspar', { ad: '32s', dx: '12px' }, minaret(470) + minaret(1130) + taj)
        + `<rect y="590" width="1600" height="310" fill="#d8c4a8"/><path d="M-160 590H1760V610H-160z" fill="#efe6da"/>`
        // reflecting pool and cypresses
        + `<path d="M660 610H940L1180 900H420z" fill="url(#${w1})"/>` + `<path d="M660 610H940L1180 900H420z" fill="none" stroke="#efe6da" stroke-width="12"/>`
        + mirror(610, 0.35, `<g>${taj}</g>`).replace('<g transform', '<g clip-path="none" transform')
        + `<path d="M660 610H940L1180 900H420z" fill="url(#${w1})" opacity=".45"/>` + shimmer(6, 22, 480, 1120, 640, 880, '#fff6e0', 80)
        + `<path d="M800 610V900" stroke="#efe6da" stroke-width="10" opacity=".7"/>`
        + [[560, 700], [1040, 700], [470, 800], [1130, 800]].map(([x, y], i) => mv(i % 2 ? 'ussway' : 'ussway2', { ad: '8s', to: `${x}px ${y + 90}px` }, `<path fill="#3f6a44" d="M${x} ${y - 100}Q${x + 22} ${y - 30} ${x + 18} ${y + 90}H${x - 18}Q${x - 22} ${y - 30} ${x} ${y - 100}z"/>`)).join('')
        + `<rect y="620" width="1600" height="280" fill="url(#${m1})"/>`
        + mv('usdrift', { ad: '60s', dx: '120px' }, `<ellipse cx="300" cy="600" rx="400" ry="30" fill="#fff0e6" opacity=".5"/><ellipse cx="1300" cy="590" rx="360" ry="26" fill="#fff0e6" opacity=".5"/>`)
        + finish(0.3);
    } });

  /* ---------- Pakistan: the Badshahi mosque at sunset ---------- */
  asiaSceneAdd({ key: 'country:PK', label: 'The Badshahi Mosque at sunset', site: 'Badshahi Mosque, Lahore', colour: 'red', mood: 'proud', season: 'any', tags: ['landmark', 'mosque', 'sunset'],
    svg: () => {
      const s1 = U(), g1 = U();
      const dm = (cx, by, r) => `<path fill="#f6efe6" d="M${cx - r * 0.78} ${by}C${R(cx - r * 1.1)} ${R(by - r * 0.7)} ${R(cx - r * 0.5)} ${R(by - r * 1.3)} ${cx} ${R(by - r * 1.55)}C${R(cx + r * 0.5)} ${R(by - r * 1.3)} ${R(cx + r * 1.1)} ${R(by - r * 0.7)} ${R(cx + r * 0.78)} ${by}z"/><path fill="#d9cdbf" opacity=".6" d="M${cx} ${R(by - r * 1.55)}C${R(cx + r * 0.5)} ${R(by - r * 1.3)} ${R(cx + r * 1.1)} ${R(by - r * 0.7)} ${R(cx + r * 0.78)} ${by}H${cx}z"/><path d="M${cx} ${R(by - r * 1.55)}V${R(by - r * 1.85)}" stroke="#d9b45a" stroke-width="3"/><circle cx="${cx}" cy="${R(by - r * 1.9)}" r="4" fill="#d9b45a"/>`;
      const mnr = (x) => `<path fill="#b2432c" d="M${x - 22} 620L${x - 16} 250H${x + 16}L${x + 22} 620z"/><path fill="#7a2a1e" opacity=".5" d="M${x} 250H${x + 16}L${x + 22} 620H${x}z"/>`
        + [330, 420, 510].map((y) => `<rect x="${x - 21}" y="${y}" width="42" height="9" fill="#f1e6d6"/>`).join('') + `<rect x="${x - 26}" y="236" width="52" height="16" fill="#f1e6d6"/>`
        + [-18, 0, 18].map((o) => `<rect x="${x + o - 4}" y="204" width="8" height="32" fill="#a83c28"/>`).join('') + `<path fill="#f6efe6" d="M${x - 24} 204H${x + 24}Q${x + 24} 178 ${x} 168Q${x - 24} 178 ${x - 24} 204z"/><path d="M${x} 168V150" stroke="#d9b45a" stroke-width="3"/>`;
      return `<defs>${lin(s1, [[0, '#4f4f98'], [0.35, '#c06f9c'], [0.62, '#f58f5a'], [1, '#ffcf72']])}${lin(g1, [[0, '#d08a5a'], [1, '#a4603f']])}</defs>`
        + full(`url(#${s1})`) + stars(51, 30, 200) + rays(800, 640, 1100, '#ffd890', 0.12) + sun(800, 610, 70, '#fff0b8', '#ff9a50')
        + streak(260, 180, 300, '#ffb4a0', 0.5) + streak(1300, 270, 260, '#ff9a80', 0.55, 70) + cloud(460, 330, 1.0, '#c0709c', 0.8, 62, 4, '#ffbf94') + cloud(1280, 420, 0.8, '#c0709a', 0.75, 52, 22, '#ffc79c')
        + birds(53, 8, 650, 300, '#4a2c4a', 1.1, 800)
        // kites
        + [[300, 240, '#f2c53a'], [1330, 190, '#3aa0d8'], [230, 380, '#e24a6a']].map(([x, y, c], i) => mv(i % 2 ? 'ussway' : 'ussway2', { ad: (3 + i) + 's', d: -i + 's', to: `${x}px ${y + 130}px` }, `<path fill="${c}" d="M${x} ${y - 24}L${x + 18} ${y}L${x} ${y + 30}L${x - 18} ${y}z"/><path d="M${x} ${y + 30}Q${x + 20} ${y + 80} ${x - 10} ${y + 130}" stroke="#4a2c4a" stroke-width="1.5" fill="none"/>`)).join('')
        + mv('uspar', { ad: '44s', dx: '8px' }, city(81, -160, 1760, 650, 20, 70, 28, 60, '#9a5a78') + haze(560, 100, '#ffbf94', 0.5))
        // the mosque
        + mv('uspar', { ad: '30s', dx: '10px' }, mnr(360) + mnr(1240) + mnr(520) + mnr(1080).replace(/#b2432c/g, '#b2432c')
          + `<rect x="360" y="470" width="880" height="170" fill="#b64a30"/><rect x="360" y="458" width="880" height="14" fill="#f1e6d6"/>`
          + `<rect x="690" y="330" width="220" height="140" fill="#b84e34"/><rect x="690" y="318" width="220" height="14" fill="#f1e6d6"/>`
          + dm(800, 318, 100) + dm(600, 458, 54) + dm(1000, 458, 54)
          + arch(742, 640, 116, 200, '#4a2418') + arch(756, 640, 88, 170, '#2f160e') + [560, 600, 640, 960, 1000, 1040].map((x) => arch(x - 14, 640, 28, 90, '#6a3022')).join('')
          + `<path fill="none" stroke="#f1e6d6" stroke-width="5" d="M732 640V520Q732 460 800 430Q868 460 868 520V640"/>` + lit(786, 366, 28, 40) + lit(580, 500, 20, 34) + lit(1000, 500, 20, 34))
        + `<rect y="636" width="1600" height="264" fill="url(#${g1})"/><path d="M-160 640H1760V664H-160z" fill="#e8c8a0"/>`
        + `<path d="M-160 720H1760" stroke="#b97a52" stroke-width="3" opacity=".6"/><path d="M-160 800H1760" stroke="#b97a52" stroke-width="3" opacity=".5"/>`
        + dots('M360 660H1240', '#ffe2a0', 6, 40, 'us-lamps')
        + mv('usdrift', { ad: '50s', dx: '110px' }, '<ellipse cx="300" cy="650" rx="360" ry="24" fill="#ffd0a0" opacity=".35"/><ellipse cx="1300" cy="660" rx="320" ry="22" fill="#ffd0a0" opacity=".35"/>')
        + finish(0.34);
    } });

  /* ---------- Bangladesh: sail boats on a misty delta river at dawn ---------- */
  asiaSceneAdd({ key: 'country:BD', label: 'Sail boats on a delta river at dawn', site: 'The Bengal delta', colour: 'green', mood: 'calm', season: 'any', tags: ['river', 'boats', 'delta'],
    svg: () => {
      const s1 = U(), w1 = U();
      const boat = (x, y, s, sail, hull) => `<g transform="translate(${x} ${y}) scale(${s})"><path fill="${hull}" d="M-110 0Q-80 30 0 30Q90 30 130 -14Q100 6 40 6H-96z"/><path fill="#3a2a1e" d="M-96 6H40l-10 8H-82z" opacity=".5"/><path d="M0 4V-190" stroke="#4a3626" stroke-width="5"/><path fill="${sail}" d="M0 -184Q80 -120 90 -20H-4z"/><path fill="${sail}" opacity=".7" d="M-6 -150Q-60 -90 -70 -20H-6z"/><path fill="none" stroke="#f6e8c8" stroke-width="2" opacity=".6" d="M20 -150V-20M44 -130V-20M66 -100V-20"/><rect x="-40" y="-26" width="60" height="26" rx="10" fill="#6a4a30"/></g>`;
      return `<defs>${lin(s1, [[0, '#88b4c8'], [0.4, '#f2d0a8'], [0.7, '#ffe0a0'], [1, '#fff0c8']])}${lin(w1, [[0, '#f0dcb0'], [0.3, '#9ec4b4'], [1, '#4f8a82']])}</defs>`
        + full(`url(#${s1})`) + rays(900, 470, 1000, '#fff3c0', 0.1) + sun(900, 470, 56, '#fffbe2', '#ffd890', true) + streak(300, 190, 300, '#ffe9c8', 0.55) + streak(1250, 260, 260, '#ffe0b0', 0.5, 70)
        + cloud(420, 280, 0.9, '#f0cfa8', 0.8, 62, 5, '#fff0d0') + cloud(1340, 170, 0.8, '#f0d4b0', 0.8, 52, 22, '#fff2d6')
        + birds(61, 9, 700, 260, '#4a5a4a', 1.0, 800)
        // far tree line and mangroves
        + mv('uspar', { ad: '46s', dx: '8px' }, canopy('#9db89a', 520, 28, 7, -160, 1760, 560) + haze(430, 110, '#fff0cc', 0.6))
        + mv('uspar', { ad: '34s', dx: '12px' }, canopy('#5e8c5c', 540, 36, 11, -160, 520, 600) + canopy('#4e7c52', 548, 40, 13, 1000, 1760, 600)
          + [[110, 520], [260, 540], [1180, 530], [1380, 518], [1540, 540]].map(([x, y]) => `<rect x="${x - 3}" y="${y - 60}" width="6" height="${60}" fill="#5a4a36"/><path fill="#4f7e4a" d="M${x} ${y - 66}Q${x - 36} ${y - 70} ${x - 52} ${y - 40}Q${x - 20} ${y - 56} ${x} ${y - 56}Q${x + 20} ${y - 56} ${x + 52} ${y - 40}Q${x + 36} ${y - 70} ${x} ${y - 66}z"/>`).join('')
          )
        + `<rect y="560" width="1600" height="340" fill="url(#${w1})"/>`
        + `<path d="M-160 574Q400 560 900 578T1760 566V610H-160z" fill="#fff0cc" opacity=".45"/>`
        + `<path d="M860 570L940 570L1040 900H700z" fill="#ffe9b8" opacity=".25"/>`
        + shimmer(8, 34, -100, 1700, 590, 880, '#fff0c0', 90)
        + mv('usdrift', { ad: '60s', dx: '120px' }, '<ellipse cx="500" cy="580" rx="420" ry="26" fill="#fff6dc" opacity=".55"/><ellipse cx="1250" cy="590" rx="380" ry="22" fill="#fff6dc" opacity=".5"/>')
        // water hyacinth
        + mv('usdrift', { ad: '70s', dx: '80px' }, [[200, 790], [330, 830], [1250, 800], [1400, 860], [980, 720]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="38" ry="9" fill="#5e9a4e"/><ellipse cx="${x + 10}" cy="${y - 3}" rx="16" ry="5" fill="#a56ac8"/>`).join(''))
        // boats
        + mv('usbob', { ad: '5s', to: '480px 800px' }, boat(480, 760, 1.0, '#f2d28a', '#5a3a28'))
        + mv('usbob', { ad: '6s', d: '-2s', to: '1160px 700px' }, boat(1160, 690, 0.64, '#e0b472', '#4a3224'))
        + mv('usmove', { ad: '90s', dx: '1800px' }, boat(800, 624, 0.34, '#f4e0b0', '#4a3224'))
        + `<path d="M-160 840H1760V900H-160z" fill="#3a6f66" opacity=".35"/>`
        + finish(0.3);
    } });

  /* ---------- Sri Lanka: the Nine Arch Bridge in misty tea hills ---------- */
  asiaSceneAdd({ key: 'country:LK', label: 'A blue train on the Nine Arch Bridge', site: 'Nine Arch Bridge, Ella', colour: 'green', mood: 'cheerful', season: 'any', tags: ['train', 'bridge', 'tea hills'],
    svg: () => {
      const s1 = U(), v1 = U();
      let arches = '', pr = '';
      for (let i = 0; i < 9; i++) { const x = 340 + i * 102; arches += `<path fill="#4e6e54" d="M${x} 640V560Q${x} 500 ${x + 36} 500Q${x + 72} 500 ${x + 72} 560V640z"/>`; }
      for (let x = -160; x < 1760; x += 18) pr += `M${x} 0q6-8 12 0`;
      let rows = '';
      for (let k = 0; k < 9; k++) rows += `M-160 ${700 + k * 22}Q${300 + k * 50} ${680 + k * 22} 800 ${705 + k * 22}T1760 ${700 + k * 22}`;
      return `<defs>${lin(s1, [[0, '#7fc2d8'], [0.5, '#c8e8dc'], [1, '#fff3cc']])}${lin(v1, [[0, '#7fb27a'], [1, '#2f6e48']])}</defs>`
        + full(`url(#${s1})`) + sun(300, 190, 40, '#fffbe2', '#fff0b0') + rays(300, 190, 900, '#fff6c8', 0.09)
        + cloud(700, 170, 0.9, '#e8f2f0', 0.9, 62, 5) + cloud(1300, 120, 0.7, '#eef6f2', 0.9, 54, 22) + streak(1000, 280, 240, '#fff', 0.4)
        + birds(71, 6, 1100, 250, '#35564a', 1.0, 700)
        + mv('uspar', { ad: '50s', dx: '8px' }, ridge('#9cc8b4', 420, 90, 10, 6) + ridge('#7eb090', 470, 70, 12, 14) + haze(400, 140, '#f4f8e8', 0.65))
        + mv('uspar', { ad: '36s', dx: '12px' }, ridge('#5f9a6c', 540, 60, 12, 21) + canopy('#3f7a52', 560, 40, 23) + haze(500, 110, '#eef6e0', 0.4))
        // the viaduct
        + `<path fill="#6a8a68" d="M300 500H1262V640H300z" opacity="0"/><rect x="330" y="470" width="940" height="34" fill="#9a8e78"/><rect x="330" y="462" width="940" height="10" fill="#b8ac94"/>`
        + `<rect x="330" y="500" width="940" height="140" fill="#8a7e68"/>` + arches.replace(/#4e6e54/g, '#3c5a46')
        + `<path fill="#6e6454" opacity=".5" d="M330 504H1270V516H330z"/><path d="M330 466H1270" stroke="#4a4234" stroke-width="3"/>`
        + `<rect x="322" y="470" width="14" height="170" fill="#a49a82"/><rect x="1264" y="470" width="14" height="170" fill="#a49a82"/>`
        + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<rect x="${R(330 + i * 102 - 8)}" y="504" width="16" height="136" fill="#a49a82"/>`).join('')
        // train
        + mv('usmove', { ad: '16s', dx: '2400px' }, `<g transform="translate(540 430)"><path fill="#274f86" d="M0 0H430V34H0z"/><path fill="#1d3d6a" d="M0 24H430V34H0z"/><path fill="#d9d2c0" d="M0 12H430V16H0z"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => lit(R(14 + i * 34), 4, 18, 11)).join('')}<path fill="#d8402e" d="M430 0H520V34H430z"/>${lit(470, 4, 30, 11)}<path fill="#fff" opacity=".7" d="M450 0H520V4H450z"/></g>` + puffs(550, 424, 4, '#f4f4f4', 12, -80, 3, -40, 2.4))
        // tea terraces
        + `<path d="M-160 640H1760V900H-160z" fill="url(#${v1})"/><path d="${rows}" fill="none" stroke="#a4d88a" stroke-width="5" opacity=".7"/><path d="${rows}" fill="none" stroke="#1f5a3a" stroke-width="3" opacity=".5" transform="translate(0 8)"/>`
        + mv('ussway', { ad: '6s', to: '110px 900px' }, `<rect x="104" y="500" width="12" height="400" fill="#5a4636"/><path fill="#3a8a4a" d="M110 500Q40 460 -20 510Q60 470 110 490Q60 420 20 400Q100 430 110 480Q110 400 100 350Q140 420 116 480Q170 420 230 430Q170 460 116 494Q190 470 240 520Q180 490 116 508z"/>`)
        + mv('ussway2', { ad: '7s', to: '1500px 900px' }, `<rect x="1494" y="520" width="12" height="380" fill="#5a4636"/><path fill="#348044" d="M1500 520Q1430 480 1370 530Q1450 490 1500 510Q1450 440 1410 420Q1490 450 1500 500Q1500 420 1490 370Q1530 440 1506 500Q1560 440 1620 450Q1560 480 1506 514Q1580 490 1630 540Q1570 510 1506 528z"/>`)
        + mv('usdrift', { ad: '55s', dx: '140px' }, '<ellipse cx="500" cy="660" rx="460" ry="30" fill="#f4f8ee" opacity=".55"/><ellipse cx="1260" cy="610" rx="400" ry="26" fill="#f4f8ee" opacity=".5"/>')
        + finish(0.3);
    } });

  /* ---------- Nepal: Machapuchare and the Annapurnas over Phewa Lake at dawn ---------- */
  asiaSceneAdd({ key: 'country:NP', label: 'Alpenglow on the Annapurnas over a lake', site: 'Phewa Lake and the Annapurna range', colour: 'violet', mood: 'dreamy', season: 'any', tags: ['mountains', 'lake', 'dawn'],
    svg: () => {
      const s1 = U(), w1 = U();
      const peaks = peak(380, 520, 700, 300, '#7e7ab0', '#fff0ec', '#4e4a86') + peak(1250, 520, 800, 360, '#7a76ac', '#ffe6e4', '#4a4684')
        + peak(800, 520, 520, 330, '#8a84bc', '#ffecea', '#54508c')
        + `<path fill="#fff4f0" d="M760 250L800 190L842 252L822 262L800 238L780 266z" opacity=".9"/>`;
      const boat = (x, y, s, hull, awn) => `<g transform="translate(${x} ${y}) scale(${s})"><path fill="${hull}" d="M-70 0Q-50 22 0 22Q50 22 80 -4Q50 6 0 6H-60z"/><path fill="${awn}" d="M-30 -2L-14 -26H34L50 -2z"/><path d="M-14 -26V-2M34 -26V-2" stroke="#4a3a3a" stroke-width="2"/></g>`;
      return `<defs>${lin(s1, [[0, '#5a5aa8'], [0.35, '#c08cc0'], [0.65, '#ffb7a0'], [1, '#ffe4b0']])}${lin(w1, [[0, '#f0b0a8'], [0.25, '#7e84b8'], [1, '#32407a']])}</defs>`
        + full(`url(#${s1})`) + stars(81, 40, 220) + streak(260, 150, 300, '#ffc8cc', 0.5) + streak(1250, 230, 260, '#ffb6b4', 0.5, 70) + cloud(1380, 330, 0.8, '#d49ac4', 0.8, 52, 14, '#ffd8d0')
        + sun(1450, 420, 34, '#fff4d8', '#ffbfa0')
        + mv('uspar', { ad: '60s', dx: '6px' }, peaks) + haze(440, 120, '#ffd6d0', 0.55)
        + mv('usdrift', { ad: '70s', dx: '100px' }, '<ellipse cx="560" cy="340" rx="260" ry="22" fill="#fde8e8" opacity=".55"/><ellipse cx="1100" cy="400" rx="300" ry="26" fill="#fde8e8" opacity=".5"/>')
        + birds(83, 5, 600, 220, '#4a3e6a', 1.0, 700)
        + mv('uspar', { ad: '40s', dx: '10px' }, ridge('#5a6a8e', 540, 50, 12, 4, 640) + canopy('#3f5e66', 560, 34, 8, -160, 1760, 640) + `<path fill="#f3eee6" d="M1120 520Q1126 480 1136 480Q1146 480 1152 520z"/><rect x="1130" y="470" width="12" height="14" fill="#f3eee6"/><path d="M1136 470V452" stroke="#d9b45a" stroke-width="3"/>`)
        + `<rect y="600" width="1600" height="300" fill="url(#${w1})"/>`
        + mirror(600, 0.3, ridge('#5a6a8e', 540, 50, 12, 4, 640) + canopy('#3f5e66', 560, 34, 8, -160, 1760, 640)).replace('<g transform', '<g clip-path="none" transform')
        + mirror(600, 0.22, `<g>${peaks}</g>`).replace('<g transform', '<g clip-path="none" transform')
        + `<rect y="600" width="1600" height="300" fill="url(#${w1})" opacity=".5"/>`
        + shimmer(3, 30, -100, 1700, 620, 880, '#ffe0d0', 90)
        // terraces on the near shore
        + `<path d="M-160 780Q300 700 800 760T1760 740V900H-160z" fill="#44683f"/>`
        + `<path d="M-160 800Q300 730 800 790T1760 770M-160 830Q300 770 800 820T1760 800M-160 860Q300 810 800 850T1760 830" fill="none" stroke="#7aa65a" stroke-width="4" opacity=".7"/>`
        + mv('usbob', { ad: '5s', to: '420px 780px' }, boat(420, 760, 1.2, '#2a64a8', '#e8643a'))
        + mv('usbob', { ad: '6s', d: '-2s', to: '1040px 700px' }, boat(1040, 690, 0.9, '#d84a3a', '#f2c23a'))
        + mv('usmove', { ad: '80s', dx: '1900px' }, boat(800, 650, 0.6, '#3a8a5a', '#e8643a'))
        + mv('ussway', { ad: '6s', to: '120px 900px' }, `<rect x="114" y="560" width="12" height="340" fill="#4a3a30"/><path fill="#2f6a44" d="M120 560Q50 520 -10 570Q70 530 120 550Q70 480 30 460Q110 490 120 540Q120 460 110 410Q150 480 126 540Q180 480 240 490Q180 520 126 554Q200 530 250 580Q190 550 126 568z"/>`)
        + finish(0.3);
    } });
})();
