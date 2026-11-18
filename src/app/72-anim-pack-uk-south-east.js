/* Regional openings for South East England and London. Each numbered part
   supplies its own seasonal artwork. All parts share one drawing toolkit and
   gradient-id sequence, and register together in their original order. */
(function () {
  const NATION = 'GB-ENG';
  const items = [];
  const NAMES = { hampshire: 'Hampshire', kent: 'Kent', 'east-sussex': 'East Sussex', 'west-sussex': 'West Sussex', surrey: 'Surrey', 'isle-of-wight': 'Isle of Wight', berkshire: 'Berkshire', oxfordshire: 'Oxfordshire', buckinghamshire: 'Buckinghamshire', 'greater-london': 'Greater London' };
  /** One county element. months: only in those months (a dated tradition). */
  const add = (county, kind, o) => {
    const months = o.months || null;
    const area = ukCounty(county), region = area.region;
    items.push(Object.assign({
      slot: 'opening', mood: 'calm', intensity: 'subtle', theme: 'any', season: 'any', region: [NATION], reduced: 'static', priority: 1, full: true,
      county, ukRegion: region, ukKind: kind, signature: kind === 'signature', site: o.label,
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

  /* ---------- shared framing for the remaining South East counties ----------
     These are drawing helpers, not new registry or opening behaviour. All
     moving ground bands extend from -160 to 1760. Subjects stay in the
     central 1200 units; each render owns every gradient and reflection id. */
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
  // Numbered parts sort before this base file. They are pure drawing builders,
  // sharing this one toolkit and U() sequence; only this base registers a pack.
  // T.K is the rich nature kit (71-anim-uk-nature-kit.js), built on this toolkit.
  const T = { U, R, rnd, mv, full, ridge, canopy, lin, rad, linU, radU, cloud, streak,
    rays, haze, finish, birds, shimmer, puffs, stars, sun, grass, meadow, oak,
    lit, reflect, arch, sashes, battlements, town, sail, boat, chalk, vista, placeAtmosphere };
  T.K = typeof ukNatureKit === 'function' ? ukNatureKit(T) : null;
  const appendPart = (part, build) => {
    if (typeof build !== 'function') return;
    build(Object.assign({}, T, { add: (county, kind, o) => add(county, kind, Object.assign({ ukPart: part }, o)) }));
  };
  appendPart('kent-towns', typeof ukSouthEastPart3 === 'function' ? ukSouthEastPart3 : null);
  // the 20 Yateley and Fleet views (4 views each, restored 9 Oct)
  appendPart('yateley-common-v1', typeof ukSouthEastYateleyCommonV1 === 'function' ? ukSouthEastYateleyCommonV1 : null);
  appendPart('yateley-common-v2', typeof ukSouthEastYateleyCommonV2 === 'function' ? ukSouthEastYateleyCommonV2 : null);
  appendPart('yateley-common-v3', typeof ukSouthEastYateleyCommonV3 === 'function' ? ukSouthEastYateleyCommonV3 : null);
  appendPart('yateley-common-v4', typeof ukSouthEastYateleyCommonV4 === 'function' ? ukSouthEastYateleyCommonV4 : null);
  appendPart('wyndhams-pool-v1', typeof ukSouthEastWyndhamsPoolV1 === 'function' ? ukSouthEastWyndhamsPoolV1 : null);
  appendPart('wyndhams-pool-v2', typeof ukSouthEastWyndhamsPoolV2 === 'function' ? ukSouthEastWyndhamsPoolV2 : null);
  appendPart('wyndhams-pool-v3', typeof ukSouthEastWyndhamsPoolV3 === 'function' ? ukSouthEastWyndhamsPoolV3 : null);
  appendPart('wyndhams-pool-v4', typeof ukSouthEastWyndhamsPoolV4 === 'function' ? ukSouthEastWyndhamsPoolV4 : null);
  appendPart('yateley-green-v1', typeof ukSouthEastYateleyGreenV1 === 'function' ? ukSouthEastYateleyGreenV1 : null);
  appendPart('yateley-green-v2', typeof ukSouthEastYateleyGreenV2 === 'function' ? ukSouthEastYateleyGreenV2 : null);
  appendPart('yateley-green-v3', typeof ukSouthEastYateleyGreenV3 === 'function' ? ukSouthEastYateleyGreenV3 : null);
  appendPart('yateley-green-v4', typeof ukSouthEastYateleyGreenV4 === 'function' ? ukSouthEastYateleyGreenV4 : null);
  appendPart('fleet-pond-v1', typeof ukSouthEastFleetPondV1 === 'function' ? ukSouthEastFleetPondV1 : null);
  appendPart('fleet-pond-v2', typeof ukSouthEastFleetPondV2 === 'function' ? ukSouthEastFleetPondV2 : null);
  appendPart('fleet-pond-v3', typeof ukSouthEastFleetPondV3 === 'function' ? ukSouthEastFleetPondV3 : null);
  appendPart('fleet-pond-v4', typeof ukSouthEastFleetPondV4 === 'function' ? ukSouthEastFleetPondV4 : null);
  appendPart('basingstoke-canal-fleet-v1', typeof ukSouthEastFleetCanalV1 === 'function' ? ukSouthEastFleetCanalV1 : null);
  appendPart('basingstoke-canal-fleet-v2', typeof ukSouthEastFleetCanalV2 === 'function' ? ukSouthEastFleetCanalV2 : null);
  appendPart('basingstoke-canal-fleet-v3', typeof ukSouthEastFleetCanalV3 === 'function' ? ukSouthEastFleetCanalV3 : null);
  appendPart('basingstoke-canal-fleet-v4', typeof ukSouthEastFleetCanalV4 === 'function' ? ukSouthEastFleetCanalV4 : null);

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
    '.anim-scene .x-ukbob { --an: ap-ukbob; --ad: 3s; }',
    '.anim-scene .x-ukheel { --an: ap-ukheel; --ad: 4s; }',
    '.anim-scene .x-ukglow { --an: ap-ukglow; --ad: 6s; }',
    '.anim-scene .x-ukrise { --an: ap-ukrise; --ad: 9s; --ai: 1; --ae: cubic-bezier(.2, .7, .3, 1); }',
    '.anim-scene .x-uksway { --an: ap-uksway; --ad: 4s; }',
    '.anim-scene .x-uksway2 { --an: ap-uksway2; --ad: 6s; }',
    '.anim-scene .x-ukfall { --an: ap-ukfall; --ad: 9s; --ae: linear; }',
    '.anim-scene .x-ukmist { --an: ap-ukdrift; --ad: 20s; }',
    '.anim-scene .x-ukflutter { --an: ap-ukflutter; --ad: 7s; }',
    '.anim-scene .x-ukspin { --an: ap-ukspin; --ad: 40s; }',
    '.anim-scene .x-ukwheel { --an: ap-ukwheel; --ad: 1.4s; --ae: linear; }',
    '.anim-scene .x-uktail { --an: ap-uktail; --ad: 2.8s; }',
    '.anim-scene .x-ukgraze { --an: ap-ukgraze; --ad: 5s; }',
    '.anim-scene .x-uknod { --an: ap-uknod; --ad: 6s; }',
    '@keyframes ap-uktail { 0%, 100% { transform: rotate(-7deg); } 50% { transform: rotate(9deg); } }',
    '@keyframes ap-ukgraze { 0%, 55%, 100% { transform: none; } 70% { transform: rotate(-5deg); } 85% { transform: rotate(2deg); } }',
    '@keyframes ap-uknod { 0%, 60%, 100% { transform: none; } 72% { transform: rotate(-7deg); } 84% { transform: rotate(3deg); } }',
    '@keyframes ap-ukdrift { 0%, 100% { transform: translateX(calc(var(--dx, 80px) * -1)); } 50% { transform: translateX(var(--dx, 80px)); } }',
    '@keyframes ap-ukglide { 0% { transform: translate(calc(var(--dx, 500px) * -.5), 0); opacity: 0; } 10%, 85% { opacity: 1; } 100% { transform: translate(calc(var(--dx, 500px) * .5), var(--dy, -30px)); opacity: 0; } }',
    '@keyframes ap-ukflap { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(-.35); } }',
    '@keyframes ap-ukshim { 0%, 100% { opacity: .1; transform: translateX(-8px); } 50% { opacity: .9; transform: translateX(8px); } }',
    '@keyframes ap-ukpuff { 0% { transform: translate(0, 0) scale(.35); opacity: 0; } 12% { opacity: .95; } 100% { transform: translate(var(--dx, -120px), var(--dy, -260px)) scale(var(--sc, 2.6)); opacity: 0; } }',
    '@keyframes ap-ukbob { 0%, 100% { transform: translateY(calc(var(--dy, 5px) * -1)) rotate(-.4deg); } 50% { transform: translateY(var(--dy, 5px)) rotate(.4deg); } }',
    '@keyframes ap-ukheel { 0%, 100% { transform: rotate(-3deg) translateY(-3px); } 50% { transform: rotate(2deg) translateY(3px); } }',
    '@keyframes ap-ukglow { 0%, 100% { opacity: .82; transform: scale(.97); } 50% { opacity: 1; transform: scale(1.04); } }',
    '@keyframes ap-ukrise { from { transform: translateY(90px); opacity: .6; } to { transform: none; opacity: 1; } }',
    '@keyframes ap-uksway { 0%, 100% { transform: skewX(-4deg); } 50% { transform: skewX(4deg); } }',
    '@keyframes ap-uksway2 { 0%, 100% { transform: rotate(-.8deg); } 50% { transform: rotate(.8deg); } }',
    '@keyframes ap-ukfall { 0% { transform: translate(0, -60px) rotate(0); opacity: 0; } 10%, 85% { opacity: 1; } 100% { transform: translate(var(--dx, 100px), 420px) rotate(540deg); opacity: 0; } }',
    '@keyframes ap-ukspin { 0%, 100% { transform: rotate(-4deg); opacity: .8; } 50% { transform: rotate(4deg); opacity: 1; } }',
    '@keyframes ap-ukwheel { to { transform: rotate(1turn); } }',
    '@keyframes ap-ukflutter { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(60px, -40px); } 50% { transform: translate(120px, 10px); } 75% { transform: translate(50px, 30px); } }',
  ].join('\n') + (T.K && T.K.css ? '\n' + T.K.css : '');   // the nature kit's keyframes (ap-ukn*)

  animRegisterPack({ id: 'uk-south-east', name: 'UK: South East & London', version: '2.4.1', css,
    description: 'Full-screen illustrated scenes across all nine South East counties and Greater London, together in one neighbouring-region gallery pack. County detection remains opt-in and every scene plays only in its own county.', items });
})();
