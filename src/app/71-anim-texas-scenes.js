/* ============================================================
   TEXAS FULL-SCREEN SCENES (the Texas pack's big art). PURE classic script: it only defines
   animTexasScenes() and animTexasSceneCss(), which 72-anim-pack-texas.js reads when it
   registers the pack (so there is one "Texas" pack in the gallery). Drawn like the UK
   Hampshire scenes (docs/dev/UK_PACK.md, "Full-viewport scenes"): 1600 x 900 user units,
   sliced to fill any screen (item.full), layered: a sky gradient and its light, far / mid /
   near layers that drift at different speeds, and ambient life. Colours are painted; the dark
   theme or a tod-dusk / tod-night class lays an evening grade over them and lights the
   windows and lamps (.tx-tint, .tx-lit, .tx-star in animTexasSceneCss). Motion is
   transform and opacity only; the still frame (reduced motion) is the scene at rest.
   Each scene returns the inside of the svg (<= ANIM_FULL_ITEM_MAX_BYTES, 32 KB).
     statewide   hill-country bluebonnets, a West Texas sunset, the Gulf coast at sunrise
     city        Fort Worth stockyards, Dallas, Houston liftoff, Austin bats, the Alamo, El Paso
   ============================================================ */
function animTexasScenes() {
  let _n = 0;
  const U = () => 'tx' + (++_n).toString(36);                     // a gradient id, unique per render
  const R = (v) => Math.round(v);
  const rnd = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  const stops = (a) => a.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`).join('');
  const lin = (id, a) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops(a)}</linearGradient>`;
  const linU = (id, a, x1, y1, x2, y2) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(a)}</linearGradient>`;
  const radU = (id, a, cx, cy, r) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops(a)}</radialGradient>`;
  const st = (o) => Object.entries(o).map(([k, v]) => k === 'to' ? `transform-box:view-box;transform-origin:${v}` : `--${k}:${v}`).join(';');
  /** A moving group: x-<cls> with its own timing (--ad duration, --d delay, --dx/--dy travel, to: transform origin). */
  const mv = (cls, o, inner) => `<g class="x-${cls}"${o ? ` style="${st(o)}"` : ''}>${inner}</g>`;
  const full = (fill, y) => `<rect y="${y || 0}" width="1600" height="${900 - (y || 0)}" fill="${fill}"/>`;
  const star5 = (cx, cy, Ro, ri) => { const p = []; for (let i = 0; i < 10; i++) { const a = (-90 + 36 * i) * Math.PI / 180, q = i % 2 ? ri : Ro; p.push(`${R(cx + q * Math.cos(a))} ${R(cy + q * Math.sin(a))}`); } return 'M' + p.join('L') + 'z'; };
  /** A smooth ridge from x -160 to 1760 (room to drift), filled down to the foot. */
  const ridge = (fill, y, amp, n, seed, foot) => {
    const r = rnd(seed), p = [];
    for (let i = 0; i <= n; i++) p.push([-160 + i * (1920 / n), y - r() * amp]);
    let d = `M-160 ${foot || 900}V${R(p[0][1])}`;
    for (let i = 1; i <= n; i++) d += `Q${R(p[i - 1][0])} ${R(p[i - 1][1])} ${R((p[i - 1][0] + p[i][0]) / 2)} ${R((p[i - 1][1] + p[i][1]) / 2)}`;
    return `<path fill="${fill}" d="${d}L1760 ${R(p[n][1])}V${foot || 900}z"/>`;
  };
  /** A line of tree crowns of uneven size along y. */
  const canopy = (fill, y, amp, seed, x0, x1, foot) => {
    const r = rnd(seed); let x = x0 == null ? -160 : x0, d = `M${x} ${foot || 900}V${y}`;
    const end = x1 == null ? 1760 : x1;
    while (x < end) { const w = 26 + r() * 64, h = 8 + r() * amp, j = r() * 10 - 5; d += `c${R(w * 0.1)} ${-R(h * 1.4)} ${R(w * 0.9)} ${-R(h * 1.4)} ${R(w)} ${R(j)}`; x += w; }
    return `<path fill="${fill}" d="${d}V${foot || 900}H${x0 == null ? -160 : x0}z"/>`;
  };
  /** A flat-topped mesa: stepped, sheer sides. */
  const mesa = (x, y, w, h, fill, top, cap) => `<path fill="${fill}" d="M${x} ${y + h}V${y + h * 0.35}l${R(w * 0.04)} ${-R(h * 0.12)}h${R(w * 0.1)}l${R(w * 0.03)} ${-R(h * 0.23)}h${R(w * 0.66)}l${R(w * 0.03)} ${R(h * 0.2)}h${R(w * 0.1)}l${R(w * 0.04)} ${R(h * 0.15)}V${y + h}z"/>`
    + `<path fill="${top}" d="M${x + R(w * 0.14)} ${R(y + h * 0.23)}h${R(w * 0.72)}l${-R(w * 0.01)} ${R(h * 0.06)}h${-R(w * 0.7)}z"/>` + (cap || '');
  const cloud = (x, y, s, tone, op, dur, del, top) => {
    const g = U(), r = rnd(R(x * 7 + y)); let puffsD = '';
    for (let i = 0; i < 6; i++) { const px = x - 120 * s + i * 48 * s + r() * 20 * s, pr = (34 + r() * 40) * s * (i === 2 || i === 3 ? 1.35 : 1); puffsD += `<circle cx="${R(px)}" cy="${R(y - pr * 0.55)}" r="${R(pr)}"/>`; }
    return `<defs>${linU(g, [[0, top || '#fff'], [0.55, top || '#fff'], [1, tone]], 0, R(y - 110 * s), 0, R(y + 24 * s))}</defs>`
      + mv('txdrift', { ad: (dur || 46) + 's', d: -(del || 0) + 's', dx: R(60 + s * 40) + 'px' }, `<g opacity="${op || 0.92}" fill="url(#${g})"><ellipse cx="${x}" cy="${y}" rx="${R(170 * s)}" ry="${R(26 * s)}"/>${puffsD}</g>`);
  };
  const streak = (x, y, w, col, op, dur) => mv('txdrift', { ad: (dur || 60) + 's', dx: '90px' }, `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${R(w / 22) + 3}" fill="${col}" opacity="${op || 0.5}"/><ellipse cx="${R(x + w * 0.3)}" cy="${y + 10}" rx="${R(w * 0.6)}" ry="${R(w / 30) + 2}" fill="${col}" opacity="${(op || 0.5) * 0.7}"/>`);
  const haze = (y, h, col, op) => { const g = U(); return `<defs>${linU(g, [[0, col, 0], [0.5, col, op || 0.6], [1, col, 0]], 0, y, 0, y + h)}</defs><rect x="-200" y="${y}" width="2000" height="${h}" fill="url(#${g})"/>`; };
  const rays = (x, y, len, col, op) => { const g = U(); let d = ''; const r = rnd(R(x + y)); for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + r() * 0.3, b = a + 0.025 + r() * 0.07; d += `M${x} ${y}L${R(x + Math.cos(a) * len)} ${R(y + Math.sin(a) * len)}L${R(x + Math.cos(b) * len)} ${R(y + Math.sin(b) * len)}z`; }
    return `<defs>${radU(g, [[0, col, op || 0.4], [1, col, 0]], x, y, len)}</defs><g class="x-txspin" style="--ad:40s;transform-box:view-box;transform-origin:${x}px ${y}px"><path fill="url(#${g})" d="${d}"/></g>`; };
  const sun = (x, y, r, core, halo, rise) => { const g = U(); return `<defs>${radU(g, [[0, halo, 0.85], [0.35, halo, 0.35], [1, halo, 0]], x, y, r * 6)}</defs>`
    + mv(rise ? 'txrise' : 'txglow', { ad: rise ? '9s' : '6s' }, `<circle cx="${x}" cy="${y}" r="${r * 6}" fill="url(#${g})"/><circle cx="${x}" cy="${y}" r="${r}" fill="${core}"/>`); };
  const tint = () => `<rect class="tx-tint" width="1600" height="900"/>`;
  /** Darkened edges and the evening grade (the dark theme, tod-dusk, tod-night). */
  const finish = (op) => { const g = U(); return `<defs><radialGradient id="${g}" cx=".5" cy=".46" r=".75">${stops([[0.55, '#0b0d22', 0], [1, '#0b0d22', op || 0.38]])}</radialGradient></defs><rect width="1600" height="900" fill="url(#${g})"/>` + tint(); };
  const stars = (seed, n, y1) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) o += `<circle cx="${R(r() * 1600)}" cy="${R(r() * (y1 || 300))}" r="${(1 + r() * 1.6).toFixed(1)}"/>`; return `<g class="tx-star" fill="#fff">${o}</g>`; };
  const birds = (seed, n, x, y, col, size, dx) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) {
      const s = (size || 1) * (0.7 + r() * 0.6), bx = R(x + r() * 260 - 130), by = R(y + r() * 120 - 60);
      o += mv('txglide', { ad: R(16 + r() * 10) + 's', d: -R(r() * 14) + 's', dx: (dx || 520) + 'px', dy: R(-40 + r() * 60) + 'px' },
        mv('txflap', { ad: (0.5 + r() * 0.4).toFixed(2) + 's', d: -(r()).toFixed(2) + 's' },
          `<path fill="none" stroke="${col}" stroke-width="${(3.2 * s).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" d="M${bx - R(18 * s)} ${by}q${R(9 * s)} ${-R(10 * s)} ${R(18 * s)} 0q${R(9 * s)} ${-R(10 * s)} ${R(18 * s)} 0"/>`));
    }
    return o;
  };
  const shimmer = (seed, n, x0, x1, y0, y1, col, w) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) {
      const y = y0 + r() * (y1 - y0), k = (y - y0) / Math.max(1, y1 - y0), len = R((w || 40) * (0.5 + k) * (0.6 + r() * 0.8));
      o += `<rect class="x-txshim" style="--ad:${(2 + r() * 2.6).toFixed(1)}s;--d:-${(r() * 3).toFixed(1)}s" x="${R(x0 + r() * (x1 - x0))}" y="${R(y)}" width="${len}" height="${R(2 + k * 3)}" rx="2" fill="${col}"/>`;
    }
    return o;
  };
  const puffs = (x, y, n, col, size, dx, dur, dy, sc) => {
    let o = '';
    for (let i = 0; i < n; i++) o += `<circle class="x-txpuff" style="--ad:${dur || 3.6}s;--d:-${((dur || 3.6) * i / n).toFixed(2)}s;--dx:${dx || -120}px${dy ? `;--dy:${dy}px` : ''}${sc ? `;--sc:${sc}` : ''}" cx="${x}" cy="${y}" r="${R((size || 30) * (0.8 + (i % 3) * 0.15))}" fill="${col}"/>`;
    return o;
  };
  /** Dots along a line (a string of lamps or a carpet of city lights): a round-capped dashed stroke. */
  const dots = (d, col, w, gap, cls, extra) => `<path class="${cls || ''}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="0 ${gap}" d="${d}"${extra || ''}/>`;
  const lit = (x, y, w, h) => `<rect class="tx-lit" x="${x}" y="${y}" width="${w}" height="${h}" rx="${R(Math.min(w, h) / 5)}"/>`;
  /** A live oak: low, wide crown, dark trunk. */
  const oak = (x, y, s, dark, mid, lite, seed) => {
    const r = rnd(seed || 7); let crown = '';
    for (let i = 0; i < 8; i++) { const cx = R(x - 150 * s + i * 43 * s + r() * 20 * s), cy = R(y - 190 * s - Math.sin((i / 7) * Math.PI) * 40 * s + r() * 24 * s); crown += `<circle cx="${cx}" cy="${cy}" r="${R((62 + r() * 34) * s)}" fill="${dark}"/>`; }
    for (let i = 0; i < 6; i++) crown += `<circle cx="${R(x - 120 * s + r() * 240 * s)}" cy="${R(y - 220 * s + r() * 50 * s)}" r="${R((30 + r() * 26) * s)}" fill="${mid}"/>`;
    for (let i = 0; i < 4; i++) crown += `<circle cx="${R(x - 90 * s + r() * 190 * s)}" cy="${R(y - 240 * s + r() * 30 * s)}" r="${R((16 + r() * 14) * s)}" fill="${lite}"/>`;
    return `<path fill="#33271d" d="M${R(x - 18 * s)} ${y}C${R(x - 10 * s)} ${R(y - 70 * s)} ${R(x - 40 * s)} ${R(y - 120 * s)} ${R(x - 90 * s)} ${R(y - 170 * s)}L${R(x - 70 * s)} ${R(y - 178 * s)}C${R(x - 30 * s)} ${R(y - 140 * s)} ${R(x - 6 * s)} ${R(y - 120 * s)} ${R(x + 4 * s)} ${R(y - 100 * s)}C${R(x + 20 * s)} ${R(y - 140 * s)} ${R(x + 50 * s)} ${R(y - 170 * s)} ${R(x + 96 * s)} ${R(y - 176 * s)}L${R(x + 90 * s)} ${R(y - 160 * s)}C${R(x + 50 * s)} ${R(y - 140 * s)} ${R(x + 26 * s)} ${R(y - 80 * s)} ${R(x + 20 * s)} ${y}z"/>`
      + `<g class="x-txsway2" style="--ad:7s;transform-box:view-box;transform-origin:${x}px ${y}px">${crown}</g>`;
  };
  /** A windmill: lattice tower, a wheel of blades that turns, a tail vane. (x, y) is the foot. */
  const windmill = (x, y, s, metal, blade) => {
    const hx = x, hy = y - 300 * s; let b = '';
    for (let i = 0; i < 18; i++) b += `<path d="M${hx} ${hy}l${R(-5 * s)} ${R(-60 * s)}h${R(10 * s)}z" transform="rotate(${i * 20} ${hx} ${hy})"/>`;
    return `<path fill="none" stroke="${metal}" stroke-width="${R(6 * s)}" d="M${R(x - 30 * s)} ${y}L${hx - 6} ${hy}M${R(x + 30 * s)} ${y}L${hx + 6} ${hy}"/><path fill="none" stroke="${metal}" stroke-width="${R(3 * s)}" d="M${R(x - 24 * s)} ${R(y - 80 * s)}H${R(x + 24 * s)}L${R(x - 18 * s)} ${R(y - 160 * s)}H${R(x + 18 * s)}L${R(x - 12 * s)} ${R(y - 230 * s)}H${R(x + 12 * s)}"/>`
      + `<path fill="${metal}" d="M${hx} ${hy}h${R(150 * s)}l${R(-18 * s)} ${R(34 * s)}h${R(-12 * s)}z" opacity=".9"/><g class="x-txspin" style="--ad:${(5 + s).toFixed(1)}s;transform-box:view-box;transform-origin:${hx}px ${hy}px"><g fill="${blade}">${b}</g><circle cx="${hx}" cy="${hy}" r="${R(11 * s)}" fill="${metal}"/></g>`;
  };
  /** A longhorn steer in silhouette (feet on y), facing right, 200 wide. */
  const steer = (x, y, s, col, horn, seed) => {
    const body = '<path fill="' + col + '" d="M26 -70C40 -88 90 -92 130 -84C150 -80 160 -70 160 -56C160 -44 150 -38 142 -36V-6h-9V-30H60V-6h-9V-30c-14-2-26-12-26-26z"/>'
      + '<path fill="' + col + '" d="M150 -78c14-14 26-12 40-4l12 14c2 6-2 10-8 10l-12-2c-8 8-20 12-32 8z"/>'
      + '<path fill="none" stroke="' + horn + '" stroke-width="6" stroke-linecap="round" d="M162 -78c-22-8-38-10-50 8M184 -86c24-12 34-26 34-42"/><path fill="none" stroke="' + col + '" stroke-width="5" d="M24 -62c-16 10-18 30-14 50"/>';
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><ellipse cx="92" cy="2" rx="86" ry="8" fill="#000" opacity=".14"/>'
      + mv('txbob', { ad: (1.1 + (seed % 3) * 0.15).toFixed(2) + 's', d: -((seed % 5) * 0.3) + 's', dy: '2px' }, body) + '</g>';
  };
  const meadowSpikes = (seed, n, x0, x1, y0, y1, col, w, gap) => {
    const r = rnd(seed); let d = '';
    for (let i = 0; i < n; i++) { const x = R(x0 + r() * (x1 - x0)), y = R(y0 + r() * (y1 - y0)), h = R(34 + r() * 40 * (0.6 + (y - y0) / (y1 - y0 + 1))); d += `M${x} ${y}q${R(r() * 8 - 4)} ${-R(h / 2)} ${R(r() * 6 - 3)} ${-h}`; }
    return `<path fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="0 ${gap}" d="${d}"/>`;
  };
  const stems = (seed, n, x0, x1, y0, y1) => {
    const r = rnd(seed); let d = '';
    for (let i = 0; i < n; i++) { const x = R(x0 + r() * (x1 - x0)), y = R(y0 + r() * (y1 - y0)); d += `M${x} ${y}l${R(r() * 6 - 3)} ${-R(12 + r() * 18)}`; }
    return `<path fill="none" stroke="#4f7a32" stroke-width="3" d="${d}"/>`;
  };
  const S = [];
  const add = (o) => S.push(o);

  /* ---------- statewide: hill-country bluebonnets ---------- */
  add({ id: 'hill-country-bluebonnets', label: 'Bluebonnets in the Hill Country', site: 'Bluebonnets in the Hill Country', colour: 'indigo', mood: 'calm', season: ['spring'], texasKind: 'scene', tags: ['bluebonnet', 'hill country', 'spring'],
    svg: () => { const s1 = U(), g1 = U(), g2 = U(), l1 = U();
      return `<defs>${lin(s1, [[0, '#5d97d6'], [0.5, '#a9cdee'], [0.8, '#f4e6c4'], [1, '#f8d9a4']])}${linU(g1, [[0, '#8fb15a'], [1, '#4d7b34']], 0, 560, 0, 900)}${linU(g2, [[0, '#7aa356'], [1, '#43702f']], 0, 640, 0, 900)}${radU(l1, [[0, '#fff1c8', 0.55], [1, '#fff1c8', 0]], 360, 330, 760)}</defs>`
        + full(`url(#${s1})`) + rays(360, 330, 900, '#fff6d8', 0.2) + sun(360, 330, 46, '#fff9e4', '#ffe6a0')
        + streak(1180, 110, 280, '#fff', 0.5) + cloud(300, 200, 1.1, '#e4edf6', 0.95, 54, 4) + cloud(1280, 250, 1.3, '#e8eff6', 0.92, 62, 30) + cloud(820, 150, 0.8, '#eef3f8', 0.85, 48, 14)
        + birds(5, 5, 1000, 330, '#2f3a4a', 1.1, 600)
        + mv('txpar', { ad: '30s', dx: '8px' }, ridge('#8fa8c6', 520, 40, 9, 3) + haze(470, 110, '#e8f0f8', 0.6) + ridge('#6f8f9a', 560, 34, 10, 4))
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + mv('txpar', { ad: '30s', dx: '16px' }, ridge(`url(#${g2})`, 610, 40, 9, 5) + canopy('#365a30', 598, 26, 8, 80, 640) + canopy('#3c6434', 604, 22, 9, 980, 1560) + haze(590, 100, '#f3f0d0', 0.5))
        + ridge(`url(#${g1})`, 690, 30, 8, 6)
        + `<g opacity=".7">${ridge("#3f5fc0", 748, 26, 12, 31, 810)}</g><g opacity=".8">${ridge("#3550b4", 812, 24, 14, 32, 900)}</g>`
        + mv('txsway', { ad: '5.6s' }, meadowSpikes(11, 70, 0, 1600, 700, 760, '#3d5bbd', 12, 8) + meadowSpikes(12, 60, 0, 1600, 700, 760, '#6f8be0', 7, 6) + meadowSpikes(13, 14, 0, 1600, 706, 756, '#d9482f', 9, 8))
        + stems(14, 40, 0, 1600, 720, 780)
        + mv('txsway', { ad: '4.6s', d: '-1s' }, meadowSpikes(21, 70, 0, 1600, 780, 880, '#2f4ba8', 18, 11) + meadowSpikes(22, 56, 0, 1600, 780, 880, '#5878d6', 11, 8) + meadowSpikes(23, 18, 0, 1600, 790, 880, '#e0502e', 14, 10) + meadowSpikes(24, 30, 0, 1600, 800, 880, '#f0b432', 8, 8))
        + oak(250, 720, 1.5, '#2c4a2a', '#41653a', '#7f9d4c', 4) + oak(1420, 700, 1.15, '#2f4e2d', '#456a3c', '#80a04e', 9)
        + `<path fill="none" stroke="#6b5a48" stroke-width="7" d="M560 770H1060M560 745H1060M600 786V738M780 786V738M960 786V738"/>`
        + finish(0.34); } });

  /* ---------- statewide: a West Texas sunset ---------- */
  add({ id: 'west-texas-sunset', label: 'Sunset over West Texas', site: 'Sunset over West Texas', colour: 'orange', mood: 'dreamy', texasKind: 'scene', tags: ['west texas', 'sunset', 'windmill', 'mesa'],
    svg: () => { const s1 = U(), g1 = U(), l1 = U(), tb = U();
      return `<defs>${lin(s1, [[0, '#3a3a82'], [0.34, '#a45a8a'], [0.62, '#f08a56'], [0.8, '#ffc065'], [1, '#ffe08a']])}${linU(g1, [[0, '#a8683a'], [1, '#5a3426']], 0, 640, 0, 900)}${radU(l1, [[0, '#ffd070', 0.6], [1, '#ffd070', 0]], 1010, 560, 800)}</defs>`
        + full(`url(#${s1})`) + stars(3, 36, 200) + rays(1010, 560, 1000, '#ffe9a8', 0.22) + sun(1010, 560, 64, '#fff3c8', '#ffb050')
        + streak(300, 150, 300, '#ffb88a', 0.55) + streak(1250, 230, 260, '#ff9a70', 0.5, 70) + cloud(560, 330, 1.0, '#b8607a', 0.8, 60, 8, '#ffd0a8') + cloud(1380, 400, 0.85, '#c06a78', 0.75, 52, 30, '#ffd7b0')
        + birds(4, 3, 520, 300, '#2a1c2e', 1.2, 700)
        + mv('txpar', { ad: '36s', dx: '8px' }, mesa(40, 400, 400, 220, '#6d4a74', '#8d6a8a') + mesa(1160, 410, 380, 210, '#6d4a74', '#8d6a8a') + mesa(620, 500, 240, 120, '#74506f', '#946a80'))
        + haze(520, 90, '#ffd7a0', 0.45)
        + mv('txpar', { ad: '36s', dx: '18px' }, mesa(-60, 500, 480, 210, '#a1524a', '#c46a56') + mesa(1040, 520, 440, 190, '#a1524a', '#c46a56'))
        + `<rect width="1600" height="900" fill="url(#${l1})"/>` + `<path fill="url(#${g1})" d="M-160 900V650C200 620 500 660 800 640S1400 620 1760 650V900z"/>`
        + `<path fill="#6e3a2e" opacity=".5" d="M-160 700C300 680 700 720 1000 690S1500 700 1760 690V900H-160z"/>`
        + `<g fill="none" stroke="#2a1b22" stroke-width="7" stroke-linecap="round"><path d="M300 700V640M300 676c-24 0-26-22-26-34M300 668c24 0 26-20 26-30"/><path d="M1350 720V650M1350 692c-22 0-24-18-24-30M1350 684c22 0 24-18 24-28"/></g>`
        + `<g fill="#2a1b22"><path d="M530 720l-6-70M540 720l2-84M550 720l10-72" stroke="#2a1b22" stroke-width="5" stroke-linecap="round" fill="none"/>${[0, 1, 2, 3, 4].map(i => `<circle cx="${524 + i * 8}" cy="${650 - i % 3 * 10}" r="3.6" fill="#d94c3a"/>`).join('')}</g>`
        + windmill(170, 830, 1.5, '#2d2024', '#3a2a2e')
        + mv('txmove', { ad: '26s', dx: '1500px' }, mv('txspin', { ad: '3.2s', to: '0px 0px' }, `<g transform="translate(0 790)"><circle r="30" fill="none" stroke="#3d2a22" stroke-width="3"/><path fill="none" stroke="#3d2a22" stroke-width="3" d="M-28 -8l56 16M-24 -18l48 36M-8 -28l16 56M-20 12l40-24"/></g>`))
        + puffs(900, 770, 5, '#e8b078', 36, 160, 5, -40, 3)
        + `<path fill="#3a2428" d="M-160 900V830C100 810 400 830 700 820S1300 800 1760 830V900z"/>` + finish(0.3); } });

  /* ---------- statewide: the Gulf coast at sunrise ---------- */
  add({ id: 'gulf-coast-sunrise', label: 'Sunrise on the Gulf Coast', site: 'Sunrise on the Gulf Coast', colour: 'teal', mood: 'calm', texasKind: 'scene', tags: ['gulf', 'coast', 'galveston', 'pier', 'sunrise'],
    svg: () => { const s1 = U(), w1 = U(), l1 = U();
      return `<defs>${lin(s1, [[0, '#6c86c4'], [0.35, '#d7a2c6'], [0.6, '#ffc79a'], [0.78, '#ffe3a8'], [1, '#fff0c2']])}${linU(w1, [[0, '#f6c79a'], [0.12, '#7fb2c4'], [1, '#2f6b86']], 0, 560, 0, 900)}${radU(l1, [[0, '#ffe3a0', 0.7], [1, '#ffe3a0', 0]], 800, 540, 700)}</defs>`
        + full(`url(#${s1})`) + stars(8, 20, 160) + rays(800, 540, 1000, '#fff1c8', 0.22) + sun(800, 540, 58, '#fffbe6', '#ffd68a', true)
        + streak(250, 130, 300, '#fff', 0.5) + streak(1300, 190, 280, '#ffd9d0', 0.55, 70) + cloud(1150, 330, 1.0, '#f0b7a6', 0.85, 58, 12, '#fff1e6') + cloud(380, 380, 0.9, '#efb0a6', 0.8, 66, 40, '#fff0e4')
        + `<path fill="#c8a8a0" opacity=".45" d="M-160 560C300 548 700 556 1100 548S1600 556 1760 550V570H-160z"/>`
        + `<rect y="560" width="1600" height="340" fill="url(#${w1})"/><rect width="1600" height="900" fill="url(#${l1})"/>`
        + shimmer(5, 60, 540, 1060, 570, 700, '#fff4cc', 60) + shimmer(6, 30, 0, 1600, 640, 880, '#e8f4f8', 50)
        + mv('txmove', { ad: '60s', dx: '120px' }, `<g fill="none" stroke="#ffffff" stroke-width="4" opacity=".4"><path d="M0 700q40-12 80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0"/><path d="M0 790q50-14 100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0t100 0"/></g>`)
        + mv('txbob', { ad: '5s', dy: '5px' }, `<g fill="#3c3c4e"><path d="M930 598h130l-18 24H948z"/><path d="M985 598V560h6v38zM1010 598V572h24v26z"/><path d="M1000 560L1070 536M1000 560L930 540" stroke="#3c3c4e" stroke-width="3" fill="none"/></g>`)
        + `<g fill="#4a3a30"><path d="M-40 640h1000v14H-40z"/>${Array.from({ length: 17 }, (_, i) => `<path d="M${-20 + i * 58} 654h10v${60 + (i % 3) * 8}h-10z"/>`).join('')}<path d="M900 612h60v28h-60z"/></g>`
        + `<circle class="tx-lit" cx="40" cy="632" r="6"/><circle class="tx-lit" cx="330" cy="632" r="6"/><circle class="tx-lit" cx="620" cy="632" r="6"/>`
        + mv('txglide', { ad: '22s', dx: '700px', dy: '-30px' }, birds(21, 3, 900, 440, '#4a4252', 1.5, 0) + '')
        + mv('txglide', { ad: '17s', d: '-6s', dx: '800px', dy: '-60px' }, `<g class="x-txflap" style="--ad:1.6s"><path fill="#f2efe8" stroke="#6a5a52" stroke-width="3" d="M300 470c24-22 52-22 70-4c18-18 46-18 70 4c-26-6-50-4-70 10c-20-14-44-16-70-10z"/><path fill="#d8a46a" d="M338 470l24-4-6 14z"/></g>`)
        + `<path fill="#e9d9b2" d="M-160 900V842C200 826 500 846 800 832S1400 826 1760 842V900z"/><path fill="#d3bd8e" opacity=".7" d="M-160 900V872C300 860 800 878 1200 866S1600 872 1760 868V900z"/>`
        + `<path fill="none" stroke="#fff" stroke-width="4" opacity=".7" d="M-160 838q100-16 200 0t200 0t200 0t200 0t200 0t200 0t200 0t200 0t200 0"/>` + finish(0.3); } });

  /* ---------- Fort Worth: the Stockyards at dusk ---------- */
  add({ id: 'fort-worth-stockyards-scene', label: 'The Stockyards at dusk, Fort Worth', site: 'The Stockyards at dusk', colour: 'red', mood: 'cheerful', texasKind: 'scene', tags: ['fort worth', 'stockyards', 'longhorns', 'cattle drive'],
    svg: () => { const s1 = U(), g1 = U(), l1 = U();
      const front = (x, w, h, col, trim) => { let win = '';
        for (let i = 0; i < Math.floor(w / 60); i++) win += `<rect x="${x + 14 + i * 56}" y="${690 - h}" width="30" height="46" rx="5" fill="#3a2a30"/>` + lit(x + 14 + i * 56, 690 - h, 30, 46);
        return `<path fill="${col}" d="M${x} 700V${650 - h}h${R(w * 0.3)}l${R(w * 0.08)} -26h${R(w * 0.24)}l${R(w * 0.08)} 26h${R(w * 0.3)}V700z"/><path fill="${trim}" d="M${x - 8} ${650 - h + 6}h${w + 16}v10h${-w - 16}z"/>` + win + `<path fill="${trim}" d="M${x - 6} 700V690h${w + 12}v10z"/>`; };
      return `<defs>${lin(s1, [[0, '#2a3478'], [0.4, '#a2587e'], [0.72, '#ff9a62'], [1, '#ffd08a']])}${linU(g1, [[0, '#6b4a34'], [1, '#2e2018']], 0, 690, 0, 900)}${radU(l1, [[0, '#ffb070', 0.55], [1, '#ffb070', 0]], 1200, 560, 800)}</defs>`
        + full(`url(#${s1})`) + stars(9, 46, 260) + `<circle cx="300" cy="170" r="34" fill="#fff2d2" opacity=".9"/><circle cx="314" cy="160" r="30" fill="#6b5a9a" opacity=".55"/>`
        + rays(1200, 560, 900, '#ffd8a0', 0.18) + streak(500, 200, 300, '#ff9c80', 0.55) + cloud(1300, 260, 1.1, '#a8587a', 0.8, 60, 10, '#ffbf9a') + cloud(640, 330, 0.8, '#a05a7e', 0.75, 70, 40, '#ffb99a')
        + birds(2, 4, 1100, 300, '#2a1e30', 1.1, 700)
        + mv('txpar', { ad: '34s', dx: '8px' }, canopy('#4a3a62', 560, 30, 5) + haze(520, 90, '#ffb98a', 0.4))
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + front(40, 300, 150, '#8e4a3a', '#d9a86a') + front(360, 220, 190, '#a05c3e', '#e0b678') + front(1010, 240, 170, '#7f4638', '#d9a86a') + front(1270, 300, 150, '#965240', '#e0b678')
        + `<g fill="#3a2430"><rect x="598" y="330" width="26" height="372"/><rect x="976" y="330" width="26" height="372"/><rect x="580" y="316" width="440" height="30" rx="4"/></g>`
        + `<path fill="none" stroke="#3a2430" stroke-width="10" d="M624 360Q800 250 976 360"/>`
        + mv('txglow', { ad: '3s' }, `<path d="${star5(800, 322, 56, 24)}" fill="#ff5a3c"/><path d="${star5(800, 322, 36, 15)}" fill="#ffd27a"/>`)
        + `<path class="tx-lamps" fill="none" stroke="#ffd27a" stroke-width="9" stroke-linecap="round" stroke-dasharray="0 22" d="M598 336Q800 250 1002 336"/>`
        + `<path class="tx-lamps" fill="none" stroke="#ffd27a" stroke-width="8" stroke-linecap="round" stroke-dasharray="0 26" d="M40 600Q300 640 560 596M1040 596Q1300 640 1560 600"/>`
        + `<path fill="url(#${g1})" d="M-160 900V700H1760V900z"/><path fill="#1f1420" opacity=".35" d="M-160 760C300 740 800 780 1100 756S1500 770 1760 756V900H-160z"/>`
        + mv('txmove', { ad: '90s', dx: '900px' }, steer(560, 840, 1.0, '#1c1218', '#d8c8a8', 1) + steer(150, 868, 1.2, '#241820', '#d8c8a8', 2) + steer(860, 880, 1.3, '#1c1218', '#d8c8a8', 3) + steer(1180, 846, 1.05, '#281a22', '#d8c8a8', 4))
        + puffs(260, 850, 4, '#d8a070', 20, 140, 5, -26, 2.4) + puffs(940, 860, 4, '#d8a070', 22, 150, 5.6, -26, 2.4)
        + `<path fill="none" stroke="#2a1c22" stroke-width="8" d="M-20 878H1620M-20 900H1620"/>` + finish(0.34); } });

  /* ---------- Dallas: the skyline at golden hour ---------- */
  add({ id: 'dallas-skyline', label: 'The skyline at golden hour, Dallas', site: 'The skyline at golden hour', colour: 'blue', mood: 'focused', texasKind: 'scene', tags: ['dallas', 'skyline', 'reunion tower', 'bridge'],
    svg: () => { const s1 = U(), w1 = U(), l1 = U();
      const tower = (x, w, h, fill, seed) => { const r = rnd(seed); let o = `<rect x="${x}" y="${650 - h}" width="${w}" height="${h}" fill="${fill}"/>`; const cols = Math.floor(w / 18), rows = Math.floor(h / 26);
        for (let c = 0; c < cols; c++) for (let q = 0; q < rows; q++) if (r() > 0.55) o += lit(x + 6 + c * 18, 650 - h + 10 + q * 26, 9, 12); return o; };
      return `<defs>${lin(s1, [[0, '#4a78c0'], [0.45, '#e4a8a0'], [0.72, '#ffc27a'], [1, '#ffe2a0']])}${linU(w1, [[0, '#f3b988'], [0.2, '#5f7fa8'], [1, '#27415f']], 0, 660, 0, 900)}${radU(l1, [[0, '#ffd490', 0.7], [1, '#ffd490', 0]], 1100, 600, 800)}</defs>`
        + full(`url(#${s1})`) + rays(1100, 600, 1000, '#fff0c0', 0.2) + sun(1100, 600, 52, '#fff6d8', '#ffc470')
        + streak(280, 150, 300, '#fff', 0.5) + cloud(420, 260, 1.2, '#e8a8a0', 0.88, 60, 6, '#fff0e0') + cloud(1320, 220, 1.0, '#f0b4a0', 0.85, 52, 26, '#fff3e4')
        + birds(14, 5, 700, 330, '#3a3050', 1.1, 600)
        + mv('txpar', { ad: '34s', dx: '8px' }, `<g fill="#7f88b4" opacity=".7">${[[80, 60, 120], [170, 50, 170], [260, 70, 100], [1240, 60, 150], [1330, 50, 110], [1420, 70, 180], [1500, 50, 120]].map(([x, w, h]) => `<rect x="${x}" y="${650 - h}" width="${w}" height="${h}"/>`).join('')}</g>`) + haze(500, 160, '#ffd6a0', 0.5)
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + tower(330, 90, 330, '#3b4a78', 1) + tower(430, 70, 250, '#46568a', 2) + tower(520, 110, 400, '#34436e', 3) + tower(660, 80, 280, '#3f4e82', 4) + tower(990, 90, 260, '#3b4a78', 6) + tower(1100, 80, 330, '#34436e', 7) + tower(1190, 100, 220, '#46568a', 8)
        + `<path fill="#34436e" d="M540 250l30-70 30 70z"/><path fill="none" stroke="#9fd0ff" stroke-width="3" opacity=".7" d="M520 250H630M520 400H630"/>`
        + `<g fill="#2f3a66"><rect x="868" y="330" width="14" height="320"/><rect x="858" y="300" width="34" height="34" rx="4"/></g>`
        + mv('txglow', { ad: '4s' }, `<circle cx="875" cy="264" r="46" fill="#46568a"/><circle cx="875" cy="264" r="46" fill="none" stroke="#9fd0ff" stroke-width="3" opacity=".7"/><path d="M830 264h90M875 220v88M842 232l66 64M908 232l-66 64" stroke="#9fd0ff" stroke-width="2" opacity=".5"/><circle class="tx-lit" cx="875" cy="264" r="14"/>`)
        + `<path class="tx-lamps" fill="none" stroke="#9fd0ff" stroke-width="4" stroke-linecap="round" stroke-dasharray="0 14" d="M830 264a46 46 0 0 1 90 0"/><circle class="tx-lit" cx="875" cy="196" r="7"/>`
        + `<rect y="650" width="1600" height="250" fill="url(#${w1})"/>` + shimmer(7, 50, 0, 1600, 670, 880, '#ffe6b0', 60) + shimmer(8, 22, 300, 900, 660, 760, '#9fd0ff', 50)
        + `<path fill="none" stroke="#f4f6fa" stroke-width="18" d="M980 700Q1240 330 1500 700"/><path fill="none" stroke="#f4f6fa" stroke-width="6" d="M1010 690L1240 610M1100 610L1240 560M1380 610L1240 560M1490 690L1240 610M1240 610V520"/>`
        + `<path fill="none" stroke="#d6dce8" stroke-width="3" d="M1030 676V640M1090 628V580M1150 592V560M1240 566V530M1330 592V560M1390 628V580M1450 676V640"/><rect x="900" y="696" width="700" height="14" fill="#e6e9f0"/>`
        + mv('txmove', { ad: '9s', dx: '1000px' }, `<rect x="1000" y="688" width="40" height="5" rx="2" fill="#ffe6a0"/><rect x="1180" y="688" width="60" height="5" rx="2" fill="#ff7a6a"/><rect x="1330" y="688" width="40" height="5" rx="2" fill="#ffe6a0"/>`)
        + `<path fill="#2c4a36" d="M-160 900V810C200 790 600 820 900 806S1500 790 1760 812V900z"/><path fill="#223a2a" d="M-160 900V850C300 836 900 858 1300 846S1600 850 1760 848V900z"/>` + finish(0.34); } });

  /* ---------- Houston: liftoff on the Gulf prairie ---------- */
  add({ id: 'houston-liftoff-scene', label: 'Liftoff at dawn, Houston', site: 'Liftoff at dawn', colour: 'blue', mood: 'energetic', texasKind: 'scene', tags: ['houston', 'space', 'rocket', 'nasa'],
    svg: () => { const s1 = U(), g1 = U(), l1 = U();
      return `<defs>${lin(s1, [[0, '#1c2a62'], [0.38, '#7a5a98'], [0.66, '#f09a86'], [0.84, '#ffcf8c'], [1, '#ffe8b4']])}${radU(l1, [[0, '#ffc888', 0.6], [1, '#ffc888', 0]], 800, 640, 800)}</defs>`
        + full(`url(#${s1})`) + stars(12, 60, 340) + `<path d="M1380 120a46 46 0 1 0 38 70a38 38 0 1 1-38-70z" fill="#fff6dc"/>`
        + rays(800, 660, 1100, '#ffd9a8', 0.18) + streak(240, 250, 300, '#f6b8b0', 0.5) + cloud(1280, 340, 1.1, '#c5849a', 0.85, 60, 10, '#ffd0b8') + cloud(380, 430, 0.9, '#c9889e', 0.8, 70, 30, '#ffd5bd')
        + mv('txpar', { ad: '38s', dx: '8px' }, `<g fill="#6a5a8e" opacity=".75">${[[90, 40, 80], [140, 30, 130], [180, 44, 100], [240, 34, 150], [286, 40, 90], [330, 30, 120]].map(([x, w, h]) => `<rect x="${x}" y="${640 - h}" width="${w}" height="${h}"/>`).join('')}</g>`) + haze(560, 100, '#ffd4a8', 0.5)
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + `<path fill="#3d5a50" d="M-160 900V650C200 636 600 656 900 646S1500 636 1760 652V900z"/><path fill="#4b6a54" opacity=".6" d="M-160 700C300 690 900 712 1300 698S1600 702 1760 700V900H-160z"/>`
        + `<rect x="0" y="652" width="1600" height="60" fill="#e8b48a" opacity=".42"/>` + shimmer(3, 28, 400, 1200, 656, 700, '#fff0cc', 70)
        + `<g stroke="#3a3248" stroke-width="7" fill="none"><path d="M520 650V280M600 650V280M520 560h80M520 460h80M520 360h80M520 560l80-100M600 560l-80-100M520 460l80-100M600 460l-80-100M520 360l80-80M600 360l-80-80"/><path d="M600 340h120M600 440h120M600 540h120"/></g><circle class="tx-lit" cx="560" cy="268" r="9"/><circle class="tx-lit" cx="720" cy="340" r="7"/>`
        + `<rect x="560" y="640" width="260" height="26" fill="#4a4258"/>`
        + mv('txlift', { ad: '14s' }, mv('txflicker', { ad: '.2s', to: '800px 640px' }, '<path fill="#ffe08a" d="M786 640q14 120 28 0z"/><path fill="#fff6d8" d="M793 640q7 70 14 0z"/>')
          + '<path fill="#fff" d="M772 640V260q28-72 56 0V640z"/><path fill="#d8dce8" d="M808 260q20 60 20 380h-20z"/><rect x="772" y="330" width="56" height="26" fill="#2a2a3a"/><rect x="772" y="420" width="56" height="26" fill="#2a2a3a"/><rect x="772" y="560" width="56" height="30" fill="#2a2a3a"/><path fill="#fff" d="M772 560l-30 82h30zM828 560l30 82h-30z"/>'
          + '<path fill="#e84a3c" d="M772 268q28-72 56 0z"/>')
        + puffs(800, 650, 8, '#fff3e4', 30, -200, 4.4, -50, 2.6) + puffs(800, 654, 8, '#f6d6c0', 28, 220, 4.8, -40, 2.4) + puffs(800, 650, 5, '#ffffff', 34, 0, 5, -100, 2.4)
        + `<g fill="none" stroke="#3b5238" stroke-width="3" stroke-linecap="round">${Array.from({ length: 36 }, (_, i) => { const x = 20 + i * 44, h = 40 + (i * 37) % 50; return `<path d="M${x} 900q${(i % 3) * 4 - 4} ${-h / 2} ${(i % 5) * 3 - 6} ${-h}"/>`; }).join('')}</g>`
        + `<path fill="#2c4430" d="M-160 900V850C200 836 600 860 900 848S1500 836 1760 852V900z"/>` + finish(0.34); } });

  /* ---------- Austin: the bats at dusk ---------- */
  add({ id: 'austin-bats-scene', label: 'The bats at dusk, Austin', site: 'The bats at dusk', colour: 'violet', mood: 'dreamy', texasKind: 'scene', tags: ['austin', 'bats', 'congress avenue', 'capitol'],
    svg: () => { const s1 = U(), w1 = U(), l1 = U(), ba = U(), bb = U();
      const r = rnd(77); let swarm = '';
      for (let i = 0; i < 64; i++) { const k = r(), s = 0.55 + r() * 0.9, y0 = 600 + r() * 30, dy = -(120 + k * 360), dx = 500 + r() * 800, d = -(r() * 9).toFixed(1);
        swarm += `<g transform="translate(${R(320 + r() * 380)} ${R(y0)}) scale(${s.toFixed(2)})"><use href="#${i % 2 ? ba : bb}" class="x-txbat" style="--ad:${(8 + r() * 5).toFixed(1)}s;--d:${d}s;--dx:${R(dx)}px;--dy:${R(dy)}px"/></g>`; }
      return `<defs>${lin(s1, [[0, '#2c2a6e'], [0.4, '#7a4f90'], [0.7, '#e88a78'], [1, '#ffcf8c']])}${linU(w1, [[0, '#d68a82'], [0.2, '#4a4a86'], [1, '#1c2044']], 0, 650, 0, 900)}${radU(l1, [[0, '#ff9a78', 0.55], [1, '#ff9a78', 0]], 1000, 600, 800)}<path id="${ba}" fill="#15101e" d="M0 0q-6-14-22-12q8 6 6 14q-8-4-16-2q10 4 14 12q4-6 10-6q4 6 8 6q4-6 8-6q6 0 10 6q4-8 14-12q-8-2-16 2q-2-8 6-14q-16-2-22 12z"/><path id="${bb}" fill="#15101e" d="M0 0q-6 6-22 8q8-8 6-16q-8 6-16 6q10-8 14-18q4 8 10 8q4-6 8-6q4 0 8 6q6 0 10-8q4 10 14 18q-8 0-16-6q-2 8 6 16q-16-2-22-8z"/></defs>`
        + full(`url(#${s1})`) + stars(15, 50, 260) + `<circle cx="1260" cy="170" r="32" fill="#fff0cc" opacity=".9"/>`
        + rays(1000, 600, 900, '#ffb88a', 0.15) + streak(300, 190, 300, '#c78ab0', 0.5) + cloud(1240, 300, 1.1, '#9c5a86', 0.8, 60, 6, '#f2a898') + cloud(480, 370, 0.9, '#9a5a88', 0.75, 70, 24, '#f4a89a')
        + mv('txpar', { ad: '36s', dx: '8px' }, `<g fill="#4a4486" opacity=".8">${[[900, 60, 190], [970, 44, 260], [1020, 70, 210], [1100, 50, 300], [1160, 66, 180], [1240, 54, 240], [1310, 70, 170], [1400, 50, 220], [1470, 60, 160]].map(([x, w, h]) => `<rect x="${x}" y="${650 - h}" width="${w}" height="${h}"/>`).join('')}</g>`)
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + `<g><path fill="#d69486" d="M70 650V528h300V650z"/><path fill="#e0a090" d="M70 528h300v14H70z"/>${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${126 + i * 36}" y="548" width="12" height="102" fill="#f2c8ba"/>`).join("")}<path fill="#e8b0a0" d="M110 528L220 474L330 528z"/><path fill="#f2c8ba" d="M140 524L220 484L300 524z"/><rect x="180" y="410" width="80" height="68" fill="#e0a090"/><path fill="#f2c8ba" d="M188 410v68M206 410v68M224 410v68M242 410v68" stroke="#f2c8ba" stroke-width="6" fill="none"/><path fill="#e8b0a0" d="M172 414q48-110 96 0z"/><path fill="#f2c8ba" d="M200 402q20-70 40 0z" opacity=".5"/><rect x="212" y="322" width="16" height="34" fill="#e0a090"/><path d="${star5(220, 308, 14, 6)}" fill="#ffe08a"/></g><circle class="tx-lit" cx="220" cy="448" r="7"/><circle class="tx-lit" cx="150" cy="590" r="6"/><circle class="tx-lit" cx="290" cy="590" r="6"/>`
        + `<rect y="650" width="1600" height="250" fill="url(#${w1})"/>` + shimmer(5, 56, 0, 1600, 662, 880, '#ffb48a', 60) + shimmer(6, 20, 700, 1400, 662, 760, '#9fb4ff', 50)
        + `<g fill="#2a2640"><rect x="-20" y="610" width="1640" height="22"/>${Array.from({ length: 20 }, (_, i) => `<path d="M${40 + i * 80} 632q40 52 80 0z" fill="#241f3a"/>`).join('')}${Array.from({ length: 20 }, (_, i) => `<rect x="${R(36 + i * 80)}" y="632" width="8" height="38"/>`).join('')}</g>`
        + `<path class="tx-lamps" fill="none" stroke="#ffd27a" stroke-width="7" stroke-linecap="round" stroke-dasharray="0 40" d="M0 606H1600"/>`
        + swarm
        + `<path fill="#0f1020" d="M-160 900V836C200 820 600 850 900 836S1500 822 1760 840V900z"/>` + finish(0.34); } });

  /* ---------- San Antonio: the Alamo in the morning ---------- */
  add({ id: 'alamo-morning', label: 'The Alamo in the morning light, San Antonio', site: 'The Alamo in the morning light', colour: 'amber', mood: 'calm', texasKind: 'scene', tags: ['san antonio', 'alamo', 'mission', 'plaza'],
    svg: () => { const s1 = U(), p1 = U(), l1 = U(), w = U();
      const palm = (x, y, s, lean) => { let f = ''; for (let i = 0; i < 9; i++) { const a = -150 + i * 37.5; f += `<path d="M0 0q${R(40 * s)} ${-R(30 * s)} ${R(100 * s)} ${R(14 * s)}q${-R(46 * s)} ${-R(10 * s)} ${-R(100 * s)} ${-R(14 * s)}z" transform="rotate(${a} 0 0)"/>`; }
        return `<g transform="translate(${x} ${y})"><path fill="#6a5238" d="M-9 0L${R(lean) - 5} ${-R(300 * s)}h10L9 0z"/>${mv('txsway2', { ad: '5s', to: `${x + R(lean)}px ${y - R(300 * s)}px` }, `<g transform="translate(${R(lean)} ${-R(300 * s)})" fill="#3f6b3a">${f}</g>`)}</g>`; };
      return `<defs>${lin(s1, [[0, '#6aa0dc'], [0.5, '#bcd8ee'], [0.8, '#fbe6b8'], [1, '#ffd99a']])}${linU(p1, [[0, '#d9c19a'], [1, '#a88a62']], 0, 700, 0, 900)}${radU(l1, [[0, '#fff0c0', 0.6], [1, '#fff0c0', 0]], 1280, 250, 800)}${linU(w, [[0, '#f1e0b8'], [1, '#d6bf90']], 0, 300, 0, 700)}</defs>`
        + full(`url(#${s1})`) + rays(1280, 250, 1000, '#fff6d4', 0.22) + sun(1280, 250, 44, '#fffbe8', '#ffe6a0')
        + streak(260, 130, 300, '#fff', 0.55) + cloud(380, 230, 1.1, '#e6edf6', 0.92, 58, 6) + cloud(920, 150, 0.8, '#eef3f9', 0.85, 66, 24)
        + birds(31, 6, 780, 300, '#3a4658', 1.1, 700)
        + mv('txpar', { ad: '34s', dx: '8px' }, canopy('#6f9a6a', 600, 28, 6, null, null, null) + haze(570, 80, '#f6efd2', 0.5))
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + `<g><path fill="url(#${w})" d="M360 700V470h46V430h74V470h30V380h110V330q10-26 40-26t40 26V380h110V470h30V430h74V470h46V700z"/>`
        + `<path fill="url(#${w})" d="M562 380V320q20-38 40-20q-6-34 6-50q10 26 40 18q28-8 52 20q40-28 52 40V380z"/><path fill="#c9b080" d="M562 380h284v8H562z"/>`
        + `<path fill="#b99a68" d="M700 700V540a54 54 0 0 1 108 0V700z"/><path fill="#6a4a30" d="M714 700V548a40 40 0 0 1 80 0V700z"/><path fill="#c9b080" d="M692 470h124v10H692z"/>`
        + `<path fill="#b99a68" d="M468 520h50V440q25-30 50 0V520z"/><path fill="#6a4a30" d="M480 520V452q13-18 26 0V520z"/>`
        + `<path fill="#b99a68" d="M938 520h50V440q25-30 50 0V520z"/>`
        + `<path fill="#d4bc8c" d="M586 440q16-22 32 0v50h-32zM790 440q16-22 32 0v50h-32z"/><path fill="#8a6a48" d="M598 452a8 8 0 1 1 8 0v26h-8zM802 452a8 8 0 1 1 8 0v26h-8z"/>`
        + `<path fill="none" stroke="#c4a870" stroke-width="3" opacity=".7" d="M360 560H1040M360 620H1040M430 470V700M1000 470V700"/></g>`
        + `<circle class="tx-lit" cx="684" cy="560" r="8"/><circle class="tx-lit" cx="826" cy="560" r="8"/>`
        + `<g class="x-txflag"><path fill="none" stroke="#7a6048" stroke-width="5" d="M1060 700V450"/><path fill="#fff" d="M1063 454h70v18h-70z"/><path fill="#3c63b8" d="M1063 454h26v36h-26z"/><path fill="#d94c3a" d="M1089 472h44v18h-44z"/></g>`
        + `<path fill="url(#${p1})" d="M-160 900V700H1760V900z"/><path fill="#8a7050" opacity=".4" d="M-160 790H1760V800H-160zM-160 840H1760V852H-160z"/>`
        + `<g fill="none" stroke="#a88a62" stroke-width="3" opacity=".6">${Array.from({ length: 14 }, (_, i) => `<path d="M${800 + (i - 7) * 40} 700L${800 + (i - 7) * 190} 900"/>`).join('')}</g>`
        + `<path fill="#4a3a28" opacity=".22" d="M380 700l-90 190H1030L1020 700z"/>`
        + `<path class="tx-lamps" fill="none" stroke="#ffd27a" stroke-width="8" stroke-linecap="round" stroke-dasharray="0 30" d="M120 560Q400 640 700 590M900 590Q1200 640 1480 560"/>`
        + palm(150, 780, 1.4, 10) + palm(1470, 790, 1.5, -14) + palm(330, 800, 1.0, -6)
        + oak(1260, 800, 1.1, '#2c4a2a', '#41653a', '#80a04e', 2)
        + mv('txglide', { ad: '12s', dx: '500px', dy: '-300px' }, birds(41, 7, 600, 720, '#6a6a78', 1.2, 0)) + finish(0.3); } });

  /* ---------- El Paso: the star on the Franklin Mountains ---------- */
  add({ id: 'el-paso-star-scene', label: 'The star on the mountain, El Paso', site: 'The star on the Franklin Mountains', colour: 'amber', mood: 'proud', texasKind: 'scene', tags: ['el paso', 'franklin mountains', 'star', 'desert'],
    svg: () => { const s1 = U(), m1 = U(), g1 = U(), l1 = U(), sg = U();
      const jag = (fill, pts) => `<path fill="${fill}" d="M-160 900V${pts[0][1]}${pts.map(([x, y]) => `L${x} ${y}`).join('')}L1760 ${pts[pts.length - 1][1]}V900z"/>`;
      const lights = (seed, n, x0, x1, y0, y1) => { const r = rnd(seed); let d = ''; for (let i = 0; i < n; i++) { const y = R(y0 + r() * (y1 - y0)), x = R(x0 + r() * (x1 - x0)), w = R(60 + r() * 220); d += `M${x} ${y}h${w}`; } return `<path class="tx-lamps" fill="none" stroke="#ffd27a" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 11" d="${d}"/>`; };
      return `<defs>${lin(s1, [[0, '#2e2a72'], [0.35, '#8a4f8e'], [0.62, '#f08a6a'], [0.82, '#ffc46e'], [1, '#ffe39a']])}${linU(m1, [[0, '#8a5a8e'], [1, '#3e2a58']], 0, 380, 0, 700)}${linU(g1, [[0, '#7a4a3a'], [1, '#2c1a22']], 0, 720, 0, 900)}${radU(sg, [[0, '#ffe08a', 0.85], [1, '#ffe08a', 0]], 1030, 430, 170)}</defs>`
        + full(`url(#${s1})`) + stars(18, 40, 240) + rays(400, 600, 1000, '#ffd49a', 0.2) + sun(400, 610, 50, '#fff3c8', '#ffb868')
        + streak(1180, 150, 320, '#ff9c84', 0.55) + streak(300, 260, 260, '#ffb08a', 0.5, 70) + cloud(1280, 330, 1.0, '#b0587e', 0.8, 60, 12, '#ffc09a') + cloud(560, 400, 0.8, '#a85a84', 0.75, 70, 36, '#ffbd9a')
        + birds(23, 3, 900, 300, '#2a1c36', 1.2, 700)
        + mv('txpar', { ad: '38s', dx: '8px' }, jag('#9a6a94', [[-160, 560], [140, 500], [320, 540], [560, 450], [760, 520], [980, 380], [1120, 440], [1300, 360], [1500, 470], [1760, 520]])) + haze(480, 120, '#ffb88a', 0.45)
        + jag(`url(#${m1})`, [[-160, 600], [100, 560], [260, 520], [420, 580], [620, 520], [820, 470], [960, 400], [1040, 340], [1120, 420], [1260, 380], [1420, 470], [1600, 520], [1760, 560]])
        + `<path fill="#ffb07a" opacity=".35" d="M960 400L1040 340L1120 420L1060 430L1010 470z"/>`
        + `<rect width="1600" height="900" fill="url(#${sg})"/>`
        + mv('txglow', { ad: '3.4s' }, `<path d="${star5(1030, 430, 76, 32)}" fill="#ffcf6a" opacity=".45"/><path d="${star5(1030, 430, 70, 29)}" fill="none" stroke="#ffe9a8" stroke-width="5" stroke-linejoin="round"/>`)
        + `<path class="tx-lamps" fill="none" stroke="#fff6d0" stroke-width="9" stroke-linecap="round" stroke-dasharray="0 16" d="${star5(1030, 430, 76, 32)}"/>`
        + `<path fill="url(#${g1})" d="M-160 900V700C200 690 600 720 900 704S1500 690 1760 710V900z"/>`
        + `<rect y="690" width="1600" height="120" fill="#2c1a22" opacity=".75"/>` + lights(2, 22, 40, 1500, 696, 800) + lights(3, 10, 300, 1200, 800, 850)
        + `<path class="tx-lamps" fill="none" stroke="#ff8a6a" stroke-width="6" stroke-linecap="round" stroke-dasharray="0 22" d="M0 760Q500 740 900 770T1600 750"/>`
        + `<path fill="#1c1018" d="M-160 900V850C200 840 700 862 1000 850S1500 842 1760 856V900z"/>`
        + `<g fill="none" stroke="#1c1018" stroke-linecap="round"><g stroke-width="9"><path d="M180 880V760M180 830q-30-6-34-40M180 810q28-6 30-36"/><path d="M1400 884V770M1400 836q-30-4-36-36M1400 816q30-6 34-36"/></g><g stroke-width="5"><path d="M600 880l-20-90M612 880l-2-110M624 880l22-96M636 880l40-70"/></g></g>`
        + mv('txsway', { ad: '5s' }, `<g fill="none" stroke="#1c1018" stroke-width="5" stroke-linecap="round"><path d="M880 884q-20-100-4-170M890 884q2-110 20-164M900 884q22-90 52-130"/></g>${[0, 1, 2, 3].map(i => `<circle cx="${876 + i * 8}" cy="${716 - i % 2 * 10}" r="5" fill="#e0503a"/>`).join('')}`)
        + `<path fill="#1c1018" d="M1180 884c-12-24-8-60 8-60s14 36 4 60zM1214 884c-6-20 0-40 12-40s12 22 2 40z"/>` + finish(0.34); } });

  return S;
}
/** The css the scenes need (the Texas pack adds it to its own). */
function animTexasSceneCss() {
  const A = '.anim-scene .x-';
  return [
    '.anim-scene.ap-full .tx-tint { fill: #4a4f94; mix-blend-mode: multiply; opacity: 0; pointer-events: none; }',
    '.anim-scene.ap-full .tx-lit { fill: #ffd27a; stroke: #ffd27a; opacity: 0; }',
    '.anim-scene.ap-full .tx-lamps { opacity: 0; }',
    '.anim-scene.ap-full .tx-star { opacity: 0; }',
    '[data-theme="dark"] .anim-scene.ap-full .tx-tint, .anim-scene.ap-full.tod-dusk .tx-tint { opacity: .6; }',
    '.anim-scene.ap-full.tod-night .tx-tint { opacity: .85; }',
    '[data-theme="dark"] .anim-scene.ap-full :is(.tx-lit, .tx-lamps), .anim-scene.ap-full.tod-dusk :is(.tx-lit, .tx-lamps), .anim-scene.ap-full.tod-night :is(.tx-lit, .tx-lamps) { opacity: .92; }',
    '[data-theme="dark"] .anim-scene.ap-full .tx-star, .anim-scene.ap-full.tod-night .tx-star { opacity: .8; }',
    'html .anim-scene.ap-full:is(.tod-day, .tod-dawn) :is(.tx-tint, .tx-lit, .tx-lamps, .tx-star) { opacity: 0; }',
    A + 'txdrift { --an: ap-txdrift; --ad: 46s; }', A + 'txpar { --an: ap-txdrift; --ad: 30s; }', A + 'txglide { --an: ap-txglide; --ad: 18s; --ae: linear; }',
    A + 'txflap { --an: ap-txflap; --ad: .7s; }', A + 'txshim { --an: ap-txshim; --ad: 3s; }', A + 'txpuff { --an: ap-txpuff; --ad: 3.6s; --ae: cubic-bezier(.2, .6, .4, 1); }',
    A + 'txmove { --an: ap-txmove; --ad: 24s; --ae: linear; }', A + 'txbob { --an: ap-txbob; --ad: 3s; }', A + 'txglow { --an: ap-txglow; --ad: 6s; }',
    A + 'txrise { --an: ap-txrise; --ad: 9s; --ai: 1; --ae: cubic-bezier(.2, .7, .3, 1); }', A + 'txsway { --an: ap-txsway; --ad: 4s; }', A + 'txsway2 { --an: ap-txsway2; --ad: 6s; }',
    A + 'txspin { --an: ap-txspin; --ad: 40s; --ae: linear; }', A + 'txflag { --an: ap-txflag; --ad: 2s; }', A + 'txflicker { --an: ap-txflicker; --ad: .22s; }',
    A + 'txlift { --an: ap-txlift; --ad: 14s; --ai: 1; --ae: cubic-bezier(.5, 0, .7, .6); }', A + 'txbat { --an: ap-txbat; --ad: 9s; --ae: linear; }',
    '@keyframes ap-txdrift { 0%, 100% { transform: translateX(calc(var(--dx, 80px) * -1)); } 50% { transform: translateX(var(--dx, 80px)); } }',
    '@keyframes ap-txglide { 0% { transform: translate(calc(var(--dx, 500px) * -.5), 0); opacity: 0; } 10%, 85% { opacity: 1; } 100% { transform: translate(calc(var(--dx, 500px) * .5), var(--dy, -30px)); opacity: 0; } }',
    '@keyframes ap-txflap { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(-.35); } }',
    '@keyframes ap-txshim { 0%, 100% { opacity: .1; transform: translateX(-8px); } 50% { opacity: .9; transform: translateX(8px); } }',
    '@keyframes ap-txpuff { 0% { transform: translate(0, 0) scale(.35); opacity: 0; } 12% { opacity: .95; } 100% { transform: translate(var(--dx, -120px), var(--dy, -260px)) scale(var(--sc, 2.6)); opacity: 0; } }',
    '@keyframes ap-txmove { from { transform: translateX(calc(var(--dx, 400px) * -.5)); } to { transform: translateX(calc(var(--dx, 400px) * .5)); } }',
    '@keyframes ap-txbob { 0%, 100% { transform: translateY(calc(var(--dy, 5px) * -1)); } 50% { transform: translateY(var(--dy, 5px)); } }',
    '@keyframes ap-txglow { 0%, 100% { opacity: .82; transform: scale(.97); } 50% { opacity: 1; transform: scale(1.04); } }',
    '@keyframes ap-txrise { from { transform: translateY(90px); opacity: .6; } to { transform: none; opacity: 1; } }',
    '@keyframes ap-txsway { 0%, 100% { transform: skewX(-3deg); } 50% { transform: skewX(3deg); } }',
    '@keyframes ap-txsway2 { 0%, 100% { transform: rotate(-.8deg); } 50% { transform: rotate(.8deg); } }',
    '@keyframes ap-txspin { to { transform: rotate(1turn); } }',
    '@keyframes ap-txflag { 0%, 100% { transform: skewY(0) scaleX(1); } 50% { transform: skewY(-4deg) scaleX(.94); } }',
    '@keyframes ap-txflicker { 0%, 100% { transform: scaleY(1); opacity: .95; } 50% { transform: scaleY(1.18); opacity: .8; } }',
    '@keyframes ap-txlift { from { transform: translateY(0); } to { transform: translateY(-620px); } }',
    '@keyframes ap-txbat { 0% { transform: translate(0, 0); opacity: 0; } 8%, 88% { opacity: 1; } 100% { transform: translate(var(--dx, 900px), var(--dy, -380px)); opacity: 0; } }',
  ].join('\n');
}
