/* ============================================================
   ASIA FULL-SCREEN SCENES, batch 6 (Bhutan, Maldives, Afghanistan, Mumbai, Delhi, Bengaluru, Kolkata, Chennai,
   Hyderabad, Karachi, Lahore). PURE classic script: registers entries with asiaSceneAdd() (71-anim-asia.js).
   Each svg() returns the inside of a 1600 x 900 drawing, layered, painted for daytime; the evening grade
   (us-tint, us-lit, us-lamps, us-star) is laid over it by the theme / time of day. Landscape and architecture only.
   ============================================================ */
(function () {
  const K = usSceneKit();
  const { U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, finish } = K;

  /** An onion / bulb dome: centre x, base y, half-width, height; light body, shaded right half, finial. */
  const dome = (cx, by, rx, h, fill, shade, fin) => {
    const d = `M${R(cx - rx)} ${by}C${R(cx - rx * 1.14)} ${R(by - h * 0.5)} ${R(cx - rx * 0.45)} ${R(by - h * 0.82)} ${cx} ${R(by - h)}C${R(cx + rx * 0.45)} ${R(by - h * 0.82)} ${R(cx + rx * 1.14)} ${R(by - h * 0.5)} ${R(cx + rx)} ${by}z`;
    return `<path fill="${fill}" d="${d}"/><path fill="${shade}" opacity=".5" d="M${cx} ${R(by - h)}C${R(cx + rx * 0.45)} ${R(by - h * 0.82)} ${R(cx + rx * 1.14)} ${R(by - h * 0.5)} ${R(cx + rx)} ${by}H${cx}z"/>`
      + `<path d="M${cx} ${R(by - h)}v${-R(h * 0.2)}" stroke="${fin || '#d9b24a'}" stroke-width="${Math.max(2, R(rx / 18))}"/><circle cx="${cx}" cy="${R(by - h * 1.2)}" r="${Math.max(3, R(rx / 14))}" fill="${fin || '#d9b24a'}"/>`;
  };
  /** A pointed (Mughal) arch opening, base centre cx, base y, width, height. */
  const arch = (cx, by, w, h) => `M${R(cx - w / 2)} ${by}V${R(by - h * 0.56)}Q${R(cx - w / 2)} ${R(by - h * 0.82)} ${cx} ${R(by - h)}Q${R(cx + w / 2)} ${R(by - h * 0.82)} ${R(cx + w / 2)} ${R(by - h * 0.56)}V${by}z`;
  /** A coconut palm: curved trunk and a crown of fronds that sways. */
  const palm = (x, y, h, lean, s, dark, light, seed) => {
    const r = rnd(seed || R(x + y)), tx = R(x + lean), ty = R(y - h); let f = '';
    for (let i = 0; i < 9; i++) {
      const a = (-170 + i * 20 + r() * 8) * Math.PI / 180, L = (90 + r() * 40) * s;
      const ex = R(tx + Math.cos(a) * L), ey = R(ty + Math.sin(a) * L * 0.55 + L * 0.35), mx = R(tx + Math.cos(a) * L * 0.55), my = R(ty + Math.sin(a) * L * 0.8 - 18 * s);
      f += `<path fill="${i % 2 ? dark : light}" d="M${tx} ${ty}Q${mx} ${R(my - 7 * s)} ${ex} ${ey}Q${mx} ${R(my + 9 * s)} ${tx} ${ty}z"/>`;
    }
    return `<path fill="none" stroke="${dark}" stroke-width="${R(9 * s)}" stroke-linecap="round" d="M${x} ${y}Q${R(x + lean * 0.2)} ${R(y - h * 0.6)} ${tx} ${ty}"/>`
      + mv('ussway2', { ad: (5 + r() * 2).toFixed(1) + 's', d: '-' + R(r() * 5) + 's', to: `${tx}px ${ty}px` }, f + `<circle cx="${tx}" cy="${R(ty + 6)}" r="${R(6 * s)}" fill="${dark}"/>`);
  };
  /** A leafy round tree (trunk + three crowns). */
  const tree = (x, y, h, trunk, c1, c2) => `<path d="M${x} ${y}V${y - h * 0.6}" stroke="${trunk}" stroke-width="${R(h / 12)}" stroke-linecap="round"/>`
    + `<circle cx="${x}" cy="${R(y - h * 0.75)}" r="${R(h * 0.38)}" fill="${c1}"/><circle cx="${R(x - h * 0.24)}" cy="${R(y - h * 0.58)}" r="${R(h * 0.26)}" fill="${c1}"/><circle cx="${R(x + h * 0.26)}" cy="${R(y - h * 0.6)}" r="${R(h * 0.27)}" fill="${c2}"/><circle cx="${R(x + h * 0.06)}" cy="${R(y - h * 0.92)}" r="${R(h * 0.22)}" fill="${c2}" opacity=".85"/>`;
  /** A pine / fir (stack of triangles). */
  const pine = (x, y, h, c1, c2) => { let o = ''; for (let i = 0; i < 4; i++) { const w = h * (0.34 - i * 0.06), yy = y - h * 0.18 - i * h * 0.2; o += `<path fill="${i % 2 ? c2 : c1}" d="M${R(x - w)} ${R(yy)}L${x} ${R(yy - h * 0.34)}L${R(x + w)} ${R(yy)}z"/>`; } return `<path d="M${x} ${y}v${-R(h * 0.2)}" stroke="#4a3a30" stroke-width="${R(h / 18)}"/>` + o; };
  /** A camel silhouette (x,y = feet line), facing right. */
  const camel = (x, y, s, col) => `<g fill="${col}" transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-70" rx="46" ry="22"/><path d="M-22 -86Q-8 -124 8 -88Q-4 -80 -22 -86z"/><path d="M34 -80Q58 -112 62 -138L74 -140Q80 -128 70 -120L74 -112Q70 -102 54 -62z"/><path d="M62 -138Q82 -150 92 -138Q94 -128 80 -128Q70 -128 66 -122z"/>`
    + `<path d="M-34 -58L-36 0H-28L-22 -50zM-12 -52L-12 0H-4L2 -50zM18 -52L22 0H30L32 -52zM36 -56L42 0H50L48 -58z"/><path d="M-44 -76Q-56 -66 -52 -50" fill="none" stroke="${col}" stroke-width="4"/></g>`;
  /** A string of small boats / dhows: hull, mast and a triangular sail. */
  const dhow = (x, y, s, hull, sail) => `<path fill="${hull}" d="M${R(x - 70 * s)} ${y}L${R(x + 80 * s)} ${R(y - 14 * s)}L${R(x + 56 * s)} ${R(y + 18 * s)}H${R(x - 46 * s)}z"/><path d="M${R(x + 4 * s)} ${R(y - 4 * s)}V${R(y - 110 * s)}" stroke="#4a3a2a" stroke-width="${R(3 * s)}"/><path fill="${sail}" d="M${R(x + 8 * s)} ${R(y - 106 * s)}L${R(x + 74 * s)} ${R(y - 14 * s)}L${R(x + 8 * s)} ${R(y - 10 * s)}z"/><path fill="${sail}" opacity=".8" d="M${R(x)} ${R(y - 96 * s)}L${R(x - 50 * s)} ${R(y - 10 * s)}H${R(x)}z"/>`;
  /** Jagged snow peaks: polygon with a lit and a shaded face. */
  const peaks = (seed, y, amp, n, base, lit1, shade) => {
    const r = rnd(seed), p = []; for (let i = 0; i <= n; i++) p.push([-160 + i * 1920 / n, i % 2 ? y - amp * (0.5 + r() * 0.5) : y + 70 - r() * 40]);
    let d = `M${R(p[0][0])} ${y + 240}`, tips = '', sh = ''; p.forEach(([a, b], i) => { d += `L${R(a)} ${R(b)}`; if (i % 2 && i < n) { const w = 60 + r() * 30; tips += `M${R(a)} ${R(b)}L${R(a - 60)} ${R(b + 78)}l${R(18)} ${-R(14)}l${R(16)} ${R(20)}l${R(14)} ${-R(16)}l${R(14)} ${R(18)}l${R(20)} ${-R(12)}z`; sh += `M${R(a)} ${R(b)}L${R(a + w + 40)} ${R(b + 130)}L${R(a + 10)} ${R(b + 150)}z`; } });
    return `<path fill="${base}" d="${d}L1760 ${y + 240}z"/><path fill="${shade}" opacity=".55" d="${sh}"/><path fill="${lit1}" d="${tips}"/>`;
  };
  /** Stripes of window dots on a block. */
  const win = (x, y, w, h, sx, sy, glass) => { let d = ''; for (let yy = y; yy < y + h; yy += sy) d += `M${x} ${yy}h${w}`; return dots(d, glass || '#3a4660', 5, sx, '', ' opacity=".5"') + dots(d, '#ffd27a', 5, sx, 'us-lamps'); };
  const city = (seed, x0, x1, base, hmin, hmax, wmin, wmax, fill, wc) => {
    const r = rnd(seed); let x = x0, o = '', w = '';
    while (x < x1) { const bw = wmin + r() * (wmax - wmin), bh = hmin + r() * (hmax - hmin); o += `<rect x="${R(x)}" y="${R(base - bh)}" width="${R(bw)}" height="${R(bh)}"/>`; if (wc && r() < wc && bw > 22) w += win(R(x + 6), R(base - bh + 12), R(bw - 12), R(bh - 24), 12, 22); x += bw + r() * 4; }
    return `<g fill="${fill}">${o}</g>${w}`;
  };
  const petals = (seed, n, cols, y1) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) o += `<ellipse class="x-usfall" style="--ad:${R(8 + r() * 8)}s;--d:-${R(r() * 14)}s;--dx:${R(-90 + r() * 180)}px" cx="${R(r() * 1600)}" cy="${R(r() * (y1 || 300))}" rx="${(3 + r() * 3).toFixed(1)}" ry="${(1.6 + r() * 1.6).toFixed(1)}" fill="${cols[i % cols.length]}"/>`; return o; };
  const ripples = (y0, y1, col, seed, n) => shimmer(seed, n || 40, -100, 1700, y0, y1, col, 46);

  /* ---------- Bhutan: the cliff monastery at Paro, in morning mist ---------- */
  asiaSceneAdd({ key: 'country:BT', label: 'The cliff monastery above Paro', site: 'Taktsang, the Tiger\'s Nest', colour: 'amber', mood: 'calm', season: 'any', tags: ['monastery', 'himalaya', 'cliff'],
    svg: () => {
      const s1 = U(), c1 = U(), g1 = U(); const r = rnd(41);
      const gompa = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f4ecdc"/><rect x="${x}" y="${R(y + h * 0.18)}" width="${w}" height="${R(h * 0.2)}" fill="#a8412c"/><rect x="${R(x + w * 0.1)}" y="${R(y + h * 0.5)}" width="${R(w * 0.14)}" height="${R(h * 0.3)}" fill="#3a2a24"/><rect x="${R(x + w * 0.72)}" y="${R(y + h * 0.5)}" width="${R(w * 0.14)}" height="${R(h * 0.3)}" fill="#3a2a24"/>`
        + `<path fill="#c6902c" d="M${R(x - w * 0.12)} ${y}L${R(x + w * 0.2)} ${R(y - h * 0.34)}H${R(x + w * 0.8)}L${R(x + w * 1.12)} ${y}z"/><path fill="#e8c35a" d="M${R(x + w * 0.2)} ${R(y - h * 0.34)}H${R(x + w * 0.8)}L${R(x + w * 0.9)} ${R(y - h * 0.18)}H${R(x + w * 0.1)}z"/><rect x="${R(x + w * 0.46)}" y="${R(y - h * 0.5)}" width="${R(w * 0.08)}" height="${R(h * 0.16)}" fill="#e8c35a"/>`
        + lit(R(x + w * 0.12), R(y + h * 0.52), R(w * 0.1), R(h * 0.24)) + lit(R(x + w * 0.74), R(y + h * 0.52), R(w * 0.1), R(h * 0.24));
      let streaks = ''; for (let i = 0; i < 26; i++) { const x = 700 + r() * 520; streaks += `M${R(x)} ${R(220 + r() * 300)}l${R(r() * 16 - 8)} ${R(120 + r() * 240)}`; }
      return `<defs>${lin(s1, [[0, '#6aa3d6'], [0.5, '#bcdcec'], [1, '#fbf1d8']])}${lin(c1, [[0, '#8a735c'], [0.5, '#a58a6c'], [1, '#6e5a48']])}${lin(g1, [[0, '#fff6e0', 0.6], [1, '#fff6e0', 0]])}</defs>`
        + full(`url(#${s1})`) + stars(5, 24, 220) + rays(420, 190, 900, '#fff2c8', 0.16) + sun(420, 190, 38, '#fffbe8', '#ffe8a8')
        + cloud(300, 250, 0.9, '#d4e0ee', 0.8, 60, 6) + cloud(1320, 170, 0.7, '#d8e4f0', 0.75, 52, 20)
        + mv('uspar', { ad: '70s', dx: '10px' }, peaks(3, 360, 190, 9, '#9fb4d0', '#ffffff', '#6f88b0'))
        + haze(380, 130, '#e6f0fa', 0.7)
        + mv('uspar', { ad: '55s', dx: '16px' }, ridge('#6e8c92', 520, 130, 8, 9) + canopy('#4a6e62', 560, 26, 3, -160, 1760))
        + birds(5, 4, 520, 230, '#3a4552', 1.0, 540)
        // the cliff
        + `<path fill="url(#${c1})" d="M610 900V430L650 330L700 262L790 214L890 176L1010 160L1110 196L1160 280L1196 380L1236 500L1290 640V900z"/>`
        + `<path fill="#3b2d24" opacity=".35" d="M1010 160L1110 196L1160 280L1196 380L1236 500L1290 640V900H1100L1090 520L1060 380L1030 250z"/>`
        + `<path fill="none" stroke="#4a3a2c" stroke-width="3" opacity=".4" d="${streaks}"/>`
        
        // waterfall
        + `<path fill="#fff" opacity=".85" d="M1150 400Q1156 520 1146 600L1160 760L1170 760L1164 560Q1170 470 1160 400z"/>` + shimmer(14, 10, 1146, 1166, 430, 740, '#ffffff', 10)
        // monastery on its ledge
        + `<path fill="#6a5644" d="M820 548H1100V572Q1000 580 940 570Q870 582 820 566z"/>`
        + gompa(836, 472, 78, 76) + gompa(932, 440, 96, 110) + gompa(1040, 486, 56, 62)
        + `<path fill="#e8c35a" d="M966 400L976 380L986 400z"/><path d="M976 380v-26" stroke="#e8c35a" stroke-width="3"/><circle cx="976" cy="350" r="5" fill="#e8c35a"/>`
        + mv('uspuff', { ad: '7s', dx: '-30px', dy: '-120px', sc: '2' }, `<circle cx="1020" cy="456" r="9" fill="#fff" opacity=".6"/>`) + mv('uspuff', { ad: '7s', d: '-3.5s', dx: '-30px', dy: '-120px', sc: '2' }, `<circle cx="1020" cy="456" r="9" fill="#fff" opacity=".6"/>`)
        // stair path
        + `<path fill="none" stroke="#cdb48a" stroke-width="6" stroke-dasharray="14 6" opacity=".7" d="M690 800Q780 740 800 680Q830 620 830 580"/>`
        + mv('usdrift', { ad: '40s', dx: '70px' }, `<ellipse cx="760" cy="620" rx="320" ry="38" fill="url(#${g1})"/><ellipse cx="1180" cy="720" rx="360" ry="46" fill="url(#${g1})"/>`)
        // foreground pines
        + mv('uspar', { ad: '26s', dx: '6px' }, `<path fill="#34503f" d="M-160 900V760Q100 700 360 770Q620 820 900 840V900z"/>` + pine(80, 790, 330, '#2f4d3a', '#3b6048') + pine(210, 800, 260, '#2a4634', '#35573f') + pine(380, 810, 210, '#2f4d3a', '#3b6048') + pine(1380, 800, 340, '#2f4d3a', '#3b6048') + pine(1500, 810, 280, '#2a4634', '#35573f') + `<path fill="#34503f" d="M900 900V850Q1300 780 1760 760V900z"/>`)
        + haze(700, 200, '#f4f0e0', 0.35) + finish(0.3);
    } });

  /* ---------- Maldives: overwater villas on a turquoise lagoon at sunset ---------- */
  asiaSceneAdd({ key: 'country:MV', label: 'Overwater villas on a turquoise lagoon', site: 'A lagoon in the atolls', colour: 'teal', mood: 'dreamy', season: 'any', tags: ['lagoon', 'sunset', 'atoll'],
    svg: () => {
      const s1 = U(), w1 = U(), r = rnd(77);
      const villa = (x, y, s) => `<path d="M${R(x - 44 * s)} ${y}v${R(40 * s)}M${R(x - 14 * s)} ${y}v${R(40 * s)}M${R(x + 16 * s)} ${y}v${R(40 * s)}M${R(x + 44 * s)} ${y}v${R(40 * s)}" stroke="#5a4636" stroke-width="${R(4 * s)}"/>`
        + `<rect x="${R(x - 58 * s)}" y="${R(y - 4 * s)}" width="${R(116 * s)}" height="${R(7 * s)}" fill="#a9855c"/><rect x="${R(x - 38 * s)}" y="${R(y - 32 * s)}" width="${R(76 * s)}" height="${R(29 * s)}" fill="#efe2c8"/>`
        + `<path fill="#8a6a40" d="M${R(x - 62 * s)} ${R(y - 30 * s)}L${x} ${R(y - 82 * s)}L${R(x + 62 * s)} ${R(y - 30 * s)}z"/><path fill="#a98450" d="M${R(x - 40 * s)} ${R(y - 46 * s)}L${x} ${R(y - 82 * s)}L${R(x + 12 * s)} ${R(y - 66 * s)}z" opacity=".7"/>`
        + lit(R(x - 28 * s), R(y - 26 * s), R(20 * s), R(18 * s)) + lit(R(x + 8 * s), R(y - 26 * s), R(20 * s), R(18 * s))
        + `<rect x="${R(x - 40 * s)}" y="${R(y + 10 * s)}" width="${R(80 * s)}" height="${R(14 * s)}" fill="#fff" opacity=".18"/>`;
      let vs = ''; const pts = [[1180, 470, 0.42], [1100, 486, 0.5], [1010, 506, 0.6], [900, 534, 0.74], [770, 574, 0.92], [610, 630, 1.14], [400, 716, 1.46]];
      pts.forEach(([x, y, s]) => { vs += villa(x, y, s); });
      let vs2 = ''; [[1260, 456, 0.36], [1330, 466, 0.4], [1420, 480, 0.46], [1520, 498, 0.54]].forEach(([x, y, s]) => { vs2 += villa(x, y, s); });
      const jet = `<path fill="#b39066" d="M250 790L1250 466L1262 470L330 830z"/><path fill="#8a6a44" d="M250 790L330 830V842L250 802z"/>`;
      return `<defs>${lin(s1, [[0, '#2f5a9a'], [0.3, '#b278b0'], [0.55, '#ff9a72'], [0.72, '#ffd08a'], [1, '#ffe9b0']])}${lin(w1, [[0, '#ffb98a'], [0.14, '#43c6c4'], [0.5, '#16a2b4'], [1, '#0c6f94']])}</defs>`
        + full(`url(#${s1})`) + stars(9, 40, 260) + rays(1180, 440, 1000, '#ffd9a0', 0.18) + sun(1180, 444, 46, '#fff4d0', '#ffb070')
        + streak(260, 160, 320, '#ffb0a0', 0.55) + streak(900, 230, 280, '#ffc890', 0.6, 70) + cloud(500, 330, 1.0, '#d98aa0', 0.85, 58, 6, '#ffd6bc') + cloud(1400, 300, 0.8, '#e09a9c', 0.8, 48, 20, '#ffe0c0') + cloud(120, 380, 0.7, '#c47aa8', 0.7, 66, 30, '#ffc8b8')
        + mv('uspar', { ad: '60s', dx: '10px' }, `<path fill="#4f7c70" d="M-160 454Q200 440 600 452Q900 460 1100 452L1100 462H-160z"/><path fill="#3e6a5e" d="M1380 462Q1480 440 1600 452L1760 462z"/>`)
        + `<rect y="466" width="1600" height="434" fill="url(#${w1})"/>`
        + `<path fill="#ffd9a0" opacity=".22" d="M1150 470H1220L1300 900H1000z"/>`
        + `<ellipse cx="560" cy="560" rx="260" ry="40" fill="#9be8d4" opacity=".4"/><ellipse cx="1320" cy="640" rx="200" ry="30" fill="#7fe0d0" opacity=".35"/>`
        + ripples(480, 900, '#fff2d6', 5, 56)
        + mv('uspar', { ad: '36s', dx: '8px' }, vs2) + jet + mv('usbob', { ad: '5s', dy: '2px' }, vs)
        // reflection streaks under the villas
        + `<g opacity=".25" fill="#5a4636"><rect x="365" y="838" width="130" height="8"/><rect x="560" y="780" width="100" height="6"/><rect x="740" y="730" width="70" height="5"/></g>`
        // seaplane
        + mv('usglide', { ad: '34s', d: '-6s', dx: '1500px', dy: '-60px' }, `<g transform="translate(560 250)"><path fill="#f6f2ea" d="M-60 0Q-50 -14 0 -14H46Q70 -10 74 0Q70 8 46 8H-50z"/><rect x="-20" y="-24" width="70" height="7" fill="#e84b4b"/><path d="M-30 8L-42 22M30 8L42 22M-50 22H56" stroke="#9a948a" stroke-width="3"/><path d="M74 0H98" stroke="#555" stroke-width="3"/><circle cx="90" cy="0" r="10" fill="#fff" opacity=".4"/></g>`)
        + birds(4, 5, 400, 200, '#5a3b58', 1.0, 600)
        // palms and sand
        + `<path fill="#f3dcae" d="M-160 900V800Q80 760 260 810Q380 850 330 900z"/><path fill="#e2c28e" d="M-160 900V850Q100 820 260 860Q300 880 330 900z"/><path fill="#7fe0d0" opacity=".5" d="M120 770Q260 790 330 846L300 860Q250 810 100 790z"/>`
        + palm(-20, 830, 360, 120, 1.5, '#2a4a36', '#3e6a48', 3) + palm(120, 840, 300, 40, 1.2, '#2e5038', '#477a50', 8) + palm(1560, 900, 330, -90, 1.4, '#2a4a36', '#3e6a48', 5)
        + finish(0.32);
    } });

  /* ---------- Afghanistan: the blue lakes of Band-e Amir under the Hindu Kush ---------- */
  asiaSceneAdd({ key: 'country:AF', label: 'The blue lakes of Band-e Amir', site: 'Band-e Amir', colour: 'blue', mood: 'proud', season: 'any', tags: ['lakes', 'mountains', 'hindu kush'],
    svg: () => {
      const s1 = U(), c1 = U(), l1 = U(), l2 = U(), r = rnd(23);
      const lake = (cx, cy, rx, ry, id) => `<path fill="#e9dcc2" d="M${R(cx - rx - 14)} ${R(cy + 4)}Q${R(cx - rx * 0.6)} ${R(cy - ry - 16)} ${cx} ${R(cy - ry - 12)}Q${R(cx + rx * 0.7)} ${R(cy - ry - 12)} ${R(cx + rx + 14)} ${R(cy + 2)}Q${R(cx + rx * 0.7)} ${R(cy + ry + 14)} ${cx} ${R(cy + ry + 14)}Q${R(cx - rx * 0.7)} ${R(cy + ry + 14)} ${R(cx - rx - 14)} ${R(cy + 4)}z`
        + `<path fill="#c9b690" d="M${R(cx - rx - 14)} ${R(cy + 4)}Q${R(cx - rx * 0.7)} ${R(cy + ry + 14)} ${cx} ${R(cy + ry + 14)}Q${R(cx + rx * 0.7)} ${R(cy + ry + 14)} ${R(cx + rx + 14)} ${R(cy + 2)}v10Q${R(cx + rx * 0.7)} ${R(cy + ry + 28)} ${cx} ${R(cy + ry + 28)}Q${R(cx - rx * 0.7)} ${R(cy + ry + 28)} ${R(cx - rx - 14)} ${R(cy + 14)}z"/>`
        + `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"/>`;
      return `<defs>${lin(s1, [[0, '#2f7ccf'], [0.5, '#7fb8ea'], [1, '#d8ecf6']])}${lin(c1, [[0, '#c9a06a'], [1, '#8d6a44']])}${lin(l1, [[0, '#0a6fc4'], [1, '#0a3f9a']])}${lin(l2, [[0, '#18b0c8'], [1, '#0a6fb0']])}</defs>`
        + full(`url(#${s1})`) + rays(1300, 120, 900, '#ffffff', 0.12) + sun(1300, 120, 34, '#fffdf0', '#fff0c0')
        + cloud(420, 200, 1.0, '#dbe8f4', 0.9, 62, 4) + cloud(1160, 270, 0.8, '#e0ecf6', 0.85, 54, 22) + streak(700, 120, 320, '#ffffff', 0.5)
        + mv('uspar', { ad: '80s', dx: '8px' }, peaks(6, 400, 230, 8, '#9aa5c4', '#ffffff', '#6c7ba4'))
        + haze(400, 100, '#dfe9f6', 0.55)
        + mv('uspar', { ad: '50s', dx: '14px' }, ridge('#b88f60', 520, 110, 7, 19) + ridge('#a67c52', 590, 90, 9, 7))
        // cliffs behind the lakes
        + `<path fill="url(#${c1})" d="M-160 600L-60 520L40 540L150 470L260 520L360 490L460 540L560 520V680H-160z"/><path fill="url(#${c1})" d="M1040 540L1140 490L1260 520L1380 460L1500 510L1620 480L1760 540V700H1040z"/>`
        + `<path fill="#6b4c30" opacity=".35" d="M150 470L260 520L360 490V680H200z M1380 460L1500 510L1620 480V700H1450z"/>`
        // the terraced lakes
        + lake(800, 590, 240, 36, l2) + lake(560, 672, 330, 50, l1) + lake(1060, 700, 380, 56, l2) + lake(700, 800, 560, 74, l1)
        + `<g opacity=".7"><ellipse cx="560" cy="672" rx="150" ry="14" fill="#5fd0e0" opacity=".45"/><ellipse cx="1060" cy="700" rx="200" ry="16" fill="#7fe0e8" opacity=".35"/></g>`
        + ripples(580, 860, '#bff4ff', 8, 50)
        // a stream of water over the travertine dam
        + `<path fill="#bfeaf0" opacity=".8" d="M1180 706L1200 706L1204 740L1186 740z"/>`
        + birds(8, 4, 900, 330, '#3a4a60', 1.0, 600)
        // foreground rock and grass
        + mv('uspar', { ad: '26s', dx: '6px' }, `<path fill="#7e5b3a" d="M-160 900V800Q100 770 250 820L360 900z"/><path fill="#9c7448" d="M-160 900V850Q40 820 160 860L200 900z"/><path fill="#8a6a42" d="M1300 900Q1400 800 1560 790Q1700 800 1760 830V900z"/><path fill="#6f9a52" opacity=".8" d="M1400 900Q1500 850 1600 860V900z"/>`)
        + haze(760, 160, '#fff6e0', 0.2) + finish(0.3);
    } });

  /* ---------- Mumbai: the arch on the waterfront at dusk ---------- */
  asiaSceneAdd({ key: 'place:mumbai', label: 'The harbour arch and the old hotel', site: 'The waterfront arch on Mumbai harbour', colour: 'orange', mood: 'energetic', season: 'any', tags: ['harbour', 'arch', 'dusk'],
    svg: () => {
      const s1 = U(), w1 = U(), st = '#c9a35e', sh = '#a07d44';
      const tur = (x, y) => `<rect x="${x - 14}" y="${y}" width="28" height="86" fill="${st}"/><rect x="${x - 18}" y="${y - 6}" width="36" height="10" fill="${sh}"/>${dome(x, y - 6, 18, 30, '#d8b872', '#a07d44', '#8a6a34')}<rect x="${x - 6}" y="${y + 24}" width="12" height="24" fill="#3a2a1a" opacity=".6"/>`;
      return `<defs>${lin(s1, [[0, '#35407e'], [0.34, '#b46a9e'], [0.62, '#ff8e5a'], [0.82, '#ffc470'], [1, '#ffe2a0']])}${lin(w1, [[0, '#f09068'], [0.2, '#5a6aa0'], [1, '#1c2a5c']])}</defs>`
        + full(`url(#${s1})`) + stars(12, 40, 240) + rays(1180, 600, 1100, '#ffd09a', 0.15) + sun(1180, 600, 60, '#fff0c0', '#ff9a58')
        + streak(300, 170, 320, '#ffa0a0', 0.5) + streak(1000, 260, 300, '#ff9a80', 0.55, 70) + cloud(480, 300, 1.0, '#c27aa0', 0.8, 56, 8, '#ffc0a0') + cloud(1380, 380, 0.8, '#c47a98', 0.8, 46, 22, '#ffd0a8')
        + mv('uspar', { ad: '60s', dx: '8px' }, city(31, -160, 1760, 680, 40, 130, 30, 66, '#9a6f96', 0.25) + haze(560, 120, '#ffc89a', 0.5))
        // the old hotel behind the arch, left
        + mv('uspar', { ad: '36s', dx: '12px' }, `<g fill="#9a5e48"><rect x="150" y="520" width="380" height="164"/><rect x="190" y="470" width="300" height="52"/></g><rect x="150" y="520" width="380" height="14" fill="#7a4838"/>`
          + dome(200, 470, 44, 90, '#7a4a3a', '#4a281e', '#d8b060') + dome(340, 470, 34, 66, '#7a4a3a', '#4a281e', '#d8b060') + dome(480, 470, 44, 90, '#7a4a3a', '#4a281e', '#d8b060')
          + `<path fill="#d8b890" opacity=".8" d="${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `M${178 + i * 44} 684v-96q0-14 14-14t14 14v96z`).join('')}"/>` + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => lit(R(182 + i * 44), 592, 20, 38)).join(''))
        // sea
        + `<rect y="684" width="1600" height="216" fill="url(#${w1})"/><path fill="#ffc080" opacity=".25" d="M1140 686H1220L1300 900H1040z"/>` + ripples(690, 900, '#ffd8a0', 14, 54)
        // the arch
        + `<g><path fill="${sh}" d="M600 760L640 700H960L1000 760z"/><path fill="${st}" fill-rule="evenodd" d="M640 708V440H960V708z ${arch(800, 708, 120, 190)}"/><path fill="#7a5a30" opacity=".35" d="M960 440V708H870V440z"/>`
        + `<path fill="${sh}" d="M626 440H974V418H626z"/><path fill="${st}" d="M648 418H952V396H648z"/>`
        + `<path fill="#3a2a1a" opacity=".55" d="M760 708V610Q760 570 800 548Q840 570 840 610V708z"/>`
        + `<path fill="${sh}" d="M690 460h40v40h-40zM870 460h40v40h-40z" opacity=".6"/><path fill="none" stroke="#7a5a30" stroke-width="3" d="M700 470l20 20M720 470l-20 20M880 470l20 20M900 470l-20 20"/>`
        + `<rect x="760" y="396" width="80" height="22" fill="${st}"/>${dome(800, 396, 56, 92, '#d8b872', '#a07d44', '#8a6a34')}` + tur(656, 354) + tur(944, 354) + tur(706, 354).replace(/<rect x="[^"]*" y="[^"]*" width="12"[^>]*>/, '') + tur(894, 354) + `</g>`
        + lit(786, 570, 28, 60)
        // boats and ferries
        + mv('usmove', { ad: '70s', dx: '1300px' }, dhow(300, 800, 0.9, '#3a2a2a', '#f3e2c0')) + mv('usmove', { ad: '90s', d: '-30s', dx: '1100px' }, dhow(1200, 760, 0.6, '#5a3a2a', '#f0d6a8'))
        + mv('usbob', { ad: '4s', dy: '3px' }, `<path fill="#2a2030" d="M1280 836H1500L1480 868H1300z"/><rect x="1310" y="806" width="140" height="30" fill="#f2e6d4"/>` + lit(1322, 814, 28, 16) + lit(1366, 814, 28, 16) + lit(1410, 814, 28, 16))
        + dots('M-100 760Q400 750 900 756', '#ffd27a', 5, 90, 'us-lamps')
        + birds(15, 7, 700, 300, '#fff0e0', 1.2, 700)
        // foreground quay
        + `<path fill="#3a2a30" d="M-160 900V850H700L760 900z"/><path fill="#2e2228" d="M1300 900V860H1760V900z"/><path fill="#fff" opacity=".25" d="M-160 850H700V856H-160z"/>`
        + finish(0.34);
    } });

  /* ---------- Delhi: a garden tomb of red sandstone and white marble in the morning haze ---------- */
  asiaSceneAdd({ key: 'place:delhi', label: 'The garden tomb of red sandstone and white marble', site: 'A Mughal garden tomb', colour: 'red', mood: 'calm', season: 'any', tags: ['mughal', 'tomb', 'garden', 'haze'],
    svg: () => {
      const s1 = U(), g1 = U(), w1 = U(), red = '#b5523a', redD = '#8a3a2a', wh = '#f2ece0';
      let row = ''; for (let i = 0; i < 9; i++) row += arch(560 + 60 * i + 30, 640, 34, 78);
      let row2 = ''; for (let i = 0; i < 7; i++) row2 += arch(620 + 60 * i + 30, 540, 28, 60);
      let ch = ''; [610, 700, 900, 990].forEach((x) => { ch += `<rect x="${x - 14}" y="428" width="28" height="22" fill="${red}"/>` + dome(x, 428, 20, 32, wh, '#b8a890', '#d8b060'); });
      return `<defs>${lin(s1, [[0, '#9db4c8'], [0.4, '#e8d4b8'], [0.7, '#f8c99a'], [1, '#fbe6bc']])}${lin(g1, [[0, '#7aa05a'], [1, '#3e6e3c']])}${lin(w1, [[0, '#f4d6a8'], [1, '#c7a888']])}</defs>`
        + full(`url(#${s1})`) + rays(1140, 250, 900, '#ffe2b0', 0.16) + sun(1140, 250, 52, '#fff2d0', '#ffc482') + haze(120, 380, '#f6e0c4', 0.55)
        + cloud(360, 220, 0.9, '#e6cdb4', 0.6, 62, 8, '#f6e6d4') + streak(900, 130, 300, '#ffe6c8', 0.5)
        + mv('uspar', { ad: '60s', dx: '8px' }, city(7, -160, 1760, 470, 20, 70, 40, 90, '#c2a592', 0.1) + canopy('#7e9a68', 470, 40, 5))
        + haze(400, 140, '#f4dcc0', 0.6)
        // the tomb
        + `<path fill="${redD}" d="M480 690H1120V642H480z"/><rect x="520" y="540" width="560" height="102" fill="${red}"/><rect x="560" y="450" width="480" height="92" fill="${red}"/>`
        + `<path fill="${wh}" d="M520 540H1080V528H520zM560 450H1040V438H560zM480 650H1120V642H480z" opacity=".85"/>`
        + `<path fill="#4a2a24" opacity=".75" d="${row}"/><path fill="#4a2a24" opacity=".6" d="${row2}"/>`
        + `<path fill="${wh}" fill-rule="evenodd" d="M724 640V470Q724 430 800 400Q876 430 876 470V640z ${arch(800, 640, 112, 170)}"/>` + `<path fill="#4a2a24" opacity=".7" d="${arch(800, 640, 100, 150)}"/>`
        
        + `<rect x="728" y="428" width="144" height="26" fill="${wh}"/><rect x="744" y="388" width="112" height="42" fill="${wh}"/><path fill="${red}" d="M760 396h8v30h-8zM792 396h16v30h-16zM832 396h8v30h-8z" opacity=".5"/>` + ch
        + `<path fill="#d8d0c0" d="M740 386Q740 350 800 340Q860 350 860 386z" opacity=".0"/>` + dome(800, 392, 104, 128, wh, '#b8a890', '#d8b060')
        + `<g fill="#c8b8a0" opacity=".5"><path d="M800 198h2v-14h-2z"/></g>`
        + Array.from({ length: 12 }, (_, i) => lit(R(582 + i * 38), 578, 14, 30)).join('')
        // garden
        + `<rect y="690" width="1600" height="210" fill="url(#${g1})"/>`
        + `<path fill="#d8b890" d="M560 690H1040L1500 900H100z"/><path fill="url(#${w1})" d="M770 694H830L1000 900H600z"/><path fill="#a8d0e0" opacity=".5" d="M778 696H822L930 900H670z"/>` + ripples(700, 900, '#ffffff', 22, 14)
        + `<path fill="${wh}" d="M760 692H840V700H760z"/>`
        + mv('uspar', { ad: '30s', dx: '8px' }, tree(180, 800, 280, '#4e3a2c', '#4f7a40', '#6a9a50') + tree(360, 780, 190, '#4e3a2c', '#5a8a48', '#78a458') + tree(1440, 800, 290, '#4e3a2c', '#4f7a40', '#6a9a50') + tree(1260, 780, 190, '#4e3a2c', '#5a8a48', '#78a458'))
        + `<g fill="#d86a4a" opacity=".85">${Array.from({ length: 22 }, (_, i) => `<circle cx="${130 + i * 66}" cy="${862 + (i % 3) * 8}" r="4"/>`).join('')}</g>`
        + birds(33, 6, 800, 330, '#58a048', 1.3, 700) + birds(34, 3, 400, 250, '#4a3a30', 1.0, 500)
        + haze(500, 200, '#f2dcc2', 0.25) + finish(0.3);
    } });

  /* ---------- Bengaluru: the glasshouse garden under monsoon light, tech towers beyond ---------- */
  asiaSceneAdd({ key: 'place:bengaluru', label: 'The glasshouse garden with the tech towers beyond', site: 'The garden city and its glasshouse', colour: 'green', mood: 'cheerful', season: 'any', tags: ['garden', 'glasshouse', 'tech'],
    svg: () => {
      const s1 = U(), g1 = U(), gl = U(), r = rnd(55);
      let ribs = ''; for (let i = 0; i <= 14; i++) ribs += `M${520 + i * 40} 560V${i % 2 ? 600 : 596}`; let ribs2 = ''; for (let i = 0; i <= 8; i++) ribs2 += `M${640 + i * 40} 470L${640 + i * 40} 560`;
      let towers = ''; [[160, 190, 70], [240, 260, 60], [320, 200, 76], [1260, 240, 70], [1350, 300, 66], [1440, 210, 72], [1530, 260, 60]].forEach(([x, h, w], i) => { towers += `<rect x="${x}" y="${600 - h}" width="${w}" height="${h}" fill="${i % 2 ? '#8aa4b4' : '#7c98aa'}"/><path fill="#bfd6e2" opacity=".35" d="M${x} ${600 - h}h${R(w * 0.4)}v${h}H${x}z"/>` + win(x + 8, 600 - h + 14, w - 16, h - 28, 14, 24, '#4a6678'); });
      let petalTree = (x, y, h, c1, c2, seed) => { const rr = rnd(seed); let o = `<path d="M${x} ${y}Q${x - 10} ${y - h * 0.5} ${x + 8} ${y - h * 0.8}" stroke="#4e3a2e" stroke-width="${R(h / 14)}" fill="none" stroke-linecap="round"/>`; for (let i = 0; i < 16; i++) o += `<circle cx="${R(x + (rr() - 0.5) * h * 0.9)}" cy="${R(y - h * 0.8 - rr() * h * 0.36)}" r="${R(h * (0.1 + rr() * 0.1))}" fill="${i % 2 ? c1 : c2}"/>`; return o; };
      return `<defs>${lin(s1, [[0, '#7aa6c8'], [0.5, '#bcd8e8'], [1, '#eef3e8']])}${lin(g1, [[0, '#7ab252'], [1, '#2f6a3a']])}${lin(gl, [[0, '#d6efe6', 0.85], [1, '#9cd2c0', 0.7]])}</defs>`
        + full(`url(#${s1})`) + rays(800, 60, 1000, '#ffffff', 0.12)
        + cloud(300, 210, 1.2, '#9fb0c4', 0.95, 60, 6, '#f4f8fc') + cloud(1180, 150, 1.0, '#a8b8cc', 0.9, 52, 18, '#f6f9fc') + cloud(820, 300, 0.8, '#b4c2d2', 0.8, 70, 30, '#f8fafc') + cloud(1500, 330, 0.7, '#aebccc', 0.8, 66, 8, '#f4f8fc')
        + mv('uspar', { ad: '60s', dx: '8px' }, ridge('#8aa8a0', 520, 60, 8, 3) + towers + haze(420, 160, '#e0ecf0', 0.55))
        + mv('uspar', { ad: '40s', dx: '12px' }, canopy('#4e8a5a', 620, 80, 11) + canopy('#3e7a4c', 650, 60, 12))
        // glasshouse
        + `<path fill="#6a7a80" d="M470 650H1130V672H470z"/><rect x="500" y="560" width="600" height="92" fill="url(#${gl})"/><path fill="#cfe6de" d="M500 560L800 440L1100 560z" opacity=".95"/><path fill="url(#${gl})" d="M620 560L800 470L980 560z"/>`
        + `<rect x="600" y="470" width="400" height="90" fill="url(#${gl})"/><path fill="#cfe6de" d="M590 470L800 380L1010 470z"/><path fill="#a6d2c6" opacity=".7" d="M650 468L800 396L950 468z"/>`
        + `<path fill="none" stroke="#f8fbf8" stroke-width="3" d="M500 560L800 440L1100 560M590 470L800 380L1010 470M${ribs.replace(/V\d+/g, 'V650')}"/><path fill="none" stroke="#f8fbf8" stroke-width="3" d="M600 470H1000M500 560H1100M500 604H1100"/>`
        + `<path fill="none" stroke="#f8fbf8" stroke-width="3" d="${ribs2}"/><path fill="#fff" opacity=".3" d="M800 380L1010 470L1100 560V652H820z"/>`
        + `<path d="M800 380V344" stroke="#6a7a80" stroke-width="4"/><path fill="#6a7a80" d="M792 346h16l-8-16z"/>`
        + `<path fill="#4e7a5a" opacity=".6" d="M530 650Q560 590 600 650zM620 650Q660 580 700 650zM900 650Q940 590 980 650zM1010 650Q1040 600 1070 650z"/>`
        + lit(520, 580, 40, 56) + lit(1040, 580, 40, 56) + lit(780, 490, 40, 60)
        // lawn and pond
        + `<rect y="650" width="1600" height="250" fill="url(#${g1})"/><ellipse cx="800" cy="800" rx="420" ry="62" fill="#9bd0d8"/><ellipse cx="800" cy="800" rx="420" ry="62" fill="none" stroke="#e8f2e4" stroke-width="6"/>` + ripples(770, 835, '#ffffff', 6, 24)
        + `<g fill="#3f7a40">${Array.from({ length: 7 }, (_, i) => `<ellipse cx="${520 + i * 90}" cy="${790 + (i % 3) * 14}" rx="22" ry="7"/>`).join('')}</g><g fill="#f08ab4">${Array.from({ length: 7 }, (_, i) => `<circle cx="${528 + i * 90}" cy="${786 + (i % 3) * 14}" r="6"/>`).join('')}</g>`
        + `<path fill="none" stroke="#e8d9b0" stroke-width="30" stroke-linecap="round" opacity=".8" d="M-100 880Q300 830 480 790M1700 880Q1300 830 1120 790"/>`
        // flower beds
        + `<g>${Array.from({ length: 36 }, (_, i) => `<circle cx="${40 + i * 44}" cy="${694 + (i * 37 % 20)}" r="${5 + i % 3}" fill="${['#ff7a8a', '#ffd84a', '#ffffff', '#b66ae0'][i % 4]}"/>`).join('')}</g>`
        + mv('uspar', { ad: '30s', dx: '8px' }, petalTree(200, 790, 420, '#ff7040', '#e8441c', 4) + petalTree(1400, 790, 440, '#b07ae0', '#8a5ac8', 5) + petalTree(360, 790, 300, '#ff8a50', '#f05a28', 6) + petalTree(1250, 790, 300, '#c08ae6', '#9a6ad4', 7))
        + petals(8, 20, ['#ff7040', '#b07ae0', '#ffb090'], 500)
        + birds(9, 5, 700, 240, '#3a4a40', 1.1, 600) + finish(0.3);
    } });

  /* ---------- Kolkata: the steel cantilever bridge over the river at sunrise ---------- */
  asiaSceneAdd({ key: 'place:kolkata', label: 'The cantilever bridge over the river at sunrise', site: 'The great steel bridge over the Hooghly', colour: 'amber', mood: 'energetic', season: 'any', tags: ['bridge', 'river', 'sunrise'],
    svg: () => {
      const s1 = U(), w1 = U(), steel = '#2e3036';
      // cantilever profile: anchor arm, tower apex, cantilever, suspended span
      const top = [[160, 470], [380, 214], [700, 330], [900, 330], [1220, 214], [1440, 470]];
      let web = ''; for (let x = 200; x <= 1400; x += 36) { let y; if (x <= 380) y = 470 - (x - 160) * (256 / 220); else if (x <= 700) y = 214 + (x - 380) * (116 / 320); else if (x <= 900) y = 330; else if (x <= 1220) y = 330 - (x - 900) * (116 / 320); else y = 214 + (x - 1220) * (256 / 220); web += `M${x} ${R(y)}V500M${x} ${R(y)}L${x + 36} 500`; }
      return `<defs>${lin(s1, [[0, '#6a7ab4'], [0.3, '#e0a0b0'], [0.55, '#ffb070'], [0.8, '#ffdc98'], [1, '#fff0c0']])}${lin(w1, [[0, '#ffc888'], [0.16, '#c88a78'], [0.5, '#6a6e86'], [1, '#2e3a58']])}</defs>`
        + full(`url(#${s1})`) + stars(3, 26, 200) + rays(800, 560, 1100, '#ffe0a8', 0.2) + sun(800, 560, 62, '#fffae0', '#ffc080')
        + streak(300, 140, 320, '#ffc0b0', 0.5) + streak(1200, 200, 280, '#ffb090', 0.55, 70) + cloud(500, 320, 0.9, '#d890a0', 0.7, 60, 6, '#ffd0b0') + cloud(1300, 360, 0.8, '#d0889c', 0.7, 50, 24, '#ffd8b4')
        + mv('uspar', { ad: '60s', dx: '8px' }, city(2, -160, 1760, 620, 30, 120, 30, 70, '#a98494', 0.15) + haze(540, 110, '#ffd8a8', 0.6))
        + `<rect y="620" width="1600" height="280" fill="url(#${w1})"/><path fill="#ffd8a0" opacity=".25" d="M750 622H850L930 900H670z"/>` + ripples(630, 900, '#ffe6b8', 12, 60)
        // bridge
        + mv('uspar', { ad: '34s', dx: '8px' }, `<path fill="${steel}" d="M-160 520H1760V540H-160z"/><path fill="none" stroke="${steel}" stroke-width="4" d="${web}"/><path fill="none" stroke="${steel}" stroke-width="12" stroke-linejoin="round" d="M${top.map(([x, y]) => `${x} ${y}`).join('L')}"/>`
          + `<path fill="none" stroke="${steel}" stroke-width="5" d="M${top.map(([x, y]) => `${x} ${y + 26}`).join('L')}"/>`
          + `<path fill="${steel}" d="M350 540H410V640H350zM1190 540H1250V640H1190z"/><path fill="#4a3f3c" d="M330 640H430V660H330zM1170 640H1270V660H1170z"/>`
          + `<path fill="none" stroke="#e8c030" stroke-width="3" d="M-160 508H1760" opacity=".0"/>`)
        // taxis on the deck
        + [0, 1, 2, 3, 4, 5].map((i) => mv('usmove', { ad: (26 + i * 5) + 's', d: '-' + (i * 6) + 's', dx: (i % 2 ? '-' : '') + '1500px' }, `<g transform="translate(${180 + i * 230} 506)"><rect width="34" height="12" rx="3" fill="#f0c020"/><rect x="8" y="-7" width="18" height="8" rx="2" fill="#e0b018"/><circle cx="8" cy="12" r="3" fill="#222"/><circle cx="26" cy="12" r="3" fill="#222"/></g>`)).join('')
        + dots('M-100 520H1700', '#ffd27a', 4, 60, 'us-lamps')
        // boats
        + mv('usmove', { ad: '80s', dx: '1200px' }, dhow(260, 770, 1.0, '#3a2c28', '#e8d4b0')) + mv('usmove', { ad: '100s', d: '-40s', dx: '1000px' }, dhow(1250, 720, 0.6, '#4a3228', '#f0dcb8'))
        + mv('usbob', { ad: '4s', dy: '3px' }, `<path fill="#2a2a30" d="M1100 800H1380L1356 836H1124z"/><rect x="1140" y="768" width="200" height="30" fill="#e8dcc8"/><rect x="1180" y="746" width="100" height="22" fill="#d8ccb8"/>` + lit(1156, 776, 30, 16) + lit(1206, 776, 30, 16) + lit(1256, 776, 30, 16) + lit(1306, 776, 22, 16))
        + birds(17, 8, 700, 260, '#4a3a3a', 1.2, 700)
        // ghat in the foreground
        + `<path fill="#6a5448" d="M-160 900V840H300L360 900z"/><path fill="#7a6254" d="M-160 900V870H220L250 900z"/><path fill="#5a463c" d="M1260 900V850H1760V900z"/>` + `<path d="M120 840V740" stroke="#4a3a30" stroke-width="6"/>` + mv('uspuff', { ad: '6s', dx: '30px', dy: '-80px', sc: '2' }, `<circle cx="120" cy="740" r="8" fill="#fff" opacity=".5"/>`)
        + haze(560, 200, '#ffd6a8', 0.25) + finish(0.32);
    } });

  /* ---------- Chennai: a Dravidian temple tower at dawn above its tank ---------- */
  asiaSceneAdd({ key: 'place:chennai', label: 'The temple tower above its tank at dawn', site: 'A South Indian gopuram and temple tank', colour: 'pink', mood: 'proud', season: 'any', tags: ['temple', 'gopuram', 'dawn'],
    svg: () => {
      const s1 = U(), w1 = U(), r = rnd(88);
      const cols = ['#e8508a', '#3aa8b8', '#f2c040', '#f4f0e4', '#e86a3a', '#7a5ac8'];
      let tiers = '', fig = '';
      for (let i = 0; i < 7; i++) {
        const w = 400 - i * 44, y = 640 - (i + 1) * 58, c = cols[i % cols.length];
        tiers += `<rect x="${800 - w / 2}" y="${y}" width="${w}" height="52" fill="${c}"/><rect x="${800 - w / 2 - 6}" y="${y + 48}" width="${w + 12}" height="10" fill="#d8c8a8"/><rect x="${800 - w / 2 - 6}" y="${y - 2}" width="${w + 12}" height="6" fill="#f4ecd8"/>`;
        let pd = ''; for (let k = 0; k < Math.floor(w / 22); k++) pd += `M${800 - w / 2 + 16 + k * 22} ${y + 14}v28`;
        fig += `<path fill="none" stroke="#f8f2e4" stroke-width="7" stroke-linecap="round" opacity=".85" d="${pd}"/>` + `<path fill="none" stroke="#3a2a2a" stroke-width="3" stroke-dasharray="4 18" stroke-linecap="round" opacity=".5" d="M${800 - w / 2 + 8} ${y + 24}H${800 + w / 2 - 8}"/>`;
        // little roof-ends at tier corners
        tiers += `<path fill="#d8c8a8" d="M${800 - w / 2 - 6} ${y}l8-10h${w - 4}l8 10z"/>`;
      }
      const topY = 640 - 7 * 58;
      return `<defs>${lin(s1, [[0, '#4a4a98'], [0.35, '#c878a8'], [0.62, '#ffa078'], [0.85, '#ffd490'], [1, '#ffeab8']])}${lin(w1, [[0, '#f4a888'], [0.2, '#6a76a8'], [1, '#2a3a68']])}</defs>`
        + full(`url(#${s1})`) + stars(31, 40, 280) + rays(1260, 600, 1100, '#ffd9a8', 0.16) + sun(1260, 600, 54, '#fff4d0', '#ffa878')
        + streak(240, 160, 320, '#ffc0c8', 0.55) + streak(1100, 240, 300, '#ffb0a0', 0.55, 70) + cloud(420, 330, 1.0, '#d890b0', 0.8, 58, 8, '#ffd0c0') + cloud(1380, 270, 0.8, '#d88aa8', 0.8, 48, 24, '#ffd8c0')
        + mv('uspar', { ad: '60s', dx: '8px' }, city(61, -160, 1760, 650, 30, 90, 40, 90, '#a47a9a', 0.1) + canopy('#4a6a5a', 640, 40, 4) + haze(560, 100, '#ffc8a0', 0.5))
        // gopuram
        + `<g><rect x="560" y="600" width="480" height="60" fill="#e8dcc0"/><rect x="560" y="640" width="480" height="20" fill="#c8b890"/>` + tiers + fig
        + `<path fill="#3a2418" d="M760 660V600Q760 574 800 566Q840 574 840 600V660z"/><path fill="#f2c040" d="M760 600Q760 574 800 566Q840 574 840 600H830Q830 582 800 576Q770 582 770 600z"/>`
        + `<path fill="#f2c040" d="M${800 - 60} ${topY}Q${800 - 60} ${topY - 56} 800 ${topY - 62}Q${800 + 60} ${topY - 56} ${800 + 60} ${topY}z"/><path fill="#c97a2c" d="M${800 - 60} ${topY}Q${800 - 60} ${topY - 56} 800 ${topY - 62}V${topY}z" opacity=".5"/>`
        + [-44, 0, 44].map((dx) => `<path fill="#f2c040" d="M${800 + dx - 6} ${topY - 56}Q${800 + dx} ${topY - 90} ${800 + dx + 6} ${topY - 56}z"/><circle cx="${800 + dx}" cy="${topY - 94}" r="5" fill="#f2c040"/>`).join('')
        + `<path fill="#e84a7a" d="M${800 - 70} ${topY + 2}H${800 + 70}v6H${800 - 70}z"/></g>`
        + [0, 1, 2, 3, 4, 5].map((i) => lit(R(582 + i * 74), 612, 22, 30)).join('')
        // flanking mandapam walls
        + `<rect x="300" y="600" width="260" height="60" fill="#e8dcc0"/><rect x="1040" y="600" width="260" height="60" fill="#e8dcc0"/><path fill="#c8b890" d="M300 600h260v10H300zM1040 600h260v10H1040z"/><g fill="#e86a3a" opacity=".85">${Array.from({ length: 10 }, (_, i) => `<rect x="${316 + i * 24}" y="620" width="10" height="38"/>`).join('')}${Array.from({ length: 10 }, (_, i) => `<rect x="${1056 + i * 24}" y="620" width="10" height="38"/>`).join('')}</g>`
        // the tank
        + `<rect y="660" width="1600" height="240" fill="#d8c8a8"/><path fill="url(#${w1})" d="M180 700H1420L1580 900H20z"/><path fill="#f4ecd8" d="M180 700H1420V710H180z"/>`
        + `<path fill="#e86aa0" opacity=".28" d="M720 712H880L900 860H700z"/><path fill="#3aa8b8" opacity=".22" d="M740 712H860L860 800H740z"/>` + ripples(716, 900, '#ffd8b0', 40, 50)
        + dots('M180 706H1420', '#ffd27a', 5, 50, 'us-lamps')
        // palms and temple steps
        + mv('uspar', { ad: '30s', dx: '6px' }, palm(120, 760, 420, 60, 1.6, '#2a4a38', '#3e6c4c', 21) + palm(260, 740, 320, -30, 1.3, '#2e5038', '#477a50', 22) + palm(1470, 760, 440, -70, 1.6, '#2a4a38', '#3e6c4c', 23) + palm(1340, 740, 300, 20, 1.2, '#2e5038', '#477a50', 24))
        + `<path fill="#b8a888" d="M-160 900V850H200L240 900z"/><path fill="#b8a888" d="M1400 900L1440 850H1760V900z"/>`
        + birds(26, 8, 800, 240, '#6a4a5a', 1.1, 600) + finish(0.32);
    } });

  /* ---------- Hyderabad: the four-minaret monument above a lantern-lit market ---------- */
  asiaSceneAdd({ key: 'place:hyderabad', label: 'The four-minaret monument above the lantern market', site: 'The four-minaret arch and its bazaar', colour: 'violet', mood: 'cheerful', season: 'any', tags: ['monument', 'bazaar', 'minarets', 'dusk'],
    svg: () => {
      const s1 = U(), st = '#e2d6c0', sh = '#b4a488';
      const minaret = (x) => `<rect x="${x - 26}" y="396" width="52" height="300" fill="${st}"/><rect x="${x - 26}" y="396" width="20" height="300" fill="#f4ead6" opacity=".6"/><rect x="${x + 8}" y="396" width="18" height="300" fill="${sh}" opacity=".5"/>`
        + [596, 520, 452].map((y) => `<rect x="${x - 38}" y="${y}" width="76" height="10" fill="${sh}"/><rect x="${x - 34}" y="${y - 8}" width="68" height="8" fill="${st}"/>`).join('')
        + `<rect x="${x - 20}" y="318" width="40" height="80" fill="${st}"/><rect x="${x - 30}" y="310" width="60" height="10" fill="${sh}"/>` + `<path fill="#6a5a4a" opacity=".6" d="M${x - 8} 350q8-16 16 0v26h-16z"/>`
        + dome(x, 310, 22, 44, '#efe4cc', '#b4a488', '#c8a050') + `<rect x="${x - 24}" y="682" width="48" height="20" fill="${sh}"/>`;
      let kiosks = ''; [640, 720, 800, 880, 960].forEach((x) => { kiosks += `<rect x="${x - 10}" y="336" width="20" height="40" fill="${st}"/>` + dome(x, 336, 16, 34, '#efe4cc', '#b4a488', '#c8a050'); });
      let stalls = '', cols = ['#d84a4a', '#f0b030', '#3a9ab0', '#8a4ac0', '#e86a2a'];
      for (let i = 0; i < 9; i++) { const x = -60 + i * 190, y = 800 + (i % 2) * 18; stalls += `<rect x="${x}" y="${y - 52}" width="150" height="62" fill="#3a2a30"/><path fill="${cols[i % 5]}" d="M${x - 10} ${y - 52}H${x + 160}l-10 -26H${x}z"/>` + lit(x + 14, y - 40, 44, 34) + lit(x + 70, y - 40, 60, 34); }
      return `<defs>${lin(s1, [[0, '#2e3a86'], [0.4, '#7a5aa8'], [0.68, '#e8808a'], [1, '#ffc58a']])}</defs>`
        + full(`url(#${s1})`) + stars(41, 60, 300) + rays(800, 520, 1100, '#ffd0a0', 0.12)
        + `<circle cx="1230" cy="200" r="38" fill="#fff6dc" opacity=".92"/><circle cx="1218" cy="194" r="36" fill="#c8b8e0" opacity=".14"/>`
        + streak(300, 150, 300, '#e8a0c0', 0.5) + cloud(480, 270, 1.0, '#a068a0', 0.8, 58, 10, '#f0a8b0') + cloud(1340, 380, 0.8, '#a470a4', 0.75, 50, 28, '#f4b0b4')
        + mv('uspar', { ad: '60s', dx: '8px' }, city(51, -160, 1760, 720, 40, 150, 40, 90, '#7c5e92', 0.2) + haze(580, 130, '#f2a6a0', 0.45))
        // monument
        + `<g><rect x="560" y="376" width="480" height="326" fill="${st}"/><path fill="${sh}" opacity=".35" d="M920 376H1040V702H920z"/><rect x="560" y="366" width="480" height="14" fill="${sh}"/><rect x="560" y="330" width="480" height="40" fill="${st}"/>${kiosks}`
        + `<path fill="#3a2e3a" fill-rule="evenodd" d="${arch(800, 702, 170, 290)}"/><path fill="#2a1e2e" d="${arch(800, 702, 120, 220)}"/>`
        + `<path fill="${sh}" d="M590 702V640q0-26 24-34q24 8 24 34v62zM962 702V640q0-26 24-34q24 8 24 34v62z" opacity=".0"/>`
        + [[640, 560], [960, 560], [640, 450], [960, 450]].map(([x, y]) => `<path fill="#4a3a48" d="M${x - 24} ${y + 70}V${y + 24}q0-24 24-34q24 10 24 34v46z"/>`).join('')
        + lit(616, 476, 48, 36) + lit(936, 476, 48, 36) + lit(616, 586, 48, 36) + lit(936, 586, 48, 36) + lit(770, 600, 60, 90)
        + `${minaret(574)}${minaret(1026)}</g>`
        // market
        + `<rect y="700" width="1600" height="200" fill="#4a3a4a"/><path fill="#6a5468" d="M-160 780H1760V900H-160z"/>` + mv('uspar', { ad: '26s', dx: '6px' }, stalls)
        + dots('M-100 640Q400 700 800 650Q1200 610 1700 676', '#ffd27a', 7, 38, 'us-lamps') + dots('M-100 720Q300 770 700 740Q1100 710 1700 760', '#ff9a5a', 7, 42, 'us-lamps')
        + [[200, 700], [520, 730], [860, 690], [1180, 712], [1440, 690]].map(([x, y], i) => mv('usbob', { ad: (3 + i * 0.7) + 's', d: '-' + i + 's', dy: '5px' }, `<path d="M${x} ${y - 30}V${y - 14}" stroke="#3a2a30" stroke-width="2"/><ellipse class="us-lit" cx="${x}" cy="${y}" rx="13" ry="17" fill="${['#e84a4a', '#f0b030', '#e86a2a', '#d84a8a', '#f0b030'][i]}"/><ellipse cx="${x}" cy="${y}" rx="13" ry="17" fill="${['#e84a4a', '#f0b030', '#e86a2a', '#d84a8a', '#f0b030'][i]}"/>`)).join('')
        + birds(46, 9, 760, 250, '#8a7a98', 1.1, 700) + birds(47, 5, 1100, 330, '#6a5a78', 0.9, 500)
        + finish(0.36);
    } });

  /* ---------- Karachi: camels on the beach at sunset, ships at anchor ---------- */
  asiaSceneAdd({ key: 'place:karachi', label: 'Camels on the beach at sunset', site: 'The Arabian Sea beach at sunset', colour: 'orange', mood: 'calm', season: 'any', tags: ['beach', 'camels', 'sunset'],
    svg: () => {
      const s1 = U(), w1 = U(), sa = U();
      const ship = (x, y, s, hull) => `<path fill="${hull}" d="M${R(x - 120 * s)} ${y}H${R(x + 120 * s)}L${R(x + 96 * s)} ${R(y + 22 * s)}H${R(x - 100 * s)}z"/><rect x="${R(x - 70 * s)}" y="${R(y - 22 * s)}" width="${R(50 * s)}" height="${R(22 * s)}" fill="#cfcfd8"/>` + Array.from({ length: 6 }, (_, i) => `<rect x="${R(x + (-12 + i * 22) * s)}" y="${R(y - 18 * s)}" width="${R(18 * s)}" height="${R(18 * s)}" fill="${['#c84a3a', '#3a78b8', '#e0a030', '#4a9a68', '#c84a3a', '#3a78b8'][i]}"/>`).join('');
      return `<defs>${lin(s1, [[0, '#4a4a94'], [0.3, '#c56a8a'], [0.58, '#ff8a4a'], [0.8, '#ffc060'], [1, '#ffe39a']])}${lin(w1, [[0, '#ffb070'], [0.16, '#c07a88'], [0.5, '#5a5a90'], [1, '#2a3260']])}${lin(sa, [[0, '#e2b57a'], [1, '#b68a54']])}</defs>`
        + full(`url(#${s1})`) + stars(70, 36, 240) + rays(780, 520, 1100, '#ffd090', 0.18) + sun(780, 520, 66, '#fff0c0', '#ff8a44')
        + streak(280, 170, 340, '#ffa890', 0.55) + streak(1160, 250, 300, '#ff9a70', 0.55, 70) + cloud(480, 300, 1.0, '#c4708c', 0.8, 58, 8, '#ffb48a') + cloud(1320, 360, 0.9, '#c8788a', 0.78, 48, 24, '#ffc090')
        + mv('uspar', { ad: '70s', dx: '8px' }, city(81, 1180, 1760, 556, 40, 140, 28, 60, '#a2677e', 0.2) + haze(500, 80, '#ffb070', 0.5))
        + `<rect y="556" width="1600" height="344" fill="url(#${w1})"/><path fill="#ffc07a" opacity=".3" d="M740 558H820L900 770H680z"/>` + ripples(566, 800, '#ffd9a0', 31, 56)
        + mv('uspar', { ad: '60s', dx: '10px' }, ship(300, 580, 0.8, '#2e2a38') + ship(1050, 570, 0.55, '#3a3040'))
        + mv('usbob', { ad: '5s', dy: '2px' }, dhow(560, 640, 0.6, '#3a2a2a', '#f0dcb8'))
        // wet and dry sand
        + `<path fill="url(#${sa})" d="M-160 740Q400 700 900 730Q1400 760 1760 720V900H-160z"/><path fill="#b8825a" opacity=".5" d="M-160 790Q400 760 900 784Q1400 806 1760 780V900H-160z"/><path fill="#ffe0b0" opacity=".5" d="M-160 736Q400 696 900 726Q1400 756 1760 716V726Q1400 766 900 736Q400 706 -160 746z"/>`
        + `<path fill="none" stroke="#fff2d6" stroke-width="3" opacity=".7" d="M-160 740Q400 700 900 730Q1400 760 1760 720"/>`
        // camels
        + mv('usmove', { ad: '110s', dx: '1000px' }, camel(500, 800, 1.5, '#3a2430') + camel(700, 806, 1.4, '#46303a') + camel(880, 794, 1.2, '#3a2430'))
        + mv('usmove', { ad: '120s', d: '-30s', dx: '600px' }, camel(1250, 760, 0.7, '#4a3440'))
        // kites
        + [[1180, 230, '#f2c040'], [1300, 170, '#e84a6a'], [1420, 260, '#3aa8b8']].map(([x, y, c], i) => mv('usbob', { ad: (3 + i) + 's', d: '-' + i + 's', dy: '14px' }, `<path fill="${c}" d="M${x} ${y - 24}L${x + 16} ${y}L${x} ${y + 24}L${x - 16} ${y}z"/><path d="M${x} ${y + 24}Q${x - 30} ${y + 160} ${x - 80} ${y + 380}" stroke="#ffe0c0" stroke-width="1.5" fill="none" opacity=".7"/>`)).join('')
        + `<g>${palm(80, 860, 360, 120, 1.5, '#28303a', '#3a4a50', 91)}${palm(1520, 870, 340, -110, 1.4, '#28303a', '#3a4a50', 92)}</g>`
        + birds(93, 7, 600, 230, '#5a3048', 1.1, 700) + haze(740, 160, '#ffcc90', 0.2) + finish(0.32);
    } });

  /* ---------- Lahore: the great red sandstone mosque at dusk ---------- */
  asiaSceneAdd({ key: 'place:lahore', label: 'The red sandstone mosque and its courtyard at dusk', site: 'A Mughal mosque of red sandstone and marble', colour: 'red', mood: 'proud', season: 'any', tags: ['mosque', 'mughal', 'dusk'],
    svg: () => {
      const s1 = U(), c1 = U(), red = '#a8452f', redL = '#c25a3c', redD = '#7a3022', wh = '#f4eee2';
      const minaret = (x, h) => { const top = 700 - h; return `<rect x="${x - 22}" y="${top}" width="44" height="${h}" fill="${red}"/><rect x="${x - 22}" y="${top}" width="14" height="${h}" fill="${redL}" opacity=".6"/><rect x="${x + 8}" y="${top}" width="14" height="${h}" fill="${redD}" opacity=".5"/>`
        + Array.from({ length: 4 }, (_, i) => `<rect x="${x - 24}" y="${top + 40 + i * (h / 4.4)}" width="48" height="8" fill="${wh}" opacity=".85"/>`).join('')
        + `<rect x="${x - 30}" y="${top - 6}" width="60" height="10" fill="${redD}"/><rect x="${x - 20}" y="${top - 46}" width="40" height="42" fill="${wh}"/>` + [-12, 0, 12].map((d) => `<path fill="${red}" opacity=".5" d="M${x + d - 4} ${top - 8}v-22q4-8 8 0v22z"/>`).join('') + dome(x, top - 46, 24, 44, wh, '#b8aa94', '#d8b060') + `<rect x="${x - 30}" y="696" width="60" height="14" fill="${redD}"/>`; };
      let chh = ''; for (let i = 0; i < 14; i++) { const x = 440 + i * 56; if (Math.abs(x - 800) < 130) continue; chh += `<rect x="${x - 8}" y="486" width="16" height="22" fill="${red}"/>` + dome(x, 486, 12, 24, wh, '#b8aa94', '#d8b060'); }
      let niches = ''; for (let i = 0; i < 9; i++) { const x = 448 + i * 88; if (Math.abs(x - 800) < 160) continue; niches += arch(x, 690, 38, 100); }
      return `<defs>${lin(s1, [[0, '#2c3470'], [0.34, '#7a5a9c'], [0.62, '#e8806e'], [0.84, '#ffbc78'], [1, '#ffe2a0']])}${lin(c1, [[0, '#d8b8a0'], [1, '#a8806a']])}</defs>`
        + full(`url(#${s1})`) + stars(15, 60, 300) + `<circle cx="1260" cy="220" r="30" fill="#fff6dc" opacity=".9"/>` + rays(800, 640, 1100, '#ffd09a', 0.12)
        + streak(260, 160, 320, '#e898b0', 0.5) + cloud(360, 330, 1.0, '#b06a98', 0.8, 58, 8, '#f2a890') + cloud(1360, 300, 0.9, '#b46e98', 0.78, 52, 24, '#f6b098')
        + mv('uspar', { ad: '60s', dx: '8px' }, canopy('#5a4a62', 640, 60, 7, -160, 380) + canopy('#5a4a62', 640, 60, 8, 1220, 1760) + haze(540, 120, '#f4a690', 0.5))
        // the mosque
        + `<g>${minaret(300, 400)}${minaret(1300, 400)}`
        + `<rect x="400" y="500" width="800" height="200" fill="${red}"/><rect x="400" y="500" width="800" height="14" fill="${wh}"/><rect x="400" y="508" width="800" height="8" fill="${redD}"/><path fill="${redD}" opacity=".3" d="M1000 500H1200V700H1000z"/>`
        + `<path fill="#3a1a14" opacity=".72" d="${niches}"/>` + chh
        + `<path fill="${red}" d="M690 700V460Q690 400 800 370Q910 400 910 460V700z"/><path fill="${wh}" d="${arch(800, 700, 150, 270)}" opacity=".0"/><path fill="#2e1612" d="${arch(800, 700, 120, 230)}"/><path fill="${wh}" opacity=".9" d="M672 700V440h16V700zM912 700V440h16V700z"/><path fill="${wh}" d="M690 450h220v10H690z"/>`
        + `<path fill="none" stroke="${wh}" stroke-width="4" opacity=".9" d="${arch(800, 700, 148, 262)}"/>`
        + dome(800, 500, 128, 190, wh, '#b8aa94', '#d8b060') + dome(596, 500, 86, 120, wh, '#b8aa94', '#d8b060') + dome(1004, 500, 86, 120, wh, '#b8aa94', '#d8b060')
        + `<rect x="672" y="474" width="256" height="30" fill="${red}"/><rect x="520" y="480" width="152" height="24" fill="${red}"/><rect x="928" y="480" width="152" height="24" fill="${red}"/>`
        + Array.from({ length: 10 }, (_, i) => lit(R(436 + i * 72), 560, 26, 52)).join('') + `</g>`
        + lit(770, 600, 60, 90)
        // courtyard
        + `<rect y="700" width="1600" height="200" fill="url(#${c1})"/><path fill="#c89a82" opacity=".6" d="M540 706H1060L1460 900H140z"/><path fill="#8a5a44" opacity=".25" d="M800 706L900 900H700z"/><path fill="#e8d8c0" d="M730 710H870V722H730z"/><path fill="#6a8a9a" opacity=".6" d="M760 726H840L880 900H720z"/>` + ripples(730, 900, '#ffe0c0', 17, 18)
        + `<path fill="none" stroke="#8a5a44" stroke-width="2" opacity=".35" d="M-100 760H1700M-200 820H1800M300 700L-100 900M1300 700L1700 900M800 700V900"/>`
        + dots('M-100 690H1700', '#ffd27a', 5, 50, 'us-lamps')
        + mv('uspar', { ad: '30s', dx: '8px' }, tree(60, 880, 260, '#3a2a24', '#3e5a48', '#4e6e54') + tree(1540, 880, 260, '#3a2a24', '#3e5a48', '#4e6e54'))
        + birds(25, 10, 760, 400, '#e8dcd0', 1.1, 700) + birds(26, 5, 1100, 320, '#d8ccc0', 0.9, 500)
        + finish(0.36);
    } });
})();
