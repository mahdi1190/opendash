/* ============================================================
   ASIA FULL-SCREEN SCENES, batch 11 (Myanmar, Cambodia, Laos, Brunei, Timor-Leste; Jakarta, Surabaya,
   Kuala Lumpur, Singapore, Bangkok, Ho Chi Minh City).
   PURE classic script: registers entries with asiaSceneAdd() (71-anim-asia.js). Each svg() returns the inside of a
   1600 x 900 drawing (sliced to fill any screen), layered: sky and light, far / mid / near layers that drift at
   different speeds, the landmark, foreground and ambient life. Colours are painted for daytime; the dark theme or
   tod-dusk / tod-night lays the evening grade over them (us-tint) and lights us-lit windows and us-lamps strings.
   Motion is transform and opacity only. Rendered size stays under 32 KB per scene.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish } = K;

  /** A mirrored copy of a drawing about the horizontal line y = b (a reflection in still water). */
  const reflect = (b, inner, op) => `<g transform="translate(0 ${2 * b}) scale(1 -1)" opacity="${op}">${inner}</g>`;
  /** A palm: curved trunk and a crown of drooping leaves, swaying at the foot. */
  const palm = (x, y, h, col, lean, s, dur) => {
    const tx = x + lean, ty = y - h; let f = '';
    for (const a of [-172, -146, -118, -90, -62, -34, -8, 18, 160]) {
      const rd = a * Math.PI / 180, L = (70 + (a % 3) * 8) * s, ex = tx + Math.cos(rd) * L, ey = ty + Math.sin(rd) * L * 0.55 + 34 * s, cx = tx + Math.cos(rd) * L * 0.5, cy = ty + Math.sin(rd) * L * 0.5 - 12 * s;
      f += `M${tx} ${ty}Q${R(cx)} ${R(cy - 8 * s)} ${R(ex)} ${R(ey)}Q${R(cx)} ${R(cy + 10 * s)} ${tx} ${ty}z`;
    }
    return mv('ussway2', { ad: (dur || 6) + 's', d: -R(x % 5) + 's', to: `${x}px ${y}px` }, `<path d="M${x - 6 * s} ${y}Q${x + lean * 0.2} ${y - h * 0.5} ${tx - 3 * s} ${ty}h${6 * s}Q${x + lean * 0.3 + 8 * s} ${y - h * 0.5} ${x + 6 * s} ${y}z" fill="${col}"/><path fill="${col}" d="${f}"/>`);
  };
  /** A window grid (glass by day, lit at dusk). */
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
      if (r() < 0.3) o += `<rect x="${R(x + bw * 0.3)}" y="${R(base - bh - 14 - r() * 14)}" width="${R(bw * 0.4)}" height="${R(22)}"/>`;
      if (wc && r() < wc && bw > 22) w += win(R(x + 6), R(base - bh + 12), R(bw - 12), R(bh - 24), 12, 22);
      x += bw + r() * 4;
    }
    return `<g fill="${fill}">${o}</g>${w}`;
  };
  /** A hot-air balloon: envelope with a centre stripe, basket, ropes and a flickering burner. */
  const balloon = (x, y, s, c1, c2) => mv('usbob', { ad: R(5 + s * 3) + 's', d: -R(x % 4) + 's', dy: R(10 * s) + 'px' },
    `<path fill="${c1}" d="M${R(x - 12 * s)} ${y}C${R(x - 60 * s)} ${R(y - 30 * s)} ${R(x - 56 * s)} ${R(y - 110 * s)} ${x} ${R(y - 116 * s)}C${R(x + 56 * s)} ${R(y - 110 * s)} ${R(x + 60 * s)} ${R(y - 30 * s)} ${R(x + 12 * s)} ${y}z"/>`
    + `<path fill="${c2}" d="M${x} ${R(y - 116 * s)}C${R(x - 26 * s)} ${R(y - 90 * s)} ${R(x - 22 * s)} ${R(y - 30 * s)} ${R(x - 8 * s)} ${y}h${R(16 * s)}C${R(x + 22 * s)} ${R(y - 30 * s)} ${R(x + 26 * s)} ${R(y - 90 * s)} ${x} ${R(y - 116 * s)}z"/>`
    + `<path d="M${R(x - 10 * s)} ${y}L${R(x - 7 * s)} ${R(y + 14 * s)}M${R(x + 10 * s)} ${y}L${R(x + 7 * s)} ${R(y + 14 * s)}" stroke="#4a3550" stroke-width="${Math.max(1, R(s))}"/><rect x="${R(x - 9 * s)}" y="${R(y + 14 * s)}" width="${R(18 * s)}" height="${R(12 * s)}" fill="#6b4a3a"/>`
    + mv('usflicker', { ad: '.3s', to: `${x}px ${y}px` }, `<ellipse cx="${x}" cy="${R(y + 3 * s)}" rx="${R(4 * s)}" ry="${R(7 * s)}" fill="#ffc45a"/>`));
  /** A tall ringed stupa (bell, terraces, rings, spire), x centre, b ground. */
  const stupa = (x, b, s, col, gold) => {
    let rings = '';
    for (let i = 0; i < 6; i++) rings += `<ellipse cx="${x}" cy="${R(b - (176 + i * 9) * s)}" rx="${R((15 - i * 1.6) * s)}" ry="${R(3 * s)}"/>`;
    return `<g fill="${col}"><rect x="${R(x - 64 * s)}" y="${R(b - 28 * s)}" width="${R(128 * s)}" height="${R(28 * s)}"/><rect x="${R(x - 50 * s)}" y="${R(b - 54 * s)}" width="${R(100 * s)}" height="${R(26 * s)}"/><rect x="${R(x - 38 * s)}" y="${R(b - 76 * s)}" width="${R(76 * s)}" height="${R(22 * s)}"/>`
      + `<path d="M${R(x - 30 * s)} ${R(b - 76 * s)}C${R(x - 40 * s)} ${R(b - 120 * s)} ${R(x - 16 * s)} ${R(b - 146 * s)} ${R(x - 14 * s)} ${R(b - 176 * s)}H${R(x + 14 * s)}C${R(x + 16 * s)} ${R(b - 146 * s)} ${R(x + 40 * s)} ${R(b - 120 * s)} ${R(x + 30 * s)} ${R(b - 76 * s)}z"/>${rings}`
      + `<path d="M${R(x - 3 * s)} ${R(b - 232 * s)}h${R(6 * s)}V${R(b - 190 * s)}h${R(-6 * s)}z"/></g><path d="M${x} ${R(b - 232 * s)}V${R(b - 262 * s)}" stroke="${gold || col}" stroke-width="${Math.max(2, R(3 * s))}"/>`;
  };
  /** Steady slow glints on the water. */
  const glints = (seed, n, x0, x1, y0, y1, col, w) => shimmer(seed, n, x0, x1, y0, y1, col, w);

  /* ---------- Myanmar: Bagan at dawn, balloons over the temples ---------- */
  asiaSceneAdd({ key: 'country:MM', label: 'Bagan temples and balloons at dawn', site: 'Bagan at sunrise', colour: 'amber', mood: 'dreamy', season: 'any', tags: ['temples', 'balloons', 'dawn', 'plain'],
    svg: () => {
      const s1 = U(), g1 = U(), m1 = U();
      const temple = (x, b, s, col, hi) => `<g fill="${col}"><rect x="${R(x - 100 * s)}" y="${R(b - 40 * s)}" width="${R(200 * s)}" height="${R(40 * s)}"/><rect x="${R(x - 78 * s)}" y="${R(b - 76 * s)}" width="${R(156 * s)}" height="${R(36 * s)}"/><rect x="${R(x - 54 * s)}" y="${R(b - 108 * s)}" width="${R(108 * s)}" height="${R(32 * s)}"/>`
        + `<path d="M${R(x - 38 * s)} ${R(b - 108 * s)}L${R(x - 28 * s)} ${R(b - 150 * s)}L${R(x - 18 * s)} ${R(b - 190 * s)}L${R(x - 8 * s)} ${R(b - 232 * s)}L${x} ${R(b - 262 * s)}L${R(x + 8 * s)} ${R(b - 232 * s)}L${R(x + 18 * s)} ${R(b - 190 * s)}L${R(x + 28 * s)} ${R(b - 150 * s)}L${R(x + 38 * s)} ${R(b - 108 * s)}z"/></g>`
        + `<path d="M${x} ${R(b - 262 * s)}l${R(8 * s)} ${R(30 * s)}l${R(10 * s)} ${R(42 * s)}l${R(10 * s)} ${R(40 * s)}l${R(10 * s)} ${R(38 * s)}H${R(x + 38 * s)}l${R(-10 * s)} ${R(-34 * s)}z" fill="${hi}" opacity=".5"/>`;
      return `<defs>${lin(s1, [[0, '#4f5a9c'], [0.3, '#b383b4'], [0.58, '#ff9f78'], [0.82, '#ffd08a'], [1, '#ffe8b4']])}${lin(g1, [[0, '#7a5a5a'], [1, '#3a2a3a']])}</defs>`
        + full(`url(#${s1})`) + stars(3, 24, 200) + rays(900, 520, 1000, '#ffe3a8', 0.12) + sun(900, 520, 62, '#fff4d0', '#ffb070')
        + streak(300, 150, 320, '#ffb8b8', 0.45) + streak(1350, 260, 280, '#ff9a8a', 0.5, 70) + cloud(460, 330, 1.2, '#d587a8', 0.8, 62, 4, '#ffc0a8') + cloud(1280, 380, 0.9, '#d58ba8', 0.8, 54, 26, '#ffd0b0')
        + mv('uspar', { ad: '60s', dx: '14px' }, ridge('#a58ab8', 560, 36, 9, 4, 700) + ridge('#8e78a8', 596, 20, 12, 8, 700))
        + haze(520, 130, '#ffd9ac', 0.7)
        // far plain with temples in haze
        + mv('uspar', { ad: '46s', dx: '10px' }, `${canopy('#8a76a2', 626, 14, 7, -160, 1760, 650)}` + temple(300, 640, 0.34, '#8f7aa6', '#b095bb') + temple(1180, 640, 0.3, '#8f7aa6', '#b095bb') + stupa(520, 640, 0.4, '#8c78a4') + stupa(760, 640, 0.32, '#8c78a4') + stupa(1400, 640, 0.42, '#8c78a4') + temple(60, 640, 0.4, '#8c78a4', '#b095bb'))
        + `<rect y="610" width="1600" height="290" fill="#8a6b86"/>` + haze(600, 110, '#ffcfa0', 0.75)
        + mv('uspar', { ad: '38s', dx: '16px' }, canopy('#6f5679', 676, 18, 9, -160, 1760, 700) + temple(880, 690, 0.62, '#6d557b', '#9a79a0') + stupa(260, 690, 0.7, '#6a527a') + stupa(1260, 690, 0.58, '#6a527a') + stupa(1540, 690, 0.5, '#6d557b'))
        // balloons
        + balloon(1000, 350, 1.1, '#e0534a', '#ffd25a') + balloon(640, 280, 1.5, '#ffb04a', '#c8423e') + balloon(1260, 250, 0.8, '#4a8ad0', '#ffe39a') + balloon(430, 420, 0.7, '#e2688a', '#ffe6b8') + balloon(820, 190, 0.6, '#5fb08a', '#ffd68a') + balloon(1450, 380, 0.9, '#c8493e', '#ffcf6a')
        + mv('usdrift', { ad: '50s', dx: '120px' }, '<ellipse cx="600" cy="650" rx="420" ry="16" fill="#ffd9b0" opacity=".42"/><ellipse cx="1240" cy="690" rx="380" ry="14" fill="#ffe0bc" opacity=".4"/>')
        + birds(7, 6, 780, 330, '#5a3c5a', 1, 700)
        // near ground, dry scrub, palms and a close stupa
        + `<path fill="url(#${g1})" d="M-160 900V760C200 724 520 770 860 748S1400 736 1760 764V900z"/>` + canopy('#2f2132', 770, 22, 12, -160, 1760, 900)
        + stupa(1330, 800, 1.35, '#3a2a40', '#4a3550') + `<path d="M1230 806h200" stroke="#5a4258" stroke-width="3" opacity=".6"/>`
        + palm(210, 840, 380, '#2c1f30', 24, 1.6, 6) + palm(130, 860, 300, '#2c1f30', -30, 1.3, 7) + palm(1520, 860, 340, '#2c1f30', -20, 1.5, 5) + palm(620, 800, 250, '#34263a', 10, 1.0, 8)
        + lit(1316, 744, 10, 16) + finish(0.34);
    } });

  /* ---------- Cambodia: Angkor Wat at sunrise over the lotus pond ---------- */
  asiaSceneAdd({ key: 'country:KH', label: 'Angkor Wat at sunrise', site: 'Angkor Wat at sunrise', colour: 'orange', mood: 'proud', season: 'any', tags: ['temple', 'sunrise', 'lotus pond', 'angkor'],
    svg: () => {
      const s1 = U(), w1 = U();
      const B = 640, stone = '#6a4a4a', stoneHi = '#8f6a5e';
      const tower = (x, h, w) => {
        let led = '';
        for (const t of [0.22, 0.36, 0.5, 0.62, 0.73, 0.83]) { const hw = w * (1 - t * 0.78); led += `M${R(x - hw)} ${R(B - 80 - h * t)}H${R(x + hw)}`; }
        return `<path fill="${stone}" d="M${R(x - w)} ${B - 70}V${R(B - 70 - h * 0.22)}Q${R(x - w)} ${R(B - 70 - h * 0.55)} ${R(x - w * 0.5)} ${R(B - 70 - h * 0.7)}Q${R(x - w * 0.22)} ${R(B - 70 - h * 0.86)} ${x} ${R(B - 70 - h)}Q${R(x + w * 0.22)} ${R(B - 70 - h * 0.86)} ${R(x + w * 0.5)} ${R(B - 70 - h * 0.7)}Q${R(x + w)} ${R(B - 70 - h * 0.55)} ${R(x + w)} ${R(B - 70 - h * 0.22)}V${B - 70}z"/>`
          + `<path fill="${stoneHi}" d="M${x} ${R(B - 70 - h)}Q${R(x + w * 0.22)} ${R(B - 70 - h * 0.86)} ${R(x + w * 0.5)} ${R(B - 70 - h * 0.7)}Q${R(x + w)} ${R(B - 70 - h * 0.55)} ${R(x + w)} ${R(B - 70 - h * 0.22)}V${B - 70}H${x}z" opacity=".35"/><path d="${led}" stroke="#2f2230" stroke-width="3" opacity=".7" fill="none"/>`
          + `<path d="M${x} ${R(B - 70 - h)}V${R(B - 70 - h - 26)}" stroke="${stone}" stroke-width="4"/>`;
      };
      let pil = '', arch = '';
      for (let x = 450; x < 1160; x += 22) pil += `M${x} ${B - 70}V${B - 14}`;
      const wat = () => `<g fill="${stone}"><rect x="420" y="${B - 70}" width="760" height="70"/><rect x="520" y="${B - 112}" width="560" height="44"/><rect x="620" y="${B - 150}" width="360" height="40"/></g>`
        + `<path d="${pil}" stroke="#3a2a36" stroke-width="5" fill="none"/>` + `<g fill="${stone}"><rect x="402" y="${B - 36}" width="796" height="12"/></g>`
        + tower(800, 330, 50) + tower(655, 200, 36) + tower(945, 200, 36) + tower(560, 150, 30) + tower(1040, 150, 30)
        + `<g fill="#2f2230"><path d="M780 ${B - 70}V${B - 40}Q780 ${B - 56} 800 ${B - 58}Q820 ${B - 56} 820 ${B - 40}V${B - 70}z"/></g>`;
      return `<defs>${lin(s1, [[0, '#3f4a8e'], [0.3, '#a8639a'], [0.55, '#ff8a6a'], [0.8, '#ffc07a'], [1, '#ffe6a8']])}${lin(w1, [[0, '#ffb083'], [0.2, '#8a5a82'], [1, '#2d2a55']])}</defs>`
        + full(`url(#${s1})`) + stars(11, 28, 220) + rays(800, 470, 900, '#ffd89a', 0.14) + sun(800, 470, 54, '#fff1c4', '#ff9a62')
        + streak(260, 170, 330, '#ffa8b0', 0.5) + streak(1300, 220, 300, '#ff8f90', 0.5, 66) + cloud(420, 340, 1.3, '#d57a9c', 0.82, 64, 6, '#ffb08c') + cloud(1230, 300, 1.1, '#d77f9c', 0.8, 58, 30, '#ffb894')
        + mv('uspar', { ad: '60s', dx: '12px' }, ridge('#7a5a86', 560, 22, 10, 21, 640)) + haze(520, 120, '#ffc592', 0.6)
        + canopy('#3a2a48', 600, 26, 31, -160, 1760, 650) + canopy('#2c2038', 622, 20, 33, -160, 1760, 650)
        + wat() + haze(560, 90, '#ffbd8a', 0.4)
        + `<rect y="${B}" width="1600" height="${900 - B}" fill="url(#${w1})"/>` + reflect(B, wat(), 0.38)
        + `<rect y="${B}" width="1600" height="20" fill="#ffb88a" opacity=".35"/>`
        + glints(5, 30, 360, 1240, B + 6, 800, '#ffd9a0', 70) + glints(6, 18, -100, 1700, 720, 890, '#ffb48a', 90)
        // causeway and balustrade
        + `<path fill="#5a3f48" d="M690 ${B + 20}H910L1080 900H520z"/><path d="M690 ${B + 20}L520 900M910 ${B + 20}L1080 900" stroke="#2f2230" stroke-width="8" fill="none"/>`
        + `<path d="M700 ${B + 40}L580 900M900 ${B + 40}L1020 900" stroke="#8f6a5e" stroke-width="3" stroke-dasharray="4 18" fill="none" opacity=".7"/>`
        + dots('M740 660L650 900M860 660L950 900', '#ffe0a0', 5, 36, 'us-lamps')
        // lotus and reeds
        + `<g fill="#3f6b4a">` + [150, 260, 380, 1210, 1330, 1460].map((x, i) => `<ellipse cx="${x}" cy="${790 + (i % 3) * 30}" rx="${50 + (i % 2) * 14}" ry="12"/>`).join('') + `</g><g fill="#ff9ec0">` + [150, 262, 1330, 1462].map((x, i) => `<path d="M${x} ${786 + (i % 2) * 30}q-8 -22 0 -34q8 12 0 34zM${x} ${786 + (i % 2) * 30}q-18 -14 -22 -26q16 4 22 26zM${x} ${786 + (i % 2) * 30}q18 -14 22 -26q-16 4 -22 26z"/>`).join('') + `</g>`
        + mv('ussway2', { ad: '5s', to: '120px 900px' }, '<path d="M60 900V700M96 900V730M130 900V690M170 900V740" stroke="#2c3a2e" stroke-width="5" fill="none"/>') + mv('ussway', { ad: '6s', d: '-2s', to: '1500px 900px' }, '<path d="M1440 900V710M1480 900V690M1520 900V735M1560 900V700" stroke="#2c3a2e" stroke-width="5" fill="none"/>')
        + palm(60, 700, 400, '#241a2c', 18, 1.5, 6) + palm(1560, 700, 440, '#241a2c', -24, 1.7, 7)
        + birds(9, 6, 1000, 250, '#4a2f50', 1, 700) + finish(0.34);
    } });

  /* ---------- Laos: the Mekong at Luang Prabang, mist, a gilded stupa on the hill ---------- */
  asiaSceneAdd({ key: 'country:LA', label: 'Mekong mist and temple roofs', site: 'Luang Prabang and the Mekong', colour: 'green', mood: 'calm', season: 'any', tags: ['river', 'mist', 'temple', 'mekong'],
    svg: () => {
      const s1 = U(), w1 = U(), h1 = U();
      let wall = '';
      const roof = (x, y, w, h, col, tr) => `<path fill="${col}" d="M${x - w - 26} ${y + h * 0.85}Q${x - w * 0.8} ${y + h * 0.7} ${x - w * 0.55} ${y + h * 0.3}L${x - w * 0.22} ${y}H${x + w * 0.22}L${x + w * 0.55} ${y + h * 0.3}Q${x + w * 0.8} ${y + h * 0.7} ${x + w + 26} ${y + h * 0.85}Q${x + w * 0.5} ${y + h * 0.7} ${x} ${y + h}Q${x - w * 0.5} ${y + h * 0.7} ${x - w - 26} ${y + h * 0.85}z"/>` + (tr ? `<path d="M${x - w * 0.22} ${y}l${-6} -16l12 8l6 -22l6 22l12 -8l-6 16z" fill="#e6b84a"/>` : '');
      const wat = (x, y) => `<rect x="${x - 220}" y="${y + 90}" width="440" height="110" fill="#e8dcc0"/><rect x="${x - 220}" y="${y + 180}" width="440" height="20" fill="#c9b48a"/>`
        + `<g fill="#b4352d"><rect x="${x - 190}" y="${y + 120}" width="30" height="60"/><rect x="${x - 60}" y="${y + 120}" width="30" height="60"/><rect x="${x + 30}" y="${y + 120}" width="30" height="60"/><rect x="${x + 160}" y="${y + 120}" width="30" height="60"/></g>`
        + roof(x, y + 20, 200, 80, '#7a3a2a', false) + roof(x, y, 130, 60, '#a8432f', true) + `<path d="M${x - 226} ${y + 94}H${x + 226}" stroke="#e6b84a" stroke-width="5"/><path d="M${x - 130} ${y + 20}H${x + 130}" stroke="#e6b84a" stroke-width="4"/>`;
      return `<defs>${lin(s1, [[0, '#7aa6c0'], [0.45, '#c9dfd0'], [0.8, '#f4ecc8'], [1, '#fff4d4']])}${lin(w1, [[0, '#a8c4b0'], [0.4, '#7a9c88'], [1, '#4a6a60']])}${lin(h1, [[0, '#7aa488'], [1, '#4a7058']])}</defs>`
        + full(`url(#${s1})`) + rays(1180, 220, 900, '#fff6d4', 0.14) + sun(1180, 220, 44, '#fffbe6', '#fff0b8')
        + cloud(380, 250, 1.1, '#e3ece6', 0.8, 68, 8, '#fff') + cloud(1000, 170, 0.9, '#e6eee6', 0.8, 58, 34, '#fff')
        + mv('uspar', { ad: '70s', dx: '12px' }, ridge('#a6c4b8', 470, 80, 6, 41, 700) + ridge('#8db4a4', 520, 70, 7, 43, 700)) + haze(470, 120, '#f6f0d8', 0.7)
        // gilded stupa on the hill
        + mv('uspar', { ad: '50s', dx: '10px' }, `<path fill="url(#${h1})" d="M900 700Q1000 440 1100 400T1300 450Q1400 520 1500 700z"/>` + `<g fill="#4a7a58">` + [1020, 1060, 1100, 1140, 1215, 1250, 1290, 1330, 1370].map((x, i) => `<circle cx="${x}" cy="${[540, 490, 450, 420, 424, 440, 470, 500, 530][i]}" r="${28 + (i % 3) * 8}"/>`).join('') + `</g>`
          + `<g fill="#e8c24f"><path d="M1160 410h40l-6 -40h-28z"/><path d="M1168 370h24l-4 -50l-8 -26l-8 26z"/></g><path d="M1180 294V268" stroke="#e8c24f" stroke-width="3"/><path d="M1160 410h40v6h-40z" fill="#fff1c0" opacity=".6"/>`)
        + mv('uspar', { ad: '44s', dx: '14px' }, ridge('#6a9a7c', 560, 60, 7, 51, 700)) + haze(560, 130, '#eef0d8', 0.6)
        + mv('usdrift', { ad: '62s', dx: '140px' }, '<ellipse cx="400" cy="590" rx="520" ry="26" fill="#f4f6e6" opacity=".7"/><ellipse cx="1180" cy="620" rx="440" ry="22" fill="#f4f6e6" opacity=".65"/>')
        // far bank town on the river and wat
        + `<g fill="#9a6a5a"><rect x="1330" y="626" width="60" height="30"/><rect x="1420" y="620" width="70" height="36"/><rect x="1520" y="630" width="60" height="26"/></g><g fill="#6a3a2f"><path d="M1322 626l38 -24l38 24z"/><path d="M1412 620l43 -26l43 26z"/><path d="M1512 630l38 -22l38 22z"/></g>`
        + `<rect y="650" width="1600" height="250" fill="url(#${w1})"/>` + glints(5, 30, -100, 1700, 660, 790, '#e6f2e0', 80)
        + mv('usmove', { ad: '80s', dx: '1900px' }, '<g transform="translate(760 706)"><path fill="#3a2f2a" d="M-110 0l16 -16h170l26 12l30 4l-22 14h-220z"/><path fill="#7a4a2f" d="M-70 -16l12 -26h110l14 26z"/><path fill="#c9a46a" d="M-52 -42h86l6 12h-98z"/><path fill="#fff" opacity=".4" d="M-110 12q-70 6 -150 2q70 12 150 6z"/></g>' + puffs(752, 662, 3, '#e8eee4', 8, -30, 3, -40, 3))
        + mv('usmove', { ad: '120s', d: '-50s', dx: '1900px' }, '<g transform="translate(1000 758) scale(-1 1)"><path fill="#2f2a2a" d="M-60 0l10 -12h96l18 8l-14 8z"/><path fill="#9a3a2f" d="M-30 -12h50l-8 -14h-34z"/></g>')
        // near bank, wat and banana trees
        + `<path fill="#4a6a46" d="M-160 900V800C100 770 280 780 520 760S840 790 1000 820S1400 800 1760 830V900z"/>` + canopy('#355a3c', 800, 22, 61, -160, 700, 900)
        + wat(330, 600) + canopy('#3a6a40', 800, 30, 63, -160, 900, 900)
        + [60, 190, 520, 640].map((x, i) => palm(x, 830 + i * 4, 250 + (i % 2) * 70, '#2a4a34', i % 2 ? 14 : -16, 1.1, 6 + i)).join('')
        + `<g fill="#f0c860">` + [140, 560].map((x) => `<ellipse cx="${x}" cy="772" rx="10" ry="18"/>`).join('') + `</g>`
        + `<path d="M900 900Q1000 840 1100 880T1400 870T1700 890V900z" fill="#2d4a34"/>`
        + birds(14, 5, 700, 330, '#4a5a56', 1, 600) + lit(R(330 - 190), 720, 30, 60) + finish(0.3);
    } });

  /* ---------- Brunei: the mosque and its golden dome in the lagoon ---------- */
  asiaSceneAdd({ key: 'country:BN', label: 'Golden-domed mosque on the lagoon', site: 'Omar Ali Saifuddien Mosque', colour: 'amber', mood: 'proud', season: 'any', tags: ['mosque', 'golden dome', 'lagoon', 'minaret'],
    svg: () => {
      const s1 = U(), w1 = U(), d1 = U();
      const B = 650, white = '#f4efe4', shade = '#cfc6b4';
      let arc = '';
      for (let x = 470; x < 1130; x += 44) arc += `<path d="M${x + 6} ${B}V${B - 36}Q${x + 6} ${B - 56} ${x + 22} ${B - 62}Q${x + 38} ${B - 56} ${x + 38} ${B - 36}V${B}z" fill="#8a7a66"/>`;
      const dome = (x, y, r, gold) => `<path fill="${gold}" d="M${x - r} ${y}C${x - r} ${y - r * 1.05} ${x - r * 0.3} ${y - r * 1.5} ${x} ${y - r * 1.9}C${x + r * 0.3} ${y - r * 1.5} ${x + r} ${y - r * 1.05} ${x + r} ${y}z"/><path d="M${x} ${y - r * 1.9}V${y - r * 2.3}" stroke="${gold}" stroke-width="${Math.max(3, R(r / 14))}"/><circle cx="${x}" cy="${R(y - r * 2.05)}" r="${Math.max(3, R(r / 10))}" fill="${gold}"/>`;
      const mosque = () => {
        return `<g fill="${white}"><rect x="440" y="${B - 66}" width="720" height="66"/><rect x="560" y="${B - 150}" width="480" height="88"/><rect x="690" y="${B - 220}" width="220" height="76"/><rect x="460" y="${B - 128}" width="76" height="64"/><rect x="1064" y="${B - 128}" width="76" height="64"/></g>`
          + `<g fill="${shade}"><rect x="880" y="${B - 220}" width="30" height="76" opacity=".7"/><rect x="1010" y="${B - 150}" width="30" height="88" opacity=".5"/><rect x="1120" y="${B - 66}" width="40" height="66" opacity=".5"/></g>` + arc
          + `<g fill="#6d7d8a" opacity=".8">` + [600, 650, 720, 770, 830, 880, 950].map((x) => `<path d="M${x} ${B - 98}v-28q0 -14 11 -14t11 14v28z"/>`).join('') + `</g>`
          + `<rect x="${B + 130 - 650 + 520}" y="0" width="0" height="0"/>`
          + dome(800, B - 220, 112, `url(#${d1})`) + dome(498, B - 128, 30, `url(#${d1})`) + dome(1102, B - 128, 30, `url(#${d1})`) + dome(610, B - 150, 30, `url(#${d1})`) + dome(990, B - 150, 30, `url(#${d1})`)
          + `<path d="M690 ${B - 220}H910M690 ${B - 150}H1040M560 ${B - 150}H690" stroke="#c9b27a" stroke-width="5" fill="none"/>`
          // minaret
          + `<g fill="${white}"><rect x="1224" y="${B - 380}" width="42" height="${380}"/><rect x="1216" y="${B - 300}" width="58" height="12"/><rect x="1216" y="${B - 400}" width="58" height="22"/><rect x="1228" y="${B - 438}" width="34" height="40"/></g><path fill="${shade}" d="M1245 ${B - 380}h21v380h-21z" opacity=".6"/>`
          + dome(1245, B - 438, 24, `url(#${d1})`) + `<path d="M1236 ${B - 360}v24M1254 ${B - 360}v24" stroke="#8a7a66" stroke-width="5"/>`;
      };
      return `<defs>${lin(s1, [[0, '#2f78c8'], [0.5, '#79b6e8'], [0.85, '#c8e6f6'], [1, '#f3eed8']])}${lin(w1, [[0, '#7fc0d0'], [0.4, '#3f8aa8'], [1, '#235a7a']])}${lin(d1, [[0, '#fff0a8'], [0.4, '#e8b83a'], [1, '#b4802a']])}</defs>`
        + full(`url(#${s1})`) + rays(300, 140, 900, '#fff', 0.1) + sun(300, 140, 38, '#fffdf0', '#fff4c0')
        + cloud(480, 250, 1.4, '#c9def0', 0.95, 62, 4) + cloud(1180, 180, 1.2, '#cfe4f4', 0.95, 56, 22) + cloud(820, 110, 0.8, '#d8eaf6', 0.9, 48, 12) + streak(1350, 340, 260, '#fff', 0.55)
        + mv('uspar', { ad: '60s', dx: '10px' }, ridge('#6aa0a0', 592, 28, 10, 77, 660)) + haze(560, 90, '#e0f0ec', 0.55)
        + canopy('#3f8a58', 628, 22, 71, -160, 1760, 660) + canopy('#2f7048', 640, 18, 73, -160, 1760, 660)
        + mosque() + `<rect y="${B}" width="1600" height="${900 - B}" fill="url(#${w1})"/>` + reflect(B, mosque(), 0.4) + `<rect y="${B}" width="1600" height="14" fill="#cfe8ee" opacity=".35"/>`
        + glints(5, 34, 300, 1350, B + 6, 800, '#e6f6ff', 80) + glints(6, 20, -100, 1700, 740, 890, '#bfe0ec', 100)
        // stone terrace, steps and lamp rows
        + `<path fill="#d9cfb8" d="M380 ${B}H1260V${B + 16}H380z"/><path d="M380 ${B + 6}H1260" stroke="#a8987c" stroke-width="3"/>` + dots(`M390 ${B - 6}H1250`, '#fff1c0', 5, 40, 'us-lamps')
        // water village boats and a water taxi
        + mv('usmove', { ad: '60s', dx: '1900px' }, '<g transform="translate(800 826)"><path fill="#f2efe6" d="M-80 0l14 -18h116l24 10l22 8z"/><rect x="-44" y="-34" width="60" height="18" fill="#2f6a8f"/><rect x="-36" y="-30" width="16" height="10" fill="#cfe8f2"/><rect x="-14" y="-30" width="16" height="10" fill="#cfe8f2"/><path fill="#fff" opacity=".5" d="M-80 6q-70 8 -150 3q70 14 150 7z"/></g>' + puffs(788, 790, 3, '#fff', 8, -30, 3, -30, 3))
        + mv('usmove', { ad: '90s', d: '-40s', dx: '1900px' }, '<g transform="translate(1000 780) scale(-1 1)"><path fill="#7a4a30" d="M-60 0l10 -12h96l14 8z"/><rect x="-24" y="-26" width="46" height="14" fill="#d9a050"/></g>')
        + `<g fill="#6a5a50"><rect x="1330" y="770" width="14" height="40"/><rect x="1390" y="770" width="14" height="40"/><rect x="1450" y="770" width="14" height="40"/><rect x="1510" y="770" width="14" height="40"/></g><path fill="#8a6a50" d="M1316 756h220l-20 -26h-180z"/><path fill="#b4846a" d="M1330 770h190v-14h-190z"/><path fill="#a0603f" d="M1380 730h100l-20 -20h-60z"/>` + lit(1352, 762, 14, 8) + lit(1420, 762, 14, 8) + lit(1480, 762, 14, 8)
        + palm(130, 760, 300, '#1f4a30', 20, 1.4, 6) + palm(1500, 790, 340, '#1f4a30', -18, 1.5, 7) + palm(240, 790, 220, '#2a5a3a', -10, 1.0, 5)
        + birds(15, 6, 760, 300, '#2f4a68', 1, 700) + finish(0.3);
    } });

  /* ---------- Timor-Leste: sunset over the bay, Atauro and an outrigger ---------- */
  asiaSceneAdd({ key: 'country:TL', label: 'Sunset bay with an outrigger canoe', site: 'Dili bay and Atauro', colour: 'teal', mood: 'calm', season: 'any', tags: ['bay', 'sunset', 'outrigger', 'island'],
    svg: () => {
      const s1 = U(), w1 = U(), c1 = U();
      return `<defs>${lin(s1, [[0, '#35418a'], [0.3, '#a45a96'], [0.55, '#ff7a6a'], [0.8, '#ffb870'], [1, '#ffe29a']])}${lin(w1, [[0, '#ffb878'], [0.12, '#e98a82'], [0.4, '#2f9a9e'], [1, '#0f5f78']])}${lin(c1, [[0, '#e8d4a0'], [1, '#c9a870']])}</defs>`
        + full(`url(#${s1})`) + stars(17, 30, 220) + rays(760, 560, 900, '#ffd08a', 0.15) + sun(760, 560, 56, '#fff0c0', '#ff9a58', true)
        + streak(300, 170, 340, '#ff9aa8', 0.5) + streak(1300, 250, 300, '#ff8a88', 0.5, 70) + cloud(400, 330, 1.3, '#d46a90', 0.85, 64, 8, '#ff9f86') + cloud(1240, 410, 1.1, '#d86e8e', 0.85, 56, 28, '#ffb08a') + cloud(960, 200, 0.8, '#c85e8c', 0.8, 50, 14, '#ff9c88')
        + mv('uspar', { ad: '70s', dx: '12px' }, ridge('#7a4a7a', 590, 40, 9, 91, 640) + `<path fill="#5a3a6a" d="M980 612Q1080 540 1190 520Q1300 510 1420 560Q1500 590 1600 612z"/>`) + haze(560, 90, '#ffb888', 0.6)
        + `<rect y="610" width="1600" height="290" fill="url(#${w1})"/>`
        + `<path fill="#ffd89a" opacity=".5" d="M700 612H820L900 900H520z"/>` + glints(3, 34, 520, 980, 620, 760, '#fff1c8', 70) + glints(4, 24, -100, 1700, 700, 890, '#ffc690', 100)
        // far headland with dry hills and a few roofs
        + mv('uspar', { ad: '54s', dx: '10px' }, `<path fill="#6a3f58" d="M-160 640Q80 580 300 600T560 640z"/>` + `<g fill="#b4846a"><rect x="180" y="610" width="28" height="14"/><rect x="226" y="606" width="34" height="16"/></g>`)
        // surf lines
        + `<path d="M-160 800Q200 780 520 800T1200 790T1760 806" stroke="#fff" stroke-width="5" fill="none" opacity=".5"/>` + mv('usdrift', { ad: '8s', dx: '30px' }, '<path d="M-160 840Q200 820 520 840T1200 830T1760 846" stroke="#fff" stroke-width="7" fill="none" opacity=".4"/>')
        // outrigger canoe with sail
        + mv('usmove', { ad: '110s', dx: '700px' }, mv('usbob', { ad: '4s', dy: '4px' }, '<g transform="translate(900 700)"><path fill="#3f2a2f" d="M-120 0Q-60 18 0 14Q70 14 130 -14Q60 -6 0 -4Q-60 -2 -120 0z"/><path d="M-70 -2L-70 -6M10 8L10 0M70 -4L70 -8" stroke="#3f2a2f" stroke-width="3"/><path d="M-60 -6L-70 30M60 -8L72 32" stroke="#3f2a2f" stroke-width="4"/><path d="M-110 30Q0 38 120 32" stroke="#3f2a2f" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M0 -4V-170" stroke="#3f2a2f" stroke-width="4"/>' + mv('ussway', { ad: '5s', to: '0px -4px' }, '<path fill="#f0b46a" d="M4 -168Q70 -110 100 -20L4 -12z"/><path fill="#d6804f" d="M4 -168Q40 -120 52 -16L4 -12z" opacity=".6"/>') + '</g>'))
        // beach and palms
        + `<path fill="url(#${c1})" d="M-160 900V850Q200 820 520 860T1200 850Q1500 830 1760 860V900z"/><path fill="#fff" d="M-160 856Q200 830 520 868T1200 858Q1500 840 1760 868V870Q1500 846 1200 864T520 876Q200 838 -160 862z" opacity=".5"/>`
        + `<g fill="#3a2a30"><path d="M200 870q60 -14 120 -8q-40 18 -120 8z"/><path d="M1180 878q80 -18 170 -6q-60 24 -170 6z"/></g>`
        + palm(110, 880, 420, '#241a24', 30, 1.7, 7) + palm(250, 880, 330, '#2a1d28', -22, 1.4, 6) + palm(1450, 880, 460, '#241a24', -34, 1.8, 6) + palm(1330, 880, 300, '#2a1d28', 18, 1.3, 8)
        + birds(19, 6, 700, 340, '#5a3350', 1, 700) + finish(0.34);
    } });

  /* ---------- Jakarta: monsoon dusk over the towers and the flame-topped monument ---------- */
  asiaSceneAdd({ key: 'place:jakarta', label: 'Dusk over the towers and Monas', site: 'Jakarta skyline at dusk', colour: 'orange', mood: 'energetic', season: 'any', tags: ['skyline', 'monas', 'traffic', 'dusk'],
    svg: () => {
      const s1 = U(), g1 = U(), f1 = U();
      let roofs = '', roofs2 = '';
      const r = rnd(33);
      for (let x = -160; x < 1760; x += 40 + r() * 30) { const w = 50 + r() * 40, y = R(796 + r() * 20); roofs += `<path d="M${R(x)} 900V${y}l${R(w / 2)} -22l${R(w / 2)} 22V900z"/>`; }
      for (let x = -140; x < 1760; x += 60 + r() * 40) { const w = 60 + r() * 50, y = R(852 + r() * 14); roofs2 += `<path d="M${R(x)} 900V${y}l${R(w / 2)} -26l${R(w / 2)} 26V900z"/>`; }
      return `<defs>${lin(s1, [[0, '#4a3f86'], [0.35, '#b0638f'], [0.62, '#ff8a6a'], [0.85, '#ffc07a'], [1, '#ffe0a0']])}${lin(g1, [[0, '#6a5a64'], [1, '#2f2838']])}${radU(f1, [[0, '#ffc07a', 0.55], [1, '#ffc07a', 0]], 800, 520, 600)}</defs>`
        + full(`url(#${s1})`) + stars(8, 26, 200) + rays(1180, 600, 900, '#ffd69a', 0.1) + sun(1180, 600, 50, '#fff0c4', '#ff9660')
        + streak(260, 180, 320, '#ffa8b4', 0.5) + streak(1340, 280, 300, '#ff9a90', 0.5, 66) + cloud(470, 320, 1.3, '#cc6f98', 0.85, 62, 6, '#ff9e88') + cloud(1200, 400, 1.1, '#d0739a', 0.85, 56, 28, '#ffb090') + cloud(880, 190, 0.9, '#bf6597', 0.8, 52, 12, '#ff9690')
        + `<rect width="1600" height="900" fill="url(#${f1})"/>`
        + mv('uspar', { ad: '50s', dx: '8px' }, city(61, -160, 1760, 650, 70, 220, 28, 64, '#9a6a9a', 0.2)) + haze(520, 120, '#ffc89c', 0.55)
        + mv('uspar', { ad: '36s', dx: '14px' }, city(62, -160, 560, 690, 130, 330, 40, 80, '#6f4f84', 0.45) + city(63, 1040, 1760, 690, 130, 300, 40, 80, '#6f4f84', 0.45)
          + `<g fill="#6a4a80"><rect x="220" y="320" width="70" height="370"/><path d="M220 320l35 -40l35 40z"/><rect x="1260" y="280" width="76" height="410"/><path d="M1260 280h76l-14 -34h-48z"/></g>` + win(228, 340, 54, 340, 12, 22) + win(1268, 300, 60, 380, 12, 22)
          + `<path d="M255 280V230M1298 246V196" stroke="#6a4a80" stroke-width="4"/>`)
        + mv('usflicker', { ad: '1.6s', to: '255px 230px' }, '<circle cx="255" cy="228" r="5" fill="#ff5a4a"/>') + mv('usflicker', { ad: '2s', d: '-.6s', to: '1298px 196px' }, '<circle cx="1298" cy="194" r="5" fill="#ff6a50"/>')
        // the monument: plinth, tall white shaft, platform, gilded flame
        + `<g><path fill="#c9b4b6" d="M690 690H910V650Q910 640 900 640H700Q690 640 690 650z"/><path fill="#e8d8d4" d="M730 640H870V610H730z"/><path fill="#f2e6de" d="M772 610L788 300H812L828 610z"/><path fill="#cdb8b4" d="M800 300H812L828 610H800z" opacity=".6"/><path fill="#e8d8d4" d="M766 330H834V300H766z"/><path fill="#f6ece4" d="M778 300H822V262H778z"/><path fill="#fff4ea" d="M792 262H808V236H792z"/></g>`
        + `<path d="M786 560V330M814 560V330" stroke="#b49c9c" stroke-width="2" opacity=".5"/>` + mv('usflicker', { ad: '1.1s', to: '800px 236px' }, '<path fill="#ffc83a" d="M800 150C778 180 770 206 786 232H814C830 206 822 180 800 150z"/><path fill="#fff1a0" d="M800 182C790 202 790 216 800 230C810 216 810 202 800 182z"/>')
        + mv('usglow', { ad: '3s', to: '800px 200px' }, '<circle cx="800" cy="200" r="46" fill="#ffd060" opacity=".25"/>')
        + `<path fill="#4a6a46" d="M-160 690H1760V720H-160z"/>` + canopy('#3a5a3e', 690, 28, 66, -160, 1760, 730) + canopy('#2c4a34', 704, 20, 68, -160, 1760, 730)
        // elevated toll road with moving lights
        + `<path fill="#4a3f55" d="M-160 730H1760V756H-160z"/><g fill="#5d516a"><rect x="60" y="756" width="30" height="90"/><rect x="460" y="756" width="30" height="90"/><rect x="860" y="756" width="30" height="90"/><rect x="1260" y="756" width="30" height="90"/><rect x="1660" y="756" width="30" height="90"/></g>`
        + dots('M-160 728H1760', '#fff0c0', 4, 38, 'us-lamps')
        + mv('usmove', { ad: '16s', dx: '1900px' }, '<g transform="translate(800 740)"><rect x="-26" y="-12" width="40" height="12" rx="3" fill="#b43a3a"/><rect class="us-lit" x="10" y="-8" width="6" height="4"/></g>') + mv('usmove', { ad: '22s', d: '-8s', dx: '1900px' }, '<g transform="translate(900 746) scale(-1 1)"><rect x="-30" y="-12" width="44" height="12" rx="3" fill="#e0b040"/><rect class="us-lit" x="10" y="-8" width="6" height="4"/></g>') + mv('usmove', { ad: '28s', d: '-14s', dx: '1900px' }, '<g transform="translate(700 740)"><rect x="-34" y="-16" width="50" height="16" rx="3" fill="#2f6a9a"/></g>')
        // kampung roofs and a bridge walkway
        + `<rect y="756" width="1600" height="144" fill="url(#${g1})"/>` + `<g fill="#4a3a48">${roofs}</g><g fill="#6a4a50">${roofs2}</g>`
        + `<g class="">` + [140, 380, 620, 1000, 1240, 1480].map((x, i) => lit(x, 872 + (i % 2) * 8, 14, 12)).join('') + `</g>`
        + puffs(480, 800, 4, '#d9c0b8', 14, -50, 5, -140, 3.4) + puffs(1100, 810, 4, '#d9c0b8', 12, 60, 6, -150, 3.4)
        + birds(20, 6, 520, 300, '#4a3560', 1, 700) + finish(0.34);
    } });

  /* ---------- Surabaya: the cable-stayed bridge across the strait at sunrise ---------- */
  asiaSceneAdd({ key: 'place:surabaya', label: 'Suramadu-style bridge at sunrise', site: 'The strait bridge at sunrise', colour: 'blue', mood: 'focused', season: 'any', tags: ['bridge', 'strait', 'sunrise', 'ships'],
    svg: () => {
      const s1 = U(), w1 = U();
      const D = 600;
      const pylon = (x, top) => `<path fill="#e8e2dc" d="M${x - 40} ${D + 10}L${x - 14} ${top}H${x + 14}L${x + 40} ${D + 10}H${x + 24}L${x + 6} ${top + 120}H${x - 6}L${x - 24} ${D + 10}z"/><path fill="#b8aea8" d="M${x} ${top}H${x + 14}L${x + 40} ${D + 10}H${x + 24}L${x + 6} ${top + 120}H${x}z" opacity=".6"/><rect x="${x - 26}" y="${top + 150}" width="52" height="10" fill="#d8d0c8"/><path d="M${x} ${top}V${top - 24}" stroke="#d8d0c8" stroke-width="4"/>`;
      const fan = (x, top, n, dx, step) => { let d = ''; for (let i = 1; i <= n; i++) { d += `M${x} ${top + 24 + i * 12}L${x - i * step} ${D}M${x} ${top + 24 + i * 12}L${x + i * step} ${D}`; } return `<path d="${d}" stroke="#d8d0c8" stroke-width="1.8" fill="none" opacity=".9"/>`; };
      const bridge = () => `<path fill="#6a6f8a" d="M-160 ${D}H1760V${D + 22}H-160z"/><path fill="#8a8fa8" d="M-160 ${D}H1760V${D + 6}H-160z" opacity=".7"/>`
        + [-60, 1660].map((x) => `<rect x="${x}" y="${D + 22}" width="22" height="${160}" fill="#4f5472" opacity=".9"/>`).join('') + [260, 540, 1060, 1340].map((x) => `<rect x="${x}" y="${D + 22}" width="22" height="70" fill="#5a5f7c"/>`).join('')
        + fan(800, 200, 14, 0, 28) + fan(420, 330, 8, 0, 20) + fan(1180, 330, 8, 0, 20) + pylon(800, 200) + pylon(420, 330) + pylon(1180, 330)
        + `<path d="M-160 ${D - 14}H1760" stroke="#b8b4c8" stroke-width="2" opacity=".7"/>`;
      return `<defs>${lin(s1, [[0, '#4a62a4'], [0.3, '#a68cc4'], [0.55, '#ff9f90'], [0.78, '#ffcc8a'], [1, '#ffeab4']])}${lin(w1, [[0, '#ffc08a'], [0.15, '#a86a92'], [0.5, '#3d4f86'], [1, '#202a58']])}</defs>`
        + full(`url(#${s1})`) + stars(23, 22, 190) + rays(1260, 600, 1000, '#ffe0a8', 0.14) + sun(1260, 600, 50, '#fff4d0', '#ffa878')
        + streak(280, 150, 320, '#ffb8c0', 0.5) + streak(1360, 240, 280, '#ffa8a0', 0.5, 70) + cloud(500, 300, 1.3, '#cf7fa4', 0.85, 62, 6, '#ffaa90') + cloud(1140, 140, 0.9, '#bf74a2', 0.8, 52, 22, '#ffb6a0') + cloud(860, 440, 1, '#d584a2', 0.85, 58, 34, '#ffc0a0')
        + mv('uspar', { ad: '60s', dx: '12px' }, ridge('#8a6aa6', 690, 30, 8, 111, 760) + `<path fill="#7a5a98" d="M1180 690Q1320 640 1460 620T1760 690z"/>`) + haze(650, 90, '#ffc59a', 0.55)
        + `<rect y="720" width="1600" height="180" fill="url(#${w1})" opacity="0"/>`
        + bridge()
        + `<rect y="${D + 22}" width="1600" height="${900 - D - 22}" fill="url(#${w1})"/>` + reflect(D + 22, bridge(), 0.2)
        + `<path fill="#ffd89a" opacity=".5" d="M1220 ${D + 22}H1300L1500 900H1020z"/>`
        + glints(7, 34, 900, 1500, D + 40, 800, '#fff0c0', 70) + glints(8, 28, -100, 1700, 760, 890, '#d8a0a0', 100)
        + dots(`M-160 ${D - 4}H1760`, '#fff0c0', 4, 40, 'us-lamps')
        + mv('usmove', { ad: '28s', dx: '1900px' }, `<g transform="translate(800 ${D - 3})"><rect x="-24" y="-12" width="36" height="12" rx="3" fill="#e0b040"/><rect class="us-lit" x="8" y="-8" width="6" height="4"/></g>`) + mv('usmove', { ad: '36s', d: '-14s', dx: '1900px' }, `<g transform="translate(900 ${D - 3}) scale(-1 1)"><rect x="-26" y="-14" width="40" height="14" rx="3" fill="#2f6a9a"/></g>`)
        // container ship and fishing boats
        + mv('usmove', { ad: '150s', dx: '800px' }, '<g transform="translate(560 790)"><path fill="#2f3a5a" d="M-200 0l24 -36h360l36 36z"/><rect x="-130" y="-58" width="80" height="22" fill="#d8554a"/><rect x="-40" y="-58" width="70" height="22" fill="#4a8ab8"/><rect x="40" y="-58" width="80" height="22" fill="#e0a03a"/><rect x="-90" y="-80" width="70" height="22" fill="#4a8a60"/><rect x="130" y="-70" width="40" height="34" fill="#e8e2d8"/><rect class="us-lit" x="140" y="-62" width="20" height="6"/></g>')
        + mv('usmove', { ad: '70s', d: '-20s', dx: '1900px' }, '<g transform="translate(1000 850)">' + mv('usbob', { ad: '3.4s', dy: '3px' }, '<path fill="#3f2f48" d="M-60 0l10 -14h86l16 8l16 6z"/><rect x="-20" y="-30" width="34" height="18" fill="#c9824a"/><path d="M-60 -14L-80 -38M36 -8L56 -30" stroke="#3f2f48" stroke-width="3"/>') + '</g>')
        + mv('usmove', { ad: '100s', d: '-60s', dx: '1900px' }, '<g transform="translate(300 818) scale(-1 1)"><path fill="#2f2540" d="M-50 0l8 -12h70l14 6z"/><rect x="-14" y="-26" width="26" height="14" fill="#c05a4a"/></g>')
        + birds(24, 6, 600, 360, '#4a3a6a', 1, 700) + finish(0.32);
    } });

  /* ---------- Kuala Lumpur: the twin towers and the broadcast tower at blue hour ---------- */
  asiaSceneAdd({ key: 'place:kuala-lumpur', label: 'Twin towers at blue hour', site: 'The twin towers at blue hour', colour: 'indigo', mood: 'proud', season: 'any', tags: ['towers', 'skybridge', 'blue hour', 'skyline'],
    svg: () => {
      const s1 = U(), g1 = U(), t1 = U(), p1 = U();
      const B = 700;
      const tower = (cx, flip) => {
        const w = 62, body = (hw, y0, y1) => `M${cx - hw} ${y0}H${cx + hw}V${y1}H${cx - hw}z`;
        // stepped, tapering tower of tiers with a rounded cap and spire
        const tiers = [[w, 700, 560], [w - 8, 560, 450], [w - 16, 450, 360], [w - 26, 360, 290], [w - 36, 290, 240], [w - 44, 240, 210]];
        let o = '', ribs = '';
        for (const [hw, y0, y1] of tiers) { o += `<path d="${body(hw, y1, y0)}"/>`; for (let x = cx - hw + 10; x < cx + hw; x += 22) ribs += `M${x} ${y0}V${y1}`; }
        let lights = '';
        for (const [hw, y0, y1] of tiers) lights += win(cx - hw + 10, y1 + 12, hw * 2 - 20, y0 - y1 - 24, 20, 26, '#3a4c6e');
        return `<g fill="url(#${t1})">${o}</g><path d="${ribs}" stroke="#cfe0f2" stroke-width="3" opacity=".45" fill="none"/>`
          + `<path fill="#e6f0fa" d="M${cx - 18} 210Q${cx - 18} 176 ${cx} 160Q${cx + 18} 176 ${cx + 18} 210z"/><path d="M${cx} 160V78" stroke="#e6f0fa" stroke-width="4"/><path d="M${cx} 118V92" stroke="#fff" stroke-width="2"/>`
          + `<path fill="#aebfd6" d="M${cx + 8} 700H${cx + 62}V560H${cx + 54}V450H${cx + 46}V360H${cx + 36}V290H${cx + 26}V240H${cx + 18}V210H${cx + 8}z" opacity=".35"/>`
          + lights;
      };
      const kl = `<path fill="#c9c4d2" d="M232 ${B}L240 360H262L270 ${B}z"/><path fill="#a8a2b8" d="M254 ${B}L262 360H270V${B}z" opacity=".5"/><path fill="#d6d0e0" d="M214 360H288L296 336Q296 316 251 310Q206 316 206 336z"/><rect x="210" y="318" width="82" height="18" fill="#7a82b0"/><path d="M251 310V190" stroke="#c9c4d2" stroke-width="5"/>` + lit(214, 322, 74, 8);
      return `<defs>${lin(s1, [[0, '#26306a'], [0.35, '#4a5a9e'], [0.62, '#a06aa0'], [0.85, '#f0907a'], [1, '#ffc88a']])}${lin(g1, [[0, '#2f6a4a'], [1, '#143a2a']])}${lin(t1, [[0, '#dfe8f4'], [0.5, '#b8c8de'], [1, '#8a9cc0']])}${lin(p1, [[0, '#6a8ab8'], [1, '#2a3a68']])}</defs>`
        + full(`url(#${s1})`) + stars(31, 70, 360) + sun(1240, 700, 38, '#ffe6c0', '#ff9a78') + streak(300, 220, 320, '#c89ac8', 0.35) + streak(1280, 170, 300, '#d8a0c8', 0.35, 66)
        + cloud(420, 340, 1.3, '#7a6aa8', 0.85, 66, 6, '#d88aa8') + cloud(1180, 260, 1.2, '#7a6ca8', 0.85, 58, 28, '#d68ea8') + cloud(820, 120, 0.9, '#5f5a98', 0.8, 52, 14, '#b27aa8')
        + mv('uspar', { ad: '55s', dx: '8px' }, city(81, -160, 1760, B, 80, 260, 28, 60, '#5f6aa0', 0.18)) + haze(560, 150, '#e690a0', 0.4)
        + mv('uspar', { ad: '40s', dx: '12px' }, city(82, -160, 520, B, 120, 320, 40, 80, '#4a5488', 0.3) + city(83, 1080, 1760, B, 120, 300, 40, 80, '#4a5488', 0.3)) + kl
        + mv('usflicker', { ad: '1.5s', to: '251px 190px' }, '<circle cx="251" cy="188" r="5" fill="#ff5a4a"/>')
        + tower(695) + tower(905)
        // skybridge
        + `<path fill="#d6e2f0" d="M755 470H845V484L835 496H765L755 484z"/><path d="M770 496L800 450L830 496" stroke="#c0d0e4" stroke-width="5" fill="none"/>` + lit(768, 474, 64, 6)
        + mv('usflicker', { ad: '1.8s', to: '695px 78px' }, '<circle cx="695" cy="76" r="5" fill="#ff6a50"/>') + mv('usflicker', { ad: '2.2s', d: '-.7s', to: '905px 78px' }, '<circle cx="905" cy="76" r="5" fill="#ff6a50"/>')
        // plaza: pond, fountain, palms
        + `<rect y="${B}" width="1600" height="${900 - B}" fill="url(#${g1})"/><path fill="url(#${p1})" d="M420 760Q800 730 1180 760L1260 840Q800 800 340 840z"/>` + reflect(760, '<rect x="640" y="640" width="320" height="90" fill="#cfe0f2"/>', 0.2)
        + shimmer(9, 24, 420, 1180, 764, 830, '#e8f0ff', 60)
        + [620, 700, 800, 900, 980].map((x, i) => mv('uspuff', {}, '').replace('<g class="x-uspuff"></g>', '') + `<path d="M${x} 790Q${x + (i - 2) * 12} 730 ${x + (i - 2) * 22} 790" stroke="#e8f4ff" stroke-width="3" fill="none" opacity=".7"/>`).join('')
        + dots('M300 700H1300', '#fff1c0', 5, 44, 'us-lamps') + dots('M-160 860H1760', '#ffd890', 5, 48, 'us-lamps')
        + palm(110, 880, 360, '#10281c', 24, 1.5, 6) + palm(1500, 880, 400, '#10281c', -26, 1.6, 7) + palm(260, 860, 240, '#1a3a28', -12, 1.1, 5) + palm(1380, 860, 260, '#1a3a28', 14, 1.2, 8)
        + canopy('#0f2a20', 840, 30, 87, -160, 1760, 900)
        + mv('usglide', { ad: '22s', dx: '900px', dy: '-60px' }, '<circle cx="500" cy="200" r="3" fill="#fff"/>') + mv('usflicker', { ad: '1s', to: '1100px 300px' }, '<circle cx="1100" cy="300" r="3" fill="#ff7a6a"/>')
        + finish(0.32);
    } });

  /* ---------- Singapore: the three-tower resort with its sky deck and the supertree grove ---------- */
  asiaSceneAdd({ key: 'place:singapore', label: 'Bay skyline and supertrees at dusk', site: 'Marina Bay at dusk', colour: 'violet', mood: 'energetic', season: 'any', tags: ['skyline', 'bay', 'supertrees', 'dusk'],
    svg: () => {
      const s1 = U(), w1 = U(), t1 = U();
      const B = 640;
      const slab = (xb, xt) => `<path fill="url(#${t1})" d="M${xb} ${B}L${xt} 254H${xt + 120}L${xb + 120} ${B}z"/><path fill="#b4c4dc" d="M${xt + 60} 254H${xt + 120}L${xb + 120} ${B}H${xb + 60}z" opacity=".3"/>`;
      let glass = '', gw = '';
      for (let i = 0; i < 3; i++) { const xb = [500, 660, 820][i], xt = [570, 660, 750][i]; glass += slab(xb, xt); let dd = ''; for (const c of [-40, -20, 0, 20, 40]) dd += `M${xt + 60 + c} 272L${xb + 60 + c} ${B - 10}`; gw += dots(dd, '#3a4c70', 5, 20, '', ' opacity=".5"') + dots(dd, '#ffd27a', 5, 20, 'us-lamps'); }
      glass += gw;
      const sky = `<path fill="#d9e2ee" d="M480 244Q480 226 510 224H1010L1090 212Q1112 226 1090 246L1010 256H510Q480 256 480 244z"/><path fill="#aebccd" d="M510 246H1010L1090 246L1010 256H510z" opacity=".7"/><ellipse cx="640" cy="226" rx="70" ry="6" fill="#7fb896"/><path d="M590 224q40 -26 120 -4" stroke="#6aa886" stroke-width="5" fill="none"/>`;
      const tree = (x, h, s) => `<path d="M${x - 6 * s} ${B + 20}Q${x - 4 * s} ${B - h * 0.5} ${x - 14 * s} ${B - h}H${x + 14 * s}Q${x + 4 * s} ${B - h * 0.5} ${x + 6 * s} ${B + 20}z" fill="#4a3a58"/>`
        + `<path d="M${x - 70 * s} ${B - h - 14 * s}Q${x} ${B - h - 70 * s} ${x + 70 * s} ${B - h - 14 * s}Q${x} ${B - h + 4 * s} ${x - 70 * s} ${B - h - 14 * s}z" fill="#6a3f8a"/>`
        + `<path d="M${x - 56 * s} ${B - h - 20 * s}Q${x} ${B - h - 56 * s} ${x + 56 * s} ${B - h - 20 * s}" stroke="#ff7ad0" stroke-width="${3 * s}" fill="none" class="us-lamps"/><path d="M${x - 44 * s} ${B - h - 8 * s}Q${x} ${B - h - 30 * s} ${x + 44 * s} ${B - h - 8 * s}" stroke="#7affc8" stroke-width="${2.4 * s}" fill="none" class="us-lamps"/>`
        + `<g class="us-lit">` + [-44, -22, 0, 22, 44].map((d) => `<circle cx="${x + d * s}" cy="${R(B - h - (14 - Math.abs(d) * 0.1) * s)}" r="${2.6 * s}"/>`).join('') + `</g>`;
      const city2 = () => city(91, -160, 420, B, 70, 220, 28, 60, '#6a5a98', 0.4) + city(92, 1000, 1760, B, 70, 240, 30, 64, '#6a5a98', 0.4);
      return `<defs>${lin(s1, [[0, '#2d2f78'], [0.3, '#6a4aa2'], [0.58, '#d8689a'], [0.82, '#ff9a80'], [1, '#ffd08c']])}${lin(w1, [[0, '#ff9a88'], [0.15, '#7a4a98'], [0.5, '#2f3a78'], [1, '#161c4a']])}${lin(t1, [[0, '#e6ecf6'], [1, '#9fb0cc']])}</defs>`
        + full(`url(#${s1})`) + stars(41, 60, 300) + sun(1300, 620, 40, '#ffe6c0', '#ff8a7a') + streak(260, 190, 330, '#d89ad0', 0.4) + streak(1300, 140, 300, '#e8a0c8', 0.4, 66)
        + cloud(460, 360, 1.3, '#8a5aa8', 0.85, 64, 6, '#f088a8') + cloud(1180, 300, 1.1, '#8a5ca8', 0.85, 58, 26, '#f08ca6') + cloud(860, 130, 0.9, '#6a4a98', 0.8, 52, 12, '#c070a8')
        + mv('uspar', { ad: '55s', dx: '8px' }, city2()) + haze(560, 120, '#ff9a9a', 0.45)
        // the three slabs and the sky deck
        + glass + sky
        + mv('usflicker', { ad: '1.7s', to: '700px 224px' }, '<circle cx="700" cy="222" r="5" fill="#ff5a4a"/>')
        // wheel
        + `<g fill="none" stroke="#c9b4d8" stroke-width="3" opacity=".9"><circle cx="1180" cy="470" r="130"/><circle cx="1180" cy="470" r="112" stroke-width="1.6"/></g>` + mv('usspin', { ad: '120s', to: '1180px 470px' }, '<path d="M1180 340V600M1050 470H1310M1088 378L1272 562M1272 378L1088 562" stroke="#c9b4d8" stroke-width="2" fill="none"/>' + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<circle cx="${R(1180 + 130 * Math.cos(i * Math.PI / 4))}" cy="${R(470 + 130 * Math.sin(i * Math.PI / 4))}" r="7" fill="#e8d8f0"/>`).join('')) + `<path d="M1150 660L1180 470L1210 660z" fill="none" stroke="#c9b4d8" stroke-width="4"/>`
        + `<path fill="#3a3068" d="M-160 ${B}H1760V${B + 12}H-160z"/>`
        + `<rect y="${B + 12}" width="1600" height="${900 - B - 12}" fill="url(#${w1})"/>`
        + reflect(B + 12, `<path fill="#c9d4e6" d="M500 ${B}L570 254H690L660 ${B}z M660 ${B}L660 254H780L780 ${B}z M820 ${B}L750 254H870L940 ${B}z"/>` + sky, 0.2)
        + glints(5, 36, 400, 1250, B + 20, 800, '#ffd0e0', 70) + glints(6, 30, -100, 1700, 740, 890, '#c8a0e0', 100) + dots(`M-160 ${B + 6}H1760`, '#ffe6b0', 5, 36, 'us-lamps')
        // grove of supertrees on the right bank
        + tree(1360, 330, 1.5) + tree(1480, 250, 1.1) + tree(1250, 220, 0.9) + `<path fill="#2f3a58" d="M1180 ${B + 12}H1760V${B - 20}Q1500 ${B - 40} 1180 ${B}z" opacity=".0"/>`
        + `<g fill="#241c44"><path d="M1100 ${B + 12}Q1300 ${B - 30} 1760 ${B - 6}V${B + 14}z"/></g>` + canopy('#1f1a3a', B - 4, 18, 95, 1080, 1760, B + 14)
        // boats on the bay, a ferry and a small tour boat
        + mv('usmove', { ad: '70s', dx: '1800px' }, '<g transform="translate(700 788)"><path fill="#f0e8f4" d="M-90 0l16 -20h130l26 14l24 6z"/><rect x="-50" y="-36" width="70" height="18" fill="#6a4aa0"/><rect class="us-lit" x="-44" y="-32" width="14" height="8"/><rect class="us-lit" x="-24" y="-32" width="14" height="8"/><rect class="us-lit" x="-4" y="-32" width="14" height="8"/><path fill="#fff" opacity=".5" d="M-90 6q-70 8 -150 3q70 14 150 7z"/></g>')
        + mv('usmove', { ad: '100s', d: '-40s', dx: '1800px' }, '<g transform="translate(1000 840) scale(-1 1)"><path fill="#3a2a58" d="M-60 0l10 -12h96l14 8z"/><rect x="-20" y="-26" width="36" height="14" fill="#d86a88"/></g>')
        // near promenade with palms and a rail
        + `<path fill="#1c1840" d="M-160 880H1760V900H-160z"/>` + dots('M-160 872H1760', '#ffd890', 5, 46, 'us-lamps')
        + palm(100, 880, 320, '#12102e', 22, 1.3, 6) + palm(1530, 880, 360, '#12102e', -24, 1.4, 7)
        + birds(46, 5, 500, 380, '#4a3a6a', 1, 700) + finish(0.34);
    } });

  /* ---------- Bangkok: the riverside temple of the dawn at sunset ---------- */
  asiaSceneAdd({ key: 'place:bangkok', label: 'The riverside prang at sunset', site: 'Wat Arun on the Chao Phraya', colour: 'orange', mood: 'dreamy', season: 'any', tags: ['temple', 'river', 'long-tail boat', 'sunset'],
    svg: () => {
      const s1 = U(), w1 = U();
      const B = 640, pc = '#efe4d2', pd = '#b49a82';
      const prang = (x, b, h, w, col, dark, det) => {
        let tiers = '', nich = '';
        const n = 5;
        for (let i = 0; i < n; i++) { const t = i / n, hw = w * (1 - t * 0.82), y0 = b - h * t, y1 = b - h * (t + 1 / n); tiers += `<path d="M${R(x - hw)} ${R(y0)}L${R(x - hw * 0.94)} ${R(y1 + 8)}Q${R(x - hw * 0.6)} ${R(y1 - 2)} ${R(x)} ${R(y1 - 6)}Q${R(x + hw * 0.6)} ${R(y1 - 2)} ${R(x + hw * 0.94)} ${R(y1 + 8)}L${R(x + hw)} ${R(y0)}z"/>`; if (det && i < n - 1) nich += `<path d="M${R(x - hw * 0.5)} ${R(y0 - 10)}h${R(hw)}" stroke="${dark}" stroke-width="2" opacity=".6"/>` + `<g fill="${dark}" opacity=".55">` + [-0.5, 0, 0.5].map((k) => `<circle cx="${R(x + hw * k)}" cy="${R(y0 - h / n * 0.5)}" r="${Math.max(2, R(hw / 14))}"/>`).join('') + `</g>`; }
        return `<g fill="${col}">${tiers}</g>${nich}<path fill="${dark}" opacity=".3" d="M${x} ${R(b - h - 6)}L${R(x + w)} ${b}H${x}z"/><path d="M${x} ${R(b - h - 4)}V${R(b - h - 54)}" stroke="${col}" stroke-width="${Math.max(3, R(w / 14))}"/><path d="M${R(x - w * 0.18)} ${R(b - h - 40)}h${R(w * 0.36)}M${R(x - w * 0.12)} ${R(b - h - 28)}h${R(w * 0.24)}" stroke="#e6b84a" stroke-width="${Math.max(2, R(w / 20))}"/><path d="M${x} ${R(b - h - 54)}l${R(-w * 0.1)} ${R(-w * 0.16)}M${x} ${R(b - h - 54)}l${R(w * 0.1)} ${R(-w * 0.16)}M${x} ${R(b - h - 54)}V${R(b - h - 54 - w * 0.2)}" stroke="#e6b84a" stroke-width="${Math.max(2, R(w / 22))}" fill="none"/>`;
      };
      const wat = (det) => `<g fill="#d9c8b0"><rect x="470" y="${B - 60}" width="660" height="60"/><rect x="520" y="${B - 110}" width="560" height="52"/><rect x="590" y="${B - 150}" width="420" height="44"/></g><path d="M470 ${B - 60}H1130M520 ${B - 110}H1080M590 ${B - 150}H1010" stroke="${pd}" stroke-width="4" fill="none"/>`
        + `<g fill="#6a4a3a">` + [500, 560, 620, 980, 1040, 1100].map((x) => `<path d="M${x} ${B}v-28q0 -14 10 -14t10 14v28z"/>`).join('') + `</g>`
        + prang(800, B - 150, 360, 74, pc, pd, det) + prang(630, B - 150, 150, 40, pc, pd, det) + prang(970, B - 150, 150, 40, pc, pd, det) + prang(540, B - 60, 100, 28, '#e6d8c2', pd, det) + prang(1060, B - 60, 100, 28, '#e6d8c2', pd, det)
        + `<g fill="#5a8a8a" opacity=".5">` + [740, 800, 860].map((x) => `<circle cx="${x}" cy="${B - 200}" r="5"/>`).join('') + `</g>`;
      return `<defs>${lin(s1, [[0, '#3d3f88'], [0.28, '#a4558f'], [0.55, '#ff7660'], [0.8, '#ffb468'], [1, '#ffe08e']])}${lin(w1, [[0, '#ffa87a'], [0.15, '#c26a7a'], [0.5, '#5a4a76'], [1, '#2a2650']])}</defs>`
        + full(`url(#${s1})`) + stars(51, 28, 200) + rays(1240, 560, 900, '#ffd08a', 0.15) + sun(1240, 560, 56, '#fff0c0', '#ff8a58')
        + streak(280, 170, 330, '#ff9aa8', 0.5) + streak(1340, 240, 290, '#ff8a88', 0.5, 70) + cloud(420, 300, 1.4, '#d4608e', 0.85, 66, 6, '#ff8a80') + cloud(1100, 380, 1.1, '#d86a8c', 0.85, 58, 28, '#ffa488') + cloud(860, 150, 0.9, '#bc5a8c', 0.8, 52, 14, '#ff8a86')
        + mv('uspar', { ad: '55s', dx: '10px' }, city(101, -160, 360, B, 40, 140, 30, 60, '#8a4a74', 0.1) + city(102, 1240, 1760, B, 60, 190, 30, 64, '#8a4a74', 0.1)) + haze(540, 110, '#ffb890', 0.5)
        + canopy('#3a2a4a', 624, 22, 103, -160, 1760, 650) 
        + wat(true) + haze(580, 70, '#ffb48a', 0.3)
        + `<path fill="#a87858" d="M-160 ${B}H1760V${B + 18}H-160z"/><path d="M-160 ${B + 6}H1760" stroke="#6a4a3a" stroke-width="3"/>`
        + `<rect y="${B + 18}" width="1600" height="${900 - B - 18}" fill="url(#${w1})"/>` + reflect(B + 18, `<g fill="#e6d8c2"><rect x="470" y="${B - 150}" width="660" height="150"/><path d="M726 490L790 130H810L874 490zM590 490L630 336L670 490zM930 490L970 336L1010 490zM512 580L540 480L568 580zM1032 580L1060 480L1088 580z"/></g>`, 0.3)
        + `<path fill="#ffd090" opacity=".4" d="M1180 ${B + 18}H1300L1500 900H1000z"/>` + glints(7, 34, 400, 1350, B + 26, 800, '#ffe0b0', 80) + glints(8, 28, -100, 1700, 740, 890, '#e8a090', 100)
        + dots(`M-160 ${B - 4}H1760`, '#fff0c0', 4, 38, 'us-lamps')
        // long-tail boat with its plume, and a ferry
        + mv('usmove', { ad: '40s', dx: '1900px' }, '<g transform="translate(700 800)"><path fill="#3a2a30" d="M-110 0Q-70 14 0 12Q70 12 130 -18Q60 -6 0 -4Q-60 -2 -110 0z"/><path fill="#c9503a" d="M-50 -2v-26h74l12 26z"/><rect x="-40" y="-40" width="60" height="14" fill="#e8b84a"/><path d="M-90 -2L-150 30" stroke="#3a2a30" stroke-width="5"/><path fill="#fff" opacity=".55" d="M-150 30q-140 12 -330 6q150 20 330 10z"/></g>' + puffs(686, 770, 3, '#f4e8e0', 9, -34, 3, -30, 3))
        + mv('usmove', { ad: '130s', d: '-70s', dx: '1900px' }, '<g transform="translate(1000 760) scale(-1 1)"><path fill="#2f2840" d="M-120 0l14 -22h210l16 22z"/><rect x="-80" y="-44" width="150" height="24" fill="#e8dcd0"/><rect class="us-lit" x="-70" y="-38" width="14" height="10"/><rect class="us-lit" x="-44" y="-38" width="14" height="10"/><rect class="us-lit" x="-18" y="-38" width="14" height="10"/><rect class="us-lit" x="8" y="-38" width="14" height="10"/><rect x="-100" y="-62" width="170" height="18" fill="#c9503a"/></g>')
        // near bank: pier and tropical trees
        + `<path fill="#2a1f3a" d="M-160 900V850Q200 826 520 850T1200 846Q1500 830 1760 850V900z"/><rect x="1330" y="816" width="300" height="12" fill="#5a4a50"/><path d="M1340 828V870M1400 828V870M1460 828V870M1520 828V870M1580 828V870" stroke="#3a2f3a" stroke-width="6"/>` + dots('M1330 812H1630', '#ffd890', 5, 34, 'us-lamps')
        + palm(110, 880, 420, '#1c1428', 26, 1.7, 6) + palm(260, 880, 300, '#241a30', -20, 1.3, 7) + palm(1530, 810, 340, '#1c1428', -22, 1.5, 6)
        + birds(52, 6, 560, 330, '#4a2f55', 1, 700) + finish(0.34);
    } });

  /* ---------- Ho Chi Minh City: the tall tower skyline over the river, motorbikes below ---------- */
  asiaSceneAdd({ key: 'place:ho-chi-minh-city', label: 'Towers over the river and the motorbike flow', site: 'Saigon River skyline', colour: 'pink', mood: 'energetic', season: 'any', tags: ['skyline', 'river', 'motorbikes', 'monsoon'],
    svg: () => {
      const s1 = U(), w1 = U(), t1 = U(), r1 = U();
      const B = 640;
      const lm = (cx) => `<path fill="url(#${t1})" d="M${cx - 40} ${B}V330L${cx - 32} 250L${cx - 24} 190L${cx - 14} 150L${cx} 110L${cx + 14} 150L${cx + 24} 190L${cx + 32} 250L${cx + 40} 330V${B}z"/><path fill="#9fb0cc" d="M${cx} 110L${cx + 14} 150L${cx + 24} 190L${cx + 32} 250L${cx + 40} 330V${B}H${cx}z" opacity=".35"/><path d="M${cx} 110V40" stroke="#dfe8f4" stroke-width="4"/><path d="M${cx} 70V50" stroke="#fff" stroke-width="2"/>` + win(cx - 30, 330, 60, 300, 16, 26, '#3a4c70') + win(cx - 20, 170, 40, 150, 16, 26, '#3a4c70')
        + `<path d="${[0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map((t) => `M${cx - 40} ${R(B - (B - 330) * t)}H${cx + 40}`).join('')}" stroke="#cfe0f2" stroke-width="2" opacity=".35"/>`;
      const bx = (cx) => `<path fill="#6a8ab8" d="M${cx - 50} ${B}V400Q${cx - 50} 340 ${cx - 28} 300L${cx + 6} 240Q${cx + 22} 250 ${cx + 28} 300Q${cx + 50} 340 ${cx + 50} 400V${B}z"/><path fill="#8ab0dc" d="M${cx + 6} 240Q${cx + 22} 250 ${cx + 28} 300Q${cx + 50} 340 ${cx + 50} 400V${B}H${cx + 6}z" opacity=".55"/><path fill="#e8c24a" d="M${cx - 30} 330h30l-4 -26z" opacity=".0"/><path fill="#c8d6ea" d="M${cx - 6} 300h58l6 -20l-8 -30h-56z" opacity=".0"/><path fill="#7a9ac8" d="M${cx + 28} 300L${cx + 90} 282L${cx + 96} 296L${cx + 50} 340z"/><ellipse cx="${cx + 92}" cy="282" rx="10" ry="5" fill="#dfe8f4"/>` + win(cx - 40, 360, 80, 270, 16, 26, '#3a4c70');
      const skyl = () => lm(520) + bx(760);
      return `<defs>${lin(s1, [[0, '#4f4a92'], [0.3, '#b26aa0'], [0.55, '#ff8a7e'], [0.78, '#ffc080'], [1, '#ffe4a0']])}${lin(w1, [[0, '#d98a82'], [0.15, '#8a6a98'], [0.5, '#4a5a8a'], [1, '#26305e']])}${lin(t1, [[0, '#dfe8f6'], [1, '#8fa4c8']])}${lin(r1, [[0, '#4a4a5c'], [1, '#2a2a38']])}</defs>`
        + full(`url(#${s1})`) + stars(61, 24, 200) + rays(1280, 520, 900, '#ffd29a', 0.14) + sun(1280, 520, 52, '#fff0c8', '#ff9a68')
        + streak(260, 170, 330, '#ffb0b4', 0.5) + streak(1340, 230, 290, '#ff9a96', 0.5, 70) + cloud(420, 330, 1.4, '#c8649a', 0.88, 64, 6, '#ff9488') + cloud(1100, 250, 1.2, '#cc6a9a', 0.88, 58, 26, '#ffa08e') + cloud(840, 120, 1.0, '#a85a98', 0.85, 52, 12, '#e47a90')
        + mv('uspar', { ad: '55s', dx: '8px' }, city(111, -160, 1760, B, 50, 180, 28, 60, '#a86a9a', 0.12)) + haze(540, 120, '#ffb894', 0.55)
        + mv('uspar', { ad: '38s', dx: '12px' }, city(112, -160, 420, B, 90, 250, 36, 70, '#7a5a92', 0.25) + city(113, 1000, 1760, B, 80, 230, 36, 70, '#7a5a92', 0.25) + skyl())
        + mv('usflicker', { ad: '1.6s', to: '520px 40px' }, '<circle cx="520" cy="38" r="5" fill="#ff5a4a"/>')
        + mv('usglow', { ad: '4s', to: '858px 282px' }, '<circle cx="858" cy="282" r="10" fill="#ffd060" opacity=".6"/>')
        // river and a bridge span in the distance
        + `<path fill="#5a4a7a" d="M-160 ${B}H1760V${B + 10}H-160z"/><rect y="${B + 10}" width="1600" height="110" fill="url(#${w1})"/>` 
        + glints(7, 22, 300, 1300, B + 16, 740, '#ffd0b0', 70)
        + mv('usmove', { ad: '90s', dx: '1900px' }, `<g transform="translate(900 ${B + 60})"><path fill="#2f2840" d="M-90 0l14 -18h130l26 14z"/><rect x="-44" y="-34" width="56" height="16" fill="#e0b050"/></g>`) + mv('usmove', { ad: '120s', d: '-60s', dx: '1900px' }, `<g transform="translate(500 ${B + 90}) scale(-1 1)"><path fill="#3a2f48" d="M-70 0l12 -14h100l14 8z"/><rect x="-26" y="-28" width="40" height="14" fill="#c9503a"/></g>`)
        // the street: road with a stream of motorbikes, lamps and strings of lanterns
        + `<rect y="${B + 120}" width="1600" height="${900 - B - 120}" fill="url(#${r1})"/><rect y="${B + 120}" width="1600" height="16" fill="#8a7a84"/>`
        + `<path d="M-160 790H1760" stroke="#e8d8b0" stroke-width="4" stroke-dasharray="40 30" opacity=".6"/>`
        + [0, 1, 2, 3, 4, 5, 6].map((i) => { const y = 726 + (i % 4) * 30, col = ['#d85a4a', '#2f6a9a', '#e0b040', '#4a8a6a', '#d86a9a', '#f2efe6', '#8a5aa8'][i], dir = i % 2 ? -1 : 1, sc = 0.8 + (i % 4) * 0.12;
          return mv('usmove', { ad: (14 + i * 3) + 's', d: -(i * 2.3) + 's', dx: '1900px' }, `<g transform="translate(${700 + i * 40} ${y}) scale(${dir * sc} ${sc})"><path fill="#1f1a2c" d="M-22 0a8 8 0 1 0 0 .1zM22 0a8 8 0 1 0 0 .1z"/><path fill="${col}" d="M-24 -4l10 -18h18l8 -6h12l6 12l-8 12z"/><path fill="${col}" opacity=".85" d="M-6 -26l-6 -20l12 -2l4 20z"/><circle cx="-6" cy="-52" r="7" fill="#2a2030"/><path fill="${col}" d="M-12 -46h14v12h-14z"/><rect class="us-lit" x="24" y="-18" width="6" height="4"/></g>`); }).join('')
        + `<g fill="#2a2030"><rect x="130" y="660" width="12" height="150"/><rect x="1470" y="660" width="12" height="150"/></g>` + dots('M136 664Q800 700 1476 664', '#ffd890', 6, 34, 'us-lamps')
        + `<path d="M136 664Q800 700 1476 664" stroke="#3a2a38" stroke-width="2" fill="none"/>` + `<g class="">` + [300, 520, 760, 1000, 1220].map((x, i) => `<ellipse class="us-lit" cx="${x}" cy="${R(672 + 22 * Math.sin((x - 136) / 1340 * Math.PI))}" rx="9" ry="12"/>`).join('') + `</g>`
        + `<rect y="850" width="1600" height="50" fill="#26202e"/><g fill="#d8a85a" opacity=".8">` + [60, 330, 640, 960, 1280, 1540].map((x) => `<path d="M${x} 850h90l8 -34q-50 -14 -106 0z"/>`).join('') + `</g><g fill="#6a4a3a">` + [90, 360, 670, 990, 1310, 1570].map((x) => `<rect x="${x}" y="850" width="12" height="40"/>`).join('') + `</g>`
        + palm(80, 700, 330, '#1c1428', 22, 1.4, 6) + palm(1540, 700, 340, '#1c1428', -22, 1.5, 7)
        + birds(62, 6, 600, 360, '#5a3a68', 1, 700) + finish(0.34);
    } });
})();
