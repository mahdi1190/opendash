/* UK: Northern cities and the Peaks. Twenty full-screen place studies.
   The Hampshire toolkit is copied unchanged, with a separate SVG id prefix.
   Eight Sheffield, eight Manchester and four Peak District views. */
(function () {
  const items = [];
  const add = (county, kind, o) => { const area = ukCounty(county); items.push(Object.assign({slot:'opening',mood:'calm',intensity:'subtle',theme:'any',season:'any',region:[area.nation],reduced:'static',priority:1,full:true,county,ukRegion:area.region,ukKind:kind,signature:kind==='signature',ukPart:'northern-cities'}, o, {id:county+'-'+o.id,tags:['uk',area.region.replace(/-/g,' '),area.name.toLowerCase(),kind].concat(o.tags),when:(day,ctx)=>!!ctx&&!!ctx.county&&(ctx.county===county||animUkScenePools([Object.assign({county},o)],ctx).nearby.length>0)})); };
  /* ---------- the toolkit: 1600 x 900 user units ---------- */
  let _n = 0;
  const U = () => 'nx' + (++_n).toString(36);                      // a gradient id, unique per render
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

  const arch = (x, y, w, h, stone) => `<path fill="#394855" d="M${x} ${y + h}V${y + w / 2}Q${x + w / 2} ${y - w / 2} ${x + w} ${y + w / 2}V${y + h}z"/>${lit(x + 4, y + w / 2, w - 8, h - w / 2)}<path fill="none" stroke="${stone || '#d4c7aa'}" stroke-width="3" d="M${x + w / 2} ${y + 8}V${y + h}M${x} ${y + h * .64}H${x + w}"/>`;
  const sashes = (x, y, n, rows, gap, colour) => {
    let out = '';
    for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) {
      const xx = x + i * gap, yy = y + j * 68;
      out += `<rect x="${xx - 4}" y="${yy - 4}" width="32" height="44" fill="${colour || '#dfd9c9'}"/><rect x="${xx}" y="${yy}" width="24" height="36" fill="#384d59"/>${lit(xx, yy, 24, 36)}<path stroke="${colour || '#dfd9c9'}" stroke-width="2" d="M${xx + 12} ${yy}v36M${xx} ${yy + 18}h24"/>`;
    }
    return out;
  };
  const battlements = (x, y, w, colour) => {
    let d = `M${x} ${y + 16}V${y}`;
    for (let i = 0; i < w; i += 32) d += 'h16v-16h16v16';
    return `<path fill="${colour}" d="${d}V${y + 16}z"/>`;
  };
  const town = (seed, y, colour) => {
    const r = rnd(seed); let out = '';
    for (let x = -160; x < 1760; x += 94) {
      const h = R(38 + r() * 50);
      out += `<path fill="${colour}" d="M${x} ${y}v-${h}l38-26 38 26v${h}z"/><path fill="#637272" d="M${x - 5} ${y - h + 3}l43-32 43 32-5 5-38-26-38 26z"/><path fill="#647579" d="M${x + 20} ${y - h + 10}h10v15h-10zM${x + 48} ${y - h + 10}h10v15h-10z"/>${lit(x + 20, y - h + 10, 10, 15)}${lit(x + 48, y - h + 10, 10, 15)}<path fill="#52605c" d="M${x + 33} ${y}v-23h13v23z"/>`;
    }
    return out;
  };
  const sail = (x, y, k, seed) => mv('ukbob', { ad: `${4 + seed % 3}s`, d: `-${seed % 4}s`, dy: '4px' }, `<g transform="translate(${x} ${y}) scale(${k})"><path fill="#f7f1df" d="M0-10V-210Q70-120 106-10z"/><path fill="#dce7e5" d="M-8-12V-170L-80-12z"/><path stroke="#354855" stroke-width="4" d="M-3 0V-220"/><path fill="#354855" d="M-90-2H122L100 22H-60z"/><path fill="none" stroke="#e8f4f0" opacity=".55" stroke-width="4" d="M-115 30q100 16 236 0"/></g>`);
  const boat = (x, y, k, colour) => `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cy="26" rx="124" ry="12" fill="#233e49" opacity=".2"/><path fill="${colour}" d="M-130-10Q0 15 130-10L100 42Q0 66-100 42z"/><path fill="#f1ddbc" d="M-130-10Q0 15 130-10L114 0Q0 26-114 0z"/><path fill="#39545b" d="M-60-22h110v26H-60z"/><path stroke="#8c7053" stroke-width="5" d="M0-12V-124M-72-18L-10-108L78-18"/></g>`;
  const pavilion = (x, y, w, col) => `<path fill="${col}" d="M${x} ${y}v-100h${w}v100z"/><path fill="#675649" d="M${x - 16} ${y - 100}l${w / 2 + 16}-65 ${w / 2 + 16} 65z"/>${sashes(x + 22, y - 78, Math.floor(w / 54), 1, 54)}<path fill="#d9d1bc" d="M${x - 20} ${y}h${w + 40}v12H${x - 20}z"/>`;
  const terrace = (seed, y) => town(seed, y, '#b98c6e') + `<path fill="#6c5551" d="M-160 ${y}H1760v16H-160z"/>`;
  /** Chalk is a lit, weathered face, rather than an unbroken white cutout. */
  const chalk = (d, seed) => {
    const id = U(), light = U(), r = rnd(seed); let seams = '';
    for (let i = 0; i < 22; i++) {
      const x = R(-160 + r() * 1920), y = R(370 + r() * 190), h = R(90 + r() * 240);
      seams += `M${x} ${y}q${R(r() * 26 - 13)} ${R(h * .45)} ${R(r() * 22 - 11)} ${h}`;
    }
    return `<defs><clipPath id="${id}"><path d="${d}"/></clipPath>${linU(light, [[0, '#faf3df'], [.55, '#e3e0d0'], [1, '#a8b9b3']], 0, 400, 1600, 790)}</defs><path fill="url(#${light})" d="${d}"/><g clip-path="url(#${id})"><path fill="none" stroke="#aab7aa" stroke-width="3" opacity=".45" d="${seams}"/><path fill="none" stroke="#c4c3b2" stroke-width="5" opacity=".5" d="M-160 570Q650 530 1760 615M-160 644Q700 580 1760 697"/></g>`;
  };
  const lawn = y => `<path fill="#bed397" opacity=".16" d="${Array.from({ length: 9 }, (_, i) => { const x = -400 + i * 280; return `M${x} 900L${600 + i * 44} ${y}h26L${x + 140} 900z`; }).join('')}"/><path fill="#263e34" opacity=".12" d="M300 ${y + 4}h960l94 55H220z"/>`;
  /** A travel-poster frame: painted light, three independent depth bands,
      clouds, birds and swaying grass (plus water when appropriate).
      The subject callback returns markup; finish() is always last. */
  const vista = (seed, subject, o = {}) => {
    const sky = U(), floor = U(), wash = U(), stone = U(), masonry = U(), roof = U();
    const warm = o.time === 'dawn' || o.time === 'dusk', autumn = o.autumn;
    const sk = warm ? [[0, '#49598c'], [.35, '#b294b4'], [.7, '#f2b599'], [1, '#ffe6b4']] : [[0, '#648fb9'], [.5, '#bfd7df'], [1, '#f2ecd6']];
    const water = o.water, y = o.y || 680;
    const palette = { stone: `url(#${masonry})`, shade: warm ? '#95785f' : '#a59980', roof: `url(#${roof})`, green: autumn ? '#a29047' : '#617d45' };
    const ground = water ? [[0, warm ? '#ab9ea9' : '#80b5bd'], [1, warm ? '#344968' : '#2d6378']] : [[0, autumn ? '#a8aa65' : '#94a768'], [1, autumn ? '#6c6641' : '#405c38']];
    return `<g${o.time === 'dusk' ? ' class="hx-evening"' : ''}><defs>${lin(sky, sk)}${linU(floor, ground, 0, y, 0, 900)}${radU(wash, [[0, '#fff2c5', .26], [1, '#fff2c5', 0]], warm ? 1130 : 350, warm ? 480 : 180, 900)}${linU(stone, [[0, warm ? '#e6c298' : '#f0e3c8'], [.45, warm ? '#d1ac87' : '#ddd0b3'], [1, warm ? '#ba9876' : '#b9b096']], 200, 160, 1320, 750)}${linU(roof, [[0, '#6c797b'], [1, '#46505b']], 200, 250, 1400, 650)}<pattern id="${masonry}" width="64" height="28" patternUnits="userSpaceOnUse"><rect width="64" height="28" fill="url(#${stone})"/><path fill="none" stroke="#746956" stroke-width="1" opacity=".14" d="M0 0H64M0 14H64M0 28H64M32 0v14M12 14v14M56 14v14"/></pattern></defs>`
      + full(`url(#${sky})`) + stars(seed, 32, 280)
      + sun(warm ? 1130 : 350, warm ? 465 : 180, warm ? 55 : 38, '#fff4d8', '#ffdfa0')
      + rays(warm ? 1130 : 350, warm ? 465 : 180, 1000, '#fff1c4', .13)
      + cloud(250, warm ? 215 : 160, 1.18, warm ? '#d4a6aa' : '#c7d5df', .8, 56, 9)
      + cloud(1330, 150, 1.35, warm ? '#d4a6aa' : '#c7d5df', .84, 67, 21)
      + streak(820, 84, 310, '#f8eeeb', .45, 75)
      + mv('ukpar', { ad: '44s', dx: '7px' }, o.coast ? `<path fill="${warm ? '#b6a4ad' : '#9bbec5'}" d="M-160 ${y - 16}H1760V900H-160z"/>${haze(y - 48, 70, '#f5e7d0', .25)}` : ridge(warm ? '#a291aa' : '#a3b5b2', 510, o.flat ? 14 : 100, 7, seed) + haze(460, 150, '#f5e7d0', .45))
      + mv('ukpar', { ad: '37s', dx: '15px' }, o.coast ? `<path fill="#7a959d" opacity=".6" d="M1410 ${y - 18}h65l-10 7h-48zM1440 ${y - 18}v-9h15v9z"/>` : canopy(warm ? '#6e7b83' : '#708b79', 585, 33, seed + 1, null, null, 760, '#a4b195'))
      + `<rect x="-160" y="${y}" width="1920" height="${900 - y}" fill="url(#${floor})"/>`
      + (o.lawn ? lawn(y) : '')
      + mv('ukpar', { ad: '32s', dx: '23px' }, subject(palette))
      + (water ? shimmer(seed + 8, 48, -100, 1740, y + 15, 895, warm ? '#ffe3be' : '#d5eef0', 55) : o.path === false ? '' : `<path fill="#d8ccb0" d="M650 900Q770 770 960 ${y}h25Q820 795 820 900z"/>`)
      + birds(seed + 5, 5, 740, 230, '#394452', 1, 370)
      + mv('ukpar', { ad: '27s', dx: '34px' }, water || o.edgeNear ? `<path fill="#a9987b" d="M-160 900v-28Q120 802 380 900zM1300 900q250-85 460-50v50z"/>${grass(seed + 6, 30, -160, 280, 900, 85, '#64714a')}${grass(seed + 7, 30, 1370, 1760, 900, 65, '#4a6347')}` : ridge(autumn ? '#71663e' : '#405b33', 900, 25, 8, seed + 3) + grass(seed + 6, 65, -160, 1760, 900, 48, '#3c5833') + meadow(seed + 7, 18, -160, 1760, 850, 900, autumn ? ['#eac277', '#eee0b9'] : ['#f8edcc', '#d3b75e']))
      + `<rect width="1600" height="900" fill="url(#${wash})"/>` + finish() + '</g>';
  };

  /* Sheffield (south-yorkshire): the Diamond's aluminium lattice, Arts Tower's
     slender curtain wall, Winter Garden's timber ribs and Kelham's foundry heritage.
     https://sheffield.ac.uk/library/buildings/diamond
     https://sheffield.ac.uk/media/18399/download
     https://www.sheffield.gov.uk/parks-sport-recreation/public-spaces/winter-garden
     https://sheffieldmuseums.org.uk/visit-us/kelham-island-museum/
     Manchester (greater-manchester): Whitworth Hall's Gothic gable, John Rylands'
     turreted frontage, the Whitworth's park-facing glass and Castlefield's ironwork.
     https://www.manchester.ac.uk/about/history-heritage/history/buildings/whitworth-hall/index.htm
     https://www.library.manchester.ac.uk/rylands/visit/
     https://www.masterplan.manchester.ac.uk/projects/university-wide/the-whitworth/
     https://www.nationaltrust.org.uk/visit/cheshire-greater-manchester/castlefield-viaduct/index
     Peak District (derbyshire): Stanage's gritstone edge and discarded millstones;
     Mam Tor's stepped ridge and exposed landslip slopes. Two landscape viewpoints each.
     https://www.peakdistrict.gov.uk/visiting/places-to-visit/stanage-and-north-lees
     https://www.peakdistrict.gov.uk/visiting/miles-without-stiles/mam-tor-landslip
     The two Peak anchors are approximate public landscape centres, not visitor positions. */
  const stoneWindow = (x,y,w,h) => arch(x,y,w,h,'#dfcaaa');
  const paving = () => `<path fill="#bdb5a3" d="M-160 738H1760V900H-160z"/><path stroke="#e1d5bd" stroke-width="3" opacity=".7" fill="none" d="M-160 815H1760M-160 865H1760M100 900l330-162M490 900l143-162M960 900l-42-162M1390 900l-274-162"/>`;
  const streetTree = (x,y,k,seed) => oak(x,y,k,'#365746','#62846a','#a3b584',seed);
  const glazed = (x,y,w,h,cols,rows) => {
    const grid=U(), glass=U(), dx=w/cols, dy=h/rows;
    return `<defs>${linU(glass,[[0,'#b8cfd0'],[.48,'#5f8593'],[1,'#b7b8a5']],x,y,x+w,y+h)}<pattern id="${grid}" width="${dx}" height="${dy}" patternUnits="userSpaceOnUse"><path d="M0 0H${dx}V${dy}" fill="none" stroke="#d8dcd1" stroke-width="3"/></pattern></defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${glass})"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${grid})"/>${Array.from({length:9},(_,i)=>lit(x+8+(i*3%cols)*dx,y+8+(i*7%rows)*dy,Math.max(8,dx-16),Math.max(8,dy-14))).join('')}`;
  };
  const diamond = detail => {
    let lattice=''; const clip=U();
    for(let row=0;row<5;row++)for(let col=0;col<8;col++){
      const x=360+col*115+(row%2)*57,y=333+row*80;
      lattice+=`M${x} ${y}l57-75 58 75-58 75z`;
    }
    const face=`<defs><clipPath id="${clip}"><rect x="355" y="278" width="898" height="428" rx="49"/></clipPath></defs><path fill="#80999e" d="M1250 705V307l94 70v288z"/>${glazed(354,278,900,428,15,6)}<g clip-path="url(#${clip})"><path fill="none" stroke="#e0ddc9" stroke-width="12" stroke-linejoin="round" d="${lattice}"/><path fill="none" stroke="#a2b1ad" stroke-width="2" d="${lattice}"/></g><rect x="354" y="278" width="900" height="428" rx="49" fill="none" stroke="#d7d9c7" stroke-width="9"/><path fill="#d7d5c7" d="M333 712h984v18H333z"/><path fill="#506d75" d="M714 706V604h120v102z"/><path stroke="#e1dcc7" stroke-width="4" d="M774 606v100"/>`;
    return paving()+(detail?`<g transform="translate(-285 -66) scale(1.22)">${face}</g>`:face)+streetTree(detail?1330:265,848,detail?.85:.66,5020)+`<path fill="#7d8a6a" d="M1110 838h295v20h-295z"/>${grass(5012,18,1120,1390,837,37,'#648163')}`;
  };
  const artsTower = evening => {
    const x=evening?820:678,y=evening?124:100,w=evening?286:302,h=evening?548:586;
    return paving()+`<path fill="#6d848c" d="M${x+w} ${y}l75 25v${h-25}h-75z"/>${glazed(x,y,w,h,9,20)}<path fill="#d9d6c3" d="M${x-8} ${y-11}h${w+20}v13h-${w+20}z"/><path fill="#adb4ac" d="M${x-15} ${y+h}h${w+96}v27h-${w+96}z"/><path fill="#afb3a8" d="M360 731V627h330v104z"/>${glazed(372,643,294,67,9,2)}${streetTree(evening?430:1230,851,1.03,5033)}<path fill="#a29579" d="M261 846h302v13H261z"/>`;
  };
  const winterGarden = close => {
    let ribs='';for(let i=0;i<9;i++){const x=450+i*76; ribs+=`<path d="M${x} 721V553q0-189 93-224 93 35 93 224v168"/>`;}
    let palms='';for(let i=0;i<6;i++){const x=515+i*116,y=694;palms+=`<path stroke="#74674a" stroke-width="9" d="M${x} ${y}q-10-55 3-112"/><path fill="#527454" d="M${x} ${y-112}q-68-89-102-5 64-25 102 5-42-127 42-140-23 70-42 140 83-115 125-42-78 0-125 42z"/>`;}
    return paving()+`<g${close?' transform="translate(-255 -82) scale(1.2)"':''}><path fill="#8faeaa" opacity=".78" d="M450 725V553q0-189 93-224h608q93 35 93 224v172z"/>${palms}<g fill="none" stroke="#b89b74" stroke-width="12">${ribs}</g><path stroke="#d5dccb" stroke-width="3" fill="none" d="M450 552h794M450 628h794M491 403h718"/></g>${streetTree(close?1330:279,858,.77,5051)}`;
  };
  const kelham = close => {
    let windows='';for(let i=0;i<9;i++)windows+=stoneWindow(465+i*71,579,34,91);
    const converter=`<path fill="#48565a" d="M1085 720l20-142h71l30 142z"/><path fill="#667578" d="M1081 582q-33-40 0-103l30-38-7-58h57l-5 61 36 41q23 64-14 97z"/><path fill="none" stroke="#a8aea2" stroke-width="9" d="M1080 550h107M1098 490h79"/><path fill="#48565a" d="M1072 384l51-33h65l-31 33z"/>`;
    return paving()+`<path fill="#ae795e" d="M400 730V542h758v188z"/><path fill="#645d55" d="M374 546l100-100h590l112 100z"/><path fill="#936e56" d="M442 540V258h41v282z"/><path fill="#c39b77" d="M435 253h56v14h-56z"/>${windows}${close?`<g transform="translate(-460 -165) scale(1.3)">${converter}</g>`:converter}${streetTree(260,851,.71,5062)}`;
  };
  const whitworthHall = close => {
    let bays='';for(let i=0;i<5;i++)bays+=stoneWindow(810+i*71,562,42,110);
    const face=`<path fill="#bc9d76" d="M390 724V382l187-165 184 165v342zM756 723V488h440v235z"/><path fill="#58676b" d="M371 391l206-190 205 190-20 7-185-167-185 167zM756 488l72-93h280l96 93z"/><path fill="#e0c5a0" d="M389 709h816v20H389z"/>${stoneWindow(462,374,226,237)}<path fill="#e0c5a0" d="M555 611v-244h12v244zM611 611V367h12v244z"/>${bays}<path fill="#ad9271" d="M352 724V412h46v312zM747 724V413h36v311z"/><path fill="#ddc39b" d="M346 412l29-68 29 68zM740 413l27-64 25 64z"/><path fill="#455452" d="M524 724v-81q55-69 109 0v81z"/>`;
    return paving()+(close?`<g transform="translate(-75 -87) scale(1.12)">${face}</g>`:face)+streetTree(close?1280:275,849,.72,5073);
  };
  const rylands = close => {
    let lancets='';for(let i=0;i<5;i++)lancets+=stoneWindow(633+i*69,508,38,126);
    const face=`<path fill="#a78170" d="M458 737V339h106v398zM1020 737V339h106v398zM564 737V415h456v322z"/><path fill="#be9a7d" d="M446 350v-22l63-110 68 110v22zM1006 350v-22l68-110 67 110v22z"/><path fill="#d3b093" d="M568 419l224-178 224 178z"/><path fill="#b28b70" d="M588 421h408v58H588z"/>${lancets}${stoneWindow(481,384,62,188)}${stoneWindow(1041,384,62,188)}<path fill="#5d5e5b" d="M727 737v-83q64-88 130 0v83z"/><circle cx="792" cy="362" r="39" fill="#637984"/><path stroke="#d7bb9b" stroke-width="7" d="M753 362h78M792 323v78M765 335l54 54M765 389l54-54"/><path fill="none" stroke="#d2b295" stroke-width="8" d="M454 604h115M1014 604h117M584 485h416M575 642h435"/>`;
    return paving()+(close?`<g transform="translate(-213 -62) scale(1.18)">${face}</g>`:face)+streetTree(close?1320:270,858,.65,5090);
  };
  const whitworthGallery = dusk => {
    let panes='';for(let i=0;i<12;i++)panes+=`M${540+i*55} 484v202`;
    return `<path fill="#849a6d" d="M-160 633H1760V900H-160z"/><path fill="#bbad91" d="M-160 900q782-217 1920-82v82z"/><path fill="#a7765f" d="M404 709V463h396v246z"/><path fill="#675d54" d="M382 464l100-76h231l107 76z"/>${glazed(548,486,661,201,12,4)}<path fill="#b19e7e" d="M537 476h686v16H537zM537 688h686v18H537z"/><path fill="none" stroke="#686e5e" stroke-width="4" d="${panes}"/>${streetTree(dusk?310:1250,856,1.06,5101)}${streetTree(dusk?1270:264,760,.62,5110)}${meadow(5113,20,50,550,805,886,['#d9cbaa','#9eabb0'])}`;
  };
  const castlefield = close => {
    let braces='';for(let i=0;i<12;i++)braces+=`M${210+i*98} 407l98 104M${210+i*98} 511l98-104`;
    return `<path fill="#947961" d="M-160 710V578h1920v132z"/>${town(5121,665,'#9f7863')}<path fill="#668e98" d="M-160 710H1760V900H-160z"/>${shimmer(5122,40,-160,1760,730,895,'#d5e3d8',42)}<g${close?' transform="translate(-185 -65) scale(1.15)"':''}><path fill="#677a74" d="M-160 401H1760v14H-160zM-160 509H1760v23H-160z"/><path fill="none" stroke="#526963" stroke-width="8" d="${braces}"/><path fill="#7b897d" d="M387 532h32v256h-32zM1130 532h32v256h-32z"/><path fill="#a09a7a" d="M374 785h61v21h-61zM1117 785h61v21h-61z"/>${grass(5123,38,150,1420,401,48,'#6f8761')}</g><path fill="#b2a082" d="M-160 900l413-133 63 14-251 119z"/>${mv('ukbob',{ad:'5s',dy:'3px'},boat(close?1040:713,822,close?.78:.58,'#5b6873'))}`;
  };
  const stanage = detail => {
    let strata='';for(let i=0;i<5;i++)strata+=`M${400+i*55} ${578+i*33}q385-32 780 17`;
    const mill=`<ellipse cx="532" cy="842" rx="125" ry="28" fill="#495744" opacity=".25"/><path fill="#9c9b84" fill-rule="evenodd" d="M630 760a99 99 0 1 0-198 0 99 99 0 1 0 198 0M550 760a19 19 0 1 1-38 0 19 19 0 1 1 38 0"/><path fill="none" stroke="#c9c0a2" stroke-width="5" d="M449 734q17-74 94-59"/>`;
    return ridge('#839376',640,91,5,5151)+`<path fill="#969274" d="M370 802l56-265 209-30 30-32 312 23 108 38 313 4-44 91-123 7-47 83-269-6-22 85z"/><path fill="#bcb396" d="M426 537l209-30 30-32 312 23 108 38 313 4-30 29-302-8-97-31-308-22-25 32-212 31z"/><path fill="none" stroke="#736f59" stroke-width="8" d="${strata}"/><path fill="#7b8359" d="M-160 900V792q611-104 1920 34v74z"/>${detail?mill:grass(5154,55,40,1500,894,83,'#727447')}${detail?grass(5156,32,920,1600,900,65,'#727447'):`<g transform="translate(290 334) scale(.58)">${mill}</g>`}`;
  };
  const mamTor = detail => {
    let stones='';for(let i=0;i<13;i++){const y=651+i*19,x=917-(i*i*1.65),w=15+i*4;stones+=`M${x} ${y}l${w} 4-4 9-${w} -3z`;}
    return ridge('#859895',594,89,6,5171)+ridge('#6d8775',694,95,5,5172)+`<path fill="#9a9f69" d="M-160 900V793Q391 647 730 658L971 497l187 138 602 122V900z"/><path fill="#89906b" d="M971 497l187 138 602 122v143H994l-129-90 79-109z"/><path fill="#c3bda0" d="M667 900Q763 765 939 651l32-154 13 9-27 161Q821 782 801 900z"/><path fill="#969989" stroke="#ded5b7" stroke-width="2" d="${stones}"/><path stroke="#5f7159" stroke-width="3" fill="none" d="M800 860l65-129 65-69"/>${detail?`<path fill="#99917a" d="M240 876l52-94 63-13 75 39-9 69z"/><path fill="#c1b99a" d="M292 782l63-13 75 39-90 7z"/>${grass(5179,30,50,610,900,113,'#807d4d')}`:meadow(5181,23,40,540,817,893,['#d3bd83','#b5b798'])}`;
  };
  const studies = [
    ['south-yorkshire','Sheffield','diamond','The Diamond','signature',diamond,['university','engineering','lattice'],'The engineering building across its forecourt','A closer study of the diamond lattice'],
    ['south-yorkshire','Sheffield','arts-tower','Arts Tower','landmark',artsTower,['university','modernism','tower'],'The slender tower and lower library wing','Evening light through the curtain wall'],
    ['south-yorkshire','Sheffield','winter-garden','Sheffield Winter Garden','landmark',winterGarden,['glasshouse','timber','plants'],'The timber arches across the city square','Closer to the planted glasshouse ribs'],
    ['south-yorkshire','Sheffield','kelham','Kelham Island Museum','heritage',kelham,['industry','steel','museum'],'The museum and its industrial silhouettes','The Bessemer converter in the foreground'],
    ['greater-manchester','Manchester','whitworth-hall','Whitworth Hall','signature',whitworthHall,['university','gothic','hall'],'The Gothic hall across its forecourt','The traceried window and entrance at dusk'],
    ['greater-manchester','Manchester','john-rylands','John Rylands Library','landmark',rylands,['university','library','gothic'],'The turreted library frontage','The rose window and stonework at dusk'],
    ['greater-manchester','Manchester','whitworth-gallery','The Whitworth','heritage',whitworthGallery,['university','gallery','park'],'Glass galleries facing the park trees','Evening light beneath the park canopy'],
    ['greater-manchester','Manchester','castlefield','Castlefield Viaduct','heritage',castlefield,['canal','ironwork','garden'],'Iron latticework above the canal','A closer view of the planted viaduct'],
    ['derbyshire','Castleton','stanage-edge','Stanage Edge','landscape',stanage,['gritstone','moorland','millstones'],'Gritstone ledges above the moor','A discarded millstone below the edge'],
    ['derbyshire','Castleton','mam-tor','Mam Tor','signature',mamTor,['peak district','ridge','landscape'],'The stepped path along the ridge','Foreground stone and the ridge at dusk'],
  ];
  for(let v=0;v<2;v++) for(let i=0;i<studies.length;i++) {
    const [county,town,place,label,kind,draw,tags,wide,close]=studies[i];
    const geo=place==='stanage-edge'?{ukLat:53.347,ukLon:-1.632}:place==='mam-tor'?{ukLat:53.349,ukLon:-1.810}:{};
    add(county,v&&kind==='signature'?'landmark':kind,Object.assign({id:place+(v?'-2':''),label,site:label+' — '+(v?close:wide),colour:county==='derbyshire'?'green':'slate',tags,
      ukPlace:place,ukTown:town,ukLocality:county==='derbyshire'?'Peak District':town,ukView:v?'close-evening':'wide',viewReason:v?close:wide,
      svg:()=>vista(5200+i*23+v,()=>draw(!!v),{path:false,flat:county!=='derbyshire',edgeNear:true,y:730,time:v?'dusk':'day'})},geo));
  }
  const css = [
    /* the evening grade: dark theme, or the time of day the opening asks for (71-anim-wire.css lays the same on the splash) */
    '.anim-scene.ap-full .hx-tint { fill: #4a4f94; mix-blend-mode: multiply; opacity: 0; pointer-events: none; }',
    '.anim-scene.ap-full .hx-lit { fill: #ffd27a; stroke: #ffd27a; opacity: 0; }',
    '.anim-scene.ap-full .hx-star { opacity: 0; }',
    '.anim-scene.ap-full .hx-evening .hx-lit { opacity: .88; }',
    '.anim-scene.ap-full .hx-evening .hx-tint { opacity: .28; }',
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

  animRegisterPack({id:'uk-north-west',name:'UK: Northern cities & Peaks',version:'1.0.0',description:'Sheffield, Manchester and nearby Peak District landscapes. Twenty animated place studies with university architecture and industrial heritage.',css,items});
})();
