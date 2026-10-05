/* UK: Northern cities and the Peaks. Twenty full-screen place studies.
   The Hampshire toolkit supplies primitives, with a separate SVG id prefix.
   Each place has its own atmosphere, streetscape and ambient choreography.
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
  const stoneWindow = (x,y,w,h) => {
    const glass=U(), shape=`M${x} ${y+h}V${y+w*.65}Q${x+w*.08} ${y+w*.17} ${x+w/2} ${y}Q${x+w*.92} ${y+w*.17} ${x+w} ${y+w*.65}V${y+h}z`;
    let mullions=''; const n=w>100?4:2;
    for(let i=1;i<n;i++){const xx=x+w*i/n;mullions+=`M${xx} ${y+h}V${y+w*.7}q${w/n*.25}-${w*.18} ${w/n*.5}-${w*.2}`;}
    return `<defs>${linU(glass,[[0,'#7eb5c5'],[.4,'#365e78'],[1,'#263c55']],x,y,x+w,y+h)}</defs><path fill="url(#${glass})" stroke="#e4c6a0" stroke-width="${w>100?8:4}" d="${shape}"/><path class="hx-lit" d="${shape}"/><path fill="none" stroke="#cfb188" stroke-width="${w>100?4:2}" d="${mullions}M${x} ${y+h*.6}h${w}"/>${w>100?`<g fill="none" stroke="#e0be96" stroke-width="4"><circle cx="${x+w/2}" cy="${y+w*.45}" r="${w*.18}"/><path d="M${x+w*.35} ${y+w*.45}q${w*.15}-${w*.16} ${w*.3} 0q-${w*.15} ${w*.16}-${w*.3} 0"/></g>`:''}`;
  };
  const stoneWall = (d,colour,shade) => {
    const light=U(), blocks=U();
    return `<defs>${linU(light,[[0,colour],[1,shade]],350,200,1250,740)}<pattern id="${blocks}" width="66" height="32" patternUnits="userSpaceOnUse"><path fill="none" stroke="#edd2b2" stroke-width="1" opacity=".28" d="M0 0H66M0 16H66M0 32H66M33 0v16M12 16v16M56 16v16"/><path fill="#563f42" opacity=".1" d="M0 1h31v13H0zM34 17h20v13H34z"/></pattern></defs><path fill="url(#${light})" d="${d}"/><path fill="url(#${blocks})" d="${d}"/>`;
  };
  const paving = () => `<path fill="#bdb5a3" d="M-160 738H1760V900H-160z"/><path stroke="#e1d5bd" stroke-width="3" opacity=".7" fill="none" d="M-160 815H1760M-160 865H1760M100 900l330-162M490 900l143-162M960 900l-42-162M1390 900l-274-162"/>`;
  const streetTree = (x,y,k,seed) => oak(x,y,k,'#164e48','#38865b','#a9c861',seed);
  const glazed = (x,y,w,h,cols,rows) => {
    const grid=U(), glass=U(), dx=w/cols, dy=h/rows;
    return `<defs>${linU(glass,[[0,'#cdf3ed'],[.32,'#46a8b2'],[.65,'#357c99'],[1,'#e3c69c']],x,y,x+w,y+h)}<pattern id="${grid}" width="${dx}" height="${dy}" patternUnits="userSpaceOnUse"><path d="M0 0H${dx}V${dy}" fill="none" stroke="#d8e9df" stroke-width="3"/></pattern></defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${glass})"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${grid})"/>${Array.from({length:9},(_,i)=>lit(x+8+(i*3%cols)*dx,y+8+(i*7%rows)*dy,Math.max(8,dx-16),Math.max(8,dy-14))).join('')}`;
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
    let glazing='',pots='';
    for(let i=0;i<16;i++)glazing+=`M${473+i*48} 715V${i<2||i>13?490:380}`;
    for(let i=0;i<5;i++){const x=530+i*139;pots+=`<path fill="#b78668" d="M${x-24} 712l6 25h36l6-25z"/>`+mv('uksway2',{ad:`${5+i*.4}s`,d:`-${i}s`,to:`${x}px 714px`},`<path fill="#368a6c" d="M${x} 714q-60-34-39-77 31 17 39 77-4-98 30-104 19 39-30 104 36-70 57-40 8 28-57 40z"/>`);}
    let palms='';for(let i=0;i<6;i++){const x=515+i*116,y=694;palms+=`<path stroke="#74674a" stroke-width="9" d="M${x} ${y}q-10-55 3-112"/><path fill="#527454" d="M${x} ${y-112}q-68-89-102-5 64-25 102 5-42-127 42-140-23 70-42 140 83-115 125-42-78 0-125 42z"/>`;}
    return paving()+`<g${close?' transform="translate(-255 -82) scale(1.2)"':''}><path fill="#73bfc2" opacity=".78" d="M450 725V553q0-189 93-224h608q93 35 93 224v172z"/><path fill="#d7f5e9" opacity=".2" d="M480 580l150-235h49L530 718h-50zM890 722l151-377h65L968 722z"/>${palms}${pots}<path fill="none" stroke="#d2ece2" stroke-width="2" opacity=".55" d="${glazing}"/><g fill="none" stroke="#d2ac7b" stroke-width="12">${ribs}</g><g fill="none" stroke="#805e48" stroke-width="3">${ribs}</g><path stroke="#d5dccb" stroke-width="3" fill="none" d="M450 552h794M450 628h794M491 403h718"/><path fill="#cfbda0" d="M440 722h816v15H440z"/></g>${streetTree(close?1330:279,858,.77,5051)}`;
  };
  const kelham = close => {
    let windows='';for(let i=0;i<9;i++)windows+=arch(465+i*71,579,34,91,'#dfcaaa');
    const converter=`<path fill="#48565a" d="M1085 720l20-142h71l30 142z"/><path fill="#667578" d="M1081 582q-33-40 0-103l30-38-7-58h57l-5 61 36 41q23 64-14 97z"/><path fill="none" stroke="#a8aea2" stroke-width="9" d="M1080 550h107M1098 490h79"/><path fill="#48565a" d="M1072 384l51-33h65l-31 33z"/>`;
    return paving()+`<path fill="#ae795e" d="M400 730V542h758v188z"/><path fill="#645d55" d="M374 546l100-100h590l112 100z"/><path fill="#936e56" d="M442 540V258h41v282z"/><path fill="#c39b77" d="M435 253h56v14h-56z"/>${windows}${close?`<g transform="translate(-460 -165) scale(1.3)">${converter}</g>`:converter}${streetTree(260,851,.71,5062)}`;
  };
  const whitworthHall = close => {
    let bays='';for(let i=0;i<5;i++)bays+=stoneWindow(810+i*71,562,42,110);
    const face=`<path fill="#bc9d76" d="M390 724V382l187-165 184 165v342zM756 723V488h440v235z"/><path fill="#58676b" d="M371 391l206-190 205 190-20 7-185-167-185 167zM756 488l72-93h280l96 93z"/><path fill="#e0c5a0" d="M389 709h816v20H389z"/>${stoneWindow(462,374,226,237)}<path fill="#e0c5a0" d="M555 611v-244h12v244zM611 611V367h12v244z"/>${bays}<path fill="#ad9271" d="M352 724V412h46v312zM747 724V413h36v311z"/><path fill="#ddc39b" d="M346 412l29-68 29 68zM740 413l27-64 25 64z"/><path fill="#455452" d="M524 724v-81q55-69 109 0v81z"/>`;
    let detail='';
    for(const x of [409,725])detail+=`<path fill="#d9be94" d="M${x} 719V414h15v305z"/><path fill="#8e765e" d="M${x+15} 414l12 18v287h-12z"/><path fill="#e3caa3" d="M${x-3} 426h26v8h-26zM${x-3} 568h26v8h-26z"/>`;
    for(let i=0;i<5;i++)detail+=`<path fill="#d9be94" d="M${790+i*78} 718V525h9v193z"/><path stroke="#e6d0ab" stroke-width="4" d="M${790+i*78} 506l4-28 5 28"/>`;
    detail+=`<path fill="none" stroke="#dec49c" stroke-width="4" d="M396 398l181-164 180 164M409 638h94M650 638h90M793 697h381M512 724v-91q64-96 132 0v91"/><path fill="#bfaa87" d="M507 724h141l24 14H484z"/><path fill="#d8c4a2" d="M484 738h188l24 14H460z"/>`;
    return paving()+(close?`<g transform="translate(-75 -87) scale(1.12)">${face}${detail}</g>`:face+detail)+streetTree(close?1280:275,849,.72,5073);
  };
  const rylands = close => {
    // Deansgate corner: a tall reading-room gable and traceried oriel bays,
    // octagonal turrets and open parapets. No invented rose window or roofs.
    let tracery='',rail='';
    for(let i=0;i<10;i++)rail+=`M${758+i*38} 371v-39q14-26 28 0v39`;
    for(const x of [762,1012]){
      tracery+=stoneWall(`M${x} 605V405l21-20h119l20 20v200l-27 24h-111z`,'#cd9979','#81585c');
      for(let i=0;i<3;i++)tracery+=stoneWindow(x+19+i*43,422,32,135);
      tracery+=`<path fill="#714e55" d="M${x-8} 610h176v13h-176z"/><path fill="#ac765e" d="M${x+22} 623l53 49 51-49z"/>`;
    }
    const face=stoneWall('M412 744V292l159-145 157 145v452zM728 744V356l474 72v316z','#c09173','#8e6268')
      +`<path fill="none" stroke="#e3b78b" stroke-width="9" d="M407 297l164-151 160 150M728 365l474 70M408 744h794"/>`
      +stoneWindow(490,292,162,287)+stoneWindow(510,627,123,117)
      +stoneWall('M394 744V228l22-20 23 20v516zM701 744V230l22-20 24 20v514z','#c39270','#77535d')
      +`<path fill="#d1a281" d="M390 231v-24h11v12h11v-12h12v12h12v-12h11v24zM696 230v-24h12v12h12v-12h12v12h12v-12h10v24z"/>`
      +tracery+`<g fill="none" stroke="#bc9278" stroke-width="5">${rail}</g><path stroke="#705660" stroke-width="8" d="M747 374l453 61"/>`
      +stoneWindow(793,680,94,64)+stoneWindow(1043,680,94,64)
      +`<path fill="#3e3843" d="M938 744v-99q35-62 70 0v99z"/><path fill="none" stroke="#dab08b" stroke-width="5" d="M927 744v-108q46-86 92 0v108"/><path fill="#946c66" d="M757 744v-91h19v91zM1157 744V462h19v282z"/>`
      +Array.from({length:12},(_,i)=>`<path stroke="#6d535a" stroke-width="4" d="M${421+i*63} 780v-31"/>`).join('')+`<path stroke="#82616a" stroke-width="5" d="M414 760h763"/>`;
    return paving()+(close?`<g transform="translate(-355 -96) scale(1.25)">${face}</g>`:face);
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
    // A receding gritstone escarpment, not a row of identical upright slabs.
    // Rounded buttresses, bedding joints and fallen blocks belong to the edge.
    const r=rnd(5160),face=U(),clip=U();
    const outline='M300 780L329 622Q318 577 373 552L437 537L438 519Q496 473 553 492L642 511L646 493Q702 482 748 508L832 494L849 511Q897 521 935 493L968 466Q1043 477 1072 492L1119 478Q1164 461 1189 473L1206 473L1242 466L1303 460L1348 470L1452 466L1471 515L1423 575L1371 620L1298 643L1268 664L1174 673L1157 707L1063 718L1027 705L940 730L913 754L811 744L776 767L661 754L616 784L512 768L459 803L375 790z';
    let grain='',joints='',scree='';
    for(let i=0;i<65;i++){const x=R(315+r()*1115),y=R(495+r()*288),w=R(2+r()*5);grain+=`M${x} ${y}h${w}`;}
    for(let i=0;i<11;i++){const x=R(380+i*95+r()*39),y=R(530+r()*24-i*5),h=R(58+r()*102);joints+=`M${x} ${y}l-8 ${R(h*.35)} 13 ${R(h*.31)}-19 ${R(h*.34)}`;}
    for(let i=0;i<29;i++){const x=R(210+r()*1290),y=R(768+r()*89),w=R(7+r()*37);scree+=`<path fill="${i%2?'#b2a084':'#677269'}" d="M${x} ${y}l${R(w*.3)}-${R(w*.45)} ${R(w*.6)}-${R(w*.13)} ${R(w*.2)} ${R(w*.53)}-${R(w*.8)} ${R(w*.2)}z"/><path stroke="#d9c4a1" stroke-width="2" d="M${x+R(w*.3)} ${y-R(w*.45)}l${R(w*.6)}-${R(w*.13)}"/>`;}
    const edge=`<defs>${linU(face,[[0,'#dfbc87'],[.35,'#b39778'],[1,'#677876']],350,475,930,815)}<clipPath id="${clip}"><path d="${outline}"/></clipPath></defs><path fill="url(#${face})" d="${outline}"/><g clip-path="url(#${clip})"><path fill="#594f4e" opacity=".42" d="M330 623q124-49 246-34l19 39-206 13-46 136zM650 525l-3 91 62 69-38 94-58-20 18-182zM852 517l-20 95 56 51-23 97 59 2 5-91-55-62 16-88zM1127 491l-13 58 34 39-26 106 47-21 15-87-38-41 10-58z"/><path fill="#e7cc9f" opacity=".62" d="M345 590q79-54 162-64l131 11-7 27-131-18-139 61zM943 517l35-29 95 23-7 14-77-17zM1221 490l97-17 113 11-22 17-113-13z"/><path fill="none" stroke="#5d6259" opacity=".66" stroke-width="4" d="M300 649q158-45 345-9t215-38 183-37 428-41M300 703q155-20 291-10t248-38 188-9 444-59M300 752q200-41 381-25t248-38 278-42 264-25${joints}"/><path fill="none" stroke="#e1c59f" opacity=".5" stroke-width="2" d="M334 637q156-48 288-12t229-39M961 564q185-6 471-47M355 727q118-25 217-13M953 674q156-38 375-52"/><path stroke="#514f49" opacity=".25" stroke-width="2" d="${grain}"/></g><path fill="#839964" d="M369 552l68-15 1-18q58-46 115-27l89 19 4-18q56-11 102 15l84-14 17 17q48 10 86-18l33-27q75 11 104 26l47-14q45-17 70-5h17l36-7 61-6 45 10 104-4-20 17-96 5-28-9-100 19-30-9-93 26-37-15-82-6-48 26-61 17-63-13-100 3-74-13-28 16-136-10-48 33z"/>`;
    const mill=`<ellipse cx="532" cy="842" rx="125" ry="28" fill="#354c45" opacity=".25"/><path fill="#9c9b84" fill-rule="evenodd" d="M630 760a99 99 0 1 0-198 0 99 99 0 1 0 198 0M550 760a19 19 0 1 1-38 0 19 19 0 1 1 38 0"/><path fill="none" stroke="#d8c8a6" stroke-width="5" d="M449 734q17-74 94-59"/><path fill="none" stroke="#727b6b" stroke-width="3" d="M456 770q3 60 59 73M565 682l11 31M604 736l-17 4"/>`;
    return ridge('#789b86',640,91,5,5151)+`<path fill="#a3b574" d="M-160 900V731q940-70 1920 90v79z"/><path fill="#86a870" d="M-160 900V821Q200 755 330 770Q665 799 932 735T1425 583L1471 515Q1600 561 1760 647V900z"/><path fill="none" stroke="#b7c580" stroke-width="5" opacity=".5" d="M-160 842Q250 780 345 799M953 771q278-45 475-157"/>`+(detail?`<g transform="translate(-100 -31) scale(1.08)">${edge}</g>`:edge)+scree+`<path fill="#4d805a" d="M-160 900V869q611-54 1920 5v26z"/>${detail?mill:grass(5154,55,40,1500,894,83,'#adab50')}${detail?grass(5156,32,920,1600,900,65,'#b6a652'):`<g transform="translate(290 334) scale(.58)">${mill}</g>`}`;
  };
  const mamTor = detail => {
    let stones='';for(let i=0;i<13;i++){const y=651+i*19,x=917-(i*i*1.65),w=15+i*4;stones+=`M${x} ${y}l${w} 4-4 9-${w} -3z`;}
    let fields='';for(let i=0;i<14;i++){const x=-160+i*140,y=661+(i%3)*17;fields+=`<path fill="${['#78a278','#a1b569','#5a927d','#c0bd79'][i%4]}" opacity=".75" d="M${x} ${y}l108-15 67 28-138 25z"/><path stroke="#537b71" stroke-width="2" fill="none" d="M${x} ${y}l108-15 67 28"/>`;}
    return ridge('#6995ae',594,89,6,5171)+ridge('#528c86',694,95,5,5172)+fields+`<path fill="#a2b866" d="M-160 900V793Q391 647 730 658C803 637 847 552 906 526Q949 511 980 520C1025 560 1097 618 1158 635L1760 757V900z"/><path fill="#548575" d="M980 520C1025 560 1097 618 1158 635L1760 757v143H994l-129-90 79-109z"/><path fill="#8b9d6c" d="M1014 565q62 45 95 111l-46-14-26-40-32-14zM1109 676q61 48 107 55l-65 9-34-30-40-21z"/><path fill="none" stroke="#b2c785" opacity=".6" stroke-width="7" d="M1030 589q62 83 399 158M1035 651q21 81 347 148M992 729q106 101 340 114"/><path fill="#e0c791" d="M667 900Q763 765 939 651l32-131 13 9-27 138Q821 782 801 900z"/><path fill="#969989" stroke="#ded5b7" stroke-width="2" d="${stones}"/><path stroke="#5f7159" stroke-width="3" fill="none" d="M800 860l65-129 65-69"/>${detail?`<path fill="#99917a" d="M240 876l52-94 63-13 75 39-9 69z"/><path fill="#c1b99a" d="M292 782l63-13 75 39-90 7z"/>${grass(5179,30,50,610,900,113,'#807d4d')}`:meadow(5181,23,40,540,817,893,['#d3bd83','#b5b798'])}`;
  };
  // Deliberate place palettes and sky layouts: the disc, cloud formations and
  // horizon are not stamped in the same position behind every landmark.
  const atmospheres = {
    diamond: ['#116ca2','#6dcbd5','#fff0c1',1250,180,'city'],
    'arts-tower': ['#345eb4','#98c5ed','#fae6d0',330,260,'city'],
    'winter-garden': ['#187f9a','#a0ded5','#fff4d3',1180,330,'city'],
    kelham: ['#385777','#a4bdc4','#ffce91',1180,470,'brick'],
    'whitworth-hall': ['#4366ad','#b3d8eb','#ffecba',1170,225,'city'],
    'john-rylands': ['#435190','#c3a6c5','#ffd49b',300,350,'brick'],
    'whitworth-gallery': ['#167d8f','#91cfb6','#fff0b6',940,185,'park'],
    castlefield: ['#24639a','#78c5d6','#f7dba5',280,320,'brick'],
    'stanage-edge': ['#3578b8','#b8d6e7','#ffdfa8',1230,220,'moor'],
    'mam-tor': ['#295b88','#72b2bd','#f6d089',440,430,'moor'],
  };
  const bench = (x,y,k=1) => `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cx="65" cy="8" rx="91" ry="9" fill="#203c42" opacity=".14"/><path fill="#b96c39" d="M0-58h138v12H0zM0-39h138v12H0zM-8-16h154v12H-8z"/><path stroke="#28444e" stroke-width="7" d="M10-47V0M125-47V0M-8-21v21M146-21v21"/></g>`;
  const bicycle = (x,y,k=1) => `<g transform="translate(${x} ${y}) scale(${k})"><g fill="none" stroke="#2a414c" stroke-width="4"><circle cx="-35" cy="-24" r="24"/><circle cx="47" cy="-24" r="24"/><path stroke="#d9893b" stroke-width="5" d="M-35-24l25-38 23 38h-48l12-49M13-24l26-42 8 42"/><path d="M33-77h17M-27-74h20"/></g></g>`;
  const walker = (x,y,k,coat,phase) => `<g transform="translate(${x} ${y}) scale(${k})"><ellipse rx="12" ry="3" fill="#183943" opacity=".2"/><g fill="none" stroke="#33434e" stroke-width="6" stroke-linecap="round">${mv('ukstep',{ad:'1.8s',d:`-${phase}s`,to:'0px -26px'},'<path d="M0-26L-9-2"/>')}${mv('ukstep',{ad:'1.8s',d:`-${phase+.9}s`,to:'0px -26px'},'<path d="M0-26L9-2"/>')}</g><path fill="${coat}" d="M-9-52q9-8 18 0l4 30h-26z"/><circle cy="-64" r="8" fill="#b38d71"/><path fill="#34424c" d="M-8-68q8-10 16 0v4H-8z"/></g>`;
  const passers = (seed,y,coat) => { const r=rnd(seed); return Array.from({length:3},(_,i)=>mv('ukstroll',{ad:`${28+i*7}s`,d:`-${i*8}s`,dx:`${i%2?-180:220}px`},walker(440+i*270+r()*70,y, .6+i*.13,coat,i*.4))).join(''); };
  const lamps = (x,y) => `<path stroke="#304e59" stroke-width="7" fill="none" d="M${x} ${y}v-155q0-20 24-20h17"/><path fill="#b0c7c4" d="M${x+21} ${y-178}h36v12h-36z"/><ellipse class="hx-lit" cx="${x+39}" cy="${y-164}" rx="19" ry="5"/>`;
  const skyline = (seed,type) => { const r=rnd(seed);let s=''; for(let x=-160;x<1760;x+=93){const h=R(35+r()*90);s+=`<path fill="${type==='brick'?'#9d7282':'#648d9b'}" d="M${x} 655v-${h}h78v${h}z"/><path fill="#b1c4c7" opacity=".45" d="M${x+5} ${655-h+8}h57v7h-57z"/>`;if(type==='brick')s+=`<path fill="#745c71" d="M${x-4} ${655-h}l43-34 43 34z"/>`; }return s; };
  const blooms = (seed,x0,x1,y) => meadow(seed,24,x0,x1,y-10,y+20,['#ffbf43','#ea6281','#e7edba']);
  const locality = (place,v,seed) => {
    if(place==='diamond') return bench(v?305:1110,837,.7)+bicycle(v?1220:350,837,.85)+passers(seed,792,'#e9a541')+mv('ukglow',{ad:'8s'},'<path fill="#f1ffff" opacity=".12" d="M426 290l23 0 264 407h-55zM921 289h28l264 407h-56z"/>');
    if(place==='arts-tower') return lamps(v?1210:395,849)+bench(v?1110:400,867,.65)+passers(seed,793,'#ba5670')+blooms(seed+1,1140,1370,869);
    if(place==='winter-garden') return bench(v?240:1175,844,.7)+passers(seed,798,'#cc6a41')+blooms(seed+2,290,410,862)+mv('ukglow',{ad:'11s'},'<path fill="#fff2c7" opacity=".15" d="M521 434l45-61 254 348h-87z"/>');
    if(place==='kelham') return `<path fill="#59636a" d="M-160 879l730-108h19L-160 896zM210 900l481-129h19L310 900z"/><path fill="none" stroke="#beb7a3" stroke-width="3" d="M-160 885l735-109M256 900l442-124"/>`+bench(1250,856,.68)+passers(seed,800,'#4d8e9b')+mv('ukdrift',{ad:'23s',dx:'35px'},haze(711,70,'#f5d49a',.22));
    if(place==='whitworth-hall') return lamps(1190,864)+bench(1070,863,.72)+blooms(seed,220,420,890)+passers(seed,790,'#4d8cab');
    if(place==='john-rylands') return `<path fill="#68718a" d="M-160 886V847h1920v53H-160z"/><path stroke="#cfbda5" stroke-width="4" d="M-160 846H1760"/>`+lamps(1250,846)+passers(seed,815,'#b74965')+mv('ukshim',{ad:'5s'},'<path fill="#ffe7b5" opacity=".2" d="M721 841l127-4 119 40H658z"/>');
    if(place==='whitworth-gallery') return bench(v?1080:600,850,.7)+blooms(seed,840,1100,886)+mv('ukflutter',{ad:'8s',d:'-3s'},'<path fill="#f0b446" d="M980 744q-22-30-30-9-3 18 30 14 27-30 32-12 2 19-32 12z"/>')+mv('ukfall',{ad:'13s',dx:'-65px',d:'-4s'},'<path fill="#edaf51" d="M480 474q-17-13-22 8 16 9 22-8z"/>');
    if(place==='castlefield') return `<path stroke="#ecd29d" stroke-width="4" fill="none" d="M-160 847Q650 830 1760 857"/>`+mv('ukstroll',{ad:'44s',dx:'-300px'},`<g transform="translate(${v?640:1000} 850)"><path fill="#d96b46" d="M-95-9H97L82 18H-76z"/><path fill="#274d60" d="M-64-36H62v27H-64z"/><path fill="#f3ce7e" d="M-50-31h26v17h-26zM-9-31h26v17H-9zM32-31h21v17H32z"/><path fill="#efe6ce" d="M-99-12H100v5H-99z"/></g>`)+shimmer(seed,16,330,1150,810,889,'#f9c485',55)+passers(seed,394,'#ecb151');
    if(place==='stanage-edge') return `<path fill="#723f79" d="M-160 900v-32q210-73 459 14l24 18zM1150 900q260-71 610-30v30z"/>`+blooms(seed,-80,230,885)+grass(seed+1,22,1180,1740,900,104,'#bc9646')+mv('uksoar',{ad:'27s',dx:'140px',dy:'-36px'},'<path fill="#34434e" d="M859 224q-41-26-80-8 47-3 77 20l5 10 6-9q33-23 73-20-45-20-78 8z"/>')+mv('ukdrift',{ad:'31s',dx:'70px'},haze(631,90,'#f4dbbc',.22));
    return `<path fill="none" stroke="#e9dca7" stroke-width="3" opacity=".5" d="M-160 641q380-54 805 3M1020 652q410-96 740 20"/>`+grass(seed,40,-100,520,900,82,'#b29f4f')+mv('uksoar',{ad:'33s',dx:'-120px',dy:'-18px'},'<path fill="#263f50" d="M1220 330q-30-17-59-8l58 16 7 8 4-9 61-16q-43-6-65 9z"/>')+mv('ukdrift',{ad:'36s',dx:'85px'},haze(604,133,'#dff1e3',.36));
  };
  const northernScene = (place,v,draw,seed) => {
    const [top,mid,base,sx,sy,type]=atmospheres[place],sky=U(),glow=U();
    const evening=!!v, moon=evening&&(place==='arts-tower'||place==='john-rylands'),urban=type==='city'||type==='brick';
    const skyStops=evening?[[0,'#29345f'],[.45,top],[.78,'#dc8b97'],[1,'#ffcb85']]:[[0,top],[.58,mid],[1,base]];
    let air='';
    if(place==='diamond'||place==='stanage-edge') air=cloud(v?220:980,118,v?.72:1.1,'#b2d9e5',.8,61,seed%17)+cloud(v?1360:300,295,.62,'#c7e5e4',.7,49,11);
    else if(place==='winter-garden'||place==='whitworth-gallery') air=streak(v?300:1120,100,260,'#e4fff0',.56,83)+streak(v?1170:320,245,190,'#effad4',.47,64);
    else if(place==='mam-tor') air=mv('ukdrift',{ad:'73s',dx:'130px'},'<path fill="#cee2e4" opacity=".6" d="M-160 215q250-60 580 30t600-20 740 0v22q-430-11-750 20t-570-20-600 0z"/>');
    else air=cloud(v?1250:200,155,.8,'#c2b5ca',.7,70,17)+streak(v?460:1100,270,350,'#fde6d7',.5,79);
    const light=moon?`<path fill="#e6f1e6" d="M${1600-sx} ${sy-100}a25 25 0 1 0 16 44a21 21 0 0 1-16-44z"/>`:sun(v?1600-sx:sx,v?sy+110:sy,v?47:32,'#fff4c9','#ffc673');
    const far=urban?skyline(seed,type):ridge(place==='mam-tor'?'#588ea1':'#899fc2',565,130,9,seed);
    const middle=urban?haze(592,140,'#ffe7c0',.24):canopy(type==='park'?'#24725b':'#528a83',660,type==='park'?64:14,seed+2,null,null,900,'#97c486');
    const foreground=urban?`<path fill="#285c60" d="M-160 900v-27h308l42 27zM1410 900l35-22h315v22z"/>${blooms(seed+5,-140,115,907)}${grass(seed+6,18,1480,1760,909,51,'#53a775')}`:grass(seed+7,32,-160,170,908,76,'#3a7562')+grass(seed+8,32,1480,1760,907,61,'#476d50');
    return `<g${evening?' class="hx-evening"':''}><defs>${lin(sky,skyStops)}${radU(glow,[[0,'#ffda96',.17],[1,'#ffda96',0]],v?1600-sx:sx,sy,780)}</defs>`+full(`url(#${sky})`)+stars(seed,27,330)+light+air
      +mv('ukpar',{ad:'63s',dx:'6px'},far)+mv('ukpar',{ad:'47s',dx:'12px'},middle)
      +mv('ukpar',{ad:'39s',dx:'18px'},draw(v))+locality(place,v,seed)
      +mv('ukpar',{ad:'31s',dx:'28px'},foreground)+`<rect width="1600" height="900" fill="url(#${glow})"/>`+finish(.3)+'</g>';
  };
  const studies = [
    ['south-yorkshire','Sheffield','diamond','The Diamond','signature',diamond,['university','engineering','lattice'],'The engineering building across its forecourt','A closer study of the diamond lattice'],
    ['south-yorkshire','Sheffield','arts-tower','Arts Tower','landmark',artsTower,['university','modernism','tower'],'The slender tower and lower library wing','Evening light through the curtain wall'],
    ['south-yorkshire','Sheffield','winter-garden','Sheffield Winter Garden','landmark',winterGarden,['glasshouse','timber','plants'],'The timber arches across the city square','Closer to the planted glasshouse ribs'],
    ['south-yorkshire','Sheffield','kelham','Kelham Island Museum','heritage',kelham,['industry','steel','museum'],'The museum and its industrial silhouettes','The Bessemer converter in the foreground'],
    ['greater-manchester','Manchester','whitworth-hall','Whitworth Hall','signature',whitworthHall,['university','gothic','hall'],'The Gothic hall across its forecourt','The traceried window and entrance at dusk'],
    ['greater-manchester','Manchester','john-rylands','John Rylands Library','landmark',rylands,['university','library','gothic'],'The reading-room gable and Deansgate corner','The traceried oriel bays at dusk'],
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
      svg:()=>northernScene(place,!!v,draw,5200+i*23+v)},geo));
  }
  const css = [
    '.anim-scene .x-ukstep { --an: ap-ukstep; --ad: 1.8s; }',
    '.anim-scene .x-ukstroll { --an: ap-ukstroll; --ad: 32s; --ae: linear; }',
    '.anim-scene .x-uksoar { --an: ap-uksoar; --ad: 27s; }',
    '@keyframes ap-ukstep { 0%,100% { transform: rotate(-18deg); } 50% { transform: rotate(18deg); } }',
    '@keyframes ap-ukstroll { 0%,100% { transform: translateX(calc(var(--dx,220px) * -.5)); opacity:0; } 12% { opacity:1; } 88% { transform: translateX(calc(var(--dx,220px) * .5)); opacity:1; } 95% { transform: translateX(calc(var(--dx,220px) * .5)); opacity:0; } }',
    '@keyframes ap-uksoar { 0%,100% { transform: translate(0,0) rotate(-3deg); } 50% { transform: translate(var(--dx,120px),var(--dy,-30px)) rotate(4deg); } }',
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

  animRegisterPack({id:'uk-north-west',name:'UK: Northern cities & Peaks',version:'1.1.1',description:'Sheffield, Manchester and nearby Peak District landscapes. Twenty animated place studies with university architecture and industrial heritage.',css,items});
})();
