/* ============================================================
   ANIMATION PACK "uk-south-east" (v2.4, UK batches 2 and 3).
   PURE classic script, the same manifest and quality gate as
   72-anim-pack-uk-south-west.js (docs/dev/UK_PACK.md). Opt-in like every UK
   pack: the items play only when the detected county (71-uk-counties.js,
   offline) is theirs.
   All nine South East counties and Greater London have FULL-VIEWPORT scenes (item.full: a 1600 x 900
   drawing, preserveAspectRatio slice, so it fills any screen edge to edge):
   the opening sequence shows the user's location over a nearby scene
   (78-anim-wire.js), and the gallery and the animation-of-the-day card show
   them large. Each scene is layered: a sky gradient and its light, far /
   mid / near layers that drift at different speeds (parallax), and ambient
   life (birds, clouds, water shimmer, steam, smoke). The four files contain 184 scenes with
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
  const NAMES = { hampshire: 'Hampshire', kent: 'Kent', 'east-sussex': 'East Sussex', 'west-sussex': 'West Sussex', surrey: 'Surrey', 'isle-of-wight': 'Isle of Wight', berkshire: 'Berkshire', oxfordshire: 'Oxfordshire', buckinghamshire: 'Buckinghamshire', 'greater-london': 'Greater London' };
  /** One county element. months: only in those months (a dated tradition). */
  const add = (county, kind, o) => {
    const months = o.months || null;
    const area = ukCounty(county), region = area.region;
    items.push(Object.assign({
      slot: 'opening', mood: 'calm', intensity: 'subtle', theme: 'any', season: 'any', region: [NATION], reduced: 'static', priority: 1, full: true,
      county, ukRegion: region, ukKind: kind, signature: kind === 'signature', site: o.label,
      when: (day, ctx) => !!ctx && ctx.county === county && (!months || months.includes(+String(day).slice(5, 7))),
    }, o, {
      id: county + '-' + o.id,
      label: o.label + ', ' + NAMES[county],
      tags: ['uk', region.replace(/-/g, ' '), NAMES[county].toLowerCase(), kind].concat(o.tags || []),
      when: (day, ctx) => !!ctx && !!ctx.county && (!months || months.includes(+String(day).slice(5, 7))) && (!o.ukSeason || o.ukSeason === animSeasonOf(day)) && (ctx.county === county || (!!o.ukTown && animUkScenePools([{county,ukTown:o.ukTown}], ctx).nearby.length > 0)),
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
    const g = U(), r = rnd(R(x * 7 + y)), shape = Math.abs(Math.round(x+y+(del||0)))%3; let puffsD = '';
    // Broad banks, tall cumulus and broken small puffs have different profiles.
    // The original light and drift supplied by each drawing remain authoritative.
    const n=shape===2?4:6, stretch=shape===0?1.4:shape===1?.78:1;
    for (let i = 0; i < n; i++) { const px=x+(-120+i*240/(n-1)+r()*20)*s*stretch, pr=(25+r()*43)*s*(shape===1&&i===2?1.85:1); puffsD+=`<ellipse cx="${R(px)}" cy="${R(y-pr*(shape===0?.3:.63))}" rx="${R(pr*(shape===0?1.6:1))}" ry="${R(pr*(shape===0?.58:1))}"/>`; }
    return `<defs>${linU(g, [[0, top || '#fff'], [0.55, top || '#fff'], [1, tone]], 0, R(y - 110 * s), 0, R(y + 24 * s))}</defs>`
      + mv('ukdrift', { ad: (dur || 46) + 's', d: -(del || 0) + 's', dx: R(60 + s * 40) + 'px' }, `<g opacity="${op || 0.92}" fill="url(#${g})"><ellipse cx="${x}" cy="${y}" rx="${R((shape===0?230:shape===1?134:170)*s)}" ry="${R(19*s)}"/>${puffsD}</g>`);
  };
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
      const pose=(seed+i)%3, wing=pose===0?`M${bx-R(20*s)} ${by-R(5*s)}q${R(10*s)} ${-R(15*s)} ${R(20*s)} ${R(5*s)}q${R(10*s)} ${-R(20*s)} ${R(22*s)} ${-R(4*s)}`:pose===1?`M${bx-R(23*s)} ${by-R(8*s)}l${R(18*s)} ${R(9*s)}q${R(6*s)} ${R(4*s)} ${R(13*s)} 0l${R(17*s)} ${-R(12*s)}`:`M${bx-R(25*s)} ${by+R(2*s)}q${R(14*s)} ${-R(8*s)} ${R(25*s)} 0q${R(12*s)} ${-R(11*s)} ${R(26*s)} ${-R(3*s)}`;
      o += mv('ukglide', { ad: R(16 + r() * 10) + 's', d: -R(r() * 14) + 's', dx: (dx || 520) + 'px', dy: R(-40 + r() * 60) + 'px' },
        mv('ukflap', { ad: (0.5 + r() * 0.4).toFixed(2) + 's', d: -(r()).toFixed(2) + 's' },
          `<path fill="none" stroke="${col}" stroke-width="${(2.7*s).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" d="${wing}M${bx} ${by-2}l${R(2*s)} ${R(6*s)}"/>`));
    }
    return o;
  };
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
    const patch = (cx,cy,rx,ry,n) => {
      const points=Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,k=.72+r()*.5;return [R(cx+Math.cos(a)*rx*k),R(cy+Math.sin(a)*ry*k)];});
      let d=`M${R((points[0][0]+points[n-1][0])/2)} ${R((points[0][1]+points[n-1][1])/2)}`;
      for(let i=0;i<n;i++){const q=points[(i+1)%n];d+=`Q${points[i][0]} ${points[i][1]} ${R((points[i][0]+q[0])/2)} ${R((points[i][1]+q[1])/2)}`;}
      return d+'z';
    };
    const width=(230+r()*40)*s, cy=y-h-8*s;
    const depth=U();
    let crown=`<defs>${linU(depth,[[0,mid],[.7,dark]],x-width,cy-100*s,x+width,cy+140*s)}</defs><path fill="url(#${depth})" d="${patch(x,cy,width,158*s,20)}"/>`,middle='',lights='',leaves='';
    for(let i=0;i<3;i++){const xx=x+(i-1)*100*s+(r()-.5)*35*s,yy=cy+(-55+r()*95)*s;middle+=patch(xx,yy,(60+r()*30)*s,(55+r()*28)*s,7);}
    for(let i=0;i<2;i++){const xx=x+(-150+r()*265)*s,yy=cy-(40+r()*60)*s;lights+=patch(xx,yy,(30+r()*17)*s,(20+r()*14)*s,6);}
    for(let i=0;i<8;i++){const xx=R(x+(-160+r()*320)*s),yy=R(cy+(-96+r()*130)*s);leaves+=`M${xx} ${yy}q${R(8*s)} ${R(-5*s)} ${R(15*s)} 0`;}
    crown+=`<path fill="${mid}" opacity=".65" d="${middle}"/><path fill="${lite}" opacity=".55" d="${lights}"/><path fill="none" stroke="${lite}" opacity=".45" stroke-width="${R(3*s)+1}" d="${leaves}"/>`;
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
      return svg(`<defs>${lin(s1, [[0, '#6f97cf'], [0.45, '#b9cde2'], [0.72, '#f7dcae'], [0.86, '#ffd08a'], [1, '#f6b878']])}${linU(g1, [[0, '#9aa553'], [1, '#316f44']], 0, 680, 0, 900)}${linU(h1, [[0, '#a07a98'], [1, '#6e5a5c']], 0, 590, 0, 690)}${radU(l1, [[0, '#ffe2a0', 0.55], [1, '#ffe2a0', 0]], 800, 520, 700)}</defs>`
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
      return svg(`<defs>${lin(s1, [[0, '#438fc9'], [0.6, '#b9d0e6'], [1, '#f3e1bf']])}${lin(w1, [[0, st1], [1, st2]])}${lin(l1, [[0, '#80b85b'], [1, '#32794a']])}</defs>`
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
      return svg(`<defs>${lin(s1, [[0, '#29507f'], [0.42, '#7d9fcb'], [0.7, '#e9c2b0'], [0.86, '#f7c08e'], [1, '#f6a874']])}${lin(sea, [[0, '#599fca'], [0.4, '#266f9e'], [1, '#164b70']])}${lin(s2, [[0, '#fff'], [1, '#fff']])}</defs>`
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
      return svg(`<defs>${lin(s1, [[0, '#3b91c9'], [0.65, '#c4d9ea'], [1, '#f0e6cf']])}${lin(f1, [[0, '#b0c66e'], [1, '#649f50']])}${lin(f2, [[0, '#cfb46a'], [1, '#a68a44']])}</defs>`
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
      return svg(`<defs>${lin(s1, [[0, '#55b5d3'], [1, '#e9f0ee']])}${linU(w1, [[0, '#70d1c5'], [0.45, '#269d94'], [1, '#135968']], 0, 276, 0, 900)}${lin(b1, [[0, '#cbb88e'], [1, '#8c7a58']])}${lin(ray, [[0, '#fff', 0.5], [1, '#fff', 0]])}${lin(ft, [[0, '#4f4a2a'], [0.45, '#9a8a4a'], [0.7, '#d8c58a'], [1, '#efe4bc']])}</defs>`
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
      return svg(`<defs>${lin(s1, [[0, '#3d9acd'], [0.7, '#cfe2ee'], [1, '#f1f2e4']])}${lin(w1, [[0, '#bfe6de'], [1, '#6cb2a8']])}</defs>`
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

  /* ---------- shared framing for the remaining South East counties ----------
     These are drawing helpers, not new registry or opening behaviour. All
     moving ground bands extend from -160 to 1760. Subjects stay in the
     central 1200 units; each render owns every gradient and reflection id. */
  const arch = (x, y, w, h, stone) => `<path fill="#394855" d="M${x} ${y + h}V${y + w / 2}Q${x + w / 2} ${y - w / 2} ${x + w} ${y + w / 2}V${y + h}z"/>${lit(x + 4, y + w / 2, w - 8, h - w / 2)}<path fill="none" stroke="${stone || '#d4c7aa'}" stroke-width="3" d="M${x + w / 2} ${y + 8}V${y + h}M${x} ${y + h * .64}H${x + w}"/>`;
  const lancet = (x,y,w,h,stone) => {
    const glass=U(),d=`M${x} ${y+h}V${y+w*.65}Q${x} ${y+w*.2} ${x+w/2} ${y}Q${x+w} ${y+w*.2} ${x+w} ${y+w*.65}V${y+h}z`;
    return `<defs>${linU(glass,[[0,'#39859a'],[.55,'#31647d'],[1,'#6f92ab']],x,y,x+w,y+h)}</defs><path fill="url(#${glass})" stroke="${stone||'#ddd0b3'}" stroke-width="4" d="${d}"/><path class="hx-lit" d="${d}"/><path fill="none" stroke="${stone||'#ddd0b3'}" stroke-width="2" d="M${x+w*.33} ${y+h}V${y+w*.8}q0-${w*.4} ${w*.17}-${w*.48}q${w*.17} ${w*.08} ${w*.17} ${w*.48}V${y+h}M${x+3} ${y+h*.66}h${w-6}M${x+w/2} ${y+w*.25}v${h-w*.25}"/>`;
  };
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
    const r = rnd(seed); let out = '', windows = '';
    for (let x = -160; x < 1760;) {
      const w=R(84+r()*61),h=R(47+r()*67),top=y-h,style=Math.floor(r()*3),wall=[colour,'#bd8e70','#d8c9a4','#8dabb0'][Math.floor(r()*4)],roof=['#657481','#8d5d4b','#5d6671'][style];
      const roofD=style===0?`M${x-5} ${top}l${R(w*.24)}-28h${R(w*.52+10)}l${R(w*.24)} 28z`:style===1?`M${x-5} ${top}l${R(w/2+5)}-37 ${R(w/2+5)} 37z`:`M${x-3} ${top-5}h${w+6}v10h-${w+6}z`;
      out+=`<path fill="${wall}" d="M${x} ${y}v-${h}h${w}v${h}z"/><path fill="#5a6164" opacity=".22" d="M${x+w-14} ${top}h14v${h}h-14z"/><path fill="${roof}" d="${roofD}"/><path fill="${wall}" d="M${x+12} ${top+2}v-38h12v38z"/><path stroke="#ddd1ba" stroke-width="2" d="M${x} ${top+5}h${w}"/>`;
      for(let row=0;row<(h>79?2:1);row++)for(let j=0;j<3;j++){const xx=x+16+j*(w-37)/3,yy=top+16+row*31;windows+=`M${R(xx)} ${yy}h12v19h-12z`;}
      out+=`<path fill="#45695e" d="M${x+R(w*.46)} ${y}v-26h15v26z"/>`;
      x+=w+3+R(r()*11);
    }
    return out+`<path fill="#355b6e" stroke="#dddece" stroke-width="2" d="${windows}"/><path class="hx-lit" d="${windows}"/>`;
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
  // Irregular woodland silhouettes: uneven crowns and a lit canopy plane,
  // rather than the repeated row of identical semicircles in the old frame.
  const woodlandEdge = (seed,y,warm) => {
    const r=rnd(seed);let back=`M-160 ${y+120}V${y}`,front=`M-160 ${y+150}V${y+35}`,light='';
    for(let x=-160;x<1760;){const w=R(80+r()*140),h=18+r()*65,a=R(x+w*.23),b=R(x+w*.73),top=R(y-h);back+=`C${R(x+w*.08)} ${R(y+9)} ${R(x+w*.1)} ${top} ${a} ${top}Q${R(x+w*.37)} ${R(top-17)} ${R(x+w*.54)} ${R(top+7)}Q${b} ${R(top-5)} ${R(x+w*.88)} ${R(y-4)}L${x+w} ${R(y+r()*12)}`;front+=`C${x+R(w*.14)} ${R(y-h*.4)} ${x+R(w*.49)} ${R(y-h*.48)} ${x+R(w*.6)} ${R(y+18)}Q${x+R(w*.8)} ${R(y+4)} ${x+w} ${R(y+35)}`;light+=`M${a} ${R(top+9)}q${R(w*.16)}-10 ${R(w*.32)} 5`;x+=w;}
    return `<path fill="${warm?'#716d8b':'#579f91'}" d="${back}V${y+150}H-160z"/><path fill="${warm?'#525d79':'#2e796c'}" d="${front}V${y+150}H-160z"/><path fill="none" stroke="${warm?'#b08d9d':'#92c999'}" stroke-width="7" stroke-linecap="round" opacity=".5" d="${light}"/>`;
  };
  const placeAtmosphere = (name, seed, o = {}) => {
    name = name || ({301:'canterbury-cathedral',322:'hop-harvest',341:'brogdale-orchard',361:'chatham-docks',401:'seven-sisters',461:'hastings-festival',481:'hastings-coast',501:'net-shops',521:'arundel-castle',561:'ardingly-show',581:'nutbourne-vines',601:'goodwood',621:'box-hill',681:'shere-gardens',701:'denbies',721:'brooklands',741:'needles',801:'garlic-festival',821:'mersley',841:'cowes',861:'windsor-castle',901:'hocktide',921:'eton',941:'dorney',961:'radcliffe-camera',1021:'bampton-morris',1041:'banbury',1061:'henley',1081:'waddesdon-manor',1141:'olney-pancake',1161:'aylesbury-orchard',1181:'bletchley',1201:'london-bridge',1261:'london-canal',1281:'london-docks',1301:'london-market',1321:'wimbledon',1341:'london-greenwich'}[seed] || 'countryside');
    const warm = o.time === 'dusk' || o.time === 'dawn', r = rnd(seed + 871), y = o.y || o.horizon || 680;
    const marine = o.coast, urban = /london|st-pauls|camera|cathedral|market|hocktide|morris|pancake/.test(name);
    const garden = o.lawn || /garden|manor|pavilion|orchard|abbey/.test(name);
    const skies = marine ? [['#287db9','#90dce1','#fff1ca'],['#246eaa','#9dc9e5','#f8eadb'],['#167d9d','#86d5d0','#ffdeb0']]
      : urban ? [['#497bbf','#aacde6','#ffdeb9'],['#355d9f','#aabedc','#f8e7d8'],['#526fad','#bed8d9','#fff0c8']]
      : garden ? [['#3b92bc','#b0e4db','#fff3cd'],['#3a77a6','#accfc3','#fff0b8'],['#597eb5','#c8d9df','#ffdfc7']]
      : [['#328db6','#b3dedd','#f7e8bd'],['#2a779b','#a0c8ca','#f5eac9'],['#627aac','#c2cdd6','#ffe2b4']];
    const skyColours = skies[Math.floor(r()*skies.length)];
    const sx = R(230 + r() * 1160), sy = R(warm ? 330 + r() * 160 : 110 + r() * 150), sr = R(30 + r() * 23);
    const airType = Math.floor(r() * 3), airSeed = Math.floor(r() * 900);
    const cloudPlans=Array.from({length:4},(_,i)=>[R(-90+i*470+r()*170),R(65+r()*235),.45+r()*.85,45+r()*35,-r()*24]);
    const air = () => airType === 0 ? cloudPlans.map(([x,yy,k,ad]) => streak(x,yy,170+k*150,warm?'#ffd9c5':'#edfaff',.24,ad)).join('')
      : airType === 1 ? cloud(cloudPlans[0][0],cloudPlans[0][1],1.15, warm ? '#e4aeb8' : '#e1f5f5', .72,77,airSeed%18) + cloud(...cloudPlans[2].slice(0,3),'#f0f8ed',.65,61,-12)
      : cloudPlans.slice(0,3).map(([x,yy,k,ad,d]) => cloud(x,yy,k,warm?'#f9c5b8':'#e3f5fb',.68,ad,d,warm?'#b99ec0':'#b2d4e3')).join('');
    const life = () => {
      if (marine) return mv('ukglide', {ad:'24s',d:'-7s',dx:'170px',dy:'-24px'}, `<g transform="translate(${R(260+r()*70)} 310)"><path fill="#fff8e3" d="M-38 8Q-15-30 0-3Q19-25 45 1L5 9z"/><path fill="#516878" d="M-38 8l20-22-9 22zM45 1L27-12l7 17z"/></g>`);
      if (urban && o.water) return mv('ukglide',{ad:'21s',d:'-8s',dx:'190px',dy:'-30px'},'<path fill="#f1f7ed" d="M1000 342q-30-32-54-6 29-12 54 14 26-29 58-15-27-27-58 7z"/>');
      if (urban) return [240,1360].map((x,i) => `<path stroke="#3e5966" stroke-width="5" d="M${x} 852V690"/><path fill="#3e5966" d="M${x-13} 693l13-20 13 20v28h-26z"/>${lit(x-8,696,16,21)}${mv('ukglow',{ad:`${5+i}s`},`<circle class="hx-lit" cx="${x}" cy="707" r="19" opacity=".12"/>`)}`).join('');
      if (garden) return [0,1,2].map(i => mv('ukflutter',{ad:`${7+i}s`,d:`-${i*2}s`},mv('ukflap',{ad:'.45s',to:'center'},`<g transform="translate(${380+i*440} ${690-i*49})"><path fill="${['#ffb443','#e778b2','#fff3c6'][i]}" d="M0 0C-35-32-39 12-9 8L0 0C35-32 39 12 9 8z"/><path stroke="#615349" stroke-width="3" d="M0-7v20"/></g>`))).join('');
      return mv('ukmist',{ad:'23s',dx:'55px'},haze(y-85,95,warm ? '#ffe6c8' : '#eff8dc',.24)) + birds(seed+19,2,190+seed%870,160+seed%100,'#35516a',.7,170);
    };
    return {sky:warm ? [[0,'#344b85'],[.42,'#af88bb'],[.78,'#ffa984'],[1,'#ffe6aa']] : [[0,skyColours[0]],[.55,skyColours[1]],[1,skyColours[2]]],sun:[sx,sy,sr],rays:airType===0,air,life,
      far: () => marine ? `<path fill="${warm ? '#ac9bac' : '#75b9cc'}" d="M-160 ${y-18}H1760V900H-160z"/>${haze(y-44,68,'#ffeacc',.23)}` : ridge(warm ? '#a688ad' : '#88b7b0',y-150,o.flat?18:55+seed%70,5+seed%4,seed+41)+haze(y-190,100,'#fff4df',.31),
      mid: () => marine ? `<path fill="#7296a7" opacity=".5" d="M${1250+seed%200} ${y-18}h62l-9 7h-43z"/>` : urban ? Array.from({length:19},(_,i)=>{const x=-160+i*105,h=42+(i*23+seed)%58;return `<path fill="${warm?'#7f7897':'#809ea9'}" d="M${x} ${y}v-${h}l46-17 51 17v${h}z"/><path stroke="${warm?'#d4a4ad':'#b4cece'}" stroke-width="4" stroke-dasharray="4 11" d="M${x+12} ${y-h+21}h72"/>`;}).join('') : woodlandEdge(seed+52,y-55,warm)};
  };
  const vista = (seed, subject, o = {}) => {
    const sky = U(), floor = U(), wash = U(), stone = U(), masonry = U(), roof = U();
    const warm = o.time === 'dawn' || o.time === 'dusk', autumn = o.autumn;
    // A place may supply its own sky, light, horizon and ambient choreography.
    // The place profile varies the atmosphere; a bespoke view can override it.
    const atmosphere = o.atmosphere || placeAtmosphere(o.art || '',seed,o), light = atmosphere.sun || [warm ? 1130 : 350, warm ? 465 : 180, warm ? 55 : 38];
    const sk = atmosphere.sky || (warm ? [[0, '#49598c'], [.35, '#b294b4'], [.7, '#f2b599'], [1, '#ffe6b4']] : [[0, '#648fb9'], [.5, '#bfd7df'], [1, '#f2ecd6']]);
    const water = o.water, y = o.y || 680;
    const palette = { stone: `url(#${masonry})`, shade: warm ? '#95785f' : '#a59980', roof: `url(#${roof})`, green: autumn ? '#a29047' : '#617d45' };
    const ground = water ? [[0, warm ? '#c99eb8' : '#6dc7d2'], [1, warm ? '#35476e' : '#216f89']] : [[0, autumn ? '#b4ad59' : '#88b968'], [1, autumn ? '#77703e' : '#32664a']];
    return `<g${o.time === 'dusk' ? ' class="hx-evening"' : ''}><defs>${lin(sky, sk)}${linU(floor, ground, 0, y, 0, 900)}${radU(wash, [[0, '#fff2c5', .26], [1, '#fff2c5', 0]], warm ? 1130 : 350, warm ? 480 : 180, 900)}${linU(stone, [[0, warm ? '#e6c298' : '#f0e3c8'], [.45, warm ? '#d1ac87' : '#ddd0b3'], [1, warm ? '#ba9876' : '#b9b096']], 200, 160, 1320, 750)}${linU(roof, [[0, '#6c797b'], [1, '#46505b']], 200, 250, 1400, 650)}<pattern id="${masonry}" width="64" height="28" patternUnits="userSpaceOnUse"><rect width="64" height="28" fill="url(#${stone})"/><path fill="none" stroke="#746956" stroke-width="1" opacity=".14" d="M0 0H64M0 14H64M0 28H64M32 0v14M12 14v14M56 14v14"/></pattern></defs>`
      + full(`url(#${sky})`) + stars(seed, 32, 280)
      + (atmosphere.light === false ? '' : atmosphere.light === 'moon' ? `<path fill="#e9f5dc" d="M${light[0]} ${light[1]-light[2]}a${light[2]} ${light[2]} 0 1 0 ${light[2]*.65} ${light[2]*1.76}a${light[2]*.84} ${light[2]*.84} 0 0 1 ${-light[2]*.65} ${-light[2]*1.76}z"/>` : sun(...light, '#fff4d8', '#ffdfa0') + (atmosphere.rays === false ? '' : rays(light[0], light[1], 1000, '#fff1c4', .13)))
      + (atmosphere.air ? atmosphere.air() : cloud(250, warm ? 215 : 160, 1.18, warm ? '#d4a6aa' : '#c7d5df', .8, 56, 9)
      + cloud(1330, 150, 1.35, warm ? '#d4a6aa' : '#c7d5df', .84, 67, 21)
      + streak(820, 84, 310, '#f8eeeb', .45, 75))
      + mv('ukpar', { ad: '44s', dx: '7px' }, atmosphere.far ? atmosphere.far() : o.coast ? `<path fill="${warm ? '#b6a4ad' : '#9bbec5'}" d="M-160 ${y - 16}H1760V900H-160z"/>${haze(y - 48, 70, '#f5e7d0', .25)}` : ridge(warm ? '#a291aa' : '#a3b5b2', 510, o.flat ? 14 : 100, 7, seed) + haze(460, 150, '#f5e7d0', .45))
      + mv('ukpar', { ad: '37s', dx: '15px' }, atmosphere.mid ? atmosphere.mid() : o.coast ? `<path fill="#7a959d" opacity=".6" d="M1410 ${y - 18}h65l-10 7h-48zM1440 ${y - 18}v-9h15v9z"/>` : canopy(warm ? '#6e7b83' : '#708b79', 585, 33, seed + 1, null, null, 760, '#a4b195'))
      + `<rect x="-160" y="${y}" width="1920" height="${900 - y}" fill="url(#${floor})"/>`
      + (o.lawn ? lawn(y) : '')
      + mv('ukpar', { ad: '32s', dx: '23px' }, subject(palette))
      + (water ? shimmer(seed + 8, 48, -100, 1740, y + 15, 895, warm ? '#ffe3be' : '#d5eef0', 55) : o.path === false ? '' : `<path fill="#d8ccb0" d="M650 900Q770 770 960 ${y}h25Q820 795 820 900z"/>`)
      + (atmosphere.life ? atmosphere.life() : atmosphere.birds === false ? '' : birds(seed + 5, 5, 740, 230, '#394452', 1, 370))
      + mv('ukpar', { ad: '27s', dx: '34px' }, o.art === 'st-pauls' ? `<path fill="#8b9b9d" d="M-160 900v-32l190-12 170 44zM1310 900l190-52 260 18v34z"/><path stroke="#d7d0c1" stroke-width="4" d="M-160 890l180-20 154 30M1360 900l138-38 262 19"/>` : water || o.edgeNear ? `<path fill="#a9987b" d="M-160 900v-28Q120 802 380 900zM1300 900q250-85 460-50v50z"/>${grass(seed + 6, 30, -160, 280, 900, 85, '#64714a')}${grass(seed + 7, 30, 1370, 1760, 900, 65, '#4a6347')}` : ridge(autumn ? '#71663e' : '#405b33', 900, 25, 8, seed + 3) + grass(seed + 6, 65, -160, 1760, 900, 48, '#3c5833') + meadow(seed + 7, 18, -160, 1760, 850, 900, autumn ? ['#eac277', '#eee0b9'] : ['#f8edcc', '#d3b75e']))
      + `<rect width="1600" height="900" fill="url(#${wash})"/>` + finish() + '</g>';
  };
  /** Two considered variants of one subject, preserving its county/kind. */
  const pair = (county, kind, id, label, colour, tags, drawing, opts) => {
    const seed = [...(county + id)].reduce((a, c) => a + c.charCodeAt(0), 0);
    add(county, kind, { id, label, site: label, colour, tags, svg: () => vista(seed, drawing, Object.assign({art:id},opts)) });
    add(county, kind, { id: id + '-2', label: label + ' at dusk', site: label + ' at dusk', colour, mood: 'dreamy', tags, svg: () => vista(seed, drawing, Object.assign({art:id}, opts, { time: 'dusk' })) });
  };

  /* ---------- Kent: eight subjects and views ----------
     Canterbury Cathedral — Bell Harry tower and the long Gothic nave identify the county.
     Leeds Castle — the two stone islands and bridge are its defining outline.
     Leeds Castle at dusk — reflected towers catch the evening light.
     White Cliffs of Dover — chalk headlands above the Channel, with flint bands.
     White Cliffs at dusk — a warmer view of the same coastal geology.
     Hop harvest in the Weald — tall hop poles and white-cowled oasts mark a real late-summer custom.
     Brogdale orchards — the National Fruit Collection preserves Kent's fruit-growing heritage.
     Chatham Historic Dockyard — the long timber covered slips preserve shipbuilding history.
     Sources: visitkent.co.uk/visit-kent-blog/its-good-to-be-green/
     visitkent.co.uk/visit-kent-blog/flavours-of-summer
     nationaltrust.org.uk/visit/kent/the-white-cliffs-of-dover */
  const canterbury = (p) => {
    let windows = '';
    for (let i = 0; i < 9; i++) windows += lancet(420 + i * 70, 420, 32, 95, p.stone) + `<path fill="${p.shade}" d="M${402 + i * 70} 640v-135h10v135z"/>`;
    return `<path fill="${p.stone}" d="M340 640V406l66-66 65 66h669v234z"/><path fill="${p.roof}" d="M460 415l24-48h637l36 48z"/>${windows}`
      + `<path fill="${p.stone}" d="M750 640V225h148v415z"/><path fill="${p.shade}" d="M878 225h20v415h-20z"/>${battlements(744, 225, 160, p.stone)}${lancet(770, 265, 36, 90, p.stone)}${lancet(838, 265, 36, 90, p.stone)}`
      + `<path fill="${p.shade}" d="M742 640V214h12V640zM888 640V214h12V640z"/><path fill="${p.stone}" d="M734 216l14-45 14 45zM880 216l14-45 14 45z"/>`
      + `<path fill="${p.stone}" d="M280 640V345h76v295zM360 640V345h76v295z"/>${battlements(276, 345, 80, p.stone)}${battlements(356, 345, 80, p.stone)}${lancet(300, 388, 34, 74)}${lancet(380, 388, 34, 74)}`
      + `<path fill="${p.roof}" d="M1040 412l75-52 110 85v15H1040z"/><path fill="${p.stone}" d="M1080 640V460h165v180z"/>${lancet(1140, 472, 48, 115)}`
      + `<path fill="#ded0ad" d="M250 650h1040v18H250z"/>${oak(1250, 680, .58, '#354d38', '#577044', '#8fa160', 321)}`;
  };
  add('kent', 'signature', { id: 'canterbury-cathedral', label: 'Canterbury Cathedral', site: 'Canterbury Cathedral, the Precincts', colour: 'slate', tags: ['canterbury', 'cathedral', 'gothic'], svg: () => vista(301, canterbury, { lawn: true }) });
  const leeds = (p) => {
    const id = U();
    const tower = (x, y, w, h) => `<path fill="${p.stone}" d="M${x} 660V${y}h${w}v${h}z"/>${battlements(x - 4, y, w + 8, p.stone)}${arch(x + 18, y + 42, 24, 53)}<path fill="${p.shade}" d="M${x + w - 12} ${y}h12V660h-12z"/>`;
    return `<path fill="#557245" d="M260 674q260-75 470-15 320-66 630 8v33H260z"/><g id="${id}"><path fill="${p.stone}" d="M360 660V440h320v220zM930 660V400h280v260z"/>${tower(340, 390, 90, 270)}${tower(600, 390, 90, 270)}${tower(930, 350, 76, 310)}${tower(1160, 350, 76, 310)}${sashes(440, 477, 3, 2, 50)}${sashes(1010, 440, 3, 2, 46)}<path fill="${p.shade}" d="M680 612q125-85 250 0v48h-26q-98-67-196 0h-28z"/></g>${reflect(id, 690, .24)}`;
  };
  pair('kent', 'landmark', 'leeds-castle', 'Leeds Castle', 'slate', ['castle', 'moat', 'maidstone'], leeds, { water: true });
  const dover = () => chalk('M-160 640V510Q130 340 420 390T820 390Q1000 410 1200 500L1360 655z', 390) + `<path fill="#7d9660" d="M-160 510Q130 340 420 390T820 390Q1000 410 1200 500l-20 15Q970 428 812 412T410 416Q90 390-160 550z"/><path fill="#abb8ae" opacity=".65" d="M420 420q100 90 20 222l70-5q55-140-12-213zM800 414q150 110 120 230l70 4q12-125-103-215z"/><path fill="#ecf3ed" opacity=".7" d="M-160 664q380-24 620 1t880 0v8H-160z"/>${sail(1240, 757, .38, 7)}`;
  pair('kent', 'landscape', 'white-cliffs', 'The White Cliffs of Dover', 'teal', ['dover', 'chalk', 'channel'], dover, { water: true, coast: true, y: 620 });
  const oasts = () => {
    let hops = '';
    for (let i = 0; i < 12; i++) { const x = 250 + i * 66; hops += `<path stroke="#80684c" stroke-width="6" d="M${x} 720V375"/><path fill="none" stroke="#63834a" stroke-width="15" stroke-dasharray="6 8" d="M${x + 10} 718Q${x - 14} 540 ${x + 12} 390"/>`; }
    let kilns = '';
    for (let i = 0; i < 3; i++) { const x = 1070 + i * 88; kilns += `<path fill="#ac694b" d="M${x} 690V485q40-20 80 0v205z"/><path fill="#744735" d="M${x - 8} 485l48-148 48 148z"/><path fill="#f3eee0" d="M${x + 20} 345q-5-45 25-55l30 14-26 6v35z"/>${lit(x + 31, 542, 20, 40)}`; }
    return mv('uksway2', { ad: '8s' }, hops) + `<path stroke="#80684c" stroke-width="3" d="M230 382H1040"/>${kilns}`;
  };
  add('kent', 'tradition', { id: 'hop-harvest', label: 'Hop harvest in the Weald', colour: 'green', months: [8, 9], tags: ['hops', 'weald', 'harvest'], svg: () => vista(322, oasts, { autumn: true, path: false }) });
  const orchard = () => {
    let out = '';
    for (let row = 0; row < 3; row++) for (let i = 0; i < 3; i++) {
      const x = 300 + i * 300 + row * 32, y = 600 + row * 92, k = .37 + row * .12;
      out += oak(x, y, k, '#36583b', '#648545', '#a2b55f', 340 + row * 4 + i);
      const r = rnd(348 + i + row); for (let j = 0; j < 9; j++) out += `<circle cx="${R(x - 80 * k + r() * 160 * k)}" cy="${R(y - 250 * k + r() * 110 * k)}" r="${R(8 * k)}" fill="${j % 2 ? '#c68542' : '#bd4e39'}"/>`;
    }
    return out + `<path fill="#986443" d="M720 800h100l-12 60h-78z"/><path stroke="#dfb47b" stroke-width="5" d="M726 816h87M731 833h79"/>`;
  };
  add('kent', 'food', { id: 'brogdale-orchards', label: 'Brogdale orchards', site: 'The National Fruit Collection, Brogdale', colour: 'green', tags: ['brogdale', 'orchard', 'fruit'], svg: () => vista(341, orchard, { autumn: true, path: false }) });
  add('kent', 'heritage', { id: 'chatham-slips', label: 'Covered slips at Chatham Historic Dockyard', colour: 'amber', tags: ['chatham', 'dockyard', 'shipbuilding'], svg: () => vista(361, () => {
    let ribs = ''; for (let i = 0; i < 12; i++) ribs += `<path fill="none" stroke="#795a3f" stroke-width="10" d="M${300 + i * 76} 710V420l38-82 38 82V710"/>`;
    return `<path fill="#9b8870" d="M270 710V420l460-138 470 138v290z"/><path fill="#5b6669" d="M244 424l486-166 496 166-20 20-476-138-465 138z"/>${ribs}<path fill="#34464e" d="M340 650h784l-82 65H408z"/><path fill="#c5b18d" d="M344 650h776v12H344z"/><path fill="none" stroke="#c9b38c" stroke-width="7" d="M300 430H1210M300 534H1210"/>${boat(760, 786, .66, '#6f4435')}`;
  }, { water: true, y: 710 }) });

  /* ---------- East Sussex: eight subjects and views ----------
     Seven Sisters — the seven chalk brows, seen across the coastal water.
     Royal Pavilion — Brighton's unmistakable onion domes and pierced arcade.
     Royal Pavilion at dusk — lantern-like windows beneath the domes.
     Cuckmere Haven — river meanders between grazing marsh and chalk slopes.
     Cuckmere Haven at dusk — a quiet reflected-sky variant.
     Hastings Jack in the Green — the leaf-covered May Day procession, without caricature.
     Hastings beach-launched catch — fishing boats and baskets on the working shingle.
     Hastings net shops — tall, narrow black timber sheds built to dry fishing gear.
     Sources: visit1066country.com; hastingstraditionaljackinthegreen.co.uk
     hastingshistory.net/hastings-net-shops; brightonmuseums.org.uk */
  const sisters = () => {
    let d = 'M-160 692V520', top = 'M-160 520';
    for (let i = 0; i < 7; i++) { const x = -160 + i * 180, yy = [472, 454, 449, 412, 428, 384, 397][i]; const seg = `Q${x + 64} ${yy - [54, 83, 61, 94, 68, 79, 50][i]} ${x + 180} ${yy}`; d += seg; top += seg; }
    d += 'L1280 650L1270 692z'; top += 'L1280 650';
    return chalk(d, 402) + `<path fill="none" stroke="#738b57" stroke-width="19" d="${top}"/><path fill="#f2f5ea" d="M-160 692q740-40 1430-11v12H-160z"/>${sail(1390, 762, .32, 4)}`;
  };
  add('east-sussex', 'signature', { id: 'seven-sisters', label: 'Seven Sisters', site: 'Seven Sisters, the Sussex coast', colour: 'teal', tags: ['chalk', 'coast', 'seven sisters'], svg: () => vista(401, sisters, { water: true, coast: true, y: 660 }) });
  const brighton = (p) => {
    const dome = (x, y, w, h) => `<path fill="${p.stone}" d="M${x - w} ${y}Q${x - w * 1.2} ${y - h * .48} ${x} ${y - h}Q${x + w * 1.2} ${y - h * .48} ${x + w} ${y}z"/><path fill="none" stroke="${p.shade}" stroke-width="3" d="M${x} ${y - h}Q${x - w * .46} ${y - h * .45} ${x} ${y}M${x} ${y - h}Q${x + w * .46} ${y - h * .45} ${x} ${y}"/><path stroke="${p.shade}" stroke-width="4" d="M${x} ${y - h}v-25"/>`;
    let out = `<path fill="${p.stone}" d="M340 680V490h920v190z"/>`;
    for (let i = 0; i < 15; i++) out += arch(367 + i * 58, 540, 32, 112, p.stone);
    out += `<path fill="${p.stone}" d="M665 490V370h270v120z"/>${dome(800, 378, 150, 198)}${dome(460, 490, 96, 124)}${dome(1140, 490, 96, 124)}`;
    for (const x of [340, 580, 640, 960, 1020, 1260]) out += `<path fill="${p.stone}" d="M${x - 10} 680V370h20v310z"/>${dome(x, 385, 27, 56)}`;
    return out + `<path fill="${p.shade}" d="M320 676h960v12H320z"/>${meadow(424, 35, 200, 1400, 740, 790, ['#dfad72', '#f2e1a4', '#d17b8b'])}`;
  };
  pair('east-sussex', 'landmark', 'royal-pavilion', 'Royal Pavilion, Brighton', 'amber', ['brighton', 'pavilion', 'domes'], brighton, { lawn: true });
  const cuckmere = () => `<path fill="#9bad72" d="M-160 610Q250 550 590 615T1760 570V900H-160z"/><path fill="#699079" d="M740 620Q370 650 820 706T610 795Q310 825 670 900H960Q370 814 844 788T1100 705Q600 642 890 620z"/><path fill="none" stroke="#cddcd0" stroke-width="5" d="M740 620Q370 650 820 706T610 795Q310 825 670 900"/><path fill="#dfe2d4" d="M1160 600V490q110-75 220-20t380 40v90z"/><path fill="none" stroke="#6f8a57" stroke-width="15" d="M1160 490q110-75 220-20t380 40"/>${shimmer(444, 28, 640, 900, 705, 850, '#dceee5', 38)}${grass(446, 35, 1000, 1300, 840, 60, '#506d3e')}`;
  pair('east-sussex', 'landscape', 'cuckmere-haven', 'Cuckmere Haven', 'green', ['cuckmere', 'river', 'marsh'], cuckmere, { path: false });
  const crowd = (seed, n, y, col) => {
    const r = rnd(seed); let out = '';
    for (let i = 0; i < n; i++) { const x = R(250 + r() * 1100), yy = y + R(r() * 25), k = .65 + r() * .35; out += `<g transform="translate(${x} ${yy}) scale(${k})"><circle cy="-45" r="8" fill="#65594c"/><path fill="${col[i % col.length]}" d="M-10-32q10-7 20 0l6 34h-32z"/><path stroke="#46515a" stroke-width="5" d="M-7 0v17M7 0v17"/></g>`; }
    return mv('ukbob', { ad: '5s', dy: '2px' }, out);
  };
  add('east-sussex', 'tradition', { id: 'jack-in-the-green', label: 'Hastings Jack in the Green', colour: 'green', months: [5], tags: ['hastings', 'may day', 'leaves'], svg: () => vista(461, () => terrace(462, 645) + crowd(463, 34, 775, ['#7d9660', '#d0ad6b', '#779595']) + mv('uksway2', { ad: '6s' }, `<path fill="#355e3b" d="M695 775Q650 660 750 494Q850 660 805 775z"/>${canopy('#739657', 590, 30, 467, 710, 790, 774)}<path fill="none" stroke="#b4c184" stroke-width="10" stroke-dasharray="5 14" d="M700 702q70-180 102 0"/>`) + meadow(465, 20, 620, 890, 810, 850, ['#f2e6bc', '#d4b76c'])) });
  add('east-sussex', 'food', { id: 'hastings-catch', label: 'The Hastings fishing catch', site: 'The Stade, Hastings', colour: 'teal', tags: ['hastings', 'fishing', 'seafood'], svg: () => vista(481, () => `<path fill="#c2af8d" d="M-160 735q780-100 1920 0v165H-160z"/>${boat(560, 760, 1.2, '#4b777b')}${boat(1110, 690, .66, '#9b5842')}<path fill="#a87b4e" d="M925 800h130l-10 70H936z"/><path fill="none" stroke="#d8b282" stroke-width="5" d="M931 818h119M934 838h114M944 800v69M970 800v69M997 800v69M1025 800v69"/><g fill="#c2d5d2">${[0, 1, 2, 3, 4].map(i => `<path d="M${939 + i * 21} 808q17-15 36 0-17 14-36 0l-8 7v-14z"/>`).join('')}</g>`, { water: true, coast: true, y: 610 }) });
  add('east-sussex', 'heritage', { id: 'net-shops', label: 'Hastings net shops', colour: 'slate', tags: ['hastings', 'net shops', 'timber'], svg: () => vista(501, () => {
    let out = `<path fill="#c7b89a" d="M-160 680H1760V900H-160z"/>`;
    for (let i = 0; i < 6; i++) { const x = 340 + i * 146, h = 220 + i % 3 * 55; out += `<path fill="#343b3a" d="M${x} 720V${720 - h}l58-70 58 70v${h}z"/><path fill="#202b2c" d="M${x + 80} ${720 - h + 3}h36V720h-36z"/><path fill="none" stroke="#6b7066" stroke-width="3" d="${Array.from({ length: 12 }, (_, j) => `M${x} ${720 - h + j * h / 12}h112`).join('')}"/><path fill="#192629" d="M${x + 33} 720v-90h48v90z"/><path fill="#7b877d" d="M${x + 23} ${650 - h}h30v35h-30z"/>`; }
    return out + `<path fill="none" stroke="#8b785d" stroke-width="4" opacity=".6" d="M350 794q100-45 220 0t250 0t260 0"/>${boat(1100, 810, .55, '#76513b')}`;
  }) });

  /* ---------- West Sussex: eight subjects and views ----------
     Arundel Castle — a hillside keep and dense crenellated skyline above the Arun.
     Chichester Cathedral — slender spire and detached medieval bell tower.
     Chichester Cathedral at dusk — lit lancets over the Close.
     West Wittering — broad tidal sand and grass-topped dunes.
     West Wittering at dusk — a reflected evening tide.
     South of England Show — Ardingly's June agricultural gathering.
     Nutbourne vineyard — south-facing vine rows, a real local wine landscape.
     Goodwood Motor Circuit — racing heritage with unbranded open-wheel silhouettes.
     Sources: seas.org.uk; nutbournevineyards.com/pages/the-vineyard
     goodwood.com/motorsport/goodwood-revival; chichestercathedral.org.uk */
  const arundel = (p) => {
    let out = `<path fill="#6b814e" d="M200 720q560-310 1240-10v70H200z"/><path fill="${p.stone}" d="M360 640V465h810v175z"/>`;
    for (let i = 0; i < 7; i++) { const x = 370 + i * 120, y = [370, 420, 345, 410, 385, 395, 435][i]; out += `<path fill="${p.stone}" d="M${x} 650V${y}h70v${650 - y}z"/>${battlements(x - 3, y, 80, p.stone)}${arch(x + 22, y + 40, 25, 60)}<path fill="${p.shade}" d="M${x + 60} ${y}h10V650h-10z"/>`; }
    return out + `<path fill="${p.stone}" d="M570 455V292q85-37 170 0v163z"/>${battlements(566, 292, 180, p.stone)}${arch(600, 320, 26, 60)}${arch(680, 320, 26, 60)}${sashes(450, 510, 9, 1, 70)}${oak(1300, 755, .6, '#304d38', '#617748', '#99aa67', 526)}`;
  };
  add('west-sussex', 'signature', { id: 'arundel-castle', label: 'Arundel Castle', site: 'Arundel Castle above the Arun', colour: 'slate', tags: ['arundel', 'castle', 'arun'], svg: () => vista(521, arundel, { water: true, y: 780 }) });
  const chichester = (p) => {
    let out = `<path fill="${p.stone}" d="M450 665V450h620v215z"/><path fill="${p.roof}" d="M420 454l62-69h556l60 69z"/>`;
    for (let i = 0; i < 9; i++) out += lancet(468 + i * 65, 490, 30, 113, p.stone);
    return out + `<path fill="${p.stone}" d="M790 665V340h112v325z"/><path fill="${p.shade}" d="M845 335L858 90l48 245z"/><path fill="${p.stone}" d="M790 340L858 90l-13 250z"/>${lancet(810, 380, 27, 80)}${lancet(859, 380, 27, 80)}<path fill="${p.stone}" d="M300 665V385h92v280z"/>${battlements(296, 385, 100, p.stone)}${lancet(324, 428, 40, 75)}<path fill="${p.shade}" d="M380 385h12V665h-12z"/><path fill="#c2b79b" d="M275 665h860v12H275z"/>`;
  };
  pair('west-sussex', 'landmark', 'chichester-cathedral', 'Chichester Cathedral', 'slate', ['chichester', 'spire', 'cathedral'], chichester, { lawn: true });
  const wittering = () => `<path fill="#e4d3aa" d="M-160 640Q650 610 1760 706V900H-160z"/><path fill="#a4c0bd" d="M-160 700Q480 664 1000 716T1760 720v35q-650-68-1920 10z"/>${shimmer(545, 35, -160, 1760, 700, 752, '#f7f1d5', 76)}<path fill="#cbb982" d="M1050 900q180-204 710-200v200z"/>${grass(546, 45, 1230, 1760, 840, 70, '#81894c')}${sail(450, 646, .3, 5)}<path fill="none" stroke="#bba982" stroke-width="4" d="M200 835q420-80 790-32"/>`;
  pair('west-sussex', 'landscape', 'west-wittering', 'West Wittering beach', 'teal', ['sand', 'dunes', 'wittering'], wittering, { water: true, coast: true, y: 595 });
  const showground = () => {
    let tents = ''; for (let i = 0; i < 5; i++) { const x = 300 + i * 230; tents += `<path fill="#eee8d4" d="M${x} 660v-75h170v75z"/><path fill="#f9f2df" d="M${x - 16} 585l101-85 101 85z"/><path fill="#acb0a0" d="M${x + 62} 660v-60h45v60z"/>`; }
    return tents + crowd(562, 30, 713, ['#88969a', '#b8895e', '#708655']) + `<path fill="none" stroke="#eee3c7" stroke-width="9" d="M280 806H1320M280 836H1320"/>${[340, 520, 700, 880, 1060, 1240].map(x => `<path stroke="#dfd1ae" stroke-width="10" d="M${x} 870V780"/>`).join('')}<g transform="translate(760 784) scale(.7)">${pony('#aa8358', '#866441', '#4c3b2c', false)}</g>`;
  };
  add('west-sussex', 'tradition', { id: 'ardingly-show', label: 'South of England Show', site: 'The South of England Show, Ardingly', colour: 'green', months: [6], tags: ['ardingly', 'agriculture', 'show'], svg: () => vista(561, showground) });
  const vines = (seed, withTower) => {
    let out = '';
    for (let i = 0; i < 9; i++) { const x = -180 + i * 240; out += `<path fill="#71894a" d="M${x} 900l${700 - x * .38}-285h16L${x + 130} 900z"/><path fill="none" stroke="#b0b375" stroke-width="9" stroke-dasharray="4 12" d="M${x + 64} 886L${710 + i * 16} 640"/>`; }
    out += `<path fill="none" stroke="#776548" stroke-width="6" d="M320 838v-80M650 818v-80M970 798v-80M1300 778v-80"/>`;
    if (withTower) out += `<path fill="#c4b79a" d="M1010 600V505h92v95z"/><path fill="#646650" d="M998 510l58-115 58 115z"/>${lit(1036, 534, 28, 40)}`;
    return out + grass(seed, 32, -160, 1760, 900, 35, '#425b32');
  };
  add('west-sussex', 'food', { id: 'nutbourne-vines', label: 'Nutbourne vineyard', colour: 'green', tags: ['nutbourne', 'vineyard', 'wine'], svg: () => vista(581, () => vines(584, true), { autumn: true, path: false }) });
  const racingCar = (x, y, k, col) => `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cy="16" rx="130" ry="12" fill="#243434" opacity=".3"/><circle cx="-80" r="27" fill="#303738"/><circle cx="84" r="27" fill="#303738"/><circle cx="-80" r="13" fill="#acb4b0"/><circle cx="84" r="13" fill="#acb4b0"/><path fill="${col}" d="M-115-8l38-24h78l60 12 64 22h-244z"/><path fill="#d3c3a0" d="M-12-34q24-18 38 4z"/><path stroke="#aaa99c" stroke-width="4" d="M-45-30h43"/></g>`;
  add('west-sussex', 'heritage', { id: 'goodwood-circuit', label: 'Goodwood Motor Circuit', colour: 'green', tags: ['goodwood', 'motorsport', 'circuit'], svg: () => vista(601, () => pavilion(600, 610, 360, '#d9d5c2') + `<path fill="#737b74" d="M-160 800q780-230 1920-10v95q-800-197-1920 10z"/><path fill="none" stroke="#eee5cb" stroke-width="6" d="M-160 825q780-225 1920-10"/>` + mv('ukpar', { ad: '12s', dx: '70px' }, racingCar(710, 745, 1.1, '#396950') + racingCar(1110, 792, .8, '#b3744b')) + crowd(605, 26, 655, ['#857359', '#5c7170', '#b5a07c']), { path: false }) });

  /* ---------- Surrey: eight subjects and views ----------
     Box Hill — layered chalk slopes and the wooded Mole valley.
     Leith Hill Tower — the distinctive eighteenth-century battlemented lookout.
     Leith Hill Tower at dusk — evening light over the canopy.
     Frensham Great Pond — sandy shore, heath and a broad freshwater surface.
     Frensham at dusk — a still golden reflection across the pond.
     Shere Open Gardens — the village's June opening of private cottage gardens.
     Denbies vines — the Dorking vineyard on the North Downs slopes.
     Brooklands banking — the banked concrete track preserves early motor racing.
     Sources: visitsurrey.com/explore/the-surrey-hills-aonb/
     surreycc.gov.uk/culture-and-leisure/countryside/sites/visitor-information/leith-hill
     shereopengardens.co.uk; brooklandsmuseum.com */
  const boxhill = () => ridge('#92a777', 580, 140, 5, 623) + `<path fill="#687e4c" d="M-160 900V710Q450 420 1060 710T1760 710v190z"/><path fill="#b9b481" d="M-160 900V802Q490 604 1050 785T1760 780v120z"/>${canopy('#4a6946', 760, 25, 625, -160, 690, 900)}<path fill="none" stroke="#e3dac0" stroke-width="14" d="M660 900Q540 814 1010 741T1420 769"/>${oak(1260, 788, .67, '#3d5939', '#6d8551', '#a4ad68', 626)}`;
  add('surrey', 'signature', { id: 'box-hill', label: 'Box Hill', site: 'Box Hill and the Mole valley', colour: 'green', tags: ['box hill', 'mole valley', 'downs'], svg: () => vista(621, boxhill, { path: false }) });
  const leith = (p) => `<path fill="#6f814a" d="M-160 780Q760 610 1760 770v130H-160z"/><path fill="${p.stone}" d="M660 720V310h240v410z"/><path fill="${p.shade}" d="M864 310h36v410h-36z"/>${battlements(650, 310, 260, p.stone)}${arch(742, 596, 68, 124)}${arch(750, 388, 46, 70)}<path fill="none" stroke="#b2a487" stroke-width="3" opacity=".7" d="${Array.from({ length: 18 }, (_, i) => `M662 ${326 + i * 21}H899`).join('')}"/>${oak(1150, 755, .62, '#39573a', '#657d48', '#9aac63', 646)}`;
  pair('surrey', 'landmark', 'leith-hill', 'Leith Hill Tower', 'slate', ['leith hill', 'tower', 'woodland'], leith);
  const frensham = () => canopy('#52764c', 585, 35, 663, null, null, 660, '#9bb47b') + `<path fill="#d3c39c" d="M-160 665q290-65 540 6L250 790H-160zM1250 900q220-145 510-160v160z"/>${oak(260, 661, .63, '#3b5941', '#667d4f', '#9cad73', 664)}${grass(665, 40, 1320, 1760, 840, 100, '#687942')}${shimmer(666, 35, 200, 1400, 680, 850, '#e1efe6', 48)}`;
  pair('surrey', 'landscape', 'frensham-pond', 'Frensham Great Pond', 'teal', ['frensham', 'pond', 'heath'], frensham, { water: true, y: 650 });
  const shere = () => `<path fill="#e5d5b8" d="M450 690V490h460v200z"/><path fill="#986647" d="M410 496l155-146h215l165 146z"/><path fill="#686957" d="M455 490h20v200h-20zM890 490h20v200h-20zM455 570h450v10H455z"/>${sashes(510, 520, 5, 2, 72)}<path fill="#6c5b44" d="M675 690V592h58v98z"/>${oak(1120, 748, .8, '#37533c', '#65824b', '#9eb96a', 683)}${meadow(684, 60, 280, 1350, 765, 850, ['#e6b666', '#ba79a5', '#eeede0', '#c36f65'])}<path fill="none" stroke="#d6c5a3" stroke-width="9" d="M300 855h360M840 855h480"/>`;
  add('surrey', 'tradition', { id: 'shere-gardens', label: 'Shere Open Gardens', colour: 'pink', months: [6], tags: ['shere', 'gardens', 'flowers'], svg: () => vista(681, shere) });
  add('surrey', 'food', { id: 'denbies-vines', label: 'Denbies vineyard', site: 'Vine rows below Box Hill, Dorking', colour: 'green', tags: ['dorking', 'vineyard', 'wine'], svg: () => vista(701, () => ridge('#95a36a', 625, 120, 6, 702) + vines(703, false) + pavilion(1050, 605, 260, '#e4d5bc'), { autumn: true, path: false }) });
  add('surrey', 'heritage', { id: 'brooklands-banking', label: 'Brooklands banking', colour: 'slate', tags: ['brooklands', 'weybridge', 'motorsport'], svg: () => vista(721, () => `<path fill="#b2b4a7" d="M-160 900V675Q520 550 1760 370V900z"/><path fill="#d0cdb9" d="M-160 688Q520 563 1760 383v28Q520 590-160 711z"/><path fill="none" stroke="#858f84" stroke-width="4" d="M-160 760Q520 610 1760 460M-160 824Q520 679 1760 522M300 625l270 275M690 557l350 343M1110 480l440 420"/>` + mv('ukpar', { ad: '18s', dx: '50px' }, racingCar(710, 716, 1.05, '#6d8666')) + grass(724, 40, -160, 480, 900, 60, '#4c643d'), { path: false }) });

  /* ---------- Isle of Wight: eight subjects and views ----------
     The Needles — three chalk stacks ending at the red-and-white lighthouse.
     Osborne — Italianate terraces and twin belvedere towers.
     Osborne at dusk — the towers warm above the garden.
     Freshwater Bay — chalk headlands framing a curved shingle inlet.
     Freshwater Bay at dusk — the bay and a quiet evening tide.
     Garlic Festival — Newchurch's annual August gathering, tents and harvest stalls.
     Mersley garlic fields — the island's established crop, shown growing rather than branded.
     Sailing at Cowes — the island's maritime sporting heritage, no club or sponsor marks.
     Sources: visitisleofwight.co.uk; english-heritage.org.uk/visit/places/osborne/
     garlicfestival.co.uk (third weekend in August); thegarlicfarm.co.uk */
  const needles = () => {
    let out = chalk('M-160 900V430q240-105 450 20L540 670l90 142z', 744)+`<path fill="#738b58" d="M-160 430q240-105 450 20l48 62q-320-115-498-44z"/>`;
    for (const [x, y, w, h] of [[590, 760, 190, 244], [815, 784, 168, 192], [1045, 804, 137, 139]]) {
      out += chalk(`M${x - w / 2} ${y}l25-${h * .35} 27-${h * .2} 13-${h * .42} 28-7 22 ${h * .36} 26 ${h * .13} 24 ${h * .4}z`, x)+`<path fill="#849fa4" opacity=".65" d="M${x + 8} ${y - h}l22 ${h * .36} 26 ${h * .13} 24 ${h * .4}v${h * .11}h-30l-23-${h * .55}z"/><path fill="none" stroke="#c2c7bc" stroke-width="3" d="M${x - w * .25} ${y - h * .12}l${w * .55}-10M${x - w * .18} ${y - h * .36}l${w * .45}-9M${x - w * .1} ${y - h * .57}l${w * .3}-8"/>${mv('ukglow',{ad:`${4+x%3}s`,d:`-${x%4}s`},`<path fill="none" stroke="#edfff1" stroke-width="5" opacity=".7" d="M${x-w*.6} ${y+7}q${w*.65} 17 ${w*1.3} 0M${x-w*.55} ${y+24}q${w*.5} 10 ${w*1.1} 0"/>`)}`;
    }
    return out + `<path fill="#b7c2b1" d="M1088 806l6-35 27-20 30 48 10 18z"/><g transform="translate(-140 0)"><path fill="#e7e6d6" d="M1220 800l8-146h36l8 146z"/><path fill="#b95543" d="M1224 724h44l2 34h-48zM1228 655h36v34h-38z"/><path fill="#9b4542" d="M1254 654h10l8 146h-12z"/><path fill="#41515b" d="M1220 655h52v-13h-52z"/>${lit(1239, 645, 15, 9)}<path fill="#efeee0" d="M1218 800h58l12 12h-83z"/><path fill="none" stroke="#ccd4c4" stroke-width="3" d="M1225 708h41M1221 776h50"/></g>`;
  };
  add('isle-of-wight', 'signature', { id: 'needles', label: 'The Needles', site: 'The Needles and lighthouse, Alum Bay', colour: 'teal', tags: ['needles', 'chalk', 'lighthouse'], svg: () => vista(741, needles, { water: true, coast: true, y: 625 }) });
  const osborne = (p) => {
    const tower = (x, y) => `<path fill="${p.stone}" d="M${x} 650V${y}h108v${650 - y}z"/><path fill="${p.shade}" d="M${x + 90} ${y}h18V650h-18z"/><path fill="#e8dabc" d="M${x - 10} ${y}h128v-15H${x - 10}z"/>${[0, 1, 2].map(i => arch(x + 10 + i * 32, y + 26, 22, 68)).join('')}<path fill="${p.roof}" d="M${x - 15} ${y - 15}l69-22 69 22z"/>`;
    return `<path fill="${p.stone}" d="M380 650V420h820v230z"/><path fill="${p.shade}" d="M380 430h820v12H380zM380 578h820v10H380z"/>${sashes(440, 465, 12, 2, 58)}${tower(430, 270)}${tower(1060, 220)}<path fill="#ddd0b2" d="M350 650h880v20H350zM320 680h940v17H320zM290 710h1000v15H290z"/>${meadow(765, 32, 330, 1300, 755, 840, ['#d6a166', '#e2e2c6', '#c27b8d'])}`;
  };
  pair('isle-of-wight', 'landmark', 'osborne', 'Osborne House', 'amber', ['osborne', 'terrace', 'belvedere'], osborne, { lawn: true });
  const freshwater = () => chalk('M-160 900V480Q150 355 340 510L470 760zM1180 780l80-320q200-10 500 130v310z', 782) + `<path fill="#718e58" d="M-160 480Q150 355 340 510l-6 20Q140 390-160 505zM1260 460q200-10 500 130v30q-290-126-505-139z"/><path fill="#bbae94" d="M-160 900q820-275 1920 0z"/><path fill="none" stroke="#e9ede2" stroke-width="9" d="M290 832q510-165 1020 5"/>${boat(700, 810, .45, '#6c7870')}`;
  pair('isle-of-wight', 'landscape', 'freshwater-bay', 'Freshwater Bay', 'teal', ['freshwater', 'bay', 'chalk'], freshwater, { water: true, coast: true, y: 620 });
  add('isle-of-wight', 'tradition', { id: 'garlic-festival', label: 'Isle of Wight Garlic Festival', site: 'The Garlic Festival, Newchurch', colour: 'amber', months: [8], tags: ['newchurch', 'garlic', 'festival'], svg: () => vista(801, () => {
    let stalls = '';
    for (const [x, c] of [[310, '#bd9362'], [570, '#809373'], [1130, '#a97664']]) {
      stalls += `<path fill="#be9667" d="M${x} 754V605h180v149z"/><path fill="${c}" d="M${x - 12} 605l102-60 102 60v23H${x - 12}z"/><path fill="#d8be91" d="M${x - 8} 701h196v19H${x - 8}z"/>`;
      for (let j = 0; j < 6; j++) stalls += `<path fill="#e9dfc9" d="M${x + 20 + j * 27} 701q-16-24 0-34l5-16 5 16q16 10 0 34z"/>`;
    }
    return `<path fill="#455f5c" d="M805 665V473q110-65 220 0v192z"/><path fill="#899e8b" d="M777 475q138-112 276 0v18H777z"/><path fill="#b59c76" d="M793 662h244v25H793z"/><path fill="none" stroke="#d8c4a3" stroke-width="5" d="M821 494H1009M805 660V483M1025 660V483"/>${[845, 915, 985].map(x => `<circle class="hx-lit" cx="${x}" cy="512" r="9"/>`).join('')}${stalls}${crowd(807, 27, 805, ['#8a9468', '#b48d64', '#648887'])}<path fill="#b78d54" d="M410 836h210v54H410z"/>${[0, 1, 2, 3, 4, 5].map(i => `<path fill="#e9dfc9" d="M${438 + i * 29} 836q-16-24 0-34l5-16 5 16q16 10 0 34z"/>`).join('')}`;
  }, { path: false }) });
  const garlicFields = () => {
    let leaves = ''; for (let row = 0; row < 5; row++) for (let i = 0; i < 24; i++) { const x = -140 + i * 82 + row * 12, y = 635 + row * 49, h = 25 + row * 12; leaves += `M${x} ${y}q-24-${h} -12-${h * 1.5}q16 ${h} 12 ${h * 1.5}q12-${h} 27-${h * 1.4}q-10 ${h} -27 ${h * 1.4}z`; }
    return `<path fill="#a89566" d="M-160 620H1760V900H-160z"/>${mv('uksway', { ad: '5s' }, `<path fill="#527645" d="${leaves}"/>`)}${pavilion(1040, 605, 240, '#b47d58')}<path fill="#aa8254" d="M360 812h115v53H360z"/>${[0, 1, 2, 3, 4].map(i => `<path fill="#eee6d1" d="M${372 + i * 20} 808q-15-23 0-34v-10h5v10q15 12 0 34z"/>`).join('')}`;
  };
  add('isle-of-wight', 'food', { id: 'mersley-garlic', label: 'Mersley garlic fields', site: 'Garlic fields at Mersley Farm, Newchurch', colour: 'green', tags: ['garlic', 'newchurch', 'fields'], svg: () => vista(821, garlicFields, { path: false }) });
  add('isle-of-wight', 'sport', { id: 'cowes-sailing', label: 'Sailing at Cowes', colour: 'blue', tags: ['cowes', 'sailing', 'solent'], svg: () => vista(841, () => town(842, 638, '#86999c') + sail(390, 730, .75, 2) + sail(850, 820, 1.25, 7) + sail(1220, 688, .45, 5), { water: true, y: 638 }) });

  /* ---------- Berkshire: eight subjects and views ----------
     Windsor Castle — the Round Tower rising over the long crenellated ward.
     Maidenhead Railway Bridge — Brunel's two very flat brick arches.
     Maidenhead Railway Bridge at dusk — arches reflected in the Thames.
     Kennet and Avon Canal — Hungerford's towpath, canal boats and waterside trees.
     Kennet and Avon at dusk — a late-day canal reflection.
     Hungerford Hocktide — flower-topped Tutti poles, a surviving local custom.
     Eton mess — strawberry, meringue and cream, shown in a riverside still life.
     Dorney Lake rowing — long racing shells across the purpose-built course.
     Sources: windsor.gov.uk; visithungerford.com/whats-on/hocktide/
     canalrivertrust.org.uk; dorneylake.co.uk; networkrail.co.uk */
  const windsor = (p) => {
    let curved='';
    for(let i=0;i<9;i++){const x=667+i*23,yy=299+Math.pow((x-770)/104,2)*17;curved+=`<path fill="${p.stone}" d="M${x} ${R(yy+15)}v-25h12v25z"/>`;}
    for(let i=0;i<8;i++)curved+=`<path fill="none" stroke="#a59880" stroke-width="2" opacity=".32" d="M674 ${342+i*31}q96 28 191 0"/>`;
    let out = `<path fill="${p.stone}" d="M300 655V435h1000v220z"/>${battlements(295, 435, 1020, p.stone)}`;
    for (let i = 0; i < 10; i++) out += arch(326 + i * 99, 482, 36, 114, p.stone);
    for (const x of [300, 480, 1080, 1260]) out += `<path fill="${p.stone}" d="M${x} 655V365h72v290z"/>${battlements(x - 3, 365, 80, p.stone)}${arch(x + 22, 408, 27, 70)}`;
    return out + `<path fill="#657e48" d="M600 655q160-85 350 0z"/><path fill="${p.stone}" d="M670 608V305q100-35 200 0v303q-100 34-200 0z"/><path fill="${p.shade}" opacity=".75" d="M836 302q24 1 34 3v303q-15 8-34 12z"/><ellipse cx="770" cy="306" rx="100" ry="22" fill="#8b897b"/><path fill="none" stroke="#eadcc2" stroke-width="9" d="M670 305q100 44 200 0"/>${curved}${arch(700, 355, 27, 76)}${arch(758, 355, 27, 76)}${arch(816, 355, 27, 76)}<path fill="none" stroke="#e3d5b8" stroke-width="6" d="M670 587q100 34 200 0"/><path fill="#ddd1b6" d="M270 655h1070v14H270z"/>`;
  };
  add('berkshire', 'signature', { id: 'windsor-castle', label: 'Windsor Castle', colour: 'slate', tags: ['windsor', 'castle', 'round tower'], svg: () => vista(861, windsor) });
  const maidenhead = () => {
    const id = U();
    return `<g id="${id}"><path fill="#ae765b" fill-rule="evenodd" d="M220 520H1390V690H220zM290 690v-32a240 98 0 0 1 480 0v32zM830 690v-32a240 98 0 0 1 480 0v32z"/><path fill="none" stroke="#d1aa83" stroke-width="10" d="M290 658a240 98 0 0 1 480 0M830 658a240 98 0 0 1 480 0"/><path fill="#805840" d="M200 508h1210v20H200z"/><path fill="none" stroke="#d7b48f" stroke-width="3" d="M220 552H1390M220 576H1390M220 600H300M1280 600h110"/></g>${reflect(id, 690, .22)}${boat(1030, 800, .45, '#5e7772')}`;
  };
  pair('berkshire', 'landmark', 'maidenhead-bridge', 'Maidenhead Railway Bridge', 'red', ['maidenhead', 'brunel', 'thames'], maidenhead, { water: true, y: 660 });
  const canal = () => `<path fill="#82995e" d="M-160 900V620H590Q430 755 350 900zM1150 900Q1060 735 960 620H1760V900z"/><path fill="#c7bd97" d="M1080 900Q1010 747 937 630h40Q1070 750 1160 900z"/>${oak(350, 735, .9, '#3b5a3b', '#6b8550', '#a6b574', 885)}${oak(1240, 650, .55, '#3b5a3b', '#6b8550', '#a6b574', 886)}${mv('ukbob', { ad: '6s', dy: '3px' }, `<path fill="#526d65" d="M600 785h430l-30 65H628z"/><path fill="#b17a56" d="M670 724h280l45 66H625z"/>${sashes(690, 743, 5, 1, 50)}<path fill="#384d4e" d="M660 719h280l12 9H647z"/>`)}<path fill="none" stroke="#dfd9b9" stroke-width="5" d="M620 853q220 28 410-8"/>`;
  pair('berkshire', 'landscape', 'hungerford-canal', 'The Kennet and Avon Canal, Hungerford', 'teal', ['hungerford', 'canal', 'towpath'], canal, { water: true, y: 620 });
  add('berkshire', 'tradition', { id: 'hocktide', label: 'Hungerford Hocktide', colour: 'pink', months: [3, 4, 5], tags: ['hungerford', 'hocktide', 'flowers'], svg: () => vista(901, () => terrace(902, 650) + pavilion(670, 650, 280, '#d8c5a7') + crowd(903, 25, 800, ['#9e8a61', '#687c7d', '#8d754f']) + [580, 980].map((x, i) => `<path stroke="#8b6c46" stroke-width="10" d="M${x} 850V450"/>` + mv('uksway2', { ad: '7s' }, `<ellipse cx="${x}" cy="450" rx="55" ry="65" fill="#65864d"/>${meadow(906 + i, 20, x - 42, x + 42, 465, 490, ['#e8cf95', '#c8819c', '#efeddd'])}`)).join('')) });
  const strawberry = (x,y,k,angle=0) => {
    const id=U();let seeds='';for(let row=0;row<4;row++)for(let i=0;i<4-row;i++)seeds+=`M${-12+row*4+i*8} ${-8+row*8}l1 2`;
    return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${k})"><defs>${linU(id,[[0,'#ff8981'],[.45,'#ed4a50'],[1,'#a72643']],-15,-22,18,30)}</defs><path fill="url(#${id})" d="M-20-12C-18-32 0-29 2-18C11-31 27-19 22-4Q19 12 3 30Q-14 18-20-12z"/><path fill="none" stroke="#ffe4a1" stroke-width="1.8" stroke-linecap="round" d="${seeds}"/><path fill="#3d8755" d="M1-18l-13-10 3 12-13-1 16 9 7-6 12 7-4-10 10-8-17 5z"/><path fill="none" stroke="#a9c870" stroke-width="2" d="M1-19l2-11"/><path fill="#ffd2bc" opacity=".45" d="M-13-16q7-7 9 1l-6 16q-5-7-3-17z"/></g>`;
  };
  const bowl = (x, y) => {
    const ceramic=U();
    return `<g transform="translate(${x} ${y}) scale(1.45)"><defs>${linU(ceramic,[[0,'#eaf8ec'],[.4,'#bde3de'],[1,'#5097a0']],-100,0,110,100)}</defs><ellipse cy="102" rx="115" ry="20" fill="#24474c" opacity=".2"/><path fill="url(#${ceramic})" d="M-100 0Q-80 98 0 98T100 0z"/><path fill="#f8fff0" opacity=".6" d="M-84 7q12 66 54 77-47-22-54-77z"/><ellipse rx="100" ry="30" fill="#8cbec0"/><ellipse cy="-2" rx="91" ry="25" fill="#e7cdb4"/><path fill="#fff6df" d="M-90-4q-6-32 27-25-5-33 29-27 14-30 35-5 31-24 42 7 39-2 34 28 29 16 3 29-28 22-48 1-35 20-55-2-40 16-67-6z"/><path fill="none" stroke="#e1bba9" stroke-width="3" d="M-68-19q18-15 30 1M-15-39q21-10 36 7M32-13q15-14 31-2M-27 2q20-12 39-2"/>${strawberry(-60,-28,.94,-29)}${strawberry(27,-33,1,20)}${strawberry(63,0,.8,39)}${strawberry(-12,2,.77,-12)}<g fill="#ffffed" stroke="#ded8c5" stroke-width="1.4"><path d="M-34-31l17-21 18 9-15 22zM34-24l16-19 17 15-12 11zM-75 9l18-14 12 19-17 10z"/></g><path fill="none" stroke="#f5fff4" stroke-width="4" d="M-96 10q95 43 192 0"/><path fill="none" stroke="#76b4b7" stroke-width="2" d="M-68 57q64 42 139 1"/></g>`;
  };
  add('berkshire', 'food', { id: 'eton-mess', label: 'Eton mess', site: 'Strawberries, cream and meringue beside the Thames', colour: 'red', tags: ['eton', 'strawberries', 'meringue'], svg: () => vista(921, () => town(922, 660, '#919e93') + sail(1180, 745, .44, 5) + `<path fill="#a46b49" d="M-160 821H1760V900H-160z"/><path fill="#dfb88b" d="M-160 802H1760v21H-160z"/><path fill="none" stroke="#875638" stroke-width="2" opacity=".4" d="M-160 845H1760M-160 882H1760M389 821v79M1200 821v79"/><path fill="#eee9d5" d="M365 810l153-41 142 38-106 93H359z"/><path fill="none" stroke="#72b8bd" stroke-width="4" d="M393 815l126-33 120 33M378 838l145-38 88 28"/>` + bowl(810, 699) + strawberry(472,824,1.15,31) + strawberry(548,858,.85,-12) + `<ellipse cx="1140" cy="827" rx="63" ry="14" fill="#704d3d" opacity=".2"/><path fill="#abc8c8" d="M1092 822q-17-7-8-15 19-14 41-1l96 18-2 7-99-16q-13 14-28 7z"/><path fill="none" stroke="#edf8ef" stroke-width="3" d="M1091 807q15-9 25 1l89 18"/>`, { water: true, y: 660 }) });
  const shell = (x, y, n, col) => mv('ukpar', { ad: '13s', dx: '65px' }, `<g transform="translate(${x} ${y})"><path fill="${col}" d="M-260 0Q0-15 260 0Q0 19-260 0z"/>${Array.from({ length: n }, (_, i) => { const xx = -175 + i * 48; return `<circle cx="${xx}" cy="-23" r="7" fill="#726556"/><path fill="#e7e1c8" d="M${xx - 8}-15h16v20h-16z"/>` + mv('ukheel', { ad: '3s', d: '-.5s', to: `${xx}px 0px` }, `<path stroke="#9c8861" stroke-width="4" d="M${xx} 0l${i % 2 ? '55 50' : '-55 -50'}"/><path stroke="#e4d9ae" stroke-width="11" d="M${xx + (i % 2 ? 45 : -45)} ${i % 2 ? 43 : -43}l${i % 2 ? '18 16' : '-18 -16'}"/>`); }).join('')}</g>`);
  add('berkshire', 'sport', { id: 'dorney-rowing', label: 'Rowing at Dorney Lake', colour: 'blue', tags: ['dorney', 'rowing', 'lake'], svg: () => vista(941, () => `<path fill="#879970" d="M-160 642H1760v20H-160z"/>${shell(770, 758, 8, '#b59b57')}${shell(1100, 836, 4, '#e2d1a5')}`, { water: true, y: 650 }) });

  /* ---------- Oxfordshire: eight subjects and views ----------
     Radcliffe Camera — the circular library's dome, drum and paired columns.
     Blenheim Palace — the Baroque central block and long wings in Woodstock.
     Blenheim at dusk — honey-coloured stone in low evening light.
     Uffington White Horse — the ancient flowing chalk figure, never a realistic horse.
     Uffington at dusk — the chalk lines against a warm hill and distant vale.
     Bampton Morris — the village's Whitsun dancing, shown as restrained silhouettes.
     Banbury cakes — oval currant pastries with scored tops, a named local food.
     Henley rowing — racing shells passing the riverside church and bridge.
     Sources: experienceoxfordshire.org/places-to-go/banbury/
     visit.bodleian.ox.ac.uk; blenheimpalace.com; bamptonmorris.co.uk
     historicengland.org.uk/listing/the-list/list-entry/1008413 */
  const camera = (p) => {
    let out = `<path fill="${p.stone}" d="M610 695V420q190-30 380 0v275z"/><path fill="${p.shade}" d="M615 545h370v12H615z"/><path fill="${p.stone}" d="M622 414q0-144 178-177 178 33 178 177z"/><path fill="none" stroke="${p.shade}" stroke-width="5" d="M800 238Q720 280 715 414M800 238Q880 280 885 414M800 238V414"/><path fill="#b5a68e" d="M590 414h420v17H590zM600 684h400v18H600z"/>`;
    for (let i = 0; i < 7; i++) { const x = 630 + i * 48; out += arch(x + 2, 466, 26, 62) + `<path fill="#eadcc0" d="M${x - 8} 683V457h8v226zM${x + 30} 683V457h8v226z"/>`; }
    return terrace(965, 690) + out + `<path fill="${p.stone}" d="M780 240V195h40v45z"/><path fill="${p.roof}" d="M773 194q27-42 54 0z"/><path fill="#d0bfa1" d="M575 710h450v15H575zM550 735h500v14H550z"/>`;
  };
  add('oxfordshire', 'signature', { id: 'radcliffe-camera', label: 'Radcliffe Camera', site: 'Radcliffe Square, Oxford', colour: 'amber', tags: ['oxford', 'library', 'dome'], svg: () => vista(961, camera) });
  const blenheim = (p) => {
    let out = `<path fill="${p.stone}" d="M270 650V452h1060v198z"/><path fill="${p.shade}" d="M270 450h1060v16H270zM270 563h1060v10H270z"/>${sashes(300, 490, 17, 2, 60)}<path fill="${p.stone}" d="M650 650V370h300v280z"/><path fill="${p.shade}" d="M628 376l172-82 172 82z"/>`;
    for (const x of [300, 1180]) out += `<path fill="${p.stone}" d="M${x} 650V345h115v305z"/><path fill="${p.shade}" d="M${x - 12} 350h139v-16H${x - 12}z"/><path fill="${p.stone}" d="M${x + 14} 334v-60h87v60z"/><path fill="${p.roof}" d="M${x + 10} 276q-8-20 14-26v-18h67v18q22 6 14 26z"/><path fill="${p.stone}" d="M${x + 43} 232v-22h29v22z"/><path stroke="${p.shade}" stroke-width="5" d="M${x + 57} 210v-21"/>${sashes(x + 21, 392, 2, 3, 48)}`;
    for (let i = 0; i < 6; i++) out += `<path fill="#e8d8b6" d="M${669 + i * 45} 650V402h13v248z"/>`;
    return out + arch(770, 526, 58, 124, p.stone) + `<path fill="#d5c29e" d="M250 651h1100v20H250z"/><path fill="none" stroke="#e8dcbe" stroke-width="7" d="M275 476H640M960 476h365M275 584H640M960 584h365"/>${meadow(987, 25, 280, 1360, 795, 840, ['#eee1be', '#b79364'])}`;
  };
  pair('oxfordshire', 'landmark', 'blenheim-palace', 'Blenheim Palace', 'amber', ['woodstock', 'palace', 'baroque'], blenheim, { lawn: true });
  const uffington = () => `<path fill="#70834d" d="M-160 900V655Q620 375 1760 660V900z"/><path fill="#9fa86a" d="M-160 900V770Q850 596 1760 776V900z"/><g transform="translate(530 570) rotate(-9)"><path fill="none" stroke="#eee9cf" stroke-width="16" stroke-linecap="round" d="M-60 85Q24 50 195 39Q255 12 314-39L378-66M189 59Q244 99 313 125M174 81L60 166L-32 155M79 48Q-8 30-83 63M319-34l32 33 45-1"/><path fill="#eee9cf" d="M375-68l33 22-15 12-30-22zM366-60l-1-31 12 28z"/></g><path fill="none" stroke="#d7cdab" stroke-width="8" d="M-160 752Q600 512 1760 732"/>${grass(1005, 50, -160, 1760, 900, 50, '#4c623c')}`;
  pair('oxfordshire', 'landscape', 'uffington-horse', 'Uffington White Horse', 'green', ['uffington', 'chalk', 'white horse'], uffington, { path: false });
  add('oxfordshire', 'tradition', { id: 'bampton-morris', label: 'Bampton Morris dancing', colour: 'amber', months: [5, 6], tags: ['bampton', 'morris', 'whitsun'], svg: () => vista(1021, () => terrace(1022, 650) + `<path fill="#c7b896" d="M-160 710H1760v190H-160z"/>` + Array.from({ length: 8 }, (_, i) => { const x = 450 + i * 90; return mv('ukbob', { ad: '3s', d: `-${i % 3}s`, dy: '4px' }, `<g transform="translate(${x} 783)"><circle cy="-75" r="11" fill="#85735a"/><path fill="#ede8d4" d="M-15-60h30l8 40h-46z"/><path stroke="#536666" stroke-width="9" d="M-10-18l-10 28M10-18l15 26"/><path fill="none" stroke="#ede8d4" stroke-width="8" d="M-14-50l-30-20M14-50l30-20"/><path fill="#f9f3df" d="M-49-77l18-13 5 24zM37-76l18-14 9 22z"/></g>`); }).join('')) });
  const pastries = () => {
    const glaze=U(),ceramic=U();
    let out = `<defs>${linU(glaze,[[0,'#ffe6a0'],[.5,'#eaa54a'],[1,'#b45f2f']],0,-38,0,42)}${linU(ceramic,[[0,'#fff9e6'],[1,'#7bc5c8']],0,755,0,840)}</defs><path fill="#ad7b53" d="M-160 803H1760V900H-160z"/><path fill="#deb784" d="M-160 781H1760v25H-160z"/><path fill="none" stroke="#946d4b" stroke-width="2" opacity=".4" d="M-160 821H1760M-160 855H1760M-160 889H1760M350 806v94M1120 806v94"/><path fill="#f0eee1" d="M455 794l300-72 456 117-201 61H639z"/><path fill="none" stroke="#68a8b0" stroke-width="4" d="M467 802l282-65 438 108M663 893l344-3 179-43"/><ellipse cx="810" cy="801" rx="310" ry="64" fill="url(#${ceramic})"/><ellipse cx="810" cy="795" rx="274" ry="48" fill="#fff7df"/>`;
    for (const [x, y, k] of [[630, 773, .9], [810, 745, 1], [980, 784, .9]]) { const r = rnd(x); out += `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cy="16" rx="83" ry="42" fill="#b97d40"/><ellipse rx="83" ry="38" fill="url(#${glaze})"/><path fill="none" stroke="#9c713f" stroke-width="6" d="M-35-19l11 31M-5-25L8 12M27-20l12 27"/><path fill="none" stroke="#ffe4ad" stroke-width="3" d="M-41-21l11 31M-11-27L2 10M21-22l12 27"/>`; for (let i = 0; i < 12; i++) out += `<circle cx="${R(r() * 130 - 65)}" cy="${R(r() * 38 - 19)}" r="2" fill="${i%3?'#ffe1ab':'#795237'}"/>`; out += '</g>'; }
    return out + `<ellipse cx="1274" cy="831" rx="95" ry="22" fill="#eadbc2"/><path fill="#3a7a87" d="M1216 749h112v43q-5 43-56 43t-56-43z"/><path fill="none" stroke="#71b7bd" stroke-width="10" d="M1329 762q65-10 47 45-14 20-47 4"/><ellipse cx="1272" cy="750" rx="56" ry="15" fill="#ede2c6"/><ellipse cx="1272" cy="751" rx="47" ry="10" fill="#8b4e32"/>` + puffs(1272, 740, 5, '#faf3e5', 13, -55, 5, -160, 2);
  };
  add('oxfordshire', 'food', { id: 'banbury-cakes', label: 'Banbury cakes', colour: 'amber', mood: 'cosy', tags: ['banbury', 'pastry', 'currants'], svg: () => vista(1041, () => terrace(1042, 690) + pastries(), { path: false }) });
  add('oxfordshire', 'sport', { id: 'henley-rowing', label: 'Rowing at Henley-on-Thames', colour: 'blue', tags: ['henley', 'rowing', 'thames'], svg: () => vista(1061, p => town(1062, 650, '#a49982') + `<path fill="${p.stone}" d="M1090 650V400h90v250z"/>${battlements(1085, 400, 100, p.stone)}${arch(1118, 446, 35, 80)}<path fill="${p.shade}" fill-rule="evenodd" d="M250 595h690v72H250z${[0, 1, 2, 3, 4].map(i => `M${280 + i * 130} 667v-22a46 30 0 0 1 92 0v22z`).join('')}"/>${shell(710, 782, 8, '#c4ad73')}${shell(1210, 848, 4, '#eee1b9')}`, { water: true, y: 650 }) });

  /* ---------- Buckinghamshire: eight subjects and views ----------
     Waddesdon Manor — French Renaissance towers and steep slate roofs above the parterre.
     Stowe's Palladian Bridge — classical colonnade and pediments reflected in the lake.
     Stowe bridge at dusk — low light beneath its stone arches.
     Ivinghoe Beacon — open chalk grassland and the Ridgeway's sinuous path.
     Ivinghoe Beacon at dusk — long shadows across the Chiltern escarpment.
     Olney Pancake Race — Shrove Tuesday pans, pancakes and restrained running silhouettes.
     Aylesbury duck — the county's traditional white duck, shown in a farmyard setting.
     Bletchley Park — the mansion and huts preserve computing and codebreaking history.
     Sources: nationaltrust.org.uk/visit/oxfordshire-buckinghamshire-berkshire/waddesdon-manor
     nationaltrust.org.uk/visit/oxfordshire-buckinghamshire-berkshire/stowe-gardens
     olneypancakerace.org; bletchleypark.org.uk */
  const waddesdon = (p) => {
    let out = `<path fill="${p.stone}" d="M370 670V435h860v235z"/><path fill="${p.roof}" d="M340 440l96-119h692l132 119z"/>${sashes(440, 478, 12, 2, 60)}`;
    for (const [x, y] of [[375, 255], [665, 210], [1130, 260]]) out += `<path fill="${p.stone}" d="M${x} 670V${y + 160}h90v${510 - y}z"/><path fill="${p.shade}" d="M${x + 72} ${y + 160}h18V670h-18z"/><path fill="${p.roof}" d="M${x - 16} ${y + 166}l61-166 61 166z"/><path stroke="#515e63" stroke-width="4" d="M${x + 45} ${y}v-22"/>${arch(x + 30, y + 205, 27, 75)}`;
    for (const x of [465, 555, 990, 1080]) out += `<path fill="${p.stone}" d="M${x} 440v-58h38v58z"/><path fill="${p.shade}" d="M${x - 7} 383l26-30 26 30z"/>${arch(x + 10, 389, 19, 36)}<path fill="${p.stone}" d="M${x + 3} 353v-12h32v12z"/>`;
    let ornaments='';for(let i=0;i<12;i++){const x=438+i*61;ornaments+=`<path fill="${p.stone}" d="M${x} 333l5-17 5 17z"/><path stroke="#e4d1af" stroke-width="2" d="M${x+5} 316v-9"/>`;}
    const parterre=`<path fill="#daceab" d="M-160 900V744H1760V900z"/><path fill="#7baf65" d="M280 780h1040l215 120H65z"/><path fill="#e8d9b5" d="M734 690h144l89 210H657z"/><path fill="none" stroke="#246e54" stroke-width="17" d="M244 876q80-100 241-67t120 54q-86 38-228-4 31-46 150-21M1128 838q120-25 150 21-142 42-228 4-41-21 120-54t241 67"/><path fill="none" stroke="#8ac178" stroke-width="4" d="M244 871q80-100 241-67t120 54q-86 38-228-4M1128 833q120-25 150 21-142 42-228 4-41-21 120-54t241 67"/>${meadow(1086,26,280,620,812,872,['#ff787f','#ffce57','#cf85d1'])}${meadow(1087,26,1010,1340,812,872,['#ff787f','#ffce57','#cf85d1'])}<ellipse cx="806" cy="818" rx="108" ry="24" fill="#d1c2a3"/><ellipse cx="806" cy="813" rx="92" ry="18" fill="#57b7c5"/><path fill="#cbb999" d="M791 807l6-63h18l6 63z"/><ellipse cx="806" cy="750" rx="39" ry="9" fill="#e6d7b6"/>${mv('ukglow',{ad:'3.7s'},'<path fill="none" stroke="#e7ffff" stroke-width="3" d="M806 743q-2-56-28-29M806 743q2-56 28-29M769 753q-13 34-12 59M844 753q13 34 12 59"/>')}${shimmer(1090,8,730,880,808,827,'#d6ffff',20)}`;
    return out + `<path fill="${p.stone}" d="M820 670V390h170v280z"/><path fill="${p.roof}" d="M806 390l42-110h114l44 110z"/>${sashes(850, 431, 2, 3, 68)}<path fill="none" stroke="#eee1c7" stroke-width="8" d="M390 547H660M710 547H815M996 547H1200M390 465H660M710 465H815M996 465H1200"/><path fill="#ddd0b1" d="M350 670h900v18H350z"/>${ornaments}${parterre}`;
  };
  add('buckinghamshire', 'signature', { id: 'waddesdon-manor', label: 'Waddesdon Manor', colour: 'slate', tags: ['waddesdon', 'manor', 'parterre'], svg: () => vista(1081, waddesdon, { path:false, lawn: true }) });
  const stowe = (p) => {
    const id = U(); let cols = '';
    for (let i = 0; i < 10; i++) { const x = 473 + i * 72; cols += `<path fill="${p.stone}" d="M${x} 574V418h18v156z"/><path fill="#e9ddc4" d="M${x - 7} 574h32v10h-32zM${x - 5} 418h28v-8h-28z"/>`; }
    return `<g id="${id}"><path fill="${p.stone}" fill-rule="evenodd" d="M385 580H1250V700H385zM452 700v-28a66 45 0 0 1 132 0v28zM667 700v-28a100 68 0 0 1 200 0v28zM957 700v-28a66 45 0 0 1 132 0v28z"/><path fill="${p.roof}" d="M370 416l130-68h580l186 68z"/><path fill="${p.stone}" d="M370 416h896v14H370zM370 574h896v14H370z"/>${cols}<path fill="${p.stone}" d="M385 582V440h65v142zM1164 582V440h66v142z"/><path fill="${p.stone}" d="M355 430l62-58 62 58zM1144 430l62-58 62 58z"/></g>${reflect(id, 700, .28)}`;
  };
  pair('buckinghamshire', 'landmark', 'stowe-bridge', 'The Palladian Bridge, Stowe', 'slate', ['stowe', 'bridge', 'gardens'], stowe, { water: true, y: 690 });
  const ivinghoe = () => {
    const r = rnd(1126); let fields = '', flowers = '';
    for (let i = 0; i < 13; i++) { const x = -160+i*148, y = 655+r()*41; fields += `<path fill="${['#90b679','#c7c17a','#67a18a'][i%3]}" d="M${R(x)} ${R(y)}l117-17 45 40-145 24z"/><path fill="none" stroke="#58816e" stroke-width="3" d="M${R(x)} ${R(y)}l117-17 45 40"/>`; }
    for (let i = 0; i < 28; i++) { const x = R(70+r()*1380), y = R(824+r()*67); flowers += `<path stroke="#687e4b" stroke-width="2" d="M${x} ${y}l-4-17"/><circle cx="${x-4}" cy="${y-17}" r="${2+r()*3}" fill="${i%3?'#e3dcb6':'#ac91c5'}"/>`; }
    return fields+`<path fill="#78a66b" d="M-160 900V718Q240 648 585 472Q800 418 1050 600T1760 660v240z"/><path fill="#4d8974" d="M675 466Q800 418 1050 600T1760 660v240H1370Q1190 748 970 639T675 466z"/><path fill="#afbf73" d="M-160 900V822Q650 625 1000 698T1760 740v160z"/><path fill="none" stroke="#cfda98" opacity=".55" stroke-width="8" d="M-160 785Q229 672 474 566M1080 733q329-30 680 76"/><path fill="none" stroke="#e1d6ad" stroke-width="12" d="M490 900Q850 785 810 639T607 486"/><path fill="none" stroke="#608b55" stroke-width="10" d="M-160 746Q210 698 528 525"/>${flowers}${grass(1127, 60, -160, 1760, 900, 55, '#516f47')}`;
  };
  pair('buckinghamshire', 'landscape', 'ivinghoe-beacon', 'Ivinghoe Beacon', 'green', ['ivinghoe', 'chilterns', 'ridgeway'], ivinghoe, { path: false });
  add('buckinghamshire', 'tradition', { id: 'olney-pancake-race', label: 'Olney Pancake Race', colour: 'amber', months: [2, 3], tags: ['olney', 'pancakes', 'shrove tuesday'], svg: () => vista(1141, () => terrace(1142, 650) + `<path fill="#c1b092" d="M-160 700H1760v200H-160z"/>` + Array.from({ length: 5 }, (_, i) => { const x = 480 + i * 145; return mv('ukbob', { ad: '2.5s', d: `-${i * .4}s`, dy: '4px' }, `<g transform="translate(${x} ${780 + i % 2 * 25})"><circle cy="-75" r="11" fill="#8f7860"/><path fill="${['#859493', '#b37e66', '#84815f'][i % 3]}" d="M-15-59h30l9 44h-48z"/><path fill="#ece5cc" d="M-12-42h24v29h-24z"/><path fill="none" stroke="#535d59" stroke-width="9" d="M-8-15l-22 18-14-12M8-15l24 24"/><path stroke="#9a8160" stroke-width="7" d="M10-46l35-8"/><ellipse cx="57" cy="-55" rx="20" ry="6" fill="#4b5454"/><ellipse cx="57" cy="-59" rx="15" ry="4" fill="#d1a45c"/></g>`); }).join('')) });
  const duck = (x, y, k) => mv('ukbob', { ad: '5s', dy: '2px' }, `<g transform="translate(${x} ${y}) scale(${k})"><path fill="#eee9d6" d="M-60 0q-40-32-70-13l35 35q67 27 111-10 20-17 18-54l-19-9q-14 40-38 35z"/><circle cx="26" cy="-52" r="21" fill="#f7f1df"/><path fill="#d5ad63" d="M43-56l27 9-28 5z"/><circle cx="32" cy="-57" r="3" fill="#39433b"/><path stroke="#c29a58" stroke-width="5" d="M-35 20v20h-14M0 17v23h15"/><path fill="none" stroke="#d0cbb6" stroke-width="3" d="M-70-1q25 28 55 4"/></g>`);
  add('buckinghamshire', 'food', { id: 'aylesbury-ducks', label: 'Aylesbury ducks', site: 'Aylesbury ducks in a farmyard orchard', colour: 'amber', tags: ['aylesbury', 'ducks', 'farming'], svg: () => vista(1161, () => pavilion(1080, 660, 220, '#a57b53') + oak(420, 720, .78, '#3e593b', '#7b8d55', '#b3b770', 1164) + `<path fill="#8ca694" d="M510 830q270-90 570 0-210 90-570 0z"/>${duck(680, 820, 1.12)}${duck(980, 807, .75)}${duck(1160, 832, .82)}`) });
  const bletchley = (p) => `<path fill="#ac7457" d="M400 665V444h710v221z"/><path fill="${p.roof}" d="M370 452l110-115h550l120 115z"/>${sashes(470, 487, 9, 2, 65)}<path fill="${p.stone}" d="M865 665V375h140v290z"/><path fill="${p.roof}" d="M855 375l80-76 80 76z"/>${arch(904, 419, 48, 66)}<path fill="#a47654" d="M408 390V285h45v105zM720 350V244h47v106z"/><path fill="${p.stone}" d="M870 660v-84h127v84z"/><path fill="#53654f" d="M1120 716V640h220v76z"/><path fill="#424e4c" d="M1098 642l132-63 132 63z"/>${sashes(1140, 659, 4, 1, 47)}<path fill="none" stroke="#e1ceb0" stroke-width="4" d="M400 572h710M400 453h710"/>`;
  add('buckinghamshire', 'heritage', { id: 'bletchley-park', label: 'Bletchley Park', colour: 'red', tags: ['bletchley', 'computing', 'heritage'], svg: () => vista(1181, bletchley) });

  /* ---------- Greater London: ten subjects and views ----------
     Tower Bridge — the paired Gothic towers, suspended side spans and high walkway.
     St Paul's Cathedral — Wren's dome and the two west-front bell towers.
     St Paul's at dusk — the stone and dome above the evening city.
     Kew Palm House — the iron-and-glass curved nave and botanical garden.
     Kew Palm House at dusk — a quiet glass reflection across the pond.
     Regent's Canal — narrowboats, towpath and low brick bridges.
     Totally Thames — September's river arts season, represented by classic boats at St Katharine Docks.
     Borough Market — iron roof, produce stalls and bread, with no labels or branding.
     Wimbledon grass courts — the county's tennis heritage without sponsor or club markings.
     Royal Observatory — Flamsteed House, its time ball and telescope dome in Greenwich Park.
     Sources: visitlondon.com/things-to-do/london-attractions-map
     towerbridge.org.uk; stpauls.co.uk; kew.org; rmg.co.uk/royal-observatory
     thamesfestivaltrust.org/artistic-programme/totally-thames/ */
  const towerBridge = (p) => {
    const id = U(); let towers = '';
    for (const x of [430, 1010]) {
      towers += `<path fill="${p.stone}" d="M${x} 710V330h140v380z"/><path fill="${p.shade}" d="M${x + 116} 330h24v380h-24z"/>${arch(x + 40, 505, 62, 175, p.stone)}${arch(x + 47, 365, 47, 87, p.stone)}`;
      for (const xx of [x - 13, x + 122]) towers += `<path fill="${p.stone}" d="M${xx} 510V315h30v195z"/><path fill="${p.roof}" d="M${xx - 5} 315l20-89 20 89z"/>`;
      towers += `<path fill="${p.roof}" d="M${x + 15} 330l55-94 55 94z"/><path fill="#d8cdb4" d="M${x - 9} 482h158v15H${x - 9}z"/>`;
      towers += `<path fill="#356f98" d="M${x+9} 324l61-105 62 105h-14l-48-82-47 82z"/><path fill="${p.stone}" d="M${x+62} 284h17v40h-17z"/><path fill="#496f7f" d="M${x+62} 283l8-18 9 18z"/><path fill="#e7ddc6" d="M${x-11} 459h162v10H${x-11}zM${x-10} 353h160v8H${x-10}zM${x-7} 698h154v18H${x-7}z"/>`;
      for(const xx of [x+4,x+112])towers += `<path fill="${p.stone}" d="M${xx} 676V510h20v166z"/><path fill="${p.shade}" d="M${xx+15} 518h5v158h-5z"/><path fill="#e8ddc4" d="M${xx-3} 588h26v7h-26zM${xx-3} 643h26v7h-26z"/>`;
      towers += `<path fill="none" stroke="#e6dcc8" stroke-width="3" d="M${x+39} 443v-61q30-39 63 0v61M${x+48} 510v-16h44v16M${x+32} 681V557q37-70 76 0v124"/><path fill="none" stroke="#9d947d" stroke-width="2" opacity=".5" d="${Array.from({length:9},(_,i)=>`M${x+25} ${510+i*19}h11M${x+104} ${510+i*19}h8`).join('')}"/>`;
    }
    const lattice=Array.from({length:18},(_,i)=>`M${570+i*24} 424l24 27M${570+i*24} 451l24-27`).join('');
    return town(1202, 668, '#8b9ea3') + `<g id="${id}">${towers}<path fill="#287fbd" d="M550 420h460v36H550zM-160 676H1760v18H-160z"/><path fill="none" stroke="#dcecec" stroke-width="3" d="${lattice}"/><path fill="none" stroke="#3f99c8" stroke-width="16" d="M-160 650Q170 650 430 445M1150 445Q1470 650 1760 650"/><path fill="none" stroke="#f0e1c9" stroke-width="4" d="M-160 641Q170 641 430 436M1150 436Q1470 641 1760 641"/><path fill="none" stroke="#8badb5" stroke-width="5" d="${[0, 1, 2, 3, 4, 5].map(i => `M${10 + i * 65} ${650 - i * i * 5}V676M${1200 + i * 65} ${500 + i * 29}V676`).join('')}"/><path fill="none" stroke="#c6d2cd" stroke-width="3" d="M570 421h440M570 454h440M-160 678H1760"/><path fill="none" stroke="#455b72" stroke-width="6" d="M570 698H1010M790 679v16"/></g>${reflect(id, 710, .2)}${boat(770, 804, .52, '#7d5a43')}`;
  };
  add('greater-london', 'signature', { id: 'tower-bridge', label: 'Tower Bridge', colour: 'blue', tags: ['thames', 'tower bridge', 'london'], svg: () => vista(1201, towerBridge, { water: true, y: 685 }) });
  const stpauls = (p) => {
    let out = terrace(1222, 675) + `<path fill="${p.stone}" d="M430 680V456h740v224z"/><path fill="${p.shade}" d="M400 462l130-100h580l85 100z"/>${sashes(455, 515, 11, 2, 61)}<path fill="${p.stone}" d="M670 456V337h260v119z"/><path fill="${p.roof}" d="M658 336q22-142 142-174 120 32 142 174z"/><path fill="none" stroke="#8b928b" stroke-width="5" d="M800 165Q716 223 709 336M800 165Q884 223 891 336"/>`;
    for (let i = 0; i < 9; i++) out += `<path fill="${p.shade}" d="M${685 + i * 26} 436v-79h8v79z"/>`;
    out += `<path fill="${p.stone}" d="M780 168V122h40v46z"/><path fill="${p.roof}" d="M773 122q27-32 54 0z"/><path stroke="${p.shade}" stroke-width="4" d="M800 98V68M791 80h18"/>`;
    for (const x of [460, 1050]) out += `<path fill="${p.stone}" d="M${x} 500V328h90v172z"/>${arch(x + 23, 361, 40, 90)}<path fill="${p.stone}" d="M${x + 7} 328v-32h76v32z"/><path fill="${p.roof}" d="M${x} 296q45-97 90 0z"/><path fill="${p.stone}" d="M${x + 33} 240v-32h24v32z"/>`;
    for (let i = 0; i < 6; i++) out += `<path fill="#f0e4c9" d="M${672 + i * 44} 679V565h15v114z"/><path fill="${p.shade}" d="M${687 + i * 44} 679V565h5v114z"/>`;
    let colonnade='';for(let i=0;i<16;i++){const x=678+i*16;colonnade+=`<path fill="#f1e1bd" d="M${x} 431v-71h6v71z"/><path fill="#f1e1bd" d="M${x-2} 356h10v5h-10zM${x-2} 431h10v5h-10z"/>`;}
    const plaza=`<path fill="#bbc4c4" d="M-160 695H1760V900H-160z"/><path fill="none" stroke="#e7e0cf" stroke-width="3" opacity=".65" d="M-160 751H1760M-160 827H1760M120 900l425-205M440 900l221-205M1160 900L941 695M1500 900l-442-205"/>`;
    return plaza+out+colonnade + `<path fill="${p.stone}" d="M650 565l150-80 150 80z"/><path fill="${p.shade}" d="M676 553l124-58 124 58z"/>${arch(778, 592, 45, 87)}<path fill="#d7cbb0" d="M400 682h800v16H400zM637 698h326v13H637zM622 720h356v12H622z"/><path fill="#ede2cb" d="M610 737h380v10H610zM597 755h406v10H597zM584 773h432v10H584z"/><path fill="none" stroke="#e5d5b5" stroke-width="5" d="M439 492h721M450 666h700M658 340h284M668 446h265"/>`;
  };
  pair('greater-london', 'landmark', 'st-pauls', 'St Paul\'s Cathedral', 'slate', ['st pauls', 'dome', 'cathedral'], stpauls,{path:false});
  const palmHouse = () => {
    const id = U(); let ribs = '';
    for (let i = 0; i <= 18; i++) { const x = 355 + i * 50, yy = i < 4 || i > 14 ? 510 : 390; ribs += `<path fill="none" stroke="#d9ded0" stroke-width="5" d="M${x} 662V${yy}"/>`; }
    let palms = ''; for (let i = 0; i < 7; i++) { const x = 490 + i * 105; palms += `<path stroke="#66764b" stroke-width="5" d="M${x} 648l8-95"/><path fill="#68895b" d="M${x + 8} 553q-49-57-72-3 44-16 72 3q38-59 75-6-46-10-75 6q0-65-27-72-17 41 27 72z"/>`; }
    return `<g id="${id}"><path fill="#9eb9a7" d="M350 660V552q0-80 160-80h70q0-170 220-170t220 170h70q160 0 160 80v108z"/>${palms}${ribs}<path fill="none" stroke="#e5e2cf" stroke-width="6" d="M350 660V552q0-80 160-80h70q0-170 220-170t220 170h70q160 0 160 80v108M350 560h900M370 608h860M585 471h430M605 425h390M658 377h288"/><path fill="#d9dfcf" d="M754 660V500q46-57 92 0v160z"/>${arch(770, 515, 60, 145)}<path fill="#dad9be" d="M330 660h940v20H330z"/></g>${reflect(id, 686, .2)}${meadow(1246, 25, 240, 530, 775, 835, ['#d48f91', '#f1dab6'])}`;
  };
  pair('greater-london', 'landscape', 'kew-palm-house', 'Kew Palm House and gardens', 'green', ['kew', 'glasshouse', 'gardens'], palmHouse, { water: true, y: 682 });
  add('greater-london', 'landscape', { id: 'regents-canal', label: 'Regent\'s Canal', colour: 'teal', tags: ['canal', 'towpath', 'narrowboat'], svg: () => vista(1261, () => terrace(1262, 596) + canal() + `<path fill="#ac795b" fill-rule="evenodd" d="M350 570h830v148H350zM510 718v-15a250 115 0 0 1 500 0v15z"/><path fill="none" stroke="#d3aa80" stroke-width="10" d="M510 703a250 115 0 0 1 500 0"/>`, { water: true, y: 640 }) });
  add('greater-london', 'tradition', { id: 'totally-thames', label: 'Totally Thames classic boats', site: 'Classic boats at St Katharine Docks during Totally Thames', colour: 'blue', months: [9], tags: ['thames', 'boats', 'festival'], svg: () => vista(1281, () => terrace(1282, 642) + `<path fill="#879286" d="M250 632h1100v25H250z"/>${sail(480, 756, .8, 3)}${sail(1080, 790, 1.05, 7)}${boat(780, 826, .63, '#aa6f4f')}<path fill="none" stroke="#d4ccb2" stroke-width="5" d="M310 664V830M1280 664V840"/>`, { water: true, y: 645 }) });
  add('greater-london', 'food', { id: 'borough-market', label: 'Borough Market', colour: 'green', tags: ['borough', 'market', 'produce'], svg: () => vista(1301, () => {
    let frame = '', produce = '';
    for (let i = 0; i < 6; i++) { const x = 300 + i * 170; frame += `<path fill="none" stroke="#40665d" stroke-width="10" d="M${x} 720V455l85-80 85 80V720"/>`; produce += `<path fill="#a98456" d="M${x + 5} 765h140v60h-140z"/><path fill="#e4d4ac" d="M${x} 739h150v26H${x}z"/>`; const r = rnd(1302 + i); for (let j = 0; j < 12; j++) produce += `<ellipse cx="${R(x + 20 + r() * 110)}" cy="${R(731 - r() * 20)}" rx="${i > 3 ? 17 : 8}" ry="8" fill="${['#94a65a', '#c1854c', '#a5a574', '#b85f4b', '#dbb175', '#d5a267'][i]}"/>`; }
    return `<path fill="#b7c6b1" opacity=".8" d="M280 460l540-110 540 110v20H280z"/>${frame}<path fill="none" stroke="#517369" stroke-width="6" d="M280 462H1360M280 480H1360M300 520H1320"/>${produce}${crowd(1308, 15, 710, ['#9e855f', '#637e78', '#a7986d'])}`;
  }, { path: false }) });
  add('greater-london', 'sport', { id: 'wimbledon-grass', label: 'Wimbledon grass courts', colour: 'green', tags: ['wimbledon', 'tennis', 'grass'], svg: () => vista(1321, () => pavilion(1030, 635, 270, '#c7b897') + `<path fill="#769359" d="M310 865l170-210h660l180 210z"/><path fill="none" stroke="#f0ebd3" stroke-width="5" d="M350 850l150-180h620l156 180zM390 790h825M460 715h685M655 790l70-75M949 790l-61-75"/><path fill="#5c7564" opacity=".45" d="M425 760h778v30H425z"/><path fill="none" stroke="#dfe4d1" stroke-width="4" d="M422 760h784"/><path fill="none" stroke="#7e8d73" stroke-width="2" d="${Array.from({ length: 40 }, (_, i) => `M${430 + i * 19} 762v27`).join('')}"/>${mv('ukbob', { ad: '4s', dy: '10px' }, '<circle cx="870" cy="770" r="8" fill="#d5db9a"/>')}`, { path: false }) });
  add('greater-london', 'heritage', { id: 'greenwich-observatory', label: 'Royal Observatory Greenwich', colour: 'red', tags: ['greenwich', 'observatory', 'time'], svg: () => vista(1341, p => `<path fill="#71925a" d="M-160 900V770Q830 625 1760 770v130z"/><path fill="#b27b5c" d="M490 705V435h510v270z"/><path fill="#676864" d="M465 443l95-96h335l126 96z"/>${sashes(532, 486, 7, 3, 61)}<path fill="${p.stone}" d="M510 435V345h112v90z"/>${sashes(532, 369, 2, 1, 52)}<path fill="#616b66" d="M493 345l74-44 74 44z"/><path stroke="#515c58" stroke-width="5" d="M567 320V219"/><circle class="x-ukglow" style="--ad:6s" cx="567" cy="270" r="20" fill="#b55748"/><path fill="#c1c9ae" d="M1060 705V545h160v160z"/><path fill="#82a091" d="M1050 546q0-113 90-129 90 16 90 129z"/><path fill="none" stroke="#d7ddc6" stroke-width="7" d="M1140 418v126"/>`, { time: 'dusk' }) });

  // Numbered parts sort before this base file. They are pure drawing builders,
  // sharing this one toolkit and U() sequence; only this base registers a pack.
  const appendPart = (part, build) => {
    if (typeof build !== 'function') return;
    build({ add: (county, kind, o) => add(county, kind, Object.assign({ ukPart: part }, o)),
      U, R, rnd, mv, full, ridge, canopy, lin, rad, linU, radU, cloud, streak,
      rays, haze, finish, birds, shimmer, puffs, stars, sun, grass, meadow, oak,
      lit, reflect, arch, sashes, battlements, town, sail, boat, chalk, vista, placeAtmosphere });
  };
  appendPart('hampshire-towns', typeof ukSouthEastPart2 === 'function' ? ukSouthEastPart2 : null);
  appendPart('kent-towns', typeof ukSouthEastPart3 === 'function' ? ukSouthEastPart3 : null);
  appendPart('north-hampshire', typeof ukSouthEastPart4 === 'function' ? ukSouthEastPart4 : null);

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
    '.anim-scene .x-ukynod { --an: ap-ukynod; --ad: 4.6s; }',
    '.anim-scene .x-ukysnow { --an: ap-ukysnow; --ad: 13s; --ae: linear; }',
    '@keyframes ap-ukynod { 0%,60%,100% { transform: rotate(0); } 72% { transform: rotate(8deg); } 84% { transform: rotate(-4deg); } }',
    '@keyframes ap-ukysnow { 0% { transform: translate(0,0); opacity: 0; } 15%,85% { opacity: 1; } 100% { transform: translate(var(--dx),var(--dy)); opacity: 0; } }',
    '.anim-scene .x-ukywalk { --an: ap-ukywalk; --ad: 19s; }',
    '.anim-scene .x-ukyleg { --an: ap-ukyleg; --ad: .9s; }',
    '@keyframes ap-ukywalk { 0%,100% { transform: translate(0,0); } 50% { transform: translate(var(--dx),var(--dy)); } }',
    '@keyframes ap-ukyleg { 0%,100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }',
    '.anim-scene .x-ukygrass { --an: ap-ukygrass; --ad: 5s; }',
    '@keyframes ap-ukygrass { 0%,100% { transform: skewX(-1.5deg); } 50% { transform: skewX(2.2deg); } }',
    '.anim-scene .x-ukybranch { --an: ap-ukybranch; --ad: 5s; }',
    '.anim-scene .x-ukywander { --an: ap-ukywander; --ad: 9s; }',
    '.anim-scene .x-ukywing { --an: ap-ukywing; --ad: .4s; }',
    '.anim-scene .x-ukydart { --an: ap-ukydart; --ad: 7s; }',
    '.anim-scene .x-ukypaddle { --an: ap-ukypaddle; --ad: 16s; }',
    '.anim-scene .x-ukyripple { --an: ap-ukyripple; --ad: 4s; }',
    '.anim-scene .x-ukypollen { --an: ap-ukypollen; --ad: 11s; --ae: linear; }',
    '@keyframes ap-ukybranch { 0%,100% { transform: rotate(-1deg); } 50% { transform: rotate(1.8deg); } }',
    '@keyframes ap-ukywander { 0%,100% { transform: translate(0,0) rotate(-4deg); } 30% { transform: translate(calc(var(--dx) * .4),var(--dy)) rotate(8deg); } 65% { transform: translate(var(--dx),-12px) rotate(-8deg); } }',
    '@keyframes ap-ukywing { 0%,100% { transform: scaleX(1); } 50% { transform: scaleX(.2); } }',
    '@keyframes ap-ukydart { 0%,100% { transform: translate(0,0); } 18%,28% { transform: translate(34px,-18px); } 42%,51% { transform: translate(var(--dx),var(--dy)); } 74%,83% { transform: translate(-25px,18px); } }',
    '@keyframes ap-ukypaddle { 0%,100% { transform: translate(0,0); } 50% { transform: translate(var(--dx),var(--dy)); } }',
    '@keyframes ap-ukyripple { 0%,100% { transform: scale(.7); opacity: .25; } 50% { transform: scale(1.3); opacity: .8; } }',
    '@keyframes ap-ukypollen { 0% { transform: translate(0,0) rotate(0); opacity: 0; } 20%,75% { opacity: .7; } 100% { transform: translate(var(--dx),var(--dy)) rotate(95deg); opacity: 0; } }',
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

  animRegisterPack({ id: 'uk-south-east', name: 'UK: South East & London', version: '2.4.0', css,
    description: 'Full-screen illustrated scenes across all nine South East counties and Greater London, together in one neighbouring-region gallery pack. County detection remains opt-in and every scene plays only in its own county.', items });
})();
