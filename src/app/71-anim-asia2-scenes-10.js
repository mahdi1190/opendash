/* ============================================================
   ASIA FULL-SCREEN SCENES, batch 10 (Ulaanbaatar, Taipei, Kaohsiung, Hong Kong, Macau, Indonesia, Malaysia,
   Singapore, Thailand, Vietnam, the Philippines). PURE classic script: registers entries with asiaSceneAdd()
   (71-anim-asia.js). Each svg() returns the inside of a 1600 x 900 drawing built with usSceneKit(): a sky and
   its light, far / mid / near layers that drift, the landmark, foreground and ambient life. Daytime colours; the
   evening grade lights the us-lit / us-lamps / us-star elements. Motion is transform and opacity only.
   Landscape, skyline and architecture only: no flags, maps, lettering or people.
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
  /** A run of filler buildings. */
  const city = (seed, x0, x1, base, hmin, hmax, wmin, wmax, fill, wc) => {
    const r = rnd(seed); let x = x0, o = '', w = '';
    while (x < x1) {
      const bw = wmin + r() * (wmax - wmin), bh = hmin + r() * (hmax - hmin);
      o += `<rect x="${R(x)}" y="${R(base - bh)}" width="${R(bw)}" height="${R(bh)}"/>`;
      if (r() < 0.3) o += `<rect x="${R(x + bw * 0.3)}" y="${R(base - bh - 14 - r() * 14)}" width="${R(bw * 0.4)}" height="22"/>`;
      if (wc && r() < wc && bw > 20) w += win(R(x + 5), R(base - bh + 10), R(bw - 10), R(bh - 20), 11, 20);
      x += bw + r() * 4;
    }
    return `<g fill="${fill}">${o}</g>${w}`;
  };
  /** A palm: curved trunk and fronds that sway from the foot. */
  const palm = (x, y, h, lean, col, trunk, dur) => {
    const tx = x + lean, ty = y - h;
    let f = '';
    for (let i = 0; i < 8; i++) {
      const a = (-170 + i * 24) * Math.PI / 180, L = h * 0.42, ex = R(tx + Math.cos(a) * L), ey = R(ty + Math.sin(a) * L * 0.6 + L * 0.35);
      f += `<path d="M${tx} ${ty}Q${R(tx + Math.cos(a) * L * 0.6)} ${R(ty + Math.sin(a) * L * 0.9 - 14)} ${ex} ${ey}Q${R(tx + Math.cos(a) * L * 0.55)} ${R(ty + Math.sin(a) * L * 0.6)} ${tx} ${ty + 4}z"/>`;
    }
    return mv('ussway', { ad: (dur || 5) + 's', to: `${x}px ${y}px` }, `<path d="M${x - 5} ${y}Q${x + lean * 0.2} ${R(y - h * 0.55)} ${tx - 3} ${ty}h6Q${x + lean * 0.3 + 6} ${R(y - h * 0.5)} ${x + 5} ${y}z" fill="${trunk}"/><g fill="${col}">${f}</g>`);
  };
  /** A Chinese-style junk: hull, battened sails, mast. */
  const junk = (x, y, s, sail, hull, nSails) => {
    let o = `<path fill="${hull}" d="M${x - 90 * s} ${y - 20 * s}Q${x - 60 * s} ${y + 22 * s} ${x - 20 * s} ${y + 22 * s}H${x + 70 * s}Q${x + 100 * s} ${y + 10 * s} ${x + 110 * s} ${y - 26 * s}z"/>`;
    for (let i = 0; i < (nSails || 2); i++) {
      const mx = x - 40 * s + i * 62 * s, h = (150 - i * 22) * s;
      o += `<path d="M${R(mx)} ${R(y - 20 * s)}V${R(y - h - 10 * s)}" stroke="#3a2a22" stroke-width="${R(3 * s) + 1}"/><path fill="${sail}" d="M${R(mx + 2)} ${R(y - h)}Q${R(mx + 46 * s)} ${R(y - h * 0.6)} ${R(mx + 50 * s)} ${R(y - 28 * s)}H${R(mx + 2)}z"/>`;
      for (let k = 1; k < 5; k++) o += `<path d="M${R(mx + 2)} ${R(y - 28 * s - k * (h - 28 * s) / 5)}h${R(48 * s * (1 - k * 0.12))}" stroke="#00000033" stroke-width="2"/>`;
    }
    return o;
  };
  const water = (y, a, b, c) => { const g = U(); return `<defs>${lin(g, [[0, a], [0.5, b], [1, c]])}</defs>${full(`url(#${g})`, y)}`; };

  /* ---------- Ulaanbaatar: gers on the steppe hillside below the city ---------- */
  asiaSceneAdd({ key: 'place:ulaanbaatar', label: 'Gers on the steppe above the city', site: 'Ger district and the steppe', colour: 'blue', mood: 'calm', season: 'any', tags: ['steppe', 'ger', 'skyline'],
    svg: () => {
      const s1 = U(), r = rnd(8);
      const ger = (x, y, s, door) => `<g><path fill="#8a7a62" d="M${x - 40 * s} ${y}h${80 * s}v4h${-80 * s}z"/><rect x="${R(x - 36 * s)}" y="${R(y - 30 * s)}" width="${R(72 * s)}" height="${R(30 * s)}" fill="#f6f0e2"/>`
        + `<path fill="#e6dcc4" d="M${R(x - 42 * s)} ${R(y - 28 * s)}L${x} ${R(y - 56 * s)}L${R(x + 42 * s)} ${R(y - 28 * s)}z"/><path fill="#cfc3a6" d="M${x} ${R(y - 56 * s)}L${R(x + 42 * s)} ${R(y - 28 * s)}H${x}z"/>`
        + `<path d="M${R(x - 36 * s)} ${R(y - 20 * s)}h${R(72 * s)}" stroke="#b9442f" stroke-width="${R(2 * s) + 1}"/><rect x="${R(x - 7 * s)}" y="${R(y - 22 * s)}" width="${R(14 * s)}" height="${R(22 * s)}" fill="${door}"/>`
        + `<rect x="${R(x + 18 * s)}" y="${R(y - 64 * s)}" width="${R(4 * s) + 1}" height="${R(14 * s)}" fill="#4a423a"/></g>`;
      let gers = '', smoke = '';
      [[420, 700, 1.1], [560, 735, 1.4], [330, 760, 1.5], [700, 700, 1], [830, 760, 1.6], [980, 722, 1.2], [1120, 770, 1.7], [1260, 725, 1.1], [1390, 760, 1.4], [200, 710, 1], [1500, 715, 1]].forEach((g, i) => {
        gers += ger(g[0], g[1], g[2], i % 2 ? '#c8502a' : '#2f6a86');
        if (i % 2 === 0) smoke += puffs(R(g[0] + 20 * g[2]), R(g[1] - 62 * g[2]), 3, '#f3f3f3', 7 * g[2], 26, 5, -90, 3);
      });
      let fence = ''; for (let i = 0; i < 24; i++) fence += `M${-100 + i * 76} 805v-20`;
      const horse = (x, y, s) => `<g fill="#5a3b2a"><ellipse cx="${x}" cy="${y}" rx="${26 * s}" ry="${11 * s}"/><path d="M${x - 18 * s} ${y + 6 * s}v${22 * s}h${4 * s}v${-20 * s}M${x - 8 * s} ${y + 8 * s}v${22 * s}h${4 * s}v${-20 * s}M${x + 10 * s} ${y + 8 * s}v${22 * s}h${4 * s}v${-20 * s}M${x + 20 * s} ${y + 6 * s}v${22 * s}h${4 * s}v${-20 * s}"/>`
        + mv('ussway2', { ad: '5s', to: `${x + 22 * s}px ${y}px` }, `<path d="M${x + 20 * s} ${y - 6 * s}l${14 * s} ${12 * s}l${6 * s} ${4 * s}l${-4 * s} ${6 * s}l${-14 * s} ${-6 * s}l${-6 * s} ${-2 * s}z"/>`) + `</g>`;
      return `<defs>${lin(s1, [[0, '#4c8cd2'], [0.55, '#a9d3ef'], [1, '#eaf2e4']])}</defs>` + full(`url(#${s1})`) + stars(3, 30, 200)
        + sun(1260, 170, 34, '#fffbe6', '#fff0b8') + cloud(380, 250, 1.2, '#c9dcf0', 0.9, 54, 6) + cloud(1000, 330, 0.9, '#d3e2f2', 0.85, 44, 14) + cloud(1480, 150, 0.8, '#d0e0f0', 0.9, 60, 30)
        + birds(4, 3, 760, 200, '#3b4a63', 1.4, 700)
        + mv('uspar', { ad: '48s', dx: '10px' }, ridge('#8da6c6', 520, 100, 8, 12) + ridge('#9fb4cb', 560, 70, 9, 14))
        // distant city: stacks and the sail-shaped glass tower
        + mv('uspar', { ad: '38s', dx: '12px' }, city(31, 260, 1060, 590, 14, 80, 16, 34, '#a1abbd', 0.35)
          + `<path fill="#6aa0d6" d="M980 590V400Q1016 430 1040 590z"/><path fill="#9cc6ee" d="M1010 590V430Q1028 470 1040 590z" opacity=".7"/>`
          + `<g fill="#b5bac4"><rect x="600" y="420" width="14" height="170"/><rect x="640" y="440" width="12" height="150"/></g><rect x="596" y="456" width="20" height="8" fill="#c0392b"/>`
          + puffs(607, 418, 4, '#ffffff', 16, 40, 7, -80, 3.4) + puffs(646, 438, 3, '#f6f6f6', 13, 36, 6, -70, 3))
        + haze(520, 90, '#e9f1e6', 0.55)
        + mv('uspar', { ad: '30s', dx: '16px' }, ridge('#b3b872', 640, 70, 7, 21) + ridge('#97a65a', 690, 60, 8, 23))
        + mv('uspar', { ad: '24s', dx: '8px' }, `<path fill="#789444" d="M-160 800Q300 700 800 745T1760 735V900H-160z"/>` + gers + smoke)
        + `<path fill="#658034" d="M-160 830Q400 790 800 820T1760 805V900H-160z"/><path d="${fence}" stroke="#6b4e34" stroke-width="3"/><path d="M-100 800H1700" stroke="#6b4e34" stroke-width="3"/>`
        + mv('usmove', { ad: '70s', dx: '240px' }, horse(520, 845, 1.1) + horse(610, 855, 0.9) + horse(1180, 850, 1))
        + mv('ussway', { ad: '3.5s', to: '800px 900px' }, dots('M-100 880H1700', '#8fae4c', 6, 18, '', ' opacity=".7"') + dots('M-100 868H1700', '#a6c05c', 5, 24, '', ' opacity=".6"'))
        + finish(0.3);
    } });

  /* ---------- Taipei: Taipei 101 over the morning mist and the green hills ---------- */
  asiaSceneAdd({ key: 'place:taipei', label: 'Taipei 101 in the morning mist', site: 'Taipei 101 from Elephant Mountain', colour: 'teal', mood: 'proud', season: 'any', tags: ['skyscraper', 'skyline', 'mountain'],
    svg: () => {
      const s1 = U(), g1 = U();
      let t = '', yb = 690;
      const sec = (hw, h, flare) => { const p = `<path fill="#5f9fb0" d="M800 ${yb}H${800 - hw}L${800 - hw - flare} ${yb - h}H${800 + hw + flare}L${800 + hw} ${yb}z"/><path fill="#8cc8d4" d="M800 ${yb}H${800 + hw}L${800 + hw + flare} ${yb - h}H800z" opacity=".55"/><rect x="${800 - hw - flare - 3}" y="${yb - h - 4}" width="${2 * (hw + flare) + 6}" height="8" fill="#e4c46a"/>`; yb -= h; return p; };
      t += `<path fill="#6a8f9c" d="M${800 - 70} 720L${800 - 54} 690H${800 + 54}L${800 + 70} 720z"/>`;
      for (let i = 0; i < 8; i++) t += sec(50 - i * 1.6, 56, 8) + win(800 - 40 + i, yb + 12, 80 - i * 2, 36, 12, 12);
      t += sec(36, 40, 0) + sec(30, 30, 0) + sec(24, 26, 0);
      t += `<path fill="#d6d9de" d="M${800 - 20} ${yb}L${800 - 8} ${yb - 44}H${800 + 8}L${800 + 20} ${yb}z"/><path d="M800 ${yb - 44}V${yb - 120}" stroke="#c8ccd2" stroke-width="5"/>`;
      return `<defs>${lin(s1, [[0, '#7fb0d6'], [0.5, '#bfe0e8'], [1, '#fbeed0']])}${lin(g1, [[0, '#ffffff', 0], [0.6, '#eaf5f2', 0.85], [1, '#f6fbf8', 0.95]])}</defs>` + full(`url(#${s1})`) + stars(5, 24, 200)
        + sun(380, 330, 40, '#fffbe8', '#ffe6a8') + cloud(1150, 210, 1.1, '#d3e6ee', 0.9, 52, 6) + cloud(260, 150, 0.8, '#d8e8f0', 0.85, 60, 16) + cloud(1500, 330, 0.9, '#e0eef2', 0.8, 48, 28)
        + birds(6, 4, 1000, 300, '#35566a', 1.2, 600)
        + mv('uspar', { ad: '50s', dx: '10px' }, ridge('#8fb8b0', 520, 110, 7, 41) + ridge('#79a89c', 580, 80, 8, 43))
        + haze(500, 110, '#ffffff', 0.6)
        + mv('uspar', { ad: '36s', dx: '14px' }, city(51, -160, 700, 690, 30, 150, 28, 60, '#7f9aa6', 0.35) + city(52, 900, 1760, 690, 30, 150, 28, 60, '#7f9aa6', 0.35)
          + city(53, -160, 760, 690, 20, 90, 30, 60, '#6c8896', 0.3) + city(54, 860, 1760, 690, 20, 90, 30, 60, '#6c8896', 0.3))
        + t + mv('usflicker', { ad: '1.6s', to: '800px 580px' }, `<circle cx="800" cy="${yb - 124}" r="5" fill="#ff5a4a"/>`)
        + mv('usdrift', { ad: '40s', dx: '120px' }, `<rect x="-200" y="620" width="2000" height="120" fill="url(#${g1})" opacity=".8"/>`)
        + mv('usdrift', { ad: '55s', dx: '90px', d: '-20s' }, `<rect x="-200" y="700" width="2000" height="90" fill="url(#${g1})" opacity=".9"/>`)
        + mv('uspar', { ad: '28s', dx: '12px' }, ridge('#3f7a5a', 780, 70, 7, 61) + canopy('#2f6a4c', 800, 24, 7, -160, 1760))
        + mv('uspar', { ad: '22s', dx: '8px' }, ridge('#265a42', 850, 40, 6, 62) + canopy('#1d4c38', 868, 22, 9, -160, 1760))
        + finish(0.3);
    } });

  /* ---------- Kaohsiung: the Dragon and Tiger Pagodas on Lotus Pond ---------- */
  asiaSceneAdd({ key: 'place:kaohsiung', label: 'Dragon and Tiger Pagodas on Lotus Pond', site: 'Lotus Pond pagodas', colour: 'orange', mood: 'cheerful', season: 'any', tags: ['pagoda', 'lake', 'temple'],
    svg: () => {
      const s1 = U(), w1 = U(), r = rnd(5);
      const pagoda = (x, base, tint) => {
        let o = '', y = base;
        o += `<rect x="${x - 100}" y="${y - 18}" width="200" height="18" fill="#c9c0b0"/><rect x="${x - 74}" y="${y - 32}" width="148" height="14" fill="#ddd3bf"/>`; y -= 32;
        for (let i = 0; i < 7; i++) {
          const hw = 70 - i * 5.5, wh = 40, ew = hw + 34 - i;
          o += `<rect x="${R(x - hw)}" y="${y - wh}" width="${R(2 * hw)}" height="${wh}" fill="${tint}"/><rect x="${R(x - hw)}" y="${y - wh}" width="${R(2 * hw)}" height="6" fill="#f2c24a"/>`
            + lit(R(x - 9), y - 30, 18, 24) + `<path d="M${x - hw + 6} ${y - 6}v-26M${x + hw - 6} ${y - 6}v-26" stroke="#8d2a1a" stroke-width="6"/>`
            + `<path fill="#3f9a72" d="M${R(x - ew)} ${y - wh - 12}Q${R(x - hw - 4)} ${y - wh + 8} ${R(x - hw + 4)} ${y - wh - 2}L${R(x - hw * 0.55)} ${y - wh - 24}H${R(x + hw * 0.55)}L${R(x + hw - 4)} ${y - wh - 2}Q${R(x + hw + 4)} ${y - wh + 8} ${R(x + ew)} ${y - wh - 12}Q${R(x + hw)} ${y - wh + 10} ${x} ${y - wh + 10}Q${R(x - hw)} ${y - wh + 10} ${R(x - ew)} ${y - wh - 12}z"/>`
            + `<path fill="#6cc79a" d="M${R(x - hw * 0.55)} ${y - wh - 24}H${R(x + hw * 0.55)}l${R(hw * 0.2)} 14H${R(x - hw * 0.75)}z" opacity=".6"/>`;
          y -= wh + 14;
        }
        return o + `<path d="M${x} ${y + 12}V${y - 40}" stroke="#d7a93a" stroke-width="5"/><circle cx="${x}" cy="${y - 44}" r="8" fill="#e8b93e"/>`;
      };
      let zig = ''; for (let i = 0; i < 13; i++) zig += `${i ? 'L' : 'M'}${500 + i * 50} ${i % 2 ? 738 : 700}`;
      const lotus = (x, y, s) => `<ellipse cx="${x}" cy="${y}" rx="${R(34 * s)}" ry="${R(8 * s)}" fill="#3d8a4a"/><path fill="#f6a8c0" d="M${x - 4} ${y - 4}q-6 -${R(16 * s)} 0 -${R(22 * s)}q6 ${R(6 * s)} 0 ${R(22 * s)}M${x + 4} ${y - 4}q8 -${R(14 * s)} 14 -${R(16 * s)}q-2 ${R(10 * s)} -14 ${R(16 * s)}"/>`;
      let pads = ''; for (let i = 0; i < 12; i++) pads += lotus(R(40 + r() * 1520), R(810 + r() * 70), 0.7 + r() * 0.9);
      const lanterns = (() => { let o = ''; for (let i = 0; i < 9; i++) { const x = 360 + i * 90; o += `<path d="M${x} 560v26" stroke="#7a4a2a" stroke-width="2"/><ellipse class="us-lit" cx="${x}" cy="598" rx="12" ry="15" style="fill:#e8402a;stroke:none"/>`; } return o; })();
      return `<defs>${lin(s1, [[0, '#3f8ede'], [0.5, '#8cc6ee'], [1, '#e0f0f2']])}${lin(w1, [[0, '#7fc4c8'], [0.5, '#3f9aa6'], [1, '#2a6f84']])}</defs>` + full(`url(#${s1})`) + stars(9, 24, 200)
        + sun(1380, 150, 36, '#fffbe6', '#fff2c0') + cloud(300, 220, 1.1, '#cfe3f2', 0.92, 52, 4) + cloud(900, 150, 0.9, '#dbeaf6', 0.9, 60, 18) + cloud(1300, 330, 0.8, '#d3e5f2', 0.85, 46, 30)
        + birds(8, 4, 1100, 260, '#3b5068', 1.2, 640)
        + mv('uspar', { ad: '46s', dx: '10px' }, ridge('#8bb5ae', 540, 80, 8, 71))
        + mv('uspar', { ad: '36s', dx: '12px' }, city(72, 80, 480, 596, 20, 110, 20, 40, '#a6b9c4', 0.3) + city(73, 1180, 1700, 596, 20, 100, 20, 40, '#a6b9c4', 0.3)
)
        + canopy('#3a8a52', 606, 36, 9, -160, 1760, 640)
        + water(596, '#8fd0cc', '#43a2ac', '#2a7288')
        + `<g opacity=".3" fill="#d9402a">${[500, 1100].map((x) => { let o = `<rect x="${x - 80}" y="660" width="160" height="30" fill="#c9c0b0"/>`; for (let i = 0; i < 7; i++) o += `<rect x="${R(x - 54 + i * 4)}" y="${690 + i * 54}" width="${R(108 - i * 8)}" height="40"/><path fill="#3f9a72" d="M${R(x - 76 + i * 5)} ${728 + i * 54}H${R(x + 76 - i * 5)}L${R(x + 50 - i * 4)} ${712 + i * 54}H${R(x - 50 + i * 4)}z"/>`; return o; }).join('')}</g>`
        + `<rect y="596" width="1600" height="304" fill="url(#${w1})" opacity=".35"/>`
        + `<rect x="-160" y="640" width="1920" height="20" fill="#cfc6b2"/>`
        + pagoda(500, 650, '#e04a2a') + pagoda(1100, 650, '#e04a2a')
        + `<path fill="none" stroke="#7a1f14" stroke-width="22" stroke-linejoin="round" d="${zig}" opacity=".35" transform="translate(0 12)"/><path fill="none" stroke="#c63a22" stroke-width="16" stroke-linejoin="round" d="${zig}"/><path fill="none" stroke="#f2c24a" stroke-width="3" stroke-linejoin="round" d="${zig}" transform="translate(0 -6)"/>`
        + lanterns
        + shimmer(11, 40, 100, 1500, 700, 880, '#e8fbff', 80) + mv('usbob', { ad: '4s', dy: '4px' }, pads)
        + mv('usmove', { ad: '60s', dx: '500px' }, `<path fill="#9a5a34" d="M60 784q30 24 70 24h60q30 -4 50 -24z"/><path fill="#e8d6a8" d="M120 784l10-34h50l10 34z"/>`)
        + finish(0.3);
    } });

  /* ---------- Hong Kong: Victoria Harbour at dusk, a red-sailed junk in front ---------- */
  asiaSceneAdd({ key: 'place:hong-kong', label: 'Victoria Harbour at dusk', site: 'Victoria Harbour and the Peak', colour: 'indigo', mood: 'energetic', season: 'any', tags: ['skyline', 'harbour', 'junk'],
    svg: () => {
      const s1 = U(), g1 = U();
      const tower = (x, base, w, h, fill, side, crown) => `<path fill="${fill}" d="M${x} ${base}V${base - h}${crown || ''}H${x + w}V${base}z"/><path fill="${side}" d="M${x + w * 0.62} ${base}V${base - h}H${x + w}V${base}z" opacity=".6"/>` + win(x + 5, base - h + 14, w - 10, h - 26, 11, 15);
      // ICC-style tall tower, IFC with a crown, and a faceted bank tower
      const feat = `<path fill="#33406a" d="M1180 640V300h110V640z"/><path fill="#46558a" d="M1250 640V300h40V640z" opacity=".7"/>` + win(1186, 316, 98, 310, 13, 16) + `<rect x="1180" y="290" width="110" height="10" fill="#5d6ca5"/>`
        + `<path fill="#3a4872" d="M640 640V380L672 330L704 380V640z"/><path fill="#51629a" d="M672 330L704 380V640H672z" opacity=".6"/>` + win(648, 396, 48, 230, 12, 16) + `<path d="M672 330V270" stroke="#6a7ab0" stroke-width="3"/>`
        + `<path fill="#3a4a6c" d="M880 640V420l24-30l24 30l24-30l24 30V640z"/><path fill="none" stroke="#6272a6" stroke-width="2" d="M880 480l72 -50M880 540l72 -50M952 430l24 50M928 430l-48 40"/>` + win(886, 440, 84, 180, 12, 15);
      const peak = `<path fill="#34426e" d="M-160 640V510Q150 480 330 430Q480 372 560 378Q780 410 1040 456Q1300 492 1760 500V640z"/>` + canopy('#24405a', 470, 14, 3, -160, 1760, 540);
      let refl = ''; const r = rnd(9); for (let i = 0; i < 40; i++) refl += `<rect class="x-usshim" style="--ad:${(2 + r() * 2).toFixed(1)}s;--d:-${(r() * 3).toFixed(1)}s" x="${R(560 + r() * 760)}" y="${R(660 + r() * 90)}" width="${R(14 + r() * 40)}" height="4" rx="2" fill="${r() < 0.5 ? '#ffc86a' : '#7fd8ff'}"/>`;
      const ferry = (x, y, s) => `<path fill="#f1f1ee" d="M${x - 70 * s} ${y}h${140 * s}l${-10 * s} ${18 * s}h${-120 * s}z"/><rect x="${x - 50 * s}" y="${y - 18 * s}" width="${100 * s}" height="${18 * s}" fill="#f6f6f2"/><path fill="#2d7fb0" d="M${x - 70 * s} ${y + 8 * s}h${140 * s}l${-4 * s} ${8 * s}h${-132 * s}z"/>` + lit(R(x - 44 * s), R(y - 14 * s), R(88 * s), R(7 * s));
      return `<defs>${lin(s1, [[0, '#1f2f6e'], [0.4, '#5b4a92'], [0.7, '#e97e72'], [1, '#ffc98a']])}${lin(g1, [[0, '#ffb98a', 0.7], [1, '#ffb98a', 0]])}</defs>` + full(`url(#${s1})`) + stars(12, 70, 300)
        + sun(1000, 600, 40, '#fff1cc', '#ff9a6a') + streak(300, 250, 280, '#ff9a8a', 0.5) + streak(1300, 380, 300, '#ffb08a', 0.55, 70) + cloud(560, 300, 1.0, '#a8639a', 0.85, 52, 8, '#ffb59a') + cloud(1380, 190, 0.8, '#7f5a9a', 0.8, 46, 24, '#f09aa0')
        + birds(14, 4, 420, 330, '#2f2a4c', 1.2, 600)
        + mv('uspar', { ad: '50s', dx: '10px' }, peak) + haze(430, 120, '#e88a8a', 0.5)
        + mv('uspar', { ad: '34s', dx: '14px' }, city(71, -160, 620, 640, 40, 200, 26, 54, '#3a4572', 0.55) + city(72, 1300, 1760, 640, 40, 220, 26, 54, '#3a4572', 0.55) + city(73, 720, 1170, 640, 20, 120, 24, 50, '#46517e', 0.5)
          + tower(1280, 640, 90, 160, '#2f3a64', '#44528a') + feat)
        + water(638, '#3a4f8a', '#1f3a74', '#12275a') + `<rect y="638" width="1600" height="70" fill="url(#${g1})" opacity=".45"/>`
        + dots('M-100 650H1700', '#ffd27a', 4, 22, 'us-lamps') + refl
        + mv('usmove', { ad: '50s', dx: '600px' }, ferry(700, 710, 1.1)) + mv('usbob', { ad: '4.5s', dy: '4px' }, mv('usmove', { ad: '70s', dx: '300px' }, junk(1000, 830, 1.6, '#c4301f', '#4a1f16', 3)))
        + dots('M-100 858H1700', '#ff9a6a', 3, 30, '', ' opacity=".4"')
        + finish(0.3);
    } });

  /* ---------- Macau: the old facade on its hill, the tower and the golden lotus hotel ---------- */
  asiaSceneAdd({ key: 'place:macau', label: 'Old facade, tower and bridge in golden light', site: 'Macau Tower and the old city', colour: 'amber', mood: 'cheerful', season: 'any', tags: ['facade', 'tower', 'bridge'],
    svg: () => {
      const s1 = U(), w1 = U();
      const facade = (x, y) => `<path fill="#9a8f80" d="M${x - 130} ${y}V${y - 190}h260V${y}z"/><path fill="#b0a595" d="M${x - 130} ${y - 190}h260v-6h-260z"/>`
        + `<path fill="#a69b8b" d="M${x - 110} ${y - 196}h220v-60h-220z"/><path fill="#9a8f80" d="M${x - 118} ${y - 332}h236l-118 -50z" transform="translate(0 76)"/>`
        + `<path fill="#a69b8b" d="M${x - 70} ${y - 258}H${x + 70}L${x} ${y - 318}z"/><circle cx="${x}" cy="${y - 284}" r="10" fill="#6c6256"/>`
        + [-90, -30, 30, 90].map((dx) => `<path d="M${x + dx - 12} ${y - 130}V${y - 170}a12 12 0 0 1 24 0V${y - 130}z" fill="#4a4036"/>`).join('')
        + [-90, 0, 90].map((dx) => `<path d="M${x + dx - 11} ${y - 220}V${y - 244}a11 11 0 0 1 22 0V${y - 220}z" fill="#4a4036"/>`).join('')
        + `<path fill="#4a4036" d="M${x - 24} ${y}V${y - 66}a24 24 0 0 1 48 0V${y}z"/><path d="M${x - 130} ${y - 60}h260M${x - 130} ${y - 100}h260" stroke="#80766a" stroke-width="4"/>`
        + `<path fill="#a69b8b" d="M${x - 150} ${y + 80}L${x - 110} ${y}H${x + 110}L${x + 150} ${y + 80}z"/>` + `<path d="M${x - 120} ${y + 20}h240M${x - 134} ${y + 44}h268M${x - 142} ${y + 64}h284" stroke="#837868" stroke-width="3"/>`;
      let tw = `<path fill="#d8d3c8" d="M1180 700L1196 330H1212L1228 700z"/><path fill="#f0ece2" d="M1200 700L1204 330H1212L1228 700z" opacity=".6"/><path fill="#b8b2a6" d="M1160 330Q1204 296 1248 330L1236 358H1172z"/><path fill="#e4dfd4" d="M1166 318Q1204 280 1242 318Z"/><path d="M1204 296V150" stroke="#cfcac0" stroke-width="5"/><path d="M1204 150V90" stroke="#bbb" stroke-width="2"/>`
        + `<rect x="1172" y="338" width="64" height="10" fill="#7fc0e0" opacity=".8"/>`;
      const lisboa = `<path fill="#c9a248" d="M960 690V470h40V690z"/><path fill="#e8c86a" d="M990 690V470h10V690z" opacity=".6"/><path fill="#d8b04a" d="M968 470Q930 420 944 360Q980 300 1016 360Q1030 420 992 470z"/><path fill="none" stroke="#fff3b0" stroke-width="2" d="M956 440Q980 380 1004 440M950 400Q980 340 1010 400"/>` + dots('M960 470Q930 420 944 360Q980 300 1016 360Q1030 420 992 470', '#fff1a8', 4, 14, 'us-lamps');
      let bridge = `<path d="M-160 640Q400 610 800 640T1760 640" stroke="#8a8f9c" stroke-width="10" fill="none"/>`;
      for (let i = 0; i < 12; i++) bridge += `<path d="M${40 + i * 140} 640v26" stroke="#7a7f8c" stroke-width="8"/>`;
      return `<defs>${lin(s1, [[0, '#5aa0d8'], [0.45, '#f2d9a0'], [0.8, '#ffb870'], [1, '#ffd89a']])}${lin(w1, [[0, '#f0c48a'], [0.4, '#6aa6b6'], [1, '#2f6a88']])}</defs>` + full(`url(#${s1})`) + stars(15, 20, 160)
        + rays(1060, 500, 1100, '#fff3c0', 0.12) + sun(1060, 520, 44, '#fffbe0', '#ffd27a') + cloud(300, 210, 1.1, '#e8c8a8', 0.85, 54, 6, '#fff5e0') + cloud(800, 150, 0.9, '#f0d8b8', 0.85, 46, 16, '#fff8ea') + cloud(1450, 320, 0.8, '#e8c4a0', 0.8, 60, 30, '#fff0d4')
        + birds(18, 4, 700, 300, '#5a4636', 1.2, 600)
        + mv('uspar', { ad: '46s', dx: '10px' }, ridge('#9db7a6', 560, 70, 8, 81) + city(82, -160, 1760, 600, 20, 100, 24, 46, '#b9a8a0', 0.25))
        + haze(520, 100, '#ffe2b0', 0.55)
        + mv('uspar', { ad: '34s', dx: '12px' }, city(83, -160, 1760, 700, 40, 170, 28, 60, '#a08a8a', 0.4) + lisboa + tw)
        + water(700, '#e8c690', '#6ea6b2', '#2f6a88') + `<rect y="700" width="1600" height="30" fill="#ffd89a" opacity=".5"/>` + bridge
        + mv('uspar', { ad: '28s', dx: '10px' }, `<path fill="#4a7a52" d="M-160 640V560Q100 500 300 540Q440 580 560 620V700H-160z"/>` + canopy('#3a6a44', 560, 20, 4, -160, 580, 640) + facade(260, 640))
        + mv('usmove', { ad: '60s', dx: '500px' }, junk(900, 770, 1.1, '#d4382a', '#5a2a1a', 2)) + mv('usbob', { ad: '5s', dy: '3px' }, '')
        + shimmer(21, 44, 0, 1600, 730, 890, '#fff2c8', 80)
        + `<path fill="#e6c9a0" d="M-160 860Q400 830 800 850T1760 840V900H-160z"/>` + dots('M-100 868H1700', '#b88a5a', 5, 26, '', ' opacity=".5"')
        + mv('uspar', { ad: '26s', dx: '8px' }, palm(120, 880, 260, 40, '#3f7a48', '#6a4a30', 5) + palm(1480, 880, 300, -50, '#3a7444', '#6a4a30', 6))
        + finish(0.3);
    } });

  /* ---------- Indonesia: Mount Bromo smoking at sunrise over a sea of cloud ---------- */
  asiaSceneAdd({ key: 'country:ID', label: 'Mount Bromo at sunrise', site: 'Mount Bromo', colour: 'orange', mood: 'dreamy', season: 'any', tags: ['volcano', 'sunrise', 'caldera'],
    svg: () => {
      const s1 = U(), c1 = U();
      const cone = (x, y, w, h, fill, lit2) => `<path fill="${fill}" d="M${x - w} ${y}Q${x - w * 0.55} ${y - h * 0.15} ${x - w * 0.3} ${y - h * 0.7}Q${x - w * 0.12} ${y - h} ${x} ${y - h}Q${x + w * 0.12} ${y - h} ${x + w * 0.3} ${y - h * 0.7}Q${x + w * 0.55} ${y - h * 0.15} ${x + w} ${y}z"/><path fill="${lit2}" d="M${x} ${y - h}Q${x + w * 0.12} ${y - h} ${x + w * 0.3} ${y - h * 0.7}Q${x + w * 0.55} ${y - h * 0.15} ${x + w} ${y}H${x + w * 0.2}z" opacity=".5"/>`;
      let ribs = ''; for (let i = 0; i < 9; i++) ribs += `M${560 + i * 18} ${560 + (i % 3) * 6}Q${590 + i * 14} ${470 - i * 6} ${640 + i * 4} ${380}`;
      const pine = (x, y, h) => `<path d="M${x} ${y}V${y - h}" stroke="#1f2a22" stroke-width="5"/>` + `<path fill="#22362a" d="M${x - h * 0.34} ${y - h * 0.82}Q${x} ${y - h * 1.12} ${x + h * 0.34} ${y - h * 0.82}Q${x} ${y - h * 0.9} ${x - h * 0.34} ${y - h * 0.82}z"/><path fill="#22362a" d="M${x - h * 0.22} ${y - h * 0.66}Q${x} ${y - h * 0.86} ${x + h * 0.22} ${y - h * 0.66}Q${x} ${y - h * 0.72} ${x - h * 0.22} ${y - h * 0.66}z"/>`;
      return `<defs>${lin(s1, [[0, '#3b4f96'], [0.35, '#b46aa2'], [0.65, '#ff9a6a'], [1, '#ffd58a']])}${lin(c1, [[0, '#ffd9c0', 0.95], [1, '#e8a8b4', 0.95]])}</defs>` + full(`url(#${s1})`) + stars(22, 50, 260)
        + rays(800, 520, 1200, '#ffd9a0', 0.12) + sun(800, 520, 44, '#fff3d0', '#ffb070', true) + streak(300, 220, 280, '#ffb0a0', 0.5) + streak(1300, 300, 300, '#ff9a8a', 0.5, 70) + cloud(1280, 200, 0.9, '#c98aa8', 0.75, 56, 8, '#ffd0b0')
        + birds(23, 3, 500, 300, '#3a2c4c', 1.1, 520)
        // Semeru behind with its own plume
        + mv('uspar', { ad: '60s', dx: '8px' }, cone(1280, 640, 360, 330, '#7f6a9a', '#ffb89a') + puffs(1280, 316, 5, '#d8c0cc', 26, 60, 9, -130, 3.4))
        + mv('uspar', { ad: '48s', dx: '10px' }, ridge('#8a6f98', 620, 80, 8, 91))
        + `<rect y="600" width="1600" height="300" fill="url(#${c1})"/>`
        + mv('usdrift', { ad: '40s', dx: '120px' }, cloud(400, 640, 1.4, '#e7a8b4', 0.95, 40, 0, '#ffe6d0') + cloud(1200, 670, 1.5, '#e8aab6', 0.95, 44, 10, '#ffe8d4'))
        // the caldera floor and Bromo
        + mv('uspar', { ad: '36s', dx: '12px' }, `<path fill="#6a5a66" d="M-160 740Q300 690 800 720T1760 700V900H-160z"/>`
          + cone(700, 740, 250, 170, '#5a4a5c', '#d89a7a') + `<path d="M690 580Q650 650 600 740M706 580Q716 650 742 740M698 580Q684 660 668 740M682 578Q630 640 560 740" stroke="#3a2d42" stroke-width="5" fill="none" opacity=".6"/>` + `<ellipse cx="700" cy="572" rx="50" ry="9" fill="#2f2438"/>`
          + puffs(700, 566, 6, '#e9d6dc', 28, 80, 8, -190, 3.6)
          + `<path fill="#4a3d52" d="M1000 760Q1060 700 1110 760z"/>`)
        + `<path fill="#4a3a46" d="M-160 820Q300 780 800 810T1760 790V900H-160z"/>` + `<path d="M-160 840Q300 800 800 830T1760 810" stroke="#6a5662" stroke-width="3" fill="none"/>`
        + mv('ussway2', { ad: '7s', to: '100px 900px' }, pine(100, 900, 360) + pine(210, 900, 260)) + mv('ussway2', { ad: '8s', d: '-3s', to: '1500px 900px' }, pine(1500, 900, 400) + pine(1390, 900, 280) + pine(1620, 900, 300))
        + mv('usdrift', { ad: '30s', dx: '100px' }, `<path fill="#ffe0d0" opacity=".35" d="M-200 790Q300 760 800 790T1800 780V830H-200z"/>`)
        + finish(0.3);
    } });

  /* ---------- Malaysia: the Petronas Towers under a tropical storm sky ---------- */
  asiaSceneAdd({ key: 'country:MY', label: 'Petronas Towers under a tropical sky', site: 'Petronas Twin Towers', colour: 'teal', mood: 'proud', season: 'any', tags: ['skyscraper', 'tropical', 'skyline'],
    svg: () => {
      const s1 = U(), g1 = U();
      const tower = (cx) => {
        const tiers = [[62, 120], [54, 100], [46, 90], [38, 80], [30, 70], [22, 56]]; let y = 690, o = '';
        tiers.forEach((t, i) => {
          const hw = t[0], h = t[1];
          o += `<rect x="${cx - hw}" y="${y - h}" width="${2 * hw}" height="${h}" rx="${R(hw * 0.35)}" fill="#c5ced6"/><rect x="${cx + hw * 0.1}" y="${y - h}" width="${R(hw * 0.9)}" height="${h}" rx="${R(hw * 0.3)}" fill="#e8eef2" opacity=".7"/>`
            + `<rect x="${cx - hw - 4}" y="${y - h - 3}" width="${2 * hw + 8}" height="6" rx="3" fill="#aab6c0"/>`;
          let st = ''; for (let k = 0; k < Math.floor(h / 14); k++) st += `M${cx - hw + 6} ${y - 10 - k * 14}h${2 * hw - 12}`;
          o += `<path d="${st}" stroke="#7f95a6" stroke-width="2" opacity=".55"/>`;
          y -= h;
        });
        return o + `<path fill="#dfe6ec" d="M${cx - 16} ${y}Q${cx} ${y - 54} ${cx} ${y - 70}Q${cx} ${y - 54} ${cx + 16} ${y}z"/><path d="M${cx} ${y - 70}V${y - 140}" stroke="#d0d6dc" stroke-width="4"/>` + `<circle class="us-lit" cx="${cx}" cy="${y - 136}" r="4"/>`;
      };
      const bridge = `<path fill="#aab6c0" d="M718 480H882V506Q850 520 800 520Q750 520 718 506z"/><path d="M730 506L780 478M870 506L820 478" stroke="#8fa0ae" stroke-width="6"/>`;
      const foliage = (x, y, s, c) => `<g fill="${c}">` + [[0, 0, 70], [-60, 12, 52], [60, 10, 56], [-30, -30, 48], [34, -26, 50]].map((p) => `<circle cx="${R(x + p[0] * s)}" cy="${R(y + p[1] * s)}" r="${R(p[2] * s)}"/>`).join('') + '</g>';
      return `<defs>${lin(s1, [[0, '#3f7fc0'], [0.45, '#86b8dc'], [0.8, '#d4e6ea'], [1, '#f6ecc8']])}${lin(g1, [[0, '#ffe9a8', 0.7], [1, '#ffe9a8', 0]])}</defs>` + full(`url(#${s1})`) + stars(31, 30, 200)
        + rays(1200, 330, 900, '#fff2c0', 0.12) + sun(1200, 330, 30, '#fffbe4', '#ffe9a0')
        + cloud(280, 190, 1.4, '#7f97ac', 0.95, 52, 4, '#d6e2ea') + cloud(780, 110, 1.3, '#8aa2b4', 0.95, 62, 14, '#e2ecf2') + cloud(1420, 130, 1.4, '#7f98ae', 0.95, 56, 20, '#dce8f0') + cloud(1450, 330, 0.9, '#a8bccb', 0.9, 46, 8, '#f2f6f8')
        + birds(32, 4, 400, 380, '#3a4c5a', 1.3, 640)
        + mv('uspar', { ad: '48s', dx: '10px' }, ridge('#7f9f9a', 560, 70, 8, 101))
        + mv('uspar', { ad: '36s', dx: '14px' }, city(102, -160, 640, 700, 40, 220, 28, 58, '#8099a6', 0.4) + city(103, 960, 1760, 700, 40, 230, 28, 58, '#8099a6', 0.4)
          + `<path fill="#7a94a0" d="M1400 700V380l22-40l22 40V700z"/>` + win(1406, 400, 30, 280, 11, 15))
        + haze(560, 110, '#eaf0ee', 0.5)
        + tower(708) + tower(892) + bridge + mv('usglow', { ad: '5s' }, `<circle cx="800" cy="470" r="2" fill="#fff" opacity="0"/>`)
        + `<path fill="#aeb8c0" d="M600 700h400v14H600z"/><rect x="560" y="714" width="480" height="16" fill="#9ba7b0"/>`
        + mv('uspar', { ad: '28s', dx: '10px' }, `<path fill="#3f8a4a" d="M-160 740Q300 700 800 730T1760 720V900H-160z"/>` + foliage(240, 760, 1.2, '#2f7a40') + foliage(1380, 770, 1.3, '#2c7440') + foliage(1560, 790, 1, '#38844a'))
        + mv('uspar', { ad: '22s', dx: '8px' }, `<path fill="#2f7040" d="M-160 820Q400 790 800 810T1760 800V900H-160z"/>` + palm(180, 900, 380, 70, '#2f8a4a', '#5a4630', 5) + palm(1440, 900, 420, -80, '#2a8444', '#5a4630', 6) + palm(1560, 900, 300, 30, '#38944f', '#5a4630', 4.6))
        + mv('usfall', { ad: '1.4s', dx: '-20px', d: '-.2s' }, dots('M200 -40v900M520 -40v900M1020 -40v900M1300 -40v900', '#e8f2f8', 2, 40, '', ' opacity=".4"'))
        + finish(0.3);
    } });

  /* ---------- Singapore: Marina Bay Sands and the bay on a bright morning ---------- */
  asiaSceneAdd({ key: 'country:SG', label: 'Marina Bay on a bright morning', site: 'Marina Bay Sands', colour: 'blue', mood: 'energetic', season: 'any', tags: ['skyline', 'bay', 'tropical'],
    svg: () => {
      const s1 = U(), w1 = U();
      const slab = (x, lean) => `<path fill="#dfe6ee" d="M${x} 640L${x + lean} 270H${x + lean + 60}L${x + 60} 640z"/><path fill="#b9c8d8" d="M${x + 30} 640L${x + lean + 30} 270H${x + lean + 60}L${x + 60} 640z" opacity=".7"/>` + `<path d="M${x + 8} 600L${x + lean + 8} 290M${x + 20} 600L${x + lean + 20} 290" stroke="#8aa2b8" stroke-width="2" opacity=".7"/>`;
      const mbs = slab(560, 14) + slab(660, 6) + slab(770, -2)
        + `<path fill="#d4dde8" d="M520 262Q760 232 1010 258L1090 276Q1000 300 760 292Q560 292 520 262z"/><path fill="#aebfd0" d="M520 262Q760 232 1010 258L1090 276Q1000 284 770 276Q560 276 520 262z" opacity=".5"/>`
        + `<path fill="#3a8fc2" d="M900 272Q990 258 1050 266Q1000 276 900 276z" opacity=".8"/><path fill="#8ad4a0" d="M650 256q40 -14 90 -4q-40 8 -90 4z"/>`
        + win(570, 300, 40, 300, 12, 16, '#4a6a8a') + win(672, 300, 40, 300, 12, 16, '#4a6a8a') + win(782, 300, 40, 300, 12, 16, '#4a6a8a');
      const tree = (x, y, h, c1, c2) => `<path fill="#6a5a60" d="M${x - 10} ${y}L${x - 4} ${y - h}H${x + 4}L${x + 10} ${y}z"/><path fill="${c1}" d="M${x - 70} ${y - h + 20}Q${x} ${y - h - 60} ${x + 70} ${y - h + 20}Q${x} ${y - h - 6} ${x - 70} ${y - h + 20}z"/><path fill="${c2}" d="M${x - 50} ${y - h + 6}Q${x} ${y - h - 40} ${x + 50} ${y - h + 6}Q${x} ${y - h - 14} ${x - 50} ${y - h + 6}z" opacity=".8"/>` + dots(`M${x - 56} ${y - h + 18}Q${x} ${y - h - 16} ${x + 56} ${y - h + 18}`, '#ffc8f0', 4, 14, 'us-lamps');
      const sail = (x, y, s, c) => `<path fill="${c}" d="M${x} ${y}V${y - 70 * s}L${x + 40 * s} ${y - 6 * s}z"/><path fill="#fff" d="M${x - 4} ${y - 60 * s}L${x - 34 * s} ${y - 6 * s}H${x - 4}z"/><path fill="#4a3a30" d="M${x - 40 * s} ${y}h${90 * s}l${-10 * s} ${12 * s}h${-70 * s}z"/>`;
      return `<defs>${lin(s1, [[0, '#2f84d8'], [0.5, '#7cc4f0'], [1, '#e4f4fa']])}${lin(w1, [[0, '#8fd8e8'], [0.5, '#2f96c4'], [1, '#1e5f94']])}</defs>` + full(`url(#${s1})`) + stars(41, 20, 160)
        + sun(1350, 190, 34, '#fffef0', '#fff6c0') + cloud(280, 200, 1.3, '#d8e8f4', 0.95, 52, 4) + cloud(900, 120, 1.0, '#e4f0f8', 0.95, 62, 18) + cloud(1200, 330, 1.1, '#d0e2f0', 0.9, 46, 8) + cloud(60, 380, 0.9, '#e0eef8', 0.9, 58, 24)
        + birds(42, 5, 1000, 220, '#2f4a68', 1.3, 700)
        + mv('uspar', { ad: '42s', dx: '10px' }, city(43, -160, 520, 640, 60, 240, 30, 62, '#9fb2c6', 0.35) + city(44, 1110, 1760, 640, 60, 240, 30, 62, '#9fb2c6', 0.35) + city(45, 520, 1110, 640, 20, 70, 30, 60, '#b0c0d0', 0.2))
        + mv('uspar', { ad: '32s', dx: '8px' }, mbs)
        + `<path fill="#f4f6f8" d="M1120 640Q1160 590 1210 584Q1260 580 1300 640z"/><path fill="none" stroke="#c4ced8" stroke-width="3" d="M1160 640Q1190 600 1210 584M1210 640V584M1260 640Q1230 600 1210 584"/>`
        + water(640, '#7fd2e8', '#2f96c4', '#1e5f94') + `<rect y="640" width="1600" height="16" fill="#d8eef6" opacity=".6"/>`
        + shimmer(46, 52, 0, 1600, 660, 880, '#e8fbff', 90)
        + mv('usmove', { ad: '60s', dx: '700px' }, sail(500, 760, 1.4, '#e84a3a')) + mv('usbob', { ad: '4s', dy: '3px' }, mv('usmove', { ad: '80s', dx: '600px' }, sail(1100, 800, 1.8, '#f0a82a')))
        + mv('uspar', { ad: '26s', dx: '10px' }, `<path fill="#4a9a58" d="M1100 900V800Q1300 760 1760 790V900z"/>` + tree(1300, 800, 300, '#3a8a5a', '#d070b8') + tree(1480, 810, 250, '#3a8a5a', '#d070b8') + tree(1170, 830, 200, '#3a8a5a', '#d070b8'))
        + mv('uspar', { ad: '20s', dx: '8px' }, `<path fill="#2f7a48" d="M-160 860Q300 820 700 850V900H-160z"/>` + palm(150, 900, 320, 50, '#2f9a50', '#6a5238', 5) + palm(310, 900, 220, -30, '#38a858', '#6a5238', 6))
        + finish(0.3);
    } });

  /* ---------- Thailand: Wat Arun on the river at dawn ---------- */
  asiaSceneAdd({ key: 'country:TH', label: 'Wat Arun on the river at dawn', site: 'Wat Arun and the Chao Phraya', colour: 'pink', mood: 'dreamy', season: 'any', tags: ['temple', 'river', 'dawn'],
    svg: () => {
      const s1 = U(), w1 = U();
      const prang = (x, base, h, w, fill, shade) => {
        let o = '', y = base; const tiers = 6, th = h / tiers;
        for (let i = 0; i < tiers; i++) {
          const wb = w * (1 - i * 0.14), wt = w * (1 - (i + 1) * 0.14);
          o += `<path fill="${fill}" d="M${R(x - wb / 2)} ${R(y)}L${R(x - wt / 2 - 3)} ${R(y - th)}H${R(x + wt / 2 + 3)}L${R(x + wb / 2)} ${R(y)}z"/><path fill="${shade}" d="M${x} ${R(y)}H${R(x + wb / 2)}L${R(x + wt / 2 + 3)} ${R(y - th)}H${x}z" opacity=".5"/>`
            + `<path d="M${R(x - wb / 2 + 4)} ${R(y - th * 0.5)}h${R(wb - 8)}" stroke="#c9ad7a" stroke-width="3" stroke-dasharray="6 5"/><path d="M${R(x - wt / 2 - 4)} ${R(y - th)}h${R(wt + 8)}" stroke="#a88a52" stroke-width="3"/>`
            + `<path fill="none" stroke="#b9a07a" stroke-width="2" d="M${R(x - wb * 0.2)} ${R(y)}V${R(y - th)}M${R(x + wb * 0.2)} ${R(y)}V${R(y - th)}"/>`;
          y -= th;
        }
        return o + `<path fill="${fill}" d="M${R(x - w * 0.12)} ${R(y)}Q${x} ${R(y - h * 0.22)} ${R(x + w * 0.12)} ${R(y)}z"/><path d="M${x} ${R(y - h * 0.16)}V${R(y - h * 0.34)}" stroke="#d6b050" stroke-width="3"/><path d="M${x - 8} ${R(y - h * 0.26)}h16" stroke="#d6b050" stroke-width="3"/>`;
      };
      const longtail = (x, y, s) => `<path fill="#6a3a22" d="M${x - 110 * s} ${y}Q${x - 60 * s} ${y + 18 * s} ${x} ${y + 18 * s}H${x + 80 * s}Q${x + 110 * s} ${y + 8 * s} ${x + 130 * s} ${y - 14 * s}z"/><path fill="#d8a640" d="M${x - 30 * s} ${y - 2 * s}l${10 * s} ${-28 * s}h${60 * s}l${10 * s} ${28 * s}z"/><path d="M${x - 110 * s} ${y - 4 * s}L${x - 170 * s} ${y - 20 * s}" stroke="#3a2a22" stroke-width="${R(4 * s)}"/>` + puffs(x - 120 * s, y - 6 * s, 3, '#fff', 9 * s, -40, 2.2, -10, 3);
      return `<defs>${lin(s1, [[0, '#6a6aa8'], [0.35, '#e898a8'], [0.7, '#ffbc86'], [1, '#ffe2a0']])}${lin(w1, [[0, '#f0a890'], [0.35, '#b27aa0'], [1, '#4f5688']])}</defs>` + full(`url(#${s1})`) + stars(51, 40, 220)
        + rays(800, 560, 1100, '#ffe3b0', 0.14) + sun(800, 560, 48, '#fff6d8', '#ffb078', true) + streak(300, 250, 300, '#ffa8a8', 0.55) + streak(1300, 320, 320, '#ff9a90', 0.55, 70) + cloud(1200, 200, 0.9, '#c88aa8', 0.75, 52, 8, '#ffd0b4') + cloud(380, 380, 0.8, '#d49aa8', 0.75, 48, 20, '#ffd6b8')
        + birds(52, 4, 1050, 360, '#4a3858', 1.2, 600)
        + mv('uspar', { ad: '44s', dx: '10px' }, city(53, -160, 420, 650, 40, 120, 28, 50, '#9a7a98', 0.25) + city(54, 1180, 1760, 650, 40, 120, 28, 50, '#9a7a98', 0.25))
        + haze(520, 120, '#ffd0a8', 0.5)
        + mv('uspar', { ad: '34s', dx: '8px' }, prang(560, 660, 190, 100, '#e6d9c4', '#b79a8a') + prang(1040, 660, 190, 100, '#e6d9c4', '#b79a8a')
          + `<path fill="#d8cab4" d="M680 660V560H920V660z"/><path fill="#cdbca2" d="M700 660V590H900V660z"/>`
          + prang(800, 570, 440, 220, '#efe3cc', '#b99a86')
          + `<path fill="#d0b56a" d="M600 660H1000L1020 690H580z"/>` + lit(764, 600, 18, 30) + lit(818, 600, 18, 30))
        + `<path fill="#4a7a4a" d="M-160 668Q100 620 280 650T520 664V690H-160z" opacity=".85"/>` + canopy('#3a6a44', 650, 30, 6, 1080, 1760, 690)
        + water(680, '#e8a68e', '#a06a92', '#3f4a7c')
        + `<g opacity=".3" transform="translate(0 1230) scale(1 -1)"><g fill="#efe3cc"><path d="M740 640h120L820 230H780z"/><path d="M530 640h60l-30 -200z"/><path d="M1010 640h60l-30 -200z"/></g></g>`
        + shimmer(56, 56, 0, 1600, 700, 880, '#ffe4b8', 90)
        + mv('usmove', { ad: '40s', dx: '900px' }, longtail(900, 790, 1.2)) + mv('usbob', { ad: '4s', dy: '3px' }, mv('usmove', { ad: '90s', dx: '300px' }, longtail(300, 840, 0.8)))
        + mv('uspar', { ad: '22s', dx: '8px' }, palm(120, 900, 420, 60, '#2f6a44', '#4a3a30', 5) + palm(1480, 900, 400, -60, '#2a6040', '#4a3a30', 6) + palm(240, 900, 260, -20, '#386a4a', '#4a3a30', 4.5))
        + finish(0.3);
    } });

  /* ---------- Vietnam: limestone karsts and junks in a misty bay ---------- */
  asiaSceneAdd({ key: 'country:VN', label: 'Karsts and junks in a misty bay', site: 'Ha Long Bay', colour: 'green', mood: 'calm', season: 'any', tags: ['bay', 'karst', 'junk', 'mist'],
    svg: () => {
      const s1 = U(), w1 = U();
      const karst = (x, base, w, h, fill, hi, seed) => {
        const r = rnd(seed), j = () => R((r() - 0.5) * w * 0.14);
        const d = `M${x - w / 2} ${base}Q${x - w * 0.52} ${base - h * 0.4} ${x - w * 0.36 + j()} ${base - h * 0.72}Q${x - w * 0.3} ${base - h * 0.95} ${x - w * 0.1 + j()} ${base - h}Q${x + w * 0.12} ${base - h * 1.02} ${x + w * 0.28 + j()} ${base - h * 0.82}Q${x + w * 0.46} ${base - h * 0.45} ${x + w / 2} ${base}z`;
        return `<path fill="${fill}" d="${d}"/><path fill="${hi}" d="M${x + w * 0.02} ${base - h}Q${x + w * 0.12} ${base - h * 1.02} ${x + w * 0.28} ${base - h * 0.82}Q${x + w * 0.46} ${base - h * 0.45} ${x + w / 2} ${base}H${x + w * 0.1}Q${x + w * 0.2} ${base - h * 0.5} ${x + w * 0.02} ${base - h}z" opacity=".5"/>`
          + `<path fill="#4a8a58" d="M${x - w * 0.16} ${base - h * 0.96}Q${x + w * 0.1} ${base - h * 1.08} ${x + w * 0.26} ${base - h * 0.84}Q${x + w * 0.1} ${base - h * 0.88} ${x - w * 0.16} ${base - h * 0.96}z" opacity=".85"/>`;
      };
      return `<defs>${lin(s1, [[0, '#bfd8d4'], [0.5, '#e6efe2'], [1, '#fbf3d8']])}${lin(w1, [[0, '#a9d4c4'], [0.4, '#4f9e8c'], [1, '#2a6e6e']])}</defs>` + full(`url(#${s1})`) + stars(61, 24, 200)
        + sun(1100, 300, 40, '#fffbe8', '#fff0b8') + cloud(300, 180, 1.2, '#dde8e6', 0.85, 56, 4) + cloud(1300, 140, 1.0, '#e6eeea', 0.85, 48, 16)
        + birds(62, 4, 700, 250, '#3a5a54', 1.3, 640)
        + mv('uspar', { ad: '60s', dx: '8px' }, karst(260, 560, 220, 200, '#a9c4bc', '#d4e4de', 1) + karst(520, 560, 180, 260, '#a4bfb8', '#d0e2dc', 2) + karst(1220, 560, 240, 230, '#a6c2ba', '#d2e2dc', 3) + karst(1470, 560, 200, 290, '#a3beb6', '#cfe0da', 4))
        + haze(440, 140, '#eef6ee', 0.65)
        + mv('uspar', { ad: '46s', dx: '12px' }, karst(120, 610, 260, 280, '#7fa8a0', '#b4d0c8', 5) + karst(700, 610, 200, 190, '#86aea6', '#b8d4cc', 6) + karst(960, 610, 280, 340, '#7aa49c', '#b0ccc4', 7) + karst(1560, 610, 240, 260, '#82aaa2', '#b6d0c8', 8))
        + haze(520, 120, '#f4f8ee', 0.7)
        + water(600, '#cfe6d6', '#6fb0a0', '#2f7a78') + `<rect y="600" width="1600" height="20" fill="#f4f8ee" opacity=".6"/>`
        + mv('uspar', { ad: '34s', dx: '14px' }, karst(480, 700, 300, 250, '#5c8f84', '#98c0b4', 9) + karst(1360, 720, 340, 300, '#568a7e', '#92bcb0', 10))
        + `<g opacity=".25" transform="translate(0 1330) scale(1 -1)">${karst(480, 700, 300, 250, '#5c8f84', '#98c0b4', 9)}</g>`
        + shimmer(66, 50, 0, 1600, 640, 880, '#f0fffa', 90)
        + mv('usmove', { ad: '80s', dx: '500px' }, mv('usbob', { ad: '5s', dy: '3px' }, junk(860, 770, 1.8, '#b8452a', '#3a2418', 3))) + mv('usmove', { ad: '100s', dx: '400px' }, junk(260, 700, 0.9, '#a83a28', '#3a2418', 2))
        + mv('usdrift', { ad: '50s', dx: '140px' }, `<ellipse cx="800" cy="580" rx="900" ry="40" fill="#f4f8ee" opacity=".55"/><ellipse cx="400" cy="680" rx="700" ry="30" fill="#f4f8ee" opacity=".45"/>`)
        + `<path fill="#2f5a4a" d="M-160 900V850Q100 810 260 860T520 880V900z"/>` + canopy('#244a3c', 868, 24, 5, -160, 560, 900)
        + finish(0.3);
    } });

  /* ---------- Philippines: a bangka in a turquoise lagoon under limestone cliffs ---------- */
  asiaSceneAdd({ key: 'country:PH', label: 'A bangka in a turquoise lagoon', site: 'A limestone lagoon', colour: 'teal', mood: 'cheerful', season: 'any', tags: ['lagoon', 'island', 'boat', 'beach'],
    svg: () => {
      const s1 = U(), w1 = U();
      const cliff = (x, base, w, h, fill, hi, seed) => {
        const r = rnd(seed), j = () => R((r() - 0.5) * 30);
        return `<path fill="${fill}" d="M${x - w / 2} ${base}L${x - w * 0.5 + j()} ${base - h * 0.55}Q${x - w * 0.46} ${base - h * 0.85} ${x - w * 0.22} ${base - h * 0.96}Q${x} ${base - h * 1.04} ${x + w * 0.24} ${base - h * 0.92}Q${x + w * 0.48} ${base - h * 0.78} ${x + w * 0.5 + j()} ${base - h * 0.4}L${x + w / 2} ${base}z"/>`
          + `<path fill="${hi}" d="M${x + w * 0.1} ${base - h * 1.03}Q${x + w * 0.3} ${base - h * 0.9} ${x + w * 0.5} ${base - h * 0.4}L${x + w / 2} ${base}H${x + w * 0.14}Q${x + w * 0.26} ${base - h * 0.5} ${x + w * 0.1} ${base - h * 1.03}z" opacity=".5"/>`
          + `<path d="M${x - w * 0.3} ${base}V${base - h * 0.5}M${x - w * 0.1} ${base}V${base - h * 0.7}M${x + w * 0.1} ${base}V${base - h * 0.4}" stroke="#7a6a58" stroke-width="3" opacity=".35"/>`
          + `<path fill="#3f8f4e" d="M${x - w * 0.46} ${base - h * 0.6}Q${x - w * 0.4} ${base - h * 0.9} ${x - w * 0.2} ${base - h * 0.96}Q${x} ${base - h * 1.06} ${x + w * 0.22} ${base - h * 0.93}Q${x} ${base - h * 0.88} ${x - w * 0.2} ${base - h * 0.84}Q${x - w * 0.4} ${base - h * 0.74} ${x - w * 0.46} ${base - h * 0.6}z"/>`
          + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<circle cx="${R(x - w * 0.2 + i * w * 0.06)}" cy="${R(base - h * (1.0 + 0.025 * Math.cos(i * 0.9 - 2)) + 8)}" r="${16 + (i % 3) * 5}" fill="#2f7a40"/>`).join('');
      };
      const bangka = (x, y, s) => `<path d="M${x - 130 * s} ${y + 18 * s}Q${x - 100 * s} ${y + 30 * s} ${x - 100 * s} ${y + 40 * s}M${x + 130 * s} ${y + 18 * s}Q${x + 100 * s} ${y + 30 * s} ${x + 100 * s} ${y + 40 * s}" stroke="#7a5a3a" stroke-width="${R(4 * s)}" fill="none"/><path d="M${x - 150 * s} ${y + 42 * s}H${x + 150 * s}" stroke="#8a6a44" stroke-width="${R(6 * s)}" stroke-linecap="round"/>`
        + `<path fill="#e4b43a" d="M${x - 120 * s} ${y}Q${x - 90 * s} ${y + 26 * s} ${x - 40 * s} ${y + 26 * s}H${x + 60 * s}Q${x + 110 * s} ${y + 18 * s} ${x + 140 * s} ${y - 12 * s}z"/><path fill="#2f8ec0" d="M${x - 110 * s} ${y + 8 * s}Q${x - 80 * s} ${y + 22 * s} ${x - 38 * s} ${y + 22 * s}H${x + 60 * s}Q${x + 100 * s} ${y + 16 * s} ${x + 128 * s} ${y - 4 * s}z"/>`
        + `<path fill="#d8402a" d="M${x - 40 * s} ${y}l${10 * s} ${-44 * s}h${80 * s}l${10 * s} ${44 * s}z"/><path d="M${x - 30 * s} ${y - 44 * s}h${100 * s}" stroke="#5a3a22" stroke-width="${R(4 * s)}"/>`;
      return `<defs>${lin(s1, [[0, '#2f8ee0'], [0.5, '#79c6f2'], [1, '#d8f0f6']])}${lin(w1, [[0, '#a8f0e0'], [0.35, '#37c4c0'], [1, '#126f9a']])}</defs>` + full(`url(#${s1})`) + stars(71, 20, 160)
        + sun(1250, 140, 38, '#fffef0', '#fff6c0') + cloud(260, 190, 1.3, '#e8f4fa', 0.95, 56, 4) + cloud(780, 120, 1.0, '#f0f8fc', 0.95, 62, 16) + cloud(1400, 300, 1.0, '#e4f2f8', 0.9, 48, 8)
        + birds(72, 5, 800, 260, '#2f4a60', 1.4, 700)
        + mv('uspar', { ad: '50s', dx: '8px' }, `<path fill="#9fc0c4" d="M-160 560Q200 520 440 540T900 530T1400 550T1760 540V620H-160z"/>` + canopy('#6ea88a', 540, 12, 12, -160, 1760, 580))
        + haze(520, 90, '#e8f6f4', 0.6)
        + water(580, '#8fe8de', '#37c4c0', '#126f9a')
        + mv('uspar', { ad: '42s', dx: '12px' }, cliff(300, 640, 520, 470, '#c9bfae', '#e6dcca', 21) + cliff(1360, 650, 600, 520, '#c6bca9', '#e4dac6', 22) + cliff(840, 600, 260, 150, '#b8c0b0', '#d6dccc', 23))
        + `<rect y="600" width="1600" height="300" fill="url(#${w1})" opacity=".55"/>`
        + `<ellipse cx="700" cy="760" rx="520" ry="90" fill="#a8f2e4" opacity=".35"/><path fill="#f1e6c8" d="M-160 640Q80 626 220 650Q300 660 360 650V690Q100 700 -160 690z" opacity=".9"/>`
        + shimmer(75, 60, 0, 1600, 640, 880, '#f4fffc', 90)
        + mv('usbob', { ad: '4s', dy: '5px' }, mv('usmove', { ad: '70s', dx: '300px' }, bangka(780, 760, 1.6)))
        + mv('usmove', { ad: '120s', dx: '500px' }, bangka(1300, 650, 0.55))
        + mv('uspar', { ad: '20s', dx: '8px' }, `<path fill="#f0e2bc" d="M1000 900Q1200 840 1760 850V900z"/>` + palm(1520, 880, 330, -60, '#2f9a50', '#6a5238', 5) + palm(1640, 880, 250, 20, '#38a858', '#6a5238', 6))
        + finish(0.3);
    } });
})();
