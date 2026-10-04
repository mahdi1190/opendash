/* ============================================================
   ANIMATION PACK "uk-south-east" (v2.2, UK batch 2, first county: Hampshire).
   PURE classic script, the same manifest and quality gate as
   72-anim-pack-uk-south-west.js (docs/dev/UK_PACK.md). Opt-in like every UK
   pack: the items play only when the detected county (71-uk-counties.js,
   offline) is theirs.
   Hampshire is drawn as FULL-VIEWPORT scenes (item.full: a 1600 x 900
   drawing, preserveAspectRatio slice, so it fills any screen edge to edge):
   the opening sequence plays one full screen after "Welcome to Hampshire"
   (78-anim-wire.js), and the gallery and the animation-of-the-day card show
   them large. Each scene is layered: a sky gradient and its light, far /
   mid / near layers that drift at different speeds (parallax), and ambient
   life (birds, clouds, water shimmer, steam, smoke). Ten scenes rotate with
   the seeded daily look; each carries `site` for the origin line.
   Colours are painted (the scene's own palette); the dark theme, or a
   tod-dusk / tod-night class (animItemHtml o.tod), lays an evening grade
   over it and lights the windows (.hx-tint, .hx-lit, .hx-star). Motion:
   x-* classes only (transform and opacity); the still frame (reduced
   motion) is the whole scene at rest.
   ============================================================ */
(function () {
  const REGION = 'south-east', NATION = 'GB-ENG';
  const items = [];
  const NAMES = { hampshire: 'Hampshire' };
  /** One county element. months: only in those months (a dated tradition). */
  const add = (county, kind, o) => {
    const months = o.months || null;
    items.push(Object.assign({
      slot: 'opening', mood: 'calm', intensity: 'subtle', theme: 'any', season: 'any', region: [NATION], reduced: 'static', priority: 1, full: true,
      county, ukRegion: REGION, ukKind: kind, signature: kind === 'signature', site: o.label,
      when: (day, ctx) => !!ctx && ctx.county === county && (!months || months.includes(+String(day).slice(5, 7))),
    }, o, {
      id: county + '-' + o.id,
      label: o.label + ', ' + NAMES[county],
      tags: ['uk', 'south east', NAMES[county].toLowerCase(), kind].concat(o.tags || []),
    }));
  };

  /* ---------- the toolkit: 1600 x 900 user units ---------- */
  let _n = 0;
  const U = () => 'hx' + (++_n).toString(36);                      // a gradient id, unique per render
  const R = (v) => Math.round(v);
  const rnd = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  const stops = (a) => a.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`).join('');
  const lin = (id, a, x2, y2) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2 || 0}" y2="${y2 == null ? 1 : y2}">${stops(a)}</linearGradient>`;
  const rad = (id, a) => `<radialGradient id="${id}">${stops(a)}</radialGradient>`;
  const st = (o) => Object.entries(o).map(([k, v]) => k === 'to' ? `transform-box:view-box;transform-origin:${v}` : `--${k}:${v}`).join(';');
  /** A moving group: x-<cls> with its own timing (--ad duration, --d delay, --dx/--dy travel). */
  const mv = (cls, o, inner) => `<g class="x-${cls}"${o ? ` style="${st(o)}"` : ''}>${inner}</g>`;
  const full = (fill, y) => `<rect y="${y || 0}" width="1600" height="${900 - (y || 0)}" fill="${fill}"/>`;
  /** A smooth ridge from x -160 to 1760 (room to drift), filled down to the foot. */
  const ridge = (fill, y, amp, n, seed, foot) => {
    const r = rnd(seed), p = [];
    for (let i = 0; i <= n; i++) p.push([-160 + i * (1920 / n), y - r() * amp]);
    let d = `M-160 ${foot || 900}V${R(p[0][1])}`;
    for (let i = 1; i <= n; i++) d += `Q${R(p[i - 1][0])} ${R(p[i - 1][1])} ${R((p[i - 1][0] + p[i][0]) / 2)} ${R((p[i - 1][1] + p[i][1]) / 2)}`;
    return `<path fill="${fill}" d="${d}L1760 ${R(p[n][1])}V${foot || 900}z"/>`;
  };
  /** A woodland edge: crowns of uneven size along y (rim: a lighter edge where the light catches it). */
  const canopy = (fill, y, amp, seed, x0, x1, foot, rim) => {
    const path = (dy, k) => {
      const r = rnd(seed); let x = x0 == null ? -160 : x0, d = `M${x} ${foot || 900}V${y + dy}`;
      const end = x1 == null ? 1760 : x1;
      while (x < end) { const w = 26 + r() * 64, h = 8 + r() * amp, j = r() * 10 - 5; d += `c${R(w * 0.1)} ${-R(h * 1.4 * k)} ${R(w * 0.9)} ${-R(h * 1.4 * k)} ${R(w)} ${R(j)}`; x += w; }
      return `${d}V${foot || 900}H${x0 == null ? -160 : x0}z`;
    };
    return (rim ? `<path fill="${rim}" d="${path(-5, 1.06)}"/>` : '') + `<path fill="${fill}" d="${path(0, 1)}"/>`;
  };
  /** Gradients in user space (one per scene: the light falls across the whole drawing). */
  const linU = (id, a, x1, y1, x2, y2) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(a)}</linearGradient>`;
  const radU = (id, a, cx, cy, r) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops(a)}</radialGradient>`;
  /** A soft cumulus: a flat, shaded base and lit puffs on top, drifting. */
  const cloud = (x, y, s, tone, op, dur, del, top) => {
    const g = U(), r = rnd(R(x * 7 + y)); let puffsD = '';
    for (let i = 0; i < 6; i++) { const px = x - 120 * s + i * 48 * s + r() * 20 * s, pr = (34 + r() * 40) * s * (i === 2 || i === 3 ? 1.35 : 1); puffsD += `<circle cx="${R(px)}" cy="${R(y - pr * 0.55)}" r="${R(pr)}"/>`; }
    return `<defs>${linU(g, [[0, top || '#fff'], [0.55, top || '#fff'], [1, tone]], 0, R(y - 110 * s), 0, R(y + 24 * s))}</defs>`
      + mv('ukdrift', { ad: (dur || 46) + 's', d: -(del || 0) + 's', dx: R(60 + s * 40) + 'px' },
        `<g opacity="${op || 0.92}" fill="url(#${g})"><ellipse cx="${x}" cy="${y}" rx="${R(170 * s)}" ry="${R(26 * s)}"/>${puffsD}</g>`);
  };
  /** A thin high streak of cloud. */
  const streak = (x, y, w, col, op, dur) => mv('ukdrift', { ad: (dur || 60) + 's', dx: '90px' }, `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${R(w / 22) + 3}" fill="${col}" opacity="${op || 0.5}"/><ellipse cx="${R(x + w * 0.3)}" cy="${y + 10}" rx="${R(w * 0.6)}" ry="${R(w / 30) + 2}" fill="${col}" opacity="${(op || 0.5) * 0.7}"/>`);
  /** Long soft rays from the sun, turning slowly. */
  const rays = (x, y, len, col, op) => { const g = U(); let d = ''; const r = rnd(R(x + y)); for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + r() * 0.3, b = a + 0.025 + r() * 0.07; d += `M${x} ${y}L${R(x + Math.cos(a) * len)} ${R(y + Math.sin(a) * len)}L${R(x + Math.cos(b) * len)} ${R(y + Math.sin(b) * len)}z`; }
    return `<defs>${radU(g, [[0, col, op || 0.4], [1, col, 0]], x, y, len)}</defs>` + `<g class="x-ukspin" style="--ad:40s;transform-box:view-box;transform-origin:${x}px ${y}px"><path fill="url(#${g})" d="${d}"/></g>`; };
  /** A band of haze (depth between layers). */
  const haze = (y, h, col, op) => { const g = U(); return `<defs>${linU(g, [[0, col, 0], [0.5, col, op || 0.6], [1, col, 0]], 0, y, 0, y + h)}</defs><rect x="-200" y="${y}" width="2000" height="${h}" fill="url(#${g})"/>`; };
  /** Darkened edges, and the evening grade (the dark theme, tod-dusk, tod-night). */
  const finish = (op) => { const g = U(); return `<defs><radialGradient id="${g}" cx=".5" cy=".46" r=".75">${stops([[0.55, '#0b0d22', 0], [1, '#0b0d22', op || 0.38]])}</radialGradient></defs><rect width="1600" height="900" fill="url(#${g})" pointer-events="none"/>` + tint(); };
  /** Birds gliding across, wings beating. */
  const birds = (seed, n, x, y, col, size, dx) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) {
      const s = (size || 1) * (0.7 + r() * 0.6), bx = R(x + r() * 260 - 130), by = R(y + r() * 120 - 60);
      o += mv('ukglide', { ad: R(16 + r() * 10) + 's', d: -R(r() * 14) + 's', dx: (dx || 520) + 'px', dy: R(-40 + r() * 60) + 'px' },
        mv('ukflap', { ad: (0.5 + r() * 0.4).toFixed(2) + 's', d: -(r()).toFixed(2) + 's' },
          `<path fill="none" stroke="${col}" stroke-width="${(3.2 * s).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" d="M${bx - R(18 * s)} ${by}q${R(9 * s)} ${-R(10 * s)} ${R(18 * s)} 0q${R(9 * s)} ${-R(10 * s)} ${R(18 * s)} 0"/>`));
    }
    return o;
  };
  /** Glints on water. */
  const shimmer = (seed, n, x0, x1, y0, y1, col, w) => {
    const r = rnd(seed); let o = '';
    for (let i = 0; i < n; i++) {
      const y = y0 + r() * (y1 - y0), k = (y - y0) / Math.max(1, y1 - y0), len = R((w || 40) * (0.5 + k) * (0.6 + r() * 0.8));
      o += `<rect class="x-ukshim" style="--ad:${(2 + r() * 2.6).toFixed(1)}s;--d:-${(r() * 3).toFixed(1)}s" x="${R(x0 + r() * (x1 - x0))}" y="${R(y)}" width="${len}" height="${R(2 + k * 3)}" rx="2" fill="${col}"/>`;
    }
    return o;
  };
  /** Rising steam or smoke: puffs that grow and fade. */
  const puffs = (x, y, n, col, size, dx, dur, dy, sc) => {
    let o = '';
    for (let i = 0; i < n; i++) o += `<circle class="x-ukpuff" style="--ad:${dur || 3.6}s;--d:-${((dur || 3.6) * i / n).toFixed(2)}s;--dx:${dx || -120}px${dy ? `;--dy:${dy}px` : ''}${sc ? `;--sc:${sc}` : ''}" cx="${x}" cy="${y}" r="${R((size || 30) * (0.8 + (i % 3) * 0.15))}" fill="${col}"/>`;
    return o;
  };
  const stars = (seed, n, y1) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) o += `<circle cx="${R(r() * 1600)}" cy="${R(r() * (y1 || 300))}" r="${(1 + r() * 1.6).toFixed(1)}"/>`; return `<g class="hx-star" fill="#fff">${o}</g>`; };
  /** The evening grade (dark theme, tod-dusk, tod-night): 71-anim-wire.css and the pack css below. */
  const tint = () => `<rect class="hx-tint" width="1600" height="900"/>`;
  /** A light-catching sun with a wide glow. */
  const sun = (x, y, r, core, halo, rise) => { const g = U(); return `<defs>${rad(g, [[0, halo, 0.85], [0.35, halo, 0.35], [1, halo, 0]])}</defs>`
    + mv(rise ? 'ukrise' : 'ukglow', rise ? { ad: '9s' } : { ad: '6s' }, `<circle cx="${x}" cy="${y}" r="${r * 6}" fill="url(#${g})"/><circle cx="${x}" cy="${y}" r="${r}" fill="${core}"/>`); };
  /** Grass blades swaying along a band (foreground life). */
  const grass = (seed, n, x0, x1, y, h, col) => {
    const r = rnd(seed); let d = '';
    for (let i = 0; i < n; i++) { const x = R(x0 + r() * (x1 - x0)), hh = R(h * (0.5 + r())), lean = R((r() - 0.5) * hh * 0.6); d += `M${x - 4} ${y}q${R(lean / 2)} ${-R(hh / 2)} ${lean + 2} ${-hh}q${-R(lean / 3)} ${R(hh / 2)} 6 ${hh}z`; }
    return `<g class="x-uksway o-b" style="--ad:4.4s"><path fill="${col}" d="${d}"/></g>`;
  };
  /** Wild flowers on stems, nodding (poppies, cow parsley, buttercups). */
  const meadow = (seed, n, x0, x1, y0, y1, cols) => {
    const r = rnd(seed); let st = '', hd = '';
    for (let i = 0; i < n; i++) { const x = R(x0 + r() * (x1 - x0)), y = R(y0 + r() * (y1 - y0)), h = R(30 + r() * 50), k = (y - y0) / (y1 - y0 + 1) + 0.6; st += `M${x} ${y}q${R(r() * 10 - 5)} ${-R(h / 2)} 0 ${-h}`; hd += `<circle cx="${x}" cy="${y - h}" r="${R((5 + r() * 5) * k)}" fill="${cols[i % cols.length]}"/>`; }
    return `<g class="x-uksway o-b" style="--ad:5s"><path fill="none" stroke="#4d6b2c" stroke-width="3" d="${st}"/>${hd}</g>`;
  };
  /** A broad oak: trunk, limbs and a crown of lit and shaded clumps that sway. */
  const oak = (x, y, s, dark, mid, lite, seed) => {
    const r = rnd(seed || 7), h = 300 * s;
    let crown = '';
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI, cx = R(x + Math.cos(a) * 170 * s * (0.7 + r() * 0.4)), cy = R(y - h + 40 * s - Math.sin(a) * 110 * s); crown += `<circle cx="${cx}" cy="${cy}" r="${R((70 + r() * 40) * s)}" fill="${dark}"/>`; }
    crown += `<circle cx="${x}" cy="${R(y - h - 20 * s)}" r="${R(120 * s)}" fill="${dark}"/>`;
    for (let i = 0; i < 7; i++) crown += `<circle cx="${R(x - 120 * s + r() * 200 * s)}" cy="${R(y - h - 70 * s + r() * 120 * s)}" r="${R((40 + r() * 34) * s)}" fill="${mid}"/>`;
    for (let i = 0; i < 5; i++) crown += `<circle cx="${R(x - 60 * s + r() * 170 * s)}" cy="${R(y - h - 90 * s + r() * 60 * s)}" r="${R((22 + r() * 20) * s)}" fill="${lite}"/>`;
    return `<path fill="#3d2e22" d="M${R(x - 22 * s)} ${y}C${R(x - 14 * s)} ${R(y - 90 * s)} ${R(x - 16 * s)} ${R(y - 160 * s)} ${R(x - 60 * s)} ${R(y - h + 20 * s)}L${R(x - 44 * s)} ${R(y - h + 10 * s)}C${R(x - 10 * s)} ${R(y - 190 * s)} ${R(x + 4 * s)} ${R(y - 200 * s)} ${R(x + 50 * s)} ${R(y - h + 30 * s)}L${R(x + 62 * s)} ${R(y - h + 44 * s)}C${R(x + 22 * s)} ${R(y - 170 * s)} ${R(x + 16 * s)} ${R(y - 90 * s)} ${R(x + 26 * s)} ${y}z"/>`
      + `<g class="x-uksway2 o-b" style="--ad:7s">${crown}</g>`;
  };
  /** A lit window (shows at dusk and night). */
  const lit = (x, y, w, h) => `<rect class="hx-lit" x="${x}" y="${y}" width="${w}" height="${h}" rx="${R(Math.min(w, h) / 5)}"/>`;
  /** A mirror image in water about y (a <use> of a drawn group), broken up by the glints over it. */
  const reflect = (id, y, op) => `<use href="#${id}" transform="matrix(1 0 0 -.8 0 ${R(y * 1.8)})" opacity="${op || 0.3}"/>`;
  const svg = (o) => o;   // a scene is plain markup; the helpers keep each under the budget

  /* ---------- New Forest ponies on the heath (the signature) ---------- */
  // A pony, hooves on y 0, facing right, 210 units long; head grazes when `graze`.
  const pony = (coat, shade, mane, graze, tailD) => {
    const legs = [[40, 0], [58, 1], [126, 0], [142, 1]].map(([x, b]) => `<path fill="${b ? shade : coat}" d="M${x} -74h15l-2 34 3 30v10h-11l-1-10-3-30z"/><rect x="${x + 1}" y="-6" width="14" height="6" rx="2" fill="#2a2420"/>`).join('');
    const body = `<path fill="${coat}" d="M40 -112C70 -122 115 -122 140 -112C152 -104 154 -86 146 -74C140 -64 132 -62 124 -62H62C42 -62 28 -72 26 -88C25 -100 30 -110 40 -112z"/><path fill="${shade}" opacity=".55" d="M30 -80C44 -66 62 -64 124 -64C134 -64 142 -68 146 -76C138 -70 120 -70 96 -72C70 -73 46 -72 30 -80z"/><ellipse cx="88" cy="-108" rx="44" ry="6" fill="#fff" opacity=".14"/>`;
    const head = `<path fill="${coat}" d="M124 -118C140 -126 156 -146 170 -166C176 -174 186 -176 191 -170L209 -128C211 -120 205 -114 197 -116C189 -122 178 -128 168 -126C160 -112 154 -96 146 -84L126 -92z"/><path fill="${mane}" d="M128 -120C142 -132 156 -152 168 -170C174 -178 182 -180 186 -176C176 -170 166 -154 154 -136C146 -126 138 -120 128 -116z"/><path fill="${coat}" d="M182 -172l4 -16 6 15z"/><circle cx="187" cy="-150" r="3" fill="#1d1916"/><path fill="${shade}" opacity=".6" d="M196 -118c5 -1 10 -5 10 -10l3 2c0 6-6 12-13 10z"/>`;
    const tail = `<g class="x-uktail" style="--ad:${tailD || 2.8}s;transform-box:view-box;transform-origin:36px -106px"><path fill="${mane}" d="M34 -108C18 -100 12 -74 16 -38C20 -32 26 -34 26 -42C24 -66 28 -90 40 -100z"/></g>`;
    const hd = graze ? `<g class="x-ukgraze" style="--ad:5s;transform-box:view-box;transform-origin:146px -104px"><g transform="rotate(62 146 -104)">${head}</g></g>` : `<g class="x-uknod" style="--ad:6s;transform-box:view-box;transform-origin:140px -100px">${head}</g>`;
    return `<ellipse cx="92" cy="2" rx="88" ry="10" fill="#000" opacity=".16"/>${tail}${legs}${body}${hd}`;
  };
  add('hampshire', 'signature', { id: 'new-forest-ponies', label: 'New Forest ponies', colour: 'green', mood: 'calm', tags: ['new forest', 'ponies', 'heath', 'national park'],
    svg: () => { const s1 = U(), g1 = U(), h1 = U(), l1 = U();
      const gorse = (seed, n, y0, y1, s) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) { const x = R(r() * 1700 - 50), y = R(y0 + r() * (y1 - y0)), k = s * (0.6 + (y - y0) / (y1 - y0 + 1)); o += `<path fill="#3a5428" d="M${x - R(40 * k)} ${y}c${R(4 * k)} ${-R(30 * k)} ${R(30 * k)} ${-R(34 * k)} ${R(40 * k)} ${-R(26 * k)}c${R(14 * k)} ${-R(8 * k)} ${R(38 * k)} ${-R(2 * k)} ${R(40 * k)} ${R(26 * k)}z"/>`; let f = ''; for (let j = 0; j < 9; j++) f += `M${R(x - 30 * k + r() * 60 * k)} ${R(y - 4 * k - r() * 24 * k)}h.1`; o += `<path fill="none" stroke="#f2c230" stroke-linecap="round" stroke-width="${R(6 * k) + 1}" d="${f}"/>`; } return o; };
      return svg(`<defs>${lin(s1, [[0, '#6f97cf'], [0.45, '#b9cde2'], [0.72, '#f7dcae'], [0.86, '#ffd08a'], [1, '#f6b878']])}${linU(g1, [[0, '#9aa553'], [1, '#41612a']], 0, 680, 0, 900)}${linU(h1, [[0, '#a07a98'], [1, '#6e5a5c']], 0, 590, 0, 690)}${radU(l1, [[0, '#ffe2a0', 0.55], [1, '#ffe2a0', 0]], 800, 520, 700)}</defs>`
        + full(`url(#${s1})`) + rays(800, 500, 900, '#fff4d0', 0.2) + sun(800, 500, 50, '#fff6dc', '#ffd27a')
        + streak(260, 120, 260, '#fff', 0.55) + streak(1250, 90, 300, '#fff', 0.45, 70)
        + cloud(260, 240, 1.15, '#f3d2b8', 0.9, 52, 6) + cloud(1340, 200, 0.95, '#f1cdb4', 0.85, 44, 30)
        + birds(11, 4, 980, 300, '#3b3a44', 1, 600)
        + mv('ukpar', { ad: '30s', dx: '10px' }, canopy('#7c8fae', 520, 22, 3, null, null, null, '#a9b7c8') + haze(470, 120, '#ffe7c2', 0.55) + canopy('#4f6b62', 566, 26, 4, null, null, null, '#8aa08a'))
        + `<rect width="1600" height="900" fill="url(#${l1})"/>`
        + mv('ukpar', { ad: '30s', dx: '20px' }, ridge(`url(#${h1})`, 612, 22, 9, 5) + gorse(15, 16, 606, 650, 0.8) + ridge('#7d6a74', 650, 16, 8, 6)
          + oak(1330, 666, 0.95, '#2f4a2c', '#46663a', '#7f9a4a', 9) + oak(1490, 680, 0.62, '#33502f', '#4c6c3c', '#7f9a4a', 12))
        + haze(600, 110, '#ffe9c8', 0.5)
        + ridge(`url(#${g1})`, 694, 26, 7, 7) + gorse(16, 13, 700, 780, 1.2)
        + oak(150, 790, 1.4, '#263f24', '#3d5c33', '#78963f', 14)
        + `<g transform="translate(330 818) scale(1.32)">${pony('#7a4a2c', '#5a3420', '#2a1a12', false, 2.6)}</g>`
        + `<g transform="translate(610 836) scale(.78)">${pony('#a8683a', '#7e4a28', '#4a2c1a', false, 2.2)}</g>`
        + `<g transform="translate(1240 806) scale(-1.12 1.12)">${pony('#ddd6c8', '#b3aa98', '#8f877a', true, 3.2)}</g>`
        + ridge('#3f5a26', 868, 14, 6, 8) + grass(31, 80, -40, 1640, 900, 46, '#58773a') + grass(32, 30, -40, 1640, 900, 74, '#344d24')
        + finish()); } });

  /* ---------- Winchester Cathedral from the Close ---------- */
  add('hampshire', 'landmark', { id: 'winchester-cathedral', label: 'Winchester Cathedral', colour: 'slate', tags: ['winchester', 'cathedral', 'norman tower', 'nave'],
    svg: () => { const s1 = U(), w1 = U(), l1 = U(); const st1 = '#d8ccb1', st2 = '#b5a382', st3 = '#8e7f66', rf = '#6c7078';
      const win = (x, y, w, h) => `<path fill="#4a5262" d="M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}z"/><path fill="none" stroke="${st2}" stroke-width="3" d="M${x + w / 2} ${y + h}V${y + w / 2}"/>` + lit(x + 3, y + w / 2, w - 6, h - w / 2 - 2);
      let nave = '';
      for (let i = 0; i < 9; i++) { const x = 560 + i * 50; nave += win(x + 12, 404, 24, 54) + win(x + 12, 520, 26, 60) + `<rect x="${x + 42}" y="${490}" width="10" height="150" fill="${st3}"/>`; }
      return svg(`<defs>${lin(s1, [[0, '#6f9fd4'], [0.6, '#b9d0e6'], [1, '#f3e1bf']])}${lin(w1, [[0, st1], [1, st2]])}${lin(l1, [[0, '#7da24e'], [1, '#4f7a34']])}</defs>`
        + full(`url(#${s1})`) + sun(260, 200, 40, '#fff6dc', '#ffe3a0')
        + cloud(700, 150, 1.4, '#fff', 0.9, 56, 4) + cloud(1300, 110, 1.1, '#fff', 0.8, 48, 18) + cloud(160, 300, 0.8, '#fff', 0.7, 40, 9)
        + rays(260, 200, 900, '#fff6dc', 0.12)
        + mv('ukpar', { ad: '34s', dx: '8px' }, ridge('#a9bfb4', 560, 60, 6, 41) + haze(500, 120, '#eef3f6', 0.6) + canopy('#6f8d6a', 600, 20, 42, null, null, null, '#93ad88')
          + (() => { const r = rnd(43); let o = '', x = -100; while (x < 1700) { const w = 40 + r() * 50, h = 30 + r() * 40, y = 640 - h; o += `<rect x="${R(x)}" y="${R(y)}" width="${R(w)}" height="${R(h)}" fill="${r() < 0.5 ? '#c79a7c' : '#d8c6aa'}"/><path fill="#8a5a46" d="M${R(x - 4)} ${R(y)}l${R(w / 2 + 4)} -22 ${R(w / 2 + 4)} 22z"/>`; x += w + 6 + r() * 20; } return o; })())
        + mv('ukpar', { ad: '34s', dx: '16px' },
          // the west front: a great window between stair turrets, the gable over it
          `<path fill="url(#${w1})" d="M360 640V380L455 300L550 380V640z"/><path fill="${st2}" d="M340 640V340l14-26 14 26V640zM542 640V340l14-26 14 26V640z"/>`
          + `<path fill="#46505f" d="M392 600V430q63-90 126 0V600z"/><path fill="none" stroke="${st1}" stroke-width="5" d="M413 600V440M434 600V420M455 600V412M476 600V420M497 600V440M392 510H518M392 470H518"/>`
          + `<path class="hx-lit" d="M396 596V432q59-84 118 0V596z" opacity=".55"/><path fill="${st3}" d="M420 640v-26q35-30 70 0v26z"/>`
          // the long nave: aisle, clerestory, buttresses, lead roof
          + `<path fill="${rf}" d="M548 404L566 360H1018L1036 404z"/><rect x="550" y="404" width="470" height="236" fill="url(#${w1})"/><path fill="${rf}" d="M550 500L560 482H1020V500z"/>${nave}`
          // the low Norman crossing tower
          + `<rect x="1018" y="250" width="160" height="390" fill="url(#${w1})"/><rect x="1150" y="250" width="28" height="390" fill="${st3}" opacity=".6"/>`
          + `<path fill="${st1}" d="M1012 252v-22h20v12h18v-12h20v12h18v-12h20v12h18v-12h20v12h18v-12h20v22z"/><path fill="${st2}" d="M1012 232l8-30 8 30zM1168 232l8-30 8 30z"/>${win(1040, 300, 34, 90)}${win(1112, 300, 34, 90)}<rect x="1018" y="420" width="160" height="10" fill="${st2}"/>`
          + mv('ukflag', { ad: '2.2s' }, `<path fill="#c8382e" d="M1098 230V160h4v4h60l-12 16 12 16h-60z"/><path fill="#fff" d="M1102 172h24v-8h8v8h24v8h-24v8h-8v-8h-24z" opacity=".95"/>`)
          + `<path fill="#3a3530" d="M1098 230h4v-74h-4z"/>`
          // transept and the choir to the east
          + `<path fill="${rf}" d="M1176 430l14-32h240l16 32z"/><rect x="1178" y="430" width="266" height="210" fill="url(#${w1})"/>${win(1210, 470, 30, 80)}${win(1290, 470, 30, 80)}${win(1370, 470, 30, 80)}`
          + `<path fill="${st3}" opacity=".5" d="M1178 430h266v20H1178z"/>`)
        + birds(51, 5, 1080, 200, '#2f2c33', 0.9, 380)
        // the Close: lime trees framing, the lawn and the path
        + `<rect y="638" width="1600" height="262" fill="url(#${l1})"/>${[0, 1, 2, 3, 4, 5].map(i => `<path fill="#fff" opacity=".07" d="M${-200 + i * 330} 900L${300 + i * 200} 640H${380 + i * 200}L${-40 + i * 330} 900z"/>`).join('')}`
        + `<path fill="#1d3a1a" opacity=".16" d="M570 640H1444L1520 676H640z"/><path fill="#e7dcc4" d="M480 900C520 790 560 700 600 640H660C650 700 660 800 720 900z"/><path fill="#c9bb9c" d="M600 640H660L656 660H596z"/>`
        + oak(-40, 900, 1.05, '#2c4a2a', '#41663a', '#6e9548', 61) + oak(1650, 900, 1.0, '#2c4a2a', '#41663a', '#6e9548', 62)
        + grass(63, 80, 0, 1600, 900, 30, '#3f6a30')
        + mv('ukfall', { ad: '9s', d: '-2s', dx: '120px' }, `<ellipse cx="300" cy="420" rx="9" ry="5" fill="#d9a23a"/>`) + mv('ukfall', { ad: '11s', d: '-7s', dx: '-90px' }, `<ellipse cx="1380" cy="380" rx="9" ry="5" fill="#c97a2c"/>`)
        + finish()); } });

  /* ---------- Portsmouth Harbour: the Spinnaker Tower and HMS Victory ---------- */
  add('hampshire', 'landmark', { id: 'portsmouth-harbour', label: 'The Spinnaker Tower and HMS Victory', colour: 'blue', mood: 'proud', tags: ['portsmouth', 'spinnaker tower', 'hms victory', 'harbour'],
    site: 'The Spinnaker Tower and HMS Victory, Portsmouth',
    svg: () => { const s1 = U(), s2 = U(), sea = U(), tw = U(), vi = U(), to = U();
      // Victory: black and ochre bands, three masts with yards and furled sails, rigging
      const hull = `<path fill="#1f1d1e" d="M120 640L130 560H200L210 572H700L760 548L748 600L716 662H170z"/><path fill="#d6a44a" d="M138 590H726L722 602H140zM146 618H716L710 630H150z"/>`
        + `<path fill="none" stroke="#1f1d1e" stroke-width="7" stroke-dasharray="10 12" d="M156 596H716M160 624H706"/><path fill="#7b2e22" d="M130 560H200L196 548H134z"/>`;
      let masts = '';
      for (const [x, top] of [[300, 220], [450, 170], [600, 240]]) {
        masts += `<path fill="#3b2b1e" d="M${x - 5} 572V${top}h10V572z"/>`;
        for (let i = 0; i < 4; i++) { const y = top + 40 + i * 78, w = 150 - i * 22 + (x === 450 ? 30 : 0); masts += `<path fill="#3b2b1e" d="M${x - w / 2} ${y}h${w}v6h-${w}z"/><path fill="#efe6d0" d="M${x - w / 2 + 8} ${y + 6}h${w - 16}c-10 14-${w - 36} 14-${w - 16} 0z"/>`; }
      }
      const rig = `<path fill="none" stroke="#2c2622" stroke-width="2" opacity=".75" d="M450 170L140 560M450 170L740 552M300 220L170 560M600 240L720 556M450 170L300 220M450 170L600 240M600 240L790 470M790 470L760 548"/>`;
      // the tower: a slender column, the sail of white arcs, the decks and the spire
      const tower = `<defs>${lin(tw, [[0, '#ffffff'], [1, '#c9d6e6']], 1, 0)}</defs><path fill="url(#${tw})" d="M1150 700L1178 140H1196L1200 700z"/>`
        + `<path fill="url(#${tw})" d="M1196 700C1350 560 1370 350 1290 210C1260 160 1220 130 1200 128C1240 190 1268 270 1268 370C1268 500 1240 610 1196 700z"/>`
        + [250, 330, 410, 490, 570].map((y, i) => `<path stroke="#a8b6c8" stroke-width="5" d="M1190 ${y}H${[1262, 1290, 1300, 1296, 1270][i]}"/>`).join('')
        + `<path fill="#e9eef5" d="M1150 160h150l-10 30h-130z"/><path fill="#5b6e86" d="M1160 172h130l-4 10h-122z"/><path fill="#f3f6fa" d="M1170 132h110l-8 26h-94z"/><path fill="#c8d2de" d="M1184 132L1190 40h6l4 92z"/>`
        + `<rect class="hx-lit" x="1162" y="171" width="126" height="12" rx="3"/><circle class="hx-lit x-ukglow" style="--ad:2s" cx="1193" cy="44" r="8"/>`;
      return svg(`<defs>${lin(s1, [[0, '#29507f'], [0.42, '#7d9fcb'], [0.7, '#e9c2b0'], [0.86, '#f7c08e'], [1, '#f6a874']])}${lin(sea, [[0, '#6f97c0'], [0.4, '#3d6a98'], [1, '#1f3f66']])}${lin(s2, [[0, '#fff'], [1, '#fff']])}</defs>`
        + full(`url(#${s1})`) + rays(860, 560, 900, '#ffe6c4', 0.14) + sun(860, 560, 40, '#fff1d8', '#ffbd7a') + stars(81, 60, 360)
        + cloud(420, 160, 1.5, '#fff1e6', 0.8, 54, 8) + cloud(1300, 120, 1.1, '#ffe8da', 0.75, 50, 22)
        // Gosport and Gunwharf: a low skyline and harbour wall
        + mv('ukpar', { ad: '30s', dx: '8px' }, (() => { const r = rnd(83); let o = '', x = -100; while (x < 1700) { const w = 30 + r() * 70, h = 20 + r() * 80; o += `<rect x="${R(x)}" y="${R(640 - h)}" width="${R(w)}" height="${R(h)}" fill="#6a7d97"/>` + (r() < 0.5 ? lit(R(x + 8), R(650 - h), 8, 8) : ''); x += w + 4; } return o; })()
          + `<path fill="#6a7d97" d="M300 560l10-60 10 60zM880 570h40v-40l-20-14-20 14z"/>` + haze(560, 90, '#ffd9b8', 0.55))
        + `<rect y="636" width="1600" height="264" fill="url(#${sea})"/>`
        + `<path fill="#55667e" d="M-160 628H1760V642H-160z"/>`
        + mv('ukpar', { ad: '30s', dx: '14px' }, `<g id="${to}">${tower}</g>` + reflect(to, 700, 0.22))
        + mv('ukbob', { ad: '7s', dy: '3px' }, `<g id="${vi}" transform="translate(40 0)">${masts}${rig}${hull}${mv('ukflag', { ad: '1.8s' }, '<path fill="#c8382e" d="M450 170V130h46l-10 10 10 10h-46z"/>')}</g>` + reflect(vi, 664, 0.3))
        // glints over the reflections, a harbour launch crossing, gulls
        + shimmer(85, 70, 0, 1600, 660, 890, '#ffe2c0', 46)
        + mv('ukmove', { ad: '26s', d: '-9s', dx: '900px' }, mv('ukbob', { ad: '2.4s', dy: '4px' }, `<path fill="#f4f1ea" d="M-200 770h120l-14 22h-96z"/><path fill="#2e4d74" d="M-180 750h56v20h-56z"/><path fill="#fff" opacity=".6" d="M-260 790c20-6 40-6 60 0" stroke="#fff" stroke-width="4"/>`))
        + birds(87, 4, 880, 280, '#2b2e3a', 1.1, 560) + birds(88, 2, 700, 160, '#2b2e3a', 1.9, 700)
        + finish()); } });

  /* ---------- the Isle of Wight ferry crossing the Solent ---------- */
  add('hampshire', 'landscape', { id: 'solent-ferry', label: 'The Isle of Wight ferry on the Solent', colour: 'teal', mood: 'cheerful', tags: ['solent', 'isle of wight', 'ferry', 'sea'],
    site: 'The Isle of Wight ferry, the Solent',
    svg: () => { const s1 = U(), sea = U(), fe = U(), isl = U();
      const yacht = (x, y, s, d, sail) => mv('ukmove', { ad: '40s', d: `-${d}s`, dx: '-260px' }, mv('ukheel', { ad: '4s', d: `-${d % 4}s` },
        `<g transform="translate(${x} ${y}) scale(${s})"><path fill="${sail || '#fbfaf6'}" d="M0 -6V-160C30 -110 60 -50 74 -8z"/><path fill="#e6e9ef" d="M-6 -8V-128C-30 -90 -50 -40 -62 -8z"/><path fill="#2f3440" d="M-74 -4H96L80 18H-58z"/><path fill="none" stroke="#2f3440" stroke-width="3" d="M-2 -2V-164"/><path fill="#fff" opacity=".35" d="M-58 22H80l-20 10H-40z"/></g>`));
      const ferry = `<path fill="#fbfbf8" d="M-10 700H540L500 766H30z"/><path fill="#16416f" d="M0 726H528L518 742H8z"/><path fill="#d03a2f" d="M12 748H512L508 756H16z"/>`
        + `<rect x="50" y="640" width="420" height="62" rx="8" fill="#fbfbf8"/><path fill="#33455e" d="M64 656h392v18H64z"/>${[...Array(12)].map((_, i) => lit(70 + i * 32, 657, 22, 16)).join('')}<path fill="none" stroke="#9aa6b6" stroke-width="3" d="M50 640H470M60 632H460"/>`
        + `<rect x="250" y="592" width="170" height="50" rx="6" fill="#fbfbf8"/><path fill="#33455e" d="M262 604h146v14H262z"/>${lit(264, 605, 142, 12)}<path fill="#16416f" d="M140 556h64l10 86h-84z"/><path fill="#fff" d="M146 570h52v12h-52z"/><path stroke="#556070" stroke-width="4" d="M330 592V540M300 556h60"/>`
        + `<path fill="#f0a020" d="M80 640h40v-12H80zM400 640h40v-12h-40z"/>`;
      return svg(`<defs>${lin(s1, [[0, '#3f82c8'], [0.62, '#a3c9ea'], [1, '#eaf3f6']])}${linU(sea, [[0, '#8cc3d2'], [0.3, '#4a93ad'], [1, '#1b5574']], 0, 526, 0, 900)}${linU(isl, [[0, '#8fb38a'], [1, '#5e8a60']], 0, 440, 0, 530)}</defs>`
        + full(`url(#${s1})`) + rays(1260, 170, 800, '#fffbe0', 0.12) + sun(1260, 170, 44, '#fffbe8', '#fff1b0')
        + streak(500, 110, 300, '#fff', 0.5) + cloud(260, 250, 1.5, '#dfe8f0', 0.95, 50, 3) + cloud(860, 170, 1.15, '#e4ecf2', 0.92, 60, 15) + cloud(1480, 330, 0.9, '#e6edf3', 0.88, 44, 27)
        // the island on the horizon: downs and woods, the chalk stacks at its western end, a lighthouse, a town on the shore
        + mv('ukpar', { ad: '36s', dx: '6px' }, `<path fill="url(#${isl})" d="M-100 524C60 480 220 456 420 470C600 440 760 446 920 472C1080 448 1280 454 1700 500V530H-100z"/>`
          + canopy('#557f55', 488, 6, 92, 620, 980, 530) + canopy('#557f55', 486, 6, 93, 1180, 1500, 530)
          + `<path fill="#f3efe4" d="M-100 530L-80 496L-56 530zM-40 530l18-30 18 30zM12 530l14-22 14 22z"/><path fill="#e7e0cf" d="M-100 514C-60 500 -20 498 30 512L40 530H-100z" opacity=".7"/><path fill="#fff" d="M40 530v-24h6v24z"/><path fill="#c8382e" d="M40 506h6v-6h-6z"/>`
          + (() => { const r = rnd(94); let o = ''; for (let i = 0; i < 26; i++) { const x = R(1040 + r() * 260); o += `<rect x="${x}" y="${R(512 + r() * 10)}" width="${R(8 + r() * 10)}" height="10" fill="${['#f4efe6', '#e8d6c0', '#d7e0ea'][i % 3]}"/>`; } return o; })()
          + haze(480, 70, '#eef6fa', 0.6))
        + `<rect y="526" width="1600" height="374" fill="url(#${sea})"/>`
        + (() => { let o = ''; for (let i = 0; i < 9; i++) { const y = 560 + i * i * 4.4, w = 30 + i * 12; let d = ''; for (let x = -100 + (i % 2) * w; x < 1700; x += w * 2.2) d += `M${R(x)} ${R(y)}q${R(w / 2)} ${-R(3 + i)} ${R(w)} 0`; o += mv('ukdrift', { ad: `${10 + i}s`, dx: `${10 + i * 4}px` }, `<path fill="none" stroke="${i % 2 ? '#1e5a78' : '#9fd2e0'}" stroke-width="${2 + i * 0.6}" opacity=".5" stroke-linecap="round" d="${d}"/>`); } return o; })()
        + shimmer(91, 40, 0, 1600, 540, 890, '#e9fbff', 50) + shimmer(95, 40, 1180, 1340, 530, 700, '#fffbe0', 40)
        + yacht(330, 610, 0.7, 6) + yacht(1380, 590, 0.55, 19, '#f5e6c8')
        + mv('ukmove', { ad: '30s', d: '-8s', dx: '520px' }, mv('ukbob', { ad: '3.2s', dy: '5px' }, `<g transform="translate(420 0)"><g id="${fe}">${ferry}</g>${reflect(fe, 766, 0.2)}<path fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".75" d="M-20 768c-60 4-120 0-190-10M-10 780c-90 10-160 12-260 0M520 764c30 6 50 10 70 8"/></g>`))
        + yacht(1060, 836, 1.1, 12, '#fbfaf6')
        + birds(93, 4, 700, 300, '#2c3440', 1.2, 500) + birds(96, 2, 1100, 420, '#2c3440', 2, 700)
        // the shingle shore at Lepe: groynes and marram
        + `<path fill="#cdbf9e" d="M-40 900C160 850 420 846 760 900z"/><path fill="#a8977a" d="M-40 900C100 872 260 868 420 900z"/>${[60, 160, 260].map(x => `<rect x="${x}" y="${R(846 + x / 10)}" width="14" height="60" rx="3" fill="#5a4636"/>`).join('')}`
        + grass(97, 26, -20, 380, 880, 60, '#9a9a5a')
        + finish()); } });

  /* ---------- the Watercress Line: steam through the chalk country ---------- */
  add('hampshire', 'heritage', { id: 'watercress-line', label: 'Steam on the Watercress Line', colour: 'green', mood: 'cheerful', tags: ['watercress line', 'steam train', 'alresford', 'railway'],
    site: 'The Watercress Line, Alresford',
    svg: () => { const s1 = U(), f1 = U(), f2 = U();
      const coach = (x) => `<rect x="${x}" y="-120" width="240" height="96" rx="10" fill="#7a2a2a"/><rect x="${x + 6}" y="-112" width="228" height="40" rx="4" fill="#efe3c4"/>${[...Array(7)].map((_, i) => `<rect x="${x + 14 + i * 31}" y="-108" width="22" height="30" rx="3" fill="#3b3f4a"/>` + lit(x + 15 + i * 31, -107, 20, 28)).join('')}<path fill="#3b3a3c" d="M${x - 4} -122q124-22 248 0v6h-248z"/><circle cx="${x + 40}" cy="-18" r="18" fill="#222"/><circle cx="${x + 200}" cy="-18" r="18" fill="#222"/>`;
      const wheel = (x, r) => `<g class="x-ukwheel" style="--ad:1.4s"><circle cx="${x}" cy="${-r}" r="${r}" fill="#7a2a2a" stroke="#1b1b1d" stroke-width="6"/><path stroke="#1b1b1d" stroke-width="4" d="M${x - r} ${-r}h${2 * r}M${x} ${-2 * r}v${2 * r}M${x - r * 0.7} ${-r * 1.7}l${r * 1.4} ${r * 1.4}M${x + r * 0.7} ${-r * 1.7}l${-r * 1.4} ${r * 1.4}"/><circle cx="${x}" cy="${-r}" r="${R(r / 4)}" fill="#c49a3a"/></g>`;
      const loco = `<path fill="#1f4a32" d="M-130 -36V-128H-12V-36z"/><path fill="#16181a" d="M-126 -128q58-24 110 0z"/><path fill="#c49a3a" d="M-130 -100h118v4H-130z"/>${wheel(-100, 20)}${wheel(-44, 20)}`
        + `<path fill="#24583a" d="M0 -60V-170H112V-60z"/><path fill="#16181a" d="M-10 -168q66-22 132 0v8H-10z"/><rect x="18" y="-150" width="32" height="34" rx="4" fill="#3b3f4a"/><rect x="62" y="-150" width="32" height="34" rx="4" fill="#3b3f4a"/>${lit(20, -148, 28, 30)}${lit(64, -148, 28, 30)}`
        + `<rect x="108" y="-152" width="260" height="88" rx="40" fill="#2a6644"/><path fill="#fff" opacity=".18" d="M120 -142h236v14H120z"/>${[170, 240, 310].map(x => `<rect x="${x}" y="-152" width="7" height="88" fill="#c49a3a"/>`).join('')}`
        + `<rect x="350" y="-156" width="64" height="96" rx="18" fill="#1d1f22"/><path fill="#1b1b1d" d="M372 -156v-34h-6v-8h34v8h-6v34z"/><path fill="#b8763a" d="M366 -198h34v6h-34z"/>`
        + `<path fill="#c49a3a" d="M222 -152q0-34 26-34t26 34z"/><rect x="160" y="-166" width="10" height="16" rx="3" fill="#c49a3a"/>`
        + `<rect x="-6" y="-64" width="430" height="10" fill="#16181a"/><rect x="330" y="-58" width="84" height="32" rx="6" fill="#1f4a32"/><rect x="414" y="-74" width="16" height="26" fill="#b8322c"/><path fill="#16181a" d="M430 -66h10v-6h6v18h-6v-6h-10z"/><circle cx="420" cy="-86" r="8" fill="#f4f0e0"/>`
        + `${wheel(150, 34)}${wheel(230, 34)}${wheel(310, 34)}${wheel(386, 18)}<path stroke="#9aa0a8" stroke-width="8" stroke-linecap="round" d="M150 -26H310"/><path fill="#16181a" d="M410 -24l36 24H396z"/>`;
      const steam = puffs(383, -205, 18, '#f8f6f2', 40, -520, 5.4, -170, 2) + puffs(380, -200, 8, '#dcd9d4', 30, -360, 4, -140, 1.8) + puffs(240, -70, 4, '#f4f4f4', 22, -60, 2);
      return svg(`<defs>${lin(s1, [[0, '#6b9bd2'], [0.65, '#c4d9ea'], [1, '#f0e6cf']])}${lin(f1, [[0, '#a7b96a'], [1, '#7a9a48']])}${lin(f2, [[0, '#cfb46a'], [1, '#a68a44']])}</defs>`
        + full(`url(#${s1})`) + sun(300, 160, 40, '#fff8e0', '#ffeab0')
        + cloud(760, 150, 1.3, '#e3eaf2', 0.92, 54, 5) + cloud(1360, 250, 1.0, '#e5ecf3', 0.88, 46, 16) + streak(200, 330, 220, '#fff', 0.45)
        + rays(300, 160, 800, '#fff8e0', 0.12)
        + mv('ukpar', { ad: '32s', dx: '8px' }, ridge('#b4c7bc', 470, 70, 6, 101) + haze(430, 120, '#f2f4ee', 0.55) + ridge('#94b088', 520, 40, 7, 102) + canopy('#5f7f50', 548, 14, 103, 700, 1760, 600, '#86a070') + canopy('#5f7f50', 552, 12, 106, -160, 300, 600, '#86a070'))
        // patchwork fields with hedgerows
        + mv('ukpar', { ad: '32s', dx: '16px' }, `<path fill="url(#${f2})" d="M-160 580C200 560 600 556 900 576C1200 560 1500 560 1760 574V680H-160z"/><path fill="url(#${f1})" d="M-160 620C300 600 700 610 1000 630C1300 616 1600 610 1760 620V720H-160z"/>`
          + `<path fill="none" stroke="#b89c50" stroke-width="3" opacity=".6" d="${[...Array(7)].map((_, i) => `M-160 ${592 + i * 12}C300 ${574 + i * 12} 600 ${570 + i * 12} 900 ${590 + i * 12}`).join('')}"/>`
          + `<path fill="none" stroke="#4d6b34" stroke-width="10" stroke-linecap="round" d="M-160 618C300 598 700 608 1000 628C1300 614 1600 608 1760 618"/>` + oak(1240, 640, 0.5, '#33502f', '#4c6c3c', '#7a9a4a', 104) + oak(260, 620, 0.45, '#33502f', '#4c6c3c', '#7a9a4a', 105))
        // the embankment and the line
        + `<path fill="#6f8a3e" d="M-160 760C400 700 1200 700 1760 750V900H-160z"/><path fill="#8a7a62" d="M-160 728H1760V748H-160z"/><path stroke="#5a4636" stroke-width="10" stroke-dasharray="8 22" d="M-160 740H1760"/><path stroke="#9aa0a8" stroke-width="4" d="M-160 730H1760"/>`
        + `<path fill="#3b3a3c" d="M1380 730V560h8v170z"/><path fill="#c8382e" d="M1388 566h44v14h-44z"/><path fill="#fff" d="M1414 568h6v10h-6z"/>`
        + mv('ukmove', { ad: '30s', d: '-8s', dx: '500px', ai: 1 }, `<g transform="translate(830 730)">${coach(-660)}${coach(-400)}${loco}${steam}</g>`)
        + grass(107, 90, -20, 1620, 900, 60, '#4f6f2c') + meadow(108, 40, -20, 1620, 800, 900, ['#d8322a', '#f4f1e6', '#f2c230', '#d8322a']) + mv('ukfall', { ad: '10s', d: '-3s', dx: '-140px' }, `<ellipse cx="1500" cy="560" rx="10" ry="5" fill="#d08a2a"/>`)
        + birds(109, 4, 1100, 260, '#2e3036', 1, 420)
        + finish()); } });

  /* ---------- a brown trout in a chalk stream (the Test, the Itchen) ---------- */
  add('hampshire', 'landscape', { id: 'chalk-stream-trout', label: 'A trout in a chalk stream', colour: 'teal', mood: 'calm', tags: ['river test', 'river itchen', 'chalk stream', 'trout'],
    site: 'A chalk stream, the River Test',
    svg: () => { const s1 = U(), w1 = U(), b1 = U(), ray = U(), ft = U();
      const trout = (seed) => `<path fill="url(#${ft})" d="M0 0C40 -46 150 -60 250 -40C300 -30 330 -12 350 0C330 12 300 28 250 36C150 54 40 44 0 0z"/>`
        + mv('uktail', { ad: '.9s', to: '10px 0' }, `<path fill="#5a5430" d="M10 0L-74 -52C-60 -24 -60 24 -74 52z"/>`)
        + `<path fill="#5a5430" d="M130 -50L180 -84L214 -46zM60 -34l14-16 10 18zM120 40l26 26 14-28zM70 34l14 18 10-18z"/><path fill="#7a6a3a" d="M262 10c-10 14-30 30-48 34l-6-8c18-6 34-16 44-28z"/>`
        + `<path fill="none" stroke="#3a3420" stroke-width="3" opacity=".7" d="M286 -30q-12 30 0 56M30 2q140 -8 250 -4"/><circle cx="312" cy="-8" r="9" fill="#1a1612"/><circle cx="315" cy="-10" r="3" fill="#fff"/>`
        + (() => { const r = rnd(seed); let o = ''; for (let i = 0; i < 30; i++) o += `<circle cx="${R(50 + r() * 230)}" cy="${R(-34 + r() * 44)}" r="${R(3 + r() * 4)}" fill="${i % 5 ? '#3a2a1c' : '#c8463a'}"${i % 5 ? '' : ' stroke="#f1e6c6" stroke-width="2"'}/>`; return o; })();
      // ranunculus: long ribbons streaming with the current, flowers at the surface
      let weed = '';
      for (let i = 0; i < 8; i++) {
        const x = 40 + i * 210, r = rnd(130 + i); let rib = '';
        for (let j = 0; j < 5; j++) { const len = 220 + r() * 260, top = 820 - j * 34 - r() * 40; rib += `<path fill="none" stroke="${['#3f7a44', '#4e8a4c', '#5f9a52', '#386e3c', '#6aa858'][j]}" stroke-width="${R(14 + r() * 8)}" stroke-linecap="round" d="M${x} 900C${x + 20} ${R(top)} ${R(x + len * 0.5)} ${R(top - 30)} ${R(x + len)} ${R(top - 60 - r() * 60)}"/>`; }
        weed += `<g class="x-ukweed o-b" style="--ad:${3.4 + (i % 3) * 0.6}s;--d:-${(i * 0.7).toFixed(1)}s">${rib}</g>`;
      }
      const willow = (x, y, s, d) => { const r = rnd(x + d); let str = '', str2 = '';
        for (let i = 0; i < 26; i++) { const t = i / 25, sx = R(x - 150 * s + t * 300 * s), sy = R(y - 200 * s + Math.pow(Math.abs(t - 0.5) * 2, 2) * 90 * s), len = R((120 + r() * 80) * s), bend = R((t - 0.5) * 40 * s); const seg = `M${sx} ${sy}q${bend} ${R(len / 2)} ${R(bend * 1.4)} ${len}`; if (i % 2) str2 += seg; else str += seg; }
        return `<path fill="#4a3a2a" d="M${x - 9} ${y}C${x - 6} ${R(y - 60 * s)} ${x - 20} ${R(y - 110 * s)} ${x - 40} ${R(y - 150 * s)}h14C${x} ${R(y - 120 * s)} ${x + 8} ${R(y - 60 * s)} ${x + 9} ${y}z"/><g class="x-uksway2 o-b" style="--ad:${6 + d}s"><ellipse cx="${x}" cy="${R(y - 190 * s)}" rx="${R(130 * s)}" ry="${R(74 * s)}" fill="#5e8a3e"/><ellipse cx="${R(x - 120 * s)}" cy="${R(y - 140 * s)}" rx="${R(50 * s)}" ry="${R(56 * s)}" fill="#5e8a3e"/><ellipse cx="${R(x + 120 * s)}" cy="${R(y - 140 * s)}" rx="${R(50 * s)}" ry="${R(56 * s)}" fill="#5e8a3e"/><ellipse cx="${R(x - 50 * s)}" cy="${R(y - 196 * s)}" rx="${R(70 * s)}" ry="${R(34 * s)}" fill="#7aa64e"/><ellipse cx="${R(x + 60 * s)}" cy="${R(y - 188 * s)}" rx="${R(70 * s)}" ry="${R(30 * s)}" fill="#6f9a48"/><path fill="none" stroke="#5e8a3e" stroke-width="${R(6 * s)}" stroke-linecap="round" d="${str2}"/><path fill="none" stroke="#9cc466" stroke-width="${R(5 * s)}" stroke-linecap="round" d="${str}"/></g>`; };
      return svg(`<defs>${lin(s1, [[0, '#7fb0dc'], [1, '#e9f0ee']])}${linU(w1, [[0, '#86c8bc'], [0.45, '#3f8f86'], [1, '#1d5052']], 0, 276, 0, 900)}${lin(b1, [[0, '#cbb88e'], [1, '#8c7a58']])}${lin(ray, [[0, '#fff', 0.5], [1, '#fff', 0]])}${lin(ft, [[0, '#4f4a2a'], [0.45, '#9a8a4a'], [0.7, '#d8c58a'], [1, '#efe4bc']])}</defs>`
        + full(`url(#${s1})`) + cloud(400, 90, 1.0, '#e3ebf0', 0.9, 40, 6) + cloud(1200, 100, 0.85, '#e3ebf0', 0.85, 46, 12)
        // the far bank: water meadow, willows trailing to the water, reeds
        + mv('ukpar', { ad: '30s', dx: '10px' }, canopy('#6d955a', 200, 18, 121, null, null, null, '#93b67a') + `<path fill="#86ad62" d="M-160 236H1760V280H-160z"/>`
          + willow(220, 280, 1, 0) + willow(900, 280, 0.8, 1) + willow(1420, 280, 1.1, 2)
          + grass(122, 70, -40, 1640, 282, 40, '#5f8a3e'))
        + `<rect y="276" width="1600" height="624" fill="url(#${w1})"/><path fill="#e0f4f0" opacity=".7" d="M0 276H1600V284H0z"/>`
        + shimmer(123, 40, 0, 1600, 280, 300, '#fff', 60)
        + [200, 520, 900, 1260].map((x, i) => `<path class="x-ukrays" style="--ad:${5 + i}s;--d:-${i}s" fill="url(#${ray})" d="M${x} 286h${90 + i * 10}l${140 + i * 20} 614h-${150 + i * 10}z"/>`).join('')
        + `<path fill="url(#${b1})" d="M-20 820C300 790 600 800 900 812C1200 800 1400 790 1620 810V900H-20z"/>`
        + (() => { const r = rnd(125); let o = ''; for (let i = 0; i < 50; i++) o += `<ellipse cx="${R(r() * 1600)}" cy="${R(826 + r() * 70)}" rx="${R(8 + r() * 16)}" ry="${R(5 + r() * 8)}" fill="${['#e8dcc0', '#a8957a', '#7d6d58', '#c8b694'][i % 4]}"/>`; return o; })()
        + mv('ukswim', { ad: '5.4s', d: '-2s' }, `<g transform="translate(1120 430) scale(.55)">${trout(128)}</g>`)
        + weed
        + mv('ukswim', { ad: '4.6s' }, `<g transform="translate(520 560) scale(1.1)">${trout(127)}</g>`)
        + `<g opacity=".18"><ellipse cx="700" cy="842" rx="190" ry="14" fill="#1d3a30"/></g>`
        + (() => { let o = ''; for (let i = 0; i < 8; i++) o += `<circle class="x-ukbubble" style="--ad:${3 + (i % 3)}s;--d:-${i * 0.6}s" cx="${880 + (i % 4) * 14}" cy="${590 - i * 4}" r="${4 + (i % 3) * 2}" fill="none" stroke="#e8fbff" stroke-width="2"/>`; return o; })()
        + [[300, 180], [420, 150], [1000, 200], [1180, 160], [1400, 190]].map(([x, y], i) => mv('ukfly', { ad: `${2.4 + i * 0.3}s`, d: `-${i}s` }, `<path fill="#f4f0dc" opacity=".9" d="M${x} ${y}l-14 -16 4 16zM${x} ${y}l14 -16-4 16z"/><path stroke="#3b3326" stroke-width="3" stroke-linecap="round" d="M${x - 10} ${y + 2}h18l8 -6"/>`)).join('')
        + finish()); } });

  /* ---------- a liner leaving Southampton ---------- */
  add('hampshire', 'heritage', { id: 'southampton-liner', label: 'A liner leaving Southampton', colour: 'indigo', mood: 'proud', tags: ['southampton', 'liner', 'docks', 'southampton water'],
    site: 'A liner leaving Southampton',
    svg: () => { const s1 = U(), sea = U(), hull = U(), li = U();
      let decks = '';
      for (let d = 0; d < 5; d++) { const y = 470 + d * 28, x0 = 140 + d * 30, x1 = 1030 - d * 50; decks += `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="28" fill="${d % 2 ? '#f6f7f9' : '#e9edf2'}"/>`; const wd = `M${x0 + 12} ${y + 14}H${x1 - 20}`; decks += `<path stroke="#53647c" stroke-width="10" stroke-dasharray="16 10" d="${wd}"/><path class="hx-lit" stroke-width="10" stroke-dasharray="${d % 2 ? '16 10 16 36' : '16 36 16 10'}" d="${wd}"/>`; }
      const ship = `<path fill="url(#${hull})" d="M80 610H1150L1200 560H1100L1086 600H120z"/><path fill="#1d2e4f" d="M60 610H1172L1120 700H120z"/><path fill="#c8382e" d="M110 690H1124L1118 700H118z"/><path fill="#f3f4f6" d="M60 560H1110L1090 612H80z"/>`
        + decks + `<path fill="#f3f4f6" d="M120 470Q140 440 200 440H990L1030 470z"/><path fill="#1d2e4f" d="M760 380H860L880 450H750z"/><path fill="#c8382e" d="M756 392H864L866 412H754z"/><rect x="420" y="430" width="200" height="12" rx="4" fill="#d9dee6"/>`
        + `<path fill="none" stroke="#5f6f88" stroke-width="3" d="M1086 560L1180 440M200 440L240 360"/>` + [...Array(10)].map((_, i) => `<rect x="${230 + i * 76}" y="590" width="54" height="16" rx="8" fill="#f08a24"/>`).join('');
      return svg(`<defs>${lin(s1, [[0, '#2b3f78'], [0.45, '#8a76a8'], [0.75, '#f0a986'], [1, '#ffd6a0']])}${lin(sea, [[0, '#a98aa0'], [0.3, '#56628e'], [1, '#1f2a4c']])}${lin(hull, [[0, '#fff'], [1, '#dfe4ec']])}</defs>`
        + full(`url(#${s1})`) + sun(1260, 560, 52, '#fff0d0', '#ffb070') + stars(141, 70, 300)
        + cloud(300, 220, 1.6, '#f4a88e', 0.75, 60, 4, '#b9a6cc') + cloud(1000, 160, 1.3, '#f0a08a', 0.7, 52, 21, '#a998c4') + streak(700, 330, 320, '#f7c0a0', 0.45)
        // the docks: cranes and stacked boxes in silhouette
        + mv('ukpar', { ad: '36s', dx: '8px' }, `<rect x="-160" y="600" width="1920" height="40" fill="#4d4a6a"/>`
          + [1120, 1290, 1460, 1630].map((x, i) => `<path fill="#4d4a6a" d="M${x} 600V400h12V600zM${x + 70} 600V400h12V600zM${x} 470h82v8H${x}zM${x + 6} 470l70 -60 6 6-70 60z"/><path fill="#4d4a6a" d="M${x - 150} 392h${300 + (i % 2) * 40}v14h-${300 + (i % 2) * 40}zM${x + 20} 392l22 -70h8l22 70z"/><rect x="${x + 50}" y="372" width="40" height="22" fill="#5a5776"/><path fill="none" stroke="#4d4a6a" stroke-width="3" d="M${x + 46} 324L${x - 140} 392M${x + 46} 324L${x + 150} 392M${x - 100} 406v${60 + i * 10}"/>` + `<circle class="hx-lit x-ukglow" style="--ad:${1.6 + i * 0.3}s" cx="${x + 46}" cy="320" r="6"/>`).join('')
          + (() => { const r = rnd(143); let o = ''; for (let i = 0; i < 26; i++) o += `<rect x="${R(1100 + r() * 600)}" y="${R(560 + r() * 40)}" width="${R(30 + r() * 30)}" height="${R(16 + r() * 18)}" fill="${['#6b5f7e', '#5a5576', '#7a6a86'][i % 3]}"/>`; return o; })())
        + `<rect y="636" width="1600" height="264" fill="url(#${sea})"/>`
        + shimmer(145, 80, 0, 1600, 650, 890, '#ffd2a8', 54)
        + mv('ukmove', { ad: '40s', d: '-12s', dx: '420px', ai: 1 }, `<g transform="translate(300 40) scale(.92)"><g id="${li}">${ship}</g>${reflect(li, 700, 0.28)}<path fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".6" d="M120 708c-80 10-170 8-280 -6M130 722c-100 20-220 24-360 6M1170 700c20 4 40 4 60 0"/></g>`)
        // a tug alongside
        + mv('ukmove', { ad: '40s', d: '-12s', dx: '420px', ai: 1 }, mv('ukbob', { ad: '2.6s', dy: '4px' }, `<g transform="translate(330 800)"><path fill="#c8382e" d="M-80 0H90L70 30H-60z"/><rect x="-40" y="-40" width="70" height="40" rx="4" fill="#f3f4f6"/><rect x="-10" y="-70" width="20" height="30" fill="#1d2e4f"/>${puffs(0, -80, 4, '#e6e2ea', 18, 60, 3)}</g>`))
        + birds(147, 6, 600, 260, '#2a2840', 1.1, 600)
        + finish()); } });

  /* ---------- the South Downs at dawn ---------- */
  add('hampshire', 'landscape', { id: 'south-downs-dawn', label: 'The South Downs at dawn', colour: 'orange', mood: 'dreamy', tags: ['south downs', 'dawn', 'chalk hills', 'national park'],
    site: 'The South Downs at dawn, Butser Hill',
    svg: () => { const s1 = U(), f1 = U();
      const thorn = (x, y, s) => `<path fill="#2c2a34" d="M${x - 8} ${y}C${x - 6} ${R(y - 50 * s)} ${R(x + 10 * s)} ${R(y - 100 * s)} ${R(x + 60 * s)} ${R(y - 130 * s)}l6 8C${R(x + 30 * s)} ${R(y - 96 * s)} ${R(x + 10 * s)} ${R(y - 50 * s)} ${x + 10} ${y}z"/>`
        + `<g class="x-uksway2 o-b" style="--ad:8s">${[[40, -150, 40], [90, -168, 46], [140, -162, 40], [184, -150, 32], [60, -122, 30], [120, -130, 36], [10, -132, 26], [216, -140, 22], [160, -128, 26]].map(([dx, dy, r], i) => `<circle cx="${R(x + dx * s)}" cy="${R(y + dy * s)}" r="${R(r * s)}" fill="${i % 3 ? '#34313e' : '#3c3846'}"/>`).join('')}<path fill="none" stroke="#f3b08a" stroke-width="4" opacity=".6" stroke-linecap="round" d="M${R(x + 50 * s)} ${R(y - 210 * s)}q${R(40 * s)} ${R(-10 * s)} ${R(80 * s)} ${R(4 * s)}M${R(x + 140 * s)} ${R(y - 200 * s)}q${R(30 * s)} ${R(-2 * s)} ${R(56 * s)} ${R(20 * s)}"/></g>`;
      const sheep = (x, y, k) => `<ellipse cx="${x}" cy="${y}" rx="${R(26 * k)}" ry="${R(16 * k)}" fill="#efe8dc"/><ellipse cx="${x}" cy="${R(y - 6 * k)}" rx="${R(20 * k)}" ry="${R(8 * k)}" fill="#fff8ee"/><ellipse cx="${R(x + 24 * k)}" cy="${R(y - 4 * k)}" rx="${R(9 * k)}" ry="${R(7 * k)}" fill="#2b2a2c"/><path stroke="#2b2a2c" stroke-width="${R(4 * k)}" d="M${R(x - 12 * k)} ${R(y + 12 * k)}v${R(10 * k)}M${R(x + 10 * k)} ${R(y + 12 * k)}v${R(10 * k)}"/>`;
      return svg(`<defs>${lin(s1, [[0, '#46558f'], [0.32, '#a985b0'], [0.58, '#f0ad98'], [0.76, '#ffd7a2'], [1, '#fff1cc']])}${linU(f1, [[0, '#5e6a62'], [1, '#2f3a34']], 0, 760, 0, 900)}</defs>`
        + full(`url(#${s1})`) + stars(161, 40, 200) + rays(820, 420, 900, '#ffe9c0', 0.14) + sun(820, 420, 62, '#fff6dc', '#ffcf8a', true)
        + cloud(300, 260, 1.5, '#f7b49a', 0.6, 62, 9, '#d9b2cc') + cloud(1320, 200, 1.2, '#f9bea0', 0.55, 56, 24, '#dcb6cc') + streak(1100, 330, 220, '#ffd9b8', 0.35)
        + mv('ukpar', { ad: '40s', dx: '6px' }, ridge('#cfa3b0', 520, 50, 6, 162))
        + mv('ukmist', { ad: '18s', dx: '80px' }, haze(490, 90, '#fff2ea', 0.8))
        + mv('ukpar', { ad: '40s', dx: '12px' }, ridge('#b08aa0', 580, 70, 5, 163))
        + mv('ukmist', { ad: '22s', d: '-6s', dx: '-90px' }, haze(555, 100, '#fde8e0', 0.75))
        + mv('ukpar', { ad: '40s', dx: '20px' }, ridge('#8a7290', 652, 80, 5, 164) + canopy('#6a5a7c', 650, 10, 165, 1080, 1480, 700, '#a07f98'))
        + mv('ukmist', { ad: '26s', d: '-11s', dx: '70px' }, haze(630, 110, '#f6dce0', 0.6))
        + mv('ukpar', { ad: '40s', dx: '30px' }, ridge('#615c78', 736, 66, 4, 166))
        // the nearest down: a chalk track, a wind-bent hawthorn, sheep
        + `<path fill="url(#${f1})" d="M-160 900V800C200 760 600 742 900 770C1200 790 1500 762 1760 780V900z"/><path fill="none" stroke="#f3b08a" stroke-width="5" opacity=".5" d="M-160 800C200 760 600 742 900 770C1200 790 1500 762 1760 780"/>`
        + `<path fill="#e8dfd0" opacity=".85" d="M600 900C680 860 760 820 870 790L892 793C810 826 770 866 740 900z"/>`
        + thorn(1260, 794, 1.2)
        + [[260, 826, 1], [330, 846, 1.1], [410, 818, 0.9], [1440, 850, 1.15], [1520, 832, 1]].map(([x, y, k], i) => mv('ukgraze2', { ad: `${4 + i}s`, d: `-${i}s` }, sheep(x, y, k))).join('')
        + grass(167, 80, -20, 1620, 900, 44, '#2a332e')
        + birds(169, 3, 600, 380, '#3a3448', 0.8, 300)
        + mv('uklark', { ad: '6s' }, `<path fill="#3a3448" d="M1000 620c6-8 16-8 20 0-6 6-14 6-20 0z"/><path fill="none" stroke="#3a3448" stroke-width="3" d="M1002 616l-8-10M1018 616l8-10"/>`)
        + finish(0.3)); } });

  /* ---------- Jane Austen's House, Chawton ---------- */
  add('hampshire', 'heritage', { id: 'chawton', label: 'Jane Austen\'s House, Chawton', colour: 'red', mood: 'cosy', tags: ['chawton', 'jane austen', 'writers house', 'museum'],
    site: 'Jane Austen\'s House, Chawton',
    svg: () => { const s1 = U(), b1 = U(), t1 = U(), g1 = U(), bp = U(), tp = U();
      const sash = (x, y, w, h) => `<rect x="${x - 7}" y="${y - 7}" width="${w + 14}" height="${h + 14}" fill="#f6f2e8"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#3e4a5c"/><path fill="#fff" opacity=".22" d="M${x} ${y}h${w}l-${w} ${h * 0.7}z"/>${lit(x, y, w, h)}<path fill="none" stroke="#f6f2e8" stroke-width="4" d="M${x + w / 3} ${y}V${y + h}M${x + 2 * w / 3} ${y}V${y + h}M${x} ${y + h / 2}H${x + w}"/><rect x="${x - 12}" y="${y + h + 6}" width="${w + 24}" height="8" fill="#e9e2d2"/>`;
      // cottage borders: mounded shrubs with flowers on top
      const border = (seed, x0, x1, y) => { const r = rnd(seed); let o = ''; for (let x = x0; x < x1; x += 70 + r() * 40) { const w = 60 + r() * 50, h = 50 + r() * 60, c = ['#e86a8a', '#f2c84b', '#b48ad8', '#fff', '#e8503a', '#f49ac0'][R(r() * 5)]; o += `<path fill="${['#3f6e34', '#4f7f3c', '#5a8a44'][R(r() * 2)]}" d="M${R(x)} ${y}c${R(w * 0.1)} ${-R(h)} ${R(w * 0.9)} ${-R(h)} ${R(w)} 0z"/>`; let f = ''; for (let j = 0; j < 8; j++) f += `M${R(x + w * 0.15 + r() * w * 0.7)} ${R(y - h * 0.3 - r() * h * 0.5)}h.1`; o += `<path fill="none" stroke="${c}" stroke-width="${R(9 + r() * 5)}" stroke-linecap="round" d="${f}"/>`; } return `<g class="x-uksway o-b" style="--ad:5.6s">${o}</g>`; };
      const holly = (x, h, c, d) => `<g class="x-uksway o-b" style="--ad:${3.6 + d}s;--d:-${d}s"><path stroke="#4a7a3a" stroke-width="6" d="M${x} 880V${880 - h}"/>${[0, 1, 2, 3, 4].map(i => `<circle cx="${x + (i % 2 ? 10 : -10)}" cy="${880 - h + i * 34}" r="${16 - i}" fill="${c}"/><circle cx="${x + (i % 2 ? 10 : -10)}" cy="${880 - h + i * 34}" r="5" fill="#fff6c8" opacity=".8"/>`).join('')}</g>`;
      return svg(`<defs>${lin(s1, [[0, '#76a8dc'], [0.7, '#cfe0ec'], [1, '#f2ead6']])}${linU(b1, [[0, '#b65c42'], [1, '#8a3e2e']], 0, 340, 0, 720)}${linU(t1, [[0, '#93503a'], [1, '#6a3626']], 0, 180, 0, 350)}${linU(g1, [[0, '#86ad5a'], [1, '#4f7a36']], 0, 716, 0, 900)}`
        + `<pattern id="${bp}" patternUnits="userSpaceOnUse" width="44" height="22"><rect width="44" height="22" fill="url(#${b1})"/><path fill="none" stroke="#e2b9a2" stroke-width="2" opacity=".45" d="M0 1H44M0 12H44M11 1v11M33 12v10"/></pattern>`
        + `<pattern id="${tp}" patternUnits="userSpaceOnUse" width="30" height="18"><rect width="30" height="18" fill="url(#${t1})"/><path fill="none" stroke="#4a2418" stroke-width="2" opacity=".5" d="M0 17q7.5-6 15 0t15 0"/></pattern></defs>`
        + full(`url(#${s1})`) + rays(1380, 150, 800, '#fff8e0', 0.12) + sun(1380, 150, 40, '#fff8e2', '#ffe9b0')
        + cloud(300, 170, 1.3, '#e2eaf1', 0.92, 50, 8) + cloud(980, 120, 1.0, '#e2eaf1', 0.86, 44, 19)
        + mv('ukpar', { ad: '34s', dx: '10px' }, canopy('#7e9e74', 430, 34, 182, null, null, null, '#a4c094') + haze(380, 120, '#f1f4ee', 0.5) + oak(1440, 660, 1.0, '#2f4a2c', '#46663a', '#7f9a4a', 183) + oak(190, 620, 0.85, '#2f4a2c', '#46663a', '#7f9a4a', 184))
        // the house: red brick, a steep tiled roof, chimneys, white sashes, the porch
        + `<rect x="520" y="340" width="700" height="380" fill="url(#${bp})"/><path fill="#5a2c20" opacity=".25" d="M520 340H1220V372H520z"/>`
        + `<path fill="url(#${tp})" d="M490 350L620 180H1120L1250 350z"/><path fill="#000" opacity=".12" d="M1120 180L1250 350H1170z"/><path fill="#5a2c20" d="M486 348H1254V362H486zM618 176H1122V186H618z"/>`
        + `<rect x="640" y="112" width="54" height="96" fill="url(#${bp})"/><rect x="1040" y="112" width="54" height="96" fill="url(#${bp})"/><path fill="#6a3626" d="M632 106h70v12h-70zM1032 106h70v12h-70z"/><rect x="650" y="94" width="14" height="14" fill="#8a4a36"/><rect x="1050" y="94" width="14" height="14" fill="#8a4a36"/>`
        + puffs(1057, 86, 7, '#ece8f0', 22, -160, 5.6, -200, 2.4)
        + sash(580, 400, 84, 112) + sash(1076, 400, 84, 112) + sash(828, 400, 84, 112) + sash(580, 568, 84, 112) + sash(1076, 568, 84, 112)
        + `<path fill="#f6f2e8" d="M796 720V590h148v130z"/><path fill="#f6f2e8" d="M776 598L870 538L964 598z"/><path fill="#e2dccc" d="M800 598h140v8H800z"/><path fill="#3e4a5c" d="M836 612a34 20 0 0 1 68 0z"/><rect x="832" y="618" width="76" height="102" fill="#2f4f42"/><path fill="none" stroke="#24403a" stroke-width="3" d="M842 628h56v40h-56zM842 676h56v36h-56z"/><circle cx="896" cy="672" r="5" fill="#d8b04a"/>`
        // a climbing rose up the front wall
        + `<g class="x-uksway2 o-b" style="--ad:7s"><path fill="none" stroke="#4a6a34" stroke-width="5" d="M700 720C690 640 720 600 700 540C690 500 720 470 740 440"/><g fill="#3f6a34">${[[700, 640], [712, 590], [696, 540], [724, 480], [690, 690]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="22" ry="14"/>`).join('')}</g><g fill="#e8507a">${[[690, 632], [718, 584], [702, 532], [730, 474], [688, 682], [712, 560]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8"/>`).join('')}</g></g>`
        // the cottage garden and its fence
        + `<rect y="716" width="1600" height="184" fill="url(#${g1})"/><path fill="#e7dcc4" d="M796 720H944L1010 900H730z"/><path fill="#000" opacity=".1" d="M520 720H1220L1300 760H560z"/>`
        + border(186, -40, 720, 800) + border(188, 1010, 1660, 800)
        + `<path fill="#f4f0e6" d="${[...Array(34)].map((_, i) => { const x = i * 48 - 30; return x > 700 && x < 1010 ? '' : `M${x} 870v-60l10-14 10 14v60z`; }).join('')}"/><path fill="#f4f0e6" d="M-40 822H712v10H-40zM-40 852H712v8H-40zM1004 822H1660v10H1004zM1004 852H1660v8H1004z"/>`
        + holly(110, 260, '#e86a8a', 0) + holly(470, 280, '#f6f0f2', 1) + holly(1160, 260, '#c84a6a', 0.5) + holly(1500, 230, '#f2c84b', 1.5)
        + grass(185, 50, 0, 1600, 900, 40, '#4a7a34')
        + [[340, 640, '#f2a43a'], [1260, 600, '#fff'], [1000, 760, '#b48ad8']].map(([x, y, c], i) => mv('ukflutter', { ad: `${6 + i}s`, d: `-${i * 2}s` }, mv('ukflap', { ad: '.35s' }, `<path fill="${c}" d="M${x} ${y}c-16-18-30-8-20 6 8 8 18 4 20-6zm0 0c16-18 30-8 20 6-8 8-18 4-20-6z"/>`))).join('')
        + birds(187, 3, 700, 220, '#2c2a30', 1, 380)
        + finish()); } });

  /* ---------- watercress beds near Alresford ---------- */
  add('hampshire', 'food', { id: 'watercress-beds', label: 'Watercress beds near Alresford', colour: 'green', mood: 'calm', tags: ['watercress', 'alresford', 'chalk springs', 'farming'],
    site: 'Watercress beds, Alresford',
    svg: () => { const s1 = U(), w1 = U();
      // the beds recede: each a band of cress (rows of round dabs: dashed strokes) over shining spring water
      let beds = '';
      for (let b = 0; b < 5; b++) {
        const y = 560 + b * b * 14 + b * 30, h = 18 + b * 14, k = 0.5 + b * 0.3; let cress = '';
        for (let j = 0; j < 5; j++) cress += `<path fill="none" stroke="${['#2f6e2a', '#3d8432', '#58a844', '#6cb850', '#8ad06a'][j]}" stroke-width="${R((10 + j * 2) * k)}" stroke-linecap="round" stroke-dasharray="${[`1 ${R(9 * k)} 1 ${R(17 * k)}`, `1 ${R(13 * k)}`, `1 ${R(7 * k)} 1 ${R(21 * k)}`, `1 ${R(11 * k)} 1 ${R(15 * k)}`, `1 ${R(25 * k)}`][j]}" stroke-dashoffset="${j * 7}" d="M-60 ${R(y + h * (0.75 - j * 0.16))}H1660"/>`;
        beds += `<rect x="-40" y="${R(y - 8 * k)}" width="1680" height="${R(h + 16 * k)}" fill="url(#${w1})"/>${shimmer(210 + b, 16, 0, 1600, y + h * 0.8, y + h + 8 * k, '#efffff', 22 + b * 10)}${mv('ukpar', { ad: `${10 + b * 2}s`, dx: `${3 + b * 2}px` }, cress)}<rect x="-40" y="${R(y + h + 6 * k)}" width="1680" height="${R(6 + b * 4)}" fill="#a39a82"/><rect x="-40" y="${R(y + h + 6 * k)}" width="1680" height="2" fill="#d8d0b8"/>`;
      }
      return svg(`<defs>${lin(s1, [[0, '#6ea2d8'], [0.7, '#cfe2ee'], [1, '#f1f2e4']])}${lin(w1, [[0, '#bfe6de'], [1, '#6cb2a8']])}</defs>`
        + full(`url(#${s1})`) + rays(1200, 170, 800, '#fffbe0', 0.12) + sun(1200, 170, 42, '#fffbe6', '#fff0b8')
        + cloud(480, 170, 1.3, '#e2eaf1', 0.92, 50, 6) + cloud(1380, 290, 0.9, '#e2eaf1', 0.86, 46, 18) + streak(900, 90, 260, '#fff', 0.45)
        + mv('ukpar', { ad: '36s', dx: '10px' }, ridge('#a9c49a', 470, 50, 6, 201) + haze(420, 120, '#f2f6ee', 0.55) + canopy('#5e8a4a', 520, 22, 202, null, null, null, '#8db474')
          + [140, 260, 1500].map(x => `<path fill="#4a7a3e" d="M${x} 548c-30-60-20-200 0-250 20 50 30 190 0 250z"/><path fill="#6a9a50" d="M${x} 540c-14-50-10-170 0-220 8 50 12 170 0 220z"/>`).join('')
          + `<path fill="#7aa35a" d="M-160 540H1760V562H-160z"/>`)
        // the brick packing shed
        + `<rect x="1150" y="430" width="250" height="132" fill="#a8553c"/><path fill="#6a3a2a" d="M1130 436l145-82 145 82z"/><path fill="#000" opacity=".15" d="M1275 354l145 82h-60z"/><rect x="1252" y="490" width="44" height="72" fill="#3c4a3a"/>${lit(1176, 462, 44, 32)}${lit(1330, 462, 44, 32)}<path fill="none" stroke="#e9e2d2" stroke-width="4" d="M1176 462h44v32h-44zM1330 462h44v32h-44zM1198 462v32M1352 462v32"/>`
        + beds + grass(221, 60, -20, 1620, 900, 54, '#3f7a30') + meadow(222, 22, -20, 1620, 860, 900, ['#f4f1e6', '#f2c230'])
        + birds(223, 4, 500, 260, '#2c3036', 1, 460)
        + mv('ukglide', { ad: '16s', dx: '500px', dy: '-30px' }, `<path fill="#f4f6f8" d="M300 420c30-10 60-10 80 0-20 10-60 12-80 0z"/><path fill="none" stroke="#f4f6f8" stroke-width="10" stroke-linecap="round" d="M330 418l-40-40M350 418l30-36"/><path fill="#2c3036" d="M376 418l14 -2-14 -4z"/>`)
        + finish()); } });

  const css = [
    /* the evening grade: dark theme, or the time of day the opening asks for (71-anim-wire.css lays the same on the splash) */
    '.anim-scene.ap-full .hx-tint { fill: #4a4f94; mix-blend-mode: multiply; opacity: 0; pointer-events: none; }',
    '.anim-scene.ap-full .hx-lit { fill: #ffd27a; stroke: #ffd27a; opacity: 0; }',
    '.anim-scene.ap-full .hx-star { opacity: 0; }',
    '[data-theme="dark"] .anim-scene.ap-full .hx-tint, .anim-scene.ap-full.tod-dusk .hx-tint { opacity: .6; }',
    '.anim-scene.ap-full.tod-night .hx-tint { opacity: .85; }',
    '[data-theme="dark"] .anim-scene.ap-full .hx-lit, .anim-scene.ap-full.tod-dusk .hx-lit, .anim-scene.ap-full.tod-night .hx-lit { opacity: .92; }',
    '[data-theme="dark"] .anim-scene.ap-full .hx-star, .anim-scene.ap-full.tod-night .hx-star { opacity: .8; }',
    'html .anim-scene.ap-full:is(.tod-day, .tod-dawn) :is(.hx-tint, .hx-lit, .hx-star) { opacity: 0; }',
    /* motion: transform and opacity only; long, slow loops so a 5 s look is calm but alive */
    '.anim-scene .x-ukdrift { --an: ap-ukdrift; --ad: 46s; }',
    '.anim-scene .x-ukpar { --an: ap-ukdrift; --ad: 30s; }',
    '.anim-scene .x-ukglide { --an: ap-ukglide; --ad: 18s; --ae: linear; }',
    '.anim-scene .x-ukflap { --an: ap-ukflap; --ad: .7s; }',
    '.anim-scene .x-ukshim { --an: ap-ukshim; --ad: 3s; }',
    '.anim-scene .x-ukpuff { --an: ap-ukpuff; --ad: 3.6s; --ae: cubic-bezier(.2, .6, .4, 1); }',
    '.anim-scene .x-ukmove { --an: ap-ukmove; --ad: 24s; --ae: linear; }',
    '.anim-scene .x-ukbob { --an: ap-ukbob; --ad: 3s; }',
    '.anim-scene .x-ukheel { --an: ap-ukheel; --ad: 4s; }',
    '.anim-scene .x-ukglow { --an: ap-ukglow; --ad: 6s; }',
    '.anim-scene .x-ukrise { --an: ap-ukrise; --ad: 9s; --ai: 1; --ae: cubic-bezier(.2, .7, .3, 1); }',
    '.anim-scene .x-uksway { --an: ap-uksway; --ad: 4s; }',
    '.anim-scene .x-uksway2 { --an: ap-uksway2; --ad: 6s; }',
    '.anim-scene .x-uktail { --an: ap-uktail; --ad: 2.8s; }',
    '.anim-scene .x-ukgraze { --an: ap-ukgraze; --ad: 5s; }',
    '.anim-scene .x-uknod { --an: ap-uknod; --ad: 6s; }',
    '.anim-scene .x-ukgraze2 { --an: ap-ukgraze2; --ad: 5s; }',
    '.anim-scene .x-ukflag { --an: ap-ukflag; --ad: 2s; }',
    '.anim-scene .x-ukfall { --an: ap-ukfall; --ad: 9s; --ae: linear; }',
    '.anim-scene .x-ukswim { --an: ap-ukswim; --ad: 4.6s; }',
    '.anim-scene .x-ukweed { --an: ap-ukweed; --ad: 4s; }',
    '.anim-scene .x-ukrays { --an: ap-ukrays; --ad: 6s; }',
    '.anim-scene .x-ukbubble { --an: ap-ukbubble; --ad: 3s; --ae: ease-out; }',
    '.anim-scene .x-ukfly { --an: ap-ukfly; --ad: 2.6s; }',
    '.anim-scene .x-ukmist { --an: ap-ukdrift; --ad: 20s; }',
    '.anim-scene .x-uklark { --an: ap-uklark; --ad: 6s; }',
    '.anim-scene .x-ukflutter { --an: ap-ukflutter; --ad: 7s; }',
    '.anim-scene .x-ukspin { --an: ap-ukspin; --ad: 40s; }',
    '.anim-scene .x-ukwheel { --an: ap-ukwheel; --ad: 1.4s; --ae: linear; }',
    '@keyframes ap-ukdrift { 0%, 100% { transform: translateX(calc(var(--dx, 80px) * -1)); } 50% { transform: translateX(var(--dx, 80px)); } }',
    '@keyframes ap-ukglide { 0% { transform: translate(calc(var(--dx, 500px) * -.5), 0); opacity: 0; } 10%, 85% { opacity: 1; } 100% { transform: translate(calc(var(--dx, 500px) * .5), var(--dy, -30px)); opacity: 0; } }',
    '@keyframes ap-ukflap { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(-.35); } }',
    '@keyframes ap-ukshim { 0%, 100% { opacity: .1; transform: translateX(-8px); } 50% { opacity: .9; transform: translateX(8px); } }',
    '@keyframes ap-ukpuff { 0% { transform: translate(0, 0) scale(.35); opacity: 0; } 12% { opacity: .95; } 100% { transform: translate(var(--dx, -120px), var(--dy, -260px)) scale(var(--sc, 2.6)); opacity: 0; } }',
    '@keyframes ap-ukmove { from { transform: translateX(calc(var(--dx, 400px) * -.5)); } to { transform: translateX(calc(var(--dx, 400px) * .5)); } }',
    '@keyframes ap-ukbob { 0%, 100% { transform: translateY(calc(var(--dy, 5px) * -1)) rotate(-.4deg); } 50% { transform: translateY(var(--dy, 5px)) rotate(.4deg); } }',
    '@keyframes ap-ukheel { 0%, 100% { transform: rotate(-3deg) translateY(-3px); } 50% { transform: rotate(2deg) translateY(3px); } }',
    '@keyframes ap-ukglow { 0%, 100% { opacity: .82; transform: scale(.97); } 50% { opacity: 1; transform: scale(1.04); } }',
    '@keyframes ap-ukrise { from { transform: translateY(90px); opacity: .6; } to { transform: none; opacity: 1; } }',
    '@keyframes ap-uksway { 0%, 100% { transform: skewX(-4deg); } 50% { transform: skewX(4deg); } }',
    '@keyframes ap-uksway2 { 0%, 100% { transform: rotate(-.8deg); } 50% { transform: rotate(.8deg); } }',
    '@keyframes ap-uktail { 0%, 100% { transform: rotate(-7deg); } 50% { transform: rotate(9deg); } }',
    '@keyframes ap-ukgraze { 0%, 55%, 100% { transform: none; } 70% { transform: rotate(-5deg); } 85% { transform: rotate(2deg); } }',
    '@keyframes ap-uknod { 0%, 60%, 100% { transform: none; } 72% { transform: rotate(-7deg); } 84% { transform: rotate(3deg); } }',
    '@keyframes ap-ukgraze2 { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(14px); } }',
    '@keyframes ap-ukflag { 0%, 100% { transform: skewY(0) scaleX(1); } 50% { transform: skewY(-4deg) scaleX(.94); } }',
    '@keyframes ap-ukfall { 0% { transform: translate(0, -60px) rotate(0); opacity: 0; } 10%, 85% { opacity: 1; } 100% { transform: translate(var(--dx, 100px), 420px) rotate(540deg); opacity: 0; } }',
    '@keyframes ap-ukswim { 0%, 100% { transform: translate(-14px, 4px) rotate(-1.4deg); } 50% { transform: translate(16px, -6px) rotate(1.2deg); } }',
    '@keyframes ap-ukweed { 0%, 100% { transform: skewX(-6deg) scaleX(.98); } 50% { transform: skewX(5deg) scaleX(1.03); } }',
    '@keyframes ap-ukrays { 0%, 100% { opacity: .25; } 50% { opacity: .75; } }',
    '@keyframes ap-ukbubble { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(-260px); opacity: 0; } }',
    '@keyframes ap-ukfly { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(10px, -26px); } 50% { transform: translate(-6px, -40px); } 75% { transform: translate(-12px, -14px); } }',
    '@keyframes ap-uklark { 0% { transform: translate(0, 0); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(40px, -380px); opacity: 0; } }',
    '@keyframes ap-ukspin { 0%, 100% { transform: rotate(-4deg); opacity: .8; } 50% { transform: rotate(4deg); opacity: 1; } }',
    '@keyframes ap-ukwheel { to { transform: rotate(1turn); } }',
    '@keyframes ap-ukflutter { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(60px, -40px); } 50% { transform: translate(120px, 10px); } 75% { transform: translate(50px, 30px); } }',
  ].join('\n');

  animRegisterPack({ id: 'uk-south-east', name: 'UK: South East', version: '2.2.1', css,
    description: 'Hampshire so far, as full-screen scenes: the New Forest, Winchester, Portsmouth, the Solent, Southampton, the South Downs, chalk streams, the Watercress Line, Chawton and the watercress beds. Opt-in: plays only in that county (Regional animations (UK)).', items });
})();
