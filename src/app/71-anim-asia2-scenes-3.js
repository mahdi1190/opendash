/* ============================================================
   ASIA FULL-SCREEN SCENES, batch 3 (West Asia cities: Baku, Beirut, Damascus, Jerusalem, Tel Aviv, Amman,
   Baghdad, Tehran, Riyadh, Jeddah, Muscat). PURE classic script: registers entries with asiaSceneAdd()
   (71-anim-asia.js) and draws with usSceneKit() (71-anim-us.js). Each svg() returns the inside of a
   1600 x 900 drawing, layered, painted for daytime; the evening grade lights us-lit / us-lamps / us-star.
   Architecture, landscape and skyline only (no flags, maps, text or people). Rendered size < 32 KB each.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish } = K;

  const rc = (x, y, w, h, f, ex) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${ex || ''}/>`;
  /** Window grid: glass by day, lit at dusk. */
  const win = (x, y, w, h, sx, sy, glass) => {
    let d = '';
    for (let yy = y; yy < y + h; yy += sy) d += `M${x} ${yy}h${w}`;
    return dots(d, glass || '#2c3a55', 5, sx, '', ' opacity=".5"') + dots(d, '#ffd27a', 5, sx, 'us-lamps');
  };
  /** A run of filler buildings with optional window grids. */
  const city = (seed, x0, x1, base, hmin, hmax, wmin, wmax, fill, wc) => {
    const r = rnd(seed); let x = x0, o = '', w = '';
    while (x < x1) {
      const bw = wmin + r() * (wmax - wmin), bh = hmin + r() * (hmax - hmin);
      o += `<rect x="${R(x)}" y="${R(base - bh)}" width="${R(bw)}" height="${R(bh)}"/>`;
      if (r() < 0.3) o += `<rect x="${R(x + bw * 0.3)}" y="${R(base - bh - 14)}" width="${R(bw * 0.4)}" height="16"/>`;
      if (wc && r() < wc && bw > 22) w += win(R(x + 6), R(base - bh + 12), R(bw - 12), R(bh - 24), 12, 22);
      x += bw + r() * 4;
    }
    return `<g fill="${fill}">${o}</g>${w}`;
  };
  /** A dome on a base line (half ellipse), shaded on the right, with a finial. */
  const dome = (cx, by, rx, ry, f, fin) => `<path fill="${f}" d="M${cx - rx} ${by}A${rx} ${ry} 0 0 1 ${cx + rx} ${by}z"/><path fill="#000" opacity=".16" d="M${cx} ${by - ry}A${rx} ${ry} 0 0 1 ${cx + rx} ${by}H${cx}z"/>`
    + `<path d="M${cx} ${by - ry}v${-R(ry * 0.35)}" stroke="${fin || '#d9b25a'}" stroke-width="3"/><circle cx="${cx}" cy="${by - ry - R(ry * 0.38)}" r="${Math.max(3, R(rx / 14))}" fill="${fin || '#d9b25a'}"/>`;
  /** A pencil minaret: shaft, balcony, upper shaft, cone. */
  const minaret = (x, by, h, w, f, cap, sh) => {
    const y1 = by - R(h * 0.66), y2 = by - R(h * 0.86), hw = R(w / 2);
    return `<path fill="${f}" d="M${x - hw} ${by}V${y1}h${w}V${by}z"/><path fill="${sh || '#000'}" opacity=".15" d="M${x} ${by}V${y1}h${hw}V${by}z"/>`
      + rc(x - R(w * 0.85), y1 - 3, R(w * 1.7), 9, cap) + `<path fill="${f}" d="M${x - R(hw * 0.7)} ${y1 - 3}V${y2}h${R(w * 0.7)}V${y1 - 3}z"/>` + rc(x - R(w * 0.65), y2 - 2, R(w * 1.3), 6, cap)
      + `<path fill="${cap}" d="M${x - R(w * 0.5)} ${y2 - 2}L${x} ${by - h}L${x + R(w * 0.5)} ${y2 - 2}z"/>`;
  };
  /** A date palm: curved trunk and fronds, swaying from its foot. */
  const palm = (x, y, h, s, col, lean) => {
    const tx = x + (lean || 0), ty = y - h; let fr = '';
    for (const a of [-170, -150, -125, -95, -60, -35, -10, 10, 170]) {
      const rad = a * Math.PI / 180, L = 92 * s, ex = R(tx + Math.cos(rad) * L), ey = R(ty + Math.sin(rad) * L * 0.4 + 36 * s), mx = R(tx + Math.cos(rad) * L * 0.5), my = R(ty + Math.sin(rad) * L * 0.55 - 22 * s);
      fr += `M${tx} ${ty}Q${mx} ${my} ${ex} ${ey}`;
    }
    return mv('ussway2', { ad: (5 + (x % 3)) + 's', d: -(x % 5) + 's', to: `${x}px ${y}px` }, `<path fill="none" stroke="${col}" stroke-width="${R(6 * s) + 2}" stroke-linecap="round" d="M${x} ${y}Q${x + (lean || 0) * 0.2} ${y - h * 0.5} ${tx} ${ty}"/>`
      + `<path fill="none" stroke="${col}" stroke-width="${R(5 * s) + 1}" stroke-linecap="round" d="${fr}"/><path fill="none" stroke="${col}" stroke-width="${R(11 * s)}" stroke-linecap="round" stroke-dasharray="1 9" opacity=".7" d="${fr}"/>`);
  };
  const lamp = (x, y, s, post) => `<path d="M${x} ${y}V${y - 120 * s}" stroke="${post || '#2a2a38'}" stroke-width="${R(5 * s)}" fill="none"/><circle class="us-lit" cx="${x}" cy="${y - 124 * s}" r="${R(9 * s)}"/>`;

  /* ---------- Baku: the Flame Towers at dusk over the Caspian ---------- */
  asiaSceneAdd({ key: 'place:baku', label: 'The Flame Towers at dusk', site: 'The Flame Towers over the Caspian', colour: 'violet', mood: 'energetic', season: 'any', tags: ['skyline', 'caspian', 'towers', 'dusk'],
    svg: () => {
      const s1 = U(), w1 = U(), t1 = U(), f1 = U(), g1 = U();
      const flame = (x, by, h, w, lean) => `M${x - w} ${by}C${x - w - 6} ${by - h * 0.45} ${x - w * 0.5 + lean} ${by - h * 0.82} ${x + lean} ${by - h}C${x + w * 0.9 + lean} ${by - h * 0.62} ${x + w + 14} ${by - h * 0.3} ${x + w} ${by}z`;
      let tw = '';
      for (const [x, h, w, l, d] of [[1010, 380, 66, -16, 0], [1140, 330, 60, 14, 1], [1262, 280, 54, -10, 2]]) {
        tw += `<path fill="url(#${t1})" d="${flame(x, 590, h, w, l)}"/><path fill="#fff" opacity=".12" d="M${x + 6} 590C${x + 14} ${590 - h * 0.5} ${x + 20 + l} ${590 - h * 0.8} ${x + l * 1.2 + 10} ${590 - h * 0.97}C${x + w * 0.9 + l} ${590 - h * 0.62} ${x + w + 14} ${590 - h * 0.3} ${x + w} 590z"/>`
          + mv('usglow', { ad: (3 + d) + 's', d: -d + 's', to: `${x}px 590px` }, `<path class="us-lit" d="${flame(x + 4, 586, h * 0.72, w * 0.5, l * 0.6)}"/>`)
          + mv('usflicker', { ad: (1.4 + d * 0.3) + 's', to: `${x + l}px ${590 - h}px` }, `<path fill="#ff9a4a" opacity=".85" d="M${x + l - 10} ${590 - h + 26}Q${x + l} ${590 - h - 30} ${x + l + 10} ${590 - h + 26}z"/>`);
      }
      return `<defs>${lin(s1, [[0, '#2a2766'], [0.38, '#7d4b92'], [0.66, '#ee876c'], [1, '#ffcf88']])}${lin(w1, [[0, '#c77a8c'], [0.15, '#4c4f8c'], [1, '#1f2658']])}${lin(t1, [[0, '#d6a6c0'], [0.4, '#6a5a9c'], [1, '#2e3468']])}${radU(f1, [[0, '#ffc47a', 0.7], [1, '#ffc47a', 0]], 260, 600, 520)}${lin(g1, [[0, '#7b5c78'], [1, '#34304e']])}</defs>`
        + full(`url(#${s1})`) + stars(3, 46, 250) + sun(250, 600, 38, '#fff0c4', '#ffa768', true) + `<rect width="1600" height="900" fill="url(#${f1})"/>`
        + streak(420, 170, 320, '#ffb0b8', 0.5) + streak(1250, 150, 300, '#d890c8', 0.5, 70) + cloud(700, 330, 1.1, '#c8789e', 0.8, 62, 6, '#ffc0a8') + cloud(1400, 380, 0.9, '#b8689a', 0.75, 54, 22, '#f7b0a8') + birds(6, 5, 560, 300, '#4a3060', 1, 560)
        + mv('uspar', { ad: '44s', dx: '8px' }, ridge('#80598f', 580, 70, 9, 17) + city(81, -160, 780, 600, 30, 100, 24, 52, '#7a5c8c', 0.3)) + haze(540, 100, '#ffbfa0', 0.5)
        + mv('uspar', { ad: '34s', dx: '14px' }, ridge('#5a477f', 600, 90, 8, 23, 660) + city(82, 1280, 1760, 640, 40, 140, 28, 56, '#54497e', 0.35) + city(83, 780, 980, 640, 30, 100, 26, 50, '#54497e', 0.3))
        + tw + win(1000, 330, 30, 240, 12, 24) + win(1130, 380, 28, 190, 12, 24) + win(1252, 420, 26, 150, 12, 24)
        // old city walls and the Maiden Tower
        + `<g fill="#9c7e6a"><rect x="-160" y="610" width="840" height="60"/>${Array.from({ length: 28 }, (_, i) => `<rect x="${-150 + i * 30}" y="598" width="16" height="14"/>`).join('')}<rect x="120" y="552" width="50" height="118"/><rect x="480" y="560" width="50" height="110"/></g>`
        + `<path fill="#000" opacity=".14" d="M-160 640H680v30H-160z"/><g fill="#8f705f"><path d="M262 670V500h104v170z"/><path d="M256 500h116l-8 -16H264z"/><path d="M280 484h80v-30l-40 -26 -40 26z" fill="#a98b76"/><rect x="332" y="530" width="34" height="140" fill="#000" opacity=".12"/><rect x="368" y="560" width="14" height="110" fill="#8f705f"/></g>`
        + lit(300, 560, 10, 22) + lit(326, 560, 10, 22) + lit(142, 580, 8, 18) + lit(500, 585, 8, 18)
        + `<rect y="640" width="1600" height="260" fill="url(#${w1})"/>` + shimmer(9, 26, 700, 1500, 650, 790, '#ffd8a0', 70) + shimmer(10, 22, -100, 900, 690, 880, '#e8a0a0', 80)
        + mv('usmove', { ad: '80s', dx: '1900px' }, '<g transform="translate(700 718)"><path fill="#1c2250" d="M-60 0l12 -16h80l16 10 20 6z"/><rect x="-24" y="-30" width="34" height="16" fill="#e8d9c4"/><class/></g>'.replace('<class/>', '<rect class="us-lit" x="-16" y="-24" width="6" height="6"/>'))
        + mv('usbob', { ad: '4s', dy: '3px' }, '<g transform="translate(1180 760)"><path fill="#2a2450" d="M-90 0l16 -20h120l20 14 22 6z"/><rect x="-40" y="-40" width="70" height="22" fill="#d6c8d8"/><rect class="us-lit" x="-30" y="-34" width="10" height="8"/><rect class="us-lit" x="-10" y="-34" width="10" height="8"/></g>')
        // promenade
        + `<path fill="url(#${g1})" d="M-160 820H1760V900H-160z"/><path fill="#9a7f8a" d="M-160 810H1760v14H-160z"/>` + dots('M-160 806H1760', '#ffe3a8', 5, 38, 'us-lamps')
        + lamp(300, 830, 0.6) + lamp(700, 830, 0.6) + lamp(1100, 830, 0.6) + lamp(1420, 830, 0.6)
        + palm(80, 830, 190, 1.2, '#22243e', 16) + palm(1500, 830, 220, 1.3, '#22243e', -20) + palm(780, 836, 150, 1, '#2a2c48', 10)
        + finish(0.36);
    } });

  /* ---------- Beirut: the Pigeon Rocks at sunset ---------- */
  asiaSceneAdd({ key: 'place:beirut', label: 'The Pigeon Rocks at sunset', site: 'The Pigeon Rocks at Raouche', colour: 'orange', mood: 'dreamy', season: 'any', tags: ['sea stacks', 'sunset', 'mediterranean', 'cliff'],
    svg: () => {
      const s1 = U(), w1 = U(), r1 = U(), f1 = U(), m1 = U();
      let foam = '';
      for (const [x, y, w] of [[900, 790, 150], [1130, 776, 190], [1300, 790, 120], [1020, 800, 120]]) foam += mv('usbob', { ad: (3 + w / 60) + 's', d: -(x % 3) + 's', dy: '5px' }, `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="14" fill="#fff" opacity=".8"/><ellipse cx="${x - 20}" cy="${y - 8}" rx="${R(w * 0.6)}" ry="8" fill="#fff" opacity=".7"/>`);
      let homes = '';
      const r = rnd(5);
      for (let i = 0; i < 12; i++) { const x = -150 + i * 62, h = 90 + r() * 140, w = 46 + r() * 14; homes += rc(x, 640 - h, w, h, ['#efe1c8', '#e6cfae', '#f4eadb', '#dcb894'][i % 4]) + win(x + 7, 640 - h + 14, w - 14, h - 30, 14, 24) + (r() < 0.5 ? rc(x + 4, 640 - h - 8, w - 8, 8, '#c76a4a') : ''); }
      return `<defs>${lin(s1, [[0, '#4d5b9a'], [0.35, '#c58aa8'], [0.62, '#ff9a72'], [1, '#ffd58a']])}${lin(w1, [[0, '#f2a27c'], [0.12, '#4b6a9c'], [1, '#183b5e']])}${lin(r1, [[0, '#b99a86'], [0.5, '#8a6c66'], [1, '#4b3e50']])}${radU(f1, [[0, '#ffd08a', 0.7], [1, '#ffd08a', 0]], 1000, 560, 600)}${lin(m1, [[0, '#cfd7ee'], [0.25, '#8c8fb8'], [1, '#6a6ca0']])}</defs>`
        + full(`url(#${s1})`) + stars(12, 36, 220) + rays(1000, 560, 1000, '#ffe2b0', 0.1) + sun(1000, 560, 46, '#fff3cf', '#ffa86a', true) + `<rect width="1600" height="900" fill="url(#${f1})"/>`
        + streak(400, 180, 320, '#ffc8c0', 0.5) + streak(1250, 230, 280, '#ffb090', 0.55, 70) + cloud(520, 340, 1.0, '#d8809c', 0.8, 60, 6, '#ffc7aa') + cloud(1380, 400, 0.8, '#d0809e', 0.8, 52, 20, '#ffcdb0')
        + mv('uspar', { ad: '50s', dx: '8px' }, `<path fill="url(#${m1})" d="M-160 560L60 420 140 470 300 360 420 440 560 380 700 470 860 430 1040 500 1200 440 1380 500 1560 410 1760 520V700H-160z"/><path fill="#fff" opacity=".8" d="M300 360l-36 52 30-10 20 22 22-26 22 14z M560 380l-30 40 26-8 16 18 22-22z M1560 410l-32 42 28-8 14 18 24-24z"/>`) + haze(500, 120, '#ffc9a8', 0.55)
        + `<rect y="640" width="1600" height="260" fill="url(#${w1})"/>` + shimmer(2, 30, 700, 1400, 650, 760, '#ffe0b0', 70) + shimmer(3, 22, -100, 1700, 720, 880, '#e89a8c', 90)
        // sea stacks with the arch
        + `<path fill="url(#${r1})" fill-rule="evenodd" d="M960 790C950 700 980 600 1040 540C1090 500 1150 500 1190 560C1230 620 1250 720 1280 790zM1070 790C1070 720 1090 690 1120 690C1150 690 1170 720 1170 790z"/>`
        + `<path fill="#000" opacity=".2" d="M1190 560C1230 620 1250 720 1280 790H1170C1170 720 1150 690 1130 686C1180 680 1200 620 1190 560z"/><path fill="#ffc08a" opacity=".28" d="M1040 540C1000 580 980 660 990 760C975 700 980 600 1040 540z"/>`
        + `<path fill="url(#${r1})" d="M800 790C800 740 820 690 850 670C880 660 910 690 920 790z"/><path fill="#ffc08a" opacity=".25" d="M850 670C830 700 818 740 818 790H800C800 740 820 690 850 670z"/>`
        + `<path fill="#3d4a36" opacity=".8" d="M1040 540c8-14 22-14 28-2c10-12 26-10 30 4c14-6 30 4 24 18z"/>` + foam
        + mv('usglide', { ad: '22s', dx: '700px', dy: '-30px' }, '<g transform="translate(400 600)"><path fill="#fff" d="M0 0l10 -8h20z"/><path fill="#4b3a52" d="M0 0h40l-8 8H8z"/></g>')
        + birds(7, 6, 1000, 420, '#4a3258', 1.1, 600)
        // cliff with the corniche and apartments
        + `<path fill="#a58a74" d="M-160 600L100 590 320 640 520 700 650 790 700 900H-160z"/><path fill="#8b6f5e" d="M300 640L520 700 650 790 700 900H400z" opacity=".55"/>` + homes
        + `<path fill="#7d8f5a" d="M-160 640Q200 610 360 650L600 740 700 900H-160z"/><path fill="#6a7c4a" d="M-160 740Q200 720 420 790L520 900H-160z" opacity=".7"/>`
        + dots('M-100 660Q250 640 440 704', '#ffe3a8', 5, 34, 'us-lamps')
        + mv('uspar', { ad: '26s', dx: '10px' }, palm(120, 870, 220, 1.4, '#2c3322', 20) + palm(330, 880, 170, 1.1, '#2c3322', -14))
        + finish(0.32);
    } });

  /* ---------- Damascus: the Old City domes and minarets at morning ---------- */
  asiaSceneAdd({ key: 'place:damascus', label: 'The Old City domes and minarets', site: 'The Old City from Mount Qasioun', colour: 'amber', mood: 'calm', season: 'any', tags: ['old city', 'domes', 'minarets', 'morning'],
    svg: () => {
      const s1 = U(), m1 = U(), f1 = U();
      let roofs = '';
      const r = rnd(33);
      for (let i = 0; i < 40; i++) { const x = -150 + i * 48, h = 40 + r() * 70, w = 38 + r() * 18, y = 700 - h * 0.4 + (i % 3) * 12; roofs += rc(x, y, w, h + 200, ['#d9b98d', '#cba679', '#e6cba0', '#b99468'][i % 4]); if (r() < 0.4) roofs += `<path fill="${['#b99468', '#a98a62'][i % 2]}" d="M${x + 8} ${y}A${R(w / 2 - 8)} 18 0 0 1 ${x + w - 8} ${y}z"/>`; if (r() < 0.5) roofs += lit(x + 8, y + 14, 8, 14); }
      const sq = (x, by, h) => `<path fill="#ecd9b6" d="M${x - 26} ${by}V${by - h}h52V${by}z"/><path fill="#000" opacity=".12" d="M${x} ${by}V${by - h}h26V${by}z"/>`
        + rc(x - 32, by - h * 0.45, 64, 7, '#bfa27a') + rc(x - 32, by - h, 64, 8, '#bfa27a') + `<path fill="#ecd9b6" d="M${x - 18} ${by - h}V${by - h - 70}h36V${by - h}z"/>` + rc(x - 24, by - h - 74, 48, 7, '#bfa27a')
        + `<path fill="#6f8c82" d="M${x - 16} ${by - h - 74}Q${x} ${by - h - 150} ${x + 16} ${by - h - 74}z"/>` + lit(x - 6, by - h * 0.7, 12, 26) + lit(x - 6, by - h * 0.25, 12, 26);
      return `<defs>${lin(s1, [[0, '#8db8da'], [0.5, '#d4d8d0'], [0.8, '#f7dcb2'], [1, '#fbe3b0']])}${lin(m1, [[0, '#d5ae8c'], [0.55, '#b98a6e'], [1, '#8f6a58']])}${radU(f1, [[0, '#fff0c0', 0.6], [1, '#fff0c0', 0]], 380, 300, 600)}</defs>`
        + full(`url(#${s1})`) + sun(380, 300, 40, '#fffbe8', '#ffe1a0', true) + `<rect width="1600" height="900" fill="url(#${f1})"/>` + streak(900, 160, 320, '#ffffff', 0.5) + cloud(1200, 260, 1.0, '#cdbfc0', 0.85, 60, 10) + cloud(300, 200, 0.7, '#d0c2c0', 0.8, 52, 30)
        // Mount Qasioun
        + mv('uspar', { ad: '52s', dx: '10px' }, `<path fill="url(#${m1})" d="M-160 500L100 400 300 430 520 360 760 410 960 340 1180 420 1400 370 1760 450V700H-160z"/><path fill="#fff" opacity=".18" d="M520 360L760 410 640 500z M960 340L1180 420 1060 520z"/><path fill="#7a5a4c" opacity=".25" d="M-160 560L200 520 500 560 800 520 1200 560 1760 520V700H-160z"/>`)
        + haze(500, 120, '#f6dcc0', 0.55) + mv('uspar', { ad: '36s', dx: '14px' }, `<g fill="#c9a77c">${city(41, -160, 1760, 700, 20, 60, 36, 64, '#c9a77c')}</g>`)
        // the great mosque: courtyard wall, domes, minarets
        + `<g><path fill="#e8d2a8" d="M470 740V600h660V740z"/><path fill="#000" opacity=".1" d="M800 740V600h330V740z"/>` + rc(470, 590, 660, 12, '#c9ae82')
        + Array.from({ length: 22 }, (_, i) => `<path fill="#9d8160" d="M${482 + i * 29} 690v-26a10 10 0 0 1 20 0v26z"/>`).join('') + `</g>`
        + `<path fill="#e8d2a8" d="M650 600V480h300V600z"/><path fill="#cdb48a" d="M650 480h300v14H650z"/>`
        + `<path fill="#e8d2a8" d="M730 480V430h140v50z"/>` + dome(800, 430, 80, 70, '#8aa8a0') + `<path fill="none" stroke="#fff" opacity=".25" stroke-width="3" d="M800 360V430M760 372L750 430M840 372L850 430"/>`
        + dome(690, 480, 34, 30, '#8aa8a0') + dome(910, 480, 34, 30, '#8aa8a0') + dome(560, 600, 40, 36, '#7e9c94') + dome(1040, 600, 40, 36, '#7e9c94')
        + sq(500, 600, 200) + sq(1100, 600, 190)
        
        + lit(720, 520, 12, 32) + lit(760, 520, 12, 32) + lit(826, 520, 12, 32) + lit(866, 520, 12, 32) + lit(788, 446, 24, 30)
        + `<g>${roofs}</g>` + haze(740, 80, '#f6dcc0', 0.45)
        + mv('usglide', { ad: '20s', dx: '600px', dy: '-60px' }, birds(61, 8, 800, 380, '#5a4a48', 0.9, 20))
        + birds(62, 6, 500, 300, '#5a4a48', 1.0, 700) + birds(63, 5, 1200, 360, '#5a4a48', 0.8, 640)
        + mv('uspuff', { ad: '6s' }, '') + puffs(1340, 760, 4, '#e8dccc', 20, 40, 5, -150, 2.4)
        + rc(-160, 780, 1920, 120, '#a98466') + `<path fill="#8f6c52" d="M-160 780H1760v14H-160z"/>`
        + mv('uspar', { ad: '30s', dx: '12px' }, `<path fill="#6c7f52" d="M-160 800Q100 770 360 800T900 790T1500 800 1760 790V900H-160z"/>` + palm(140, 870, 200, 1.3, '#3c4a30', 14) + palm(1460, 870, 230, 1.4, '#3c4a30', -16))
        + finish(0.3);
    } });

  /* ---------- Jerusalem: the Old City at sunrise ---------- */
  asiaSceneAdd({ key: 'place:jerusalem', label: 'The golden dome over the Old City at sunrise', site: 'The Old City at sunrise', colour: 'amber', mood: 'calm', season: 'any', tags: ['old city', 'golden dome', 'sunrise', 'stone'],
    svg: () => {
      const s1 = U(), d1 = U(), p1 = U(), f1 = U(), o1 = U();
      const cyp = (x, y, h) => `<path fill="#2f4630" d="M${x} ${y - h}C${x + 16} ${y - h * 0.6} ${x + 18} ${y - h * 0.2} ${x + 10} ${y}H${x - 10}C${x - 18} ${y - h * 0.2} ${x - 16} ${y - h * 0.6} ${x} ${y - h}z"/>`;
      let arc = '';
      for (let i = 0; i < 8; i++) arc += `<path fill="#4f6fa0" d="M${722 + i * 18} 640v-20a6 6 0 0 1 12 0v20z" opacity=".9"/>`;
      let blue = '';
      for (let i = 0; i < 9; i++) blue += `<path fill="#3b78a6" d="M${690 + i * 24} 596v-22a8 8 0 0 1 16 0v22z"/><path fill="#d8ede8" d="M${694 + i * 24} 596v-14a4 4 0 0 1 8 0v14z" opacity=".7"/>`;
      return `<defs>${lin(s1, [[0, '#6f86bc'], [0.35, '#d9a6b8'], [0.62, '#ffbf8e'], [1, '#ffe3a8']])}${linU(d1, [[0, '#ffe9a0'], [0.5, '#e8b848'], [1, '#b87a28']], 700, 380, 900, 560)}${lin(p1, [[0, '#d9c19a'], [1, '#a98e68']])}${radU(f1, [[0, '#ffe2a0', 0.8], [1, '#ffe2a0', 0]], 1180, 520, 620)}${lin(o1, [[0, '#d2b090'], [1, '#9a7a62']])}</defs>`
        + full(`url(#${s1})`) + stars(21, 26, 200) + rays(1180, 520, 1100, '#fff0c0', 0.14) + sun(1180, 520, 44, '#fffbe0', '#ffc77a', true) + `<rect width="1600" height="900" fill="url(#${f1})"/>`
        + streak(330, 170, 330, '#ffd6c0', 0.55) + streak(900, 120, 300, '#f0b8c0', 0.5, 70) + cloud(500, 300, 1.0, '#d89aa8', 0.8, 60, 5, '#ffd0b4') + cloud(1380, 250, 0.8, '#d49aa8', 0.8, 54, 25, '#ffd8b8')
        // Mount of Olives
        + mv('uspar', { ad: '48s', dx: '9px' }, `<path fill="url(#${o1})" d="M-160 560Q200 470 520 520T1100 510 1500 480 1760 530V720H-160z"/>` + city(51, -100, 1700, 590, 8, 28, 20, 40, '#c7a98a') + `<path fill="#6b7a4c" opacity=".7" d="M-160 600q80 -30 160 0t160 0 160 0 160 0 160 0 160 0 160 0 160 0 160 0 160 0 160 0 160 0z"/>`) + haze(540, 100, '#ffd8b0', 0.5)
        // distant domes and a bell tower
        + mv('uspar', { ad: '36s', dx: '12px' }, `<g fill="#cfb08a">${city(52, -160, 560, 700, 20, 110, 30, 60, '#cfb08a')}${city(53, 1080, 1760, 700, 20, 110, 30, 60, '#cfb08a')}</g>` + dome(330, 640, 46, 42, '#bfc4c0', '#a8a8a0') + rc(318, 640, 24, 60, '#cfb08a') + rc(1300, 560, 40, 140, '#d8bd96') + `<path fill="#a69072" d="M1296 560L1320 500 1344 560z"/>` + lit(1312, 590, 16, 26))
        // platform, walls, the dome on its octagon
        + `<path fill="url(#${p1})" d="M360 720V650Q800 628 1240 650V720z"/>` + rc(360, 640, 880, 14, '#e4cfa6')
        + `<path fill="#e8dcc0" d="M650 650V560L680 530H920L950 560V650z"/><path fill="#000" opacity=".12" d="M800 650V530H920L950 560V650z"/><path fill="#3b78a6" d="M650 596V560L680 530H920L950 560V596z"/>` + blue + `<path fill="#d8b868" d="M650 596h300v5H650z"/>${arc}`
        + `<path fill="#3b78a6" d="M728 532V452H872V532z"/><path fill="#000" opacity=".14" d="M800 532V452H872V532z"/>` + Array.from({ length: 8 }, (_, i) => `<rect x="${736 + i * 17}" y="470" width="7" height="22" rx="3" fill="#d8ede8" opacity=".75"/>`).join('') + rc(724, 446, 152, 8, '#d8b868')
        + `<path fill="url(#${d1})" d="M732 450C724 384 756 346 800 338C844 346 876 384 868 450z"/><path fill="#fff" opacity=".35" d="M754 446C746 394 764 362 790 346C772 372 768 410 774 446z"/><path fill="#000" opacity=".15" d="M800 338C844 346 876 384 868 450H826C846 396 834 354 800 338z"/>`
        + mv('usglow', { ad: '5s', to: '800px 390px' }, `<ellipse cx="780" cy="392" rx="12" ry="40" fill="#fff6c8" opacity=".5"/>`) + `<path d="M800 338V306" stroke="#e8b848" stroke-width="4"/><circle cx="800" cy="302" r="6" fill="#e8b848"/>`
        + `<path fill="#d9c49a" d="M520 640V600h60V640z"/>` + dome(550, 600, 26, 24, '#c0c4c4', '#a8a8a0') + `<path fill="#d9c49a" d="M1020 640V600h60V640z"/>` + dome(1050, 600, 26, 24, '#c0c4c4', '#a8a8a0')
        + `<g>${cyp(430, 650, 120)}${cyp(470, 652, 90)}${cyp(1170, 652, 100)}${cyp(1210, 650, 130)}${cyp(620, 650, 70)}${cyp(980, 650, 70)}</g>`
        + `<path fill="#e6d2a8" d="M-160 740V690H360V760H-160z M1240 700H1760V760H1240z"/><g fill="#d8c294">${Array.from({ length: 30 }, (_, i) => `<rect x="${-150 + i * 20}" y="680" width="12" height="12"/>`).join('')}</g>`
        + `<path fill="#d9bf92" d="M-160 720H1760V900H-160z"/><path fill="none" stroke="#b9996e" stroke-width="3" opacity=".6" d="M-160 750H1760M-160 780H1760M-160 818H1760M-160 860H1760"/><path fill="#c4a67c" d="M-160 790H1760V900H-160z" opacity=".7"/>` + win(-120, 730, 400, 40, 24, 40) + win(1280, 730, 400, 40, 24, 40)
        + dots('M-160 782H1760', '#ffe8b0', 4, 44, 'us-lamps')
        + mv('usglide', { ad: '24s', dx: '800px', dy: '-80px' }, birds(71, 8, 700, 400, '#5a4650', 1, 20)) + birds(72, 5, 1100, 330, '#5a4650', 1, 640)
        + mv('uspar', { ad: '28s', dx: '10px' }, cyp(120, 900, 330) + cyp(200, 900, 250) + cyp(1480, 900, 340) + cyp(1400, 900, 240))
        + finish(0.3);
    } });

  /* ---------- Tel Aviv: the three towers and the beach in the afternoon ---------- */
  asiaSceneAdd({ key: 'place:tel-aviv', label: 'The beach and the towers in the afternoon', site: 'The beach and the skyline', colour: 'teal', mood: 'cheerful', season: ['summer'], tags: ['beach', 'skyline', 'mediterranean', 'sailboats'],
    svg: () => {
      const s1 = U(), w1 = U(), b1 = U(), g1 = U();
      let um = '';
      for (let i = 0; i < 9; i++) { const x = 40 + i * 120 + (i % 2) * 40, y = 790 + (i % 3) * 36, c = ['#ef6a5a', '#fff', '#f4b64a', '#4aa6c8'][i % 4]; um += `<path d="M${x} ${y}V${y - 46}" stroke="#6b5a4a" stroke-width="3"/><path fill="${c}" d="M${x - 34} ${y - 44}Q${x} ${y - 82} ${x + 34} ${y - 44}z"/><path fill="#fff" opacity=".5" d="M${x - 8} ${y - 44}Q${x} ${y - 70} ${x + 8} ${y - 44}z"/>`; }
      let sail = '';
      for (const [x, y, s, d] of [[560, 700, 1, 60], [760, 690, 0.7, 80], [460, 676, 0.6, 100]]) sail += mv('usmove', { ad: d + 's', d: -x / 20 + 's', dx: '700px' }, `<g transform="translate(${x} ${y}) scale(${s})"><path fill="#fff" d="M0 -80L-38 -6H0z"/><path fill="#f3e6d2" d="M6 -64L38 -6H6z"/><path fill="#3a5a7a" d="M-48 2H50l-12 14H-34z"/></g>`);
      return `<defs>${lin(s1, [[0, '#4aa7d8'], [0.55, '#9fd7ea'], [1, '#e8f3e4']])}${lin(w1, [[0, '#9fe0e0'], [0.2, '#2ab0c0'], [1, '#106a90']])}${lin(b1, [[0, '#f2dcae'], [1, '#d9b980']])}${lin(g1, [[0, '#ffffff', 0.7], [1, '#ffffff', 0]])}</defs>`
        + full(`url(#${s1})`) + sun(300, 190, 50, '#fffdf0', '#fff0b0') + cloud(600, 130, 1.0, '#cfe3ee', 0.95, 66, 6) + cloud(1300, 140, 0.9, '#d6e6ee', 0.95, 56, 26) + cloud(120, 330, 0.7, '#d6e6ee', 0.9, 48, 40) + streak(900, 330, 280, '#fff', 0.5, 80)
        + mv('uspar', { ad: '44s', dx: '8px' }, city(91, -160, 1760, 560, 40, 120, 34, 66, '#b6cce0', 0.1)) + haze(470, 100, '#dff0f0', 0.55)
        + mv('uspar', { ad: '34s', dx: '12px' }, city(92, -160, 640, 570, 60, 220, 34, 62, '#9fb6cc', 0.35) + city(93, 1120, 1760, 570, 60, 200, 34, 62, '#9fb6cc', 0.35))
        // the three towers: round, triangular, square
        + `<path fill="#6f8aa8" d="M760 600V230h92V600z"/><path fill="#000" opacity=".14" d="M810 600V230h42V600z"/><path fill="#8da6c0" d="M760 230Q806 190 852 230z"/>` + win(768, 250, 76, 330, 10, 16, '#274660') + rc(758, 226, 96, 8, '#5a738f')
        + `<path fill="#7a96b4" d="M900 600V300L1000 600z"/><path fill="#5d7896" d="M1000 600L900 300 960 300z" opacity=".7"/>` + `<path fill="#000" opacity=".1" d="M960 300L1000 600H940z"/>` + win(910, 400, 40, 180, 12, 18, '#274660')
        + `<path fill="#7088a6" d="M1040 600V340h110V600z"/><path fill="#000" opacity=".12" d="M1100 600V340h50V600z"/>` + win(1048, 356, 94, 230, 14, 16, '#274660') + rc(1036, 334, 118, 8, '#566f8c')
        + lit(790, 300, 8, 14) + lit(826, 420, 8, 14)
        + mv('usflicker', { ad: '2s', to: '806px 196px' }, '<circle cx="806" cy="196" r="4" fill="#ff5a4a"/>')
        // the sea
        + `<rect y="590" width="1600" height="200" fill="url(#${w1})"/><rect y="590" width="1600" height="50" fill="url(#${g1})"/>` + shimmer(14, 30, -100, 1700, 600, 740, '#fff', 80) + shimmer(15, 20, 100, 1200, 640, 780, '#bdf0f0', 90) + sail
        + `<path fill="#fff" opacity=".8" d="M-160 770Q200 740 560 764T1280 760 1760 770V800H-160z"/>`
        + mv('usbob', { ad: '5s', dy: '4px' }, `<path fill="#fff" opacity=".7" d="M-160 780Q300 760 700 782T1500 776 1760 784V810H-160z"/>`)
        // beach, a promenade and palms
        + `<path fill="url(#${b1})" d="M-160 800Q400 770 900 800T1760 790V900H-160z"/><path fill="#c9a870" opacity=".5" d="M-160 860Q500 836 1000 864T1760 850V900H-160z"/>` + um
        + `<path fill="#ffffff" d="M1280 790H1760V812H1280z" opacity=".6"/>`
        + mv('uspar', { ad: '26s', dx: '10px' }, palm(1370, 880, 280, 1.5, '#2d5a3a', -26) + palm(1500, 890, 220, 1.2, '#34683f', 18) + palm(1200, 880, 160, 1.0, '#2d5a3a', 12))
        + birds(17, 6, 520, 300, '#35516a', 1, 620) + birds(18, 4, 1250, 220, '#35516a', 0.8, 500)
        + finish(0.28);
    } });

  /* ---------- Amman: the white hills and the Citadel columns ---------- */
  asiaSceneAdd({ key: 'place:amman', label: 'The white hills and the Citadel columns', site: 'The hills of Amman and the Citadel', colour: 'amber', mood: 'calm', season: 'any', tags: ['hills', 'citadel', 'columns', 'white city'],
    svg: () => {
      const s1 = U(), f1 = U(), h1 = U();
      /** A hillside of stacked flat-roofed houses: rows from the ridge down, in cream and sand. */
      const hill = (seed, y0, rows, tone) => {
        const r = rnd(seed); let o = '';
        for (let row = 0; row < rows; row++) for (let x = -170; x < 1760; x += 60 + r() * 30) {
          const w = 50 + r() * 24, h = 30 + r() * 30, y = y0 + row * 34 + (r() * 10), c = tone[Math.floor(r() * tone.length)];
          o += rc(R(x), R(y - h), R(w), R(h + 40), c) + '' + (r() < 0.55 ? lit(R(x + 6), R(y - h + 8), 8, 12) : '');
        }
        return o;
      };
      const cols = Array.from({ length: 6 }, (_, i) => { const x = 1120 + i * 42; return `<path fill="#e8d3a6" d="M${x} 470V320h22V470z"/><path fill="#000" opacity=".12" d="M${x + 11} 470V320h11V470z"/>` + rc(x - 4, 312, 30, 10, '#d9bd88') + rc(x - 4, 468, 30, 10, '#d9bd88'); }).join('');
      return `<defs>${lin(s1, [[0, '#a2c4e0'], [0.5, '#e9dcc4'], [1, '#f6d9a2']])}${radU(f1, [[0, '#ffe2a0', 0.7], [1, '#ffe2a0', 0]], 300, 380, 700)}${lin(h1, [[0, '#f4e2c0'], [1, '#c8a47a']])}</defs>`
        + full(`url(#${s1})`) + sun(300, 330, 44, '#fffbe6', '#ffd890', true) + `<rect width="1600" height="900" fill="url(#${f1})"/>` + streak(800, 180, 340, '#fff', 0.5) + cloud(980, 230, 1.0, '#d6c2b4', 0.85, 62, 8) + cloud(1480, 330, 0.8, '#d8c4b4', 0.8, 54, 28) + cloud(240, 190, 0.7, '#dccab8', 0.85, 50, 40)
        + mv('uspar', { ad: '50s', dx: '8px' }, `<path fill="#d8b48a" d="M-160 560L100 500 340 540 620 470 900 530 1200 450 1500 520 1760 480V760H-160z"/>` + hill(5, 570, 2, ['#e8d5b4', '#dcc29c', '#efe0c4'])) + haze(540, 90, '#fbe6c0', 0.5)
        // the Citadel hill and the Temple of Hercules
        + mv('uspar', { ad: '38s', dx: '12px' }, `<path fill="#c9a47a" d="M880 700C900 600 960 520 1060 490L1400 480C1480 520 1520 620 1560 700z"/><path fill="#000" opacity=".1" d="M1300 480C1400 480 1520 620 1560 700H1260z"/>` + rc(1090, 476, 260, 12, '#dcc08e') + cols + rc(1108, 304, 220, 12, '#d9bd88') + `<path fill="#e2c898" d="M1112 304L1218 270 1324 304z"/>` + dome(1000, 520, 24, 20, '#9fb0aa', '#8a9a94') + rc(980, 520, 40, 30, '#e2c898'))
        + `<path fill="#d4b48a" d="M-160 700Q400 640 900 700T1760 690V900H-160z"/>`
        + mv('uspar', { ad: '30s', dx: '14px' }, hill(8, 690, 3, ['#f3e6cc', '#e6d2ae', '#f8efdc', '#dcc298']) + `<path fill="#000" opacity=".06" d="M-160 780H1760V900H-160z"/>`)
        + minaret(640, 760, 250, 26, '#f4e8d0', '#9aa8b0') + dome(560, 780, 50, 40, '#8fb0b8', '#d9b25a') + rc(510, 780, 100, 60, '#eee0c4') + lit(526, 800, 10, 22) + lit(580, 800, 10, 22)
        + dots('M-160 830H1760', '#ffe3a8', 4, 36, 'us-lamps')
        + mv('usglide', { ad: '22s', dx: '900px', dy: '-60px' }, birds(31, 9, 700, 420, '#6a5a52', 0.9, 20)) + birds(32, 6, 1200, 300, '#6a5a52', 1, 640)
        + `<path fill="#9c6e4a" d="M-160 850Q300 830 800 856T1760 846V900H-160z"/>` + palm(1480, 880, 230, 1.3, '#41532f', -14) + palm(140, 886, 190, 1.1, '#41532f', 14)
        + mv('uspar', { ad: '22s', dx: '10px' }, canopy('#5c6e3c', 868, 18, 7, -160, 480, 900) + canopy('#566a38', 872, 16, 8, 1100, 1760, 900))
        + finish(0.3);
    } });

  /* ---------- Baghdad: the Tigris at blue hour, domes and round boats ---------- */
  asiaSceneAdd({ key: 'place:baghdad', label: 'The Tigris at dusk with golden domes', site: 'The Tigris at dusk', colour: 'teal', mood: 'dreamy', season: 'any', tags: ['river', 'golden domes', 'palms', 'dusk'],
    svg: () => {
      const s1 = U(), w1 = U(), f1 = U(), d1 = U();
      const tileMin = (x, by, h) => minaret(x, by, h, 30, '#3f86a6', '#d9b25a', '#10304a');
      let guffa = '';
      for (const [x, y, s, d, dl] of [[560, 800, 1.2, 70, 0], [900, 770, 0.9, 90, 30], [1180, 830, 1.4, 80, 10]]) guffa += mv('usbob', { ad: '4s', d: -dl / 10 + 's', dy: '3px' }, mv('usmove', { ad: d + 's', d: -dl + 's', dx: '260px' }, `<g transform="translate(${x} ${y}) scale(${s})"><path fill="#6a4a58" d="M-60 -6C-58 30 58 30 60 -6z"/><path fill="#8a6a70" d="M-60 -6h120l-6 -8H-54z"/><path d="M-10 -10V-46" stroke="#2a2038" stroke-width="3"/><path fill="#2a2038" d="M-24 -46h28l-6 -22z"/><rect class="us-lit" x="-20" y="-24" width="8" height="8"/></g>`));
      return `<defs>${lin(s1, [[0, '#1d2f5e'], [0.4, '#3d5f93'], [0.7, '#e69a78'], [1, '#ffd08a']])}${lin(w1, [[0, '#e0925e'], [0.15, '#325a86'], [1, '#12284c']])}${radU(f1, [[0, '#ffbc72', 0.65], [1, '#ffbc72', 0]], 1260, 600, 520)}${linU(d1, [[0, '#ffe9a0'], [0.5, '#e8b240'], [1, '#a8741c']], 700, 400, 900, 560)}</defs>`
        + full(`url(#${s1})`) + stars(41, 60, 300) + sun(1260, 600, 36, '#fff0c0', '#ff9c66', true) + `<rect width="1600" height="900" fill="url(#${f1})"/>`
        + `<circle cx="420" cy="170" r="30" fill="#f6f1de" opacity=".92"/><circle cx="432" cy="162" r="26" fill="#2c4678" opacity=".5"/>`
        + streak(620, 260, 340, '#f6b88e', 0.5) + streak(1200, 210, 280, '#e8a890', 0.5, 70) + cloud(300, 360, 1.0, '#8a82ae', 0.75, 62, 6, '#f5b898') + cloud(1450, 330, 0.8, '#8a82ae', 0.75, 56, 22, '#f5b898')
        + mv('uspar', { ad: '44s', dx: '8px' }, city(101, -160, 1760, 610, 24, 90, 28, 56, '#5d6a92', 0.3)) + haze(550, 90, '#ffbf98', 0.5)
        // the shrine: golden domes, tiled minarets
        + mv('uspar', { ad: '34s', dx: '10px' }, rc(560, 560, 480, 56, '#6a7aa0') + rc(560, 548, 480, 12, '#566488') + win(572, 574, 456, 30, 22, 16, '#ffd890') + rc(690, 470, 220, 90, '#6a7aa0')
          + `<path fill="url(#${d1})" d="M690 470C680 380 740 330 800 300C860 330 920 380 910 470z"/><path fill="#fff" opacity=".3" d="M720 466C712 396 748 350 790 320C752 360 744 410 750 466z"/><path fill="#000" opacity=".15" d="M800 300C860 330 920 380 910 470H850C870 400 840 340 800 300z"/><path d="M800 300V262" stroke="#e8b240" stroke-width="4"/><circle cx="800" cy="258" r="7" fill="#e8b240"/>`
          + `<path fill="url(#${d1})" d="M590 548C586 500 616 468 640 456C664 468 694 500 690 548z"/><path fill="url(#${d1})" d="M910 548C906 500 936 468 960 456C984 468 1014 500 1010 548z"/>`
          + tileMin(560, 560, 270) + tileMin(1040, 560, 270) + tileMin(740, 470, 130) + tileMin(860, 470, 130)
          + lit(646, 500, 10, 36) + lit(944, 500, 10, 36) + lit(780, 510, 12, 40) + lit(808, 510, 12, 40))
        // river
        + `<rect y="610" width="1600" height="290" fill="url(#${w1})"/>` + shimmer(21, 34, 600, 1500, 620, 760, '#ffd6a0', 70) + shimmer(22, 26, -100, 1700, 700, 880, '#9ec2e0', 90) + dots('M560 640H1040', '#ffd890', 4, 22, 'us-lamps', ' opacity=".6"') + guffa
        + `<path fill="#2a3048" d="M-160 780Q200 740 560 780T1000 800 1760 770V900H-160z"/><path fill="#3a4460" d="M-160 820Q300 800 700 830T1760 812V900H-160z" opacity=".7"/>`
        + mv('uspar', { ad: '24s', dx: '10px' }, palm(110, 860, 330, 1.6, '#151a2c', 24) + palm(250, 880, 250, 1.3, '#151a2c', -16) + palm(1380, 870, 330, 1.7, '#151a2c', -30) + palm(1520, 890, 240, 1.3, '#151a2c', 14) + palm(1250, 884, 170, 1.1, '#1b2136', 10))
        + dots('M-160 770Q200 730 560 770', '#ffd890', 5, 40, 'us-lamps') + birds(23, 6, 800, 330, '#27304f', 1, 620)
        + finish(0.36);
    } });

  /* ---------- Tehran: Milad Tower in front of the snowy Alborz at dawn ---------- */
  asiaSceneAdd({ key: 'place:tehran', label: 'Milad Tower and the snowy Alborz at dawn', site: 'Milad Tower and the Alborz mountains', colour: 'blue', mood: 'proud', season: 'any', tags: ['tower', 'mountains', 'snow', 'dawn'],
    svg: () => {
      const s1 = U(), m1 = U(), c1 = U(), f1 = U(), t1 = U();
      return `<defs>${lin(s1, [[0, '#33477e'], [0.35, '#8a86b8'], [0.62, '#f0a8a0'], [1, '#ffd9ae']])}${lin(m1, [[0, '#f4e0e4'], [0.18, '#a89cc4'], [1, '#5e5c8e']])}${lin(c1, [[0, '#6e6a9a'], [1, '#34385e']])}${radU(f1, [[0, '#ffd2a0', 0.7], [1, '#ffd2a0', 0]], 420, 520, 600)}${lin(t1, [[0, '#d9d4ce'], [1, '#8a8590']])}</defs>`
        + full(`url(#${s1})`) + stars(51, 40, 230) + sun(420, 520, 40, '#fff2d0', '#ffb88a', true) + `<rect width="1600" height="900" fill="url(#${f1})"/>`
        + streak(300, 150, 320, '#ffcec8', 0.5) + streak(1100, 200, 300, '#e8b0c0', 0.5, 70) + cloud(820, 300, 1.0, '#c88fae', 0.75, 62, 8, '#ffd0c0') + cloud(1420, 380, 0.8, '#c48cac', 0.75, 54, 24, '#ffd4c4')
        // the Alborz: far white peaks then nearer dark ones
        + mv('uspar', { ad: '56s', dx: '8px' }, `<path fill="url(#${m1})" d="M-160 560L60 430 180 480 340 330 440 400 560 300 640 390 800 360 960 250 1060 340 1180 290 1320 400 1480 340 1620 440 1760 400V700H-160z"/><path fill="#fff" opacity=".85" d="M340 330l-52 70 44-8 26 22 28-34 20 14z M560 300l-56 78 44-12 24 24 30-30 22 18z M960 250l-64 96 52-16 30 28 36-38 28 22z M1180 290l-46 70 40-10 22 20 24-30 18 14z"/><path fill="#5e5c8e" opacity=".3" d="M960 250l50 96-24 10-30-28z"/>`) + haze(480, 120, '#ffc8b0', 0.6)
        + mv('uspar', { ad: '40s', dx: '12px' }, `<path fill="url(#${c1})" d="M-160 600L100 540 300 580 520 530 760 590 1000 540 1300 590 1560 540 1760 580V740H-160z"/>` + city(61, -160, 1760, 700, 20, 90, 24, 50, '#5b5d8a', 0.3)) + haze(640, 90, '#e8b8b0', 0.45)
        // Milad Tower: shaft, the head pod and the antenna
        + `<path fill="url(#${t1})" d="M1000 770L1022 400H1058L1080 770z"/><path fill="#000" opacity=".15" d="M1042 770L1046 400H1058L1080 770z"/>` + rc(1018, 560, 44, 5, '#706a78') + rc(1014, 650, 52, 5, '#706a78')
        + `<path fill="#d9d4ce" d="M960 340L1000 270H1080L1120 340 1100 380H980z"/><path fill="#f2eee6" d="M968 330L1000 276H1040L1030 330z" opacity=".6"/><path fill="#000" opacity=".14" d="M1040 276H1080L1120 340 1100 380H1040z"/>`
        + `<path fill="#9aa0c0" d="M970 340H1110L1100 372H980z" opacity=".8"/>` + win(978, 346, 124, 18, 10, 9, '#3a4a70') + rc(1000, 262, 80, 10, '#b8b4b8') + rc(1010, 252, 60, 10, '#a8a4ac') + `<path fill="#d9d4ce" d="M1032 252H1048L1042 100H1038z"/>`
        + `<path d="M1040 100V40" stroke="#c8c4c8" stroke-width="3"/>` + mv('usflicker', { ad: '1.7s', to: '1040px 44px' }, '<circle cx="1040" cy="44" r="5" fill="#ff5a4a"/>') + mv('usflicker', { ad: '2.3s', d: '-1s', to: '1040px 252px' }, '<circle cx="1040" cy="252" r="4" fill="#ff8a5a"/>') + lit(1012, 290, 8, 10) + lit(1062, 290, 8, 10) + lit(1036, 320, 8, 10)
        // the city below
        + `<path fill="#4c4a74" d="M-160 740H1760V900H-160z"/>` + city(62, -160, 900, 760, 20, 110, 30, 60, '#43406a', 0.5) + city(63, 1150, 1760, 760, 20, 120, 30, 60, '#43406a', 0.5) + city(64, 900, 1150, 760, 14, 50, 26, 50, '#403c64', 0.4)
        + `<path fill="#3a3860" d="M-160 790H1760V900H-160z"/>` + dots('M-160 800H1760', '#ffd890', 5, 26, 'us-lamps') + dots('M-160 840H1760', '#ffb870', 5, 34, 'us-lamps') + dots('M200 830Q800 800 1500 836', '#ffe3a8', 5, 30, 'us-lamps')
        + mv('usmove', { ad: '30s', dx: '1900px' }, '<g transform="translate(800 866)"><rect x="-18" y="-8" width="38" height="12" rx="4" fill="#2a2850"/><rect class="us-lit" x="16" y="-4" width="6" height="4"/></g>')
        + canopy('#25243e', 884, 14, 5, -160, 800, 900) + canopy('#25243e', 886, 12, 6, 800, 1760, 900) + birds(53, 5, 620, 300, '#3a3060', 1, 600)
        + finish(0.33);
    } });

  /* ---------- Riyadh: the tower with the sky bridge in the desert haze ---------- */
  asiaSceneAdd({ key: 'place:riyadh', label: 'The tower with the sky bridge in the desert haze', site: 'The skyline across the Najd desert', colour: 'orange', mood: 'proud', season: 'any', tags: ['skyline', 'desert', 'tower', 'dust'],
    svg: () => {
      const s1 = U(), g1 = U(), t1 = U(), f1 = U(), d1 = U();
      let batt = '';
      for (let i = 0; i < 18; i++) batt += `<rect x="${346 + i * 24}" y="${i % 2 ? 600 : 596}" width="12" height="12"/>`;
      return `<defs>${lin(s1, [[0, '#d6a878'], [0.4, '#eec58c'], [0.75, '#f7dba0'], [1, '#fbe7b8']])}${lin(g1, [[0, '#d9a868'], [1, '#a8723e']])}${lin(t1, [[0, '#9fb6c4'], [0.5, '#6c88a0'], [1, '#3e5a76']])}${radU(f1, [[0, '#fff0c0', 0.85], [1, '#fff0c0', 0]], 1260, 300, 600)}${lin(d1, [[0, '#c98e54'], [1, '#8a5a34']])}</defs>`
        + full(`url(#${s1})`) + sun(1260, 300, 70, '#fff6d8', '#ffe0a0') + `<rect width="1600" height="900" fill="url(#${f1})"/>` + streak(400, 200, 380, '#f9e6bc', 0.5) + streak(900, 130, 340, '#f9e6bc', 0.45, 80) + cloud(200, 320, 0.9, '#d4b490', 0.6, 58, 12, '#f4d8a8') + cloud(1000, 400, 1.1, '#d4b490', 0.55, 66, 30, '#f4d8a8')
        + mv('uspar', { ad: '50s', dx: '8px' }, `<path fill="#c9945c" d="M-160 560L80 510 330 540 600 500 860 540 1160 500 1400 540 1760 510V700H-160z"/><path fill="#9a6a40" opacity=".35" d="M-160 580L300 560 700 590 1100 560 1760 590V700H-160z"/>`) + haze(480, 140, '#f4d8a8', 0.7)
        + mv('uspar', { ad: '38s', dx: '12px' }, city(71, -160, 1760, 650, 30, 130, 30, 60, '#a8a4a0', 0.3) + city(72, 300, 1000, 650, 30, 90, 30, 56, '#b5b0a8', 0.3)) + haze(560, 100, '#f0d4a0', 0.5)
        // the tower: slab with a parabolic opening and the sky bridge
        + `<path fill="url(#${t1})" d="M980 700V200Q980 150 1015 130L1075 100 1135 130Q1170 150 1170 200V700z"/>`
        + `<path fill="#f0cf94" d="M1026 372V250Q1026 196 1075 160Q1124 196 1124 250V372z"/><path fill="#fff" opacity=".18" d="M1026 372V250Q1026 196 1075 160Q1040 200 1040 250V372z"/><path fill="#000" opacity=".12" d="M1075 700V372h95V700z"/>`
        + `<path fill="#fff" opacity=".18" d="M984 700V210Q990 160 1015 140L1030 134V700z"/>` + win(992, 220, 28, 460, 10, 22, '#1e3652') + win(1130, 220, 30, 460, 10, 22, '#1e3652') + win(1030, 390, 90, 290, 16, 22, '#2a4560')
        + rc(1020, 366, 110, 12, '#3e5a76') + `<path d="M1075 100V50" stroke="#6c88a0" stroke-width="4"/>` + mv('usflicker', { ad: '1.8s', to: '1075px 52px' }, '<circle cx="1075" cy="52" r="5" fill="#ff5a4a"/>')
        + `<g>${rc(840, 560, 72, 140, '#a5b4bf')}<path fill="#c8b890" d="M840 560L876 500 912 560z"/>${win(848, 580, 56, 110, 12, 18, '#2d4560')}</g>` + `<g>${rc(1210, 520, 62, 180, '#9eb0bc')}<circle cx="1241" cy="504" r="26" fill="#c7d3d9"/>${win(1218, 540, 46, 150, 12, 18, '#2d4560')}</g>` + lit(1060, 280, 10, 14) + lit(1085, 280, 10, 14)
        // a mud-brick fort on the left
        + `<path fill="url(#${d1})" d="M320 740V610H760V740z"/><path fill="#e0b684" d="M320 610H760V622H320z"/><g fill="#d3a470">${batt}</g>` + `<path fill="url(#${d1})" d="M300 740V540h80V740z M700 740V560h80V740z"/><g fill="#e0b684"><rect x="294" y="528" width="92" height="14"/><rect x="694" y="548" width="92" height="14"/></g>`
        + `<path fill="#6a4026" d="M510 740V670a22 22 0 0 1 44 0v70z"/>` + lit(336, 580, 8, 18) + lit(730, 590, 8, 18) + lit(420, 650, 10, 20) + lit(650, 650, 10, 20)
        + `<path fill="url(#${g1})" d="M-160 740Q300 720 800 746T1760 730V900H-160z"/><path fill="#8f5e34" opacity=".45" d="M-160 800Q400 770 900 810T1760 790V900H-160z"/>`
        + `<path fill="#6a5a46" d="M-160 800H1760V830H-160z" opacity=".5"/>` + dots('M-160 815H1760', '#ffe3a8', 5, 44, 'us-lamps')
        + mv('usmove', { ad: '24s', dx: '1900px' }, '<g transform="translate(800 790)"><rect x="-26" y="-12" width="52" height="14" rx="4" fill="#e8e0d0"/><rect x="-10" y="-22" width="26" height="12" rx="3" fill="#f6efe0"/><rect class="us-lit" x="22" y="-8" width="6" height="4"/></g>')
        + mv('uspar', { ad: '26s', dx: '10px' }, palm(110, 880, 260, 1.4, '#3b4a28', 18) + palm(260, 890, 190, 1.2, '#3b4a28', -14) + palm(1450, 880, 270, 1.5, '#3b4a28', -20) + palm(1560, 890, 190, 1.1, '#445530', 12))
        + mv('usdrift', { ad: '30s', dx: '120px' }, `<ellipse cx="800" cy="760" rx="520" ry="24" fill="#f4d8a8" opacity=".35"/>`) + birds(73, 5, 700, 330, '#6a4a30', 1, 600)
        + finish(0.3);
    } });

  /* ---------- Jeddah: the floating mosque and the great fountain at night ---------- */
  asiaSceneAdd({ key: 'place:jeddah', label: 'The floating mosque and the fountain at night', site: 'The Corniche on the Red Sea', colour: 'indigo', mood: 'dreamy', season: 'any', tags: ['red sea', 'mosque', 'fountain', 'night'],
    svg: () => {
      const s1 = U(), w1 = U(), f1 = U(), j1 = U(), m1 = U();
      let jet = '';
      for (let i = 0; i < 7; i++) { const dx = (i - 3) * 22; jet += mv('uspuff', { ad: (3.2 + i * 0.2) + 's', d: -(i * 0.45) + 's', dx: dx + 'px', dy: '-60px', sc: '2.2' }, `<circle cx="470" cy="${300 + i * 4}" r="${14 - i % 3 * 2}" fill="#e6f2ff" opacity=".7"/>`); }
      let wl = '';
      for (let i = 0; i < 10; i++) wl += `<rect class="x-usshim" style="--ad:${(2 + i % 3).toFixed(1)}s;--d:-${i * 0.4}s" x="${400 + i * 8}" y="${760 + i * 9}" width="${60 - i * 3}" height="3" rx="2" fill="#bfe0ff"/>`;
      return `<defs>${lin(s1, [[0, '#0d1b46'], [0.45, '#1f3a78'], [0.78, '#4d6fa8'], [1, '#e0a690']])}${lin(w1, [[0, '#a48ca4'], [0.12, '#2a4a86'], [1, '#0d1f4a']])}${radU(f1, [[0, '#ffbe90', 0.5], [1, '#ffbe90', 0]], 1300, 600, 520)}${lin(j1, [[0, '#f6f8ff', 0.95], [1, '#cfe0ff', 0.5]])}${lin(m1, [[0, '#f8f6ee'], [1, '#c4c0c4']])}</defs>`
        + full(`url(#${s1})`) + stars(81, 90, 420) + `<rect width="1600" height="900" fill="url(#${f1})"/><circle cx="1180" cy="190" r="36" fill="#f8f3de"/><circle cx="1196" cy="180" r="30" fill="#1f3a78" opacity=".45"/>`
        + streak(300, 250, 320, '#8aa4d4', 0.35) + streak(1000, 330, 260, '#b8a4c4', 0.4, 70) + cloud(700, 380, 0.9, '#5a6ea0', 0.65, 64, 6, '#9aaad0') + cloud(1400, 340, 0.7, '#5a6ea0', 0.65, 56, 24, '#9aaad0')
        + mv('uspar', { ad: '46s', dx: '8px' }, city(111, -160, 1760, 640, 20, 110, 26, 52, '#2c3e72', 0.12)) + dots('M-160 640H1760', '#ffd890', 4, 22, 'us-lamps', ' opacity=".7"')
        // the fountain: a tall jet
        + `<path fill="url(#${j1})" d="M460 640L466 240 470 140 474 240 480 640z"/><path fill="url(#${j1})" opacity=".8" d="M452 640C456 500 462 340 470 150C478 340 484 500 488 640z"/>` + `<path fill="#e6f2ff" opacity=".5" d="M430 650Q470 540 510 650z"/>` + jet
        + mv('usglow', { ad: '4s', to: '470px 200px' }, `<ellipse cx="470" cy="260" rx="40" ry="140" fill="#cfe4ff" opacity=".25"/>`)
        + `<rect y="640" width="1600" height="260" fill="url(#${w1})"/>` + dots('M-160 650H1760', '#ffd890', 4, 18, 'us-lamps', ' opacity=".5"') + shimmer(82, 28, 700, 1700, 650, 770, '#cfe0ff', 70) + shimmer(83, 24, -100, 700, 690, 880, '#9ec0f0', 90)
        // the floating mosque on its pier
        + `<path fill="#c4c0c4" d="M820 760H1280V780H820z"/>` + rc(830, 700, 440, 62, 'url(#' + m1 + ')') + rc(826, 690, 448, 14, '#e8e2d4')
        + Array.from({ length: 12 }, (_, i) => `<path fill="#6a82a8" d="M${846 + i * 36} 758v-34a9 9 0 0 1 18 0v34z" opacity=".85"/>`).join('') + Array.from({ length: 12 }, (_, i) => lit(850 + i * 36, 730, 10, 28)).join('')
        + dome(1050, 690, 80, 62, '#f2eee4', '#d9b25a') + dome(930, 700, 36, 28, '#e8e4d8', '#d9b25a') + dome(1170, 700, 36, 28, '#e8e4d8', '#d9b25a')
        + minaret(850, 700, 220, 28, '#f4efe4', '#d9c9a0', '#335') + minaret(1250, 700, 220, 28, '#f4efe4', '#d9c9a0', '#335') + lit(1040, 640, 10, 28) + lit(1000, 650, 8, 20) + lit(1090, 650, 8, 20)
        + `<g opacity=".4"><path fill="#cfc8ba" d="M1010 790h80l-6 70h-68z"/></g>` + mv('usbob', { ad: '4s', dy: '2px' }, `<path fill="#fff" opacity=".18" d="M820 782H1280V810H820z"/>`)
        + mv('usmove', { ad: '70s', dx: '1900px' }, '<g transform="translate(500 836)"><path fill="#10224a" d="M-70 0l14 -18h96l16 12 22 6z"/><rect class="us-lit" x="-30" y="-14" width="8" height="8"/><rect class="us-lit" x="-14" y="-14" width="8" height="8"/></g>')
        + `<path fill="#182a52" d="M-160 860H1760V900H-160z"/>` + dots('M-160 860H1760', '#ffe3a8', 5, 36, 'us-lamps')
        + mv('uspar', { ad: '26s', dx: '10px' }, palm(80, 880, 240, 1.3, '#0b1330', 16) + palm(1520, 884, 260, 1.4, '#0b1330', -18))
        + birds(84, 4, 700, 300, '#d8e0f8', 0.9, 560)
        + finish(0.3);
    } });

  /* ---------- Muscat: Mutrah harbour with dhows, the watchtower and the blue dome ---------- */
  asiaSceneAdd({ key: 'place:muscat', label: 'Mutrah harbour, the watchtower and the dhows', site: 'The Mutrah corniche and harbour', colour: 'teal', mood: 'calm', season: 'any', tags: ['harbour', 'dhows', 'watchtower', 'mountains'],
    svg: () => {
      const s1 = U(), w1 = U(), m1 = U(), f1 = U();
      const dhow = (x, y, s, d, dl, col) => mv('usbob', { ad: (3 + d % 3) + 's', d: -dl / 10 + 's', dy: '3px' }, `<g transform="translate(${x} ${y}) scale(${s})"><path fill="${col}" d="M-110 -26L-90 4H80L120 -32 106 -34 70 -10H-84z"/><path fill="#e8d4a8" d="M-90 4H80L70 18H-80z"/><path d="M-10 -30V-130" stroke="#6a4a30" stroke-width="5"/><path fill="#f6efe0" d="M-6 -126L90 -34H-6z"/><path d="M-30 -34L-96 -26" stroke="#6a4a30" stroke-width="3"/><rect x="40" y="-24" width="28" height="22" fill="#8a5a38"/></g>`);
      const house = (x, w, h, c) => rc(x, 650 - h, w, h, c) + rc(x - 3, 650 - h - 6, w + 6, 8, '#fff') + win(x + 6, 650 - h + 12, w - 12, h - 24, 14, 22) + Array.from({ length: Math.floor((w - 8) / 12) }, (_, i) => `<path fill="#7a8a90" d="M${x + 6 + i * 12} ${650 - h + h - 8}v-12a4 4 0 0 1 8 0v12z" opacity=".6"/>`).join('');
      return `<defs>${lin(s1, [[0, '#6fb2dc'], [0.55, '#b9dcec'], [1, '#f5e4c4']])}${lin(w1, [[0, '#9fd8d8'], [0.2, '#2aa0b0'], [1, '#0c5a78']])}${lin(m1, [[0, '#b58a62'], [0.5, '#8a6048'], [1, '#5a3e36']])}${radU(f1, [[0, '#fff0c0', 0.6], [1, '#fff0c0', 0]], 300, 200, 500)}</defs>`
        + full(`url(#${s1})`) + sun(300, 190, 44, '#fffdf0', '#fff2b8') + `<rect width="1600" height="900" fill="url(#${f1})"/>` + cloud(780, 170, 0.9, '#d0e2ea', 0.9, 64, 6) + cloud(1380, 250, 0.8, '#d4e4ea', 0.85, 56, 28) + streak(500, 300, 300, '#fff', 0.4, 80)
        // the rocky Hajar mountains
        + mv('uspar', { ad: '52s', dx: '9px' }, `<path fill="#a98368" d="M-160 520L60 400 220 470 400 340 520 420 700 360 880 450 1080 380 1300 470 1500 390 1760 480V700H-160z"/><path fill="#6a4a3e" opacity=".35" d="M400 340l120 80-60 110-140-60z M1080 380l220 90-120 130-160-80z"/>`) + haze(480, 110, '#e8d4b8', 0.5)
        + `<path fill="url(#${m1})" d="M-160 640L60 520 200 560 360 450 560 520 700 480 880 560 1000 640V700H-160z"/><path fill="#000" opacity=".18" d="M360 450L560 520 700 480 880 560 1000 640H700z"/><path fill="#d6b48a" opacity=".28" d="M60 520L200 560 360 450 280 500z"/>`
        // the watchtower on the hill
        + `<path fill="#e6d3ac" d="M262 520V440h60V520z"/><path fill="#cdb78d" d="M258 440h68v10h-68z"/>` + `<g fill="#cdb78d">${Array.from({ length: 5 }, (_, i) => `<rect x="${260 + i * 13}" y="428" width="9" height="13"/>`).join('')}</g>` + `<path fill="#000" opacity=".13" d="M292 520V440h30V520z"/>` + lit(284, 470, 8, 20)
        + `<path fill="#e6d3ac" d="M130 560V500h40V560z"/><path fill="#cdb78d" d="M126 500h48v8h-48z"/>` + lit(144, 520, 8, 16)
        // the corniche: white houses and a mosque with a blue dome
        + mv('uspar', { ad: '34s', dx: '8px' }, house(560, 70, 120, '#f4ecdc') + house(640, 90, 90, '#eadfc6') + house(740, 64, 140, '#f6efe2') + house(814, 80, 100, '#ecdfc8') + house(1110, 76, 110, '#f6efe2') + house(1196, 90, 150, '#efe4cc') + house(1296, 70, 100, '#f6efe2') + house(1376, 90, 130, '#ecdfc8') + house(1476, 100, 110, '#f4ecdc') + house(1580, 90, 140, '#efe4cc'))
        + rc(900, 520, 180, 130, '#f6efe0') + rc(896, 512, 188, 12, '#e4d4b4') + dome(990, 512, 64, 56, '#2f7fb0', '#e8c868') + `<path fill="#fff" opacity=".15" d="M938 512A52 56 0 0 1 986 460C960 480 950 500 954 512z"/>` + minaret(1080, 650, 240, 26, '#f6efe0', '#2f7fb0', '#6a5a46')
        + Array.from({ length: 6 }, (_, i) => `<path fill="#7a8a90" d="M${914 + i * 28} 650v-48a9 9 0 0 1 18 0v48z" opacity=".7"/>`).join('') + lit(920, 560, 10, 18) + lit(976, 560, 10, 18) + lit(1032, 560, 10, 18)
        + `<rect x="540" y="650" width="1160" height="22" fill="#d9c9a4"/><path fill="#b8a784" d="M540 662H1700v10H540z"/>` + dots('M540 654H1700', '#ffe3a8', 5, 40, 'us-lamps') + Array.from({ length: 5 }, (_, i) => lamp(600 + i * 250, 662, 0.7, '#5a4a38')).join('')
        // the harbour
        + `<rect y="672" width="1600" height="228" fill="url(#${w1})"/>` + shimmer(91, 30, -100, 1700, 690, 800, '#fff', 80) + shimmer(92, 24, 200, 1300, 740, 880, '#bdf0f0', 90)
        + dhow(380, 780, 1.0, 1, 0, '#6a4a30') + dhow(960, 750, 0.7, 2, 20, '#7a5636') + dhow(1380, 800, 1.1, 3, 40, '#5e4430')
        + mv('usmove', { ad: '60s', dx: '900px' }, '<g transform="translate(700 724) scale(.7)"><path fill="#fff" d="M-60 0H60l-12 20h-36z"/><rect x="-6" y="-26" width="22" height="26" fill="#e8e0d0"/></g>')
        + mv('uspar', { ad: '22s', dx: '10px' }, `<path fill="#8a6a48" d="M-160 860Q200 826 540 850T1100 860 1760 846V900H-160z"/>` + palm(100, 880, 200, 1.3, '#38502c', 14) + palm(1520, 890, 230, 1.4, '#38502c', -16) + palm(240, 892, 150, 1.0, '#38502c', -10))
        + birds(93, 7, 820, 300, '#4a5a6a', 1, 600)
        + finish(0.28);
    } });
})();
